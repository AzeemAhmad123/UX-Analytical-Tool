import styles from './RealTimeInsights.module.css'

const RealTimeInsights = () => {
  return (
    <div className={styles.sectionWrapper}>
      <div className={styles.container}>
        <div className={styles.hero}>
          <small>EMPOWER YOUR PRODUCT TEAM</small>
          <h1>
            Truly actionable <br/>
            <span>real-time insights</span>
          </h1>
        </div>

        <div className={styles.content}>
          <div className={styles.features}>
            <div className={styles.card}>
              <h3><span>Understand how</span><br/>users behave</h3>
            </div>

            <div className={styles.card}>
              <h3>Have all your metrics<br/><span>in one place</span></h3>
              <p>
                Analyze how users interact with your app.
                Easily track your app's performance with our product.
              </p>
            </div>

            <div className={styles.card}>
              <h3><span>Analyze instantly</span><br/>with autocapture</h3>
              <p>
                Automatically capture screens, events, issues and gestures —
                all with a single snippet of code.
              </p>
              <a href="#">Learn more about autocapture →</a>
            </div>

            <div className={styles.card}>
              <h3>Keep your user data<br/><span>safe and secure</span></h3>
            </div>
          </div>

          <div className={styles.preview}>
            <video
              className={styles.video}
              autoPlay
              loop
              muted
              playsInline
              poster="/images/Hero-webp.webp"
            >
              <source src="/images/UXCam - Product Analytics Without The Complexity.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RealTimeInsights

