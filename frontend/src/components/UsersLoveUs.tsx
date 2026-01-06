import '../App.css'

const UsersLoveUs = () => {
  return (
    <section className="users-love-section">
      <div className="badge">LEADER IN PRODUCT ANALYTICS</div>
      <h2>
        <span className="highlight">Users</span> love us
      </h2>
      <p>We've earned the trust of 37,000+ products worldwide.</p>
      
      <div className="case-study-cards">
        <div className="case-card">
          <div className="case-card-header">
            <div className="case-card-logo">COSTA COFFEE</div>
            <a href="#" className="case-card-link">
              Case Study →
            </a>
          </div>
          <div className="case-card-metric">15%</div>
          <div className="case-card-description">Registration rate increase</div>
        </div>
        
        <div className="case-card">
          <div className="case-card-header">
            <div className="case-card-logo">HOUSING.COM</div>
            <a href="#" className="case-card-link">
              Case Study →
            </a>
          </div>
          <div className="case-card-metric">20%</div>
          <div className="case-card-description">Feature adoption increase</div>
        </div>
        
        <div className="case-card">
          <div className="case-card-header">
            <div className="case-card-logo">PlaceMakers</div>
            <a href="#" className="case-card-link">
              Case Study →
            </a>
          </div>
          <div className="case-card-metric">2x</div>
          <div className="case-card-description">Items sold</div>
        </div>
      </div>
    </section>
  )
}

export default UsersLoveUs

