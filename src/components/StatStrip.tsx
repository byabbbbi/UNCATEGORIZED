import { calcD, calcCoherenceLoss } from '../game/formulas'
import { PILLAR_KO, PILLAR_LATIN } from '../data/initial'
import { useGameStore } from '../store/gameStore'
import { sealOf } from '../types'
import './StatStrip.css'

export function StatStrip() {
  const hoverConceptId = useGameStore((s) => s.hoverConceptId)
  const selectedInstanceId = useGameStore((s) => s.selectedInstanceId)
  const instances = useGameStore((s) => s.instances)
  const concepts = useGameStore((s) => s.concepts)

  const selectedConceptId = instances.find((i) => i.instanceId === selectedInstanceId)?.conceptId
  const id = selectedConceptId ?? hoverConceptId ?? null
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
  const pillar = sealOf(concept)
  const children = concepts.filter((child) =>
    child.parents?.includes(concept.name),
  )
  const visibleChildren = children.slice(0, 5)
  const extraChildren = children.length - visibleChildren.length
  const origin = concept.parents
    ? `${concept.parents[0]} + ${concept.parents[1]}에서 태어남`
    : concept.bornAt
      ? '분실물 보관소에서 회수됨'
      : '태초부터 있었음'
  const born = concept.bornAt
    ? `제${concept.bornAt.era}시대 · 붕괴 ${concept.bornAt.collapsed}개 · ${
        concept.bornAt.contaminant
          ? `오염 「${concept.bornAt.contaminant}」`
          : '오염 없음'
      }`
    : '세계 개시 기록 · 오염 없음'

  return (
    <div className="stat-strip">
      <div className="stat-strip__summary">
        <strong>
          {concept.emoji} {concept.name}
        </strong>
        <span>
          {concept.deleted ? '검열됨 · ' : ''}혼돈 {concept.chaos} · 개연{' '}
          {concept.plausibility} · 파괴력 {D.toFixed(1)} · 깊이 {concept.depth}
        </span>
        <span className="stat-strip__arrow">
          → {PILLAR_LATIN[pillar]} · {PILLAR_KO[pillar]} · 정합성 −
          {loss.toFixed(1)}
        </span>
      </div>
      <div className="stat-strip__record">
        <span>
          <b>부모</b> {origin}
        </span>
        <span>
          <b>발견 당시</b> {born}
        </span>
        <span>
          <b>파생</b>{' '}
          {visibleChildren.length
            ? `${visibleChildren.map((child) => child.name).join(' · ')}${
                extraChildren > 0 ? ` 외 ${extraChildren}개` : ''
              }`
            : '아직 없음'}
        </span>
      </div>
      <p className="stat-strip__chronicle">
        {concept.chronicle ?? '이 개념에 관한 별도 기록은 남지 않았다.'}
      </p>
    </div>
  )
}
