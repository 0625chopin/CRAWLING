import { Fragment } from 'react'

import { splitByMatch } from '@/lib/highlight'

export interface HighlightedTextProps {
  text: string
  /** 파일 목록 검색 Input의 현재 값. 비어 있으면(공백만 있어도) 원문을 그대로 렌더링한다. */
  query: string
}

/**
 * 검색어와 일치하는 구간을 `<mark>`로 감싸 그린다. `article-file-list.tsx`(제목 열)와
 * `article-preview.tsx`(제목·본문) 둘 다 이 컴포넌트를 쓴다 — 각자 문자열을 잘라 렌더링하면
 * 이스케이프·대소문자 처리가 두 곳에서 갈릴 여지가 생긴다.
 * `dangerouslySetInnerHTML`을 쓰지 않는다 — 기사 제목·본문은 외부 사이트에서 긁어온 문자열이라
 * 그대로 이어 붙이면 XSS 경로가 된다(팀장 판정, Task 029). `splitByMatch`가 배열로 쪼갠 것을
 * React 노드로만 옮긴다.
 */
export function HighlightedText({ text, query }: HighlightedTextProps) {
  const segments = splitByMatch(text, query)

  return (
    <>
      {segments.map((segment, index) =>
        segment.matched ? (
          <mark key={index} className="bg-highlight text-highlight-foreground rounded-sm">
            {segment.text}
          </mark>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        )
      )}
    </>
  )
}
