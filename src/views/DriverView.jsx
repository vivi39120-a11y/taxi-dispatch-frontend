// src/views/DriverView.jsx
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from 'react-leaflet';
import { passengerIcon, carIcon } from '../mapIcons';

function DriverView({
  center,
  drivers,
  orders,
  currentDriverId,
  setCurrentDriverId,
  onAcceptOrder,
  t,
}) {
  // ---- 關鍵修正：把 id 統一成字串來比對 ----
  const selectedId =
    currentDriverId != null
      ? String(currentDriverId)
      : drivers[0]
      ? String(drivers[0].id)
      : null;

  const driver =
    (selectedId &&
      drivers.find((d) => String(d.id) === selectedId)) ||
    drivers[0] ||
    null;
  // ----------------------------------------

  const pendingOrders = orders.filter(
    (o) => o.status === 'pending'
  );

  const myOrder =
    driver &&
    (orders.find((o) => o.driverId === driver.id) || null);

  // 這個司機有接單 → 算路線 + ETA
  let route = [];
  let etaText = '';
  if (driver && myOrder) {
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
    etaText = `${t.etaPrefix} ${distText} ${
      t.etaUnitKm
    }，${t.etaSuffixMin.replace('{min}', etaMin)}`;
  }

  const mapCenter = driver ? [driver.lat, driver.lng] : center;

  return (
    <div className="role-view">
      {/* 地圖 */}
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

          {/* 自己這台車：小車 icon */}
          {driver && (
            <Marker
              position={[driver.lat, driver.lng]}
              icon={carIcon}
            >
              <Popup>
                {t.mapDriverLabel}：{driver.name}
              </Popup>
            </Marker>
          )}

          {/* 等待中的訂單：上車點用小人 icon */}
          {pendingOrders.map((order) => (
            <Marker
              key={order.id}
              position={[
                order.pickup.lat,
                order.pickup.lng,
              ]}
              icon={passengerIcon}
            >
              <Popup>
                {t.pickupLabel}：{order.pickup.name}
              </Popup>
            </Marker>
          ))}

          {/* 已接單行程路線 */}
          {driver && myOrder && route.length > 1 && (
            <Polyline
              positions={route}
              pathOptions={{ color: '#22c55e', weight: 5 }}
            />
          )}
        </MapContainer>
      </div>

      {/* bottom sheet */}
      <div className="uber-dispatch-sheet">
        <div className="sheet-handle" />
        <div className="sheet-inner">
          <h2>{t.driverTitle}</h2>

          {driver && (
            <div className="driver-info">
              <div>
                {t.driverCurrent}：{driver.name}
              </div>
              <div>
                {t.driverPlate}：{driver.carPlate}
              </div>

              <label>
                {t.driverSwitchLabel}：
                <select
                  // 這裡也用 selectedId（字串），就不會鎖在第一個
                  value={selectedId ?? ''}
                  onChange={(e) =>
                    setCurrentDriverId(e.target.value)
                  }
                >
                  {drivers.map((d) => (
                    <option
                      key={d.id}
                      value={String(d.id)}
                    >
                      {d.name} - {d.carPlate}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {/* 可接訂單清單 */}
          <div className="order-list">
            <h3>{t.driverOrderListTitle}</h3>
            {pendingOrders.length === 0 && (
              <div className="small">{t.driverNoOrders}</div>
            )}
            {pendingOrders.map((order) => (
              <div key={order.id} className="order-card">
                <div>
                  {t.pickupLabel}：{order.pickup.name}
                </div>
                <div>
                  {t.dropoffLabel}：{order.dropoff.name}
                </div>
                <button
                  onClick={() =>
                    driver && onAcceptOrder(order.id, driver.id)
                  }
                >
                  {t.driverTakeThisOrder}
                </button>
              </div>
            ))}
          </div>

          {/* 目前行程狀態 */}
          {driver && myOrder && (
            <div className="driver-trip-status">
              <h3>{t.driverTripTitle}</h3>
              <div>
                {t.pickupLabel}：{myOrder.pickup.name}
              </div>
              <div>
                {t.dropoffLabel}：{myOrder.dropoff.name}
              </div>
              <div>{etaText}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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

export default DriverView;
