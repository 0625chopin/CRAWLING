import path from 'node:path'

import { defineConfig } from 'vitest/config'

/**
 * 순수 함수 전용 최소 구성이다 (ROADMAP §결정 필요 사항 Q4 결정).
 * 대상은 `lib/keyword/`·`lib/storage/`·`lib/crawler/`의 순수 로직뿐이고,
 * 컴포넌트 렌더링 테스트나 E2E는 도입하지 않는다 — 화면 검증은 Playwright MCP가 맡는다.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname),
    },
  },
})
