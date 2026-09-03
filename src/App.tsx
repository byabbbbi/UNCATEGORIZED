import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CanvasBoard } from './components/CanvasBoard'
import { MobileComboTray } from './components/MobileComboTray'
import type { MobileOnboardingStep } from './components/MobileOnboarding'
import { ConceptDrawer } from './components/ConceptDrawer'
import { StatStrip } from './components/StatStrip'
import { CaseBanner } from './components/CaseBanner'
import { TitleScreen } from './components/TitleScreen'
import { ShardFlights } from './components/ShardFlights'
import { DebugBadge } from './components/DebugBadge'
import { AnimatedNumber } from './components/AnimatedNumber'
import { GameGlyph } from './components/GameGlyph'
import { useGameStore } from './store/gameStore'
import { flushSave } from './persist/runSave'
import { unlockAudio } from './sfx'
import {
  hapticsEnabled,
  setHapticsEnabled,
  supportsHaptics,
} from './mobileFeedback'
import { MAX_ERA, MAX_PROCLAMATIONS_PER_ERA } from './data/initial'
import './App.css'
import './styles/mobileFeedback.css'
import './styles/mobileGame.css'

const MobileAltar = lazy(() =>
  import('./components/MobileAltar').then(({ MobileAltar }) => ({ default: MobileAltar })),
)
const MobileArchive = lazy(() =>
  import('./components/MobileArchive').then(({ MobileArchive }) => ({ default: MobileArchive })),
)
const MobileEraMap = lazy(() =>
  import('./components/MobileEraMap').then(({ MobileEraMap }) => ({ default: MobileEraMap })),
)
const MobileOnboarding = lazy(() =>
  import('./components/MobileOnboarding').then(({ MobileOnboarding }) => ({ default: MobileOnboarding })),
)
const SidePanel = lazy(() =>
  import('./components/SidePanel').then(({ SidePanel }) => ({ default: SidePanel })),
)
const VaultModal = lazy(() =>
  import('./components/VaultModal').then(({ VaultModal }) => ({ default: VaultModal })),
)
const CodexModal = lazy(() =>
  import('./components/CodexModal').then(({ CodexModal }) => ({ default: CodexModal })),
)
const EndingScreen = lazy(() =>
  import('./components/EndingScreen').then(({ EndingScreen }) => ({ default: EndingScreen })),
)

type MobileSheet = 'eras' | 'rules' | 'chronicle'
type MobileView = 'workshop' | 'altar' | 'archive'
const MOBILE_ONBOARDING_KEY = 'uncat-mobile-onboarding-v1'

function initialMobileOnboarding(): MobileOnboardingStep {
  try {
    const saved = localStorage.getItem(MOBILE_ONBOARDING_KEY)
    return saved === 'done' ? 'done' : 'combo'
  } catch {
    return 'combo'
  }
}

function applyDecay(count: number) {
  const root = document.documentElement
  const body = document.body
  root.style.setProperty('--decay', String(count))
  for (let i = 1; i <= 4; i++) {
    body.classList.toggle(`decay-${i}`, count === i)
    root.classList.toggle(`decay-${i}`, count === i)
  }
  if (count > 4) {
    body.classList.add('decay-4')
    root.classList.add('decay-4')
  }
}

