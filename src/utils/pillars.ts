import { PILLAR_KEYS, type Pillar, type PillarKey } from '../types'

export function pillarsAliveMap(
  pillars: Pick<Pillar, 'key' | 'stability'>[],
): Record<PillarKey, boolean> {
  return Object.fromEntries(
    PILLAR_KEYS.map((key) => [
      key,
      (pillars.find((pillar) => pillar.key === key)?.stability ?? 0) > 0,
    ]),
  ) as Record<PillarKey, boolean>
}
