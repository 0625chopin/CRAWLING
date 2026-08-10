import { FileText } from 'lucide-react'

import { EmptyState } from '@/components/common/empty-state'

export interface ArticlePreviewProps {
  /** 018B가 `fetchArticleDetail(runId, articleId)`(lib/api/run-client.ts)를 부를 때 쓸 값. */
  runId: string | null
  /** 선택된 기사 id. article-file-list.tsx가 아직 선택 UI를 만들지 않아 항상 null이다. */
  articleId: string | null
}

/**
 * ⑤ 본문 미리보기 — 018A가 만든 정적 뼈대(D-011). `runId`·`articleId` 채널은 app/results/page.tsx가
 * 이미 내려주지만(11일차 교차검증 반영 — 이전에는 이 프롭 자체가 없어 018B가 page.tsx를 다시 열어야
 * 했다, D-006 저촉), article-file-list.tsx에 실제 선택 UI가 없어 `articleId`는 항상 null로
 * 들어온다. 그래서 이 컴포넌트는 지금 "파일 선택 전" 상태(설계서 §상태별 화면 ③)만 그린다 —
 * 지어낸 로직이 아니라 선택 상태 자체가 아직 없다는 사실을 그대로 반영한 것이다.
 *
 * TODO(018B): `articleId`가 있으면 `fetchArticleDetail(runId, articleId)`로 본문을 불러오고,
 * 선택 여부에 따라 이 "파일 미선택" 상태와 제목·원문 링크·메타(언론사/본문 출처 배지)·
 * `whitespace-pre-wrap font-mono` 본문 `ScrollArea`를 가진 상세 상태(설계서 §상태별 화면 ①)를
 * 분기해 그린다. 삭제된 언론사는 여기서도 "삭제된 언론사" 고정 문구를 쓴다(D-027).
 */
export function ArticlePreview({ runId, articleId }: ArticlePreviewProps) {
  return (
    // Empty 프리미티브가 flex-1로 부모를 채우므로, 목록(h-[28rem])과 높이를 맞추기 위해
    // 바깥 래퍼에서 높이를 준다(docs/screens/02-collect-result.md §상태별 화면 ③).
    <div
      className="flex h-[28rem]"
      data-run-id={runId ?? undefined}
      data-selected-article-id={articleId ?? undefined}
    >
      <EmptyState
        icon={<FileText />}
        title="파일을 선택하면 본문을 미리 볼 수 있습니다"
        description="왼쪽 기사 파일 목록에서 확인할 기사를 고르세요"
      />
    </div>
  )
}
