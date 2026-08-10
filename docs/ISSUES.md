# 이슈 대장

회차를 굴리다 발견된 이슈를 번호(`I-NNN`)를 붙여 모아 두는 곳이다. 아직 등재된 이슈는 없다.

## 규칙

- **워크스트림은 이 파일에 새 헤딩(`### I-NNN`)을 직접 붙이지 않는다.** 번호 없이
  `docs/ISSUES.draft.<AREA>.md`에 제목·근거·본문만 쓴다. 번호 부여와 본문 병합은 **회차 마감에 팀장만** 한다
  (동시 편집 시 번호 충돌이 확정적으로 나기 때문이다 — `.claude/skills/workstream-day-runner/SKILL.md` 0-1절).
- **이미 번호가 붙은 블록 안의 내용은 워크스트림이 직접 고쳐도 된다.** `상태` 갱신, 진행 메모 추가, 교차 참조
  한 줄 추가는 새 번호를 만들지 않으므로 충돌 지점이 아니다.
- 번호는 `I-001`부터 1씩 증가한다. 한 번 쓴 번호는 재사용하지 않는다(해결된 이슈도 지우지 않고 상태만 바꾼다).
- 문서와 실물이 어긋나면 **`data/` 하위 실제 파일과 커밋된 코드를 진실로 삼는다.**

## 서식

```markdown
### I-001 · <한 줄 제목>

- 상태: 열림 | 해결됨 | 보류 | 기각
- 발견: <N일차> · <발견한 워크스트림>
- 관련 Task: <Task 번호>

<무엇이 문제인지. 근거 경로는 `파일:줄번호`로.>

**해소**: <해결됐다면 어떻게. 아직이면 이 줄을 뺀다.>
```

---

<!-- 여기서부터 I-001, I-002 ... 순서로 추가한다. -->
### I-001 · `import 'server-only'`이 있는 모듈을 vitest가 import하지 못한다

- 상태: 해결됨
- 발견: 1일차 · 저장소 계층(Task 019 교차검증 중)
- 관련 Task: Task 005 · Task 007 · Task 020A · Task 020B

`server-only` 패키지는 `exports`의 `react-server` 조건으로 no-op(`node_modules/server-only/empty.js`)과
throw(`index.js`)를 가른다. 그 조건을 켜는 것은 Next.js 서버 번들뿐이라, vitest에서는 **정상적인 서버 모듈조차**
import 시점에 `This module cannot be imported from a Client Component module.` 로 죽는다.
`resolve.conditions: ['react-server']`를 켜도 풀리지 않는다.

`docs/CONVENTIONS.md` §4가 `lib/storage/`·`lib/keyword/`·`lib/crawler/` 전 모듈에 `import 'server-only'`를
요구하므로, 규약을 지키면 앞으로 예정된 테스트 파일이 전부 착수 즉시 막힌다 —
`lib/storage/paths.test.ts`(Task 005) · `lib/storage/article-file.test.ts`(Task 007) ·
`lib/keyword/{extract,aggregate}.test.ts`(Task 020A·020B). Task 019는 테스트 파일이 없어 이번엔 드러나지 않았다.

**해소**: `vitest.config.mts`의 `resolve.alias`에 `'server-only'` → `node_modules/server-only/empty.js`를 추가했다
(1일차, 팀장). 패키지가 이미 갖고 있는 no-op 구현을 그대로 가리키므로 별도 스텁 파일을 만들지 않는다. 클라이언트
번들 혼입을 빌드 실패로 잡는 원래 역할은 `next build`가 그대로 수행한다 — vitest의 책임 범위가 아니다.
`import 'server-only'`가 있는 모듈을 import하는 임시 테스트로 통과를 확인한 뒤 그 파일은 지웠다.

### I-002 · `writeJson` 크래시 시 남는 orphan `.tmp` 파일을 정리하지 않는다

- 상태: 보류(낮은 우선순위)
- 발견: 2일차 · 크롤 파이프라인(Task 005 교차검증 중)
- 관련 Task: Task 005

정상 흐름(성공·명시적 에러)에서는 임시 파일이 남지 않는다 — 교차검증에서 실행으로 확인했다. 다만 프로세스가
강제 종료(SIGKILL·전원 차단)되는 순간에는 `atomicWriteFile`이 자기 `catch` 블록을 실행할 수 없어
`*.<uuid>.tmp`가 그대로 남는다. **이건 쓰기 함수 하나로 막을 수 있는 문제가 아니다** — 어떤 원자적 쓰기
구현체든 같고, 막으려면 앱 시작 시점에 `data/**/*.tmp`를 훑어 지우는 별도 부팅 루틴이 있어야 한다.

디스크 용량 낭비 외에 정합성 문제는 없다(어느 레포지토리도 `.tmp`를 읽지 않고, `assertSafeSegment` 대상도
아니다). 담당과 리뷰어의 판단이 일치해 지금 막지 않기로 했다. 나중에 부팅 훅을 만들 일이 생기면 함께 처리한다.

### I-003 · `paths.ts`에 runs 루트 디렉터리 헬퍼가 없었다

- 상태: 해결됨
- 발견: 2일차 · 크롤 파이프라인(Task 005 교차검증 중)
- 관련 Task: Task 005 · Task 007

Task 007의 `listRuns()`는 `data/runs/` 아래 전체를 순회해야 하는데, `lib/storage/paths.ts`가 내보내는 것은
특정 `runId`를 받는 `runDir(runId)`뿐이었다. 그대로 두면 007이 `path.join(DATA_ROOT, 'runs')`를 `paths.ts`
**밖에서** 조립하게 되어, Task 005 자신의 구현 규칙("경로 문자열은 이 파일 밖에서 조립하지 않는다")과
`docs/CONVENTIONS.md` §2를 정면으로 어긴다.

**해소**: 같은 회차에 `runsRootDir()`를 추가하고 `runDir(runId)`가 그 위에서 조립되도록 정리했다(2일차,
저장소 계층). 리팩터링 후에도 `assertSafeSegment`가 조립 전에 호출되는 순서가 유지되어 경로 순회 차단
회귀 케이스 17건이 전부 그대로 통과함을 리뷰어가 재실행으로 확인했다.

### I-004 · 조각 A만 끝난 시점에는 그 조각의 DoD를 브라우저에서 검증할 수 없다

- 상태: 해결됨(D-006으로 규칙 확정)
- 발견: 3일차 · 화면(Playwright MCP 시나리오 초안 작성 중)
- 관련 Task: Task 009A · Task 012A · Task 016A · Task 018A

화면 Task를 A/B로 쪼갤 때 **라우트에 도달하게 만드는 `page.tsx`가 한쪽에만 배정**되어 있어, 다른 쪽 조각만
끝난 시점에는 그 조각의 DoD를 Playwright MCP로 태울 수 없다. 네 군데에서 같은 구조가 발견됐다.

- **009A** — 표/카드 컴포넌트는 009A가 만들지만 `app/press/page.tsx`는 009B 몫이라, 009A 시점에 `/press`는
  여전히 `ScreenPlaceholder`다. 009A의 DoD(수집 설정 컬럼 표시·375/768/1280 반응형)를 확인할 방법이 없다.
- **016A** — `docs/screens/01-crawl-run.md`의 스켈레톤은 [크롤링 시작] 버튼을 `app/page.tsx`에 직접 그리는데,
  같은 문서의 파일 분할 경계 표는 그 구간을 `crawl-run-panel.tsx`(016B, 크롤 파이프라인 몫)로 보낸다.
  016A 담당이 버튼을 직접 그려도 되는지 판단할 근거가 없다.
- **012A/012B** — 012A가 `page.tsx`를 만들고 012B가 `stopword-add-card.tsx`만 만드는데, 012B 파일 목록에
  `page.tsx` 재수정이 없어 컴포넌트를 어떻게 끼워 넣는지가 문서에 없다.
