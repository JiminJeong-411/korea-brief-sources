import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// 实例化 PostgreSQL 连接池，直连你的 Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 导出注入了新 Schema 的数据库实例
export const db = drizzle(pool, { schema });