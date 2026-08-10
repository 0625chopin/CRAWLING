'use client'

import { useState } from 'react'
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
} from '@/components/ui/alert-dialog'
import { deletePress, type PressSourceWithUrl } from '@/lib/api/press-client'

export interface DeletePressDialogProps {
  /** null이면 닫힘 상태다 — press-table·press-card-list(009A)가 삭제 버튼 클릭 시 알린 대상. */
  press: PressSourceWithUrl | null
  onOpenChange: (open: boolean) => void
  onDeleted: (press: PressSourceWithUrl) => void
}

/**
 * 언론사 삭제 확인. press-table·press-card-list는 삭제 버튼을 눌러도 요청 콜백만 부모에
 * 알릴 뿐 다이얼로그를 직접 열지 않으므로(PressFormDialog와 같은 이유), 이 다이얼로그도
 * 항상 부모(app/press/page.tsx)가 들고 있는 press 값으로 열림 여부를 제어한다.
 */
export function DeletePressDialog({ press, onOpenChange, onDeleted }: DeletePressDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!press) return
    setIsDeleting(true)
    try {
      await deletePress(press.id)
      onDeleted(press)
      toast.success(`${press.name} 언론사를 삭제했습니다`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '언론사 삭제에 실패했습니다')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={press !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{press?.name} 언론사를 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            삭제하면 크롤링 실행 페이지의 체크박스 목록에서 즉시 사라집니다. 이미 수집된
            기사와 저장된 실행 결과는 삭제되지 않지만, 이 언론사 등록 정보는 되돌릴 수
            없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
          {/* Radix AlertDialog.Action은 클릭 시 자동으로 onOpenChange(false)를 호출한다 —
              stopword-chip.tsx(012A)와 같은 관용구로, 별도 preventDefault 없이 삭제 요청을
              백그라운드로 보낸다. */}
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
