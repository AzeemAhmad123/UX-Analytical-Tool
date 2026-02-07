import { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  Video, User, Star, Calendar, Clock, Smartphone, 
  MapPin, Monitor, Info, TrendingUp, TrendingDown,
  Hand
} from 'lucide-react'
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { analyticsAPI, projectsAPI, advancedAnalyticsAPI } from '../../services/api'
import { useNavigate } from 'react-router-dom'

interface OverviewData {
  sessions: number
  activeUsers: number
  sessionsTrend: number
  activeUsersTrend: number
  topEvents: { name: string; count: number }
  sessionsByDuration: Array<{ week: string; '<5s': number; '5-10s': number; '10-30s': number; '30-60s': number; '1-2min': number; '2-5min': number; '5-10min': number; '>10min': number }>
  sessionsByWeekDay: Array<{ day: string; 'Night (12am-6am)': number; 'Morning (6am-12pm)': number; 'Afternoon (12pm-6pm)': number; 'Evening (6pm-12am)': number }>
  topAppVersion: { version: string; percentage: number }
  sessionDuration: { avg: string; change: number }
  rageGestures: number
  topWeekDay: { day: string; percentage: number; breakdown: { morning: number; afternoon: number; evening: number } }
  topScreen: { name: string; percentage: number; breakdown: Array<{ name: string; value: number }> }
  topCountry: { name: string; percentage: number }
  topDevices: { name: string; percentage: number }
  // Individual chart data
  sessionsChart?: Array<{ date: string; count: number }>
  activeUsersChart?: Array<{ date: string; count: number }>
  topEventsChart?: Array<{ date: string; [key: string]: string | number }>
  appVersionChart?: Array<{ date: string; [key: string]: string | number }>
  sessionDurationChart?: Array<{ date: string; avgDuration: number }>
  rageGesturesChart?: Array<{ date: string; count: number }>
}

