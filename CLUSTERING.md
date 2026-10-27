# 同一事件，多家报道

## 这次改了什么

- 旧逻辑只是URL/基本相同标题去重，加少数金球奖事件规则；可能重复，也可能直接跳过第二个来源。
- 新逻辑保留每篇原始报道，后台判断是否同一具体事件，卡片聚合显示“2家媒体 · 3篇报道”，展开列出原文。
- 不改数据库表、连接、依赖、CSS或登录收藏。新增2个TS业务模块，修改页面、公开API、原采集脚本、AI和现有工作流。
- 同一公司的不同公告、提案与通过、预测与结果、独立后续变化分别展示。不把主题当事件。

## 已经安装上一版：最短上线步骤

把本包全部文件按原路径覆盖到工程根目录。保留原.env和其他工程文件。

在原PowerShell工程目录执行：

```powershell
npm run build
git --literal-pathspecs add -- "app/page.tsx" "app/api/public/[...path]/route.ts" "scripts/run-pipeline.ts" "lib/research/ai.ts" "lib/research/clustering.ts" "lib/research/event-matching.ts" ".github/workflows/koreabrief-ingest.yml"
git commit -m "Group reports of the same event and retain source links"
git push
```

如果你还没有提交上一版其他文件，用README.md的15文件完整git add命令，避免遗漏前序升级。

Vercel生产部署Ready后，GitHub → Actions → Korea Brief data update → Run workflow，mode选cluster、limit=300、days=30。已有4项必需Secrets保持不变，没有新增密钥。

本次代码需要部署一次；聚合记录写入后刷新网站即可，不需要为每次数据更新重新部署。普通ingest每轮自动补聚合最多60条旧报道。首次量大可重复运行cluster，不要和本地采集同时写库。

## 如果选择本地先补聚合

```powershell
npm run pipeline -- --check
npm run pipeline -- --cluster-existing --days=30 --limit=300
```

命令只给已有评分的新闻补聚合，不重采RSS、不重写新闻评分、不删除原始记录。最多处理300条候选，默认最多120次聚合AI请求，预算耗尽时剩余记录留待后续。需要更高单轮预算可显式增加--cluster-limit=300（0–1000），会使用更多DeepSeek额度。

日志events_linked表示本次连接到已有事件的报道数；cluster_updated是补写元信息数；cluster_ai_calls是聚合AI请求次数。重复运行会跳过已完成聚合的旧记录；如果出现cluster_failed，原新闻会保留，查看具体日志后再试。

## 实际判断顺序

1. URL规范化、同标题及明确体育结果先用确定性规则。
2. 不同措辞/语言使用已翻译标题相似度、英文实体要素提出候选，限制在72小时内。
3. 疑似同事件交给AI对比两篇原始标题与RSS片段；仅接受高把握度且两边引文可在各自原文中找到的判断。每条最多比较3组。
4. 同事件保留共享ID，公开接口先聚合再统计与分页。新增来源不会单独多占一张卡片。

不确定、超预算或没有足够候选证据时暂时分开。重要更新可以单独成新事件。语义识别仍有误判和漏判可能，尚未经过真实付费AI生产数据验收。

## 展示含义

- “媒体”按链接域名去重，不按RSS栏目名计数；同一域名多篇报道只算1家。
- 摘要、评分及简报对应清楚标出的主报道；其他报道提供进一步阅读，不自动成为“多源核实”或新的综合报告。
- 原采集曾经直接跳过且未保存的来源无法从数据库找回；未来RSS再次出现时才能补收录。
- 公开接口最多读取最近2000条，聚合候选最多5000条，不代表全网或全部历史覆盖。聚合后的条数会减少，这是按事件展示的预期结果。
