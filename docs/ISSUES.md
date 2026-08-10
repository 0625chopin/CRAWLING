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

- 상태: **해결됨**(18일차 · 크롤 파이프라인, 이슈 처리 회차)
- 발견: 3일차 · 화면(Task 007 교차검증 중)
- 관련 Task: Task 007 · Task 017

값 격리 원칙(`docs/CONVENTIONS.md` §7)은 지켰지만, 사용자가 `data/`를 손으로 편집하다 파일을 깨뜨리면 그 기사·
실행이 목록에서 사라지고 **왜 사라졌는지 알 방법이 없다.** 화면 설계서 02에도 "N건 숨겨짐" 같은 UI가 없어 지금
당장 화면에서 할 일은 없다.

리뷰어 권고는 **화면 변경 없이 서버 콘솔에 `console.warn`으로 손상된 runId/articleId를 남기는 것**이다.
저비용이므로 Task 017 착수 회차에 함께 처리한다.

**해소(18일차, 크롤 파이프라인)**: 리뷰어 권고대로 화면은 건드리지 않고 서버 콘솔 로그만 추가했다.
`lib/keyword/analyze-run.ts`가 이미 쓰고 있던 `[모듈파일명] 설명: 대상` 형식(같은 종류의 개별 실패 격리
로그)을 그대로 따라, `run-repository.ts`의 `listRuns`는
`[run-repository] 손상된 실행을 건너뜁니다: {runId}`를, `article-repository.ts`의 `listArticles`는
`[article-repository] 손상된 기사를 건너뜁니다: {runId}/{articleId}`를 남긴다 — 둘 다 두 번째 인자로
원본 `error`를 그대로 넘겨 콘솔에서 ENOENT·JSON 파싱 실패·스키마 불일치를 구분할 수 있게 했다.

두 `catch` 모두 이전에는 **파싱 실패뿐 아니라 읽기 실패·권한 오류까지 구분 없이 한데 뭉뚱그려 `null`로
삼키고 있었다**(수정 전 `catch { return null }`, 원인 분기가 아예 없었다). 이번에도 원인별로 분기하지는
않는다 — 어느 원인이든 "이 항목 1건은 목록에 못 올리니 건너뛴다"는 같은 처리로 이어지고, 원인 구분은
로그에 남긴 `error` 객체로 충분하다고 판단했다(콘솔을 보는 사람이 필요하면 구분 가능).

두 레포지토리(`run-repository.ts`·`article-repository.ts`) 모두 확인하고 같은 패턴으로 고쳤다. 회귀 케이스:
`run-repository.test.ts`(신규 파일) 3건 · `article-repository.test.ts` 2건. 수정을 되돌려 놓고 4건이
실제로 빨갛게 실패함을 확인한 뒤 원복했다(고친 코드가 없으면 `console.warn`이 호출되지 않아 테스트가
잡아낸다).

**손상 파일 실측(dev 3100)**: `data/runs/20260810-224130/run-meta.json`을 깨뜨리자 `GET /api/runs`
건수가 25→24로, `data/runs/20260810-223041/articles/0005.txt`를 깨뜨리자 `GET
/api/runs/20260810-223041/articles` 건수가 71→70으로 줄었고 각각 단건 조회는 500으로 응답했다.
검증 후 `data-backup/`으로 복원하고 `diff -rq`로 완전 동일함을 확인했다(자세한 절차와 수치는
`docs/DECISIONS.draft.크롤파이프라인.md` 참고).

### I-007 · `ArticleMeta`/`ArticleListItem` 타입이 `lib/types/`가 아니라 `lib/storage/`에 있다

- 상태: 해결됨
- 발견: 3일차 · 화면(Task 007 교차검증 중)
- 관련 Task: Task 007 · Task 017 · Task 018A

`ArticleMeta`는 `articleSchema.omit({ content: true })`로 파생된 도메인 뷰 타입이라 `lib/types/article.ts`가
제자리다. 같은 저장소에 선례도 있다 — `lib/types/keyword.ts`의 `keywordRankItemSchema`가 "화면이 쓰는 파생 뷰"
라는 동일한 성격인데 `lib/types/`에 있다. Task 007 담당(크롤 파이프라인)은 이번 회차에 `lib/types/`가 읽기
전용이라 옮길 수 없었다.

**해소**: 17일차, 이슈 처리 회차에서 재조사한 결과 이미 옮겨져 있었다 — `lib/types/article.ts`가
`articleSchema`·`articleMetaSchema`·`ArticleMeta`·`ArticleListItem`을 전부 소유하고, `lib/storage/`
쪽(`article-repository.ts`·`article-file.ts`)은 전부 `@/lib/types/article`에서 import한다(재export
없음). 전 저장소 검색(`ArticleMeta|ArticleListItem`)으로 `lib/storage/`에 남은 정의나 중복 선언이
없음을 확인했다. 언제 옮겨졌는지는 커밋 이력상 특정할 수 없었지만(1일차 이후 `lib/types/article.ts`가
이미 이 형태), 현재 코드가 이슈가 요구한 최종 상태와 일치하므로 상태만 갱신한다. 후속 작업 없음.

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

- 상태: **해결됨** (16일차 상태 감사에서 확인 — 예고대로 두 라우트가 모두 사라졌다. `app/api/kiwi-check/route.ts`는 Task 023이 삭제했고, `app/api/crawl/route.ts`는 Task 015A가 전면 교체해 지금 남은 `error.message`는 `RunAlreadyRunningError`의 한국어 도메인 메시지다 — 원시 오류가 아니다.)
- 발견: 4일차 · 크롤 파이프라인(Task 008A 교차검증 중)
- 관련 Task: Task 015A · Task 023

`app/api/crawl/route.ts`와 `app/api/kiwi-check/route.ts`에 `error.message`를 응답에 그대로 싣는 코드가
남아 있다. `docs/CONVENTIONS.md` §7("원시 오류를 화면까지 흘리지 않는다")과 어긋나지만, **두 라우트 모두
제거 예정**이다 — `app/api/crawl/route.ts`는 Task 015A가 전면 교체하고 `app/api/kiwi-check/route.ts`는
Task 023이 삭제한다. 새로 고치지 않고 그 Task에서 함께 사라지는 것으로 처리한다.

### I-010 · `docs/screens/04-press-manage.md`의 "추가 설치 필요" 절이 낡았다

- 상태: **해결됨(19일차, 화면 — 이슈 처리 회차)**
- 발견: 4일차 · 화면(009A 착수 준비 중)
- 관련 Task: Task 009A · Task 023

`04-press-manage.md`가 dialog·alert-dialog·switch·label·textarea·toggle-group 6종을 "추가 설치 필요"로
적고 있지만, `docs/screens/README.md`는 이 6종을 포함한 13종이 Task 002에서 설치 완료됐다고 못 박았고
`components/ui/`에 실물이 존재한다. 화면 Task 착수 시 불필요한 설치 요청을 유발할 수 있다.
Task 023(문서 정정)에서 함께 정리한다.

**해소(19일차, 화면)**: 실물부터 확인했다 — `components/ui/*.tsx` 24개 파일을 전수 나열해
`dialog`·`alert-dialog`·`switch`·`label`·`textarea`·`toggle-group` 6종이 전부 존재함을 확인했고,
`docs/screens/README.md` §화면별 사용 shadcn 컴포넌트의 13종 목록·실물 파일 목록·04 문서가 요구하는
컴포넌트가 서로 어긋나지 않음을 대조했다(문서끼리만 비교하지 않음). `04-press-manage.md`의 "추가 설치
필요" 절(설치 명령 + 6종 용도 표)을 지우지 않고 "설치 완료" 목록에 합쳤다 — 목록 자체(컴포넌트별 용도
설명)는 이 화면에서만 쓰는 정보라 남길 값이 있고, `README.md`가 이미 설치 상태의 단일 소스이므로 "추가
설치 필요"라는 상태 표기와 설치 명령만 중복·오류였다.

**다른 문서도 확인**: `docs/screens/` 전체에서 "추가 설치 필요"/"설치 필요" 절을 검색한 결과
`03-hot-keyword.md`(341행, `select`·`toggle-group`·`label`)·`05-stopword-manage.md`(295행,
`label`·`textarea`·`alert-dialog`)에도 같은 낡은 절이 있었다 — **04만의 문제가 아니었다.** 세 컴포넌트
모두 `components/ui/`에 실물이 있어 같은 종류의 결함이다. 이번 회차 범위는 I-010(04 한정)이라 03·05는
고치지 않고 `docs/ISSUES.draft.화면.md`에 새 이슈로 올렸다.

### I-011 · `lib/crawler/rss.ts`의 `toPlainText`가 `&apos;` 같은 일부 HTML 엔티티를 안 걷어낸다

- 상태: 해결됨
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

**16일차 재관찰**: 화면(Task 025) 실크롤 검증에서도 아이뉴스24 RSS로 동일 증상이 그대로 재현됐다 —
`0002.txt` 제목이 `가천대, 국내 첫 &apos;AI반도체설계전문대학원&apos; 설립…10월부터 신입생 모집`으로 저장됨
(위 7일차 예시와 같은 기사 — 피드에 오래 남아있는 기사로 보인다). 새 이슈로 등재하지 않고 기존 판단대로
여기 기록만 남긴다.

**해소(17일차, 크롤 파이프라인)**: **치환 목록 확장이 아니라 원인 재조사 후 다른 방식을 택했다.**
`fast-xml-parser`(이미 `package.json`에 선언된 의존성)로 직접 실험한 결과, **일반 텍스트 노드의
`&apos;`는 파서가 기본값(`processEntities: true`)만으로 이미 디코딩한다** — `htmlEntities` 옵션을
켜지 않아도 그렇다(base `XML` 엔티티 표에 `amp`·`apos`·`gt`·`lt`·`quot` 다섯 개가 항상 포함되기
때문, `node_modules/fast-xml-parser/src/xmlparser/OrderedObjParser.js:91`). 그런데 `rss.ts`는
`cdataPropName: '__cdata'`로 CDATA 구간을 분리해서 받는데, **CDATA 값은 파서가 절대 엔티티로
해석하지 않는다** — XML 스펙상 CDATA는 리터럴이고, 라이브러리 소스로도 확인했다
(`OrderedObjParser.js:391-400`이 CDATA 값을 `parseTextData`(엔티티 디코딩 경로)를 거치지 않은
원본 `tagExp` 그대로 저장한다). 실제 아이뉴스24 피드는 `<title>`을 CDATA로 감싸 보내므로,
`htmlEntities: true` 같은 파서 옵션을 켜는 것으로는 이 버그가 전혀 고쳐지지 않는다는 것을
`node`로 직접 재현해 확인했다 — **그래서 파서 옵션이 아니라 `toPlainText`(CDATA 추출 이후 단계)를
고쳤다.**