export default function App() {
  const screen = useGameStore((s) => s.screen)
  const coherence = useGameStore((s) => s.coherence)
  const era = useGameStore((s) => s.era)
  const shards = useGameStore((s) => s.shards)
  const discoveredIds = useGameStore((s) => s.discoveredIds)
  const proclamationsThisEra = useGameStore((s) => s.proclamationsThisEra)
  const eraCase = useGameStore((s) => s.eraCase)
  const message = useGameStore((s) => s.message)
  const mobileComboToast = useGameStore((s) => s.mobileComboToast)
  const gameMode = useGameStore((s) => s.gameMode)
  const stats = useGameStore((s) => s.stats)
  const muted = useGameStore((s) => s.muted)
  const collapsed = useGameStore((s) => s.collapsed)
  const fx = useGameStore((s) => s.fx)
  const codexOpen = useGameStore((s) => s.codexOpen)
  const toggleMute = useGameStore((s) => s.toggleMute)
  const returnToTitle = useGameStore((s) => s.returnToTitle)
  const reset = useGameStore((s) => s.reset)
  const openCodex = useGameStore((s) => s.openCodex)
  const closeCodex = useGameStore((s) => s.closeCodex)
  const endEra = useGameStore((s) => s.endEra)
  const tidyCanvas = useGameStore((s) => s.tidyCanvas)
  const queueMobileComboInstance = useGameStore((s) => s.queueMobileComboInstance)
  const clearMobileComboSlots = useGameStore((s) => s.clearMobileComboSlots)
  const selectedInstanceId = useGameStore((s) => s.selectedInstanceId)
  const duplicateInstance = useGameStore((s) => s.duplicateInstance)
  const [confirmation, setConfirmation] = useState<'title' | 'reset' | 'endEra' | null>(
    null,
  )
  const [mobileSheet, setMobileSheet] = useState<MobileSheet | null>(null)
  const [mobileView, setMobileView] = useState<MobileView>('workshop')
  const [mobilePrecedentOpen, setMobilePrecedentOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileCodexOrigin, setMobileCodexOrigin] = useState<MobileView | null>(null)
  const [hapticsOn, setHapticsOn] = useState(() => hapticsEnabled())
  const hapticsAvailable = supportsHaptics()
  const [mobileOnboarding, setMobileOnboarding] = useState<MobileOnboardingStep>(
    initialMobileOnboarding,
  )
  const [desktopMode, setDesktopMode] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 768px)').matches,
  )
  const mobileHistoryIgnorePop = useRef(false)

  const discoveryCount = discoveredIds.length
  const remainingDeclares = Math.max(
    0,
    MAX_PROCLAMATIONS_PER_ERA - proclamationsThisEra,
  )
  const noCollapseWillComplete =
    eraCase.id === 'noCollapse' &&
    collapsed.length === eraCase.collapsedAtStart
  const eraCaseWillReward = eraCase.completed || noCollapseWillComplete

  const isMobile = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 767px)').matches
  const pushMobileHistory = (kind: string, view = mobileView) => {
    if (!isMobile()) return
    window.history.pushState(
      {
        ...(window.history.state ?? {}),
        uncatMobile: { kind, view },
      },
      '',
    )
  }
  const discardMobileHistory = () => {
    if (!isMobile() || !window.history.state?.uncatMobile) return
    mobileHistoryIgnorePop.current = true
    window.history.back()
  }
  const openMobileMenu = () => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false)
      discardMobileHistory()
      return
    }
    pushMobileHistory('menu')
    setMobileMenuOpen(true)
  }
  const openMobileSheet = (sheet: MobileSheet) => {
    if (!mobileMenuOpen) pushMobileHistory('sheet')
    setMobileMenuOpen(false)
    setMobileSheet(sheet)
  }
  const closeMobileSheet = () => {
    setMobileSheet(null)
    discardMobileHistory()
  }
  const openMobilePrecedent = () => {
    pushMobileHistory('precedent')
    setMobilePrecedentOpen(true)
  }
  const closeMobilePrecedent = () => {
    setMobilePrecedentOpen(false)
    discardMobileHistory()
  }
  const openMobileCodex = () => {
    pushMobileHistory('codex', mobileView)
    setMobileCodexOrigin(mobileView)
    if (mobileView === 'archive') setMobileView('workshop')
    openCodex()
  }
  const closeMobileCodex = () => {
    closeCodex()
    if (mobileCodexOrigin === 'archive') setMobileView('archive')
    setMobileCodexOrigin(null)
    discardMobileHistory()
  }
  const finishMobileCodexSpawn = () => {
    closeCodex()
    setMobileCodexOrigin(null)
    setMobileView('workshop')
    discardMobileHistory()
  }
  const openMobileAltar = () => {
    pushMobileHistory('altar', 'altar')
    clearMobileComboSlots()
    setMobileView('altar')
  }
  const openMobileArchive = () => {
    pushMobileHistory('archive', 'archive')
    setMobileView('archive')
  }
  const returnToWorkshop = () => {
    if (mobileView !== 'workshop') discardMobileHistory()
    setMobileView('workshop')
  }
  const requestEndEra = () => {
    if (proclamationsThisEra <= 0 || fx.inputLocked) return
    if (!eraCaseWillReward) {
      if (isMobile() && !mobileMenuOpen) pushMobileHistory('confirmation')
      setConfirmation('endEra')
      return
    }
    endEra()
  }
  const closeConfirmation = () => {
    setConfirmation(null)
    discardMobileHistory()
  }
  const setMobileOnboardingStep = (step: MobileOnboardingStep) => {
    setMobileOnboarding(step)
    if (step !== 'done') return
    try {
      localStorage.setItem(MOBILE_ONBOARDING_KEY, 'done')
    } catch {
      /* 첫 판 안내는 저장에 실패해도 현재 세션에서만 마친다. */
    }
  }

  useEffect(() => {
    applyDecay(collapsed.length)
  }, [collapsed.length])

  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  useEffect(() => {
    if (screen !== 'play') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (window.matchMedia('(max-width: 767px)').matches) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      if (codexOpen) closeCodex()
      else openCodex()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, codexOpen, openCodex, closeCodex])

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)')
    const closeMobileOverlays = () => {
      setDesktopMode(query.matches)
      if (query.matches) {
        setMobileSheet(null)
        setMobileView('workshop')
        setMobilePrecedentOpen(false)
        setMobileMenuOpen(false)
        setMobileCodexOrigin(null)
      }
    }
    closeMobileOverlays()
    query.addEventListener('change', closeMobileOverlays)
    return () => query.removeEventListener('change', closeMobileOverlays)
  }, [])

  useEffect(() => {
    const saveNow = () => flushSave(useGameStore.getState())
    const onVisibilityChange = () => {
      if (document.hidden) saveNow()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', saveNow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', saveNow)
    }
  }, [])

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      if (!isMobile()) return
      if (mobileHistoryIgnorePop.current) {
        mobileHistoryIgnorePop.current = false
        return
      }
      const hasMobileLayer =
        !!mobileSheet ||
        mobileMenuOpen ||
        mobilePrecedentOpen ||
        codexOpen ||
        !!confirmation ||
        mobileView !== 'workshop'
      if (!hasMobileLayer) return
      const restoreView = event.state?.uncatMobile?.view
      setMobileSheet(null)
      setMobileMenuOpen(false)
      setMobilePrecedentOpen(false)
      setConfirmation(null)
      if (codexOpen) closeCodex()
      setMobileCodexOrigin(null)
      setMobileView(
        restoreView === 'altar' || restoreView === 'archive'
          ? restoreView
          : 'workshop',
      )
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [mobileSheet, mobileMenuOpen, mobilePrecedentOpen, codexOpen, confirmation, mobileView, closeCodex])

  useEffect(() => {
    if (!isMobile() || gameMode === 'demo' || mobileOnboarding !== 'combo') return
    if (mobileComboToast) setMobileOnboardingStep('altar')
  }, [gameMode, mobileComboToast, mobileOnboarding])

  useEffect(() => {
    if (!isMobile() || gameMode === 'demo' || mobileOnboarding !== 'altar') return
    if (mobileView === 'altar') setMobileOnboardingStep('proclaim')
  }, [gameMode, mobileOnboarding, mobileView])

  useEffect(() => {
    if (!isMobile() || gameMode === 'demo' || mobileOnboarding !== 'proclaim') return
    if (stats.proclamations > 0) setMobileOnboardingStep('done')
  }, [gameMode, mobileOnboarding, stats.proclamations])

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (screen === 'title') {
    return (
      <div onPointerDown={() => unlockAudio()}>
        <TitleScreen />
        <DebugBadge />
      </div>
    )
  }

  return (
    <div
      className={`app mobile-era-${era}${coherence <= 30 ? ' is-coherence-critical' : ''}${collapsed.length > 0 ? ' has-collapsed-pillars' : ''}${fx.sealFlash ? ' is-mobile-impacting' : ''}${fx.unclassifiedFx ? ' is-voiding' : ''}`}
      onPointerDown={() => unlockAudio()}
    >
      {fx.whiteFlash && <div className="flash-white" />}
      <ShardFlights />

      <AnimatePresence>
        {fx.godLine && (
          <motion.div
            className="god-line"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {fx.godLine}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="app__shell"
        animate={
          !reduceMotion && fx.screenShake
            ? { x: [0, -3, 3, -2, 0], y: [0, 1, -1, 0] }
            : { x: 0, y: 0 }
        }
        transition={{ duration: 0.28 }}
      >
        <header className="topbar">
          <div className="topbar__stats">
            <label className="topbar__discover">
              <span>
                <span className="topbar__desktop-label">발견</span>
                <GameGlyph kind="discovery" className="topbar__mobile-glyph" />
              </span>
              <motion.strong
                key={fx.discoverPop}
                className={`topbar__discover-num${fx.discoverPop > 0 ? ' is-pop' : ''}`}
                initial={fx.discoverPop > 0 ? { scale: 1.45, color: 'var(--gold)' } : false}
                animate={{ scale: 1, color: 'var(--ink)' }}
                transition={{ type: 'spring', stiffness: 420, damping: 14 }}
              >
                <AnimatedNumber value={discoveryCount} digits={0} />
              </motion.strong>
            </label>
            <label className="topbar__coherence">
              <span>정합성</span>
              <strong className={coherence <= 30 ? 'is-critical' : ''}>
                <AnimatedNumber value={coherence} digits={1} />
              </strong>
            </label>
            <label>
              <span>
                <span className="topbar__desktop-label">시대</span>
                <GameGlyph kind="era" className="topbar__mobile-glyph" />
              </span>
              <strong>
                {era}/{MAX_ERA}
              </strong>
            </label>
            <label>
              <span>
                <span className="topbar__desktop-label">선포 잔여</span>
                <GameGlyph kind="proclamation" className="topbar__mobile-glyph" />
              </span>
              <strong>
                {remainingDeclares}
              </strong>
            </label>
            <label>
              <span>
                <span className="topbar__desktop-label">파편</span>
                <GameGlyph kind="shard" className="topbar__mobile-glyph" />
              </span>
              <motion.strong
                key={fx.shardPop}
                className="topbar__shard-num"
                animate={
                  fx.shardPop > 0 && !reduceMotion
                    ? { scale: [1, 1.25, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.22 }}
              >
                <AnimatedNumber value={shards} digits={0} />
              </motion.strong>
            </label>
          </div>

          <div className="topbar__actions">
            {message && <p className="topbar__msg" aria-live="polite">{message}</p>}
            <button
              type="button"
              className="topbar__more"
              onClick={openMobileMenu}
              aria-label="게임 메뉴"
              aria-expanded={mobileMenuOpen}
            >
              <GameGlyph kind="menu" />
            </button>
            <button
              type="button"
              className="linkish topbar__desktop-action"
              onClick={toggleMute}
              aria-label={muted ? '소리 켜기' : '음소거'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <button
              type="button"
              className="topbar__reset topbar__desktop-action"
              onClick={() => setConfirmation('title')}
            >
              타이틀
            </button>
            <button
              type="button"
              className="topbar__reset topbar__desktop-action"
              onClick={() => setConfirmation('reset')}
            >
              초기화
            </button>
          </div>
        </header>

        <div className={`app__main is-mobile-${mobileView}`}>
          <div className="playfield">
            <CaseBanner />
            <CanvasBoard
              onMobileCardTap={queueMobileComboInstance}
              onMobileCardLongPress={openMobilePrecedent}
              onEndEra={requestEndEra}
            />
            <div className="mobile-workshop-mark" aria-hidden>
              <span><GameGlyph kind="workshop" /></span>
              <div>
                <strong>제{era}시대 기록 공방</strong>
                <i>OFFICINA RERUM</i>
              </div>
            </div>
            <MobileComboTray />
            <ConceptDrawer onMobileOpenCodex={openMobileCodex} />
            <StatStrip />
          </div>
          {desktopMode ? (
            <Suspense fallback={null}>
              <SidePanel />
            </Suspense>
          ) : mobileView === 'altar' ? (
            <Suspense fallback={null}>
              <MobileAltar />
            </Suspense>
          ) : null}
          {!desktopMode && mobileView === 'archive' && (
            <Suspense fallback={null}>
              <MobileArchive
                onOpenCodex={openMobileCodex}
                onOpenSheet={openMobileSheet}
              />
            </Suspense>
          )}
          {remainingDeclares === 0 && (
            <button
              type="button"
              className="mobile-era-cta"
              onClick={requestEndEra}
              disabled={fx.inputLocked}
            >
              <GameGlyph kind="era" />
              <span>
                <strong>시대 마감</strong>
                <small>
                  {eraCaseWillReward
                    ? '세계를 정산하고 다음 시대로'
                    : '사건 미완료 · 파편 3개 포기'}
                </small>
              </span>
            </button>
          )}
          <nav className="mobile-tabbar" aria-label="주요 화면">
            <button
              type="button"
              className={mobileView === 'workshop' ? 'is-active' : ''}
              aria-current={mobileView === 'workshop' ? 'page' : undefined}
              onClick={returnToWorkshop}
            >
              <GameGlyph kind="workshop" />
              <span className="mobile-tabbar__label">공방</span>
            </button>
            <button
              type="button"
              className={`${mobileView === 'altar' ? 'is-active' : ''}${mobileOnboarding === 'altar' ? ' is-onboarding-pulse' : ''}`}
              aria-current={mobileView === 'altar' ? 'page' : undefined}
              onClick={openMobileAltar}
            >
              <GameGlyph kind="altar" />
              <span className="mobile-tabbar__label">제단</span>
              {remainingDeclares > 0 && (
                <b aria-label={`선포 가능 ${remainingDeclares}회`}>{remainingDeclares}</b>
              )}
            </button>
            <button
              type="button"
              className={mobileView === 'archive' ? 'is-active' : ''}
              aria-current={mobileView === 'archive' ? 'page' : undefined}
              onClick={openMobileArchive}
            >
              <GameGlyph kind="codex" />
              <span className="mobile-tabbar__label">기록소</span>
              {shards >= 10 && <b aria-label="보관소 회수 가능">◈</b>}
            </button>
          </nav>
        </div>
      </motion.div>

      <AnimatePresence>
        {mobileSheet && (
          <motion.div
            className="mobile-sheet-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) closeMobileSheet()
            }}
          >
            <motion.section
              className="mobile-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              role="dialog"
              aria-modal="true"
              aria-label={mobileSheet === 'eras' ? '시대 흐름' : mobileSheet === 'rules' ? '생성 규칙' : '연대기'}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <header className="mobile-sheet__head">
                <h2>{mobileSheet === 'eras' ? '시대 흐름' : mobileSheet === 'rules' ? '생성 규칙' : '연대기'}</h2>
                <button
                  type="button"
                  onClick={closeMobileSheet}
                  aria-label="시트 닫기"
                >
                  ✕
                </button>
              </header>
              <Suspense fallback={null}>
                {mobileSheet === 'eras' ? (
                  <MobileEraMap />
                ) : (
                  <SidePanel view={mobileSheet} />
                )}
              </Suspense>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="mobile-menu-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) {
                setMobileMenuOpen(false)
                discardMobileHistory()
              }
            }}
          >
            <motion.div
              className="mobile-menu"
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button type="button" onClick={() => openMobileSheet('rules')}>
                생성 규칙
              </button>
              <button type="button" onClick={() => openMobileSheet('chronicle')}>
                연대기
              </button>
              <button
                type="button"
                disabled={proclamationsThisEra <= 0 || fx.inputLocked}
                onClick={() => {
                  setMobileMenuOpen(false)
                  const willConfirm = !eraCaseWillReward
                  if (!willConfirm) discardMobileHistory()
                  requestEndEra()
                }}
              >
                <span>시대 마감</span>
                {proclamationsThisEra <= 0 && (
                  <small>이 시대에 아직 아무것도 선포하지 않았습니다</small>
                )}
              </button>
              <button type="button" onClick={() => { tidyCanvas(); setMobileMenuOpen(false); discardMobileHistory() }}>
                정리
              </button>
              <button type="button" onClick={() => { setConfirmation('title'); setMobileMenuOpen(false) }}>
                타이틀
              </button>
              <button type="button" onClick={() => { setConfirmation('reset'); setMobileMenuOpen(false) }}>
                초기화
              </button>
              <button type="button" onClick={() => { toggleMute(); setMobileMenuOpen(false); discardMobileHistory() }}>
                {muted ? '소리 켜기' : '음소거'}
              </button>
              <button
                type="button"
                className="mobile-menu__haptics"
                role="switch"
                aria-checked={hapticsOn}
                disabled={!hapticsAvailable}
                onClick={() => {
                  const next = !hapticsOn
                  setHapticsOn(next)
                  setHapticsEnabled(next)
                }}
              >
                진동 <span>{hapticsAvailable ? (hapticsOn ? '켜짐' : '꺼짐') : '미지원'}</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobilePrecedentOpen && (
          <motion.div
            className="mobile-precedent-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) closeMobilePrecedent()
            }}
          >
            <motion.section
              className="mobile-precedent"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              role="dialog"
              aria-label="판례"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <header className="mobile-sheet__head">
                <h2>판례</h2>
                <div className="mobile-precedent__actions">
                  <button
                    type="button"
                    className="mobile-precedent__duplicate"
                    disabled={!selectedInstanceId || fx.inputLocked}
                    onClick={() => {
                      if (selectedInstanceId) duplicateInstance(selectedInstanceId)
                      closeMobilePrecedent()
                    }}
                  >
                    복제
                  </button>
                  <button
                    type="button"
                    onClick={closeMobilePrecedent}
                    aria-label="판례 닫기"
                  >
                    ✕
                  </button>
                </div>
              </header>
              <StatStrip />
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmation && (
          <motion.div
            className="confirm-reset"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeConfirmation()
            }}
          >
            <motion.div
              className="confirm-reset__panel"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              role="dialog"
              aria-label={
                confirmation === 'title'
                  ? '타이틀 이동 확인'
                  : confirmation === 'reset'
                    ? '초기화 확인'
                    : '시대 마감 확인'
              }
            >
              <p>
                {confirmation === 'title'
                  ? '타이틀로 돌아갑니다. 진행 상황은 저장됩니다.'
                  : confirmation === 'reset'
                    ? '이 세계의 모든 기록이 사라집니다. 계속할까요?'
                    : `제${era}시대 사건이 미완료입니다. 파편 3개를 포기합니다.`}
              </p>
              <div className="confirm-reset__actions">
                <button
                  type="button"
                  className="confirm-reset__cancel"
                  onClick={closeConfirmation}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="confirm-reset__ok"
                  onClick={() => {
                    const action = confirmation
                    setConfirmation(null)
                    discardMobileHistory()
                    if (action === 'title') returnToTitle()
                    else if (action === 'reset') reset()
                    else endEra()
                  }}
                >
                  {confirmation === 'title'
                    ? '타이틀'
                    : confirmation === 'reset'
                      ? '초기화'
                      : '마감'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {fx.vaultOpen && (
        <Suspense fallback={null}>
          <VaultModal />
        </Suspense>
      )}
      {codexOpen && (
        <Suspense fallback={null}>
          <CodexModal
            onMobileClose={closeMobileCodex}
            onMobileSpawn={finishMobileCodexSpawn}
          />
        </Suspense>
      )}
      {gameMode !== 'demo' &&
        mobileView !== 'archive' &&
        !(mobileView === 'altar' && mobileOnboarding === 'combo') && (
          <Suspense fallback={null}>
            <MobileOnboarding step={mobileOnboarding} />
          </Suspense>
        )}
      {screen === 'ending' && (
        <Suspense fallback={null}>
          <EndingScreen />
        </Suspense>
      )}
      <DebugBadge />
    </div>
  )
}
