/**
 * User Segmentation Builder
 * 
 * Create and manage user segments with visual condition builder
 */

import { useState, useEffect } from 'react'
import { Plus, Search, Star, Users, X, Save, Trash2, RefreshCw, Edit2, Check } from 'lucide-react'
import { projectsAPI, advancedAnalyticsAPI } from '../../services/api'
import '../../components/dashboard/Dashboard.css'
import './Segments.css'

interface SegmentCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: any
}

interface Segment {
  id: string
  name: string
  description?: string
  conditions: SegmentCondition[]
  user_count?: number
  last_refreshed?: string
  created_at: string
  updated_at: string
}

export function Segments() {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'my' | 'favorites'>('all')

  const [segmentForm, setSegmentForm] = useState({
    name: '',
    description: '',
    conditions: [] as SegmentCondition[]
  })

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadSegments()
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

  const loadSegments = async () => {
    if (!selectedProject) return

    setLoading(true)
    try {
      const response = await advancedAnalyticsAPI.getSegments(selectedProject)
      setSegments(response.segments || [])
    } catch (error) {
      console.error('Error loading segments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSegment = async () => {
    if (!selectedProject || !segmentForm.name || segmentForm.conditions.length === 0) {
      alert('Please provide a name and at least one condition')
      return
    }

    setLoading(true)
    try {
      if (editingSegment) {
        await advancedAnalyticsAPI.updateSegment(selectedProject, editingSegment.id, segmentForm)
      } else {
        await advancedAnalyticsAPI.createSegment(selectedProject, segmentForm)
      }
      await loadSegments()
      setShowCreateModal(false)
      setEditingSegment(null)
      resetForm()
    } catch (error: any) {
      alert('Error saving segment: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSegment = async (segmentId: string) => {
    if (!selectedProject || !confirm('Are you sure you want to delete this segment?')) return

    setLoading(true)
    try {
      await advancedAnalyticsAPI.deleteSegment(selectedProject, segmentId)
      await loadSegments()
    } catch (error: any) {
      alert('Error deleting segment: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshSegment = async (segmentId: string) => {
    if (!selectedProject) return

    setLoading(true)
    try {
      await advancedAnalyticsAPI.refreshSegment(selectedProject, segmentId)
      await loadSegments()
    } catch (error: any) {
      alert('Error refreshing segment: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSegmentForm({
      name: '',
      description: '',
      conditions: []
    })
  }

  const addCondition = () => {
    setSegmentForm({
      ...segmentForm,
      conditions: [
        ...segmentForm.conditions,
        { field: 'platform', operator: 'equals', value: '' }
      ]
    })
  }

  const removeCondition = (index: number) => {
    setSegmentForm({
      ...segmentForm,
      conditions: segmentForm.conditions.filter((_, i) => i !== index)
    })
  }

  const updateCondition = (index: number, updates: Partial<SegmentCondition>) => {
    const newConditions = [...segmentForm.conditions]
    newConditions[index] = { ...newConditions[index], ...updates }
    setSegmentForm({
      ...segmentForm,
      conditions: newConditions
    })
  }

  const openEditModal = (segment: Segment) => {
    setEditingSegment(segment)
    setSegmentForm({
      name: segment.name,
      description: segment.description || '',
      conditions: segment.conditions
    })
    setShowCreateModal(true)
  }

  const filteredSegments = segments.filter(segment => {
    if (searchQuery && !segment.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    // Filter logic can be extended here
    return true
  })

  const availableFields = [
    { value: 'platform', label: 'Platform' },
    { value: 'country', label: 'Country' },
    { value: 'device', label: 'Device' },
    { value: 'app_version', label: 'App Version' },
    { value: 'custom_properties.total_spent', label: 'Total Spent' },
    { value: 'custom_properties.subscription_tier', label: 'Subscription Tier' }
  ]

  const availableOperators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'in', label: 'In' },
    { value: 'not_in', label: 'Not In' }
  ]

  return (
    <div className="segments-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Segments</h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Create dynamic user segments based on properties and behaviors
          </p>
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
          <button className="btn-primary" onClick={() => { resetForm(); setEditingSegment(null); setShowCreateModal(true) }}>
            <Plus className="icon-small" />
            <span>New Segment</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div className="search-input" style={{ flex: 1, maxWidth: '400px' }}>
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search segments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="tabs-container" style={{ margin: 0 }}>
          <div className="tabs">
            <button
              onClick={() => setFilter('all')}
              className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('my')}
              className={`tab ${filter === 'my' ? 'tab-active' : ''}`}
            >
              My Segments
            </button>
            <button
              onClick={() => setFilter('favorites')}
              className={`tab ${filter === 'favorites' ? 'tab-active' : ''}`}
            >
              Favorites
            </button>
          </div>
        </div>
      </div>

      {/* Segments List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading segments...</p>
        </div>
      ) : filteredSegments.length > 0 ? (
        <div className="segments-grid">
          {filteredSegments.map((segment) => (
            <div key={segment.id} className="segment-card">
              <div className="segment-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users className="icon-small" style={{ color: '#8b5cf6' }} />
                  <h3 className="segment-name">{segment.name}</h3>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="icon-button"
                    onClick={() => handleRefreshSegment(segment.id)}
                    title="Refresh segment"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => openEditModal(segment)}
                    title="Edit segment"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => handleDeleteSegment(segment.id)}
                    title="Delete segment"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {segment.description && (
                <p className="segment-description">{segment.description}</p>
              )}
              <div className="segment-conditions">
                <div className="conditions-label">Conditions:</div>
                {segment.conditions.map((condition, idx) => (
                  <div key={idx} className="condition-badge">
                    <strong>{condition.field}</strong> {condition.operator} <code>{String(condition.value)}</code>
                  </div>
                ))}
              </div>
              <div className="segment-footer">
                <div className="segment-meta">
                  {segment.user_count !== undefined && (
                    <span>{segment.user_count.toLocaleString()} users</span>
                  )}
                  {segment.last_refreshed && (
                    <span>• Last refreshed: {new Date(segment.last_refreshed).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>No segments yet</h3>
          <p>Create your first segment to start grouping users based on properties and behaviors.</p>
          <button className="btn-primary" onClick={() => { resetForm(); setEditingSegment(null); setShowCreateModal(true) }}>
            <Plus className="icon-small" />
            <span>Create Segment</span>
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setEditingSegment(null); resetForm() }}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSegment ? 'Edit Segment' : 'Create New Segment'}</h2>
              <button className="modal-close" onClick={() => { setShowCreateModal(false); setEditingSegment(null); resetForm() }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Segment Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., High Value Users"
                  value={segmentForm.name}
                  onChange={(e) => setSegmentForm({ ...segmentForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  placeholder="Describe this segment..."
                  rows={3}
                  value={segmentForm.description}
                  onChange={(e) => setSegmentForm({ ...segmentForm, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <label className="form-label">Conditions *</label>
                  <button className="btn-secondary" onClick={addCondition}>
                    <Plus className="icon-small" />
                    <span>Add Condition</span>
                  </button>
                </div>
                {segmentForm.conditions.length === 0 ? (
                  <div className="empty-conditions">
                    <p>No conditions added. Add at least one condition to create a segment.</p>
                  </div>
                ) : (
                  <div className="conditions-list">
                    {segmentForm.conditions.map((condition, index) => (
                      <div key={index} className="condition-row">
                        <select
                          className="form-select"
                          value={condition.field}
                          onChange={(e) => updateCondition(index, { field: e.target.value })}
                        >
                          {availableFields.map(field => (
                            <option key={field.value} value={field.value}>{field.label}</option>
                          ))}
                        </select>
                        <select
                          className="form-select"
                          value={condition.operator}
                          onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
                        >
                          {availableOperators.map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Value"
                          value={condition.value}
                          onChange={(e) => updateCondition(index, { value: e.target.value })}
                        />
                        <button
                          className="icon-button"
                          onClick={() => removeCondition(index)}
                          title="Remove condition"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setShowCreateModal(false); setEditingSegment(null); resetForm() }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateSegment} disabled={loading}>
                {loading ? 'Saving...' : editingSegment ? 'Update Segment' : 'Create Segment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
