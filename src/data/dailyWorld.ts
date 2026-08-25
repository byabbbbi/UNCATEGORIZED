import { HARD_TABLE, type HardEntry } from './combos'
import { hashStr, mulberry32 } from '../generation'
import { PILLAR_KEYS, type Concept, type PillarKey } from '../types'
import { firstGrapheme } from '../utils/emoji'

const KST_TIME_ZONE = 'Asia/Seoul'
interface DailyCandidate {
  sourceKey: string
  entry: HardEntry
}

export interface DailyWorldConfig {
  date: string
  seed: number
  concepts: Concept[]
  contaminant: string
  collapsed: PillarKey[]
}

function compareText(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

function dailyCandidates(): DailyCandidate[] {
  const sorted = Object.entries(HARD_TABLE)
    .filter(([, entry]) => {
      const depth = entry.depth ?? 1
      return depth >= 1 && depth <= 2
    })
    .map(([sourceKey, entry]) => ({ sourceKey, entry }))
    .sort(
      (a, b) =>
        compareText(a.entry.name, b.entry.name) ||
        compareText(a.sourceKey, b.sourceKey),
    )

  const seen = new Set<string>()
  return sorted.filter(({ entry }) => {
    if (seen.has(entry.name)) return false
    seen.add(entry.name)
    return true
  })
}

function shuffled<T>(items: T[], rnd: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function getKstDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function formatDailyDate(date: string): string {
  const [, month = '', day = ''] = date.split('-')
  return `${Number(month)}월 ${Number(day)}일`
}

export function getDailyWorld(date = getKstDateKey()): DailyWorldConfig {
  const seed = hashStr(date)
  const rnd = mulberry32(seed)
  const candidates = shuffled(dailyCandidates(), rnd)

  if (candidates.length < 4) {
    throw new Error('오늘의 세계 시작 원소 후보가 부족합니다.')
  }

  const concepts = candidates.slice(0, 4).map(({ entry }, index) => ({
    id: `daily-${index}-${hashStr(`${date}:${entry.name}`).toString(36)}`,
    name: entry.name,
    emoji: firstGrapheme(entry.emoji),
    chaos: entry.chaos,
    plausibility: entry.plausibility,
    narrative: entry.narrative,
    contagion: entry.contagion,
    depth: entry.depth ?? 1,
    pillar: entry.pillar,
    contaminant: entry.contaminant,
  }))
  const contaminant = candidates[Math.floor(rnd() * candidates.length)].entry.name
  const collapsed =
    rnd() < 0.3
      ? [PILLAR_KEYS[Math.floor(rnd() * PILLAR_KEYS.length)]]
      : []

  return { date, seed, concepts, contaminant, collapsed }
}
