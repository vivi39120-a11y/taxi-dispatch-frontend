// src/App.jsx
import { useEffect, useState } from 'react';
import RiderView from './views/RiderView';
import DriverView from './views/DriverView';
import { translations, LANGS, DEFAULT_LANG } from './i18n';
import './App.css';

// 🔹 API 位址：自動用現在網址的 host
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

function App() {
  // 🔹 目前是乘客端還是司機端（預設 null：先讓使用者選）
  const [role, setRole] = useState(null);

  // 共用狀態：司機 + 訂單（從 API 來）
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);

  // 這個瀏覽器視角的「我的訂單 / 我是哪個司機」
  const [myOrderId, setMyOrderId] = useState(null);
  const [currentDriverId, setCurrentDriverId] = useState(null);

  // 語言
  const [lang, setLang] = useState(DEFAULT_LANG);
  const t = translations[lang];

  // 🔹 從後端抓 orders + drivers，並每 2 秒更新一次（假即時）
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
        console.error('抓 orders/drivers 失敗', err);
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup, dropoff }),
      });
      const created = await res.json();

      // 先自己加進來（不用等 2 秒後的輪詢）
      setOrders((prev) => [...prev, created]);
      setMyOrderId(created.id);
    } catch (err) {
      console.error('建立訂單失敗', err);
      alert('建立訂單失敗');
    }
  };

  // 司機接單 → 呼叫後端 API
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

      // 先樂觀更新一下
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

  // 🔹 第一次要先選「乘客 / 司機」的畫面
  const renderRoleSelect = () => {
    return (
      <div className="role-select-wrapper">
        <div className="role-select-card">
          <h2>{t.chooseRoleTitle ?? '請選擇使用模式'}</h2>
          <p className="role-select-sub">
            {t.chooseRoleSub ??
              '你可以選擇以乘客或司機身分使用系統，選擇後只會看到對應的畫面。'}
          </p>
          <div className="role-select-buttons">
            <button
              className="role-btn passenger"
              onClick={() => setRole(VIEW.RIDER)}
            >
              {t.riderTab ?? '乘客 Passenger'}
            </button>
            <button
              className="role-btn driver"
              onClick={() => setRole(VIEW.DRIVER)}
            >
              {t.driverTab ?? '司機 Driver'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="uber-dispatch-root">
      {/* 上方 bar：品牌 + 目前模式 + 語言切換 */}
      <header className="uber-dispatch-topbar">
        <div className="topbar-left">
          <div className="brand-row">
            <span className="brand-dot" />
            <span className="brand-text">NY Taxi Demo</span>
          </div>
          <div className="brand-sub">
            {t.subtitle ?? '乘客端 / 司機端 透過同一個後端即時連動'}
          </div>
        </div>

        <div className="topbar-center">
          {role === VIEW.RIDER && (
            <div className="current-role-label">
              {t.riderTab ?? '乘客端 Passenger'}
            </div>
          )}
          {role === VIEW.DRIVER && (
            <div className="current-role-label">
              {t.driverTab ?? '司機端 Driver'}
            </div>
          )}
          {role === null && (
            <div className="current-role-label">
              {t.chooseRoleShort ?? '請先選擇乘客或司機'}
            </div>
          )}
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

          {/* 方便你測試，如果不想讓使用者切換，可以把這整個 button 刪掉 */}
          {role && (
            <button
              className="switch-role-btn"
              onClick={() => {
                setRole(null);
                setMyOrderId(null);
                setCurrentDriverId(null);
              }}
            >
              {t.switchRole ?? '切換模式'}
            </button>
          )}
        </div>
      </header>

      {/* 主畫面 */}
      <div className="uber-dispatch-main">
        {/* 還沒選角色 → 顯示選擇畫面 */}
        {role === null && renderRoleSelect()}

        {/* 只顯示其中一端 */}
        {role === VIEW.RIDER && (
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

        {role === VIEW.DRIVER && (
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
