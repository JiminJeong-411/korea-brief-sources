export const NEWS_PAGE_SIZE=10;
export function paginate<T>(items:T[],requested:unknown,size=NEWS_PAGE_SIZE){
 const raw=Number(requested),total=items.length,totalPages=Math.max(1,Math.ceil(total/size));
 const page=Math.min(Number.isInteger(raw)&&raw>0?raw:1,totalPages);
 return {items:items.slice((page-1)*size,page*size),page,page_size:size,total,total_pages:totalPages,has_more:page<totalPages};
}
