import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { ScreenPlaceholder } from '@/components/common/screen-placeholder'

export default function ResultsPage() {
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: '홈', href: '/' }, { label: '수집 결과' }]}
        title="수집 결과"
        description="크롤링으로 저장된 기사 txt를 실행 단위로 확인합니다"
      />
      <ScreenPlaceholder
        specFile="02-collect-result.md"
        featureIds={['F003', 'F004']}
      />
    </PageContainer>
  )
}
