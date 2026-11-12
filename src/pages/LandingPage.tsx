import { useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import '../components/landing/landing.css'
import { LandingClosing } from '../components/landing/LandingClosing'
import { LandingFaq } from '../components/landing/LandingFaq'
import { LandingFooter } from '../components/landing/LandingFooter'
import { LandingHdr2 } from '../components/landing/LandingHeader'
import { LandingPass } from '../components/landing/LandingPass'
import { mountLanding } from '../components/landing/landingEngine'
import { LandingStage } from '../components/landing/LandingStage'
import { readLandingLoggedIn } from '../components/landing/landingSession'
import { buildLandingTexts } from '../components/landing/landingTexts'
import { useLandingDocument } from '../components/landing/useLandingDocument'

// 랜딩(/) — 원본 landing-journey.html. 정적 마크업 + 스크롤 엔진(mountLanding)은 L-2 뼈대까지.
export function LandingPage() {
  // 글자·로그인 여부는 처음 한 번만 정한다(스크립트가 바꾸는 요소를 React가 다시 그리지 않도록)
  const [t] = useState(buildLandingTexts)
  const [loggedIn] = useState(readLandingLoggedIn)
  useLandingDocument()
  // 뒤로 가기(POP)로 돌아왔을 때만 이전 스크롤 위치를 복원한다 — 값은 마운트 때 한 번만 읽는다
  const navType = useNavigationType()
  const { key, hash } = useLocation()
  const rootRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => mountLanding(rootRef.current!, { pop: navType === 'POP', historyKey: key, hash }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [])
  return (
    <div className="landing" ref={rootRef}>
      <LandingHdr2 loggedIn={loggedIn} />
      <LandingStage t={t} loggedIn={loggedIn} />
      <LandingFaq />
      <LandingClosing t={t} loggedIn={loggedIn} />
      <LandingFooter />
      <LandingPass t={t} />
      {/* 발표자용 현재 장면 번호(엔진이 채움) */}
      <div id="sceneNo" aria-hidden="true" />
    </div>
  )
}
