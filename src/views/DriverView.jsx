// src/views/DriverView.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import MapView from '../components/MapView.jsx'
import OrderList from '../components/OrderList.jsx'
import { t } from '../i18n'

// ✅ 把任何來源的車種字串統一成：YELLOW / GREEN / FHV
function normalizeVehicleType(value) {
  if (value == null) return null
  const s = String(value).trim().toUpperCase()
  if (!s) return null

  if (s === 'YELLOW' || s.includes('YELLOW')) return 'YELLOW'
  if (s === 'GREEN' || s.includes('GREEN')) return 'GREEN'
  if (s === 'FHV' || s.includes('FHV')) return 'FHV'

  // 中文保底
  if (s.includes('黃')) return 'YELLOW'
  if (s.includes('綠')) return 'GREEN'
  if (s.includes('多元')) return 'FHV'

  return null
}

function sameId(a, b) {
  const A = Number(a)
  const B = Number(b)
  return Number.isFinite(A) && Number.isFinite(B) && A === B
}

function isPendingStatus(status) {
  return String(status || '').trim().toLowerCase() === 'pending'
}

function normStatus(status) {
  return String(status || '').trim().toLowerCase()
}

function getPickupLoc(o) {
  const p = o?.pickupLocation
  if (p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))) {
    return { lat: Number(p.lat), lng: Number(p.lng) }
  }
  const lat = Number(o?.pickupLat)
  const lng = Number(o?.pickupLng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  return null
}

