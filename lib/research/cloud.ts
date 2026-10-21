import {DEFAULT_FOCUS} from './strategy-domain.mjs';
import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {canAdmin,TOPICS,publicProjection} from './domain.mjs';
export type RecordRow={id:string;type:string;state:string;title:string;topic:string;published_at:string|null;created_at:string;updated_at:string;data:any};
export const now=()=>new Date().toISOString();
export function db(){if(!env.DB)throw Error('云端数据库绑定不可用');return env.DB;}
export async function rows(sql:string,args:any[]=[]){const r=await db().prepare(sql).bind(...args).all();return r.results as any[];}
export async function run(sql:string,args:any[]=[]){return db().prepare(sql).bind(...args).run();}
export function decode(r:any):RecordRow{return {...r,data:JSON.parse(r.data)};}
export async function records(type:string,state?:string){return (await rows('SELECT * FROM kb_records WHERE type=?'+(state?' AND state=?':'')+' ORDER BY updated_at DESC',[type,...state?[state]:[]])).map(decode);}
export async function record(id:string){const r=await db().prepare('SELECT * FROM kb_records WHERE id=?').bind(id).first();return r?decode(r):null;}
export async function save(r:Partial<RecordRow>&{type:string;title:string;data:any}){const ts=now();const id=r.id||crypto.randomUUID();await run('INSERT INTO kb_records(id,type,state,title,topic,published_at,created_at,updated_at,data) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,title=excluded.title,topic=excluded.topic,published_at=excluded.published_at,updated_at=excluded.updated_at,data=excluded.data',[id,r.type,r.state||'private',r.title,r.topic||'',r.published_at||null,r.created_at||ts,ts,JSON.stringify(r.data)]);return id;}
export async function config(key:string,fallback:any=null){const r=await db().prepare('SELECT value FROM kb_config WHERE key=?').bind(key).first<{value:string}>();return r?JSON.parse(r.value):fallback;}
export async function setConfig(key:string,value:any){await run('INSERT INTO kb_config(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at',[key,JSON.stringify(value),now()]);}
export async function audit(action:string,id:string,actor:string){await run('INSERT INTO kb_audit(action,item_id,actor,at) VALUES(?,?,?,?)',[action,id,actor,now()]);}
export async function topics(){return config('topics',TOPICS);}
export async function identity(){const user=await getChatGPTUser();if(!user)return {user:null,isAdmin:false};const known=await rows('SELECT user_id FROM kb_admins WHERE user_id=?',[user.userId]);const owner=String((env as any).KB_ADMIN_EMAIL||'');const isAdmin=canAdmin(user,owner,known.map(x=>x.user_id));if(isAdmin&&!known.length)await run('INSERT OR IGNORE INTO kb_admins(user_id,email,role,created_at) VALUES(?,?,?,?)',[user.userId,user.email,'owner',now()]);return {user,isAdmin};}
export async function requireAdmin(){const x=await identity();if(!x.user)throw Object.assign(Error('请先登录管理员账号'),{status:401});if(!x.isAdmin)throw Object.assign(Error('此账号没有后台权限'),{status:403});return x.user;}
export async function focus(){return {...DEFAULT_FOCUS,...await config('focus',{})};}
export async function settings(){const e=env as any;const s=await config('settings',{});return {provider:'gemini',publish_summaries:true,gemini_model:'gemini-2.5-flash',deepseek_model:'deepseek-chat',gemini_key:e.GOOGLE_API_KEY||'',deepseek_key:e.DEEPSEEK_API_KEY||'',supabase_url:e.SUPABASE_URL||'',supabase_key:e.SUPABASE_KEY||'',...s};}
export async function maskedSettings(){const s=await settings();return {...s,gemini_key:'',deepseek_key:'',supabase_key:'',has_gemini:!!s.gemini_key,has_deepseek:!!s.deepseek_key,has_supabase:!!s.supabase_key};}
export async function lock(name:string){const token=crypto.randomUUID(),t=Date.now();const r=await db().prepare('INSERT INTO kb_locks(id,token,expires_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at WHERE kb_locks.expires_at<? RETURNING token').bind(name,token,t+180000,t).first<{token:string}>();if(!r)throw Error('已有同类任务执行中，请稍后再试');return async()=>{await run('DELETE FROM kb_locks WHERE id=? AND token=?',[name,token]);};}
export async function publicItems(type:string):Promise<any[]>{return (await records(type,'published')).map(publicProjection);}
export function response(data:any,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function errorResponse(e:any){return response({error:e.message||'请求失败'},e.status||400);}
