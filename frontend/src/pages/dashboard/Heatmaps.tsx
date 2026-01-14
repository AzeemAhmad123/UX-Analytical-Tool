/**
 * Heatmaps Page
 * 
 * View and generate heatmaps for click, scroll, and move tracking
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Eye, Download, MousePointerClick, Scroll, Move, X, ArrowLeft } from 'lucide-react'
import { projectsAPI, advancedAnalyticsAPI } from '../../services/api'
import '../../components/dashboard/Dashboard.css'
import './Heatmaps.css'

interface Heatmap {
  id: string
  page_url: string
  heatmap_type: 'click' | 'scroll' | 'move' | 'attention'
  data_points: Array<{ x: number; y: number; intensity: number }>
  total_sessions: number
  date_range_start?: string
  date_range_end?: string
  updated_at: string
}

export function Heatmaps() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const funnelId = searchParams.get('funnelId')
  
  const [activeTab, setActiveTab] = useState<'my' | 'all' | 'favorites'>('all')
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [heatmaps, setHeatmaps] = useState<Heatmap[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedHeatmap, setSelectedHeatmap] = useState<Heatmap | null>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    page_url: '',
    heatmap_type: 'click' as 'click' | 'scroll' | 'move',
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadHeatmaps()
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

  const loadHeatmaps = async () => {
    if (!selectedProject) return
    setLoading(true)
    try {
      const response = await advancedAnalyticsAPI.getHeatmaps(selectedProject)
      setHeatmaps(response.heatmaps || [])
    } catch (error) {
      console.error('Error loading heatmaps:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedProject || !generateForm.page_url) {
      alert('Please enter a page URL')
      return
    }

    setLoading(true)
    try {
      const response = await advancedAnalyticsAPI.generateHeatmap(selectedProject, {
        ...generateForm,
        start_date: new Date(generateForm.start_date).toISOString(),
        end_date: new Date(generateForm.end_date).toISOString()
      })
      
      if (response.heatmap) {
        setHeatmaps([response.heatmap, ...heatmaps])
        setShowGenerateModal(false)
        setSelectedHeatmap(response.heatmap)
      }
    } catch (error: any) {
      alert('Error generating heatmap: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const getHeatmapTypeIcon = (type: string) => {
    switch (type) {
      case 'click': return <MousePointerClick size={16} />
      case 'scroll': return <Scroll size={16} />
      case 'move': return <Move size={16} />
      default: return <Eye size={16} />
    }
  }

  const getHeatmapTypeLabel = (type: string) => {
    switch (type) {
      case 'click': return 'Click'
      case 'scroll': return 'Scroll'
      case 'move': return 'Move'
      case 'attention': return 'Attention'
      default: return type
    }
  }

  const renderHeatmapPreview = (heatmap: Heatmap) => {
    // Simple heatmap visualization using data points
    
    return (
      <div className="heatmap-preview">
        <div className="heatmap-canvas">
          {heatmap.data_points.slice(0, 100).map((point, idx) => (
            <div
              key={idx}
              className="heatmap-point"
              style={{
                left: `${point.x}px`,
                top: `${point.y}px`,
                opacity: point.intensity,
                backgroundColor: `rgba(255, ${255 - point.intensity * 255}, 0, ${point.intensity * 0.8})`
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  const handleBack = () => {
    if (funnelId) {
      // Navigate back to funnel detail page
      navigate(`/dashboard/funnels?funnelId=${funnelId}`)
    } else {
      // Navigate to funnel list if no funnel ID
      navigate('/dashboard/funnels')
    }
  }

  return (
    <div className="dashboard-page-content">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={handleBack}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
            title={funnelId ? "Back to Funnel" : "Back to Funnels"}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <h1 className="page-title">Heatmaps</h1>
            {selectedProject && heatmaps.length > 0 && (
              <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                {heatmaps.length} heatmap{heatmaps.length !== 1 ? 's' : ''} generated
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {projects.length > 0 && (
            <select
              className="time-filter-select"
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          )}
          <button className="btn-primary" onClick={() => setShowGenerateModal(true)}>
            <Plus className="icon-small" />
            <span>New heatmap</span>
          </button>
        </div>
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Generate New Heatmap</h2>
              <button className="modal-close" onClick={() => setShowGenerateModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Page URL</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="/checkout or https://example.com/page"
                  value={generateForm.page_url}
                  onChange={(e) => setGenerateForm({ ...generateForm, page_url: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Heatmap Type</label>
                <select
                  className="form-select"
                  value={generateForm.heatmap_type}
                  onChange={(e) => setGenerateForm({ ...generateForm, heatmap_type: e.target.value as any })}
                >
                  <option value="click">Click Heatmap</option>
                  <option value="scroll">Scroll Heatmap</option>
                  <option value="move">Mouse Move Heatmap</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={generateForm.start_date}
                    onChange={(e) => setGenerateForm({ ...generateForm, start_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={generateForm.end_date}
                    onChange={(e) => setGenerateForm({ ...generateForm, end_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Heatmap'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Heatmaps List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading heatmaps...</p>
        </div>
      ) : heatmaps.length > 0 ? (
        <div className="heatmaps-grid">
          {heatmaps.map((heatmap) => (
            <div
              key={heatmap.id}
              className="heatmap-card"
              onClick={() => setSelectedHeatmap(heatmap)}
            >
              <div className="heatmap-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {getHeatmapTypeIcon(heatmap.heatmap_type)}
                  <span style={{ fontWeight: '600', color: '#111827' }}>
                    {getHeatmapTypeLabel(heatmap.heatmap_type)} Heatmap
                  </span>
                </div>
                <button className="icon-button">
                  <Eye size={16} />
                </button>
              </div>
              <div className="heatmap-card-body">
                <div className="heatmap-url">{heatmap.page_url}</div>
                <div className="heatmap-stats">
                  <span>{heatmap.total_sessions} sessions</span>
                  <span>•</span>
                  <span>{heatmap.data_points.length} data points</span>
                </div>
                {renderHeatmapPreview(heatmap)}
              </div>
              <div className="heatmap-card-footer">
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Updated {new Date(heatmap.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🔥</div>
          <h3>No heatmaps yet</h3>
          <p>Generate your first heatmap to see where users click, scroll, and move on your pages.</p>
          <button className="btn-primary" onClick={() => setShowGenerateModal(true)}>
            <Plus className="icon-small" />
            <span>Generate Heatmap</span>
          </button>
        </div>
      )}

      {/* Selected Heatmap Detail View */}
      {selectedHeatmap && (
        <div className="modal-overlay" onClick={() => setSelectedHeatmap(null)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{getHeatmapTypeLabel(selectedHeatmap.heatmap_type)} Heatmap</h2>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {selectedHeatmap.page_url}
                </p>
              </div>
              <button className="modal-close" onClick={() => setSelectedHeatmap(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="heatmap-detail-stats">
                <div className="stat-item">
                  <div className="stat-label">Total Sessions</div>
                  <div className="stat-value">{selectedHeatmap.total_sessions}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Data Points</div>
                  <div className="stat-value">{selectedHeatmap.data_points.length}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Date Range</div>
                  <div className="stat-value">
                    {selectedHeatmap.date_range_start && selectedHeatmap.date_range_end
                      ? `${new Date(selectedHeatmap.date_range_start).toLocaleDateString()} - ${new Date(selectedHeatmap.date_range_end).toLocaleDateString()}`
                      : 'N/A'}
                  </div>
                </div>
              </div>
              <div className="heatmap-visualization">
                {renderHeatmapPreview(selectedHeatmap)}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedHeatmap(null)}>
                Close
              </button>
              <button className="btn-primary">
                <Download className="icon-small" />
                <span>Export</span>
              </button>
            </div>
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
