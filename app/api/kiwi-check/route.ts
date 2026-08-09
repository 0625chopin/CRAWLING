import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { NextResponse } from 'next/server'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다.
// Next.js 16에서 Edge 런타임이 폐기되면서 설치본 문서가 이 export의 제거를 지시한다
// (node_modules/next/dist/docs/.../route-segment-config/runtime.md).
export const dynamic = 'force-dynamic'

/** kiwi_model_v0.23.0_base.tgz 를 풀면 나오는 파일들. */
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
]

const MODEL_DIR = path.join(process.cwd(), 'data', 'kiwi-model')
const WASM_PATH = path.join(
  process.cwd(),
  'node_modules',
  'kiwi-nlp',
  'dist',
  'kiwi-wasm.wasm'
)

const SAMPLE =
  '삼성전자가 온디바이스 AI 반도체를 공개했다. 오픈AI는 새로운 언어모델을 발표하면서 개발자 생태계 확장에 나섰다.'

/**
 * Kiwi 파이프라인이 Next.js 서버 런타임에서 실제로 도는지 확인하는 임시 점검 라우트.
 * 검증이 끝나면 제거하고 lib/keyword/ 아래 정식 모듈로 옮긴다.
 */
export async function GET() {
  const startedAt = Date.now()

  try {
    const { KiwiBuilder, Match } = await import('kiwi-nlp')

    const builder = await KiwiBuilder.create(WASM_PATH)
    const wasmLoadedAt = Date.now()

    const modelFiles: Record<string, Uint8Array> = {}
    for (const name of MODEL_FILE_NAMES) {
      modelFiles[name] = await readFile(path.join(MODEL_DIR, name))
    }
    const modelReadAt = Date.now()

    const kiwi = await builder.build({
      modelFiles,
      // IT/AI 기사에서 한 단어로 다뤄야 하는데 기본 사전이 쪼개는 고유명사들.
      userWords: [
        { word: '오픈AI', tag: 'NNP', score: 5 },
        { word: '온디바이스', tag: 'NNP', score: 5 },
        { word: '데이터센터', tag: 'NNP', score: 5 },
      ],
    })
    const builtAt = Date.now()

    // 접두사/접미사만 명사에 붙인다. joinAffix 전체를 켜면 "공개하다"처럼
    // 동사로 합쳐지면서 "공개" 같은 서술성 명사 키워드가 사라진다.
    const matchOptions = Match.joinNounPrefix | Match.joinNounSuffix
    const tokens = await kiwi.tokenize(SAMPLE, matchOptions)
    const tokenizedAt = Date.now()

    const JOSA = /^(JKS|JKC|JKG|JKO|JKB|JKV|JKQ|JX|JC)$/
    const KEEP = /^(NNG|NNP|SL)$/

    return NextResponse.json({
      ok: true,
      version: builder.version(),
      timings: {
        wasmLoadMs: wasmLoadedAt - startedAt,
        modelReadMs: modelReadAt - wasmLoadedAt,
        buildMs: builtAt - modelReadAt,
        tokenizeMs: tokenizedAt - builtAt,
        totalMs: tokenizedAt - startedAt,
      },
      rssMb: Math.round(process.memoryUsage().rss / 1048576),
      sample: SAMPLE,
      tokenCount: tokens.length,
      removedJosa: tokens
        .filter((t) => JOSA.test(t.tag))
        .map((t) => `${t.str}/${t.tag}`),
      keywords: tokens
        .filter((t) => KEEP.test(t.tag))
        .map((t) => `${t.str}/${t.tag}`),
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        stack:
          error instanceof Error
            ? error.stack?.split('\n').slice(0, 8)
            : undefined,
      },
      { status: 500 }
    )
  }
}