- **018A** — `article-file-list.tsx`·`article-preview.tsx`가 둘 다 018B 몫이라, 018A만 끝난 시점에
  마스터-디테일 우측 절반이 어떻게 보이는지 정의가 없다.

**해소**: D-006으로 "조각 A는 짝 조각을 import하는 형태로 라우트를 완성하고, DoD 검증 시점은 짝 조각 완료
회차"라는 규칙을 확정했다. `docs/screens/playwright-scenarios.draft.md`가 이미 그 전제로 작성돼 있다.

### I-005 · 한글 전용 언론사명은 슬러그가 빈 문자열이 된다

- 상태: 해결됨
- 발견: 3일차 · 저장소 계층(Task 006)
- 관련 Task: Task 006 · Task 008A · Task 009B

Press id는 이름에서 만든 슬러그(소문자·영숫자·하이픈)인데, "전자신문"·"보안뉴스"처럼 ASCII 영숫자가 전혀 없는
이름은 슬러그가 빈 문자열이 된다. `docs/press-candidates.md`의 후보 11건 중 순한글 이름이 실제로 존재하므로,
폴백(`press`·`press-2`·…)을 그대로 두면 등록된 언론사 id가 이름과 무관해진다.

**해소**: D-005로 `pressCreateSchema`에 선택 필드 `id`를 추가하고, 미지정 시에만 슬러그 폴백을 태우기로 했다.

### I-006 · `listRuns`/`listArticles`가 손상된 개별 파일을 조용히 건너뛴다

- 상태: 열림(낮은 우선순위)
- 발견: 3일차 · 화면(Task 007 교차검증 중)
- 관련 Task: Task 007 · Task 017

값 격리 원칙(`docs/CONVENTIONS.md` §7)은 지켰지만, 사용자가 `data/`를 손으로 편집하다 파일을 깨뜨리면 그 기사·
실행이 목록에서 사라지고 **왜 사라졌는지 알 방법이 없다.** 화면 설계서 02에도 "N건 숨겨짐" 같은 UI가 없어 지금
당장 화면에서 할 일은 없다.

리뷰어 권고는 **화면 변경 없이 서버 콘솔에 `console.warn`으로 손상된 runId/articleId를 남기는 것**이다.
저비용이므로 Task 017 착수 회차에 함께 처리한다.

### I-007 · `ArticleMeta`/`ArticleListItem` 타입이 `lib/types/`가 아니라 `lib/storage/`에 있다

- 상태: 열림
- 발견: 3일차 · 화면(Task 007 교차검증 중)
- 관련 Task: Task 007 · Task 017 · Task 018A

`ArticleMeta`는 `articleSchema.omit({ content: true })`로 파생된 도메인 뷰 타입이라 `lib/types/article.ts`가
제자리다. 같은 저장소에 선례도 있다 — `lib/types/keyword.ts`의 `keywordRankItemSchema`가 "화면이 쓰는 파생 뷰"
라는 동일한 성격인데 `lib/types/`에 있다. Task 007 담당(크롤 파이프라인)은 이번 회차에 `lib/types/`가 읽기
전용이라 옮길 수 없었다.

**해소 예정**: `lib/types/`를 소유한 저장소 계층이 옮기고, 크롤 파이프라인이 import 경로를 따라 고친다.
두 영역이 함께 손대야 하므로 회차 배치에서 조율한다.

### I-008 · zod 필드가 요청 본문에서 통째로 생략되면 커스텀 한국어 메시지가 나오지 않는다

- 상태: 해결됨(API 레벨 방어로 확정)
- 발견: 4일차 · 저장소 계층(Task 008A 검증 중)
- 관련 Task: Task 004 · Task 008A · Task 008B · Task 009B

`z.string().min(1, '언론사명을 입력하세요')` 형태의 필드는 값이 **빈 문자열**로 오면 커스텀 한국어 메시지가
정상적으로 나오지만, 그 키가 **요청 본문에서 아예 생략되면** zod가 `invalid_type` 단계에서 걸려 기본 영문
메시지를 낸다 — 커스텀 메시지가 타입 검사가 아니라 `.min()` 부가 체크에만 붙어 있기 때문이다. 반면
`z.url(msg)`은 생략돼도 커스텀 메시지가 나온다(형식 검사를 타입 검사와 같은 단계에서 한다).

**해소**: `lib/api/response.ts`의 `fieldErrorsFromZod`가 "메시지에 한글이 하나도 없으면 일반화된 한국어
문구로 치환"하는 방어를 수행한다. 이 방어로 확정하고 **스키마에 필수 메시지를 추가하지 않는다**(D-009).

### I-009 · 기존 임시 라우트 2건이 원시 오류 메시지를 노출한다

- 상태: 열림
- 발견: 4일차 · 크롤 파이프라인(Task 008A 교차검증 중)
- 관련 Task: Task 015A · Task 023

`app/api/crawl/route.ts`와 `app/api/kiwi-check/route.ts`에 `error.message`를 응답에 그대로 싣는 코드가
남아 있다. `docs/CONVENTIONS.md` §7("원시 오류를 화면까지 흘리지 않는다")과 어긋나지만, **두 라우트 모두
제거 예정**이다 — `app/api/crawl/route.ts`는 Task 015A가 전면 교체하고 `app/api/kiwi-check/route.ts`는
Task 023이 삭제한다. 새로 고치지 않고 그 Task에서 함께 사라지는 것으로 처리한다.

### I-010 · `docs/screens/04-press-manage.md`의 "추가 설치 필요" 절이 낡았다

- 상태: 열림(낮은 우선순위)
- 발견: 4일차 · 화면(009A 착수 준비 중)
- 관련 Task: Task 009A · Task 023

`04-press-manage.md`가 dialog·alert-dialog·switch·label·textarea·toggle-group 6종을 "추가 설치 필요"로
적고 있지만, `docs/screens/README.md`는 이 6종을 포함한 13종이 Task 002에서 설치 완료됐다고 못 박았고
`components/ui/`에 실물이 존재한다. 화면 Task 착수 시 불필요한 설치 요청을 유발할 수 있다.
Task 023(문서 정정)에서 함께 정리한다.

### I-011 · `lib/crawler/rss.ts`의 `toPlainText`가 `&apos;` 같은 일부 HTML 엔티티를 안 걷어낸다

- 상태: 열림
- 발견: 7일차 · 크롤 파이프라인(Task 014A DoD 확인 중 — 013B DoD ⑧을 아이뉴스24 실크롤로 검증하다가)
- 관련 Task: Task 010A(원인 코드) · Task 020A(영향이 드러나는 지점) · Task 016B(화면 노출)

**증상**: 실제로 저장된 `data/runs/*/articles/0001.txt`의 제목이 이렇게 남아 있었다.

```
# title: 가천대, 국내 첫 &apos;AI반도체설계전문대학원&apos; 설립…10월부터 신입생 모집
```

**원인**: `toPlainText`가 `&nbsp;`·`&lt;`·`&gt;`·`&quot;`·`&#39;`·`&amp;` 6개만 치환한다. `&#39;`(십진 코드)는
있지만 `&apos;`(이름 있는 엔티티)는 없다 — 언론사 CMS가 어느 표기를 쓰는지에 따라 갈린다.
`&#8216;`·`&#8217;`(스마트 따옴표)도 같은 이유로 빠져 있을 수 있다.

**영향**: 같은 함수가 `summary`에도 쓰이므로 RSS 요약 경로 전체가 해당한다. **저장된 txt에 그대로 남으므로
키워드 추출 단계에서 `&apos;AI반도체설계전문대학원&apos;`처럼 엔티티가 토큰에 섞여 들어간다** — 화면은
멀쩡해 보이는데 키워드 순위만 조용히 오염되는 부류다.

**제안**: 치환 목록을 늘리기보다 표준 HTML 엔티티 디코더 사용을 검토한다. `lib/crawler/rss.test.ts`에
회귀 케이스가 있는지도 함께 확인한다. 010A가 완료 Task라 크롤 파이프라인이 직접 고치지 않고 남겼다.

