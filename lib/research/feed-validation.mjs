import {parseFeed} from './domain.mjs';
export async function readFeedResponse(response,maxBytes=1000000){
 if(!response.ok)throw Object.assign(Error('HTTP '+response.status),{http_status:response.status});
 const reader=response.body?.getReader();if(!reader)throw Error('响应没有内容');const chunks=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw Error('订阅内容超过 '+maxBytes+' 字节上限');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}
 const head=new TextDecoder().decode(bytes.slice(0,512)),encoding=response.headers.get('content-type')?.match(/charset\s*=\s*["']?([^\s;"']+)/i)?.[1]||head.match(/encoding=["']([^"']+)/i)?.[1]||'utf-8';
 let text;try{text=new TextDecoder(encoding).decode(bytes);}catch{text=new TextDecoder().decode(bytes);}
 if((text.match(/\uFFFD/g)||[]).length>Math.max(20,text.length*.01))throw Error('订阅编码无法可靠解码');
 return {text,bytes:size,encoding};
}
export function inspectFeed(text,time=Date.now(),baseUrl=''){
 if(!/<(?:rss|(?:\w+:)?feed|rdf:RDF)\b/i.test(text))return {status:'not_feed',items:[],parsed:0,dated:0,recent:0,usable:0,latest_at:null};
 const items=parseFeed(text,baseUrl),dated=items.filter(x=>Number.isFinite(Date.parse(x.published_at))),recent=dated.filter(x=>Date.parse(x.published_at)>=time-7*86400000&&Date.parse(x.published_at)<=time+3600000),usable=recent.filter(x=>x.content.length>=80);
 return {status:items.length?'ok':'empty',items,parsed:items.length,dated:dated.length,recent:recent.length,usable:usable.length,latest_at:dated.map(x=>x.published_at).sort().at(-1)||null};
}
export async function fetchFeed(url,{timeout=10000,time=Date.now(),fetcher=fetch}={}){
 const response=await fetcher(url,{signal:AbortSignal.timeout(timeout),headers:{'User-Agent':'KoreaBrief RSS Reader/1.0','Accept':'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5'}});
 const body=await readFeedResponse(response),inspection=inspectFeed(body.text,time,response.url||url);
 return {...inspection,http_status:response.status,final_url:response.url||url,content_type:response.headers.get('content-type'),encoding:body.encoding,bytes:body.bytes};
}
export function validationRecord(result,at=new Date().toISOString()){return {checked_at:at,status:result.status,http_status:result.http_status||null,final_url:result.final_url||null,parsed:result.parsed||0,dated:result.dated||0,recent:result.recent||0,usable:result.usable||0,latest_at:result.latest_at||null,error:result.error||null};}
