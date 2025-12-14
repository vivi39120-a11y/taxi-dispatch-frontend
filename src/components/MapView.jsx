// src/components/MapView.jsx
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
} from 'react-leaflet'
import { useMemo, useEffect, useState } from 'react'
import {
  taxiIcon,
  passengerIcon,
  dropoffIcon,
  createStopIcon,
} from '../mapIcons'
import { t } from '../i18n'

const DEFAULT_CENTER = [40.758, -73.9855] // Times Square

// 司機在地圖上點一下就更新自己的位置
function DriverClickHandler({ enabled, driverId, onLocationChange }) {
  useMapEvents({
    click(e) {
      if (!enabled || !driverId || !onLocationChange) return

      const { lat, lng } = e.latlng

      // 1) 更新 React state（司機位置）
      onLocationChange({ id: driverId, lat, lng })

      // 2) PATCH API 更新後端
      fetch(`/api/drivers/${driverId}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      }).catch(() => {})

      // 3) 額外：存成「熱點需求要用的基準位置」
      try {
        localStorage.setItem(
          'hotspotBase',
          JSON.stringify({ lat, lng, driverId })
        )
      } catch (err) {
        console.error('save hotspotBase failed', err)
      }
    },
  })
  return null
}

// OSRM 小工具：給一串座標，回傳沿道路的路徑 [ [lat,lng], ... ]
async function fetchOsrmRoute(points) {
  if (!Array.isArray(points) || points.length < 2) return null

  const coordStr = points.map(p => `${p.lng},${p.lat}`).join(';')

  const url =
    `https://router.project-osrm.org/route/v1/driving/${coordStr}` +
    `?overview=full&geometries=geojson`

  const res = await fetch(url)
  if (!res.ok) throw new Error('OSRM error')

  const data = await res.json()
  if (!data.routes || !data.routes[0] || !data.routes[0].geometry) {
    throw new Error('OSRM no route')
  }

  const coords = data.routes[0].geometry.coordinates
  // OSRM: [lng, lat] -> Leaflet 需要 [lat, lng]
  return coords.map(([lng, lat]) => [lat, lng])
}

// 建出「這張單要給 OSRM 的 waypoints」
// 乘客端：若有司機位置就從司機開始；否則從上車點開始
// 司機端：只有「自己且已派單」的訂單才從司機開始
function buildWaypoints(order, mode, drivers, currentDriverId) {
  const pickup = order.pickupLocation
  const dropoff = order.dropoffLocation
  const stops = Array.isArray(order.stops) ? order.stops : []

  if (!pickup || !dropoff) return null

  const waypoints = []

  const driverId = order.driverId
  const assignedDriver =
    driverId != null ? drivers.find(d => d.id === driverId) : null

  const hasDriverPos =
    assignedDriver &&
    typeof assignedDriver.lat === 'number' &&
    typeof assignedDriver.lng === 'number'

  let shouldIncludeDriver = false
  if (mode === 'passenger' && hasDriverPos) {
    shouldIncludeDriver = true
  } else if (
    mode === 'driver' &&
    hasDriverPos &&
    currentDriverId != null &&
    driverId === currentDriverId
  ) {
    shouldIncludeDriver = true
  }

  if (shouldIncludeDriver) {
    waypoints.push({ lat: assignedDriver.lat, lng: assignedDriver.lng })
  }

  // 上車點
  waypoints.push({ lat: pickup.lat, lng: pickup.lng })

  // 中途停靠點
  stops.forEach(s => {
    if (s && typeof s.lat === 'number' && typeof s.lng === 'number') {
      waypoints.push({ lat: s.lat, lng: s.lng })
    }
  })

  // 終點
  waypoints.push({ lat: dropoff.lat, lng: dropoff.lng })

  return waypoints.length >= 2 ? waypoints : null
}

export default function MapView({
  lang,
  mode,               // 'passenger' | 'driver'
  drivers = [],
  orders = [],        // 已經在 View 端過濾好的訂單
  currentDriverId,
  onDriverLocationChange,
  simulateVehicles = true,
}) {
  const isDriverMode = mode === 'driver'

  // 目前這台司機車
  const myDriver = useMemo(
    () =>
      isDriverMode && currentDriverId != null
        ? drivers.find(d => d.id === currentDriverId)
        : null,
    [drivers, isDriverMode, currentDriverId]
  )

  // 哪些司機正在執行訂單（避免畫出靜態 marker，和動畫車重疊）
  const busyDriverIds = useMemo(
    () =>
      new Set(
        orders
          .filter(o => o.status === 'assigned' && o.driverId != null)
          .map(o => o.driverId)
      ),
    [orders]
  )

  // OSRM 路徑 & 車輛動畫 state
  const [routesByOrder, setRoutesByOrder] = useState({}) // { orderId: [[lat,lng], ...] }
  const [movingCars, setMovingCars] = useState({})       // { orderId: { index, position } }

  // 每當訂單 / 司機列表變化，就重新向 OSRM 取得路徑
  useEffect(() => {
    let cancelled = false

    async function loadRoutes() {
      const next = {}

      for (const o of orders) {
        const waypoints = buildWaypoints(o, mode, drivers, currentDriverId)
        if (!waypoints) continue

        try {
          const coords = await fetchOsrmRoute(waypoints)
          if (cancelled || !coords || coords.length < 2) continue
          next[o.id] = coords
        } catch (e) {
          console.warn('OSRM route error for order', o.id, e)
        }
      }

      if (!cancelled) {
        setRoutesByOrder(next)
      }
    }

    loadRoutes()
    return () => {
      cancelled = true
    }
  }, [orders, drivers, mode, currentDriverId])

  // 當有新的路徑出現時，如果這張單還沒有 car 狀態，就從路徑起點開始
  useEffect(() => {
    setMovingCars(prev => {
      const next = { ...prev }
      Object.entries(routesByOrder).forEach(([orderId, coords]) => {
        if (!coords || coords.length === 0) return
        if (!next[orderId]) {
          next[orderId] = {
            index: 0,
            position: { lat: coords[0][0], lng: coords[0][1] },
          }
        }
      })
      return next
    })
  }, [routesByOrder])

  // 動畫：每 300ms 沿著路徑往下一個點移動（simulateVehicles=false 則停止）
  useEffect(() => {
    if (!simulateVehicles) return

    const timer = setInterval(() => {
      setMovingCars(prev => {
        const next = { ...prev }

        for (const [orderId, car] of Object.entries(prev)) {
          const route = routesByOrder[orderId]
          if (!route || route.length === 0) continue

          const newIndex =
            car.index < route.length - 1 ? car.index + 1 : route.length - 1
          const [lat, lng] = route[newIndex]
          next[orderId] = {
            index: newIndex,
            position: { lat, lng },
          }
        }

        return next
      })
    }, 300)

    return () => clearInterval(timer)
  }, [routesByOrder, simulateVehicles])

  // 地圖中心：司機頁優先用司機位置，其次用第一筆訂單；乘客頁用第一筆訂單
  const mapCenter = useMemo(() => {
    if (
      isDriverMode &&
      myDriver &&
      typeof myDriver.lat === 'number' &&
      typeof myDriver.lng === 'number'
    ) {
      return [myDriver.lat, myDriver.lng]
    }

    const firstOrder = orders[0]
    const loc =
      firstOrder?.pickupLocation || firstOrder?.dropoffLocation || null
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      return [loc.lat, loc.lng]
    }

    return DEFAULT_CENTER
  }, [isDriverMode, myDriver, orders])

  // 司機標記（靜態車子）：只在司機模式畫，而且若司機正在跑單則以動畫車取代
  const driverMarkers = useMemo(() => {
    if (!isDriverMode) return null

    return drivers
      .filter(
        d =>
          typeof d.lat === 'number' &&
          typeof d.lng === 'number' &&
          !busyDriverIds.has(d.id)
      )
      .map(d => (
        <Marker
          key={`driver-${d.id}`}
          position={[d.lat, d.lng]}
          icon={taxiIcon}
        >
          <Popup>
            {t(lang, 'driverPrefix')}
            {d.name || d.id}
          </Popup>
        </Marker>
      ))
  }, [drivers, lang, isDriverMode, busyDriverIds])

  // 訂單標記 + 路線 + 動畫車
  const orderGraphics = useMemo(
    () =>
      orders.map(o => {
        const pickup = o.pickupLocation
        const dropoff = o.dropoffLocation
        const stops = Array.isArray(o.stops) ? o.stops : []

        const routeCoords = routesByOrder[o.id]

        const polyline =
          routeCoords && routeCoords.length >= 2 ? (
            <Polyline
              key={`poly-${o.id}`}
              positions={routeCoords}
              pathOptions={{ color: '#2196f3', weight: 3 }}
            />
          ) : null

        const car = movingCars[o.id]
        const shouldShowMovingCar =
          car &&
          (mode === 'passenger' ||
            (mode === 'driver' &&
              o.driverId != null &&
              o.driverId === currentDriverId &&
              o.status === 'assigned'))

        const carMarker = shouldShowMovingCar ? (
          <Marker
            key={`car-${o.id}`}
            position={[car.position.lat, car.position.lng]}
            icon={taxiIcon}
          >
            <Popup>Order #{o.id}</Popup>
          </Marker>
        ) : null

        return (
          <div key={`order-${o.id}`}>
            {/* 起點：乘客人像 */}
            {pickup && typeof pickup.lat === 'number' && (
              <Marker
                position={[pickup.lat, pickup.lng]}
                icon={passengerIcon}
              >
                <Popup>
                  {t(lang, 'pickupMarkerTitle')}：{o.pickup}
                </Popup>
              </Marker>
            )}

            {/* 終點：旗子 */}
            {dropoff && typeof dropoff.lat === 'number' && (
              <Marker
                position={[dropoff.lat, dropoff.lng]}
                icon={dropoffIcon}
              >
                <Popup>
                  {t(lang, 'dropoffMarkerTitle')}：{o.dropoff}
                </Popup>
              </Marker>
            )}

            {/* 中途停靠點：1 / 2 / 3 數字圈 */}
            {stops.map((s, idx) => {
              if (
                !s ||
                typeof s.lat !== 'number' ||
                typeof s.lng !== 'number'
              ) {
                return null
              }
              const icon = createStopIcon(idx + 1)
              return (
                <Marker
                  key={`stop-${o.id}-${idx}`}
                  position={[s.lat, s.lng]}
                  icon={icon}
                >
                  <Popup>
                    {t(lang, 'stopLabel')} #{idx + 1}
                    <br />
                    {s.label || s.text || ''}
                  </Popup>
                </Marker>
              )
            })}

            {polyline}
            {carMarker}
          </div>
        )
      }),
    [orders, routesByOrder, movingCars, lang, mode, currentDriverId]
  )

  return (
    <MapContainer
      center={mapCenter}
      zoom={13}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 司機端才啟用「點一下地圖設定位置」 */}
      {isDriverMode && currentDriverId && (
        <DriverClickHandler
          enabled
          driverId={currentDriverId}
          onLocationChange={onDriverLocationChange}
        />
      )}

      {driverMarkers}
      {orderGraphics}
    </MapContainer>
  )
}
