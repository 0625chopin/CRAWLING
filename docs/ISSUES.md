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
