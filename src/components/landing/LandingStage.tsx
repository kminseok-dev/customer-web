import { LandingBackdrop } from './LandingBackdrop'
import { LandingCopy } from './LandingCopy'
import { LandingHdr } from './LandingHeader'
import { LandingLate } from './LandingLate'
import { LandingHero, LandingMap, LandingMon, LandingMonUi } from './LandingMonitor'
import { LandingScene1 } from './LandingScene1'
import type { LandingTexts } from './landingTexts'

// 스크롤하는 동안 화면에 붙어 있는 무대(#pinA > #stage). 겹치는 순서는 원본 마크업의 순서 그대로다.
// #stage는 화면 전체(남는 칸은 장면 배경색), 안쪽 #stg는 1920×1080 고정 무대로 화면 크기에 맞춰 통째로 확대·축소한다.
export function LandingStage({ t, loggedIn }: { t: LandingTexts; loggedIn: boolean }) {
  return (
    <div id="pinA">
      <div id="stage">
        <div className="stg" id="stg">
        <LandingBackdrop />
        <LandingMon />
        <LandingScene1 t={t} />
        <LandingMap />
        <LandingMonUi t={t} />
        <LandingHero />
        <LandingCopy />
        <LandingLate t={t} />
        <LandingHdr loggedIn={loggedIn} />
        </div>
      </div>
    </div>
  )
}
