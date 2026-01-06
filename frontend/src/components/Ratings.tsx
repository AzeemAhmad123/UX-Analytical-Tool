import '../App.css'

const Ratings = () => {
  return (
    <section className="ratings-section">
      <div className="rating-item">
        <span>⭐</span>
        <span>4.8/5</span>
        <span>Gartner rating</span>
      </div>
      <div className="rating-item">
        <span>🔒</span>
        <span>Flexible data centers</span>
      </div>
      <div className="rating-item">
        <span>🏢</span>
        <span>Built for performance</span>
      </div>
    </section>
  )
}

export default Ratings

