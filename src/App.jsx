// src/App.jsx
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { languages, t } from './i18n'
import RiderView from './views/RiderView.jsx'
import DriverView from './views/DriverView.jsx'
import AuthPage from './views/AuthPage.jsx'
import LandingPage from './LandingPage.jsx'
import { resolveLocation } from './locationResolver.js'
import DriverPage from './DriverPage.jsx'

// 從網址判斷一開始顯示乘客端 / 司機端 / 首頁
function getInitialModeFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const role = params.get('role')
  if (role === 'driver') return 'driver'
  if (role === 'passenger') return 'rider'
  return 'rider'
}

function getInitialShowLandingFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const role = params.get('role')
  return role ? false : true
}

export default function App() {
  const [lang, setLang] = useState('zh')
  const [mode, setMode] = useState(getInitialModeFromUrl)
  const [showLanding, setShowLanding] = useState(getInitialShowLandingFromUrl)
  const [showAuth, setShowAuth] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)

  // currentUser: { id, username, role, carType }
  const [currentUser, setCurrentUser] = useState(null)

  // 司機 / 訂單
  const [drivers, setDrivers] = useState([]) // [{id,name,lat,lng,status,carType}]
  const [orders, setOrders] = useState([])   // [{id,pickup,...}]

  const [currentDriverId, setCurrentDriverId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [simulateVehicles, setSimulateVehicles] = useState(true)

  // ===== 從 API 抓資料 =====
  const fetchAll = async () => {
    try {
      setError('')
      const [dRes, oRes] = await Promise.all([
        fetch('/api/drivers'),
        fetch('/api/orders'),
      ])
      if (!dRes.ok || !oRes.ok) throw new Error('API error')

      const dData = await dRes.json()
      const oData = await oRes.json()
      setDrivers(dData)
      setOrders(oData)
    } catch (err) {
      console.error(err)
      setError(t(lang, 'cannotConnectServer'))
    }
  }

  useEffect(() => {
    fetchAll()
    const timer = setInterval(fetchAll, 3000)
    return () => clearInterval(timer)
  }, [])

  // ===== 訂單 + 座標 =====
  const ordersWithLocations = useMemo(
    () =>
      orders.map(o => {
        const pickupLocation =
          typeof o.pickupLat === 'number' &&
          typeof o.pickupLng === 'number'
            ? { lat: o.pickupLat, lng: o.pickupLng }
            : resolveLocation(o.pickup)

        const dropoffLocation =
          typeof o.dropoffLat === 'number' &&
          typeof o.dropoffLng === 'number'
            ? { lat: o.dropoffLat, lng: o.dropoffLng }
            : resolveLocation(o.dropoff)

        return {
          ...o,
          pickupLocation,
          dropoffLocation,
        }
      }),
    [orders]
  )

  // 目前登入乘客自己的訂單（不含座標）
  const passengerOrders = useMemo(() => {
    if (!currentUser || currentUser.role !== 'passenger') return []
    return orders.filter(o => o.customer === currentUser.username)
  }, [orders, currentUser])

  // 目前登入乘客自己的訂單 + 座標
  const passengerOrdersWithLoc = useMemo(() => {
    if (!currentUser || currentUser.role !== 'passenger') return []
    return ordersWithLocations.filter(
      o => o.customer === currentUser.username
    )
  }, [ordersWithLocations, currentUser])

  // 司機端直接用全部訂單＋座標
  const driverOrdersWithLoc = ordersWithLocations

  // ===== 乘客下單 =====
  const createOrder = async (
    pickup,
    dropoff,
    pickupLoc,
    dropoffLoc,
    fareInfo,
    stops = []
  ) => {
    if (!pickup.trim() || !dropoff.trim()) return
    if (!currentUser || currentUser.role !== 'passenger') {
      alert(t(lang, 'needLoginPassenger'))
      return
    }

    const safeStops = Array.isArray(stops) ? stops : []

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup,
          dropoff,
          customer: currentUser.username,
          pickupLat: pickupLoc?.lat ?? null,
          pickupLng: pickupLoc?.lng ?? null,
          dropoffLat: dropoffLoc?.lat ?? null,
          dropoffLng: dropoffLoc?.lng ?? null,
          vehicleType: fareInfo?.vehicleType || null,
          distanceKm: fareInfo?.distanceKm ?? null,
          estimatedFare: fareInfo?.price ?? null,
          estimatedPrice: fareInfo?.price ?? null,
          stops: safeStops,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const order = await res.json()
      setOrders(prev => [...prev, order])
    } catch (err) {
      console.error(err)
      setError(t(lang, 'createOrderFailed'))
    } finally {
      setLoading(false)
    }
  }

  // ===== 司機接單 =====
  const acceptOrder = async orderId => {
    if (!currentUser || currentUser.role !== 'driver') {
      alert(t(lang, 'needLoginDriver'))
      return
    }
    if (!currentDriverId) {
      alert(t(lang, 'driverVehicleNotAttached'))
      return
    }

    const driverNameLabel = currentUser.username

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${orderId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: currentDriverId,
          driverName: driverNameLabel,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const updatedOrder = await res.json()
      setOrders(prev =>
        prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o))
      )
      setDrivers(prev =>
        prev.map(d =>
          d.id === updatedOrder.driverId ? { ...d, status: 'busy' } : d
        )
      )
    } catch (err) {
      console.error(err)
      setError(t(lang, 'acceptOrderFailed'))
    } finally {
      setLoading(false)
    }
  }

  // ===== 司機登入後建立自己的車 =====
  const attachDriverForUser = async user => {
    if (!user || user.role !== 'driver') return

    try {
      const res = await fetch('/api/driver-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.username,
          carType: user.carType || null,
        }),
      })
      if (!res.ok) throw new Error('driver-login failed')
      const driver = await res.json()
      setCurrentDriverId(driver.id)
      setDrivers(prev => {
        const exists = prev.some(d => d.id === driver.id)
        return exists ? prev : [...prev, driver]
      })
    } catch (err) {
      console.error(err)
      setError(t(lang, 'attachDriverFailed'))
    }
  }

  // ===== 司機端：只移動「自己那台車」 =====
  useEffect(() => {
    if (!simulateVehicles) return
    if (!currentUser || currentUser.role !== 'driver') return
    if (!currentDriverId) return

    const SPEED = 0.01
    const EPSILON = 0.002

    const timer = setInterval(() => {
      setDrivers(prevDrivers => {
        const idx = prevDrivers.findIndex(d => d.id === currentDriverId)
        if (idx === -1) return prevDrivers

        const myDriver = prevDrivers[idx]

        const myOrder = driverOrdersWithLoc.find(
          o => o.status === 'assigned' && o.driverId === currentDriverId
        )
        if (!myOrder) return prevDrivers

        const { pickupLocation, dropoffLocation } = myOrder
        if (!pickupLocation && !dropoffLocation) return prevDrivers

        let lat = myDriver.lat
        let lng = myDriver.lng
        let targetLat
        let targetLng

        if (pickupLocation && dropoffLocation) {
          const distToPickup = Math.hypot(
            pickupLocation.lat - lat,
            pickupLocation.lng - lng
          )

          if (distToPickup > EPSILON) {
            targetLat = pickupLocation.lat
            targetLng = pickupLocation.lng
          } else {
            targetLat = dropoffLocation.lat
            targetLng = dropoffLocation.lng
          }
        } else if (pickupLocation) {
          targetLat = pickupLocation.lat
          targetLng = pickupLocation.lng
        } else {
          targetLat = dropoffLocation.lat
          targetLng = dropoffLocation.lng
        }

        const dx = targetLat - lat
        const dy = targetLng - lng
        const dist = Math.hypot(dx, dy)

        if (dist > 0) {
          const step = Math.min(SPEED, dist)
          lat += (dx / dist) * step
          lng += (dy / dist) * step
        }

        const newDrivers = [...prevDrivers]
        newDrivers[idx] = { ...myDriver, lat, lng }

        fetch(`/api/drivers/${currentDriverId}/location`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        }).catch(() => {})

        return newDrivers
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [simulateVehicles, currentUser, currentDriverId, driverOrdersWithLoc])

  // ===== Auth：註冊 / 登入（呼叫後端）=====

  const registerUser = async ({ username, password, role, carType }) => {
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          role,
          carType: role === 'driver' ? carType : null,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // 後端 errorCode -> 對應多語系 key
        let key = null
        switch (data.errorCode) {
          case 'USERNAME_TAKEN':
            key = 'errorUsernameTaken'
            break
          case 'MISSING_FIELDS':
            key = 'errorMissingFields'
            break
          default:
            key = 'registerFailed'
        }
        return {
          ok: false,
          message: t(lang, key),
        }
      }

      const user = data
      setCurrentUser(user)

      if (user.role === 'driver') {
        setMode('driver')
        attachDriverForUser(user)
      } else {
        setMode('rider')
      }

      setShowAuth(false)
      setShowLanding(false)
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false, message: t(lang, 'networkError') }
    }
  }

  const loginUser = async ({ username, password }) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // 注意：後端是 NO_SUCH_ACCOUNT，不是 USER_NOT_FOUND
        let key = null
        switch (data.errorCode) {
          case 'MISSING_FIELDS':
            key = 'errorMissingFields'
            break
          case 'NO_SUCH_ACCOUNT':
            key = 'errorUserNotFound'
            break
          case 'WRONG_PASSWORD':
            key = 'errorWrongPassword'
            break
          default:
            key = 'loginFailed'
        }
        return {
          ok: false,
          message: t(lang, key),
        }
      }

      const user = data
      setCurrentUser(user)

      if (user.role === 'driver') {
        setMode('driver')
        attachDriverForUser(user)
      } else {
        setMode('rider')
      }

      setShowAuth(false)
      setShowLanding(false)
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false, message: t(lang, 'networkError') }
    }
  }

  // ===== 共用 props =====
  const baseProps = {
    lang,
    drivers,
    loading,
    error,
    currentDriverId,
    setCurrentDriverId,
    createOrder,
    acceptOrder,
    refresh: fetchAll,
    currentUser,
  }

  // ===== 首頁 / Auth =====
  if (showLanding) {
    return (
      <LandingPage
        lang={lang}
        onChangeLang={setLang}
        onPassengerClick={() => {
          setMode('rider')
          setShowLanding(false)
        }}
        onDriverClick={() => {
          setMode('driver')
          setShowLanding(false)
        }}
        onAuthClick={() => {
          setShowAuth(true)
          setShowLanding(false)
        }}
      />
    )
  }

  if (showHeatmap) {
    return (
      <DriverPage 
        onBack={() => setShowHeatmap(false)} 
      />
    )
  }

  if (showAuth) {
    return (
      <div className="app-root">
        <header className="top-bar">
          <div className="top-bar-left">
            <span className="app-title">{t(lang, 'appTitle')}</span>
          </div>

          <div className="top-bar-center" />

          <div className="top-bar-right">
            {currentUser && (
              <span className="header-user-label">
                {currentUser.role === 'driver'
                  ? `${t(lang, 'driverPrefix')}${currentUser.username}`
                  : `${t(lang, 'passengerPrefix')}${currentUser.username}`}
              </span>
            )}

            <button
              type="button"
              className="header-back-btn"
              onClick={() => {
                window.location.href = '/'
              }}
            >
              {t(lang, 'backHome')}
            </button>

            <div className="lang-switch">
              <span className="lang-label">{t(lang, 'language')}：</span>
              <select value={lang} onChange={e => setLang(e.target.value)}>
                <option value="zh">ZH</option>
                <option value="en">EN</option>
                <option value="ko">KO</option>
                <option value="ja">JA</option>
              </select>
            </div>

            <button
              type="button"
              className="sim-toggle-btn"
              onClick={() => setSimulateVehicles(v => !v)}
            >
              {simulateVehicles
                ? t(lang, 'stopVehicleSim')
                : t(lang, 'startVehicleSim')}
            </button>
          </div>
        </header>

        <main className="auth-main">
          <AuthPage
            lang={lang}
            onBack={() => {
              setShowAuth(false)
              setShowLanding(true)
            }}
            onRegister={registerUser}
            onLogin={loginUser}
          />
        </main>
      </div>
    )
  }

  // ===== 主畫面 =====
  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-title">{t(lang, 'appTitle')}</div>

        <div className="app-header-controls">
          {currentUser && (
            <span className="header-user-label">
              {currentUser.role === 'driver'
                ? `${t(lang, 'driverPrefix')}${currentUser.username}`
                : `${t(lang, 'passengerPrefix')}${currentUser.username}`}
            </span>
          )}

          {currentUser && currentUser.role === 'driver' && (
            <button
              className="ghost-btn"
              style={{ marginLeft: 8, borderColor: '#ff9800', color: '#ff9800' }}
              onClick={() => setShowHeatmap(true)}
            >
              熱點地圖
            </button>
          )}

          <button
            className="header-back-btn"
            type="button"
            onClick={() => {
              window.location.href = '/'
            }}
            style={{ marginLeft: 8 }}
          >
            {t(lang, 'backHome')}
          </button>

          <div className="lang-select" style={{ marginLeft: 16 }}>
            <span className="lang-label">{t(lang, 'language')}：</span>
            <select value={lang} onChange={e => setLang(e.target.value)}>
              {languages.map(code => (
                <option key={code} value={code}>
                  {code.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <button
            className="ghost-btn"
            type="button"
            onClick={() => setSimulateVehicles(v => !v)}
            style={{ marginLeft: 8 }}
          >
            {simulateVehicles
              ? t(lang, 'stopVehicleSim')
              : t(lang, 'startVehicleSim')}
          </button>
        </div>
      </header>

      <main className="app-main">
        {mode === 'rider' ? (
          <RiderView
            {...baseProps}
            orders={passengerOrders}
            ordersWithLocations={passengerOrdersWithLoc}
          />
        ) : (
          <DriverView
            {...baseProps}
            orders={orders}
            ordersWithLocations={driverOrdersWithLoc}
          />
        )}
      </main>
    </div>
  )
}
