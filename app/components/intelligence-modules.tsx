'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,ArrowUpRight,Building2,RefreshCw} from 'lucide-react';
import {TimedCache} from '@/lib/research/cache';
import {REGIONS} from '@/lib/research/strategy-domain.mjs';
const cache=new TimedCache<any>(300000,20);
const when=(value:string)=>value?new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})+' KST':'尚无采样';
function useData(url:string,refreshToken:number){
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const previous=useRef(refreshToken);
 useEffect(()=>{
  let active=true;const force=previous.current!==refreshToken;previous.current=refreshToken;
  const hit=cache.peek(url);setData(hit?.value||null);setLoading(!hit);setError('');
  cache.get(url,async()=>{const r=await fetch(url+(force?(url.includes('?')?'&':'?')+'fresh=1':''));if(!r.ok)throw Error('内容读取失败，请重试');return r.json();},force).then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[url,refreshToken]);return {data,error,loading};
}
function Load({loading,error}:{loading:boolean;error:string}){return <>{loading&&<div className="loading-state"><RefreshCw size={17} className="spinning"/>正在读取已生成内容…</div>}{error&&<p role="alert" className="status-notice">{error}，可使用页面右上角刷新重试。</p>}</>;}
function Cite({refs,sources}:{refs:string[];sources:any[]}){return <small>{refs.map(ref=>{const s=sources.find(s=>s.ref===ref);return s?<a key={ref} href={s.url} target="_blank" rel="noreferrer"> [{ref}] ↗</a>:null;})}</small>;}
export function DailyPanel({refreshToken}:{refreshToken:number}){
 const [day,setDay]=useState('');
 useEffect(()=>{setDay(new URLSearchParams(location.search).get('date')||'');},[]);
 const {data,error,loading}=useData('/api/public/daily',refreshToken);
 // One bounded archive read; switching the selected date fetches its document via the same cached API.
 const detail=useData('/api/public/daily'+(day?'?date='+encodeURIComponent(day):''),refreshToken);
 const d=day?detail.data?.edition:data?.edition;
 return <section><Load loading={loading||!!day&&detail.loading} error={error||detail.error}/>{!!data?.editions?.length&&<div className="filter-row"><label>阅读日期 <select aria-label="日报日期" value={day||data.editions[0].day} onChange={e=>{setDay(e.target.value);history.replaceState({},'','/?view=daily&date='+e.target.value);}}>{data.editions.map((e:any)=><option key={e.day} value={e.day}>{e.day}{e.complete?'':' · 更新中'}</option>)}</select></label><span className="fineprint">按韩国日期归档</span></div>}
 {!loading&&!d&&<div className="empty-state"><h2>日报正在积累</h2><p>完成采集后，这里展示当天简报和已保存的往日版本。</p></div>}
 {d&&<article className="signal-card"><div className="signal-body"><div className="card-meta"><span>DAILY BRIEF</span><span className="outline-tag">AI辅助草稿</span><span>{d.complete?'日窗口已结束':'当日更新中'}</span><time>更新 {when(d.observedAt)}</time></div><h2>{d.title}</h2><p className="fineprint">观察窗口：{when(d.start)} — {when(d.end)}。已收录 {d.coverage.events} 个事件，重点选读 {d.coverage.selected_news} 个。{d.generation==='evidence_index'?'本轮AI正文未完成，先显示来源索引。':''}</p>
 <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'16px 0'}}>{REGIONS.map(r=><span className="outline-tag" key={r.id}>{r.title} {d.coverage.regions[r.id]||0}</span>)}</div>
 {d.sections.map((s:any,i:number)=><section className="transmission" key={i}><h3>{String(i+1).padStart(2,'0')} / {s.title}</h3><p><b>已知事实：</b>{s.fact}<Cite refs={s.citations} sources={d.sources}/></p><p><b>可能影响：</b>{s.implication}</p><p><b>继续观察：</b>{s.watch}</p></section>)}
 <details className="assessment" open={!d.sections.length}><summary>来源与证据索引 · {d.sources.length} 项</summary><div>{d.sources.map((s:any)=><p key={s.ref}><a href={s.url} target="_blank" rel="noreferrer">[{s.ref}] {s.title} <ArrowUpRight size={12}/></a><br/><small>{s.source} · {s.type==='news'?'新闻订阅片段':s.type==='company'?'企业公告标题':'平台采样摘要'} · {s.date_basis==='ingested'?'原文时间未知，入库 ':''}{when(s.date)}{s.source_count?' · '+s.source_count+'家媒体':''}</small>{s.summary&&<span style={{display:'block'}}>{s.summary}</span>}</p>)}</div></details>
 <details className="assessment"><summary>方法与覆盖范围</summary><ul>{d.limitations.map((t:string)=><li key={t}>{t}</li>)}</ul></details></div></article>}
 </section>;
}
function money(m:any){if(m.current===null)return '—';if(m.currency==='KRW')return (Number(m.current)/1e8).toLocaleString('zh-CN',{maximumFractionDigits:2})+' 亿韩元';return BigInt(m.current).toLocaleString('zh-CN')+' '+m.currency;}
export function CompanyPanel({refreshToken,onNews}:{refreshToken:number;onNews:(name:string)=>void}){
 const {data,error,loading}=useData('/api/public/companies',refreshToken);
 const [selected,setSelected]=useState(''),[sector,setSector]=useState(''),[query,setQuery]=useState(''),[period,setPeriod]=useState('');
 useEffect(()=>{setSelected(new URLSearchParams(location.search).get('company')||'');},[]);
 const choose=(id:string)=>{setSelected(id);setPeriod('');history.replaceState({},'','/?view=companies'+(id?'&company='+id:''));};
 const c=data?.items?.find((c:any)=>c.id===selected),p=c?.profile,f=p?.financials?.find((f:any)=>f.period===period)||p?.financials?.[0];
 const list=(data?.items||[]).filter((c:any)=>(!sector||c.sector===sector)&&(!query||JSON.stringify([c.name,c.name_en,c.name_ko,c.stock_code]).toLowerCase().includes(query.toLowerCase())));
 return <section><Load loading={loading} error={error}/>{!selected&&<><p className="method-note">{data?.methodology||'15家跨行业观察名单；兼顾韩国核心出口产业、平台与文化企业，不是市值排名。'}</p><div className="filter-row"><input className="mono-search" aria-label="搜索公司" placeholder="公司名或股票代码" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="公司行业" value={sector} onChange={e=>setSector(e.target.value)}><option value="">全部行业</option>{[...new Set<string>((data?.items||[]).map((c:any)=>c.sector))].map(s=><option key={s}>{s}</option>)}</select></div><div className="source-grid">{list.map((x:any)=><button className="signal-card" style={{textAlign:'left',cursor:'pointer',padding:20,color:'inherit',background:'white'}} key={x.id} onClick={()=>choose(x.id)}><div className="card-meta"><Building2 size={15}/>{x.stock_code} · {x.sector}</div><h2>{x.name}</h2><p>{x.focus}</p><small>{x.profile?.financials?.length?'最新结构化财报：'+x.profile.financials[0].label:'结构化财报待收录'} · {x.profile?.disclosures?.length||0} 条重点公告</small><br/><small>{x.profile?'最近尝试 '+when(x.profile.observedAt):'等待首次采集'}</small></button>)}</div>{!loading&&!list.length&&<p className="method-note">暂无匹配公司。</p>}</>}
 {selected&&!c&&!loading&&<div className="empty-state"><p>未找到这家公司。</p><button className="mono-button" onClick={()=>choose('')}>返回公司名单</button></div>}
 {c&&<><button className="mono-button" onClick={()=>choose('')}><ChevronLeft size={14}/>全部公司</button><article className="signal-card" style={{marginTop:16}}><div className="signal-body"><div className="card-meta"><span>{c.stock_code}</span><span>{c.sector}</span><span className="outline-tag">企业公开披露 · AI辅助观察</span></div><h2>{c.name} <small>{c.name_en}</small></h2><p>{c.focus}</p><div className="about-links"><a href={c.ir_url} target="_blank" rel="noreferrer">公司官网 / IR ↗</a><button onClick={()=>onNews(c.name_en)}>关联新闻 ↗</button></div>
 {!p&&<p className="method-note">尚未收录该公司的公开资料。</p>}
 {p&&<><p className="fineprint">最近检查公告：{p.disclosureCheckedAt?when(p.disclosureCheckedAt):'尚无成功采集'}。{p.dartStatus!=='ok'?'本轮公告未更新；已有资料按原披露日期保留。':''}</p>
 <h3>财报速读</h3>{!f?<p className="method-note">尚无可用的结构化财务报表。已收录的官网资料与公告列于下方。</p>:<><div className="filter-row"><select aria-label="财报期数" value={f.period} onChange={e=>setPeriod(e.target.value)}>{p.financials.map((r:any)=><option key={r.period} value={r.period}>{r.label} · {r.scope_label}</option>)}</select><a href={f.url} target="_blank" rel="noreferrer">核对财报原文 ↗</a></div><p className="fineprint">{f.scope_label} · 披露 {f.disclosed_at} · {f.operating_margin!==null?'营业利润率 '+f.operating_margin+'%':''}</p><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left',fontSize:13}}><thead><tr>{['指标','本期 / 原币金额','口径','同比 / 比较说明','年内累计（如有）'].map(t=><th key={t} style={{padding:10,borderBottom:'1px solid #ddd',whiteSpace:'nowrap'}}>{t}</th>)}</tr></thead><tbody>{f.metrics.map((m:any)=><tr key={m.id}><td style={{padding:10,borderBottom:'1px solid #eee'}}>{m.name}</td><td title={m.current??'未提供'}>{money(m)}</td><td>{m.basis}</td><td>{m.yoy!==null?m.yoy+'%':m.change||'—'}</td><td>{m.cumulative!==null?money({...m,current:m.cumulative}):'—'}</td></tr>)}</tbody></table></div><p className="fineprint">— 表示未提供、存在歧义或不可比较。展示金额可能四舍五入，悬停可看原值。{f.limitations.join(' ')}</p></>}
 <h3>战略观察与验证问题</h3>{p.analysis?.length?p.analysis.map((a:any,i:number)=><p key={i}>{a.text}<Cite refs={a.citations} sources={p.sources}/></p>):<p className="fineprint">暂无达到证据要求的AI观察；可先阅读披露资料。</p>}<p className="fineprint">条件性分析，未经人工核验。观察针对最新已取得资料；切换历史财报不会重新生成AI判断。</p>
 <details className="assessment"><summary>分析引用的账户与公告证据</summary><div>{p.sources?.map((s:any)=><p key={s.ref}><a href={s.url} target="_blank" rel="noreferrer">[{s.ref}] {s.title} ↗</a><br/><small>{s.text}</small></p>)}</div></details>
 <h3>重点公告</h3><p className="fineprint">以下为DART清单标题；未声称读完公告正文。{p.disclosure_truncated?'公告读取达到500条上限，可能尚未覆盖全部区间。':''}</p>{p.disclosures?.length?p.disclosures.map((d:any)=><p key={d.receipt}><time>{d.date}</time> · <a href={d.url} target="_blank" rel="noreferrer">{d.title} ↗</a>{d.correction&&<span className="outline-tag">更正披露</span>}</p>):<p className="fineprint">暂无已收录重点公告。</p>}
 <h3>官网资料索引</h3><p className="fineprint">{p.ir?.status==='index_read'?'成功解析静态链接，采样 '+when(p.ir.observedAt):'本轮未取得可用静态资料链接；可访问公司官网核对。'} 附件未自动阅读全文。</p>{p.ir?.documents?.map((d:any)=><p key={d.url}><a href={d.url} target="_blank" rel="noreferrer">{d.title} ↗</a><small> · {d.link_kind==='dated_document'?'带日期资料链接':'资料栏目入口'} · 附件未读</small></p>)}</>}
 </div></article></>}
 </section>;
}
export function TrendOverview({overview}:{overview:any}){
 if(!overview)return <p className="method-note">跨平台趋势将在下一轮成功采样后生成。下方各平台资料保留各自采样时间。</p>;
 return <section className="signal-card" style={{marginBottom:24}}><div className="signal-body"><div className="card-meta"><span>跨平台热门趋势</span><time>{when(overview.observedAt)}</time><span>{overview.coverage.platforms} 个平台样本</span></div><p className="fineprint">{overview.scopeNote}</p>{!overview.trends.length&&<p>本轮暂无合格的合并趋势；可继续阅读各平台观察。</p>}{overview.trends.map((t:any,i:number)=><div className="transmission" key={i}><h3>{i+1}. {t.title} <small>涉及 {t.platformCount} 个平台</small></h3><p>{t.summary}</p>{t.opinions.map((o:any,j:number)=><div key={j}><p>{o.text}</p>{o.evidence.map((e:any)=><blockquote key={e.url}>{e.quote}<br/><a href={e.url} target="_blank" rel="noreferrer">原评论 ↗</a><small> · 点赞 {e.likes??'未知'} · 回复 {e.replies??'未知'} · {e.selection||'评论抽样'}</small></blockquote>)}</div>)}<details className="assessment"><summary>话题来源与采样范围</summary><div>{t.sources.map((s:any)=><p key={s.ref}><a href={s.url} target="_blank" rel="noreferrer">{s.platform} · {s.title} ↗</a><br/><small>采样 {when(s.observedAt)} · {s.evidenceLevel==='title_only'?'仅标题':s.evidenceLevel==='comment_sample'?'含有限评论证据':'帖子或简介片段'}</small></p>)}</div></details></div>)}</div></section>;
}
