import "dotenv/config";
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
function headlineKeys(...values: unknown[]): string[] {
  return [...new Set(values.map(x=>plainText(x).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')).filter(x=>x.length>=12))];
}
function duplicateInBatch(url: string, titles: string[], date: number, seenUrls: Set<string>, seenTitles: Map<string,number[]>): boolean {
  const key=url.replace(/^(https?:\/\/)(?:www\.)/i,'$1');
  const duplicate=seenUrls.has(key)||Number.isFinite(date)&&titles.some(t=>(seenTitles.get(t)||[]).some(old=>Math.abs(old-date)<=86400000));
  seenUrls.add(key);if(Number.isFinite(date))for(const title of titles)seenTitles.set(title,[...(seenTitles.get(title)||[]),date]);
  return duplicate;
}
function keepSports(category: string, title: string, excerpt: string): boolean {
  if(category!=='sports')return true;
  const headline=plainText(title),body=plainText(excerpt),text=headline+' '+body;
  // 韩国参与依据原始新闻内容，不使用模板化“可能影响韩国”来批准本地赛况。
  if(/韩国|朝鲜|韩籍|韩裔|孙兴慜|金玟哉|李刚仁|李政厚|金河成|金惠成|柳贤振|한국|손흥민|\b(?:korea|korean|k-?league|kbo|son heung[- ]min|heung[- ]min son|kim min[- ]jae|lee kang[- ]in|jung[- ]hoo lee|ha[- ]seong kim|hye[- ]seong kim|samsung|hyundai|kia motors)\b/i.test(headline))return true;
  if(/韩国.{0,12}(?:球员|运动员|球队|国家队)|\bkorean (?:player|athlete|team|guard|pitcher)\b|\b(?:son heung[- ]min|jung[- ]hoo lee)\b/i.test(body))return true;
  if(/奥运|残奥|世界杯|亚运|世锦赛|世界锦标赛|欧冠|大满贯|温网|澳网|法网|美网|\b(?:olympics?|paralympics?|world cup|asian games|world championships?|champions league|grand slam|wimbledon|australian open|roland garros|us open|formula (?:one|1)|f1)\b/i.test(text))return true;
  if(/\b(?:global|international|cross-border|overseas|worldwide)\b[\s\S]{0,90}\b(?:broadcast|streaming|media rights|tv rights|sponsor|investment|acquisition|expansion)|\b(?:broadcast|streaming|media rights|tv rights|sponsor|investment|acquisition|expansion)[\s\S]{0,90}\b(?:global|international|cross-border|overseas|worldwide)\b|全球转播|国际转播|海外版权|跨境投资|全球赞助|国际赞助|跨国并购/i.test(text))return true;
  return false;
}

// 与现有公开接口一致；不使用未在该线上项目落地的 news 表。
const TABLE = 'english_hot_news';
const VERSION = 'korea-business-20261026';
const pool = new Pool({connectionString:process.env.DATABASE_URL, connectionTimeoutMillis:10000});
const db = drizzle(pool);
const parser = new Parser({timeout:15000});
const checkOnly = process.argv.includes('--check');
const reanalyze = process.argv.includes('--reanalyze');
const flag = process.argv.find(s=>s.startsWith('--limit='));
const itemLimit = flag ? Number(flag.split('=')[1]) : Infinity;

function usefulError(error: any): string {
  const cause=error?.cause || error;
  const code=String(cause?.code || '');
  if(code==='ENOTFOUND'||code==='EAI_AGAIN')return '数据库主机解析失败：核对现有 DATABASE_URL、网络和 DNS；如直连地址在当前网络不可用，使用同一 Supabase 项目的 Session pooler 连接串。';
  if(code==='28P01')return '28P01：数据库登录失败，请核对现有 DATABASE_URL。';
  // 不输出数据库连接串、密钥、SQL 参数或全文报告。
  return code ? `数据库/网络错误 ${code}` : String(cause?.message || '未知错误').replace(/postgres(?:ql)?:\/\/\S+/gi,'[数据库地址]').slice(0,220);
}
function parseSources(value: any): any[] {
  if(typeof value==='string'){try{value=JSON.parse(value);}catch{return [];}}
  return Array.isArray(value)?value.filter(x=>x && typeof x==='object'):[];
}
async function preflight(): Promise<Set<string>> {
  if(!process.env.DATABASE_URL)throw new Error('未配置 DATABASE_URL；请在原项目根目录使用原来的 .env 运行。');
  if(flag && (!Number.isInteger(itemLimit)||itemLimit<1))throw new Error('--limit 必须是正整数');
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
  const required=['id','raw_title','translated_title','raw_url','source_site','assigned_category','ai_score','ai_summary','deep_report','created_at'];
  const missing=required.filter(c=>!columns.has(c));
  if(missing.length)throw new Error(`public.${TABLE} 缺少所需列：${missing.join(', ')}。未采集、未改表。`);
  const response=await fetch(`${webUrl}/rest/v1/${TABLE}?select=id&limit=1`,{headers:{apikey:anonKey,Authorization:`Bearer ${anonKey}`},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error(`网站读取 public.${TABLE} 失败（HTTP ${response.status}），未开始付费 AI 调用。`);
  const publicRows=await response.json();
  if(!Array.isArray(publicRows))throw new Error('网站数据接口返回格式异常');
  console.log(`检查通过：PostgreSQL 和 REST 均可访问 public.${TABLE}；公开可见样本 ${publicRows.length} 条。`);
  if(!publicRows.length)console.log('提示：公开接口返回空数组，可能表为空或当前读取策略隐藏了记录；写入后会再次验证可见性。');
  return columns;
}

async function executePipeline() {
  const columns=await preflight();
  if(checkOnly){console.log('连接与表结构检查完成；未调用 AI，未写入或修改记录。');return;}
  if(!process.env.DEEPSEEK_API_KEY)throw new Error('未配置 DEEPSEEK_API_KEY，未开始采集。');
  const file=path.resolve(process.cwd(),'lib/research/feeds.json');
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  const all=Array.isArray(data)?data:data.feeds;
  if(!Array.isArray(all))throw new Error('feeds.json 格式错误');
  const feeds=all.filter((f:any)=>f.enabled!==false && f.ingest!=='reference' && !f.replaced_by && f.url);
  if(!feeds.length)throw new Error('没有启用的 RSS 信源');
  // 历史快照用于跨信源/跨运行去重，不清空或删除历史记录。
  const previous=await db.execute(sql`SELECT * FROM public.english_hot_news ORDER BY id DESC LIMIT 5000`);
  const existingByUrl=new Map<string,any>();
  const seenUrls=new Set<string>();const seenTitles=new Map<string,number[]>();
  const urlKey=(url:string)=>url.replace(/^(https?:\/\/)(?:www\.)/i,'$1');
  for(const r of previous.rows as any[]){
    const u=cleanArticleUrl(r.raw_url);if(!u)continue;
    if(!existingByUrl.has(urlKey(u)))existingByUrl.set(urlKey(u),r);
    duplicateInBatch(u,headlineKeys(r.raw_title,r.translated_title),Date.parse(r.created_at||''),seenUrls,seenTitles);
  }
  const attempted=new Set<string>();
  const counts={fetched:0,inserted:0,updated:0,duplicates:0,filtered_sports:0,failed_sources:0,failed_items:0};
  let analyzed=0,verifyId:any=null;
  for(const feed of feeds){
    if(analyzed>=itemLimit)break;
    let items:any[];
    try{items=(await parser.parseURL(feed.url)).items.slice(0,5);}
    catch(error){counts.failed_sources++;console.warn(`信源 ${feed.name} 读取失败：${usefulError(error)}`);continue;}
    console.log(`采集 ${feed.name}：${items.length} 条候选`);
    for(const item of items){
      if(analyzed>=itemLimit)break;
      counts.fetched++;
      const title=plainText(item.title),url=cleanArticleUrl(item.link);if(!title||!url)continue;
      const key=urlKey(url);if(attempted.has(key)){counts.duplicates++;continue;}
      attempted.add(key);
      const excerpt=plainText(item.contentSnippet||item.summary||item.content||'');
      const category=classifyCategory(title,excerpt,feed.category);
      if(!keepSports(category,title,excerpt)){counts.filtered_sports++;continue;}
      const parsedDate=Date.parse(item.isoDate||item.pubDate||'');
      const publishedAt=Number.isFinite(parsedDate)?new Date(parsedDate).toISOString():null;
      // 过滤超过30天或明显来自未来的条目；无日期条目仍可收集。
      if(publishedAt&&(parsedDate<Date.now()-30*86400000||parsedDate>Date.now()+3600000))continue;
      let existing=existingByUrl.get(key);
      try {
        if(!existing){
          // 旧URL可能不在最近5000条快照中；精确链接查询在AI调用前执行。
          const found=await db.execute(sql`SELECT * FROM public.english_hot_news WHERE raw_url=${url} OR raw_url=${String(item.link)} LIMIT 1`);
          existing=found.rows[0];
        }
        const oldSources=parseSources(existing?.cluster_urls);
        if(existing&&!reanalyze&&oldSources.some(s=>s.analysis_version===VERSION)){counts.duplicates++;continue;}
        if(!existing && duplicateInBatch(url,headlineKeys(title),Number.isFinite(parsedDate)?parsedDate:Date.now(),seenUrls,seenTitles)){counts.duplicates++;continue;}
        analyzed++;
        const analysis=await evaluateGeopoliticalRisk(title,CATEGORY_LABELS[category],excerpt);
        const regions=getValidRegionIds(analysis.region,title+' '+excerpt);
        const names:Record<string,string>={'east-asia':'东亚','southeast-asia':'东南亚',europe:'欧洲','north-america':'北美','south-america':'南美',africa:'非洲',oceania:'大洋洲','middle-east':'中东'};
        const values:Record<string,any>={raw_title:title,translated_title:analysis.titleZh||title,
          raw_url:existing?.raw_url||url,source_site:feed.name||new URL(url).hostname,
          assigned_category:CATEGORY_LABELS[category],ai_score:analysis.score,
          ai_summary:analysis.summaryZh||excerpt.slice(0,300),deep_report:analysis.strategicReport||null};
        if(columns.has('has_report'))values.has_report=true; // 兼容旧Python流程的“已处理”标记。
        if(columns.has('region'))values.region=regions.map(id=>names[id]).join('、')||'全球/其它';
        if(columns.has('published_at')&&publishedAt)values.published_at=publishedAt;
        if(columns.has('cluster_urls')){
          const primary={source:feed.name||new URL(url).hostname,url,title,excerpt:excerpt.slice(0,5000),published_at:publishedAt,regions,analysis_version:VERSION,score_scale:10};
          values.cluster_urls=JSON.stringify([primary,...oldSources.filter(s=>cleanArticleUrl(s.url)!==url&&s.url!==existing?.raw_url)]);
        }
        const entries=Object.entries(values);
        const written=existing
          ? await db.execute(sql`UPDATE public.english_hot_news SET ${sql.join(entries.map(([k,v])=>sql`${sql.identifier(k)}=${v}`),sql`, `)} WHERE id=${existing.id} RETURNING id`)
          : await db.execute(sql`INSERT INTO public.english_hot_news (${sql.join(entries.map(([k])=>sql.identifier(k)),sql`, `)}) VALUES (${sql.join(entries.map(([,v])=>sql`${v}`),sql`, `)}) ON CONFLICT DO NOTHING RETURNING id`);
        if(written.rows.length){
          if(existing)counts.updated++;else counts.inserted++;
          verifyId=written.rows[0].id;
          existingByUrl.set(key,{...values,id:verifyId,created_at:existing?.created_at||new Date().toISOString()});
        }else counts.duplicates++;
      }catch(error){counts.failed_items++;console.warn(`条目处理失败：${title.slice(0,55)}；${usefulError(error)}`);}
    }
  }
  console.log('实际处理结果：'+JSON.stringify(counts));
  if(verifyId!==null){
    const webUrl=process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/,'');const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const result=await fetch(`${webUrl}/rest/v1/${TABLE}?select=id&id=eq.${encodeURIComponent(String(verifyId))}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:'no-store',signal:AbortSignal.timeout(10000)});
    const visible=result.ok?await result.json():[];
    if(!Array.isArray(visible)||!visible.some((r:any)=>String(r.id)===String(verifyId)))throw new Error('记录已写入，但网站使用的 REST 身份读不到该记录。请检查两端项目配置与现有 SELECT 策略。');
    console.log('闭环检查通过：本轮写入记录可被网站使用的 REST 身份读取。数据库更新无需再次部署。');
  }
  if(counts.failed_items||counts.failed_sources)process.exitCode=1;
  if(!counts.fetched && !counts.failed_sources)throw new Error('所有信源都未返回候选新闻，本次没有更新。');
}
executePipeline().catch(error=>{console.error('采集未完成：'+usefulError(error));process.exitCode=1;}).finally(()=>pool.end());
