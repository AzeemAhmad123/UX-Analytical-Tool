import { Home, LayoutDashboard, TrendingUp, PlayCircle, Users, List, Monitor, AlertCircle, BookOpen, HelpCircle, ChevronDown, ChevronLeft, ChevronRight, Moon, MessageSquare, Gauge } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { auth } from '../../config/supabase'
import './Dashboard.css'

interface DashboardSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function DashboardSidebar({ collapsed = false, onToggleCollapse }: DashboardSidebarProps) {
  const location = useLocation()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
    
    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
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
      if (currentUser) {
        // Also get session to ensure we have full user data with metadata
        const session = await auth.getSession()
        if (session?.user) {
          setUser(session.user)
        } else {
          setUser(currentUser)
        }
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUserInitials = (user: any) => {
    if (user?.user_metadata?.name) {
      const name = user.user_metadata.name
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const getUserDisplayName = (user: any) => {
    // First priority: user_metadata.name
    if (user?.user_metadata?.name) {
      const name = user.user_metadata.name
      if (name.length > 20) {
        return name.substring(0, 17) + '...'
      }
      return name
    }
    
    // Second priority: Extract username from email (part before @)
    if (user?.email) {
      const emailParts = user.email.split('@')
      const username = emailParts[0]
      // Capitalize first letter and format nicely
      const formattedUsername = username.charAt(0).toUpperCase() + username.slice(1)
      if (formattedUsername.length > 20) {
        return formattedUsername.substring(0, 17) + '...'
      }
      return formattedUsername
    }
    
    return 'User'
  }

  const menuItems = [
    { icon: Home, label: 'Overview', path: '/dashboard' },
    { icon: LayoutDashboard, label: 'Projects', path: '/dashboard/projects' },
    { icon: LayoutDashboard, label: 'Dashboards', path: '/dashboard/dashboards' },
    { icon: TrendingUp, label: 'Retention', path: '/dashboard/retention' },
    { icon: TrendingUp, label: 'Funnels', path: '/dashboard/funnels' },
    { icon: LayoutDashboard, label: 'App flows', path: '/dashboard/app-flows' },
    { icon: PlayCircle, label: 'Sessions', path: '/dashboard/sessions/list', hasDropdown: true, subItems: [
      { label: 'List', path: '/dashboard/sessions/list' },
      { label: 'Analytics', path: '/dashboard/sessions/analytics' }
    ]},
    { icon: Users, label: 'Users', path: '/dashboard/users' },
    { icon: List, label: 'Events', path: '/dashboard/events', hasDropdown: true },
    { icon: Monitor, label: 'Screens', path: '/dashboard/screens' },
    { icon: AlertCircle, label: 'Issues', path: '/dashboard/issues', hasDropdown: true },
    { icon: BookOpen, label: 'Guide', path: '/dashboard/guide', progress: '21%' },
    { icon: HelpCircle, label: 'Support', path: '/dashboard/support' },
    { icon: MessageSquare, label: 'Voice of customer', path: '/dashboard/voice' },
    { icon: Gauge, label: 'Web Performance', path: '/dashboard/performance' },
  ]

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <aside className={`dashboard-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Collapse Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="sidebar-collapse-btn"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="nav-icon" /> : <ChevronLeft className="nav-icon" />}
      </button>

      {/* Logo */}
      <div className="sidebar-logo">
        <Link to="/dashboard" className="sidebar-logo-link">
          <div className="logo-icon">UX</div>
          {!collapsed && <span className="logo-text">UXCam</span>}
        </Link>
      </div>

      {/* App Selector */}
      {!collapsed && (
        <div className="app-selector">
          <div className="app-selector-item">
            <div className="app-selector-content">
              <div className="app-icon">
                <Moon className="nav-icon" />
              </div>
              <span className="app-name">Relaxed Sleep</span>
            </div>
            <ChevronDown className="nav-dropdown" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {menuItems.map((item, index) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={index}
              to={item.path}
              className={`nav-item ${active ? 'active' : ''}`}
              title={collapsed ? item.label : ''}
            >
              <div className="nav-item-content">
                <Icon className="nav-icon" />
                {!collapsed && <span className="nav-label">{item.label}</span>}
              </div>
              {!collapsed && item.hasDropdown && (
                <ChevronDown className="nav-dropdown" />
              )}
              {!collapsed && item.progress && (
                <span className="nav-progress">{item.progress}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section - User Profile */}
      <div className="sidebar-footer">
        <Link 
          to="/dashboard/profile" 
          className={`user-profile ${location.pathname === '/dashboard/profile' ? 'active' : ''}`}
          title={collapsed ? (user ? getUserDisplayName(user) : 'User') : ''}
        >
          <div className="user-profile-content">
            {!loading && user && (
              <>
                <div className="user-avatar">{getUserInitials(user)}</div>
                {!collapsed && <span className="user-name">{getUserDisplayName(user)}</span>}
              </>
            )}
            {loading && (
              <>
                <div className="user-avatar">U</div>
                {!collapsed && <span className="user-name">Loading...</span>}
              </>
            )}
            {!loading && !user && (
              <>
                <div className="user-avatar">U</div>
                {!collapsed && <span className="user-name">User</span>}
              </>
            )}
          </div>
          {!collapsed && <ChevronDown className="nav-dropdown" />}
        </Link>
      </div>
    </aside>
  )
}

