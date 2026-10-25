import {CATEGORIES,REGIONS,inferRegions,validateAssessment} from './strategy-domain.mjs';
import {clean,canonical} from './domain.mjs';
export const CONTENT_POLICY_VERSION='content-v2';
const categoryIds=new Set(CATEGORIES.map(x=>x.id));
const categoryAliases={tech:'technology',technology:'technology',science:'technology',科技:'technology',技术:'technology',经济:'economy',财经:'economy',金融:'economy',商业:'economy',产业:'economy',政治:'politics',时政:'politics',社会:'society',娱乐:'entertainment',文娱:'entertainment',体育:'sports'};
export function categoryId(value){const s=clean(value).toLowerCase();if(categoryIds.has(s)||categoryAliases[s])return categoryAliases[s]||s;for(const [id,re] of [['sports',/体育|\bsports?\b/],['entertainment',/娱乐|文娱|文化|电影|音乐|\b(?:entertainment|culture|music|film|hollywood)\b/],['technology',/科技|技术|创业|\b(?:ai|tech|technology|science|startups?)\b/],['politics',/政治|时政|外交|\b(?:politics?|policy|affairs)\b/],['economy',/经济|财经|金融|商业|产业|企业|\b(?:business|economy|economic|finance|financial|markets?)\b/]])if(re.test(s))return id;return 'society';}
const rules={
 technology:[/\b(?:artificial intelligence|machine learning|semiconductors?|chips?|chipmakers?|AI|robotics?|cybersecurity|software|smartphones?|data cent(?:er|re)s?|quantum|cloud computing|tech(?:nology)?|openai|nvidia|deepseek|tsmc)\b/giu,/科技|技术|创业|初创|人工智能|半导体|芯片|大模型|算法|机器人|网络安全|软件|智能手机|量子|数据中心|算力|반도체|인공지능|스마트폰/gu],
 economy:[/\b(?:econom(?:y|ic|ics)|inflation|interest rates?|central bank|federal reserve|gdp|tariffs?|trade (?:deal|war|deficit)|exports?|imports?|earnings|revenues?|stocks?|stock market|bonds?|mergers?|acquisitions?|investment|supply chain|unemployment|currency|exchange rate|retail sales|oil prices?)\b/giu,/经济|财经|金融|商业|货币|债券|通胀|利率|央行|美联储|关税|贸易|出口|进口|营收|财报|利润|股市|股价|并购|收购|投资|供应链|汇率|失业率|零售|油价|경제|금리|수출|투자|실적/gu],
 politics:[/\b(?:elections?|parliament|president|prime minister|senate|congress|diploma(?:cy|tic)|foreign minister|ceasefire|missiles?|military|invasion|defen[cs]e|nuclear|sanctions?|democra(?:cy|tic)|legislation|bill|government|cabinet|treaty)\b/giu,/政治|时政|选举|议会|总统|首相|总理|国会|外交|停火|导弹|军事|战争|制裁|民主|法案|政府|内阁|条约|정치|대통령|국회|외교/gu],
 entertainment:[/\b(?:k-?pop|bts|blackpink|aespa|newjeans|hybe|sm entertainment|jyp|cj enm|concerts?|albums?|box office|film festival|streaming music|music (?:industry|rights|labels?)|record labels?|movies?|films?|singers?|actors?)\b/giu,/韩流|演唱会|专辑|票房|电影|艺人|歌手|偶像|音乐版权|影视|娱乐|엔터테인먼트|공연|음반/gu],
 sports:[/\b(?:sports?|nfl|nba|wnba|ncaa|mlb|nhl|football|basketball|soccer|baseball|tennis|olympics?|paralympics?|world cup|champions league|formula (?:one|1)|grand slam|touchdowns?|quarterbacks?|playoffs?|tournament|match|league|striker|goalkeeper|championship|wimbledon)\b/giu,/体育|足球|篮球|棒球|橄榄球|女篮|男篮|奥运|世界杯|欧冠|锦标赛|大满贯|季后赛|联赛|孙兴慜|손흥민|축구|야구|농구/gu],
 society:[/\b(?:schools?|education|hospitals?|health|earthquake|typhoon|floods?|migration|crime|police|housing|welfare|workers?|strike|transport|population)\b/giu,/社会|学校|教育|医院|医疗|地震|台风|洪水|移民|犯罪|警方|住房|福利|罢工|人口|交通|사회|교육|의료/gu]
};
function hits(s,patterns){return patterns.reduce((n,re)=>n+[...s.matchAll(re)].length,0);}
export function classifyCategory(article={}){
 const title=clean(article.original_title||article.raw_title||article.title),translated=clean(article.translated_title||article.title_zh),body=clean(article.original_excerpt||article.content||article.summary||article.aiSummary||article.ai_summary).slice(0,1800);
 const seed=categoryId(article.category_id||article.assigned_category||article.category||article.feed_category);
 const score=Object.fromEntries(CATEGORIES.map(c=>[c.id,Math.min(12,hits(title,rules[c.id])*4)+Math.min(8,hits(translated,rules[c.id])*3)+Math.min(4,hits(body,rules[c.id]))]));
 score[seed]+=1;
 const candidates=CATEGORIES.map(c=>c.id).sort((a,b)=>score[b]-score[a]);
 // A source section is a weak fallback. Article subjects take priority over a broad politics/business feed label.
 return score[candidates[0]]>=4?candidates[0]:seed;
}
const regionAliases={
 'east-asia':['east-asia','east asia','东亚','东北亚','kr','kor','korea','south korea','north korea','韩国','朝鲜','cn','chn','china','中国','jp','jpn','japan','日本','tw','taiwan','台湾','hk','hong kong','香港','kp','mongolia','蒙古'],
 'southeast-asia':['southeast-asia','southeast asia','south-east asia','东南亚','asean','东盟','sg','singapore','新加坡','vietnam','vn','越南','indonesia','印尼','印度尼西亚','malaysia','马来西亚','thailand','泰国','philippines','菲律宾','myanmar','缅甸','cambodia','柬埔寨','laos','老挝','brunei','文莱'],
 europe:['europe','eu','欧洲','欧盟','uk','united kingdom','英国','germany','德国','france','法国','russia','ru','俄罗斯','ukraine','乌克兰','italy','意大利','spain','西班牙'],
 'north-america':['north-america','north america','北美','us','usa','united states','美国','canada','ca','加拿大','mexico','mx','墨西哥'],
 'south-america':['south-america','south america','南美','brazil','br','巴西','argentina','阿根廷','chile','智利','peru','秘鲁','colombia','哥伦比亚'],
 africa:['africa','非洲','south africa','南非','nigeria','尼日利亚','kenya','肯尼亚','egypt','埃及','morocco','摩洛哥'],
 oceania:['oceania','大洋洲','australia','au','澳大利亚','澳洲','new zealand','nz','新西兰'],
 'middle-east':['middle-east','middle east','中东','saudi arabia','沙特','uae','united arab emirates','阿联酋','israel','以色列','iran','伊朗','iraq','伊拉克','qatar','卡塔尔','turkey','土耳其']
};
export function normalizeRegions(value){
 if(typeof value==='string'){try{const json=JSON.parse(value);if(Array.isArray(json))return normalizeRegions(json);}catch{}value=value.split(/[,，、;；|/]+/);}
 if(!Array.isArray(value))return [];
 const ids=new Set();for(const raw of value){const s=clean(raw).toLowerCase();for(const [id,aliases] of Object.entries(regionAliases))if(aliases.includes(s))ids.add(id);}
 return REGIONS.map(r=>r.id).filter(id=>ids.has(id));
}
export function classifyRegions(article={}){
 const text=clean([article.original_title,article.raw_title,article.title,article.translated_title,article.title_zh,article.original_excerpt,article.content,article.summary,article.aiSummary,article.ai_summary].filter(Boolean).join(' '));
 const found=inferRegions(text),extra=[];
 if(/美联储|美国证券交易委员会|\b(?:Federal Reserve|U\.S\.|U\.S\b|USA|United States|Wall Street|Canadian|Mexican)\b/i.test(text))extra.push('north-america');
 if(/\b(?:German|French|British|Italian|Spanish|EU|U\.K\.)\b|英国央行|欧洲央行/i.test(text))extra.push('europe');
 const explicit=normalizeRegions(article.regions??article.region);
 return REGIONS.map(r=>r.id).filter(id=>new Set([...explicit,...found,...extra]).has(id));
}
export function canonicalArticleUrl(raw){
 try{const u=new URL(canonical(raw));u.hostname=u.hostname.toLowerCase().replace(/^www\./,'');if(u.pathname!=='/')u.pathname=u.pathname.replace(/\/+$/,'');for(const k of [...u.searchParams.keys()])if(/^(?:utm_|fbclid$|gclid$|mc_cid$|mc_eid$|spm$)/i.test(k))u.searchParams.delete(k);u.searchParams.sort();return u.toString();}catch{return '';}
}
function titleKey(value){return clean(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
function titleKeys(x){return [...new Set([x.title,x.original_title].map(titleKey).filter(s=>s.length>=12))];}
function quality(x){return (x.relevance?1000:0)+(x.summary?.length||0)+(x.original_title?20:0);}
export function deduplicateNews(items){
 const out=[],urls=new Map(),titles=new Map();
 for(const x of items.slice().sort((a,b)=>quality(b)-quality(a)||String(b.date||'').localeCompare(String(a.date||'')))){
  const url=canonicalArticleUrl(x.url),keys=titleKeys(x),date=Date.parse(x.date);let old=url?urls.get(url):null;
  if(!old&&Number.isFinite(date))for(const key of keys){old=(titles.get(key)||[]).find(a=>Number.isFinite(Date.parse(a.date))&&Math.abs(Date.parse(a.date)-date)<=86400000);if(old)break;}
  if(old){old.duplicate_count=(old.duplicate_count||0)+1;continue;}
  const copy={...x};out.push(copy);if(url)urls.set(url,copy);for(const key of keys)titles.set(key,[...(titles.get(key)||[]),copy]);
 }
 return out.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(a.id).localeCompare(String(b.id)));
}
export function sportsEligibility(article){
 if(article.category!=='sports')return {allowed:true,reason:'non-sports'};
 const text=clean([article.original_title,article.title,article.original_excerpt,article.summary].filter(Boolean).join(' '));
 const korean=/韩国|朝鲜|韩裔|韩籍|孙兴慜|金玟哉|李刚仁|李政厚|金河成|金惠成|柳贤振|\b(?:south korea|north korea|korean|k-?league|kbo|son heung[- ]min|heung[- ]min son|kim min[- ]jae|lee kang[- ]in|jung[- ]hoo lee|ha[- ]seong kim|hye[- ]seong kim|hyun[- ]jin ryu|samsung|hyundai|kia motors|lg electronics)\b|한국|손흥민/i;
 if(korean.test(text))return {allowed:true,reason:'korean-participant-or-business'};
 const global=/奥运|残奥|世界杯|亚运|世界锦标赛|世锦赛|欧冠|大满贯|温网|法网|澳网|美网|\b(?:olympics?|paralympics?|world cup|asian games|world championships?|champions league|grand slam|wimbledon|roland garros|australian open|us open|formula (?:one|1)|f1|fifa|international olympic committee)\b/i;
 if(global.test(text))return {allowed:true,reason:'international-competition'};
 const business=/\b(?:global|international|cross-border|worldwide|overseas)\b[\s\S]{0,90}\b(?:broadcast|streaming|media rights|sponsor|investment|acquisition|licens)|\b(?:broadcast|streaming|media rights|sponsor|investment|acquisition|licens)[\s\S]{0,90}\b(?:global|international|cross-border|worldwide|overseas)\b|全球转播|国际转播|海外版权|跨境投资|全球赞助|国际赞助|跨国并购|体育产业|体育版权|赛事版权/i;
 if(business.test(text))return {allowed:true,reason:'international-sports-business'};
 return {allowed:false,reason:'domestic-sports-without-established-global-or-korean-link'};
}
export function decodeAnalysis(value){if(typeof value!=='string')return null;try{const d=JSON.parse(value);return d?.schema==='korea-brief.analysis.v2'?d:null;}catch{return null;}}
function checkedAssessment(value,content){try{return validateAssessment(value,{content,content_kind:'rss_excerpt'});}catch{return null;}}
export function projectNews(row,table='news'){
 const meta=decodeAnalysis(row.strategic_report||row.strategicReport),original=clean(row.raw_title||row.original_title||row.title),title=clean(row.translated_title||row.title_zh||row.title||row.raw_title),excerpt=clean(row.content||row.original_excerpt||row.ai_summary||row.aiSummary),summary=clean(meta?.summary_zh||row.summary_zh||row.ai_summary||row.aiSummary||row.summary||excerpt);
 const raw={...row,title,original_title:original,summary,original_excerpt:excerpt,category_id:meta?.classification?.category||row.category_id,regions:meta?.classification?.regions||row.regions};
 const url=canonicalArticleUrl(row.raw_url||row.rawUrl||row.url),dateValue=row.published_at||row.publishedAt||row.isoDate||row.created_at||row.createdAt,parsed=Date.parse(dateValue),date=Number.isFinite(parsed)?new Date(parsed).toISOString():null;
 const category=classifyCategory(raw),regions=classifyRegions(raw),relevance=checkedAssessment(meta?.assessment||row.relevance,excerpt);
 return {id:table+':'+String(row.id??url??title),type:'news',title,original_title:original,url,source:row.source_site||row.sourceSite||row.source||'来源未注明',summary,original_excerpt:excerpt,date,category,regions,region_basis:'normalized-content',classification_version:CONTENT_POLICY_VERSION,relevance,editorial_featured:row.editorial_featured===true,language:row.language||(table.startsWith('korea_')?'ko':'unknown'),ai_assisted:!!meta?.summary_zh||!!row.summary_zh||!!row.translated_title,content_kind:excerpt?'rss_excerpt':'title_only',event_id:row.event_id||null,event_title:row.event_title||'',hasReport:false};
}
export function prepareNews(rows){const projected=rows.map(x=>projectNews(x.row??x,x.table||'news')).filter(x=>x.title&&x.url);const unique=deduplicateNews(projected);return {items:unique.filter(x=>sportsEligibility(x).allowed),removed_duplicates:projected.length-unique.length,suppressed_sports:unique.filter(x=>!sportsEligibility(x).allowed).length};}
export function feedPayload(items,params={},time=Date.now()){
 const {mode='stream',q='',category='',region='',kind='',days='7',page='1'}=params;
 const requestedCategory=category?categoryId(category):'',regionIds=normalizeRegions(region),requestedRegion=region==='other'?'other':regionIds[0]||region,dayNumber=[0,1,7,30].includes(Number(days))?Number(days):7,pageNumber=Math.min(10000,Math.max(1,Number.parseInt(page)||1));
 const inWindow=items.filter(x=>!dayNumber||(x.date&&Date.parse(x.date)>=time-dayNumber*86400000&&Date.parse(x.date)<=time+3600000));
 const filtered=inWindow.filter(x=>(!requestedCategory||x.category===requestedCategory)&&(!requestedRegion||(requestedRegion==='other'?!x.regions.length:x.regions.includes(requestedRegion)))&&(!q||(x.title+' '+x.original_title+' '+x.summary+' '+x.source).toLowerCase().includes(q.toLowerCase()))&&(!kind||kind==='news'));
 const hot=filtered.filter(x=>x.relevance?.score>=50&&x.relevance?.dimensions?.korea_link>0).sort((a,b)=>b.relevance.score-a.relevance.score||String(b.date).localeCompare(String(a.date)));
 const featured=filtered.filter(x=>x.editorial_featured||x.relevance?.score>=75&&x.relevance?.dimensions?.korea_link>0&&x.relevance?.confidence!=='low');
 const selection_basis=mode==='featured'?(featured.length?'verified-featured':'latest-candidates'):mode;
 const selected=mode==='hot'?hot:mode==='research'?[]:mode==='featured'?(featured.length?featured:filtered):filtered;
 const size=30,publicItem=x=>{const {original_excerpt,...safe}=x;return safe;};
 return {selection_basis,items:selected.slice((pageNumber-1)*size,pageNumber*size).map(publicItem),news:selected.slice((pageNumber-1)*size,pageNumber*size).map(publicItem),hot:hot.slice(0,5).map(publicItem),events:[],counts:{news:inWindow.length,assessed:inWindow.filter(x=>x.relevance).length,reports:0},thresholds:{hot:50,featured:75},regions:REGIONS.map(r=>({id:r.id,count:inWindow.filter(x=>x.regions.includes(r.id)).length})),total:selected.length,page:pageNumber,has_more:selected.length>pageNumber*size,hasMore:selected.length>pageNumber*size,classification_version:CONTENT_POLICY_VERSION};
}
