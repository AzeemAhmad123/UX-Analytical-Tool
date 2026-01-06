import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { projectsAPI, eventsAPI } from '../../services/api'
import '../../components/dashboard/Dashboard.css'

export function Heatmaps() {
  const [activeTab, setActiveTab] = useState<'my' | 'all' | 'favorites'>('all')
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [clickData, setClickData] = useState<any[]>([])

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadClickData()
    }
  }, [selectedProject])

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll()
      const projectsList = response.projects || []
      setProjects(projectsList)
      if (projectsList.length > 0) {
        setSelectedProject(projectsList[0].id)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const loadClickData = async () => {
    if (!selectedProject) return
    try {
      const response = await eventsAPI.getByProject(selectedProject, {
        type: 'click',
        limit: 1000
      })
      setClickData(response.events || [])
    } catch (error) {
      console.error('Error loading click data:', error)
    }
  }

  // Generate heatmap data from clicks
  const generateHeatmapData = () => {
    if (clickData.length === 0) return null

    // Group clicks by URL
    const clicksByUrl: { [key: string]: any[] } = {}
    clickData.forEach(event => {
      const url = event.data?.url || event.data?.path || 'unknown'
      if (!clicksByUrl[url]) {
        clicksByUrl[url] = []
      }
      clicksByUrl[url].push({
        x: event.data?.x || 0,
        y: event.data?.y || 0,
        element: event.data?.element || 'unknown'
      })
    })

    return clicksByUrl
  }

  const heatmapData = generateHeatmapData()

  const templates = [
    {
      id: 'scratch',
      title: 'Start from scratch',
      description: 'Create a new analysis from scratch',
      icon: true,
    },
    {
      id: 'attention',
      title: 'Attention',
      description: 'Create an analysis showing user engagement',
      gradient: 'from-purple-900 to-pink-600',
    },
    {
      id: 'top-clicks',
      title: 'Top clicks',
      description: `Analyze where your visitors click the most${clickData.length > 0 ? ` (${clickData.length} clicks tracked)` : ''}`,
      gradient: 'from-teal-800 to-teal-600',
    },
    {
      id: 'rage-clicks',
      title: 'Rage clicks',
      description: 'Identify friction areas on your page',
      gradient: 'from-green-800 to-green-600',
    },
  ]

  return (
    <div className="dashboard-page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Heatmaps</h1>
          {selectedProject && clickData.length > 0 && (
            <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
              {clickData.length} click events tracked from {Object.keys(heatmapData || {}).length} pages
            </p>
          )}
        </div>
        <button className="btn-primary">
          <Plus className="icon-small" />
          <span>New heatmap</span>
        </button>
      </div>

      {/* Project Selector */}
      {projects.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <select 
            className="time-filter-select"
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(e.target.value)}
            style={{ maxWidth: '300px' }}
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Template Cards */}
      <div className="templates-grid">
        {templates.map((template) => (
          <div key={template.id} className="template-card">
            <div 
              className="template-image"
              style={{
                backgroundColor: template.icon ? '#f3f4f6' : undefined,
                background: template.gradient ? `linear-gradient(to bottom right, ${template.gradient.includes('purple') ? '#581c87, #db2777' : template.gradient.includes('teal') ? '#115e59, #0d9488' : '#166534, #16a34a'})` : undefined
              }}
            >
              {template.icon ? (
                <Plus style={{ width: '48px', height: '48px', color: '#9ca3af' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                  {template.id === 'attention' && (
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', borderRadius: '8px', padding: '1rem', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ color: 'white', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>22%</div>
                        <div style={{ fontSize: '0.875rem' }}>User Engagement</div>
                      </div>
                    </div>
                  )}
                  {template.id === 'top-clicks' && (
                    <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '0.75rem', width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '8px', left: '8px', width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '50%' }}></div>
                      <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '50%' }}></div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                        <div style={{ width: '33%', height: '64px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}></div>
                        <div style={{ width: '33%', height: '64px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}></div>
                        <div style={{ width: '33%', height: '64px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}></div>
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#0f766e' }}>
                        Top clicked areas {clickData.length > 0 && `(${clickData.length} clicks)`}
                      </div>
                    </div>
                  )}
                  {template.id === 'rage-clicks' && (
                    <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '0.75rem', width: '100%', height: '100%', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                        <div style={{ width: '32px', height: '32px', backgroundColor: '#fbbf24', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '0.75rem' }}>⚠️</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                        <div style={{ width: '50%', height: '48px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}></div>
                        <div style={{ width: '50%', height: '48px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}></div>
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <div style={{ height: '32px', backgroundColor: '#fee2e2', borderRadius: '4px' }}></div>
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#15803d' }}>Friction detection</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="template-content">
              <h3 className="template-title">{template.title}</h3>
              <p className="template-description">{template.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Show heatmap data if available */}
      {heatmapData && Object.keys(heatmapData).length > 0 && (
        <div style={{ marginTop: '2rem', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>Click Data by Page</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.entries(heatmapData).map(([url, clicks]) => (
              <div key={url} style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', marginBottom: '0.5rem' }}>
                  {url.length > 60 ? url.substring(0, 60) + '...' : url}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {clicks.length} clicks tracked
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container" style={{ marginTop: '2rem' }}>
        <div className="tabs">
          <button
            onClick={() => setActiveTab('my')}
            className={`tab ${activeTab === 'my' ? 'tab-active' : ''}`}
          >
            My heatmaps
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}
          >
            All heatmaps
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`tab ${activeTab === 'favorites' ? 'tab-active' : ''}`}
          >
            Favorites
          </button>
        </div>
      </div>
    </div>
  )
}
