import { db } from "../../../db/index";
import { news } from "../../../db/schema";
import { desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    // 按照发布时间倒序，从 Supabase 的 news 表中拉取最新 100 条战略情报
    const records = await db.select().from(news).orderBy(desc(news.publishedAt)).limit(100);
    
    // 将 PostgreSQL 的数据转化为标准 JSON 喂给前端 UI
    return Response.json(records);
  } catch (error: any) {
    console.error("数据库查询异常:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}