// src/components/OrderList.jsx
import React from 'react'
import { t } from '../i18n'

export default function OrderList({
  lang = 'zh',
  orders = [],
  drivers = [],

  // driver view（原本）
  isDriverView = false,
  onAcceptOrder,
  currentDriverId,

  // optional
  onSelectOrder,
  selectedOrderId,
  completedOrderIds,
}) {
  const completedSet = completedOrderIds instanceof Set ? completedOrderIds : new Set()

  const getDriverName = driverId => {
    const d = drivers.find(x => x.id === driverId)
    return d?.name || d?.username || (driverId != null ? `#${driverId}` : '')
  }

  if (!orders || orders.length === 0) {
    return <div className="auth-hint">{t(lang, 'noOrders') || 'No orders'}</div>
  }

  return (
    <div className="order-list">
      {orders.map(o => {
        const oid = Number(o.id)
        const isCompleted = completedSet.has(oid)
        const isSelected = selectedOrderId != null && o.id === selectedOrderId

        const cardStyle = {
          opacity: isCompleted ? 0.5 : 1,
          border: isSelected ? '1px solid #00e676' : undefined,
        }

        const handleClick = () => {
          if (isDriverView) return
          onSelectOrder?.(o.id)
        }

        return (
          <div
            key={o.id}
            className="order-card"
            style={cardStyle}
            role={!isDriverView ? 'button' : undefined}
            onClick={handleClick}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>
                Order #{o.id}
                {isCompleted && <span style={{ marginLeft: 10, color: 'red', fontWeight: 800 }}>已完成</span>}
              </div>
              <div style={{ opacity: 0.8 }}>
                {o.status ? String(o.status) : ''}
              </div>
            </div>

            <div style={{ marginTop: 6, opacity: 0.9 }}>
              <div>Pickup: {o.pickup}</div>
              <div>Dropoff: {o.dropoff}</div>
              {Array.isArray(o.stops) && o.stops.length > 0 && (
                <div>Stops: {o.stops.map(s => s.label || s.text || '').filter(Boolean).join(' / ')}</div>
              )}
            </div>

            {o.driverId != null && (
              <div style={{ marginTop: 6, opacity: 0.85 }}>
                Driver: {getDriverName(o.driverId)}
              </div>
            )}

            {/* driver view：保留你原本的接單按鈕 */}
            {isDriverView && o.status === 'pending' && (
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => onAcceptOrder?.(o.id)}
                  disabled={!currentDriverId}
                >
                  {t(lang, 'acceptOrder') || 'Accept'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
