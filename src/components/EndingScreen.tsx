import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { formatDailyDate } from '../data/dailyWorld'
import { ENDING_LABELS, ENDING_LINES } from '../data/endings'
import { downloadChronicleImage } from '../export/chronicleImage'
import { calcD } from '../game/formulas'
import { useGameStore } from '../store/gameStore'
import { SEAL_GLYPH, SEAL_TITLE } from '../types'
import { GameGlyph } from './GameGlyph'
import './EndingScreen.css'
export function EndingScreen() {
  const ending = useGameStore((s) => s.ending)
  const chronicle = useGameStore((s) => s.chronicle)
  const stats = useGameStore((s) => s.stats)
  const concepts = useGameStore((s) => s.concepts)
  const collapsed = useGameStore((s) => s.collapsed)
  const collapsedRules = useGameStore((s) => s.collapsedRules)
  const contaminantCounts = useGameStore((s) => s.contaminantCounts)
  const coherence = useGameStore((s) => s.coherence)
  const shards = useGameStore((s) => s.shards)
  const era = useGameStore((s) => s.era)
  const gameMode = useGameStore((s) => s.gameMode)
  const dailyDate = useGameStore((s) => s.dailyDate)
  const returnToTitle = useGameStore((s) => s.returnToTitle)
  const startFresh = useGameStore((s) => s.startFresh)
  const [phase, setPhase] = useState<'fade' | 'line' | 'scroll' | 'summary'>('fade')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    if (!ending) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('summary')
      return
    }
    if (ending === 'blank') {
      const t1 = window.setTimeout(() => setPhase('line'), 1500 + 3000)
      return () => clearTimeout(t1)
    }
    const t1 = window.setTimeout(() => setPhase('line'), 400)
    const t2 = window.setTimeout(() => setPhase('scroll'), 2800)
    const t3 = window.setTimeout(() => setPhase('summary'), 2800 + Math.min(chronicle.length * 180, 4000))
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [ending, chronicle.length])

  useEffect(() => {
    if (phase !== 'scroll' || !scrollRef.current) return
    const el = scrollRef.current
    el.scrollTop = 0
    const max = el.scrollHeight - el.clientHeight
    let start: number | null = null
    let raf = 0
    const dur = Math.min(chronicle.length * 180, 4000)
    const step = (ts: number) => {
      if (start == null) start = ts
      const p = Math.min(1, (ts - start) / dur)
      el.scrollTop = max * p
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase, chronicle.length])

  if (!ending) return null

  let strongestConcept = concepts.find((concept) => !concept.deleted) ?? null
  let highestDestruction = strongestConcept
    ? calcD(strongestConcept.chaos, strongestConcept.plausibility)
    : 0

  for (const concept of concepts) {
    if (concept.deleted) continue
    const destruction = calcD(concept.chaos, concept.plausibility)
    if (destruction > highestDestruction) {
      strongestConcept = concept
      highestDestruction = destruction
    }
  }

  const exportChronicle = async () => {
    setExporting(true)
    setExportError(null)
    const dailyContaminant = Object.entries(contaminantCounts).find(
      ([, count]) => count >= 3,
    )?.[0]

    try {
      await downloadChronicleImage({
        ending,
        discoveries: stats.discoveries,
        collapsed,
        collapsedRules,
        era,
        highestDestruction,
        chronicle,
        daily:
          gameMode === 'daily' && dailyDate
            ? {
                date: dailyDate,
                contaminant: dailyContaminant ?? '미상',
              }
            : null,
      })
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : '기록을 내보내지 못했습니다.',
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={`ending ending--${ending}`}>
      {ending === 'blank' && phase === 'fade' && (
        <motion.div
          className="ending__bleach"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        />
      )}

      {(phase === 'line' || phase === 'scroll' || phase === 'summary') && (
        <motion.p
          className="ending__line"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {ENDING_LINES[ending]}
        </motion.p>
      )}

      {phase !== 'summary' && ending !== 'blank' && (
        <button
          type="button"
          className="ending__skip"
          onClick={() => setPhase('summary')}
        >
          결산 바로 보기
        </button>
      )}

      {(phase === 'scroll' || phase === 'summary') && ending !== 'blank' && (
        <ol className="ending__chronicle" ref={scrollRef}>
          {chronicle.map((e) => (
            <li key={e.id}>
              <span>E{e.era}</span> {e.text}
            </li>
          ))}
        </ol>
      )}

      {(phase === 'summary' || (ending === 'blank' && phase === 'line')) && (
        <motion.div
          className="ending__summary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {gameMode === 'daily' && dailyDate && (
            <p className="ending__daily">
              오늘의 세계 · {formatDailyDate(dailyDate)}
            </p>
          )}
          <section className="ending__mobile-report" aria-label="이번 세계 결산">
            <header className="ending__result-heading">
              <span className="ending__result-seal" aria-hidden>
                {ending === 'blank' ? '∅' : ending === 'indistinct' ? '≋' : '§'}
              </span>
              <div>
                <small>WORLD ARCHIVE · E{era}</small>
                <h1>{ENDING_LABELS[ending]}</h1>
                <p>이번 세계는 이렇게 대장에 남았습니다.</p>
              </div>
            </header>

            <dl className="ending__run-stats">
              <div>
                <dt><GameGlyph kind="discovery" /> 발견</dt>
                <dd>{stats.discoveries}</dd>
              </div>
              <div>
                <dt><GameGlyph kind="proclamation" /> 선포</dt>
                <dd>{stats.proclamations}</dd>
              </div>
              <div>
                <dt><GameGlyph kind="pillar" /> 반납</dt>
                <dd>{collapsed.length}</dd>
              </div>
            </dl>

            <div className="ending__world-state">
              <span>최종 정합성 <b>{coherence.toFixed(1)}</b></span>
              <span>남은 파편 <b>{shards}</b></span>
              <span>개입 규칙 <b>{collapsedRules.length}</b></span>
            </div>

            <div className="ending__highlight">
              <small>가장 강한 개념</small>
              <strong>
                {strongestConcept ? `${strongestConcept.emoji} ${strongestConcept.name}` : '기록 없음'}
              </strong>
              {strongestConcept && <span>파괴력 {highestDestruction.toFixed(1)}</span>}
            </div>

            <div className="ending__returned-pillars">
              <small>반납된 범주</small>
              <div>
                {collapsed.length === 0 ? (
                  <span className="is-empty">아직 반납된 범주가 없습니다</span>
                ) : (
                  collapsed.map((key) => (
                    <span key={key} title={SEAL_TITLE[key]}>
                      <b>{SEAL_GLYPH[key]}</b>
                      {SEAL_TITLE[key].split(' · ')[1]}
                    </span>
                  ))
                )}
              </div>
            </div>
          </section>
          {ending !== 'blank' && (
            <p className="ending__desktop-stats">
              발견 {stats.discoveries} · 선포 {stats.proclamations} · 사임{' '}
              {stats.resignations}
            </p>
          )}
          {exportError && (
            <p className="ending__export-error" role="alert">
              {exportError}
            </p>
          )}
          <div className="ending__actions">
            <button
              type="button"
              className="ending__export"
              onClick={exportChronicle}
              disabled={exporting}
            >
              {exporting ? '기록 작성 중…' : '기록 내보내기'}
            </button>
            <button
              type="button"
              className="ending__restart"
              onClick={startFresh}
            >
              새 세계 열기
            </button>
            <button type="button" onClick={returnToTitle}>
              처음으로
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
