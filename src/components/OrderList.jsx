// src/components/OrderList.jsx
import React, { useMemo } from 'react'
import { t } from '../i18n'

function getStr(x) {
  return typeof x === 'string' ? x : x == null ? '' : String(x)
}

function normalizeStatus(s) {
  const k = getStr(s).toLowerCase().trim()
  if (!k) return 'pending'
  if (k === 'enroute') return 'en_route'
  if (k === 'on_trip') return 'in_progress'
  return k
}

function statusLabel(lang, statusKey) {
  const zh = {
    pending: '等待派單',
    assigned: '已指派',
    accepted: '司機已接單',
    en_route: '前往上車點',
    picked_up: '行程中',
    in_progress: '行程中',
    ongoing: '行程中',
    completed: '已完成',
    cancelled: '已取消',
  }
  const dict = lang === 'zh' ? zh : zh
  return dict[statusKey] || (lang === 'zh' ? '進行中' : 'In progress')
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
  const driverMap = useMemo(() => {
    const m = new Map()
    ;(Array.isArray(drivers) ? drivers : []).forEach(d => {
      if (d?.id != null) m.set(d.id, d)
    })
    return m
  }, [drivers])

  const list = Array.isArray(orders) ? orders : []

  return (
    <div className="order-groups">
      <div className="order-group">
        <div className="order-group-header">
          <div className="order-group-title">{t(lang, isDriverView ? 'ordersTitleDriver' : 'ordersTitlePassenger')}</div>
          <div className="order-group-sub">{list.length} 筆</div>
        </div>

        <div className="order-cards">
          {list.map(o => {
            const id = o?.id
            const isSelected = id != null && selectedOrderId === id

            // ✅ 只信 completedOrderIds：不管後端 status 怎麼亂寫
            const done = Boolean(completedOrderIds?.has?.(id))

            const rawStatus = normalizeStatus(o?.status)
            const statusKey = done ? 'completed' : rawStatus

            const pickup = o?.pickup ?? o?.pickupText ?? o?.pickup_label ?? '-'
            const dropoff = o?.dropoff ?? o?.dropoffText ?? o?.dropoff_label ?? '-'

            const driverId = o?.driverId ?? o?.assignedDriverId ?? o?.driver_id
            const driverName = driverId != null ? (driverMap.get(driverId)?.name || driverMap.get(driverId)?.username || '') : ''

            const cardCls = ['order-card', isSelected ? 'selected' : '', done ? 'completed' : ''].filter(Boolean).join(' ')

            return (
              <button
                key={id ?? Math.random()}
                type="button"
                className={cardCls}
                onClick={() => id != null && onSelectOrder?.(id)}
              >
                <div className="order-card-top">
                  <span className={`badge ${statusKey}`}>{statusLabel(lang, statusKey)}</span>
                  <span className="order-id">#{id ?? '-'}</span>
                </div>

                <div className="order-route">
                  <div className="order-point">
                    <span className="k">上車：</span>
                    <span>{pickup}</span>
                  </div>
                  <div className="order-point">
                    <span className="k">下車：</span>
                    <span>{dropoff}</span>
                  </div>
                </div>

                <div className="order-footer">
                  <div className="dim">司機：{driverName || driverId || '—'}</div>
                  <div className="dim">車種：{o?.vehicleType || '—'}</div>
                  <div className="dim">距離：{typeof o?.distanceKm === 'number' ? `${o.distanceKm.toFixed(1)} km` : '—'}</div>
                  <div className="dim">時間：{o?.updatedAt || o?.createdAt || '—'}</div>
                </div>
              </button>
            )
          })}

          {!list.length && <div className="auth-hint" style={{ opacity: 0.8, padding: '10px 2px' }}>目前沒有訂單</div>}
        </div>
      </div>
    </div>
  )
}
