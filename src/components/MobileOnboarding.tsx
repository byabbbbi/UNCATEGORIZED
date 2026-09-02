import { AnimatePresence, motion } from 'motion/react'
import { GameGlyph } from './GameGlyph'
import './MobileOnboarding.css'

export type MobileOnboardingStep = 'combo' | 'altar' | 'proclaim' | 'done'

export function MobileOnboarding({ step }: { step: MobileOnboardingStep }) {
  return (
    <AnimatePresence>
      {step !== 'done' && (
        <motion.div
          key={step}
          className={`mobile-onboarding mobile-onboarding--${step}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-live="polite"
        >
          {step === 'combo' && (
            <>
              <motion.span
                className="mobile-onboarding__demo-card"
                aria-hidden
                animate={{ x: [-72, -26, -26], y: [24, 0, 0], opacity: [0, 1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1.1 }}
              >
                <GameGlyph
                  kind="concept"
                  concept={{ id: 'spark', pillar: 'quality', deleted: false }}
                />
              </motion.span>
              <p><strong>기록관의 속삭임</strong>카드를 탭해서 조합</p>
            </>
          )}
          {step === 'altar' && <p><strong>기록관의 속삭임</strong>만든 것을 제단에서 선포</p>}
          {step === 'proclaim' && <p><strong>기록관의 속삭임</strong>카드 → 기둥 → 인장을 꾹 누르기</p>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
