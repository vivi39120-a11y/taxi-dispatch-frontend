// src/AuthPage.jsx
import { useState } from "react";

const API_BASE = "/api";

export default function AuthPage({ onSuccess }) {
  const [mode, setMode] = useState("login"); // 'login' or 'register'
  const [role, setRole] = useState("passenger");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url =
        mode === "register"
          ? `${API_BASE}/users/register`
          : `${API_BASE}/users/login`;

      const body =
        mode === "register"
          ? { role, name, email, password }
          : { email, password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "發生錯誤");
        return;
      }

      const user = data.user;
      if (onSuccess) onSuccess(user);
    } catch (err) {
      console.error("auth error", err);
      alert("連線發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            登入
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            註冊
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="auth-field">
                <label>身分</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="passenger">乘客</option>
                  <option value="driver">司機</option>
                </select>
              </div>

              <div className="auth-field">
                <label>名稱</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isRegister}
                />
              </div>
            </>
          )}

          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label>密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? "處理中..."
              : isRegister
              ? "建立帳號並進入系統"
              : "登入"}
          </button>
        </form>

        <p className="auth-hint">
          （目前使用記憶體假資料庫，重新啟動伺服器後帳號會消失）
        </p>
      </div>
    </div>
  );
}
