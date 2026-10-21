import {audit,config,lock,now,save,setConfig} from './cloud';
import {configuredFeeds} from './feed-config';
import {fetchFeed,validationRecord} from './feed-validation.mjs';
export async function verifySources(ids:string[],actor:string){
 if(!Array.isArray(ids)||!ids.length||ids.length>12)throw Error('每次检测1—12个来源');
 const selected=(await configuredFeeds()).filter((f:any)=>ids.includes(f.id)&&f.ingest!=='reference');if(!selected.length)throw Error('没有可检测的RSS来源');
 const release=await lock('verify-sources'),jid=await save({type:'job',state:'running',title:'检测新闻信源',data:{started_at:now()}}),checks:any={};
 try{for(let i=0;i<selected.length;i+=4)await Promise.all(selected.slice(i,i+4).map(async(f:any)=>{try{const r=await fetchFeed(f.url);checks[f.id]={...validationRecord(r),source_url:f.url,at:now(),ok:r.status==='ok',count:r.recent,environment:'deployed-runtime'};}catch(e:any){checks[f.id]={...validationRecord({status:e.http_status?'http_error':'network_error',http_status:e.http_status,error:e.message}),source_url:f.url,at:now(),ok:false,count:0,environment:'deployed-runtime'};}}));
  await setConfig('feed_health',{...await config('feed_health',{}),...checks});
  const results=selected.map((f:any)=>({id:f.id,name:f.name,...checks[f.id]}));await save({id:jid,type:'job',state:'done',title:'信源检测完成 · '+results.filter(x=>x.ok).length+'/'+results.length+' 可解析',data:{results,logs:results.map(x=>x.name+'：'+x.status+'；近期 '+x.recent+'，可供AI '+x.usable)}});await audit('verify-sources',jid,actor);return {results};
 }catch(e:any){await save({id:jid,type:'job',state:'failed',title:'信源检测失败',data:{error:e.message}});throw e;}finally{await release();}
}
