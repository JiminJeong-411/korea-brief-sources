import {classifyCoverage,contextKind,coverageLabel,type CoverageKind} from './event-coverage';

export const CLUSTER_VERSION='news-event-20261027-v3';
export const EVENT_WINDOW_MS=72*3600000;
export type EventFacts={subjects:string[];action:string;object:string;date:string;evidence?:string;kind?:CoverageKind};
export type EventMeta={version:string;id:string;anchorUrl:string;method:'single'|'url'|'title'|'sports'|'ai';checked:boolean;relation?:'same_event'|'context';coverageKind?:CoverageKind;facts?:EventFacts;matchEvidence?:{left:string;right:string};comparisons?:string[]};
export type ClusterArticle={id:any;url:string;title:string;originalTitle?:string;excerpt?:string;date:string;category?:string;event?:EventMeta|null;[key:string]:any};
const text=(v:unknown)=>String(v??'').normalize('NFKC').replace(/\s+/g,' ').trim();
const compact=(v:unknown)=>text(v).toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function articleUrl(v:unknown):string{
  try{const u=new URL(String(v));if(!['http:','https:'].includes(u.protocol))return '';u.hash='';u.hostname=u.hostname.replace(/^www\./,'');for(const k of [...u.searchParams.keys()])if(/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|spm$)/i.test(k))u.searchParams.delete(k);u.searchParams.sort();u.pathname=u.pathname.replace(/\/+$/,'')||'/';return u.toString();}catch{return '';}
}
export function readEvent(value:any):EventMeta|null{
  return [CLUSTER_VERSION,'news-event-20261027-v1','news-event-20261027-v2'].includes(value?.version)&&/^evt-[a-f0-9]{24}$/.test(value.id)&&articleUrl(value.anchorUrl)&&['single','url','title','sports','ai'].includes(value.method)&&typeof value.checked==='boolean'?{...value,facts:readEventFacts(value.facts)}:null;
}
export function readEventFacts(raw:any):EventFacts|undefined{
  if(!raw||!Array.isArray(raw.subjects)||typeof raw.action!=='string')return;
  const subjects=[...new Set<string>(raw.subjects.filter((x:any)=>typeof x==='string').map((x:string)=>text(x).toLowerCase()).filter((x:string)=>x.length>=2&&x.length<=100))].slice(0,5);
  const action=text(raw.action).toLowerCase(),object=text(raw.object).toLowerCase();
  if(!subjects.length||action.length<3||action.length>120||object.length>200)return;
  return {subjects,action,object,date:/^\d{4}-\d{2}-\d{2}$/.test(raw.date)?raw.date:'',evidence:text(raw.evidence).slice(0,240),kind:['report','result','live','background','commentary','correction','highlights','preview'].includes(raw.kind)?raw.kind:undefined};
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
export function deterministicMatch(a:ClusterArticle,b:ClusterArticle):'url'|'title'|null{
  if(articleUrl(a.url)&&articleUrl(a.url)===articleUrl(b.url))return 'url';
  if(!withinEventWindow(a,b)||stageConflict(a,b))return null;
  if(Math.abs(Date.parse(a.date)-Date.parse(b.date))>24*3600000)return null;
  const at=[a.title,a.originalTitle||''].filter(x=>compact(x).length>=12),bt=[b.title,b.originalTitle||''].filter(x=>compact(x).length>=12);
  if(at.some(x=>bt.some(y=>compact(x)===compact(y))))return 'title';
  // Near-identical wording only. Broader semantic links require a separate AI decision.
  if(a.category===b.category&&at.some(x=>bt.some(y=>compact(x).length>=20&&compact(y).length>=20&&numbers(x)===numbers(y)&&titleSimilarity(x,y)>=.92)))return 'title';
  return null;
}
export function candidateScore(a:ClusterArticle,b:ClusterArticle):number{
  if(Math.abs(Date.parse(a.date)-Date.parse(b.date))>EVENT_WINDOW_MS||!Number.isFinite(Date.parse(a.date))||!Number.isFinite(Date.parse(b.date))||stageConflict(a,b))return 0;
  const sim=Math.max(titleSimilarity(a.title,b.title),titleSimilarity(a.originalTitle||'',b.originalTitle||''));
  const af=a.event?.facts,bf=b.event?.facts;
  const overlap=!!af&&!!bf&&af.subjects.some(x=>bf.subjects.includes(x));
  // Facts nominate a pair; they never by themselves merge events.
  const objectSim=af&&bf?titleSimilarity(af.object,bf.object):0;
  return Math.max(sim,overlap?.45+objectSim*.2:0);
}
export function sourcePublisher(source:any):string{
  try{return new URL(source.url).hostname.toLowerCase().replace(/^(?:www\.|m\.)/,'');}catch{return '';}
}
export function mergeSourceLinks(sources:any[]):any[]{
  const map=new Map<string,any>();
  for(const s of sources){const url=articleUrl(s?.url);if(!url)continue;const key=url.replace(/^http:/,'https:');if(!map.has(key))map.set(key,{url,title:text(s.title),source:text(s.source)||sourcePublisher(s),published_at:s.published_at||null,content_kind:'rss_excerpt',publisher:sourcePublisher(s),coverage_kind:s.coverage_kind||classifyCoverage(text(s.title))});}
  return [...map.values()];
}
export function clusterPublicArticles(rows:ClusterArticle[]):ClusterArticle[]{
  const groups:ClusterArticle[][]=[];
  const parent:number[]=[];
  const root=(n:number):number=>parent[n]===n?n:(parent[n]=root(parent[n]));
  const index=new Map<string,Set<number>>();
  function keys(row:ClusterArticle):string[]{
    const titles=[row.title,row.originalTitle||''].filter(t=>compact(t).length>=12);
    return ['url:'+articleUrl(row.url),...(row.event?['event:'+row.event.id]:[]),
      ...titles.flatMap(t=>['title:'+compact(t),'near:'+row.category+':'+numbers(t)+':'+compact(t).slice(0,8)])];
  }
  for(const row of rows.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id),'en',{numeric:true}))){
    // Compare to the stable first member, not a chain of increasingly remote headlines.
    const rowKeys=keys(row),candidateIds=new Set(rowKeys.flatMap(k=>[...(index.get(k)||[])].map(root)));
    const matched=[...candidateIds].filter(id=>{
      const anchor=groups[id][0];
      return !!row.event&&groups[id].some(m=>m.event?.id===row.event!.id&&Math.abs(Date.parse(row.date)-Date.parse(m.date))<=EVENT_WINDOW_MS)||!!deterministicMatch(row,anchor);
    });
    let id:number;
    if(matched.length){
      id=Math.min(...matched);groups[id].push(row);
      for(const other of matched)if(other!==id){groups[id].push(...groups[other]);groups[other]=[];parent[other]=id;}
      groups[id].sort((a,b)=>String(a.id).localeCompare(String(b.id),'en',{numeric:true}));
    }else {id=groups.length;groups.push([row]);parent[id]=id;}
    // Register every verified ID alias, not just the first row's ID. This fixes split clusters.
    for(const key of rowKeys){const ids=index.get(key)||new Set<number>();ids.add(id);index.set(key,ids);}
  }
  const kindOf=(a:ClusterArticle):CoverageKind=>a.event?.coverageKind||a.event?.facts?.kind||classifyCoverage(a.originalTitle||a.title);
  return groups.filter(g=>g.length).map(members=>{
    // Keep score, summary, evidence and brief ID from ONE representative; never mix maxima.
    const resultRank=(a:ClusterArticle)=>a.event?.relation==='context'||contextKind(kindOf(a))?-1:0;
    const representative=members.slice().sort((a,b)=>resultRank(b)-resultRank(a)||Number(!!b.hasReport)-Number(!!a.hasReport)||(b.intelligence?.priority||0)-(a.intelligence?.priority||0)||String(a.id).localeCompare(String(b.id),'en',{numeric:true}))[0];
    const sources=mergeSourceLinks(members.flatMap(r=>r.sources||[{url:r.url,title:r.originalTitle||r.title,source:r.source,published_at:r.date,coverage_kind:kindOf(r)}])).map(s=>({...s,coverage_label:coverageLabel(s.coverage_kind)}));
    const contextCount=members.filter(m=>m.event?.relation==='context'||contextKind(kindOf(m))).length;
    const stableId=members.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id),'en',{numeric:true}))[0].id;
    const sourceCount=new Set(sources.map(sourcePublisher).filter(Boolean)).size;
    const dates=members.map(r=>r.date).filter(d=>Number.isFinite(Date.parse(d))).sort();
    const newest=members.find(r=>r.date===dates.at(-1))||representative;
    return {...representative,id:stableId,report_id:representative.id,event_id:members.find(m=>m.event)?.event?.id||'news-'+members[0].id,
      topics:[...new Set(members.flatMap(r=>r.topics||[]))],editorial_priority:Math.max(0,...members.map(r=>r.editorial_priority||0)),regions:[...new Set(members.flatMap(r=>r.regions||[]))],date:dates.at(-1)||representative.date,date_basis:newest.date_basis||'published',published_at:newest.published_at||null,collected_at:newest.collected_at||null,first_reported_at:dates[0]||'',
      sources,source_count:sourceCount,article_count:sources.length,member_count:members.length,
      related_coverage_count:contextCount,
      coverage_notes:contextCount?'包含同一事件的背景、评论或典礼实况；不把相关内容当作相同事实的独立证明。':'',
      cluster_method:members.length>1?(members.some(m=>m.event?.method==='ai')?'ai':'rules'):'single',
      search_text:members.map(r=>r.title+' '+r.summary).join(' ')};
  }).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
