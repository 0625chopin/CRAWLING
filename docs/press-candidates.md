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

# ⚠️ 새 후보는 등록 전에 이중 인코딩(예: `&amp;quot;`)이 없는지 반드시 스캔한다
# (22일차, 아주경제 재테크 사고 — docs/DECISIONS.draft.크롤파이프라인.md 참고). 한 건이라도
# 나오면 그 매체는 등록하지 않는다.
node -e "const fs=require('fs');const raw=fs.readFileSync('feed.xml','utf-8');const m=[...raw.matchAll(/&amp;(#x[0-9a-fA-F]+|#\d+|nbsp|lt|gt|quot|apos|amp);/g)];console.log('이중 인코딩 매치:', m.length)"
```

### 재확인 로그

**크롤 파이프라인 워크스트림이 010A 착수 전(1일차 유휴 대체작업)에 EUC-KR 후보 1건·UTF-8 후보 1건을 독립적으로
다시 두드려 봤다.** 위 확인 일자와 같은 날이지만, `curl`로 응답 헤더·XML 선언을 뜬 뒤 `TextDecoder` + 설치된
`fast-xml-parser`(5.10.1)로 실제 디코딩·파싱까지 태워 값이 안 바뀌었는지 확인했다.

| 일시 | 대상 | 절차 | 결과 |
| --- | --- | --- | --- |
| 2026-08-10 | 보안뉴스 (EUC-KR) | `curl -D -` 헤더 확인 → 원문 바이트를 `TextDecoder('euc-kr')`로 디코딩 → `XMLParser({ ignoreAttributes: false, cdataPropName: '__cdata', parseTagValue: false })`로 파싱 | 200 OK · `Content-Type: text/xml`(charset 없음) · 선언 `<?xml version='1.0' encoding='euc-kr' ?>`(작은따옴표) 그대로 유지. EUC-KR로 디코딩하면 `<title>보안뉴스 &gt; 최신기사</title>`, 기사 제목·요약·`dc:creator`가 전부 정상 표시됨. UTF-8로 잘못 디코딩하면 그대로 깨짐(예: `���ȴ���`) 재현 확인. `<item>` 10건, 첫 기사에 `<dc:date>Sun, 9 Aug 2026 15:45:00 +0900</dc:date>` 확인 — 표와 오차 없음 |
| 2026-08-10 | 블로터 (UTF-8) | 위와 동일 절차(디코더만 `'utf-8'`) | 200 OK · `Content-Type: application/xml`(charset 없음) · 선언 `encoding="utf-8"`(큰따옴표). `<item>` 50건, `description`(CDATA) 태그 제거 후 글자 수 최소 299 · 최대 300 · 평균 299.7자 — 표의 "300자(299~300)"와 일치. `<pubDate>`는 표대로 비표준 형식(`2026-08-09 18:00:00`, 타임존 없음)으로 확인 |

**판정: 두 후보 모두 URL·인코딩·피드 형식·건수가 문서 기록과 정확히 일치하며 살아 있다. 대체 불필요.**
이 재확인이 Task 010A DoD 「EUC-KR로 내려오는 피드에서 제목이 깨지지 않는다」의 검증 자산이 된다 — 실제로
`fast-xml-parser`로 파싱한 결과물(디코딩된 한글 제목)까지 확인했다는 점에서 「응답이 200이다」보다 한 단계
더 나간 확인이다.

**화면 워크스트림이 4~8주차 유휴 대체작업(Phase 2 게이트용 실데이터 검증)으로 HTML형 목록 셀렉터 1건·RSS
전문형 `contentSelector` 1건을 독립적으로 다시 두드려 봤다.** 위 확인 일자와 같은 날, `curl`로 응답을 뜬 뒤
프로젝트 설치본 `cheerio`(HTML)·`fast-xml-parser`(RSS)로 실제 셀렉터를 태워 값이 안 바뀌었는지 확인했다. 아직
아무도 두드려 보지 않았던 「세 경로 배정」 ②③의 셀렉터가 대상이다.

| 일시 | 대상 | 절차 | 결과 |
| --- | --- | --- | --- |
| 2026-08-10 | ZDNet 코리아 (HTML) | 목록 페이지 재요청 → `cheerio`로 `articleLinkSelector`(`.newsPost .assetText > a`) 재확인 → 샘플 링크 1건(`/view/?no=20260810002022`)의 원문 페이지를 열어 `titleSelector`(`.news_head h1`)·`contentSelector`(`#articleBody`, `#articleBody p`)까지 검증 | 200 OK(목록·기사 모두) · `articleLinkSelector` **24개 매칭·고유 23개**(문서와 정확히 일치, `href`도 동일하게 `/view/?no=...` 상대 경로). 샘플 기사가 문서 예시와 **같은 기사**(제목 "모노리식3D 특허공세...美ITC, SK하이닉스 2번째 특허침해조사 착수")였다 — `titleSelector` 1개 매칭 · `contentSelector`(`#articleBody`) 1개 매칭(전체 1,916자, `<script>` 1개 포함) · `#articleBody p`로 좁히면 **10개 · 1,287자**(문서의 "10개·1,291자"와 공백 트리밍 차이 수준의 오차) |
| 2026-08-10 | 아이뉴스24 (RSS 전문형) | 피드 재요청 → 최신 기사 중 **서로 다른 유형 3건**(IT/기업 뉴스 2건 + 과학 특집 1건)의 원문 페이지를 열어 `contentSelector`(`#articleBody > p`)로 본문을 추출하고, 같은 기사의 피드 요약 길이와 비교 | 200 OK(피드·기사 페이지 모두) · 3건 전부 `#articleBody > p`가 광고·스크립트 없이 문단만 정확히 잡음 — `1993173`(문서 예시 기사, 여전히 최신 목록 1번): 11개 · 1,028자(문서의 "11개·1,038자"와 오차 범위 내 일치) · `1993204`("삼성전자, 美 테일러팹 인턴 선발"): 11개 · 1,316자(피드 요약 120자) · `1993164`("지금은 과학" 특집): 12개 · 1,942자(피드 요약 124자). **3건 모두 본문이 요약보다 길어**, Task 013 DoD 「같은 기사의 요약보다 본문이 길다」가 문서에 없던 두 가지 다른 기사 유형(기업 단신·특집 기사)에서도 성립함을 추가로 확인했다 |

**판정: 두 후보 모두 셀렉터가 문서 기록과 정확히 일치하며 살아 있다. 대체 불필요.** 이 재확인은 아래
「미확인·미해결」에 있던 "`#articleBody > p`가 모든 기사에서 성립하는지 기사 1건으로만 확인했다"는 한계를
서로 다른 유형의 기사 2건을 추가로 열어 부분적으로 해소한다(총 3건 확인 — 사진·인터뷰 전용 레이아웃 기사는
여전히 확인하지 못했으므로 그 항목 자체는 남겨 둔다).

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

