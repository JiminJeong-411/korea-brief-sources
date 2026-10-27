# 当前启用信源（36个）

原31个保留，增加3个体育源，恢复Variety并增加韩联社文化娱乐。此次新增/恢复的5个源都已实际返回200与可解析RSS。

| 信源 | 地区目录 | 分类提示 | 地址 |
|---|---|---|---|
| Yonhap · 政治 | east-asia | 时政风向 | https://www.yna.co.kr/rss/politics.xml |
| Maeil Business | east-asia | 商业财经 | https://www.mk.co.kr/rss/30000001/ |
| Platum | east-asia | 科技创投 | https://platum.kr/feed |
| Electronic Times | east-asia | 科技创投 | https://rss.etnews.com/Section901.xml |
| CNBC Business | north-america | 经济 | https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147 |
| Financial Times (UK) | europe | 经济 | https://www.ft.com/rss/home/uk |
| TechCrunch | north-america | 科技 | https://techcrunch.com/feed/ |
| Variety | other | 娱乐 | https://variety.com/feed/ |
| CNA 新加坡 | southeast-asia | 综合 | https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml |
| ANTARA 印尼通讯社 | southeast-asia | 综合 | https://en.antaranews.com/rss/news.xml |
| DW 德国之声 | europe | 综合 | https://rss.dw.com/rdf/rss-en-all |
| Agência Brasil 巴西通讯社 | south-america | 综合 | https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml |
| MercoPress 南大西洋新闻 | south-america | 综合 | https://en.mercopress.com/rss |
| Africanews | africa | 综合 | https://www.africanews.com/feed/rss |
| Al Jazeera 半岛电视台 | middle-east | 综合 | https://www.aljazeera.com/xml/rss/all.xml |
| BBC 全球新闻 | None | 综合 | https://feeds.bbci.co.uk/news/world/rss.xml |
| The Korea Herald · 商业 | east-asia | 经济 | https://www.koreaherald.com/rss/kh_Business |
| VnExpress International · 商业 | southeast-asia | 经济 | https://e.vnexpress.net/rss/business.rss |
| The Business Times · 新加坡 | southeast-asia | 经济 | https://www.businesstimes.com.sg/rss/top-stories |
| 欧洲央行 · 公告 | europe | 经济 | https://www.ecb.europa.eu/rss/press.html |
| 欧盟理事会 · 新闻公告 | europe | 政治 | https://www.consilium.europa.eu/en/rss/pressreleases.ashx |
| 美联储 · 新闻公告 | north-america | 经济 | https://www.federalreserve.gov/feeds/press_all.xml |
| Daily Maverick | africa | 综合 | https://www.dailymaverick.co.za/dmrss/ |
| RNZ · 商业 | oceania | 经济 | https://www.rnz.co.nz/rss/business.xml |
| The Guardian · 澳大利亚 | oceania | 综合 | https://www.theguardian.com/australia-news/rss |
| The National | middle-east | 综合 | https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml |
| Music Business Worldwide | None | 娱乐 | https://www.musicbusinessworldwide.com/feed/ |
| GamesIndustry.biz | None | 科技 | https://www.gamesindustry.biz/feed |
| Samsung Newsroom · 全球 | east-asia | 科技 | https://news.samsung.com/global/feed |
| SK hynix Newsroom | east-asia | 科技 | https://news.skhynix.com/feed/ |
| The Mainichi · 日本英文新闻 | east-asia | 综合 | https://mainichi.jp/rss/etc/english_latest.rss |
| Nippon.com · 日本 | east-asia | 综合 | https://www.nippon.com/en/feed/ |
| BBC Sport | other | 体育 | https://feeds.bbci.co.uk/sport/rss.xml?edition=int |
| The Guardian · 体育 | other | 体育 | https://www.theguardian.com/sport/rss |
| Yonhap · 体育 | east-asia | 体育 | https://www.yna.co.kr/rss/sports.xml |
| Yonhap · 文化娱乐 | east-asia | 娱乐 | https://www.yna.co.kr/rss/entertainment.xml |

## 本次真实体育RSS检查

- BBC Sport：70条，包含男子、女子金球奖报道。
- Guardian体育：48条，包含男子金球奖正式结果。
- 韩联社体育：120条，包含金球奖韩语报道。
- 额外核查BBC Football：78条，亦包含相关报道；本版不单独增加此重复覆盖源。
- 韩联社文化娱乐：120条；Variety：10条。
- 上述条数是本次响应快照，不是全站条数，不保证源未来永久可用。

官方结果核对：https://www.uefa.com/uefachampionsleague/news/02aa-21ec47378e70-b29defb43769-1000--harry-kane-wins-2026-men-s-ballon-d-or/

停用源仍保留在feeds.json中及其disabled_reason；历史数据不删除。地区根据事件内容判断，不由媒体总部直接决定。

## 社区v2补充

- Theqoo HOT、GeekNews在本次线上检查中已各有一份真实观测，均未读到评论正文。
- Naver Cafe保留官方检索适配器，需要管理员凭据。
- 新增YouTube Data API韩国地区榜单+有限公开顶层评论适配器，需要YOUTUBE_API_KEY，未做真实授权调用，不标为已激活。
- 不将韩国地区榜单当作韩国国籍样本，不将浏览/评论累计计数当作24小时新增量。
