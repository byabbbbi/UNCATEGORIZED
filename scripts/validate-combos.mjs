/**
 * combos.ts 검증 (Node 18+)
 * 사용: node scripts/validate-combos.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkConcreteNoun, checkCoinageWarnings } from './lib/concrete-noun.mjs'
import {
  normalizeConceptName,
  compactNameLength,
  wordCount,
  MAX_NAME_COMPACT_LEN,
  MAX_NAME_WORDS,
} from './lib/name-length.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const src = readFileSync(resolve(root, 'src/data/combos.ts'), 'utf8')
const gachaSrc = readFileSync(resolve(root, 'src/data/gachaPool.ts'), 'utf8')
const initialSrc = readFileSync(resolve(root, 'src/data/initial.ts'), 'utf8')
const nameQualitySrc = readFileSync(resolve(root, 'src/utils/nameQuality.ts'), 'utf8')

const INITIAL = [...initialSrc.matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1]).slice(0, 4)

const LEXICON = [
  ...nameQualitySrc.matchAll(/'([^']{2,})'/g),
]
  .map((m) => m[1])
  .filter((w) => w.length >= 2 && /[가-힣]/.test(w))
  .slice(0, 80)

const gachaNames = new Set()
for (const m of gachaSrc.matchAll(/name:\s*'([^']+)'/g)) {
  gachaNames.add(m[1])
}

/** L381~446=A, 449~508=B, 511~571=C, 574~632=D */
function batchForLine(lineNo) {
  if (lineNo >= 381 && lineNo <= 446) return 'A'
  if (lineNo >= 449 && lineNo <= 508) return 'B'
  if (lineNo >= 511 && lineNo <= 571) return 'C'
  if (lineNo >= 574 && lineNo <= 632) return 'D'
  return null
}

const lines = src.split(/\r?\n/)
const entries = []
const pairKeys = new Set()

function pairKey(a, b) {
  return [a, b].sort().join('+')
}

for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(
    /n\(\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'[^']*',\s*'([^']+)',\s*'[^']*',\s*(\d+)/,
  )
  if (!m) continue
  const [a, b, name, pillar, depth] = m.slice(1)
  const key = pairKey(a, b)
  const batch = batchForLine(i + 1)
  entries.push({
    key,
    a,
    b,
    name,
    pillar,
    depth: Number(depth),
    line: 'EXTRA',
    batch,
    lineNo: i + 1,
  })
}

for (const m of src.matchAll(/\[pairKey\('([^']+)',\s*'([^']+)'\)\]:\s*hard\(\s*'([^']+)'/g)) {
  const [a, b, name] = m.slice(1)
  const key = pairKey(a, b)
  entries.push({ key, a, b, name, pillar: 'LEGACY', depth: 1, line: 'LEGACY', batch: null, lineNo: 0 })
}

const allOutputNames = new Set(entries.map((e) => e.name))
for (const w of LEXICON) allOutputNames.add(w)
for (const g of gachaNames) allOutputNames.add(g)

/** 접두 검사 오탐 방지 — LEXICON·실존 2~3자 사물 */
const PREFIX_WHITELIST = new Set([
  ...LEXICON.filter((w) => w.length <= 3),
  '이끼', '무풍', '여울', '균열', '안개', '조개', '자갈', '해골', '연료', '진흙', '진공',
  '암반', '모래', '습지', '오염', '붕괴', '표본', '호흡', '납골', '공동', '등대', '화석', '기형',
  '대장', '공란', '소금', '오수',
])

function knownForPrefix(name) {
  const set = new Set(allOutputNames)
  for (const w of PREFIX_WHITELIST) {
    if (w.startsWith(name) && w !== name) set.delete(w)
  }
  return set
}

let errors = 0
let warnings = 0
const outputNames = new Map()
const new240Names = new Map()
const twoCharNames = []

