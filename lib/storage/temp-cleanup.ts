import 'server-only'

import fs from 'node:fs/promises'
import path from 'node:path'

import { DATA_ROOT } from './paths'

/**
 * `atomicWriteFile`이 만드는 임시 파일 이름 형태(`<원본경로>.<uuid v4>.tmp`)만 골라낸다.
 *
 * **`*.tmp` 전부를 지우지 않는다.** `data/`는 사용자가 손으로 열어 보고 편집하기도 하는
 * 디렉터리이고(그래서 JSON 파싱 실패를 조용히 덮어쓰지 않는다 — docs/CONVENTIONS.md §7),
 * 거기 놓아둔 개인 `메모.tmp`를 부팅할 때마다 말없이 지우는 도구가 되면 안 된다. uuid 형태까지
 * 일치하는 파일만 "우리가 만들었고 rename에 실패해 남은 것"이라고 단정할 수 있다.
 */
const ORPHAN_TEMP_PATTERN = /\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.tmp$/i

/**
 * 프로세스가 강제 종료(SIGKILL·전원 차단)돼 `atomicWriteFile`의 `catch`가 실행되지 못했을 때
 * 남는 orphan 임시 파일을 치운다(I-002). 쓰기 함수 하나로는 막을 수 없는 종류의 잔여물이라
 * — 어떤 원자적 쓰기 구현체든 같다 — 부팅 시점에 한 번 훑는 것이 유일한 대응이다.
 *
 * 정합성 문제는 애초에 없었다(어느 레포지토리도 `.tmp`를 읽지 않는다). 이 함수가 막는 것은
 * 디스크 용량이 조용히 새는 것뿐이므로, **실패해도 절대 던지지 않는다** — 서버 부팅이 흘러간
 * 임시 파일 하나 때문에 멈추면 그게 더 나쁜 고장이다. 지운 경로를 돌려주는 것은 호출부가
 * 로그를 남기고 테스트가 결과를 검사하기 위해서다.
 *
 * `root`를 인자로 받는 이유는 테스트가 실제 `data/`를 건드리지 않게 하기 위함이다
 * (`lib/storage/*.test.ts`가 쓰는 임시 디렉터리 패턴과 같다).
 */
export async function cleanupOrphanTempFiles(root: string = DATA_ROOT): Promise<string[]> {
  const removed: string[] = []
  await sweep(root, removed)
  return removed
}

async function sweep(dir: string, removed: string[]): Promise<void> {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    // 첫 실행이라 data/가 아직 없거나(가장 흔한 경우) 읽을 수 없는 디렉터리다. 둘 다 할 일이 없다.
    return
  }

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await sweep(entryPath, removed)
      continue
    }
    if (!entry.isFile() || !ORPHAN_TEMP_PATTERN.test(entry.name)) continue

    try {
      await fs.rm(entryPath)
      removed.push(entryPath)
    } catch (error) {
      // 다른 프로세스가 방금 지웠거나 권한이 없다. 다음 부팅에 다시 만난다 — 여기서 막을 일이 아니다.
      console.warn(`[temp-cleanup] 임시 파일을 지우지 못했습니다: ${entryPath}`, error)
    }
  }
}
