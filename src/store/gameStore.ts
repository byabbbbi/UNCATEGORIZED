import { create } from 'zustand'
import {
  applyCollapseName,
  fallbackGenerate,
  generate,
  hashStr,
  pairKey,
  type WorldState,
} from '../generation'
import {
  INITIAL_CONCEPTS,
  INITIAL_PILLARS,
  INDISTINCT_COLLAPSE_THRESHOLD,
  MAX_ERA,
  MAX_PROCLAMATIONS_PER_ERA,
  PILLAR_KO,
} from '../data/initial'
import { COLLAPSE_RULES } from '../data/rules'
import { createEraCase, createWorldSeed } from '../data/caseFiles'
import { getDailyWorld, type DailyWorldConfig } from '../data/dailyWorld'
import { pickGodLine } from '../data/godlines'
import {
  buildDemoConcepts,
  DEMO_SAVE,
  demoCollapsedRules,
} from '../data/demoSave'
import {
  GACHA_POOL,
  gradeBonusT,
  rollVaultGrade,
} from '../data/gachaPool'
import { calcProclaimImpact } from '../game/formulas'
import { getEraDMultiplier } from '../data/balance'
import { isMuted, sfx, toggleMute as flipMute } from '../sfx'
import { vibrateMobile } from '../mobileFeedback'
import { josa } from '../utils/josa'
import { firstGrapheme } from '../utils/emoji'
import {
  clearDailySave,
  clearSave,
  flushSave,
  loadDailyRun,
  loadRun,
  scheduleSave,
} from '../persist/runSave'
import type {
  CanvasInstance,
  ChronicleEntry,
  Concept,
  EndingKind,
  EraCaseState,
  FxState,
  GameMode,
  MobileComboSlot,
  MobileComboToast,
  Pillar,
  PillarKey,
  ScreenMode,
  TutorialStep,
  VaultGrade,
} from '../types'
import {
  ALTAR_R,
  CARD_H,
  CARD_W,
  COMBINE_RADIUS,
  gradeDelayMs,
  pillarPhase,
} from '../types'

let chronicleSeq = 0
let instanceSeq = 0
let conceptSeq = 0
const DEMO_WORLD_SEED = hashStr('collapsed-demo-v1')

function entry(era: number, text: string): ChronicleEntry {
  chronicleSeq += 1
  return { id: `c-${chronicleSeq}`, era, text }
}

function uid(prefix: string) {
  instanceSeq += 1
  return `${prefix}-${instanceSeq}`
}

function newConceptId(name: string) {
  conceptSeq += 1
  return `g-${conceptSeq}-${hashStr(name).toString(36)}`
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

function centerOf(inst: CanvasInstance) {
  return { x: inst.x + CARD_W / 2, y: inst.y + CARD_H / 2 }
}

const emptyFx = (): FxState => ({
  rejectInstanceId: null,
  sealFlash: false,
  whiteFlash: false,
  screenShake: 0,
  typingRule: null,
  unclassifiedFx: false,
  vaultOpen: false,
  vaultReveal: null,
  godLine: null,
  inputLocked: false,
  discoverPop: 0,
  shardPop: 0,
  drawerHighlight: false,
  shardFlights: [],
})

export interface GameStats {
  discoveries: number
  proclamations: number
  resignations: number
}

export interface GameStore {
  screen: ScreenMode
  gameMode: GameMode
  dailyDate: string | null
  ending: EndingKind
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
  pending: Record<string, true>
  /** pairKey(이름+이름) → 해당 쌍의 최초(현행) 결과명 */
  codex: Record<string, string>
  tutorialStep: TutorialStep
  selectedInstanceId: string | null
  hoverConceptId: string | null
  targetPillar: PillarKey | null
  message: string | null
  muted: boolean
  fx: FxState
  stats: GameStats
  codexOpen: boolean
  mobileComboSlots: [MobileComboSlot | null, MobileComboSlot | null]
  mobileComboPreparing: boolean
  mobileComboToast: MobileComboToast | null

  startFresh: () => void
  startContinue: () => void
  startDemo: () => void
  startDaily: () => void
  returnToTitle: () => void
  reset: () => void
  setHoverConcept: (id: string | null) => void
  selectInstance: (id: string | null) => void
  setTargetPillar: (key: PillarKey | null) => void
  spawnFromDrawer: (conceptId: string, x: number, y: number) => void
  duplicateInstance: (instanceId: string) => void
  queueMobileComboInstance: (instanceId: string) => void
  queueMobileComboConcept: (conceptId: string) => void
  removeMobileComboSlot: (index: 0 | 1) => void
  clearMobileComboSlots: () => void
  clearMobileComboToast: (id: string) => void
  setInstancePos: (instanceId: string, x: number, y: number) => void
  dismissInstance: (instanceId: string) => void
  setDrawerHighlight: (on: boolean) => void
  tidyCanvas: () => void
  openCodex: () => void
  closeCodex: () => void
  proclaimInstance: (instanceId: string) => void
  handleDrop: (
    instanceId: string,
    center: { x: number; y: number },
    altar: { x: number; y: number },
    allowProclamation?: boolean,
  ) => void
  endEra: () => void
  openVault: () => void
  closeVault: () => void
  pullVault: () => void
  clearTypingRule: () => void
  clearGodLine: () => void
  dismissTutorial: () => void
  toggleMute: () => void
}

function seedInstances(concepts: Concept[]): CanvasInstance[] {
  const mobile =
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 767px)').matches
  const initialCount = Math.min(concepts.length, 4)
  const mobileColumns = Math.min(initialCount, 3)
  const mobileStartX = mobile
    ? Math.max(
        14,
        ((window.innerWidth - 16) -
          (mobileColumns * CARD_W + Math.max(0, mobileColumns - 1) * 14)) /
          2,
      )
    : 0
  return concepts.slice(0, 4).map((c, i) => ({
    instanceId: uid('i'),
    conceptId: c.id,
    x: mobile
      ? mobileStartX + (i % 3) * (CARD_W + 14)
      : 56 + i * 114,
    y: mobile ? 82 + Math.floor(i / 3) * 82 : 72 + (i % 2) * 40,
  }))
}

function restorePillars(saved: Pillar[], collapsed: PillarKey[]): Pillar[] {
  const savedByKey = new Map(saved.map((pillar) => [pillar.key, pillar.stability]))
  return INITIAL_PILLARS.map((pillar) => ({
    ...pillar,
    stability:
      savedByKey.get(pillar.key) ??
      (collapsed.includes(pillar.key) ? 0 : pillar.stability),
  }))
}

