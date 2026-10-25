import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryId,classifyCategory,classifyRegions,normalizeRegions,canonicalArticleUrl,deduplicateNews,sportsEligibility,projectNews,prepareNews,feedPayload} from '../lib/research/content-policy.mjs';
import {loadNews,readRestTable} from '../lib/research/news-reader.mjs';
const now=Date.parse('2026-10-22T10:00:00Z'),date='2026-10-22T08:00:00Z';
const row=(id,title,category='综合',extra={})=>({id,raw_title:title,assigned_category:category,raw_url:'https://example.org/story/'+id,created_at:date,...extra});
const stories=[row(1,'美国国会通过总统选举相关法案','经济'),row(2,'美联储降息推动美国股市上涨','政治'),row(3,'Nvidia unveils new AI chip for data centers','产业'),row(4,'新加坡与越南扩大制造业投资','政治'),row(5,'德国汽车出口与关税谈判取得进展','时政风向')];
test('one primary category based on article subject, with consistent Chinese and English IDs',()=>{
 assert.equal(categoryId('tech'),'technology');assert.equal(categoryId('科技'),'technology');assert.equal(categoryId('World Affairs'),'politics');assert.equal(categoryId('Daily News'),'society');
 assert.equal(classifyCategory(stories[0]),'politics');assert.equal(classifyCategory(stories[1]),'economy');assert.equal(classifyCategory(stories[2]),'technology');assert.equal(classifyCategory(stories[3]),'economy');assert.equal(classifyCategory(stories[4]),'economy');
 assert.equal(classifyCategory({title:'韩国总统发表外交演说',category:'产业'}),'politics');
});
test('technology includes semiconductor and AI articles even in broad business feeds',()=>{
 for(const title of ['Nvidia unveils new AI chip','三星发布新一代半导体芯片','OpenAI introduces a new language model','Cybersecurity software protects cloud data centers'])assert.equal(classifyCategory({title,category:'财经商业'}),'technology',title);
});
test('legacy country codes, Chinese labels and JSON arrays map to the eight region IDs',()=>{
 assert.deepEqual(normalizeRegions('kr/us/cn'),['east-asia','north-america']);assert.deepEqual(normalizeRegions('东南亚, 欧洲'),['southeast-asia','europe']);assert.deepEqual(normalizeRegions('["north-america","东亚"]'),['east-asia','north-america']);assert.deepEqual(normalizeRegions('全球/其它'),[]);
 assert.deepEqual(classifyRegions({title:'Korean exporters enter Germany',region:'全球/其它'}),['east-asia','europe']);
 assert.deepEqual(classifyRegions({title:'India announces new policies'}),[]);assert.deepEqual(classifyRegions({title:'Business opportunities'}),[]);assert.deepEqual(classifyRegions({title:'美联储宣布降息'}),['north-america']);
});
test('every regional page has matching canonical records and counts',()=>{
 const titles=['韩国企业进入日本市场','越南工厂扩大出口','德国议会举行选举','美国央行调整利率','巴西扩大出口','肯尼亚建设交通网络','澳大利亚发布经济数据','沙特投资能源项目'];
 const prepared=prepareNews(titles.map((t,i)=>row(i,t))),all=feedPayload(prepared.items,{mode:'stream'},now);
 for(const r of all.regions){assert.ok(r.count>0,r.id);assert.ok(feedPayload(prepared.items,{mode:'stream',region:r.id},now).items.some(x=>x.regions.includes(r.id)),r.id);}
});
test('strict category filtering is disjoint and accepts the actual technology tab ID',()=>{
 const prepared=prepareNews(stories),economy=feedPayload(prepared.items,{category:'economy'},now),politics=feedPayload(prepared.items,{category:'politics'},now),technology=feedPayload(prepared.items,{category:'technology'},now);
 assert.equal(technology.items.length,1);assert.ok(economy.items.length>=2);assert.equal(politics.items.length,1);assert.ok(!economy.items.some(x=>politics.items.some(y=>x.id===y.id)));assert.equal(feedPayload(prepared.items,{category:'tech'},now).total,1);
});
test('tracking links and exact headline reposts deduplicate before category and region counts',()=>{
 const a={id:'a',title:'Federal Reserve announces a new interest rate decision',url:'https://www.example.com/a/?utm_source=x#top',date,category:'economy',summary:'Original short summary'},b={...a,id:'b',url:'https://example.com/a',summary:'Longer and more complete description of the same source story.'},c={...a,id:'c',url:'https://another.org/repost',date:'2026-10-22T09:00:00Z'},d={...a,id:'d',title:'Federal Reserve officials discuss a different inflation outlook',url:'https://example.com/another'};
 const xs=deduplicateNews([a,b,c,d]);assert.equal(xs.length,2);assert.equal(xs.find(x=>x.title===a.title).duplicate_count,2);assert.equal(canonicalArticleUrl(a.url),'https://example.com/a');
 const later={...a,id:'week-later',url:'https://example.com/next-week',date:'2026-10-29T08:00:00Z'};assert.equal(deduplicateNews([a,later]).length,2);
});
test('new and legacy tables cannot create colliding IDs or duplicate the same URL',()=>{
 const prepared=prepareNews([{row:row(1,'美国央行调整政策利率'),table:'english_hot_news'},{row:{id:1,title:'美联储决定调整利率',raw_url:'https://example.org/story/1',published_at:date,category:'economy'},table:'news'},{row:row(1,'德国议会讨论新的选举法案','政治',{raw_url:'https://example.org/different'}),table:'korea_hot_news'}]);assert.equal(prepared.items.length,2);assert.equal(new Set(prepared.items.map(x=>x.id)).size,2);assert.equal(prepared.removed_duplicates,1);
});
test('sports scope removes domestic American fixtures regardless of gender and retains global or Korean stories',()=>{
 for(const title of ['WNBA Fever beat Lynx 88-84 in regular-season game','NFL quarterback injury update before Sunday matchup','NCAA women basketball recruiting rankings','NBA regular-season score and local team preview'])assert.equal(sportsEligibility({title,category:'sports'}).allowed,false,title);
 for(const title of ['Korean guard joins WNBA club','Son Heung-min scores for LAFC in MLS','FIFA World Cup expands global broadcasting deal','Olympic basketball tournament draw announced','NBA sells international streaming media rights','现代汽车签署世界杯全球赞助协议'])assert.equal(sportsEligibility({title,category:'sports'}).allowed,true,title);
 assert.equal(sportsEligibility({title:'WNBA local game',category:'sports',relevance:{reason:'可能影响韩国资本市场'}}).allowed,false);
});
test('sports filtering changes the feed and regional totals, not just the sports tab',()=>{
 const prepared=prepareNews([row(1,'WNBA Fever beat Lynx 88-84','体育',{region:'美国'}),row(2,'Korean baseball player joins MLB club','体育'),row(3,'美联储公布新利率','政治')]);assert.equal(prepared.suppressed_sports,1);assert.equal(prepared.items.length,2);assert.equal(feedPayload(prepared.items,{category:'sports'},now).total,1);
});
test('unassessed news never gets a random score or fabricated strategic report',()=>{
 const projected=projectNews(row(1,'美国总统参加选举','政治',{ai_score:8.9,deep_report:'旧AI解释'}),'english_hot_news');assert.equal(projected.relevance,null);assert.equal(projected.hasReport,false);const prepared=prepareNews([row(1,'美国总统参加选举')]);assert.equal(feedPayload(prepared.items,{mode:'hot'},now).total,0);assert.equal(feedPayload(prepared.items,{mode:'stream'},now).total,1);const featured=feedPayload(prepared.items,{mode:'featured'},now);assert.equal(featured.total,1);assert.equal(featured.selection_basis,'latest-candidates');assert.equal(featured.items[0].relevance,null);
});
test('date, search and pagination filters retain the frontend response contract',()=>{
 const xs=prepareNews(Array.from({length:65},(_,i)=>row(i,'韩国科技公司发布芯片产品 '+i,'科技'))).items;const first=feedPayload(xs,{mode:'stream',category:'technology',page:'1'},now),second=feedPayload(xs,{mode:'stream',page:'2'},now);
 assert.equal(first.items.length,30);assert.equal(second.items.length,30);assert.equal(first.has_more,true);assert.equal(new Set([...first.items,...second.items].map(x=>x.id)).size,60);assert.equal(feedPayload(xs,{mode:'stream',q:'产品 64'},now).total,1);assert.equal(feedPayload(xs,{mode:'stream',days:'1'},now+2*86400000).total,0);assert.equal(feedPayload(xs,{mode:'stream',days:'0'},now+2*86400000).total,65);assert.ok(!('original_excerpt' in first.items[0]));
});
test('reader follows stable database cursors beyond the first page',async()=>{
 const ids=[];const r=await readRestTable('news',{url:'https://test.supabase.co',key:'test',pageSize:2,maxRows:10,fetcher:async url=>{const p=new URL(url).searchParams;ids.push(p.get('id'));return Response.json(p.has('id')?[{id:1}]:[{id:3},{id:2}]);}});assert.deepEqual(ids,[null,'lt.2']);assert.equal(r.records.length,3);assert.equal(r.truncated,false);
});
test('reader combines accessible legacy and new tables and tolerates a missing table',async()=>{
 const result=await loadNews({env:{SUPABASE_URL:'https://test.supabase.co',SUPABASE_KEY:'test'},fetcher:async url=>{const t=new URL(url).pathname.split('/').at(-1);return t==='korea_hot_news'?new Response('',{status:404}):Response.json(t==='news'?[{id:1,title:'芯片公司发布AI产品',raw_url:'https://new.example/a',category:'technology',published_at:date}]:[row(1,'美国总统发表外交演说','经济')]);}});assert.equal(result.items.length,2);assert.ok(result.items.some(x=>x.category==='technology'));assert.ok(result.items.some(x=>x.category==='politics'));assert.ok(result.source_status.some(x=>x.status==='missing'));
});
test('database failures are reported instead of looking like an empty region',async()=>{
 await assert.rejects(loadNews({env:{SUPABASE_URL:'https://test.supabase.co',SUPABASE_KEY:'test'},fetcher:async()=>new Response('',{status:403})}),/读取失败/);await assert.rejects(loadNews({env:{}}),/未配置/);
 const result=await loadNews({env:{DATABASE_URL:'test'},pgReader:async()=>[{id:1,title:'韩国半导体出口增长',raw_url:'https://new.example/a',published_at:date,category:'technology'}]});assert.equal(result.items.length,1);
});
