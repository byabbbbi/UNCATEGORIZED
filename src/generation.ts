import { get as idbGet, set as idbSet } from 'idb-keyval'
import PRELOAD from './data/preload.json'
import { HARD_TABLE } from './data/combos'
import { COLLAPSE_RULES } from './data/rules'
import { PROXY_URL } from './config'
import { calcT } from './game/formulas'
import type { Concept, PillarKey } from './types'

export interface GenResult {
  name: string
  emoji: string
  chaos: number
  plausibility: number
  narrative: number
  contagion: number
  pillar: PillarKey
  contaminant: string
  chronicle: string
  deleted?: boolean
}

export interface WorldState {
  collapsed: PillarKey[]
  contaminants: string[]
  era: number
}

const pairKey = (a: string, b: string) => [a, b].sort().join('+')

export const cacheKey = (a: string, b: string, w: WorldState) =>
  [
    pairKey(a, b),
    [...w.collapsed].sort().join(','),
    [...w.contaminants].sort().join(','),
  ].join('|')

export function totalT(a: Concept, b: Concept, w: WorldState): number {
  const depth = Math.max(a.depth, b.depth) + 1
  return calcT(depth, w.era)
}

export async function generate(
  a: Concept,
  b: Concept,
  w: WorldState,
): Promise<GenResult> {
  const key = cacheKey(a.name, b.name, w)

  // 1. 하드코딩 테이블 (세계가 깨끗할 때만)
  if (w.collapsed.length === 0 && w.contaminants.length === 0) {
    const hard = HARD_TABLE[pairKey(a.name, b.name)]
    if (hard) {
      return {
        name: hard.name,
        emoji: hard.emoji,
        chaos: hard.chaos,
        plausibility: hard.plausibility,
        narrative: hard.narrative,
        contagion: hard.contagion,
        pillar: hard.pillar,
        contaminant: '',
        chronicle: `${hard.name}이(가) 목록에 등재되었다.`,
      }
    }
  }

  // 2. IndexedDB 캐시
  const cached = await idbGet(key)
  if (cached) return cached as GenResult

  // 3. 프리로드 캐시
  const pre = (PRELOAD as Record<string, GenResult>)[key]
  if (pre) {
    await idbSet(key, pre)
    return pre
  }

  // 4. API (프록시 경유)
  try {
    const raw = await callProxy(buildMessages(a, b, w), 9000)
    if (isRefusal(raw)) {
      const del = deletedConcept()
      await idbSet(key, del)
      return del
    }
    const result = normalize(parseModelJSON(raw), totalT(a, b, w))
    await idbSet(key, result)
    return result
  } catch {
    // 5. 로컬 폴백
    const fb = fallbackGenerate(a, b, w)
    await idbSet(key, fb)
    return fb
  }
}

async function callProxy(messages: unknown[], timeoutMs: number): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: ctrl.signal,
    })
    if (!r.ok) throw new Error(`proxy ${r.status}`)
    const data = await r.json()
    return data.choices?.[0]?.message?.content ?? ''
  } finally {
    clearTimeout(timer)
  }
}

