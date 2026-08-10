import type { Concept, Pillar } from '../types'

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
  },
]

export const INITIAL_PILLARS: Pillar[] = [
  { key: 'substance', stability: 100 },
  { key: 'quantity', stability: 100 },
  { key: 'quality', stability: 100 },
  { key: 'time', stability: 100 },
]

export const PILLAR_LABELS: Record<Pillar['key'], string> = {
  substance: '실체',
  quantity: '양',
  quality: '질',
  time: '시간',
}

export const PILLAR_GODS: Record<Pillar['key'], string> = {
  substance: '실재의 신',
  quantity: '측정의 신',
  quality: '본질의 신',
  time: '영겁의 신',
}

/** 기둥 붕괴 시 collapsedRules에 들어가는 생성 규칙 */
export const PILLAR_RULES: Record<Pillar['key'], string> = {
  substance: '실체가 부서진다 — 이름 없는 형태가 세계를 채운다.',
  quantity: '양적 질서가 붕괴한다 — 하나와 무한이 구별되지 않는다.',
  quality: '질이 뒤집힌다 — 아름답고 추한 것이 같은 말을 쓴다.',
  time: '시간이 풀린다 — 전후가 동시에 선포된다.',
}

export const MAX_PROCLAMATIONS_PER_ERA = 3
export const MAX_ERA = 6
