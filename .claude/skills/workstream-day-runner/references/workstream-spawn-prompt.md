# 워크스트림 소환 / 재검증 프롬프트 템플릿

팀장이 `Agent(subagent_type: "general-purpose", model: "sonnet")` 로 워크스트림 담당 에이전트를
소환할 때와, 검증 이후 `SendMessage`로 수정·재검증을 요청할 때 쓰는 문구다.
`<...>` 자리를 회차 실제 값으로 채운다.

**배정 단위는 사람이 아니라 업무 영역이다.** 프롬프트에 인물 이름을 넣지 않는다.

---

## A. 최초 소환 프롬프트

```
너는 이 프로젝트의 <AREA> 워크스트림 담당이다(문서: docs/ROADMAP/work/<NN.AREA>.md).
이번은 <N>일차 작업이다.

[읽기 범위 — 반드시 지킬 것]
- docs/ROADMAP/work/<NN.AREA>.md (너의 영역 정의와 담당 Task)가 기준 문서다.
- 다른 워크스트림의 docs/ROADMAP/work/* 문서는 읽지 마라.
- **[상시 허용] 아래 다섯은 이 프롬프트에 해당 블록이 붙어 있지 않아도 스스로 판단해서 읽어라.**
  참조를 빠뜨리는 것이 범위를 넘는 것보다 나쁘다.
  1) **담당 Task의 docs/ROADMAP.md `### Task NNN` 블록은 반드시 읽어라.** 「생성/수정 파일」·
     「구현 규칙」·「완료 조건 (DoD)」이 거기에만 있다. work 문서에는 제목·공수·의존만 있어서,
     이걸 안 읽으면 무엇을 만들지도 무엇으로 완료를 판정하는지도 모른 채 착수하게 된다.
     **읽기만 하고 절대 편집하지 마라** — 완료 체크·진행률 갱신은 회차 마감에 팀장이 일괄 반영한다
     (동시편집 충돌 방지, SKILL.md 4단계 2항).
  2) **work 문서에서 네 Task의 `참조:` 줄에 적힌 문서는 종류를 불문하고 전부 읽어라**
     (docs/PRD.md · docs/kiwi-verification.md · docs/screens/* 등). 그 줄이 이 Task의 필수 입력이다.
  3) **docs/CONVENTIONS.md 는 항상 읽어라.** 디렉터리·명명·식별자·서버 전용 코드·응답 형식·화면
     규약의 단일 소스다. 규약과 충돌하는 판단이 필요하면 혼자 정하지 말고 draft 이슈로 올려라.
  4) 화면·레이아웃·컴포넌트 마크업을 만들거나 고친다 → docs/screens/README.md 와 00-app-shell.md,
     그리고 네가 건드리는 화면의 docs/screens/NN-*.md
  5) App Router 구조(라우트·폴더 구성, layout/page/loading/error/default/route 파일, 서버·클라
     경계, 메타데이터)에 손댄다 → .claude/agents/dev/nextjs-app-developer.md
  이 허용은 여기까지다. 다른 워크스트림의 work 문서를 여는 근거가 되지 않는다.
- 프로젝트 공통 규약(CLAUDE.md / AGENTS.md)은 항상 따른다: Next.js 관련 코드 전에
  node_modules/next/dist/docs/ 의 설치본 문서를 먼저 읽어라. 구현 방식은 docs/CONVENTIONS.md 를 따른다.

[네 영역의 경계]
- 범위: <영역 정의 표의 「범위」 행>
- 범위 밖: <영역 정의 표의 「범위 밖」 행 — 다른 워크스트림 몫이므로 손대지 마라>

[이번 회차 담당 Task]
- <Task 번호와 제목 목록, 각 Task의 산출물 요약>

[선행 조건]
- <이 워크스트림이 이어받는 선행 산출물이 있으면 그 경로/내용과 산출한 영역명을 명시. 없으면 "없음">

[화면(UI) 작업 — 참조 문서]   ※ 담당 Task가 화면/마크업 작업일 때만 붙인다. 아니면 이 블록을 통째로 뺀다.
- docs/screens/README.md 를 먼저 읽어라. 라우트 ↔ 파일 ↔ 화면 문서 매핑표와 화면별 shadcn 컴포넌트
  목록이 여기 있다. 네가 만들 파일 경로와 라우트는 이 표를 그대로 따른다.
- docs/screens/00-app-shell.md 를 반드시 함께 읽어라 — 헤더·내비게이션·컨테이너·토스트는 모든
  페이지 공유분이다.
- 네 Task가 건드리는 화면의 문서만 추가로 읽어라: <이번 Task에 해당하는 docs/screens/NN-*.md 목록>
- 이 설계서가 정적 마크업·레이아웃의 단일 소스다. 문서에 있는 요소·상태·라벨을 빠뜨리지 말고,
  문서에 없는 UI를 임의로 만들지 마라. 설계서가 요구사항과 어긋나 보이면 혼자 고치지 말고
  docs/ISSUES.draft.<AREA>.md 에 올려라.
- 설계서는 로직·상태 관리·데이터 페칭을 다루지 않는다. 그 부분은 docs/ROADMAP.md 해당 Task 블록의
  「구현 규칙」과 docs/CONVENTIONS.md 를 따른다. 설계서에 없다고 로직을 생략해도 된다는 뜻이 아니다.
- 새 shadcn 컴포넌트 설치가 필요하면 직접 설치하지 말고 보고에 적어라 — 설치는 팀장이 일괄 처리한다.

[Next.js 구조 작업 — 참조 문서]   ※ App Router 구조에 손대는 Task일 때만 붙인다. 아니면 빼라.
- .claude/agents/dev/nextjs-app-developer.md 를 읽어라. 파일 컨벤션(layout/page/loading/
  error/not-found/default/route), 라우트 그룹·병렬·인터셉트 라우트, 서버·클라이언트 경계,
  메타데이터 설계 원칙을 여기서 가져온다.
- 그 문서 앞부분의 「⚠️ Next.js 16 기준 — 15에서 달라진 것」 표를 먼저 읽어라. 네 훈련 데이터에 남은
  15 시절 패턴을 그대로 쓰면 빌드가 깨진다. 특히: middleware.ts 가 아니라 proxy.ts, 병렬 라우트
  슬롯마다 default.tsx 필수, params·searchParams·cookies()·headers() 는 반드시 await,
  revalidateTag 는 2인자.
- 버전 우선순위: 그 지침서도 낡을 수 있다. API 시그니처·기본값·동작이 어긋나면
  node_modules/next/dist/docs/ 의 설치본 문서가 언제나 이긴다. 지침서에서는 구조 설계 원칙을 취하고,
  버전에 걸린 세부 API는 설치본 문서로 확인해라. 둘이 다르면 지침서대로 쓰지 말고 어긋난 지점을
  docs/ISSUES.draft.<AREA>.md 에 남겨라.
- 타입체크는 tsc 단독이 아니라 `npm run typecheck`(= next typegen && tsc --noEmit)로 돌려라.
  PageProps/LayoutProps/RouteContext 생성 타입이 있어야 검사가 성립한다.

[산출물]
- 코드/컴포넌트는 <경로>에 만든다. 경로는 docs/ROADMAP.md 해당 Task 블록의 「생성/수정 파일」과
  docs/CONVENTIONS.md §2 디렉터리 표를 따른다. 이 저장소에 src/ 디렉터리는 없다 — 라우트는 루트 app/ 직하다.
- 페이지 골격은 components/common/{page-container,page-header,empty-state,error-alert} 를 **호출**한다.
  같은 마크업을 화면마다 다시 그리지 마라. 내부 이동은 next/link 를 쓴다 —
  app/ 하위의 raw <a href="/..."> 는 lint error다 (docs/CONVENTIONS.md §8).
- 새 이슈·결정은 번호 없이 docs/ISSUES.draft.<AREA>.md · docs/DECISIONS.draft.<AREA>.md 에
  쓴다. `### I-NNN` / `### D-NNN` 새 헤딩을 직접 붙이지 마라 (SKILL.md 0-1절).
  번호 부여와 docs/ISSUES.md · docs/DECISIONS.md 본문 병합은 회차 마감에 팀장이 한다 —
  그 두 파일을 직접 열어 append하지 마라.

[보고]
- 작업을 마치면 (1) 완료한 Task 번호, (2) 만든/수정한 파일 경로 목록,
  (3) **DoD 자기 점검 결과 — docs/ROADMAP.md 「완료 조건 (DoD)」 체크박스를 하나씩 대조해
  항목별로 충족/미충족을 적고, 미충족이면 무엇이 남았는지 한 줄씩**,
  (4) 남은 리스크나 다음 회차로 넘길 사항을 요약해 반환하라. 이 반환값이 곧 팀장 보고 내용이다.
- **DoD를 "대체로 됐다"로 뭉뚱그리지 마라.** 팀장과 리뷰 상대는 이 목록으로 완료를 판정한다.
  화면·API Task는 DoD에 적힌 Playwright MCP 동선을 실제로 태운 결과까지 적는다.
```

---

## B. 이슈 수정 요청 (SendMessage — 최초 소환한 같은 에이전트에)

```
[<N>일차 교차검증 이슈] 리뷰 상대인 <REVIEWER_AREA> 워크스트림이 아래를 지적했다.
수정하고 결과를 보고하라.
- <이슈 1: 파일:라인 또는 컴포넌트 + 무엇이 규약/요구사항 어디에 어긋나는지>
- <이슈 2 ...>
수정 후 (1) 고친 파일, (2) 각 이슈를 어떻게 해소했는지 한 줄씩 반환하라.
```

---

## C. 재검증 요청 (SendMessage — 리뷰 상대 에이전트에)

```
[<N>일차 재검증] <AREA> 워크스트림이 아래 이슈를 수정했다. 다시 교차검증하고
이슈 해소 여부를 항목별로 pass/fail 로 답하라. 새 이슈가 보이면 함께 적어라.
- <해소했다고 보고된 이슈 목록>
```

---

## 채우는 값 안내

- `<NN.AREA>` = `docs/ROADMAP/work/` 파일명 그대로. 예: `01.공통기반`, `02.수집크롤링`.
  **실행 때마다 디렉터리를 나열해 확인한다 — 영역명을 이 문서에 박아 두지 않는다.**
- `<AREA>` = 그 파일의 영역명(번호 뗀 부분).
- `<REVIEWER_AREA>` = 해당 워크스트림 문서 「영역 정의」 표의 `리뷰 상대` 행에 적힌 영역
  (그 영역이 이번 회차에 비활성이면 활성 워크스트림 중 담당과 다른 영역).
- Task 번호·산출물은 1단계에서 산정한 이번 회차 배치에서 가져온다.
- **참조 문서 블록 두 개는 팀장이 Task 성격을 보고 붙이거나 뺀다**(SKILL.md 0-2절). 판단 기준:
  - `[화면(UI) 작업]` — 페이지·레이아웃·컴포넌트의 마크업/스타일을 만들거나 고치는 Task.
    붙일 때 `docs/screens/README.md` 매핑표에서 **그 Task가 건드리는 화면 문서 경로를 팀장이 찾아
    적어 준다** — 에이전트가 알아서 고르게 두지 않는다.
  - `[Next.js 구조 작업]` — 라우트·폴더 구성, `layout.tsx`/`page.tsx`/`loading.tsx`/`error.tsx`/
    `route.ts` 등 파일 컨벤션, 서버·클라이언트 경계, 메타데이터, 병렬·인터셉트 라우트에 손대는 Task.
  - 둘 다 해당하면 둘 다 붙인다(예: 새 페이지를 라우트째 만드는 Task). 해당 없으면 둘 다 뺀다.
  - **버전 문구는 실행 시점 설치본을 확인해 갱신한다** — `node -p "require('./node_modules/next/package.json').version"`.
    지침서의 기준선(Next.js 16)과 메이저가 달라졌으면 그 사실을 블록에 적어 보내고, 회차 마감에
    `.claude/agents/dev/nextjs-app-developer.md` 갱신을 draft 이슈로 남긴다.
