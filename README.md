# Korea Brief：日报、舆情趋势与公司观察

在原架构上扩展业务：Next/Vercel、Supabase public.english_hot_news、PostgreSQL/Drizzle、DeepSeek 不变。保留黑白UI、K-pop编辑方向、通用聚合v3、每12小时更新和新闻每页10个事件。

**这是完整文件覆盖包，不是独立工程。** 按目录合并覆盖到原工程根目录，保留本包未包含的其他文件、.env、package.json、登录/收藏和既有数据库。不要用解压目录替代整个原工程。

更新步骤、PowerShell提交命令、新增管理员密钥与功能范围，请先阅读 **DAILY-COMMUNITY-COMPANIES.md**。

## 本次交付

- 日报从已入库资料定时生成，按韩国日期归档，区分事实、可能影响与观察问题；页面直接读取，不在打开时调用AI。
- 舆情合并跨平台热门主题，YouTube评论按实际候选内互动与近期样本选取，保留短引文、计数与链接，不将其外推为韩国全民意见。
- 公司观察覆盖15家跨行业上市公司，优先DART公告和结构化财务账户，官网静态资料索引补充；原币金额、单季/累计、合并/单体分别标明，缺失不补零。
- 新模块继续写入原表JSON，不新增表或服务；新闻筛选、补评、聚类不会混入日报或公司记录。
- 新入口沿用5分钟内存缓存。原新闻目录缓存和固定分页继续保留。首次打开或冷启动仍需读取；普通浏览不抓取来源或生成报告。

## 上线概要

1. 合并覆盖，执行原工程 `npm run build`，提交推送；等Vercel新部署Ready。
2. 在原Actions **Secrets** 新增 `DART_API_KEY`；若尚无 `YOUTUBE_API_KEY`，为评论采样补上。现有Supabase/DeepSeek/数据库配置保留。
3. 在现有 Korea Brief data update 手动运行一次 `ingest`，或等定时任务；无需重新创建workflow。采集完刷新网站，数据更新无需再次部署。

本地完整采集仍为 `npm run pipeline`；仅公司/舆情/日报分别加 `--companies-only`、`--community-only`、`--daily-only`。`--check` 仍只检查原数据库通路，不验证第三方API密钥。

## 交付边界

财报来自DART结构化账户，未自动读完全部附注/分部或官网PDF。Theqoo未读取评论；YouTube KR/韩文评论不证明用户国籍。日报为AI辅助草稿，引用校验不等于人工事实核查。专题研究仍需你确定问题、方法并核对证据。

本轮51项业务/接口/流程/交互检查场景、ES2017 strict类型检查、隔离生产构建通过；没有代用户配置密钥、写生产数据、推送Git或部署Vercel。详细记录见VALIDATION.md。包内26个完整代码/配置文件与7份说明，不含.env、依赖、测试夹具或验证工程。
