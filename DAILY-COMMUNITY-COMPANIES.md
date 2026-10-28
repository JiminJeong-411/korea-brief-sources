# 日报、韩国平台舆情、公司观察：更新与使用

本包是原工程的完整文件覆盖包，不是另起一套工程。保留 Next/Vercel、Supabase public.english_hot_news、现有 PostgreSQL/Drizzle 写入及 DeepSeek；无建表迁移，不替换 package.json、CSS 或登录收藏模块。把包内文件按目录合并到原项目根目录，**不要删除原项目中本包未包含的文件**。

## 一次性更新

在原工程根目录的 PowerShell 中：

```powershell
npm run build
git add app/page.tsx app/components/intelligence-modules.tsx app/api/public lib/research scripts/run-pipeline.ts .github/workflows/koreabrief-ingest.yml README.md AUTO-UPDATE.md SOURCE-CATALOG.md VALIDATION.md LOGIC-AND-RESEARCH.md CLUSTERING.md DAILY-COMMUNITY-COMPANIES.md
git commit -m "Add daily briefs, platform trends and Korean company disclosures"
git push
```

已有依赖已足够，无需更换 package.json 或安装另一套服务。不要提交 .env。等待 Vercel 新部署 Ready。若本地构建失败，先检查错误，不要把失败构建当作验证通过。

在 GitHub 仓库 Settings → Secrets and variables → Actions → **Secrets** 添加：

- **DART_API_KEY**：在 https://opendart.fss.or.kr/ 注册并申请的 API 认证密钥。公司公告与结构化财报必须使用它；原 DeepSeek/Supabase 密钥不能替代。只添加在运行采集器的环境，不用把它放入 NEXT_PUBLIC 变量或前端。
- **YOUTUBE_API_KEY**：如之前没有配置，创建 Google Cloud 项目，启用 YouTube Data API v3，添加该 API 密钥。已有则保留。没有它仍可运行新闻、Theqoo/GeekNews，但不能生成实际 YouTube 评论观察。

原有 DATABASE_URL、NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY、DEEPSEEK_API_KEY 不变。Naver 两项仍为可选。不要重复放入 Variables。当前版本的管理员配置入口是现有采集环境/Actions Secrets；没有新增网页密钥配置表单，普通用户看不到这些配置。

然后 Actions → Korea Brief data update → Run workflow → **ingest**，其他参数保留默认值。本轮会采集新闻和舆情、更新15家公司、完成旧新闻补评与聚合，再生成日报。无须重建 workflow，覆盖 yml 后旧配置继续使用。数据写入后不需要再次部署；新代码第一次上线需要部署。

## 更新节奏和命令

沿用 `23 */12 * * *`：UTC 00:23/12:23，即北京时间 08:23/20:23、韩国时间 09:23/21:23；GitHub 定时任务可能延迟。网页刷新只读取已保存内容，不触发付费采集或AI。

| Actions mode | 本地同等命令 | 执行内容 |
| --- | --- | --- |
| ingest | `npm run pipeline` | 新闻、平台采样、公司、日报；Actions 另外补评/聚合少量历史后最终生成日报 |
| check | `npm run pipeline -- --check` | 只检查原PG/REST连接和表结构，不验证第三方 API 密钥、不写入、不调用AI |
| companies | `npm run pipeline -- --companies-only` | 仅更新公司公开披露与官网索引 |
| community | `npm run pipeline -- --community-only` | 仅更新平台观察和跨平台趋势 |
| daily | `npm run pipeline -- --daily-only` | 从已入库资料生成昨天和今天的日报，不重新抓RSS/公司/平台 |
| reassess | 原 `--reassess-existing` | 保留原新闻重评逻辑 |
| cluster | 原 `--cluster-existing` | 保留原新闻聚合逻辑 |

模式只能选一种。`limit`/`days` 仍用于新闻评估/历史任务，对 companies/daily/community 不控制公司数量或评论数量。`--skip-companies`、`--skip-daily` 可由管理员在本地跳过对应阶段。不要把 pipeline 当作 Git 推送命令。

## 日报如何工作

- 按 **韩国日期**（00:00–24:00 KST）组织，当前日期只到本轮采样时刻，标为更新中；同时生成/更新昨天的版本。不是完整全网24小时抓取。
- 基于当前最近5000条数据库记录中、通过原重要性筛选的新闻，**先按现有事件逻辑合并再选读**。最多8个新闻事件，优先高韩国关联，再保留重大国际事件；不强行填满地区或类别。
- 加入最多4项当日公司重点公告标题、3项当日平台观察。公司公告只取得标题时不推断正文；舆情是有限平台样本。
- 输出“已知事实 / 可能影响 / 继续观察”，每节必须有可验证的逐字引文及真实来源编号；引用存在不代表AI结论已被事实核查。
- 当天版本更新，往日按日期归档；页面日期列表读取最近最多500份已保存日报。不会自动恢复未保存的历史 RSS 或过去评论。
- 资料/版本签名不变时复用AI结果。AI失败则保留来源索引并留待下轮重试，不编造正文。
- 日报不是多来源全文研究报告；当前AI主要使用代表报道的RSS片段及有限的企业/平台资料。合并列出多家媒体不等于独立核实。

## 舆情能做到什么

