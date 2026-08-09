import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { ScreenPlaceholder } from '@/components/common/screen-placeholder'

export default function PressPage() {
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: '홈', href: '/' }, { label: '언론사 관리' }]}
        title="언론사 관리"
        description="크롤링 대상 언론사를 추가·수정·삭제하고 활성 여부를 관리합니다"
      />
      <ScreenPlaceholder specFile="04-press-manage.md" featureIds={['F007']} />
    </PageContainer>
  )
}
