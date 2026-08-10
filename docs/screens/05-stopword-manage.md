# 05. 불용어 관리 페이지

## 개요

| 항목 | 내용 |
|------|------|
| 역할 | 핫 키워드 집계에서 제외할 불용어(상투어)를 확인하고 추가·삭제하는 페이지 |
| 구현 기능 ID | F008 |
| 진입 경로 | 핫 키워드 분석 페이지의 **[불용어 관리로 이동]** 클릭, 또는 상단 헤더 메뉴 "불용어 관리" 클릭 |
| 다음 이동 | **[분석 페이지로 돌아가 재분석]** 버튼 → [03-hot-keyword.md](./03-hot-keyword.md) |
| 데이터 모델 | `Stopword { id, word, isDefault }` — 저장 위치 `data/stopwords.json` (`docs/PRD.md` 참고) |

이 화면은 Kiwi 형태소 분석으로 조사를 제거해도 "기자", "사진", "제공", "앵커", "무단전재", "재배포금지", "이번"처럼 기사에 반복적으로 등장하는 상투어가 핫 키워드 상위에 남는 문제를 해결한다. 핫 키워드 분석 페이지와 **왕복하는 화면**이므로(불용어 수정 → 재분석 → 결과 확인 → 필요하면 다시 불용어 수정), 돌아가는 동선을 화면 상단에 눈에 띄게 배치한다.

## 설계 결정 요약

PRD와 팀 지시사항이 열어둔 판단 지점을 아래와 같이 결정했다. 각 항목의 상세 근거는 해당 절에서 다시 설명한다.

| 판단 지점 | 결정 | 핵심 근거 |
|----------|------|-----------|
| 기본 프리셋 vs 사용자 추가 구분 방식 | **섹션 분리 + 배지 variant 차이 + 잠금 아이콘**, 3중 표시 | 탭은 두 목록을 동시에 볼 수 없어 "겹치는 단어인지" 확인이 어려움. 색상(배지 variant)만으로는 색약 사용자에게 구분이 전달되지 않아 아이콘을 더함 |
| 기본 프리셋 삭제 가능 여부 | **삭제 가능, 단 확인 다이얼로그 필수** (on/off 토글은 미도입) | `Stopword` 데이터 모델에 `isDefault`만 있고 활성/비활성 필드가 없음. 없는 필드를 화면에서 임의로 만들지 않고, 대신 삭제 시 되돌리기 어렵다는 경고로 실수를 방지 |
| 여러 단어 일괄 추가 | **지원함** (기본은 접힘, 필요할 때만 펼치는 disclosure) | 불용어는 "기자/사진/제공/앵커"처럼 한 번에 여러 개를 등록하는 경우가 많은 운영 성격의 데이터. 다만 상시 노출하면 단일 추가가 주 흐름인 화면이 복잡해 보여 기본은 숨김 |
| 검색/필터 | **포함함** | 불용어가 수십~수백 개로 늘어날 수 있어(운영자가 계속 추가) 목록이 길어지면 원하는 단어를 찾기 어려움 |
| 컨테이너 폭 | **`max-w-3xl`로 축소** (공통 규격 `max-w-6xl` 대신) | 표 없이 칩 목록 + 짧은 폼만 있는 화면이라 `max-w-6xl`을 쓰면 좌우 여백이 과도하게 넓어 시선이 분산됨. README 3번 규칙이 허용한 예외("표가 넓은 화면은 `max-w-7xl` 허용, 문서에 사유 명시")의 반대 방향 예외로 사유를 명시 |
| 브레드크럼 단수 | **`홈 ▸ 불용어 관리`** (`핫 키워드 분석 ▸ 불용어 관리` 아님) | `00-app-shell.md`가 정한 규칙은 "첫 항목이 `홈`(`href="/"`), 마지막이 현재 페이지"다. 이 화면은 헤더 메뉴에서도 바로 들어올 수 있어 핫 키워드 분석이 유일한 상위가 아니다. 실제 `app/stopwords/page.tsx`도 `[{ label: '홈', href: '/' }, { label: '불용어 관리' }]`로 구현돼 있다. 분석 화면으로 돌아가는 동선은 브레드크럼이 아니라 헤더 우측 CTA가 담당한다 |

### 골격은 공통 컴포넌트를 호출한다

`<main>` + 컨테이너 `<div>`, Breadcrumb + `h1` + 설명, 빈 상태, 오류 마크업을 이 화면에서 다시 그리지 않는다. 이미 구현된 파일을 **호출**한다.

