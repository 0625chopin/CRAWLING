'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Globe, Rss } from 'lucide-react'
import { toast } from 'sonner'

import { SourceTestButton, SourceTestResult, useSourceTest } from '@/components/press/source-test-panel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  ApiRequestError,
  createPress,
  updatePress,
  type PressSourceWithUrl,
} from '@/lib/api/press-client'
import type { PressCreateInput } from '@/lib/types/press'

type SourceType = 'rss' | 'html'

export interface PressFormDialogProps {
  mode: 'create' | 'edit'
  /** mode="edit"일 때만 쓰인다. */
  press?: PressSourceWithUrl
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 저장 성공 후 부모(app/press/page.tsx) 목록 상태를 갱신하도록 알린다. */
  onSaved: (press: PressSourceWithUrl) => void
}

const SOURCE_TYPE_DESCRIPTION: Record<SourceType, string> = {
  rss: 'RSS를 제공하는 매체는 피드가 기사 목록을 정확히 주므로 셀렉터를 맞출 필요가 없습니다.',
  html: 'RSS를 제공하지 않는 매체는 목록 페이지를 파싱합니다.',
}

/**
 * 언론사 추가/수정 공용 다이얼로그(docs/screens/04-press-manage.md §설계 결정 근거 2).
 *
 * press-table·press-card-list(009A)는 수정/삭제 버튼을 눌러도 다이얼로그를 직접 열지 않고
 * 요청 콜백만 부모에 알린다(그 파일들의 주석 참고). 그래서 이 다이얼로그는 행마다 별도
 * DialogTrigger를 두는 대신 항상 부모(app/press/page.tsx)가 들고 있는 open 상태로 제어된다 —
 * 행마다 트리거를 두면 같은 id(`press-name` 등)를 가진 입력이 여러 벌 동시에 DOM에 남는다.
 *
 * **입력 상태는 press/mode를 초기값으로 삼는 useState뿐**이고, "열릴 때마다 다시 채우는"
 * effect를 두지 않는다 — 대신 app/press/page.tsx가 다이얼로그를 열 때마다 이 컴포넌트에
 * 새 `key`를 준다(추가/수정 요청마다 증가하는 카운터). React가 그 key로 컴포넌트를 통째로
 * 다시 마운트하므로 모든 useState가 props로부터 새로 초기화된다 — "props가 바뀌면 상태를
 * 초기화한다"는 사실상 훅 하나로 없앨 수 있는 문제라 effect로 흉내 내지 않는다
 * (React 문서 "You Might Not Need an Effect" §Resetting state with a key).
 *
 * 소스 테스트(피드 테스트·셀렉터 테스트) 버튼은 이 회차(009B)의 파일 목록에 없다.
 * `docs/screens/04-press-manage.md` §5는 그 UI를 `source-test-panel.tsx`(Task 010B)로
 * 명시했으므로, 아직 없는 그 컴포넌트를 흉내 낸 동작 없는 버튼을 넣지 않는다.
 */