## 013B 검증용 시드 (4일차 기록)

**4일차, 크롤 파이프라인**이 위 「`data/press-sources.json` 시드 예시」를 실제로 `data/press-sources.json`에
그대로 옮겨 적었다(경고문의 지시대로 착수 시점에 손으로 채웠다). `data/`는 `.gitignore` 대상이라 커밋되지
않으므로, 다른 머신에서 재현하려면 아래 5건을 그대로 다시 써넣으면 된다 — 내용은 위 JSON 예시와 동일하다.

| id | name | sourceType | 핵심 필드 | isActive |
| --- | --- | --- | --- | --- |
| `bloter` | 블로터 | rss | `feedUrl` (contentSelector 없음 → 요약만) | true |
| `boannews` | 보안뉴스 | rss | `feedUrl`(EUC-KR) | true |
| `inews24` | 아이뉴스24 | rss | `feedUrl` + `contentSelector: "#articleBody > p"` | true |
| `zdnet-korea` | ZDNet 코리아 | html | `listUrl` + `articleLinkSelector` + `titleSelector` + `contentSelector` | true |
| `naver-d2` | 네이버 D2 | rss | `feedUrl`(Atom) — 크롤 대상 아님, 파서 검증 전용 | false |

**세 형태(HTML · RSS 요약만 · RSS 본문 전문) 커버리지**: `zdnet-korea`가 HTML, `bloter`가 RSS 요약만
(`contentSelector` 없음), `inews24`가 RSS 본문 전문(`contentSelector` 있음)을 각각 담당해 Task 013B DoD가
요구하는 세 경로가 전부 실물로 선다. `isActive: true`인 3곳(bloter·boannews·inews24 중 RSS 2곳 + html 1곳)이
Phase 2 완료 기준("RSS·HTML 각 1곳 이상, 최소 3곳")도 함께 만족한다.

**검증 방법과 결과**: `lib/storage/press-repository.ts`의 `listPress()`를 임시 vitest 케이스로 호출해
① 전체 5건이 zod 검증(`pressSchema`)을 통과하고, ② `zdnet.sourceType === 'html'`로 좁혔을 때
`articleLinkSelector`·`contentSelector`에 타입 에러 없이 접근되며, ③ `inews24.sourceType === 'rss'`로 좁혔을
때 `contentSelector`가 값을 갖고 `bloter`는 `undefined`이고, ④ `listPress({ activeOnly: true })`에서 `naver-d2`가
빠지는 것을 확인했다. 검증용 테스트 파일은 확인 직후 삭제했다(회귀 스위트에 남기지 않는다 — 이 파일은
「데이터가 이렇게 들어있다」를 확인하는 1회성 스팟체크이지, `lib/` 순수 함수 회귀 테스트가 아니다).

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
- **아이뉴스24 `#articleBody > p`는 이제 서로 다른 유형 3건(기업 단신 2건 + 특집 기사 1건, 위 「재확인 로그」
  2026-08-10 화면 워크스트림 항목)에서 성립을 확인했지만, 사진 기사·인터뷰처럼 문단이 `<p>` 밖으로 나갈 수 있는
  유형은 여전히 확인하지 못했다. Task 013B 검증 시 그 유형을 마저 확인한다.
- **ZDNet 목록 페이지의 고유 링크가 23개인 이유(24개 중 1건 중복)는 파악하지 않았다.** 같은 기사가 목록 상단에
  한 번 더 노출된 것으로 보이지만 단정할 근거는 없다. **크롤러 쪽에서 URL 중복 제거를 하면 되는 문제**라
  더 파고들지 않았다.

---

## 카테고리 확장 후보 조사 — 엔터·스포츠·경제·증권 (Task 027, 21일차)

**확인 일자: 2026-08-11.** Task 026(저장소 계층)이 `Press.category`(`it-ai`·`entertainment`·`sports`·
`economy`·`stock`)를 도입하면서, 지금까지 IT/AI 전용이던 이 표에 나머지 4개 카테고리 후보를 더한다.
측정 환경은 위 §확인 일자와 동일(Windows 11 · Node v24.19.0 · `fetch` + `fast-xml-parser` 5.10.1). 재현
방법은 위 §재현 방법을 그대로 따른다.

**RSS 우선 원칙(팀장 지시)을 그대로 지켰다** — 4개 카테고리 12곳 전부 RSS이고 HTML 방식은 0곳이다(카테고리당
상한 1곳 조건에 여유 있게 들어온다). 아래에 적히지 않은 죽은 URL(404·의심스러운 리다이렉트)은 「죽은 후보」
절에 그 사실만 남기고 표에서 뺐다 — 있지도 않은 값으로 채우지 않는다.

### 후보 표

「요약 평균」은 기존 표와 같은 방식으로 쟀다 — `description`에서 태그·CDATA·엔티티를 걷어내고 공백을 접은
글자 수, `fast-xml-parser`로 실제 파싱한 값이다. 전부 UTF-8이라 이번에는 EUC-KR 디코딩 이슈가 없었다.

| 카테고리 | 매체 | URL | 인코딩 | 아이템 수 | 요약 평균(범위) | 날짜 태그 | 확인 결과 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 엔터 | **연합뉴스 연예** | `https://www.yna.co.kr/rss/entertainment.xml` | UTF-8(`application/xml;charset=UTF-8`) | 120건 | 76.1자(40~83) | `<pubDate>` RFC 822 | 200 OK |
| 엔터 | **SBS 방송/연예** | `https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=14&plink=RSSREADER` | UTF-8(`text/xml;charset=UTF-8`) | 29건 | 204.2자(81~415) | `<pubDate>` RFC 822 | 200 OK. `robots.txt`가 이 RSS 엔드포인트를 자체 사이트맵 목록에 올려 둘 만큼 개방적 |
| 엔터 | **스포츠경향 연예** | `https://sports.khan.co.kr/rss/entertainment` | UTF-8(`application/xml; charset=UTF-8`) | 30건 | 203자(203~203, 300자 근방에서 균일 절단) | `<dc:date>` ISO 8601 | 200 OK — robots.txt 주의(아래 별도 항목) |
| 스포츠 | **연합뉴스 스포츠** | `https://www.yna.co.kr/rss/sports.xml` | UTF-8 | 120건 | 69.6자(6~83) | `<pubDate>` RFC 822 | 200 OK |
| 스포츠 | **SBS 스포츠** | `https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=09&plink=RSSREADER` | UTF-8 | 29건 | 102.8자(63~600) | `<pubDate>` RFC 822 | 200 OK |
| 스포츠 | **스포츠경향 스포츠종합** | `https://sports.khan.co.kr/rss/sports-all` | UTF-8 | 30건 | 203자(균일 절단) | `<dc:date>` ISO 8601 | 200 OK — robots.txt 주의 |
| 경제 | **연합뉴스 경제** | `https://www.yna.co.kr/rss/economy.xml` | UTF-8 | 120건 | 73.5자(1~83) | `<pubDate>` RFC 822 | 200 OK |
| 경제 | **SBS 경제** | `https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=02&plink=RSSREADER` | UTF-8 | 29건 | 85.3자(63~147) | `<pubDate>` RFC 822 | 200 OK |
| 경제 | **아시아경제 경제** | `https://view.asiae.co.kr/rss/economy.htm` | UTF-8 | 100건 | 232.3자(37~279) | `<pubDate>` | 200 OK |
| 증권 | **아시아경제 증권** | `https://view.asiae.co.kr/rss/stock.htm` | UTF-8 | 100건 | 224.5자(0~252) | `<pubDate>` | 200 OK. **일부 항목은 요약이 0자**(빈 `<description/>`) — 그 항목만 개별 실패(50자 미달)로 걸러진다, 언론사 전체 실패가 아니다 |
| 증권 | **이투데이 마켓** | `https://rss.etoday.co.kr/eto/market_news.xml` | UTF-8 | 10건(발행 주기상 적음) | 72.8자(69~85) | `<pubDate>` RFC 822 | 200 OK. 같은 도메인의 `eto/economy_news.xml`은 확인 시점에 **0건**(§죽은 후보) |
| 증권 | **인포스탁데일리 전체기사** | `https://www.infostockdaily.co.kr/rss/allArticle.xml` | UTF-8(`application/xml`, charset 헤더 없음·XML 선언은 `utf-8`) | 50건 | 299.8자(299~300, 300자 절단) | `<pubDate>` **비표준**(`2026-08-11 07:44:37`, 타임존 없음) | 200 OK. 매체 자체가 증권/투자 전문지라 "전체기사" 피드가 곧 증권 뉴스다 |

