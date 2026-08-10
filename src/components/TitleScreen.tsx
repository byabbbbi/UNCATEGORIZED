import { motion } from 'motion/react'
import { useGameStore } from '../store/gameStore'
import './TitleScreen.css'

export function TitleScreen() {
  const startFresh = useGameStore((s) => s.startFresh)
  const startDemo = useGameStore((s) => s.startDemo)

  return (
    <div className="title-screen">
      <motion.div
        className="title-screen__panel"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
      >
        <h1 className="title-screen__brand">UNCATEGORIZED</h1>
        <p className="title-screen__latin">RES SINE CATEGORIA</p>
        <div className="title-screen__actions">
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
        </div>
      </motion.div>
    </div>
  )
}
