# Kiwi 형태소 분석 파이프라인 검증 결과

**결론: 동작한다.** 조사 제거 → 명사 추출 → 빈도 집계까지 Next.js 16.3.0 서버 런타임(dev·프로덕션 빌드 모두)에서 확인했다.
다만 그냥 붙이면 걸리는 함정이 5개 있고, 그중 2개는 모르고 지나가면 결과가 조용히 틀린다.

검증 환경: Windows 11 · Node v24.19.0 · Next.js 16.3.0 (Turbopack) · kiwi-nlp 0.23.0

---

## 1. 확정된 조합

| 항목 | 값 |
|------|-----|
| 패키지 | `kiwi-nlp@0.23.0` (WASM, LGPL-2.1-or-later) |
| 모델 | `kiwi_model_v0.23.0_base.tgz` — GitHub Releases에서 별도 다운로드 (84MB) |
| 모델 배치 | `data/kiwi-model/` (9개 파일, 105MB) — `.gitignore`의 `/data`로 커밋 제외됨 |
| WASM 경로 | `node_modules/kiwi-nlp/dist/kiwi-wasm.wasm` (3.7MB) |
| 실행 위치 | **서버 전용** — `lib/keyword/` 모듈 최상단에 `import 'server-only'`. **`export const runtime = 'nodejs'`를 쓰지 않는다**(Next.js 16 기본값이며 설치본 문서가 제거를 지시한다 — `docs/CONVENTIONS.md` §라우트 핸들러) |
| Next 설정 | `serverExternalPackages: ['playwright', 'kiwi-nlp']` |

모델 파일 9종: `combiningRule.txt` `cong.mdl`(76MB) `default.dict` `dialect.dict` `extract.mdl` `multi.dict` `nounchr.mdl` `sj.morph` `typo.dict`

### 모델 재다운로드 방법

```bash
curl -L -o kiwi_model.tgz \
  https://github.com/bab2min/Kiwi/releases/download/v0.23.0/kiwi_model_v0.23.0_base.tgz
tar -xzf kiwi_model.tgz          # models/cong/base/ 아래에 풀린다
cp models/cong/base/* data/kiwi-model/
```

---

## 2. 실측 성능

| 단계 | 소요 |
|------|------|
| `KiwiBuilder.create()` (WASM 로드) | 11~15ms |
| 모델 파일 9개 `fs` 읽기 (105MB) | 36~55ms |
| **`builder.build()`** | **1,300~1,600ms** |
| `tokenize()` — 765자 기사 1건 | 7~11ms |
| 200건 연속 처리 | 1,895ms (건당 9.5ms) |

**메모리: 인스턴스 1개당 RSS +780MB** (기준 58MB → 837MB). Next.js 프로덕션 서버에서는 876~889MB.

원인은 빌드 로그에 찍히는 이 메시지다.

```
Quantization is not supported for ArchType::none. Fall back to non-quantized model.
```

WASM 빌드에 SIMD 계열 가속이 없어 양자화 모델을 못 쓰고 비양자화로 폴백한다. 사용자가 끌 수 있는 옵션이 아니다.
로컬 테스트 도구로는 감수할 만하지만, **RAM 8GB 이하 머신이나 서버리스 배포는 이 시점에서 불가능하다고 봐야 한다.**

---

## 3. 반드시 지켜야 할 것 5가지

### ⚠️ ① `tokenize(text, undefined)` 는 프로세스를 죽인다

```js
kiwi.tokenize(text, opts)   // opts가 undefined면 Node 프로세스가 통째로 죽는다
```

`kiwi-nlp`의 Proxy가 인자 배열을 `JSON.stringify` 하는데, 배열 안의 `undefined`는 `null`이 된다.
C++ 쪽이 `null` matchOptions를 받으면 emscripten 예외가 나고 **잡히지 않은 채 프로세스가 종료**된다.
(에러 메시지가 `479990360` 같은 숫자 포인터라 원인 파악도 어렵다.)

```js
// 안전한 호출 래퍼
const tokenize = (kiwi, text, opts) =>
  opts === undefined ? kiwi.tokenize(text) : kiwi.tokenize(text, opts)
```

옵셔널 인자 전체(`blockList`, `pretokenized`, `typos`)에 같은 규칙이 적용된다.

