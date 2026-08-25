import type { Concept, PillarKey } from '../types'
import { fallbackGenerate, hashStr, type WorldState } from '../generation'
import { INITIAL_CONCEPTS } from './initial'
import { COLLAPSE_RULES } from './rules'
import { firstGrapheme } from '../utils/emoji'

export const DEMO_SAVE = {
  era: 4,
  coherence: 62,
  shards: 10,
  declaresLeft: 3,
  collapsed: ['quantity', 'quality'] as PillarKey[],
  contaminantCounts: { 먼지: 3 } as Record<string, number>,
  pillars: { substance: 34, quantity: 0, quality: 0, time: 51 } as Record<
    PillarKey,
    number
  >,
  concepts: [
    '공허',
    '불꽃',
    '점토',
    '조류',
    '증기 제217호',
    '바삭한 심연',
    '매우 느린 벽돌',
    '진흙 왕조 제58호',
    '투명한 불꽃',
    '먼지 대성당 제9호',
  ],
}

const DEMO_EMOJIS = ['⬛', '🔥', '🧱', '💧', '💨', '🌊', '🧱', '🗿', '🔥', '🏛️']

/** 데모 세이브용 개념 목록 — fallbackGenerate 로지으로 스탯 시드 */
export function buildDemoConcepts(): Concept[] {
  const base = INITIAL_CONCEPTS
  const w: WorldState = {
    collapsed: [...DEMO_SAVE.collapsed],
    contaminants: Object.entries(DEMO_SAVE.contaminantCounts)
      .filter(([, n]) => n >= 3)
      .map(([k]) => k),
    era: DEMO_SAVE.era,
  }

  return DEMO_SAVE.concepts.map((name, i) => {
    const found = base.find((c) => c.name === name)
    if (found) return { ...found }

    const a = base[i % base.length]
    const b = base[(i + 1) % base.length]
    const gen = fallbackGenerate(a, b, w)
    const seed = hashStr(name + String(i))
    return {
      id: `demo-${seed.toString(36)}`,
      name,
      emoji: firstGrapheme(DEMO_EMOJIS[i] ?? gen.emoji),
      chaos: gen.chaos,
      plausibility: gen.plausibility,
      narrative: gen.narrative,
      contagion: gen.contagion,
      depth: 1 + (i % 3),
      pillar: gen.pillar,
      contaminant: gen.contaminant || (i === 9 ? '먼지' : undefined),
    }
  })
}

export function demoCollapsedRules(): string[] {
  return DEMO_SAVE.collapsed.map((p) => COLLAPSE_RULES[p])
}
