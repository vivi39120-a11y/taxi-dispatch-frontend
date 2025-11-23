// src/App.jsx
import { useEffect, useState } from "react";
import RiderView from "./views/RiderView";
import DriverView from "./views/DriverView";
import AuthPage from "./AuthPage"; // 之前做的登入/註冊頁
import LandingPage from "./LandingPage"; // 剛新增的 Landing
import { translations, LANGS, DEFAULT_LANG } from "./i18n";
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

const PAGE = {
  LANDING: "landing",
  APP: "app",
  AUTH: "auth",
};

// 根據 URL 決定預設是乘客或司機
function getInitialView() {
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role");
  if (role === "driver") return VIEW.DRIVER;
  return VIEW.RIDER;
}

// 根據 URL 決定是 landing / app / auth
function getInitialPage() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("page") === "auth") return PAGE.AUTH;
  if (params.get("role")) return PAGE.APP;
  return PAGE.LANDING; // 沒帶東西就 landing
}

// 更新網址 query（不重整頁面）
function updateUrlQuery({ role, page }) {
  const params = new URLSearchParams();

  if (page === PAGE.AUTH) {
    params.set("page", "auth");
  } else if (role) {
    params.set("role", role);
  }

  const query = params.toString();
  const newUrl = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;

  window.history.pushState({}, "", newUrl);
}

function App() {
  // 畫面：landing / app / auth
  const [page, setPage] = useState(getInitialPage);

  // app 裡面的端：乘客 or 司機
  const [view, setView] = useState(getInitialView);

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

  // 從後端抓 orders + drivers，只有在 page === APP 時才抓
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
  }, [page, currentDriverId]);

  // 處理瀏覽器「上一頁 / 下一頁」：同步 page / view
  useEffect(() => {
    const onPop = () => {
      setPage(getInitialPage());
      setView(getInitialView());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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

  // 從 Landing 切到乘客端
  const goToPassengerApp = () => {
    setPage(PAGE.APP);
    setView(VIEW.RIDER);
    updateUrlQuery({ role: "passenger" });
  };

  // 從 Landing 切到司機端
  const goToDriverApp = () => {
    setPage(PAGE.APP);
    setView(VIEW.DRIVER);
    updateUrlQuery({ role: "driver" });
  };

  // 從 Landing 切到登入頁
  const goToAuth = () => {
    setPage(PAGE.AUTH);
    updateUrlQuery({ page: PAGE.AUTH });
  };

  // 登入 / 註冊成功
  const handleAuthSuccess = (user) => {
    setCurrentUser(user);

    if (user.role === "driver") {
      setView(VIEW.DRIVER);
      setPage(PAGE.APP);
      updateUrlQuery({ role: "driver" });
    } else {
      setView(VIEW.RIDER);
      setPage(PAGE.APP);
      updateUrlQuery({ role: "passenger" });
    }
  };

  // ====== 如果是在 Landing 頁，就只顯示 LandingPage ======
  if (page === PAGE.LANDING) {
    return (
      <LandingPage
        onSelectPassenger={goToPassengerApp}
        onSelectDriver={goToDriverApp}
        onSelectAuth={goToAuth}
      />
    );
  }

  // ====== 其餘頁面：上方是黑色 topbar，下方是 Auth 或 App 地圖 ======
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
          {page === PAGE.APP && (
            <div className="view-switch">
              <button
                className={
                  "view-switch-btn" +
                  (view === VIEW.RIDER ? " active" : "")
                }
                onClick={() => {
                  setView(VIEW.RIDER);
                  updateUrlQuery({ role: "passenger" });
                }}
              >
                {t.riderTab ?? "乘客端"}
              </button>
              <button
                className={
                  "view-switch-btn" +
                  (view === VIEW.DRIVER ? " active" : "")
                }
                onClick={() => {
                  setView(VIEW.DRIVER);
                  updateUrlQuery({ role: "driver" });
                }}
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
        {page === PAGE.AUTH ? (
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
