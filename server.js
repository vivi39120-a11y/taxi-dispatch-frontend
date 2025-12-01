// server.js
// drivers: { id, name, lat, lng, status, carType }
// orders : { id, pickup, dropoff, pickupLat, pickupLng, dropoffLat, dropoffLng,
//            vehicleType, distanceKm, estimatedPrice,
//            customer, status, driverId, driverName, createdAt }


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

// ===== in-memory 資料 =====
// 多加：pickupLat/pickupLng/dropoffLat/dropoffLng + distanceKm / vehicleType / estimatedFare
let drivers = [] // { id, name, lat, lng, status }
let orders = []  // { id, pickup, dropoff, pickupLat, pickupLng, dropoffLat, dropoffLng, distanceKm, vehicleType, estimatedFare, customer, status, driverId, driverName, createdAt }
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

// ===== geocode API (Nominatim) =====
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

// ===== API：司機登入 / 註冊 =====
app.post('/api/driver-login', (req, res) => {
  const { name, carType } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })

  let driver = drivers.find(d => d.name === name)

  if (!driver) {
    // 第一次登入：建立新司機，記錄車種
    const pos = getNextStartPosition()
    const type = carType || 'Yellow'  // 沒給就預設 Yellow

    driver = {
      id: nextDriverId++,
      name,
      lat: pos.lat,
      lng: pos.lng,
      status: 'idle',
      carType: type,
    }
    drivers.push(driver)
    console.log('New driver registered:', driver)
  } else if (carType && !driver.carType) {
    // 舊資料沒有 carType 的話，第一次帶 carType 進來就補上
    driver.carType = carType
  }

  res.json(driver)
})


// ===== API：取得全部司機 =====
app.get('/api/drivers', (req, res) => {
  res.json(drivers)
})

// ===== API：更新司機位置 =====
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

// ===== API：乘客下單（含經緯度 & 車種 & 價格）=====
app.post('/api/orders', (req, res) => {
  const {
    pickup,
    dropoff,
    customer,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    vehicleType,     // 乘客選的車種（Yellow / Green / FHV）
    distanceKm,      // 預估距離（公里）
    estimatedPrice,  // 該車種的預估價錢（單位隨你）
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
    vehicleType: vehicleType || null,
    distanceKm: typeof distanceKm === 'number' ? distanceKm : null,
    estimatedPrice: typeof estimatedPrice === 'number' ? estimatedPrice : null,
    customer: customer || null,
    status: 'pending',
    driverId: null,
    driverName: null,
    createdAt: new Date().toISOString(),
  }
  orders.push(order)
  console.log('New order:', order)

  res.json(order)
})


// ===== API：取得全部訂單 =====
app.get('/api/orders', (req, res) => {
  res.json(orders)
})

// ===== API：司機接單 =====
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

// ===== 靜態檔案（build 後）=====
const distPath = path.join(__dirname, 'dist')
app.use(express.static(distPath))

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
