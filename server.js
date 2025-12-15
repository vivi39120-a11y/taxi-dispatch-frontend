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

// 依 query 做 fallback 過濾（讓 nyc 也有結果）
function fallbackGeocode(query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return []

  // 特別處理常見縮寫
  const tokens = new Set(q.split(/\s+/).filter(Boolean))
  if (q === 'nyc') {
    tokens.add('new')
    tokens.add('york')
    tokens.add('manhattan')
    tokens.add('ny')
  }

  // 打分：label 包含 token 越多，越前面
  const scored = FALLBACK_GEOCODE_PLACES.map(p => {
    const label = String(p.label || '').toLowerCase()
    let score = 0
    for (const t of tokens) {
      if (t.length >= 2 && label.includes(t)) score += 1
    }
    return { p, score }
  })

  scored.sort((a, b) => b.score - a.score)

  // 如果完全沒 match，就乾脆回全部（避免下拉完全空）
  const best = scored.filter(x => x.score > 0).map(x => x.p)
  return best.length ? best : FALLBACK_GEOCODE_PLACES
}

app.get('/api/geocode', async (req, res) => {
  const query = String(req.query.q || '').trim()
  if (!query) return res.json([])

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`

    const response = await fetch(url, {
      headers: {
        // 建議用比較像樣的 UA（含專案名 + 聯絡方式）
        'User-Agent': 'taxi-dispatch-demo/1.0 (contact: vivi39120@gmail.com)',
        'Accept': 'application/json',
      },
    })

    // 被擋或非 2xx：直接 fallback
    if (!response.ok) {
      console.warn('Nominatim not ok:', response.status)
      return res.json(fallbackGeocode(query))
    }

    const data = await response.json()

    // 2xx 但回空陣列：也要 fallback（你的問題就在這裡）
    if (!Array.isArray(data) || data.length === 0) {
      return res.json(fallbackGeocode(query))
    }

    const results = data
      .map(item => ({
        label: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
      }))
      .filter(x => x.label && Number.isFinite(x.lat) && Number.isFinite(x.lng))

    // 防止 map/filter 後變空：仍 fallback
    if (!results.length) {
      return res.json(fallbackGeocode(query))
    }

    return res.json(results)
  } catch (err) {
    console.error('Geocode failed, using fallback:', err)
    return res.json(fallbackGeocode(query))
  }
})

// =================== Driver API ===================

// 取得司機列表（前端每 3 秒會打）
app.get('/api/drivers', (req, res) => {
  res.json(drivers)
})

// 司機登入/建立自己的車（前端 login 後會打 /api/driver-login）
app.post('/api/driver-login', (req, res) => {
  const { name, carType } = req.body || {}
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
    // 若同名已存在，允許更新車種（可選）
    if (carTypeUpper) driver.carType = carTypeUpper
  }

  res.json(driver)
})

// 司機更新定位（如果你 MapView 有回寫定位到後端就會用到）
app.patch('/api/drivers/:id/location', (req, res) => {
  const id = Number(req.params.id)
  const driver = drivers.find(d => d.id === id)
  if (!driver) return res.status(404).json({ error: 'driver not found' })

  const lat = toNum(req.body?.lat)
  const lng = toNum(req.body?.lng)
  if (lat != null) driver.lat = lat
  if (lng != null) driver.lng = lng

  // 可選：允許改狀態
  if (typeof req.body?.status === 'string') driver.status = req.body.status.trim()

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
