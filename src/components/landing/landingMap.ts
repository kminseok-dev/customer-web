// 통화 기호 지도(캔버스) — 원본 landing-journey.html "currency map (canvas)" 구역의 함수들을 같은 이름·순서로 옮김.
// 캔버스 색은 하드코딩하지 않고 build() 때 CSS 변수에서 읽는다(readColors).
import { geoInterpolate, geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { clamp } from './landingCalc'
import { CODE_SYM, DOLLAR, ISO2CUR, MAJOR, MAPFONT, MH, MW, NAME2CUR, ORIG_PT, SEOUL } from './landingMapData'

type Pt = [number, number]
interface Fi { sym: string; tier: number }
interface Route { pts: Pt[]; cum: number[]; len: number }
interface Grid { X: number[]; Y: number[]; S: string[]; AL: number[]; T: number[]; D: number[]; KO: number[]; n: number }
type Sprite = HTMLCanvasElement & { w: number }
export interface MapState {
  ready: boolean
  cls: Uint16Array | null
  land: Path2D | null
  fi: Fi[]
  g: Grid
  dense: Array<{ x: number; y: number; th: number }>
  routes: Record<string, Route>
  seoul: Pt
  krB: [Pt, Pt] | null
  KD: number
  /** public/assets/world-map.svg의 대륙 면(같은 투영) */
  landSvg: Path2D | null
}

const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, -1], [1, -1], [-1, 1], [3, 0], [-3, 0], [0, 3], [0, -3]]

