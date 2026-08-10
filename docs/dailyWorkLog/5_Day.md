# 5일차 작업 로그 (2026-08-10)

## 회차 요약

- 활성 워크스트림: 저장소 계층 · 화면
- 이번 회차 배치 근거: 4일차에 Task 008A(언론사 목록 API)와 020A(키워드 추출 필터)가 끝나면서 008B·020B와
  **첫 화면 Task인 009A·012A**가 열렸다. 크롤 파이프라인은 013B가 008B를 기다려 열린 Task가 없었고, 이 영역의
  유휴 대체작업은 4일차에 이미 소진해 배정할 「맡길 것」이 없어 소환하지 않았다.
- 결과: 이슈 0건(수정 사항 없음). 전체 테스트 통과
- **이 회차로 `ScreenPlaceholder`가 처음 걷혔다** — `/stopwords`가 실제 화면이 됐다.

## 워크스트림별 완료 내역

### 저장소 계층 (01.저장소계층.md)

- 완료 Task: 008B · 언론사 단건 API / 020B · 빈도 집계·분석 요약
- 산출물: `app/api/press/[id]/route.ts` · `lib/keyword/aggregate.ts` · `lib/keyword/aggregate.test.ts`
- 비고: 008B로 **원 Task 008이 완성됐다**. `PATCH`는 `sourceType`이 담기면 전체 교체, 없으면 활성 토글만
  부분 patch로 처리한다. 020B는 `AnalysisSummary` 다섯 수치를 산출하는데, **`filteredTokenCount`를 최종 키워드
  수와 구분해 계산하는 것이 핵심**이다 — 둘이 같아지면 "조사를 걷어냈다"를 증명하는 근거가 무너진다.

### 화면 (03.화면.md)

- 완료 Task: 009A · 언론사 관리 화면(목록 표·카드 리스트·방식 배지) / 012A · 불용어 관리 화면(칩·섹션)
- 산출물: `components/press/{press-table,press-card-list,source-type-badge}.tsx` · `lib/api/press-client.ts` ·
  `app/stopwords/page.tsx` · `components/stopwords/{stopword-chip,stopword-section,stopword-add-card}.tsx` ·
  `lib/api/stopword-client.ts` · `docs/screens/playwright-scenarios.draft.md`(5일차 실행 기록)
- 비고: **009A는 `app/press/page.tsx`를 만들지 않는다** — work 문서가 그것을 009B 몫으로 정했다(D-011).
  따라서 `/press`는 아직 `ScreenPlaceholder`이고 009A의 DoD는 009B 완료 회차에 함께 태운다.
  012A는 `page.tsx`를 소유하므로 `/stopwords`가 실제로 뜨고 브라우저 검증을 마쳤다.

## 교차검증 결과

양방향 리뷰가 **회차 마감 시점에는 도착하지 않아 팀장이 먼저 직접 대조하고 마감했고, 그 뒤에 두 리뷰
결과가 모두 도착했다.** 둘 다 pass였고 팀장 판정과 어긋나는 항목이 없었다. 아래에 두 결과를 모두 남긴다.

- **크롤 파이프라인 → 저장소 계층(008B·020B)**: 전건 pass, 이슈 0건. Next.js 16 규약(설치본 `route.md`의
  Dynamic Route Segments 예시와 시그니처 일치까지 대조), D-008 오류 경계, **`PATCH`의 sourceType 전환이
  레코드를 통째로 교체해 잡종 레코드가 불가능한 것**, D-005 id 불변, D-002 계약 유지, `filteredTokenCount`가
  최종 키워드 수와 분리된 것(`03-hot-keyword.md`의 정의와 1:1 대조)까지 확인했다. D-010(`safeTokenize` 직접
  호출)도 **타당하다고 판정** — `extract.ts`가 이미 같은 패턴을 쓰고 있어 새 예외를 만드는 것이 아니고,
  대안(원 토큰에서 POS 필터를 재구현)은 유지보수가 더 나쁘다는 근거였다.
- **저장소 계층 → 화면(009A·012A)**: 전건 pass, 편차 1건. 설계서 04·05 대조에서 **확인 다이얼로그 문구가
  글자 단위로 동일**한 것까지 확인했고, 표와 카드가 동시에 DOM에 존재하는 구조라 `aria-controls` 대상 id를
  `press-selectors-{id}` / `press-selectors-mobile-{id}`로 분리해 충돌을 피한 것을 "설계서에 없지만 올바른
  판단"으로 짚었다. **편차 1건**: `app/stopwords/page.tsx`가 로딩 중에도 추가 카드·검색 입력을 실물로
  렌더링해 설계서 05 §⑦(각 영역별 skeleton)과 어긋난다 — **6일차 012B 회차에 함께 처리하도록 전달했다.**

