import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { KeywordCount } from '@/lib/types/keyword'

export interface TopKeywordCardsProps {
  /** 상위 5개(페이지가 이미 정렬·슬라이스해서 넘긴다). rank·ratio는 이 컴포넌트가 계산한다
   *  (D-037 — API가 rank·ratio를 채우지 않는다, ratio 분모는 items[0].count). */
  items: KeywordCount[]
}

// 순위별 강조선 — 1위(진함) → 5위(옅음). --chart-*는 라이트/다크가 같은 고정값이라 다크에서
// 카드 배경(--card)과 명도차가 0.064밖에 나지 않아 순위 인코딩이 뒤집힌다(docs/screens/03-hot-keyword.md
// §설계 결정과 근거). --primary는 모드에 따라 값이 뒤집히므로 두 모드 모두에서 순서가 유지된다.
const TOP_RANK_ACCENT_CLASS: Record<number, string> = {
  1: 'border-t-primary',
  2: 'border-t-primary/70',
  3: 'border-t-primary/50',
  4: 'border-t-primary/35',
  5: 'border-t-primary/20',
}

// 순위별 폰트 크기 — 1위(크게) → 5위(작게). 색과 별개의 두 번째 채널이라 색맹 사용자도 순위를
// 구분할 수 있다(WCAG 1.4.1 — 색만으로 정보 전달 금지).
const TOP_RANK_TEXT_CLASS: Record<number, string> = {
  1: 'text-2xl',
  2: 'text-xl',
  3: 'text-xl',
  4: 'text-lg',
  5: 'text-lg',
}

/**
 * ③ Top 5 핫 키워드 강조 카드(docs/screens/03-hot-keyword.md §③). 랭킹 표를 읽기 전에 1~5위를
 * 한눈에 보여준다. rank는 배열 순서(index + 1)로 계산한다(D-037 — items는 이미 정렬·슬라이스돼
 * 넘어온다). ratio는 이 카드에서는 화면에 쓰지 않지만 D-037이 못 박은 분모(items[0].count)를
 * 그대로 지켜 랭킹 표·카드 리스트와 계산 방식을 통일한다.
 */
export function TopKeywordCards({ items }: TopKeywordCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item, index) => {
        const rank = index + 1
        return (
          <Card
            key={item.keyword}
            className={`border-t-4 ${TOP_RANK_ACCENT_CLASS[rank] ?? 'border-t-primary/20'} text-center`}
          >
            <CardContent className="flex flex-col items-center gap-1.5 pt-2">
              <span className="text-xs font-medium text-muted-foreground">{rank}위</span>
              <span className={`${TOP_RANK_TEXT_CLASS[rank] ?? 'text-lg'} font-semibold`}>
                {item.keyword}
              </span>
              <Badge variant="outline">{item.posTag}</Badge>
              <span className="text-sm tabular-nums text-muted-foreground">{item.count}회</span>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
