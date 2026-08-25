import { formatDailyDate, getKstDateKey } from '../data/dailyWorld'
import { ENDING_LABELS, ENDING_LINES } from '../data/endings'
import { PILLAR_KO, PILLAR_LATIN } from '../data/initial'
import { COLLAPSE_RULES } from '../data/rules'
import type { ChronicleEntry, EndingKind, PillarKey } from '../types'

export const CHRONICLE_IMAGE_WIDTH = 1080
export const CHRONICLE_IMAGE_HEIGHT = 1920

const BODY_FONT = '"Pretendard Variable", sans-serif'
const LATIN_FONT = '"EB Garamond", "Times New Roman", serif'
const CHRONICLE_FONT = '"Nanum Myeongjo", serif'
const DATA_FONT = '"Nanum Gothic Coding", monospace'

export interface ChronicleImageData {
  ending: Exclude<EndingKind, null>
  discoveries: number
  collapsed: PillarKey[]
  collapsedRules: string[]
  era: number
  highestDestruction: number
  chronicle: ChronicleEntry[]
  daily: null | {
    date: string
    contaminant: string
  }
}

interface Palette {
  form: string
  formLight: string
  rule: string
  ink: string
  inkDim: string
  seal: string
}

function readCssVariable(style: CSSStyleDeclaration, name: string, fallback: string) {
  return style.getPropertyValue(name).trim() || fallback
}

function canvasPalette(decay: number): Palette {
  const rootStyle = getComputedStyle(document.documentElement)
  const probe = document.createElement('div')
  probe.className = `decay-${Math.min(4, Math.max(0, decay))}`
  probe.hidden = true
  document.body.appendChild(probe)
  const decayStyle = getComputedStyle(probe)
  const palette = {
    form: readCssVariable(decayStyle, '--form', '#c9d0cb'),
    formLight: readCssVariable(decayStyle, '--form-light', '#dde2dc'),
    rule: readCssVariable(decayStyle, '--rule', '#96a199'),
    ink: readCssVariable(rootStyle, '--ink', '#1f2621'),
    inkDim: readCssVariable(rootStyle, '--ink-dim', '#5c6660'),
    seal: readCssVariable(rootStyle, '--seal', '#a83228'),
  }
  probe.remove()
  return palette
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  let line = ''

  for (const character of Array.from(text)) {
    const next = line + character
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line.trimEnd())
      line = character.trimStart()
    } else {
      line = next
    }
  }

  if (line) lines.push(line.trimEnd())
  return lines.length ? lines : ['']
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = wrapText(ctx, text, maxWidth)
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight))
  return y + lines.length * lineHeight
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number,
) {
  let cursor = x
  for (const character of Array.from(text)) {
    ctx.fillText(character, cursor, y)
    cursor += ctx.measureText(character).width + letterSpacing
  }
}

function chronicleLines(
  ctx: CanvasRenderingContext2D,
  entries: ChronicleEntry[],
  maxWidth: number,
): string[] {
  return entries.flatMap((entry) => {
    const prefix = `E${entry.era}  `
    const continuation = '     '
    const wrapped = wrapText(ctx, prefix + entry.text, maxWidth)
    return wrapped.map((line, index) =>
      index === 0 ? line : continuation + line,
    )
  })
}

export function compressChronicleLines(lines: string[], maxLines: number): string[] {
  if (maxLines <= 0) return []
  if (lines.length <= maxLines) return lines
  if (maxLines === 1) return ['…']
  const frontCount = Math.ceil((maxLines - 1) / 2)
  const backCount = maxLines - frontCount - 1
  return [...lines.slice(0, frontCount), '…', ...lines.slice(-backCount)]
}

async function waitForCanvasFonts() {
  if (!document.fonts) return
  await Promise.all([
    document.fonts.load(`800 58px ${BODY_FONT}`, '한글'),
    document.fonts.load(`600 26px ${LATIN_FONT}`, 'RES SINE CATEGORIA'),
    document.fonts.load(`700 34px ${CHRONICLE_FONT}`, '연대기'),
    document.fonts.load(`700 22px ${DATA_FONT}`, '통계'),
  ])
  await document.fonts.ready
}