### `sports.khan.co.kr` robots.txt 주의(팀장 결정 D-XXX와 같은 판단 기준 적용)

```
User-agent: AhrefsBot
User-agent: SemrushBot
User-agent: ClaudeBot
User-agent: GPTBot
User-agent: ChatGPT-User
User-agent: Google-Extended
User-agent: Bytespider
Disallow: /
User-agent: *
Disallow: /search/
Disallow: /news/page/
Disallow: /*enlarge_image_worldcup.html
```

이름이 붙은 봇(ClaudeBot 포함)을 전면 차단하지만 **`*`는 `/search/`·`/news/page/` 등 일부 경로만 막고 RSS·
기사 경로는 열려 있다** — 위 §크롤링 예의에서 블로터가 `GPTBot`·`Slurp`를 이름으로 막고도 `*`가 열려 있어
채택된 것과 **정확히 같은 구조**다. 이 도구의 `CRAWL_USER_AGENT`는 일반 Chrome UA이고 어떤 봇 이름도
사칭하지 않으므로(§크롤링 예의 "특정 봇 이름을 사칭하지 않는다"), `*`에 허용된 범위 안에서 스포츠경향을
쓰는 것은 그 원칙과 어긋나지 않는다. 다만 이름이 명시적으로 AI 크롤러를 겨냥한 목록(ClaudeBot·GPTBot·
Google-Extended·Bytespider가 한 그룹)이라는 점은 기록해 둔다 — 이후 이 언론사의 `*` 규칙이 좁아지면
가장 먼저 재검토해야 할 후보다.

### 나머지 robots.txt 확인 결과

| 도메인 | `User-agent: *` | 비고 |
| --- | --- | --- |
| `yna.co.kr` | `Allow:/` | `/view/AEN*` 등 통신사 배포용 경로만 일부 차단, RSS·일반 기사 무관 |
| `news.sbs.co.kr` | `Allow: /*` | 가장 개방적 — RSS 엔드포인트 자체를 `Sitemap:` 목록에 올려 둠 |
| `view.asiae.co.kr` | `Disallow: /search /realtime /photo/photo_list.htm`(그 외 허용) | RSS·기사 경로 무관 |
| `rss.etoday.co.kr`(`etoday.co.kr`) | `Allow: /` | 제한 없음 |
| `infostockdaily.co.kr` | `Disallow: /admin/` | 제한 없음(RSS·기사 경로 무관) |

`*` 대상 `Crawl-delay`를 선언한 곳은 여기서도 없다 — 위 §요청 제한의 프로젝트 기본값(지연 500ms·동시성
2)을 그대로 쓴다.

### 죽은 후보 (문서에 남기되 표에는 넣지 않음)

두드려 봤지만 쓸 수 없었던 후보를 그대로 남긴다 — 조용히 빼면 다음 회차가 같은 URL을 다시 두드린다.

| 후보 | URL | 결과 |
| --- | --- | --- |
| 스포츠서울 | `sportsseoul.com/rss/allArticle.xml` | 404 응답 본문에 출처 불명의 외부 로더 스크립트(`html-load.com`)가 삽입돼 있다 — 단순 404가 아니라 도메인 자체가 의심스러운 상태라 후보에서 완전히 제외했다 |
| 한국경제(전 섹션: 연예·스포츠·경제·증권) | `hankyung.com/feed/{entertainment,sports,economy,finance}` | 전부 200 OK지만 **`<description>` 태그 자체가 없다**(기존 표의 "한국경제 IT" `0자` 사례와 동일 패턴) — `contentSelector` 없이는 모든 기사가 50자 미달로 실패해 전멸한다. 실제 셀렉터를 조사하지 않아 이번 배정에서는 후보에서 뺐다 |
| 서울경제(경제·금융·마켓시그널) | `sedaily.com/rss/{economy,finance,market}` | 전부 200 OK지만 한국경제와 같은 이유로 `<description>` 없음 |
| 이투데이 경제 | `rss.etoday.co.kr/eto/economy_news.xml` | 200 OK이지만 확인 시점 **`<item>` 0건** — 죽은 URL은 아니나 지금 당장은 쓸 수 없어 「이투데이 마켓」으로 대체했다 |
| OSEN·텐아시아·스타뉴스·마이데일리·뉴스1·뉴스핌·뉴시스·조선비즈·헤럴드경제biz·파이낸셜뉴스 | 각 매체 추정 RSS 경로 다수 | 404 또는 HTML 안내 페이지로 리다이렉트 — 짧은 시간 안에 정확한 엔드포인트를 찾지 못했다. 후보가 더 필요해지면 각 사이트의 `/rss` 안내 페이지를 먼저 열어 실제 경로를 확인한다(이번 조사에서 `hankyung.com/feed`·`sedaily.com/rss`·`asiae.co.kr/rss/`처럼 안내 페이지를 먼저 여는 방식이 맹목적 URL 추정보다 훨씬 잘 맞았다) |
| `khan.co.kr`(경향신문 본지, `sports.khan.co.kr`와 다른 도메인) | `khan.co.kr/rss` | 403 — 별도 봇 차단으로 보이나 원인을 더 파고들지 않았다 |

### 왜 이 12곳을 골랐는가

