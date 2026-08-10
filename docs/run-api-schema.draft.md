# Task 017 응답 스키마 초안 (draft)

> **이 문서는 초안이다.** 코드로 확정하지 않았고 `lib/types/`에 아직 넣지 않았다. Task 017이 열리는
> 회차(크롤 파이프라인 담당, 10일차 예정)에 이 초안을 출발점으로 최종 zod 스키마를 만든다.
> 근거: `docs/ROADMAP.md` "Task 017 · 수집 결과 조회 API", `docs/screens/02-collect-result.md`
> §화면 구성 ②③④⑤, `docs/PRD.md` §CrawlRun·§Article. 8일차 저장소 계층 유휴 배정.

## 왜 지금 이 초안이 필요한가

Task 017은 화면 설계서 02가 실제로 그리는 값을 그대로 내려줘야 한다. 화면 설계서의 마크업 스켈레톤은
`MOCK_RUNS`/`MOCK_ARTICLES` 더미 데이터로 이미 필드 모양을 보여주고 있으므로, 이 초안은 그 더미
인터페이스를 **서버 응답 스키마로 역산**한 것이다. 새로 지어낸 필드는 최소화했다.

---

## 공통 규칙

- 모든 응답은 `lib/api/response.ts`의 `ok(data)` / `fail(message, status)` 봉투를 그대로 쓴다.
- 시각 필드는 ISO 8601 문자열(`docs/CONVENTIONS.md` §3). 화면이 필요로 하는 사람이 읽는 형식
  (`2026-08-10 14:32`, `소요 6분 36초`)은 **서버가 별도 파생 필드로 조립해 함께 내려준다** —
  Task 008A의 `sourceUrl` 파생 필드와 같은 패턴이다. 클라이언트가 ISO 문자열을 다시 포맷하게 하면
  화면마다 형식이 갈릴 위험이 있다(ROADMAP 구현 규칙 "서버에서 조립").
- 대상 언론사는 id가 아니라 **이름**으로 내려주되, 삭제된 언론사는 `deleted: true` 플래그를 함께
  준다(ROADMAP 구현 규칙). **이름을 무엇으로 채울지는 실제로 막혀 있다** — 아래
  "발견한 어긋남 ①"을 반드시 먼저 읽는다.
- 없는 `runId`/`articleId`는 `fail(message, 404)` + 한국어 메시지.

---

## 1. `GET /api/runs`

목록. 화면 설계서 02 ② 실행 선택(Select 옵션 + "총 N건")의 데이터 소스.

```ts
interface RunListItem {
  id: string // CrawlRun.id
  /** 서버 조립 셀렉터 라벨. 형식: "YYYY-MM-DD HH:mm · 언론사 N · 성공 S · 실패 F" */
  label: string
  startedAt: string // ISO 8601
  finishedAt: string | null // ISO 8601, 진행 중이면 null
  status: 'running' | 'done' | 'partial-failed' | 'failed' | 'aborted'
  targetPressCount: number // = targetPressIds.length. label 파싱 없이 뱃지 개수 등에 재사용
  successCount: number
  failCount: number
}

type RunListResponse = RunListItem[] // ok(RunListResponse)
```

- 정렬: 최신순(`run-repository.ts`의 `listRuns()`가 이미 `startedAt` 내림차순 — 그대로 재사용).
- 실행 이력 0건이면 `ok([])`(DoD 1번). 에러가 아니다.
- `총 N건`은 `RunListResponse.length`로 클라이언트가 계산 — 별도 필드 불필요.
- `label` 조립 시 `startedAt`은 로컬 `YYYY-MM-DD HH:mm`까지만 자른다(초 단위는 셀렉터에 없다,
  와이어프레임 `2026-08-10 14:32` 참고).

## 2. `GET /api/runs/[runId]`

단건 요약. 화면 설계서 02 ③ 실행 요약 카드의 데이터 소스.

