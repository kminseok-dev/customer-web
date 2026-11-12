// 장면 표와 시간 변환 — 원본 landing-journey.html의 R(), SCN, TOTAL (타임라인 시간 1 = 화면 1장)

/* S0–S4는 예전 시간 단위로 써 둔 것을 장면당 2.5 / 2.0장으로 늘려 쓴다 */
export function R(t: number): number {
  const O = [0, 2.95, 4.85, 6.85, 8.55, 11.75], N = [0, 2.5, 4.5, 6.5, 8.5, 10.5]
  if (t >= O[5]) return N[5] + (t - O[5])
  for (let i = 1; i < 6; i++) if (t <= O[i]) return N[i - 1] + (t - O[i - 1]) * (N[i] - N[i - 1]) / (O[i] - O[i - 1])
  return t
}

export const TOTAL = 21.9

export interface Scene {
  k: string
  n: string
  a: number
  b: number
  done: number
}

export const SCN: Scene[] = [
  { k: 'S0', n: '해외 자산', a: 0, b: 2.5, done: 0 }, // 움직임 줄이기 맞춤 위치: 오프닝이 끝난 화면(지도 + 슬로건)
  { k: 'S1', n: '계좌 개설', a: 2.5, b: 4.5, done: 4.25 },
  { k: 'S2', n: '입고', a: 4.5, b: 6.5, done: 5.15 },
  { k: 'S3', n: '매도', a: 6.5, b: 8.5, done: 8.3 },
  { k: 'S4', n: '국내 복귀', a: 8.5, b: 10.5, done: 10.0 },
  { k: 'S5', n: '1년 유지', a: 10.5, b: 12.5, done: 12.2 },
  { k: 'S6', n: '외부감시', a: 12.5, b: 14.5, done: 14.15 },
  { k: 'S7', n: '공제율·세액', a: 14.5, b: 16.5, done: 16.15 },
  { k: 'S8', n: '국내 투자', a: 16.5, b: 18.5, done: 18.15 },
  { k: 'S9', n: '서비스', a: 18.5, b: 21.9, done: 21.7 },
]

/* ===== 장면별 스크롤 길이(화면 수) =====
   타임라인 시간(각 장면의 a~b)과 연출 코드는 그대로 두고, "스크롤 위치 → 타임라인 시간" 변환만 장면마다 다르게 한다.
   예전에는 시간 1 = 스크롤 1화면으로 고정이라, 연출이 몰린 장면(S1 화면당 8개, S2 7개, S4 6개)은 빨리 지나가고
   느린 확대 하나뿐인 S0(3.6개)은 느리게 느껴졌다. 몰린 장면은 길게, S0은 짧게 해서 화면당 연출 양을 고르게 맞춘다.
   PACE는 전체 속도 배율(아래 조정 값 모음 참고) */

/* ===== 속도 조정 값 — 숫자만 바꿔서 조절한다 ===== */
/** 전체 스크롤 길이 배율. 1.5면 모든 장면이 1.5배 길어진다(같은 스크롤에 연출이 덜 진행 = 느려짐). 장면별 길이는 아래 SCREENS */
export const PACE = 1
/** 휠·트랙패드 한 번에 움직이는 양(1 = 브라우저 기본). 작을수록 둔해진다 */
export const WHEEL_MULT = 0.6
/** 부드러운 스크롤이 목표 위치를 따라가는 정도(0~1). 작을수록 더 미끄러지듯 천천히 따라간다(기본 0.1) */
export const SMOOTH_LERP = 0.07
/** 휠을 세게 돌려도 스크롤 목표가 현재 위치보다 최대 몇 화면까지만 앞서 갈 수 있는지 — 사실상 휠 최고 속도.
 *  0.3이면 최고 초당 약 1.3화면이라, 세게 1초 돌려도 한 장면(2~3화면) 안에서 멈춘다. 키우면 빨리 넘길 수 있다 */