function createPlayState(opts?: {
  demo?: boolean
  daily?: DailyWorldConfig
  worldSeed?: number
}): Omit<
  GameStore,
  | 'startFresh'
  | 'startContinue'
  | 'startDemo'
  | 'startDaily'
  | 'returnToTitle'
  | 'reset'
  | 'setHoverConcept'
  | 'selectInstance'
  | 'setTargetPillar'
  | 'spawnFromDrawer'
  | 'duplicateInstance'
  | 'queueMobileComboInstance'
  | 'queueMobileComboConcept'
  | 'removeMobileComboSlot'
  | 'clearMobileComboSlots'
  | 'clearMobileComboToast'
  | 'setInstancePos'
  | 'dismissInstance'
  | 'setDrawerHighlight'
  | 'tidyCanvas'
  | 'openCodex'
  | 'closeCodex'
  | 'proclaimInstance'
  | 'handleDrop'
  | 'endEra'
  | 'openVault'
  | 'closeVault'
  | 'pullVault'
  | 'clearTypingRule'
  | 'clearGodLine'
  | 'dismissTutorial'
  | 'toggleMute'
> {
  chronicleSeq = 0
  instanceSeq = 0
  conceptSeq = 0

  const worldSeed =
    opts?.daily?.seed ??
    (opts?.demo ? DEMO_WORLD_SEED : opts?.worldSeed ?? createWorldSeed())

  if (opts?.demo) {
    const concepts = buildDemoConcepts()
    const collapsed = [...DEMO_SAVE.collapsed]
    return {
      screen: 'play',
      gameMode: 'demo',
      dailyDate: null,
      ending: null,
      concepts,
      discoveredIds: concepts.map((c) => c.id),
      pillars: INITIAL_PILLARS.map((pillar) => ({
        ...pillar,
        stability: DEMO_SAVE.pillars[pillar.key] ?? pillar.stability,
      })),
      coherence: DEMO_SAVE.coherence,
      era: DEMO_SAVE.era,
      worldSeed,
      eraCase: createEraCase(worldSeed, DEMO_SAVE.era, collapsed.length),
      shards: DEMO_SAVE.shards,
      collapsed,
      collapsedRules: demoCollapsedRules(),
      contaminantCounts: { ...DEMO_SAVE.contaminantCounts },
      chronicle: [
        entry(DEMO_SAVE.era, '붕괴된 세계의 기록을 열람한다.'),
        entry(3, 'QUANTITAS와 QUALITAS가 반납되었다.'),
      ],
      proclamationsThisEra:
        MAX_PROCLAMATIONS_PER_ERA - DEMO_SAVE.declaresLeft,
      instances: seedInstances(concepts),
      pending: {},
      codex: {},
      tutorialStep: 'done' as TutorialStep,
      selectedInstanceId: null,
      hoverConceptId: null,
      targetPillar: null,
      message: '붕괴된 세계 — 규칙이 이미 적용 중',
      muted: false,
      fx: emptyFx(),
      stats: { discoveries: concepts.length, proclamations: 8, resignations: 2 },
      codexOpen: false,
      mobileComboSlots: [null, null],
      mobileComboPreparing: false,
      mobileComboToast: null,
    }
  }

  if (opts?.daily) {
    const daily = opts.daily
    const concepts = daily.concepts.map((concept) => ({ ...concept }))
    const collapsed = [...daily.collapsed]
    const tutorialDone =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('tutorialDone') === '1'
    const collapseChronicle = collapsed.map((key) =>
      entry(1, `${PILLAR_KO[key]}의 기둥은 세계가 열리기 전에 이미 무너졌다.`),
    )
    return {
      screen: 'play',
      gameMode: 'daily',
      dailyDate: daily.date,
      ending: null,
      concepts,
      discoveredIds: concepts.map((concept) => concept.id),
      pillars: INITIAL_PILLARS.map((pillar) => ({
        ...pillar,
        stability: collapsed.includes(pillar.key) ? 0 : pillar.stability,
      })),
      coherence: 100,
      era: 1,
      worldSeed,
      eraCase: createEraCase(worldSeed, 1, collapsed.length),
      shards: 0,
      collapsed,
      collapsedRules: collapsed.map((key) => COLLAPSE_RULES[key]),
      contaminantCounts: { [daily.contaminant]: 3 },
      chronicle: [
        entry(1, `오늘의 세계가 「${daily.contaminant}」에 감염된 채로 열린다.`),
        ...collapseChronicle,
      ],
      proclamationsThisEra: 0,
      instances: seedInstances(concepts),
      pending: {},
      codex: {},
      tutorialStep: tutorialDone ? ('done' as TutorialStep) : 1,
      selectedInstanceId: null,
      hoverConceptId: null,
      targetPillar: null,
      message: `오늘의 세계 — 「${daily.contaminant}」 오염 승격 상태`,
      muted: false,
      fx: emptyFx(),
      stats: { discoveries: 0, proclamations: 0, resignations: collapsed.length },
      codexOpen: false,
      mobileComboSlots: [null, null],
      mobileComboPreparing: false,
      mobileComboToast: null,
    }
  }

  const concepts = INITIAL_CONCEPTS.map((c) => ({ ...c }))
  const tutorialDone =
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('tutorialDone') === '1'
  return {
    screen: 'play',
    gameMode: 'standard',
    dailyDate: null,
    ending: null,
    concepts,
    discoveredIds: concepts.map((c) => c.id),
    pillars: INITIAL_PILLARS.map((p) => ({ ...p })),
    coherence: 100,
    era: 1,
    worldSeed,
    eraCase: createEraCase(worldSeed, 1, 0),
    shards: 0,
    collapsed: [],
    collapsedRules: [],
    contaminantCounts: {},
    chronicle: [entry(1, '제1시대가 열린다. 여덟 기둥 아래 첫 개념이 놓인다.')],
    proclamationsThisEra: 0,
    instances: seedInstances(concepts),
    pending: {},
    codex: {},
    tutorialStep: tutorialDone ? ('done' as TutorialStep) : 1,
    selectedInstanceId: null,
    hoverConceptId: null,
    targetPillar: null,
    message: null,
    muted: false,
    fx: emptyFx(),
    stats: { discoveries: 0, proclamations: 0, resignations: 0 },
    codexOpen: false,
    mobileComboSlots: [null, null],
    mobileComboPreparing: false,
    mobileComboToast: null,
  }
}

function titleState() {
  return {
    ...createPlayState(),
    screen: 'title' as const,
    instances: [] as CanvasInstance[],
    chronicle: [] as ChronicleEntry[],
  }
}

function activeContaminants(counts: Record<string, number>): string[] {
  return Object.entries(counts)
    .filter(([, n]) => n >= 3)
    .map(([k]) => k)
}

function restoreSequences(
  concepts: Concept[],
  instances: CanvasInstance[],
  chronicle: ChronicleEntry[],
) {
  instanceSeq = instances.reduce((highest, item) => {
    const value = Number(item.instanceId.match(/-(\d+)$/)?.[1] ?? 0)
    return Math.max(highest, value)
  }, 0)
  conceptSeq = concepts.reduce((highest, item) => {
    const value = Number(item.id.match(/^g-(\d+)-/)?.[1] ?? 0)
    return Math.max(highest, value)
  }, 0)
  chronicleSeq = chronicle.reduce((highest, item) => {
    const value = Number(item.id.match(/^c-(\d+)$/)?.[1] ?? 0)
    return Math.max(highest, value)
  }, 0)
}

