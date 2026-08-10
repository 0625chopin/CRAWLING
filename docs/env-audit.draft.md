# 환경변수 대조 · README 실행 순서 점검 (Task 024 사전 조사)

**작성 배경** — 14일차(화면 워크스트림 유휴 배정). Task 024(실행 안내 최종 점검)는 023(크롤 파이프라인)이
끝나야 열리므로 이번 회차는 그 사전 조사만 한다. 여기서 나온 결과는 15일차 024 본번이 그대로 이어받는다.
**코드·`.env.example`·`README.md`·`docs/ROADMAP.md`는 이번 회차에 한 글자도 고치지 않았다** — 아래는 대조
결과와 발견 사실만 담는다.

---

## 1. 환경변수 전수 조사 방법

```
grep -rn "process\.env\." --include="*.ts" --include="*.tsx" lib/ app/ components/ hooks/ next.config.ts
```

저장소 전체(`*.ts`·`*.tsx`, `node_modules` 제외)를 대상으로 다시 돌려도 결과는 동일하다 — **`process.env.`를
읽는 파일은 `lib/crawler/config.ts` 단 하나**다. `lib/keyword/kiwi.ts`는 직접 열어 확인했고, **환경변수를
전혀 읽지 않는다** — 모델 디렉터리(`MODEL_DIR = path.join(process.cwd(), 'data', 'kiwi-model')`)와 WASM
경로가 코드에 하드코딩돼 있다(`lib/keyword/kiwi.ts:22-31`). 팀장 배정 메모가 "Kiwi 모델 경로" 환경변수를
특히 보라고 했는데, **그런 환경변수는 존재하지 않는다** — 확인 결과 자체가 이번 조사의 산출물이다.

`next.config.ts`는 `process.env`를 전혀 참조하지 않는다(`serverExternalPackages` 배열은 정적 값).

## 2. 환경변수 대조표 (전 항목)

`lib/crawler/config.ts`가 읽는 변수 7개 전부다. **어긋나는 칸은 굵게** 표시했다.

| # | ① 이름 | ② 코드 기본값 | ③ `.env.example`에 있는가 | ④ 거기 적힌 기본값 | ⑤ `README.md`에 있는가 | ⑥ `ROADMAP.md` §개발 환경 준비에 있는가 |
| - | --- | --- | --- | --- | --- | --- |
| 1 | `CRAWL_CONCURRENCY` | `2` (`config.ts:10`) | 예 (`.env.example:6`) | `2` — 일치 | 아니오 — 개별 변수는 안 나열, "동시성·타임아웃·UA 등 조정"(README:30)으로 뭉뚱그려 `.env.example`을 가리킴 | 아니오 — 같은 문구로 뭉뚱그림(ROADMAP:69) |
| 2 | `CRAWL_PRESS_CONCURRENCY` | `3` (`config.ts:18`, D-015) | **아니오 — `.env.example`에 이름 자체가 없다** | — | **아니오** | **아니오** |
| 3 | `CRAWL_TIMEOUT_MS` | `30000` (`config.ts:20`) | 예 (`.env.example:9`) | `30000` — 일치 | 아니오(1과 동일하게 뭉뚱그림) | 아니오(1과 동일) |
| 4 | `CRAWL_DELAY_MS` | `500` (`config.ts:22`) | 예 (`.env.example:12`) | `500` — 일치 | 아니오(1과 동일) | 아니오(1과 동일) |
| 5 | `CRAWL_USER_AGENT` | 미설정 시 하드코딩 Chrome UA 문자열로 폴백(`config.ts:31-32`) | 예, 주석 처리(`.env.example:15`) | 리터럴 기본값은 안 적혀 있고 "비워 두면 기본 데스크톱 Chrome UA를 사용합니다"로 동작만 서술 — **동작 설명은 일치, 문자열 자체를 비교할 대상이 아님(문제 아님)** | 아니오(1과 동일) | 아니오(1과 동일) |
| 6 | `PLAYWRIGHT_CHANNEL` | 미설정 시 `undefined`(`config.ts:27`) | 예, 주석 처리(`.env.example:21`) | 기본값 없음(주석) — 코드와 일치(둘 다 "안 정하면 Playwright 번들 Chromium") | 아니오(1과 동일) | 아니오(1과 동일) |
| 7 | `PLAYWRIGHT_HEADLESS` | `true`(`'false'` 문자열이 아니면 전부 true, `config.ts:29`) | 예 (`.env.example:24`) | `true` — 일치 | 아니오(1과 동일) | 아니오(1과 동일) |

### 판정

- **`.env.example` 기준으로는 `CRAWL_PRESS_CONCURRENCY` 하나만 어긋난다.** 나머지 6개는 이름·기본값이
  전부 일치한다.
