// src/views/RiderView.jsx
import { useEffect, useState } from 'react'
import MapView from '../components/MapView.jsx'
import OrderList from '../components/OrderList.jsx'
import { t } from '../i18n'

export default function RiderView({
  lang,
  drivers,
  orders,               // 目前乘客自己的訂單（App.jsx 已經有過濾）
  ordersWithLocations,  // 有座標的版本，拿來畫地圖
  loading,
  error,
  createOrder,          // (pickup, dropoff, pickupLoc, dropoffLoc, pricing)
  refresh,
  currentUser,
}) {
  // 文字輸入
  const [pickupText, setPickupText] = useState('')
  const [dropoffText, setDropoffText] = useState('')

  // geocode 建議 & 選中的座標
  const [pickupSuggestions, setPickupSuggestions] = useState([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState([])
  const [pickupLoc, setPickupLoc] = useState(null)     // {lat, lng}
  const [dropoffLoc, setDropoffLoc] = useState(null)   // {lat, lng}

  // 選單「鎖定」旗標（已選好，不再查詢）
  const [pickupLocked, setPickupLocked] = useState(false)
  const [dropoffLocked, setDropoffLocked] = useState(false)

  // 預估價格結果
  const [fareOptions, setFareOptions] = useState(null) // [{type,label,price}]
  const [fareError, setFareError] = useState('')
  const [lastDistanceKm, setLastDistanceKm] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState(null)

  // ✅ 乘客端地圖：只顯示「已派給這個乘客的訂單」所屬的司機
  const assignedDriverIds = new Set(
    (ordersWithLocations || [])
      .filter(o => o.status === 'assigned' && o.driverId != null)
      .map(o => o.driverId)
  )
  const visibleDrivers = drivers.filter(d => assignedDriverIds.has(d.id))

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

  // ===== 小工具：算兩點距離（km，haversine） =====
  function distanceKm(a, b) {
    const toRad = d => (d * Math.PI) / 180
    const R = 6371 // 地球半徑 km
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

  // ===== 上車地點：打字 → call /api/geocode 拿建議 =====
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

  // ===== 目的地：打字 → call /api/geocode 拿建議 =====
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

  // 使用者點選一個上車建議
  const handleSelectPickup = item => {
    setPickupText(item.label)
    setPickupLoc({ lat: item.lat, lng: item.lng })
    setPickupSuggestions([])
    setPickupLocked(true)

    setFareOptions(null)
    setFareError('')
    setLastDistanceKm(null)
    setSelectedVehicle(null)
  }

  // 使用者點選一個目的地建議
  const handleSelectDropoff = item => {
    setDropoffText(item.label)
    setDropoffLoc({ lat: item.lat, lng: item.lng })
    setDropoffSuggestions([])
    setDropoffLocked(true)

    setFareOptions(null)
    setFareError('')
    setLastDistanceKm(null)
    setSelectedVehicle(null)
  }

  // ===== 第一步：只算距離 + 顯示可選車種，不下單 =====
  const handleCheckPrice = async () => {
    if (!pickupText.trim() || !dropoffText.trim()) {
      alert('請輸入上車地點與目的地')
      return
    }
    if (!currentUser || currentUser.role !== 'passenger') {
      alert('請先以乘客身分登入')
      return
    }

    setFareError('')
    setFareOptions(null)
    setLastDistanceKm(null)
    setSelectedVehicle(null)

    try {
      // 1) 取得精準座標（沒選清單也會自動 geocode）
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
        setFareError('找不到其中一個地點，請確認地址是否正確。')
        return
      }

      const dist = distanceKm(pLoc, dLoc)
      const distRounded = Math.round(dist * 10) / 10
      setLastDistanceKm(distRounded)

      // 粗略判斷：太遠 / 可能跨洋就算「無法成立」
      if (dist > 80) {
        setFareError('此行程無法成立，請重新輸入地點')
        return
      }

      // 粗略費率
      const baseYellow = 70
      const perKmYellow = 25
      const baseGreen = 60
      const perKmGreen = 22
      const baseFhv = 90
      const perKmFhv = 30

      const estYellow = Math.round(baseYellow + perKmYellow * dist)
      const estGreen = Math.round(baseGreen + perKmGreen * dist)
      const estFhv = Math.round(baseFhv + perKmFhv * dist)

      // ✅ type 一律用大寫，方便跟司機 carType 比對
      setFareOptions([
        { type: 'YELLOW', label: 'Yellow 計程車',        price: estYellow },
        { type: 'GREEN',  label: 'Green 計程車',         price: estGreen },
        { type: 'FHV',    label: 'FHV（多元計程車）',    price: estFhv },
      ])
    } catch (e) {
      console.error(e)
      setFareError('目前無法連線到伺服器，請稍後再試。')
    }
  }

  // ===== 第二步：點某一種車種 → 真正建立訂單 =====
  const handleChooseFare = async option => {
    if (!fareOptions || lastDistanceKm == null) {
      alert('請先按「查看價格與車輛」')
      return
    }
    if (!pickupLoc || !dropoffLoc) {
      alert('座標尚未準備好，請再按一次「查看價格與車輛」')
      return
    }
    if (!currentUser || currentUser.role !== 'passenger') {
      alert('請先以乘客身分登入')
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
        vehicleType: option.type,   // 已是大寫 YELLOW/GREEN/FHV
        estimatedFare: option.price,
      }
    )

    // 下單後清掉表單 & 價格面板
    setPickupText('')
    setPickupLoc(null)
    setPickupSuggestions([])
    setPickupLocked(false)

    setDropoffText('')
    setDropoffLoc(null)
    setDropoffSuggestions([])
    setDropoffLocked(false)

    setFareOptions(null)
    setLastDistanceKm(null)
    setFareError('')
    setSelectedVehicle(null)
  }

  return (
    <section className="map-section">
      {/* 左邊地圖 */}
      <div className="map-wrapper">
        <MapView
          drivers={visibleDrivers}          // ✅ 只顯示已派給自己的司機
          orders={ordersWithLocations}
          mode="passenger"
          currentDriverId={null}
        />
      </div>

      {/* 右邊操作面板 */}
      <aside className="side-panel">
        <div className="panel-inner">
          <h1 className="panel-title">
            {t(lang, 'passengerMode')}
          </h1>

          <div className="field-label">目前乘客：</div>
          <div className="current-driver-box">
            {currentUser?.username || '尚未登入'}
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
                setFareOptions(null)
                setFareError('')
                setLastDistanceKm(null)
                setSelectedVehicle(null)
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
                setFareOptions(null)
                setFareError('')
                setLastDistanceKm(null)
                setSelectedVehicle(null)
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
            查看價格與車輛
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
                  預估距離：約 {lastDistanceKm} 公里
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
                      <span className="fare-price">
                        約 NT$ {opt.price}
                      </span>
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
                更新中…
              </div>
            )}
            {error && <div className="error-box">{error}</div>}
          </section>
        </div>
      </aside>
    </section>
  )
}
