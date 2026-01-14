import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './FeaturesSection.module.css'

gsap.registerPlugin(ScrollTrigger)

const FeaturesSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate header
      gsap.from(headerRef.current?.children || [], {
        opacity: 0,
        y: 50,
        duration: 1,
        stagger: 0.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: headerRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      })

      // Animate cards
      cardsRef.current.forEach((card, index) => {
        if (card) {
          gsap.from(card, {
            opacity: 0,
            y: 60,
            scale: 0.9,
            duration: 0.8,
            delay: index * 0.1,
            ease: 'back.out(1.7)',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none none'
            }
          })
        }
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])
  const features = [
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      ),
      title: "Session Replay",
      description: "Watch exactly how users interact with your app. See every click, scroll, and interaction in real-time."
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18"/>
          <path d="M18 17V9l-5 5-4-4-3 3"/>
        </svg>
      ),
      title: "Funnel Analysis",
      description: "Identify where users drop off in your conversion funnels. Optimize each step to improve conversion rates."
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      ),
      title: "Heatmaps",
      description: "Visualize where users click, scroll, and interact most. Make data-driven design decisions."
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
      title: "Issue Tracking",
      description: "Automatically detect and track user issues. Get alerts when users encounter errors or crashes."
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      title: "User Segmentation",
      description: "Segment users by behavior, demographics, or custom properties. Target the right users at the right time."
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
      title: "Performance Monitoring",
      description: "Track app performance metrics. Identify slow pages, API calls, and optimize user experience."
    }
  ]

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.container}>
        <div ref={headerRef} className={styles.header}>
          <small className={styles.label}>COMPREHENSIVE ANALYTICS</small>
          <h2 className={styles.title}>
            Everything you need to <br/>
            <span className={styles.highlight}>understand your users</span>
          </h2>
          <p className={styles.subtitle}>
            Powerful analytics tools that help you make data-driven decisions and improve user experience.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div 
              key={index} 
              ref={(el) => { if (el) cardsRef.current[index] = el }}
              className={styles.featureCard}
            >
              <div className={styles.iconWrapper}>
                {feature.icon}
              </div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection

