'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RunListItem } from '@/lib/api/run-client'

export interface RunSelectProps {
  runs: RunListItem[]
  selectedRunId: string
  onSelectedRunIdChange: (runId: string) => void
}

/**
 * ② 실행 선택(`docs/screens/02-collect-result.md` §영역별 컴포넌트 명세). 라벨은 서버가
 * `buildRunListLabel`로 이미 조립해 내려준 문자열을 그대로 쓴다 — 여기서 다시 만들지 않는다.
 */
export function RunSelect({ runs, selectedRunId, onSelectedRunIdChange }: RunSelectProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Label htmlFor="run-select" className="text-sm font-medium">
          실행 선택
        </Label>
        <Select value={selectedRunId} onValueChange={onSelectedRunIdChange}>
          <SelectTrigger id="run-select" className="w-[340px]">
            <SelectValue placeholder="실행을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {runs.map((run) => (
              <SelectItem key={run.id} value={run.id}>
                {run.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <span className="text-xs text-muted-foreground">총 {runs.length}건의 실행 기록</span>
    </div>
  )
}
