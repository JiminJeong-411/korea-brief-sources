export const ENTERTAINMENT_VERSION='kpop-focus-20261028-v1';
const KPOP=/\bk[ -]?pop\b|韩团|韩国(?:音乐|偶像|娱乐公司)|케이팝|K팝|아이돌|하이브|에스엠|와이지|방탄소년단|블랙핑크|뉴진스|아일릿|르세라핌|\b(?:hybe|sm entertainment|jyp(?: entertainment)?|yg entertainment|cj enm|kakao entertainment|weverse|blackpink|stray kids|aespa|newjeans|new jeans|illit|enhypen|le sserafim|ateez|plave|babymonster|nct(?: wish| dream| 127)?|tomorrow x together|zerobaseone|wakeone|belift|pledis|cube entertainment|starship entertainment)\b/i;
const INDUSTRY=/并购|收购|营收|收入|利润|财报|版权|合约|合同|诉讼|发行|分销|平台|战略|市场准入|票务|定价|赞助|投资|股权|监管|著作权|매출|영업이익|계약|저작권|유통|소송|인수|\b(?:acqui\w*|merger|takeover|revenues?|earnings|profit|copyright|licen[sc]\w*|contracts?|lawsuit|distribution|platform|strateg\w*|ticket\w*|pricing|sponsor\w*|investment|stake|regulat\w*|royalt\w*)\b/i;
const MAJOR_ARTIST=/世界巡演|全球巡演|首次|创纪录|主舞台|回归|新专辑|컴백|월드투어|\b(?:world tour|global tour|headlin\w*|first (?:time|ever)|record[- ]break\w*|comeback|new album|studio album|mini album|debut album|billboard 200|hot 100)\b/i;
const AMBIGUOUS_ARTIST=/\b(?:bts|twice|seventeen)\b/i;
const MUSIC_CONTEXT=/\b(?:music|albums?|concerts?|tours?|singers?|boy band|girl group|idol|billboard|oricon|spotify|entertainment|lyrics|weverse)\b|艺人|专辑|音乐|演唱会|偶像|巡演|乐队|아이돌|음반|콘서트|공연|가수/i;
export function isKpop(title:string,excerpt='',focus=''):boolean{const all=title+' '+excerpt;return focus==='kpop'||KPOP.test(all)||(AMBIGUOUS_ARTIST.test(all)&&MUSIC_CONTEXT.test(all));}
export function lowValueEntertainment(title:string):boolean{
 if(INDUSTRY.test(title)||/人群|伤亡|事故|死亡|伤害|虐待|\b(?:death|injur\w*|crowd|abuse|accident)\b/i.test(title))return false;
 return /恋爱传闻|结婚照|怀孕|机场照|新头像|概念照|预告照|写真|品牌声誉|브랜드평판|공항패션|\b(?:dating rumou?rs?|wedding photos?|pregnancy|profile photos?|concept photos?|teaser photos?|brand reputation|airport fashion|look(?:s)? stunning|birthday wishes)\b/i.test(title)
  ||/\b(?:becomes? their|becomes? .*?\d+(?:st|nd|rd|th)|exceeds? \d|surpasses? \d|reaches? \d).*\b(?:million|billion|views|streams)\b|MV.{0,12}(?:破亿|播放量)|突破.{0,6}亿.{0,6}(?:播放|观看)/i.test(title)&&!/first(?: ever)?|record|首个|首次|纪录/i.test(title);
}
export function entertainmentPriority(title:string,excerpt='',focus=''):number{
 if(lowValueEntertainment(title))return -1;
 const all=title+' '+excerpt,kpop=isKpop(title,excerpt,focus);
 return kpop?(INDUSTRY.test(all)?4:MAJOR_ARTIST.test(all)?3:2):INDUSTRY.test(all)?1:0;
}
