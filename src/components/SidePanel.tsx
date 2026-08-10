import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { AnimatedNumber } from './AnimatedNumber'
import { Typewriter } from './Typewriter'
import { useGameStore } from '../store/gameStore'
import {
  MAX_ERA,
  MAX_PROCLAMATIONS_PER_ERA,
  PILLAR_KO,
  PILLAR_LATIN,
} from '../data/initial'
import type { PillarKey } from '../types'
import { pillarPhase } from '../types'
import './SidePanel.css'

export function SidePanel() {
  const collapsedRules = useGameStore((s) => s.collapsedRules)
  const pillars = useGameStore((s) => s.pillars)
  const chronicle = useGameStore((s) => s.chronicle)
  const targetPillar = useGameStore((s) => s.targetPillar)
  const setTargetPillar = useGameStore((s) => s.setTargetPillar)
  const typingRule = useGameStore((s) => s.fx.typingRule)
  const clearTypingRule = useGameStore((s) => s.clearTypingRule)
  const proclamationsThisEra = useGameStore((s) => s.proclamationsThisEra)
  const logRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [chronicle.length])

  const remaining = MAX_PROCLAMATIONS_PER_ERA - proclamationsThisEra

  return (
    <aside className="side-panel">
      <section className="side-block">
        <header className="side-block__head">
          <h2 className="misreg">생성 규칙</h2>
          <span className="side-block__count">({collapsedRules.length})</span>
        </header>
        {collapsedRules.length === 0 ? (
          <p className="side-block__empty">아직 무너진 기둥이 없다</p>
        ) : (
          <ul className="rules-list">
            {collapsedRules.map((rule) => (
              <li key={rule} className="misreg">
                {typingRule === rule ? (
                  <Typewriter
                    text={rule}
                    msPerChar={40}
                    onDone={clearTypingRule}
                  />
                ) : (
                  rule
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="side-block">
        <header className="side-block__head">
          <h2 className="misreg">네 기둥</h2>
          <span className="side-block__count">선포 잔여 {remaining}</span>
        </header>
        <ul className="pillar-list">
          {pillars.map((p) => (
            <PillarRow
              key={p.key}
              pillarKey={p.key}
              stability={p.stability}
              selected={targetPillar === p.key}
              onSelect={() => setTargetPillar(p.key)}
            />
          ))}
        </ul>
      </section>

      <section className="side-block side-block--chronicle">
        <header className="side-block__head">
          <h2 className="misreg">연대기</h2>
        </header>
        <ol className="chronicle-list" ref={logRef}>
          {[...chronicle].reverse().map((e, idx) => (
            <li key={e.id}>
              <span className="chronicle-list__era">E{e.era}</span>
              {idx === 0 ? (
                <Typewriter text={e.text} msPerChar={30} className="chronicle-list__text" />
              ) : (
                <span className="chronicle-list__text misreg">{e.text}</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <p className="side-panel__era-note">
        시대 상한 {MAX_ERA} · 우측 기둥을 고른 뒤 제단에 올려 선포한다
      </p>
    </aside>
  )
}

function blocks(stability: number): string {
  const n = Math.round(Math.max(0, Math.min(100, stability)) / 25)
  return '▮'.repeat(n) + '▯'.repeat(4 - n)
}

function PillarRow({
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
  const phase = pillarPhase(stability)
  return (
    <li>
      <button
        type="button"
        className={`pillar-row${selected ? ' is-selected' : ''}${collapsed ? ' is-collapsed' : ''} is-${phase}`}
        disabled={collapsed}
        onClick={onSelect}
      >
        <div className="pillar-row__meta">
          <strong className="pillar-row__latin misreg">
            {PILLAR_LATIN[pillarKey]}
            <span className="pillar-row__ko"> · {PILLAR_KO[pillarKey]}</span>
          </strong>
          <span className="pillar-row__blocks" aria-hidden>
            {blocks(stability)}
          </span>
          <em>
            <AnimatedNumber value={stability} digits={0} />
          </em>
        </div>
        <div className="pillar-row__track">
          <motion.div
            className="pillar-row__fill"
            initial={false}
            animate={{ width: `${Math.max(0, Math.min(100, stability))}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.18 }}
          />
        </div>
      </button>
    </li>
  )
}
