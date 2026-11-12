import type { ReactNode } from 'react'
import { Icon } from './LandingIcon'
import type { LandingTexts } from './landingTexts'

/** 실제 페이지 캡처로 바꾸기: 목록 01~07 순서대로 이미지 경로를 넣으면(예: '/assets/s9/01.png') 그 화면은 목업 대신 캡처를 보여 준다.
 *  캡처는 웹 머리글까지 포함한 화면 전체(무대 기준 846×488, 16:9.2)를 채운다. null이면 아래 목업 */
const SHOTS: Array<string | null> = [null, null, null, null, null, null, null]

/** 노트북 화면 한 장. tab = 켜질 머리글 탭(0 홈 · 1 내 계좌 · 2 주식 패키지 · 3 커뮤니티 · -1 없음), path = 주소창에 보일 경로 */
function A9Panel({ n, tab, path, children }: { n: number; tab: number; path: string; children: ReactNode }) {
  const shot = SHOTS[n]
  return shot
    ? <div className="a9p shot" data-tab={tab} data-path={path}><img src={shot} alt="" /></div>
    : <div className="a9p" data-tab={tab} data-path={path}>{children}</div>
}

export function LandingS9({ t }: { t: LandingTexts }) {
  return (
    <section className="sc" id="s9" data-screen-label="S9 Services">
      <div className="ttl" id="tt9">
        <div className="h2">
          <span className="ml">
            <span>RIA의 모든 단계를</span>
          </span>
          <span className="ml">
            <span>리턴증권이 함께해요</span>
          </span>
        </div>
      </div>
      <ol id="list9">
        <li className="l9">
          <small>01</small>
          매도 가이드
        </li>
        <li className="l9">
          <small>02</small>
          놓치지 않는 알림
        </li>
        <li className="l9">
          <small>03</small>
          오늘의 종목 · 성향별 주식·ETF
        </li>
        <li className="l9">
          <small>04</small>
          주식 패키지 만들기 도우미
        </li>
        <li className="l9">
          <small>05</small>
          끼루 뉴스 브리핑
        </li>
        <li className="l9">
          <small>06</small>
          끼루 AI 챗봇
        </li>
        <li className="l9">
          <small>07</small>
          커뮤니티와 끼루 답변
        </li>
      </ol>
      {/* 노트북(브라우저 창) 화면 — 16:10, 무대 기준 848×530. 위 주소창 줄 + 웹 머리글 + 화면 7장(목록 줄이 바뀌면 위로 밀리며 교체, 엔진 renderLate) */}
      <div id="app9">
        <div className="a9bar">
          <span className="a9dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="a9addr">
            returns.co.kr
            <span id="addr9">/home</span>
          </span>
        </div>
        <div className="a9scr">
          <div className="a9web">
            <img src="/assets/wordmark.png" alt="Returns." />
            <div className="a9tab">
              <span>홈</span>
              <span>내 계좌</span>
              <span>주식 패키지</span>
              <span>커뮤니티</span>
            </div>
            <span className="a9icons">
              <Icon name="search" />
              <Icon name="bell" />
              <span className="ex">예시</span>
            </span>
          </div>
          {/* 01 매도 가이드 */}
          <A9Panel n={0} tab={1} path="/account">
            <h4>매도 가이드</h4>
            <div className="a9g">
              <div className="a9col">
                <div className="a9big">
                  <small>남은 매도 한도</small>
                  <b data-l="remainMan">{t.l.remainMan}</b>
                </div>
                <div className="a9kv">
                  <span>이번 구간 마감</span>
                  <b data-l="dday">{t.l.dday}</b>
                </div>
                <p className="a9s">남은 한도 안에서 공제가 가장 커지는 조합</p>
              </div>
              <div className="a9col">
                <div className="a9r">
                  <span>해외주식 A · 차익률 52%</span>
                  <b data-l="R1">{t.l.R1}</b>
                </div>
                <div className="a9r">
                  <span>해외주식 B · 31%</span>
                  <b data-l="R2">{t.l.R2}</b>
                </div>
                <div className="a9r">
                  <span>해외주식 C · 28% · 한도까지만</span>
                  <b data-l="R3">{t.l.R3}</b>
                </div>
                <span className="a9btn">이 안으로 채우기</span>
              </div>
            </div>
          </A9Panel>
          {/* 02 놓치지 않는 알림 — 웹에서는 화면 오른쪽 위에 뜨는 알림 */}
          <A9Panel n={1} tab={0} path="/home">
            <h4>놓치지 않는 알림</h4>
            <div className="a9g">
              <div className="a9col">
                <p className="a9s">정산·구간 마감·한도 소식을 알림과 메일로 알려 드려요.</p>
                <div className="a9kv">
                  <span>이번 구간 마감</span>
                  <b data-l="dday">{t.l.dday}</b>
                </div>
                <div className="a9kv">
                  <span>남은 매도 한도</span>
                  <b data-l="remainMan">{t.l.remainMan}</b>
                </div>
              </div>
              <div className="a9col">
                <div className="nt">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  <div>
                    <b>정산 완료 안내 메일을 보냈어요</b>
                    <p>받은편지함을 확인해보세요 · 오늘 <span id="lkT">{t.lkT}</span></p>
                  </div>
                </div>
                <div className="nt">
                  <Icon name="bell" />
                  <div>
                    <b>이번 공제 구간이 곧 끝나요</b>
                    <p>마감 <span data-l="dday">{t.l.dday}</span> · 매도 가이드 보기</p>
                  </div>
                </div>
              </div>
            </div>
          </A9Panel>
          {/* 03 오늘의 종목 */}
          <A9Panel n={2} tab={2} path="/invest">
            <div className="a9hd">
              <h4>오늘의 종목</h4>
              <span className="a9chip">적극투자형 · 2~6등급</span>
            </div>
            <div className="a9g a9g3">
              <div className="a9e">
                <b>국내 주식 A</b>
                <small>위험 2등급 · 20일 +4.2%</small>
              </div>
              <div className="a9e">
                <b>국내 ETF B</b>
                <small>위험 3등급 · 20일 -1.8%</small>
              </div>
              <div className="a9e">
                <b>국내 주식 C</b>
                <small>위험 2등급 · 20일 +2.7%</small>
              </div>
            </div>
            <span className="a9btn">패키지에 담기</span>
          </A9Panel>
          {/* 04 주식 패키지 만들기 도우미 */}
          <A9Panel n={3} tab={2} path="/invest">
            <h4>나만의 주식 패키지</h4>
            <div className="a9g">
              <div className="a9col">
                <div className="bq">배당 ETF, 위험 2등급까지만</div>
                <div className="ba">조건 2개로 바꿨어요. 종목은 직접 골라요.</div>
              </div>
              <div className="a9col">
                <div className="a9r">
                  <span>국내 ETF B</span>
                  <b>50%</b>
                </div>
                <div className="a9r">
                  <span>국내 ETF C</span>
                  <b>50%</b>
                </div>
                <div className="a9r a9ok">
                  <span>비중 합계 100%</span>
                  <b>✓</b>
                </div>
                <span className="a9btn">검사하고 한 번에 사기</span>
              </div>
            </div>
          </A9Panel>
          {/* 05 끼루 뉴스 브리핑 */}
          <A9Panel n={4} tab={0} path="/home">
            <h4>뉴스 브리핑</h4>
            <div className="a9g">
              <div className="a9c">
                <small>내 보유 종목 뉴스</small>
                <b>3분기 영업이익,<br />시장 예상 웃돌아</b>
                <p>끼루 요약 3줄 · 원문 보기</p>
              </div>
              <div className="ba">
                주력 사업 매출이 예상보다 빠르게 회복됐어요. 비용 절감 효과도 함께 반영됐어요.
                <small>기사 내용 기준</small>
              </div>
            </div>
          </A9Panel>
          {/* 06 끼루 AI 챗봇 */}
          <A9Panel n={5} tab={-1} path="/home">
            <h4>끼루 AI 챗봇</h4>
            <div className="a9g">
              <div className="a9col">
                <div className="bq">언제부터 인출할 수 있어요?</div>
                <div className="ba">
                  원화 환전이 확정된 날부터 1년이 지나면 인출할 수 있어요. 지금 기준으로는
                  {' '}
                  <strong data-l="wd">{t.l.wd}</strong>
                  부터예요.
                  <small>근거 · RIA 상품 가이드라인</small>
                </div>
              </div>
              <div className="a9col">
                <div className="bq">다른 증권사 계좌에서 해외주식을 사면 어떻게 돼요?</div>
                <div className="ba">
                  RIA가 아닌 계좌에서 해외주식을 순매수하면, 그 금액만큼 세제혜택이 비례해서 줄어요.
                  <small>근거 · RIA 상품 가이드라인</small>
                </div>
              </div>
            </div>
          </A9Panel>
          {/* 07 커뮤니티와 끼루 답변 */}
          <A9Panel n={6} tab={3} path="/community">
            <h4>커뮤니티</h4>
            <div className="a9g">
              <div className="a9col">
                <div className="cm">
                  <img src="/assets/kkiru-avatar-active.png" alt="" />
                  <div>
                    <div className="cmh"><b>투자자 1</b><small>적극투자형 · 14:22</small></div>
                    <p><span className="at">@끼루</span> 국내 주식 A 공시 내용 정리된 거 있나요?</p>
                    <div className="cmm"><span>좋아요 3</span><span>답글 2</span></div>
                  </div>
                </div>
                <div className="cmr">
                  <div className="cm">
                    <img src="/assets/kkiru-avatar-neutral.png" alt="" />
                    <div>
                      <div className="cmh"><b>투자자 2</b><small>위험중립형 · 14:25</small></div>
                      <p>저도 궁금해요</p>
                    </div>
                  </div>
                  <div className="cm">
                    <img src="/assets/kkiru-ai-face.png" alt="끼루" />
                    <div>
                      <div className="cmh"><b>끼루 AI</b><small>14:28</small></div>
                      <p><span data-l="disc">{t.l.disc}</span>{' '}공시 기준으로 생산 능력을 늘린다는 계획이 확인돼요.</p>
                      <div className="cmm"><span>근거 · 전자공시 · 기사 원문</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="a9col">
                <div className="cm">
                  <img src="/assets/kkiru-avatar-stable-seek.png" alt="" />
                  <div>
                    <div className="cmh"><b>투자자 3</b><small>안정추구형 · 15:04</small></div>
                    <p>국내 주식 B 배당 수익률이 올해 많이 올랐나요?</p>
                    <div className="cmm"><span>좋아요 2</span><span>답글</span></div>
                  </div>
                </div>
              </div>
            </div>
          </A9Panel>
        </div>
      </div>
      <img id="kiroo" src="/assets/char-front.png" alt="끼루" />
      <div id="bub9">궁금한 건 끼루에게 물어보세요</div>
      <p id="disc9">투자 판단은 고객님께 있으며, 끼루 AI는 정보를 안내합니다.</p>
    </section>
  )
}