### I-012 · `docs/screens/04-press-manage.md`가 구체 스펙 없이 "시각적 주의"를 요구한다

- 상태: 열림
- 발견: 7일차 · 팀장(Task 010B 교차검증 중)
- 관련 Task: Task 010B(이번에 마주침) · Task 016A · Task 022A(같은 문장을 다시 마주칠 가능성)

**증상**: 설계서 350행이 "…이때 본문 전문 수집 스위치에 **시각적 주의를 준다**"고 산문 한 문장으로만
적고, **어떤 마크업·클래스·상태 변화인지 스펙이 없다.** 010B 구현은 DoD가 명시한 "본문 전문 수집 권장
문구"만 렌더링하고 스위치에는 별도 처리를 하지 않았다.

**판단(팀장, 7일차) — 결함으로 보지 않는다**:
1. Task 010의 DoD는 "권장 문구가 나온다"까지만 요구하고, 그건 구현돼 있다.
2. `CONVENTIONS.md` §8("설계서에 없는 UI를 지어내지 않는다")에 비추면 구체 마크업이 없는 문장을 임의로
   구현하는 쪽이 오히려 규약 위반에 가깝다.
3. 스위치에 색 변화만 준다면 §8의 "색상 단독으로 상태를 전달하지 않는다"(WCAG 1.4.1)와 상충한다 —
   텍스트 병기 없는 강조는 그 자체로 새 접근성 문제를 만든다.

**제안**: 설계서 담당(화면)이 (a) 검증 가능한 구체 스펙을 넣거나 (b) 산문 문장을 걷어내고 "권장 문구"만
DoD로 남긴다. 어느 쪽이든 팀장 승인이 필요해 이슈로 남긴다. **016A·022A가 비슷한 문장(토글·스위치에
조건부 강조를 요구하는 산문)을 만날 때 같은 판단을 처음부터 되풀이하지 않게 하려는 기록이다.**

### I-013 · `docs/screens/01-crawl-run.md`의 `ScrollArea` 반응형 높이가 문서 안에서 서로 어긋난다

- 상태: 열림
- 발견: 7일차 · 화면(Task 025 사전 리허설·반응형 점검 항목 정리 중)
- 관련 Task: Task 016A(착수 전 해소 필요)

**증상**: 같은 문서가 두 값을 말한다. §스크롤 처리 결정(37행)과 §영역별 컴포넌트 명세 표(140행)는 언론사
체크박스 목록의 `ScrollArea`에 **데스크톱 `h-[420px]` · 모바일 `h-[320px]`** 를 요구하는데, §마크업
스켈레톤(459행)은 이렇다.

```tsx
<ScrollArea className="h-[420px] pr-3 sm:h-[420px]">
```

기본값도 `sm:`도 똑같이 `420px`이라 **모바일 전용 320px가 스켈레톤 어디에도 없다.** `docs/screens/` 전체에서
`sm:h-[`·`md:h-[`·`lg:h-[` 패턴은 이 한 곳뿐이라 관례가 아니라 이 스켈레톤만의 누락으로 보인다.

**왜 위험한가**: `CONVENTIONS.md` §8은 "설계서에 있는 요소·상태를 빠뜨리지 않는다"와 "마크업은 설계서를
그대로 옮긴다"를 함께 요구한다. **스켈레톤을 성실히 베낀 담당일수록 반응형 요구를 놓치고, 데스크톱에서는
멀쩡해 보인다.** 문서 안에서 어느 쪽이 권위 있는 값인지가 어긋나 있다.

**제안**: 스켈레톤을 `h-[320px] pr-3 sm:h-[420px]`로 고쳐 결정 문서·명세 표와 일치시킨다. 설계서 자체를
지금 고칠지 016A 착수 시점에 고칠지는 팀장 판단이 필요해 이슈로 남긴다.

### I-014 · `CrawlRun`이 대상 언론사 이름을 스냅샷하지 않아 삭제된 언론사의 이름을 복구할 수 없다

- 상태: 열림
- 발견: 8일차 · 저장소 계층(유휴 배정 — Task 017 응답 스키마 초안 작성 중)
- 관련 Task: Task 017(10일차 착수) · Task 018A

**증상**: `lib/types/crawl-run.ts`의 `CrawlRun`은 `targetPressIds: string[]`만 갖는다. 삭제는
`lib/storage/press-repository.ts:145` 부근의 `deletePress`가 배열에서 항목을 **완전히 제거**하는
방식이라(소프트 삭제·tombstone 없음), 과거 run이 가리키던 `pressId`로 `getPress(id)`를 불러도 `null`이
돌아오고 **그 언론사의 원래 이름을 복구할 방법이 코드 어디에도 없다.** 크롤 파이프라인이 교차검증에서
`deletePress` 구현을 직접 열어 이 진단이 정확함을 확인했다.

