/** 공백 정규화 + 실질 글자 수(공백 제외) */
export function normalizeConceptName(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function compactNameLength(name) {
  return normalizeConceptName(name).replace(/\s/g, '').length
}

export function wordCount(name) {
  const n = normalizeConceptName(name)
  if (!n) return 0
  return n.split(' ').length
}

export const MAX_NAME_COMPACT_LEN = 10
export const MAX_NAME_WORDS = 3

export function isNameLengthOk(name, { min = 2 } = {}) {
  const n = normalizeConceptName(name)
  if (!n) return false
  const compact = compactNameLength(n)
  if (compact < min || compact > MAX_NAME_COMPACT_LEN) return false
  if (wordCount(n) > MAX_NAME_WORDS) return false
  return true
}
