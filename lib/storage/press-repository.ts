import 'server-only'

import { z } from 'zod'

import {
  htmlPressSchema,
  pressCreateSchema,
  pressSchema,
  pressUpdateSchema,
  rssPressSchema,
  type PressCreateInput,
  type PressSource,
  type PressUpdateInput,
} from '@/lib/types/press'

import { readJson, writeJson } from './json-store'
import { pressSourcesPath } from './paths'
import { DEFAULT_PRESS_SOURCES } from './press-defaults'

const pressListSchema = z.array(pressSchema)

const SLUG_DISALLOWED = /[^a-z0-9-]/g

/**
 * 이름에서 슬러그를 만든다(docs/CONVENTIONS.md §식별자 규칙: 소문자·영숫자·하이픈).
 * `createPress`가 명시 id 없이 호출됐을 때만 쓰는 폴백이다. 언론사명이 한글 전용("전자신문")이면
 * ASCII만 남기는 규칙상 슬러그가 빈 문자열이 되므로 고정 접두사 'press'로 대체한다 — 이 경우
 * id가 이름과 무관해지는 대가는 사용자가 생성 입력에 `id`를 직접 지정해 피할 수 있다(3일차
 * 교차검증 결정, docs/ISSUES.draft.저장소계층.md). 로마자 표기는 발음만 옮길 뿐 "블로터"에서
 * "bloter" 같은 실제 브랜드명을 만들어 주지 못해 채택하지 않았다.
 */
function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(SLUG_DISALLOWED, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return base === '' ? 'press' : base
}

/** 슬러그가 이미 쓰이고 있으면 -2, -3 ... 접미 숫자를 붙여 유일한 id를 만든다. */
function uniqueSlug(base: string, existingIds: ReadonlySet<string>): string {
  if (!existingIds.has(base)) return base

  let suffix = 2
  while (existingIds.has(`${base}-${suffix}`)) {
    suffix += 1
  }
  return `${base}-${suffix}`
}

async function loadAll(): Promise<PressSource[]> {
  return readJson(pressSourcesPath(), pressListSchema, [
    ...DEFAULT_PRESS_SOURCES,
  ])
}

export interface ListPressOptions {
  activeOnly?: boolean
}

/**
 * 방식(rss/html)이 섞여 있어도 정렬 기준은 이름 하나뿐이다 — 방식별로 묶어 정렬하지
 * 않는다(docs/ROADMAP.md Task 006 구현 규칙, docs/screens/04-press-manage.md 상태 ①).
 */
export async function listPress(
  options: ListPressOptions = {}
): Promise<PressSource[]> {
  const pressList = await loadAll()
  const filtered = options.activeOnly
    ? pressList.filter((press) => press.isActive)
    : pressList
  return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

export async function getPress(id: string): Promise<PressSource | null> {
  const pressList = await loadAll()
  return pressList.find((press) => press.id === id) ?? null
}

/**
 * id는 명시 지정이 있으면 그 값을(형식은 pressCreateSchema가 이미 검증했다), 없으면 이름
 * 슬러그를 쓴다 — 어느 쪽이든 중복이면 접미 숫자를 붙인다. 생성 후에는 불변이다 — 저장된
 * 기사 txt가 이 값을 참조하므로 이후 어떤 함수도 id를 바꾸지 않는다.
 */
export async function createPress(
  input: PressCreateInput
): Promise<PressSource> {
  const parsed = pressCreateSchema.parse(input)
  const pressList = await loadAll()

  const base = parsed.id ?? slugify(parsed.name)
  const id = uniqueSlug(base, new Set(pressList.map((press) => press.id)))
  const record = pressSchema.parse({ ...parsed, id })

  await writeJson(pressSourcesPath(), [...pressList, record])
  return record
}

/** sourceType이 그대로인 부분 patch(활성 토글)만 여기 해당한다. */
export type PressActivePatch = { isActive: boolean }
export type PressUpdatePatch = PressUpdateInput | PressActivePatch

/**
 * sourceType이 바뀌는 patch는 얕은 병합이 아니라 새 방식 스키마로 레코드를 통째로
 * 교체한다 — 얕게 병합하면 sourceType: 'rss'인데 articleLinkSelector가 남는 잡종
 * 레코드가 생긴다(docs/ROADMAP.md Task 006 구현 규칙). `PressUpdateInput`은 항상
 * 전체 필드를 담고 있으므로(pressUpdateSchema === pressCreateSchema) sourceType이
 * 같더라도 patch 쪽 필드로 완전히 대체하는 편이 일관적이다.
 */
export async function updatePress(
  id: string,
  patch: PressUpdatePatch
): Promise<PressSource> {
  const pressList = await loadAll()
  const index = pressList.findIndex((press) => press.id === id)
  if (index === -1) {
    throw new Error(`존재하지 않는 언론사입니다: ${id}`)
  }
  const existing = pressList[index]

  const next: PressSource =
    'sourceType' in patch
      ? pressSchema.parse({ ...pressUpdateSchema.parse(patch), id })
      : pressSchema.parse({ ...existing, isActive: patch.isActive })

  const nextList = [...pressList]
  nextList[index] = next
  await writeJson(pressSourcesPath(), nextList)
  return next
}

export async function setPressActive(
  id: string,
  isActive: boolean
): Promise<PressSource> {
  return updatePress(id, { isActive })
}

/** 언론사 레지스트리에서만 지운다. 이미 수집된 기사·실행 결과(data/runs/*)는 건드리지
 *  않는다(docs/screens/04-press-manage.md §⑤ 삭제 다이얼로그 문구와 일치해야 함). */
export async function deletePress(id: string): Promise<void> {
  const pressList = await loadAll()
  const next = pressList.filter((press) => press.id !== id)
  if (next.length === pressList.length) return
  await writeJson(pressSourcesPath(), next)
}

// 소비 지점에서 sourceType으로 좁혀 셀렉터 필드에 안전하게 접근할 수 있도록 가지별 스키마도
// 함께 내보낸다(Task 004 discriminatedUnion 설계 의도와 동일).
export { htmlPressSchema, rssPressSchema }
