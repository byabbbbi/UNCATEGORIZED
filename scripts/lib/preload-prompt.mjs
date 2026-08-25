import { calcT } from './preload-graph.mjs'

function exampleStats(T, chaosPct, plausPct, narrPct) {
  const c = Math.round(T * chaosPct)
  const p = Math.round(T * plausPct)
  const n = Math.round(T * narrPct)
  return { c, p, n, g: T - c - p - n }
}

export function buildPreloadMessages(a, b, T) {
  const ex1 = exampleStats(T, 0.45, 0.37, 0.1)
  const ex2 = exampleStats(T, 0.31, 0.49, 0.12)
  const ex3 = exampleStats(T, 0.35, 0.45, 0.12)

  const system = `당신은 개념 조합 판정기다. 두 개념을 합쳐 새 개념 하나를 만든다.
반드시 JSON 객체 하나만 출력한다. 마크다운, 설명, 인사 금지.

[세계 상태]
무너진 범주의 규칙 — 결과 이름에 반드시 반영하라:
- 없음. 평범하고 자연스러운 결과를 낼 것.

[출력 형식]
{"name":"한국어 2~12자","emoji":"이모지 1개","chaos":0,"plausibility":0,"narrative":0,"contagion":0,"pillar":"substance|quantity|quality|time|relation|place|state|action","contaminant":"명사 1개","chronicle":"등장 기록 한 문장. 건조한 행정 문체."}

[규칙]
- chaos+plausibility+narrative+contagion 합은 정확히 ${T}
- 실존하거나 즉시 이해 가능한 명사를 조합하라. 의미를 알 수 없는 조어·낱말 잇기를 만들지 마라
- 두 입력 이름을 그대로 이어붙이지 마라
- A와 B가 같은 개념이면 심화된 하나의 사물을 만들어라 (점토+점토=벽돌)

[예시]
입력 A: 빵집, B: 숫자
{"name":"베이커리 4395호점","emoji":"🥐","chaos":${ex1.c},"plausibility":${ex1.p},"narrative":${ex1.n},"contagion":${ex1.g},"pillar":"quantity","contaminant":"지점번호","chronicle":"1호점부터 4394호점까지의 위치를 아는 자는 없다."}

입력 A: 점토, B: 점토
{"name":"벽돌","emoji":"🧱","chaos":${ex2.c},"plausibility":${ex2.p},"narrative":${ex2.n},"contagion":${ex2.g},"pillar":"substance","contaminant":"점토","chronicle":"점토가 쌓여 벽돌로 등재되었다."}

입력 A: 조류, B: 불꽃
{"name":"증기","emoji":"💨","chaos":${ex3.c},"plausibility":${ex3.p},"narrative":${ex3.n},"contagion":${ex3.g},"pillar":"quality","contaminant":"열","chronicle":"조류와 불꽃이 만나 증기로 등재되었다."}`

  return [
    { role: 'system', content: system },
    { role: 'user', content: `A: ${a}\nB: ${b}\n총량 T: ${T}` },
  ]
}

export function normalizeEntry(raw, T) {
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
  const keys = ['chaos', 'plausibility', 'narrative', 'contagion']
  let vals = keys.map((k) => clamp(Math.round(Number(raw[k]) || 0), 0, 100))
  const sum = vals.reduce((x, y) => x + y, 0) || 1
  vals = vals.map((v) => Math.round((v * T) / sum))
  vals[vals.indexOf(Math.max(...vals))] += T - vals.reduce((x, y) => x + y, 0)
  return {
    name: String(raw.name || '').slice(0, 20),
    emoji: String(raw.emoji || '❔').slice(0, 4),
    chaos: vals[0],
    plausibility: vals[1],
    narrative: vals[2],
    contagion: vals[3],
    pillar: raw.pillar || 'substance',
    contaminant: String(raw.contaminant || '').split(/\s/)[0].slice(0, 8),
    chronicle: String(raw.chronicle || '기록이 남지 않았다.').slice(0, 90),
  }
}

export { calcT }
