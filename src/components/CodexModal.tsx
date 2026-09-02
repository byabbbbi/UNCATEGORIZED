import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { IndexCard } from './IndexCard'
import { useGameStore } from '../store/gameStore'
import type { Concept } from '../types'
import { pillarStabilityMap } from '../utils/pillars'
import './CodexModal.css'

type SortMode = 'recent' | 'name' | 'depth'

const INITIAL_IDS = new Set(['void', 'spark', 'clay', 'tide'])

export function CodexModal({
  onMobileClose,
  onMobileSpawn,
}: {
  onMobileClose?: () => void
  onMobileSpawn?: () => void
}) {
  const open = useGameStore((s) => s.codexOpen)
  const closeCodex = useGameStore((s) => s.closeCodex)
  const concepts = useGameStore((s) => s.concepts)
  const discoveredIds = useGameStore((s) => s.discoveredIds)
  const pillars = useGameStore((s) => s.pillars)
  const spawnFromDrawer = useGameStore((s) => s.spawnFromDrawer)
  const locked = useGameStore((s) => s.fx.inputLocked)

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('recent')
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pillarStability = pillarStabilityMap(pillars)
  const mobile =
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 767px)').matches
  const requestClose = () => {
    if (mobile) onMobileClose?.()
    else closeCodex()
  }

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSort('recent')
    const t = window.setTimeout(() => inputRef.current?.focus(), 40)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        requestClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeCodex, onMobileClose, mobile])

  useEffect(() => {
    if (!open || !mobile) return
    const visualViewport = window.visualViewport
    const updateHeight = () =>
      setViewportHeight(visualViewport?.height ?? window.innerHeight)
    updateHeight()
    visualViewport?.addEventListener('resize', updateHeight)
    visualViewport?.addEventListener('scroll', updateHeight)
    return () => {
      visualViewport?.removeEventListener('resize', updateHeight)
      visualViewport?.removeEventListener('scroll', updateHeight)
    }
  }, [open, mobile])

  const recentIndex = useMemo(() => {
    const map = new Map<string, number>()
    discoveredIds.forEach((id, i) => map.set(id, i))
    return map
  }, [discoveredIds])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    let items = concepts.filter((c) =>
      q ? c.name.toLowerCase().includes(q) : true,
    )
    if (sort === 'name') {
      items = [...items].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    } else if (sort === 'depth') {
      items = [...items].sort((a, b) => b.depth - a.depth || a.name.localeCompare(b.name, 'ko'))
    } else {
      items = [...items].sort(
        (a, b) => (recentIndex.get(b.id) ?? 0) - (recentIndex.get(a.id) ?? 0),
      )
    }
    return items
  }, [concepts, query, sort, recentIndex])

  const spawn = (c: Concept) => {
    if (c.deleted || locked) return
    const board = document.querySelector('.canvas-board')
    if (!board) return
    const rect = board.getBoundingClientRect()
    spawnFromDrawer(c.id, rect.width / 2, rect.height / 2)
    if (mobile) onMobileSpawn?.()
    else closeCodex()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="codex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) requestClose()
          }}
        >
          <motion.div
            className="codex__panel"
            style={
              viewportHeight
                ? { ['--mobile-viewport-height' as string]: `${viewportHeight}px` }
                : undefined
            }
            initial={{ y: mobile ? '100%' : 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: mobile ? '100%' : 12, opacity: 0 }}
            role="dialog"
            aria-label="대장 · CODEX"
          >
            <header className="codex__head">
              <div>
                <h2>대장 · CODEX</h2>
                <span className="codex__count">{concepts.length}개</span>
              </div>
              <button type="button" className="vault__close" onClick={requestClose}>
                ✕
              </button>
            </header>

            <div className="codex__tools">
              <input
                ref={inputRef}
                className="codex__search"
                type="search"
                placeholder="검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <label className="codex__sort">
                <span className="visually-hidden">정렬</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortMode)}
                >
                  <option value="recent">최근</option>
                  <option value="name">이름</option>
                  <option value="depth">깊이</option>
                </select>
              </label>
            </div>

            <div className="codex__grid">
              {list.map((c) => {
                const first = !INITIAL_IDS.has(c.id) && !c.deleted
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`codex__cell${c.deleted ? ' is-deleted' : ''}${first ? ' is-first' : ''}`}
                    disabled={!!c.deleted || locked}
                    onClick={() => spawn(c)}
                    title={c.deleted ? '검열된 개념' : `${c.name} — 캔버스에 놓기`}
                  >
                    <IndexCard
                      concept={c}
                      pillarStability={pillarStability}
                      isDiscovery={first}
                      dimmed={!!c.deleted}
                    />
                  </button>
                )
              })}
              {list.length === 0 && (
                <p className="codex__empty">일치하는 개념이 없다.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