| 골격 | 호출할 컴포넌트 | 이 화면에서의 인자 |
|------|----------------|-------------------|
| 본문 컨테이너 | `components/common/page-container.tsx` | **`<PageContainer width="narrow">`** — `narrow`가 곧 `max-w-3xl`이다(`page-container.tsx:13-17`의 `WIDTH_CLASS`). 위에서 결정한 폭 예외는 이 prop 하나로 유지된다. 손으로 쓴 `div.container.max-w-3xl`을 그대로 옮기면 `<main>`이 빠져 `app/layout.tsx`의 `flex min-h-full flex-col` 아래에서 셸이 깨진다 |
| 페이지 헤더 | `components/common/page-header.tsx` | `breadcrumbs={[{ label: '홈', href: '/' }, { label: '불용어 관리' }]}`, `title`, `description`, 그리고 재분석 CTA를 **`action` prop**으로 넘긴다. `href`가 있는 브레드크럼 항목은 컴포넌트가 `BreadcrumbLink asChild` + `next/link`로 렌더한다(raw `href`는 클라이언트 라우팅을 우회한다) |
| 빈 상태 | `components/common/empty-state.tsx` | 사용자 추가 0건·검색 결과 0건 자리. 안내 문구 블록을 손으로 만들지 않는다 |
| 오류 | `components/common/error-alert.tsx` | 목록 조회 실패 시. 중복 입력 경고는 폼 필드에 종속된 검증 메시지라 `Alert variant="destructive"`를 카드 안에 직접 둔다 |

### 컴포넌트 분할 경계

아래 마크업 스켈레톤은 읽기 편하도록 한 블록에 이어 붙였지만, **구현은 한 파일에 몰지 않는다.** `docs/ROADMAP.md` Task 012가 못 박은 파일 목록이 기준이다.

| 스켈레톤 구간 | 가는 파일 |
|---------------|-----------|
| 페이지 골격(`PageContainer` + `PageHeader` + 검색 입력 + 상태 분기) | `app/stopwords/page.tsx` (수정 — `ScreenPlaceholder` 제거) |
| `StopwordChip`(기본 프리셋의 `AlertDialog` 경로 + 사용자 추가의 즉시 삭제 경로) | `components/stopwords/stopword-chip.tsx` (신규) |
| ② 불용어 추가 카드 + ③ 일괄 추가 disclosure + ④ 결과 안내 라이브 리전 | `components/stopwords/stopword-add-card.tsx` (신규) |
| ⑥⑦ 섹션 골격(제목 + 개수 + 칩 목록 + 빈 자리) | `components/stopwords/stopword-section.tsx` (신규 — 기본/사용자 두 섹션 공용) |
| 불용어 조회·추가·삭제 fetch 래퍼 | `lib/api/stopword-client.ts` (신규) |

## 화면 구성

| 영역 | 목적 |
|------|------|
| ① 페이지 헤더 | Breadcrumb, 제목, 설명, **[분석 페이지로 돌아가 재분석]** CTA |
| ② 불용어 추가 카드 | 단일 입력 + [추가] 버튼, 일괄 추가 토글 진입점 |
| ③ 일괄 추가 패널 | 토글로 펼쳐지는 Textarea 기반 다중 입력(쉼표/줄바꿈 구분) |
| ④ 결과 안내 영역 | 추가/삭제 결과 `aria-live` 알림, 중복 입력 경고 |
| ⑤ 불용어 검색 | 목록이 길어질 때 단어로 필터링하는 입력 |
| ⑥ 기본 제공 불용어 섹션 | `isDefault: true` 항목의 칩 목록 |
| ⑦ 사용자 추가 불용어 섹션 | `isDefault: false` 항목의 칩 목록 |
| ⑧ 삭제 확인 다이얼로그 | 기본 프리셋 삭제 시에만 개입하는 확인 단계 |

## 와이어프레임 — 데스크톱 (≥1024px)

이 화면은 목록+상세의 2단 구조가 아니라 폼과 칩 목록으로만 이루어진 **단일 컬럼 화면**이므로, README 4번 표의 `lg:` 2단 레이아웃 규칙은 적용 대상이 아니다. 데스크톱에서는 `<PageContainer width="narrow">`(=`max-w-3xl`) 컨테이너가 뷰포트 중앙에 좁게 자리 잡고 좌우 여백만 넓어진다.

