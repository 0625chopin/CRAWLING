# Playwright MCP 검증 시나리오 초안

**전제** — 이 문서는 `docs/DECISIONS.md`의 **D-006**을 전제로 한다: A/B로 쪼갠 화면 Task는 `page.tsx`를 만드는 조각이 짝
조각의 컴포넌트 파일을 **이미 import하는 형태로** 작성하고(자리를 비워 두거나 짝 조각이 `page.tsx`를 나중에 다시 고치지
않는다), 짝 조각은 그 파일의 **내부 구현만** 채운다. A 자신의 DoD 중 짝 조각 없이는 확인할 수 없는 항목은 짝 조각이
완료되는 회차에 함께 검증한다(4일차, 화면 워크스트림 반영).

**작성 배경** — `docs/CONVENTIONS.md` §9는 `@playwright/test` E2E 스위트를 도입하지 않기로 했고, 화면·API Task의 기능 검증은
Playwright MCP로 실제 브라우저 동선을 태우는 것이 유일한 수단이라고 못 박았다. 그런데 1~3일차 회차는 전부 `lib/` 순수 모듈
(Task 019 Kiwi 어댑터 등)이라 아직 아무도 이 동선을 태워 본 적이 없다. 화면 Task(009·012·016A·018)가 실제로 열리는 회차에
즉석에서 시나리오를 짜면 DoD 항목을 빠뜨리기 쉬우므로, 이 문서는 그 전에 시나리오를 미리 설계해 둔다.

**이 문서의 성격** — 아직 `components/press/` `components/stopwords/` `components/crawl/` `components/results/`가 전혀
구현되지 않은 시점(3일차)에 작성한 **사전 계획**이다. 실제 실행은 각 Task가 구현된 회차에 이 문서를 그대로(또는 구현 중 드러난
차이를 반영해 살짝 고쳐서) 사용한다. 대상은 화면 워크스트림이 담당하는 **009A·009B·012A·012B·016A·018A·018B** 7개 조각이다.

---

## 공통 규칙

- **실행 전제**: `npm run dev`로 로컬 서버(`http://localhost:3000`)를 띄운 상태. `data/` 아래 시나리오별로 명시한 시드 데이터를
  미리 넣어 둔다(불용어는 Task 011, 언론사는 Task 008A/008B, 실행 결과는 Task 013B·017이 만드는 실제 API를 통해 넣거나,
  API가 아직 없으면 `data/*.json`을 손으로 채운다 — `docs/CONVENTIONS.md`의 식별자 규칙을 그대로 따른다).
- **셀렉터 전략**: `browser_snapshot`으로 접근성 트리를 얻어 **role + accessible name**으로 지칭한다(예:
  `button "언론사 추가"`, `checkbox "전체 언론사 선택"`, `combobox "실행 선택"`). CSS 셀렉터나 텍스트 매칭에 의존하지 않는다 —
  이 문서의 예시 텍스트("전자신문", "기자" 등)는 설계서 목 데이터를 그대로 가져온 것이며 실제 시드 이름으로 바꿔 실행한다.
- **반응형 확인 지점**: 각 시나리오 안에 `browser_resize(375, 812)` / `browser_resize(768, 1024)` / `browser_resize(1280, 800)`
  세 지점을 표시한다. 설계서가 전환 기준을 명시한 곳(예: 04의 표/카드 전환 `md`=768px)은 그 값을 그대로 쓴다.
- **콘솔 오류**: 각 시나리오 마지막에 `browser_console_messages`로 오류 0건을 확인한다(Task 025 사전 리허설과 동일한 습관을
  화면 Task 단위로 미리 들인다).
- **색상 단독 전달 금지 확인**: "활성/비활성", "기본/사용자" 같은 상태가 색상(배지 variant)만이 아니라 텍스트·아이콘으로도
  전달되는지, 시각적 확인이 어려운 항목은 `browser_evaluate`로 텍스트 노드나 `aria-*` 속성을 직접 읽어 확인한다.

### 공통 관찰 — A/B 파일 경계와 브라우저 도달성 (D-006 반영)

여러 화면 Task가 10인일을 넘어 `A`/`B`로 쪼개졌는데(`docs/ROADMAP/work/03.화면.md`), **쪼갠 두 조각이 같은 파일을 함께 완성해야
라우트가 실제로 보이는 경우**가 있다. `docs/DECISIONS.md`의 **D-006**이 이 구조를 다음 규칙으로 확정했다: **`page.tsx`를 만드는
조각이 짝 조각의 컴포넌트 파일을 이미 만들어 import하는 형태로 작성**하고(자리를 비워 두거나 짝 조각이 `page.tsx`를 나중에
다시 고치지 않는다), 짝 조각은 그 컴포넌트 파일의 **내부 구현만** 채운다. 아래 표는 그 규칙을 각 조각 쌍에 적용한 결과다
(발견 당시 근거는 `docs/ISSUES.md`의 **I-004** 참고 — D-006으로 해결됨 처리됐다).

