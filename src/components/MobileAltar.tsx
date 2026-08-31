import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { AnimatedNumber } from './AnimatedNumber'
import { GameGlyph } from './GameGlyph'
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
import { vibrateMobile } from '../mobileFeedback'
import { sfx } from '../sfx'
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
  previewDamage,
  onSelect,
}: {
  pillarKey: PillarKey
  stability: number
  selected: boolean
  previewDamage: number | null
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
    <li className={`mobile-pillar${collapsed ? ' is-collapsed' : ''}${selected ? ' is-selected' : ''}`}>
      <button
        type="button"
        data-pillar-key={pillarKey}
        disabled={collapsed}
        aria-pressed={selected}
        aria-label={`${PILLAR_LATIN[pillarKey]} ${PILLAR_KO[pillarKey]}, 안정도 ${Math.round(stability)}`}
        onPointerDown={(event) => {
          if (collapsed) return
          const next = {
            x: event.clientX,
            y: event.clientY,
            longPressed: false,
            timer: setTimeout(() => {
              next.longPressed = true
              setDetailOpen((open) => !open)
              vibrateMobile(12)
            }, 400),
          }
          gesture.current = next
        }}
        onPointerMove={(event) => {
          const active = gesture.current
          if (!active) return
          if (Math.hypot(event.clientX - active.x, event.clientY - active.y) >= 8) clearGesture()
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
        <span className="mobile-pillar__stone" aria-hidden>
          <GameGlyph kind="pillar" pillar={pillarKey} />
        </span>
        <span className="mobile-pillar__identity">
          <strong>{PILLAR_LATIN[pillarKey]}</strong>
          <span>{PILLAR_KO[pillarKey]}</span>
        </span>
        <span className="mobile-pillar__stability">
          <i style={{ width: `${Math.max(0, Math.min(100, stability))}%` }} />
          <em><AnimatedNumber value={stability} digits={0} /></em>
        </span>
        {selected && previewDamage !== null && (
          <motion.span
            className="mobile-pillar__preview"
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
          >
            −{previewDamage.toFixed(1)}
          </motion.span>
        )}
        <span className="mobile-pillar__crack" aria-hidden />
      </button>
      {collapsed && <p className="mobile-pillar__rule">{COLLAPSE_RULES[pillarKey]}</p>}
      {detailOpen && !collapsed && (
        <p className="mobile-pillar__detail">
          “{PILLAR_QUESTIONS[pillarKey]}”<br />
          <span>{PHASE_LABEL[pillarPhase(stability)]} 단계</span>
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
  const fx = useGameStore((s) => s.fx)
  const locked = fx.inputLocked
  const selectInstance = useGameStore((s) => s.selectInstance)
  const setTargetPillar = useGameStore((s) => s.setTargetPillar)
  const proclaimInstance = useGameStore((s) => s.proclaimInstance)
  const targetListRef = useRef<HTMLUListElement>(null)
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdCompleted = useRef(false)
  const [holding, setHolding] = useState(false)
  const [holdHint, setHoldHint] = useState(false)
  const [reducedConfirm, setReducedConfirm] = useState(false)

  const available = instances.filter((instance) => !instance.processing)
  const selectedInstance = available.find((instance) => instance.instanceId === selectedInstanceId)
  const selectedConcept = concepts.find((concept) => concept.id === selectedInstance?.conceptId)
  const remaining = Math.max(0, MAX_PROCLAMATIONS_PER_ERA - proclamationsThisEra)
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
    ? calcD(selectedConcept.chaos, selectedConcept.plausibility) * getEraDMultiplier(era)
    : null
  const coherenceLoss = selectedConcept
    ? calcCoherenceLoss(selectedConcept.chaos, selectedConcept.plausibility)
    : null
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const proclaimReason = !selectedInstance
    ? '먼저 봉헌할 카드를 고르세요'
    : !targetPillar
      ? '응답을 구할 비석을 고르세요'
      : !selectedPillar || selectedPillar.stability <= 0
        ? '무너지지 않은 비석을 고르세요'
        : remaining <= 0
          ? '선포를 모두 사용했습니다 · 시대 마감을 권장합니다'
          : locked
            ? '판정이 진행 중입니다'
            : reducedConfirm
              ? '인장을 한 번 더 탭하면 선포합니다'
              : holdHint
                ? '인장을 꾹 눌러 선포합니다'
                : `남은 선포 ${remaining}회`

  useEffect(() => {
    if (!targetPillar) return
    const selected = targetListRef.current?.querySelector<HTMLElement>(
      `[data-pillar-key="${targetPillar}"]`,
    )
    selected?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [targetPillar, reduceMotion])

  useEffect(
    () => () => {
      if (holdRef.current) window.clearTimeout(holdRef.current)
    },
    [],
  )

  useEffect(() => {
    holdCompleted.current = false
    setHoldHint(false)
    setReducedConfirm(false)
  }, [selectedInstanceId, targetPillar])

  const clearHold = () => {
    if (holdRef.current) window.clearTimeout(holdRef.current)
    holdRef.current = null
    setHolding(false)
  }

  const finishProclamation = () => {
    if (!selectedInstance || holdCompleted.current) return
    holdCompleted.current = true
    clearHold()
    proclaimInstance(selectedInstance.instanceId)
    setReducedConfirm(false)
  }

  return (
    <section className={`mobile-altar-screen${fx.sealFlash ? ' is-striking' : ''}`} aria-label="제단">
      <header className="mobile-altar__offering-head">
        <span><GameGlyph kind="altar" /> 봉헌할 기록</span>
        <em>{available.length}장</em>
      </header>

      <div className="mobile-altar__card-rail" aria-label="선포할 카드 선택">
        {available.map((instance) => {
          const concept = concepts.find((item) => item.id === instance.conceptId)
          if (!concept) return null
          return (
            <button
              key={instance.instanceId}
              type="button"
              className={selectedInstanceId === instance.instanceId ? 'is-selected' : ''}
              disabled={!!concept.deleted || locked}
              onClick={() => {
                selectInstance(instance.instanceId)
                sfx.pick()
                vibrateMobile(8)
              }}
            >
              <GameGlyph kind="concept" concept={concept} />
              <strong>{concept.name}</strong>
            </button>
          )
        })}
        {available.length === 0 && <p>공방에서 기록을 만들어 오세요.</p>}
      </div>

      <section className="mobile-altar__stage" aria-live="polite">
        <span className="mobile-altar__orbit mobile-altar__orbit--outer" aria-hidden />
        <span className="mobile-altar__orbit mobile-altar__orbit--inner" aria-hidden />
        <div className={`mobile-altar__offering${selectedConcept ? ' is-ready' : ''}`}>
          {selectedConcept ? (
            <>
              <GameGlyph kind="concept" concept={selectedConcept} />
              <strong>{selectedConcept.name}</strong>
            </>
          ) : (
            <>
              <GameGlyph kind="altar" />
              <span>카드를 올려놓으세요</span>
            </>
          )}
        </div>
        <div className="mobile-altar__impact">
          <span>비석 <strong>{destruction === null ? '—' : `−${destruction.toFixed(1)}`}</strong></span>
          <span>정합성 <strong>{coherenceLoss === null ? '—' : `−${coherenceLoss.toFixed(1)}`}</strong></span>
        </div>
      </section>

      <section className="mobile-altar__targets">
        <header>
          <h2>응답할 여덟 비석</h2>
          <span>길게 눌러 신의 질문</span>
        </header>
        <ul ref={targetListRef}>
          {pillars.map((pillar) => (
            <MobilePillar
              key={pillar.key}
              pillarKey={pillar.key}
              stability={pillar.stability}
              selected={targetPillar === pillar.key}
              previewDamage={targetPillar === pillar.key ? destruction : null}
              onSelect={() => {
                setTargetPillar(pillar.key)
                sfx.drop()
                vibrateMobile(10)
              }}
            />
          ))}
        </ul>
      </section>

      <footer className="mobile-altar__declare">
        <p aria-live="polite">{proclaimReason}</p>
        <div className="mobile-altar__seal-bed">
          <span aria-hidden className="mobile-altar__seal-shadow" />
          <motion.button
            type="button"
            className={holding ? 'is-holding' : ''}
            whileTap={canProclaim ? { scale: 0.94, y: 3 } : undefined}
            disabled={!canProclaim}
            onPointerDown={(event) => {
              if (!canProclaim || reduceMotion) return
              event.currentTarget.setPointerCapture(event.pointerId)
              holdCompleted.current = false
              setHoldHint(false)
              setHolding(true)
              holdRef.current = window.setTimeout(finishProclamation, 400)
            }}
            onPointerUp={() => {
              const completed = holdCompleted.current
              clearHold()
              if (!completed) setHoldHint(true)
            }}
            onPointerCancel={clearHold}
            onClick={(event) => {
              if (!canProclaim) return
              if (!reduceMotion) {
                if (event.detail === 0) setHoldHint(true)
                return
              }
              if (reducedConfirm) finishProclamation()
              else {
                holdCompleted.current = false
                setReducedConfirm(true)
              }
            }}
          >
            <span aria-hidden className="mobile-altar__hold-fill" />
            <GameGlyph kind="altar" />
            <span className="mobile-altar__hold-label">선포</span>
          </motion.button>
        </div>
      </footer>
    </section>
  )
}
