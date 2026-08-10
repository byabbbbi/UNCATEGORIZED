import { useEffect, useRef } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
} from 'motion/react'
import { IndexCard } from './IndexCard'
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

function CanvasCard({
  instanceId,
  conceptId,
  x,
  y,
  alive,
  isDiscovery,
  selected,
  reject,
  combining,
  mergeTo,
  locked,
}: {
  instanceId: string
  conceptId: string
  x: number
  y: number
  alive: Record<PillarKey, boolean>
  isDiscovery: boolean
  selected: boolean
  reject: boolean
  combining: boolean
  mergeTo: { x: number; y: number } | null
  locked: boolean
}) {
  const concept = useGameStore((s) => s.concepts.find((c) => c.id === conceptId)!)
  const selectInstance = useGameStore((s) => s.selectInstance)
  const setHoverConcept = useGameStore((s) => s.setHoverConcept)
  const handleDrop = useGameStore((s) => s.handleDrop)
  const setInstancePos = useGameStore((s) => s.setInstancePos)
  const boardRef = useRef<HTMLElement | null>(null)

  const mx = useMotionValue(x)
  const my = useMotionValue(y)

  useEffect(() => {
    mx.set(x)
    my.set(y)
  }, [x, y, mx, my])

  useEffect(() => {
    if (mergeTo) {
      mx.set(mergeTo.x)
      my.set(mergeTo.y)
    }
  }, [mergeTo, mx, my])

  if (!concept) return null

  return (
    <motion.div
      className="canvas-card"
      style={{ x: mx, y: my, position: 'absolute', top: 0, left: 0, zIndex: selected ? 20 : 5 }}
      drag={!combining && !locked && !concept.deleted}
      dragMomentum={false}
      dragElastic={0.08}
      whileDrag={{ scale: 1.06, rotate: 1.5, zIndex: 100 }}
      animate={
        combining && mergeTo
          ? { scale: [1, 0.9], opacity: [1, 1, 0] }
          : { scale: 1, opacity: 1, rotate: 0 }
      }
      transition={
        combining
          ? { duration: 0.31, times: [0, 0.55, 1] }
          : { type: 'spring', stiffness: 500, damping: 32 }
      }
      onDragStart={() => sfx.pick()}
      onPointerDown={() => {
        selectInstance(instanceId)
        setHoverConcept(conceptId)
        boardRef.current = document.querySelector('.canvas-board')
      }}
      onHoverStart={() => setHoverConcept(conceptId)}
      onDragEnd={() => {
        const board = boardRef.current ?? document.querySelector('.canvas-board')
        if (!board) return
        const nx = mx.get()
        const ny = my.get()
        const center = { x: nx + CARD_W / 2, y: ny + CARD_H / 2 }
        const altar = {
          x: board.getBoundingClientRect().width / 2,
          y: board.getBoundingClientRect().height - 72,
        }
        setInstancePos(instanceId, nx, ny)
        handleDrop(instanceId, center, altar)
      }}
    >
      <IndexCard
        concept={concept}
        pillarsAlive={alive}
        isDiscovery={isDiscovery}
        selected={selected}
        reject={reject}
      />
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
      className={`canvas-board${collapsedCount >= 3 ? ' is-skew' : ''}`}
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

      <motion.div
        className={`altar${fx.sealFlash ? ' is-stamping' : ''}`}
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
          const combining = fx.combining
          const inCombine =
            combining &&
            (combining.aId === inst.instanceId || combining.bId === inst.instanceId)
          const mergeTo = inCombine
            ? { x: combining.x, y: combining.y }
            : null
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
              combining={!!inCombine}
              mergeTo={mergeTo}
              locked={fx.inputLocked}
            />
          )
        })}
      </AnimatePresence>

      <AnimatePresence>
        {fx.combining?.loading && (
          <CardBackLoader key="loader" x={fx.combining.x} y={fx.combining.y} />
        )}
        {fx.combining && !fx.combining.loading && fx.combining.resultConceptId && (
          <ResultBurst
            key="burst"
            x={fx.combining.x}
            y={fx.combining.y}
            conceptId={fx.combining.resultConceptId}
            isDiscovery={fx.combining.isDiscovery}
            alive={alive}
          />
        )}
      </AnimatePresence>
    </section>
  )
}

function CardBackLoader({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      className="card-back-loader"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, rotateY: 0 }}
      animate={{ opacity: 1, rotateY: 360 }}
      exit={{ opacity: 0 }}
      transition={{
        opacity: { duration: 0.2 },
        rotateY: { duration: 2.4, repeat: Infinity, ease: 'linear' },
      }}
    >
      <span className="card-back-loader__wax" aria-hidden>
        ❐
      </span>
    </motion.div>
  )
}

function ResultBurst({
  x,
  y,
  conceptId,
  isDiscovery,
  alive,
}: {
  x: number
  y: number
  conceptId: string
  isDiscovery: boolean
  alive: Record<PillarKey, boolean>
}) {
  const concept = useGameStore((s) => s.concepts.find((c) => c.id === conceptId))
  if (!concept) return null
  return (
    <motion.div
      className="result-burst"
      style={{ left: x, top: y }}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
    >
      {isDiscovery && <span className="result-burst__ring" />}
      <IndexCard concept={concept} pillarsAlive={alive} isDiscovery={isDiscovery} />
    </motion.div>
  )
}