| Task | `app/**/page.tsx` 소유 | page.tsx가 이미 import하는 짝 조각 파일 | D-006 적용 결과 |
| --- | --- | --- | --- |
| 009A/009B | **009B** | `press-table.tsx`·`press-card-list.tsx`(009A) | 009A가 009B보다 먼저 끝나므로 순방향 참조 문제가 없다. 009B는 이미 완성된 009A 산출물을 그대로 import한다. |
| 012A/012B | **012A** | `stopword-add-card.tsx`(012B) | 012A가 이 파일을 **먼저 만들어**(정적 뼈대) `page.tsx`에서 import해 두고, 012B가 추가·일괄추가 로직을 그 파일 안에 채운다. |
| 016A/016B | **016A** (016B는 크롤 파이프라인 소관) | `crawl-run-panel.tsx`(016B, 다른 워크스트림) | **확정**: 016A가 이 파일을 만들어 `[크롤링 시작]` 버튼의 **idle·disabled 상태 껍데기까지** 채우고 `page.tsx`에서 import한다. 016B는 같은 파일 안에 진행·완료·실패 상태 전환만 이어받는다. |
| 018A/018B | **018A** | `article-file-list.tsx`·`article-preview.tsx`(018B) | 018A가 두 파일을 **먼저 만들어**(정적 뼈대 — 로딩/빈 상태만) `page.tsx`에서 import해 두고, 018B가 목록·미리보기 로직을 채운다. |

**따라서 이 문서의 각 섹션은 "이 조각만으로 실행 가능한 부분"과 "짝이 되는 조각까지 끝나야 실행 가능한 부분"을 분리해 표기한다.**

---

## Task 009A · 언론사 관리 화면 — 목록 표·카드 리스트·방식 배지

**전제 조건**: Task 008A(언론사 조회 API) 완료. **주의**: `app/press/page.tsx`는 009B 소관이라(위 공통 관찰), 009A만 끝난
시점에는 `/press`가 여전히 `ScreenPlaceholder`를 렌더링한다. 아래 시나리오는 **009B까지 끝난 뒤** 실행한다 — 009A 자신의
산출물(`press-table.tsx`/`press-card-list.tsx`)이 커버하는 DoD 항목만 이 절에 모아 적었을 뿐, 실행 시점은 009B 완료 후다.

### DoD 대조 (Task 009 전체 7개 중 이 절이 다루는 것)

| ROADMAP DoD | 이 절에서 다룸 | 비고 |
| --- | --- | --- |
| RSS(요약만)·RSS(본문전문)·HTML 각 1곳 등록 시 `수집 설정` 컬럼이 각각 다르게 표시 | O | `press-table.tsx`/`press-card-list.tsx`(009A)의 렌더링 로직 |
| 375/768/1280 폭에서 레이아웃 안 깨짐 | O | 표↔카드 전환 기준 `md`(768px)도 009A 담당 |
| (나머지 5개) | — | 009B 절 참고 |

### 시나리오 (실행 시점: 009B 완료 후)

1. 사전 데이터: `data/press-sources.json`에 RSS(요약만) 1건 · RSS(본문 전문) 1건 · HTML 1건, 총 3건 이상(설계서 04의
   전자신문/ZDNet Korea/IT조선 예시 형태) 시드.
2. `browser_navigate` → `/press`.
3. `browser_snapshot` → `table` role과 `caption`(`sr-only`, "등록된 언론사 목록") 존재 확인.
4. `수집 설정` 컬럼 대조:
   - RSS(요약만) 행: 텍스트 "피드 요약만"이 **버튼이 아님**(스냅샷에서 `button`/`generic` role 확인, `aria-expanded` 속성이
     붙은 컨트롤이 이 행에는 없어야 한다).
   - RSS(본문 전문) 행: `button "본문 셀렉터"`(`aria-expanded="false"`) 존재 → 클릭 → `aria-expanded="true"`로 전환,
     서브 행에 셀렉터 값 + "원문 전문" 텍스트 노출.
   - HTML 행: `button "셀렉터 3개"` 클릭 → 서브 행에 기사 링크/제목/본문 셀렉터 3종 모두 노출.
5. `browser_resize(1280, 800)` → 표 형태 유지 확인.
6. `browser_resize(768, 1024)` → 전환 기준이 정확히 `md`(768px)이므로 이 폭에서도 표 유지(경계값 확인). 767px에서
   카드로 전환되는지도 `browser_resize(767, 1024)`로 추가 확인.
7. `browser_resize(375, 812)` → 카드 리스트(`Card`)로 전환, 각 카드에 이름+배지 / URL / 수집 설정 요약 / 활성 스위치 /
   수정·삭제 버튼이 모두 있는지 확인.
