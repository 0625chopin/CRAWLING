# IT/AI 뉴스 핫 키워드 크롤러 — 개발 로드맵

체크박스로 고른 언론사에서 IT/AI 기사를 긁어 txt로 모으고, Kiwi 형태소 분석으로 조사를 걷어낸 뒤 빈도를 세어 **핫 키워드 랭킹**을 뽑는 로컬 단일 사용자 테스트 도구를 완성하기 위한 실행 계획서입니다.

- 요구사항 원본: [`docs/PRD.md`](./PRD.md)
- 형태소 분석 실측 검증: [`docs/kiwi-verification.md`](./kiwi-verification.md)
- 화면 설계서: [`docs/screens/README.md`](./screens/README.md) 및 `00`~`05` 문서
- 코드 규약(디렉터리·명명·구현 방식의 단일 소스): [`docs/CONVENTIONS.md`](./CONVENTIONS.md)
- 결정 대장(`D-NNN`): [`docs/DECISIONS.md`](./DECISIONS.md) — 착수 후 새로 내린 결정을 번호로 쌓는다
- 이슈 대장(`I-NNN`): [`docs/ISSUES.md`](./ISSUES.md) — 회차 중 발견한 결함·미결을 번호로 쌓는다

이 문서는 **스코프(무엇을 만드는가)의 단일 소스**다. "어떻게 쓰는가"는 `docs/CONVENTIONS.md`가 갖는다. 두 문서가 충돌하면 구현 방식은 규약 문서가, 범위는 이 문서가 이긴다.

> **수집 방식 결정 (반영 완료)** — 언론사마다 `sourceType: 'rss' | 'html'`을 골라 **RSS 피드 파싱**과 **목록 페이지 파싱**을 모두 지원한다. RSS가 기사 URL을 정확히 주므로 셀렉터 오탐으로 잡링크가 딸려 오는 문제가 사라지고, RSS를 제공하지 않는 매체도 계속 수용할 수 있다. Press는 `sourceType`을 판별자로 갖는 zod `discriminatedUnion`이며, 이 결정은 Task 004·006·008·009·010·013에 반영되어 있다.

---

## 📊 현재 상태 (as-is)

| 영역 | 상태 | 실체 |
|------|------|------|
| 프레임워크 | ✅ 완료 | Next.js 16.3.0(App Router) · React 19.2.8 · TypeScript 5 · Tailwind v4 |
| UI 키트 | ✅ 완료 | shadcn/ui (`radix-nova` / `neutral`) — 화면 설계서가 요구한 13종 추가 설치까지 끝남 |
| 앱 셸 | ✅ 완료 | `app/layout.tsx` + `components/layout/*` + `components/theme-provider.tsx` (헤더·5메뉴·모바일 Sheet·다크모드·Toaster) |
| 공통 컴포넌트 | ✅ 완료 | `components/common/{page-container,page-header,empty-state,error-alert,screen-placeholder}.tsx` |
| 라우트 | 🟡 껍데기 | 5개 라우트 존재하나 전부 `<ScreenPlaceholder>`만 렌더링 |
| 크롤러 | 🟡 범용 페처 | `lib/crawler/*` 는 "URL → 렌더된 HTML"까지만. **언론사 개념·RSS 파싱·목록 순회·본문 추출·txt 저장 없음** |
| 형태소 분석 | 🟡 검증만 완료 | 모델 배치(105MB) 및 동작 검증 완료. 정식 구현(`lib/keyword/`)은 없고 임시 라우트 `app/api/kiwi-check/route.ts`만 존재 |
| 저장소 | ❌ 없음 | `data/press-sources.json` · `data/stopwords.json` · `data/runs/*` 전부 미구현 |
| API | ❌ 없음 | `app/api/crawl/route.ts`는 임의 URL 배치 크롤용(제품 기능 아님) |
| 테스트 | 🟡 러너만 준비 | `vitest` 설치 완료 · `npm run test`(`lib/**/*.test.ts`, `passWithNoTests: true`) 추가 완료. **테스트 파일은 아직 0건** — Task 004·005·007·020이 채운다 |
| 패키지 | ✅ 설치 완료 | `fast-xml-parser`(RSS) · `server-only`(서버 전용 경계) · `vitest`(순수 함수 테스트)가 이미 `package.json`에 있다. 추가 설치가 필요하면 직접 설치하지 말고 보고한다 |

> DB·인증은 **의도적으로 없습니다**(PRD "MVP 이후 기능"). 이 로드맵은 그 전제를 유지합니다.

---

## 🗺️ 전체 진행률 요약

| Phase | 범위 | Task | 완료 | 상태 |
|-------|------|------|------|------|
| **Phase 0** | 완료된 기반 (프로젝트 골격·앱 셸·Kiwi 검증) | 3 (001–003) | 3 | ✅ 완료 |
| **Phase 1** | 도메인 타입 + 파일 저장소 계층 | 4 (004–007) | 4 | ✅ 완료 |
| **Phase 2** | 언론사·불용어 레지스트리 (API + 화면) `F007` `F008` | 5 (008–012) | 5 | ✅ 완료 |
| **Phase 3** | 크롤 파이프라인 (실행·진행·저장) `F001` `F002` `F003` | 4 (013–016) | 4 | ✅ 완료 |
| **Phase 4** | 수집 결과 조회 `F003` `F004` | 2 (017–018) | 2 | ✅ 완료 |
| **Phase 5** | 형태소 분석 · 키워드 랭킹 `F005` `F006` | 4 (019–022) | 3 | 🟡 진행 중 |
| **Phase 6** | 정리 · 문서 정정 · 전체 검증 | 3 (023–025) | 0 | ⬜ 대기 |
| **합계** | | **25** | **21** | **84%** |

의존 흐름은 아래 한 줄이 전부입니다.

```
저장소 계층 → 언론사/불용어 CRUD → 크롤 파이프라인 → 수집 결과 조회 → 키워드 분석 → 마무리
  (Phase 1)      (Phase 2)          (Phase 3)         (Phase 4)      (Phase 5)   (Phase 6)
```

Phase 2 이후로는 **각 Phase 안에서 "API Task → 화면 Task" 순서**로 묶었습니다. 화면 마크업은 이미 설계서에 TSX 스켈레톤이 통째로 있어서 UI를 먼저 짜는 이득이 없고, 오히려 API 응답 형태가 확정된 뒤 붙이는 편이 재작업이 적습니다.

---

## 🧰 개발 환경 준비 (신규 합류 시 1회)

`.gitignore`가 `/data`를 통째로 제외하므로 **저장소를 clone하면 Kiwi 모델이 없습니다.** 아래를 먼저 수행해야 Phase 5 작업과 키워드 분석 화면이 동작합니다.

```bash
npm install                              # fast-xml-parser·server-only·vitest 포함 — 별도 설치할 것이 없다
npx playwright install chromium          # 크롤링용 헤드리스 브라우저
cp .env.example .env.local               # 동시성·타임아웃·UA 등 조정

# Kiwi 모델 — 패키지 버전(0.23.0)과 정확히 같은 버전이어야 한다
curl -L -o kiwi_model.tgz \
  https://github.com/bab2min/Kiwi/releases/download/v0.23.0/kiwi_model_v0.23.0_base.tgz
tar -xzf kiwi_model.tgz                  # models/cong/base/ 아래에 풀린다
mkdir -p data/kiwi-model
cp models/cong/base/* data/kiwi-model/   # 9개 파일 105MB
```

| 확인 항목 | 기대값 |
|-----------|--------|
| `data/kiwi-model/` 파일 수 | 9개 (`combiningRule.txt` `cong.mdl` `default.dict` `dialect.dict` `extract.mdl` `multi.dict` `nounchr.mdl` `sj.morph` `typo.dict`) |
| 모델 버전 | `v0.23.0` — 경량 v0.21.0(34MB)은 `build()` 실패, 대체 불가 |
| 모델 위치 | `data/kiwi-model/` — **`public/`에 두지 말 것** (브라우저가 105MB를 내려받게 됨) |
| 여유 RAM | 최소 2GB (Kiwi 인스턴스 1개당 RSS +780MB) |
| `npm run test` | 테스트 파일이 0건이어도 `passWithNoTests`로 통과한다(`vitest.config.ts`). 여기서 실패하면 러너 설정이 깨진 것이므로 Task 착수 전에 고친다 |

---

## 🧭 작업 진행 규칙

1. **작업 계획** — 착수 전 `ROADMAP.md`의 해당 Task와 참조 문서(`docs/CONVENTIONS.md` / PRD / 화면 설계서 / kiwi-verification)를 먼저 읽는다.
2. **작업 구현** — Task의 "생성·수정 파일"과 "구현 규칙"을 벗어나지 않는다. 규칙과 충돌하는 판단이 필요하면 혼자 정하지 말고 **`docs/ISSUES.draft.<AREA>.md`에 올린다** — 이 문서의 §결정 필요 사항을 직접 고치지 않는다(번호 부여와 병합은 회차 마감에 팀장이 한다).
3. **검증** — 각 Task의 완료 조건(DoD)을 위에서부터 하나씩 체크한다. 화면·API Task는 **Playwright MCP로 실제 브라우저에서 동선을 태워 확인**하며, **이 확인을 통과해야 완료로 판정한다** — 코드가 컴파일된 것은 완료 조건이 아니다.
4. **로드맵 갱신은 팀장 몫이다** — 완료 반영(`- [ ]` → `- [x]` · 진행률 요약 표 · Phase 제목)은 **회차 마감에 팀장이 일괄 수행**한다. 워크스트림은 이 문서를 **읽기만 하고 편집하지 않는다.** 한 회차에 여러 Task가 동시에 도는데 각자가 같은 표를 고치면 편집이 서로를 덮어쓴다. 완료 사실은 워크로그와 회차 보고로 올린다.
5. **회차 단위로 진행한다** — 한 회차에 선행이 풀린 Task들을 함께 굴리고, **회차 마감 후 다음 지시를 기다린다.** Task 하나마다 멈추지 않는다. 회차 운영 절차(소환·교차검증·마감)는 `.claude/skills/workstream-day-runner/SKILL.md`에 있다.

---

## Phase 0: 완료된 기반 ✅

이미 코드에 반영되어 있는 부분입니다. 새로 할 일은 없고, 이후 Task의 **기준선**으로만 참조합니다.

### Task 001 · 프로젝트 초기 구성 및 범용 크롤러 골격

- [x] 완료 &nbsp;|&nbsp; 기능 ID: — &nbsp;|&nbsp; 선행: 없음
- **결과물**: `lib/crawler/{browser,config,fetch-html,parse,run,types,index}.ts`, `app/api/crawl/route.ts`, `next.config.ts`(`serverExternalPackages: ['playwright','kiwi-nlp']`), `.env.example`, npm scripts(`dev`/`build`/`start`/`lint`/`format`/`typecheck`)
- **남긴 한계**: 지금의 크롤러는 "URL → 렌더된 HTML"만 돌려주는 범용 페처다. 언론사 단위 오케스트레이션은 Task 013에서 그 위에 얹는다.

### Task 002 · 공통 앱 셸 및 5개 라우트 스캐폴딩

- [x] 완료 &nbsp;|&nbsp; 기능 ID: — &nbsp;|&nbsp; 선행: Task 001
- **결과물**: `app/layout.tsx`, `components/theme-provider.tsx`, `components/layout/{site-header,main-nav,mobile-nav,nav-items,theme-toggle}.tsx`, `components/common/{page-container,page-header,empty-state,error-alert,screen-placeholder}.tsx`, 5개 라우트(`/`, `/results`, `/keywords`, `/press`, `/stopwords`), shadcn 13종 추가 설치
- **남긴 한계**: 5개 페이지 모두 `<ScreenPlaceholder>`만 렌더링한다. 각 화면 Task가 이를 실제 화면으로 교체한다.

### Task 003 · Kiwi 형태소 분석 파이프라인 사전 검증

- [x] 완료 &nbsp;|&nbsp; 기능 ID: `F005` 사전 검증 &nbsp;|&nbsp; 선행: Task 001
- **결과물**: `data/kiwi-model/`(9파일 105MB), `app/api/kiwi-check/route.ts`(임시 스모크 라우트), [`docs/kiwi-verification.md`](./kiwi-verification.md)
- **확정 사실**: `build()` 1.4초 · 기사 1건 10ms · RSS +780MB · 조사 제거 후 토큰 57.8% 감소
- **남긴 한계**: `app/api/kiwi-check/route.ts`는 정식 구현(`lib/keyword/`) 완료 후 **삭제 대상**(Task 023).

**Phase 0 완료 기준** — 달성됨: `npm run dev` 후 5개 메뉴가 모두 열리고, `GET /api/kiwi-check`가 키워드 JSON을 돌려준다.

---

## Phase 1: 도메인 타입 + 파일 저장소 계층 ✅

**목표** — PRD 데이터 모델 5종(Press / CrawlRun / Article / KeywordCount / Stopword)을 `fs` 위에 그대로 앉히고, 이후 모든 Task가 파일 경로를 직접 만지지 않고 **레포지토리 함수만 호출**하도록 만든다. PRD가 "데이터가 쌓이면 저장소 구현체만 교체"를 명시했으므로, 이 Phase의 산출물이 그 교체 지점이다.

### Task 004 · 도메인 타입 및 zod 스키마 정의

- [x] 완료 (1일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F001`~`F008` 공통 &nbsp;|&nbsp; 선행: 없음 (즉시 착수 가능)
- **결과물**: `lib/types/{press,crawl-run,article,keyword,stopword,index}.ts`, `lib/types/press.test.ts`(거부 케이스 9건)
- **남긴 한계**: `lib/types/keyword.ts`에 `keywordRankItemSchema`를 계획 외로 추가했다 — DoD 5번이 `KeywordRankItem` 대체 가능성을 명시적으로 요구해서다. 저장 스키마(`keywordCountSchema`)와 분리한 화면 파생 뷰다. `lib/crawler/types.ts`는 검토 후 수정하지 않았다(근거는 `docs/DECISIONS.md`). Stopword 단건/일괄은 공통 판별자 키가 없어 `discriminatedUnion` 대신 `z.union` + 각 분기 `strictObject`로 처리했다.
- **참조**: `docs/PRD.md` §데이터 모델, `docs/screens/04-press-manage.md`(PressSource 인터페이스), `docs/screens/03-hot-keyword.md`(PosTag·AnalysisSummary·KeywordRankItem)
- **생성/수정 파일**
  - `lib/types/press.ts` — **`pressSchema` = `z.discriminatedUnion('sourceType', [rssPressSchema, htmlPressSchema])`**
    - 공통: `id` / `name` / `sourceType` / `isActive`
    - `rss`: `feedUrl` + `contentSelector`(**선택** — 있으면 원문 전문 수집, 없으면 피드 요약만)
    - `html`: `listUrl` / `articleLinkSelector` / `titleSelector` / `contentSelector`(모두 필수)
    - 파생: `pressCreateSchema` / `pressUpdateSchema`
  - `lib/types/crawl-run.ts` — `crawlRunSchema`(id/targetPressIds/startedAt/finishedAt/successCount/failCount/status) + `crawlStartRequestSchema`(pressIds, maxArticlesPerPress)
  - `lib/types/article.ts` — `articleSchema`(id/pressId/runId/title/url/content/**contentSource**/crawledAt). `contentSource: 'rss-summary' | 'article-page'`
  - `lib/types/keyword.ts` — `PosTag = 'NNG' | 'NNP' | 'SL'`, `keywordCountSchema`, `analysisSummarySchema`
  - `lib/types/stopword.ts` — `stopwordSchema`(id/word/isDefault) + `stopwordCreateSchema`(단건·일괄)
  - `lib/types/index.ts` — 재수출
  - `lib/crawler/types.ts` (수정) — `crawlTargetSchema`에 언론사 크롤에 필요한 필드 추가 여부만 검토, 범용 스키마는 유지
  - `lib/types/press.test.ts` (신규) — `discriminatedUnion` 거부 케이스 회귀 확인(vitest, Q4 결정)
- **구현 규칙**
  - **zod 스키마를 단일 원천으로 삼고 타입은 `z.infer`로 파생**한다. 인터페이스를 손으로 또 쓰지 않는다(`lib/crawler/types.ts`의 기존 패턴 유지).
  - Press는 반드시 **`discriminatedUnion`** 으로 쓴다. `z.union`이나 "전부 optional인 평평한 객체 + 수동 검사"로 만들지 않는다. 판별자가 있어야 ① 방식에 맞는 가지만 검증되고 ② 소비 지점에서 `press.sourceType === 'html'` 한 줄로 타입이 좁혀져 `press.articleLinkSelector` 접근이 안전해진다. 전부 optional로 두면 Task 013의 오케스트레이터가 매번 `!` 단언을 쓰게 된다.
  - RSS의 `contentSelector`는 **존재 여부가 곧 "원문 전문을 수집할지"의 의사 표현**이다. 별도 boolean 플래그를 두지 않는다(플래그와 셀렉터가 어긋난 상태를 만들 수 없게 함). 화면의 "본문 전문 수집" 스위치는 이 필드를 채울지 비울지를 정하는 UI 장치일 뿐이다.
  - 시각 필드(`startedAt`/`finishedAt`/`crawledAt`)는 **ISO 8601 문자열**로 고정한다. `Date` 객체를 JSON에 넣지 않는다.
  - `id` 규칙: Press = 슬러그(소문자·영숫자·하이픈), CrawlRun = `YYYYMMDD-HHmmss`, Article = 4자리 제로패딩 순번(`0001`), **Stopword = `sw-` + 4자리 제로패딩 순번(`sw-0001`)**. `nanoid`·`uuid`는 **도입하지 않는다** — `nanoid`는 postcss 경유 transitive 의존이라 import해도 빌드가 통과해 **미선언 의존성이 조용히 들어온다.** 로컬 단일 사용자 도구에는 순번으로 충분하고, 순번이면 파일 목록이 사람이 읽는 순서로 정렬된다(`docs/CONVENTIONS.md` §식별자 규칙).
  - `CrawlRun.status`는 `'running' | 'done' | 'partial-failed' | 'failed' | 'aborted'` — 화면 설계서 01의 `crawlStatus` 상태값과 1:1로 맞춘다.
- **완료 조건 (DoD)**
  - [ ] PRD 데이터 모델 표의 **모든 필드**가 스키마에 1:1로 존재한다(누락 필드 0개). Press는 공통 4필드 + RSS 2필드 + HTML 4필드.
  - [ ] `sourceType: 'rss'`인 입력에 `articleLinkSelector`를 넣어도 통과하지 않는다(엄격 모드로 미지의 키를 거부하거나, 최소한 저장 시 제거된다). **거부 케이스는 눈으로 확인할 수 없으므로 `lib/types/press.test.ts`에 케이스로 남기고 `npm run test`로 판정한다.**
  - [ ] `sourceType: 'html'`인 입력에서 셀렉터 3개 중 하나라도 비면 검증이 실패한다(같은 테스트 파일에서 확인).
  - [ ] `npm run typecheck` · `npm run test` 통과.
  - [ ] `docs/screens/03-hot-keyword.md`·`04-press-manage.md`의 TSX 스켈레톤에 선언된 인터페이스(`PressSource`, `RssPressSource`, `HtmlPressSource`, `KeywordRankItem`, `AnalysisSummary`)를 이 타입으로 대체할 수 있다(필드명·옵셔널 여부 일치).

### Task 005 · 파일 저장소 공통 기반 (경로 · 원자적 쓰기 · 시드)

- [x] 완료 (2일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F003` `F007` `F008` 공통 &nbsp;|&nbsp; 선행: Task 004
- **결과물**: `lib/storage/{paths,json-store,index}.ts`, `lib/storage/paths.test.ts`(경로 순회 차단 17건 포함 23건)
- **남긴 한계**: 계획에 없던 두 가지를 교차검증 지적으로 추가했다 — `runsRootDir()`(Task 007의 `listRuns()`가 `data/runs/`를 `paths.ts` 밖에서 조립하지 않게)와 `atomicWriteFile(path, content)`(기사 txt도 같은 크래시 안전성을 재사용하도록 temp→rename 핵심부를 분리). 크래시 시 남는 orphan `.tmp` 정리는 부팅 시점 루틴이 필요해 보류했다(`docs/ISSUES.md` I-002).
- **참조**: `docs/PRD.md` §데이터 모델 "현재 저장 위치" 컬럼, `.gitignore`(`/data` 제외)
- **생성/수정 파일**
  - `lib/storage/paths.ts` — `DATA_ROOT`, `pressSourcesPath()`, `stopwordsPath()`, `runDir(runId)`, `runMetaPath(runId)`, `articlesDir(runId)`, `articlePath(runId, articleId)`, `keywordsPath(runId)`
  - `lib/storage/json-store.ts` — `readJson<T>(path, schema, fallback)` / `writeJson(path, value)` / `ensureDir(path)`
  - `lib/storage/index.ts`
  - `lib/storage/paths.test.ts` (신규) — 경로 순회 차단 회귀 확인(vitest, Q4 결정)
- **구현 규칙**
  - **경로 문자열은 이 파일 밖에서 조립하지 않는다.** DB 전환 시 갈아끼울 지점을 한 곳으로 모으기 위함이다.
  - `writeJson`은 **원자적 쓰기**로 구현한다 — 임시 파일에 쓰고 `fs.rename`으로 교체. 백그라운드 크롤 잡이 `run-meta.json`을 쓰는 동안 화면이 같은 파일을 읽으므로, 부분 기록된 JSON이 노출되면 안 된다.
  - `readJson`은 **파일이 없으면 fallback을 기록하고 반환**한다(`data/`가 git에 없으므로 첫 실행에서 항상 없음). 파싱 실패 시에는 조용히 덮어쓰지 말고 에러를 던진다 — 사용자가 손으로 편집한 JSON을 날리면 안 된다.
  - 모든 함수는 **서버 전용**이다. 파일 최상단에 **`import 'server-only'`를 둔다**(패키지 설치 완료). 주석으로 대신하지 않는다 — 주석은 클라이언트 import를 막지 못하고, `server-only`는 클라이언트 번들에 딸려 들어가는 순간 빌드를 실패시킨다. `lib/storage/`·`lib/keyword/`·`lib/crawler/` 전체에 같은 규칙이 적용된다(`docs/CONVENTIONS.md` §서버 전용 코드).
  - 경로 조립에 사용자 입력(runId·articleId)이 들어가므로 **경로 순회(`..`, 절대경로) 차단 검증**을 넣는다.
- **완료 조건 (DoD)**
  - [ ] `data/`가 없는 상태에서 앱을 실행해도 첫 접근 시 디렉터리와 시드 파일이 자동 생성된다.
  - [ ] `writeJson` 도중 프로세스를 강제 종료해도 기존 파일이 깨지지 않는다(임시 파일만 남음).
  - [ ] `runId`에 `../` 를 넣은 요청이 `DATA_ROOT` 밖을 가리키지 못한다. **`lib/storage/paths.test.ts`에 `..`·절대경로·`%2e%2e` 케이스를 남기고 `npm run test`로 판정한다** — 화면에서는 통과 여부가 보이지 않는 종류다.
  - [ ] `npm run typecheck` · `npm run test` 통과.

### Task 006 · 언론사 · 불용어 레포지토리

- [x] 완료 (3일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F007` `F008` &nbsp;|&nbsp; 선행: Task 005
- **결과물**: `lib/storage/{press-repository,stopword-repository,press-defaults,stopword-defaults}.ts`, `lib/storage/{press-repository,stopword-repository}.test.ts`
- **남긴 한계**: 한글 전용 언론사명은 슬러그가 빈 문자열이 되는 문제가 드러나, `pressCreateSchema`에 **선택 필드 `id`** 를 추가하고 미지정 시에만 슬러그 폴백을 태우도록 바꿨다(`docs/DECISIONS.md` D-005). `getStopwordSet()`은 원본 대소문자를 그대로 담는다 — 대소문자 무시 매칭이 필요하면 Task 020A에서 정한다.
- **참조**: `docs/PRD.md` §Press·§Stopword, `docs/kiwi-verification.md` §6(불용어 근거·`이번` 추가 권고), `docs/screens/05-stopword-manage.md`
- **생성/수정 파일**
  - `lib/storage/press-repository.ts` — `listPress({ activeOnly })` / `getPress(id)` / `createPress(input)` / `updatePress(id, patch)` / `deletePress(id)` / `setPressActive(id, isActive)`
  - `lib/storage/stopword-repository.ts` — `listStopwords()` / `addStopword(word)` / `addStopwords(words[])` / `deleteStopword(id)` / `getStopwordSet()`
  - `lib/storage/stopword-defaults.ts` — 기본 프리셋 상수
  - `lib/storage/press-defaults.ts` — 초기 시드(빈 배열 또는 예시 1건)
- **구현 규칙**
  - **기본 불용어 프리셋** = PRD 명시분 `기자` `사진` `제공` `앵커` `무단전재` `재배포금지` **+ kiwi-verification §6 실측 추가분** `이번`. 프리셋 항목은 `isDefault: true`로 저장한다.
  - Press `id`는 이름에서 슬러그를 만들되 **중복 시 접미 숫자**를 붙인다. 이미 생성된 `id`는 변경 불가(저장된 기사 txt가 참조 중 — 화면 설계서 04 §④ 참고).
  - **`updatePress`에서 `sourceType`이 바뀌면 반대쪽 방식의 필드를 남기지 않는다.** patch를 기존 객체에 얕게 병합하면 `sourceType: 'rss'`인데 `articleLinkSelector`가 남아 있는 잡종 레코드가 생긴다. 방식이 바뀐 경우 **새 방식의 스키마로 레코드를 다시 만들어** 저장한다(부분 병합이 아니라 교체).
  - `listPress({ activeOnly })`가 돌려주는 항목은 방식이 섞여 있다. 정렬은 **이름 기준 하나만** 쓴다 — 방식별로 묶어 정렬하지 않는다(화면 설계서 04 상태 ①).
  - 불용어 추가는 **대소문자·앞뒤 공백 정규화 후 중복 검사**한다. 중복이면 저장하지 않고 "이미 등록됨"을 값으로 돌려준다(화면 설계서 05 상태 ④).
  - `getStopwordSet()`은 `Set<string>`을 반환한다 — Phase 5 집계에서 O(1) 조회로 쓴다.
  - 기본 프리셋도 **삭제 가능**하다(화면 설계서 05 결정). 삭제는 배열에서 제거하는 것이지 플래그를 끄는 것이 아니다 — 데이터 모델에 활성 플래그가 없다.
- **완료 조건 (DoD)**
  - [ ] `data/press-sources.json` / `data/stopwords.json`이 없을 때 첫 조회에서 자동 생성되고, 불용어 파일에는 기본 프리셋 **7건**(`이번` 포함)이 들어 있다.
  - [ ] 같은 이름으로 언론사를 2번 추가하면 서로 다른 `id`가 부여된다.
  - [ ] `html` 언론사를 `rss`로 수정하면 저장된 JSON에 `listUrl`·`articleLinkSelector`·`titleSelector`가 **남아 있지 않다**.
  - [ ] 이미 등록된 불용어를 다시 추가하면 파일이 변하지 않고 중복 사실이 반환값으로 구분된다.
  - [ ] 삭제한 기본 프리셋이 다시 살아나지 않는다(재조회 시 시드가 덮어쓰지 않음).

### Task 007 · 실행 · 기사 · 키워드 레포지토리 및 기사 txt 포맷

- [x] 완료 (3일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F003` `F004` `F005` &nbsp;|&nbsp; 선행: Task 005
- **결과물**: `lib/storage/{article-file,run-repository,article-repository,keyword-repository}.ts`, `lib/storage/article-file.test.ts`(왕복 회귀 14케이스)
- **남긴 한계**: 시각 필드를 `toISOString()`(UTC `Z`)으로 저장한다 — 서버와 브라우저가 같은 로컬 머신이라 화면이 `Date`로 파싱만 하면 KST로 보이지만, **문자열을 슬라이싱해 시:분을 뽑으면 9시간 어긋난다**(`runId` 폴더명은 로컬 시각으로 조립되므로 raw 값끼리는 달라 보인다). `listRuns`/`listArticles`는 손상된 개별 파일을 조용히 건너뛴다(`docs/ISSUES.md` I-006). `ArticleMeta` 타입이 `lib/types/`가 아니라 `lib/storage/article-file.ts`에 있다(I-007).
- **참조**: `docs/PRD.md` §CrawlRun·§Article·§KeywordCount, `docs/screens/02-collect-result.md`(파일 목록·본문 미리보기가 요구하는 필드)
- **생성/수정 파일**
  - `lib/storage/article-file.ts` — txt 직렬화 `serializeArticle(article): string` / 역직렬화 `parseArticle(text, { runId, articleId }): Article`
  - `lib/storage/run-repository.ts` — `createRun(targetPressIds)` / `listRuns()` / `getRun(runId)` / `updateRunMeta(runId, patch)` / `finishRun(runId, counts)`
  - `lib/storage/article-repository.ts` — `saveArticle(runId, article)` / `listArticles(runId)` / `readArticle(runId, articleId)`
  - `lib/storage/keyword-repository.ts` — `readKeywords(runId)` / `writeKeywords(runId, payload)` / `hasKeywords(runId)`
  - `lib/storage/article-file.test.ts` (신규) — txt 직렬화·역직렬화 왕복 회귀 확인(vitest, Q4 결정)
- **구현 규칙**
  - **기사 txt 포맷을 여기서 확정한다.** 상단 메타 라인 + 빈 줄 + 본문:
    ```
    # id: 0001
    # runId: 20260810-143205
    # pressId: etnews
    # title: 삼성전자, HBM4 메모리 양산 돌입
    # url: https://www.etnews.com/news/2026081000123
    # contentSource: article-page
    # crawledAt: 2026-08-10T14:33:10+09:00

    삼성전자가 차세대 HBM4 메모리 양산에 돌입했다고 10일 밝혔다.
    ...
    ```
  - **제목·URL은 저장 전에 개행을 제거**한다. 메타 라인에 개행이 섞이면 파싱이 깨진다.
  - **`contentSource` 메타 라인은 필수다.** 한 실행에 RSS 요약(수백 자)과 원문 전문(수천 자)이 섞이면 전문을 수집한 언론사의 단어가 빈도 상위를 차지한다. 나중에 이 편향을 확인하려면 기사별로 어느 쪽인지 남아 있어야 한다(PRD §Article 참고).
  - `listArticles(runId)`는 화면 설계서 02의 목록 표와 미리보기가 필요로 하는 필드(파일명·언론사·제목·본문 출처·수집 시각)만 뽑는다. **본문을 읽지 않는다** — 기사 수백 건에서 목록 조회가 느려지지 않게, 메타 라인까지만 스트리밍하거나 파일 앞부분만 읽는다.
  - `keywords.json` 구조는 `{ runId, analyzedAt, summary: AnalysisSummary, items: KeywordCount[] }`. `items`는 **불용어·1글자 필터까지 적용한 전체 집계**를 담고, 최소 등장 횟수·품사·Top N은 담지 않는다(사유는 Task 021).
  - `createRun`은 `runId`를 `YYYYMMDD-HHmmss`(로컬 시각)로 만들고 **충돌 시 초 단위 뒤에 접미 숫자**를 붙인다.
- **완료 조건 (DoD)**
  - [ ] `serializeArticle` → `parseArticle` 왕복에서 모든 필드가 원본과 일치한다. **제목·URL에 콜론·`#`가 포함된 경우는 원본 그대로 왕복하고, 개행이 포함된 경우는 위 구현 규칙대로 공백으로 치환된 값과 일치한다**(메타 라인은 한 물리 줄이라 개행을 보존하려면 이스케이프 포맷이 필요한데, 제목은 크롤 단계에서 이미 개행이 걸러져 오고 화면 설계서 02도 제목을 단일 행으로만 쓴다 — 3일차 교차검증 판정). **`lib/storage/article-file.test.ts`에 이 케이스들을 남기고 `npm run test`로 판정한다** — 왕복이 깨져도 화면은 멀쩡해 보인다.
  - [ ] 본문에 빈 줄이 섞인 기사를 왕복시켜도 **문단 개행이 그대로 살아 있다**(Task 013이 개행을 보존해 저장하므로 저장 계층이 그것을 접으면 안 된다).
  - [ ] 기사 200건이 저장된 run에서 `listArticles`가 본문을 읽지 않고 목록을 돌려준다.
  - [ ] `listRuns()`가 최신 실행부터 정렬되어 반환된다(화면 설계서 02의 셀렉터 기본값 = 최신 run).
  - [ ] `npm run typecheck` · `npm run test` 통과.

**Phase 1 완료 기준 (Exit Criteria)**
- `data/press-sources.json`·`data/stopwords.json`이 자동 생성되고, 임의의 run 폴더에 기사 txt를 쓰고 다시 읽어 동일한 객체가 나온다.
- 이후 Task가 `fs`를 직접 import하지 않아도 되는 상태 — 파일 경로 문자열은 `lib/storage/paths.ts`에만 존재한다.

---

## Phase 2: 언론사 · 불용어 레지스트리 (API + 화면) — `F007` `F008` ✅

**목표** — 크롤링과 분석이 참조할 **입력 데이터**를 화면에서 관리할 수 있게 만든다. 이 Phase를 크롤링보다 먼저 두는 이유는 명확하다. 크롤링 실행 화면의 체크박스 목록이 언론사 데이터를 요구하고, 키워드 집계가 불용어 데이터를 요구한다. 둘 다 없으면 Phase 3~5를 손으로 검증할 방법이 없다.

### Task 008 · 언론사 CRUD API

- [x] 완료 (5일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F007` &nbsp;|&nbsp; 선행: Task 006
- **결과물**: `app/api/press/route.ts`(008A · 4일차), `app/api/press/[id]/route.ts`(008B · 5일차), `lib/api/response.ts`
- **남긴 한계**: 오류 경계를 `withErrorBoundary`로 공용화했다(`docs/DECISIONS.md` D-008). **DoD ④(DELETE 후 `data/runs/*` 무손상)는 코드로만 확인했다** — 검증 시점에 `data/runs/`가 비어 있어 실측하지 못했고, Task 013B가 실제 run을 만든 회차에 재확인한다.
- **참조**: `docs/PRD.md` §언론사 관리 페이지, `docs/screens/04-press-manage.md`
- **생성/수정 파일**
  - `app/api/press/route.ts` (신규) — `GET`(목록, `?active=true` 필터) / `POST`(추가)
  - `app/api/press/[id]/route.ts` (신규) — `GET` / `PATCH`(수정·활성 토글) / `DELETE`
  - `lib/api/response.ts` (신규) — `ok(data)` / `fail(message, status)` 공통 응답 헬퍼
- **구현 규칙**
  - **`runtime` export를 두지 않는다.** Node.js가 기본 런타임이므로 `fs` 접근이 있어도 선언이 필요 없고, Next.js 16에서 Edge 런타임이 폐기되면서 설치본 문서가 이 export의 제거를 지시한다(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md`). 기존 라우트 2건에서도 제거 완료했다.
  - 요청 본문은 Task 004의 zod 스키마로 검증하고, 실패 시 **필드별 한국어 메시지**를 400으로 돌려준다(화면 설계서 04 상태 ⑥의 필드 하단 오류 문구에 그대로 쓰인다). `discriminatedUnion`이므로 오류 메시지도 **보낸 `sourceType`의 가지에 대한 것**이어야 한다 — RSS로 보냈는데 "기사 링크 셀렉터를 입력하세요"가 나오면 안 된다.
  - `PATCH`로 `sourceType`이 바뀌는 요청은 **전체 필드를 다시 받는다**(부분 patch 불가). 방식이 바뀌면 필요한 필드 집합 자체가 달라져 부분 갱신이 성립하지 않는다.
  - 활성 토글은 별도 엔드포인트를 만들지 않고 `PATCH { isActive }`로 처리한다. 이때는 `sourceType`이 바뀌지 않으므로 부분 patch가 허용된다.
  - `GET`(목록)은 저장된 원본에 더해 **`sourceUrl` 파생 필드**(RSS면 `feedUrl`, HTML이면 `listUrl`)를 함께 내려준다. 크롤링 실행 화면(01)의 체크박스 목록은 방식과 무관하게 URL 한 줄만 필요하고, 이 분기를 화면마다 반복하지 않기 위함이다.
  - **동적 세그먼트 `params`는 Promise다.** `const { id } = await params` 형태로 받는다. 정확한 시그니처는 `node_modules/next/dist/docs/`의 라우트 핸들러 문서를 확인하고 쓸 것(이 프로젝트의 Next.js는 학습 데이터와 다를 수 있음 — `AGENTS.md`).
  - 삭제는 언론사 레지스트리에서만 지운다. **이미 수집된 기사·실행 결과는 건드리지 않는다**(화면 설계서 04 §⑤ 삭제 다이얼로그 문구와 동작이 일치해야 함).
- **완료 조건 (DoD)**
  - [ ] `GET /api/press?active=true`가 `isActive: true`인 언론사만 반환하고, 각 항목에 `sourceUrl`이 채워져 있다.
  - [ ] 필수 필드를 비운 `POST`가 400과 함께 어떤 필드가 문제인지 알려주고, 그 필드가 **보낸 `sourceType`에 속한 필드**다.
  - [ ] `sourceType: 'rss'` + `feedUrl`만으로 `POST`하면 성공한다(셀렉터 없이 등록 가능).
  - [ ] `DELETE` 후 `data/runs/*` 하위 파일이 하나도 삭제되지 않는다.
  - [ ] Playwright MCP로 `/api/press`에 GET/POST/PATCH/DELETE를 순서대로 태워 상태 코드와 응답 본문을 확인한다.

### Task 009 · 언론사 관리 화면

- [x] 완료 (6일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F007` &nbsp;|&nbsp; 선행: Task 008
- **결과물**: `app/press/page.tsx`, `components/press/{press-table,press-card-list,source-type-badge,press-form-dialog,delete-press-dialog}.tsx`, `lib/api/press-client.ts`
- **남긴 한계**: 「활성 토글을 끄면 홈 체크박스 목록에서 사라진다」는 홈이 실제 화면이 돼야 확인된다 — **Task 016B 완료 회차로 이월**. 조각 경계는 D-011대로 009B가 `page.tsx`를 소유했다.
- **진행 메모(5일차)**: 009A(목록 표·카드 리스트·방식 배지 `components/press/{press-table,press-card-list,source-type-badge}.tsx` + `lib/api/press-client.ts`) 완료(5일차). 조각 009B(`app/press/page.tsx`·추가/수정/삭제 다이얼로그)가 남아 이 블록은 체크하지 않는다. **`page.tsx`가 009B 몫이라 `/press`는 아직 `ScreenPlaceholder`이고, 009A의 DoD는 009B 완료 회차에 함께 태운다**(D-006).
- **참조**: `docs/screens/04-press-manage.md` (전 절 — 특히 "상태별 화면" ①~⑦, "접근성", "마크업 스켈레톤")
- **생성/수정 파일**
  - `app/press/page.tsx` (수정 — `ScreenPlaceholder` 제거)
  - `components/press/press-table.tsx` (신규 — 데스크톱 표 + 방식 배지 + 수집 설정 펼침 서브 행)
  - `components/press/press-card-list.tsx` (신규 — `md:` 미만 카드 리스트)
  - `components/press/press-form-dialog.tsx` (신규 — `mode="create" | "edit"` 공용 + **방식별 조건부 필드**)
  - `components/press/source-type-badge.tsx` (신규 — 표·카드·크롤링 실행 화면이 함께 쓰는 방식 배지)
  - `components/press/delete-press-dialog.tsx` (신규)
  - `lib/api/press-client.ts` (신규 — 클라이언트 fetch 래퍼)
- **구현 규칙**
  - **설계서 스켈레톤은 단일 파일 통짜다.** 위 「생성/수정 파일」의 경계대로 쪼개 구현하되 **마크업·라벨·상태는 설계서를 그대로 옮긴다** — 경계만 다시 긋는 것이지 화면을 다시 설계하는 것이 아니다.
  - 페이지 골격은 `components/common/{page-container,page-header,empty-state}`를 **호출**한다(설계서 스켈레톤이 같은 마크업을 직접 그리더라도 컴포넌트를 쓴다). 오류 표시는 `error-alert`를 쓴다.
  - **내부 이동은 `next/link`**. `app/` 하위의 raw `<a href="/...">`는 `@next/next/no-html-link-for-pages` **error**로 `npm run lint`를 실패시킨다. shadcn `Button`은 `asChild`로 `Link`를 감싼다.
  - lucide 아이콘은 **신 별칭**으로 통일한다: `LoaderCircle` `CircleCheckBig` `CircleX` `TriangleAlert` `Ban`. 구 별칭(`Loader2` `CheckCircle2` `XCircle` `AlertTriangle`)은 쓰지 않는다.
  - 표/카드 전환 기준은 **`md`(768px)** 다. README 기본값 `sm`이 아니다(설계서 §1 결정 근거).
  - **수집 방식 토글이 폼의 첫 필드**이고, 값이 바뀌면 아래 필드 블록을 통째로 교체한다. 반대쪽 필드를 `disabled`로 남겨 두지 않는다(설계서 §0 결정).
  - 방식 전환 시 **새 블록의 첫 입력으로 포커스를 옮기고**, 반대쪽 방식에서 남아 있던 검증 오류 표시를 지운다. 시각적으로는 명백한 변화지만 스크린리더에는 조용한 변화다.
  - RSS의 "본문 전문 수집" 스위치는 `contentSelector`를 채울지 비울지를 정한다. **켠 상태에서 셀렉터가 비면 저장을 막는다.**
  - 수집 설정 펼침 버튼은 `aria-expanded` + `aria-controls="press-selectors-{id}"`를 실제 상태와 연동한다. **RSS(요약만) 행은 펼칠 내용이 없으므로 버튼을 렌더링하지 않는다** — 눌러도 아무 일이 없는 컨트롤을 만들지 않는다.
  - 방식 배지는 아이콘(`Rss`/`Globe`)에 `aria-hidden`을 주고 텍스트("RSS"/"HTML")를 실제 내용으로 남긴다.
  - 아이콘 전용 버튼(수정·삭제·펼침)의 `aria-label`에 **언론사명을 포함**한다. 같은 아이콘이 행마다 반복되므로 이름 없이는 구분이 불가능하다.
  - 활성 스위치는 색상만으로 상태를 전달하지 않는다 — "활성"/"비활성" 텍스트를 항상 병기한다.
  - 저장·삭제 성공/실패는 `sonner` 토스트로 알린다.
  - 상태별 화면 7종(기본/빈 상태/추가/수정/삭제 확인/검증 오류/로딩)을 모두 구현한다.
- **완료 조건 (DoD)**
  - [ ] `app/press/page.tsx`에서 `ScreenPlaceholder` import와 사용이 **완전히 제거**되었다.
  - [ ] 언론사 0건일 때 `Newspaper` 아이콘 빈 상태가 뜨고, 여기서 추가하면 목록으로 바뀐다.
  - [ ] 방식 토글을 RSS ↔ 목록 페이지로 왕복하면 필드 블록이 교체되고, 반대쪽 방식의 오류 표시가 남지 않는다.
  - [ ] RSS 언론사 1곳(요약만) · RSS 언론사 1곳(본문 전문) · HTML 언론사 1곳을 등록했을 때 목록의 `수집 설정` 컬럼이 각각 `피드 요약만`(텍스트) · `본문 셀렉터 ▸`(버튼) · `셀렉터 3개 ▸`(버튼)로 나온다.
  - [ ] 활성 토글을 끄면 홈(`/`)의 체크박스 목록에서 해당 언론사가 사라진다(Task 016 완료 후 재확인).
  - [ ] Playwright MCP로 추가 → 수정 → 활성 토글 → 삭제를 연속 수행하고, 각 단계 후 `data/press-sources.json`이 실제로 바뀌는 것을 확인한다.
  - [ ] 375px / 768px / 1280px 폭에서 레이아웃이 깨지지 않는다(Playwright MCP `browser_resize`).

### Task 010 · RSS 피드 파서 + 소스 테스트 API + 폼 연동

- [x] 완료 (7일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F007` &nbsp;|&nbsp; 선행: Task 009
- **진행 메모**: 010A(RSS 피드 파서 `lib/crawler/rss.ts`) 완료(2일차) · 010B(소스 테스트 API·폼 연동) 완료(7일차). 두 조각이 모두 끝나 이 블록을 체크한다. `fetchFeed`는 실패를 예외가 아니라 `CrawlFailure` 값으로 돌려준다(`docs/DECISIONS.md` D-003).
- **남긴 한계**: `lib/crawler/rss.ts`의 `toPlainText`가 `&apos;` 등 일부 HTML 엔티티를 걷어내지 못한다(I-011). 저장된 txt에 그대로 남아 키워드 추출 단계에 섞여 들어간다. 설계서 04의 "본문 전문 수집 스위치에 시각적 주의" 문장은 구체 스펙이 없어 구현하지 않았다(I-012).
- **참조**: `docs/screens/04-press-manage.md` §설계 결정 근거 3, §상태별 화면 ③-C(성공/실패 결과 Alert), `docs/PRD.md` §기술 스택 "RSS 경로에 대한 두 가지 전제"
- **의존성 주의**: 여기서 만드는 `lib/crawler/rss.ts`를 **Task 013의 크롤 오케스트레이터가 그대로 재사용**한다. 따라서 이 Task는 잘라낼 수 있는 부가 기능이 아니라 **Phase 3의 선행 조건**이다(결정 필요 사항 Q5 참고 — 잘라낼 수 있는 것은 테스트 UI뿐이다).
- **생성/수정 파일**
  - `lib/crawler/rss.ts` (신규) — `fetchFeed(feedUrl)` : 인코딩 판별 → 디코딩 → XML 파싱 → **RSS 2.0 / Atom 정규화** → `FeedItem[]`(`title`, `link`, `summary`, `publishedAt`)
  - `app/api/press/test-source/route.ts` (신규) — 방식별 분기
    - `POST { sourceType: 'rss', feedUrl }` → `{ count, avgSummaryLength, samples: { title, link }[] }`
    - `POST { sourceType: 'html', listUrl, articleLinkSelector }` → `{ count, samples: string[] }`
  - `components/press/source-test-panel.tsx` (신규)
  - `components/press/press-form-dialog.tsx` (수정 — 테스트 버튼·결과 영역 연결)
  - `package.json` — **수정할 것이 없다.** `fast-xml-parser`는 이미 설치되어 있다(D13). 다른 패키지가 필요해지면 직접 설치하지 말고 보고한다 — 동시 편집 충돌을 막기 위해 회차 단위로 팀장이 일괄 처리한다.
- **구현 규칙**
  - **RSS 경로는 Playwright를 쓰지 않는다.** XML에는 JS 렌더링이 없으므로 `fetch`로 충분하다. 브라우저를 띄우면 아무 이득 없이 요청당 수 초가 추가된다.
  - **인코딩을 직접 처리한다.** 국내 언론사 피드 중 일부는 EUC-KR로 내려온다. `res.text()`에 맡기면 UTF-8로 디코딩되어 한글이 깨진다. `Content-Type` 헤더와 XML 선언(`<?xml ... encoding="..."?>`)에서 charset을 읽어 `ArrayBuffer` → `TextDecoder(charset)`로 디코딩한다. **이 단계를 우리가 통제하려고 `rss-parser` 대신 `fast-xml-parser`를 골랐다.**
  - **RSS 2.0과 Atom을 하나의 `FeedItem`으로 정규화한다.** RSS는 `<item>`/`<pubDate>`/`<description>`, Atom은 `<entry>`/`<updated>`/`<summary>`(또는 `<content>`), 링크도 Atom은 `<link href>` 속성이다. 이 차이를 파서 밖으로 새어 나가게 하지 않는다.
  - `summary`는 **HTML 태그를 제거한 평문**으로 만든다. 피드 요약에는 `<![CDATA[...]]>`와 `<img>`·`<a>`가 흔히 섞여 있고, 그대로 두면 키워드 집계에 태그 조각이 들어간다.
  - HTML 경로는 **기존 유틸 재사용**이다. `fetchHtml` → `loadDocument` → `extractLinks($, listUrl, selector)`. 새 파싱 로직을 쓰지 않는다.
  - 테스트 범위는 **RSS는 피드 URL, HTML은 기사 링크 셀렉터**까지다. 제목·본문 셀렉터 테스트는 폼에 없는 "테스트용 기사 URL" 입력이 필요해 MVP 밖이다(설계서 결정).
  - 응답 샘플은 **최대 3건 + 총 개수**만 돌려준다. RSS는 여기에 **`avgSummaryLength`(요약 평균 길이)** 를 더한다 — 사용자가 "본문 전문 수집"을 켤지 판단하는 유일한 근거이므로 빠뜨리면 안 된다.
  - 결과 영역은 `role="status" aria-live="polite"`로 감싸고, 요약 평균 길이는 **텍스트로** 노출한다(색상·아이콘으로만 강약을 주지 않는다).
  - **`runtime` export를 두지 않는다.** Node.js가 기본 런타임이므로 선언이 필요 없고, Next.js 16에서 Edge 런타임이 폐기되면서 설치본 문서가 제거를 지시한다(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md`). 이 라우트는 페이지 1장만 열므로 요청 안에서 끝내도 무리가 없고, 별도 실행 시간 선언도 필요 없다.
- **완료 조건 (DoD)**
  - [ ] **EUC-KR로 내려오는 피드**에서 제목이 깨지지 않는다. (UTF-8 피드와 EUC-KR 피드를 각각 1개씩 확인)
  - [ ] RSS 2.0 피드와 Atom 피드가 **같은 `FeedItem` 형태**로 나온다(호출부가 형식을 구분할 필요가 없다).
  - [ ] `summary`에 `<p>`·`<img>`·`CDATA` 잔여물이 남지 않는다.
  - [ ] 피드 테스트가 기사 건수·요약 평균 길이·샘플 3건을 돌려주고, 요약 평균이 200자 미만이면 화면에 "본문 전문 수집 권장" 문구가 나온다.
  - [ ] 올바른 셀렉터에서 링크 개수와 샘플 URL이 나오고, 틀린 셀렉터에서 "0개 발견" destructive Alert가 나온다.
  - [ ] XML이 아닌 응답(HTML 404 페이지 등)·접근 불가 URL·타임아웃에서 프로세스가 죽지 않고 실패 Alert로 끝난다.
  - [ ] Playwright MCP로 실제 언론사 피드 1곳과 목록 페이지 1곳을 대상으로 성공/실패 케이스를 각각 확인한다.

### Task 011 · 불용어 CRUD API

- [x] 완료 (4일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F008` &nbsp;|&nbsp; 선행: Task 006
- **결과물**: `app/api/stopwords/route.ts`, `app/api/stopwords/[id]/route.ts`
- **남긴 한계**: 없음. Playwright MCP로 GET·POST(단건·중복·배열형 일괄·문자열형 일괄)·DELETE(정상·404)를 태워 상태 코드와 `data/stopwords.json`을 대조했다.
- **참조**: `docs/PRD.md` §불용어 관리 페이지, `docs/screens/05-stopword-manage.md`
- **생성/수정 파일**
  - `app/api/stopwords/route.ts` (신규) — `GET`(전체) / `POST`(단건 또는 `{ words: string[] }` 일괄)
  - `app/api/stopwords/[id]/route.ts` (신규) — `DELETE`
- **구현 규칙**
  - 일괄 추가는 **쉼표·줄바꿈 분리 → trim → 빈 문자열 제거 → 중복 제거**를 서버에서 한 번 더 수행한다(클라이언트 파싱을 신뢰하지 않는다).
  - 응답은 `{ added: Stopword[], skipped: string[] }` 형태로, 중복 때문에 건너뛴 단어를 화면이 그대로 안내할 수 있게 한다.
  - 기본 프리셋(`isDefault: true`) 삭제도 허용한다. 서버는 막지 않고, **확인 절차는 화면 책임**이다(설계서 05 결정).
- **완료 조건 (DoD)**
  - [ ] `POST { word: "기자" }`(이미 존재)가 파일을 변경하지 않고 `skipped`에 담아 돌려준다.
  - [ ] `POST { words: "앵커, 특파원\n인턴기자" }` 형태의 일괄 입력이 3건으로 분리 저장된다.
  - [ ] 기본 프리셋 삭제 후 재조회에서 되살아나지 않는다.
  - [ ] Playwright MCP로 GET/POST(단건·일괄)/DELETE를 태워 응답과 `data/stopwords.json`을 대조한다.

### Task 012 · 불용어 관리 화면

- [x] 완료 (6일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F008` &nbsp;|&nbsp; 선행: Task 011
- **결과물**: `app/stopwords/page.tsx`, `components/stopwords/{stopword-chip,stopword-section,stopword-add-card}.tsx`, `lib/api/stopword-client.ts`
- **남긴 한계**: 없음. 5일차 교차검증이 짚은 로딩 스켈레톤 편차(설계서 05 §⑦)를 012B 회차에 함께 정리했다.
- **진행 메모(5일차)**: 012A(`app/stopwords/page.tsx`에서 `ScreenPlaceholder` 제거 + `components/stopwords/{stopword-chip,stopword-section}.tsx` + `lib/api/stopword-client.ts`) 완료(5일차). 조각 012B(추가·일괄·검색 동선)가 남아 이 블록은 체크하지 않는다. `stopword-add-card.tsx`는 D-006대로 정적 뼈대만 두었다.
- **참조**: `docs/screens/05-stopword-manage.md` (전 절 — "상태별 화면" ①~⑦, "접근성", "마크업 스켈레톤")
- **생성/수정 파일**
  - `app/stopwords/page.tsx` (수정 — `ScreenPlaceholder` 제거)
  - `components/stopwords/stopword-chip.tsx` (신규 — 기본 프리셋은 `AlertDialog` 경유, 사용자 추가는 즉시 삭제)
  - `components/stopwords/stopword-add-card.tsx` (신규 — 단일 입력 + 일괄 추가 disclosure)
  - `components/stopwords/stopword-section.tsx` (신규 — 기본/사용자 두 섹션 공용)
  - `lib/api/stopword-client.ts` (신규)
- **구현 규칙**
  - **설계서 스켈레톤은 단일 파일 통짜다.** 위 「생성/수정 파일」의 경계대로 쪼개 구현하되 **마크업·라벨·상태는 설계서를 그대로 옮긴다.**
  - 페이지 골격은 `components/common/{page-container,page-header,empty-state}`를 **호출**한다(설계서 스켈레톤이 같은 마크업을 직접 그리더라도 컴포넌트를 쓴다).
  - **내부 이동은 `next/link`**. `app/` 하위의 raw `<a href="/...">`는 `@next/next/no-html-link-for-pages` **error**로 `npm run lint`를 실패시킨다 — 아래 `[분석 페이지로 돌아가 재분석]` CTA가 여기 해당한다.
  - lucide 아이콘은 **신 별칭**으로 통일한다: `LoaderCircle` `CircleCheckBig` `CircleX` `TriangleAlert` `Ban`.
  - 컨테이너 폭은 **`max-w-3xl`** 이다(공통 규격 `max-w-6xl`의 명시적 예외 — 설계서 §설계 결정 요약).
  - 기본/사용자 구분은 **섹션 분리 + 배지 variant + `Lock` 아이콘** 3중으로 표시한다. 색상 단독 금지(WCAG 1.4.1).
  - 삭제 확인 다이얼로그는 **기본 프리셋에만** 뜬다. 사용자 추가 칩은 즉시 삭제하되 `aria-live` 영역으로 결과를 알린다.
  - 검색은 두 섹션에 동시에 적용하고, 결과가 없어도 **섹션 구조(제목 + 개수)는 유지**한다.
  - 헤더의 `[분석 페이지로 돌아가 재분석]` CTA는 `/keywords`로 이동한다(모바일에서 전체 폭 버튼).
- **완료 조건 (DoD)**
  - [ ] `app/stopwords/page.tsx`에서 `ScreenPlaceholder`가 제거되었다.
  - [ ] 중복 단어 입력 시 destructive Alert가 뜨고 목록은 변하지 않는다.
  - [ ] 일괄 추가 패널이 접힘 기본값이며, 토글의 `aria-expanded`가 실제 상태를 따른다.
  - [ ] 기본 프리셋 칩 삭제 시 확인 다이얼로그가 뜨고 초기 포커스가 "취소"에 있다.
  - [ ] Playwright MCP로 추가 → 일괄 추가 → 검색 → 삭제 동선을 확인하고, 375px 폭에서 칩이 정상 줄바꿈되는지 확인한다.

**Phase 2 완료 기준 (Exit Criteria)**
- 코드를 수정하지 않고 화면만으로 언론사를 등록·수정·삭제·활성 전환할 수 있다.
- 불용어를 화면에서 추가·일괄 추가·삭제할 수 있고, 기본 프리셋 7건이 보인다.
- `data/press-sources.json`에 실제 IT/AI 언론사 **최소 3곳**이 등록되어 있다 — Phase 3 검증에 필요한 실데이터이며, **RSS 방식과 HTML 방식이 모두 최소 1곳씩** 포함되어야 한다. 두 경로를 모두 태우지 않으면 Task 013의 분기가 검증되지 않는다.
- RSS 언론사 중 최소 1곳은 **본문 전문 수집(`contentSelector` 있음)** 으로 등록한다 — 세 번째 경로다.

---

## Phase 3: 크롤 파이프라인 — `F001` `F002` `F003` ✅

**목표** — 지금의 범용 페처와 Task 010의 RSS 파서를 **언론사 단위 오케스트레이터**로 감싸, "체크한 언론사 → (RSS 피드 또는 목록 페이지) → 기사 URL → 기사 본문 → txt 저장"을 한 번의 실행(run)으로 끝낸다. 진행 상태를 실시간으로 보여주는 것까지가 이 Phase다.

> ⚠️ **이 Phase의 핵심 제약** — 크롤은 수십 초에서 수 분이 걸린다. **요청 안에서 크롤을 끝내면 그동안 진행 상태를 조회할 방법이 없어 `F002`(실시간 진행 표시)가 성립하지 않고**, 브라우저 탭이 응답을 기다리는 동안 새로고침 한 번이면 실행이 통째로 유실된다. 따라서 **요청과 크롤의 수명을 분리한다.** Task 014·015가 이 제약을 정면으로 다룬다.
>
> 근거를 실행 시간 제한에서 찾지 않는다 — **`maxDuration`은 배포 플랫폼이 참고하는 값이고 `next dev`/`next start`에서는 아무것도 강제하지 않는다.** 설치본에서 이 이름이 나오는 곳은 세그먼트 설정을 읽어 매니페스트에 싣는 빌드 경로(`node_modules/next/dist/build/segment-config/app/app-segment-config.js` 등)와 타입 생성·TS 플러그인 검사(`node_modules/next/dist/server/lib/router-utils/typegen.js`, `.../server/typescript/rules/config.js`)뿐이고, **요청을 중단시키는 코드는 없다.** 이 문서 자신이 서버리스 배포 불가를 못 박았으므로(§MVP 범위 밖), 이 프로젝트에 60초 상한은 존재하지 않는다.

### Task 013 · 언론사 단위 크롤 오케스트레이터

- [x] 완료 (6일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F001` `F003` &nbsp;|&nbsp; 선행: Task 007, Task 008, **Task 010**(RSS 파서)
- **결과물**: `lib/crawler/article-parser.ts`(013A · 2일차), `lib/crawler/press-crawler.ts`(013B · 6일차), `lib/crawler/press-crawler.test.ts`
- **남긴 한계**: DoD ⑧(저장된 txt 본문에 개행 2개 이상)은 **저장 경로가 붙는 Task 014A/015A 회차로 이월**했다 — `press-crawler`는 저장소를 모르므로 파일을 쓰지 않는다. 반환하는 `ArticleDraft.content`에 개행이 보존되는 것은 실데이터로 확인했다(zdnet 9~11개 · inews24 9~13개).
- **진행 메모(2일차)**: 013A(기사 본문 수집·정제 `lib/crawler/article-parser.ts`) 완료(2일차). 조각 013B(언론사 방식 분기 오케스트레이터)가 남아 이 블록은 체크하지 않는다. DoD 8개 중 세 경로 수집·`contentSource` 기록·저장 txt 개행 확인은 013B로 이월했다.
- **참조**: `docs/PRD.md` §F001·§기술 스택, `lib/crawler/{fetch-html,parse,run,rss}.ts`, `docs/screens/01-crawl-run.md` §크롤링 옵션 노출 범위 결정
- **생성/수정 파일**
  - `lib/crawler/press-crawler.ts` (신규) — `crawlPress(press, options, hooks)` : `press.sourceType`으로 **기사 URL 수집 경로만 분기**하고 이후는 공통
    - `rss` → `fetchFeed(feedUrl)`(Task 010) → `FeedItem[]`. `contentSelector`가 없으면 **여기서 끝**(제목·요약을 그대로 `Article`로) / 있으면 각 `link`를 기사 본문 수집 단계로 넘긴다
    - `html` → 목록 URL 로드 → `extractLinks`로 기사 링크 추출 → 각 링크를 기사 본문 수집 단계로
    - 공통 기사 본문 수집 → `fetchHtml` → **제목은 `selectText`, 본문은 `article-parser.ts`** 로 파싱 → `Article` 반환
  - `lib/crawler/article-parser.ts` (신규) — 본문 추출·정제(스크립트·광고 텍스트 제거, **문단 개행 보존**, 최소 길이 검사)
  - `lib/crawler/index.ts` (수정 — 재수출)
- **구현 규칙**
  - **기존 유틸을 재사용한다.** `fetchFeed`(Task 010), `fetchHtml`(Playwright), `loadDocument`/`selectText`/`extractLinks`(cheerio), `runCrawl`의 `p-limit` 동시성 패턴. 새 HTTP 클라이언트나 파서를 도입하지 않는다.
  - **⚠️ `selectText`는 제목에만 쓴다.** `lib/crawler/parse.ts:15`의 `selectText`는 `.replace(/\s+/g, ' ')`로 **문단 개행까지 한 칸 공백으로 접는다.** 제목에는 맞지만 본문에 쓰면 기사 전체가 한 줄이 되고, txt로 저장된 뒤에는 원본 HTML이 없어 Task 018 시점에 되돌릴 수 없다(재크롤 외에 복구 수단이 없다). **본문은 `article-parser.ts`가 문단 단위로 텍스트를 모아 개행을 보존해 추출한다.** `docs/screens/02-collect-result.md`가 본문 미리보기를 `whitespace-pre-wrap`으로 규정한 것도 개행이 남아 있다는 전제다.
  - **분기는 "기사 URL을 어떻게 얻는가" 한 지점에만 둔다.** 그 이후(개수 제한, 본문 정제, 실패 격리, 진행 콜백, `Article` 생성)는 두 방식이 완전히 같은 코드를 탄다. 방식별로 함수를 통째로 복제하면 이후 규칙 변경이 한쪽에만 반영되는 사고가 난다.
  - **`contentSource`를 정확히 기록한다.** RSS 요약을 그대로 쓴 기사는 `'rss-summary'`, 원문 페이지에서 본문을 가져온 기사는 `'article-page'`. HTML 방식은 항상 `'article-page'`다.
  - `rss` + `contentSelector` 없음인 언론사는 **제목을 피드에서 가져온다.** `titleSelector`가 없는 이유가 이것이며, 원문 페이지를 열지 않으므로 Playwright 호출이 0회다.
  - RSS 요약만 수집하는 경우 **최소 길이 검사 기준을 따로 둔다.** 아래 "본문 100자 미만은 실패" 규칙을 그대로 적용하면 요약이 짧은 매체의 기사가 통째로 버려진다. 요약 경로의 하한은 **50자**로 낮춘다.
  - `maxArticlesPerPress` 기본값 **20**, 상한 100. 목록에서 추출한 링크를 이 개수로 자른 뒤 기사 크롤에 들어간다(화면 설계서 01 §③).
  - **동시성·지연·타임아웃·UA는 화면에 노출하지 않는다.** `lib/crawler/config.ts`(= `.env.local`) 값을 그대로 쓴다. 대상 서버 부담 방지용 안전장치이지 실행마다 바꿀 값이 아니다.
  - 기사 1건 실패는 **값으로 격리**한다(`CrawlFailure` 패턴 유지). 한 건의 실패가 언론사 전체나 실행 전체를 무너뜨리면 안 된다.
  - 본문이 비었거나 지나치게 짧으면(예: 100자 미만) **실패로 계산하고 저장하지 않는다** — 화면 설계서 02 상태 ⑤가 "실패한 기사는 목록에 표시되지 않는다"를 전제한다.
  - 진행 상황은 `hooks.onArticleDone(pressId, collected, target)` 콜백으로만 밖에 알린다. 이 모듈은 저장소·HTTP를 모른다.
- **완료 조건 (DoD)**
  - [ ] **HTML 언론사** 1곳에서 목록 → 링크 N개 → 기사 본문까지 뽑아낸다.
  - [ ] **RSS 언론사(요약만)** 1곳에서 기사가 수집되고, 그 과정에서 **Playwright가 한 번도 기동되지 않는다**.
  - [ ] **RSS 언론사(본문 전문)** 1곳에서 피드의 링크를 따라가 원문 본문이 수집되고, 같은 기사의 요약보다 본문이 길다.
  - [ ] 세 경우의 `Article.contentSource`가 각각 `article-page` / `rss-summary` / `article-page`로 기록된다.
  - [ ] 셀렉터가 틀린 언론사, 그리고 XML이 아닌 응답을 주는 피드에서 예외를 던지지 않고 "0건 수집 · 실패 사유" 형태의 결과를 반환한다.
  - [ ] 기사 1건이 타임아웃돼도 나머지 기사가 계속 수집된다.
  - [ ] `maxArticlesPerPress=5`로 호출하면 정확히 최대 5건까지만 요청한다(초과 요청 없음). RSS 피드가 30건을 줘도 5건만 처리한다.
  - [ ] **저장된 기사 txt 본문에 개행이 2개 이상 남아 있다**(원문 페이지에서 수집한 기사 기준). 한 줄로 뭉개져 있으면 `selectText`를 본문에 쓴 것이다.

### Task 014 · 실행 잡 관리자 (백그라운드 실행 · 진행 상태 · 중단)

- [x] 완료 (8일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F002` `F003` &nbsp;|&nbsp; 선행: Task 013
- **결과물**: `lib/crawler/run-manager.ts`(`startRun`·`getRunProgress`·`abortRun` + `globalThis` 잡 레지스트리) · `lib/types/crawl-run.ts`(`RunProgress`·`PressRunStatus`·`recovered`) · `lib/crawler/press-crawler.ts`(중단 훅 `isAborted` — 파일 목록 밖이지만 D-016이 014B 몫으로 명시한 "크롤 루프가 실제로 멈추는 것"의 실체가 여기 있다, D-019) · `lib/storage/run-repository.ts`(`RunNotFoundError`) · `lib/crawler/index.ts` · 회귀 `run-manager.test.ts`·`press-crawler.test.ts`
- **남긴 한계**: DoD ④⑤ 검증은 **mock 기반이다.** 실제 크롤을 걸고 [중단]을 누르는 라이브 확인은 실행 API(015A)가 없어 못 했다 — 015A 완료 회차에 Playwright MCP로 함께 태운다. 서버 재시작 복구 시 언론사별 상태는 메모리 전용 값이라 재구성할 수 없어 "기사를 하나라도 저장했으면 `done`"으로 근사하고, 그 사실을 `recovered` 플래그로 화면에 알린다(D-023). 예외는 문자열이 아니라 전용 클래스로 구분한다(D-022, I-016).
- **참조**: `docs/screens/01-crawl-run.md` §상태별 화면 ③④⑤, `docs/PRD.md` §F002
- **생성/수정 파일**
  - `lib/crawler/run-manager.ts` (신규) — `startRun(input)` / `getRunProgress(runId)` / `abortRun(runId)` / **`globalThis`에 붙인 잡 레지스트리**
  - `lib/types/crawl-run.ts` (수정 — `RunProgress` 타입 추가)
- **구현 규칙**
  - **요청과 크롤의 수명을 분리한다.** `startRun`은 `runId`를 만들고 `run-meta.json`(status: `running`)을 기록한 뒤 **즉시 반환**하고, 실제 크롤은 레지스트리에 담긴 비동기 잡으로 계속 돈다. 이 도구는 `next dev`/`next start`로 도는 **장수명 로컬 Node 프로세스**를 전제하므로(PRD §실행 환경) 이 방식이 성립한다. 서버리스 배포는 애초에 대상이 아니다.
  - **⚠️ 잡 레지스트리는 `globalThis`에 붙인다. 모듈 스코프 변수로 두지 않는다.** `next dev`의 HMR이 모듈을 다시 평가하면 모듈 스코프 값은 초기화되어 **진행 중인 잡이 통째로 사라지고**, 이후 `getRunProgress(runId)`가 방금 시작한 run을 "없음"으로 답한다. 같은 저장소의 `lib/crawler/browser.ts:5-11`이 정확히 이 문제(주석: "dev 모드의 HMR은 모듈을 다시 평가하므로 globalThis에 붙여야 인스턴스가 누적되지 않는다") 때문에 이미 `globalThis.__crawlerBrowser`를 쓴다. 같은 형태를 따른다.
    ```ts
    const globalForRuns = globalThis as unknown as { __crawlRuns?: Map<string, RunJob> }
    globalForRuns.__crawlRuns ??= new Map()
    ```
  - `RunProgress`는 화면 설계서 01이 요구하는 값을 정확히 담는다 — `overallPercent`, `currentPressName`, `currentCollected/currentTarget`, `pressStatuses: { pressId, name, status: 'waiting'|'running'|'done'|'failed', collected, target, failReason? }[]`.
  - **진행 상태는 메모리, 최종 결과는 파일**이다. 잡이 끝나면 `finishRun`으로 `run-meta.json`에 `finishedAt`·`successCount`·`failCount`·`status`를 기록한다. 서버가 재시작되어 메모리 상태가 날아가도 `run-meta.json`만으로 "이 실행은 어떻게 끝났는가"를 복구할 수 있어야 한다.
  - 서버 재시작 시 `status: 'running'`인 채로 남은 run은 **조회 시점에 `aborted`로 간주**한다(고아 run이 영원히 "진행 중"으로 보이는 것을 막는다).
  - 중단(`abortRun`)은 플래그를 세워 **다음 기사부터 요청하지 않게** 하고, 이미 수집한 기사는 그대로 저장한 뒤 `status: 'aborted'`로 마무리한다. 진행 중인 Playwright 페이지를 강제로 죽이지 않는다.
  - 동시에 여러 run을 시작하는 것은 막는다(로컬 1인 도구 + 브라우저 자원 공유). 이미 `running`인 run이 있으면 409로 거절한다.
- **완료 조건 (DoD)**
  - [ ] `startRun` 호출이 **1초 이내**에 `runId`를 반환한다(크롤 완료를 기다리지 않는다).
  - [ ] 크롤이 수 분 걸려도(60초를 훌쩍 넘겨도) 진행 상태 조회가 정상 동작하고 결과가 끝까지 저장된다.
  - [ ] **`next dev`에서 크롤이 도는 동안 소스 파일을 저장해 HMR을 일으켜도** 진행 상태 조회가 계속 같은 run을 답한다(레지스트리가 `globalThis`에 있는지 확인하는 조건이다).
  - [ ] 중단 후 `run-meta.json`의 `status`가 `aborted`이고, 중단 시점까지 수집한 기사 txt가 남아 있다.
  - [ ] 크롤 도중 서버를 재시작하면 해당 run이 "진행 중"이 아니라 중단된 실행으로 표시된다.

### Task 015 · 크롤 실행 API 및 진행 상태 전송

- [x] 완료 (9일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F001` `F002` &nbsp;|&nbsp; 선행: Task 014
- **결과물**: `app/api/crawl/route.ts`(전면 교체 — `POST` → 202 `{ runId }`, 비활성 언론사 400, 중복 실행 409) · `app/api/crawl/[runId]/route.ts`(GET 진행 상태) · `app/api/crawl/[runId]/abort/route.ts`(POST 중단) · `hooks/use-crawl-progress.ts`(1초 폴링). 015B는 8일차, 015A는 9일차에 완료했다.
- **남긴 한계**: 폴링은 오류 응답에도 멈추지 않고 종료 상태에서만 멈춘다(D-024 — 016A가 재검토). 예외 → 상태 코드 매핑은 전용 클래스로 한다(D-022·D-028). 기존 범용 배치 크롤 라우트는 걷어냈지만 그 뒤의 `lib/crawler/run.ts`의 `runCrawl`이 호출부 없는 죽은 코드로 남았다(I-018 — Task 023이 판단한다). **실크롤 검증에서 `failCount`가 중단으로 건너뛴 기사를 실패로 세는 것을 발견했다(I-017)** — 016B 착수 전에 닫아야 한다.
- **참조**: `docs/screens/01-crawl-run.md`, `app/api/crawl/route.ts`(현행)
- **생성/수정 파일**
  - `app/api/crawl/route.ts` (**전면 교체**) — `POST { pressIds, maxArticlesPerPress }` → `202 { runId }`
  - `app/api/crawl/[runId]/route.ts` (신규) — `GET` 진행 상태 폴링
  - `app/api/crawl/[runId]/abort/route.ts` (신규) — `POST` 중단
  - `hooks/use-crawl-progress.ts` (신규) — 폴링 훅
- **구현 규칙 — 실시간 전송 방식 결정: 폴링(1초 간격) 채택**
  - 근거 ①: 진행 상태는 이미 **`globalThis`에 붙인 메모리 레지스트리**(Task 014)에 있어 조회 비용이 사실상 0이다. 로컬 1인 사용자 환경에서 초당 1회 요청은 부담이 아니다.
  - 근거 ②: SSE 라우트는 응답이 열려 있는 동안 연결이 유지되므로 **`next dev`의 HMR·서버 재시작마다 끊긴 스트림을 되살리는 재연결 로직**이 필요하고, 개발 중 화면이 조용히 멈춰 있는 실패 모드를 만든다. 폴링은 매 요청이 독립적이라 다음 1초에 저절로 복구된다. (이전 판에 적혀 있던 "`maxDuration` 제약과 다시 씨름해야 한다"는 근거는 **철회한다** — `maxDuration`은 배포 플랫폼이 참고하는 값이고 `next dev`/`next start`에서는 아무것도 강제하지 않는다. 나머지 근거만으로 폴링 결론은 그대로 성립한다.)
  - 근거 ③: 화면이 요구하는 것은 "진행률 · 현재 언론사 · 언론사별 상태" 뿐이고, 1초 해상도로 충분하다. 토큰 단위 스트리밍 같은 요구가 없다.
  - **업그레이드 경로를 막지 않는다** — 진행 상태 읽기는 `getRunProgress(runId)` 하나를 통과하므로, 나중에 SSE로 바꿀 때 전송 계층만 갈아끼우면 된다.
  - 폴링은 `status`가 종료 상태(`done`/`partial-failed`/`failed`/`aborted`)가 되면 **즉시 멈춘다.** 무한 폴링 방지.
  - `POST /api/crawl`은 **202 Accepted**로 응답한다(작업 접수, 완료 아님).
  - 기존 범용 배치 크롤 라우트는 제거한다 — 화면에서 쓰이지 않고, 검증되지 않은 임의 URL을 크롤하는 엔드포인트를 남길 이유가 없다. 현행 `app/api/crawl/route.ts`는 이미 `runtime` export가 제거된 상태지만, 그것과 무관하게 **핸들러 본문은 통째로 교체**한다.
  - 새로 만드는 3개 라우트 어디에도 **`runtime` export를 두지 않는다**(Node.js가 기본 런타임 — `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md`).
- **완료 조건 (DoD)**
  - [ ] `POST /api/crawl`이 즉시 202와 `runId`를 반환하고, 그 시점에 `data/runs/{runId}/run-meta.json`이 이미 존재한다.
  - [ ] `GET /api/crawl/{runId}`를 1초 간격으로 호출하면 진행률과 언론사별 상태가 실제로 갱신된다.
  - [ ] 비활성 언론사 id를 섞어 보내면 400으로 거절된다.
  - [ ] 이미 실행 중인 상태에서 다시 `POST`하면 409가 반환된다.
  - [ ] Playwright MCP로 실제 언론사 2곳 크롤을 걸고 `browser_network_requests`로 폴링 요청·응답 흐름과 종료 후 폴링 중단을 확인한다.

### Task 016 · 크롤링 실행 화면 (홈)

- [x] 완료 (11일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F001` `F002` `F003` `F007` &nbsp;|&nbsp; 선행: Task 015, Task 009
- **결과물**: `app/page.tsx`(`ScreenPlaceholder` 제거) · `components/crawl/{press-select-card,crawl-run-panel,press-run-status-list}.tsx` · `lib/api/crawl-client.ts`. 016A(10일차)가 ①②⑥⑦과 `crawl-run-panel.tsx` 뼈대를, 016B(11일차)가 ③④⑤⑧ 내부를 채웠다. 016B는 D-011대로 `app/page.tsx`에 `onReset` 핸들러 한 개만 얹었다.
- **남긴 한계**: 화면이 폴링 응답만으로 완료 요약을 그리도록 `RunProgress`에 `successCount`·`failCount`·`skippedCount`를 추가했다(**D-034**). 서버 재시작 후 복구된 진행 상태는 언론사 실패를 표현하지 못해(**I-022**) 그 경우 언론사별 상세 대신 런 레벨 안내를 쓴다. `status: 'failed'`(전체 실패) 전용 화면 상태가 설계서에 없어 ⑤부분 실패 마크업을 재사용한다.
- **참조**: `docs/screens/01-crawl-run.md` (전 절 — "상태별 화면" ①~⑦, "접근성", "마크업 스켈레톤")
- **생성/수정 파일**
  - `app/page.tsx` (수정 — `ScreenPlaceholder` 제거)
  - `components/crawl/press-select-card.tsx` (신규 — 전체 선택 3단 상태 + `ScrollArea` 목록)
  - `components/crawl/crawl-run-panel.tsx` (신규 — 옵션·실행 버튼·진행·완료·부분 실패)
  - `components/crawl/press-run-status-list.tsx` (신규)
  - `lib/api/crawl-client.ts` (신규)
- **구현 규칙**
  - **설계서 스켈레톤은 단일 파일 통짜다.** 위 「생성/수정 파일」의 경계대로 쪼개 구현하되 **마크업·라벨·상태는 설계서를 그대로 옮긴다.**
  - 페이지 골격은 `components/common/{page-container,page-header,empty-state}`를 **호출**한다(설계서 스켈레톤이 같은 마크업을 직접 그리더라도 컴포넌트를 쓴다). 부분 실패 Alert는 `error-alert`를 쓴다.
  - **내부 이동은 `next/link`**. `app/` 하위의 raw `<a href="/...">`는 `@next/next/no-html-link-for-pages` **error**로 `npm run lint`를 실패시킨다 — `[언론사 관리로 이동]`·`[수집 결과 보기]`가 여기 해당한다.
  - 레이아웃은 `lg:grid-cols-[1fr_360px]`, 우측 패널 `lg:sticky lg:top-20`. `lg:` 미만은 1단 스택(sticky 미적용).
  - 언론사 목록 `ScrollArea` 높이 `h-[420px]`(모바일 `h-[320px]`), 언론사별 진행 리스트 `h-[240px]`.
  - 전체 선택 체크박스는 Radix 3단 상태(`true | false | "indeterminate"`)를 쓴다. 일부 선택 시 `indeterminate` → `aria-checked="mixed"`가 자동으로 붙는다.
  - 진행 영역은 `role="status" aria-live="polite"`로 감싼다. `Progress` 자체에는 `role="progressbar"`를 중복으로 넣지 않는다(Radix가 부여).
  - 상태 아이콘(`Clock`/`LoaderCircle`/`CircleCheckBig`/`CircleX`)에는 항상 텍스트 라벨을 병기하고 아이콘은 `aria-hidden`. lucide는 **신 별칭**으로 통일한다 — 구 별칭(`Loader2` `CheckCircle2` `XCircle` `AlertTriangle`)을 쓰지 않는다.
  - 체크박스 항목마다 **수집 방식 배지(RSS/HTML)** 를 노출하고, URL 줄에는 API가 내려준 `sourceUrl`을 그대로 쓴다(Task 008). 이 화면에서 `sourceType`으로 분기하는 코드를 다시 쓰지 않는다. 배지는 Task 009의 `source-type-badge.tsx`를 재사용한다.
  - 실패 사유 문구는 방식에 따라 다르다 — HTML은 `타임아웃`/`셀렉터 불일치`, RSS는 `피드 파싱 실패`/`피드 응답 없음`. 두 방식이 한 목록에 섞이므로 사유만 보고 어느 쪽이 깨졌는지 알 수 있어야 한다.
  - 실행 중에는 "언론사당 최대 기사 수" 입력과 체크박스를 `disabled` 처리한다.
  - 완료 시 `sonner` 토스트("크롤링 완료 — 기사 N건 저장"), 부분 실패 시 warning 톤 + destructive `Alert`.
  - 상태 **8종**(기본/일부 선택/진행 중/완료/부분 실패/언론사 0건/목록 로딩 **+ 중단됨**)을 모두 구현한다. ⑧ 중단됨은 10일차에 **D-030**으로 추가됐다(I-019) — 완료 조각을 `status`로 재사용하고 `skippedCount`를 "N건 미수집"으로 쓴다. 설계서 §⑧이 문안·아이콘·파생 판정까지 확정해 두었다.
- **완료 조건 (DoD)**
  - [x] `app/page.tsx`에서 `ScreenPlaceholder`가 제거되었다.
  - [x] 언론사 0건이면 `Inbox` 빈 상태와 `[언론사 관리로 이동]` 버튼이 뜨고 실행 버튼이 비활성이다. — 활성 언론사 4곳이 실제로 등록돼 있어 코드 경로 대조로 판정했다(공유 검증 자산인 `press-sources.json`을 비울 수 없다).
  - [x] 언론사 2곳을 체크하고 실행하면 진행률·현재 언론사·언론사별 상태가 눈에 보이게 갱신된다. — 실측 "전체 진행률 78% / 현재: 아이뉴스24 — 18/20건".
  - [x] 완료 후 `[수집 결과 보기]`가 `/results`로 이동하고, `data/runs/{runId}/articles/`에 txt 파일이 실제로 쌓여 있다. — 실측 `20260810-222551`에 파일 40개(`successCount`와 일치).
  - [x] 중단 버튼을 누르면 진행이 멈추고 그때까지의 결과가 보존된다. — 실측 `successCount: 71 · skippedCount: 23`, 화면 수치와 일치.
  - [x] Playwright MCP로 "체크 → 실행 → 진행 관찰 → 완료 → 결과 페이지 이동" 전체를 태운다. — 완료 후 폴링이 멈추는 것도 `browser_network_requests`로 확인했다.

**Phase 3 완료 기준 (Exit Criteria)**
- 홈에서 언론사를 골라 실행하면 `data/runs/{runId}/`에 `run-meta.json`과 기사 txt가 만들어진다.
- 크롤이 수 분 걸려도 화면에서 진행 상태가 끊기지 않고 끝까지 완료된다(요청과 크롤의 수명이 분리되어 있다는 증거다).
- 부분 실패한 실행에서 성공 건수와 실패 건수가 화면과 `run-meta.json` 양쪽에서 일치한다.

---

## Phase 4: 수집 결과 조회 — `F003` `F004` ✅

**목표** — 저장된 결과가 실제로 사람이 읽을 수 있는 형태인지 확인하는 화면을 만든다. Phase 5 분석의 입력이 무엇인지 눈으로 보는 단계이기도 하다.

### Task 017 · 수집 결과 조회 API

- [x] 완료 (10일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F004` &nbsp;|&nbsp; 선행: Task 007, Task 015
- **참조**: `docs/screens/02-collect-result.md` §화면 구성 ②③④⑤, `docs/PRD.md` §CrawlRun·§Article
- **생성/수정 파일**
  - `app/api/runs/route.ts` (신규) — `GET` 실행 목록(최신순, 셀렉터 라벨 포함)
  - `app/api/runs/[runId]/route.ts` (신규) — `GET` 실행 요약(시각·소요시간·대상 언론사명·성공/실패·저장 경로)
  - `app/api/runs/[runId]/articles/route.ts` (신규) — `GET` 기사 파일 목록(`?q=` 검색)
  - `app/api/runs/[runId]/articles/[articleId]/route.ts` (신규) — `GET` 기사 본문
- **결과물**: 위 라우트 4종 + 서버 조립 포맷·검색 필터를 뺀 순수 함수 `lib/api/run-format.ts`·`lib/api/article-search.ts`와 각 `.test.ts`(회귀 13건). 위치 근거는 **D-031**.
- **남긴 한계**: 기사 상세 라우트가 `readArticle` 앞에 `fs.access` 사전 확인을 둔다(**D-032**) — `article-repository.ts`(Task 007)가 "없음"과 "손상"을 타입으로 구분하지 못해서다(**I-020**). 전용 에러 타입이 생기면 걷어낸다. 경로 순회 시도의 상태 코드가 라우트마다 갈리는 문제(**I-021**)는 `paths.ts` 공통 사안이라 이번 회차에서 닫지 않았다.
- **구현 규칙**
  - 실행 목록의 라벨은 화면 설계서 02의 셀렉터 형식(`2026-08-10 14:32 · 언론사 3 · 성공 42 · 실패 2`)을 **서버에서 만들어 내려준다**. 클라이언트가 조립하면 화면마다 형식이 갈린다.
  - 대상 언론사는 id가 아니라 **이름**으로 내려준다. 삭제된 언론사는 id를 그대로 노출하되 "삭제됨" 표시가 가능하도록 플래그를 함께 준다.
  - 목록 조회는 **본문을 읽지 않는다**(Task 007의 `listArticles` 사용).
  - 검색(`?q=`)은 파일명·제목 대상, 대소문자 무시.
  - 존재하지 않는 `runId`/`articleId`는 404 + 한국어 메시지.
- **완료 조건 (DoD)**
  - [x] 실행 이력이 0건일 때 `GET /api/runs`가 에러가 아니라 빈 배열을 반환한다.
  - [x] `GET /api/runs/{runId}/articles`가 기사 200건에서도 1초 내에 응답한다. — 200건 합성 run 실측 **40~58ms**(교차검증에서 재현 확인).
  - [x] 삭제된 언론사가 포함된 과거 run을 조회해도 500이 나지 않는다. — `press-sources.json`에서 언론사를 임시 제거하고 3개 엔드포인트 전부 200 + `name: null, deleted: true` 확인.
  - [x] Playwright MCP로 4개 엔드포인트를 순서대로 호출해 응답 스키마를 확인한다. — 404 케이스(없는 runId·articleId·경로 순회 시도)까지 함께 태웠다.

### Task 018 · 수집 결과 화면

- [x] 완료 (12일차, 2026-08-11) &nbsp;|&nbsp; 기능 ID: `F003` `F004` &nbsp;|&nbsp; 선행: Task 017
- **결과물**: `app/results/page.tsx`(`ScreenPlaceholder` 제거) · `components/results/{run-select,run-summary-card,article-file-list,article-preview}.tsx` · `lib/api/run-client.ts`. 018A(11일차)가 페이지 골격·실행 셀렉터·요약 카드와 018B용 뼈대·props 채널을, 018B(12일차)가 두 컴포넌트 내부를 채웠다. **018B는 `app/results/page.tsx`를 한 줄도 고치지 않았다**(D-006·D-011).
- **남긴 한계**: 요약 카드에 `skippedCount`를 "N건 미수집"으로 노출한다(**I-023**, 설계서 02 반영). 실행 이력 0건과 로딩 스켈레톤은 실데이터를 지울 수 없어 **코드 경로로 판정**했다(교차검증이 정당하다고 확인). 삭제된 언론사 배지는 `press-sources.json`을 임시 변경해 실측하고 원복했다.
- **참조**: `docs/screens/02-collect-result.md` (전 절 — "정보 구조 결정 근거", "상태별 화면" ①~⑤, "접근성", "마크업 스켈레톤")
- **생성/수정 파일**
  - `app/results/page.tsx` (수정 — `ScreenPlaceholder` 제거)
  - `components/results/run-select.tsx` (신규)
  - `components/results/run-summary-card.tsx` (신규)
  - `components/results/article-file-list.tsx` (신규 — 데스크톱 표 / 모바일 카드 리스트)
  - `components/results/article-preview.tsx` (신규)
  - `lib/api/run-client.ts` (신규)
- **구현 규칙**
  - **설계서 스켈레톤은 단일 파일 통짜다.** 위 「생성/수정 파일」의 경계대로 쪼개 구현하되 **마크업·라벨·상태는 설계서를 그대로 옮긴다.**
  - 페이지 골격은 `components/common/{page-container,page-header,empty-state}`를 **호출**한다(설계서 스켈레톤이 같은 마크업을 직접 그리더라도 컴포넌트를 쓴다). 부분 실패 Alert는 `error-alert`를 쓴다.
  - **내부 이동은 `next/link`**. `app/` 하위의 raw `<a href="/...">`는 `@next/next/no-html-link-for-pages` **error**로 `npm run lint`를 실패시킨다. 다만 **원문 기사 링크는 외부 URL이므로 `<a>`가 맞다** — 이 규칙은 내부 경로에만 적용된다.
  - lucide 아이콘은 **신 별칭**으로 통일한다: `LoaderCircle` `CircleCheckBig` `CircleX` `TriangleAlert`.
  - 데스크톱은 `lg:grid-cols-[360px_1fr]` 마스터-디테일. 모바일은 목록 → 미리보기 세로 스택.
  - 파일 목록은 `ScrollArea max-h-[28rem]`, 선택 행에 `aria-selected="true"` + `bg-muted`.
  - 모바일 목록은 `ul[role="listbox"] > li[role="option"]` 안에 실제 `<button>`을 둔다.
  - 본문 미리보기 컨테이너에 `aria-live="polite"`, 본문은 `whitespace-pre-wrap font-mono`.
  - 원문 링크는 `target="_blank" rel="noopener noreferrer"` + `sr-only` 설명.
  - `[키워드 분석]` 버튼은 `/keywords?runId={runId}`로 **선택된 run을 유지한 채** 이동한다.
  - 실패 건수가 0보다 크면 요약 카드의 실패 수치를 `text-destructive`로 강조하고 destructive `Alert`를 함께 노출한다.
  - 상태 5종(기본/실행 이력 0건/파일 미선택/로딩/부분 실패 run)을 모두 구현한다.
- **완료 조건 (DoD)**
  - [x] `app/results/page.tsx`에서 `ScreenPlaceholder`가 제거되었다.
  - [x] 실행을 전환하면 요약·파일 목록·미리보기가 함께 갱신된다. — 실측: 실행 전환 시 파일 목록 10→53건, 미리보기는 파일 미선택 상태로 리셋.
  - [x] 파일 선택 전에는 "파일을 선택하면 본문을 미리 볼 수 있습니다" 안내가 뜬다.
  - [x] `[키워드 분석]` 클릭 시 `/keywords?runId=...`로 이동한다. — **셀렉터 프리셀렉트 확인은 규정대로 Task 022 완료 후로 유예**(현재 `/keywords`는 아직 `ScreenPlaceholder`).
  - [x] Playwright MCP로 "실행 선택 → 파일 검색 → 파일 선택 → 본문 확인 → 키워드 분석 이동"을 태우고, 375px 폭에서 세로 스택이 정상인지 확인한다. — 검색은 `?q=`가 실제로 서버에 나가는 것을 `browser_network_requests`로, 본문 개행 보존은 computed `white-space: pre-wrap`으로 확인했다.

**Phase 4 완료 기준 (Exit Criteria)**
- Phase 3에서 만든 실행 결과를 화면에서 골라 기사 본문까지 읽을 수 있다.
- 실행 이력이 0건인 상태에서도 화면이 빈 상태로 정상 렌더링된다.

---

## Phase 5: 형태소 분석 · 키워드 랭킹 — `F005` `F006`

**목표** — 이 프로젝트의 목적 그 자체. `docs/kiwi-verification.md`가 실측으로 확인한 **함정 5가지를 코드 규칙으로 못 박는 것**이 이 Phase의 절반이다. 특히 함정 ②와 ⑥은 **틀려도 화면이 멀쩡해 보이는** 종류라, 완료 조건에 회귀 확인을 명시적으로 넣는다.

### Task 019 · Kiwi 어댑터 (싱글턴 · 안전 래퍼 · 모델 검증)

- [x] 완료 (1일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F005` &nbsp;|&nbsp; 선행: 개발 환경 준비(모델 배치)
- **결과물**: `lib/keyword/kiwi.ts`, `lib/keyword/index.ts`. 공개 API는 `safeTokenize(text)` · `MATCH_OPTIONS`(393216) · `KiwiToken` 타입 셋뿐이다
- **남긴 한계**: 「생성/수정 파일」이 산출물로 적은 `getKiwi()`는 **export하지 않았다** — 반환값이 원시 `Kiwi`라 DoD "원시 인스턴스 미노출"과 정면으로 충돌한다. 파일 안의 비공개 싱글턴 접근자로만 둔다(근거는 `docs/DECISIONS.md`). Task 020이 `blockList`·`typos`를 쓰게 되면 같은 패턴의 안전 래퍼를 새로 추가해 그 함수만 내보낸다.
- **참조**: [`docs/kiwi-verification.md`](./kiwi-verification.md) §1 §2 §3(①③④⑤), `app/api/kiwi-check/route.ts`(참조 구현)
- **생성/수정 파일**
  - `lib/keyword/kiwi.ts` (신규) — `getKiwi()` 싱글턴, `safeTokenize()`, `MATCH_OPTIONS` 상수, 모델 경로·존재 검증
  - `lib/keyword/index.ts` (신규)
- **구현 규칙 — kiwi-verification 함정을 여기서 전부 흡수한다**
  - **⚠️ 함정 ① — `tokenize(text, undefined)`는 Node 프로세스를 통째로 죽인다.** 옵셔널 인자를 그대로 넘기는 코드를 만들지 않는다. 반드시 아래 형태의 래퍼만 노출한다.
    ```ts
    const safeTokenize = (kiwi, text, opts) =>
      opts === undefined ? kiwi.tokenize(text) : kiwi.tokenize(text, opts)
    ```
    같은 규칙이 `blockList` · `pretokenized` · `typos` 전부에 적용된다. **원시 `kiwi` 인스턴스를 모듈 밖으로 내보내지 않는다** — 내보내면 호출부에서 함정 ①을 다시 밟을 수 있다.
  - **⚠️ 함정 ② — matchOptions는 `Match.joinNounPrefix | Match.joinNounSuffix`(= 393216) 고정.** `Match.joinAffix`는 `공개/NNG + 하/XSV`를 `공개하/VV`로 합쳐 **"공개"·"적용"·"경쟁"을 키워드에서 통째로 소실시킨다.** 상수로 박고 함수 인자로 열지 않는다.
  - **⚠️ 함정 ③ — 모델 버전은 패키지 버전과 정확히 일치해야 한다(0.23.0).** 경량 v0.21.0(34MB) 대체 경로는 막혀 있다. 모델 디렉터리가 없거나 파일이 부족하면 **"data/kiwi-model/ 에 v0.23.0 모델 9개 파일을 배치하세요"** 라는 한국어 안내와 재다운로드 명령을 담은 에러를 던진다.
  - **⚠️ 함정 ④ — 인스턴스는 싱글턴.** `build()`가 1.4초, RSS +780MB다. 요청마다 만들면 매번 1.3~1.6초를 다시 낸다. **`Promise`를 `globalThis`에 캐싱**해 프로세스당 1개만 유지한다 — **모듈 스코프 변수로 두면 안 된다.** `next dev`의 HMR이 모듈을 다시 평가할 때마다 캐시가 비어 `build()`가 다시 돌고, 이전 인스턴스는 회수되지 않은 채 780MB씩 쌓인다. 같은 저장소의 `lib/crawler/browser.ts:5-11`이 정확히 이 문제 때문에 이미 `globalThis.__crawlerBrowser`를 쓰고 있으므로 그 형태를 그대로 따른다. 아래 DoD의 "`build()` 로그가 1회만"은 이 캐싱 위치가 맞아야 dev에서 성립한다.
    ```ts
    const globalForKiwi = globalThis as unknown as { __kiwi?: Promise<Kiwi> }
    globalForKiwi.__kiwi ??= buildKiwi()
    ```
  - **⚠️ 함정 ⑤ — 정적 자산 금지.** `modelFiles`는 URL도 받지만 그건 브라우저가 105MB를 내려받는다는 뜻이다. 서버에서 `fs`로만 읽고, `public/`에 모델을 두지 않는다.
  - WASM 경로는 `node_modules/kiwi-nlp/dist/kiwi-wasm.wasm`. 번들러가 건드리지 않도록 `next.config.ts`의 `serverExternalPackages: ['kiwi-nlp']`(적용 완료)를 유지한다.
  - `build()` 시그니처에 `userWords` 자리를 **인자로 열어두되 현재는 빈 배열**을 넘긴다. 사용자 사전 도입 여부는 미결이며(결정 필요 사항 참고), 나중에 켜더라도 이 파일만 바뀌게 한다.
- **완료 조건 (DoD)**
  - [ ] 같은 프로세스에서 분석을 3회 연속 요청해도 `build()` 로그가 **1회만** 찍히고, 2회차 이후 응답이 1초 이상 빨라진다. **`next dev`에서 중간에 소스를 저장해 HMR을 일으켜도 마찬가지다**(캐시가 `globalThis`에 있는지 확인하는 조건이다).
  - [ ] `MATCH_OPTIONS` 값이 `393216`이고 `joinAffix`가 코드 어디에도 없다(`grep`으로 확인).
  - [ ] `data/kiwi-model/`을 임시로 비우면 프로세스가 죽지 않고 재다운로드 안내 에러가 화면까지 전달된다.
  - [ ] `public/` 아래에 모델 파일이 없다.
  - [ ] 모듈이 내보내는 API로는 `tokenize`에 `undefined` 옵션을 넘길 방법이 **타입상 존재하지 않는다**.

### Task 020 · 키워드 추출 · 집계 파이프라인

- [x] 완료 (5일차, 2026-08-10) &nbsp;|&nbsp; 기능 ID: `F005` `F008` &nbsp;|&nbsp; 선행: Task 019, Task 006
- **결과물**: `lib/keyword/{extract,fixtures}.ts` + `extract.test.ts`(020A · 4일차), `lib/keyword/aggregate.ts` + `aggregate.test.ts`(020B · 5일차)
- **남긴 한계**: **함정 ② 회귀는 실제 Kiwi 모델로 판정된다** — `확장`·`적용`·`경쟁` 생존을 테스트가 확인한다. 검증 중 `것`·`수`는 `NNB`라 품사 필터에서 이미 걸러지고 **`점`만 길이 필터가 실제로 잡는다**는 것이 확인됐다. `aggregate.ts`는 `totalTokenCount`를 얻기 위해 `safeTokenize`를 직접 호출한다(D-010) — `filteredTokenCount`는 최종 키워드 필터보다 느슨한 "조사·어미·접미사만 뺀" 기준이라 키워드 후보만으로는 만들 수 없다. 토큰 감소율 DoD는 정확 재현이 불가능한 입력이라 40~70% 밴드로 판정했다.
- **참조**: `docs/PRD.md` §F005(태그 목록), `docs/kiwi-verification.md` §5 §6(1글자 제외·`이번`), `docs/screens/03-hot-keyword.md` §② 분석 요약
- **생성/수정 파일**
  - `lib/keyword/extract.ts` (신규) — 토큰 → 키워드 후보(품사 필터 · 1글자 제외 · 불용어)
  - `lib/keyword/aggregate.ts` (신규) — 빈도 집계 + `AnalysisSummary` 산출
  - `lib/keyword/fixtures.ts` (신규) — 회귀 확인용 고정 문장 세트
  - `lib/keyword/extract.test.ts` (신규) — 품사 필터·1글자 제외·불용어 적용 회귀 확인(vitest, Q4 결정)
  - `lib/keyword/aggregate.test.ts` (신규) — 빈도 합산·정렬·`AnalysisSummary` 5개 수치 회귀 확인
- **구현 규칙**
  - 남기는 태그는 **명사 `NNG`/`NNP` + 영문 `SL`** 뿐이다. 조사(`JKS` `JKC` `JKG` `JKO` `JKB` `JKV` `JKQ` `JX` `JC`) · 어미(`EP` `EF` `EC` `ETN` `ETM`) · 접미사(`XSN` `XSV` `XSA`)는 제거된다.
  - **⚠️ 1글자 명사 제외**(`length < 2`). `것`·`수`·`점` 같은 의존명사성 잡음이 상위를 잠식한다(kiwi-verification §6 실측). 단, `SL`(영문)은 `AI`·`5G`처럼 2글자 이상이어야 통과하므로 같은 규칙을 적용하되 별도로 명시한다.
  - 불용어는 `getStopwordSet()`(Task 006)을 주입받아 적용한다. **불용어 목록을 이 모듈에 하드코딩하지 않는다** — 화면에서 관리하는 값이다.
  - `AnalysisSummary`의 5개 수치를 모두 산출한다: `articleCount` / `totalTokenCount`(원 토큰) / `filteredTokenCount`(조사·어미·접미사 제거 후) / `stopwordExcludedCount` / `uniqueKeywordCount`. 이 수치가 "조사를 제거했다"를 사용자에게 증명하는 유일한 수단이다(화면 설계서 03 §설계 결정).
  - 정렬은 **빈도 내림차순 고정**, 동률은 가나다순. PRD가 "빈도순 랭킹"으로 정렬 기준을 고정 규정했다.
  - 기사 본문을 하나씩 순회하며 집계한다. 전체를 한 문자열로 이어 붙이지 않는다(수백 건 시 메모리 급증).
- **완료 조건 (DoD)**
  - [ ] `삼성전자가 / 삼성전자를 / 삼성전자는 / 삼성전자의 / 삼성전자에서` 5문장이 `삼성전자` **5회**로 합산된다.
  - [ ] **함정 ② 회귀 확인** — "온디바이스 AI 반도체 생태계가 확장된다", "이번 신제품은 … 적용했다", "… 클라우드 시장에서 경쟁한다"에서 `확장`·`적용`·`경쟁`이 **모두 키워드에 남는다**.
  - [ ] `생태계`·`신제품`이 쪼개지지 않고 한 단어로 잡힌다(`joinNounPrefix|joinNounSuffix` 효과).
  - [ ] 1글자 토큰(`것`·`수`·`점`)이 결과에 없다.
  - [ ] 기본 불용어 7건이 결과에서 제외되고, `stopwordExcludedCount`가 0보다 크다.
  - [ ] 기사 4건 기준 토큰 감소율이 kiwi-verification §5의 실측치(약 57.8%)와 같은 자릿수다.
  - [ ] 위 6개 조건이 **`extract.test.ts`·`aggregate.test.ts`의 케이스로 남아 `npm run test`에서 판정된다.** 이 규칙들은 틀려도 화면이 멀쩡해 보여 수동 확인으로 회귀를 잡을 수 없다(Q4 결정).

### Task 021 · 키워드 분석 API 및 결과 캐시

- [x] 완료 (12일차, 2026-08-11) &nbsp;|&nbsp; 기능 ID: `F005` `F006` &nbsp;|&nbsp; 선행: Task 020, Task 017
- **결과물**: `lib/keyword/analyze-run.ts` + `.test.ts`(021A) · `app/api/runs/[runId]/keywords/route.ts` · `lib/keyword/{filter-keywords,keywords-response}.ts` + 각 `.test.ts`(021B). 계약은 **D-033**·**D-035**~**D-038**.
- **남긴 한계**: `rank`·`ratio`를 API가 채우지 않는다(**D-037**) — 022B가 `index + 1`과 `count / items[0].count`로 계산한다. `force`는 zod가 아니라 문자열 비교라 `?force=1`이 조용히 캐시를 반환한다(**D-036**, 감수하기로 한 것).
- **참조**: `docs/PRD.md` §KeywordCount, `docs/screens/03-hot-keyword.md` §① 조건 바 · §⑥ 진행 상태
- **생성/수정 파일**
  - `app/api/runs/[runId]/keywords/route.ts` (신규) — `GET ?minCount&pos&topN&force`
  - `lib/keyword/analyze-run.ts` (신규) — run 전체 기사 읽기 → 추출 → 집계 → `keywords.json` 기록
- **구현 규칙 — 캐시와 재분석의 경계를 여기서 확정한다**
  - `data/runs/{runId}/keywords.json`은 **불용어·1글자 필터까지 적용한 전체 집계**를 담는다. 최소 등장 횟수·품사·Top N은 담지 않는다.
  - 따라서 **조건 바의 필터 변경은 Kiwi 재실행 없이 캐시 위에서 즉시 처리**된다(수백 ms). Kiwi를 다시 도는 것은 `?force=true`일 때뿐이다.
  - `[재분석]` 버튼 = `?force=true`. **불용어를 바꾼 뒤에만 필요한 동작**이므로, 화면에서 그 의미를 문구로 알린다.
  - 캐시가 없으면 자동으로 분석을 수행하고 기록한다(최초 진입).
  - **`runtime` export를 두지 않는다**(Node.js가 기본 런타임 — `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md`). 첫 요청은 `build()` 1.4초가 얹히지만 기사 200건 기준 총 3~4초 수준이다. **Phase 3의 크롤과 달리 여기서는 요청 안에서 끝내도 된다** — 사용자가 몇 초를 기다리는 것으로 충분하고, 진행 상태를 따로 조회할 필요가 없기 때문이다(3단계 스텝 표시는 클라이언트가 그린다). 실행 시간 상한은 이 프로젝트에 존재하지 않으므로 `maxDuration`을 선언하지 않는다.
  - 존재하지 않는 run, 기사 0건인 run은 각각 404 / 빈 결과 + 안내 메시지로 구분해 응답한다.
- **완료 조건 (DoD)**
  - [x] 최초 호출에서 `keywords.json`이 생성되고, 두 번째 호출은 눈에 띄게 빠르다. — 실측 최초 1875ms → 캐시 8~50ms.
  - [x] `?minCount=3`을 주면 3회 미만 키워드가 사라지고 `summary`는 그대로다. — 2412→672건, `summary` 6가지 조합에서 전부 동일.
  - [x] `?pos=NNP`만 주면 고유명사만 남는다. — 358건, 전 항목 `posTag === 'NNP'`.
  - [x] 불용어를 추가한 뒤 `?force=true`로 호출하면 해당 단어가 랭킹에서 사라진다. — "보안"(57회) 추가 → 재분석 후 사라지고 `stopwordExcludedCount` 84→141(+57 정확히 일치). 확인 후 원복.
  - [x] Playwright MCP로 최초 분석 → 필터 변경 → 불용어 추가 → 강제 재분석 순서로 호출해 응답 차이를 확인한다. — 화면이 아직 없어 **실서버 HTTP 동선으로 태웠다**(021A 회차에 확립한 대체 방식). 기사 0건 run은 교차검증이 임시 디렉터리로 별도 확인했다.

### Task 022 · 핫 키워드 분석 화면

- [ ] 대기 &nbsp;|&nbsp; 기능 ID: `F005` `F006` `F008` &nbsp;|&nbsp; 선행: Task 021, Task 012
- **참조**: `docs/screens/03-hot-keyword.md` (전 절 — "설계 결정과 근거", "상태별 화면" ①~⑥, "접근성", "마크업 스켈레톤")
- **생성/수정 파일**
  - `app/keywords/page.tsx` (수정 — `ScreenPlaceholder` 제거, `?runId` 쿼리 수신)
  - `components/keywords/analysis-filter-bar.tsx` (신규)
  - `components/keywords/analysis-summary.tsx` (신규 — 5개 수치 KPI 로우)
  - `components/keywords/top-keyword-cards.tsx` (신규 — Top 5)
  - `components/keywords/keyword-rank-table.tsx` (신규 — `sm:` 이상 표)
  - `components/keywords/keyword-rank-card-list.tsx` (신규 — `sm:` 미만 카드)
  - `components/keywords/analysis-progress.tsx` (신규 — 3단계 스텝)
  - `lib/api/keyword-client.ts` (신규)
- **구현 규칙**
  - **설계서 스켈레톤은 단일 파일 통짜다.** 위 「생성/수정 파일」의 경계대로 쪼개 구현하되 **마크업·라벨·상태는 설계서를 그대로 옮긴다.**
  - 페이지 골격은 `components/common/{page-container,page-header,empty-state}`를 **호출**한다(설계서 스켈레톤이 같은 마크업을 직접 그리더라도 컴포넌트를 쓴다). 분석 실패 표시는 `error-alert`를 쓴다.
  - **내부 이동은 `next/link`**. `app/` 하위의 raw `<a href="/...">`는 `@next/next/no-html-link-for-pages` **error**로 `npm run lint`를 실패시킨다 — `[크롤링 실행하러 가기]`·`[불용어 관리로 이동]`이 여기 해당한다.
  - lucide 아이콘은 **신 별칭**으로 통일한다: `LoaderCircle` `CircleCheckBig` `CircleX` `TriangleAlert` `Ban`.
  - **비중 막대는 Tailwind만으로 그린다.** 차트 라이브러리(`recharts` 기반 `chart`)를 도입하지 않는다 — 표시 지표가 빈도 1개뿐이라 축·범례·툴팁이 필요 없고, 표 안에 박히는 미니 막대다. 트랙 `bg-muted` + 채움 `bg-primary` 단일 색, 막대는 `aria-hidden="true"`이고 수치는 항상 텍스트로 병기한다.
  - Top 5 카드의 색 차등은 **상단 `border-t-4`에만** 쓰되 색은 **`border-t-primary` + 불투명도 단계**(1위 `border-t-primary`, 2~5위 `/70` `/50` `/35` `/20`)로 준다. **`--chart-*`를 쓰지 않는다** — 라이트/다크에서 값이 같은 고정 램프라, 다크 카드 배경(`--card: oklch(0.205 0 0)`)과 1위 선(`--chart-5: oklch(0.269 0 0)`)의 명도차가 0.064밖에 안 되어 **1위가 안 보이고 5위만 밝게 남아 순위 인코딩이 뒤집힌다.** `--primary`는 테마에 따라 값이 뒤집히므로 두 모드 모두에서 순서가 유지된다. 순위는 폰트 크기(`text-2xl` → `text-base`)로도 함께 전달한다.
  - 정렬 UI를 만들지 않는다. "등장 횟수" 헤더에 **정적 `aria-sort="descending"`** 만 부여한다.
  - 진행 표시는 3단계 체크리스트(① 모델 로딩 → ② 토큰화 → ③ 집계) + **`aria-hidden` 장식 트랙**(`bg-muted` 트랙 + `bg-primary animate-pulse` 채움)이다. 모델 로딩 시간을 퍼센트로 예측할 수 없어 확정값을 줄 수 없는데, **`components/ui/progress.tsx:25`가 `translateX(-${100 - (value || 0)}%)`라 값 없는 `<Progress>`는 -100%로 트랙 밖에 밀려 아예 보이지 않는다.** `components/ui/`는 shadcn CLI 생성물이라 수정 대상이 아니므로 여기서는 `Progress`를 쓰지 않는다. 실제 진행 정보는 3단계 체크리스트 텍스트가 전달하고, 전체를 `role="status" aria-live="polite"`로 감싼다.
  - **⚠️ "Kiwi 모델 로딩" 단계는 서버에서 일어난다.** 클라이언트가 모델을 내려받는 것이 아니다. 화면 문구가 이를 오해하게 쓰이지 않도록 한다(정정 대상 문서는 Task 023).
  - 행별 `Ban` 버튼의 `aria-label`에 키워드명을 포함하고, 클릭 시 불용어 추가 후 자동 재분석까지 이어준다.
  - `?runId` 쿼리가 있으면 그 run을 선택 상태로 시작한다(수집 결과 페이지에서 넘어오는 동선).
  - 상태 6종(분석 전/진행 중/완료/run 없음/결과 0건/실패)을 모두 구현한다.
- **완료 조건 (DoD)**
  - [ ] `app/keywords/page.tsx`에서 `ScreenPlaceholder`가 제거되었다.
  - [ ] 분석 요약의 "전체 토큰 수 → 조사·어미 제거 후"에서 숫자가 실제로 절반 가까이 줄어드는 것이 보인다.
  - [ ] 랭킹 표에서 조사가 붙은 변형이 아니라 원형 명사가 집계되어 있다.
  - [ ] 행의 `Ban` 버튼으로 상투어를 제외하면 재분석 후 랭킹에서 사라진다.
  - [ ] run이 하나도 없을 때 `Inbox` 빈 상태 + `[크롤링 실행하러 가기]`가 뜬다.
  - [ ] Playwright MCP로 "run 선택 → 분석 → 필터 조정 → 상투어 불용어 추가 → 재분석"을 태우고, 375px 폭에서 표가 카드 리스트로 바뀌는지 확인한다.

**Phase 5 완료 기준 (Exit Criteria)**
- 수집한 기사에서 조사가 제거된 핫 키워드 랭킹이 화면에 나온다.
- 함정 ②(`joinAffix`) 회귀 케이스 3개가 모두 통과한다.
- 같은 프로세스에서 분석을 반복해도 `build()`가 다시 돌지 않는다.

---

## Phase 6: 정리 · 문서 정정 · 전체 검증

### Task 023 · 임시 코드 제거 및 설계 문서 정정

- [ ] 대기 &nbsp;|&nbsp; 기능 ID: — &nbsp;|&nbsp; 선행: Task 022
- **참조**: `docs/kiwi-verification.md` §7 §8
- **생성/수정 파일**
  - `app/api/kiwi-check/route.ts` (**삭제**)
  - `components/common/screen-placeholder.tsx` (**삭제** — 5개 화면 모두 실제 구현으로 교체된 뒤)
- **범위에서 빠진 것 (착수 전에 팀장이 이미 처리 완료)**
  - `README.md` 전면 교체 · `app/globals.css` 폰트 토큰 정리 · 기존 라우트 2건의 `runtime` export 제거. **다시 손대지 않는다.**
  - `docs/screens/03-hot-keyword.md`의 "Kiwi 모델 로딩" 서술 정정(서버에서 1.4초, 싱글턴이면 프로세스당 최초 1회) — 반영 완료.
  - `docs/PRD.md`의 **1글자 토큰 제외 규칙**과 **기본 불용어 프리셋 7건(`이번` 포함)** — 반영 완료.
  - 위 4건은 Task 022 완료를 기다릴 이유가 없어 먼저 처리했다. 이 Task에 남은 것은 **임시 코드 삭제뿐**이다.
  - `docs/ROADMAP.md` 진행률 표 최종 갱신은 이 Task가 아니라 **회차 마감에 팀장이 수행**한다(§작업 진행 규칙 4).
- **구현 규칙**
  - `kiwi-check` 삭제 전에 `lib/keyword/`가 그 라우트가 하던 일을 전부 대체하는지 확인한다.
  - `ScreenPlaceholder` 삭제 시 남은 import가 없는지 `npm run typecheck`로 확인한다.
- **완료 조건 (DoD)**
  - [ ] `app/api/kiwi-check/` 와 `components/common/screen-placeholder.tsx` 가 저장소에 없다.
  - [ ] `grep -r "ScreenPlaceholder"` 결과가 0건이다.
  - [ ] `docs/screens/03-hot-keyword.md`를 읽고 "모델을 브라우저가 받는다"고 오해할 여지가 없다.
  - [ ] `npm run lint` · `npm run typecheck` · `npm run test` · `npm run build` 모두 통과.

### Task 024 · 실행 안내 최종 점검 (환경변수 동기화)

- [ ] 대기 &nbsp;|&nbsp; 기능 ID: — &nbsp;|&nbsp; 선행: Task 023
- **참조**: `docs/kiwi-verification.md` §1(모델 재다운로드), `.env.example`, `.gitignore`, 현행 `README.md`
- **범위가 좁혀졌다** — 착수 전에 팀장이 **`README.md`를 전면 교체**해 설치·Playwright 브라우저 설치·Kiwi 모델 다운로드·`.env.local` 설정·실행 순서·언론사 등록 방식(RSS/HTML) 고르는 법·RAM 요구사항·서버리스 배포 불가를 이미 넣어 두었다. 이 Task는 **문서를 새로 쓰는 일이 아니라 Phase 3~5가 실제로 추가한 것을 반영하고 마지막으로 실행 순서를 태워 보는 일**이다.
- **생성/수정 파일**
  - `.env.example` (수정) — **Phase 3~5에서 새로 추가된 환경변수를 반영**한다(없으면 변경 없음으로 끝낸다).
  - `README.md` (수정) — 위에서 바뀐 환경변수만 반영하고, 실행 순서가 현재 코드와 어긋나는 곳이 있으면 그 문장만 고친다. **전면 재작성 금지.**
  - `docs/ROADMAP.md` §개발 환경 준비 (동기화 — 환경변수가 바뀐 경우에만)
- **구현 규칙**
  - `.env.local`을 지운 상태에서 `README.md`의 순서를 그대로 따라 실행해 보고, 막히는 지점만 고친다. 막히지 않으면 고칠 것이 없는 것이다.
  - 새 환경변수는 **`.env.example`·`README.md`·`docs/ROADMAP.md` §개발 환경 준비 세 곳이 같은 이름·같은 기본값**을 말해야 한다. 한 곳만 고치면 다음 사람이 셋 중 어느 것을 믿을지 알 수 없다.
- **완료 조건 (DoD)**
  - [ ] `lib/crawler/config.ts`와 `lib/keyword/`가 읽는 환경변수가 `.env.example`에 **하나도 빠짐없이** 있고, 기본값이 코드와 일치한다.
  - [ ] 새 머신에서 README만 보고 clone → 설치 → 실행 → 크롤 → 분석까지 도달할 수 있다(다른 문서를 뒤지지 않아도 됨).
  - [ ] 모델 없이 분석을 시도했을 때 나오는 에러 메시지가 README의 해결 절차와 연결된다.

### Task 025 · MVP 전체 사용자 여정 수동 검증

- [ ] 대기 &nbsp;|&nbsp; 기능 ID: `F001`~`F008` 전체 &nbsp;|&nbsp; 선행: Task 024
- **참조**: `docs/PRD.md` §사용자 여정 1→5, 이 문서 §검증 시나리오
- **생성/수정 파일**: 없음 (검증 전용 Task — 발견된 결함은 해당 Task로 되돌려 수정)
- **구현 규칙**
  - 아래 §검증 시나리오를 **처음부터 끝까지 끊지 않고** 1회 통과시킨다. 중간에 실패하면 원인 Task를 다시 열고 고친 뒤 처음부터 다시 태운다.
  - Playwright MCP로 데스크톱(1280px)과 모바일(375px) 두 벌을 각각 수행한다.
  - `data/`를 비운 **완전 초기 상태**에서 시작한다 — 빈 상태 화면 5종이 실제로 뜨는지 확인하기 위함이다.
- **완료 조건 (DoD)**
  - [ ] 검증 시나리오 1~5단계 + 분기 A·B가 모두 통과한다.
  - [ ] 데스크톱·모바일 양쪽에서 레이아웃이 깨지지 않는다.
  - [ ] 브라우저 콘솔에 에러가 없다(`browser_console_messages`).
  - [ ] `npm run lint` · `npm run typecheck` · `npm run test` · `npm run build` 모두 성공.
  - [ ] 25개 Task가 전부 완료 판정을 받아, **회차 마감에 팀장이 진행률 요약 표를 25/25로 갱신할 수 있는 상태**다(표를 고치는 것은 이 Task가 아니다 — §작업 진행 규칙 4).

**Phase 6 완료 기준 (Exit Criteria)** — MVP 완료. PRD의 F001~F008이 모두 화면에서 동작하고, 임시 코드와 문서 불일치가 남아 있지 않다.

---

## ❓ 결정 필요 사항 (Open Questions)

착수 전 팀 리드 판단이 필요했던 항목입니다. **Q2·Q3·Q4는 결정이 내려져 Task에 반영을 마쳤고**, Q1·Q5·Q6은 결론이 확정된 상태로 남아 있습니다. 뒤집힌 논거도 지우지 않고 무엇이 왜 바뀌었는지를 함께 남깁니다.

### Q1. `userWords` 사용자 사전 관리 기능(F009?) 도입 여부

- **배경**: 기본 사전은 IT/AI 고유명사를 쪼갠다. `오픈AI` → `오픈/NNG` + `AI/SL`, `데이터센터` → `데이터` + `센터`, `온디바이스` → `온/MM` + `디바이스`. `userWords`로 등록하면 해결된다(kiwi-verification §4).
- **비용**: `userWords`는 `build()` 시점에만 넘길 수 있다. 화면에서 사전을 바꾸면 **Kiwi 인스턴스를 다시 만들어야 한다(+1.4초, RSS 780MB 재할당)**. 불용어(F008)처럼 가볍게 추가/삭제하는 UX를 그대로 옮기면 매 변경마다 1.4초가 붙는다.
- **📌 결정: MVP 범위 밖으로 뺀다.**
  - PRD 기능 명세에 없는 신규 기능이고, MVP 목표는 "조사를 제거해 빈도를 정확히 센다"이지 "고유명사를 완벽히 인식한다"가 아니다.
  - `오픈` + `AI`로 쪼개져도 두 토큰 모두 키워드로 잡히므로 **결과가 틀리는 게 아니라 덜 정밀한 것**이다. 함정 ②(키워드 소실)와 성격이 다르다.
  - 대신 **Task 019에서 `build()`의 `userWords` 인자 자리를 열어두고 빈 배열을 넘긴다.** 나중에 도입할 때 바뀌는 파일이 `lib/keyword/kiwi.ts` 하나로 제한된다.
  - 도입한다면 위치는 Phase 5 이후의 별도 Task이며, 재빌드 비용 때문에 **"저장" 버튼을 누를 때만 재빌드**하는 UX(불용어처럼 칩 하나 지울 때마다 즉시 반영 ✕)가 전제 조건이다.

### Q2. F002 실시간 전송 방식 — SSE vs 폴링

- **📌 결정(Task 015에 반영 완료): 폴링 1초 간격.** 진행 상태가 메모리에 있어 조회 비용이 0에 가깝고, SSE는 dev HMR·재시작마다 끊긴 스트림을 되살리는 재연결 로직을 요구한다. 화면이 요구하는 해상도는 1초로 충분하다.
- **📌 결정: 폴링 주기는 1초 고정.** 언론사 수에 따라 늘리지 않는다 — 로컬 1인 도구에서 초당 1회 요청을 아껴 얻을 것이 없고, 주기가 가변이면 "왜 지금은 느리게 갱신되지?"라는 설명 부담만 생긴다.
- **철회한 논거**: 초판은 "SSE가 `maxDuration` 제약과 다시 씨름해야 한다"를 근거로 들었으나, `maxDuration`은 배포 플랫폼이 참고하는 값이고 `next dev`/`next start`에서는 아무것도 강제하지 않는다. 이 논거를 빼도 나머지 근거(재연결 로직 · 1초 해상도로 충분)만으로 결론은 그대로다.
- 전환 필요 시 `getRunProgress(runId)` 하나만 SSE 스트림으로 감싸면 되므로 되돌리기 비용은 낮다.

### Q3. 장시간 크롤을 요청 안에서 끝낼 것인가

- **📌 결정(Task 014·015에 반영 완료): 요청과 크롤의 수명을 분리한다.** `POST /api/crawl`은 잡을 등록하고 202로 즉시 응답하며, 실제 크롤은 **`globalThis`에 붙인 잡 레지스트리**에서 계속 돈다.
- **근거**: 크롤은 수십 초~수 분이 걸린다. 요청 안에서 끝내면 그동안 **진행 상태를 조회할 방법이 없어 `F002`가 불가능해지고**, 브라우저가 응답을 기다리는 동안 새로고침 한 번에 실행이 유실된다.
- **철회한 논거**: 초판 제목은 "크롤 60초 초과 대응"이었고 `maxDuration = 60`을 제약으로 다뤘다. 그 값은 배포 플랫폼이 참고하는 값이며 `next dev`/`next start`에서는 아무것도 강제하지 않는다 — 설치본에서 `maxDuration`은 빌드가 매니페스트에 싣는 경로와 타입 검사에만 등장하고 요청을 중단시키는 코드가 없다. **`maxDuration`을 선언하지 않는다** — 지키지 않는 제약을 문서에 남기면 다음 사람이 없는 상한에 맞춰 설계한다.
- **전제**: `next dev` / `next start`로 도는 **장수명 로컬 Node 프로세스**. PRD §실행 환경이 이미 서버리스 배포를 전제하지 않는다고 못 박았으므로 이 전제는 유효하다.
- **📌 결정: 서버 재시작으로 유실된 `running` run은 조회 시점에 `aborted`로 간주한다.** 별도 복구 화면을 두지 않는다 — PRD에 없는 화면이고, 고아 run이 영원히 "진행 중"으로 보이는 것만 막으면 목적이 달성된다.

### Q4. 테스트 도구 도입 여부

- **📌 결정: vitest 최소 도입 — 설치·설정 완료.** `vitest`가 `package.json`에 있고, `npm run test` = `vitest run`, 대상 글롭은 `lib/**/*.test.ts`, 테스트가 0건이어도 통과하도록 `passWithNoTests: true`(`vitest.config.ts`)다. **해소 기한을 논할 단계는 지났다** — 남은 일은 각 Task가 테스트 파일을 채우는 것뿐이다.
  - 대상은 **`lib/keyword/`·`lib/storage/`·`lib/crawler/`의 순수 함수**로 한정한다(추출·집계·txt 왕복·경로 순회 차단·zod 거부 케이스). 컴포넌트 렌더링 테스트는 도입하지 않는다.
  - 근거: 함정 ②(`joinAffix`로 키워드 소실)와 1글자 필터, 불용어 적용, 경로 순회 차단, 스키마 거부는 **틀려도 화면이 정상으로 보이는** 종류다. 이런 규칙은 수동 확인으로 회귀를 잡을 수 없다. Task 020의 완료 조건 6개가 사실상 테스트 케이스 목록이다.
  - `@playwright/test`(E2E 러너)는 **여전히 도입하지 않는다.** 화면 검증은 Playwright MCP로 대화형으로 수행하고, MVP 완료 검증은 Task 025의 수동 시나리오로 대체한다. 로컬 1인 도구에 E2E 스위트를 유지할 이유가 없다.
  - 반영된 Task: 004(`lib/types/press.test.ts`) · 005(`lib/storage/paths.test.ts`) · 007(`lib/storage/article-file.test.ts`) · 020(`lib/keyword/extract.test.ts`·`aggregate.test.ts`).
- **회차 기준으로 읽는 법** — `docs/SCHEDULE/SCHEDULE.md`는 이 결정의 기한을 캘린더 **9주차 종료(2026-10-11, 020A 착수 직전)** 로 잡았다. 이 프로젝트는 "N일차 = 진행 회차"로 굴러가므로 **주차를 회차로 바꿔 읽는다**: 의존 그래프를 회차로 펼치면 020A가 열리는 것은 9주차가 아니라 **4회차**다.
  ```
  1회차: 004 · 019
  2회차: 005 · 010A · 013A
  3회차: 006 · 007
  4회차: 008A · 011 · 020A   ← 020A가 여기서 열린다
  ```
  즉 이 결정은 **1회차 착수 전에 이미 닫혀 있어야 했고, 실제로 닫혔다.** (SCHEDULE의 주차 숫자 자체는 다시 계산하지 않는다 — 캘린더 배치를 전제한 산정치이므로 그대로 두고 회차로 읽는 법만 덧붙인다.)

### Q5. 소스 테스트 기능(Task 010) 유지 여부 — ⚠️ 성격이 바뀌었다

- **배경**: PRD 기능 명세에는 없고, `docs/screens/04-press-manage.md`가 설계 단계에서 추가한 결정이다.
- **📌 결정: 유지한다.** 사용자가 손으로 입력하는 값(RSS 피드 URL, CSS 셀렉터)은 틀리면 "크롤은 도는데 0건"이라는 진단 어려운 실패로 나타난다. 폼 안에서 즉시 확인할 수단이 없으면 진단 비용이 크게 오른다.
- **RSS 도입으로 이 Task는 더 이상 잘라낼 수 없다.** Task 010이 만드는 `lib/crawler/rss.ts`를 Task 013의 오케스트레이터가 재사용하므로, **Task 010은 Phase 3의 선행 조건**이 되었다(이전 로드맵에서 "가장 먼저 잘라낼 수 있는 Task"라고 적었던 것은 무효).
- 일정을 줄여야 한다면 잘라낼 수 있는 것은 **테스트 UI(`source-test-panel.tsx`)와 `test-source` 라우트뿐**이고, `rss.ts`는 반드시 남겨야 한다. 다만 RSS 요약 길이를 눈으로 확인할 수단이 사라지므로 "본문 전문 수집을 켤지" 판단이 감으로 바뀐다는 점을 감수해야 한다.

### Q6. RSS `pubDate` 기반 기간 필터 도입 여부

- **배경**: RSS 피드는 항목마다 발행 시각(`pubDate`/`updated`)을 준다. "최근 24시간 기사만 수집" 같은 필터를 거의 공짜로 만들 수 있고, **핫 키워드라는 목적에는 기간 개념이 자연스럽다.**
- **비용**: HTML 방식은 목록 페이지에서 발행 시각을 안정적으로 얻을 수 없다(매체마다 위치·형식이 다르고 상대 시각 "3시간 전"인 경우도 많다). 필터를 넣으면 **RSS 언론사에만 적용되는 옵션**이 되어, 같은 실행 안에서 언론사마다 수집 기준이 달라진다.
- **📌 결정: MVP 범위 밖.** PRD 기능 명세에 기간 개념이 없고, 방식에 따라 적용 여부가 갈리는 옵션은 "왜 이 언론사만 기사가 적지?"라는 혼란을 만든다. 지금은 **`maxArticlesPerPress`(언론사당 최대 기사 수)** 하나로 수집량을 통제하는 편이 일관적이다.
- 대신 **Task 010의 `FeedItem`에 `publishedAt`은 파싱해 둔다.** 저장하지 않더라도 파서가 값을 갖고 있으면 나중에 도입할 때 파서를 다시 건드리지 않아도 된다.

---

## 🧪 검증 시나리오

MVP 완료를 손으로 확인하는 절차입니다. **PRD 사용자 여정 1→5를 그대로 태웁니다.** `data/` 디렉터리를 비운 초기 상태에서 시작하세요.

### 사전 준비

```bash
rm -rf data/runs data/press-sources.json data/stopwords.json   # kiwi-model은 남긴다
npm run dev
```

### 0단계 — 초기 빈 상태 확인

| # | 확인 | 기대 결과 |
|---|------|-----------|
| 0-1 | `/` 접속 | "등록된 언론사가 없습니다" 빈 상태 + `[언론사 관리로 이동]`, `[크롤링 시작]` 비활성 |
| 0-2 | `/results` | "아직 크롤링한 결과가 없습니다" + `[크롤링 실행하러 가기]` |
| 0-3 | `/keywords` | "수집된 데이터가 없습니다" + `[크롤링 실행하러 가기]` |
| 0-4 | `/press` | "등록된 언론사가 없습니다" + `[+ 언론사 추가]` |
| 0-5 | `/stopwords` | 기본 제공 불용어 **7건**(기자·사진·제공·앵커·무단전재·재배포금지·이번), 사용자 추가 0건 |

### 1단계 — 언론사 등록 (`F007`, 여정 [분기 B])

**세 경로를 모두 만들어야 한다** — ① RSS(요약만) ② RSS(본문 전문) ③ HTML. 이후 단계가 이 세 가지를 한 실행에서 검증한다.

| # | 행동 | 기대 결과 |
|---|------|-----------|
| 1-1 | `/press` → `[+ 언론사 추가]` | 다이얼로그가 열리고 **수집 방식 토글이 첫 필드**, 기본값 `RSS 피드` |
| 1-2 | ① RSS 언론사 정보 입력(이름 + 피드 URL) | 셀렉터 입력란이 하나도 보이지 않는다 |
| 1-3 | `[피드 테스트]` 클릭 | "기사 N건 · 요약 평균 M자" + 최신 3건 제목. **한글이 깨지지 않는다**(EUC-KR 피드면 특히 중요) |
| 1-4 | 피드 URL을 `etnews.com/rss`처럼 스킴 없이 넣고 저장 시도 | 필드 하단에 한국어 오류 문구 + `aria-invalid` |
| 1-5 | 정상 입력 후 저장 | 토스트 + 목록에 `〔RSS〕` 배지가 붙은 행 추가, `data/press-sources.json`에 기록 |
| 1-6 | ② 두 번째 RSS 언론사 추가 — **본문 전문 수집 ON** + 본문 셀렉터 입력 | 스위치를 켜면 본문 셀렉터 입력이 펼쳐지고, 비워 두면 저장이 막힌다 |
| 1-7 | ③ 세 번째 언론사를 **목록 페이지 방식**으로 추가 | 방식 토글을 바꾸면 피드 URL이 사라지고 목록 URL + 셀렉터 3종으로 교체된다 |
| 1-8 | 기사 링크 셀렉터 옆 `[셀렉터 테스트]` 클릭 | "링크 N개 발견" + 샘플 URL 3건 |
| 1-9 | 저장 후 목록의 `수집 설정` 컬럼 확인 | ①은 `피드 요약만`(텍스트, 클릭 불가) · ②는 `본문 셀렉터 ▸` · ③은 `셀렉터 3개 ▸` |
| 1-10 | ②·③의 펼침 버튼 클릭 | 같은 표 안에 서브 행으로 설정이 `font-mono`로 펼쳐짐 |
| 1-11 | ③을 수정 다이얼로그에서 RSS로 바꿔 저장 → 다시 열기 | 셀렉터 3개가 남아 있지 않다(경고 문구대로). **확인 후 되돌려 둔다** |

### 2단계 — 크롤링 실행 및 진행 관찰 (`F001` `F002` `F003`, 여정 1→2)

| # | 행동 | 기대 결과 |
|---|------|-----------|
| 2-1 | `/` 접속 | 1단계에서 등록한 활성 언론사 3곳이 체크박스로 보이고, **각 항목에 `RSS`/`HTML` 배지**와 방식에 맞는 URL이 표시됨 |
| 2-2 | 1곳만 체크 | "1/3개 선택됨", 전체 선택 체크박스가 `indeterminate`, `[크롤링 시작]` 활성 |
| 2-3 | 전체 선택 후 "언론사당 최대 기사 수" = 5 | 입력 반영 |
| 2-4 | `[크롤링 시작]` | 버튼이 `[중단]`으로 바뀌고, 진행률·"현재: {언론사} — n/5건"·언론사별 상태 리스트가 **1초 간격으로 갱신** |
| 2-5 | 진행 중 옵션 입력·체크박스 조작 시도 | 모두 `disabled` |
| 2-6 | 완료 대기 | 완료 요약(언론사 수·기사 수·저장 경로) + 토스트, `[수집 결과 보기]` 노출 |
| 2-7 | 파일 시스템 확인 | `data/runs/{runId}/run-meta.json` + `articles/0001.txt` … 존재, txt 상단에 메타 라인 **7줄**(`contentSource` 포함) |
| 2-8 | txt들의 `contentSource` 확인 | ①에서 온 기사는 `rss-summary`, ②·③에서 온 기사는 `article-page` |
| 2-9 | ①과 ③의 기사 본문 길이 비교 | ①(요약)이 ③(전문)보다 눈에 띄게 짧다 — 이게 `contentSource`를 기록하는 이유다 |

> 한 언론사의 셀렉터를 일부러 틀리게 두거나 피드 URL을 존재하지 않는 주소로 바꾸면 **부분 실패 상태**(destructive Alert + 실패 언론사 `CircleX`)도 함께 확인할 수 있습니다. 이때 실패 사유가 방식에 맞게 나오는지(`셀렉터 불일치` vs `피드 파싱 실패`) 확인하세요.

### 3단계 — 수집 결과 확인 (`F003` `F004`, 여정 3)

| # | 행동 | 기대 결과 |
|---|------|-----------|
| 3-1 | `[수집 결과 보기]` 클릭 | `/results`로 이동, 방금 실행이 셀렉터에 기본 선택됨 |
| 3-2 | 실행 요약 카드 확인 | 시각·소요시간·대상 언론사 배지·성공/실패 건수·저장 경로 |
| 3-3 | 파일 미선택 상태 | 우측에 "파일을 선택하면 본문을 미리 볼 수 있습니다" |
| 3-4 | 파일 1건 클릭 | 제목·언론사·**본문 출처 배지**(`원문 전문`/`피드 요약`)·수집 시각 메타 + 본문이 `whitespace-pre-wrap`으로 표시, 선택 행에 `bg-muted` |
| 3-4b | RSS 요약 기사와 전문 기사를 번갈아 선택 | 배지가 각각 `피드 요약` / `원문 전문`으로 바뀐다 |
| 3-5 | 검색창에 제목 일부 입력 | 목록이 필터링됨 |
| 3-6 | 🔗 원문 링크 클릭 | 새 탭에서 원문 기사가 열림 |
| 3-7 | `[키워드 분석]` 클릭 | `/keywords?runId={runId}`로 이동 |

### 4단계 — 핫 키워드 분석 (`F005` `F006`, 여정 4)

| # | 행동 | 기대 결과 |
|---|------|-----------|
| 4-1 | 진입 시 run 셀렉터 | 3단계에서 넘어온 run이 선택되어 있음 |
| 4-2 | `[분석 시작]` | 3단계 스텝(모델 로딩 → 토큰화 → 집계)이 순차 표시. **첫 실행은 1.4초 모델 로딩이 얹힘** |
| 4-3 | 분석 요약 5개 수치 | "전체 토큰 수"보다 "조사·어미 제거 후"가 **절반 가까이 작다** ← 조사 제거의 증거 |
| 4-4 | Top 5 카드 | 1위가 가장 큰 폰트 + 가장 진한 상단 강조선, 품사 배지 표시 |
| 4-5 | 랭킹 표 | 빈도 내림차순, 비중 막대와 백분율 텍스트 병기 |
| 4-6 | **조사 제거 확인** | `삼성전자가`·`삼성전자를` 같은 변형이 아니라 `삼성전자` 하나로 합산되어 있음 |
| 4-7 | **함정 ② 확인** | 기사에 "공개했다"·"적용했다"·"경쟁한다"가 있다면 `공개`·`적용`·`경쟁`이 키워드에 **살아 있음** |
| 4-8 | 1글자 확인 | `것`·`수`·`점` 같은 1글자 명사가 랭킹에 없음 |
| 4-9 | 최소 등장 횟수 3으로 변경 | **Kiwi 재실행 없이 즉시** 목록이 줄어듦 |
| 4-10 | 품사를 `NNP`만 선택 | 고유명사만 남음 |
| 4-11 | 2회차 분석 실행 | 모델 로딩 단계가 **눈에 띄게 빠름**(싱글턴 확인) |

### 5단계 — 불용어로 랭킹 다듬기 (`F008`, 여정 4 [분기 A])

| # | 행동 | 기대 결과 |
|---|------|-----------|
| 5-1 | 랭킹에서 상투어(예: `기자`) 발견 후 행의 🚫 클릭 | 불용어에 추가되고 재분석 후 랭킹에서 사라짐 |
| 5-2 | `[불용어 관리로 이동]` | `/stopwords`로 이동, 방금 추가한 단어가 "사용자 추가" 섹션에 있음 |
| 5-3 | 일괄 추가 패널 펼쳐 `앵커, 특파원\n인턴기자` 입력 | 3건이 분리 추가됨 |
| 5-4 | 이미 있는 단어 추가 시도 | destructive Alert "이미 등록된 불용어입니다", 목록 불변 |
| 5-5 | 기본 프리셋 칩 ✕ 클릭 | 확인 다이얼로그가 뜨고 초기 포커스가 `취소` |
| 5-6 | `[분석 페이지로 돌아가 재분석]` | `/keywords`로 이동 |
| 5-7 | `[재분석]` 클릭 | 추가한 불용어들이 모두 랭킹에서 제외됨 |

### 6단계 — 재크롤링 루프 (여정 5, [분기 B])

| # | 행동 | 기대 결과 |
|---|------|-----------|
| 6-1 | `/press`에서 언론사 1곳을 **비활성**으로 토글 | 토스트 |
| 6-2 | `/`로 이동 | 비활성 언론사가 체크박스 목록에서 **사라짐** |
| 6-3 | 남은 언론사로 다시 크롤링 | 새 `runId` 폴더 생성 |
| 6-4 | `/results` 실행 셀렉터 | 실행 2건이 **최신순**으로 보임 |
| 6-5 | 언론사 삭제 후 과거 run 조회 | 500 에러 없이 정상 표시(삭제된 언론사 표시 포함) |

### 반응형 · 접근성 최종 확인

| # | 확인 | 기대 결과 |
|---|------|-----------|
| R-1 | 375px 폭에서 5개 화면 순회 | 헤더가 햄버거+Sheet로, 표가 카드 리스트로 전환, 가로 스크롤 없음 |
| R-2 | 768px 폭 | 헤더 메뉴 펼침, 언론사 관리 표 노출 |
| R-3 | 1280px 폭 | 홈·수집 결과의 2단 레이아웃, 우측 패널 sticky 동작 |
| R-4 | 키보드만으로 1~5단계 재수행 | 모든 조작 가능, 포커스 링이 항상 보임 |
| R-5 | 다크모드 토글 | 5개 화면 모두 하드코딩 색상 없이 정상 전환 |
| R-6 | 브라우저 콘솔 | 에러·경고 0건 |

---

## 🚫 MVP 범위 밖 (이 로드맵에서 다루지 않음)

PRD §"MVP 이후 기능 (제외)"을 그대로 따릅니다. 아래 항목은 **어떤 Task에도 포함하지 않습니다.**

| 항목 | 사유 |
|------|------|
| 데이터베이스(PostgreSQL 등) 저장 | 지금은 txt/JSON. Phase 1의 레포지토리 계층이 교체 지점이다 |
| 회원가입 · 로그인 · 권한 | 로컬 단일 사용자 도구 — PRD에 인증 페이지·메뉴·기능 ID가 없다 |
| 여러 실행 결과 비교 · 키워드 시계열 트렌드 | |
| 키워드 CSV / 엑셀 내보내기 | |
| 언론사별 키워드 비교 · 카테고리 자동 분류 | |
| 예약 크롤링(스케줄링) · 알림 | |
| 개별 txt 다운로드 · OS 폴더 열기 버튼 | 브라우저에서 파일 탐색기를 열 수 없다. 저장 경로를 화면에 노출하는 것으로 대체(화면 설계서 02) |
| 제목 · 본문 셀렉터 테스트 | 폼에 없는 "테스트용 기사 URL" 입력이 필요해 범위가 커진다(화면 설계서 04) |
| RSS `pubDate` 기간 필터("최근 24시간") | 결정 필요 사항 Q6 참고 — HTML 방식에는 적용할 수 없어 언론사마다 수집 기준이 갈린다 |
| 피드 URL 자동 탐지 | 사이트 URL만 받아 `<link rel="alternate" type="application/rss+xml">`로 피드를 찾아 주는 기능. 편리하지만 매체마다 섹션별 피드가 여러 개라 어느 것을 고를지 결국 사람이 정해야 한다. 소스 테스트(Task 010)로 확인하는 편이 확실하다 |
| 차트 라이브러리(recharts) 도입 | 표시 지표가 빈도 1개뿐 — Tailwind 미니 막대로 충분(화면 설계서 03) |
| `userWords` 사용자 사전 관리 | 결정 필요 사항 Q1 참고 — MVP 밖으로 결정 |
| `@playwright/test` E2E 스위트 | 결정 필요 사항 Q4 참고 — Playwright MCP + 수동 시나리오로 대체 |
| 서버리스 배포 | Playwright 네이티브 바이너리 + Kiwi RSS 780MB로 불가능(kiwi-verification §2) |
