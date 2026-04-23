//driver
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import MapView from '../components/MapView.jsx'
import OrderList from '../components/OrderList.jsx'
import { t } from '../i18n'
import { apiFetch } from '../apiBase.js'
const HOTSPOT_MOVE_TASK_KEY = 'hotspotMoveTaskV1'
const HOTSPOT_MOVE_EVT = 'hotspotMoveTaskChanged'
const ORDER_RECOMMEND_MIN_GAIN = 0.2
const ORDER_W_EARNING = 1.2
const ORDER_W_DEMAND = 2.0
const ORDER_W_PRIORITY = 0.9
const ORDER_W_DISTANCE = 0.9
const ORDER_W_ZONE_SUPPLY = 0.45
const ORDER_W_LOCAL_SUPPLY = 0.20
const ORDER_LOCAL_RADIUS_KM = 2.0
const ORDER_DISTANCE_CIRCUITY_FACTOR = 1.3

function readHotspotMoveTask() {
  try {
    const raw = localStorage.getItem(HOTSPOT_MOVE_TASK_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// --- 工具函數 ---
function normalizeVehicleType(value) {
  if (value == null) return null
  const s = String(value).trim().toUpperCase()
  if (!s) return null
  if (s === 'YELLOW' || s.includes('YELLOW')) return 'YELLOW'
  if (s === 'GREEN' || s.includes('GREEN')) return 'GREEN'
  if (s === 'FHV' || s.includes('FHV')) return 'FHV'
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

function getAnyDriverId(o) {
  return o?.driverId ?? o?.assignedDriverId ?? o?.driver_id ?? null
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
  const p = o?.dropoffLocation
  if (p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))) {
    return { lat: Number(p.lat), lng: Number(p.lng) }
  }
  const lat = Number(o?.dropoffLat)
  const lng = Number(o?.dropoffLng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  return null
}

function getOrderPrice(o) {
  const candidates = [
    o?.price,
    o?.estimatedFare,
    o?.estimated_fare,
    o?.fare,
    o?.estimatedPrice,
    o?.estimated_price,
    o?.amount,
    o?.totalFare,
    o?.total_fare,
  ]

  for (const v of candidates) {
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) return n
  }
  return null
}

function makeOrderKey(o) {
  const id = Number(o?.id)
  if (!Number.isFinite(id)) return null
  const createdAt = o?.createdAt || o?.created_at || o?.updatedAt || o?.updated_at || ''
  return `${id}::${String(createdAt)}`
}

async function osrmDistanceKm(from, to) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
  const res = await fetch(url)
  if (!res.ok) throw new Error('OSRM error')
  const data = await res.json()
  if (!data.routes || !data.routes.length) throw new Error('OSRM no route')
  return data.routes[0].distance / 1000
}

function round6(x) {
  const n = Number(x)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 1e6) / 1e6
}

function haversineKm(a, b) {
  if (!a || !b) return Infinity
  const lat1 = Number(a.lat)
  const lng1 = Number(a.lng)
  const lat2 = Number(b.lat)
  const lng2 = Number(b.lng)
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity

  const R = 6371
  const toRad = d => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)))
}

function getOrderIntermediateStops(o) {
  const stops = Array.isArray(o?.stops) ? o.stops : []
  return stops
    .map(s => ({
      lat: Number(s?.lat),
      lng: Number(s?.lng ?? s?.lon),
      type: String(s?.type || '').toLowerCase(),
    }))
    .filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lng))
    .filter(s => s.type !== 'driver' && s.type !== 'pickup')
}

function buildOrderRoutePoints(driverLoc, o) {
  const pickup = getPickupLoc(o)
  const dropoff = getDropoffLoc(o)
  if (!driverLoc || !pickup || !dropoff) return []

  const stops = getOrderIntermediateStops(o)
  return [
    { lat: Number(driverLoc.lat), lng: Number(driverLoc.lng) },
    { lat: Number(pickup.lat), lng: Number(pickup.lng) },
    ...stops.map(s => ({ lat: s.lat, lng: s.lng })),
    { lat: Number(dropoff.lat), lng: Number(dropoff.lng) },
  ]
}

