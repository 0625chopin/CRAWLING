# 코드 규약

이 문서는 **코드 디렉터리·명명·구현 방식 규약의 단일 소스**다. 여러 워크스트림이 25개 Task를 나눠 구현하므로,
Task마다 판단이 갈리면 같은 프로젝트 안에서 서로 다른 코드가 자란다. 그것을 막는 것이 이 문서의 목적이다.

- **스코프(무엇을 만드는가)의 단일 소스는 [`ROADMAP.md`](./ROADMAP.md)다.** 이 문서는 "어떻게 쓰는가"만 다룬다.
- 회차 운영 절차(이슈 번호 부여·교차검증·마감)는 `.claude/skills/workstream-day-runner/SKILL.md`에 있다.
  여기에 중복해 적지 않는다.
- 규약과 충돌하는 판단이 필요하면 혼자 정하지 말고 `docs/ISSUES.draft.<AREA>.md`에 올린다.

---

## 1. 언어

- **사용자 노출 문자열·주석·문서·커밋 메시지는 한국어**다. 화면 라벨, API 오류 메시지, 토스트 문구 모두 해당한다.
- **식별자(변수·함수·타입·파일명)는 영어**다. 한글 식별자를 만들지 않는다.
- 주석은 "무엇을 하는지"가 아니라 **"왜 이렇게 했는지"**를 적는다. 코드를 읽으면 아는 사실을 반복하지 않는다.

## 2. 디렉터리

| 경로 | 담는 것 |
| --- | --- |
| `app/<route>/page.tsx` | 라우트별 페이지. 라우트 ↔ 파일 매핑의 단일 소스는 [`screens/README.md`](./screens/README.md) |
| `app/api/<resource>/route.ts` | REST 라우트 핸들러 |
| `lib/types/` | zod 스키마와 그로부터 파생한 도메인 타입 |
| `lib/storage/` | 파일 저장소 계층. **경로 문자열은 `lib/storage/paths.ts`에만 존재한다** |
| `lib/crawler/` | 수집(HTTP·Playwright·RSS·파싱·오케스트레이션) |
| `lib/keyword/` | Kiwi 어댑터와 추출·집계 |
| `lib/api/` | 클라이언트에서 쓰는 fetch 래퍼와 공통 응답 헬퍼 |
| `components/ui/` | shadcn CLI 생성물. **직접 수정하지 않는다**(lint·prettier 제외 대상) |
| `components/common/` | 화면 공용 조각(`page-container` `page-header` `empty-state` `error-alert`) |
| `components/layout/` | 앱 셸(헤더·내비·테마 토글) |
| `components/<domain>/` | 화면별 컴포넌트(`press` `crawl` `results` `keywords` `stopwords`) |
| `hooks/` | 클라이언트 훅 |
| `data/` | 런타임 산출물. **git에 올라가지 않는다**(`.gitignore`) |

**파일명은 kebab-case**, 컴포넌트 이름은 PascalCase다(`press-form-dialog.tsx` → `PressFormDialog`).

## 3. 타입과 검증

- **zod 스키마를 단일 원천으로 삼고 타입은 `z.infer`로 파생한다.** 같은 모양의 인터페이스를 손으로 또 쓰지 않는다.
- 분기가 있는 데이터는 `z.discriminatedUnion`을 쓴다. "전부 optional인 평평한 객체 + 수동 검사"로 만들지 않는다.
- **시각 필드는 ISO 8601 문자열로 고정한다.** `Date` 객체를 JSON에 넣지 않는다.
- 외부에서 들어오는 값(요청 본문·쿼리·파일에서 읽은 JSON)은 **반드시 스키마를 통과시킨 뒤** 쓴다.

### 식별자 규칙 (확정)

| 대상 | 형식 | 예 |
| --- | --- | --- |
| Press | 이름에서 만든 슬러그(소문자·영숫자·하이픈). 중복 시 접미 숫자 | `etnews`, `etnews-2` |
| CrawlRun | `YYYYMMDD-HHmmss`(로컬 시각). 충돌 시 접미 숫자 | `20260810-143205` |
| Article | 4자리 제로패딩 순번 | `0001` |
| Stopword | `sw-` + 4자리 제로패딩 순번 | `sw-0001` |

**`nanoid`·`uuid` 계열 패키지를 도입하지 않는다.** 로컬 단일 사용자 도구라 순번으로 충분하고, 순번이면 파일
목록이 사람이 읽을 수 있는 순서로 정렬된다. (`nanoid`가 postcss 경유로 `node_modules`에 있더라도 미선언
의존성이므로 import하지 않는다.)

## 4. 서버 전용 코드

- `lib/storage/`·`lib/keyword/`·`lib/crawler/`의 모듈은 **파일 최상단에 `import 'server-only'`** 를 둔다.
  주석만으로 대신하지 않는다 — 클라이언트에서 import되면 빌드 시점에 실패해야 한다.
- `fs`·`playwright`·`kiwi-nlp`를 직접 import하는 파일은 예외 없이 여기 해당한다.

## 5. 프로세스 단위 싱글턴은 `globalThis`에 붙인다

브라우저 인스턴스·Kiwi 인스턴스·크롤 잡 레지스트리처럼 **프로세스당 하나만 있어야 하는 상태는 모듈 스코프
변수로 두지 않는다.** `next dev`의 HMR이 모듈을 다시 평가하면 모듈 스코프 값은 초기화되어, 인스턴스가 누적되거나
진행 중인 잡이 통째로 사라진다.

```ts
const globalForX = globalThis as unknown as { __x?: Promise<X> }
globalForX.__x ??= createX()
```

이 패턴의 기준 구현은 `lib/crawler/browser.ts`다. 새로 만드는 싱글턴은 이 형태를 따른다.

## 6. 라우트 핸들러

- **`export const runtime = 'nodejs'`를 쓰지 않는다.** Node.js 런타임이 이미 기본값이고, Next.js 16에서 Edge
  런타임이 폐기되면서 설치본 문서가 이 export의 제거를 지시한다
  (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md`).
- **동적 세그먼트 `params`·`searchParams`·`cookies()`·`headers()`는 전부 `await` 한다.**
- 캐시되면 안 되는 라우트에만 `export const dynamic = 'force-dynamic'`을 둔다.
- **`maxDuration`은 배포 플랫폼이 참고하는 값이며 `next dev`/`next start`에서는 아무것도 강제하지 않는다.**
  이 프로젝트는 로컬 전용이므로 실행 시간 제한을 설계 근거로 삼지 않는다.

### 응답 형식

- 성공은 `ok(data)`, 실패는 `fail(message, status)`(`lib/api/response.ts`)로 통일한다. 라우트마다 다른 봉투를 만들지 않는다.
- **검증 실패 메시지는 필드별 한국어 문구**로 내려준다. 화면이 그 문구를 필드 하단에 그대로 쓴다.
- 상태 코드: 검증 실패 400 · 없는 리소스 404 · 이미 실행 중 409 · 작업 접수(완료 아님) 202.

## 7. 오류 처리

- **개별 실패는 예외가 아니라 값으로 격리한다.** 기사 1건 실패가 언론사 전체나 실행 전체를 무너뜨리면 안 된다
  (`lib/crawler/types.ts`의 `CrawlFailure` 패턴).
- 사용자에게 보여줄 수 없는 원시 오류(스택·영문 메시지)를 화면까지 흘리지 않는다. 경계에서 한국어 메시지로 바꾼다.
- 파일 파싱 실패는 **조용히 덮어쓰지 않는다.** 사용자가 손으로 편집한 JSON을 날리는 것이 빈 파일로 시작하는 것보다 나쁘다.

## 8. 화면

- **정적 마크업·레이아웃의 단일 소스는 [`screens/`](./screens/) 설계서**다. 설계서에 없는 UI를 지어내지 않고,
  있는 요소·상태·라벨을 빠뜨리지 않는다.
- 페이지 골격은 공통 컴포넌트를 **호출**한다. 같은 마크업을 화면마다 다시 그리지 않는다.
  - 컨테이너 → `components/common/page-container.tsx`
  - 제목·브레드크럼 → `components/common/page-header.tsx`
  - 빈 상태 → `components/common/empty-state.tsx`
  - 오류 → `components/common/error-alert.tsx`
- **내부 이동은 `next/link`**를 쓴다. `app/` 하위의 raw `<a href="/...">`는 `@next/next/no-html-link-for-pages`
  **error**로 `npm run lint`를 실패시킨다. shadcn `Button`·`BreadcrumbLink`는 `asChild`로 `Link`를 감싼다.
- **하드코딩 색상 금지**(`bg-zinc-50`, `text-gray-600` 등). `app/globals.css`의 디자인 토큰만 쓴다 —
  라이트/다크가 자동으로 따라오지 않는다.
- **색상 단독으로 상태를 전달하지 않는다**(WCAG 1.4.1). 아이콘에는 `aria-hidden`을 주고 텍스트 라벨을 병기한다.
- 아이콘 전용 버튼의 `aria-label`에는 **대상 이름을 포함**한다(행마다 반복되는 아이콘은 이름 없이 구분 불가).
- lucide 아이콘은 **신 별칭**으로 통일한다: `LoaderCircle` `CircleCheckBig` `CircleX` `TriangleAlert` `Ban`.
  구 별칭(`Loader2` `CheckCircle2` `XCircle` `AlertTriangle`)은 쓰지 않는다.
- 새 shadcn 컴포넌트 설치가 필요하면 **직접 설치하지 말고 보고한다** — `package.json` 동시 편집 충돌을 막기 위해
  회차 단위로 팀장이 일괄 처리한다.

## 9. 테스트와 검증

- **vitest는 `lib/` 순수 함수 전용**이다(`npm run test`, `lib/**/*.test.ts`). 컴포넌트 렌더링 테스트와
  `@playwright/test` E2E 스위트는 도입하지 않는다.
- 대상은 **틀려도 화면이 멀쩡해 보이는 로직**이다: 키워드 추출 필터(품사·1글자·불용어), 집계, 기사 txt 직렬화·역직렬화
  왕복, 경로 순회 차단, zod 스키마의 거부 케이스. 수동 확인으로 회귀를 잡을 수 없는 것들이다.
- **화면·API Task의 기능 검증은 Playwright MCP로 실제 브라우저에서 동선을 태워 확인한다.**
- 회차 마감 전 항상 실행: `npm run lint` · `npm run typecheck` · `npm run test` · `npm run build`.

## 10. Next.js 버전

`AGENTS.md`의 최우선 지시대로, Next.js 관련 코드를 쓰기 전에 **`node_modules/next/dist/docs/`의 설치본 문서**를
먼저 읽는다. 이 프로젝트의 Next.js는 학습 데이터와 다를 수 있고, 지침서(`.claude/agents/dev/nextjs-app-developer.md`)도
낡을 수 있다. **판정이 갈리면 설치본 문서가 언제나 이긴다.** 어긋난 지점은 draft 이슈로 남긴다.
