import { caseDescription, caseProgressLabel } from '../data/caseFiles'
import { useGameStore } from '../store/gameStore'
import './CaseBanner.css'

export function CaseBanner() {
  const eraCase = useGameStore((state) => state.eraCase)

  return (
    <div
      className={`case-banner${eraCase.completed ? ' is-complete' : ''}`}
      aria-live="polite"
    >
      <strong>제{eraCase.era}시대 사건</strong>
      <span>· {caseDescription(eraCase)}</span>
      <span className="case-banner__progress">{caseProgressLabel(eraCase)}</span>
    </div>
  )
}
