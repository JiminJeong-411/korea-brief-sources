import "dotenv/config";
import Parser from "rss-parser";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { news } from "../db/schema";
import { evaluateGeopoliticalRisk } from "../lib/research/ai";
import fs from "fs";
import path from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const parser = new Parser({ timeout: 15000 });

async function executePipeline() {
  console.log("🚀 全栈战略情报流水线启动 (TypeScript 原生引擎)...");
  
  // 兼容 Node.js 严格模式：使用原生 fs 模块读取 JSON 信源清单
  const feedsPath = path.resolve(process.cwd(), "lib/research/feeds.json");
  const feedsData = JSON.parse(fs.readFileSync(feedsPath, "utf-8"));
  
  // 【修复核心】：兼容两种 JSON 格式（直接数组 or 带有 feeds 键的对象）
  const feeds = Array.isArray(feedsData) ? feedsData : (feedsData.feeds || []);
  
  if (feeds.length === 0) {
    console.log("⚠️ 严重警告：未能从 feeds.json 读到任何信源，请检查文件内容！");
    process.exit(1);
  } else {
    console.log(`📊 成功载入 ${feeds.length} 个战略信源，准备开始抓取...`);
  }
  
  for (const feed of feeds) {
    console.log(`\n📡 正在连接信源: ${feed.name} [${feed.category}]`);
    try {
      const parsedFeed = await parser.parseURL(feed.url);
      const items = (parsedFeed.items || []).slice(0, 5); // 每个信源取最新 5 条

      for (const item of items) {
        if (!item.title || !item.link) continue;

        console.log(`  -> AI 正在评估: ${item.title.slice(0, 40)}...`);
        const analysis = await evaluateGeopoliticalRisk(
          item.title,
          feed.category || "综合",
          item.contentSnippet || item.summary || ""
        );

        await db.insert(news).values({
          title: item.title,
          rawUrl: item.link,
          sourceSite: feed.name,
          category: feed.category || "综合",
          region: analysis.region,
          aiScore: analysis.score,
          aiSummary: item.contentSnippet?.slice(0, 180) || "",
          strategicReport: analysis.strategicReport,
          publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
        }).onConflictDoNothing({ target: news.rawUrl }); // 防止重复抓取
      }
    } catch (err: any) {
      console.warn(`  ⚠️ 跳过不稳定信源 ${feed.name}: ${err.message}`);
    }
  }

  console.log("\n✅ 全球战略情报入库与 DeepSeek AI 分析全部完成！");
  await pool.end();
}

executePipeline().catch(console.error);