```
┌────────────────────────────────────────────────────────────────┐
│ [헤더 1줄 축약 — 00-app-shell.md 참고]                            │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│        홈 › 불용어 관리                                          │
│                                                                  │
│        불용어 관리                    [ ⟳ 분석 페이지로 돌아가 재분석 ]│
│        핫 키워드 집계에서 제외할 단어를 관리합니다. "기자",         │
│        "사진"처럼 반복 등장하는 상투어를 걸러 랭킹의 신뢰도를        │
│        높입니다.                                                 │
│                                                                  │
│        ┌─ 불용어 추가 ──────────────────────────────────────┐   │
│        │ 새 불용어                                            │   │
│        │ [_______________________]  [ 추가 ]                 │   │
│        │ 이미 등록된 단어는 추가되지 않습니다.                   │   │
│        │                                                      │   │
│        │ ▸ 여러 단어 한 번에 추가                               │   │
│        │ (aria-live 안내 영역 — 평소 비어 있음)                 │   │
│        └──────────────────────────────────────────────────────┘   │
│                                                                  │
│        🔍[ 불용어 검색.......................................]   │
│                                                                  │
│        기본 제공 불용어 (7)                                       │
│        자동으로 제외되는 상투어입니다. 삭제하면 확인 절차를 거칩니다. │
│        ┌──────────────────────────────────────────────────┐   │
│        │ (🔒기자 ✕)(🔒사진 ✕)(🔒제공 ✕)                       │   │
│        │ (🔒앵커 ✕)(🔒무단전재 ✕)(🔒재배포금지 ✕)(🔒이번 ✕)     │   │
│        └──────────────────────────────────────────────────┘   │
│                                                                  │
│        사용자 추가 불용어 (3)                                     │
│        ┌──────────────────────────────────────────────────┐   │
│        │ (AI ✕)(삼성전자 ✕)(오늘 ✕)                           │   │
│        └──────────────────────────────────────────────────┘   │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

## 와이어프레임 — 모바일 (<640px)

```
┌───────────────────────────┐
│ [헤더 축약]                 │
├───────────────────────────┤
│ 홈 › 불용어 관리             │
│                            │
│ 불용어 관리      [[ ⟳ 재분석 ]]│
│ 핫 키워드 집계에서 제외할     │
│ 단어를 관리합니다...         │
│                            │
│ ┌─ 불용어 추가 ───────────┐ │
│ │ 새 불용어                │ │
│ │ [____________________] │ │
│ │ [       추가        ]  │ │
│ │ 이미 등록된 단어는       │ │
│ │ 추가되지 않습니다.       │ │
│ │                        │ │
│ │ ▸ 여러 단어 한 번에 추가  │ │
│ └────────────────────────┘ │
│                            │
│ 🔍[ 불용어 검색..........] │
│                            │
│ 기본 제공 불용어 (7)         │
│ ┌────────────────────────┐│
│ │(🔒기자✕)(🔒사진✕)        ││
│ │(🔒제공✕)(🔒앵커✕)        ││
│ │(🔒무단전재✕)             ││
│ │(🔒재배포금지✕)           ││
│ │(🔒이번✕)                 ││
│ └────────────────────────┘│
│                            │
│ 사용자 추가 불용어 (3)       │
│ ┌────────────────────────┐│
│ │(AI✕)(삼성전자✕)(오늘✕)   ││
│ └────────────────────────┘│
└───────────────────────────┘
```

모바일에서는 재분석 CTA의 **라벨만 "재분석"으로 줄어들고**, 위치는 제목 오른쪽 그대로다. 구현된 `PageHeader`의 `action` 자리는 모든 폭에서 `flex items-start justify-between`의 오른쪽 칸이라(`page-header.tsx:55-65`) 제목 아래로 떨어지는 전체 폭 버튼이 성립하지 않는다. 대신 라벨을 `<span className="hidden sm:inline">분석 페이지로 돌아가 </span>재분석`으로 쪼개 375px에서도 제목과 버튼이 한 줄에 들어가게 한다. 추가 폼의 입력·버튼은 세로로 쌓이고, 칩은 `flex-wrap`이라 폭에 맞춰 자동으로 줄바꿈된다.

## 영역별 컴포넌트 명세

| 영역 | UI 컴포넌트 | Tailwind 클래스(핵심) | 비고 |
|------|------------|----------------------|------|
| ⓪ 본문 컨테이너 | `PageContainer`(`components/common/page-container.tsx`) | (컴포넌트 내부 `<main className="flex-1">` + `container mx-auto px-4 py-6 md:py-8`) | **`width="narrow"`** 로 `max-w-3xl` 예외를 유지한다 |
| ① 페이지 헤더 | `PageHeader`(`components/common/page-header.tsx`) | (컴포넌트 내부 `mb-6`, 제목 줄은 `mt-2 flex items-start justify-between gap-4`) | 재분석 CTA는 `action` prop으로 넘긴다: `<Button asChild className="shrink-0"><Link href="/keywords">…`. `RefreshCw` 아이콘 포함. **`w-full`을 주지 않는다** — `action` 자리가 모든 폭에서 제목 오른쪽 칸이라 전체 폭 버튼이 성립하지 않는다. 모바일은 라벨만 "재분석"으로 줄인다 |
| ② 불용어 추가 카드 | `Card`, `CardHeader`, `CardContent`, `Label`, `Input`, `Button` | `flex flex-col gap-2 sm:flex-row sm:items-end` | 입력은 `flex-1`, 모바일에서 버튼이 아래로 스택 |
| ③ 일괄 추가 패널 | 토글 `button`, `Label`, `Textarea`, `Button`×2 | `space-y-1.5` | 기본 접힘. `aria-expanded`/`aria-controls`로 `Input` 아래 토글 |
| ④ 결과 안내 영역 | `div[role=status]`(sr-only 상시), 필요 시 `Alert` variant `destructive` | `sr-only`(평소) / `mt-2`(경고 노출 시) | 중복 입력 시에만 `Alert`가 카드 안에 나타남 |
| ⑤ 불용어 검색 | `Label`(sr-only), `Input`, `Search` 아이콘 | `relative` + `Input.pl-8`, 아이콘 `absolute left-2.5` | placeholder "불용어 검색" |
| ⑥ 기본 제공 불용어 섹션 | `section`, `h2`, `p`, `ul[role=list]`, `StopwordChip`(`Badge` variant `outline` + `Lock`) | `flex flex-wrap gap-2` | 칩 삭제 버튼이 `AlertDialogTrigger` |
| ⑦ 사용자 추가 불용어 섹션 | `section`, `h2`, `ul[role=list]`, `StopwordChip`(`Badge` variant `secondary`) | `flex flex-wrap gap-2` | 칩 삭제 버튼은 즉시 삭제(확인 없음) |
| ⑥⑦ 섹션의 빈 자리 | `EmptyState`(`components/common/empty-state.tsx`) | (컴포넌트 내부 `Empty` — `p-6`이라 섹션 안에 넣어도 과하지 않다) | 사용자 추가 0건 / 검색 결과 0건 모두 이 컴포넌트를 쓴다. 섹션 제목·개수는 그대로 두고 `ul` 자리만 대체한다 |
| 목록 조회 실패 | `ErrorAlert`(`components/common/error-alert.tsx`) | (컴포넌트 내부 `Alert variant="destructive"` + `TriangleAlert`) | `description`과 `onRetry`만 넘긴다. 중복 입력 경고(④)와는 별개다 |
| ⑧ 삭제 확인 다이얼로그 | `AlertDialog`, `AlertDialogContent/Header/Title/Description/Footer`, `AlertDialogCancel/Action` | 기본 Radix 스타일 | 기본 프리셋 칩에만 연결, 취소가 기본 포커스 |

## 상태별 화면

### ① 기본 (기본 프리셋 + 사용자 추가 불용어 혼재)

위 데스크톱/모바일 와이어프레임이 이 상태다. 기본 제공 불용어 7개와 사용자 추가 불용어 3개가 각자의 섹션에 칩으로 표시된다.

### ② 사용자 추가 불용어 0개 (초기 상태)

```
기본 제공 불용어 (7)
┌──────────────────────────────────────────────────┐
│ (🔒기자 ✕)(🔒사진 ✕)(🔒제공 ✕)(🔒앵커 ✕) ...           │
└──────────────────────────────────────────────────┘