function routeDistanceKm(points) {
  if (!Array.isArray(points) || points.length < 2) return null

  let total = 0
  for (let i = 1; i < points.length; i++) {
    const seg = haversineKm(points[i - 1], points[i])
    if (!Number.isFinite(seg)) return null
    total += seg
  }

  return total * ORDER_DISTANCE_CIRCUITY_FACTOR
}


function minmax01FromValues(value, values) {
  const nums = (values || []).map(Number).filter(Number.isFinite)
  const v = Number(value)
  if (!Number.isFinite(v) || !nums.length) return 0
  const mn = Math.min(...nums)
  const mx = Math.max(...nums)
  if (mx - mn < 1e-12) return 0
  return (v - mn) / (mx - mn)
}

function findNearestHotspotForPoint(point, hotspots) {
  if (!point || !Array.isArray(hotspots) || !hotspots.length) return null

  let best = null
  let bestD = Infinity

  for (const h of hotspots) {
    const hp = {
      lat: Number(h?.lat),
      lng: Number(h?.lon ?? h?.lng),
    }
    const d = haversineKm(point, hp)
    if (d < bestD) {
      bestD = d
      best = h
    }
  }

  return best
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let idx = 0

  async function worker() {
    while (idx < items.length) {
      const cur = idx++
      results[cur] = await fn(items[cur], cur)
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, () => worker())
  await Promise.all(workers)
  return results
}

// ✅ 每位司機獨立的定位鎖
function driverLocLockKey(driverId) {
  return `driverLocConfirmed:${driverId ?? 'na'}`
}
function readLocConfirmed(driverId) {
  try {
    if (driverId == null) return false
    return localStorage.getItem(driverLocLockKey(driverId)) === '1'
  } catch {
    return false
  }
}
function writeLocConfirmed(driverId, val) {
  try {
    if (driverId == null) return
    localStorage.setItem(driverLocLockKey(driverId), val ? '1' : '0')
  } catch {}
}

function readPersistedDriverLoc(driverId) {
  try {
    if (driverId == null) return null
    const raw = localStorage.getItem(`driverLoc:${driverId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const lat = Number(parsed?.lat)
    const lng = Number(parsed?.lng)
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
    return null
  } catch {
    return null
  }
}

const DRIVER_LOC_TS_PREFIX = 'driverLocTs:'
const DRIVER_LAST_LOGIN_DRIVER_KEY = 'driverLastLoginDriverId'
const DRIVER_LOC_TTL_MS = 60 * 60 * 1000 // 1小時；你要 12 小時就改成 12 * 60 * 60 * 1000

function driverLocTsKey(driverId) {
  return `${DRIVER_LOC_TS_PREFIX}${driverId ?? 'na'}`
}

function readLocTimestamp(driverId) {
  try {
    if (driverId == null) return null
    const raw = localStorage.getItem(driverLocTsKey(driverId))
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function writeLocTimestamp(driverId, ts = Date.now()) {
  try {
    if (driverId == null) return
    localStorage.setItem(driverLocTsKey(driverId), String(ts))
  } catch {}
}

function clearDriverLocationState(driverId) {
  try {
    if (driverId == null) return
    localStorage.removeItem(`driverLoc:${driverId}`)
    localStorage.removeItem(driverLocLockKey(driverId))
    localStorage.removeItem(driverLocTsKey(driverId))
  } catch {}
}


export default function DriverView({
  lang,
  drivers = [],
  orders,
  ordersWithLocations,
  loading,
  error,
  currentDriverId,
  setCurrentDriverId,
  acceptOrder,
  refresh,
  currentUser,
  onDriverLocationChange,
  simulateVehicles,
  onOpenAuth,
  onOrderCompleted,
  onCarPosChange,
  hotspots = [],
  showHotspots = true,
}) {
  const goAuth = () => {
    if (onOpenAuth) {
      onOpenAuth('driver', 'driver')
      return
    }
    window.location.href = `${window.location.pathname}?auth=1&role=driver`
  }

  const isLoggedIn = Boolean(currentUser?.username)

  const allOrdersFromProps = useMemo(() => {
    return Array.isArray(ordersWithLocations) && ordersWithLocations.length
      ? ordersWithLocations
      : orders || []
  }, [ordersWithLocations, orders])

  const myDriver = useMemo(() => {
    if (currentDriverId != null) {
      const byId = drivers.find(d => sameId(d?.id, currentDriverId))
      if (byId) return byId
    }
    const u = currentUser?.username
    if (u) {
      const byName = drivers.find(
        d => String(d?.name || d?.username || '').trim() === String(u).trim()
      )
      if (byName) return byName
    }
    return null
  }, [drivers, currentDriverId, currentUser])

  const effectiveDriverId = isLoggedIn
    ? (myDriver?.id ?? null)
    : (currentDriverId ?? null)

  const driverReady = !isLoggedIn || (myDriver && effectiveDriverId != null)

  useEffect(() => {
    if (!setCurrentDriverId || myDriver?.id == null) return
    if (currentDriverId == null || !sameId(currentDriverId, myDriver.id)) {
      setCurrentDriverId(myDriver.id)
    }
  }, [myDriver, currentDriverId, setCurrentDriverId])

  const myCarType = normalizeVehicleType(myDriver?.carType ?? currentUser?.carType ?? null)

  const [locConfirmed, setLocConfirmed] = useState(false)

  useEffect(() => {
  if (!isLoggedIn || effectiveDriverId == null) {
    setLocConfirmed(false)
    return
  }

  const now = Date.now()
  const lastLoginDriverId = localStorage.getItem(DRIVER_LAST_LOGIN_DRIVER_KEY)
  const currentDriverIdStr = String(effectiveDriverId)

  const isDifferentDriver =
    lastLoginDriverId != null && lastLoginDriverId !== currentDriverIdStr

  const ts = readLocTimestamp(effectiveDriverId)
  const isExpired = !ts || (now - ts > DRIVER_LOC_TTL_MS)

  if (isDifferentDriver) {
    clearDriverLocationState(effectiveDriverId)
    setLocConfirmed(false)
  } else if (isExpired) {
    clearDriverLocationState(effectiveDriverId)
    setLocConfirmed(false)
  } else {
    setLocConfirmed(readLocConfirmed(effectiveDriverId))
  }

  localStorage.setItem(DRIVER_LAST_LOGIN_DRIVER_KEY, currentDriverIdStr)
}, [effectiveDriverId, isLoggedIn])

  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [orderDistances, setOrderDistances] = useState({})
  const [completedNotice, setCompletedNotice] = useState('')
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [hotspotMoveTask, setHotspotMoveTask] = useState(() => readHotspotMoveTask())
  const [liveDriverLoc, setLiveDriverLoc] = useState(null)
  const completedSeenRef = useRef(new Set())

  useEffect(() => {
    const syncTask = (e) => {
      const nextTask = e?.detail?.task ?? readHotspotMoveTask()
      setHotspotMoveTask(nextTask)
    }

    window.addEventListener(HOTSPOT_MOVE_EVT, syncTask)
    return () => window.removeEventListener(HOTSPOT_MOVE_EVT, syncTask)
  }, [])

    useEffect(() => {
    setSelectedOrderId(null)
    setLiveDriverLoc(null)
  }, [effectiveDriverId, isLoggedIn])

  // ✅ 修正：
  // 第一次點地圖定位才需要上鎖
  // 之後完成訂單 / 行程同步更新位置，不能被 locConfirmed 擋掉
    const handleDriverLocationChange = useCallback(
    p => {
      if (!driverReady) return
      if (!p || effectiveDriverId == null) return
      if (!sameId(p.id, effectiveDriverId)) return

      const lat = Number(p.lat)
      const lng = Number(p.lng)
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setLiveDriverLoc({ lat, lng })
      }

      if (!locConfirmed) {
        setLocConfirmed(true)
        writeLocConfirmed(effectiveDriverId, true)
      }

      writeLocTimestamp(effectiveDriverId, Date.now())
      onDriverLocationChange?.(p)
    },
    [onDriverLocationChange, effectiveDriverId, locConfirmed, driverReady]
  )

  // ✅ 新增：重設定位（不影響原流程，純 debug / UX）
  const resetMyLocation = useCallback(() => {
  if (effectiveDriverId == null) return
  clearDriverLocationState(effectiveDriverId)
  setLocConfirmed(false)
}, [effectiveDriverId])



  // ✅ 修正：
  // 每次顯示司機位置優先吃 localStorage 的最新 driverLoc
  // 這樣完成訂單後的新終點就會直接成為下一次起點
  const myDriverLoc = useMemo(() => {
    if (!locConfirmed || effectiveDriverId == null) return null

    if (
      liveDriverLoc &&
      Number.isFinite(Number(liveDriverLoc.lat)) &&
      Number.isFinite(Number(liveDriverLoc.lng))
    ) {
      return {
        lat: Number(liveDriverLoc.lat),
        lng: Number(liveDriverLoc.lng),
      }
    }

    const persisted = readPersistedDriverLoc(effectiveDriverId)
    if (persisted) return persisted

    if (!myDriver) return null

    const lat = Number(myDriver.lat)
    const lng = Number(myDriver.lng)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng }
    }

    return null
  }, [myDriver, locConfirmed, effectiveDriverId, liveDriverLoc])

  const visibleDrivers = useMemo(() => {
    if (!driverReady || !locConfirmed || !myDriverLoc) return []
    return [{
      ...myDriver,
      id: effectiveDriverId,
      lat: myDriverLoc.lat,
      lng: myDriverLoc.lng,
    }]
  }, [driverReady, locConfirmed, myDriver, myDriverLoc, effectiveDriverId])

  const myActiveOrder = useMemo(() => {
    if (!driverReady || effectiveDriverId == null) return null

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

    const candidates = allOrdersFromProps
      .filter(o => o && sameId(getAnyDriverId(o), effectiveDriverId))
      .filter(o => ACTIVE.has(normStatus(o.status)))

    if (!candidates.length) return null

    candidates.sort(
      (a, b) =>
        (b.updatedAt ? Date.parse(b.updatedAt) : 0) -
        (a.updatedAt ? Date.parse(a.updatedAt) : 0)
    )
    return candidates[0]
  }, [allOrdersFromProps, effectiveDriverId, driverReady])

    const myHotspotMove = useMemo(() => {
    if (!driverReady || effectiveDriverId == null) return null
    if (!hotspotMoveTask) return null
    if (!sameId(hotspotMoveTask.driverId, effectiveDriverId)) return null
    if (hotspotMoveTask.status !== 'moving') return null
    if (!Array.isArray(hotspotMoveTask.coords) || hotspotMoveTask.coords.length < 2) return null
    if (!hotspotMoveTask.start || !hotspotMoveTask.end) return null

    return {
      id: Number(hotspotMoveTask.taskId),
      createdAt: hotspotMoveTask.createdAt || new Date().toISOString(),
      updatedAt: hotspotMoveTask.createdAt || new Date().toISOString(),
      status: 'en_route',
      driverId: effectiveDriverId,
      pickupLocation: {
        lat: Number(hotspotMoveTask.start.lat),
        lng: Number(hotspotMoveTask.start.lng),
      },
      dropoffLocation: {
        lat: Number(hotspotMoveTask.end.lat),
        lng: Number(hotspotMoveTask.end.lng),
      },
      stops: [],
      _isHotspotMove: true,
      _hotspotTaskId: Number(hotspotMoveTask.taskId),
      _prebuiltRoute: hotspotMoveTask.coords.map(p => [Number(p[0]), Number(p[1])]),
      _hidePickupMarker: true,
      _hideDropoffMarker: true,
      _forceUpdate: `hotspot:${hotspotMoveTask.taskId}`,
    }
  }, [hotspotMoveTask, driverReady, effectiveDriverId])

      const isDriverMoving = useMemo(() => {
    return Boolean(myActiveOrder || myHotspotMove)
  }, [myActiveOrder, myHotspotMove])
  
  const handleCarPosChange = useCallback(
    p => {
      if (
        isDriverMoving &&
        p &&
        effectiveDriverId != null &&
        sameId(p.id, effectiveDriverId)
      ) {
        const lat = Number(p.lat)
        const lng = Number(p.lng)

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setLiveDriverLoc({ lat, lng })
          writeLocTimestamp(effectiveDriverId, Date.now())
        }
      }

      onCarPosChange?.(p)
    },
    [effectiveDriverId, onCarPosChange, isDriverMoving]
  )


    useEffect(() => {
    if (myActiveOrder?.id != null) {
      setSelectedOrderId(myActiveOrder.id)
    } else {
      setSelectedOrderId(null)
    }
  }, [myActiveOrder])

  const pendingHash = useMemo(() => {
    const pending = allOrdersFromProps
      .filter(o => isPendingStatus(o?.status))
      .filter(o => getAnyDriverId(o) == null)
      .map(o => {
        const pickup = getPickupLoc(o)
        const dropoff = getDropoffLoc(o)
        const stops = getOrderIntermediateStops(o)
          .map(s => `${round6(s.lat)}:${round6(s.lng)}`)
          .join(',')

        return [
          o.id,
          round6(pickup?.lat),
          round6(pickup?.lng),
          round6(dropoff?.lat),
          round6(dropoff?.lng),
          stops,
        ].join(':')
      })
      .join('|')

    return `${round6(myDriverLoc?.lat)}:${round6(myDriverLoc?.lng)}::${pending}`
  }, [allOrdersFromProps, myDriverLoc])

  useEffect(() => {
    if (!myDriverLoc) return

    if (isDriverMoving) {
      setOrderDistances({})
      return
    }

    const pending = allOrdersFromProps.filter(
      o => isPendingStatus(o?.status) && getAnyDriverId(o) == null
    )

    if (!pending.length) {
      setOrderDistances({})
      return
    }

    const distMap = {}

    pending.forEach(o => {
      const points = buildOrderRoutePoints(myDriverLoc, o)
      const totalKm = routeDistanceKm(points)
      if (!Number.isFinite(Number(totalKm))) return
      distMap[o.id] = Number(totalKm)
    })

    setOrderDistances(distMap)
  }, [pendingHash, allOrdersFromProps, myDriverLoc, isDriverMoving])

  const pendingOrders = useMemo(() => {
    const base = allOrdersFromProps
      .filter(o => isPendingStatus(o?.status) && getAnyDriverId(o) == null)
      .filter(o => !myCarType || normalizeVehicleType(o?.vehicleType) === myCarType)
      .map(o => {
        const pickupLocation = getPickupLoc(o)
        const dropoffLocation = getDropoffLoc(o)

        const totalDistanceKmFromMap = Number(orderDistances[o.id])
        const fallbackPoints =
          myDriverLoc ? buildOrderRoutePoints(myDriverLoc, o) : []
        const fallbackDistanceKm = routeDistanceKm(fallbackPoints)

        const driverDistanceKm =
          Number.isFinite(totalDistanceKmFromMap) && totalDistanceKmFromMap > 0
            ? totalDistanceKmFromMap
            : Number.isFinite(Number(fallbackDistanceKm))
            ? Number(fallbackDistanceKm)
            : null

        const price = getOrderPrice(o)

        const nearestHotspot = dropoffLocation
          ? findNearestHotspotForPoint(dropoffLocation, hotspots)
          : null

        const hotspotDemand = Number(nearestHotspot?.pred_rides ?? 0)
        const hotspotPriority = Number(nearestHotspot?.priority ?? 0)

        return {
          ...o,
          pickupLocation,
          dropoffLocation,
          distanceKm: driverDistanceKm,
          dispatchScore:
            Number.isFinite(driverDistanceKm)
              ? Math.max(1, Math.min(10, Math.round(11 - driverDistanceKm)))
              : null,
          driverDistanceKm,
          price,
          _recommendDemandRaw: hotspotDemand,
          _recommendPriorityRaw: hotspotPriority,
          _recommendDropoffHotspot: nearestHotspot || null,
        }
      })

    if (isDriverMoving) {
      return base.map(o => ({
        ...o,
        dispatchScore: null,
        driverDistanceKm: null,
        distanceKm: null,
        recommendScore: '移動中',
        recommendGain: null,
        recommendAccept: null,
        recommendLabel: '',
        recommendEarningRaw: null,
        recommendEarningN: null,
        recommendDemandN: null,
        recommendPriorityN: null,
        recommendDistanceN: null,
        recommendZoneSupply: null,
        recommendLocalSupply: null,
      }))
    }

    const demandValues = base.map(o => Number(o._recommendDemandRaw ?? 0))
    const priorityValues = base.map(o => Number(o._recommendPriorityRaw ?? 0))
    const distanceValues = base
      .map(o => Number(o.driverDistanceKm ?? Infinity))
      .filter(Number.isFinite)

    const earningValues = base.map(o => {
      const price = Number(o.price ?? 0)
      const dkm = Math.max(Number(o.driverDistanceKm ?? 0), 0.3)
      return Number.isFinite(price) && price > 0 ? price / dkm : 0
    })

    const zoneSupplyValues = base.map(o => {
      const dropoff = o.dropoffLocation
      if (!dropoff) return 0
      return base.filter(other => {
        if (other.id === o.id) return false
        if (!other.dropoffLocation) return false
        return haversineKm(dropoff, other.dropoffLocation) <= ORDER_LOCAL_RADIUS_KM
      }).length
    })

    return base.map((o, idx) => {
      const price = Number(o.price ?? 0)
      const dkm = Math.max(Number(o.driverDistanceKm ?? 0), 0.3)
      const earningRaw = Number.isFinite(price) && price > 0 ? price / dkm : 0

      const earningN = minmax01FromValues(earningRaw, earningValues)
      const demandN = minmax01FromValues(o._recommendDemandRaw ?? 0, demandValues)
      const priorityN = minmax01FromValues(o._recommendPriorityRaw ?? 0, priorityValues)
      const distanceN = minmax01FromValues(o.driverDistanceKm ?? 0, distanceValues)

      const zoneSupply = zoneSupplyValues[idx] ?? 0
      const localSupply = zoneSupply
      const zoneSupplyN = minmax01FromValues(zoneSupply, zoneSupplyValues)
      const localSupplyN = minmax01FromValues(localSupply, zoneSupplyValues)

      const recommendScore =
        ORDER_W_EARNING * earningN +
        ORDER_W_DEMAND * demandN +
        ORDER_W_PRIORITY * priorityN -
        ORDER_W_DISTANCE * distanceN -
        ORDER_W_ZONE_SUPPLY * zoneSupplyN -
        ORDER_W_LOCAL_SUPPLY * localSupplyN

      const recommendGain = recommendScore
      const recommendAccept = recommendGain > ORDER_RECOMMEND_MIN_GAIN

      return {
        ...o,
        recommendScore,
        recommendGain,
        recommendAccept,
        recommendLabel: recommendAccept ? '是' : '否',

        recommendEarningRaw: earningRaw,
        recommendEarningN: earningN,

        recommendDemandRaw: o._recommendDemandRaw ?? 0,
        recommendDemandN: demandN,

        recommendPriorityRaw: o._recommendPriorityRaw ?? 0,
        recommendPriorityN: priorityN,

        recommendDistanceRaw: o.driverDistanceKm ?? null,
        recommendDistanceN: distanceN,

        recommendZoneSupply: zoneSupply,
        recommendZoneSupplyN: zoneSupplyN,

        recommendLocalSupply: localSupply,
        recommendLocalSupplyN: localSupplyN,
      }
    })
  }, [allOrdersFromProps, myCarType, orderDistances, hotspots, myDriverLoc, isDriverMoving])

  const displayOrders = useMemo(() => {
    if (myActiveOrder) {
      return [myActiveOrder, ...pendingOrders.filter(o => o.id !== myActiveOrder.id)]
    }
    return pendingOrders
  }, [myActiveOrder, pendingOrders])

  const mapOrders = useMemo(() => {
    if (!driverReady || !locConfirmed || !myDriverLoc) return []

    let baseOrder = null
    if (myActiveOrder) {
      baseOrder = myActiveOrder
    } else if (myHotspotMove) {
      baseOrder = myHotspotMove
    } else if (selectedOrderId) {
      baseOrder = pendingOrders.find(o => o.id === selectedOrderId) || null
    } else {
      baseOrder =
        [...pendingOrders].sort(
          (a, b) => (a.driverDistanceKm || Infinity) - (b.driverDistanceKm || Infinity)
        )[0] || null
    }

    if (!baseOrder) return []

    const pickup = getPickupLoc(baseOrder)
    if (!pickup && !baseOrder?._isHotspotMove) return []

    const dropoff = getDropoffLoc(baseOrder)
    const { polyline, route, directions, path, ...cleanOrder } = baseOrder

    if (baseOrder?._isHotspotMove) {
      return [baseOrder]
    }

    const linearStops = [
      {
        lat: round6(myDriverLoc.lat),
        lng: round6(myDriverLoc.lng),
        text: '我的位置',
        type: 'driver',
      },
      {
        lat: round6(pickup.lat),
        lng: round6(pickup.lng),
        text: '乘客上車',
        type: 'pickup',
      },
    ]

    const originalStops = (cleanOrder.stops || []).filter(s => {
      if (!s) return false
      const type = String(s.type || '').toLowerCase()
      if (type === 'driver' || type === 'pickup') return false

      const lat = Number(s.lat)
      const lng = Number(s.lng ?? s.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false

      const isAtPickup =
        Math.abs(lat - pickup.lat) < 0.0001 &&
        Math.abs(lng - pickup.lng) < 0.0001

      const isAtDropoff =
        dropoff &&
        Math.abs(lat - dropoff.lat) < 0.0001 &&
        Math.abs(lng - dropoff.lng) < 0.0001

      return !isAtPickup && !isAtDropoff
    })

    const stopSig = originalStops
      .map(s => `${round6(Number(s.lat))},${round6(Number(s.lng ?? s.lon))}`)
      .join('|')

    const routeSig =
      `${effectiveDriverId}:${baseOrder.id}:` +
      `${round6(myDriverLoc.lat)},${round6(myDriverLoc.lng)}->` +
      `${round6(pickup.lat)},${round6(pickup.lng)}->` +
      `${stopSig}->` +
      `${round6(dropoff?.lat)},${round6(dropoff?.lng)}`

    return [
      {
        ...cleanOrder,
        driverId: effectiveDriverId,
        stops: [...linearStops, ...originalStops],
        _forceUpdate: routeSig,
      },
    ]
  }, [locConfirmed, myDriverLoc, myActiveOrder, selectedOrderId, pendingOrders, effectiveDriverId, driverReady])

const shouldFollowCar = useMemo(() => {
  if (!locConfirmed || !myDriverLoc) return false
  return Boolean(myActiveOrder || myHotspotMove)
}, [locConfirmed, myDriverLoc, myActiveOrder, myHotspotMove])

  const myCompletedOrders = useMemo(() => {
    if (effectiveDriverId == null) return []
    const done = allOrdersFromProps
      .filter(o => o && sameId(getAnyDriverId(o), effectiveDriverId))
      .filter(o => normStatus(o.status) === 'completed')

    done.sort(
      (a, b) =>
        (b.completedAt ? Date.parse(b.completedAt) : 0) -
        (a.completedAt ? Date.parse(a.completedAt) : 0)
    )
    return done
  }, [allOrdersFromProps, effectiveDriverId])

  const handleAcceptAndSync = useCallback(async (orderId) => {
  setSelectedOrderId(orderId)
  await acceptOrder(orderId)
  await refresh?.()
}, [acceptOrder, refresh])

  useEffect(() => {
    if (!myCompletedOrders.length) return

    let newlyCompleted = null
    for (const o of myCompletedOrders) {
      const key = makeOrderKey(o) || `id:${o?.id ?? ''}`
      if (!completedSeenRef.current.has(key)) {
        newlyCompleted = o
        completedSeenRef.current.add(key)
        break
      }
    }

    if (!newlyCompleted) return

    const price = newlyCompleted.estimatedFare || newlyCompleted.price || null
    setCompletedNotice(
      `${t(lang, 'driverCompletedNoticePrefix')}（#${newlyCompleted.id}），${t(lang, 'driverCompletedNoticePriceLabel')}${price != null ? `$${price.toFixed(2)}` : t(lang, 'unknownValue')}`
    )
    setTimeout(() => setCompletedNotice(''), 7000)
  }, [myCompletedOrders])

  return (
    <section className="map-section">
      <div className="map-wrapper">
        <MapView
key={`driver-map:${driverReady ? effectiveDriverId : 'pending'}`}          lang={lang}
          drivers={driverReady ? visibleDrivers : []}
          orders={driverReady ? mapOrders : []}
          mode="driver"
          currentDriverId={driverReady ? effectiveDriverId : null}
          onDriverLocationChange={handleDriverLocationChange}
          driverClickEnabled={driverReady && !locConfirmed}
          simulateVehicles={simulateVehicles}
          onOrderCompleted={onOrderCompleted}
          onCarPosChange={handleCarPosChange}
          usePersistedDriverLoc={false}
          followActiveCar={shouldFollowCar}
          previewEnabled={false}
          rotateMapWithHeading={true}
          hotspots={showHotspots ? hotspots : []}
        />
      </div>

      <aside className={`side-panel ${panelCollapsed ? 'collapsed' : ''}`}>
       
        <button
        type="button"
        className="panel-toggle-btn"
        onClick={() => setPanelCollapsed(v => !v)}
        aria-label={panelCollapsed ? t(lang, 'panelExpand') : t(lang, 'panelCollapse')}
        title={panelCollapsed ? t(lang, 'panelExpand') : t(lang, 'panelCollapse')}
      >
        {panelCollapsed
          ? `⌃ ${t(lang, 'panelExpand')}`
          : `⌄ ${t(lang, 'panelCollapse')}`}
      </button>

        <div className={`panel-inner ${panelCollapsed ? 'hidden' : ''}`}>
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
            >
              {t(lang, 'pleaseLoginFirst')}
            </button>
          )}

          {completedNotice && <div className="ub-toast ub-toast--success">{completedNotice}</div>}

          {isLoggedIn && !locConfirmed && (
            <div className="ub-toast ub-toast--warn" style={{ marginBottom: 12 }}>
              {t(lang, 'driverSetInitialLocationHint')}
            </div>
          )}

          {isLoggedIn && effectiveDriverId != null && (
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                className="ghost-btn"
                onClick={resetMyLocation}
                style={{ width: '100%' }}
              >
                {t(lang, 'driverResetLocationDebug')}
              </button>
            </div>
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
              orders={locConfirmed ? displayOrders : []}
              isDriverView
              onAcceptOrder={handleAcceptAndSync}
              drivers={drivers}
              currentDriverId={driverReady ? effectiveDriverId : null}
              selectedOrderId={selectedOrderId}
              onSelectOrder={id => setSelectedOrderId(id)}
            />

            {loading && (
              <div className="auth-hint" style={{ marginTop: 8 }}>
                {t(lang, 'loading')}
              </div>
            )}
            {error && <div className="error-box">{error}</div>}
          </section>

          {isLoggedIn && myCompletedOrders.length > 0 && (
            <section className="orders-block" style={{ marginTop: 14 }}>
              <h3>{t(lang, 'driverCompletedOrdersTitle')}</h3>
              {myCompletedOrders.slice(0, 5).map(o => (
                <div
                  key={o.id}
                  style={{
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                    background: '#fff',
                  }}
                >
                  <div style={{ fontWeight: 800 }}>
                    {t(lang, 'driverOrderPrefix')}{o.id}{' '}
                    <span style={{ color: 'green' }}>{t(lang, 'driverCompletedTag')}</span>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {t(lang, 'orderPickupLabel')}：{o.pickup}
                    <br />
                    {t(lang, 'orderDropoffLabel')}：{o.dropoff}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </aside>
    </section>
  )
}