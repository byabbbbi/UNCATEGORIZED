import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent } from 'motion/react'

interface Props {
  value: number
  digits?: number
  className?: string
}

/** 수치 즉시 변경 금지 — 400ms ease-out 카운트 */
export function AnimatedNumber({ value, digits = 1, className }: Props) {
  const mv = useMotionValue(value)
  const [display, setDisplay] = useState(value.toFixed(digits))
  const first = useRef(true)

  useMotionValueEvent(mv, 'change', (v) => {
    setDisplay(Number(v).toFixed(digits))
  })

  useEffect(() => {
    if (first.current) {
      first.current = false
      mv.set(value)
      setDisplay(value.toFixed(digits))
      return
    }
    const ctrl = animate(mv, value, { duration: 0.4, ease: 'easeOut' })
    return () => ctrl.stop()
  }, [value, digits, mv])

  return (
    <motion.span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {display}
    </motion.span>
  )
}
