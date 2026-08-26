import {
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { PILLAR_QUESTIONS } from '../data/initial'
import { COLLAPSE_RULES } from '../data/rules'
import {
  SEAL_TITLE,
  pillarPhase,
  type PillarKey,
} from '../types'
import './PillarTooltip.css'

const PHASE_LABEL = {
  judge: '심판',
  sophistry: '궤변',
  resign: '사임',
} as const

interface Props {
  pillarKey: PillarKey
  stability: number
  placement?: 'left' | 'bottom'
  className?: string
  children: ReactNode
}

export function PillarTooltip({
  pillarKey,
  stability,
  placement = 'bottom',
  className = '',
  children,
}: Props) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<CSSProperties>({ visibility: 'hidden' })
  const anchorRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tooltipId = useId()
  const collapsed = stability <= 0
  const phase = pillarPhase(stability)

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current
    const tooltip = tooltipRef.current
    if (!anchor || !tooltip) return

    const gap = 10
    const margin = 8
    const anchorRect = anchor.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()
    let left =
      placement === 'left'
        ? anchorRect.left - tooltipRect.width - gap
        : anchorRect.right - tooltipRect.width
    let top =
      placement === 'left'
        ? anchorRect.top + (anchorRect.height - tooltipRect.height) / 2
        : anchorRect.bottom + gap

    if (placement === 'left' && left < margin) {
      left = anchorRect.right + gap
    }
    if (placement === 'bottom' && top + tooltipRect.height > window.innerHeight - margin) {
      top = anchorRect.top - tooltipRect.height - gap
    }

    left = Math.max(
      margin,
      Math.min(left, window.innerWidth - tooltipRect.width - margin),
    )
    top = Math.max(
      margin,
      Math.min(top, window.innerHeight - tooltipRect.height - margin),
    )
    setPosition({ left, top, visibility: 'visible' })
  }, [placement])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const frame = window.requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  const closeAfterFocusLeaves = (event: FocusEvent<HTMLSpanElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOpen(false)
    }
  }

  return (
    <span
      ref={anchorRef}
      className={`pillar-tooltip-anchor${className ? ` ${className}` : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={closeAfterFocusLeaves}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      <span
        className="pillar-tooltip-anchor__content"
        aria-describedby={open ? tooltipId : undefined}
      >
        {children}
      </span>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            className="pillar-tooltip"
            role="tooltip"
            style={position}
          >
            <strong className="pillar-tooltip__title">
              {SEAL_TITLE[pillarKey]}
            </strong>
            <p className="pillar-tooltip__description">
              {collapsed
                ? COLLAPSE_RULES[pillarKey]
                : `“${PILLAR_QUESTIONS[pillarKey]}”`}
            </p>
            <span className="pillar-tooltip__phase">
              {PHASE_LABEL[phase]} (안정도 {Math.round(stability)})
            </span>
          </div>,
          document.body,
        )}
    </span>
  )
}
