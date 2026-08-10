import Link from 'next/link'
import { Clock, Flame, Newspaper } from 'lucide-react'

import { ErrorAlert } from '@/components/common/error-alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatLocalDateTimeSecond } from '@/lib/api/run-format'
import type { RunSummary } from '@/lib/api/run-client'

export interface RunSummaryCardProps {
  summary: RunSummary
}

/**
 * "YYYY-MM-DD HH:mm:ss"에서 시:분만 잘라낸다 — 모바일은 날짜·초를 생략한 `HH:mm`로 그린다
 * (설계서 §③ 와이어프레임: 데스크톱 `14:32:05`, 모바일 `14:32`). `formatLocalDateTimeSecond`가
 * 항상 이 형식을 돌려주므로 문자열 자르기로 충분하다 — 별도 포맷 함수를 새로 만들지 않는다.
 */
function toTimeOnly(formatted: string): string {
  return formatted.slice(11, 16)
}

/**
 * ③ 실행 요약 카드 + [키워드 분석] 버튼 + 부분 실패 `ErrorAlert`
 * (`docs/screens/02-collect-result.md` §영역별 컴포넌트 명세 · §상태별 화면 ⑤).
 *
 * 실행 시각은 폭에 따라 다른 포맷을 요구한다(D-025 — 반응형별로 갈리는 표시 포맷은 서버가 한
 * 문자열로 굽지 않고 화면이 ISO를 받아 직접 고른다). 서버 재요청 없이 CSS로만 가른다 —
 * `hidden sm:inline`/`sm:hidden` 두 벌을 함께 렌더하고 뷰포트가 보여줄 쪽만 고른다.
 */
export function RunSummaryCard({ summary }: RunSummaryCardProps) {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">실행 요약</CardTitle>
          <CardAction>
            {/* 선택된 runId를 쿼리로 유지한 채 이동한다(ROADMAP Task 018 구현 규칙).
                내부 이동이므로 next/link — raw <a href="/...">는 lint error다. */}
            <Button asChild>
              <Link href={`/keywords?runId=${summary.id}`}>
                <Flame aria-hidden="true" />
                키워드 분석
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-muted-foreground">실행 시각</dt>
                <dd>
                  <span className="hidden sm:inline">
                    {formatLocalDateTimeSecond(summary.startedAt)}
                  </span>
                  <span className="sm:hidden">
                    {toTimeOnly(formatLocalDateTimeSecond(summary.startedAt))}
                  </span>
                  {summary.finishedAt && (
                    <>
                      {' → '}
                      <span className="hidden sm:inline">
                        {formatLocalDateTimeSecond(summary.finishedAt)}
                      </span>
                      <span className="sm:hidden">
                        {toTimeOnly(formatLocalDateTimeSecond(summary.finishedAt))}
                      </span>
                    </>
                  )}
                  {summary.durationLabel && (
                    <span className="ml-1 text-muted-foreground">
                      (소요 {summary.durationLabel})
                    </span>
                  )}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Newspaper className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-muted-foreground">대상 언론사</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {summary.targetPress.map((press) => (
                    // 삭제된 언론사는 고정 문구 "삭제된 언론사"로 그린다(D-027) — 옛 이름을
                    // 복구하지 않는다(D-026). variant 전환은 보조 신호일 뿐, 주 신호는 텍스트 자체다.
                    <Badge key={press.id} variant={press.deleted ? 'outline' : 'secondary'}>
                      {press.deleted ? '삭제된 언론사' : press.name}
                    </Badge>
                  ))}
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-muted-foreground">수집 결과</dt>
              <dd>
                성공 {summary.successCount}건 ·{' '}
                <span
                  className={summary.failCount > 0 ? 'font-medium text-destructive' : undefined}
                >
                  실패 {summary.failCount}건
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">저장 경로</dt>
              <dd className="font-mono text-xs">{summary.storagePath}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* 실패 건수 > 0이면 요약 카드 아래 추가로 안내한다(상태별 화면 ⑤). */}
      {summary.failCount > 0 && (
        <ErrorAlert
          title="일부 기사 수집에 실패했습니다"
          description="실패한 기사는 목록에 표시되지 않습니다. 반복적으로 실패한다면 언론사 관리 페이지에서 해당 언론사의 수집 설정(RSS는 피드 URL, HTML은 셀렉터)을 확인하세요."
        />
      )}
    </div>
  )
}