// CSS 색 → rgb 숫자(지도 안내판의 반투명 배경에 알파를 붙이기 위해)
function rgbParts(v: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(v.trim())
  if (!m) return '0,0,0'
  const n = parseInt(m[1], 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

export function createLandingMap(cv: HTMLCanvasElement) {
  const ctx = cv.getContext('2d')!
  const MAXW = 3840
  let DPR = 1
  let W = 1920, H = 1080 // 캔버스 CSS 크기 = 무대 크기(1920×1080)
  const FONT_OK: Record<string, boolean> = {}
  const col = { cell: '', land: '', gold: '', plane: '', scrim: '0,0,0' }
  const readColors = (root: Element) => {
    const cs = getComputedStyle(root), v = (n: string) => cs.getPropertyValue(n).trim()
    // 밝은 지도: 흰 바탕, 연한 회색 대륙, 남색 경로선·비행기·서울 점
    col.cell = v('--landing-map-cell'); col.land = v('--landing-ceil-line'); col.gold = v('--color-navy')
    col.plane = v('--color-navy'); col.scrim = rgbParts(v('--color-surface'))
  }

  const symOf = (code: string) => { const s = CODE_SYM[code] || (DOLLAR.has(code) ? '$' : '¤'); return FONT_OK[s] === false ? '¤' : s }
  /** 통화 기호 스프라이트: 화면에 찍힐 크기의 OS배로 그려 두고 정확히 1/OS로 줄여 찍는다(작은 글자를 바로 그릴 때 생기는 힌팅 찌그러짐·들쭉날쭉한 가장자리 방지) */
  const OS = 2
  const SPR: { fs: number; dpr?: number; map: Map<string, Sprite> } = { fs: 0, map: new Map() }
  function sprite(sym: string, color: string, fs: number): Sprite {
    if (SPR.fs !== fs || SPR.dpr !== DPR) { SPR.fs = fs; SPR.dpr = DPR; SPR.map.clear() }
    const k = sym + color
    let c = SPR.map.get(k)
    if (!c) {
      const w = Math.ceil(fs * 1.6) + 2
      c = document.createElement('canvas') as Sprite
      c.width = c.height = Math.ceil(w * DPR) * OS; c.w = c.width / DPR / OS
      const x = c.getContext('2d')!
      x.scale(DPR * OS, DPR * OS); x.fillStyle = color; x.textAlign = 'left'; x.textBaseline = 'alphabetic'
      // 정돈: 기호마다 실제 잉크 크기가 달라($는 좁고 ₽는 넓다) 들쭉날쭉해 보이므로, 잉크의 긴 변이 글자 크기의 0.72배를 넘는 큰 기호만 줄이고(최대 0.85배까지 — 키우면 ¤ 같은 기호가 네모처럼 보여서 키우지는 않는다),
      // 글자 칸이 아니라 잉크 가운데를 칸 가운데에 둔다(기호마다 위아래로 떠 보이지 않게)
      x.font = `600 ${fs}px ${MAPFONT}`
      const m0 = x.measureText(sym), ink0 = Math.max(m0.actualBoundingBoxLeft + m0.actualBoundingBoxRight, m0.actualBoundingBoxAscent + m0.actualBoundingBoxDescent)
      const kf = ink0 > 0 ? Math.min(1, Math.max(0.85, fs * 0.72 / ink0)) : 1
      x.font = `600 ${fs * kf}px ${MAPFONT}`
      const m = x.measureText(sym), L = m.actualBoundingBoxLeft, R = m.actualBoundingBoxRight, A_ = m.actualBoundingBoxAscent, D_ = m.actualBoundingBoxDescent
      x.fillText(sym, c.w / 2 + (L - R) / 2, c.w / 2 + (A_ - D_) / 2); SPR.map.set(k, c)
    }
    return c
  }
  const snap = (v: number) => Math.round(v * DPR) / DPR

  const Mp: MapState = { ready: false, cls: null, land: null, fi: [], g: { X: [], Y: [], S: [], AL: [], T: [], D: [], KO: [], n: 0 }, dense: [], routes: {}, seoul: [0, 0], krB: null, KD: 1, landSvg: null }
  const V = { x: 0, y: 0, w: 0, h: 0, r: 0, bg: 0, o: 1 }      // map viewport on screen
  const C = { cx: MW / 2, cy: MH / 2, z: 1 }                   // camera (z=1 → world at 90% of viewport width)
  // rv: 오프닝에서 빛이 지나간 곳(지도 가로 위치 < rv)만 기호가 켜진다(1.2 이상이면 전부 켜짐). krR: 서울 금색 점 반지름(px)
  const A = { sw: -0.2, krDot: 0, ro: 0, krLit: 0, lit: 0, dimOn: 0, sil: 1, rv: 2, krR: 4 }
  const P = { v: 0 }                                           // flight progress
  const PLANE = new Path2D('M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z')

  /** 무대 크기에 맞춘 캔버스 크기. 무대가 scale(stageScale)로 그려지므로 내부 해상도에 배율을 곱해 화면 픽셀과 맞춘다 */
  function resize(vw: number, vh: number, stageScale = 1) {
    W = vw; H = vh
    // 내부 해상도 = 실제 화면에 표시되는 크기 × devicePixelRatio, 가로 3840px까지만(큰 화면·고배율에서 성능 보호)
    DPR = Math.min((devicePixelRatio || 1) * stageScale, MAXW / vw)
    cv.width = Math.round(vw * DPR); cv.height = Math.round(vh * DPR); cv.style.width = vw + 'px'; cv.style.height = vh + 'px'
  }

  async function loadMap(signal: AbortSignal) {
    const res = await fetch(import.meta.env.BASE_URL + 'data/world-atlas.json', { signal })
    const w = await res.json()
    if (signal.aborted) return
    // 대륙 면은 SVG 지도 파일(같은 투영으로 만든 것)에서 읽는다
    try {
      const sv = await (await fetch(import.meta.env.BASE_URL + 'assets/world-map.svg', { signal })).text()
      const dm = sv.match(/ d="([^"]+)"/); if (dm) Mp.landSvg = new Path2D(dm[1])
    } catch (e) { if ((e as Error)?.name === 'AbortError') return }
    const proj = geoNaturalEarth1().rotate([-150, 0]).fitExtent([[8, 8], [MW - 8, MH - 8]], { type: 'Sphere' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feats = (feature(w, w.objects.countries) as any).features.filter((f: { id: string }) => parseInt(f.id, 10) !== 10) as Array<{ id: string; properties?: { name?: string } }>
    const oc = document.createElement('canvas'); oc.width = MW; oc.height = MH
    const o2 = oc.getContext('2d', { willReadFrequently: true })!, op = geoPath(proj, o2)
    const key = new Map<number, number>()
    feats.forEach((f, k) => {
      const id = parseInt(f.id, 10), code = ISO2CUR[id] || NAME2CUR[f.properties?.name ?? ''] || 'USD'
      Mp.fi[k] = { sym: symOf(code), tier: id === 410 ? 2 : MAJOR.has(id) ? 1 : 0 }
      const n = k + 1, r = (n * 37 + 11) & 255, g = (n * 101 + 53) & 255, b = (n * 59 + 97) & 255
      key.set((r << 16) | (g << 8) | b, n)
      o2.fillStyle = `rgb(${r},${g},${b})`; o2.beginPath(); op(f as never); o2.fill()
    })
    const d = o2.getImageData(0, 0, MW, MH).data, cls = new Uint16Array(MW * MH)
    for (let i = 0, n = MW * MH; i < n; i++) {
      const a = d[i * 4 + 3]; if (a < 128) continue
      const v = a === 255 ? key.get((d[i * 4] << 16) | (d[i * 4 + 1] << 8) | d[i * 4 + 2]) : 0
      cls[i] = v || 65535
    }
    Mp.cls = cls
    Mp.land = new Path2D(geoPath(proj)({ type: 'FeatureCollection', features: feats } as never) ?? '')
    // Korea: high-res raster for the dense ₩ grid
    const kr = feats.filter((f) => parseInt(f.id, 10) === 410), path = geoPath(proj)
    const kb = path.bounds({ type: 'FeatureCollection', features: kr } as never) as [Pt, Pt]; Mp.krB = kb
    const KS = 30, kw = Math.ceil((kb[1][0] - kb[0][0]) * KS) + 2, kh = Math.ceil((kb[1][1] - kb[0][1]) * KS) + 2
    const kc = document.createElement('canvas'); kc.width = kw; kc.height = kh
    const kx = kc.getContext('2d', { willReadFrequently: true })!
    // 색은 쓰지 않고 알파만 읽는 마스크
    kx.setTransform(KS, 0, 0, KS, -kb[0][0] * KS, -kb[0][1] * KS); kx.fillStyle = 'rgb(255,255,255)'; kx.beginPath(); geoPath(proj, kx)({ type: 'FeatureCollection', features: kr } as never); kx.fill()
    const kd = kx.getImageData(0, 0, kw, kh).data
    const sampleK = (step: number) => {
      const out: Array<{ x: number; y: number; th: number }> = []
      for (let j = 0, y = kb[0][1] + step / 2; y < kb[1][1]; j++, y += step) for (let x = kb[0][0] + step / 2 + (j % 2 ? step / 2 : 0); x < kb[1][0]; x += step) {
        const px = ((x - kb[0][0]) * KS) | 0, py = ((y - kb[0][1]) * KS) | 0
        if (kd[(py * kw + px) * 4 + 3] > 127) out.push({ x, y, th: 0 })
      }
      return out
    }
    let step = 1.0, dense = sampleK(step)
    while (dense.length < 180 && step > 0.4) { step -= 0.05; dense = sampleK(step) }
    const s = proj(SEOUL) as Pt; Mp.seoul = s; Mp.KD = step
    dense.sort((a, b) => Math.hypot(a.x - s[0], a.y - s[1]) - Math.hypot(b.x - s[0], b.y - s[1]))
    dense.forEach((p, i) => { p.th = i / dense.length }); Mp.dense = dense
    Object.keys(ORIG_PT).forEach((k) => {
      const ip = geoInterpolate(ORIG_PT[k], SEOUL), pts: Pt[] = [], cum = [0]
      for (let i = 0; i <= 100; i++) { pts.push(proj(ip(i / 100)) as Pt); if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])) }
      Mp.routes[k] = { pts, cum, len: cum[cum.length - 1] }
    })
    Mp.ready = true
  }
  function lookup(x: number, y: number) {
    const xi = x | 0, yi = y | 0, v = Mp.cls![yi * MW + xi]
    if (!v) return -1
    if (v !== 65535) return v - 1
    for (const [dx, dy] of NB) { const xx = xi + dx, yy = yi + dy; if (xx < 0 || yy < 0 || xx >= MW || yy >= MH) continue; const w = Mp.cls![yy * MW + xx]; if (w && w !== 65535) return w - 1 }
    return -1
  }
  function buildGrid() {
    if (!Mp.ready) return
    const g = 10 / (W * 0.9 / MW)   // 10px grid at the opening view
    const X: number[] = [], Y: number[] = [], S: string[] = [], AL: number[] = [], T: number[] = [], D: number[] = [], KO: number[] = []
    for (let y = g / 2; y < MH; y += g) for (let x = g / 2; x < MW; x += g) {
      const k = lookup(x, y); if (k < 0) continue
      const f = Mp.fi[k]
      const base = f.tier === 2 ? 0.14 : 0.62
      X.push(x); Y.push(y); S.push(f.sym); T.push(f.tier); AL.push(base)
      let th = 2
      if (f.tier !== 2) for (const rk in Mp.routes) {
        const Rt = Mp.routes[rk]; let best = 1e9, bi = 0
        for (let i = 0; i < Rt.pts.length; i++) { const dd = Math.hypot(Rt.pts[i][0] - x, Rt.pts[i][1] - y); if (dd < best) { best = dd; bi = i } }
        if (best < 46) th = Math.min(th, Rt.cum[bi] / Rt.len)
      }
      D.push(th); KO.push(f.tier === 2 ? Math.hypot(x - Mp.seoul[0], y - Mp.seoul[1]) : 0)
    }
    for (let i = 0; i < X.length; i++) { if (S[i] === '$' && T[i] === 1 && X[i] > MW * 0.6) D[i] = Math.min(D[i], 0.04); if (S[i] === '¥' && T[i] === 1 && X[i] < MW * 0.6 && Y[i] > MH * 0.3 && Y[i] < MH * 0.45 && X[i] > Mp.seoul[0]) D[i] = Math.min(D[i], 0.04) }
    const kmax = Math.max(1, ...KO.filter((_, i) => T[i] === 2))
    Mp.g = { X, Y, S, AL, T, D, KO: KO.map((v, i) => T[i] === 2 ? v / kmax : 0), n: X.length }
  }
  function routePos(Rt: Route, p: number) {
    const L = Rt.len * p; let i = 1
    while (i < Rt.pts.length - 1 && Rt.cum[i] < L) i++
    const a = Rt.pts[i - 1], b = Rt.pts[i], f = clamp((L - Rt.cum[i - 1]) / ((Rt.cum[i] - Rt.cum[i - 1]) || 1))
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, ang: Math.atan2(b[1] - a[1], b[0] - a[0]), i }
  }
  function drawMap() {
    const vw = W, vh = H
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, vw, vh)
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high' // 스프라이트 축소 품질
    if (!Mp.ready || V.o < 0.004 || V.w < 2) return
    const sB = vw * 0.9 / MW, s = V.w * 0.9 / MW * C.z, rel = s / sB
    const ox = V.x + V.w / 2 - C.cx * s, oy = V.y + V.h / 2 - C.cy * s
    ctx.save()
    ctx.beginPath(); ctx.roundRect(V.x, V.y, V.w, V.h, V.r); ctx.clip()
    if (V.bg > 0) { ctx.globalAlpha = V.o; ctx.fillStyle = `rgba(${col.scrim},${V.bg})`; ctx.fillRect(V.x, V.y, V.w, V.h) }
    const G = Mp.g, fpx = Math.round(7 * rel * 2) / 2, m = fpx * 2
    const dense = clamp((Mp.KD * s - 7) / 6)
    // 밝은 지도: 대륙은 연한 회색 단색 면(SVG), 점으로 찍은 기호·₩는 그리지 않는다
    const landP = Mp.landSvg || Mp.land
    if (landP) { ctx.save(); ctx.globalAlpha = V.o; ctx.translate(ox, oy); ctx.scale(s, s); ctx.fillStyle = col.land; ctx.fill(landP); ctx.restore() }
    const sil = 0
    if (sil > 0 && Mp.land) { ctx.save(); ctx.globalAlpha = V.o * sil; ctx.translate(ox, oy); ctx.scale(s, s); ctx.fillStyle = col.land; ctx.fill(Mp.land); ctx.restore() }
    const glyph = false
    const gold: number[] = []
    ctx.fillStyle = col.cell
    for (let i = 0; i < G.n; i++) {
      const px = ox + G.X[i] * s, py = oy + G.Y[i] * s
      if (px < V.x - m || px > V.x + V.w + m || py < V.y - m || py > V.y + V.h + m) continue
      if (!glyph) break
      let a = G.AL[i] * (1 - dense) * (1 - sil)
      if (a < 0.01) continue
      if (G.T[i] === 2) {
        const l = clamp((A.krLit - G.KO[i]) / 0.15)
        if (l > 0) gold.push(px, py, l * (1 - dense))
        a *= (1 - l)
      } else if (A.dimOn) {
        const k = clamp((P.v - G.D[i]) / 0.04); a = a + (0.12 - a) * k
      }
      if (A.rv < 1.2) { a *= clamp((A.rv - G.X[i] / MW) / 0.06); if (a < 0.01) continue }
      if (A.sw > -0.15 && A.sw < 1.15) { const dx = (G.X[i] / MW - A.sw) / 0.05; a += 0.5 * Math.exp(-dx * dx) }
      if (a < 0.01) continue
      ctx.globalAlpha = V.o * Math.min(1, a)
      const sp = sprite(G.S[i], col.cell, fpx), hh = sp.w / 2
      ctx.drawImage(sp, snap(px - hh), snap(py - hh), sp.w, sp.w)
    }
    if (gold.length) {
      ctx.fillStyle = col.gold
      const sp = glyph ? sprite('₩', col.gold, fpx) : null
      for (let i = 0; i < gold.length; i += 3) { ctx.globalAlpha = V.o * gold[i + 2]; if (sp) ctx.drawImage(sp, snap(gold[i] - sp.w / 2), snap(gold[i + 1] - sp.w / 2), sp.w, sp.w) }
    }
    // dense ₩ (Korea zoom)
    if (dense > 0 && glyph) {
      const df = Mp.KD * s * 0.8
      ctx.font = `600 ${df}px ${MAPFONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      for (const p of Mp.dense) {
        const px = ox + p.x * s, py = oy + p.y * s
        if (px < V.x - df || px > V.x + V.w + df || py < V.y - df || py > V.y + V.h + df) continue
        const l = clamp((A.lit - p.th) / 0.06)
        if (l < 1) { ctx.globalAlpha = V.o * 0.14 * (1 - l) * dense; ctx.fillStyle = col.cell; ctx.fillText('₩', px, py) }
        if (l > 0) { ctx.globalAlpha = V.o * l * dense; ctx.fillStyle = col.gold; ctx.fillText('₩', px, py) }
      }
    }
    // thumbnail: Korea as one gold dot
    if (A.krDot > 0) { ctx.globalAlpha = V.o * A.krDot; ctx.fillStyle = col.gold; ctx.beginPath(); ctx.arc(ox + Mp.seoul[0] * s, oy + Mp.seoul[1] * s, A.krR, 0, 6.2832); ctx.fill() }
    // flight routes + planes
    if (A.ro > 0) {
      ctx.strokeStyle = col.gold; ctx.lineCap = 'round'
      for (const k in Mp.routes) {
        const Rt = Mp.routes[k], pos = routePos(Rt, P.v)
        ctx.globalAlpha = V.o * A.ro * 0.6; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6])
        ctx.beginPath(); ctx.moveTo(ox + pos.x * s, oy + pos.y * s)
        for (let i = pos.i; i < Rt.pts.length; i++) ctx.lineTo(ox + Rt.pts[i][0] * s, oy + Rt.pts[i][1] * s)
        ctx.stroke(); ctx.setLineDash([])
        ctx.globalAlpha = V.o * A.ro; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(ox + Rt.pts[0][0] * s, oy + Rt.pts[0][1] * s)
        for (let i = 1; i < pos.i; i++) ctx.lineTo(ox + Rt.pts[i][0] * s, oy + Rt.pts[i][1] * s)
        ctx.lineTo(ox + pos.x * s, oy + pos.y * s); ctx.stroke()
        ctx.save(); ctx.translate(ox + pos.x * s, oy + pos.y * s); ctx.rotate(pos.ang + Math.PI / 4); ctx.scale(0.75, 0.75); ctx.translate(-12, -12)
        ctx.fillStyle = col.plane; ctx.strokeStyle = col.plane; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.fill(PLANE); ctx.stroke(PLANE); ctx.restore()
        ctx.strokeStyle = col.gold
      }
    }
    ctx.restore()
  }

  return { Mp, V, C, A, P, FONT_OK, readColors, resize, loadMap, buildGrid, drawMap, routePos }
}

export type LandingMap = ReturnType<typeof createLandingMap>
