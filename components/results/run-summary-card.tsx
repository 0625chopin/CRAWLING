import Link from 'next/link'
import { Clock, Filter, Flame, Newspaper, Tag } from 'lucide-react'

import { ErrorAlert } from '@/components/common/error-alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatLocalDateTimeSecond, formatLocalTimeOnly } from '@/lib/api/run-format'
import type { RunSummary } from '@/lib/api/run-client'
import { PRESS_CATEGORY_LABELS, type PressCategory } from '@/lib/types/press'

export interface RunSummaryCardProps {
  summary: RunSummary
  /**
   * 기사 파일 목록에 걸린 카테고리 필터 값(Task 028, `app/results/page.tsx`가 쥔 state를
   * `ArticleFileList`와 공유) — **`summary.targetCategories`와는 다른 값이다.** 저장소 계층이
   * 21일차에 `RunSummary.targetCategories`(실행 시작 당시의 진짜 스냅샷)를 내려주기 시작하면서,
   * 이 prop은 "실행이 무엇을 겨냥했나"가 아니라 순수하게 "지금 사용자가 기사 목록을 무엇으로
   * 좁혀 보고 있나"만 나타내는 값으로 성격이 분리됐다. 빈 배열이면 전체 카테고리를 본다는 뜻이다.
   */
  categories: PressCategory[]
}

/**
 * ③ 실행 요약 카드 + [키워드 분석] 버튼 + 부분 실패 `ErrorAlert`
 * (`docs/screens/02-collect-result.md` §영역별 컴포넌트 명세 · §상태별 화면 ⑤).
 *
 * 실행 시각은 폭에 따라 다른 포맷을 요구한다(D-025 — 반응형별로 갈리는 표시 포맷은 서버가 한
 * 문자열로 굽지 않고 화면이 ISO를 받아 직접 고른다). 서버 재요청 없이 CSS로만 가른다 —
 * `hidden sm:inline`/`sm:hidden` 두 벌을 함께 렌더하고 뷰포트가 보여줄 쪽만 고른다.
 */
export function RunSummaryCard({ summary, categories }: RunSummaryCardProps) {
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
                  <span className="sm:hidden">{formatLocalTimeOnly(summary.startedAt)}</span>
                  {summary.finishedAt && (
                    <>
                      {' → '}
                      <span className="hidden sm:inline">
                        {formatLocalDateTimeSecond(summary.finishedAt)}
                      </span>
                      <span className="sm:hidden">
                        {formatLocalTimeOnly(summary.finishedAt)}
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
            {/* 실행 시작 당시의 진짜 카테고리 스냅샷(Task 027, 21일차 저장소 계층 신설). 빈
                배열은 "언론사를 개별 선택했다"와 "이 필드가 생기기 전 과거 run이다" 둘 다를
                가리키는 같은 사실("카테고리 스냅샷 없음")이라 값을 지어내지 않고 행 자체를
                감춘다 — 예전에 "카테고리 필터" 값을 "대상 카테고리"라는 이름으로 보여주다 지적
                받은 것과 같은 종류의 거짓을 이 필드에서 반복하지 않는다. */}
            {summary.targetCategories.length > 0 && (
              <div className="flex items-start gap-2">
                <Tag className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                <div>
                  <dt className="text-muted-foreground">대상 카테고리</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {summary.targetCategories.map((category) => (
                      <Badge key={category} variant="secondary">
                        {PRESS_CATEGORY_LABELS[category]}
                      </Badge>
                    ))}
                  </dd>
                </div>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">수집 결과</dt>
              <dd>
                성공 {summary.successCount}건 ·{' '}
                <span
                  className={summary.failCount > 0 ? 'font-medium text-destructive' : undefined}
                >
                  실패 {summary.failCount}건
                </span>
                {/* 중단으로 요청조차 하지 않은 기사 수(I-023). "실패"라는 낱말을 쓰지 않고
                    text-destructive도 주지 않는다 — 오류가 아니다(D-029). 0건이면 렌더하지 않는다. */}
                {summary.skippedCount > 0 && <> · {summary.skippedCount}건 미수집</>}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">저장 경로</dt>
              <dd className="font-mono text-xs">{summary.storagePath}</dd>
            </div>
          </dl>

          {/* 실행 사실이 아니라 "지금 아래 기사 목록에 걸려 있는 필터"다 — 위 dl(실행 시각·대상
              언론사·대상 카테고리·수집 결과·저장 경로)과 같은 줄에 섞으면 "대상 카테고리"와
              혼동된다(21일차 팀장 지적). Separator로 물리적으로 떼고, 아이콘·설명 문구로
              "이건 실행 속성이 아니라 지금 내가 조작 중인 화면 상태다"를 명시한다. */}
          <Separator className="my-4" />
          <div className="flex items-start gap-2 text-sm">
            <Filter className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-muted-foreground">
                카테고리 필터 <span className="text-xs">(아래 기사 목록에 지금 적용된 값)</span>
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {categories.length === 0 ? (
                  <Badge variant="outline">전체</Badge>
                ) : (
                  categories.map((category) => (
                    <Badge key={category} variant="outline">
                      {PRESS_CATEGORY_LABELS[category]}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
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