8. `browser_console_messages` 오류 0건.

### 접근성 확인

- 수집 설정 펼침 버튼의 `aria-expanded`/`aria-controls="press-selectors-{id}"`가 실제 펼침 상태와 일치.
- RSS(요약만) 행에는 펼침 버튼 자체가 없다(빈 `aria-expanded` 컨트롤을 만들지 않는다는 DoD의 반대 증명).
- 방식 배지 아이콘 `aria-hidden`, 텍스트("RSS"/"HTML")만 접근성 트리에 남는지.
- 활성 스위치 옆 "활성"/"비활성" 텍스트 병기(색상 단독 아님).
- 아이콘 버튼(수정·삭제) `aria-label`에 언론사명 포함(예: "전자신문 수정").

---

## Task 009B · 언론사 관리 화면 — 추가·수정·삭제 다이얼로그

**전제 조건**: Task 008B, Task 009A 완료.

### DoD 대조

| ROADMAP DoD | 커버 | 비고 |
| --- | --- | --- |
| `ScreenPlaceholder` 완전 제거 | O | |
| 언론사 0건 → `Newspaper` 빈 상태, 추가 시 목록 전환 | O | |
| 방식 토글 왕복 시 필드 블록 교체 + 반대쪽 오류 표시 제거 | O | |
| 활성 토글 끄면 홈 체크박스에서 사라짐 | **X (이월)** | work 문서가 "016A(→016B) 완료되는 회차"로 명시 이월. 이 회차 대상 아님 |
| 추가→수정→활성 토글→삭제 연속 + `data/press-sources.json` 변경 확인 | O | |

### 시나리오

**A. 빈 상태**
1. `data/press-sources.json`을 빈 배열로 초기화.
2. `browser_navigate` → `/press`.
3. `browser_snapshot` → `Newspaper` 아이콘(장식, `aria-hidden`) + "등록된 언론사가 없습니다" + 버튼 `"+ 언론사 추가"` 확인
   (`EmptyState`가 ③④ 영역 전체를 대체).
4. 버튼 클릭 → `dialog "언론사 추가"` 열림 확인.

**B. 추가 → 수정(방식 왕복) → 활성 토글 → 삭제 연속**
1. 기본값이 `RSS 피드`인지 확인(`radio "RSS 피드"` checked).
2. 이름 "전자신문", 피드 URL "https://rss.etnews.com/Section901.xml" 입력 → `[[저장]]` 클릭.
3. 토스트("저장되었습니다"류) 확인, Dialog 닫힘, 표/카드에 새 행 등장.
4. **브라우저 밖 확인**: `data/press-sources.json`을 직접 열어 새 항목이 실제로 추가됐는지 diff(Playwright MCP는 파일
   시스템에 접근하지 않으므로 이 단계만 예외적으로 브라우저 밖에서 수행).
5. 방식 토글 왕복: 방금 만든 언론사의 수정 버튼 클릭 → Dialog에서 토글을 "목록 페이지"로 전환 → 필드 블록이
   목록URL/셀렉터 3종으로 바뀌고 포커스가 `#press-list-url`로 이동했는지 `browser_evaluate`(`document.activeElement.id`)로 확인.
6. 목록 URL을 비운 채 저장 시도 → 오류 문구 노출 확인 → 다시 "RSS 피드"로 전환 → 오류 문구가 함께 사라지는지 확인
   (반대쪽 방식의 오류가 남지 않는다는 DoD).
7. RSS 값을 다시 채우고 저장 → 목록에서 활성 스위치 클릭(끄기) → "비활성" 텍스트로 전환 + 토스트 확인.
8. 삭제 버튼 클릭 → `AlertDialog` 열림, 포커스가 "취소"에 있는지 확인 → "삭제" 클릭 → 목록에서 사라짐 확인.
9. **브라우저 밖 확인**: `data/press-sources.json`에서 해당 항목이 실제로 제거됐는지 diff.

**C. RSS 본문 전문 + HTML 등록** (009A DoD "수집 설정 컬럼" 실행 지점)
- 두 번째 언론사(ZDNet Korea, RSS + `contentSelector`) 추가 → 목록에서 "본문 셀렉터 ▸" 확인.
- 세 번째 언론사(IT조선, HTML) 추가 → 목록에서 "셀렉터 3개 ▸" 확인.

**D. 반응형** (009A DoD "375/768/1280" 실행 지점)
- `browser_resize(1280, 800)` → 표.
- `browser_resize(768, 1024)` → 표 유지.
- `browser_resize(375, 812)` → 카드 전환.

### 접근성 확인

- Dialog 열릴 때 포커스가 첫 입력(방식 토글)으로 이동(Radix 기본 동작).
- 방식 `ToggleGroup`이 `role="radio"` 시맨틱을 갖고 좌우 화살표로 이동 가능.
- 본문 전문 스위치 `aria-controls="press-content-selector-block"` + `aria-expanded` 값 전환.
- 삭제 `AlertDialog` 기본 포커스 "취소".
- 폼 오류 시 `aria-invalid="true"` + `aria-describedby` 연결.

