# 01. 크롤링 실행 페이지 (홈)

## 개요

| 항목 | 내용 |
|------|------|
| 역할 | 크롤링 대상 언론사를 고르고 크롤링을 시작하는 앱의 진입점(홈) |
| 구현 기능 ID | `F001`(언론사 선택 크롤링 실행) · `F002`(진행 상태 표시) · `F003`(수집 기사 txt 저장) · `F007`(언론사 레지스트리 연동) |
| 진입 경로 | 앱 접속 시 기본 진입 페이지. 다른 페이지에서는 헤더의 "크롤링 실행" 메뉴 클릭 |
| 다음 이동 | 크롤링 완료 → [수집 결과 페이지](./02-collect-result.md) · 대상 언론사 추가/삭제 필요 → [언론사 관리 페이지](./04-press-manage.md) |
| 파일 위치 | `app/page.tsx` (앱의 루트 라우트) |

이 페이지는 F007로 등록된 **활성 언론사** 목록을 체크박스로 보여주고, 선택된 언론사만 대상으로 F001 크롤링을 실행하며, 진행 중에는 F002 진행 상태를, 완료 후에는 F003 저장 결과를 같은 화면 안에서 보여준다. 별도 진행 상태 페이지로 이동하지 않고 **한 화면 안에서 선택 → 실행 → 진행 → 완료가 모두 일어나는 것**이 이 화면의 핵심 설계 원칙이다.

---

## 화면 구성

| 영역 | 목적 |
|------|------|
| ① 페이지 헤더 | Breadcrumb + `h1` + 설명 (공통 규격, [00-app-shell.md](./00-app-shell.md) 참고) |
| ② 언론사 선택 | 선택 요약("N/M개 선택됨") + 전체 선택/해제 + 활성 언론사 체크박스 목록(F007 연동) |
| ③ 크롤링 옵션 | 언론사당 최대 수집 기사 수 (선택 사항, ④ 패널 안에 보조적으로 배치) |
| ④ 실행 & 진행 상태 패널 | [크롤링 시작]/[중단] 버튼 + 전체 진행률 + 언론사별 진행 상태 + 완료/실패 결과 요약(F001·F002·F003) |

### 레이아웃 결정: `lg:` 2단(좌: 목록 / 우: 실행 패널 sticky)

- **채택**: `lg:grid lg:grid-cols-[1fr_360px] lg:items-start`, 우측 패널에 `lg:sticky lg:top-20`.
- **근거**:
  1. 공통 디자인 스펙 자체가 `lg:` 이상에서 "좌우 2단 레이아웃(목록 + 상세)"을 표준으로 명시하고 있고, 이 화면은 정확히 그 형태(목록=언론사 선택, 상세=실행/진행 상태)다.
  2. 크롤링은 수십 초~수 분이 걸린다(F002 요구사항). 진행 상태를 계속 지켜봐야 하므로, 언론사 목록을 스크롤하는 동안에도 진행률·버튼이 화면에 붙어 있어야(sticky) 사용성이 좋다. 1단 레이아웃이면 진행 상태를 보려고 아래로 스크롤해야 한다.
  3. 언론사 목록(좌)과 실행 결과(우)는 서로 다른 갱신 주기를 가진 별개의 정보 단위이므로 카드로 분리하는 것이 명확하다.
- **`lg:` 미만(모바일/태블릿 세로)**: 우측 패널을 sticky로 유지할 가로 공간이 없고, 진행 중에는 목록을 다시 조작할 필요가 없으므로 **1단으로 순서대로 쌓는다**(② 목록 → ④ 실행 패널). sticky를 강제하지 않는다.

### 스크롤 처리 결정: 언론사 목록에 `ScrollArea` + 고정 높이

- 언론사 5개(스크롤 불필요)와 30개(스크롤 필요) 모두에서 카드 높이가 무너지지 않도록, 언론사 체크박스 목록에 `max-h-[420px]`(모바일은 `max-h-[320px]`) + `ScrollArea`를 적용한다.
- 5개처럼 목록이 짧으면 `ScrollArea`가 스크롤바 없이 내용만큼만 보이고, 30개처럼 길면 카드 높이는 고정된 채 목록만 내부 스크롤된다 → 우측 실행 패널의 sticky 위치가 항상 안정적으로 유지된다.
- 우측 패널의 "언론사별 진행 상태 리스트"도 같은 이유로 `max-h-[240px]` + `ScrollArea`를 적용한다(선택 언론사가 많을 때 패널이 화면보다 길어지는 것을 방지).

### 크롤링 옵션 노출 범위 결정: "언론사당 최대 수집 기사 수"만 노출, 동시성은 미노출

- `lib/crawler/config.ts`의 `concurrency`/`timeoutMs`/`delayMs`는 `.env.local`의 `CRAWL_CONCURRENCY` 등으로 이미 조정 가능하다.
- **동시성(concurrency)은 화면에 노출하지 않는다.** 대상 언론사 서버에 부담을 주지 않기 위한 안전장치(코드 주석: "대상 서버에 부담을 주지 않는 선에서 설정") 성격이 강해, 매 실행마다 사용자가 건드릴 값이 아니라 환경 단위로 한 번 정해두는 값으로 본다. 화면에 노출하면 1인 로컬 도구라 해도 값을 과도하게 올려 상대 서버에 부담을 줄 위험이 있다.
- **"언론사당 최대 수집 기사 수"는 노출한다.** 이 값은 서버 부담과 무관하게 "이번 실행에서 얼마나 수집할지"를 결정하는, 실행마다 바뀔 수 있는 테스트 파라미터라 화면 노출이 자연스럽다(기본값 20건, 선택 사항).
- `maxArticlesPerPress`는 이미 구현돼 있다 — `lib/types/crawl-run.ts:44`의 `crawlStartRequestSchema`(`pressIds`와 함께 크롤링 시작 요청 바디를 이룬다)에 선택 필드로 있다. (19일차, 크롤 파이프라인 발견·화면 정정: 이 문장은 원래 "아직 없으니 나중에 추가해야 한다"고 적혀 있었는데 세 가지가 동시에 틀렸다 — ① 필드는 이미 있고, ② 가리키던 파일(`lib/crawler/types.ts`)이 아니라 `lib/types/crawl-run.ts`가 제자리이며, ③ 가리키던 스키마 이름 `crawlRequestSchema`는 14일차 Task 023이 삭제한 죽은 이름이다(D-039). "미구현" 취지의 문장이 통째로 무효라 완료된 사실로 바꿔 썼다 — 문장을 걷어내면 이 값이 화면에 노출될 스키마 근거 자체가 문서에서 사라지기 때문이다.)

