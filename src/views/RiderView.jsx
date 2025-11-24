// src/views/RiderView.jsx
import { useState } from 'react'
import MapView from '../components/MapView.jsx'
import OrderList from '../components/OrderList.jsx'

export default function RiderView({
  lang,
  drivers,
  orders,              // 這裡拿到的是「目前乘客」自己的訂單（App.jsx 已經有過濾）
  ordersWithLocations, // 同一批訂單，但加上 pickupLocation / dropoffLocation，用來畫地圖
  loading,
  error,
  createOrder,
  refresh,
  currentUser,
}) {
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')

  const handleCreateOrder = () => {
    if (!pickup.trim() || !dropoff.trim()) {
      alert('請輸入上車地點與目的地')
      return
    }
    // 呼叫 App 裡面的 createOrder（會寫到後端 & 更新 orders）
    createOrder(pickup.trim(), dropoff.trim())
    // 下單後只清空目的地（上車地點很多人會重複用同一個）
    setDropoff('')
  }

  return (
    <section className="map-section">
      {/* 左邊地圖 */}
      <div className="map-wrapper">
        <MapView
          drivers={drivers}              // MapView 內部會依照訂單 driverId 過濾
          orders={ordersWithLocations}   // 有座標的版本，拿來畫上車點 / 目的地
          mode="passenger"               // 乘客端模式：只顯示接到自己訂單的那一台車
        />
      </div>

      {/* 右邊操作面板 */}
      <aside className="side-panel">
        <div className="panel-inner">
          <h1 className="panel-title">乘客端</h1>

          {/* 目前登入的乘客 */}
          <div className="field-label">目前乘客：</div>
          <div className="current-driver-box">
            {currentUser?.username || '尚未登入'}
          </div>

          {/* 上車地點輸入 */}
          <div className="field-label" style={{ marginTop: 24 }}>
            上車地點（例如：Times Square）
          </div>
          <input
            className="text-input"
            type="text"
            placeholder="輸入上車地點"
            value={pickup}
            onChange={e => setPickup(e.target.value)}
          />

          {/* 目的地輸入 */}
          <div className="field-label" style={{ marginTop: 16 }}>
            目的地（例如：Central Park）
          </div>
          <input
            className="text-input"
            type="text"
            placeholder="輸入目的地"
            value={dropoff}
            onChange={e => setDropoff(e.target.value)}
          />

          {/* 叫車按鈕 */}
          <button
            type="button"
            className="primary-btn"
            style={{ marginTop: 24, width: '100%' }}
            onClick={handleCreateOrder}
            disabled={
              loading || !currentUser || currentUser.role !== 'passenger'
            }
          >
            叫車
          </button>

          {/* 我的訂單列表 */}
          <section className="orders-block" style={{ marginTop: 32 }}>
            <div className="orders-header">
              <h3>我的訂單</h3>
              <button
                className="ghost-btn"
                type="button"
                onClick={refresh}
                disabled={loading}
              >
                重新整理
              </button>
            </div>

            <OrderList
              orders={orders}
              drivers={drivers}
              // 乘客端：不傳 isDriverView，所以不會顯示「接單」按鈕
            />

            {loading && (
              <div className="auth-hint" style={{ marginTop: 8 }}>
                更新中…
              </div>
            )}
            {error && <div className="error-box">{error}</div>}
          </section>
        </div>
      </aside>
    </section>
  )
}