for (const e of entries) {
  if (pairKeys.has(e.key)) {
    console.error(`ERROR duplicate pairKey: ${e.key}`)
    errors += 1
  }
  pairKeys.add(e.key)

  const normalizedName = normalizeConceptName(e.name)
  if (normalizedName !== e.name) {
    console.warn(`WARN unnormalized whitespace: ${e.key} → "${e.name}"`)
    warnings += 1
  }

  if (compactNameLength(e.name) > MAX_NAME_COMPACT_LEN || wordCount(e.name) > MAX_NAME_WORDS) {
    const compact = compactNameLength(e.name)
    const words = wordCount(e.name)
    console.error(
      `ERROR name length: ${e.key} → "${e.name}" (compact=${compact}, max=${MAX_NAME_COMPACT_LEN}, words=${words}, maxWords=${MAX_NAME_WORDS})`,
    )
    errors += 1
  } else if (compactNameLength(e.name) < 2) {
    console.warn(`WARN 1-char name: ${e.key} → "${e.name}"`)
    warnings += 1
  }

  if (e.name === e.a || e.name === e.b) {
    console.error(`ERROR output equals input: ${e.key} → "${e.name}"`)
    errors += 1
  }

  const compact = e.name.replace(/\s/g, '')
  if (compact === e.a + e.b || compact === e.b + e.a) {
    console.warn(`WARN concat-like name: ${e.key} → "${e.name}"`)
    warnings += 1
  }

  if (e.batch) {
    if (e.name.length === 2) {
      twoCharNames.push({ batch: e.batch, key: e.key, name: e.name })
    }

    const { ok, reason } = checkConcreteNoun(e.name, knownForPrefix(e.name))
    if (!ok) {
      console.error(`ERROR not concrete [${e.batch}] ${e.key} → "${e.name}" (${reason})`)
      errors += 1
    }

    for (const warn of checkCoinageWarnings(e.name, allOutputNames)) {
      console.warn(`WARN coinage [${e.batch}] ${e.key} → "${e.name}" (${warn})`)
      warnings += 1
    }

    if (new240Names.has(e.name) && new240Names.get(e.name) !== e.key) {
      console.error(
        `ERROR duplicate output [${e.batch}] "${e.name}": ${new240Names.get(e.name)} vs ${e.key}`,
      )
      errors += 1
    }
    new240Names.set(e.name, e.key)
  } else if (outputNames.has(e.name) && outputNames.get(e.name) !== e.key) {
    console.warn(`WARN duplicate output name "${e.name}": ${outputNames.get(e.name)} vs ${e.key}`)
    warnings += 1
  }
  outputNames.set(e.name, e.key)
}

const knownConcepts = new Set([...INITIAL])
for (const e of entries) {
  knownConcepts.add(e.name)
}
for (const g of gachaNames) knownConcepts.add(g)

for (const e of entries) {
  if (!knownConcepts.has(e.a)) {
    console.warn(`WARN orphan input "${e.a}" in ${e.key}`)
    warnings += 1
  }
  if (!knownConcepts.has(e.b)) {
    console.warn(`WARN orphan input "${e.b}" in ${e.key}`)
    warnings += 1
  }
}

const pillars = { substance: 0, quantity: 0, quality: 0, time: 0 }
for (const e of entries) {
  if (e.pillar in pillars) pillars[e.pillar] += 1
}

const batchErrors = { A: 0, B: 0, C: 0, D: 0 }
for (const e of entries) {
  if (!e.batch) continue
  const { ok } = checkConcreteNoun(e.name, knownForPrefix(e.name))
  if (!ok) batchErrors[e.batch] += 1
}

console.log(`\n=== combos validation ===`)
console.log(`entries: ${entries.length}`)
console.log(`unique pairKeys: ${pairKeys.size}`)
console.log(`unique output names: ${outputNames.size}`)
console.log(`pillar distribution:`, pillars)
console.log(`concrete violations by batch (approx):`, batchErrors)
console.log(`errors: ${errors}, warnings: ${warnings}`)

if (twoCharNames.length) {
  console.log(`\n--- 2-char names in A~D (${twoCharNames.length}, manual spot-check) ---`)
  for (const t of twoCharNames.sort((a, b) => a.batch.localeCompare(b.batch) || a.name.localeCompare(b.name))) {
    console.log(`  [${t.batch}] ${t.key} → "${t.name}"`)
  }
}

if (errors > 0) process.exit(1)