- **RSS 우선**: HTML 방식은 셀렉터가 쉽게 깨지고(§표에서 놓치면 안 되는 것 참고) 조사 시간도 많이 든다.
  12곳 전부 RSS라 이번 조사에서 HTML 후보를 아예 만들지 않았다 — 상한(카테고리당 최대 1곳)을 넘길 이유가
  없었다.
- **한국경제·서울경제를 뺀 이유**: 두 매체는 사실상 전 섹션에서 `<description>`을 아예 안 준다. IT/AI
  카테고리에서 이미 같은 문제가 확인된 매체(§후보 표 "한국경제 IT" 행, "요약만 경로로는 쓸 수 없다")라
  일관된 판단이다. `contentSelector`를 붙여 본문 전문 경로로 쓸 수는 있지만, 그러려면 원문 페이지 셀렉터를
  실측해야 하는데 이번 조사 범위(카테고리당 최소 3곳 확보) 안에서는 다른 대안이 이미 충분했다.
- **연합뉴스·SBS를 3개 카테고리씩 재사용한 이유**: 언론사 자체는 재사용해도 **Press 레코드는 카테고리마다
  별개**다(`docs/CONVENTIONS.md` — "언론사 1곳 = 카테고리 1개", `lib/types/press.ts` 주석). 두 매체 모두
  섹션별 RSS가 이미 잘 갖춰져 있고 요약 품질도 일관되게 좋아, 카테고리마다 다른 매체를 억지로 찾기보다
  검증된 소스를 반복 활용하는 쪽이 안정적이라고 판단했다. 다만 「3곳」의 취지(서로 다른 언론사 확보)를
  지키기 위해 매 카테고리마다 **연합뉴스·SBS 외에 최소 1곳은 완전히 다른 매체**(스포츠경향/아시아경제/
  인포스탁데일리)를 넣었다.

### `data/press-sources.json` 추가분 — 등록 방법과 id

기존 5곳(§`data/press-sources.json` 시드 예시)을 지우지 않고 아래 12곳을 더한다. `POST /api/press`로
등록했다(파일을 손으로 편집하지 않음 — 스키마 검증을 거치는 쪽이 안전하다는 팀장 권고를 따랐다).

| id | name | category | feedUrl |
| --- | --- | --- | --- |
| `yna-entertainment` | 연합뉴스 연예 | entertainment | `https://www.yna.co.kr/rss/entertainment.xml` |
| `sbs-entertainment` | SBS 연예 | entertainment | `https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=14&plink=RSSREADER` |
| `khan-entertainment` | 스포츠경향 연예 | entertainment | `https://sports.khan.co.kr/rss/entertainment` |
| `yna-sports` | 연합뉴스 스포츠 | sports | `https://www.yna.co.kr/rss/sports.xml` |
| `sbs-sports` | SBS 스포츠 | sports | `https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=09&plink=RSSREADER` |
| `khan-sports` | 스포츠경향 스포츠 | sports | `https://sports.khan.co.kr/rss/sports-all` |
| `yna-economy` | 연합뉴스 경제 | economy | `https://www.yna.co.kr/rss/economy.xml` |
| `sbs-economy` | SBS 경제 | economy | `https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=02&plink=RSSREADER` |
| `asiae-economy` | 아시아경제 경제 | economy | `https://view.asiae.co.kr/rss/economy.htm` |
| `asiae-stock` | 아시아경제 증권 | stock | `https://view.asiae.co.kr/rss/stock.htm` |
| `etoday-market` | 이투데이 마켓 | stock | `https://rss.etoday.co.kr/eto/market_news.xml` |
| `infostock-daily` | 인포스탁데일리 | stock | `https://www.infostockdaily.co.kr/rss/allArticle.xml` |

전부 `sourceType: "rss"`이고 `contentSelector`는 비웠다(요약만 경로 — 12곳 모두 요약 평균이 50자 하한을
넉넉히 넘는다).

**`lib/storage/press-defaults.ts`의 `DEFAULT_PRESS_SOURCES`는 채우지 않았다.** 21일차에 이 12곳으로
채우는 안을 검토했지만 팀장이 기각했다 — `DEFAULT_PRESS_SOURCES`가 빈 배열인 것은 누락이 아니라
**`I-037`**(`docs/ISSUES.md` — "언론사 0건에서 시작하도록 의도한 빈 배열", 화면 설계서 04의 빈 상태
전제를 코드화한 것)이 15일차에 "결함 아님"으로 확정한 설계이고, `lib/storage/press-repository.test.ts`
가 "완전 초기 상태에서 `listPress()`가 빈 배열을 반환한다"를 여러 케이스에서 코드로 못박아 두고 있다.
실제로 채워서 돌려 보면 그 6개 케이스가 깨진다 — 카테고리 확장의 부산물로 화면 워크스트림 소유의 그
설계를 조용히 뒤집을 자리가 아니라는 것이 팀장 판정이다(`docs/ISSUES.draft.크롤파이프라인.md`).

즉 이 12곳이 사용자에게 실제로 노출되는 경로는 **오직 `data/press-sources.json`**(위 등록 방법)뿐이다.
완전 초기 상태(파일을 지우고 새로 시작)에서는 여전히 언론사 0건이고, 이 17곳(기존 5 + 신규 12)을 전부
손으로 다시 입력해야 한다 — 그 입력 부담을 시드로 풀지 가져오기 기능으로 풀지는 I-037의 빈 상태 설계를
지키면서 화면 워크스트림과 함께 다음 회차에 검토할 문제로 남겨 두었다.

---

## 표본 확충 조사 — 카테고리당 6곳 이상 (Task 030, 22일차)

**확인 일자: 2026-08-11.** 사용자 요청("정확한 분석을 위해 언론사를 많이 추가해줬으면 좋겠다")에 따라
카테고리마다 3곳이던 표본을 **최소 6곳**으로 늘렸다. 측정 환경은 위 §확인 일자와 동일
(Windows 11 · Node v24.19.0 · `fetch`/`curl` + `fast-xml-parser` 5.10.1). 재현 방법은 위 §재현 방법을
그대로 따랐고, 「요약 평균」도 기존 절과 같은 방식(태그·CDATA·엔티티 제거 후 공백을 접은 글자 수,
`fast-xml-parser`로 실제 파싱)으로 쟀다.

**21일차 「죽은 후보」에 실린 한국경제·서울경제·스포츠서울은 다시 두드리지 않았다** — 사유(item 레벨
`<description>` 없음·의심스러운 리다이렉트)가 URL이 아니라 매체 자체의 구조적 특성이라 오늘 다시 확인해도
같은 결과가 나올 것이 명백하기 때문이다. **RSS 우선 원칙도 그대로 지켰다** — 아래 17곳 전부 RSS다.

### 새로 등록한 17곳