---

## 카테고리 확장 (21일차 신규 기능, Task 028)

`docs/ROADMAP.md`에 없는 신규 기능이다. 저장소 계층(Task 026)이 `Press.category`
(`'it-ai'|'entertainment'|'sports'|'economy'|'stock'`)와 `PRESS_CATEGORY_LABELS`(한국어 표시명 맵,
`lib/types/press.ts`)를 확정했고, 이 화면은 그 값을 아래 두 곳에 반영한다.

- **② 언론사 선택 카드가 카테고리로 묶인다.** `components/crawl/press-select-card.tsx`가
  `press.category`로 목록을 그룹핑해, 카테고리 헤더(`{PRESS_CATEGORY_LABELS[category]} ({개수})`)마다
  전체 선택/해제 체크박스(`Checkbox` + `Label`, 전체 선택과 같은 3단 상태)를 둔다. 그룹은
  `pressCategorySchema.options` 고정 순서를 따르고, 언론사가 없는 카테고리는 렌더링하지 않는다.
  라벨 문자열은 항상 `PRESS_CATEGORY_LABELS`에서 가져오고 직접 타이핑하지 않는다.
- **④ 진행 패널에 현재 처리 중인 카테고리가 드러난다.** "현재: {언론사명} — n/m건" 문구에
  `{언론사명} · {카테고리}` 형태로 카테고리를 덧붙이고, 언론사별 상태 리스트(`press-run-status-list.tsx`)의
  각 행에도 `Badge variant="outline"`로 카테고리를 표시한다. `RunProgress`(크롤 파이프라인 소유
  스키마)에는 카테고리 필드가 없으므로, `app/page.tsx`가 이미 들고 있는 `pressList`에서
  `pressId → category` 맵을 만들어 클라이언트에서 join한다 — 저장소·크롤 파이프라인 타입은
  건드리지 않는다.

이 변경은 `press-select-card.tsx`·`crawl-run-panel.tsx`·`press-run-status-list.tsx`·`app/page.tsx`에만
영향을 주고, 크롤링 시작 요청(`crawlStartRequestSchema`)이나 진행 상태 폴링 응답 스키마는 바뀌지 않았다.

---

## 와이어프레임 — 데스크톱 (≥1024px)

아이콘 자리 표기: `▶`=Play, `⚙`=Settings2 (아래 "사용 컴포넌트"의 lucide 목록과 대응)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [헤더 1줄 축약] 🕷️ 로고 · 크롤링 실행/수집 결과/핫키워드분석/          │
│                 언론사 관리/불용어 관리 · 🌙 다크모드 토글             │
└──────────────────────────────────────────────────────────────────────┘

  크롤링 실행                                             ← ① 페이지 헤더
  크롤링 실행
  언론사를 선택하고 크롤링을 시작하세요

  ┌─ ② 언론사 선택 ──────────────────────────┐  ┌─ ④ 크롤링 실행 ──────┐
  │ 언론사 선택              0/8개 선택됨    │  │ 크롤링 실행           │
  │───────────────────────────────────────  │  │──────────────────────│
  │ [ ] 전체 선택        [ 전체 해제 ]       │  │ ⚙ 언론사당 최대 기사 수│
  │                                          │  │ [   20   ] 건 (선택)  │
  │ role="group" aria-labelledby="..."       │  │                       │
  │ ┌──────────────────────────────────────┐│  │ [[ ▶ 크롤링 시작 ]]   │
  │ │[ ] 테크위클리          〔RSS〕[활성] ││  │      (disabled)       │
  │ │    techweekly.example.com/rss.xml    ││  │ 언론사를 1개 이상     │
  │ │[ ] AI투데이            〔RSS〕[활성] ││  │ 선택하세요            │
  │ │    aitoday.example.com/feed          ││  └───────────────────────┘
  │ │[ ] 디지털인사이트     〔HTML〕[활성] ││    lg:sticky top-20
  │ │    digitalinsight.example.com/list   ││
  │ │[ ] 넥스트IT            〔RSS〕[활성] ││
  │ │    nextit.example.com/rss            ││
  │ │[ ] 코드리뷰데일리     〔HTML〕[활성] ││
  │ │    codereviewdaily.example.com/...   ││
  │ │ …  (스크롤 시 3개 더 — ScrollArea)   ││
  │ └──────────────────────────────────────┘│
  └───────────────────────────────────────────┘
  좌: 1fr, 우: 360px 고정 폭 (lg:grid-cols-[1fr_360px])
```

---

## 와이어프레임 — 모바일 (<640px)

```
┌────────────────────────────┐
│ [헤더 1줄 축약, 햄버거 ☰]   │
└────────────────────────────┘

 크롤링 실행              ← ①
 크롤링 실행
 언론사를 선택하고
 크롤링을 시작하세요

 ┌─ ② 언론사 선택 ─────────┐
 │ 0/8개 선택됨             │
 │ [ 전체 선택 ][전체 해제] │
 │─────────────────────────│
 │[ ] 테크위클리     [활성]│
 │  techweekly.exampl…     │
 │[ ] AI투데이       [활성]│
 │  aitoday.example.c…     │
 │[ ] 디지털인사이트 [활성]│
 │  digitalinsight.ex…     │
 │ … (스크롤 — ScrollArea) │
 └──────────────────────────┘

 ┌─ ④ 크롤링 실행 ─────────┐
 │ ⚙ 언론사당 최대 기사 수 │
 │ [  20  ] 건 (선택)      │
 │                          │
 │ [[   ▶ 크롤링 시작   ]] │
 │  (disabled)              │
 │ 언론사를 1개 이상        │
 │ 선택하세요                │
 └──────────────────────────┘
 1컬럼 순서: ②(목록) → ④(실행), sticky 미적용
