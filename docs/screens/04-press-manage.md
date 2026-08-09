# 04. 언론사 관리

## 개요

- **역할**: 크롤링 대상 언론사를 코드가 아닌 **데이터**로 등록·관리하는 페이지. 새 언론사를 추가할 때 코드 수정이 전혀 필요 없어야 한다는 요구사항이 이 화면의 존재 이유다.
- **구현 기능 ID**: F007 (언론사 레지스트리 관리)
- **진입 경로**: 상단 헤더 메뉴 "언론사 관리" 클릭
- **다음 이동**: 언론사를 추가/수정/삭제하거나 활성 상태를 전환한 뒤 헤더 메뉴로 "크롤링 실행"(홈)에 돌아가면, 여기서 활성(`isActive: true`)으로 남은 언론사만 체크박스 목록에 즉시 반영된다(`docs/PRD.md` 사용자 여정 [분기 B] 참고).

## 설계 결정 근거

팀 리드 요청에 따라 화면 설계 전 다음 세 가지를 먼저 결정한다.

### 0) 수집 방식 분기 — `sourceType`이 이 화면의 축이다

Press는 `sourceType: 'rss' | 'html'`을 판별자로 갖는 분기 타입이다(`docs/PRD.md` 데이터 모델). 두 방식은 필요한 필드가 다르다.

| 방식 | 필드 | 비고 |
|------|------|------|
| `rss` | `feedUrl`, `contentSelector`(선택) | 제목·링크·요약을 피드가 직접 준다. `contentSelector`를 채우면 원문 페이지에서 본문 전문을 보강 |
| `html` | `listUrl`, `articleLinkSelector`, `titleSelector`, `contentSelector` | 목록 페이지를 파싱해 기사 링크를 뽑는다 |

RSS의 **"본문 전문 수집" 스위치는 저장되는 필드가 아니다.** `contentSelector`를 채울지 비울지를 정하는 **UI 장치**일 뿐이고, 별도의 boolean 플래그를 데이터 모델에 두지 않는다. 켜면 본문 셀렉터 입력이 나타나 필수가 되고, 끄면 `contentSelector`를 저장하지 않는다. 화면이 스위치 상태를 복원할 때도 저장된 플래그가 아니라 `Boolean(press.contentSelector)`로 판정한다. `docs/PRD.md` §데이터 모델의 `contentSelector` 설명("지정하면 피드의 각 기사 원문 페이지를 열어 이 셀렉터로 본문 전문을 수집한다. 비우면 피드의 `description`(요약)만 저장한다")과 정확히 같은 규칙이다.

**결정**: 방식 선택을 폼의 **첫 번째 입력**으로 두고, 그 값에 따라 이후 필드를 통째로 교체한다. 두 방식의 필드를 한 폼에 모두 늘어놓고 비활성화하는 방식은 택하지 않았다 — RSS를 고른 사용자에게 회색 처리된 셀렉터 3개를 계속 보여주는 것은 "이것도 채워야 하나?"라는 불필요한 판단을 강요한다. 목록 표시에서도 방식은 배지로 항상 드러낸다. 같은 목록에 성격이 다른 두 종류가 섞이는데 구분이 없으면 "이 언론사는 왜 셀렉터가 없지?"를 매번 다시 확인하게 된다.

### 1) 목록 표현 — 표(각 행 펼침) + 모바일 카드 리스트

Press 한 건당 필드가 방식에 따라 4~6개이고 그중 최대 3개가 CSS 셀렉터 문자열이라, 표에 모두 펼쳐 놓으면 한 화면(`max-w-6xl`)을 넘겨 상시 가로 스크롤이 생긴다. 그렇다고 셀렉터를 완전히 표에서 빼면 "이 언론사가 왜 안 긁히지?"를 확인할 때마다 수정 다이얼로그를 열어야 해서 불편하다.

**결정**: 데스크톱(`md:` 이상)은 `table`을 쓰되 **방식별 상세 설정을 한 컬럼(`수집 설정`)으로 접어 두고, 클릭하면 같은 표 안에 서브 행(`colSpan`)으로 펼쳐** `font-mono`로 보여준다. 수집 방식은 **별도 컬럼을 만들지 않고 이름 셀 안에 `Badge`로 인라인 배치**한다 — 컬럼을 6개로 늘리면 `max-w-6xl`에서 다시 좁아지고, 방식은 이름과 함께 읽히는 편이 자연스럽다.

`수집 설정` 컬럼의 셀 내용은 방식에 따라 다르다.

| 조건 | 셀 표시 | 펼침 |
|------|---------|------|
| `html` | `셀렉터 3개 ▸` (버튼) | 기사 링크 / 제목 / 본문 셀렉터 |
| `rss` + `contentSelector` 있음 | `본문 셀렉터 ▸` (버튼) | 본문 셀렉터 + "원문 전문 수집" 표시 |
| `rss` + `contentSelector` 없음 | `피드 요약만` (`text-muted-foreground`, 버튼 아님) | 없음 — 펼칠 내용이 없으므로 버튼으로 만들지 않는다 |

모바일(`md:` 미만)은 표 대신 **카드 리스트**로 전환한다 — 5컬럼 표를 좁은 화면에서 가로 스크롤시키면 셀렉터 같은 긴 고정폭 문자열이 특히 읽기 어렵고, 수정/삭제 버튼도 손가락으로 누르기 빡빡해지기 때문이다. 표/카드 전환 기준은 README 기본값인 `sm`(640px)이 아니라 **`md`(768px)**로 잡았다 — 이 표는 컬럼이 5개(이름+배지/소스 URL/수집 설정/활성/관리)라 640px 폭에서는 표 형태를 유지해도 실질적으로 읽을 수 없어, 카드로 전환하는 폭을 넓혔다.

### 2) 추가/수정 폼 배치 — 다이얼로그(모달)

별도 페이지나 인라인 확장 행 대신 `dialog`를 선택했다. 언론사 추가/수정은 "목록을 훑어보다가 가끔 하나 손보는" 빈도가 낮은 행동이라, 페이지 전환 없이 목록 컨텍스트를 유지한 채 처리하는 편이 낫다. 또한 추가와 수정 폼의 필드 구성이 같은 방식 안에서는 완전히 동일해서(활성 여부, ID 표시 여부만 다름) 다이얼로그 하나(`PressFormDialog`)를 `mode="create" | "edit"`로 재사용하면 목록 화면에 별도 인라인 폼 영역을 상시 배치할 필요가 없다. 표의 각 행 옆에도, 페이지 상단에도 자연스럽게 트리거 버튼을 붙일 수 있다는 점도 다이얼로그를 택한 이유다.

수집 방식 전환으로 필드가 바뀌는 것은 이 결정을 흔들지 않는다. 다이얼로그 안에서 `sourceType` 값에 따라 필드 블록만 교체하면 되고, 다이얼로그 높이가 방식에 따라 달라지는 것은 `sm:max-w-lg` 폭이 고정이라 문제되지 않는다.

### 3) 소스 테스트 액션 — 포함 (방식별로 하나씩)

이 폼에서 가장 틀리기 쉬운 입력(RSS는 피드 URL, HTML은 기사 링크 셀렉터)을 저장 전에 검증할 수 있게 한다. 틀려도 저장은 성공하고 **크롤링을 돌려야만 "0건 수집"으로 드러나는** 종류의 오류라, 폼 안에서 즉시 확인할 수단이 없으면 진단 비용이 크게 오른다.

| 방식 | 테스트 대상 | 하는 일 | 재사용할 것 |
|------|------------|---------|-------------|
| `rss` | `feedUrl` | 피드를 받아 파싱하고 **기사 건수 + 최신 3건의 제목·링크**를 보여준다. 요약 길이 평균도 함께 표시해 `contentSelector` 필요 여부를 판단할 근거를 준다 | `lib/crawler/rss.ts`의 피드 파서 |
| `html` | `articleLinkSelector` | 폼의 `listUrl`을 열어 셀렉터로 찾은 **링크 수 + 샘플 3건**을 보여준다 | `lib/crawler/parse.ts`의 `extractLinks($, baseUrl, selector)` |

RSS 테스트의 "요약 길이 평균"은 이 화면에만 있는 판단 보조 장치다. 국내 언론사 피드는 `description`이 전문에 가까운 곳부터 100자 남짓만 주는 곳까지 편차가 크고, 그 수치를 봐야 `contentSelector`를 채워 원문까지 긁을지를 결정할 수 있다.