| 카테고리 | 매체 | URL | 인코딩 | 아이템 수 | 요약 평균(범위) | 날짜 태그·형식 | 확인 결과 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IT/AI | **전자신문** | `https://rss.etnews.com/Section901.xml` | UTF-8(`text/xml`, charset 없음·선언 `utf-8`) | 30건 | 249.8자(248~250) | `<pubDate>` RFC 822 | 200 OK |
| IT/AI | **AI타임스** | `https://www.aitimes.com/rss/allArticle.xml` | UTF-8(`application/xml`) | 50건 | 299.8자(299~300) | `<pubDate>` 비표준(`2026-08-11 07:00:00`) | 200 OK |
| IT/AI | **IT조선** | `https://it.chosun.com/rss/allArticle.xml` | UTF-8(`application/xml`) | 50건 | 299.8자(299~300) | `<pubDate>` 비표준 | 200 OK |
| IT/AI | **테크M** | `https://www.techm.kr/rss/allArticle.xml` | UTF-8(`application/xml`) | 50건 | 298.6자(240~300) | `<pubDate>` 비표준 | 200 OK. AI타임스·IT조선과 같은 CMS(경로 패턴 `/rss/allArticle.xml`, 채널 구조 동일) |
| 엔터 | **노컷뉴스 연예** | `https://rss.nocutnews.co.kr/category/entertainment.xml` | UTF-8(`text/xml`) | 50건 | 139.0자(24~200) | `<pubDate>` **기형**(`Tue, 11 08 2026 07:00:00 +0900` — 요일 뒤에 월 이름 없이 숫자만 두 개) | 200 OK. 날짜 파싱이 실패하면 예외 대신 `undefined`로 흘리는 기존 규칙(§표에서 놓치면 안 되는 것)이 그대로 걸리는 실사례 |
| 엔터 | **파이낸셜뉴스 연예** | `https://www.fnnews.com/rss/r20/fn_realnews_ent.xml` | UTF-8(`application/xml;charset=UTF-8`) | 3건(발행량 적음) | 470.0자(408~552) | `<pubDate>` RFC 822류(콤마 뒤 공백 없음) | 200 OK. 랜딩 페이지 `fnnews.com/rss`에서 섹션별 경로 19종을 확인하고 그중 4종(연예·스포츠·경제·증권)을 실제로 태웠다 |
| 엔터 | **국민일보 연예** | `https://www.kmib.co.kr/rss/data/kmibEntRss.xml` | UTF-8 **BOM 포함**(`text/xml`, 선언 `UTF-8`) | 10건 | 1001.7자(576~1474) | `<pubDate>`가 `<![CDATA[...]]>`로 감싸여 있고 비표준(`9 Aug  2026 16:07:00 GMT`, 요일 없음·이중 공백) | 200 OK |
| 스포츠 | **스포탈코리아** | `https://www.sportalkorea.com/rss/allArticle.xml` | UTF-8(`application/xml`) | 50건 | 290.7자(17~300) | `<pubDate>` 비표준 | 200 OK |
| 스포츠 | **노컷뉴스 스포츠** | `https://rss.nocutnews.co.kr/category/sports.xml` | UTF-8(`text/xml`) | 50건 | 132.4자(23~194) | `<pubDate>` 기형(위와 동일 패턴) | 200 OK |
| 스포츠 | **파이낸셜뉴스 스포츠** | `https://www.fnnews.com/rss/r20/fn_realnews_sports.xml` | UTF-8 | 3건(발행량 적음) | 408.7자(399~418) | `<pubDate>` RFC 822류 | 200 OK |
| 스포츠 | **국민일보 스포츠** | `https://www.kmib.co.kr/rss/data/kmibSpoRss.xml` | UTF-8 BOM | 10건 | 1077.1자(675~1258) | `<pubDate>` CDATA·비표준 | 200 OK |
| 경제 | **파이낸셜뉴스 경제** | `https://www.fnnews.com/rss/r20/fn_realnews_economy.xml` | UTF-8 | 19건 | 403.1자(349~447) | `<pubDate>` RFC 822류 | 200 OK |
| 경제 | **노컷뉴스 경제** | `https://rss.nocutnews.co.kr/category/economy.xml` | UTF-8(`text/xml`) | 50건 | 123.9자(23~195) | `<pubDate>` 기형 | 200 OK |
| 경제 | **국민일보 경제** | `https://www.kmib.co.kr/rss/data/kmibEcoRss.xml` | UTF-8 BOM | 10건 | 1425.2자(442~2650) | `<pubDate>` CDATA·비표준 | 200 OK |
| 증권 | **파이낸셜뉴스 증권** | `https://www.fnnews.com/rss/r20/fn_realnews_stock.xml` | UTF-8 | 57건 | 412.0자(128~492) | `<pubDate>` RFC 822류 | 200 OK |
| 증권 | **이투데이 금융** | `https://rss.etoday.co.kr/eto/finance_news.xml` | UTF-8(`text/xml;charset=UTF-8`) | 5건(발행량 적음) | 73.8자(72~77) | `<pubDate>` RFC 822 | 200 OK. 기존 등록된 「이투데이 마켓」(`market_news.xml`)과 다른 섹션(금융) — 같은 도메인이지만 별개 피드 |
| ~~증권~~ | ~~아주경제 재테크~~ | ~~`https://www.ajunews.com/rss/investment.xml`~~ | — | — | — | — | **등록 후 제거됨(22일차) — 아래 「아주경제 재테크 제거와 서울파이낸스 교체」 참고. 취소선은 이 표가 등록 당시 기록이었음을 남기려고 지운 것이 아니라 그대로 두었다** |
| 증권 | **서울파이낸스**(교체분) | `https://cdn.seoulfn.com/rss/gn_rss_allArticle.xml` | UTF-8(`application/xml`, 선언 `utf-8`) | 50건 | 287.7자(67~307) | `<pubDate>` RFC 822 | 200 OK. **이중 인코딩 스캔(`&amp;(quot\|apos\|lt\|gt\|nbsp\|amp\|#\d+);`) 0건** — 아주경제 제거 후 신규 조사 절차(§재현 방법)로 처음부터 검증하고 등록했다 |

**요약 하한(50자) 미달 항목이 섞여 있는 매체**: 노컷뉴스 3종(연예 24자·스포츠 23자·경제 23자 최저치)과
스포탈코리아(17자 최저치)는 평균은 100~290자대로 여유 있지만 개별 기사 중 50자 미만이 섞여 있다. 이 기사들은
`lib/crawler/article-parser.ts`의 최소 길이 검사에서 **개별 실패로 격리**되고 언론사 전체나 실행을 무너뜨리지
않는다(`docs/CONVENTIONS.md` §7 · `CrawlFailure` 패턴) — 새로 추가한 표본에서 그 격리 규칙이 실제로 걸리는
사례가 나온 것이라 결함이 아니라 정상 동작이다.

