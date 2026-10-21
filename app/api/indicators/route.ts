import { NextResponse } from "next/server";
async function indicator(code:string){
  const url=`https://api.worldbank.org/v2/country/KOR/indicator/${code}?format=json&per_page=25&date=2015:2026`;
  const res=await fetch(url,{signal:AbortSignal.timeout(8000)});
  if(!res.ok)throw Error("World Bank unavailable");
  const body=await res.json() as [unknown,{date:string,value:number|null}[]];
  if(!Array.isArray(body)||!Array.isArray(body[1]))throw Error("Invalid data");
  return body[1].filter(v=>v.value!==null&&Number.isFinite(v.value)&&/^\d{4}$/.test(v.date)).map(v=>({year:Number(v.date),value:Number(v.value)})).sort((a,b)=>a.year-b.year);
}
export async function GET(){
  const [pop,gdp]=await Promise.allSettled([indicator("SP.POP.TOTL"),indicator("NY.GDP.MKTP.KD.ZG")]);
  if(pop.status==="rejected"&&gdp.status==="rejected")return NextResponse.json({error:"Data source unavailable"},{status:503});
  return NextResponse.json({population:pop.status==="fulfilled"?pop.value:[],gdp:gdp.status==="fulfilled"?gdp.value:[]},{headers:{"Cache-Control":"public, max-age=0, s-maxage=21600"}});
}
