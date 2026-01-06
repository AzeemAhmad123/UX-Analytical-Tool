import '../App.css'

const LandingUsersLoveUs = () => {
  return (
    <section className="landing-users-love">
      <div className="landing-users-container">
        <p className="landing-badge-text">LEADER IN PRODUCT ANALYTICS</p>
        <h2>
          <span className="highlight-blue">Users</span> love us
        </h2>
        <p className="landing-users-subtitle">
          We've earned the trust of 37,000+ products worldwide.
        </p>

        <div className="landing-case-cards">
          <div className="landing-case-card">
            <div className="case-card-header">
              <div className="case-logo-circle red">CC</div>
              <a href="#" className="case-study-link">
                Case Study <span>→</span>
              </a>
            </div>
            <p className="case-metric">15%</p>
            <p className="case-description">Registration rate increase</p>
          </div>

          <div className="landing-case-card">
            <div className="case-card-header">
              <div className="case-logo-circle blue">HC</div>
              <a href="#" className="case-study-link">
                Case Study <span>→</span>
              </a>
            </div>
            <p className="case-metric">20%</p>
            <p className="case-description">Feature adoption increase</p>
          </div>

          <div className="landing-case-card">
            <div className="case-card-header">
              <div className="case-logo-circle green">PM</div>
              <a href="#" className="case-study-link">
                Case Study <span>→</span>
              </a>
            </div>
            <p className="case-metric">2x</p>
            <p className="case-description">Items sold</p>
          </div>
        </div>

        <div className="landing-ratings-section">
          <div className="landing-rating-card">
            <div className="stars-row">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="star-svg" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
            <div className="rating-text">
              <p className="rating-score">4.8/5</p>
              <p className="rating-source">G2</p>
            </div>
          </div>

          <div className="landing-rating-card">
            <div className="stars-row">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="star-svg" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
            <div className="rating-text">
              <p className="rating-score">4.7/5</p>
              <p className="rating-source">Gartner Peer Insights</p>
            </div>
          </div>

          <div className="landing-rating-card">
            <div className="stars-row">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="star-svg" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
            <div className="rating-text">
              <p className="rating-score">4.8/5</p>
              <p className="rating-source">Capterra</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LandingUsersLoveUs

