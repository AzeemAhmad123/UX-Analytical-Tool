import '../App.css'
import LandingHeader from '../components/LandingHeader'
import LandingHero from '../components/LandingHero'
import TrustedBrandsSection from '../components/TrustedBrandsSection'
import LandingUsersLoveUs from '../components/LandingUsersLoveUs'
import RealTimeInsights from '../components/RealTimeInsights'
import TaraAI from '../components/TaraAI'

const LandingPage = () => {
  return (
    <div className="app">
      <LandingHeader />
      <LandingHero />
      <TrustedBrandsSection />
      <LandingUsersLoveUs />
      <RealTimeInsights />
      <TaraAI />
    </div>
  )
}

export default LandingPage

