export type PillarKey = 'substance' | 'quantity' | 'quality' | 'time'

export interface Concept {
  id: string
  name: string
  emoji: string
  chaos: number
  plausibility: number
  narrative: number
  contagion: number
  depth: number
  pillar: PillarKey
  contaminant?: string
  deleted?: boolean
}

export interface Pillar {
  key: PillarKey
  stability: number
}

export interface ChronicleEntry {
  id: string
  era: number
  text: string
}

export type VaultGrade =
  | 'registered'
  | 'suspended'
  | 'injudicable'
  | 'uncategorized'

export interface CanvasInstance {
  instanceId: string
  conceptId: string
  x: number
  y: number
}

export type EndingKind = 'blank' | 'indistinct' | 'classified' | null

export type ScreenMode = 'title' | 'play' | 'ending'

export interface FxState {
  rejectInstanceId: string | null
  combining: null | {
    aId: string
    bId: string
    resultConceptId: string | null
    x: number
    y: number
    isDiscovery: boolean
    loading: boolean
  }
  sealFlash: boolean
  whiteFlash: boolean
  screenShake: number
  typingRule: string | null
  unclassifiedFx: boolean
  vaultOpen: boolean
  vaultReveal: null | { conceptId: string; grade: VaultGrade }
  godLine: string | null
  inputLocked: boolean
}

export function sealOf(concept: Concept): PillarKey {
  if (concept.pillar) return concept.pillar
  const scores: Record<PillarKey, number> = {
    substance: concept.narrative,
    quantity: concept.plausibility,
    quality: concept.chaos,
    time: concept.contagion,
  }
  return (Object.entries(scores) as [PillarKey, number][]).sort((a, b) => b[1] - a[1])[0][0]
}

export function gradeDelayMs(grade: VaultGrade): number {
  if (grade === 'uncategorized') return 2200
  if (grade === 'injudicable') return 1400
  if (grade === 'suspended') return 900
  return 600
}

/** 유럽식 열람 도장 약호 */
export const SEAL_GLYPH: Record<PillarKey, string> = {
  substance: 'Sb',
  quantity: 'Qn',
  quality: 'Ql',
  time: 'Tp',
}

export const CARD_W = 96
export const CARD_H = 112
export const COMBINE_RADIUS = 70
export const ALTAR_R = 56

/** 게이지 구간: 심판 / 궤변 / 사임 */
export function pillarPhase(
  stability: number,
): 'judge' | 'sophistry' | 'resign' {
  if (stability <= 10) return 'resign'
  if (stability <= 40) return 'sophistry'
  return 'judge'
}
