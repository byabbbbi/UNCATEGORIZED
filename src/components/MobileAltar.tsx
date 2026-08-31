import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { AnimatedNumber } from './AnimatedNumber'
import {
  MAX_PROCLAMATIONS_PER_ERA,
  PILLAR_KO,
  PILLAR_LATIN,
  PILLAR_QUESTIONS,
} from '../data/initial'
import { COLLAPSE_RULES } from '../data/rules'
import { getEraDMultiplier } from '../data/balance'
import { calcCoherenceLoss, calcD } from '../game/formulas'
import { useGameStore } from '../store/gameStore'
import { pillarPhase, type PillarKey } from '../types'
import './MobileAltar.css'

const PHASE_LABEL = {
  judge: '심판',
  sophistry: '궤변',
  resign: '사임',
} as const

function MobilePillar({
  pillarKey,
  stability,
  selected,
  onSelect,
}: {
  pillarKey: PillarKey
  stability: number
  selected: boolean
  onSelect: () => void
}) {
  const collapsed = stability <= 0
  const [detailOpen, setDetailOpen] = useState(false)
  const gesture = useRef<{
    x: number
    y: number
    longPressed: boolean
    timer: ReturnType<typeof setTimeout>
  } | null>(null)

  const clearGesture = () => {
    if (gesture.current) clearTimeout(gesture.current.timer)
    gesture.current = null
  }

  useEffect(() => clearGesture, [])

  return (
    <li className={`mobile-pillar${collapsed ? ' is-collapsed' : ''}`}>
      <button
        type="button"
        className={selected ? 'is-selected' : ''}
        disabled={collapsed}
        aria-pressed={selected}
        onPointerDown={(event) => {
          if (collapsed) return
          const next = {
            x: event.clientX,
            y: event.clientY,
            longPressed: false,
            timer: setTimeout(() => {
              next.longPressed = true
              setDetailOpen((open) => !open)
              navigator.vibrate?.(12)
            }, 400),
          }
          gesture.current = next
        }}
        onPointerMove={(event) => {
          const active = gesture.current
          if (!active) return
          if (Math.hypot(event.clientX - active.x, event.clientY - active.y) >= 8) {
            clearGesture()
          }
        }}
        onPointerUp={() => {
          if (gesture.current) clearTimeout(gesture.current.timer)
        }}
        onPointerCancel={clearGesture}
        onClick={() => {
          const longPressed = gesture.current?.longPressed
          gesture.current = null
          if (!longPressed) onSelect()
        }}
      >
        <span className="mobile-pillar__marker" aria-hidden>
          {selected ? '▸' : '·'}
        </span>
        <strong>{PILLAR_LATIN[pillarKey]}</strong>
        <span>{PILLAR_KO[pillarKey]}</span>
        <em>
          <AnimatedNumber value={stability} digits={0} />
        </em>
      </button>
      {collapsed && (
        <p className="mobile-pillar__rule">{COLLAPSE_RULES[pillarKey]}</p>
      )}
      {detailOpen && !collapsed && (
        <p className="mobile-pillar__detail">
          “{PILLAR_QUESTIONS[pillarKey]}” · {PHASE_LABEL[pillarPhase(stability)]}{' '}
          단계
        </p>
      )}
    </li>
  )
}

export function MobileAltar() {
  const instances = useGameStore((s) => s.instances)
  const concepts = useGameStore((s) => s.concepts)
  const pillars = useGameStore((s) => s.pillars)
  const era = useGameStore((s) => s.era)
  const selectedInstanceId = useGameStore((s) => s.selectedInstanceId)
  const targetPillar = useGameStore((s) => s.targetPillar)
  const proclamationsThisEra = useGameStore((s) => s.proclamationsThisEra)
  const locked = useGameStore((s) => s.fx.inputLocked)
  const selectInstance = useGameStore((s) => s.selectInstance)
  const setTargetPillar = useGameStore((s) => s.setTargetPillar)
  const proclaimInstance = useGameStore((s) => s.proclaimInstance)

  const available = instances.filter((instance) => !instance.processing)
  const selectedInstance = available.find(
    (instance) => instance.instanceId === selectedInstanceId,
  )
  const selectedConcept = concepts.find(
    (concept) => concept.id === selectedInstance?.conceptId,
  )
  const remaining = Math.max(
    0,
    MAX_PROCLAMATIONS_PER_ERA - proclamationsThisEra,
  )
  const selectedPillar = pillars.find((pillar) => pillar.key === targetPillar)
  const canProclaim =
    !!selectedInstance &&
    !!selectedConcept &&
    !selectedConcept.deleted &&
    !!targetPillar &&
    !!selectedPillar &&
    selectedPillar.stability > 0 &&
    remaining > 0 &&
    !locked
  const destruction = selectedConcept
    ? calcD(selectedConcept.chaos, selectedConcept.plausibility) *
      getEraDMultiplier(era)
    : null
  const coherenceLoss = selectedConcept
    ? calcCoherenceLoss(selectedConcept.chaos, selectedConcept.plausibility)
    : null

  return (
    <section className="mobile-altar-screen" aria-label="제단">
      <section className="mobile-altar__cards">
        <header>
          <h2>선포할 카드 선택</h2>
          <span>{available.length}장</span>
        </header>
        <div className="mobile-altar__card-rail">
          {available.map((instance) => {
            const concept = concepts.find((item) => item.id === instance.conceptId)
            if (!concept) return null
            return (
              <button
                key={instance.instanceId}
                type="button"
                className={selectedInstanceId === instance.instanceId ? 'is-selected' : ''}
                disabled={!!concept.deleted || locked}
                onClick={() => selectInstance(instance.instanceId)}
              >
                <span aria-hidden>{concept.emoji}</span>
                <strong>{concept.name}</strong>
              </button>
            )
          })}
          {available.length === 0 && <p>공방에 선포할 카드가 없다.</p>}
        </div>
      </section>

      <section className="mobile-altar__impact" aria-live="polite">
        <div>
          <span>파괴력</span>
          <strong>{destruction === null ? '—' : destruction.toFixed(1)}</strong>
        </div>
        <div>
          <span>정합성</span>
          <strong>{coherenceLoss === null ? '—' : `−${coherenceLoss.toFixed(1)}`}</strong>
        </div>
      </section>

      <section className="mobile-altar__targets">
        <header>
          <h2>대상 기둥</h2>
          <span>길게 눌러 신의 질문 보기</span>
        </header>
        <ul>
          {pillars.map((pillar) => (
            <MobilePillar
              key={pillar.key}
              pillarKey={pillar.key}
              stability={pillar.stability}
              selected={targetPillar === pillar.key}
              onSelect={() => setTargetPillar(pillar.key)}
            />
          ))}
        </ul>
      </section>

      <footer className="mobile-altar__declare">
        <p>
          {remaining > 0 ? `남은 선포 ${remaining}회` : '선포를 모두 사용했다 · 시대 마감을 권장한다'}
        </p>
        <motion.button
          type="button"
          whileTap={canProclaim ? { scale: 0.985 } : undefined}
          disabled={!canProclaim}
          onClick={() => selectedInstance && proclaimInstance(selectedInstance.instanceId)}
        >
          선 포 하 다
        </motion.button>
      </footer>
    </section>
  )
}
