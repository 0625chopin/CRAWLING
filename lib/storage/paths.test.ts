import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  DATA_ROOT,
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
})
