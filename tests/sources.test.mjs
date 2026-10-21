import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseFeed} from '../lib/research/domain.mjs';
import {inspectFeed,readFeedResponse,fetchFeed} from '../lib/research/feed-validation.mjs';
import {activeSources,sourceBatch,mergeSourceCatalog,sourceStatusLabel} from '../lib/research/source-policy.mjs';
const time=Date.parse('2026-10-21T20:00:00Z');
const item=(link,date='Wed, 21 Oct 2026 10:00:00 GMT',body='Actual source excerpt with enough text for a news analysis. '.repeat(3))=>`<item><title>Real title</title>${link}<description><![CDATA[${body}]]></description><pubDate>${date}</pubDate></item>`;
test('RSS uses article links despite Atom self links; missing links are never fabricated',()=>{
 const xml='<rss><channel>'+item('<atom:link href="https://example.com/feed" rel="self"/><link>/article?a=1&amp;b=2</link>')+item('')+'</channel></rss>';
 const xs=parseFeed(xml,'https://example.com/rss');assert.equal(xs.length,1);assert.equal(xs[0].url,'https://example.com/article?a=1&b=2');assert.ok(xs[0].content.length>80);
});
test('Atom selects alternate article over self link and handles namespaced fields',()=>{
 const xml='<atom:feed xmlns:atom="http://www.w3.org/2005/Atom"><atom:entry><atom:title>Policy update</atom:title><atom:link rel="self" href="https://example.com/api/1"/><atom:link rel="alternate" href="/story"/><atom:updated>2026-10-21T10:00:00Z</atom:updated><atom:summary>Actual summary</atom:summary></atom:entry></atom:feed>';
 const r=inspectFeed(xml,time,'https://example.com/feed');assert.equal(r.status,'ok');assert.equal(r.items[0].url,'https://example.com/story');assert.equal(r.recent,1);assert.equal(r.usable,0);
});
test('feed inspection rejects HTML, distinguishes empty feeds, undated, stale, future and usable items',()=>{
 assert.equal(inspectFeed('<html>RSS unavailable</html>',time).status,'not_feed');assert.equal(inspectFeed('<rss><channel/></rss>',time).status,'empty');
 const xml='<rss><channel>'+item('<link>https://x.org/a</link>')+item('<link>https://x.org/b</link>','2020-01-01')+item('<link>https://x.org/c</link>','2030-01-01')+item('<link>https://x.org/d</link>','unknown')+'</channel></rss>';
 const r=inspectFeed(xml,time);assert.equal(r.parsed,4);assert.equal(r.dated,3);assert.equal(r.recent,1);assert.equal(r.usable,1);
});
test('bounded reader handles declared legacy charset and HTTP failures',async()=>{
 const bytes=Uint8Array.from([60,114,115,115,62,233,60,47,114,115,115,62]);const r=await readFeedResponse(new Response(bytes,{headers:{'content-type':'application/xml; charset=windows-1252'}}));assert.ok(r.text.includes('é'));
 await assert.rejects(readFeedResponse(new Response('a'.repeat(20)),10),/超过/);await assert.rejects(readFeedResponse(new Response('missing',{status:404})),/HTTP 404/);
});
test('fetch verification records actual HTTP metadata and resolves relative links',async()=>{
 const r=await fetchFeed('https://example.com/feed',{time,fetcher:async()=>new Response('<rss>'+item('<link>/story</link>')+'</rss>',{headers:{'content-type':'application/rss+xml'}})});
 assert.equal(r.http_status,200);assert.equal(r.items[0].url,'https://example.com/story');assert.equal(r.usable,1);
});
const f=(id,group,host=id)=>({id,name:id,url:`https://${host}.org/feed`,enabled:true,coverage_region:group});
test('catalog repairs managed URLs while preserving administrator changes and disabled switches',()=>{
 const defaults=[{...f('old','europe'),url:'https://fixed.org/feed',previous_urls:['https://old.org/feed'],validation:{status:'ok'}}];
 assert.equal(mergeSourceCatalog(defaults,[f('old','europe')])[0].url,defaults[0].url);
 assert.equal(mergeSourceCatalog(defaults,[{...f('old','europe'),enabled:false}])[0].enabled,false);
 const custom=mergeSourceCatalog(defaults,[{...f('old','europe'),url:'https://custom.org/rss'}])[0];assert.equal(custom.url,'https://custom.org/rss');assert.equal(custom.validation,null);
 const added=f('new','africa');assert.equal(mergeSourceCatalog(defaults,[added]).length,2);
 const manual={...defaults[0],ingest:'reference'};assert.equal(mergeSourceCatalog([manual],[{...f('old','europe'),customized:true}])[0].enabled,false);
});
test('active list excludes references and duplicate URLs; rotation covers regions and ages',()=>{
 const fs=[f('a','east-asia'),f('b','europe'),f('c','africa'),f('d','east-asia'),{...f('duplicate','africa'),url:'https://a.org/feed'},{...f('ref','europe'),ingest:'reference'},{...f('off','europe'),enabled:false}];
 assert.equal(activeSources(fs).length,4);const first=sourceBatch(fs,{},3);assert.equal(new Set(first.map(x=>x.coverage_region)).size,3);
 const health=Object.fromEntries(first.map(x=>[x.id,{at:'2026-10-21T20:00:00Z'}]));assert.equal(sourceBatch(fs,health,3)[0].id,'d');
});
test('source status separates verification host and deployed runtime',()=>{
 const feed={url:'https://example.com/feed',validation:{status:'ok',recent:3}};assert.match(sourceStatusLabel(feed),/目录检测.*待运行端/);assert.match(sourceStatusLabel(feed,{source_url:feed.url,ok:true,recent:2}),/运行端可解析.*2/);assert.match(sourceStatusLabel({ingest:'reference'}),/不自动采集/);assert.match(sourceStatusLabel(feed,{source_url:'https://old.org/feed',ok:true,recent:2}),/目录检测/);
});
test('shipped active catalogue has unique real RSS URLs, coverage and recent verification',()=>{
 const fs=JSON.parse(readFileSync(new URL('../lib/research/feeds.json',import.meta.url))),on=activeSources(fs);assert.ok(on.length>=40);assert.equal(fs.filter(x=>x.enabled).length,on.length);
 for(const x of on){assert.equal(x.validation.status,'ok',x.id);assert.ok(x.validation.recent>0,x.id);assert.equal(x.validation.environment,'verification-host-node');}
 for(const region of ['east-asia','southeast-asia','europe','north-america','south-america','africa','oceania','middle-east'])assert.ok(on.filter(x=>x.coverage_region===region).length>=3,region);
 assert.equal(fs.filter(x=>x.ingest==='reference'&&x.enabled).length,0);
});
