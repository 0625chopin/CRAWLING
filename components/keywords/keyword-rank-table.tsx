import { Ban } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { KeywordCount } from '@/lib/types/keyword'

export interface KeywordRankTableProps {
  /** 필터 적용 후 표시 대상 전체 목록(내림차순 정렬 유지, 서버가 이미 정렬해 내려준다). */
  items: KeywordCount[]
  /** 행별 Ban 버튼 클릭 시 호출한다. 불용어 추가 + force 재분석은 페이지가 처리한다. */
  onAddStopword: (keyword: string) => void
  /** 지금 추가 처리 중인 키워드 — 그 행의 버튼만 비활성화한다. */
  pendingKeyword: string | null
}

/**
 * ④ 키워드 랭킹 표(docs/screens/03-hot-keyword.md §④, `sm:` 이상에서만 보인다 — `sm:` 미만은
 * `KeywordRankCardList`가 같은 정보를 카드로 대신 그린다). 루트에 `hidden sm:block`을 직접
 * 두어 페이지가 감싸는 wrapper 없이 반응형을 전환한다.
 *
 * "등장 횟수" 헤더는 정렬 트리거가 아니라 정적 `aria-sort="descending"`만 부여한다 — PRD가
 * 빈도순 고정을 규정하므로 사용자가 바꿀 수 있는 정렬 UI는 만들지 않는다.
 */
export function KeywordRankTable({ items, onAddStopword, pendingKeyword }: KeywordRankTableProps) {
  const topCount = items[0]?.count ?? 1

  return (
    <Card className="hidden sm:block">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">
          키워드 랭킹 (Top {items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <Table aria-label="키워드 등장 빈도 랭킹">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>키워드</TableHead>
              <TableHead>품사</TableHead>
              <TableHead aria-sort="descending" className="text-right">
                등장 횟수
              </TableHead>
              <TableHead className="w-40">비중</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">불용어 관리</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const ratio = topCount > 0 ? item.count / topCount : 0
              return (
                <TableRow key={item.keyword}>
                  <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                  <TableCell className="font-medium">{item.keyword}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.posTag}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{item.count}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* 장식용 막대 — 수치는 옆 텍스트로 항상 병기하므로 스크린리더에서 숨긴다. */}
                      <div className="h-1.5 w-full rounded-full bg-muted" aria-hidden="true">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {Math.round(ratio * 100)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${item.keyword} 불용어로 추가`}
                      disabled={pendingKeyword === item.keyword}
                      onClick={() => onAddStopword(item.keyword)}
                    >
                      <Ban className="text-muted-foreground" aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