사용자 추가 불용어 (0)
┌──────────────────────────────────────────────────┐
│ 아직 추가한 불용어가 없습니다. 위에서 새 불용어를        │
│ 추가해 보세요.                                       │
└──────────────────────────────────────────────────┘
```

프로젝트를 처음 설치했을 때의 상태. 기본 프리셋만 존재하고 사용자 추가 섹션은 `ul` 자리를 **`EmptyState`로 대체**한다 — 섹션 제목과 개수(0)는 그대로 남겨 레이아웃이 덜컹거리지 않게 한다.

```tsx
<EmptyState
  icon={<Ban />}
  title="아직 추가한 불용어가 없습니다"
  description="위 입력창에서 새 불용어를 추가해 보세요"
/>
```

액션 버튼은 주지 않는다 — 추가 폼이 바로 위에 이미 있어 같은 동작을 두 번 노출할 이유가 없다.

### ③ 여러 단어 일괄 추가 UI (채택)

```
▾ 여러 단어 한 번에 추가
┌──────────────────────────────────────────────────┐
│ 여러 단어 입력                                       │
│ ┌──────────────────────────────────────────────┐ │
│ │ 앵커, 특파원                                     │ │
│ │ 인턴기자                                         │ │
│ │                                                │ │
│ └──────────────────────────────────────────────┘ │
│ 쉼표(,) 또는 줄바꿈으로 구분해 입력하세요.               │
│                                    [ 취소 ] [[ 일괄 추가 ]]│
└──────────────────────────────────────────────────┘
```

토글(`▸`/`▾`, `aria-expanded`)을 누르면 단일 입력 아래에 `Textarea`가 펼쳐진다. 쉼표와 줄바꿈을 모두 구분자로 안내하는 도움말을 `Textarea` 아래 고정 배치한다. 접힘 상태가 기본값인 이유는 "설계 결정 요약" 표 참고.

### ④ 중복 단어 입력 시 안내

```
새 불용어
[ 기자___________________]  [ 추가 ]
┌──────────────────────────────────────────────────┐
│ ⚠ '기자'는 이미 등록된 불용어입니다.                    │
└──────────────────────────────────────────────────┘
```

`Alert` 컴포넌트(`variant="destructive"`)가 입력 영역 바로 아래, 도움말 문구 자리에 나타난다. 스크린 리더 사용자에게는 같은 문구가 `aria-live="polite"` 영역을 통해서도 전달된다(시각적으로는 `Alert` 하나만 보이면 충분하므로 라이브 리전 자체는 `sr-only` 유지).

### ⑤ 삭제 확인

```
        ┌─ 기본 제공 불용어를 삭제할까요? ──────────────┐
        │ ⚠ '기자'는 기본으로 제공되는 불용어입니다.        │
        │   삭제하면 다음 분석부터 랭킹에 다시 나타날 수     │
        │   있습니다. 되돌리려면 같은 단어를 직접 다시       │
        │   추가해야 합니다.                              │
        │                                                │
        │                        [ 취소 ] [[ 삭제 ]]      │
        └────────────────────────────────────────────────┘
