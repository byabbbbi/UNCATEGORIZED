import { useState } from 'react'
import './TitleScreen.css'

type LaunchMode = 'startFresh' | 'startContinue' | 'startDemo' | 'startDaily'

interface LaunchScreenProps {
  onLaunch: (mode: LaunchMode) => Promise<void>
}

function hasSavedRun() {
  try {
    return !!localStorage.getItem('uncat-run-save-v1')
  } catch {
    return false
  }
}

function todayLabel() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date())
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${value('month')}월 ${value('day')}일`
}

export function LaunchScreen({ onLaunch }: LaunchScreenProps) {
  const [loading, setLoading] = useState(false)
  const canContinue = hasSavedRun()
  const dailyDate = todayLabel()

  const launch = (mode: LaunchMode) => {
    if (loading) return
    setLoading(true)
    void onLaunch(mode)
  }

  return (
    <div className="title-screen">
      <div className="title-screen__panel">
        <h1 className="title-screen__brand">UNCATEGORIZED</h1>
        <p className="title-screen__latin">RES SINE CATEGORIA</p>
        <div className="title-screen__actions">
          {canContinue && (
            <button
              type="button"
              className="title-screen__btn"
              disabled={loading}
              onClick={() => launch('startContinue')}
            >
              이어하기
            </button>
          )}
          <button
            type="button"
            className="title-screen__btn"
            disabled={loading}
            onClick={() => launch('startFresh')}
          >
            처음부터
          </button>
          <button
            type="button"
            className="title-screen__btn title-screen__btn--demo"
            disabled={loading}
            onClick={() => launch('startDemo')}
          >
            붕괴된 세계에서
          </button>
          <button
            type="button"
            className="title-screen__btn title-screen__btn--daily"
            disabled={loading}
            onClick={() => launch('startDaily')}
          >
            {loading ? '세계 기록을 여는 중…' : `오늘의 세계 · ${dailyDate}`}
          </button>
        </div>
      </div>
    </div>
  )
}
