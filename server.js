// server.js
import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.set('etag', false) // ✅ 關掉 ETag，避免 304

app.use(cors())
app.use(express.json())

// ✅ API 全部不快取（雙保險）
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

// ===== 小型「資料庫」：使用者 / 司機 / 訂單 =====
let users = []
let nextUserId = 1

let drivers = []
let nextDriverId = 1

let orders = []
let nextOrderId = 1

const FALLBACK_GEOCODE_PLACES = [
  { label: 'Times Square, Manhattan, New York, NY, USA', lat: 40.758, lng: -73.9855 },
  { label: 'Central Park, Manhattan, New York, NY, USA', lat: 40.7829, lng: -73.9654 },
  { label: 'Grand Central Terminal, Manhattan, New York, NY, USA', lat: 40.7527, lng: -73.9772 },
  { label: 'Wall Street, Manhattan, New York, NY, USA', lat: 40.706, lng: -74.0086 },
  { label: 'John F. Kennedy International Airport (JFK), New York, NY, USA', lat: 40.6413, lng: -73.7781 },
  { label: 'LaGuardia Airport (LGA), New York, NY, USA', lat: 40.7769, lng: -73.874 },
]

function normalizeType(value) {
  if (typeof value !== 'string') return null
  return value.toUpperCase()
}

function toNum(v) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

// =================== Auth API：註冊 / 登入 ===================
app.post('/api/register', (req, res) => {
  const { username, password, role, carType } = req.body

  if (!username || !password || !role) {
    return res.status(400).json({
      errorCode: 'MISSING_FIELDS',
      error: 'username / password / role required',
    })
  }

  const existed = users.find(u => u.username === username)
  if (existed) {
    return res.status(409).json({
      errorCode: 'USERNAME_TAKEN',
      error: 'Username already taken',
    })
  }

  const carTypeUpper = role === 'driver' && carType ? normalizeType(carType) : null

  const user = {
    id: nextUserId++,
    username,
    password,
    role,
    carType: carTypeUpper,
  }
  users.push(user)

  const { password: _, ...safeUser } = user
  return res.json(safeUser)
})

app.post('/api/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({
      errorCode: 'MISSING_FIELDS',
      error: 'username / password required',
    })
  }

  const user = users.find(u => u.username === username)
  if (!user) {
    return res.status(400).json({
      errorCode: 'NO_SUCH_ACCOUNT',
      error: 'Account not found',
    })
  }
  if (user.password !== password) {
    return res.status(400).json({
      errorCode: 'WRONG_PASSWORD',
      error: 'Wrong password',
    })
  }

  const { password: _, ...safeUser } = user
  return res.json(safeUser)
})

// =================== Geocode API ===================
// =================== Geocode API ===================

// ✅ 簡單快取（降低打到 Nominatim 的頻率）
const geocodeCache = new Map() // key: queryLower -> { ts, data }
const GEOCODE_CACHE_TTL_MS = 60_000

// ✅ 簡單節流（Nominatim 公共服務很在意頻率）
let lastNominatimAt = 0
const NOMINATIM_MIN_INTERVAL_MS = 1100

function filterFallbackPlaces(query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return []
  return FALLBACK_GEOCODE_PLACES
    .filter(p => String(p.label || '').toLowerCase().includes(q))
    .slice(0, 5)
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

app.get('/api/geocode', async (req, res) => {
  const query = String(req.query.q || '').trim()
  if (!query) return res.json([])

  const key = query.toLowerCase()

  // ✅ cache hit
  const cached = geocodeCache.get(key)
  if (cached && Date.now() - cached.ts < GEOCODE_CACHE_TTL_MS) {
    return res.json(cached.data)
  }

  try {
    // ✅ throttle（避免太密集）
    const now = Date.now()
    const wait = NOMINATIM_MIN_INTERVAL_MS - (now - lastNominatimAt)
    if (wait > 0) await sleep(wait)
    lastNominatimAt = Date.now()

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`

    const response = await fetch(url, {
      headers: {
        // 建議換成你自己的聯絡方式
        'User-Agent': 'ny-taxi-dispatch-demo/1.0 (contact: your_email@example.com)',
        'Accept': 'application/json',
        'Accept-Language': 'en',
        // 有些環境加 Referer 會更穩
        'Referer': 'http://localhost',
      },
    })

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`)
    }

    const data = await response.json()
    const results = (Array.isArray(data) ? data : []).map(item => ({
      label: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon),
    }))

    // ✅ cache store
    geocodeCache.set(key, { ts: Date.now(), data: results })

    return res.json(results)
  } catch (err) {
    console.error('Geocode failed, using fallback filtered places:', err)

    // ✅ fallback 也要依 query 過濾，避免你看到永遠同一包
    const filtered = filterFallbackPlaces(query)

    // cache fallback too（避免每個字都一直噴錯誤）
    geocodeCache.set(key, { ts: Date.now(), data: filtered })

    return res.json(filtered)
  }
})