```

---

## 영역별 컴포넌트 명세

| 영역 | UI 컴포넌트 | Tailwind 클래스 | 비고 |
|------|-------------|-----------------|------|
| 본문 컨테이너 | `PageContainer` (`components/common/page-container.tsx`) | 컴포넌트가 `<main className="flex-1">` + `container mx-auto max-w-6xl px-4 py-6 md:py-8`을 제공 | **이 마크업을 페이지에서 다시 쓰지 않는다.** `<main>`이 여기 있어야 `app/layout.tsx`의 `flex min-h-full flex-col` 아래에서 셸 레이아웃이 성립한다 |
| ① 페이지 헤더 | `PageHeader` (`components/common/page-header.tsx`) | 컴포넌트 내부에 `mb-6`, `text-2xl font-semibold tracking-tight md:text-3xl`, `text-sm text-muted-foreground mt-1` | `breadcrumbs`/`title`/`description` prop만 넘긴다. Breadcrumb 링크는 컴포넌트가 `BreadcrumbLink asChild` + `next/link`로 처리하므로 raw `href`를 쓰지 않는다 |
| 전체 레이아웃 | `div` (grid) | `grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start` | `PageHeader` 아래 본문 영역. 컬럼 폭 결정은 위 "레이아웃 결정" 참고 |
| ② 카드 | `Card`, `CardHeader`, `CardTitle`, `CardContent` | 기본 카드 스타일 | 헤더에 요약 텍스트를 `CardAction` 자리에 배치 |
| 선택 요약 텍스트 | `span` | `text-sm text-muted-foreground`, `id="press-select-summary"` | `role="status" aria-live="polite"`로 개수 변경 시 즉시 안내 |
| 전체 선택 | `Checkbox` + `Label` | `flex items-center gap-2` | `checked`가 `true \| false \| "indeterminate"` 3단 |
| 전체 해제 | `Button` (`variant="outline" size="sm"`) | — | 선택 0개면 `disabled` |
| 구분선 | `Separator` | `my-2` | 요약 바와 목록 사이 |
| 목록 컨테이너 | `ScrollArea` | `h-[420px] pr-3` (모바일 `h-[320px]`) | 내부 `<ul role="group">` |
| 언론사 1건 | `Checkbox` + `Label`(`htmlFor`로 감싸는 큰 클릭 영역) + `Badge` | `flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 hover:bg-muted` | 이름 `text-sm font-medium`, URL `font-mono text-xs text-muted-foreground`, 활성 배지 `Badge variant="secondary"` |
| ④ 카드 | `Card` | `lg:sticky lg:top-20` | 앱 셸 헤더(`h-14`) + 여백 고려한 sticky 오프셋 |
| ③ 크롤링 옵션 | `Label` + `Input type="number"` | `Input` `w-24`, 보조문구 `text-xs text-muted-foreground` | `Settings2` 아이콘을 라벨 앞에 |
| 실행 버튼 | `Button size="lg"` | `w-full`, 아이콘 `Play`/`Square` | 상태에 따라 라벨·아이콘·variant 전환 |
| 전체 진행률 | `Progress` | `h-2` | 컨테이너에 `role="status" aria-live="polite"` |
| 현재 처리 중 텍스트 | `p` | `text-sm text-muted-foreground` | "현재: {언론사명} — {n}/{m}건" |
| 언론사별 상태 리스트 | `ScrollArea` + `ul` + 상태 아이콘(`Clock`/`LoaderCircle`/`CircleCheckBig`/`CircleX`) | `h-[240px]` | 대기/진행중/완료/실패 4 상태 |
| 완료 요약 | `p`, `Button variant="outline"` | — | 저장 경로/파일 수 + `[수집 결과 보기]`(`ArrowRight` 아이콘) |
| 부분 실패 알림 | `ErrorAlert` (`components/common/error-alert.tsx`) | — | 내부가 `Alert variant="destructive"` + `TriangleAlert` + `AlertTitle` + `AlertDescription`이다. `title`·`description`만 넘기고 같은 마크업을 다시 그리지 않는다 |
| 빈 상태(언론사 0개) | `EmptyState` (`components/common/empty-state.tsx`) | 컴포넌트 내부(`Empty` 프리미티브) | `icon`/`title`/`description`/`actionLabel`/`actionHref="/press"`를 넘긴다. ② 카드 전체를 대체하며, 00-app-shell.md가 정한 01~05 공용 빈 상태 블록이다 |
| 로딩(목록) | `Skeleton` 반복 | `h-12 w-full rounded-lg` × N | ② 카드 내부, 체크박스 행 자리를 대체 |

---

## 상태별 화면

### ① 기본 (선택 전)

```
② 언론사 선택 — 0/8개 선택됨, 전체 선택 체크박스 unchecked
④ 크롤링 실행
  [[ ▶ 크롤링 시작 ]]  ← disabled (text-muted-foreground)
  "언론사를 1개 이상 선택하세요"
