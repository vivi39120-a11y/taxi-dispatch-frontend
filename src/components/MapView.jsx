import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// 紐約中心點（Times Square 附近）放在檔案頂部，**不要放在 return 裡**
const NYC_CENTER = [40.758, -73.9855];

function MapView({ drivers, selectedDriverId, setSelectedDriverId, t }) {
  const renderDriverStatus = (statusCode) => {
    switch (statusCode) {
      case 'available':
        return t.statusAvailable;
      case 'on_trip':
        return t.statusOnTrip;
      case 'heading':
        return t.statusHeading;
      default:
        return t.statusUnknown;
    }
  };

  return (
    <MapContainer
      center={NYC_CENTER}
      zoom={13}
      scrollWheelZoom={true}
      className="map-container"
    >
      {/* 地圖底圖（OpenStreetMap） */}
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 司機 Marker 通通放在 MapContainer 裡面 */}
      {drivers.map((driver) => (
        <Marker
          key={driver.id}
          position={[driver.lat, driver.lng]}
          eventHandlers={{
            click: () => setSelectedDriverId(driver.id),
          }}
        >
          <Popup>
            <div>
              {t.mapDriverLabel}：{driver.name}
            </div>
            <div>
              {t.status}：{renderDriverStatus(driver.status)}
            </div>
            {driver.id === selectedDriverId && (
              <div>{t.mapSelected}</div>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default MapView;
