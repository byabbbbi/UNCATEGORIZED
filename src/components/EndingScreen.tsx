import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { formatDailyDate } from '../data/dailyWorld'
import { useGameStore } from '../store/gameStore'
import type { EndingKind } from '../types'
import './EndingScreen.css'

const LINES: Record<Exclude<EndingKind, null>, string> = {
  blank: '기록할 것이 남지 않았다.',
  indistinct:
    '마지막 범주가 반납되었다. 이제 당신을 오류라 부를 근거도 사라졌다.',
  classified:
    '여섯 시대가 닫혔다. 신들은 합의했다 — 당신은 이제 대장의 정식 항목이다. 예외는 더 이상 없다.',
}

export function EndingScreen() {
  const ending = useGameStore((s) => s.ending)
  const chronicle = useGameStore((s) => s.chronicle)
  const stats = useGameStore((s) => s.stats)
  const gameMode = useGameStore((s) => s.gameMode)
  const dailyDate = useGameStore((s) => s.dailyDate)
  const returnToTitle = useGameStore((s) => s.returnToTitle)
  const [phase, setPhase] = useState<'fade' | 'line' | 'scroll' | 'summary'>('fade')
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
          {LINES[ending]}
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
          <button type="button" onClick={returnToTitle}>
            처음으로
          </button>
        </motion.div>
      )}
    </div>
  )
}
