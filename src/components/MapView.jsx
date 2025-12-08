// src/components/MapView.jsx
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { t } from '../i18n'

// 用 emoji 做圖示
const taxiIcon = L.divIcon({
  html: '🚕',
  className: 'taxi-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const passengerIcon = L.divIcon({
  html: '🧍',
  className: 'passenger-icon',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

const destIcon = L.divIcon({
  html: '🎯',
  className: 'dest-icon',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

function makeStopIcon(index) {
  // index 從 1 開始
  return L.divIcon({
    html: `<div class="stop-icon-inner">${index}</div>`,
    className: 'stop-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

// 根據模式決定要專注哪一筆訂單
function getFocusOrder(orders, mode, currentDriverId) {
  if (!orders || orders.length === 0) return null

  if (mode === 'driver' && currentDriverId != null) {
    // 司機端：找「指派給這個司機的訂單」，取最後一筆
    const mine = orders.filter(o => o.driverId === currentDriverId)
    if (mine.length > 0) return mine[mine.length - 1]
  }

  // 乘客端傳進來的本來就只會是該乘客的訂單，所以取最後一筆就好
  return orders[orders.length - 1]
}

export default function MapView({
  lang = 'zh',
  drivers = [],
  orders = [],
  mode = 'passenger', // 'passenger' or 'driver'
  currentDriverId = null,
}) {
  // 紐約中心點
  const center = [40.758, -73.9855] // Times Square

  const focusOrder = getFocusOrder(orders, mode, currentDriverId)

  const pickupPos =
    focusOrder && focusOrder.pickupLocation
      ? [focusOrder.pickupLocation.lat, focusOrder.pickupLocation.lng]
      : null

  const dropoffPos =
    focusOrder && focusOrder.dropoffLocation
      ? [focusOrder.dropoffLocation.lat, focusOrder.dropoffLocation.lng]
      : null

  // ⭐ 有座標的停靠點
  const stopPositions =
    focusOrder && Array.isArray(focusOrder.stops)
      ? focusOrder.stops
          .filter(
            s => typeof s.lat === 'number' && typeof s.lng === 'number'
          )
          .map(s => [s.lat, s.lng])
      : []

  // ⭐ 路線座標：pickup → stops… → dropoff
  const routePositions = []
  if (pickupPos) routePositions.push(pickupPos)
  if (stopPositions.length > 0) {
    routePositions.push(...stopPositions)
  }
  if (dropoffPos) routePositions.push(dropoffPos)

  // 🔹 決定這個畫面要畫出哪些司機車輛
  // 預設「沒有任何車」
  let visibleDrivers = []

  if (mode === 'driver' && currentDriverId != null) {
    // 司機端：只顯示自己那台車
    visibleDrivers = drivers.filter(d => d.id === currentDriverId)
  } else if (
    mode === 'passenger' &&
    focusOrder &&
    focusOrder.driverId != null
  ) {
    // 乘客端：只顯示「接了這筆訂單的那台車」
    visibleDrivers = drivers.filter(d => d.id === focusOrder.driverId)
  }
  // 其它情況（還沒有人接單）⇒ visibleDrivers 維持 []

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={true}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 司機車輛（依 visibleDrivers） */}
      {visibleDrivers.map(driver => (
        <Marker
          key={driver.id}
          position={[driver.lat, driver.lng]}
          icon={taxiIcon}
        >
          <Popup>
            <div>
              <div>{driver.user || driver.name || `Driver #${driver.id}`}</div>
              <div>
                {t(lang, 'driverStatusLabel')}
                {driver.status === 'busy'
                  ? t(lang, 'driverStatusBusy')
                  : t(lang, 'driverStatusIdle')}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* 乘客上車點（依 focusOrder） */}
      {pickupPos && (
        <Marker position={pickupPos} icon={passengerIcon}>
          <Popup>{t(lang, 'pickupMarkerTitle')}</Popup>
        </Marker>
      )}

      {/* ⭐ 中途停靠點 marker：1,2,3... */}
      {stopPositions.map((pos, idx) => (
        <Marker
          key={`stop-${idx}`}
          position={pos}
          icon={makeStopIcon(idx + 1)}
        >
          <Popup>
            {t(lang, 'stopMarkerTitle')} {idx + 1}
          </Popup>
        </Marker>
      ))}

      {/* 目的地 */}
      {dropoffPos && (
        <Marker position={dropoffPos} icon={destIcon}>
          <Popup>{t(lang, 'dropoffMarkerTitle')}</Popup>
        </Marker>
      )}

      {/* 路線折線：pickup → stops… → dropoff */}
      {routePositions.length >= 2 && (
        <Polyline positions={routePositions} />
      )}
    </MapContainer>
  )
}
