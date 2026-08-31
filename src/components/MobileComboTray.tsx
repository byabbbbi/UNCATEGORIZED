import { motion } from 'motion/react'
import { useGameStore } from '../store/gameStore'
import './MobileComboTray.css'

export function MobileComboTray() {
  const slots = useGameStore((s) => s.mobileComboSlots)
  const preparing = useGameStore((s) => s.mobileComboPreparing)
  const concepts = useGameStore((s) => s.concepts)
  const removeSlot = useGameStore((s) => s.removeMobileComboSlot)

  const occupied = slots.filter(Boolean).length
  const hint = preparing
    ? '조합!'
    : occupied === 1
      ? '한 장 더'
      : '카드를 탭해서 조합'

  return (
    <section
      className={`mobile-combo-tray${preparing ? ' is-preparing' : ''}`}
      aria-label="탭 조합 슬롯"
    >
      <div className="mobile-combo-tray__slots">
        {slots.map((slot, index) => {
          const concept = concepts.find((item) => item.id === slot?.conceptId)
          const order = index + 1
          return (
            <motion.button
              key={slot?.id ?? `empty-${index}`}
              type="button"
              className={`mobile-combo-tray__slot mobile-combo-tray__slot--${index}${slot ? ' is-filled' : ''}`}
              disabled={!slot || preparing}
              onClick={() => removeSlot(index as 0 | 1)}
              aria-label={
                slot && concept
                  ? `${order}번 조합 슬롯: ${concept.name}, 탭하여 빼기`
                  : `${order}번 조합 슬롯 비어 있음`
              }
              initial={slot ? { scale: 0.82, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 480, damping: 25 }}
            >
              {slot && concept ? (
                <>
                  <span className="mobile-combo-tray__order" aria-hidden>
                    {order}
                  </span>
                  <span className="mobile-combo-tray__emoji" aria-hidden>
                    {concept.emoji}
                  </span>
                  <strong>{concept.name}</strong>
                </>
              ) : (
                <>
                  <span className="mobile-combo-tray__order" aria-hidden>
                    {order}
                  </span>
                  <span className="mobile-combo-tray__empty" aria-hidden>
                    ?
                  </span>
                </>
              )}
            </motion.button>
          )
        })}
        <span className="mobile-combo-tray__plus" aria-hidden>
          +
        </span>
      </div>
      <p aria-live="polite">{hint}</p>
    </section>
  )
}
