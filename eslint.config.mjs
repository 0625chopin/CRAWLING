import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 포맷팅은 Prettier가 전담한다. ESLint의 포맷 관련 룰을 끄기 위해
  // prettier 설정은 반드시 배열 맨 끝에 위치해야 한다.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // shadcn CLI 생성물은 린트 대상에서 제외한다.
    'components/ui/**',
  ]),
])

export default eslintConfig
