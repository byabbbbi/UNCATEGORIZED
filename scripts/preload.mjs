/**
 * 프리로드 캐시 생성기 (Node 18+)
 * 사용: node scripts/preload.mjs [상한=150]
 * PROXY_URL은 src/config.ts에서 읽는다.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const configSrc = readFileSync(resolve(root, 'src/config.ts'), 'utf8')
const m = configSrc.match(/PROXY_URL\s*=\s*['"]([^'"]+)['"]/)
if (!m) {
  console.error('PROXY_URL not found in src/config.ts')
  process.exit(1)
}
const PROXY_URL = m[1]

const LIMIT = Number(process.argv[2] || 150)

const BASE = [
  { name: '공허', emoji: '⬛' },
  { name: '불꽃', emoji: '🔥' },
  { name: '점토', emoji: '🧱' },
  { name: '조류', emoji: '💧' },
]

const HARD = [
  ['공허', '불꽃', '혼돈', '🌀'],
  ['불꽃', '점토', '생명', '🌱'],
  ['공허', '점토', '무덤', '🪦'],
  ['조류', '불꽃', '증기', '💨'],
  ['조류', '점토', '늪', '🫧'],
  ['조류', '공허', '심연', '🌊'],
]

function pairKey(a, b) {
  return [a, b].sort().join('+')
}

function cacheKey(a, b) {
  return `${pairKey(a, b)}||`
}

async function callProxy(a, b) {
  const T = 72
  const messages = [
    {
      role: 'system',
      content: `당신은 개념 조합 판정기다. JSON 객체 하나만 출력.
{"name":"한국어 2~12자","emoji":"이모지 1개","chaos":0,"plausibility":0,"narrative":0,"contagion":0,"pillar":"substance|quantity|quality|time","contaminant":"명사 1개","chronicle":"등장 기록 한 문장."}
합은 정확히 ${T}.`,
    },
    { role: 'user', content: `A: ${a}\nB: ${b}\n총량 T: ${T}` },
  ]
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

const known = new Map()
for (const c of BASE) known.set(c.name, c)
for (const [, , name, emoji] of HARD) known.set(name, { name, emoji })

const queue = []
const names = [...known.keys()]
for (let i = 0; i < names.length; i++) {
  for (let j = i + 1; j < names.length; j++) {
    queue.push([names[i], names[j]])
  }
}

// BFS 깊이 2: hard 결과끼리도 한 번 더
const depth2 = HARD.map((h) => h[2])
for (let i = 0; i < depth2.length; i++) {
  for (let j = i + 1; j < depth2.length; j++) {
    queue.push([depth2[i], depth2[j]])
  }
  for (const b of BASE) {
    queue.push([depth2[i], b.name])
  }
}

const out = {}
let done = 0
const uniq = new Map()
for (const [a, b] of queue) {
  const k = cacheKey(a, b)
  if (!uniq.has(k)) uniq.set(k, [a, b])
}

for (const [key, [a, b]] of uniq) {
  if (done >= LIMIT) break
  try {
    const result = await callProxy(a, b)
    out[key] = {
      name: String(result.name || '').slice(0, 20),
      emoji: String(result.emoji || '❔').slice(0, 4),
      chaos: Number(result.chaos) || 0,
      plausibility: Number(result.plausibility) || 0,
      narrative: Number(result.narrative) || 0,
      contagion: Number(result.contagion) || 0,
      pillar: result.pillar || 'substance',
      contaminant: String(result.contaminant || '').slice(0, 8),
      chronicle: String(result.chronicle || '').slice(0, 90),
    }
    done += 1
    console.log(`[${done}/${LIMIT}] ${a}+${b} → ${out[key].name}`)
    await sleep(400)
  } catch (err) {
    console.warn(`skip ${a}+${b}:`, err.message || err)
  }
}

const dest = resolve(root, 'src/data/preload.json')
writeFileSync(dest, JSON.stringify(out, null, 2), 'utf8')
console.log(`Wrote ${Object.keys(out).length} entries → ${dest}`)
