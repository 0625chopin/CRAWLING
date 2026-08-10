'use client'

import { Play, RefreshCw } from 'lucide-react'

import { CategoryFilter } from '@/components/common/category-filter'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { RunListItem } from '@/lib/api/run-client'
import type { PosTag } from '@/lib/types/keyword'
import type { PressCategory } from '@/lib/types/press'

const TOP_N_OPTIONS = [20, 50, 100] as const

export interface AnalysisFilterBarProps {
  runs: RunListItem[]
  selectedRunId: string
  onSelectedRunIdChange: (runId: string) => void
  minCount: number
  onMinCountChange: (value: number) => void
  posFilter: PosTag[]
  onPosFilterChange: (value: PosTag[]) => void
  topN: number
  onTopNChange: (value: number) => void
  /** 카테고리 필터(Task 028). 빈 배열이면 전체 — 선택한 카테고리 기사만으로 랭킹을 다시 낸다. */
  categories: PressCategory[]
  onCategoriesChange: (value: PressCategory[]) => void
  /** [분석 시작]/[재분석] 클릭 — 현재 필터 값으로 조회한다(Kiwi를 다시 돌리지 않는다). */
  onSubmit: () => void
  /** 분석 진행 중에는 값 변경과 제출을 모두 막는다(설계서 §② 분석 진행 중 — "조건 바는 비활성화"). */
  disabled: boolean
  /** 이미 분석 결과가 있으면 버튼 라벨이 [분석 시작] → [재분석]으로 바뀐다. */
  hasResult: boolean
}

/**
 * ① 분석 조건 바(docs/screens/03-hot-keyword.md §① 분석 조건 바). run 셀렉터 · 최소 등장 횟수 ·
 * 품사 필터 · 표시 개수 · 분석 시작/재분석 버튼. 정렬 UI는 만들지 않는다 — PRD가 빈도순 랭킹으로
 * 정렬 기준을 고정 규정한다(설계서 근거).
 */
export function AnalysisFilterBar({
  runs,
  selectedRunId,
  onSelectedRunIdChange,
  minCount,
  onMinCountChange,
  posFilter,
  onPosFilterChange,
  topN,
  onTopNChange,
  categories,
  onCategoriesChange,
  onSubmit,
  disabled,
  hasResult,
}: AnalysisFilterBarProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <Label htmlFor="run-select">분석 대상 run</Label>
          <Select value={selectedRunId} onValueChange={onSelectedRunIdChange} disabled={disabled}>
            <SelectTrigger id="run-select" className="w-full">
              <SelectValue placeholder="분석할 run을 선택하세요" />
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="min-count">최소 등장 횟수</Label>
          <div className="flex items-center gap-2">
            <Input
              id="min-count"
              type="number"
              min={1}
              value={minCount}
              disabled={disabled}
              onChange={(event) => {
                const parsed = Number(event.target.value)
                onMinCountChange(Number.isFinite(parsed) && parsed >= 1 ? parsed : 1)
              }}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">회 이상</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pos-filter">품사</Label>
          <ToggleGroup
            id="pos-filter"
            type="multiple"
            variant="outline"
            disabled={disabled}
            value={posFilter}
            onValueChange={(value) => onPosFilterChange(value as PosTag[])}
          >
            <ToggleGroupItem value="NNG">NNG</ToggleGroupItem>
            <ToggleGroupItem value="NNP">NNP</ToggleGroupItem>
            <ToggleGroupItem value="SL">SL</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-filter">카테고리</Label>
          <CategoryFilter
            id="category-filter"
            value={categories}
            onValueChange={onCategoriesChange}
            disabled={disabled}
            aria-label="카테고리 필터"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="top-n-select">표시 개수</Label>
          <Select
            value={String(topN)}
            onValueChange={(value) => onTopNChange(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger id="top-n-select" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOP_N_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  Top {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={onSubmit} disabled={disabled}>
          {hasResult ? <RefreshCw aria-hidden="true" /> : <Play aria-hidden="true" />}
          {hasResult ? '재분석' : '분석 시작'}
        </Button>
      </CardContent>
    </Card>
  )
}