### 이월 항목

- DoD "활성 토글을 끄면 홈 체크박스 목록에서 사라진다" → **Task 016A(→016B) 완료 회차**에 재확인(work 문서 명시).
  홈 화면 검증은 아래 016A 절 3단계에서 이 항목을 함께 다룬다.

---

## Task 012A · 불용어 관리 화면 — 칩·섹션 컴포넌트

**전제 조건**: Task 011(불용어 CRUD API) 완료. **D-006 확정**: 이 조각이 `app/stopwords/page.tsx`를 직접 정리하며
`stopword-add-card.tsx`(정적 뼈대 — 내부 추가·일괄추가 로직은 012B 몫)를 이미 만들어 import해 둔다(공통 관찰 표 참고).
**012A만으로도 목록/섹션 부분은 라우트에서 바로 확인 가능**하다. 단 추가 입력·검색은 012B 몫이라 이 절에서 다루지 않는다.

### DoD 대조 (Task 012 전체 5개 중)

| ROADMAP DoD | 이 절에서 다룸 | 비고 |
| --- | --- | --- |
| `ScreenPlaceholder` 제거 | O | 012A가 `page.tsx` 담당 |
| 중복 입력 시 destructive Alert + 목록 불변 | X | 입력 폼은 012B |
| 일괄 추가 접힘 기본값 + `aria-expanded` | X | 012B |
| 기본 프리셋 삭제 시 확인 다이얼로그 + 초기 포커스 "취소" | O | `stopword-chip.tsx`(012A)가 `AlertDialog` 로직을 포함 |
| Playwright MCP 전체 동선 + 375px 칩 줄바꿈 | 부분 | 삭제·줄바꿈은 O, 추가/일괄추가/검색은 012B |

### 시나리오

1. 사전 데이터: `data/stopwords.json`에 기본 프리셋 7개(기자/사진/제공/앵커/무단전재/재배포금지/이번) + 사용자 추가 3개
   (AI/삼성전자/오늘) 시드.
2. `browser_navigate` → `/stopwords`.
3. `browser_snapshot` → `ScreenPlaceholder` 없음, "불용어 관리" h1, "기본 제공 불용어 (7)" / "사용자 추가 불용어 (3)"
   섹션 헤딩 확인.
4. 기본 제공 칩에 `Lock` 아이콘(`aria-hidden`) + `outline` variant, 사용자 칩은 `secondary` variant(잠금 아이콘 없음) —
   variant 차이는 스냅샷 role만으로는 안 보이므로 `browser_evaluate`로 class 목록을 읽어 대조하거나 스크린샷으로 시각 확인.
5. 기본 프리셋 칩(예: "기자") 삭제 버튼(`button "'기자' 불용어 삭제"`) 클릭 → `AlertDialog`
   "기본 제공 불용어를 삭제할까요?" 노출 → 포커스가 "취소"에 있는지 `browser_evaluate`(`document.activeElement.textContent`)로 확인.
6. "삭제" 클릭 → 칩이 사라지고 "기본 제공 불용어 (6)"으로 개수 갱신 확인.
7. 사용자 추가 칩(예: "AI") 삭제 버튼 클릭 → 확인 다이얼로그 없이 **즉시** 삭제, "사용자 추가 불용어 (2)"로 즉시 반영,
   `role="status"` 라이브 리전에 결과 문구가 채워지는지 `browser_snapshot`으로 확인.
8. `browser_resize(375, 812)` → 칩 목록이 `flex-wrap`으로 줄바꿈되어 가로 스크롤이 생기지 않는지
   `browser_evaluate`(`document.body.scrollWidth <= window.innerWidth`)로 확인.
9. `browser_console_messages` 오류 0건.

### 접근성 확인

- 삭제 확인 `AlertDialog` 기본 포커스 "취소"(Radix 기본 동작).
- 기본 프리셋 `Lock` 아이콘 `aria-hidden`, 구분 정보가 색상이 아니라 섹션 제목·아이콘·배지 variant 3중으로 전달되는지.
- `ul[role="list"]` 내부 `li` 구조(리스트 스타일 초기화로 인한 시맨틱 손실 방지).
- 칩 삭제 버튼 `aria-label`에 단어 포함(`"'기자' 불용어 삭제"`).

이 시나리오에서 다루지 않는 것(012B 몫): 단일/일괄 추가, 검색. 아래 012B 절 참고.

### 5일차 실행 기록

