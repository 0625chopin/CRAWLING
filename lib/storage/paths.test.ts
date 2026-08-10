import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  DATA_ROOT,
  UnsafePathSegmentError,
  articlePath,
  articlesDir,
  articlesDisplayPath,
  keywordsPath,
  pressSourcesPath,
  runDir,
  runMetaPath,
  runsRootDir,
  stopwordsPath,
} from './paths'

describe('paths — 고정 경로', () => {
  it('DATA_ROOT 하위에 press-sources.json을 둔다', () => {
    expect(pressSourcesPath()).toBe(path.join(DATA_ROOT, 'press-sources.json'))
  })

  it('DATA_ROOT 하위에 stopwords.json을 둔다', () => {
    expect(stopwordsPath()).toBe(path.join(DATA_ROOT, 'stopwords.json'))
  })

  // listRuns()가 순회할 data/runs/ 자체 — 이 헬퍼가 없으면 호출부가 paths.ts 밖에서
  // path.join(DATA_ROOT, 'runs')를 직접 조립하게 된다(2일차 교차검증 이슈).
  it('DATA_ROOT 하위에 runs 디렉터리를 둔다', () => {
    expect(runsRootDir()).toBe(path.join(DATA_ROOT, 'runs'))
  })
})

describe('paths — 정상 runId·articleId 조립', () => {
  const runId = '20260810-143205'

  it('runDir는 runsRootDir/{runId}를 가리킨다', () => {
    expect(runDir(runId)).toBe(path.join(runsRootDir(), runId))
  })

  it('runMetaPath·articlesDir·keywordsPath는 runDir 하위를 가리킨다', () => {
    expect(runMetaPath(runId)).toBe(path.join(DATA_ROOT, 'runs', runId, 'run-meta.json'))
    expect(articlesDir(runId)).toBe(path.join(DATA_ROOT, 'runs', runId, 'articles'))
    expect(keywordsPath(runId)).toBe(path.join(DATA_ROOT, 'runs', runId, 'keywords.json'))
  })

  it('articlePath는 4자리 순번 파일명(.txt)을 만든다', () => {
    expect(articlePath(runId, '0001')).toBe(
      path.join(DATA_ROOT, 'runs', runId, 'articles', '0001.txt')
    )
  })
})

// I-015: 화면(02-collect-result.md)은 저장 경로를 `data/runs/{runId}/articles/`처럼 프로젝트
// 루트 기준 상대경로 + 슬래시 구분으로 기대한다. 이 저장소는 Windows에서 돌아가므로
// path.relative가 반환하는 `\` 구분자를 정규화하지 않으면 화면에 `data\runs\...`가 그대로
// 나가는데도 타입체크·빌드·테스트가 전부 통과한다 — 그 회귀를 여기서 잡는다.
describe('paths — 화면 표시용 상대경로 (I-015)', () => {
  const runId = '20260810-143205'

  it('articlesDisplayPath는 슬래시로 구분된 프로젝트 루트 상대경로 + 끝 슬래시를 돌려준다', () => {
    expect(articlesDisplayPath(runId)).toBe(`data/runs/${runId}/articles/`)
  })

  it('반환값에 OS 경로 구분자(\\\\)가 섞이지 않는다', () => {
    expect(articlesDisplayPath(runId)).not.toContain('\\')
  })

  // articlesDisplayPath는 내부적으로 articlesDir → runDir → assertSafeSegment를 거치므로
  // 경로 순회 차단이 이 헬퍼에도 그대로 적용됨을 확인한다.
  it('안전하지 않은 runId는 articleDir와 동일하게 예외를 던진다', () => {
    expect(() => articlesDisplayPath('..')).toThrow()
    expect(() => articlesDisplayPath('../../etc')).toThrow()
  })
})

