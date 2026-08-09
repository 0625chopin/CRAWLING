import 'server-only'

import type { PressSource } from '@/lib/types/press'

/**
 * 언론사 초기 시드. data/press-sources.json이 없을 때 이 값으로 파일을 만든다.
 * 확정된 언론사 목록이 없어 빈 배열로 시작한다 — 화면 설계서 04의 "언론사 0건" 빈 상태가
 * 이 초기값을 전제로 만들어졌다(docs/screens/04-press-manage.md, ROADMAP Task 009 DoD).
 */
export const DEFAULT_PRESS_SOURCES: readonly PressSource[] = []
