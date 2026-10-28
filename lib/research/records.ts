// Extend the existing JSON envelope; no database migration or new connection.
export const COMPANY_VERSION='company-20261028-v1';
export const DAILY_VERSION='daily-20261028-v1';
export const companyURL=(stock:string)=>`https://korea-brief.local/company/${stock}`;
export const dailyURL=(day:string)=>`https://korea-brief.local/daily/${day}`;
export function recordSources(value:any):any[]{if(typeof value==='string'){try{value=JSON.parse(value);}catch{return [];}}return Array.isArray(value)?value.filter(x=>x&&typeof x==='object'):[];}
export function primaryRecord(row:any){const sources=recordSources(row?.cluster_urls);return sources.find(x=>x.url===row?.raw_url)||sources[0];}
export function isNewsRecord(row:any){const type=primaryRecord(row)?.content_type;return !type||type==='news';}
export function koreaDay(at=Date.now()){return new Date(at+9*3600000).toISOString().slice(0,10);}
export function dayWindow(day:string,now=Date.now()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('日期格式应为YYYY-MM-DD');
 const start=Date.parse(day+'T00:00:00+09:00');if(!Number.isFinite(start)||koreaDay(start)!==day)throw Error('日期无效');
 return {start,end:Math.min(start+86400000,now),complete:now>=start+86400000};
}
export const inWindow=(at:string|null|undefined,start:number,end:number)=>{const n=Date.parse(at||'');return Number.isFinite(n)&&n>=start&&n<end;};
export function relatedCompany(text:string,aliases:string[]){return aliases.some(a=>/^[\w\s.-]+$/.test(a)?new RegExp('(^|[^a-z0-9])'+a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z0-9]|$)','i').test(text):text.includes(a));}

export const TREND_URL='https://korea-brief.local/community/overview';
