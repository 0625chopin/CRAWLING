'use client'

import { useCallback, useEffect, useState } from 'react'
import { Info, Newspaper, Plus } from 'lucide-react'

import { CategoryFilter } from '@/components/common/category-filter'
import { ErrorAlert } from '@/components/common/error-alert'
import { EmptyState } from '@/components/common/empty-state'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { DeletePressDialog } from '@/components/press/delete-press-dialog'
import { PressCardList } from '@/components/press/press-card-list'
import { PressFormDialog } from '@/components/press/press-form-dialog'
import { PressTable } from '@/components/press/press-table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchPressList, type PressSourceWithUrl } from '@/lib/api/press-client'
import type { PressCategory } from '@/lib/types/press'

type LoadState = 'loading' | 'error' | 'ready'

/** mode="create"면 press가 없고, mode="edit"면 대상 언론사를 들고 있다. */
type FormDialogState = { mode: 'create' } | { mode: 'edit'; press: PressSourceWithUrl } | null

export default function PressManagePage() {
  const [pressList, setPressList] = useState<PressSourceWithUrl[]>([])
  const [state, setState] = useState<LoadState>('loading')
  // 재조회 트리거 — "다시 시도" 버튼은 이 값을 바꿔 아래 이펙트를 다시 돌리는 방식으로 재조회한다.
  const [reloadToken, setReloadToken] = useState(0)
  // 카테고리 목록 필터(Task 028). 빈 배열 = 전체 — GET /api/press의 category 쿼리와 같은 규칙이다.
  const [categories, setCategories] = useState<PressCategory[]>([])

  const [formDialogState, setFormDialogState] = useState<FormDialogState>(null)
  // PressFormDialog에 매번 새 key를 주기 위한 카운터. 다이얼로그를 열 때마다 증가시켜
  // 컴포넌트를 통째로 다시 마운트한다 — 그러면 내부 폼 상태가 props(press/mode)로부터
  // 새로 초기화되므로, "열릴 때마다 다시 채우는" effect 없이 재사용 다이얼로그를 만들 수 있다
  // (components/press/press-form-dialog.tsx 상단 주석 참고).
  const [formDialogKey, setFormDialogKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<PressSourceWithUrl | null>(null)

  useEffect(() => {
    fetchPressList(categories)
      .then((data) => {
        setPressList(data)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [reloadToken, categories])

  const retry = useCallback(() => {
    setState('loading')
    setReloadToken((token) => token + 1)
  }, [])

  const openCreateDialog = useCallback(() => {
    setFormDialogState({ mode: 'create' })
    setFormDialogKey((key) => key + 1)
  }, [])

  const handleEditRequest = useCallback((press: PressSourceWithUrl) => {
    setFormDialogState({ mode: 'edit', press })
    setFormDialogKey((key) => key + 1)
  }, [])

  const handleDeleteRequest = useCallback(
    (press: PressSourceWithUrl) => setDeleteTarget(press),
    []
  )

  const handleActiveChanged = useCallback((updated: PressSourceWithUrl) => {
    setPressList((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }, [])

  const handleSaved = useCallback((saved: PressSourceWithUrl) => {
    setPressList((prev) => {
      const exists = prev.some((item) => item.id === saved.id)
      return exists
        ? prev.map((item) => (item.id === saved.id ? saved : item))
        : [...prev, saved]
    })
  }, [])

  const handleDeleted = useCallback((deleted: PressSourceWithUrl) => {
    setPressList((prev) => prev.filter((item) => item.id !== deleted.id))
  }, [])

  return (
    // <main>·컨테이너·Breadcrumb·h1을 손으로 다시 그리지 않는다.
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: '홈', href: '/' }, { label: '언론사 관리' }]}
        title="언론사 관리"
        description="크롤링 대상 언론사를 코드 수정 없이 데이터로 등록·관리합니다."
        action={
          <Button className="shrink-0" onClick={openCreateDialog}>
            <Plus className="size-4" />
            언론사 추가
          </Button>
        }
      />

      <Alert className="mb-6">
        <Info className="size-4" aria-hidden="true" />
        <AlertTitle>변경 사항은 즉시 반영됩니다</AlertTitle>
        <AlertDescription>
          여기서 추가·수정·활성 전환한 언론사는 코드 수정 없이 크롤링 실행 페이지의 언론사
          체크박스 목록에 바로 반영됩니다.
        </AlertDescription>
      </Alert>

      {/* 카테고리 목록 필터(Task 028) — 값이 바뀌면 위 이펙트가 GET /api/press?category=...를 다시 부른다. */}
      <div className="mb-6 flex flex-col gap-1.5">
        <Label htmlFor="press-category-filter">카테고리 필터</Label>
        <CategoryFilter
          id="press-category-filter"
          value={categories}
          onValueChange={setCategories}
          disabled={state === 'loading'}
          aria-label="카테고리 필터"
        />
      </div>

      {state === 'error' && (
        <ErrorAlert description="언론사 목록을 불러오지 못했습니다" onRetry={retry} />
      )}

      {state === 'loading' && (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="sr-only">언론사 목록을 불러오는 중입니다</span>
          <div className="hidden overflow-hidden rounded-md border md:block">
            <div className="grid grid-cols-5 gap-4 border-b bg-muted/40 p-3 text-xs font-medium text-muted-foreground">
              <span>이름</span>
              <span>소스 URL</span>
              <span>수집 설정</span>
              <span>활성</span>
              <span className="text-right">관리</span>
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-5 items-center gap-4 border-b p-3 last:border-b-0"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="ml-auto h-4 w-12" />
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-md border p-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      )}

      {state === 'ready' && pressList.length === 0 && (
        <div className="flex flex-col items-center gap-3">
          {categories.length > 0 ? (
            <EmptyState
              icon={<Newspaper />}
              title="이 카테고리에 등록된 언론사가 없습니다"
              description="필터를 해제하거나 다른 카테고리를 선택해 보세요."
              actionLabel="필터 해제"
              onAction={() => setCategories([])}
            />
          ) : (
            <EmptyState
              icon={<Newspaper />}
              title="등록된 언론사가 없습니다"
              description="크롤링을 시작하려면 먼저 언론사를 추가하세요."
              actionLabel="언론사 추가"
              onAction={openCreateDialog}
            />
          )}
        </div>
      )}

      {state === 'ready' && pressList.length > 0 && (
        <>
          <PressTable
            pressList={pressList}
            onActiveChanged={handleActiveChanged}
            onEditRequest={handleEditRequest}
            onDeleteRequest={handleDeleteRequest}
          />
          <PressCardList
            pressList={pressList}
            onActiveChanged={handleActiveChanged}
            onEditRequest={handleEditRequest}
            onDeleteRequest={handleDeleteRequest}
          />
        </>
      )}

      <PressFormDialog
        key={formDialogKey}
        mode={formDialogState?.mode ?? 'create'}
        press={formDialogState?.mode === 'edit' ? formDialogState.press : undefined}
        open={formDialogState !== null}
        onOpenChange={(open) => {
          if (!open) setFormDialogState(null)
        }}
        onSaved={handleSaved}
      />

      <DeletePressDialog
        press={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onDeleted={handleDeleted}
      />
    </PageContainer>
  )
}
