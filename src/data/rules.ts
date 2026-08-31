import type { PillarKey } from '../types'

/** 프롬프트 주입·우측 패널 공통 붕괴 규칙 (화면 한자 없음) */
export const COLLAPSE_RULES: Record<PillarKey, string> = {
  substance:
    '개념을 발음이 비슷한 다른 사물로 바꿔 부를 수 있다. 배(선박)는 배(과일)다.',
  quantity: '모든 결과물 이름에 3~4자리 일련번호를 붙인다. 번호는 매번 커진다.',
  quality: '수식어를 어울리지 않는 명사에 붙인다. 수식어가 수식어를 수식해도 좋다.',
  time: '서로 다른 시대의 것을 한 개념 안에 공존시킨다.',
  relation: '서로 무관한 두 개념을 한 단어로 압축하라. 언어를 섞어도 좋다.',
  place: '둘 이상의 장소나 지형을 한 이름으로 합쳐라. 모순되어도 좋다.',
  state: '소유 관계를 뒤집어라. 사물이 사람을 지니게 하라.',
  action: '행위의 주체와 대상을 뒤바꾸거나 불명확하게 하라.',
}

/** 규칙이 조합에 개입하는 방식을 설명할 때만 쓰는 짧은 예시. */
export const COLLAPSE_RULE_EXAMPLES: Record<PillarKey, string> = {
  substance: '배(선박) → 배(과일)',
  quantity: '벽돌 → 벽돌 4821호',
  quality: '벽돌 → 바삭한 벽돌',
  time: '드론 → 고대 드론',
  relation: '불꽃 + 점토 → 불꽃점토',
  place: '안개 → 안개 골짜기',
  state: '씨앗 → 씨앗 주인',
  action: '불꽃 → 불꽃이 남긴 것',
}
