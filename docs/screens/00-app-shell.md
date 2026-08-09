# 00. 공통 앱 셸

## 개요

- **역할**: 5개 페이지(크롤링 실행 / 수집 결과 / 핫 키워드 분석 / 언론사 관리 / 불용어 관리)가 모두 공유하는 껍데기. 상단 헤더·내비게이션·본문 컨테이너·토스트·전역 상태(로딩/빈 상태/에러) 블록을 정의합니다.
- **구현 기능 ID**: 없음 — PRD 기능(F001~F008)과 직접 대응되지 않는 공통 레이아웃입니다.
- **진입 경로**: 없음(개별 진입 페이지가 아님) — `app/layout.tsx`의 Root Layout으로 모든 페이지 최상단에 항상 렌더링됩니다.
- **다음 이동**: 헤더의 5개 메뉴로 어느 페이지에서든 나머지 4개 페이지로 즉시 이동 가능합니다(`docs/screens/README.md`의 화면 전환 흐름 중 점선 경로).
- 이 문서에서 정한 규격(헤더 높이·컨테이너 클래스·페이지 헤더 규격·브레드크럼 단계·로딩/빈 상태/에러 블록)은 `01~05` 화면 문서가 그대로 재사용하며, 개별 문서는 이를 재정의하지 않습니다.
- **셸은 Task 002에서 이미 구현이 끝났습니다.** 아래 마크업은 제안이 아니라 `components/layout/`·`components/common/`에 실재하는 코드와 대조해 맞춘 것입니다. 화면 Task는 이 조각들을 **호출**하고, 어긋난 곳을 발견하면 코드가 아니라 이 문서를 고칩니다(구현이 기준).

---

## 브레드크럼 규격 (확정)

**규칙: 홈(`/`)은 1단(`크롤링 실행`, 링크 없음), 나머지 4개 화면은 «홈 ▸ 현재 화면» 2단 고정.**

- 이 앱은 계층이 1단계뿐이고 5개 메뉴가 모두 헤더에서 상호 이동 가능하므로, **화면 사이에 부모-자식 관계를 만들지 않습니다.**
  «핫 키워드 분석 ▸ 불용어 관리»처럼 다른 화면을 부모로 세우는 표기는 쓰지 않습니다 — 불용어 관리는 핫 키워드 분석의 하위 화면이 아니고, 헤더에서 직접 들어올 수 있습니다.
- 홈에 «홈 ▸ 크롤링 실행»을 쓰지 않는 이유: 첫 항목의 링크가 지금 보고 있는 페이지 자신이라 아무 정보도 주지 않습니다.
- `<PageHeader>`에서 `href`가 없는 마지막 항목은 자동으로 `BreadcrumbPage`(`aria-current="page"`)로 렌더됩니다.

| 화면 | `breadcrumbs` 값 | 표시 |
|------|------------------|------|
| 크롤링 실행 (홈) | `[{ label: '크롤링 실행' }]` | 크롤링 실행 |
| 수집 결과 | `[{ label: '홈', href: '/' }, { label: '수집 결과' }]` | 홈 ▸ 수집 결과 |
| 핫 키워드 분석 | `[{ label: '홈', href: '/' }, { label: '핫 키워드 분석' }]` | 홈 ▸ 핫 키워드 분석 |
| 언론사 관리 | `[{ label: '홈', href: '/' }, { label: '언론사 관리' }]` | 홈 ▸ 언론사 관리 |
| 불용어 관리 | `[{ label: '홈', href: '/' }, { label: '불용어 관리' }]` | 홈 ▸ 불용어 관리 |

현재 5개 `app/**/page.tsx`가 이미 이 값으로 구현돼 있습니다.

---

## 화면 구성

| 영역 | 이름 | 목적 |
|------|------|------|
| ① | 상단 헤더 | 서비스 로고(홈 이동), 5개 메뉴 내비게이션, 다크모드 토글. `sticky`로 항상 화면 상단에 고정 |
| ② | 본문 컨테이너 | 각 페이지의 실제 내용이 들어가는 자리. `<PageContainer>` + `<PageHeader>`(Breadcrumb + h1 + 설명)로 구현돼 있고 화면 문서는 이를 **호출**함 |
| ③ | 토스트 | 크롤링 완료/실패 등 비동기 알림을 화면 우하단에 표시 |
| ④ | 푸터 | **두지 않음** — 아래 "④ 푸터" 절 참고 |
| ⑤ | 전역 상태 화면 | 로딩(Skeleton) / 빈 상태(`<EmptyState>`) / 에러(`<ErrorAlert>`)의 공통 패턴. `01~05` 문서는 이 절만 참조하고 반복 정의하지 않음 |

### ① 상단 헤더 — 내비게이션 구현 방식 결정

**결정: `navigation-menu`(설치됨)를 사용합니다. 단순 `<Link>` 목록은 채택하지 않습니다.**

