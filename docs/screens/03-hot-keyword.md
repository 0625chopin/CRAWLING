# 03. 핫 키워드 분석 페이지

## 개요

| 항목 | 내용 |
|------|------|
| 역할 | 수집된 기사 본문을 Kiwi로 형태소 분석해 조사·어미·접미사를 제거하고, 명사(NNG/NNP)·영문(SL) 토큰만 남긴 뒤 불용어를 걸러 빈도순 핫 키워드 랭킹을 보여준다 |
| 구현 기능 ID | F005(형태소 분석 기반 단어 카운트), F006(핫 키워드 랭킹), F008(불용어 연동) |
| 진입 경로 | 수집 결과 페이지에서 **[키워드 분석]** 클릭 · 상단 헤더 메뉴 "핫 키워드 분석" 클릭 |
| 다음 이동 | 랭킹에 상투어가 보이면 **[불용어 관리로 이동]** → 불용어 추가 → 이 페이지로 복귀해 **[재분석]** |

이 문서는 정적 마크업과 레이아웃만 다룬다. run 목록 조회, Kiwi 토큰화 실행, 불용어 반영, 재분석 트리거는 모두 비즈니스 로직으로 범위 밖이며 아래 마크업에는 `onClick={() => {}}` 플레이스홀더와 한국어 TODO 주석으로만 표시한다.

---

## 화면 구성

공통 앱 셸(헤더 · Breadcrumb · 본문 컨테이너)은 [00-app-shell.md](./00-app-shell.md)를 따르고, 이 문서는 본문 6개 영역만 다룬다.

**골격 마크업을 다시 그리지 않는다.** `<main>` + `container mx-auto max-w-6xl px-4 py-6 md:py-8`은 이미 `components/common/page-container.tsx`에 들어 있고, Breadcrumb + `h1` + 설명은 `components/common/page-header.tsx`에 들어 있다. 이 화면은 두 컴포넌트를 **호출**한다 — 손으로 쓴 `<div className="container …">`를 그대로 옮기면 `<main>`이 빠져 `app/layout.tsx`의 `flex min-h-full flex-col` 아래에서 셸 레이아웃이 깨진다. 빈 상태는 `components/common/empty-state.tsx`, 오류는 `components/common/error-alert.tsx`를 쓴다.

| 영역 | 목적 |
|------|------|
| ① 분석 조건 바 | 분석 대상 run 선택, 결과 필터(최소 등장 횟수·품사·표시 개수), 분석 시작/재분석 트리거 |
| ② 분석 요약 | "조사·어미가 실제로 제거되었다"는 것을 수치로 증명 — 기사 수 / 전체 토큰 수 / 제거 후 남은 토큰 수 / 불용어 제외 수 / 고유 키워드 수 |
| ③ Top 5 핫 키워드 강조 | 랭킹 표를 읽기 전에 1~5위를 카드로 한눈에 노출 |
| ④ 키워드 랭킹 표 | 순위 · 키워드 · 품사 배지 · 등장 횟수 · 비중 막대. 화면의 주인공 |
| ⑤ 불용어 연동 | 상단 **[불용어 관리로 이동]** 링크 + 랭킹 행별 **[이 단어 불용어로 추가]** 아이콘 액션 |
| ⑥ 분석 진행 상태 | Kiwi 모델 로딩 → 토큰화 → 집계 3단계를 `role="status"`로 표시 (분석 중에만 조건부 노출) |

### 설계 결정과 근거

**막대 시각화 — 차트 라이브러리 미도입, Tailwind만으로 구현**
랭킹 표의 "비중" 막대는 recharts 등 차트 라이브러리 기반 `chart` 컴포넌트를 쓰지 않고 `<div>` 트랙 + 인라인 `style={{ width: '${ratio}%' }}` 채움만으로 그린다. 이유: (1) 표시할 값이 "빈도수 1개 지표"뿐이라 축·범례·툴팁이 필요한 다계열 차트가 아니라 표 안에 박히는 **미니 막대(meter)** 에 가깝다. (2) 한 종류의 지표를 막대 길이로만 비교하므로 색상은 굳이 여러 색을 쓸 이유가 없고 오히려 열마다 다른 색을 쓰면 "이 색은 무슨 뜻인가"라는 잘못된 질문을 유발한다 — 단일 색(`bg-primary`) + 옅은 트랙(`bg-muted`)이 정답이다. (3) recharts는 SSR·번들 크기·다크모드 대응 비용이 있는데, 표 안 미니 막대 하나를 위해 들이기엔 과하다. `chart` shadcn 컴포넌트는 이번 화면에서 설치하지 않는다.

**Top 5 카드의 순위별 크기/색 차등 — `--chart-*`가 아니라 `--primary` 투명도 단계를 쓴다**
5개 카드 모두 동일한 `Card` 크기를 쓰되, `순위 숫자`와 `키워드` 폰트 크기를 1위(`text-2xl`)→5위(`text-base`)로 점감시켜 크기 차등을 준다. 색 차등은 카드 상단 `border-t-4`에 1위 `border-t-primary`, 2~5위 `border-t-primary/70` `/50` `/35` `/20`을 순서대로 배정한다.

**`--chart-1`~`--chart-5`는 쓰지 않는다.** `app/globals.css`를 보면 이 5개 토큰은 `:root`와 `.dark`에 **같은 값**으로 두 번 적혀 있다(`--chart-1: oklch(0.87 0 0)` … `--chart-5: oklch(0.269 0 0)`, `app/globals.css:70-74`와 `105-109`). 테마가 바뀌어도 절대 명도가 그대로라는 뜻이다. 반면 카드 배경 `--card`는 라이트에서 `oklch(1 0 0)`, 다크에서 `oklch(0.205 0 0)`(`app/globals.css:54`, `89`)이다. 따라서 다크 모드에서 1위 강조선(`--chart-5`, 0.269)과 카드 배경(0.205)의 명도차는 **0.064밖에 되지 않아 선이 사실상 보이지 않고**, 가장 옅어야 할 5위(`--chart-1`, 0.87)만 밝게 남는다. "값이 클수록 진하다"는 순차 인코딩이 다크에서 **정확히 뒤집힌다.**

`--primary`는 라이트 `oklch(0.205 0 0)` · 다크 `oklch(0.922 0 0)`로 **모드에 따라 값이 뒤집히는** 토큰이다(`app/globals.css:58`, `93`). 라이트에서는 흰 배경 위의 짙은 선, 다크에서는 어두운 배경 위의 밝은 선이 되고, 투명도를 낮출수록 배경과 가까워지므로 **두 모드 모두에서 "1위가 가장 뚜렷하고 5위가 가장 흐리다"는 순서가 그대로 유지된다.** 텍스트를 얹지 않는 얇은 강조선(4px)에만 쓰는 원칙은 그대로다 — 카드 **배경 전체**나 **배지 채움**에 쓰면 텍스트 대비가 깨진다. 순위 숫자·키워드 텍스트는 항상 `text-foreground`/`text-muted-foreground` 같은 시맨틱 토큰을 쓴다. 폰트 크기 점감(`text-2xl`→`text-base`)은 색과 별개의 두 번째 채널이므로 그대로 유지한다.

