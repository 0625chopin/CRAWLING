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

### I-002 · `writeJson` 크래시 시 남는 orphan `.tmp` 파일을 정리하지 않는다

- 상태: 보류(낮은 우선순위)
- 발견: 2일차 · 크롤 파이프라인(Task 005 교차검증 중)
- 관련 Task: Task 005

정상 흐름(성공·명시적 에러)에서는 임시 파일이 남지 않는다 — 교차검증에서 실행으로 확인했다. 다만 프로세스가
강제 종료(SIGKILL·전원 차단)되는 순간에는 `atomicWriteFile`이 자기 `catch` 블록을 실행할 수 없어
`*.<uuid>.tmp`가 그대로 남는다. **이건 쓰기 함수 하나로 막을 수 있는 문제가 아니다** — 어떤 원자적 쓰기
구현체든 같고, 막으려면 앱 시작 시점에 `data/**/*.tmp`를 훑어 지우는 별도 부팅 루틴이 있어야 한다.

디스크 용량 낭비 외에 정합성 문제는 없다(어느 레포지토리도 `.tmp`를 읽지 않고, `assertSafeSegment` 대상도
아니다). 담당과 리뷰어의 판단이 일치해 지금 막지 않기로 했다. 나중에 부팅 훅을 만들 일이 생기면 함께 처리한다.

### I-003 · `paths.ts`에 runs 루트 디렉터리 헬퍼가 없었다

- 상태: 해결됨
- 발견: 2일차 · 크롤 파이프라인(Task 005 교차검증 중)
- 관련 Task: Task 005 · Task 007

Task 007의 `listRuns()`는 `data/runs/` 아래 전체를 순회해야 하는데, `lib/storage/paths.ts`가 내보내는 것은
특정 `runId`를 받는 `runDir(runId)`뿐이었다. 그대로 두면 007이 `path.join(DATA_ROOT, 'runs')`를 `paths.ts`
**밖에서** 조립하게 되어, Task 005 자신의 구현 규칙("경로 문자열은 이 파일 밖에서 조립하지 않는다")과
`docs/CONVENTIONS.md` §2를 정면으로 어긴다.

**해소**: 같은 회차에 `runsRootDir()`를 추가하고 `runDir(runId)`가 그 위에서 조립되도록 정리했다(2일차,
저장소 계층). 리팩터링 후에도 `assertSafeSegment`가 조립 전에 호출되는 순서가 유지되어 경로 순회 차단
회귀 케이스 17건이 전부 그대로 통과함을 리뷰어가 재실행으로 확인했다.
