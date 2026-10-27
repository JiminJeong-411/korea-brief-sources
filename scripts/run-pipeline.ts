import {readEvent,type ClusterArticle} from '../lib/research/clustering';
import {singleEvent,describeEvent,findMatchingEvent} from '../lib/research/event-matching';
import {chooseCandidates,fairCandidateQueue} from '../lib/research/candidates';
import {keepSportsNews,majorSportsMilestone} from '../lib/research/sports';
import "dotenv/config";
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {SELECTION_VERSION, isImportant, isFeatured, obviousNoise} from '../lib/research/selection';
import {describeError, fetchText, retry} from '../lib/research/network';
import {collectCommunity, summarizeCommunity, COMMUNITY_VERSION, refreshDigest, appendCommunityHistory} from '../lib/research/community';
import Parser from "rss-parser";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { evaluateGeopoliticalRisk } from "../lib/research/ai";
import fs from "fs";
import path from "path";

// 业务规则：仅统一分类、地区、去重和体育范围；不负责连接数据库。
const CATEGORY_LABELS: Record<string, string> = {
  economy: '经济', politics: '政治', society: '社会',
  entertainment: '娱乐', technology: '科技', sports: '体育'
};
const REGION_RULES: Record<string, string[]> = {
  'east-asia': ['east-asia','east asia','东亚','东北亚','韩国','朝鲜','中国','日本','台湾','香港','蒙古','korea','korean','china','chinese','japan','japanese','taiwan','hong kong','mongolia','한국','중국','일본'],
  'southeast-asia': ['southeast-asia','southeast asia','south-east asia','东南亚','东盟','新加坡','越南','印尼','印度尼西亚','马来西亚','泰国','菲律宾','缅甸','柬埔寨','老挝','文莱','东帝汶','asean','singapore','vietnam','indonesia','malaysia','thailand','philippines','myanmar','cambodia','laos','brunei','timor-leste','베트남','인도네시아'],
  europe: ['europe','european','欧洲','欧盟','英国','德国','法国','意大利','西班牙','荷兰','瑞典','挪威','波兰','乌克兰','俄罗斯','united kingdom','britain','british','germany','german','france','french','italy','spain','netherlands','sweden','norway','poland','ukraine','russia','유럽'],
  'north-america': ['north-america','north america','north american','北美','美国','美联储','加拿大','墨西哥','united states','u.s.','usa','american','canada','canadian','mexico','mexican','federal reserve','미국','캐나다'],
  'south-america': ['south-america','south america','south american','南美','巴西','阿根廷','智利','秘鲁','哥伦比亚','乌拉圭','巴拉圭','厄瓜多尔','委内瑞拉','玻利维亚','brazil','brazilian','argentina','chile','peru','colombia','uruguay','paraguay','ecuador','venezuela','bolivia'],
  africa: ['africa','african','非洲','南非','尼日利亚','肯尼亚','加纳','埃及','摩洛哥','阿尔及利亚','埃塞俄比亚','nigeria','kenya','ghana','egypt','morocco','algeria','ethiopia','south africa'],
  oceania: ['oceania','大洋洲','澳大利亚','澳洲','新西兰','斐济','巴布亚新几内亚','australia','australian','new zealand','fiji','papua new guinea','호주'],
  'middle-east': ['middle-east','middle east','中东','沙特','阿联酋','以色列','伊朗','伊拉克','卡塔尔','土耳其','黎巴嫩','约旦','阿曼','科威特','巴林','也门','saudi','united arab emirates','uae','israel','iran','iraq','qatar','turkey','turkiye','lebanon','jordan','oman','kuwait','bahrain','yemen']
};
function plainText(value: unknown): string {
  return String(value ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}
function exactTerm(text: string, term: string): boolean {
  if (!/^[a-z]/i.test(term)) return text.includes(term);
  return new RegExp('(^|[^a-z])'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z]|$)','i').test(text);
}
function normalizeCategory(value: unknown): string {
  const s=plainText(value).toLowerCase();
  if (CATEGORY_LABELS[s]) return s;
  for (const [id,re] of [
    ['sports',/体育|\bsports?\b/], ['entertainment',/娱乐|文娱|文化|音乐|影视|\b(?:entertainment|culture|music|hollywood)\b/],
    ['technology',/科技|技术|创业|\b(?:tech|technology|science|ai|startups?)\b/],
    ['politics',/政治|时政|外交|\b(?:politics?|policy|affairs)\b/],
    ['economy',/经济|财经|金融|商业|产业|企业|\b(?:economy|economic|business|finance|financial|markets?)\b/]
  ] as [string,RegExp][]) if(re.test(s)) return id;
  return 'society';
}
const CATEGORY_TERMS: Record<string, RegExp> = {
  economy: /经济|财经|金融|商业|关税|贸易|通胀|利率|央行|美联储|财报|营收|利润|股市|股价|并购|收购|汇率|出口|进口|供应链|投资|失业率|경제|금리|수출|\b(?:economy|inflation|tariffs?|trade|interest rates?|central bank|federal reserve|gdp|earnings|revenues?|profits?|stocks?|mergers?|acquisitions?|exports?|imports?|investment|currency|unemployment|supply chain)\b/gi,
  politics: /政治|时政|选举|总统|议会|国会|首相|总理|外交|军事|战争|停火|导弹|制裁|内阁|条约|法案|대통령|국회|외교|\b(?:politics|elections?|president|parliament|congress|senate|prime minister|diplomacy|military|ceasefire|missiles?|sanctions?|cabinet|treaty|legislation|bill)\b/gi,
  technology: /科技|技术|半导体|芯片|人工智能|大模型|算法|机器人|软件|网络安全|数据中心|算力|量子|智能手机|반도체|인공지능|\b(?:technology|tech|chips?|chipmakers?|semiconductors?|artificial intelligence|ai|machine learning|software|cybersecurity|robotics?|quantum|smartphones?|data cent(?:er|re)s?|nvidia|openai|tsmc|deepseek)\b/gi,
  entertainment: /娱乐|文娱|电影|音乐|演唱会|专辑|票房|艺人|韩流|偶像|공연|음반|\b(?:entertainment|k-?pop|hybe|bts|blackpink|aespa|newjeans|concerts?|albums?|movies?|films?|box office|music|actors?|singers?)\b/gi,
  sports: /体育|足球|篮球|棒球|橄榄球|女篮|男篮|奥运|世界杯|欧冠|锦标赛|大满贯|季后赛|联赛|축구|야구|농구|\b(?:sports?|nfl|wnba|nba|ncaa|mlb|nhl|football|basketball|soccer|baseball|tennis|olympics?|world cup|champions league|playoffs?|quarterback|touchdown|wimbledon|formula one|formula 1)\b/gi,
  society: /社会|教育|医疗|学校|医院|地震|台风|洪水|移民|犯罪|警方|住房|福利|罢工|人口|交通|\b(?:society|education|health|hospitals?|schools?|earthquake|typhoon|floods?|migration|crime|police|housing|welfare|strike|population)\b/gi
};
function classifyCategory(title: string, summary: string, sourceCategory: unknown): string {
  if(majorSportsMilestone(title,summary))return 'sports';
  const seed=normalizeCategory(sourceCategory), scores: Record<string,number>={};
  for(const id of Object.keys(CATEGORY_LABELS)) {
    const re=CATEGORY_TERMS[id];
    const count=(s:string)=>[...plainText(s).matchAll(new RegExp(re.source,re.flags))].length;
    scores[id]=Math.min(12,count(title)*4)+Math.min(4,count(summary.slice(0,1800)))+(seed===id?1:0);
  }
  const best=Object.keys(scores).sort((a,b)=>scores[b]-scores[a])[0];
  return scores[best]>=4?best:seed;
}
function getValidRegionIds(value: unknown, text: string): string[] {
  let values: unknown[]=Array.isArray(value)?value:[];
  if(typeof value==='string') {
    try {const parsed=JSON.parse(value);values=Array.isArray(parsed)?parsed:value.split(/[,，、;；|/]+/);} catch {values=value.split(/[,，、;；|/]+/);}
  }
  const codes: Record<string,string>={kr:'east-asia',kp:'east-asia',cn:'east-asia',jp:'east-asia',tw:'east-asia',hk:'east-asia',us:'north-america',ca:'north-america',mx:'north-america',eu:'europe',uk:'europe',ru:'europe',sg:'southeast-asia',vn:'southeast-asia',au:'oceania',nz:'oceania',br:'south-america'};
  const result=new Set<string>();
  for(const raw of values) {
    const s=plainText(raw).toLowerCase();
    if(codes[s]) result.add(codes[s]);
    for(const [id,terms] of Object.entries(REGION_RULES)) if(terms.includes(s)) result.add(id);
  }
  const s=plainText(text).toLowerCase();
  for(const [id,terms] of Object.entries(REGION_RULES)) {
    const candidate=id==='north-america'?s.replace(/\b(?:south|central|latin) america(?:n)?\b/g,''):s;
    if(terms.some(term=>exactTerm(candidate,term))) result.add(id);
  }
  return Object.keys(REGION_RULES).filter(id=>result.has(id));
}
function cleanArticleUrl(value: unknown): string {
  try {
    const url=new URL(String(value));if(!['https:','http:'].includes(url.protocol))return '';
    url.hash='';for(const key of [...url.searchParams.keys()])if(/^(?:utm_|fbclid$|gclid$|mc_cid$|mc_eid$|spm$)/i.test(key))url.searchParams.delete(key);
    if(url.pathname!=='/')url.pathname=url.pathname.replace(/\/+$/,'');url.searchParams.sort();return url.toString();
  } catch {return '';}
}
const keepSports=keepSportsNews;

