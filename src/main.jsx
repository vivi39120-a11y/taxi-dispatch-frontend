import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';                // 版面樣式
import 'leaflet/dist/leaflet.css'; // 地圖樣式

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