D-006 방향은 초안 그대로 맞았다(012A가 `page.tsx` 소유, 012B의 `stopword-add-card.tsx`를 정적 뼈대로
import). `data/stopwords.json` 시드는 기본 7개 + 사용자 0개(초기 상태)였다 — 사용자 추가 3개는 별도로
채워 넣지 않고, 대신 `POST /api/stopwords`로 임시 커스텀 단어 1개를 만들어 삭제 동선을 확인한 뒤
삭제로 원상복구했다(파일이 최종적으로 시드와 동일함을 확인).

- 기본 프리셋 칩 "이번" 삭제 버튼 클릭 → `AlertDialog` 노출, `document.activeElement.textContent === '취소'`로
  초기 포커스 확인 → "취소" 클릭으로 실제 삭제는 하지 않고 데이터 보존.
- 임시 커스텀 칩 "testword" 삭제 버튼 클릭 → 확인 다이얼로그 없이 즉시 삭제, `status` 라이브 리전에
  "'testword' 불용어가 삭제되었습니다" 노출, 섹션이 `EmptyState`(Ban 아이콘)로 전환됨을 확인.
- `data/stopwords.json`을 직접 열어 삭제·복원이 실제로 반영됐는지 대조 — 최종 상태가 원본 시드(7개, 사용자 0개)와
  동일함을 확인.
- 1280/768/375px 확인, 375px에서 `scrollWidth <= innerWidth` 참(가로 스크롤 없음).
- `browser_console_messages` — 매 단계 0건.

---

## Task 012B · 불용어 관리 화면 — 추가·검색·삭제 동선

**전제 조건**: Task 012A 완료.

### DoD 대조

| ROADMAP DoD | 커버 |
| --- | --- |
| 중복 입력 시 destructive Alert, 목록 불변 | O |
| 일괄 추가 접힘 기본값 + `aria-expanded` 실제 상태 반영 | O |
| Playwright MCP 추가→일괄추가→검색→삭제 동선 + 375px 칩 줄바꿈 | O(추가/일괄추가/검색 파트) |

### 시나리오

1. `browser_navigate` → `/stopwords`(012A 시드 유지).
2. **중복 입력**: `textbox "새 불용어"`에 "기자"(이미 등록됨) 입력 → "추가" 클릭 → `Alert(variant="destructive")`
   "'기자'는 이미 등록된 불용어입니다" 노출, 목록 개수 불변 확인.
3. **정상 추가**: "테스트키워드" 입력 → "추가" 클릭 → `role="status" aria-live="polite"`에 결과 메시지, "사용자 추가
   불용어 (N+1)"로 개수 갱신, 새 칩 등장 확인.
4. **일괄 추가**: 토글 버튼(`button "여러 단어 한 번에 추가"`, 초기 `aria-expanded="false"`) 클릭 →
   `aria-expanded="true"`로 전환, `Textarea` 노출 → "특파원, 인턴기자\n논설위원" 입력 → "일괄 추가" 클릭 → 3개 칩이
   순서대로 추가되는지 확인.
5. **검색**: `textbox "불용어 검색"`(`sr-only` 레이블)에 "테스트" 입력 → 두 섹션 모두 일치 항목만 남고, 나머지는
   `EmptyState`(`SearchX`)로 대체되지만 **섹션 제목·개수는 유지**되는지 확인.
6. 검색어를 지우고 전체 목록 복귀 확인.
7. `browser_resize(375, 812)`에서 2~6을 재확인(특히 일괄 추가 패널의 세로 스택과 칩 줄바꿈).
8. `browser_console_messages` 오류 0건.

### 접근성 확인

- 일괄 추가 토글 `aria-expanded`/`aria-controls="bulk-add-panel"`.
- 검색 input `sr-only` 레이블이 `stopword-search`에 연결.
- 추가/삭제 결과가 `role="status" aria-live="polite"` 영역에 반영.
- 중복 경고는 시각적 `Alert` + `sr-only` 라이브 리전 문구를 동시에 갖는지(스냅샷에서 `Alert` role과 라이브 리전 텍스트 모두 확인).

---

## Task 016A · 크롤링 실행 화면(홈) — 언론사 선택 카드 및 실행 옵션

**전제 조건**: Task 015A(크롤 API), Task 009A(`source-type-badge.tsx`) 완료. **D-006 확정**: `crawl-run-panel.tsx`는
016A가 만든다 — **`[크롤링 시작]` 버튼의 idle·`disabled` 상태 껍데기까지**가 016A 몫이고, 016B(크롤 파이프라인)는 같은
파일 안에 진행·완료·실패 상태 전환만 이어받는다(`docs/DECISIONS.md` D-006). 이 절은 **016A가 자체적으로 검증 가능한
좌측 언론사 선택 카드 + 우측 패널의 idle 껍데기**에 한정한다.

### DoD 대조 (Task 016 전체 5개 중)

