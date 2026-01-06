import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit, Copy, Check } from 'lucide-react'
import { projectsAPI } from '../../services/api'
import '../../components/dashboard/Dashboard.css'

interface Project {
  id: string
  name: string
  description: string
  sdk_key: string
  platform: string
  created_at: string
}

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: 'web' // Default to 'web', can be 'web' or 'mobile'
  })

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const response = await projectsAPI.getAll()
      setProjects(response.projects || [])
    } catch (error: any) {
      console.error('Error loading projects:', error)
      alert('Failed to load projects: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await projectsAPI.create(formData)
      setProjects([response.project, ...projects])
      setShowCreateModal(false)
      setFormData({ name: '', description: '', platform: 'web' })
    } catch (error: any) {
      console.error('Error creating project:', error)
      alert('Failed to create project: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    try {
      await projectsAPI.delete(id)
      setProjects(projects.filter(p => p.id !== id))
    } catch (error: any) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project: ' + error.message)
    }
  }

  const copySDKKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  if (loading) {
    return (
      <div className="dashboard-page-content">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '2px solid #9333ea', 
            borderTop: 'transparent', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#4b5563' }}>Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p style={{ color: '#4b5563', marginTop: '0.5rem' }}>
            Manage your analytics projects and get SDK keys for integration
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="icon-small" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="empty-state">
          <h3>No projects yet</h3>
          <p>Create your first project to start tracking user analytics</p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)} style={{ marginTop: '1rem' }}>
            <Plus className="icon-small" />
            <span>Create Project</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {projects.map((project) => (
            <div key={project.id} className="stats-card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                    {project.name}
                  </h3>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.25rem 0.5rem', 
                    backgroundColor: '#f3e8ff', 
                    color: '#9333ea', 
                    borderRadius: '4px',
                    fontWeight: '500'
                  }}>
                    {project.platform}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="icon-button"
                    onClick={() => handleDelete(project.id)}
                    title="Delete"
                  >
                    <Trash2 className="icon-small" />
                  </button>
                </div>
              </div>

              {project.description && (
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                  {project.description}
                </p>
              )}

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.5rem' }}>
                  SDK Key
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <code style={{ 
                    flex: 1, 
                    fontSize: '0.75rem', 
                    padding: '0.5rem', 
                    backgroundColor: '#f9fafb', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {project.sdk_key}
                  </code>
                  <button
                    className="icon-button"
                    onClick={() => copySDKKey(project.sdk_key)}
                    title="Copy SDK Key"
                  >
                    {copiedKey === project.sdk_key ? (
                      <Check className="icon-small" style={{ color: '#16a34a' }} />
                    ) : (
                      <Copy className="icon-small" />
                    )}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                Created {new Date(project.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>Create New Project</h2>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Set up a new analytics project
                </p>
              </div>
              <button className="icon-button" onClick={() => setShowCreateModal(false)}>
                <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="modal-body">
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Awesome App"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Platform</label>
                <select
                  className="form-select"
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                >
                  <option value="web">Web</option>
                  <option value="mobile">Mobile App</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

