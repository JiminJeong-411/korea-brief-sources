# 不依赖本地电脑的自动更新

方式：GitHub Actions运行现有scripts/run-pipeline.ts → 写入现有Supabase表 → Vercel网站下次读取时显示。无需新增数据库或将长时间采集改为Vercel接口请求。

## 一次性后台配置

GitHub仓库 → Settings → Secrets and variables → Actions → New repository secret。
从当前本地能正常工作的.env复制对应值，创建下列四项（值不需要发给聊天助手）：

| Secret名称 | 对应值 |
|---|---|
| DATABASE_URL | 已验证通过的同一项目Session pooler PostgreSQL连接串 |
| NEXT_PUBLIC_SUPABASE_URL | 当前Supabase项目URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 当前采集检查和公开接口使用的同名变量值 |
| DEEPSEEK_API_KEY | 当前DeepSeek API key |

这里和Vercel环境变量是两处独立配置；GitHub Actions不会自动读取你F盘的.env，也不会自动继承Vercel变量。保留现有网站变量，不改数据库表名。
如启用Naver Cafe，再添加NAVER_CLIENT_ID、NAVER_CLIENT_SECRET两项。缺失时跳过该来源。

## 启动与验证

- 将包内.github/workflows/koreabrief-ingest.yml提交到默认分支。
- 打开仓库Actions；如GitHub提示启用工作流，启用后选择“Korea Brief data update”。
- Run workflow → mode=check，先确认云端可同时访问PostgreSQL和公开REST；不会调用AI或改记录。
- 检查成功后再Run workflow → mode=ingest，limit=300，启动首次采集。
- 查看日志里的inserted/updated/important/featured及公开读取抽查结果。
- 打开网站“新闻动态→体育”。此次代码需等Vercel生产部署完成；以后纯数据库更新无需部署。

自动运行已在工作流中设置为UTC的23 */2 * * *，即每两小时的第23分钟，避开整点。默认分支上的定时任务不要求本地电脑开机。GitHub调度可能延迟，并非分钟级实时保障。公开仓库长期没有活动（60天）时GitHub可能自动停用定时任务，届时在Actions重新启用。

## 工作流做什么

1. 获取默认分支代码。
2. 在临时目录安装固定版本的现有采集依赖；不构建前端，不改工程package.json，也不依赖锁文件类型。
3. 先做只读连接检查。
4. 运行采集，默认最多300条新闻AI评估；跳过相同v2记录。
5. 再补评最近30天最多40条旧记录；完成后的旧记录下次跳过。
6. 再对最近30天最多60条既有报道补充事件聚合，最多120次额外AI请求；完成的记录跳过。
7. 发布运行状态摘要。失败项会让任务显示失败，但已提交的数据库记录不会回滚。

定时和手动触发共用一个并发组，同一时刻只运行一轮，不取消正在写入的任务。不在数据更新后提交代码，不因每轮采集触发Vercel构建。单轮超时上限110分钟。

## 可选管理员变量

同一Settings页面 → Variables → New repository variable：

| 变量 | 默认 | 作用 |
|---|---:|---|
| INGEST_LIMIT | 300 | 每轮最多新闻AI评估数；1–500 |
| BACKFILL_LIMIT | 40 | 每轮旧数据补评上限；0–100，设0可关闭自动补评 |
| PIPELINE_WORKDIR | . | 工程位于仓库子目录时填写该相对路径；通常不用改 |

需要一次性多补评：Run workflow → mode=reassess，limit=300或500，days=30。不要在定时任务加--reanalyze，避免重复评估已完成数据。

自动运行仍会使用DeepSeek额度与GitHub Actions运行资源；实际开销取决于新增记录、重评数量和账号配额，未声称免费或实时。RSS源可能临时403或超时，日志可区分来源读取、AI、写入与最后REST验证。

官方文档：
- Secrets：https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- 定时事件：https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- 并发控制：https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency

## YouTube可选观测

在Google Cloud启用YouTube Data API v3，创建API key，并在同一GitHub Actions Secrets页面增加YOUTUBE_API_KEY。工作流已经引用，无需给Vercel前端增加该key。未配置则跳过YouTube；Theqoo/GeekNews与新闻继续运行。

一次最多20个KR地区热门视频，最多5×8条公开顶层评论；按平台relevance排序而非随机抽样，不推断评论者国籍。配置后手动Run workflow选择ingest即可开始积累；本包并未替用户创建Google凭据或激活真实API调用。

## 事件聚合升级

本次新增mode=cluster。首次覆盖并推送后，可手动Run workflow → mode=cluster、limit=300、days=30。它不重新抓RSS或重写新闻评分，只为既有报道补充事件指纹与匹配判断，保留每篇来源。每轮最多120次聚合AI请求，未完成的记录留待后续运行；普通ingest之后也会自动逐批补聚合。

新增新闻评估会在原评分请求中提取事件要素；疑似重复时再做最多3组同事件比对，整次采集最多120次聚合请求。云端日常流程含采集、旧评分补评、历史聚合三个阶段，各自有请求预算，AI总开销会高于只做评分。可以手动用cluster模式逐批观察成本；没有新增API服务或密钥。
