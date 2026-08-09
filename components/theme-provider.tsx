'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * next-themes의 ThemeProvider 래퍼.
 * ThemeProvider 자체가 클라이언트 컴포넌트라 서버 컴포넌트인 RootLayout에서
 * 직접 쓸 수 없으므로 'use client' 경계를 여기서 만든다.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
