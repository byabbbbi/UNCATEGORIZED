import { useEffect, useRef, useState } from 'react'
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
import {
  REWARDED_AD_DAILY_LIMIT,
  REWARDED_AD_SHARDS,
  VAULT_SINGLE_COST,
  VAULT_TEN_COST,
  VAULT_TEN_COUNT,
} from '../data/vaultEconomy'
import {
  getRewardedAdStatus,
  recordRewardedAdReward,
  showRewardedAd,
} from '../ads/rewardedAd'
import { gradeDelayMs } from '../types'
import { pillarStabilityMap } from '../utils/pillars'
import './VaultModal.css'

const VAULT_ENTRY_COUNT = VAULT_GRADE_ORDER.reduce(
  (total, grade) => total + GACHA_POOL[grade].length,
  0,
)

export function VaultModal() {
  const open = useGameStore((s) => s.fx.vaultOpen)
  const loading = useGameStore((s) => s.fx.vaultLoading)
  const reveal = useGameStore((s) => s.fx.vaultReveal)
  const reveals = useGameStore((s) => s.fx.vaultReveals)
  const revealIndex = useGameStore((s) => s.fx.vaultRevealIndex)
  const summary = useGameStore((s) => s.fx.vaultSummary)
  const unclassifiedFx = useGameStore((s) => s.fx.unclassifiedFx)
  const shards = useGameStore((s) => s.shards)
  const closeVault = useGameStore((s) => s.closeVault)
  const pullVault = useGameStore((s) => s.pullVault)
  const advanceVaultReveal = useGameStore((s) => s.advanceVaultReveal)
  const skipVaultReveals = useGameStore((s) => s.skipVaultReveals)
  const grantRewardedAdShards = useGameStore((s) => s.grantRewardedAdShards)
  const concepts = useGameStore((s) => s.concepts)
  const pillars = useGameStore((s) => s.pillars)
  const [adPending, setAdPending] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const skipTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  useEffect(() => {
    if (!open) {
      setAdPending(false)
      return
    }
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [open])

  useEffect(() => {
    if (!open || !reveal) return
    const timer = window.setTimeout(advanceVaultReveal, gradeDelayMs(reveal.grade))
    return () => window.clearTimeout(timer)
  }, [advanceVaultReveal, open, reveal])

  useEffect(() => () => {
    if (skipTimer.current) window.clearTimeout(skipTimer.current)
  }, [])

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
  const nextRecovery = Math.max(0, VAULT_SINGLE_COST - shards)
  const adStatus = getRewardedAdStatus(now)
  const openingTen = reveals.length === VAULT_TEN_COUNT && !!reveal
  const opening = !!reveal
  const canPull = !loading && !opening && !summary

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
              <button type="button" className="vault__close" onClick={closeVault} disabled={opening || loading}>
                닫기
              </button>
            </header>
            <p className="vault__copy">
              파편 {VAULT_SINGLE_COST}개로 개념 하나를 회수합니다. 10연 회수는
              파편 {VAULT_TEN_COST}개이며, 판정불가 이상 회수품을 1개 보장합니다.
            </p>

            <section className="vault__progress" aria-label="파편 회수 진행">
              <div>
                <span>회수 파편</span>
                <strong>{Math.min(shards, VAULT_SINGLE_COST)}<small>/{VAULT_SINGLE_COST}</small></strong>
                <em>{shards >= VAULT_SINGLE_COST ? '단일 회수 가능' : `${nextRecovery}개 더 필요`}</em>
              </div>
              <i aria-hidden><b style={{ width: `${Math.min(100, (shards / VAULT_SINGLE_COST) * 100)}%` }} /></i>
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
                {!reveal && !summary && (
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
                    key={`face-${reveal.conceptId}`}
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
                    {openingTen && (
                      <p className="vault__reveal-count">
                        {revealIndex + 1}/{VAULT_TEN_COUNT} 회수
                      </p>
                    )}
                  </motion.div>
                )}
                {summary && (
                  <motion.section
                    key="summary"
                    className="vault__summary"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <span>10연 회수 완료</span>
                    <h3>결과 대장</h3>
                    <ul aria-label="등급별 회수 결과">
                      {VAULT_GRADE_ORDER.map((grade) => (
                        <li key={grade} className={`is-${grade}`}>
                          <span>{GACHA_KO[grade]}</span>
                          <strong>{summary.gradeCounts[grade]}개</strong>
                        </li>
                      ))}
                    </ul>
                    <p>판정불가 이상 1개 보장 · 총 {summary.count}개를 기록했습니다.</p>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>

            {openingTen && (
              <button
                type="button"
                className="vault__skip"
                onPointerDown={() => {
                  skipTimer.current = window.setTimeout(() => {
                    skipTimer.current = null
                    skipVaultReveals()
                  }, 400)
                }}
                onPointerUp={() => {
                  if (skipTimer.current) window.clearTimeout(skipTimer.current)
                  skipTimer.current = null
                }}
                onPointerCancel={() => {
                  if (skipTimer.current) window.clearTimeout(skipTimer.current)
                  skipTimer.current = null
                }}
              >
                길게 눌러 전체 결과 보기
              </button>
            )}

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

            <section className="vault__rewarded" aria-labelledby="vault-rewarded-title">
              <div>
                <h3 id="vault-rewarded-title">분실물 대장 열람</h3>
                <p>기록을 열람하면 파편 {REWARDED_AD_SHARDS}개를 받습니다.</p>
              </div>
              <button
                type="button"
                className="vault__rewarded-button"
                disabled={!adStatus.available || adPending}
                onClick={async () => {
                  if (!getRewardedAdStatus().available || adPending) return
                  setAdPending(true)
                  const completed = await showRewardedAd()
                  if (completed && recordRewardedAdReward()) grantRewardedAdShards()
                  setNow(Date.now())
                  setAdPending(false)
                }}
              >
                {adPending
                  ? '기록을 열람하는 중…'
                  : adStatus.remainingToday === 0
                    ? `오늘 열람 완료 (${REWARDED_AD_DAILY_LIMIT}/${REWARDED_AD_DAILY_LIMIT})`
                    : adStatus.cooldownMs > 0
                      ? `${Math.ceil(adStatus.cooldownMs / 60000)}분 후 다시 열람`
                      : '분실물 대장을 열람한다'}
              </button>
              <small>광고가 재생됩니다 · 오늘 {adStatus.watches}/{REWARDED_AD_DAILY_LIMIT}회</small>
            </section>

            <div className="vault__pull-actions">
              <button
                type="button"
                className="vault__pull"
                disabled={shards < VAULT_SINGLE_COST || !canPull}
                onClick={() => pullVault(1)}
              >
                단일 회수 · 파편 {VAULT_SINGLE_COST}
              </button>
              <button
                type="button"
                className="vault__pull vault__pull--ten"
                disabled={shards < VAULT_TEN_COST || !canPull}
                onClick={() => pullVault(VAULT_TEN_COUNT)}
              >
                10연 회수 · 파편 {VAULT_TEN_COST}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
