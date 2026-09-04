import {
  REWARDED_AD_COOLDOWN_MS,
  REWARDED_AD_DAILY_LIMIT,
} from '../data/vaultEconomy'

const REWARDED_AD_KEY = 'uncat-rewarded-ad-v1'

type RewardedAdLedger = {
  kstDate: string
  watches: number
  lastRewardAt: number
}

export interface RewardedAdStatus {
  watches: number
  remainingToday: number
  cooldownMs: number
  available: boolean
}

function kstDate(now: number) {
  // KST에는 일광 절약 시간이 없으므로 UTC에 9시간을 더하면 안정적으로 날짜를 얻는다.
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function readLedger(now: number): RewardedAdLedger {
  const fresh: RewardedAdLedger = {
    kstDate: kstDate(now),
    watches: 0,
    lastRewardAt: 0,
  }
  if (typeof localStorage === 'undefined') return fresh

  try {
    const stored = JSON.parse(localStorage.getItem(REWARDED_AD_KEY) ?? '') as Partial<RewardedAdLedger>
    if (stored.kstDate !== fresh.kstDate) return fresh
    return {
      kstDate: fresh.kstDate,
      watches: Math.max(0, Math.min(REWARDED_AD_DAILY_LIMIT, Number(stored.watches) || 0)),
      lastRewardAt: Number(stored.lastRewardAt) || 0,
    }
  } catch {
    return fresh
  }
}

export function getRewardedAdStatus(now = Date.now()): RewardedAdStatus {
  const ledger = readLedger(now)
  const cooldownMs = Math.max(0, ledger.lastRewardAt + REWARDED_AD_COOLDOWN_MS - now)
  const remainingToday = Math.max(0, REWARDED_AD_DAILY_LIMIT - ledger.watches)
  return {
    watches: ledger.watches,
    remainingToday,
    cooldownMs,
    available: remainingToday > 0 && cooldownMs === 0,
  }
}

/** 광고 제공 SDK를 연결하기 전의 개발용 어댑터. */
export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(true), 3000)
  })
}

/** 보상이 실제로 끝까지 재생됐을 때만 호출한다. */
export function recordRewardedAdReward(now = Date.now()): boolean {
  const status = getRewardedAdStatus(now)
  if (!status.available || typeof localStorage === 'undefined') return false
  try {
    localStorage.setItem(
      REWARDED_AD_KEY,
      JSON.stringify({
        kstDate: kstDate(now),
        watches: status.watches + 1,
        lastRewardAt: now,
      } satisfies RewardedAdLedger),
    )
    return true
  } catch {
    return false
  }
}
