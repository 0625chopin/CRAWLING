import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // playwright는 네이티브 바이너리와 브라우저 드라이버에 의존하므로
  // 서버 번들에 포함시키지 않고 런타임에 require로 해석하게 한다.
  serverExternalPackages: ['playwright'],
}

export default nextConfig
