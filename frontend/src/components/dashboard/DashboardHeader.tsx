import { Settings, HelpCircle, Users, LogOut } from 'lucide-react'
import { auth } from '../../config/supabase'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './Dashboard.css'

export function DashboardHeader() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUser()
    
    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUser = async () => {
    try {
      const currentUser = await auth.getUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const getUserInitials = (userData: any) => {
    if (userData?.user_metadata?.name) {
      const name = userData.user_metadata.name
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    if (userData?.email) {
      return userData.email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const handleLogout = async () => {
    await auth.signOut()
    navigate('/login')
  }

  return (
    <header className="dashboard-header">
      <div className="header-actions">
        <button className="header-button" title="Settings">
          <Settings className="header-icon" />
        </button>
        <button className="header-button" title="Help">
          <HelpCircle className="header-icon" />
        </button>
        <button className="header-button" title="Users">
          <Users className="header-icon" />
        </button>
        <button 
          onClick={handleLogout}
          className="header-button"
          title="Logout"
        >
          <LogOut className="header-icon" />
        </button>
        <div className="header-avatar">{user ? getUserInitials(user) : 'U'}</div>
      </div>
    </header>
  )
}

