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
  MAX_ERA,
  MAX_PROCLAMATIONS_PER_ERA,
  PILLAR_KO,
} from '../data/initial'
import { COLLAPSE_RULES } from '../data/rules'
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
import { isMuted, sfx, toggleMute as flipMute } from '../sfx'
import type {
  CanvasInstance,
  ChronicleEntry,
  Concept,
  EndingKind,
  FxState,
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
  shardFlights: [],
})

export interface GameStats {
  discoveries: number
  proclamations: number
  resignations: number
}

export interface GameStore {
  screen: ScreenMode
  ending: EndingKind
  concepts: Concept[]
  discoveredIds: string[]
  pillars: Pillar[]
  coherence: number
  era: number
  shards: number
  collapsed: PillarKey[]
  collapsedRules: string[]
  contaminants: string[]
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

  startFresh: () => void
  startDemo: () => void
  returnToTitle: () => void
  reset: () => void
  setHoverConcept: (id: string | null) => void
  selectInstance: (id: string | null) => void
  setTargetPillar: (key: PillarKey | null) => void
  spawnFromDrawer: (conceptId: string, x: number, y: number) => void
  setInstancePos: (instanceId: string, x: number, y: number) => void
  handleDrop: (
    instanceId: string,
    center: { x: number; y: number },
    altar: { x: number; y: number },
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
  return concepts.slice(0, 4).map((c, i) => ({
    instanceId: uid('i'),
    conceptId: c.id,
    x: 56 + i * 114,
    y: 72 + (i % 2) * 40,
  }))
}

function createPlayState(opts?: {
  demo?: boolean
}): Omit<
  GameStore,
  | 'startFresh'
  | 'startDemo'
  | 'returnToTitle'
  | 'reset'
  | 'setHoverConcept'
  | 'selectInstance'
  | 'setTargetPillar'
  | 'spawnFromDrawer'
  | 'setInstancePos'
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

  if (opts?.demo) {
    const concepts = buildDemoConcepts()
    const collapsed = [...DEMO_SAVE.collapsed]
    return {
      screen: 'play',
      ending: null,
      concepts,
      discoveredIds: concepts.map((c) => c.id),
      pillars: (Object.keys(DEMO_SAVE.pillars) as PillarKey[]).map((key) => ({
        key,
        stability: DEMO_SAVE.pillars[key],
      })),
      coherence: DEMO_SAVE.coherence,
      era: DEMO_SAVE.era,
      shards: DEMO_SAVE.shards,
      collapsed,
      collapsedRules: demoCollapsedRules(),
      contaminants: [...DEMO_SAVE.contaminants],
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
    }
  }

  const concepts = INITIAL_CONCEPTS.map((c) => ({ ...c }))
  const tutorialDone =
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('tutorialDone') === '1'
  return {
    screen: 'play',
    ending: null,
    concepts,
    discoveredIds: concepts.map((c) => c.id),
    pillars: INITIAL_PILLARS.map((p) => ({ ...p })),
    coherence: 100,
    era: 1,
    shards: 0,
    collapsed: [],
    collapsedRules: [],
    contaminants: [],
    chronicle: [entry(1, '제1시대가 열린다. 네 기둥 아래 첫 개념이 놓인다.')],
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

function worldOf(s: {
  collapsed: PillarKey[]
  contaminants: string[]
  era: number
}): WorldState {
  return {
    collapsed: s.collapsed,
    contaminants: s.contaminants,
    era: s.era,
  }
}

function setMisreg(collapsedCount: number) {
  document.documentElement.style.setProperty(
    '--misreg',
    `${collapsedCount * 0.9}px`,
  )
}

function reduceMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function triggerEnding(kind: Exclude<EndingKind, null>) {
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
  if (collapsed.length >= 4) triggerEnding('indistinct')
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
      setMisreg(collapsed.length)
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
  const nextStability = Math.max(0, pillar.stability - D)
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
    `${concept.emoji} ${concept.name}을(를) ${PILLAR_KO[pillarKey]}에 선포했다.`,
  )

  const nextCoherence = Math.max(0, s.coherence - coherenceLoss)
  const nextShards = s.shards + shardsGained

  useGameStore.setState({
    pillars,
    coherence: nextCoherence,
    shards: nextShards,
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

  let concept: Concept
  if (existing) {
    concept = existing
  } else {
    concept = {
      id: newConceptId(result.name),
      name: result.name,
      emoji: result.emoji,
      chaos: result.chaos,
      plausibility: result.plausibility,
      narrative: result.narrative,
      contagion: result.contagion,
      depth: Math.max(a.depth, b.depth) + 1,
      pillar: result.pillar,
      contaminant: result.contaminant || undefined,
      deleted: result.deleted,
    }
  }

  const concepts = isDiscovery ? [...cur.concepts, concept] : cur.concepts
  const discoveredIds = isDiscovery
    ? [...cur.discoveredIds, concept.id]
    : cur.discoveredIds

  let coherence = cur.coherence
  let contaminants = cur.contaminants
  if (isDiscovery && result.deleted) {
    coherence = Math.min(100, coherence + 3)
  }
  if (
    isDiscovery &&
    result.contaminant &&
    !contaminants.includes(result.contaminant)
  ) {
    contaminants = [...contaminants, result.contaminant]
  }

  const { [slotId]: _gone, ...restPending } = cur.pending
  void _gone

  let chronicle = cur.chronicle
  if (isRerecord && previousName) {
    chronicle = [
      ...chronicle,
      entry(
        cur.era,
        `${previousName}가 ${result.name}로 다시 기록되었다. 이전 기록은 삭제되었다.`,
      ),
    ]
  } else if (isDiscovery) {
    chronicle = [
      ...chronicle,
      entry(
        cur.era,
        result.chronicle || `${result.name}이(가) 목록에 추가되었다.`,
      ),
    ]
  }

  useGameStore.setState({
    concepts,
    discoveredIds,
    coherence,
    contaminants,
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
            rerecord: isRerecord
              ? { previous: previousName!, current: result.name }
              : null,
          }
        : i,
    ),
    selectedInstanceId: slotId,
    hoverConceptId: concept.id,
    message: isRerecord
      ? `같은 조합이 다른 결과: ${previousName} → ${result.name}`
      : isDiscovery
        ? result.deleted
          ? '검열된 개념이 기록되었다'
          : `조합 성공: ${a.emoji}${b.emoji} → ${result.emoji} ${result.name}`
        : `이미 발견한 개념: ${concept.emoji} ${concept.name}`,
  })

  if (isRerecord || isDiscovery) sfx.discover()
  else sfx.combine()

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
          ? { ...i, revealDiscovery: false, rerecord: null }
          : i,
      ),
    }))
  }, isRerecord ? 2500 : 900)
}

