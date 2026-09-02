const HAPTICS_KEY = 'uncat-mobile-haptics-v1'

export function isMobileViewport() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 767px)').matches
  )
}

export function supportsHaptics() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export function hapticsEnabled() {
  if (typeof localStorage === 'undefined') return true
  try {
    return localStorage.getItem(HAPTICS_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setHapticsEnabled(enabled: boolean) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(HAPTICS_KEY, enabled ? 'on' : 'off')
  } catch {
    /* 설정 저장에 실패해도 현재 플레이는 계속한다. */
  }
}

export function vibrateMobile(duration: number) {
  if (!isMobileViewport() || !supportsHaptics() || !hapticsEnabled()) return
  try {
    navigator.vibrate(duration)
  } catch {
    /* 지원 표기가 부정확한 브라우저는 무시한다. */
  }
}
