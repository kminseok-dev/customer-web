// 랜딩(/) 스크롤 엔진 — 원본 landing-journey.html <script>의 구조를 그대로 옮긴 일반 TS 모듈.
// LandingPage의 useLayoutEffect 한 곳에서 mountLanding(root)을 부르고, 돌려받은 함수를 cleanup으로 쓴다.
// 이번 단계(L-2): Lenis·ScrollTrigger·마스터 타임라인 뼈대, build() 재빌드, #hdr2, 패스포트 장면 이동, 스크롤 복원.
// 장면 tween·캔버스·글자 갱신은 L-3부터 채운다(자리는 // L-n 주석으로 표시).
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { calc as calcAt, clamp, confirmDate, LIMIT, man, MY, won, withdrawDate, ymd } from './landingCalc'
import { BOARD_ROWS, BOARD_STATES } from './landingBoardData'
import { createLandingMap } from './landingMap'
import { MH, MW, SYM1 } from './landingMapData'
import { BEAT_LOCK_SEC, BEAT_SEC, BEATS, FOLLOW_SEC, R, S11_BEATS, SCN, SCROLL_TOTAL, SMOOTH_LERP, TOTAL, tOfU, uOfT, WHEEL_MAX_AHEAD, WHEEL_MULT } from './landingScenes'
import { lateTexts } from './landingTexts'

export interface LandingMountOptions {
  /** 이 진입이 뒤로 가기(POP)인가 — 그때만 이전 스크롤 위치를 복원한다 */
  pop: boolean
  /** 현재 history 항목 키 — 저장해 둔 위치가 이 항목의 것일 때만 복원 */
  historyKey: string
  /** 주소의 해시(예: '#faq') — 다른 페이지에서 /#faq 로 들어오면 FAQ 위치로 스크롤 */
  hash: string
}

const SCROLL_KEY = 'returns-landing-scroll'
const LOGOUT_NOTICE_KEY = 'returns-logout-notice'
let lastNoticeAt = -1e9 // StrictMode 재마운트에서 같은 안내를 한 번 더 보여 주기 위한 표시

function readSavedScroll(historyKey: string): number | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || 'null')
    return v && v.key === historyKey && Number.isFinite(v.y) ? v.y : null
  } catch {
    return null
  }
}

function writeSavedScroll(historyKey: string, y: number): void {
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ key: historyKey, y }))
  } catch {
    /* 저장 불가 환경이면 복원만 건너뜀 */
  }
}

