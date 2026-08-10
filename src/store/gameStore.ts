import { create } from 'zustand'
import { tryCombine } from '../data/combos'
import {
  INITIAL_CONCEPTS,
  INITIAL_PILLARS,
  MAX_ERA,
  MAX_PROCLAMATIONS_PER_ERA,
  PILLAR_GODS,
  PILLAR_LABELS,
  PILLAR_RULES,
} from '../data/initial'
import { calcProclaimImpact, calcT } from '../game/formulas'
import { isMuted, sfx, toggleMute as flipMute } from '../sfx'
import type {
  CanvasInstance,
  ChronicleEntry,
  Concept,
  FxState,
  Pillar,
  PillarKey,
} from '../types'
import { ALTAR_R, CARD_H, CARD_W, COMBINE_RADIUS, gradeDelayMs, gradeOf } from '../types'

let chronicleSeq = 0
let instanceSeq = 0

function entry(era: number, text: string): ChronicleEntry {
  chronicleSeq += 1
  return { id: `c-${chronicleSeq}`, era, text }
}

function uid(prefix: string) {
  instanceSeq += 1
  return `${prefix}-${instanceSeq}`
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

function centerOf(inst: CanvasInstance) {
  return { x: inst.x + CARD_W / 2, y: inst.y + CARD_H / 2 }
}

const emptyFx = (): FxState => ({
  rejectInstanceId: null,
  combining: null,
  sealFlash: false,
  whiteFlash: false,
  screenShake: 0,
  typingRule: null,
  unclassifiedFx: false,
  vaultOpen: false,
  vaultReveal: null,
})

export interface GameStore {
  concepts: Concept[]
  discoveredIds: string[]
  pillars: Pillar[]
  coherence: number
  era: number
  shards: number
  collapsedRules: string[]
  chronicle: ChronicleEntry[]
  proclamationsThisEra: number
  instances: CanvasInstance[]
  selectedInstanceId: string | null
  hoverConceptId: string | null
  targetPillar: PillarKey | null
  message: string | null
  muted: boolean
  fx: FxState

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

function createBase() {
  chronicleSeq = 0
  instanceSeq = 0
  const concepts = INITIAL_CONCEPTS.map((c) => ({ ...c }))
  return {
    concepts,
    discoveredIds: concepts.map((c) => c.id),
    pillars: INITIAL_PILLARS.map((p) => ({ ...p })),
    coherence: 100,
    era: 1,
    shards: 0,
    collapsedRules: [] as string[],
    chronicle: [entry(1, '제1시대가 열린다. 네 기둥 아래 첫 개념이 놓인다.')],
    proclamationsThisEra: 0,
    instances: seedInstances(concepts),
    selectedInstanceId: null as string | null,
    hoverConceptId: null as string | null,
    targetPillar: null as PillarKey | null,
    message: null as string | null,
    muted: false,
    fx: emptyFx(),
  }
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
  const inst = s.instances.find((i) => i.instanceId === instanceId)
  if (!inst) return

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

  const concept = s.concepts.find((c) => c.id === inst.conceptId)
  if (!concept) return

  const pillarKey = s.targetPillar
  const pillar = s.pillars.find((p) => p.key === pillarKey)
  if (!pillar || pillar.stability <= 0) {
    useGameStore.setState({
      message: `${PILLAR_LABELS[pillarKey]} 기둥은 이미 붕괴했습니다`,
    })
    sfx.reject()
    return
  }

  const { D, coherenceLoss, shardsGained } = calcProclaimImpact(concept)
  const T = calcT(concept.depth, s.era)
  const nextStability = Math.max(0, pillar.stability - D)
  const pillars = s.pillars.map((p) =>
    p.key === pillarKey ? { ...p, stability: nextStability } : p,
  )

  const collapsedRules = [...s.collapsedRules]
  let collapseNote = ''
  let justCollapsed = false
  if (pillar.stability > 0 && nextStability <= 0) {
    const rule = PILLAR_RULES[pillarKey]
    if (!collapsedRules.includes(rule)) collapsedRules.push(rule)
    collapseNote = ` ${PILLAR_GODS[pillarKey]}의 기둥이 무너졌다.`
    justCollapsed = true
  }

  const line = entry(
    s.era,
    `${concept.emoji} ${concept.name}을(를) ${PILLAR_LABELS[pillarKey]}에 선포했다. (D=${D.toFixed(1)}, T=${T}, −정합성 ${coherenceLoss.toFixed(1)}, +파편 ${shardsGained})${collapseNote}`,
  )

  useGameStore.setState({
    pillars,
    coherence: Math.max(0, s.coherence - coherenceLoss),
    shards: s.shards + shardsGained,
    collapsedRules,
    proclamationsThisEra: s.proclamationsThisEra + 1,
    chronicle: [...s.chronicle, line],
    instances: s.instances.filter((i) => i.instanceId !== instanceId),
    selectedInstanceId: null,
    message: `${concept.name} → ${PILLAR_LABELS[pillarKey]} 선포`,
    fx: {
      ...s.fx,
      sealFlash: true,
      screenShake: justCollapsed ? 0 : 1,
      whiteFlash: justCollapsed,
      typingRule: justCollapsed ? PILLAR_RULES[pillarKey] : s.fx.typingRule,
    },
  })

  sfx.declare()
  if (justCollapsed) sfx.collapse()

  window.setTimeout(() => {
    useGameStore.setState((cur) => ({
      fx: { ...cur.fx, sealFlash: false, screenShake: 0, whiteFlash: false },
    }))
  }, 420)
}

function combineAt(aId: string, bId: string, point: { x: number; y: number }) {
  const s = useGameStore.getState()
  const aInst = s.instances.find((i) => i.instanceId === aId)
  const bInst = s.instances.find((i) => i.instanceId === bId)
  if (!aInst || !bInst) return

  const a = s.concepts.find((c) => c.id === aInst.conceptId)
  const b = s.concepts.find((c) => c.id === bInst.conceptId)
  if (!a || !b) return

  const result = tryCombine(a.id, b.id)
  if ('error' in result) {
    useGameStore.setState({ message: result.error })
    sfx.reject()
    shakeReject(aId)
    return
  }

  const isDiscovery = !s.concepts.some((c) => c.id === result.id)
  const concepts = isDiscovery ? [...s.concepts, { ...result }] : s.concepts
  const discoveredIds = isDiscovery
    ? [...s.discoveredIds, result.id]
    : s.discoveredIds

  useGameStore.setState({
    concepts,
    discoveredIds,
    fx: {
      ...s.fx,
      combining: {
        aId,
        bId,
        resultConceptId: result.id,
        x: point.x - CARD_W / 2,
        y: point.y - CARD_H / 2,
        isDiscovery,
      },
    },
    message: isDiscovery
      ? `조합 성공: ${a.emoji}${b.emoji} → ${result.emoji} ${result.name}`
      : `이미 발견한 개념: ${result.emoji} ${result.name}`,
    chronicle: isDiscovery
      ? [
          ...s.chronicle,
          entry(s.era, `${a.name}과(와) ${b.name}이(가) ${result.name}(으)로 합쳐졌다.`),
        ]
      : s.chronicle,
  })

  if (isDiscovery) sfx.discover()
  else sfx.combine()

  window.setTimeout(() => {
    const cur = useGameStore.getState()
    const fx = cur.fx.combining
    if (!fx) return
    const nextInst: CanvasInstance = {
      instanceId: uid('i'),
      conceptId: fx.resultConceptId,
      x: fx.x,
      y: fx.y,
    }
    useGameStore.setState({
      instances: [
        ...cur.instances.filter(
          (i) => i.instanceId !== fx.aId && i.instanceId !== fx.bId,
        ),
        nextInst,
      ],
      selectedInstanceId: nextInst.instanceId,
      hoverConceptId: fx.resultConceptId,
      fx: { ...cur.fx, combining: null },
    })
  }, 520)
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createBase(),

  reset: () => set(createBase()),

  setHoverConcept: (id) => set({ hoverConceptId: id }),

  selectInstance: (id) => set({ selectedInstanceId: id }),

  setTargetPillar: (key) => set({ targetPillar: key }),

  toggleMute: () => {
    flipMute()
    set({ muted: isMuted() })
  },

  spawnFromDrawer: (conceptId, x, y) => {
    if (!get().concepts.some((c) => c.id === conceptId)) return
    const inst: CanvasInstance = {
      instanceId: uid('i'),
      conceptId,
      x: x - CARD_W / 2,
      y: y - CARD_H / 2,
    }
    set((s) => ({
      instances: [...s.instances, inst],
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
    const dragged = state.instances.find((i) => i.instanceId === instanceId)
    if (!dragged) return

    if (dist(center.x, center.y, altar.x, altar.y) < ALTAR_R) {
      declareOnAltar(instanceId)
      return
    }

    const target = state.instances
      .filter((c) => c.instanceId !== instanceId)
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
    if (s.era >= MAX_ERA) {
      set({ message: '마지막 시대입니다' })
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

  openVault: () => set((s) => ({ fx: { ...s.fx, vaultOpen: true } })),

  closeVault: () =>
    set((s) => ({
      fx: { ...s.fx, vaultOpen: false, vaultReveal: null, unclassifiedFx: false },
    })),

  pullVault: () => {
    const s = get()
    if (s.shards < 10) {
      set({ message: '파편이 부족합니다 (10 필요)' })
      sfx.reject()
      return
    }
    const pick = s.concepts[Math.floor(Math.random() * s.concepts.length)]
    const grade = gradeOf(pick)
    sfx.gacha()
    set({
      shards: s.shards - 10,
      fx: {
        ...s.fx,
        vaultReveal: { conceptId: pick.id, grade },
        unclassifiedFx: grade === 'unclassified',
      },
    })
    window.setTimeout(() => {
      const cur = get()
      const inst: CanvasInstance = {
        instanceId: uid('i'),
        conceptId: pick.id,
        x: 200,
        y: 140,
      }
      set({
        instances: [...cur.instances, inst],
        selectedInstanceId: inst.instanceId,
        hoverConceptId: pick.id,
        message: `회수: ${pick.emoji} ${pick.name}`,
        fx: {
          ...get().fx,
          vaultReveal: null,
          vaultOpen: false,
          unclassifiedFx: false,
        },
      })
      if (grade === 'unclassified') sfx.discover()
      else sfx.drop()
    }, gradeDelayMs(grade))
  },

  clearTypingRule: () => set((s) => ({ fx: { ...s.fx, typingRule: null } })),
}))
