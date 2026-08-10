import { calcD, calcCoherenceLoss } from '../game/formulas'
import { PILLAR_GODS } from '../data/initial'
import { useGameStore } from '../store/gameStore'
import { sealOf } from '../types'
import './StatStrip.css'

export function StatStrip() {
  const hoverConceptId = useGameStore((s) => s.hoverConceptId)
  const selectedInstanceId = useGameStore((s) => s.selectedInstanceId)
  const instances = useGameStore((s) => s.instances)
  const concepts = useGameStore((s) => s.concepts)

  const selectedConceptId = instances.find((i) => i.instanceId === selectedInstanceId)?.conceptId
  const id = hoverConceptId ?? selectedConceptId ?? null
  const concept = concepts.find((c) => c.id === id)

  if (!concept) {
    return (
      <div className="stat-strip is-empty">
        <span>개념을 고르거나 올려두면 수치가 표시됩니다</span>
      </div>
    )
  }

  const D = calcD(concept.chaos, concept.plausibility)
  const loss = calcCoherenceLoss(concept.chaos, concept.plausibility)
  const god = PILLAR_GODS[sealOf(concept)]

  return (
    <div className="stat-strip">
      <span>
        혼돈 {concept.chaos} · 개연 {concept.plausibility} · 파괴력 {D.toFixed(1)} · 깊이{' '}
        {concept.depth}
      </span>
      <span className="stat-strip__arrow">
        → {god} · 정합성 −{loss.toFixed(1)}
      </span>
    </div>
  )
}
