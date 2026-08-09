import 'server-only'

import path from 'node:path'

/**
 * 로컬 파일 저장소 루트. DB로 전환할 때 이 파일만 바꾸면 되도록,
 * 저장소 경로 문자열은 이 파일 밖에서 조립하지 않는다(docs/CONVENTIONS.md §2).
 */
export const DATA_ROOT = path.join(process.cwd(), 'data')

/**
 * runId·articleId처럼 사용자 입력이 섞이는 경로 조각에만 적용하는 허용목록이다.
 * '.'(상위 이동 `..`)·'/'`\`(구분자)·'%'(퍼센트 인코딩 우회)가 전부 허용 밖이라
 * 경로 순회 시도가 무엇이든 조립 이전에 예외로 막힌다(docs/ROADMAP.md Task 005 DoD).
 */
const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/

function assertSafeSegment(segment: string, label: string): string {
  if (!SAFE_SEGMENT.test(segment)) {
    throw new Error(`${label}에 허용되지 않는 문자가 포함되어 있습니다: "${segment}"`)
  }
  return segment
}

export function pressSourcesPath(): string {
  return path.join(DATA_ROOT, 'press-sources.json')
}

export function stopwordsPath(): string {
  return path.join(DATA_ROOT, 'stopwords.json')
}

/** `data/runs/` 자체. listRuns()처럼 특정 runId 없이 전체를 순회할 때 이 헬퍼를 쓴다 — 밖에서 조립하지 않는다. */
export function runsRootDir(): string {
  return path.join(DATA_ROOT, 'runs')
}

export function runDir(runId: string): string {
  return path.join(runsRootDir(), assertSafeSegment(runId, 'runId'))
}

export function runMetaPath(runId: string): string {
  return path.join(runDir(runId), 'run-meta.json')
}

export function articlesDir(runId: string): string {
  return path.join(runDir(runId), 'articles')
}

export function articlePath(runId: string, articleId: string): string {
  return path.join(articlesDir(runId), `${assertSafeSegment(articleId, 'articleId')}.txt`)
}

export function keywordsPath(runId: string): string {
  return path.join(runDir(runId), 'keywords.json')
}
