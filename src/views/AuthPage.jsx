// src/views/AuthPage.jsx
import { useState } from 'react'

export default function AuthPage({ onBack, onRegister, onLogin }) {
  const [tab, setTab] = useState('login') // 'login' or 'register'
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirm: '',
    role: 'passenger'
  })
  const [message, setMessage] = useState('')

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = e => {
    e.preventDefault()
    setMessage('')

    const username = form.username.trim()
    const password = form.password

    if (!username || !password) {
      setMessage('請輸入帳號與密碼')
      return
    }

    if (tab === 'register') {
      if (password !== form.confirm) {
        setMessage('兩次輸入的密碼不一致')
        return
      }
      // 呼叫上層註冊邏輯（App 會決定能不能註冊 & 要不要跳頁）
      const result =
        onRegister?.({
          username,
          password,
          role: form.role
        }) || { ok: false, message: '' }

      if (!result.ok && result.message) {
        setMessage(result.message)
      }
      // ok 的情況會被 App 直接導到乘客/司機端，看不到這裡的訊息也沒關係
    } else {
      // 登入
      const result =
        onLogin?.({
          username,
          password
        }) || { ok: false, message: '' }

      if (!result.ok && result.message) {
        // ❌ 帳號不存在 或 密碼錯誤
        setMessage(result.message)
      }
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2 className="auth-title">SmartDispatch 帳號</h2>
        <button type="button" className="ghost-btn" onClick={onBack}>
          ← 回首頁
        </button>
      </div>

      <div className="auth-tabs">
        <button
          type="button"
          className={tab === 'login' ? 'auth-tab active' : 'auth-tab'}
          onClick={() => {
            setTab('login')
            setMessage('')
          }}
        >
          登入
        </button>
        <button
          type="button"
          className={tab === 'register' ? 'auth-tab active' : 'auth-tab'}
          onClick={() => {
            setTab('register')
            setMessage('')
          }}
        >
          註冊
        </button>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label className="field-label">帳號</label>
          <input
            className="text-input"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="設定一個登入帳號"
          />
        </div>

        <div className="form-group">
          <label className="field-label">密碼</label>
          <input
            className="text-input"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="至少 6 碼"
          />
        </div>

        {tab === 'register' && (
          <>
            <div className="form-group">
              <label className="field-label">確認密碼</label>
              <input
                className="text-input"
                type="password"
                name="confirm"
                value={form.confirm}
                onChange={handleChange}
                placeholder="再輸入一次密碼"
              />
            </div>

            <div className="form-group">
              <label className="field-label">身分</label>
              <select
                className="text-input"
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                <option value="passenger">乘客</option>
                <option value="driver">司機</option>
              </select>
            </div>
          </>
        )}

        <button type="submit" className="primary-btn">
          {tab === 'login' ? '登入' : '建立新帳號'}
        </button>
      </form>

      {message && <div className="auth-message">{message}</div>}

      {tab === 'login' && (
        <p className="auth-hint">
          還沒有帳號？{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setTab('register')
              setMessage('')
            }}
          >
            立即註冊
          </button>
        </p>
      )}
    </div>
  )
}
