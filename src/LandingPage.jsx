// src/LandingPage.jsx
import React from "react";
import "./App.css"; // 用現有的樣式檔

export default function LandingPage({ onEnterWebApp }) {
  return (
    <div className="landing-root">
      {/* Hero 區 */}
      <header className="landing-hero">
        <div className="landing-hero-text">
          <h1>SmartTaxi 智慧派車系統</h1>
          <p className="landing-subtitle">
            一鍵叫車，乘客與司機雙端協作，搭配 1–10 分派遣適合度，幫你找到最合適的車。
          </p>

          <div className="landing-hero-buttons">
            <button className="btn primary" onClick={onEnterWebApp}>
              立即叫車（Web 版）
            </button>
            <a
              className="btn ghost"
              href="https://example.com/passenger-app"
              target="_blank"
              rel="noreferrer"
            >
              下載乘客端 Passenger App
            </a>
            <a
              className="btn ghost"
              href="https://example.com/driver-app"
              target="_blank"
              rel="noreferrer"
            >
              下載司機端 Driver App
            </a>
          </div>
        </div>

        <div className="landing-hero-panel">
          <div className="mini-card">
            <h3>派遣分數預覽</h3>
            <p>以距離為主，為每一筆訂單計算 1–10 分適合度。</p>
            <ul>
              <li>司機 A · 距離 0.8 km · 分數 <strong>9.5</strong></li>
              <li>司機 B · 距離 1.6 km · 分數 <strong>7.8</strong></li>
              <li>司機 C · 距離 3.1 km · 分數 <strong>5.2</strong></li>
            </ul>
            <p className="mini-note">分數越高越適合接這筆訂單。</p>
          </div>
        </div>
      </header>

      {/* 功能卡片區 */}
      <section className="landing-section">
        <h2>為什麼選擇 SmartTaxi？</h2>
        <div className="card-grid">
          <div className="feature-card">
            <h3>隨時隨地叫車</h3>
            <p>
              不管在 PC 或手機，只要打開網站或 App，輸入上車地點與目的地，即可一鍵叫車。
            </p>
          </div>
          <div className="feature-card">
            <h3>乘客端 & 司機端雙 App</h3>
            <p>
              乘客建立訂單、司機選擇要接的訂單，雙端透過同一個雲端後端即時同步。
            </p>
          </div>
          <div className="feature-card">
            <h3>派遣適合度分數</h3>
            <p>
              以距離為基礎，為每一筆訂單計算 1–10
              分分數，協助系統與司機快速找到最適合的車。
            </p>
          </div>
          <div className="feature-card">
            <h3>即時地圖與路線</h3>
            <p>
              乘客可以看到司機即時位置與行車路線，司機則能看到最佳前往路徑與預估時間。
            </p>
          </div>
        </div>
      </section>

      {/* 流程說明區 */}
      <section className="landing-section dark">
        <h2>系統如何運作？</h2>
        <ol className="flow-list">
          <li>乘客在網站或 App 輸入上車地點與目的地，送出叫車需求。</li>
          <li>系統搜尋附近空車，為每一台車計算 1–10 分派遣適合度（先以距離為主）。</li>
          <li>將最適合的車推薦給司機與乘客，司機可以選擇是否接單。</li>
          <li>司機接單後，乘客可即時看到車輛位置與預估抵達時間，直至行程完成。</li>
        </ol>
      </section>

      {/* 下載區 */}
      <section className="landing-section">
        <h2>立即下載 App，開始你的行程</h2>
        <p className="center-text">
          SmartTaxi 支援 iOS / Android 與 Web，之後只要更新下面的下載連結，就能讓任何人安裝使用。
        </p>
        <div className="download-buttons">
          <a
            className="btn primary"
            href="https://example.com/passenger-app"
            target="_blank"
            rel="noreferrer"
          >
            乘客端 Passenger App 下載
          </a>
          <a
            className="btn outline"
            href="https://example.com/driver-app"
            target="_blank"
            rel="noreferrer"
          >
            司機端 Driver App 下載
          </a>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} SmartTaxi Dispatch System. All rights reserved.</p>
      </footer>
    </div>
  );
}
