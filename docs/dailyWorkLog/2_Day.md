# 2일차 작업 로그 (2026-08-10)

## 회차 요약

- 활성 워크스트림: 저장소 계층 · 크롤 파이프라인 · 화면(유휴 배정)
- 이번 회차 배치 근거: 1일차에 Task 004(도메인 타입)가 끝나면서 그 위에 얹히는 Task 005(저장소 계층)와
  Task 010A·013A(크롤 파이프라인)가 동시에 열렸다. 화면은 009A가 Task 008A를 기다려 열린 Task가 없으므로
  `03.화면.md` §유휴 주에 맡길 것 4~8주차 항목을 배정했다.
- 결과: 이슈 3건 발견 / 2건 회차 내 수정·재검증 통과, 1건 보류 확정. 전체 테스트 통과

## 워크스트림별 완료 내역

### 저장소 계층 (01.저장소계층.md)

- 완료 Task: 005 · 파일 저장소 공통 기반 (경로 · 원자적 쓰기 · 시드)
- 산출물: `lib/storage/{paths,json-store,index}.ts` · `lib/storage/paths.test.ts`
- 비고: 교차검증 지적으로 `runsRootDir()`(I-003)와 `atomicWriteFile(path, content)`(D-004)를 회차 안에서 추가했다.
  둘 다 Task 005 원래 DoD에는 없던 것이고, Task 007이 이 계층 위에 얹히는 순간 드러날 구멍이라 지금 막았다.

### 크롤 파이프라인 (02.크롤파이프라인.md)

- 완료 Task: 010A · RSS 피드 파서 / 013A · 기사 본문 수집·정제
- 산출물: `lib/crawler/rss.ts` · `lib/crawler/rss.test.ts` · `lib/crawler/article-parser.ts` ·
  `lib/crawler/article-parser.test.ts` · `lib/crawler/index.ts`(재수출)
- 비고: 두 Task 모두 **원 Task의 조각**이다. `docs/ROADMAP.md`의 `### Task 010`·`### Task 013` 블록은 체크하지
  않고 진행 메모만 남겼다 — 010B(소스 테스트 API·폼 연동)와 013B(언론사 방식 분기)가 남아 있다.
  교차검증 지적으로 `fetchFeed`의 실패 반환 계약을 값 기반으로 바꿨다(D-003).

### 화면 (03.화면.md)

- 완료 Task: 없음 — 열린 Task가 없어 유휴 대체작업만 수행했다
- 산출물: `docs/press-candidates.md` §재확인 로그 갱신
- 비고: 화면 설계서 04·05의 TSX 스켈레톤 인터페이스 4종을 1일차 산출 `lib/types`와 필드 단위로 대조해
  **전부 일치**함을 확인했다 — 009A·012A가 스켈레톤을 그대로 옮겨도 되는 것이 미리 확정됐다. 또 아직 아무도
  두드려 보지 않은 HTML형(ZDNet 코리아)의 목록 셀렉터와 RSS 전문형(아이뉴스24)의 `contentSelector`를 실물로
  검증했다. 1일차에 다른 영역이 EUC-KR·UTF-8 피드를 이미 재검증했으므로 중복하지 않았다.

## 교차검증 결과

- 크롤 파이프라인 → 저장소 계층(Task 005): 1차 pass + 이슈 2건. DoD 4개·구현 규칙·규약은 전부 통과했으나,
  Task 007 소비 관점에서 runs 루트 헬퍼 부재와 텍스트 원자적 쓰기 부재를 짚었다. 수정 후 재검증 pass —
  `runDir`가 리팩터링된 뒤에도 `assertSafeSegment` 호출 순서가 유지되어 경로 순회 차단 17건이 그대로
  통과함을 재실행으로 확인했다.
- 화면 → 크롤 파이프라인(Task 010A·013A): 1차 pass + 이슈 1건. 판정 대상 DoD와 함정 항목은 전부 통과했으나,
  `fetchFeed`만 실패를 예외로 던져 같은 계층의 `fetchHtml`(값 반환)과 어긋나는 점을 짚었다. 수정 후 재검증
  pass — `fetchFeed` 본문 전체가 하나의 `try/catch`로 감싸져 어느 단계에서 던져도 값으로 귀결되는 것과,
  실패 케이스가 4건에서 5건으로 늘었을 뿐 줄지 않은 것을 확인했다.

## DoD 충족 현황

