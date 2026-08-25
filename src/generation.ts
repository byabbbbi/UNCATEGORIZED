import { get as idbGet, set as idbSet } from 'idb-keyval'
import PRELOAD from './data/preload.json'
import { HARD_TABLE, type HardEntry } from './data/combos'
import { COLLAPSE_RULES } from './data/rules'
import { PROXY_URL } from './config'
import { calcT } from './game/formulas'
import { isBadName } from './utils/nameQuality'
import {
  compactNameLength,
  limitConceptName,
  wordCount,
  MAX_NAME_COMPACT_LEN,
  MAX_NAME_WORDS,
} from './utils/nameLength'
import { josa } from './utils/josa'
import { firstGrapheme } from './utils/emoji'
import { PILLAR_KEYS, type Concept, type PillarKey } from './types'

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

export type GenSource = 'hard' | 'idb' | 'preload' | 'api' | 'fallback'

type GenDebugStats = {
  hard: number
  idb: number
  preload: number
  api: number
  fallback: number
  failures: number
  lastError: string
}

const listeners = new Set<() => void>()

export const genDebug: GenDebugStats = {
  hard: 0,
  idb: 0,
  preload: 0,
  api: 0,
  fallback: 0,
  failures: 0,
  lastError: '',
}

function notifyDebug() {
  listeners.forEach((fn) => fn())
}

function bumpSource(source: GenSource) {
  genDebug[source] += 1
  notifyDebug()
}

function recordFail(err: unknown) {
  genDebug.failures += 1
  genDebug.lastError =
    err instanceof Error ? err.message : String(err ?? 'unknown')
  notifyDebug()
}

