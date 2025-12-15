// src/components/OrderList.jsx
import { useMemo } from 'react'
import { t } from '../i18n'

function safeDateText(x) {
  const ts = Date.parse(x || '')
  if (!Number.isFinite(ts)) return ''
  const d = new Date(ts)
  return d.toLocaleString()
}

function normalizeStatus(raw) {
  const s = String(raw || '').toLowerCase()
  if (['en_route', 'enroute'].includes(s)) return 'enroute'
  if (['picked_up', 'in_progress', 'on_trip', 'ongoing'].includes(s)) return 'ongoing'
  if (['done', 'complete', 'completed', 'finished'].includes(s)) return 'completed'
  if (['assigned'].includes(s)) return 'assigned'
  if (['accepted'].includes(s)) return 'accepted'
  return s || 'pending'
}

function statusLabel(lang, status) {
  // 你也可以改用 t(lang, 'xxx')，這裡先提供穩定 fallback
  const s = normalizeStatus(status)
  if (lang === 'en') {
    return (
      {
        pending: 'Pending',
        assigned: 'Assigned',
        accepted: 'Accepted',
        enroute: 'En route',
        ongoing: 'On trip',
        completed: 'Completed',
      }[s] || s
    )
  }
  // zh / ja / ko 你可以再擴，先用中文通用
  return (
    {
      pending: '等待中',
      assigned: '已指派',
      accepted: '已接單',
      enroute: '前往中',
      ongoing: '行程中',
      completed: '已完成',
    }[s] || s
  )
}

function findDriverName(drivers, driverId) {
  if (!driverId) return ''
  const d = Array.isArray(drivers) ? drivers.find(x => x?.id === driverId) : null
  return d?.name || d?.username || d?.displayName || ''
}

function groupKeyForOrder(o, isDriverView) {
  // 司機端可能看到多乘客；乘客端通常同一個人
  // 盡量用常見欄位做 grouping，找不到就歸到 "Orders"
  if (isDriverView) {
    return o?.passengerName || o?.passengerUsername || o?.passengerId || 'Passengers'
  }
  return o?.passengerName || o?.passengerUsername || o?.passengerId || 'My Orders'
}

export default function OrderList({
  lang,
  orders,
  drivers,
  isDriverView,
  selectedOrderId,
  completedOrderIds,
  onSelectOrder,
}) {
  const list = useMemo(() => (Array.isArray(orders) ? orders : []), [orders])

  // 分組（同一位顧客一個 group；即使乘客端只有一人，也會有一個明顯「外框」）
  const grouped = useMemo(() => {
    const map = new Map()
    for (const o of list) {
      const key = groupKeyForOrder(o, Boolean(isDriverView))
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(o)
    }
    // group 內依時間排序（新到舊）
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => {
        const ta = Date.parse(a?.updatedAt || a?.createdAt || '') || 0
        const tb = Date.parse(b?.updatedAt || b?.createdAt || '') || 0
        return tb - ta
      })
      map.set(k, arr)
    }
    return Array.from(map.entries())
  }, [list, isDriverView])

  if (!grouped.length) {
    return (
      <div className="auth-hint" style={{ marginTop: 10 }}>
        {t(lang, 'noOrders') || '目前沒有訂單'}
      </div>
    )
  }

  return (
    <div className="order-groups">
      {grouped.map(([groupName, arr]) => (
        <div key={groupName} className="order-group">
          <div className="order-group-header">
            <div className="order-group-title">
              {isDriverView ? `乘客：${groupName}` : `訂單列表`}
            </div>
            <div className="order-group-sub">{arr.length} 筆</div>
          </div>

          <div className="order-cards">
            {arr.map(o => {
              const id = o?.id
              const st = normalizeStatus(o?.status)
              const isSelected = selectedOrderId != null && id === selectedOrderId
              const isCompleted = completedOrderIds instanceof Set ? completedOrderIds.has(id) : false

              const pickup = o?.pickupText || o?.pickupLabel || o?.pickup || o?.from || ''
              const dropoff = o?.dropoffText || o?.dropoffLabel || o?.dropoff || o?.to || ''
              const driverName = findDriverName(drivers, o?.driverId || o?.assignedDriverId)

              const vehicleType = o?.vehicleType || o?.meta?.vehicleType
              const price = o?.price ?? o?.meta?.price
              const distanceKm = o?.distanceKm ?? o?.meta?.distanceKm

              return (
                <button
                  key={id ?? Math.random()}
                  type="button"
                  className={[
                    'order-card',
                    isSelected ? 'selected' : '',
                    isCompleted || st === 'completed' ? 'completed' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onSelectOrder?.(id)}
                >
                  <div className="order-card-top">
                    <span className={`badge ${st}`}>{statusLabel(lang, st)}</span>
                    <span className="order-id">#{id ?? '-'}</span>
                  </div>

                  <div className="order-route">
                    <div className="order-point">
                      <span className="k">上車：</span>
                      <span>{pickup || '—'}</span>
                    </div>
                    <div className="order-point">
                      <span className="k">下車：</span>
                      <span>{dropoff || '—'}</span>
                    </div>
                  </div>

                  <div className="order-footer">
                    <span>
                      <span className="dim">司機：</span>
                      {driverName || '—'}
                    </span>

                    {vehicleType ? (
                      <span>
                        <span className="dim">車種：</span>
                        {vehicleType}
                      </span>
                    ) : null}

                    {Number.isFinite(Number(distanceKm)) ? (
                      <span>
                        <span className="dim">距離：</span>
                        {Number(distanceKm).toFixed(1)} km
                      </span>
                    ) : null}

                    {Number.isFinite(Number(price)) ? (
                      <span>
                        <span className="dim">預估：</span>${Number(price).toFixed(2)}
                      </span>
                    ) : null}

                    {(o?.updatedAt || o?.createdAt) ? (
                      <span>
                        <span className="dim">時間：</span>
                        {safeDateText(o?.updatedAt || o?.createdAt)}
                      </span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