근거:
1. **이미 설치되어 있어 추가 의존성이 없음** — `components/ui/navigation-menu.tsx`가 이미 존재하고 `radix-ui`(설치됨)에 의존.
2. **접근성 있는 메뉴바 시맨틱을 공짜로 얻음** — `NavigationMenuPrimitive.Root`는 `<nav>`로 렌더링되고, 항목 간 좌우 방향키 이동(roving tabindex)이 Radix 내부에서 기본 지원됩니다. 평문 `<Link>` 목록은 이를 직접 구현해야 합니다.
3. **활성 상태 처리가 표준화되어 있음** — `NavigationMenuLink`는 `active` prop을 받아 `data-active` 속성과 `aria-current="page"`를 자동으로 설정합니다(`components/ui/navigation-menu.tsx:120-134`의 `data-active:*` 클래스가 이미 정의되어 있음).
4. **Trigger/Content(드롭다운)는 쓰지 않음** — 5개 메뉴 모두 하위 메뉴가 없는 평면 링크이므로 `NavigationMenuItem` + `NavigationMenuLink`만 사용하고 `NavigationMenuTrigger`/`NavigationMenuContent`/`NavigationMenuViewport`는 렌더링하지 않습니다(`viewport` 자리를 차지하지 않도록 `<NavigationMenu viewport={false}>`로 사용).

활성/비활성 스타일 정의:

| 상태 | 클래스 | 비고 |
|------|--------|------|
| 비활성 | `text-muted-foreground` | `navigationMenuTriggerStyle()`가 기본 제공하는 `hover:bg-muted` 등과 함께 사용 |
| 활성(현재 페이지) | `text-foreground font-semibold` + `active` prop | `active` prop이 `data-active`를 세팅해 `bg-muted/50` 배경이 자동으로 얹힘. 실제 구현에서는 `usePathname()`으로 판정(이 문서는 정적 마크업이므로 TODO 주석 처리) |

### ① 상단 헤더 — 모바일 펼침 UI 결정

shadcn MCP로 `sheet` / `drawer` / `dropdown-menu` 세 후보를 비교했습니다.

| 후보 | 의존성 | 적합성 |
|------|--------|--------|
| **`sheet`** (채택) | `radix-ui`(설치됨, 추가 의존성 없음) | Dialog 기반 슬라이드 패널. 5개 메뉴를 세로로 나열하기에 충분한 폭과 포커스 트랩·ESC 닫힘·오버레이를 기본 제공 |
| `drawer` | `vaul`(신규 의존성 필요) | 모바일 네이티브 스와이프 제스처가 강점이지만 이 프로젝트엔 과함 — 단순 메뉴 목록엔 불필요한 의존성 추가 |
| `dropdown-menu` | `radix-ui`(설치됨) | 트리거 바로 아래에 앵커링되는 좁은 팝업이라 5개 메뉴 세로 목록엔 시각적으로 좁고, 원래 용도(액션 메뉴)와 다름 |

**결정: `sheet`, `side="left"`.** 설치는 Task 002에서 끝났습니다(`components/ui/sheet.tsx`).

브레이크포인트: `docs/screens/README.md` 공통 반응형 규칙(§4)의 `md:`(≥768px) "헤더 메뉴 펼침" 기준을 그대로 따릅니다. 즉 데스크톱 내비는 `hidden md:flex`, 햄버거+Sheet는 `md:hidden`으로 **640~767px(sm 구간) 포함 768px 미만 전부 햄버거 상태**입니다. (팀 지시의 "모바일(<640px)" 표현은 이 공통 규칙과 합쳐 해석했습니다 — 640px 정확히 그 값만 분기점으로 삼으면 sm 구간에서 5개 메뉴가 헤더에 다 안 들어가 줄바꿈이 생기므로, README의 md 기준이 실제로 안전합니다.)

### ④ 푸터

**두지 않음.**

사유:
- 로그인/약관/저작권 등 푸터에 통상 들어가는 정보가 이 도구(로컬 단일 사용자 테스트 도구)에는 없음(PRD "MVP 이후 기능"에서 계정 기능 명시적 제외).
- 5개 메뉴가 이미 헤더에서 전부 접근 가능해 푸터 내비게이션은 중복.
- `<main className="flex-1">`이 남는 세로 공간을 차지하므로 짧은 페이지에서도 헤더가 하단에 붙는 문제(sticky 헤더와 무관하게 레이아웃이 밀리는 문제)가 없음.
- 추후 버전 정보 등이 필요해지면 `<footer>` 한 줄만 추가하면 되므로 지금 미리 만들지 않습니다.

---

## 와이어프레임 — 데스크톱 (≥1024px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ header  h-14 sticky top-0 z-50 border-b bg-background/95 backdrop-blur     │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ [🐛] IT/AI 뉴스 핫 키워드 크롤러   🕷 크롤링 실행 📄 수집 결과 🔥 핫 키워드 분석  │ │
│ │                                   📰 언론사 관리 🚫 불용어 관리      [☀/🌙] │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────┤
│ main.flex-1                                                                │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ div.container.mx-auto.max-w-6xl.px-4.py-6 md:py-8                    │  │
│  │                                                                        │  │
│  │  크롤링 실행                                 ← Breadcrumb (홈은 1단)   │  │
│  │  크롤링 실행                                 ← h1 (text-2xl md:text-3xl) │  │
│  │  언론사를 선택하고 크롤링을 시작하세요          ← 설명 (text-sm muted)   │  │
│  │  ─────────────────────────────── mb-6 ───                             │  │
│  │                                                                        │  │
│  │  (페이지 본문 영역, space-y-6 — 01~05 문서에서 정의)                    │  │
│  │  …                                                                      │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
                                                          ┌──────────────────┐
                                                          │ ✅ 크롤링이 완료됐어요│ ← Toaster
                                                          └──────────────────┘   (우하단 고정)
