import type { Concept, PillarKey } from '../types'

/** 조합 키는 이름 알파벳/문자열 순 정렬 (`a+b`) — generation.pairKey와 동일 */
export type HardTable = Record<
  string,
  Omit<Concept, 'id' | 'depth'> & { depth?: number }
>

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('+')
}

function hard(
  name: string,
  emoji: string,
  chaos: number,
  plausibility: number,
  narrative: number,
  contagion: number,
  pillar: PillarKey,
  depth = 1,
): HardTable[string] {
  return { name, emoji, chaos, plausibility, narrative, contagion, pillar, depth }
}

/** 깨끗한 세계 전용 하드코딩 조합 (이름 기준) */
export const HARD_TABLE: HardTable = {
  [pairKey('공허', '불꽃')]: hard('혼돈', '🌀', 72, 28, 40, 55, 'quality'),
  [pairKey('불꽃', '점토')]: hard('생명', '🌱', 35, 60, 70, 40, 'substance'),
  [pairKey('공허', '점토')]: hard('무덤', '🪦', 45, 50, 55, 30, 'substance'),
  [pairKey('조류', '불꽃')]: hard('증기', '💨', 40, 65, 35, 45, 'quality'),
  [pairKey('조류', '점토')]: hard('늪', '🫧', 38, 58, 42, 50, 'time'),
  [pairKey('조류', '공허')]: hard('심연', '🌊', 68, 32, 60, 48, 'substance'),
  [pairKey('혼돈', '생명')]: hard('변이', '🧬', 80, 25, 65, 75, 'quality', 2),
  [pairKey('생명', '무덤')]: hard('윤회', '♻️', 50, 55, 85, 60, 'time', 2),
  [pairKey('혼돈', '심연')]: hard('해체', '💥', 90, 15, 70, 80, 'substance', 2),
  [pairKey('증기', '생명')]: hard('숨결', '🌬️', 30, 70, 75, 35, 'quality', 2),
  [pairKey('늪', '무덤')]: hard('화석', '🦴', 25, 80, 50, 20, 'time', 2),
  [pairKey('변이', '윤회')]: hard('신종', '✨', 75, 40, 90, 70, 'quality', 3),
  [pairKey('해체', '숨결')]: hard('침묵', '🤫', 55, 45, 80, 65, 'substance', 3),
  [pairKey('화석', '윤회')]: hard('기억', '📜', 20, 75, 95, 40, 'time', 3),
  [pairKey('신종', '침묵')]: hard('교리', '📿', 60, 50, 88, 85, 'quality', 4),
  [pairKey('기억', '해체')]: hard('이단', '🕯️', 85, 30, 92, 90, 'substance', 4),
  [pairKey('교리', '이단')]: hard('분열', '⚔️', 95, 20, 98, 95, 'quality', 5),
}

export { pairKey as hardPairKey }
