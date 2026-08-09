# 결정 대장

회차를 굴리다 내린 설계·운영 결정을 번호(`D-NNN`)를 붙여 모아 두는 곳이다.

**착수 전에 확정한 결정은 이미 문서에 반영돼 있다** — 코드 규약은 [`CONVENTIONS.md`](./CONVENTIONS.md),
스코프 관련 미결은 [`ROADMAP.md`](./ROADMAP.md) §결정 필요 사항에 있다. 이 파일은 그 이후에 새로 생기는
결정을 담는다.

## 규칙

- **워크스트림은 이 파일에 새 헤딩(`### D-NNN`)을 직접 붙이지 않는다.** 번호 없이
  `docs/DECISIONS.draft.<AREA>.md`에 쓰고, 번호 부여와 병합은 **회차 마감에 팀장만** 한다.
- 이미 번호가 붙은 블록 안의 내용(상태 갱신·교차 참조 추가)은 직접 고쳐도 된다.
- 번호는 `D-001`부터 1씩 증가한다. **뒤집힌 결정도 지우지 않는다** — 상태를 `대체됨`으로 바꾸고 대체한 번호를 적는다.
  왜 그렇게 하지 않기로 했는지가 나중에 같은 논의를 되풀이하는 것을 막는다.
- **코드 규약이 바뀌는 결정은 여기에 기록한 뒤 [`CONVENTIONS.md`](./CONVENTIONS.md)에도 반영한다.**
  구현자가 읽는 것은 규약 문서이지 이 대장이 아니다.

## 서식

```markdown
### D-001 · <한 줄 제목>

- 상태: 유효 | 대체됨(→ D-0NN)
- 결정: <N일차> · <제안한 워크스트림>
- 영향 Task: <Task 번호>

**배경**: <무엇을 정해야 했는지>
**결정**: <무엇으로 정했는지>
**근거**: <왜. 기각한 대안과 그 이유까지>
**반영**: <어느 문서·코드에 반영했는지>
```

---

<!-- 여기서부터 D-001, D-002 ... 순서로 추가한다. -->
### D-001 · `lib/crawler/types.ts`의 `crawlTargetSchema`는 언론사 전용 필드를 받지 않는다

- 상태: 유효
- 결정: 1일차 · 저장소 계층
- 영향 Task: Task 004 · Task 007 · Task 013A · Task 013B

**배경**: Task 004 구현 규칙이 "언론사 크롤에 필요한 필드 추가 여부만 검토, 범용 스키마는 유지"를 요구했다.
**결정**: `crawlTargetSchema`·`crawlRequestSchema`를 수정하지 않고 그대로 둔다. 언론사 크롤 입력은 새로 만든
`pressSchema`(`discriminatedUnion`)와 `crawlStartRequestSchema`(`pressIds` + `maxArticlesPerPress`) 조합으로 받는다.
**근거**: `crawlTargetSchema`는 `app/api/crawl/route.ts`가 쓰는 임의 URL 배치 크롤용 범용 스키마이지 제품 기능이
아니다. 여기에 `pressId`·`sourceType` 분기를 얹으면 성격이 다른 두 유스케이스가 한 스키마에 섞여 판별자 없는
optional 범벅이 된다 — `CONVENTIONS.md` §3이 금지하는 바로 그 패턴이다. 크롤 파이프라인이 교차검증에서 같은
결론에 동의했다.
**반영**: `lib/crawler/types.ts` 무수정. Task 007이 언론사 크롤 입력 스키마를 실제로 설계할 때 이 결정을 참고한다 —
새 입력이 필요하면 기존 범용 스키마를 오염시키지 말고 별도 스키마를 만든다.

### D-002 · `getKiwi()`는 `lib/keyword/` 밖으로 내보내지 않는다

- 상태: 유효
- 결정: 1일차 · 화면
- 영향 Task: Task 019 · Task 020A · Task 020B

**배경**: Task 019의 「생성/수정 파일」은 `getKiwi()` 싱글턴을 산출물로 나열하는데, 같은 Task의 DoD는 "원시 `kiwi`
인스턴스를 모듈 밖으로 내보내지 않는다"를 요구한다. `getKiwi()`의 반환값이 곧 원시 `Kiwi`라 두 문장이 충돌한다.
**결정**: `getKiwi()`는 `kiwi.ts` 안의 비공개 싱글턴 접근자로만 둔다. `kiwi.ts`와 `index.ts`가 실제로 내보내는 것은
`safeTokenize(text)` · `MATCH_OPTIONS` · `KiwiToken` 타입 셋뿐이다.
**근거**: 「생성/수정 파일」의 `getKiwi()`는 "그런 이름의 싱글턴 접근자가 파일 안에 있어야 한다"로 읽는다. 공개
API까지 요구한다고 읽으면 DoD와 정면으로 모순되고, 함정 ①(`tokenize(text, undefined)`가 Node를 죽인다)이 다른
워크스트림 호출부에서 재발할 통로가 열린다. 모듈의 진짜 경계는 `index.ts`이고 거기서 원시 `Kiwi`가 한 번도 나가지
않아야 이 함정이 구조적으로 봉인된다. Task 020을 담당할 저장소 계층이 교차검증에서 "지금 API만으로 020A·020B를
완전히 구현할 수 있다"고 확인했다.
**반영**: `lib/keyword/kiwi.ts` · `lib/keyword/index.ts`. Task 020이 `blockList`·`typos` 등 다른 옵셔널 인자를 쓰게
되면 `safeTokenize`와 같은 삼항 분기 패턴의 새 안전 래퍼를 `kiwi.ts`에 추가하고 **그 함수만** 내보낸다.
