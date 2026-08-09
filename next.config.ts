import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // playwright는 네이티브 바이너리와 브라우저 드라이버에 의존하므로
  // 서버 번들에 포함시키지 않고 런타임에 require로 해석하게 한다.
  // (참고: playwright는 Next.js 기본 제외 목록에도 이미 들어 있어 이 항목이 없어도 동작한다.
  //  의도를 코드에 남기려고 명시했을 뿐이니, 다음에 이 줄을 보고 다시 조사하지 말 것.
  //  node_modules/next/dist/docs/.../serverExternalPackages.md 의 기본 목록 참고.)
  // kiwi-nlp는 emscripten 글루가 import.meta.url과 node:module의 createRequire에
  // 의존하는 WASM 패키지라 번들러가 건드리면 깨진다. 같은 이유로 외부 패키지로 둔다.
  serverExternalPackages: ['playwright', 'kiwi-nlp'],
}

export default nextConfig
