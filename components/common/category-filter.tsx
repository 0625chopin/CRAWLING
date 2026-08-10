'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PRESS_CATEGORY_LABELS, pressCategorySchema, type PressCategory } from '@/lib/types/press'

export interface CategoryFilterProps {
  id?: string
  value: PressCategory[]
  onValueChange: (value: PressCategory[]) => void
  disabled?: boolean
  'aria-label': string
}

/**
 * 카테고리(IT/AI·엔터·스포츠·경제·증권) 다중 선택 필터. `/press`(목록 필터)·`/results`(기사 필터)·
 * `/keywords`(분석 필터)가 함께 쓴다 — 화면마다 라벨 문자열을 다시 타이핑하지 않도록
 * `PRESS_CATEGORY_LABELS`(lib/types/press.ts, 저장소 계층 소유)를 그대로 쓴다. 값이 빈 배열이면
 * "전체"라는 뜻이다 — 각 API의 `category` 반복 쿼리 파라미터와 같은 규칙(미지정 = 전체).
 */
export function CategoryFilter({ id, value, onValueChange, disabled, ...rest }: CategoryFilterProps) {
  return (
    <ToggleGroup
      id={id}
      type="multiple"
      variant="outline"
      value={value}
      disabled={disabled}
      onValueChange={(next) => onValueChange(next as PressCategory[])}
      {...rest}
    >
      {pressCategorySchema.options.map((category) => (
        <ToggleGroupItem key={category} value={category}>
          {PRESS_CATEGORY_LABELS[category]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
