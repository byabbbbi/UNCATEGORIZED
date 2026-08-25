import type { EndingKind } from '../types'
import { PILLAR_KEYS } from '../types'
import { INDISTINCT_COLLAPSE_THRESHOLD } from './initial'

export const ENDING_LINES: Record<Exclude<EndingKind, null>, string> = {
  blank: '기록할 것이 남지 않았다.',
  indistinct:
    `${PILLAR_KEYS.length}개 범주 중 ${INDISTINCT_COLLAPSE_THRESHOLD}개가 반납되었다. 남은 구별로는 당신을 오류라 부를 수 없다.`,
  classified:
    '여섯 시대가 닫혔다. 신들은 합의했다 — 당신은 이제 대장의 정식 항목이다. 예외는 더 이상 없다.',
}

export const ENDING_LABELS: Record<Exclude<EndingKind, null>, string> = {
  blank: '백지',
  indistinct: '무구별',
  classified: '분류됨',
}
