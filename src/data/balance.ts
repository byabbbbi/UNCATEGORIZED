/** era별 선포 파괴력(D) 배율 — stability는 INITIAL_PILLARS(100) 유지 */
export const ERA_D_MULTIPLIER: Record<number, number> = {
  1: 1.5,
  2: 1.2,
}

export function getEraDMultiplier(era: number): number {
  return ERA_D_MULTIPLIER[era] ?? 1
}
