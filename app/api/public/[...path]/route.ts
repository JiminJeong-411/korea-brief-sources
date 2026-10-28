import {TREND_URL} from '../../../../lib/research/records';
import companyCatalog from '../../../../lib/research/companies.json';
import {COMPANY_VERSION,DAILY_VERSION,companyURL,isNewsRecord,primaryRecord} from '../../../../lib/research/records';
import {TimedCache} from '../../../../lib/research/cache';
import {entertainmentPriority,isKpop,lowValueEntertainment} from '../../../../lib/research/entertainment';
const publicRowsCache=new TimedCache<any[]>(5*60_000,4);
import {paginate,NEWS_PAGE_SIZE} from '../../../../lib/research/pagination';
import {clusterPublicArticles,mergeSourceLinks,readEvent,CLUSTER_VERSION} from '../../../../lib/research/clustering';
import {keepSportsNews,majorSportsMilestone} from '../../../../lib/research/sports';
import communityCatalog from '../../../../lib/research/community-sources.json';
import {readIntelligence,isImportant,isFeatured,isHot,THRESHOLDS,SELECTION_VERSION} from '../../../../lib/research/selection';
import {retry} from '../../../../lib/research/network';
import feedCatalog from '../../../../lib/research/feeds.json';

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

function sourceArticles(value: unknown): any[] {
  if(typeof value==='string'){try{value=JSON.parse(value);}catch{return [];}}
  return Array.isArray(value)?value.filter(x=>x && typeof x==='object'):[];
}
function publicScore(value: unknown): number | null {
  if(value===null || value===undefined || value==='')return null;
  const score=Number(value);if(!Number.isFinite(score)||score<1||score>100)return null;
  // 旧Python和当前TS采集均用1–10分；兼容已有明确大于10的百分制记录。
  return Math.round(score<=10?score*10:score);
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.pathname.endsWith('/sources')) {
    const catalog: any=feedCatalog;
    const feeds=Array.isArray(catalog)?catalog:catalog.feeds||[];
    const newsSources=feeds.filter((f:any)=>f.enabled!==false&&!f.replaced_by&&f.ingest!=='reference').map((f:any)=>({
      id:f.id||f.url,name:f.name,homepage:f.homepage||f.url,country:f.country||'',region:f.coverage_region||'other',type:f.source_type||'新闻媒体',
      status_label:'核心新闻源 · '+(f.purpose||'通过重要性与韩国关联两层筛选')
    }));
    const communities=communityCatalog.map((f:any)=>({id:f.id,name:f.name,homepage:f.homepage,country:'韩国',region:'east-asia',type:f.source_type||'社区参考',
      status_label:(f.enabled?(f.adapter==='naver'?'需要管理员配置 Naver API · ':f.adapter==='youtube'?'需要管理员配置 YouTube Data API · ':'已配置采集 · '):'未启用 · ')+f.scope}));
    const companies=companyCatalog.map(c=>({id:'company-'+c.id,name:c.name,homepage:c.ir_url,country:'韩国',region:'east-asia',type:'企业公开披露',status_label:'DART结构化财务与重点公告；官网静态IR索引，附件不视为已读'}));
    return Response.json({sources:[...newsSources,...communities,...companies]}, {headers:{'Cache-Control':'no-store'}});
  }
  if (url.pathname.endsWith('/data')) return Response.json({});
  if (url.pathname.endsWith('/refresh')) return Response.json({success:true, mode:'read-latest', message:'重新读取已入库新闻；采集通过现有 pipeline 执行。'}, {headers:{'Cache-Control':'no-store'}});

  const modeParam = url.pathname.endsWith('/daily')?'daily':url.pathname.endsWith('/companies')?'companies':url.searchParams.get('mode') || '';
  const categoryParam = url.searchParams.get('category') || '';
  const regionParam = url.searchParams.get('region') || '';
  const qParam = url.searchParams.get('q') || '';
  const kindParam = url.searchParams.get('kind') || '';

  const safeFallback = {
    news: [], hot: [], items: [], events: [],
    counts: { news: 0, assessed: 0, reports: 0 },
    thresholds: THRESHOLDS, total: 0, page: 1,page_size:NEWS_PAGE_SIZE,total_pages:1, hasMore: false, has_more: false, regions: []
  };

  try {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseUrl = rawUrl.replace(/\/+$/, "");
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) return Response.json({...safeFallback,success:false,error:'NEWS_CONFIG_MISSING'}, {status:503,headers:{'Cache-Control':'no-store'}});

    const tableName = "english_hot_news";
    const pageLimit=500;
    const params=new URLSearchParams({select:'*',order:'id.desc',limit:String(pageLimit)});
    const briefRequest=url.pathname.endsWith('/brief');
    if(briefRequest){const id=url.searchParams.get('id')||'';if(!/^[1-9]\d*$/.test(id))return Response.json({error:'INVALID_REPORT_ID'},{status:400});params.set('id','eq.'+id);params.set('limit','1');}
    if(modeParam==='companies')params.set('raw_url','in.('+companyCatalog.map(c=>JSON.stringify(companyURL(c.stock_code))).join(',')+')');
    if(modeParam==='daily')params.set('raw_url','like.https://korea-brief.local/daily/*');
    if(!['daily','companies','community'].includes(modeParam)&&!briefRequest)params.set('raw_url','not.like.https://korea-brief.local/*');
    if(modeParam==='community'){
      params.set('raw_url','in.('+[...communityCatalog.filter(s=>s.enabled).map(s=>s.homepage),TREND_URL].map(s=>JSON.stringify(s)).join(',')+')');
    }
    const loadRecords=async()=>{const rawRecords:any[]=[];
    for(let offset=0;offset<(['community','daily','companies'].includes(modeParam)?500:2000);offset+=pageLimit){
      params.set('offset',String(offset));
      const res=await retry(async()=>{
        const r=await fetch(`${supabaseUrl}/rest/v1/${tableName}?${params}`,{
          headers:{apikey:anonKey,Authorization:`Bearer ${anonKey}`},cache:'no-store',signal:AbortSignal.timeout(15000)
        });
        if(!r.ok)throw Object.assign(Error(`NEWS_READ_FAILED HTTP ${r.status}`),{status:r.status});return r;
      },2);
      const rows=await res.json();
      if(!Array.isArray(rows))throw Error('NEWS_RESPONSE_INVALID');
      rawRecords.push(...rows);if(rows.length<pageLimit)break;
    }
      return rawRecords;};
    const rawRecords=briefRequest?await loadRecords():await publicRowsCache.get([supabaseUrl,anonKey,['community','daily','companies'].includes(modeParam)?modeParam:'news'].join('|'),loadRecords,url.searchParams.get('fresh')==='1');
    if(modeParam==='companies'){
      const items=companyCatalog.map(c=>{
        const rows=rawRecords.filter(r=>r.raw_url===companyURL(c.stock_code));
        const snapshot=rows.map(r=>primaryRecord(r)?.company).find(c=>c?.version===COMPANY_VERSION);
        const {analysisSignature,errors,...profile}=snapshot||{};
        return {...c,profile:snapshot?profile:null};
      });
      return Response.json({success:true,items,total:items.length,methodology:'跨行业核心企业与文化产业观察名单；非实时市值排名。财务来自DART结构化账户，官网附件未自动阅读全文。'}, {headers:{'Cache-Control':'no-store'}});
    }
    if(modeParam==='daily'){
      const editions=rawRecords.map(r=>primaryRecord(r)?.daily).filter(d=>d?.version===DAILY_VERSION).sort((a,b)=>b.day.localeCompare(a.day));
      const day=url.searchParams.get('date');if(day&&!/^\d{4}-\d{2}-\d{2}$/.test(day))return Response.json({error:'INVALID_DATE'},{status:400});
      const chosen=day?editions.find(d=>d.day===day):editions[0]||null;
      return Response.json({success:true,editions:editions.map(d=>({day:d.day,complete:d.complete,observedAt:d.observedAt})),edition:chosen?{...chosen,signature:undefined}:null}, {headers:{'Cache-Control':'no-store'}});
    }
    if(briefRequest){
      const row=rawRecords[0],primary=sourceArticles(row?.cluster_urls).find(s=>cleanArticleUrl(s.url)===cleanArticleUrl(row?.raw_url))||sourceArticles(row?.cluster_urls)[0];
      const assessment=readIntelligence(primary?.intelligence,plainText(row?.raw_title)+' '+plainText(primary?.excerpt),{title:plainText(row?.raw_title)});
      if(!row?.deep_report||!isFeatured(assessment))return Response.json({error:'REPORT_UNAVAILABLE'},{status:404,headers:{'Cache-Control':'no-store'}});
      const date=primary?.published_at||row.created_at||'';
      return Response.json({id:row.id,type:'brief',state:'ai_draft',report_kind:'single_news_impact_note',editorial_verified:false,
        title:plainText(row.translated_title||row.raw_title),date,summary:plainText(row.ai_summary),
        sources:[{ref:'1',title:plainText(row.raw_title),url:row.raw_url,source:row.source_site,published_at:date,content_kind:'rss_excerpt'}],
        body:{facts:[{text:plainText(primary?.excerpt).slice(0,800)||'原始片段不足，需阅读原文核对。',citations:['1']}],
          analysis:[{text:String(row.deep_report).slice(0,6000),citations:['1']}],strategic_implications:[],alternatives:['尚未完成多来源比较和替代解释检验。'],
          limitations:['这是基于单条订阅片段的AI影响简报草稿，不是多来源专题研究或事实核查。','未声称阅读全文或经过人工核验；分析中的传导机制属于条件性判断。'],
          next_steps:['核对原文和一手公告。','补充不同来源与相反证据，再形成人工审阅的研究报告。']}}, {headers:{'Cache-Control':'no-store'}});
    }
    if(modeParam==='community'){
      const days=Number(url.searchParams.get('days')||7),q=qParam.toLowerCase();
      const overview=rawRecords.map(r=>primaryRecord(r)?.trends).find(t=>t?.overview&&Date.parse(t.observedAt)>=Date.now()-36*3600000);
      const seen=new Set<string>();
      const items=rawRecords.flatMap(r=>{
        const primary=sourceArticles(r.cluster_urls).find(x=>x.content_type==='community_digest');
        const c=primary?.community;
        if(!c||!['community-20261027-v1','community-20261027-v2','community-20261028-v3'].includes(c.version)||!Array.isArray(c.themes)||(!c.themes.length&&!c.history?.length)||seen.has(r.raw_url))return [];
        seen.add(r.raw_url);
        const age=Date.now()-Date.parse(c.observedAt);
        if(!Number.isFinite(age)||age < -3600000||([1,7,30].includes(days)&&age>days*86400000))return [];
        if(q&&!JSON.stringify([c.title,c.summary,c.themes]).toLowerCase().includes(q))return [];
        return [{id:r.id,type:'community',title:c.title,url:r.raw_url,source:r.source_site,date:c.observedAt,summary:c.summary,community:c}];
      }).sort((a,b)=>b.date.localeCompare(a.date));
      const pagination=paginate(items,url.searchParams.get('page')||1);
      return Response.json({...safeFallback,...pagination,overview:overview?{...overview,signature:undefined}:null,hasMore:pagination.has_more,...(url.searchParams.get('browse')==='1'?{browse_items:items}:{}),success:true,news:[],counts:{news:0,assessed:0,reports:0},selection_version:SELECTION_VERSION}, {headers:{'Cache-Control':'no-store'}});
    }
    let pendingAssessment=0,belowImportance=0,sportsExcluded=0,needsReassessment=0;


    const formattedRecords: any[] = [];
    const eventSourceMap=new Map<string,any[]>();
    for(const row of rawRecords){
      const sources=sourceArticles(row.cluster_urls),primary=sources.find(s=>cleanArticleUrl(s.url)===cleanArticleUrl(row.raw_url))||sources[0],event=readEvent(primary?.event);
      if(event&&isNewsRecord(row)){
        const list=eventSourceMap.get(event.id)||[];
        list.push({url:row.raw_url,title:row.raw_title,source:row.source_site,published_at:primary?.published_at||null,coverage_kind:event.coverageKind});
        eventSourceMap.set(event.id,list);
      }
    }
    for (const r of rawRecords) {
      const title = plainText(r.translated_title || r.raw_title);
      const articleUrl = cleanArticleUrl(r.raw_url);
      if (!title || !articleUrl) continue;
      const summary = plainText(r.ai_summary);
      const linkedSources = sourceArticles(r.cluster_urls);
      const primary = linkedSources.find(x=>cleanArticleUrl(x.url)===articleUrl) || linkedSources[0];
      if(!isNewsRecord(r))continue;
      if(primary?.screening?.version===SELECTION_VERSION&&primary?.screening?.eligible===false){belowImportance++;continue;}
      const evidenceText = plainText(primary?.excerpt || r.original_excerpt || '');
      const assessment=readIntelligence(primary?.intelligence,plainText(r.raw_title)+' '+evidenceText,{title:plainText(r.raw_title)});
      if(primary?.intelligence?.version!==SELECTION_VERSION)needsReassessment++;
      if(!assessment){pendingAssessment++;continue;}
      if(!isImportant(assessment)){belowImportance++;continue;}
      const editorialFocus=primary?.editorial_focus||(/The Korea Herald.*K-pop|Soompi.*音乐/i.test(r.source_site||'')?'kpop':'');
      const kpop=isKpop(plainText(r.raw_title),evidenceText,editorialFocus);
      if((assessment.category==='entertainment'||kpop)&&lowValueEntertainment(plainText(r.raw_title))){belowImportance++;continue;}
      const headline = [...new Set([plainText(r.raw_title),title])].filter(Boolean).join(' ');
      const category = assessment.category;
      if (!keepSports(category, headline, evidenceText)){sportsExcluded++;continue;}
      const publication=r.published_at||primary?.published_at;
      const publishedAt=Number.isFinite(Date.parse(publication||''))?new Date(publication).toISOString():null;
      const dateCandidate = publishedAt || r.created_at || '';
      const date = Number.isFinite(Date.parse(dateCandidate)) ? new Date(dateCandidate).toISOString() : '';
      const mappedRegions = getValidRegionIds(r.region || primary?.regions, headline + ' ' + evidenceText);
      const numericScore = assessment.korea;
      const assessed = numericScore !== null;
      const dimensions: Record<string, number | null> = {};
      for (const id of ['korea_link','business_impact','cross_border','urgency','evidence']) {
        const value = r.dimensions?.[id];
        dimensions[id] = Number.isInteger(value) && value >= 0 && value <= 5 ? value : null;
      }
      formattedRecords.push({
        id: r.id ?? ('news:' + articleUrl),
        type: 'news',
        title,
        url: r.raw_url,
        source: r.source_site || '全球信源',
        category,
        regions: mappedRegions,topics:kpop?['kpop']:[],editorial_priority:entertainmentPriority(plainText(r.raw_title),evidenceText,editorialFocus),
        date,published_at:publishedAt,collected_at:r.created_at||null,date_basis:publishedAt?'published':'ingested',
        summary: summary || '原文内容分析中...',
        ai_assisted: !!r.ai_summary || !!r.translated_title,
        content_kind: 'rss_excerpt',
        originalTitle:plainText(r.raw_title),excerpt:evidenceText,event:readEvent(primary?.event),
        sources:mergeSourceLinks([{url:articleUrl,title:r.raw_title,source:r.source_site,published_at:primary?.published_at||null,coverage_kind:readEvent(primary?.event)?.coverageKind},...linkedSources,...(eventSourceMap.get(readEvent(primary?.event)?.id||'')||[]).filter(s=>!s.published_at||Math.abs(Date.parse(s.published_at)-Date.parse(date))<=72*3600000)]),
        intelligence: assessment,
        hasReport: !!r.deep_report && isFeatured(assessment),
        relevance: assessed ? {
          score: numericScore,
          reason: assessment.koreaReason,
          channel: assessment.mechanism,
          companies: Array.isArray(r.companies) ? r.companies : [],
          dimensions,
          confidence: assessment.confidence,
          quote: assessment.koreaEvidence
        } : null,
        source_count: Math.max(1,new Set(linkedSources.map(x=>x.source||x.url).filter(Boolean)).size)
      });
    }

    // 使用前端实际的六类ID和八区ID；先去重和执行体育规则，再筛选、统计。
    const days = Number(url.searchParams.get('days') || 0);
    formattedRecords.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const windowRecords = [1,7,30].includes(days)
      ? formattedRecords.filter(r => Date.parse(r.date) >= Date.now() - days * 86400000 && Date.parse(r.date) <= Date.now() + 3600000)
      : formattedRecords;
    const eventRecords=clusterPublicArticles(windowRecords);
    const regionCounts = Object.keys(REGION_RULES).map(id => ({id, count: eventRecords.filter(r => r.regions.includes(id)).length}));
    let finalRecords = eventRecords;
    if (categoryParam) {
      const category = normalizeCategory(categoryParam);
      finalRecords = finalRecords.filter(r => r.category === category||(category==='entertainment'&&r.topics?.includes('kpop')));
      if(category==='entertainment')finalRecords.sort((a,b)=>(b.editorial_priority||0)-(a.editorial_priority||0)||String(b.date).localeCompare(String(a.date)));
    }
    if (regionParam) {
      const region = Object.keys(REGION_RULES).includes(regionParam) ? regionParam : getValidRegionIds(regionParam, '')[0];
      finalRecords = finalRecords.filter(r => regionParam === 'other' ? r.regions.length === 0 : !!region && r.regions.includes(region));
    }
    if (qParam) {
      const q = qParam.toLowerCase();
      finalRecords = finalRecords.filter(r => String(r.search_text||r.title+' '+r.summary).toLowerCase().includes(q));
    }
    if (kindParam === 'brief' || modeParam === 'research') finalRecords = finalRecords.filter(r => r.hasReport);
    const rankedRecords=finalRecords.filter(r=>isHot(r.intelligence)).slice().sort((a,b)=>b.intelligence.priority-a.intelligence.priority||String(b.date).localeCompare(String(a.date)));
    if(modeParam==='featured'||!modeParam)finalRecords=finalRecords.filter(r=>isFeatured(r.intelligence)).sort((a,b)=>b.intelligence.priority-a.intelligence.priority||String(b.date).localeCompare(String(a.date)));
    if(modeParam==='hot')finalRecords=rankedRecords;

    const stats = {
      news: finalRecords.length,
      assessed: finalRecords.filter(r => r.relevance !== null).length,
      reports: finalRecords.filter(r => r.hasReport).length
    };
    const publicRecord=(r:any)=>{const {excerpt,originalTitle,event,search_text,...rest}=r;return rest;};
    const pagination=paginate(finalRecords,url.searchParams.get('page')||1);
    const pageItems=pagination.items.map(publicRecord);
    const {page,page_size,total_pages,has_more}=pagination;
    const payload = {
      news: pageItems,
      hot: rankedRecords.slice(0,5).map(publicRecord),
      items: pageItems,
      ...(url.searchParams.get('browse')==='1'?{browse_items:finalRecords.map(publicRecord)}:{}),
      events: [],
      counts: stats,
      thresholds: THRESHOLDS,
      selection_version: SELECTION_VERSION,
      clustering:{version:CLUSTER_VERSION,unprocessed_articles:windowRecords.filter(r=>(!r.event?.checked||r.event.version!==CLUSTER_VERSION)).length,articles:windowRecords.length,events:eventRecords.length,merged:windowRecords.length-eventRecords.length},
      pending_assessment: pendingAssessment,
      read_window: rawRecords.length,
      coverage:{pending:pendingAssessment,needs_reassessment:needsReassessment,below_importance:belowImportance,sports_excluded:sportsExcluded,categories:Object.fromEntries(Object.keys(CATEGORY_LABELS).map(id=>[id,eventRecords.filter(r=>r.category===id||(id==='entertainment'&&r.topics?.includes('kpop'))).length]))},
      regions: regionCounts,
      total: finalRecords.length,
      page,page_size,total_pages,
      history:{default_days:7,read_limit:2000,scope:'recent_records',display_window:days||'all_in_read_window'},
      hasMore:has_more,has_more
    };
    const {browse_items,...compatPayload}=payload as typeof payload & {browse_items?:any[]};
    return Response.json({...payload, data:compatPayload, result:compatPayload, success: true}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error: any) {
    console.error('Public news request failed:', error?.name || 'Error');
    return Response.json({...safeFallback,data:safeFallback,result:safeFallback,success:false,error:'NEWS_FETCH_FAILED'}, {status:502,headers:{'Cache-Control':'no-store'}});
  }
}
