import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { KiwiBuilder, Match, type Kiwi, type TokenInfo } from 'kiwi-nlp'

/** kiwi_model_v0.23.0_base.tgz 를 풀면 나오는 파일 9종 (docs/kiwi-verification.md §1). */
const MODEL_FILE_NAMES = [
  'combiningRule.txt',
  'cong.mdl',
  'default.dict',
  'dialect.dict',
  'extract.mdl',
  'multi.dict',
  'nounchr.mdl',
  'sj.morph',
  'typo.dict',
] as const

const MODEL_VERSION = '0.23.0'
const MODEL_DIR = path.join(process.cwd(), 'data', 'kiwi-model')
// 함정 ⑤ — modelFiles에 URL 문자열도 넘길 수 있지만 그러면 브라우저가 105MB를 내려받는다.
// public/ 자산으로 두지 않고, 서버에서 fs로 읽은 바이트를 그대로 넘긴다.
const WASM_PATH = path.join(
  process.cwd(),
  'node_modules',
  'kiwi-nlp',
  'dist',
  'kiwi-wasm.wasm'
)

/**
 * 함정 ② — joinAffix를 켜면 "공개/NNG + 하/XSV"가 "공개하/VV"로 합쳐져
 * "공개"·"적용"·"경쟁" 같은 IT 기사 핵심 키워드가 명사 필터를 통과하지 못하고 사라진다
 * (docs/kiwi-verification.md §3②). 접두/접미사만 명사에 붙이는 조합으로 고정한다.
 */
export const MATCH_OPTIONS = Match.joinNounPrefix | Match.joinNounSuffix // = 393216

/** kiwi-nlp가 반환하는 형태소 토큰. 원시 Kiwi 인스턴스 대신 이 타입만 모듈 밖으로 내보낸다. */
export type KiwiToken = TokenInfo

function isEnoent(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}

/**
 * 함정 ③ — 모델 버전은 패키지 버전(0.23.0)과 정확히 맞아야 한다. 경량 대체 모델은 없다.
 *
 * 이 명령 목록은 README.md의 「Kiwi 모델 배치」 절과 항상 같아야 한다 — 이 에러 메시지가
 * "모델이 없는 사람"을 실제로 데려가는 유일한 경로다. clone 직후에는 data/kiwi-model/ 자체가
 * 없으므로(.gitignore가 /data를 제외) mkdir을 빠뜨리면 마지막 cp가 목적지 부재로 조용히 실패한다.
 */
function buildModelMissingMessage(missingFiles: string[]): string {
  return [
    `Kiwi 형태소 분석 모델을 찾을 수 없습니다. (누락된 파일: ${missingFiles.join(', ')})`,
    `data/kiwi-model/ 에 v${MODEL_VERSION} 모델 9개 파일을 배치하세요.`,
    '',
    '재다운로드 명령:',
    `curl -L -o kiwi_model.tgz https://github.com/bab2min/Kiwi/releases/download/v${MODEL_VERSION}/kiwi_model_v${MODEL_VERSION}_base.tgz`,
    'tar -xzf kiwi_model.tgz',
    'mkdir -p data/kiwi-model',
    'cp models/cong/base/* data/kiwi-model/',
  ].join('\n')
}

async function readModelFiles(): Promise<Record<string, Uint8Array>> {
  const files: Record<string, Uint8Array> = {}
  const missing: string[] = []

  for (const name of MODEL_FILE_NAMES) {
    try {
      files[name] = await readFile(path.join(MODEL_DIR, name))
    } catch (error) {
      if (!isEnoent(error)) throw error
      missing.push(name)
    }
  }

  if (missing.length > 0) {
    throw new Error(buildModelMissingMessage(missing))
  }

  return files
}

async function buildKiwi(): Promise<Kiwi> {
  const builder = await KiwiBuilder.create(WASM_PATH)
  const modelFiles = await readModelFiles()

  // build()가 1.4초·+780MB짜리 작업이라(docs/kiwi-verification.md §2) 몇 번 호출됐는지
  // 로그로 남겨야 getKiwi()의 globalThis 캐싱이 실제로 재사용되는지 확인할 수 있다.
  console.info('[kiwi] 형태소 분석 모델 build() 시작')
  const kiwi = await builder.build({
    modelFiles,
    // 사용자 사전 도입 여부는 미결(docs/kiwi-verification.md §4) — 자리만 열어두고 지금은 비운다.
    userWords: [],
  })
  console.info(`[kiwi] build() 완료 (버전 ${builder.version()})`)

  return kiwi
}

/**
 * 프로세스당 Kiwi 인스턴스 하나만 유지한다. 모듈 스코프 변수로 두면 next dev의 HMR이
 * 모듈을 다시 평가할 때마다 780MB짜리 인스턴스가 새로 쌓인다(docs/kiwi-verification.md §3④,
 * 기준 구현 lib/crawler/browser.ts:5-11). 반드시 Promise를 globalThis에 캐싱한다.
 */
const globalForKiwi = globalThis as unknown as {
  __kiwi?: Promise<Kiwi>
}

function getKiwi(): Promise<Kiwi> {
  globalForKiwi.__kiwi ??= buildKiwi().catch((error: unknown) => {
    // 모델 디렉터리를 나중에 채워 넣고 재시도할 수 있도록 실패한 캐시는 비운다.
    globalForKiwi.__kiwi = undefined
    throw error
  })

  return globalForKiwi.__kiwi
}

/**
 * 함정 ① — kiwi.tokenize(text, undefined)를 그대로 호출하면 kiwi-nlp의 Proxy가 인자
 * 배열을 JSON.stringify 할 때 undefined가 null로 바뀌어 emscripten 예외로 Node 프로세스가
 * 통째로 죽는다(docs/kiwi-verification.md §3①). opts가 없으면 인자 자체를 생략해야 한다.
 * blockList·pretokenized·typos 등 다른 옵셔널 인자를 다루게 되더라도 이 규칙을 따른다.
 */
function callTokenize(
  kiwi: Kiwi,
  text: string,
  opts: Match | undefined
): TokenInfo[] {
  return opts === undefined ? kiwi.tokenize(text) : kiwi.tokenize(text, opts)
}

/**
 * 텍스트를 형태소 단위로 분석한다. matchOptions는 항상 MATCH_OPTIONS로 고정되므로
 * 호출부가 undefined를 넘길 방법이 타입상 없다(함정 ①·②를 이 시그니처로 함께 막는다).
 * 원시 Kiwi 인스턴스는 반환하지 않는다.
 */
export async function safeTokenize(text: string): Promise<KiwiToken[]> {
  const kiwi = await getKiwi()
  return callTokenize(kiwi, text, MATCH_OPTIONS)
}
