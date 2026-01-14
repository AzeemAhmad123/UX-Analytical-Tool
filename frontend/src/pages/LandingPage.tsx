import '../App.css'
import LandingHeader from '../components/LandingHeader'
import LandingHero from '../components/LandingHero'
import TrustedBrandsSection from '../components/TrustedBrandsSection'
import LandingUsersLoveUs from '../components/LandingUsersLoveUs'
import RealTimeInsights from '../components/RealTimeInsights'
import FeaturesSection from '../components/FeaturesSection'
import UseCasesSection from '../components/UseCasesSection'
import BenefitsSection from '../components/BenefitsSection'
import CTASection from '../components/CTASection'
import LandingFooter from '../components/LandingFooter'

const LandingPage = () => {
  return (
    <div className="app">
      <LandingHeader />
      <LandingHero />
      <TrustedBrandsSection />
      <LandingUsersLoveUs />
      <RealTimeInsights />
      <FeaturesSection />
      <UseCasesSection />
      <BenefitsSection />
      <CTASection />
      <LandingFooter />
    </div>
  )
}

export default LandingPage

