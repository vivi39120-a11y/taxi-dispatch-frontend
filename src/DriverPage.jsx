// src/DriverPage.jsx
import React, { useMemo } from 'react'

export default function DriverPage({ onBack, driverId, driverPosition }) {
  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams()

    if (driverId) params.set('driverId', String(driverId))

    if (
      driverPosition &&
      typeof driverPosition.lat === 'number' &&
      typeof driverPosition.lng === 'number'
    ) {
      params.set('lat', String(driverPosition.lat))
      params.set('lng', String(driverPosition.lng))
    }

    const qs = params.toString()
    return qs ? `/driver-map.html?${qs}` : '/driver-map.html'
  }, [driverId, driverPosition])

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="navbar navbar-dark bg-dark px-3" style={{ flexShrink: 0 }}>
        <span className="navbar-brand mb-0 h1">司機派遣系統</span>
        <button className="btn btn-outline-light btn-sm" onClick={onBack}>
          回首頁
        </button>
      </nav>

      <div style={{ flexGrow: 1, position: 'relative' }}>
        <iframe
          src={iframeSrc}
          title="Driver Dispatch Map"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      </div>
    </div>
  )
}
