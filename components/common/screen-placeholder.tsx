import { Construction } from 'lucide-react'

import { EmptyState } from '@/components/common/empty-state'

export interface ScreenPlaceholderProps {
  /** 이 화면의 설계서 파일명 (docs/screens/ 기준) */
  specFile: string
  /** 이 화면이 구현할 기능 ID 목록 */
  featureIds: string[]
}

/**
 * 라우트 껍데기용 임시 자리표시자.
 * 각 화면 본문을 구현하면서 하나씩 제거한다.
 */
export function ScreenPlaceholder({
  specFile,
  featureIds,
}: ScreenPlaceholderProps) {
  return (
    <EmptyState
      icon={<Construction />}
      title="아직 구현 전인 화면이에요"
      description={`설계서 docs/screens/${specFile} 기준으로 ${featureIds.join(', ')} 구현 예정입니다.`}
    />
  )
}