| Task | DoD 충족 | 미충족 항목 |
| --- | --- | --- |
| 005 | 4/4 | 없음 |
| 010A | 4/4 (조각 몫) | 없음. 010B 몫 3개(`test-source` 응답 형식·셀렉터 0개 Alert·Playwright MCP 화면 검증)는 이월 |
| 013A | 4/4 (조각 몫) | 없음. 013B 몫 6개(세 경로 수집·`contentSource` 기록·Playwright 미기동·저장 txt 개행)는 이월 |

- Playwright MCP 동선(화면·API Task): 해당 없음. 이번 회차 산출물은 모두 라우트·화면이 없는 `lib/` 모듈이라
  브라우저에서 태울 동선이 없다. 대신 세 Task 모두 실물 데이터로 검증했다 — 원자적 쓰기는 실제 `SIGKILL`로,
  RSS 파서는 EUC-KR(보안뉴스)·UTF-8(블로터)·Atom(네이버 D2) 세 피드로, 본문 정제기는 ZDNet(개행 18개)·
  아이뉴스24(개행 20개) 실기사로 확인했다.

## 발견·해결한 이슈

1. [저장소 계층] `paths.ts`에 runs 루트 디렉터리 헬퍼가 없어 Task 007이 경로를 `paths.ts` 밖에서 조립하게
   된다(I-003) → `runsRootDir()` 추가, `runDir`를 그 위에서 조립하도록 정리 (재검증 크롤 파이프라인 pass)
2. [저장소 계층] 기사 txt는 JSON이 아닌데 텍스트용 원자적 쓰기가 없다 → temp→rename 핵심부를
   `atomicWriteFile(path, content)`로 분리하고 `writeJson`을 얇은 래퍼로 (D-004, 재검증 pass)
3. [크롤 파이프라인] `fetchFeed`만 실패를 예외로 던져 같은 계층의 `fetchHtml`과 오류 처리 관용구가 갈린다 →
   `FeedFetchResult = FeedFetchSuccess | CrawlFailure`로 값 반환. 실패 타입은 새로 만들지 않고 기존
   `CrawlFailure`를 그대로 재사용해 013B가 두 분기를 한 핸들러로 처리할 수 있게 했다 (D-003, 재검증 화면 pass)
4. [보류] `writeJson` 크래시 시 남는 orphan `.tmp` 정리 로직 없음(I-002) — 쓰기 함수 안에서 막을 수 있는
   문제가 아니라 부팅 시점 정리 루틴이 필요하다. 정합성 문제가 없어 담당·리뷰어 판단이 일치해 보류했다.

## 팀장 전체 테스트 (항상 실행)

- npm run lint: 통과 (에러·경고 0건)
- npm run typecheck: 통과 (`next typegen` 성공 후 `tsc --noEmit` 클린)
- npm run test: 통과 (4개 파일 · 55개 케이스 — 1일차 9건에서 55건으로)
- npm run build: 통과 (Next.js 16.3.0 Turbopack · 라우트 8종)

## 문서 갱신

- docs/ROADMAP/work/*.md 상태 마커: `01.저장소계층.md` Task 005 · `02.크롤파이프라인.md` Task 010A·013A
- docs/ROADMAP.md: 완료 체크 **005만**. Task 010·013은 조각만 끝나 체크하지 않고 진행 메모를 남겼다.
  진행률 Phase 1: 2/4(🟡 진행 중), Phase 5: 1/4(🟡 진행 중), 합계 6/25 (24%)
- docs/ROADMAP/work/*.md 영역 정의: 변경 없음(세 영역 모두 `상태: 활성` 유지)
- docs/ISSUES.md: I-002(보류) · I-003(해결됨) 등재 · docs/DECISIONS.md: D-003 · D-004 등재(유효).
  draft 1건 병합 후 삭제

## 다음 회차에 열리는 Task

- Task 006 (저장소 계층) — 언론사·불용어 레포지토리. `의존: Task 005`가 이번 회차로 충족됐다
- Task 007 (크롤 파이프라인) — 실행·기사·키워드 레포지토리 및 기사 txt 포맷. `의존: Task 005` 충족.
  D-004로 `atomicWriteFile`을, I-003으로 `runsRootDir()`을 그대로 가져다 쓰면 된다
- Task 010B는 `의존: Task 010A, Task 009B`인데 009B가 아직이라 열리지 않는다
- Task 013B는 `의존: 013A, 010A, 007, 008B` — 007·008B가 남아 열리지 않는다
- 화면은 다음 회차에도 열리는 Task가 없다(009A가 008A 대기). 유휴 배정이 이어진다

## git

- 브랜치: day-2 (day-1에서 분기 — 2일차 작업이 1일차 산출물 위에 얹히므로 main에서 따지 않았다)
- 커밋: 회차 마감 커밋 1건
- 푸시: 사용자 승인 대기