### 팀장 직접 검증 (마감 시점에 리뷰가 도착하지 않아 선행 수행)

- **008B `PATCH` 두 분기** — `sourceType`이 담기면 `pressUpdateSchema`로 전체 교체, 없으면 활성 토글만 부분
  patch. 얕은 병합이 아니므로 **잡종 레코드가 생기지 않는다.** D-005대로 `patch.id`는 무시된다.
- **D-008 적용** — 저장소 호출부가 `withErrorBoundary`로 감싸졌고 `error.message`가 응답에 실리는 곳이 없다.
  404 분기는 경계 안에서 `return`이라 500에 삼켜지지 않는다.
- **020B `AnalysisSummary`** — 다섯 수치가 모두 산출되고, 제거 대상 태그(조사 9종·어미 5종·접미사 3종)가
  ROADMAP 목록과 일치한다. 기사 단위로 순회하고 **문자열을 이어 붙이지 않는다.** 정렬은 빈도 내림차순 ·
  동률 가나다순(`localeCompare('ko')`).
- **화면 접근성** — 펼침 버튼 `aria-expanded`/`aria-controls` 연동, **RSS 요약만 행은 버튼 대신 텍스트만**
  렌더링, 아이콘 버튼 `aria-label`에 언론사명 포함, 활성 상태 텍스트 병기, 방식 배지 `aria-hidden`+텍스트.
  012A는 기본/사용자 구분이 **섹션 분리 + 배지 variant + `Lock`** 3중이고 컨테이너 폭이 `max-w-3xl`이다.
- **CONVENTIONS §8** — 하드코딩 색상 0건, raw `<a href="/...">` 0건, lucide 구 별칭은 `components/ui/`
  (shadcn 생성물, 규약상 수정 대상 아님)에만 존재.
- **API 계약** — 두 클라이언트 래퍼가 `{ ok, data }` / `{ ok: false, message }` 봉투를 정확히 풀고,
  `sourceUrl` 파생 필드를 써서 화면에서 `sourceType` 분기를 반복하지 않는다.
- **데이터 무손상** — `data/press-sources.json` 시드 5건(bloter·boannews·inews24·zdnet-korea·naver-d2)과
  `data/stopwords.json` 기본 프리셋 7건(`이번` 포함)이 검증 후 원상 복구됐다.

## DoD 충족 현황

| Task | DoD 충족 | 미충족 항목 |
| --- | --- | --- |
| 008B | 원 Task 008 DoD 5/5 | ④(DELETE 후 `data/runs/*` 무손상)는 **코드로만 확인** — `data/runs/`가 비어 있어 실측 불가. 013B 회차에 재확인 |
| 020B | 집계 몫 4/4 | 없음. 토큰 감소율은 정확 재현 불가한 입력이라 40~70% 밴드로 판정 |
| 009A | 컴포넌트 몫 충족 | **브라우저 검증 4항목은 009B 완료 회차로 이월**(D-006·D-011). 확인하지 않은 것을 충족으로 적지 않았다 |
| 012A | 칩·섹션 몫 충족 | 없음. 012B 몫(추가·일괄·검색)은 이월 |

- **Playwright MCP 동선**:
  - **008B**(저장소 계층) — GET(시드5) → POST(생성) → GET 단건(200) → GET 없는 id(404) → PATCH 활성 토글만
    (`sourceType` 유지) → PATCH 전체 교체 rss→html(`feedUrl` 사라지고 `listUrl` 등장) → PATCH 없는 id(404) →
    DELETE(200) → GET(404) → DELETE 없는 id(404) → GET 전체(시드5만 남음). 008A 잔여 DoD도 별도로 태웠다:
    `?active=true`(4건, naver-d2 제외) · POST 빈값 rss(400, name+feedUrl만) · POST 누락 html(400, 셀렉터 3종만) ·
    최소 rss POST(201) 후 정리.
  - **012A**(화면) — `/stopwords`에서 기본 프리셋 칩 삭제 버튼 → `AlertDialog` 노출, **초기 포커스가 "취소"**임을
    `document.activeElement`로 확인 → 취소로 데이터 보존. 임시 커스텀 칩은 확인 없이 즉시 삭제되고
    `status` 라이브 리전에 안내가 뜨며 섹션이 `EmptyState`로 전환됨을 확인. **1280/768/375px** 확인,
    375px에서 가로 스크롤 없음(`scrollWidth <= innerWidth`). **콘솔 오류 매 단계 0건.**
    `data/stopwords.json`이 최종적으로 시드와 동일함을 대조.
  - **009A** — 라우트가 없어 태울 동선이 없다(D-011). 009B 회차로 이월.

