/**
 * 프리로드 캐시 생성기 (Node 18+)
 * 사용:
 *   node scripts/preload.mjs [limit=200] [--yes] [--retry-failed]
 * PROXY_URL은 src/config.ts에서 읽는다.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'
import {
  buildPreloadQueue,
  cacheKey,
  comboT,
  parseCombosGraph,
} from './lib/preload-graph.mjs'
import { buildPreloadMessages, normalizeEntry } from './lib/preload-prompt.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const configSrc = readFileSync(resolve(root, 'src/config.ts'), 'utf8')
const m = configSrc.match(/PROXY_URL\s*=\s*['"]([^'"]+)['"]/)
if (!m) {
  console.error('PROXY_URL not found in src/config.ts')
  process.exit(1)
}
const PROXY_URL = m[1]

const args = process.argv.slice(2)
const LIMIT = Number(args.find((a) => /^\d+$/.test(a)) || 200)
const AUTO_YES = args.includes('--yes')
const RETRY_FAILED = args.includes('--retry-failed')

const combosSrc = readFileSync(resolve(root, 'src/data/combos.ts'), 'utf8')
const initialSrc = readFileSync(resolve(root, 'src/data/initial.ts'), 'utf8')
const { concepts, hardPairs } = parseCombosGraph(combosSrc, initialSrc)
const queue = buildPreloadQueue(concepts, hardPairs, 3)

const dest = resolve(root, 'src/data/preload.json')
const statePath = resolve(root, 'scripts/.preload-state.json')

const existing = existsSync(dest)
  ? JSON.parse(readFileSync(dest, 'utf8'))
  : {}
const state = existsSync(statePath)
  ? JSON.parse(readFileSync(statePath, 'utf8'))
  : { completed: [], failed: [], lastRun: null }

const completedSet = new Set(state.completed)
const failedSet = new Set(RETRY_FAILED ? [] : state.failed)

const pending = queue.filter(({ a, b, key }) => {
  const ck = cacheKey(a, b)
  if (existing[ck] || completedSet.has(ck)) return false
  if (failedSet.has(ck)) return false
  return true
})

const toRun = pending.slice(0, LIMIT)
const estMs = toRun.length * 9400
const estMin = Math.ceil(estMs / 60000)

console.log('=== Preload Plan ===')
console.log(`Proxy: ${PROXY_URL}`)
console.log(`Hard table pairs (skip): ${hardPairs.size}`)
console.log(`Concepts in graph: ${concepts.size}`)
console.log(`Queue (non-hard, depth≤3): ${queue.length}`)
console.log(`Already cached: ${Object.keys(existing).length}`)
console.log(`Pending this run: ${toRun.length} (limit ${LIMIT})`)
console.log(`Est. time: ~${estMin} min (${toRun.length} × ~9s)`)
console.log(`Est. cost: model-dependent (~${toRun.length} API calls)`)

async function confirm() {
  if (AUTO_YES || toRun.length === 0) return true
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise((res) => rl.question('Continue? [y/N] ', res))
  rl.close()
  return /^y(es)?$/i.test(answer.trim())
}

async function callProxy(a, b, T) {
  const messages = buildPreloadMessages(a, b, T)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 9000)
  try {
    const r = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: ctrl.signal,
    })
    if (!r.ok) throw new Error(`proxy ${r.status}`)
    const data = await r.json()
    const text = data.choices?.[0]?.message?.content ?? ''
    const s = text.indexOf('{')
    const e = text.lastIndexOf('}')
    if (s < 0 || e <= s) throw new Error('no json')
    return JSON.parse(text.slice(s, e + 1))
  } finally {
    clearTimeout(timer)
  }
}

function saveAll(out, st) {
  writeFileSync(dest, JSON.stringify(out, null, 2), 'utf8')
  writeFileSync(statePath, JSON.stringify(st, null, 2), 'utf8')
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function onExit() {
  saveAll(existing, state)
  console.log('\n(state saved — rerun to resume)')
  process.exit(130)
}

process.on('SIGINT', onExit)

if (!(await confirm())) {
  console.log('Aborted.')
  process.exit(0)
}

let done = 0
for (const { a, b } of toRun) {
  const ck = cacheKey(a, b)
  const T = comboT(concepts, a, b, 0)
  try {
    const raw = await callProxy(a, b, T)
    existing[ck] = normalizeEntry(raw, T)
    state.completed.push(ck)
    state.failed = state.failed.filter((k) => k !== ck)
    done += 1
    console.log(`[${done}/${toRun.length}] T=${T} ${a}+${b} → ${existing[ck].name}`)
    saveAll(existing, state)
    await sleep(400)
  } catch (err) {
    console.warn(`skip ${a}+${b}:`, err.message || err)
    if (!state.failed.includes(ck)) state.failed.push(ck)
    saveAll(existing, state)
  }
}

state.lastRun = new Date().toISOString()
saveAll(existing, state)
console.log(`Wrote ${Object.keys(existing).length} total entries → ${dest}`)
