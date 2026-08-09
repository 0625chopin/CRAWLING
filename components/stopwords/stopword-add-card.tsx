'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * 불용어 추가 카드 — 이 회차(012A)는 정적 뼈대만 둔다.
 * 단일 추가·일괄 추가 disclosure·중복 입력 Alert·추가 결과 라이브 리전의 실제 동작은
 * Task 012B가 이 파일 안에 채운다(docs/DECISIONS.md D-006, docs/ROADMAP/work/03.화면.md).
 * `app/stopwords/page.tsx`가 이미 이 컴포넌트를 import해 두므로 012B는 페이지를
 * 다시 고치지 않고 이 파일의 내부 구현만 채우면 된다.
 */
export function StopwordAddCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>불용어 추가</CardTitle>
        <CardDescription>단어를 입력하고 추가 버튼을 누르세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="stopword-input">새 불용어</Label>
            <Input
              id="stopword-input"
              placeholder="예: 앵커"
              aria-describedby="stopword-input-help"
            />
          </div>
          {/* TODO(012B): 단일 불용어 추가 로직 구현 필요 */}
          <Button type="button" onClick={() => {}}>
            추가
          </Button>
        </div>
        <p id="stopword-input-help" className="text-xs text-muted-foreground">
          이미 등록된 단어는 추가되지 않습니다.
        </p>

        {/* TODO(012B): 중복 입력 시 Alert(variant="destructive") + CircleAlert 아이콘으로 노출 */}

        {/* TODO(012B): 일괄 추가 disclosure 구현 필요 — 펼치면 Textarea(쉼표·줄바꿈 구분) 노출 */}
        <button
          type="button"
          onClick={() => {}}
          aria-expanded="false"
          aria-controls="bulk-add-panel"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          여러 단어 한 번에 추가
        </button>

        {/* TODO(012B): 추가/삭제 결과 안내 문구 삽입 필요 */}
        <div role="status" aria-live="polite" className="sr-only" />
      </CardContent>
    </Card>
  )
}
