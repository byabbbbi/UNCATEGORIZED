import type { ReactNode } from 'react'
import type { Concept, PillarKey } from '../types'
import { SEAL_GLYPH } from '../types'
import './GameGlyph.css'

export type GameGlyphKind =
  | 'discovery'
  | 'era'
  | 'proclamation'
  | 'shard'
  | 'menu'
  | 'case'
  | 'workshop'
  | 'altar'
  | 'codex'
  | 'vault'
  | 'combine'
  | 'concept'
  | 'pillar'

interface Props {
  kind: GameGlyphKind
  concept?: Pick<Concept, 'id' | 'pillar' | 'deleted'>
  pillar?: PillarKey
  className?: string
  label?: string
}

const pillarMarks: Record<PillarKey, ReactNode> = {
  substance: <path d="M10 20h12M12 16h8M14 12h4" />,
  quantity: <path d="M10 12h12M12 16h8M14 20h4" />,
  quality: <path d="m10 20 6-10 6 10M13 17h6" />,
  time: <path d="M11 9h10M11 23h10M12 10c0 4 4 4 4 6s-4 2-4 6M20 10c0 4-4 4-4 6s4 2 4 6" />,
  relation: <path d="M10 13c2-3 5-3 7 0l5 6M22 13c-2-3-5-3-7 0l-5 6" />,
  place: <path d="M16 9a5 5 0 0 1 5 5c0 4-5 9-5 9s-5-5-5-9a5 5 0 0 1 5-5Zm0 3.5v3M14.5 14h3" />,
  state: <path d="M10 21V11l6-3 6 3v10l-6 3-6-3Zm6-13v16M10 11l6 3 6-3" />,
  action: <path d="M9 20h10M16 12l4 4-4 4M12 12h-2a2 2 0 0 0-2 2v1" />,
}

function ConceptGlyph({ concept }: Pick<Props, 'concept'>) {
  if (!concept || concept.deleted) {
    return (
      <>
        <rect x="8" y="8" width="16" height="16" rx="2" />
        <path d="m10 10 12 12M22 10 10 22" />
      </>
    )
  }

  if (concept.id === 'void') {
    return (
      <>
        <rect className="game-glyph__fill" x="8" y="8" width="16" height="16" rx="2" />
        <path d="M12 12h8v8h-8z" />
      </>
    )
  }
  if (concept.id === 'spark') {
    return (
      <path d="M17 6c1 6-4 7-4 12a3 3 0 0 0 6 0c0-2-1-3-2-5 4 2 6 5 5 9-1 4-5 6-8 5-5-1-7-6-5-10 2-4 6-6 8-11Z" />
    )
  }
  if (concept.id === 'clay') {
    return (
      <>
        <rect x="6" y="9" width="20" height="14" rx="1" />
        <path d="M6 14h20M6 19h20M13 9v5M20 14v5M11 19v4M22 19v4" />
      </>
    )
  }
  if (concept.id === 'tide') {
    return <path d="M5 13c3 0 3-3 6-3s3 3 6 3 3-3 6-3 3 3 6 3M5 18c3 0 3-3 6-3s3 3 6 3 3-3 6-3 3 3 6 3M7 23h18" />
  }

  return (
    <>
      <circle cx="16" cy="16" r="10" />
      <circle cx="16" cy="16" r="3" />
      {pillarMarks[concept.pillar]}
    </>
  )
}

function GlyphBody({ kind, concept, pillar }: Pick<Props, 'kind' | 'concept' | 'pillar'>) {
  switch (kind) {
    case 'discovery':
      return <><circle cx="14" cy="14" r="7" /><path d="m19 19 7 7M14 9v10M9 14h10" /></>
    case 'era':
      return <><path d="M9 6h14M9 26h14M11 7c0 6 5 6 5 9s-5 3-5 9M21 7c0 6-5 6-5 9s5 3 5 9" /><path className="game-glyph__fill-soft" d="m13 21 3-3 3 3v3h-6z" /></>
    case 'proclamation':
      return <path d="m18 4-8 13h6l-2 11 9-15h-6z" />
    case 'shard':
      return <><path d="m16 5 10 11-10 11L6 16 16 5Z" /><path d="m16 10 5 6-5 6-5-6 5-6Z" /></>
    case 'menu':
      return <><circle className="game-glyph__fill" cx="8" cy="16" r="1.6" /><circle className="game-glyph__fill" cx="16" cy="16" r="1.6" /><circle className="game-glyph__fill" cx="24" cy="16" r="1.6" /></>
    case 'case':
      return <><path d="M8 8h16v18H8zM11 5h10v6H11z" /><path d="M11 15h10M11 19h7M11 23h9" /></>
    case 'workshop':
      return <><path d="M7 24 20 11M17 8l3-3 7 7-3 3-7-7ZM6 17l9 9" /><circle cx="9" cy="20" r="2" /></>
    case 'altar':
      return <><path d="M7 25h18M9 22h14M11 12h10l2 10H9l2-10Z" /><circle cx="16" cy="8" r="3" /><path d="M16 5V2M13 8h-3M22 8h-3" /></>
    case 'codex':
      return <><path d="M5 7h9a4 4 0 0 1 4 4v15H9a4 4 0 0 0-4 2V7ZM27 7h-9v19h9V7Z" /><path d="M9 12h5M9 16h5M21 12h3M21 16h3" /></>
    case 'vault':
      return <><path d="M7 10h18v16H7zM10 6h12v4H10z" /><circle cx="16" cy="18" r="4" /><path d="M16 14v8M12 18h8" /></>
    case 'combine':
      return <><circle cx="11" cy="16" r="6" /><circle cx="21" cy="16" r="6" /><path d="M4 16h24M16 9v14" /></>
    case 'pillar': {
      const key = pillar ?? concept?.pillar ?? 'substance'
      return <><path d="M9 27h14M11 24h10M12 8h8v16h-8zM10 5h12v3H10z" />{pillarMarks[key]}<text x="16" y="21.5" textAnchor="middle">{SEAL_GLYPH[key]}</text></>
    }
    case 'concept':
      return <ConceptGlyph concept={concept} />
  }
}

export function GameGlyph({ kind, concept, pillar, className = '', label }: Props) {
  return (
    <svg
      className={`game-glyph game-glyph--${kind}${className ? ` ${className}` : ''}`}
      viewBox="0 0 32 32"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <GlyphBody kind={kind} concept={concept} pillar={pillar} />
    </svg>
  )
}
