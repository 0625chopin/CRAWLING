# 1일차 작업 로그 (2026-08-10)

## 회차 요약

- 활성 워크스트림: 저장소 계층 · 화면 · 크롤 파이프라인(유휴 배정)
- 이번 회차 배치 근거: 첫 회차라 완료 집합이 공집합이고, `의존:`·`선행 대기:`가 모두 「없음」인 Task 004(저장소 계층)와
  Task 019(화면) 두 장만 열려 있었다. 크롤 파이프라인은 첫 Task(010A·013A)가 Task 004를 기다려 열린 Task가 없으므로
  `02.크롤파이프라인.md` §유휴 주에 맡길 것 1~2주차 항목을 배정했다.
- 결과: 이슈 1건 발견 / 전건 해소, 전체 테스트 통과

## 워크스트림별 완료 내역

### 저장소 계층 (01.저장소계층.md)

- 완료 Task: 004 · 도메인 타입 및 zod 스키마 정의
- 산출물: `lib/types/{press,crawl-run,article,keyword,stopword,index}.ts` · `lib/types/press.test.ts`
- 비고: `lib/crawler/types.ts`는 검토 후 수정하지 않았다(D-001). `lib/types/keyword.ts`에 `keywordRankItemSchema`를
  계획 외로 추가했다 — DoD 5번이 `KeywordRankItem` 대체 가능성을 명시적으로 요구해서이며, 리뷰에서 정당하다고 판정됐다.

### 화면 (03.화면.md)

- 완료 Task: 019 · Kiwi 어댑터 (싱글턴 · 안전 래퍼 · 모델 검증)
- 산출물: `lib/keyword/kiwi.ts` · `lib/keyword/index.ts`
- 비고: 공개 API는 `safeTokenize(text)` · `MATCH_OPTIONS`(393216) · `KiwiToken` 타입 셋뿐이다. `getKiwi()`는
  비공개로 두었다(D-002).

### 크롤 파이프라인 (02.크롤파이프라인.md)

- 완료 Task: 없음 — 열린 Task가 없어 유휴 대체작업만 수행했다
- 산출물: `docs/press-candidates.md` §재확인 로그(신규)
- 비고: `lib/crawler/*` 현행 코드 독해, `fast-xml-parser` 5.10.1 사용법 확인, EUC-KR 후보(보안뉴스)·UTF-8 후보(블로터)를
  실제로 호출해 재검증했다. 두 후보 모두 URL·인코딩·피드 형식·건수가 문서 기록과 일치하며 살아 있다. 이 확인이
  Task 010A DoD 「EUC-KR로 내려오는 피드에서 제목이 깨지지 않는다」의 검증 자산이 된다.

## 교차검증 결과

- 크롤 파이프라인 → 저장소 계층(Task 004): pass. DoD 5개·구현 규칙 전항 통과, 규약 위반 없음. `nanoid`/`uuid` 미도입을
  grep으로, `press.sourceType === 'html'` 좁힘 후 `!` 단언 없는 셀렉터 접근을 테스트로 실증 확인했다. 계획 외 추가였던
  `keywordRankItemSchema`와 Stopword의 `z.union` 처리는 둘 다 정당하다고 판정했다.
- 저장소 계층 → 화면(Task 019): pass. DoD 5개·함정 5가지 전항 통과, 규약 위반 없음. `build()` 로그 1회(1491ms → 0.7ms →
  0.9ms)와 모델 디렉터리 부재 시 한국어 안내 에러를 외부 임시 스크립트로 직접 실측했고, 확인 후 모델 9개 파일을
  원상 복구했다. `next dev` HMR 재현은 소비 라우트가 없어 못 했고, `lib/crawler/browser.ts:5-11`과 동일한 `globalThis`
  패턴이라는 구조적 근거로 대신했다.

## DoD 충족 현황

| Task | DoD 충족 | 미충족 항목 |
| --- | --- | --- |
| 004 | 5/5 | 없음 |
| 019 | 5/5 | 없음 |

- Playwright MCP 동선(화면·API Task): 해당 없음. 이번 회차 두 Task는 모두 라우트·화면을 만들지 않는 `lib/` 순수 모듈이라
  브라우저에서 태울 동선이 없다. 대신 두 Task 모두 리뷰어가 실제 실행으로 DoD를 실측했다.

## 발견·해결한 이슈

1. [저장소 계층 → 공통] `import 'server-only'`이 있는 모듈을 vitest가 import하지 못한다(I-001) →
   `vitest.config.mts`의 `resolve.alias`에 `'server-only'` → `node_modules/server-only/empty.js`를 팀장이 추가.
   패키지가 이미 갖고 있는 no-op 구현을 그대로 가리키므로 별도 스텁을 만들지 않았다. `import 'server-only'`가 있는
   모듈을 import하는 임시 테스트로 통과를 확인한 뒤 그 파일은 삭제했다(팀장 직접 검증).

Task 019 교차검증 중 부수적으로 발견됐으며 Task 019 자체의 결함은 아니다. 방치하면 Task 005·007·020A·020B가
착수 즉시 막히므로 회차 마감 전에 해소했다.

## 팀장 전체 테스트 (항상 실행)

- npm run lint: 통과 (에러·경고 0건)
- npm run typecheck: 통과 (`next typegen` 타입 생성 성공 후 `tsc --noEmit` 클린)
- npm run test: 통과 (1개 파일 · 9개 케이스 전부 pass — `lib/types/press.test.ts`)
- npm run build: 통과 (Next.js 16.3.0 Turbopack · 8개 정적 페이지 생성 · 라우트 8종)

## 문서 갱신

- docs/ROADMAP/work/*.md 상태 마커: `01.저장소계층.md` Task 004 · `03.화면.md` Task 019
- docs/ROADMAP.md: 완료 체크 004 · 019 · 진행률 Phase 1: 1/4(🟡 진행 중), Phase 5: 1/4(🟡 진행 중), 합계 5/25 (20%)
- docs/ROADMAP/work/*.md 영역 정의: 변경 없음(세 영역 모두 `상태: 활성` 유지)
- docs/ISSUES.md: I-001 등재(해결됨) · docs/DECISIONS.md: D-001 · D-002 등재(유효). draft 3건 병합 후 삭제
- vitest.config.mts: `server-only` alias 추가(I-001 해소)

## 다음 회차에 열리는 Task

- Task 005 (저장소 계층) — 파일 저장소 공통 기반. `의존: Task 004`가 이번 회차로 충족됐다
- Task 010A (크롤 파이프라인) — RSS 피드 파서. `의존: Task 004` 충족
- Task 013A (크롤 파이프라인) — 기사 본문 수집·정제. `의존: Task 004` 충족
- Task 020A는 `의존: Task 019, Task 006`인데 Task 006이 아직이라 열리지 않는다
- 화면은 다음 회차에 열리는 Task가 없다 — 009A가 Task 008A를 기다린다. §유휴 주에 맡길 것 4~8주차 항목이 배정 대상이다

## git

- 브랜치: day-1
- 커밋: 회차 마감 커밋 1건
- 푸시: 사용자 승인 대기
