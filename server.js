// server.js
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

// ===== 小型「資料庫」：使用者 / 司機 / 訂單 =====

// 使用者：註冊 / 登入 用
// { id, username, password, role, carType }
let users = []
let nextUserId = 1

// 司機：地圖上那台車
// { id, name, lat, lng, status, carType }
let drivers = []

// 訂單：包含經緯度與計價資訊
// {
//   id, pickup, dropoff,
//   pickupLat, pickupLng,
//   dropoffLat, dropoffLng,
//   customer,
//   status,        // 'pending' | 'assigned'
//   driverId, driverName,
//   distanceKm,    // 預估距離
//   vehicleType,   // 'YELLOW' | 'GREEN' | 'FHV'
//   estimatedFare, // 預估價格
//   createdAt
// }
let orders = []
let nextDriverId = 1
let nextOrderId = 1

// 幾個分散在曼哈頓附近的起始點
const DRIVER_START_POSITIONS = [
  { lat: 40.7580, lng: -73.9855 }, // Times Square
  { lat: 40.7308, lng: -73.9973 }, // Washington Square Park
  { lat: 40.7527, lng: -73.9772 }, // Grand Central
  { lat: 40.7060, lng: -74.0086 }, // Wall Street
  { lat: 40.7484, lng: -73.9857 }, // Empire State
  { lat: 40.7712, lng: -73.9742 }, // Central Park South
]
let nextStartIndex = 0

function getNextStartPosition() {
  const pos =
    DRIVER_START_POSITIONS[nextStartIndex % DRIVER_START_POSITIONS.length]
  nextStartIndex += 1
  return { ...pos }
}

function normalizeType(value) {
  if (typeof value !== 'string') return null
  return value.toUpperCase()
}

// =================== Auth API：註冊 / 登入 ===================

// 註冊：帳號不能重複
app.post('/api/register', (req, res) => {
  const { username, password, role, carType } = req.body

  if (!username || !password || !role) {
    return res.status(400).json({ error: '缺少必要欄位（username / password / role）' })
  }

  const existed = users.find(u => u.username === username)
  if (existed) {
    // 帳號重複 → 409 Conflict
    return res.status(409).json({ error: '此帳號名稱已被使用，請改用其他名稱。' })
  }

  const carTypeUpper =
    role === 'driver' && carType ? normalizeType(carType) : null

  const user = {
    id: nextUserId++,
    username,
    password,       // Demo 用：實務上要做 hash
    role,           // 'passenger' | 'driver'
    carType: carTypeUpper,
  }
  users.push(user)
  console.log('New user registered:', user)

  // 回傳時不要把密碼給前端
  const { password: _, ...safeUser } = user
  return res.json(safeUser)
})

// 登入：帳號必須存在，密碼要相符
app.post('/api/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: '請輸入帳號與密碼。' })
  }

  const user = users.find(u => u.username === username)
  if (!user) {
    return res.status(400).json({ error: '查無此帳號，請先註冊。' })
  }
  if (user.password !== password) {
    return res.status(400).json({ error: '密碼錯誤，請再試一次。' })
  }

  const { password: _, ...safeUser } = user
  return res.json(safeUser)
})

// =================== Geocode API ===================
app.get('/api/geocode', async (req, res) => {
  const q = req.query.q
  if (!q || q.trim() === '') {
    return res.status(400).json({ error: '缺少查詢字串 q' })
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
      q
    )}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'taxi-dispatch-demo/1.0 (vivi39120@gmail.com)',
      },
    })

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`)
    }

    const data = await response.json()

    const results = data.map(item => ({
      label: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }))

    res.json(results)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '地理編碼失敗' })
  }
})

// =================== 司機登入 / 位置 ===================

app.post('/api/driver-login', (req, res) => {
  const { name, carType } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })

  const carTypeUpper = carType ? normalizeType(carType) : null

  let driver = drivers.find(d => d.name === name)
  if (!driver) {
    const pos = getNextStartPosition()
    driver = {
      id: nextDriverId++,
      name,
      lat: pos.lat,
      lng: pos.lng,
      status: 'idle',
      carType: carTypeUpper,
    }
    drivers.push(driver)
    console.log('New driver registered:', driver)
  } else {
    // 如果後來更新了 carType，補上去
    if (carTypeUpper && !driver.carType) {
      driver.carType = carTypeUpper
    }
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

  if (typeof lat === 'number') driver.lat = lat
  if (typeof lng === 'number') driver.lng = lng
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
  } = req.body

  if (!pickup || !dropoff) {
    return res.status(400).json({ error: 'pickup & dropoff are required' })
  }

  const order = {
    id: nextOrderId++,
    pickup,
    dropoff,
    pickupLat: typeof pickupLat === 'number' ? pickupLat : null,
    pickupLng: typeof pickupLng === 'number' ? pickupLng : null,
    dropoffLat: typeof dropoffLat === 'number' ? dropoffLat : null,
    dropoffLng: typeof dropoffLng === 'number' ? dropoffLng : null,
    customer: customer || null,
    status: 'pending',
    driverId: null,
    driverName: null,
    distanceKm: typeof distanceKm === 'number' ? distanceKm : null,
    vehicleType: normalizeType(vehicleType),
    estimatedFare:
      typeof estimatedFare === 'number' ? estimatedFare : null,
    createdAt: new Date().toISOString(),
  }

  orders.push(order)
  console.log('New order:', order)

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

  const driver = drivers.find(d => d.id === driverId)
  if (!driver) return res.status(404).json({ error: 'driver not found' })

  order.status = 'assigned'
  order.driverId = driverId
  order.driverName = driverName || driver.name
  driver.status = 'busy'

  console.log('Order assigned:', order)
  res.json(order)
})

// =================== 前端靜態檔案 ===================
const distPath = path.join(__dirname, 'dist')
app.use(express.static(distPath))

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
