// src/AuthPage.jsx
import { useState } from "react";

const API_BASE = "/api";

function AuthPage({ onBack }) {
  const [mode, setMode] = useState("login"); // 'login' or 'register'
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      alert("請輸入帳號與密碼");
      return;
    }
    if (mode === "register" && password !== confirm) {
      alert("兩次輸入的密碼不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || (mode === "login" ? "登入失敗" : "註冊失敗"));
        return;
      }

      if (mode === "login") {
        alert("登入成功！");
      } else {
        alert("註冊成功，請切換到『登入』使用。");
      }
    } catch (err) {
      console.error("auth error", err);
      alert("伺服器錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-root">
      <header className="uber-dispatch-topbar">
        <div className="topbar-left">
          <div className="brand-row">
            <span className="brand-dot" />
            <span className="brand-text">NY Taxi Demo</span>
          </div>
          <div className="brand-sub">
            帳號登入 / 註冊（目前資料暫存於伺服器記憶體）
          </div>
        </div>
        <div className="topbar-right">
          <button type="button" className="topbar-link" onClick={onBack}>
            回首頁
          </button>
        </div>
      </header>

      <main className="auth-page-main">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={
                "auth-tab-btn" + (mode === "login" ? " active" : "")
              }
              onClick={() => setMode("login")}
            >
              登入
            </button>
            <button
              type="button"
              className={
                "auth-tab-btn" + (mode === "register" ? " active" : "")
              }
              onClick={() => setMode("register")}
            >
              註冊
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">帳號</label>
              <input
                type="text"
                className="form-control"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">密碼</label>
              <input
                type="password"
                className="form-control"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {mode === "register" && (
              <div className="mb-3">
                <label className="form-label">再次輸入密碼</label>
                <input
                  type="password"
                  className="form-control"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-dark w-100 py-2 mt-2"
              disabled={loading}
            >
              {loading ? "處理中..." : mode === "login" ? "登入" : "註冊"}
            </button>
          </form>

          <p className="auth-hint small text-muted mt-3">
            ※ 目前使用記憶體假資料庫，Render 伺服器重新啟動後帳號會被清空。
          </p>
        </div>
      </main>
    </div>
  );
}

export default AuthPage;
