/**
 * 개념 카드 출력명이 "사물"(손에 쥘·가리킬 수 있는 것)인지 판정.
 * 신규 묶음 A~D 전용 — LEGACY·기존 EXTRA는 검사 제외.
 */

/** Tier 2 시드: 행위·절차·행사 */
export const ACTION_WORDS = new Set([
  '망각', '폭발', '질식', '단절', '소멸', '적응', '번식', '장례', '조문', '증발', '응결',
  '산화', '탄화', '부식', '침전', '파열', '퇴화', '재생', '순환', '발화', '연소', '분골',
  '수장', '갱신', '소거', '침식', '침수', '정착', '난방', '세탁', '발효', '세척', '소독',
  '환기', '부화', '서식', '여과', '건조', '경화', '소성', '퇴적', '범람', '피난', '발아',
  '성장', '광합', '풍화', '이동', '매몰', '유출', '전승', '배척', '왜곡', '내전', '내란',
  '잠복', '휴면', '멸종', '파괴', '암송', '보고', '고발', '보존', '압수', '필사', '감시',
  '의례', '굴절', '마모', '누락', '결석', '소동', '부패', '분쇄', '관개', '온천', '소각',
  '분산', '발열',
])

/** Tier 3 시드: 상태·추상 */
export const STATE_WORDS = new Set([
  '허무', '허탈', '찬란', '고요', '정적', '묵음', '흐림', '극소', '열화', '결손', '변형',
  '잔재', '잔상', '공백', '오염', '유전', '습기',
])

/** 사건·과정 (사물 아님) */
export const EVENT_WORDS = new Set([
  '붕괴', '폭발', '내전', '멸종', '장례', '조문', '분골', '수장',
])

/** 명시적 잘림·조어 단편 */
export const TRUNCATION_PAIRS = new Map([
  ['무질', '무질서'],
  ['돌연', '돌연변이'],
  ['회오', '회오리'],
  ['심생', '심생물'],
  ['괴형', '기형'],
  ['선착', '선착장'],
  ['무풍', '무풍대'],
])

/** 접두 검사에서 제외할 실존 단편 */
export const PREFIX_SAFE = new Set([
  '이끼', '무풍', '여울', '균열', '안개', '조개', '자갈', '해골', '연료', '진흙', '진공',
  '암반', '모래', '습지', '표본', '호흡', '납골', '공동', '등대', '화석', '괴어', '기형',
  '대장', '공란', '오수', '기형',
])

/** 비표준·조어 단편 */
const COINED_FRAGMENTS = new Set([
  '습풍', '잠류', '열사', '메마름', '고갈', '간조', '공극', '습원', '불밭', '집터', '종성',
  '괴형',
])

/** 접미어로 행위성을 띠는 이름 — 예외(사물). 정규식이 잡지 않는 항목은 넣지 않는다. */
const ACTION_SUFFIX_EXCEPTIONS = new Set([
  '음식', // ~식
])

/** 명사 복합어 끝 — 동사성 접미처럼 보이지만 사물 */
const ACTION_SUFFIX_SAFE_ENDINGS = ['깃발']

/** 조어 접미 패턴 — KNOWN에 없으면 warn */
const COINAGE_SUFFIXES = '토암체권종핵석관'
const COINAGE_SUFFIX_RE = new RegExp(`^(.{2,})[${COINAGE_SUFFIXES}]$`, 'u')

/** 접미 조어 예외 — 교과서·일상어 */
const COINAGE_SUFFIX_EXCEPTIONS = new Set([
  '화석', '석탄', '위패', '토기', '토대', '금기', '금서', '성물', '성운', '진흙',
  '옥토', '부패체', '표본', '기형석', '기형어', '퇴적층', '변종', '속돌', '부싯돌',
  '석재', '원토', '적벽돌', '층암', '이암', '관', '병아리', '적토',
])

/** 한자어 동사성 접미 (~화 ~식 ~발 ~성 ~멸 ~란). 2자 이름·명사 복합어는 제외 */
const ACTION_SUFFIX_RE = /(?:화|식|발|성|멸|란)$/u

function hasActionSuffix(name) {
  const compact = name.replace(/\s/g, '')
  if (compact.length <= 2) return false
  if (!ACTION_SUFFIX_RE.test(compact)) return false
  if (ACTION_SUFFIX_EXCEPTIONS.has(compact)) return false
  for (const ending of ACTION_SUFFIX_SAFE_ENDINGS) {
    if (compact.endsWith(ending)) return false
  }
  return true
}

/**
 * @param {string} name
 * @param {Set<string>} knownVocab - 전체 출력명·어휘 (접두 검사용)
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkConcreteNoun(name, knownVocab) {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (!trimmed) return { ok: false, reason: 'empty' }

  if (TRUNCATION_PAIRS.has(trimmed)) {
    return { ok: false, reason: `truncation:${TRUNCATION_PAIRS.get(trimmed)}` }
  }

  if (ACTION_WORDS.has(trimmed)) {
    return { ok: false, reason: 'action' }
  }
  if (STATE_WORDS.has(trimmed)) {
    return { ok: false, reason: 'state' }
  }
  if (EVENT_WORDS.has(trimmed)) {
    return { ok: false, reason: 'event' }
  }
  if (COINED_FRAGMENTS.has(trimmed)) {
    return { ok: false, reason: 'coined' }
  }

  if (hasActionSuffix(trimmed)) {
    return { ok: false, reason: 'action-suffix' }
  }

  if (knownVocab && !PREFIX_SAFE.has(trimmed)) {
    for (const w of knownVocab) {
      if (w.length > trimmed.length && w.startsWith(trimmed) && trimmed.length >= 2 && trimmed.length <= 4) {
        return { ok: false, reason: `prefix-of:${w}` }
      }
    }
  }

  return { ok: true }
}

export function isConcreteNoun(name, knownVocab) {
  return checkConcreteNoun(name, knownVocab).ok
}

/**
 * 조어·유사어 수동 검토용 경고 (error 아님)
 * @param {string} name
 * @param {Set<string>} knownVocab
 * @returns {string[]} warn reasons
 */
export function checkCoinageWarnings(name, knownVocab) {
  const trimmed = name.trim()
  const warns = []

  const m = COINAGE_SUFFIX_RE.exec(trimmed)
  if (m && !knownVocab?.has(trimmed) && !COINAGE_SUFFIX_EXCEPTIONS.has(trimmed)) {
    warns.push(`coinage-suffix:${m[1]}+?`)
  }

  if (knownVocab) {
    for (const w of knownVocab) {
      if (w === trimmed || w.length !== trimmed.length || w.length < 2) continue
      let diff = 0
      for (let i = 0; i < w.length; i++) {
        if (w[i] !== trimmed[i]) diff++
      }
      if (diff === 1) {
        warns.push(`near-word:${w}`)
        break
      }
    }
  }

  return warns
}
