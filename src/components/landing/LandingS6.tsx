export function LandingS6() {
  return (
    <section className="sc" id="s6" data-screen-label="S6 Check">
      {/* 예전 보안검색대 사진 자리(엔진이 고르는 이름이라 빈 칸으로 남김) — S6는 노트북 웹 화면(연결 계좌 점검 페이지) */}
      <div className="ph6" id="ph6a" />
      <div className="ph6" id="ph6b" />
      <div className="beam" id="beam6" />
      <div className="ttl" id="tt6">
        <div className="h">
          <span className="ml">
            <span>다른 계좌의 해외주식 순매수도</span>
          </span>
          <span className="ml">
            <span>함께 확인해요</span>
          </span>
        </div>
        <p className="p2" id="p6">
          2026년 1월부터 12월까지, RIA가 아닌 계좌에서 해외주식을 순매수하면 그 금액에 비례해 공제가 줄어요.
        </p>
      </div>
      <div id="list6">
        <div className="r6">
          <span>Returns RIA 계좌</span>
          <em className="ok">대상 계좌</em>
        </div>
        <div className="r6">
          <span>일반 계좌 1</span>
          <em className="ok">순매수 없음 ✓</em>
        </div>
        <div className="r6">
          <span>일반 계좌 2</span>
          <em className="wr">
            <i />
            순매수 있음
            <span className="ex">예시</span>
          </em>
        </div>
        <div className="r6">
          <span>연금 계좌</span>
          <em className="ok">순매수 없음 ✓</em>
        </div>
      </div>
      <div id="big6">
        <div className="n6">
          <b id="pct6">82</b>
          <em>%</em>
        </div>
        <div className="ln">
          공제 인정 비율
          <span className="ex">예시</span>
        </div>

      </div>
    </section>
  )
}