**분석 조건 바 — MVP에 4개 필터 모두 포함**
| 항목 | 포함 여부 | 근거 |
|------|-----------|------|
| 분석 대상 run 셀렉터 | 포함 (필수) | PRD 사용자 행동에 "분석할 실행(run)을 선택" 명시 |
| 최소 등장 횟수 필터 | 포함 | 1회 등장 잡음 단어가 랭킹 하단을 채우는 문제를 UI 조작 없이 줄여줌. `Slider` 대신 `Input type="number"`로 구현 — 혼자 쓰는 로컬 도구라 정확한 숫자 입력이 슬라이더 드래그보다 빠르고, 컴포넌트 추가 설치도 줄어듦 |
| 품사 필터(NNG/NNP/SL) | 포함 | "명사·영문만 남긴다"는 F005의 핵심 규칙을 사용자가 직접 눈으로 조작하며 확인할 수 있게 하는 것이 이 화면의 정체성. `ToggleGroup type="multiple"`로 구현 |
| 표시 개수(Top 20/50/100) | 포함 | 기사 수가 늘면 고유 키워드가 수백 개로 늘어날 수 있어 표 렌더링·스크롤 부담을 사용자가 직접 제어해야 함 |
| 정렬 기준 선택 | **제외** | PRD가 "빈도순 랭킹 표"로 정렬 기준을 고정 규정 — 별도 정렬 UI를 넣으면 랭킹이라는 개념과 충돌하므로 MVP에서 뺀다 |

**분석 요약 — 5개 수치를 모두 상시 노출**
"조사를 제거했다"는 이 프로젝트의 핵심 요구사항을 사용자가 체감하려면 **전체 토큰 수 → 조사/어미/접미사 제거 후 남은 토큰 수**로 숫자가 줄어드는 것을 직접 봐야 한다. 그래서 5개 수치(기사 수 / 전체 토큰 수 / 제거 후 남은 토큰 수 / 불용어 제외 수 / 고유 키워드 수)를 접거나 생략하지 않고 분석 완료 시 항상 한 줄 KPI 로우로 보여준다.

**행별 "불용어로 추가" 아이콘 액션 — 포함**
PRD의 사용자 여정이 "랭킹에 상투어가 보임 → 불용어 관리로 이동 → 추가 → 재분석"을 명시적 분기로 그리고 있다. 상단 링크만 있으면 사용자가 어떤 단어를 추가하려 했는지 페이지 이동 중에 잊어버릴 수 있다. 랭킹 행에 아이콘 버튼(`Ban`, `aria-label="{키워드} 불용어로 추가"`)을 두면 상투어를 발견한 그 자리에서 바로 다음 행동으로 이어진다. 단, 실제 추가 로직·불용어 페이지로의 파라미터 전달은 로직이므로 이 문서에서는 빈 핸들러 + TODO 주석으로만 남긴다.

**분석 진행 표시 — 3단계 스텝 + `role="status"`. 부정형 막대는 `Progress`가 아니라 장식용 트랙으로 그린다**
Kiwi 모델 로딩은 첫 실행 시 수 초가 걸릴 수 있고 토큰화·집계는 기사 수에 비례해 걸린다. 진행률을 퍼센트로 정확히 계산하기 어려운 단계(모델 로딩)가 섞여 있으므로 **확정값(value)이 없는 부정형 표시**가 맞다.

다만 `components/ui/progress.tsx`의 `Progress`를 **그 용도로 쓸 수 없다.** 구현이 `style={{ transform: 'translateX(-${100 - (value || 0)}%)' }}`(`components/ui/progress.tsx:25`)라 `value`를 주지 않으면 `100 - 0 = 100`, 즉 채움 막대가 `translateX(-100%)`로 트랙 밖으로 완전히 밀려난다. `[&>div]:animate-pulse`를 붙여도 보이지 않는 요소가 깜빡일 뿐이다. `components/ui/`는 shadcn CLI 생성물이라 이 화면 사정으로 고치지 않는다(`docs/CONVENTIONS.md` §2).

그래서 부정형 막대는 **`aria-hidden="true"`인 장식용 트랙**으로 직접 그린다: `bg-muted` 트랙 + `bg-primary` 채움 막대에 `animate-pulse`를 준다. **실제 진행 정보는 막대가 아니라 "① 모델 로딩 → ② 형태소 토큰화 → ③ 집계" 3단계 체크리스트 텍스트가 전달한다.** 전체 영역을 `role="status" aria-live="polite"`로 감싸면 막대가 스크린리더에서 빠져도 단계 전환이 그대로 읽힌다 — 정보가 완전한 쪽은 처음부터 텍스트다.

**"① Kiwi 모델 로딩" 단계는 서버에서 일어난다 — 클라이언트가 모델을 내려받는 것이 아니다**
이 단계를 "브라우저가 105MB WASM 모델을 다운로드하는 중"으로 읽으면 안 된다. 모델 파일 9개(105MB)는 `data/kiwi-model/`에 놓이고 **Node.js 서버 프로세스가 `fs`로 읽어 `build()`** 한다(`docs/kiwi-verification.md` §모델 배치·§측정). 실측치는 파일 읽기 36~55ms + **`build()` 1.3~1.6초, 반올림해 약 1.4초**다. 그리고 Kiwi 인스턴스는 `globalThis` 싱글턴이므로 **이 1.4초는 프로세스당 최초 1회만 발생하고, 두 번째 분석부터는 이 단계가 사실상 즉시 끝난다.**

따라서 화면 문구는 "모델을 내려받는 중"이 아니라 **"Kiwi 형태소 분석 모델 로딩"**(주체를 특정하지 않는 서버 작업)으로 쓰고, 로딩 진행률(내려받은 바이트/전체 바이트)을 암시하는 표현을 쓰지 않는다. 클라이언트에는 애초에 진행률로 셀 것이 없다.

### 카테고리 확장 (21일차 신규 기능, Task 028)

`docs/ROADMAP.md`에 없는 신규 기능이다. 저장소 계층(Task 026)이 `GET /api/runs/{runId}/keywords`에
반복 파라미터 `category`(미지정 = 전체)와 응답의 `uncategorizedCount`를 확정했고, 이 화면은 그 계약을
아래처럼 쓴다.

- **① 분석 조건 바에 카테고리 필터가 붙는다.** 품사 `ToggleGroup` 옆에
  `components/common/category-filter.tsx`(같은 `ToggleGroup type="multiple"` 패턴, 라벨은
  `PRESS_CATEGORY_LABELS`)를 둔다. [분석 시작]/[재분석] 클릭 시 현재 선택된 카테고리를
  `fetchKeywords(runId, { ..., categories })`에 함께 실어 보낸다 — 선택한 카테고리 기사만으로
  랭킹이 다시 계산된다.
- **"카테고리 미상 N건은 이 분석에서 제외했습니다" 안내(팀장 판정).** 결과 2 분석 요약 아래,
  `categories.length > 0 && result.uncategorizedCount > 0`일 때만 문구를 띄운다. 카테고리 값이
  아직 없는(Task 027 이전) 기사가 전부 제외되어 랭킹이 비어도 "필터가 고장났다"로 읽히지 않도록
  이유를 밝힌다.
- **[필터 초기화]는 카테고리를 되돌리지 않는다.** 상태 ⑤(결과 0건)의 [필터 초기화]는 최소 등장
  횟수·품사·표시 개수만 기본값으로 되돌린다 — 카테고리는 사용자가 의도적으로 좁힌 값일 수 있어
  "필터가 과해 결과가 없다"는 시나리오의 원인으로 단정하지 않는다.
- run을 바꾸면 카테고리 필터도 다른 필터들과 함께 기본값(전체)으로 초기화된다.

