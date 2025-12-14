// src/components/OrderList.jsx
import { resolveLocation } from '../locationResolver.js'

export default function OrderList({
  orders = [],
  isDriverView = false,
  onAcceptOrder,
  drivers = [],
  currentDriverId, // 目前沒用到，但保留參數
}) {
  // 備援用的距離計算（km）
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
    return d
  }

  // 共用：取得訂單距離（km）
  function getDistanceKm(order) {
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

    if (!pickupLoc || !dropoffLoc) return null

    const d = distanceKm(pickupLoc, dropoffLoc)
    return d != null ? Math.round(d * 10) / 10 : null
  }

  // 共用：取得訂單價格（USD）
  function getPrice(order) {
    if (typeof order.price === 'number') return order.price
    if (typeof order.estimatedFare === 'number') return order.estimatedFare
    if (typeof order.estimatedPrice === 'number') return order.estimatedPrice
    return null
  }

  return (
    <ul className="orders-list">
      {orders.map(order => {
        const driverObj = drivers.find(d => d.id === order.driverId)

        const driverLabel =
          order.driverName ||
          (driverObj && driverObj.name) ||
          (order.driverId != null ? `Driver #${order.driverId}` : '未知司機')

        const distKm = getDistanceKm(order)
        const price = getPrice(order)

        const vehicleLabel = order.vehicleType
          ? order.vehicleType.toUpperCase()
          : null

        const dispatchScore =
          isDriverView && typeof order.dispatchScore === 'number'
            ? order.dispatchScore
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

              {/* 車種 / 距離 / 預估價格 / 派遣分數 */}
              <div className="order-meta">
                {vehicleLabel && <span>車種：{vehicleLabel}</span>}
                {typeof distKm === 'number' && (
                  <span>
                    {vehicleLabel ? ' ・' : ''}
                    距離：約 {distKm.toFixed(1)} 公里
                  </span>
                )}
                {typeof price === 'number' && (
                  <span>
                    {' ・'}預估價：約 $ {price.toFixed(2)}
                  </span>
                )}
                {dispatchScore != null && (
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

