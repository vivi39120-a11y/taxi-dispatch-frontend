// server.js （放在 taxi-dispatch-frontend 專案根目錄）
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());
app.use(express.json());

// === 讓 ES module 也有 __dirname ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== 共享的假司機資料（所有人共用） =====
let drivers = [
  {
    id: 'D1',
    name: 'Alice',
    carPlate: 'ABC-1234',
    lat: 40.758,
    lng: -73.9855,
    status: 'available',
  },
  {
    id: 'D2',
    name: 'Bob',
    carPlate: 'NY-5678',
    lat: 40.761,
    lng: -73.98,
    status: 'available',
  },
  {
    id: 'D3',
    name: 'Charlie',
    carPlate: 'NY-7777',
    lat: 40.73,
    lng: -73.99,
    status: 'available',
  },
];

let orders = []; // 訂單也放這裡，所有連線的人共用這一份記憶體

// ===== API：取得司機 / 訂單 =====
app.get('/api/drivers', (req, res) => {
  res.json(drivers);
});

app.get('/api/orders', (req, res) => {
  res.json(orders);
});

// ===== API：乘客建立訂單 =====
app.post('/api/orders', (req, res) => {
  const { pickup, dropoff } = req.body;
  if (!pickup || !dropoff) {
    return res.status(400).json({ error: 'pickup / dropoff 必填' });
  }

  const newOrder = {
    id: 'O' + Date.now(),
    pickup,
    dropoff,
    status: 'pending',
    driverId: null,
    createdAt: new Date().toISOString(),
  };

  orders.push(newOrder);
  console.log('新訂單', newOrder);
  res.json(newOrder);
});

// ===== API：司機接單 =====
app.post('/api/orders/:id/accept', (req, res) => {
  const { id } = req.params;
  const { driverId } = req.body;

  const order = orders.find((o) => o.id === id);
  const driver = drivers.find(
    (d) => String(d.id) === String(driverId)
  );

  if (!order || !driver) {
    return res.status(404).json({ error: '訂單或司機不存在' });
  }

  order.status = 'accepted';
  order.driverId = driver.id;
  driver.status = 'heading';

  console.log(`司機 ${driver.name} 接了訂單 ${order.id}`);
  res.json({ order, driver });
});

// ===== 靜態檔案：把 React build 出來的 dist 當網站根目錄 =====
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback：除了 /api 開頭，其它路徑都交給 React 的 index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// ===== 啟動 Server =====
const PORT = process.env.PORT || 4000;

// 0.0.0.0 讓同一個網路裡其他裝置也能連進來
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
