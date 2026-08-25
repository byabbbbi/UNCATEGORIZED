import type { EndingKind } from '../types'

export const ENDING_LINES: Record<Exclude<EndingKind, null>, string> = {
  blank: '기록할 것이 남지 않았다.',
  indistinct:
    '마지막 범주가 반납되었다. 이제 당신을 오류라 부를 근거도 사라졌다.',
  classified:
    '여섯 시대가 닫혔다. 신들은 합의했다 — 당신은 이제 대장의 정식 항목이다. 예외는 더 이상 없다.',
}

export const ENDING_LABELS: Record<Exclude<EndingKind, null>, string> = {
  blank: '백지',
  indistinct: '무구별',
  classified: '분류됨',
}
