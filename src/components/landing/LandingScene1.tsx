import type { CSSProperties } from 'react'
import { Icon } from './LandingIcon'
import { LandingCard2 } from './LandingScene2'
import { LandingBoard } from './LandingBoard'
import type { LandingTexts } from './landingTexts'

// 오프닝~S2(토스 메인과 같은 화면 문법 — landing-toss-ref.md 참고). 그리는 값은 모두 엔진 tzFrame(t)이 스크롤 시간에서 계산한다.
//  A 첫 화면: 밝은 실사가 둥근 카드(여백 16px·모서리 40px)에서 화면 가득으로 펴지고, 아래에 흰 큰 글자가 단어 덩어리로 가로로 흩어져 있다.
//  B 사진→카드→기기: 기기가 아래에서 올라와 사진 위에 겹치고, 사진은 둥근 카드(inset 180·160, 모서리 80)로 줄어든 뒤 위로 빠진다. 흰 바탕에 기울어진 기기만 남는다.
//  C 글자: 제목은 단어마다 흐림(16px)→선명, 설명은 회색(20%)→진하게.
// 기기 화면 안에는 기존 S1 확인서(#card1)와 S2 입고 카드(#card2)가 그대로 들어간다(값을 채우는 선택자·구조는 그대로).
// 줄마다 끊어 쓰고(문구는 그대로), 줄 안에서는 단어마다 흐림이 풀린다
const words = (lines: string[]) => lines.map((l, k) => <span className="bl" key={k}>{l.split(' ').map((w, i) => <span className="bw" key={i}>{w}</span>)}</span>)

export function LandingScene1({ t }: { t: LandingTexts }) {
  return (
    <div id="tz">
      <div id="tzHero">
        <div className="tzh-ph">
          <img src="/assets/photo-open.jpg" alt="파란 하늘 아래 유리 고층 오피스 빌딩" />
        </div>
        {/* 위쪽 아주 옅은 그늘 — 사진 위에 투명하게 겹친 머리글(흰 로고·로그인·시작하기)이 또렷하게 */}
        <i className="tzh-top" />
        <i className="tzh-sh" />
        <p className="tzh-w">
          <span>국내로 잇는 투자,</span>
          <span>내일로 이어지는 가치</span>
        </p>
      </div>
      <div id="s1">
        <div id="s1w">
          <div className="tt" id="c1">
            <div className="h">{words(['RIA 계좌 개설,', '매도 한도부터 정해요'])}</div>
            <div className="p" id="c1p">
              증권사별 1개 계좌를 만들 수 있고,<br />매도 한도는 전 증권사를 합쳐 5,000만 원까지예요.
            </div>
          </div>
          <div className="tt" id="c3t" aria-hidden="true">
            <div className="h">{words(['RIA 계좌에서', '매도하면,', '대금은 원화로', '자동 환전돼요'])}</div>
          </div>
          <div className="tt" id="c2">
            <div className="h">
              {words(['입고 수량은', '세 수량 중', '가장 작은 값이에요'])}
            </div>
          </div>
        </div>
      </div>
      {/* 노트북 — 화면 위쪽은 S9 노트북과 같은 브라우저 창(점 3개·주소창)과 리턴증권 웹 머리글. 그 아래 웹 화면 안에 확인서·입고 카드가 놓인다.
          S9의 .a9tab·#addr9는 엔진이 S9 화면용으로 고르므로 여기서는 같은 모양의 다른 이름(lt-*)을 쓴다 */}
      <div id="tzDev">
        <div className="lt-lid">
          <div className="lt-scr">
            <div className="a9bar">
              <span className="a9dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="a9addr">
                returns.co.kr
                <span>/account</span>
              </span>
            </div>
            <div className="lt-web">
              <img src="/assets/wordmark.png" alt="Returns." />
              <div className="lt-tab">
                <span>홈</span>
                <span className="on">내 계좌</span>
                <span>주식 패키지</span>
                <span>커뮤니티</span>
              </div>
              <span className="a9icons">
                <Icon name="search" />
                <Icon name="bell" />
                <span className="ex">예시</span>
              </span>
            </div>
        <div className="tzd-scr">
          <div className="tzd-pg" id="tzP1">
            <div id="card1">
              <div id="seal">
                개설 완료
                <small>RIA · OPEN</small>
              </div>
              <div className="tk">
                <div className="tk-h">
                  <img src="/assets/wordmark.png" alt="Returns." />
                  <span>RIA ACCOUNT · CONFIRMATION</span>
                </div>
                <div id="thumb" />
                <div className="perf" />
                <div className="tk-b">
                  <div>
                    <h3>RIA 계좌 개설 확인서</h3>
                    <div className="kv">
                      <i className="gln" />
                      <small>계좌 유형</small>
                      <b>RIA</b>
                    </div>
                    <div className="kv">
                      <i className="gln" />
                      <small>개설 증권사</small>
                      <b>Returns</b>
                    </div>
                    <div className="kv">
                      <i className="gln" />
                      <small>기준일</small>
                      <b>2025.12.23</b>
                    </div>
                  </div>
                  <div className="lim">
                    <i className="gln" />
                    <small>매도 한도</small>
                    <div className="big num" id="limBig">₩30,000,000</div>
                    <input id="amt" type="range" min="0" max="55000000" step="1000000" defaultValue="30000000" aria-label="매도 예정 금액" style={{ '--p': '54.54545454545454%' } as CSSProperties} />
                    <div className="rates" id="rates">
                      <small>수익률</small>
                      <button data-r="0.1">10%</button>
                      <button data-r="0.3">30%</button>
                      <button data-r="0.5" className="on">50%</button>
                      <button data-r="1">100%</button>
                    </div>
                    <div className="rem">
                      <small>남은 매도 한도</small>
                      <b className="num" data-n="remain">
                        {t.n.remain}
                      </b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="tzd-pg" id="tzP2">
            <LandingCard2 />
          </div>
          <div className="tzd-pg" id="tzP3">
            {/* S3 매도 안내판 — 리턴증권 웹의 매도 화면. 카메라가 노트북 화면으로 다가가면 이 화면이 그대로 무대를 채운다 */}
            <LandingBoard t={t} />
          </div>
          {/* S4 비행 화면 — 지도(캔버스)와 위·아래 정보 띠(#monUI)가 이 자리에 맞춰 그려진다 */}
          <div className="tzd-pg" id="tzP4" />
          {/* S6 연결 계좌 점검 페이지 — 계좌 목록·결과 칸(#list6·#big6)이 이 자리에 맞춰 그려진다 */}
          <div className="tzd-pg" id="tzP5" />
        </div>
          </div>
        </div>
        <i className="lt-hinge" />
        <div className="lt-base">
          <i className="lt-kb" />
          <i className="lt-pad" />
        </div>
      </div>
    </div>
  )
}
