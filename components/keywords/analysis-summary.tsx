import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalysisSummary as AnalysisSummaryType } from '@/lib/types/keyword'

export interface AnalysisSummaryProps {
  summary: AnalysisSummaryType
}

/**
 * ② 분석 요약(docs/screens/03-hot-keyword.md §② 분석 요약). "조사·어미를 실제로 제거했다"는
 * 이 프로젝트의 핵심 요구사항을 사용자가 체감하도록 5개 수치를 접거나 생략하지 않고 항상
 * 노출한다 — "전체 토큰 수"와 "조사·어미 제거 후"를 인접 배치해 숫자가 줄어드는 것을 눈으로
 * 확인하게 한다.
 */
export function AnalysisSummary({ summary }: AnalysisSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">분석 요약</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div>
          <p className="text-xs text-muted-foreground">분석 기사</p>
          <p className="text-lg font-semibold tabular-nums">{summary.articleCount}건</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">전체 토큰 수</p>
          <p className="text-lg font-semibold tabular-nums">
            {summary.totalTokenCount.toLocaleString()}개
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">조사·어미 제거 후</p>
          <p className="text-lg font-semibold tabular-nums">
            {summary.filteredTokenCount.toLocaleString()}개
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">불용어 제외</p>
          <p className="text-lg font-semibold tabular-nums">
            {summary.stopwordExcludedCount.toLocaleString()}개
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">고유 키워드</p>
          <p className="text-lg font-semibold tabular-nums">
            {summary.uniqueKeywordCount.toLocaleString()}개
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