### ⚠️ ② matchOptions는 `joinNounPrefix | joinNounSuffix` 만 — `joinAffix`를 켜면 키워드가 사라진다

`Match.joinAffix`(4063232)는 접두/접미사뿐 아니라 **동사·형용사 어미까지 결합**해서
`공개/NNG + 하/XSV` 를 `공개하/VV` 하나로 합쳐 버린다. 그러면 **"공개"가 명사 필터를 통과하지 못하고 키워드에서 통째로 빠진다.**
IT 기사에서 공개·발표·확장·적용·경쟁은 전부 의미 있는 키워드라 치명적이다.

실측 비교:

| 입력 | 옵션 없음 | `joinNounPrefix\|joinNounSuffix` ✅ | `joinAffix` ❌ |
|------|-----------|------------------------------------|----------------|
| 온디바이스 AI 반도체 생태**계**가 확장된다 | 생태, 확장 | **생태계, 확장** | 생태계, ~~확장 소실~~ |
| 이번 **신**제품은 … 적용했다 | 제품, 적용 | **신제품, 적용** | 신제품, ~~적용 소실~~ |
| … 클라우드 시장에서 경쟁한다 | 경쟁 | **경쟁** | ~~경쟁 소실~~ |

```js
const MATCH = Match.joinNounPrefix | Match.joinNounSuffix   // = 393216
```

### ⚠️ ③ 모델 버전은 패키지 버전과 정확히 맞아야 한다

| 조합 | 결과 |
|------|------|
| kiwi-nlp 0.23.0 + 모델 v0.23.0 | ✅ 동작 |
| kiwi-nlp 0.23.0 + 모델 v0.21.0 (34MB 경량) | ❌ `build()` 실패 — `modelType`을 knlm/sbg/largest 뭘 줘도 동일 |
| kiwi-nlp 0.21.0 + 모델 v0.21.0 | ❌ `Aborted()` — 부가 사전을 다 꺼도 실패 |

메모리를 줄이려고 경량 KNLM 모델(34MB)로 내려가는 길은 **막혀 있다.** 105MB cong 모델이 유일한 선택지다.

### ⚠️ ④ Kiwi 인스턴스는 반드시 싱글턴으로

`build()`가 매번 1.4초다. 요청마다 만들면 그대로 응답 지연이 된다.
(요청을 3회 반복해도 RSS는 876→877MB로 유지돼 **누수는 없지만**, 매번 1.3~1.6초를 다시 낸다.)
모듈 스코프에 Promise를 캐싱해 프로세스당 1개만 유지할 것.

### ⚠️ ⑤ 정적 자산으로 서빙하지 말 것

`modelFiles`는 URL 문자열도 받지만, 그 경로는 브라우저에서 105MB를 내려받는다는 뜻이다.
크롤링이 이미 서버(Playwright)에서 도니 **형태소 분석도 서버에서 `fs`로 읽어 처리**하는 게 맞다.
`public/`에 모델을 두면 안 된다.

---

## 4. 정확도 — 사용자 사전이 필요하다

기본 사전은 IT/AI 고유명사를 쪼갠다. `userWords`로 등록하면 해결된다.

| 원문 | 기본 | `userWords` 등록 후 |
|------|------|--------------------|
| 오픈AI | `오픈/NNG` + `AI/SL` | `오픈AI/NNP` ✅ |
| 데이터센터 | `데이터/NNG` + `센터/NNG` | `데이터센터/NNP` ✅ |
| 온디바이스 | `온/MM` + `디바이스/NNG` | `온디바이스/NNP` ✅ |

```js
userWords: [
  { word: '오픈AI', tag: 'NNP', score: 5 },
  { word: '데이터센터', tag: 'NNP', score: 5 },
  { word: '온디바이스', tag: 'NNP', score: 5 },
]
```

`build()` 시점에 넘겨야 하므로, **사용자 사전을 바꾸면 인스턴스를 다시 만들어야 한다**(+1.4초).
언론사·불용어처럼 화면에서 관리하게 만들 거라면 이 재빌드 비용을 감안해야 한다.

> 이건 PRD에 없던 항목이다. 불용어 관리(F008)와 성격이 비슷한 **사용자 사전 관리** 기능을 추가할지 판단이 필요하다.

---

## 5. 조사 제거 실증

입력:

