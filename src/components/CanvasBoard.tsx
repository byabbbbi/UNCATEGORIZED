import { useEffect, useRef } from 'react'
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
} from 'motion/react'
import { IndexCard } from './IndexCard'
import { TutorialHint } from './TutorialHint'
import { useGameStore } from '../store/gameStore'
import { sfx } from '../sfx'
import { ALTAR_R, CARD_H, CARD_W } from '../types'
import type { PillarKey } from '../types'
import './CanvasBoard.css'

function pillarsAliveMap(
  pillars: { key: PillarKey; stability: number }[],
): Record<PillarKey, boolean> {
  return {
    substance: (pillars.find((p) => p.key === 'substance')?.stability ?? 0) > 0,
    quantity: (pillars.find((p) => p.key === 'quantity')?.stability ?? 0) > 0,
    quality: (pillars.find((p) => p.key === 'quality')?.stability ?? 0) > 0,
    time: (pillars.find((p) => p.key === 'time')?.stability ?? 0) > 0,
  }
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

function pointOverDrawer(clientX: number, clientY: number) {
  const el = document.elementFromPoint(clientX, clientY)
  return !!el?.closest('.drawer')
}

function CanvasCard({
  instanceId,
  conceptId,
  x,
  y,
  alive,
  isDiscovery,
  selected,
  reject,
  locked,
  revealDiscovery,
  rerecord,
}: {
  instanceId: string
  conceptId: string
  x: number
  y: number
  alive: Record<PillarKey, boolean>
  isDiscovery: boolean
  selected: boolean
  reject: boolean
  locked: boolean
  revealDiscovery: boolean
  rerecord: { previous: string; current: string } | null | undefined
}) {
  const concept = useGameStore((s) => s.concepts.find((c) => c.id === conceptId)!)
  const selectInstance = useGameStore((s) => s.selectInstance)
  const setHoverConcept = useGameStore((s) => s.setHoverConcept)
  const handleDrop = useGameStore((s) => s.handleDrop)
  const setInstancePos = useGameStore((s) => s.setInstancePos)
  const dismissInstance = useGameStore((s) => s.dismissInstance)
  const setDrawerHighlight = useGameStore((s) => s.setDrawerHighlight)
  const boardRef = useRef<HTMLElement | null>(null)
  const dragging = useRef(false)

  const mx = useMotionValue(x)
  const my = useMotionValue(y)

  useEffect(() => {
    if (dragging.current) return
    const spring = { type: 'spring' as const, stiffness: 300, damping: 30 }
    const ax = animate(mx, x, spring)
    const ay = animate(my, y, spring)
    return () => {
      ax.stop()
      ay.stop()
    }
  }, [x, y, mx, my])

  if (!concept) return null

  return (
    <motion.div
      className={`canvas-card${rerecord ? ' is-rerecord' : ''}`}
      style={{ x: mx, y: my, position: 'absolute', top: 0, left: 0, zIndex: selected || rerecord ? 24 : 5 }}
      drag={!locked && !concept.deleted}
      dragMomentum={false}
      dragElastic={0.08}
      whileDrag={{ scale: 1.06, rotate: 1.5, zIndex: 100 }}
      initial={revealDiscovery ? { scale: 0.7, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      onDragStart={() => {
        dragging.current = true
        sfx.pick()
      }}
      onPointerDown={() => {
        selectInstance(instanceId)
        setHoverConcept(conceptId)
        boardRef.current = document.querySelector('.canvas-board')
      }}
      onHoverStart={() => setHoverConcept(conceptId)}
      onDrag={(_, info) => {
        setDrawerHighlight(pointOverDrawer(info.point.x, info.point.y))
      }}
      onDragEnd={(_, info) => {
        dragging.current = false
        setDrawerHighlight(false)
        if (pointOverDrawer(info.point.x, info.point.y)) {
          dismissInstance(instanceId)
          return
        }
        const board = boardRef.current ?? document.querySelector('.canvas-board')
        if (!board) return
        const nx = mx.get()
        const ny = my.get()
        const center = { x: nx + CARD_W / 2, y: ny + CARD_H / 2 }
        const rect = board.getBoundingClientRect()
        const altar = {
          x: rect.width / 2,
          y: rect.height - 72,
        }
        setInstancePos(instanceId, nx, ny)
        handleDrop(instanceId, center, altar)
      }}
    >
      {revealDiscovery && <span className="result-burst__ring" />}
      <IndexCard
        concept={concept}
        pillarsAlive={alive}
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

export function CanvasBoard() {
  const instances = useGameStore((s) => s.instances)
  const concepts = useGameStore((s) => s.concepts)
  const discoveredIds = useGameStore((s) => s.discoveredIds)
  const pillars = useGameStore((s) => s.pillars)
  const selectedInstanceId = useGameStore((s) => s.selectedInstanceId)
  const fx = useGameStore((s) => s.fx)
  const tutorialStep = useGameStore((s) => s.tutorialStep)
  const spawnFromDrawer = useGameStore((s) => s.spawnFromDrawer)
  const collapsedCount = pillars.filter((p) => p.stability <= 0).length
  const alive = pillarsAliveMap(pillars)
  const boardRef = useRef<HTMLElement>(null)

  const initialDiscoveries = new Set(
    discoveredIds.filter((id) => !['void', 'spark', 'clay', 'tide'].includes(id)),
  )

  return (
    <section
      ref={boardRef}
      className={`canvas-board${collapsedCount >= 3 ? ' is-skew' : ''}${tutorialStep === 3 ? ' is-altar-pulse' : ''}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        if (fx.inputLocked) return
        const conceptId = e.dataTransfer.getData('text/concept-id')
        if (!conceptId || !boardRef.current) return
        const rect = boardRef.current.getBoundingClientRect()
        spawnFromDrawer(conceptId, e.clientX - rect.left, e.clientY - rect.top)
      }}
    >
      <div className="canvas-board__hint misreg">카드를 끌어 겹치면 조합 · 제단에 놓으면 선포</div>
      <TutorialHint />

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
              alive={alive}
              isDiscovery={initialDiscoveries.has(inst.conceptId)}
              selected={selectedInstanceId === inst.instanceId}
              reject={fx.rejectInstanceId === inst.instanceId}
              locked={fx.inputLocked}
              revealDiscovery={!!inst.revealDiscovery}
              rerecord={inst.rerecord}
            />
          )
        })}
      </AnimatePresence>
    </section>
  )
}
