import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
} from 'motion/react'
import { IndexCard } from './IndexCard'
import { TutorialHint } from './TutorialHint'
import { useGameStore } from '../store/gameStore'
import { hashStr } from '../generation'
import { sfx } from '../sfx'
import { MAX_PROCLAMATIONS_PER_ERA } from '../data/initial'
import { ALTAR_R, CARD_H, CARD_W } from '../types'
import type { PillarKey } from '../types'
import { pillarStabilityMap } from '../utils/pillars'
import './CanvasBoard.css'

function cardTiltDeg(conceptId: string, collapsed: number): number {
  if (collapsed <= 0) return 0
  const sign = hashStr(conceptId) & 1 ? 1 : -1
  return sign * 0.4 * collapsed
}

function pointOverDrawer(clientX: number, clientY: number) {
  const el = document.elementFromPoint(clientX, clientY)
  return !!el?.closest('.drawer')
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 767px)').matches
}

function ProcessingCard({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      className="canvas-card card-back-loader"
      style={{ position: 'absolute', left: x, top: y, zIndex: 8 }}
      initial={{ opacity: 0.6, rotateY: 0 }}
      animate={{ opacity: 1, rotateY: 360 }}
      transition={{
        opacity: { duration: 0.25 },
        rotateY: { duration: 3, repeat: Infinity, ease: 'linear' },
      }}
    >
      <span className="card-back-loader__wax" aria-hidden>
        ❐
      </span>
    </motion.div>
  )
}

