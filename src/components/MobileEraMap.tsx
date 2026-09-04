import { caseDescription, caseProgressLabel, createEraCase } from '../data/caseFiles'
import { MAX_ERA, MAX_PROCLAMATIONS_PER_ERA } from '../data/initial'
import { CASE_SHARD_REWARD } from '../data/vaultEconomy'
import { useGameStore } from '../store/gameStore'
import { GameGlyph } from './GameGlyph'
import './MobileEraMap.css'

export function MobileEraMap() {
  const era = useGameStore((state) => state.era)
  const eraCase = useGameStore((state) => state.eraCase)
  const worldSeed = useGameStore((state) => state.worldSeed)
  const chronicle = useGameStore((state) => state.chronicle)
  const proclamationsThisEra = useGameStore((state) => state.proclamationsThisEra)
  const collapsed = useGameStore((state) => state.collapsed)

  const remaining = Math.max(
    0,
    MAX_PROCLAMATIONS_PER_ERA - proclamationsThisEra,
  )
  const noCollapseReady =
    eraCase.id === 'noCollapse' &&
    proclamationsThisEra > 0 &&
    collapsed.length === eraCase.collapsedAtStart
  const caseReady = eraCase.completed || noCollapseReady
  const eventProgress = caseReady
    ? 100
    : Math.min(100, (eraCase.progress / Math.max(1, eraCase.target)) * 100)
  const rewardedEras = new Set(
    chronicle
      .filter((record) => record.text === `제${record.era}시대 사건이 종결되었다.`)
      .map((record) => record.era),
  )

  let nextTitle = '첫 선포가 필요합니다'
  let nextDetail = '공방에서 개념을 만든 뒤 제단에서 카드와 기둥을 선택하세요.'
  if (proclamationsThisEra > 0 && remaining > 0 && caseReady) {
    nextTitle = '사건 조건을 달성했습니다'
    nextDetail = `선포 ${remaining}회를 더 쓰거나, 메뉴에서 지금 시대를 마감할 수 있습니다.`
  } else if (proclamationsThisEra > 0 && remaining > 0) {
    nextTitle = `선포 ${remaining}회가 남았습니다`
    nextDetail = '사건 조건을 노리며 다음 선포 대상을 고르세요.'
  } else if (remaining === 0 && caseReady) {
    nextTitle = '시대 마감 준비 완료'
    nextDetail = era < MAX_ERA
      ? `사건 보상 파편 ${CASE_SHARD_REWARD}개와 정합성 8을 받고 다음 시대로 이동합니다.`
      : `사건 보상 파편 ${CASE_SHARD_REWARD}개를 받은 뒤 세계의 엔딩을 판정합니다.`
  } else if (remaining === 0) {
    nextTitle = '선포를 모두 사용했습니다'
    nextDetail = `사건은 미완료입니다. 마감하면 보상 파편 ${CASE_SHARD_REWARD}개를 포기합니다.`
  }

  return (
    <div className="mobile-era-map">
      <section className="mobile-era-map__journey" aria-labelledby="era-journey-title">
        <header>
          <div>
            <span>세계 진행</span>
            <h3 id="era-journey-title">여섯 시대의 기록</h3>
          </div>
          <strong>{era}/{MAX_ERA}</strong>
        </header>
        <ol aria-label={`현재 제${era}시대`}>
          {Array.from({ length: MAX_ERA }, (_, index) => index + 1).map((number) => {
            const state = number < era ? 'past' : number === era ? 'current' : 'future'
            return (
              <li
                key={number}
                className={`is-${state}`}
                aria-current={number === era ? 'step' : undefined}
              >
                <span>{number}</span>
                <em>{state === 'past' ? '종결' : state === 'current' ? '현재' : '봉인'}</em>
              </li>
            )
          })}
        </ol>
      </section>

      <section className={`mobile-era-map__case${caseReady ? ' is-ready' : ''}`}>
        <header>
          <span><GameGlyph kind="case" /> 제{era}시대 사건</span>
          <em>{caseReady ? '조건 달성' : caseProgressLabel(eraCase)}</em>
        </header>
        <strong>{caseDescription(eraCase)}</strong>
        <div className="mobile-era-map__case-track" aria-label={`사건 진행 ${Math.round(eventProgress)}%`}>
          <i style={{ width: `${eventProgress}%` }} />
        </div>
        <p><GameGlyph kind="shard" /> 종결 보상 <b>파편 {CASE_SHARD_REWARD}개</b></p>
      </section>

      <section className="mobile-era-map__proclamations" aria-labelledby="era-proclamation-title">
        <header>
          <h3 id="era-proclamation-title">이번 시대의 선포</h3>
          <span>{proclamationsThisEra}/{MAX_PROCLAMATIONS_PER_ERA}</span>
        </header>
        <ol aria-label={`선포 ${proclamationsThisEra}회 사용`}>
          {Array.from({ length: MAX_PROCLAMATIONS_PER_ERA }, (_, index) => (
            <li key={index} className={index < proclamationsThisEra ? 'is-used' : ''}>
              <GameGlyph kind="proclamation" />
              <span>{index < proclamationsThisEra ? `${index + 1}번째 선포 완료` : `${index + 1}번째 선포`}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={`mobile-era-map__next${remaining === 0 ? ' is-urgent' : ''}`}>
        <GameGlyph kind={remaining === 0 ? 'era' : 'altar'} />
        <div>
          <span>다음 행동</span>
          <strong>{nextTitle}</strong>
          <p>{nextDetail}</p>
        </div>
      </section>

      {era > 1 && (
        <details className="mobile-era-map__past">
          <summary>종결된 시대 기록 {era - 1}건</summary>
          <ol>
            {Array.from({ length: era - 1 }, (_, index) => index + 1)
              .reverse()
              .map((number) => {
                const pastCase = createEraCase(worldSeed, number, 0)
                const rewarded = rewardedEras.has(number)
                return (
                  <li key={number}>
                    <span>제{number}시대</span>
                    <strong>{caseDescription(pastCase)}</strong>
                    <em className={rewarded ? 'is-rewarded' : ''}>
                      {rewarded ? `사건 종결 · 파편 +${CASE_SHARD_REWARD}` : '보상 없이 종결'}
                    </em>
                  </li>
                )
              })}
          </ol>
        </details>
      )}
    </div>
  )
}
