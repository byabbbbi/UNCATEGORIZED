import { AnimatePresence, motion } from 'motion/react'
import { useGameStore } from '../store/gameStore'
import { IndexCard } from './IndexCard'
import {
  GACHA_KO,
  GACHA_LATIN,
  GACHA_ODDS,
  GACHA_POOL,
  VAULT_GRADE_ORDER,
} from '../data/gachaPool'
import { pillarStabilityMap } from '../utils/pillars'
import './VaultModal.css'

const VAULT_ENTRY_COUNT = VAULT_GRADE_ORDER.reduce(
  (total, grade) => total + GACHA_POOL[grade].length,
  0,
)

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
  const vaultRecoveries = concepts.filter(
    (concept) => concept.vaultKey && concept.vaultGrade,
  )
  const legacyVaultRecoveries = concepts.filter(
    (concept) => !concept.vaultKey && concept.chronicle?.startsWith('보관소에서 '),
  )
  const recoveredKeys = new Set(
    vaultRecoveries.flatMap((concept) => (concept.vaultKey ? [concept.vaultKey] : [])),
  )
  const recoveryHistory = [...legacyVaultRecoveries, ...vaultRecoveries].slice(-3).reverse()
  const nextRecovery = Math.max(0, 10 - shards)

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
              파편 10개로 개념 하나를 회수합니다. 등급은 회수 순간 정해지며,
              높은 등급일수록 개봉 연출이 길어집니다.
            </p>

            <section className="vault__progress" aria-label="파편 회수 진행">
              <div>
                <span>회수 파편</span>
                <strong>{Math.min(shards, 10)}<small>/10</small></strong>
                <em>{shards >= 10 ? '지금 회수 가능' : `${nextRecovery}개 더 필요`}</em>
              </div>
              <i aria-hidden><b style={{ width: `${Math.min(100, shards * 10)}%` }} /></i>
            </section>

            <section className="vault__odds" aria-labelledby="vault-odds-title">
              <div className="vault__section-heading">
                <h3 id="vault-odds-title">회수 등급</h3>
                <span>정확한 확률</span>
              </div>
              <ul>
                {VAULT_GRADE_ORDER.map((grade) => (
                  <li key={grade} className={`is-${grade}`}>
                    <span>{GACHA_KO[grade]}</span>
                    <strong>{GACHA_ODDS[grade]}%</strong>
                  </li>
                ))}
              </ul>
              <p className="vault__risk">
                <b>미분류 3%</b>
                <span>살아 있는 기둥 하나의 안정도 −15</span>
              </p>
            </section>

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

            <section className="vault__ledger" aria-labelledby="vault-ledger-title">
              <div className="vault__section-heading">
                <h3 id="vault-ledger-title">회수 도감</h3>
                <strong>{recoveredKeys.size}/{VAULT_ENTRY_COUNT}</strong>
              </div>
              <div className="vault__grade-counts" aria-label="등급별 회수 수">
                {VAULT_GRADE_ORDER.map((grade) => {
                  const gradeCount = new Set(
                    vaultRecoveries
                      .filter((concept) => concept.vaultGrade === grade)
                      .flatMap((concept) => (concept.vaultKey ? [concept.vaultKey] : [])),
                  ).size
                  return (
                    <span key={grade} className={`is-${grade}`}>
                      {GACHA_KO[grade]} <b>{gradeCount}/{GACHA_POOL[grade].length}</b>
                    </span>
                  )
                })}
              </div>

              {recoveryHistory.length > 0 ? (
                <ol className="vault__history" aria-label="최근 회수 기록">
                  {recoveryHistory.map((concept) => (
                    <li key={concept.id}>
                      <span aria-hidden>{concept.emoji}</span>
                      <strong>{concept.name}</strong>
                      <em>{concept.vaultGrade ? GACHA_KO[concept.vaultGrade] : '기록 없음'}</em>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="vault__empty">아직 보관소에서 회수한 개념이 없습니다.</p>
              )}

              {legacyVaultRecoveries.length > 0 && (
                <p className="vault__legacy-note">
                  이전 회수 {legacyVaultRecoveries.length}건은 당시 원본·등급 기록이 없어
                  도감 수에는 포함되지 않습니다.
                </p>
              )}

              <details className="vault__catalog">
                <summary>40종 도감 보기</summary>
                {VAULT_GRADE_ORDER.map((grade) => (
                  <div key={grade} className="vault__catalog-grade">
                    <h4>{GACHA_KO[grade]}</h4>
                    <ul>
                      {GACHA_POOL[grade].map((entry) => {
                        const key = `${grade}:${entry.name}`
                        const collected = recoveredKeys.has(key)
                        return (
                          <li key={key} className={collected ? 'is-collected' : ''}>
                            <span aria-hidden>{collected ? entry.emoji : '◇'}</span>
                            <em>{collected ? entry.name : '봉인된 기록'}</em>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </details>
            </section>

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
