import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useGameStore } from '../store/gameStore'
import { GameGlyph } from './GameGlyph'
import './MobileComboToast.css'

export function MobileComboToast() {
  const toast = useGameStore((state) => state.mobileComboToast)
  const clearToast = useGameStore((state) => state.clearMobileComboToast)

  useEffect(() => {
    if (!toast) return
    const id = toast.id
    const timer = window.setTimeout(() => clearToast(id), 1800)
    return () => window.clearTimeout(timer)
  }, [toast, clearToast])

  return (
    <AnimatePresence mode="wait">
      {toast && (
        <motion.p
          key={toast.id}
          className="mobile-combo-toast"
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
          role="status"
          aria-live="polite"
        >
          {toast.isDiscovery && <b>최초 발견</b>}
          <span className="mobile-combo-toast__formula">
            <span>
              <GameGlyph kind="concept" concept={toast.first} />
              <em>{toast.first.name}</em>
            </span>
            <i>＋</i>
            <span>
              <GameGlyph kind="concept" concept={toast.second} />
              <em>{toast.second.name}</em>
            </span>
            <i>→</i>
            <span className="is-result">
              <GameGlyph kind="concept" concept={toast.result} />
              <em>{toast.result.name}</em>
            </span>
          </span>
        </motion.p>
      )}
    </AnimatePresence>
  )
}
