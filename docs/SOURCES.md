# Korea Brief 信源清单

目录更新：2026-10-22（UTC+8）。保留现有UI，自动采集与官方资料入口分别标记。

本轮在验证机器上实际请求RSS/Atom，核对HTTP、结构、日期和摘要长度；这不等于生产Worker读取保证。生产状态仅由后台“检测启用信源”和实际采集更新。检测只保存统计，不保存第三方全文。

默认启用 **55** 个订阅，其中 **53** 个近期含至少80字符摘要、可进入后续AI候选；另有 **8** 个手工资料入口。订阅可能变化，启用不代表每次可用。

新闻动态按来源轮换，不会一轮读取全部；后台“更新全部启用来源”按8源一批顺序执行。AI仍需后台触发，报告仍需审核。

## 维护方式

- 后台配置可启停和修改地址，保存后生效。显式修改过的开关会保留；目录失效入口默认关闭，备用来源可手动启用。
- 本地复测：`node scripts/verify-sources.mjs lib/research/feeds.json outputs/source-verification.json`。
- `docs/source-verification.json`保存本次检测记录；`source-catalog.opml`导出默认启用的订阅。
- 付费墙、索引型RSS或官方资料入口不会被假装成可自动获取的全文；手工整理原文证据可用于报告。
- 企业新闻室是第一方陈述；AllAfrica等汇集平台需回溯发布方。不同域名不自动证明独立性。

## 目录

