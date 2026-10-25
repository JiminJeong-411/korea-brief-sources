import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateGeopoliticalRisk} from '../lib/research/ai.ts';
import {projectNews,feedPayload} from '../lib/research/content-policy.mjs';
const excerpt='A South Korean chipmaker announced a new semiconductor product for global data centers. The company described a research program and provided specifications, but did not disclose sales forecasts or customer contracts.';
const response=()=>({category:'technology',regions:['东亚','北美'],summary_zh:'一家韩国芯片企业发布了面向数据中心的新半导体产品，片段未披露销售预测。',assessment:{dimensions:{korea_link:5,business_impact:4,cross_border:4,urgency:3,evidence:5},reason:'原文明确涉及韩国芯片企业及数据中心产品，仍需核对市场需求。',channel:'新产品→数据中心市场竞争→潜在收入影响',confidence:'high',quote:'A South Korean chipmaker announced a new semiconductor product',industries:['半导体'],companies:[]},strategicReport:'需继续核对需求及客户合同。'});
async function withAI(value,fn){const oldFetch=globalThis.fetch,oldKey=process.env.DEEPSEEK_API_KEY;process.env.DEEPSEEK_API_KEY='test-only';globalThis.fetch=async()=>Response.json({choices:[{message:{content:JSON.stringify(value)}}],usage:{}});try{return await fn();}finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.DEEPSEEK_API_KEY;else process.env.DEEPSEEK_API_KEY=oldKey;}}
test('new assessment uses fixed dimensions and caps RSS evidence before ranking',async()=>{
 await withAI(response(),async()=>{const r=await evaluateGeopoliticalRisk('Korean chipmaker announces new AI semiconductor','产业',excerpt);assert.equal(r.category,'technology');assert.deepEqual(r.regions,['east-asia','north-america']);assert.equal(r.assessment.dimensions.evidence,3);assert.equal(r.assessment.confidence,'medium');assert.equal(r.score,81);});
});
test('invalid AI quote leaves the article classified but unassessed',async()=>{
 const value=response();value.assessment.quote='Invented source claim';await withAI(value,async()=>{const r=await evaluateGeopoliticalRisk('Korean chipmaker announces new AI semiconductor','产业',excerpt);assert.equal(r.score,null);assert.equal(r.assessment,null);assert.equal(r.category,'technology');assert.equal(r.strategicReport,'');});
});
test('short excerpts do not call a model or create default scores',async()=>{
 const old=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Model should not be called');};try{const r=await evaluateGeopoliticalRisk('美联储调整利率','政治','短片段');assert.equal(r.score,null);assert.equal(r.category,'economy');assert.deepEqual(r.regions,['north-america']);}finally{globalThis.fetch=old;}
});
test('structured metadata survives storage and enables real assessed news without SQL migration',async()=>{
 await withAI(response(),async()=>{const r=await evaluateGeopoliticalRisk('Korean chipmaker announces new AI semiconductor','产业',excerpt),date='2026-10-22T09:00:00Z';const stored={id:3,title:'Korean chipmaker announces new AI semiconductor',raw_url:'https://example.org/chip',category:r.category,region:JSON.stringify(r.regions),ai_summary:excerpt,ai_score:r.score,published_at:date,strategic_report:JSON.stringify({schema:'korea-brief.analysis.v2',classification:{category:r.category,regions:r.regions},assessment:r.assessment,summary_zh:r.summaryZh,report:r.strategicReport})};const x=projectNews(stored);assert.equal(x.relevance.score,81);assert.equal(x.summary,r.summaryZh);assert.equal(feedPayload([x],{mode:'hot'},Date.parse(date)).total,1);assert.equal(feedPayload([x],{mode:'featured'},Date.parse(date)).total,1);});
});
