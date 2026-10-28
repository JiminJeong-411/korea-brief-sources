# 当前信源与读取范围

截至本轮代码配置，启用新闻源38个。配置启用不等于当前网络读取成功；RSS没有固定的完整24小时覆盖保证。一般最多扫描前200条，编辑配额、重要性评估和去重后才决定展示。

## 新闻RSS

| 来源 | 读取地址 |
| --- | --- |
| Yonhap · 政治 | https://www.yna.co.kr/rss/politics.xml |
| Maeil Business | https://www.mk.co.kr/rss/30000001/ |
| Platum | https://platum.kr/feed |
| Electronic Times | https://rss.etnews.com/Section901.xml |
| CNBC Business | https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147 |
| Financial Times (UK) | https://www.ft.com/rss/home/uk |
| TechCrunch | https://techcrunch.com/feed/ |
| Variety | https://variety.com/feed/ |
| CNA 新加坡 | https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml |
| ANTARA 印尼通讯社 | https://en.antaranews.com/rss/news.xml |
| DW 德国之声 | https://rss.dw.com/rdf/rss-en-all |
| Agência Brasil 巴西通讯社 | https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml |
| MercoPress 南大西洋新闻 | https://en.mercopress.com/rss |
| Africanews | https://www.africanews.com/feed/rss |
| Al Jazeera 半岛电视台 | https://www.aljazeera.com/xml/rss/all.xml |
| BBC 全球新闻 | https://feeds.bbci.co.uk/news/world/rss.xml |
| The Korea Herald · 商业 | https://www.koreaherald.com/rss/kh_Business |
| The Korea Herald · K-pop | https://www.koreaherald.com/rss/kh_Kpop |
| VnExpress International · 商业 | https://e.vnexpress.net/rss/business.rss |
| The Business Times · 新加坡 | https://www.businesstimes.com.sg/rss/top-stories |
| 欧洲央行 · 公告 | https://www.ecb.europa.eu/rss/press.html |
| 欧盟理事会 · 新闻公告 | https://www.consilium.europa.eu/en/rss/pressreleases.ashx |
| 美联储 · 新闻公告 | https://www.federalreserve.gov/feeds/press_all.xml |
| Daily Maverick | https://www.dailymaverick.co.za/dmrss/ |
| RNZ · 商业 | https://www.rnz.co.nz/rss/business.xml |
| The Guardian · 澳大利亚 | https://www.theguardian.com/australia-news/rss |
| The National | https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml |
| Music Business Worldwide | https://www.musicbusinessworldwide.com/feed/ |
| GamesIndustry.biz | https://www.gamesindustry.biz/feed |
| Samsung Newsroom · 全球 | https://news.samsung.com/global/feed |
| SK hynix Newsroom | https://news.skhynix.com/feed/ |
| The Mainichi · 日本英文新闻 | https://mainichi.jp/rss/etc/english_latest.rss |
| Nippon.com · 日本 | https://www.nippon.com/en/feed/ |
| BBC Sport | https://feeds.bbci.co.uk/sport/rss.xml?edition=int |
| The Guardian · 体育 | https://www.theguardian.com/sport/rss |
| Yonhap · 体育 | https://www.yna.co.kr/rss/sports.xml |
| Yonhap · 文化娱乐 | https://www.yna.co.kr/rss/entertainment.xml |
| Soompi · 音乐 | https://www.soompi.com/category/music/feed |

娱乐以K-pop为重点：The Korea Herald官方K-pop RSS、Soompi Music、韩联社娱乐、Music Business Worldwide优先；Variety为补充。重要作品/巡演与产业变化可收录，普通照片、八卦、日常刷榜不作为重点。

## 韩国平台

| 平台 | 范围 |
| --- | --- |
| Theqoo · HOT | 启用配置：HOT 首页标题、站内浏览数与评论数；未采集评论正文，不能概括评论立场 |
| GeekNews · 技术社区 | 启用配置：官方 RSS 的技术、创业讨论摘要；没有平台热度指标，不宣称全站热门 |
| YouTube · 韩国地区热门与评论抽样 | 启用配置：官方Data API韩国地区mostPopular榜单，按视频累计评论/点赞从最多20条中选择5条；每视频relevance和time各20条候选，保留含韩文评论，选6条候选内高互动及2条近期样本。地区与语言不证明用户国籍；累计计数不是24小时新增量。 |
| Naver Cafe · 公开讨论 | 启用配置：官方 API 返回的公开帖子标题与摘要；关键词检索样本，不是全站热榜或评论全集 |
| Nate Pann | 未接入：尚未接入：当前 robots 对通用采集器禁止访问，保留人工阅读入口 |
| DC Inside | 未接入：尚未接入：需确认可稳定使用的数据接口和板块范围 |
| FM Korea | 未接入：尚未接入：需确认可稳定使用的数据接口和板块范围 |
| X · 韩国话题 | 未接入：尚未接入：需管理员配置官方 API 授权与预算 |

有些来源需管理员密钥。Theqoo未读评论；YouTube仅有限候选内高互动与近期评论，国籍未知；Naver不是全站热榜。跨平台趋势使用最近36小时成功采样主题，不冒充韩国公众意见调查。

## 15家公司公开资料

主要数据通路：OpenDART官方公司代码目录、重点公告清单、结构化财务账户。官网补充静态IR目录和链接，不假装读取PDF或动态脚本。

| 公司 | 股票代码 | 官网/IR入口 |
| --- | --- | --- |
| 三星电子 | 005930 | https://www.samsung.com/global/ir/ |
| SK海力士 | 000660 | https://www.skhynix.com/ir/UI-FR-IR01/ |
| 现代汽车 | 005380 | https://www.hyundai.com/worldwide/en/company/ir |
| 起亚 | 000270 | https://worldwide.kia.com/en/company/investor-relations |
| LG新能源 | 373220 | https://www.lgensol.com/kr/investors/electronic-disclosure |
| 三星生物制剂 | 207940 | https://samsungbiologics.com/ir/overview |
| 韩华航空航天 | 012450 | https://www.hanwhaaerospace.com/eng/ir/ir-event.do |
| HD现代重工 | 329180 | https://hd-hhi.com/en/investors/ir-data/earnings-release |
| POSCO Holdings | 005490 | https://www.posco-inc.com/hs91a1-front/app/en/ir/overview.html |
| NAVER | 035420 | https://www.navercorp.com/en/investment/irUpdates |
| Kakao | 035720 | https://www.kakaocorp.com/ir/main?lang=en |
| HYBE | 352820 | https://hybecorp.com/en/investors/archive/result/ |
| SM Entertainment | 041510 | https://www.smentertainment.com/ir/business-results/ |
| JYP Entertainment | 035900 | https://www.jype.com/ko/board/ir-data |
| CJ ENM | 035760 | https://www.cjenm.com/en/investors/ir/ |

金融监督院官方接口文档：
- https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019018
- https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019001
- https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003&apiId=2019020

名单是行业与文化产业重点观察样本，不是市值前15排名。财务口径、更正、API配置和覆盖限制见DAILY-COMMUNITY-COMPANIES.md。
