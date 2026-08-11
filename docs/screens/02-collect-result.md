# 02. 수집 결과 페이지

## 개요

| 항목 | 내용 |
|------|------|
| 역할 | 크롤링으로 저장된 txt 결과를 실행(run) 단위로 확인하는 페이지 |
| 구현 기능 ID | F003(수집 기사 txt 저장 결과 노출), F004(수집 결과 목록/조회) |
| 진입 경로 | 크롤링 실행 페이지에서 크롤링 완료 후 이동 / 상단 헤더 메뉴 "수집 결과" 클릭 |
| 다음 이동 | 실행 요약 카드의 **[키워드 분석]** 버튼 → 핫 키워드 분석 페이지(선택된 `runId` 유지) |

사용자는 ① 실행(run) 목록에서 확인하고 싶은 실행을 고르고 → ② 그 실행에 저장된 기사 txt 파일 목록을 훑어보고 → ③ 파일을 선택해 본문을 미리 본다. 이 3단 흐름이 화면의 핵심 정보 구조다.

---

## 정보 구조 결정 근거 (3단 구조 → 화면 배치)

| 검토한 방식 | 채택 여부 | 이유 |
|------|------|------|
| **상단 Select로 실행 전환 + 하단 `lg:` 2단 그리드(파일 목록 · 미리보기)** | **채택** | 실행(run)은 크롤링을 돌릴 때마다 계속 쌓이는 "기록"이라 목록형보다 드롭다운으로 가볍게 전환하는 편이 적합하다. 선택된 실행의 상세는 별도 요약 카드로 분리해 "무엇을 보고 있는지"를 항상 눈에 띄게 유지한다. 파일 목록과 본문은 동시에 참조할 일이 많아(파일을 훑으며 본문을 바꿔 보는 탐색 패턴) 이메일 클라이언트·코드 에디터에서 검증된 좌-우 마스터-디테일을 데스크톱(`lg:` 이상)에 적용한다. |
| 모바일에서 목록·미리보기를 **Tabs로 전환** | 검토 후 제외 | 파일 목록 자체가 `ScrollArea`로 높이가 제한돼 있어(최대 `28rem`) 목록 아래로 미리보기 카드까지 스크롤 거리가 과하지 않다. 정적 마크업 단계에서 탭 상태 전환 로직까지 끌어들이기보다, 세로 스택만으로 동일한 사용성을 낼 수 있어 더 단순한 방식을 택했다. |
| **Resizable** 패널로 목록·미리보기 폭을 사용자가 조절 | 검토 후 제외 | 로컬 1인 개발자용 MVP 테스트 도구 범위에서는 과한 엔지니어링이다. 고정 그리드(`lg:grid-cols-[360px_1fr]`)로 충분하고, 추후 필요해지면 `resizable` 컴포넌트로 교체할 수 있다. |
| 실행 목록도 좌측 사이드바 리스트로 상시 노출(3단 컬럼) | 검토 후 제외 | 화면 폭이 `max-w-6xl`인 상황에서 3개 컬럼(실행 목록 · 파일 목록 · 미리보기)을 동시에 배치하면 각 컬럼이 좁아져 제목·본문 가독성이 떨어진다. 실행은 파일 목록만큼 자주 전환하지 않으므로 드롭다운으로 압축하는 편이 낫다. |
| 파일 목록에 검색 Input 추가 | 채택 | 실행 1회당 기사가 수십~수백 건일 수 있어(언론사 여러 곳 × 기사 다건) 파일명/제목 검색 없이는 원하는 기사를 찾기 어렵다. |
| 개별 txt **다운로드** / OS **폴더 열기** 버튼 | 검토 후 제외 | PRD의 F004 범위(목록·본문 조회)에 없고, "폴더 열기"는 웹 브라우저에서 OS 파일 탐색기를 직접 열 수 없어 구현 자체가 불가능하다(Electron 등 데스크톱 셸이 아님). 대신 실행 요약 카드에 저장 경로(`font-mono text-xs`)를 그대로 노출해, 로컬에서 직접 크롤러를 돌리는 사용자가 파일 탐색기로 찾아갈 수 있게 한다. |

---

## 카테고리 확장 (21일차 신규 기능, Task 028)

