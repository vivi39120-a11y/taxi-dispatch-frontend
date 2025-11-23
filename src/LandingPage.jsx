// src/views/LandingPage.jsx
import { useNavigate } from "react-router-dom";

// 直接用 inline style 還原原本的 CSS
const heroSectionStyle = {
  backgroundImage:
    'url("https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1920&auto=format&fit=crop")',
  backgroundSize: "cover",
  backgroundPosition: "center",
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  position: "relative",
};

const heroOverlayStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.4)",
  zIndex: 1,
};

const heroContentStyle = {
  position: "relative",
  zIndex: 2,
  width: "100%",
};

const bookingCardStyle = {
  background: "#ffffff",
  padding: "30px",
  borderRadius: "12px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
};

const driverSectionStyle = {
  backgroundColor: "#f8f9fa",
  padding: "80px 0",
};

function LandingPage() {
  const navigate = useNavigate();

  const goPassenger = () => {
    // 進到地圖，預設乘客端
    navigate("/app?role=passenger");
  };

  const goDriver = () => {
    // 進到地圖，預設司機端
    navigate("/app?role=driver");
  };

  const goAuth = () => {
    // 進到登入 / 註冊頁
    navigate("/auth");
  };

  return (
    <div id="top">
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
              {/* 我是乘客 */}
              <li className="nav-item">
                <button
                  type="button"
                  className="nav-link btn btn-link text-white"
                  onClick={goPassenger}
                >
                  我是乘客
                </button>
              </li>

              {/* 我是司機 */}
              <li className="nav-item">
                <button
                  type="button"
                  className="nav-link btn btn-link text-white"
                  onClick={goDriver}
                >
                  我是司機
                </button>
              </li>

              {/* 登入 / 註冊 */}
              <li className="nav-item">
                <button
                  type="button"
                  className="nav-link btn btn-primary text-white ms-2 px-3"
                  onClick={goAuth}
                >
                  登入 / 註冊
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* 乘客 hero 區塊 */}
      <section style={heroSectionStyle} id="passenger">
        <div style={heroOverlayStyle} />
        <div className="container" style={heroContentStyle}>
          <div className="row align-items-center">
            <div className="col-lg-6 text-white mb-5 mb-lg-0">
              <h1 className="display-4 fw-bold">計程車派遣系統</h1>
              <p className="lead mb-4">
                利用大數據分析，讓您不浪費時間等待。
              </p>
            </div>

            <div className="col-lg-5 offset-lg-1">
              <div style={bookingCardStyle}>
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

                  {/* 之後要顯示預估價格可以把這段打開 */}
                  {/* <div className="mb-3">
                    <p className="fw-bold text-success">預估金額：$150 - $180</p>
                  </div> */}

                  <button
                    type="button"
                    className="btn btn-dark w-100 btn-lg py-3 fw-bold"
                    onClick={goPassenger}
                  >
                    查看價格與車輛
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 司機招募區塊 */}
      <section style={driverSectionStyle} id="driver">
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
              <span className="badge bg-warning text-dark mb-2">司機專屬</span>
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

              <button
                type="button"
                className="btn btn-outline-dark mt-3"
                onClick={goDriver}
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
  );
}

export default LandingPage;
