// src/views/AuthPage.jsx
import { useState } from 'react'
import { t } from '../i18n'
import './AuthPage.css'

export default function AuthPage({ lang, onBack, onRegister, onLogin }) {
  const [tab, setTab] = useState('login') // 'login' | 'register'
  const [role, setRole] = useState('passenger') // 只在註冊時用
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [carType, setCarType] = useState('') // driver 用
  const [error, setError] = useState('') // 存「錯誤 key」
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)

    try {
      if (tab === 'login') {
        // ===== 登入 =====
        const result =
          (await onLogin?.({ username, password })) || { ok: false }

        if (!result.ok) {
          let key = ''

          if (typeof result.message === 'string') {
            const msg = result.message

            // 先把「可能出現的各種字串」都對應回我們自己的錯誤 key
            const authLoginFailedText = t(lang, 'auth_loginFailed') // 例如「密碼錯誤！」
            const loginFailedText = t(lang, 'loginFailed') // 例如「登入失敗」

            // ---- 密碼錯誤 ----
            if (
              msg === 'auth_loginFailed' ||          // 舊 key
              msg === 'errorWrongPassword' ||        // 新 key
              msg === authLoginFailedText            // 已翻譯好的文字
            ) {
              key = 'errorWrongPassword'             // 統一成「密碼錯誤」
            }
            // ---- 尚未註冊 ----
            else if (
              msg === 'loginFailed' ||               // 舊 key
              msg === 'errorUserNotFound' ||         // 新 key
              msg === loginFailedText                // 已翻譯好的「登入失敗」
            ) {
              key = 'errorUserNotFound'              // 統一成「請先註冊」
            }
            // 其他狀況 → 就直接拿來當 i18n key
            else {
              key = msg
            }
          } else {
            // 如果 message 不是字串，就當作「尚未註冊」
            key = 'errorUserNotFound'
          }

          setError(key)
        }
      } else {
        // ===== 註冊 =====
        if (!username || !password) {
          setError('errorMissingFields') // 請輸入完整的帳號與密碼。
          return
        }
        if (role === 'driver' && !carType) {
          setError('selectCarTypeHint') // 請選擇車輛種類
          return
        }

        const payload = {
          username,
          password,
          role,
          carType: role === 'driver' ? carType : null,
        }

        const result = (await onRegister?.(payload)) || { ok: false }

        if (!result.ok) {
          let key = ''

          if (typeof result.message === 'string') {
            const msg = result.message
            const authRegisterFailedText = t(lang, 'auth_registerFailed')

            if (
              msg === 'auth_registerFailed' ||       // 舊 key
              msg === 'errorUsernameTaken' ||        // 新 key
              msg === authRegisterFailedText         // 已翻譯好的文字
            ) {
              key = 'errorUsernameTaken'             // 此帳號名稱已存在，請重新輸入
            } else {
              key = msg
            }
          } else {
            key = 'errorUsernameTaken'
          }

          setError(key)
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page-root">
      <div className="auth-card">
        {/* 標題列 */}
        <div className="auth-header">
          <h2 className="auth-title">{t(lang, 'authTitle')}</h2>
          {onBack && (
            <button
              type="button"
              className="auth-back-btn"
              onClick={onBack}
            >
              {t(lang, 'backHome')}
            </button>
          )}
        </div>

        {/* 登入 / 註冊 tab 切換 */}
        <div className="auth-tabs">
          <button
            type="button"
            className={
              'auth-tab' + (tab === 'login' ? ' auth-tab-active' : '')
            }
            onClick={() => {
              setTab('login')
              setError('')
            }}
          >
            {t(lang, 'login')}
          </button>
          <button
            type="button"
            className={
              'auth-tab' + (tab === 'register' ? ' auth-tab-active' : '')
            }
            onClick={() => {
              setTab('register')
              setError('')
            }}
          >
            {t(lang, 'register')}
          </button>
        </div>

        {/* 錯誤訊息：一律當成 key 交給 t() 翻譯 */}
        {error && (
          <div className="auth-error-banner">
            {t(lang, error)}
          </div>
        )}

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* 註冊才選身分 & 車種 */}
          {tab === 'register' && (
            <>
              <div className="auth-field">
                <label className="auth-label">
                  {t(lang, 'roleLabel')}
                </label>
                <div className="auth-radio-group">
                  <label>
                    <input
                      type="radio"
                      value="passenger"
                      checked={role === 'passenger'}
                      onChange={() => {
                        setRole('passenger')
                        setCarType('')
                      }}
                    />
                    {t(lang, 'rolePassenger')}
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="driver"
                      checked={role === 'driver'}
                      onChange={() => setRole('driver')}
                    />
                    {t(lang, 'roleDriver')}
                  </label>
                </div>
              </div>

              {role === 'driver' && (
                <div className="auth-field">
                  <label className="auth-label">
                    {t(lang, 'carTypeLabel')}
                  </label>
                  <select
                    className="auth-input"
                    value={carType}
                    onChange={e => setCarType(e.target.value)}
                  >
                    <option value="">
                      {t(lang, 'selectCarTypeHint')}
                    </option>
                    <option value="YELLOW">
                      {t(lang, 'carTypeYellow')}
                    </option>
                    <option value="GREEN">
                      {t(lang, 'carTypeGreen')}
                    </option>
                    <option value="FHV">
                      {t(lang, 'carTypeFhv')}
                    </option>
                  </select>
                </div>
              )}
            </>
          )}

          {/* 帳號 */}
          <div className="auth-field">
            <label className="auth-label">
              {t(lang, 'usernameLabel')}
            </label>
            <input
              className="auth-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={t(lang, 'usernamePlaceholder')}
            />
          </div>

          {/* 密碼 */}
          <div className="auth-field">
            <label className="auth-label">
              {t(lang, 'passwordLabel')}
            </label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t(lang, 'passwordPlaceholder')}
            />
          </div>

          {/* 送出按鈕 */}
          <button
            type="submit"
            className="auth-submit-btn"
            disabled={submitting}
          >
            {tab === 'login'
              ? t(lang, 'login')
              : t(lang, 'registerNow')}
          </button>
        </form>
      </div>
    </div>
  )
}