function advanceCaseProgress(
  eraCase: EraCaseState,
  progress: number,
  proclaimedPillars = eraCase.proclaimedPillars,
): { eraCase: EraCaseState; justCompleted: boolean } {
  if (eraCase.completed) return { eraCase, justCompleted: false }
  const nextProgress = Math.min(eraCase.target, progress)
  const completed = nextProgress >= eraCase.target
  return {
    eraCase: {
      ...eraCase,
      progress: nextProgress,
      completed,
      proclaimedPillars,
    },
    justCompleted: completed,
  }
}

function caseAfterCombination(
  eraCase: EraCaseState,
  a: Concept,
  b: Concept,
  result: Awaited<ReturnType<typeof generate>>,
  resultDepth: number,
  isDiscovery: boolean,
  contaminants: string[],
): { eraCase: EraCaseState; justCompleted: boolean } {
  if (eraCase.completed) return { eraCase, justCompleted: false }

  let increment = false
  if (eraCase.id === 'depth') {
    increment = isDiscovery && resultDepth >= 2 + eraCase.era
  } else if (eraCase.id === 'contaminated') {
    increment =
      isDiscovery &&
      contaminants.some((keyword) => result.name.includes(keyword))
  } else if (eraCase.id === 'selfCombine') {
    increment = a.id === b.id
  } else if (eraCase.id === 'discoveries') {
    increment = isDiscovery
  } else if (eraCase.id === 'censored') {
    increment = !!result.deleted
  }

  return increment
    ? advanceCaseProgress(eraCase, eraCase.progress + 1)
    : { eraCase, justCompleted: false }
}

function caseAfterProclamation(
  eraCase: EraCaseState,
  pillarKey: PillarKey,
  destruction: number,
): { eraCase: EraCaseState; justCompleted: boolean } {
  if (eraCase.completed) return { eraCase, justCompleted: false }

  if (eraCase.id === 'pillars') {
    const proclaimedPillars = eraCase.proclaimedPillars.includes(pillarKey)
      ? eraCase.proclaimedPillars
      : [...eraCase.proclaimedPillars, pillarKey]
    return advanceCaseProgress(
      eraCase,
      proclaimedPillars.length,
      proclaimedPillars,
    )
  }

  if (eraCase.id === 'destruction' && destruction >= 25) {
    return advanceCaseProgress(eraCase, 1)
  }

  return { eraCase, justCompleted: false }
}

function worldOf(s: {
  collapsed: PillarKey[]
  contaminantCounts: Record<string, number>
  era: number
}): WorldState {
  return {
    collapsed: s.collapsed,
    contaminants: activeContaminants(s.contaminantCounts),
    era: s.era,
  }
}

function reduceMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function isMobileViewport() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 767px)').matches
  )
}

function mobileBoardCenter(excludedInstanceIds: string[] = []) {
  const board = document.querySelector<HTMLElement>('.canvas-board')
  if (!board) return { x: 180, y: 160 }
  const rect = board.getBoundingClientRect()
  const xMin = CARD_W / 2 + 10
  const xMax = Math.max(xMin, rect.width - CARD_W / 2 - 10)
  const yMin = CARD_H / 2 + 14
  const yMax = Math.max(yMin, rect.height - CARD_H / 2 - 14)
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value))
  const candidates = [
    [0.5, 0.5],
    [0.27, 0.5],
    [0.73, 0.5],
    [0.5, 0.26],
    [0.5, 0.74],
    [0.25, 0.26],
    [0.75, 0.26],
    [0.25, 0.74],
    [0.75, 0.74],
  ] as const
  const current = useGameStore.getState()
  const visible = current.instances.filter(
    (instance) => !excludedInstanceIds.includes(instance.instanceId),
  )

  for (const [xRatio, yRatio] of candidates) {
    const point = {
      x: clamp(rect.width * xRatio, xMin, xMax),
      y: clamp(rect.height * yRatio, yMin, yMax),
    }
    const overlaps = visible.some((instance) => {
      const instanceCenterX = instance.x + CARD_W / 2
      const instanceCenterY = instance.y + CARD_H / 2
      return (
        Math.abs(instanceCenterX - point.x) < CARD_W - 8 &&
        Math.abs(instanceCenterY - point.y) < CARD_H - 8
      )
    })
    if (!overlaps) return point
  }

  return { x: rect.width / 2, y: Math.max(CARD_H / 2 + 18, rect.height / 2) }
}

function triggerEnding(kind: Exclude<EndingKind, null>) {
  const current = useGameStore.getState()
  if (current.gameMode === 'daily') clearDailySave()
  else clearSave()
  useGameStore.setState({
    screen: 'ending',
    ending: kind,
    fx: { ...useGameStore.getState().fx, inputLocked: true },
  })
}

function checkBlankEnding(coherence: number) {
  if (coherence <= 0) triggerEnding('blank')
}

function checkIndistinctEnding(collapsed: PillarKey[]) {
  if (collapsed.length >= INDISTINCT_COLLAPSE_THRESHOLD)
    triggerEnding('indistinct')
}

function showGodLine(text: string, ms = 2000) {
  useGameStore.setState((s) => ({
    fx: { ...s.fx, godLine: text },
  }))
  window.setTimeout(() => {
    useGameStore.setState((cur) => ({
      fx: { ...cur.fx, godLine: null },
    }))
  }, ms)
}

function spawnShardFlights(count: number) {
  if (count <= 0 || reduceMotion()) return
  const altar = document.querySelector('.altar')
  const vault = document.querySelector('.drawer__vault')
  if (!altar || !vault) return
  const a = altar.getBoundingClientRect()
  const v = vault.getBoundingClientRect()
  const fromX = a.left + a.width / 2
  const fromY = a.top + a.height / 2
  const toX = v.left + v.width / 2
  const toY = v.top + v.height / 2
  const n = Math.min(count, 8)
  const flights: import('../types').ShardFlight[] = Array.from({ length: n }, (_, i) => ({
    id: `sf-${Date.now()}-${i}`,
    fromX: fromX + (Math.random() - 0.5) * 18,
    fromY: fromY + (Math.random() - 0.5) * 18,
    toX: toX + (Math.random() - 0.5) * 10,
    toY: toY + (Math.random() - 0.5) * 10,
  }))
  useGameStore.setState((s) => ({
    fx: { ...s.fx, shardFlights: [...s.fx.shardFlights, ...flights] },
  }))
  window.setTimeout(() => {
    const ids = new Set(flights.map((f) => f.id))
    useGameStore.setState((s) => ({
      fx: {
        ...s.fx,
        shardFlights: s.fx.shardFlights.filter((f) => !ids.has(f.id)),
      },
    }))
  }, 700)
}

function bumpDiscoverPop() {
  useGameStore.setState((s) => ({
    fx: { ...s.fx, discoverPop: s.fx.discoverPop + 1 },
  }))
}

