import { useMemo, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import './ConceptDrawer.css'

const RING_R = 26
const RING_C = 2 * Math.PI * RING_R

export function ConceptDrawer() {
  const concepts = useGameStore((s) => s.concepts)
  const discoveredIds = useGameStore((s) => s.discoveredIds)
  const setHoverConcept = useGameStore((s) => s.setHoverConcept)
  const shards = useGameStore((s) => s.shards)
  const openVault = useGameStore((s) => s.openVault)
  const openCodex = useGameStore((s) => s.openCodex)
  const locked = useGameStore((s) => s.fx.inputLocked)
  const drawerHighlight = useGameStore((s) => s.fx.drawerHighlight)
  const railRef = useRef<HTMLDivElement>(null)

  const filled = Math.min(shards, 10)
  const progress = filled / 10
  const offset = RING_C * (1 - progress)

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
        <div
          ref={railRef}
          className="drawer__rail"
          onWheel={(e) => {
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
            e.preventDefault()
            e.currentTarget.scrollLeft += e.deltaY
          }}
        >
          {ordered.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`drawer__chip${c.deleted ? ' is-deleted' : ''}`}
              draggable={!c.deleted && !locked}
              disabled={!!c.deleted || locked}
              title={
                c.deleted
                  ? '삭제된 개념 — 조합 불가'
                  : `${c.name} — 캔버스로 드래그`
              }
              onDragStart={(e) => {
                if (c.deleted || locked) {
                  e.preventDefault()
                  return
                }
                e.dataTransfer.setData('text/concept-id', c.id)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onMouseEnter={() => setHoverConcept(c.id)}
              onFocus={() => setHoverConcept(c.id)}
            >
              <span aria-hidden>{c.emoji}</span>
              <span className="drawer__chip-name">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="drawer__codex"
        onClick={openCodex}
        title="전체 대장 보기 (Tab)"
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