| 名称 | 地区 | 状态 | 近期 / AI摘要 | 地址与用途 |
|---|---|---|---|---|
| Daily Maverick | africa | 默认启用 | 36 / 34 | [RSS](https://www.dailymaverick.co.za/dmrss/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Africanews | africa | 默认启用 | 40 / 38 | [RSS](https://www.africanews.com/feed/rss) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| AllAfrica 非洲新闻汇集 | africa | 默认启用 | 33 / 29 | [RSS](https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf) · 非洲区域新闻汇集；可能转载，报告须追溯原始媒体，不能按域名数推断独立性。 |
| Samsung Newsroom · 全球 | east-asia | 默认启用 | 10 / 10 | [RSS](https://news.samsung.com/global/feed) · 三星官方自述：产品、研发、投资和海外市场；涉及成效时需独立证据核对。 |
| SK hynix Newsroom | east-asia | 默认启用 | 10 / 4 | [RSS](https://news.skhynix.com/feed/) · SK hynix官方自述：存储、半导体和海外供应链；涉及成效时需独立证据核对。 |
| Hong Kong Free Press | east-asia | 默认启用 | 30 / 30 | [RSS](https://hongkongfp.com/feed/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| The Mainichi · 日本英文新闻 | east-asia | 默认启用 | 20 / 20 | [RSS](https://mainichi.jp/rss/etc/english_latest.rss) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Nippon.com · 日本 | east-asia | 默认启用 | 12 / 12 | [RSS](https://www.nippon.com/en/feed/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Yonhap · 政治 | east-asia | 默认启用 | 40 / 32 | [RSS](https://www.yna.co.kr/rss/politics.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Maeil Business | east-asia | 默认启用 | 40 / 40 | [RSS](https://www.mk.co.kr/rss/30000001/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| 韩国经济日报 · 经济 | east-asia | 标题索引 | 40 / 0 | [RSS](https://www.hankyung.com/feed/economy) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Platum | east-asia | 默认启用 | 10 / 10 | [RSS](https://platum.kr/feed) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Electronic Times | east-asia | 默认启用 | 30 / 30 | [RSS](https://rss.etnews.com/Section901.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| The Korea Herald · 商业 | east-asia | 默认启用 | 40 / 40 | [RSS](https://www.koreaherald.com/rss/kh_Business) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| The Korea Herald · K-pop | east-asia | 默认启用 | 28 / 28 | [RSS](https://www.koreaherald.com/rss/kh_Kpop) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| The Korea Times · 综合 | east-asia | 默认启用 | 13 / 13 | [RSS](https://feed.koreatimes.co.kr/k/allnews.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Financial Times (UK) | europe | 默认启用 | 10 / 9 | [RSS](https://www.ft.com/rss/home/uk) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| 欧盟理事会 · 新闻公告 | europe | 默认启用 | 20 / 18 | [RSS](https://www.consilium.europa.eu/en/rss/pressreleases.ashx) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| 欧洲央行 · 公告 | europe | 标题索引 | 5 / 0 | [RSS](https://www.ecb.europa.eu/rss/press.html) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| The Guardian · 商业 | europe | 默认启用 | 40 / 40 | [RSS](https://www.theguardian.com/business/rss) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| DW 德国之声 | europe | 默认启用 | 40 / 40 | [RSS](https://rss.dw.com/rdf/rss-en-all) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| France 24 | europe | 默认启用 | 24 / 24 | [RSS](https://www.france24.com/en/rss) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| The National | middle-east | 默认启用 | 40 / 40 | [RSS](https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Al Jazeera 半岛电视台 | middle-east | 默认启用 | 25 / 23 | [RSS](https://www.aljazeera.com/xml/rss/all.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Arab News 沙特 | middle-east | 默认启用 | 40 / 39 | [RSS](https://www.arabnews.com/rss.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| CNBC Business | north-america | 默认启用 | 23 / 23 | [RSS](https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| TechCrunch | north-america | 默认启用 | 20 / 20 | [RSS](https://techcrunch.com/feed/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| The Verge | north-america | 默认启用 | 10 / 10 | [RSS](https://www.theverge.com/rss/index.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| CBS Sports | north-america | 默认启用 | 36 / 32 | [RSS](https://www.cbssports.com/rss/headlines/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| 美联储 · 新闻公告 | north-america | 默认启用 | 1 / 1 | [RSS](https://www.federalreserve.gov/feeds/press_all.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| 美国FTC · 新闻公告 | north-america | 默认启用 | 5 / 5 | [RSS](https://www.ftc.gov/feeds/press-release.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| NPR 美国 | north-america | 默认启用 | 10 / 10 | [RSS](https://feeds.npr.org/1001/rss.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| The Guardian · 澳大利亚 | oceania | 默认启用 | 17 / 17 | [RSS](https://www.theguardian.com/australia-news/rss) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| RNZ · 商业 | oceania | 默认启用 | 17 / 14 | [RSS](https://www.rnz.co.nz/rss/business.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| RNZ 新西兰 | oceania | 默认启用 | 40 / 33 | [RSS](https://www.rnz.co.nz/rss/national.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Agência Brasil 巴西通讯社 | south-america | 默认启用 | 10 / 10 | [RSS](https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| MercoPress 南大西洋新闻 | south-america | 默认启用 | 9 / 9 | [RSS](https://en.mercopress.com/rss) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Buenos Aires Herald | south-america | 默认启用 | 10 / 10 | [RSS](https://buenosairesherald.com/feed) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Folha de S.Paulo · 市场 | south-america | 默认启用 | 40 / 40 | [RSS](https://feeds.folha.uol.com.br/mercado/rss091.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| ANTARA 印尼通讯社 | southeast-asia | 默认启用 | 40 / 40 | [RSS](https://en.antaranews.com/rss/news.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| CNA 新加坡 | southeast-asia | 默认启用 | 20 / 2 | [RSS](https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Bangkok Post · 商业 | southeast-asia | 默认启用 | 10 / 10 | [RSS](https://www.bangkokpost.com/rss/data/business.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| The Business Times · 新加坡 | southeast-asia | 默认启用 | 8 / 5 | [RSS](https://www.businesstimes.com.sg/rss/top-stories) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Philippine Daily Inquirer · 商业 | southeast-asia | 默认启用 | 26 / 26 | [RSS](https://business.inquirer.net/feed) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Vietnam News · 经济 | southeast-asia | 默认启用 | 20 / 19 | [RSS](https://vietnamnews.vn/rss/economy.rss) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| VnExpress International · 商业 | southeast-asia | 默认启用 | 40 / 38 | [RSS](https://e.vnexpress.net/rss/business.rss) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Variety | global | 默认启用 | 10 / 10 | [RSS](https://variety.com/feed/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Billboard | global | 默认启用 | 10 / 10 | [RSS](https://www.billboard.com/feed/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| BBC 全球新闻 | global | 默认启用 | 38 / 35 | [RSS](https://feeds.bbci.co.uk/news/world/rss.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| BIS · 新闻公告 | global | 默认启用 | 1 / 1 | [RSS](https://www.bis.org/doclist/all_pressrels.rss) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| WTO · 新闻 | global | 默认启用 | 3 / 3 | [RSS](https://www.wto.org/library/rss/latest_news_e.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Digital Music News | global | 默认启用 | 40 / 40 | [RSS](https://www.digitalmusicnews.com/feed/) · 音乐版权、平台分发和商业模式；与其他媒体交叉核对。 |
| GamesIndustry.biz | global | 默认启用 | 35 / 35 | [RSS](https://www.gamesindustry.biz/feed) · 游戏发行、平台、并购及行业经营，关注韩国游戏企业跨境机会。 |
| Music Ally | global | 默认启用 | 15 / 15 | [RSS](https://musically.com/feed/) · 音乐营销、流媒体和数字商业，关注K-pop海外发行机制。 |
| Music Business Worldwide | global | 默认启用 | 10 / 8 | [RSS](https://www.musicbusinessworldwide.com/feed/) · 全球音乐产业交易、版权、平台及艺人经营，服务韩国娱乐企业战略观察。 |
| CNBC Africa | africa | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.cnbcafrica.com/feed/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| The Conversation · 非洲 | africa | 已解析·备用 | 19 / 18 | [RSS](https://theconversation.com/africa/articles.atom) · 学者署名评论与背景分析，不能直接等同于事件报道。 |
| LG Newsroom | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.lgnewsroom.com/feed/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Chosun Politics | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.chosun.com/arc/outboundfeeds/rss/category/politics/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Hankyoreh Politics | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.hani.co.kr/rss/politics/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Korea.kr | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.korea.kr/rss/policy.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| National Assembly News | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](http://www.naon.go.kr/rss/feed/news.do) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Bloter Business | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.bloter.net/rss/all.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| TheBell | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.thebell.co.kr/rss/rss.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| ESG Economy | east-asia | 已解析·备用 | 40 / 40 | [RSS](https://www.esgeconomy.com/rss/allArticle.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| ZDNet Korea | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://zdnet.co.kr/RSS/rss_index.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| TechM | east-asia | 已解析·备用 | 40 / 40 | [RSS](https://www.techm.kr/rss/allArticle.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| VentureSquare | east-asia | 已解析·备用 | 30 / 30 | [RSS](https://www.venturesquare.net/feed) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| BizEnter | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](http://enter.etoday.co.kr/rss/rss.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| TenAsia | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://tenasia.hankyung.com/rss/all.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Edaily Star | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.edaily.co.kr/rss/news/news.xml?categoryCode=2101) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| IZM | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](http://izm.co.kr/rss/rss_izm.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Cine21 | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](http://www.cine21.com/rss/rss_news.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| JoyNews24 | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](http://joynews24.com/feed/news.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| MaxMovie | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://news.maxmovie.com/feed) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| JTBC Culture | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://fs.jtbc.co.kr/RSS/culture.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Sports Chosun Ent | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://sports.chosun.com/rss/entertainment.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| ThisIsGame | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.thisisgame.com/rss/news.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Inven | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.inven.co.kr/common/rss/news.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Daily Esports | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.dailyesports.com/rss/allArticle.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| GameMeca | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.gamemeca.com/rss/rss_news.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Ruliweb News | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://bbs.ruliweb.com/rss/news.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| KBS Society | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://fs.kbs.co.kr/RSS/society.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Kukmin Society | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://rss.kmib.co.kr/kmib_society.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Kyunghyang Society | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.khan.co.kr/rss/rssdata/society.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Seoul Shinmun Society | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://rss.seoul.co.kr/seoul_society.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Gallup Korea | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.gallup.co.kr/gallupdb/rss_report.asp) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Korea Foundation | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.kf.or.kr/kf/na/ntt/selectNttRss.do?mi=1128&bbsId=458) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| OhmyNews Culture | east-asia | 已解析·备用 | 20 / 20 | [RSS](https://rss.ohmynews.com/rss/culture.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Hankook Ilbo Culture | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://rss.hankookilbo.com/rss/culture.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| CHA News | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.cha.go.kr/rss/news.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Food&Med | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.foodmed.kr/rss/allArticle.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Naver Sports | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://sports.news.naver.com/rss/index.nhn) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Sports Seoul | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.sportsseoul.com/rss/rss.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| OSEN | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://osen.mt.co.kr/rss/rss_main.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| SpoTV News | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.spotvnews.co.kr/rss/allArticle.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| ManiaTimes | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](http://www.maniareport.com/rss/rss.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| KED Global | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.kedglobal.com/newsRss) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| NHK 日本新闻 | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www3.nhk.or.jp/rss/news/cat0.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| SCMP 南华早报 | east-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.scmp.com/rss/91/feed) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Eurostat · 数据更新 | europe | 已解析·备用 | 40 / 1 | [RSS](https://ec.europa.eu/eurostat/api/dissemination/catalogue/rss/en/statistics-update.rss) · 统计数据更新索引；不作为高频新闻流默认采集。 |
| Anadolu · 商业 | middle-east | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.aa.com.tr/en/rss/default?cat=business) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Middle East Eye | middle-east | 已解析·备用 | 20 / 20 | [RSS](https://www.middleeasteye.net/rss) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| CBC 加拿大商业 | north-america | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.cbc.ca/webfeed/rss/rss-business) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| 澳大利亚储备银行 · 公告 | oceania | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.rba.gov.au/rss/rss-cb-media-releases.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Sydney Morning Herald 澳大利亚 | oceania | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.smh.com.au/rss/feed.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| BERNAMA · 马来西亚 | southeast-asia | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.bernama.com/en/rssfeed.php) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Washington Post Politics | global | 未通过或无近期条目 | 0 / 0 | [RSS](https://feeds.washingtonpost.com/rss/politics) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| NYT Politics | global | 未通过或无近期条目 | 0 / 0 | [RSS](https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Politico | global | 未通过或无近期条目 | 0 / 0 | [RSS](https://rss.politico.com/politics-news.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| The Hill | global | 未通过或无近期条目 | 0 / 0 | [RSS](https://thehill.com/feed/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| WSJ Business | global | 未通过或无近期条目 | 0 / 0 | [RSS](https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Yahoo Finance | global | 未通过或无近期条目 | 0 / 0 | [RSS](https://finance.yahoo.com/news/rssindex) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| MarketWatch | global | 未通过或无近期条目 | 0 / 0 | [RSS](http://feeds.marketwatch.com/marketwatch/topstories/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Wired | global | 已解析·备用 | 40 / 38 | [RSS](https://www.wired.com/feed/rss) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Ars Technica | global | 未通过或无近期条目 | 0 / 0 | [RSS](http://feeds.arstechnica.com/arstechnica/index) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| MIT Tech Review | global | 已解析·备用 | 10 / 10 | [RSS](https://www.technologyreview.com/feed/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| ESPN Top News | global | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.espn.com/espn/rss/news) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Yahoo Sports | global | 已解析·备用 | 40 / 40 | [RSS](https://sports.yahoo.com/rss/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Bleacher Report | global | 未通过或无近期条目 | 0 / 0 | [RSS](https://bleacherreport.com/articles/feed) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Sky Sports | global | 未通过或无近期条目 | 0 / 0 | [RSS](https://www.skysports.com/rss/12040) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Hollywood Reporter | global | 已解析·备用 | 10 / 8 | [RSS](https://www.hollywoodreporter.com/feed/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Deadline | global | 已解析·备用 | 12 / 12 | [RSS](https://deadline.com/feed/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| Entertainment Weekly | global | 未通过或无近期条目 | 0 / 0 | [RSS](https://ew.com/feed/) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| NYT US News | global | 未通过或无近期条目 | 0 / 0 | [RSS](https://rss.nytimes.com/services/xml/rss/nyt/US.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| BBC World | global | 重复入口 | 0 / 0 | [RSS](http://feeds.bbci.co.uk/news/world/rss.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| NPR News | global | 重复入口 | 10 / 10 | [RSS](https://feeds.npr.org/1001/rss.xml) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| The Guardian | global | 已解析·备用 | 40 / 40 | [RSS](https://www.theguardian.com/world/rss) · 区域新闻、经济与社会变化；结合原文识别韩国企业的潜在影响。 |
| OpenDART · 韩国企业披露 | east-asia | 资料入口 | — / — | [官网](https://opendart.fss.or.kr/) · 企业披露原件；Open API需另行申请认证密钥，当前为资料入口。 |
| CJ ENM · 投资者资料 | east-asia | 资料入口 | — / — | [官网](https://www.cjenm.com/en/investors/) · 核对内容、音乐及平台业务的财报和投资者资料；手工补充原文证据。 |
| HYBE · 企业与投资者资料 | east-asia | 资料入口 | — / — | [官网](https://hybecorp.com/) · 从官网IR入口核对财报、业务分部和海外布局；无自动RSS。 |
| SM Entertainment · 企业与投资者资料 | east-asia | 资料入口 | — / — | [官网](https://www.smentertainment.com/) · 从官网IR入口核对业绩、业务结构及公告；无自动RSS。 |
| 欧盟委员会 · Press Corner | europe | 资料入口 | — / — | [官网](https://ec.europa.eu/commission/presscorner/home/en) · 核对贸易、数字市场、竞争与监管政策原件；当前为资料入口。 |
| 加拿大环球事务部 · 参考入口 | north-america | 资料入口 | — / — | [官网](https://www.international.gc.ca/) · 官方政策资料入口；原候选Atom响应不是可解析订阅。 |
| Reuters · 参考入口 | global | 资料入口 | — / — | [官网](https://www.reuters.com/) · 保留原文核对入口，未配置可验证的官方RSS。 |
| AP News · 参考入口 | global | 资料入口 | — / — | [官网](https://apnews.com/) · 保留原文核对入口，不使用第三方RSSHub冒充官方订阅。 |