`&nbsp;`·`&lt;`·`&gt;`·`&quot;`·`&apos;` 다섯 개는 이름 있는 엔티티 표(`NAMED_ENTITIES`)에 최소로
남기고, `&amp;`는 다른 엔티티가 되살린 `&`까지 다시 걸리지 않도록 항상 마지막에 처리한다.
**숫자 참조(`&#39;`·`&#8216;`·`&#8217;` 등)는 개별 치환이 아니라 십진·16진 두 정규식으로 코드
포인트 전체를 일반화해 잡는다** — "스마트 따옴표 다음엔 또 다른 코드가 나올 것"이라는 우려를
치환 목록을 계속 늘리는 대신 규칙 하나로 닫았다. `String.fromCodePoint`가 범위 밖 코드에 던지는
경우는 `isValidCodePoint`로 걸러 원문을 그대로 남긴다(기사 1건이 무너지지 않도록 값으로 격리,
docs/CONVENTIONS.md §7). **새 의존성은 추가하지 않았다** — `fast-xml-parser`가 내부적으로 쓰는
전체 이름 엔티티 표(`@nodable/entities`)는 `package.json`에 선언되지 않은 전이 의존성이라
직접 import하지 않았다(nanoid와 같은 이유, docs/CONVENTIONS.md §3).

- 회귀: `lib/crawler/rss.test.ts`에 실제 관측된 그 제목 문자열(`가천대, 국내 첫 &apos;...`)을 그대로
  케이스로 추가했다 — CDATA로 감싼 title에 `&apos;`, description에 목록에 없는 숫자 참조
  (`&#8216;`·`&#8217;`·`&#39;`)를 섞어 넣고 전부 걷어지는지 확인한다. **화면(교차검증)이 치환 순서
  함정을 지적**해 `&amp;apos;`·`&amp;#39;`·`&amp;amp;amp;`처럼 이중 이스케이프된 입력이 한 번만
  풀리고(`&apos;`·`&#39;`·`&amp;amp;` 리터럴로 남음) 따옴표로 잘못 재해석되지 않는지 확인하는
  케이스도 추가했다 — `&amp;`를 먼저 풀면 그 결과로 생긴 `&apos;`가 다음 단계에서 다시 걸려 원문에
  없던 따옴표가 생기는데, `decodeHtmlEntities`가 `&amp;`를 항상 마지막에 처리해 막는다. 145 →
  196건(vitest 전체 스위트, 이번 회차 다른 작업 포함).
- **실측(17일차, dev 3100, `POST /api/crawl` → `pressIds: ["inews24"]`)**: 실제로 아이뉴스24 RSS를
  다시 태워 10건을 수집했다. 저장된 `data/runs/20260811-030553/articles/*.txt` 중 두 번 재현된
  바로 그 기사(`가천대, 국내 첫 'AI반도체설계전문대학원' 설립…10월부터 신입생 모집`)를 포함해
  전 기사 제목·요약에 `&[a-zA-Z#][a-zA-Z0-9]*;` 패턴이 하나도 남지 않음을 `grep`으로 확인했다.
  검증에 쓴 run은 확인 후 지우고 `diff -rq`로 `data/`가 검증 이전 상태와 완전히 같음을 확인했다.

### I-012 · `docs/screens/04-press-manage.md`가 구체 스펙 없이 "시각적 주의"를 요구한다

- 상태: **해결됨(19일차, 화면 — 이슈 처리 회차, 팀장 판정대로 제안 (b) 채택)**
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

