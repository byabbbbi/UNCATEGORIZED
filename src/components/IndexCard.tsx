import type { CSSProperties } from 'react'
import { motion } from 'motion/react'
import type { Concept, PillarKey } from '../types'
import { SEAL_GLYPH, sealOf } from '../types'
import './IndexCard.css'

interface Props {
  concept: Concept
  pillarsAlive: Record<PillarKey, boolean>
  isDiscovery?: boolean
  selected?: boolean
  dimmed?: boolean
  reject?: boolean
  className?: string
  style?: CSSProperties
  onHoverStart?: () => void
  onHoverEnd?: () => void
  onClick?: () => void
}

export function IndexCard({
  concept,
  pillarsAlive,
  isDiscovery = false,
  selected = false,
  dimmed = false,
  reject = false,
  className = '',
  style,
  onHoverStart,
  onHoverEnd,
  onClick,
}: Props) {
  const seal = sealOf(concept)
  const alive = pillarsAlive[seal]
  const glyph = alive ? SEAL_GLYPH[seal] : '判'

  return (
    <motion.div
      className={[
        'index-card',
        'misreg',
        selected ? 'is-selected' : '',
        isDiscovery ? 'is-discovery' : '',
        !alive ? 'is-unjudged' : '',
        dimmed ? 'is-dimmed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      onClick={onClick}
      animate={
        reject
          ? { x: [0, -6, 6, -4, 0], borderColor: 'var(--seal)' }
          : { x: 0 }
      }
      transition={reject ? { duration: 0.24 } : undefined}
      whileTap={{ scale: 0.96 }}
    >
      <span className={`index-card__stamp${alive ? '' : ' is-void'}`} aria-hidden>
        {alive ? glyph : '판정불가'}
      </span>
      <span className="index-card__emoji" aria-hidden>
        {concept.emoji}
      </span>
      <span className="index-card__name">{concept.name}</span>
      {isDiscovery && (
        <span className="index-card__star" aria-hidden>
          ✦
        </span>
      )}
    </motion.div>
  )
}
