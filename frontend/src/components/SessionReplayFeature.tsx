import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './SessionReplayFeature.module.css'

gsap.registerPlugin(ScrollTrigger)

const SessionReplayFeature = () => {
  const sectionRef = useRef<HTMLDivElement>(null)
  const phoneRef = useRef<HTMLDivElement>(null)
  const sessionCardRef = useRef<HTMLDivElement>(null)
  const signupCardRef = useRef<HTMLDivElement>(null)
  const playbackControlsRef = useRef<HTMLDivElement>(null)
  const resolveCardRef = useRef<HTMLDivElement>(null)
  const testimonialCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate phone with scale and rotation
      if (phoneRef.current) {
        gsap.from(phoneRef.current, {
          opacity: 0,
          scale: 0.8,
          rotation: -5,
          duration: 1.2,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: phoneRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })

        // Continuous subtle animation for phone
        gsap.to(phoneRef.current, {
          y: -10,
          duration: 2,
          ease: 'power1.inOut',
          yoyo: true,
          repeat: -1
        })
      }

      // Animate session card from left
      if (sessionCardRef.current) {
        gsap.from(sessionCardRef.current, {
          opacity: 0,
          x: -100,
          duration: 0.8,
          delay: 0.3,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sessionCardRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        })
      }

      // Animate signup card from right
      if (signupCardRef.current) {
        gsap.from(signupCardRef.current, {
          opacity: 0,
          x: 100,
          duration: 0.8,
          delay: 0.5,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: signupCardRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        })

        // Animate chart bars
        const chartBars = signupCardRef.current.querySelectorAll(`.${styles.chartBar}`)
        chartBars.forEach((bar, index) => {
          gsap.from(bar, {
            height: 0,
            duration: 0.6,
            delay: 0.7 + index * 0.1,
            ease: 'power2.out'
          })
        })
      }

      // Animate playback controls
      if (playbackControlsRef.current) {
        gsap.from(playbackControlsRef.current, {
          opacity: 0,
          y: 30,
          duration: 0.8,
          delay: 0.4,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: playbackControlsRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        })
      }

      // Animate resolve card
      if (resolveCardRef.current) {
        gsap.from(resolveCardRef.current, {
          opacity: 0,
          y: 50,
          scale: 0.95,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: resolveCardRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        })
      }

      // Animate testimonial card
      if (testimonialCardRef.current) {
        gsap.from(testimonialCardRef.current, {
          opacity: 0,
          y: 50,
          scale: 0.95,
          duration: 0.8,
          delay: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: testimonialCardRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        })
      }

      // Animate color blob inside phone
      const colorBlob = phoneRef.current?.querySelector(`.${styles.colorBlob}`)
      if (colorBlob) {
        gsap.to(colorBlob, {
          backgroundPosition: '200% 0',
          duration: 5,
          ease: 'none',
          repeat: -1
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={sectionRef} className={styles.sectionWrapper}>
      <div className={styles.container}>
        {/* Left Side - Visual Demonstration */}
        <div className={styles.visualSection}>
          <div className={styles.phoneContainer}>
            {/* Session Replay Button with Cursor */}
            <div className={styles.sessionReplayButton}>
              <button className={styles.replayBtn}>Session replay</button>
              <div className={styles.cursor}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="#1a1a1a" stroke="white" strokeWidth="1.5"/>
                  <circle cx="20" cy="4" r="2" fill="white"/>
                </svg>
              </div>
            </div>

            {/* Smartphone */}
            <div className={styles.phoneWrapper}>
              <div ref={phoneRef} className={styles.phone}>
                <div className={styles.phoneScreen}>
                  <div className={styles.phoneStatusBar}>
                    <span className={styles.time}>9:41</span>
                    <div className={styles.statusIcons}>
                      <span className={styles.signal}>📶</span>
                      <span className={styles.wifi}>📶</span>
                      <span className={styles.battery}>🔋</span>
                    </div>
                  </div>
                  <div className={styles.phoneContent}>
                    <div className={styles.phoneHeader}>
                      <div className={styles.avatarPlaceholder}></div>
                      <div className={styles.headerLines}>
                        <div className={styles.line}></div>
                        <div className={styles.line}></div>
                        <div className={styles.line}></div>
                      </div>
                    </div>
                    <div className={styles.colorBlob}></div>
                    <div className={styles.phoneText}>
                      <div className={styles.textLine}></div>
                      <div className={styles.textLine}></div>
                    </div>
                    <div className={styles.phoneCard}></div>
                  </div>
                </div>
              </div>
              
              {/* Playback Controls - positioned below phone */}
              <div ref={playbackControlsRef} className={styles.playbackControls}>
                <button className={styles.controlBtn}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M6 4L6 16L2 10L6 4Z" fill="#4b5563"/>
                    <rect x="6" y="8" width="2" height="4" fill="#4b5563"/>
                  </svg>
                </button>
                <button className={`${styles.controlBtn} ${styles.playBtn}`}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="6" y="4" width="3" height="12" fill="white"/>
                    <rect x="11" y="4" width="3" height="12" fill="white"/>
                  </svg>
                </button>
                <button className={styles.controlBtn}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M14 4L14 16L18 10L14 4Z" fill="#4b5563"/>
                    <rect x="12" y="8" width="2" height="4" fill="#4b5563"/>
                  </svg>
                </button>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill}></div>
                </div>
                <button className={styles.functionBtn}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2L10 6L14 7L10 8L8 12L6 8L2 7L6 6L8 2Z" fill="#3b82f6"/>
                  </svg>
                </button>
                <button className={styles.functionBtn}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2L10 4L12 2L10 6L14 6L12 8L14 10L10 10L12 12L10 14L8 12L6 14L8 12L6 10L2 10L4 8L2 6L6 6L8 2Z" fill="#3b82f6"/>
                  </svg>
                </button>
                <button className={styles.functionBtn}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8L6 2L10 8L8 10L6 12L2 8Z" fill="#3b82f6"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Session Activity Card */}
            <div ref={sessionCardRef} className={styles.sessionCard}>
              <div className={styles.sessionHeader}>
                <span className={styles.sessionNumber}>Session #347</span>
                <h3 className={styles.sessionTitle}>01:03 Home Activity</h3>
              </div>
              <div className={styles.activityList}>
                <div className={styles.activityItem}>
                  <div className={styles.activityIcon}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2L10 6L14 7L10 8L8 12L6 8L2 7L6 6L8 2Z" fill="#9ca3af"/>
                    </svg>
                  </div>
                  <span className={styles.activityTime}>0:03.8</span>
                  <span className={styles.activityLabel}>Button Pressed</span>
                </div>
                <div className={styles.activityItem}>
                  <div className={styles.activityIcon}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8L6 2L10 8L8 10L6 12L2 8Z" fill="#9ca3af"/>
                    </svg>
                  </div>
                  <span className={styles.activityTime}>0:03.8</span>
                  <span className={styles.activityLabel}>Rage Tap</span>
                </div>
                <div className={styles.activityItem}>
                  <div className={styles.activityIcon}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="2" width="5" height="5" fill="#9ca3af"/>
                      <rect x="9" y="2" width="5" height="5" fill="#9ca3af"/>
                      <rect x="2" y="9" width="5" height="5" fill="#9ca3af"/>
                      <rect x="9" y="9" width="5" height="5" fill="#9ca3af"/>
                    </svg>
                  </div>
                  <span className={styles.activityTime}>0:03.8</span>
                  <span className={styles.activityLabel}>View Group</span>
                </div>
              </div>
            </div>


            {/* Sign-up Rate Card */}
            <div ref={signupCardRef} className={styles.signupCard}>
              <div className={styles.signupHeader}>
                <span className={styles.signupLabel}>Sign-up rate</span>
              </div>
              <div className={styles.signupValue}>64%</div>
              <div className={styles.signupChange}>
                <span className={styles.changePositive}>+15%</span>
                <div className={styles.miniChart}>
                  <div className={styles.chartBar} style={{height: '40%'}}></div>
                  <div className={styles.chartBar} style={{height: '60%'}}></div>
                  <div className={styles.chartBar} style={{height: '80%'}}></div>
                  <div className={styles.chartBar} style={{height: '100%'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Text Content */}
        <div className={styles.textSection}>
          {/* Resolve Issues Card */}
          <div ref={resolveCardRef} className={styles.resolveCard}>
            <div className={styles.resolveHeader}>
              <svg className={styles.puzzleIcon} width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L14 6L18 7L14 8L12 12L10 8L6 7L10 6L12 2Z" fill="#3b82f6"/>
                <path d="M6 14L8 18L12 19L8 20L6 24L4 20L0 19L4 18L6 14Z" fill="#3b82f6"/>
                <path d="M18 14L20 18L24 19L20 20L18 24L16 20L12 19L16 18L18 14Z" fill="#3b82f6"/>
              </svg>
              <h3 className={styles.resolveTitle}>Resolve issues</h3>
            </div>
            <p className={styles.resolveDescription}>
              Shorten feedback loops by giving your team the full context to resolve issues faster.
            </p>
            <a href="#" className={styles.learnMoreLink}>Learn more →</a>
          </div>

          {/* Testimonial Card */}
          <div ref={testimonialCardRef} className={styles.testimonialCard}>
            <p className={styles.testimonialQuote}>
              "We had problems identifying issues that our development team could never re-create. With UXCam we were able to find the issue quickly and resolve it."
            </p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.authorInfo}>
                <div className={styles.authorAvatar}>
                  <span>JK</span>
                </div>
                <div className={styles.authorDetails}>
                  <div className={styles.authorName}>Jon Kinney</div>
                  <div className={styles.authorRole}>Partner & CTO</div>
                </div>
              </div>
              <div className={styles.companyLogo}>
                <div className={styles.logoCircle}>H</div>
                <span className={styles.companyName}>Headway</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SessionReplayFeature

