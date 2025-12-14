// src/views/DriverView.jsx
import { useEffect, useMemo, useState } from 'react'
import MapView from '../components/MapView.jsx'
import OrderList from '../components/OrderList.jsx'
import { t } from '../i18n'

function normalizeType(value) {
  if (typeof value !== 'string') return null
  return value.toUpperCase()
}

// 呼叫 OSRM 取得「司機 → 上車點」的道路距離 (km)
async function osrmDistanceKm(from, to) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=false`

  const res = await fetch(url)
  if (!res.ok) throw new Error('OSRM error')

  const data = await res.json()
  if (!data.routes || !data.routes.length) {
    throw new Error('OSRM no route')
  }

  // OSRM 回傳距離單位是公尺，轉成公里
  return data.routes[0].distance / 1000
}

export default function DriverView({
  lang,
  drivers,
  orders,
  ordersWithLocations,
  loading,
  error,
  currentDriverId,
  setCurrentDriverId, // 目前沒用到，但先保留
  acceptOrder,
  refresh,
  currentUser,
  onDriverLocationChange,
  simulateVehicles,
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

  // 用來存「每張訂單到司機上車點的 OSRM 道路距離」
  const [orderDistances, setOrderDistances] = useState({})

  // ====== 1) 司機地圖要畫哪一張單：只挑「屬於自己」且「進行中」的最新 1 張 ======
  const myActiveOrder = useMemo(() => {
    if (!currentDriverId) return null

    // 你後端狀態若不只 assigned，這裡用集合包起來更穩
    const ACTIVE = new Set([
      'assigned',
      'accepted',
      'en_route',
      'enroute',
      'picked_up',
      'in_progress',
      'on_trip',
      'ongoing',
    ])

    const candidates = ordersWithLocations
      .filter(o => o && o.driverId === currentDriverId)
      .filter(o => ACTIVE.has(String(o.status || '').toLowerCase()))

    if (!candidates.length) return null

    // 優先用 updatedAt/createdAt，其次用 id（避免第二張單被第一張單蓋掉）
    const getTs = o => {
      const u = o.updatedAt ? Date.parse(o.updatedAt) : NaN
      if (Number.isFinite(u)) return u
      const c = o.createdAt ? Date.parse(o.createdAt) : NaN
      if (Number.isFinite(c)) return c
      return typeof o.id === 'number' ? o.id : 0
    }

    candidates.sort((a, b) => getTs(b) - getTs(a))
    return candidates[0]
  }, [ordersWithLocations, currentDriverId])

  // ✅ MapView 一律只吃 0 或 1 張單，避免 MapView 內部只畫第一張而導致「第二位司機沒顯示」
  const ordersForMap = useMemo(() => {
    return myActiveOrder ? [myActiveOrder] : []
  }, [myActiveOrder])

  // 每當「司機位置 / 訂單列表 / 訂單座標」有變化，就重算一次距離
  useEffect(() => {
    async function computeDistances() {
      if (
        !myDriver ||
        typeof myDriver.lat !== 'number' ||
        typeof myDriver.lng !== 'number'
      ) {
        setOrderDistances({})
        return
      }

      const distMap = {}
      const pending = orders.filter(o => o.status === 'pending')

      for (const o of pending) {
        const loc = ordersWithLocations.find(ow => ow.id === o.id)
        const pickup = loc?.pickupLocation
        if (
          !pickup ||
          typeof pickup.lat !== 'number' ||
          typeof pickup.lng !== 'number'
        ) {
          continue
        }

        try {
          const dKm = await osrmDistanceKm(
            { lat: myDriver.lat, lng: myDriver.lng },
            { lat: pickup.lat, lng: pickup.lng }
          )
          distMap[o.id] = dKm
        } catch (e) {
          console.warn('OSRM distance error for order', o.id, e)
        }
      }

      setOrderDistances(distMap)
    }

    computeDistances()
  }, [myDriver, orders, ordersWithLocations])

  // 待接訂單列表：pending + 車種相容，計算派遣分數
  const pendingOrders = useMemo(() => {
    return orders
      .filter(o => o.status === 'pending')
      .filter(o => {
        if (!myCarType) return true
        const orderType = normalizeType(o.vehicleType)
        if (!orderType) return true
        return orderType === myCarType
      })
      .map(o => {
        let dispatchScore = null
        let driverDistanceKm = null

        // 派遣分數：用「司機 → 上車點」的 OSRM 距離
        if (
          myDriver &&
          typeof myDriver.lat === 'number' &&
          typeof myDriver.lng === 'number'
        ) {
          const d = orderDistances[o.id]
          if (typeof d === 'number') {
            driverDistanceKm = d
            const rawScore = 11 - d
            dispatchScore = Math.max(1, Math.min(10, Math.round(rawScore)))
          }
        }

        const tripDistanceKm =
          typeof o.distanceKm === 'number' ? o.distanceKm : null

        const tripPrice =
          typeof o.estimatedFare === 'number'
            ? o.estimatedFare
            : typeof o.estimatedPrice === 'number'
            ? o.estimatedPrice
            : null

        return {
          ...o,
          dispatchScore,
          driverDistanceKm,
          distanceKm: tripDistanceKm,
          price: tripPrice,
        }
      })
  }, [orders, myCarType, myDriver, orderDistances])

  const visibleDrivers = myDriver ? [myDriver] : []

  return (
    <section className="map-section">
      <div className="map-wrapper">
        <MapView
          lang={lang}
          drivers={visibleDrivers}
          orders={ordersForMap}
          mode="driver"
          currentDriverId={currentDriverId}
          onDriverLocationChange={onDriverLocationChange}
          simulateVehicles={simulateVehicles}
        />
      </div>

      <aside className="side-panel">
        <div className="panel-inner">
          <h1 className="panel-title">{t(lang, 'driverMode')}</h1>

          <div className="field-label">{t(lang, 'currentDriverLabel')}</div>
          <div className="current-driver-box">
            {currentUser?.username || t(lang, 'notLoggedIn')}
          </div>

          {myDriver && (myDriver.lat == null || myDriver.lng == null) && (
            <div className="auth-hint" style={{ marginTop: 8, color: '#ffc107' }}>
              請先在地圖上點一下，手動設定您目前的位置。
            </div>
          )}

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