#### "결과 0건"의 세 원인을 가른다 (21일차 저장소 계층 인수인계 — `sourceArticleCount` 신설)

`KeywordsResult`(`lib/api/keyword-client.ts`)에 `sourceArticleCount`(category 필터 적용 **전** 원본
기사 수)가 추가되면서, `items`가 빈 배열인 상태 ⑤가 사실은 원인이 다른 세 가지를 뭉뚱그리고
있었다는 것이 드러났다. 화면은 아래 순서로 갈라 각자 다른 문구·액션을 보여준다(순서가 중요하다 —
①이 아니면 ②를 보고, ②도 아니면 ③이다).

| 순서 | 판정 조건 | 뜻 | 화면 처리 |
| --- | --- | --- | --- |
| ① | `result.message`가 있다(`isMessageEmpty`) | 이 run에 원본 기사 자체가 없다(`sourceArticleCount === 0`) | **랭킹 영역을 서버 문구로 교체한다(21일차 2차 수정 — 최초 구현은 조건 가드에만 쓰고 렌더링을 빠뜨려 팀장 지적으로 닫혔다).** `EmptyState`(`icon={<Inbox />}`)의 title을 "수집된 기사가 없습니다", description을 `result.message`(서버가 만든 문장, `EMPTY_RUN_MESSAGE`)를 그대로 쓴다. **액션 버튼을 주지 않는다** — 필터를 아무리 만져도 원본이 0건이라 [필터 초기화]·[카테고리 필터 해제] 둘 다 의미가 없다 |
| ② | `categories.length > 0 && uncategorizedCount > 0` | 카테고리 값이 없는(미상) 기사가 걸러졌다 | **이미 구현돼 있다.** 위 "카테고리 미상 N건" 문구가 랭킹 영역과 별개로 항상 뜬다. 랭킹 영역 자체는 기본 갈래의 일반 안내로 둔다(그 문구가 이미 원인을 설명했으므로 중복 안내하지 않는다) |
| ③ | `!result.message && categories.length > 0 && uncategorizedCount === 0 && summary.articleCount === 0` | 기사는 있는데 **고른 카테고리와 안 맞아** 전부 빠졌다(신규 케이스) | **랭킹 영역만 새 안내로 교체한다.** `EmptyState`(`icon={<SearchX />}`)의 title을 "선택한 카테고리에 해당하는 기사가 없습니다", description을 "이 실행에는 고른 카테고리의 기사가 없습니다. 다른 카테고리를 선택하거나 카테고리 필터를 해제해 보세요."로, actionLabel을 "카테고리 필터 해제"로 바꾼다. `onAction`은 카테고리만 비우고(`minCount`·품사는 원인이 아니므로 건드리지 않는다) 그 값으로 즉시 재조회한다 |
| (기본) | 위 어디에도 안 걸림(예: `summary.articleCount > 0`인데 `minCount`·품사가 다 걸러낸 경우) | 필터가 과해 결과가 없다 | 기존 EmptyState("조건에 맞는 키워드가 없습니다" · [필터 초기화]) 그대로 |

**순서가 중요하다** — ①이 아니면 ②·③을 보고, 셋 다 아니면 기본 갈래다. `isMessageEmpty`를 가장
먼저 검사하는 이유는 `sourceArticleCount === 0`이면 `summary.articleCount`도 항상 0이라(원본이
없으면 필터를 통과할 것도 없다) ③의 조건과 겹칠 수 있기 때문이다 — ①을 먼저 가르지 않으면
"카테고리를 안 걸렀는데도 원본이 0건인" 가장 흔한 실패 케이스가 기본 갈래로 새어 "필터를
낮추라"는 틀린 조언을 받는다.

`summary.articleCount`(category 필터를 통과한 뒤의 값, `minCount`·품사에는 흔들리지 않는다)가 ③과
기본 갈래를 가르는 핵심이다 — `articleCount === 0`이면 카테고리 필터 자체가 아무 기사도 통과시키지
못한 것이고, `articleCount > 0`인데 `items`가 비면 `minCount`·품사가 원인이다. 두 원인에 같은 문구를
쓰면 사용자가 최소 등장 횟수를 아무리 낮춰도 결과가 안 나오는 ③ 상황에서 헛수고를 하게 된다.

### 컴포넌트 분할 경계

이 문서의 마크업 스켈레톤은 읽기 쉽도록 한 파일에 이어 붙여 놓았지만, **구현은 한 파일에 몰지 않는다.** `docs/ROADMAP.md` Task 022가 못 박은 파일 목록이 기준이고, 스켈레톤의 각 구간은 아래 파일로 나눠 간다.

| 스켈레톤 구간 | 가는 파일 |
|---------------|-----------|
| 페이지 골격(`PageContainer` + `PageHeader` + 상태 분기) | `app/keywords/page.tsx` (수정 — `ScreenPlaceholder` 제거, `?runId` 쿼리 수신) |
| ① 분석 조건 바 `<Card>` 전체 | `components/keywords/analysis-filter-bar.tsx` (신규) |
| ② 분석 요약 5개 수치 KPI 로우 | `components/keywords/analysis-summary.tsx` (신규) |
| ③ Top 5 섹션 + `TopKeywordCard` + 순위별 강조선/폰트 상수 | `components/keywords/top-keyword-cards.tsx` (신규) |
| ④ 랭킹 표(`sm:` 이상) + `KeywordRankRow` | `components/keywords/keyword-rank-table.tsx` (신규) |
| ④ 랭킹 카드 리스트(`sm:` 미만) | `components/keywords/keyword-rank-card-list.tsx` (신규) |
| ⑥ 분석 진행 중 3단계 스텝 카드 | `components/keywords/analysis-progress.tsx` (신규) |
| 분석 요청·결과 fetch 래퍼 | `lib/api/keyword-client.ts` (신규) |

빈 상태(`EmptyState`)·실패(`ErrorAlert`)는 `components/common/`의 기존 파일을 호출하므로 새 파일을 만들지 않는다.

---

## 와이어프레임 — 데스크톱 (≥1024px)