// runId에 '../' 를 넣은 요청이 DATA_ROOT 밖을 가리키지 못해야 한다(docs/ROADMAP.md Task 005 DoD).
// 화면에서는 통과 여부가 보이지 않는 종류라 여기서 명시적으로 판정한다.
describe('paths — 경로 순회 차단', () => {
  const traversalInputs = [
    '..',
    '../../etc/passwd',
    '..\\..\\windows',
    // 퍼센트 인코딩으로 '..'을 우회하려는 시도. 허용목록에 '%'가 없어 디코딩 없이도 즉시 막힌다.
    '%2e%2e',
    '%2e%2e%2f',
  ]
  const absoluteInputs = ['/etc/passwd', 'C:\\Windows\\System32', '\\\\server\\share']
  const unsafeInputs = [...traversalInputs, ...absoluteInputs]

  it.each(unsafeInputs)('runDir("%s")는 예외를 던진다', (unsafeRunId) => {
    expect(() => runDir(unsafeRunId)).toThrow()
  })

  it.each(unsafeInputs)('articlePath의 articleId("%s")도 동일하게 막는다', (unsafeArticleId) => {
    expect(() => articlePath('20260810-143205', unsafeArticleId)).toThrow()
  })

  it('runMetaPath·articlesDir·keywordsPath도 내부적으로 runDir를 거쳐 동일하게 막힌다', () => {
    expect(() => runMetaPath('..')).toThrow()
    expect(() => articlesDir('../../')).toThrow()
    expect(() => keywordsPath('%2e%2e')).toThrow()
  })

  // I-021 회귀: 던지는 예외가 평범한 Error가 아니라 UnsafePathSegmentError여야 라우트 경계가
  // instanceof로 400을 판정할 수 있다. 이 타입이 다시 평범한 Error로 되돌아가면 여기서 즉시
  // 깨지고, 그 회귀는 컴파일 에러도 런타임 예외도 없이 상태 코드만 조용히 500으로 되돌아간다
  // (docs/CONVENTIONS.md §9 "틀려도 화면이 멀쩡해 보이는 로직").
  // I-046: toThrow(SomeClass)는 SomeClass가 export에서 사라지면 toThrow(undefined)로 조용히
  // 완화되어 "뭐든 던지기만 하면 통과"가 된다. try/catch + toBeInstanceOf로 나눠 쓰면 인자가
  // undefined일 때 TypeError로 즉시 실패하므로 같은 함정을 피한다.
  it('경로 순회 입력은 평범한 Error가 아니라 UnsafePathSegmentError를 던진다', () => {
    try {
      runDir('../../etc')
      throw new Error('여기 도달하면 안 된다 — runDir가 예외를 던졌어야 한다')
    } catch (error) {
      expect(error).toBeInstanceOf(UnsafePathSegmentError)
    }

    try {
      articlePath('20260810-143205', '../../etc')
      throw new Error('여기 도달하면 안 된다 — articlePath가 예외를 던졌어야 한다')
    } catch (error) {
      expect(error).toBeInstanceOf(UnsafePathSegmentError)
    }
  })

  // 메시지에 입력값을 그대로 반사하지 않는다 — 경로 순회를 시도한 문자열이 그대로 응답에
  // 되돌아오지 않게 하려는 선택이다(paths.ts UnsafePathSegmentError 주석). segment 속성에는
  // 원래 값이 남아 있어야 서버 콘솔 로그로는 여전히 추적할 수 있다.
  it('UnsafePathSegmentError 메시지는 입력값을 그대로 담지 않는다', () => {
    try {
      runDir('../../etc/passwd')
      throw new Error('여기 도달하면 안 된다 — runDir가 예외를 던졌어야 한다')
    } catch (error) {
      expect(error).toBeInstanceOf(UnsafePathSegmentError)
      const unsafeError = error as UnsafePathSegmentError
      expect(unsafeError.message).not.toContain('../../etc/passwd')
      expect(unsafeError.segment).toBe('../../etc/passwd')
    }
  })
})
