import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useGameStore } from '../store/gameStore'
import { COLLAPSE_RULES } from '../data/rules'
import { SEAL_GLYPH, SEAL_TITLE, type PillarKey } from '../types'
import { GameGlyph } from './GameGlyph'
import { MobileComboToast } from './MobileComboToast'
import './MobileComboTray.css'

export function MobileComboTray() {
  const slots = useGameStore((s) => s.mobileComboSlots)
  const preparing = useGameStore((s) => s.mobileComboPreparing)
  const concepts = useGameStore((s) => s.concepts)
  const removeSlot = useGameStore((s) => s.removeMobileComboSlot)
  const collapsed = useGameStore((s) => s.collapsed)
  const [openRule, setOpenRule] = useState<PillarKey | null>(null)

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
      <header className="mobile-combo-tray__head">
        <strong>조합대</strong>
        {collapsed.length > 0 && (
          <div className="mobile-combo-tray__rules" aria-label="활성 붕괴 규칙">
            <span className="mobile-combo-tray__rules-label">활성 규칙</span>
            {collapsed.map((pillarKey) => (
              <button
                key={pillarKey}
                type="button"
                className={openRule === pillarKey ? 'is-open' : ''}
                aria-expanded={openRule === pillarKey}
                aria-label={`${SEAL_TITLE[pillarKey]} 규칙 보기`}
                onClick={() => setOpenRule((current) => current === pillarKey ? null : pillarKey)}
              >
                {SEAL_GLYPH[pillarKey]}
              </button>
            ))}
            <AnimatePresence>
              {openRule && (
                <motion.div
                  className="mobile-combo-tray__rule-tooltip"
                  role="tooltip"
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4 }}
                >
                  <strong>{SEAL_TITLE[openRule]}</strong>
                  <p>{COLLAPSE_RULES[openRule]}</p>
                  <button type="button" onClick={() => setOpenRule(null)} aria-label="규칙 설명 닫기">
                    닫기
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </header>
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
                  <GameGlyph
                    kind="concept"
                    concept={concept}
                    className="mobile-combo-tray__glyph"
                  />
                  <strong>{concept.name}</strong>
                </>
              ) : (
                <>
                  <span className="mobile-combo-tray__order" aria-hidden>
                    {order}
                  </span>
                  <GameGlyph kind="combine" className="mobile-combo-tray__empty" />
                </>
              )}
            </motion.button>
          )
        })}
        <GameGlyph kind="combine" className="mobile-combo-tray__plus" />
      </div>
      <p className="mobile-combo-tray__hint" aria-live="polite">{hint}</p>
      <MobileComboToast />
    </section>
  )
}