function drawPaper(ctx: CanvasRenderingContext2D, palette: Palette) {
  ctx.fillStyle = palette.form
  ctx.fillRect(0, 0, CHRONICLE_IMAGE_WIDTH, CHRONICLE_IMAGE_HEIGHT)

  ctx.save()
  ctx.globalAlpha = 0.26
  ctx.strokeStyle = palette.rule
  ctx.lineWidth = 1
  for (let y = 322; y < 1840; y += 44) {
    ctx.beginPath()
    ctx.moveTo(70, y + 0.5)
    ctx.lineTo(1010, y + 0.5)
    ctx.stroke()
  }
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = 0.45
  ctx.strokeStyle = palette.seal
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(58, 48)
  ctx.lineTo(58, 1872)
  ctx.stroke()
  ctx.restore()
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  data: ChronicleImageData,
  palette: Palette,
) {
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = palette.ink
  ctx.font = `800 58px ${BODY_FONT}`
  ctx.fillText('UNCATEGORIZED', 82, 112)

  ctx.fillStyle = palette.inkDim
  ctx.font = `600 24px ${LATIN_FONT}`
  drawSpacedText(ctx, 'RES SINE CATEGORIA', 84, 154, 5)

  ctx.save()
  ctx.strokeStyle = palette.seal
  ctx.fillStyle = palette.seal
  ctx.lineWidth = 3
  ctx.strokeRect(818, 64, 180, 92)
  ctx.font = `700 18px ${DATA_FONT}`
  ctx.textAlign = 'center'
  ctx.fillText('FINAL RECORD', 908, 101)
  ctx.font = `800 28px ${CHRONICLE_FONT}`
  ctx.fillText(ENDING_LABELS[data.ending], 908, 137)
  ctx.restore()

  ctx.strokeStyle = palette.seal
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(82, 188)
  ctx.lineTo(998, 188)
  ctx.stroke()

  ctx.fillStyle = palette.seal
  ctx.font = `800 25px ${DATA_FONT}`
  ctx.fillText(`ENDING / ${ENDING_LABELS[data.ending]}`, 82, 240)

  ctx.fillStyle = palette.ink
  ctx.font = `700 34px ${CHRONICLE_FONT}`
  drawWrappedText(ctx, ENDING_LINES[data.ending], 82, 294, 916, 48)
}

function drawStats(
  ctx: CanvasRenderingContext2D,
  data: ChronicleImageData,
  palette: Palette,
) {
  const stats = [
    ['발견', `${data.discoveries}개`],
    ['붕괴', `${data.collapsed.length}개`],
    ['최종 시대', `제${data.era}시대`],
    ['최고 파괴력', data.highestDestruction.toFixed(1)],
  ]
  const width = 916 / stats.length

  ctx.fillStyle = palette.formLight
  ctx.fillRect(82, 404, 916, 112)
  stats.forEach(([label, value], index) => {
    const x = 82 + width * index
    if (index > 0) {
      ctx.strokeStyle = palette.rule
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, 420)
      ctx.lineTo(x, 500)
      ctx.stroke()
    }
    ctx.fillStyle = palette.inkDim
    ctx.font = `700 18px ${DATA_FONT}`
    ctx.fillText(label, x + 22, 446)
    ctx.fillStyle = palette.ink
    ctx.font = `800 28px ${BODY_FONT}`
    ctx.fillText(value, x + 22, 486)
  })

  if (data.daily) {
    ctx.save()
    ctx.strokeStyle = palette.seal
    ctx.fillStyle = palette.seal
    ctx.lineWidth = 2
    ctx.strokeRect(82, 548, 916, 66)
    ctx.font = `700 23px ${CHRONICLE_FONT}`
    ctx.fillText(
      `오늘의 세계 · ${formatDailyDate(data.daily.date)} · 「${data.daily.contaminant}」에 감염`,
      108,
      590,
    )
    ctx.restore()
  }
}

