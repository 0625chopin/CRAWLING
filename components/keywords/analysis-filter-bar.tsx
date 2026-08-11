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
import type { PosTag } from '@/lib/types/keyword'
import type { PressCategory } from '@/lib/types/press'
import { formatDateKeyLabel, TIME_SLOTS } from '@/lib/types/time-slot'

const TOP_N_OPTIONS = [20, 50, 100] as const

/** 시간대 셀렉터에서 "전체"를 나타내는 값. `Select`는 빈 문자열을 값으로 쓸 수 없어 리터럴을 둔다. */
const ALL_SLOTS_VALUE = 'all'

export interface AnalysisFilterBarProps {
  /** 분석 가능한 날짜(`YYYYMMDD`, 최신순). 실행이 하루라도 있었던 날만 들어온다. */
  dates: string[]
  selectedDate: string
  onSelectedDateChange: (date: string) => void
  /** 고른 시간대 구간 번호. null이면 전체 시간대다. */
  slot: number | null
  onSlotChange: (slot: number | null) => void
  /**
   * 구간별 기사 수(8개). 아직 분석 전이면 null — 그때는 건수를 붙이지 않는다. 0건인 구간을
   * 고르면 빈 랭킹이 나오는데, 그 사실을 고르기 **전에** 알려주는 것이 이 배지의 목적이다.
   */
  slotArticleCounts: number[] | null
  minCount: number
  onMinCountChange: (value: number) => void
  posFilter: PosTag[]
  onPosFilterChange: (value: PosTag[]) => void
  topN: number
  onTopNChange: (value: number) => void
  /** 카테고리 필터(Task 028). 빈 배열이면 전체 — 선택한 카테고리 기사만으로 랭킹을 다시 낸다. */
  categories: PressCategory[]
  onCategoriesChange: (value: PressCategory[]) => void
  /** [분석 시작]/[재분석] 클릭 — 현재 필터 값으로 조회한다. */
  onSubmit: () => void
  /** 분석 진행 중에는 값 변경과 제출을 모두 막는다(설계서 §② 분석 진행 중 — "조건 바는 비활성화"). */
  disabled: boolean
  /** 이미 분석 결과가 있으면 버튼 라벨이 [분석 시작] → [재분석]으로 바뀐다. */
  hasResult: boolean
}

/**
 * ① 분석 조건 바(docs/screens/03-hot-keyword.md §① 분석 조건 바). 날짜 · 시간대 · 최소 등장 횟수 ·
 * 품사 필터 · 카테고리 · 표시 개수 · 분석 시작/재분석 버튼. 정렬 UI는 만들지 않는다 — PRD가 빈도순
 * 랭킹으로 정렬 기준을 고정 규정한다(설계서 근거).
 *
 * **대상은 run이 아니라 날짜다.** run 하나에는 그 시점 피드에 걸린 최근 몇 시간치 기사만 담겨
 * (10:26 실행 실측: 07~10시 발행분이 대부분) "0~3시 대비 4~6시" 같은 시간대 비교가 성립하지
 * 않는다. 하루치 run을 전부 합치고 기사 URL로 중복을 제거해야 8개 구간이 고르게 찬다.
 *
 * 시간대는 값을 바꾸는 즉시 반영된다(`onSlotChange`가 곧바로 재조회한다) — 하루치 집계는 이미
 * 캐시에 있어 구간을 바꾸는 데 다시 분석할 필요가 없기 때문이다. 나머지 조건은 종전대로
 * [분석 시작]을 눌러야 적용된다.
 */
export function AnalysisFilterBar({
  dates,
  selectedDate,
  onSelectedDateChange,
  slot,
  onSlotChange,
  slotArticleCounts,
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
        <div className="flex min-w-44 flex-col gap-1.5">
          <Label htmlFor="date-select">분석 대상 날짜</Label>
          <Select value={selectedDate} onValueChange={onSelectedDateChange} disabled={disabled}>
            <SelectTrigger id="date-select" className="w-full">
              <SelectValue placeholder="분석할 날짜를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {dates.map((date) => (
                <SelectItem key={date} value={date}>
                  {formatDateKeyLabel(date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-44 flex-col gap-1.5">
          <Label htmlFor="slot-select">시간대</Label>
          <Select
            value={slot === null ? ALL_SLOTS_VALUE : String(slot)}
            onValueChange={(value) =>
              onSlotChange(value === ALL_SLOTS_VALUE ? null : Number(value))
            }
            disabled={disabled}
          >
            <SelectTrigger id="slot-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SLOTS_VALUE}>전체 시간대</SelectItem>
              {TIME_SLOTS.map((timeSlot) => (
                <SelectItem key={timeSlot.index} value={String(timeSlot.index)}>
                  {timeSlot.label}
                  {slotArticleCounts ? ` (${slotArticleCounts[timeSlot.index] ?? 0}건)` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="min-count">최소 기사 수</Label>
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
            <span className="text-sm text-muted-foreground">건 이상</span>
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
