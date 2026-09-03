import { useEffect, useState } from 'react'
import { hasSavedRun } from '../persist/runSave'
import { useGameStore } from '../store/gameStore'
import './TitleScreen.css'

export function TitleScreen() {
  const startFresh = useGameStore((s) => s.startFresh)
  const startContinue = useGameStore((s) => s.startContinue)
  const startDemo = useGameStore((s) => s.startDemo)
  const startDaily = useGameStore((s) => s.startDaily)
  const canContinue = hasSavedRun()
  const [dailyLabel, setDailyLabel] = useState('오늘의 세계 준비 중')

  useEffect(() => {
    let active = true
    void import('../data/dailyWorld').then(({ formatDailyDate, getDailyWorld }) => {
      if (!active) return
      const daily = getDailyWorld()
      setDailyLabel(
        `오늘의 세계 · ${formatDailyDate(daily.date)} · 「${daily.contaminant}」에 감염된 세계`,
      )
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="title-screen">
      <div className="title-screen__panel">
        <h1 className="title-screen__brand">UNCATEGORIZED</h1>
        <p className="title-screen__latin">RES SINE CATEGORIA</p>
        <div className="title-screen__actions">
          {canContinue && (
            <button type="button" className="title-screen__btn" onClick={startContinue}>
              이어하기
            </button>
          )}
          <button type="button" className="title-screen__btn" onClick={startFresh}>
            처음부터
          </button>
          <button
            type="button"
            className="title-screen__btn title-screen__btn--demo"
            onClick={startDemo}
          >
            붕괴된 세계에서
          </button>
          <button
            type="button"
            className="title-screen__btn title-screen__btn--daily"
            onClick={startDaily}
          >
            {dailyLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
