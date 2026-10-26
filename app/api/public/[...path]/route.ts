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

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.pathname.endsWith('/sources')) return Response.json({ sources: [] });
  if (url.pathname.endsWith('/data')) return Response.json({});
  if (url.pathname.endsWith('/refresh')) return Response.json({ success: true });

  const modeParam = url.searchParams.get('mode') || '';
  const categoryParam = url.searchParams.get('category') || '';
  const regionParam = url.searchParams.get('region') || '';
  const qParam = url.searchParams.get('q') || '';
  const kindParam = url.searchParams.get('kind') || '';

  const safeFallback = {
    news: [], hot: [], items: [], events: [],
    counts: { news: 0, assessed: 0, reports: 0 },
    thresholds: { hot: 50 }, total: 0, page: 1, hasMore: false, has_more: false, regions: []
  };

  try {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseUrl = rawUrl.replace(/\/+$/, "");
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) return Response.json(safeFallback);

    const tableName = "news";
    const fetchUrl = `${supabaseUrl}/rest/v1/${tableName}?select=*&order=id.desc&limit=500`;
    
    const res = await fetch(fetchUrl, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000) 
    });

    if (!res.ok) {
      console.error('Public news read failed:', res.status);
      return Response.json({...safeFallback, success: false, error: 'NEWS_READ_FAILED'}, {status: 502, headers: {'Cache-Control': 'no-store'}});
    }

    const rawRecords = await res.json();
    if (!Array.isArray(rawRecords)) return Response.json(safeFallback);


    const formattedRecords: any[] = [];
    const seenUrls = new Set<string>();
    const seenTitles = new Map<string, number[]>();
    for (const r of rawRecords) {
      const title = plainText(r.title);
      const articleUrl = cleanArticleUrl(r.raw_url);
      if (!title || !articleUrl) continue;
      const summary = plainText(r.ai_summary);
      const evidenceText = summary;
      const category = classifyCategory(title, evidenceText, r.category);
      if (!keepSports(category, title, evidenceText)) continue;
      const date = r.published_at || r.created_at || ''; 
      if (duplicateInBatch(articleUrl, headlineKeys(title), Date.parse(date), seenUrls, seenTitles)) continue;
      const mappedRegions = getValidRegionIds(r.region, title + ' ' + evidenceText);
      const numericScore = Number(r.ai_score);
      const assessed = r.ai_score !== null && r.ai_score !== undefined && r.ai_score !== '' && Number.isFinite(numericScore) && numericScore >= 1 && numericScore <= 10;
      const dimensions: Record<string, number | null> = {};
      for (const id of ['korea_link','business_impact','cross_border','urgency','evidence']) {
        const value = r.dimensions?.[id];
        dimensions[id] = Number.isInteger(value) && value >= 0 && value <= 5 ? value : null;
      }
      formattedRecords.push({
        id: r.id ?? ('news:' + articleUrl),
        title,
        url: r.raw_url,
        source: r.source_site || '全球信源',
        category,
        regions: mappedRegions,
        date,
        summary: summary || '原文内容分析中...',
        ai_assisted: !!r.ai_summary || !!r.strategic_report,
        content_kind: 'rss_excerpt',
        hasReport: !!r.strategic_report,
        relevance: assessed ? {
          // news.ai_score 为 1–10；前端沿用 0–100 评分及热点阈值。
          score: Math.round(numericScore * 10),
          reason: plainText(r.strategic_report) || '尚无针对此条新闻的具体韩国关联分析。',
          channel: plainText(r.channel) || '尚未提供具体传导机制',
          companies: Array.isArray(r.companies) ? r.companies : [],
          dimensions,
          confidence: ['low','medium','high'].includes(r.confidence) ? r.confidence : 'low',
          quote: plainText(r.quote) || title
        } : null,
        source_count: 1
      });
    }

    // 使用前端实际的六类ID和八区ID；先去重和执行体育规则，再筛选、统计。
    const days = Number(url.searchParams.get('days') || 0);
    const windowRecords = [1,7,30].includes(days)
      ? formattedRecords.filter(r => Date.parse(r.date) >= Date.now() - days * 86400000 && Date.parse(r.date) <= Date.now() + 3600000)
      : formattedRecords;
    const regionCounts = Object.keys(REGION_RULES).map(id => ({id, count: windowRecords.filter(r => r.regions.includes(id)).length}));
    let finalRecords = windowRecords;
    if (categoryParam) {
      const category = normalizeCategory(categoryParam);
      finalRecords = finalRecords.filter(r => r.category === category);
    }
    if (regionParam) {
      const region = Object.keys(REGION_RULES).includes(regionParam) ? regionParam : getValidRegionIds(regionParam, '')[0];
      finalRecords = finalRecords.filter(r => regionParam === 'other' ? r.regions.length === 0 : !!region && r.regions.includes(region));
    }
    if (qParam) {
      const q = qParam.toLowerCase();
      finalRecords = finalRecords.filter(r => r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q));
    }
    if (kindParam === 'brief') finalRecords = finalRecords.filter(r => r.hasReport);
    const rankedRecords = finalRecords.filter(r => r.relevance && r.relevance.score >= 50)
      .slice().sort((a,b) => b.relevance.score - a.relevance.score || String(b.date).localeCompare(String(a.date)));
    if (modeParam === 'hot') finalRecords = rankedRecords;

    const stats = {
      news: finalRecords.length,
      assessed: finalRecords.filter(r => r.relevance !== null).length,
      reports: finalRecords.filter(r => r.hasReport).length
    };
    const payload = {
      news: finalRecords,
      hot: rankedRecords.slice(0,5),
      items: finalRecords,
      events: [],
      counts: stats,
      thresholds: {hot: 50},
      regions: regionCounts,
      total: finalRecords.length,
      page: 1,
      hasMore: false,
      has_more: false
    };
    return Response.json({...payload, data: payload, result: payload, success: true}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error: any) {
    return Response.json({...safeFallback, data: safeFallback, result: safeFallback, error: error.message}, {status: 200});
  }
}
