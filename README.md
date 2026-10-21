# Korea Brief · 全球新闻与韩国企业战略

公开站点：https://korea-brief-liuli.ryuzakiikk.chatgpt.site

主流程：全球公开新闻 → 中文摘要＋地区/分类识别 → 韩国企业相关性评估 → 重点事件 → 有引用的战略报告。研究展示是二级功能，申请作品集仅管理员可见。视觉采用黑、白、灰。

## 功能

| 左侧入口 | 行为 |
|---|---|
| 精选 | 编辑精选或达到AI阈值的新闻，兼有战略报告筛选 |
| 新闻动态 | 原文时间排序、连续加载、搜索、分类、时间筛选；每60秒检查新动态，有新内容时提示而不打断阅读 |
| 热点榜 | AI五维相关性排序，同事件合并；可展开依据、机制、潜在企业与把握度 |
| 日报 | 待开放页面；没有实现日报生成、邮件或订阅任务 |
| 地区 | 东亚、东南亚、欧洲、北美、南美、非洲、大洋洲、中东；每区内可按六类别筛选 |
| 收藏 | 登录用户收藏特定已公开报告，云端跨设备保存；不收藏原文新闻 |

六类别：经济、政治、社会、娱乐、科技、体育。地区允许多值，独立于类别。地区按内容归类；来源所在地只是媒体背景。尚未纳入八区的南亚、中亚等和难以定位的议题进入“跨地区／待归类”。不把印度当作东南亚。

报告分为事实、韩国企业关联、传导机制、潜在机会与风险、行动/验证选项、局限、继续跟踪与原文引用。潜在企业不是已证实参与者。内容经编辑核验后公开。

## 信源与运行状态

目录共136项：默认启用55个经过实际RSS/Atom读取检测的订阅，另有8个官方/媒体资料入口，其余保留为备用、未通过或重复入口。55个默认订阅中，53个在本次检测中有近7日、至少80字符的摘要；韩国经济日报与欧洲央行为标题索引。后台已有的明确关闭配置继续保留，实际启用数以后台为准。

| 地区 | 默认订阅举例 |
|---|---|
| 东亚 | 联韩社、韩国经济日报、Maeil Business、Korea Herald、Korea Times、The Mainichi、Nippon.com、HKFP |
| 东南亚 | CNA、ANTARA、VnExpress、Vietnam News、Inquirer、Bangkok Post、Business Times |
| 欧洲 | FT、DW、France 24、Guardian商业、欧洲央行、欧盟理事会 |
| 北美 | NPR、CNBC、TechCrunch、The Verge、美联储、FTC |
| 南美 | Agência Brasil、MercoPress、Folha市场、Buenos Aires Herald |
| 非洲 | Africanews、AllAfrica、Daily Maverick |
| 大洋洲 | RNZ、RNZ商业、Guardian澳大利亚 |
| 中东 | Al Jazeera、Arab News、The National |

全球/产业层包括 BBC、Variety、Billboard、Music Business Worldwide、Digital Music News、Music Ally、GamesIndustry.biz、WTO、BIS。Samsung与SK hynix官方新闻室标记为企业自述；HYBE、SM、CJ ENM投资者资料、OpenDART等为手工资料入口，不自动冒充新闻正文。

检测来自验证机器的Node fetch，不等于生产Worker可用保证。后台“检测启用信源”会从部署环境请求真实地址，记录状态、条目数和摘要数；采集也会更新状态。失效来源默认关闭，不伪造内容。完整名单、用途和维护方法见 [docs/SOURCES.md](docs/SOURCES.md)，检测记录见 `docs/source-verification.json`，可导入其他RSS阅读器的清单见 `source-catalog.opml`。

复测：`node scripts/verify-sources.mjs lib/research/feeds.json outputs/source-verification.json`。

后台“更新全部启用来源”每次请求8源、每源最多12条，通过浏览器顺序处理剩余批次。保持后台页面打开直到完成；单源失败会记录并继续。

## AI评估与发布

