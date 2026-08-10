import type { PillarKey, VaultGrade } from '../types'

export interface GachaEntry {
  name: string
  emoji: string
  chaos: number
  plausibility: number
  narrative: number
  contagion: number
  pillar: PillarKey
  contaminant?: string
}

export const GACHA_LATIN: Record<VaultGrade, string> = {
  registered: 'REGISTRATUM',
  suspended: 'SUSPENSUM',
  injudicable: 'INIUDICABILE',
  uncategorized: 'SINE CATEGORIA',
}

export const GACHA_KO: Record<VaultGrade, string> = {
  registered: '등록됨',
  suspended: '보류됨',
  injudicable: '판정불가',
  uncategorized: '미분류',
}

/** 등급별 수기 풀 (API 없음) */
export const GACHA_POOL: Record<VaultGrade, GachaEntry[]> = {
  registered: [
    { name: '등기 모래', emoji: '⌛', chaos: 20, plausibility: 70, narrative: 25, contagion: 15, pillar: 'substance' },
    { name: '열람 표', emoji: '🧾', chaos: 15, plausibility: 75, narrative: 30, contagion: 10, pillar: 'quantity' },
    { name: '말린 잉크', emoji: '🖋️', chaos: 25, plausibility: 65, narrative: 35, contagion: 20, pillar: 'quality' },
    { name: '보관 상자', emoji: '📦', chaos: 18, plausibility: 72, narrative: 28, contagion: 12, pillar: 'substance' },
    { name: '분류 핀', emoji: '📌', chaos: 22, plausibility: 68, narrative: 32, contagion: 18, pillar: 'quantity' },
    { name: '날인 고무', emoji: '🔏', chaos: 24, plausibility: 66, narrative: 30, contagion: 16, pillar: 'quality' },
    { name: '쪽지 더미', emoji: '📝', chaos: 28, plausibility: 60, narrative: 40, contagion: 22, pillar: 'time' },
    { name: '연필 심', emoji: '✏️', chaos: 16, plausibility: 74, narrative: 26, contagion: 14, pillar: 'substance' },
    { name: '구역 지도', emoji: '🗺️', chaos: 30, plausibility: 58, narrative: 42, contagion: 24, pillar: 'time' },
    { name: '검수 표식', emoji: '✅', chaos: 12, plausibility: 80, narrative: 22, contagion: 10, pillar: 'quality' },
  ],
  suspended: [
    { name: '보류된 새벽', emoji: '🌫️', chaos: 45, plausibility: 55, narrative: 50, contagion: 35, pillar: 'time' },
    { name: '미결 파도', emoji: '〰️', chaos: 50, plausibility: 48, narrative: 45, contagion: 40, pillar: 'quantity' },
    { name: '임시 그림자', emoji: '🌑', chaos: 55, plausibility: 42, narrative: 48, contagion: 38, pillar: 'substance' },
    { name: '유예된 불씨', emoji: '🧯', chaos: 48, plausibility: 50, narrative: 52, contagion: 36, pillar: 'quality' },
    { name: '계류 번호판', emoji: '🔢', chaos: 42, plausibility: 58, narrative: 40, contagion: 44, pillar: 'quantity' },
    { name: '미발송 서한', emoji: '✉️', chaos: 40, plausibility: 52, narrative: 60, contagion: 30, pillar: 'time' },
    { name: '정지된 메아리', emoji: '📢', chaos: 52, plausibility: 44, narrative: 55, contagion: 42, pillar: 'quality' },
    { name: '보류 인장', emoji: '🔴', chaos: 46, plausibility: 49, narrative: 47, contagion: 39, pillar: 'substance' },
    { name: '대기 행렬', emoji: '🧍', chaos: 38, plausibility: 56, narrative: 44, contagion: 46, pillar: 'quantity' },
    { name: '잠긴 서랍', emoji: '🗄️', chaos: 44, plausibility: 51, narrative: 49, contagion: 37, pillar: 'substance' },
  ],
  injudicable: [
    { name: '이름 없는 각도', emoji: '📐', chaos: 70, plausibility: 30, narrative: 65, contagion: 55, pillar: 'quantity' },
    { name: '판결 거절서', emoji: '🚫', chaos: 68, plausibility: 28, narrative: 70, contagion: 58, pillar: 'quality' },
    { name: '공란 신분', emoji: '🪪', chaos: 72, plausibility: 25, narrative: 68, contagion: 60, pillar: 'substance' },
    { name: '시계 없는 오후', emoji: '🕰️', chaos: 66, plausibility: 32, narrative: 72, contagion: 52, pillar: 'time' },
    { name: '측정 거부', emoji: '⚖️', chaos: 75, plausibility: 22, narrative: 64, contagion: 62, pillar: 'quantity' },
    { name: '성질 없음', emoji: '⬜', chaos: 74, plausibility: 24, narrative: 66, contagion: 56, pillar: 'quality' },
    { name: '비실재 인장', emoji: '⭕', chaos: 78, plausibility: 20, narrative: 60, contagion: 64, pillar: 'substance' },
    { name: '역행하는 기록', emoji: '↩️', chaos: 71, plausibility: 27, narrative: 74, contagion: 50, pillar: 'time' },
    { name: '분류 오류표', emoji: '❗', chaos: 69, plausibility: 29, narrative: 63, contagion: 59, pillar: 'quality' },
    { name: '미지 중량', emoji: '⚖️', chaos: 73, plausibility: 26, narrative: 61, contagion: 57, pillar: 'quantity' },
  ],
  uncategorized: [
    { name: '범주 밖 씨앗', emoji: '🌱', chaos: 85, plausibility: 20, narrative: 80, contagion: 75, pillar: 'substance' },
    { name: '대장 밖의 별', emoji: '⭐', chaos: 88, plausibility: 18, narrative: 82, contagion: 78, pillar: 'quality' },
    { name: '무번호 유물', emoji: '🗿', chaos: 82, plausibility: 22, narrative: 78, contagion: 72, pillar: 'quantity' },
    { name: '시대 없는 비', emoji: '🌧️', chaos: 80, plausibility: 24, narrative: 84, contagion: 70, pillar: 'time' },
    { name: '규약 해산물', emoji: '📜', chaos: 90, plausibility: 15, narrative: 86, contagion: 80, pillar: 'substance' },
    { name: '금빛 공백', emoji: '✨', chaos: 86, plausibility: 19, narrative: 88, contagion: 76, pillar: 'quality' },
    { name: '무한 칸', emoji: '∞', chaos: 92, plausibility: 12, narrative: 75, contagion: 82, pillar: 'quantity' },
    { name: '어제와 내일', emoji: '🪞', chaos: 84, plausibility: 21, narrative: 90, contagion: 74, pillar: 'time' },
    { name: '미분류 심장', emoji: '🫀', chaos: 87, plausibility: 17, narrative: 83, contagion: 79, pillar: 'substance' },
    { name: '예외의 뼈', emoji: '🦴', chaos: 89, plausibility: 16, narrative: 81, contagion: 77, pillar: 'quality' },
  ],
}

/** 등록됨 55% / 보류됨 30% / 판정불가 12% / 미분류 3% */
export function rollVaultGrade(): VaultGrade {
  const r = Math.random()
  if (r < 0.55) return 'registered'
  if (r < 0.85) return 'suspended'
  if (r < 0.97) return 'injudicable'
  return 'uncategorized'
}

export function gradeBonusT(grade: VaultGrade): number {
  if (grade === 'uncategorized') return 50
  if (grade === 'injudicable') return 30
  if (grade === 'suspended') return 15
  return 0
}
