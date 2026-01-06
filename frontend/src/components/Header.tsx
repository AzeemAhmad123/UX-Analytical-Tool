import '../App.css'

const Header = () => {
  return (
    <header className="header">
      <a href="/" className="header-logo">
        UX<span className="logo-x">C</span>am
      </a>
      
      <nav>
        <ul className="nav-links">
          <li><a href="#why">Why UXCam <span>▼</span></a></li>
          <li><a href="#product">Product <span>▼</span></a></li>
          <li><a href="#solutions">Solutions <span>▼</span></a></li>
          <li><a href="#resources">Resources <span>▼</span></a></li>
          <li><a href="#pricing">Pricing <span>▼</span></a></li>
        </ul>
      </nav>
      
      <div className="header-actions">
        <button className="btn-login">Login</button>
        <button className="btn-trial">Start free trial</button>
        <button className="btn-demo">Get a demo</button>
      </div>
    </header>
  )
}

export default Header

