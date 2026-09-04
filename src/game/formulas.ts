import type { Concept } from '../types'

/** T = min(60 + depth*12, 80 + era*20) — 후속 AI 임계용, 1단계에서 표시 */
export function calcT(depth: number, era: number): number {
  return Math.min(60 + depth * 12, 80 + era * 20)
}

/** D = chaos * plausibility / 100 */
export function calcD(chaos: number, plausibility: number): number {
  return (chaos * plausibility) / 100
}

/** coherenceLoss = 4 + max(0, chaos - plausibility) / 4 */
export function calcCoherenceLoss(chaos: number, plausibility: number): number {
  return 4 + Math.max(0, chaos - plausibility) / 4
}

export function calcProclaimImpact(concept: Concept) {
  const D = calcD(concept.chaos, concept.plausibility)
  const coherenceLoss = calcCoherenceLoss(concept.chaos, concept.plausibility)
  // 선포가 파편 경제의 중심이 되도록, 파괴력의 1/3을 보상한다.
  // D 자체와 정합성 공식은 건드리지 않는다.
  const shardsGained = Math.floor(D / 3)
  return { D, coherenceLoss, shardsGained }
}
