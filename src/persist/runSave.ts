import type {
  CanvasInstance,
  ChronicleEntry,
  Concept,
  EraCaseState,
  Pillar,
  PillarKey,
  TutorialStep,
} from '../types'

export const SAVE_VERSION = 2
export const SAVE_KEY = 'uncat-save-v1'
export const DAILY_SAVE_KEY = 'uncat-daily-save-v1'

export interface RunSaveStats {
  discoveries: number
  proclamations: number
  resignations: number
}

export interface RunSaveV1 {
  version: typeof SAVE_VERSION
  savedAt: number
  concepts: Concept[]
  discoveredIds: string[]
  pillars: Pillar[]
  coherence: number
  era: number
  worldSeed: number
  eraCase: EraCaseState
  shards: number
  collapsed: PillarKey[]
  collapsedRules: string[]
  contaminantCounts: Record<string, number>
  chronicle: ChronicleEntry[]
  proclamationsThisEra: number
  instances: CanvasInstance[]
  codex: Record<string, string>
  tutorialStep: TutorialStep
  stats: RunSaveStats
  muted: boolean
}

export interface DailyRunSaveV1 extends RunSaveV1 {
  dailyDate: string
}

export interface LoadRunResult {
  save: RunSaveV1
  cancelledProcessing: number
}

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()

function cancelScheduledSave(key: string) {
  const timer = saveTimers.get(key)
  if (!timer) return
  clearTimeout(timer)
  saveTimers.delete(key)
}

export function hasSavedRun(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return false
    const data = JSON.parse(raw) as RunSaveV1
    return data.version === SAVE_VERSION && data.concepts?.length > 0
  } catch {
    return false
  }
}

export function clearSave() {
  if (typeof localStorage === 'undefined') return
  cancelScheduledSave(SAVE_KEY)
  localStorage.removeItem(SAVE_KEY)
}

export function clearDailySave() {
  if (typeof localStorage === 'undefined') return
  cancelScheduledSave(DAILY_SAVE_KEY)
  localStorage.removeItem(DAILY_SAVE_KEY)
}

export function loadRun(): LoadRunResult | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as RunSaveV1
    if (data.version !== SAVE_VERSION) {
      clearSave()
      return null
    }
    const cancelledProcessing = data.instances.filter((i) => i.processing).length
    data.instances = data.instances.filter((i) => !i.processing)
    return { save: data, cancelledProcessing }
  } catch {
    clearSave()
    return null
  }
}

export function loadDailyRun(date: string): LoadRunResult | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(DAILY_SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as DailyRunSaveV1
    if (data.version !== SAVE_VERSION) {
      clearDailySave()
      return null
    }
    if (data.dailyDate !== date) return null
    const cancelledProcessing = data.instances.filter((i) => i.processing).length
    data.instances = data.instances.filter((i) => !i.processing)
    return { save: data, cancelledProcessing }
  } catch {
    clearDailySave()
    return null
  }
}

type SaveableState = {
  screen: string
  gameMode: 'standard' | 'demo' | 'daily'
  dailyDate: string | null
  fx: { inputLocked: boolean }
  concepts: Concept[]
  discoveredIds: string[]
  pillars: Pillar[]
  coherence: number
  era: number
  worldSeed: number
  eraCase: EraCaseState
  shards: number
  collapsed: PillarKey[]
  collapsedRules: string[]
  contaminantCounts: Record<string, number>
  chronicle: ChronicleEntry[]
  proclamationsThisEra: number
  instances: CanvasInstance[]
  codex: Record<string, string>
  tutorialStep: TutorialStep
  stats: RunSaveStats
  muted: boolean
}

function payloadOf(state: SaveableState): RunSaveV1 {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    concepts: state.concepts,
    discoveredIds: state.discoveredIds,
    pillars: state.pillars,
    coherence: state.coherence,
    era: state.era,
    worldSeed: state.worldSeed,
    eraCase: state.eraCase,
    shards: state.shards,
    collapsed: state.collapsed,
    collapsedRules: state.collapsedRules,
    contaminantCounts: state.contaminantCounts,
    chronicle: state.chronicle,
    proclamationsThisEra: state.proclamationsThisEra,
    instances: state.instances,
    codex: state.codex,
    tutorialStep: state.tutorialStep,
    stats: state.stats,
    muted: state.muted,
  }
}

function saveDestination(state: SaveableState): {
  key: string
  payload: RunSaveV1 | DailyRunSaveV1
} | null {
  const payload = payloadOf(state)
  if (state.gameMode !== 'daily') return { key: SAVE_KEY, payload }
  if (!state.dailyDate) return null
  return {
    key: DAILY_SAVE_KEY,
    payload: { ...payload, dailyDate: state.dailyDate },
  }
}

export function scheduleSave(state: SaveableState) {
  if (typeof localStorage === 'undefined') return
  if (state.screen !== 'play' || state.fx.inputLocked) return

  const destination = saveDestination(state)
  if (!destination) return
  cancelScheduledSave(destination.key)
  const timer = setTimeout(() => {
    localStorage.setItem(destination.key, JSON.stringify(destination.payload))
    saveTimers.delete(destination.key)
  }, 500)
  saveTimers.set(destination.key, timer)
}

export function flushSave(state: SaveableState) {
  if (typeof localStorage === 'undefined') return
  if (state.screen !== 'play') return
  const destination = saveDestination(state)
  if (!destination) return
  cancelScheduledSave(destination.key)
  localStorage.setItem(destination.key, JSON.stringify(destination.payload))
}