## 발견·해결한 이슈

1. [화면] **소환 프롬프트가 D-006을 009에 잘못 적용**했다 — `app/press/page.tsx`를 009A에 배정했는데 work
   문서는 009B 몫으로 정해 뒀다. **담당이 착수 전에 멈추고 확인을 요청**해 잡혔다. 그대로 갔으면 `page.tsx`
   소유가 두 조각에 겹쳤을 것이다. → **D-011로 규칙 확정**: `page.tsx` 소유는 Task마다 다르며 work 문서가
   단일 소스다. 009는 B가, 012·016·018은 A가 갖는다.
2. [저장소 계층] `aggregate.ts`가 `safeTokenize`를 직접 호출하는 것이 소환 안내와 어긋나 보였다 → **D-010으로
   타당하다고 확정**. `safeTokenize`는 D-002가 확정한 공개 안전 래퍼이고, 이 호출 없이는 `totalTokenCount`를
   얻을 경로가 없다.
3. [화면] 012A의 로딩 상태가 설계서 05 §⑦과 어긋난다 — 추가 카드·검색 입력이 로딩 중에도 실물로 렌더링되고
   칩 자리만 스켈레톤이다. **6일차 012B 회차로 이월**했다. 012B가 그 카드에 실제 입력을 채우면 로딩 중에
   동작하는 입력이 노출되므로 그때 함께 고쳐야 한다.
4. [운영] 화면 워크스트림 에이전트가 한 번 응답 없이 중단돼 **재소환**했고, 교차검증 결과도 마감 시점을
   넘겨 도착했다. 팀장이 먼저 직접 대조해 마감한 뒤 리뷰가 도착했고 **판정이 서로 어긋나지 않았다** —
   다만 리뷰어가 짚은 편차 1건(위 3번)은 팀장 대조에서 놓친 것이라, 독립적 리뷰가 실제로 값을 더한 사례다.

## 팀장 전체 테스트 (항상 실행)

- npm run lint: 통과 (에러·경고 0건)
- npm run typecheck: 통과
- npm run test: 통과 (9개 파일 · 108개 케이스 — 4일차 102건에서)
- npm run build: 통과. `ƒ /api/press/[id]` 신규 등록, `/press`·`/stopwords` 정적 생성

## 문서 갱신

- docs/ROADMAP/work/*.md 상태 마커: `01.저장소계층.md` Task 008B · 020B · `03.화면.md` Task 009A(이월 표기) · 012A
- docs/ROADMAP.md: 완료 체크 **008 · 020**(두 원 Task가 이번에 완성됐다). Task 009·012는 조각만 끝나 진행 메모.
  진행률 Phase 2: 2/5, Phase 5: 2/4, 합계 11/25 (44%)
- docs/ROADMAP/work/*.md 영역 정의: 변경 없음
- docs/DECISIONS.md: D-010 · D-011 등재(유효). draft 2건 병합 후 삭제
- docs/screens/playwright-scenarios.draft.md: 012A 절에 5일차 실행 기록 추가

## 다음 회차에 열리는 Task

- Task 009B (화면) — 언론사 관리 다이얼로그 + `app/press/page.tsx`. `의존: Task 008B, 009A` 둘 다 충족.
  **009A의 이월된 DoD 4개를 이 회차에 함께 태운다**
- Task 012B (화면) — 불용어 추가·검색·삭제 동선. `의존: Task 012A` 충족
- Task 013B (크롤 파이프라인) — 언론사 방식 분기 오케스트레이터. `의존: 013A, 010A, 007, 008B` 전부 충족.
  **4일차에 채운 시드 5건이 이 Task의 검증 자산이다**
- Task 021A는 `의존: 020B, 017`인데 017이 015A를 기다려 아직 열리지 않는다
- **008 DoD ④(DELETE 후 `data/runs/*` 무손상)를 013B가 실제 run을 만든 뒤 실측으로 닫는다**

## git

- 브랜치: day-5 (day-4에서 분기)
- 커밋: 회차 마감 커밋 1건
- 푸시: 사용자 승인 대기
