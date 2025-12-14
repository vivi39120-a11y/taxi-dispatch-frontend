// src/utils/osrmRoute.js

// 呼叫 OSRM 取得路線（依道路行駛）
export async function getOsrmRoute(from, to) {
  // from / to: { lat, lng }
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=full&geometries=geojson`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.routes || !data.routes.length) {
    throw new Error('No OSRM route');
  }

  const route = data.routes[0];

  return {
    // 轉成 [lat, lng] 給 Leaflet 用
    coords: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    // 公里
    distKm: route.distance / 1000,
  };
}

// 距離 -> 預估車資（USD）
export function estimateFareUSD(distKm) {
  const base = 2.5;        // 起跳
  const perKm = 1.5;       // 每公里
  return base + perKm * Math.max(1, distKm);
}

// 顯示成 $
export function 預估車資(usd) {
  return usd ;
}
