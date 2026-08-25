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

export function isNameLengthOk(name: string, opts: { min?: number } = {}): boolean {
  const min = opts.min ?? 2
  const n = normalizeConceptName(name)
  if (!n) return false
  const compact = compactNameLength(n)
  if (compact < min || compact > MAX_NAME_COMPACT_LEN) return false
  if (wordCount(n) > MAX_NAME_WORDS) return false
  return true
}
