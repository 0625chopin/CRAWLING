/**
 * 서버 인스턴스가 뜰 때 한 번 실행된다(`node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/instrumentation.md` — "called **once** when a new Next.js server instance is
 * initiated"). 이 프로젝트에서 부팅 훅이 필요한 이유는 하나뿐이다: 프로세스가 강제 종료돼 남은
 * orphan 임시 파일 정리(I-002). 쓰기 함수 자체로는 막을 수 없는 잔여물이라 여기 말고는 자리가 없다.
 */
export async function register(): Promise<void> {
  // 설치본 문서가 지시하는 가드다 — `register`는 모든 런타임에서 불리므로 Node.js API에 의존하는
  // 코드는 조건부로 import한다(같은 문서 §Runtime, 02-guides/instrumentation.md:72). `fs`를 쓰는
  // 모듈을 최상단에서 import하면 그 조건이 성립하지 않으므로 함수 안에서 동적으로 부른다.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { cleanupOrphanTempFiles } = await import('@/lib/storage/temp-cleanup')
  const removed = await cleanupOrphanTempFiles()

  // 0건일 때는 아무 말도 하지 않는다 — 정상 종료가 대부분이라 매 부팅 로그를 채울 이유가 없다.
  if (removed.length > 0) {
    console.info(`[instrumentation] 남아 있던 임시 파일 ${removed.length}건을 정리했습니다.`)
  }
}
