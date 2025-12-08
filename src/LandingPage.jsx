// src/LandingPage.jsx
import './LandingPage.css'
import { t, languages } from './i18n'

export default function LandingPage({
  lang,
  onChangeLang,
  onPassengerClick,
  onDriverClick,
  onAuthClick,
}) {
  return (
    <div id="top" className="landing-root">
      {/* 導覽列 */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <div className="container">
          <a className="navbar-brand fw-bold" href="#top">
            SmartDispatch
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              {/* 我是乘客 */}
              <li className="nav-item">
                <a
                  className="nav-link active"
                  href="#"
                  onClick={e => {
                    e.preventDefault()
                    onPassengerClick?.()
                  }}
                >
                  {t(lang, 'landingNavPassenger')}
                </a>
              </li>

              {/* 我是司機 */}
              <li className="nav-item">
                <a
                  className="nav-link"
                  href="#"
                  onClick={e => {
                    e.preventDefault()
                    onDriverClick?.()
                  }}
                >
                  {t(lang, 'landingNavDriver')}
                </a>
              </li>

              {/* 登入 / 註冊 */}
              <li className="nav-item">
                <a
                  className="nav-link btn btn-primary text-white ms-2 px-3"
                  href="#"
                  onClick={e => {
                    e.preventDefault()
                    onAuthClick?.()
                  }}
                >
                  {t(lang, 'landingNavAuth')}
                </a>
              </li>
            </ul>

            {/* 語言切換 */}
            <div className="ms-3 d-flex align-items-center text-white">
              <span className="small me-2">{t(lang, 'language')}：</span>
              <select
                className="form-select form-select-sm bg-dark text-white border-secondary"
                style={{ width: 90 }}
                value={lang}
                onChange={e => onChangeLang?.(e.target.value)}
              >
                {languages.map(code => (
                  <option key={code} value={code}>
                    {code.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </nav>

      {/* 乘客 hero 區塊 */}
      <section className="hero-section" id="passenger">
        <div className="hero-overlay" />
        <div className="container hero-content">
          <div className="row align-items-center">
            <div className="col-lg-6 text-white mb-5 mb-lg-0">
              <h1 className="display-4 fw-bold">
                {t(lang, 'landingHeroTitle')}
              </h1>
              <p className="lead mb-4">
                {t(lang, 'landingHeroSubtitle')}
              </p>
            </div>

            <div className="col-lg-5 offset-lg-1">
              <div className="booking-card">
                <h3 className="fw-bold mb-4">
                  {t(lang, 'landingHeroWhereTo')}
                </h3>
                <form>
                  <div className="mb-3">
                    <label className="form-label text-muted small">
                      {t(lang, 'landingHeroPickupLabel')}
                    </label>
                    <input
                      key={`pickup-${lang}`} // 語言變更時重建 input，讓 defaultValue 也更新
                      type="text"
                      className="form-control form-control-lg"
                      placeholder={t(lang, 'landingHeroPickupPlaceholder')}
                      defaultValue={t(lang, 'landingHeroPickupDefault')}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted small">
                      {t(lang, 'landingHeroDropoffLabel')}
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      placeholder={t(lang, 'landingHeroDropoffPlaceholder')}
                    />
                  </div>

                  {/* 預估金額（之後要用再打開） */}
                  <div id="price-estimate" className="mb-3 d-none">
                    <p className="fw-bold text-success">
                      {t(lang, 'landingHeroPriceExample')}
                    </p>
                  </div>

                  {/* 查看價格與車輛 → 直接進入乘客端 */}
                  <button
                    type="button"
                    className="btn btn-dark w-100 btn-lg py-3 fw-bold"
                    onClick={() => onPassengerClick?.()}
                  >
                    {t(lang, 'landingHeroCta')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* 流程圖區塊 */}
      <section className="how-it-works-section py-5 bg-white">
        <div className="container text-center">
          <div className="mb-5">
            <span className="text-warning fw-bold text-uppercase ls-1">
              {t(lang, 'landingHowTitleTag')}
            </span>
            <h2 className="fw-bold mt-2">
              {t(lang, 'landingHowTitle')}
            </h2>
            <p className="text-muted">
              {t(lang, 'landingHowSubtitle')}
            </p>
          </div>

          <div className="row justify-content-center">
            {/* Step 1 */}
            <div className="col-md-4 mb-4 mb-md-0 position-relative">
              <div className="step-card p-4">
                <div className="icon-circle bg-warning text-dark mb-4 mx-auto d-flex align-items-center justify-content-center shadow">
                  <i className="bi bi-geo-alt-fill fs-2" />
                </div>
                <h4 className="fw-bold">
                  {t(lang, 'landingHowStep1Title')}
                </h4>
                <p className="text-muted">
                  {t(lang, 'landingHowStep1Desc')}
                </p>
              </div>
              <div className="d-none d-md-block position-absolute top-50 end-0 translate-middle-y text-muted">
                <i className="bi bi-chevron-right fs-1" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="col-md-4 mb-4 mb-md-0 position-relative">
              <div className="step-card p-4">
                <div className="icon-circle bg-dark text-warning mb-4 mx-auto d-flex align-items-center justify-content-center shadow">
                  <i className="bi bi-cpu-fill fs-2" />
                </div>
                <h4 className="fw-bold">
                  {t(lang, 'landingHowStep2Title')}
                </h4>
                <p className="text-muted">
                  {t(lang, 'landingHowStep2Desc')}
                </p>
              </div>
              <div className="d-none d-md-block position-absolute top-50 end-0 translate-middle-y text-muted">
                <i className="bi bi-chevron-right fs-1" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="col-md-4">
              <div className="step-card p-4">
                <div className="icon-circle bg-warning text-dark mb-4 mx-auto d-flex align-items-center justify-content-center shadow">
                  <i className="bi bi-emoji-smile-fill fs-2" />
                </div>
                <h4 className="fw-bold">
                  {t(lang, 'landingHowStep3Title')}
                </h4>
                <p className="text-muted">
                  {t(lang, 'landingHowStep3Desc')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <button
              type="button"
              className="btn btn-dark btn-lg px-5 rounded-pill shadow-sm"
              onClick={() => onPassengerClick?.()}
            >
              {t(lang, 'landingHowCta')}
              <i className="bi bi-arrow-right ms-2" />
            </button>
          </div>
        </div>
      </section>

      {/* 司機招募區塊 */}
      <section className="driver-section" id="driver">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6 mb-4 mb-md-0">
              <img
                src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=800&auto=format&fit=crop"
                className="img-fluid rounded shadow"
                alt="Driver App UI"
              />
            </div>
            <div className="col-md-6">
              <span className="badge bg-warning text-dark mb-2">
                {t(lang, 'landingDriverBadge')}
              </span>
              <h2 className="fw-bold mb-3">
                {t(lang, 'landingDriverTitleLine1')}
                <br />
                {t(lang, 'landingDriverTitleLine2')}
              </h2>
              <p className="text-muted">
                {t(lang, 'landingDriverIntro')}
              </p>

              <ul className="list-unstyled mt-4">
                <li className="mb-3">
                  <h5 className="fw-bold">
                    {t(lang, 'landingDriverFeature1Title')}
                  </h5>
                  <p className="small text-muted">
                    {t(lang, 'landingDriverFeature1Desc')}
                  </p>
                </li>
                <li className="mb-3">
                  <h5 className="fw-bold">
                    {t(lang, 'landingDriverFeature2Title')}
                  </h5>
                  <p className="small text-muted">
                    {t(lang, 'landingDriverFeature2Desc')}
                  </p>
                </li>
              </ul>

              <button
                type="button"
                className="btn btn-outline-dark mt-3"
                onClick={() => onDriverClick?.()}
              >
                {t(lang, 'landingDriverCta')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="bg-dark text-white py-5 text-center">
        <div className="container">
          <h3 className="mb-4">
            {t(lang, 'landingFooterTitle')}
          </h3>
          <div className="d-flex justify-content-center gap-3">
            <button className="btn btn-light btn-lg">
              {t(lang, 'landingFooterIos')}
            </button>
            <button className="btn btn-light btn-lg">
              {t(lang, 'landingFooterAndroid')}
            </button>
          </div>
          <p className="mt-5 text-white-50 small">
            {t(lang, 'landingFooterCopyright')}
          </p>
        </div>
      </footer>
    </div>
  )
}
