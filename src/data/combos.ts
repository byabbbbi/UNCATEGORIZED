import type { Concept } from '../types'

/** 조합 키는 알파벳 순 정렬된 id 쌍 (`a+b`) */
export type ComboTable = Record<string, Concept>

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('+')
}

const TABLE: ComboTable = {
  [pairKey('void', 'spark')]: {
    id: 'chaos',
    name: '혼돈',
    emoji: '🌀',
    chaos: 72,
    plausibility: 28,
    narrative: 40,
    contagion: 55,
    depth: 1,
  },
  [pairKey('spark', 'clay')]: {
    id: 'life',
    name: '생명',
    emoji: '🌱',
    chaos: 35,
    plausibility: 60,
    narrative: 70,
    contagion: 40,
    depth: 1,
  },
  [pairKey('void', 'clay')]: {
    id: 'grave',
    name: '무덤',
    emoji: '🪦',
    chaos: 45,
    plausibility: 50,
    narrative: 55,
    contagion: 30,
    depth: 1,
  },
  [pairKey('tide', 'spark')]: {
    id: 'steam',
    name: '증기',
    emoji: '💨',
    chaos: 40,
    plausibility: 65,
    narrative: 35,
    contagion: 45,
    depth: 1,
  },
  [pairKey('tide', 'clay')]: {
    id: 'mire',
    name: '늪',
    emoji: '🫧',
    chaos: 38,
    plausibility: 58,
    narrative: 42,
    contagion: 50,
    depth: 1,
  },
  [pairKey('tide', 'void')]: {
    id: 'abyss',
    name: '심연',
    emoji: '🌊',
    chaos: 68,
    plausibility: 32,
    narrative: 60,
    contagion: 48,
    depth: 1,
  },
  [pairKey('chaos', 'life')]: {
    id: 'mutation',
    name: '변이',
    emoji: '🧬',
    chaos: 80,
    plausibility: 25,
    narrative: 65,
    contagion: 75,
    depth: 2,
  },
  [pairKey('life', 'grave')]: {
    id: 'cycle',
    name: '윤회',
    emoji: '♻️',
    chaos: 50,
    plausibility: 55,
    narrative: 85,
    contagion: 60,
    depth: 2,
  },
  [pairKey('chaos', 'abyss')]: {
    id: 'unmake',
    name: '해체',
    emoji: '💥',
    chaos: 90,
    plausibility: 15,
    narrative: 70,
    contagion: 80,
    depth: 2,
  },
  [pairKey('steam', 'life')]: {
    id: 'breath',
    name: '숨결',
    emoji: '🌬️',
    chaos: 30,
    plausibility: 70,
    narrative: 75,
    contagion: 35,
    depth: 2,
  },
  [pairKey('mire', 'grave')]: {
    id: 'fossils',
    name: '화석',
    emoji: '🦴',
    chaos: 25,
    plausibility: 80,
    narrative: 50,
    contagion: 20,
    depth: 2,
  },
  [pairKey('mutation', 'cycle')]: {
    id: 'godseed',
    name: '신종',
    emoji: '✨',
    chaos: 75,
    plausibility: 40,
    narrative: 90,
    contagion: 70,
    depth: 3,
  },
  [pairKey('unmake', 'breath')]: {
    id: 'silence',
    name: '침묵',
    emoji: '🤫',
    chaos: 55,
    plausibility: 45,
    narrative: 80,
    contagion: 65,
    depth: 3,
  },
  [pairKey('fossils', 'cycle')]: {
    id: 'memory',
    name: '기억',
    emoji: '📜',
    chaos: 20,
    plausibility: 75,
    narrative: 95,
    contagion: 40,
    depth: 3,
  },
  [pairKey('godseed', 'silence')]: {
    id: 'doctrine',
    name: '교리',
    emoji: '📿',
    chaos: 60,
    plausibility: 50,
    narrative: 88,
    contagion: 85,
    depth: 4,
  },
  [pairKey('memory', 'unmake')]: {
    id: 'heresy',
    name: '이단',
    emoji: '🕯️',
    chaos: 85,
    plausibility: 30,
    narrative: 92,
    contagion: 90,
    depth: 4,
  },
  [pairKey('doctrine', 'heresy')]: {
    id: 'schism',
    name: '분열',
    emoji: '⚔️',
    chaos: 95,
    plausibility: 20,
    narrative: 98,
    contagion: 95,
    depth: 5,
  },
}

export function lookupCombo(idA: string, idB: string): Concept | null {
  if (idA === idB) return null
  return TABLE[pairKey(idA, idB)] ?? null
}

export function tryCombine(idA: string, idB: string): Concept | { error: string } {
  const result = lookupCombo(idA, idB)
  if (!result) return { error: '조합할 수 없습니다' }
  return result
}
