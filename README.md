# IT/AI 뉴스 핫 키워드 크롤러

체크박스로 고른 언론사에서 IT/AI 기사를 수집해 txt로 모으고, Kiwi 형태소 분석으로 조사·어미를 걷어낸 뒤
빈도를 세어 **핫 키워드 랭킹**을 뽑는 **로컬 단일 사용자 도구**다.

> ⚠️ **서버리스 배포 대상이 아니다.** Playwright 네이티브 브라우저 바이너리와 Kiwi WASM 인스턴스(RSS +780MB)가
> 필요해 Vercel 등 서버리스 환경에서 동작하지 않는다. `next dev` / `next start`로 도는 **장수명 로컬 Node
> 프로세스**를 전제한다.

## 문서

| 문서                                                                              | 내용                                           |
| --------------------------------------------------------------------------------- | ---------------------------------------------- |
| [`docs/PRD.md`](./docs/PRD.md)                                                    | 요구사항·기능 명세(F001~F008)·데이터 모델      |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md)                                            | Task 001~025 실행 계획. **스코프의 단일 소스** |
| [`docs/SCHEDULE/SCHEDULE.md`](./docs/SCHEDULE/SCHEDULE.md)                        | 워크스트림 편성·일정·크리티컬 패스             |
| [`docs/ROADMAP/work/`](./docs/ROADMAP/work/)                                      | 워크스트림별 담당 Task                         |
| [`docs/screens/`](./docs/screens/)                                                | 화면 설계서(정적 마크업·레이아웃)              |
| [`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md)                                    | 코드 디렉터리·명명·에러 처리 규약              |
| [`docs/kiwi-verification.md`](./docs/kiwi-verification.md)                        | Kiwi 실측 검증 결과와 함정 5가지               |
| [`docs/ISSUES.md`](./docs/ISSUES.md) · [`docs/DECISIONS.md`](./docs/DECISIONS.md) | 회차 운영 중 등재되는 이슈·결정                |

## 설치

`.gitignore`가 `/data`를 통째로 제외한다. **clone 직후에는 Kiwi 모델도, 언론사 목록도 없다.**

```bash
npm install
npx playwright install chromium          # 크롤링용 헤드리스 브라우저
cp .env.example .env.local               # 동시성·타임아웃·UA 등 조정 (없어도 기본값으로 동작)
```

### Kiwi 모델 배치 (필수)

**패키지 버전(`kiwi-nlp` 0.23.0)과 모델 버전이 정확히 같아야 한다.** 경량 v0.21.0(34MB)은 `build()`가 실패하며
대체 경로가 없다 — 모델 버전 불일치가 가장 흔한 실패 원인이다.

```bash
curl -L -o kiwi_model.tgz \
  https://github.com/bab2min/Kiwi/releases/download/v0.23.0/kiwi_model_v0.23.0_base.tgz
tar -xzf kiwi_model.tgz                  # models/cong/base/ 아래에 풀린다
mkdir -p data/kiwi-model
cp models/cong/base/* data/kiwi-model/   # 9개 파일 105MB
```

| 확인 항목                  | 기대값                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `data/kiwi-model/` 파일 수 | 9개 (`combiningRule.txt` `cong.mdl` `default.dict` `dialect.dict` `extract.mdl` `multi.dict` `nounchr.mdl` `sj.morph` `typo.dict`) |
| 모델 위치                  | `data/kiwi-model/` — **`public/`에 두지 말 것**(브라우저가 105MB를 내려받게 된다)                                                  |
| 여유 RAM                   | 최소 2GB (Kiwi 인스턴스 1개당 RSS +780MB). 8GB 이하 머신 비권장                                                                    |

## 실행

```bash
npm run dev        # http://localhost:3000
```

첫 실행에서 할 일은 **언론사 등록**이다(`/press`). `data/press-sources.json`이 비어 있으므로 크롤링 대상이 없다.

**수집 방식은 RSS를 먼저 찾아보고, 없을 때만 목록 페이지(HTML) 방식을 쓴다.** CSS 셀렉터를 손으로 맞추는 쪽이
매체 개편에 쉽게 깨지고 유지보수 부담이 크다. 후보 매체와 확인된 피드 URL은
[`docs/press-candidates.md`](./docs/press-candidates.md)에 정리해 두었다.

## 검증 명령

```bash
npm run lint        # ESLint (Next.js 16에서 next lint는 제거됐고 next build도 린트를 돌리지 않는다)
npm run typecheck   # next typegen && tsc --noEmit — tsc 단독으로 대체하지 않는다
npm run test        # vitest — lib/ 순수 함수 전용
npm run build
npm run format      # prettier --write .
```

`npm run typecheck`가 `next typegen`을 먼저 도는 이유는 `PageProps`·`LayoutProps`·`RouteContext` 생성 타입이
있어야 App Router 코드의 타입 검사가 성립하기 때문이다.

## 기술 스택

Next.js 16.3.0(App Router) · React 19.2.8 · TypeScript 5 · Tailwind CSS v4 · shadcn/ui(`radix-nova`/`neutral`)
· Playwright 1.62.1 · Cheerio 1.2.0 · fast-xml-parser · kiwi-nlp 0.23.0(WASM) · zod 4 · vitest

저장소는 DB 없이 Node.js `fs` 기반 txt/JSON이다. 데이터가 쌓이면 `lib/storage/`의 레포지토리 구현체만 교체해
DB로 전환한다 — 자세한 대응 관계는 [`docs/PRD.md`](./docs/PRD.md) §데이터 모델 참고.