**영향**: `docs/ROADMAP.md` Task 017 구현 규칙 "대상 언론사는 id가 아니라 이름으로, 삭제된 언론사는
플래그를 함께"에서 삭제된 쪽은 이름이 영구히 `null`이다. 화면 설계서 02는 대상 언론사를 이름 배지로
그리는데, 그 자리에 무엇을 채울지 설계서에 명시가 없다. **DoD("삭제된 언론사가 포함된 과거 run을
조회해도 500이 나지 않는다")는 충족 가능하다** — 문제는 500 여부가 아니라 화면 표시다.

**제안(택1)**: ① API는 `name: null, deleted: true`를 내리고 화면이 "삭제된 언론사" 고정 문구로 대체
렌더링한다(구현 비용 최저, `docs/run-api-schema.draft.md` 초안이 이 방향). ② `run-meta.json`에 실행
시점 이름 스냅샷을 추가한다(정확하지만 Task 007·013B가 이미 완료라 스키마 마이그레이션이 필요하고,
기존 저장분은 여전히 스냅샷이 없어 반쪽 해결이다).

**이 이슈는 Task 017을 막지 않는다.** 다만 화면(Task 018A)이 배지를 어떻게 그릴지 미리 알아야 두
워크스트림이 같은 가정으로 움직인다.

**판단(9일차, 저장소 계층 — 유휴 배정)**: 제안 ①(API가 `name: null, deleted: true`)로 확정한다.
근거와 기각한 ②의 사유는 `docs/DECISIONS.draft.저장소계층.md`에 남겼다 — 핵심은 ②를 비파괴적으로
하려면 `targetPressNames`를 optional로 둬야 하는데, 그러면 스냅샷 없는 과거 run은 여전히 이름이
비어 있어 "반쪽 해결"이 실제 코드 경로(`crawlRunSchema.safeParse` 실패 → `listRuns`가 통째로
목록에서 제외)로 확인된다는 점이다. API가 보장하는 계약(`id`는 항상 있고 `name`만 `null`일 수
있다)을 `docs/run-api-schema.draft.md`에 반영했다. **코드는 바꾸지 않았다** — Task 017 착수
회차(크롤 파이프라인)가 반영한다.

### I-015 · 저장 경로를 화면 형식(프로젝트 루트 상대경로)으로 내려줄 수단이 없다

- 상태: 해결됨
- 발견: 8일차 · 저장소 계층(유휴 배정 — Task 017 응답 스키마 초안 작성 중)
- 관련 Task: Task 017(10일차 착수)

**증상**: `lib/storage/paths.ts`의 `DATA_ROOT`는 `path.join(process.cwd(), 'data')` — OS 절대경로다.
`articlesDir()`도 그 위에 조립되는 절대경로만 반환하고, 상대 표시 문자열을 만드는 헬퍼가 없다. 반면
화면 설계서 02는 저장 경로를 `data/runs/20260810-143205/articles/`처럼 **프로젝트 루트 기준 상대경로**로
보여준다(와이어프레임·스켈레톤 `MOCK_RUNS[].storagePath` 모두 상대 표기).

**왜 조용히 새는가**: Task 017 구현자가 `articlesDir(runId)`를 그대로 응답에 실으면 화면에 로컬
절대경로가 노출된다. 로컬 단일 사용자 도구라 보안 문제는 아니지만 설계서와 다른 형식이 나가는
표시 버그이고, **타입체크·빌드·테스트가 전부 통과한다.** 게다가 라우트 안에서 즉석으로
`path.relative(...)`를 쓰면 그 자체가 `docs/CONVENTIONS.md` §2("경로 문자열은 `lib/storage/paths.ts`에만
존재한다") 위반이 된다 — 크롤 파이프라인이 교차검증에서 이 두 번째 근거를 추가로 짚었다.

**제안**: `paths.ts`에 `articlesDisplayPath(runId)` 같은 헬퍼를 두고 `path.relative(process.cwd(), ...)`를
슬래시로 정규화해 돌려준다. Task 017 구현 시점에 함께 만든다.

**해소**: 9일차(저장소 계층, 유휴 배정)에 `lib/storage/paths.ts`가 `articlesDisplayPath(runId)`를
내보내도록 추가했다. 내부적으로 `path.relative(process.cwd(), articlesDir(runId))`를 구하고
`path.sep` 기준으로 슬래시(`/`)로 정규화한 뒤 끝에 `/`를 붙인다 — 이 저장소가 Windows에서 돌아가고
`path.relative`가 `\`를 돌려주므로, 정규화를 빠뜨리면 화면에 `data\runs\...`가 나가는데도
타입체크·빌드·테스트가 전부 통과하는 표시 버그가 된다는 것이 이 이슈의 핵심이었다. runId 검증은
`articlesDir` → `runDir` → `assertSafeSegment`를 그대로 거치므로 이 헬퍼도 경로 순회 입력에
동일하게 예외를 던진다(별도 검증을 추가하지 않았다). 회귀 케이스는
`lib/storage/paths.test.ts`(`paths — 화면 표시용 상대경로 (I-015)`)에 3건 추가했다: 정확한 값
검증, 반환값에 `\`가 섞이지 않는지 검증(이 저장소가 Windows라 정규화를 빼면 실제로 실패하는
케이스), 안전하지 않은 runId(`..`·`../../etc`)에 대해 예외가 그대로 전파되는지 검증. `Task 017`
구현자는 `RunSummary.storagePath`에 이 헬퍼의 반환값을 그대로 쓰면 된다 —
`docs/run-api-schema.draft.md`에 반영했다.

### I-016 · run 생명주기 예외를 문자열 메시지로만 구분할 수 있었다

- 상태: 해결됨
- 발견: 8일차 · 화면(Task 015B 구현 중)
- 관련 Task: Task 014B · Task 015B · Task 015A(9일차)

**증상**: `RunAlreadyRunningError`(409 신호)는 전용 클래스였지만 "레지스트리에도 디스크에도 없는
runId"는 `lib/storage/run-repository.ts`의 `readRunMeta`가 던지는 평범한 `Error`였다. 그래서
`app/api/crawl/[runId]/route.ts`의 GET이 404를 판정하려면 메시지 접두사
(`실행을 찾을 수 없습니다`)를 비교해야 했다.

**왜 위험한가**: 문구를 누가 다듬는 순간 **404가 조용히 500이 되고 lint·typecheck·build·test가 전부
통과한다.** 게다가 9일차의 Task 015A가 `abortRun`의 두 예외("실행을 찾을 수 없습니다" /
"이미 종료된 실행은 중단할 수 없습니다")를 **또 문자열로** 갈라야 하는 상황이라, 같은 취약점이
라우트마다 복제될 참이었다.

**해소(8일차, 팀장 판단)**: 크롤 파이프라인이 `lib/storage/run-repository.ts`에 `RunNotFoundError`를,
`lib/crawler/run-manager.ts`에 `RunNotAbortableError`를 선언하고 `lib/crawler` 배럴이 셋
(`RunAlreadyRunningError` 포함)을 재수출한다. 화면이 GET 라우트를 `error instanceof RunNotFoundError`
판정으로 교체했다. **한국어 메시지 문구는 한 글자도 바꾸지 않았다** — 사용자에게 보이는 문장은
그대로다. 상세 판단은 D-022. 저장소 계층이 호출 체인 전체를 추적해 중간에 예외를 다시 감싸는 지점이
없음을 확인했다(타입이 라우트까지 보존된다).

### I-017 · 중단하면 요청하지 않은 기사가 「실패」로 집계되어 화면이 거짓 숫자를 말한다

- 상태: **해결됨(9일차 마감 후 · 팀장)**
- 발견: 9일차 · 팀장(Task 015A 실크롤 검증 중 — 실측으로만 드러났다)
- 관련 Task: Task 014B · Task 015A · **Task 016B(화면에 그대로 나간다)** · Task 018A

**증상**: 실제 언론사 4곳에 30건씩 크롤을 걸고 중간에 `POST /api/crawl/{runId}/abort`를 호출한 결과
`run-meta.json`이 이렇게 남았다.

```json
{ "successCount": 51, "failCount": 43, "status": "aborted" }
```

기사 txt는 51건이 정상 보존됐다(중단 동작 자체는 옳다). 문제는 **43**이다. 이 숫자는 중단 플래그가
선 뒤 `collectArticlePages`가 "실행이 중단되어 이 기사는 요청하지 않았습니다"로 접은 링크들이다 —
**요청조차 하지 않은 것이지 실패한 것이 아니다.**

**왜 조용히 새는가**: 같은 run의 `GET /api/crawl/{runId}` 응답은 언론사 4곳이 **전부 `status: "done"`**
이고 `collected == target`이다. 즉 **진행 상태는 "다 됐다"고 말하고 `run-meta.json`은 "43건 실패"라고
말한다.** `docs/ROADMAP.md` Phase 3 완료 기준은 "부분 실패한 실행에서 성공 건수와 실패 건수가 화면과
`run-meta.json` 양쪽에서 일치한다"를 요구하는데, 두 소스가 이미 어긋나 있다. 016B가 이 값을 그대로
그리면 사용자는 **중단 버튼을 눌렀을 뿐인데 "실패 43건" destructive Alert**를 보게 된다.

**왜 지금까지 안 보였는가**: 8일차 014B 검증은 전부 mock 기반이었고 `saveArticle` 호출 횟수만 셌다.
`failCount` 집계는 실제 크롤을 끝까지 돌려 `finishRun`이 파일을 쓰는 것을 봐야 드러난다.

**제안(택1, 판단 필요)**: ① 중단으로 접힌 링크는 `CrawlFailure`로 기록하되 `failCount`에서 제외하고
별도 `skippedCount`로 센다. ② `finishRun`이 `status: 'aborted'`일 때 중단 사유 실패를 걸러 센다.
③ 화면이 `status === 'aborted'`면 실패 건수를 다르게 표현한다(가장 싸지만 `run-meta.json` 자체는
계속 거짓을 담는다). **①·②는 크롤 파이프라인(014B·013B) 몫이고 016B 착수 전에 닫아야 한다.**

**해소(9일차 마감 후, 팀장)**: ①을 택하되 **문구가 아니라 타입으로 갈랐다.** ②(finishRun이
`status: 'aborted'`일 때 중단 사유 실패를 걸러 센다)는 `error` 문자열을 다시 문자열로 판정하는
방식이라 채택하지 않았다 — I-016이 이미 같은 이유로 문자열 판정을 타입 판정으로 걷어낸 전례다.

- `lib/crawler/press-crawler.ts`: 링크 1건의 결과를 `PageOutcome`(`article` | `failure` | `skipped`)
  판별 유니온으로 나누고, `PressCrawlResult`에 `skipped: string[]`을 새로 뒀다. 중단으로 접힌 링크는
  **`failures`에 들어가지 않고 `onArticleDone`도 부르지 않는다** — 후자를 빠뜨리면 진행률이 100%까지
  차올라 "다 됐다"고 말하던 절반의 거짓이 그대로 남는다.
- `lib/crawler/run-manager.ts`: 집계를 `RunCounts`(`successCount`·`failCount`·`skippedCount`)로 넓혔다.
  **아예 시작하지 않은 언론사의 `skippedCount`는 0이다** — 목록·피드조차 열지 않아 몇 건인지 알 수
  없고, 요청 시 최대 건수로 추정해 채우면 파일에 지어낸 숫자가 남는다.
- `lib/types/crawl-run.ts` · `lib/storage/run-repository.ts`: `CrawlRun.skippedCount`를 **기본값 0인
  선택 필드**로 추가했다(필수로 두면 과거 `run-meta.json`이 `safeParse`에서 떨어져 `listRuns`가 그 run을
  목록에서 통째로 빠뜨린다 — D-026이 확인한 경로 그대로다). `finishRun`의 status 계산에는 넣지 않는다.
- 회귀: `press-crawler.test.ts` 2건(전부 건너뜀 / 처리 도중 중단) · `run-manager.test.ts` 1건(집계 분리) ·
  `lib/types/crawl-run.test.ts` 신규 3건(하위호환·거부 케이스). 145 → 150건.

**실측 재확인(dev 3001, 언론사 4곳 × 30건 크롤 후 중단)**: `successCount: 53, failCount: 0,
skippedCount: 41`이고 저장된 기사 txt도 **53건**이다. 진행 상태 응답도 같은 말을 한다 —
`bloter 30/30 · boannews 10/10 · inews24 8/30 · zdnet-korea 5/24`(합 53), `overallPercent: 56`.
**고치기 전에는 같은 동선이 `failCount: 43` + 전 언론사 `collected == target` + 진행률 100%였다.**

### I-018 · `runCrawl`(범용 배치 크롤)이 호출부 없는 죽은 코드가 됐다

- 상태: 열림
- 발견: 9일차 · 팀장(Task 015A 완료 확인 중)
- 관련 Task: Task 015A · **Task 023(임시 코드 제거)**

**증상**: 015A가 `app/api/crawl/route.ts`를 언론사 선택 크롤로 전면 교체하면서 기존 범용 배치 크롤
라우트가 사라졌다(ROADMAP Task 015 구현 규칙이 지시한 대로다). 그 결과 그 라우트가 유일한 호출부였던
`lib/crawler/run.ts`의 `runCrawl`이 **어디서도 호출되지 않는다** — 저장소 전체에서 남은 참조는
`lib/crawler/press-crawler.ts:117`의 주석 한 줄뿐이다. `lib/crawler/index.ts`는 여전히 재수출한다.

**왜 지금 지우지 않는가**: `docs/ROADMAP.md` Task 023(임시 코드 제거)의 「생성/수정 파일」은
`app/api/kiwi-check/route.ts`와 `components/common/screen-placeholder.tsx` 두 건만 명시한다.
`runCrawl`은 그 목록에 없고, 지금 지우면 `crawlRequestSchema`·`CrawlRequest`·`ResolvedCrawlTarget` 등
`lib/crawler/types.ts`의 범용 스키마까지 연쇄로 걸린다(D-001이 이 스키마를 남겨 둔 근거를 따로 갖고
있다). **판단은 023 담당(크롤 파이프라인)이 한다.**

**남기면 무엇이 나쁜가**: 검증되지 않은 임의 URL을 크롤하는 코드 경로가 라이브러리에 남는다. 라우트가
없으니 외부에서 부를 수는 없지만, 다음 사람이 "이미 있는 범용 크롤러"로 착각해 새 라우트를 붙일 여지가
생긴다 — 015A가 그 엔드포인트를 없앤 이유와 정확히 반대다.

### I-019 · 중단으로 끝난 실행을 그리는 화면 상태가 설계서 01에 없다

- 상태: 해결됨
- 발견: 9일차 마감 후 · 팀장(I-017 수정 검증 중) → 화면(등재)
- 관련 Task: Task 016B · Task 018A · `docs/screens/01-crawl-run.md`

**증상**: `docs/screens/01-crawl-run.md`의 상태별 화면은 ①기본 ②일부 선택 ③진행 중 ④완료 ⑤부분 실패
⑥빈 상태 ⑦로딩 일곱 가지인데, **`status: 'aborted'`로 끝난 실행을 그리는 상태가 없다.** 폴링을 멈추는
조건(§③ 마지막 줄)에는 `aborted`가 들어 있어서, 화면은 "폴링은 멈춰야 하지만 무엇을 그릴지는 정해지지
않은" 상태로 016B에 넘어간다.

I-017을 고친 뒤 실제 중단 실행의 응답은 `successCount 53 · failCount 0 · skippedCount 41 ·
status 'aborted'`, 진행 상태는 `overallPercent 56 · bloter 30/30 · boannews 10/10 · inews24 8/30 ·
zdnet-korea 5/24`다. 숫자는 서로 맞지만 **두 가지가 설계서와 어긋난다.**

1. ④완료 화면을 그대로 쓰면 "✓ 크롤링 완료 · 기사 53건 저장"이 되어 **중단했다는 사실이 사라진다.**
   ⑤부분 실패는 `failCount > 0` 조건이라 뜨지 않는다(그게 맞다).
2. 중간에 멈춘 언론사가 `status: 'done'`으로 온다(`8/30`). `pressRunStatus` enum은
   `waiting | running | done | failed` 넷뿐이라 "하다 말았다"를 표현할 값이 없어, 설계서 §③이 지정한
   `CircleCheckBig`(완료) 아이콘이 `8/30` 옆에 붙는다.

**왜 코드로 먼저 정할 수 없었는가**: 크롤 파이프라인이 데이터를 고칠 수 있는 부분은 I-017로 닫혔다.
여기서부터는 **설계서에 없는 상태를 그리는 문제**라 `docs/CONVENTIONS.md` §8("설계서에 없는 UI를
지어내지 않는다")에 걸린다.

**해소**: 10일차. 016B 담당(크롤 파이프라인)이 설계서 대조와 함께 처리 방안을 확정했다(**D-030**) —
새 상태 **⑧ 중단됨**을 설계서에 추가하고, `skippedCount`는 "N건 미수집"으로 노출하며,
`pressRunStatus` enum은 건드리지 않고 `status === 'done' && collected < target` 파생 판정으로 가른다.
팀장이 그 결정대로 `docs/screens/01-crawl-run.md`에 §⑧과 부수 수정 2건을 반영했다. 016B는 이 문안을
그대로 집어 들면 된다.

### I-020 · `article-repository.ts`의 `readArticle`이 "없음"과 "손상"을 타입으로 구분하지 못한다

- 상태: 열림
- 발견: 10일차 · 저장소 계층(Task 017 구현 중)
- 관련 Task: Task 007(발생지, 범위 밖이라 직접 고치지 않음) · Task 017(회피 구현)

`lib/storage/article-repository.ts`의 `readArticle(runId, articleId)`는 파일이 없을 때와 메타 라인이
깨졌을 때(`parseArticle`이 던지는 형식 오류) **둘 다 그냥 `Error`를 던진다.** `run-repository.ts`의
`RunNotFoundError`(D-022가 문자열 접두사 판정의 위험을 지적하고 전용 클래스로 확정한 사례)와 같은
성격의 문제인데, 이쪽은 아직 전용 클래스가 없다.

`app/api/runs/[runId]/articles/[articleId]/route.ts`(Task 017)는 404("존재하지 않는 기사입니다")와
500("파싱 실패")을 갈라야 하는데, `readArticle`이 던지는 예외만으로는 **문자열 매칭 없이 가를 수 없다.**
회피책으로 `readArticle` 호출 전에 `fs.access(articlePath(...))`로 존재만 먼저 확인했다(**D-032**) —
Task 007 파일을 고치지 않고 우회하는 방식이라 영역 경계는 지켰지만 파일 시스템 호출이 하나 더 생긴다.

**제안**: `RunNotFoundError` 패턴 그대로 `ArticleNotFoundError`를 추가하고 `readArticle`의 ENOENT
분기가 이 타입으로 던지게 한다. 그러면 Task 017의 우회를 걷어내고 `instanceof` 판정으로 단순화할 수
있다. **이 변경은 Task 007 소유 파일이라 크롤 파이프라인의 확인이 필요하다.**

**해소**: 아직. Task 017은 위 회피책으로 DoD를 충족했으므로 블로킹은 아니다.

### I-021 · `assertSafeSegment`가 일반 `Error`를 던져 경로 순회 시도가 라우트마다 다른 상태 코드로 응답한다

- 상태: 열림
- 발견: 10일차 · 크롤 파이프라인(Task 017 교차검증 중) → 저장소 계층(등재)
- 관련 Task: Task 005(발생지, `lib/storage/paths.ts`) · Task 017 · `app/api/crawl/[runId]/*`(크롤 파이프라인 소유, 같은 증상)

`lib/storage/paths.ts`의 `assertSafeSegment`는 `runId`·`articleId`에 허용되지 않는 문자가 섞이면
(경로 순회 시도 포함) 평범한 `Error`를 던진다. 전용 타입이 아니라서 **라우트마다 우연히 다른 코드로
응답이 갈린다.**

**실측(10일차)** — `runId`에 `%2e%2e%2f%2e%2e%2fetc`를 넣으면:

- `GET /api/runs/{runId}`(Task 017) → 예외가 `RunNotFoundError` 전용 `catch`에 안 걸리고 바깥
  `withErrorBoundary`까지 흘러 **500**.
- `GET /api/crawl/{runId}`(9일차, 크롤 파이프라인 소유)도 같은 경로로 **500** — **Task 017이 새로 만든
  결함이 아니라 공통 원인**임을 이 라우트로 재확인했다.
- 반면 `GET /api/runs/{runId}/articles/{articleId}`는 D-032의 `fs.access` 우회가 try/catch로 감싸고
  있어 그 예외가 거기 걸려 **404**로 응답한다.

**같은 종류의 입력에 `runId` 경로는 500, `articleId` 경로는 404**를 준다. 후자가 우연히 더 정확한
코드를 내는 것이지 의도된 설계가 아니다.

**중요 — 순회 차단 자체는 완전하고 원시 오류도 새지 않는다.** `assertSafeSegment`는 여전히 예외를 던져
경로 조립을 막고, `withErrorBoundary`가 스택·영문 메시지를 화면까지 흘리지 않는다. **문제는 상태
코드뿐이다** — `docs/CONVENTIONS.md` §6 기준으로 이건 "검증 실패"이므로 400이 맞다.

**제안**: 전용 타입(예: `UnsafePathSegmentError`)을 `paths.ts`에 두고 각 라우트 경계가
`instanceof`로 `fail(message, 400)`에 매핑한다. I-016이 예외 판정을 문자열에서 타입으로 옮긴 것과 같은
계열의 처방이다.

**지금 고치지 않은 이유**: `paths.ts`는 공통 기반(Task 005)이라 저장소 계층과 크롤 파이프라인 **두 영역의
라우트를 함께 손봐야 한다** — 회차 범위를 넘는 교차 영역 변경이라 보류한다.

**해소**: 아직.

### I-022 · 서버 재시작 후 복구된 진행 상태는 언론사 전체 실패를 표현할 수 없다

- 상태: 열림
- 발견: 10일차 · 크롤 파이프라인(016B 착수 준비 — 상태 7종 대조 중)
- 관련 Task: Task 014B(발생지, `recoverRunProgress`) · Task 016B(소비처)

**증상**: `getRunProgress`는 이 프로세스가 해당 run을 잡으로 들고 있지 않으면(서버 재시작 등)
`recoverRunProgress`로 `run-meta.json` + 저장된 기사 파일 개수만으로 `pressStatuses`를 근사 복원한다.
이 복원 로직은 언론사별 상태를 `collected > 0 ? 'done' : 'waiting'` **두 가지로만** 계산한다
(`lib/crawler/run-manager.ts:328`) — **`'failed'`로 복원되는 경로가 아예 없고 `failReason`도 채워지지
않는다.**

즉 목록·피드를 열지 못해 완전히 실패한 언론사(기사 0건)가 있는 실행을 서버 재시작 뒤에 조회하면 그
언론사는 `status: 'waiting'`(대기)으로 보인다.

**영향**: 설계서 01 §⑤(부분 실패)가 요구하는 `CircleX` + `text-destructive` + 방식별 실패 사유 문구를,
서버가 그 실행 도중 한 번이라도 재시작되면 **다시 만들어낼 데이터가 없다.** 같은 이유로 D-030의
"중단됨" 파생 판정(`done && collected < target`)도 복구 경로에서는 항상 거짓이다 — `recoverRunProgress`가
`target`을 `collected`와 같은 값으로 강제하기 때문이다(`run-manager.ts:330`).

**016B의 대응(D-030에 포함)**: `RunProgress.recovered`가 이미 "이 스냅샷은 근사치"라는 신호를 주고
있으므로(D-023), 016B는 `recovered === true`일 때 언론사별 상세를 정교하게 그리려 하지 말고 런 레벨
안내 한 줄로 대체한다. **코드로 없는 데이터를 화면에서 지어내지 않는다.**

**근본 해소 제안**: `recoverRunProgress`가 `run-meta.json`의 `failures[]`를 언론사별로 집계해
`failed`·`failReason`까지 복원하게 한다. 담당은 크롤 파이프라인이며 016B 착수를 막지는 않는다.

**해소**: 아직.

### I-023 · 수집 결과 화면(02)의 실행 요약 카드에 `skippedCount`를 보여줄 자리가 없다

- 상태: 해결됨(설계서 반영) · 구현은 018B 회차
- 발견: 11일차 · 화면(Task 018A)
- 관련 Task: Task 018A(발견) · **Task 018B(구현)** · Task 022A(같은 요약을 다시 쓰면 같은 함정)
- 관련 결정: D-029 · D-030

**증상**: `GET /api/runs/{runId}`는 `skippedCount`(중단으로 요청조차 하지 않은 기사 수)를 내려주는데
`docs/screens/02-collect-result.md`의 ③ 실행 요약 카드에는 이 값을 보여줄 자리가 없었다. `aborted`로
끝난 실행(예: `20260810-211414`, `skippedCount: 41`)을 선택해도 화면은 "성공 53건 · 실패 0건"만 보여주고
**41건이 왜 비는지 알려주지 않는다.**

**왜 코드로 먼저 정하지 않았는가**: `docs/CONVENTIONS.md` §8("설계서에 없는 UI를 지어내지 않는다")에
걸린다. 018A는 `skippedCount`를 아예 렌더하지 않고 이슈로 올렸다 — 그 판단이 옳다.

**해소**: 11일차 마감. 팀장이 `docs/screens/02-collect-result.md` §영역별 컴포넌트 명세 ③에
`skippedCount > 0`일 때만 `성공 53건 · 실패 0건 · 41건 미수집` 보조 문구를 덧붙이도록 반영했다.
화면 01이 §⑧에서 쓰는 표현을 그대로 맞췄고(D-030), **"실패"라는 낱말을 쓰지 않으며 `text-destructive`도
주지 않는다** — 오류가 아니기 때문이다(D-029). **구현은 같은 화면을 여는 018B 회차가 맡는다.**

### I-024 · `docs/screens/02-collect-result.md`의 마크업 스켈레톤 타입이 실제 API 응답과 다르다

- 상태: 해결됨(설계서에 경고 반영) · 스켈레톤 본문 정정은 Task 023
- 발견: 9일차(D-026 본문에서 처음 지적) · 재확인: 11일차 · 화면(Task 018A)
- 관련 Task: Task 018A · **Task 018B · Task 022** · Task 023(문서 정정)
- 관련 결정: D-026 · D-027

**증상**: 설계서 02의 스켈레톤은 `interface CrawlRunOption { targetPressNames: string[] }` ·
`interface ArticleFileItem { pressName: string }`로 선언돼 있다. 실제 응답은
`targetPress: { id, name: string | null, deleted: boolean }[]`와 `pressName: string | null` +
`pressDeleted: boolean`이다(삭제된 언론사 대응 — D-026·D-027). **스켈레톤 타입을 그대로 베끼면 컴파일
단계에서 어긋난다.** 봉투 모양도 갈린다 — `GET /api/runs`는 배열을 그대로, `GET /api/runs/{runId}/articles`는
`{ items, total }`로 감싼다. `RunSummary.durationLabel`은 `null`일 수 있는데 스켈레톤은 항상 문자열로 쓴다.

**018A가 어떻게 처리했는가**: `lib/api/run-client.ts`에 스켈레톤의 더미 인터페이스 대신 실제 응답
타입(`RunListItem`·`RunSummary`·`RunTargetPress`·`ArticleFileEntry`·`ArticleFileDetail`)을
`app/api/runs/**/route.ts` 구현을 직접 읽어 새로 선언했다. **마크업·라벨은 설계서를 따르되 타입은
코드가 이기는 쪽으로 갔다.**

**해소**: 11일차 마감. 팀장이 설계서 02 「마크업 스켈레톤」 앞에 **"아래 스켈레톤의 타입 선언을 그대로
베끼지 않는다"** 경고와 어긋나는 세 지점의 대조표를 넣었다. **스켈레톤 코드 블록 자체의 정정은 Task
023(설계 문서 정정)의 몫으로 남긴다** — 지금 본문을 고치면 마크업까지 함께 손대게 되어 018B가 참조하는
단일 소스가 회차 도중에 흔들린다.

### I-025 · `toTimeOnly()`가 `formatLocalDateTimeSecond`의 출력 문자열 폭에 인덱스로 결합돼 있다

- 상태: 열림
- 발견: 11일차 · 화면(Task 018A 구현) → 저장소 계층(재검증·등재)
- 관련 Task: Task 017(발생지, `lib/api/run-format.ts`) · Task 018A(소비처) · **Task 018B(닫기 좋은 자리)**
- 관련 결정: D-025 · D-031

**증상**: `components/results/run-summary-card.tsx`의 `toTimeOnly(formatted)`가
`formatted.slice(11, 16)`으로 `"YYYY-MM-DD HH:mm:ss"`에서 `HH:mm`만 잘라낸다(설계서 §③이 모바일에
축약 포맷을 요구하기 때문이다). **함수 하나의 출력 문자열 "폭"에 다른 파일이 고정 인덱스로 의존하는
결합이고, 타입 시스템은 둘 다 `string`이라 이 관계를 표현하지 못한다.**

**왜 위험한가**: `formatLocalDateTimeSecond`의 출력 형식을 나중에 바꾸면(타임존 접미사 추가 등)
컴파일 에러도 런타임 예외도 없이 **조용히 엉뚱한 자리를 잘라 틀린 시각을 보여준다.**
`docs/CONVENTIONS.md` §9가 vitest 대상으로 지목하는 "틀려도 화면이 멀쩡해 보이는 로직"에 정확히
해당하는데, **`.tsx` 안의 지역 함수라 그 그물에 걸리지 않는다** — 이 프로젝트는 컴포넌트 렌더링
테스트를 도입하지 않으므로 자동으로 잡을 방법이 없다.

**지금은 안전하다**: `pad()`가 월·일·시·분·초를 2자리로 고정해 출력 폭이 항상 19자다. 11일차
재검증에서 1280px·375px 양쪽을 실제로 태워 `slice(11, 16)`이 정확히 `HH:mm`을 가리키는 것을 확인했다.
**깨져 있는 상태가 아니라 잠재 위험을 기록해 두는 것이다.**

**제안**: `lib/api/run-format.ts`에 `formatLocalTimeOnly(iso)`를 정식 함수로 추가하고 화면이 슬라이스
대신 그것을 호출한다. 그러면 이 관계가 `run-format.test.ts`의 정상적인 회귀 대상이 된다.

**왜 이번 회차에 고치지 않았는가**: 소비처가 화면 영역 파일이라 두 영역이 함께 손봐야 하고, 018A는
이미 재검증을 통과했다. **018B가 같은 화면을 여는 회차에 닫는 것이 자연스럽다.**

**해소**: 아직.

### I-026 · 설계서 03 스켈레톤의 `RunOption`이 Task 017이 확정한 `RunListItem`을 다시 더미로 선언한다

- 상태: 열림
- 발견: 12일차 · 크롤 파이프라인(Task 022A 착수 준비 — I-024 계열 재확인)
- 관련 Task: **Task 022A** · Task 017(실제 타입 소유) · Task 023(스켈레톤 본문 정정)
- 관련 이슈: **I-024**(설계서 02에서 같은 계열의 문제)

**증상**: `docs/screens/03-hot-keyword.md:423-426`의 마크업 스켈레톤이 분석 대상 run 셀렉터용 더미 타입을
`interface RunOption { id: string; label: string }`으로 선언하고 `MOCK_RUNS`도 그 모양으로 채운다.
그런데 이 셀렉터가 실제로 소비할 데이터는 새로 만들 API가 아니라 **Task 017이 10일차에 확정한
`GET /api/runs`**이고, 그 응답 타입은 `lib/api/run-client.ts`의 `RunListItem`이다 — `id`·`label` 외에
`startedAt`·`finishedAt`·`status`·`targetPressCount`·`successCount`·`failCount`·`skippedCount` 7개가 더 있다.

**컴파일 단계에서 깨지지는 않는다** — `RunOption`이 `RunListItem`의 부분집합이라 `{ id, label }`만 꺼내
쓰면 동작한다. **그래서 더 위험하다**: 스켈레톤을 그대로 베끼면 `RunListItem`을 import하는 대신 별도 더미
인터페이스를 새로 선언하게 되고, 그러면 `status`로 미완료 run을 셀렉터에서 빼거나 `startedAt`으로 정렬을
보정하는 로직을 넣을 자리가 **애초에 타입에 없어진다.**

**022A가 어떻게 처리해야 하는가**: `RunOption`을 새로 선언하지 말고 `lib/api/run-client.ts`의
`RunListItem`·`fetchRuns()`를 그대로 import한다(018A가 `run-select.tsx`에서 쓴 방식 그대로).
`lib/api/keyword-client.ts`는 분석 결과 전용으로 좁히고 run 목록 조회는 `run-client.ts`에 맡긴다.

**함께 확인된 것**: `AnalysisSummary`·`KeywordRankItem`·`PosTag` 세 타입은 `lib/types/keyword.ts`(Task 004)와
필드명·타입이 한 글자도 어긋나지 않는다 — **스켈레톤을 그대로 옮겨도 안전하다.** 어긋나는 것은
`RunOption` 하나뿐이다.

**해소**: 아직. 스켈레톤 본문 정정은 I-024와 마찬가지로 Task 023(설계 문서 정정)의 몫이다.

### I-027 · Task 022 DoD ② "절반 가까이 줄어든다" 문구가 실데이터와 어긋난다

- 상태: 열림 (문서 정정 대상 · **코드 결함 아님**)
- 발견: 13일차 · 크롤 파이프라인(Task 022A 담당이 자기 DoD 점검에서 스스로 보고) · **재현: 화면(교차검증)**
- 관련 Task: Task 022 · **Task 023(정정 반영)**

**증상**: `docs/ROADMAP.md` Task 022 완료 조건 ②는 "분석 요약의 '전체 토큰 수 → 조사·어미 제거 후'에서
숫자가 **절반 가까이** 줄어드는 것이 보인다"고 적었다. 실측은 run `20260810-204917`(성공 53건) 기준
17,915 → 12,080으로 **-32.6%**다. 담당과 리뷰가 **각각 독립적으로 같은 값**을 얻었다.

**코드는 정상이다**: `lib/keyword/aggregate.ts:15-32`의 `filteredTokenCount`는 조사(`JKS`~`JC` 9종)·
어미(`EP` `EF` `EC` `ETN` `ETM` 5종)·접미사(`XSN` `XSV` `XSA` 3종) **딱 그 3개 태그군만** 빼는 값이고,
동사·형용사·숫자는 그대로 남긴다. 그 정의는 코드 주석에 Task 020 근거까지 달려 명시돼 있으며 구현이
정의와 정확히 일치한다. 한국어 문장에서 조사·어미·접미사만 제거하면 30%대 감소가 정상 범위다.

**어디서 왔는가**: `docs/screens/03-hot-keyword.md`의 예시 수치(15,204 → 6,318, -58.5%)도 실측 근거 없는
가상의 숫자다. DoD 문구가 그 가상 예시를 기대치로 굳힌 것으로 보인다.

**왜 지금 안 고치는가**: `docs/ROADMAP.md`는 팀장만 편집하고, DoD 문구 정정은 Task 023(설계 문서 정정)의
범위다. **이 이슈가 Task 022 완료를 막지 않는다** — 화면이 요구받은 일(감소 대비를 보여주는 것)은
실제로 하고 있고, 틀린 것은 기대 수치뿐이다.

**정정 대상**: ROADMAP Task 022 DoD ② 문구와, 같은 근거를 쓰는 검증 시나리오 4-3 항목.

### I-028 · dev 서버가 3000(`next start`)과 3100(`next dev`) 둘로 갈려 검증이 낡은 빌드를 봤다

- 상태: **해결됨** (13일차 · 팀장이 3000번 프로세스 종료)
- 발견: 13일차 · 화면(유휴 배정 중 404 관찰) · 원인 규명: 팀장
- 관련 Task: 회차 운영 전반

**증상**: 13일차 착수 시 `curl localhost:3000/`이 200을 반환해 팀장이 "dev 서버가 떠 있다"고 판단하고 세
워크스트림에 3000번을 검증 주소로 안내했다. 그런데 화면 워크스트림이 `/press`·`/results`·`/stopwords`에서
404를, `/`에서는 다른 스캐폴드로 보이는 응답을 받았다. 크롤 파이프라인은 `npm run build`를 돌린 직후
그 서버가 참조하던 `.next`가 바뀌며 404를 겪었다.

**원인**: 3000번은 **낡은 `next start`(프로덕션 서버)**였고, 진짜 `next dev`는 처음부터 **3100번**에 떠
있었다(`next dev`가 "Another next dev server is already running … Local: http://localhost:3100"으로
알려 준다). 프로덕션 서버는 빌드 시점의 `.next`를 서빙하므로 **그 회차에 방금 만든 코드가 화면에 없거나,
빌드가 도는 동안 라우트가 통째로 404가 된다.**

**놓친 지점**: `curl`의 200 응답만으로 "올바른 개발 서버"라고 판단한 것. **200은 서버가 살아 있다는
뜻일 뿐 최신 코드를 서빙한다는 뜻이 아니다.**

**해결**: 팀장이 3000번을 종료하고 전 워크스트림에 3100번을 안내했다. 이후 검증은 전부 3100번에서
수행됐고 다섯 라우트 모두 200을 확인했다.

**다음 회차 예방책**: 회차 착수 점검에서 포트 응답 코드만 보지 말고 **어느 프로세스가 무슨 모드로
떠 있는지**를 확인한다. `npm run dev`를 한 번 실행해 보면 이미 떠 있는 dev 서버의 포트·PID·디렉터리를
그대로 알려 주므로 그것이 가장 싼 확인 방법이다.

### I-029 · Playwright MCP 브라우저를 워크스트림들이 공유해 검증이 서로 간섭한다

- 상태: 열림 (회차 운영 이슈 · 이번 회차 산출물에는 영향 없음)
- 발견: 13일차 · **세 워크스트림이 각각 독립적으로 관찰**
- 관련 Task: 회차 운영 전반 · **Task 025(전체 여정 수동 검증)**

**증상**: 한 회차에서 동시에 도는 워크스트림들이 **같은 Playwright MCP 브라우저 인스턴스를 공유한다.**
실제로 관찰된 것: ① 측정 도중 탭이 자기 조작 없이 다른 URL로 바뀌었다 ② 클릭 한 번 뒤 쿼리스트링이
소실된 채 다른 경로로 이동했다 ③ 다크 모드 토글이 무시되거나 되돌려졌다 ④ 필터 입력값이 임의로 바뀌어
있었다 ⑤ `fetch` 몽키패치가 다른 세션의 navigation에 씻겨나갔다.

**왜 위험한가**: **검증이 조용히 거짓 결과를 낸다.** 스냅샷을 찍는 시점과 액션 시점 사이에 다른
워크스트림이 페이지를 바꾸면, 자기가 누른 것의 결과가 아닌 화면을 보고 pass/fail을 적게 된다. 이번
회차에는 세 워크스트림 모두 **각 액션 직후 스냅샷을 다시 찍어** 감지·복구했고, 크롤 파이프라인은
`page.route()` + 원자적 단일 스크립트로 우회해 확정적인 결과를 얻었다 — 그래서 산출물은 안전하다.

**Task 025에 특히 걸린다**: 025 DoD는 "검증 시나리오를 **끊지 않고 1회 통과**"를 요구한다. 다른
워크스트림이 같은 브라우저를 건드리면 그 연속성이 성립하지 않는다. **025는 다른 워크스트림이 브라우저를
쓰지 않는 회차에 단독으로 태워야 한다.**

**당장의 회피책**: 각 액션 직후 스냅샷 재확인, 상태 주입은 `page.route()`처럼 navigation을 견디는 방식
사용, 여러 단계를 한 번에 끝내야 하면 원자적 단일 스크립트로 묶기.

### I-030 · 검증 후 `keywords.json` 캐시를 원복하지 않으면 다음 검증의 기준값이 오염된다

- 상태: **해결됨** (13일차 · 크롤 파이프라인이 교차검증 중 발견·복원)
- 발견: 13일차 · 크롤 파이프라인(Task 022B 교차검증 첫 실측)
- 관련 Task: Task 021 · Task 022 · **Task 025**

**증상**: 022B 교차검증 첫 실측에서 run `20260810-204917`의 기준값이 어긋나 있었다 —
`uniqueKeywordCount`가 2412가 아닌 **2411**, `stopwordExcludedCount`가 84가 아닌 **180**, 그리고
"AI"(96회) 행이 랭킹에서 통째로 빠져 있었다. 그런데 `GET /api/stopwords`에는 **사용자 추가 불용어가
하나도 없었다.**

**원인**: 앞선 검증에서 "AI"를 불용어로 추가해 재분석한 뒤 **불용어는 지웠지만 `?force=true` 재분석을
하지 않아** `keywords.json` 캐시에 제외된 상태가 그대로 굳어 있었다. 불용어 목록과 캐시가 어긋난 것이다.

**왜 조용한가**: 화면은 멀쩡하게 렌더된다. 랭킹에 1위가 없다는 것은 그 run의 기준값을 외우고 있는
사람만 알아챈다. 이번엔 리뷰가 기준값(2412/84)을 알고 있어서 잡혔다.

**해결**: `?force=true` 재분석으로 2412/84 복원 확인.

**규칙으로 굳힌다**: **불용어를 건드린 검증은 "불용어 삭제"까지가 아니라 "삭제 + `?force=true` 재분석으로
기준값 복원 확인"까지가 원복이다.** 캐시는 불용어 변경을 자동으로 따라오지 않는다(D-036·Task 021의
캐시 경계 설계상 의도된 동작이다).
