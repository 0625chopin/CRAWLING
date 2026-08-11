# 결정 대장

회차를 굴리다 내린 설계·운영 결정을 번호(`D-NNN`)를 붙여 모아 두는 곳이다.

**착수 전에 확정한 결정은 이미 문서에 반영돼 있다** — 코드 규약은 [`CONVENTIONS.md`](./CONVENTIONS.md),
스코프 관련 미결은 [`ROADMAP.md`](./ROADMAP.md) §결정 필요 사항에 있다. 이 파일은 그 이후에 새로 생기는
결정을 담는다.

## 규칙

- **워크스트림은 이 파일에 새 헤딩(`### D-NNN`)을 직접 붙이지 않는다.** 번호 없이
  `docs/DECISIONS.draft.<AREA>.md`에 쓰고, 번호 부여와 병합은 **회차 마감에 팀장만** 한다.
- 이미 번호가 붙은 블록 안의 내용(상태 갱신·교차 참조 추가)은 직접 고쳐도 된다.
- 번호는 `D-001`부터 1씩 증가한다. **뒤집힌 결정도 지우지 않는다** — 상태를 `대체됨`으로 바꾸고 대체한 번호를 적는다.
  왜 그렇게 하지 않기로 했는지가 나중에 같은 논의를 되풀이하는 것을 막는다.
- **코드 규약이 바뀌는 결정은 여기에 기록한 뒤 [`CONVENTIONS.md`](./CONVENTIONS.md)에도 반영한다.**
  구현자가 읽는 것은 규약 문서이지 이 대장이 아니다.

## 서식

```markdown
### D-001 · <한 줄 제목>

- 상태: 유효 | 대체됨(→ D-0NN)
- 결정: <N일차> · <제안한 워크스트림>
- 영향 Task: <Task 번호>

**배경**: <무엇을 정해야 했는지>
**결정**: <무엇으로 정했는지>
**근거**: <왜. 기각한 대안과 그 이유까지>
**반영**: <어느 문서·코드에 반영했는지>
```

---

<!-- 여기서부터 D-001, D-002 ... 순서로 추가한다. -->
### D-001 · `lib/crawler/types.ts`의 `crawlTargetSchema`는 언론사 전용 필드를 받지 않는다

- 상태: 유효
- 결정: 1일차 · 저장소 계층
- 영향 Task: Task 004 · Task 007 · Task 013A · Task 013B

**배경**: Task 004 구현 규칙이 "언론사 크롤에 필요한 필드 추가 여부만 검토, 범용 스키마는 유지"를 요구했다.
**결정**: `crawlTargetSchema`·`crawlRequestSchema`를 수정하지 않고 그대로 둔다. 언론사 크롤 입력은 새로 만든
`pressSchema`(`discriminatedUnion`)와 `crawlStartRequestSchema`(`pressIds` + `maxArticlesPerPress`) 조합으로 받는다.
**근거**: `crawlTargetSchema`는 `app/api/crawl/route.ts`가 쓰는 임의 URL 배치 크롤용 범용 스키마이지 제품 기능이
아니다. 여기에 `pressId`·`sourceType` 분기를 얹으면 성격이 다른 두 유스케이스가 한 스키마에 섞여 판별자 없는
optional 범벅이 된다 — `CONVENTIONS.md` §3이 금지하는 바로 그 패턴이다. 크롤 파이프라인이 교차검증에서 같은
결론에 동의했다.
**반영**: `lib/crawler/types.ts` 무수정. Task 007이 언론사 크롤 입력 스키마를 실제로 설계할 때 이 결정을 참고한다 —
새 입력이 필요하면 기존 범용 스키마를 오염시키지 말고 별도 스키마를 만든다.

### D-002 · `getKiwi()`는 `lib/keyword/` 밖으로 내보내지 않는다

- 상태: 유효
- 결정: 1일차 · 화면
- 영향 Task: Task 019 · Task 020A · Task 020B

**배경**: Task 019의 「생성/수정 파일」은 `getKiwi()` 싱글턴을 산출물로 나열하는데, 같은 Task의 DoD는 "원시 `kiwi`
인스턴스를 모듈 밖으로 내보내지 않는다"를 요구한다. `getKiwi()`의 반환값이 곧 원시 `Kiwi`라 두 문장이 충돌한다.
**결정**: `getKiwi()`는 `kiwi.ts` 안의 비공개 싱글턴 접근자로만 둔다. `kiwi.ts`와 `index.ts`가 실제로 내보내는 것은
`safeTokenize(text)` · `MATCH_OPTIONS` · `KiwiToken` 타입 셋뿐이다.
**근거**: 「생성/수정 파일」의 `getKiwi()`는 "그런 이름의 싱글턴 접근자가 파일 안에 있어야 한다"로 읽는다. 공개
API까지 요구한다고 읽으면 DoD와 정면으로 모순되고, 함정 ①(`tokenize(text, undefined)`가 Node를 죽인다)이 다른
워크스트림 호출부에서 재발할 통로가 열린다. 모듈의 진짜 경계는 `index.ts`이고 거기서 원시 `Kiwi`가 한 번도 나가지
않아야 이 함정이 구조적으로 봉인된다. Task 020을 담당할 저장소 계층이 교차검증에서 "지금 API만으로 020A·020B를
완전히 구현할 수 있다"고 확인했다.
**반영**: `lib/keyword/kiwi.ts` · `lib/keyword/index.ts`. Task 020이 `blockList`·`typos` 등 다른 옵셔널 인자를 쓰게
되면 `safeTokenize`와 같은 삼항 분기 패턴의 새 안전 래퍼를 `kiwi.ts`에 추가하고 **그 함수만** 내보낸다.

### D-003 · `fetchFeed`는 실패를 예외가 아니라 `CrawlFailure` 값으로 반환한다

- 상태: 유효
- 결정: 2일차 · 화면(지적) · 크롤 파이프라인(구현)
- 영향 Task: Task 010A · Task 010B · Task 013B

**배경**: `lib/crawler/rss.ts`의 `fetchFeed`가 처음에는 피드 전체 실패를 `Error` reject로 처리했다. 구현 측
근거는 "피드 자체를 못 읽는 것은 개별 기사 격리 대상이 아니라 이 호출 전체의 실패"였다.
**결정**: 실패를 값으로 반환한다. `FeedFetchResult = FeedFetchSuccess | CrawlFailure`이며, 실패 쪽은
**`lib/crawler/types.ts`의 `CrawlFailure`를 그대로 재사용한다** — 구조만 비슷한 새 타입을 만들지 않는다.
내부의 `fetchFeedBytes`·`parseFeedItems`는 계속 던지되, 공개 함수 `fetchFeed`가 경계에서 값으로 변환한다.
**근거**: 같은 계층의 `fetchHtml`이 이미 반대 패턴을 확립해 두었다(`lib/crawler/fetch-html.ts:50-56` —
동일한 "단일 URL을 열었는데 통째로 실패" 시나리오에서 `{ ok: false, url, error, elapsedMs }`를 반환).
`fetchFeed`만 예외로 이탈하면 Task 013B 오케스트레이터가 **RSS 분기는 `try/catch`로, HTML 분기는 `.ok`
체크로** 서로 다른 관용구를 쓰게 되고, 나중에 한쪽에만 규칙이 반영되는 사고가 난다. `CONVENTIONS.md`
§7("개별 실패는 예외가 아니라 값으로 격리한다")의 취지도 언론사 1곳의 피드 실패에 그대로 적용된다.
실패 타입을 새로 만들지 않은 것은 013B가 RSS 실패와 HTML 실패를 **같은 핸들러 하나로** 처리할 수 있게
하기 위해서다.
**반영**: `lib/crawler/rss.ts` · `lib/crawler/rss.test.ts`(실패 케이스 4건 유지 + "항상 값을 반환한다" 1건
추가) · `lib/crawler/index.ts` 재수출.

### D-004 · 기사 txt의 원자적 쓰기는 `atomicWriteFile`을 재사용한다

- 상태: 유효
- 결정: 2일차 · 크롤 파이프라인(권고) · 팀장(확정)
- 영향 Task: Task 005 · Task 007

**배경**: `writeJson`은 임시 파일 → `fs.rename`으로 크래시 안전성을 보장하지만 `JSON.stringify`가 함수 안에
박혀 있어 JSON 전용이었다. Task 007의 `article-file.ts`는 기사 txt(메타 라인 + 빈 줄 + 본문)를 같은 수준으로
저장해야 하는데 대응물이 없었다.
**결정**: temp 생성 → `writeFile` → `rename` → 실패 시 정리라는 핵심부를 `atomicWriteFile(filePath, content:
string)`로 분리하고, `writeJson`은 그것을 부르는 얇은 래퍼로 둔다. Task 007은 txt 문자열을 이 헬퍼에 그대로
넘긴다.
**근거**: 크래시 안전성 로직은 JSON이든 txt든 완전히 동일하다. 007이 처음부터 다시 짜면 같은 패턴이 두 곳에
중복되고 한쪽만 고쳐지는 사고가 난다. **기각한 대안**: 007이 `article-file.ts` 안에 독립적인 원자적 텍스트
쓰기를 새로 만드는 것 — Task 005 스코프 밖이라 저장소 계층이 떠안을 의무는 없다는 반론이 있었으나, 지금 한 겹
쪼개는 비용이 나중에 두 구현을 맞춰 가는 비용보다 싸다고 판단했다.
**반영**: `lib/storage/json-store.ts`(`writeJson`의 외부 시그니처·동작은 불변인 순수 리팩터링) ·
`lib/storage/index.ts` 재수출. 리뷰어가 메타 라인 + 본문 형태의 실제 텍스트로 왕복을 확인했다.

### D-005 · Press id는 등록 시 직접 지정할 수 있고, 슬러그 자동 생성은 폴백이다

- 상태: 유효
- 결정: 3일차 · 저장소 계층(제안) · 크롤 파이프라인(권고) · 팀장(확정)
- 영향 Task: Task 004 · Task 006 · Task 008A · Task 009B

**배경**: I-005 — 한글 전용 언론사명은 슬러그가 빈 문자열이 된다.
**결정**: `pressCreateSchema`에 **선택 필드 `id`**(형식은 `pressIdSchema`와 동일한 `^[a-z0-9]+(-[a-z0-9]+)*$`)를
추가한다. `createPress`는 명시 id가 있으면 그것을 쓰고(중복이면 기존 접미 숫자 규칙을 그대로 태운다), 없으면
기존 슬러그 생성을 **폴백으로** 쓴다. **id 불변 규칙은 그대로다** — `updatePress`는 `patch.id`를 무시한다.
형식 위반 거부 메시지는 `"id는 소문자·숫자·하이픈만 사용할 수 있습니다"`이며 Task 008A·009B가 그대로 쓴다.
**근거**: **기각한 대안 — 로마자 표기 라이브러리 도입.** 기계적 음역은 실제로 원하는 값을 만들지 못한다.
"블로터"를 자동 로마자화하면 `beulroteo` 류가 나오지, `docs/press-candidates.md`에 이미 못 박힌 브랜드명
`bloter`가 나오지 않는다. 언론사 id는 발음 변환이 아니라 **그 매체가 실제로 쓰는 영문 브랜드명**이어야 쓸모가
있고, 라이브러리는 그것을 모른다. **기각한 대안 — 현행 폴백 유지**(`press`·`press-2`·…): 후보 11건 중 순한글
이름이 전부 이름과 무관한 id가 되어 `CONVENTIONS.md` §식별자 규칙의 취지("사람이 읽을 수 있는")와 어긋난다.
**반영**: `lib/types/press.ts` · `lib/storage/press-repository.ts` · 회귀 케이스 6건.
Task 008A의 PATCH API는 "id는 patch에 담아도 무시된다"를 문서화한다(리뷰어 참고 권고).

### D-006 · A/B로 쪼갠 화면 Task는 A가 라우트를 완성하고, DoD 검증은 B 완료 회차에 함께 태운다

- 상태: 유효
- 결정: 3일차 · 화면(제기) · 팀장(확정)
- 영향 Task: Task 009A/009B · Task 012A/012B · Task 016A/016B · Task 018A/018B

**배경**: I-004 — 조각 A만 끝난 시점에는 라우트가 여전히 `ScreenPlaceholder`이거나 절반만 렌더링되어, A 자신의
DoD를 Playwright MCP로 태울 수 없다. 이 프로젝트는 `@playwright/test` E2E를 도입하지 않으므로
(`CONVENTIONS.md` §9) 브라우저 동선이 **유일한** 기능 검증 수단이고, 태울 수 없으면 완료 판정이 막힌다.
**결정**: 두 가지를 함께 적용한다.
1. **조각 A가 `page.tsx`를 만들 때 짝 조각 B의 컴포넌트를 이미 import하는 형태로 작성한다.** B는 그 컴포넌트의
   내부 구현만 채운다. A가 자리를 비워 두거나 B가 `page.tsx`를 다시 고치는 형태로 만들지 않는다.
2. **A의 DoD 중 B 없이는 확인할 수 없는 항목은 B가 완료되는 회차에 함께 태운다.** 이는 009B·018B에 이미 있는
   「되돌아오는 검증」 패턴과 같은 방식이며, 완료 처리된 A를 다시 열지 않는다.
**근거**: A를 "완료"로 체크하려면 DoD가 실행 가능해야 하는데, 지금 문서 구조로는 B가 끝나야만 실행할 수 있다.
이를 명시하지 않으면 A 담당 회차에 검증을 시도하다 막히고, 최악의 경우 확인하지 않은 채 체크된다.
**특히 Task 016**은 `docs/screens/01-crawl-run.md` 안에서도 [크롤링 시작] 버튼의 소유가 갈렸다(스켈레톤은
`app/page.tsx`에 직접, 파일 분할 경계 표는 `crawl-run-panel.tsx`에). **016A가 실행 버튼을 idle·`disabled`
상태의 껍데기까지 만들고, 016B가 진행·완료·실패 상태 전환만 이어받는다**로 확정한다 — 016A와 016B가 서로 다른
워크스트림(화면 / 크롤 파이프라인)이라 이 경계를 문서로 못 박지 않으면 양쪽이 같은 파일을 다르게 가정한다.
**반영**: `docs/screens/playwright-scenarios.draft.md`가 이미 이 전제로 작성돼 있다(각 절에 "실행 시점"과
"이 절이 다루지 않는 것" 표기). 각 조각이 열리는 회차의 소환 프롬프트에 이 결정을 명시한다.

### D-007 · 기사 txt 파서의 방어 규칙과 `finishRun`의 상태 산출

- 상태: 유효
- 결정: 3일차 · 크롤 파이프라인(Task 007)
- 영향 Task: Task 007 · Task 013B · Task 014B

Task 007 구현 중 ROADMAP에 명시되지 않아 담당이 직접 판단한 사항 세 가지를 함께 기록한다.

