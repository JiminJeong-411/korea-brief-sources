import {retry} from './network';
import type {CommunitySample,CommentSample} from './community';
const clean=(v:unknown)=>String(v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const count=(v:unknown)=>v!==undefined&&v!==null&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
async function youtubeJSON(endpoint:string,params:Record<string,string>){
 const key=process.env.YOUTUBE_API_KEY;if(!key)throw Object.assign(Error('尚未配置 YOUTUBE_API_KEY；已跳过YouTube，不影响其他信源'),{code:'NOT_CONFIGURED'});
 return retry(async()=>{
  const u=new URL('https://www.googleapis.com/youtube/v3/'+endpoint);u.search=new URLSearchParams({...params,key}).toString();
  const r=await fetch(u,{signal:AbortSignal.timeout(20000),cache:'no-store'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){const reason=String(data?.error?.errors?.[0]?.reason||'request_failed').replace(/[^a-zA-Z0-9_]/g,'').slice(0,60);throw Object.assign(Error(`YouTube HTTP ${r.status} (${reason})`),{status:r.status,reason});}
  if(!Array.isArray(data.items))throw Error('YouTube API返回格式异常');return data;
 });
}
export async function collectYouTube(source:any):Promise<CommunitySample[]>{
 const now=new Date().toISOString();
 const data=await youtubeJSON('videos',{part:'snippet,statistics',chart:'mostPopular',regionCode:'KR',maxResults:String(Math.min(50,source.max_items||20))});
 const samples:CommunitySample[]=data.items.filter((v:any)=>/^[A-Za-z0-9_-]{11}$/.test(v.id||'')).map((v:any,i:number)=>({
  id:i+1,title:clean(v.snippet?.title),url:'https://www.youtube.com/watch?v='+v.id,
  excerpt:clean(v.snippet?.description).slice(0,1000),publishedAt:Number.isFinite(Date.parse(v.snippet?.publishedAt))?new Date(v.snippet.publishedAt).toISOString():null,
  observedAt:now,views:count(v.statistics?.viewCount),comments:count(v.statistics?.commentCount),likes:count(v.statistics?.likeCount),
  heatBasis:'YouTube Data API mostPopular / regionCode=KR；播放、点赞和评论数为视频累计计数，不是过去24小时新增量',
  commentsSample:[],commentStatus:'not_sampled',samplingRegion:'KR',sampleKind:'video_description'
 }));
 const maxVideos=Math.min(5,Math.max(0,Number(source.comment_videos??5))),perVideo=Math.min(10,Math.max(1,Number(source.comments_per_video)||8));
 for(const sample of samples.slice(0,maxVideos)){
  const videoId=new URL(sample.url).searchParams.get('v')!;
  try{
   const comments=await youtubeJSON('commentThreads',{part:'snippet',videoId,order:'relevance',maxResults:String(perVideo),textFormat:'plainText'});
   sample.commentsSample=comments.items.flatMap((x:any,i:number)=>{
    const c=x?.snippet?.topLevelComment,excerpt=clean(c?.snippet?.textDisplay||c?.snippet?.textOriginal).slice(0,240);
    if(!c?.id||!excerpt)return [];
    const url=new URL(sample.url);url.searchParams.set('lc',String(c.id));
    return [{ref:`c${sample.id}-${i+1}`,url:url.toString(),excerpt,publishedAt:Number.isFinite(Date.parse(c.snippet?.publishedAt))?new Date(c.snippet.publishedAt).toISOString():null} satisfies CommentSample];
   });
   sample.commentStatus=sample.commentsSample?.length?'sampled':'no_public_comments';
  }catch(e:any){
   sample.commentStatus=e.reason==='commentsDisabled'?'disabled':e.reason==='quotaExceeded'?'quota_exceeded':'request_failed';
   console.warn(`YouTube评论抽样：视频 ${videoId} ${sample.commentStatus}；不编造缺失评论。`);
  }
 }
 return samples;
}