`docs/ROADMAP.md`에 없는 신규 기능이다. 저장소 계층(Task 026)이 `GET /api/runs/{runId}/articles`에
반복 파라미터 `category`(미지정 = 전체)와 응답의 `uncategorizedCount`(카테고리 필터로 제외된 "카테고리
미상" 기사 수)를 확정했고, 이 화면은 그 계약을 아래처럼 쓴다.

- **④ 기사 파일 목록에 카테고리 필터가 붙는다.** `components/results/article-file-list.tsx`의 검색
  Input 아래에 `components/common/category-filter.tsx`(`ToggleGroup type="multiple"`, 라벨은
  `PRESS_CATEGORY_LABELS`)를 두고, 값이 바뀌면 `fetchRunArticles(runId, query, categories)`를 다시
  불러 목록을 좁힌다.
- **"카테고리 미상 N건은 제외했습니다" 안내(팀장 판정).** 카테고리 필터가 걸리면 값이 없는 과거
  기사는 제외되는데, Task 027(크롤 파이프라인)이 값을 채우기 전에 저장된 기사는 전부 미상이라
  **필터를 걸면 결과가 0건일 수 있다.** 빈 상태를 그냥 "결과 없음"으로 두면 필터가 고장났다고
  읽히므로, `categories.length > 0 && uncategorizedCount > 0`일 때 목록 카드 안에
  `카테고리 미상 {N}건은 제외했습니다.` 문구(`text-xs text-muted-foreground`)를 띄운다.
- **③ 실행 요약 카드에 진짜 "대상 카테고리" 행이 생겼다(21일차 후속).** 저장소 계층이
  `RunSummary.targetCategories: PressCategory[]`를 내려주기 시작했다 — `CrawlRun.targetCategories`
  (크롤 파이프라인 Task 027, 실행 시작 당시의 카테고리 스냅샷)를 그대로 통과시킨 값이다. 이 dl
  행은 `summary.targetCategories`를 그대로 배지로 그리고, **빈 배열이면 행 자체를 렌더링하지
  않는다** — 빈 배열은 "언론사를 카테고리가 아니라 개별 선택했다"와 "이 필드가 생기기 전 과거
  run이다" 두 경우를 구분 없이 가리키는 같은 사실("카테고리 스냅샷 없음")이라, "전체"나 5종
  나열처럼 값을 지어내지 않는다(아래 "카테고리 필터"가 예전에 겪은 것과 같은 오류를 반복하지
  않는다).
- **"카테고리 필터" 행은 그대로 남지만, dl 밖으로 물리적으로 뗐다.** 실행 요약 dl(실행 시각·대상
  언론사·대상 카테고리·수집 결과·저장 경로)과 한 줄에 섞여 있으면 새로 생긴 "대상 카테고리"와
  라벨이 너무 비슷해 헷갈린다(21일차 팀장 지적). `Separator` 아래 별도 구획으로 떼고,
  "(아래 기사 목록에 지금 적용된 값)"이라는 보조 문구와 `Filter` 아이콘으로 "이건 실행의 고정된
  속성이 아니라 지금 사용자가 조작 중인 화면 상태다"를 명시한다. 값은 여전히
  `app/results/page.tsx`가 쥔 카테고리 필터 state의 echo이고, `RunSummaryCard`·`ArticleFileList`가
  그 state를 공유한다(`selectedArticleId`와 같은 이유). 빈 배열이면 `Badge`로 "전체" 하나만
  보여준다 — 이 행은 필터 UI의 echo이므로 "미지정 = 전체"라는 필터 자체의 규칙을 그대로 따르는
  것이 맞고, 위 "대상 카테고리"처럼 값을 감추지 않는다(성격이 다른 두 빈 배열이라 같은 규칙을
  적용하지 않는다).
- 실행(run)을 바꾸면 카테고리 필터도 검색어·선택 기사와 함께 초기화된다.

---

## 검색어 하이라이트 · 목록 스크롤 (22일차 신규, Task 029)

`docs/ROADMAP.md`에 없는 신규 요청이다. 사용자가 검색 Input에 입력한 값을 ④ 기사 파일
목록(제목 열)과 ⑤ 본문 미리보기(제목·본문) 양쪽에서 일치 구간만 노란색으로 강조하고,
④의 목록이 길 때 마우스 휠·스크롤바 양쪽으로 끝까지 스크롤되게 고쳤다.

- **검색어와 일치하는 구간만 `<mark>`로 감싼다.** `lib/highlight.ts`의 `splitByMatch`가
  대소문자 무시·정규식 특수문자 이스케이프까지 처리한 뒤 텍스트를 일치/비일치 구간 배열로
  쪼개고, `components/results/highlighted-text.tsx`(`<HighlightedText text query>`)가 그
  결과를 React 노드로만 옮긴다. `dangerouslySetInnerHTML`은 쓰지 않는다 — 기사 제목·본문이
  외부 사이트에서 긁어온 문자열이라 그대로 이어 붙이면 XSS 경로가 된다. 검색 대상은
  파일명·제목이라(§정보 구조 결정 근거) 본문에 검색어가 없으면 본문 쪽은 강조되지 않는
  것이 정상이다.
- **강조 색은 하드코딩하지 않고 토큰으로 뺐다.** 사용자는 "노란색"을 요청했지만
  `docs/CONVENTIONS.md` §8이 하드코딩 색상을 금지해, `app/globals.css`에
  `--highlight`/`--highlight-foreground`(라이트: 또렷한 노랑 + 어두운 글자, 다크: 채도를
  낮춘 골드 톤 + 어두운 글자 — 다크에서 눈부시지 않도록)를 새로 두고
  `bg-highlight text-highlight-foreground` 클래스만 쓴다.
- **검색어 상태가 `article-file-list.tsx`에서 `app/results/page.tsx`로 올라갔다.**
  `article-preview.tsx`도 같은 값으로 제목·본문을 강조해야 해서, `selectedArticleId`·
  `categories`와 같은 이유(D-006 패턴)로 페이지가 쥐고 두 컴포넌트에 `query`/
  `onQueryChange`로 내려준다. 서버로 나가는 디바운스된 검색어(`debouncedQuery`)는
  기존대로 `article-file-list.tsx` 내부에 남는다 — 하이라이트는 타이핑 즉시 반응해야
  하므로 디바운스 전 값을 쓴다.
- **④ 목록에는 자체 스크롤을 두지 않는다. 페이지 스크롤 하나만 쓴다(22일차 후속, I-059).**
  처음에는 `max-h-[28rem]` + 내부 `ScrollArea`로 만들었고 스크롤 자체는 동작했다. 그런데
  **실사용에서 더 나쁜 함정이 드러났다.** ④ 카드는 ②실행 선택·③요약 카드 아래에 놓여
  화면 최상단 기준 **677px 지점에서 시작**한다. 창 높이가 900px이면 목록의 스크롤 영역은
  **61px만 보인다.** 그 상태에서 휠을 굴리면 페이지가 아니라 **안쪽 목록이 먼저 스크롤되고**,
  기사 500건이면 안쪽 콘텐츠가 19,000px이라 그것을 다 지나야 페이지가 움직인다 —
  사용자에게는 "스크롤이 안 내려가서 아래 파일을 클릭할 수 없다"로 나타난다.

  **중첩 스크롤 컨테이너를 없애는 것이 유일하게 안정적인 해법이다.** 목록은 내용만큼 자라고
  페이지가 스크롤된다. 브라우저 스크롤바가 실제 위치를 그대로 보여주고 드래그·`PageDown`·
  `End`가 전부 기대대로 동작한다. 목록이 길어지는 대가는 ⑤ 미리보기를 `lg:sticky lg:top-20`
  으로 붙여 상쇄한다(`crawl-run-panel.tsx`가 같은 이유로 쓰는 관용구) — 아래쪽 파일을 골라도
  본문이 화면에 남아 있다.

  **교훈**: 세로로 쌓인 카드들 **아래에** 놓인 영역에 자체 스크롤을 주면, 그 영역에 닿기 위해
  페이지를 스크롤해야 하는 구간에서 휠이 안쪽에 붙잡힌다. 화면에 스크롤 컨테이너를 하나 더
  들이기 전에 **"사용자가 이 영역에 닿으려면 먼저 페이지를 스크롤해야 하는가"**를 확인한다.

---

## 화면 구성

| 영역 | 목적 |
|------|------|
| ① 페이지 헤더 | Breadcrumb + 제목 + 설명 (공통 규격) |
| ② 실행 선택 | 확인할 실행(run)을 드롭다운으로 전환, 총 실행 건수 표시 |
| ③ 실행 요약 카드 | 선택된 실행의 시각·소요시간·대상 언론사·성공/실패 건수·저장 경로 + **[키워드 분석]** 버튼 |
| ④ 기사 파일 목록 | 검색 Input + 파일명/언론사/제목/수집시각 목록(데스크톱 표 · 모바일 카드), 스크롤 |
| ⑤ 본문 미리보기 | 선택한 파일의 제목·원문 링크·언론사·**본문 출처**·수집시각 메타 + txt 본문(스크롤) |

---

## 와이어프레임 — 데스크톱 (≥1024px)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [헤더 — 00-app-shell.md 참고] 크롤링 실행 · 수집 결과 · 핫 키워드 분석 · 언론사 관리 · 불용어 관리 │
├──────────────────────────────────────────────────────────────────────────────────┤
│  홈 › 수집 결과                                                                     │
│  수집 결과                                                                          │
│  크롤링으로 저장된 기사 txt 결과를 실행(run) 단위로 확인합니다.                          │
│                                                                                      │
│  실행 선택  [ 2026-08-10 14:32 · 언론사 3 · 성공 42 · 실패 2            ▼ ]  총 2건    │
│                                                                                      │
│ ┌──────────────────────────────────────────────────────────────────────────────┐   │
│ │ 실행 요약                                                                       │   │
│ │ 🕐 실행 시각   2026-08-10 14:32:05 → 14:38:41  (소요 6분 36초)                   │   │
│ │ 📰 대상 언론사  [조선일보] [한겨레] [전자신문]                                     │   │
│ │    수집 결과   성공 42건 · 실패 2건                                              │   │
│ │    저장 경로   data/runs/20260810-143205/articles/                              │   │
│ │                                                            [[ 🔥 키워드 분석 ]] │   │
│ └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│ ┌───────────────────────────────────┐  ┌───────────────────────────────────────┐   │
│ │ 기사 파일 (3)                       │  │ 삼성전자, HBM4 메모리 양산 돌입        🔗 │   │
│ │ [🔍 파일명 · 제목 검색            ] │  │ [조선일보]  2026-08-10 14:33:10 수집     │   │
│ │ ┌────┬────────┬───────────┬──────┐│  │ ─────────────────────────────────────── │   │
│ │ │파일 │언론사   │제목        │시각  ││  │ 삼성전자가 차세대 HBM4 메모리 양산에      │   │
│ │ ├────┼────────┼───────────┼──────┤│  │ 돌입했다고 10일 밝혔다. 이번 양산은…      │   │
│ │ │0001│조선일보 │삼성전자,…  │14:33 │▶│ │ (본문 미리보기, whitespace-pre-wrap,     │   │
│ │ │0002│한겨레   │카카오, …   │14:34 ││  │  세로 스크롤)                            │   │
│ │ │0003│전자신문 │SK하이닉스… │14:35 ││  │ …                                       │   │
│ │ └────┴────────┴───────────┴──────┘│  │                                          │   │
│ │        (ScrollArea, 세로 스크롤)     │  │                                          │   │
│ └───────────────────────────────────┘  └───────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

`▶` = 현재 선택된 행(`aria-selected="true"`, `bg-muted`). 좌측 파일 목록(`360px` 고정)과 우측 미리보기(가변폭)는 `lg:grid-cols-[360px_1fr]`로 배치한다.

---

## 와이어프레임 — 모바일 (<640px)

```
┌───────────────────────────┐
│ [헤더 — 햄버거로 축약]        │
├───────────────────────────┤
│ 홈 › 수집 결과               │
│ 수집 결과                    │
│ 크롤링으로 저장된 기사 txt…    │
│                             │
│ 실행 선택                    │
│ [ 2026-08-10 14:32     ▼ ] │
│                             │
│ ┌─────────────────────────┐│
│ │ 실행 요약                 ││
│ │ 🕐 14:32 → 14:38 (6분 36초)││
│ │ 📰 [조선일보][한겨레][전자신문]││
│ │    성공 42건 · 실패 2건     ││
│ │    data/runs/20260810…/  ││
│ └─────────────────────────┘│
│ [[    🔥 키워드 분석    ]]   │
│                             │
│ ┌─────────────────────────┐│
│ │ 기사 파일 (3)              ││
│ │ [🔍 파일명 · 제목 검색   ] ││
│ │ ┌─────────────────────┐ ││
│ │ │▶0001 [조선일보]        │ ││ ← 선택됨(bg-muted)
│ │ │ 삼성전자, HBM4…        │ ││
│ │ │ 14:33                 │ ││
│ │ ├─────────────────────┤ ││
│ │ │ 0002 [한겨레]          │ ││
│ │ │ 카카오, …              │ ││
│ │ │ 14:34                 │ ││
│ │ │  ⋮ (세로 스크롤)        │ ││
│ │ └─────────────────────┘ ││
│ └─────────────────────────┘│
│                             │
│ ┌─────────────────────────┐│
│ │ 삼성전자, HBM4 메모리…  🔗 ││
│ │ [조선일보]  14:33:10 수집  ││
│ │ ───────────────────────  ││
│ │ 삼성전자가 차세대 HBM4… ││
│ │ (본문 미리보기, 세로 스크롤) ││
│ └─────────────────────────┘│
└───────────────────────────┘
```

모바일은 목록(④)과 미리보기(⑤)를 좌우가 아닌 **위-아래로 스택**한다. 목록이 `ScrollArea`로 높이가 제한돼 있어 미리보기까지 스크롤이 과하지 않다(정보 구조 결정 근거 표 참고).

---

## 영역별 컴포넌트 명세

| 영역 | UI 컴포넌트 | Tailwind 클래스 | 비고 |
|------|------------|-----------------|------|
| 본문 컨테이너 | `PageContainer` (`components/common/page-container.tsx`) | 컴포넌트가 `<main className="flex-1">` + `container mx-auto max-w-6xl px-4 py-6 md:py-8`을 제공 | **이 마크업을 페이지에서 다시 쓰지 않는다.** `<main>`이 여기 있어야 `app/layout.tsx`의 `flex min-h-full flex-col` 아래에서 셸 레이아웃이 성립한다 |
| ① 페이지 헤더 | `PageHeader` (`components/common/page-header.tsx`) | 컴포넌트 내부에 `mb-6`, `text-2xl font-semibold tracking-tight md:text-3xl`, `text-sm text-muted-foreground mt-1` | `breadcrumbs`/`title`/`description` prop만 넘긴다. Breadcrumb 링크는 컴포넌트가 `BreadcrumbLink asChild` + `next/link`로 처리하므로 raw `href`를 쓰지 않는다 |
| ② 실행 선택 | `Label`, `Select`/`SelectTrigger`/`SelectContent`/`SelectItem` | `flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between` | `defaultValue`로 최신 실행을 기본 선택(정적 마크업이므로 uncontrolled) |
| ③ 실행 요약 카드 | `Card`/`CardHeader`/`CardTitle`/`CardAction`/`CardContent`, `Badge`, `Button` | `grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2` | 저장 경로 `font-mono text-xs`, 실패 건수 `text-destructive`(실패 0건이면 기본색) |

**「수집 결과」 항목에 `skippedCount`를 함께 쓴다** — `skippedCount > 0`일 때만 `성공 53건 · 실패 0건 · 41건 미수집`처럼 보조 문구를 덧붙인다. 중단으로 요청조차 하지 않은 기사 수이며 **"실패"라는 낱말을 쓰지 않는다**(D-029). 화면 01이 §⑧에서 이미 같은 표현을 쓰므로 문구를 그대로 맞춘다(D-030). `text-destructive`를 주지 않는다 — 오류가 아니다. `skippedCount === 0`이면 이 문구 자체를 렌더하지 않는다(I-023).
| ④ 기사 파일 목록 | `Card`, `Label`+`Input`(검색), `ScrollArea`, `Table` 계열(데스크톱), `ul/li/button`(모바일), `Badge`, `HighlightedText`(제목 열) | 데스크톱 `hidden max-h-[28rem] grid-rows-[minmax(0,1fr)] lg:grid`로 감싼 `div` 안에 `ScrollArea` `min-h-0`, 모바일은 `lg:hidden`으로 뒤집은 같은 조합 | 선택 행에 `aria-selected` + `bg-muted`. 스크롤 확정 이유·grid를 쓴 이유는 위 "검색어 하이라이트 · 목록 스크롤(Task 029)" 참고 |
| ⑤ 본문 미리보기 | `Card`, `Separator`, `ScrollArea`, `Button`(icon, 외부 링크), `HighlightedText`(제목·본문) | `whitespace-pre-wrap font-mono text-sm leading-relaxed` | 컨테이너에 `aria-live="polite"`. `whitespace-pre-wrap` 전제는 아래 "본문 개행 보존 전제" 참고. 제목·본문의 검색어 일치 구간은 `bg-highlight text-highlight-foreground` 토큰의 `<mark>`로 강조(Task 029) |
| 빈 상태(실행 이력 0건 / 파일 미선택) | `EmptyState` (`components/common/empty-state.tsx`) | 컴포넌트 내부(`Empty` 프리미티브) | 00-app-shell.md가 정한 01~05 공용 빈 상태 블록. 같은 마크업을 이 화면에서 다시 그리지 않는다 |
| 실패 알림 | `ErrorAlert` (`components/common/error-alert.tsx`) | — | 내부가 `Alert variant="destructive"` + `TriangleAlert` + `AlertTitle` + `AlertDescription`이다 |
| [키워드 분석] 버튼 | `Button asChild` + `next/link` | `CardAction` 슬롯에 배치 | 선택된 `runId`를 쿼리 파라미터로 유지한 채 `/keywords`로 이동. 내부 이동이므로 raw `<a href="/...">`를 쓰지 않는다(`@next/next/no-html-link-for-pages` **error**) |

### 본문 개행 보존 전제 (⑤ 미리보기)

이 화면이 `whitespace-pre-wrap`으로 보여주려는 **문단 구분은 수집 단계에서 만들어져야 한다.**

- `lib/crawler/parse.ts:15`의 `selectText`는 `.replace(/\s+/g, ' ')`로 모든 공백을 한 칸으로 접는다. 이 함수로 본문을 뽑으면 개행이 남지 않아, 화면에서 `whitespace-pre-wrap`을 줘도 보여줄 문단 구분이 애초에 없다.
- 따라서 **`selectText`는 제목에만 쓰고, 본문은 `lib/crawler/article-parser.ts`가 문단 개행을 보존해 추출한다.** 이 규칙은 `docs/ROADMAP.md` Task 013(언론사 단위 크롤 오케스트레이터)의 구현 규칙이며, 이 화면의 요구가 그 규칙에 걸려 있다.
- 기사 txt는 메타 라인 + 빈 줄 + 본문 구조(Task 007)이므로, 미리보기에 넣는 문자열은 **본문 영역만 잘라낸 것**이다. 메타 라인(`# id:` 등)을 그대로 뿌리지 않는다.

---

## 상태별 화면

### ① 기본

위 데스크톱/모바일 와이어프레임 참고. 실행이 선택돼 있고, 파일 목록과 본문 미리보기가 모두 채워진 상태.

### ② 실행 이력 0건 (빈 상태)

아직 한 번도 크롤링을 실행하지 않아 `data/runs/`가 비어 있는 경우. 실행 선택·요약 카드·파일 목록·미리보기를 모두 감추고, 페이지 헤더 아래에 공통 `EmptyState` 하나만 표시한다.

```
│  홈 › 수집 결과                                        │
│  수집 결과                                              │
│  크롤링으로 저장된 기사 txt 결과를 확인합니다.               │
│                                                        │
│        ┌──────────────────────────────┐               │
│        │            📭                │               │
│        │   아직 크롤링한 결과가 없습니다   │               │
│        │                                │               │
│        │   [[ 크롤링 실행하러 가기 ]]      │               │
│        └──────────────────────────────┘               │
```

```tsx
import { Inbox } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'

// 00-app-shell.md가 01~05 공용으로 정한 빈 상태 블록을 그대로 호출한다.
// 테두리·아이콘·정렬 마크업을 이 화면에서 다시 만들지 않는다.
// actionHref를 주면 컴포넌트가 Button asChild + next/link로 렌더하므로
// raw <a href="/">를 쓸 일이 없다(@next/next/no-html-link-for-pages error 회피).
<EmptyState
  icon={<Inbox />}
  title="아직 크롤링한 결과가 없습니다"
  description="크롤링 실행 화면에서 언론사를 선택해 첫 수집을 시작하세요"
  actionLabel="크롤링 실행하러 가기"
  actionHref="/"
/>
```

### ③ 파일 미선택 상태

실행은 선택돼 있고 파일 목록도 채워져 있지만, 아직 어떤 파일도 클릭하지 않은 초기 진입 상태. 목록에는 선택 표시(`▶`/`bg-muted`)가 없고, 미리보기 영역(⑤)만 안내 문구로 대체된다.

```
│ ┌───────────────────────────────────┐  ┌───────────────────────────────────────┐│
│ │ 기사 파일 (3)                       │  │                                       ││
│ │ [🔍 파일명 · 제목 검색            ] │  │              🗂                       ││
│ │  0001 조선일보  삼성전자,…   14:33  │  │     파일을 선택하면                     ││
│ │  0002 한겨레   카카오, …    14:34  │  │     본문을 미리 볼 수 있습니다             ││
│ │  0003 전자신문  SK하이닉스… 14:35  │  │                                       ││
│ └───────────────────────────────────┘  └───────────────────────────────────────┘│
```

```tsx
import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'

// 여기도 같은 공용 EmptyState를 쓴다. 액션 버튼이 없는 안내형이라 actionLabel을 넘기지 않는다.
// Empty 프리미티브가 flex-1로 부모를 채우므로, 미리보기 카드의 높이(h-[28rem])는
// 바깥 래퍼에서 준다(목록과 미리보기의 높이가 어긋나지 않게).
<div className="flex h-[28rem]">
  <EmptyState
    icon={<FileText />}
    title="파일을 선택하면 본문을 미리 볼 수 있습니다"
    description="왼쪽 기사 파일 목록에서 확인할 기사를 고르세요"
  />
</div>
```

### ④ 로딩 (skeleton)

실행 목록/요약/파일 목록/미리보기를 서버에서 불러오는 동안 전 영역에 `Skeleton`을 표시한다.

```
│ 실행 선택  [ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ▼ ]                                       │
│ ┌──────────────────────────────────────────────────────────────────────────────┐   │
│ │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │   │
│ │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                                     │   │
│ └──────────────────────────────────────────────────────────────────────────────┘   │
│ ┌───────────────────────────────────┐  ┌───────────────────────────────────────┐   │
│ │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │  │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │   │
│ │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒              │  │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒            │   │
│ └───────────────────────────────────┘  └───────────────────────────────────────┘   │
```

```tsx
<div className="space-y-6" aria-busy="true" aria-label="수집 결과 불러오는 중">
  <Skeleton className="h-8 w-[340px]" />
  <Skeleton className="h-32 w-full" />
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
    <Skeleton className="h-[28rem] w-full" />
    <Skeleton className="h-[28rem] w-full" />
  </div>
</div>
```

### ⑤ 일부 기사 수집 실패한 run

성공/실패가 섞인 실행을 선택한 경우. 실행 요약 카드의 실패 건수를 `text-destructive font-medium`으로 강조하고, 카드 아래 공통 `ErrorAlert`(`components/common/error-alert.tsx`)로 한 번 더 안내한다. 실패한 기사는 파일 목록에 애초에 저장되지 않으므로(F003 저장 대상은 성공한 기사만) 목록 자체는 성공 건수만큼만 표시된다.

```
│ ┌──────────────────────────────────────────────────────────────────────────────┐   │
│ │ 실행 요약                                                                       │   │
│ │ 🕐 실행 시각   2026-08-10 09:00:00 → 09:04:12  (소요 4분 12초)                   │   │
│ │ 📰 대상 언론사  [조선일보] [한겨레]                                               │   │
│ │    수집 결과   성공 18건 · 실패 6건 ← text-destructive                          │   │
│ │    저장 경로   data/runs/20260810-090000/articles/                              │   │
│ │                                                            [[ 🔥 키워드 분석 ]] │   │
│ └──────────────────────────────────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────────────────────────────────┐   │
│ │ ⚠ 6건의 기사 수집에 실패했습니다. 실패한 기사는 목록에 표시되지 않습니다.              │   │
│ └──────────────────────────────────────────────────────────────────────────────┘   │
```

```tsx
import { ErrorAlert } from '@/components/common/error-alert'

// Alert + TriangleAlert 마크업을 다시 그리지 않고 공통 ErrorAlert를 호출한다.
// 아이콘(TriangleAlert)과 variant="destructive", role="alert"은 컴포넌트가 이미 갖고 있다.
<ErrorAlert
  title="일부 기사 수집에 실패했습니다"
  description="실패한 기사는 목록에 표시되지 않습니다. 반복적으로 실패한다면 언론사 관리 페이지에서 해당 언론사의 수집 설정(RSS는 피드 URL, HTML은 셀렉터)을 확인하세요."
/>
```

---

## 사용 컴포넌트

### 공통 컴포넌트 (`components/common/`)

이 화면이 **호출**하는 것. 같은 마크업을 다시 그리지 않는다.

| 컴포넌트 | 용도 |
|---------|------|
| `PageContainer` | `<main className="flex-1">` + 본문 컨테이너 |
| `PageHeader` | ① 페이지 헤더(Breadcrumb + `h1` + 설명) |
| `EmptyState` | ② 실행 이력 0건, ③ 파일 미선택 |
| `ErrorAlert` | ⑤ 일부 기사 수집 실패 알림 |

### 이 화면(도메인) 컴포넌트 (`components/results/`)

| 컴포넌트 | 용도 |
|---------|------|
| `HighlightedText`(Task 029, `highlighted-text.tsx`) | ④ 제목 열, ⑤ 제목·본문의 검색어 일치 구간을 `<mark>`로 강조. 순수 함수 `lib/highlight.ts`의 `splitByMatch`를 React 노드로 옮기기만 한다(`dangerouslySetInnerHTML` 미사용) |

### shadcn 컴포넌트

아래 목록은 Task 002(공통 앱 셸 스캐폴딩)에서 **13종을 일괄 설치하며 모두 설치가 끝났다.** 이 화면에서 추가로 설치할 것은 없다.

| 컴포넌트 | 용도 |
|---------|------|
| `alert` `badge` `breadcrumb` `button` `card` `input` `skeleton` `sonner` `table` | 알림·배지·버튼·검색 Input·스켈레톤·토스트·데스크톱 표 |
| `select` | ② 실행 선택 드롭다운 |
| `scroll-area` | ④ 기사 파일 목록, ⑤ 본문 미리보기의 스크롤 컨테이너 |
| `separator` | ⑤ 미리보기 메타 정보와 본문 사이 구분선 |
| `label` | ② 실행 선택, ④ 검색 Input에 접근성 레이블 연결 |
| `empty` | `EmptyState`가 감싸는 프리미티브(직접 쓰지 않는다) |

검토했지만 이 화면에는 채택하지 않은 컴포넌트: `tabs`(모바일 목록/미리보기 전환용으로 검토 → 정보 구조 결정 근거 표에서 제외 사유 설명), `resizable`(패널 크기 조절용으로 검토 → 동일 표에서 제외).

### lucide-react 아이콘

신 별칭으로 통일한다(`docs/CONVENTIONS.md` §8). 구 별칭 `AlertTriangle`은 쓰지 않는다.

`ExternalLink`(원문 링크) `Search`(파일 검색) `Clock`(실행 시각) `Newspaper`(대상 언론사) `Flame`(키워드 분석 버튼 — 헤더 메뉴의 🔥와 통일) `TriangleAlert`(실패 알림 — `ErrorAlert`가 내부에서 쓰므로 이 화면에서 직접 import하지 않는다) `Inbox`(빈 상태) `FileText`(파일 미선택 상태)

---

## 접근성

- **키보드 이동**: 데스크톱 표의 각 `TableRow`는 `tabIndex={0}` + `aria-selected`로 선택 상태를 노출한다. 모바일 카드 목록은 `ul[role="listbox"]` > `li[role="option"]` 안에 실제 `button`을 두어 포커스·클릭·엔터 선택이 모두 네이티브 동작을 따르게 한다. 방향키(↑/↓)로 행 사이를 이동하는 로직은 실제 구현 단계에서 추가한다(마크업 스켈레톤에는 TODO로 표기).
- **선택 상태 표시**: 선택된 행/카드에 `aria-selected="true"`와 시각적 강조(`bg-muted`)를 함께 적용한다.
- **라이브 리전**: 본문 미리보기 컨테이너에 `aria-live="polite"`를 부여해, 선택한 파일이 바뀔 때 스크린리더가 갱신된 본문을 안내하도록 한다.
- **외부 링크**: 원문 보기 버튼은 언론사 원문(다른 도메인)으로 나가므로 `Button asChild` + raw `<a>`가 맞다. `target="_blank" rel="noopener noreferrer"`를 사용하고, 아이콘만으로는 의미가 전달되지 않으므로 `sr-only` 텍스트("새 창에서 원문 기사 열기")를 함께 둔다. **`next/link`로 바꾸지 않는다.**
- **내부 이동**: [키워드 분석] 버튼과 빈 상태의 [크롤링 실행하러 가기]는 앱 내부 라우트로 가므로 반드시 `next/link`다. `app/` 하위의 raw `<a href="/...">`는 `@next/next/no-html-link-for-pages` **error**로 `npm run lint`를 실패시킨다.
- **폼 레이블 연결**: 실행 선택 `Select`는 `<Label htmlFor="run-select">`로 트리거와 연결하고, 검색 `Input`은 `<Label htmlFor="article-search" className="sr-only">`로 시각적으로는 숨기되 스크린리더에는 노출한다.
- **로딩 안내**: 로딩 상태 컨테이너에 `aria-busy="true"`와 `aria-label="수집 결과 불러오는 중"`을 부여한다.
- **오류 안내**: 실패 알림은 공통 `ErrorAlert`를 쓰고, `alert.tsx`가 기본으로 갖는 `role="alert"`를 그대로 활용해 스크린리더에 자동으로 전달되게 한다(별도 지정 불필요).

---

## 마크업 스켈레톤

### 파일 분할 경계 (Task 018)

아래 스켈레톤은 읽기 편하도록 한 덩어리로 적었지만, **실제 구현은 한 파일이 아니다.** `docs/ROADMAP.md` Task 018이 못 박은 파일 목록이 분할의 단일 소스이며, 스켈레톤의 각 구간은 다음 파일로 간다.

| 스켈레톤 구간 | 가는 파일 |
|---------------|-----------|
| `PageContainer` + `PageHeader` + 세로 스택 골격 + ② 실행 이력 0건 빈 상태 | `app/results/page.tsx` (수정 — `ScreenPlaceholder` 제거) |
| ② 실행 선택 `Select` + 총 실행 건수 | `components/results/run-select.tsx` (신규) |
| ③ 실행 요약 카드 + [키워드 분석] 버튼 + 부분 실패 `ErrorAlert` | `components/results/run-summary-card.tsx` (신규) |
| ④ 기사 파일 목록(검색 Input · 데스크톱 표 · 모바일 카드 리스트) | `components/results/article-file-list.tsx` (신규) |
| ⑤ 본문 미리보기(메타 · 본문 출처 배지 · 본문 `ScrollArea` · 파일 미선택 상태) | `components/results/article-preview.tsx` (신규) |
| 실행 목록·요약·기사 목록·본문 fetch 래퍼 | `lib/api/run-client.ts` (신규) |
| 검색어 하이라이트 구간 쪼개기(Task 029, vitest 대상) | `lib/highlight.ts` (신규) |
| 검색어 하이라이트 렌더링(④ 제목 열 · ⑤ 제목·본문 공용, Task 029) | `components/results/highlighted-text.tsx` (신규) |

### ⚠️ 아래 스켈레톤의 타입 선언을 그대로 베끼지 않는다 (I-024)

스켈레톤이 쓰는 더미 인터페이스는 **실제 API 응답과 다르다.** 마크업·라벨·클래스는 이 문서를 그대로 따르되, **타입은 `lib/api/run-client.ts`(018A가 라우트 구현을 직접 읽고 선언한 것)를 재사용한다.** 어긋나는 지점은 아래 셋이다.

| 스켈레톤 | 실제 응답 | 왜 |
| --- | --- | --- |
| `CrawlRunOption.targetPressNames: string[]` | `RunSummary.targetPress: { id, name: string \| null, deleted: boolean }[]` | 삭제된 언론사는 이름을 복구할 수 없어 `name: null` + 플래그로 온다(**D-026**). 화면은 고정 문구 "삭제된 언론사" 배지로 그린다(**D-027**) |
| `ArticleFileItem.pressName: string` | `pressName: string \| null` + `pressDeleted: boolean` | 같은 이유 |
| (없음) | `GET /api/runs`는 배열을 그대로, `GET /api/runs/{runId}/articles`는 `{ items, total }`로 감싸 준다 | 두 라우트의 봉투 모양이 다르다 |

`RunSummary.durationLabel`은 `finishedAt`이 없거나 시각이 역전되면 **`null`**이다 — 스켈레톤은 항상 문자열인 것처럼 쓰지만 null 가드가 필요하다.

### 기본 구조 (`app/results/page.tsx`)

```tsx
import {
  ExternalLink,
  Search,
  Clock,
  Newspaper,
  Flame,
} from "lucide-react"
import Link from "next/link"

// 페이지 골격은 공통 컴포넌트를 호출한다. 컨테이너·헤더 마크업을 화면마다 다시 그리지 않는다.
import { PageContainer } from "@/components/common/page-container"
import { PageHeader } from "@/components/common/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// 실행(run) 목록 더미 데이터 — 실제로는 data/runs/*/run-meta.json을 모아 조회
interface CrawlRunOption {
  id: string
  label: string
  startedAt: string
  finishedAt: string
  durationLabel: string
  targetPressNames: string[]
  successCount: number
  failCount: number
  storagePath: string
}

const MOCK_RUNS: CrawlRunOption[] = [
  {
    id: "20260810-143205",
    label: "2026-08-10 14:32 · 언론사 3 · 성공 42 · 실패 2",
    startedAt: "2026-08-10 14:32:05",
    finishedAt: "2026-08-10 14:38:41",
    durationLabel: "6분 36초",
    targetPressNames: ["조선일보", "한겨레", "전자신문"],
    successCount: 42,
    failCount: 2,
    storagePath: "data/runs/20260810-143205/articles/",
  },
  {
    id: "20260809-090000",
    label: "2026-08-09 09:00 · 언론사 2 · 성공 18 · 실패 6",
    startedAt: "2026-08-09 09:00:00",
    finishedAt: "2026-08-09 09:04:12",
    durationLabel: "4분 12초",
    targetPressNames: ["조선일보", "한겨레"],
    successCount: 18,
    failCount: 6,
    storagePath: "data/runs/20260809-090000/articles/",
  },
]

// 선택된 실행에 저장된 기사 파일 더미 데이터
interface ArticleFileItem {
  id: string
  fileName: string
  pressName: string
  title: string
  /** 본문 출처 — Article.contentSource와 같은 값(PRD §Article). 배지 문구와 1:1로 대응한다 */
  contentSource: 'rss-summary' | 'article-page'
  crawledAt: string
}

// 본문 출처 배지 문구 — 값과 라벨의 대응을 여기 한 곳에만 둔다.
// 'rss-summary'는 피드 요약(수백 자), 'article-page'는 원문 전문(수천 자)이라
// 본문 길이가 왜 다른지를 이 배지가 설명한다(PRD §Article).
const CONTENT_SOURCE_LABEL: Record<ArticleFileItem['contentSource'], string> = {
  'rss-summary': '피드 요약',
  'article-page': '원문 전문',
}

const MOCK_ARTICLES: ArticleFileItem[] = [
  {
    id: "0001",
    fileName: "0001.txt",
    pressName: "조선일보",
    title: "삼성전자, HBM4 메모리 양산 돌입",
    contentSource: "article-page",
    crawledAt: "14:33:10",
  },
  {
    id: "0002",
    fileName: "0002.txt",
    pressName: "한겨레",
    title: "카카오, 생성형 AI 신규 서비스 발표",
    contentSource: "rss-summary",
    crawledAt: "14:34:02",
  },
  {
    id: "0003",
    fileName: "0003.txt",
    pressName: "전자신문",
    title: "SK하이닉스, 차세대 D램 공정 전환",
    contentSource: "article-page",
    crawledAt: "14:35:47",
  },
]

const SELECTED_ARTICLE_ID = "0001"

// 미리보기에 표시할 본문 더미 데이터 — 실제로는 선택한 txt 파일의 본문 영역(메타 라인 이후)을 그대로 쓴다.
// 아래처럼 문단 사이 빈 줄이 남아 있는 이유: 본문은 selectText(개행을 한 칸으로 접는다,
// lib/crawler/parse.ts:15)가 아니라 lib/crawler/article-parser.ts가 개행을 보존해 뽑기 때문이다.
const SELECTED_ARTICLE_CONTENT = `삼성전자가 차세대 HBM4 메모리 양산에 돌입했다고 10일 밝혔다.
이번 양산은 평택 캠퍼스에서 진행되며…

(이하 본문 생략)`

export default function CollectResultPage() {
  const selectedRun = MOCK_RUNS[0]

  return (
    // PageContainer가 <main className="flex-1">과 container 클래스를 모두 제공한다.
    // 여기서 <div className="container mx-auto max-w-6xl ...">를 직접 쓰면 <main>이 사라져
    // app/layout.tsx의 flex min-h-full flex-col 아래에서 셸 레이아웃이 깨진다.
    <PageContainer>
      {/* ① 페이지 헤더 — 공통 규격(00-app-shell.md).
          raw <BreadcrumbLink href>는 클라이언트 라우팅을 우회하므로 쓰지 않는다.
          PageHeader가 BreadcrumbLink asChild + next/link로 렌더한다. */}
      <PageHeader
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "수집 결과" }]}
        title="수집 결과"
        description="크롤링으로 저장된 기사 txt 결과를 실행(run) 단위로 확인합니다."
      />

      <div className="space-y-6">
        {/* ② 실행 선택 → components/results/run-select.tsx */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="run-select" className="text-sm font-medium">
              실행 선택
            </Label>
            {/* TODO: onValueChange로 선택된 runId 상태를 갱신하고 파일 목록·미리보기를 다시 불러오는 로직 필요 */}
            <Select defaultValue={selectedRun.id}>
              <SelectTrigger id="run-select" className="w-[340px]">
                <SelectValue placeholder="실행을 선택하세요" />
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
          <span className="text-xs text-muted-foreground">
            총 {MOCK_RUNS.length}건의 실행 기록
          </span>
        </div>

        {/* ③ 실행 요약 카드 → components/results/run-summary-card.tsx */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              실행 요약
            </CardTitle>
            <CardAction>
              {/* TODO: 선택된 runId를 쿼리로 넘겨 핫 키워드 분석 페이지로 이동하는 라우팅 필요 */}
              <Button asChild>
                <Link href={`/keywords?runId=${selectedRun.id}`}>
                  <Flame />
                  키워드 분석
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <Clock
                  className="mt-0.5 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-muted-foreground">실행 시각</dt>
                  <dd>
                    {selectedRun.startedAt} → {selectedRun.finishedAt}
                    <span className="ml-1 text-muted-foreground">
                      (소요 {selectedRun.durationLabel})
                    </span>
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Newspaper
                  className="mt-0.5 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-muted-foreground">대상 언론사</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {selectedRun.targetPressNames.map((name) => (
                      <Badge key={name} variant="secondary">
                        {name}
                      </Badge>
                    ))}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-muted-foreground">수집 결과</dt>
                <dd>
                  성공 {selectedRun.successCount}건 ·{" "}
                  <span
                    className={
                      selectedRun.failCount > 0
                        ? "font-medium text-destructive"
                        : undefined
                    }
                  >
                    실패 {selectedRun.failCount}건
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">저장 경로</dt>
                <dd className="font-mono text-xs">{selectedRun.storagePath}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* 일부 기사 수집 실패 시에만 노출되는 알림 — "상태별 화면 ⑤" 참고 */}
        {/* <ErrorAlert title="..." description="..." /> */}

        {/* ④⑤ 기사 파일 목록 + 본문 미리보기 (마스터-디테일) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
          {/* ④ 기사 파일 목록 → components/results/article-file-list.tsx */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                기사 파일 ({MOCK_ARTICLES.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Label htmlFor="article-search" className="sr-only">
                  파일명 또는 제목으로 검색
                </Label>
                {/* TODO: 입력값으로 파일 목록을 필터링하는 로직 구현 필요 */}
                <Input
                  id="article-search"
                  placeholder="파일명 · 제목 검색"
                  className="pl-8"
                />
              </div>

              {/* 데스크톱: 표 형태 (lg 이상) */}
              <ScrollArea className="hidden max-h-[28rem] lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>파일명</TableHead>
                      <TableHead>언론사</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead>수집 시각</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_ARTICLES.map((article) => {
                      const isSelected = article.id === SELECTED_ARTICLE_ID
                      return (
                        // TODO: onClick/onKeyDown으로 파일 선택 상태를 갱신하고 미리보기를 불러오는 로직 필요
                        <TableRow
                          key={article.id}
                          tabIndex={0}
                          aria-selected={isSelected}
                          className={
                            isSelected
                              ? "cursor-pointer bg-muted"
                              : "cursor-pointer"
                          }
                        >
                          <TableCell className="font-mono text-xs">
                            {article.fileName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{article.pressName}</Badge>
                          </TableCell>
                          <TableCell className="max-w-48 truncate">
                            {article.title}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {article.crawledAt}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* 모바일: 카드 리스트 (lg 미만) */}
              <ScrollArea className="max-h-[28rem] lg:hidden">
                <ul
                  role="listbox"
                  aria-label="수집된 기사 파일 목록"
                  className="space-y-2"
                >
                  {MOCK_ARTICLES.map((article) => {
                    const isSelected = article.id === SELECTED_ARTICLE_ID
                    return (
                      <li
                        key={article.id}
                        role="option"
                        aria-selected={isSelected}
                      >
                        {/* TODO: 선택 상태 갱신 및 미리보기 로드 로직 구현 필요 */}
                        <button
                          type="button"
                          onClick={() => {}}
                          className={
                            "w-full rounded-lg border p-3 text-left text-sm" +
                            (isSelected ? " bg-muted" : "")
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              {article.fileName}
                            </span>
                            <Badge variant="outline">{article.pressName}</Badge>
                          </div>
                          <p className="mt-1 truncate font-medium">
                            {article.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {article.crawledAt}
                          </p>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* ⑤ 본문 미리보기 → components/results/article-preview.tsx */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base leading-snug font-medium">
                {/* TODO: 선택된 기사 제목 바인딩 필요 */}
                삼성전자, HBM4 메모리 양산 돌입
              </CardTitle>
              <CardAction>
                {/* TODO: 선택된 기사의 원문 URL 바인딩 필요 */}
                {/* 언론사 원문(외부 도메인)이므로 raw <a>가 맞다 — next/link로 바꾸지 않는다 */}
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href="https://example.com/article/0001"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink />
                    <span className="sr-only">새 창에서 원문 기사 열기</span>
                  </a>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">조선일보</Badge>
                {/* 본문 출처 — 요약만 저장된 기사는 본문이 짧은 이유를 여기서 알 수 있다.
                    라벨은 Article.contentSource의 두 값과 1:1이다
                    ('rss-summary' → 피드 요약 / 'article-page' → 원문 전문).
                    TODO: 선택된 기사의 contentSource 바인딩 필요 */}
                <Badge variant="secondary">
                  {CONTENT_SOURCE_LABEL['article-page']}
                </Badge>
                <span>2026-08-10 14:33:10 수집</span>
              </div>
              <Separator className="my-3" />
              {/* 선택이 바뀔 때마다 내용이 갱신되므로 스크린리더에 변경 사실을 알림.
                  whitespace-pre-wrap이 의미를 가지려면 본문에 개행이 남아 있어야 한다 —
                  수집 단계에서 article-parser.ts가 문단 개행을 보존한다(위 "본문 개행 보존 전제"). */}
              <ScrollArea className="h-[28rem]">
                <div
                  aria-live="polite"
                  className="font-mono text-sm leading-relaxed whitespace-pre-wrap"
                >
                  {SELECTED_ARTICLE_CONTENT}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
```
