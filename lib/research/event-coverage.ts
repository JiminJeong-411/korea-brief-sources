// Applies to all six categories. No named person, company, prize or year is a grouping rule.
export type CoverageKind='result'|'live'|'background'|'commentary'|'correction'|'highlights'|'preview'|'report';
export const COVERAGE_LABELS:Record<CoverageKind,string>={result:'结果报道',live:'事件实况',background:'背景与比较',commentary:'评论解读',correction:'更正与误发',highlights:'视频回顾',preview:'事前预测',report:'事件报道'};
export function coverageLabel(kind:unknown):string{return COVERAGE_LABELS[kind as CoverageKind]||COVERAGE_LABELS.report;}
export function classifyCoverage(title:string):CoverageKind{
 const t=String(title||'').normalize('NFKC');
 if(/\b(?:premature\w*|correction|corrected|blunder|misreport\w*)\b|更正|误发|提前宣布|提前发布|误报|정정|오보/i.test(t))return 'correction';
 if(/\b(?:as it happened|live updates?|live blog)\b|实时报道|实况|直播|생중계/i.test(t))return 'live';
 if(/\b(?:highlights?|compilation|best .*goals)\b|进球集锦|视频回顾|最佳进球|精彩集锦/i.test(t))return 'highlights';
 if(/\b(?:ranking|rankings|ranked|compare|history|career)\b|排名|历史回顾|生涯回顾|背景梳理|来龙去脉/i.test(t))return 'background';
 if(/\b(?:commentary|opinion|column|analysis|explained|riposte|fawning)\b|评论|专栏|解读|谄媚|华丽回击|[|｜]\s*\p{L}+/iu.test(t))return 'commentary';
 if(/\b(?:could|might|may win|odds|predict\w*|favourites?|favorites?|nominees?|shortlist|campaign|who should win|who will win)\b|候选|提名|赔率|预测|有望|展望|후보|예측|전망/i.test(t))return 'preview';
 return 'report';
}
export function contextKind(kind:CoverageKind):boolean{return !['report','result'].includes(kind);}
