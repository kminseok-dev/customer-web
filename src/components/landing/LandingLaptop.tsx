import type { ReactNode } from 'react'
import type { Reg } from './landingRefs'
import { SERVICES } from './landingScenes'
import { EX_DATES } from './landingScenes'

// 노트북(우리 웹) — 원본 #lap. 화면 U1 개설 → U2 입고 → U3 매도, 서비스 장면에서는 캡처 V0~V6.
// 끼루(#kk)는 노트북 위를 걸어 다닌다(useLandingTimeline의 walk).

const SVC_SHOTS = SERVICES.map((s) => `/assets/landing/svc/v${s.shot}.jpg`) // 서비스 목록 순서대로(landingScenes SERVICES)

function WebNav() {
  return (
    <div className="nav">
      <b>
        Returns<i>.</i>
      </b>
      <div className="t">
        <span>홈</span>
        <span className="on">내 계좌</span>
        <span>주식 패키지</span>
        <span>커뮤니티</span>
      </div>
      <span style={{ fontSize: 13, color: 'var(--landing-v2-ui-tab)' }}>내 정보</span>
    </div>
  )
}

function Ui({ reg, k, children }: { reg: Reg; k: 'U1' | 'U2' | 'U3'; children: ReactNode }) {
  return (
    <div className="ui" id={k} ref={reg(k)}>
      <WebNav />
      <div className="bd">{children}</div>
    </div>
  )
}

function Kkiru({ reg }: { reg: Reg }) {
  return (
    <div className="kk" id="kk" ref={reg('kk')} aria-hidden="true">
      <span className="sh" />
      <div className="sd" id="kkS" ref={reg('kkS')}>
        <div className="ft" id="kkL" ref={reg('kkL')}>
          <img src="/assets/landing/kk-footL.png" alt="" />
        </div>
        <div className="ft" id="kkR" ref={reg('kkR')}>
          <img src="/assets/landing/kk-footR.png" alt="" />
        </div>
        <div className="bd" id="kkB" ref={reg('kkB')}>
          <img src="/assets/landing/kk-body.png" alt="" />
        </div>
      </div>
      <div className="fr" id="kkF" ref={reg('kkF')}>
        <img src="/assets/landing/kk-front.png" alt="" />
      </div>
    </div>
  )
}

export function LandingLaptop({ reg }: { reg: Reg }) {
  return (
    <div id="lap" ref={reg('lap')}>
      <div className="lid">
        <Kkiru reg={reg} />
        <div className="scr">
          <Ui reg={reg} k="U1">
            <div className="cr">내 계좌 › RIA 계좌 개설</div>
            <div className="tt">
              <h3>RIA 계좌 개설 확인서</h3>
              <span className="stamp" id="seal" ref={reg('seal')}>
                개설 완료 · RIA
              </span>
            </div>
            <div className="ord">
              <div>
                <span>계좌 유형</span>
                <b>RIA</b>
              </div>
              <div>
                <span>개설 증권사</span>
                <b>Returns</b>
              </div>
              <div>
                <span>기준일</span>
                <b className="num">2025.12.23</b>
              </div>
            </div>
            <div className="amtrow">
              <span className="k">매도 한도 · 예시</span>
              <span className="v num" id="limV">
                ₩30,000,000
              </span>
            </div>
            <div className="trk">
              <i id="fil" ref={reg('fil')} />
              <span className="knob" id="knob" ref={reg('knob')} />
            </div>
            <div className="trl num">
              <span>₩0</span>
              <span>₩50,000,000</span>
            </div>
            <div className="rem">
              <span>남은 매도 한도 (전 증권사 합산)</span>
              <b className="num" id="remV">
                ₩20,000,000
              </b>
            </div>
          </Ui>
          <Ui reg={reg} k="U2">
            <div className="cr">내 계좌 › RIA › 입고</div>
            <div className="tt">
              <h3>해외주식 A · 입고 수량 확인</h3>
              <span>예시</span>
            </div>
            <div className="qr">
              <span>신청 수량</span>
              <i className="b" style={{ width: '100%' }} />
              <b className="num">120주</b>
            </div>
            <div className="qr mn">
              <span>2025.12.23 기준 보유</span>
              <i className="b" style={{ width: '83.3%' }} />
              <b className="num">100주</b>
            </div>
            <div className="qr">
              <span>현재 보유</span>
              <i className="b" style={{ width: '91.7%' }} />
              <b className="num">110주</b>
            </div>
            <div className="qres" id="qres" ref={reg('qres')}>
              <span>세 수량 중 가장 작은 값 · 입고 수량</span>
              <b className="num">100주</b>
            </div>
          </Ui>
          <Ui reg={reg} k="U3">
            <div className="cr">내 계좌 › RIA 계좌 › 매도</div>
            <div className="tt">
              <h3>매도 체결 확인</h3>
              <span className="num">{EX_DATES.sold} 체결 · 예시</span>
            </div>
            <div className="ord">
              <div>
                <span>종목</span>
                <b>해외주식 A</b>
              </div>
              <div>
                <span>시장</span>
                <b>NASDAQ</b>
              </div>
              <div>
                <span>수량</span>
                <b className="num">100주</b>
              </div>
            </div>
            <div className="amtrow">
              <span className="k">매도 금액</span>
              <span className="v num" id="scrAmt" ref={reg('scrAmt')}>
                $21,130.00
              </span>
            </div>
            <div className="st" id="ost" ref={reg('ost')}>
              <span>주문 접수</span>
              <span>매도 체결</span>
              <span>원화 환전 중</span>
              <span>원화 확정</span>
            </div>
          </Ui>
          <div ref={reg('svs')} style={{ display: 'contents' }}>
            {SVC_SHOTS.map((src, i) => (
              <img className="sv" id={'V' + i} key={src} src={src} alt="" />
            ))}
          </div>
        </div>
      </div>
      <div className="base" />
    </div>
  )
}