- 每项0—5分：韩国关联30%、经营影响25%、跨境传导20%、时效15%、证据10%；由服务器换算0—100分。
- 热点默认至少50分且韩国关联大于0；AI精选默认至少75分、关联大于0、把握度不为低。编辑可覆盖精选选择。
- 摘要评估每批最多8条，使用实际内容（最多3000字符），校验原文短摘录、地区、类别和输出ID。RSS证据最高3/5，把握度最高为中。
- “一键更新新闻与AI报告”：采集 → 最多3批评估 → 最多3个相关事件报告草稿。报告仍需审核后公开。
- 摘要与评估可按设置自动公开或先保持草稿；新报告始终是草稿。公开API不返回私人申请材料、提示词、原始全文、个人判断或密钥。
- 地区初步关键词归类与AI归类有不同标记，关键词本身不会生成相关度分数。

## 云端、账户与收藏

线上主库为 Cloudflare D1，包括新闻、资料、报告、配置、审核日志和用户收藏。原Supabase只读导入历史资料，不持续回写。普通用户无需配置模型。

使用平台提供的ChatGPT登录识别用户，没有另外开发邮箱密码注册。收藏表 `kb_favorites` 以稳定用户ID和报告ID为联合主键；服务端只按当前会话用户读写，不接受前端指定用户。撤下的报告不再从收藏返回。管理员仍通过所有者身份进入 `/admin`，普通登录用户不会因此获得管理权限。

## 更新机制与当前验证范围

前台每30分钟最多触发一次轮转来源采集，每次最多12个来源，优先覆盖地区、读取较久未检查的来源并分散发布域名；全部失败时5分钟后可重试。它不会调用付费模型。新闻动态页每60秒检查更新，前台轮询不等于后台全天定时任务。

AI由管理员点击触发，尚未配置网站无人访问时的定时采集/评估。本轮信源经过验证机器实读；生产环境各来源的可用性、真实模型调用与正式登录后的跨设备收藏仍需按运行记录核验。本地UI使用明确标注的临时测试资料验收后清除，测试资料不进入迁移或正式站点。

## 完整工程放到F盘

1. 安装 Node.js 22.13+，解压到例如 `F:\KoreaBrief-Global`。
2. 双击 `START-WINDOWS.bat`：首次安装依赖、构建和初始化本地结构，随后启动开发服务。需要正常的包下载网络。
3. 打开终端显示的本地网址（通常 `http://localhost:5173`）。本地便携开发模式的“登录 / 注册”会使用测试用户 `seedy@sites.test`，不连接正式账户。首次创建的 `.dev.vars` 只为该本地测试用户授予开发后台访问。
4. 在 `/admin` 设置模型密钥、关注企业、新闻来源等，然后采集和生成。真实密钥不随源码包提供。正式云端原有密钥设置继续沿用。

本地库和线上库独立。F盘开发不会自动同步正式新闻和收藏。正式读者直接使用公开网址，不依赖你本地运行。

手动命令：

```powershell
cd F:\KoreaBrief-Global
npx --yes pnpm@11.25.0 install
npm run build
Copy-Item .dev.vars.example .dev.vars # 仅第一次本地开发，没有现有配置时
node scripts/init-local.mjs
npm run dev
```

初始化脚本只应用缺少的本地表结构，保留现有数据；不会重放已存在的迁移。迁移 `0000_real_ego.sql` 为原结构，`0001_plain_kitty_pryde.sql` 新增用户收藏。已应用历史迁移不可修改，后续追加。

## 验证与主要文件

```text
node --test tests/domain.test.mjs tests/favorites-db.test.mjs
npx tsc --noEmit --incremental false
npm run build
```

23项测试覆盖身份、公开投影、引用与审核、地区/类别交叉筛选、错误地理归类、评分约束、事件去重和用户收藏的真实SQL隔离。

- `app/page.tsx`、`app/globals.css`：黑白左侧导航、新闻、地区、报告与收藏界面。
- `lib/research/strategy-domain.mjs`：地区、分类、评分、精选与战略验证。
- `lib/research/news.ts`：采集、摘要、相关性评估、事件报告。
- `lib/research/pipeline.ts`：资料、证据快照、模型报告、审核与版本。
- `app/api/me/favorites`：登录用户的云端报告收藏。
- `app/admin`：管理后台、信源编辑、关注企业/行业和阈值。
- `db/schema.ts`、`drizzle`：D1结构与迁移。
- `docs/PRODUCT-STRATEGY.md`：产品评估、与延世GSIS/职业目标的连接及运营建议。

源码包不含node_modules、真实密钥、测试数据或正式数据库副本。Windows启动脚本已做代码检查，未在真实Windows机器执行。

界面信息组织参考：https://aihot.news/ 。
