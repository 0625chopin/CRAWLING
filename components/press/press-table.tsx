'use client'

import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { SourceTypeBadge } from '@/components/press/source-type-badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { updatePressActive, type PressSourceWithUrl } from '@/lib/api/press-client'

export interface PressTableProps {
  pressList: PressSourceWithUrl[]
  /** 활성 스위치가 실제로 바뀐 뒤 부모 목록 상태를 갱신하도록 알린다. */
  onActiveChanged: (press: PressSourceWithUrl) => void
  /**
   * 수정·삭제 버튼 클릭 콜백. 다이얼로그 연결은 Task 009B 몫이라(`press-form-dialog.tsx`·
   * `delete-press-dialog.tsx`) 이 컴포넌트는 어떤 다이얼로그도 import하지 않는다 —
   * 009B가 `app/press/page.tsx`에서 이 값을 넘겨 다이얼로그를 열도록 연결한다.
   */
  onEditRequest?: (press: PressSourceWithUrl) => void
  onDeleteRequest?: (press: PressSourceWithUrl) => void
}

/**
 * 수집 설정 컬럼의 펼침 버튼 라벨.
 * null이면 펼칠 내용이 없다는 뜻이므로 버튼 대신 안내 텍스트를 렌더링한다
 * (docs/screens/04-press-manage.md §③ 결정 근거 1번 — RSS 요약만 행은 펼칠 게 없다).
 */
function expandLabelOf(press: PressSourceWithUrl): string | null {
  if (press.sourceType === 'html') return '셀렉터 3개'
  return press.contentSelector ? '본문 셀렉터' : null
}

/** 데스크톱(md 이상) 언론사 목록 표 — 방식 배지·소스 URL·수집 설정 펼침 서브 행을 포함한다. */
export function PressTable({
  pressList,
  onActiveChanged,
  onEditRequest,
  onDeleteRequest,
}: PressTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pendingActiveId, setPendingActiveId] = useState<string | null>(null)

  async function handleActiveChange(press: PressSourceWithUrl, next: boolean) {
    setPendingActiveId(press.id)
    try {
      const updated = await updatePressActive(press.id, next)
      onActiveChanged(updated)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '활성 상태 변경에 실패했습니다')
    } finally {
      setPendingActiveId(null)
    }
  }

  return (
    <div className="hidden overflow-x-auto rounded-md border md:block">
      <Table>
        <caption className="sr-only">등록된 언론사 목록</caption>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>소스 URL</TableHead>
            <TableHead>수집 설정</TableHead>
            <TableHead>활성</TableHead>
            <TableHead className="text-right">관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pressList.map((press) => {
            const expandLabel = expandLabelOf(press)
            const isExpanded = expandedId === press.id

            return (
              <Fragment key={press.id}>
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {press.name}
                      <SourceTypeBadge sourceType={press.sourceType} />
                    </div>
                  </TableCell>
                  <TableCell
                    className="max-w-56 truncate font-mono text-xs text-muted-foreground"
                    title={press.sourceUrl}
                  >
                    {press.sourceUrl}
                  </TableCell>
                  <TableCell>
                    {expandLabel ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        aria-expanded={isExpanded}
                        aria-controls={`press-selectors-${press.id}`}
                        onClick={() => setExpandedId(isExpanded ? null : press.id)}
                      >
                        {expandLabel}
                        {isExpanded ? (
                          <ChevronDown className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="size-3.5" aria-hidden="true" />
                        )}
                      </Button>
                    ) : (
                      // 펼칠 내용이 없으므로 버튼으로 만들지 않는다
                      <span className="text-xs text-muted-foreground">피드 요약만</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={press.isActive}
                        disabled={pendingActiveId === press.id}
                        aria-label={`${press.name} 활성 상태`}
                        onCheckedChange={(next) => handleActiveChange(press, next)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {press.isActive ? '활성' : '비활성'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {/* 다이얼로그 연결은 009B 몫 — 여기서는 요청 콜백만 알린다 */}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${press.name} 수정`}
                        onClick={() => onEditRequest?.(press)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${press.name} 삭제`}
                        onClick={() => onDeleteRequest?.(press)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expandLabel ? (
                  <TableRow
                    id={`press-selectors-${press.id}`}
                    className={isExpanded ? undefined : 'hidden'}
                  >
                    <TableCell colSpan={5} className="bg-muted/40">
                      {press.sourceType === 'html' ? (
                        <dl className="grid gap-2 text-xs sm:grid-cols-3">
                          <div>
                            <dt className="text-muted-foreground">기사 링크</dt>
                            <dd className="font-mono">{press.articleLinkSelector}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">제목</dt>
                            <dd className="font-mono">{press.titleSelector}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">본문</dt>
                            <dd className="font-mono">{press.contentSelector}</dd>
                          </div>
                        </dl>
                      ) : (
                        <dl className="grid gap-2 text-xs sm:grid-cols-2">
                          <div>
                            <dt className="text-muted-foreground">본문 셀렉터</dt>
                            <dd className="font-mono">{press.contentSelector}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">본문 출처</dt>
                            <dd>원문 전문 (피드 요약 대신 원문 페이지에서 수집)</dd>
                          </div>
                        </dl>
                      )}
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
