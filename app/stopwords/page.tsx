'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Ban, RefreshCw, Search } from 'lucide-react'

import { ErrorAlert } from '@/components/common/error-alert'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { StopwordAddCard } from '@/components/stopwords/stopword-add-card'
import { StopwordSection } from '@/components/stopwords/stopword-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchStopwords } from '@/lib/api/stopword-client'
import type { Stopword } from '@/lib/types/stopword'

type LoadState = 'loading' | 'error' | 'ready'

export default function StopwordsPage() {
  const [stopwords, setStopwords] = useState<Stopword[]>([])
  const [state, setState] = useState<LoadState>('loading')
  // 재조회 트리거 — "다시 시도" 버튼은 이 값을 바꿔 아래 이펙트를 다시 돌리는 방식으로 재조회한다.
  const [reloadToken, setReloadToken] = useState(0)
  // 삭제 결과를 알리는 라이브 리전. 칩 삭제는 두 섹션에 걸쳐 있어 상태를 이 페이지가 들고 있는다.
  const [liveMessage, setLiveMessage] = useState('')

  useEffect(() => {
    fetchStopwords()
      .then((data) => {
        setStopwords(data)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [reloadToken])

  const retry = useCallback(() => {
    setState('loading')
    setReloadToken((token) => token + 1)
  }, [])

  const handleDeleted = useCallback((deleted: Stopword) => {
    setStopwords((prev) => prev.filter((item) => item.id !== deleted.id))
    setLiveMessage(`'${deleted.word}' 불용어가 삭제되었습니다`)
  }, [])

  const defaultStopwords = stopwords.filter((item) => item.isDefault)
  const customStopwords = stopwords.filter((item) => !item.isDefault)

  return (
    // width="narrow"가 이 화면의 max-w-3xl 예외다(설계서 §설계 결정 요약).
    <PageContainer width="narrow">
      <PageHeader
        breadcrumbs={[{ label: '홈', href: '/' }, { label: '불용어 관리' }]}
        title="불용어 관리"
        description='핫 키워드 집계에서 제외할 단어를 관리합니다. "기자", "사진"처럼 기사에 반복적으로 등장하는 상투어를 걸러 랭킹의 신뢰도를 높입니다.'
        action={
          <Button asChild className="shrink-0">
            <Link href="/keywords">
              <RefreshCw className="size-4" aria-hidden="true" />
              {/* 375px에서 제목과 한 줄에 들어가도록 모바일에서는 라벨을 줄인다 */}
              <span className="hidden sm:inline">분석 페이지로 돌아가&nbsp;</span>재분석
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        {/* 정적 뼈대 — 내부 추가·일괄 추가 로직은 012B가 채운다(D-006) */}
        <StopwordAddCard />

        {/* 검색 입력 자리 — 필터링 로직은 012B가 채운다(work 문서 「가는 파일」표: 페이지
            골격에 속하지만 동작 구현은 012B 몫으로 배정됨) */}
        <div className="space-y-1.5">
          <Label htmlFor="stopword-search" className="sr-only">
            불용어 검색
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="stopword-search"
              placeholder="불용어 검색"
              className="pl-8"
              onChange={() => {}} // TODO(012B): 검색어 필터링 로직 구현 필요
            />
          </div>
        </div>

        {state === 'error' && (
          <ErrorAlert description="불용어 목록을 불러오지 못했습니다" onRetry={retry} />
        )}

        {state === 'loading' && (
          <div role="status" aria-live="polite" className="space-y-4">
            <span className="sr-only">불러오는 중</span>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))}
            </div>
          </div>
        )}

        {state === 'ready' && (
          <>
            <StopwordSection
              headingId="default-stopword-heading"
              title="기본 제공 불용어"
              description="자동으로 제외되는 상투어입니다. 삭제하면 확인 절차를 거칩니다."
              items={defaultStopwords}
              onDeleted={handleDeleted}
            />
            <StopwordSection
              headingId="custom-stopword-heading"
              title="사용자 추가 불용어"
              items={customStopwords}
              emptyState={{
                icon: <Ban />,
                title: '아직 추가한 불용어가 없습니다',
                description: '위 입력창에서 새 불용어를 추가해 보세요',
              }}
              onDeleted={handleDeleted}
            />
          </>
        )}

        {/* 삭제 결과 라이브 리전 — 두 섹션에 걸친 상태라 페이지가 직접 들고 있는다 */}
        <div role="status" aria-live="polite" className="sr-only">
          {liveMessage}
        </div>
      </div>
    </PageContainer>
  )
}
