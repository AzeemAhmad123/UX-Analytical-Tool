import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import '../App.css'

gsap.registerPlugin(ScrollTrigger)

const LandingHero = () => {
  const heroRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const visualRef = useRef<HTMLDivElement>(null)
  const iconsRef = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate title
      if (titleRef.current) {
        gsap.from(titleRef.current.children, {
          opacity: 0,
          y: 50,
          duration: 1,
          stagger: 0.2,
          ease: 'power3.out'
        })
      }

      // Animate content
      if (contentRef.current) {
        const children = contentRef.current.children
        gsap.from(children, {
          opacity: 0,
          y: 30,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
          delay: 0.3
        })
      }

      // Animate visual
      if (visualRef.current) {
        gsap.from(visualRef.current, {
          opacity: 0,
          scale: 0.9,
          duration: 1.2,
          ease: 'back.out(1.7)',
          delay: 0.5
        })
      }

      // Animate floating icons
      iconsRef.current.forEach((icon, index) => {
        if (icon) {
          gsap.from(icon, {
            opacity: 0,
            scale: 0,
            rotation: -180,
            duration: 0.6,
            delay: 0.8 + index * 0.1,
            ease: 'back.out(1.7)'
          })

          // Continuous floating animation
          gsap.to(icon, {
            y: -20,
            duration: 2 + index * 0.3,
            ease: 'power1.inOut',
            yoyo: true,
            repeat: -1,
            delay: 1.5 + index * 0.2
          })
        }
      })
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={heroRef} className="landing-hero">
      <div className="landing-hero-container">
        <div ref={contentRef} className="landing-hero-content">
          <h1 ref={titleRef}>
            The easiest way to <br />
            <span className="highlight-blue">track your user journeys</span>
          </h1>
          <p>
            Finally, an analytics platform that works with your product. Track every interaction with your app or website.
          </p>

          <div className="landing-features-list">
            <div className="landing-feature-item">
              <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Get faster insights</span>
            </div>
            <div className="landing-feature-item">
              <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Stop jumping between tools</span>
            </div>
            <div className="landing-feature-item">
              <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Install with AI in minutes</span>
            </div>
          </div>

          <div className="landing-hero-cta">
            <button className="btn-demo-hero">Get a demo</button>
            <button className="btn-trial-hero">Start free trial</button>
          </div>

          <div className="landing-ratings-bar">
            <div className="rating-item-hero">
              <svg className="star-icon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>4.8/5 Gartner rating</span>
            </div>
            <div className="rating-item-hero">
              <svg className="lock-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Flexible data centers</span>
            </div>
            <div className="rating-item-hero">
              <svg className="building-icon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
              <span>Built for performance</span>
            </div>
          </div>
        </div>

        <div ref={visualRef} className="landing-hero-visual">
          <img
            src="/images/Hero-webp.webp"
            alt="Hero illustration"
            className="hero-main-image"
          />
          <div className="floating-icons-grid">
            <div 
              ref={(el) => { if (el) iconsRef.current[0] = el }}
              className="icon-box orange"
            >
              <svg className="icon-svg" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
            </div>
            <div 
              ref={(el) => { if (el) iconsRef.current[1] = el }}
              className="icon-box blue"
            >
              <svg className="icon-svg" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div 
              ref={(el) => { if (el) iconsRef.current[2] = el }}
              className="icon-box green"
            >
              <svg className="icon-svg" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              </svg>
            </div>
            <div 
              ref={(el) => { if (el) iconsRef.current[3] = el }}
              className="icon-box purple"
            >
              <svg className="icon-svg" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LandingHero

