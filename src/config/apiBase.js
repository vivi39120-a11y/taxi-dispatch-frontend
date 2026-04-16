// src/config/apiBase.js
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:8000'

export function apiUrl(path = '') {
  if (!path) return API_ORIGIN

  // 若你傳進來已經是完整 URL，就直接回傳
  if (/^https?:\/\//i.test(path)) return path

  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_ORIGIN.replace(/\/$/, '')}${p}`
}