**국민일보(BOM)·아주경제(XML 선언 없음)의 인코딩 처리**: 둘 다 UTF-8이라 EUC-KR처럼 별도 디코더 분기가
필요하지는 않지만, `fetch` 응답을 `TextDecoder('utf-8')`로 디코딩하면 BOM(U+FEFF)이 텍스트 맨 앞에 남는다.
`fast-xml-parser`는 이 BOM을 무시하고 정상 파싱했고(실측 확인), `<title>` 등 첫 필드 파싱이 깨지지 않는 것도
확인했다. 아주경제는 `<?xml ?>` 선언 자체가 없는 드문 경우인데, 파서가 기본값(UTF-8)으로 정상 처리했다 —
선언이 없으면 UTF-8로 간주하는 것이 XML 스펙 기본값과도 맞다.

### `data/press-sources.json` 등록 — 등록 방법과 id

기존 17곳(§`data/press-sources.json` 시드 예시 5 + §카테고리 확장 후보 조사 12)을 지우지 않고 위 17곳을
더했다. **파일을 손으로 편집하지 않고 `POST /api/press`로 등록했다** — 한글 언론사명은 각 요청 본문을
UTF-8 JSON 파일로 먼저 쓴 뒤 `curl --data-binary @파일`로 보내 셸 인코딩 경유를 피했다(21일차 mojibake 사고
재발 방지, 팀장 지시). 등록 직후 `GET /api/press`로 전체 34건의 `name` 필드를 다시 읽어 한글이 깨지지
않았음을 전수 확인했다(아래 「검증 결과」).

| id | name | category | feedUrl |
| --- | --- | --- | --- |
| `etnews` | 전자신문 | it-ai | `https://rss.etnews.com/Section901.xml` |
| `aitimes` | AI타임스 | it-ai | `https://www.aitimes.com/rss/allArticle.xml` |
| `itchosun` | IT조선 | it-ai | `https://it.chosun.com/rss/allArticle.xml` |
| `techm` | 테크M | it-ai | `https://www.techm.kr/rss/allArticle.xml` |
| `nocut-entertainment` | 노컷뉴스 연예 | entertainment | `https://rss.nocutnews.co.kr/category/entertainment.xml` |
| `fnnews-entertainment` | 파이낸셜뉴스 연예 | entertainment | `https://www.fnnews.com/rss/r20/fn_realnews_ent.xml` |
| `kmib-entertainment` | 국민일보 연예 | entertainment | `https://www.kmib.co.kr/rss/data/kmibEntRss.xml` |
| `sportalkorea-sports` | 스포탈코리아 | sports | `https://www.sportalkorea.com/rss/allArticle.xml` |
| `nocut-sports` | 노컷뉴스 스포츠 | sports | `https://rss.nocutnews.co.kr/category/sports.xml` |
| `fnnews-sports` | 파이낸셜뉴스 스포츠 | sports | `https://www.fnnews.com/rss/r20/fn_realnews_sports.xml` |
| `kmib-sports` | 국민일보 스포츠 | sports | `https://www.kmib.co.kr/rss/data/kmibSpoRss.xml` |
| `fnnews-economy` | 파이낸셜뉴스 경제 | economy | `https://www.fnnews.com/rss/r20/fn_realnews_economy.xml` |
| `nocut-economy` | 노컷뉴스 경제 | economy | `https://rss.nocutnews.co.kr/category/economy.xml` |
| `kmib-economy` | 국민일보 경제 | economy | `https://www.kmib.co.kr/rss/data/kmibEcoRss.xml` |
| `fnnews-stock` | 파이낸셜뉴스 증권 | stock | `https://www.fnnews.com/rss/r20/fn_realnews_stock.xml` |
| `etoday-finance` | 이투데이 금융 | stock | `https://rss.etoday.co.kr/eto/finance_news.xml` |
| ~~`ajunews-investment`~~ | ~~아주경제 재테크~~ | ~~stock~~ | **22일차에 `DELETE`됨 — 아래 참고** |
| `seoulfn-stock` | 서울파이낸스 | stock | `https://cdn.seoulfn.com/rss/gn_rss_allArticle.xml` |

전부 `sourceType: "rss"`이고 `contentSelector`는 비웠다(요약만 경로 — 원문 페이지를 열지 않아 상대 서버
요청을 최소화한다는 §크롤링 예의 원칙을 그대로 지켰다).

### robots.txt 확인 결과 — 신규 도메인

| 도메인 | `User-agent: *` | 비고 |
| --- | --- | --- |
| `etnews.com` | `Allow: /` | 기존 §크롤링 예의에 이미 기록된 값과 동일(재확인) |
| `aitimes.com` | `Disallow: /admin/` | 기존 기록과 동일(재확인). `bingbot`에 `Crawl-delay: 30` |
| `it.chosun.com` | `Disallow: /admin/` | `www.it.chosun.com`은 DNS 자체가 없다 — `it.chosun.com`(www 없이)이 정식 도메인 |
| `techm.kr` | `Disallow: /admin/ /eventConfig/` | RSS 경로 무관 |
| `nocutnews.co.kr`(본지) | `Disallow: /news/{정치·사회·경제·연예·스포츠 등 각 섹션}` | **`*`가 기사 목록 페이지 다수를 막는다.** 다만 우리가 실제로 요청을 보내는 것은 별도 서브도메인 `rss.nocutnews.co.kr`이고 이 도메인의 robots.txt는 **404(파일 없음 → 관례상 무제한)** — RSS 요청 자체는 막히지 않는다. `contentSelector`를 비워 원문 페이지(`www.nocutnews.co.kr/news/...`)를 열지 않으므로 본지의 `Disallow`도 실질적으로 부딪히지 않는다. `GPTBot`·`ClaudeBot`·`anthropic-ai` 등 AI 크롤러는 이름으로 전면 차단하지만 이 도구는 그 이름을 쓰지 않는다(§크롤링 예의 원칙 그대로 적용) |
| `fnnews.com` | `Disallow: /print/ /sample/ /custom/ /newsPreview/ /redirect/` | RSS 경로(`/rss/r20/...`) 무관 |
| `kmib.co.kr` | `Allow: /ads.txt` · `Disallow: /search/` | RSS 경로(`/rss/data/...`) 무관. `GPTBot`·`ClaudeBot`·`anthropic-ai`·`Google-Extended` 등을 이름으로 전면 차단하지만 `*`는 열려 있다 — 노컷뉴스와 같은 구조 |
| `sportalkorea.com` | `Disallow: /admin/` | `GPTBot` 이름 차단, `*`는 열림. `bingbot` `Crawl-delay: 30` |
| ~~`ajunews.com`~~ | ~~`Disallow: /search /keyword /gen/ ...`(RSS 무관)~~ | ~~`GPTBot` 이름 차단, `*`는 열림~~ — **매체 자체가 22일차에 제거됨(아래 참고), robots는 기록으로만 남긴다** |
| `seoulfn.com`(교체분) | `Disallow: /admin/` | `bingbot` `Crawl-delay: 30`. RSS 경로(`cdn.seoulfn.com/rss/...`) 무관 |