**① 제목·URL의 개행 처리와 왕복 DoD의 관계** — ROADMAP 구현 규칙("저장 전에 개행 제거")과 DoD("개행이 포함된
경우까지 원본과 일치")가 문자 그대로는 모순이었다. **개행 제거를 우선하고, 왕복은 "개행이 공백으로 치환된 값과
일치"로 판정한다.** 근거: 메타 라인 파서가 `# key: value`를 라인 단위로 매칭하므로 개행 보존은 이스케이프
포맷 도입이라는 재설계를 뜻하고, 제목은 크롤 단계에서 이미 개행이 걸러져 오는 것이 정상 경로이며,
`docs/screens/02-collect-result.md`는 제목을 항상 단일 행 `CardTitle`로만 쓰고 `whitespace-pre-wrap`은 본문에만
건다. 콜론·`#`은 이스케이프 없이 원본 그대로 왕복한다(파서가 `# key: ` 뒤 나머지를 통째로 값으로 읽는다).
3일차 교차검증에서 이 해석이 타당하다고 판정됐고, **`docs/ROADMAP.md`의 DoD 문구를 이 결정에 맞게 정정했다.**

**② `parseArticle`/`readArticle`의 경로-메타 교차검증** — 메타 라인의 `id`·`runId`가 호출자가 넘긴 경로 정보와
다르면 예외를 던진다. ROADMAP이 요구한 것은 아니지만, 파일이 잘못된 폴더로 옮겨지거나 손상된 경우를 조용히
넘기지 않기 위한 방어다(`CONVENTIONS.md` §7). 정상 경로에는 영향이 없다.

**③ `finishRun`의 상태 산출** — `failCount === 0 → 'done'`, `successCount === 0 → 'failed'`, 나머지 →
`'partial-failed'`. **`'aborted'`는 이 함수의 책임이 아니다** — Task 014B(중단 API)가 `updateRunMeta`로 직접
설정하는 경로로 남겨 두었다.

### D-008 · 라우트의 오류 경계는 `withErrorBoundary`로 공용화한다

- 상태: 유효
- 결정: 4일차 · 크롤 파이프라인(지적) · 저장소 계층(구현) · 팀장(확정)
- 영향 Task: Task 008A · Task 008B · Task 011 · Task 015A · Task 017 · Task 021B

**배경**: 4일차 교차검증에서 `app/api/press/route.ts`의 500 catch가 `error.message`를 그대로 응답에 실어
`CONVENTIONS.md` §7("원시 오류를 화면까지 흘리지 않는다")을 어기는 것이 발견됐고, `app/api/stopwords/route.ts`는
try/catch 자체가 없어 같은 부류의 실패에서 **응답 봉투가 통째로 깨졌다.**
**결정**: `lib/api/response.ts`에 `withErrorBoundary(fn, fallbackMessage)`를 두고 모든 라우트 핸들러가 저장소
호출부를 이것으로 감싼다. 원시 오류는 `console.error`로 서버 콘솔에만 남기고, 응답은 항상
`fail(fallbackMessage, 500)`로 나가 `{ ok, message }` 봉투가 유지된다.
**근거**: 이 라우트들이 앞으로 만들 API 전부의 본이 된다. 여기서 새면 008B·015A·017·021B가 같은 구멍을
복제하고, 나중에 다섯 군데를 동시에 고쳐야 한다. **`fn`이 반환하는 `Response`는 그대로 통과하고 throw만
가로채므로**, 경계 안에서 `fail(msg, 404)`·`fail(msg, 409)`·`ok(data, 202)`를 `return`해도 500에 삼켜지지
않는다 — 리뷰어가 404 케이스로 실증했고 015A의 202·409 시나리오에도 그대로 쓸 수 있음을 확인했다.
**반영**: `lib/api/response.ts` · `app/api/press/route.ts` · `app/api/stopwords/route.ts` ·
`app/api/stopwords/[id]/route.ts`. 이후 라우트는
`return withErrorBoundary(async () => { ...; return ok(...) }, '한국어 실패 메시지')` 형태로 쓴다.

### D-009 · zod 필드 생략 시의 한국어 메시지는 API 레벨 방어로 처리한다

- 상태: 유효
- 결정: 4일차 · 저장소 계층(제기) · 크롤 파이프라인(판정) · 팀장(확정)
- 영향 Task: Task 004 · Task 008A · Task 008B · Task 011

**배경**: I-008 — 요청 본문에서 키가 통째로 생략되면 zod 기본 영문 메시지가 나온다.
**결정**: `fieldErrorsFromZod`의 "한글 없으면 일반화된 한국어 문구로 치환" 방어로 확정한다.
**스키마(`lib/types/press.ts` 등)에 필수 메시지를 추가하지 않는다.**
**근거**: 이 경로는 **컨트롤드 인풋 폼에서 애초에 도달 불가능하다** — 실제 화면(Task 009B `PressFormDialog`)은
빈 값도 `""`으로 보내지 키를 생략하지 않으므로, 생략 케이스는 API를 직접 호출할 때만 나온다. 방어가 실제로
한국어를 내보내는 것을 리뷰어가 직접 검증했다(`name` 키 생략 → `"name 값을 확인하세요"`). 스키마 전체에
필수 메시지를 다는 것은 도달하지 않는 경로를 위해 모든 필드를 손보는 일이라 값어치가 낮다.
**남는 거칢**: 생략 케이스의 문구가 사람이 읽는 라벨("언론사명")이 아니라 카멜케이스 키("name")를 노출한다.
실사용 경로가 아니므로 감수한다.

### D-010 · `aggregate.ts`는 `safeTokenize`를 직접 호출한다

- 상태: 유효
- 결정: 5일차 · 저장소 계층
- 영향 Task: Task 020B · Task 021A

**배경**: `AnalysisSummary`의 `totalTokenCount`(원 토큰)와 `filteredTokenCount`(조사·어미·접미사 제거 후)는
020A의 `extractKeywords`/`filterKeywordTokens`만으로는 만들 수 없다. 두 함수는 이미 **품사(NNG/NNP/SL) +
1글자 + 불용어**까지 다 걸러진 키워드 후보만 돌려주므로, 그보다 **느슨한 중간 집계 수치**를 얻으려면 원본
토큰 배열이 따로 필요하다.
**결정**: `aggregate.ts`가 `./kiwi`의 `safeTokenize(text)`를 직접 호출해 원본 토큰을 얻고, `totalTokenCount`·
`filteredTokenCount`를 태그로 직접 센다. 키워드 후보 자체는 `filterKeywordTokens`(020A)를 그대로 재사용해
POS·길이 필터를 다시 구현하지 않는다. `stopwordExcludedCount`는 `filterKeywordTokens`를 **불용어 없이/있이
두 번 불러 그 차이로** 구한다 — 필터 로직을 손으로 옮겨 적지 않기 위함이다.
**근거**: `safeTokenize`는 D-002가 `lib/keyword/index.ts`의 공개 API로 확정한 **안전 래퍼**이지 원시 `Kiwi`
인스턴스가 아니다. `extract.test.ts`(020A)도 같은 패턴으로 직접 호출한다. "020B는 Kiwi를 직접 건드릴 필요가
없다"는 안내는 **원시 인스턴스나 새 tokenize 래퍼를 만들 필요가 없다**는 뜻으로 읽는 것이 맞고, 이미 안전한
공개 API를 부르는 것은 D-002와 충돌하지 않는다. 이 호출 없이는 DoD("5개 수치를 모두 산출")를 만족할 경로가
없었다.
**반영**: `lib/keyword/aggregate.ts`. **`filteredTokenCount`가 최종 키워드 수와 구분되는 것이 이 결정의 핵심
결과다** — 두 수치가 같아지면 "조사를 걷어냈다"를 사용자에게 증명하는 근거가 무너진다.

### D-011 · 화면 A/B 조각의 `page.tsx` 소유는 Task마다 다르며 work 문서가 정한다

- 상태: 유효
- 결정: 5일차 · 화면(제기) · 팀장(확정)
- 영향 Task: Task 009A/009B · Task 012A/012B · Task 016A/016B · Task 018A/018B

**배경**: 5일차 소환 프롬프트가 D-006을 "조각 A가 항상 `page.tsx`를 갖는다"로 읽고 009A에 `app/press/page.tsx`를
배정했다. 담당이 착수 전에 **`docs/ROADMAP/work/03.화면.md`와 `docs/screens/playwright-scenarios.draft.md`가
009에 한해 `page.tsx`를 009B 몫으로 정해 두었음**을 발견하고 멈춰 확인을 요청했다. 그대로 갔으면 `page.tsx`
소유가 두 조각에 겹쳤을 것이다.
**결정**: **D-006의 취지는 "라우트에 도달할 수 없어 A의 DoD를 검증하지 못하는 상황을 막는다"이고, 그 수단이
`page.tsx`를 한 조각에 몰아 두는 것이다. 누가 갖느냐는 Task마다 다르며 work 문서가 단일 소스다.**
- **009는 B가 `page.tsx`를 갖는다.** B가 나중에 오므로 **이미 완성된 A의 컴포넌트를 그대로 import**하면 되고
  순방향 참조 문제가 애초에 없다. A의 DoD는 B 완료 회차에 함께 태운다(D-006 두 번째 항목).
- **012·016·018은 A가 `page.tsx`를 갖는다.** A가 B의 컴포넌트를 정적 뼈대째 만들어 두고 B가 내부를 채운다.
**근거**: work 문서는 영역 범위의 단일 소스다. 소환 프롬프트가 그것과 어긋나면 **문서가 이긴다.** 담당이
착수 전에 멈춰 확인한 판단이 옳았고, 이 사례를 규칙으로 남겨 다음 회차의 소환 프롬프트가 같은 오해를
반복하지 않게 한다.
**반영**: 5일차에 009A는 컴포넌트 3종 + `press-client.ts`만 만들고 `app/press/page.tsx`는 손대지 않았다.
012A는 `page.tsx`를 만들고 012B의 `stopword-add-card.tsx`를 뼈대로 두었다.

### D-012 · `crawlPress`는 저장소를 모른다 — `runId`를 인자로 받고 `id` 없는 `ArticleDraft`를 반환한다

- 상태: 유효
- 결정: 6일차 · 크롤 파이프라인(Task 013B)
- 영향 Task: Task 013B · Task 014A

**배경**: `Article` 스키마는 `id`(실행 전체에서 유일한 4자리 순번)를 요구하는데, 이 모듈은 **언론사 1곳만 보고
크롤하므로 다른 언론사가 같은 실행에서 몇 건을 만들지 알 수 없어** 전역 순번을 스스로 매길 수 없다.
**결정**:
1. `crawlPress(press, runId, options?, hooks?)` — `runId`를 문자열 인자로 받는다. **이 모듈은 `lib/storage/`를
   import하지 않는다.** 호출부(014A)가 `createRun`으로 만든 값을 전달만 한다.
2. 반환은 **`ArticleDraft = Omit<Article, 'id'>`**. `id`는 014A가 여러 언론사 결과를 모아 저장 시점에 매긴다.
3. `PressCrawlResult.failures: CrawlFailure[]`는 **언론사 전체 실패**(피드·목록 페이지 실패·링크 0건 — 이때
   `failures.length === 1`이고 `articles`는 빈 배열)와 **개별 기사 실패**를 함께 담는다. 호출부가 배열의
   길이·내용으로 두 경우를 모두 판단할 수 있다.
**근거**: 저장소나 전역 순번 배정을 이 모듈에 넣으면 "이 모듈은 저장소·HTTP를 모른다"는 경계와 충돌한다.
`id`를 호출부가 채우는 편이 이 모듈이 저장소를 import하는 것보다 경계가 명확하다.
**반영**: `lib/crawler/press-crawler.ts`. **Task 014A는 이 계약을 그대로 전제하면 된다** — ① `createRun`의
`runId`를 넘기고 ② 반환된 `articles`에 전역 순번을 매겨 `saveArticle` ③ 성공·실패 합산으로 `finishRun`.

### D-013 · 언론사 레벨 동시성은 Task 014A가 별도로 제한할지 판단한다

- 상태: 해소 (7일차 · D-015로 판단 완료)
- 결정: 6일차 · 크롤 파이프라인(제기)
- 영향 Task: Task 014A

`crawlPress`는 자기 안에서 `crawlerConfig.concurrency`(기본 2)만큼 동시 페이지를 연다. **014A가 언론사 N곳을
병렬로 돌리면 실제 동시 페이지 수가 N×2가 된다.** 대상 서버 부담 방지가 이 설정의 목적이므로, 014A가 언론사
레벨 동시성도 별도로 제한할지 그 Task 착수 시 판단한다. 013B 범위 밖이라 열어 둔다.

### D-014 · 재사용 다이얼로그는 effect로 폼을 다시 채우지 않고 `key` 리마운트로 초기화한다

- 상태: 유효
- 결정: 6일차 · 화면(Task 009B)
- 영향 Task: Task 009B · Task 016A · Task 018 계열(같은 "재사용 다이얼로그" 패턴)

**배경**: 009A의 표·카드는 수정/삭제 버튼에서 다이얼로그를 직접 열지 않고 **콜백만 부모에 알린다.** 그래서
`PressFormDialog`는 `app/press/page.tsx`가 들고 있는 `open`/`press` 상태로 제어된다. 처음에는 "열릴 때마다
`useEffect`로 폼 필드를 다시 채우는" 방식으로 구현했는데, 이 저장소에 켜져 있는
**`react-hooks/set-state-in-effect` 규칙이 `npm run lint`를 실패**시켰다(effect 본문에서 여러 `setState`를
동기 호출하면 cascading renders 경고).
**결정**: 페이지가 다이얼로그를 열 때마다 증가하는 카운터를 `key`로 넘겨 **컴포넌트를 통째로 리마운트**한다.
그러면 다이얼로그 내부의 모든 `useState`가 props를 초기값으로 삼는 평범한 형태로 충분해지고, "열릴 때마다
다시 채우는" effect 자체가 사라진다. **닫힐 때는 `key`를 바꾸지 않으므로** Radix Dialog의 닫힘 애니메이션이
보존된다.
**근거**: React 공식 문서(「You Might Not Need an Effect」 §Resetting state with a key)가 권하는 표준 패턴이다.
**부수 효과가 오히려 이득이다** — 행마다 다이얼로그를 인스턴스화하는 대신 페이지가 **하나만** 렌더링하므로
`press-name`·`press-feed-url` 같은 `id`가 페이지 안에서 항상 유일하다. 행이 N개면 같은 `id`를 가진 입력이
DOM에 N개 존재할 뻔한 문제를 피한다.
**설계서와의 관계**: `docs/screens/04-press-manage.md`의 마크업 스켈레톤은 행마다 트리거를 두는 형태지만,
스켈레톤은 "구현은 파일 분할 경계 표대로 나눈다"는 전제의 참고 자료이지 리터럴 규격이 아니다. 상태 소유
구조를 바꾼 것은 설계서 위반이 아니라고 판단했다.
**반영**: `app/press/page.tsx`(다이얼로그 상태 소유) · `components/press/{press-form-dialog,delete-press-dialog}.tsx`
(항상 controlled `open`/`onOpenChange`, 개별 트리거 prop 없음).

**같은 규칙에서 나온 데이터 페칭 관용구**: `useCallback`/`useEffectEvent`로 감싼 함수를 이펙트에서 호출해도
이 규칙에 걸린다. `useEffect(() => { fetchX().then(setState).catch(setState) }, [dep])` 형태로 **완전히
인라인**해야 통과한다. Task 016A·018A도 데이터 조회가 필요하니 이 형태를 그대로 쓴다.

### D-015 · 언론사 레벨 동시성은 `pressConcurrency`로 별도 제한한다

- 상태: 유효 (D-013 판단 이월분 해소)
- 결정: 7일차 · 크롤 파이프라인(Task 014A)
- 영향 Task: Task 014A

**배경**: `crawlPress`는 언론사 1곳 안에서 `crawlerConfig.concurrency`(기본 2)만큼 동시 페이지를 연다.
`startRun`이 선택된 언론사 N곳을 전부 병렬로 실행하면 실제 동시 Playwright 페이지 수가 N×2가 된다.

**결정**: `crawlerConfig`에 `pressConcurrency`(기본 3, `CRAWL_PRESS_CONCURRENCY`로 조정)를 추가하고
`run-manager.ts`가 `pLimit(crawlerConfig.pressConcurrency)`로 언론사 단위 동시 실행 수를 한 번 더 제한한다.

**근거**: `concurrency`는 **대상 서버 1곳**으로 가는 동시 요청을 막는 장치라, 서로 다른 언론사(=서로 다른
호스트)를 병렬로 돌려도 특정 서버의 부담은 늘지 않는다 — D-013이 우려한 "대상 서버 부담"은 사실 언론사
수가 늘어도 커지지 않는다. 반면 이 프로세스가 동시에 여는 Playwright 페이지 총량은 **로컬 리소스**이고,
언론사 등록은 코드 수정 없이 자유로우므로(F007) 무한정 커질 수 있다. 그래서 대상 서버 보호가 아니라
**로컬 리소스 보호** 목적으로 캡을 씌웠다. **값 3은 실측이 아니라 보수적 추정이다** — 다수 언론사 동시
크롤 시 메모리 사용량을 재서 조정할 수 있다.

**반영**: `lib/crawler/config.ts` · `lib/crawler/run-manager.ts`.

**교차 참조(15일차, 화면 Task 024)**: `config.ts:12`의 `pressConcurrency` 주석이 이 결정이 아니라
이월된 질문인 D-013을 인용하고 있었다. 실제로 `pressConcurrency`를 도입하고 코드에 반영한 결정은
D-013이 아니라 이 D-015이므로, 주석이 가리키는 번호를 D-015로 정정했다.

### D-016 · Task 014A와 014B의 `getRunProgress`·`abortRun` 경계

- 상태: 유효
- 결정: 7일차 · 크롤 파이프라인(Task 014A)
- 영향 Task: Task 014A · Task 014B

**배경**: `docs/ROADMAP.md` Task 014는 `startRun`/`getRunProgress`/`abortRun`을 한 블록으로 묶었지만
work 문서는 014A(잡 레지스트리·백그라운드 실행)와 014B(진행 복구·중단·중복 차단)로 쪼갰다. 두 함수를
이번 회차에 얼마나 구현할지 경계가 코드로는 드러나지 않는다.

**결정**: 014A는 여기까지만 구현한다.
- `getRunProgress`: 레지스트리에서 진행 스냅샷을 읽어 반환한다. **서버 재시작으로 레지스트리가 비었을 때
  `run-meta.json`으로 복구하지 않는다** — 찾지 못하면 예외를 던진다.
- `abortRun`: `RunJob.aborted` 플래그만 세운다. **크롤 루프가 그 값을 읽어 실제로 멈추는 것,
  `run-meta.json`에 `aborted`를 쓰는 것, 중복 실행 409 거절은 전부 014B로 넘긴다.** 플래그는 지금
  아무 동작에도 연결돼 있지 않다.

**근거**: 셋을 절반만 구현하면 "중단했는데 왜 아직 `running`인가" 같은 어중간한 상태가 생긴다. 아무 효과가
없는 상태로 명확히 남기고 014B가 한 번에 완성하는 편이 상태 불일치를 만들지 않는다.

**반영**: `lib/crawler/run-manager.ts`. Task 014 DoD 5개 중 "중단 후 `status`가 `aborted`"·"서버 재시작 시
중단된 실행으로 표시" 2개는 014B로 이월한다.

### D-017 · `RunProgress.pressStatuses[].failReason`은 014A가 정형 라벨로 다듬는다

- 상태: 유효
- 결정: 7일차 · 크롤 파이프라인(Task 014A — 6일차 화면 워크스트림 리뷰 지적 반영)
- 영향 Task: Task 014A · Task 016B(참고)

**배경**: 화면 설계서 `01-crawl-run.md` §상태별 화면 ⑤는 `failReason`이 **두 단어 정형 라벨**이길
기대한다(HTML은 `타임아웃`/`셀렉터 불일치`, RSS는 `피드 파싱 실패`/`피드 응답 없음`). 그런데
`press-crawler.ts`·`fetchHtml`·`fetchFeed`가 만드는 문구는 자유 형식 원문이다
(`page.goto: Timeout 30000ms exceeded.`, `목록 페이지에서 기사 링크를 찾지 못했습니다(셀렉터를 확인하세요)` 등).
`RunProgress`를 정의하는 것이 014A라 여기서 판단해야 했다.

**결정**: `run-manager.ts`에 `normalizeFailReason(press, rawError)`을 두어 언론사 전체 실패일 때
`failReason`을 정형 라벨로 바꾸고, 원문은 `rawFailReason`(신규 필드)에 그대로 남긴다.
- HTML: `"...링크를 찾지 못했습니다"` 포함 → `셀렉터 불일치`, 그 외 → `타임아웃`
- RSS: `"...해석할 수 없습니다"`·`"...형식이 아닙니다"` 포함 → `피드 파싱 실패`, 그 외 → `피드 응답 없음`

**근거**: `docs/CONVENTIONS.md` §7("원시 오류를 화면까지 흘리지 않는다. 경계에서 한국어 메시지로 바꾼다").
`RunProgress`를 만드는 경계가 014A이므로 여기서 다듬지 않으면 016B가 원문을 그대로 뿌리거나 매핑을
빠뜨린 채 넘어간다. `rawFailReason`은 근사 매핑이 틀렸을 때 원인을 추적하려고 남겼다.

**한계 — 그대로 두기로 한 것 둘**:
1. **HTML의 `타임아웃`은 근사치다.** `fetchHtml` 실패 사유에는 DNS 실패·연결 거부·인증서 오류도 있는데
   설계서가 라벨을 둘로 못 박아 전부 `타임아웃`으로 묶였다. 세분화하려면 설계서를 늘려야 한다(화면 몫).
2. **D-012 계약의 엣지 케이스를 수용했다.** `failures`는 "언론사 전체 실패"와 "링크가 1개였는데 그게
   개별 실패"를 구분하지 못한다(둘 다 `articles: []` + `failures.length === 1`). `target`이 1인 드문
   경우에만 라벨 문구가 부정확해지고 해당 언론사가 `failed`로 표시되는 결과 자체는 맞다.

**반영**: `lib/types/crawl-run.ts` · `lib/crawler/run-manager.ts` · `lib/crawler/run-manager.test.ts`(회귀 8건).

### D-018 · Playwright MCP 콘솔 오류 0건 판정 — 의도적으로 태운 4xx·5xx 응답 로그는 제외한다

- 상태: 유효
- 결정: 7일차 · 팀장(Task 010B 교차검증 중)
- 영향 Task: Task 010B(반영) · **Task 025(같은 판단이 반드시 다시 필요해지는 지점)**

**배경**: 010B 교차검증에서 리뷰어가 실패 케이스(존재하지 않는 피드 URL·비XML 응답)를 태울 때 콘솔에
`Failed to load resource: the server responded with a status of 400 @ /api/press/test-source`가 찍혔다.
이걸 콘솔 오류로 세어 fail로 잡을지 판단이 필요했다.

**결정**: **의도적으로 태운 실패 케이스에서 나오는 4xx·5xx 리소스 로드 로그는 콘솔 오류 0건 판정에서
제외한다.** 세는 것은 **런타임 예외 · React 에러 바운더리 발동 · 처리되지 않은 Promise rejection**뿐이다.

**근거**:
1. 브라우저가 실패한 네트워크 응답을 자동 기록한 것이지 앱의 JS가 던진 예외가 아니다 — 스택트레이스도
   React 에러도 없다.
2. 화면은 그 응답을 받아 destructive Alert를 정상적으로 그렸다(의도한 동작). 검증 실패를 400으로
   내려주는 `fail(message, 400)` 구조(§6)를 쓰는 모든 라우트에 이미 있는 특성이라 010B만의 결함이 아니다.
3. 이 기준이 없으면 검증 실패를 의도적으로 태우는 모든 시나리오가 걸려, **정상 동작을 결함으로 오판한다.**

**Task 025로 이어지는 이유**: Task 025의 DoD가 `browser_console_messages` 에러 0건을 요구하는데, 그
여정에는 언론사 삭제·크롤 실패 등 의도적 실패가 반드시 포함된다. 이 결정이 없으면 그 회차 담당이
처음부터 다시 판단하거나 정상 동작을 결함으로 잡는다.

### D-019 · Task 014B는 `lib/crawler/press-crawler.ts`(013B 산출물)에 중단 훅을 추가한다

- 결정: 8일차 · 크롤 파이프라인(Task 014B)
- 영향 Task: Task 014B(반영) · Task 013B(수정 대상)

**배경**: ROADMAP Task 014의 「생성/수정 파일」은 `lib/crawler/run-manager.ts`·`lib/types/crawl-run.ts`
둘뿐이다. 그런데 D-016은 014B의 몫을 "**크롤 루프가** 그 값을 읽어 실제로 멈추는 것"이라고 못 박았고,
그 크롤 루프(`collectArticlePages`)는 `run-manager.ts`가 아니라 `press-crawler.ts`에 있다.

**결정**: `PressCrawlHooks`에 `isAborted?: () => boolean`을 추가하고, `collectArticlePages`가 다음 링크를
처리하기 직전(아직 `fetchHtml`을 부르기 전)에 이 값을 읽어 true면 요청 없이 실패로 접는다. 이미 시작된
요청은 손대지 않는다 — "진행 중 페이지를 강제로 죽이지 않는다"는 구현 규칙과 같은 경계다.

**기각한 대안**: `run-manager.ts`만 고쳐 언론사 단위로만 중단을 반영한다 — 언론사 1곳이 기사 수십 건을
가지면 [중단]을 눌러도 그 언론사가 끝날 때까지 수 분간 요청이 계속 나간다. 화면 설계서 01의 [중단] 버튼
기대와 어긋난다.

**곁가지로 잡은 버그**: `crawlRssPress`(RSS 본문 전문 경로)의 `offsetHooks`가 `onArticleDone`만 옮기고
`isAborted`를 빠뜨리고 있었다. 고치지 않았으면 **RSS 전문 경로에서만 중단이 안 먹는데 HTML 경로 테스트는
통과하는** 상태로 남았을 것이다. 화면이 교차검증에서 두 경로 모두 훅이 걸렸는지 직접 확인했다.

### D-020 · `getRunProgress`·`abortRun`은 `Promise`를 반환한다

- 결정: 8일차 · 크롤 파이프라인(Task 014B)
- 영향 Task: Task 015A · Task 015B

**배경**: DoD ⑤("서버 재시작 시 고아 run을 조회 시점에 `aborted`로 간주")를 만족하려면 레지스트리에 없는
runId를 `run-repository.getRun`(fs 읽기, 비동기)으로 복구해야 한다. 014A의 원형은 레지스트리 Map 조회만
했으므로 둘 다 동기였다.

**결정**: 두 함수 모두 `Promise` 반환으로 바꾼다. 라우트 핸들러는 이미 비동기라 `await`만 붙이면 되고
별도 어댑터는 필요 없다. 015B가 이 계약대로 GET 라우트를 만들었고 `typecheck`·`build`로 확인됐다.

### D-021 · `RunAlreadyRunningError`로 409 신호를 올린다

- 결정: 8일차 · 크롤 파이프라인(Task 014B)
- 영향 Task: Task 015A

**배경**: "이미 `running`인 run이 있으면 409로 거절한다"는 HTTP 상태 코드인데 `run-manager.ts`는 HTTP를
모르는 lib 계층이고, `withErrorBoundary`는 모든 예외를 500으로 뭉갠다(D-008).

**결정**: `class RunAlreadyRunningError extends Error`를 만들어 `startRun`이 이 타입으로 던진다. 015A가
`instanceof`로 확인해 `fail(message, 409)`로 매핑한다.

**남은 판단**: 이 검사는 **이 프로세스의 메모리 레지스트리만** 본다. 죽은 프로세스가 남긴 `run-meta.json`상의
`running` 고아는 걸리지 않고 조회·중단 시점에 `aborted`로 정리된다. 로컬 1인 도구에서 죽은 고아는 더 이상
아무 작업도 하지 않으므로 실질적 자원 경합이 없다 — `startRun`이 `listRuns()`로 디스크 전체를 스캔하는
것은 과설계로 보고 하지 않았다.

### D-022 · run 생명주기 예외 3종을 전용 클래스로 올리고 `@/lib/crawler` 배럴에서 재수출한다

- 결정: 8일차 · 팀장(교차검증 후속) · 선언 위치와 클래스명은 크롤 파이프라인 판단
- 영향 Task: Task 014B · Task 015B(반영) · **Task 015A(9일차 — 이 계약 위에 만든다)**

**배경**: I-016. 문자열 접두사로 404를 판정하던 구조는 문구를 다듬는 순간 조용히 500이 되고 모든 검사가
통과한다. 9일차 015A가 `abortRun`의 두 예외를 또 문자열로 갈라야 하는 상황이라, **그 위에 쌓기 전에**
계약을 바꾸기로 했다.

**결정**:
- `RunNotFoundError`는 발생지인 `lib/storage/run-repository.ts`(Task 007)에 선언하고 `readRunMeta`의
  ENOENT 분기가 던진다. `RunNotAbortableError`는 `abortRun`이 던지는 두 지점이 모두
  `lib/crawler/run-manager.ts` 안이라 `RunAlreadyRunningError`와 나란히 둔다.
- `lib/crawler/index.ts`가 셋을 한 곳에서 재수출한다 — 015A·015B가 run 생명주기 예외를 `@/lib/crawler`
  하나에서 가져오게 하려는 것이다. `lib/crawler`가 `lib/storage`를 가져오는 기존 방향은 유지한다.
- **한국어 메시지 문구는 한 글자도 바꾸지 않는다.** 화면이 `.message`를 그대로 사용자에게 보여주므로
  바꾸는 것은 타입뿐이다.

**015A가 쓸 매핑**: `RunAlreadyRunningError` → 409. `RunNotFoundError` → 404. `RunNotAbortableError` →
409 또는 400(015A 판단). 셋 다 `.message`가 그대로 노출 가능한 한국어다.

### D-023 · 디스크에서 복구한 `RunProgress`에는 `recovered` 플래그를 붙인다

- 결정: 8일차 · 팀장(교차검증 후속)
- 영향 Task: Task 014B(반영) · **Task 016A · Task 016B(이 플래그로 표현을 가른다)**

**배경**: 화면이 014B 리뷰에서 짚은 회색지대다. `recoverRunProgress`는 `pressStatuses[].target`을 실제
목표치가 아니라 `collected`와 같은 값으로 채운다(원래 목표는 메모리에만 있어 복구 불가). 화면이 그대로
그리면 **원래 20건 목표였다가 5건에서 끊긴 언론사가 "5/5건 · 완료"로** 보인다. 실행 전체 status는
`aborted`로 정확하지만 언론사별 줄은 "정상적으로 다 끝났다"고 말한다 — **모르는 값을 확정치처럼 보여주는
것**이라 받아들이지 않는다.

**결정**: `RunProgress`에 **선택적** `recovered?: boolean`을 더한다. 정상(레지스트리 적중) 경로는 필드를
아예 붙이지 않고, 디스크 복구 경로 두 갈래(고아 running→aborted 확정 / 이미 끝난 run 반환) 모두 `true`다.
016A·016B는 이 값이 `true`면 언론사별 수치가 근사값임을 표현에 반영한다.

**기각한 대안**: `target`을 `null`로 바꾼다 — 더 정직하지만 `RunProgress`를 이미 015B가 소비 중이고
016A·016B가 곧 붙는데, 필수 수치 필드를 nullable로 바꾸면 소비처 전부가 분기를 떠안는다. 플래그 하나로
화면이 표현을 고르게 하는 쪽이 비용이 낮다.

**회귀**: 복구 경로에서 `true`, 정상 경로에서 `undefined`를 **각각** 단언하는 케이스를 남겼다 — 한쪽만
두면 "항상 `true`"인 버그가 통과한다.

### D-024 · `use-crawl-progress` 훅은 오류 응답을 받아도 폴링을 멈추지 않는다

- 결정: 8일차 · 화면(Task 015B)
- 영향 Task: Task 015B(반영) · Task 016A(재검토 여지)

**배경**: DoD와 화면 설계서 01은 "종료 상태(`done`/`partial-failed`/`failed`/`aborted`)에서 멈춘다"만
못 박았다. 404·500이나 `fetch` 자체 실패는 명시가 없다.

**결정**: 오류 응답을 받아도 다음 1초 타이머를 계속 건다 — `status`가 종료 상태일 때만 멈춘다. 오류
메시지는 노출하고 다음 성공 응답에서 지운다.

**근거**: `next dev`의 HMR·서버 재시작이 잦은 로컬 1인 도구라, 일시적 실패로 폴링을 영구 정지시키면
서버가 회복돼도 화면이 스스로 복구할 방법이 없다. 반대로 없는 runId에 영원히 재시도하는 비용은 초당 1회
로컬 요청이라 무시할 수 있고, 016A는 `POST /api/crawl`이 돌려준 runId만 이 훅에 넘긴다.

**남은 판단**: 저장소 계층이 교차검증에서 "연속 N회 오류 시 중단" 상한을 방어적으로 두자고 제안했다
(블로킹 아님). 016A가 훅을 실제 화면에 붙일 때 다시 연다.

### D-025 · Task 017의 서버 조립 표시 문자열은 순수 함수로 분리한다

- 결정: 8일차 · 저장소 계층(유휴 배정) · **위치는 017 담당자 판단으로 열어 둔다**
- 영향 Task: Task 017(10일차 착수)

**배경**: `GET /api/runs`의 `label`(`2026-08-10 14:32 · 언론사 3 · 성공 42 · 실패 2`)과
`GET /api/runs/{runId}`의 `durationLabel`(`6분 36초`)은 둘 다 ISO 시각을 한국어 표시 문구로 조립하는 같은
종류의 로직이고, ROADMAP이 **서버 조립**을 명시했다.

**결정**: 두 라우트에 인라인으로 각각 짜지 않고 순수 함수로 뽑아 재사용한다. 근거는 ① 순수 함수여야
`docs/CONVENTIONS.md` §9의 회귀 테스트 대상이 되는데, 날짜 포맷은 **틀려도 화면이 멀쩡해 보이는** 전형적인
종류다. ② 같은 `startedAt`/`finishedAt`을 두 곳에서 포맷하므로 인라인이면 나중에 한쪽만 고쳐진다.

**열어 둔 것**: 파일 위치. `lib/api/`는 클라이언트도 import하는 디렉터리(§2)라 서버 전용 포맷 로직을 거기
두는 게 맞는지, 아니면 라우트 전용 헬퍼로 둘지는 017 담당자가 정한다.

**함께 참고할 것(교차검증에서 추가로 나온 것)**: `ArticleListEntry.pressName`을 채우려고 기사마다
`getPress(pressId)`를 부르면 N+1이 된다 — `getPress`는 호출마다 `press-sources.json` 전체를 다시 읽는다
(`lib/storage/press-repository.ts:79-82`, 캐싱 없음). `listPress()`를 한 번 불러 `Map<id, PressSource>`로
재사용하는 편이 낫다. 1초 DoD를 못 지킬 정도는 아니라 이슈로 올리지 않고 여기 참고로 남긴다.

**시각 필드 경계 판정**: `startedAt`/`finishedAt`은 ISO로 그대로 내리고 `label`·`durationLabel`만 서버가
조립하는 초안의 경계는 옳다 — 데스크톱 와이어프레임은 `14:32:05 → 14:38:41`, 모바일은 `14:32 → 14:38`로
**포맷 자체가 다르다.** 반응형에 따라 갈리는 필드까지 서버가 한 문자열로 구우면 한쪽이 깨진다.

### D-026 · 삭제된 언론사의 이름은 스냅샷하지 않고 API가 `name: null, deleted: true`를 내린다

- 결정: 9일차 · 저장소 계층(유휴 배정 — I-014 해소)
- 영향 Task: Task 017(10일차 착수) · Task 018A

**배경**: I-014. `CrawlRun.targetPressIds`는 id만 갖고, `deletePress`는 소프트 삭제 없이 배열에서
완전히 제거하므로 삭제된 언론사의 원래 이름을 복구할 방법이 없다.

**결정**: API는 `{ id, name: string | null, deleted: boolean }`을 내리고 삭제된 쪽은 `name: null`이다.
`run-meta.json`에 실행 시점 이름을 스냅샷하는 안은 채택하지 않는다.

**근거(코드 경로로 확인한 것)**: 스냅샷 필드를 **필수로** 추가하면 스냅샷 없는 과거 `run-meta.json`이
`crawlRunSchema.safeParse`에서 실패하고, `readRunMeta`가 그것을 "손상된 파일"로 던지며, `listRuns`가
그 예외를 삼켜 **해당 run을 목록에서 통째로 제외한다.** 비파괴적으로 하려면 optional로 둬야 하는데
그러면 과거 run은 여전히 이름이 비어 있다 — "반쪽 해결"이 설계 추정이 아니라 실제 코드 경로로 확인된다.
또 Task 007·013B·014A·014B가 모두 완료 Task라 스키마를 건드리면 그 넷의 리뷰를 다시 열어야 한다.

**API가 보장하는 계약**: `id`는 삭제 여부와 무관하게 **항상** 있다. `name`은 존재하면 **현재** 이름이고
삭제됐으면 `null`이다(과거 이름이 아니다 — 애초에 모른다). `deleted`는 `getPress(id)`가 `null`인지로
판정한다. `RunSummary.targetPress[]`와 `ArticleListEntry`/`ArticleDetail`의 `pressName`/`pressDeleted`에
같은 규칙을 쓴다.

**완전히 폐기하지는 않는다**: 실사용에서 "삭제된 언론사가 섞인 run이 많아 화면이 계속 `null`을 그린다"는
불만이 나오면 optional 필드 추가(하위호환 유지) + 과거 run은 여전히 `null`이라는 제약을 명시하고 재검토한다.

### D-027 · 삭제된 언론사 배지는 고정 문구 "삭제된 언론사"로 대체한다

- 결정: 9일차 · 화면(I-014의 화면 쪽 몫)
- 영향 Task: Task 018A · Task 018B

**결정**: `deleted`가 true인 항목은 배지 텍스트를 **"삭제된 언론사"** 고정 문구로 채운다. `Badge`
`variant`를 `secondary` → `outline`으로 바꾸되 이건 **보조** 신호이고 주 신호는 문자열 자체다.
실행 요약 카드(③)·기사 파일 목록(④)·본문 미리보기(⑤) 세 지점에 같은 규칙을 쓴다.

**§8의 두 요구를 어떻게 화해시켰는가**: "색상 단독으로 상태를 전달하지 않는다"(더 넣으라)와 "설계서에
없는 UI를 지어내지 않는다"(넣지 말라)가 서로 당긴다. 화해점은 **이미 설계서에 있는 `Badge` 안에서
텍스트 콘텐츠만 바꾸는 것**이다 — 텍스트는 스크린리더에도 색맹에도 동일하게 전달되므로 그 자체로 §8을
만족하고, 새 컴포넌트·아이콘·마크업 구조를 추가하지 않으므로 "지어내지 않는다"도 지킨다.

**기각한 대안**: ① **id를 텍스트로 노출** — 나머지 배지는 전부 사람이 읽는 이름인데 이것만 슬러그면
"이게 무슨 언론사지"로 잘못 해석할 여지가 더 크다. ② **새 아이콘(`Ban`) 병기** — §8이 요구하는 것은
"색상 단독 금지"이지 "아이콘 필수"가 아니고, `Ban`은 이미 헤더 내비의 "불용어 관리" 아이콘이라 잘못된
연상을 만든다. 설계서의 아이콘 목록까지 고쳐야 해서 "지어내지 않는다"와 더 크게 부딪힌다.
③ **배지를 아예 숨긴다** — "이 run이 원래 몇 곳을 대상으로 했는가"라는 사실이 소실된다(3곳 중 1곳이
삭제됐는데 칩이 2개면 "원래 2곳이었나?"로 오인한다).

**받아들인 한계**: 한 run에 삭제된 언론사가 여럿이면 전부 같은 문구라 서로 구분되지 않는다. 이름을
복구할 방법이 없으니(D-026) 구분할 근거 자체가 없다.

**설계서 수정 필요(팀장 판단 대기)**: `docs/screens/02-collect-result.md`의 마크업 스켈레톤은
`targetPressNames: string[]`·`ArticleFileItem { pressName: string }`으로 돼 있어 확정된 실제 응답 모양과
**타입 자체가 다르다.** 018A 담당이 스켈레톤을 그대로 베끼면 컴파일 단계에서 어긋난다. 10일차에는
018A가 열리지 않으므로 그 착수 회차까지 정리한다.

### D-028 · `RunNotAbortableError`는 409로 매핑한다

- 결정: 9일차 · 크롤 파이프라인(Task 015A) · D-022가 015A 판단으로 열어 둔 항목
- 영향 Task: Task 015A(반영) · Task 016B

**결정**: 이미 종료된 run을 다시 중단하려는 요청은 **409**다(`app/api/crawl/[runId]/abort/route.ts`).

**근거**: 요청 자체는 형식적으로 잘못된 것이 없다 — `runId` 형식도 유효하고 존재하는 리소스다. 문제는
**그 리소스의 현재 상태**와 요청이 충돌하는 것이고, 이는 RFC 9110의 409 정의에 정확히 들어맞는다.
같은 성격의 `RunAlreadyRunningError`도 409이므로(D-021) 대칭인 두 "상태 충돌"을 같은 코드로 매핑하는
편이 소비하는 화면(016B) 입장에서 일관적이다. 400은 요청 스키마가 위반된 경우에 쓰는데 여기서는
위반된 것이 없다.

**실측 확인(9일차, 팀장)**: 끝난 run에 `POST /api/crawl/{runId}/abort` → `409` +
`이미 종료된 실행은 중단할 수 없습니다: {runId}`. 없는 runId → `404` + `실행을 찾을 수 없습니다: {runId}`.

### D-029 · 「실패」와 「요청하지 않음」은 문구가 아니라 타입으로 가른다

- 상태: 유효
- 결정: 9일차 마감 후 · 크롤 파이프라인(I-017 해소)
- 영향 Task: Task 013B · Task 014A/014B · Task 016B

**결정**: 중단으로 요청조차 하지 않은 링크는 `CrawlFailure`(`error: '실행이 중단되어…'`)로 남기지 않고
별도 통로(`PressCrawlResult.skipped: string[]` → `CrawlRun.skippedCount`)로 옮긴다. 링크 1건의 결과는
판별 유니온 **`PageOutcome`**(`article` | `failure` | `skipped`)이다.

**대안을 버린 이유**: I-017이 제시한 ②안(`finishRun`이 `status: 'aborted'`일 때 중단 사유 실패를 걸러
센다)은 `error` 문자열을 다시 문자열로 판정한다. **문구를 다듬는 순간 집계가 조용히 틀어지고, 틀어져도
화면은 멀쩡해 보인다.** I-016이 같은 이유로 예외 판정을 문자열에서 타입으로 옮긴 전례가 있고
(`RunNotFoundError`·`RunNotAbortableError`), `docs/CONVENTIONS.md` §3도 "전부 optional인 평평한 객체 +
수동 검사"가 아니라 `z.discriminatedUnion`을 쓰라고 한다. 같은 원칙을 함수 반환값에도 적용했다.

**함께 정한 것 둘**

1. **건너뛴 링크는 `onArticleDone`을 부르지 않는다.** 집계만 고치고 이 훅을 그대로 두면 진행률이
   100%까지 차올라 화면은 여전히 "다 됐다"고 말한다 — I-017의 절반은 진행 상태 쪽 거짓이었다.
   `target`은 원래 목표치를 유지하고 `collected`만 실제 처리 건수에서 멈춘다.
2. **`CrawlRun`에 새 필드를 더할 때는 기본값 있는 선택 필드로 넣는다.** `skippedCount`를 필수로 두면
   이 필드가 생기기 전 `run-meta.json`이 `crawlRunSchema.safeParse`에서 떨어지고 → `readRunMeta`가
   손상으로 던지고 → `listRuns`가 예외를 삼켜 **그 run이 목록에서 통째로 사라진다.** D-026이 I-014를
   판정하며 실제 코드 경로로 확인한 함정이고, 이번에 그 결론을 규칙으로 굳혔다.
   회귀는 `lib/types/crawl-run.test.ts`가 고정한다.

**집계에 넣지 않기로 한 것**: 중단 시점에 아직 시작조차 하지 않은 언론사의 `skippedCount`는 0이다.
목록·피드를 열지 않았으므로 몇 건을 건너뛴 것인지 알 방법이 없고, 요청 시 지정한 최대 건수로 추정해
채우면 파일에 지어낸 숫자가 남는다. `finishRun`의 `status` 계산에도 `skippedCount`를 넣지 않는다 —
건너뛴 건이 있다는 이유로 실행이 `partial-failed`가 되면 안 된다.

### D-030 · 중단으로 끝난 실행은 설계서 01의 새 상태 ⑧으로 그리고, 판정은 파생값으로 한다

- 상태: 유효
- 결정: 10일차 · 크롤 파이프라인(016B 담당) 제기·확정 · 팀장(설계서 반영)
- 영향 Task: Task 016B(구현) · Task 018A · `docs/screens/01-crawl-run.md`
- 관련 이슈: **I-019**(이 결정으로 해소) · I-022(복구 경로 한계)

**결정 1 — 설계서에 새 상태 ⑧ 중단됨을 추가한다.** ④완료 문구만 `status`로 갈아 끼우는 안도 검토했지만,
설계서의 "상태별 화면" 절이 이미 ⑤부분 실패를 **④를 대체하지 않으면서 번호는 따로 매기는** 방식으로
다루고 있다. 같은 규칙을 따르면 중단도 별도 번호가 맞다. **Task 016 DoD의 "상태 7종"은 8종이 된다.**

다만 **구현에서 새 컴포넌트를 만들지 않는다.** 완료 조각(`DonePanel`)을 그대로 재사용하고
`status`(`'done' | 'aborted'`)로 아이콘·문구·톤만 갈아 끼운다 — ④와 ⑧은 레이아웃이 완전히 같고 텍스트만
다르므로, 파일을 쪼개면 같은 마크업이 두 곳에서 따로 자란다(`docs/CONVENTIONS.md` §8).

**결정 2 — `skippedCount`를 노출하되 문구는 "실패"가 아니어야 한다.** 채택 문구는 **"N건 미수집"**.
그 구분이 I-017 수정의 전부였다(D-029).

**결정 3 — `pressRunStatus` enum에는 값을 추가하지 않는다.** 화면이 기존 필드로 파생 판정한다:

```
언론사가 "중단됨"으로 보여야 하는 조건 = press.status === 'done' && press.collected < press.target
```

레지스트리 적중 경로에서 `target`은 항상 실제 목표치로 고정되고 정상 완료된 언론사는 `collected`가
반드시 `target`과 같아지므로, `done`인데 `collected < target`인 경우는 중단으로 도중에 멈춘 경우뿐이다.
**스키마 하위호환 검토**: 이 결정은 `lib/types/crawl-run.ts`에 필드를 추가하지 않으므로 D-029 2항이
경고한 "과거 `run-meta.json`이 `safeParse`에서 떨어지는" 문제 자체가 생기지 않는다.

**결정 4 — 복구 경로(`recovered: true`)에서는 언론사별 상세를 그리지 않는다.** 그 스냅샷은 `target`이
`collected`와 같은 값으로 강제되어 위 파생 판정이 항상 거짓이고, 언론사 전체 실패도 표현되지 않는다
(**I-022**). 016B는 런 레벨 안내 한 줄로 대체한다: "이 결과는 서버 재시작 후 복구된 값이라 언론사별
상세가 정확하지 않을 수 있어요."(문구는 다듬어도 되고 요지만 고정)

**설계서에 반영한 문안**: 요약 줄 "■ 크롤링 중단됨 / 3/4개 언론사 완료 · 기사 53건 저장 · 41건 미수집",
아이콘 **`Square`**([중단] 버튼이 이미 쓰는 아이콘이라 새 import가 없고 `CircleCheckBig`과 시각적으로
분명히 다르다), sonner 토스트 "크롤링 중단됨 — 기사 53건 저장, 41건 미수집"(warning 톤 — 사용자가 스스로
누른 중단이지 오류가 아니므로 destructive가 아니다), 언론사별 항목은 `Square` + "중단됨" +
`{collected}/{target}건`.

**부수 수정 2건도 함께 반영했다**: §③ 응답 필드 목록에 `recovered` 추가(실제 응답에 있는데 설계서가 안
그렸다) · 마크업 스켈레톤의 `crawlStatus` TODO 주석이 `'failed'`·`'aborted'`를 빠뜨리고 있어 5종 전체로
정정(016B가 분기를 빠뜨리지 않게).

### D-031 · D-025가 열어 둔 서버 조립 포맷 함수의 위치는 `lib/api/`로 정한다

- 상태: 유효
- 결정: 10일차 · 저장소 계층(Task 017)
- 영향 Task: Task 017(반영)

**배경**: D-025가 "`label`·`durationLabel` 포맷 로직을 순수 함수로 뺀다"까지는 확정했지만 파일 위치는
017 담당 판단으로 열어 두었다.

**결정**: `lib/api/run-format.ts`(날짜·소요시간·셀렉터 라벨 포맷)와 `lib/api/article-search.ts`(검색
필터)로 뺀다. `GET /api/runs`·`GET /api/runs/[runId]`·`GET /api/runs/[runId]/articles` 세 라우트가
공유한다. 회귀는 `lib/api/run-format.test.ts`·`lib/api/article-search.test.ts`.

**근거**: `docs/CONVENTIONS.md` §2는 `lib/api/`를 "클라이언트에서 쓰는 fetch 래퍼와 공통 응답 헬퍼"로
적어 두었지만, 이미 있는 `lib/api/response.ts`(`ok`/`fail`/`withErrorBoundary`)도 서버 라우트 전용이면서
이 디렉터리에 있다 — `lib/api/`가 "API 계층이 공유하는 것"을 담는 자리라는 선례가 이미 있다. 두 모듈 다
`fs`·`playwright`·`kiwi-nlp`를 직접 import하지 않는 순수 함수라 §4의 `import 'server-only'` 의무 대상이
아니고, vitest 회귀 대상으로 남기려면 오히려 없는 편이 낫다(I-001 참고).

### D-032 · `readArticle`의 "없음"·"손상" 구분은 `fs.access` 사전 확인으로 우회한다

- 상태: **폐기**(18일차, 저장소 계층 — I-020이 완전 해소되어 이 우회를 걷어냈다. 아래 결정 내용은
  10일차 시점의 기록으로 남긴다)
- 결정: 10일차 · 저장소 계층(Task 017)
- 영향 Task: Task 017(반영) · Task 007(잠재 수정 대상)
- 관련 이슈: **I-020**

**배경**: `article-repository.ts`(Task 007, 이 영역의 범위 밖)의 `readArticle`은 "파일 없음"과 "메타 라인
손상"을 같은 `Error`로 던져 타입 판정이 불가능하다. `docs/CONVENTIONS.md` §7은 파싱 실패를 조용히 삼키지
말라고 요구하므로, **손상된 파일까지 404로 묶어 버리면 규약을 어긴다.**

**결정**: `app/api/runs/[runId]/articles/[articleId]/route.ts`에서 `readArticle`을 부르기 전에
`fs.access(articlePath(runId, articleId))`로 존재 여부만 먼저 확인한다. 여기서 실패하면 404로 응답하고,
존재가 확인된 뒤 `readArticle`이 던지는 예외는 그대로 흘려보내 `withErrorBoundary`가 500으로 처리한다.

**근거**: Task 007 소유 파일을 고치지 않고도 "없음(404)"과 "손상(500)"을 정확히 가를 수 있는 유일한
방법이었다. 대안(문자열 메시지 매칭으로 404 판정)은 D-022가 이미 같은 종류의 취약점으로 폐기한 패턴이다.
**교차검증에서 실제로 손상 파일을 만들어 확인했다** — 단건 조회는 500 + "기사 본문을 불러오지 못했습니다"로
올라오고 404로 둔갑하지 않는다.

**남긴 대가 둘**: 파일 시스템 호출이 1회 늘고(실측상 무시 가능), `articlePath`의 안전 문자 검증 실패까지
이 try/catch에 걸려 404가 된다 — 그게 **I-021**(경로 순회 시도의 상태 코드가 라우트마다 갈린다)의 한쪽
사례다. 전용 `ArticleNotFoundError`(I-020)와 `UnsafePathSegmentError`(I-021)가 도입되면 이 우회는 함께
걷어낸다.

**걷어냄(18일차, 저장소 계층)**: 전용 타입 둘이 모두 도입된 뒤(`ArticleNotFoundError` — I-020,
`UnsafePathSegmentError` — I-021·D-045) 위에서 예고한 대로 `fs.access` 사전 확인과 그 위의
`try/catch`를 걷어냈다. 이제 `readArticle` 호출 하나를 감싸는 `catch`가 `UnsafePathSegmentError` →
400, `ArticleNotFoundError` → 404 순으로 가리고 그 외는 그대로 던져 `withErrorBoundary`가 500으로
받는다. **판정 순서가 중요하다** — `UnsafePathSegmentError`를 먼저 가려내지 않으면 경로 순회
입력이 "없는 기사"로 뭉뚱그려진다(이 우회가 살아 있을 때 실제로 그랬던 증상, I-021 참고). 실측은
I-020 "완전 해소" 블록에 남겼다.

### D-033 · `analyzeRun`은 `{ file, skippedArticleCount }`를 반환하고 `lib/keyword/index.ts` 배럴을 거치지 않는다

- 상태: 유효
- 결정: 11일차 · 저장소 계층(Task 021A)
- 영향 Task: Task 021A(반영) · **Task 021B(이 계약 위에 라우트를 만든다)**

**배경**: ROADMAP Task 021 구현 규칙은 "개별 기사 실패를 예외로 터뜨리지 말되 조용히 삼키지도 말라"고
요구했다. 그런데 `keywords.json`의 파일 구조(`{ runId, analyzedAt, summary, items }`)는 Task 007이 이미
확정했고, 여기에 실패 건수를 끼워 넣으면 `keywordsFileSchema`(저장 포맷, 크롤 파이프라인 소유)를 여는
일이 된다.

**결정**
1. `analyzeRun(runId, options?)`은 `Promise<{ file: KeywordsFile, skippedArticleCount: number }>`를
   반환한다. **저장 포맷은 건드리지 않고 실패 건수를 반환값에만 얹는다.**
   `skippedArticleCount`는 **이번 호출에서 새로 건너뛴 수**이지 누적이 아니다 — 캐시를 그대로 읽은
   호출은 기사를 하나도 다시 읽지 않았으므로 항상 0이다. 021B가 이 필드를 "직전 분석 시점의 누적
   실패 수"로 읽으면 안 된다.
2. `AnalyzeRunOptions.force?: boolean` — `true`면 `hasKeywords`조차 호출하지 않고 재분석한다.
   021B의 `?force=true`가 그대로 이 옵션에 대응한다.
3. `lib/keyword/index.ts`에 재수출하지 않는다. `aggregate.ts`(020B)도 배럴에 없는 채로 이미 쓰이고
   있어 같은 관례를 따랐다. **배럴로 공개 API를 강제하는 규칙(D-002·D-022)은 `lib/keyword/kiwi.ts`의
   원시 `Kiwi` 인스턴스 은닉에 걸린 것이지 이 디렉터리 전체의 import 방식을 강제하지 않는다.**

**없음 / 0건을 가르는 방식**: 존재하지 않는 run은 `getRun`이 던지는 `RunNotFoundError`(D-022)를 그대로
흘려보내고, 기사 0건인 run은 예외가 아니라 `items: []`인 정상 반환값이다. **"없음"은 예외 타입으로,
"0건"은 정상 반환값으로 갈라** 021B가 각각 404 / "빈 결과 + 안내"로 매핑하기만 하면 된다 — 문자열
판정을 쓰지 않는다(I-016·D-022·I-020이 전부 그 패턴 때문에 생긴 이슈다).

### D-034 · `RunProgress`에 `successCount`·`failCount`·`skippedCount`를 필수 필드로 추가한다

- 상태: 유효
- 결정: 11일차 · 크롤 파이프라인(Task 016B 구현 중)
- 영향 Task: Task 014A/014B · Task 015B · **Task 016B(반영)**
- 영향 파일: `lib/types/crawl-run.ts` · `lib/crawler/run-manager.ts`

**배경**: 설계서 01 §④완료·§⑤부분 실패·§⑧중단됨이 요구하는 "기사 N건 저장"·"M건 미수집"·"성공 X ·
실패 Y" 요약을 그릴 데이터가 **폴링 응답(`RunProgress`)에 없었다.** 그 집계는 `CrawlRun`(`run-meta.json`)에만
있는데, 설계서 §③이 "이 화면은 `GET /api/crawl/{runId}`가 돌려주는 `RunProgress`만 그린다"고 못박아
두었다. `GET /api/runs/{runId}`(Task 017, 저장소 계층 소유)를 새로 호출하는 것은 **이 화면의 설계 원칙과
016B의 파일 경계 양쪽을 벗어난다.**

**결정**: `runProgressSchema`에 세 필드를 **필수로** 추가한다. 진행 중에는 0으로 두고,
`runInBackground`가 `finishRun`과 같은 지점에서 채운다. `recoverRunProgress`(복구 경로)는 이미 갖고 있는
`finalRun`의 같은 필드를 **그대로 옮긴다 — 근사치를 새로 계산하지 않는다.**

**하위호환 검토 — 왜 optional이 아닌가**: `RunProgress`는 파일로 영속화되지 않는다. 교차검증에서
`runProgressSchema`의 `.parse()`/`.safeParse()` 호출부가 프로젝트 전체에 **하나도 없고**(타입 추론에만
쓰인다), `run-repository.ts`는 `crawlRunSchema`로만 파일을 읽고 쓴다는 것을 확인했다. 그래서 D-029 2항이
경고한 "과거 파일이 파싱에서 떨어져 그 run이 목록에서 사라지는" 함정이 **애초에 성립하지 않는다.**
`hooks/use-crawl-progress.ts`(015B)도 필드를 나열하지 않고 타입을 통째로 참조해 깨지지 않는다.

**실측 확인**: 완료 시나리오에서 "2개 언론사 · 기사 40건 저장"이 `successCount`와, 중단 시나리오에서
"2/4개 언론사 완료 · 기사 71건 저장 · 23건 미수집"이 `run-meta.json`의 `successCount: 71` ·
`skippedCount: 23`과 정확히 일치함을 확인했다.

### D-035 · `GET /api/runs/[runId]/keywords`의 `pos` 쿼리는 쉼표로 구분한 복수 값을 받는다

- 상태: 유효
- 결정: 12일차 · 저장소 계층(Task 021B) · 교차검증(크롤 파이프라인) 확인
- 영향 Task: Task 021B(반영) · **Task 022A(조건 바가 이 형식으로 호출한다)**

**배경**: ROADMAP Task 021 구현 규칙은 `?pos` 형식을 담당 판단으로 열어 뒀다. 설계서 03 §① 조건 바가
품사 필터를 `ToggleGroup type="multiple"`로 명시하므로 **단일 값만 받는 API로는 이 UI를 표현할 수 없다.**

**결정**: `?pos=NNG,NNP`처럼 쉼표로 구분한 문자열 하나로 받는다. 서버가 `split(',') → trim → 빈 문자열
제거 → 중복 제거` 후 `PosTag` enum 멤버십을 검사하고, 하나라도 유효하지 않으면 **`pos` 키 하나에 한국어
메시지를 담아 400**으로 거부한다(`pos.0`·`pos.1`처럼 배열 경로별로 쪼개지 않는다). 값을 생략하면 전체 품사다.

**대안을 버린 이유**: 반복 키(`?pos=NNG&pos=NNP`)는 이 프로젝트의 다른 쿼리 파라미터(`?active=true`·`?q=`)가
전부 단일 문자열이고 `getAll`을 쓰는 선례가 없어 관례에서 벗어난다. 쉼표 구분은 022A의 URL 조립이
`pos: selected.join(',')` 한 줄로 끝난다.

**실측**: `?pos=NNG, NNP , NNG`(공백·중복 섞임)가 `["NNG","NNP"]`로 정규화되고 `?pos=XX`는 400으로
거부됨을 담당과 리뷰가 각각 확인했다.

### D-036 · `force`는 zod로 검증하지 않고 `=== 'true'` 문자열 비교로 처리한다

- 상태: 유효
- 결정: 12일차 · 저장소 계층(Task 021B) · 교차검증(크롤 파이프라인)이 타당으로 판정
- 영향 Task: Task 021B(반영)

**배경**: `docs/CONVENTIONS.md` §6은 쿼리 파라미터를 zod로 검증하라고 하지만, `force`는 이미
`app/api/press/route.ts`의 `?active=true`가 쓰는 것과 같은 성격의 불리언 플래그다.

**결정**: `minCount`(숫자)·`pos`(enum 배열)처럼 **"잘못된 값"이 의미 있는 필드만 zod로 검증**하고,
`force`는 기존 `active`와 동일하게 문자열 비교로 처리한다(`'true'`가 아니면 전부 false, 400을 내지 않는다).
값 공간이 사실상 2개뿐이라 무효값을 알려 줄 실익이 없고, 처리 방식을 섞으면 다음 파라미터를 추가할 때
"언제 zod를 쓰는지"가 코드마다 갈린다.

**감수하는 것**: `?force=1`·`?force=TRUE`가 **에러 없이 조용히 캐시를 반환한다**(실측: 200, `analyzedAt`
변화 없음, 10.6ms). 교차검증은 이것을 "리스크 없음"이 아니라 **"리스크가 작고 감수할 만함"**으로
기록해 두라고 판정했다 — 실제 호출자는 022A의 `[재분석]` 버튼 하나이고 항상 리터럴 `"true"`를 보내며,
이 앱은 URL을 조작해 들어올 외부 소비자가 없는 로컬 단일 사용자 도구다.

### D-037 · 키워드 조회 응답은 `rank`·`ratio`를 채우지 않고, `ratio` 분모는 1위 `count`다

- 상태: 유효
- 결정: 12일차 · 저장소 계층(Task 021B) 제안 · **교차검증(크롤 파이프라인)이 열린 판단을 설계서로 닫음**
- 영향 Task: Task 021B(반영) · **Task 022B(랭킹 표·카드가 직접 계산한다)**

**결정 1 — 021B는 `rank`·`ratio`를 계산하지 않는다.** `items`는 `KeywordCount[]`(저장 포맷과 같은 형태,
이미 빈도 내림차순 정렬)로 내려주고, 022B가 `index + 1`로 rank를 만든다. **021B가 미리 계산하면 022B가
"필터된 집합 안에서의 순위"와 "전체 집합 안에서의 순위" 중 무엇을 받았는지 응답만 보고 알 수 없다.**

**결정 2 — `ratio` 분모는 `items[0].count`(1위 count)다.** 담당은 이것을 "022B가 착수 전에 정할 남은
판단"으로 남겼으나, **교차검증이 설계서에 이미 답이 있음을 찾아냈다**:
`docs/screens/03-hot-keyword.md:441`이 `ratio: number // 0~1, 최상위 키워드 대비 비중`이라고 명시하고,
같은 문서의 mock 숫자가 이를 증명한다 — `96/128 = 0.75`(2위) · `84/128 ≈ 0.66`(3위) · `77/128 ≈ 0.6`(4위) ·
`65/128 ≈ 0.51`(5위), 1위는 `ratio: 1`. **"전체 대비"도 "`filteredTokenCount` 대비"도 아니다.**
022B는 `item.count / items[0].count`만 계산하면 된다. **열린 판단이 아니라 이미 닫힌 사양이다.**

### D-038 · `GET /api/runs/[runId]/keywords` 응답 형태

- 상태: 유효
- 결정: 12일차 · 저장소 계층(Task 021B)
- 영향 Task: Task 021B(반영) · Task 022A·022B(이 형태를 그대로 소비)

**결정**: `{ runId, analyzedAt, summary, items, totalItemCount, skippedArticleCount, message? }`.

- **`summary`는 항상 `keywords.json` 전체 집계 기준이고 필터로 흔들리지 않는다**(ROADMAP DoD). 실측으로
  6가지 필터 조합에서 전부 동일함을 담당이, 4가지 조합에서 리뷰가 각각 확인했다.
- `items`는 필터(`minCount`·`pos`·`topN`) 적용 후 배열. `totalItemCount`는 필터 전 전체 키워드 수
  (`summary.uniqueKeywordCount`와 항상 같다) — 화면이 "2412개 중 672개만 보임" 같은 문구를 만들 수 있게
  별도 필드로 뒀다.
- `skippedArticleCount`는 D-033을 그대로 통과시킨다(캐시 히트면 항상 0).
- **`message`는 기사 0건 run에서만 채운다.** 필터가 모든 항목을 걸러 `items`가 빈 배열이 되는 경우와
  원인이 다르므로 **필드 존재 여부로** 두 상태를 가른다(문자열 비교가 아니다). 화면 문구는
  "이 실행에는 수집된 기사가 없어 분석할 키워드가 없습니다."
- 회귀는 `keywords-response.test.ts`가 고정한다 — `summary`를 참조 동일성(`toBe`)까지 확인한다.

**기사 0건 라이브 검증**: 담당은 데이터가 없어 vitest로만 고정했으나, **교차검증이 기존 run을 건드리지 않고
임시 디렉터리를 만들었다 지우는 방식으로 직접 태워 확인했다** — 200 + `summary` 전부 0 + `items: []` +
`message` 존재, 같은 run에 필터를 함께 걸어도 안전. 이 필드가 022A의 빈 상태 UI를 좌우하므로
**실측 없이 넘길 항목이 아니었다.**

### D-039 · I-018(`runCrawl` 죽은 코드)에서 제거할 범위와 남길 범위

- 상태: 제안(Task 023 착수 회차에 최종 확정)
- 결정: 12일차 · 크롤 파이프라인(023 담당이 유휴 배정으로 미리 정리)
- 영향 Task: **Task 023**
- 관련 이슈: **I-018** · 관련 결정: **D-001**

**배경**: I-018은 "지우면 `lib/crawler/types.ts`의 범용 스키마까지 연쇄로 걸린다"며 판단을 023으로 미뤘다.
12일차에 **실제 import 그래프를 다시 추적했고, 죽은 범위는 생각보다 좁다.**

**추적 결과**
- `runCrawl`(`lib/crawler/run.ts`)은 `CrawlTarget`·`CrawlResult` **타입만** 쓴다.
  `crawlRequestSchema`/`CrawlRequest`(배치 입력 봉투)는 **`run.ts`조차 참조하지 않고** `index.ts`가
  재수출할 뿐이다 — 코드 쪽 실제 소비자 0건.
- 반면 `crawlTargetSchema`·`CrawlTarget`·`ResolvedCrawlTarget`·`CrawlResult`·`CrawlSuccess`·`CrawlFailure`는
  **여전히 살아 있다** — `lib/crawler/fetch-html.ts`의 `fetchHtml()`이 대상 1건을 검증하는 데 쓰고,
  `fetchHtml`은 `press-crawler.ts`가 HTML 방식 언론사를 크롤할 때 호출한다(013B가 확정한 경로).
  **D-001이 이 스키마를 남겨 둔 근거는 `app/api/crawl/route.ts`가 없어진 지금도 `fetchHtml` 내부 검증에서
  그대로 유효하다.**

**제안**: ① `lib/crawler/run.ts` 전체 삭제 ② `types.ts`에서 **`crawlRequestSchema`·`CrawlRequest`만** 제거
(나머지 유지) ③ `index.ts`에서 그 항목들의 재수출 줄만 제거 ④ `press-crawler.ts`의 `runCrawl` 언급 주석 정리.

**ROADMAP 반영 필요**: Task 023 「생성/수정 파일」에 현재 `app/api/kiwi-check/route.ts`·
`components/common/screen-placeholder.tsx` 2건만 있다. 위가 맞다면 `lib/crawler/{run.ts, types.ts,
index.ts, press-crawler.ts}` 4건을 추가해야 범위가 맞다. **최종 판단과 반영은 023 착수 회차에 한다 —
이 결정은 판단 재료를 미리 굳혀 둔 것이다.**

### D-040 · Top 5는 "필터 적용 후" 같은 응답의 `items`를 슬라이스해서 쓴다

- 상태: 유효
- 결정: 13일차 · 크롤 파이프라인(Task 022A) · 교차검증(화면) 확인
- 영향 Task: Task 022A(반영) · Task 022B(`top-keyword-cards.tsx`가 이 전제로 `items`를 받는다)

**배경**: `docs/screens/03-hot-keyword.md` §상태별 화면 ⑤(결과 0건)는 "Top 5를 필터 적용 전 전체 기준으로
유지할지, 필터 적용 결과로 같이 비울지는 로직 영역"이라며 판단을 열어 뒀다.

**결정**: 무필터 응답을 따로 다시 fetch하지 않는다. `GET /api/runs/[runId]/keywords`가 이미
`minCount`·`pos`·`topN`을 적용해 내려준 `items`를 `items.slice(0, 5)`해서 Top 5로 쓴다.
`items.length === 0`이면 Top 5 섹션 자체를 렌더하지 않고 랭킹 표 자리의 "조건에 맞는 키워드가 없습니다"
안내만 보여준다.

**대안을 버린 이유**: "필터 무시하고 항상 전체 Top 5"를 만들려면 매 분석마다 요청을 두 번(필터 적용/
미적용) 보내야 한다. 기본값(최소 등장 횟수 1 · 품사 전체 · Top 50)에서는 Top 5가 걸러질 일이 거의 없어
그 경로를 위해 요청을 두 배로 늘리는 비용이 실익보다 크다.

**감수하는 것**: 필터를 아주 좁게 걸면 Top 5(필터 후 기준)와 분석 요약(필터에 흔들리지 않는 전체
기준값)이 서로 다른 기준으로 보인다. 요약 카드의 라벨이 "전체 토큰 수"·"고유 키워드 수"라 전체 기준임이
드러나므로 혼동 위험은 낮다고 봤다.

### D-041 · `?runId` 쿼리는 run을 선택만 하고 분석을 자동 실행하지 않는다

- 상태: 유효
- 결정: 13일차 · 크롤 파이프라인(Task 022A)
- 영향 Task: Task 022A(반영) · Task 018B(되돌아오는 검증의 판정 기준)

**배경**: ROADMAP Task 022 구현 규칙은 "`?runId` 쿼리가 있으면 그 run을 선택 상태로 시작한다"고만 적었고
도착 즉시 분석할지는 명시하지 않았다.

**결정**: `?runId`는 run 셀렉터의 초기값만 정한다. 분석은 사용자가 `[분석 시작]`을 눌러야 시작하며,
수집 결과 화면에서 `[키워드 분석]`으로 넘어와도 상태 ①(분석 전)에서 출발한다.

**대안을 버린 이유**: 도착 즉시 자동 분석하면 사용자가 필터를 조정할 기회 없이 기본값으로 첫 분석이
돌고, 프로세스 최초 1회는 Kiwi `build()` 1.4초가 붙어 페이지 진입과 동시에 예고 없는 로딩이 생긴다.
"선택 상태로 시작한다"는 문구가 자동 실행까지 요구하지 않는다.

**018B DoD와의 관계**: 018B DoD ④는 "이동 + 셀렉터가 그 값으로 선택"까지만 요구한다. 13일차에 화면
워크스트림이 **목록 첫 항목이 아닌 세 번째 run**으로 태워 확인했다 — 이동한 URL의 `runId`와 셀렉터
표시값이 일치했고, 이어서 `[분석 시작]`을 눌렀을 때 그 run의 기사 수(65건)가 나와 데이터까지 맞음을
확인했다.

### D-042 · `[분석 시작]`·`[재분석]`은 `force=false`, `force=true`는 불용어 추가 직후에만 붙는다

- 상태: 유효
- 결정: 13일차 · 크롤 파이프라인(Task 022A)
- 영향 Task: Task 022A(반영) · 관련 결정: **D-036**

**배경**: `GET /api/runs/[runId]/keywords`는 `force=true`일 때만 Kiwi를 다시 돌린다(D-036 · Task 021의
캐시 경계). 조건 바 버튼과 랭킹 행의 `Ban` 버튼이 이 API를 어떤 조합으로 부를지는 022A 몫이었다.

**결정**: 조건 바 버튼(`[분석 시작]`·`[재분석]`)은 항상 `force=false`로 호출한다 — 필터만 바뀌었을 때는
캐시 위에서 재조회한다. `force=true`는 `Ban` 버튼(불용어 추가) 직후 자동 재분석에서만 쓴다.

**왜 이렇게**: 이렇게 두면 "두 번째 호출은 눈에 띄게 빠르다"(Task 021 DoD)는 성능 전제가 **필터 조작
동선에서 항상 유지된다.** 불용어가 바뀐 경우에만 캐시를 버린다.

**실측**: run `20260810-204917`에서 "고객"(17회) 추가 → 자동 재분석 후 `stopwordExcludedCount` 84 → 101
(**정확히 +17**) · `uniqueKeywordCount` 2412 → 2411 · 랭킹에서 소멸. 교차검증에서 "AI"(96회)로 다시
확인해 84 → 180(**정확히 +96**)을 얻었다. **원복은 불용어 삭제 + `force=true` 재분석까지 해야 한다**
(I-030).

### D-043 · Top 5 카드의 모바일 레이아웃은 가로 스크롤이 아니라 2열 줄바꿈 그리드다

- 상태: 유효
- 결정: 13일차 · **팀장**(화면이 022A 교차검증 중 문서 내부 불일치를 발견해 판정 요청)
- 영향 Task: Task 022B(이미 이 값으로 구현됨) · **Task 023(설계서 정정)**

**불일치**: `docs/screens/03-hot-keyword.md`가 같은 항목을 네 곳에서 두 가지로 지시한다.
- 180~182행(모바일 ASCII 스케치)·205행(산문): `overflow-x-auto snap-x snap-mandatory` — **가로 스크롤**
- 217행(§영역별 컴포넌트 명세 표 ③행)·685행(마크업 스켈레톤 본문 JSX):
  `grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5` — **2열 줄바꿈**

**결정**: `grid grid-cols-2 …` 쪽이 맞다.

**근거**: ① 네 곳 중 두 곳이 grid이고 그중 685행은 **마크업 스켈레톤 본문 코드**라 컴포넌트 계약에 가장
가깝다. ② 같은 표의 "② 분석 요약"도 `grid grid-cols-2 … lg:grid-cols-5`라 화면 안에서 일관된다.
③ **가로 스크롤은 375px에서 `document.body.scrollWidth > innerWidth`를 만들 수 있어** Task 025 DoD
("모바일에서 레이아웃이 깨지지 않는다")와 충돌할 위험이 더 크다.

**실측**: `components/keywords/top-keyword-cards.tsx:40`이 이 값으로 구현돼 있고, 375px에서 2열 3줄로
줄바꿈되며 `scrollWidth`(360) < `innerWidth`(375)로 **가로 스크롤이 없음**을 확인했다.

**정정 대상**: 180~182행 ASCII 스케치와 205행 산문을 grid 서술로 교체한다. 217행·685행은 그대로 둔다.
**Task 023(문서 정정)이 반영한다.**

### D-044 · Task 025 재실행 범위는 "번호 붙은 스텝이 막혔는가"로 가른다

- 상태: 유효
- 결정: 16일차 · **팀장**(화면이 부분 실패 경로에서 I-038을 발견하고 재실행 범위를 물어옴)
- 영향 Task: Task 025

**상황**: `docs/ROADMAP.md` Task 025 구현 규칙은 "§검증 시나리오를 **처음부터 끝까지 끊지 않고** 1회 통과시킨다.
중간에 실패하면 원인 Task를 다시 열고 고친 뒤 **처음부터 다시 태운다**"고 못박고 있다. 16일차에 결함(I-038)이
나왔을 때, 62개 항목을 `data/` 초기화부터 다시 태워야 하는지가 갈렸다.

**결정: 전체 재실행하지 않고 부분 실패 경로 하나만 재검증한다.**

**근거**:
- **결함이 나온 곳이 번호 붙은 스텝이 아니다.** I-038은 2단계 표 아래 인용문("한 언론사의 셀렉터를 일부러 틀리게
  두면 부분 실패 상태**도 함께 확인할 수 있습니다**")이 권하는 보충 검증에서 나왔다. 번호 붙은 0-1~6-5와
  R-1~R-6은 끊기지 않고 1회 통과했다.
- **수정 범위가 도달 경로를 만들지 않는다.** 고친 것은 컴포넌트 하나의 사용자 노출 문자열 한 줄이고, 다른 스텝의
  렌더링·상태·데이터 어디에도 닿지 않는다.
- **전체 재실행 비용이 얻는 것보다 크다.** `data/` 백업·초기화·실크롤 3회·62항목 재수행에 드는 시간과, 그 과정에서
  I-030류 캐시 오염을 새로 만들 위험을 감수하고 얻는 것이 없다.

**따라서 "처음부터 다시"의 발동 조건은 번호 붙은 스텝이 막혔을 때다.** 보충 검증에서 나온 결함은 그 경로만
재검증한다. 이 구분이 없으면 규칙이 둘 중 하나로 무너진다 — 사소한 발견마다 전체를 다시 태우거나, 아니면
"이건 사소하니까"로 아무거나 넘기거나.

**단, 재검증도 같은 엄격도로 한다.** 16일차 재검증은 `data-backup/` 가드(I-034) → 백업 → HTML 부분 실패 재현 →
`browser_evaluate`로 DOM 직접 확인 → 복원 → `diff -rq`(I-033) 전 절차를 그대로 밟았다. 범위를 좁힌 것이지
절차를 생략한 것이 아니다.

### D-045 · 경로 세그먼트 검증 실패는 400이고, 메시지에 입력값을 반사하지 않는다

- 상태: 유효
- 결정: 17일차 · **저장소 계층**(I-021 처리 중) · 크롤 파이프라인·화면이 교차검증으로 확인
- 영향 Task: Task 005(`lib/storage/paths.ts`) · Task 017 · Task 015A · `app/api/runs/*` · `app/api/crawl/[runId]/*`

**결정 ①: `assertSafeSegment`는 전용 타입 `UnsafePathSegmentError`로 던지고, 모든 라우트 경계가
`instanceof`로 400에 매핑한다.**

`lib/storage/paths.ts`가 `export class UnsafePathSegmentError extends Error`를 내보낸다.
생성자는 `(label, segment)`이고 `segment`는 속성으로만 남아 서버 로그·디버깅에 쓴다. `runId`·`articleId`를
받는 `paths.ts` 헬퍼 전부가 이 함수를 거치므로 발생 지점이 하나로 모인다.

**근거**: 이전에는 평범한 `Error`라서 **같은 경로 순회 입력에 라우트마다 다른 코드가 나갔다**(I-021 실측 —
`/api/runs/{runId}`는 500, `/api/runs/{runId}/articles/{articleId}`는 D-032의 `fs.access` catch가 우연히
잡아 404). `docs/CONVENTIONS.md` §6 기준으로 이건 검증 실패이므로 **400이 맞다.** I-016이 run 생명주기 예외
판정을 문자열에서 타입으로 옮긴 것과 같은 계열의 처방이다.

**판정 순서는 상관없다** — `RunNotFoundError`(404)·`RunNotAbortableError`(409)와 서로 겹치지 않는 타입이다.
다만 D-032처럼 `fs.access`를 감싸는 catch 안에서는 **`UnsafePathSegmentError`를 먼저 가려내고** 나머지만
404로 떨어뜨린다 — 그러지 않으면 경로 순회 입력이 "없는 기사"로 뭉뚱그려진다.

**결정 ②: 사용자에게 나가는 메시지는 `${label} 형식이 올바르지 않습니다`로 일반화하고, 입력값을 반사하지
않는다.**

원래 제안이던 `"${label}에 허용되지 않는 문자가 포함되어 있습니다: \"${segment}\""`는 채택하지 않았다.

**근거**: ① 로컬 단일 사용자 도구라 보안 위험 자체는 낮지만, **공격 페이로드를 응답에 그대로 되돌려주지 않는
편이 원칙적으로 낫다.** ② D-032가 이미 같은 상황에서 "존재하지 않는 기사입니다"라는 일반화된 문구를 쓰고
있어 그 관례와 맞춘다. ③ `docs/CONVENTIONS.md` §6의 "검증 실패 메시지는 필드별 한국어 문구"는 **폼 필드 하단
표시를 염두에 둔 규칙**인데, `runId`·`articleId`는 사용자가 타이핑하는 폼 필드가 아니라 URL 경로 세그먼트라
같은 수준의 구체성이 필요하지 않다.

**실측(17일차, 세 워크스트림이 독립적으로 확인)**: 경로 순회 입력에 `/api/runs/*` 4개와 `/api/crawl/[runId]/*`
2개가 전부 400 + 동일 메시지 형식. **정상 형식이지만 존재하지 않는 runId는 여전히 404**, 이미 종료된 run의
중단 시도는 여전히 409 — 회귀 없음.

### D-046 · HTML 엔티티는 치환 목록을 늘리지 않고 규칙으로 닫는다

- 상태: 유효
- 결정: 17일차 · **크롤 파이프라인**(I-011 처리 중) · 화면이 교차검증으로 확인
- 영향 Task: Task 010A(`lib/crawler/rss.ts`)

**배경**: I-011은 `toPlainText`가 `&apos;`를 안 걷어내 기사 제목에 그대로 남던 결함이다. 7일차와 16일차에
**같은 기사로 두 번 관측**됐다.

**결정 ①: 원인은 파서 옵션이 아니라 CDATA다.** `fast-xml-parser`는 일반 텍스트 노드의 `&apos;`를 기본 옵션으로
이미 디코딩한다. 그런데 아이뉴스24 피드는 `<title>`을 **CDATA로 감싸 보내고, CDATA는 XML 스펙상 리터럴이라
파서가 절대 엔티티로 해석하지 않는다.** 따라서 **`htmlEntities: true`를 켜는 것으로는 이 버그가 고쳐지지
않는다** — node로 직접 재현해 확인했다. 그래서 CDATA 추출 **이후** 단계인 `toPlainText`를 고쳤다.

이 판정을 남기는 이유: "파서 옵션을 켜면 되지 않나"는 다음 사람이 가장 먼저 떠올릴 수정이고, **그게 안 통한다는
사실은 실험하기 전에는 알 수 없다.**

**결정 ②: 숫자 참조는 목록이 아니라 정규식 규칙으로 잡는다.** 이름 있는 엔티티는 실제로 관측된 다섯 개
(`nbsp`·`lt`·`gt`·`quot`·`apos`)만 최소 표로 두고, **숫자 참조는 십진·16진 정규식 2개로 일반화**했다.

**근거**: 목록을 늘리는 방식은 `&#8216;`·`&#8217;`(스마트 따옴표) 다음에 또 다른 코드가 나올 뿐이라 끝이 없다.
숫자 참조는 "코드 포인트 하나"라는 규칙으로 전부 잡히므로, **아직 드러나지 않은 것까지 미리 막는다.**

**결정 ③: 범위 밖 코드 포인트는 원문을 보존한다.** `isValidCodePoint`로 걸러 `String.fromCodePoint`가 던지지
않게 한다 — 기사 1건의 잘못된 엔티티가 그 기사를 통째로 무너뜨리면 안 된다(`docs/CONVENTIONS.md` §7).

**결정 ④: `&amp;`는 항상 마지막에 처리한다.** 다른 단계가 되살린 `&`가 다시 걸리지 않게 하려는 것이다.
**이 보호가 숫자 참조에는 없다는 것이 교차검증에서 드러났다**(**I-043**) — 낮은 우선순위로 남겼고, 고칠 때는
순서 재배치가 아니라 단일 결합 정규식으로 "여러 번 스캔한다"는 구조 자체를 없애야 한다.

**회귀 테스트**: 실제 관측된 제목 문자열과 이중 이스케이프 케이스를 `lib/crawler/rss.test.ts`에 넣었다.
**그 테스트가 실제로 회귀를 잡는지도 확인했다** — 화면이 치환 순서를 일부러 뒤집자 14건 중 그 1건만 실패했다.

### D-047 · 손상된 파일은 값으로 격리하되 로그로 드러내고, 원인별 예외 타입은 두지 않는다

- 상태: 유효
- 결정: 18일차 · **크롤 파이프라인**(I-006·I-020 처리 중) · 화면·저장소 계층이 교차검증으로 확인
- 영향 Task: Task 007(`lib/storage/article-repository.ts`·`run-repository.ts`) · Task 017

**결정 ①: 손상 파일을 건너뛰되 `console.warn`으로 남긴다. 화면은 바꾸지 않는다.**

`listRuns`·`listArticles`는 파일 1건이 깨져도 목록 전체가 무너지지 않게 값으로 격리한다
(`docs/CONVENTIONS.md` §7). **문제는 그 사실이 아무 데도 안 남아 사용자가 왜 사라졌는지 알 수 없다는
것이었다** — 수정 전 두 곳 다 `catch { return null }`로 **파싱 실패·읽기 실패·권한 오류를 전부 뭉뚱그리고
로그가 전무했다.**

로그 형식은 새로 만들지 않고 `lib/keyword/analyze-run.ts`가 이미 쓰던 **`[모듈파일명] 설명: 대상`** 을
따르고, 두 번째 인자로 원본 `error`를 넘긴다. 형식을 새로 만들면 로그가 파편화된다.

`console.error`가 아니라 `console.warn`인 이유: `withErrorBoundary`의 `console.error`는 **라우트 경계에서
미분류 예외를 처리하는 자리**다. 이번 건은 예외가 아니라 "목록에서 값 하나를 조용히 뺀다"는 값 격리이고,
`analyze-run.ts`가 이미 같은 성격에 `warn`을 쓰고 있어 격을 맞춘다.

**화면은 건드리지 않는다** — 설계서에 "N건 숨겨짐" 같은 UI가 없다. 3일차 리뷰어 권고 그대로다.

**결정 ②: 원인별로 분기하지 않는다.** ENOENT든 JSON 파싱 실패든 스키마 불일치든 **"이 항목 1건은 건너뛴다"는
같은 처리로 이어진다.** 원인 구분은 로그의 두 번째 인자로 충분하다. §7("조용히 덮어쓰지 않는다")은 "삼키지
말고 드러내라"는 뜻이지 "원인별로 분기하라"는 뜻이 아니다.

**결정 ③: "없음"에는 전용 타입을 두고, "손상"에는 두지 않는다.**

`readArticle`의 ENOENT 분기가 **`ArticleNotFoundError`** 로 던진다(`RunNotFoundError`/D-022와 같은 형태 —
생성자가 라벨이 아니라 도메인 값을 받고, `super()`로 한국어 메시지를 만들고, `this.name`을 설정한다).

**손상 쪽에 전용 타입을 두지 않은 근거**: ① `withErrorBoundary`가 이미 미분류 예외를 `console.error` + 500
정형 메시지로 처리해 §7을 충족한다. ② 라우트가 필요한 판정은 **"없음(404) vs 그 외 전부(500)" 하나뿐**이라
세분화된 타입의 소비처가 없다. 타입을 늘리는 쪽이 항상 옳은 것은 아니다 — **두 번째 소비처가 생기면 그때
쪼갠다.**

**결정 ④: D-032의 `fs.access` 우회를 걷어낸다.** 전용 타입이 생겨 `instanceof`로 갈 수 있게 됐으므로
존재 확인용 파일 시스템 호출이 필요 없다. **두 겹이던 `try/catch`가 한 겹으로 줄고 새 복잡도는 들어오지
않았다.**

**우회를 걷어낸 뒤에도 세 갈래가 그대로 갈린다**(세 워크스트림이 각자 `curl`로 독립 실측):

| 상황 | 타입 | 응답 |
| --- | --- | --- |
| 경로 순회 입력 | `UnsafePathSegmentError` (D-045) | **400** |
| 정상 형식·없는 기사 | `ArticleNotFoundError` | **404** |
| 메타 라인 손상 | 익명 `Error` | **500** (`withErrorBoundary`) |

**판정 순서에 대하여**: 라우트의 `catch`는 `UnsafePathSegmentError`를 먼저 가려내지만, **현재 코드에서
순서가 결과를 바꾸는 입력은 없다.** `articlePath()`가 인자 평가 시점에 동기적으로 `assertSafeSegment`를
거치므로, 세그먼트가 안전하지 않으면 `fs.readFile`이 호출되기도 전에 던져져 ENOENT가 날 기회가 없다 —
두 예외는 상호 배타적이다. **`runId`·`articleId` 둘 다 순회 문자를 넣은 실측에서 `runId` 형식 오류가
나오는 것으로 이 구조를 확인했다.** 순서를 유지하는 것은 방어적 선택이다.

### D-048 · 실행 종료 시점의 언론사별 결과를 `run-meta.json`에 남긴다 (`CrawlRun.pressResults`)

- 결정: 20일차 · 저장소 계층(I-022 해소의 계약) · 크롤 파이프라인(소비)
- 영향 파일: `lib/types/crawl-run.ts` · `lib/storage/run-repository.ts` · `lib/crawler/run-manager.ts`
- 관련 이슈: **I-022** · 관련 결정: D-023 · D-026 · D-029 · **D-049**

**배경**: `run-meta.json`에는 기사 단위 합계(`successCount`/`failCount`/`skippedCount`)만 남고
**어느 언론사가 왜 실패했는지는 어디에도 저장되지 않았다.** 진행 상태는 메모리, 최종 결과는 파일이라는
Task 014의 원칙이 "언론사별 상세는 진행 상태다"라고 분류한 결과다. 그래서 서버가 재시작되면
`recoverRunProgress`가 기사 개수만 세어 `collected > 0 ? 'done' : 'waiting'` 두 상태로 근사했고,
**완전히 실패한 언론사가 '대기'로 보였다**(I-022).

**결정**: 언론사별 최종 결과는 진행 상태가 아니라 **실행의 결과**다. `finishRun`이 종료 시점에
`run-meta.json`에 남긴다.

```ts
export const pressRunResultSchema = pressRunStatusSchema.extend({
  status: z.enum(['waiting', 'done', 'failed']),   // 'running'만 뺐다
})
// crawlRunSchema 안:
pressResults: z.array(pressRunResultSchema).default([]),
```

**`.extend()`로 파생한 이유**: 필드 6개가 같고 `status` 값 집합 하나만 다르다. 새 `z.object`를 손으로
쓰면 필드가 하나 어긋나도 타입 시스템이 못 잡는다(`docs/CONVENTIONS.md` §3).

**`'running'`만 뺀 이유**: 실행이 끝난 뒤 "진행 중"은 논리적으로 없다. 타입에 남기면 소비자가 그럴 리
없는 방어 분기를 떠안고, 복구 로직·화면이 "복구가 덜 됐나"로 오해한다.

**`'waiting'`은 남긴 이유**: 종료 시점에도 실제로 나온다 — `aborted`로 끝나면 차례가 오지 않은 언론사는
정말 "시도조차 못 함"이 최종 상태다. `'failed'`로 밀어 넣으면 **D-029가 막으려 한 "실패"와 "시도 안 함"의
뒤섞임이 여기서 재현된다.**

**선택 필드 + 기본값 빈 배열**: D-026과 같은 함정이다. 이 키가 없는 `run-meta.json` 25건이 이미
`data/runs/`에 있고, 필수로 두면 전부 손상 판정을 받아 **`listRuns`에서 통째로 사라진다.**
`crawlRunSchema.safeParse`로 25건 전수 실측해 25/25 통과를 확인했다(파일은 읽기만 했다).

**조회 API 노출은 보류(팀장 판정)**: `app/api/runs/[runId]/route.ts` 응답에는 싣지 않는다. 화면 쪽
소비 요구가 아직 없고, 응답 계약을 넓히면 같은 회차에 검증할 표면이 함께 는다. 필요해지면 그때 연다.

**남는 한계**: 서버가 크롤 **도중에** 죽으면 `finishRun`이 불린 적이 없어 `pressResults`가 비고 근사
복원이 걸린다. **데이터가 진짜로 없는 경우라 이 결정으로 메울 수 없다.**

### D-049 · 정확히 복원했으면 `recovered`를 세우지 않는다

- 결정: 20일차 · 크롤 파이프라인(판단) · 화면(실측 검증) · 저장소 계층(주석 반영)
- 영향 파일: `lib/crawler/run-manager.ts`(`recoverRunProgress`) · `lib/types/crawl-run.ts`(주석)
- 관련 이슈: **I-022** · 관련 결정: **D-023**(플래그 도입) · **D-048**

**배경**: D-048로 재시작 뒤 복구 경로가 **둘로 갈렸다.** `pressResults`가 있으면 정확한 값을 그대로
옮기고, 없을 때만(과거 형식 run·도중 강제종료 run) 기사 개수로 근사한다.

**결정**: `recovered: true`는 **근사 복원 경로에서만** 세운다. 정확 복원 경로에서는 붙이지 않는다.

**근거**: `recovered`가 경고하는 내용은 D-023이 이미 좁게 정의해 뒀다 — "`target`이 실제 목표치가 아니라
`collected`와 같은 값". 정확 복원 경로는 여기 해당하지 않는다. **"레지스트리에서 안 왔으면 무조건 true"로
넓히면 화면이 정확한 값을 받고도 런 레벨 안내 한 줄로 뭉갠다** — I-022가 만들려던 것을 플래그 하나가
다시 지운다. 화면이 `components/crawl/press-run-status-list.tsx`를 읽어 이 단일 플래그로 분기가 갈리는
것을 확인했고, 재시작 실측에서 정확 복원 응답에 이 키가 없는 것까지 봤다.

**기각한 대안**: "디스크 유래 여부"와 "근사 여부"를 분리하는 필드를 하나 더 두는 안. 소비처가 필요한
판단은 "이 상세를 신뢰하고 그릴 수 있는가" 하나뿐이고 `recovered`가 이미 그 질문에 답한다.

**여기서 배운 것**: **플래그의 의미는 주석에 있고, 분기가 늘면 주석이 먼저 거짓이 된다.** 구현은
맞는데 `recovered` 주석이 "레지스트리 미적중 = 항상 true"로 읽혀, 두 워크스트림이 독립적으로 같은
지점을 짚었다. 스키마는 그대로 두고 주석만 두 경로로 갈라 다시 썼다.

### D-050 · `Article.category`는 선택 필드이지만 `Press.category`와 달리 기본값을 두지 않는다

- 결정: 21일차 · 저장소 계층(Task 026)
- 영향 Task: Task 026(스키마 신설) · Task 027(크롤 파이프라인 — 실제 값을 채운다)

**배경**: 두 도메인 모두 카테고리 필드가 새로 생겼다. `Press.category`는 `.default('it-ai')`를
쓰고, `Article.category`는 `.optional()`만 쓰고 기본값을 두지 않는다 — 같은 회차에 같은 이유
(과거 데이터 호환)로 추가된 필드인데 처리 방식이 다르다.

**결정**: `Press.category`는 값이 없으면 `'it-ai'`로 채운다. `Article.category`는 값이 없으면
`undefined`로 남긴다.

**근거**: 두 필드는 "값이 없다"의 의미가 다르다. `Press`는 지금 등록된 5곳이 실제로 전부 IT/AI
매체이므로, 값이 없는 것은 곧 "IT/AI다(단지 그 시절엔 카테고리 개념이 없었을 뿐)"라는 사실과
일치한다 — 기본값이 진짜 값이다. 반면 `Article.category`는 크롤 파이프라인(Task 027)이 크롤
시점에 채워 넣을 **스냅샷**이고, 지금 저장된 기사는 이 필드 자체가 아직 쓰인 적이 없다 —
"값이 없다"는 "그 기사가 IT/AI다"가 아니라 "아직 아무도 이 기사의 카테고리를 기록하지 않았다
(카테고리 미상)"는 뜻이다. 여기에 기본값 `'it-ai'`를 넣으면 실제로는 스포츠·경제 기사였을 수도
있는 과거 기사가 전부 "IT/AI"로 거짓 확정된다 — 나중에 Task 027이 진짜 값을 채워도 되돌릴 방법이
없는 값 오염이다.

**소비 규칙(현재 규칙 — 21일차 팀장 판정으로 확정)**: `category` 필터가 걸려 있으면 값이 없는
기사(`undefined`)는 **제외한다.** 제외된 건수는 `uncategorizedCount`로 응답에 실어, "필터가
고장났다"는 오인 없이 화면이 이유를 말할 수 있게 한다. 자세한 경위(처음에는 반대로 "통과"였다가
왜 뒤집혔는지)는 아래 "category 필터가 걸리면 값이 없는 기사(카테고리 미상)는 제외하고,
`uncategorizedCount`로 알려준다" 결정에 전문을 남겼다.

이 문서(`Article.category`에 기본값을 두지 않는다는 결정) 자체는 그 반전과 무관하게 바뀌지
않는다 — `undefined`가 "IT/AI"로 확정되면 안 된다는 근거는 필터 판정을 어느 방향으로 두든
그대로 유효하다. "모른다"를 필터에서 어떻게 다룰지(포함할지 배제할지)는 별개의 판단이고, 그
판단만 아래에서 한 번 뒤집혔다.

### D-051 · category 필터가 걸리면 값이 없는 기사(카테고리 미상)는 제외하고, `uncategorizedCount`로 알려준다

- 결정: 21일차 · 저장소 계층이 최초 구현(미상은 통과) → **같은 날 팀장이 뒤집어 확정(미상은 제외
  + 제외 건수 응답에 명시)**
- 영향 Task: Task 026(구현) · Task 027(값을 채우기 시작하면 이 규칙의 체감 효과가 커진다) ·
  화면(카테고리 필터 UI를 붙일 워크스트림)
- 관련 이슈·결정: I-040(같은 날, 같은 원칙 — "모르는 값을 확정하지 않는다"의 대칭 사례)

**최종 규칙(지금 코드에 반영된 것)**: `matchesCategoryFilter(articleCategory, filter)`는 `filter`가
있고 `articleCategory === undefined`(카테고리 미상)면 **`false`(제외)**를 돌려준다
(`lib/api/article-category-filter.ts`). 필터 자체가 없으면 그대로 전부 통과다.

**"필터가 고장났다"는 오인을 막는 보완책**: 배제만 하고 끝내면 사용자에게는 "카테고리를 고르니
결과가 줄었다"는 사실만 보이고 왜 줄었는지(진짜 불일치 때문인지, 아직 값이 없어서인지)는 알 수
없다. 그래서 **제외된 미상 기사 수를 응답에 명시적으로 싣는다**:
- `GET /api/runs/{runId}/articles` 응답에 `uncategorizedCount`(검색어까지 통과한 기사 중 카테고리
  필터 때문에 제외된 미상 기사 수) 추가.
- `GET /api/runs/{runId}/keywords` 응답에 같은 이름·같은 뜻의 `uncategorizedCount`(집계에서 제외된
  미상 기사 수) 추가.
- 둘 다 category 필터를 지정하지 않으면 항상 `0`이다 — "필터가 없다"와 "필터는 있는데 미상이라
  걸러졌다"를 구분해야 화면이 "카테고리 미상 N건은 제외했습니다"를 정확히 말할 수 있다. 문구 자체는
  화면 워크스트림 몫이고, 저장소 계층은 정확한 숫자만 보장한다.

**팀장이 뒤집은 이유**: 아래 "폐기된 최초 판단"의 논증은 정확했지만 비교 축이 하나 빠져 있었다 —
기각했던 대안 ①(값 없으면 배제)의 단점은 **한시적**이다(Task 027 전까지만 결과가 0건). 반면
최초에 채택했던 규칙(미상은 통과)의 단점은 **영구적**이다 — Task 027이 값을 채운 뒤에도 그 이전에
수집된 과거 기사는 영원히 `category: undefined`로 남고, "미상은 통과" 규칙 아래서는 **그 기사들이
모든 카테고리 필터에 계속 새어 들어간다.** 특히 `GET /api/runs/{runId}/keywords`에서 사용자가
「스포츠」를 골랐는데 랭킹에 과거 IT 기사의 키워드가 섞여도 알아챌 방법이 없다 — 이건
`docs/CONVENTIONS.md` §9가 vitest 대상으로 못박은 "틀려도 화면이 멀쩡해 보이는 로직" 바로
그 부류다.

같은 날 팀장이 I-040(언론사 단위 실패 수를 모르는 근사 복원 경로에서 0을 채우지 않고 `undefined`로
남겨 화면이 "언론사는 모두 정상"이라고 단정하지 못하게 한 결정)에서 확립한 원칙과 이 사안을
나란히 놓으면 방향이 반대였다는 게 드러난다 — 거기서는 "모름"을 "0(아님)"으로 확정하지 않는 것이
옳았지만, 여기서는 "모름"을 "통과(=이 카테고리에 속한다)"로 확정하는 것 자체가 같은 종류의 단정
오류였다. 두 판정 모두 "모르는 값은 모른다고 남기고, 그 값으로 사실 하나를 지어내지 않는다"는
같은 원칙을 따른 것이다 — I-040은 그 원칙을 "0을 채우지 않는다"로, 이번은 "통과시키지 않는다"로
적용했을 뿐이다.

---

**폐기된 최초 판단(저장소 계층, 21일차 — 아래는 더 이상 유효하지 않다. 위 최종 규칙으로 대체됐다)**

당시 배경: `GET /api/runs/{runId}/articles`·`/keywords`에 `category` 필터를 추가하라는 지시에
"기사 쪽 카테고리 값의 원천은 크롤 파이프라인(Task 027)이 남길 스냅샷이다 — 아직 값이 안
채워져도 깨지지 않게 만들되, 값이 없는 기사는 필터가 걸리면 제외가 아니라 카테고리 미상으로
다루라"는 조건이 붙었다.

당시 결정: `matchesCategoryFilter(articleCategory, filter)`는 `filter`가 있어도 `articleCategory`가
`undefined`면 항상 `true`(통과)를 돌려준다 — 즉 지금 시점(Task 027 이전)에는 모든 기사가
`category: undefined`이므로, 어떤 category 필터를 걸어도 결과가 전혀 줄지 않는(사실상 no-op) 규칙.

당시 검토했던 대안과 기각 사유(참고용으로 남긴다):
1. **값이 없으면 배제한다(엄격한 "일치하는 것만" 필터)** — 구현은 더 직관적이지만, Task 027이
   반영되기 전까지는 카테고리 필터를 하나라도 걸면 결과가 항상 0건이 된다는 점을 들어 그때는
   기각했다. **팀장이 위에서 뒤집으며 정확히 이 대안을 채택했다** — 다만 "0건이 되는 한시적
   부작용"은 `uncategorizedCount`로 이유를 밝히는 방식으로 보완했다.
2. **필터 파라미터 자체를 아직 받지 않는다(Task 027 이후로 미룬다)** — 지시가 명시적으로
   "지금 파싱과 응답 계약을 확정하라"고 요구해 기각했다. 이 판단은 최종 규칙에서도 그대로
   유효하다(필터 자체는 지금 받는다).

당시 받아들였던 한계: "Task 027 전까지는 필터가 사용자에게 아무 효과가 없어 보인다"는 우려였다 —
최종 규칙에서는 오히려 반대로 "값이 없으면 전부 빠진다"가 정확한 동작이고, 그 사실을
`uncategorizedCount`로 알려주는 쪽으로 해소됐다.

당시 재검토 조건("Task 027이 값을 채우기 시작하면 자연히 좁혀진다")은 최초 규칙(미상은 통과)을
전제로 한 것이라 더 이상 적용되지 않는다 — 최종 규칙(미상은 제외)은 Task 027 이후에도 그대로
쓴다: 값이 채워진 기사는 정확히 필터링되고, 여전히 값이 없는 옛 기사만 계속 제외된다.

### D-052 · `GET /api/runs/{runId}/keywords`의 category 필터는 `keywords.json` 캐시를 읽지도 쓰지도 않는다

- 결정: 21일차 · 저장소 계층(Task 026)
- 영향 Task: Task 026(구현) · Task 021A/021B(캐시 원 설계)

**배경**: `minCount`·`pos`·`topN`은 캐시된 전체 집계 위에서 후처리로 자를 수 있지만, `category`는
"어떤 기사를 집계에 넣을지" 자체를 바꾼다 — 캐시가 담고 있는 건 이미 전체 기사로 집계가 끝난
결과라, 그 위에서 카테고리별로 다시 쪼갤 수 없다.

**결정**: `category`가 지정되면 `analyzeRun`은 `force` 값과 무관하게 캐시(`keywords.json`)를 읽지
않고 대상 기사(카테고리 필터 통과분)만 다시 읽어 그 자리에서 집계한다. 그 결과는 `keywords.json`에
**쓰지 않는다** — 부분집합 집계로 전체 캐시를 덮어쓰면, 다음 무필터 요청이 그 부분집합을 "run
전체 결과"로 오인한다.

**대안과 기각 사유**: 카테고리별로 `keywords.<category>.json`을 따로 캐시하는 안도 검토했지만,
지금은 `Article.category`가 채워지지 않아 category 필터를 건 요청은(21일차 팀장 판정 이후로는
카테고리 미상 기사가 전부 제외되므로) 사실상 항상 빈 결과를 다시 계산하는 셈이라 캐시를 만들어도
적중할 일이 없다 — 캐시 파일 종류만 늘어난다. Task 027 이후 실사용 빈도를 보고 재검토하기로 하고
지금은 가장 단순한 "필터 있으면 항상 재계산"을 택했다(`docs/ISSUES.draft.저장소계층.md`의 관련
이슈에 재검토 조건을 남겼다).

### D-053 · 카테고리 선택(`crawlStartRequestSchema.categories`)은 discriminatedUnion이 아니라 "둘 중 최소 하나" refine으로 검증한다

- 결정: 21일차 · 크롤 파이프라인(Task 027)
- 영향 Task: Task 027 · Task 015A(`app/api/crawl/route.ts` 원 설계자)

**배경**: `docs/CONVENTIONS.md` §3은 "분기가 있는 데이터는 `z.discriminatedUnion`을 쓴다"고
못박는다. `pressIds`로 고르는 요청과 `categories`로 고르는 요청은 언뜻 "두 가지 다른 모양"처럼
보일 수 있다.

**결정**: `discriminatedUnion`을 쓰지 않고 `pressIds`·`categories`를 둘 다 optional 필드로 두고
`.refine()`으로 "둘 중 최소 하나"만 강제했다.

**근거**: discriminatedUnion은 필드가 **서로 다른 모양으로 완전히 갈릴 때**(`Press.sourceType`처럼
`rss` 쪽엔 `feedUrl`, `html` 쪽엔 `listUrl`이 있고 겹치지 않을 때) 쓸모가 있다. 이 요청은 그렇지
않다 — `pressIds`·`categories`는 **함께 보낼 수 있고**(합집합으로 대상이 된다), `maxArticlesPerPress`는
두 경로에서 완전히 같다. discriminatedUnion으로 쪼개면 "둘 다 보낸 요청"을 표현할 방법이 없어지고,
`pressIds`만 보내는 기존 화면 요청 모양(`{ pressIds, maxArticlesPerPress }`)도 판별 태그 필드
(`selectBy: 'press' | 'category'` 같은)를 새로 강제해야 해서 "화면 경로는 그대로 둔다"는 지시와
충돌한다. `.refine()`은 "적어도 하나"라는 **존재 제약**이지 모양의 분기가 아니므로, 이 경우에는
CONVENTIONS의 취지(분기 있는 데이터를 평평한 optional 더미로 만들지 않는다)를 해치지 않는다.

### D-054 · 카테고리 → 언론사 id 해석은 `run-manager.ts`가 아니라 `app/api/crawl/route.ts`에서 한다

- 결정: 21일차 · 크롤 파이프라인(Task 027)
- 영향 Task: Task 027

**배경**: `categories`로 대상을 고르면 어딘가에서 "그 카테고리의 활성 언론사 id 목록"으로 풀어야
한다. 후보는 두 곳이었다 — `app/api/crawl/route.ts`(라우트 경계) 또는 `lib/crawler/run-manager.ts`
의 `startRun`(오케스트레이터).

**결정**: route.ts에서 해석한다. `startRun`은 이미 완전히 해석된 `pressIds`를 받는다.

**근거**: route.ts는 이미 `listPress({ activeOnly: true })`를 불러 명시 `pressIds`의 활성 여부를
검증하고 있었다 — 같은 호출로 카테고리 후보까지 함께 거르면 데이터베이스(파일) 접근이 한 번으로
끝난다. 더 중요한 이유는 **오류 등급**이다: "카테고리에 활성 언론사가 없다"는 사용자 입력 문제라
400이어야 하는데, `startRun` 내부에서 이 판정을 하면 `app/api/crawl/route.ts`의 `withErrorBoundary`가
그 실패를 잡아 범용 500 문구로 뭉갠다(`RunAlreadyRunningError`처럼 별도 `instanceof` 분기를 또 만들지
않는 한). route.ts가 먼저 걸러내면 기존 "존재하지 않는 언론사 id → 400" 패턴과 같은 층에서 같은
방식으로 처리된다. `startRun`은 그 계약을 신뢰하는 대신, `pressIds`가 실제로 비어 있는 채로 들어오면
(계약 위반) 방어적으로 예외를 던진다 — 조용히 빈 실행을 만들지 않는다.

### D-055 · `Article.category`는 `press-crawler.ts`가 채운다(run-manager.ts가 아니라)

- 결정: 21일차 · 크롤 파이프라인(Task 027)
- 영향 Task: Task 027

**배경**: 크롤 시점 `Press.category`를 `ArticleDraft`에 옮겨 적어야 한다. `press-crawler.ts`
(`crawlPress`와 그 내부 함수들)와 `run-manager.ts`(`runOnePress`, 저장 직전 `{ ...draft, id: ... }`)
둘 다 후보였다.

**결정**: `press-crawler.ts`에서 채운다 — `ArticleDraft` 리터럴이 만들어지는 지점(`collectArticlePage`·
`collectRssSummaries`)에 `category` 필드를 추가했다.

**근거**: `ArticleDraft`(= `Omit<Article, 'id'>`)를 실제로 조립하는 곳이 이 파일이다.
`run-manager.ts`의 `runOnePress`는 이미 완성된 `ArticleDraft`에 `id`만 붙여 저장할 뿐 나머지 필드는
건드리지 않는다 — 여기서 `category`를 끼워 넣으려면 `draft`를 분해했다가 다시 조립해야 해서 오히려
어색하다. `press-crawler.ts`는 이미 `PressSource`(따라서 `press.category`)를 인자로 받고 있어 추가
의존성도 없다.

### D-056 · `FeedItem.publishedAt`은 걷어내지 않고 파서를 넓힌다 (22일차, Task 030 사후 조사)

- 배경: 22일차 팀장이 `publishedAt`의 소비처를 grep으로 확인한 결과("`lib/crawler/rss.ts`의
  세 줄이 전부다 — `Article`에도 없고 화면도 안 쓴다")를 근거로, 이 필드가 죽은 코드인지
  걷어내야 하는지 조사를 지시했다.

**조사 결과 1 — 소비처**: 팀장의 grep을 독립적으로 재확인했다. `lib/types/article.ts`의
`articleSchema`에는 `publishedAt` 필드 자체가 없고(`crawledAt`만 있음), `press-crawler.ts`의
`collectRssSummaries`·`collectArticlePage`가 `ArticleDraft`를 만들 때 `FeedItem.publishedAt`을
옮겨 담지 않으며, `lib/storage/article-file.ts`의 txt 메타 라인 목록에도 없다. 소비처는 정확히
`lib/crawler/rss.ts` 세 줄뿐이다 — 팀장 판단이 맞았다.

**조사 결과 2 — 설계서상 자리**: `docs/PRD.md` §Article 필드 표(202~213행)와 §F003·F004
기능 명세, `docs/screens/02-collect-result.md`(기사 목록·본문 미리보기 마크업) 어디에도
"발행일"·"게재일"·"작성일" 자리가 없다. 화면이 보여주는 시각은 전부 `crawledAt`(수집 시각)뿐이고
기사 자체의 원 발행 시각을 노출하는 자리는 **PRD·screens 어디에도 없다.**

여기까지만 보면 "쓰이지 않고 쓸 계획도 없다"는 (a) 걷어내기 쪽으로 기운다. **그런데
`docs/ROADMAP.md`(스코프의 단일 소스, PRD보다 우선)의 Q6(974~979행)에 정반대의 명시적 결정이
이미 있다**:

> Q6. RSS `pubDate` 기반 기간 필터 도입 여부 — **📌 결정: MVP 범위 밖.** ... 대신 **Task 010의
> `FeedItem`에 `publishedAt`은 파싱해 둔다. 저장하지 않더라도 파서가 값을 갖고 있으면 나중에
> 도입할 때 파서를 다시 건드리지 않아도 된다.**

즉 "기간 필터" 기능 자체는 MVP 범위 밖으로 명시적으로 미뤘지만, **그 준비 작업(피드에서 발행일을
파싱해 두는 것)은 지금 해 두기로 이미 결정돼 있다.** `Article`/화면에 자리가 없는 것은 이 필드가
죽은 코드라서가 아니라 **Q6이 "저장은 하지 않는다"고 정확히 그렇게 결정했기 때문**이다 — 소비처가
없는 것 자체가 설계대로다.

**조사 결과 3 — 부수 발견(더 중요함)**: 22일차 Task 030으로 등록한 노컷뉴스 계열 피드가
`<pubDate>` 월 이름 자리에 숫자를 그대로 찍는 기형을 실측했다(`"Tue, 11 08 2026 07:00:00
+0900"`). 이 문자열을 손대지 않고 `new Date()`에 넘기면 **첫 번째 숫자를 월로, 두 번째 숫자를
일로 오독해 11월 8일(미래·존재하지 않는 값)을 "유효한" 날짜로 조용히 돌려준다** —
`Number.isNaN` 검사로는 잡히지 않는 오파싱이다. 지금은 `publishedAt`을 아무도 안 읽어서
드러나지 않지만, Q6이 예고한 "나중에 도입" 시점엔 노컷뉴스 계열 기사 전부가 몇 달씩 어긋난
날짜로 필터링/정렬됐을 것이다. 국민일보 계열의 다른 비표준 형식(CDATA로 감싸고 요일 없이
이중 공백 — `"9 Aug  2026 16:07:00 GMT"`)은 확인해 보니 기존 파서가 이미 정확히 처리하고
있었다(오파싱 아님).

**📌 결정: (b) 남기고 파서를 고친다.** Q6이 "파서가 값을 갖고 있으면 나중에 도입할 때 다시
건드리지 않아도 된다"고 명시했는데, 그 값이 조용히 틀린 상태로 남아 있으면 Q6의 목적 자체가
무너진다. `lib/crawler/rss.ts`의 `parsePublishedAt`에 "요일, 일, 월(숫자), 연도" 기형 패턴을
미리 잡아 일/월 자리를 명시적으로 고정하는 전처리를 추가했다 — RFC 822의 필드 순서(요일 다음이
**일**, 그다음이 월)를 그대로 따르는 형태이므로 오독 방향이 아니라 그 순서를 명시적으로 지키게
만들었다. `lib/types/article.ts`·`lib/storage/`는 이번 조사·수정 범위 밖이라 손대지 않았다
(범위를 넓혀야 하는 결론이었다면 (b) 대신 draft 이슈로만 남겼을 것이다 — 이번엔 `rss.ts` 안에서
끝났다).

**바꾼 파일**: `lib/crawler/rss.ts`(`parsePublishedAt`에 `normalizeMalformedNumericMonth`
전처리 추가) · `lib/crawler/rss.test.ts`(회귀 테스트 2건 추가 — 노컷뉴스 기형 패턴 교정 확인,
국민일보 CDATA·비표준 패턴이 여전히 정상 동작함을 고정). `npm run test`(284건, 기존 282 + 신규
2) · `lint` · `typecheck` 전부 통과.

**해소**: 완료 — `publishedAt`은 유지, 노컷뉴스 계열 오파싱은 수정, 국민일보 계열은 회귀
테스트로 고정.

---

### D-057 · 아주경제(재테크) 피드의 이중 인코딩 — (B) 판정, 매체 교체로 확정 (22일차)

- 배경: 22일차 Task 029 교차검증 중 발견한 "아주경제 재테크 기사에 `&quot;`·`&#39;`가 문자
  그대로 남는다"는 건을 팀장이 "참고용이 아니라 이번 회차 범위"로 재지정하며 (A)(원문이
  `&quot;`로 단일 인코딩 — 우리 버그)/(B)(원문이 `&amp;quot;`로 이중 인코딩 — 매체 버그, 우리
  동작은 스펙대로) 판정과 실제 키워드 오염 여부 확인을 지시했다. **결론을 미리 정하지 말고
  raw 바이트부터 보라는 지시였다.**

**조사 결과 1 — (A)/(B) 판정: (B), raw 원문이 이중 인코딩돼 있다.**
`curl -A "Mozilla/5.0" "https://www.ajunews.com/rss/investment.xml"`로 받은 원문 바이트에서
문제의 기사를 직접 찾았다:

```
<title><![CDATA[IBK證 &amp;quot;GS리테일, 업황 회복 신호…목표가 3만5000원으로 상향&amp;quot;]]></title>
...
<description><![CDATA[... 투자의견 &amp;#39;매수&amp;#39;를 유지했다 ...]]></description>
```

피드 자체가 `&quot;`가 아니라 **`&amp;quot;`**(`&`가 먼저 `&amp;`로 인코딩된 뒤, 그 안의
`quot;`까지 통째로 다시 이스케이프 대상에 들어간 이중 인코딩)를 준다. `lib/crawler/rss.ts`의
`decodeHtmlEntities`를 실제 값으로 직접 태워 재현했다 —

```
input : IBK證 &amp;quot;GS리테일, 업황 회복 신호…목표가 3만5000원으로 상향&amp;quot;
output: IBK證 &quot;GS리테일, 업황 회복 신호…목표가 3만5000원으로 상향&quot;
```

한 번의 스캔으로 `&amp;` → `&`만 풀고 그 뒤에 남은 `quot;`는(원문에 `&`가 다시 붙어 있지
않으므로) 엔티티로 재해석하지 않는다 — **I-043이 확정한 "정확히 한 번만 스캔한다" 규칙이
정확히 설계대로 동작한 것이다.** 화면에 보이는 `&quot;`·`&#39;`는 우리 디코더의 결함이
아니라 **아주경제가 자체 CMS에서 이미 한 번 인코딩된 문자열을 피드 생성 시 다시
인코딩**해서 넘기는 것이다.

**조사 결과 2 — 유입 경로: `<title>`·`<description>` 양쪽 모두, 전부 CDATA 안.**
`<title><![CDATA[...]]>`·`<description><![CDATA[...]]>` 둘 다 CDATA로 감싸여 있어
fast-xml-parser가 엔티티로 손대지 않고 그대로 넘긴다(21일차에 확인된 "CDATA 안은
`decodeHtmlEntities`가 상대하는 자리" 그대로) — 그래서 이 문제가 우리 디코더 앞에 그대로
도달한다. 원문 76개 아이템 중 **제목 19개·요약 51개**에서 이중 인코딩이 나타났다(전체
700건, 유형별로는 `&amp;quot;` 293건·`&amp;#39;` 182건·`&amp;nbsp;` 214건·`&amp;amp;`
11건). **아이템의 60/76(79%)이 최소 1건 이상 영향을 받는다** — 산발적 오타가 아니라
CMS의 피드 생성 파이프라인 자체가 인코딩을 두 번 거는 체계적 버그로 보인다.

**조사 결과 3 — 다른 신규 매체 표본: 아주경제 1곳뿐이다.**
22일차에 새로 등록한 17곳(전자신문·AI타임스·IT조선·테크M·노컷뉴스 4종·국민일보 3종·
파이낸셜뉴스 5종·이투데이 금융·아주경제 재테크)의 raw 피드를 전부 다시 받아
`&amp;(quot|apos|lt|gt|nbsp|amp|#\d+|#x[0-9a-f]+);` 패턴으로 스캔했다. **이중 인코딩
신호가 나온 곳은 아주경제 재테크(700건)뿐이고 나머지 16곳은 0건이다.** 표본을 늘려 새로
들어온 매체 중에서도 이 습관은 아주경제 고유의 것으로 보인다 — 오늘 등록한 다른 16곳,
기존 17곳(사흘 전부터 있던 매체)까지 이번 조사 범위는 아니지만 같은 스캔 방식을 그대로
재사용할 수 있으므로 필요해지면 바로 확인 가능하다.

**조사 결과 4 — 키워드 랭킹까지 실제로 샌다(이론적 우려 아님).**
`data/runs/20260811-085056/articles/0021~0025.txt`(이 실행에 포함된 아주경제 기사 5건)를
직접 열어 `&quot;`·`&#39;`·`&nbsp;`가 본문에 그대로 저장돼 있음을 확인했다. 이 실행의
`GET /api/runs/20260811-085056/keywords`를 실제로 쳐서 랭킹 상위(1030개 키워드 중)를
확인한 결과:

| 순위 | 키워드 | 품사 | 등장 횟수 |
| --- | --- | --- | --- |
| 4 | **quot** | SL | 18 |
| 8 | **nbsp** | SL | 15 |
| — | **amp** | SL | 1 |

`quot`가 **4위**(코스피 17회보다 위), `nbsp`가 **8위**(국내 13회보다 위)로 실제 키워드
랭킹에 노출됐다 — 이 실행 25건 중 아주경제 비중이 5건(20%)뿐인데도 상위 10위 안에
쓰레기 토큰 2개가 들어갔다. **"표본을 늘려 정확한 분석" 목적이 이 매체 하나 때문에
스스로 깎이고 있다는 팀장의 우려가 실측으로 확인됐다.**

**📌 결정: 4번(매체 교체). 파서는 손대지 않는다(팀장 확정).**

**왜 3번(좁은 전용 전처리)을 택하지 않는가 — 모호성의 차이.** 같은 회차에 이미 비슷한
정정을 했다 — `pubDate`의 `"Tue, 11 08 2026"` 기형을 정규식으로 잡아 바로잡은 것(위 §
`FeedItem.publishedAt` 항목). 그런데 그 둘은 성격이 다르다.

- **`pubDate` 기형은 모호하지 않다.** RFC 822의 두 번째 자리(월)에 두 자리 숫자가 오는
  것은 어떤 해석으로도 유효한 정상 콘텐츠가 아니다 — "일·월이 뒤집힌 오파싱"과 "의도된
  정상값"이 겹칠 여지가 없으므로 교정에 부작용이 없다.
- **`&amp;quot;`는 모호하다.** 그건 **"리터럴 텍스트 `&quot;`를 쓰고 싶다"는 의도를
  표현하는 올바른 방법이기도 하다.** 이중 디코딩을 넣으면, 실제로 화면에 `&quot;`라는
  여섯 글자를 보여주려던 원문이 있을 경우 그걸 우리가 임의로 망가뜨린다. 이 구분은
  추측이 아니라 **어제(21일차) I-043에서 테스트로 이미 못박은 것**이다 —
  `rss.test.ts`의 "이중 이스케이프는 한 번만 풀리고 따옴표로 재해석되지 않는다" 테스트가
  `&amp;apos;` → `&apos;`(더 풀지 않음)를 정확히 이 이유로 대조군에 넣어 두었다.
  반례 하나(아주경제)를 만났다고 근거를 갖고 내린 어제 결정을 하루 만에 뒤집으면,
  코드베이스가 **가장 최근에 만난 피드를 따라 흔들리는** 상태가 된다. 지금 근거는
  34곳 중 1곳(3%)뿐이다 — 21일차에 조사한 12곳도, 오늘 나머지 16곳도 전부 깨끗했다.

**2번(불용어 추가)도 기각한다.** `quot`·`nbsp`는 단어가 아니라 인코딩 잔여물이고,
불용어는 "의미는 있으나 흔해서 빼는 말"을 담는 자리이지 인코딩 버그를 감추는 자리가
아니다. 게다가 불용어는 **키워드 랭킹에서만 숨길 뿐** `/results` 본문 미리보기에는
`&quot;`가 여전히 그대로 보인다 — 증상만 가리고 원인은 그대로 남는다.

**1번(방치)도 기각한다.** 조사 결과 4에서 확인했듯 실제 랭킹 오염(quot 4위·nbsp 8위)이
있고, 표본 수 여유(증권 6곳)가 있어 교체 비용이 낮다 — 방치할 이유가 없다.

**실행**: `DELETE /api/press/ajunews-investment`로 제거하고, 새 조사 절차(등록 전
이중 인코딩 스캔 — 아래 참고)로 검증한 **서울파이낸스**(`seoulfn-stock`,
`https://cdn.seoulfn.com/rss/gn_rss_allArticle.xml`)로 교체했다. 상세 실측값은
`docs/press-candidates.md` §아주경제 재테크 제거와 서울파이낸스 교체.

**에스컬레이션 조건(다음 사람을 위해 명시)**: **이중 인코딩 매체가 두 번째로 나타나면
그때는 개별 교체가 아니라 3번(좁은 전용 전처리, `&amp;(quot|apos|lt|gt|nbsp|amp|#\d+|
#x[0-9a-f]+);` 패턴만 좁게 잡는 방식)을 검토한다.** 1곳은 그 매체만의 문제로 볼 수
있지만, 2곳부터는 "우리 파서가 감당해야 할 패턴"으로 판단이 바뀐다. 이 기준선(1곳=
교체, 2곳=파서 대응 검토)을 넘어서기 전까지는 매체 교체가 기본값이다.

**절차 개선**: 새 언론사 후보는 등록 전에 raw 피드를 `&amp;(quot|apos|lt|gt|nbsp|amp|
#\d+|#x[0-9a-f]+);` 패턴으로 스캔하는 단계를 `docs/press-candidates.md` §재현 방법에
추가했다 — 다음 사람이 같은 사고를 반복하지 않게 한다.

**바꾼 파일**: `data/press-sources.json`(`DELETE ajunews-investment` → `POST
seoulfn-stock`, API 경유) · `docs/press-candidates.md`(제거·교체 기록, 재현 방법에
이중 인코딩 스캔 단계 추가) · `docs/ISSUES.draft.크롤파이프라인.md`(오염 실측 기준선
기록). **`lib/crawler/rss.ts`는 손대지 않았다** — 오늘 넣은 `pubDate` 교정만 그대로
남아 있고, 엔티티 디코딩 로직은 무변경이다. 확인에 쓴 임시 스크립트는 전부 실행 후
삭제했다.

**검증**: `GET /api/press?category=stock` → 6곳(`seoulfn-stock`·`asiae-stock`·
`etoday-finance`·`etoday-market`·`infostock-daily`·`fnnews-stock`). `POST /api/crawl`
(`pressIds:["seoulfn-stock"]`, `maxArticlesPerPress:10`) → `runId: 20260811-092100`,
`successCount:10`·`failCount:0`. 저장된 txt 10건 전부 `&quot;`·`&#39;`·`&amp;`·`&nbsp;`·
`&apos;`·`&lt;`·`&gt;` grep 검사 — 매치 0건.

**해소**: 완료 — (B) 확정, 아주경제 재테크 제거, 서울파이낸스로 교체, 재검증 통과.
기존 오염 run(`20260811-085056`)은 이 판정의 증거로 그대로 남겨 두었다(삭제하지 않음).

### D-058 · 하이라이트 토큰 구체값 — 라이트는 노랑 400급, 다크는 골드 700급 + 글자는 양쪽 다 어둡게 고정

- 배경: 22일차 · 화면(Task 029 — 수집 결과 검색어 하이라이트). 팀장 판정은 "`app/globals.css`에 하이라이트
  토큰을 새로 두고 컴포넌트는 그 토큰만 참조한다. 라이트·다크 각각 정의해 양쪽에서 노란 계열이 나오되
  다크에서 눈이 아프지 않게 골라라"까지였고, 정확한 색상값은 구현 단계 판단으로 남겨졌다.
- 관련 파일: `app/globals.css`(`--highlight`/`--highlight-foreground`, `@theme inline`의
  `--color-highlight`/`--color-highlight-foreground`), `components/results/highlighted-text.tsx`

**결정 (22일차 갱신 — 다크 값이 WCAG AA 미달로 확인돼 재조정했다)**:

| 토큰 | 라이트 | 다크(최초) | 다크(최종) |
| --- | --- | --- | --- |
| `--highlight` | `oklch(0.852 0.199 91.936)`(노랑 400급) | `oklch(0.554 0.135 66.442)` | **`oklch(0.6 0.135 66.442)`**(L만 0.554→0.6, C·H 그대로) |
| `--highlight-foreground` | `oklch(0.145 0 0)`(`--foreground` 라이트와 동일) | `oklch(0.145 0 0)` | `oklch(0.145 0 0)`(변경 없음) |

**대비 재계산(OKLCH → 선형 sRGB → WCAG 상대휘도, 크롤 파이프라인 리뷰의 계산 방법론과 동일)**:

| 모드 | 배경 | 글자 | 대비 | 판정 |
| --- | --- | --- | --- | --- |
| 라이트 | `oklch(0.852 0.199 91.936)` | `oklch(0.145 0 0)` | 12.62:1 | 통과 |
| 다크(최초) | `oklch(0.554 0.135 66.442)` | `oklch(0.145 0 0)` | 4.02:1 | **미달**(AA 4.5:1) |
| 다크(최종) | `oklch(0.6 0.135 66.442)` | `oklch(0.145 0 0)` | **4.85:1** | 통과 |

**왜 이렇게 했나**: 사용자가 "노란색"을 직접 지정했고 팀장도 "양쪽에서 노란 계열"을 못박아 색상 계열
자체를 바꿀 여지는 없었다. 최초 다크값은 명도(L)를 크게 낮춰(0.554) 눈부심을 줄이려 했으나, 그 결과
`docs/CONVENTIONS.md` §8이 요구하는 WCAG 기준(1.4.1)에 못 미치는 대비(4.02:1)가 나왔다 — "안 아프게"와
"읽을 수 있게"가 같은 방향이 아니었다. 채도(C)·색상(H)은 그대로 두고 명도만 0.554→0.6으로 소폭 올려
4.85:1까지 끌어올렸다 — 여전히 톤 다운된 골드 계열로 읽히면서 AA 기준을 넘긴다. 글자색은 라이트·다크
모두 어둡게 고정했다 — `<mark>`의 관습적인 "검은 글자 위 노란/골드 배경"을 그대로 따르고, 두 테마에서
표시 방식이 같아 시각적 일관성도 지킨다.

**검토했지만 채택하지 않은 대안**: 다크에서 글자를 밝게(`--foreground` 다크, `oklch(0.985 0 0)`)로 바꾸는
안 — 중간 명도 배경 위에서 어두운 글자와 밝은 글자의 대비는 비슷하게 나오지만, 어두운 글자 쪽이 라이트
모드와 더 일관돼 보여 채택하지 않았다. 이 판단은 대비 재계산 이후에도 유효하다.

---

### D-059 · 탭 상태 보존에 캐시 무효화 규칙을 만들지 않는다 — stale-while-revalidate로 통일 (23일차, Task 031)

- 결정: 23일차 · 팀장(착수 전 판정) — 화면 워크스트림이 그대로 구현, 저장소 계층이 교차검증으로 확인

**무엇을 정했나**: 탭 전환 상태 보존(Task 031)에서 **"어느 탭의 변경이 어느 탭의 캐시를 깨는가"를 정의하지
않는다.** 대신 모든 탭이 같은 규칙 하나를 쓴다 — **복귀하면 보관된 데이터를 즉시 그리고, 뒤에서 다시
불러온다.** 스켈레톤은 보관된 데이터가 아예 없을 때만 띄운다.

**대안이었던 것**: 무효화 표를 만드는 안(언론사 CUD → 크롤링 실행 탭 목록 무효화, 크롤 완료 → 실행 목록
무효화, 불용어 CUD → 키워드 분석 결과 무효화 …). 이 안을 기각한 이유는 작업량이 아니라 **실패 방식**이다.
표에서 빠진 경로는 "화면은 멀쩡한데 값만 낡은" 결함이 되고, 그건 사용자가 틀린 값을 보고도 틀렸다는 것을
알 수 없는 종류다. 표는 언제나 불완전하고, 불완전한 표는 완전하다고 착각된다.

**받아들인 비용**: 탭에 돌아온 직후 **아주 짧은 순간 낡은 값이 보인다.** 실측으로 `/press`에서 언론사를
추가하고 `/`로 이동했을 때 새 언론사가 약 800ms 뒤에 나타났다. 로컬 단일 사용자 도구에서 이 지연은
스켈레톤이 매번 깜빡이는 것보다 낫다고 판단했다.

**뒤집어야 하는 조건**: 재조회가 눈에 띄게 비싸져(예: 키워드 재분석처럼 초 단위) "뒤에서 조용히"가 성립하지
않는 탭이 생기면, 그 탭 **하나만** 명시적 갱신(버튼)으로 바꾼다. 그래도 표는 만들지 않는다.

---

### D-060 · `/results`·`/keywords`만 로컬 state + 언마운트 스냅샷을 쓴다 — 두 패턴 공존은 의도된 것이다 (23일차, Task 031)

- 결정: 23일차 · 화면 워크스트림(구현 중 판단) → 저장소 계층 교차검증이 근거의 사실 여부를 확인 → 팀장 승인

**무엇을 정했나**: 탭 5개 중 `/`·`/press`·`/stopwords`는 모든 필드를 컨텍스트에 직접 바인딩하고,
**`/results`·`/keywords`는 일부 필드를 로컬 `useState`로 남긴 뒤 언마운트 시점에 컨텍스트로 되돌려 쓴다.**
같은 목적에 두 가지 패턴이 공존하는데, **이건 정리해야 할 불일치가 아니라 필요한 구분이다.**

**왜 갈리나**: 이 두 화면은 "선택한 실행(run)이 바뀌면 필터·결과를 **렌더 도중** 즉시 초기화"하는 패턴을
쓴다(`hooks/use-crawl-progress.ts`가 먼저 쓴 것과 같은 계열 — React 공식 권장인 "prop이 바뀔 때 state를
조정하는" 방식이다). 그런데 그 조정은 **자기 자신의 state에만** 안전하다. 초기화 대상 필드를 컨텍스트에
바인딩하면 렌더 도중 **다른 컴포넌트(Provider)가 소유한 state**를 갱신하게 되고, React가
`Cannot update a component while rendering a different component` 경고를 낸다.

**함께 처리한 것**: 복귀 직후 첫 렌더가 "run이 바뀌었다"고 오판해 방금 이어받은 스냅샷을 지우지 않도록,
`trackedRunId`의 초깃값을 컨텍스트에서 이어받은 `selectedRunId`와 맞췄다.

**이 결정을 남기는 이유**: 나중에 코드를 읽는 사람이 "왜 두 화면만 다르지"라고 보고 통일하면 경고가
되살아난다. 통일하려면 먼저 렌더 중 초기화 패턴 자체를 걷어내야 한다 — 그건 별개의 작업이다.
이 패턴의 남은 취약점은 **I-060**에 기록해 두었다.

---

### D-061 · Task 031 DoD에 없던 `/results` 카테고리 필터 지속도 유지한다 (23일차)

- 결정: 23일차 · 팀장(교차검증 뒤 판정)

화면 워크스트림이 DoD 문구에 없는 `/results`의 카테고리 필터까지 지속시켰고, 이를 스스로 "범위를 넘었을
수 있다"고 보고했다. **유지한다.** `/press`·`/keywords`에는 카테고리 보존이 DoD에 있고 `/results`만 빠지면
같은 컨트롤이 화면마다 다르게 동작하게 된다 — **DoD 목록의 누락이지 담당의 범위 이탈이 아니다.**
저장소 계층 교차검증도 같은 판정을 냈다.

같은 성격의 부수 처리 두 건(**`?runId=` 우선순위를 "URL > 컨텍스트에 남은 선택 > 최신 실행"으로 정한 것**,
**컨텍스트에 남은 `selectedRunId`가 실제 목록에 아직 있는지 방어 검증**)도 유지한다. 이 둘은 지속성을
넣으면 반드시 따라오는 정합성 처리다 — 값을 기억하기 시작하면 "그 사이 대상이 사라졌다"를 다뤄야 한다.
