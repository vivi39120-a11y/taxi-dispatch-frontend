import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiFetch } from './apiBase.js'

const DEFAULT_CENTER = [40.7271, -73.9293]
const DEFAULT_ZOOM = 11
const HOTSPOT_MOVE_TASK_KEY = 'hotspotMoveTaskV1'
const HOTSPOT_MOVE_EVT = 'hotspotMoveTaskChanged'
const DRIVER_LIVE_STATE_PREFIX = 'driverLiveState:'

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

function getOrderDriverId(order) {
  return order?.driverId ?? order?.assignedDriverId ?? order?.driver_id ?? null
}

function isActiveStatus(status) {
  return ACTIVE_STATUS_SET.has(String(status || '').toLowerCase())
}

function readHotspotMoveTask() {
  try {
    const raw = localStorage.getItem(HOTSPOT_MOVE_TASK_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function emitHotspotMoveTaskChanged(task) {
  try {
    window.dispatchEvent(new CustomEvent(HOTSPOT_MOVE_EVT, { detail: { task } }))
  } catch {}
}

function writeHotspotMoveTask(task) {
  try {
    localStorage.setItem(HOTSPOT_MOVE_TASK_KEY, JSON.stringify(task))
  } catch {}
  emitHotspotMoveTaskChanged(task)
}

function clearHotspotMoveTask() {
  try {
    localStorage.removeItem(HOTSPOT_MOVE_TASK_KEY)
  } catch {}
  emitHotspotMoveTaskChanged(null)
}

function readDriverLiveState(driverId) {
  try {
    if (driverId == null) return null
    const raw = localStorage.getItem(`${DRIVER_LIVE_STATE_PREFIX}${driverId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const lat = Number(parsed?.lat)
    const lng = Number(parsed?.lng)
    const heading = Number(parsed?.heading ?? 0)
    const speedKph = Number(parsed?.speedKph ?? 0)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

    return {
      lat,
      lng,
      heading: Number.isFinite(heading) ? heading : 0,
      speedKph: Number.isFinite(speedKph) ? speedKph : 0,
    }
  } catch {
    return null
  }
}

function readPersistedDriverLoc(driverId) {
  try {
    if (driverId == null) return null
    const raw = localStorage.getItem(`driverLoc:${driverId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const lat = Number(parsed?.lat)
    const lng = Number(parsed?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng, heading: 0, speedKph: 0 }
  } catch {
    return null
  }
}

function makeTaxiIcon() {
  const svg = `
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 8C12 5.79086 13.7909 4 16 4H28C30.2091 4 32 5.79086 32 8V36C32 38.2091 30.2091 40 28 40H16C13.7909 40 12 38.2091 12 36V8Z" fill="black" fillOpacity="0.3" transform="translate(2, 2)"/>
      <path d="M12 8C12 5.79086 13.7909 4 16 4H28C30.2091 4 32 5.79086 32 8V36C32 38.2091 30.2091 40 28 40H16C13.7909 40 12 38.2091 12 36V8Z" fill="#F4C430" stroke="#E6B800" strokeWidth="1"/>
      <path d="M14 10H30V16H14V10Z" fill="#333"/>
      <path d="M14 30H30V34H14V30Z" fill="#333"/>
      <rect x="18" y="20" width="8" height="4" rx="1" fill="#FFD700" stroke="#D4AF37" strokeWidth="0.5"/>
      <path d="M13 5H15V6H13V5Z" fill="#FFF" />
      <path d="M29 5H31V6H29V5Z" fill="#FFF" />
      <path d="M13 38H15V39H13V38Z" fill="#F00" />
      <path d="M29 38H31V39H29V38Z" fill="#F00" />
    </svg>
  `
  const html = `
    <div
      class="taxi-icon-root"
      style="
        width:44px;
        height:44px;
        display:flex;
        align-items:center;
        justify-content:center;
        transform-origin:22px 22px;
        transform: rotate(var(--rot, 0deg));
        will-change: transform;
      "
    >
      ${svg}
    </div>
  `
  return L.divIcon({
    className: '',
    html,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

const taxiIcon = makeTaxiIcon()

function quantile(sortedArr, q) {
  if (!sortedArr.length) return 0
  const pos = (sortedArr.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (sortedArr[base + 1] !== undefined) {
    return sortedArr[base] + rest * (sortedArr[base + 1] - sortedArr[base])
  }
  return sortedArr[base]
}

function isAirportZone(z) {
  const name = String(z?.Zone || '').toLowerCase()
  return (
    name.includes('airport') ||
    name.includes('jfk') ||
    name.includes('laguardia')
  )
}

function visualScore(z) {
  return Number(z?.pred_rides || 0) * (1 + Number(z?.priority || 0))
}

function buildVisualBreaks(zones) {
  const vals = (zones || [])
    .filter((z) => !isAirportZone(z))
    .map((z) => visualScore(z))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b)

  if (!vals.length) {
    return { breaks: [0, 0, 0, 0], cap95: 0 }
  }

  return {
    breaks: [
      quantile(vals, 0.30),
      quantile(vals, 0.65),
      quantile(vals, 0.85),
      quantile(vals, 0.95),
    ],
    cap95: quantile(vals, 0.95),
  }
}

function colorByVisualScore(z, breaks, cap95) {
  if (isAirportZone(z)) return '#00c853'

  const s = Math.min(visualScore(z), cap95)

  if (s >= breaks[3]) return '#d50000'
  if (s >= breaks[2]) return '#ff6d00'
  if (s >= breaks[1]) return '#ffd600'
  if (s >= breaks[0]) return '#00c853'
  return '#00b0ff'
}

async function getRoute(fromLat, fromLon, toLat, toLon) {
  try {
    const res = await apiFetch('/api/route', {
      query: {
        fromLat,
        fromLng: fromLon,
        toLat,
        toLng: toLon,
      },
      timeoutMs: 30000,
    })

    if (!res.ok) {
      throw new Error(`route ${res.status}`)
    }

    const data = await res.json()
    return {
      coords: Array.isArray(data.coords) ? data.coords : [],
      dist: Number.isFinite(Number(data.dist)) ? Number(data.dist) : null,
    }
  } catch (e) {
    console.error('getRoute failed', e)
    return { coords: [], dist: null }
  }
}


function FitRoutes({ routes }) {
  const map = useMap()

  useEffect(() => {
    if (!routes || !routes.length) return
    const all = routes.flat().filter(Boolean)
    if (all.length < 2) return
    map.fitBounds(L.latLngBounds(all), { padding: [30, 30] })
  }, [map, routes])

  return null
}

function SyncedDriverMarker({ driverState }) {
  const markerRef = useRef(null)

  useEffect(() => {
    const m = markerRef.current
    const el = m?.getElement?.()
    if (!el) return
    const rot = Number(driverState?.heading ?? 0)
    el.style.setProperty('--rot', `${rot}deg`)
  }, [driverState])

  if (!driverState) return null

  return (
    <Marker
      ref={markerRef}
      position={[Number(driverState.lat), Number(driverState.lng)]}
      icon={taxiIcon}
    />
  )
}


export default function DriverPage({
  onBack,
  zones = [],
  zonesLoading = false,
  zonesError = '',
  driverId = null,
  drivers = [],
  orders = [],
}) {
    
  const [driverPos, setDriverPos] = useState(null)
  const [top3, setTop3] = useState([])
  const [routes3, setRoutes3] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [moveTask, setMoveTask] = useState(() => readHotspotMoveTask())
  const lastRecommendKeyRef = useRef('')

  const visualMeta = useMemo(() => buildVisualBreaks(zones), [zones])

    const myDriver = useMemo(() => {
    if (driverId != null) {
      const byId = drivers.find(d => sameId(d?.id, driverId))
      if (byId) return byId
    }
    return null
  }, [drivers, driverId])

  const myActiveOrder = useMemo(() => {
    if (driverId == null) return null
    return (orders || []).find(
      o => sameId(getOrderDriverId(o), driverId) && isActiveStatus(o?.status)
    ) || null
  }, [orders, driverId])

  const isHotspotMoveActive = Boolean(
    moveTask &&
    moveTask.driverId != null &&
    sameId(moveTask.driverId, driverId) &&
    moveTask.status === 'moving'
  )

  const isDriverBusyMoving = Boolean(myActiveOrder) || isHotspotMoveActive

    const fetchRecommendations = useCallback(async (lat, lon) => {
    setLoading(true)
    setErrorMsg('')

    try {
      const res = await apiFetch('/api/dispatch-recommendations', {
        query: { lat, lng: lon, top_k: 3 },
        timeoutMs: 360000,
      })
      if (!res.ok) throw new Error(`dispatch-recommendations ${res.status}`)

      const data = await res.json()
      const rows = Array.isArray(data.rows) ? data.rows : []

      const routePromises = rows.map(async (r, i) => {
        const targetLat = Number(r.lat_wgs)
        const targetLon = Number(r.lon_wgs)

        const rt = await getRoute(lat, lon, targetLat, targetLon)
        const coords =
          rt.coords && rt.coords.length
            ? rt.coords
            : [
                [lat, lon],
                [targetLat, targetLon],
              ]

        return {
          ...r,
          idx: i,
          lat_wgs: targetLat,
          lon_wgs: targetLon,
          pred_rides: Number(r.pred_rides ?? 0),
          priority: Number(r.priority ?? 0),
          distance_km: Number(r.distance_km ?? 0),
          zone_supply: Number(r.zone_supply ?? 0),
          local_supply: Number(r.local_supply ?? 0),
          score: Number(r.score ?? 0),
          gain: Number(r.gain ?? 0),
          move_recommended: Boolean(r.move_recommended),
          coords,
          road_km: rt.dist != null ? rt.dist : Number(r.road_km ?? r.distance_km ?? 0),
        }
      })

      const routeResult = await Promise.all(routePromises)
      routeResult.sort((a, b) => a.idx - b.idx)

      setTop3(routeResult)
      setRoutes3(routeResult.map(x => x.coords))
    } catch (e) {
      console.error('recommendation failed', e)
      setErrorMsg('推薦結果取得失敗')
      setTop3([])
      setRoutes3([])
    } finally {
      setLoading(false)
    }
  }, [])

  function startHotspotMove(target) {
    if (!driverId || !driverPos || !target?.coords || target.coords.length < 2) return

    const task = {
      taskId: Date.now(),
      driverId: Number(driverId),
      status: 'moving',
      start: {
        lat: Number(driverPos.lat),
        lng: Number(driverPos.lng),
      },
      end: {
        lat: Number(target.lat_wgs),
        lng: Number(target.lon_wgs),
        zoneId: Number(target.zone_id),
        zoneName: String(target.Zone || ''),
      },
      coords: target.coords.map(p => [Number(p[0]), Number(p[1])]),
      createdAt: new Date().toISOString(),
    }

    writeHotspotMoveTask(task)
    setMoveTask(task)

    setTop3([])
    setRoutes3([])
    setErrorMsg('')
  }

    useEffect(() => {
    const syncTask = (e) => {
      const nextTask = e?.detail?.task ?? readHotspotMoveTask()
      setMoveTask(nextTask)
    }

    window.addEventListener(HOTSPOT_MOVE_EVT, syncTask)
    return () => window.removeEventListener(HOTSPOT_MOVE_EVT, syncTask)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      if (driverId == null) return

      const live = readDriverLiveState(driverId)
      const persisted = readPersistedDriverLoc(driverId)
      const fallback =
        persisted ||
        (
          myDriver &&
          Number.isFinite(Number(myDriver.lat)) &&
          Number.isFinite(Number(myDriver.lng))
            ? { lat: Number(myDriver.lat), lng: Number(myDriver.lng), heading: 0, speedKph: 0 }
            : null
        )

      const next =
        isDriverBusyMoving
          ? (live || fallback || null)
          : (persisted || fallback || live || null)

      setDriverPos(next)
    }, 120)

    return () => clearInterval(timer)
  }, [driverId, myDriver, isDriverBusyMoving])

  useEffect(() => {
    if (!driverPos) return
    if (isDriverBusyMoving) return
    if (driverId == null) return

    const key = `${Number(driverId)}:${driverPos.lat.toFixed(6)}:${driverPos.lng.toFixed(6)}`
    if (lastRecommendKeyRef.current === key) return

    lastRecommendKeyRef.current = key
    fetchRecommendations(Number(driverPos.lat), Number(driverPos.lng))
  }, [driverPos, driverId, isDriverBusyMoving, fetchRecommendations])


  function playToZone(coords) {
    if (!coords || coords.length < 2) return
    setPlayRoute(coords)
    setPlayingKey(String(Date.now()))
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <div style={{ flex: 2, position: 'relative' }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {zones.map((z, i) => {
            const color = colorByVisualScore(z, visualMeta.breaks, visualMeta.cap95)
            return (
              <CircleMarker
                key={`${z.PULocationID}-${i}`}
                center={[z.lat, z.lon]}
                radius={9}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.3,
                  weight: 2,
                }}
              >
                <Tooltip sticky>
                  <div>
                    <strong>{z.Zone}</strong>
                    <br />
                    ID: {z.PULocationID}
                    <br />
                    pred_rides: {Number(z.pred_rides).toFixed(4)}
                    <br />
                    priority: {Number(z.priority).toFixed(3)}
                    <br />
                    visual_score: {Number(visualScore(z)).toFixed(4)}
                  </div>
                </Tooltip>
              </CircleMarker>
            )
          })}

          <SyncedDriverMarker driverState={driverPos} />

                    {isHotspotMoveActive && Array.isArray(moveTask?.coords) && moveTask.coords.length >= 2 ? (
            <Polyline
              positions={moveTask.coords}
              pathOptions={{
                color: '#1565c0',
                weight: 5,
                opacity: 0.9,
              }}
            />
          ) : (
            routes3.map((coords, idx) => {
              if (!coords || coords.length < 2) return null
              const colors = ['#1565c0', '#2e7d32', '#6a1b9a']
              return (
                <Polyline
                  key={`r3-${idx}`}
                  positions={coords}
                  pathOptions={{
                    color: colors[idx] || '#1565c0',
                    weight: 5,
                    opacity: 0.85,
                  }}
                />
              )
            })
          )}


          <FitRoutes routes={isHotspotMoveActive && moveTask?.coords ? [moveTask.coords] : routes3} />
          </MapContainer>

        {onBack && (
          <button
            onClick={onBack}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              zIndex: 1000,
              padding: '10px 20px',
              background: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            返回行進頁面
          </button>
        )}
      </div>

      <div
        style={{
          flex: 1,
          borderLeft: '1px solid #ccc',
          padding: 20,
          overflowY: 'auto',
          background: '#fff',
        }}
      >
        <h2 style={{ marginTop: 0 }}>司機派車建議</h2>

        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          1) 進入本頁後自動同步同一位司機當前位置
          <br />
          2) 空車且靜止時自動計算推薦結果
          <br />
          3) 點推薦卡片後，司機車輛直接沿該路線前往推薦點
          <br />
          4) 本頁不提供司機重新定位功能，只同步顯示車輛與路線
        </p>

        <div
          style={{
            background: '#fafafa',
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          Score(z) = 2.0 × Demand(z) + 0.9 × Priority(z) − 0.9 × Distance(z)
          − 0.45 × ZoneSupply(z) − 0.20 × LocalSupply(z)
          <br />
          且只有當 Score_new − Score_current &gt; 0.2 時，才建議移動。
        </div>

        <h3 style={{ fontSize: 16, marginTop: 16 }}>
          當前司機位置：
          {driverPos ? (
            <span style={{ color: 'blue', fontSize: 14, marginLeft: 10 }}>
              {driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)}
            </span>
          ) : (
            <span style={{ color: 'red', fontSize: 14, marginLeft: 10 }}>
              尚未取得
            </span>
          )}
        </h3>


                {isDriverBusyMoving && (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 12px',
              border: '1px solid #90caf9',
              background: '#e3f2fd',
              color: '#1565c0',
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            車輛移動中
          </div>
        )}

        <h3 style={{ fontSize: 16, marginTop: 12 }}>
          {isDriverBusyMoving ? '推薦暫停中' : '推薦前 3 名區域'}
        </h3>

                {zonesLoading && (
          <div style={{ padding: 12, color: '#666' }}>熱點資料載入中...</div>
        )}

        {!zonesLoading && zonesError && (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 12px',
              border: '1px solid #ef9a9a',
              background: '#ffebee',
              color: '#c62828',
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            {zonesError}
          </div>
        )}

        {loading && (
          <div style={{ padding: 20, textAlign: 'center' }}>計算中...</div>
        )}

        {!loading && errorMsg && (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 12px',
              border: '1px solid #ef9a9a',
              background: '#ffebee',
              color: '#c62828',
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {top3.map((t, idx) => {
            const bg =
              idx === 0 ? '#ffe0b2' : idx === 1 ? '#e1f5fe' : '#e8f5e9'

            return (
              <div
                key={`${t.zone_id ?? idx}-${idx}`}
                onClick={() => {
                  if (isDriverBusyMoving) return
                  startHotspotMove(t)
                }}
                  style={{
                  padding: 15,
                  borderRadius: 10,
                  border: '1px solid #ddd',
                  cursor: isDriverBusyMoving ? 'default' : 'pointer',                  background: bg,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>
                  Top {idx + 1}: {t.Zone}
                </div>

                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
                  行政區: {t.Borough}
                  <br />
                  預測需求: <b>{Number(t.pred_rides).toFixed(4)}</b>
                  <br />
                  區域權重: {Number(t.priority).toFixed(4)}
                  <br />
                  直線距離: {Number(t.distance_km).toFixed(2)} km
                  <br />
                  道路距離(OSRM): {Number(t.road_km).toFixed(2)} km
                  <br />
                  區域供給: {t.zone_supply}
                  <br />
                  局部供給: {t.local_supply}
                  <br />
                  <span style={{ color: '#d32f2f' }}>
                    <b>Score: {Number(t.score).toFixed(4)}</b>
                  </span>
                  <br />
                  <b>Gain: {Number(t.gain).toFixed(4)}</b>
                  <br />
                  建議移動: {t.move_recommended ? '是' : '否'}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: '#777' }}>
          ※ 本頁改為連接新版後端：/api/zone-hotspots 與 /api/dispatch-recommendations
        </div>
      </div>
    </div>
  )
}