- Theqoo HOT：热门标题、浏览/评论累计数；**未读取评论正文**，只能判断话题出现，不能推断评论立场。
- GeekNews：官方RSS帖文片段，无全站热度，不能称韩国全网热榜。
- YouTube：官方 `videos.list chart=mostPopular regionCode=KR`，最多20个返回视频，按累计评论/点赞选最多5个视频。此接口榜单范围由YouTube决定，不保证覆盖全站所有热门类别。
- 每视频 `relevance`、`time` 各最多20条顶层评论候选，去重并筛选含韩文的文本；候选内按 `log(1+点赞)+0.8*log(1+回复)` 选6条，再补2条近期评论。高互动是**返回候选内**的相对排序，非全站点赞榜；同文去重，未读取完整回复树。
- 每个观点需要实际评论的逐字短引文，显示点赞、回复、引用链接；数据缺失不补造数字。韩文或KR榜单不能证明用户国籍，不计算“韩国人支持比例”。高互动不等于正确、共识或随机样本。
- 跨平台总览合并最近36小时内成功采样的主题，显示涉及平台数，保留不同意见与证据；没有评论的来源不生成评论观点。
- 同帖子存在前次实际快照时展示计数差，差值只对应所标两个采样时间，不冒充24小时新增。计数下降不显示负增长为真实热度变化。
- 保留30个韩国日期的平台快照。旧版本没有保存的原文/评论证据不会被回填出来。原始作者昵称不保存；仅保留经校验的短引文，不持久化全部候选评论。
- 不包含 Instagram、X、DC Inside、FM Korea、Nate Pann 的评论抓取。Naver Cafe 是可选公开帖子关键词检索，无评论或全站热度。

## 为什么选这15家公司

这是**跨行业核心企业＋文化产业重点观察名单**，不是韩国市值前15名，也不是投资推荐。半导体/汽车/能源材料等体现全球生产网络，文化与平台更贴合本站定位及内容产业职业方向。

| 行业 | 公司（股票代码） |
| --- | --- |
| 半导体与电子 | 三星电子 005930、SK海力士 000660 |
| 汽车与电池 | 现代汽车 005380、起亚 000270、LG新能源 373220 |
| 生物医药 | 三星生物制剂 207940 |
| 装备与材料 | 韩华航空航天 012450、HD现代重工 329180、POSCO Holdings 005490 |
| 平台与AI | NAVER 035420、Kakao 035720 |
| 文化与K-pop | HYBE 352820、SM Entertainment 041510、JYP Entertainment 035900、CJ ENM 035760 |

- 在 `lib/research/companies.json` 管理名单、股票代码、官网地址、关注问题。每次用OpenDART官方公司代码目录解析股票代码对应的法人，**不把集团与上市法人混用**。
- DART清单查询最近450天，每公司最多5页×100条；保存最多40条重点公告。涵盖定期报告、重大事项、投资/并购/供应合同、业绩、更正等；不是全部公告正文采集。达到读取上限时标注覆盖缺口。
- 新公司初始化提取最近2个已披露报告期；以后累积保留最多8期。更正报告接收号变化时重新取数。未披露的季度不猜测、不从旧报表外推。
- 优先CFS合并；只有返回无数据才尝试OFS单体，明确标注。金额存精确十进制字符串，保留原币。营业收入、营业利润、总净利润、资产/负债/权益、经营现金流等只在账户识别无歧义时提取。
- 分清单季、年内累计、期末余额。同比只用同口径的上年数据；基数非正不输出误导性增长率。营业利润率只在币种、期间匹配且收入为正时计算。没有汇率换算、股价估值或买卖评级。
- AI生成有证据引用的条件性战略观察和验证问题，不补造分部收入、管理层指引、订单规模。
- 官网补充静态IR目录与带日期的资料链接；**栏目链接与具体资料分开标注，PDF附件没有自动阅读全文**。动态页面无可用链接时明确说明。初步业绩公告数字若只在正文/PDF里，不假装已被提取；DART标准财报可能比公司业绩预告晚。
- 上游失败保留上次成功的资料和原采集/披露日期，标明本轮未更新。财报数据要真正出现，管理员必须先配置DART密钥并完成一次采集。

## 对GSIS申请的价值

模块本身不是录取保证。更有用的积累是可追溯的长期证据：例如“票价与巡演国际化如何影响K-pop商业模式”“韩国企业如何调整海外生产网络”。日报提供时间线，公司披露提供企业端资料，舆情提供受限的需求/接受度信号。将这些材料交叉核对、明确样本偏差并由你提出研究问题，才能进一步形成有方法的专题成果；不能直接把AI日报标成已完成的学术研究。

## 实现位置

- `lib/research/daily.ts`：日报取材、窗口、现有聚合复用、AI与引文校验。
- `lib/research/community.ts`、`youtube-community.ts`：平台采样、评论排序与证据。
- `lib/research/trends.ts`：跨平台主题总览。
- `lib/research/company-collector.ts`：DART与官网采集、失败保留及AI观察。
- `lib/research/company-finance.ts`：账户识别、精确金额及比较口径。
- `lib/research/records.ts`：原表JSON类型、内部分组标识及韩国日期。
- `app/components/intelligence-modules.tsx`、`app/page.tsx`：黑白页面与导航，复用缓存。
- `app/api/public/[...path]/route.ts`：只读 `/daily`、`/companies`、原 `/feed?mode=community`；普通浏览不调用AI。
- `scripts/run-pipeline.ts`、workflow：自动采集与写入；原新闻筛选/聚类模块保持独立。

新类型 `company_profile` / `daily_digest` / `community_overview` 和原 `community_digest` 存在同一表的原 `cluster_urls` JSON中。内部身份URL仅为稳定去重键，不对外请求，不作为资料出处；前端引用只链接真实官网、DART和平台资料。新闻读取、聚合、补评已排除这些类型，无新增表、服务或数据库连接。