**패턴이 계속 반복된다**: 이름이 붙은 AI 크롤러(`GPTBot`·`ClaudeBot`·`Google-Extended` 등)를 명시적으로
차단하는 언론사가 늘고 있지만, `*`(익명 UA)에는 RSS·기사 경로를 열어 두는 경우가 대부분이다. 이 도구는
일반 Chrome UA를 쓰고 어떤 봇 이름도 사칭하지 않으므로(§크롤링 예의) 이 구조와 계속 부딪히지 않는다.
**단, `*`가 특정 경로를 명시적으로 막는 매체(노컷뉴스 본지의 `/news/{섹션}`)는 있었다** — RSS 서브도메인과
기사 원문 서브도메인이 분리된 매체 구조 덕에 이번엔 문제가 되지 않았지만, 앞으로 `*`의 `Disallow`가 RSS
경로 자체를 겨냥하는 매체가 나오면 그 매체는 후보에서 제외해야 한다.

### 검증 결과

1. **`GET /api/press?category=<카테고리>`로 5개 카테고리 전부 6곳 이상 확인**: IT/AI 9 · 엔터 6 · 스포츠 7 ·
   경제 6 · 증권 6 (기존 3곳 + 카테고리별 3~4곳 신규 등록).
2. **기존 17곳 전수 생존 확인**: `GET /api/press`(전체 34건)에서 기존 17개 id
   (`bloter`·`boannews`·`inews24`·`zdnet-korea`·`naver-d2`·`yna-entertainment`·`sbs-entertainment`·
   `khan-entertainment`·`yna-sports`·`sbs-sports`·`khan-sports`·`yna-economy`·`sbs-economy`·
   `asiae-economy`·`asiae-stock`·`etoday-market`·`infostock-daily`)가 전부 그대로 있고 `name`이 깨지지
   않았다.
3. **신규 17곳 한글명 mojibake 없음**: `POST /api/press` 응답과 재조회한 `GET /api/press` 양쪽에서
   `name` 필드를 직접 읽어 확인했다(위 표).
4. **실제 크롤 1회로 신규 언론사 수집 확인**: 5개 카테고리에서 신규 언론사 각 1곳(`etnews`·
   `nocut-entertainment`·`sportalkorea-sports`·`fnnews-economy`·`ajunews-investment`)을 골라
   `POST /api/crawl`(`maxArticlesPerPress: 5`)을 실행 — `runId: 20260811-085056`,
   `successCount: 25` · `failCount: 0`. `data/runs/20260811-085056/articles/0001.txt`~`0025.txt`가
   실제로 저장됐고, 본문 한글이 깨지지 않았으며 `# category:` 메타 라인도 정확히 찍혔다(직접 열어 확인).
   **이 run은 아래 「아주경제 재테크 제거」 판정의 증거로 그대로 남겨 둔다 — 지우지 않는다.**

### 아주경제 재테크 제거와 서울파이낸스 교체 (22일차 사후 조치)

Task 029 교차검증 중 아주경제 재테크 기사에서 `&quot;`·`&#39;`가 화면에 그대로 보이는 것을 발견해
조사한 결과, **원문 피드가 `&amp;quot;`처럼 이중 인코딩돼 있었다**(raw 바이트로 직접 확인). 우리
디코더(`decodeHtmlEntities`)는 I-043 규칙("정확히 한 번만 스캔")대로 정확히 동작한 것이고 버그가
아니었지만, 그 결과 사용자 화면과 키워드 랭킹에 `quot`(4위)·`nbsp`(8위) 같은 인코딩 잔여물이
그대로 노출됐다(`GET /api/runs/20260811-085056/keywords` 실측). 판정 근거와 기각한 대안(전용
이중 디코딩 전처리 추가 등)은 `docs/DECISIONS.draft.크롤파이프라인.md`에 남겼다 — **여기서는
결과만 기록한다.**

- `DELETE /api/press/ajunews-investment`로 제거했다.
- 대체 후보로 **서울파이낸스**(`seoulfn-stock`, `https://cdn.seoulfn.com/rss/gn_rss_allArticle.xml`)를
  등록했다 — 위 §새로 등록한 17곳 표에 실측값 기록. **등록 전 이중 인코딩 스캔을 통과**했다(0건).
- 재검증: `GET /api/press?category=stock` → 6곳 유지(`seoulfn-stock`·`asiae-stock`·`etoday-finance`·
  `etoday-market`·`infostock-daily`·`fnnews-stock`). `POST /api/crawl`(`pressIds: ["seoulfn-stock"]`,
  `maxArticlesPerPress: 10`) → `runId: 20260811-092100`, `successCount: 10`·`failCount: 0`.
  `data/runs/20260811-092100/articles/*.txt` 10건을 전부 `grep`으로 `&quot;`·`&#39;`·`&amp;`·`&nbsp;`·
  `&apos;`·`&lt;`·`&gt;` 검사 — **매치 0건**, 엔티티 유입 없음.
- (참고, 이번 조사 범위 밖) 저장된 txt에서 `\'메가특구특별법\'`처럼 백슬래시로 이스케이프된
  따옴표가 눈에 띄었다 — HTML 엔티티 이중 인코딩과는 다른 종류의 습관(소스 쪽 JSON 이스케이프가
  새는 것으로 추정)이고, 특수문자 하나짜리라 Kiwi가 독립 토큰으로 집을 가능성은 낮다. 오염이
  실제로 확인되면 그때 다시 연다.

### 죽은 후보 (문서에 남기되 등록하지 않음)

