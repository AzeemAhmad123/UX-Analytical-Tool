import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './BenefitsSection.module.css'

gsap.registerPlugin(ScrollTrigger)

const BenefitsSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const benefitCardsRef = useRef<HTMLDivElement[]>([])
  const statCardsRef = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate benefit cards
      benefitCardsRef.current.forEach((card, index) => {
        if (card) {
          gsap.from(card, {
            opacity: 0,
            scale: 0.8,
            rotation: -5,
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

      // Animate stat cards with counter effect
      statCardsRef.current.forEach((card, index) => {
        if (card) {
          const numberEl = card.querySelector(`.${styles.statNumber}`)
          if (numberEl) {
            const finalValue = numberEl.textContent || '0'
            gsap.from(card, {
              opacity: 0,
              y: 30,
              duration: 0.6,
              delay: index * 0.1,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                toggleActions: 'play none none none',
                onEnter: () => {
                  if (numberEl.textContent?.includes('%')) {
                    gsap.to({ value: 0 }, {
                      value: parseFloat(finalValue),
                      duration: 1.5,
                      ease: 'power2.out',
                      onUpdate: function() {
                        numberEl.textContent = this.targets()[0].value.toFixed(1) + '%'
                      }
                    })
                  }
                }
              }
            })
          }
        }
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])
  const benefits = [
    {
      number: "10x",
      title: "Faster Debugging",
      description: "Find and fix issues in minutes instead of hours with complete session context."
    },
    {
      number: "25%",
      title: "Higher Conversion",
      description: "Optimize funnels based on real user behavior and increase conversion rates."
    },
    {
      number: "50%",
      title: "Less Support Tickets",
      description: "Identify and fix issues before users report them, reducing support burden."
    }
  ]

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <small className={styles.label}>PROVEN RESULTS</small>
          <h2 className={styles.title}>
            See the <span className={styles.highlight}>impact</span> on your business
          </h2>
        </div>

        <div className={styles.benefitsGrid}>
          {benefits.map((benefit, index) => (
            <div 
              key={index} 
              ref={(el) => { if (el) benefitCardsRef.current[index] = el }}
              className={styles.benefitCard}
            >
              <div className={styles.number}>{benefit.number}</div>
              <h3 className={styles.benefitTitle}>{benefit.title}</h3>
              <p className={styles.benefitDescription}>{benefit.description}</p>
            </div>
          ))}
        </div>

        <div className={styles.statsGrid}>
          <div 
            ref={(el) => { if (el) statCardsRef.current[0] = el }}
            className={styles.statCard}
          >
            <div className={styles.statNumber}>99.9%</div>
            <div className={styles.statLabel}>Uptime</div>
          </div>
          <div 
            ref={(el) => { if (el) statCardsRef.current[1] = el }}
            className={styles.statCard}
          >
            <div className={styles.statNumber}>1M+</div>
            <div className={styles.statLabel}>Sessions Tracked Daily</div>
          </div>
          <div 
            ref={(el) => { if (el) statCardsRef.current[2] = el }}
            className={styles.statCard}
          >
            <div className={styles.statNumber}>5000+</div>
            <div className={styles.statLabel}>Companies Trust Us</div>
          </div>
          <div 
            ref={(el) => { if (el) statCardsRef.current[3] = el }}
            className={styles.statCard}
          >
            <div className={styles.statNumber}>4.8/5</div>
            <div className={styles.statLabel}>Customer Rating</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BenefitsSection

