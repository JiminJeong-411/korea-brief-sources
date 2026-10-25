# Korea Brief 业务逻辑修复补丁

日期：2026-10-22。基于你提供的 KoreaBrief-Sources 工程制作，面向已经能够在 Vercel 上部署的版本。

## 应用

1. 解压本补丁，把 `app`、`lib`、`scripts`、`tests` 文件夹合并覆盖到当前项目根目录（与 `package.json` 同级）。
2. 提交到你当前的仓库，重新部署 Vercel。补丁没有包含部署配置或 package.json，沿用你已部署成功的配置。
3. 打开新闻动态，分别检查经济、政治、科技、体育和地区页面。已有新闻会在读取时重新归类、去重和过滤，无需删除旧数据、清空数据库或重新采集。
4. 后续继续使用原来的 `npm run pipeline` 采集命令，新脚本会采用同一套分类及筛选规则。沿用现有 DATABASE_URL 和 DeepSeek 设置。

## 修复行为

| 问题 | 修复 |
|---|---|
| 政治、经济分错或交叉重复 | 每篇报道确定一个主分类，文章标题和内容优先于媒体栏目；接口按六个标准ID精确筛选。|
| 科技入口为空 | 统一使用 technology；兼容旧 tech、科技等输入，识别AI、芯片、半导体、软件等内容。|
| 重复新闻 | 标准化原文链接并去除追踪参数；同链接合并，同标准化标题在24小时内合并。新旧表先合并去重，再筛选和计数。不同事件不会因共享几个关键词被合并。|
| 美国本地体育过多 | 普通本地赛况、伤病和招募新闻没有具体韩国参与或国际商业关联时不进入公开流。保留韩国球员/球队、重要国际赛事和跨境转播/赞助等商业新闻。男女赛事采用同一规则。|
| 地区没有内容 | kr/us/cn/jp/eu和中文地区名称映射为前端使用的八区ID。地区总览计数、区域列表使用同一份数据，一条跨境新闻可以属于多个地区。|
| 新采集后页面仍没有新闻 | 兼容news、english_hot_news、korea_hot_news三个数据表，统一字段与ID并去重。|
| 失败看起来像“没有新闻” | 数据库全部读取失败会返回明确503错误，不再伪装成成功的空列表。|

## 数据与排序

- 旧记录的读取结果立即采用修复规则，数据库原记录保持原样。
- 地区依据事件内容与已有有效地区标签，不按发布媒体总部强制归类。南亚等八区以外内容进入“跨地区／待归类”。
- 旧数据只有一个ai_score或缺乏可核验评估时，保持“待评估”，不再随机补分、拼接固定的韩国影响分析或编造五维评分。它们仍可在新闻动态、地区和分类候选中阅读。
- 精选优先显示编辑精选或合格AI评估。筛选下尚无合格精选时，暂列最新候选，卡片继续标为“待评估”；接口selection_basis为latest-candidates。热点只接收有实际片段摘录及合法五维评估的新闻。
- 新流水线用现有strategic_report文本字段保存带版本标记的结构化评估，原文片段放在ai_summary字段；不要求新增数据库字段。原有ai_score字段保持0—10尺度，0在没有assessment时表示待评估占位；前台用验证后的assessment计算0—100分。
- 新采集只处理启用的RSS，不处理资料入口或已关闭来源；先检查实际发布时间、标准化URL及体育范围，再调用AI。CBS/Yahoo综合体育源默认关闭。既有历史数据在读取时过滤，不执行删除。
- 读取每张表最近最多2000条记录，按稳定ID分页；接口diagnostics.truncated提示是否达到读取窗口。时间筛选在该窗口内执行。
- 数据库连接沿用SUPABASE_URL/SUPABASE_KEY或现有NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY；news表还可使用已有DATABASE_URL。当前补丁不会替你修改云端连接或访问规则。

## 验收

- `/api/public/feed?mode=stream&category=technology`：有科技候选时返回科技分类。
- `/api/public/feed?mode=stream&category=economy`、`category=politics`：同一报道只有一个主分类。
- `/api/public/feed?mode=stream&region=east-asia`：地区字段应是标准八区ID，而非kr等国家码。
- `/api/public/feed?mode=stream&category=sports`：不再保留缺乏韩国/国际赛事/跨境商业联系的本地赛况。
- 响应含regions计数、has_more分页字段，以及diagnostics去重和体育过滤统计。

自动检查：

```sh
node --test tests/content-policy.test.mjs
node --experimental-strip-types --test tests/content-ai.test.mjs
npx tsc --noEmit --incremental false
```

本次验证：50项回归测试通过；完整工程TypeScript检查通过；在隔离的标准Next.js验证工程中，修改后的新闻API及原首页生产构建通过，HTTP测试验证了科技、政治、经济、体育和八个地区。HTTP测试使用明确的合成资料，不代表已读取或修改你的Vercel线上数据库。实际线上效果在你应用补丁并重新部署后生效。

本次只处理新闻业务逻辑；后台登录、收藏、日报和研究模块不在本轮修改范围。
