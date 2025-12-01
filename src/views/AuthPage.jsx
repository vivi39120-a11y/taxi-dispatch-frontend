// src/views/AuthPage.jsx
import { useState } from 'react'

// ✅ 車種 value 全部改成大寫：YELLOW / GREEN / FHV
const CAR_TYPES = [
  { value: 'YELLOW', label: 'Yellow 計程車' },
  { value: 'GREEN',  label: 'Green 計程車' },
  { value: 'FHV',    label: 'FHV（多元計程車）' },
]

export default function AuthPage({ onBack, onRegister, onLogin }) {
  const [mode, setMode] = useState('login')        // 'login' | 'register'
  const [role, setRole] = useState('passenger')    // 'passenger' | 'driver'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [carType, setCarType] = useState('YELLOW') // ✅ 預設第一個：YELLOW
  const [message, setMessage] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setMessage('')

    if (mode === 'register') {
      if (role === 'driver' && !carType) {
        setMessage('請選擇車輛種類')
        return
      }

      const result = await onRegister?.({
        username,
        password,
        role,
        // ✅ 司機註冊時把大寫車種丟出去（YELLOW / GREEN / FHV）
        carType: role === 'driver' ? carType : null,
      })

      if (!result?.ok) {
        setMessage(result?.message || '註冊失敗')
      }
      return
    }

    // login
    const result = await onLogin?.({ username, password })
    if (!result?.ok) {
      setMessage(result?.message || '登入失敗')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <button
          type="button"
          className="ghost-btn"
          onClick={onBack}
          style={{ marginBottom: 16 }}
        >
          ← 回首頁
        </button>

        <h1 className="panel-title" style={{ marginBottom: 12 }}>
          SmartDispatch 帳號
        </h1>

        <div className="auth-toggle">
          <button
            type="button"
            className={mode === 'login' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => setMode('login')}
          >
            登入
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => setMode('register')}
          >
            註冊
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field-label" style={{ marginTop: 16 }}>
            身分
          </div>
          <div className="auth-role-toggle">
            <label>
              <input
                type="radio"
                name="role"
                value="passenger"
                checked={role === 'passenger'}
                onChange={() => setRole('passenger')}
              />
              乘客
            </label>
            <label style={{ marginLeft: 12 }}>
              <input
                type="radio"
                name="role"
                value="driver"
                checked={role === 'driver'}
                onChange={() => setRole('driver')}
              />
              司機
            </label>
          </div>

          <div className="field-label" style={{ marginTop: 16 }}>
            帳號
          </div>
          <input
            className="text-input"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="設定一個登入帳號"
          />

          <div className="field-label" style={{ marginTop: 16 }}>
            密碼
          </div>
          <input
            className="text-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="至少 6 碼"
          />

          {/* 只有司機註冊才需要選車種 */}
          {mode === 'register' && role === 'driver' && (
            <>
              <div className="field-label" style={{ marginTop: 16 }}>
                車輛種類
              </div>
              <select
                className="text-input"
                value={carType}
                onChange={e => setCarType(e.target.value)}
              >
                {CAR_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </>
          )}

          {message && (
            <div className="error-box" style={{ marginTop: 12 }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            className="primary-btn"
            style={{ marginTop: 24, width: '100%' }}
          >
            {mode === 'login' ? '登入' : '立即註冊'}
          </button>
        </form>
      </div>
    </div>
  )
}
