// Money stays an exact decimal string. Ratios are derived only from matched periods/currencies.
export function amount(value:unknown):string|null{
 const s=String(value??'').trim().replace(/,/g,'');if(!/^-?\d+$/.test(s))return null;
 return BigInt(s).toString();
}
export function percent(current:string|null,prior:string|null):number|null{
 if(current===null||prior===null||BigInt(prior)<=BigInt(0))return null;
 return Number((BigInt(current)-BigInt(prior))*BigInt(1000)/BigInt(prior))/10;
}
export function financialPeriod(title:string){
 const m=title.match(/(?:사업|반기|분기)보고서\s*\((20\d{2})\.(03|06|09|12)\)/);if(!m)return null;
 const codes:Record<string,string>={'03':'11013','06':'11012','09':'11014','12':'11011'};
 return {year:m[1],code:codes[m[2]],period:m[1]+'-'+m[2],label:m[2]==='12'?m[1]+' 全年':m[1]+' Q'+String(Number(m[2])/3),annual:m[2]==='12'};
}
const specs=[
 {id:'revenue',name:'营业收入',statement:'income',ids:['ifrs-full_Revenue','ifrs-full_RevenueFromContractsWithCustomers'],names:['매출액','수익(매출액)','영업수익']},
 {id:'operating_profit',name:'营业利润',statement:'income',ids:['dart_OperatingIncomeLoss'],names:['영업이익','영업이익(손실)']},
 {id:'net_profit',name:'净利润（含非控股权益）',statement:'income',ids:['ifrs-full_ProfitLoss'],names:['당기순이익','당기순이익(손실)','분기순이익','분기순이익(손실)']},
 {id:'assets',name:'资产总计',statement:'balance',ids:['ifrs-full_Assets'],names:['자산총계']},
 {id:'liabilities',name:'负债总计',statement:'balance',ids:['ifrs-full_Liabilities'],names:['부채총계']},
 {id:'equity',name:'权益总计',statement:'balance',ids:['ifrs-full_Equity'],names:['자본총계']},
 {id:'operating_cash',name:'经营现金流（年内累计）',statement:'cash',ids:['ifrs-full_CashFlowsFromUsedInOperatingActivities'],names:['영업활동현금흐름','영업활동으로인한현금흐름']}
] as const;
export function extractFinancials(rows:any[],period:NonNullable<ReturnType<typeof financialPeriod>>,scope:'CFS'|'OFS'){
 const metrics=specs.map(spec=>{
  const valid=rows.filter(r=>spec.statement==='income'?['IS','CIS'].includes(r.sj_div):r.sj_div===(spec.statement==='balance'?'BS':'CF'));
  let matches=valid.filter(r=>(spec.ids as readonly string[]).includes(r.account_id));
  if(!matches.length)matches=valid.filter(r=>(spec.names as readonly string[]).includes(String(r.account_nm||'').replace(/\s+/g,'')));
  if(spec.statement==='income'&&matches.some(r=>r.sj_div==='IS'))matches=matches.filter(r=>r.sj_div==='IS');
  const distinct=[...new Map(matches.map(r=>[JSON.stringify([r.currency,r.thstrm_amount,r.thstrm_add_amount,r.frmtrm_amount,r.frmtrm_q_amount,r.frmtrm_add_amount]),r])).values()];
  const r=distinct.length===1?distinct[0]:null;
  const current=amount(r?.thstrm_amount),prior=spec.statement==='income'?amount(period.annual?r?.frmtrm_amount:r?.frmtrm_q_amount):null;
  const currency=String(r?.currency||'未知');
  return {id:spec.id,name:spec.name,statement:spec.statement,current,prior,currency,
   basis:spec.statement==='balance'?'期末余额':spec.statement==='cash'?'年内累计':period.annual?'全年':'单季（三个月）',
   cumulative:spec.statement==='income'&&!period.annual?amount(r?.thstrm_add_amount):null,
   cumulativePrior:spec.statement==='income'&&!period.annual?amount(r?.frmtrm_add_amount):null,
   yoy:spec.statement==='income'&&currency!=='未知'?percent(current,prior):null,
   change:current!==null&&prior!==null&&BigInt(prior)<=BigInt(0)?(BigInt(prior)<BigInt(0)&&BigInt(current)>BigInt(0)?'由亏转盈':BigInt(prior)<BigInt(0)&&BigInt(current)<BigInt(0)?'两期均为负值，不计算增长率':'比较基数非正，不计算增长率'):null,
   account_id:r?.account_id||null,account_name:r?.account_nm||null,
   status:r?'reported':distinct.length>1?'ambiguous':'not_available'};
 });
 const rev=metrics.find(m=>m.id==='revenue')!,op=metrics.find(m=>m.id==='operating_profit')!;
 const margin=rev.current!==null&&op.current!==null&&BigInt(rev.current)>BigInt(0)&&rev.currency===op.currency&&rev.currency!=='未知'?Number(BigInt(op.current)*BigInt(1000)/BigInt(rev.current))/10:null;
 return {period:period.period,label:period.label,year:period.year,report_code:period.code,scope,scope_label:scope==='CFS'?'合并财务报表':'单体财务报表（未取得合并数据）',metrics,operating_margin:margin,
  limitations:['金额保留原币和原始单位；缺失或存在歧义的账户不补零。','利润表单季与年内累计分别展示；资产负债表为期末，现金流为累计，不跨口径比较。','这里读取DART结构化账户，未声称读完财报附注、分部报告或IR附件。']};
}