**제외**: 제목/본문 셀렉터 테스트는 여전히 MVP 밖이다. 개별 기사 URL이 폼에 없어서 "테스트용 기사 URL" 입력을 추가해야 하는데, RSS 방식에서는 피드 첫 기사를 그대로 쓸 수 있어 유혹이 있지만 HTML 방식에서는 여전히 불가능해 두 방식의 폼이 비대칭이 된다. 대칭을 지키는 쪽을 택했다.

### 4) 골격은 공통 컴포넌트를 호출한다

`<main>` + 컨테이너 `<div>`, Breadcrumb + `h1` + 설명, 빈 상태 마크업을 이 화면에서 다시 그리지 않는다. 이미 구현된 파일을 **호출**한다.

| 골격 | 호출할 컴포넌트 | 이 화면에서의 인자 |
|------|----------------|-------------------|
| 본문 컨테이너 | `components/common/page-container.tsx` | `<PageContainer>`(기본 `width="default"` = `max-w-6xl`). 손으로 쓴 `div.container.max-w-6xl`을 그대로 옮기면 `<main>`이 빠져 `app/layout.tsx`의 `flex min-h-full flex-col` 아래에서 셸이 깨진다 |
| 페이지 헤더 | `components/common/page-header.tsx` | `breadcrumbs={[{ label: '홈', href: '/' }, { label: '언론사 관리' }]}`, `title`, `description`, 그리고 `[+ 언론사 추가]` 트리거를 **`action` prop**으로 넘긴다. `href`가 있는 브레드크럼 항목은 컴포넌트가 `BreadcrumbLink asChild` + `next/link`로 렌더한다(raw `href`는 클라이언트 라우팅을 우회한다) |
| 빈 상태 | `components/common/empty-state.tsx` | 언론사 0건 자리. `py-16 text-center` 블록을 손으로 만들지 않는다 |
| 오류 | `components/common/error-alert.tsx` | 목록 조회 실패 시. ② 안내 Alert는 오류가 아니라 상시 노출되는 설명이므로 `Alert`(기본 variant)를 그대로 쓴다 |

### 5) 컴포넌트 분할 경계

아래 마크업 스켈레톤은 읽기 편하도록 `PressFormDialog`·`DeletePressDialog`까지 한 블록에 이어 붙였지만, **구현은 한 파일에 몰지 않는다.** `docs/ROADMAP.md` Task 009가 못 박은 파일 목록이 기준이다.

| 스켈레톤 구간 | 가는 파일 |
|---------------|-----------|
| 페이지 골격(`PageContainer` + `PageHeader` + ② 안내 Alert + 상태 분기) | `app/press/page.tsx` (수정 — `ScreenPlaceholder` 제거) |
| ③④ 데스크톱 표 + 수집 설정 펼침 서브 행 | `components/press/press-table.tsx` (신규) |
| ④' 모바일 카드 리스트(`md:` 미만) | `components/press/press-card-list.tsx` (신규) |
| `SourceTypeBadge` | `components/press/source-type-badge.tsx` (신규 — 표·카드·크롤링 실행 화면(01)이 함께 쓴다. 이 화면 안에 두면 01이 import할 곳이 없다) |
| ⑤ `PressFormDialog`(`mode="create" \| "edit"` 공용 + 방식별 조건부 필드) | `components/press/press-form-dialog.tsx` (신규) |
| ③-C 소스 테스트 버튼·결과 영역 | `components/press/source-test-panel.tsx` (신규 — Task 010에서 추가하며 `press-form-dialog.tsx`가 호출한다) |
| ⑥ `DeletePressDialog` | `components/press/delete-press-dialog.tsx` (신규) |
| 언론사 조회·저장·삭제·활성 전환 fetch 래퍼 | `lib/api/press-client.ts` (신규) |

`PressSource` 타입과 `sourceUrlOf`·`expandLabelOf` 헬퍼는 표와 카드 리스트가 함께 쓰므로 한쪽 컴포넌트 파일에 가두지 않는다. 도메인 타입은 `lib/types/`의 zod 스키마에서 `z.infer`로 파생한 것을 쓰고(`docs/CONVENTIONS.md` §3), 같은 모양의 인터페이스를 화면에서 다시 손으로 쓰지 않는다.

## 화면 구성

| 영역 | 목적 |
|------|------|
| ① 페이지 헤더 | Breadcrumb + 제목 + 설명 + "언론사 추가" 주 버튼 |
| ② 안내 Alert | "여기서 바꾼 내용은 코드 수정 없이 크롤링 실행 페이지 체크박스에 즉시 반영된다"는 이 화면의 존재 이유를 문장으로 상기 |
| ③ 언론사 목록(표) | 데스크톱: 이름+방식 배지 / 소스 URL / 수집 설정(접힘) / 활성 스위치 / 관리(수정·삭제) |
| ④ 수집 설정 펼침 서브 행 | ③의 `셀렉터 3개 ▸` 또는 `본문 셀렉터 ▸` 클릭 시 같은 표 안에 방식별 상세 노출 |
| ④' 언론사 목록(카드) | 모바일: ③④를 카드 1장으로 압축 |
| ⑤ 언론사 추가/수정 다이얼로그 | 수집 방식 선택 → 방식별 필드(RSS: 피드 URL·본문 전문 수집 / HTML: 목록 URL·셀렉터 3종) + 소스 테스트 + 활성 스위치 |
| ⑥ 삭제 확인 다이얼로그 | 되돌릴 수 없는 삭제를 막는 확인 단계 |

## 와이어프레임 — 데스크톱 (≥1024px)

기본 상태를 기준으로 그린다. **수집 방식 3가지 경우가 모두 보이도록** 언론사 4곳을 배치했다 — RSS(요약만) / RSS(본문 전문, 펼침 예시) / HTML(활성) / HTML(비활성).

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 헤더 (h-14 sticky) 로고 | 크롤링 실행 · 수집 결과 · 핫 키워드 분석 · 언론사 관리 · 불용어 관리 | 🌓 │
└────────────────────────────────────────────────────────────────────────────┘
┌ <PageContainer> — main.flex-1 > div.container.mx-auto.max-w-6xl.px-4.py-6 ──┐
│ 홈 › 언론사 관리                                                             │
│                                                                              │
│ ① 언론사 관리                                          [[ + 언론사 추가 ]]   │
│    크롤링 대상 언론사를 코드 수정 없이 데이터로 등록·관리합니다.               │
│                                                                              │
│ ┌─② Alert ────────────────────────────────────────────────────────────┐   │
│ │ ℹ 변경 사항은 즉시 반영됩니다                                          │   │
│ │   여기서 추가·수정·활성 전환한 언론사는 코드 수정 없이 크롤링 실행       │   │
│ │   페이지의 언론사 체크박스 목록에 바로 반영됩니다.                      │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│ ┌─③④ Table (rounded-md border) ────────────────────────────────────────┐   │
│ │ 이름              │ 소스 URL                    │ 수집 설정    │ 활성   │관리│ │
│ │───────────────────┼──────────────────────────────┼──────────────┼────────┼────│ │
│ │ 전자신문   〔RSS〕│ https://rss.etnews.com/Sec… │ 피드 요약만  │⏻ 활성 │✎ 🗑│ │
│ │───────────────────┼──────────────────────────────┼──────────────┼────────┼────│ │
│ │ ZDNet    〔RSS〕  │ https://zdnet.co.kr/news_x… │ 본문 셀렉터▾ │⏻ 활성 │✎ 🗑│ │
│ │   ┌ 본문 셀렉터   #articleBody                                           │ │
│ │   └ 본문 출처     원문 전문 (피드 요약 대신 원문 페이지에서 수집)         │ │
│ │───────────────────┼──────────────────────────────┼──────────────┼────────┼────│ │
│ │ IT조선    〔HTML〕│ https://it.chosun.com/news/it│ 셀렉터 3개 ▸ │⏻ 활성 │✎ 🗑│ │
│ │───────────────────┼──────────────────────────────┼──────────────┼────────┼────│ │
│ │ 디지털투데이〔HTML〕│ https://digitaltoday.co.k…│ 셀렉터 3개 ▸ │⏻ 비활성│✎ 🗑│ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                        총 4개 언론사 (RSS 2 · HTML 2)        │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 와이어프레임 — 모바일 (<640px)