```
- 위 데스크톱/모바일 기본 와이어프레임과 동일한 상태.
- [크롤링 시작] 버튼은 선택 개수가 0이므로 비활성. 옵션 입력(`언론사당 최대 기사 수`)은 항상 조작 가능.

### ② 일부 선택됨

```
┌─ ② 언론사 선택 ──────────────────────────┐
│ 언론사 선택              3/8개 선택됨    │
│──────────────────────────────────────────│
│ [-] 전체 선택 (indeterminate)  [전체 해제]│
│ [x] 테크위클리                    [활성] │
│ [x] AI투데이                      [활성] │
│ [ ] 디지털인사이트                [활성] │
│ [x] 넥스트IT                      [활성] │
│ [ ] 코드리뷰데일리                [활성] │
└────────────────────────────────────────────┘
┌─ ④ 크롤링 실행 ───────┐
│ [[ ▶ 크롤링 시작 ]]   │ ← 활성화(Primary)
└────────────────────────┘
```
- 요약 텍스트가 "3/8개 선택됨"으로 갱신되고, [크롤링 시작]이 활성화된다.
- 전체 선택 체크박스는 `checked="indeterminate"`로 표시(사각형 안에 `-`) — 일부만 선택된 상태를 명확히 알린다.

### ③ 크롤링 진행 중

```
┌─ ④ 크롤링 실행 ────────────────────────┐
│ role="status" aria-live="polite"        │
│ 전체 진행률                       62%   │
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░                    │
│ 현재: 테크위클리 — 12/20건               │
│──────────────────────────────────────── │
│ ✓ AI투데이        완료 (20/20)           │
│ ↻ 테크위클리      진행중 (12/20)         │
│ ⏳ 넥스트IT        대기                   │
│──────────────────────────────────────── │
│ [  ■ 중단  ]                             │
└──────────────────────────────────────────┘
```
- [크롤링 시작] 버튼 자리가 [중단](`Square` 아이콘, `variant="outline"`)으로 전환된다.
- 옵션(③ 언론사당 최대 기사 수) 입력은 실행 중 변경 불가하도록 `disabled` 처리(진행 중인 실행에 영향을 주지 않기 위함).
- 언론사별 상태 아이콘: `Clock`(대기, 회색) / `LoaderCircle`(진행중, `animate-spin`) / `CircleCheckBig`(완료, 초록 계열은 없으므로 `text-foreground` 유지, 배지로만 구분) / `CircleX`(실패, `text-destructive`).
- **진행 상태는 1초 간격 폴링으로 갱신한다.** `docs/ROADMAP.md` Task 015가 SSE 대신 폴링을 채택했고, 화면이 쓰는 창구는 `hooks/use-crawl-progress.ts` 하나다. 이 화면은 `GET /api/crawl/{runId}`를 직접 호출하지 않고 이 훅이 돌려주는 `RunProgress`(`overallPercent` · `currentPressName` · `currentCollected/currentTarget` · `pressStatuses[]` · `recovered`)만 그린다.
- **`recovered: true`는 "이 스냅샷은 근사치"라는 뜻이다**(D-023). 서버가 실행 도중 재시작되면 진행 상태를 `run-meta.json`과 저장된 파일 개수로 복원하는데, 그 경로는 언론사별 **실패를 복원하지 못하고**(I-022) `target`을 `collected`와 같은 값으로 강제한다. 이 플래그가 켜져 있으면 언론사별 상세를 정교하게 그리려 하지 말고 런 레벨 안내 한 줄로 대체한다 — "이 결과는 서버 재시작 후 복구된 값이라 언론사별 상세가 정확하지 않을 수 있어요."(D-030 결정 4)
- 폴링은 `status`가 종료 상태(`done`/`partial-failed`/`failed`/`aborted`)가 되면 멈춘다 — 완료 화면(④)으로 전환되는 시점이 곧 폴링이 끝나는 시점이다.

### ④ 완료

```
┌─ ④ 크롤링 실행 ────────────────────────┐
│ ✓ 크롤링 완료                            │
│ 8개 언론사 · 기사 154건 저장             │
│ data/runs/20260810-091500/articles/      │
│──────────────────────────────────────── │
│ [ 수집 결과 보기 → ]                     │
│ [ 새로 크롤링하기 ]                      │
└──────────────────────────────────────────┘
```
- 진행률/언론사별 리스트 블록은 사라지고 완료 요약으로 대체된다.
- sonner 토스트: "크롤링 완료 — 기사 154건 저장" (성공, 우하단).
- [수집 결과 보기]가 Primary, [새로 크롤링하기]는 선택 상태를 초기화하고 ①(기본)으로 되돌리는 보조 버튼.

### ⑤ 부분 실패

```
┌─ ④ 크롤링 실행 ────────────────────────┐
│ ⚠ 크롤링 완료 (일부 실패)                │
│ 6개 성공 · 2개 실패 · 기사 121건 저장    │
│──────────────────────────────────────── │
│ Alert variant="destructive"              │
│ ⚠ 2개 언론사 수집 실패                   │
│  코드리뷰데일리, 클라우드저널             │
│  (셀렉터 불일치 / 피드 파싱 실패)        │
│──────────────────────────────────────── │
│ ✓ 테크위클리   완료 (20/20)              │
│ ✕ 코드리뷰데일리  실패 (0/20)            │
│ …                                        │
│ [ 수집 결과 보기 → ]                     │
└──────────────────────────────────────────┘
```
- 완료 요약 아래에 `Alert variant="destructive"`가 추가로 표시된다(완료 블록을 대체하지 않고 그 안에 함께 표시).
- sonner 토스트: "크롤링 완료 — 2개 언론사 실패" (warning 톤).
- 실패한 언론사는 리스트에서 `CircleX` + `text-destructive`로 강조되고, 실패 사유를 짧게 덧붙인다. 사유는 폴링 응답의 `pressStatuses[].failReason`을 그대로 쓴다. 사유 문구는 수집 방식에 따라 달라진다 — HTML은 `타임아웃`/`셀렉터 불일치`, RSS는 `피드 파싱 실패`/`피드 응답 없음`. 두 방식이 한 목록에 섞이므로 사유만 보고도 어느 쪽이 깨졌는지 알 수 있어야 한다.

#### 실패의 단위가 둘이다 — 문구를 셋으로 가른다 (I-040, 21일차 해소)

run 레벨 상태(`partial-failed`/`failed`)를 정하는 것은 **기사 단위** `failCount`(`lib/storage/run-repository.ts`의 `finishRun`)이고, 위 요약·리스트가 강조하는 "N개 언론사 실패"는 언론사 전체가 피드·목록 페이지조차 열지 못한 **언론사 단위** 실패다. 한 언론사 안에서 기사 몇 건만 개별적으로 실패하고 나머지는 저장에 성공하면, 그 언론사는 `done`으로 끝나는데도 run은 이 상태(⑤)로 들어온다 — 이때 언론사 단위 실패는 0곳이다.

**언론사 단위 실패 수는 화면이 세지 않는다.** 폴링 응답의 `failedPressCount`(`RunProgress`, 21일차 신설)를 그대로 쓴다. 예전처럼 `pressStatuses`에서 직접 세면 서버 재시작 뒤 **근사 복원** 스냅샷에서 틀린다 — 그 경로는 저장된 기사 개수로 언론사 상태를 되짚기 때문에 실제로 실패한 언론사가 `waiting`으로 보여, 세어 보면 언제나 0곳이 나온다.

**`failedPressCount`의 `undefined`는 0이 아니라 "알 수 없음"이다.** 근사 복원 경로에서만 그렇게 온다(`recovered: true`와 같은 경로). 따라서 문구는 세 갈래다.

| 조건 | 요약줄 | Alert 제목 | Alert 본문 |
| --- | --- | --- | --- |
| `failedPressCount > 0` | `{성공}개 성공 · {failedPressCount}개 실패 · 기사 {successCount}건 저장` | `{failedPressCount}개 언론사 수집 실패` | 실패한 언론사 이름과 `failReason` 나열 |
| `failedPressCount === 0` | `{N}개 언론사 · 기사 {successCount}건 저장 · {failCount}건 개별 실패` | `기사 {failCount}건 개별 수집 실패` | `언론사는 모두 정상 처리됐지만, 개별 기사 {failCount}건이 수집에 실패했습니다.` |
| `failedPressCount === undefined` | (가운데 줄과 같음) | (가운데 줄과 같음) | `기사 {failCount}건이 수집에 실패했습니다. 서버가 재시작되어 어느 언론사에서 실패했는지는 복구하지 못했습니다.` |

가운데 줄에서 "언론사는 모두 정상 처리됐다"고 단정할 수 있는 것은 **서버가 0을 확정해 줬을 때뿐**이다. 세 번째 줄에서 같은 문구를 쓰면 모르는 것을 아는 것처럼 말하게 된다 — 그것이 I-040이 만들던 거짓말의 마지막 형태였다.

**run 레벨 `status`는 여전히 기사 단위 `failCount`로 정한다.** 기사 1건이라도 실패했으면 그 실행은 실제로 "일부 실패"가 맞다. 두 숫자는 서로를 대체하지 않고 각자의 단위로 쓰인다.

### ⑥ 언론사 0개 빈 상태

```
┌─ ② 언론사 선택 ──────────────────────────┐
│                                            │
│              (Inbox 아이콘)               │
│         등록된 언론사가 없습니다           │
│   언론사 관리에서 먼저 언론사를 등록하세요 │
│                                            │
│        [ 언론사 관리로 이동 ]             │
│                                            │
└────────────────────────────────────────────┘
```
- ② 카드 전체(요약 바 + 전체 선택/해제 + 목록)가 이 빈 상태로 대체된다.
- ④ 실행 패널의 [크롤링 시작]도 함께 `disabled` 유지, 안내문은 "언론사 관리에서 언론사를 먼저 등록하세요"로 바뀐다.
- [언론사 관리로 이동] 클릭 시 `/press`(언론사 관리 페이지)로 이동.

### ⑦ 언론사 목록 로딩 (skeleton)

```
┌─ ② 언론사 선택 ──────────────────────────┐
│ 언론사 선택                               │
│────────────────────────────────────────  │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  │
└────────────────────────────────────────────┘
```
- `Skeleton`(`h-12 w-full rounded-lg`) 5개를 세로로 쌓아 언론사 행 자리를 표시한다("N/M개 선택됨" 요약 텍스트와 전체 선택/해제 버튼도 함께 스켈레톤 처리하거나, 개수를 알 수 없으므로 숨김).
- ④ 실행 패널의 [크롤링 시작]은 목록 로딩이 끝나기 전이므로 `disabled` 유지.

### ⑧ 중단됨 (사용자가 [중단]을 눌러 끝난 실행)

```
┌─ ④ 크롤링 실행 ────────────────────────┐
│ ■ 크롤링 중단됨                          │
│ 3/4개 언론사 완료 · 기사 53건 저장       │
│ · 41건 미수집                            │
│ data/runs/20260810-211414/articles/      │
│──────────────────────────────────────── │
│ [ 수집 결과 보기 → ]                     │
│ [ 새로 크롤링하기 ]                      │
└──────────────────────────────────────────┘
```
- **레이아웃은 ④ 완료와 완전히 같다.** 완료 조각을 재사용하고 `status`(`'done' | 'aborted'`)로 아이콘·문구·톤만 갈아 끼운다 — 같은 마크업을 두 곳에서 따로 기르지 않는다(D-030 결정 1).
- 아이콘은 `Square`. [중단] 버튼이 이미 쓰는 아이콘이라 새로 늘리지 않으면서 `CircleCheckBig`(완료)과 시각적으로 분명히 다르다.
- **`skippedCount`는 "N건 미수집"으로 쓴다. "실패"라는 낱말을 쓰지 않는다** — 중단으로 요청조차 하지 않은 건수이고, 그 구분이 I-017 수정의 전부였다(D-029). ⑤ 부분 실패는 `failCount > 0` 조건이므로 이 화면과 겹치지 않는다.
- sonner 토스트: "크롤링 중단됨 — 기사 53건 저장, 41건 미수집"(warning 톤). **destructive를 쓰지 않는다** — 사용자가 스스로 누른 중단이지 오류가 아니다.
- 언론사별 상태 리스트에서 **중간에 멈춘 언론사**는 `Square`(`text-muted-foreground`) + "중단됨" + `{collected}/{target}건`(예: `8/30건`)으로 그린다. 판정은 새 상태값 없이 파생한다:
  ```
  press.status === 'done' && press.collected < press.target
  ```
  `pressRunStatus` enum(`waiting | running | done | failed`)에 값을 더하지 않는다 — 정상 완료된 언론사는 `collected === target`이므로 이 조건은 중단된 경우에만 참이다(D-030 결정 3).
- **`recovered: true`인 스냅샷에서는 이 파생 판정이 항상 거짓이다**(`target`이 `collected`로 강제된다). 그때는 언론사별 "중단됨" 표시를 시도하지 말고 §③의 복구 안내 문구를 쓴다(I-022).

---

## 사용 컴포넌트

**공통 컴포넌트** (`components/common/`) — 이 화면이 **호출**하는 것. 같은 마크업을 다시 그리지 않는다.

| 컴포넌트 | 이 화면에서의 용도 |
|----------|---------------------|
| `PageContainer` | `<main className="flex-1">` + 본문 컨테이너 |
| `PageHeader` | ① 페이지 헤더(Breadcrumb + `h1` + 설명) |
| `EmptyState` | ⑥ 언론사 0개 빈 상태 |
| `ErrorAlert` | ⑤ 부분 실패 알림 |

**shadcn 컴포넌트** — 아래 목록은 Task 002(공통 앱 셸 스캐폴딩)에서 **13종을 일괄 설치하며 모두 설치가 끝났다.** 이 화면에서 추가로 설치할 것은 없다.

| 컴포넌트 | 이 화면에서의 용도 |
|----------|---------------------|
| `alert` `badge` `breadcrumb` `button` `card` `input` `skeleton` `sonner` | 카드·배지·버튼·옵션 입력·스켈레톤·토스트 |
| `checkbox` | 전체 선택 + 언론사별 선택(F001) |
| `label` | 체크박스 라벨 연결(`htmlFor`), 옵션 입력 라벨 |
| `progress` | 전체 진행률 표시(F002) |
| `separator` | 카드 내부 섹션 구분 |
| `scroll-area` | 언론사 목록 / 언론사별 진행 상태 리스트 스크롤 영역 |
| `empty` | `EmptyState`가 감싸는 프리미티브(직접 쓰지 않는다) |

**lucide-react 아이콘** — 신 별칭으로 통일한다(`docs/CONVENTIONS.md` §8). 구 별칭 `Loader2`·`CheckCircle2`·`XCircle`·`AlertTriangle`은 쓰지 않는다.

| 아이콘 | 용도 |
|--------|------|
| `Play` | [크롤링 시작] 버튼 |
| `Square` | [중단] 버튼 |
| `LoaderCircle` (`animate-spin`) | 진행중 언론사 상태 |
| `Clock` | 대기 언론사 상태 |
| `CircleCheckBig` | 완료 언론사 상태 / 완료 요약 |
| `CircleX` | 실패 언론사 상태 |
| `TriangleAlert` | 부분 실패 알림 — `ErrorAlert`가 내부에서 쓰므로 이 화면에서 직접 import하지 않는다 |
| `Settings2` | 크롤링 옵션 라벨 |
| `Inbox` | 언론사 0개 빈 상태(`EmptyState`의 `icon` prop) |
| `ArrowRight` | [수집 결과 보기] 버튼 |

---

## 접근성

- 언론사 체크박스는 각각 `<Checkbox id="press-{id}">` + `<Label htmlFor="press-{id}">`로 연결한다. 라벨 전체(이름+URL 영역)를 클릭 가능한 영역으로 감싸 클릭 타깃을 넓힌다.
- 언론사 목록 컨테이너는 `role="group"` + `aria-labelledby="press-select-summary"`로, 스크린리더가 "언론사 선택, N/M개 선택됨" 그룹으로 인식하게 한다.
- 전체 선택 체크박스는 Radix `Checkbox`의 3단 상태(`checked={true|false|"indeterminate"}`)를 사용한다. `indeterminate`일 때 Radix가 자동으로 `aria-checked="mixed"`를 설정하므로 별도 처리가 필요 없다.
- 진행 상태 영역(전체 진행률 + 현재 처리 중 텍스트)은 `role="status" aria-live="polite"`로 감싸, 값이 바뀔 때마다 스크린리더가 자동으로 읽는다. `Progress` 자체는 Radix가 `role="progressbar"`/`aria-valuenow`를 자동 부여하므로 이중으로 넣지 않는다.
- 아이콘 전용 요소(상태 아이콘 `Clock`/`LoaderCircle`/`CircleCheckBig`/`CircleX`)는 텍스트 라벨("대기"/"진행중"/"완료"/"실패")과 항상 함께 표기하고, 아이콘에는 `aria-hidden="true"`를 준다(정보를 아이콘에만 의존하지 않음).
- [전체 해제], [중단], [크롤링 시작] 등 버튼은 `disabled` 시 `aria-disabled`가 아닌 네이티브 `disabled` 속성을 사용해 포커스 이동에서 자연스럽게 제외한다.
- 키보드 이동: 체크박스 목록은 `Tab`으로 각 항목을 순회, `Space`로 토글(네이티브 체크박스 동작을 따르는 Radix 기본 동작). `ScrollArea` 내부도 포커스된 요소가 자동으로 보이도록 스크롤된다(Radix 기본 동작).
- 부분 실패 `Alert`는 `role="alert"`(컴포넌트 기본 제공)로 렌더링되어 등장 시점에 스크린리더가 즉시 안내한다.

---

## 마크업 스켈레톤

> 아래는 `app/page.tsx` 스켈레톤이다. 상태에 따라 바뀌는 부분(진행 중 / 완료 / 부분 실패 / 빈 상태 / 로딩)은 실제로는 조건부 렌더링되므로, 이 문서에서는 "기본(선택 전)" 구조를 기준으로 작성하고 나머지 상태는 JSX 주석 블록으로 자리만 남긴다. 체크박스·버튼에 이벤트가 붙어야 하므로 `'use client'`를 전제로 한다.

### 파일 분할 경계 (Task 016)

아래 스켈레톤은 읽기 편하도록 한 덩어리로 적었지만, **실제 구현은 한 파일이 아니다.** `docs/ROADMAP.md` Task 016이 못 박은 파일 목록이 분할의 단일 소스이며, 스켈레톤의 각 구간은 다음 파일로 간다.

| 스켈레톤 구간 | 가는 파일 |
|---------------|-----------|
| `PageContainer` + `PageHeader` + 2단 그리드 골격 | `app/page.tsx` (수정 — `ScreenPlaceholder` 제거) |
| ② 언론사 선택 카드(전체 선택 3단 상태 + `ScrollArea` 목록 + ⑥ 빈 상태 + ⑦ 로딩) | `components/crawl/press-select-card.tsx` (신규) |
| ③④ 실행 패널(옵션 · 실행/중단 버튼 · 진행 · 완료 · 부분 실패) | `components/crawl/crawl-run-panel.tsx` (신규) |
| 언론사별 진행 상태 리스트(대기/진행중/완료/실패 4상태) | `components/crawl/press-run-status-list.tsx` (신규) |
| 크롤 시작·중단·진행 조회 fetch 래퍼 | `lib/api/crawl-client.ts` (신규) |
| 1초 폴링 훅 | `hooks/use-crawl-progress.ts` (Task 015 산출물 — 이 화면은 호출만 한다) |

수집 방식 배지(RSS/HTML)는 Task 009가 만드는 `components/press/source-type-badge.tsx`를 재사용한다. 이 화면에서 `sourceType`으로 분기하는 코드를 다시 쓰지 않는다.

### ⚠️ 아래 스켈레톤의 `ScrollArea` 반응형 높이는 세 곳 모두와 함께 고친다 (I-013)

이 스켈레톤은 한때 `h-[420px] pr-3 sm:h-[420px]`로 적혀 있어, 위 §스크롤 처리 결정(37행)·§영역별 컴포넌트 명세(140행)가 요구하는 모바일 `h-[320px]`가 스켈레톤 어디에도 없었다. 실제 구현(`components/crawl/press-select-card.tsx:124`)은 이 스켈레톤을 베끼지 않고 결정 문서·명세 표 쪽을 따라 처음부터 `h-[320px] pr-3 sm:h-[420px]`를 썼으므로 코드 위험은 없었지만, 문서 자체는 어긋난 채로 남아 있었다. 19일차에 `h-[320px] pr-3 sm:h-[420px]`로 정정해 37행·140행·아래 스켈레톤 세 곳을 일치시켰다. **이 값을 다시 바꿀 일이 생기면 세 곳을 함께 고친다** — 한 곳만 고치면 이 이슈가 다시 열린다.

### 기본 구조 (`app/page.tsx`)

```tsx
'use client'