```

주석:

- `🕷 🕷📄🔥📰🚫`는 각 메뉴의 lucide 아이콘 자리입니다(실제 아이콘 매핑은 "사용 컴포넌트" 절 참고).
- 데스크톱 내비(`hidden md:flex`)와 햄버거(`md:hidden`)의 전환점은 **768px**입니다. 로고 텍스트는 그와 별개로 **1024px(`lg`)** 에서 전문("IT/AI 뉴스 핫 키워드 크롤러")과 축약형("핫키워드 크롤러")이 교체됩니다 — 768~1023px 구간은 메뉴 5개가 이미 펼쳐진 상태라 전문 로고까지 얹으면 헤더가 넘칩니다(`components/layout/site-header.tsx`).
- `main.flex-1`과 그 아래 컨테이너 `<div>`는 **`<PageContainer>`가 함께 렌더링합니다.** 화면 문서가 이 두 요소를 직접 그리지 않습니다.

---

## 와이어프레임 — 모바일 (<640px)

### 닫힘 상태

```
┌───────────────────────────────────────┐
│ header h-14 sticky top-0 border-b       │
│ [☰] [🐛] 핫키워드 크롤러          [☀/🌙] │
├───────────────────────────────────────┤
│ main.flex-1                             │
│  div.container.mx-auto.px-4.py-6        │
│                                          │
│   크롤링 실행            ← Breadcrumb    │
│   크롤링 실행               ← h1 (text-2xl)│
│   언론사를 선택하고…         ← 설명        │
│   ─────────── mb-6 ───                   │
│   (본문, 1컬럼)                          │
│                                          │
└───────────────────────────────────────┘
                        ┌────────────────┐
                        │ ✅ 완료됐어요    │ ← Toaster
                        └────────────────┘
