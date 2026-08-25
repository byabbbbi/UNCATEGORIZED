import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { formatDailyDate } from '../data/dailyWorld'
import { ENDING_LINES } from '../data/endings'
import { downloadChronicleImage } from '../export/chronicleImage'
import { calcD } from '../game/formulas'
import { useGameStore } from '../store/gameStore'
import './EndingScreen.css'

export function EndingScreen() {
  const ending = useGameStore((s) => s.ending)
  const chronicle = useGameStore((s) => s.chronicle)
  const stats = useGameStore((s) => s.stats)
  const concepts = useGameStore((s) => s.concepts)
  const collapsed = useGameStore((s) => s.collapsed)
  const collapsedRules = useGameStore((s) => s.collapsedRules)
  const contaminantCounts = useGameStore((s) => s.contaminantCounts)
  const era = useGameStore((s) => s.era)
  const gameMode = useGameStore((s) => s.gameMode)
  const dailyDate = useGameStore((s) => s.dailyDate)
  const returnToTitle = useGameStore((s) => s.returnToTitle)
  const [phase, setPhase] = useState<'fade' | 'line' | 'scroll' | 'summary'>('fade')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    if (!ending) return
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

  const exportChronicle = async () => {
    setExporting(true)
    setExportError(null)
    const highestDestruction = concepts.reduce(
      (highest, concept) =>
        concept.deleted
          ? highest
          : Math.max(highest, calcD(concept.chaos, concept.plausibility)),
      0,
    )
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
          {ending !== 'blank' && (
            <p>
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
            <button type="button" onClick={returnToTitle}>
              처음으로
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
