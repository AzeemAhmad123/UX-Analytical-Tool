import { Link } from 'react-router-dom'
import '../App.css'

const LandingHeader = () => {
  return (
    <header className="landing-header">
      <div className="landing-header-container">
        <Link to="/" className="landing-logo">
          UX<span className="logo-x">C</span>am
        </Link>
        
        <nav className="landing-nav">
          <a href="#why">Why UXCam <span>▼</span></a>
          <a href="#product">Product <span>▼</span></a>
          <a href="#solutions">Solutions <span>▼</span></a>
          <a href="#resources">Resources <span>▼</span></a>
          <a href="#pricing">Pricing <span>▼</span></a>
        </nav>
        
        <div className="landing-header-actions">
          <Link to="/login" className="btn-login-landing">Login</Link>
        </div>
      </div>
    </header>
  )
}

export default LandingHeader

