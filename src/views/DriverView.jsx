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
  const pendingOrders = orders.filter(o => o.status === 'pending')

  // 找出目前登入的這台司機車
  const myDriver =
    currentDriverId != null
      ? drivers.find(d => d.id === currentDriverId)
      : null

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
