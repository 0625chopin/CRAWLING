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

/**
 * runId·articleId에 허용되지 않는 문자(경로 순회 시도 포함)가 섞였을 때 던지는 전용 타입(I-021).
 * 이전에는 평범한 `Error`였는데, 라우트 경계가 `instanceof`로 판정할 수 없어 같은 종류의 입력이
 * 라우트마다 우연히 다른 상태 코드(500 또는 404)로 응답했다 — I-016이 run 생명주기 예외를 문자열
 * 매칭에서 타입 판정으로 옮긴 것과 같은 계열의 처방이다. `docs/CONVENTIONS.md` §6 기준으로 이건
 * "검증 실패"이므로 라우트가 이 타입을 `fail(message, 400)`에 매핑한다.
 *
 * 메시지에 입력값(`segment`)을 그대로 담지 않는다 — 경로 순회를 시도한 문자열이 그대로 응답에
 * 반사되는 것을 피한다. `segment`는 서버 콘솔 로그·디버깅용으로만 속성에 남긴다. 이미 있는
 * D-032(articleId 경로)도 같은 이유로 구체적인 문자 목록 대신 "존재하지 않는 기사입니다"라는
 * 일반화된 문구를 쓰고 있어, 그 관례를 그대로 따른 것이기도 하다.
 */
export class UnsafePathSegmentError extends Error {
  constructor(
    public readonly label: string,
    public readonly segment: string
  ) {
    super(`${label} 형식이 올바르지 않습니다`)
    this.name = 'UnsafePathSegmentError'
  }
}

function assertSafeSegment(segment: string, label: string): string {
  if (!SAFE_SEGMENT.test(segment)) {
    throw new UnsafePathSegmentError(label, segment)
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

/**
 * 절대경로를 프로젝트 루트(`process.cwd()`) 기준 상대경로로 바꾼다. 화면 설계서 02(§실행
 * 요약 카드 "저장 경로")는 `data/runs/{runId}/articles/`처럼 항상 슬래시 구분 상대경로를
 * 기대하는데, `path.relative`는 Windows에서 `\`를 돌려준다. 정규화를 빠뜨리면 화면에
 * `data\runs\...`가 나가면서도 타입체크·빌드·테스트가 전부 통과하는 표시 버그가 되므로
 * (I-015) 변환을 이 파일 한 곳에만 두고 호출부가 각자 처리하지 않게 한다.
 */
function toDisplayPath(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath).split(path.sep).join('/')
}

/**
 * `articlesDir(runId)`의 화면 표시용 버전. 끝에 `/`를 붙여 디렉터리임을 나타낸다
 * (와이어프레임 `data/runs/20260810-143205/articles/` 참고, Task 017 응답의 `storagePath`).
 * runId 검증은 내부에서 부르는 `articlesDir`가 이미 수행하므로 여기서 다시 하지 않는다.
 */
export function articlesDisplayPath(runId: string): string {
  return `${toDisplayPath(articlesDir(runId))}/`
}
