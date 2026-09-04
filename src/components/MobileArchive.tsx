import { GameGlyph } from './GameGlyph'
import { useGameStore } from '../store/gameStore'
import { VAULT_SINGLE_COST } from '../data/vaultEconomy'
import './MobileArchive.css'

type ArchiveSheet = 'eras' | 'rules' | 'chronicle'

export function MobileArchive({
  onOpenCodex,
  onOpenSheet,
}: {
  onOpenCodex: () => void
  onOpenSheet: (sheet: ArchiveSheet) => void
}) {
  const concepts = useGameStore((s) => s.concepts)
  const discoveredIds = useGameStore((s) => s.discoveredIds)
  const collapsedRules = useGameStore((s) => s.collapsedRules)
  const chronicle = useGameStore((s) => s.chronicle)
  const shards = useGameStore((s) => s.shards)
  const openVault = useGameStore((s) => s.openVault)

  const latestRecord = chronicle.at(-1)?.text
  const nextRecovery = Math.max(0, VAULT_SINGLE_COST - shards)
  const recoveredVaultKeys = new Set(
    concepts.flatMap((concept) => (concept.vaultKey ? [concept.vaultKey] : [])),
  )
  const legacyVaultRecoveries = concepts.filter(
    (concept) => !concept.vaultKey && concept.chronicle?.startsWith('보관소에서 '),
  ).length

  return (
    <section className="mobile-archive-screen" aria-labelledby="mobile-archive-title">
      <header className="mobile-archive__head">
        <div className="mobile-archive__title">
          <span aria-hidden><GameGlyph kind="codex" /></span>
          <div>
            <p>세계의 남은 기록</p>
            <h1 id="mobile-archive-title">기록소</h1>
          </div>
        </div>
        <span className="mobile-archive__era">ARCHIVUM</span>
      </header>

      <div className="mobile-archive__entries">
        <button
          type="button"
          className="mobile-archive__entry mobile-archive__entry--eras"
          onClick={() => onOpenSheet('eras')}
        >
          <span className="mobile-archive__entry-icon" aria-hidden>
            <GameGlyph kind="era" />
          </span>
          <span className="mobile-archive__entry-copy">
            <strong>시대 흐름</strong>
            <span>현재 사건과 선포·마감 조건을 확인합니다.</span>
          </span>
          <em>지도</em>
        </button>

        <button
          type="button"
          className="mobile-archive__entry mobile-archive__entry--codex"
          onClick={onOpenCodex}
        >
          <span className="mobile-archive__entry-icon" aria-hidden>
            <GameGlyph kind="codex" />
          </span>
          <span className="mobile-archive__entry-copy">
            <strong>대장 · CODEX</strong>
            <span>발견한 개념 {discoveredIds.length} · 전체 {concepts.length}</span>
          </span>
          <em>열기</em>
        </button>

        <button
          type="button"
          className="mobile-archive__entry mobile-archive__entry--chronicle"
          onClick={() => onOpenSheet('chronicle')}
        >
          <span className="mobile-archive__entry-icon" aria-hidden>
            <GameGlyph kind="case" />
          </span>
          <span className="mobile-archive__entry-copy">
            <strong>연대기</strong>
            <span>{latestRecord ?? '아직 기록된 사건이 없습니다.'}</span>
          </span>
          <em>{chronicle.length}</em>
        </button>

        <button
          type="button"
          className={`mobile-archive__entry mobile-archive__entry--rules${collapsedRules.length > 0 ? ' is-alert' : ''}`}
          onClick={() => onOpenSheet('rules')}
        >
          <span className="mobile-archive__entry-icon" aria-hidden>
            <GameGlyph kind="pillar" />
          </span>
          <span className="mobile-archive__entry-copy">
            <strong>붕괴 규칙</strong>
            <span>
              {collapsedRules.length > 0
                ? collapsedRules.at(-1)
                : '아직 세계에 개입한 붕괴 규칙이 없습니다.'}
            </span>
          </span>
          <em>{collapsedRules.length}</em>
        </button>

        <button
          type="button"
          className={`mobile-archive__entry mobile-archive__entry--vault${shards >= VAULT_SINGLE_COST ? ' is-ready' : ''}`}
          onClick={openVault}
        >
          <span className="mobile-archive__entry-icon" aria-hidden>
            <GameGlyph kind="vault" />
          </span>
          <span className="mobile-archive__entry-copy">
            <strong>분실물 보관소</strong>
            <span>
              {shards >= VAULT_SINGLE_COST
                ? '회수할 개념이 준비되었습니다.'
                : `회수까지 파편 ${nextRecovery}개가 더 필요합니다.`}
            </span>
            <small>
              회수 도감 {recoveredVaultKeys.size}/40
              {legacyVaultRecoveries > 0 ? ` · 이전 회수 ${legacyVaultRecoveries}건` : ''}
            </small>
            <i aria-label={`파편 ${Math.min(shards, VAULT_SINGLE_COST)} / ${VAULT_SINGLE_COST}`}>
              <b style={{ width: `${Math.min(100, (shards / VAULT_SINGLE_COST) * 100)}%` }} />
            </i>
          </span>
          <em>{Math.min(shards, VAULT_SINGLE_COST)}/{VAULT_SINGLE_COST}</em>
        </button>
      </div>

      <p className="mobile-archive__note">
        기록은 세계가 무너질수록 더 많은 것을 말합니다.
      </p>
    </section>
  )
}
