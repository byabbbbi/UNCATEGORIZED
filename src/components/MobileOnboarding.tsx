import { AnimatePresence, motion } from 'motion/react'
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
                🌱
              </motion.span>
              <p>카드를 탭해서 조합</p>
            </>
          )}
          {step === 'altar' && <p>만든 것을 제단에서 선포</p>}
          {step === 'proclaim' && <p>카드 → 기둥 → 꾹 눌러 선포</p>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
