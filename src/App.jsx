// src/App.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
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

// ✅ 從網址判斷是否要直接開 AuthPage
function getInitialShowAuthFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const auth = params.get('auth')
  if (!auth) return false
  return auth === '1' || auth.toLowerCase() === 'true' || auth.toLowerCase() === 'yes'
}

// ✅ 小工具：把 role/auth 同步到網址（避免刷新跑掉）
function setUrlParams({ role, auth }) {
  try {
    const url = new URL(window.location.href)
    if (role === 'driver') url.searchParams.set('role', 'driver')
    else if (role === 'passenger') url.searchParams.set('role', 'passenger')
    else url.searchParams.delete('role')

    if (auth) url.searchParams.set('auth', '1')
    else url.searchParams.delete('auth')

    window.history.replaceState({}, '', url.toString())
  } catch {}
}

// ✅ 每位司機獨立的 local storage key（避免互相覆蓋）
function loadLocalDriverPos(driverId) {
  if (!driverId) return null
  try {
    const raw = localStorage.getItem(`driverLoc:${driverId}`)
    if (!raw) return null
    const obj = JSON.parse(raw)
    const lat = Number(obj?.lat)
    const lng = Number(obj?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  } catch {
    return null
  }
}

function normalizeDriverLatLng(d) {
  const lat = d?.lat
  const lng = d?.lng
  const nLat = typeof lat === 'number' ? lat : Number(lat)
  const nLng = typeof lng === 'number' ? lng : Number(lng)
  if (Number.isFinite(nLat) && Number.isFinite(nLng)) return { ...d, lat: nLat, lng: nLng }
  return { ...d }
}

// ====== 車輛模擬全域同步（跨分頁） ======
const SIM_GLOBAL_KEY = 'simGlobal:running'
function readGlobalSimRunning() {
  try {
    const v = localStorage.getItem(SIM_GLOBAL_KEY)
    if (v == null) return true
    return v === '1' || v === 'true' || v === 'yes'
  } catch {
    return true
  }
}
function writeGlobalSimRunning(v) {
  try {
    localStorage.setItem(SIM_GLOBAL_KEY, v ? '1' : '0')
  } catch {}
}

// ====== 已完成訂單：本機覆蓋（避免 polling 洗回去）=====
const COMPLETED_META_KEY = 'completedOrdersMeta' // { [orderId]: { completedAtISO } }
function loadCompletedMeta() {
  try {
    const raw = localStorage.getItem(COMPLETED_META_KEY)
    if (!raw) return {}
    const obj = JSON.parse(raw)
    return obj && typeof obj === 'object' ? obj : {}
  } catch {
    return {}
  }
}
function saveCompletedMeta(meta) {
  try {
    localStorage.setItem(COMPLETED_META_KEY, JSON.stringify(meta || {}))
  } catch {}
}

export default function App() {
  const [lang, setLang] = useState('zh')
  const [mode, setMode] = useState(getInitialModeFromUrl)
  const [showLanding, setShowLanding] = useState(getInitialShowLandingFromUrl)
  const [showAuth, setShowAuth] = useState(getInitialShowAuthFromUrl)
  const [showHeatmap, setShowHeatmap] = useState(false)

  const [authReturnTo, setAuthReturnTo] = useState('landing')

  const [riderDraft, setRiderDraft] = useState({
    pickupText: '',
    dropoffText: '',
    pickupLoc: null,
    dropoffLoc: null,
    stops: [],
    composerLocked: false,
    composeMode: false,
    selectedOrderId: null,
  })

  const [currentUser, setCurrentUser] = useState(null)

  const [drivers, setDrivers] = useState([])
  const [orders, setOrders] = useState([])

  const [currentDriverId, setCurrentDriverId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [simulateVehicles, setSimulateVehicles] = useState(() => readGlobalSimRunning())
  const [driverHotspotPosById, setDriverHotspotPosById] = useState({})

  const completedMetaRef = useRef(loadCompletedMeta())

  const openAuth = (returnTo = 'landing', targetRole = null) => {
    setAuthReturnTo(returnTo)
    setShowAuth(true)
    setShowLanding(false)

    setUrlParams({
      role: targetRole === 'driver' ? 'driver' : targetRole === 'passenger' ? 'passenger' : null,
      auth: true,
    })
  }

  const closeAuth = (forceReturnTo = null) => {
    const dest = forceReturnTo || authReturnTo

    setShowAuth(false)
    setShowLanding(dest === 'landing')

    if (dest === 'driver') setMode('driver')
    if (dest === 'rider') setMode('rider')

    if (dest === 'driver') setUrlParams({ role: 'driver', auth: false })
    else if (dest === 'rider') setUrlParams({ role: 'passenger', auth: false })
    else setUrlParams({ role: null, auth: false })
  }

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search)

      const role = params.get('role')
      if (role === 'driver') {
        setMode('driver')
        setShowLanding(false)
      } else if (role === 'passenger') {
        setMode('rider')
        setShowLanding(false)
      }

      const auth = params.get('auth')
      const shouldAuth =
        auth === '1' ||
        (typeof auth === 'string' && (auth.toLowerCase() === 'true' || auth.toLowerCase() === 'yes'))

      if (shouldAuth) {
        setShowAuth(true)
        setShowLanding(false)
      } else {
        setShowAuth(false)
      }
    }

    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [])

  useEffect(() => {
    const onStorage = e => {
      if (e.key === SIM_GLOBAL_KEY) {
        setSimulateVehicles(readGlobalSimRunning())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggleSimulateVehicles = () => {
    setSimulateVehicles(prev => {
      const next = !prev
      writeGlobalSimRunning(next)
      return next
    })
  }

  // ✅ 完成訂單：本機覆蓋 + 回寫後端
  const markOrderCompleted = async orderId => {
    if (orderId == null) return
    const idNum = Number(orderId)
    if (!Number.isFinite(idNum)) return

    const nowISO = new Date().toISOString()

    const meta = { ...(completedMetaRef.current || {}) }
    if (!meta[idNum]) meta[idNum] = { completedAtISO: nowISO }
    completedMetaRef.current = meta
    saveCompletedMeta(meta)

    setOrders(prev =>
      prev.map(o => {
        if (Number(o?.id) !== idNum) return o
        return { ...o, status: 'completed', completedAt: o.completedAt || nowISO }
      })
    )

    try {
      await fetch(`/api/orders/${idNum}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({ status: 'completed' }),
        cache: 'no-store',
      })
    } catch (e) {
      console.warn('markOrderCompleted: backend update failed', e)
    }
  }

  // ✅ 拉資料：強制 no-store，避免 304 造成 res.ok=false
  const fetchAll = async () => {
    try {
      setError('')

      const [dRes, oRes] = await Promise.all([
        fetch('/api/drivers', { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } }),
        fetch('/api/orders', { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } }),
      ])

      if (!dRes.ok || !oRes.ok) {
        throw new Error(`API error: drivers=${dRes.status}, orders=${oRes.status}`)
      }

      const dDataRaw = await dRes.json()
      const oDataRaw = await oRes.json()

      let mergedDrivers = Array.isArray(dDataRaw) ? dDataRaw.map(normalizeDriverLatLng) : []

      if (currentDriverId) {
        const lp = loadLocalDriverPos(currentDriverId)
        if (lp) {
          mergedDrivers = mergedDrivers.map(d =>
            Number(d.id) === Number(currentDriverId) ? { ...d, lat: lp.lat, lng: lp.lng } : d
          )
        }
      }

      const meta = completedMetaRef.current || {}
      const mergedOrders = Array.isArray(oDataRaw)
        ? oDataRaw.map(o => {
            const idNum = Number(o?.id)
            if (!Number.isFinite(idNum)) return o
            if (!meta[idNum]) return o
            return {
              ...o,
              status: 'completed',
              completedAt: o.completedAt || meta[idNum]?.completedAtISO || new Date().toISOString(),
            }
          })
        : []

      setDrivers(mergedDrivers)
      setOrders(mergedOrders)
    } catch (err) {
      console.error(err)
      setError(t(lang, 'cannotConnectServer'))
    }
  }

  useEffect(() => {
    fetchAll()
    const timer = setInterval(fetchAll, 3000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ordersWithLocations = useMemo(
    () =>
      orders.map(o => {
        const pickupLocation =
          typeof o.pickupLat === 'number' && typeof o.pickupLng === 'number'
            ? { lat: o.pickupLat, lng: o.pickupLng }
            : resolveLocation(o.pickup)

        const dropoffLocation =
          typeof o.dropoffLat === 'number' && typeof o.dropoffLng === 'number'
            ? { lat: o.dropoffLat, lng: o.dropoffLng }
            : resolveLocation(o.dropoff)

        const stops = Array.isArray(o.stops)
          ? o.stops
              .map(s => {
                const lat = Number(s?.lat)
                const lng = Number(s?.lng)
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ...s }
                return { ...s, lat, lng }
              })
              .filter(Boolean)
          : []

        return { ...o, pickupLocation, dropoffLocation, stops }
      }),
    [orders]
  )

  const passengerOrders = useMemo(() => {
    if (!currentUser || currentUser.role !== 'passenger') return []
    return orders.filter(o => o.customer === currentUser.username)
  }, [orders, currentUser])

  const passengerOrdersWithLoc = useMemo(() => {
    if (!currentUser || currentUser.role !== 'passenger') return []
    return ordersWithLocations.filter(o => o.customer === currentUser.username)
  }, [ordersWithLocations, currentUser])

  const driverOrdersWithLoc = ordersWithLocations

  const createOrder = async (pickup, dropoff, pickupLoc, dropoffLoc, fareInfo, stops = []) => {
    if (!pickup.trim() || !dropoff.trim()) return

    if (!currentUser || currentUser.role !== 'passenger') {
      openAuth('rider', 'passenger')
      return
    }

    const safeStops = Array.isArray(stops) ? stops : []

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        cache: 'no-store',
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

  const acceptOrder = async orderId => {
    if (!currentUser || currentUser.role !== 'driver') {
      openAuth('driver', 'driver')
      return
    }
    if (!currentDriverId) {
      alert(t(lang, 'needBindDriverVehicle') || '請先綁定司機車輛')
      return
    }

    const driverNameLabel = currentUser.username

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${orderId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        cache: 'no-store',
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

      setOrders(prev => prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o)))
      setDrivers(prev =>
        prev.map(d => (Number(d.id) === Number(updatedOrder.driverId) ? { ...d, status: 'busy' } : d))
      )
    } catch (err) {
      console.error(err)
      setError(t(lang, 'acceptOrderFailed'))
    } finally {
      setLoading(false)
    }
  }

  const attachDriverForUser = async user => {
    if (!user || user.role !== 'driver') return

    try {
      const res = await fetch('/api/driver-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        cache: 'no-store',
        body: JSON.stringify({
          name: user.username,
          carType: user.carType || null,
        }),
      })
      if (!res.ok) throw new Error('driver-login failed')
      const driverRaw = await res.json()
      const driver = normalizeDriverLatLng(driverRaw)

      setCurrentDriverId(driver.id)
      setDrivers(prev => {
        const exists = prev.some(d => Number(d.id) === Number(driver.id))
        return exists ? prev : [...prev, driver]
      })

      const lp = loadLocalDriverPos(driver.id)
      if (lp) {
        setDriverHotspotPosById(prev => ({ ...prev, [driver.id]: { lat: lp.lat, lng: lp.lng } }))
      } else if (typeof driver.lat === 'number' && typeof driver.lng === 'number') {
        setDriverHotspotPosById(prev => ({ ...prev, [driver.id]: { lat: driver.lat, lng: driver.lng } }))
      }
    } catch (err) {
      console.error(err)
      setError(t(lang, 'attachDriverFailed'))
    }
  }

  const handleDriverLocationChange = ({ id, lat, lng }) => {
    setDrivers(prev => prev.map(d => (Number(d.id) === Number(id) ? { ...d, lat, lng } : d)))
    setDriverHotspotPosById(prev => ({ ...prev, [id]: { lat, lng } }))
  }

  const registerUser = async ({ username, password, role, carType }) => {
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        cache: 'no-store',
        body: JSON.stringify({
          username,
          password,
          role,
          carType: role === 'driver' ? carType : null,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
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
        return { ok: false, message: t(lang, key) }
      }

      const user = data
      setCurrentUser(user)

      if (user.role === 'driver') {
        setMode('driver')
        setShowLanding(false)
        attachDriverForUser(user)
        setUrlParams({ role: 'driver', auth: false })
        closeAuth('driver')
      } else {
        setMode('rider')
        setShowLanding(false)
        setUrlParams({ role: 'passenger', auth: false })
        closeAuth('rider')
      }

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
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        cache: 'no-store',
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
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
        return { ok: false, message: t(lang, key) }
      }

      const user = data
      setCurrentUser(user)

      if (user.role === 'driver') {
        setMode('driver')
        setShowLanding(false)
        attachDriverForUser(user)
        setUrlParams({ role: 'driver', auth: false })
        closeAuth('driver')
      } else {
        setMode('rider')
        setShowLanding(false)
        setUrlParams({ role: 'passenger', auth: false })
        closeAuth('rider')
      }

      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false, message: t(lang, 'networkError') }
    }
  }

  const baseProps = {
    lang,
    loading,
    error,
    currentDriverId,
    setCurrentDriverId,
    createOrder,
    acceptOrder,
    refresh: fetchAll,
    currentUser,
    simulateVehicles,
    onOpenAuth: openAuth,
    onOrderCompleted: markOrderCompleted,
  }

  if (showLanding) {
    return (
      <LandingPage
        lang={lang}
        onChangeLang={setLang}
        onPassengerClick={draft => {
          if (draft) {
            setRiderDraft(prev => ({
              ...prev,
              ...draft,
              stops: Array.isArray(draft.stops) ? draft.stops : prev.stops,
            }))
          }
          setMode('rider')
          setShowLanding(false)
          setUrlParams({ role: 'passenger', auth: false })
        }}
        onDriverClick={() => {
          setMode('driver')
          setShowLanding(false)
          setUrlParams({ role: 'driver', auth: false })
        }}
        onAuthClick={() => openAuth('landing')}
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
            <button type="button" className="header-back-btn" onClick={() => closeAuth()}>
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

            <button type="button" className="sim-toggle-btn" onClick={toggleSimulateVehicles}>
              {simulateVehicles ? t(lang, 'stopVehicleSim') : t(lang, 'startVehicleSim')}
            </button>
          </div>
        </header>

        <main className="auth-main">
          <AuthPage lang={lang} onBack={() => closeAuth()} onRegister={registerUser} onLogin={loginUser} />
        </main>
      </div>
    )
  }

  const heatmapPosition = (currentDriverId && driverHotspotPosById[currentDriverId]) || null

  return (
    <div className="app-root" style={{ position: 'relative' }}>
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

          <button className="ghost-btn" type="button" onClick={toggleSimulateVehicles} style={{ marginLeft: 8 }}>
            {simulateVehicles ? t(lang, 'stopVehicleSim') : t(lang, 'startVehicleSim')}
          </button>
        </div>
      </header>

      <main className="app-main">
        {mode === 'rider' ? (
          <RiderView
            {...baseProps}
            drivers={drivers}
            orders={passengerOrders}
            ordersWithLocations={passengerOrdersWithLoc}
            initialDraft={riderDraft}
            onDraftChange={setRiderDraft}
          />
        ) : (
          <DriverView
            {...baseProps}
            drivers={drivers}
            orders={orders}
            ordersWithLocations={driverOrdersWithLoc}
            onDriverLocationChange={handleDriverLocationChange}
          />
        )}
      </main>

      {showHeatmap && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 9999, background: '#000000' }}>
          <DriverPage onBack={() => setShowHeatmap(false)} driverId={currentDriverId} driverPosition={heatmapPosition} />
        </div>
      )}
    </div>
  )
}
