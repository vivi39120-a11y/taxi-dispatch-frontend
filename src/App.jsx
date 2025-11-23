// src/App.jsx
import { useEffect, useState } from "react";
import RiderView from "./views/RiderView";
import DriverView from "./views/DriverView";
import { translations, LANGS, DEFAULT_LANG } from "./i18n";
import "./App.css";

// API 位址：同一個 host + /api
const API_BASE = "/api";

// 紐約中心點
const NYC_CENTER = [40.758, -73.9855];

// 固定幾個地點（上車 / 目的地選單用）
const PLACES = [
  { id: "ts", name: "Times Square", lat: 40.758, lng: -73.9855 },
  { id: "cp", name: "Central Park", lat: 40.7812, lng: -73.9665 },
  { id: "ws", name: "Wall Street", lat: 40.706, lng: -74.009 },
  { id: "bbp", name: "Brooklyn Bridge Park", lat: 40.7003, lng: -73.9967 },
];

const VIEW = {
  RIDER: "rider",
  DRIVER: "driver",
};

/* ---------------------- 首頁 Landing Page ---------------------- */

function LandingPage({ onEnterApp }) {
  return (
    <>
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
              <li className="nav-item">
                <a className="nav-link active" href="#passenger">
                  我是乘客
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#driver">
                  我是司機
                </a>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className="nav-link btn btn-primary text-white ms-2 px-3"
                  onClick={onEnterApp}
                >
                  進入派遣系統
                </button>
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

                  {/* 這裡先隱藏預估價格區塊（之後可以接 API） */}
                  <div id="price-estimate" className="mb-3 d-none">
                    <p className="fw-bold text-success">預估金額：$150 - $180</p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-dark w-100 btn-lg py-3 fw-bold"
                    onClick={onEnterApp}
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
              <button type="button" className="btn btn-outline-dark mt-3">
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
    </>
  );
}

/* ---------------------- 原本的派車 App ---------------------- */

function App() {
  // 🔸 先顯示首頁，再進到派車系統
  const [showLanding, setShowLanding] = useState(true);

  // 畫面是乘客端還是司機端
  const [view, setView] = useState(VIEW.RIDER);

  // 共用狀態：司機 + 訂單（從 API 來）
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);

  // 這個瀏覽器視角的「我的訂單 / 我是哪個司機」
  const [myOrderId, setMyOrderId] = useState(null);
  const [currentDriverId, setCurrentDriverId] = useState(null);

  // 語言
  const [lang, setLang] = useState(DEFAULT_LANG);
  const t = translations[lang];

  // 從後端抓 orders + drivers，並每 2 秒更新一次（假即時）
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ordersRes, driversRes] = await Promise.all([
          fetch(`${API_BASE}/orders`),
          fetch(`${API_BASE}/drivers`),
        ]);
        const [ordersData, driversData] = await Promise.all([
          ordersRes.json(),
          driversRes.json(),
        ]);

        setOrders(ordersData);
        setDrivers(driversData);

        // 如果還沒選司機，就預設第一個
        if (!currentDriverId && driversData.length > 0) {
          setCurrentDriverId(String(driversData[0].id));
        }
      } catch (err) {
        console.error("抓 orders/drivers 失敗", err);
      }
    };

    fetchAll();
    const id = setInterval(fetchAll, 2000); // 每 2 秒重新抓
    return () => clearInterval(id);
  }, [currentDriverId]);

  // 乘客建立訂單 → 呼叫後端 API
  const handleCreateOrder = async ({ pickupId, dropoffId }) => {
    const pickup = PLACES.find((p) => p.id === pickupId);
    const dropoff = PLACES.find((p) => p.id === dropoffId);
    if (!pickup || !dropoff) return;

    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickup, dropoff }),
      });
      const created = await res.json();

      // 先自己加進來（不用等 2 秒後的輪詢）
      setOrders((prev) => [...prev, created]);
      setMyOrderId(created.id);
    } catch (err) {
      console.error("建立訂單失敗", err);
      alert("建立訂單失敗");
    }
  };

  // 司機接單 → 呼叫後端 API
  const handleDriverAccept = async (orderId, driverId) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      const data = await res.json();
      if (!data.order) {
        console.error("接單 API 回傳錯誤", data);
        return;
      }

      const updatedOrder = data.order;
      const updatedDriver = data.driver;

      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
      if (updatedDriver) {
        setDrivers((prev) =>
          prev.map((d) =>
            String(d.id) === String(updatedDriver.id) ? updatedDriver : d
          )
        );
      }
    } catch (err) {
      console.error("接單失敗", err);
      alert("接單失敗");
    }
  };

  const handleLangChange = (e) => {
    setLang(e.target.value);
  };

  // 🔸 還在首頁模式 → 顯示 SmartDispatch Landing Page
  if (showLanding) {
    return <LandingPage onEnterApp={() => setShowLanding(false)} />;
  }

  // 🔸 進入派車系統模式
  return (
    <div className="uber-dispatch-root">
      {/* 上方 bar：品牌 + 角色切換 + 語言切換 */}
      <header className="uber-dispatch-topbar">
        <div className="topbar-left">
          <div className="brand-row">
            <span className="brand-dot" />
            <span className="brand-text">NY Taxi Demo</span>
          </div>
          <div className="brand-sub">
            {t.subtitle ?? "同一個前端模擬 乘客端 / 司機端 即時連動"}
          </div>
        </div>

        <div className="topbar-center">
          <div className="view-switch">
            <button
              className={
                "view-switch-btn" + (view === VIEW.RIDER ? " active" : "")
              }
              onClick={() => setView(VIEW.RIDER)}
            >
              {t.riderTab ?? "乘客端"}
            </button>
            <button
              className={
                "view-switch-btn" + (view === VIEW.DRIVER ? " active" : "")
              }
              onClick={() => setView(VIEW.DRIVER)}
            >
              {t.driverTab ?? "司機端"}
            </button>
          </div>
        </div>

        <div className="topbar-right">
          <label className="lang-pill">
            {(t.languageLabel ?? "語言") + "："}
            <select value={lang} onChange={handleLangChange}>
              {Object.entries(LANGS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {/* 主畫面 */}
      <div className="uber-dispatch-main">
        {view === VIEW.RIDER && (
          <RiderView
            center={NYC_CENTER}
            places={PLACES}
            drivers={drivers}
            orders={orders}
            myOrderId={myOrderId}
            onCreateOrder={handleCreateOrder}
            t={t}
          />
        )}

        {view === VIEW.DRIVER && (
          <DriverView
            center={NYC_CENTER}
            drivers={drivers}
            orders={orders}
            currentDriverId={currentDriverId}
            setCurrentDriverId={setCurrentDriverId}
            onAcceptOrder={handleDriverAccept}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

export default App;
