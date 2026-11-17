// 새 랜딩 장면 시점·위치값 — 원본 _design/returns-landing/app.js의 숫자를 그대로 모았다.
// 타임라인 시간 단위는 원본과 같다(전체 TOTAL, 스크롤 길이 = TOTAL × 화면 높이 × SCROLL_PER_T).
// 연출 코드(useLandingTimeline)에는 숫자를 직접 쓰지 않고 여기서 가져간다.

/* ===== 무대 ===== */
export const STAGE_W = 1920
export const STAGE_H = 1080
export const FIT_MIN_W = 1800 // 배율 = min(max(폭/1920, 높이/1080), 폭/1800)

/* ===== 스크롤·발표 ===== */
export const LENIS_LERP = 0.07
export const LENIS_WHEEL = 0.8
export const SCRUB = 1.1 // 스크롤 → 타임라인 따라가는 시간(초)
export const SCROLL_PER_T = 0.95 // 타임라인 1 = 화면 높이 × 0.95
export const GLIDE_MIN = 1.6 // 발표 키·메뉴 이동 시간(초) = clamp(1.6 + 거리 × 0.3, 1.6, 4.2)
export const GLIDE_PER_T = 0.3
export const GLIDE_MAX = 4.2
export const PAST_END_BACK_SEC = 1.6 // 핀이 끝난 뒤(푸터)에서 ↑ 키로 돌아갈 때
export const TO_FOOTER_SEC = 1.4 // 마지막 장면에서 ↓ 키로 푸터까지
export const HDR_TOP_Y = 40 // 이 높이 안이면 "맨 위"(상단 바 그대로)
export const HDR_HOVER_Y = 90 // 마우스가 이 높이 안으로 오면 상단 바가 다시 나타남
export const HDR_DIR_EPS = 2 // 스크롤 방향 판정 여유(px)

/* ===== 노트북·지구본·금액 위치(무대 px) ===== */
export const CLIP_BLEED = 300 // 배경 레이어가 무대 밖으로 늘어난 폭(.bleed inset:-300px)
export const LAP_SCREEN = { t: 318, r: 480, b: 162, l: 480 } // 첫 사진이 줄어들어 노트북 화면 자리가 되는 안쪽 여백
export const AMT_FONT = 56 // 화면 속 금액 글자 크기
export const AMT_BIG = 3.6 // 가운데로 날아왔을 때 배율
export const AMT_CENTER_Y = 410
export const GLOBE = { x: 310, y: 330, size: 1300, view: 2200 } // 지구본 위치·크기, SVG viewBox 크기
// 도시 점·이름·항로·금액 꼬리표를 지구본 이미지보다 이만큼 위로 올린다(원본에 없는 조정, 무대 px).
// 원본 위치는 도쿄가 무대 아래 끝(약 1030px)에 걸려, 16:9보다 가로가 긴 브라우저 창에서 잘렸다
export const CITY_LIFT = 60
export const TAG_FONT = 22 // 지구본 위 금액 꼬리표 글자 크기
export const TAG_LIFT = 44 // 꼬리표가 점 위로 떠 있는 높이
export const LAP_DROP_Y = 920 // 노트북이 내려가 숨는 위치
export const LAP_SVC = { x: 250, y: 40, scale: 0.9 } // 서비스 장면에서 노트북 위치
export const GLOBE_ZOOM = 2.4 // 1년 장면으로 넘어갈 때 서울 쪽으로 확대
export const DATE_FROM_SCALE = 0.08 // 1년 날짜가 서울 점에서 커지며 나올 때 시작 배율

/* ===== 장면 시점(타임라인 초) ===== */
export const O = 4.1 // 매도 장면 뒤로 밀린 시간(원본 const O)
export const T = {
  heroOut: 0,
  photoShrink: 0.2,
  shadeOut: 0.3,
  lapIn: 1.15,
  photoOut: 1.5,
  hOpen: 1.45,
  seal: 1.85,
  limitFill: 2.0,
  // S2 입고
  deposit: 3.3,
  hDeposit: 3.5,
  qtyBars: 3.7,
  qtyDim: 4.35,
  qtyResult: 4.4,
  // S3 매도
  sell: 5.0,
  hSell: 5.2,
  steps: 5.5,
  // 환전(여기부터 + O)
  sellOut: 2.6 + O,
  amtShow: 2.65 + O,
  amtFly: 2.7 + O,
  night: 2.85 + O,
  amtWhite: 3.0 + O,
  hExchange: 3.55 + O,
  usdOut: 4.0 + O,
  krwRoll: 4.2 + O,
  fx: 5.0 + O,
  // 귀환
  homecoming: 6.0 + O,
  amtToNY: 6.6 + O,
  hHome: 6.7 + O,
  cityLabels: 7.2 + O,
  gch: 7.3 + O,
  amtWeight: 7.4 + O,
  tag: 7.5 + O,
  arcNY: 7.7 + O,
  arcTK: 8.0 + O,
  seoul: 9.2 + O,
  // 1년
  year: 9.9 + O,
  globeZoom: 10.0 + O,
  dateSet: 10.4 + O,
  dateIn: 10.45 + O,
  hYear: 10.9 + O,
  dateRow: 11.0 + O,
  dawnImgReset: 11.2 + O,
  dawnOn: 11.25 + O,
  dawn: 11.3 + O,
  // 세금·서비스·FAQ·마무리
  t7: 17.8,
  t8: 21.0,
  t9: 27.4,
  t10: 30.0,
}
export const TOTAL = T.t10 + 2.3
export const STEP_COUNT_DUR = 1.1 // 매도 진행 단계 4칸이 켜지는 시간
export const KRW_DIGIT_GAP = 0.05 // 원화 숫자 굴림 칸마다 늦게 시작