function CanvasCard({
  instanceId,
  conceptId,
  x,
  y,
  pillarStability,
  isDiscovery,
  selected,
  reject,
  locked,
  revealDiscovery,
  spawnPop,
  rerecord,
  tilt,
  reservedSlot,
  onMobileTap,
  onMobileLongPress,
}: {
  instanceId: string
  conceptId: string
  x: number
  y: number
  pillarStability: Record<PillarKey, number>
  isDiscovery: boolean
  selected: boolean
  reject: boolean
  locked: boolean
  revealDiscovery: boolean
  spawnPop: boolean
  rerecord: { previous: string; current: string } | null | undefined
  tilt: number
  reservedSlot: number
  onMobileTap?: (instanceId: string) => void
  onMobileLongPress?: (instanceId: string) => void
}) {
  const concept = useGameStore((s) => s.concepts.find((c) => c.id === conceptId)!)
  const selectInstance = useGameStore((s) => s.selectInstance)
  const setHoverConcept = useGameStore((s) => s.setHoverConcept)
  const handleDrop = useGameStore((s) => s.handleDrop)
  const setInstancePos = useGameStore((s) => s.setInstancePos)
  const dismissInstance = useGameStore((s) => s.dismissInstance)
  const duplicateInstance = useGameStore((s) => s.duplicateInstance)
  const setDrawerHighlight = useGameStore((s) => s.setDrawerHighlight)
  const boardRef = useRef<HTMLElement | null>(null)
  const pointer = useRef<{
    id: number
    startClientX: number
    startClientY: number
    startX: number
    startY: number
    pointerType: string
    dragging: boolean
    longPressed: boolean
    cancelled: boolean
  } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [touchDragging, setTouchDragging] = useState(false)
  const reserved = reservedSlot >= 0

  const mx = useMotionValue(x)
  const my = useMotionValue(y)

  useEffect(() => {
    if (pointer.current?.dragging) return
    const spring = { type: 'spring' as const, stiffness: 300, damping: 30 }
    const ax = animate(mx, x, spring)
    const ay = animate(my, y, spring)
    return () => {
      ax.stop()
      ay.stop()
    }
  }, [x, y, mx, my])

  useEffect(() => () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }, [])

  if (!concept) return null

  return (
    <motion.div
      className={`canvas-card${rerecord ? ' is-rerecord' : ''}${reserved ? ' is-combo-reserved' : ''}`}
      style={{ x: mx, y: my, position: 'absolute', top: 0, left: 0, zIndex: touchDragging || selected || rerecord ? 24 : 5 }}
      initial={
        spawnPop
          ? { scale: 0.55, opacity: 0, rotate: tilt - 4 }
          : revealDiscovery
            ? { scale: 0.7, opacity: 0 }
            : false
      }
      animate={{ scale: touchDragging ? 1.06 : selected ? 1.03 : 1, opacity: 1, rotate: tilt }}
      transition={{ type: 'spring', stiffness: 460, damping: 19 }}
      onPointerDown={(event) => {
        if (locked || concept.deleted) return
        const mobile = isMobileViewport()
        if (!mobile) selectInstance(instanceId)
        setHoverConcept(conceptId)
        boardRef.current = document.querySelector('.canvas-board')
        pointer.current = {
          id: event.pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startX: mx.get(),
          startY: my.get(),
          pointerType: event.pointerType,
          dragging: false,
          longPressed: false,
          cancelled: false,
        }
        event.currentTarget.setPointerCapture(event.pointerId)
        if (mobile && event.pointerType === 'touch') {
          longPressTimer.current = setTimeout(() => {
            const active = pointer.current
            if (!active || active.dragging) return
            active.longPressed = true
            selectInstance(instanceId)
            onMobileLongPress?.(instanceId)
          }, 400)
        }
      }}
      onHoverStart={() => setHoverConcept(conceptId)}
      onDoubleClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (isMobileViewport() || pointer.current?.dragging || locked || concept.deleted) return
        duplicateInstance(instanceId)
      }}
      onPointerMove={(event) => {
        const active = pointer.current
        if (!active || active.id !== event.pointerId) return
        const dx = event.clientX - active.startClientX
        const dy = event.clientY - active.startClientY
        if (reserved) {
          if (Math.hypot(dx, dy) >= 8) {
            active.cancelled = true
            if (longPressTimer.current) clearTimeout(longPressTimer.current)
          }
          return
        }
        if (!active.dragging && Math.hypot(dx, dy) < 8) return
        if (!active.dragging) {
          active.dragging = true
          if (longPressTimer.current) clearTimeout(longPressTimer.current)
          setTouchDragging(active.pointerType === 'touch')
          sfx.pick()
        }
        const fingerOffset = active.pointerType === 'touch' ? 40 : 0
        mx.set(active.startX + dx)
        my.set(active.startY + dy - fingerOffset)
        setDrawerHighlight(pointOverDrawer(event.clientX, event.clientY))
      }}
      onPointerUp={(event) => {
        const active = pointer.current
        if (!active || active.id !== event.pointerId) return
        if (longPressTimer.current) clearTimeout(longPressTimer.current)
        pointer.current = null
        setTouchDragging(false)
        setDrawerHighlight(false)
        if (!active.dragging) {
          if (!active.longPressed && !active.cancelled && isMobileViewport()) {
            onMobileTap?.(instanceId)
          }
          return
        }
        if (pointOverDrawer(event.clientX, event.clientY)) {
          dismissInstance(instanceId)
          return
        }
        const board = boardRef.current ?? document.querySelector('.canvas-board')
        if (!board) return
        const nx = mx.get()
        const ny = my.get()
        const center = { x: nx + CARD_W / 2, y: ny + CARD_H / 2 }
        const boardRect = board.getBoundingClientRect()
        const altarEl = board.querySelector('.altar')
        const altarRect = altarEl?.getBoundingClientRect()
        const altar = altarRect
          ? {
              x: altarRect.left - boardRect.left + altarRect.width / 2,
              y: altarRect.top - boardRect.top + altarRect.height / 2,
            }
          : {
              x: boardRect.width / 2,
              y: boardRect.height - 112,
        }
        setInstancePos(instanceId, nx, ny)
        handleDrop(instanceId, center, altar, !isMobileViewport())
      }}
      onPointerCancel={(event) => {
        const active = pointer.current
        if (!active || active.id !== event.pointerId) return
        if (longPressTimer.current) clearTimeout(longPressTimer.current)
        pointer.current = null
        setTouchDragging(false)
        setDrawerHighlight(false)
        mx.set(x)
        my.set(y)
      }}
      onContextMenu={(event) => {
        if (isMobileViewport()) event.preventDefault()
      }}
    >
      {revealDiscovery && <span className="result-burst__ring" />}
      {reserved && (
        <span className="canvas-card__reserved" aria-hidden>
          {reservedSlot + 1}
        </span>
      )}
      <IndexCard
        concept={concept}
        pillarStability={pillarStability}
        isDiscovery={isDiscovery || revealDiscovery}
        selected={selected || !!rerecord}
        reject={reject}
        className={rerecord ? 'is-rerecord-seal' : ''}
      />
      <AnimatePresence>
        {rerecord && (
          <motion.div
            className="rerecord-caption"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <span>이전 · {rerecord.previous}</span>
            <span>지금 · {rerecord.current}</span>
            <em>같은 조합이 다른 결과를 냈다</em>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function CanvasBoard({
  onMobileCardTap,
  onMobileCardLongPress,
}: {
  onMobileCardTap?: (instanceId: string) => void
  onMobileCardLongPress?: (instanceId: string) => void
}) {
  const instances = useGameStore((s) => s.instances)
  const concepts = useGameStore((s) => s.concepts)
  const discoveredIds = useGameStore((s) => s.discoveredIds)
  const pillars = useGameStore((s) => s.pillars)
  const selectedInstanceId = useGameStore((s) => s.selectedInstanceId)
  const fx = useGameStore((s) => s.fx)
  const mobileComboSlots = useGameStore((s) => s.mobileComboSlots)
  const mobileComboPreparing = useGameStore((s) => s.mobileComboPreparing)
  const tutorialStep = useGameStore((s) => s.tutorialStep)
  const tidyCanvas = useGameStore((s) => s.tidyCanvas)
  const endEra = useGameStore((s) => s.endEra)
  const coherence = useGameStore((s) => s.coherence)
  const proclamationsThisEra = useGameStore((s) => s.proclamationsThisEra)
  const collapsedCount = useGameStore((s) => s.collapsed.length)
  const pillarStability = pillarStabilityMap(pillars)
  const boardRef = useRef<HTMLElement>(null)

  const initialDiscoveries = new Set(
    discoveredIds.filter((id) => !['void', 'spark', 'clay', 'tide'].includes(id)),
  )

  const eraRemainingZero =
    proclamationsThisEra >= MAX_PROCLAMATIONS_PER_ERA
  const eraUrgent = eraRemainingZero || coherence <= 30

  return (
    <section
      ref={boardRef}
      className={`canvas-board${tutorialStep === 3 ? ' is-altar-pulse' : ''}${mobileComboPreparing ? ' is-combo-preparing' : ''}`}
      style={{ ['--decay' as string]: collapsedCount }}
    >
      <div className="canvas-rules" aria-hidden />
      <div className="canvas-board__hint">카드를 끌어 겹치면 조합 · 제단에 놓으면 선포</div>
      <TutorialHint />

      <div className="canvas-tools">
        <button
          type="button"
          className={`canvas-tool canvas-tool--era${eraRemainingZero ? ' is-urgent' : ''}`}
          onClick={endEra}
          disabled={fx.inputLocked}
          title="시대 마감"
        >
          <span className="canvas-tool__label">시대 마감</span>
        </button>
        <button
          type="button"
          className="canvas-tool canvas-tool--tidy"
          onClick={tidyCanvas}
          disabled={fx.inputLocked}
          title="캔버스 정리"
        >
          <span className="canvas-tool__icon" aria-hidden>
            ⊞
          </span>
          <span className="canvas-tool__label">정리</span>
        </button>
      </div>

      <motion.div
        className={`altar${fx.sealFlash ? ' is-stamping' : ''}${tutorialStep === 3 ? ' is-pulse' : ''}`}
        style={{ width: ALTAR_R * 2, height: ALTAR_R * 2 }}
        animate={
          fx.sealFlash
            ? { scale: [1.3, 1], rotate: [-8, 0] }
            : { scale: 1, rotate: 0 }
        }
        transition={{ duration: 0.35 }}
      >
        <span className="altar__label">ARA</span>
        <span className="altar__sub">선포</span>
      </motion.div>

      <button
        type="button"
        className={`era-close-btn${eraUrgent ? ' is-urgent' : ''}`}
        onClick={endEra}
        disabled={fx.inputLocked}
      >
        시대 마감
      </button>

      <AnimatePresence>
        {instances.map((inst) => {
          if (inst.processing) {
            return (
              <ProcessingCard key={inst.instanceId} x={inst.x} y={inst.y} />
            )
          }
          const concept = concepts.find((c) => c.id === inst.conceptId)
          if (!concept) return null
          return (
            <CanvasCard
              key={inst.instanceId}
              instanceId={inst.instanceId}
              conceptId={inst.conceptId}
              x={inst.x}
              y={inst.y}
              pillarStability={pillarStability}
              isDiscovery={initialDiscoveries.has(inst.conceptId)}
              selected={selectedInstanceId === inst.instanceId}
              reject={fx.rejectInstanceId === inst.instanceId}
              locked={fx.inputLocked || mobileComboPreparing}
              revealDiscovery={!!inst.revealDiscovery}
              spawnPop={!!inst.spawnPop}
              rerecord={inst.rerecord}
              tilt={cardTiltDeg(inst.conceptId, collapsedCount)}
              reservedSlot={mobileComboSlots.findIndex(
                (slot) => slot?.instanceId === inst.instanceId,
              )}
              onMobileTap={onMobileCardTap}
              onMobileLongPress={onMobileCardLongPress}
            />
          )
        })}
      </AnimatePresence>
    </section>
  )
}
