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
