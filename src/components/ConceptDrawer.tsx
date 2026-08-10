import { useGameStore } from '../store/gameStore'
import './ConceptDrawer.css'

export function ConceptDrawer() {
  const concepts = useGameStore((s) => s.concepts)
  const setHoverConcept = useGameStore((s) => s.setHoverConcept)
  const shards = useGameStore((s) => s.shards)
  const openVault = useGameStore((s) => s.openVault)
  const locked = useGameStore((s) => s.fx.inputLocked)

  return (
    <div className="drawer">
      <div className="drawer__rail">
        {concepts.map((c) => (
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

      <button
        type="button"
        className={`drawer__vault${shards >= 10 ? ' is-ready' : ''}`}
        onClick={openVault}
        title="분실물 보관소"
        aria-label="분실물 보관소"
      >
        <span className="drawer__vault-back" aria-hidden>
          ❐
        </span>
        <span className="drawer__vault-wax" aria-hidden />
        {shards >= 10 && <span className="drawer__pulse" />}
      </button>
    </div>
  )
}