export function PressFormDialog({
  mode,
  press,
  open,
  onOpenChange,
  onSaved,
}: PressFormDialogProps) {
  const isEdit = mode === 'edit'
  const isEditingHtml = isEdit && press?.sourceType === 'html'

  const [sourceType, setSourceType] = useState<SourceType>(press?.sourceType ?? 'rss')
  const [name, setName] = useState(press?.name ?? '')
  const [feedUrl, setFeedUrl] = useState(press?.sourceType === 'rss' ? press.feedUrl : '')
  const [collectFullContent, setCollectFullContent] = useState(
    press?.sourceType === 'rss' && Boolean(press.contentSelector)
  )
  const [rssContentSelector, setRssContentSelector] = useState(
    press?.sourceType === 'rss' ? (press.contentSelector ?? '') : ''
  )
  const [listUrl, setListUrl] = useState(isEditingHtml && press ? press.listUrl : '')
  const [articleLinkSelector, setArticleLinkSelector] = useState(
    isEditingHtml && press ? press.articleLinkSelector : ''
  )
  const [titleSelector, setTitleSelector] = useState(
    isEditingHtml && press ? press.titleSelector : ''
  )
  const [htmlContentSelector, setHtmlContentSelector] = useState(
    isEditingHtml && press ? press.contentSelector : ''
  )
  const [isActive, setIsActive] = useState(press?.isActive ?? true)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // 소스 테스트(Task 010B)는 저장하지 않은 현재 입력값을 그대로 검증 대상으로 쓴다 —
  // 방식당 하나뿐이라 반대쪽 방식의 훅 결과는 렌더링하지 않는다.
  const feedTest = useSourceTest({ sourceType: 'rss', feedUrl })
  const selectorTest = useSourceTest({ sourceType: 'html', listUrl, articleLinkSelector })

  const feedUrlRef = useRef<HTMLInputElement>(null)
  const listUrlRef = useRef<HTMLInputElement>(null)
  // 마운트 직후 첫 실행은 건너뛴다 — 이 컴포넌트는 다이얼로그가 열릴 때마다 새 key로 다시
  // 마운트되므로(위 주석 참고) 그 첫 렌더는 "값을 채우는 것"이지 "사용자가 방식을 전환한
  // 것"이 아니다. Radix가 이미 첫 포커스 가능 요소(방식 토글)로 옮겨 두었으므로 여기서 또
  // 가로채면 안 된다.
  const isInitialRenderRef = useRef(true)

  // 수집 방식이 바뀐 뒤 새 블록의 첫 입력으로 포커스를 옮긴다. 시각적으로는 명백한 변화지만
  // 스크린리더에는 조용한 변화라 명시적으로 처리해야 한다(ROADMAP Task 009 구현 규칙).
  useEffect(() => {
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false
      return
    }
    if (sourceType === 'rss') {
      feedUrlRef.current?.focus()
    } else {
      listUrlRef.current?.focus()
    }
  }, [sourceType])

  function handleSourceTypeChange(next: string) {
    if (!next || next === sourceType) return
    setSourceType(next as SourceType)
    // 반대쪽 방식에서 남아 있던 검증 오류 표시를 지운다(ROADMAP Task 009 구현 규칙).
    setFieldErrors({})
  }

  function validateClientSide(): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = '언론사명을 입력하세요'

    if (sourceType === 'rss') {
      if (!feedUrl.trim()) errors.feedUrl = '피드 URL을 입력하세요'
      // "본문 전문 수집"을 켠 상태에서 셀렉터가 비면 저장을 막는다(ROADMAP Task 009 구현 규칙).
      if (collectFullContent && !rssContentSelector.trim()) {
        errors.contentSelector = '본문 전문 수집을 켜면 본문 셀렉터가 필요합니다'
      }
    } else {
      if (!listUrl.trim()) errors.listUrl = '목록 URL을 입력하세요'
      if (!articleLinkSelector.trim()) {
        errors.articleLinkSelector = '기사 링크 셀렉터를 입력하세요'
      }
      if (!titleSelector.trim()) errors.titleSelector = '제목 셀렉터를 입력하세요'
      if (!htmlContentSelector.trim()) errors.contentSelector = '본문 셀렉터를 입력하세요'
    }

    return errors
  }

  function buildPayload(): PressCreateInput {
    if (sourceType === 'rss') {
      return {
        name: name.trim(),
        isActive,
        sourceType: 'rss',
        feedUrl: feedUrl.trim(),
        ...(collectFullContent ? { contentSelector: rssContentSelector.trim() } : {}),
      }
    }
    return {
      name: name.trim(),
      isActive,
      sourceType: 'html',
      listUrl: listUrl.trim(),
      articleLinkSelector: articleLinkSelector.trim(),
      titleSelector: titleSelector.trim(),
      contentSelector: htmlContentSelector.trim(),
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const clientErrors = validateClientSide()
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors)
      return
    }

    const payload = buildPayload()
    setIsSaving(true)
    try {
      const saved =
        isEdit && press ? await updatePress(press.id, payload) : await createPress(payload)
      onSaved(saved)
      toast.success(isEdit ? '언론사 정보를 수정했습니다' : '언론사를 추가했습니다')
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiRequestError && error.fieldErrors) {
        setFieldErrors(error.fieldErrors)
      }
      toast.error(error instanceof Error ? error.message : '언론사 저장에 실패했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  const isRss = sourceType === 'rss'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '언론사 수정' : '언론사 추가'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'ID와 이름은 크롤링 체크박스 목록과 저장된 기사에서 언론사를 식별하는 데 사용됩니다.'
              : '새 언론사를 등록하면 코드 수정 없이 크롤링 실행 페이지 체크박스 목록에 즉시 추가됩니다.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isEdit && press ? (
            <p className="text-xs text-muted-foreground">
              ID: <span className="font-mono">{press.id}</span> (자동 생성 · 변경 불가)
            </p>
          ) : null}

          {/* 수집 방식 — 폼의 첫 번째 입력. 이 값이 아래 필드 블록을 통째로 결정한다 */}
          <div className="space-y-1.5">
            <Label htmlFor="press-source-type">수집 방식 *</Label>
            <ToggleGroup
              id="press-source-type"
              type="single"
              value={sourceType}
              aria-label="수집 방식"
              className="grid w-full grid-cols-2"
              onValueChange={handleSourceTypeChange}
            >
              <ToggleGroupItem value="rss" aria-label="RSS 피드">
                <Rss className="size-4" aria-hidden="true" />
                RSS 피드
              </ToggleGroupItem>
              <ToggleGroupItem value="html" aria-label="목록 페이지">
                <Globe className="size-4" aria-hidden="true" />
                목록 페이지
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              {SOURCE_TYPE_DESCRIPTION[sourceType]}
            </p>
            {isEdit ? (
              <p className="text-xs text-muted-foreground">
                ⚠ 방식을 바꾸면 반대쪽 방식의 설정은 저장되지 않습니다.
              </p>
            ) : null}
          </div>

          {/* 이름 — 방식과 무관하게 같은 자리를 지킨다 */}
          <div className="space-y-1.5">
            <Label htmlFor="press-name">이름 *</Label>
            <Input
              id="press-name"
              name="name"
              placeholder="예: 전자신문"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={
                fieldErrors.name ? 'press-name-desc press-name-error' : 'press-name-desc'
              }
            />
            <p id="press-name-desc" className="text-xs text-muted-foreground">
              언론사 목록과 크롤링 체크박스에 표시될 이름입니다.
            </p>
            {fieldErrors.name ? (
              <p id="press-name-error" className="text-xs text-destructive">
                ⚠ {fieldErrors.name}
              </p>
            ) : null}
          </div>

          {isRss ? (
            <div role="group" aria-label="RSS 수집 설정" className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="press-feed-url">피드 URL *</Label>
                  <SourceTestButton
                    sourceType="rss"
                    ready={feedTest.ready}
                    loading={feedTest.state.phase === 'loading'}
                    onTest={feedTest.run}
                  />
                </div>
                <Input
                  id="press-feed-url"
                  name="feedUrl"
                  ref={feedUrlRef}
                  className="font-mono"
                  placeholder="https://rss.etnews.com/Section901.xml"
                  value={feedUrl}
                  onChange={(event) => setFeedUrl(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.feedUrl)}
                  aria-describedby={
                    fieldErrors.feedUrl
                      ? 'press-feed-url-desc press-feed-url-error'
                      : 'press-feed-url-desc'
                  }
                />
                <p id="press-feed-url-desc" className="text-xs text-muted-foreground">
                  RSS 2.0 또는 Atom 피드 주소입니다.
                </p>
                {fieldErrors.feedUrl ? (
                  <p id="press-feed-url-error" className="text-xs text-destructive">
                    ⚠ {fieldErrors.feedUrl}
                  </p>
                ) : null}
                <SourceTestResult sourceType="rss" state={feedTest.state} />
              </div>

              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <Switch
                    id="press-full-content"
                    checked={collectFullContent}
                    aria-controls="press-content-selector-block"
                    aria-expanded={collectFullContent}
                    aria-describedby="press-full-content-desc"
                    onCheckedChange={(checked) => setCollectFullContent(checked)}
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="press-full-content">본문 전문 수집</Label>
                    <p
                      id="press-full-content-desc"
                      className="text-xs text-muted-foreground"
                    >
                      끄면 피드의 요약(description)만 저장합니다. 켜면 각 기사 원문 페이지를
                      열어 본문을 가져옵니다 — 정확하지만 느립니다.
                    </p>
                  </div>
                </div>

                {collectFullContent ? (
                  <div id="press-content-selector-block" className="space-y-1.5">
                    <Label htmlFor="press-content-selector">본문 셀렉터 *</Label>
                    <Textarea
                      id="press-content-selector"
                      name="contentSelector"
                      className="font-mono"
                      rows={2}
                      placeholder="#articleBody"
                      value={rssContentSelector}
                      onChange={(event) => setRssContentSelector(event.target.value)}
                      aria-invalid={Boolean(fieldErrors.contentSelector)}
                      aria-describedby={
                        fieldErrors.contentSelector
                          ? 'press-content-selector-desc press-content-selector-error'
                          : 'press-content-selector-desc'
                      }
                    />
                    <p
                      id="press-content-selector-desc"
                      className="text-xs text-muted-foreground"
                    >
                      후보를 콤마로 여러 개 적을 수 있습니다.
                    </p>
                    {fieldErrors.contentSelector ? (
                      <p id="press-content-selector-error" className="text-xs text-destructive">
                        ⚠ {fieldErrors.contentSelector}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div role="group" aria-label="목록 페이지 수집 설정" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="press-list-url">목록 URL *</Label>
                <Input
                  id="press-list-url"
                  name="listUrl"
                  ref={listUrlRef}
                  className="font-mono"
                  placeholder="https://it.chosun.com/news/it"
                  value={listUrl}
                  onChange={(event) => setListUrl(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.listUrl)}
                  aria-describedby={
                    fieldErrors.listUrl
                      ? 'press-list-url-desc press-list-url-error'
                      : 'press-list-url-desc'
                  }
                />
                <p id="press-list-url-desc" className="text-xs text-muted-foreground">
                  기사 링크를 수집할 목록 페이지 URL입니다.
                </p>
                {fieldErrors.listUrl ? (
                  <p id="press-list-url-error" className="text-xs text-destructive">
                    ⚠ {fieldErrors.listUrl}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="press-link-selector">기사 링크 셀렉터 *</Label>
                  <SourceTestButton
                    sourceType="html"
                    ready={selectorTest.ready}
                    loading={selectorTest.state.phase === 'loading'}
                    onTest={selectorTest.run}
                  />
                </div>
                <Input
                  id="press-link-selector"
                  name="articleLinkSelector"
                  className="font-mono"
                  placeholder=".article-list a.tit"
                  value={articleLinkSelector}
                  onChange={(event) => setArticleLinkSelector(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.articleLinkSelector)}
                  aria-describedby={
                    fieldErrors.articleLinkSelector
                      ? 'press-link-selector-desc press-link-selector-error'
                      : 'press-link-selector-desc'
                  }
                />
                <p id="press-link-selector-desc" className="text-xs text-muted-foreground">
                  목록 페이지에서 개별 기사 링크(&lt;a href&gt;)를 가리키는 CSS 셀렉터입니다.
                </p>
                {fieldErrors.articleLinkSelector ? (
                  <p id="press-link-selector-error" className="text-xs text-destructive">
                    ⚠ {fieldErrors.articleLinkSelector}
                  </p>
                ) : null}
                <SourceTestResult sourceType="html" state={selectorTest.state} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="press-title-selector">제목 셀렉터 *</Label>
                <Input
                  id="press-title-selector"
                  name="titleSelector"
                  className="font-mono"
                  placeholder="h1.article-title"
                  value={titleSelector}
                  onChange={(event) => setTitleSelector(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.titleSelector)}
                  aria-describedby={
                    fieldErrors.titleSelector
                      ? 'press-title-selector-desc press-title-selector-error'
                      : 'press-title-selector-desc'
                  }
                />
                <p id="press-title-selector-desc" className="text-xs text-muted-foreground">
                  기사 상세 페이지에서 제목 텍스트를 담은 요소의 CSS 셀렉터입니다.
                </p>
                {fieldErrors.titleSelector ? (
                  <p id="press-title-selector-error" className="text-xs text-destructive">
                    ⚠ {fieldErrors.titleSelector}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="press-content-selector-html">본문 셀렉터 *</Label>
                <Textarea
                  id="press-content-selector-html"
                  name="contentSelector"
                  className="font-mono"
                  rows={2}
                  placeholder="#article-view-content-div"
                  value={htmlContentSelector}
                  onChange={(event) => setHtmlContentSelector(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.contentSelector)}
                  aria-describedby={
                    fieldErrors.contentSelector
                      ? 'press-content-selector-html-desc press-content-selector-html-error'
                      : 'press-content-selector-html-desc'
                  }
                />
                <p
                  id="press-content-selector-html-desc"
                  className="text-xs text-muted-foreground"
                >
                  기사 상세 페이지에서 본문 텍스트를 담은 요소의 CSS 셀렉터입니다. 후보를
                  콤마로 여러 개 적을 수 있습니다.
                </p>
                {fieldErrors.contentSelector ? (
                  <p id="press-content-selector-html-error" className="text-xs text-destructive">
                    ⚠ {fieldErrors.contentSelector}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-md border p-3">
            <Switch
              id="press-active"
              name="isActive"
              checked={isActive}
              aria-describedby="press-active-desc"
              onCheckedChange={(checked) => setIsActive(checked)}
            />
            <div className="space-y-0.5">
              <Label htmlFor="press-active">
                {isEdit ? '활성 상태' : '등록 즉시 활성화'}
              </Label>
              <p id="press-active-desc" className="text-xs text-muted-foreground">
                활성 언론사만 크롤링 실행 페이지의 체크박스 목록에 표시됩니다.
              </p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                취소
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              저장
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