// =================== 司機登入 / 位置 ===================
app.post('/api/driver-login', (req, res) => {
  const { name, carType } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })

  const carTypeUpper = carType ? normalizeType(carType) : null

  let driver = drivers.find(d => d.name === name)
  if (!driver) {
    driver = {
      id: nextDriverId++,
      name,
      lat: null,
      lng: null,
      status: 'idle',
      carType: carTypeUpper,
    }
    drivers.push(driver)
  } else {
    if (carTypeUpper && !driver.carType) driver.carType = carTypeUpper
  }

  res.json(driver)
})

app.get('/api/drivers', (req, res) => {
  res.json(drivers)
})

app.patch('/api/drivers/:id/location', (req, res) => {
  const id = Number(req.params.id)
  const { lat, lng, status } = req.body

  const driver = drivers.find(d => d.id === id)
  if (!driver) return res.status(404).json({ error: 'driver not found' })

  const nLat = toNum(lat)
  const nLng = toNum(lng)
  if (nLat != null) driver.lat = nLat
  if (nLng != null) driver.lng = nLng
  if (typeof status === 'string') driver.status = status

  res.json(driver)
})

// =================== 訂單 API ===================
app.post('/api/orders', (req, res) => {
  const {
    pickup,
    dropoff,
    customer,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    distanceKm,
    vehicleType,
    estimatedFare,
    estimatedPrice,
    stops,
  } = req.body

  if (!pickup || !dropoff) {
    return res.status(400).json({ error: 'pickup & dropoff are required' })
  }

  const normalizedStops = Array.isArray(stops)
    ? stops.map(s => ({
        label: typeof s?.label === 'string' ? s.label : typeof s?.text === 'string' ? s.text : '',
        lat: toNum(s?.lat ?? s?.loc?.lat),
        lng: toNum(s?.lng ?? s?.loc?.lng),
      }))
    : []

  const finalPrice =
    typeof estimatedPrice === 'number'
      ? estimatedPrice
      : typeof estimatedFare === 'number'
      ? estimatedFare
      : toNum(estimatedPrice) ?? toNum(estimatedFare)

  const now = new Date().toISOString()

  const order = {
    id: nextOrderId++,
    pickup,
    dropoff,
    pickupLat: toNum(pickupLat),
    pickupLng: toNum(pickupLng),
    dropoffLat: toNum(dropoffLat),
    dropoffLng: toNum(dropoffLng),
    customer: customer || null,

    status: 'pending',
    driverId: null,
    driverName: null,

    distanceKm: toNum(distanceKm),
    vehicleType: normalizeType(vehicleType),
    estimatedPrice: finalPrice,
    estimatedFare: finalPrice,

    stops: normalizedStops,

    createdAt: now,
    updatedAt: now,
    completedAt: null,
  }

  orders.push(order)
  res.json(order)
})

app.get('/api/orders', (req, res) => {
  res.json(orders)
})

app.post('/api/orders/:id/assign', (req, res) => {
  const id = Number(req.params.id)
  const { driverId, driverName } = req.body

  const order = orders.find(o => o.id === id)
  if (!order) return res.status(404).json({ error: 'order not found' })

  const driver = drivers.find(d => d.id === Number(driverId))
  if (!driver) return res.status(404).json({ error: 'driver not found' })

  if (order.status === 'completed') {
    return res.status(409).json({ error: 'order already completed' })
  }

  order.status = 'assigned'
  order.driverId = driver.id
  order.driverName = driverName || driver.name
  order.updatedAt = new Date().toISOString()

  driver.status = 'busy'
  res.json(order)
})

app.patch('/api/orders/:id/status', (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body

  const order = orders.find(o => o.id === id)
  if (!order) return res.status(404).json({ error: 'order not found' })

  if (typeof status !== 'string' || !status.trim()) {
    return res.status(400).json({ error: 'status is required' })
  }

  order.status = status.trim()
  order.updatedAt = new Date().toISOString()

  if (order.status === 'completed') {
    order.completedAt = new Date().toISOString()
    if (order.driverId != null) {
      const driver = drivers.find(d => d.id === order.driverId)
      if (driver) driver.status = 'idle'
    }
  }

  res.json(order)
})

app.post('/api/orders/:id/complete', (req, res) => {
  const id = Number(req.params.id)
  const order = orders.find(o => o.id === id)
  if (!order) return res.status(404).json({ error: 'order not found' })

  order.status = 'completed'
  order.updatedAt = new Date().toISOString()
  order.completedAt = new Date().toISOString()

  if (order.driverId != null) {
    const driver = drivers.find(d => d.id === order.driverId)
    if (driver) driver.status = 'idle'
  }

  res.json(order)
})

// =================== Production：前端靜態檔案（dist 存在才掛） ===================
const distPath = path.join(__dirname, 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