function drawChronicle(
  ctx: CanvasRenderingContext2D,
  data: ChronicleImageData,
  palette: Palette,
) {
  ctx.fillStyle = palette.seal
  ctx.font = `800 25px ${DATA_FONT}`
  ctx.fillText('CHRONICLE / 연대기', 82, 672)

  ctx.fillStyle = palette.ink
  ctx.font = `700 25px ${CHRONICLE_FONT}`
  const lines = compressChronicleLines(
    chronicleLines(ctx, data.chronicle, 916),
    18,
  )
  lines.forEach((line, index) => {
    if (line === '…') {
      ctx.save()
      ctx.fillStyle = palette.seal
      ctx.textAlign = 'center'
      ctx.fillText(line, CHRONICLE_IMAGE_WIDTH / 2, 724 + index * 38)
      ctx.restore()
      return
    }
    ctx.fillText(line, 82, 724 + index * 38)
  })
}

function drawCollapsedRules(
  ctx: CanvasRenderingContext2D,
  data: ChronicleImageData,
  palette: Palette,
) {
  const sectionY = 1444
  ctx.fillStyle = palette.seal
  ctx.font = `800 25px ${DATA_FONT}`
  ctx.fillText('RETURNED PILLARS / 무너진 기둥과 규칙', 82, sectionY)

  if (!data.collapsed.length) {
    ctx.fillStyle = palette.inkDim
    ctx.font = `700 24px ${CHRONICLE_FONT}`
    ctx.fillText('반납된 기둥 없음', 82, sectionY + 58)
    return
  }

  let y = sectionY + 54
  data.collapsed.forEach((pillar, index) => {
    const rule = data.collapsedRules[index] ?? COLLAPSE_RULES[pillar]
    ctx.fillStyle = palette.seal
    ctx.font = `700 19px ${DATA_FONT}`
    ctx.fillText(`${PILLAR_LATIN[pillar]} · ${PILLAR_KO[pillar]}`, 82, y)

    ctx.fillStyle = palette.ink
    ctx.font = `700 20px ${CHRONICLE_FONT}`
    const lines = wrapText(ctx, rule, 690).slice(0, 2)
    lines.forEach((line, lineIndex) => {
      ctx.fillText(line, 308, y + lineIndex * 29)
    })
    y += Math.max(62, lines.length * 29 + 18)
  })
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  data: ChronicleImageData,
  palette: Palette,
) {
  const date = data.daily?.date ?? getKstDateKey()
  ctx.strokeStyle = palette.rule
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(82, 1842)
  ctx.lineTo(998, 1842)
  ctx.stroke()

  ctx.fillStyle = palette.inkDim
  ctx.font = `700 17px ${DATA_FONT}`
  ctx.fillText(`UNCAT / WORLD ARCHIVE / ${date.replaceAll('-', '.')}`, 82, 1880)
  ctx.textAlign = 'right'
  ctx.fillText('RES SINE CATEGORIA', 998, 1880)
  ctx.textAlign = 'left'
}

export async function renderChronicleImage(
  data: ChronicleImageData,
): Promise<HTMLCanvasElement> {
  await waitForCanvasFonts()
  const canvas = document.createElement('canvas')
  canvas.width = CHRONICLE_IMAGE_WIDTH
  canvas.height = CHRONICLE_IMAGE_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('이미지 렌더링을 시작할 수 없습니다.')

  const palette = canvasPalette(data.collapsed.length)
  drawPaper(ctx, palette)
  drawHeader(ctx, data, palette)
  drawStats(ctx, data, palette)
  drawChronicle(ctx, data, palette)
  drawCollapsedRules(ctx, data, palette)
  drawFooter(ctx, data, palette)
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('PNG 파일을 만들지 못했습니다.'))
    }, 'image/png')
  })
}

export async function downloadChronicleImage(data: ChronicleImageData) {
  const canvas = await renderChronicleImage(data)
  const blob = await canvasToBlob(canvas)
  const date = (data.daily?.date ?? getKstDateKey()).replaceAll('-', '')
  const filename = `uncategorized-${date}-${ENDING_LABELS[data.ending]}.png`
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.hidden = true
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
