// src/App.jsx
import { useEffect, useState } from 'react';
import RiderView from './views/RiderView';
import DriverView from './views/DriverView';
import AuthView from './views/AuthView'; // ⬅️ 新增登入/註冊畫面
import { translations, LANGS, DEFAULT_LANG } from './i18n';
import './App.css';

// 所有 API 都打同一個來源 + /api
const API_BASE = '/api';

// 紐約中心點
const NYC_CENTER = [40.758, -73.9855];

// 固定幾個地點（上車 / 目的地選單用）
const PLACES = [
  { id: 'ts', name: 'Times Square', lat: 40.758, lng: -73.9855 },
  { id: 'cp', name: 'Central Park', lat: 40.7812, lng: -73.9665 },
  { id: 'ws', name: 'Wall Street', lat: 40.706, lng: -74.009 },
  {
    id: 'bbp',
    name: 'Brooklyn Bridge Park',
    lat: 40.7003,
    lng: -73.9967,
  },
];

const VIEW = {
  RIDER: 'rider',
  DRIVER: 'driver',
};

// 從網址 query 讀取 role / page
function getInitialRole() {
  const params = new URLSearchParams(window.location.search);
  const role = params.get('role');
  if (role === 'driver') return VIEW.DRIVER;
  return VIEW.RIDER; // default: rider
}

function getInitialPage() {
  const params = new URLSearchParams(window.location.search);
  // ?page=auth → 顯示登入/註冊畫面，其餘都顯示派車地圖
  return params.get('page') || 'app';
}

function App() {
  // ===== URL 控制的東西 =====
  const [page, setPage] = useState(getInitialPage()); // 'app' or 'auth'
  const [view, setView] = useState(getInitialRole()); // rider / driver

  // ===== 共用狀態：司機 + 訂單（從 API 來） =====
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);

  // 這個瀏覽器視角的「我的訂單 / 我是哪個司機」
  const [myOrderId, setMyOrderId] = useState(null);
  const [currentDriverId, setCurrentDriverId] = useState(null);

  // 語言
  const [lang, setLang] = useState(DEFAULT_LANG);
  const t = translations[lang];

  // URL 改變（例如使用者手動改 query、按上一頁）時，同步更新 page / view
  useEffect(() => {
    const syncFromUrl = () => {
      setPage(getInitialPage());
      setView(getInitialRole());
    };
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  // 從後端抓 orders + drivers，並每 2 秒更新一次
  useEffect(() => {
    if (page !== 'app') return; // 在登入頁時就不用一直抓地圖資料

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
        console.error('抓 orders/drivers 失敗', err);
      }
    };

    fetchAll();
    const id = setInterval(fetchAll, 2000); // 每 2 秒重新抓
    return () => clearInterval(id);
  }, [currentDriverId, page]);

  // 乘客建立訂單
  const handleCreateOrder = async ({ pickupId, dropoffId }) => {
    const pickup = PLACES.find((p) => p.id === pickupId);
    const dropoff = PLACES.find((p) => p.id === dropoffId);
    if (!pickup || !dropoff) return;

    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup, dropoff }),
      });
      const created = await res.json();

      setOrders((prev) => [...prev, created]);
      setMyOrderId(created.id);
    } catch (err) {
      console.error('建立訂單失敗', err);
      alert('建立訂單失敗');
    }
  };

  // 司機接單
  const handleDriverAccept = async (orderId, driverId) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId }),
      });
      const data = await res.json();
      if (!data.order) {
        console.error('接單 API 回傳錯誤', data);
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
      console.error('接單失敗', err);
      alert('接單失敗');
    }
  };

  const handleLangChange = (e) => {
    setLang(e.target.value);
  };

  // ====== 如果是在登入/註冊頁 ======
  if (page === 'auth') {
    return (
      <div className="uber-dispatch-root">
        <header className="uber-dispatch-topbar">
          <div className="topbar-left">
            <div className="brand-row">
              <span className="brand-dot" />
              <span className="brand-text">NY Taxi Demo</span>
            </div>
            <div className="brand-sub">
              {t.subtitle ?? '登入 / 註冊後即可進入乘客端或司機端畫面'}
            </div>
          </div>

          <div className="topbar-right">
            <label className="lang-pill">
              {(t.languageLabel ?? '語言') + '：'}
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

        <div className="uber-dispatch-main">
          <AuthView t={t} />
        </div>
      </div>
    );
  }

  // ====== 一般派車地圖頁 (app) ======
  return (
    <div className="uber-dispatch-root">
      <header className="uber-dispatch-topbar">
        <div className="topbar-left">
          <div className="brand-row">
            <span className="brand-dot" />
            <span className="brand-text">NY Taxi Demo</span>
          </div>
          <div className="brand-sub">
            {t.subtitle ?? '同一個前端模擬 乘客端 / 司機端 即時連動'}
          </div>
        </div>

        {/* 上方不再顯示切換按鈕，因為從首頁就分開了 */}
        <div className="topbar-center" />

        <div className="topbar-right">
          <label className="lang-pill">
            {(t.languageLabel ?? '語言') + '：'}
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