function buildMessages(a: Concept, b: Concept, w: WorldState) {
  const T = totalT(a, b, w)
  const rules = w.collapsed.map((p) => COLLAPSE_RULES[p])
  const roll =
    w.contaminants.length && Math.random() < 0.3
      ? w.contaminants[Math.floor(Math.random() * w.contaminants.length)]
      : null

  const system = `당신은 개념 조합 판정기다. 두 개념을 합쳐 새 개념 하나를 만든다.
반드시 JSON 객체 하나만 출력한다. 마크다운, 설명, 인사 금지.

[세계 상태]
무너진 범주의 규칙 — 결과 이름에 반드시 반영하라:
${rules.length ? rules.map((r) => '- ' + r).join('\n') : '- 없음. 평범하고 자연스러운 결과를 낼 것.'}
${roll ? `오염 지시: 결과 이름에 '${roll}'을(를) 자연스럽게 섞어라.` : ''}

[출력 형식]
{"name":"한국어 2~12자","emoji":"이모지 1개","chaos":0,"plausibility":0,"narrative":0,"contagion":0,"pillar":"substance|quantity|quality|time","contaminant":"명사 1개","chronicle":"등장 기록 한 문장. 건조한 행정 문체."}

[규칙]
- chaos+plausibility+narrative+contagion 합은 정확히 ${T}
- chaos: 세계의 규칙을 얼마나 어기는가
- plausibility: 그런데도 얼마나 그럴듯한가. 노골적으로 강해 보이려는 이름("무한","전능","신" 남발)은 반드시 낮게
- pillar: 이 개념이 흔드는 범주 하나
- 실존 국가·정치인·실존 인물 금지

[예시]
입력 A: 빵집, B: 숫자
{"name":"베이커리 4395호점","emoji":"🥐","chaos":${Math.round(T * 0.45)},"plausibility":${Math.round(T * 0.37)},"narrative":${Math.round(T * 0.1)},"contagion":${T - Math.round(T * 0.45) - Math.round(T * 0.37) - Math.round(T * 0.1)},"pillar":"quantity","contaminant":"지점번호","chronicle":"1호점부터 4394호점까지의 위치를 아는 자는 없다."}`

  return [
    { role: 'system', content: system },
    { role: 'user', content: `A: ${a.name}\nB: ${b.name}\n총량 T: ${T}` },
  ]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseModelJSON(text: string): any {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const s = cleaned.indexOf('{')
  const e = cleaned.lastIndexOf('}')
  if (s < 0 || e <= s) throw new Error('no json')
  return JSON.parse(cleaned.slice(s, e + 1))
}

const isRefusal = (t: string) =>
  /죄송|할 수 없|응답할 수|도와드릴 수 없|cannot|sorry|unable/i.test(t) &&
  !t.includes('{')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(r: any, T: number): GenResult {
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
  const keys = ['chaos', 'plausibility', 'narrative', 'contagion'] as const
  let vals = keys.map((k) => clamp(Math.round(Number(r[k]) || 0), 0, 100))
  const sum = vals.reduce((x, y) => x + y, 0) || 1
  vals = vals.map((v) => Math.round((v * T) / sum))
  vals[vals.indexOf(Math.max(...vals))] += T - vals.reduce((x, y) => x + y, 0)
  for (let i = 0; i < 4; i++) {
    if (vals[i] > 100) {
      const over = vals[i] - 100
      vals[i] = 100
      vals[vals.indexOf(Math.min(...vals))] += over
    }
  }
  const PILLARS = ['substance', 'quantity', 'quality', 'time'] as const
  return {
    name: String(r.name || '').slice(0, 20) || '이름 없는 것',
    emoji: String(r.emoji || '❔').slice(0, 4),
    chaos: vals[0],
    plausibility: vals[1],
    narrative: vals[2],
    contagion: vals[3],
    pillar: PILLARS.includes(r.pillar) ? r.pillar : PILLARS[Math.floor(Math.random() * 4)],
    contaminant: String(r.contaminant || '')
      .split(/\s/)[0]
      .slice(0, 8),
    chronicle: String(r.chronicle || '기록이 남지 않았다.').slice(0, 90),
  }
}

function deletedConcept(): GenResult {
  return {
    name: '███',
    emoji: '⬛',
    chaos: 0,
    plausibility: 0,
    narrative: 0,
    contagion: 0,
    pillar: 'substance',
    contaminant: '',
    chronicle: '이 개념은 세계에서 삭제되었다. 어떤 신도 기록을 보유하고 있지 않다.',
    deleted: true,
  }
}

/** 외부(데모 시드·가챠 변형)에서도 쓰는 폴백 생성기 */
export function fallbackGenerate(a: Concept, b: Concept, w: WorldState): GenResult {
  const seed = hashStr(pairKey(a.name, b.name))
  const rnd = mulberry32(seed)
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]

  let name = pick([`${a.name}${b.name}`, `${b.name} ${a.name}`, `${a.name}의 ${b.name}`])

  if (w.collapsed.includes('quality'))
    name = pick(['바삭한', '투명한', '매우 느린', '거대한', '접힌']) + ' ' + name
  if (w.collapsed.includes('time'))
    name = pick(['고대', '미래', '석기시대', '중세']) + ' ' + name
  if (w.collapsed.includes('quantity'))
    name += ` 제${100 + Math.floor(rnd() * 900)}호`
  if (w.collapsed.includes('substance') && rnd() < 0.4)
    name = name.split('').reverse().join('')

  if (w.contaminants.length && rnd() < 0.3) name = pick(w.contaminants) + ' ' + name

  const T = totalT(a, b, w)
  const c = Math.round(T * (0.25 + rnd() * 0.35))
  const p = Math.round(T * (0.2 + rnd() * 0.35))
  const n = Math.round((T - c - p) * rnd())

  return {
    name: name.slice(0, 20),
    emoji: rnd() < 0.5 ? a.emoji : b.emoji,
    chaos: c,
    plausibility: p,
    narrative: n,
    contagion: Math.max(0, T - c - p - n),
    pillar: pick(['substance', 'quantity', 'quality', 'time'] as const),
    contaminant: a.name.slice(0, 4),
    chronicle: pick([
      `${name}이(가) 목록에 추가되었다. 담당 신은 판정을 보류했다.`,
      `${name}의 등장이 접수되었다. 서류는 아직 처리되지 않았다.`,
      `${name}이(가) 확인되었다. 분류 항목은 공란이다.`,
    ]),
  }
}

/** 붕괴 변형만 이름에 적용 (가챠 풀용) */
export function applyCollapseName(name: string, collapsed: PillarKey[], seed: number): string {
  const rnd = mulberry32(seed)
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]
  let out = name
  if (collapsed.includes('quality'))
    out = pick(['바삭한', '투명한', '매우 느린', '거대한', '접힌']) + ' ' + out
  if (collapsed.includes('time'))
    out = pick(['고대', '미래', '석기시대', '중세']) + ' ' + out
  if (collapsed.includes('quantity'))
    out += ` 제${100 + Math.floor(rnd() * 900)}호`
  if (collapsed.includes('substance') && rnd() < 0.4)
    out = out.split('').reverse().join('')
  return out.slice(0, 20)
}

export function hashStr(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
