export function normalizeConceptName(name: string): string {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function compactNameLength(name: string): number {
  return normalizeConceptName(name).replace(/\s/g, '').length
}

export function wordCount(name: string): number {
  const n = normalizeConceptName(name)
  if (!n) return 0
  return n.split(' ').length
}

export const MAX_NAME_COMPACT_LEN = 10
export const MAX_NAME_WORDS = 3

export function limitConceptName(name: string): string {
  let normalized = normalizeConceptName(name)
  const words = normalized.split(' ')
  if (words.length > MAX_NAME_WORDS) {
    normalized = words.slice(0, MAX_NAME_WORDS).join(' ')
  }

  if (compactNameLength(normalized) <= MAX_NAME_COMPACT_LEN) return normalized

  let compactLength = 0
  let limited = ''
  for (const character of normalized) {
    if (character === ' ') {
      if (limited && !limited.endsWith(' ')) limited += character
      continue
    }
    if (compactLength >= MAX_NAME_COMPACT_LEN) break
    limited += character
    compactLength += 1
  }
  return normalizeConceptName(limited)
}

export function isNameLengthOk(name: string, opts: { min?: number } = {}): boolean {
  const min = opts.min ?? 2
  const n = normalizeConceptName(name)
  if (!n) return false
  const compact = compactNameLength(n)
  if (compact < min || compact > MAX_NAME_COMPACT_LEN) return false
  if (wordCount(n) > MAX_NAME_WORDS) return false
  return true
}
