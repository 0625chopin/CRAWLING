# 언론사 후보 조사 결과 (실물 검증 자산)

이 문서는 **Task 010A와 Task 013B의 완료 조건을 채우는 데 필요한 실물 언론사 데이터**를 미리 확보해 둔 것이다.
두 Task 모두 "실제로 살아 있는 피드·목록 페이지"가 없으면 DoD 체크박스를 켤 수 없는데, 착수 시점에는 언론사 등록
화면(Task 009)이 아직 열리지 않는다. 그래서 팀장이 착수 전에 후보를 두드려 보고 그 결과를 여기에 남긴다.

이 문서가 막고 있는 것:

- **Task 010A DoD** — 「**EUC-KR로 내려오는 피드**에서 제목이 깨지지 않는다. (UTF-8 피드와 EUC-KR 피드를 각각 1개씩 확인)」
  · 「RSS 2.0 피드와 Atom 피드가 **같은 `FeedItem` 형태**로 나온다」
- **Task 013B DoD 7개 중 4개** — HTML 언론사 1곳 · RSS 요약만 1곳 · RSS 본문 전문 1곳, 그리고 세 경우의 `contentSource` 기록
- **Phase 2 완료 기준** — 「`data/press-sources.json`에 실제 IT/AI 언론사 **최소 3곳**이 등록되어 있다 … **RSS 방식과 HTML 방식이 모두 최소 1곳씩**」

`docs/ROADMAP/work/02.크롤파이프라인.md`의 1~2주차·9~10주차 유휴 대체작업은 **후보를 새로 찾는 일이 아니라
여기 적힌 URL이 그때도 살아 있는지 다시 두드려 보는 일**이다.

---

## 확인 일자와 경고

**확인 일자: 2026-08-10.** 아래 모든 URL·인코딩·건수·셀렉터는 이날 실제로 HTTP 요청을 보내 받은 응답에서 읽은 값이다.
측정 환경은 Windows 11 · Node v24.19.0 · `fetch` + cheerio 1.2.0(프로젝트 설치본)이다.

> ⚠️ **매체가 개편하면 셀렉터가 깨진다.** 언론사 사이트는 예고 없이 마크업을 바꾸고 RSS 엔드포인트를 옮긴다.
> 여기 적힌 셀렉터로 0건이 나오거나 피드가 404를 주면 **그것은 크롤러 버그가 아니라 이 문서가 낡은 것이다.
> 코드를 고치기 전에 아래 「재현 방법」으로 다시 확인하고 이 문서를 갱신한다.** 갱신하지 않고 넘어가면
> 다음 회차가 같은 자리에서 다시 막힌다.

### 재현 방법

```bash
# 피드 응답·헤더·XML 선언 확인
curl -sSL -D - -o feed.xml -A "Mozilla/5.0" "<feedUrl>" | grep -iE "^HTTP/|^content-type"
head -c 200 feed.xml

# HTML 셀렉터 확인 (프로젝트 루트에서 cheerio로)
node -e "const c=require('cheerio');fetch('<url>',{headers:{'User-Agent':'Mozilla/5.0'}}).then(r=>r.text()).then(h=>{const \$=c.load(h);console.log(\$('<selector>').length)})"
```

---

## 후보 표

「요약 평균」은 `description`(Atom은 `summary`/`content`)에서 태그·CDATA·엔티티를 걷어내고 공백을 접은 뒤 잰
글자 수다. Task 010A가 화면에 내보낼 `avgSummaryLength`와 같은 방식으로 쟀다.
**200자 미만이면 「본문 전문 수집 권장」 대상**이고, 그것이 `contentSelector`를 채울지 판단하는 근거다.

