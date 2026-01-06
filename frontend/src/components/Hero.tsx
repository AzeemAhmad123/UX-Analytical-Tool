import '../App.css'

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h1>
            The easiest way to <span className="highlight">track your user journeys</span>
          </h1>
          <p>
            Finally, an analytics platform that works with your product. Track every interaction with your app or website.
          </p>
          
          <ul className="hero-features">
            <li>
              <span className="checkmark">✓</span>
              <span>Get faster insights</span>
            </li>
            <li>
              <span className="checkmark">✓</span>
              <span>Stop jumping between tools</span>
            </li>
            <li>
              <span className="checkmark">✓</span>
              <span>Install with AI in minutes</span>
            </li>
          </ul>
          
          <div className="hero-cta">
            <button className="btn-demo">Get a demo</button>
            <button className="btn-trial">Start free trial</button>
          </div>
        </div>
        
        <div className="hero-visuals">
          <div className="hero-background-image">
            <img src="/images/Hero-webp.webp" alt="Hero background" />
          </div>
          <div className="hero-card hero-card-large hero-card-gradient-orange">
            <img src="/images/jon.png" alt="Man with laptop" />
          </div>
          <div className="hero-card hero-card-medium hero-card-gradient-purple">
            <div className="hero-icons-grid">
              <img src="/images/Frame.svg" alt="Icon 1" className="hero-icon-svg" />
              <img src="/images/Frame__1_.svg" alt="Icon 2" className="hero-icon-svg" />
              <img src="/images/Frame__2_.svg" alt="Icon 3" className="hero-icon-svg" />
              <img src="/images/Frame__3_.svg" alt="Icon 4" className="hero-icon-svg" />
            </div>
          </div>
          <div className="hero-card hero-card-medium hero-card-gradient-mixed">
            <div className="hero-card-overlay">
              <img src="/images/misha.png" alt="Woman with smartphone" className="hero-card-person" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero

