import {majorSportsMilestone,keepSportsNews} from './sports';
type Batch={feed:any;items:any[]};
export function chooseCandidates(feed:any,items:any[],now=Date.now()):any[]{
 const sports=/体育|sports/i.test(String(feed.category));
 const valid=items.slice(0,200).filter(item=>{
   const t=String(item.title||''),body=String(item.contentSnippet||item.summary||item.content||'');
   const time=Date.parse(item.isoDate||item.pubDate||'');
   if(Number.isFinite(time)&&(time<now-30*86400000||time>now+3600000))return false;
   return !!t&&(!sports||keepSportsNews('sports',t,body));
 });
 // Known major results are scanned throughout the feed before any per-source quota.
 valid.sort((a,b)=>Number(!!majorSportsMilestone(String(b.title),String(b.contentSnippet||b.summary||'')))-Number(!!majorSportsMilestone(String(a.title),String(a.contentSnippet||a.summary||''))));
 return valid.slice(0,Math.max(1,Math.min(60,Number(feed.max_items)||12)));
}
export function fairCandidateQueue(batches:Batch[]):{feed:any;item:any}[]{
 const priority:{feed:any;item:any}[]=[],rest:Batch[]=batches.map(({feed,items})=>({feed,items:items.filter(item=>{
   if(majorSportsMilestone(String(item.title||''),String(item.contentSnippet||item.summary||''))){priority.push({feed,item});return false;}return true;
 })}));
 const queue=priority.slice();
 for(let i=0;i<Math.max(0,...rest.map(b=>b.items.length));i++)for(const batch of rest)if(batch.items[i])queue.push({feed:batch.feed,item:batch.items[i]});
 return queue;
}
