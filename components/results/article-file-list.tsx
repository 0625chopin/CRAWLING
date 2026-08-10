'use client'

import { Search } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface ArticleFileListProps {
  /**
   * 018B가 `fetchRunArticles(runId, query)`(lib/api/run-client.ts, 018A가 이미 준비)로 실제
   * 목록을 불러올 때 쓸 값. 정적 뼈대인 지금은 데이터를 바꿔 끼우지 않고 표시만 한다.
   */
  runId: string
  /**
   * 선택된 기사 id. 018B가 행 클릭·키보드 선택을 만들기 전까지는 항상 null이다 — 018A는 이
   * 값을 렌더링에 쓰지 않고(보여줄 실제 행이 없다) 채널만 열어 둔다(D-006, 016A/016B의
   * onReset과 같은 계약 방식).
   */
  selectedArticleId: string | null
  /** 018B가 행 클릭·키보드 선택에 연결할 콜백. */
  onSelectArticleId: (articleId: string) => void
}

/**
 * ④ 기사 파일 목록 — 018A가 만든 정적 뼈대(D-011). 실제 기사 데이터는 018B가
 * `fetchRunArticles(runId, query)`로 불러와 채운다. **가짜 기사를 그리지 않는다** — 교차검증
 * 지적(11일차, 저장소 계층) 반영: 이전에는 언론사·제목이 실제로 존재하지 않는 더미 3건을
 * `runId`와 무관하게 그려 사용자가 실제 저장 결과와 구분할 수 없었다. 지금은 헤더·검색
 * `Input`·`ScrollArea`·표/카드 뼈대(마크업)만 유지하고 행은 0개다 — "아직 못 불러왔다"를
 * 지어낸 데이터 대신 빈 목록으로 정직하게 표현한다.
 */
export function ArticleFileList({ runId }: ArticleFileListProps) {
  return (
    <Card data-run-id={runId}>
      <CardHeader>
        {/* TODO(018B): fetchRunArticles 결과 개수로 "기사 파일 (N)"을 채운다. */}
        <CardTitle className="text-sm">기사 파일</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Label htmlFor="article-search" className="sr-only">
            파일명 또는 제목으로 검색
          </Label>
          {/* TODO(018B): 입력값으로 fetchRunArticles(runId, query)를 다시 불러 목록을 필터링한다. */}
          <Input id="article-search" placeholder="파일명 · 제목 검색" className="pl-8" />
        </div>

        {/* 데스크톱: 표 뼈대(lg 이상). TODO(018B): TableBody에 실제 행을 채우고 onSelectArticleId를
            onClick/onKeyDown에 연결한다 — 선택 행은 aria-selected="true" + bg-muted. */}
        <ScrollArea className="hidden max-h-[28rem] lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>파일명</TableHead>
                <TableHead>언론사</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>수집 시각</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody />
          </Table>
        </ScrollArea>

        {/* 모바일: 카드 리스트 뼈대(lg 미만). TODO(018B): li/button을 채우고 role="option"
            aria-selected를 실제 선택 상태에 연결한다. */}
        <ScrollArea className="max-h-[28rem] lg:hidden">
          <ul role="listbox" aria-label="수집된 기사 파일 목록" className="space-y-2" />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