| ROADMAP DoD | 이 절에서 다룸 | 비고 |
| --- | --- | --- |
| `ScreenPlaceholder` 제거 | O | 016A가 `page.tsx` 담당 |
| 언론사 0건 → `Inbox` 빈 상태 + `[언론사 관리로 이동]` + 실행 버튼 비활성 | **O** | D-006 확정으로 "실행 버튼 비활성"도 016A 소관(idle·disabled 껍데기)이 됐다 — 이전 초안의 "부분" 판정을 정정 |
| 언론사 2곳 체크→실행→진행률 갱신 | 부분 | "2곳 체크"로 버튼이 `disabled`→활성으로 전환되는 것까지는 O(016A). 클릭 이후 실행·진행률 갱신은 016B — 이 워크스트림 시나리오 밖 |
| 완료 후 `[수집 결과 보기]`→`/results`, txt 저장 확인 | X | 016B |
| 중단 버튼 | X | 016B |

### 시나리오 (016A 범위)

1. 사전 데이터: `data/press-sources.json`에 활성 언론사 5곳 이상(RSS/HTML 혼합), 그중 1곳은 `isActive: false`로 시드
   (009B에서 이월된 "활성 끄면 홈에서 사라진다" DoD를 이 자리에서 함께 재확인 — work 문서가 이 회차를 재확인 지점으로 지정).
2. `browser_navigate` → `/`.
3. `browser_snapshot` → `ScreenPlaceholder` 없음, "크롤링 실행" h1(브레드크럼 1단, "홈" 링크 없이 "크롤링 실행"만) 확인.
4. **009B 이월 항목 재확인**: 요약 텍스트 "0/N개 선택됨"의 N이 `isActive: false` 언론사를 제외한 수와 정확히 일치하는지,
   비활성 언론사 이름이 목록에 아예 없는지 확인.
5. 전체 선택 체크박스 클릭 → 모든 행 체크, 요약 "N/N개 선택됨".
6. 하나 해제 → 전체 선택 체크박스가 `aria-checked="mixed"`로 전환되는지 확인.
7. `[전체 해제]` 클릭 → 모두 해제, 선택 0개일 때 `[전체 해제]` 버튼 자체가 `disabled` 확인.
8. **`[크롤링 시작]` idle 껍데기 확인(D-006 신규 범위)**: 선택 0개 상태에서 `button "크롤링 시작"`이 `disabled`인지 확인
   → 언론사 하나 이상 체크 → 버튼의 `disabled`가 풀리는지 확인. **클릭까지는 하지 않는다** — 클릭 이후 진행·완료·실패
   전환은 016B 몫이라 이 절의 검증 범위 밖이다.
9. 각 행의 방식 배지(RSS/HTML) 텍스트와 `sourceUrl`(`font-mono`) 노출 확인. `source-type-badge.tsx`(009A 산출물)
   재사용 여부는 코드 리뷰로 별도 확인한다(브라우저로는 렌더링 결과만 확인 가능).
10. `browser_resize(1280, 800)` → `lg:grid-cols-[1fr_360px]` 2단 레이아웃, 우측 카드가 `sticky`로 유지되는지 스크롤 후
    `browser_evaluate`(`getBoundingClientRect`)로 위치 비교.
11. `browser_resize(768, 1024)`, `browser_resize(375, 812)` → 1단 스택(목록 → 실행 패널), 375px에서 언론사 목록
    `ScrollArea` 높이가 `h-[320px]`로 축소되는지 확인.
12. **언론사 0건**: `data/press-sources.json`을 빈 배열로 교체 → 재방문 → `Inbox` 아이콘 + "등록된 언론사가 없습니다" +
    `[언론사 관리로 이동]` → 클릭 → `/press`로 이동 확인. **이 상태에서 `[크롤링 시작]` 버튼이 `disabled`인지 함께 확인**
    (DoD ②의 "실행 버튼 비활성" 항목 — D-006으로 016A 소관 확정).
13. 로딩 스켈레톤: API 응답 지연 재현이 가능하면(`browser_network_request` 등) `Skeleton` 5개 노출을 확인.

### 접근성 확인

- 체크박스 목록 컨테이너 `role="group" aria-labelledby="press-select-summary"`.
- 전체 선택 체크박스 3단 상태(`aria-checked="mixed"`) 자동 반영.
- 언론사 라벨(이름+URL 전체)이 클릭 가능한 영역으로 `label htmlFor` 연결.
- `[크롤링 시작]` 버튼의 비활성 상태는 `aria-disabled`가 아니라 네이티브 `disabled` 속성으로 표현되는지 확인(스크린리더가
  탭 포커스를 건너뛰도록).

### 이 절이 다루지 않는 것

`crawl-run-panel.tsx` 안의 진행률·중단·완료·부분 실패 상태 전환(D-006에 따라 016A가 만든 idle 껍데기 위에 016B가
이어붙이는 부분)은 016B 완료 후 크롤 파이프라인 워크스트림이 별도 시나리오로 검증한다.

---