| 후보 | URL | 결과 |
| --- | --- | --- |
| **아주경제 재테크**(한 차례 등록했다 제거함) | `ajunews.com/rss/investment.xml` | 200 OK·description 정상이라 22일차에 한 번 등록했지만, **원문이 `&amp;quot;`·`&amp;#39;`·`&amp;nbsp;`로 이중 인코딩돼 있어**(700건, 아이템 79% 영향) 키워드 랭킹에 `quot`(4위)·`nbsp`(8위)가 올라오는 실제 오염을 일으켰다. `DELETE`로 제거하고 서울파이낸스로 교체했다 — 근거는 `docs/DECISIONS.draft.크롤파이프라인.md`. **재등록하려면 이중 인코딩부터 다시 스캔한다** |
| 엑스포츠뉴스 | `xportsnews.com/rss/allArticle.xml` | 200 OK지만 `Content-Type: text/html`이고 실제로 HTML 페이지가 내려온다 — RSS 엔드포인트가 아니다 |
| 텐아시아 | `tenasia.hankyung.com/feed` | 301 → 200이지만 홈페이지 HTML로 리다이렉트된다(실제 피드가 아님) |
| 뉴스엔 | `newsen.com/rss/rss_enter.xml` | 404 |
| YTN 경제·스포츠 | `ytn.co.kr/_rss/{economy,sports}.xml` | 302 → 404(리다이렉트 뒤가 죽어 있다). `ytn.co.kr/rss` 랜딩 페이지에서도 대안 경로를 찾지 못했다 |
| 머니투데이 연예·경제·증권·스포츠 | `mt.co.kr/rss/mt_{star,news,stock,sports}.xml` | 전부 404. `mt.co.kr/rss` 랜딩 페이지가 빈 목록을 준다 |
| 머니S 증권 | `moneys.mt.co.kr/rss/mt_stock.xml` | 301 → 404 |
| 헤럴드경제 경제 | `biz.heraldcorp.com/rss/index_biz.xml` | 301 → 200이지만 HTML(제대로 된 XML 엔드포인트 아님). `heraldcorp.com/rss` 랜딩 페이지도 빈 목록 |
| 파이낸셜뉴스 경제(추정 경로) | `fnnews.com/rss/fn_realnews_economy.xml` | 404 — **랜딩 페이지(`fnnews.com/rss`)가 알려준 실제 경로는 `/rss/r20/fn_realnews_economy.xml`**(위 표에 등록). 추정 경로와 실제 경로가 달랐던 사례 |
| 뉴스토마토 경제(섹션 지정) | `newstomato.com/rss/section.xml?sid=101` | 404. **자동 검색 태그로 찾은 루트 피드(`newstomato.com/rss/`)는 실제로 살아 있었지만**(200 OK, 47KB, 전체기사 혼합) 경제 섹션만 분리할 수 없어 이미 economy 카테고리가 충분히 채워진 상태에서는 등록하지 않았다 |
| 데일리안 경제 | `dailian.co.kr/rss/S1N4.xml` | 404 |
| 이데일리 연예·경제·증권·스포츠(섹션 추정) | `rss.edaily.co.kr/edaily_{entertain,econ,stock,sports}_news.xml` | 전부 연결 자체가 실패했다(호스트 응답 없음). **`rss.edaily.co.kr/edaily_news.xml`(전체뉴스, `/rss` 랜딩 페이지가 알려준 유일한 경로)은 살아 있었지만**(200 OK, `http://`만 되고 `https://`는 확인 안 됨) 섹션이 분리되지 않아 이미 채워진 economy 카테고리에는 등록하지 않았다 |
| 한국경제TV(와우TV) 증권 | `wowtv.co.kr/rss/{stock,allArticle}.xml` | 둘 다 302 → 200 HTML(RSS 아님). `wowtv.co.kr/rss` 랜딩 페이지도 빈 목록 |
| 팍스넷 증권 | `paxnet.co.kr/rss/news_stock.xml` | 302 → 200 HTML(RSS 아님) |
| 마이데일리 스포츠 | `mydaily.co.kr/rss/rss_sports.xml` | 302 → 200 HTML(RSS 아님) |
| 글로벌이코노믹 | `g-enews.com/rss/allArticle.xml` | 500 Internal Server Error |
| 비즈니스포스트 | `businesspost.co.kr/rss/allArticle.xml` | 404 |
| 뉴스프라임 | `newsprime.co.kr/rss/allArticle.xml` | 200 OK지만 응답 본문이 0바이트 |
| 머니투데이방송(MTN) | `mtn.co.kr/rss/allArticle.xml` | 301 → 404 |
| 서울경제TV(SEN TV) | `sentv.co.kr/rss/allArticle.xml` | 200 OK지만 응답 본문이 0바이트 |
| 조세일보 | `joseilbo.com/rss/allArticle.xml` | 404 |
| 한국금융신문 | `fntimes.com/rss/allArticle.xml` | 500 Internal Server Error |
| 아주경제 문화·연예 | `ajunews.com/rss/cultureentertainment.xml` | 200 OK · `<item>` **0건**(확인 시점 기사 없음) — 죽은 URL은 아니나 지금 당장은 쓸 수 없어 미등록. 재테크 섹션(위 표에 등록)으로 대체 |
| 노컷뉴스 산업 | `rss.nocutnews.co.kr/category/it.xml` | 200 OK · 50건이지만 `<title>`이 "노컷뉴스 - **산업**"이고 채널 `<link>`가 `http://localhost:...`로 깨져 있다(노컷뉴스 쪽 피드 생성 버그로 보임) — IT/AI 카테고리 취지와 맞지 않고 이미 4곳이 확보된 상태라 미등록 |

### 왜 이 17곳을 골랐는가

- **랜딩 페이지 우선 탐색**: 21일차 문서가 남긴 교훈("`/rss` 안내 페이지를 먼저 여는 방식이 맹목적 URL
  추정보다 훨씬 잘 맞았다")을 그대로 따랐다. `fnnews.com/rss`·`nocutnews.co.kr/rss`·`kmib.co.kr/rss`·
  `ajunews.com/rss` 4곳은 랜딩 페이지에서 실제 엔드포인트 목록을 얻어 성공했고, 반대로 URL을 추정만 한
  머니투데이·와우TV·팍스넷·마이데일리 등은 전부 죽은 후보로 남았다.
- **발행량이 적은 매체도 등록 기준을 완화하지 않았다**: 파이낸셜뉴스 연예·스포츠(3건), 이투데이 금융(5건)은
  건수가 적지만 살아 있고 요약이 정상 채워지므로 등록했다 — "카테고리당 최소 6곳"은 표본 다양성이
  목적이지 매체당 기사량이 아니다.
- **노컷뉴스·국민일보·파이낸셜뉴스를 3개 카테고리씩 재사용한 이유**: 21일차와 같은 논리(§왜 이 12곳을
  골랐는가) — 언론사 자체는 재사용해도 Press 레코드는 카테고리마다 별개이고, 섹션별 RSS가 이미 갖춰진
  매체를 반복 활용하는 편이 매 카테고리마다 새 매체를 찾는 것보다 안정적이다. 다만 카테고리마다
  **노컷뉴스·국민일보·파이낸셜뉴스 세 곳 외에 최소 1곳은 완전히 다른 매체**(전자신문·AI타임스·IT조선·
  테크M / 스포탈코리아 / 아시아경제·이투데이·아주경제)를 넣어 표본 다양성을 지켰다.

### `press-defaults.ts`는 여전히 손대지 않았다

I-037(빈 상태 설계)·I-054(초기 입력 부담)의 판단 기준은 이번 회차에도 그대로 유지했다.
`lib/storage/press-defaults.ts`의 `DEFAULT_PRESS_SOURCES`는 채우지 않았고, 등록은 전부
`POST /api/press` → `data/press-sources.json` 경로로만 이뤄졌다. **다만 총 언론사 수가 17 → 34곳으로
늘면서 I-054가 지적한 "완전 초기 상태에서 손으로 입력해야 하는 부담"은 정확히 두 배가 됐다** —
이 사실은 이슈를 새로 열지 않고 `docs/ISSUES.draft.크롤파이프라인.md`에 I-054 갱신 메모로 남겼다(팀장
전용 `docs/ISSUES.md` 갱신 전 단계).
