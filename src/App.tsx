import { useEffect } from 'react'
import { motion } from 'motion/react'
import { CanvasBoard } from './components/CanvasBoard'
import { ConceptDrawer } from './components/ConceptDrawer'
import { SidePanel } from './components/SidePanel'
import { StatStrip } from './components/StatStrip'
import { VaultModal } from './components/VaultModal'
import { AnimatedNumber } from './components/AnimatedNumber'
import { useGameStore } from './store/gameStore'
import { unlockAudio } from './sfx'
import { MAX_ERA, MAX_PROCLAMATIONS_PER_ERA } from './data/initial'
import './App.css'

export default function App() {
  const coherence = useGameStore((s) => s.coherence)
  const era = useGameStore((s) => s.era)
  const shards = useGameStore((s) => s.shards)
  const proclamationsThisEra = useGameStore((s) => s.proclamationsThisEra)
  const message = useGameStore((s) => s.message)
  const muted = useGameStore((s) => s.muted)
  const pillars = useGameStore((s) => s.pillars)
  const fx = useGameStore((s) => s.fx)
  const toggleMute = useGameStore((s) => s.toggleMute)
  const endEra = useGameStore((s) => s.endEra)
  const reset = useGameStore((s) => s.reset)

  const collapsed = pillars.filter((p) => p.stability <= 0).length

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--misreg',
      `${collapsed * 0.9}px`,
    )
  }, [collapsed])

  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div
      className={`app${fx.unclassifiedFx ? ' is-voiding' : ''}`}
      onPointerDown={() => unlockAudio()}
    >
      {fx.whiteFlash && <div className="flash-white" />}

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
            <label>
              <span>정합성</span>
              <strong className="misreg">
                <AnimatedNumber value={coherence} digits={1} />
              </strong>
            </label>
            <label>
              <span>시대</span>
              <strong className="misreg">
                {era}/{MAX_ERA}
              </strong>
            </label>
            <label>
              <span>선포</span>
              <strong className="misreg">
                {proclamationsThisEra}/{MAX_PROCLAMATIONS_PER_ERA}
              </strong>
            </label>
            <label>
              <span>파편</span>
              <strong className="misreg">
                <AnimatedNumber value={shards} digits={0} />
              </strong>
            </label>
          </div>

          <div className="topbar__actions">
            {message && <p className="topbar__msg misreg">{message}</p>}
            <button type="button" className="linkish" onClick={endEra}>
              시대 마감
            </button>
            <button type="button" className="linkish" onClick={reset}>
              초기화
            </button>
            <button
              type="button"
              className="linkish"
              onClick={toggleMute}
              aria-label={muted ? '소리 켜기' : '음소거'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </header>

        <div className="app__main">
          <div className="playfield">
            <CanvasBoard />
            <ConceptDrawer />
            <StatStrip />
          </div>
          <SidePanel />
        </div>
      </motion.div>

      <VaultModal />
    </div>
  )
}
