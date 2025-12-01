// src/views/DriverView.jsx
import MapView from '../components/MapView.jsx'
import OrderList from '../components/OrderList.jsx'

export default function DriverView({
  lang,
  drivers,
  orders,
  ordersWithLocations,
  loading,
  error,
  currentDriverId,
  setCurrentDriverId,
  acceptOrder,
  refresh,
  currentUser,
}) {
  // 小工具：把車種字串轉成「全大寫」，沒有就回 null
  const normalizeType = value => {
    if (typeof value !== 'string') return null
    return value.toUpperCase()
  }

  // 找出目前這台司機車
  const myDriver =
    currentDriverId != null
      ? drivers.find(d => d.id === currentDriverId)
      : null

  // 司機的車種（用全大寫版本）
  // 優先用 myDriver.carType，沒有就用 currentUser.carType
  const myCarType = normalizeType(
    myDriver?.carType ?? currentUser?.carType ?? null
  )

  // ✅ 用「有座標」的 ordersWithLocations 來做篩選
  // 這樣 OrderList 裡才能拿到 pickupLocation 去算派遣分數
  const pendingOrders = ordersWithLocations.filter(o => {
    if (o.status !== 'pending') return false

    // 司機沒有設定車種 → 先全部顯示
    if (!myCarType) return true

    const orderType = normalizeType(o.vehicleType)

    // 舊訂單沒車種欄位 → 全部顯示
    if (!orderType) return true

    // 比較「全大寫」車種
    return orderType === myCarType
  })

  // 地圖上只顯示目前登入的這台司機車
  const visibleDrivers = myDriver ? [myDriver] : []

  return (
    <section className="map-section">
      <div className="map-wrapper">
        <MapView
          drivers={visibleDrivers}
          orders={ordersWithLocations}
          mode="driver"
          currentDriverId={currentDriverId}
        />
      </div>

      <aside className="side-panel">
        <div className="panel-inner">
          <h1 className="panel-title">司機端</h1>

          <div className="field-label">目前司機</div>
          <div className="current-driver-box">
            {currentUser?.username || '尚未登入'}
          </div>

          <section className="orders-block">
            <div className="orders-header">
              <h3>待接訂單</h3>
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
              orders={pendingOrders}
              isDriverView
              onAcceptOrder={acceptOrder}
              drivers={drivers}
              currentDriverId={currentDriverId}
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