```

### 열린 상태 (Sheet, `side="left"`)

```
┌─────────────────────┬─────────────────────┐
│ SheetContent (w-72)   │ overlay (반투명 검정,  │
│ ┌───────────────────┐ │ 클릭 시 닫힘)          │
│ │ 메뉴          [x]  │ │                       │
│ ├───────────────────┤ │                       │
│ │ 🕷 크롤링 실행 (활성)│ │  (배경 콘텐츠는        │
│ │ 📄 수집 결과        │ │   흐리게/어둡게 처리됨) │
│ │ 🔥 핫 키워드 분석    │ │                       │
│ │ 📰 언론사 관리       │ │                       │
│ │ 🚫 불용어 관리       │ │                       │
│ └───────────────────┘ │                       │
└─────────────────────┴─────────────────────┘
```

- 메뉴 항목은 `SheetClose asChild`로 감싸 링크 이동과 동시에 패널이 닫힙니다. 여기에 더해 `Sheet`의 열림 상태를 `useState`로 직접 들고 `open`/`onOpenChange`로 제어합니다 — `SheetClose asChild` + `Link` 조합에서 Radix가 `Link`의 `onClick`을 삼켜 패널이 열린 채 남는 경우가 있기 때문입니다(`components/layout/mobile-nav.tsx`).
- `[x]` 닫기 버튼은 `SheetContent`가 기본 내장(설치 시 자동 포함) — 별도로 만들 필요 없음. 다만 닫기 버튼이 `absolute top-3 right-3`에 떠 있고 `SheetTitle`을 `sr-only`로 숨겼으므로, 메뉴 목록에 `pt-12`로 위 여백을 직접 확보해 첫 항목과 겹치지 않게 합니다.
- 다크모드 토글은 Sheet 내부에 중복 배치하지 않고 헤더에만 유지합니다(열림/닫힘 상태와 무관하게 항상 접근 가능).

---

## 영역별 컴포넌트 명세

| 영역 | UI 컴포넌트 | Tailwind 클래스 | 비고 |
|------|------------|-----------------|------|
| ① 헤더 컨테이너 | `<header>` | `sticky top-0 z-50 h-14 w-full border-b bg-background/95 backdrop-blur` | 셸 최상단, `app/layout.tsx`의 `<body>` 첫 자식 |
| ① 헤더 내부 래퍼 | `<div>` | `container mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4` | 좌(로고+데스크톱 내비) / 우(다크토글) |
| ① 로고 | `Link`(next/link) + lucide `Bug` | `flex shrink-0 items-center gap-2 text-sm font-semibold sm:text-base` | `href="/"` — 클릭 시 홈(크롤링 실행)으로 이동. 라벨은 **`lg`(≥1024px)** 에서 전문/축약형 교체(`hidden lg:inline` / `lg:hidden`) — 768~1023px는 내비가 이미 펼쳐져 있어 전문 로고까지 넣으면 헤더가 넘친다 |
| ① 데스크톱 내비 | `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuLink` | `hidden md:flex` | Trigger/Content 미사용(평면 링크 5개), `viewport={false}` |
| ① 모바일 햄버거 트리거 | `Button variant="ghost" size="icon"` + `SheetTrigger asChild` + lucide `Menu` | `md:hidden` | `aria-label="메뉴 열기"` |
| ① 모바일 Sheet 패널 | `Sheet`, `SheetContent side="left"`, `SheetHeader`, `SheetTitle`, `SheetClose` | `w-72 sm:max-w-sm` | 링크는 `SheetClose asChild`로 감싸 선택 시 자동 닫힘 |
| ① 다크모드 토글 | `Button variant="ghost" size="icon"` + lucide `Sun`/`Moon` | `relative` (아이콘 두 개를 CSS로 교차 표시) | `aria-label="다크 모드 전환"`, 데스크톱/모바일 공통 위치(항상 우측 끝) |
| ② 본문 래퍼 + 컨테이너 | **`<PageContainer>`** (`<main>` + `<div>`를 함께 렌더) | `flex-1` / `container mx-auto max-w-6xl px-4 py-6 md:py-8` | `<body className="flex min-h-full flex-col">`의 자식. **화면 문서는 이 두 요소를 직접 그리지 않고 컴포넌트를 호출한다.** 폭은 `width` prop(`default`/`wide`=`max-w-7xl`/`narrow`=`max-w-3xl`) |
| ② 페이지 헤더 블록 | **`<PageHeader>`** (`Breadcrumb` + `h1` + `p` + 액션) | `mb-6` | 브레드크럼 링크는 컴포넌트 안에서 `BreadcrumbLink asChild` + `Link`로 감싸져 있다(아래 props 참고) |
| ③ 토스트 | `Toaster`(sonner) | — | `app/layout.tsx`의 `<body>` 최하단에 1회만 배치 |
| ⑤ 로딩 | `Skeleton` | `animate-pulse rounded-md bg-muted` | 페이지마다 배치만 다르게 조합(아래 "상태별 화면" 참고) |
| ⑤ 빈 상태 | **`<EmptyState>`** (내부에서 `Empty` 계열 프리미티브 조합) | — | `empty` 설치 완료. 화면마다 다른 빈 상태 구조를 만들지 않는다 |
| ⑤ 에러 | **`<ErrorAlert>`** (`Alert variant="destructive"` 래퍼) | — | `Alert`에 `role="alert"`가 이미 내장됨(`components/ui/alert.tsx:30`) |
| ⑤ 미구현 자리표시자 | `<ScreenPlaceholder>` | — | 라우트 껍데기용 임시 블록. 화면 Task가 본문을 구현하면서 제거하고, **컴포넌트 자체는 Task 023에서 삭제**한다 |

### `PageContainer` 컴포넌트 props (5개 페이지 공용)

```ts
// components/common/page-container.tsx
export interface PageContainerProps {
  children: React.ReactNode
  /**
   * 기본은 max-w-6xl. 표가 넓은 화면은 'wide',
   * 폼·칩 목록만 있어 여백이 과한 화면(불용어 관리)은 'narrow'를 쓴다.
   */
  width?: 'default' | 'wide' | 'narrow'
  className?: string
}
```

`'default'` = `max-w-6xl` · `'wide'` = `max-w-7xl` · `'narrow'` = `max-w-3xl`. 폭을 바꿀 때 `className`에 `max-w-*`를 덧붙이지 않고 `width`를 씁니다(두 값이 충돌하면 어느 쪽이 이기는지 읽는 사람이 알 수 없습니다).

### `PageHeader` 컴포넌트 props (5개 페이지 공용)

```ts
// components/common/page-header.tsx
export interface PageHeaderCrumb {
  label: string
  /** 없으면 현재 페이지로 간주해 BreadcrumbPage로 렌더링 */
  href?: string
}

