# 이슈 대장

회차를 굴리다 발견된 이슈를 번호(`I-NNN`)를 붙여 모아 두는 곳이다. 아직 등재된 이슈는 없다.

## 규칙

- **워크스트림은 이 파일에 새 헤딩(`### I-NNN`)을 직접 붙이지 않는다.** 번호 없이
  `docs/ISSUES.draft.<AREA>.md`에 제목·근거·본문만 쓴다. 번호 부여와 본문 병합은 **회차 마감에 팀장만** 한다
  (동시 편집 시 번호 충돌이 확정적으로 나기 때문이다 — `.claude/skills/workstream-day-runner/SKILL.md` 0-1절).
- **이미 번호가 붙은 블록 안의 내용은 워크스트림이 직접 고쳐도 된다.** `상태` 갱신, 진행 메모 추가, 교차 참조
  한 줄 추가는 새 번호를 만들지 않으므로 충돌 지점이 아니다.
- 번호는 `I-001`부터 1씩 증가한다. 한 번 쓴 번호는 재사용하지 않는다(해결된 이슈도 지우지 않고 상태만 바꾼다).
- 문서와 실물이 어긋나면 **`data/` 하위 실제 파일과 커밋된 코드를 진실로 삼는다.**

## 서식

```markdown
### I-001 · <한 줄 제목>

- 상태: 열림 | 해결됨 | 보류 | 기각
- 발견: <N일차> · <발견한 워크스트림>
- 관련 Task: <Task 번호>

<무엇이 문제인지. 근거 경로는 `파일:줄번호`로.>

**해소**: <해결됐다면 어떻게. 아직이면 이 줄을 뺀다.>
```

---

<!-- 여기서부터 I-001, I-002 ... 순서로 추가한다. -->
### I-001 · `import 'server-only'`이 있는 모듈을 vitest가 import하지 못한다

- 상태: 해결됨
- 발견: 1일차 · 저장소 계층(Task 019 교차검증 중)
- 관련 Task: Task 005 · Task 007 · Task 020A · Task 020B

`server-only` 패키지는 `exports`의 `react-server` 조건으로 no-op(`node_modules/server-only/empty.js`)과
throw(`index.js`)를 가른다. 그 조건을 켜는 것은 Next.js 서버 번들뿐이라, vitest에서는 **정상적인 서버 모듈조차**
import 시점에 `This module cannot be imported from a Client Component module.` 로 죽는다.
`resolve.conditions: ['react-server']`를 켜도 풀리지 않는다.

`docs/CONVENTIONS.md` §4가 `lib/storage/`·`lib/keyword/`·`lib/crawler/` 전 모듈에 `import 'server-only'`를
요구하므로, 규약을 지키면 앞으로 예정된 테스트 파일이 전부 착수 즉시 막힌다 —
`lib/storage/paths.test.ts`(Task 005) · `lib/storage/article-file.test.ts`(Task 007) ·
`lib/keyword/{extract,aggregate}.test.ts`(Task 020A·020B). Task 019는 테스트 파일이 없어 이번엔 드러나지 않았다.

**해소**: `vitest.config.mts`의 `resolve.alias`에 `'server-only'` → `node_modules/server-only/empty.js`를 추가했다
(1일차, 팀장). 패키지가 이미 갖고 있는 no-op 구현을 그대로 가리키므로 별도 스텁 파일을 만들지 않는다. 클라이언트
번들 혼입을 빌드 실패로 잡는 원래 역할은 `next build`가 그대로 수행한다 — vitest의 책임 범위가 아니다.
`import 'server-only'`가 있는 모듈을 import하는 임시 테스트로 통과를 확인한 뒤 그 파일은 지웠다.
