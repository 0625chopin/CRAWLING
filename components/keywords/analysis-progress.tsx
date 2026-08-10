import { CircleCheckBig, CircleDashed, LoaderCircle } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

export interface AnalysisProgressProps {
  /** 분석 대상 기사 수(선택된 run의 성공 수집 건수) — 진행 문구에만 쓴다. */
  articleCount: number
}

/**
 * ⑥ 분석 진행 상태(docs/screens/03-hot-keyword.md §⑥, §설계 결정과 근거 "분석 진행 표시").
 *
 * 진행률을 퍼센트로 계산할 수 없는 단계(Kiwi 모델 로딩)가 섞여 있어 확정값 없는 부정형
 * 표시가 맞다. `components/ui/progress.tsx`의 `Progress`는 `value`가 없으면
 * `translateX(-100%)`로 트랙 밖에 밀려 보이지 않으므로(25행) 쓰지 않는다 — 대신
 * `aria-hidden`인 장식용 트랙을 직접 그린다. 실제 진행 정보는 3단계 체크리스트 텍스트가
 * 전달하고, 전체를 `role="status" aria-live="polite"`로 감싼다.
 *
 * 이 요청은 하나의 fetch 안에서 끝나 서버가 단계별 진행률을 알려주지 않는다. 그래서 이
 * 컴포넌트는 실시간으로 단계를 갱신하지 않고, fetch가 떠 있는 동안 "① 완료 → ② 진행 중 →
 * ③ 대기"라는 고정된 스냅샷 하나를 보여준다 — 화면 설계서의 상태 ② 와이어프레임과 같다.
 */
export function AnalysisProgress({ articleCount }: AnalysisProgressProps) {
  return (
    <Card role="status" aria-live="polite">
      <CardContent className="space-y-4 py-6">
        <div className="flex items-center gap-2">
          <LoaderCircle className="animate-spin text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">{articleCount}건의 기사를 분석하고 있습니다…</p>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2 text-muted-foreground">
            <CircleCheckBig className="size-4" aria-hidden="true" />
            {/* 모델 로딩은 서버(Node.js 프로세스)가 fs로 읽어 build()하는 시간(약 1.4초, 싱글턴이라
                프로세스당 최초 1회)이다. 브라우저가 105MB를 내려받는 것이 아니므로 다운로드
                진행률로 읽히는 문구를 쓰지 않는다(docs/screens/03-hot-keyword.md 참고). */}
            Kiwi 형태소 분석 모델 로딩 완료
          </li>
          <li className="flex items-center gap-2 font-medium">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            형태소 토큰화 진행 중 (조사·어미·접미사 제거)
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <CircleDashed className="size-4" aria-hidden="true" />
            불용어 필터링 및 빈도 집계 대기
          </li>
        </ul>
      </CardContent>
    </Card>
  )
}
