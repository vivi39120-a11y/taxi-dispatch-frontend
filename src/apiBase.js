// src/apiBase.js
const APP_API_ORIGIN =
  import.meta.env.VITE_APP_API_ORIGIN || window.location.origin

const MODEL_API_ORIGIN =
  import.meta.env.VITE_MODEL_API_ORIGIN || 'https://taxi-hotspot-backend.onrender.com'

const MODEL_API_PATHS = new Set([
  '/api/health',
  '/api/zone-hotspots',
  '/api/dispatch-recommendations',
  '/api/route',
])

function normalizePath(path = '') {
  if (!path) return '/'
  if (/^https?:\/\//i.test(path)) return path
  return path.startsWith('/') ? path : `/${path}`
}

export function apiUrl(path = '') {
  if (!path) return APP_API_ORIGIN

  if (/^https?:\/\//i.test(path)) return path

  const p = normalizePath(path)
  const origin = MODEL_API_PATHS.has(p) ? MODEL_API_ORIGIN : APP_API_ORIGIN
  return `${origin.replace(/\/$/, '')}${p}`
}

export async function apiFetch(path, options = {}) {
  const {
    timeoutMs = 15000,
    query,
    headers,
    ...rest
  } = options

  const url = new URL(apiUrl(path))

  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([k, v]) => {
      if (v != null) url.searchParams.set(k, String(v))
    })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url.toString(), {
      ...rest,
      headers: {
        ...(headers || {}),
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}