function getDropoffLoc(o) {
  const d = o?.dropoffLocation
  if (d && Number.isFinite(Number(d.lat)) && Number.isFinite(Number(d.lng))) {
    return { lat: Number(d.lat), lng: Number(d.lng) }
  }
  const lat = Number(o?.dropoffLat)
  const lng = Number(o?.dropoffLng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  return null
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
  if (!data.routes || !data.routes.length) throw new Error('OSRM no route')
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
  setCurrentDriverId, // 保留
  acceptOrder,
  refresh,
  currentUser,
  onDriverLocationChange,
  simulateVehicles,
  onOpenAuth,
  onOrderCompleted,
}) {
  const goAuth = () => {
    if (onOpenAuth) {
      onOpenAuth('driver', 'driver')
      return
    }
    const base = window.location.pathname
    window.location.href = `${base}?auth=1&role=driver`
  }

  // ✅ 一律以「完整資料」優先
  const allOrders = useMemo(() => {
    if (Array.isArray(ordersWithLocations) && ordersWithLocations.length) return ordersWithLocations
    if (Array.isArray(orders) && orders.length) return orders
    return []
  }, [ordersWithLocations, orders])

  // ✅ 找出目前司機：先用 id；找不到就用 username/name fallback
  const myDriver = useMemo(() => {
    if (currentDriverId != null) {
      const byId = drivers.find(d => sameId(d?.id, currentDriverId))
      if (byId) return byId
    }
    const u = currentUser?.username
    if (u) {
      const byName = drivers.find(d => String(d?.name || d?.username || '').trim() === String(u).trim())
      if (byName) return byName
    }
    return null
  }, [drivers, currentDriverId, currentUser])

  // ✅ 真正應該用的 driverId（避免錯位）
  const effectiveDriverId = myDriver?.id ?? currentDriverId ?? null

  // ✅ 自動校正 currentDriverId（只要偵測到不一致就修回 driver.id）
  useEffect(() => {
    if (!setCurrentDriverId) return
    if (myDriver?.id == null) return
    if (currentDriverId == null) return
    if (!sameId(currentDriverId, myDriver.id)) setCurrentDriverId(myDriver.id)
  }, [myDriver, currentDriverId, setCurrentDriverId])

  const myCarType = normalizeVehicleType(myDriver?.carType ?? currentUser?.carType ?? null)

  const [orderDistances, setOrderDistances] = useState({})
  const [completedNotice, setCompletedNotice] = useState('')
  const completedSeenRef = useRef(new Set())

  // ====== 1) 地圖只畫「屬於自己」且「進行中」最新 1 張 ======
  const myActiveOrder = useMemo(() => {
    if (effectiveDriverId == null) return null

    const ACTIVE = new Set(['assigned', 'accepted', 'en_route', 'enroute', 'picked_up', 'in_progress', 'on_trip', 'ongoing'])

    const candidates = allOrders
      .filter(o => o && sameId(o.driverId, effectiveDriverId))
      .filter(o => ACTIVE.has(normStatus(o.status)))

    if (!candidates.length) return null

    const getTs = o => {
      const u = o.updatedAt ? Date.parse(o.updatedAt) : NaN
      if (Number.isFinite(u)) return u
      const c = o.createdAt ? Date.parse(o.createdAt) : NaN
      if (Number.isFinite(c)) return c
      return typeof o.id === 'number' ? o.id : Number(o.id) || 0
    }

    candidates.sort((a, b) => getTs(b) - getTs(a))
    return candidates[0]
  }, [allOrders, effectiveDriverId])

  const ordersForMap = useMemo(() => (myActiveOrder ? [myActiveOrder] : []), [myActiveOrder])

  // ====== 2) 我的已完成訂單 ======
  const myCompletedOrders = useMemo(() => {
    if (effectiveDriverId == null) return []
    const done = allOrders
      .filter(o => o && sameId(o.driverId, effectiveDriverId))
      .filter(o => normStatus(o.status) === 'completed')

    const getTs = o => {
      const u = o.completedAt ? Date.parse(o.completedAt) : NaN
      if (Number.isFinite(u)) return u
      const x = o.updatedAt ? Date.parse(o.updatedAt) : NaN
      if (Number.isFinite(x)) return x
      const c = o.createdAt ? Date.parse(o.createdAt) : NaN
      if (Number.isFinite(c)) return c
      return typeof o.id === 'number' ? o.id : Number(o.id) || 0
    }

    done.sort((a, b) => getTs(b) - getTs(a))
    return done
  }, [allOrders, effectiveDriverId])

  // ====== 3) 偵測剛完成 → 顯示通知 ======
  useEffect(() => {
    if (!myCompletedOrders.length) return

    let newlyCompleted = null
    for (const o of myCompletedOrders) {
      if (!completedSeenRef.current.has(o.id)) {
        newlyCompleted = o
        completedSeenRef.current.add(o.id)
        break
      }
    }
    if (!newlyCompleted) return

    const price =
      typeof newlyCompleted.estimatedFare === 'number'
        ? newlyCompleted.estimatedFare
        : typeof newlyCompleted.estimatedPrice === 'number'
        ? newlyCompleted.estimatedPrice
        : null

    setCompletedNotice(
      `此筆訂單已完成（#${newlyCompleted.id}），已完成共：${price != null ? `$${price.toFixed(2)}` : '金額未知'}`
    )

    const timer = setTimeout(() => setCompletedNotice(''), 7000)
    return () => clearTimeout(timer)
  }, [myCompletedOrders])

  // ====== 計算 pending 訂單到上車點距離 ======
  useEffect(() => {
    async function computeDistances() {
      if (!myDriver || typeof myDriver.lat !== 'number' || typeof myDriver.lng !== 'number') {
        setOrderDistances({})
        return
      }

      const distMap = {}
      const pending = allOrders.filter(o => isPendingStatus(o?.status))

      for (const o of pending) {
        const pickup = getPickupLoc(o)
        if (!pickup) continue
        try {
          const dKm = await osrmDistanceKm(
            { lat: myDriver.lat, lng: myDriver.lng },
            { lat: pickup.lat, lng: pickup.lng }
          )
          distMap[o.id] = dKm
        } catch (e) {
          console.warn('OSRM distance error for order', o?.id, e)
        }
      }

      setOrderDistances(distMap)
    }

    computeDistances()
  }, [myDriver, allOrders])

  // ✅ 待接訂單列表
  const pendingOrders = useMemo(() => {
    return allOrders
      .filter(o => isPendingStatus(o?.status))
      .filter(o => {
        if (!myCarType) return true
        const orderType = normalizeVehicleType(o?.vehicleType)
        if (!orderType) return true
        return orderType === myCarType
      })
      .map(o => {
        let dispatchScore = null
        let driverDistanceKm = null

        if (myDriver && typeof myDriver.lat === 'number' && typeof myDriver.lng === 'number') {
          const d = orderDistances[o.id]
          if (typeof d === 'number') {
            driverDistanceKm = d
            const rawScore = 11 - d
            dispatchScore = Math.max(1, Math.min(10, Math.round(rawScore)))
          }
        }

        const tripDistanceKm = typeof o.distanceKm === 'number' ? o.distanceKm : null
        const tripPrice =
          typeof o.estimatedFare === 'number'
            ? o.estimatedFare
            : typeof o.estimatedPrice === 'number'
            ? o.estimatedPrice
            : null

        return {
          ...o,
          pickupLocation: o.pickupLocation ?? getPickupLoc(o) ?? null,
          dropoffLocation: o.dropoffLocation ?? getDropoffLoc(o) ?? null,
          dispatchScore,
          driverDistanceKm,
          distanceKm: tripDistanceKm,
          price: tripPrice,
        }
      })
  }, [allOrders, myCarType, myDriver, orderDistances])

  // ✅ debug logs（不會炸）
  useEffect(() => {
    console.log('DriverView allOrders:', allOrders)
    console.log('DriverView pendingOrders:', pendingOrders)
    console.log('myCarType:', myCarType, 'effectiveDriverId:', effectiveDriverId, 'myDriver:', myDriver)
  }, [allOrders, pendingOrders, myCarType, effectiveDriverId, myDriver])

  const visibleDrivers = myDriver ? [myDriver] : []
  const isLoggedIn = Boolean(currentUser?.username)

  return (
    <section className="map-section">
      <div className="map-wrapper">
        <MapView
          lang={lang}
          drivers={visibleDrivers}
          orders={ordersForMap}
          mode="driver"
          currentDriverId={effectiveDriverId}
          onDriverLocationChange={onDriverLocationChange}
          simulateVehicles={simulateVehicles}
          onOrderCompleted={onOrderCompleted}
        />
      </div>

      <aside className="side-panel">
        <div className="panel-inner">
          <h1 className="panel-title">{t(lang, 'driverMode')}</h1>

          <div className="field-label">{t(lang, 'currentDriverLabel')}</div>

          {isLoggedIn ? (
            <div className="current-driver-box">{currentUser.username}</div>
          ) : (
            <button
              type="button"
              className="current-driver-box"
              onClick={goAuth}
              style={{ cursor: 'pointer' }}
              aria-label="請先登入"
            >
              請先登入
            </button>
          )}

          {completedNotice && (
            <div className="auth-hint" style={{ marginTop: 10, color: '#ff5252', fontWeight: 700 }}>
              {completedNotice}
            </div>
          )}

          {myDriver && (myDriver.lat == null || myDriver.lng == null) && (
            <div className="auth-hint" style={{ marginTop: 8, color: '#ffc107' }}>
              請先在地圖上點一下，手動設定您目前的位置。
            </div>
          )}

          {isLoggedIn && myCompletedOrders.length > 0 && (
            <section className="orders-block" style={{ marginTop: 14 }}>
              <div className="orders-header">
                <h3>已完成訂單</h3>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {myCompletedOrders.slice(0, 5).map(o => {
                  const price =
                    typeof o.estimatedFare === 'number'
                      ? o.estimatedFare
                      : typeof o.estimatedPrice === 'number'
                      ? o.estimatedPrice
                      : null

                  return (
                    <div
                      key={`done-${o.id}`}
                      style={{
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 12,
                        padding: 12,
                        opacity: 0.7,
                        background: 'rgba(0, 0, 0, 0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontWeight: 800 }}>
                          訂單 #{o.id}{' '}
                          <span style={{ color: 'rgba(2, 156, 69, 0.25)', marginLeft: 8, fontWeight: 900 }}>已完成</span>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>
                          {o.completedAt ? new Date(o.completedAt).toLocaleString() : ''}
                        </div>
                      </div>

                      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.4 }}>
                        <div>乘客：{o.customer || '-'}</div>
                        <div>上車：{o.pickup}</div>
                        <div>目的地：{o.dropoff}</div>
                        {Array.isArray(o.stops) && o.stops.length > 0 && (
                          <div>
                            停靠點：{o.stops.map(s => s?.label || s?.text || '').filter(Boolean).join(' → ')}
                          </div>
                        )}
                        <div>
                          距離：{typeof o.distanceKm === 'number' ? `${o.distanceKm} km` : '-'}，已完成：
                          {price != null ? ` $${price.toFixed(2)}` : ' -'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <section className="orders-block" style={{ marginTop: 14 }}>
            <div className="orders-header">
              <h3>{t(lang, 'ordersTitleDriver')}</h3>
              <button className="ghost-btn" type="button" onClick={refresh} disabled={loading}>
                {t(lang, 'refresh')}
              </button>
            </div>

            <OrderList
              lang={lang}
              orders={pendingOrders}
              isDriverView
              onAcceptOrder={acceptOrder}
              drivers={drivers}
              currentDriverId={effectiveDriverId}
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
