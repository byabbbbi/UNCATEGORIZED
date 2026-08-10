import { useEffect, useState } from 'react'
import { genDebug, subscribeGenDebug } from '../generation'

function useDebugQuery() {
  const [on, setOn] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('debug') === '1'
  })

  useEffect(() => {
    const sync = () =>
      setOn(new URLSearchParams(window.location.search).get('debug') === '1')
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  return on
}

export function DebugBadge() {
  const enabled = useDebugQuery()
  const [, tick] = useState(0)

  useEffect(() => {
    if (!enabled) return
    return subscribeGenDebug(() => tick((n) => n + 1))
  }, [enabled])

  if (!enabled) return null

  const cache = genDebug.hard + genDebug.idb + genDebug.preload
  const line = `AI ${genDebug.api} · 캐시 ${cache} · 폴백 ${genDebug.fallback} · 실패 ${genDebug.failures}`

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        font: '10px monospace',
        opacity: 0.5,
        zIndex: 9999,
        pointerEvents: 'none',
        color: 'var(--ink)',
        background: 'color-mix(in srgb, var(--form-light) 88%, transparent)',
        padding: '2px 6px',
        maxWidth: '42vw',
        lineHeight: 1.35,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}
    >
      {line}
      {genDebug.lastError ? `\n${genDebug.lastError}` : ''}
    </div>
  )
}
