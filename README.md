# Korea Brief：两层精选与韩国社区观察更新

此包包含 9 个完整代码/配置文件，按同名路径覆盖现有工程。不是新架构，也不是可脱离原工程运行的另一个网站。
保留 Next/Vercel、PostgreSQL + Drizzle 采集、Supabase REST 读取、DeepSeek、english_hot_news 表和原黑白样式。无需新建表、迁移数据库或重新安装依赖。

## 为什么原来的“精选”不精选

此前 route.ts 仅在 mode=hot 时执行相关度>=50筛选，mode=featured 没有独立门槛，实际返回所有新闻；旧评分又没有独立的重要性维度。截图中的25分新闻因此会进入精选。

## 新规则（均为 AI 编辑判断，不是概率）

| 页面 | 规则 |
|---|---|
| 新闻动态 / 地区 | 新闻重要性 >=60；按原文时间排序。重要但与韩国关系弱的世界新闻可以出现。 |
| 精选 | 重要性 >=60 + 韩国关联 >=70 + 原文证据 + 具体传导机制 + 把握度非低 |
| 热点榜 | 重要性 >=70 + 韩国关联 >=80，且满足精选证据条件 |
| 韩国舆情 | 独立采样摘要，主题重要性 >=60；不进入新闻精选/热点榜，不把平台热度当作韩国企业影响 |

精选与热点排序：韩国关联60% + 重要性30% + 证据把握度10%。RSS片段的把握度上限为中；仅标题不能进精选。AI摘录须能在原始标题/摘要中找到，高韩国关联还需韩国实体或产业变化依据。
六类新闻和八个地区保留。来源所在地不等于事件地区。并非所有地区每天都有足够重要的新闻，不凑数量。

新版评估存于既有 cluster_urls 的主来源对象 intelligence 中；旧 ai_score 保持原有1–10兼容字段。无需改 schema.ts。
未入选记录仍保留数据库中，避免反复分析付费；公众接口不显示。旧记录没有新版评估时不使用旧分数冒充新版评估。

## 覆盖文件

- app/page.tsx
- app/api/public/[...path]/route.ts
- scripts/run-pipeline.ts
- lib/research/ai.ts
- lib/research/selection.ts
- lib/research/network.ts
- lib/research/community.ts
- lib/research/community-sources.json
- lib/research/feeds.json

未改动 CSS、package.json、部署配置、登录收藏、数据库表结构。新增“韩国舆情”导航与双分数/证据展示，沿用现有卡片样式。日报仍为预留入口。

## 按这个顺序运行（原工程根目录 PowerShell）

先覆盖文件，再检查：

```powershell
npm run pipeline -- --check
```

一次性重评近期旧数据（会使用现有 DeepSeek 额度，最多500次新闻评估；不删除旧数据）：

```powershell
npm run pipeline -- --reassess-existing --days=30 --limit=500
```

此命令读取数据库中的旧记录，不限于还在RSS里的文章。已有新版评估的记录自动跳过；超过批次时可重复运行。只有标题、没有原始片段的老记录会保持低把握度，不用旧AI摘要充当原始证据。

再采集当前新闻并生成社区观察：

```powershell
npm run pipeline
npm run build
```

默认最多300条新闻AI评估，按31个来源各3–8个候选采集，通常低于该上限。每个社区最多一次摘要调用；样本内容未变时复用摘要并更新热度。失败的来源不会取消已完成写入。
日志 important/featured/not_selected 是本次成功处理的记录数，不是全站总数；failed_items/failed_sources 非零会以非零状态退出，但前面成功的记录已保留。

提交所有9个文件（不要只提交旧版三个文件）：

```powershell
git --literal-pathspecs add -- "app/page.tsx" "app/api/public/[...path]/route.ts" "scripts/run-pipeline.ts" "lib/research/ai.ts" "lib/research/selection.ts" "lib/research/network.ts" "lib/research/community.ts" "lib/research/community-sources.json" "lib/research/feeds.json"
git commit -m "Add importance and Korea relevance gates with community briefs"
git push
```

确认 Vercel 对应提交的 Production 部署 Ready，再 Ctrl+F5 刷新。此次有代码变化，需要新部署；以后只采集新数据，无需为每次数据更新部署。采集仍由原有本地 pipeline 执行，没有新增定时任务；网站刷新不会触发付费采集。

## 韩国社区：实际可用范围

1. Theqoo HOT：自动读取公开热门列表的标题、浏览数、评论数。当前页面未取得评论正文；摘要只描述话题和热度，不推测赞成/反对比例。只有图片、没有文本的内容不做图像猜测。
2. GeekNews：自动读取官方 RSS 的技术/创业讨论摘要。RSS没有热度指标，明确标为“讨论样本”，不冒充全站热门。
3. Naver Cafe：已经实现官方 API 适配器。仅在采集机根目录 .env 加入 NAVER_CLIENT_ID 和 NAVER_CLIENT_SECRET 后启用。未配置会跳过，不影响新闻和另外两个社区。官方接口是公开帖子关键词检索，不返回全站热榜或完整评论，不将“检索结果”称为“最热门”。
4. Nate Pann、DC Inside、FM Korea、X：仅列为未启用的参考入口，没有假装已完成接入。Nate Pann当前对通用采集器的robots规则禁止抓取；其他来源尚无此工程已验证的接入方式，X还涉及官方授权/预算。

Naver 凭据仅管理员在采集环境配置，不展示给普通用户，也不需要设置 NEXT_PUBLIC_ 前缀。官方申请入口：https://developers.naver.com/apps/#/register 。选择“搜索”API。

```dotenv
NAVER_CLIENT_ID=你的官方应用ClientID
NAVER_CLIENT_SECRET=你的官方应用ClientSecret
```

以上为可选配置，数据库连接和现有 DeepSeek 配置不变。不向普通用户展示设置表单。

只更新社区：

```powershell
npm run pipeline -- --community-only
```

只更新新闻：

```powershell
npm run pipeline -- --skip-community
```

每个平台保存一份滚动更新的社区观察；更新时保留记录ID、刷新采样时间，目前不是每日历史档案。摘要附主题引用、采样数量和可用的真实热度，明确不代表全体韩国公众观点。当前不提供完整评论分析或跨平台情绪占比。

## 已修正的错误处理

- 连接/响应超时、429、部分5xx有限重试；403/404不无限重试。
- RSS DNS 错误明确写RSS，不再提示修改DATABASE_URL。
- TimeoutError/AbortError（包括先前显示为23的情况）明确归类超时。
- 写入后的REST校验失败，明确“写入已保留，校验未完成/不可见”，不把整轮采集说成全部失败。
- 公开接口读取最多最近2000条记录后筛选，响应附 read_window；历史重评最多检查最近5000条。大规模历史数据需要以后另行分页优化。

详见 SOURCE-CATALOG.md 和 VALIDATION.md。
