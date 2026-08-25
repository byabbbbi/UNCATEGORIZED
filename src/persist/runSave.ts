import type {
  CanvasInstance,
  ChronicleEntry,
  Concept,
  Pillar,
  PillarKey,
  TutorialStep,
} from '../types'

export const SAVE_VERSION = 1
export const SAVE_KEY = 'uncat-save-v1'

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

export interface LoadRunResult {
  save: RunSaveV1
  cancelledProcessing: number
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

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
  localStorage.removeItem(SAVE_KEY)
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

type SaveableState = {
  screen: string
  fx: { inputLocked: boolean }
  concepts: Concept[]
  discoveredIds: string[]
  pillars: Pillar[]
  coherence: number
  era: number
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

export function scheduleSave(state: SaveableState) {
  if (typeof localStorage === 'undefined') return
  if (state.screen !== 'play' || state.fx.inputLocked) return

  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const payload: RunSaveV1 = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      concepts: state.concepts,
      discoveredIds: state.discoveredIds,
      pillars: state.pillars,
      coherence: state.coherence,
      era: state.era,
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
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
  }, 500)
}

export function flushSave(state: SaveableState) {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (typeof localStorage === 'undefined') return
  if (state.screen !== 'play') return
  const payload: RunSaveV1 = {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    concepts: state.concepts,
    discoveredIds: state.discoveredIds,
    pillars: state.pillars,
    coherence: state.coherence,
    era: state.era,
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
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
}
