import { AnimatePresence, motion } from 'motion/react'
import { useGameStore } from '../store/gameStore'
import './TutorialHint.css'

const COPY: Record<1 | 2 | 3, string> = {
  1: '카드를 다른 카드 위로 끌어 놓으면 합쳐진다',
  2: '합쳐진 것은 다시 재료가 된다. 계속 만들어 보라',
  3: '제단에 올리면 세계에 선포된다',
}

export function TutorialHint() {
  const step = useGameStore((s) => s.tutorialStep)
  const dismissTutorial = useGameStore((s) => s.dismissTutorial)
  const instances = useGameStore((s) => s.instances)

  if (step === 'done' || step === 0) return null

  const ready =
    instances.filter((i) => !i.processing).length >= 2 || step !== 1

  if (!ready && step === 1) return null

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        key={String(step)}
        className="tutorial-hint"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        onClick={dismissTutorial}
      >
        <span className="tutorial-hint__text">{COPY[step]}</span>
        {step === 1 && <span className="tutorial-hint__arrow" aria-hidden>⇢</span>}
      </motion.button>
    </AnimatePresence>
  )
}
