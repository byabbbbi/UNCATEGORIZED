import type { PillarKey } from '../types'

/** 프롬프트 주입·우측 패널 공통 붕괴 규칙 (화면 한자 없음) */
export const COLLAPSE_RULES: Record<PillarKey, string> = {
  substance:
    '개념을 발음이 비슷한 다른 사물로 바꿔 부를 수 있다. 배(선박)는 배(과일)다.',
  quantity: '모든 결과물 이름에 3~4자리 일련번호를 붙인다. 번호는 매번 커진다.',
  quality: '수식어를 어울리지 않는 명사에 붙인다. 수식어가 수식어를 수식해도 좋다.',
  time: '서로 다른 시대의 것을 한 개념 안에 공존시킨다.',
}