// Keep the original PostgreSQL / Supabase REST / DeepSeek architecture and table.
const TABLE='english_hot_news';
const VERSION=SELECTION_VERSION;
const pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000,query_timeout:20000});
const db=drizzle(pool);
const parser=new Parser();
const checkOnly=process.argv.includes('--check');
const reanalyze=process.argv.includes('--reanalyze');
const backfill=process.argv.includes('--reassess-existing');
const clusterOnly=process.argv.includes('--cluster-existing');
const clusterFlag=process.argv.find(s=>s.startsWith('--cluster-limit='));
const clusterLimit=clusterFlag?Number(clusterFlag.split('=')[1]):120;
const communityOnly=process.argv.includes('--community-only');
const skipCommunity=process.argv.includes('--skip-community');
const flag=process.argv.find(s=>s.startsWith('--limit='));
const itemLimit=flag?Number(flag.split('=')[1]):300;
const dayFlag=process.argv.find(s=>s.startsWith('--days='));
const backfillDays=dayFlag?Number(dayFlag.split('=')[1]):30;
const usefulError=(e:any)=>describeError(e,'任务');
function parseSources(value:any):any[]{if(typeof value==='string'){try{value=JSON.parse(value);}catch{return [];}}return Array.isArray(value)?value.filter(x=>x&&typeof x==='object'):[];}
async function fetchPublic(url:string){
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return retry(async()=>{const r=await fetch(url,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Object.assign(Error(`公开 REST HTTP ${r.status}`),{status:r.status});return r;});
}
async function preflight(): Promise<Set<string>> {
  if(!process.env.DATABASE_URL)throw new Error('未配置 DATABASE_URL；请在原项目根目录使用原来的 .env 运行。');
  if(!Number.isInteger(clusterLimit)||clusterLimit<0||clusterLimit>1000)throw Error('--cluster-limit 必须是0–1000');
  if(!Number.isInteger(itemLimit)||itemLimit<1)throw new Error('--limit 必须是正整数');
  if(!Number.isInteger(backfillDays)||backfillDays<1||backfillDays>365)throw Error('--days 必须是1–365');
  const webUrl=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/,'');
  const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!webUrl||!anonKey)throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY，无法核对采集与网站是否同一项目。');
  let pgRef='',webRef='';
  try {
    const pg=new URL(process.env.DATABASE_URL),web=new URL(webUrl);
    webRef=web.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)?.[1]||'';
    pgRef=pg.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1]||decodeURIComponent(pg.username).match(/^postgres\.([a-z0-9]+)$/i)?.[1]||'';
  }catch{throw new Error('数据库或 Supabase URL 格式无效');}
  if(webRef && pgRef && webRef!==pgRef)throw new Error('DATABASE_URL 与 NEXT_PUBLIC_SUPABASE_URL 指向不同 Supabase 项目。请核对现有配置。');
  const result=await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=${TABLE}`);
  const columns=new Set<string>(result.rows.map((r:any)=>String(r.column_name)));
  const required=['id','raw_title','translated_title','raw_url','source_site','assigned_category','ai_score','ai_summary','deep_report','created_at','cluster_urls'];
  const missing=required.filter(c=>!columns.has(c));
  if(missing.length)throw new Error(`public.${TABLE} 缺少所需列：${missing.join(', ')}。未采集、未改表。`);
  const response=await fetchPublic(`${webUrl}/rest/v1/${TABLE}?select=id&limit=1`);
  if(!response.ok)throw new Error(`网站读取 public.${TABLE} 失败（HTTP ${response.status}），未开始付费 AI 调用。`);
  const publicRows=await response.json();
  if(!Array.isArray(publicRows))throw new Error('网站数据接口返回格式异常');
  console.log(`检查通过：PostgreSQL 和 REST 均可访问 public.${TABLE}；公开可见样本 ${publicRows.length} 条。`);
  if(!publicRows.length)console.log('提示：公开接口返回空数组，可能表为空或当前读取策略隐藏了记录；写入后会再次验证可见性。');
  return columns;
}

export async function writeRecord(existing:any,values:Record<string,any>){
  const entries=Object.entries(values);
  const result=existing
    ? await db.execute(sql`UPDATE public.english_hot_news SET ${sql.join(entries.map(([k,v])=>sql`${sql.identifier(k)}=${v}`),sql`, `)} WHERE id=${existing.id} RETURNING id`)
    : await db.execute(sql`INSERT INTO public.english_hot_news (${sql.join(entries.map(([k])=>sql.identifier(k)),sql`, `)}) VALUES (${sql.join(entries.map(([,v])=>sql`${v}`),sql`, `)}) ON CONFLICT DO NOTHING RETURNING id`);
  return result.rows[0]?.id;
}
export async function executePipeline(){
  const columns=await preflight();
  if(checkOnly){console.log('连接与表结构检查完成；未调用 AI，未写入或修改记录。');return;}
  if(!process.env.DEEPSEEK_API_KEY)throw Error('未配置 DEEPSEEK_API_KEY');
  const catalog=JSON.parse(fs.readFileSync(path.resolve(process.cwd(),'lib/research/feeds.json'),'utf8'));
  const all=Array.isArray(catalog)?catalog:catalog.feeds;
  if(!Array.isArray(all))throw Error('feeds.json 格式错误');
  const feeds=all.filter((f:any)=>f.enabled!==false&&f.ingest!=='reference'&&!f.replaced_by&&f.url);
  const previous=await db.execute(sql`SELECT * FROM public.english_hot_news ORDER BY id DESC LIMIT 5000`);
  const existingByUrl=new Map<string,any>();
  const clusterBudget={remaining:clusterLimit};
  const eventRows=new Map<any,ClusterArticle>();
  function asArticle(r:any):ClusterArticle|null{
    const sources=parseSources(r.cluster_urls),primary=sources.find(x=>cleanArticleUrl(x.url)===cleanArticleUrl(r.raw_url))||sources[0];
    if(primary?.content_type==='community_digest')return null;
    return {id:r.id,url:r.raw_url,title:r.translated_title||r.raw_title,originalTitle:r.raw_title,excerpt:primary?.excerpt||'',date:primary?.published_at||r.created_at||'',category:primary?.intelligence?.category||normalizeCategory(r.assigned_category),event:readEvent(primary?.event)};
  }
  const keyOf=(url:string)=>url.replace(/^(https?:\/\/)(?:www\.)/i,'$1');
  for(const r of previous.rows as any[]){
    const u=cleanArticleUrl(r.raw_url);if(!u)continue;
    if(!existingByUrl.has(keyOf(u)))existingByUrl.set(keyOf(u),r);
    const article=asArticle(r);if(article)eventRows.set(r.id,article);
  }
  const counts={fetched:0,inserted:0,updated:0,duplicates:0,filtered_noise:0,filtered_sports:0,important:0,featured:0,not_selected:0,failed_sources:0,failed_items:0,community_updated:0,community_unconfigured:0,events_linked:0,cluster_updated:0,cluster_failed:0};
  let analyzed=0;const verifyIds:any[]=[];const attempted=new Set<string>();
  async function processItem(item:any,feed:any,old?:any){
    if(analyzed>=itemLimit)return;
    counts.fetched++;
    const title=plainText(item.title),url=cleanArticleUrl(item.link);if(!title||!url)return;
    const key=keyOf(url);if(attempted.has(key)){counts.duplicates++;return;}attempted.add(key);
    const excerpt=plainText(item.contentSnippet||item.summary||item.content||'').slice(0,5000);
    const seed=classifyCategory(title,excerpt,feed.category);
    const timestamp=Date.parse(item.isoDate||item.pubDate||'');
    const publishedAt=Number.isFinite(timestamp)?new Date(timestamp).toISOString():null;
    if(!backfill&&publishedAt&&(timestamp<Date.now()-30*86400000||timestamp>Date.now()+3600000))return;
    let stage='查询新闻记录';
    try{
      let existing=old||existingByUrl.get(key);
      if(!existing){const r=await db.execute(sql`SELECT * FROM public.english_hot_news WHERE raw_url=${url} OR raw_url=${String(item.link)} LIMIT 1`);existing=r.rows[0];}
      const oldSources=parseSources(existing?.cluster_urls);
      if(existing&&!reanalyze&&oldSources.some(s=>s.analysis_version===VERSION)){counts.duplicates++;return;}
      const noise=obviousNoise(title),excludedSport=!keepSports(seed,title,excerpt);
      if(noise||excludedSport){
        if(noise)counts.filtered_noise++;else counts.filtered_sports++;
        if(existing){
          const primary={...(oldSources[0]||{}),url:existing.raw_url,title,content_type:'news',analysis_version:VERSION,screening:{version:VERSION,eligible:false,reason:noise?'明确琐事/博彩等低价值格式':'非重点本地体育赛况'}};
          const id=await writeRecord(existing,{cluster_urls:JSON.stringify([primary,...oldSources.slice(1)])});
          if(id!==undefined){counts.updated++;verifyIds.push(id);}
        }
        return;
      }
      analyzed++;stage='DeepSeek 新闻评估';
      const analysis=await evaluateGeopoliticalRisk(title,CATEGORY_LABELS[seed],excerpt);
      const category=analysis.intelligence.category;
      const regions=getValidRegionIds(analysis.region,title+' '+excerpt);
      const names:Record<string,string>={'east-asia':'东亚','southeast-asia':'东南亚',europe:'欧洲','north-america':'北美','south-america':'南美',africa:'非洲',oceania:'大洋洲','middle-east':'中东'};
      let event=singleEvent(url,analysis.eventFacts);
      const article:ClusterArticle={id:existing?.id||url,url,title:analysis.titleZh,originalTitle:title,excerpt,date:publishedAt||new Date().toISOString(),category,event};
      if(isImportant(analysis.intelligence)){
        try{event=await findMatchingEvent(article,[...eventRows.values()],clusterBudget);}catch(e){counts.cluster_failed++;console.warn(describeError(e,'事件聚合；新闻仍将保存，下轮重试'));}
      }else event.checked=true;
      if(event.anchorUrl!==singleEvent(url).anchorUrl)counts.events_linked++;
      const primary={event,source:feed.name||new URL(url).hostname,url,title,excerpt,published_at:publishedAt,regions,
        analysis_version:VERSION,score_scale:10,content_type:'news',source_country:feed.country||'',intelligence:analysis.intelligence};
      const values:Record<string,any>={raw_title:title,translated_title:analysis.titleZh,raw_url:existing?.raw_url||url,
        source_site:feed.name||new URL(url).hostname,assigned_category:CATEGORY_LABELS[category],ai_score:analysis.score,
        ai_summary:analysis.summaryZh,deep_report:analysis.strategicReport||null,
        cluster_urls:JSON.stringify([primary,...oldSources.filter(s=>cleanArticleUrl(s.url)!==url&&s.url!==existing?.raw_url)])};
      if(columns.has('has_report'))values.has_report=true;
      if(columns.has('region'))values.region=regions.map(id=>names[id]).join('、')||'全球/其它';
      if(columns.has('published_at')&&publishedAt)values.published_at=publishedAt;
      stage='PostgreSQL 写入';const id=await writeRecord(existing,values);
      if(id!==undefined){
        if(existing)counts.updated++;else counts.inserted++;
        if(isImportant(analysis.intelligence))counts.important++;else counts.not_selected++;
        if(isFeatured(analysis.intelligence))counts.featured++;
        verifyIds.push(id);const saved={...values,id,created_at:existing?.created_at||new Date().toISOString()};existingByUrl.set(key,saved);const savedArticle=asArticle(saved);if(savedArticle)eventRows.set(id,savedArticle);
      }else counts.duplicates++;
    }catch(e){counts.failed_items++;console.warn(`条目失败：${title.slice(0,55)}；${describeError(e,stage)}`);}
  }
  if(clusterOnly){
    const cutoff=Date.now()-backfillDays*86400000;
    const candidates=[...previous.rows as any[]].filter(r=>{
      const article=asArticle(r);return article&&Date.parse(article.date)>=cutoff&&(!article.event?.checked)&&parseSources(r.cluster_urls).some(s=>s.intelligence);
    }).sort((a,b)=>Number(a.id)-Number(b.id)).slice(0,itemLimit);
    console.log(`历史事件聚合：${candidates.length} 条待处理；AI调用上限 ${clusterLimit}；保留每篇原文，不删库。`);
    for(const row of candidates){
      if(clusterBudget.remaining<=0){console.log('事件聚合AI预算已用完；未处理记录留待下轮，不标记已完成。');break;}
      const article=asArticle(row)!;
      try{
        let own=article.event||singleEvent(article.url);
        if(!own.facts&&clusterBudget.remaining>0){clusterBudget.remaining--;own={...own,facts:await describeEvent(article)};}
        const event=await findMatchingEvent({...article,event:own},[...eventRows.values()],clusterBudget);
        const sources=parseSources(row.cluster_urls),index=Math.max(0,sources.findIndex(s=>cleanArticleUrl(s.url)===cleanArticleUrl(row.raw_url)));
        sources[index]={...(sources[index]||{}),event};
        const id=await writeRecord(row,{cluster_urls:JSON.stringify(sources)});
        if(id!==undefined){counts.cluster_updated++;verifyIds.push(id);eventRows.set(id,{...article,event});if(event.anchorUrl!==singleEvent(article.url).anchorUrl)counts.events_linked++;}
      }catch(e){counts.cluster_failed++;console.warn(describeError(e,'历史事件聚合'));}
    }
  }else if(backfill&&!communityOnly){
    const cutoff=new Date(Date.now()-backfillDays*86400000).toISOString();
    // Reassessment reads actual stored rows, rather than only items still in RSS.
    const rows=await db.execute(sql`SELECT * FROM public.english_hot_news WHERE created_at >= ${cutoff} ORDER BY id DESC LIMIT 5000`);
    const candidates=(rows.rows as any[]).filter(r=>{const s=parseSources(r.cluster_urls);return !s.some(x=>x.content_type==='community_digest')&&(reanalyze||!s.some(x=>x.analysis_version===VERSION));});
    console.log(`历史重评：最近 ${backfillDays} 天 ${candidates.length} 条待评估；本次最多 ${itemLimit} 条；不删除记录。`);
    for(const r of candidates){
      if(analyzed>=itemLimit)break;
      const s=parseSources(r.cluster_urls).find(x=>cleanArticleUrl(x.url)===cleanArticleUrl(r.raw_url))||parseSources(r.cluster_urls)[0];
      // Old AI summaries are not original evidence. A missing RSS excerpt stays missing.
      await processItem({title:r.raw_title,link:r.raw_url,contentSnippet:s?.excerpt||r.original_excerpt||'',isoDate:s?.published_at||r.created_at},{name:r.source_site,category:r.assigned_category},r);
    }
    if(candidates.length>itemLimit)console.log('可能还有旧记录未重评；重复相同命令会跳过已完成的新版本记录。');
  }else if(!communityOnly){
    const batches:{feed:any;items:any[]}[]=[];
    // Bounded parallel RSS reads; AI and database mutations remain sequential.
    for(let i=0;i<feeds.length;i+=4){
      const results=await Promise.all(feeds.slice(i,i+4).map(async(feed:any)=>{
        try{
          const xml=await fetchText(feed.url);if(!/<(?:rss|feed|rdf:RDF)\b/i.test(xml))throw Error('返回内容不是 RSS/Atom');
          const parsed=(await parser.parseString(xml)).items||[];
          const items=chooseCandidates(feed,parsed);
          console.log(`扫描 ${feed.name}：${parsed.length} 条 RSS，${items.length} 条候选`);
          return {feed,items};
        }catch(e){counts.failed_sources++;console.warn(`信源 ${feed.name}：${describeError(e,'RSS 读取')}`);return {feed,items:[]};}
      }));
      batches.push(...results);
    }
    // Major results first, then rotate through sources; a small budget cannot starve the last source.
    const queue=fairCandidateQueue(batches);
    console.log(`候选队列 ${queue.length} 条；本轮最多 ${itemLimit} 条 AI 评估；重大结果优先、其余轮询信源。`);
    for(const {feed,item} of queue){if(analyzed>=itemLimit)break;await processItem(item,feed);}
  }

  if(!backfill&&!clusterOnly&&!skipCommunity){
    const sources=JSON.parse(fs.readFileSync(path.resolve(process.cwd(),'lib/research/community-sources.json'),'utf8'));
    for(const source of sources.filter((s:any)=>s.enabled&&s.adapter!=='reference')){
      try{
        const samples=await collectCommunity(source);
        if(!samples.length){console.log(`社区 ${source.name}：没有可用样本`);continue;}
        const existing=(await db.execute(sql`SELECT * FROM public.english_hot_news WHERE raw_url=${source.homepage} LIMIT 1`)).rows[0] as any;
        const old=parseSources(existing?.cluster_urls)[0];
        const signature=createHash('sha256').update(JSON.stringify(samples.map(s=>[s.url,s.title,s.excerpt,(s.commentsSample||[]).map(c=>[c.ref,c.excerpt])]))).digest('hex');
        // Reuse the AI summary when sample content is unchanged; refresh real heat snapshots.
        const unchanged=old?.community?.version===COMMUNITY_VERSION&&old?.sample_signature===signature;
        const refreshed=unchanged?refreshDigest(old.community,samples):await summarizeCommunity(samples,source);
        const digest=appendCommunityHistory(old?.community,refreshed);
        const primary={url:source.homepage,source:source.name,content_type:'community_digest',analysis_version:COMMUNITY_VERSION,
          observed_at:digest.observedAt,community:{...digest,samples:digest.samples.map(({excerpt,...s}:any)=>s)},sample_signature:signature};
        const values:Record<string,any>={raw_url:source.homepage,raw_title:digest.title,translated_title:digest.title,source_site:source.name,
          assigned_category:'社会',ai_score:1,ai_summary:digest.summary||'本次样本中暂无达到重要性门槛的主题',deep_report:null,
          cluster_urls:JSON.stringify([primary])};
        if(columns.has('region'))values.region='东亚';if(columns.has('has_report'))values.has_report=true;
        const id=await writeRecord(existing,values);if(id!==undefined){counts.community_updated++;verifyIds.push(id);}
        console.log(`社区 ${source.name}：采样 ${samples.length} 条，保留 ${digest.themes.length} 个主题${unchanged?'（复用摘要，更新热度）':''}`);
      }catch(e:any){if(e.code==='NOT_CONFIGURED'){counts.community_unconfigured++;console.log(e.message);}else{counts.failed_sources++;console.warn(describeError(e,`社区 ${source.name}`));}}
    }
  }
  console.log('实际处理结果：'+JSON.stringify({...counts,cluster_ai_calls:clusterLimit-clusterBudget.remaining}));
  if(verifyIds.length){
    try{
      const ids=[...new Set([verifyIds[0],verifyIds[verifyIds.length-1]])];
      const web=process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/,'');
      for(const id of ids){const r=await fetchPublic(`${web}/rest/v1/${TABLE}?select=id&id=eq.${encodeURIComponent(String(id))}`);const visible=await r.json();if(!Array.isArray(visible)||!visible.some((x:any)=>String(x.id)===String(id)))throw Error(`抽查记录 ${id} 已写入，但公开身份不可见；核对项目及现有 SELECT 策略`);}
      console.log('公开读取抽查通过：本轮首尾写入记录可被网站身份读取。数据更新无需部署；代码更改需部署。');
    }catch(e){process.exitCode=1;console.warn(describeError(e,'写入后公开 REST 校验')+'；本轮写入已保留，不代表全部采集失败。');}
  }
  if(counts.failed_items||counts.failed_sources||counts.cluster_failed){process.exitCode=1;console.log('本轮部分完成；失败项可重试，已写入的新版本新闻会自动跳过。');}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  executePipeline().catch(e=>{console.error(describeError(e,'采集任务'));process.exitCode=1;}).finally(()=>pool.end());
}
