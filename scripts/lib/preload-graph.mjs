/** calcT(depth, era) = min(60 + depth*12, 80 + era*20) — generation.ts와 동일 */
export function calcT(depth, era) {
  return Math.min(60 + depth * 12, 80 + era * 20)
}

export function pairKey(a, b) {
  return [a, b].sort().join('+')
}

export function cacheKey(a, b) {
  return `${pairKey(a, b)}||`
}

/** combos.ts + initial.ts에서 개념명·depth·hard pair 추출 */
export function parseCombosGraph(combosSrc, initialSrc) {
  const concepts = new Map()

  for (const m of initialSrc.matchAll(/name:\s*'([^']+)'[\s\S]*?depth:\s*(\d+)/g)) {
    concepts.set(m[1], Number(m[2]))
  }

  const hardPairs = new Set()

  for (const m of combosSrc.matchAll(
    /n\(\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*(\d+)/g,
  )) {
    const [, a, b, name, depth] = m
    hardPairs.add(pairKey(a, b))
    concepts.set(name, Number(depth))
  }

  for (const m of combosSrc.matchAll(/\[pairKey\('([^']+)',\s*'([^']+)'\)\]:\s*hard\([\s\S]*?'([^']+)'[\s\S]*?(?:,\s*(\d+)\s*,)?/g)) {
    const a = m[1]
    const b = m[2]
    const name = m[3]
    const depth = m[4] ? Number(m[4]) : 1
    hardPairs.add(pairKey(a, b))
    concepts.set(name, depth)
  }

  // LEGACY depth from trailing number before closing paren
  for (const m of combosSrc.matchAll(
    /\[pairKey\('([^']+)',\s*'([^']+)'\)\]:\s*hard\(([\s\S]*?)\n\s*\)/g,
  )) {
    const [, a, b, body] = m
    hardPairs.add(pairKey(a, b))
    const nameM = body.match(/^\s*'([^']+)'/m)
    const depthM = body.match(/,\s*(\d+)\s*,?\s*\)/)
    if (nameM) {
      concepts.set(nameM[1], depthM ? Number(depthM[1]) : 1)
    }
  }

  return { concepts, hardPairs }
}

/** hard에 없는 쌍을 depth 우선·BASE 포함 우선으로 정렬 */
export function buildPreloadQueue(concepts, hardPairs, maxDepth = 3) {
  const names = [...concepts.keys()]
  const base = ['공허', '불꽃', '점토', '조류']
  const queue = []
  const seen = new Set()

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i]
      const b = names[j]
      const key = pairKey(a, b)
      if (hardPairs.has(key) || seen.has(key)) continue
      const depth = Math.max(concepts.get(a) ?? 0, concepts.get(b) ?? 0) + 1
      if (depth > maxDepth) continue
      seen.add(key)
      const hasBase = base.includes(a) || base.includes(b) ? 0 : 1
      queue.push({ a, b, key, depth, hasBase, sortDepth: depth })
    }
  }

  queue.sort((x, y) => x.sortDepth - y.sortDepth || x.hasBase - y.hasBase || x.key.localeCompare(y.key))
  return queue
}

export function comboT(concepts, a, b, era = 0) {
  const depth = Math.max(concepts.get(a) ?? 0, concepts.get(b) ?? 0) + 1
  return calcT(depth, era)
}
