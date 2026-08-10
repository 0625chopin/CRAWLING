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

- 상태: 유효 (잠정 — I-020이 해소되면 걷어낸다)
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