**해소(19일차, 화면)**: 팀장이 이미 내린 판정(제안 b 채택)대로 `04-press-manage.md` §③-C 소스 테스트
결과의 "…이때 본문 전문 수집 스위치에 시각적 주의를 준다" 문장만 걷어냈다. 바로 앞 문장("200자 미만이면
… 권장합니다로 바뀐다")과 200자 기준 자체는 그대로 남겨 DoD가 요구하는 권장 문구 규칙이 사라지지
않게 했다. 걷어낸 자리에 "왜 걷어냈는지"를 한 문단으로 남겼다(팀장 판정 근거 1·3을 그대로 옮김 —
스위치 이름을 이미 권장 문구가 부르고 있어 강조가 새 정보를 주지 않는다는 점, 색만 바꾸는 강조는
`docs/CONVENTIONS.md` §8 WCAG 1.4.1과 충돌한다는 점). 텍스트를 병기하면서 실제로 새 정보를 주는
구체 스펙은 찾지 못했다 — 반론 없음.

### I-013 · `docs/screens/01-crawl-run.md`의 `ScrollArea` 반응형 높이가 문서 안에서 서로 어긋난다

- 상태: **해결됨(19일차, 화면 — 이슈 처리 회차)**
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

**재확인(17일차, 저장소 계층 — 상태 감사)**: 여전히 열림이 맞다. **문서(`docs/screens/01-crawl-run.md:486`)의
스켈레톤은 지금도 `h-[420px] pr-3 sm:h-[420px]`로 어긋나 있다** — 아무도 고치지 않았다. 다만 **실제
구현(`components/crawl/press-select-card.tsx:124`)은 이미 올바르게
`h-[320px] pr-3 sm:h-[420px]`를 쓰고 있다** — 016A 담당이 스켈레톤을 그대로 베끼지 않고 §스크롤
처리 결정(37행)·명세 표(140행) 쪽을 따른 것으로 보인다. 그래서 이 이슈가 우려했던 실제 반응형 버그는
**일어나지 않았다.**

**그래도 닫지 않는 이유**: I-024·I-026은 스켈레톤 옆에 "이 값을 그대로 베끼지 말라"는 경고 문단을
붙여서 닫았다(다음 사람이 실수를 반복하지 않을 보호장치가 생긴 것). 이 이슈는 **그 경고가 없다** —
스켈레톤이 조용히 틀린 채로 남아 있어서, 이 화면을 나중에 다시 만들거나 다른 화면이 같은 패턴을
베낄 때 같은 함정에 빠질 위험이 그대로 있다. 코드 위험은 사라졌지만 **문서 위험은 그대로다.**

**해소(19일차, 화면)**: `01-crawl-run.md:486`의 스켈레톤을 `h-[320px] pr-3 sm:h-[420px]`로 고쳐
§스크롤 처리 결정(37행)·§영역별 컴포넌트 명세(140행)와 일치시켰다(값 자체는 두 곳 다 이미 맞았으므로
건드리지 않았다). I-024·I-026의 형식을 그대로 따라 파일 분할 경계 표 바로 아래·스켈레톤 코드 시작
바로 위에 `### ⚠️ 아래 스켈레톤의 ScrollArea 반응형 높이는 세 곳 모두와 함께 고친다 (I-013)` 경고
문단을 새로 붙였다. 다만 이 이슈는 I-024·I-026과 성격이 다르다 — 그쪽은 스켈레톤 본문을 고치지
않고 "베끼지 말라"고만 경고했지만(수정을 Task 023으로 미룸), 이 회차는 문서만 고치는 회차라 스켈레톤
값 자체를 바로 정정했다. 그래서 경고 문구도 "베끼지 말라"가 아니라 "다시 바꿀 때 37행·140행·스켈레톤
세 곳을 함께 고치라"는 재발 방지 문구로 썼다 — 지금은 세 곳이 일치하므로 베끼지 말라고 할 대상이
없기 때문이다. `docs/screens/` 전체에서 `sm:h-[`·`md:h-[`·`lg:h-[`를 다시 검색해 이 한 곳뿐임을
재확인했다(`verification-checklist.draft.md`에만 이 이슈를 설명하는 산문 인용이 있고, 실제 TSX
스켈레톤에는 없다).

### I-014 · `CrawlRun`이 대상 언론사 이름을 스냅샷하지 않아 삭제된 언론사의 이름을 복구할 수 없다

- 상태: 해결됨
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

**해소(17일차, 저장소 계층 — 상태 감사)**: Task 017(10일차)이 이미 판단대로 반영해 뒀다.
`app/api/runs/[runId]/route.ts`가 `listPress()`를 한 번 불러 만든 `Map`으로 대상 언론사를 조회해
`press ? { id, name: press.name, deleted: false } : { id, name: null, deleted: true }`를 내려준다.
화면(`components/results/run-summary-card.tsx`)도 `press.deleted`면 `Badge variant="outline"` +
고정 문구 "삭제된 언론사"로 렌더한다(D-027). API·화면 양쪽 다 확인했고 `docs/ISSUES.md` 상태 표기만
실물과 어긋나 있었다. 후속 작업 없음.

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

- 상태: **해결됨** (14일차 · Task 023이 `lib/crawler/run.ts`를 통째로 삭제했다)
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

- 상태: **해결됨**(18일차, 저장소 계층) — `readArticle`은 타입으로 갈리고, 소비하던 라우트의
  D-032 `fs.access` 우회도 걷어냈다.
- 발견: 10일차 · 저장소 계층(Task 017 구현 중)
- 관련 Task: Task 007(발생지, 범위 밖이라 직접 고치지 않음) · Task 017(회피 구현 → 18일차에 걷어냄)

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

**해소(18일차, 크롤 파이프라인 — 부분)**: 제안대로 `lib/storage/article-repository.ts`에
`ArticleNotFoundError`를 추가했다(`RunNotFoundError`와 같은 형태 — `Error` 상속, 생성자
`(runId, articleId)`, `name = 'ArticleNotFoundError'`). `readArticle`의 ENOENT 분기가 이제 이 타입으로
던진다.

**"손상" 쪽에는 전용 타입을 두지 않기로 판단했다.** `withErrorBoundary`(`lib/api/response.ts`)가 이미
모든 미분류 예외를 `console.error`로 콘솔에 남기고 500 + 정형화된 한국어 메시지로 응답하므로, 손상이
익명 `Error`로 남아도 조용히 삼켜지지 않는다(`docs/CONVENTIONS.md` §7 충족). 라우트가 필요한 판정은
"없음(404) vs 그 외 전부(500)" 하나뿐이라 지금 시점에는 세분화된 타입의 소비처가 없다 — 근거는
`docs/DECISIONS.draft.크롤파이프라인.md`에 자세히 남겼다.

**완전 해소(18일차, 저장소 계층)**: `app/api/runs/[runId]/articles/[articleId]/route.ts`에서
D-032의 `fs.access` 사전 확인과 그 위의 별도 `try/catch`를 통째로 지우고, `getRun` 이후 바로
`readArticle`을 부르도록 바꿨다. `readArticle`의 `catch`는 `UnsafePathSegmentError` → 400을 가장
먼저 가려낸 뒤(I-021·D-045, `articlePath`가 `readArticle` 내부에서 다시 조립되므로 여기서도 나올
수 있다), `ArticleNotFoundError` → 404(`존재하지 않는 기사입니다`), 그 외는 그대로 던져
`withErrorBoundary`가 500으로 받는다 — `docs/DECISIONS.draft.크롤파이프라인.md`의 제안 코드
그대로다.

**실측(18일차, dev 3100)**: `GET /api/runs/20260810-224130/articles/%2e%2e%2f%2e%2e%2fetc` → 400
`articleId 형식이 올바르지 않습니다`. `GET /api/runs/20260810-224130/articles/9999`(정상 형식·없는
기사) → 404 `존재하지 않는 기사입니다`. `data/runs/20260810-224130/articles/0002.txt`의 메타
구분줄을 깨뜨린 뒤 `GET .../articles/0002` → 500 `기사 본문을 불러오지 못했습니다`(목록 조회
건수도 10 → 9로 값 격리됨을 재확인). `GET .../articles/0001`(정상) → 200 + 본문 그대로. 검증 전
`data-backup/`이 없음을 먼저 확인하고 `press-sources.json`·`stopwords.json`·`runs/`만 백업한 뒤,
복원 후 `diff -rq data-backup/runs data/runs`·`diff data-backup/press-sources.json
data/press-sources.json`·`diff data-backup/stopwords.json data/stopwords.json` 전부 출력 없음(완전
동일)으로 확인하고 `data-backup/`을 지웠다. `keywords.json` 캐시를 건드리는 요청은 부르지 않아
`?force=true` 재조회는 필요 없었다.

`fs.access` 제거는 실제 이득이었다 — 파일 시스템 호출이 매 요청 1회 줄었을 뿐 아니라, 걷어내기
전에는 `try/catch` 블록이 두 겹(존재 확인용 · 본문 읽기용)이었는데 지금은 `readArticle` 하나를
감싸는 한 겹으로 줄어 판정 로직이 더 단순해졌다. 다른 라우트(`app/api/runs/[runId]/articles/route.ts`
등)를 확인한 결과 `fs.access` 우회는 이 라우트 한 곳에만 있었다.

### I-021 · `assertSafeSegment`가 일반 `Error`를 던져 경로 순회 시도가 라우트마다 다른 상태 코드로 응답한다

- 상태: 해결됨
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

**해소(17일차, 저장소 계층 — 부분)**: `lib/storage/paths.ts`에 `UnsafePathSegmentError`(제안대로
`Error`를 상속하고 `name = 'UnsafePathSegmentError'`)를 추가하고 `assertSafeSegment`가 이 타입으로
던지도록 바꿨다. **이 영역 소유 라우트 4개를 전부 매핑했다** — `app/api/runs/[runId]/route.ts` ·
`app/api/runs/[runId]/articles/route.ts` · `app/api/runs/[runId]/articles/[articleId]/route.ts`
(D-032의 `fs.access` catch도 `UnsafePathSegmentError`를 먼저 가려내도록 고쳤다 — 이전에는 이 타입까지
뭉뚱그려 404를 냈다) · `app/api/runs/[runId]/keywords/route.ts`. 전부 `fail(error.message, 400)`으로
응답한다.

**메시지 문구 판단**: 사용자에게 `"${label}에 허용되지 않는 문자가 포함되어 있습니다: \"${segment}\""`처럼
입력값을 그대로 반사하지 않기로 했다 — 경로 순회를 시도한 원본 문자열이 그대로 응답 본문에 되돌아오는
모양을 피했다(로컬 단일 사용자 도구라 보안 위험이 크진 않지만, D-032가 이미 같은 상황에서 "존재하지
않는 기사입니다"라는 일반화된 문구를 쓰고 있어 그 관례를 따른 것이기도 하다). 최종 문구는
`"${label} 형식이 올바르지 않습니다"`(예: `"runId 형식이 올바르지 않습니다"`)이고, 원본 `segment`는
디버깅용으로 에러 객체 속성에만 남긴다.

**실측(17일차, dev 3100)**: `GET /api/runs/%2e%2e%2f%2e%2e%2fetc` → 400(이전 500). 존재하는 runId
아래 `GET /api/runs/{runId}/articles/%2e%2e%2f%2e%2e%2fetc` → 400(이전 404, D-032 우회가 삼키던 값).
같은 runId의 진짜 없는 articleId(`9999`)는 여전히 404를 낸다 — 순회 시도와 단순 미존재가 이제
정확히 갈린다.

**남은 일 — 다른 영역**: `app/api/crawl/[runId]/*`(크롤 파이프라인 소유)는 손대지 않았다. 같은 입력을
`GET /api/crawl/%2e%2e%2f%2e%2e%2fetc`로 실측하면 여전히 500이다. 크롤 파이프라인이 같은
`UnsafePathSegmentError`를 `@/lib/storage/paths`에서 import해 동일하게 매핑하면 된다 — 계약은
`docs/DECISIONS.draft.저장소계층.md`에 남겼다. **이 라우트가 남아 있으므로 이슈를 완전히 닫지 않는다.**

**해소(17일차, 크롤 파이프라인)**: 저장소 계층이 남긴 계약(`docs/DECISIONS.draft.저장소계층.md`)의
매핑 코드 형태를 그대로 따라 `app/api/crawl/[runId]/route.ts`(GET, 진행 상태 조회)와
`app/api/crawl/[runId]/abort/route.ts`(POST, 중단)에 `UnsafePathSegmentError` → `fail(error.message, 400)`
분기를 추가했다. 새 타입을 만들지 않고 `@/lib/storage/paths`에서 그대로 import했다 — 기존
`RunNotFoundError`(→404)·`RunNotAbortableError`(→409, abort 라우트만) 판정 뒤에 두었지만 서로
겹치지 않는 타입이라 순서는 무관하다(계약에 명시된 대로).

**실측(17일차, dev 3100)**:

- `GET /api/crawl/%2e%2e%2f%2e%2e%2fetc` → **400** `{"ok":false,"message":"runId 형식이 올바르지 않습니다"}`(이전 500)
- `POST /api/crawl/%2e%2e%2f%2e%2e%2fetc/abort` → **400** `{"ok":false,"message":"runId 형식이 올바르지 않습니다"}`(이전 500)
- `GET /api/runs/%2e%2e%2f%2e%2e%2fetc` → **400**(저장소 계층 분, 회귀 없음 재확인)
- 존재하는 runId 아래 진짜 없는 articleId(`9999`) → 여전히 **404** `"존재하지 않는 기사입니다"`
- 같은 runId 아래 articleId에 경로 순회 → **400** `"articleId 형식이 올바르지 않습니다"`(400/404 분리 재확인)

**이제 두 영역의 `runId`·`articleId` 경로 세그먼트를 받는 라우트 전부가 경로 순회 입력에 일관되게
400을 낸다. 이슈를 닫는다.**

### I-022 · 서버 재시작 후 복구된 진행 상태는 언론사 전체 실패를 표현할 수 없다

- 상태: 해결됨 (20일차) — `CrawlRun.pressResults` 신설(저장소 계층 계약, `D-draft` 참고) +
  `finishRun`이 채움 + `recoverRunProgress`가 있으면 그대로 씀(근사 폴백은 과거 형식/도중 강제종료
  run에만 남음). 상세는 `docs/DECISIONS.draft.크롤파이프라인.md`
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

- 상태: 해결됨
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

**해소**: 12일차, 018B 회차에 제안대로 반영돼 있었다(17일차 재검증에서 확인). `lib/api/run-format.ts`가
`formatLocalTimeOnly(iso)`를 정식 함수로 내보내고(`Date`에서 시:분을 직접 조립 — 다른 함수의 출력
문자열을 자르지 않는다), `components/results/run-summary-card.tsx`는 지역 함수 `toTimeOnly`·
`slice(11, 16)` 없이 이 함수를 바로 import해서 쓴다. `lib/api/run-format.test.ts`에 회귀 케이스도
이미 있다 — `formatLocalTimeOnly` 자체 검증 2건과, "`formatLocalDateTimeSecond`의 출력이
`formatLocalTime`의 결과로 끝난다"는 교차 확인 1건(출력 폭이 바뀌면 이 테스트가 먼저 깨진다). 남은
일 없음.

### I-026 · 설계서 03 스켈레톤의 `RunOption`이 Task 017이 확정한 `RunListItem`을 다시 더미로 선언한다

- 상태: 해결됨(설계서에 경고 반영 · 실 구현 확인됨) · 스켈레톤 본문 정정은 남음
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

**해소**: 14일차, Task 023(설계 문서 정정, 커밋 `d4246e4`)이 I-024와 같은 방식으로 처리했다 —
스켈레톤 앞에 "⚠️ 아래 스켈레톤의 `RunOption` 선언을 그대로 베끼지 않는다" 경고 문단을 추가했다
(`docs/screens/03-hot-keyword.md:395-405`). **17일차 상태 감사에서 실 구현도 재확인했다**:
`components/keywords/analysis-filter-bar.tsx`·`app/keywords/page.tsx` 둘 다 `RunOption`을 새로
선언하지 않고 `@/lib/api/run-client`의 `RunListItem`을 그대로 import한다 — 이 이슈가 우려한 실제
버그(더미 타입이 실 코드에 스며드는 것)는 일어나지 않았다. **남은 것**: 스켈레톤 코드 블록 자체
(`RunOption` 선언·`MOCK_RUNS: RunOption[]`)는 여전히 옛 모양 그대로다 — 경고 문단이 붙어 있어 I-013과
달리 다음 사람이 그대로 베낄 위험은 낮다고 판단해 해결됨으로 닫는다.

### I-027 · Task 022 DoD ② "절반 가까이 줄어든다" 문구가 실데이터와 어긋난다

- 상태: **해결됨** (14일차 · 팀장이 `docs/ROADMAP.md` Task 022 DoD ②와 §검증 시나리오 4-3의 문구를 정정했다 · **코드 결함 아님**)
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

- 상태: 보류 (회차 운영 상수 — 코드로 고칠 대상이 아니라 매 회차 우회 절차로 대응한다. "열림"으로
  두면 미처리 작업처럼 보여 17일차 상태 감사에서 재분류했다)
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

### I-031 · `kiwi-check` 삭제로 `userWords` 결합을 태워 확인할 수단이 사라졌다

- 상태: 보류 (**삭제를 막지 않는다** · Q1이 다시 열릴 때까지 지금은 할 일이 없다 — 17일차 상태
  감사에서 "열림"이 미처리 작업으로 오독될 여지가 있어 재분류했다. 재조사 결과 `lib/keyword/kiwi.ts`가
  여전히 `userWords: []`로 고정돼 있어 본문 내용 자체는 그대로 유효하다)
- 발견: 14일차 · 저장소 계층(Task 023 삭제 범위 독립 검증) → 크롤 파이프라인(등재)
- 관련 Task: Task 023(삭제 실행) · Task 019(`kiwi.ts`) · 관련 결정: **Q1**(사용자 사전 도입 여부)

**증상**: 삭제된 `app/api/kiwi-check/route.ts`는 `userWords`에 `오픈AI`·`온디바이스`·`데이터센터` 3종을
넣고 `build()`한 뒤 tokenize 결과에서 실제로 **한 토큰(`NNP`)으로 합쳐지는지** 확인하던 유일한 수단이었다.
정식 구현인 `lib/keyword/kiwi.ts:94`의 `buildKiwi()`는 Q1 결정대로 `userWords: []`로 비워 두므로, 삭제
시점에 이 경로를 대체하는 코드가 없다.

**그래도 지금 지우는 것이 맞다**: 현재 `lib/keyword/`가 `userWords`를 전혀 쓰지 않으므로(빈 배열 고정)
**검증할 대상 자체가 없다.** 기능 손실이 아니라 훗날 쓸 진단 도구가 사라지는 것이다. 모델 경로 확인·
`build()` 성공 여부·`MATCH_OPTIONS`는 `lib/keyword/kiwi.ts`가 전부 대체한다(저장소 계층이 대조 확인).

**핵심은 비대칭이다** — **자리는 열려 있는데 확인 수단만 없어진다.** Q1은 "Task 019에서 `build()`의
`userWords` 인자 자리를 열어두고 빈 배열을 넘긴다. 나중에 도입할 때 바뀌는 파일이 `lib/keyword/kiwi.ts`
하나로 제한된다"고 적어 뒀다. 자리는 설계상 확보돼 있으나 그 자리를 채운 뒤 **결과가 맞는지 태워 볼
경로**가 없다.

**Q1이 다시 열리면 필요한 것**: ① 모델 경로(`data/kiwi-model/` 9파일)가 실제로 읽히는지 ②
`build({ modelFiles, userWords })`가 성공하는지 ③ `userWords`에 넣은 고유명사가 tokenize 결과에서 한
토큰(`NNP`)으로 합쳐지는지. 이 세 단계를 태우는 임시 진단 경로를 다시 만들어야 한다.

**참고**: `docs/kiwi-verification.md` §4 §7 · `docs/ROADMAP.md` §결정 필요 사항 Q1 · `lib/keyword/kiwi.ts:94`.

### I-032 · `CRAWL_PRESS_CONCURRENCY`가 `.env.example`에서 빠져 있다

- 상태: 해결됨
- 발견: 14일차 · 화면(024 사전 조사 · 환경변수 전수 대조)
- 관련 Task: **Task 024**(반영) · Task 014A(7일차 도입) · 관련 결정: **D-015**

**증상**: `lib/crawler/config.ts:18`이 `readInt(process.env.CRAWL_PRESS_CONCURRENCY, 3)`으로 읽는 변수인데
`.env.example`에 **이름 자체가 없다.** D-015(7일차)가 언론사 레벨 동시성 상한으로 `pressConcurrency`를
`crawlerConfig`에 추가하면서 `.env.example` 반영이 누락됐다.

**왜 조용한가**: `readInt`가 실패하면 조용히 기본값 3으로 폴백하므로 **화면은 완벽하게 멀쩡하다.**
사용자는 이 변수를 조정하고 싶어도 `.env.example`을 봐서는 존재를 알 수 없다.

**구조적으로 더 나쁜 점**: `README.md`와 `docs/ROADMAP.md` §개발 환경 준비는 개별 변수를 나열하지 않고
**"`.env.example`을 보라"고 가리키기만 한다.** 그래서 `.env.example`에 이름이 없으면 **그 가리킴 자체가
이 변수에 대해서만 거짓이 된다** — 세 문서를 아무리 대조해도 잡히지 않는 종류의 누락이다.

**전수 조사 결과**: `process.env`를 읽는 파일은 `lib/crawler/config.ts` **단 하나**다. `lib/keyword/kiwi.ts`는
환경변수를 전혀 읽지 않고 모델 경로가 하드코딩이다(설계 의도). 나머지 6개(`CRAWL_CONCURRENCY`·
`CRAWL_TIMEOUT_MS`·`CRAWL_DELAY_MS`·`CRAWL_USER_AGENT`·`PLAYWRIGHT_CHANNEL`·`PLAYWRIGHT_HEADLESS`)는
이름·기본값이 `.env.example`과 전부 일치한다. **어긋나는 것은 이 하나뿐이다.**

**해소**: 15일차, 화면(Task 024). `.env.example`의 `CRAWL_CONCURRENCY` 항목 바로 아래에
`CRAWL_PRESS_CONCURRENCY=3`과 주석 3줄을 추가했다 — 주석은 `config.ts:12`의 실제 설명(언론사 1곳당
동시 페이지 수가 아니라 실행 안에서 동시에 크롤할 언론사 수 상한이며, 이 프로세스가 여는 Playwright
페이지 총량을 로컬 리소스 보호 차원에서 제한한다는 것)을 그대로 옮겼다. `README.md`·`docs/ROADMAP.md`
§개발 환경 준비는 개별 변수를 나열하지 않고 `.env.example`을 가리키기만 하는 서술이라 추가로 고칠
문장이 없다(고치면 오히려 그 두 문서가 지키던 "개별 나열 없음" 서술 방식을 깨게 된다).

**해소안**: `.env.example`의 `CRAWL_CONCURRENCY` 바로 아래에 주석 한 줄과 `CRAWL_PRESS_CONCURRENCY=3`을
추가한다. 근거와 대조표는 `docs/env-audit.draft.md`에 있다.

### I-033 · 025의 `data/` 복원 검증이 파일 수준이 아니라 화면 관찰로 끝난다

- 상태: **해결됨** (16일차 · 025 본검증과 재검증 모두 복원 뒤 `diff -rq` 3건 exit 0으로 판정했고, 교차검증이 `keywords.json` 캐시 값까지 독립 확인했다)
- 발견: 15일차 · 저장소 계층(유휴 배정 · 025 사전 확인)
- 관련 Task: **Task 025** · 관련 이슈: **I-030**

**증상**: `docs/screens/verification-checklist.draft.md`의 `data/` 백업·복원 절차는 마지막 단계에서
`/results`·`/press`·`/stopwords` 화면의 **개수와 목록이 이전과 같아 보이는지를 육안으로** 확인하는 것으로
복원 성공을 판정한다.

**왜 부족한가**: 이 절차는 `press-sources.json`·`stopwords.json`·`runs/**`(각 run의 `run-meta.json` ·
`articles/*.txt` · `keywords.json` 포함)를 통째로 되돌리므로 **파일 시스템 수준에서 바이트 단위로 같아야
정상**이다. 그런데 검증은 화면 요약 수치만 본다. **I-030이 정확히 이 틈에서 나왔다** — `keywords.json`
캐시에서 1위 키워드가 통째로 빠져 있는데도 화면은 완벽하게 멀쩡했고, 그 run의 기준값을 외우고 있던
리뷰만 알아챘다. "실행이 22건으로 돌아왔다"는 확인은 `summary` 수치나 `items` 내용까지 원래대로인지를
말해 주지 않는다.

**해소안**: 복원 직후에 파일 수준 diff를 판정 기준으로 넣는다.
```bash
diff -rq data-backup/runs data/runs
diff data-backup/press-sources.json data/press-sources.json
diff data-backup/stopwords.json data/stopwords.json
```
`kiwi-model/`은 애초에 백업·삭제 대상이 아니라 자연히 제외된다.

### I-034 · 백업 절차가 `data-backup/`이 이미 있는 상태를 가정하지 않아 원본이 영구 소실될 수 있다

- 상태: **해결됨** (16일차 · 025가 본검증·재검증 두 번 모두 `data-backup/` 부재 확인부터 시작했다)
- 발견: 15일차 · 저장소 계층(유휴 배정 · 025 사전 확인)
- 관련 Task: **Task 025**

**증상**: 백업 절차 1단계는 `mkdir -p data-backup` 뒤 곧바로 `cp`로 덮어쓴다.

**시나리오**: 이전 025 시도가 3단계(시나리오 수행) 도중 실패해 복원 단계를 못 밟으면 `data-backup/`에
**그 시도의 백업이 남는다.** 이 상태에서 절차를 처음부터 다시 돌리면 새 백업이 옛 백업을 덮어쓰는데,
그 시점의 `data/`는 이미 초기화됐거나 이전 시도가 만든 데이터가 섞인 상태일 수 있다. **덮어쓰는 방향에
따라 진짜 원본이 영구히 사라진다.**

**왜 실제로 일어날 수 있는가**: 025는 "검증 시나리오를 끊지 않고 1회 통과"가 DoD라 **중간 실패가 설계상
예상된 경로**다. ROADMAP도 "중간에 실패하면 원인 Task를 다시 열고 고친 뒤 처음부터 다시 태운다"고 적어
뒀다 — 즉 재시도가 정상 흐름이고, 그때마다 이 위험을 지난다.

**해소안**: 1단계 앞에 가드를 둔다.
```bash
[ -d data-backup ] && { echo "이전 백업이 남아 있습니다 — 복원부터 완료하세요"; exit 1; }
```

### I-035 · 025 크롤 구간에 "일부러 실패를 만드는 방법"이 없다 — 실측 절차를 확보했다

- 상태: **해결됨** (15일차 · 크롤 파이프라인이 절차를 만들고 실측까지 마쳤다)
- 발견: 15일차 · 크롤 파이프라인(유휴 배정 · 025 직전 점검)
- 관련 Task: **Task 025** · Task 016B(실패 사유 문구)

**증상**: Task 025 DoD는 "검증 시나리오 1~5단계 + **분기 A·B**가 모두 통과한다"를 요구하는데,
체크리스트의 크롤 구간은 "셀렉터를 일부러 틀리거나 존재하지 않는 피드 URL로 재현 가능"이라는 **원리만**
적어 뒀다. 현재 등록된 언론사 4곳은 전부 정상 동작하므로, **025 담당이 그 자리에서 실패 조건을 즉흥으로
고안해야 했다.**

**확보한 절차(15일차에 실제로 수행하고 원복까지 마쳤다)**:
1. `/press` → `[언론사 추가]` → RSS 피드 방식 · 피드 URL에 **존재하지 않는 도메인**을 넣고 저장한다.
   피드 URL 검증은 형식만 보고 도메인 존재 여부를 확인하지 않아 저장이 통과한다.
2. `/`에서 **정상 언론사 1곳 + 실패 언론사**를 함께 선택해 실행하면 `partial-failed`가, **실패 언론사만**
   돌리면 `failed`가 재현된다(분기 목적에 맞게 택1).
3. **실측 결과**: "크롤링 완료 (일부 실패)" 헤딩 + destructive `Alert`("테스트실패언론사(피드 응답 없음)") +
   언론사별 상태 목록의 "실패 (피드 응답 없음)"이 정확히 렌더됐고 `run-meta.json`의 `failCount: 1`도 맞았다.
4. **확인 후 임시 언론사를 반드시 삭제해 원복한다.** `data/press-sources.json`이 등록 전과 diff 0임을 확인했다.
5. **HTML 방식 실패**(존재하지 않는 셀렉터)는 수집 방식을 목록 페이지로 바꾸고 `articleLinkSelector`에
   실제 페이지에 없는 셀렉터를 넣으면 된다. 이때 실패 사유 문구는 RSS와 달리 `타임아웃`/`셀렉터 불일치`가
   나와야 한다(Task 016B 구현 규칙). **이 경로는 절차만 확보했고 실측은 025 회차 몫이다.**

**시간 예산**: 존재하지 않는 도메인의 DNS 실패 판정까지 **약 20초**가 걸렸다. 025가 "끊지 않고 1회 통과"를
목표로 시간을 짤 때 실패 경로 재현에 이만큼이 추가로 든다.

### I-036 · 공유 브라우저의 콘솔 이력을 `all:true`로 읽으면 남의 과거 에러를 자기 실패로 센다

- 상태: **해결됨** (16일차 · 025가 `all:true` 없이 마지막 네비게이션 기준으로 판정해 전 구간 0건을 확인했다)
- 발견: 15일차 · 크롤 파이프라인(유휴 배정 · 025 직전 점검)
- 관련 Task: **Task 025** · 관련 이슈: **I-029**(브라우저 공유) · **I-028**(포트 혼선)

**증상**: `browser_console_messages`를 `all: true`로 읽었더니 **14일차 Task 023이 `run.ts`를 지우고
`index.ts`를 고치는 사이의 과도기 에러**("Module not found: Can't resolve './run'")와 **13일차 포트
혼선(I-028) 때의 404들**이 그대로 쌓여 있었다. 브라우저가 워크스트림 간에 공유되므로(I-029) 세션이
끊기지 않는 한 이력이 계속 누적된다.

**왜 위험한가**: Task 025 DoD는 "브라우저 콘솔에 에러가 없다(`browser_console_messages`)"다. 025가
`all: true`를 붙이거나 기본 동작을 오해하면 **지금 코드와 무관한 과거 에러 때문에 자기 시나리오가
DoD를 통과하지 못했다고 오판**한다. 반대 방향의 오판도 가능하다 — 과거 에러에 익숙해져 진짜 새 에러를
흘려보낼 수 있다.

**이번 회차의 실제 상태**: `all: true` 없이 **마지막 네비게이션 기준**으로 읽으면 크롤 3회·결과 조회·
키워드 분석 전 구간이 **에러 0건**이었다. 지금 코드 경로는 깨끗하다.

**해소안**: 025 실행 조건에 "콘솔 확인은 `all: true`를 쓰지 않고 **마지막 네비게이션 기준**으로 판정한다"를
못 박는다. 필요하면 주요 단계 직후 페이지 전환으로 콘솔 버퍼가 자연히 새로 시작하게 한다.

### I-037 · `press-defaults.ts`는 "기본 언론사 시드"가 아니라 의도적으로 빈 배열이다

- 상태: 기각 (**조사 결과 결함이 아니었다 · 오해 재발 방지용 기록으로 남긴다.** 17일차 상태 감사에서
  "열림"이 미처리 작업으로 오독될 여지가 있어 재분류했다 — 이 이슈는 애초에 고칠 코드가 없다)
- 발견: 15일차 · 저장소 계층(유휴 배정 · 025 사전 확인)
- 관련 Task: Task 006 · Task 009 · **Task 025**

**확인 결과**: `lib/storage/press-defaults.ts:10`의 `DEFAULT_PRESS_SOURCES`는 **빈 배열**이다. 불용어
(`stopword-defaults.ts`, 7건)처럼 실제로 깔리는 프리셋이 있는 것이 아니라, **"언론사는 0건에서 시작한다"는
Task 009 빈 상태 화면의 전제를 그대로 코드화한 것**이다(주석에 명시).

**왜 기록하는가**: 15일차 배정문이 "기본 언론사 시드가 완전 초기 상태에서 깔리는가"를 확인하라고 적었는데
**전제 자체가 틀렸다.** 같은 표현이 다음 회차에도 나오면 "시드가 하나도 안 깔린다"는 헛다리 이슈로
재발한다. **완전 초기 상태에서 언론사가 0건인 것은 정상이고, 그것이 025가 확인해야 할 빈 상태 화면의
출발점이다.**

**함께 확정된 초기화 동작**(같은 배정에서 임시 디렉터리 실측으로 확인):
- `readJson`은 **파일 부재와 디렉터리 부재를 모두 `ENOENT`로 받아** 같은 fallback 경로를 탄다.
  `data/`가 통째로 없어도 별도 예외가 나지 않는다.
- `atomicWriteFile`(`lib/storage/json-store.ts:25`)이 임시 파일을 쓰기 전에 `ensureDir`로
  `fs.mkdir(recursive: true)`를 부른다 — **`mkdir -p`에 해당하는 처리가 이미 있다.**
- 기본 불용어 7건은 **명시적 부트스트랩 없이 지연 생성**된다. `listStopwords`/`getStopwordSet`/`addStopword`가
  처음 실행되는 순간 `readJson`이 fallback을 쓰고 `data/stopwords.json`을 만든다.
- `listRuns()`는 `data/runs/`가 없으면 **빈 배열을 반환하고 디렉터리를 만들지 않는다.**

**결론**: **Task 025를 막는 저장 계층 결함은 없다.**

### I-038 · 부분 실패 Alert에 개발자 메모 문장이 사용자 노출 텍스트로 섞여 나갔다

- 상태: **해결됨 (16일차)**
- 발견: 16일차 · 화면(Task 025 — HTML 방식 부분 실패 경로 실측 중)
- 관련 Task: Task 016B(발생지) · Task 025(발견) · **I-041**(오염원)

**증상**: 크롤링이 부분 실패(`partial-failed`)로 끝나면 destructive `Alert`의 description이 화면에 이렇게 떴다.

```
테스트실패언론사HTML(셀렉터 불일치) — 수집 방식에 따라 사유 문구가 다르다.
```

꼬리의 "— 수집 방식에 따라 사유 문구가 다르다."는 사용자에게 줄 정보가 아니라 **구현자가 자기 자신에게 남긴
설명**이다. `components/crawl/crawl-run-panel.tsx`의 템플릿 리터럴 안에 들어 있었고, `hasFailures` 분기 전체에
항상 붙으므로 RSS든 HTML이든 **부분 실패가 나는 모든 실행에서 재현**됐다.

**왜 아무도 못 잡았는가**: `run-meta.json`의 `failReason` 필드 자체는 정상이다(`"셀렉터 불일치"`만 들어 있다).
오염은 화면 컴포넌트의 문자열 조립에서만 일어나므로 **API 응답이나 저장 데이터를 봐서는 전혀 드러나지 않는다.**
lint·typecheck·build도 전부 통과한다. 화면을 실제로 띄우고, 그것도 부분 실패라는 분기까지 도달해야 보인다 —
`docs/ROADMAP.md` §작업 진행 규칙 3번이 화면 Task의 완료 판정으로 Playwright MCP 동선을 건 이유가 이것이다.

**판정 방법이 결과를 갈랐다**: 화면은 접근성 트리 스냅샷이 아니라 `browser_evaluate`로 `element.innerHTML`을
직접 읽어 확인했다. 스냅샷은 텍스트를 정규화해 보여주므로 이런 꼬리 문장이 눈에 덜 띈다.

**조치**: 크롤 파이프라인이 016B를 다시 열어 꼬리 문장을 제거하고, 그 사실을 실제 코드 주석으로 옮겼다. 화면이
같은 경로를 다시 태워 DOM에서 `재검증실패언론사(셀렉터 불일치)`만 나오고 숨은 텍스트 노드도 없음을 확인했다.
오염원이던 설계서 예시 문자열도 함께 고쳤다(**I-041**).

### I-039 · `docs/ROADMAP.md` §검증 시나리오 5-3의 예시 입력이 기본 불용어와 겹친다

- 상태: **해결됨 (16일차 · 팀장이 ROADMAP 정정)**
- 발견: 16일차 · 화면(Task 025 — 5단계 실측 중)
- 관련 Task: Task 025(발견) · Task 006(기본 불용어 프리셋)

**증상**: 5-3 행은 "일괄 추가 패널 펼쳐 `앵커, 특파원\n인턴기자` 입력 → 3건이 분리 추가됨"이라고 적었다.
그런데 `앵커`는 Task 006이 심는 기본 불용어 7건(기자·사진·제공·앵커·무단전재·재배포금지·이번) 중 하나다 —
**같은 문서 §0단계 0-5 행에 그 7건이 표로 명시돼 있다.** 실제로 태우면 `2개 불용어를 추가했습니다. 1개는 이미
등록되어 있었습니다.`가 뜨고 사용자 추가는 2건만 는다.

**화면은 정상이다**: 콤마·줄바꿈 혼합 파싱도, 중복 안내도 설계대로 동작했다. 틀린 것은 시나리오 문서의 예시
입력이다. 교차검증에서 저장소 계층이 `data/stopwords.json`의 `sw-0004 = 앵커`(`isDefault: true`)를 직접 열어
대조해 문서 결함임을 확정했다.

**왜 남기는가**: 검증 문서의 기대 결과가 실제와 어긋나면, 다음에 이 시나리오를 태우는 사람이 **정상 동작을 결함으로
신고하거나 반대로 결함을 정상으로 넘긴다.** 시나리오 문서 자체도 검증 대상이라는 뜻이다.

**조치**: 예시 입력을 `특파원, 인턴기자\n논설위원`으로 교체하고 기대 결과 문구도 중복 없는 입력을 전제하도록
다듬었다.

### I-040 · 부분 실패 Alert의 폴백 문구가 언론사 단위가 아니라 기사 단위 실패에서도 뜬다

- 상태: **부분 해결 (20일차)** — 문구만 정정, 집계 단위 자체(근본 원인)는 그대로. 요약줄·Alert
  제목·본문 세 곳을 기사 단위임이 드러나게 바꾸고 `docs/screens/01-crawl-run.md` §상태별 화면 ⑤에
  반영했다. **근본 해소(`finishRun`·`RunProgress` 스키마 정합)는 여전히 MVP 범위 밖이다** — 아래
  본문은 발견 당시 그대로 남긴다
- 발견: 16일차 · 크롤 파이프라인(I-038 수정 중 옆 분기를 검토하다 발견)
- 관련 Task: Task 016B(발현) · Task 007(원인) · Task 014A(원인)

**간극**: run 레벨 status를 정하는 `finishRun`(`lib/storage/run-repository.ts:168`)의 `failCount`는
`run-manager.ts:187`의 `result.failures.length` — **기사(article) 단위 실패 건수**다. 반면 화면의
`failedPresses`가 보는 `pressStatuses[].status === 'failed'`는 `run-manager.ts:159-182`의 `isTotalFailure`
(그 언론사가 기사를 한 건도 못 건짐)일 때만 찍힌다 — **언론사 단위**다.

따라서 한 언론사 안에서 기사 몇 건만 실패하고 나머지는 저장에 성공하면, **그 언론사는 `done`인데 run은
`partial-failed`** 가 된다. 이때 `failedPresses.length === 0`이면서 `hasFailures === true`가 성립해 화면이
폴백 문구 `수집에 실패한 언론사가 있습니다.`를 띄운다 — 그 시점에 실패한 언론사는 0곳이다.

**16일차 재검증에서 이 상태에는 도달하지 못했다.** 특정 기사 URL만 개별적으로 실패시켜야 하는데 실제 언론사
서버 응답에 의존해 통제 재현이 어렵다. 화면이 억지로 만들지 않고 "미도달"로 보고했다.

**왜 MVP에서 고치지 않는가**: 문구 하나가 아니라 **집계 단위 자체가 어긋난 것**이 원인이라 `RunProgress`/
`CrawlRun` 스키마나 집계 로직을 손대야 하고, 이는 007·014A·016B 세 Task의 계약을 동시에 건드린다. Task 025는
이 프로젝트의 마지막 Task이고, 마지막 검증을 통과시키는 회차에 열 규모가 아니다.

**고친다면 볼 곳**: `finishRun`의 `failCount` 단위를 언론사 단위 판정과 맞추거나, `RunProgress`에 "언론사 자체
실패"와 "일부 기사만 실패"를 구분하는 필드를 더해 `isTotalFailure`가 채우게 한다. 화면 쪽은
`components/crawl/crawl-run-panel.tsx`의 폴백 문구와 `docs/screens/01-crawl-run.md` §상태별 화면 ⑤를 함께
갱신해야 한다.

**폴백 분기 자체는 죽은 코드가 아니다** — 이 근거가 코드 주석으로 남아 있다. 다음 사람이 "도달 불가"로 보고
지우지 않게 하려는 것이다.

### I-041 · 설계서의 마크업 스켈레톤 예시 문자열이 I-038의 오염원이었다

- 상태: **해결됨 (16일차)**
- 발견: 16일차 · 크롤 파이프라인(I-038의 원인을 추적하다 발견)
- 관련 Task: Task 016(설계서 소유) · Task 016B(오염이 전이된 곳)

**원인**: `docs/screens/01-crawl-run.md`의 `PartialFailureAlert` 마크업 스켈레톤이 이랬다.

```tsx
// TODO: 실패 개수/언론사명/실패 사유로 치환 필요
description="코드리뷰데일리(셀렉터 불일치), 클라우드저널(피드 파싱 실패) — 수집 방식에 따라 사유 문구가 다르다."
```

바로 위 줄이 "이 값 전체를 실제 값으로 갈아 끼워라"라고 말하는데, **정작 그 placeholder 문자열 안에 설명 문장이
섞여 있었다.** 구현자가 값을 옮기면서 설명까지 함께 옮긴 것이 I-038이다.

**왜 코드만 고치면 안 되는가**: `docs/CONVENTIONS.md` §8이 정적 마크업의 단일 소스를 설계서로 못박고 있다.
코드만 고치면 **설계서가 오염원으로 남아 다음에 이 화면을 다시 구현하는 사람이 같은 문자열을 또 베낀다.**
코드 결함과 설계서 결함은 재발 방지 지점이 다르다.

**조치**: 예시 값에서 꼬리 문장을 지워 구현과 글자 그대로 같게 맞추고, "예시 값 안에는 화면에 그대로 뜰 문구만
넣는다"는 취지를 주석으로 남겼다. 사라진 사실(사유 문구가 수집 방식별로 다르다)은 **같은 문서 §상태별 화면 ⑤에
이미 산문으로 있어** 중복 서술하지 않고 그 절을 가리키기만 했다. 같은 파일에서 예시 문자열에 설명이 섞인 다른
자리를 `="[^"]*—[^"]*"` 패턴으로 전수 검색했고 이 한 곳뿐이었다.

### I-042 · Task 025 DoD ①의 범위 표기가 §검증 시나리오의 실제 범위와 어긋난다

- 상태: **해결됨 (16일차 · 팀장이 ROADMAP 정정)**
- 발견: 16일차 · 저장소 계층(025 교차검증 중 DoD 대조)
- 관련 Task: Task 025

**불일치**: DoD ①은 "검증 시나리오 **1~5단계 + 분기 A·B**가 모두 통과한다"고 적었는데, §검증 시나리오는 실제로
**0단계(초기 빈 상태) ~ 6단계(재크롤 루프) + 반응형·접근성 R-1~R-6**, 총 62개 항목으로 확장돼 있다. DoD 문구가
초판 그대로 남아 있던 것이다.

**이번 회차 판정에는 영향이 없었다** — 화면이 태운 62항목이 DoD 문구의 상위집합이라 통과 판정은 그대로 성립한다.
다만 **DoD를 문구대로만 읽으면 0단계와 6단계, 반응형·접근성을 건너뛰고도 완료로 볼 수 있었다.** 완료 판정의
기준이 실제 검증 범위보다 좁게 적혀 있는 것은 그 자체로 위험하다.

**조치**: DoD ①을 실제 범위(0~6단계 + 반응형·접근성)로 정정했다.

### I-043 · `decodeHtmlEntities`가 숫자 참조로 되살린 `&`를 뒤 단계에서 다시 엔티티로 재해석한다

- 상태: 열림 (낮은 우선순위 · **실물 관측 사례 없는 이론적 발견**)
- 발견: 17일차 · 화면(I-011 산출분 교차검증 중 순서를 직접 실험하다가) → 팀장이 재현으로 범위를 넓힘
- 관련 Task: Task 010A(`lib/crawler/rss.ts`) · **I-011**(같은 함수, 같은 영향 계열)

**증상**: `decodeHtmlEntities`는 16진 숫자 참조 → 10진 숫자 참조 → 이름 있는 엔티티 → `&amp;` 순으로
**개별 `.replace()` 4번**을 돈다. `&amp;`를 마지막에 두는 이유(다른 단계가 되살린 `&`가 다시 걸리지
않도록)는 주석에 있고 실제로 그 목적을 달성한다. **그런데 숫자 참조 단계에는 같은 보호가 없다.**

```
"&#38;apos;"              -> "'"          (10진 → apos 재해석)
"&#x26;apos;"             -> "'"          (16진 → 같은 문제)
"&#38;lt;script&#38;gt;"  -> "<script>"   (lt·gt 재해석)
"&#38;nbsp;"              -> " "
"&#38;quot;"              -> "\""
"&amp;apos;"              -> "&apos;"     (대조군 — &amp; 처리는 정상)
```

**증상을 `&apos;` 하나로 좁혀 읽지 마라** — 이름 있는 엔티티 표의 다섯 개가 전부 같은 경로로 재해석된다.
원인은 하나다: 숫자 참조 치환이 이름 있는 엔티티 치환보다 **먼저** 돌아, 숫자 참조가 만들어 낸 `&`가
뒤 단계에서 원문의 일부인 것처럼 다시 스캔된다.

**`<script>` 케이스는 XSS가 아니라 텍스트 충실도 문제다.** 두 겹으로 막혀 있다 — ① `toPlainText`는 태그
제거를 `decodeHtmlEntities` **앞**에서 하므로, 디코딩이 나중에 만든 `<script>`는 태그 제거 단계를 거치지
않고 평문으로 남는다(전체 파이프라인 통과로 확인). ② 화면이 `dangerouslySetInnerHTML` 없이 텍스트 노드로
렌더링하므로 DOM에서 태그로 해석될 경로가 없다. **실질 영향은 I-011과 같은 계열이다** — 저장된 제목·요약에
원문에 없던 문자가 섞여 **키워드 토큰이 오염된다.** 보안 취약점으로 과장하지 않는다.

**왜 낮은 우선순위인가**: 발동하려면 CDATA 안 원문이 이미 "숫자 참조로 이스케이프한 `&` + 우연히 인접한
named entity 모양 문자열"로 **이중 인코딩**돼 있어야 한다. I-011의 원인이던 "CMS가 `&apos;`를 리터럴로
남긴다"는 흔한 습관과 달리, 이건 같은 문자를 두 방식으로 겹쳐 인코딩하는 드문 실수다. **I-011은 7일차·
16일차 두 번 실물로 관측됐지만 이 변형은 관측 사례가 없다.**

**고친다면**: 순서 재배치로는 안 풀린다 — 숫자 참조와 named entity가 서로를 되살릴 수 있어 어느 쪽을
마지막에 둬도 반대쪽이 문제가 된다. **"여러 번 스캔한다"는 구조 자체를 없애야 한다.** 4개의 `.replace()`를
하나의 결합 정규식 + 단일 `.replace()`로 합치면 된다(`/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi`
형태에 콜백 분기). **JS `String.replace`는 같은 호출 안에서 치환 결과를 다시 스캔하지 않으므로** 재해석
경로가 원천적으로 사라진다. 수정 위치는 `lib/crawler/rss.ts`의 `decodeHtmlEntities` 하나뿐이다.

### I-044 · 이슈 상태 필드가 실물보다 자주 낡는다 — 제기한 쪽과 닫은 쪽이 다르기 때문이다

- 상태: **해결됨** (17일차 · 사용자 승인으로 `SKILL.md` 4단계 3항에 확인 항목을 추가했다)
- 발견: 17일차 · 저장소 계층(유휴 배정 전수 감사 소회)
- 관련 Task: 없음(운영)

**규모**: 17일차 한 회차에서만 **10건**이 "실물은 끝났는데 문서는 열림"이었다 — 착수 전 팀장 감사 6건
(I-009·I-018·I-027·I-033·I-034·I-036), 이슈 3건을 배정받아 처리하던 중 2건(I-007·I-025), 유휴 전수 감사에서
2건(I-014·I-026). **배정한 3건 중 실제로 손댈 것이 1건뿐이었다.**

**구조적 원인 ①** — 닫힌 이슈들은 전부 **제기한 쪽과 실제로 해소한 쪽이 다르다.** I-007은 `lib/types/article.ts`를
만드는 과정에서, I-014는 Task 017이 D-026을 반영하는 과정에서, I-025·I-026은 018B·023이 각자 자기 Task를
끝내면서 **부수적으로** 닫혔다. 그 Task 담당의 관심사는 "내 DoD를 만족했는가"이지 "이 변경이 어느 이슈를
닫는가"가 아니다 — **닫혔다는 사실을 알아챌 계기 자체가 없었다.**

이 연결이 자연히 안 생기는 이유는 `관련 Task` 필드가 **이슈 → Task 한 방향으로만** 걸려 있어서다. Task 쪽에는
"나를 완료하면 어떤 이슈가 영향받는지" 역방향 참조가 없다. 그래서 Task 담당이 부수효과를 확인할 방법이
**`docs/ISSUES.md` 전체를 기억하는 것**뿐인데, 회차가 쌓일수록 비현실적이다.

**구조적 원인 ②** — "열림" 한 라벨에 성격이 다른 것이 섞여 있다: ① 진짜 미해결 결함(I-006·I-020·I-022)
② 코드 변경이 필요 없는 기록(I-037) ③ 회차마다 반복되는 운영 조건(I-029). **①만 누군가 고쳐야 할 일**인데
셋이 같은 라벨을 달고 있어, 회차 계획 때 무엇이 진짜 작업 대상인지 걸러내는 비용이 든다. 17일차 감사에서
I-029·I-031·I-037을 보류·보류·기각으로 재분류한 것이 이 문제를 줄이려는 시도다.

**제안(팀장 판단 대기)**: 회차 마감 체크리스트에 "이번 회차가 손댄 Task·파일과 `관련 Task`가 겹치는 열린
이슈 재확인" 한 줄을 넣는다. 완료된 Task가 언급하는 이슈만 골라 대조하면 전수 감사보다 훨씬 싸다.
**전수 감사 자체는 유휴 회차에만** 한다 — 17일차에도 그 경로로 발견됐다. 이 제안은
`.claude/skills/workstream-day-runner/SKILL.md`를 고치는 일이라 사용자 승인 전에는 반영하지 않는다.

### I-045 · 워크스트림이 작성하지 않은 draft를 작성했다고 보고했다

- 상태: **해결됨** (17일차 · 팀장이 파일 부재를 확인하고 재작성 지시)
- 발견: 17일차 · 팀장(회차 마감에 draft를 병합하려다 파일이 없는 것을 발견)
- 관련 Task: 없음(운영)

**무슨 일이 있었나**: 화면 워크스트림이 교차검증 보고서에 "`docs/ISSUES.draft.화면.md`에 남겼다"고 적었는데
**그 파일이 존재하지 않았다.** 본인 확인 결과 Write 도구를 호출하지 않고 보고서 본문에만 내용을 적었다.

**왜 위험한가**: 회차 마감의 draft 병합은 **파일을 읽어서** 한다(SKILL.md 4단계 3항). 보고서는 대화 기록에
남을 뿐 병합 대상이 아니다. 이번엔 보고서 본문에 내용이 적혀 있어 발견이 살아남았지만, **요약만 적혀 있었다면
그 발견은 통째로 유실됐다.** 실제로 유실된 draft가 과거 회차에 있었는지는 확인할 방법이 없다 — 없는 파일은
흔적을 남기지 않는다.

**처리**: 화면이 절대 경로로 다시 작성하고 `ls`로 실물 존재를 확인해 보고했다(**I-043**이 그 산출물이다).

**재발 방지**: 워크스트림 보고에 "draft에 남겼다"가 있으면 **팀장이 병합 전에 `ls`로 실물을 확인한다.**
파일이 없으면 보고서 본문을 근거로 재작성을 지시한다. 소환 프롬프트의 [보고] 항목에 "draft 파일 경로와
`ls` 확인 결과"를 요구하는 것도 방법이지만, 그건 **I-044**의 절차 개선과 함께 판단한다.

### I-046 · `toThrow(SomeErrorClass)` 어서션은 그 클래스가 사라지면 조용히 완화된다

- 상태: 해결됨 (20일차) — 4개 파일 9건 전부 `toBeInstanceOf`로 교체 완료.
  `lib/storage/paths.test.ts`(2건)는 20일차 저장소 계층이, 나머지 7건(`run-manager.test.ts` 5건·
  `article-repository.test.ts` 1건·`run-repository.test.ts` 1건)은 20일차 크롤 파이프라인이 처리했다.
  각 파일에서 예외 클래스 export를 잠시 지워 바뀐 어서션이 실패로 깨지는지 확인한 뒤 되돌렸다
- 발견: 18일차 · 화면(I-006·I-020 산출분 교차검증 중 회귀 실험을 하다가)
- 관련 Task: 없음(전 워크스트림의 vitest 스위트에 걸친 테스트 작성 관례)
- 관련 결정: D-022 · D-045 · **I-020**

**증상**: vitest의 `expect(...).toThrow(SomeClass)`(`rejects.toThrow` 포함)는 `SomeClass`가 import한 모듈에서
실제로 export되지 않으면 **`undefined`가 되고, `toThrow(undefined)`는 인자 없는 `toThrow()`와 동치로 완화된다.**
"이 타입이 던져진다"를 검증하려던 어서션이 **"뭐든 던지기만 하면 통과"로 조용히 내려앉는다.** import 실패도
타입 오류도 나지 않는다 — 구조분해된 값이 `undefined`인 것은 JS에서 합법이다.

**결과적으로 이 패턴을 쓰는 테스트는 자신이 지키려는 것(전용 예외 타입)이 지워지거나 이름이 바뀌는 가장
직접적인 회귀를 못 잡는다.**

**발견 경위**: I-020 교차검증에서 소스를 `git stash`로 되돌려 신규 테스트 4건이 실패하는지 확인하던 중,
"존재하지 않는 기사는 `ArticleNotFoundError`를 던진다" 테스트가 **`ArticleNotFoundError`가 아예 없는 소스에서도
통과**했다. 같은 이슈의 다른 3건이 여전히 실패해 회귀 자체는 잡혔지만, **그 3건이 없었다면 드러나지 않았다.**

**항상 안전 쪽으로 완화되는 것도 아니다**: 같은 파일의 `.not.toBeInstanceOf(ArticleNotFoundError)` 쪽은
`undefined`가 되면 `TypeError: The instanceof assertion needs a constructor`로 **실패한다.** 어느 방향으로
깨지는지가 어서션 형태에 달려 있어 예측하기 어렵다.

**영향 범위** — `.toThrow(<대문자 식별자>)` 전수 검색 결과 **4개 파일 9건**:

| 파일 | 줄 | 예외 클래스 |
| --- | --- | --- |
| `lib/crawler/run-manager.test.ts` | 309 · 407 · 415 · 416 · 500 | `RunAlreadyRunningError` · `RunNotAbortableError` · `RunNotFoundError` |
| `lib/storage/paths.test.ts` | 111 · 112 | `UnsafePathSegmentError` |
| `lib/storage/article-repository.test.ts` | 171 | `ArticleNotFoundError` |
| `lib/storage/run-repository.test.ts` | 119 | `RunNotFoundError` |

**5개 예외 클래스 전부가 "없음·충돌·검증 실패를 타입으로 구분한다"는 이 프로젝트의 핵심 오류 처리 관례
(D-022·D-045·I-020)의 산물이다.** 정확히 그 관례가 지키려는 것을 검증하는 테스트들이 전부 같은 약점을 공유한다.

**고칠 방향**: `toThrow(Type)`을 `toBeInstanceOf(Type)` 별도 어서션으로 바꾼다. `toBeInstanceOf`는 인자가
`undefined`면 `TypeError`로 **즉시 실패**하므로 — 완화가 아니라 명시적 실패로 깨진다 — 안전한 방향이다.
같은 파일이 이미 `.not.toBeInstanceOf(...)`를 쓰고 있어 스타일 통일도 함께 얻는다.

**우선순위 낮음**: 이 약점이 실제로 회귀를 놓친 사례는 아직 없고, 발동 조건("예외 클래스가 통째로 삭제되거나
이름이 바뀐다")이 이 규모의 프로젝트에서 흔한 실수는 아니다. 다만 **9건 각각 한 줄씩 바꾸면 끝나는 저비용
수정**이므로, 다음에 이 5개 예외 클래스 중 하나를 손대는 회차에 함께 처리하기를 권한다.

### I-047 · 동시 편집 중 dev 서버 `curl` 검증에 일시적 컴파일 500이 섞인다

- 상태: 열림 (**회차 운영 관찰 · 코드 결함 아님**)
- 발견: 18일차 · 크롤 파이프라인(I-020 교차검증 중)
- 관련 이슈: I-028(dev 서버가 둘로 갈려 낡은 빌드를 봤다) · I-029(브라우저 공유 간섭)

**증상**: `curl` 6종을 연달아 치는데, 정상 조회 1건이 200으로 통과한 직후 나머지 5건이 전부 이 오류로 500을 냈다.

```
Error: Export ArticleNotFoundError doesn't exist in target module
[project]/lib/storage/article-repository.ts [app-route] (ecmascript).
```

파일을 직접 읽어 `export class ArticleNotFoundError`가 실재함을 확인했고, **1~2초 뒤 재시도하니 바로 정상
(400/404/200)으로 돌아왔다.**

**원인**: 회차 중 여러 워크스트림이 동시에 `lib/`·`app/` 파일을 편집하므로, **Turbopack이 다른 워크스트림의
저장 이벤트로 모듈 그래프를 재컴파일하는 찰나에 요청이 들어가면** 컴파일이 끝나지 않은 중간 상태를 잠깐
보여준다. 공유 dev 서버 + 동시 편집 조합에서만 나타나는 레이스다.

**왜 기록하는가**: 다음 교차검증자가 같은 잔상을 보고 **"저 워크스트림이 export를 빠뜨렸다"고 오판할 수 있다.**
이번에도 그럴 뻔했다. 판정 절차를 못 박는다 — **500 응답에 `doesn't exist in target module`류 컴파일 오류
메시지가 담겨 있으면, 파일을 직접 읽어 export 존재를 먼저 확인하고 1~2초 뒤 재시도한 결과로 판정한다.**

**처리**: 사용자 승인으로 `SKILL.md` 3단계(교차검증 루프)에 **「공유 dev 서버에서 관측한 것은 코드의 상태가
아닐 수 있다」** 절을 추가했다. 이 건만 따로 넣지 않고 **같은 계열 셋을 한자리에 묶었다** — **I-028**(낡은 빌드),
**I-047**(컴파일 중간 상태), **I-029**(브라우저 탈취). 셋 다 "검증 결과가 환경이 만든 잔상"이라는 같은 함정이고,
따로 흩어 두면 다음 사람이 그때그때 다시 배운다. `data/`를 한 번에 하나만 잡는 규칙(**I-034**·**I-033**)도
같은 이유로 함께 적었다.

### I-048 · `03-hot-keyword.md`·`05-stopword-manage.md`의 "추가 설치 필요" 절도 I-010과 같은 계열로 낡았다

- 상태: **해결됨 (19일차 · 화면 — I-010과 같은 회차에 함께 닫았다)**
- 발견: 19일차 · **화면과 크롤 파이프라인이 독립적으로 같은 2건을 찾았다** (화면은 I-010 처리 중 전체 검색으로,
  크롤 파이프라인은 유휴 배정 전수 훑기로)
- 관련 Task: Task 022A(03 소유) · Task 012A/012B(05 소유) · **I-010**(같은 결함의 04 사례)

**증상**: I-010이 04에서 지적한 것과 **정확히 같은 결함이 두 문서에 더 있었다.**

- `03-hot-keyword.md:341-345` — `select`·`toggle-group`·`label`을 "추가 설치 필요"로 적고 `npx shadcn@latest add` 명령까지 남겨 뒀다.
- `05-stopword-manage.md:295-299` — `label`·`textarea`·`alert-dialog`에 같은 패턴.

여섯 종 전부 `components/ui/`에 실물이 있고, `docs/screens/README.md`가 "Task 002에서 13종을 일괄 설치했고
화면 Task는 추가 설치 없이 import만 하면 된다"고 이미 못 박고 있다. **`README.md`가 설치 상태의 단일 소스가
된 뒤에도 개별 화면 문서의 절이 갱신되지 않은 것**이 이 결함의 공통 원인이다.

**무엇이 망가지는가**: 해당 Task들은 이미 완료돼 실사고는 없었다. 하지만 **문서만 보고 착수 준비를 하는
사람은 불필요한 `npx shadcn add`를 실행한다.** `docs/CONVENTIONS.md` §8은 새 shadcn 설치를 워크스트림이
직접 하지 말고 팀장에게 보고하라고 정해 두었으므로, 이 낡은 절은 **없어도 될 보고와 회차 단위 조율을 유발한다.**

**왜 04만 고치면 안 됐는가**: I-010은 04 한 건으로 등재돼 있었다. **한 문서만 고치면 같은 함정이 두 곳에
남는다** — 16일차 I-041이 정확히 그 실패였다(코드만 고치고 오염원인 설계서를 두면 다음 구현자가 또 베낀다).

**해소**: I-010과 동일한 방식으로 닫았다 — **절을 지우지 않고** 설치 명령과 상태 표기만 걷어내 "설치 완료"
목록에 합쳤다(컴포넌트별 용도 표는 그 화면 전용 정보라 남겼다). **세 문서(03·04·05)가 같은 형태가 됐다.**

### I-049 · `01-crawl-run.md`가 이미 구현된 필드를 "아직 없다"고 적고 삭제된 스키마 이름을 가리켰다

- 상태: **해결됨 (19일차 · 화면)**
- 발견: 19일차 · 크롤 파이프라인(유휴 배정 전수 훑기) → 팀장이 실물 확인 후 화면에 전달
- 관련 Task: Task 016A(01 소유) · Task 023(`crawlRequestSchema` 삭제)
- 관련 결정: **D-039**

**증상**: `01-crawl-run.md:46`이 이렇게 적고 있었다.

> 현재 `lib/crawler/types.ts`에는 이 값에 대응하는 필드가 아직 없다 → 실제 구현 시 `crawlRequestSchema`(또는
> 별도 스키마)에 `maxArticlesPerPress` 같은 선택 필드 추가가 필요하다

**세 가지가 동시에 틀렸다.**
1. `maxArticlesPerPress`는 **이미 구현돼 있다** — `lib/types/crawl-run.ts:44`의 `crawlStartRequestSchema`에
   선택 필드로 있고, `app/page.tsx`·`crawl-run-panel.tsx`·`run-manager.ts`·`press-crawler.ts`에서 실사용 중이다.
2. 파일 경로가 틀렸다 — `lib/crawler/types.ts`가 아니라 `lib/types/crawl-run.ts`다.
3. **`crawlRequestSchema`는 존재하지 않는다.** 14일차 Task 023이 삭제했다(**D-039**). 코드 전체 grep에서 0건인
   죽은 이름이다.

**같은 문서 안에 복제돼 있었다**: 544행 마크업 스켈레톤의 TSX 주석
`{/* TODO: crawlRequestSchema에 maxArticlesPerPress 필드 추가 필요 */}`도 같은 죽은 이름을 가리켰다.
**이쪽이 더 나쁘다 — 예시 값이 아니라 다음 구현자가 그대로 옮겨적을 실행 지침이고, I-041과 정확히 같은
오염 경로다.**

**무엇이 망가지는가**: 이미 구현된 것을 미구현으로 적어 두면 **다음 사람이 있는 걸 또 만들거나, 없는 스키마를
찾아 헤맨다.** 낡은 "준비 안 됨" 서술은 낡은 설치 목록(**I-048**)과 같은 계열의 결함이다.

**해소**: 문장을 걷어내지 않고 **완료된 사실로 고쳐 썼다.** 지웠으면 "이 값이 어느 스키마에 근거하는가"라는
정보 자체가 문서에서 사라진다 — **틀린 문장을 지우는 것과 정보를 지우는 것은 다르다.** 무엇이 왜 틀렸었는지도
각주로 남겨 다음 사람이 같은 조사를 반복하지 않게 했다. 544행 TODO 주석도 함께 정정했다.

**교차검증이 지적한 절차 구멍**: 이 두 수정은 처음에 **정식 draft 항목으로 등록되지 않고** 크롤 파이프라인
draft의 "부속" 서술로만 남아 있었다. 그 상태로 마감했으면 문서 각주만 남고 **이슈 번호를 통한 추적 경로가
끊겼을 것이다.** 저장소 계층이 교차검증에서 이를 짚어 이 블록으로 정식 등재했다.

### I-050 · `CrawlRun.pressResults` 신설로 `run-manager.test.ts`의 `makeRun()`이 타입체크에서 깨졌다

- 상태: **해결됨 (20일차)** — 같은 회차 안에서 크롤 파이프라인이 `makeRun()`에 `pressResults: []` 한 줄을 더해 닫았다
- 발견: 20일차 · 저장소 계층(I-022 계약 작업 중 `npm run typecheck`를 돌리다가)
- 관련 Task: Task 004(스키마) · Task 014A(`run-manager.test.ts`)
- 관련 결정: **D-048** · 관련 이슈: **I-046**

**증상**: `crawlRunSchema`에 `pressResults: z.array(...).default([])`를 더하면 `z.infer`가 만드는
`CrawlRun`에서 이 필드가 **출력 타입에서는 필수**가 된다(`skippedCount`가 이미 같은 패턴이다).
`lib/crawler/run-manager.test.ts:91`의 `makeRun()` 헬퍼가 `CrawlRun` 리터럴을 이 필드 없이 만들어
`npm run typecheck`가 TS2322 1건으로 떨어졌다.

**기록해 둘 값어치는 증상이 아니라 이것이다** — **`npm run test`는 이 실패를 못 잡았다.** vitest는
esbuild로 타입만 걷어내고 타입 검사를 하지 않으므로, 문제의 헬퍼로 만든 204건이 전부 초록으로 통과했다.
`npm run typecheck`를 따로 돌리지 않았다면 스키마를 넓힌 회차에서 이 사실을 모르고 넘어갔다.
**I-046이 "테스트가 자기가 지키려는 것을 못 잡는다"였다면 이건 "테스트 명령 자체가 못 보는 층이 있다"다.**
회차 마감에 네 명령을 **항상** 돌리라는 규칙(`.claude/skills/workstream-day-runner/SKILL.md` 3단계 5항)이
이 회차에서 실제로 값을 했다.

**해소**: 20일차. 저장소 계층이 소유 밖이라 고치지 않고 draft로 넘겼고, 다음 릴레이가 `finishRun` 작업으로
같은 파일을 열면서 함께 닫았다. **소유 경계를 지키느라 회차가 늘어나지 않은 사례다** — 릴레이 순서가
소유 순서와 같으면 넘긴 것이 다음 구간에서 자연히 처리된다.

### I-051 · `fetchHtml`이 값이 아니라 예외로 실패하면 run이 영원히 `'running'`에 멈춘다

- 상태: **열림** · 재현 미실시(코드 추적으로만 확인)
- 발견: 20일차 · 크롤 파이프라인(I-022 지시가 "`finishRun` 시점에 `'running'`이 남는 경로가 실제로 있는지 확인하라"고 못 박아 조사하다가)
- 관련 Task: Task 013A(`fetch-html.ts`, 발생지) · Task 014A(`run-manager.ts`, 발현)
- 관련 이슈: I-022(발견 계기) · **I-006·D-047**(같은 계열 — 실패를 값으로 격리한다는 원칙)

**증상**: `lib/crawler/fetch-html.ts`의 `fetchHtml`은 주석에 "실패는 예외로 던지지 않고 `CrawlResult`
값으로 돌려준다"고 적혀 있지만 **그 계약이 지켜지지 않는 경로가 있다.** `getBrowser()`와
`browser.newContext()` 호출이 `try` 블록 **밖**에 있어(`fetch-html.ts:24-30`), Playwright 기동 실패
(바이너리 없음·OOM·권한)는 `catch`에 잡히지 않고 그대로 밖으로 나간다.

이 예외는 `crawlHtmlPress` → `crawlPress` → `runOnePress`를 **어느 곳에도 try/catch가 없어** 그대로
뚫고, `runInBackground`의 `Promise.all`을 reject시킨다. 그런데 `runInBackground`은
`void runInBackground(...)`로 **`.catch()` 없이** 호출된다. 결과는 unhandled rejection이고:

- **`finishRun`이 아예 호출되지 않는다** — `run-meta.json`이 `status: 'running'`으로 영구히 남는다.
- **잡 레지스트리에서 이 잡이 제거되지 않는다** — `startRun`의 "이미 running인 잡이 있으면 거절"에
  계속 걸려 **서버를 재시작하기 전까지 새 크롤을 시작할 수 없다.**
- 화면은 진행률이 멈춘 채 응답 없는 진행 중 상태를 계속 그린다.

**왜 지금 발견됐나**: 이 프로젝트의 오류 처리 원칙은 "개별 실패는 예외가 아니라 값으로 격리한다"
(`docs/CONVENTIONS.md` §7, D-047)이고, `fetchHtml`의 주석도 그렇게 선언한다. **선언과 구현이 어긋난
지점을 아무도 안 봤던 이유는 `try` 두 줄 위에 있는 코드라 눈에 안 들어오기 때문이다.**
I-022 작업이 "`'running'`이 남는 경로가 있는가"를 명시적으로 물어서야 드러났다.

**`toPressRunResult`의 throw와 혼동하지 말 것**: 20일차에 추가된 `toPressRunResult`는 `'running'`을
만나면 던지는데, 화면이 교차검증에서 **이 분기가 현재 제어 흐름상 도달 불가능함**을 확인했다 —
`Promise.all`이 reject 없이 끝났다는 것 자체가 모든 언론사 상태가 terminal이라는 뜻이다. 위 경로에서는
`Promise.all`이 먼저 reject되므로 그 줄에 닿지도 못한다. **진짜 위험은 예외가 위로 새는 것이지
방어 assertion이 아니다.**

**재현이 안 된 이유**: 로컬에서 Playwright 기동이 안정적으로 성공해 왔다. 실패 조건을 의도적으로
만들지 않는 한 이 경로를 타지 않는다.

**고칠 방향(둘 다 필요하다)**:
1. `fetch-html.ts`의 `try`를 `getBrowser()`·`newContext()`까지 감싼다.
2. `runInBackground`을 `void`가 아니라 `.catch()`로 받아, 최소한 `finishRun`이 불리고 레지스트리가
   정리되게 한다(그 시점 `'running'`으로 남은 항목은 `'failed'`로 **명시적으로** 확정한다).

①만 고치면 `crawlPress`가 던질 수 있는 다른 예외에 여전히 취약하고, ②만 고치면 브라우저가 죽을 때마다
그 언론사가 조용히 `'failed'`가 되고 `fetchHtml`의 문서 계약은 계속 거짓으로 남는다.

**해소**: 아직.