// TODO: 실제 구현 시 아래 상태들을 관리할 useState 필요
// - selectedPressIds: string[]
// - crawlStatus: 'idle' | 'running' | 'done' | 'partial-failed' | 'failed' | 'aborted'
//   ('idle'만 화면 전용이고 나머지 5종은 crawlRunStatusSchema 그대로다.
//    'failed'·'aborted'를 빠뜨리면 종료된 실행이 진행 중 화면에 그대로 머문다)
// - maxArticlesPerPress: number

import {
  Play,
  Settings2,
} from 'lucide-react'

// 페이지 골격은 공통 컴포넌트를 호출한다. 컨테이너·헤더 마크업을 화면마다 다시 그리지 않는다.
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

// 언론사 관리(F007)에 등록된 활성 언론사 1건의 타입.
// 이 화면은 선택만 하므로 방식별 상세 설정(셀렉터 등)은 필요 없고,
// 방식 배지와 대표 URL 한 줄만 받는다.
interface PressCheckItem {
  id: string
  name: string
  sourceType: 'rss' | 'html'
  /** RSS는 feedUrl, HTML은 listUrl — 서버가 방식에 맞게 골라 내려준다 */
  sourceUrl: string
  isActive: boolean
}

// 더미 데이터 — 실제로는 GET /api/press?active=true 같은 조회 결과로 대체
const MOCK_PRESS: PressCheckItem[] = [
  { id: 'techweekly', name: '테크위클리', sourceType: 'rss', sourceUrl: 'techweekly.example.com/rss.xml', isActive: true },
  { id: 'aitoday', name: 'AI투데이', sourceType: 'rss', sourceUrl: 'aitoday.example.com/feed', isActive: true },
  { id: 'digitalinsight', name: '디지털인사이트', sourceType: 'html', sourceUrl: 'digitalinsight.example.com/list', isActive: true },
  { id: 'nextit', name: '넥스트IT', sourceType: 'rss', sourceUrl: 'nextit.example.com/rss', isActive: true },
  { id: 'codereviewdaily', name: '코드리뷰데일리', sourceType: 'html', sourceUrl: 'codereviewdaily.example.com/articles', isActive: true },
  { id: 'cloudjournal', name: '클라우드저널', sourceType: 'rss', sourceUrl: 'cloudjournal.example.com/rss.xml', isActive: true },
  { id: 'startupwire', name: '스타트업와이어', sourceType: 'html', sourceUrl: 'startupwire.example.com/news', isActive: true },
  { id: 'bytenews', name: '바이트뉴스', sourceType: 'rss', sourceUrl: 'bytenews.example.com/feed', isActive: true },
]

