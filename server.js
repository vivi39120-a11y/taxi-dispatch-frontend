// server.js
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

// ===== in-memory 資料 =====
let drivers = [] // { id, name, lat, lng, status }
let orders = []  // { id, pickup, dropoff, customer, status, driverId, driverName, createdAt }
let nextDriverId = 1
let nextOrderId = 1

// 幾個分散在曼哈頓附近的起始點，讓每台車明顯分開
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

// ===== API：司機登入 / 註冊 =====
app.post('/api/driver-login', (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })

  // 已有同名司機 → 直接回原本那一台
  let driver = drivers.find(d => d.name === name)
  if (!driver) {
    const pos = getNextStartPosition()
    driver = {
      id: nextDriverId++,
      name,
      lat: pos.lat,
      lng: pos.lng,
      status: 'idle',
    }
    drivers.push(driver)
    console.log('New driver registered:', driver)
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

// ===== API：乘客下單 =====
app.post('/api/orders', (req, res) => {
  const { pickup, dropoff, customer } = req.body
  if (!pickup || !dropoff) {
    return res.status(400).json({ error: 'pickup & dropoff are required' })
  }

  const order = {
    id: nextOrderId++,
    pickup,
    dropoff,
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
