// server.js - taxi dispatch demo backend (ESM)

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// 假資料庫：放在記憶體裡（使用者）
const users = [];
let nextUserId = 1;

// 解出 __dirname（ESM 版本）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 中介層
app.use(cors());
app.use(express.json());

// ===== 假資料：司機 & 訂單 =====

// 司機列表
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

let orders = [];
let nextOrderId = 1;

// ===== API：司機 & 訂單 =====

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
    pickup, // e.g. { id, name, lat, lng }
    dropoff,
    status: "pending", // pending / assigned / completed
    driverId: null,
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  res.status(201).json(order);
});

// 司機接單（注意：路徑改成 /accept，配合前端）
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

  // 前端 AuthView / App.jsx 目前期待回傳 { order, driver }
  res.json({
    ok: true,
    order,
    driver,
  });
});

// ===== API：使用者註冊 / 登入（假資料庫版） =====

// 註冊
app.post("/api/users/register", (req, res) => {
  const { role, name, email, password, phone, carPlate } = req.body;

  if (!role || !email || !password) {
    return res
      .status(400)
      .json({ ok: false, message: "role, email, password 必填" });
  }

  const existed = users.find((u) => u.email === email);
  if (existed) {
    return res
      .status(400)
      .json({ ok: false, message: "這個 Email 已經註冊過了" });
  }

  const user = {
    id: nextUserId++,
    role, // 'passenger' 或 'driver'
    name: name || "",
    email,
    password, // 目前先純文字，之後可以改成 hash
    phone: phone || "",
    carPlate: carPlate || "",
  };

  users.push(user);
  console.log("User registered:", user);

  res.json({ ok: true, user });
});

// 登入
app.post("/api/users/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ ok: false, message: "email, password 必填" });
  }

  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res
      .status(401)
      .json({ ok: false, message: "帳號或密碼錯誤" });
  }

  res.json({ ok: true, user });
});

// ===== 靜態檔 & SPA fallback =====

// dist 靜態檔
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// SPA fallback：所有「不是 /api 開頭」的路徑，都回傳 React 的 index.html
// 這裡用正規表達式，避免 app.get('*') 造成 path-to-regexp 錯誤
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ===== 啟動伺服器 =====

const PORT = process.env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
