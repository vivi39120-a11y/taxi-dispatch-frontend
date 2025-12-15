import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet'
import { useMemo, useEffect, useRef, useState } from 'react'
import { taxiIcon, passengerIcon, dropoffIcon, createStopIcon } from '../mapIcons'
import { t } from '../i18n'

const DEFAULT_CENTER = [40.758, -73.9855] // Times Square
const STEP_MS = 120
const ORDER_START_PREFIX = 'orderStart:' // 每筆訂單固定的司機起點（只寫一次）

const ACTIVE_STATUS_SET = new Set([
  'assigned',
  'accepted',
  'en_route',
  'enroute',
  'picked_up',
  'in_progress',
  'on_trip',
  'ongoing',
])

function sameId(a, b) {
  const A = Number(a)
  const B = Number(b)
  return Number.isFinite(A) && Number.isFinite(B) && A === B
}

function isActiveStatus(status) {
  const s = String(status || '').toLowerCase()
  return ACTIVE_STATUS_SET.has(s)
}

// ✅ 用 order.id + createdAt 做唯一 key，避免 server 重啟後 id 重用污染 localStorage
function getOrderKey(order) {
  const id = Number(order?.id)
  if (!Number.isFinite(id)) return null
  const createdAt = order?.createdAt || order?.created_at || order?.updatedAt || order?.updated_at || ''
  return `${id}::${String(createdAt)}`
}

