import 'server-only'

/**
 * 기본 불용어 프리셋 7건 — PRD 명시 6건(기자·사진·제공·앵커·무단전재·재배포금지) +
 * kiwi-verification.md §6 실측으로 추가된 '이번'(시간·지시 명사라 NNG로 잡히지만
 * 키워드로서 의미가 없다는 것이 실측으로 확인됨). 텍스트만 여기서 관리하고,
 * id(sw-0001…) 부여는 stopword-repository의 시드 로직이 담당한다.
 */
export const DEFAULT_STOPWORDS: readonly string[] = [
  '기자',
  '사진',
  '제공',
  '앵커',
  '무단전재',
  '재배포금지',
  '이번',
]
