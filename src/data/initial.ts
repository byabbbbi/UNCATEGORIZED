import type { Concept, Pillar, PillarKey } from '../types'

export const INITIAL_CONCEPTS: Concept[] = [
  {
    id: 'void',
    name: '공허',
    emoji: '⬛',
    chaos: 60,
    plausibility: 20,
    narrative: 30,
    contagion: 25,
    depth: 0,
    pillar: 'substance',
  },
  {
    id: 'spark',
    name: '불꽃',
    emoji: '🔥',
    chaos: 55,
    plausibility: 45,
    narrative: 40,
    contagion: 35,
    depth: 0,
    pillar: 'quality',
  },
  {
    id: 'clay',
    name: '점토',
    emoji: '🧱',
    chaos: 20,
    plausibility: 70,
    narrative: 35,
    contagion: 15,
    depth: 0,
    pillar: 'substance',
  },
  {
    id: 'tide',
    name: '조류',
    emoji: '💧',
    chaos: 40,
    plausibility: 55,
    narrative: 45,
    contagion: 30,
    depth: 0,
    pillar: 'time',
  },
]

export const INITIAL_PILLARS: Pillar[] = [
  { key: 'substance', stability: 100 },
  { key: 'quantity', stability: 100 },
  { key: 'quality', stability: 100 },
  { key: 'time', stability: 100 },
]

/** 라틴 대문자 — UI 기둥·도장·제단·타이틀 전용 */
export const PILLAR_LATIN: Record<PillarKey, string> = {
  substance: 'SUBSTANTIA',
  quantity: 'QUANTITAS',
  quality: 'QUALITAS',
  time: 'TEMPUS',
}

/** 한국어 병기 */
export const PILLAR_KO: Record<PillarKey, string> = {
  substance: '실재',
  quantity: '측정',
  quality: '본질',
  time: '영겁',
}

/** @deprecated PILLAR_KO 사용. 호환용 별칭 */
export const PILLAR_LABELS = PILLAR_KO

export const PILLAR_GODS: Record<PillarKey, string> = {
  substance: '실재의 신',
  quantity: '측정의 신',
  quality: '본질의 신',
  time: '영겁의 신',
}

export const MAX_PROCLAMATIONS_PER_ERA = 3
export const MAX_ERA = 6
