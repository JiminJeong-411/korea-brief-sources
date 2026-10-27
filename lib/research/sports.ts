// Global sporting milestones deserve coverage independently of Korean business relevance.
export type SportsMilestone={id:string;label:string;minimumImportance:number};
const text=(s:unknown)=>String(s??'').normalize('NFKC').replace(/[’‘`´]/g,"'").replace(/\s+/g,' ').trim();
const AWARD=/ballon\s*d['’ ]?or|金球奖|발롱도르/i;
const RESULT=/\b(?:wins?|won|claims?|crowned|awarded|takes? (?:the )?(?:award|prize)|winner announced)\b|\bends\b.{0,80}\bwait\b|获奖|获颁|荣膺|夺得|当选|得主揭晓|수상|수여|차지|선정/i;
const SPECULATION=/\b(?:could|might|may win|odds|predictions?|favourites?|favorites?|nominees?|shortlist|nominations?|credentials|campaign|poll|fan vote|prematurely|leak|blunder|how to watch|live stream|best .*goals|rankings? .*compare)\b|候选|提名|赔率|预测|有望|误发|提前宣布|最好进球|후보|예측|전망|유출/i;
export function majorSportsMilestone(title:string,excerpt=''):SportsMilestone|null{
 const t=text(title),body=text(excerpt);
 if(SPECULATION.test(t))return null;
 if(AWARD.test(t)&&RESULT.test(t)){
   if(/kopa|yashin|gerd m[uü]ller|s[oó]crates|科帕|雅辛|盖德|苏格拉底|코파|야신/i.test(t))return {id:'ballon-dor-secondary-result',label:'金球奖典礼的重要单项奖结果',minimumImportance:65};
   return {id:'ballon-dor-result',label:'金球奖正式获奖结果',minimumImportance:75};
 }
 const tournament=/world cup|olympic|paralympic|champions league|wimbledon|australian open|roland garros|us open|super bowl|世界杯|奥运|残奥|欧冠|温网|澳网|法网|美网|월드컵|올림픽|챔피언스리그/i;
 const decisive=/\b(?:champions?|crowned|wins? (?:the )?(?:title|final|gold)|world record|gold medal)\b|夺冠|冠军诞生|决赛获胜|夺金|金牌|世界纪录|우승|금메달|세계기록/i;
 if(tournament.test(t+' '+body)&&decisive.test(t)&&!/qualif|group stage|预选|资格赛|小组赛|예선/i.test(t))return {id:'global-final-result',label:'世界级赛事冠军、奖牌或世界纪录',minimumImportance:75};
 return null;
}
export function keepSportsNews(category:string,title:string,excerpt:string):boolean{
 if(category!=='sports')return true;
 const t=text(title),body=text(excerpt),all=t+' '+body;
 if(/\b(?:fantasy|betting picks|betting odds|parlay|waiver wire)\b|博彩推荐|投注推荐|梦幻体育/i.test(t))return false;
 if(majorSportsMilestone(t,body))return true;
 if(/韩国|韩籍|韩裔|孙兴慜|金玟哉|李刚仁|李政厚|金河成|金惠成|柳贤振|한국|손흥민|김민재|이강인|\b(?:south korea|korean|k-?league|kbo|son heung[- ]min|heung[- ]min son|kim min[- ]jae|lee kang[- ]in|jung[- ]hoo lee|ha[- ]seong kim|hye[- ]seong kim)\b/i.test(t))return true;
 if(/韩国.{0,12}(?:球员|运动员|球队|国家队)|\bkorean (?:player|athlete|team|guard|pitcher)\b/i.test(body))return true;
 // These subjects reach AI for category-specific importance review; no automatic high score.
 if(/奥运|残奥|世界杯|亚运|世锦赛|世界锦标赛|欧冠|大满贯|温网|澳网|法网|美网|金球奖|발롱도르|올림픽|월드컵|\b(?:olympics?|paralympics?|world cup|asian games|world championships?|champions league|grand slam|wimbledon|australian open|roland garros|us open|formula (?:one|1)|f1|ballon d['’ ]?or)\b/i.test(all))return true;
 if(/\b(?:global|international|cross-border|overseas|worldwide)\b.{0,100}\b(?:broadcast|streaming|media rights|tv rights|sponsor|investment|acquisition)|全球转播|国际转播|海外版权|跨境投资|全球赞助|国际赞助|跨国并购/i.test(all))return true;
 return false;
}
// Stable key only for the actual award result; previews, leaks and features never enter this cluster.
export function sportsEventKey(title:string,excerpt:string,publishedAt:string):string|null{
 const m=majorSportsMilestone(title,excerpt);if(m?.id!=='ballon-dor-result')return null;
 const publishedYear=new Date(publishedAt).getUTCFullYear();
 const reportedYear=Number(title.match(/\b20\d{2}\b/)?.[0]);
 const year=String(reportedYear&&Math.abs(reportedYear-publishedYear)<=1?reportedYear:publishedYear);
 if(!/^20\d{2}$/.test(year))return null;
 const head=text(title);
 const combined=/women|féminin|feminin|putellas|bonmat|女子|女足|여자|여성|푸테야스|\bkane\b|男子|男足|케인|남자/i.test(head)?head:text(title+' '+excerpt);
 const women=/women|féminin|feminin|putellas|bonmat|女子|女足|여자|여성|푸테야스/i.test(combined);
 const men=/\bmen'?s?\b|\bkane\b|\bmbapp|\byamal\b|男子|男足|케인|남자/i.test(combined);
 if(women&&men)return null;
 if(!women&&!men)return null;
 return `ballon-dor:${year}:${women?'women':'men'}`;
}