function runCollapseSequence(pillarKey: PillarKey) {
  const rule = COLLAPSE_RULES[pillarKey]
  const resignLine = pickGodLine(pillarKey, 'resign')
  const rm = reduceMotion()

  useGameStore.setState((s) => ({
    fx: {
      ...s.fx,
      inputLocked: true,
      whiteFlash: !rm,
      screenShake: rm ? 0 : 1,
    },
  }))
  sfx.collapse()
  vibrateMobile(60)

  window.setTimeout(() => {
    useGameStore.setState((s) => ({
      fx: { ...s.fx, whiteFlash: false, screenShake: 0, godLine: resignLine },
    }))
  }, rm ? 0 : 80)

  window.setTimeout(() => {
    useGameStore.setState((s) => {
      const collapsedRules = s.collapsedRules.includes(rule)
        ? s.collapsedRules
        : [...s.collapsedRules, rule]
      const collapsed = s.collapsed.includes(pillarKey)
        ? s.collapsed
        : [...s.collapsed, pillarKey]
      return {
        collapsed,
        collapsedRules,
        fx: {
          ...s.fx,
          godLine: null,
          typingRule: rule,
        },
        stats: { ...s.stats, resignations: s.stats.resignations + 1 },
        chronicle: [
          ...s.chronicle,
          entry(s.era, `${PILLAR_KO[pillarKey]}의 신이 사임했다. 규칙이 기록되었다.`),
        ],
      }
    })
  }, 1580)

  window.setTimeout(() => {
    useGameStore.setState((s) => ({
      fx: { ...s.fx, inputLocked: false },
    }))
    const cur = useGameStore.getState()
    checkIndistinctEnding(cur.collapsed)
  }, 3000)
}

function shakeReject(instanceId: string) {
  useGameStore.setState((s) => ({
    fx: { ...s.fx, rejectInstanceId: instanceId },
  }))
  window.setTimeout(() => {
    useGameStore.setState((s) => ({
      fx: { ...s.fx, rejectInstanceId: null },
    }))
  }, 260)
}

function declareOnAltar(instanceId: string) {
  const s = useGameStore.getState()
  if (s.fx.inputLocked || s.screen !== 'play') return

  const inst = s.instances.find((i) => i.instanceId === instanceId)
  if (!inst) return

  const concept = s.concepts.find((c) => c.id === inst.conceptId)
  if (!concept) return

  if (concept.deleted) {
    useGameStore.setState({ message: '삭제된 개념은 선포할 수 없다' })
    sfx.reject()
    shakeReject(instanceId)
    return
  }

  if (!s.targetPillar) {
    useGameStore.setState({ message: '우측에서 선포할 기둥을 고르세요' })
    sfx.reject()
    shakeReject(instanceId)
    return
  }

  if (s.proclamationsThisEra >= MAX_PROCLAMATIONS_PER_ERA) {
    useGameStore.setState({
      message: `이 시대의 선포 한도(${MAX_PROCLAMATIONS_PER_ERA}회)를 모두 썼습니다`,
    })
    sfx.reject()
    shakeReject(instanceId)
    return
  }

  const pillarKey = s.targetPillar
  const pillar = s.pillars.find((p) => p.key === pillarKey)
  if (!pillar || pillar.stability <= 0) {
    useGameStore.setState({
      message: `${PILLAR_KO[pillarKey]} 기둥은 이미 붕괴했습니다`,
    })
    sfx.reject()
    return
  }

  const { D, coherenceLoss, shardsGained } = calcProclaimImpact(concept)
  const effectiveD = D * getEraDMultiplier(s.era)
  const nextStability = Math.max(0, pillar.stability - effectiveD)
  const pillars = s.pillars.map((p) =>
    p.key === pillarKey ? { ...p, stability: nextStability } : p,
  )

  const justCollapsed = pillar.stability > 0 && nextStability <= 0
  const godPhase = justCollapsed
    ? 'resign'
    : pillarPhase(nextStability) === 'sophistry'
      ? 'sophistry'
      : 'judge'

  const line = entry(
    s.era,
    `${concept.emoji} ${concept.name}${josa(concept.name, ['을', '를'])} ${PILLAR_KO[pillarKey]}에 선포했다.`,
  )

  const nextCoherence = Math.max(0, s.coherence - coherenceLoss)
  const nextShards = s.shards + shardsGained
  const caseUpdate = caseAfterProclamation(s.eraCase, pillarKey, D)

  useGameStore.setState({
    pillars,
    coherence: nextCoherence,
    shards: nextShards,
    eraCase: caseUpdate.eraCase,
    proclamationsThisEra: s.proclamationsThisEra + 1,
    chronicle: [...s.chronicle, line],
    instances: s.instances.filter((i) => i.instanceId !== instanceId),
    selectedInstanceId: null,
    message: `${concept.name} → ${PILLAR_KO[pillarKey]} 선포`,
    stats: {
      ...s.stats,
      proclamations: s.stats.proclamations + 1,
    },
    fx: {
      ...s.fx,
      sealFlash: true,
      screenShake: justCollapsed || reduceMotion() ? 0 : 1,
    },
  })

  sfx.declare()
  if (caseUpdate.justCompleted) sfx.discover()
  if (shardsGained > 0) spawnShardFlights(shardsGained)

  if (!justCollapsed) {
    showGodLine(pickGodLine(pillarKey, godPhase), 2000)
    window.setTimeout(() => {
      useGameStore.setState((cur) => ({
        fx: { ...cur.fx, sealFlash: false, screenShake: 0 },
      }))
    }, 420)
  } else {
    window.setTimeout(() => {
      useGameStore.setState((cur) => ({
        fx: { ...cur.fx, sealFlash: false },
      }))
    }, 200)
    runCollapseSequence(pillarKey)
  }

  checkBlankEnding(nextCoherence)
}

function markTutorial(step: TutorialStep) {
  const cur = useGameStore.getState().tutorialStep
  if (cur === 'done' || cur === 0) return
  if (typeof step === 'number' && typeof cur === 'number' && step <= cur) return
  if (step === 'done') {
    try {
      localStorage.setItem('tutorialDone', '1')
    } catch {
      /* ignore */
    }
  }
  useGameStore.setState({ tutorialStep: step })
}