export interface PageHeaderProps {
  breadcrumbs: PageHeaderCrumb[]
  title: string
  description?: string
  /** 우측 정렬 액션 버튼 자리(예: 언론사 관리의 [+ 언론사 추가]) */
  action?: React.ReactNode
}
```

---

## 상태별 화면 — 기본 / 로딩 / 빈 상태 / 에러

### 기본

위 "와이어프레임 — 데스크톱 / 모바일" 절 그대로입니다. 헤더·내비·컨테이너·페이지 헤더 블록이 정상적으로 채워진 상태이며, 개별 페이지 문서(`01~05`)가 본문 영역만 그립니다.

### 로딩 — Skeleton 사용 패턴

전용 래퍼 컴포넌트로 감싸지 않고, 필요한 곳에서 `Skeleton` 조합을 그대로 사용합니다(리스트/카드/표마다 구조가 달라 공통화 이득이 적음). 아래 3가지 패턴을 `01~05` 문서가 그대로 재사용합니다.

**리스트형 로딩** (예: 수집 결과의 실행(run) 목록)

```
▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
```

```tsx
<div role="status" aria-live="polite" className="space-y-3">
  <span className="sr-only">불러오는 중</span>
  {Array.from({ length: 4 }).map((_, i) => (
    <div key={i} className="space-y-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  ))}
</div>
```

**카드형 로딩** (예: 언론사 관리 카드 그리드 — 모바일)

```tsx
<div role="status" aria-live="polite" className="grid gap-4 sm:grid-cols-2">
  <span className="sr-only">불러오는 중</span>
  {Array.from({ length: 4 }).map((_, i) => (
    <div key={i} className="space-y-3 rounded-lg border p-4">
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  ))}
</div>
```

**표형 로딩** (예: 핫 키워드 랭킹 표)

```tsx
<div role="status" aria-live="polite" className="space-y-2">
  <span className="sr-only">불러오는 중</span>
  <Skeleton className="h-9 w-full" />
  {Array.from({ length: 6 }).map((_, i) => (
    <Skeleton key={i} className="h-8 w-full" />
  ))}
</div>
```

### 빈 상태 — 공통 블록

```
┌───────────────────────────────────┐
│                                     │
│              (●)  ← 아이콘          │
│         아직 수집된 기사가 없어요     │
│   언론사를 선택해 크롤링을 시작해 보세요│
│                                     │
│           [[ 크롤링 시작 ]]          │
│                                     │
└───────────────────────────────────┘
```

```tsx
// components/common/empty-state.tsx (구현된 실물)
export interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  /** 액션이 페이지 이동이면 href를, 그 자리에서 처리할 동작이면 onAction을 준다. */
  actionHref?: string
  onAction?: () => void
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {actionLabel && (
        <EmptyContent>
          {actionHref ? (
            <Button asChild>
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button onClick={onAction}>{actionLabel}</Button>
          )}
        </EmptyContent>
      )}
    </Empty>
  )
}
```

사용 예(수집 결과 페이지에서 아직 크롤링 실행 이력이 없을 때) — **페이지 이동은 `actionHref`로 넘깁니다.**
`onAction`에서 `router.push`를 부르면 링크가 아니라 버튼이 되어 새 탭 열기·미리 보기가 막히고,
raw `<a href="/">`로 대체하면 `@next/next/no-html-link-for-pages`가 **error**로 걸려 `npm run lint`가 실패합니다.

```tsx
<EmptyState
  icon={<Inbox />}
  title="아직 수집된 기사가 없어요"
  description="언론사를 선택해 크롤링을 시작해 보세요"
  actionLabel="크롤링 시작"
  actionHref="/"
/>
```

그 자리에서 처리할 동작(예: 다이얼로그 열기)일 때만 `onAction`을 씁니다. 두 prop을 동시에 주면 `actionHref`가 이깁니다.

#### 임시 자리표시자 `<ScreenPlaceholder>`

`components/common/screen-placeholder.tsx`는 `<EmptyState>` 위에 `Construction` 아이콘과 "아직 구현 전인 화면이에요" 문구를 얹은 **라우트 껍데기 전용** 블록입니다. 지금 5개 페이지가 모두 이것만 렌더링합니다.

- 화면 Task는 본문을 구현하면서 자기 페이지에서 이 컴포넌트를 **제거**합니다(각 Task의 DoD 첫 항목).
- **파일 자체는 지금 지우지 않습니다.** 아직 남은 화면들이 쓰고 있으므로, 5개가 전부 교체된 뒤 **Task 023(임시 코드 제거)에서 삭제**합니다.
- 실제 화면의 빈 상태에는 이 컴포넌트를 쓰지 않습니다 — `<EmptyState>`를 직접 호출합니다.

### 에러 — Alert 공통 블록

```
┌───────────────────────────────────┐
│ ⚠ 크롤링 중 오류가 발생했어요        │
│   네트워크 상태를 확인하고 다시       │
│   시도해 주세요                     │
└───────────────────────────────────┘
```

```tsx
// components/common/error-alert.tsx
export interface ErrorAlertProps {
  title?: string
  description: string
  onRetry?: () => void
}

export function ErrorAlert({
  title = '오류가 발생했어요',
  description,
  onRetry,
}: ErrorAlertProps) {
  return (
    <Alert variant="destructive">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      {onRetry && (
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        </AlertAction>
      )}
    </Alert>
  )
}
```

`Alert`는 `role="alert"`가 이미 컴포넌트에 내장돼 있어(`components/ui/alert.tsx:30`) 별도 지정이 필요 없습니다.
경고 아이콘은 **`TriangleAlert`**(신 별칭)를 씁니다 — `AlertTriangle`은 쓰지 않습니다(`docs/screens/README.md` §lucide 아이콘 별칭).

---

## 사용 컴포넌트

전부 설치 완료 — 추가 설치 명령이 필요 없습니다(`sheet` `empty`도 Task 002에서 함께 설치됐습니다).

| 컴포넌트 | 용도 |
|----------|------|
| `alert` | 에러 공통 블록(`<ErrorAlert>`) |
| `breadcrumb` | 페이지 헤더 블록(`<PageHeader>`) |
| `button` | 햄버거 트리거, 다크토글, 빈 상태/에러 액션 |
| `navigation-menu` | 데스크톱 내비게이션 |
| `skeleton` | 로딩 공통 패턴 |
| `sonner` | 토스트(`Toaster`) |
| `sheet` | 모바일 햄버거 펼침 패널 |
| `empty` | 빈 상태 공통 블록(`<EmptyState>`) |

**lucide-react 아이콘**

| 아이콘 | 용도 |
|--------|------|
| `Bug` | 🕷 로고 / 크롤링 실행 메뉴 — lucide에 spider 아이콘이 없어 크롤러/봇을 연상시키는 `Bug`로 대체 |
| `FileText` | 📄 수집 결과 메뉴 |
| `Flame` | 🔥 핫 키워드 분석 메뉴 |
| `Newspaper` | 📰 언론사 관리 메뉴 |
| `Ban` | 🚫 불용어 관리 메뉴 |
| `Menu` | 모바일 햄버거 트리거 |
| `Sun` / `Moon` | 다크모드 토글(아이콘 교차 표시는 CSS `dark:` variant, 전환 자체는 `next-themes`의 `setTheme`) |
| `TriangleAlert` | 에러 공통 블록(`<ErrorAlert>`) — 구 별칭 `AlertTriangle`을 쓰지 않습니다 |
| `Construction` | `<ScreenPlaceholder>`의 미구현 안내 아이콘(Task 023에서 컴포넌트와 함께 사라짐) |

`X`(닫기)는 `sheet` 설치 시 컴포넌트 파일에 이미 포함되어 있어 셸에서 별도로 import하지 않습니다.

---

## 접근성

- 데스크톱 내비: `<NavigationMenu aria-label="주 메뉴">` — `NavigationMenuPrimitive.Root`는 Radix 기본 동작으로 `<nav>` 엘리먼트로 렌더링됩니다.
- 현재 페이지 표시: `NavigationMenuLink`의 `active` prop → `aria-current="page"` + `data-active` 자동 부여(직접 `aria-current`를 쓰지 않아도 됨).
- 모바일 햄버거 버튼: 아이콘 전용이므로 `aria-label="메뉴 열기"` 필수.
- Sheet 패널: `SheetTitle`(스크린리더용, 시각적으로는 `sr-only` 처리 가능), `SheetDescription` 포함 — Radix Dialog는 제목/설명이 없으면 콘솔 경고를 출력하므로 시각적으로 숨기더라도 DOM에는 남겨둡니다. 열림 시 포커스 트랩과 `Esc` 닫힘은 Radix Dialog 표준 동작으로 자동 제공됩니다.
- 다크모드 토글: `aria-label="다크 모드 전환"` + 아이콘 `aria-hidden="true"` + `sr-only` 텍스트 보강.
- Breadcrumb: `Breadcrumb`(`aria-label="breadcrumb"`)와 `BreadcrumbPage`(`aria-current="page"`)가 이미 컴포넌트에 내장(`components/ui/breadcrumb.tsx:10,65`) — 추가 작업 불필요.
- 로딩 영역: `role="status" aria-live="polite"` + `sr-only` "불러오는 중" 텍스트(위 "로딩" 패턴 3종에 모두 적용).
- 에러 Alert: `role="alert"`가 컴포넌트에 내장(`components/ui/alert.tsx:30`).
- 키보드 이동: 데스크톱 내비 항목 간 좌우 방향키 이동은 Radix `NavigationMenu`가 기본 제공, Sheet 내부 링크는 `Tab`으로 순차 이동 + 포커스 트랩.

---

## 마크업 스켈레톤

디렉터리 구성: 헤더 전용 조각은 `components/layout/`, 여러 페이지가 재사용하는 비-셸 UI(PageContainer, PageHeader, EmptyState, ErrorAlert)는 `components/common/`에 둡니다.

아래 코드는 **구현된 실물**입니다(Task 002 완료). 화면 Task는 이 파일들을 고치지 않고 호출만 합니다.

### `components/layout/nav-items.ts`

```ts
import { Ban, Bug, FileText, Flame, Newspaper } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

// 헤더 데스크톱 내비 + 모바일 Sheet가 공유하는 단일 메뉴 데이터 소스
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: '크롤링 실행', icon: Bug },
  { href: '/results', label: '수집 결과', icon: FileText },
  { href: '/keywords', label: '핫 키워드 분석', icon: Flame },
  { href: '/press', label: '언론사 관리', icon: Newspaper },
  { href: '/stopwords', label: '불용어 관리', icon: Ban },
]

