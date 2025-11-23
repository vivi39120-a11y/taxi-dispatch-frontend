// src/App.jsx
import { useEffect, useState } from "react";
import RiderView from "./views/RiderView";
import DriverView from "./views/DriverView";
import { translations, LANGS, DEFAULT_LANG } from "./i18n";
import AuthPage from "./AuthPage";
import "./App.css";

// 所有 API 都打自己後端的 /api
const API_BASE = "/api";

// 紐約中心點
const NYC_CENTER = [40.758, -73.9855];

// 固定幾個地點（上車 / 目的地選單用）
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

// 根據 URL 決定預設是乘客或司機
function getInitialView() {
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role");
  if (role === "driver") return VIEW.DRIVER;
  return VIEW.RIDER;
}

// 根據 URL 決定是 app 地圖畫面還是 auth 登入畫面
function getInitialPage() {
  const params = new URLSearchParams(window.location.search);
  return params.get("page") === "auth" ? "auth" : "app";
}

function App() {
  // 畫面是乘客端還是司機端
  const [view, setView] = useState(getInitialView);

  // 目前是「地圖派遣系統」還是「登入 / 註冊頁」
  const [page, setPage] = useState(getInitialPage);

  // 共用狀態：司機 + 訂單（從 API 來）
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);

  // 這個瀏覽器視角的「我的訂單 / 我是哪個司機」
  const [myOrderId, setMyOrderId] = useState(null);
  const [currentDriverId, setCurrentDriverId] = useState(null);

  // 目前登入的使用者（假資料庫）
  const [currentUser, setCurrentUser] = useState(null);

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

      if (!res.ok) {
        console.error("建立訂單錯誤", created);
        alert(created.error || "建立訂單失敗");
        return;
      }

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

      if (!res.ok) {
        console.error("接單 API 回傳錯誤", data);
        alert(data.error || "接單失敗");
        return;
      }

      const updatedOrder = data.order;
      const updatedDriver = data.driver;

      // 更新 orders & drivers
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

  // 登入 / 註冊成功後：記錄 user，切到 app，並依身分切 view
  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setPage("app");
    if (user.role === "driver") {
      setView(VIEW.DRIVER);
    } else {
      setView(VIEW.RIDER);
    }
  };

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
          {page === "app" && (
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
          )}
        </div>

        <div className="topbar-right">
          {currentUser && (
            <div className="user-pill">
              <span className="user-role">
                {currentUser.role === "driver" ? "司機" : "乘客"}
              </span>
              <span className="user-name">{currentUser.name}</span>
            </div>
          )}

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
        {page === "auth" ? (
          <AuthPage onSuccess={handleAuthSuccess} />
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

export default App;
