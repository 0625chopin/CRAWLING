import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { ScreenPlaceholder } from '@/components/common/screen-placeholder'

export default function KeywordsPage() {
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: '홈', href: '/' }, { label: '핫 키워드 분석' }]}
        title="핫 키워드 분석"
        description="형태소 분석으로 조사를 제거하고 키워드 빈도 랭킹을 확인합니다"
      />
      <ScreenPlaceholder
        specFile="03-hot-keyword.md"
        featureIds={['F005', 'F006', 'F008']}
      />
    </PageContainer>
  )
}
