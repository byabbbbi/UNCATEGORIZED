import { hashStr, mulberry32 } from '../generation'
import type { CaseTaskId, EraCaseState } from '../types'

const CASE_TASK_IDS: CaseTaskId[] = [
  'depth',
  'contaminated',
  'pillars',
  'destruction',
  'noCollapse',
  'selfCombine',
  'discoveries',
  'censored',
]

function shuffledTasks(worldSeed: number): CaseTaskId[] {
  const result = [...CASE_TASK_IDS]
  const rnd = mulberry32(hashStr(`case-file:${worldSeed}`))
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function targetOf(id: CaseTaskId): number {
  if (id === 'contaminated') return 2
  if (id === 'pillars') return 3
  if (id === 'discoveries') return 5
  return 1
}

export function createWorldSeed(): number {
  try {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    return values[0]
  } catch {
    return hashStr(`${Date.now()}:${performance.now()}`)
  }
}

export function createEraCase(
  worldSeed: number,
  era: number,
  collapsedAtStart: number,
): EraCaseState {
  const id = shuffledTasks(worldSeed)[era - 1]
  if (!id) throw new Error(`제${era}시대 사건을 배정할 수 없습니다.`)
  return {
    id,
    era,
    progress: 0,
    target: targetOf(id),
    completed: false,
    proclaimedPillars: [],
    collapsedAtStart,
  }
}

export function caseDescription(eraCase: EraCaseState): string {
  switch (eraCase.id) {
    case 'depth':
      return `깊이 ${2 + eraCase.era} 이상의 개념을 등록하라`
    case 'contaminated':
      return '오염된 결과를 2건 등록하라'
    case 'pillars':
      return '서로 다른 기둥 3곳에 선포하라'
    case 'destruction':
      return '파괴력 25 이상으로 선포하라'
    case 'noCollapse':
      return '이번 시대에 기둥을 무너뜨리지 마라'
    case 'selfCombine':
      return '같은 개념을 심화 조합하라'
    case 'discoveries':
      return '최초 발견을 5건 기록하라'
    case 'censored':
      return '검열된 개념(███)을 1건 마주하라'
  }
}

export function caseProgressLabel(eraCase: EraCaseState): string {
  if (eraCase.completed) return `(${eraCase.progress}/${eraCase.target}) · 종결됨`
  if (eraCase.id === 'noCollapse') return '(진행 중)'
  return `(${eraCase.progress}/${eraCase.target})`
}
