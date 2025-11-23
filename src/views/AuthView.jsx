// src/views/AuthView.jsx
import { useState } from 'react';

function AuthView({ t }) {
  const [mode, setMode] = useState('register'); // 'register' or 'login'
  const [role, setRole] = useState('passenger'); // passenger / driver

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    carPlate: '',
  });

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url =
        mode === 'register' ? '/api/users/register' : '/api/users/login';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role }),
      });

      const data = await res.json();
      if (!data.ok) {
        alert(data.message || '操作失敗');
        return;
      }

      alert(
        mode === 'register'
          ? '註冊成功，幫你帶到系統畫面'
          : '登入成功，幫你帶到系統畫面'
      );

      // 註冊 / 登入完，導回對應的端（乘客 / 司機）
      const nextRole = role === 'driver' ? 'driver' : 'passenger';
      window.location.href = `/?role=${nextRole}`;
    } catch (err) {
      console.error(err);
      alert('系統錯誤，請稍後再試');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            註冊
          </button>
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            登入
          </button>
        </div>

        <div className="auth-role-switch">
          <span>身分：</span>
          <button
            className={role === 'passenger' ? 'active' : ''}
            onClick={() => setRole('passenger')}
          >
            乘客
          </button>
          <button
            className={role === 'driver' ? 'active' : ''}
            onClick={() => setRole('driver')}
          >
            司機
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              <label>
                姓名
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                密碼
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                手機
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />
              </label>

              {role === 'driver' && (
                <label>
                  車牌號碼
                  <input
                    name="carPlate"
                    value={form.carPlate}
                    onChange={handleChange}
                  />
                </label>
              )}
            </>
          )}

          {mode === 'login' && (
            <>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                密碼
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </label>
            </>
          )}

          <button type="submit" className="auth-submit">
            {mode === 'register' ? '建立帳號' : '登入'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthView;
