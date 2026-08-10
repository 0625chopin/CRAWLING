import 'server-only'

import type { PressSource } from '@/lib/types/press'

/**
 * 언론사 초기 시드. data/press-sources.json이 없을 때 이 값으로 파일을 만든다.
 * 확정된 언론사 목록이 없어 빈 배열로 시작한다 — 화면 설계서 04의 "언론사 0건" 빈 상태가
 * 이 초기값을 전제로 만들어졌다(docs/screens/04-press-manage.md, ROADMAP Task 009 DoD).
 *
 * **21일차에 채우는 안을 검토했고 팀장이 기각했다** — I-037(`docs/ISSUES.md`)의 빈 배열은
 * 결함이 아니라 설계이며, `lib/storage/press-repository.test.ts`가 "완전 초기 상태에서
 * `listPress()`가 빈 배열을 반환한다"를 여러 케이스에서 코드로 못박아 두고 있다. Task 027이
 * 조사한 카테고리 확장 언론사 12곳(엔터·스포츠·경제·증권)은 `docs/press-candidates.md`
 * §카테고리 확장 후보 조사에 남아 있고, 실값은 이 배열이 아니라 `data/press-sources.json`에
 * `POST /api/press`로 직접 등록해 반영했다. 완전 초기 상태에서 사용자가 그 12곳을 손으로 다시
 * 입력해야 하는 부담은 남는 논점이다 — 시드로 깔지 별도 가져오기 기능으로 풀지는 화면
 * 워크스트림과 함께 다음 회차에 검토한다(`docs/ISSUES.draft.크롤파이프라인.md`).
 */
export const DEFAULT_PRESS_SOURCES: readonly PressSource[] = []