function resolveSlot(
  slotId: string,
  result: Awaited<ReturnType<typeof generate>>,
  a: Concept,
  b: Concept,
  combinationContaminants: string[],
) {
  const cur = useGameStore.getState()
  const slot = cur.instances.find((i) => i.instanceId === slotId)
  if (!slot?.processing) return

  const pk = pairKey(a.name, b.name)
  const previousName = cur.codex[pk]
  const isRerecord = !!previousName && previousName !== result.name
  const codex = { ...cur.codex, [pk]: result.name }

  const existing = cur.concepts.find(
    (c) => c.name === result.name && !c.deleted === !result.deleted,
  )
  const isDiscovery = !existing
  const resultDepth = Math.max(a.depth, b.depth) + 1
  const discoveryContaminants = activeContaminants(cur.contaminantCounts)

  let concept: Concept
  if (existing) {
    concept = existing
  } else {
    concept = {
      id: newConceptId(result.name),
      name: result.name,
      emoji: firstGrapheme(result.emoji),
      chaos: result.chaos,
      plausibility: result.plausibility,
      narrative: result.narrative,
      contagion: result.contagion,
      depth: resultDepth,
      pillar: result.pillar,
      contaminant: result.contaminant || undefined,
      parents: [a.name, b.name],
      bornAt: {
        era: cur.era,
        collapsed: cur.collapsed.length,
        contaminant:
          [...discoveryContaminants].sort().join(' · ') || null,
      },
      chronicle:
        result.chronicle ||
        `${result.name}${josa(result.name, ['이', '가'])} 목록에 추가되었다.`,
      deleted: result.deleted,
    }
  }

  const concepts = isDiscovery ? [...cur.concepts, concept] : cur.concepts
  const discoveredIds = isDiscovery
    ? [...cur.discoveredIds, concept.id]
    : cur.discoveredIds

  let coherence = cur.coherence
  let contaminantCounts = cur.contaminantCounts
  if (isDiscovery && result.deleted) {
    coherence = Math.min(100, coherence + 3)
  }

  const { [slotId]: _gone, ...restPending } = cur.pending
  void _gone

  let chronicle = cur.chronicle
  if (isRerecord && previousName) {
    chronicle = [
      ...chronicle,
      entry(
        cur.era,
        `${previousName}${josa(previousName, ['이', '가'])} ${result.name}로 다시 기록되었다. 이전 기록은 삭제되었다.`,
      ),
    ]
  } else if (isDiscovery) {
    chronicle = [
      ...chronicle,
      entry(
        cur.era,
        result.chronicle ||
          `${result.name}${josa(result.name, ['이', '가'])} 목록에 추가되었다.`,
      ),
    ]
  }

  if (isDiscovery && result.contaminant) {
    const key = result.contaminant
    const prev = contaminantCounts[key] ?? 0
    const next = prev + 1
    contaminantCounts = { ...contaminantCounts, [key]: next }
    if (prev < 3 && next >= 3) {
      chronicle = [
        ...chronicle,
        entry(cur.era, `이 세계는 이제 ${key}에 감염되었다.`),
      ]
    }
  }

  const shardGain = isDiscovery && !result.deleted ? 1 : 0
  const caseUpdate = caseAfterCombination(
    cur.eraCase,
    a,
    b,
    result,
    resultDepth,
    isDiscovery,
    combinationContaminants,
  )

  useGameStore.setState({
    concepts,
    discoveredIds,
    coherence,
    contaminantCounts,
    eraCase: caseUpdate.eraCase,
    shards: cur.shards + shardGain,
    pending: restPending,
    codex,
    stats: isDiscovery
      ? { ...cur.stats, discoveries: cur.stats.discoveries + 1 }
      : cur.stats,
    chronicle,
    instances: cur.instances.map((i) =>
      i.instanceId === slotId
        ? {
            instanceId: slotId,
            conceptId: concept.id,
            x: i.x,
            y: i.y,
            processing: false,
            revealDiscovery: isDiscovery || isRerecord,
            spawnPop: true,
            rerecord: isRerecord
              ? { previous: previousName!, current: result.name }
              : null,
          }
        : i,
    ),
    selectedInstanceId: slotId,
    hoverConceptId: concept.id,
    mobileComboToast: {
      id: uid('combo-toast'),
      first: {
        id: a.id,
        emoji: a.emoji,
        name: a.name,
        pillar: a.pillar,
        deleted: a.deleted,
      },
      second: {
        id: b.id,
        emoji: b.emoji,
        name: b.name,
        pillar: b.pillar,
        deleted: b.deleted,
      },
      result: {
        id: concept.id,
        emoji: concept.emoji,
        name: concept.name,
        pillar: concept.pillar,
        deleted: concept.deleted,
      },
      isDiscovery,
    },
    message: isRerecord
      ? `같은 조합이 다른 결과: ${previousName} → ${result.name}`
      : isDiscovery
        ? result.deleted
          ? '검열된 개념이 기록되었다'
          : `조합 성공: ${a.emoji}${b.emoji} → ${result.emoji} ${result.name}`
        : `이미 발견한 개념: ${concept.emoji} ${concept.name}`,
    fx:
      shardGain > 0
        ? { ...cur.fx, shardPop: cur.fx.shardPop + 1 }
        : cur.fx,
  })

  if (caseUpdate.justCompleted || isRerecord || isDiscovery) sfx.discover()
  else sfx.combine()
  vibrateMobile(isDiscovery ? 30 : 15)

  if (isDiscovery) {
    bumpDiscoverPop()
    markTutorial(2)
  }
  const afterCount = useGameStore.getState().concepts.length
  if (afterCount >= 6) markTutorial(3)

  window.setTimeout(() => {
    useGameStore.setState((st) => ({
      instances: st.instances.map((i) =>
        i.instanceId === slotId
          ? {
              ...i,
              revealDiscovery: false,
              spawnPop: undefined,
              rerecord: null,
            }
          : i,
      ),
    }))
  }, isRerecord ? 2500 : 900)
}

function beginCombination(
  a: Concept,
  b: Concept,
  consumedInstanceIds: string[],
  point: { x: number; y: number },
) {
  const s = useGameStore.getState()
  if (s.fx.inputLocked || s.screen !== 'play') return

  if (a.deleted || b.deleted) {
    useGameStore.setState({ message: '삭제된 개념은 조합할 수 없다' })
    sfx.reject()
    const firstInput = consumedInstanceIds[0]
    if (firstInput) shakeReject(firstInput)
    return
  }

  const slotId = uid('slot')
  const slot: CanvasInstance = {
    instanceId: slotId,
    conceptId: '',
    x: point.x - CARD_W / 2,
    y: point.y - CARD_H / 2,
    processing: true,
  }

  useGameStore.setState({
    instances: [
      ...s.instances.filter(
        (i) => !consumedInstanceIds.includes(i.instanceId),
      ),
      slot,
    ],
    pending: { ...s.pending, [slotId]: true },
    selectedInstanceId: null,
    message: '조합 판정 중…',
    tutorialStep: s.tutorialStep === 1 ? 2 : s.tutorialStep,
  })
  sfx.combine()

  const world = worldOf(s)
  const owned = new Set(s.concepts.map((c) => c.name))
  generate(a, b, world, owned)
    .then((res) => resolveSlot(slotId, res, a, b, world.contaminants))
    .catch(() =>
      resolveSlot(
        slotId,
        fallbackGenerate(a, b, world, owned),
        a,
        b,
        world.contaminants,
      ),
    )
}

function combineAt(
  aId: string,
  bId: string,
  point: { x: number; y: number },
) {
  const s = useGameStore.getState()
  const aInst = s.instances.find((i) => i.instanceId === aId)
  const bInst = s.instances.find((i) => i.instanceId === bId)
  if (!aInst || !bInst || aInst.processing || bInst.processing) return
  const a = s.concepts.find((c) => c.id === aInst.conceptId)
  const b = s.concepts.find((c) => c.id === bInst.conceptId)
  if (!a || !b) return
  beginCombination(a, b, [aId, bId], point)
}

