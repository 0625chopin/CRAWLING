@AGENTS.md

# IT/AI 뉴스 핫 키워드 크롤러

체크박스로 고른 언론사에서 IT/AI 기사를 수집해 txt로 모으고, Kiwi 형태소 분석으로 조사를 걷어낸 뒤 빈도를 세어
핫 키워드 랭킹을 뽑는 **로컬 단일 사용자 도구**다. DB·인증·서버리스 배포는 의도적으로 없다.

## 문서 우선순위

1. **스코프(무엇을 만드는가)** — `docs/ROADMAP.md`. Task 제목·생성 파일·구현 규칙·완료 조건(DoD)의 단일 소스.
   PRD와 어긋나면 ROADMAP이 이긴다.
2. **코드 규약(어떻게 쓰는가)** — `docs/CONVENTIONS.md`. **코드를 쓰기 전에 반드시 읽는다.**
3. **화면 마크업** — `docs/screens/`. 진입점은 `docs/screens/README.md`.
4. **Next.js API 세부** — `node_modules/next/dist/docs/` 설치본 문서가 언제나 최종 판정 기준이다(위 AGENTS.md).

@docs/CONVENTIONS.md

## 절대 놓치면 안 되는 것

- **사용자 노출 문자열·주석·문서는 한국어**, 식별자는 영어.
- **`export const runtime = 'nodejs'`를 쓰지 않는다** — Next.js 16 기본값이며 설치본 문서가 제거를 지시한다.
- **프로세스 단위 싱글턴은 `globalThis`에 붙인다** — 모듈 스코프는 dev HMR에서 초기화된다.
- **Kiwi matchOptions는 `Match.joinNounPrefix | Match.joinNounSuffix` 고정.** `Match.joinAffix`를 쓰면
  "공개"·"적용"·"경쟁" 같은 키워드가 통째로 사라지는데 **화면은 멀쩡해 보인다**(`docs/kiwi-verification.md` 함정 ②).
- **`docs/ROADMAP.md`는 팀장만 편집한다.** 완료 체크·진행률 갱신은 회차 마감에 일괄 반영된다.
- 새 이슈·결정은 번호 없이 `docs/ISSUES.draft.<AREA>.md` / `docs/DECISIONS.draft.<AREA>.md`에 쓴다.
