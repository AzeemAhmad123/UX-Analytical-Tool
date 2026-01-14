import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './CTASection.module.css'

gsap.registerPlugin(ScrollTrigger)

const CTASection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (contentRef.current) {
        gsap.from(contentRef.current.children, {
          opacity: 0,
          y: 50,
          duration: 1,
          stagger: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: contentRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })

        // Animate buttons on hover
        const buttons = contentRef.current.querySelectorAll('button')
        buttons.forEach(button => {
          button.addEventListener('mouseenter', () => {
            gsap.to(button, {
              scale: 1.05,
              duration: 0.3,
              ease: 'power2.out'
            })
          })
          button.addEventListener('mouseleave', () => {
            gsap.to(button, {
              scale: 1,
              duration: 0.3,
              ease: 'power2.out'
            })
          })
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.container}>
        <div ref={contentRef} className={styles.content}>
          <h2 className={styles.title}>
            Ready to improve your <br/>
            <span className={styles.highlight}>user experience?</span>
          </h2>
          <p className={styles.description}>
            Join thousands of companies using our analytics platform to understand their users better.
          </p>
          <div className={styles.ctaButtons}>
            <button className={styles.primaryButton}>Start Free Trial</button>
            <button className={styles.secondaryButton}>Schedule a Demo</button>
          </div>
          <div className={styles.trustBadges}>
            <div className={styles.badge}>
              <svg className={styles.badgeIcon} width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <span>No credit card required</span>
            </div>
            <div className={styles.badge}>
              <svg className={styles.badgeIcon} width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
              </svg>
              <span>14-day free trial</span>
            </div>
            <div className={styles.badge}>
              <svg className={styles.badgeIcon} width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              <span>Trusted by 5000+ companies</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CTASection

