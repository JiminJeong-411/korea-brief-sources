import {createHash} from 'node:crypto';
import {requestJSON} from './ai';
import {articleUrl,candidateScore,CLUSTER_VERSION,deterministicMatch,readEvent,readEventFacts,stageConflict,withinEventWindow,type ClusterArticle,type EventMeta,type EventFacts} from './clustering';
export function singleEvent(url:string,facts?:EventFacts):EventMeta{
  return {version:CLUSTER_VERSION,id:'evt-'+createHash('sha256').update(articleUrl(url)).digest('hex').slice(0,24),anchorUrl:articleUrl(url),method:'single',checked:false,...facts?{facts}:{}};
}
const normalized=(s:string)=>s.replace(/\s+/g,' ').trim().toLowerCase();
export function validSameEvent(raw:any,a:ClusterArticle,b:ClusterArticle):boolean{
  const left=normalized((a.originalTitle||a.title)+' '+(a.excerpt||'')),right=normalized((b.originalTitle||b.title)+' '+(b.excerpt||''));
  const quoted=(q:any,s:string)=>typeof q==='string'&&q.trim().length>=8&&q.length<=240&&s.includes(normalized(q));
  return withinEventWindow(a,b)&&!stageConflict(a,b)&&raw?.same_event===true&&raw.confidence==='high'&&quoted(raw.left_quote,left)&&quoted(raw.right_quote,right);
}
export async function describeEvent(article:ClusterArticle):Promise<EventFacts|undefined>{
  const raw=await requestJSON(`只提取这篇新闻所述的具体事件，供去重候选检索，不做推测。subjects用稳定英文实体名（如 bank of korea, samsung electronics），action用具体英文动作及阶段（proposes tariff / enacts tariff / announces earnings），object写具体对象（协议/奖项/产品/政策），date仅明确事件日期YYYY-MM-DD，未知为空。不要把报道日期当事件日期。只输出JSON {"subjects":[],"action":"","object":"","date":""}。资料：${JSON.stringify({title:article.originalTitle||article.title,excerpt:(article.excerpt||'').slice(0,2000)})}`);
  return readEventFacts(raw);
}
export async function findMatchingEvent(article:ClusterArticle,pool:ClusterArticle[],budget:{remaining:number}):Promise<EventMeta>{
  const own=readEvent(article.event)||singleEvent(article.url,article.event?.facts);
  const anchors=pool.filter(x=>articleUrl(x.url)!==articleUrl(article.url)&&(!x.event||articleUrl(x.event.anchorUrl)===articleUrl(x.url))&&(!Number.isFinite(Number(article.id))||!Number.isFinite(Number(x.id))||Number(x.id)<Number(article.id)));
  for(const candidate of anchors){const method=deterministicMatch(article,candidate);if(method){const base=readEvent(candidate.event)||singleEvent(candidate.url);return {...own,id:base.id,anchorUrl:base.anchorUrl,method,checked:true};}}
  const candidates=anchors.map(x=>({x,score:candidateScore(article,x)})).filter(x=>x.score>=.28).sort((a,b)=>b.score-a.score||String(a.x.id).localeCompare(String(b.x.id),'en',{numeric:true}));
  let complete=true;
  for(const {x} of candidates.slice(0,3)){
    if(budget.remaining<=0){complete=false;break;}budget.remaining--;
    const raw=await requestJSON(`判断两篇报道是否讲同一个具体新闻事件，而不是同一主题。同一主体+同一动作/阶段+同一对象+相容的事件时间才能合并。换语言/换标题/同事件补充细节可合并；提案与通过、传闻与确认、调查与裁决、签约与履行、不同日期数据/季度财报/产品/奖项或男女奖项、比赛预告与结果、后续回应/影响分析和原始发布分开。无法确定时same_event=false。不可仅因为同属韩国/芯片/同一公司就合并。只输出JSON {"same_event":false,"confidence":"low|high","left_quote":"左文逐字证据8–240字符","right_quote":"右文逐字证据8–240字符"}。两段引文必须各自具体描述同一事件，不得生成译文作为引文。资料：${JSON.stringify({left:{title:article.originalTitle||article.title,excerpt:(article.excerpt||'').slice(0,1800),published_at:article.date},right:{title:x.originalTitle||x.title,excerpt:(x.excerpt||'').slice(0,1800),published_at:x.date}})}`);
    if(validSameEvent(raw,article,x)){const base=readEvent(x.event)||singleEvent(x.url);return {...own,id:base.id,anchorUrl:base.anchorUrl,method:'ai',checked:true,matchEvidence:{left:raw.left_quote,right:raw.right_quote}};}
  }
  // At most three likely candidates per item; later runs can revisit budget-deferred items.
  return {...own,checked:complete};
}
