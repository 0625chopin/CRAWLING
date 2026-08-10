'use client'

import { useState, type FormEvent } from 'react'
import { ChevronDown, ChevronRight, CircleAlert } from 'lucide-react'

import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { addStopword, addStopwords } from '@/lib/api/stopword-client'
import type { Stopword } from '@/lib/types/stopword'

export interface StopwordAddCardProps {
  /** 추가 성공 시 부모(app/stopwords/page.tsx)가 목록 상태에 이어 붙이도록 알린다. */
  onAdded: (added: Stopword[]) => void
}

/**
 * 불용어 추가 카드 — 단일 입력 + 일괄 추가 disclosure를 담는다
 * (docs/screens/05-stopword-manage.md §상태별 화면 ③④). 012A가 만든 정적 뼈대(카드·라벨·id)의
 * 마크업은 그대로 두고, 이 회차(012B)는 상태·요청·라이브 리전만 채운다(docs/DECISIONS.md D-006).
 */
export function StopwordAddCard({ onAdded }: StopwordAddCardProps) {
  const [word, setWord] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  // 삭제 결과는 app/stopwords/page.tsx가 별도 라이브 리전으로 안내한다 — 이 카드는
  // 자신이 만든 추가 결과(단일·일괄)만 이 리전으로 알린다.
  const [liveMessage, setLiveMessage] = useState('')

  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)

  async function handleAddSingle(event: FormEvent) {
    event.preventDefault()
    const trimmed = word.trim()
    if (!trimmed) return

    setIsSubmitting(true)
    setDuplicateWarning(null)
    try {
      const result = await addStopword(trimmed)
      if (result.added.length > 0) {
        onAdded(result.added)
        setLiveMessage(`'${trimmed}' 불용어가 추가되었습니다`)
        setWord('')
      } else {
        // 서버가 { added: [], skipped: [단어] }로 돌려준다 — 목록은 변하지 않는다.
        setDuplicateWarning(trimmed)
        // Alert(role="alert")가 시각적으로 이미 보이지만, 이 카드 전체의 결과 안내를
        // 하나의 라이브 리전으로 일관되게 전달하기 위해 같은 문구를 여기에도 싣는다
        // (docs/screens/05-stopword-manage.md §상태별 화면 ④).
        setLiveMessage(`'${trimmed}'는 이미 등록된 불용어입니다`)
      }
    } catch {
      setLiveMessage('불용어 추가에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAddBulk() {
    const trimmed = bulkText.trim()
    if (!trimmed) return

    setIsBulkSubmitting(true)
    try {
      // 쉼표·줄바꿈 분리는 서버가 한 번 더 수행하므로(Task 011 구현 규칙) 원시 문자열을
      // 그대로 보낸다.
      const result = await addStopwords(trimmed)
      if (result.added.length > 0) {
        onAdded(result.added)
      }

      const addedCount = result.added.length
      const skippedCount = result.skipped.length
      if (addedCount > 0 && skippedCount > 0) {
        setLiveMessage(
          `${addedCount}개 불용어를 추가했습니다. ${skippedCount}개는 이미 등록되어 있었습니다.`
        )
      } else if (addedCount > 0) {
        setLiveMessage(`${addedCount}개 불용어를 추가했습니다`)
      } else {
        setLiveMessage('입력한 단어가 모두 이미 등록되어 있었습니다')
      }

      setBulkText('')
      setIsBulkOpen(false)
    } catch {
      setLiveMessage('일괄 추가에 실패했습니다')
    } finally {
      setIsBulkSubmitting(false)
    }
  }

  function handleBulkCancel() {
    setBulkText('')
    setIsBulkOpen(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>불용어 추가</CardTitle>
        <CardDescription>단어를 입력하고 추가 버튼을 누르세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={handleAddSingle}>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="stopword-input">새 불용어</Label>
            <Input
              id="stopword-input"
              placeholder="예: 앵커"
              value={word}
              onChange={(event) => {
                setWord(event.target.value)
                if (duplicateWarning) setDuplicateWarning(null)
              }}
              aria-describedby="stopword-input-help"
            />
          </div>
          <Button type="submit" disabled={isSubmitting || !word.trim()}>
            추가
          </Button>
        </form>
        <p id="stopword-input-help" className="text-xs text-muted-foreground">
          이미 등록된 단어는 추가되지 않습니다.
        </p>

        {duplicateWarning ? (
          <Alert variant="destructive">
            <CircleAlert className="size-4" aria-hidden="true" />
            <AlertTitle>&apos;{duplicateWarning}&apos;는 이미 등록된 불용어입니다.</AlertTitle>
          </Alert>
        ) : null}

        <button
          type="button"
          onClick={() => setIsBulkOpen((prev) => !prev)}
          aria-expanded={isBulkOpen}
          aria-controls="bulk-add-panel"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {isBulkOpen ? (
            <ChevronDown className="size-3.5" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-3.5" aria-hidden="true" />
          )}
          여러 단어 한 번에 추가
        </button>

        {isBulkOpen ? (
          <div id="bulk-add-panel" className="space-y-1.5">
            <Label htmlFor="stopword-bulk-input">여러 단어 입력</Label>
            <Textarea
              id="stopword-bulk-input"
              placeholder={'앵커, 특파원\n인턴기자'}
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              aria-describedby="stopword-bulk-input-help"
              rows={3}
            />
            <p id="stopword-bulk-input-help" className="text-xs text-muted-foreground">
              쉼표(,) 또는 줄바꿈으로 구분해 입력하세요.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleBulkCancel}>
                취소
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddBulk}
                disabled={isBulkSubmitting || !bulkText.trim()}
              >
                일괄 추가
              </Button>
            </div>
          </div>
        ) : null}

        {/* 추가 결과 라이브 리전 — 삭제 결과는 app/stopwords/page.tsx가 별도로 안내한다. */}
        <div role="status" aria-live="polite" className="sr-only">
          {liveMessage}
        </div>
      </CardContent>
    </Card>
  )
}