/**
 * 현재 경로가 해당 메뉴에 해당하는지 판정한다.
 * 홈('/')은 하위 경로를 갖지 않으므로 완전 일치로만 활성화하고,
 * 나머지는 하위 경로(예: /press/etnews)에서도 상위 메뉴가 활성으로 남게 한다.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
```

활성 판정은 목(mock) 상수가 아니라 이 함수 + `usePathname()`으로 합니다. 데스크톱/모바일 내비가 같은 함수를 써야 두 곳의 활성 표시가 어긋나지 않습니다.

### `components/layout/main-nav.tsx`

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'

import { isNavItemActive, NAV_ITEMS } from './nav-items'

export interface MainNavProps {
  className?: string
}

// 데스크톱(≥768px)에서만 보이는 평면 내비게이션 — 드롭다운(Trigger/Content) 없음
export function MainNav({ className }: MainNavProps) {
  const pathname = usePathname()

  return (
    <NavigationMenu
      aria-label="주 메뉴"
      viewport={false}
      className={cn('hidden md:flex', className)}
    >
      <NavigationMenuList>
        {NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(item.href, pathname)
          return (
            <NavigationMenuItem key={item.href}>
              {/* active prop이 aria-current="page"와 data-active를 함께 붙여준다 */}
              <NavigationMenuLink asChild active={isActive}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex flex-row items-center gap-1.5 whitespace-nowrap',
                    isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <item.icon aria-hidden="true" className="size-4" />
                  {item.label}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
