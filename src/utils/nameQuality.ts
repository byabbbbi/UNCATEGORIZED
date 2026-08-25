import { HARD_TABLE } from '../data/combos'
import { GACHA_POOL } from '../data/gachaPool'
import { INITIAL_CONCEPTS } from '../data/initial'
import type { Concept } from '../types'
import { normalizeConceptName, compactNameLength, MAX_NAME_COMPACT_LEN } from './nameLength'

const LEXICON = [
  '잿더미', '수맥', '석판', '유적', '서릿발', '불티', '늪', '종유석', '뿌리', '앙금',
  '여울', '벼랑', '돌기둥', '잔해', '티끌', '그을음', '무쇠', '옹이', '물마루', '자갈',
  '골짜기', '안개', '이끼', '진창', '화덕', '잔불', '물때', '소금기', '흙먼지', '바위턱',
  '웅덩이', '개펄', '모래톱', '돌무지', '흙벽', '우물', '도랑', '둑', '언덕', '벌판',
  '수풀', '덤불', '껍질', '씨앗', '줄기', '열매', '비늘', '뼈', '가루', '덩어리',
  '파편', '결정', '광맥', '광석', '쇳물', '층리', '단층', '균열', '구멍', '메아리',
  '울림', '침묵', '여운', '그늘', '서리', '이슬', '물보라', '불씨', '재층', '틈새',
]

/** QUALITAS 붕괴 후 허용 수식어 — 품질 필터가 붕괴 메커니즘을 막지 않도록 */
const QUALITY_MODIFIERS = [
  '바삭한', '투명한', '매우 느린', '거대한', '접힌',
  '고대', '미래', '석기시대', '중세',
]

const GIBBERISH_BLOCKLIST = /기라|화연|연지/

function buildKnownNouns(): Set<string> {
  const set = new Set<string>()
  for (const w of LEXICON) set.add(w)
  for (const c of INITIAL_CONCEPTS) set.add(c.name)
  for (const entry of Object.values(HARD_TABLE)) set.add(entry.name)
  for (const pool of Object.values(GACHA_POOL)) {
    for (const g of pool) set.add(g.name)
  }
  return set
}

const KNOWN_NOUNS = buildKnownNouns()

/** "벽돌에서 난 대양" → "대양" */
export function headNoun(name: string): string {
  const last = name.trim().split(/\s+/).pop() ?? name
  return last.replace(/[의를을이가과와은는에서속]$/u, '') || last
}

function stripQualityPrefixes(name: string): string {
  let out = name.trim()
  for (const mod of QUALITY_MODIFIERS) {
    if (out.startsWith(mod + ' ')) out = out.slice(mod.length + 1)
  }
  return out
}

function isConcatenation(name: string, a: Concept, b: Concept): boolean {
  const compact = name.replace(/\s/g, '')
  const ha = headNoun(a.name)
  const hb = headNoun(b.name)
  if (a.name === b.name) {
    const doubled = ha + ha
    return compact === doubled || compact === a.name + a.name || compact === ha + ha
  }
  return (
    compact === ha + hb ||
    compact === hb + ha ||
    compact === a.name + b.name ||
    compact === b.name + a.name
  )
}

function knownCoverage(name: string): number {
  const core = name.replace(/\s/g, '')
  if (!core.length) return 0
  let covered = 0
  for (const known of KNOWN_NOUNS) {
    if (known.length < 2) continue
    if (name.includes(known)) covered += known.length
  }
  return Math.min(1, covered / core.length)
}

function hasInputLink(name: string, a: Concept, b: Concept): boolean {
  if (a.name === b.name) return true
  const ha = headNoun(a.name)
  const hb = headNoun(b.name)
  return name.includes(ha) || name.includes(hb) || name.includes(a.name) || name.includes(b.name)
}

function hasWeirdChars(name: string): boolean {
  const allowed = name.replace(/[가-힣0-9\s제호]/g, '')
  return allowed.length > 1
}

export interface NameQualityContext {
  qualityCollapsed?: boolean
}

/** true = 부적절 → 리롤 또는 폴백 */
export function isBadName(
  name: string,
  a: Concept,
  b: Concept,
  ctx: NameQualityContext = {},
): boolean {
  const trimmed = normalizeConceptName(name)
  if (!trimmed) return true

  if (compactNameLength(trimmed) > MAX_NAME_COMPACT_LEN) return true

  if (GIBBERISH_BLOCKLIST.test(trimmed)) return true

  if (isConcatenation(trimmed, a, b)) return true

  if (hasWeirdChars(trimmed)) return true

  const qualityCollapsed = ctx.qualityCollapsed ?? false
  const checkName = qualityCollapsed ? stripQualityPrefixes(trimmed) : trimmed

  if (qualityCollapsed) {
    if (knownCoverage(checkName) < 0.25 && checkName.replace(/\s/g, '').length > 6) return true
    return false
  }

  if (!hasInputLink(checkName, a, b) && knownCoverage(checkName) < 0.55) return true

  if (knownCoverage(checkName) < 0.45 && checkName.replace(/\s/g, '').length > 4) return true

  return false
}

export function comboDepth(a: Concept, b: Concept): number {
  return Math.max(a.depth, b.depth) + 1
}
