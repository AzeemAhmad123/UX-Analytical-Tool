import '../App.css'

const TaraBanner = () => {
  return (
    <section className="tara-banner">
      <div className="tara-banner-content">
        <div className="tara-badge">Coming soon</div>
        <div className="tara-subtitle">YOUR AI ANALYST</div>
        <h2 className="tara-title">Introducing Tara AI</h2>
        <button className="tara-cta">Learn More</button>
      </div>
      <div className="tara-visual">
        <img src="/images/tara-comming-soon.png" alt="Tara AI" className="tara-image" />
      </div>
    </section>
  )
}

export default TaraBanner

