import { zzfx, ZZFX } from 'zzfx'

let muted = false
let unlocked = false
let unlockInFlight: Promise<void> | null = null

export function isMuted() {
  return muted
}

export function setMuted(next: boolean) {
  muted = next
}

export function toggleMute() {
  muted = !muted
  return muted
}

/** 첫 사용자 제스처에서 AudioContext 잠금 해제 */
export function unlockAudio() {
  const context = ZZFX.audioContext
  if (unlocked || context.state === 'running') {
    unlocked = true
    return
  }
  if (unlockInFlight) return
  unlockInFlight = context
    .resume()
    .then(() => {
      unlocked = context.state === 'running'
    })
    .catch(() => {
      unlocked = false
    })
    .finally(() => {
      unlockInFlight = null
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function play(params: any[]) {
  if (muted) return
  try {
    zzfx(...params)
  } catch {
    /* AudioContext 미준비 시 무시 */
  }
}

export const sfx = {
  pick: () => play([, , 220, 0.01, 0.02, 0.06, , 1.2, , , , , , , , , 0.02]),
  drop: () => play([, , 140, 0.01, 0.03, 0.08, 1, 1.1, , , , , , 0.2]),
  combine: () => play([, , 480, 0.02, 0.09, 0.18, 1, 1.8, , , 120, 0.06, , , , , 0.05]),
  discover: () => play([, , 660, 0.03, 0.14, 0.26, 1, 1.6, , , 220, 0.07, 0.04, , , , 0.08]),
  declare: () => play([, , 90, 0.04, 0.12, 0.3, 2, 1.4, -2, , , , , 0.4]),
  collapse: () => play([, , 55, 0.08, 0.3, 0.6, 3, 2.2, -4, , , , 0.1, 0.6, , 0.3, 0.2]),
  reject: () => play([, , 180, 0.02, 0.03, 0.1, 3, 1.4, -8]),
  gacha: () => play([, , 900, 0.02, 0.2, 0.3, , 1.5, , , 300, 0.05, , , , , 0.06]),
}