function combineAt(
  aId: string,
  bId: string,
  point: { x: number; y: number },
) {
  const s = useGameStore.getState()
  if (s.fx.inputLocked || s.screen !== 'play') return

  const aInst = s.instances.find((i) => i.instanceId === aId)
  const bInst = s.instances.find((i) => i.instanceId === bId)
  if (!aInst || !bInst || aInst.processing || bInst.processing) return

  const a = s.concepts.find((c) => c.id === aInst.conceptId)
  const b = s.concepts.find((c) => c.id === bInst.conceptId)
  if (!a || !b) return

  if (a.deleted || b.deleted) {
    useGameStore.setState({ message: '삭제된 개념은 조합할 수 없다' })
    sfx.reject()
    shakeReject(aId)
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
        (i) => i.instanceId !== aId && i.instanceId !== bId,
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
  generate(a, b, world)
    .then((res) => resolveSlot(slotId, res, a, b))
    .catch(() => resolveSlot(slotId, fallbackGenerate(a, b, world), a, b))
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...titleState(),

  startFresh: () => {
    setMisreg(0)
    set(createPlayState())
  },

  startDemo: () => {
    setMisreg(DEMO_SAVE.collapsed.length)
    set(createPlayState({ demo: true }))
  },

  returnToTitle: () => {
    setMisreg(0)
    set(titleState())
  },

  reset: () => {
    setMisreg(0)
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

  setInstancePos: (instanceId, x, y) => {
    set((s) => ({
      instances: s.instances.map((i) =>
        i.instanceId === instanceId ? { ...i, x, y } : i,
      ),
    }))
  },

  handleDrop: (instanceId, center, altar) => {
    const state = get()
    if (state.fx.inputLocked || state.screen !== 'play') return
    const dragged = state.instances.find((i) => i.instanceId === instanceId)
    if (!dragged || dragged.processing) return

    if (dist(center.x, center.y, altar.x, altar.y) < ALTAR_R) {
      declareOnAltar(instanceId)
      if (state.tutorialStep === 3) {
        try {
          localStorage.setItem('tutorialDone', '1')
        } catch {
          /* ignore */
        }
        set({ tutorialStep: 'done' })
      }
      return
    }

    const target = state.instances
      .filter((c) => c.instanceId !== instanceId && !c.processing)
      .map((c) => {
        const mid = centerOf(c)
        return { c, d: dist(center.x, center.y, mid.x, mid.y) }
      })
      .filter((x) => x.d < COMBINE_RADIUS)
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

    if (s.era >= MAX_ERA) {
      if (s.collapsed.length >= 4) {
        triggerEnding('indistinct')
      } else if (s.coherence <= 0) {
        triggerEnding('blank')
      } else {
        set({
          chronicle: [
            ...s.chronicle,
            entry(s.era, `제${s.era}시대가 닫혔다.`),
          ],
        })
        triggerEnding('classified')
      }
      return
    }

    const nextEra = s.era + 1
    set({
      era: nextEra,
      coherence: s.coherence + 8,
      proclamationsThisEra: 0,
      chronicle: [
        ...s.chronicle,
        entry(nextEra, `제${s.era}시대가 닫히고 제${nextEra}시대가 열린다. 정합성 +8.`),
      ],
      message: `제${nextEra}시대 시작 (정합성 +8)`,
    })
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
    const concept: Concept = {
      id: newConceptId(name),
      name,
      emoji: pick.emoji,
      chaos: Math.min(100, Math.round(pick.chaos * scale)),
      plausibility: Math.min(100, Math.round(pick.plausibility * scale)),
      narrative: Math.min(100, Math.round(pick.narrative * scale)),
      contagion: Math.min(100, Math.round(pick.contagion * scale)),
      depth: grade === 'registered' ? 0 : grade === 'suspended' ? 2 : grade === 'injudicable' ? 3 : 4,
      pillar: pick.pillar,
      contaminant: pick.contaminant,
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
          entry(cur.era, `보관소에서 ${concept.name}을(를) 회수했다.`),
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