```
┌ 헤더 (햄버거로 축약) ☰  IT/AI 크롤러                🌓 ┐
├──────────────────────────────────────────────────────┤
│ <PageContainer> px-4 py-6                             │
│ 홈 › 언론사 관리                                        │
│                                                        │
│ 언론사 관리                        [[ + 언론사 추가 ]] │
│ 크롤링 대상 언론사를 코드 수정 없이 데이터로 등록·관리…   │
│                                                        │
│ ┌─ Alert ──────────────────────────────────────────┐ │
│ │ ℹ 변경 사항은 즉시 반영됩니다                       │ │
│ │   …크롤링 실행 페이지 체크박스에 바로 반영됩니다.    │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─ Card ────────────────────────────────────────────┐ │
│ │ 전자신문  〔RSS〕                      ⏻ 활성       │ │
│ │ https://rss.etnews.com/Section901.xml (truncate)    │ │
│ │ 피드 요약만                                          │ │
│ │                              [ ✎ 수정 ]  [ 🗑 삭제 ]│ │
│ └──────────────────────────────────────────────────────┘ │
│ ┌─ Card ────────────────────────────────────────────┐ │
│ │ ZDNet Korea 〔RSS〕                    ⏻ 활성       │ │
│ │ https://zdnet.co.kr/news/news_xml.asp               │ │
│ │ 본문 셀렉터 보기 ▸                                   │ │
│ │                              [ ✎ 수정 ]  [ 🗑 삭제 ]│ │
│ └──────────────────────────────────────────────────────┘ │
│ ┌─ Card ────────────────────────────────────────────┐ │
│ │ IT조선   〔HTML〕                      ⏻ 활성       │ │
│ │ https://it.chosun.com/news/it                       │ │
│ │ 셀렉터 3개 보기 ▸                                   │ │
│ │                              [ ✎ 수정 ]  [ 🗑 삭제 ]│ │
│ └──────────────────────────────────────────────────────┘ │
│ … 디지털투데이(HTML · 비활성) 카드는 형태가 같아 생략     │
└────────────────────────────────────────────────────────┘
```

> `〔RSS〕` `〔HTML〕`는 `Badge` 컴포넌트다(`variant="secondary"` / `variant="outline"`). README의 와이어프레임 표기 규칙에 없는 기호라 여기서 정의한다.
>
> `피드 요약만`은 버튼이 아니라 `text-muted-foreground` 텍스트다. 펼칠 내용이 없는데 펼침 버튼처럼 보이면 눌러 보고 아무 일도 안 일어나는 경험이 된다.

## 영역별 컴포넌트 명세

| 영역 | UI 컴포넌트 | Tailwind 클래스 | 비고 |
|------|------------|-----------------|------|
| ⓪ 본문 컨테이너 | `PageContainer`(`components/common/page-container.tsx`) | (컴포넌트 내부 `<main className="flex-1">` + `container mx-auto max-w-6xl px-4 py-6 md:py-8`) | 기본 폭 `default`를 쓴다. 표는 컨테이너를 넓히는 대신 `md:` 미만에서 카드로 전환해 해결한다(결정 근거 1번) |
| ① 페이지 헤더 | `PageHeader`(`components/common/page-header.tsx`) | (컴포넌트 내부 `mb-6`, 제목 줄은 `mt-2 flex items-start justify-between gap-4`) | `[+ 언론사 추가]`(`PressFormDialog`의 `trigger`)를 `action` prop으로 넘긴다. `action` 자리는 모든 폭에서 제목 오른쪽 칸이라 **`w-full`을 주지 않는다** — 라벨이 짧아 375px에서도 제목과 한 줄에 들어간다 |
| ② 안내 Alert | `Alert`, `AlertTitle`, `AlertDescription`, Info 아이콘 | `mb-6` | 이 화면의 존재 이유(F007 즉시 반영)를 문장으로 고정 노출 |
| ③ 표 (데스크톱) | `Table`/`TableHeader`/`TableRow`/`TableHead`/`TableBody`/`TableCell` | `hidden md:block overflow-x-auto rounded-md border` | `md:` 미만에서는 숨김, 카드 리스트로 대체 |
| ③ 이름 컬럼 | 이름 텍스트 + `Badge`(방식) | `flex items-center gap-2` | RSS는 `variant="secondary"`, HTML은 `variant="outline"`. 방식 전용 컬럼을 만들지 않는 이유는 결정 근거 1번 |
| ③ 활성 컬럼 | `Switch` + 상태 텍스트(`활성`/`비활성`) | `flex items-center gap-2` | 스위치 단독이 아니라 텍스트를 병기해 색상만으로 상태를 구분하지 않음 |
| ③ 관리 컬럼 | `Button`(ghost, icon) × 2 (Pencil/Trash2) | `flex justify-end gap-1` | 아이콘 전용 버튼은 `aria-label` 필수 |
| ④ 수집 설정 펼침 | `Button`(ghost, sm, ChevronRight/ChevronDown) + 서브 `TableRow`(`colSpan=5`) | `bg-muted/40` | 기본은 접힘(`hidden`). **`rss` + `contentSelector` 없음이면 버튼 자체를 렌더링하지 않고 `text-muted-foreground` 텍스트로 대체** |
| ④' 카드 리스트 (모바일) | `Card` | `grid gap-3 md:hidden` | 표와 동일한 정보를 세로 배치, 활성 스위치는 카드 우상단 |
| ⑤ 추가/수정 다이얼로그 | `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter`, `Label`, `Input`, `Textarea`, `Switch` | `sm:max-w-lg`, 필드 간 `space-y-4` | `mode="create"`/`"edit"` 공용 컴포넌트 |
| ⑤ 수집 방식 선택 | `ToggleGroup`(type="single") + `ToggleGroupItem` × 2 | `grid grid-cols-2 w-full` | 폼의 **첫 번째 필드**. 값이 바뀌면 아래 필드 블록이 통째로 교체된다. `type="single"`이라 해제되면 안 되므로 빈 값 선택을 막는다(기본값 `rss`) |
| ⑤ 본문 전문 수집 스위치 | `Switch` + 조건부 `Textarea`(본문 셀렉터) | `rounded-md border p-3`, `space-y-3` | **RSS 방식에서만 노출.** 켜면 본문 셀렉터 입력이 나타나고 필수가 된다. 끄면 `contentSelector`를 저장하지 않는다 |
| ⑤ 소스 테스트 | `Button`(outline, sm, FlaskConical) + 결과 `Alert`(성공/실패) | `flex items-center justify-between gap-2` | RSS는 피드 URL 필드 옆, HTML은 기사 링크 셀렉터 필드 옆. 방식당 하나만 (결정 근거 3번 참고) |
| ⑥ 삭제 확인 | `AlertDialog`/`AlertDialogContent`/`AlertDialogTitle`/`AlertDialogDescription`/`AlertDialogFooter`/`AlertDialogAction`/`AlertDialogCancel` | 기본 크기 | `AlertDialogAction`은 `bg-destructive` 스타일 |
| 언론사 0건 빈 상태 | `EmptyState`(`components/common/empty-state.tsx`) | (컴포넌트 내부 `Empty` 프리미티브) | `icon={<Newspaper />}`. 액션이 페이지 이동이 아니라 다이얼로그 열기라 `actionHref`가 아니라 **`onAction`** 을 쓰거나, `PressFormDialog`의 트리거를 `EmptyState` 아래에 따로 둔다 |
| 목록 조회 실패 | `ErrorAlert`(`components/common/error-alert.tsx`) | (컴포넌트 내부 `Alert variant="destructive"` + `TriangleAlert`) | `description`과 `onRetry`만 넘긴다. ② 안내 Alert와 겹치지 않게 표/카드 영역 자리에 둔다 |

## 상태별 화면

### ① 기본 (언론사 여러 개, 방식·활성 혼재)

위 데스크톱/모바일 와이어프레임이 이 상태다. RSS 언론사와 HTML 언론사가 **같은 목록에 섞여** 보이고 방식은 이름 옆 배지로만 구분된다. 목록을 방식별로 나누거나 정렬하지 않는다 — 사용자가 언론사를 찾는 기준은 방식이 아니라 이름이기 때문이다.

활성 언론사와 비활성 언론사(디지털투데이)도 같은 목록에 함께 보이며, 비활성은 스위치가 꺼짐 + "비활성" 텍스트로 표시된다. 비활성 언론사는 크롤링 실행 페이지의 체크박스 목록에는 나타나지 않는다는 점을 안내 Alert가 상기시킨다.

