// src/mapIcons.js
import L from 'leaflet';

// 乘客上車點：小人
export const passengerIcon = L.divIcon({
  className:
    'leaflet-div-icon custom-marker custom-marker-passenger',
  html: '🧍',          // 這裡用 emoji，之後要換成圖片也可以
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// 車輛位置：小車
export const carIcon = L.divIcon({
  className: 'leaflet-div-icon custom-marker custom-marker-car',
  html: '🚗',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});
