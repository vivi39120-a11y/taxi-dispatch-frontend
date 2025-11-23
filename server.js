import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// ====== 假資料：司機 ======
let drivers = [
  { id: 1, name: 'Alice', lat: 40.758, lng: -73.9855, status: 'available' },
  { id: 2, name: 'Bob', lat: 40.761, lng: -73.982, status: 'available' },
  { id: 3, name: 'Charlie', lat: 40.754, lng: -73.99, status: 'available' }
]

// ====== 假資料：訂單 ======
let orders = []
let orderIdCounter = 1

// GET /api/drivers
app.get('/api/drivers', (req, res) => {
  res.json(drivers)
})

// GET /api/orders
app.get('/api/orders', (req, res) => {
  res.json(orders)
})

// POST /api/orders （乘客下單）
app.post('/api/orders', (req, res) => {
  const { pickup, dropoff } = req.body

  if (!pickup || !dropoff) {
    return res.status(400).json({ error: 'pickup and dropoff are required' })
  }

  const newOrder = {
    id: orderIdCounter++,
    pickup,
    dropoff,
    status: 'pending', // pending / assigned
    driverId: null,
    createdAt: new Date().toISOString()
  }

  orders.push(newOrder)
  res.status(201).json(newOrder)
})

// POST /api/orders/:id/assign（司機接單）
app.post('/api/orders/:id/assign', (req, res) => {
  const orderId = Number(req.params.id)
  const { driverId } = req.body

  const order = orders.find(o => o.id === orderId)
  const driver = drivers.find(d => d.id === Number(driverId))

  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }
  if (!driver) {
    return res.status(404).json({ error: 'Driver not found' })
  }

  order.status = 'assigned'
  order.driverId = driver.id
  driver.status = 'busy'

  res.json(order)
})

// ====== 部署用：提供 dist 靜態檔案 ======
const distPath = path.join(__dirname, 'dist')
app.use(express.static(distPath))

// SPA fallback：除了 /api 開頭以外，全部回傳 dist/index.html
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
