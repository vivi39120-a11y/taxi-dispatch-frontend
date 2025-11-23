// server.js - taxi dispatch demo backend (ESM)

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ========== 模擬資料庫 ==========

// 使用者（登入 / 註冊）
const users = [];
let nextUserId = 1;

// 司機
let drivers = [
  {
    id: "D1",
    name: "Driver 1",
    plate: "NYC-1001",
    lat: 40.758,
    lng: -73.9855,
    status: "idle", // idle / ontrip
  },
  {
    id: "D2",
    name: "Driver 2",
    plate: "NYC-1002",
    lat: 40.7527,
    lng: -73.9772,
    status: "idle",
  },
];

// 訂單
let orders = [];
let nextOrderId = 1;

// ========== 基本設定 ==========

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ========== 使用者相關 API ==========

// 註冊
app.post("/api/users/register", (req, res) => {
  const { role, name, email, password } = req.body;
  if (!role || !name || !email || !password) {
    return res.status(400).json({ error: "缺少必要欄位" });
  }

  const exists = users.find((u) => u.email === email);
  if (exists) {
    return res.status(400).json({ error: "此 Email 已註冊" });
  }

  const user = {
    id: nextUserId++,
    role, // "passenger" or "driver"
    name,
    email,
    password, // demo: 直接存明碼，正式專題要改成 hash
  };

  users.push(user);
  res.status(201).json({ user });
});

// 登入
app.post("/api/users/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "缺少 Email 或密碼" });
  }

  const user = users.find((u) => u.email === email);
  if (!user || user.password !== password) {
    return res.status(400).json({ error: "帳號或密碼錯誤" });
  }

  res.json({ user });
});

// ========== 司機 & 訂單 API ==========

// 取得所有司機
app.get("/api/drivers", (req, res) => {
  res.json(drivers);
});

// 取得所有訂單
app.get("/api/orders", (req, res) => {
  res.json(orders);
});

// 乘客下單
app.post("/api/orders", (req, res) => {
  const { pickup, dropoff } = req.body;

  if (!pickup || !dropoff) {
    return res.status(400).json({ error: "缺少上車地點或目的地" });
  }

  const order = {
    id: nextOrderId++,
    pickup, // { id, name, lat, lng }
    dropoff,
    status: "pending", // pending / assigned / completed
    driverId: null,
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  res.status(201).json(order);
});

// 司機接單
app.post("/api/orders/:id/accept", (req, res) => {
  const orderId = Number(req.params.id);
  const { driverId } = req.body;

  const order = orders.find((o) => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: "找不到這筆訂單" });
  }

  const driver = drivers.find((d) => d.id === driverId);
  if (!driver) {
    return res.status(404).json({ error: "找不到這位司機" });
  }

  order.driverId = driverId;
  order.status = "assigned";
  driver.status = "ontrip";

  res.json({ order, driver });
});

// ========== 靜態檔 & SPA fallback ==========

const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// 所有不是 /api 開頭的路徑，都回傳前端的 index.html
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ========== 啟動伺服器 ==========

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
