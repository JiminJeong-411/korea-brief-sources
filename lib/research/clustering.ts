import {sportsEventKey} from './sports';

export const CLUSTER_VERSION='news-event-20261027-v1';
export const EVENT_WINDOW_MS=72*3600000;
export type EventFacts={subjects:string[];action:string;object:string;date:string};
export type EventMeta={version:string;id:string;anchorUrl:string;method:'single'|'url'|'title'|'sports'|'ai';checked:boolean;facts?:EventFacts;matchEvidence?:{left:string;right:string}};
export type ClusterArticle={id:any;url:string;title:string;originalTitle?:string;excerpt?:string;date:string;category?:string;event?:EventMeta|null;[key:string]:any};
const text=(v:unknown)=>String(v??'').normalize('NFKC').replace(/\s+/g,' ').trim();
const compact=(v:unknown)=>text(v).toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function articleUrl(v:unknown):string{
  try{const u=new URL(String(v));if(!['http:','https:'].includes(u.protocol))return '';u.hash='';u.hostname=u.hostname.replace(/^www\./,'');for(const k of [...u.searchParams.keys()])if(/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|spm$)/i.test(k))u.searchParams.delete(k);u.searchParams.sort();u.pathname=u.pathname.replace(/\/+$/,'')||'/';return u.toString();}catch{return '';}
}
export function readEvent(value:any):EventMeta|null{
  return value?.version===CLUSTER_VERSION&&/^evt-[a-f0-9]{24}$/.test(value.id)&&articleUrl(value.anchorUrl)&&['single','url','title','sports','ai'].includes(value.method)&&typeof value.checked==='boolean'?{...value,facts:readEventFacts(value.facts)}:null;
}
export function readEventFacts(raw:any):EventFacts|undefined{
  if(!raw||!Array.isArray(raw.subjects)||typeof raw.action!=='string')return;
  const subjects=[...new Set<string>(raw.subjects.filter((x:any)=>typeof x==='string').map((x:string)=>text(x).toLowerCase()).filter((x:string)=>x.length>=2&&x.length<=100))].slice(0,5);
  const action=text(raw.action).toLowerCase(),object=text(raw.object).toLowerCase();
  if(!subjects.length||action.length<3||action.length>120||object.length>200)return;
  return {subjects,action,object,date:/^\d{4}-\d{2}-\d{2}$/.test(raw.date)?raw.date:''};
}
export function withinEventWindow(a:ClusterArticle,b:ClusterArticle):boolean{
  const ad=a.event?.facts?.date,bd=b.event?.facts?.date;if(ad&&bd&&ad!==bd)return false;
  const x=Date.parse(a.date),y=Date.parse(b.date);return Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x-y)<=EVENT_WINDOW_MS;
}
function grams(s:string):Set<string>{const c=compact(s),set=new Set<string>();for(let i=0;i<c.length-1;i++)set.add(c.slice(i,i+2));return set;}
export function titleSimilarity(a:string,b:string):number{
  const x=grams(a),y=grams(b);if(!x.size||!y.size)return 0;let n=0;for(const k of x)if(y.has(k))n++;return 2*n/(x.size+y.size);
}
function numbers(s:string):string{return [...new Set(text(s).match(/\d+(?:[.,]\d+)?%?/g)||[])].sort().join('|');}
export function stageConflict(a:ClusterArticle,b:ClusterArticle):boolean{
  const left=text(a.title+' '+(a.originalTitle||'')),right=text(b.title+' '+(b.originalTitle||''));
  const stages=[[/预测|有望|拟议|计划|传闻|或将|预计|\b(?:predict\w*|rumou?rs?|plans? to|propos\w*|could|may win|odds|nomine\w*)\b/i,/正式|获奖|赢得|夺冠|通过|批准|宣布完成|\b(?:wins?|won|awarded|approved|completed|enacted)\b/i],
    [/否认|驳回|拒绝|\b(?:denies|denied|reject\w*)\b/i,/确认|批准|达成|\b(?:confirms?|confirmed|approved|agreed)\b/i],
    [/女子|女足|여자|\b(?:women|woman|female)\b/i,/男子|男足|남자|\b(?:men|man|male)\b/i]];
  return stages.some(([x,y])=>(x.test(left)&&y.test(right)&&!x.test(right))||(x.test(right)&&y.test(left)&&!x.test(left)));
}
export function deterministicMatch(a:ClusterArticle,b:ClusterArticle):'url'|'title'|'sports'|null{
  if(articleUrl(a.url)&&articleUrl(a.url)===articleUrl(b.url))return 'url';
  if(!withinEventWindow(a,b)||stageConflict(a,b))return null;
  const sa=sportsEventKey(a.originalTitle||a.title,a.excerpt||'',a.date),sb=sportsEventKey(b.originalTitle||b.title,b.excerpt||'',b.date);
  if(sa&&sa===sb&&Math.abs(Date.parse(a.date)-Date.parse(b.date))<=48*3600000)return 'sports';
  if(Math.abs(Date.parse(a.date)-Date.parse(b.date))>24*3600000)return null;
  const at=[a.title,a.originalTitle||''].filter(x=>compact(x).length>=12),bt=[b.title,b.originalTitle||''].filter(x=>compact(x).length>=12);
  if(at.some(x=>bt.some(y=>compact(x)===compact(y))))return 'title';
  // Near-identical wording only. Broader semantic links require a separate AI decision.
  if(a.category===b.category&&at.some(x=>bt.some(y=>compact(x).length>=20&&compact(y).length>=20&&numbers(x)===numbers(y)&&titleSimilarity(x,y)>=.92)))return 'title';
  return null;
}
export function candidateScore(a:ClusterArticle,b:ClusterArticle):number{
  if(!withinEventWindow(a,b)||stageConflict(a,b))return 0;
  const sim=Math.max(titleSimilarity(a.title,b.title),titleSimilarity(a.originalTitle||'',b.originalTitle||''));
  const af=a.event?.facts,bf=b.event?.facts;
  const overlap=!!af&&!!bf&&af.subjects.some(x=>bf.subjects.includes(x));
  // Facts nominate a pair; they never by themselves merge events.
  return Math.max(sim,overlap?.45:0);
}
export function sourcePublisher(source:any):string{
  try{return new URL(source.url).hostname.toLowerCase().replace(/^(?:www\.|m\.)/,'');}catch{return '';}
}
export function mergeSourceLinks(sources:any[]):any[]{
  const map=new Map<string,any>();
  for(const s of sources){const url=articleUrl(s?.url);if(!url)continue;const key=url.replace(/^http:/,'https:');if(!map.has(key))map.set(key,{url,title:text(s.title),source:text(s.source)||sourcePublisher(s),published_at:s.published_at||null,content_kind:'rss_excerpt',publisher:sourcePublisher(s)});}
  return [...map.values()];
}
export function clusterPublicArticles(rows:ClusterArticle[]):ClusterArticle[]{
  const groups:ClusterArticle[][]=[];
  const index=new Map<string,Set<number>>();
  function keys(row:ClusterArticle):string[]{
    const titles=[row.title,row.originalTitle||''].filter(t=>compact(t).length>=12);
    const sports=sportsEventKey(row.originalTitle||row.title,row.excerpt||'',row.date);
    return ['url:'+articleUrl(row.url),...(row.event?['event:'+row.event.id]:[]),...(sports?['sports:'+sports]:[]),
      ...titles.flatMap(t=>['title:'+compact(t),'near:'+row.category+':'+numbers(t)+':'+compact(t).slice(0,8)])];
  }
  for(const row of rows.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id),'en',{numeric:true}))){
    // Compare to the stable first member, not a chain of increasingly remote headlines.
    const rowKeys=keys(row),candidateIds=new Set(rowKeys.flatMap(k=>[...(index.get(k)||[])]));
    const groupId=[...candidateIds].find(id=>{
      const anchor=groups[id][0];
      return (row.event&&anchor.event&&row.event.id===anchor.event.id&&withinEventWindow(row,anchor))||!!deterministicMatch(row,anchor);
    });
    if(groupId!==undefined)groups[groupId].push(row);
    else {const id=groups.length;groups.push([row]);for(const key of rowKeys){const ids=index.get(key)||new Set<number>();ids.add(id);index.set(key,ids);}}
  }
  return groups.map(members=>{
    // Keep score, summary, evidence and brief ID from ONE representative; never mix maxima.
    const representative=members.slice().sort((a,b)=>Number(!!b.hasReport)-Number(!!a.hasReport)||(b.intelligence?.priority||0)-(a.intelligence?.priority||0)||String(a.id).localeCompare(String(b.id),'en',{numeric:true}))[0];
    const sources=mergeSourceLinks(members.flatMap(r=>r.sources||[{url:r.url,title:r.originalTitle||r.title,source:r.source,published_at:r.date}]));
    const sourceCount=new Set(sources.map(sourcePublisher).filter(Boolean)).size;
    const dates=members.map(r=>r.date).filter(d=>Number.isFinite(Date.parse(d))).sort();
    return {...representative,id:members[0].id,report_id:representative.id,event_id:members.find(m=>m.event)?.event?.id||'news-'+members[0].id,
      regions:[...new Set(members.flatMap(r=>r.regions||[]))],date:dates.at(-1)||representative.date,first_reported_at:dates[0]||'',
      sources,source_count:sourceCount,article_count:sources.length,member_count:members.length,
      cluster_method:members.length>1?(members.some(m=>m.event?.method==='ai')?'ai':'rules'):'single',
      search_text:members.map(r=>r.title+' '+r.summary).join(' ')};
  }).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
