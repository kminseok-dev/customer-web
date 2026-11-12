import { Icon } from './LandingIcon'
import { LandingPassNavItems } from './LandingLists'
import type { LandingTexts } from './landingTexts'

export function LandingPass({ t }: { t: LandingTexts }) {
  return (
    <>
    {/* 체결 알림(장식): 단계가 끝나는 박자에 앱 알림처럼 한 장 올라왔다가 패스포트 탭으로 들어간다. 번호·단계 이름·그 장면의 숫자는 엔진이 채운다 */}
    <div id="stampFx" aria-hidden="true">
      <div className="nf">
        <b className="nf-n" />
        <span className="nf-t" />
        <span className="nf-v" />
      </div>
    </div>
    <div id="passWrap">
      <div id="pnav">
        <div className="pni">
          <button id="pnAmt">
            매도 예정
            {' '}
            <b data-l="Aman">
              {t.l.Aman}
            </b>
            <Icon name="pencil" />
          </button>
          <ol id="pnList">
            <LandingPassNavItems />
          </ol>
        </div>
      </div>
      <div id="passD" data-l="hold">
        {t.l.hold}
      </div>
      <div id="pass">
        <div className="pt">
          <img src="/assets/wordmark-white.png" alt="Returns." />
          <b id="pCount">0/5</b>
        </div>
        <div className="po">
          <img src="/assets/wordmark-white.png" alt="" />
          <div className="t">RIA PASSPORT</div>
          <div className="rule" />
          <div className="stamps">
            <div className="st">
              <i>1</i>
            </div>
            <div className="st">
              <i>2</i>
            </div>
            <div className="st">
              <i>3</i>
            </div>
            <div className="st">
              <i>4</i>
            </div>
            <div className="st">
              <i>5</i>
            </div>
          </div>
          <div className="sl" id="stLab" />
        </div>
      </div>
    </div>
    </>
  )
}
