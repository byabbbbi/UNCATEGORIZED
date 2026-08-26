import { AnimatePresence, motion } from 'motion/react'
import { useGameStore } from '../store/gameStore'
import { IndexCard } from './IndexCard'
import { GACHA_KO, GACHA_LATIN } from '../data/gachaPool'
import { pillarStabilityMap } from '../utils/pillars'
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

  const pillarStability = pillarStabilityMap(pillars)

  const revealed = reveal
    ? concepts.find((c) => c.id === reveal.conceptId)
    : null

  const gradeGlow =
    reveal?.grade === 'uncategorized'
      ? 'is-gold'
      : reveal?.grade === 'injudicable'
        ? 'is-carbon'
        : reveal?.grade === 'suspended'
          ? 'is-seal'
          : 'is-ink'

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
              <h2>분실물 보관소</h2>
              <button type="button" className="vault__close" onClick={closeVault}>
                닫기
              </button>
            </header>
            <p className="vault__copy">
              파편 10개로 개념 하나를 회수한다. 뜸이 길수록 등급이 높다.
            </p>

            <div className={`vault__stage${reveal ? ` ${gradeGlow}` : ''}`}>
              <AnimatePresence mode="wait">
                {!reveal && (
                  <motion.div
                    key="back"
                    className="vault__card-back"
                    initial={{ rotateY: 0 }}
                    exit={{ rotateY: 90, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <span className="vault__wax" />
                    ❐
                  </motion.div>
                )}
                {reveal && revealed && (
                  <motion.div
                    key="face"
                    className="vault__face"
                    initial={{ rotateY: -90, opacity: 0, scale: 0.85 }}
                    animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  >
                    {reveal.grade === 'uncategorized' && (
                      <span className="vault__gold-ring" />
                    )}
                    <IndexCard
                      concept={revealed}
                      pillarStability={pillarStability}
                      isDiscovery={reveal.grade !== 'registered'}
                    />
                    <p className="vault__grade">
                      <span className="vault__grade-latin">
                        {GACHA_LATIN[reveal.grade]}
                      </span>
                      <span>
                        {GACHA_KO[reveal.grade]}
                      </span>
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
