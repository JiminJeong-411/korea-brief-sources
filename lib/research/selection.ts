import {isKpop} from './entertainment';
import {majorSportsMilestone} from './sports';
// All public gates share this version. Old scores never silently become new assessments.
export const SELECTION_VERSION = 'two-stage-20261027-v2';
export const THRESHOLDS = { important: 60, featured: 70, hot: 80, hotImportance: 70 };
export const CATEGORIES = ['economy','politics','society','entertainment','technology','sports'];
export type Intelligence = {
  version: string; importance: number; korea: number; confidence: 'low'|'medium'|'high';
  scope: 'direct'|'sector'|'weak'|'none'; category: string; importanceReason: string;
  importanceEvidence: string; koreaReason: string; koreaEvidence: string; mechanism: string;
  industries: string[]; priority: number; assessedAt: string; importanceBasis?:string; importanceRule?:string;
};
const clean=(s:unknown)=>String(s??'').replace(/\s+/g,' ').trim();
const score=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100?Math.round(v):null;
const supported=(quote:string,evidence:string)=>quote.length>=8&&quote.length<=260&&clean(evidence).toLowerCase().includes(quote.toLowerCase());
const KOREA_ANCHOR=/韩国|韩企|首尔|韩流|三星|现代汽车|起亚|海力士|韩国央行|乐金|LG新能源|韩国语|韩语|한국|대한민국|한미|한국어|중소벤처기업부|기획재정부|산업통상자원부|한국은행|금융위원회|공정거래위원회|코스피|코스닥|엘지|서울|삼성|현대차|하이닉스|하이브|카카오|네이버|\b(?:south korea|korean|seoul|samsung|hyundai|kia|hynix|hybe|lg(?: energy solution| electronics| chem| display)?|posco|lotte|doosan|hanwha|kospi|kosdaq|bank of korea|sk innovation|sk on|cj enm|sm entertainment|jyp|naver|kakao|k-?pop|korea|blackpink|stray kids|aespa|newjeans|illit|enhypen|le sserafim|ateez|plave|sm entertainment|yg entertainment|weverse|wakeone|belift|pledis)\b/i;
const SECTOR_ANCHOR=/半导体|芯片|电池|汽车|造船|航运|能源|石油|天然气|音乐版权|流媒体|平台|游戏|内容产业|반도체|배터리|자동차|조선|에너지|플랫폼|저작권|\b(?:semiconductors?|chips?|batteries|battery|automotive|electric vehicles?|shipbuilding|shipping|energy|oil|gas|music|copyright|streaming|platforms?|gaming|games?)\b/i;
const CHANGE_ANCHOR=/关税|制裁|禁令|监管|政策|出口|并购|收购|价格|供应|需求|罢工|中断|版权|收入|收益|관세|규제|수출|인수|가격|공급|\b(?:tariffs?|sanctions?|bans?|regulat\w*|polic\w*|exports?|acquisit\w*|merger|prices?|supply|demand|strike|disrupt\w*|copyright|royalt\w*|revenue)\b/i;
export function validateIntelligence(raw:any, evidence:string, hasExcerpt:boolean,context:{title?:string}={}):Intelligence {
  const importance=score(raw?.importance),korea=score(raw?.korea);
  if(importance===null||korea===null||!CATEGORIES.includes(raw?.category))throw Error('AI importance/korea/category 格式无效；不写入默认评分');
  const scope=['direct','sector','weak','none'].includes(raw.scope)?raw.scope:'none';
  const importanceEvidence=clean(raw.importanceEvidence),koreaEvidence=clean(raw.koreaEvidence);
  const importanceReason=clean(raw.importanceReason),koreaReason=clean(raw.koreaReason),mechanism=clean(raw.mechanism);
  const evidenceOK=supported(importanceEvidence,evidence)&&importanceReason.length>=10;
  const linked=scope==='direct'?(KOREA_ANCHOR.test(evidence)||isKpop('',evidence)):scope==='sector'&&SECTOR_ANCHOR.test(evidence)&&CHANGE_ANCHOR.test(evidence);
  const koreaOK=supported(koreaEvidence,evidence)&&koreaReason.length>=10&&mechanism.length>=10&&linked;
  const confidence=hasExcerpt&&['medium','high'].includes(raw.confidence)?'medium':'low';
  const milestone=context.title?majorSportsMilestone(context.title,evidence):null;
  const imp=milestone?Math.max(importance,milestone.minimumImportance):evidenceOK?importance:Math.min(importance,THRESHOLDS.important-1);
  const kr=koreaOK?korea:Math.min(korea,39);
  return {version:SELECTION_VERSION,importance:imp,korea:kr,confidence,scope,category:milestone?'sports':raw.category,importanceBasis:milestone?'global-sports-milestone':'ai',importanceRule:milestone?.label,
    importanceReason:(milestone&&!importanceReason.startsWith('全球体育重大结果：')?`全球体育重大结果：${milestone.label}。`+importanceReason:importanceReason).slice(0,600),importanceEvidence:evidenceOK?importanceEvidence:milestone?context.title!.slice(0,260):'',
    koreaReason:koreaReason.slice(0,600),koreaEvidence:koreaOK?koreaEvidence:'',mechanism:mechanism.slice(0,600),
    industries:Array.isArray(raw.industries)?raw.industries.filter((x:any)=>typeof x==='string').slice(0,6):[],
    priority:Math.round(kr*.6+imp*.3+(confidence==='medium'?60:30)*.1),assessedAt:new Date().toISOString()};
}
export function readIntelligence(raw:any,evidence:string,context:{title?:string}={}):Intelligence|null {
  // v1 two-stage data remains readable while v2 assessments accumulate.
  if(![SELECTION_VERSION,'two-stage-20261027-v1'].includes(raw?.version))return null;
  try{return {...validateIntelligence(raw,evidence,clean(evidence).length>=80,context),version:raw.version,assessedAt:raw.assessedAt};}catch{return null;}
}
export function isImportant(a:Intelligence|null):boolean {return !!a&&a.importance>=THRESHOLDS.important;}
export function isFeatured(a:Intelligence|null):boolean {
  return isImportant(a)&&a!.korea>=THRESHOLDS.featured&&a!.confidence!=='low'&&!!a!.koreaEvidence;
}
export function isHot(a:Intelligence|null):boolean {return isFeatured(a)&&a!.korea>=THRESHOLDS.hot&&a!.importance>=THRESHOLDS.hotImportance;}
// Only unmistakable low-value formats are dropped before AI. Other languages go to AI.
export function obviousNoise(title:string):boolean {
  return /\b(?:horoscope|coupon codes?|daily crossword|wordle answer|fantasy football waiver|best betting picks)\b|今日运势|星座运势|彩票号码|오늘의 운세|로또 당첨번호/i.test(title);
}
