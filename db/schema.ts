import { pgTable, text, timestamp, real, serial, boolean } from "drizzle-orm/pg-core";

export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  rawUrl: text("raw_url").notNull().unique(),
  sourceSite: text("source_site").notNull(),
  category: text("category").notNull(), // 经济, 政治, 科技, 社会, 娱乐, 体育
  region: text("region").default("全球/其它").notNull(), // 东亚, 东南亚, 欧洲, 北美, 南美, 非洲, 大洋洲, 中东
  aiScore: real("ai_score").default(5.0).notNull(), // 1.0 - 10.0
  aiSummary: text("ai_summary"),
  strategicReport: text("strategic_report"), // 涉韩战略研报
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  newsId: serial("news_id").references(() => news.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});