- **`README.md`·`docs/ROADMAP.md`는애초에 개별 변수를 나열하지 않는 설계다** — 둘 다 "동시성·타임아웃·UA
  등 조정"이라는 한 문장으로 `.env.example`을 가리키기만 한다(README:30, ROADMAP:69). 그래서 이 두 문서에는
  "이름이 빠졌다"고 표시할 개별 항목이 원래 없다 — 6개 열은 전부 "아니오"이지만 이것은 **어긋남이 아니라
  두 문서의 원래 서술 방식**이다. Task 024 구현 규칙이 요구하는 "세 곳이 같은 이름·같은 기본값을 말한다"는
  `.env.example`에 이름이 있고 README/ROADMAP이 그 존재를 (개별 나열 없이도) 간접적으로 가리키는 지금 구조를
  깨지 않는다 — **단, `.env.example`에 이름이 아예 없으면 두 문서의 "등"(에 포함됨)이라는 서술도 거짓이
  된다.** `CRAWL_PRESS_CONCURRENCY`가 바로 이 경우다: README·ROADMAP은 "동시성 조정 가능"이라고 말하는데
  실제로는 언론사 레벨 동시성(`pressConcurrency`)을 조정할 방법이 `.env.example`에 없다.

### 발견한 결함 (024가 고쳐야 할 것)

**`CRAWL_PRESS_CONCURRENCY`가 `.env.example`에서 완전히 빠져 있다.**

- 근거: `lib/crawler/config.ts:18`에서 `readInt(process.env.CRAWL_PRESS_CONCURRENCY, 3)`으로 읽는다.
  도입 경위는 `docs/DECISIONS.md` D-015(7일차, Task 014A) — "언론사 레벨 동시성" 캡을 위해 추가된 변수다.
  Task 015 계열(크롤 파이프라인)이 이후 도입한 것이라 **Task 001이 만든 최초 `.env.example`에는 애초에
  없었고, 그 뒤로 아무도 추가하지 않았다.**
- 영향: 사용자가 언론사 수를 많이 등록해 로컬 리소스(동시 Playwright 페이지 총량)를 조정하고 싶어도
  `.env.example`을 봐서는 그런 변수가 있는지 알 방법이 없다. `readInt`가 실패 시 기본값(3)으로 조용히
  폴백하므로 **화면은 멀쩡해 보이지만 사용자가 의도한 값이 반영되지 않을 수 있다**(예: 오타를 내도 에러 없이
  3으로 동작).
- **`.env.example`에 추가할 내용(024가 반영. 이번 회차에는 적용하지 않음)**:
  ```
  # 실행(run) 안에서 동시에 크롤할 언론사 수 상한 (기본 3)
  CRAWL_PRESS_CONCURRENCY=3
  ```
  위치는 `CRAWL_CONCURRENCY`(.env.example:6) 바로 아래가 자연스럽다 — `config.ts`의 선언 순서와 D-015의
  "concurrency 옆에 pressConcurrency" 서술과 맞춰서다.
- draft 이슈: [`docs/ISSUES.draft.화면.md`](./ISSUES.draft.화면.md)에 등록.

### `.env.example`에 없어야 정상인 항목 확인

- `lib/keyword/`는 환경변수를 하나도 안 쓰므로 **추가할 것이 없다.** Kiwi 모델 경로(`data/kiwi-model/`)가
  환경변수화돼 있지 않은 것은 결함이 아니라 설계다 — `docs/kiwi-verification.md` 함정 ⑤가 "모델을 `public/`에
  두면 브라우저가 105MB를 받는다"는 이유로 경로를 고정해 두었고, 사용자가 조정할 이유가 없다(모델은 항상
  `data/kiwi-model/`에 있어야 `.gitignore`의 `/data` 제외 규칙과도 맞는다).

---

## 3. README 실행 순서 대조

**방법**: `.env.local`을 실제로 지우지 않고(dev 서버가 3100번에서 돌고 있고 다른 워크스트림이 씀), `README.md`를
한 줄씩 읽으며 그 명령·경로·파일명이 지금 저장소에 실재하는지 대조했다(실행하지 않고 정적 대조).

