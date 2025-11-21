// src/views/RiderView.jsx
import { useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from 'react-leaflet';
import { passengerIcon, carIcon } from '../mapIcons';

function RiderView({
  center,
  places,
  drivers,
  orders,
  myOrderId,
  onCreateOrder,
  t,
}) {
  const [pickupId, setPickupId] = useState(places[0]?.id);
  const [dropoffId, setDropoffId] = useState(places[1]?.id);

  const myOrder = orders.find((o) => o.id === myOrderId) || null;

  // 如果訂單已被司機接單 → 算路線 + ETA
  let route = [];
  let etaText = '';
  if (myOrder && myOrder.driverId) {
    const driver = drivers.find((d) => d.id === myOrder.driverId);
    if (driver) {
      const pickup = myOrder.pickup;
      const dropoff = myOrder.dropoff;

      route = [
        [driver.lat, driver.lng],
        [pickup.lat, pickup.lng],
        [dropoff.lat, dropoff.lng],
      ];

      const dist =
        distanceKm(
          { lat: driver.lat, lng: driver.lng },
          pickup
        ) + distanceKm(pickup, dropoff);

      const speedKmh = 30;
      const etaMin = Math.round((dist / speedKmh) * 60);
      const distText = dist.toFixed(1);

      // 用各語言的句子組合 ETA
      etaText = `${t.etaPrefix} ${distText} ${
        t.etaUnitKm
      }，${t.etaSuffixMin.replace('{min}', etaMin)}`;
    }
  }

  const mapCenter = route.length ? route[0] : center;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pickupId === dropoffId) {
      alert('上車地點與目的地不能相同');
      return;
    }
    onCreateOrder({ pickupId, dropoffId });
  };

  return (
    <div className="role-view">
      {/* 上半部：地圖 */}
      <div className="uber-dispatch-map">
        <MapContainer
          center={mapCenter}
          zoom={13}
          scrollWheelZoom={true}
          className="map-container"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* 訂單的上車 / 下車點 */}
          {myOrder && (
            <>
              {/* 上車：小人圖示 */}
              <Marker
                position={[myOrder.pickup.lat, myOrder.pickup.lng]}
                icon={passengerIcon}
              >
                <Popup>
                  {t.pickupLabel}：{myOrder.pickup.name}
                </Popup>
              </Marker>

              {/* 目的地：預設藍色 marker */}
              <Marker
                position={[
                  myOrder.dropoff.lat,
                  myOrder.dropoff.lng,
                ]}
              >
                <Popup>
                  {t.dropoffLabel}：{myOrder.dropoff.name}
                </Popup>
              </Marker>
            </>
          )}

          {/* 司機 & 路線 */}
          {myOrder &&
            myOrder.driverId &&
            drivers
              .filter((d) => d.id === myOrder.driverId)
              .map((driver) => (
                <Marker
                  key={driver.id}
                  position={[driver.lat, driver.lng]}
                  icon={carIcon}
                >
                  <Popup>
                    {t.mapDriverLabel}：{driver.name}
                  </Popup>
                </Marker>
              ))}

          {route.length > 1 && (
            <Polyline
              positions={route}
              pathOptions={{ color: '#22c55e', weight: 5 }}
            />
          )}
        </MapContainer>
      </div>

      {/* 下半部：Uber 風 bottom sheet */}
      <div className="uber-dispatch-sheet">
        <div className="sheet-handle" />
        <div className="sheet-inner">
          <h2>{t.riderTitle}</h2>

          {/* 叫車表單 */}
          <form onSubmit={handleSubmit} className="rider-form">
            <label>
              {t.pickupLabel}
              <select
                value={pickupId}
                onChange={(e) => setPickupId(e.target.value)}
              >
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t.dropoffLabel}
              <select
                value={dropoffId}
                onChange={(e) => setDropoffId(e.target.value)}
              >
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit">{t.requestRideButton}</button>
          </form>

          {/* 訂單狀態 */}
          {myOrder && (
            <div className="rider-status">
              <div>
                {t.orderIdLabel}：{myOrder.id}
              </div>
              <div>
                {t.statusLabel}：
                {myOrder.status === 'pending'
                  ? t.waitingDriver
                  : t.driverAccepted}
              </div>
              {etaText && <div>{etaText}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Haversine 距離
function distanceKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLng = (b.lng - a.lng) * (Math.PI / 180);
  const lat1 = a.lat * (Math.PI / 180);
  const lat2 = b.lat * (Math.PI / 180);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const aa =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

export default RiderView;
