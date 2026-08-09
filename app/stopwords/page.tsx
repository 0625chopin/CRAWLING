import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { ScreenPlaceholder } from '@/components/common/screen-placeholder'

export default function StopwordsPage() {
  return (
    // 폼과 칩 목록만 있는 화면이라 기본 6xl은 여백이 과하다 (05 설계서 결정)
    <PageContainer width="narrow">
      <PageHeader
        breadcrumbs={[{ label: '홈', href: '/' }, { label: '불용어 관리' }]}
        title="불용어 관리"
        description="핫 키워드 집계에서 제외할 단어를 관리합니다"
      />
      <ScreenPlaceholder
        specFile="05-stopword-manage.md"
        featureIds={['F008']}
      />
    </PageContainer>
  )
}