export default function CrawlRunPage() {
  return (
    // PageContainer가 <main className="flex-1">과 container 클래스를 모두 제공한다.
    // 여기서 <div className="container mx-auto max-w-6xl ...">를 직접 쓰면 <main>이 사라져
    // app/layout.tsx의 flex min-h-full flex-col 아래에서 셸 레이아웃이 깨진다.
    <PageContainer>
      {/* ① 페이지 헤더 — 공통 규격(00-app-shell.md). Breadcrumb 링크는 컴포넌트가 next/link로 처리 */}
      {/* 홈은 브레드크럼이 1단이다 — 첫 항목의 링크가 지금 보고 있는 페이지 자신이면 아무 정보도
          주지 않는다(00-app-shell.md §브레드크럼 규격). 나머지 4개 화면만 「홈 ▸ 현재 화면」 2단이다. */}
      <PageHeader
        breadcrumbs={[{ label: '크롤링 실행' }]}
        title="크롤링 실행"
        description="언론사를 선택하고 크롤링을 시작하세요"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* ② 언론사 선택 → components/crawl/press-select-card.tsx */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>언론사 선택</CardTitle>
            {/* TODO: 선택된 개수/전체 개수로 치환 필요 */}
            <span
              id="press-select-summary"
              role="status"
              aria-live="polite"
              className="text-sm text-muted-foreground"
            >
              0/{MOCK_PRESS.length}개 선택됨
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* TODO: 전체 선택 시 checked=true, 일부 선택 시 checked="indeterminate" */}
                <Checkbox id="select-all" aria-label="전체 언론사 선택" />
                <Label htmlFor="select-all" className="text-sm font-medium">
                  전체 선택
                </Label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                onClick={() => {}}
              >
                {/* TODO: 전체 해제 로직 구현 필요 */}
                전체 해제
              </Button>
            </div>

            <Separator />

            <ScrollArea className="h-[320px] pr-3 sm:h-[420px]">
              <ul
                role="group"
                aria-labelledby="press-select-summary"
                className="space-y-1"
              >
                {MOCK_PRESS.map((press) => (
                  <li key={press.id}>
                    <label
                      htmlFor={`press-${press.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-transparent px-2.5 py-2 hover:bg-muted"
                    >
                      <span className="flex items-center gap-3">
                        {/* TODO: 선택 상태(checked)와 onCheckedChange 구현 필요 */}
                        <Checkbox id={`press-${press.id}`} onCheckedChange={() => {}} />
                        <span className="flex flex-col">
                          <span className="text-sm font-medium">{press.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {press.sourceUrl}
                          </span>
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        {/* 수집 방식 배지 — 04-press-manage.md의 SourceTypeBadge와 같은 규칙 */}
                        <Badge
                          variant={press.sourceType === 'rss' ? 'secondary' : 'outline'}
                        >
                          {press.sourceType === 'rss' ? 'RSS' : 'HTML'}
                        </Badge>
                        {press.isActive && <Badge variant="secondary">활성</Badge>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ③④ 크롤링 실행 & 진행 상태 패널 → components/crawl/crawl-run-panel.tsx */}
        <Card className="lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>크롤링 실행</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ③ 크롤링 옵션 — 선택 사항. 동시성은 .env로만 조정(화면 미노출, 설계 근거는 본문 참고) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="max-articles"
                className="flex items-center gap-1.5 text-sm"
              >
                <Settings2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
                언론사당 최대 수집 기사 수
              </Label>
              {/* TODO: 이 입력값을 crawlStartRequestSchema.maxArticlesPerPress(lib/types/crawl-run.ts)로 상태 관리·전송 필요 */}
              <Input
                id="max-articles"
                type="number"
                defaultValue={20}
                min={1}
                max={100}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                선택 사항 · 비워두면 기본값(20건) 사용
              </p>
            </div>

            <Separator />

            {/* 기본(선택 전) 상태의 실행 버튼 — 진행 중에는 [중단] 버튼으로 교체 표시 */}
            <Button className="w-full" size="lg" disabled onClick={() => {}}>
              {/* TODO: 선택된 언론사가 1개 이상일 때만 활성화, 클릭 시 크롤링 시작 API 호출 */}
              <Play aria-hidden="true" />
              크롤링 시작
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              언론사를 1개 이상 선택하세요
            </p>

            {/* TODO: crawlStatus === 'running' 일 때 아래 "진행 중 조각"으로 교체 표시 */}
            {/* TODO: crawlStatus === 'done' 일 때 아래 "완료 조각"으로 교체 표시 */}
            {/* TODO: crawlStatus === 'partial-failed' 일 때 "완료 조각" + "부분 실패 Alert 조각"을 함께 표시 */}
            {/* TODO: crawlStatus === 'aborted' 일 때 "완료 조각"을 status='aborted'로 재사용 — §⑧ 중단됨 */}
            {/* TODO: crawlStatus === 'failed' 일 때도 진행 중 화면에 머물지 않게 종료 처리 */}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
```

### 진행 중 조각 (`crawlStatus === 'running'`일 때 위 카드의 버튼/안내문 자리를 대체)

> 언론사별 상태 리스트 구간은 `components/crawl/press-run-status-list.tsx`로 분리한다(ROADMAP Task 016).

```tsx
import { CircleCheckBig, CircleX, Clock, LoaderCircle, Square } from 'lucide-react'

interface PressRunStatus {
  pressId: string
  name: string
  status: 'waiting' | 'running' | 'done' | 'failed'
  collected: number
  target: number
  /** 실패한 언론사에만 있다. HTML은 '타임아웃'/'셀렉터 불일치', RSS는 '피드 파싱 실패'/'피드 응답 없음' */
  failReason?: string
}

// 더미 데이터 — 실제로는 hooks/use-crawl-progress.ts의 1초 폴링(Task 015 확정)으로 갱신
const MOCK_RUN_STATUS: PressRunStatus[] = [
  { pressId: 'aitoday', name: 'AI투데이', status: 'done', collected: 20, target: 20 },
  { pressId: 'techweekly', name: '테크위클리', status: 'running', collected: 12, target: 20 },
  { pressId: 'nextit', name: '넥스트IT', status: 'waiting', collected: 0, target: 20 },
]

function RunningPanel() {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span>전체 진행률</span>
        <span>62%</span>
      </div>
      {/* TODO: value를 실제 진행률(0~100)로 치환 필요 */}
      <Progress value={62} />
      <p className="text-sm text-muted-foreground">현재: 테크위클리 — 12/20건</p>

      <Separator />

      <ScrollArea className="h-[240px] pr-3">
        <ul className="space-y-2">
          {MOCK_RUN_STATUS.map((item) => (
            <li key={item.pressId} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {item.status === 'done' && (
                  <CircleCheckBig className="size-4" aria-hidden="true" />
                )}
                {item.status === 'running' && (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                )}
                {item.status === 'waiting' && (
                  <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
                )}
                {item.status === 'failed' && (
                  <CircleX className="size-4 text-destructive" aria-hidden="true" />
                )}
                {item.name}
              </span>
              <span className="text-muted-foreground">
                {/* TODO: 상태 텍스트를 대기/진행중/완료/실패로 매핑 */}
                {/* TODO: status === 'failed'면 건수 대신 failReason을 그대로 보여준다 */}
                {item.collected}/{item.target}건
              </span>
            </li>
          ))}
        </ul>
      </ScrollArea>

      <Button type="button" variant="outline" className="w-full" onClick={() => {}}>
        {/* TODO: 크롤링 중단 로직 구현 필요 */}
        <Square aria-hidden="true" />
        중단
      </Button>
    </div>
  )
}
```

### 완료 조각 (`crawlStatus === 'done'`일 때 · `'aborted'`이면 §⑧대로 아이콘·문구·토스트만 갈아 끼워 재사용한다)

```tsx
import Link from 'next/link'
import { ArrowRight, CircleCheckBig } from 'lucide-react'

function DonePanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CircleCheckBig className="size-4" aria-hidden="true" />
        크롤링 완료
      </div>
      {/* TODO: 실제 실행(run) 결과(성공 개수, 저장 경로)로 치환 필요 */}
      <p className="text-sm text-muted-foreground">
        8개 언론사 · 기사 154건 저장
      </p>
      <p className="font-mono text-xs text-muted-foreground">
        data/runs/20260810-091500/articles/
      </p>

      <Separator />

      <Button asChild className="w-full">
        <Link href="/results">
          수집 결과 보기
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
      <Button type="button" variant="outline" className="w-full" onClick={() => {}}>
        {/* TODO: 선택 상태 초기화 후 기본 화면으로 복귀 */}
        새로 크롤링하기
      </Button>
    </div>
  )
}
```

### 부분 실패 조각 (`crawlStatus === 'partial-failed'`일 때 완료 조각 위에 함께 표시)

```tsx
// Alert + TriangleAlert 마크업을 다시 그리지 않고 공통 ErrorAlert를 호출한다.
// 아이콘(TriangleAlert)과 variant="destructive"는 컴포넌트가 이미 갖고 있다.
import { ErrorAlert } from '@/components/common/error-alert'

function PartialFailureAlert() {
  return (
    <ErrorAlert
      // TODO: 실패 개수/언론사명/실패 사유로 치환 필요
      // failReason 문구가 수집 방식별로 다른 이유는 위 "상태별 화면 ⑤"에 이미 적었다 —
      // 예시 값 안에는 화면에 그대로 뜰 문구만 넣는다(설명을 섞으면 구현 시 그 설명까지
      // 통째로 베껴 화면에 새어 나간다. 16일차 크롤 파이프라인 회귀 수정 사례 참고).
      title="2개 언론사 수집 실패"
      description="코드리뷰데일리(셀렉터 불일치), 클라우드저널(피드 파싱 실패)"
    />
  )
}
```

### 빈 상태 조각 (언론사 0개일 때 ② 카드 전체를 대체)

```tsx
import { Inbox } from 'lucide-react'

// 00-app-shell.md가 01~05 공용으로 정한 빈 상태 블록을 그대로 호출한다.
// Card + py-12 마크업을 이 화면에서 다시 만들지 않는다.
// actionHref를 주면 컴포넌트가 Button asChild + next/link로 렌더하므로
// raw <a href="/press">를 쓸 일이 없다(@next/next/no-html-link-for-pages error 회피).
import { EmptyState } from '@/components/common/empty-state'

function PressEmptyState() {
  return (
    <EmptyState
      icon={<Inbox />}
      title="등록된 언론사가 없습니다"
      description="언론사 관리에서 먼저 언론사를 등록하세요"
      actionLabel="언론사 관리로 이동"
      actionHref="/press"
    />
  )
}
```

### 로딩 조각 (언론사 목록 조회 중일 때 ② 카드 내부 목록을 대체)

```tsx
import { Skeleton } from '@/components/ui/skeleton'

function PressListSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {/* TODO: 실제 로딩 상태(isLoading)일 때만 렌더링 */}
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}
```
