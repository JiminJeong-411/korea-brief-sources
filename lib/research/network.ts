export function describeError(error:any,stage:string):string {
  const code=String(error?.cause?.code||error?.code||'');
  if(error?.name==='TimeoutError'||error?.name==='AbortError'||code==='23'||/TIMEOUT|ETIMEDOUT/.test(code))return `${stage}：连接或响应超时，已写入数据不受影响`;
  if(/ENOTFOUND|EAI_AGAIN/.test(code))return `${stage}：目标主机 DNS 解析失败`;
  if(code==='28P01')return `${stage}：PostgreSQL 认证失败`;
  return `${stage}：${String(error?.message||error?.cause?.message||code||'未知错误').replace(/postgres(?:ql)?:\/\/\S+/gi,'[数据库地址]').replace(/(?:sb_secret_|sk-)[A-Za-z0-9_-]+/g,'[密钥]').slice(0,220)}`;
}
export async function retry<T>(task:()=>Promise<T>,attempts=3):Promise<T>{
  for(let i=0;;i++){
    try{return await task();}catch(e:any){
      const status=e?.status,code=String(e?.cause?.code||e?.code||'');
      const transient=[429,500,502,503,504].includes(status)||/TIMEOUT|ETIMEDOUT|ECONNRESET|EAI_AGAIN|UND_ERR_SOCKET/.test(code)||['TimeoutError','AbortError'].includes(e?.name)||e?.message==='fetch failed';
      if(!transient||i>=attempts-1)throw e;
      await new Promise(r=>setTimeout(r,Math.min(4000,800*2**i)));
    }
  }
}
export async function fetchText(url:string,timeout=20000):Promise<string>{
  return retry(async()=>{
    const r=await fetch(url,{headers:{'User-Agent':'KoreaBrief/1.0 (public news and community research)','Accept':'application/atom+xml,application/rss+xml,text/html;q=0.8,*/*;q=0.5'},signal:AbortSignal.timeout(timeout),cache:'no-store'});
    if(!r.ok)throw Object.assign(Error(`HTTP ${r.status} (${new URL(url).hostname})`),{status:r.status});
    const text=await r.text();if(text.length>2500000)throw Error('来源响应过大');return text;
  });
}