| README 문장 | 대조 대상 | 결과 |
| --- | --- | --- |
| `README.md:15` `docs/ROADMAP.md` 링크 | 파일 존재 | 일치 |
| `README.md:16` `docs/SCHEDULE/SCHEDULE.md` 링크 | 파일 존재 | 일치 |
| `README.md:17` `docs/ROADMAP/work/` 링크 | 디렉터리 존재 | 일치 |
| `README.md:18` `docs/screens/` 링크 | 디렉터리 존재 | 일치 |
| `README.md:19` `docs/CONVENTIONS.md` 링크 | 파일 존재 | 일치 |
| `README.md:20` `docs/kiwi-verification.md` 링크 | 파일 존재 | 일치 |
| `README.md:21` `docs/ISSUES.md`·`docs/DECISIONS.md` 링크 | 파일 존재 | 일치 |
| `README.md:28` `npm install` | `package.json` 존재, 스크립트 정상 | 일치 |
| `README.md:29` `npx playwright install chromium` | `playwright` 의존성 `^1.62.1`(`package.json:27`) | 일치 |
| `README.md:30` `cp .env.example .env.local` | `.env.example` 존재 | 일치(단, 위 §2의 `CRAWL_PRESS_CONCURRENCY` 누락은 `.env.example` 자체의 결함이지 이 문장의 결함은 아니다) |
| `README.md:39-43` Kiwi 모델 curl·tar·cp 4행, 버전 `v0.23.0` | `package.json:22`의 `kiwi-nlp` `^0.23.0`과 `lib/keyword/kiwi.ts:21`의 `MODEL_VERSION = '0.23.0'` | 일치 |
| `README.md:48` 모델 파일 9종 이름 나열 | `lib/keyword/kiwi.ts:9-19`의 `MODEL_FILE_NAMES` 배열 | 일치(순서·이름 전부 동일) |
| `README.md:55-56` `npm run dev` → `http://localhost:3000` | `package.json:6`의 `"dev": "next dev"`(플래그 없음 → 기본 포트 3000) | **코드 기준으로는 일치.** 지금 이 세션의 dev 서버가 3100번에 떠 있는 것은 워크스트림 동시 작업을 위해 팀장이 수동으로 지정한 포트일 뿐, 코드나 스크립트에 3100이 박혀 있지 않다 — README를 고칠 대상이 아니다(참고: `docs/screens/verification-checklist.draft.md` §0 "라이브 브라우저 확인의 제약" 절이 같은 사실을 이미 기록해 두었다). |
| `README.md:58` 첫 실행은 `/press`에서 언론사 등록, `data/press-sources.json`이 비어 있다 | `lib/storage/press-defaults.ts`(초기 시드가 빈 배열) | 일치 |
| `README.md:61-62` `docs/press-candidates.md` 링크 | 파일 존재 | 일치 |
| `README.md:67` `npm run lint` | `package.json:9` `"lint": "eslint"` | 일치 |
| `README.md:68` `npm run typecheck` | `package.json:13` `"typecheck": "next typegen && tsc --noEmit"` | 일치 |
| `README.md:69` `npm run test` | `package.json:14` `"test": "vitest run"` | 일치 |
| `README.md:70` `npm run build` | `package.json:7` `"build": "next build"` | 일치 |
| `README.md:71` `npm run format` | `package.json:11` `"format": "prettier --write ."` | 일치 |
| `README.md:74-75` `typecheck`가 `next typegen`을 먼저 돈다는 설명 | `package.json:13` 스크립트 본문과 정확히 일치 | 일치 |
| `README.md:79-80` 기술 스택 나열(버전 포함) | `package.json` dependencies/devDependencies | 일치(Next 16.3.0·React 19.2.8·Playwright 1.62.1·Cheerio 1.2.0·kiwi-nlp 0.23.0·zod 4·vitest 전부 확인) |

### 결론

**README에서 현재 코드와 어긋나는 문장을 찾지 못했다.** 링크·명령어·버전·파일 경로·파일명 전부 실재와
일치한다. Task 024 구현 규칙의 "막히지 않으면 고칠 것이 없는 것" 조건에 해당한다 — **README는 이번 조사
기준으로 고칠 곳이 없다.** (단, `.env.example`에 `CRAWL_PRESS_CONCURRENCY`가 추가되면 README는 그대로
두어도 된다 — README가 개별 변수를 나열하지 않는 서술 방식이기 때문이다. §2 참고.)

`.env.local`을 실제로 지우고 처음부터 실행해 보는 절차(024 구현 규칙 1항)는 이번 회차에 하지 않았다 —
3100번 dev 서버를 다른 워크스트림이 쓰고 있어서다. **15일차 024 착수 시 반드시 1회 실행**해서 이 정적
대조로는 못 잡는 런타임 문제(예: 실제 `.env.local` 부재 상태에서의 첫 요청 지연·에러 메시지 문구)가 없는지
확인해야 한다.

---

## 4. 024 착수 시 체크리스트 (요약)

1. `.env.example`에 `CRAWL_PRESS_CONCURRENCY=3` 한 줄 추가(§2의 위치·문구 그대로 사용 가능).
2. `README.md`는 **고칠 문장이 없다** — 전면 재작성 금지 규칙과도 맞다.
3. `docs/ROADMAP.md` §개발 환경 준비는 개별 변수를 나열하지 않으므로 **변경 없음**으로 끝낸다(ROADMAP은
   팀장 전용 편집 대상이라 이번 회차는 물론 15일차에도 화면 워크스트림이 손대지 않는다 — 팀장에게 "동기화
   필요 없음"만 보고).
4. `.env.local`을 실제로 지우고 README 순서대로 1회 실행 — 이번 회차에 못한 유일한 검증.
