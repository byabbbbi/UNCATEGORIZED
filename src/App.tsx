import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CanvasBoard } from './components/CanvasBoard'
import { ConceptDrawer } from './components/ConceptDrawer'
import { SidePanel } from './components/SidePanel'
import { StatStrip } from './components/StatStrip'
import { CaseBanner } from './components/CaseBanner'
import { VaultModal } from './components/VaultModal'
import { CodexModal } from './components/CodexModal'
import { TitleScreen } from './components/TitleScreen'
import { EndingScreen } from './components/EndingScreen'
import { ShardFlights } from './components/ShardFlights'
import { DebugBadge } from './components/DebugBadge'
import { AnimatedNumber } from './components/AnimatedNumber'
import { useGameStore } from './store/gameStore'
import { unlockAudio } from './sfx'
import { MAX_ERA, MAX_PROCLAMATIONS_PER_ERA } from './data/initial'
import './App.css'

function applyDecay(count: number) {
  const root = document.documentElement
  const body = document.body
  root.style.setProperty('--decay', String(count))
  for (let i = 1; i <= 4; i++) {
    body.classList.toggle(`decay-${i}`, count === i)
    root.classList.toggle(`decay-${i}`, count === i)
  }
  if (count > 4) {
    body.classList.add('decay-4')
    root.classList.add('decay-4')
  }
}

export default function App() {
  const screen = useGameStore((s) => s.screen)
  const coherence = useGameStore((s) => s.coherence)
  const era = useGameStore((s) => s.era)
  const shards = useGameStore((s) => s.shards)
  const discoveredIds = useGameStore((s) => s.discoveredIds)
  const proclamationsThisEra = useGameStore((s) => s.proclamationsThisEra)
  const message = useGameStore((s) => s.message)
  const muted = useGameStore((s) => s.muted)
  const collapsed = useGameStore((s) => s.collapsed)
  const fx = useGameStore((s) => s.fx)
  const codexOpen = useGameStore((s) => s.codexOpen)
  const toggleMute = useGameStore((s) => s.toggleMute)
  const returnToTitle = useGameStore((s) => s.returnToTitle)
  const reset = useGameStore((s) => s.reset)
  const openCodex = useGameStore((s) => s.openCodex)
  const closeCodex = useGameStore((s) => s.closeCodex)
  const [confirmation, setConfirmation] = useState<'title' | 'reset' | null>(
    null,
  )

  const discoveryCount = discoveredIds.length
  const remainingDeclares = Math.max(
    0,
    MAX_PROCLAMATIONS_PER_ERA - proclamationsThisEra,
  )

  useEffect(() => {
    applyDecay(collapsed.length)
  }, [collapsed.length])

  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  useEffect(() => {
    if (screen !== 'play') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      if (codexOpen) closeCodex()
      else openCodex()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, codexOpen, openCodex, closeCodex])

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (screen === 'title') {
    return (
      <div onPointerDown={() => unlockAudio()}>
        <TitleScreen />
        <DebugBadge />
      </div>
    )
  }

  return (
    <div
      className={`app${fx.unclassifiedFx ? ' is-voiding' : ''}`}
      onPointerDown={() => unlockAudio()}
    >
      {fx.whiteFlash && <div className="flash-white" />}
      <ShardFlights />

      <AnimatePresence>
        {fx.godLine && (
          <motion.div
            className="god-line"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {fx.godLine}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="app__shell"
        animate={
          !reduceMotion && fx.screenShake
            ? { x: [0, -3, 3, -2, 0], y: [0, 1, -1, 0] }
            : { x: 0, y: 0 }
        }
        transition={{ duration: 0.28 }}
      >
        <header className="topbar">
          <div className="topbar__stats">
            <label className="topbar__discover">
              <span>발견</span>
              <motion.strong
                key={fx.discoverPop}
                className={`topbar__discover-num${fx.discoverPop > 0 ? ' is-pop' : ''}`}
                initial={fx.discoverPop > 0 ? { scale: 1.45, color: 'var(--gold)' } : false}
                animate={{ scale: 1, color: 'var(--ink)' }}
                transition={{ type: 'spring', stiffness: 420, damping: 14 }}
              >
                <AnimatedNumber value={discoveryCount} digits={0} />
              </motion.strong>
            </label>
            <label>
              <span>정합성</span>
              <strong>
                <AnimatedNumber value={coherence} digits={1} />
              </strong>
            </label>
            <label>
              <span>시대</span>
              <strong>
                {era}/{MAX_ERA}
              </strong>
            </label>
            <label>
              <span>선포 잔여</span>
              <strong>
                {remainingDeclares}
              </strong>
            </label>
            <label>
              <span>파편</span>
              <motion.strong
                key={fx.shardPop}
                className="topbar__shard-num"
                animate={
                  fx.shardPop > 0 && !reduceMotion
                    ? { scale: [1, 1.25, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.22 }}
              >
                <AnimatedNumber value={shards} digits={0} />
              </motion.strong>
            </label>
          </div>

          <div className="topbar__actions">
            {message && <p className="topbar__msg">{message}</p>}
            <button
              type="button"
              className="linkish"
              onClick={toggleMute}
              aria-label={muted ? '소리 켜기' : '음소거'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <button
              type="button"
              className="topbar__reset"
              onClick={() => setConfirmation('title')}
            >
              타이틀
            </button>
            <button
              type="button"
              className="topbar__reset"
              onClick={() => setConfirmation('reset')}
            >
              초기화
            </button>
          </div>
        </header>

        <div className="app__main">
          <div className="playfield">
            <CaseBanner />
            <CanvasBoard />
            <ConceptDrawer />
            <StatStrip />
          </div>
          <SidePanel />
        </div>
      </motion.div>

      <AnimatePresence>
        {confirmation && (
          <motion.div
            className="confirm-reset"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setConfirmation(null)
            }}
          >
            <motion.div
              className="confirm-reset__panel"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              role="dialog"
              aria-label={
                confirmation === 'title' ? '타이틀 이동 확인' : '초기화 확인'
              }
            >
              <p>
                {confirmation === 'title'
                  ? '타이틀로 돌아갑니다. 진행 상황은 저장됩니다.'
                  : '이 세계의 모든 기록이 사라집니다. 계속할까요?'}
              </p>
              <div className="confirm-reset__actions">
                <button
                  type="button"
                  className="confirm-reset__cancel"
                  onClick={() => setConfirmation(null)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="confirm-reset__ok"
                  onClick={() => {
                    const action = confirmation
                    setConfirmation(null)
                    if (action === 'title') returnToTitle()
                    else reset()
                  }}
                >
                  {confirmation === 'title' ? '타이틀' : '초기화'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <VaultModal />
      <CodexModal />
      {screen === 'ending' && <EndingScreen />}
      <DebugBadge />
    </div>
  )
}
