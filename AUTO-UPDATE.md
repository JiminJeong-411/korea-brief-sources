# 自动采集与更新

现有 `.github/workflows/koreabrief-ingest.yml` 继续使用，覆盖后无需重建workflow或重配原Secrets。

- 计划 `23 */12 * * *`：北京时间08:23/20:23，韩国时间09:23/21:23。GitHub按UTC在默认分支执行，时间可能延迟，不是按上次手动运行时间倒计时12小时。
- 定时默认ingest：检查PG/REST→新闻与平台/趋势/公司采集→补评旧新闻→聚合旧新闻→生成昨天与今天日报。
- 每条数据写入后保留；某源失败会记失败并可能使任务显示红色，不回滚其他已完成记录。公司缺DART密钥是明确未接入状态，不填充财报。配置了但目录/API失败会显示错误。
- `check` 是只读连接与表结构检查，不测试DART/YouTube；`ingest`是真正采集。`reassess`、`cluster`维持原功能，另有 `companies`、`community`、`daily` 单独模式。
- 一个名为 `ingest` 的job承载多种手动模式。选cluster/daily等时任务可能在Collect or reassess这一步执行，其他只适用于ingest的步骤灰色跳过属于正常行为。左侧Summary写明实际Mode。
- `limit`用于新闻AI评估上限；`days`用于历史任务；不是公司数量、评论数量或日报历史天数。
- 并发组 `koreabrief-database-writer` 防止此workflow同时写入；不主动取消前次运行。
- 只有代码更新要git push/部署；数据更新不需要提交代码或再次部署。

原Secrets：DATABASE_URL、NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY、DEEPSEEK_API_KEY。
新增公司：DART_API_KEY。YouTube评论：YOUTUBE_API_KEY（已有保留）；Naver两项可选。只放Actions Secrets，不需放Variables，也不放前端。

完整接入、命令和成功判断见DAILY-COMMUNITY-COMPANIES.md。普通用户不需要配置任何API。管理员网页密钥表单未新增，配置由现有采集环境管理。
