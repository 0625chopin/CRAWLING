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

- 상태: 유효(판단 이월)
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
