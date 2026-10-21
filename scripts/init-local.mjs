import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
if(!existsSync('dist/server/wrangler.json'))throw Error('Run npm run build before initializing the local database.');
const base=['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state'];
function command(args,json=false){const r=spawnSync(process.execPath,[...base,...args,...json?['--json']:[]],{encoding:'utf8',maxBuffer:4*1024*1024});if(r.status!==0)throw Error((r.stderr||r.stdout||'Local database command failed').trim());if(!json){process.stdout.write(r.stdout);return;}const m=r.stdout.match(/^\s*\[\s*\{/m);if(!m)throw Error('Could not read local database response.');return JSON.parse(r.stdout.slice(m.index));}
const response=command(['--command',"SELECT name FROM sqlite_master WHERE type='table'"],true),names=new Set(response.flatMap(x=>(x.results||[]).map(r=>r.name)));
const baseTables=['kb_records','kb_config','kb_admins','kb_audit','kb_locks'];
if(baseTables.some(x=>names.has(x))&&!baseTables.every(x=>names.has(x)))throw Error('A partial schema exists. Restore the local database before retrying; no tables were deleted.');
if(!names.has('kb_records'))command(['--file','drizzle/0000_real_ego.sql']);
if(!names.has('kb_favorites'))command(['--file','drizzle/0001_plain_kitty_pryde.sql']);
console.log('Local schema ready. Existing articles and settings are retained.');
