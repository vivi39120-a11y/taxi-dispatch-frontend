// src/LandingPage.jsx
import './LandingPage.css'

export default function LandingPage({
  onPassengerClick,
  onDriverClick,
  onAuthClick,
}) {
  return (
    <div id="top" className="landing-root">
      {/* 導覽列 */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <div className="container">
          <a className="navbar-brand fw-bold" href="#top">
            SmartDispatch
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              {/* ⭐ 我是乘客 → 進入乘客端 */}
              <li className="nav-item">
                <a
                  className="nav-link active"
                  href="#"
                  onClick={e => {
                    e.preventDefault()
                    onPassengerClick?.()
                  }}
                >
                  我是乘客
                </a>
              </li>

              {/* ⭐ 我是司機 → 進入司機端 */}
              <li className="nav-item">
                <a
                  className="nav-link"
                  href="#"
                  onClick={e => {
                    e.preventDefault()
                    onDriverClick?.()
                  }}
                >
                  我是司機
                </a>
              </li>

              {/* ⭐ 登入 / 註冊 → 進入 AuthPage */}
              <li className="nav-item">
                <a
                  className="nav-link btn btn-primary text-white ms-2 px-3"
                  href="#"
                  onClick={e => {
                    e.preventDefault()
                    onAuthClick?.()
                  }}
                >
                  登入 / 註冊
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* 乘客 hero 區塊 */}
      <section className="hero-section" id="passenger">
        <div className="hero-overlay" />
        <div className="container hero-content">
          <div className="row align-items-center">
            <div className="col-lg-6 text-white mb-5 mb-lg-0">
              <h1 className="display-4 fw-bold">計程車派遣系統</h1>
              <p className="lead mb-4">
                利用大數據分析，讓您不浪費時間等待。
              </p>
            </div>

            <div className="col-lg-5 offset-lg-1">
              <div className="booking-card">
                <h3 className="fw-bold mb-4">去哪裡？</h3>
                <form>
                  <div className="mb-3">
                    <label className="form-label text-muted small">
                      上車地點
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      placeholder="輸入上車地址"
                      defaultValue="目前位置"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted small">
                      下車地點
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      placeholder="輸入目的地"
                    />
                  </div>

                  {/* 預估金額（之後要用再打開） */}
                  <div id="price-estimate" className="mb-3 d-none">
                    <p className="fw-bold text-success">
                      預估金額：$150 - $180
                    </p>
                  </div>

                  {/* ⭐ 查看價格與車輛 → 直接進入乘客端 */}
                  <button
                    type="button"
                    className="btn btn-dark w-100 btn-lg py-3 fw-bold"
                    onClick={() => onPassengerClick?.()}
                  >
                    查看價格與車輛
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
     /* 流程圖區塊 */
      <section class="how-it-works-section py-5 bg-white">
        <div class="container text-center">
            
            <div class="mb-5">
                <span class="text-warning fw-bold text-uppercase ls-1">Simple Steps</span>
                <h2 class="fw-bold mt-2">如何使用 SmartDispatch？</h2>
                <p class="text-muted">簡單三步驟，體驗 AI 賦能的紐約出行服務</p>
            </div>

            <div class="row justify-content-center">
                
                <div class="col-md-4 mb-4 mb-md-0 position-relative">
                    <div class="step-card p-4">
                        <div class="icon-circle bg-warning text-dark mb-4 mx-auto d-flex align-items-center justify-content-center shadow">
                            <i class="bi bi-geo-alt-fill fs-2"></i>
                        </div>
                        <h4 class="fw-bold">1. 設定目的地</h4>
                        <p class="text-muted">輸入您的上車點與下車位置，系統將自動估算最佳路徑與透明報價。</p>
                    </div>
                    <div class="d-none d-md-block position-absolute top-50 end-0 translate-middle-y text-muted">
                        <i class="bi bi-chevron-right fs-1"></i>
                    </div>
                </div>

                <div class="col-md-4 mb-4 mb-md-0 position-relative">
                    <div class="step-card p-4">
                        <div class="icon-circle bg-dark text-warning mb-4 mx-auto d-flex align-items-center justify-content-center shadow">
                            <i class="bi bi-cpu-fill fs-2"></i>
                        </div>
                        <h4 class="fw-bold">2. AI 智慧媒合</h4>
                        <p class="text-muted">我們的 AI 演算法會在毫秒內分析全紐約路況，為您指派最快抵達的車輛。</p>
                    </div>
                    <div class="d-none d-md-block position-absolute top-50 end-0 translate-middle-y text-muted">
                        <i class="bi bi-chevron-right fs-1"></i>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="step-card p-4">
                        <div class="icon-circle bg-warning text-dark mb-4 mx-auto d-flex align-items-center justify-content-center shadow">
                            <i class="bi bi-emoji-smile-fill fs-2"></i>
                        </div>
                        <h4 class="fw-bold">3. 安心抵達</h4>
                        <p class="text-muted">即時追蹤司機位置，享受安全舒適的旅程，並在抵達後輕鬆支付。</p>
                    </div>
                </div>

            </div>

            <div class="mt-5">
                <a href="#" class="btn btn-dark btn-lg px-5 rounded-pill shadow-sm">
                    立即開始叫車 <i class="bi bi-arrow-right ms-2"></i>
                </a>
            </div>
        </div>
    </section>

      {/* 司機招募區塊 */}
      <section className="driver-section" id="driver">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6 mb-4 mb-md-0">
              <img
                src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=800&auto=format&fit=crop"
                className="img-fluid rounded shadow"
                alt="Driver App UI"
              />
            </div>
            <div className="col-md-6">
              <span className="badge bg-warning text-dark mb-2">
                司機專屬
              </span>
              <h2 className="fw-bold mb-3">
                有預測需求指數
                <br />
                不讓你白跑一趟。
              </h2>
              <p className="text-muted">
                我們的 APP 內建 <strong>AI 預測分數系統</strong>：
              </p>

              <ul className="list-unstyled mt-4">
                <li className="mb-3">
                  <h5 className="fw-bold">🔥 熱點預測地圖</h5>
                  <p className="small text-muted">
                    地圖顏色深淺代表需求強度，直接導航至高分區域。
                  </p>
                </li>
                <li className="mb-3">
                  <h5 className="fw-bold">📈 獲利分數 (Score)</h5>
                  <p className="small text-muted">
                    我們會為每條路線打分數，跟著高分走，空車率降低 30%。
                  </p>
                </li>
              </ul>

              {/* ⭐ 加入司機行列 → 進入司機端 */}
              <button
                type="button"
                className="btn btn-outline-dark mt-3"
                onClick={() => onDriverClick?.()}
              >
                加入司機行列
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="bg-dark text-white py-5 text-center">
        <div className="container">
          <h3 className="mb-4">立即體驗智慧派遣</h3>
          <div className="d-flex justify-content-center gap-3">
            <button className="btn btn-light btn-lg">🍎 iOS 下載</button>
            <button className="btn btn-light btn-lg">🤖 Android 下載</button>
          </div>
          <p className="mt-5 text-white-50 small">
            © 2025 SmartDispatch Project. Department of Computer Science.
          </p>
        </div>
      </footer>
    </div>
  )
}
