import { cn } from '@/lib/utils'

export interface PageContainerProps {
  children: React.ReactNode
  /**
   * 기본은 max-w-6xl. 표가 넓은 화면은 'wide',
   * 폼·칩 목록만 있어 여백이 과한 화면(불용어 관리)은 'narrow'를 쓴다.
   */
  width?: 'default' | 'wide' | 'narrow'
  className?: string
}

const WIDTH_CLASS = {
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
  narrow: 'max-w-3xl',
} as const

/** 모든 페이지가 공유하는 본문 컨테이너. */
export function PageContainer({
  children,
  width = 'default',
  className,
}: PageContainerProps) {
  return (
    <main className="flex-1">
      <div
        className={cn(
          'container mx-auto px-4 py-6 md:py-8',
          WIDTH_CLASS[width],
          className
        )}
      >
        {children}
      </div>
    </main>
  )
}
