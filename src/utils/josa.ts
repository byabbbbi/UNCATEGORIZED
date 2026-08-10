export function josa(word: string, [withFinal, withoutFinal]: [string, string]) {
  const c = word.charCodeAt(word.length - 1)
  if (c < 0xac00 || c > 0xd7a3) return withFinal
  return (c - 0xac00) % 28 ? withFinal : withoutFinal
}