export const WHEEL_MAX_AHEAD = 0.3
/** 장면 연출이 스크롤 위치를 따라잡는 시간(초). 클수록 부드럽지만 늦게 따라온다 */
export const FOLLOW_SEC = 0.6
/** 발표 모드: 키 한 번에 다음(이전) 박자 지점까지 이동하는 시간(초) */
export const BEAT_SEC = 1.1
/** 발표 모드: 키를 누른 뒤 다음 입력을 무시하는 시간(초). 연타로 건너뛰지 않게 이동 시간보다 조금 길게 */
export const BEAT_LOCK_SEC = 1.3
const SCREENS: Record<string, number> = { S0: 1.6, S1: 3.0, S2: 1.8, S3: 3.0, S4: 2.5, S5: 2.0, S6: 2.0, S7: 2.0, S8: 2.0, S9: 3.4 }
const U0: number[] = [] // 각 장면이 시작하는 스크롤 위치(화면 수)
const LEN: number[] = SCN.map((sc) => SCREENS[sc.k] * PACE)
LEN.reduce((u, l) => { U0.push(u); return u + l }, 0)
/** 고정 장면 전체 스크롤 길이(화면 수) */
export const SCROLL_TOTAL = LEN.reduce((u, l) => u + l, 0)
const cl = (v: number) => Math.min(1, Math.max(0, v))
/** 스크롤 위치(화면 수) → 타임라인 시간 */
export function tOfU(u: number): number {
  if (u <= 0) return 0
  for (let i = 0; i < SCN.length; i++) if (u <= U0[i] + LEN[i] || i === SCN.length - 1) return SCN[i].a + cl((u - U0[i]) / LEN[i]) * (SCN[i].b - SCN[i].a)
  return TOTAL
}
/** 타임라인 시간 → 스크롤 위치(화면 수) */
export function uOfT(t: number): number {
  if (t <= 0) return 0
  for (let i = 0; i < SCN.length; i++) if (t <= SCN[i].b || i === SCN.length - 1) return U0[i] + cl((t - SCN[i].a) / (SCN[i].b - SCN[i].a)) * LEN[i]
  return SCROLL_TOTAL
}

/* ===== 발표 모드 박자 지점(타임라인 시간) =====
   ↓ → Space PageDown = 다음 지점, ↑ ← PageUp = 이전 지점. 각 지점은 연출이 끝나 화면이 멈춰 있는 순간(엔진의 타임라인·renderLate 구간에서 뽑음) */
export const BEATS: Record<string, number[]> = {
  S0: [0, 2.34], //                             첫 화면(둥근 사진 카드) · 사진이 화면 가득
  S1: [3.02, 3.45, 4.25], //                     기기가 사진 위로 · 사진이 카드로 줄어듦 · 흰 바탕에 기기·제목, 확인서 채움
  S2: [5.15], //                                입고 카드·제목 — 세 수량과 입고 수량 100주가 함께
  S3: [6.75, 7.45, 7.8, 8.3], //               노트북 매도 주문 화면·문장 · 화면이 전광판으로 · 상태 넘어가는 중 · 전부 출발
  S4: [8.9, 9.1, 9.4, 9.7, 10.1, 10.45], //       모니터 · 제목 · 비행 중 · 도착 · ₩ 켜짐 · 서울 야경
  S5: [10.75, 11.1, 11.55, 12.0, 12.17], //       제목 · 인출일 · 보유일 세는 중 · 1년 · 도장
  S6: [12.8, 13.25, 13.7, 14.05], //              제목·설명 · 스캔 중 · 스캔 끝 · 공제 인정 비율
  S7: [14.8, 15.15, 15.5, 15.75, 16.05], //       큰 숫자 · 눈금자·오늘 · 영수증 · 일반계좌 줄 긋기 · 절세액
  S8: [16.75, 17.2, 17.7, 18.05], //              제목 · 흐름 진행 · 흐름 끝 · 합계
  S9: [18.85, 19.25, 19.65, 20.05, 20.45, 20.85, 21.25], // 서비스 7줄 하나씩
}
/** 마무리 장면(S11, 별도 타임라인 0~2): 사진 · 문구 완성 · 요약 카드. S9 다음에는 FAQ 맨 위 → S11 시작 → 이 지점들 순서 */
export const S11_BEATS = [0.3, 1.12, 1.5]

// 패스포트 장면 이동 목록: 장면 이름 + FAQ
export const NAV_NAMES: string[] = [...SCN.map((s) => s.n), 'FAQ']