| 매체 | 방식 | URL | 인코딩 | 피드 형식 | 요약 평균 | 확인 결과 |
| --- | --- | --- | --- | --- | --- | --- |
| **보안뉴스** | RSS | `https://www.boannews.com/media/news_rss.xml` | **EUC-KR** — 헤더 `text/xml`(charset **없음**), 선언 `<?xml version='1.0' encoding='euc-kr' ?>` | RSS 2.0 (`<item>`, 날짜는 **`<dc:date>`**) | **200자** (199~200) | 200 OK · 10건. UTF-8로 디코딩하면 제목이 통째로 깨진다 |
| **블로터** | RSS | `https://www.bloter.net/rss/allArticle.xml` | UTF-8 — 헤더 `application/xml`(charset 없음), 선언 `utf-8` | RSS 2.0 (`<item>`/`<pubDate>`/`<description>`) | **300자** (299~300) | 200 OK · 50건. 요약이 300자에서 잘린 형태로 일정하다 |
| **아이뉴스24** | RSS | `https://rss.inews24.com/rss/news_it.xml` | UTF-8 — 헤더 `text/xml;charset=UTF-8` + 선언 `utf-8` | RSS 2.0 | **135자** (42~182) | 200 OK · 100건. `https://www.inews24.com/rss/news_it.xml`는 **302로 `rss.` 서브도메인에 넘긴다**(리다이렉트를 따라가야 한다) |
| **ZDNet 코리아** | HTML | `https://zdnet.co.kr/news/?lstcode=0000` | UTF-8 | — (자체 RSS 엔드포인트 없음) | — | 200 OK · 목록에 기사 24건. 서버 렌더 HTML이라 `fetch`만으로도 링크가 보인다 |
| 전자신문 | RSS | `https://rss.etnews.com/Section901.xml` | UTF-8 — 헤더 `text/xml`(charset 없음), 선언 `utf-8` | RSS 2.0 | 250자 (248~250) | 200 OK · 30건. 대안 후보 |
| AI타임스 | RSS | `https://www.aitimes.com/rss/allArticle.xml` | UTF-8 | RSS 2.0 | 289자 (12~300) | 200 OK · 50건. 요약이 12자뿐인 항목이 섞여 있다 |
| IT조선 | RSS | `https://it.chosun.com/rss/allArticle.xml` | UTF-8 | RSS 2.0 | 298자 (190~300) | 200 OK · 50건 |
| 디지털타임스(ICT) | RSS | `https://www.dt.co.kr/rss/google/ict` | UTF-8 | RSS 2.0 | 129자 (127~130) | 200 OK · **427건**. `<content:encoded>`에 본문 전문이 함께 실린다 |
| 테크42 | RSS | `https://www.tech42.co.kr/feed/` | UTF-8 | RSS 2.0 (WordPress) | 104자 (52~216) | 200 OK · 10건 |
| 한국경제 IT | RSS | `https://www.hankyung.com/feed/it` | UTF-8 | RSS 2.0 | **0자 — `<description>` 태그 자체가 없다** | 200 OK · 50건. `title`/`link`/`author`/`pubDate`만 준다. 요약만 경로로는 쓸 수 없다 |
| **네이버 D2** | RSS(Atom) | `https://d2.naver.com/d2.atom` | UTF-8 — 헤더 `application/atom+xml;charset=UTF-8` | **Atom** (`<entry>`/`<updated>`/**`<content type="html">`**) | `<summary>` 없음 · `<content>`에 본문 전문 | 200 OK · 20건. 언론사가 아니라 **Atom 정규화 검증 전용 자산**이다 |

### 표에서 놓치면 안 되는 것

- **EUC-KR 피드는 `Content-Type`에 charset을 싣지 않는다.** 보안뉴스는 헤더가 그냥 `text/xml`이고 인코딩 정보는
  XML 선언에만 있다. 헤더만 보고 판정하면 그대로 UTF-8로 디코딩해 제목이 깨진다. **헤더 → XML 선언 순으로 보되
  선언이 이기게 한다.** 선언은 작은따옴표(`encoding='euc-kr'`)로 온다 — 큰따옴표만 매칭하면 놓친다.
- **날짜 태그와 형식이 매체마다 다르다.** 실측한 값 그대로다.

  | 매체 | 태그 | 값 |
  | --- | --- | --- |
  | 전자신문 · 한국경제 · 아이뉴스24 · ZDNet(FeedBurner) | `<pubDate>` | RFC 822 (`Sun, 9 Aug 2026 22:30:00 +0900`, 아이뉴스24는 `GMT`) |
  | 보안뉴스 | **`<dc:date>`** | RFC 822 (`Sun, 9 Aug 2026 15:45:00 +0900`) |
  | 블로터 · AI타임스 · IT조선 | `<pubDate>` | **비표준** (`2026-08-09 18:00:00` — 타임존 없음) |
  | 디지털타임스 | `<pubDate>` | ISO 8601 (`2026-08-09T21:00:28+09:00`) |
  | 네이버 D2 | `<updated>` | ISO 8601 UTC (`2026-08-05T14:12:35Z`) |

  `publishedAt`을 ISO 8601 문자열로 고정하려면(`docs/CONVENTIONS.md` §3) `new Date(문자열)` 하나로는 부족하다.
  **`<pubDate>`가 없으면 `<dc:date>`를 보고, 파싱에 실패하면 예외 대신 `undefined`로 흘린다.**
- **Atom의 요약은 `<summary>`가 아닐 수 있다.** 네이버 D2는 `<summary>`를 아예 주지 않고 `<content type="html">`에
  본문 전문을 넣는다. 링크도 텍스트가 아니라 `<link rel="alternate" href="...">` **속성**이다. ROADMAP Task 010A의
  「Atom은 `<entry>`/`<updated>`/`<summary>`(또는 `<content>`), 링크도 Atom은 `<link href>` 속성이다」가
  실물에서 그대로 확인됐다.

---

## 세 경로 배정

### ① RSS · 요약만 (`contentSelector` 없음) → **블로터**

요약 평균이 **300자**로 후보 중 가장 길고 편차가 거의 없다(299~300). 본문 전문을 가지러 원문 페이지를 열 이유가
없으므로 이 언론사를 태우면 **Playwright가 한 번도 기동되지 않는다** — Task 013B의 두 번째 DoD가 요구하는 조건이
그대로 성립한다. 요약 하한 50자(ROADMAP Task 013 구현 규칙)에도 여유 있게 걸린다.

AI타임스는 평균 289자로 비슷하지만 요약이 12자뿐인 항목이 섞여 있어 요약 하한 검사에 걸리는 기사가 생긴다.
안정성이 필요한 자리라 블로터를 고른다.

### ② RSS · 본문 전문 (`contentSelector` 있음) → **아이뉴스24**

요약 평균이 **135자**로 200자 기준선 아래다. 「본문 전문 수집 권장」 문구가 실제로 떠야 하는 케이스이므로
Task 010A DoD 네 번째 항목의 검증까지 겸한다.

기사 원문 페이지(`https://www.inews24.com/view/1993173`)를 열어 확인한 결과:

| 셀렉터 | 결과 |
| --- | --- |
| `#articleBody` | `<article class="view font16">` 1개. `.text()` 길이 **17,913자** — 광고(`<ad>`)·`<script>`·`<style>`·추천기사 블록이 전부 섞여 들어온다 |
| **`#articleBody > p`** | **`<p>` 11개 · 합계 1,038자.** 기자 바이라인부터 마지막 문단까지 본문만 정확히 잡힌다 |

**`contentSelector`는 `#articleBody > p`로 잡는다.** 컨테이너를 통째로 잡으면 광고 스크립트 텍스트가 본문에
들어가 키워드 집계를 오염시킨다. 이것이 `lib/crawler/article-parser.ts`가 「스크립트·광고 텍스트 제거」를
규칙으로 갖는 이유의 실물 사례다. **`<p>` 단위로 잡히므로 문단 개행 보존(D6)도 자연스럽게 성립한다.**

같은 기사의 피드 요약은 135자대이고 본문은 1,038자다 — 「같은 기사의 요약보다 본문이 길다」는 DoD가 만족된다.

### ③ HTML 목록 페이지 → **ZDNet 코리아**

`zdnet.co.kr`은 **자체 RSS 엔드포인트를 제공하지 않는다.** 홈페이지 HTML에 `<link rel="alternate"
type="application/rss+xml">`이 없고, `/news/news_xml.asp`·`/rss/allArticle.xml` 등 흔한 경로는 모두 404다.
(FeedBurner 미러 `https://feeds.feedburner.com/zdkorea`는 살아 있고 본문 전문까지 싣지만, 언론사가 아닌
제3자 서비스라 언제 끊겨도 이상하지 않다. HTML 경로 검증용으로는 자체 목록 페이지를 쓴다.)

실제 HTML에서 확인한 셀렉터 4종:

| 필드 | 값 | 확인 결과 |
| --- | --- | --- |
| `listUrl` | `https://zdnet.co.kr/news/?lstcode=0000` | 200 OK · 55.9KB · **서버 렌더 HTML**(Playwright 없이 `fetch`만으로도 링크가 보인다) |
| `articleLinkSelector` | `.newsPost .assetText > a` | **24개 매칭 · 고유 URL 23개**(같은 기사가 한 번 중복). `href`는 `/view/?no=20260810002022` 형태의 **상대 경로**라 `extractLinks($, listUrl, selector)`가 `listUrl` 기준으로 절대화해야 한다 |
| `titleSelector` | `.news_head h1` | 1개 매칭 · 「모노리식3D 특허공세...美ITC, SK하이닉스 2번째 특허침해조사 착수」 |
| `contentSelector` | `#articleBody` | 1개 매칭 · 1,501자. `div[itemprop="articleBody"]`·`.view_cont`와 같은 요소다. 안에 `<script>`가 1개 있고 `#articleBody p`로 좁히면 `<p>` 10개 · 1,291자가 나온다 |

`.assetText`만으로도 24개가 잡히지만 목록 밖에서 27번 쓰이므로 `.newsPost`로 범위를 좁혔다.
`.newsPost a`(68개)나 `.newsPost .assetText a`(44개)는 썸네일 링크와 기자 링크까지 끌어와 중복이 늘어난다.
**`> a`의 자식 결합자를 빼면 안 된다.**

### Atom 정규화 검증 → **네이버 D2**

Task 010A DoD 「RSS 2.0 피드와 Atom 피드가 같은 `FeedItem` 형태로 나온다」를 태울 Atom 피드는 국내 IT **언론사**
중에서는 찾지 못했다(아래 「미확인·미해결」 참고). 언론사가 아닌 네이버 D2 기술 블로그가 유일하게 확인된
살아 있는 국내 Atom 피드다. **`lib/crawler/rss.ts`의 파서 검증에만 쓰고 크롤 대상으로는 켜지 않는다**
(`isActive: false`).

---

## `data/press-sources.json` 시드 예시

`docs/PRD.md` §Press의 `discriminatedUnion` 스키마를 그대로 따른다. `id`는 슬러그 규칙(소문자·영숫자·하이픈,
`docs/CONVENTIONS.md` §3)이다.

> ⚠️ **이 파일을 지금 만들지 않는다.** `data/`는 `.gitignore` 대상이라 커밋되지 않고, 스키마가 확정되는 것은
> Task 005다. Task 013B 담당이 착수 시점에 아래 내용을 손으로 옮겨 적는다.

```json
[
  {
    "id": "bloter",
    "name": "블로터",
    "sourceType": "rss",
    "isActive": true,
    "feedUrl": "https://www.bloter.net/rss/allArticle.xml"
  },
  {
    "id": "boannews",
    "name": "보안뉴스",
    "sourceType": "rss",
    "isActive": true,
    "feedUrl": "https://www.boannews.com/media/news_rss.xml"
  },
  {
    "id": "inews24",
    "name": "아이뉴스24",
    "sourceType": "rss",
    "isActive": true,
    "feedUrl": "https://rss.inews24.com/rss/news_it.xml",
    "contentSelector": "#articleBody > p"
  },
  {
    "id": "zdnet-korea",
    "name": "ZDNet 코리아",
    "sourceType": "html",
    "isActive": true,
    "listUrl": "https://zdnet.co.kr/news/?lstcode=0000",
    "articleLinkSelector": ".newsPost .assetText > a",
    "titleSelector": ".news_head h1",
    "contentSelector": "#articleBody"
  },
  {
    "id": "naver-d2",
    "name": "네이버 D2",
    "sourceType": "rss",
    "isActive": false,
    "feedUrl": "https://d2.naver.com/d2.atom"
  }
]
```

이 5건이 각각 무엇을 검증하는지:

| id | 검증하는 DoD |
| --- | --- |
| `bloter` | Task 013B — RSS 요약만 · Playwright 미기동 · `contentSource: 'rss-summary'` |
| `boannews` | Task 010A — **EUC-KR 피드 제목이 깨지지 않는다** · `<dc:date>` 폴백 |
| `inews24` | Task 013B — RSS 본문 전문 · `contentSource: 'article-page'` · 요약 < 본문 / Task 010A — 「본문 전문 수집 권장」 문구 |
| `zdnet-korea` | Task 013B — HTML 목록 → 링크 → 본문 · Phase 2 「HTML 방식 최소 1곳」 |
| `naver-d2` | Task 010A — Atom → `FeedItem` 정규화 (**크롤 대상 아님**, `isActive: false`) |

`isActive: true`인 IT/AI 언론사가 4곳이므로 Phase 2 완료 기준의 「최소 3곳 · RSS와 HTML 각 1곳 이상」은 충족된다.

---

## 크롤링 예의

**이 도구는 로컬 1인용 테스트 도구다.** 서비스로 배포되지 않고, 수집한 기사는 `data/` 아래 txt로만 남으며
재배포하지 않는다. 그렇더라도 상대 서버는 실제 운영 중인 언론사 서버이므로 아래를 지킨다.

### robots.txt 확인 결과 (2026-08-10)

| 도메인 | `User-agent: *` | 비고 |
| --- | --- | --- |
| `boannews.com` | `Allow:/` | 제한 없음 |
| `bloter.net` | `Disallow: /admin/` | `GPTBot`·`Slurp` 등은 전면 차단, `bingbot`에 `Crawl-delay: 30` |
| `inews24.com` | `Allow:/$` `Allow:/view/` | **기사 경로 `/view/`가 명시적으로 허용**돼 있다. `/view/printxx/`·`/view/emailxx/`는 금지 |
| `zdnet.co.kr` | `Allow: /` · `Disallow: /Include2/user/` `Disallow: /Contents/` | 목록 `/news/`와 기사 `/view/` 모두 허용 |
| `aitimes.com` · `it.chosun.com` | `Disallow: /admin/` | `bingbot`에 `Crawl-delay: 30` |
| `etnews.com` | `Allow: /` | 나머지 규칙은 전부 주석 처리돼 있다 |

**`*` 대상의 `Crawl-delay`를 선언한 곳은 한 곳도 없다.** 30초 지연은 `bingbot`에만 걸린 값이므로 우리에게
적용되지 않지만, 그렇다고 무제한으로 두드려도 된다는 뜻은 아니다. 아래 기본값을 그대로 쓴다.

> ⚠️ **`news.naver.com`은 크롤하지 않는다.** robots.txt가 `User-agent: * / Disallow: /`로 **전면 금지**다.
> `docs/PRD.md` §Press가 HTML 방식의 예로 「RSS가 없거나 폐지된 매체(네이버 뉴스 등)」를 든 것은 방식 설명이지
> 대상 지정이 아니다. HTML 경로 검증은 ZDNet 코리아로 한다.

### 요청 제한

`lib/crawler/config.ts`의 기본값을 그대로 쓴다. 이 값들은 대상 서버 부담 방지용 안전장치이고 화면에 노출하지
않는다(`docs/screens/01-crawl-run.md`).

| 항목 | 환경변수 | 기본값 | 근거 |
| --- | --- | --- | --- |
| 요청 간 지연 | `CRAWL_DELAY_MS` | **500ms** | 초당 2회를 넘지 않는다 |
| 동시성 | `CRAWL_CONCURRENCY` | **2** | 동시에 열어 두는 페이지 2장. 한 언론사에 병렬로 몰리지 않게 한다 |
| 타임아웃 | `CRAWL_TIMEOUT_MS` | 30,000ms | 응답 없는 페이지를 붙들고 있지 않는다 |
| 언론사당 수집 상한 | (요청 본문 `maxArticlesPerPress`) | **20** (상한 100) | 한 번의 실행이 한 매체에서 가져가는 양을 제한한다 |

`CRAWL_USER_AGENT`는 기본값이 일반 Chrome UA다. **특정 봇 이름을 사칭하지 않는다.** 블로터는 `GPTBot`·`Slurp`
등 이름이 붙은 봇을 골라 막고 네이버는 `ClaudeBot`·`GPTBot`을 포함한 AI 크롤러를 명시적으로 막는데, 이 도구는
그중 어느 것도 아니다. **판단이 갈릴 여지를 없애려면 `*`에 허용된 범위 안에서만 움직이면 된다** — UA로 신원을
꾸며서 차단을 우회할 이유가 없고, 그렇게 하지도 않는다.

RSS 경로는 피드 XML 1회 요청으로 기사 목록이 끝나므로 **`contentSelector`가 없는 언론사는 원문 페이지를 한 번도
열지 않는다.** 요약만으로 충분한 매체에 `contentSelector`를 굳이 채우지 않는 것은 코드 단순화만이 아니라
상대 서버 요청 수를 20분의 1로 줄이는 일이기도 하다.

---

## 미확인 · 미해결

정직하게 남긴다. 아래는 **추측으로 채우지 않은 칸**이다.

- **EUC-KR 피드는 보안뉴스 1곳만 찾았다.** 피드 응답을 실제로 받아 본 매체는 전자신문 · 디지털타임스 ·
  블로터 · IT조선 · AI타임스 · 아이뉴스24 · 테크42 · 한국경제 · 데일리시큐 · 데이터넷 ·
  전자부품전문미디어 · IT데일리 · ZDNet 코리아(FeedBurner 미러)이고, **보안뉴스를 제외한 전부가 UTF-8**이다.
  응답을 확인하지 못한 곳도 있다 — **매일경제**(`mk.co.kr/rss/50300009/`)는 Cloudflare 차단 페이지와 함께
  403을 돌려주고, **디지털데일리**(`ddaily.co.kr/rss/allArticle.xml`)는 홈으로 302 리다이렉트하며,
  **케이벤치**(`kbench.com/rss.xml`)는 404다. 이 세 곳의 인코딩은 **미확인**이다.
  보안뉴스가 끊기면 Task 010A의 EUC-KR DoD를 태울 자산이 사라진다 — 그때는 이 문서를 갱신해야 한다.
  (보안뉴스 기사 페이지 `https://www.boannews.com/media/view.asp?idx=...`도 `Content-Type: text/html; Charset=EUC-KR`이라
  **원문 페이지 쪽도 같은 디코딩이 필요**하다. 지금 배정에서는 보안뉴스를 요약만 경로로 쓰므로 원문 페이지를
  열지 않지만, 나중에 `contentSelector`를 붙인다면 이 사실을 잊으면 안 된다.)
- **국내 IT 언론사 중 Atom 피드는 찾지 못했다.** 위 매체 전부가 RSS 2.0이다. 그래서 언론사가 아닌 네이버 D2
  기술 블로그를 Atom 검증 자산으로 썼다.
- **디지털타임스는 RSS 엔드포인트 위치가 바뀌어 있다.** `dt.co.kr/rss/rss.xml`은 404이고, 실제 목록은
  `https://www.dt.co.kr/feed`(HTML 안내 페이지)에서 `https://www.dt.co.kr/rss/google/<섹션>` 형태로 안내된다.
  ICT 섹션만 427건이 한 번에 내려온다 — `maxArticlesPerPress`를 반드시 걸어야 하는 규모다.
- **블로터·AI타임스·IT조선·전자신문·테크42·디지털타임스의 기사 원문 페이지 셀렉터는 확인하지 않았다.**
  요약만 경로로 배정했거나 대안 후보라 원문 페이지를 열 이유가 없었다. **이 매체들에 `contentSelector`를 채워야
  한다면 그때 실제로 열어 확인한다.** 위 세 매체(블로터·AI타임스·IT조선)는 같은 CMS로 보이지만 **확인하지 않은
  추정이므로 셀렉터를 돌려 쓰지 않는다.**
- **아이뉴스24 `#articleBody > p`가 모든 기사에서 성립하는지는 기사 1건으로만 확인했다.** 사진 기사·인터뷰 등
  구조가 다른 유형에서 문단이 `<p>` 밖으로 나갈 수 있다. Task 013B 검증 시 최소 3건 이상 서로 다른 유형의 기사로
  다시 확인한다.
- **ZDNet 목록 페이지의 고유 링크가 23개인 이유(24개 중 1건 중복)는 파악하지 않았다.** 같은 기사가 목록 상단에
  한 번 더 노출된 것으로 보이지만 단정할 근거는 없다. **크롤러 쪽에서 URL 중복 제거를 하면 되는 문제**라
  더 파고들지 않았다.