### ② 언론사 0개 빈 상태

```
┌ <PageContainer> ──────────────────────────────────────────┐
│ 홈 › 언론사 관리                                            │
│ 언론사 관리                              [[ + 언론사 추가 ]] │
│ 크롤링 대상 언론사를 코드 수정 없이 데이터로 등록·관리합니다.  │
│                                                             │
│ ┌─② Alert ────────────────────────────────────────────┐  │
│ │ ℹ 변경 사항은 즉시 반영됩니다  …                       │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│                       📰                                   │
│               등록된 언론사가 없습니다                       │
│      크롤링을 시작하려면 먼저 언론사를 추가하세요.            │
│                                                             │
│                 [[  + 언론사 추가  ]]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

표/카드 영역 전체가 **`EmptyState`**(`icon={<Newspaper />}`)로 대체된다. `py-16 text-center` 블록을 손으로 그리지 않는다 — `00-app-shell.md`가 이 컴포넌트를 "01~05 공용"으로 못 박았고 여백·정렬은 `Empty` 프리미티브가 이미 갖고 있다.

빈 상태의 주 버튼은 페이지 이동이 아니라 **다이얼로그를 여는 트리거**라 `EmptyState`의 `actionHref`로 표현할 수 없다. `EmptyState`에는 `actionLabel`을 주지 않고, 바로 아래에 `<PressFormDialog mode="create" trigger={<Button>…} />`를 따로 배치한다(아래 마크업 스켈레톤 참고).

안내 Alert는 그대로 유지해 "언론사 추가 → 크롤링 실행 반영" 흐름을 계속 상기시킨다.

### ③-A 추가 다이얼로그 — RSS 방식 (기본값)

방식 선택 아래로 RSS 전용 필드만 나온다. 본문 전문 수집 스위치가 꺼진 기본 상태다.

```
                    (배경 dimmed overlay)
        ┌─ Dialog sm:max-w-lg ─────────────────────────────┐
        │ 언론사 추가                                   ✕  │
        │ 새 언론사를 등록하면 코드 수정 없이 크롤링 실행     │
        │ 페이지 체크박스 목록에 즉시 추가됩니다.             │
        │────────────────────────────────────────────────  │
        │ 수집 방식 *                                       │
        │ ┌──────────────────┬──────────────────┐          │
        │ │ ●  RSS 피드      │ ○  목록 페이지    │  Toggle  │
        │ └──────────────────┴──────────────────┘          │
        │ RSS를 제공하는 매체는 피드가 기사 목록을 정확히     │
        │ 주므로 셀렉터를 맞출 필요가 없습니다.               │
        │                                                    │
        │ 이름 *                                            │
        │ [ 예: 전자신문                                ]   │
        │ 언론사 목록과 크롤링 체크박스에 표시될 이름입니다.   │
        │                                                    │
        │ 피드 URL *                  [ 🧪 피드 테스트 ]    │
        │ [ https://rss.etnews.com/Section901.xml     ]mono │
        │ RSS 2.0 또는 Atom 피드 주소입니다.                 │
        │                                                    │
        │ ┌────────────────────────────────────────────┐   │
        │ │ ⏻ 본문 전문 수집                     [OFF] │   │
        │ │   끄면 피드의 요약(description)만 저장합니다.│   │
        │ │   켜면 각 기사 원문 페이지를 열어 본문을     │   │
        │ │   가져옵니다 — 정확하지만 느립니다.          │   │
        │ └────────────────────────────────────────────┘   │
        │                                                    │
        │ ⏻ 등록 즉시 활성화                                 │
        │   활성 언론사만 크롤링 체크박스 목록에 표시됩니다.  │
        │────────────────────────────────────────────────  │
        │                             [ 취소 ]  [[ 저장 ]]   │
        └────────────────────────────────────────────────────┘
```

**본문 전문 수집을 켜면** 스위치 박스 안에 본문 셀렉터 입력이 펼쳐지고 필수가 된다.

```
        │ ┌────────────────────────────────────────────┐   │
        │ │ ⏻ 본문 전문 수집                      [ON] │   │
        │ │   각 기사 원문 페이지를 열어 본문을 가져옵니다.│   │
        │ │                                              │   │
        │ │   본문 셀렉터 *                              │   │
        │ │   ┌────────────────────────────────────┐mono│   │
        │ │   │ #articleBody                        │    │   │
        │ │   └────────────────────────────────────┘    │   │
        │ │   후보를 콤마로 여러 개 적을 수 있습니다.     │   │
        │ └────────────────────────────────────────────┘   │
```

### ③-B 추가 다이얼로그 — 목록 페이지(HTML) 방식

방식 토글을 "목록 페이지"로 바꾸면 피드 URL 블록이 사라지고 목록 URL + 셀렉터 3종으로 교체된다. 이름·활성 스위치는 방식과 무관하게 같은 자리를 지킨다.

```
        ┌─ Dialog sm:max-w-lg ─────────────────────────────┐
        │ 언론사 추가                                   ✕  │
        │────────────────────────────────────────────────  │
        │ 수집 방식 *                                       │
        │ ┌──────────────────┬──────────────────┐          │
        │ │ ○  RSS 피드      │ ●  목록 페이지    │  Toggle  │
        │ └──────────────────┴──────────────────┘          │
        │ RSS를 제공하지 않는 매체는 목록 페이지를 파싱합니다.│
        │                                                    │
        │ 이름 *                                            │
        │ [ 예: IT조선                                  ]   │
        │                                                    │
        │ 목록 URL *                                        │
        │ [ https://it.chosun.com/news/it             ]mono │
        │ 기사 링크를 수집할 목록 페이지 URL입니다.           │
        │                                                    │
        │ 기사 링크 셀렉터 *          [ 🧪 셀렉터 테스트 ]   │
        │ [ .article-list a.tit                       ]mono │
        │ 목록에서 기사 링크(<a href>)를 가리키는 CSS 셀렉터  │
        │                                                    │
        │ 제목 셀렉터 *                                      │
        │ [ h1.article-title                          ]mono │
        │ 기사 상세 페이지 제목 요소의 CSS 셀렉터입니다.       │
        │                                                    │
        │ 본문 셀렉터 *                                      │
        │ ┌──────────────────────────────────────────┐mono │
        │ │ #article-view-content-div                 │     │
        │ └──────────────────────────────────────────┘     │
        │ 후보를 콤마로 여러 개 적을 수 있습니다.             │
        │                                                    │
        │ ⏻ 등록 즉시 활성화                                 │
        │────────────────────────────────────────────────  │
        │                             [ 취소 ]  [[ 저장 ]]   │
        └────────────────────────────────────────────────────┘
```

### ③-C 소스 테스트 결과

**피드 테스트 성공** — RSS 방식에서 `[ 🧪 피드 테스트 ]` 클릭 후 피드 URL 필드 아래 표시:

```
        │ ┌─ 결과 (Alert) ───────────────────────────────┐ │
        │ │ ✓ 기사 30건 · 요약 평균 412자                 │ │
        │ │  • 삼성전자, 온디바이스 AI 반도체 공개         │ │
        │ │  • 오픈AI 새 언어모델 발표…개발자 생태계 확장  │ │
        │ │  • 엔비디아, 추론 전용 GPU 라인업 확대         │ │
        │ │  … 외 27건                                    │ │
        │ │                                                │ │
        │ │ 요약이 충분히 길어 본문 전문 수집 없이도        │ │
        │ │ 키워드 분석이 가능합니다.                       │ │
        │ └────────────────────────────────────────────────┘ │
```

요약 평균 길이에 따라 마지막 안내 문구가 달라진다. **200자 미만이면** "요약이 짧습니다 — 본문 전문 수집을 켜는 것을 권합니다."로 바뀌고, 이때 본문 전문 수집 스위치에 시각적 주의를 준다. 이 수치가 이 화면에서 사용자가 내려야 할 유일한 판단(전문을 긁을지)의 근거다.

**피드 테스트 실패**:

```
        │ ┌─ 결과 (Alert, destructive) ──────────────────┐ │
        │ │ ✕ 피드를 읽을 수 없습니다                      │ │
        │ │   RSS·Atom 형식이 아니거나 주소가 잘못되었을    │ │
        │ │   수 있습니다. 브라우저에서 이 주소를 열었을 때 │ │
        │ │   XML이 보이는지 확인하세요.                    │ │
        │ └────────────────────────────────────────────────┘ │
```

**셀렉터 테스트 성공** — HTML 방식에서 `[ 🧪 셀렉터 테스트 ]` 클릭 후 기사 링크 셀렉터 필드 아래 표시:

```
        │ ┌─ 결과 (Alert) ───────────────────────────────┐ │
        │ │ ✓ 링크 12개 발견                              │ │
        │ │  • https://it.chosun.com/news/2026081000123   │ │
        │ │  • https://it.chosun.com/news/2026081000119   │ │
        │ │  • https://it.chosun.com/news/2026081000104   │ │
        │ │  … 외 9개                                     │ │
        │ └────────────────────────────────────────────────┘ │
```

**셀렉터 테스트 실패**:

```
        │ ┌─ 결과 (Alert, destructive) ──────────────────┐ │
        │ │ ✕ 0개 발견 — 셀렉터가 목록 페이지와 일치하지    │ │
        │ │   않습니다. 목록 URL과 셀렉터가 실제 페이지     │ │
        │ │   구조와 맞는지 확인하세요.                     │ │
        │ └────────────────────────────────────────────────┘ │
```

### ④ 수정 다이얼로그

추가 다이얼로그와 필드 구성은 동일하고, 다음만 다르다.

```
        ┌─ Dialog sm:max-w-lg ─────────────────────────────┐
        │ 언론사 수정                                   ✕  │
        │ ID와 이름은 크롤링 체크박스 목록과 저장된 기사에서   │
        │ 언론사를 식별하는 데 사용됩니다.                    │
        │────────────────────────────────────────────────  │
        │ ID: etnews (자동 생성 · 변경 불가)                 │
        │                                                    │
        │ 수집 방식 *                                       │
        │ ┌──────────────────┬──────────────────┐          │
        │ │ ●  RSS 피드      │ ○  목록 페이지    │  Toggle  │
        │ └──────────────────┴──────────────────┘          │
        │ ⚠ 방식을 바꾸면 반대쪽 방식의 설정은 저장되지       │
        │   않습니다.                                        │
        │                                                    │
        │ 이름 *                                            │
        │ [ 전자신문                                    ]   │
        │  … (이하 방식별 필드, 기존 값으로 채워짐)           │
        │                                                    │
        │ ⏻ 활성 상태 (현재: 활성)                           │
        │   활성 언론사만 크롤링 체크박스 목록에 표시됩니다.  │
        │────────────────────────────────────────────────  │
        │                             [ 취소 ]  [[ 저장 ]]   │
        └────────────────────────────────────────────────────┘
```

`id`는 언론사 식별자(슬러그)로 체크박스 목록·저장된 실행 결과(`data/runs/{runId}/articles/*.txt`)가 이 값을 참조하므로 폼에서 편집할 수 없는 읽기 전용 값으로만 보여준다.

**수집 방식 변경**은 허용하되, 경고 문구를 토글 바로 아래 `text-xs text-muted-foreground`로 상시 노출한다(수정 모드에서만). Press는 `sourceType`을 판별자로 갖는 분기 타입이라 방식을 바꾸면 반대쪽 필드가 저장되지 않는다 — HTML에서 RSS로 바꾸면 셀렉터 3개가 사라지고, 되돌려도 값은 돌아오지 않는다. 이미 수집된 기사와 실행 결과는 영향을 받지 않는다(`pressId`만 참조하므로).

방식 변경을 별도 확인 다이얼로그로 막지는 않는다. 삭제와 달리 되돌리는 비용이 "셀렉터 3개를 다시 입력"뿐이고, 확인 단계를 넣으면 방식을 고르는 흔한 조작마다 모달이 겹쳐 뜬다.

### ⑤ 삭제 확인 다이얼로그

```
        ┌─ AlertDialog ─────────────────────────────────────┐
        │ 전자신문 언론사를 삭제할까요?                       │
        │                                                     │
        │ 삭제하면 크롤링 실행 페이지의 체크박스 목록에서      │
        │ 즉시 사라집니다. 이미 수집된 기사와 저장된 실행       │
        │ 결과는 삭제되지 않지만, 이 언론사 등록 정보는         │
        │ 되돌릴 수 없습니다.                                  │
        │                                                     │
        │                             [ 취소 ]  [[ 삭제 ]]     │
        └─────────────────────────────────────────────────────┘
```

`[[ 삭제 ]]`(`AlertDialogAction`)는 `bg-destructive`로 시각적 위험을 표시한다. 포커스는 Radix 기본 동작에 따라 `취소` 버튼에 먼저 위치해 실수로 즉시 삭제되는 것을 막는다.

### ⑥ 폼 검증 오류 표시

HTML 방식:

```
        │ 목록 URL *                                        │
        │ [                                            ]   │  ← border-destructive
        │ ⚠ 목록 URL을 입력하세요                            │  ← text-destructive text-xs
        │                                                    │
        │ 기사 링크 셀렉터 *                                 │
        │ [ .article-list                              ]   │  ← border-destructive
        │ ⚠ CSS 셀렉터 형식이 올바르지 않습니다               │  ← text-destructive text-xs
```

RSS 방식:

```
        │ 피드 URL *                                        │
        │ [ etnews.com/rss                             ]   │  ← border-destructive
        │ ⚠ http:// 또는 https:// 로 시작하는 주소를 입력하세요│  ← text-destructive text-xs
        │                                                    │
        │ ┌────────────────────────────────────────────┐   │
        │ │ ⏻ 본문 전문 수집                      [ON] │   │
        │ │   본문 셀렉터 *                              │   │
        │ │   [                                    ]    │   │  ← border-destructive
        │ │   ⚠ 본문 전문 수집을 켜면 본문 셀렉터가       │   │
        │ │     필요합니다                                │   │
        │ └────────────────────────────────────────────┘   │
```

값이 비었거나 형식이 잘못된 입력은 `border-destructive` + `aria-invalid="true"`로 표시하고, 바로 아래 `text-destructive text-xs` 오류 문구를 두어 `aria-describedby`로 입력과 연결한다(마크업만, 실제 검증 로직은 범위 밖).

**검증 규칙은 방식에 종속된다.** RSS를 고른 상태에서 `articleLinkSelector`가 비어 있는 것은 오류가 아니다 — 필드 자체가 화면에 없기 때문이다. 서버 스키마도 같은 규칙을 따른다(zod `discriminatedUnion`이므로 판별자에 맞는 가지만 검증된다). 방식을 전환했을 때 반대쪽 방식에서 남아 있던 오류 표시는 함께 사라져야 한다.

### ⑦ 로딩 (skeleton)

```
│ 이름       │ 소스 URL         │ 수집 설정     │ 활성   │ 관리   │
│────────────┼───────────────────┼───────────────┼────────┼────────│
│ ▒▒▒▒▒▒▒▒▒ │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │ ▒▒▒▒▒▒▒▒▒▒▒▒ │ ▒▒▒▒▒ │ ▒▒▒▒▒ │
│ ▒▒▒▒▒▒▒▒▒ │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │ ▒▒▒▒▒▒▒▒▒▒▒▒ │ ▒▒▒▒▒ │ ▒▒▒▒▒ │
│ ▒▒▒▒▒▒▒▒▒ │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │ ▒▒▒▒▒▒▒▒▒▒▒▒ │ ▒▒▒▒▒ │ ▒▒▒▒▒ │
```

`Skeleton` 컴포넌트로 행 3~4개를 표시하고, 표 전체를 `role="status" aria-live="polite"`로 감싸 `sr-only` 텍스트("언론사 목록을 불러오는 중입니다")를 함께 둔다. 모바일에서는 동일한 형태의 카드 스켈레톤(제목/URL/버튼 자리에 `Skeleton` 바)을 3장 반복한다.

## 사용 컴포넌트

**이미 설치됨** (추가 설치 불필요)
`alert` `badge` `breadcrumb` `button` `card` `input` `navigation-menu` `skeleton` `sonner` `table`

**추가 설치 필요**

```
npx shadcn@latest add @shadcn/dialog @shadcn/alert-dialog @shadcn/switch @shadcn/label @shadcn/textarea @shadcn/toggle-group
```

| 컴포넌트 | 용도 |
|---------|------|
| `dialog` | 언론사 추가/수정 폼 |
| `alert-dialog` | 삭제 확인 |
| `switch` | 활성/비활성 토글, 본문 전문 수집 토글 |
| `label` | 모든 폼 입력 라벨 |
| `textarea` | 본문 셀렉터 입력(여러 후보를 콤마로 적을 여유 공간) |
| `toggle-group` | **수집 방식(RSS / 목록 페이지) 선택** — `type="single"` |

> `badge`는 이미 설치되어 있고 여기서 수집 방식 배지로 쓴다. `toggle-group`은 `03-hot-keyword.md`가 이미 요구하던 컴포넌트라 전체 설치 명령(`docs/screens/README.md`)은 바뀌지 않는다.

**lucide-react 아이콘**: `Plus`(추가) · `Pencil`(수정) · `Trash2`(삭제) · `ChevronRight`/`ChevronDown`(수집 설정 펼침/접힘) · `Info`(안내 Alert) · `Newspaper`(빈 상태 — `EmptyState`의 `icon`) · `FlaskConical`(소스 테스트) · `CircleCheckBig`(테스트 성공) · `CircleX`(테스트 실패) · `Rss`(RSS 방식 배지·토글) · `Globe`(목록 페이지 방식 배지·토글)

아이콘 별칭은 `docs/CONVENTIONS.md` §8의 **신 별칭**으로 통일한다: 성공 표시는 `CircleCheck`가 아니라 **`CircleCheckBig`**, 실패는 **`CircleX`**(`XCircle` 아님), 경고는 **`TriangleAlert`**(`AlertTriangle` 아님), 스피너는 **`LoaderCircle`**(`Loader2` 아님)이다. `TriangleAlert`는 `ErrorAlert` 내부에 이미 들어 있어 목록 조회 실패 표시를 위해 이 화면에서 따로 import하지 않는다.

`empty` 컴포넌트는 `EmptyState`가 내부에서 쓰며 00 셸 설치 목록에 이미 있으므로 이 화면의 추가 설치 명령에 넣지 않는다.

## 접근성

- 모든 입력에 `<Label htmlFor>` 연결(`press-name`, `press-feed-url`, `press-list-url`, `press-link-selector`, `press-title-selector`, `press-content-selector`), 설명문은 `aria-describedby`로 연결(`press-*-desc`).
- **수집 방식 `ToggleGroup`**은 `aria-label="수집 방식"`을 갖고, 각 `ToggleGroupItem`은 아이콘만이 아니라 텍스트 레이블("RSS 피드" / "목록 페이지")을 함께 갖는다. Radix가 `role="radio"`(단일 선택)와 `aria-checked`를 부여하므로 좌우 화살표로 이동한다.
- **방식 전환으로 필드가 교체되는 것**은 시각적으로는 명백하지만 스크린리더에는 조용한 변화다. 방식별 필드 블록을 `role="group"` + `aria-label="RSS 수집 설정"` / `"목록 페이지 수집 설정"`으로 감싸고, 전환 직후 포커스를 새 블록의 첫 입력(`press-feed-url` 또는 `press-list-url`)으로 옮긴다.
- **본문 전문 수집 스위치**는 `aria-controls="press-content-selector-block"` + `aria-expanded`로 조건부로 나타나는 본문 셀렉터 블록을 가리킨다.
- 다이얼로그(`Dialog`/`AlertDialog`)는 Radix 기본 동작으로 `DialogTitle`/`DialogDescription`이 `aria-labelledby`/`aria-describedby`로 자동 연결되고, 열릴 때 포커스 트랩이 걸리며 첫 포커스 가능한 요소로 이동한다. `Esc` 키로 닫히고 닫히면 트리거로 포커스가 복귀한다.
- 아이콘 전용 버튼(수정 ✎, 삭제 🗑, 수집 설정 펼침 ▸)은 반드시 `aria-label`에 언론사명을 포함한다(예: `aria-label="전자신문 수정"`). 여러 행이 동일한 아이콘 버튼을 반복하므로 이름 없이는 스크린리더 사용자가 행을 구분할 수 없다.
- 수집 방식 `Badge`는 아이콘(`Rss`/`Globe`)에 `aria-hidden`을 주고 텍스트("RSS"/"HTML")를 실제 내용으로 남긴다. 배지가 이름 셀 안에 있으므로 스크린리더는 "전자신문 RSS"로 읽는다.
- 활성 스위치는 `aria-label="{name} 활성 상태"`를 갖고, 옆에 "활성"/"비활성" 텍스트를 병기해 색상만으로 상태를 구분하지 않는다.
- 수집 설정 펼침 버튼은 `aria-expanded`와 `aria-controls`로 대상 서브 행(`press-selectors-{id}`)을 가리킨다. 펼칠 내용이 없는 RSS(요약만) 행은 **버튼을 렌더링하지 않으므로** `aria-expanded`를 가진 비어 있는 컨트롤이 생기지 않는다.
- 소스 테스트 결과 영역은 `role="status" aria-live="polite"`로 감싸 결과가 스크린리더에 자동 안내되게 한다. 피드 테스트의 "요약 평균 N자"는 본문 전문 수집 여부를 판단하는 근거이므로 결과 문구 안에 텍스트로 포함한다(색상·아이콘으로만 강약을 주지 않는다).
- 삭제 확인 다이얼로그는 포커스가 기본적으로 `취소`에 위치(Radix `AlertDialogCancel` 기본 동작)해 파괴적 동작을 실수로 실행하지 않도록 한다.
- 폼 검증 오류가 있는 입력은 `aria-invalid="true"` + `aria-describedby`에 오류 메시지 id를 추가한다.
- 로딩 스켈레톤은 `role="status" aria-live="polite"` + `sr-only` 텍스트로 로딩 중임을 알린다.
- 표는 `<caption className="sr-only">등록된 언론사 목록</caption>`으로 목적을 명시한다.

## 마크업 스켈레톤

읽기 편하도록 `PressFormDialog`·`DeletePressDialog`까지 한 블록에 이어 붙였을 뿐, **구현은 위 "5) 컴포넌트 분할 경계" 표대로 파일을 나눈다.**

```tsx
import { Fragment } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Globe,
  Info,
  Newspaper,
  Pencil,
  Plus,
  Rss,
  Trash2,
} from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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

// PRD 데이터 모델(Press)과 1:1 대응하는 분기 타입.
// sourceType이 판별자이며, 서버 zod 스키마도 discriminatedUnion으로 같은 형태를 갖는다.
interface PressBase {
  id: string
  name: string
  isActive: boolean
}

interface RssPressSource extends PressBase {
  sourceType: 'rss'
  feedUrl: string
  /** 있으면 원문 페이지에서 본문 전문을 수집하고, 없으면 피드 요약만 저장한다 */
  contentSelector?: string
}

interface HtmlPressSource extends PressBase {
  sourceType: 'html'
  listUrl: string
  articleLinkSelector: string
  titleSelector: string
  contentSelector: string
}

type PressSource = RssPressSource | HtmlPressSource

/** 목록에서 방식과 무관하게 한 컬럼에 보여줄 대표 URL */
function sourceUrlOf(press: PressSource): string {
  return press.sourceType === 'rss' ? press.feedUrl : press.listUrl
}

/**
 * 수집 설정 컬럼의 펼침 버튼 라벨.
 * null이면 펼칠 내용이 없다는 뜻이므로 버튼 대신 안내 텍스트를 렌더링한다.
 */
function expandLabelOf(press: PressSource): string | null {
  if (press.sourceType === 'html') return '셀렉터 3개'
  return press.contentSelector ? '본문 셀렉터' : null
}

// 형태만 보여주는 더미 데이터 — 방식 3가지 경우를 모두 담는다
const MOCK_PRESS_LIST: PressSource[] = [
  {
    // RSS · 피드 요약만
    id: 'etnews',
    name: '전자신문',
    sourceType: 'rss',
    feedUrl: 'https://rss.etnews.com/Section901.xml',
    isActive: true,
  },
  {
    // RSS · 원문 전문 수집
    id: 'zdnetkorea',
    name: 'ZDNet Korea',
    sourceType: 'rss',
    feedUrl: 'https://zdnet.co.kr/news/news_xml.asp',
    contentSelector: '#articleBody',
    isActive: true,
  },
  {
    // HTML · 목록 페이지 파싱
    id: 'itchosun',
    name: 'IT조선',
    sourceType: 'html',
    listUrl: 'https://it.chosun.com/news/it',
    articleLinkSelector: '.article-list a.tit',
    titleSelector: 'h1.article-title',
    contentSelector: '#article-view-content-div',
    isActive: true,
  },
  {
    id: 'digitaltoday',
    name: '디지털투데이',
    sourceType: 'html',
    listUrl: 'https://www.digitaltoday.co.kr/news/list',
    articleLinkSelector: '.list-titles a',
    titleSelector: 'h3.heading',
    contentSelector: '#article-view-content-div, .article-body',
    isActive: false,
  },
]

// 수집 방식 배지 — 아이콘은 장식이므로 aria-hidden, 텍스트가 실제 내용
function SourceTypeBadge({ sourceType }: { sourceType: PressSource['sourceType'] }) {
  return sourceType === 'rss' ? (
    <Badge variant="secondary" className="gap-1">
      <Rss className="size-3" aria-hidden />
      RSS
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1">
      <Globe className="size-3" aria-hidden />
      HTML
    </Badge>
  )
}

interface PressFormDialogProps {
  mode: 'create' | 'edit'
  press?: PressSource
  trigger: React.ReactNode
}

// 언론사 추가/수정 공용 다이얼로그 — mode에 따라 제목·설명·기본값만 달라진다
function PressFormDialog({ mode, press, trigger }: PressFormDialogProps) {
  const isEdit = mode === 'edit'

  // TODO: 아래 두 값은 상태로 승격해야 한다. 지금은 전달받은 값(또는 기본값)으로 형태만 보여준다.
  const sourceType: PressSource['sourceType'] = press?.sourceType ?? 'rss'
  const isRss = sourceType === 'rss'
  // "본문 전문 수집"은 저장되는 boolean 필드가 아니다. contentSelector를 채울지 비울지를
  // 정하는 UI 장치일 뿐이라 복원도 저장된 플래그가 아닌 contentSelector 유무로 판정한다.
  const collectFullContent = isRss && Boolean(press?.contentSelector)

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '언론사 수정' : '언론사 추가'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'ID와 이름은 크롤링 체크박스 목록과 저장된 기사에서 언론사를 식별하는 데 사용됩니다.'
              : '새 언론사를 등록하면 코드 수정 없이 크롤링 실행 페이지 체크박스 목록에 즉시 추가됩니다.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4">
          {isEdit && press ? (
            <p className="text-xs text-muted-foreground">
              ID: <span className="font-mono">{press.id}</span> (자동 생성 · 변경 불가)
            </p>
          ) : null}

          {/* 수집 방식 — 폼의 첫 번째 입력. 이 값이 아래 필드 블록을 통째로 결정한다 */}
          <div className="space-y-1.5">
            <Label htmlFor="press-source-type">수집 방식 *</Label>
            {/* TODO: 방식 선택 상태 관리 필요 — 변경 시 아래 블록 교체 + 새 블록 첫 입력으로 포커스 이동 */}
            <ToggleGroup
              id="press-source-type"
              type="single"
              value={sourceType}
              aria-label="수집 방식"
              className="grid w-full grid-cols-2"
              onValueChange={() => {}}
            >
              <ToggleGroupItem value="rss" aria-label="RSS 피드">
                <Rss className="size-4" aria-hidden />
                RSS 피드
              </ToggleGroupItem>
              <ToggleGroupItem value="html" aria-label="목록 페이지">
                <Globe className="size-4" aria-hidden />
                목록 페이지
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              {isRss
                ? 'RSS를 제공하는 매체는 피드가 기사 목록을 정확히 주므로 셀렉터를 맞출 필요가 없습니다.'
                : 'RSS를 제공하지 않는 매체는 목록 페이지를 파싱합니다.'}
            </p>
            {isEdit ? (
              <p className="text-xs text-muted-foreground">
                ⚠ 방식을 바꾸면 반대쪽 방식의 설정은 저장되지 않습니다.
              </p>
            ) : null}
          </div>

          {/* 이름 — 방식과 무관하게 같은 자리를 지킨다 */}
          <div className="space-y-1.5">
            <Label htmlFor="press-name">이름 *</Label>
            <Input
              id="press-name"
              name="name"
              placeholder="예: 전자신문"
              defaultValue={press?.name}
              aria-describedby="press-name-desc"
            />
            <p id="press-name-desc" className="text-xs text-muted-foreground">
              언론사 목록과 크롤링 체크박스에 표시될 이름입니다.
            </p>
          </div>

          {isRss ? (
            <div role="group" aria-label="RSS 수집 설정" className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="press-feed-url">피드 URL *</Label>
                  {/* TODO: 피드를 받아 파싱하고 기사 건수·요약 평균 길이·최신 3건을 결과 Alert로 표시 */}
                  <Button type="button" variant="outline" size="sm" onClick={() => {}}>
                    <FlaskConical className="size-3.5" />
                    피드 테스트
                  </Button>
                </div>
                <Input
                  id="press-feed-url"
                  name="feedUrl"
                  className="font-mono"
                  placeholder="https://rss.etnews.com/Section901.xml"
                  defaultValue={press?.sourceType === 'rss' ? press.feedUrl : undefined}
                  aria-describedby="press-feed-url-desc"
                />
                <p id="press-feed-url-desc" className="text-xs text-muted-foreground">
                  RSS 2.0 또는 Atom 피드 주소입니다.
                </p>
              </div>

              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center gap-3">
                  {/* TODO: 본문 전문 수집 토글 상태 관리 필요 */}
                  <Switch
                    id="press-full-content"
                    checked={collectFullContent}
                    aria-controls="press-content-selector-block"
                    aria-expanded={collectFullContent}
                    aria-describedby="press-full-content-desc"
                    onCheckedChange={() => {}}
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="press-full-content">본문 전문 수집</Label>
                    <p
                      id="press-full-content-desc"
                      className="text-xs text-muted-foreground"
                    >
                      끄면 피드의 요약(description)만 저장합니다. 켜면 각 기사 원문
                      페이지를 열어 본문을 가져옵니다 — 정확하지만 느립니다.
                    </p>
                  </div>
                </div>

                {collectFullContent ? (
                  <div id="press-content-selector-block" className="space-y-1.5">
                    <Label htmlFor="press-content-selector">본문 셀렉터 *</Label>
                    <Textarea
                      id="press-content-selector"
                      name="contentSelector"
                      className="font-mono"
                      rows={2}
                      placeholder="#articleBody"
                      defaultValue={press?.contentSelector}
                      aria-describedby="press-content-selector-desc"
                    />
                    <p
                      id="press-content-selector-desc"
                      className="text-xs text-muted-foreground"
                    >
                      후보를 콤마로 여러 개 적을 수 있습니다.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div role="group" aria-label="목록 페이지 수집 설정" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="press-list-url">목록 URL *</Label>
                <Input
                  id="press-list-url"
                  name="listUrl"
                  className="font-mono"
                  placeholder="https://it.chosun.com/news/it"
                  defaultValue={press?.sourceType === 'html' ? press.listUrl : undefined}
                  aria-describedby="press-list-url-desc"
                />
                <p id="press-list-url-desc" className="text-xs text-muted-foreground">
                  기사 링크를 수집할 목록 페이지 URL입니다.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="press-link-selector">기사 링크 셀렉터 *</Label>
                  {/* TODO: 목록 URL을 가져와 이 셀렉터로 찾은 링크 수를 결과 Alert로 표시 (성공/실패) */}
                  <Button type="button" variant="outline" size="sm" onClick={() => {}}>
                    <FlaskConical className="size-3.5" />
                    셀렉터 테스트
                  </Button>
                </div>
                <Input
                  id="press-link-selector"
                  name="articleLinkSelector"
                  className="font-mono"
                  placeholder=".article-list a.tit"
                  defaultValue={
                    press?.sourceType === 'html' ? press.articleLinkSelector : undefined
                  }
                  aria-describedby="press-link-selector-desc"
                />
                <p id="press-link-selector-desc" className="text-xs text-muted-foreground">
                  목록 페이지에서 개별 기사 링크(&lt;a href&gt;)를 가리키는 CSS 셀렉터입니다.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="press-title-selector">제목 셀렉터 *</Label>
                <Input
                  id="press-title-selector"
                  name="titleSelector"
                  className="font-mono"
                  placeholder="h1.article-title"
                  defaultValue={
                    press?.sourceType === 'html' ? press.titleSelector : undefined
                  }
                  aria-describedby="press-title-selector-desc"
                />
                <p id="press-title-selector-desc" className="text-xs text-muted-foreground">
                  기사 상세 페이지에서 제목 텍스트를 담은 요소의 CSS 셀렉터입니다.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="press-content-selector-html">본문 셀렉터 *</Label>
                <Textarea
                  id="press-content-selector-html"
                  name="contentSelector"
                  className="font-mono"
                  rows={2}
                  placeholder="#article-view-content-div"
                  defaultValue={press?.contentSelector}
                  aria-describedby="press-content-selector-html-desc"
                />
                <p
                  id="press-content-selector-html-desc"
                  className="text-xs text-muted-foreground"
                >
                  기사 상세 페이지에서 본문 텍스트를 담은 요소의 CSS 셀렉터입니다. 후보를
                  콤마로 여러 개 적을 수 있습니다.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-md border p-3">
            <Switch
              id="press-active"
              name="isActive"
              defaultChecked={press?.isActive ?? true}
              aria-describedby="press-active-desc"
            />
            <div className="space-y-0.5">
              <Label htmlFor="press-active">
                {isEdit ? '활성 상태' : '등록 즉시 활성화'}
              </Label>
              <p id="press-active-desc" className="text-xs text-muted-foreground">
                활성 언론사만 크롤링 실행 페이지의 체크박스 목록에 표시됩니다.
              </p>
            </div>
          </div>
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => {}}>
              취소
            </Button>
          </DialogClose>
          {/* TODO: 언론사 저장(추가/수정) API 연동 필요 */}
          <Button type="submit" onClick={() => {}}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DeletePressDialogProps {
  press: PressSource
  trigger: React.ReactNode
}

// 언론사 삭제 확인 — 되돌릴 수 없으므로 alert-dialog로 한 단계 더 확인
function DeletePressDialog({ press, trigger }: DeletePressDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{press.name} 언론사를 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            삭제하면 크롤링 실행 페이지의 체크박스 목록에서 즉시 사라집니다. 이미
            수집된 기사와 저장된 실행 결과는 삭제되지 않지만, 이 언론사 등록
            정보는 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {}}>취소</AlertDialogCancel>
          {/* TODO: 언론사 삭제 API 연동 필요 */}
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => {}}
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function PressManagePage() {
  return (
    // <main>·컨테이너·Breadcrumb·h1을 손으로 다시 그리지 않는다.
    // 추가 다이얼로그 트리거는 PageHeader의 action 자리에 넣는다.
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: '홈', href: '/' }, { label: '언론사 관리' }]}
        title="언론사 관리"
        description="크롤링 대상 언론사를 코드 수정 없이 데이터로 등록·관리합니다."
        action={
          <PressFormDialog
            mode="create"
            trigger={
              <Button className="shrink-0">
                <Plus className="size-4" />
                언론사 추가
              </Button>
            }
          />
        }
      />

      <Alert className="mb-6">
        <Info className="size-4" />
        <AlertTitle>변경 사항은 즉시 반영됩니다</AlertTitle>
        <AlertDescription>
          여기서 추가·수정·활성 전환한 언론사는 코드 수정 없이 크롤링 실행
          페이지의 언론사 체크박스 목록에 바로 반영됩니다.
        </AlertDescription>
      </Alert>

      {/* 언론사가 0개면 이 표/카드 영역 전체가 빈 상태(② 참고)로 대체됩니다 */}

      {/* 데스크톱: 표 (md 이상) */}
      <div className="hidden overflow-x-auto rounded-md border md:block">
        <Table>
          <caption className="sr-only">등록된 언론사 목록</caption>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>소스 URL</TableHead>
              <TableHead>수집 설정</TableHead>
              <TableHead>활성</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_PRESS_LIST.map((press) => {
              const expandLabel = expandLabelOf(press)

              return (
              <Fragment key={press.id}>
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {press.name}
                      <SourceTypeBadge sourceType={press.sourceType} />
                    </div>
                  </TableCell>
                  <TableCell
                    className="max-w-56 truncate font-mono text-xs text-muted-foreground"
                    title={sourceUrlOf(press)}
                  >
                    {sourceUrlOf(press)}
                  </TableCell>
                  <TableCell>
                    {expandLabel ? (
                      /* TODO: 펼침/접힘 상태 관리 필요 — 펼치면 ChevronDown + 아래 서브 행 노출 */
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        aria-expanded={false}
                        aria-controls={`press-selectors-${press.id}`}
                        onClick={() => {}}
                      >
                        {expandLabel}
                        <ChevronRight className="size-3.5" />
                      </Button>
                    ) : (
                      // 펼칠 내용이 없으므로 버튼으로 만들지 않는다
                      <span className="text-xs text-muted-foreground">피드 요약만</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        defaultChecked={press.isActive}
                        aria-label={`${press.name} 활성 상태`}
                        onCheckedChange={() => {}}
                      />
                      <span className="text-xs text-muted-foreground">
                        {press.isActive ? '활성' : '비활성'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <PressFormDialog
                        mode="edit"
                        press={press}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${press.name} 수정`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                      <DeletePressDialog
                        press={press}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${press.name} 삭제`}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
                {/* 수집 설정 펼침 서브 행 — 기본은 숨김, 위 버튼 클릭 시 노출(상태 관리는 로직 단계에서).
                    펼칠 내용이 없는 RSS(요약만) 행은 서브 행 자체를 만들지 않는다 */}
                {expandLabel ? (
                  <TableRow id={`press-selectors-${press.id}`} className="hidden">
                    <TableCell colSpan={5} className="bg-muted/40">
                      {press.sourceType === 'html' ? (
                        <dl className="grid gap-2 text-xs sm:grid-cols-3">
                          <div>
                            <dt className="text-muted-foreground">기사 링크</dt>
                            <dd className="font-mono">{press.articleLinkSelector}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">제목</dt>
                            <dd className="font-mono">{press.titleSelector}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">본문</dt>
                            <dd className="font-mono">{press.contentSelector}</dd>
                          </div>
                        </dl>
                      ) : (
                        <dl className="grid gap-2 text-xs sm:grid-cols-2">
                          <div>
                            <dt className="text-muted-foreground">본문 셀렉터</dt>
                            <dd className="font-mono">{press.contentSelector}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">본문 출처</dt>
                            <dd>원문 전문 (피드 요약 대신 원문 페이지에서 수집)</dd>
                          </div>
                        </dl>
                      )}
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* 모바일: 카드 리스트 (md 미만) */}
      <div className="grid gap-3 md:hidden">
        {MOCK_PRESS_LIST.map((press) => (
          <Card key={press.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="flex items-center gap-2 font-medium">
                {press.name}
                <SourceTypeBadge sourceType={press.sourceType} />
              </h2>
              <div className="flex items-center gap-2">
                <Switch
                  defaultChecked={press.isActive}
                  aria-label={`${press.name} 활성 상태`}
                  onCheckedChange={() => {}}
                />
                <span className="text-xs text-muted-foreground">
                  {press.isActive ? '활성' : '비활성'}
                </span>
              </div>
            </div>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
              {sourceUrlOf(press)}
            </p>
            {expandLabelOf(press) ? (
              /* TODO: 펼침/접힘 상태 관리 필요 */
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => {}}
              >
                {expandLabelOf(press)} 보기
                <ChevronRight className="size-3.5" />
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">피드 요약만</p>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <PressFormDialog
                mode="edit"
                press={press}
                trigger={
                  <Button variant="outline" size="sm">
                    <Pencil className="size-3.5" />
                    수정
                  </Button>
                }
              />
              <DeletePressDialog
                press={press}
                trigger={
                  <Button variant="outline" size="sm">
                    <Trash2 className="size-3.5 text-destructive" />
                    삭제
                  </Button>
                }
              />
            </div>
          </Card>
        ))}
      </div>

      {/* 빈 상태(② 참고) 마크업 예시 — 위 표/카드 영역을 대체.
          공통 EmptyState를 호출한다. py-16 text-center 블록을 다시 그리지 않는다.
          주 버튼이 페이지 이동이 아니라 다이얼로그 트리거라 actionLabel 대신
          PressFormDialog를 바로 아래에 배치한다. */}
      {/*
      <div className="flex flex-col items-center gap-3">
        <EmptyState
          icon={<Newspaper />}
          title="등록된 언론사가 없습니다"
          description="크롤링을 시작하려면 먼저 언론사를 추가하세요."
        />
        <PressFormDialog
          mode="create"
          trigger={
            <Button>
              <Plus className="size-4" />
              언론사 추가
            </Button>
          }
        />
      </div>
      */}
    </PageContainer>
  )
}
```
