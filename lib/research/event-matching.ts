import {createHash} from 'node:crypto';
import {requestJSON} from './ai';
import {classifyCoverage,contextKind,type CoverageKind} from './event-coverage';
import {articleUrl,candidateScore,CLUSTER_VERSION,deterministicMatch,readEvent,readEventFacts,stageConflict,type ClusterArticle,type EventMeta,type EventFacts} from './clustering';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex').slice(0,24);
export function singleEvent(url:string,facts?:EventFacts):EventMeta{
 return {version:CLUSTER_VERSION,id:'evt-'+digest(articleUrl(url)),anchorUrl:articleUrl(url),method:'single',checked:false,...facts?{facts}:{}};
}
const normalized=(s:string)=>s.replace(/\s+/g,' ').trim().toLowerCase();
const original=(a:ClusterArticle)=>(a.originalTitle||a.title)+' '+(a.excerpt||'');
function evidenceOK(raw:any,a:ClusterArticle,b:ClusterArticle):boolean{
 const quoted=(q:any,s:string)=>typeof q==='string'&&q.trim().length>=8&&q.length<=240&&normalized(s).includes(normalized(q));
 const dates=[a.event?.facts?.date,b.event?.facts?.date];
 return Math.abs(Date.parse(a.date)-Date.parse(b.date))<=72*3600000&&raw?.confidence==='high'&&quoted(raw.left_quote,original(a))&&quoted(raw.right_quote,original(b))&&(!(dates[0]&&dates[1]&&dates[0]!==dates[1])||raw.date_compatible===true);
}
export function validSameEvent(raw:any,a:ClusterArticle,b:ClusterArticle):boolean{
 return evidenceOK(raw,a,b)&&!stageConflict(a,b)&&(raw?.relation==='same_event'||raw?.same_event===true);
}
export async function describeEvent(article:ClusterArticle):Promise<EventFacts|undefined>{
 const raw=await requestJSON(`提取这篇新闻的具体事件要素，不做推测。适用于政治经济社会娱乐科技体育所有分类。subjects用稳定英文实体名数组，action用动作及阶段的英文短语（提案/批准/调查/裁决必须区分），object写具体政策、交易、产品、比赛、奖项类别或数据期等，date只填明确事件日期YYYY-MM-DD，否则空字符串；kind是report/result/live/background/commentary/correction/highlights/preview，evidence是描述该事件的逐字原文8–240字符。不能用本次抓取日期或AI分析当事件证据。JSON {"subjects":[],"action":"","object":"","date":"","kind":"report","evidence":""}。资料：${JSON.stringify({title:article.originalTitle||article.title,excerpt:(article.excerpt||'').slice(0,2400)})}`);
 const facts=readEventFacts(raw);
 if(facts&&(!facts.evidence||facts.evidence.length<8||!normalized(original(article)).includes(normalized(facts.evidence))))delete facts.evidence;
 return facts;
}
export async function findMatchingEvent(article:ClusterArticle,pool:ClusterArticle[],budget:{remaining:number}):Promise<EventMeta>{
 const previous=readEvent(article.event);
 const own=previous?.version===CLUSTER_VERSION?previous:singleEvent(article.url,previous?.facts||article.event?.facts);
 const baseEvent=(a:ClusterArticle)=>readEvent(a.event)?.version===CLUSTER_VERSION?readEvent(a.event)!:singleEvent(a.url,a.event?.facts);
 const kind=own.facts?.kind||classifyCoverage(article.originalTitle||article.title);
 // One representative per known event; prefer a factual report over older context. Any category may match any category.
 const events=new Map<string,ClusterArticle>();
 for(const x of pool){
  if(articleUrl(x.url)===articleUrl(article.url)||Math.abs(Date.parse(x.date)-Date.parse(article.date))>72*3600000||!Number.isFinite(Date.parse(x.date)))continue;
  if(Number.isFinite(Number(article.id))&&Number.isFinite(Number(x.id))&&Number(x.id)>=Number(article.id)&&!(readEvent(x.event)?.checked&&x.event?.version===CLUSTER_VERSION))continue;
  const key=readEvent(x.event)?.id||articleUrl(x.url),old=events.get(key);
  const context=(a:ClusterArticle)=>Number(a.event?.relation==='context'||contextKind(a.event?.coverageKind||a.event?.facts?.kind||classifyCoverage(a.originalTitle||a.title)));
  if(!old||context(x)<context(old)||context(x)===context(old)&&candidateScore(article,x)>candidateScore(article,old))events.set(key,x);
 }
 const anchors=[...events.values()];
 for(const x of anchors){const method=deterministicMatch(article,x);if(method){const base=baseEvent(x);return {...own,id:base.id,anchorUrl:base.anchorUrl,method,checked:true,relation:contextKind(kind)?'context':'same_event',coverageKind:kind};}}
 const candidates=anchors.map(x=>({x,score:candidateScore(article,x)})).filter(x=>x.score>=.23).sort((a,b)=>b.score-a.score||String(a.x.id).localeCompare(String(b.x.id),'en',{numeric:true})).slice(0,32);
 const compared=new Set<string>((own as any).comparisons||[]);
 const pairKey=(x:ClusterArticle)=>digest(original(article)+'\n'+original(x)+'\n'+x.date);
 const pending=candidates.filter(({x})=>!compared.has(pairKey(x)));
 let processed=0;
 for(const {x} of pending){
  if(budget.remaining<=0||processed>=8)break;budget.remaining--;processed++;
  const raw=await requestJSON(`你负责全类别新闻的事件聚合。比较左文和右文，不能只因同一主体或主题合并。核对主体、具体动作、对象/类别/产品/数据期、事件时间与阶段。relation只能是same_event（同一发生事实的不同报道）、left_context（左文仅解释/回顾右事件）、right_context（右文仅解释/回顾左事件）、new_development（同主题但有独立新进展）、unrelated。同一事件的背景比较、评论、实时综述和视频回顾可作为context；提案与通过、不同产品/季度、不同奖项类别、预测与已发生结果、调查与裁决不能认作same_event。综合稿谈多个事件时，只有一件事为主要内容且有明确引文才能关联，不可把独立事件桥接成一个。不能确认就unrelated。时间冲突需核对是否是时区或转述日期差异，date_compatible仅在有证据说明同一事件时true。JSON {"relation":"unrelated","confidence":"low|high","coverage_kind":"report|result|live|background|commentary|correction|highlights|preview","date_compatible":false,"left_quote":"左文逐字事件证据8–240字符","right_quote":"右文逐字事件证据8–240字符"}。资料：${JSON.stringify({left:{title:article.originalTitle||article.title,excerpt:(article.excerpt||'').slice(0,2200),published_at:article.date,facts:own.facts},right:{title:x.originalTitle||x.title,excerpt:(x.excerpt||'').slice(0,2200),published_at:x.date,facts:x.event?.facts}})}`);
  const relation=raw?.relation;
  const same=validSameEvent(raw,article,x);
  const related=['left_context','right_context'].includes(relation)&&evidenceOK(raw,article,x)&&!stageConflict(article,x);
  compared.add(pairKey(x));
  if(same||related){
   const base=baseEvent(x);
   const allowed=['report','result','live','background','commentary','correction','highlights','preview'];
   const selectedKind:CoverageKind=allowed.includes(raw.coverage_kind)?raw.coverage_kind:kind;
   return {...own,id:base.id,anchorUrl:base.anchorUrl,method:'ai',checked:true,relation:relation==='left_context'?'context':'same_event',coverageKind:selectedKind,matchEvidence:{left:raw.left_quote,right:raw.right_quote},comparisons:[...compared].slice(-32)};
  }
 }
 return {...own,coverageKind:kind,relation:contextKind(kind)?'context':'same_event',checked:processed===pending.length,comparisons:[...compared].slice(-32)};
}