function scheduleMobileCombination() {
  const s = useGameStore.getState()
  const [first, second] = s.mobileComboSlots
  if (!first || !second || s.mobileComboPreparing) return

  useGameStore.setState({ mobileComboPreparing: true })
  window.setTimeout(() => {
    const current = useGameStore.getState()
    const [aSlot, bSlot] = current.mobileComboSlots
    if (!current.mobileComboPreparing || !aSlot || !bSlot) return

    const a = current.concepts.find((concept) => concept.id === aSlot.conceptId)
    const b = current.concepts.find((concept) => concept.id === bSlot.conceptId)
    const consumed = [aSlot.instanceId, bSlot.instanceId].filter(
      (id): id is string => !!id,
    )
    const missingCanvasInput = [aSlot, bSlot].some(
      (slot) =>
        slot.instanceId &&
        !current.instances.some(
          (instance) =>
            instance.instanceId === slot.instanceId && !instance.processing,
        ),
    )
    useGameStore.setState({
      mobileComboSlots: [null, null],
      mobileComboPreparing: false,
    })
    if (!a || !b || missingCanvasInput) return
    beginCombination(a, b, consumed, mobileBoardCenter(consumed))
  }, 250)
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...titleState(),

  startFresh: () => {
    clearSave()
    set(createPlayState())
  },

  startContinue: () => {
    const loaded = loadRun()
    if (!loaded) {
      set(createPlayState())
      return
    }
    const { save, cancelledProcessing } = loaded
    restoreSequences(save.concepts, save.instances, save.chronicle)
    set({
      screen: 'play',
      gameMode: 'standard',
      dailyDate: null,
      ending: null,
      concepts: save.concepts.map((concept) => ({
        ...concept,
        emoji: firstGrapheme(concept.emoji),
      })),
      discoveredIds: save.discoveredIds,
      pillars: restorePillars(save.pillars, save.collapsed),
      coherence: save.coherence,
      era: save.era,
      worldSeed: save.worldSeed,
      eraCase: save.eraCase,
      shards: save.shards,
      collapsed: save.collapsed,
      collapsedRules: save.collapsedRules,
      contaminantCounts: save.contaminantCounts,
      chronicle: save.chronicle,
      proclamationsThisEra: save.proclamationsThisEra,
      instances: save.instances,
      pending: {},
      codex: save.codex,
      tutorialStep: save.tutorialStep,
      selectedInstanceId: null,
      hoverConceptId: null,
      targetPillar: null,
      message:
        cancelledProcessing > 0
          ? `처리 중이던 조합 ${cancelledProcessing}건이 취소되었습니다`
          : '이어서 플레이합니다',
      muted: save.muted,
      fx: emptyFx(),
      stats: save.stats,
      codexOpen: false,
      mobileComboSlots: [null, null],
      mobileComboPreparing: false,
      mobileComboToast: null,
    })
  },

  startDemo: () => {
    clearSave()
    set(createPlayState({ demo: true }))
  },

  startDaily: () => {
    const daily = getDailyWorld()
    const loaded = loadDailyRun(daily.date)
    if (!loaded) {
      set(createPlayState({ daily }))
      return
    }
    const { save, cancelledProcessing } = loaded
    restoreSequences(save.concepts, save.instances, save.chronicle)
    set({
      screen: 'play',
      gameMode: 'daily',
      dailyDate: daily.date,
      ending: null,
      concepts: save.concepts.map((concept) => ({
        ...concept,
        emoji: firstGrapheme(concept.emoji),
      })),
      discoveredIds: save.discoveredIds,
      pillars: restorePillars(save.pillars, save.collapsed),
      coherence: save.coherence,
      era: save.era,
      worldSeed: save.worldSeed,
      eraCase: save.eraCase,
      shards: save.shards,
      collapsed: save.collapsed,
      collapsedRules: save.collapsedRules,
      contaminantCounts: save.contaminantCounts,
      chronicle: save.chronicle,
      proclamationsThisEra: save.proclamationsThisEra,
      instances: save.instances,
      pending: {},
      codex: save.codex,
      tutorialStep: save.tutorialStep,
      selectedInstanceId: null,
      hoverConceptId: null,
      targetPillar: null,
      message:
        cancelledProcessing > 0
          ? `처리 중이던 조합 ${cancelledProcessing}건이 취소되었습니다`
          : '오늘의 세계를 이어서 플레이합니다',
      muted: save.muted,
      fx: emptyFx(),
      stats: save.stats,
      codexOpen: false,
      mobileComboSlots: [null, null],
      mobileComboPreparing: false,
      mobileComboToast: null,
    })
  },

  returnToTitle: () => {
    const current = get()
    if (current.screen === 'play') flushSave(current)
    set(titleState())
  },

  reset: () => {
    if (get().gameMode === 'daily') clearDailySave()
    else clearSave()
    set(titleState())
  },

  setHoverConcept: (id) => set({ hoverConceptId: id }),

  selectInstance: (id) => set({ selectedInstanceId: id }),

  setTargetPillar: (key) => set({ targetPillar: key }),

  toggleMute: () => {
    flipMute()
    set({ muted: isMuted() })
  },

  spawnFromDrawer: (conceptId, x, y) => {
    const s = get()
    if (s.fx.inputLocked || s.screen !== 'play') return
    const concept = s.concepts.find((c) => c.id === conceptId)
    if (!concept || concept.deleted) return
    const inst: CanvasInstance = {
      instanceId: uid('i'),
      conceptId,
      x: x - CARD_W / 2,
      y: y - CARD_H / 2,
    }
    set((st) => ({
      instances: [...st.instances, inst],
      selectedInstanceId: inst.instanceId,
      hoverConceptId: conceptId,
    }))
    sfx.drop()
  },

  duplicateInstance: (instanceId) => {
    const s = get()
    if (s.fx.inputLocked || s.screen !== 'play') return

    const source = s.instances.find((instance) => instance.instanceId === instanceId)
    if (!source || source.processing) return
    const concept = s.concepts.find((item) => item.id === source.conceptId)
    if (!concept || concept.deleted || concept.name === '███') return

    const mobilePoint = isMobileViewport()
      ? mobileBoardCenter([source.instanceId])
      : null
    const duplicate: CanvasInstance = {
      instanceId: uid('i'),
      conceptId: source.conceptId,
      x: mobilePoint ? mobilePoint.x - CARD_W / 2 : source.x + 20,
      y: mobilePoint ? mobilePoint.y - CARD_H / 2 : source.y + 20,
      spawnPop: true,
    }
    set((state) => ({
      instances: [...state.instances, duplicate],
      selectedInstanceId: duplicate.instanceId,
      hoverConceptId: duplicate.conceptId,
    }))
    sfx.drop()

    setTimeout(() => {
      set((state) => ({
        instances: state.instances.map((instance) =>
          instance.instanceId === duplicate.instanceId
            ? { ...instance, spawnPop: undefined }
            : instance,
        ),
      }))
    }, 500)
  },

  queueMobileComboInstance: (instanceId) => {
    const s = get()
    if (!isMobileViewport() || s.fx.inputLocked || s.mobileComboPreparing) return
    const inst = s.instances.find((item) => item.instanceId === instanceId)
    const concept = s.concepts.find((item) => item.id === inst?.conceptId)
    if (!inst || inst.processing || !concept || concept.deleted) return

    const existingIndex = s.mobileComboSlots.findIndex(
      (slot) => slot?.instanceId === instanceId,
    )
    if (existingIndex >= 0) {
      const next = [...s.mobileComboSlots] as [
        MobileComboSlot | null,
        MobileComboSlot | null,
      ]
      next[existingIndex] = null
      set({ mobileComboSlots: next })
      sfx.drop()
      vibrateMobile(6)
      return
    }

    const emptyIndex = s.mobileComboSlots.findIndex((slot) => !slot)
    if (emptyIndex < 0) return
    const next = [...s.mobileComboSlots] as [
      MobileComboSlot | null,
      MobileComboSlot | null,
    ]
    next[emptyIndex] = {
      id: uid('mobile-canvas'),
      conceptId: concept.id,
      instanceId,
      source: 'canvas',
    }
    set({ mobileComboSlots: next })
    sfx.pick()
    vibrateMobile(8)
    if (next[0] && next[1]) scheduleMobileCombination()
  },

  queueMobileComboConcept: (conceptId) => {
    const s = get()
    if (!isMobileViewport() || s.fx.inputLocked || s.mobileComboPreparing) return
    const concept = s.concepts.find((item) => item.id === conceptId)
    if (!concept || concept.deleted) return
    const emptyIndex = s.mobileComboSlots.findIndex((slot) => !slot)
    if (emptyIndex < 0) return
    const next = [...s.mobileComboSlots] as [
      MobileComboSlot | null,
      MobileComboSlot | null,
    ]
    next[emptyIndex] = {
      id: uid('mobile-drawer'),
      conceptId,
      source: 'drawer',
    }
    set({ mobileComboSlots: next })
    sfx.pick()
    vibrateMobile(8)
    if (next[0] && next[1]) scheduleMobileCombination()
  },

  removeMobileComboSlot: (index) => {
    const s = get()
    if (s.mobileComboPreparing || !s.mobileComboSlots[index]) return
    const next = [...s.mobileComboSlots] as [
      MobileComboSlot | null,
      MobileComboSlot | null,
    ]
    next[index] = null
    set({ mobileComboSlots: next })
    sfx.drop()
    vibrateMobile(6)
  },

  clearMobileComboSlots: () =>
    set({ mobileComboSlots: [null, null], mobileComboPreparing: false }),

  clearMobileComboToast: (id) =>
    set((state) =>
      state.mobileComboToast?.id === id ? { mobileComboToast: null } : state,
    ),

  setInstancePos: (instanceId, x, y) => {
    set((s) => ({
      instances: s.instances.map((i) =>
        i.instanceId === instanceId ? { ...i, x, y } : i,
      ),
    }))
  },

  dismissInstance: (instanceId) => {
    const s = get()
    if (s.fx.inputLocked) return
    set({
      instances: s.instances.filter((i) => i.instanceId !== instanceId),
      selectedInstanceId:
        s.selectedInstanceId === instanceId ? null : s.selectedInstanceId,
      mobileComboSlots: s.mobileComboSlots.map((slot) =>
        slot?.instanceId === instanceId ? null : slot,
      ) as [MobileComboSlot | null, MobileComboSlot | null],
      fx: { ...s.fx, drawerHighlight: false },
      message: '카드를 서랍으로 치웠다',
    })
    sfx.drop()
  },

  setDrawerHighlight: (on) =>
    set((s) =>
      s.fx.drawerHighlight === on
        ? s
        : { fx: { ...s.fx, drawerHighlight: on } },
    ),

  tidyCanvas: () => {
    const s = get()
    if (s.fx.inputLocked || s.screen !== 'play') return
    const mobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches
    const mobileCards = s.instances.filter((inst) => !inst.processing)
    const gapX = mobile ? CARD_W + 8 : 110
    const gapY = mobile ? CARD_H + 6 : 110
    const maxCols = mobile
      ? Math.min(3, Math.max(2, Math.floor((window.innerWidth - 16) / gapX)))
      : 6
    const mobileRows = mobile ? Math.ceil(mobileCards.length / maxCols) : 0
    const boardHeight = mobile
      ? document.querySelector<HTMLElement>('.canvas-board')?.clientHeight ?? 280
      : 0
    const mobileStartY = mobile
      ? Math.max(
          20,
          Math.floor(
            (boardHeight -
              (mobileRows * CARD_H + Math.max(0, mobileRows - 1) * 6)) /
              2,
          ),
        )
      : 0
    let col = 0
    let row = 0
    const next = s.instances.map((inst) => {
      if (inst.processing) return inst
      const cardsInRow = mobile
        ? Math.min(maxCols, mobileCards.length - row * maxCols)
        : maxCols
      const x = mobile
        ? Math.max(
            8,
            ((window.innerWidth - 16) -
              (cardsInRow * CARD_W + Math.max(0, cardsInRow - 1) * 8)) /
              2,
          ) +
          col * gapX
        : 16 + col * gapX
      const y = mobile ? mobileStartY + row * gapY : 28 + row * gapY
      col += 1
      if (col >= maxCols) {
        col = 0
        row += 1
      }
      return { ...inst, x, y }
    })
    set({ instances: next, message: '캔버스를 정리했다' })
  },

  openCodex: () => {
    if (get().fx.inputLocked) return
    set({ codexOpen: true })
  },

  closeCodex: () => set({ codexOpen: false }),

  proclaimInstance: (instanceId) => {
    const tutorialStep = get().tutorialStep
    declareOnAltar(instanceId)
    if (tutorialStep === 3) markTutorial('done')
  },

  handleDrop: (instanceId, center, altar, allowProclamation = true) => {
    const state = get()
    if (state.fx.inputLocked || state.screen !== 'play') return
    const dragged = state.instances.find((i) => i.instanceId === instanceId)
    if (!dragged || dragged.processing) return

    const mobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches
    const altarDropRadius = ALTAR_R
    const combineRadius = COMBINE_RADIUS * (mobile ? 1.5 : 1)

    if (
      allowProclamation &&
      dist(center.x, center.y, altar.x, altar.y) < altarDropRadius
    ) {
      get().proclaimInstance(instanceId)
      return
    }

    const target = state.instances
      .filter((c) => c.instanceId !== instanceId && !c.processing)
      .map((c) => {
        const mid = centerOf(c)
        return { c, d: dist(center.x, center.y, mid.x, mid.y) }
      })
      .filter((x) => x.d < combineRadius)
      .sort((a, b) => a.d - b.d)[0]

    if (target) {
      combineAt(instanceId, target.c.instanceId, center)
      return
    }

    get().setInstancePos(instanceId, center.x - CARD_W / 2, center.y - CARD_H / 2)
    sfx.drop()
  },

  endEra: () => {
    const s = get()
    if (s.fx.inputLocked || s.screen !== 'play') return

    const noCollapseJustCompleted =
      s.eraCase.id === 'noCollapse' &&
      !s.eraCase.completed &&
      s.collapsed.length === s.eraCase.collapsedAtStart
    const settledCase = noCollapseJustCompleted
      ? { ...s.eraCase, progress: 1, completed: true }
      : s.eraCase
    const rewarded = settledCase.completed
    const settledChronicle = rewarded
      ? [
          ...s.chronicle,
          entry(s.era, `제${s.era}시대 사건이 종결되었다.`),
        ]
      : s.chronicle

    set({
      eraCase: settledCase,
      shards: s.shards + (rewarded ? 3 : 0),
      chronicle: settledChronicle,
      mobileComboSlots: [null, null],
      mobileComboPreparing: false,
      message: noCollapseJustCompleted
        ? `제${s.era}시대 사건 종결 · 파편 +3`
        : s.message,
      fx: {
        ...s.fx,
        inputLocked: noCollapseJustCompleted,
        shardPop: s.fx.shardPop + (rewarded ? 1 : 0),
      },
    })

    if (noCollapseJustCompleted) sfx.discover()

    const finishEra = () => {
      const cur = get()
      if (
        cur.screen !== 'play' ||
        cur.era !== s.era ||
        cur.eraCase !== settledCase
      ) {
        return
      }

      if (cur.era >= MAX_ERA) {
        if (cur.collapsed.length >= INDISTINCT_COLLAPSE_THRESHOLD) {
          triggerEnding('indistinct')
        } else if (cur.coherence <= 0) {
          triggerEnding('blank')
        } else {
          set({
            chronicle: [
              ...cur.chronicle,
              entry(cur.era, `제${cur.era}시대가 닫혔다.`),
            ],
          })
          triggerEnding('classified')
        }
        return
      }

      const nextEra = cur.era + 1
      set({
        era: nextEra,
        eraCase: createEraCase(
          cur.worldSeed,
          nextEra,
          cur.collapsed.length,
        ),
        coherence: cur.coherence + 8,
        proclamationsThisEra: 0,
        chronicle: [
          ...cur.chronicle,
          entry(
            nextEra,
            `제${cur.era}시대가 닫히고 제${nextEra}시대가 열린다. 정합성 +8.`,
          ),
        ],
        message: `제${nextEra}시대 시작 (정합성 +8)`,
        fx: { ...cur.fx, inputLocked: false },
      })
    }

    if (noCollapseJustCompleted) window.setTimeout(finishEra, 500)
    else finishEra()
  },

  openVault: () => {
    if (get().fx.inputLocked) return
    set((s) => ({ fx: { ...s.fx, vaultOpen: true } }))
  },

  closeVault: () =>
    set((s) => ({
      fx: {
        ...s.fx,
        vaultOpen: false,
        vaultReveal: null,
        unclassifiedFx: false,
      },
    })),

  pullVault: () => {
    const s = get()
    if (s.shards < 10 || s.fx.inputLocked) {
      set({ message: '파편이 부족합니다 (10 필요)' })
      sfx.reject()
      return
    }

    const grade: VaultGrade = rollVaultGrade()
    const pool = GACHA_POOL[grade]
    const pick = pool[Math.floor(Math.random() * pool.length)]
    const bonus = gradeBonusT(grade)

    let name = pick.name
    if (s.collapsed.length >= 2) {
      name = applyCollapseName(name, s.collapsed, hashStr(name + grade))
    }

    const scale = bonus > 0 ? 1 + bonus / 100 : 1
    const vaultChronicle = `보관소에서 ${name}${josa(name, ['을', '를'])} 회수했다.`
    const concept: Concept = {
      id: newConceptId(name),
      name,
      emoji: firstGrapheme(pick.emoji),
      chaos: Math.min(100, Math.round(pick.chaos * scale)),
      plausibility: Math.min(100, Math.round(pick.plausibility * scale)),
      narrative: Math.min(100, Math.round(pick.narrative * scale)),
      contagion: Math.min(100, Math.round(pick.contagion * scale)),
      depth: grade === 'registered' ? 0 : grade === 'suspended' ? 2 : grade === 'injudicable' ? 3 : 4,
      pillar: pick.pillar,
      contaminant: pick.contaminant,
      bornAt: {
        era: s.era,
        collapsed: s.collapsed.length,
        contaminant:
          activeContaminants(s.contaminantCounts).sort().join(' · ') || null,
      },
      chronicle: vaultChronicle,
    }

    sfx.gacha()
    set({
      shards: s.shards - 10,
      concepts: [...s.concepts, concept],
      discoveredIds: [...s.discoveredIds, concept.id],
      stats: { ...s.stats, discoveries: s.stats.discoveries + 1 },
      fx: {
        ...s.fx,
        vaultReveal: { conceptId: concept.id, grade },
        unclassifiedFx: grade === 'uncategorized',
        discoverPop: s.fx.discoverPop + 1,
      },
    })

    // 미분류: 생존 기둥 하나 −15
    if (grade === 'uncategorized') {
      window.setTimeout(() => {
        const cur = get()
        const alive = cur.pillars.filter((p) => p.stability > 0)
        if (alive.length === 0) return
        const target = alive[Math.floor(Math.random() * alive.length)]
        const nextStability = Math.max(0, target.stability - 15)
        const pillars = cur.pillars.map((p) =>
          p.key === target.key ? { ...p, stability: nextStability } : p,
        )
        set({ pillars })
        if (target.stability > 0 && nextStability <= 0) {
          runCollapseSequence(target.key)
        }
      }, gradeDelayMs(grade) - 200)
    }

    window.setTimeout(() => {
      const cur = get()
      const inst: CanvasInstance = {
        instanceId: uid('i'),
        conceptId: concept.id,
        x: 200,
        y: 140,
      }
      set({
        instances: [...cur.instances, inst],
        selectedInstanceId: inst.instanceId,
        hoverConceptId: concept.id,
        message: `회수: ${concept.emoji} ${concept.name}`,
        chronicle: [
          ...cur.chronicle,
          entry(
            cur.era,
            vaultChronicle,
          ),
        ],
        fx: {
          ...get().fx,
          vaultReveal: null,
          vaultOpen: false,
          unclassifiedFx: false,
        },
      })
      if (grade === 'uncategorized') sfx.discover()
      else sfx.drop()
    }, gradeDelayMs(grade))
  },

  clearTypingRule: () => set((s) => ({ fx: { ...s.fx, typingRule: null } })),
  clearGodLine: () => set((s) => ({ fx: { ...s.fx, godLine: null } })),

  dismissTutorial: () => {
    try {
      localStorage.setItem('tutorialDone', '1')
    } catch {
      /* ignore */
    }
    set({ tutorialStep: 'done' })
  },
}))

useGameStore.subscribe((state) => {
  scheduleSave(state)
})
