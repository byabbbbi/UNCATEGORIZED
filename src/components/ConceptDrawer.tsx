import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import type { Concept } from '../types'
import './ConceptDrawer.css'

const RING_R = 26
const RING_C = 2 * Math.PI * RING_R

function isMobileViewport() {
  return window.matchMedia('(max-width: 767px)').matches
}

function DrawerChip({
  concept,
  locked,
  onMobileTap,
}: {
  concept: Concept
  locked: boolean
  onMobileTap?: (conceptId: string) => void
}) {
  const setHoverConcept = useGameStore((s) => s.setHoverConcept)
  const spawnFromDrawer = useGameStore((s) => s.spawnFromDrawer)
  const pointer = useRef<{
    id: number
    startX: number
    startY: number
    dragging: boolean
    scrolling: boolean
  } | null>(null)
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(
    null,
  )

  const clearDrag = () => {
    pointer.current = null
    setDragPoint(null)
  }

  return (
    <button
      type="button"
      className={`drawer__chip${concept.deleted ? ' is-deleted' : ''}`}
      disabled={concept.deleted || locked}
      title={
        concept.deleted
          ? '삭제된 개념 — 조합 불가'
          : `${concept.name} — 캔버스로 드래그`
      }
      onPointerDown={(event) => {
        if (concept.deleted || locked) return
        setHoverConcept(concept.id)
        pointer.current = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          dragging: false,
          scrolling: false,
        }
        if (!isMobileViewport()) event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        const active = pointer.current
        if (!active || active.id !== event.pointerId) return
        const dx = event.clientX - active.startX
        const dy = event.clientY - active.startY
        const moved = Math.hypot(dx, dy)
        const mobile = isMobileViewport()
        if (!active.dragging && !active.scrolling) {
          if (moved < 8) return
          if (mobile && Math.abs(dx) >= Math.abs(dy)) {
            active.scrolling = true
            return
          }
          active.dragging = true
          event.currentTarget.setPointerCapture(event.pointerId)
        }
        if (active.scrolling) return
        setDragPoint({ x: event.clientX, y: event.clientY })
      }}
      onPointerUp={(event) => {
        const active = pointer.current
        if (!active || active.id !== event.pointerId) return
        const distance = Math.hypot(
          event.clientX - active.startX,
          event.clientY - active.startY,
        )
        if (isMobileViewport() && !active.dragging && !active.scrolling && distance < 8) {
          onMobileTap?.(concept.id)
          clearDrag()
          return
        }
        if (active.dragging) {
          const board = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLElement>('.canvas-board')
          if (board) {
            const rect = board.getBoundingClientRect()
            spawnFromDrawer(
              concept.id,
              event.clientX - rect.left,
              event.clientY - rect.top,
            )
          }
        }
        clearDrag()
      }}
      onPointerCancel={clearDrag}
      onMouseEnter={() => setHoverConcept(concept.id)}
      onFocus={() => setHoverConcept(concept.id)}
    >
      <span aria-hidden>{concept.emoji}</span>
      <span className="drawer__chip-name">{concept.name}</span>
      {dragPoint && (
        <span
          className="drawer__drag-ghost"
          style={{ left: dragPoint.x + 12, top: dragPoint.y - 76 }}
          aria-hidden
        >
          <b>{concept.emoji}</b>
          <em>{concept.name}</em>
        </span>
      )}
    </button>
  )
}

export function ConceptDrawer() {
  const concepts = useGameStore((s) => s.concepts)
  const discoveredIds = useGameStore((s) => s.discoveredIds)
  const shards = useGameStore((s) => s.shards)
  const openVault = useGameStore((s) => s.openVault)
  const openCodex = useGameStore((s) => s.openCodex)
  const locked = useGameStore((s) => s.fx.inputLocked)
  const drawerHighlight = useGameStore((s) => s.fx.drawerHighlight)
  const queueMobileComboConcept = useGameStore((s) => s.queueMobileComboConcept)
  const railRef = useRef<HTMLDivElement>(null)

  const filled = Math.min(shards, 10)
  const progress = filled / 10
  const offset = RING_C * (1 - progress)

  useEffect(() => {
    const el = railRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const ordered = useMemo(() => {
    const byId = new Map(concepts.map((c) => [c.id, c]))
    const recent = [...discoveredIds]
      .reverse()
      .map((id) => byId.get(id))
      .filter((c): c is NonNullable<typeof c> => !!c)
    const seen = new Set(recent.map((c) => c.id))
    for (const c of concepts) {
      if (!seen.has(c.id)) recent.push(c)
    }
    return recent
  }, [concepts, discoveredIds])

  return (
    <div className={`drawer${drawerHighlight ? ' is-drop-target' : ''}`}>
      <div className="drawer__rail-wrap">
        <div ref={railRef} className="drawer__rail">
          {ordered.map((concept) => (
            <DrawerChip
              key={concept.id}
              concept={concept}
              locked={locked}
              onMobileTap={queueMobileComboConcept}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        className="drawer__codex"
        onClick={openCodex}
        title="전체 대장 보기"
      >
        전체 {concepts.length}
      </button>

      <button
        type="button"
        className={`drawer__vault${shards >= 10 ? ' is-ready' : ''}`}
        onClick={openVault}
        title={`분실물 보관소 (${filled}/10)`}
        aria-label={`분실물 보관소 파편 ${filled} / 10`}
      >
        <svg className="drawer__vault-ring" viewBox="0 0 64 64" aria-hidden>
          <circle
            className="drawer__vault-ring-track"
            cx="32"
            cy="32"
            r={RING_R}
            fill="none"
          />
          <circle
            className="drawer__vault-ring-fill"
            cx="32"
            cy="32"
            r={RING_R}
            fill="none"
            strokeDasharray={RING_C}
            strokeDashoffset={offset}
            transform="rotate(-90 32 32)"
          />
        </svg>
        <span className="drawer__vault-back" aria-hidden>
          ❐
        </span>
        <span className="drawer__vault-wax" aria-hidden />
        <span className="drawer__vault-count" aria-hidden>
          {filled}/10
        </span>
        {shards >= 10 && <span className="drawer__pulse" />}
      </button>
    </div>
  )
}
