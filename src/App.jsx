// src/App.jsx
import { useEffect, useState } from "react";

// 地圖相關畫面
import RiderView from "./views/RiderView";
import DriverView from "./views/DriverView";

// Landing + 登入/註冊
import LandingPage from "./LandingPage";
import AuthPage from "./AuthPage";

// 多國語系
import { translations, LANGS, DEFAULT_LANG } from "./i18n";

import "./App.css";

// 後端 API 的 base 路徑（前後端同一個 domain，用 /api 就好）
const API_BASE = "/api";

// 紐約中心點
const NYC_CENTER = [40.758, -73.9855];

// 固定地點（乘客下單的起訖點選單）
const PLACES = [
  { id: "ts", name: "Times Square", lat: 40.758, lng: -73.9855 },
  { id: "cp", name: "Central Park", lat: 40.7812, lng: -73.9665 },
  { id: "ws", name: "Wall Street", lat: 40.706, lng: -74.009 },
  {
    id: "bbp",
    name: "Brooklyn Bridge Park",
    lat: 40.7003,
    lng: -73.9967,
  },
];

const VIEW = {
  RIDER: "rider",
  DRIVER: "driver",
};

const PAGE = {
  LANDING: "landing", // 首頁（三個按鈕）
  APP: "app",         // 地圖（乘客 / 司機）
  AUTH: "auth",       // 登入 / 註冊
};

function App() {
  // ===== 語言 =====
  const [lang, setLang] = useState(DEFAULT_LANG);
  const t = translations[lang] || translations[DEFAULT_LANG];

  // ===== 讀網址參數，決定初始頁面 / 初始角色 =====
  const [page, setPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("page") || PAGE.LANDING; // ⭐ 預設是 landing
  });

  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get("role");
    if (role === "driver") return VIEW.DRIVER;
    return VIEW.RIDER; // 預設乘客端
  });

  // ===== 共用狀態：司機 / 訂單 =====
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);

  // 這個瀏覽器視角自己的資訊
  const [myOrderId, setMyOrderId] = useState(null);
  const [currentDriverId, setCurrentDriverId] = useState(null);

  // ===== 語言切換 =====
  const handleLangChange = (e) => {
    setLang(e.target.value);
  };

  // ===== 把 page / view 同步到網址參數（方便分享連結） =====
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    params.set("page", page);
    if (page === PAGE.APP) {
      params.set("role", view === VIEW.DRIVER ? "driver" : "passenger");
    } else {
      params.delete("role");
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }, [page, view]);

  // ===== 從後端抓 orders + drivers（只要在 APP 頁就定時抓） =====
  useEffect(() => {
    if (page !== PAGE.APP) return;

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

        // 如果還沒選司機，就預設第一位
        if (!currentDriverId && driversData.length > 0) {
          setCurrentDriverId(String(driversData[0].id));
        }
      } catch (err) {
        console.error("抓 orders/drivers 失敗", err);
      }
    };

    fetchAll();
    const id = setInterval(fetchAll, 2000);
    return () => clearInterval(id);
  }, [page, currentDriverId]);

  // ===== 乘客建立訂單 =====
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

      if (!res.ok) {
        throw new Error(`建立訂單失敗：${res.status}`);
      }

      const created = await res.json();
      setOrders((prev) => [...prev, created]); // 先樂觀加入
      setMyOrderId(created.id);
    } catch (err) {
      console.error("建立訂單失敗", err);
      alert("建立訂單失敗");
    }
  };

  // ===== 司機接單 =====
  const handleDriverAccept = async (orderId, driverId) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });

      if (!res.ok) {
        throw new Error(`接單 API 回應失敗：${res.status}`);
      }

      const data = await res.json();
      if (!data.order) {
        console.error("接單 API 回傳格式不正確：", data);
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

  // ===== 導覽用的幾個 helper =====
  const goLanding = () => setPage(PAGE.LANDING);

  const goPassengerApp = () => {
    setView(VIEW.RIDER);
    setPage(PAGE.APP);
  };

  const goDriverApp = () => {
    setView(VIEW.DRIVER);
    setPage(PAGE.APP);
  };

  const goAuth = () => setPage(PAGE.AUTH);

  // ===== 實際畫面切換 =====

  // 1) 首頁 Landing（三個按鈕）
  if (page === PAGE.LANDING) {
    return (
      <LandingPage
        onGoPassenger={goPassengerApp}
        onGoDriver={goDriverApp}
        onGoAuth={goAuth}
      />
    );
  }

  // 2) 登入 / 註冊頁
  if (page === PAGE.AUTH) {
    return (
      <AuthPage
        lang={lang}
        onLangChange={handleLangChange}
        onBack={goLanding}
      />
    );
  }

  // 3) 地圖 App（乘客端 / 司機端）
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
                "view-switch-btn" +
                (view === VIEW.RIDER ? " active" : "")
              }
              onClick={() => setView(VIEW.RIDER)}
            >
              {t.riderTab ?? "乘客端"}
            </button>
            <button
              className={
                "view-switch-btn" +
                (view === VIEW.DRIVER ? " active" : "")
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

      {/* 主畫面：乘客端 / 司機端 */}
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
