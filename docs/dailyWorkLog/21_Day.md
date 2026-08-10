# 21일차 작업 로그 (2026-08-11)

## 회차 요약

- 활성 워크스트림: 저장소 계층 · 크롤 파이프라인 · 화면 (3갈래 전부)
- 이번 회차 배치 근거: **선행조건으로 열린 회차가 아니다.** Task 001~025가 20일차까지 전부 완료돼
  로드맵이 비었고, 사용자 요청("IT/AI만이 아니라 설정에 따라 엔터·스포츠·경제·증권도 수집하게 해 달라,
  언론사도 더 늘려 달라, `/results`·`/keywords`에도 반영해 달라")으로 **로드맵에 없던 Task 026~028을
  새로 산정**해 배치했다(ROADMAP Phase 7 신설).
- 결과: 이슈 **6건 발견 / 4건 회차 내 해소 · 2건 보류**, 전체 테스트 4종 전부 통과

회차 앞부분에서 20일차에 남아 있던 **코드 결함 3건(I-002·I-040·I-043)과 I-051**을 먼저 닫았다. 그 커밋 4개는
같은 브랜치에 이미 올라가 있고, 아래 내용은 그 위에 쌓은 카테고리 확장분이다.

## 워크스트림별 완료 내역

### 저장소 계층 (01.저장소계층.md)

- 완료 Task: **Task 026 · 카테고리 도메인 도입과 조회 · 분석 API 확장**
- 산출물: `lib/types/press.ts`(카테고리 `z.enum` 5종 · `PRESS_CATEGORY_LABELS`) · `lib/types/article.ts` ·
  `lib/storage/press-repository.ts` · `app/api/press/route.ts` · `app/api/press/[id]/route.ts` ·
  `app/api/runs/[runId]/articles/route.ts` · `app/api/runs/[runId]/keywords/route.ts` ·
  `app/api/runs/[runId]/route.ts` · `lib/api/query-params.ts`(신규) ·
  `lib/api/article-category-filter.ts`(신규) · `lib/keyword/{analyze-run,keywords-response}.ts` ·
  `lib/api/{press,run,keyword}-client.ts`
- 비고: 회차 중 **팀장이 결정 하나를 되돌렸다** — "카테고리 미상은 필터가 걸려도 통과"를 "제외 +
  `uncategorizedCount`로 알림"으로(D-051). 되돌린 근거는 두 단점의 성격 차이다: 배제안의 단점은
  한시적(Task 027 전까지만 0건)인데 통과안의 단점은 **영구적**(과거 기사가 영원히 모든 필터에 새어 든다).

### 크롤 파이프라인 (02.크롤파이프라인.md)

- 완료 Task: **Task 027 · 카테고리 단위 수집과 언론사 확충**
- 산출물: `lib/types/crawl-run.ts`(`targetCategories` · `crawlStartRequestSchema.categories`) ·
  `lib/storage/run-repository.ts` · `lib/storage/article-file.ts`(기사 txt `# category:` 메타 라인) ·
  `lib/crawler/press-crawler.ts` · `lib/crawler/run-manager.ts` · `app/api/crawl/route.ts` ·
  `docs/press-candidates.md`(§카테고리 확장 후보 조사 신설) · `data/press-sources.json`(12곳 등록)
- 비고: **엔터·스포츠·경제·증권 각 3곳을 실물 HTTP로 확인해 등록**했다(기존 IT/AI 5곳 포함 총 17곳).
  등록 중 curl 인코딩 사고로 한글명이 mojibake가 된 것을 발견해 전량 삭제 후 파일 기반으로 재등록했다.
  `press-defaults.ts` 시드는 **채우지 않았다** — 아래 「팀장 판정」 참고.

### 화면 (03.화면.md)

- 완료 Task: **Task 028 · 네 화면에 카테고리 반영**
- 산출물: `components/common/category-filter.tsx`(신규) · `components/press/{press-form-dialog,press-table,press-card-list}.tsx` ·
  `components/crawl/{press-select-card,crawl-run-panel,press-run-status-list}.tsx` ·
  `components/results/{run-summary-card,article-file-list}.tsx` · `components/keywords/analysis-filter-bar.tsx` ·
  `app/{page,press/page,results/page,keywords/page}.tsx` · `app/layout.tsx` ·
  `components/layout/site-header.tsx` · `docs/screens/{00,01,02,03,04,README,verification-checklist.draft}.md`
- 비고: 앱 제목을 `IT/AI 뉴스 핫 키워드 크롤러` → `뉴스 핫 키워드 크롤러`로 정정했다.

## 교차검증 결과

- **저장소 계층 → 화면(Task 028)**: 6개 항목 중 **4 PASS · 2 FAIL**.
  - FAIL ① `run-summary-card.tsx`의 「대상 카테고리」 라벨이 거짓을 말한다 — 값이 실행 속성이 아니라
    사용자가 지금 고른 필터 state의 echo이고, 두 컴포넌트가 같은 state를 공유해 **필터를 바꾸면 과거 실행이
    겨냥한 대상이 바뀌어 보인다.** 설계서에는 이 재정의가 적혀 있었지만 **화면에는 없어** 설계서를 읽지 않는
    사용자는 속는다.
  - FAIL ② 앱 제목 변경 파급이 `docs/screens/verification-checklist.draft.md`에 안 미쳤다 — 옛 문구가
    **"기대 결과"로** 남아 그 문서로 QA하면 지금 실제 문구를 오답으로 판정한다.
- **화면 → 크롤 파이프라인(Task 027)**: **6개 항목 전부 PASS** + 문서 낡음 1건.
  - 기사 txt 하위호환을 테스트만이 아니라 **실물로 대조**했다(과거 run 0/6 · 신규 run 13/13, 메타 블록 7→8줄).
  - 등록 언론사 12곳 중 4곳을 다시 curl로 두드려 응답 코드·인코딩·아이템 수가 문서 기록과 일치함을 확인했고,
    죽은 후보(한국경제)까지 스팟체크해 제외 사유가 사실임을 검증했다.
  - 낡음: `docs/press-candidates.md`가 "`DEFAULT_PRESS_SOURCES`에도 12곳을 추가했다"고 적었으나 실물은 빈 배열.
- **크롤 파이프라인 → 저장소 계층(Task 026)**: **3 PASS · 1 FAIL**.
  - FAIL `/keywords`의 `message`가 거짓을 말한다 — `articleCount`가 **필터 통과 후** 값이라, 기사가 실제로
    있는 run에 `이 실행에는 수집된 기사가 없어…`가 뜬다. 그 필드 docstring이 "원본 자체가 없었다"만
    나타내야 한다고 **스스로 못박아 뒀는데** 구현이 어긋났다.
  - 캐시 미오염을 `keywords.json`의 `analyzedAt`이 재계산 후에도 **한 글자도 안 바뀌는 것**으로 확인했다
    (I-030 재발 없음).

## DoD 충족 현황

| Task | DoD 충족 | 미충족 항목 |
| --- | --- | --- |
| 026 | 3/3 | 없음 |
| 027 | 6/6 | 없음 |
| 028 | 8/8 | 없음 |

- Playwright MCP 동선: `/press`에서 카테고리를 골라 언론사를 등록하고 뱃지·필터 확인 → `/`에서 언론사가
  `IT/AI (4)`·`경제 (1)` 그룹으로 묶이고 그룹 체크박스가 3단 상태로 동작하는 것 확인 → `/results`에서
  카테고리 필터로 좁히고 「카테고리 미상 20건은 제외했습니다」 안내 확인, run `20260811-075740`은
  「대상 카테고리: 스포츠」가 뜨고 과거 run은 **그 행 자체가 없는 것** 확인 → `/keywords`에서 「증권」을 걸어
  「선택한 카테고리에 해당하는 기사가 없습니다」와 [카테고리 필터 해제] 동작 확인. 콘솔 에러 0건.
- **실측 미도달 1건**: `/keywords`의 "원본 0건" 안내는 dev 서버에 `successCount = 0`인 run이 실재하지 않아
  브라우저 재현을 못 했다(29개 run 전수 확인). 조건식·분기 순서를 코드 레벨로 확인하고 vitest로 덮었다 —
  **UI 실측이 아님을 그대로 기록한다.**

## 발견·해결한 이슈

1. [저장소 계층] `Press.category` 기본값 도입이 크롤 파이프라인·화면 2개 파일의 타입체크를 깼다(**I-052**,
   I-050과 같은 형태) → 세 워크스트림이 각자 소유한 파일에서 닫았다(2+3+2곳). 마감 게이트에서 0건 확인.
2. [화면] 「대상 카테고리」 라벨이 필터 echo를 실행 속성처럼 말했다 → 라벨을 「카테고리 필터」로 바꾸고,
   Task 027이 만든 `targetCategories`를 저장소 계층이 `RunSummary`에 실어 **진짜 「대상 카테고리」 행을
   따로 세웠다.** 두 행을 `Separator`로 구조 분리 (재검증 저장소 계층 pass)
3. [화면] 앱 제목 파급이 검증 체크리스트에 안 미쳤다 → 기대값 갱신 + `docs/screens/` 전수 grep (재검증 pass)
4. [저장소 계층] `/keywords`의 `message`가 필터로 0건이 된 run에도 "수집된 기사가 없다"고 말했다 →
   `sourceArticleCount`(필터 **전** 원본 수)를 신설해 게이트를 그 값으로 옮겼다 (재검증 크롤 파이프라인 pass)
5. [화면] `result.message`가 조건 가드로만 쓰이고 **렌더링 경로가 없었다** → 서버가 만든 문장을 그대로 쓰는
   분기를 최우선 순위로 추가. `sourceArticleCount === 0`이면 `articleCount`도 0이라 조건이 겹치므로
   **순서가 중요하다**(안 그러면 가장 흔한 경우가 "필터를 낮추라"로 샌다)
6. [크롤 파이프라인] `docs/press-candidates.md`가 시드에 12곳을 추가했다고 적었으나 실물은 빈 배열 →
   결정 번복 사실이 드러나게 다시 썼다

보류 2건: **I-053**(카테고리 필터가 `keywords.json` 캐시를 우회해 매 요청 재집계 — 재검토 조건 명시) ·
**I-054**(완전 초기 상태에서 17곳을 손으로 입력해야 함 — 다음 회차에 화면과 함께 검토).

### 팀장 판정 3건

- **`press-defaults.ts` 시드를 채우지 않는다.** 배정문 6번이 "시드를 조사 결과로 채우라"고 했는데 그것이
  **I-037과 정면으로 부딪혔다**(빈 배열은 누락이 아니라 화면 설계서 04의 「언론사 0건」 빈 상태를 코드화한
  것). 지시가 틀렸다 — 사용자 요청은 `data/press-sources.json` 등록으로 충족되고, 시드를 채우면 검증까지
  끝낸 화면 상태 하나가 죽는다. 크롤 파이프라인이 독립적으로 **더 단단한 근거**를 찾았다: 시드를 채우면
  `press-repository.test.ts` 6건이 깨진다 — 저장소 계층 테스트가 그 전제를 코드로 못박아 두고 있었다.
- **카테고리 미상 필터 규칙을 뒤집었다**(위 「저장소 계층」 비고 · D-051).
- **문서 스윕은 팀장이 했다.** `CLAUDE.md`·`README.md`·`docs/PRD.md`·`docs/ROADMAP.md`·
  `docs/SCHEDULE/SCHEDULE.md`의 제품 제목·개요를 카테고리 확장에 맞게 정정했다. **완료된 게이트 조건은
  일부러 두었다** — `ROADMAP.md:410`·`SCHEDULE.md:167`의 "실제 IT/AI 언론사 최소 3곳"은 Phase 2·M2의
  **당시** 요구사항이고 이미 충족돼 닫힌 항목이라, 지금 문구로 덮으면 그때 무엇을 요구했는지가 사라진다.

### 이번 회차에서 반복된 실패 패턴 (다음 회차 참고)

**"고쳤다"는 보고를 실물로 확인했더니 다른 것이 고쳐져 있거나 절반만 된 경우가 3회 나왔다** — draft 결정
문서(코드와 정반대로 남음) · `/keywords` 0건 분기(unused import만 확인하고 본 작업 누락) · `result.message`
렌더링(3번 케이스를 1번으로 답함). 셋 다 보고를 그대로 믿었으면 마감에 실려 나갔다.
**게이트 직전에 팀장이 `grep`으로 핵심 지점을 직접 훑는 절차가 이번 회차를 구했다.** 다음 회차도 같은 절차를
유지한다 — 특히 "손대지 않았다 / 이미 되어 있다"는 보고는 반드시 실물로 확인한다.

## 팀장 전체 테스트 (항상 실행)

- npm run lint: 통과 (error·warning 0건)
- npm run typecheck: 통과 (`next typegen && tsc --noEmit`)
- npm run test: 통과 — **23파일 275케이스** (회차 시작 시점 227 → 275, 신규 48건)
- npm run build: 통과 (19개 라우트)

## 문서 갱신

- docs/ROADMAP/work/*.md 상태 마커: Task 026(01.저장소계층) · Task 027(02.크롤파이프라인) · Task 028(03.화면)
  — 셋 다 `상태: 완료 (21일차, 2026-08-11)`
- docs/ROADMAP.md: **Phase 7 신설**(수집 카테고리 확장) · 완료 체크 026·027·028 ·
  진행률 Phase 7: 3/3, 합계 **28/28 (100%)**. Phase 0~6이 MVP이고 Phase 7은 그 뒤 확장임을 표 아래 명시
- docs/ROADMAP/work/*.md 영역 정의: 변경 없음(세 영역 모두 `상태: 활성` 유지)
- 이슈·결정 병합: **I-052~I-055** · **D-050~D-055** 부여 후 본문 병합, draft 4개 파일 삭제
- 그 외: `CLAUDE.md`·`README.md`·`docs/PRD.md`·`docs/SCHEDULE/SCHEDULE.md` 제품 설명 정정

## 다음 회차에 열리는 Task

- **없음** — 로드맵 28개 Task가 전부 완료다. 다음 회차는 새 요청이 오거나 보류 이슈를 여는 회차가 된다.
- 먼저 볼 후보: **I-054**(초기 상태 언론사 0건 입력 부담 — 화면 워크스트림과 함께) ·
  **I-053**(카테고리 필터 캐시 우회 비용) · **I-029**·**I-047**·**I-031**(회차 운영·대기 항목)

## git

- 브랜치: day-21
- 커밋: 카테고리 확장 3커밋(026·027·028) + 문서·마감 1커밋 (아래 커밋 로그 참고)
- 푸시: 사용자 승인 후 진행