```

**기본 프리셋 칩**을 삭제할 때만 `AlertDialog`가 뜬다. **사용자 추가 칩**은 언제든 다시 입력하면 되는 가벼운 데이터라 확인 없이 즉시 삭제한다(대신 결과는 ④ 라이브 리전으로 안내). 이 비대칭은 "설계 결정 요약"의 기본 프리셋 삭제 근거와 동일하다 — 데이터 모델에 `isDefault`만 있고 복구용 활성화 필드가 없으므로, 삭제라는 되돌리기 어려운 행동 앞에서만 한 번 더 확인시킨다.

### ⑥ 검색 결과 없음

```
🔍[ 딥러닝___________________________________]

기본 제공 불용어 (7)
┌──────────────────────────────────────────────────┐
│ 🔍 '딥러닝'과 일치하는 기본 제공 불용어가 없습니다.       │
└──────────────────────────────────────────────────┘

사용자 추가 불용어 (3)
┌──────────────────────────────────────────────────┐
│ 🔍 '딥러닝'과 일치하는 사용자 추가 불용어가 없습니다.     │
└──────────────────────────────────────────────────┘
```

검색은 두 섹션에 동시에 적용된다. 섹션 구조(제목 + 개수)는 유지하고, 칩이 있어야 할 자리에만 `EmptyState`(`icon={<SearchX />}`)를 넣는 방식을 택했다 — 검색 결과가 없다고 전체 레이아웃을 다른 화면으로 바꾸면 사용자가 "검색을 취소하면 원래대로 돌아온다"는 확신을 갖기 어렵기 때문이다.

```tsx
<EmptyState
  icon={<SearchX />}
  title={`'${query}'과 일치하는 ${sectionLabel}이 없습니다`}
  description="검색어를 지우면 전체 목록으로 돌아갑니다"
