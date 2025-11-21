import { MapContainer, TileLayer, Polyline, CircleMarker } from 'react-leaflet';

// 假的起點 / 終點 / 車子位置（台北、新北附近）
const pickup = [25.173, 121.445];   // 淡水附近
const dropoff = [25.003, 121.473];  // 中和附近
const carPos = [25.11, 121.45];     // 車子在路上中間

const center = [
  (pickup[0] + dropoff[0]) / 2,
  (pickup[1] + dropoff[1]) / 2,
];

const route = [pickup, carPos, dropoff];

function PassengerMap() {
  return (
    <MapContainer
      center={center}
      zoom={11}
      scrollWheelZoom={false}
      className="passenger-map"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 路線 */}
      <Polyline
        positions={route}
        pathOptions={{ color: '#111827', weight: 6, opacity: 0.9 }}
      />

      {/* 車子（紅圈） */}
      <CircleMarker
        center={carPos}
        radius={10}
        pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }}
      />

      {/* 起點 / 終點 */}
      <CircleMarker
        center={pickup}
        radius={8}
        pathOptions={{ color: '#111827', fillColor: '#ffffff', fillOpacity: 1 }}
      />
      <CircleMarker
        center={dropoff}
        radius={8}
        pathOptions={{ color: '#111827', fillColor: '#111827', fillOpacity: 1 }}
      />
    </MapContainer>
  );
}

export default PassengerMap;