상태 ③ 분석 완료(메인 화면) 기준.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ (공통 헤더 1줄 — sticky, 메뉴 5개 + 다크모드 토글: 00-app-shell.md 참조)        │
├────────────────────────────────────────────────────────────────────────────┤
│  <PageContainer> — main.flex-1 > div.container.mx-auto.max-w-6xl            │
│                                                                              │
│  홈 › 핫 키워드 분석                                                          │
│  🔥 핫 키워드 분석                                                            │
│  형태소 분석으로 조사·어미를 제거하고 명사·영문 키워드의 등장 빈도를 랭킹으로 보여줍니다 │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ ① 분석 조건 바                                                          │  │
│ │ 분석 대상 run  [ 2026-08-10 09:12 · 언론사 4곳 · 성공 87건        ▼ ]     │  │
│ │                                                                        │  │
│ │ 최소 등장 횟수 [   2   ]회 이상    품사 [x NNG][x NNP][ SL ]             │  │
│ │ 표시 개수 [ Top 50                ▼ ]                 [ ⟳ 재분석 ]      │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ ② 분석 요약                                                             │  │
│ │  분석 기사   전체 토큰   조사·어미 제거 후   불용어 제외   고유 키워드      │  │
│ │   53건       17,915개     12,080개            84개         2,412개      │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ③ Top 5 핫 키워드                              [불용어 관리로 이동 →]      │
│ ┌────────┬────────┬────────┬────────┬────────┐                            │
│ │▔▔▔▔▔▔▔▔│▔▔▔▔▔▔▔▔│▔▔▔▔▔▔▔▔│▔▔▔▔▔▔▔▔│▔▔▔▔▔▔▔▔│ ← border-t-primary 투명도    │
│ │        │        │        │        │        │    100→70→50→35→20%          │
│ │  1위   │  2위   │  3위   │  4위   │  5위   │                            │
│ │인공지능 │ 삼성전자│ 반도체 │ 오픈AI │ 클라우드│                            │
│ │[NNG]   │[NNP]   │[NNG]   │[SL]    │[NNG]   │                            │
│ │ 128회  │  96회  │  84회  │  77회  │  65회  │  ← 폰트 큼→작음              │
│ └────────┴────────┴────────┴────────┴────────┘                            │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ ④ 키워드 랭킹 (Top 50)                                                  │  │
│ │  #    키워드         품사    등장 횟수▾   비중                    ⑤    │  │
│ │ ───────────────────────────────────────────────────────────────────  │  │
│ │  1    인공지능       NNG      128        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 62%  🚫   │  │
│ │  2    삼성전자       NNP       96        ▓▓▓▓▓▓▓▓▓▓░░░░░░░░ 47%  🚫   │  │
│ │  3    반도체         NNG       84        ▓▓▓▓▓▓▓▓░░░░░░░░░░ 41%  🚫   │  │
│ │  4    오픈AI         SL        77        ▓▓▓▓▓▓▓░░░░░░░░░░░ 38%  🚫   │  │
│ │  5    클라우드       NNG       65        ▓▓▓▓▓▓░░░░░░░░░░░░ 32%  🚫   │  │
│ │  …    …              …         …          …                      …    │  │
│ │  50   기자           NNG        3        ▓░░░░░░░░░░░░░░░░  1%   🚫   │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

- `⑤`는 열 헤더에는 `불용어` 텍스트를 시각적으로 숨기고(`sr-only`) 아이콘 버튼(🚫)만 노출한다.
- 표 헤더 "등장 횟수▾"의 `▾`는 정렬 트리거가 아니라 **정적 내림차순 표시**(항상 빈도순 고정, 아래 접근성 절 참고)다.

---

## 와이어프레임 — 모바일 (<640px)

```
┌───────────────────────────┐
│ (헤더 1줄, 메뉴 햄버거)      │
├───────────────────────────┤
│ <PageContainer> px-4 py-6  │
│                             │
│ 홈 › 핫 키워드 분석          │
│ 🔥 핫 키워드 분석            │
│ 형태소 분석으로 조사·어미…    │
│                             │
│ ┌─────────────────────┐   │
│ │ ① 조건 바 (1열 스택)    │   │
│ │ 분석 대상 run          │   │
│ │ [ 2026-08-10 09:12 ▼]│   │
│ │ 최소 등장 횟수 [  2  ]  │   │
│ │ 품사 [x NNG][x NNP][SL]│   │
│ │ 표시 개수 [Top 50   ▼]│   │
│ │ [[      재분석      ]]│   │
│ └─────────────────────┘   │
│                             │
│ ┌─────────────────────┐   │
│ │ ② 분석 요약 (2열 그리드)│   │
│ │ 분석 기사   53건        │   │
│ │ 전체 토큰   17,915개    │   │
│ │ 제거 후 남음 12,080개   │   │
│ │ 불용어 제외  84개       │   │
│ │ 고유 키워드  2,412개    │   │
│ └─────────────────────┘   │
│                             │
│ ③ Top 5   [불용어 관리→]  │
│ ┌───┬───┐  grid-cols-2,    │
│ │1위 │2위│  가로 스크롤 없이  │
│ │인공 │삼성│  2열로 줄바꿈    │
│ │지능 │전자│                 │
│ │128 │96 │                 │
│ ├───┼───┤ ↓ 3·4위 다음 줄  │
│ │3위 │4위│                  │
│ └───┴───┘                  │
│ ┌───┐    ↓ 5위 마지막 줄    │
│ │5위 │                      │
│ └───┘                      │
│                             │
│ ┌─────────────────────┐   │
│ │ ④ 랭킹 — 카드 리스트     │   │
│ │ ┌─────────────────┐ │   │
│ │ │1  인공지능  [NNG]│ │   │
│ │ │   128회      🚫 │ │   │
│ │ │   ▓▓▓▓▓▓▓░░ 62% │ │   │
│ │ └─────────────────┘ │   │
│ │ ┌─────────────────┐ │   │
│ │ │2  삼성전자  [NNP]│ │   │
│ │ │    96회      🚫 │ │   │
│ │ │   ▓▓▓▓▓░░░░ 47% │ │   │
│ │ └─────────────────┘ │   │
│ │        …             │   │
│ └─────────────────────┘   │
└───────────────────────────┘
```

- 640px 미만에서는 `Table`을 그대로 쓰지 않고 행마다 `Card` 1장으로 대체한다(README 공통 규칙 — "표는 카드 리스트로 대체"). 정보 구성은 동일(순위/키워드/품사/횟수/비중/액션).
- Top 5는 5칸이 좁은 화면에 다 안 들어가므로 `grid grid-cols-2 gap-3`로 2열 줄바꿈한다(가로 스크롤 아님) — 근거는 `docs/DECISIONS.md`의 **D-043**.

---

## 영역별 컴포넌트 명세

