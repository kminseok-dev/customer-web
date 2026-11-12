// S2 입고 수량 카드 — S1 확인서와 같은 기기(#tzDev) 화면 안에 들어간다(LandingScene1). 숫자·문구·data 속성은 원본 그대로
export function LandingCard2() {
  return (
    <div id="card2" className="app">
      <div className="c2h">
        <div>
          <small>해외주식 A</small>
          <h3>입고 수량 확인</h3>
        </div>
        <span className="ex">예시</span>
      </div>
      <div className="c2r" data-r="0">
        <span>신청 수량</span>
        <b className="num">
          120
          <em>주</em>
        </b>
      </div>
      <div className="c2r" data-r="1">
        <span>2025.12.23 기준 보유</span>
        <b className="num">
          100
          <em>주</em>
        </b>
      </div>
      <div className="c2r" data-r="2">
        <span>현재 보유</span>
        <b className="num">
          110
          <em>주</em>
        </b>
      </div>
      <div className="c2res">
        <span>입고 수량</span>
        <b className="num">
          100
          <em>주</em>
        </b>
      </div>
    </div>
  )
}
