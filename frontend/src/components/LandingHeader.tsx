import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import '../App.css'

const LandingHeader = () => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`landing-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="landing-header-container">
        <Link to="/" className="landing-logo">
          <span className="logo-text">UX</span>
          <span className="logo-accent">Cam</span>
        </Link>
        
        <nav className="landing-nav">
          <a href="#why" className="nav-link">
            Why UXCam
            <ChevronDown size={14} className="nav-chevron" />
          </a>
          <a href="#product" className="nav-link">
            Product
            <ChevronDown size={14} className="nav-chevron" />
          </a>
          <a href="#solutions" className="nav-link">
            Solutions
            <ChevronDown size={14} className="nav-chevron" />
          </a>
          <a href="#resources" className="nav-link">
            Resources
            <ChevronDown size={14} className="nav-chevron" />
          </a>
          <a href="#pricing" className="nav-link">
            Pricing
            <ChevronDown size={14} className="nav-chevron" />
          </a>
        </nav>
        
        <div className="landing-header-actions">
          <Link to="/login" className="btn-login-landing">Log in</Link>
          <Link to="/signup" className="btn-trial-landing">Start free trial</Link>
        </div>
      </div>
    </header>
  )
}

export default LandingHeader

