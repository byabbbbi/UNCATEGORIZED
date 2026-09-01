import type { CSSProperties } from 'react'
import { motion } from 'motion/react'
import { PillarTooltip } from './PillarTooltip'
import { GameGlyph } from './GameGlyph'
import type { Concept, PillarKey } from '../types'
import { SEAL_GLYPH, SEAL_TITLE, sealOf } from '../types'
import './IndexCard.css'

interface Props {
  concept: Concept
  pillarStability: Record<PillarKey, number>
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
  pillarStability,
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
  const stability = pillarStability[seal]
  const alive = stability > 0
  const glyph = concept.deleted ? '██' : alive ? SEAL_GLYPH[seal] : '✕'

  return (
    <motion.div
      className={[
        'index-card',
        selected ? 'is-selected' : '',
        isDiscovery ? 'is-discovery' : '',
        !alive || concept.deleted ? 'is-unjudged' : '',
        concept.deleted ? 'is-deleted' : '',
        dimmed ? 'is-dimmed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      data-pillar={seal}
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
      <PillarTooltip
        pillarKey={seal}
        stability={stability}
        placement="bottom"
        className="seal-tooltip"
      >
        <span
          className={`seal${!alive || concept.deleted ? ' is-void' : ''}`}
          aria-label={`${SEAL_TITLE[seal]} 도장`}
        >
          {glyph}
        </span>
      </PillarTooltip>
      <span className="index-card__emoji index-card__emoji--platform" aria-hidden>
        {concept.emoji}
      </span>
      <GameGlyph
        kind="concept"
        concept={concept}
        className="index-card__game-glyph"
      />
      <span className="index-card__name">{concept.name}</span>
      {isDiscovery && !concept.deleted && (
        <span className="index-card__star" aria-hidden>
          ✦
        </span>
      )}
    </motion.div>
  )
}