| 영역 | UI 컴포넌트 | Tailwind 클래스(핵심) | 비고 |
|------|-------------|------------------------|------|
| 본문 컨테이너 | `PageContainer`(`components/common/page-container.tsx`) | (컴포넌트 내부에 `<main className="flex-1">` + `container mx-auto max-w-6xl px-4 py-6 md:py-8`) | 기본 폭 `default`(=`max-w-6xl`) 사용. `<div>`를 손으로 쓰지 않는다 |
| 페이지 헤더 | `PageHeader`(`components/common/page-header.tsx`) | (컴포넌트 내부 `mb-6`, `h1`은 `text-2xl font-semibold tracking-tight md:text-3xl`) | `breadcrumbs={[{ label: '홈', href: '/' }, { label: '핫 키워드 분석' }]}` — `href`가 있는 항목은 컴포넌트가 `BreadcrumbLink asChild` + `next/link`로 렌더한다 |
| ① 조건 바 | `Card`, `Label`, `Select`(run), `Input type="number"`(최소 등장 횟수), `ToggleGroup`+`ToggleGroupItem`(품사), `Select`(표시 개수), `Button`(분석 시작/재분석) | `flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap` | 버튼 라벨은 상태에 따라 "분석 시작" ↔ "재분석" 전환(③ 상태별 화면 참고) |
| ② 분석 요약 | `Card`, `dl`/`div` 그리드 | `grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5`, 값 `text-lg font-semibold tabular-nums`, 라벨 `text-xs text-muted-foreground` | 조사 제거 전/후 대비가 핵심이므로 "전체 토큰 수"와 "제거 후 남은 토큰 수" 두 항목은 인접 배치 |
| ③ Top 5 강조 | `Card` × 5, `Badge`(품사) | `grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5`, 카드 `border-t-4` + `border-t-primary` → `border-t-primary/70` `/50` `/35` `/20` | 1위 `text-2xl` → 5위 `text-base`로 폰트 점감. `--chart-*`는 쓰지 않는다(다크에서 순위 인코딩 반전 — 설계 결정 절 참고) |
| ④ 랭킹 표(데스크톱) | `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`/`TableCaption`, `Badge`(품사) | `caption-bottom text-sm`, 등장 횟수 `text-right tabular-nums` | `aria-label` 또는 `caption`으로 표 목적 명시 |
| ④ 랭킹 카드(모바일) | `Card` 반복 | `space-y-3` | 표와 동일 정보를 카드 1장 = 행 1개로 매핑 |
| 비중 막대 | `div`(트랙) + `div`(채움) | 트랙 `h-1.5 w-full rounded-full bg-muted`, 채움 `h-1.5 rounded-full bg-primary` + 인라인 `style={{ width }}` | 장식용, `aria-hidden="true"`. 수치는 옆 텍스트로 항상 병기 |
| ⑤ 불용어 연동(상단) | `Button variant="link" asChild` + `Link`(next/link) | `text-sm` + `ArrowRight` 아이콘 | 조건 바 우측 또는 Top 5 영역 우측. **raw `<a href="/stopwords">` 금지** — `app/` 하위에서 `@next/next/no-html-link-for-pages` **error**로 `npm run lint`가 실패한다 |
| ⑤ 불용어 연동(행별) | `Button variant="ghost" size="icon-sm"` | `text-muted-foreground hover:text-destructive` | `Ban` 아이콘, `aria-label` 필수(키워드명 포함) |
| ⑥ 분석 진행 상태 | `Card`, 장식용 트랙 `div` 2겹, 단계 리스트(`ul`/`li`) | 컨테이너 `role="status" aria-live="polite"`, 트랙 `h-1 w-full overflow-hidden rounded-full bg-muted` + 채움 `h-full w-1/3 rounded-full bg-primary animate-pulse` | 분석 중에만 조건부로 ①~④ 자리에 노출. **`Progress`를 쓰지 않는다** — value 없이 렌더하면 `translateX(-100%)`로 밀려나 보이지 않는다(설계 결정 절 참고) |
| 빈 상태 | `EmptyState`(`components/common/empty-state.tsx`) | (컴포넌트 내부 `Empty` 프리미티브) | `icon`/`title`/`description`/`actionLabel`/`actionHref`만 넘긴다. `border-dashed py-16` 블록을 손으로 그리지 않는다 |
| 실패 | `ErrorAlert`(`components/common/error-alert.tsx`) | (컴포넌트 내부 `Alert variant="destructive"` + `TriangleAlert`) | `description`과 `onRetry`만 넘긴다. `Alert`에 `role="alert"`이 내장돼 있다 |

---

## 상태별 화면

### ① 분석 전 (run 선택만 된 상태)

조건 바만 값이 채워져 있고, 요약·Top 5·랭킹 표 자리에는 "아직 분석하지 않았다"는 안내만 있다. 버튼 라벨은 **[분석 시작]**.

```
┌──────────────────────────────────────────────────────────────────┐
│ ① 분석 조건 바 — run 선택됨, 필터는 기본값                          │
│ 분석 대상 run [ 2026-08-10 09:12 · 언론사 4곳 · 성공 87건      ▼ ] │
│ 최소 등장 횟수 [ 1 ]회 이상   품사 [x NNG][x NNP][x SL]             │
│ 표시 개수 [ Top 50 ▼ ]                        [[ ▶ 분석 시작 ]]    │
└──────────────────────────────────────────────────────────────────┘

   ┌ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┐
   ¦                                                               ¦
   ¦     아직 분석 결과가 없습니다.                                  ¦
   ¦     [분석 시작]을 누르면 이 run의 기사 본문을 형태소 분석합니다.    ¦
   ¦                                                               ¦
   └ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┘
```

이 안내 블록도 `EmptyState`로 그린다(`icon={<Flame />}`, 액션 버튼은 조건 바의 [분석 시작]이 이미 담당하므로 `actionLabel`을 주지 않는다). 점선 테두리 박스를 손으로 다시 만들지 않는다.

### ② 분석 진행 중 (Kiwi 모델 로딩 → 토큰화 → 집계)

②~④ 영역 자리를 진행 카드 하나가 대체한다. `role="status" aria-live="polite"`로 전체를 감싸 단계 전환을 스크린리더가 읽는다.

```
┌──────────────────────────────────────────────────────────────────┐
│  ⟳  87건의 기사를 분석하고 있습니다…                                 │
│     ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░  (진행률 불확정 애니메이션) │
│                                                                    │
│   ✓ ① Kiwi 형태소 분석 모델 로딩 완료                                │
│   ⟳ ② 형태소 토큰화 진행 중 (조사·어미·접미사 제거)                    │
│   ○ ③ 불용어 필터링 및 빈도 집계 대기                                 │
│                                                                    │
│              [ 취소 ]  ← 선택: MVP에서는 생략 가능(아래 설명)         │
└──────────────────────────────────────────────────────────────────┘
```

조건 바는 비활성화(`disabled`)되어 값 변경이 막힌다. 취소 버튼은 PRD에 명시된 기능이 아니므로 이번 마크업 스켈레톤에는 포함하지 않는다(주석으로만 자리 표시).

와이어프레임의 `▓▓▓░░░` 막대는 `Progress`가 아니라 **`aria-hidden`인 장식용 트랙**이다. 그리고 "① Kiwi 형태소 분석 모델 로딩"은 **서버 프로세스가 모델을 읽어 `build()`하는 시간(약 1.4초, 싱글턴이라 프로세스당 최초 1회)**이지 브라우저가 105MB를 내려받는 시간이 아니다. 두 근거 모두 위 "설계 결정과 근거" 절에 있다.

### ③ 분석 완료 (Top N 카드 + 랭킹 표, 메인 화면)

위 "와이어프레임 — 데스크톱/모바일" 절 참고. 버튼 라벨은 **[재분석]**으로 바뀐다.

### ④ 분석할 run이 없는 빈 상태

조건 바의 run 셀렉터 자체가 고를 대상이 없는 상태. 페이지 전체가 안내 카드로 대체된다.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                    │
│                            📭                                     │
│                 수집된 데이터가 없습니다                             │
│        먼저 크롤링을 실행해 기사를 수집해야 키워드를 분석할 수 있습니다  │
│                                                                    │
│                  [[ 크롤링 실행하러 가기 ]]                          │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

`Inbox` 아이콘, 버튼은 크롤링 실행 페이지(홈)로 이동.

### ⑤ 결과 0건 (필터가 과해 결과 없음)

조건 바·분석 요약·Top 5는 정상 표시되고(분석 자체는 성공했으므로), 랭킹 표 자리만 "조건에 맞는 키워드가 없습니다"로 대체된다. Top 5는 필터 적용 전 전체 기준으로 유지할지, 필터 적용 결과로 같이 비울지는 로직 영역이라 이 문서에서는 **표 영역만** 빈 상태로 그린다.

```
┌──────────────────────────────────────────────────────────────────┐
│ ④ 키워드 랭킹 (Top 50)                                              │
│                                                                    │
│           조건에 맞는 키워드가 없습니다                               │
│    최소 등장 횟수를 낮추거나 품사 필터 범위를 넓혀서 다시 시도해 보세요   │
│                                                                    │
│                     [ 필터 초기화 ]                                 │
└──────────────────────────────────────────────────────────────────┘
```

### ⑥ 분석 실패

`Alert variant="destructive"`로 ①~④ 영역 상단에 노출하고, 조건 바는 값이 유지된 채 다시 활성화되어 바로 재시도할 수 있다.

