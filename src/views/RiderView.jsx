// src/views/RiderView.jsx
import { useEffect, useState, useMemo } from 'react'
import MapView from '../components/MapView.jsx'
import OrderList from '../components/OrderList.jsx'
import { t } from '../i18n'

export default function RiderView({
  lang,
  drivers,
  orders, // 目前乘客自己的訂單（App.jsx 已經過濾）
  ordersWithLocations, // 有座標的版本（同樣是乘客自己的）
  loading,
  error,
  createOrder,
  refresh,
  currentUser,
  simulateVehicles,
}) {
  // 文字輸入
  const [pickupText, setPickupText] = useState('')
  const [dropoffText, setDropoffText] = useState('')

  // geocode 建議 & 選中的座標（起點 / 終點）
  const [pickupSuggestions, setPickupSuggestions] = useState([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState([])
  const [pickupLoc, setPickupLoc] = useState(null)
  const [dropoffLoc, setDropoffLoc] = useState(null)

  // 起點 / 終點是否「鎖定」
  const [pickupLocked, setPickupLocked] = useState(false)
  const [dropoffLocked, setDropoffLocked] = useState(false)

  // 中途停靠點
  const [stops, setStops] = useState([])

  // 預估價格結果
  const [fareOptions, setFareOptions] = useState(null)
  const [fareError, setFareError] = useState('')
  const [lastDistanceKm, setLastDistanceKm] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [resolvedStops, setResolvedStops] = useState([])

  // ====== 1) 乘客地圖要畫哪一張單：只挑「自己」且「進行中」的最新 1 張 ======
  const myActiveOrder = useMemo(() => {
    if (!currentUser || currentUser.role !== 'passenger') return null

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

    const candidates = ordersWithLocations
      .filter(o => o && o.customer === currentUser.username)
      .filter(o => ACTIVE.has(String(o.status || '').toLowerCase()))

    if (!candidates.length) return null

    const getTs = o => {
      const u = o.updatedAt ? Date.parse(o.updatedAt) : NaN
      if (Number.isFinite(u)) return u
      const c = o.createdAt ? Date.parse(o.createdAt) : NaN
      if (Number.isFinite(c)) return c
      return typeof o.id === 'number' ? o.id : 0
    }

    candidates.sort((a, b) => getTs(b) - getTs(a))
    return candidates[0]
  }, [ordersWithLocations, currentUser])

  // ✅ MapView 一律只吃 0 或 1 張單（避免第二筆被第一筆覆蓋或抓錯）
  const ordersForMap = useMemo(() => {
    return myActiveOrder ? [myActiveOrder] : []
  }, [myActiveOrder])

  // ===== 小工具：呼叫一次 geocode，拿第一筆結果 =====
  async function geocodeOnce(text) {
    if (!text || !text.trim()) return null
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(text.trim())}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    const first = data[0]
    return { lat: first.lat, lng: first.lng }
  }

  // 備援用的直線距離（km，haversine）
  function distanceKm(a, b) {
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
    return R * c
  }

  // 用 OSRM 算「多點路線」的道路距離 (km)
  async function osrmRouteDistanceKm(points) {
    if (!Array.isArray(points) || points.length < 2) return null

    const coordStr = points.map(p => `${p.lng},${p.lat}`).join(';')

    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      coordStr +
      `?overview=false`

    const res = await fetch(url)
    if (!res.ok) throw new Error('OSRM error')

    const data = await res.json()
    if (!data.routes || !data.routes.length) {
      throw new Error('OSRM no route')
    }

    return data.routes[0].distance / 1000
  }

  // ===== 上車地點：打字 → geocode 建議 =====
  useEffect(() => {
    if (pickupLocked) {
      setPickupSuggestions([])
      return
    }
    if (!pickupText || pickupText.length < 2) {
      setPickupSuggestions([])
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(pickupText)}`,
          { signal: controller.signal }
        )
        if (!res.ok) return
        const data = await res.json()
        setPickupSuggestions(data || [])
      } catch {
        // ignore
      }
    }, 400)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [pickupText, pickupLocked])

  // ===== 目的地：打字 → geocode 建議 =====
  useEffect(() => {
    if (dropoffLocked) {
      setDropoffSuggestions([])
      return
    }
    if (!dropoffText || dropoffText.length < 2) {
      setDropoffSuggestions([])
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(dropoffText)}`,
          { signal: controller.signal }
        )
        if (!res.ok) return
        const data = await res.json()
        setDropoffSuggestions(data || [])
      } catch {
        // ignore
      }
    }, 400)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [dropoffText, dropoffLocked])

  const handleSelectPickup = item => {
    setPickupText(item.label)
    setPickupLoc({ lat: item.lat, lng: item.lng })
    setPickupSuggestions([])
    setPickupLocked(true)
    resetFarePanel()
  }

  const handleSelectDropoff = item => {
    setDropoffText(item.label)
    setDropoffLoc({ lat: item.lat, lng: item.lng })
    setDropoffSuggestions([])
    setDropoffLocked(true)
    resetFarePanel()
  }

  // ===== 中途停靠點：新增 / 移除 / 修改 =====
  const addStop = () => {
    setStops(prev => [...prev, { text: '', loc: null, suggestions: [], locked: false }])
    resetFarePanel()
  }

  const removeStop = index => {
    setStops(prev => prev.filter((_, i) => i !== index))
    resetFarePanel()
  }

  const updateStopText = (index, text) => {
    setStops(prev => {
      const copy = [...prev]
      if (!copy[index]) return prev
      copy[index] = { ...copy[index], text, loc: null, locked: false, suggestions: [] }
      return copy
    })
    resetFarePanel()

    const trimmed = text.trim()
    if (trimmed.length < 2) return

    ;(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`)
        if (!res.ok) return
        const data = await res.json()
        setStops(prev => {
          const copy = [...prev]
          if (!copy[index]) return prev
          if (copy[index].locked) return prev
          if (copy[index].text !== text) return prev
          copy[index] = { ...copy[index], suggestions: Array.isArray(data) ? data : [] }
          return copy
        })
      } catch {
        // ignore
      }
    })()
  }

  const handleSelectStopSuggestion = (index, item) => {
    setStops(prev => {
      const copy = [...prev]
      if (!copy[index]) return prev
      copy[index] = {
        ...copy[index],
        text: item.label,
        loc: { lat: item.lat, lng: item.lng },
        suggestions: [],
        locked: true,
      }
      return copy
    })
    resetFarePanel()
  }

  const resetFarePanel = () => {
    setFareOptions(null)
    setFareError('')
    setLastDistanceKm(null)
    setSelectedVehicle(null)
    setResolvedStops([])
  }

  // ===== 第一步：只算距離 + 顯示可選車種 =====
  const handleCheckPrice = async () => {
    if (!pickupText.trim() || !dropoffText.trim()) {
      alert(t(lang, 'needPickupDropoff'))
      return
    }
    if (!currentUser || currentUser.role !== 'passenger') {
      alert(t(lang, 'needLoginPassenger'))
      return
    }

    resetFarePanel()

    try {
      let pLoc = pickupLoc
      let dLoc = dropoffLoc

      if (!pLoc) {
        pLoc = await geocodeOnce(pickupText)
        setPickupLoc(pLoc)
      }
      if (!dLoc) {
        dLoc = await geocodeOnce(dropoffText)
        setDropoffLoc(dLoc)
      }

      if (!pLoc || !dLoc) {
        setFareError(t(lang, 'cannotFindPickupOrDropoff'))
        return
      }

      // 停靠點解析
      const resolved = []
      for (const s of stops) {
        const label = (s.text || '').trim()
        if (!label) continue

        let loc = s.loc
        if (!loc) loc = await geocodeOnce(label)

        if (!loc) {
          setFareError(t(lang, 'cannotFindStop'))
          return
        }
        resolved.push({ label, lat: loc.lat, lng: loc.lng })
      }
      setResolvedStops(resolved)

      // OSRM 多點路徑：起點 → 停靠點 → 終點
      const points = [
        { lat: pLoc.lat, lng: pLoc.lng },
        ...resolved.map(s => ({ lat: s.lat, lng: s.lng })),
        { lat: dLoc.lat, lng: dLoc.lng },
      ]

      let totalDist = 0
      try {
        const dKm = await osrmRouteDistanceKm(points)
        totalDist = dKm
      } catch (e) {
        console.warn('OSRM failed, fallback to haversine', e)
        for (let i = 0; i < points.length - 1; i++) {
          totalDist += distanceKm(points[i], points[i + 1])
        }
      }

      const distRounded = Math.round(totalDist * 10) / 10
      setLastDistanceKm(distRounded)

      if (totalDist > 80) {
        setFareError(t(lang, 'tripTooFar'))
        return
      }

      // USD 價格：示意公式
      const baseFare = 2.5
      const perKm = 1.5
      const rawFare = baseFare + perKm * totalDist

      const estYellow = +(rawFare * 1.0).toFixed(2)
      const estGreen = +(rawFare * 0.9).toFixed(2)
      const estFhv = +(rawFare * 1.3).toFixed(2)

      setFareOptions([
        { type: 'YELLOW', label: t(lang, 'carTypeYellow'), price: estYellow },
        { type: 'GREEN', label: t(lang, 'carTypeGreen'), price: estGreen },
        { type: 'FHV', label: t(lang, 'carTypeFhv'), price: estFhv },
      ])
    } catch (e) {
      console.error(e)
      setFareError(t(lang, 'networkError'))
    }
  }

  // ===== 第二步：點某車種 → 建立訂單 =====
  const handleChooseFare = async option => {
    if (!fareOptions || lastDistanceKm == null) {
      alert(t(lang, 'needPriceFirst'))
      return
    }
    if (!pickupLoc || !dropoffLoc) {
      alert(t(lang, 'needCoordsPrepared'))
      return
    }
    if (!currentUser || currentUser.role !== 'passenger') {
      alert(t(lang, 'needLoginPassenger'))
      return
    }

    setSelectedVehicle(option.type)

    await createOrder(
      pickupText.trim(),
      dropoffText.trim(),
      pickupLoc,
      dropoffLoc,
      {
        distanceKm: lastDistanceKm,
        vehicleType: option.type,
        price: option.price,
      },
      resolvedStops
    )

    // reset
    setPickupText('')
    setPickupLoc(null)
    setPickupSuggestions([])
    setPickupLocked(false)

    setDropoffText('')
    setDropoffLoc(null)
    setDropoffSuggestions([])
    setDropoffLocked(false)

    setStops([])
    resetFarePanel()
  }

  return (
    <section className="map-section">
      <div className="map-wrapper">
        <MapView
          lang={lang}
          drivers={drivers}
          orders={ordersForMap}
          mode="passenger"
          currentDriverId={null}
          simulateVehicles={simulateVehicles}
        />
      </div>

      <aside className="side-panel">
        <div className="panel-inner">
          <h1 className="panel-title">{t(lang, 'passengerMode')}</h1>

          <div className="field-label">{t(lang, 'currentPassengerLabel')}</div>
          <div className="current-driver-box">
            {currentUser?.username || t(lang, 'notLoggedIn')}
          </div>

          {/* 上車地點 */}
          <div className="field-label" style={{ marginTop: 24 }}>
            {t(lang, 'pickupPlaceholder')}
          </div>
          <div className="autocomplete-wrapper">
            <input
              className="text-input"
              type="text"
              placeholder={t(lang, 'pickupPlaceholder')}
              value={pickupText}
              onChange={e => {
                setPickupText(e.target.value)
                setPickupLoc(null)
                setPickupLocked(false)
                setPickupSuggestions([])
                resetFarePanel()
              }}
            />
            {pickupSuggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {pickupSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="autocomplete-item"
                    onClick={() => handleSelectPickup(item)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 中途停靠點 */}
          {stops.map((stop, index) => (
            <div key={index} style={{ marginTop: 12 }}>
              <div className="field-label">
                {t(lang, 'stopLabel')} {index + 1}
              </div>
              <div className="autocomplete-wrapper">
                <input
                  className="text-input"
                  type="text"
                  placeholder={t(lang, 'stopPlaceholder')}
                  value={stop.text}
                  onChange={e => updateStopText(index, e.target.value)}
                />
                {stop.suggestions && stop.suggestions.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {stop.suggestions.map((item, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        className="autocomplete-item"
                        onClick={() => handleSelectStopSuggestion(index, item)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="ghost-btn"
                style={{ marginTop: 4 }}
                onClick={() => removeStop(index)}
              >
                {t(lang, 'removeStop')}
              </button>
            </div>
          ))}

          <button
            type="button"
            className="ghost-btn"
            style={{ marginTop: 12 }}
            onClick={addStop}
          >
            {t(lang, 'addStop')}
          </button>

          {/* 目的地 */}
          <div className="field-label" style={{ marginTop: 16 }}>
            {t(lang, 'dropoffPlaceholder')}
          </div>
          <div className="autocomplete-wrapper">
            <input
              className="text-input"
              type="text"
              placeholder={t(lang, 'dropoffPlaceholder')}
              value={dropoffText}
              onChange={e => {
                setDropoffText(e.target.value)
                setDropoffLoc(null)
                setDropoffLocked(false)
                setDropoffSuggestions([])
                resetFarePanel()
              }}
            />
            {dropoffSuggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {dropoffSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="autocomplete-item"
                    onClick={() => handleSelectDropoff(item)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 查看價格與車輛 */}
          <button
            type="button"
            className="primary-btn"
            style={{ marginTop: 24, width: '100%' }}
            onClick={handleCheckPrice}
            disabled={loading}
          >
            {t(lang, 'viewPriceAndCars')}
          </button>

          {fareError && (
            <div className="error-box" style={{ marginTop: 16 }}>
              {fareError}
            </div>
          )}

          {fareOptions && !fareError && (
            <div className="fare-panel" style={{ marginTop: 16 }}>
              {lastDistanceKm != null && (
                <div className="field-label" style={{ marginBottom: 8 }}>
                  {t(lang, 'estimatedDistancePrefix')} {lastDistanceKm}{' '}
                  {t(lang, 'distanceKmUnit')}
                </div>
              )}
              <ul className="fare-list">
                {fareOptions.map(opt => (
                  <li key={opt.type} className="fare-item">
                    <button
                      type="button"
                      className={
                        selectedVehicle === opt.type
                          ? 'fare-item-btn selected'
                          : 'fare-item-btn'
                      }
                      onClick={() => handleChooseFare(opt)}
                      disabled={loading}
                    >
                      <span>{opt.label}</span>
                      <span className="fare-price">≈ ${opt.price.toFixed(2)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 我的訂單 */}
          <section className="orders-block" style={{ marginTop: 32 }}>
            <div className="orders-header">
              <h3>{t(lang, 'ordersTitlePassenger')}</h3>
              <button
                className="ghost-btn"
                type="button"
                onClick={refresh}
                disabled={loading}
              >
                {t(lang, 'refresh')}
              </button>
            </div>

            <OrderList orders={orders} drivers={drivers} />

            {loading && (
              <div className="auth-hint" style={{ marginTop: 8 }}>
                {t(lang, 'loading')}
              </div>
            )}
            {error && <div className="error-box">{error}</div>}
          </section>
        </div>
      </aside>
    </section>
  )
}