## Task 018A · 수집 결과 화면 — 실행 선택 및 요약 카드

**전제 조건**: Task 017(수집 결과 API) 완료. **D-006 확정**: `article-file-list.tsx`·`article-preview.tsx`는 018A가
먼저 만들어(정적 뼈대 — 로딩/빈 상태만) `page.tsx`에서 이미 import해 두고, 018B가 목록·미리보기 로직을 그 안에 채운다
(공통 관찰 표 참고). 이 절은 018A 자체 DoD에 한정한다.

### DoD 대조 (Task 018 전체 5개 중)

| ROADMAP DoD | 이 절에서 다룸 | 비고 |
| --- | --- | --- |
| `ScreenPlaceholder` 제거 | O | |
| 실행 전환 시 요약·파일목록·미리보기 **함께** 갱신 | 부분 | 요약 카드 갱신은 018A, "함께" 확인은 018B 이후(아래 018B 절 5단계에서 완결) |
| (나머지 3개) | — | 018B 절 참고 |

### 시나리오 (018A 범위)

1. 사전 데이터: `data/runs/`에 실행 2건 이상(성공만인 run 1개, 부분 실패 run 1개 — 설계서 예시와 동일하게 성공42/실패2,
   성공18/실패6) 시드.
2. `browser_navigate` → `/results`.
3. `browser_snapshot` → 실행 선택 `combobox`(Select)에 최신 실행이 기본 선택돼 있는지, "총 N건의 실행 기록" 확인.
4. Select를 열어 두 번째 실행으로 전환 → 실행 요약 카드(시각/소요시간/대상 언론사 배지/성공·실패 건수/저장 경로)가
   갱신되는지 확인.
5. 실패 건수 > 0인 run 선택 시 "실패 N건" 텍스트가 강조되고(`browser_evaluate`로 class 확인) `Alert(variant="destructive")`가
   함께 뜨는지 확인.
6. `[키워드 분석]` 버튼의 href가 `/keywords?runId={선택된 runId}`인지 `browser_evaluate`로 확인.
7. **실행 이력 0건**: `data/runs`를 비움 → 재방문 → `EmptyState`(`Inbox`) "아직 크롤링한 결과가 없습니다" +
   `[크롤링 실행하러 가기]` → 클릭 → `/`로 이동 확인.
8. `browser_resize(1280, 800)` / `browser_resize(768, 1024)` / `browser_resize(375, 812)`에서 요약 카드
   `grid-cols-1 sm:grid-cols-2` 전환 확인.

### 접근성 확인

- Select `Label htmlFor="run-select"` 연결.
- 실행 요약 카드 아이콘(`Clock`/`Newspaper`) `aria-hidden`, 텍스트 라벨 병기.
- 로딩 `aria-busy="true"` + `aria-label` 확인(로딩 상태 재현 가능 시).

---

## Task 018B · 수집 결과 화면 — 기사 파일 목록 및 본문 미리보기

**전제 조건**: Task 018A 완료.

### DoD 대조

| ROADMAP DoD | 커버 |
| --- | --- |
| 실행 전환 시 요약·파일목록·미리보기 함께 갱신 | O(이 절에서 완결) |
| 파일 미선택 시 "파일을 선택하면 본문을 미리 볼 수 있습니다" | O |
| `[키워드 분석]` 클릭 시 `/keywords?runId=...` 이동 + run 셀렉터 선택 확인 | **X (이월 — 022B 완료 회차)** |
| Playwright MCP 전체 동선 + 375px 세로 스택 | O |

### 시나리오

1. `browser_navigate` → `/results`(018A 시드 유지, 성공42/실패2 run 선택 상태).
2. 파일 목록(좌, 데스크톱 ≥1024px에서 `Table`) — 파일명/언론사/제목/수집시각 컬럼, **성공 건수(42건)와 정확히 일치**
   (실패 기사는 목록에 저장되지 않으므로 애초에 없음) 확인.
3. 초기 상태: 선택된 행이 없으므로 우측 미리보기에 `EmptyState`(`FileText`) "파일을 선택하면 본문을 미리 볼 수 있습니다" 확인.
4. 검색 input에 제목 일부("삼성전자") 입력 → 목록 필터링 확인.
5. 행 클릭(예: "0001") → `aria-selected="true"` + `bg-muted` 강조, 우측 미리보기가 제목/언론사 배지/본문 출처 배지
   ("원문 전문" 또는 "피드 요약")/수집시각/본문(`whitespace-pre-wrap`)으로 갱신되는지 확인 — 이 단계에서 018A DoD
   "함께 갱신"이 완결된다(요약 카드는 018A, 목록/미리보기는 018B).
6. 원문 링크 버튼(`target="_blank" rel="noopener noreferrer"`, `sr-only` "새 창에서 원문 기사 열기") 존재 확인 —
   실제 새 탭이 열리는지는 `browser_tabs`로 확인.