/>
```

### ⑦ 로딩(Skeleton)

```
불용어 추가
┌──────────────────────────────────────────────────┐
│ ▒▒▒▒▒▒▒▒▒▒▒▒                                        │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  ▒▒▒▒▒▒               │
└──────────────────────────────────────────────────┘

기본 제공 불용어
┌──────────────────────────────────────────────────┐
│ ▒▒▒▒▒  ▒▒▒▒▒  ▒▒▒▒▒  ▒▒▒▒▒  ▒▒▒▒▒▒▒  ▒▒▒▒▒▒▒▒       │
└──────────────────────────────────────────────────┘

사용자 추가 불용어
┌──────────────────────────────────────────────────┐
│ ▒▒▒▒▒  ▒▒▒▒▒▒▒▒  ▒▒▒▒                               │
└──────────────────────────────────────────────────┘
```

`Skeleton`(`h-5 w-16 rounded-full`)을 칩 개수만큼 반복해 실제 칩과 비슷한 폭으로 배치하고, 카드 헤더·검색 입력 자리에도 각각 막대형 `Skeleton`을 둔다. 최초 목록 조회 중에만 노출되고, 추가/삭제 같은 부분 갱신에는 개별 칩에 로딩 상태를 주지 않는다(전체 재조회가 아니므로).

## 사용 컴포넌트

**설치 완료 — 추가 설치 없이 사용** (`docs/screens/README.md` §화면별 사용 shadcn 컴포넌트가 설치 상태의 단일 소스)
`alert` `alert-dialog` `badge` `breadcrumb` `button` `card` `input` `label` `skeleton` `sonner`(전역 토스트, `00-app-shell.md`에서 이미 마운트됨) `textarea`

이 화면이 새로 쓰는 3종의 용도는 아래와 같다.

| 컴포넌트 | 용도 |
|---------|------|
| `label` | 입력 필드 레이블 연결(`htmlFor`), 검색 입력의 sr-only 레이블 |
| `textarea` | 일괄 추가 패널의 다중 단어 입력 |
| `alert-dialog` | 기본 프리셋 삭제 확인 |
| `empty` | `EmptyState`가 내부에서 쓴다. 00 셸 설치 목록에 이미 있어 이 화면에서 따로 설치하지 않는다 |

> (19일차: 크롤 파이프라인이 설계서 전수 검토 중 발견해, 화면이 I-010과 같은 방식으로 처리했다. `label`·`textarea`·`alert-dialog` 모두 `components/ui/`에 실물이 있고 `docs/screens/README.md`가 이미 이 셋을 05의 설치 완료 목록에 넣어 두어 "추가 설치 필요" 절과 설치 명령이 중복·오류였다. 절을 지우지 않고 "설치 완료" 목록에 합쳤다.)

**lucide 아이콘**
`X`(칩 삭제) · `Search`(검색 입력) · `SearchX`(검색 결과 없음 `EmptyState` 아이콘) · `Ban`(사용자 추가 0건 `EmptyState` 아이콘) · `ListPlus`(일괄 추가 토글) · `Lock`(기본 프리셋 표시) · `RefreshCw`(재분석 CTA) · `TriangleAlert`(삭제 확인 다이얼로그 제목) · `CircleAlert`(중복 입력 Alert)

`TriangleAlert`는 `ErrorAlert` 내부에도 들어 있으므로, 목록 조회 실패 표시를 위해 이 화면에서 따로 import하지 않는다. 구 별칭(`AlertTriangle` `Loader2` `XCircle` `CheckCircle2`)은 쓰지 않는다(`docs/CONVENTIONS.md` §8).

## 접근성

- 단일 추가 입력은 `<Label htmlFor="stopword-input">` + `<Input id="stopword-input" aria-describedby="stopword-input-help">`로 연결하고, 도움말/오류 문구를 `id="stopword-input-help"`에 둔다.
- 검색 입력은 시각적으로는 아이콘만으로 의미가 전달되지만 `<Label htmlFor="stopword-search" className="sr-only">불용어 검색</Label>`을 반드시 연결한다.
- 칩의 삭제 버튼은 `aria-label={\`'${word}' 불용어 삭제\`}` 형태로 대상이 드러나야 한다(예: `aria-label="'기자' 불용어 삭제"`).
- 불용어 목록은 `<ul role="list">`(리스트 스타일 초기화로 인한 VoiceOver 시맨틱 손실 방지) 안에 `<li>`로 각 칩을 담는다.
- 추가/삭제 결과는 `role="status" aria-live="polite"` 영역에 문구를 넣어 안내한다(스크린 리더 사용자는 시각적 `Alert`나 토스트만으로는 변경을 놓칠 수 있음).
- 일괄 추가 토글 버튼은 `aria-expanded`(펼침 여부)와 `aria-controls="bulk-add-panel"`을 함께 사용해 펼쳐지는 대상을 명시한다.
- `AlertDialog`는 Radix 기본 동작을 그대로 사용: 열리면 포커스가 `AlertDialogCancel`로 이동(파괴적 동작을 기본값으로 두지 않음), `Esc`로 닫힘, 닫히면 포커스가 트리거(삭제 버튼)로 복귀한다.
- 기본 프리셋 칩의 `Lock` 아이콘은 `aria-hidden="true"`이며, 구분 정보는 색상(배지 variant)이 아니라 섹션 제목("기본 제공 불용어")과 삭제 확인 다이얼로그의 문구로 텍스트로도 전달된다(색만으로 정보를 전달하지 않음, WCAG 1.4.1).

## 마크업 스켈레톤

읽기 편하도록 한 블록에 이어 붙였을 뿐, **구현은 위 "컴포넌트 분할 경계" 표대로 파일을 나눈다.**

```tsx
'use client'

import Link from 'next/link'
import { Lock, RefreshCw, Search, X } from 'lucide-react'

import { EmptyState } from '@/components/common/empty-state' // 빈 자리(사용자 0건·검색 0건)
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

// 불용어 더미 데이터 - 실제로는 GET /api/stopwords 등에서 조회한다
// id는 'sw-' + 4자리 제로패딩 순번이다(docs/CONVENTIONS.md §식별자 규칙). nanoid·uuid를 쓰지 않는다.
const MOCK_DEFAULT_STOPWORDS = [
  { id: 'sw-0001', word: '기자' },
  { id: 'sw-0002', word: '사진' },
  { id: 'sw-0003', word: '제공' },
  { id: 'sw-0004', word: '앵커' },
  { id: 'sw-0005', word: '무단전재' },
  { id: 'sw-0006', word: '재배포금지' },
  // '이번'은 PRD 명시분이 아니라 docs/kiwi-verification.md §6 실측으로 추가된 7번째 프리셋이다.
  { id: 'sw-0007', word: '이번' },
]

const MOCK_CUSTOM_STOPWORDS = [
  { id: 'sw-0008', word: 'AI' },
  { id: 'sw-0009', word: '삼성전자' },
  { id: 'sw-0010', word: '오늘' },
]

interface StopwordChipProps {
  /** 불용어 단어 */
  word: string
  /** 기본 제공 프리셋 여부 - true면 삭제 전에 확인 다이얼로그를 거친다 */
  isDefault?: boolean
}

// 불용어 하나를 나타내는 칩(Badge + 삭제 버튼)
function StopwordChip({ word, isDefault = false }: StopwordChipProps) {
  if (isDefault) {
    return (
      <li>
        <AlertDialog>
          <Badge variant="outline" className="gap-1 pr-1">
            <Lock className="size-3 text-muted-foreground" aria-hidden="true" />
            {word}
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label={`'${word}' 불용어 삭제`}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </AlertDialogTrigger>
          </Badge>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>기본 제공 불용어를 삭제할까요?</AlertDialogTitle>
              <AlertDialogDescription>
                {`'${word}'는 기본으로 제공되는 불용어입니다. 삭제하면 다음 분석부터 랭킹에 다시 나타날 수 있습니다. 되돌리려면 같은 단어를 직접 다시 추가해야 합니다.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {}} // TODO: 기본 프리셋 불용어 삭제 로직 구현 필요
                className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </li>
    )
  }

  return (
    <li>
      <Badge variant="secondary" className="gap-1 pr-1">
        {word}
        <button
          type="button"
          onClick={() => {}} // TODO: 사용자 추가 불용어 즉시 삭제 로직 구현 필요
          aria-label={`'${word}' 불용어 삭제`}
          className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      </Badge>
    </li>
  )
}

