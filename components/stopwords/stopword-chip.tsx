'use client'

import { useState } from 'react'
import { Lock, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { deleteStopword } from '@/lib/api/stopword-client'
import type { Stopword } from '@/lib/types/stopword'

export interface StopwordChipProps {
  stopword: Stopword
  /** 삭제 API가 실제로 끝난 뒤에만 호출된다 — 부모가 이 시점에 목록 상태와 안내 문구를 갱신한다. */
  onDeleted: (stopword: Stopword) => void
}

/**
 * 불용어 하나를 나타내는 칩(Badge + 삭제 버튼).
 * 기본 프리셋(isDefault)은 되돌리기 어려운 삭제라 AlertDialog로 한 번 더 확인하고,
 * 사용자 추가 항목은 언제든 다시 입력할 수 있는 가벼운 데이터라 즉시 삭제한다
 * (docs/screens/05-stopword-manage.md §설계 결정 요약).
 */
export function StopwordChip({ stopword, onDeleted }: StopwordChipProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { id, word, isDefault } = stopword

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteStopword(id)
      onDeleted(stopword)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '불용어 삭제에 실패했습니다')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isDefault) {
    return (
      <li>
        <AlertDialog>
          <Badge variant="outline" className="gap-1 pr-1">
            <Lock className="size-3 text-muted-foreground" aria-hidden="true" />
            {word}
            <AlertDialogTrigger asChild>
              <button
                type="button"
                disabled={isDeleting}
                aria-label={`'${word}' 불용어 삭제`}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted disabled:opacity-50"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </AlertDialogTrigger>
          </Badge>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>기본 제공 불용어를 삭제할까요?</AlertDialogTitle>
              <AlertDialogDescription>
                {`'${word}'는 기본으로 제공되는 불용어입니다. 삭제하면 다음 분석부터 랭킹에 다시 나타날 수 있습니다. 되돌리려면 같은 단어를 직접 다시 추가해야 합니다.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </li>
    )
  }

  return (
    <li>
      <Badge variant="secondary" className="gap-1 pr-1">
        {word}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`'${word}' 불용어 삭제`}
          className="ml-0.5 rounded-full p-0.5 hover:bg-muted disabled:opacity-50"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      </Badge>
    </li>
  )
}