export function subscribeGenDebug(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export const pairKey = (a: string, b: string) => [a, b].sort().join('+')

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

function hardResult(entry: HardEntry): GenResult {
  const name = limitConceptName(entry.name)
  return {
    name,
    emoji: firstGrapheme(entry.emoji),
    chaos: entry.chaos,
    plausibility: entry.plausibility,
    narrative: entry.narrative,
    contagion: entry.contagion,
    pillar: entry.pillar,
    contaminant: entry.contaminant ?? '',
    chronicle:
      entry.chronicle ??
      `${name}${josa(name, ['이', '가'])} 목록에 등재되었다.`,
  }
}

export function applyHardContamination(
  result: GenResult,
  contaminants: string[],
  seedKey: string,
): GenResult {
  const active = [...new Set(contaminants.filter(Boolean))].sort()
  if (!active.length) return result

  const rnd = mulberry32(hashStr(seedKey))
  if (rnd() >= 0.3) return result

  const contaminant = active[Math.floor(rnd() * active.length)]
  return {
    ...result,
    name: limitConceptName(`${contaminant} ${result.name}`),
  }
}

export async function generate(
  a: Concept,
  b: Concept,
  w: WorldState,
  owned: Set<string> = new Set(),
): Promise<GenResult> {
  const key = cacheKey(a.name, b.name, w)

  // 1. 하드코딩 테이블 (기둥이 무너지기 전까지 오염 여부와 무관)
  if (w.collapsed.length === 0) {
    const hard = HARD_TABLE[pairKey(a.name, b.name)]
    if (hard) {
      const base = hardResult(hard)
      if (w.contaminants.length > 0) {
        const result = applyHardContamination(base, w.contaminants, key)
        await idbSet(key, result)
        bumpSource('hard')
        return result
      }

      bumpSource('hard')
      return base
    }
  }

  // 2. IndexedDB 캐시
  const cached = await idbGet(key)
  if (cached) {
    bumpSource('idb')
    return cached as GenResult
  }

  // 3. 프리로드 캐시
  const pre = (PRELOAD as Record<string, GenResult>)[key]
  if (pre) {
    bumpSource('preload')
    await idbSet(key, pre)
    return pre
  }

  // 4. API (프록시 경유, 부적절 이름 시 1회 리롤)
  try {
    const T = totalT(a, b, w)
    const qualityCtx = {
      qualityCollapsed: w.collapsed.includes('quality'),
      relationCollapsed: w.collapsed.includes('relation'),
    }
    let raw = await callProxy(buildMessages(a, b, w), 20000)
    if (isRefusal(raw)) {
      const del = deletedConcept()
      await idbSet(key, del)
      bumpSource('api')
      return del
    }
    let result = normalize(parseModelJSON(raw), T)
    if (isBadName(result.name, a, b, qualityCtx)) {
      raw = await callProxy(buildMessages(a, b, w, result.name), 20000)
      if (isRefusal(raw)) {
        const fb = fallbackGenerate(a, b, w, owned)
        await idbSet(key, fb)
        bumpSource('fallback')
        return fb
      }
      result = normalize(parseModelJSON(raw), T)
      if (isBadName(result.name, a, b, qualityCtx)) {
        const fb = fallbackGenerate(a, b, w, owned)
        await idbSet(key, fb)
        bumpSource('fallback')
        return fb
      }
    }
    await idbSet(key, result)
    bumpSource('api')
    return result
  } catch (err) {
    recordFail(err)
    // 5. 로컬 폴백
    const fb = fallbackGenerate(a, b, w, owned)
    await idbSet(key, fb)
    bumpSource('fallback')
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

function exampleStats(T: number, chaosPct: number, plausPct: number, narrPct: number) {
  const c = Math.round(T * chaosPct)
  const p = Math.round(T * plausPct)
  const n = Math.round(T * narrPct)
  const g = T - c - p - n
  return { c, p, n, g }
}

function buildMessages(a: Concept, b: Concept, w: WorldState, rejectName?: string) {
  const T = totalT(a, b, w)
  const rules = w.collapsed.map((p) => COLLAPSE_RULES[p])
  const roll =
    w.contaminants.length && Math.random() < 0.3
      ? w.contaminants[Math.floor(Math.random() * w.contaminants.length)]
      : null

  const ex1 = exampleStats(T, 0.45, 0.37, 0.1)
  const ex2 = exampleStats(T, 0.31, 0.49, 0.12)
  const ex3 = exampleStats(T, 0.35, 0.45, 0.12)

  const system = `당신은 개념 조합 판정기다. 두 개념을 합쳐 새 개념 하나를 만든다.
반드시 JSON 객체 하나만 출력한다. 마크다운, 설명, 인사 금지.

[세계 상태]
무너진 범주의 규칙 — 결과 이름에 반드시 반영하라:
${rules.length ? rules.map((r) => '- ' + r).join('\n') : '- 없음. 평범하고 자연스러운 결과를 낼 것.'}
${roll ? `오염 지시: 결과 이름에 '${roll}'${josa(roll, ['을', '를'])} 자연스럽게 섞어라.` : ''}
${rejectName ? `\n직전 결과 '${rejectName}'${josa(rejectName, ['은', '는'])} 부적절했다. 더 평이하고 이해하기 쉬운 실존 명사로 다시 만들어라.` : ''}

[출력 형식]
{"name":"한국어 2~10자(공백 제외). 자연스러우면 띄어 써도 좋다. 최대 3어절","emoji":"이모지 정확히 1개. 두 개 이상 쓰지 마라","chaos":0,"plausibility":0,"narrative":0,"contagion":0,"pillar":"substance|quantity|quality|time|relation|place|state|action","contaminant":"명사 1개","chronicle":"등장 기록 한 문장. 건조한 행정 문체."}

[규칙]
- chaos+plausibility+narrative+contagion 합은 정확히 ${T}
- chaos: 세계의 규칙을 얼마나 어기는가
- plausibility: 그런데도 얼마나 그럴듯한가. 노골적으로 강해 보이려는 이름("무한","전능","신" 남발)은 반드시 낮게
- pillar: 이 개념이 흔드는 범주 하나
- 실존 국가·정치인·실존 인물 금지
- 실존하거나 즉시 이해 가능한 명사를 조합하라. 의미를 알 수 없는 조어·낱말 잇기를 만들지 마라
- 결과 이름에 두 입력의 단어를 모두 넣지 마라. 하나만 남기거나, 둘 다 버리고 새로운 사물명을 만들어라.
- 두 입력 이름을 그대로 이어붙인 결과는 실패로 간주한다
- A와 B가 같은 개념이면, 반복이 아니라 그것이 쌓이거나 심화된 하나의 사물을 만들어라 (점토+점토=벽돌)

[예시]
입력 A: 빵집, B: 숫자
{"name":"베이커리 4395호점","emoji":"🥐","chaos":${ex1.c},"plausibility":${ex1.p},"narrative":${ex1.n},"contagion":${ex1.g},"pillar":"quantity","contaminant":"지점번호","chronicle":"1호점부터 4394호점까지의 위치를 아는 자는 없다."}

입력 A: 점토, B: 점토
{"name":"벽돌","emoji":"🧱","chaos":${ex2.c},"plausibility":${ex2.p},"narrative":${ex2.n},"contagion":${ex2.g},"pillar":"substance","contaminant":"점토","chronicle":"점토가 쌓여 벽돌로 등재되었다. 규격은 추정이다."}

입력 A: 늪, B: 안개
{"name":"늪 안개","emoji":"🌫️","chaos":${ex3.c},"plausibility":${ex3.p},"narrative":${ex3.n},"contagion":${ex3.g},"pillar":"quality","contaminant":"습기","chronicle":"늪과 안개가 만나 늪 안개로 등재되었다. 농도는 추정이다."}`

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
  return {
    name: limitConceptName(String(r.name || '')) || '이름 없는 것',
    emoji: firstGrapheme(r.emoji),
    chaos: vals[0],
    plausibility: vals[1],
    narrative: vals[2],
    contagion: vals[3],
    pillar: PILLAR_KEYS.includes(r.pillar)
      ? r.pillar
      : PILLAR_KEYS[Math.floor(Math.random() * PILLAR_KEYS.length)],
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

const LEXICON = [
  '잿더미', '수맥', '석판', '유적', '서릿발', '불티', '늪', '종유석', '뿌리', '앙금',
  '여울', '벼랑', '돌기둥', '잔해', '티끌', '그을음', '무쇠', '옹이', '물마루', '자갈',
  '골짜기', '안개', '이끼', '진창', '화덕', '잔불', '물때', '소금기', '흙먼지', '바위턱',
  '웅덩이', '개펄', '모래톱', '돌무지', '흙벽', '우물', '도랑', '둑', '언덕', '벌판',
  '수풀', '덤불', '껍질', '씨앗', '줄기', '열매', '비늘', '뼈', '가루', '덩어리',
  '파편', '결정', '광맥', '광석', '쇳물', '층리', '단층', '균열', '구멍', '메아리',
  '울림', '침묵', '여운', '그늘', '서리', '이슬', '물보라', '불씨', '재층', '틈새',
]

const SAME_FORMS = ['무리', '층', '더미', '군집', '연쇄', '심층']
const PLACE_LEXICON = [
  '골짜기',
  '벼랑',
  '웅덩이',
  '개펄',
  '모래톱',
  '벌판',
  '언덕',
  '수풀',
  '도랑',
  '둑',
]
const MAX_FALLBACK_LEN = MAX_NAME_COMPACT_LEN

function fitsFallbackName(name: string): boolean {
  return compactNameLength(name) <= MAX_FALLBACK_LEN && wordCount(name) <= MAX_NAME_WORDS
}

/** "벽돌에서 난 대양" → "대양" */
function headNoun(name: string): string {
  const last = name.trim().split(/\s+/).pop() ?? name
  return last.replace(/[의를을이가과와은는에서속]$/u, '') || last
}

function pickUnusedLexicon(rnd: () => number, owned: Set<string>): string {
  const start = Math.floor(rnd() * LEXICON.length)
  for (let i = 0; i < LEXICON.length; i++) {
    const w = LEXICON[(start + i) % LEXICON.length]
    if (!owned.has(w)) return w
  }
  return `${LEXICON[start]} ${2 + Math.floor(rnd() * 90)}`
}

function fallbackName(
  a: Concept,
  b: Concept,
  rnd: () => number,
  owned: Set<string>,
): string {
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)]
  const ha = headNoun(a.name)
  const hb = headNoun(b.name)

  if (ha === hb) {
    const n = `${ha} ${pick(SAME_FORMS)}`
    return fitsFallbackName(n) ? n : pickUnusedLexicon(rnd, owned)
  }

  const joined = `${ha} ${hb}`
  if (fitsFallbackName(joined)) return joined
  const reversed = `${hb} ${ha}`
  if (fitsFallbackName(reversed)) return reversed

  // 결합이 길면 결합을 포기한다 — 여기가 폭주 차단점
  return pickUnusedLexicon(rnd, owned)
}

function fallbackChronicle(name: string, rnd: () => number): string {
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]
  const iga = josa(name, ['이', '가'])
  const eul = josa(name, ['을', '를'])
  const eun = josa(name, ['은', '는'])
  return pick([
    `${name}${iga} 목록에 추가되었다. 담당 신은 판정을 보류했다.`,
    `${name}의 등장이 접수되었다. 서류는 아직 처리되지 않았다.`,
    `${name}${iga} 확인되었다. 분류 항목은 공란이다.`,
    `${name}${iga} 등재되었다. 소관 부서는 미정이다.`,
    `${name}에 대한 이의 신청 기간이 지났다.`,
    `${name}${iga} 대장 여백에 기입되었다.`,
    `${name}${eun} 임시 번호로 관리된다. 정식 번호는 배정되지 않았다.`,
    `${name}의 존재가 보고되었다. 회신은 없었다.`,
    `${name}${iga} 접수되었다. 처리 기한은 명시되지 않았다.`,
    `${name}${eul} 어느 항목에 넣을지 논의가 있었다. 결론은 나지 않았다.`,
    `${name}${iga} 목록 끝에 붙었다. 순서에 의미는 없다.`,
    `${name}${iga} 기록되었다. 담당자는 서명하지 않았다.`,
  ])
}

/** 외부(데모 시드·가챠 변형)에서도 쓰는 폴백 생성기 */
export function fallbackGenerate(
  a: Concept,
  b: Concept,
  w: WorldState,
  owned: Set<string> = new Set(),
): GenResult {
  const seed = hashStr(pairKey(a.name, b.name))
  const rnd = mulberry32(seed)
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)]

  let name = fallbackName(a, b, rnd, owned)

  if (w.collapsed.includes('relation'))
    name = headNoun(a.name) + headNoun(b.name)

  if (w.collapsed.includes('quality'))
    name = pick(['바삭한', '투명한', '매우 느린', '거대한', '접힌']) + ' ' + name
  if (w.collapsed.includes('time'))
    name = pick(['고대', '미래', '석기시대', '중세']) + ' ' + name
  if (w.collapsed.includes('quantity'))
    name += ` 제${100 + Math.floor(rnd() * 900)}호`
  if (w.collapsed.includes('substance') && rnd() < 0.4)
    name = name.split('').reverse().join('')

  if (w.collapsed.includes('place')) name += ` ${pick(PLACE_LEXICON)}`
  if (w.collapsed.includes('state')) name += ' 주인'
  if (w.collapsed.includes('action')) {
    const actor = [...headNoun(name)].slice(0, 6).join('')
    name = `${actor}${josa(actor, ['이', '가'])} 남긴 것`
  }

  if (w.contaminants.length && rnd() < 0.3) name = pick(w.contaminants) + ' ' + name

  name = limitConceptName(name)

  const T = totalT(a, b, w)
  const c = Math.round(T * (0.25 + rnd() * 0.35))
  const p = Math.round(T * (0.2 + rnd() * 0.35))
  const n = Math.round((T - c - p) * rnd())

  return {
    name,
    emoji: firstGrapheme(rnd() < 0.5 ? a.emoji : b.emoji),
    chaos: c,
    plausibility: p,
    narrative: n,
    contagion: Math.max(0, T - c - p - n),
    pillar: pick(PILLAR_KEYS),
    contaminant: a.name.slice(0, 4),
    chronicle: fallbackChronicle(name, rnd),
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
  return limitConceptName(out)
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