```
┌──────────────────────────────────────────────────────────────────┐
│ ⚠ 분석에 실패했습니다                                                │
│   형태소 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.        │
│                                                          [ 다시 시도 ]│
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ① 분석 조건 바 — 값 유지, 다시 활성화됨                               │
│ 분석 대상 run [ 2026-08-10 09:12 · 언론사 4곳 · 성공 87건      ▼ ]  │
│ …                                              [[ ▶ 분석 시작 ]]    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 사용 컴포넌트

### 설치 완료 (추가 설치 불필요 — `docs/screens/README.md` §화면별 사용 shadcn 컴포넌트가 설치 상태의 단일 소스)
`alert` `badge` `breadcrumb` `button` `card` `input` `label` `navigation-menu` `select` `skeleton` `sonner` `table` `toggle-group`

이 화면이 새로 쓰는 3종의 용도는 아래와 같다.

| 컴포넌트 | 이 화면에서의 용도 |
|----------|--------------------|
| `select` | 분석 대상 run 셀렉터, 표시 개수(Top 20/50/100) 셀렉터 |
| `toggle-group` | 품사 필터(NNG/NNP/SL) 다중 토글 |
| `label` | `Input`(최소 등장 횟수) · `Select`와 접근성 있게 연결되는 폼 레이블 |
| `empty` | `EmptyState`(`components/common/empty-state.tsx`)가 내부에서 쓴다. 00 셸 설치 목록에 이미 있다 |

> (19일차: 크롤 파이프라인이 설계서 전수 검토 중 발견해, 화면이 I-010과 같은 방식으로 처리했다. `select`·`toggle-group`·`label` 모두 `components/ui/`에 실물이 있고 `docs/screens/README.md`가 이미 이 셋을 03의 설치 완료 목록에 넣어 두어 "추가 설치 필요" 절과 설치 명령이 중복·오류였다. 절을 지우지 않고 "설치 완료" 목록에 합쳤다.)

`slider`, `tabs`, `tooltip`, `chart`, `dialog`는 이 화면에서 쓰지 않는다 — 근거는 "설계 결정과 근거" 절 참고(슬라이더 대신 숫자 입력, 차트 라이브러리 대신 Tailwind 미니 막대, 수치가 항상 텍스트로 병기되어 호버 툴팁이 필수가 아님).

**`progress`도 이 화면에서는 쓰지 않는다.** 설치 자체는 01 크롤링 실행 화면 때문에 이미 되어 있지만(`components/ui/progress.tsx`), 이 화면이 필요한 것은 확정값 없는 부정형 막대이고 그 컴포넌트는 `value`가 없으면 트랙 밖으로 밀려난다. 대신 장식용 트랙을 직접 그린다 — 근거는 위 "분석 진행 표시" 결정 참고.

### lucide 아이콘

| 아이콘 | 용도 |
|--------|------|
| `Flame` | Top 5 섹션 제목 아이콘. **페이지 `h1`에는 넣지 않는다** — `PageHeader`의 `title`이 문자열 prop이라 아이콘을 얹을 자리가 없다 |
| `Play` | [분석 시작] 버튼 |
| `RefreshCw` | [재분석] 버튼 |
| `ArrowRight` | [불용어 관리로 이동] 링크 |
| `Ban` | 랭킹 행별 "이 단어 불용어로 추가" 아이콘 버튼 |
| `LoaderCircle` | 분석 진행 중 스피너(`animate-spin`) |
| `CircleCheckBig` | 진행 단계 리스트 — 완료된 단계 |
| `CircleDashed` | 진행 단계 리스트 — 대기 중인 단계 |
| `Inbox` | 분석할 run이 없는 빈 상태 — `EmptyState`의 `icon` prop에 넘긴다 |
| `SearchX` | 필터 결과 0건 빈 상태 — `EmptyState`의 `icon` prop에 넘긴다 |
| `TriangleAlert` | 분석 실패 — `ErrorAlert` 내부에 이미 들어 있어 이 화면에서 직접 import하지 않는다 |

---

## 접근성

- **랭킹 표**: `Table`에 `aria-label="키워드 등장 빈도 랭킹"` 또는 `TableCaption`(시각적으로 필요 없으면 `sr-only`)을 붙인다. "등장 횟수" 열 `TableHead`에는 `aria-sort="descending"`을 정적으로 부여한다 — PRD상 정렬 기준이 빈도순으로 고정이라 사용자가 바꿀 수 있는 정렬 트리거는 없으므로, 클릭 가능한 정렬 버튼은 만들지 않고 현재 정렬 상태만 스크린리더에 알린다.
- **비중 막대**: 순수 장식이므로 막대 `div`에 `aria-hidden="true"`를 준다. 실제 수치(등장 횟수, 백분율)는 같은 행의 일반 텍스트로 항상 노출되어 막대 없이도 정보가 완전하다.
- **분석 진행 상태**: 영역 전체 컨테이너에 `role="status" aria-live="polite"`를 부여해 "① 모델 로딩 완료 → ② 토큰화 진행 중" 같은 단계 전환이 스크린리더에 자동으로 읽히게 한다. **부정형 막대는 `aria-hidden="true"`인 순수 장식**이므로 `role="progressbar"`나 `aria-valuenow`/`aria-valuetext`를 붙이지 않는다 — 값이 없는 progressbar는 스크린리더에 아무 정보도 주지 못하고, 실제 진행 정보는 3단계 체크리스트 텍스트가 전부 전달한다.
- **품사 토글**: `ToggleGroup`(Radix 기반)은 각 `ToggleGroupItem`에 `data-state="on"/"off"`와 `aria-pressed`를 자동으로 관리한다. 라벨이 "NNG"/"NNP"/"SL" 텍스트 자체이므로 별도 `aria-label` 없이도 접근 가능한 이름이 확보된다.
- **아이콘 전용 버튼**: 랭킹 행의 `Ban` 버튼은 시각 라벨이 없으므로 `aria-label="{keyword} 불용어로 추가"`를 키워드마다 다르게 채운다. 재분석/분석 시작 버튼은 아이콘+텍스트가 함께 있으므로 추가 `aria-label`이 필요 없다.
- **폼 레이블 연결**: 최소 등장 횟수 `Input`은 `Label htmlFor="min-count"` + `Input id="min-count"`로 연결한다. `Select`도 `Label htmlFor`를 `SelectTrigger`의 `id`와 연결한다.
- **색만으로 정보 전달 금지**: 품사 구분은 배지 안의 문자열("NNG"/"NNP"/"SL")로 이미 텍스트 정보이며, Top 5 카드의 강조선 농도(`border-t-primary` 투명도 단계)는 순위 숫자·폰트 크기라는 별도 채널과 항상 함께 제공되어 색맹 사용자도 순위를 구분할 수 있다.
- **빈 상태 / 실패 alert**: `EmptyState`·`ErrorAlert` 공통 컴포넌트를 쓴다. `ErrorAlert`가 감싸는 `Alert`에 `role="alert"`이 기본 내장(`components/ui/alert.tsx`)돼 있어 별도 처리가 필요 없다. 실패 상태의 "다시 시도" 버튼은 조건 바의 분석 시작 버튼과 동일 동작이라는 것을 `aria-describedby` 등으로 명시할 수 있으나 MVP에서는 생략 가능.

---

## 마크업 스켈레톤

아래는 상태 ③(분석 완료, 메인 화면) 기준 정적 TSX다. 로딩/빈 상태/0건/실패는 해당 영역만 바뀌므로, 본문 뒤에 대체 스니펫을 별도 코드 블록으로 덧붙인다.

읽기 편하도록 한 블록에 이어 붙였을 뿐, **구현은 위 "컴포넌트 분할 경계" 표대로 파일을 나눈다.**

### ⚠️ 아래 스켈레톤의 `RunOption` 선언을 그대로 베끼지 않는다 (I-026)

스켈레톤이 선언하는 run 셀렉터용 더미 타입 `RunOption`(`{ id, label }`)은 **실제 API 응답과 다르다.** 이
셀렉터가 실제로 소비하는 것은 새 API가 아니라 **Task 017이 확정한 `GET /api/runs`**이고, 그 응답 타입은
`lib/api/run-client.ts`의 `RunListItem`이다 — `id`·`label` 외에 `startedAt`·`finishedAt`·`status`·
`targetPressCount`·`successCount`·`failCount`·`skippedCount` 7개가 더 있다. 구현은 `RunOption`을 새로
선언하지 말고 `lib/api/run-client.ts`의 `RunListItem`·`fetchRuns()`를 그대로 import한다(018A가
`components/results/run-select.tsx`에서 쓴 방식 그대로이며, 022A의 `analysis-filter-bar.tsx`가 실제로 이
방식으로 구현돼 있다). `MOCK_RUNS`도 화면 형태를 보여주기 위한 정적 더미일 뿐 실 데이터는
`fetchRuns()`로 조회한다. `AnalysisSummary`·`KeywordRankItem`·`PosTag`는 `lib/types/keyword.ts`와
필드명·타입이 어긋나지 않으므로 그대로 옮겨도 안전하다 — 어긋나는 것은 `RunOption` 하나뿐이다.

```tsx
'use client'

