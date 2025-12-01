// src/components/OrderList.jsx
import { resolveLocation } from '../locationResolver.js'

export default function OrderList({
  orders = [],
  isDriverView = false,
  onAcceptOrder,
  drivers = [],
  currentDriverId,
}) {
  // 目前登入這台司機車（只在司機端需要）
  const myDriver =
    isDriverView && currentDriverId != null
      ? drivers.find(d => d.id === currentDriverId)
      : null

  // ===== 小工具：Haversine 算兩點距離（km）=====
  function distanceKm(a, b) {
    if (!a || !b) return null
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
    const d = R * c
    return Math.round(d * 10) / 10 // 取到小數一位
  }

  // ===== 司機端：計算派遣分數（1~10，距離越近分數越高）=====
  function calcDispatchScore(order) {
    if (!isDriverView) return null
    if (!myDriver) return null

    // 優先用 order.pickupLocation，其次用 pickupLat/pickupLng，再退回舊的 resolveLocation
    const pickupLoc =
      order.pickupLocation ||
      (typeof order.pickupLat === 'number' &&
      typeof order.pickupLng === 'number'
        ? { lat: order.pickupLat, lng: order.pickupLng }
        : resolveLocation(order.pickup))

    if (!pickupLoc) return null

    const dx = pickupLoc.lat - myDriver.lat
    const dy = pickupLoc.lng - myDriver.lng
    const dist = Math.hypot(dx, dy)

    // 這裡假設 0km ~ 10km 映射到 10→1 分
    const MAX_DIST = 0.1 // 約 10km（視你地圖範圍微調）
    const ratio = Math.min(dist / MAX_DIST, 1) // 0~1
    const normalized = 1 - ratio // 近:1, 遠:0
    const score = 1 + normalized * 9
    return Math.round(score)
  }

  // ===== 共用：計算這筆訂單的距離（km）=====
  function calcOrderDistance(order) {
    // 如果後端有存 distanceKm 就直接用
    if (typeof order.distanceKm === 'number') {
      return order.distanceKm
    }

    const pickupLoc =
      order.pickupLocation ||
      (typeof order.pickupLat === 'number' &&
      typeof order.pickupLng === 'number'
        ? { lat: order.pickupLat, lng: order.pickupLng }
        : resolveLocation(order.pickup))

    const dropoffLoc =
      order.dropoffLocation ||
      (typeof order.dropoffLat === 'number' &&
      typeof order.dropoffLng === 'number'
        ? { lat: order.dropoffLat, lng: order.dropoffLng }
        : resolveLocation(order.dropoff))

    return distanceKm(pickupLoc, dropoffLoc)
  }

  // ===== 共用：依車種＋距離算預估價格 =====
  function calcEstimatedFare(order, distKm) {
    if (typeof distKm !== 'number' || distKm <= 0) return null

    const type = (order.vehicleType || '').toUpperCase()
    let base = 0
    let perKm = 0

    if (type === 'YELLOW') {
      base = 70
      perKm = 25
    } else if (type === 'GREEN') {
      base = 60
      perKm = 22
    } else if (type === 'FHV') {
      base = 90
      perKm = 30
    } else {
      return null
    }

    return Math.round(base + perKm * distKm)
  }

  return (
    <ul className="orders-list">
      {orders.map(order => {
        const driverObj = drivers.find(d => d.id === order.driverId)

        const driverLabel =
          order.driverName ||
          (driverObj && driverObj.name) ||
          (order.driverId != null ? `Driver #${order.driverId}` : '未知司機')

        const dispatchScore = calcDispatchScore(order)
        const distKm = calcOrderDistance(order)
        const estimatedFare = calcEstimatedFare(order, distKm)
        const vehicleLabel = order.vehicleType
          ? order.vehicleType.toUpperCase()
          : null

        return (
          <li key={order.id} className="order-item">
            <div className="order-main">
              <div className="order-title">
                {order.pickup} → {order.dropoff}
              </div>

              <div className="order-status">
                {order.status === 'pending'
                  ? '等待司機接單'
                  : order.status === 'assigned'
                  ? `已派遣司機（ ${driverLabel} ）`
                  : order.status}
              </div>

              {/* 下面這一行：車種 / 距離 / 預估價格 / 派遣分數 */}
              <div className="order-meta">
                {vehicleLabel && <span>車種：{vehicleLabel}</span>}
                {typeof distKm === 'number' && (
                  <span>
                    {vehicleLabel ? ' ・' : ''}
                    距離：約 {distKm} 公里
                  </span>
                )}
                {typeof estimatedFare === 'number' && (
                  <span>{' ・'}預估價格：約 NT$ {estimatedFare}</span>
                )}
                {isDriverView && dispatchScore != null && (
                  <span>{' ・'}派遣分數：{dispatchScore} / 10</span>
                )}
              </div>
            </div>

            {isDriverView && order.status === 'pending' && (
              <button
                className="secondary-btn"
                type="button"
                onClick={() => onAcceptOrder && onAcceptOrder(order.id)}
              >
                接單
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