```ts
interface TargetPressRef {
  id: string
  /** 삭제된 언론사면 null일 수 있다 — "발견한 어긋남 ①" 참고. */
  name: string | null
  deleted: boolean
}

interface RunSummary {
  id: string
  startedAt: string // ISO 8601
  finishedAt: string | null // ISO 8601
  /** 서버 조립. "6분 36초" 형식. finishedAt이 null(진행 중)이면 null. */
  durationLabel: string | null
  status: 'running' | 'done' | 'partial-failed' | 'failed' | 'aborted'
  targetPress: TargetPressRef[]
  successCount: number
  failCount: number
  /** "발견한 어긋남 ②" — DATA_ROOT 절대경로가 아니라 상대 표시 경로. */
  storagePath: string
}

// ok(RunSummary) | fail('존재하지 않는 실행입니다', 404)
```

## 3. `GET /api/runs/[runId]/articles?q=`

기사 파일 목록. 화면 설계서 02 ④ 기사 파일 목록의 데이터 소스. 목록은 본문을 읽지 않는다
(`article-repository.ts`의 `listArticles` — 아래 "200건 성능 측정" 절에서 실측으로 확인했다).

```ts
interface ArticleListEntry {
  id: string // 4자리 순번, ArticleMeta.id
  fileName: string // `${id}.txt`
  pressId: string
  pressName: string | null // 삭제된 언론사면 null
  pressDeleted: boolean
  title: string
  contentSource: 'rss-summary' | 'article-page'
  crawledAt: string // ISO 8601
}

interface ArticleListResponse {
  items: ArticleListEntry[]
  total: number // = items.length (검색 필터 적용 후 개수)
}

// ok(ArticleListResponse) | fail('존재하지 않는 실행입니다', 404)
```

- `?q=`는 `fileName`·`title` 대상, 대소문자 무시 부분 일치(ROADMAP 구현 규칙).
- `runId` 자체가 없는 실행이면 404. **`listArticles(runId)`는 디렉터리가 없으면 예외 대신 빈 배열을
  돌려주므로**(article-repository.ts:70, "아직 기사가 하나도 저장되지 않은 실행" 주석), 이 라우트는
  기사 0건과 run 자체가 없음을 구분하려면 **`getRun(runId)`로 run 존재를 먼저 확인**해야 한다 —
  안 그러면 존재하지 않는 runId도 200 + 빈 배열을 돌려주게 되어 DoD("없는 runId는 404")를 못 지킨다.

## 4. `GET /api/runs/[runId]/articles/[articleId]`

기사 본문 단건. 화면 설계서 02 ⑤ 본문 미리보기의 데이터 소스.

```ts
interface ArticleDetail {
  id: string
  runId: string
  pressId: string
  pressName: string | null
  pressDeleted: boolean
  title: string
  url: string
  content: string // article-parser.ts가 보존한 문단 개행(\n\n) 그대로
  contentSource: 'rss-summary' | 'article-page'
  crawledAt: string // ISO 8601
}

// ok(ArticleDetail) | fail('존재하지 않는 실행입니다', 404) | fail('존재하지 않는 기사입니다', 404)
```

---

## 화면 요소 ↔ 응답 필드 자기 점검