import Link from 'next/link'

import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ArrowRight, Ban, Flame, RefreshCw } from 'lucide-react'

// 품사 태그 — Kiwi 세종 태그셋 기준 이 화면이 다루는 3종만 허용
type PosTag = 'NNG' | 'NNP' | 'SL'

interface RunOption {
  id: string
  label: string // 예: "2026-08-10 09:12 · 언론사 4곳 · 성공 87건"
}

interface AnalysisSummary {
  articleCount: number
  totalTokenCount: number
  filteredTokenCount: number // 조사·어미·접미사 제거 후 남은 토큰 수
  stopwordExcludedCount: number
  uniqueKeywordCount: number
}

interface KeywordRankItem {
  rank: number
  keyword: string
  posTag: PosTag
  count: number
  ratio: number // 0~1, 최상위 키워드 대비 비중
}

interface TopKeywordCardProps {
  item: KeywordRankItem
}

interface KeywordRankRowProps {
  item: KeywordRankItem
}

// ---- 더미 데이터 (형태만 보여주기 위한 하드코딩) ----

const MOCK_RUNS: RunOption[] = [
  { id: 'run_20260810_0912', label: '2026-08-10 09:12 · 언론사 4곳 · 성공 87건' },
  { id: 'run_20260809_2130', label: '2026-08-09 21:30 · 언론사 3곳 · 성공 54건' },
]

// 13일차 실측값(Task 022A 검증 회차). 근거 없는 예시 수치를 스켈레톤에 그대로 두면 다음 사람이
// 베껴 퍼뜨리므로(I-026·I-024와 같은 계열의 함정) 실측으로 맞춰 둔다.
const MOCK_SUMMARY: AnalysisSummary = {
  articleCount: 53,
  totalTokenCount: 17915,
  filteredTokenCount: 12080,
  stopwordExcludedCount: 84,
  uniqueKeywordCount: 2412,
}

const MOCK_TOP_KEYWORDS: KeywordRankItem[] = [
  { rank: 1, keyword: '인공지능', posTag: 'NNG', count: 128, ratio: 1 },
  { rank: 2, keyword: '삼성전자', posTag: 'NNP', count: 96, ratio: 0.75 },
  { rank: 3, keyword: '반도체', posTag: 'NNG', count: 84, ratio: 0.66 },
  { rank: 4, keyword: '오픈AI', posTag: 'SL', count: 77, ratio: 0.6 },
  { rank: 5, keyword: '클라우드', posTag: 'NNG', count: 65, ratio: 0.51 },
]

const MOCK_KEYWORD_RANKS: KeywordRankItem[] = [
  ...MOCK_TOP_KEYWORDS,
  { rank: 6, keyword: '데이터센터', posTag: 'NNG', count: 58, ratio: 0.45 },
  { rank: 7, keyword: 'LLM', posTag: 'SL', count: 51, ratio: 0.4 },
  { rank: 8, keyword: '스타트업', posTag: 'NNG', count: 44, ratio: 0.34 },
]

// 순위별 강조선 — 1위(진함) → 5위(옅음)
// --chart-*는 라이트/다크가 같은 고정값이라 다크에서 순위 인코딩이 뒤집힌다.
// --primary는 모드에 따라 값이 뒤집히므로 두 모드 모두에서 순서가 유지된다.
const TOP_RANK_ACCENT_CLASS: Record<number, string> = {
  1: 'border-t-primary',
  2: 'border-t-primary/70',
  3: 'border-t-primary/50',
  4: 'border-t-primary/35',
  5: 'border-t-primary/20',
}

// 순위별 폰트 크기 — 1위(크게) → 5위(작게)
const TOP_RANK_TEXT_CLASS: Record<number, string> = {
  1: 'text-2xl',
  2: 'text-xl',
  3: 'text-xl',
  4: 'text-lg',
  5: 'text-lg',
}

function TopKeywordCard({ item }: TopKeywordCardProps) {
  return (
    <Card
      className={`border-t-4 ${TOP_RANK_ACCENT_CLASS[item.rank] ?? 'border-t-primary/20'} text-center`}
    >
      <CardContent className="flex flex-col items-center gap-1.5 pt-2">
        <span className="text-xs font-medium text-muted-foreground">{item.rank}위</span>
        <span className={`${TOP_RANK_TEXT_CLASS[item.rank] ?? 'text-lg'} font-semibold`}>
          {item.keyword}
        </span>
        <Badge variant="outline">{item.posTag}</Badge>
        <span className="text-sm tabular-nums text-muted-foreground">{item.count}회</span>
      </CardContent>
    </Card>
  )
}

function KeywordRankRow({ item }: KeywordRankRowProps) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground tabular-nums">{item.rank}</TableCell>
      <TableCell className="font-medium">{item.keyword}</TableCell>
      <TableCell>
        <Badge variant="outline">{item.posTag}</Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums">{item.count}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {/* 장식용 막대 — 실제 수치는 옆 텍스트로 병기하므로 스크린리더에서 숨김 */}
          <div className="h-1.5 w-full rounded-full bg-muted" aria-hidden="true">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{ width: `${Math.round(item.ratio * 100)}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {Math.round(item.ratio * 100)}%
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${item.keyword} 불용어로 추가`}
          onClick={() => {}}
          // TODO: 불용어 목록에 추가 후 재분석까지 이어지는 로직 구현 필요
        >
          <Ban className="text-muted-foreground" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

