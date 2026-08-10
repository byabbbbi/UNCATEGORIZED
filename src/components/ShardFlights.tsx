import { AnimatePresence, motion } from 'motion/react'
import { useGameStore } from '../store/gameStore'
import './ShardFlights.css'

export function ShardFlights() {
  const flights = useGameStore((s) => s.fx.shardFlights)

  return (
    <div className="shard-flights" aria-hidden>
      <AnimatePresence>
        {flights.map((f) => (
          <motion.span
            key={f.id}
            className="shard-flights__dot"
            initial={{ left: f.fromX, top: f.fromY, opacity: 1, scale: 1 }}
            animate={{ left: f.toX, top: f.toY, opacity: 0.15, scale: 0.55 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 0.8, 0.28, 1] }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
