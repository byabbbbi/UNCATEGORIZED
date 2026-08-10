import { AnimatePresence, motion } from 'motion/react'
import { useGameStore } from '../store/gameStore'
import { IndexCard } from './IndexCard'
import type { PillarKey } from '../types'
import './VaultModal.css'

export function VaultModal() {
  const open = useGameStore((s) => s.fx.vaultOpen)
  const reveal = useGameStore((s) => s.fx.vaultReveal)
  const unclassifiedFx = useGameStore((s) => s.fx.unclassifiedFx)
  const shards = useGameStore((s) => s.shards)
  const closeVault = useGameStore((s) => s.closeVault)
  const pullVault = useGameStore((s) => s.pullVault)
  const concepts = useGameStore((s) => s.concepts)
  const pillars = useGameStore((s) => s.pillars)

  const alive = {
    substance: (pillars.find((p) => p.key === 'substance')?.stability ?? 0) > 0,
    quantity: (pillars.find((p) => p.key === 'quantity')?.stability ?? 0) > 0,
    quality: (pillars.find((p) => p.key === 'quality')?.stability ?? 0) > 0,
    time: (pillars.find((p) => p.key === 'time')?.stability ?? 0) > 0,
  } as Record<PillarKey, boolean>

  const revealed = reveal
    ? concepts.find((c) => c.id === reveal.conceptId)
    : null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`vault${unclassifiedFx ? ' is-dark' : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="vault__panel"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
          >
            <header>
              <h2 className="misreg">분실물 보관소</h2>
              <button type="button" className="vault__close" onClick={closeVault}>
                닫기
              </button>
            </header>
            <p className="vault__copy">
              파편 10개로 개념 하나를 회수한다. 등급이 높을수록 개봉이 길다.
            </p>

            <div className="vault__stage">
              <AnimatePresence mode="wait">
                {!reveal && (
                  <motion.div
                    key="back"
                    className="vault__card-back"
                    initial={{ rotateY: 0 }}
                    exit={{ rotateY: 90, opacity: 0 }}
                  >
                    ❐
                  </motion.div>
                )}
                {reveal && revealed && (
                  <motion.div
                    key="face"
                    initial={{ rotateY: -90, opacity: 0, scale: 0.85 }}
                    animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  >
                    {reveal.grade === 'unclassified' && (
                      <span className="vault__gold-ring" />
                    )}
                    <IndexCard
                      concept={revealed}
                      pillarsAlive={alive}
                      isDiscovery={reveal.grade !== 'registered'}
                    />
                    <p className="vault__grade">
                      {reveal.grade === 'unclassified'
                        ? '미분류'
                        : reveal.grade === 'caution'
                          ? '주의'
                          : '등록됨'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              className="vault__pull"
              disabled={shards < 10 || !!reveal}
              onClick={pullVault}
            >
              회수 (파편 {shards}/10)
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
