/**
 * 회귀 확인용 고정 문장 세트. extract.test.ts(020A)와, 이후 이어질 aggregate.test.ts(020B)가
 * 같은 입력을 공유해 "서로 다른 문장으로 같은 현상을 확인하다 결과가 어긋나는" 상황을 막는다.
 * 각 문장의 실제 Kiwi 분석 결과(MATCH_OPTIONS = joinNounPrefix|joinNounSuffix 기준)는 개발 중
 * 로컬 모델로 직접 확인했다 — 아래 주석의 형태소열이 그 결과다.
 */

/**
 * 조사 5종 변형 — "삼성전자가/를/는/의/에서"는 형태소 분석 후 전부 "삼성전자" 하나로 합쳐져야
 * 한다(docs/kiwi-verification.md §5). 020B의 집계 회귀("삼성전자 5회 합산")가 이 배열을 쓴다.
 */
export const PARTICLE_VARIANT_SENTENCES = [
  '삼성전자가 발표했다', // 삼성전자/NNP 가/JKS 발표/NNG 하/XSV 었/EP 다/EF
  '삼성전자를 인수했다', // 삼성전자/NNP 를/JKO 인수/NNG 하/XSV 었/EP 다/EF
  '삼성전자는 밝혔다', // 삼성전자/NNP 는/JX 밝히/VV 었/EP 다/EF
  '삼성전자의 전략이다', // 삼성전자/NNP 의/JKG 전략/NNG 이/VCP 다/EF
  '삼성전자에서 개발했다', // 삼성전자/NNP 에서/JKB 개발/NNG 하/XSV 었/EP 다/EF
] as const

/**
 * ⚠️ 함정 ② 회귀 — `Match.joinAffix`를 켜면 "확장"·"적용"·"경쟁"이 동사 어미에 흡수돼 명사
 * 필터를 통과하지 못하고 사라진다(docs/kiwi-verification.md §3②). `joinNounPrefix|joinNounSuffix`
 * 조합에서는 살아남아야 하고, "생태계"·"신제품"도 접두/접미 결합으로 한 단어로 잡혀야 한다.
 */
export const JOIN_AFFIX_TRAP_SENTENCES = {
  // 온/MM 디바이스/NNG AI/SL 반도체/NNG 생태계/NNG 가/JKS 확장/NNG 되/XSV ᆫ다/EF
  expand: '온디바이스 AI 반도체 생태계가 확장된다',
  // 이번/NNG 신제품/NNG 은/JX 최신/NNG 기술/NNG 을/JKO 적용/NNG 하/XSV 었/EP 다/EF
  apply: '이번 신제품은 최신 기술을 적용했다',
  // 국내/NNG 기업들/NNG 이/JKS 클라우드/NNP 시장/NNG 에서/JKB 경쟁/NNG 하/XSV ᆫ다/EF
  compete: '국내 기업들이 클라우드 시장에서 경쟁한다',
} as const

/**
 * 1글자 잡음 — "것"·"수"는 NNB(의존명사)라 품사 필터(NNG/NNP/SL)에서 이미 제외되고, "점"은
 * NNG로 잡히므로 길이 필터(length < 2)가 있어야 제외된다(docs/kiwi-verification.md §6).
 */
export const SINGLE_CHAR_NOISE_SENTENCES = [
  '먹을 것이 없다', // 먹/VV 을/ETM 것/NNB 이/JKS 없/VA 다/EF
  '살 것을 사왔다', // 살/VV ᆯ/ETM 것/NNB 을/JKO 사/VV 어/EC 오/VX 었/EP 다/EF
  '좋은 점이 많다', // 좋/VA 은/ETM 점/NNG 이/JKS 많/VA 다/EF
  '그것을 할 수 있는 점이 많다', // 그것/NP 을/JKO 하/VV ᆯ/ETM 수/NNB 있/VA 는/ETM 점/NNG 이/JKS 많/VA 다/EF
] as const

/**
 * SL(영문) 1글자 제외 — 길이 필터는 품사와 무관하게 걸리므로 NNG/NNP뿐 아니라 SL도 1글자면
 * 제외돼야 한다(docs/ROADMAP.md Task 020 구현 규칙 "SL도 같은 규칙을 적용하되 별도로 명시").
 * "5G"는 한 단어로 묶이지 않고 "5"(SN, 숫자 — 품사 필터에서 이미 제외)와 "G"(SL, 1글자)로
 * 쪼개진다 — "G" 홀로 남는 것이 바로 길이 필터가 막아야 할 사례다. "AI"는 2글자라 남아야 한다.
 */
export const ENGLISH_LENGTH_SENTENCE =
  'AI와 5G가 결합된다' // AI/SL 와/JKB 5/SN G/SL 가/JKS 결합/NNG 되/XSV ᆫ다/EF