export function mountLanding(root: HTMLElement, opts: LandingMountOptions): () => void {
  const $ = <T extends HTMLElement = HTMLElement>(s: string): T => root.querySelector(s) as T
  const $$ = <T extends HTMLElement = HTMLElement>(s: string): T[] => [...root.querySelectorAll<T>(s)]
  const byId = (id: string) => root.querySelector<HTMLElement>('#' + id)!

  let dead = false
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const cleanups: Array<() => void> = []
  const listen = <K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions) => {
    window.addEventListener(type, fn, o)
    cleanups.push(() => window.removeEventListener(type, fn, o))
  }

  /* ===== time remap: 장면 tween 시간 → R() ===== */
  type Tweenish = { duration?: number }
  function wrapTL(tl: gsap.core.Timeline) {
    const t = tl as unknown as Record<string, (...a: unknown[]) => unknown>
    ;['to', 'fromTo', 'set'].forEach((m) => {
      const f = t[m].bind(tl)
      t[m] = (...a: unknown[]) => {
        const p = a[a.length - 1]
        if (typeof p === 'number') {
          const v = a[a.length - 2] as Tweenish | null
          if (v && typeof v.duration === 'number') v.duration = Math.max(0.01, R(p + v.duration) - R(p))
          a[a.length - 1] = R(p)
        }
        return f(...a)
      }
    })
  }

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches

  /* ===== 1920×1080 무대: 화면 크기에 맞춰 통째로 확대·축소 =====
     무대 안 좌표는 모두 1920×1080 기준. 스크롤 길이(#pinA·#pinB 높이)만 실제 화면 높이(innerHeight)를 쓴다. */
  const SW = 1920, SH = 1080
  let SS = 1 // 무대 배율
  let UI = 1 // 무대 밖 고정 UI(#hdr2·#passWrap) 배율 — 큰 화면에서는 무대와 같이 커지고, 작은 화면에서는 0.75 아래로 줄이지 않는다
  let BX = 0, BY = 0 // 레터박스 폭(무대 좌표) — 배경 레이어가 이만큼 무대 밖으로 늘어나 남는 칸을 채운다
  function fit() {
    SS = Math.min(innerWidth / SW, innerHeight / SH) || 1
    UI = Math.max(0.75, SS)
    BX = Math.max(0, (innerWidth / SS - SW) / 2); BY = Math.max(0, (innerHeight / SS - SH) / 2)
    root.style.setProperty('--ss', String(SS))
    root.style.setProperty('--ui', String(UI))
    root.style.setProperty('--bx', BX + 'px'); root.style.setProperty('--by', BY + 'px')
    // FAQ·푸터(무대 밖 일반 스크롤 구간)는 가로 1920px 기준 레이아웃을 폭 배율로 키우고 줄인다 — 세로 길이는 zoom이 같이 바꿔 주므로 푸터가 잘리지 않는다
    root.style.setProperty('--fw', String((document.documentElement.clientWidth || innerWidth) / SW))
  }
  fit()
  // 모니터를 옮기거나 브라우저 배율을 바꿔 devicePixelRatio가 달라지면 지도를 다시 그린다(resize가 안 오는 경우 대비)
  let dprMq: MediaQueryList | undefined, onDpr: (() => void) | undefined
  const watchDpr = (again: () => void) => {
    dprMq = matchMedia(`(resolution: ${devicePixelRatio}dppx)`)
    onDpr = () => { again(); watchDpr(again) }
    dprMq.addEventListener('change', onDpr, { once: true })
  }
  cleanups.push(() => { if (dprMq && onDpr) dprMq.removeEventListener('change', onDpr) })

  /* ===== 상태 ===== */
  type Rect = { x: number; y: number; w: number; h: number }
  const LG: { vw: number; vh: number; pad: number; r5?: Rect; l6?: Rect; k7: number; sv?: Rect; fly?: { x: number; y: number }; flyH?: number } = { vw: 0, vh: 0, pad: 96, k7: 1 }
  let GEO: { SCR: { x: number; y: number; w: number; h: number }; MOFF: number; vw: number; vh: number; T1x: number; T4: number; TX: number; dR: number; dX: number } | null = null
  let tl: gsap.core.Timeline | undefined, st: ScrollTrigger | undefined
  let tl2: gsap.core.Timeline | undefined, st2: ScrollTrigger | undefined

  const ctx = gsap.context(() => {}, root)
  const ac = new AbortController() // 마운트 중 시작한 지도 fetch를 언마운트 때 취소
  cleanups.push(() => ac.abort())
  const map = createLandingMap($('#map') as HTMLCanvasElement)
  const { Mp, V, C, A, P } = map

  /* ===== smooth scroll ===== */
  gsap.registerPlugin(ScrollTrigger)
  type LenisLike = Pick<Lenis, 'on' | 'raf' | 'scrollTo'> & { destroy?: () => void }
  const lenis: LenisLike = RM
    ? ({ on() {}, raf() {}, scrollTo(y: number) { window.scrollTo(0, y) } } as unknown as LenisLike)
    : new Lenis({
      lerp: SMOOTH_LERP, wheelMultiplier: WHEEL_MULT,
      // 휠·트랙패드를 세게 돌려도 목표 위치가 현재 위치보다 WHEEL_MAX_AHEAD화면 넘게 앞서지 않게 이번 입력량을 줄인다
      virtualScroll: (d) => {
        if (!d.event.type.includes('wheel')) return true
        const l = lenis as unknown as { targetScroll: number; animatedScroll: number }, lim = WHEEL_MAX_AHEAD * innerHeight
        const before = l.targetScroll - l.animatedScroll, after = before + d.deltaY
        if (Math.abs(after) > lim) { const nd = Math.sign(after) * lim - before; d.deltaY = Math.sign(nd) === Math.sign(d.deltaY) ? nd : 0 }
        return true
      },
    })
  lenis.on('scroll', ScrollTrigger.update)
  const rafTick = (t: number) => lenis.raf(t * 1000)
  gsap.ticker.add(rafTick)
  gsap.ticker.lagSmoothing(0)
  cleanups.push(() => {
    gsap.ticker.remove(rafTick)
    gsap.ticker.lagSmoothing(500, 33) // gsap 기본값으로 복원
    lenis.destroy?.()
  })

  /* ===== S3 departure board ===== */
  const ROWS = BOARD_ROWS, STATES = BOARD_STATES
  const TH = ROWS.map((_, i) => { const b = 7.55 + i * 0.02; return [R(b), R(b + 0.2), R(b + 0.4)] }) // 옛 시간 7.55~8.17 = 새 시간 7.32~8.29
  const rowEls = $$('#rows .br')
  const flEls = rowEls.map((r) => r.children[1] as HTMLElement), krwEls = rowEls.map((r) => r.children[5] as HTMLElement), stEls = rowEls.map((r) => r.children[6].firstElementChild as HTMLElement)
  let rowState = ROWS.map(() => -1)
  function updBoard(t: number, anim?: boolean, force?: boolean) {
    ROWS.forEach((r, i) => {
      const n = TH[i].filter((x) => t >= x).length
      if (n === rowState[i] && !force) return
      const changed = n !== rowState[i]; rowState[i] = n
      const el = stEls[i]; el.textContent = STATES[n]; el.className = 'sx s' + n
      flEls[i].textContent = n >= 1 ? r.f : ''
      krwEls[i].textContent = n >= 1 ? won(disp.A * r.share) : '-'
      // 칸 넘김: 값이 바뀐 칸(상태·체결 시각·금액)만 공항 안내판처럼 위아래로 한 번 넘어간다. 움직임 줄이기면 넘김 없이 바로
      if (anim && changed && !RM) ctx.add(() => { gsap.fromTo([el.parentElement!, flEls[i], krwEls[i]], { rotationX: -88, transformPerspective: 320, transformOrigin: '50% 0%' }, { rotationX: 0, duration: 0.3, ease: 'power3.out', overwrite: true }) })
    })
  }
  const boardLive = () => !!tl && tl.time() > 6.6 && tl.time() < 8.5
  // 시계(#clkH/#clkM)는 React 훅(useLandingClock)이 열 때와 10초마다 실제 시각으로 갱신한다(원본 tick()과 같음)

  /* ===== numbers ===== */
  const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
    el.addEventListener(type, fn)
    cleanups.push(() => el.removeEventListener(type, fn))
  }
  const later = (fn: () => void, ms: number) => {
    const id: ReturnType<typeof setTimeout> = setTimeout(() => { timers.delete(id); fn() }, ms)
    timers.add(id)
    return id
  }
  const my = { A: MY.A, r: MY.r, w: 1 as number }
  const calc = (A = my.A, r = my.r) => calcAt(A, r)
  const disp = { A: my.A, save: calc().save, remain: calc().remain }
  const K = { v: 1, last: -1 }   // S1 limit count-up
  const limBig = byId('limBig'), amt = byId('amt') as HTMLInputElement, amtMsg = byId('amtMsg')
  const setP = () => amt.style.setProperty('--p', (+amt.value / +amt.max * 100) + '%')
  // 한도 숫자는 '₩0'부터 세지 않는다 — 세기 전(K=0)에는 보이지 않고, 금액의 절반에서 나타나며 최종 금액까지 올라간다(최종 표시는 그대로 disp.A)
  function paintBig() { const kk = K.v >= 1 ? 1 : 0.5 + 0.5 * K.v, v = disp.A * kk; limBig.textContent = won(v); limBig.style.opacity = K.v >= 1 ? '' : String(clamp(K.v / 0.15)); amt.value = String(v); setP() }
  function paintNums() {
    $$('[data-n=A]').forEach((e) => { e.textContent = won(disp.A) })
    $$('[data-n=Aman]').forEach((e) => { e.textContent = man(disp.A) })
    $$('[data-n=remain]').forEach((e) => { e.textContent = won(disp.remain) })
    paintBig()
    updBoard(tl ? tl.time() : 0, false, true)
  }
  function refreshNums() {
    const c = calc()
    ctx.add(() => { gsap.to(disp, { A: my.A, save: c.save, remain: c.remain, duration: 0.6, ease: 'power2.out', onUpdate: paintNums, overwrite: true }) })
  }
  let msgT: ReturnType<typeof setTimeout> | undefined
  on(amt, 'input', () => {
    let v = +amt.value
    if (v > LIMIT) {
      v = LIMIT; amt.value = String(LIMIT); amtMsg.textContent = '매도 한도는 전 증권사 합산 5,000만 원이에요'; amtMsg.classList.add('warn')
      if (msgT) { clearTimeout(msgT); timers.delete(msgT) }
      msgT = later(() => { amtMsg.classList.remove('warn'); amtMsg.textContent = '입력하지 않아도 3,000만 원 기준으로 보여드려요' }, 2600)
    }
    my.A = v; K.v = 1; disp.A = v; limBig.textContent = won(v); setP(); refreshNums()
  })
  $$('#rates button').forEach((b) => on(b, 'click', () => {
    $$('#rates button').forEach((x) => x.classList.toggle('on', x === b)); my.r = +b.dataset.r!; refreshNums()
  }))

  /* ===== S5–S9: every frame computed from timeline time ===== */
  const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
  const e3o = (q: number) => 1 - Math.pow(1 - q, 3)
  const setT = (el: HTMLElement, s: string) => { if (el.textContent !== s) el.textContent = s }
  const vis = (el: HTMLElement, o: number, tr?: string) => { o = clamp(o); el.style.opacity = String(o); el.style.visibility = o > 0.001 ? 'visible' : 'hidden'; if (tr != null) el.style.transform = tr }
  const spCache = new WeakMap<HTMLElement, HTMLElement[]>()
  function revL(el: HTMLElement, t0: number, t: number) {
    let sp = spCache.get(el)
    if (!sp) { sp = [...el.querySelectorAll<HTMLElement>('.ml>span')]; spCache.set(el, sp) }
    // 줄을 잘라 밀어 올리지 않고(멈추면 한글 획이 잘려 다른 글자처럼 보였다) 조금 올라오며 나타난다
    sp.forEach((s_, i) => { const k = e3o(seg(t, t0 + i * 0.06, t0 + i * 0.06 + 0.22)); s_.style.transform = `translateY(${(1 - k) * 28}%)`; s_.style.opacity = String(k) })
  }
  const L$: Record<string, HTMLElement> = {}
  ;['late', 'lb5', 'lb6', 'lb7', 'lb8', 'lb9', 's5', 's6', 's7', 's8', 's9', 'tt5', 'd5', 'big5', 'd5b', 'seal5', 'rail5', 'rf5', 'dot5', 'cnt5',
    'ph11', 'w11', 'sum11', 'sum11bg', 'sum11c', 'ph6a', 'ph6b', 'beam6', 'beam6b', 'tt6', 'p6', 'list6', 'big6', 'pct6', 'col7', 'tt7', 'big7', 'rul7', 'rul7in', 'today7', 'rc7', 'paper', 'strike', 'save7',

    'tt8', 'fl8', 'svg8', 'pm8', 'flyW', 'fly8', 'big8', 'tt9', 'list9', 'app9', 'kiroo', 'bub9', 'disc9', 'lkT', 'addr9', 'passD'].forEach((id) => { L$[id] = byId(id) })
  const LL = (n: string) => $$(`[data-l="${n}"]`)
  const ticks5 = $$('.tk5') // S5 rail ticks (13개, 마크업에서 그린 것)
  const rows6 = $$('.r6'), ems6 = rows6.map((r) => r.querySelector('em') as HTMLElement), items7 = $$('.i7')
  const lanes8 = $$('.ln8')
  // S9 화면별 켜질 머리글 탭·주소창 경로는 마크업(LandingS9의 data-tab·data-path)에서 읽는다
  const items9 = $$('.l9'), panels9 = $$('.a9p'), tabs9 = $$('.a9tab span'), TABS9 = panels9.map((p_) => +(p_.dataset.tab ?? -1)), PATH9 = panels9.map((p_) => p_.dataset.path || '/home')

  /* S8 flow nodes */
  interface Lab { lab: HTMLElement; dir: 'up' | 'dn'; shift: number; px: number; py: number; flipped?: number; end?: number }
  interface FlowNode extends Lab { x: number; at: number; lane?: number; date?: number; ex?: number; val?: () => number; d: string | (() => string); el: HTMLElement; b: HTMLElement; dir0?: 'up' | 'dn' }
  const NODES = [
    { x: 0, dir: 'dn', at: 0, val: () => disp.A, d: '해외주식' },
    { x: 0.15, dir: 'up', at: 0.15 / 0.46 * 0.35, val: () => disp.A, d: 'RIA 매도' },
    { x: 0.27, dir: 'dn', at: 0.27 / 0.46 * 0.35, val: () => disp.A, d: () => '원화 확정 · ' + ymd(confirmDate()) },
    { x: 0.66, lane: 0, dir: 'up', at: 0.35 + 0.65 * 0.4, val: () => disp.A * 0.5, d: '국내 상장주식 50%', ex: 1 },
    { x: 0.57, lane: 1, dir: 'up', at: 0.35 + 0.65 * 0.2, val: () => disp.A * 0.3, d: '국내 주식형 펀드 30%', ex: 1 },
    { x: 0.66, lane: 2, dir: 'dn', at: 0.35 + 0.65 * 0.33, val: () => disp.A * 0.2, d: '예탁금 20%', ex: 1 },
    { x: 1, dir: 'up', end: 1, at: 0.97, date: 1, d: '인출 가능' },
  ] as unknown as FlowNode[]
  NODES.forEach((n) => {
    n.el = document.createElement('div'); n.el.className = 'nd'; n.el.innerHTML = '<i></i>'; L$.fl8.appendChild(n.el)
    n.lab = document.createElement('div'); n.lab.className = 'nlab' + (n.end ? ' end' : '')
    n.lab.innerHTML = `<b></b><small>${typeof n.d === 'function' ? n.d() : n.d}${n.ex ? '<span class="ex">예시</span>' : ''}</small>`
    L$.fl8.appendChild(n.lab); n.b = n.lab.querySelector('b') as HTMLElement; n.shift = 0
  })
  // 엔진이 만든 노드·라벨 요소는 언마운트 때(그리고 StrictMode 재마운트 때 중복되지 않게) 지운다
  cleanups.push(() => NODES.forEach((n) => { n.el.remove(); n.lab.remove() }))
  const FLY: Lab = { lab: L$.flyW, dir: 'dn', shift: 0, px: 0, py: 0 }
  const fin = (n: FlowNode) => n.date ? ymd(withdrawDate()) : won(n.val!())
  function placeLab(n: Lab) {
    const w = n.lab.offsetWidth, h = n.lab.offsetHeight, gap = 14 + n.shift
    n.lab.style.left = (n.end ? n.px - w + 6 : n.px - 6) + 'px'
    n.lab.style.top = (n.dir === 'up' ? n.py - gap - h : n.py + gap) + 'px'
  }
  const boxOf = (n: Lab) => ({ x: parseFloat(n.lab.style.left), y: parseFloat(n.lab.style.top), w: n.lab.offsetWidth, h: n.lab.offsetHeight })
  const hit = (a: Rect, b: Rect, m: number) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m
  let nudges = 0 // 겹침 해소에서 라벨을 민 횟수(원본은 console.info로만 출력 — 비교용으로 개발 훅에 노출)
  function fixOverlap() {
    const pts: number[][] = []
    ;[L$.pm8, ...lanes8].forEach((p_) => { const sp = p_ as unknown as SVGPathElement, len = sp.getTotalLength(); for (let i = 0; i <= 90; i++) { const q = sp.getPointAtLength(len * i / 90); pts.push([q.x, q.y]) } })
    const labs: Lab[] = [...NODES, FLY]; let moved = 0
    for (let it = 0; it < 12; it++) {
      let any = false
      labs.forEach((a, i) => {
        const r = boxOf(a)
        const onLine = pts.some(([x, y]) => x > r.x - 12 && x < r.x + r.w + 12 && y > r.y - 12 && y < r.y + r.h + 12)
        const onLab = labs.some((b, j) => j !== i && hit(r, boxOf(b), 8))
        if (onLine || onLab) {
          if (a.shift >= 36 && !a.flipped) { a.flipped = 1; a.dir = a.dir === 'up' ? 'dn' : 'up'; a.shift = 0 }
          else a.shift += 6
          placeLab(a); any = true; moved++
        }
      })
      if (!any) break
    }
    nudges = moved
  }



  function buildLate(vw: number, vh: number) {
    const pad = parseFloat(getComputedStyle(stageEl).getPropertyValue('--pad')) || 96 // 무대(.stg) 안 --pad는 96px 고정
    Object.assign(LG, { vw, vh, pad })
    paintLate()
    /* S5: 밝은 아침 사진의 하늘 위 — 글자 색은 CSS(진한 글자·남색) 그대로 */
    const rr = rel(L$.rail5); LG.r5 = rr
    ticks5.forEach((tk, k) => tk.classList.toggle('dk', (rr.y + rr.h * k / 12) / vh > 0.5))
    /* S6 */
    L$.list6.style.top = ''; $$('.r6').forEach((r) => { r.style.padding = '' })
    const lr = rel(L$.list6); LG.l6 = lr
    const b6n = L$.big6.querySelector('b') as HTMLElement; b6n.style.fontSize = ''
    const b6 = rel(L$.big6), over6 = lr.y + lr.h + 24 - b6.y
    if (over6 > 0) b6n.style.fontSize = Math.max(56, 120 - over6) + 'px'
    const b6b = rel(L$.big6), over6b = lr.y + lr.h + 24 - b6b.y, t6 = rel(L$.tt6)
    L$.list6.style.top = ''
    if (over6b > 0) {
      const ny = Math.max(t6.y + t6.h + 24 > lr.x ? 0 : 0, lr.y - over6b); L$.list6.style.top = Math.max(vh * 0.1, ny) + 'px'
      LG.l6 = rel(L$.list6); const still = LG.l6.y + LG.l6.h + 24 - b6b.y
      if (still > 0) $$('.r6').forEach((r) => { r.style.padding = Math.max(8, 16 - still / 8) + 'px 0' })
      LG.l6 = rel(L$.list6)
    }
    /* S7 fit: receipt must clear the ruler, left column must clear the receipt */
    L$.rc7.style.transform = 'none'; L$.rc7.style.transformOrigin = '100% 0'
    const rc = rel(L$.rc7), ru = rel(L$.rul7), kr = Math.min(1, (ru.y - 28 - rc.y) / rc.h); LG.k7 = kr
    L$.rc7.style.transform = kr < 1 ? `scale(${kr})` : 'none'
    const room = rc.x + rc.w * (1 - kr) - 40 - pad; L$.col7.style.maxWidth = room + 'px'
    // 원본과 다른 곳: 원본은 이전 빌드에서 정한 flex-wrap을 그대로 둔 채 scrollWidth를 재서, 빌드할 때마다 wrap ↔ nowrap이 번갈아 바뀌었다
    // (빌드 횟수의 홀짝에 따라 결과가 달라짐 — 창 크기를 바꾸면 nowrap이 되어 글자가 영수증 밑으로 들어감). 매 빌드를 첫 빌드와 같은 조건에서 재도록 먼저 비운다.
    L$.big7.style.flexWrap = ''
    L$.big7.style.flexWrap = L$.big7.scrollWidth > room ? 'wrap' : 'nowrap'
    LG.sv = rel(L$.save7)
    /* S8 flow */
    L$.big8.style.top = ''; L$.big8.style.bottom = ''
    const t8 = rel(L$.tt8), b8 = rel(L$.big8), LAB = 62
    const fw = vw - pad * 2, L = clamp(vh * 0.13, 86, 112), mid = L + LAB + 12, fh = mid * 2
    FLY.px = 0
    const yTop = t8.y + t8.h + 20 + L + LAB; let yBot = b8.y - 16 - L - LAB
    if (yBot < yTop) { Object.assign(L$.big8.style, { top: t8.y + 'px', bottom: 'auto' }); yBot = vh - 24 - L - LAB }
    const cy = yBot >= yTop ? (yTop + yBot) / 2 : yTop
    const top = cy - mid
    Object.assign(L$.fl8.style, { left: pad + 'px', top: top + 'px', width: fw + 'px', height: fh + 'px' })
    L$.svg8.setAttribute('width', String(fw)); L$.svg8.setAttribute('height', String(fh)); L$.svg8.setAttribute('viewBox', `0 0 ${fw} ${fh}`)
    const X = (f_: number) => f_ * fw, sx = X(0.46), ys = [mid - L, mid, mid + L]
    L$.pm8.setAttribute('d', `M0,${mid} L${sx},${mid}`)
    ys.forEach((y, i) => lanes8[i].setAttribute('d', `M${sx},${mid} C${X(0.50)},${mid} ${X(0.50)},${y} ${X(0.54)},${y} L${X(0.80)},${y} C${X(0.84)},${y} ${X(0.84)},${mid} ${X(0.88)},${mid} L${fw},${mid}`))
    NODES.forEach((n) => { n.px = X(n.x); n.py = n.lane == null ? mid : ys[n.lane]; n.shift = 0; n.flipped = 0; n.dir = n.dir0 || (n.dir0 = n.dir); Object.assign(n.el.style, { left: n.px + 'px', top: n.py + 'px' }); n.b.textContent = fin(n); placeLab(n) })
    FLY.px = 0; FLY.py = mid + L; FLY.shift = 0; FLY.flipped = 1; FLY.dir = 'dn'; L$.fly8.textContent = won(calc(disp.A, my.r).save); L$.fly8.style.transform = 'none'; placeLab(FLY)
    fixOverlap()
    LG.fly = { x: pad + parseFloat(FLY.lab.style.left), y: top + parseFloat(FLY.lab.style.top) }
    LG.flyH = L$.fly8.getBoundingClientRect().height / SS || 25
    /* S9 character beside the app screen */
    // 끼루는 노트북 오른쪽 아래 모서리에 걸쳐 앉고, 말풍선은 그 왼쪽, 화면 밖(노트북 아래쪽)에 붙여 화면 내용을 가리지 않는다
    const ap = { x: L$.app9.offsetLeft, y: L$.app9.offsetTop, w: L$.app9.offsetWidth, h: L$.app9.offsetHeight }
    const kx = ap.x + ap.w - 52, ky = ap.y + ap.h - 72
    Object.assign(L$.kiroo.style, { left: kx + 'px', top: ky + 'px' })
    Object.assign(L$.bub9.style, { left: (kx - 10 - L$.bub9.offsetWidth) + 'px', top: (ap.y + ap.h + 118) + 'px' }) // 노트북 키보드 몸체 아래
  }
  function paintLate() {
    const c = calcAt(disp.A, my.r, undefined, my.w), lt = lateTexts(disp.A, my.r, my.w)
    for (const k in lt) LL(k).forEach((e) => setT(e, lt[k]))
    return c
  }
  function renderLate(t: number) {
    if (t < 10.5) { if (L$.late.style.visibility !== 'hidden') vis(L$.late, 0); return }
    vis(L$.late, 1)
    const c = paintLate(), vw = LG.vw, vh = LG.vh
    /* backgrounds: dawn rises from below → teal → sky (swept left→right) → white → ivory */
    // S4→S5: 아침 사진이 무대를 다 채운 뒤(10.42) S5 바탕(같은 사진)이 그대로 이어받는다
    const m = t >= 10.42 && t < 12.2 ? 100 : 0 // S5 → S6: 같은 사진(#hero)이 이어받아 노트북 화면 속으로 줄어든다
    L$.lb5.style.webkitMaskImage = L$.lb5.style.maskImage = `linear-gradient(to top,rgb(0,0,0) ${m}%,transparent ${m}%)`
    L$.lb6.style.opacity = '0' // S6는 흰 바탕 위 노트북 웹 화면(바탕 레이어 없음)
    // 배경 레이어는 레터박스까지 늘어나 있으므로(BX·BY) 쓸어 가는 선도 화면 왼쪽 끝(-BX)에서 오른쪽 끝(vw+BX)까지 간다
    const x2 = seg(t, 14.2, 14.5) * (vw + 2 * BX) - BX
    L$.lb7.style.visibility = t >= 14.45 ? 'visible' : 'hidden' // S7 흰 바탕: 웹 화면이 무대를 다 채운 뒤 그대로 이어받는다(쓸어 가는 선 없음)
    L$.lb8.style.opacity = String(seg(t, 16.2, 16.5))
    L$.lb9.style.opacity = String(seg(t, 18.2, 18.5))
    vis(L$.beam6b, x2 > -BX && x2 < vw + BX ? 1 : 0, `translateX(${x2}px)`)

    /* S5 — big withdrawal date + 1-year rail */
    const on5 = t < 12.5; vis(L$.s5, on5 ? 1 : 0)
    if (on5) {
      const out = seg(t, 12.2, 12.4)
      revL(L$.tt5, 10.48, t); vis(L$.tt5, (t >= 10.48 ? 1 : 0) * (1 - out)) // 사진이 화면을 다 채운 직후부터
      const di = e3o(seg(t, 10.8, 11.1)); vis(L$.d5, di * (1 - out), `translateY(${(1 - di) * 24}px)`)
      vis(L$.rail5, seg(t, 10.85, 11.1) * (1 - out))
      const k = seg(t, 11.1, 12.0), ex = e2io(seg(t, 12.2, 12.5)), r = LG.r5!
      const dy = k * r.h + ex * (vh + BY - r.y - r.h + 60)
      L$.dot5.style.transform = `translateY(${dy}px)`; L$.dot5.style.visibility = t >= 11.0 ? 'visible' : 'hidden'; L$.dot5.style.opacity = '1'
      L$.rf5.style.height = k * 100 + '%'
      setT(L$.cnt5, `보유 ${Math.round(365 * k)}일`); L$.cnt5.style.color = 'var(--ink)'
      ticks5.forEach((tk, i) => tk.classList.toggle('on', k >= i / 12 - 0.001 && t >= 11.1))
      const sk = seg(t, 12.0, 12.15); vis(L$.seal5, sk * (1 - out), // HOLD 도장(큰 챕터 도장이 없어져서 다시 모든 설정에서 보인다)
       `rotate(-12deg) scale(${2.2 - 1.2 * e3o(sk)})`)
    }
    /* S6 — scan beam over the security photo */
    const on6 = t >= 12.2 && t < 14.5; vis(L$.s6, on6 ? 1 : 0)
    if (on6) {
      L$.s6.style.clipPath = ''; L$.s6.style.opacity = String(1 - (RM ? (t >= 14.2 ? 1 : 0) : seg(t, 14.12, 14.22))) // 노트북 화면으로 다가가기 전에 물러난다
      // 제목은 노트북이 돌아오는 동안(12.4) 왼쪽 열에 — S1·S2와 같은 흐림이 걷히는 방식
      revL(L$.tt6, 12.4, t); vis(L$.tt6, t >= 12.4 ? 1 : 0); L$.p6.style.opacity = String(seg(t, 12.5, 12.7))
      // 계좌 목록은 사진이 걷히면서 웹 화면에 나타나고, 확인 표시가 한 행씩 차분하게 바뀐다(빔 없음)
      const li = RM ? 1 : seg(t, 12.52, 12.62)
      rows6.forEach((row, i) => { row.style.visibility = li > 0 ? 'visible' : 'hidden'; row.style.opacity = String(li); ems6[i].style.opacity = String(RM ? 1 : seg(t, 12.85 + i * 0.22, 12.97 + i * 0.22)) })
      const gk = seg(t, 13.66, 13.92); vis(L$.big6, // 박자(14.05)에는 82%가 다 나타나 진한 색으로 머문다
        gk > 0 ? 1 : 0, `translateY(${(1 - e3o(gk)) * 16}px)`)
      setT(L$.pct6, String(Math.round(100 - 18 * e3o(gk))))
    }
    /* S7 — big deduction rate, ruler, printed receipt */
    const on7 = t >= 14.2 && t < 16.55; vis(L$.s7, on7 ? 1 : 0)
    if (on7) {
      L$.s7.style.clipPath = ''
      const out = seg(t, 16.2, 16.35)
      revL(L$.tt7, 14.36, t); vis(L$.tt7, t >= 14.36 ? 1 : 0) // 흰 페이지가 화면을 채울 때 제목·100%가 바로 — 빈 화면 방지
      const bi = e3o(seg(t, 14.38, 14.58)); vis(L$.big7, bi, `translateY(${(1 - bi) * 20}px)`)
      L$.col7.style.opacity = String(1 - out)
      vis(L$.rul7, (t >= 14.8 ? 1 : 0) * (1 - out)); L$.rul7in.style.clipPath = `inset(-40px ${(1 - e2io(seg(t, 14.8, 15.1))) * 100}% -10px 0)`
      const td = seg(t, 15.0, 15.15); L$.today7.style.transform = `scaleY(${td})`; L$.today7.style.opacity = String(td)
      vis(L$.rc7, (t >= 15.05 ? 1 : 0) * (1 - out), LG.k7 < 1 ? `scale(${LG.k7})` : 'none')
      L$.paper.style.clipPath = `inset(0 0 ${(1 - seg(t, 15.05, 15.1 + 0.066 * 9)) * 100}% 0)`
      items7.forEach((el, i) => { const k = seg(t, 15.1 + i * 0.066, 15.1 + i * 0.066 + 0.15); el.style.opacity = String(k) })
      L$.strike.style.transform = `scaleX(${seg(t, 15.55, 15.7)})`
      // '₩0'부터 세지 않는다: 세기 전에는 보이지 않고, 금액의 절반에서 나타나 최종값까지
      { const k = e3o(seg(t, 15.7, 16.0)); setT(L$.save7, won(c.save * (0.5 + 0.5 * k))); L$.save7.style.opacity = k >= 1 ? '' : String(clamp(k / 0.15)) }
      L$.save7.style.visibility = t >= 16.2 ? 'hidden' : ''
    }
    /* S8 — full-width fund flow */
    const on8 = t >= 16.2 && t < 18.55; vis(L$.s8, on8 ? 1 : 0); vis(L$.passD, t >= 16.5 ? 1 : 0)
    if (on8) {
      const out = seg(t, 18.2, 18.4)
      L$.s8.style.opacity = String(1 - out)
      const k = e2io(seg(t, 16.2, 16.5)), src = LG.sv!, tg = LG.fly!, sc = LG.flyH ? src.h / LG.flyH : 1
      L$.fly8.style.transform = `translate(${(src.x - tg.x) * (1 - k)}px,${(src.y - tg.y) * (1 - k)}px) scale(${sc + (1 - sc) * k})`
      setT(L$.fly8, won(c.save)); FLY.lab.style.visibility = 'visible'; FLY.lab.querySelector<HTMLElement>('small')!.style.opacity = String(seg(t, 16.5, 16.65))
      // S7이 빠지는 동안(16.2~16.35) 제목이 이어 올라온다 — 예전 16.5에서는 0.2만큼 흰 화면만 남았다
      revL(L$.tt8, 16.24, t); vis(L$.tt8, t >= 16.24 ? 1 : 0)
      const fp = seg(t, 16.8, 17.7)
      L$.pm8.style.strokeDashoffset = String(1 - seg(fp, 0, 0.35))
      lanes8.forEach((p_) => { p_.style.strokeDashoffset = String(1 - seg(fp, 0.35, 1)) })
      NODES.forEach((n) => {
        const a = n.at, v = fp >= a - 0.005 && t >= 16.8 ? 1 : 0; n.el.style.visibility = n.lab.style.visibility = v ? 'visible' : 'hidden'
        setT(n.b, n.date ? ymd(withdrawDate()) : won(n.val!() * (0.5 + 0.5 * e3o(seg(fp, a, a + 0.17))))) // '₩0'부터 세지 않는다
      })
      const bk = seg(t, 17.7, 18.0); vis(L$.big8, bk > 0 ? 1 : 0, `translateY(${(1 - e3o(bk)) * 16}px)`)
      LL('A8').forEach((e) => setT(e, won(disp.A * (0.5 + 0.5 * e3o(bk))))) // 합계는 bk > 0일 때만 보이므로 '₩0'이 나오지 않는다
    }
    /* S9 — service list + one live app screen */
    const on9 = t >= 18.2; vis(L$.s9, on9 ? 1 : 0)
    if (on9) {
      // S8이 빠지는 동안(18.2~18.4) 제목·목록·노트북이 이어 들어온다 — 예전에는 18.4~18.55가 빈 화면이었다
      revL(L$.tt9, 18.3, t); vis(L$.tt9, t >= 18.3 ? 1 : 0)
      vis(L$.list9, seg(t, 18.38, 18.58))
      const ai = e3o(seg(t, 18.42, 18.62)); vis(L$.app9, ai, `translateY(${(1 - ai) * 24}px) ${TILT3}`) // 오프닝~S2 노트북과 같은 기울기
      const live = t >= 18.8, idx = clamp(Math.floor((t - 18.8) / 0.4), 0, 6)
      items9.forEach((e, i) => e.classList.toggle('on', live && i === idx))
      panels9.forEach((p_, i) => {
        const s0 = 18.8 + i * 0.4, kin = i ? e3o(seg(t, s0, s0 + 0.18)) : 1, kout = i < 6 ? e3o(seg(t, s0 + 0.4, s0 + 0.58)) : 0
        p_.style.visibility = kin > 0 && kout < 1 ? 'visible' : 'hidden'; p_.style.transform = `translateY(${((1 - kin) - kout) * 100}%)`
      })
      tabs9.forEach((e, i) => e.classList.toggle('on', i === TABS9[live ? idx : 0]))
      setT(L$.addr9, PATH9[live ? idx : 0])
      vis(L$.kiroo, seg(t, 18.7, 18.85)); vis(L$.bub9, seg(t, 20.4, 20.5) * (1 - seg(t, 20.7, 20.8)))
      L$.disc9.style.opacity = String(seg(t, 18.8, 19.0))
    }
  }

  /* ===== frame render ===== */
  const e2o = (q: number) => 1 - (1 - q) * (1 - q), e2io = (q: number) => q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2
  let lastPct = -1, lastDay = -1
  /* S4 → S5: 노트북 웹 화면이 창이 된다(새 시간)
     10.12~10.24 도착한 지도가 웹 화면 칸 안에서 밝은 서울 아침 사진으로 바뀐다 · 10.24~10.42 카메라가 그 칸으로 다가가 사진이 무대를 채운다
     → S5 바탕(같은 사진·같은 자리)이 이어받고 그 하늘 위에 날짜·문구·1년 눈금이 나온다 */
  const monUiEl = byId('monUI'), heroEl = byId('hero')
  const sv = (e: HTMLElement, o: number, tf = '') => { e.style.visibility = o > 0 ? 'visible' : 'hidden'; e.style.opacity = String(o); e.style.transform = tf }
  function monitorFrame(t: number) {
    const g = GEO; if (!g) return
    A.sil = 0
    // S4는 노트북(곧은 자세) 웹 화면의 내용 칸. S5로 갈 때는 노트북 자세가 그 칸을 무대 가득으로 키운다
    const p = laptopPose(t, 1), rc = poseRect(p, CT), x0 = rc.x, y0 = rc.y, w = rc.w, h = rc.h
    const zk = RM ? (t >= 10.3 ? 1 : 0) : e2io(seg(t, 10.24, 10.42))
    const tf = `translate(${(x0 - g.SCR.x).toFixed(1)}px,${(y0 - g.SCR.y).toFixed(1)}px) scale(${(w / g.SCR.w).toFixed(4)})`
    monUiEl.style.transformOrigin = '0 0'
    // 정보 띠는 노트북이 곧은 자세로 돌아와 비행 화면이 들어온 뒤(8.78~8.9) 나타나고, 카메라가 다가가기 전에 사라진다
    sv(monUiEl, t >= 8.7 && t < 10.44 ? seg(t, 8.78, 8.9) * (1 - seg(t, 10.18, 10.26)) : 0, tf)
    // 서울 야경: 모니터 화면 모양대로 잘려 보이다가 화면과 함께 커진다. 하늘이 다 덮이면(10.7) S5 바탕이 이어받는다
    const back = t >= 12.2 // S5 → S6: 화면 가득한 사진이 다시 칸 속으로 줄어든 뒤 걷힌다
    const hv = (t >= 10.1 && t < 10.7) || (back && t < 12.58)
    const ho = back ? 1 - (RM ? (t >= 12.5 ? 1 : 0) : seg(t, 12.5, 12.57)) : RM ? (t >= 10.3 ? 1 : 0) : seg(t, 10.12, 10.24)
    sv(heroEl, hv ? ho : 0)
    if (hv) {
      // S4 → S5: 다가가기 후반에는 사진 윗변이 노트북 화면 칸보다 먼저 무대 위끝까지 올라간다(화면 위 웹 머리글이 얇은 흰 띠로 한두 프레임 보이지 않게)
      const ef = back ? 1 : 1 - e2io(seg(zk, 0.35, 0.75))
      heroEl.style.clipPath = `inset(${(Math.max(0, y0 + BY) * ef).toFixed(1)}px ${Math.max(0, g.vw + BX - x0 - w).toFixed(1)}px ${Math.max(0, g.vh + BY - y0 - h).toFixed(1)}px ${Math.max(0, x0 + BX).toFixed(1)}px round ${(2 * (1 - zk)).toFixed(1)}px)`
    }
    if (t < g.T1x) return                       // S0–S1: map viewport is tween-driven
    if (t < 8.55) { V.o = 0; return }
    // 지도는 노트북 웹 화면이 비행 화면으로 바뀌는 동안 나타나고(8.58~8.68), S5 사진이 다 들어오면 사라진다
    Object.assign(V, { x: x0, y: y0, w, h, r: 0, bg: 1, o: t >= 10.44 ? 0 : seg(t, 8.58, 8.68) * (1 - seg(t, 10.24, 10.3)) })
  }
  // 레터박스(16:9가 아닐 때 무대 밖에 남는 칸) 색: 지금 보이는 장면 배경. [시작 시간, 위쪽 색, 아래쪽 색]
  const BARS: Array<[number, string, string]> = [
    [0, '--bg-s0', '--bg-s0'], [R(2.7), '--bg-s1', '--bg-s1'], [R(5.15), '--bg-s2', '--bg-s2'], [7.35, '--bg-s3', '--bg-s3'],
    [R(8.6), '--bg-s4', '--bg-s4'], [10.42, '--bg-s4', '--bg-s4'], [12.35, '--bg-s6', '--bg-s6'],
    [14.35, '--bg-s7', '--bg-s7'], [16.35, '--bg-s8', '--bg-s8'], [18.35, '--bg-s9', '--bg-s9'],
  ]
  const stageBox = byId('stage')
  let barK = -1
  function paintBars(t: number) {
    let i = 0
    BARS.forEach((b, k) => { if (t >= b[0]) i = k })
    if (i === barK) return
    barK = i
    stageBox.style.setProperty('--lb-t', `var(${BARS[i][1]})`); stageBox.style.setProperty('--lb-b', `var(${BARS[i][2]})`)
  }
  function onTL() {
    if (!tl) return
    const t = tl.time()
    paintBars(t)
    if (GEO && t < GEO.T1x) s01Frame()
    tzFrame(t)
    monitorFrame(t); map.drawMap()
    renderLate(t)
    updBoard(t, boardLive())
    if (K.v !== K.last) { K.last = K.v; paintBig() }
    const pct = Math.round(P.v * 100)
    // 원본과 다른 곳: 원본은 진행률(pct)이 바뀔 때만 #mDay·#mLab1을 갱신해서, 빠른 스크롤로 P.v가 0.995~0.999에서 pct=100이 된 뒤
    // 정확히 1이 되면 D-1 · 예상 금액이 남았다. D-day 단계(day)가 바뀔 때도 갱신하도록 조건만 추가했다.
    const day = P.v >= 1 ? 0 : P.v > 0.5 ? 1 : 2
    if (pct !== lastPct || day !== lastDay) {
      lastPct = pct; lastDay = day; byId('mPct').textContent = `진행률 ${pct}%`
      byId('mDay').textContent = P.v >= 1 ? 'D-0' : P.v > 0.5 ? 'D-1' : 'D-2'
      byId('mLab1').textContent = P.v >= 1 ? '확정 원화 금액' : '예상 원화 금액(가환전)'
    }
    const n = STAMPS.filter((x) => t >= x).length
    if (stampN < 0) { setStamps(n); stampN = n; return }
    if (n !== stampN) {
      setStamps(n)
      stampN = n
    }
  }
  const words11 = $$('#w11 .ml>span')
  // S11 요약 카드가 줄어 들어갈 패스포트 탭 위치(무대 좌표) — build11()에서 계산
  const P11 = { dx: 72, dy: 62, w: 72, h: 88 }
  // S11 사진, 요약 카드 안의 도장 줄(.s11st)과 그 밖의 내용
  const ph11img = $('#ph11 img'), st11 = $('.s11st'), rest11 = ([...L$.sum11c.children] as HTMLElement[]).filter((e) => e !== st11)
  const MID11 = 0.58 // 도장이 먼저 보이는 중간 크기(카드의 0.58배 — 제 크기의 도장 5개가 한 줄에 들어가는 폭)
  function render11(p: number) {
    paintLate()
    // 사진은 처음부터 다 보인다 — 예전에는 아래에서 열리느라(0~0.3) FAQ 다음이 반 화면 넘게 흰 빈 화면이었다
    L$.ph11.style.clipPath = 'none'
    // 사진이 아주 천천히 다가온다(1.06 → 1) — 움직임 줄이기면 확대 없음
    const z = RM ? 1 : 1.06 - 0.06 * e2o(seg(p, 0, 2))
    ph11img.style.transform = z === 1 ? '' : `scale(${z})`
    words11.forEach((s_, i) => { const k = e3o(seg(p, 0.3 + i * 0.3, 0.3 + i * 0.3 + 0.22)); s_.style.transform = `translateY(${(1 - k) * 112}%)` })
    // 요약 카드: 패스포트 탭 자리에서 중간 크기로 커지며 도장 5개가 먼저 보이고(kA), 잠깐 멈췄다가 카드로 커진다(kB).
    // 움직임 줄이기면 도장 단계 없이 예전처럼 한 번에(kA = kB)
    const kB = e3o(seg(p, RM ? 1.2 : 1.3, 1.5)), kA = RM ? kB : e3o(seg(p, 1.14, 1.26)), k = RM ? kB : 0.4 * kA + 0.6 * kB
    const c = L$.sum11, w = c.offsetWidth || 380, h = c.offsetHeight || 360
    const g = P11, tw = g.w / w, th = g.h / h
    const sx = tw + (MID11 - tw) * kA + (1 - MID11) * kB, sy = th + (MID11 - th) * kA + (1 - MID11) * kB
    vis(c, p >= (RM ? 1.2 : 1.14) ? 1 : 0, `translate(${g.dx * (1 - k)}px,${g.dy * (1 - k)}px) scale(${sx},${sy})`)
    const co = String(seg(kB, 0.6, 1))
    L$.sum11bg.style.opacity = String(1 - kB); rest11.forEach((e) => { e.style.opacity = co })
    // 도장 줄은 카드가 줄어 있는 동안에도 제 크기로 보이게 카드 배율을 되돌린다(카드가 다 커지면 그대로 제자리). 줄이 다 들어갈 만큼 커진 뒤에 나타난다
    st11.style.opacity = RM ? co : String(seg(p, 1.19, 1.26))
    st11.style.transform = RM || (sx === 1 && sy === 1) ? '' : `scale(${1 / sx},${1 / sy})`
  }

  /* ===== passport tab + 챕터 도장 ===== */
  // 도장 5개는 각 단계의 마지막 박자 바로 앞(-0.01)에서 찍힌다 — 발표 모드로 그 박자에 다 도착한 뒤. 박자: S1 4.25 · S2 6.2 · S3 8.3 · S5 12.17 · S6 14.05
  const STAMPS = [4.24, 6.19, 8.29, 12.16, 14.04], STL = ['계좌 개설', '입고', '매도', '확정', '외부감시']
  const pass = byId('pass'), stI = $$('.st i'); let stampN = 0
  // 도장마다 정해 둔 기울기(도) — 손으로 찍은 것처럼 조금씩 다르게
  const TILT = [-7, 5, -4, 8, -6], stBox = stI.map((i) => i.parentElement as HTMLElement)
  function setStamps(n: number) { stI.forEach((st_, i) => gsap.set(st_, { opacity: i < n ? 1 : 0, scale: 1, rotation: TILT[i] })); gsap.set(stBox, { '--ink-o': 0, '--ink-s': 1 }); gsap.set(pass, { y: 0 }); byId('pCount').textContent = `${n}/5`; byId('stLab').textContent = n ? `${STL[n - 1]} 도장` : '' }

  /* ===== master timeline (one take) ===== */
  const stageEl = $('#stg')
  // 화면에서 잰 위치를 무대(1920×1080) 좌표로 — 무대가 scale(SS)로 그려지므로 배율로 나눈다
  const rel = (el: Element) => { const s = stageEl.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: (r.left - s.left) / SS, y: (r.top - s.top) / SS, w: r.width / SS, h: r.height / SS } }
  const ANIM = '#hdr,#tz,#bg3,#bg4,#seal,.kv b,.gln,.c2r,.c2res,.c2n,#board,#c3,#mon,#monUI,#c4,#c4a,#c4lab,#hero,#hero img,#slogan,#pass,.ml>span'

  /** 새 시간(장면표 단위, S0 0~2.5·S1 2.5~4.5) → 타임라인에 넣는 옛 시간(R()의 역함수, S1까지만) */
  const nt = (t: number) => (t <= 2.5 ? t * 2.95 / 2.5 : t <= 4.5 ? 2.95 + (t - 2.5) * 1.9 / 2 : t + 0.35)

  /* ===== 오프닝~S2: 토스 메인과 같은 화면 문법(landing-toss-ref.md). 시간 t는 장면표 단위(S0 0~2.5 · S1 2.5~4.5 · S2 4.5~6.5) =====
     A 0~2.34   둥근 사진 카드(위 88·옆 16·아래 24, 모서리 24) → 화면 가득(토스: 1.5화면 동안 power3.out, 사진 1.2배 → 1배)
     B 2.5~3.0  기울어진 기기가 아래에서 올라와 사진 위에 겹친다
       3.0~3.45 사진이 둥근 카드(inset 180·160, 모서리 24)로 줄어든다(토스 측정 곡선 ≈ power3.out)
       3.5~4.2  사진 카드가 위로 빠지고 흰 바탕에 기기만 남는다
     C 3.7~     제목 단어마다 흐림 16px → 선명(토스: blur ≈ 16 × (1 − 불투명도)), 설명은 회색 20% → 진하게
       4.5~4.85 기기 화면이 확인서 → 입고 카드로 넘어가고 제목이 바뀐다
     움직임 줄이기: 각 장면의 끝난 상태(완성 화면)만 */
  function s01Frame() { Object.assign(V, { o: 0 }) } // 지도는 S4 기내 모니터부터
  const tzHero = byId('tzHero'), tzImg = $('#tzHero .tzh-ph img'), tzW = $('#tzHero .tzh-w'), tzDev = byId('tzDev')
  const tzP1 = byId('tzP1'), tzP2 = byId('tzP2'), tzP3 = byId('tzP3'), tzP4 = byId('tzP4'), tzP5 = byId('tzP5'), tzC3 = byId('c3t'), tzC1 = byId('c1'), tzC2 = byId('c2'), tzC1p = byId('c1p'), tzS1 = byId('s1')
  const bw1 = $$('#c1 .bw'), bw2 = $$('#c2 .bw'), bw3 = $$('#c3t .bw')
  // 노트북 기울기: 토스 휴대폰 각도(측정한 matrix3d ≈ Z 10°, X 21°)에서 가져와 가로 노트북에 맞게 줄였다
  const TILT3 = 'perspective(2400px) rotateX(18deg) rotateZ(-5deg)'
  // 노트북 화면(.lt-scr) 크기·위치(노트북 기준점 = 가운데에서 잰 값, landing.css: 몸체 1140×870, 화면 테두리 14px, 화면 높이 700)
  const SCR_W = 1112, SCR_H = 700, SCR_CY = 14 + SCR_H / 2 - 870 / 2, SCR_FILL = 1920 / SCR_W
  let zk = 0 // 카메라가 노트북 화면으로 다가간 정도(0~1)
  // 노트북 자세: tx·ty 이동, s 배율, rx·rz 기울기. 기준점 = 노트북 가운데
  type Pose = { tx: number; ty: number; s: number; rx: number; rz: number }
  const lerpP = (a: Pose, b: Pose, k: number): Pose => ({ tx: lerp(a.tx, b.tx, k), ty: lerp(a.ty, b.ty, k), s: lerp(a.s, b.s, k), rx: lerp(a.rx, b.rx, k), rz: lerp(a.rz, b.rz, k) })
  const devO = () => ({ ox: tzDev.offsetLeft + tzDev.offsetWidth / 2, oy: tzDev.offsetTop + tzDev.offsetHeight / 2 })
  // S4 웹 화면 내용 칸(브라우저 줄 42 + 웹 머리글 60 아래, 노트북 기준 좌표) — 지도·정보 띠·S5 사진이 여기에 맞춰진다
  const CT = { x: 14, y: 14 + 102, w: SCR_W, h: SCR_H - 102 }
  function laptopPose(t: number, r: number): Pose {
    const { ox, oy } = devO()
    const rest: Pose = { tx: 0, ty: lerp(1080, 0, r), s: 1, rx: 18, rz: -5 }
    const flat: Pose = { tx: 0, ty: 0, s: 1, rx: 0, rz: 0 }
    const f3: Pose = { tx: 960 - ox, ty: 540 - oy - SCR_CY * SCR_FILL, s: SCR_FILL, rx: 0, rz: 0 }
    const s5 = Math.max((1920 + 2 * BX) / CT.w, (1080 + 2 * BY) / CT.h), cy5 = CT.y + CT.h / 2 - 870 / 2
    const f5: Pose = { tx: 960 - ox, ty: 540 - oy - cy5 * s5, s: s5, rx: 0, rz: 0 }
    const st = (a: number) => (RM ? (t >= a ? 1 : 0) : 0)
    if (t >= 14.2) return lerpP(flat, f5, RM ? st(14.3) : e2io(seg(t, 14.2, 14.45))) // S6 → S7: 웹 화면(흰 페이지)으로 다가가 무대를 채운다
    if (t >= 12.2) return lerpP(f5, flat, RM ? st(12.3) : e2io(seg(t, 12.22, 12.5))) // S5 → S6: 사진이 다시 웹 화면 칸 속으로(S4 → S5의 반대)
    if (t >= 10.24) return lerpP(flat, f5, RM ? st(10.3) : e2io(seg(t, 10.24, 10.42)))
    if (t >= 8.4) return lerpP(f3, flat, RM ? st(8.5) : e2io(seg(t, 8.4, 8.75)))
    if (t >= 6.8) return lerpP(rest, f3, zk)
    return rest
  }
  const poseTf = (p: Pose) => `translate(${p.tx.toFixed(1)}px,${p.ty.toFixed(1)}px) perspective(2400px) rotateX(${p.rx.toFixed(3)}deg) rotateZ(${p.rz.toFixed(3)}deg) scale(${p.s.toFixed(4)})`
  /** 기울기 없는 자세에서 노트북 기준 사각형 → 무대 사각형 */
  const poseRect = (p: Pose, rc: { x: number; y: number; w: number; h: number }) => {
    const { ox, oy } = devO(), L = tzDev.offsetLeft, T = tzDev.offsetTop
    return { x: ox + p.tx + (L + rc.x - ox) * p.s, y: oy + p.ty + (T + rc.y - oy) * p.s, w: rc.w * p.s, h: rc.h * p.s }
  }
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k
  const blurIn = (els: HTMLElement[], t0: number, t: number, step = 0.05, d = 0.22) => els.forEach((e, i) => {
    const k = RM ? 1 : e3o(seg(t, t0 + i * step, t0 + i * step + d))
    e.style.opacity = String(k); e.style.filter = k >= 1 ? '' : `blur(${(16 * (1 - k)).toFixed(2)}px)`
  })
  function tzFrame(t: number) {
    const on = t < 10.7 || (t >= 12.2 && t < 14.47), tzBox = tzHero.parentElement!
    tzBox.style.visibility = on ? 'visible' : 'hidden'
    tzBox.style.opacity = on ? '1' : '0' // 자식이 visibility를 따로 켜 두므로 불투명도로도 확실히 숨긴다
    zk = RM ? (t >= 6.8 ? 1 : 0) : e2io(seg(t, 6.8, 7.35))
    if (!on) return
    // A: 사진 카드 → 화면 가득
    const a = RM ? (t >= 2.34 ? 1 : 0) : e2o(seg(t, 0, 2.34)) // 사진이 아주 천천히 다가온다(1.06 → 1)
    // B: 다시 둥근 카드로(3.0~3.45), 위로 빠짐(3.5~4.2)
    const b = RM ? (t >= 3.0 ? 1 : 0) : e3o(seg(t, 3.0, 3.45)), up = RM ? (t >= 3.5 ? 1 : 0) : e3o(seg(t, 3.5, 4.2))
    // 처음부터 화면 가득(여백·모서리 0). S1에서 노트북이 올라올 때만 둥근 카드(inset 180·160, 모서리 24)로 줄어든다. 사진은 레터박스까지 늘어나 있으므로 그만큼 더 안쪽으로
    const top = 180 * b + BY * b, side = 160 * b + BX * b, bot = top, rad = 24 * b
    tzHero.style.clipPath = `inset(${top.toFixed(1)}px ${side.toFixed(1)}px ${bot.toFixed(1)}px ${side.toFixed(1)}px round ${rad.toFixed(1)}px)`
    tzHero.style.transform = up > 0 ? `translateY(${(-(1080 + 2 * BY) * up).toFixed(1)}px)` : ''
    tzHero.style.visibility = up >= 1 ? 'hidden' : 'visible'
    tzImg.style.transform = `scale(${(1.06 - 0.06 * a).toFixed(4)})`
    const wo = RM ? (t < 2.5 ? 1 : 0) : 1 - seg(t, 2.45, 2.75)
    tzW.style.opacity = String(wo)
    // 기기: 아래에서 올라온다(2.5~3.0)
    const r = RM ? (t >= 2.5 ? 1 : 0) : e3o(seg(t, 2.5, 3.0))
    tzDev.style.visibility = r > 0 ? 'visible' : 'hidden'
    // 노트북 자세(S3 화면 가득 → S4 곧은 자세 → S5 내용 칸 가득): laptopPose
    tzDev.style.transform = t < 6.8 && zk === 0 ? `translateY(${lerp(1080, 0, r).toFixed(1)}px) ${TILT3}` : poseTf(laptopPose(t, r))
    // 왼쪽 글자(흰 바탕이 드러난 뒤)
    const s1on = t >= 3.6
    tzS1.style.visibility = s1on ? 'visible' : 'hidden'
    const sw = RM ? (t >= 4.5 ? 1 : 0) : e3o(seg(t, 4.5, 4.85))
    blurIn(bw1, 3.7, t)
    const o1 = 1 - (RM ? sw : seg(t, 4.5, 4.65))
    tzC1.style.opacity = String(o1); tzC1.style.visibility = s1on && o1 > 0 ? 'visible' : 'hidden'
    tzC1p.style.opacity = String(RM ? 1 : 0.2 + 0.8 * seg(t, 3.95, 4.2))
    // S2 제목은 S3 문장이 나오기 전에 사라진다(겹침 방지)
    const o2 = 1 - (RM ? (t >= 6.3 ? 1 : 0) : seg(t, 6.25, 6.38))
    tzC2.style.opacity = String(o2); tzC2.style.visibility = (t >= 4.6 || (RM && t >= 4.5)) && o2 > 0 ? 'visible' : 'hidden'
    blurIn(bw2, 4.65, t, 0.04)
    // S3 문장(한 문장): 6.38부터 단어마다 선명해지고, 카메라가 화면으로 다가갈 때 왼쪽으로 물러난다
    const o3 = 1 - (RM ? (t >= 6.8 ? 1 : 0) : seg(t, 6.78, 6.92)) // 커지는 화면이 문장에 닿기 전에 먼저 사라진다(잘린 글자가 보이지 않게)
    tzC3.style.visibility = t >= 6.36 && o3 > 0 ? 'visible' : 'hidden'; tzC3.style.opacity = String(o3); tzC3.style.filter = o3 < 1 ? `blur(${(8 * (1 - o3)).toFixed(2)}px)` : ''
    tzC3.style.transform = `translateY(-50%) translateX(${(-240 * zk).toFixed(1)}px)`
    blurIn(bw3, 6.38, t, 0.03, 0.18)
    // 기기 화면: 확인서가 위로 빠지고 입고 카드가 아래에서
    tzP1.style.transform = sw > 0 ? `translateY(${(-100 * sw).toFixed(2)}%)` : ''
    tzP2.style.transform = `translateY(${(100 * (1 - sw)).toFixed(2)}%)`
    tzP1.style.visibility = sw >= 1 ? 'hidden' : 'visible'
    // 입고 카드가 위로 빠지고 매도 주문 화면이 아래에서(6.3~6.6)
    const sw3 = RM ? (t >= 6.3 ? 1 : 0) : e3o(seg(t, 6.3, 6.6))
    if (sw3 > 0) tzP2.style.transform = `translateY(${(-100 * sw3).toFixed(2)}%)`
    tzP2.style.visibility = sw > 0 && sw3 < 1 ? 'visible' : 'hidden'
    // S3 → S4: 노트북이 물러나는 동안 매도 화면이 위로 빠지고 비행 화면이 아래에서(8.5~8.72)
    const sw4 = RM ? (t >= 8.5 ? 1 : 0) : e3o(seg(t, 8.5, 8.72))
    tzP3.style.transform = `translateY(${(100 * (1 - sw3) - 100 * sw4).toFixed(2)}%)`; tzP3.style.visibility = sw3 > 0 && sw4 < 1 ? 'visible' : 'hidden'
    tzP4.style.transform = `translateY(${(100 * (1 - sw4)).toFixed(2)}%)`; tzP4.style.visibility = sw4 > 0 && t < 12.2 ? 'visible' : 'hidden'
    // S6: 사진이 칸 속으로 들어오는 동안 웹 화면은 연결 계좌 점검 페이지(사진이 덮고 있다가 걷힌다)
    tzP5.style.visibility = t >= 12.2 ? 'visible' : 'hidden'
  }

  function build() {
    const prog = st ? st.progress : 0
    if (st) st.kill()
    if (tl) tl.kill()
    fit()
    const vw = SW, vh = SH // 무대 크기(장면 배치용)
    $('#pinA').style.height = (SCROLL_TOTAL + 1) * innerHeight + 'px' // 스크롤 길이는 실제 화면 높이 기준(장면별 길이는 landingScenes의 SCREENS)
    map.readColors(document.documentElement) // 캔버스 색은 build() 때 CSS 변수에서 읽는다
    map.resize(vw, vh, SS)
    map.buildGrid()
    gsap.set($$(ANIM), { clearProps: 'all' })


    /* S4 화면: 노트북(곧은 자세) 웹 화면의 내용 칸 */
    const SCR = poseRect({ tx: 0, ty: 0, s: 1, rx: 0, rz: 0 }, CT), MOFF = 80
    Object.assign($('#monUI').style, { left: SCR.x + 'px', top: SCR.y + 'px', width: SCR.w + 'px', height: SCR.h + 'px' })
    GEO = { SCR, MOFF, vw, vh, T1x: R(4.93), T4: R(8.7), TX: R(11.15), dR: R(9.15) - R(8.7), dX: R(11.6) - R(11.15) }
    buildLate(vw, vh)

    Object.assign(V, { x: 0, y: 0, w: vw, h: vh, r: 0, bg: 0, o: 1 })
    Object.assign(C, { cx: MW / 2, cy: MH / 2, z: 1 })
    Object.assign(A, { sw: -0.2, krDot: 0, ro: 0, krLit: 0, lit: 0, dimOn: 0 }); P.v = 0; K.v = 0; K.last = -1

    gsap.set(['#bg1', '#bg2', '#bg3', '#bg4', '#seal', '.kv b', '.c2res', '.c2n', '#c3', '#mon', '#monUI', '#c4', '#c4a', '#c4lab', '#hero', '#slogan', '#pass'], { autoAlpha: 0 })
    gsap.set($$('#stg .ml>span'), { yPercent: 0, opacity: 1 })

    tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: onTL })
    wrapTL(tl)
    const q = (sel: string | string[]) => $$(String(sel))
    const OUT = (t: number, sel: string | string[], d = 0.16, y = -10) => tl!.to(q(sel), { autoAlpha: 0, y, duration: d, ease: 'power1.in' }, t)

    const at = (a: number, b: number) => ({ p: nt(a), d: nt(b) - nt(a) })
    /* S0~S2 화면 배치·움직임은 tzFrame(t). 여기는 확인서·입고 카드 안의 값 채우기만 */
    tl.to('#hdr', { autoAlpha: 0, y: -8, duration: at(0.5, 0.9).d }, at(0.5, 0.9).p) // 사진이 화면을 거의 채울 때 머리 글자가 물러난다
    const glns = $$('.gln'), pulse = (g: HTMLElement, t: number, d: number) => { tl!.fromTo(g, { opacity: 0 }, { opacity: 1, duration: 0.04, immediateRender: false }, t); tl!.to(g, { opacity: 0, duration: 0.06 }, t + d) }
    $$('.kv b').forEach((b, i) => { const p = nt(3.85 + i * 0.07); tl!.fromTo(b, { autoAlpha: 0, x: -8 }, { autoAlpha: 1, x: 0, duration: 0.12, ease: 'power2.out' }, p); pulse(glns[i], p, 0.19) })
    tl.fromTo(K, { v: 0 }, { v: 1, duration: at(4.0, 4.24).d, ease: 'power2.out' }, at(4.0, 4.24).p); pulse(glns[3], at(4.0, 4.24).p, 0.3)
    tl.fromTo('#seal', { autoAlpha: 0, scale: 2.2, rotate: -28 }, { autoAlpha: 1, scale: 1, rotate: -12, duration: 0.15, ease: 'power3.in' }, at(4.1, 4.2).p)

    /* S2 — 입고 카드(기기 화면 안): 세 수량 → 가장 작은 값 */
    const rws = $$('.c2r')
    // 세 수량은 입고 카드가 화면에 들어오면서 바로 보이고, 이어서 곧바로 입고 수량 100주가 확정된다(기다리는 구간 없음)
    tl.to([rws[0], rws[2]], { opacity: 0.28, duration: at(4.9, 5.0).d }, at(4.9, 5.0).p)
    tl.fromTo('.c2res', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: at(4.95, 5.08).d, ease: 'power3.out' }, at(4.95, 5.08).p)
    tl.fromTo('.c2n', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 6.42)
    /* → S3: 노트북 화면이 매도 페이지(안내판)가 되고, 카메라가 그 화면으로 계속 다가가 웹 화면이 무대를 채운다(tzFrame) — 한 번의 연속 움직임.
       다가가는 동안 행이 위에서부터 차례로 켜진다 */
    const n3 = (t: number) => 6.85 + (t - 6.5) * 0.85 // 새 시간(S3 6.5~8.5) → 옛 시간
    tl.fromTo(q('#board .rows > .br'), { opacity: 0.25 }, { opacity: 1, duration: 0.04, stagger: (n3(7.3) - n3(6.85) - 0.04) / 11, immediateRender: false }, n3(6.85))

    /* S3 — 매도 보드: 상태가 위에서 아래로 넘어간다(TH). 문장은 보드 아래 흰 글자로 흐림 10px → 선명 */
    tl.fromTo('#c3', { autoAlpha: 0, filter: 'blur(10px)' }, { autoAlpha: 1, filter: 'blur(0px)', duration: n3(7.36) - n3(7.2), ease: 'power2.out', immediateRender: false }, n3(7.2))
    OUT(8.47, '#c3', 0.12, 16)
    /* → board lifts away, seat-back monitor rises from below (monitor + map viewport: monitorFrame) */
    // 보드 기준점은 왼쪽 가운데(0% 50%): 그 기준으로 모니터 화면(SCR) 자리·크기에 맞춘다
    tl.set('#bg4', { autoAlpha: 1 }, 8.6)
    tl.set(C, { cx: MW / 2, cy: MH * 0.47, z: 1 }, 8.7)
    tl.set(A, { krDot: 0, sw: 2, ro: 1, dimOn: 1 }, 8.7)

    /* S4 — inflight map: NY & Tokyo → Seoul */
    // S4 제목: 노트북이 물러나며 왼쪽 열이 드러날 때(S1·S2 제목과 같은 흐림 16px → 선명)
    tl.set('#c4', { autoAlpha: 1 }, 8.8); tl.set('#c4a', { autoAlpha: 1 }, 8.8)
    tl.fromTo(q('#c4a .ml>span'), { opacity: 0, filter: 'blur(16px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.2, stagger: 0.08, ease: 'power3.out', immediateRender: false }, 8.8)
    tl.fromTo(P, { v: 0 }, { v: 1, duration: 1.15, ease: 'power1.inOut', immediateRender: false }, 9.2)
    tl.fromTo(A, { krLit: 0 }, { krLit: 1.15, duration: 0.4, immediateRender: false }, 10.0)

    const kb = Mp.krB || [[1000, 300], [1030, 330]], kh = kb[1][1] - kb[0][1], kcx = (kb[0][0] + kb[1][0]) / 2, kcy = (kb[0][1] + kb[1][1]) / 2
    const kz = (SCR.h * 0.8 / kh) / (SCR.w * 0.9 / MW)
    tl.to(A, { ro: 0, duration: 0.2 }, 10.35)
    tl.to(C, { cx: kcx, cy: kcy, z: kz, duration: 0.7, ease: 'power2.inOut' }, 10.35)
    tl.to(A, { lit: 1.06, duration: 0.5 }, 10.6)
    /* → screen grows to full frame (11.15), ₩ fade while Seoul at night appears */
    OUT(11.1, ['#c4a', '#c4lab'])
    // L-6 이후: S5~S9(renderLate)
    tl.add(() => {}, TOTAL)

    // 스크롤 → 타임라인 시간: 장면마다 스크롤 길이가 달라서(SCREENS) 진행률을 tOfU로 바꿔 시간을 정한다.
    // 예전 scrub 0.6과 같은 부드러움으로 따라가게 한다(움직임 줄이기면 바로)
    const tlNow = tl
    const follow = RM ? null : gsap.quickTo(tlNow, 'time', { duration: FOLLOW_SEC, ease: 'power3' })
    st = ScrollTrigger.create({ trigger: '#pinA', start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => { const t = tOfU(self.progress * SCROLL_TOTAL); if (follow) follow(t); else tlNow.time(t) },
      snap: RM ? { snapTo: SCN.map((s) => uOfT(s.done) / SCROLL_TOTAL), duration: 0.01, delay: 0.05 } : undefined })
    stampN = -1; rowState = rowState.map(() => -1); tl.time(tOfU(prog * SCROLL_TOTAL)); onTL()
    build11(); updNav()
  }

  /* ===== S11 closing (own pinned section) ===== */
  function build11() {
    const prog = st2 ? st2.progress : 0
    if (st2) st2.kill()
    if (tl2) tl2.kill()
    const pinB = byId('pinB'), w11 = byId('w11'), sum11 = byId('sum11')
    pinB.style.height = innerHeight * 3 + 'px'
    const pad = LG.pad || 96, avail = SW - pad * 2 - ((sum11.offsetWidth || 380) + 40)
    {
      // #s11이 화면에 붙어 있을 때 무대 왼쪽 위(화면 좌표) → 패스포트 탭 오른쪽 아래를 무대 좌표로
      const ox = (innerWidth - SW * SS) / 2, oy = (innerHeight - SH * SS) / 2, pr = passWrap.getBoundingClientRect()
      const sb = parseFloat(getComputedStyle(sum11).bottom) || 86
      Object.assign(P11, { dx: (pr.right - ox) / SS - (SW - pad), dy: (pr.bottom - oy) / SS - (SH - sb), w: 72 * UI / SS, h: 88 * UI / SS })
    }
    w11.style.fontSize = ''
    const fs = parseFloat(getComputedStyle(w11).fontSize), tw = w11.scrollWidth
    if (tw > avail) w11.style.fontSize = Math.max(48, fs * avail / tw) + 'px'
    tl2 = gsap.timeline({ paused: true, onUpdate: () => render11(tl2!.time()) })
    tl2.add(() => {}, 2)
    st2 = ScrollTrigger.create({ trigger: '#pinB', start: 'top top', end: 'bottom bottom', scrub: RM ? true : 0.6, animation: tl2,
      snap: RM ? { snapTo: [0, 0.85], duration: 0.01, delay: 0.05 } : undefined })
    tl2.progress(prog); render11(tl2.time())
  }

  /* ===== passport navigation ===== */
  const pnList = byId('pnList'), passWrap = byId('passWrap'), faq = byId('faq')
  // #faq에 zoom이 걸려 있어 offsetTop이 zoom 단위로 나오므로, 문서 맨 위부터의 실제 위치는 화면 좌표로 잰다
  const faqY = () => Math.round(faq.getBoundingClientRect().top + window.scrollY)
  const navLis = [...pnList.children] as HTMLElement[]
  const yOfT = (t: number) => (st ? st.start + uOfT(t) / SCROLL_TOTAL * (st.end - st.start) : 0)
  const sceneY = (i: number) => (i < SCN.length ? yOfT(i ? SCN[i].a + 0.3 : 0) : faqY())
  const goScene = (i: number) => lenis.scrollTo(sceneY(i), { duration: 1.2 })
  const onNavClick = (e: Event) => {
    const li = (e.target as Element).closest('li')
    const i = li ? navLis.indexOf(li) : -1
    if (i >= 0) goScene(i)
  }
  pnList.addEventListener('click', onNavClick)
  cleanups.push(() => pnList.removeEventListener('click', onNavClick))
  const pnAmt = byId('pnAmt')
  const onPnAmt = () => lenis.scrollTo(yOfT(R(4.6)), { duration: 1.2 })
  pnAmt.addEventListener('click', onPnAmt)
  cleanups.push(() => pnAmt.removeEventListener('click', onPnAmt))
  function curScene() {
    const y = scrollY
    if (y >= faqY() - innerHeight * 0.5) return SCN.length
    const t = st ? tOfU(clamp((y - st.start) / ((st.end - st.start) || 1)) * SCROLL_TOTAL) : 0
    let i = 0
    SCN.forEach((s, k) => { if (t >= s.a - 0.001) i = k })
    return i
  }
  const sceneNo = byId('sceneNo')
  function updNav() {
    const i = curScene()
    // 발표자용 현재 장면 번호(화면 구석): S0~S9, FAQ, S11
    const lab = scrollY >= byId('pinB').offsetTop - innerHeight * 0.5 ? 'S11' : i < SCN.length ? SCN[i].k : 'FAQ'
    if (sceneNo.textContent !== lab) sceneNo.textContent = lab
    navLis.forEach((li, k) => { li.classList.toggle('past', k < i); li.classList.toggle('cur', k === i) })
    passWrap.classList.toggle('gone', i === 0 || scrollY > byId('pinB').offsetTop - innerHeight * 0.4)
  }
  listen('scroll', updNav, { passive: true })
  /* ===== 발표 모드: 키 한 번에 다음·이전 박자 지점으로(landingScenes의 BEATS) ===== */
  const beatYs = () => {
    // 움직임 줄이기: 장면 완성 화면(done)에만 멈춘다(그 사이 박자는 다시 완성 화면으로 붙어 키가 헛돌았다)
    const ys = RM ? SCN.map((sc) => yOfT(sc.done)) : SCN.flatMap((sc) => (BEATS[sc.k] || []).map((t) => yOfT(t)))
    ys.push(faqY())
    if (st2) { ys.push(st2.start); S11_BEATS.forEach((p) => ys.push(st2!.start + p / 2 * (st2!.end - st2!.start))) }
    return ys.map(Math.round).sort((x, y) => x - y)
  }
  const easeIO = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
  let beatBusyUntil = 0
  listen('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const tg = e.target as Element | null
    // 입력창·아코디언(FAQ)에 포커스가 있으면 동작하지 않는다
    if (tg && tg.closest && tg.closest('input,textarea,select,[contenteditable],.qa')) return
    const nxt = (e.key === ' ' && !e.shiftKey) || e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown'
    const prv = (e.key === ' ' && e.shiftKey) || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp'
    if (!nxt && !prv) return
    if (e.key === ' ' && tg && tg.closest && tg.closest('button,a')) return // 버튼·링크에 포커스가 있으면 Space는 그 버튼을 누르는 키
    e.preventDefault()
    const now = performance.now()
    if (now < beatBusyUntil) return // 이동 중(잠금 시간)에는 추가 입력 무시 — 연타로 건너뛰지 않게
    const y = scrollY, pts = beatYs()
    const tgt = nxt ? pts.find((p_) => p_ > y + 8) : [...pts].reverse().find((p_) => p_ < y - 8)
    if (tgt == null) return
    beatBusyUntil = now + Math.max(BEAT_LOCK_SEC, BEAT_SEC) * 1000
    lenis.scrollTo(tgt, { duration: BEAT_SEC, easing: easeIO, lock: true, force: true })
  })

  /* ===== FAQ accordion (one open at a time) ===== */
  $$('.qa').forEach((qa) => on(qa.querySelector('.q') as HTMLElement, 'click', () => {
    const open = !qa.classList.contains('open')
    $$('.qa').forEach((x) => { x.classList.remove('open'); x.querySelector('.q')!.setAttribute('aria-expanded', 'false'); x.querySelector('.q i')!.textContent = '+' })
    if (open) { qa.classList.add('open'); qa.querySelector('.q')!.setAttribute('aria-expanded', 'true'); qa.querySelector('.q i')!.textContent = '−' }
    later(() => ScrollTrigger.refresh(), 380)
  }))

  /* ===== 로그아웃 안내(30분 무조작 로그아웃으로 돌아왔을 때) ===== */
  {
    let show = false
    try {
      if (sessionStorage.getItem(LOGOUT_NOTICE_KEY) === '1') { sessionStorage.removeItem(LOGOUT_NOTICE_KEY); lastNoticeAt = performance.now(); show = true }
      else if (performance.now() - lastNoticeAt < 500) show = true // StrictMode(개발) 재마운트: 앞 마운트가 이미 키를 지웠다
    } catch { /* sessionStorage 불가 환경이면 안내 없음 */ }
    if (show) {
      const d = document.createElement('div')
      d.setAttribute('role', 'status'); d.textContent = '30분이 지나 안전하게 로그아웃됐어요'
      d.style.cssText = 'position:fixed;top:96px;left:50%;transform:translateX(-50%);z-index:200;background:var(--color-surface);color:var(--color-ink);font:500 14px Pretendard,system-ui,sans-serif;padding:10px 16px;border-radius:4px;box-shadow:0 12px 32px rgba(16,24,40,.14)'
      document.body.appendChild(d)
      later(() => d.remove(), 3000)
      cleanups.push(() => d.remove())
    }
  }

  /* ===== 고정 상단 바(#hdr2) — S0 이후 위로 스크롤하면 내려옴 ===== */
  const bar = byId('hdr2')
  let last = window.scrollY, acc = 0, shown = false, hover = false
  const inS0 = () => {
    const hd = byId('hdr')
    return window.scrollY < 4 || (hd && parseFloat(getComputedStyle(hd).opacity) > 0.01 && getComputedStyle(hd).visibility !== 'hidden')
  }
  const set = (v: boolean) => { if (v !== shown) { shown = v; bar.classList.toggle('on', v) } if (v) tone() }
  // 화면 맨 위(0~88px)에 깔린 장면으로 색 세트 결정 — S0~S9는 고정 타임라인 진행 위치로, 이후는 섹션 위치로
  const DARK: Record<string, number> = { S11: 1 } // S0~S9는 밝은 장면, S11은 사진 위(흰 글자)
  const sceneNow = () => {
    if (st && tl && window.scrollY < st.end - 44) {
      const t = tl.time()
      return (SCN.find((x) => t >= x.a && t < x.b) || SCN[SCN.length - 1]).k
    }
    const hit = (id: string) => { const el = document.getElementById(id); if (!el) return false; const r = el.getBoundingClientRect(); return r.top <= 44 && r.bottom > 44 }
    if (hit('ftr')) return 'FTR'
    if (hit('pinB')) return 'S11'
    if (hit('faq')) return 'S10'
    return 'S10'
  }
  let toneK = ''
  const tone = () => {
    const k = sceneNow()
    if (k === toneK) return
    toneK = k
    bar.classList.toggle('lt', !(DARK[k] || k === 'FTR'))
    bar.dataset.scene = k
  }
  const onScroll = () => {
    const y = window.scrollY, d = y - last
    last = y
    if (shown) tone()
    if (inS0()) { acc = 0; set(false); return }
    // S11: 오프닝처럼 사진 위에 투명한 상단 바(흰 글자)를 계속 보여 준다
    if (sceneNow() === 'S11') { set(true); return }
    if (!d) return
    if ((d > 0) !== (acc > 0)) acc = 0
    acc += d
    if (acc <= -8) set(true)
    else if (acc >= 8 && !hover) set(false)
  }
  if (!RM) lenis.on('scroll', onScroll)
  else listen('scroll', onScroll, { passive: true })
  listen('mousemove', (e) => {
    if (e.clientY <= 16 && !inS0()) { hover = true; set(true) }
    else if (hover && e.clientY > 72) { hover = false }
  }, { passive: true })
  const lo = bar.querySelector<HTMLElement>('.lo')!
  const onLogo = (e: Event) => { e.preventDefault(); lenis.scrollTo(0) }
  lo.addEventListener('click', onLogo)
  cleanups.push(() => lo.removeEventListener('click', onLogo))

  /* ===== 시작: 첫 build ===== */
  setP(); ctx.add(build); paintNums()

  /* ===== 스크롤 복원(⑦): 뒤로 가기(POP)면 이전 위치, 그 밖의 진입은 맨 위 ===== */
  const savedY = opts.pop ? readSavedScroll(opts.historyKey) : null
  if (savedY != null && savedY > 0) {
    lenis.scrollTo(savedY, { immediate: true, force: true })
    window.scrollTo(0, savedY) // lenis가 없는 RM 모드에서도 같은 위치
    ScrollTrigger.update()
  } else if (opts.hash === '#faq') {
    // 다른 페이지(커뮤니티 끼루 답변 근거 등)에서 /#faq 로 들어오면 FAQ 위치로 — 원본 landing-journey.html#faq 도 같은 위치(faqY())에 선다
    const y = faqY()
    lenis.scrollTo(y, { immediate: true, force: true })
    window.scrollTo(0, y)
    ScrollTrigger.update()
  } else {
    window.scrollTo(0, 0)
  }

  // 언마운트 시점에는 새 페이지로 DOM이 바뀌며 scrollY가 줄어들 수 있어, 스크롤할 때마다 마지막 위치를 따로 기억한다
  let lastY = window.scrollY, lastKey = opts.historyKey
  // 랜딩 안에서 #faq 링크 등으로 history 항목이 바뀌면(React Router가 history.state.key를 새로 만듦) 그 항목의 키로 저장한다
  listen('scroll', () => { lastY = window.scrollY; lastKey = (history.state && history.state.key) || opts.historyKey }, { passive: true })
  const saveScroll = () => writeSavedScroll(lastKey, lastY)
  listen('pagehide', saveScroll)
  cleanups.push(saveScroll)

  /* ===== 다시 빌드: 글꼴 로드·창 크기·(L-3) 지도 로드 ===== */
  const rebuild = () => ctx.add(() => { build(); ScrollTrigger.refresh(); onTL() })
  // 폰트 <link>는 마운트 때 막 붙었을 수 있어서(원본은 <head>에 있어 렌더 전에 로드됨) 스타일시트 로드를 먼저 기다린다.
  // 안 그러면 fonts.load()가 아직 모르는 글꼴이라 바로 끝나 버리고, 글리프 확인(FONT_OK)이 틀어진다.
  const linkReady = (id: string) => new Promise<void>((resolve) => {
    const el = document.getElementById(id) as HTMLLinkElement | null
    if (!el || el.sheet) return resolve()
    const done = () => { el.removeEventListener('load', done); el.removeEventListener('error', done); resolve() }
    el.addEventListener('load', done); el.addEventListener('error', done)
    cleanups.push(() => { el.removeEventListener('load', done); el.removeEventListener('error', done) })
  })
  const fontsReady = Promise.all(['landing-font-pretendard', 'landing-font-css'].map(linkReady))
    .then(() => Promise.all([document.fonts.load('500 16px Pretendard'), document.fonts.load('600 16px "Noto Sans"', SYM1), document.fonts.load('500 16px "Roboto Condensed"')]))
    .then(() => { [...SYM1].forEach((c) => { map.FONT_OK[c] = document.fonts.check('600 16px "Noto Sans"', c) }); const bad = [...SYM1].filter((c) => !map.FONT_OK[c]); if (bad.length) console.warn('Noto Sans missing:', bad.join(' ')) })
  const loadMap = () => (dead ? Promise.resolve() : map.loadMap(ac.signal))
  fontsReady.then(loadMap).then(() => { if (!dead && Mp.ready) rebuild() }).catch((e) => { if (e?.name !== 'AbortError') console.warn('map', e) })
  document.fonts.ready.then(() => { if (!dead && tl) rebuild() })
  watchDpr(() => { if (!dead && tl) { fit(); rebuild() } })
  let rT: ReturnType<typeof setTimeout> | undefined
  // 창 크기를 바꾸면 스크롤 길이(화면 높이 비례)가 다시 정해지는데 스크롤 위치(px)는 그대로라 다른 장면으로 튄다.
  // 크기 변경이 시작될 때의 위치를 기억해 두었다가(고정 장면 안이면 진행률, 그 아래면 문서 전체 비율) 다시 짠 뒤 같은 자리로 돌려놓는다
  let anchor: { pin: boolean; p: number } | null = null
  const docMax = () => Math.max(1, document.documentElement.scrollHeight - innerHeight)
  listen('resize', () => {
    if (!anchor) anchor = st && scrollY <= st.end ? { pin: true, p: st.progress } : { pin: false, p: scrollY / docMax() }
    fit() // 배율은 바로, 장면 다시 짜기는 잠깐 멈춘 뒤
    clearTimeout(rT)
    rT = setTimeout(() => {
      timers.delete(rT!)
      if (dead) return
      const a = anchor; anchor = null
      ctx.add(() => {
        build(); ScrollTrigger.refresh()
        if (a && st && tl) {
          const y = a.pin ? st.start + a.p * (st.end - st.start) : a.p * docMax()
          lenis.scrollTo(y, { immediate: true, force: true }); window.scrollTo(0, y)
          ScrollTrigger.update(); tl.time(tOfU(st.progress * SCROLL_TOTAL)); onTL(); updNav()
        }
      })
    }, 200)
    timers.add(rT)
  })

  /* ===== live numbers ===== */
  const kick = () => ctx.add(() => { gsap.to({}, { duration: 0.7, onUpdate: () => { if (tl) renderLate(tl.time()); if (tl2) render11(tl2.time()) } }) })
  on(amt, 'input', kick)
  $$('#rates7 button').forEach((b) => on(b, 'click', () => {
    my.w = +b.dataset.w!; $$('#rates7 button').forEach((x) => x.classList.toggle('on', x === b)); refreshNums(); kick()
  }))
  cleanups.push(() => gsap.killTweensOf(disp))

  /* ===== 개발 모드에서만 비교용 훅 ===== */
  let hook: object | undefined
  if (import.meta.env.DEV) {
    hook = {
      get tl() { return tl },
      get st() { return st },
      get tl2() { return tl2 },
      get st2() { return st2 },
      get GEO() { return GEO },
      Mp, V, C, A, P, map, my, disp, K, LG,
      get nudges() { return nudges },
      NODES, FLY,
      lenis, gsap, ScrollTrigger,
    }
    ;(window as unknown as { __landing?: object }).__landing = hook
  }

  return () => {
    dead = true
    timers.forEach(clearTimeout)
    timers.clear()
    cleanups.reverse().forEach((fn) => fn())
    ctx.revert()
    st?.kill(); st2?.kill(); tl?.kill(); tl2?.kill()
    st = st2 = tl = tl2 = undefined
    if (import.meta.env.DEV) {
      const w = window as unknown as { __landing?: object }
      if (w.__landing === hook) delete w.__landing
    }
  }
}
