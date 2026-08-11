'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

import type { PressSourceWithUrl } from '@/lib/api/press-client'
import type { KeywordsResult } from '@/lib/api/keyword-client'
import type { RunListItem, RunSummary } from '@/lib/api/run-client'
import type { PosTag } from '@/lib/types/keyword'
import type { PressCategory } from '@/lib/types/press'
import type { Stopword } from '@/lib/types/stopword'

/**
 * 탭(라우트) 하나의 상태를 담는 컨텍스트 하나를 만든다. 상단 탭 5개가 각자 라우트라서 탭을
 * 옮기면 페이지가 통째로 언마운트되던 문제(Task 031)를, 라우트 전환에도 언마운트되지 않는
 * `app/layout.tsx` 위치에 이 컨텍스트들을 두어 해결한다.
 *
 * 탭마다 별도 컨텍스트로 쪼갠 이유: 컨텍스트 value를 5개 탭 공용 객체 하나로 합치면 한 탭의
 * 입력 한 글자가 나머지 네 탭의 컨슈머까지 리렌더시킨다(구현 규칙 경고 ②). 탭별로 나누면 한
 * 탭의 상태 변경이 그 탭을 그리는 페이지 자신만 리렌더시킨다 — 다른 4개 탭은 애초에 이
 * 컨텍스트를 구독하지 않으므로 영향이 없다.
 */
function createTabStore<T extends object>(initialState: T) {
  interface TabContextValue {
    state: T
    setState: Dispatch<SetStateAction<T>>
  }

  const Context = createContext<TabContextValue | null>(null)

  function Provider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<T>(initialState)
    // setState는 useState가 항상 안정된 참조로 주므로, state가 실제로 바뀔 때만 value 참조가
    // 바뀐다 — 매 렌더 새 객체를 만들지 않는다(구현 규칙 경고 ②).
    const value = useMemo<TabContextValue>(() => ({ state, setState }), [state, setState])
    return <Context.Provider value={value}>{children}</Context.Provider>
  }

  function useTabState(): TabContextValue {
    const ctx = useContext(Context)
    if (!ctx) {
      throw new Error('AppStateProvider 내부에서만 쓸 수 있는 훅입니다')
    }
    return ctx
  }

  /**
   * 이 탭 상태의 필드 하나를 `useState`와 같은 `[값, setter]` 튜플로 노출한다. 페이지 쪽에서
   * `useState(...)`를 이 훅 호출 한 줄로만 바꾸면 되도록 만든 어댑터다(구현 규칙 "상태 선언부와
   * 조회 이펙트의 조건만 바뀐다"). 렌더 도중 다른 값이 바뀌었다고 이 필드를 되돌리는 화면
   * (예: /results, /keywords의 run 전환 리셋)에는 쓰지 않는다 — 그 리셋은 렌더 중에 이
   * 컨텍스트(다른 컴포넌트 소유)의 state를 갱신하게 되어 "Cannot update a component while
   * rendering a different component" 콘솔 경고를 일으킨다. 그런 화면은 로컬 state를 유지하고
   * 마운트 시 초깃값만 이 컨텍스트에서 읽어온다(각 페이지 주석 참고).
   */
  function useTabField<K extends keyof T>(key: K): [T[K], Dispatch<SetStateAction<T[K]>>] {
    const { state, setState } = useTabState()
    const setField = useCallback<Dispatch<SetStateAction<T[K]>>>(
      (value) => {
        setState((prev) => ({
          ...prev,
          [key]:
            typeof value === 'function'
              ? (value as (prevValue: T[K]) => T[K])(prev[key])
              : value,
        }))
      },
      [setState, key]
    )
    return [state[key], setField]
  }

  return { Provider, useTabState, useTabField }
}

// ────────────────────────────────────────────────────────────────────────
// 크롤링 실행(`/`)
// ────────────────────────────────────────────────────────────────────────

export interface CrawlTabState {
  /** 최근 조회한 활성 언론사 목록 스냅샷. null이면 이 세션에서 아직 한 번도 못 받아왔다. */
  pressList: PressSourceWithUrl[] | null
  selectedIds: Set<string>
  maxArticlesPerPress: string
  /** 실행 중인 크롤의 id. null이면 idle. 서버 잡 레지스트리(globalThis)가 실제 진행을 쥐고
   *  있으므로 이 값만 살아 있으면 탭을 다녀와도 진행률 폴링이 다시 붙는다. */
  runId: string | null
}

