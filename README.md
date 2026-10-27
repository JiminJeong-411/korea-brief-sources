## 最新更新：同一事件只展示一张卡片

不同来源的报道保留各自记录，后台识别同一事件并保存共享事件ID，公开接口聚合后再筛选、统计、分页。卡片显示媒体/报道数量，展开列出每篇原文。提案/通过、预测/结果及重要后续进展不按同一主题合并。

**已经替换上个版本的用户：本次需要重新覆盖、提交代码并部署一次，然后在Actions手动运行 mode=cluster。无需新增Secrets、改连接或改表。** 详见CLUSTERING.md。

# Korea Brief：覆盖修正与云端定时采集（2026-10-27 新闻v2 / 社区v2 / 事件聚合v1）

此包按原路径覆盖现有工程，包含15个完整代码/配置文件。保留原有Next/Vercel、PostgreSQL/Drizzle、Supabase REST、DeepSeek及english_hot_news表，不需要改表、删数据、重新设计UI或改本地数据库连接。

## 本次实际发现

线上 /api/public/feed?mode=stream&days=7 返回33条，但 read_window=778、pending_assessment=594；33不是数据库总量。594是整个读取范围内没有新版两层评分的记录，不表示全部来自最近七天。
原31个启用新闻源没有专门体育源；体育规则漏掉金球奖；重要性提示词过度偏商业/制度；每源仅取最前3–8条，可能在AI筛选之前就漏掉重大事件。

## 修正结果

- 启用36个新闻源：原31个，补回BBC Sport、Guardian体育、韩联社体育、Variety及韩联社文化娱乐。
- 新闻重要性按类别判断，不要求体育/文化新闻都能写成企业战略分析。
- 金球奖正式结果、世界级赛事夺冠/重要奖牌/世界纪录有明确的重大事件收录规则。显示规则来源，新闻重要性设最低门槛；不提高韩国关联分。
- 预测、赔率、提名、泄露、球迷投票、进球集锦等不当作正式获奖结果。重要奖项男女同标准。
- 同一届男子/女子金球奖结果分别聚合，其他单项奖不误合并；普通新闻增加后台语义事件聚合，保留各来源原文。
- RSS最多扫描前200条，先找重大结果，再取每源候选（一般12、体育/新文化24、企业公告3）。重大结果优先，其余轮询信源，避免排在末尾的媒体因AI预算耗尽而被饿死。
- 修正韩国实体词表过窄导致LG等直接关联被错误降级的问题；既有错误评估仍需重评，不虚构原文证据。
- v1两层评分继续可读，逐步升级到v2；更早的单一ai_score不冒充两层评分。明显排除的旧体育/琐事写入无AI费用的筛除标记，避免反复占据待处理列表。

## 页面门槛

| 页面 | 门槛 |
|---|---|
| 新闻动态 / 地区 | 公共重要性>=60；无需韩国关联高 |
| 精选 | 重要性>=60、韩国关联>=70、原文证据/具体机制、把握度非低 |
| 热点榜 | 重要性>=70、韩国关联>=80，且满足证据要求 |
| 韩国舆情 | 独立的社区观察；不混入新闻热点 |

不设置每天必须凑多少条的数量指标。重大赛事/奖项报道只提高新闻重要性，不把“全球重要”冒充“韩国相关”。

## 完整覆盖文件

1. app/page.tsx
2. app/api/public/[...path]/route.ts
3. scripts/run-pipeline.ts
4. lib/research/ai.ts
5. lib/research/selection.ts
6. lib/research/sports.ts
7. lib/research/candidates.ts
8. lib/research/network.ts
9. lib/research/community.ts
10. lib/research/community-sources.json
11. lib/research/feeds.json
12. .github/workflows/koreabrief-ingest.yml
13. lib/research/youtube-community.ts
14. lib/research/clustering.ts
15. lib/research/event-matching.ts

普通用户没有新增配置负担；CSS、package.json、schema.ts、登录收藏、日报预留入口均不改。新增工作流是自动运行原采集脚本，不把采集逻辑搬到Vercel接口。

## 最省本地操作的上线顺序

1. 解压到现有工程根目录，覆盖全部同名文件。
2. 按下面命令提交、推送这15个文件。
3. 在GitHub仓库后台填写4项必需Secrets；详见AUTO-UPDATE.md。
4. GitHub Actions → Korea Brief data update → Run workflow，首次选 check，检查通过后选 ingest。
5. 等Vercel对应Production部署Ready，再刷新网站看新的体育内容。
6. 此后每两小时自动采集，且每次最多补评40条近期旧数据，无需电脑开机。后续数据更新不需要反复部署。

```powershell
git --literal-pathspecs add -- "app/page.tsx" "app/api/public/[...path]/route.ts" "scripts/run-pipeline.ts" "lib/research/ai.ts" "lib/research/selection.ts" "lib/research/sports.ts" "lib/research/candidates.ts" "lib/research/network.ts" "lib/research/community.ts" "lib/research/community-sources.json" "lib/research/feeds.json" ".github/workflows/koreabrief-ingest.yml" "lib/research/youtube-community.ts" "lib/research/clustering.ts" "lib/research/event-matching.ts"
git commit -m "Restore major news coverage and schedule cloud ingestion"
git push
```

代码与工作流必须存在于GitHub默认分支；如果当前在功能分支，合并至默认分支后定时任务才会执行。

## 如需现在先用本地补数据（可选）

```powershell
npm run pipeline -- --check
npm run pipeline
npm run pipeline -- --reassess-existing --days=30 --limit=300
npm run pipeline -- --cluster-existing --days=30 --limit=300
npm run build
```

不要每次自动运行 --reanalyze；普通采集/重评会跳过已完成的v2记录。重评会使用原DeepSeek额度；低价值格式筛除不调用AI。此前读取范围的594条待评估可由云端逐批处理，不要求一次本地跑完。

## 社区范围

- Theqoo HOT：公开热门标题、浏览和评论数；没有评论正文，不推测情绪。
- GeekNews：官方RSS帖子摘要，没有热度指标，不称为全站热门。
- Naver Cafe：官方公开帖子检索，需要管理员配置NAVER_CLIENT_ID与NAVER_CLIENT_SECRET；非全站热榜，缺配置自动跳过。
- Nate Pann、DC Inside、FM Korea、X仍未自动接入，不能冒充已接入。

其他细节见AUTO-UPDATE.md、SOURCE-CATALOG.md、VALIDATION.md。

## 本次社区与报告阅读补充

- 当前线上已有Theqoo与GeekNews观测；不是没有接入。
- 增加YouTube韩国地区热门与公开评论抽样适配器，需要管理员设置YOUTUBE_API_KEY；未配置会明确跳过。每次最多20视频，前5个视频各8条relevance顶层评论，不代表评论者国籍或全民意见。
- Theqoo只有标题时，不扩写为未经支持的产业趋势或公众态度；评论观点必须有实际样本及可核对摘录。
- 增加最近最多30个每日摘要快照，从升级后开始积累，不恢复过去已覆盖的历史。原始评论文本不入库。
- 补齐单条AI影响简报的阅读接口与按钮，明确是单一RSS片段分析草稿，取消默认“编辑已核验”。
- 研究报告方法与建议选题见LOGIC-AND-RESEARCH.md；多来源周报/专题研究没有在本次自动实现。

本次有代码更改，需要重新推送与部署；YouTube真实数据还需要官方API凭据。
