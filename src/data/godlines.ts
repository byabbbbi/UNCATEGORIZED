import type { PillarKey } from '../types'

export const GOD_LINES = {
  substance: {
    judge: ['이것은 그 자신이다. 등록한다.', '명칭과 실물의 일치를 확인했다.'],
    sophistry: [
      '발음이 같다면 같은 것이다. 이것이 오늘부터의 원칙이다.',
      '선박과 과일의 구분 요청은 반려한다. 소리가 이미 하나다.',
    ],
    resign: [
      '무엇이 무엇인지, 나는 더 이상 말하지 않겠다.',
      '실체 대장을 반납한다. 이제 모든 것은 서로일 수 있다.',
    ],
  },
  quantity: {
    judge: ['수량 확인. 유효한 서수다.', '하나, 둘. 세는 데 문제가 없다.'],
    sophistry: [
      '제4395호는 유효하다. 앞선 4394개의 소재는 본 기관의 소관이 아니다.',
      '무한도 하나의 숫자로 취급한다. 반올림하겠다.',
    ],
    resign: [
      '나는 세는 자였다. 이제 셀 것이 없다.',
      '수를 반납한다. 개수는 각자 알아서 정하라.',
    ],
  },
  quality: {
    judge: ['성질 적합. 뜨거운 것은 뜨겁다.', '형용이 명사에 맞음을 확인했다.'],
    sophistry: [
      '호수는 바삭할 수 있다. 바삭하지 않다는 증거가 제출되지 않았다.',
      "'매우 매운 매움'을 승인한다. 수식은 자유다.",
    ],
    resign: [
      '어떠한가를 묻는 일을 그만두겠다.',
      '성질 목록을 반납한다. 모든 것은 이제 아무래도 좋다.',
    ],
  },
  time: {
    judge: ['연대 확인. 이 개념은 제 시대에 있다.', '순서가 지켜지고 있다.'],
    sophistry: [
      '공룡과 자판기는 동시대다. 시대는 본관이 정한다.',
      '과거는 방금 갱신되었다. 이의는 어제로 제출하라.',
    ],
    resign: [
      '언제인지 묻는 것을 그만두겠다. 모든 것은 지금이다.',
      '달력을 반납한다.',
    ],
  },
} as const

export type GodPhase = 'judge' | 'sophistry' | 'resign'

export function pickGodLine(pillar: PillarKey, phase: GodPhase): string {
  const pool = GOD_LINES[pillar][phase]
  return pool[Math.floor(Math.random() * pool.length)]
}