```

### `components/layout/mobile-nav.tsx`

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

import { isNavItemActive, NAV_ITEMS } from './nav-items'

/**
 * 768px 미만에서만 보이는 햄버거 트리거 + 좌측 Sheet 패널.
 * 링크를 누르면 패널이 닫혀야 하므로 열림 상태를 직접 들고 있는다
 * (SheetClose asChild + Link 조합은 Radix가 Link의 onClick을 삼키는 경우가 있어
 *  onOpenChange로 명시적으로 제어한다).
 */
export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="메뉴 열기">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 sm:max-w-sm">
        {/* Radix Dialog는 제목/설명이 없으면 콘솔 경고를 내므로 화면에서만 숨긴다 */}
        <SheetHeader className="sr-only">
          <SheetTitle>메뉴</SheetTitle>
          <SheetDescription>페이지 이동 메뉴입니다</SheetDescription>
        </SheetHeader>
        {/* 닫기 버튼이 absolute top-3 right-3에 떠 있어 첫 항목과 겹친다.
            제목을 sr-only로 숨겼으니 그만큼 위 여백을 직접 확보한다. */}
        <nav aria-label="주 메뉴" className="flex flex-col gap-1 px-4 pt-12">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavItemActive(item.href, pathname)
            return (
              <SheetClose asChild key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted',
                    isActive
                      ? 'bg-muted/50 font-semibold text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  <item.icon aria-hidden="true" className="size-4" />
                  {item.label}
                </Link>
              </SheetClose>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
```

### `components/layout/theme-toggle.tsx`

```tsx
'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'

/**
 * 라이트/다크 토글 버튼.
 *
 * 아이콘은 dark: variant로 교차 표시하므로 렌더 시점에 테마 값이 필요 없다.
 * 어느 쪽으로 전환할지는 클릭 시점에 <html>의 dark 클래스를 직접 읽어 정한다.
 * next-themes가 하이드레이션 이전에 인라인 스크립트로 클래스를 붙여 주므로
 * 이 값이 항상 정확하고, 렌더 결과가 서버/클라이언트에서 동일해
 * 마운트 상태를 따로 들고 있을 필요가 없다(하이드레이션 불일치 없음).
 */
export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="다크 모드 전환"
      onClick={() => {
        const isDark = document.documentElement.classList.contains('dark')
        setTheme(isDark ? 'light' : 'dark')
      }}
    >
      <Sun className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" aria-hidden="true" />
      <Moon className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" aria-hidden="true" />
      <span className="sr-only">다크 모드 전환</span>
    </Button>
  )
}
```

### `components/layout/site-header.tsx`

```tsx
import Link from 'next/link'
import { Bug } from 'lucide-react'

import { MainNav } from './main-nav'
import { MobileNav } from './mobile-nav'
import { ThemeToggle } from './theme-toggle'

/**
 * 모든 페이지가 공유하는 상단 헤더.
 * 서버 컴포넌트로 두고, 인터랙션이 필요한 조각(MobileNav, ThemeToggle,
 * 현재 경로를 읽는 MainNav)만 각자 'use client' 경계를 갖는다.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 h-14 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <MobileNav />
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-sm font-semibold sm:text-base"
          >
            <Bug aria-hidden="true" className="size-5" />
            {/* 768~1023px는 메뉴 5개가 이미 펼쳐져 있어 전문 로고까지 넣으면 헤더가 넘친다 */}
            <span className="hidden lg:inline">IT/AI 뉴스 핫 키워드 크롤러</span>
            <span className="lg:hidden">핫키워드 크롤러</span>
          </Link>
          <MainNav />
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
```

### `components/common/page-container.tsx`

```tsx
import { cn } from '@/lib/utils'

export interface PageContainerProps {
  children: React.ReactNode
  width?: 'default' | 'wide' | 'narrow'
  className?: string
}

const WIDTH_CLASS = {
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
  narrow: 'max-w-3xl',
} as const

/** 모든 페이지가 공유하는 본문 컨테이너. */
export function PageContainer({
  children,
  width = 'default',
  className,
}: PageContainerProps) {
  return (
    <main className="flex-1">
      <div
        className={cn(
          'container mx-auto px-4 py-6 md:py-8',
          WIDTH_CLASS[width],
          className
        )}
      >
        {children}
      </div>
    </main>
  )
}
```

### `components/common/page-header.tsx`

