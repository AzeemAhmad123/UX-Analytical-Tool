import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './UseCasesSection.module.css'

gsap.registerPlugin(ScrollTrigger)

const UseCasesSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const cardsRef = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      cardsRef.current.forEach((card, index) => {
        if (card) {
          gsap.from(card, {
            opacity: 0,
            x: index % 2 === 0 ? -60 : 60,
            duration: 0.8,
            delay: index * 0.15,
            ease: 'power3.out',
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
  const useCases = [
    {
      title: "Product Teams",
      description: "Understand user behavior and make informed product decisions based on real user data.",
      benefits: [
        "Identify UX issues before they impact users",
        "Validate feature adoption and usage",
        "Prioritize product roadmap based on data"
      ]
    },
    {
      title: "Engineering Teams",
      description: "Debug issues faster with complete context. See exactly what users experienced when errors occurred.",
      benefits: [
        "Reproduce bugs with session replays",
        "Track error rates and performance",
        "Monitor API calls and network issues"
      ]
    },
    {
      title: "Marketing Teams",
      description: "Optimize conversion funnels and understand which campaigns drive the best user experiences.",
      benefits: [
        "Analyze conversion funnels",
        "Track campaign performance",
        "Understand user acquisition quality"
      ]
    }
  ]

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <small className={styles.label}>USE CASES</small>
          <h2 className={styles.title}>
            Built for <span className={styles.highlight}>every team</span>
          </h2>
          <p className={styles.subtitle}>
            Powerful analytics that help every team in your organization make better decisions.
          </p>
        </div>

        <div className={styles.useCasesGrid}>
          {useCases.map((useCase, index) => (
            <div 
              key={index} 
              ref={(el) => { if (el) cardsRef.current[index] = el }}
              className={styles.useCaseCard}
            >
              <h3 className={styles.useCaseTitle}>{useCase.title}</h3>
              <p className={styles.useCaseDescription}>{useCase.description}</p>
              <ul className={styles.benefitsList}>
                {useCase.benefits.map((benefit, i) => (
                  <li key={i} className={styles.benefitItem}>
                    <svg className={styles.checkIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/>
                    </svg>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default UseCasesSection

