export const SOURCE_CATALOG_REVISION='2026-10-22-sources-1';
export function mergeSourceCatalog(defaults,saved=[]){
 const custom=new Map(saved.map(f=>[f.id,f]));const result=defaults.map(base=>{
  const old=custom.get(base.id);if(!old)return {...base};custom.delete(base.id);
  const managed=old.url===base.url||base.previous_urls?.includes(old.url);
  if(!managed)return {...base,...old,validation:null,catalog_revision:null};
  const out={...base,...old,url:base.url,validation:base.validation,ingest:base.ingest||'rss',previous_urls:base.previous_urls,purpose:base.purpose,homepage:old.homepage||base.homepage,catalog_revision:base.catalog_revision,replaced_by:base.replaced_by};
  out.enabled=old.customized?old.enabled:old.enabled===false?false:base.enabled;
  if(out.ingest==='reference'||out.replaced_by)out.enabled=false;return out;
 });return [...result,...custom.values()];
}
export function activeSources(feeds){const seen=new Set();return feeds.filter(f=>{if(!f.enabled||f.ingest==='reference'||f.replaced_by)return false;let key;try{const u=new URL(f.url);u.hash='';u.searchParams.sort();key=u.toString();}catch{return false;}if(seen.has(key))return false;seen.add(key);return true;});}
export function sourceBatch(feeds,health={},limit=12){
 const due=activeSources(feeds).slice().sort((a,b)=>Date.parse(health[a.id]?.at||'1970-01-01')-Date.parse(health[b.id]?.at||'1970-01-01')||(a.priority||2)-(b.priority||2)||a.id.localeCompare(b.id));
 const chosen=[],ids=new Set(),hosts=new Set(),groups=[...new Set(due.map(f=>f.coverage_region||'global'))];
 function take(f){chosen.push(f);ids.add(f.id);hosts.add(new URL(f.url).hostname.replace(/^www\./,''));}
 for(const group of groups){const f=due.find(f=>(f.coverage_region||'global')===group&&!hosts.has(new URL(f.url).hostname.replace(/^www\./,'')));if(f&&chosen.length<limit)take(f);}
 for(const f of due)if(chosen.length<limit&&!ids.has(f.id)&&!hosts.has(new URL(f.url).hostname.replace(/^www\./,'')))take(f);
 for(const f of due)if(chosen.length<limit&&!ids.has(f.id))take(f);
 return chosen;
}
export function sourceStatusLabel(feed,health){if(feed.ingest==='reference')return '资料入口 · 不自动采集';if(health?.source_url===feed.url&&health?.source_url)return health.ok?`运行端可解析 · 近期 ${health.recent??health.count??0} 条`:'运行端最近读取未成功';if(feed.validation?.status==='ok')return feed.validation.recent?`目录检测可解析 · 待运行端验证`:'目录检测可解析 · 暂无近7日条目';return '待运行端检测';}
