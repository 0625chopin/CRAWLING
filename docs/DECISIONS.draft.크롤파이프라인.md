# 크롤 파이프라인 — 미번호 결정 초안

번호는 회차 마감에 팀장이 부여한다(`docs/CONVENTIONS.md`). 여기 있는 항목은 아직 `DECISIONS.md`에 없다.

---

## 「실패」와 「요청하지 않음」은 문구가 아니라 타입으로 가른다

- 배경: I-017 · 9일차 마감 후 수정
- 영향 파일: `lib/crawler/press-crawler.ts` · `lib/crawler/run-manager.ts` ·
  `lib/types/crawl-run.ts` · `lib/storage/run-repository.ts`

**결정**: 중단으로 요청조차 하지 않은 링크는 `CrawlFailure`(`error: '실행이 중단되어…'`)로 남기지 않고
별도 통로(`PressCrawlResult.skipped: string[]` → `CrawlRun.skippedCount`)로 옮긴다. 링크 1건의 결과는
판별 유니온 `PageOutcome`(`article` | `failure` | `skipped`)이다.

**대안을 버린 이유**: I-017이 제시한 ②안(`finishRun`이 `status: 'aborted'`일 때 중단 사유 실패를 걸러
센다)은 `error` 문자열을 다시 문자열로 판정한다. **문구를 다듬는 순간 집계가 조용히 틀어지고, 틀어져도
화면은 멀쩡해 보인다.** I-016이 같은 이유로 예외 판정을 문자열에서 타입으로 옮긴 전례가 있고
(`RunNotFoundError`·`RunNotAbortableError`), `docs/CONVENTIONS.md` §3도 "전부 optional인 평평한 객체 +
수동 검사"가 아니라 `z.discriminatedUnion`을 쓰라고 한다. 같은 원칙을 함수 반환값에도 적용했다.

**함께 정한 것 둘**

1. **건너뛴 링크는 `onArticleDone`을 부르지 않는다.** 집계만 고치고 이 훅을 그대로 두면 진행률이
   100%까지 차올라 화면은 여전히 "다 됐다"고 말한다 — I-017의 절반은 진행 상태 쪽 거짓이었다.
   `target`은 원래 목표치(30)를 유지하고 `collected`만 실제 처리 건수(8)에서 멈춘다.
2. **`CrawlRun`에 새 필드를 더할 때는 기본값 있는 선택 필드로 넣는다.** `skippedCount`를 필수로 두면
   이 필드가 생기기 전 `run-meta.json`이 `crawlRunSchema.safeParse`에서 떨어지고 → `readRunMeta`가
   손상으로 던지고 → `listRuns`가 예외를 삼켜 **그 run이 목록에서 통째로 사라진다.** D-026이 I-014를
   판정하며 실제 코드 경로로 확인한 함정이고, 이번에 그 결론을 규칙으로 굳혔다.
   회귀는 `lib/types/crawl-run.test.ts`가 고정한다.

**집계에 넣지 않기로 한 것**: 중단 시점에 아직 시작조차 하지 않은 언론사의 `skippedCount`는 0이다.
목록·피드를 열지 않았으므로 몇 건을 건너뛴 것인지 알 방법이 없고, 요청 시 지정한 최대 건수로 추정해
채우면 파일에 지어낸 숫자가 남는다. `finishRun`의 `status` 계산에도 `skippedCount`를 넣지 않는다 —
건너뛴 건이 있다는 이유로 실행이 `partial-failed`가 되면 안 된다.
