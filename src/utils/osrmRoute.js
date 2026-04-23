// src/utils/osrmRoute.js
import { apiFetch } from '../apiBase.js'

const routeCache = new Map()
const ROUTE_TTL_MS = 2 * 60 * 1000

function keyFromPoints(points) {
  return points
    .map(p => `${(+p.lat).toFixed(5)},${(+p.lng).toFixed(5)}`)
    .join('|')
}

async function fetchOsrm(points, { signal } = {}) {
  if (!Array.isArray(points) || points.length < 2) {
    throw new Error('Need at least 2 points')
  }

  const key = keyFromPoints(points)
  const hit = routeCache.get(key)
  if (hit && Date.now() - hit.t < ROUTE_TTL_MS) {
    return hit.v
  }

  let allCoords = []
  let totalDist = 0

  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1]
    const to = points[i]

    const res = await apiFetch('/api/route', {
      timeoutMs: 20000,
      signal,
      query: {
        fromLat: from.lat,
        fromLng: from.lng,
        toLat: to.lat,
        toLng: to.lng,
      },
    })

    if (!res.ok) throw new Error(`Route API error ${res.status}`)

    const data = await res.json()
    const coords = Array.isArray(data?.coords) ? data.coords : []
    const dist = Number(data?.dist)

    if (coords.length < 2) throw new Error('No route coords')

    if (allCoords.length && coords.length) {
      allCoords = allCoords.concat(coords.slice(1))
    } else {
      allCoords = coords
    }

    if (Number.isFinite(dist)) totalDist += dist
  }

  const result = {
    coords: allCoords,
    distKm: totalDist,
  }

  routeCache.set(key, { t: Date.now(), v: result })
  return result
}

export async function getOsrmRoute(from, to, opts = {}) {
  return fetchOsrm([from, to], opts)
}

export async function getOsrmRouteMulti(points, opts = {}) {
  return fetchOsrm(points, opts)
}

export function estimateFareUSD(distKm) {
  const base = 2.5
  const perKm = 1.5
  return base + perKm * Math.max(1, distKm)
}

export function 預估車資(usd) {
  return usd
}