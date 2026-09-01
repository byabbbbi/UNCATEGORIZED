export const PILLAR_KEYS = [
  'substance',
  'quantity',
  'quality',
  'time',
  'relation',
  'place',
  'state',
  'action',
] as const

export type PillarKey = (typeof PILLAR_KEYS)[number]

export interface Concept {
  id: string
  name: string
  emoji: string
  chaos: number
  plausibility: number
  narrative: number
  contagion: number
  depth: number
  pillar: PillarKey
  contaminant?: string
  parents?: [string, string]
  bornAt?: {
    era: number
    collapsed: number
    contaminant: string | null
  }
  chronicle?: string
  /** 보관소 회수품일 때의 원래 등급. 저장 데이터는 하위 호환을 위해 선택값으로 둔다. */
  vaultGrade?: VaultGrade
  /** 붕괴 규칙으로 이름이 변해도 도감에서 같은 회수품을 식별하는 키. */
  vaultKey?: string
  deleted?: boolean
}

export type CaseTaskId =
  | 'depth'
  | 'contaminated'
  | 'pillars'
  | 'destruction'
  | 'noCollapse'
  | 'selfCombine'
  | 'discoveries'
  | 'censored'

export interface EraCaseState {
  id: CaseTaskId
  era: number
  progress: number
  target: number
  completed: boolean
  proclaimedPillars: PillarKey[]
  collapsedAtStart: number
}

export interface Pillar {
  key: PillarKey
  stability: number
}

export interface ChronicleEntry {
  id: string
  era: number
  text: string
}

export type VaultGrade =
  | 'registered'
  | 'suspended'
  | 'injudicable'
  | 'uncategorized'

export interface CanvasInstance {
  instanceId: string
  conceptId: string
  x: number
  y: number
  processing?: boolean
  revealDiscovery?: boolean
  /** 조합 결과가 나타날 때 한 번만 재생하는 등장 연출 */
  spawnPop?: boolean
  /** 동일 조합쌍이 세계 상태 때문에 다른 결과를 낸 경우 */
  rerecord?: { previous: string; current: string } | null
  /** 결과에 개입한 활성 붕괴 규칙을 잠깐 찍어 보여준다. */
  ruleStampKeys?: PillarKey[]
}

/** 모바일 조합 슬롯에 잠시 예약된 입력. 서랍 입력은 캔버스에 실체를 만들지 않는다. */
export interface MobileComboSlot {
  id: string
  conceptId: string
  source: 'canvas' | 'drawer'
  instanceId?: string
}

export interface MobileComboToast {
  id: string
  first: Pick<Concept, 'id' | 'emoji' | 'name' | 'pillar' | 'deleted'>
  second: Pick<Concept, 'id' | 'emoji' | 'name' | 'pillar' | 'deleted'>
  result: Pick<Concept, 'id' | 'emoji' | 'name' | 'pillar' | 'deleted'>
  isDiscovery: boolean
}

export type EndingKind = 'blank' | 'indistinct' | 'classified' | null

export type ScreenMode = 'title' | 'play' | 'ending'

export type GameMode = 'standard' | 'demo' | 'daily'

export type TutorialStep = 0 | 1 | 2 | 3 | 'done'

export interface ProclamationResult {
  id: string
  conceptName: string
  conceptEmoji: string
  pillarKey: PillarKey
  stabilityBefore: number
  stabilityAfter: number
  damage: number
  coherenceLoss: number
  shardsGained: number
  remainingHits: number
  collapsed: boolean
  rule: string | null
}

export interface FxState {
  rejectInstanceId: string | null
  sealFlash: boolean
  whiteFlash: boolean
  screenShake: number
  typingRule: string | null
  unclassifiedFx: boolean
  vaultOpen: boolean
  vaultReveal: null | { conceptId: string; grade: VaultGrade }
  godLine: string | null
  inputLocked: boolean
  discoverPop: number
  shardPop: number
  drawerHighlight: boolean
  shardFlights: ShardFlight[]
  proclamationResult: ProclamationResult | null
}

export interface ShardFlight {
  id: string
  fromX: number
  fromY: number
  toX: number
  toY: number
}

export function sealOf(concept: Concept): PillarKey {
  if (concept.pillar) return concept.pillar
  const scores: Record<PillarKey, number> = {
    substance: concept.narrative,
    quantity: concept.plausibility,
    quality: concept.chaos,
    time: concept.contagion,
    relation: 0,
    place: 0,
    state: 0,
    action: 0,
  }
  return (Object.entries(scores) as [PillarKey, number][]).sort((a, b) => b[1] - a[1])[0][0]
}

export function gradeDelayMs(grade: VaultGrade): number {
  if (grade === 'uncategorized') return 2200
  if (grade === 'injudicable') return 1400
  if (grade === 'suspended') return 900
  return 600
}

/** 유럽식 열람 도장 약호 */
export const SEAL_GLYPH: Record<PillarKey, string> = {
  substance: 'Sb',
  quantity: 'Qn',
  quality: 'Qa',
  time: 'Tp',
  relation: 'Re',
  place: 'Lo',
  state: 'Ha',
  action: 'Ac',
}

export const SEAL_TITLE: Record<PillarKey, string> = {
  substance: 'SUBSTANTIA · 실재',
  quantity: 'QUANTITAS · 측정',
  quality: 'QUALITAS · 본질',
  time: 'TEMPUS · 영겁',
  relation: 'RELATIO · 인연',
  place: 'LOCUS · 좌표',
  state: 'HABITUS · 소유',
  action: 'ACTIO · 인과',
}

export const CARD_W = 96
export const CARD_H = 112
export const COMBINE_RADIUS = 70
export const ALTAR_R = 56

/** 게이지 구간: 심판 / 궤변 / 사임 */
export function pillarPhase(
  stability: number,
): 'judge' | 'sophistry' | 'resign' {
  if (stability <= 10) return 'resign'
  if (stability <= 40) return 'sophistry'
  return 'judge'
}
