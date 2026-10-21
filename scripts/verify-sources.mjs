import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {fetchFeed,validationRecord} from '../lib/research/feed-validation.mjs';
const argv=process.argv.slice(2),input=argv[0]||'lib/research/feeds.json',output=argv[1]||'outputs/source-verification.json';
const feeds=JSON.parse(readFileSync(input,'utf8')).filter(f=>f.ingest!=='reference'),results=[],queue=feeds.slice();
await Promise.all(Array.from({length:6},async()=>{for(;;){const f=queue.shift();if(!f)break;let check;try{check=validationRecord(await fetchFeed(f.url));}catch(e){check=validationRecord({status:e.http_status?'http_error':'network_error',http_status:e.http_status,error:e.message});}results.push({id:f.id,name:f.name,url:f.url,region:f.coverage_region||null,...check});console.log(f.id+' '+check.status+' recent='+check.recent+' usable='+check.usable);}}));
results.sort((a,b)=>feeds.findIndex(x=>x.id===a.id)-feeds.findIndex(x=>x.id===b.id));mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify({checked_at:new Date().toISOString(),environment:'Node fetch on verification host; not a production Worker test',results},null,2)+'\n');
console.log(JSON.stringify({output,total:results.length,parsed:results.filter(x=>x.status==='ok').length,recent:results.filter(x=>x.recent>0).length,usable:results.filter(x=>x.usable>0).length}));process.exit(0);
