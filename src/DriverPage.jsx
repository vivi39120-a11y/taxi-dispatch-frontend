import React from 'react';

export default function DriverPage({ onBack }) {
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 司機端導覽列*/}
      <nav className="navbar navbar-dark bg-dark px-3" style={{ flexShrink: 0 }}>
        <span className="navbar-brand mb-0 h1">
          <i className="bi bi-taxi-front-fill me-2"></i>
          司機派遣系統
        </span>
        <button 
          className="btn btn-outline-light btn-sm"
          onClick={onBack}
        >
          回首頁
        </button>
      </nav>

      {/* 加入熱力圖模型 */}
      <div style={{ flexGrow: 1, position: 'relative' }}>
        <iframe
          src="/driver-map.html"
          title="Driver Dispatch Map"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        />
      </div>
      
    </div>
  );
}
