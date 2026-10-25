import {prepareNews} from './content-policy.mjs';
const TABLES=['news','english_hot_news','korea_hot_news'];
export async function readRestTable(table,{url,key,fetcher=fetch,maxRows=2000,pageSize=200}={}){
 if(!TABLES.includes(table))throw Error('Unknown news table');
 const records=[];let cursor=null;
 while(records.length<maxRows){
  const limit=Math.min(pageSize,maxRows-records.length),endpoint=new URL(url.replace(/\/+$/,'')+'/rest/v1/'+table);
  endpoint.searchParams.set('select','*');endpoint.searchParams.set('order','id.desc');endpoint.searchParams.set('limit',String(limit));if(cursor!==null)endpoint.searchParams.set('id','lt.'+cursor);
  const res=await fetcher(endpoint.toString(),{headers:{apikey:key,Authorization:'Bearer '+key,Accept:'application/json'},signal:AbortSignal.timeout(10000),cache:'no-store'});
  if(res.status===404)return {records:[],status:'missing',truncated:false};
  if(!res.ok)throw Error(table+' 读取失败（HTTP '+res.status+'）');
  const batch=await res.json();if(!Array.isArray(batch))throw Error(table+' 响应不是新闻数组');
  records.push(...batch);if(batch.length<limit)return {records,status:'ok',truncated:false};
  const next=batch.at(-1)?.id;if(next===undefined||next===null||String(next)===String(cursor))throw Error(table+' 缺少稳定分页ID');cursor=next;
 }
 return {records,status:'ok',truncated:true};
}
async function postgresReader(connectionString,maxRows){
 const {Pool}=await import('pg');const pool=new Pool({connectionString,max:1,connectionTimeoutMillis:8000,statement_timeout:10000});
 try{return (await pool.query('SELECT * FROM news ORDER BY id DESC LIMIT $1',[maxRows])).rows;}finally{await pool.end();}
}
export async function loadNews({env=process.env,fetcher=fetch,pgReader=postgresReader,maxRows=2000}={}){
 const url=env.SUPABASE_URL||env.NEXT_PUBLIC_SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const rows=[],statuses=[];
 if(url&&key){const results=await Promise.allSettled(TABLES.map(table=>readRestTable(table,{url,key,fetcher,maxRows})));
  results.forEach((r,i)=>{const table=TABLES[i];if(r.status==='fulfilled'){rows.push(...r.value.records.map(row=>({row,table})));statuses.push({table,status:r.value.status,rows:r.value.records.length,truncated:r.value.truncated});}else statuses.push({table,status:'error',error:r.reason.message});});
 }
 if(env.DATABASE_URL&&!statuses.some(s=>s.table==='news'&&s.status==='ok')){
  try{const records=await pgReader(env.DATABASE_URL,maxRows);rows.push(...records.map(row=>({row,table:'news'})));statuses.push({table:'news',status:'ok',rows:records.length,truncated:records.length>=maxRows,transport:'postgres'});}catch{statuses.push({table:'news',status:'error',error:'PostgreSQL 新闻读取失败'});}
 }
 if(!url&&!env.DATABASE_URL)throw Error('未配置新闻数据库连接');
 if(!statuses.some(s=>s.status==='ok'))throw Error('新闻数据库读取失败，请检查连接、表名和读取权限');
 return {...prepareNews(rows),source_status:statuses,truncated:statuses.some(s=>s.truncated)};
}
let cached=null,pending=null;
export function clearNewsCache(){cached=null;}
export async function currentNews(){if(cached&&Date.now()-cached.at<60000)return cached.data;if(pending)return pending;pending=loadNews().then(data=>{cached={at:Date.now(),data};return data;}).finally(()=>{pending=null;});return pending;}
