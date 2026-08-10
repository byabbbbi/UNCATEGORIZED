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

export type VaultGrade = 'registered' | 'caution' | 'unclassified'

export interface CanvasInstance {
  instanceId: string
  conceptId: string
  x: number
  y: number
}

export interface FxState {
  rejectInstanceId: string | null
  combining: null | {
    aId: string
    bId: string
    resultConceptId: string
    x: number
    y: number
    isDiscovery: boolean
  }
  sealFlash: boolean
  whiteFlash: boolean
  screenShake: number
  typingRule: string | null
  unclassifiedFx: boolean
  vaultOpen: boolean
  vaultReveal: null | { conceptId: string; grade: VaultGrade }
}

export function sealOf(concept: Concept): PillarKey {
  const scores: Record<PillarKey, number> = {
    substance: concept.narrative,
    quantity: concept.plausibility,
    quality: concept.chaos,
    time: concept.contagion,
  }
  return (Object.entries(scores) as [PillarKey, number][]).sort((a, b) => b[1] - a[1])[0][0]
}

export function gradeOf(concept: Concept): VaultGrade {
  if (concept.depth >= 4) return 'unclassified'
  if (concept.depth >= 2) return 'caution'
  return 'registered'
}

export function gradeDelayMs(grade: VaultGrade): number {
  if (grade === 'unclassified') return 2200
  if (grade === 'caution') return 1200
  return 600
}

export const SEAL_GLYPH: Record<PillarKey, string> = {
  substance: '實',
  quantity: '量',
  quality: '質',
  time: '時',
}

export const CARD_W = 96
export const CARD_H = 112
export const COMBINE_RADIUS = 70
export const ALTAR_R = 56
