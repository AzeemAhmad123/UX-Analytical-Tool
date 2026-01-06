import { useEffect, useState } from 'react'
import { useNavigate, Routes, Route } from 'react-router-dom'
import { auth } from '../config/supabase'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar'
import { DashboardHome } from '../components/dashboard/DashboardHome'
import { SessionReplay } from './dashboard/SessionReplay'
import { SessionsList } from './dashboard/SessionsList'
import { SessionReplayPlayer } from './dashboard/SessionReplayPlayer'
import { Heatmaps } from './dashboard/Heatmaps'
import { Funnel } from './dashboard/Funnel'
import { Projects } from './dashboard/Projects'
import { Dashboards } from './dashboard/Dashboards'
import { VoiceOfCustomer } from './dashboard/VoiceOfCustomer'
import { Segments } from './dashboard/Segments'
import { WebPerformance } from './dashboard/WebPerformance'
import { OnboardingContent } from './dashboard/OnboardingContent'
import { Profile } from './dashboard/Profile'
import '../components/dashboard/Dashboard.css'

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await auth.getUser()
        if (!currentUser) {
          navigate('/login')
        }
      } catch (error) {
        console.error('Error checking user:', error)
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [navigate])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '2px solid #9333ea', 
            borderTop: 'transparent', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#4b5563' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <DashboardSidebar />
      <div className="dashboard-main">
        <DashboardHeader />
        <main className="dashboard-content">
          <Routes>
            <Route index element={<DashboardHome />} />
            <Route path="sessions" element={<SessionsList />} />
            <Route path="sessions/list" element={<SessionsList />} />
            <Route path="sessions/:projectId/:sessionId" element={<SessionReplayPlayer />} />
            <Route path="sessions/analytics" element={<div className="dashboard-page-content"><h1 className="page-title">Session Analytics</h1><p>Coming soon...</p></div>} />
            <Route path="heatmaps" element={<Heatmaps />} />
            <Route path="funnel" element={<Funnel />} />
            <Route path="funnels" element={<Funnel />} />
            <Route path="dashboards" element={<Dashboards />} />
            <Route path="projects" element={<Projects />} />
            <Route path="retention" element={<div className="dashboard-page-content"><h1 className="page-title">Retention</h1><p>Coming soon...</p></div>} />
            <Route path="app-flows" element={<div className="dashboard-page-content"><h1 className="page-title">App Flows</h1><p>Coming soon...</p></div>} />
            <Route path="users" element={<div className="dashboard-page-content"><h1 className="page-title">Users</h1><p>Coming soon...</p></div>} />
            <Route path="events" element={<div className="dashboard-page-content"><h1 className="page-title">Events</h1><p>Coming soon...</p></div>} />
            <Route path="screens" element={<div className="dashboard-page-content"><h1 className="page-title">Screens</h1><p>Coming soon...</p></div>} />
            <Route path="issues" element={<div className="dashboard-page-content"><h1 className="page-title">Issues</h1><p>Coming soon...</p></div>} />
            <Route path="guide" element={<OnboardingContent />} />
            <Route path="support" element={<div className="dashboard-page-content"><h1 className="page-title">Support</h1><p>Coming soon...</p></div>} />
                <Route path="voice" element={<VoiceOfCustomer />} />
                <Route path="performance" element={<WebPerformance />} />
                <Route path="segments" element={<Segments />} />
                <Route path="profile" element={<Profile />} />
              </Routes>
        </main>
      </div>
    </div>
  )
}

export default Dashboard