const CRAWL_TAB_DEFAULT: CrawlTabState = {
  pressList: null,
  selectedIds: new Set(),
  maxArticlesPerPress: '20',
  runId: null,
}

const crawlTabStore = createTabStore(CRAWL_TAB_DEFAULT)
export const useCrawlTabField = crawlTabStore.useTabField

// ────────────────────────────────────────────────────────────────────────
// 수집 결과(`/results`)
// ────────────────────────────────────────────────────────────────────────

export interface ResultsTabState {
  runs: RunListItem[] | null
  selectedRunId: string | null
  selectedArticleId: string | null
  categories: PressCategory[]
  query: string
  summary: RunSummary | null
}

const RESULTS_TAB_DEFAULT: ResultsTabState = {
  runs: null,
  selectedRunId: null,
  selectedArticleId: null,
  categories: [],
  query: '',
  summary: null,
}

const resultsTabStore = createTabStore(RESULTS_TAB_DEFAULT)
export const useResultsTabField = resultsTabStore.useTabField
/** run 전환 리셋 블록이 쓰는 원시 접근자 — 위 useTabField의 "쓰지 않는" 예외 케이스. */
export const useResultsTabStateRaw = resultsTabStore.useTabState

// ────────────────────────────────────────────────────────────────────────
// 핫 키워드 분석(`/keywords`)
// ────────────────────────────────────────────────────────────────────────

export interface KeywordsTabState {
  runs: RunListItem[] | null
  selectedRunId: string | null
  minCount: number
  posFilter: PosTag[]
  topN: number
  categories: PressCategory[]
  analysisStatus: 'idle' | 'loading' | 'success' | 'error'
  result: KeywordsResult | null
}

/** 분석 조건 바의 "필터 초기화"가 되돌리는 기본값이자, 이 탭의 초기 상태이기도 하다. */
export const KEYWORDS_FILTER_DEFAULTS = {
  minCount: 1,
  posFilter: ['NNG', 'NNP', 'SL'] as PosTag[],
  topN: 50,
}

const KEYWORDS_TAB_DEFAULT: KeywordsTabState = {
  runs: null,
  selectedRunId: null,
  minCount: KEYWORDS_FILTER_DEFAULTS.minCount,
  posFilter: KEYWORDS_FILTER_DEFAULTS.posFilter,
  topN: KEYWORDS_FILTER_DEFAULTS.topN,
  categories: [],
  analysisStatus: 'idle',
  result: null,
}

const keywordsTabStore = createTabStore(KEYWORDS_TAB_DEFAULT)
export const useKeywordsTabField = keywordsTabStore.useTabField
export const useKeywordsTabStateRaw = keywordsTabStore.useTabState

// ────────────────────────────────────────────────────────────────────────
// 언론사 관리(`/press`)
// ────────────────────────────────────────────────────────────────────────

export interface PressTabState {
  pressList: PressSourceWithUrl[] | null
  categories: PressCategory[]
}

const PRESS_TAB_DEFAULT: PressTabState = {
  pressList: null,
  categories: [],
}

const pressTabStore = createTabStore(PRESS_TAB_DEFAULT)
export const usePressTabField = pressTabStore.useTabField

// ────────────────────────────────────────────────────────────────────────
// 불용어 관리(`/stopwords`)
// ────────────────────────────────────────────────────────────────────────

export interface StopwordsTabState {
  stopwords: Stopword[] | null
  query: string
}

const STOPWORDS_TAB_DEFAULT: StopwordsTabState = {
  stopwords: null,
  query: '',
}

const stopwordsTabStore = createTabStore(STOPWORDS_TAB_DEFAULT)
export const useStopwordsTabField = stopwordsTabStore.useTabField

// ────────────────────────────────────────────────────────────────────────

/**
 * `app/layout.tsx`의 `ThemeProvider` **안쪽**, `{children}`을 감싸는 위치에서만 쓴다. 루트
 * 레이아웃은 라우트가 바뀌어도 다시 마운트되지 않으므로, 여기 올린 5개 탭 상태만 탭 전환에도
 * 살아남는다(Task 031 구현 규칙).
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  return (
    <crawlTabStore.Provider>
      <resultsTabStore.Provider>
        <keywordsTabStore.Provider>
          <pressTabStore.Provider>
            <stopwordsTabStore.Provider>{children}</stopwordsTabStore.Provider>
          </pressTabStore.Provider>
        </keywordsTabStore.Provider>
      </resultsTabStore.Provider>
    </crawlTabStore.Provider>
  )
}