// ====== orderStart: 固定每張訂單的司機起點 ======
function readOrderStart(orderKey) {
  try {
    if (!orderKey) return null
    const raw = localStorage.getItem(`${ORDER_START_PREFIX}${orderKey}`)
    if (!raw) return null
    const obj = JSON.parse(raw)
    const lat = Number(obj?.lat)
    const lng = Number(obj?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  } catch {
    return null
  }
}

function writeOrderStartOnce(orderKey, latlng) {
  if (!orderKey || !latlng) return
  try {
    const k = `${ORDER_START_PREFIX}${orderKey}`
    if (localStorage.getItem(k)) return
    localStorage.setItem(k, JSON.stringify({ lat: latlng.lat, lng: latlng.lng }))
  } catch {}
}

function clearOrderStart(orderKey) {
  try {
    if (!orderKey) return
    localStorage.removeItem(`${ORDER_START_PREFIX}${orderKey}`)
  } catch {}
}

function readDriverLocFromLocal(driverId) {
  try {
    const raw = localStorage.getItem(`driverLoc:${driverId}`)
    if (!raw) return null
    const obj = JSON.parse(raw)
    const lat = Number(obj?.lat)
    const lng = Number(obj?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  } catch {
    return null
  }
}

// ====== Driver click to set location ======
function DriverClickHandler({ enabled, driverId, onLocationChange }) {
  useMapEvents({
    click(e) {
      if (!enabled || !driverId || !onLocationChange) return
      const { lat, lng } = e.latlng

      onLocationChange({ id: driverId, lat, lng })

      fetch(`/api/drivers/${driverId}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      }).catch(() => {})

      try {
        localStorage.setItem(`driverLoc:${driverId}`, JSON.stringify({ lat, lng }))
      } catch {}
    },
  })
  return null
}

async function fetchOsrmRoute(points, { signal } = {}) {
  if (!Array.isArray(points) || points.length < 2) return null
  const coordStr = points.map(p => `${p.lng},${p.lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('OSRM error')
  const data = await res.json()
  const coords = data?.routes?.[0]?.geometry?.coordinates
  if (!coords || coords.length < 2) throw new Error('OSRM no route')
  return coords.map(([lng, lat]) => [lat, lng])
}

function routeKey(points) {
  if (!Array.isArray(points)) return ''
  return points.map(p => `${Number(p.lat).toFixed(5)},${Number(p.lng).toFixed(5)}`).join('|')
}

// 找最接近 target 的 index
function nearestIndexToPoint(coords, target) {
  if (!Array.isArray(coords) || !coords.length || !target) return 0
  const tLat = Number(target.lat)
  const tLng = Number(target.lng)
  if (!Number.isFinite(tLat) || !Number.isFinite(tLng)) return 0

  let bestIdx = 0
  let bestD = Infinity
  for (let i = 0; i < coords.length; i++) {
    const [lat, lng] = coords[i]
    const dLat = lat - tLat
    const dLng = lng - tLng
    const d = dLat * dLat + dLng * dLng
    if (d < bestD) {
      bestD = d
      bestIdx = i
    }
  }
  return bestIdx
}

// ✅ 訂單 waypoints：司機起點用 orderStart 固定（且以 orderKey 隔離）
function buildCarWaypoints(order, mode, drivers, currentDriverId) {
  const pickup = order.pickupLocation
  const dropoff = order.dropoffLocation
  const stops = Array.isArray(order.stops) ? order.stops : []
  if (!pickup || !dropoff) return null

  const active = isActiveStatus(order.status)
  const driverId = order.driverId
  const orderKey = getOrderKey(order)

  const visibleToThisView =
    mode === 'passenger' ||
    (mode === 'driver' && driverId != null && currentDriverId != null && sameId(driverId, currentDriverId))

  const waypoints = []

  // 司機起點（只有 active 且本視角可見 且已指派司機才需要）
  if (active && visibleToThisView && driverId != null && orderKey) {
    let fixedStart = readOrderStart(orderKey)

    if (!fixedStart) {
      const d = drivers.find(x => sameId(x.id, driverId))
      const fromDrivers =
        d && typeof d.lat === 'number' && typeof d.lng === 'number' ? { lat: d.lat, lng: d.lng } : null

      const fromLocal = readDriverLocFromLocal(driverId)
      const start = fromDrivers || fromLocal

      if (start) {
        writeOrderStartOnce(orderKey, start)
        fixedStart = start
      }
    }

    if (fixedStart) waypoints.push(fixedStart)
  }

  waypoints.push({ lat: pickup.lat, lng: pickup.lng })

  stops.forEach(s => {
    if (s && typeof s.lat === 'number' && typeof s.lng === 'number') {
      waypoints.push({ lat: s.lat, lng: s.lng })
    }
  })

  waypoints.push({ lat: dropoff.lat, lng: dropoff.lng })

  return waypoints.length >= 2 ? waypoints : null
}

// ====== 模擬狀態：跨分頁同步（以 orderKey 隔離）=====
function simKey(orderKey) {
  return `sim:${orderKey}`
}

function readSim(orderKey) {
  try {
    if (!orderKey) return null
    const raw = localStorage.getItem(simKey(orderKey))
    if (!raw) return null
    const obj = JSON.parse(raw)
    if (!obj || typeof obj !== 'object') return null
    return obj
  } catch {
    return null
  }
}

function writeSim(orderKey, obj) {
  try {
    if (!orderKey) return
    localStorage.setItem(simKey(orderKey), JSON.stringify(obj))
  } catch {}
}

function ensureSim(orderKey) {
  const now = Date.now()
  const cur = readSim(orderKey)
  if (cur) return cur
  const init = { elapsedMs: 0, startedAt: now, running: true, stepMs: STEP_MS, completed: false }
  writeSim(orderKey, init)
  return init
}

function pauseSim(orderKey) {
  const now = Date.now()
  const cur = readSim(orderKey)
  if (!cur || cur.completed) return
  if (!cur.running) return
  const elapsed = Number(cur.elapsedMs) || 0
  const startedAt = Number(cur.startedAt) || now
  const next = { ...cur, elapsedMs: elapsed + Math.max(0, now - startedAt), running: false, startedAt: now }
  writeSim(orderKey, next)
}

function resumeSim(orderKey) {
  const now = Date.now()
  const cur = readSim(orderKey)
  if (!cur || cur.completed) return
  if (cur.running) return
  const next = { ...cur, running: true, startedAt: now }
  writeSim(orderKey, next)
}

function completeSim(orderKey) {
  const now = Date.now()
  const cur = readSim(orderKey) || {}
  const next = { ...cur, running: false, completed: true, startedAt: now }
  writeSim(orderKey, next)
}

function computeIndex(orderKey) {
  const now = Date.now()
  const cur = ensureSim(orderKey)
  const stepMs = Number(cur.stepMs) || STEP_MS
  const elapsed = Number(cur.elapsedMs) || 0
  const startedAt = Number(cur.startedAt) || now
  const total = elapsed + (cur.running ? Math.max(0, now - startedAt) : 0)
  const idx = Math.floor(total / stepMs)
  return { idx, sim: cur }
}

export default function MapView({
  lang,
  mode, // 'passenger' | 'driver'
  drivers = [],
  orders = [],
  currentDriverId,
  onDriverLocationChange,
  simulateVehicles = true,

  previewEnabled = false,
  previewWaypoints = null,
  previewMarkers = null,

  completedOrderIds, // optional (Set)
  onOrderArrived, // optional (orderId) => void
  onOrderCompleted, // optional (orderId) => void
}) {
  const isDriverMode = mode === 'driver'

  const myDriver = useMemo(
    () => (isDriverMode && currentDriverId != null ? drivers.find(d => sameId(d.id, currentDriverId)) : null),
    [drivers, isDriverMode, currentDriverId]
  )

  const osrmCacheRef = useRef(new Map())
  const osrmAbortRef = useRef(null)

  const [routesByOrder, setRoutesByOrder] = useState({})
  const [previewRoute, setPreviewRoute] = useState(null)

  const [tick, setTick] = useState(0)

  // ✅ 分開記：到上車點 once / 到終點 once
  const arrivedOnceRef = useRef(new Set())
  const completedOnceRef = useRef(new Set())

  // 取得「訂單路線」
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function loadRoutes() {
      const next = {}
      const orderIds = new Set(orders.map(o => o?.id).filter(id => id != null))

      const tasks = orders.map(async o => {
        const wps = buildCarWaypoints(o, mode, drivers, currentDriverId)
        if (!wps) return

        const key = `order:${o.id}:${routeKey(wps)}`
        if (osrmCacheRef.current.has(key)) {
          next[o.id] = osrmCacheRef.current.get(key)
          return
        }
        try {
          const coords = await fetchOsrmRoute(wps, { signal: controller.signal })
          if (!coords || coords.length < 2) return
          osrmCacheRef.current.set(key, coords)
          next[o.id] = coords
        } catch {}
      })

      await Promise.all(tasks)
      if (cancelled) return

      setRoutesByOrder(prev => {
        const merged = { ...prev, ...next }
        Object.keys(merged).forEach(k => {
          const idNum = Number(k)
          const id = Number.isFinite(idNum) ? idNum : k
          if (!orderIds.has(id)) delete merged[k]
        })
        return merged
      })
    }

    loadRoutes()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [orders, drivers, mode, currentDriverId])

  // simulateVehicles 切換：更新 sim 狀態（用 orderKey）
  useEffect(() => {
    const keys = orders.map(o => getOrderKey(o)).filter(Boolean)
    if (!keys.length) return
    if (simulateVehicles) keys.forEach(k => resumeSim(k))
    else keys.forEach(k => pauseSim(k))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulateVehicles, orders])

  // ticking：只有 simulateVehicles=true 才跑
  useEffect(() => {
    if (!simulateVehicles) return
    const timer = setInterval(() => setTick(t => t + 1), STEP_MS)
    return () => clearInterval(timer)
  }, [simulateVehicles])

  // 預覽路線
  useEffect(() => {
    if (!previewEnabled || !Array.isArray(previewWaypoints) || previewWaypoints.length < 2) {
      setPreviewRoute(null)
      return
    }

    if (osrmAbortRef.current) osrmAbortRef.current.abort()
    const controller = new AbortController()
    osrmAbortRef.current = controller

    const key = `preview:${routeKey(previewWaypoints)}`
    ;(async () => {
      try {
        if (osrmCacheRef.current.has(key)) {
          setPreviewRoute(osrmCacheRef.current.get(key))
          return
        }
        const coords = await fetchOsrmRoute(previewWaypoints, { signal: controller.signal })
        if (!coords || coords.length < 2) return
        osrmCacheRef.current.set(key, coords)
        setPreviewRoute(coords)
      } catch {}
    })()

    return () => controller.abort()
  }, [previewEnabled, previewWaypoints])

  const mapCenter = useMemo(() => {
    if (previewEnabled && previewMarkers?.pickup?.lat && previewMarkers?.pickup?.lng) {
      return [previewMarkers.pickup.lat, previewMarkers.pickup.lng]
    }

    if (isDriverMode && myDriver && typeof myDriver.lat === 'number' && typeof myDriver.lng === 'number') {
      return [myDriver.lat, myDriver.lng]
    }

    const firstOrder = orders[0]
    const loc = firstOrder?.pickupLocation || firstOrder?.dropoffLocation || null
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      return [loc.lat, loc.lng]
    }

    return DEFAULT_CENTER
  }, [previewEnabled, previewMarkers, isDriverMode, myDriver, orders])

  // 司機 marker：只有「沒有進行中路線」時才顯示
  const hasAnyActiveRouteForDriver = useMemo(() => {
    if (!isDriverMode) return false
    const o = orders?.[0]
    if (!o) return false
    const active = isActiveStatus(o.status)
    return active && o.driverId != null && currentDriverId != null && sameId(o.driverId, currentDriverId)
  }, [orders, isDriverMode, currentDriverId])

  const driverMarkers = useMemo(() => {
    if (!isDriverMode) return null
    if (hasAnyActiveRouteForDriver) return null
    return drivers
      .filter(d => typeof d.lat === 'number' && typeof d.lng === 'number')
      .map(d => (
        <Marker key={`driver-${d.id}`} position={[d.lat, d.lng]} icon={taxiIcon}>
          <Popup>
            {t(lang, 'driverPrefix')}
            {d.name || d.id}
          </Popup>
        </Marker>
      ))
  }, [drivers, lang, isDriverMode, hasAnyActiveRouteForDriver])

  // 訂單圖層（polyline + 車）
  const orderGraphics = useMemo(() => {
    return orders.map(o => {
      const pickup = o.pickupLocation
      const dropoff = o.dropoffLocation
      const stops = Array.isArray(o.stops) ? o.stops : []
      const routeCoords = routesByOrder[o.id]

      const active = isActiveStatus(o.status)

      const visibleToThisView =
        mode === 'passenger' ||
        (mode === 'driver' && o.driverId != null && currentDriverId != null && sameId(o.driverId, currentDriverId))

      let polyPositions = routeCoords

      // 乘客端：pending 才不畫「司機→上車點」
      if (
        mode === 'passenger' &&
        !isActiveStatus(o.status) &&
        routeCoords &&
        pickup &&
        typeof pickup.lat === 'number' &&
        typeof pickup.lng === 'number'
      ) {
        const idx = nearestIndexToPoint(routeCoords, pickup)
        polyPositions = routeCoords.slice(idx)
      }

      const polyline =
        polyPositions && polyPositions.length >= 2 ? (
          <Polyline key={`poly-${o.id}`} positions={polyPositions} pathOptions={{ weight: 3 }} />
        ) : null

      let carMarker = null

      // ✅ 車只在 active + 可視 + 有路線 + 已指派司機 才跑
      if (active && visibleToThisView && routeCoords && routeCoords.length >= 2 && o.driverId != null) {
        const orderKey = getOrderKey(o)
        if (orderKey) {
          ensureSim(orderKey)

          const { idx } = computeIndex(orderKey)
          const clamped = Math.min(idx, routeCoords.length - 1)
          const [lat, lng] = routeCoords[clamped]

          // ✅ 到上車點：只觸發一次（用 pickup 最近點 index）
          if (pickup && typeof pickup.lat === 'number' && typeof pickup.lng === 'number') {
            const pickupIdx = nearestIndexToPoint(routeCoords, pickup)
            if (clamped >= pickupIdx) {
              const arrivedAlready = arrivedOnceRef.current.has(orderKey)
              if (!arrivedAlready) {
                arrivedOnceRef.current.add(orderKey)
                onOrderArrived?.(o.id)
              }
            }
          }

          // ✅ 到終點：才 completed（只觸發一次）
          if (clamped >= routeCoords.length - 1) {
            const doneBySet = Boolean(completedOrderIds?.has?.(o.id))
            const doneOnce = completedOnceRef.current.has(orderKey)

            if (!doneBySet && !doneOnce) {
              completedOnceRef.current.add(orderKey)
              completeSim(orderKey)

              // 清掉固定起點（避免污染）
              clearOrderStart(orderKey)

              onOrderCompleted?.(o.id)
            }
          }

          carMarker = (
            <Marker key={`car-${o.id}`} position={[lat, lng]} icon={taxiIcon}>
              <Popup>Order #{o.id}</Popup>
            </Marker>
          )
        }
      }

      return (
        <div key={`order-layer-${o.id}`}>
          {pickup && typeof pickup.lat === 'number' && (
            <Marker position={[pickup.lat, pickup.lng]} icon={passengerIcon}>
              <Popup>
                {t(lang, 'pickupMarkerTitle')}：{o.pickup}
              </Popup>
            </Marker>
          )}

          {dropoff && typeof dropoff.lat === 'number' && (
            <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
              <Popup>
                {t(lang, 'dropoffMarkerTitle')}：{o.dropoff}
              </Popup>
            </Marker>
          )}

          {stops.map((s, idx2) => {
            if (!s || typeof s.lat !== 'number' || typeof s.lng !== 'number') return null
            return (
              <Marker key={`stop-${o.id}-${idx2}`} position={[s.lat, s.lng]} icon={createStopIcon(idx2 + 1)}>
                <Popup>
                  {t(lang, 'stopLabel')} #{idx2 + 1}
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
    })
    // tick 觸發車位置更新
  }, [orders, routesByOrder, lang, mode, currentDriverId, completedOrderIds, onOrderArrived, onOrderCompleted, tick])

  const previewGraphics = useMemo(() => {
    if (!previewEnabled) return null

    const pickup = previewMarkers?.pickup
    const dropoff = previewMarkers?.dropoff
    const stops = Array.isArray(previewMarkers?.stops) ? previewMarkers.stops : []

    return (
      <>
        {pickup && typeof pickup.lat === 'number' && (
          <Marker position={[pickup.lat, pickup.lng]} icon={passengerIcon}>
            <Popup>{t(lang, 'pickupMarkerTitle')}</Popup>
          </Marker>
        )}

        {stops.map((s, idx) => {
          if (!s || typeof s.lat !== 'number' || typeof s.lng !== 'number') return null
          return (
            <Marker key={`preview-stop-${idx}`} position={[s.lat, s.lng]} icon={createStopIcon(idx + 1)}>
              <Popup>
                {t(lang, 'stopLabel')} #{idx + 1}
                <br />
                {s.label || ''}
              </Popup>
            </Marker>
          )
        })}

        {dropoff && typeof dropoff.lat === 'number' && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
            <Popup>{t(lang, 'dropoffMarkerTitle')}</Popup>
          </Marker>
        )}

        {previewRoute && previewRoute.length >= 2 && (
          <Polyline key="preview-poly" positions={previewRoute} pathOptions={{ weight: 3 }} />
        )}
      </>
    )
  }, [previewEnabled, previewMarkers, previewRoute, lang])

  return (
    <MapContainer center={mapCenter} zoom={13} style={{ width: '100%', height: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {isDriverMode && currentDriverId && (
        <DriverClickHandler enabled driverId={currentDriverId} onLocationChange={onDriverLocationChange} />
      )}

      {driverMarkers}

      {orders.length > 0 ? orderGraphics : previewGraphics}
    </MapContainer>
  )
}