7. `browser_resize(375, 812)` → 목록(`ul[role="listbox"] > li[role="option"]` 안 `button`)과 미리보기가 세로로
   스택되는지, 선택 동작이 동일한지 확인.
8. 실패 run(성공18/실패6) 선택 → 요약 카드 실패 건수 강조 + `ErrorAlert`("일부 기사 수집에 실패했습니다") 노출,
   파일 목록은 성공 18건만 표시되는지 확인.
9. `[키워드 분석]` 클릭 → `/keywords?runId=...`로 URL은 이동하지만, 분석 화면이 아직 `ScreenPlaceholder`이므로 **run
   셀렉터가 그 값으로 선택돼 있는지는 이 시점에 확인할 수 없다** — 이월 항목으로 기록만 하고 스킵.
10. `browser_console_messages` 오류 0건.

### 접근성 확인

- 데스크톱 `TableRow`가 `tabIndex={0}` + `aria-selected`를 갖고 `Tab`으로 접근 가능.
- 모바일 `ul[role="listbox"] > li[role="option"] > button`.
- 본문 컨테이너 `aria-live="polite"` — DOM 속성 존재를 확인(스크린리더 실사용 확인은 이 도구 범위 밖).
- 원문 링크 `sr-only` 설명 텍스트 존재.

### 이월 항목

- DoD "`[키워드 분석]` 클릭 시 분석 화면의 run 셀렉터가 그 값으로 선택돼 있다" → **Task 022B 완료 회차**에 재확인
  (work 문서 명시, 주차로는 24주차 종료 지점).

---

## 커버리지 요약

| Task | ROADMAP DoD 총수 | 이 문서가 커버 | 커버 안 됨(이유) |
| --- | --- | --- | --- |
| 009A+009B (Task 009 전체) | 7 | 6 (①②③④⑥⑦) | 1개 — "활성→홈 반영"은 016A(→016B) 완료 회차로 이월 |
| 012A+012B (Task 012 전체) | 5 | 5 (전부) | 없음 |
| 016A (Task 016 중 이 워크스트림 담당분) | 5 | 2 (①②) + ③ 부분(선택→버튼 활성 전환까지만) | 3개 — 진행률 갱신·완료 이동·중단은 016B(크롤 파이프라인) 소관 컴포넌트가 필요해 이 워크스트림 시나리오 밖. **D-006 확정으로 ②는 "실행 버튼 비활성"까지 포함해 전부 016A 소관이 됐다**(이전 초안의 "1.5·부분 커버" 대비 정정) |
| 018A+018B (Task 018 전체) | 5 | 4 (①②③⑤) | 1개 — "`/keywords?runId=` 이동 후 run 셀렉터 선택"은 Task 022B 완료 회차로 이월 |

**009A와 018A는 "자기 자신의 DoD 항목"을 짚어 두었지만 실행 시점은 각각 009B·018B 완료 이후다**(공통 관찰 참고) —
표의 "커버"는 "이 문서가 단계를 설계해 두었다"는 뜻이지 "009A 단독으로 지금 실행 가능하다"는 뜻이 아니다.

---

## 남은 리스크·인계

- 이 문서는 아직 구현이 하나도 없는 시점(3일차)에 설계서·ROADMAP만 보고 짠 **사전 계획**이다. 실제 구현이 설계서의
  마크업 스켈레톤과 다르게 나올 경우(예: 셀렉터 이름, 컴포넌트 분할) 이 문서를 함께 갱신해야 한다.
- **D-006 반영(4일차)**: 016A·018A·012A는 "자기 조각만으로는 라우트에 온전히 도달할 수 없다"던 구조적 제약이
  `docs/DECISIONS.md`의 **D-006**으로 해소됐다 — `page.tsx`를 만드는 조각이 짝 조각의 컴포넌트 파일을 이미 만들어
  import해 두고, 짝 조각은 그 파일의 내부 구현만 채운다. 특히 **Task 016**은 경계가 구체적으로 확정됐다: 016A가
  `crawl-run-panel.tsx`에 `[크롤링 시작]` 버튼의 idle·`disabled` 껍데기까지 만들고, 016B가 같은 파일에 진행·완료·실패
  전환을 이어붙인다. 해당 Task가 실제로 열리는 회차의 담당자는 이 문서의 "이 절에서 다룸" 표와 "D-006 확정" 문구를
  먼저 확인한다.
- 발견한 설계서 ↔ ROADMAP DoD 불일치는 `docs/ISSUES.md`의 **I-004**로 등재됐고 **D-006으로 해결됨** 처리됐다
  (009A/009B 파일 경계, Task 016 실행 패널 소유 불일치, 012A/012B의 `stopword-add-card.tsx` 배선 주체 불명확, 018A/018B의
  우측 패널 초기 모습 미정의 — 네 건 모두 D-006 규칙 하나로 정리됐다).
