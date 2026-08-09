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
      /**
       * `server-only`는 `exports`의 `react-server` 조건으로 no-op(`empty.js`)과
       * throw(`index.js`)를 가른다. 그 조건을 켜는 것은 Next.js 서버 번들뿐이라,
       * vitest에서는 정상적인 서버 모듈조차 import 시점에 예외로 죽는다
       * (`resolve.conditions`로는 풀리지 않는다).
       * 패키지가 이미 갖고 있는 no-op 구현을 그대로 가리킨다 — 별도 스텁을 만들지 않는다.
       * 클라이언트 번들 혼입을 막는 원래 역할은 `next build`가 그대로 수행한다.
       */
      'server-only': path.resolve(
        import.meta.dirname,
        'node_modules/server-only/empty.js'
      ),
    },
  },
})
