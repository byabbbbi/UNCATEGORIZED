import { PILLAR_KEYS, type Concept, type Pillar, type PillarKey } from '../types'

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
    chronicle: '공허는 태초부터 대장의 첫 장에 있었다.',
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
    chronicle: '불꽃은 태초부터 꺼지지 않은 채 등록되어 있었다.',
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
    chronicle: '점토는 태초부터 형상을 기다리고 있었다.',
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
    chronicle: '조류는 태초부터 되돌아오는 것으로 기록되었다.',
  },
]

export const INITIAL_PILLARS: Pillar[] = PILLAR_KEYS.map((key) => ({
  key,
  stability: 100,
}))

/** 라틴 대문자 — UI 기둥·도장·제단·타이틀 전용 */
export const PILLAR_LATIN: Record<PillarKey, string> = {
  substance: 'SUBSTANTIA',
  quantity: 'QUANTITAS',
  quality: 'QUALITAS',
  time: 'TEMPUS',
  relation: 'RELATIO',
  place: 'LOCUS',
  state: 'HABITUS',
  action: 'ACTIO',
}

/** 한국어 병기 */
export const PILLAR_KO: Record<PillarKey, string> = {
  substance: '실재',
  quantity: '측정',
  quality: '본질',
  time: '영겁',
  relation: '인연',
  place: '좌표',
  state: '소유',
  action: '인과',
}

/** @deprecated PILLAR_KO 사용. 호환용 별칭 */
export const PILLAR_LABELS = PILLAR_KO

export const PILLAR_GODS: Record<PillarKey, string> = {
  substance: '실재의 신',
  quantity: '측정의 신',
  quality: '본질의 신',
  time: '영겁의 신',
  relation: '인연의 신',
  place: '좌표의 신',
  state: '소유의 신',
  action: '인과의 신',
}

export const PILLAR_QUESTIONS: Record<PillarKey, string> = {
  substance: '이것은 무엇인가',
  quantity: '이것은 얼마나 있는가',
  quality: '이것은 어떠한가',
  time: '이것은 언제 있는가',
  relation: '이것은 무엇과 이어지는가',
  place: '이것은 어디에 있는가',
  state: '이것은 무엇을 지니는가',
  action: '무엇이 무엇에게 하는가',
}

export const MAX_PROCLAMATIONS_PER_ERA = 3
export const MAX_ERA = 6
export const INDISTINCT_COLLAPSE_THRESHOLD = 6