```
삼성전자가 온디바이스 AI 반도체를 공개했다. 오픈AI는 새로운 언어모델을 발표하면서 개발자 생태계 확장에 나섰다.
```

분리되어 제거된 조사: `가/JKS` `를/JKO` `는/JX` `을/JKO` `에/JKB`

최종 키워드:
`삼성전자/NNP` `온디바이스/NNP` `AI/SL` `반도체/NNG` `공개/NNG` `오픈AI/NNP` `언어/NNG` `모델/NNG` `발표/NNG` `개발자/NNG` `생태계/NNG` `확장/NNG`

조사 변형이 하나로 합쳐지는지도 확인했다 — 핫 키워드 정확도의 핵심이다.

| 원문 | 추출 결과 |
|------|-----------|
| 삼성전자**가** 발표했다 | 삼성전자, 발표 |
| 삼성전자**를** 인수했다 | 삼성전자, 인수 |
| 삼성전자**는** 밝혔다 | 삼성전자 |
| 삼성전자**의** 전략이다 | 삼성전자, 전략 |
| 삼성전자**에서** 개발했다 | 삼성전자, 개발 |

원문 그대로 세면 5개가 전부 다른 단어지만, 형태소 분석 후에는 `삼성전자` 5회로 정확히 집계된다.

### 토큰 감소율

기사 4건(199 토큰) 기준 — 조사·어미·접미사·기호 제거 후 **84 토큰(57.8% 제거)**.
`03-hot-keyword.md`의 "분석 요약" 영역에 노출하기로 한 수치가 바로 이것이고, 실제로 계산 가능하다.

---

## 6. 불용어가 왜 필요한지 (F008 근거 확인)

같은 기사 4건을 불용어 적용 전후로 집계한 결과:

```
불용어 미적용 Top 12: AI(7) 반도체(4) 엔비디아(3) 모델(3) 공개(2) 데이터(2) 센터(2) 시장(2) 이번(2) 추론(2) 업계(2) 제공(2)
불용어 적용   Top 12: AI(7) 반도체(4) 모델(3) 엔비디아(3) 공개(2) 구글(2) 데이터(2) 삼성전자(2) 센터(2) 시장(2) 업계(2) 오픈(2)
```

`제공`이 빠지고 그 자리에 `삼성전자`·`구글`이 올라온다. 기사 4건에서 이 정도면 수백 건에서는 상투어가 상위권을 잠식한다.
**불용어 관리(F008)를 MVP에 넣은 판단은 실측으로 뒷받침된다.**

추가로 필요한 필터 2가지를 확인했다.

- **1글자 명사 제외** — `것`, `수`, `점` 같은 의존명사성 잡음이 상위에 낀다 (검증 스크립트에 `length < 2` 필터 적용)
- **`이번` 같은 시간·지시 명사** — NNG로 잡히지만 키워드로서 의미가 없다. 기본 불용어 프리셋에 넣을 후보

---

## 7. 검증에 사용한 코드

`app/api/kiwi-check/route.ts` — Next.js 서버 런타임에서 전 과정을 도는 점검용 라우트다.
`GET /api/kiwi-check` 하면 버전·단계별 소요시간·RSS·제거된 조사·추출된 키워드를 JSON으로 돌려준다.

정식 구현(`lib/keyword/`)으로 옮기고 나면 지워도 되는 임시 라우트다. 지금은 동작하는 참조 구현 겸 스모크 테스트로 남겨 뒀다.

---

## 8. 설계 문서에 반영해야 할 것

| 문서 | 수정 필요 |
|------|-----------|
| `docs/PRD.md` | "WASM·모델 파일을 앱이 직접 서빙 → 정적 자산 배치" 서술이 틀렸다. 서버에서 `fs`로 읽는다 (수정 완료) |
| `docs/screens/03-hot-keyword.md` | "Kiwi 모델 로딩" 단계는 **서버에서 1.4초, 싱글턴이면 최초 1회만**. 클라이언트 로딩 진행률이 아니다 |
| `docs/PRD.md` 기능 명세 | `userWords` 사용자 사전 관리 기능(F009?) 추가 여부 판단 필요 |
| `docs/PRD.md` 데이터 모델 | 1글자 명사 제외·기본 불용어 프리셋에 `이번` 등 추가 |
