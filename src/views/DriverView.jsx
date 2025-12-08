// src/views/DriverView.jsx
import MapView from '../components/MapView.jsx'
import OrderList from '../components/OrderList.jsx'
import { t } from '../i18n'

function normalizeType(value) {
  if (typeof value !== 'string') return null
  return value.toUpperCase()
}

function distanceKm(a, b) {
  const toRad = d => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const la1 = toRad(a.lat)
  const la2 = toRad(b.lat)

  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(la1) * Math.cos(la2) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
  return R * c
}

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
  // 找出目前這台司機車
  const myDriver =
    currentDriverId != null
      ? drivers.find(d => d.id === currentDriverId)
      : null

  // 司機車種（大寫）
  const myCarType = normalizeType(
    myDriver?.carType ?? currentUser?.carType ?? null
  )

  // 過濾 pending + 車種相同的訂單，並計算派遣分數
  const pendingOrders = orders
    .filter(o => o.status === 'pending')
    .filter(o => {
      if (!myCarType) return true
      const orderType = normalizeType(o.vehicleType)
      if (!orderType) return true
      return orderType === myCarType
    })
    .map(o => {
      let dispatchScore = null

      if (
        myDriver &&
        typeof myDriver.lat === 'number' &&
        typeof myDriver.lng === 'number'
      ) {
        const loc = ordersWithLocations.find(ow => ow.id === o.id)
        const pickup = loc?.pickupLocation
        if (pickup && typeof pickup.lat === 'number') {
          const dist = distanceKm(
            { lat: myDriver.lat, lng: myDriver.lng },
            { lat: pickup.lat, lng: pickup.lng }
          )
          // 距離越近分數越高，大約 0km=10 分，10km=1 分
          const rawScore = 11 - dist
          dispatchScore = Math.max(1, Math.min(10, Math.round(rawScore)))
        }
      }

      return { ...o, dispatchScore }
    })

  const visibleDrivers = myDriver ? [myDriver] : []

  return (
    <section className="map-section">
      <div className="map-wrapper">
        <MapView
          lang={lang}
          drivers={visibleDrivers}
          orders={ordersWithLocations}
          mode="driver"
          currentDriverId={currentDriverId}
        />
      </div>

      <aside className="side-panel">
        <div className="panel-inner">
          <h1 className="panel-title">{t(lang, 'driverMode')}</h1>

          <div className="field-label">
            {t(lang, 'currentDriverLabel')}
          </div>
          <div className="current-driver-box">
            {currentUser?.username || t(lang, 'notLoggedIn')}
          </div>

          <section className="orders-block">
            <div className="orders-header">
              <h3>{t(lang, 'ordersTitleDriver')}</h3>
              <button
                className="ghost-btn"
                type="button"
                onClick={refresh}
                disabled={loading}
              >
                {t(lang, 'refresh')}
              </button>
            </div>

            <OrderList
              lang={lang}
              orders={pendingOrders}
              isDriverView
              onAcceptOrder={acceptOrder}
              drivers={drivers}
              currentDriverId={currentDriverId}
            />

            {loading && (
              <div className="auth-hint" style={{ marginTop: 8 }}>
                {t(lang, 'loading')}
              </div>
            )}
            {error && <div className="error-box">{error}</div>}
          </section>
        </div>
      </aside>
    </section>
  )
}