```tsx
import { Fragment } from 'react'
import Link from 'next/link'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export interface PageHeaderCrumb {
  label: string
  /** 생략하면 현재 페이지로 간주해 링크 대신 BreadcrumbPage로 렌더한다. */
  href?: string
}

export interface PageHeaderProps {
  breadcrumbs: PageHeaderCrumb[]
  title: string
  description?: string
  /** 제목 우측에 붙는 액션 영역(주로 버튼). */
  action?: React.ReactNode
}

/** 5개 페이지가 공통으로 쓰는 페이지 헤더 블록(Breadcrumb + h1 + 설명). */
export function PageHeader({ breadcrumbs, title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <Fragment key={crumb.label}>
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  )
}
```

### 페이지 골격 적용 예시 (01~05가 그대로 따르는 형태)

`<main>`과 컨테이너 `<div>`를 직접 쓰지 않고 `<PageContainer>`를 호출합니다. 아래는 구현된 `app/page.tsx`(홈)의 형태입니다.

```tsx
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'

export default function CrawlRunPage() {
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: '크롤링 실행' }]}
        title="크롤링 실행"
        description="크롤링할 언론사를 선택하고 수집을 시작하세요"
      />
      <div className="space-y-6">{/* 페이지 본문 — 01~05 문서에서 정의 */}</div>
    </PageContainer>
  )
}
```

폭을 좁혀야 하는 화면(불용어 관리)은 `<PageContainer width="narrow">`, 넓은 표가 있는 화면은 `width="wide"`를 씁니다.

### `app/layout.tsx` (구현된 실물)

```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { SiteHeader } from '@/components/layout/site-header'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'IT/AI 뉴스 핫 키워드 크롤러',
  description:
    '선택한 언론사에서 IT/AI 기사를 수집하고 형태소 분석으로 핫 키워드를 뽑아내는 도구',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // next-themes가 최초 렌더 직후 class를 주입하므로 경고 억제가 필요하다
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SiteHeader />
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

폰트 변수 두 개는 `app/globals.css`의 `@theme inline`에서 `--font-sans` / `--font-mono`로 연결되고, 본문 폰트는 `@layer base`의 `html { @apply font-sans }`로 적용됩니다. 페이지에서 폰트를 다시 지정하지 않습니다.

---

## `app/layout.tsx` / `components/layout/` 변경 목록 (Task 002에서 반영 완료)

| 파일 | 상태 | 설명 |
|------|------|------|
| `app/layout.tsx` | 완료(수정) | `<body>`를 `ThemeProvider`로 감싸고 `<SiteHeader />`·`<Toaster />` 배치, `suppressHydrationWarning`(next-themes 필수), Geist 폰트 변수 주입 |
| `components/theme-provider.tsx` | 완료(신규) | `next-themes`의 `ThemeProvider`를 감싸는 `'use client'` 래퍼(표준 shadcn 보일러플레이트) |
| `components/layout/nav-items.ts` | 완료(신규) | 5개 메뉴 데이터(href/label/icon) 단일 소스 + `isNavItemActive()` — 데스크톱/모바일 내비가 공유 |
| `components/layout/main-nav.tsx` | 완료(신규) | 데스크톱 `NavigationMenu` (`hidden md:flex`) |
| `components/layout/mobile-nav.tsx` | 완료(신규) | 햄버거 트리거 + `Sheet` (`md:hidden`) |
| `components/layout/theme-toggle.tsx` | 완료(신규) | 다크모드 아이콘 전용 토글 버튼 |
| `components/layout/site-header.tsx` | 완료(신규) | 위 3개를 조합하는 `<header>` (서버 컴포넌트) |
| `components/common/page-container.tsx` | 완료(신규) | `<main className="flex-1">` + 컨테이너 `<div>`, `width` prop으로 폭 선택. `01~05` 문서 공용 |
| `components/common/page-header.tsx` | 완료(신규) | Breadcrumb + h1 + 설명 + 액션 캡슐화, `01~05` 문서 공용 |
| `components/common/empty-state.tsx` | 완료(신규) | `Empty` 프리미티브 래퍼(`actionHref`/`onAction`), `01~05` 문서 공용 |
| `components/common/error-alert.tsx` | 완료(신규) | `Alert variant="destructive"` 래퍼, `01~05` 문서 공용 |
| `components/common/screen-placeholder.tsx` | 완료(신규) · **Task 023에서 삭제** | 라우트 껍데기용 임시 자리표시자. 5개 화면이 아직 이걸 렌더링하므로 **지금 지우지 않는다** — 화면 Task가 각 페이지에서 제거하고, 마지막 페이지까지 교체된 뒤 Task 023에서 파일을 삭제한다 |
| `components/ui/sheet.tsx` · `components/ui/empty.tsx` | 완료(설치) | Task 002의 shadcn 13종 일괄 설치에 포함 |
| `app/page.tsx` | 별도 문서 대상 | 현재 `<PageContainer>` + `<PageHeader>` + `<ScreenPlaceholder>`만 렌더링 — 본문은 `01-crawl-run.md`(Task 016)에서 채운다. 이 문서의 범위 밖 |
