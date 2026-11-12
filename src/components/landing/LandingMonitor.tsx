import type { LandingTexts } from './landingTexts'

export function LandingMon() {
  return (
    <div id="mon">
      <div id="seat" />
      <div id="bez">
        <i />
      </div>
    </div>
  )
}

export function LandingMap() {
  return (
    <>
      <canvas id="map" />
      <div id="scrim" />
    </>
  )
}

export function LandingMonUi({ t }: { t: LandingTexts }) {
  return (
    <div id="monUI">
      <div className="mscr">
        <div className="gl" />
        <div className="mt">
          <span>
            출발
            <b>NEW YORK · TOKYO</b>
          </span>
          <span>→</span>
          <span>
            도착
            <b>SEOUL (₩)</b>
          </span>
          <span className="pr" id="mPct">0%</span>
        </div>
        <div className="mb">
          <div>
            <small id="mLab1">예상 원화 금액(가환전)</small>
            <b className="g" data-n="A">
              {t.n.A}
            </b>
          </div>
          <div>
            <small>환전 확정까지</small>
            <b id="mDay">D-2</b>
          </div>
          <div>
            <small>확정일</small>
            <b data-n="confirm">
              {t.n.confirm}
            </b>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LandingHero() {
  return (
    <div id="hero">
      <img src="/assets/photo-morning.jpg" alt="맑은 아침의 서울" />
    </div>
  )
}
