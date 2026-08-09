# 4일차 작업 로그 (2026-08-10)

## 회차 요약

- 활성 워크스트림: 저장소 계층 · 크롤 파이프라인(유휴 배정) · 화면(유휴 배정)
- 이번 회차 배치 근거: 3일차에 Task 006(언론사·불용어 레포지토리)이 끝나면서 저장소 계층에 세 Task
  (008A · 011 · 020A)가 한꺼번에 열렸다. 크롤 파이프라인은 013B가 008B를, 화면은 009A가 008A를 기다려
  둘 다 열린 Task가 없어 대체 작업으로 돌았다.
- 결과: 이슈 3건 발견 / 전건 회차 내 수정·재검증 통과. 전체 테스트 통과
- **이 회차부터 Playwright MCP 브라우저 검증이 실제로 걸린다** — 1~3일차는 전부 `lib/` 순수 모듈이라 태울
  동선이 없었고, 이번에 처음으로 API가 생겼다.

## 워크스트림별 완료 내역

### 저장소 계층 (01.저장소계층.md)

- 완료 Task: 008A · 언론사 CRUD API(목록·생성) / 011 · 불용어 CRUD API / 020A · 키워드 추출 필터
- 산출물: `lib/api/response.ts` · `app/api/press/route.ts` · `app/api/stopwords/route.ts` ·
  `app/api/stopwords/[id]/route.ts` · `lib/keyword/{extract,fixtures}.ts` · `lib/keyword/extract.test.ts`
- 비고: 공통 응답 봉투(`ok`/`fail`)를 여기서 처음 만들었고, 교차검증 지적으로 오류 경계까지
  `withErrorBoundary`로 공용화했다(D-008). 이후 라우트 전부가 이 형태를 쓴다.

### 크롤 파이프라인 (02.크롤파이프라인.md)

- 완료 Task: 없음 — 열린 Task가 없어 대체 작업만 수행했다
- 산출물: `lib/types/article.ts`(`articleMetaSchema` 이동) · `lib/storage/{article-file,article-repository}.ts`
  (import 경로) · `data/press-sources.json`(시드 5건) · `docs/press-candidates.md`
- 비고: **I-007을 해소했다** — `ArticleMeta`/`ArticleListItem`을 `lib/types/article.ts`로 옮겼다(순수 이동,
  동작 무변경). 그리고 **013B 검증용 시드 5건**을 손으로 채웠다. `data/`는 git에 올라가지 않으므로 내용을
  `docs/press-candidates.md`에 기록해 다른 머신에서 재현 가능하게 했다.

### 화면 (03.화면.md)

- 완료 Task: 없음 — 열린 Task가 없어 대체 작업만 수행했다
- 산출물: `docs/screens/playwright-scenarios.draft.md`(D-006 반영 갱신)
- 비고: 3일차에 자기가 제기한 조각 경계 문제(I-004)가 D-006으로 확정되면서 시나리오를 그에 맞게 고쳤다.
  특히 Task 016의 [크롤링 시작] 버튼 소유가 확정돼 "부분 커버"였던 DoD를 완전 커버로 정정했다.
  009A 착수 준비로 설계서 04가 요구하는 필드를 `PressSource` + `sourceUrl`과 대조해 **모자란 필드가 없음**을
  확인했고, 설계서 04의 "추가 설치 필요" 절이 낡았다는 것도 발견했다(I-010).

## 교차검증 결과

- 크롤 파이프라인 → 저장소 계층(008A·011·020A): 1차 pass + 부가 이슈 3건. Next.js 16 규약(`runtime` export
  없음 · `params`를 `await` · 설치본 시그니처 일치), 응답 봉투·상태 코드, **함정 ② 회귀가 실제 Kiwi 모델로
  판정되는 것**, D-002 계약 유지, 013B 시드 5건 무손상까지 전부 확인됐다. 지적은 오류 처리 2건(원시 메시지
  노출 · 경계 부재)과 테스트 공백 1건. 수정 후 재검증 pass — 리뷰어가 `data/*.json`을 **일부러 깨뜨려**
  500 경로를 강제 유발하고, 응답 본문에 내부 문구가 새지 않는지 정규식으로 대조했다. 404가 500 경계에
  삼켜지지 않는 것도 함께 확인했다.
- 화면·크롤 파이프라인은 완료 Task가 없어 리뷰 대상이 아니었다.

## DoD 충족 현황