/* ===== 서비스 장면: 끼루가 노트북 위를 걷는다 ===== */
export const SVC = {
  firstWalk: 1.2, // t8 + 1.2에 첫 칸으로
  firstArrive: 1.8, // 첫 멈춤(발표 키)
  start: 1.9, // 두 번째 화면부터 t8 + 1.9 + (i - 1) × gap
  gap: 0.75,
  walk: 0.5, // 한 칸 걷는 시간
  stopAfter: 0.15, // 도착 뒤 발표 멈춤
  count: 7,
  exitW: 7.3, // FAQ로 넘어갈 때 걸어 나가는 위치
}
export const KK_WALK = {
  left0: 8, // 첫 칸 왼쪽(%)
  span: 84, // 7칸이 차지하는 폭(%)
  offset: 6.35, // 끼루 폭 절반(%)
  lastW: 6, // 이 칸부터는 걸음 멈춤
  fadeEnd: 7.2, // 이 위치에서 사라짐
  tilt: 5, // 몸 기울기(도)
  bob: 6, // 몸 들썩임(px)
  stepX: 8, // 발 앞뒤(px)
  stepY: 7, // 발 들기(px)
  faceK: 3.2, // 걷기 정도 → 앞모습/옆모습 전환
}

/* ===== 서비스 장면: 목록 7줄과 노트북 화면 7장(같은 순서로 짝지음) =====
   shot = public/assets/landing/svc/의 캡처 번호(v0 매도 가이드, v1 절세 브리핑, v2 오늘의 종목, v3 패키지 도우미, v4 뉴스 브리핑, v5 챗봇, v6 커뮤니티) */
export const SERVICES = [
  { name: '매도 가이드', shot: 0 },
  { name: '끼루 절세 브리핑 · 정산 알림', shot: 1 },
  { name: '오늘의 종목', shot: 2 },
  { name: '주식 패키지 만들기 도우미', shot: 3 },
  { name: '끼루 뉴스 브리핑', shot: 4 },
  { name: '끼루 AI 챗봇', shot: 5 },
  { name: '커뮤니티 · 끼루 AI 답변', shot: 6 },
]

/* ===== 발표 멈춤 지점·메뉴 이동 ===== */
export const STOPS_BEFORE_SVC = [0, 3.1, 4.8, 6.6, 9.8, 13.6, 17.4, 20.7]
export const FAQ_STOP = T.t9 + 2.2
// FAQ 영역이 클릭을 받는 구간(원본에 없는 추가): FAQ 칸이 나타나기 시작할 때 ~ 마무리 장면으로 넘어갈 때.
// 그 밖에는 pointer-events:none — 원본은 FAQ 상자가 늘 보이는 상태라(내용만 숨김) 세금 장면의 공제율 버튼을 덮었다
export const FAQ_CLICK = { on: T.t9 + 0.8, off: T.t10 }
export const NAV_TARGETS = { flow: 3.1, tax: 20.7, faq: FAQ_STOP } // 서비스는 첫 도착 지점(코드에서 계산)

/** 상단 바 글자를 진하게(밝은 장면) 둘 시간 구간 */
export const inkAt = (t: number): boolean => (t > 0.5 && t < 6.95) || (t > T.t7 + 0.35 && t < T.t10 + 0.6)

/* ===== 오프닝(스크롤과 무관하게 한 번 재생) ===== */
export const OPENING = { delay: 0.1, photo: 2.8, en: 0.3, title: 0.4, rest: 1.0 }

/* ===== 화면 예시 값 ===== */
export const EX_GAIN = 10000000 // 세금 예시 양도차익(매도 3,000만 원 중). 세액 계산은 landingDates.ts
// 예시 날짜 — RIA 출시(2026.03.23) 이후: 매도 체결 → 2영업일 뒤 원화 확정 → 1년 뒤 인출 가능
export const EX_DATES = {
  sold: '2026.04.08 09:31', // 노트북 매도 화면 체결 시각
  confirmed: '2026.04.10', // 원화 확정일(환전 정보 줄·지구본·1년 장면)
  withdraw: '2027.04.10', // 1년 장면 큰 날짜(인출 가능일)
}