| 화면 설계서 02 요소 | 원문 | 대응 필드 |
| --- | --- | --- |
| ② 실행 선택 Select 옵션 라벨 | `2026-08-10 14:32 · 언론사 3 · 성공 42 · 실패 2` | `RunListItem.label` (서버 조립) |
| ② 총 실행 건수 | `총 2건` | `RunListResponse.length` (클라이언트 계산) |
| ③ 실행 시각 | `2026-08-10 14:32:05 → 14:38:41` | `RunSummary.startedAt` / `finishedAt` |
| ③ 소요시간 | `(소요 6분 36초)` | `RunSummary.durationLabel` (서버 조립) |
| ③ 대상 언론사 배지 | `[조선일보] [한겨레] [전자신문]` | `RunSummary.targetPress[].name` (+ `deleted`로 "삭제됨" 표시 분기) |
| ③ 수집 결과 | `성공 42건 · 실패 2건` | `RunSummary.successCount` / `failCount` |
| ③ 저장 경로 | `data/runs/20260810-143205/articles/` | `RunSummary.storagePath` (상대 표시 경로 — "발견한 어긋남 ②") |
| ③ [키워드 분석] 버튼 | `href="/keywords?runId=..."` | `RunSummary.id` (이미 알고 있는 값, 별도 필드 불필요) |
| ④ 파일명 | `0001.txt` | `ArticleListEntry.fileName` |
| ④ 언론사 배지 | `조선일보` | `ArticleListEntry.pressName` (+ `pressDeleted`) |
| ④ 제목 | `삼성전자, HBM4 메모리 양산 돌입` | `ArticleListEntry.title` |
| ④ 수집 시각 | `14:33` | `ArticleListEntry.crawledAt` (클라이언트가 시:분만 잘라 표시) |
| ④ 검색 Input | `파일명 · 제목 검색` | `?q=` 쿼리 파라미터, 서버 필터 |
| ④ 기사 파일 (N) | `기사 파일 (3)` | `ArticleListResponse.total` |
| ⑤ 제목 | `삼성전자, HBM4 메모리 양산 돌입` | `ArticleDetail.title` |
| ⑤ 원문 링크 | `href="https://..."` | `ArticleDetail.url` |
| ⑤ 언론사 배지 | `조선일보` | `ArticleDetail.pressName` |
| ⑤ 본문 출처 배지 | `피드 요약` / `원문 전문` | `ArticleDetail.contentSource` (클라이언트가 `CONTENT_SOURCE_LABEL` 매핑) |
| ⑤ 수집시각 메타 | `2026-08-10 14:33:10 수집` | `ArticleDetail.crawledAt` |
| ⑤ 본문 | `whitespace-pre-wrap` 본문 | `ArticleDetail.content` |
| ⑤ 일부 실패 `ErrorAlert` | `6건의 기사 수집에 실패했습니다` | `RunSummary.failCount > 0` (클라이언트 조건부 렌더, 별도 필드 불필요) |

**빠짐없이 덮는다.** 화면 설계서 02가 그리는 모든 데이터 바인딩 지점(마크업의 `TODO: ... 바인딩 필요`
주석 포함)이 위 표의 오른쪽 열에 대응한다.

---

## 발견한 어긋남 (draft 이슈로 별도 등록)

① **CrawlRun이 대상 언론사 이름을 스냅샷하지 않는다.** `lib/types/crawl-run.ts`의 `CrawlRun`은
`targetPressIds: string[]`만 갖고 이름을 저장하지 않는다. 언론사가 삭제되면(`deletePress`가
레지스트리에서 레코드를 완전히 제거) **원래 이름을 복구할 방법이 없다.** `id`로 재조회해 이름을
찾는 방식(`getPress(id)` → `null`)으로는 "이름 + 삭제됨 플래그"가 아니라 "id만 있고 이름은 영영
`null`"이 된다. `docs/ISSUES.draft.저장소계층.md`에 상세를 남겼다.

② **저장 경로 표시값이 없다.** `lib/storage/paths.ts`의 `DATA_ROOT`는
`path.join(process.cwd(), 'data')`(OS 절대경로)이고, 화면은 `data/runs/{runId}/articles/`처럼
프로젝트 루트 기준 **상대경로**를 기대한다(와이어프레임·마크업 스켈레톤 모두 상대경로). 지금
`paths.ts`에는 상대 표시 문자열을 만드는 헬퍼가 없다. `docs/ISSUES.draft.저장소계층.md`에 남겼다.

③ **소요시간·라벨 조립 로직을 어디에 둘지 미정.** `durationLabel`("6분 36초") 같은 포맷 로직이
`app/api/runs/` 라우트 안에 직접 있으면 4개 엔드포인트 중 여러 곳에서 중복될 수 있다(목록의 `label`도
날짜 포맷이 필요하다). `docs/DECISIONS.draft.저장소계층.md`에 "포맷 헬퍼를 `lib/api/` 아래 별도
모듈로 뺄지" 제안을 남겼다 — 최종 판단은 017 담당(크롤 파이프라인)이 한다.
