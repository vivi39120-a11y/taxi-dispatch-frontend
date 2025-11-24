import { resolveLocation } from '../locationResolver.js'

// src/components/OrderList.jsx
export default function OrderList({
  orders = [],
  isDriverView = false,
  onAcceptOrder,
  drivers = [],
  currentDriverId, // ⬅ 新增：目前登入的司機車輛 id
}) {
  // 目前登入的這台司機車
  const myDriver =
    currentDriverId != null
      ? drivers.find(d => d.id === currentDriverId)
      : null

  // 計算派遣分數（1~10）──距離越近分數越高
  function calcDispatchScore(order) {
    if (!myDriver) return null

    // 先從 order 上找是否已經有 pickupLocation（App 那邊有算過的話）
    const pickupLoc =
      order.pickupLocation || (order.pickup ? resolveLocation(order.pickup) : null)

    if (!pickupLoc) return null

    const dx = pickupLoc.lat - myDriver.lat
    const dy = pickupLoc.lng - myDriver.lng
    const dist = Math.hypot(dx, dy) // 直線距離（經緯度差）

    // 這裡設定一個「最大距離」，超過就當成 1 分
    const MAX_DIST = 0.1 // 大約 10km 左右，可自己調整

    const ratio = Math.min(dist / MAX_DIST, 1) // 0~1
    const normalized = 1 - ratio // 近 → 1，遠 → 0
    const score = 1 + normalized * 9 // 映射到 1~10

    return Math.round(score)
  }

  return (
    <ul className="orders-list">
      {orders.map(order => {
        const driverObj = drivers.find(d => d.id === order.driverId)

        const driverLabel =
          order.driverName ||
          (driverObj && driverObj.name) ||
          (order.driverId != null ? `Driver #${order.driverId}` : '未知司機')

        // 只有在司機端才算分數
        const score = isDriverView ? calcDispatchScore(order) : null

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

              {/* ⭐ 司機端才顯示的「預測派遣分數」 */}
              {isDriverView && (
                <div className="order-score">
                  預測派遣分數：
                  {score != null ? `${score} / 10` : '—'}
                </div>
              )}
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
