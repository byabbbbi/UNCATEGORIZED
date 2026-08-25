export function firstGrapheme(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!text) return '❔'

  try {
    const segmenter = new Intl.Segmenter('ko', { granularity: 'grapheme' })
    return [...segmenter.segment(text)][0]?.segment ?? '❔'
  } catch {
    return [...text][0] ?? '❔'
  }
}