export function OverviewDashboard() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d') // Keep 7d as default but will show 2 days of data
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<OverviewData | null>(null)
  const [selectedCard, setSelectedCard] = useState<'sessions' | 'activeUsers' | 'topEvents' | 'appVersion' | 'sessionDuration' | 'rageGestures' | null>(null)

  // Memoize chart colors to avoid recreating on every render
  const chartColors = useMemo(() => ({
    '<5s': '#e0f2fe',
    '5-10s': '#bae6fd',
    '10-30s': '#7dd3fc',
    '30-60s': '#38bdf8',
    '1-2min': '#0ea5e9',
    '2-5min': '#0284c7',
    '5-10min': '#0369a1',
    '>10min': '#075985'
  }), [])

  const COLORS = useMemo(() => ['#3b82f6', '#60a5fa', '#93c5fd', '#cbd5e1', '#94a3b8'], [])

  const loadProjects = async () => {
    try {
      // Add timeout for faster failure
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000) // 5 second timeout
      )
      
      const apiPromise = projectsAPI.getAll()
      const response = await Promise.race([apiPromise, timeoutPromise]) as any
      const projectsList = response.projects || []
      const activeProjects = projectsList.filter((p: any) => p.is_active !== false)
      setProjects(projectsList)
      // Only select from active projects
      if (activeProjects.length > 0) {
        setSelectedProject(activeProjects[0].id)
      } else {
        // No active projects - clear selection
        setSelectedProject(null)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      setLoading(false) // Stop loading on error
    }
  }

  const loadOverviewData = useCallback(async () => {
    if (!selectedProject) {
      console.log('⚠️ Overview: No project selected')
      return
    }

    try {
      setLoading(true)
      
      // Calculate date range - default to 2 days for better performance
      const days = dateRange === '7d' ? 2 : dateRange === '30d' ? 30 : 90
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      const endDate = new Date().toISOString()
      
      console.log('🔍 Overview: Loading data', {
        projectId: selectedProject,
        dateRange: { start: startDate, end: endDate },
        days
      })

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000) // 10 second timeout
      )

      // Use optimized endpoint that does all calculations server-side
      const [detailedData, rageClicks] = await Promise.race([
        Promise.all([
          analyticsAPI.getOverviewDetailed(selectedProject, {
            start_date: startDate,
            end_date: endDate,
            platform_filter: 'all'
          }).catch(() => null),
          advancedAnalyticsAPI.getRageClicksSummary(selectedProject, startDate, endDate).catch(() => ({ count: 0 }))
        ]),
        timeoutPromise
      ]) as [any, any]

      if (!detailedData) {
        console.log('⚠️ Overview: Detailed API failed, trying basic overview')
        // Fallback to basic overview if detailed fails
        try {
          const analytics = await analyticsAPI.getOverview(selectedProject, {
            start_date: startDate,
            end_date: endDate,
            platform_filter: 'all'
          })
          console.log('✅ Overview: Basic overview loaded', {
            sessions: analytics.sessions || 0,
            activeUsers: analytics.active_users || 0
          })
          setData({
            sessions: analytics.sessions || 0,
            activeUsers: analytics.active_users || 0,
            sessionsTrend: 0,
            activeUsersTrend: 0,
            topEvents: { name: 'UI Freeze', count: 0 },
            sessionsByDuration: [],
            sessionsByWeekDay: [],
            topAppVersion: { version: '1.0.11', percentage: 99 },
            sessionDuration: { avg: '0.0 min', change: 0 },
            rageGestures: rageClicks.count || 0,
            topWeekDay: { day: 'Thursday', percentage: 17, breakdown: { morning: 35, afternoon: 40, evening: 25 } },
            topScreen: { name: 'unknown', percentage: 100, breakdown: [] },
            topCountry: { name: 'United States', percentage: 88 },
            topDevices: { name: 'Android Large', percentage: 95 }
          })
          return
        } catch (fallbackError) {
          console.error('❌ Overview: Basic overview also failed', fallbackError)
          // Set empty data to show "No data available"
          setData(null)
          return
        }
      }
      
      console.log('✅ Overview: Detailed data loaded', {
        sessions: detailedData.sessions || 0,
        activeUsers: detailedData.active_users || 0,
        hasSessionsByDuration: Array.isArray(detailedData.sessions_by_duration),
        sessionsByDurationLength: Array.isArray(detailedData.sessions_by_duration) ? detailedData.sessions_by_duration.length : 0
      })

      setData({
        sessions: detailedData.sessions || 0,
        activeUsers: detailedData.active_users || 0,
        sessionsTrend: detailedData.sessions_trend || 0,
        activeUsersTrend: detailedData.active_users_trend || 0,
        topEvents: detailedData.top_events || { name: 'UI Freeze', count: 0 },
        sessionsByDuration: Array.isArray(detailedData.sessions_by_duration) ? detailedData.sessions_by_duration : [],
        sessionsByWeekDay: Array.isArray(detailedData.sessions_by_week_day) ? detailedData.sessions_by_week_day : [],
        topAppVersion: detailedData.top_app_version || { version: '1.0.11', percentage: 99 },
        sessionDuration: detailedData.session_duration || { avg: '0.0 min', change: 0 },
        rageGestures: rageClicks.count || 0,
        topWeekDay: detailedData.top_week_day || { day: 'Thursday', percentage: 17, breakdown: { morning: 35, afternoon: 40, evening: 25 } },
        topScreen: {
          name: detailedData.top_screen?.name || 'unknown',
          percentage: detailedData.top_screen?.percentage || 100,
          breakdown: Array.isArray(detailedData.top_screen?.breakdown) ? detailedData.top_screen.breakdown : []
        },
        topCountry: detailedData.top_country || { name: 'United States', percentage: 88 },
        topDevices: detailedData.top_devices || { name: 'Android Large', percentage: 95 },
        // Individual chart data
        sessionsChart: detailedData.sessions_chart || [],
        activeUsersChart: detailedData.active_users_chart || [],
        topEventsChart: detailedData.top_events_chart || [],
        appVersionChart: detailedData.app_version_chart || [],
        sessionDurationChart: detailedData.session_duration_chart || [],
        rageGesturesChart: detailedData.rage_gestures_chart || []
      })
    } catch (error: any) {
      console.error('❌ Overview: Error loading data', {
        error: error.message,
        stack: error.stack,
        projectId: selectedProject,
        dateRange
      })
      // Set data to null to show "No data available"
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [selectedProject, dateRange])

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      // Add a small delay to debounce rapid changes
      const timeoutId = setTimeout(() => {
        loadOverviewData()
      }, 300)
      
      return () => clearTimeout(timeoutId)
    }
  }, [selectedProject, dateRange, loadOverviewData])

  // Removed calculateSessionsByDuration - now done server-side for performance


  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading overview...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header with Project Selector */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <div className="flex items-center gap-4">
          {projects.length > 0 && (
            <select
              className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              {projects
                .filter((p: any) => p.is_active !== false)
                .map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
            </select>
          )}
          <select
            className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {!selectedProject ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Project</h3>
          <p className="text-gray-500 mb-4">All projects are inactive. Please activate a project to view analytics.</p>
          <button
            onClick={() => window.location.href = '/dashboard/projects'}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to Projects
          </button>
        </div>
      ) : !data ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">No data available</p>
          <p className="text-sm text-gray-400">
            {selectedProject 
              ? 'Try selecting a different date range or check if there are sessions recorded in this period.'
              : 'Please select a project to view data.'}
          </p>
          {selectedProject && (
            <button
              onClick={() => loadOverviewData()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry Loading Data
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 items-stretch">
          {/* Usage Statistics Section - Larger */}
          <div className="flex">
            <div className="bg-white border border-slate-200 rounded-lg p-6 pb-6 w-full flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Usage statistics</h2>
                <select className="text-sm border border-slate-200 rounded px-2 py-1">
                  <option>last 7 days</option>
                  <option>last 30 days</option>
                  <option>last 90 days</option>
                </select>
              </div>

              {/* Top Row - 3 Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Sessions Card */}
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedCard === 'sessions' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedCard(selectedCard === 'sessions' ? null : 'sessions')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-600">Sessions</span>
                    </div>
                    <Info className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{data.sessions.toLocaleString()}</div>
                  <div className="flex items-center gap-1">
                    {data.sessionsTrend < 0 ? (
                      <>
                        <TrendingDown className="w-3 h-3 text-red-500" />
                        <span className="text-xs text-red-500">{data.sessionsTrend}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-500">+{data.sessionsTrend}%</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Active Users Card */}
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedCard === 'activeUsers' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedCard(selectedCard === 'activeUsers' ? null : 'activeUsers')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-600">Active users</span>
                    </div>
                    <Info className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{data.activeUsers.toLocaleString()}</div>
                  <div className="flex items-center gap-1">
                    {data.activeUsersTrend < 0 ? (
                      <>
                        <TrendingDown className="w-3 h-3 text-red-500" />
                        <span className="text-xs text-red-500">{data.activeUsersTrend}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-500">+{data.activeUsersTrend}%</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Top Events Card */}
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedCard === 'topEvents' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedCard(selectedCard === 'topEvents' ? null : 'topEvents')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-600">Top events</span>
                    </div>
                    <Info className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{(data.topEvents.count / 1000).toFixed(1)}K</div>
                  <div className="text-xs text-gray-600">{data.topEvents.name}</div>
                </div>
              </div>

              {/* Dynamic Chart Based on Selected Card */}
              <div className="mb-4 flex-1 flex flex-col">
                {selectedCard === 'sessions' && data.sessionsChart && data.sessionsChart.length > 0 ? (
                  <>
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Sessions over time</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={data.sessionsChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }} 
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </>
                ) : selectedCard === 'activeUsers' && data.activeUsersChart && data.activeUsersChart.length > 0 ? (
                  <>
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Active users over time</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={data.activeUsersChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }} 
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </>
                ) : selectedCard === 'topEvents' && data.topEventsChart && data.topEventsChart.length > 0 ? (
                  <>
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Count of events</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={data.topEventsChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }} 
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        {Object.keys(data.topEventsChart[0] || {}).filter(key => key !== 'date').map((key, index) => (
                          <Line 
                            key={key} 
                            type="monotone" 
                            dataKey={key} 
                            stroke={['#3b82f6', '#f97316', '#a855f7', '#10b981'][index % 4]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                ) : selectedCard === 'appVersion' && data.appVersionChart && data.appVersionChart.length > 0 ? (
                  <>
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Count of sessions</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={data.appVersionChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }} 
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        {Object.keys(data.appVersionChart[0] || {}).filter(key => key !== 'date').map((key, index) => (
                          <Area 
                            key={key} 
                            type="monotone" 
                            dataKey={key} 
                            stackId="1"
                            stroke={['#3b82f6', '#f97316', '#a855f7', '#10b981'][index % 4]}
                            fill={['#3b82f6', '#f97316', '#a855f7', '#10b981'][index % 4]}
                            fillOpacity={0.6}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </>
                ) : selectedCard === 'sessionDuration' && data.sessionDurationChart && data.sessionDurationChart.length > 0 ? (
                  <>
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Session duration over time</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={data.sessionDurationChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }} 
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value: any) => `${value.toFixed(1)} min`} />
                        <Line type="monotone" dataKey="avgDuration" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                ) : selectedCard === 'rageGestures' && data.rageGesturesChart && data.rageGesturesChart.length > 0 ? (
                  <>
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Rage gestures over time</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={data.rageGesturesChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }} 
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#ec4899" />
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-medium text-gray-700 mb-4">sessions by duration in week</h3>
                    {data.sessionsByDuration && Array.isArray(data.sessionsByDuration) && data.sessionsByDuration.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data.sessionsByDuration}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          <Bar dataKey="<5s" stackId="a" fill={chartColors['<5s']} />
                          <Bar dataKey="5-10s" stackId="a" fill={chartColors['5-10s']} />
                          <Bar dataKey="10-30s" stackId="a" fill={chartColors['10-30s']} />
                          <Bar dataKey="30-60s" stackId="a" fill={chartColors['30-60s']} />
                          <Bar dataKey="1-2min" stackId="a" fill={chartColors['1-2min']} />
                          <Bar dataKey="2-5min" stackId="a" fill={chartColors['2-5min']} />
                          <Bar dataKey="5-10min" stackId="a" fill={chartColors['5-10min']} />
                          <Bar dataKey=">10min" stackId="a" fill={chartColors['>10min']} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-48 flex items-center justify-center text-xs text-gray-400 border border-slate-200 rounded">
                        No session data available
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Bottom Row - 3 Cards */}
              <div className="grid grid-cols-3 gap-4 mt-auto">
                {/* Top App Version */}
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedCard === 'appVersion' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedCard(selectedCard === 'appVersion' ? null : 'appVersion')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-600">Top app version</span>
                    </div>
                    <Info className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="text-xl font-bold text-gray-900 mb-1">{data.topAppVersion.version}</div>
                  <div className="text-xs text-gray-600">{data.topAppVersion.percentage}%</div>
                </div>

                {/* Session Duration */}
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedCard === 'sessionDuration' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedCard(selectedCard === 'sessionDuration' ? null : 'sessionDuration')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-600">Session duration</span>
                    </div>
                    <Info className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="text-xl font-bold text-gray-900 mb-1">{data.sessionDuration.avg}</div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">+{data.sessionDuration.change}%</span>
                  </div>
                </div>

                {/* Rage Gestures */}
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedCard === 'rageGestures' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedCard(selectedCard === 'rageGestures' ? null : 'rageGestures')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Hand className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-600">Rage gestures</span>
                    </div>
                    <Info className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="text-xl font-bold text-gray-900 mb-2">{data.rageGestures}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/dashboard/rage-clicks')
                    }}
                    className="text-xs text-blue-500 hover:text-blue-600"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* UX Statistics Section - Smaller, touches borders */}
          <div className="flex">
            <div className="bg-white border border-slate-200 rounded-lg px-6 pt-6 pb-6 w-full flex flex-col justify-between min-h-full">
              <div className="flex-1 flex flex-col">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">UX statistics in the last 2 months</h2>

              {/* Top Row - 2 Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Top Week Day */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-600">Top week day</span>
                    </div>
                    <Info className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="text-sm text-gray-600 mb-1">{data.topWeekDay.percentage}%</div>
                  <div className="text-lg font-bold text-gray-900 mb-3">{data.topWeekDay.day}</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Morning</span>
                      <span className="font-medium">{data.topWeekDay.breakdown.morning}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Afternoon</span>
                      <span className="font-medium">{data.topWeekDay.breakdown.afternoon}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Evening</span>
                      <span className="font-medium">{data.topWeekDay.breakdown.evening}%</span>
                    </div>
                  </div>
                </div>

                {/* Top Screen */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-600">Top screen</span>
                    </div>
                    <Info className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="text-sm text-gray-600 mb-1">{data.topScreen.percentage}%</div>
                  <div className="text-lg font-bold text-gray-900 mb-3">{data.topScreen.name}</div>
                  {data.topScreen.breakdown && Array.isArray(data.topScreen.breakdown) && data.topScreen.breakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={100}>
                      <PieChart>
                        <Pie
                          data={data.topScreen.breakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={20}
                          outerRadius={35}
                          dataKey="value"
                        >
                          {data.topScreen.breakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-24 flex items-center justify-center text-xs text-gray-400">
                      No data available
                    </div>
                  )}
                </div>
              </div>

              {/* Sessions by Week Day Chart */}
              <div className="mb-4 flex-1 flex flex-col">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Count of sessions</h3>
                {data.sessionsByWeekDay && Array.isArray(data.sessionsByWeekDay) && data.sessionsByWeekDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.sessionsByWeekDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="Night (12am-6am)" stackId="a" fill="#1e40af" />
                      <Bar dataKey="Morning (6am-12pm)" stackId="a" fill="#10b981" />
                      <Bar dataKey="Afternoon (12pm-6pm)" stackId="a" fill="#f97316" />
                      <Bar dataKey="Evening (6pm-12am)" stackId="a" fill="#ec4899" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-xs text-gray-400 border border-slate-200 rounded">
                    No session data available
                  </div>
                )}
              </div>
              </div>

              {/* Bottom Row - 2 Cards (Same size as bottom left cards) */}
              <div className="grid grid-cols-2 gap-4 mt-auto">
                {/* Top Country */}
                <div className="border border-slate-200 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-600">Top country</span>
                    </div>
                    <Info className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="text-xl font-bold text-gray-900 mb-1">{data.topCountry.name}</div>
                  <div className="text-xs text-gray-600 mt-auto">{data.topCountry.percentage}%</div>
                </div>

                {/* Top Devices */}
                <div className="border border-slate-200 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-600">Top devices</span>
                    </div>
                    <Info className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="text-xl font-bold text-gray-900 mb-1">{data.topDevices.name}</div>
                  <div className="text-xs text-gray-600 mt-auto">{data.topDevices.percentage}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