| Task | DoD 충족 | 미충족 항목 |
| --- | --- | --- |
| 008A | 3/3 (조각 몫) | 없음. 008B 몫 2개(DELETE 후 `data/runs` 미삭제 · 전체 동선 Playwright)는 이월 |
| 011 | 4/4 | 없음 |
| 020A | 6/6 (조각 몫) | 없음. 020B 몫(5회 합산·토큰 감소율·`stopwordExcludedCount`)은 이월 |

- **Playwright MCP 동선**: `npm run dev` 후 `/api/press`에 GET(전체·`?active=true`)·POST(RSS 빈값 400 ·
  HTML 빈값 400 · RSS+feedUrl만 201), `/api/stopwords`에 GET·POST(단건·중복·배열형 일괄·문자열형 일괄)·
  DELETE(정상 200·없는 id 404)를 태워 상태 코드와 응답 본문을 확인했다. 검증에 쓴 데이터는 정리해
  `data/press-sources.json`은 시드 5건, `data/stopwords.json`은 기본 프리셋 7건 상태로 복원했다.
- 확인된 사실 하나: 020A 검증 중 `것`·`수`는 `NNB`(의존명사)라 품사 필터에서 이미 걸러지고 **`점`만 길이
  필터가 실제로 잡는 대상**이라는 것이 드러나 테스트에 남았다.

## 발견·해결한 이슈

1. [저장소 계층] `app/api/press/route.ts`의 500 catch가 `error.message`를 그대로 노출(CONVENTIONS §7 위반) →
   `withErrorBoundary`로 공용화, 원시 오류는 서버 콘솔에만 (D-008, 재검증 pass)
2. [저장소 계층] `app/api/stopwords/route.ts`에 오류 경계 자체가 없어 실패 시 **응답 봉투가 깨짐** →
   세 라우트의 경계를 같은 형태로 통일 (재검증 pass)
3. [저장소 계층] `SL`(영문) 1글자 제외 테스트 케이스 부재 → `'AI와 5G가 결합된다'` 픽스처로 케이스 추가.
   `posTag === 'SL'`까지 단언해 품사별로 필터가 쪼개져도 회귀를 잡게 했다
4. [판정] zod 필드 생략 시 영문 메시지 문제(I-008) → **API 레벨 방어로 확정**(D-009). 컨트롤드 인풋 폼에서
   도달 불가능한 경로라 스키마 전체를 손볼 값어치가 없다
5. [기록] 기존 임시 라우트 2건의 원시 오류 노출(I-009) — 015A·023이 각각 교체·삭제하므로 새로 고치지 않는다
6. [기록] 설계서 04의 "추가 설치 필요" 절이 낡음(I-010) — Task 023에서 정리

## 팀장 전체 테스트 (항상 실행)

- npm run lint: 통과 (에러·경고 0건)
- npm run typecheck: 통과
- npm run test: 통과 (8개 파일 · 102개 케이스 — 3일차 94건에서)
- npm run build: 통과. 라우트 3종 신규 등록(`/api/press` · `/api/stopwords` · `/api/stopwords/[id]`)

## 문서 갱신

- docs/ROADMAP/work/*.md 상태 마커: `01.저장소계층.md` Task 008A · 011 · 020A
- docs/ROADMAP.md: 완료 체크 **011만**. Task 008·020은 조각만 끝나 진행 메모를 남겼다.
  진행률 Phase 2: 1/5(🟡 진행 중), 합계 9/25 (36%)
- docs/ROADMAP/work/*.md 영역 정의: 변경 없음
- docs/ISSUES.md: I-008(해결됨) · I-009(열림) · I-010(열림) 등재. **I-007은 이번 회차에 해소됐다**
- docs/DECISIONS.md: D-008 · D-009 등재(유효). draft 1건 병합 후 삭제

## 다음 회차에 열리는 Task

- Task 008B (저장소 계층) — 언론사 단건 API. `의존: Task 008A` 충족
- Task 009A (화면) — 언론사 관리 화면 목록·표. `의존: Task 008A` 충족. **첫 화면 Task다**
- Task 020B (저장소 계층) — 빈도 집계·분석 요약. `의존: Task 020A` 충족
- Task 013B는 `의존: 013A, 010A, 007, 008B` — 008B가 5일차에 끝나면 6일차에 열린다
- Task 012A는 `의존: Task 011` 충족 — 화면이 009A와 함께 받을 수 있다

## git

- 브랜치: day-4 (day-3에서 분기)
- 커밋: 회차 마감 커밋 1건
- 푸시: 사용자 승인 대기