export default function HotKeywordAnalysisPage() {
  return (
    // 컨테이너·<main>·페이지 헤더는 공통 컴포넌트가 그린다. 여기서 다시 그리지 않는다.
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: '홈', href: '/' }, { label: '핫 키워드 분석' }]}
        title="핫 키워드 분석"
        description="형태소 분석으로 조사·어미를 제거하고 명사·영문 키워드의 등장 빈도를 랭킹으로 보여줍니다"
      />

      <div className="space-y-6">
        {/* ① 분석 조건 바 */}
        <Card>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex min-w-56 flex-1 flex-col gap-1.5">
              <Label htmlFor="run-select">분석 대상 run</Label>
              <Select defaultValue={MOCK_RUNS[0].id}>
                <SelectTrigger id="run-select">
                  <SelectValue placeholder="분석할 run을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_RUNS.map((run) => (
                    <SelectItem key={run.id} value={run.id}>
                      {run.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="min-count">최소 등장 횟수</Label>
              <div className="flex items-center gap-2">
                <Input id="min-count" type="number" min={1} defaultValue={2} className="w-20" />
                <span className="text-sm text-muted-foreground">회 이상</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pos-filter">품사</Label>
              <ToggleGroup
                id="pos-filter"
                type="multiple"
                variant="outline"
                defaultValue={['NNG', 'NNP', 'SL']}
              >
                <ToggleGroupItem value="NNG">NNG</ToggleGroupItem>
                <ToggleGroupItem value="NNP">NNP</ToggleGroupItem>
                <ToggleGroupItem value="SL">SL</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="top-n-select">표시 개수</Label>
              <Select defaultValue="50">
                <SelectTrigger id="top-n-select" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">Top 20</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                  <SelectItem value="100">Top 100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => {}}
              // TODO: 현재 필터 조건으로 Kiwi 형태소 분석 재실행 로직 구현 필요
            >
              <RefreshCw />
              재분석
            </Button>
          </CardContent>
        </Card>

        {/* ② 분석 요약 — "조사를 제거했다"를 수치로 증명 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">분석 요약</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <p className="text-xs text-muted-foreground">분석 기사</p>
              <p className="text-lg font-semibold tabular-nums">{MOCK_SUMMARY.articleCount}건</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">전체 토큰 수</p>
              <p className="text-lg font-semibold tabular-nums">
                {MOCK_SUMMARY.totalTokenCount.toLocaleString()}개
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">조사·어미 제거 후</p>
              <p className="text-lg font-semibold tabular-nums">
                {MOCK_SUMMARY.filteredTokenCount.toLocaleString()}개
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">불용어 제외</p>
              <p className="text-lg font-semibold tabular-nums">
                {MOCK_SUMMARY.stopwordExcludedCount.toLocaleString()}개
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">고유 키워드</p>
              <p className="text-lg font-semibold tabular-nums">
                {MOCK_SUMMARY.uniqueKeywordCount.toLocaleString()}개
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ③ Top 5 핫 키워드 강조 */}
        <section aria-label="Top 5 핫 키워드">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Flame className="text-muted-foreground" aria-hidden="true" />
              Top 5 핫 키워드
            </h2>
            {/* 내부 이동은 next/link — raw <a href="/…">는 lint error다 */}
            <Button variant="link" size="sm" asChild>
              <Link href="/stopwords">
                불용어 관리로 이동
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {MOCK_TOP_KEYWORDS.map((item) => (
              <TopKeywordCard key={item.rank} item={item} />
            ))}
          </div>
        </section>

        {/* ④ 키워드 랭킹 표 (데스크톱, sm 미만은 카드 리스트 대체 — 하단 별도 스니펫) */}
        <Card className="hidden sm:block">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              키워드 랭킹 (Top {MOCK_KEYWORD_RANKS.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table aria-label="키워드 등장 빈도 랭킹">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>키워드</TableHead>
                  <TableHead>품사</TableHead>
                  <TableHead aria-sort="descending" className="text-right">
                    등장 횟수
                  </TableHead>
                  <TableHead className="w-40">비중</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">불용어 관리</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_KEYWORD_RANKS.map((item) => (
                  <KeywordRankRow key={item.rank} item={item} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
```

### 상태별 대체 스니펫

아래 스니펫이 쓰는 공통 컴포넌트는 위 import 목록에 없다. 실제 파일에서는 함께 import한다.

```tsx
import { EmptyState } from '@/components/common/empty-state'
import { ErrorAlert } from '@/components/common/error-alert'
import { CircleCheckBig, CircleDashed, Inbox, LoaderCircle, SearchX } from 'lucide-react'
```

**② 분석 진행 중** — ①~④ 자리를 아래 카드 하나로 대체(조건 바는 `disabled` 유지 권장):

```tsx
<Card role="status" aria-live="polite">
  <CardContent className="space-y-4 py-6">
    <div className="flex items-center gap-2">
      <LoaderCircle className="animate-spin text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">87건의 기사를 분석하고 있습니다…</p>
    </div>
    {/*
      부정형 막대 — 순수 장식이라 aria-hidden. shadcn <Progress>는 value가 없으면
      translateX(-100%)로 트랙 밖에 숨으므로(components/ui/progress.tsx:25) 쓰지 않는다.
      실제 진행 정보는 아래 3단계 체크리스트 텍스트가 전달한다.
    */}
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
    </div>
    <ul className="space-y-1.5 text-sm">
      <li className="flex items-center gap-2 text-muted-foreground">
        <CircleCheckBig className="size-4" aria-hidden="true" />
        {/* 모델 로딩은 서버에서 일어난다(build() 약 1.4초, 싱글턴이라 프로세스당 최초 1회).
            브라우저가 105MB를 내려받는 것이 아니므로 다운로드 진행률로 읽히는 문구를 쓰지 않는다. */}
        Kiwi 형태소 분석 모델 로딩 완료
      </li>
      <li className="flex items-center gap-2 font-medium">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        형태소 토큰화 진행 중 (조사·어미·접미사 제거)
      </li>
      <li className="flex items-center gap-2 text-muted-foreground">
        <CircleDashed className="size-4" aria-hidden="true" />
        불용어 필터링 및 빈도 집계 대기
      </li>
    </ul>
  </CardContent>
</Card>
```

**④ 분석할 run이 없는 빈 상태** — 페이지 본문 전체를 대체:

```tsx
{/* 공통 빈 상태 컴포넌트를 호출한다. border-dashed py-16 블록을 다시 그리지 않는다.
    actionHref를 주면 EmptyState 내부가 Button asChild + next/link로 렌더한다. */}
<EmptyState
  icon={<Inbox />}
  title="수집된 데이터가 없습니다"
  description="먼저 크롤링을 실행해 기사를 수집해야 키워드를 분석할 수 있습니다"
  actionLabel="크롤링 실행하러 가기"
  actionHref="/"
/>
```

**⑤ 결과 0건** — ④ 랭킹 표 `CardContent` 내부만 대체:

```tsx
{/* 페이지 이동이 아니라 그 자리에서 처리하는 액션이라 actionHref 대신 onAction을 준다 */}
<EmptyState
  icon={<SearchX />}
  title="조건에 맞는 키워드가 없습니다"
  description="최소 등장 횟수를 낮추거나 품사 필터 범위를 넓혀서 다시 시도해 보세요"
  actionLabel="필터 초기화"
  onAction={() => {}} // TODO: 필터를 기본값으로 되돌리는 로직 구현 필요
/>
```

**⑥ 분석 실패** — 조건 바 위쪽에 삽입:

```tsx
{/* 공통 오류 컴포넌트를 호출한다. Alert 마크업과 TriangleAlert 아이콘은 내부에 있다. */}
<ErrorAlert
  title="분석에 실패했습니다"
  description="형태소 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
  onRetry={() => {}} // TODO: 동일 조건으로 분석 재시도 로직 구현 필요
/>
```