export default function StopwordManagePage() {
  return (
    // width="narrow"가 이 화면의 max-w-3xl 예외다(설계 결정 요약 참고).
    // <main>·컨테이너·Breadcrumb·h1을 손으로 다시 그리지 않는다.
    <PageContainer width="narrow">
      <PageHeader
        breadcrumbs={[{ label: '홈', href: '/' }, { label: '불용어 관리' }]}
        title="불용어 관리"
        description='핫 키워드 집계에서 제외할 단어를 관리합니다. "기자", "사진"처럼 기사에 반복적으로 등장하는 상투어를 걸러 랭킹의 신뢰도를 높입니다.'
        action={
          <Button asChild className="shrink-0">
            <Link href="/keywords">
              <RefreshCw className="size-4" aria-hidden="true" />
              {/* 375px에서 제목과 한 줄에 들어가도록 모바일에서는 라벨을 줄인다 */}
              <span className="hidden sm:inline">분석 페이지로 돌아가&nbsp;</span>재분석
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        {/* 불용어 추가 */}
        <Card>
          <CardHeader>
            <CardTitle>불용어 추가</CardTitle>
            <CardDescription>단어를 입력하고 추가 버튼을 누르세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="stopword-input">새 불용어</Label>
                <Input
                  id="stopword-input"
                  placeholder="예: 앵커"
                  aria-describedby="stopword-input-help"
                />
              </div>
              <Button type="button" onClick={() => {}}>
                {/* TODO: 단일 불용어 추가 로직 구현 필요 */}
                추가
              </Button>
            </div>
            <p id="stopword-input-help" className="text-xs text-muted-foreground">
              이미 등록된 단어는 추가되지 않습니다.
            </p>

            {/* 중복 입력 안내 자리 - 평소에는 숨김, 노출 시 Alert(variant="destructive") + CircleAlert 아이콘 사용. 상태별 화면 ④ 참고 */}
            {/* <Alert variant="destructive">
              <CircleAlert className="size-4" aria-hidden="true" />
              <AlertTitle>'기자'는 이미 등록된 불용어입니다.</AlertTitle>
            </Alert> */}

            {/* 일괄 추가 토글 - 기본은 접힘 상태, 펼침 UI는 상태별 화면 ③ 참고 */}
            <button
              type="button"
              onClick={() => {}} // TODO: 일괄 추가 패널 펼침/접힘 토글 구현 필요
              aria-expanded="false"
              aria-controls="bulk-add-panel"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              여러 단어 한 번에 추가
            </button>

            {/* 추가/삭제 결과 라이브 리전 - 로직 없이 자리만 확보 */}
            <div role="status" aria-live="polite" className="sr-only">
              {/* TODO: "'앵커' 불용어가 추가되었습니다" 등 결과 메시지 삽입 필요 */}
            </div>
          </CardContent>
        </Card>

        {/* 불용어 검색 */}
        <div className="space-y-1.5">
          <Label htmlFor="stopword-search" className="sr-only">
            불용어 검색
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="stopword-search"
              placeholder="불용어 검색"
              className="pl-8"
              onChange={() => {}} // TODO: 검색어 필터링 로직 구현 필요
            />
          </div>
        </div>

        {/* 기본 제공 불용어 */}
        <section aria-labelledby="default-stopword-heading" className="space-y-3">
          <div>
            <h2 id="default-stopword-heading" className="text-sm font-medium">
              기본 제공 불용어 ({MOCK_DEFAULT_STOPWORDS.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              자동으로 제외되는 상투어입니다. 삭제하면 확인 절차를 거칩니다.
            </p>
          </div>
          <ul role="list" className="flex flex-wrap gap-2">
            {MOCK_DEFAULT_STOPWORDS.map((stopword) => (
              <StopwordChip key={stopword.id} word={stopword.word} isDefault />
            ))}
          </ul>
        </section>

        {/* 사용자 추가 불용어 */}
        <section aria-labelledby="custom-stopword-heading" className="space-y-3">
          <h2 id="custom-stopword-heading" className="text-sm font-medium">
            사용자 추가 불용어 ({MOCK_CUSTOM_STOPWORDS.length})
          </h2>
          <ul role="list" className="flex flex-wrap gap-2">
            {MOCK_CUSTOM_STOPWORDS.map((stopword) => (
              <StopwordChip key={stopword.id} word={stopword.word} />
            ))}
          </ul>
        </section>
      </div>
    </PageContainer>
  )
}
```
