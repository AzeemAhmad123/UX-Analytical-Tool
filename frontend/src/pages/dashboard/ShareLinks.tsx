/**
 * Share Links Management UI
 * 
 * Create and manage shareable links for funnel analysis
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Link2, Copy, Eye, Lock, Unlock, X, Trash2, ExternalLink, ArrowLeft } from 'lucide-react'
import { projectsAPI, shareLinksAPI, funnelsAPI } from '../../services/api'
import '../../components/dashboard/Dashboard.css'
import './ShareLinks.css'

interface ShareLink {
  id: string
  funnel_id: string
  funnel_name?: string
  token: string
  share_url: string
  expires_at?: string
  max_views?: number
  current_views: number
  password_protected: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export function ShareLinks() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const funnelId = searchParams.get('funnelId')
  
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [funnels, setFunnels] = useState<any[]>([])
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingLink, setEditingLink] = useState<ShareLink | null>(null)

  const [linkForm, setLinkForm] = useState({
    funnel_id: '',
    expires_in_days: 30,
    max_views: undefined as number | undefined,
    password: '',
    start_date: '',
    end_date: '',
    platform_filter: 'all' as 'all' | 'mobile' | 'web',
    country_filter: '',
    device_filter: '',
    app_version_filter: ''
  })

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadFunnels()
      loadShareLinks()
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

  const loadFunnels = async () => {
    if (!selectedProject) return

    try {
      const response = await funnelsAPI.getAll(selectedProject)
      setFunnels(response.funnels || [])
    } catch (error) {
      console.error('Error loading funnels:', error)
    }
  }

  const loadShareLinks = async () => {
    if (!selectedProject) return

    setLoading(true)
    try {
      const allLinks: ShareLink[] = []
      for (const funnel of funnels) {
        try {
          const response = await shareLinksAPI.getAll(selectedProject, funnel.id)
          const links = (response.share_links || []).map((link: any) => ({
            ...link,
            funnel_name: funnel.name,
            share_url: `${window.location.origin}/share/${link.token}`
          }))
          allLinks.push(...links)
        } catch (error) {
          // Skip if no links for this funnel
        }
      }
      setShareLinks(allLinks)
    } catch (error) {
      console.error('Error loading share links:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLink = async () => {
    if (!selectedProject || !linkForm.funnel_id) {
      alert('Please select a funnel')
      return
    }

    setLoading(true)
    try {
      const response = await shareLinksAPI.create(selectedProject, linkForm.funnel_id, {
        expires_in_days: linkForm.expires_in_days,
        max_views: linkForm.max_views,
        password: linkForm.password || undefined,
        start_date: linkForm.start_date || undefined,
        end_date: linkForm.end_date || undefined,
        platform_filter: linkForm.platform_filter,
        country_filter: linkForm.country_filter || undefined,
        device_filter: linkForm.device_filter || undefined,
        app_version_filter: linkForm.app_version_filter || undefined
      })
      
      if (response.share_link) {
        await loadShareLinks()
        setShowCreateModal(false)
        setEditingLink(null)
        resetForm()
      }
    } catch (error: any) {
      alert('Error creating share link: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLink = async (funnelId: string, linkId: string) => {
    if (!selectedProject || !confirm('Are you sure you want to delete this share link?')) return

    setLoading(true)
    try {
      await shareLinksAPI.delete(selectedProject, funnelId, linkId)
      await loadShareLinks()
    } catch (error: any) {
      alert('Error deleting share link: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeLink = async (funnelId: string, linkId: string) => {
    if (!selectedProject || !confirm('Are you sure you want to revoke this share link?')) return

    setLoading(true)
    try {
      await shareLinksAPI.revoke(selectedProject, funnelId, linkId)
      await loadShareLinks()
    } catch (error: any) {
      alert('Error revoking share link: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Link copied to clipboard!')
  }

  const resetForm = () => {
    setLinkForm({
      funnel_id: '',
      expires_in_days: 30,
      max_views: undefined,
      password: '',
      start_date: '',
      end_date: '',
      platform_filter: 'all',
      country_filter: '',
      device_filter: '',
      app_version_filter: ''
    })
  }

  // const openEditModal = (link: ShareLink) => {
  //   setEditingLink(link)
  //   // Note: Editing share links might not be fully supported by backend
  //   // This is a placeholder for future enhancement
  //   setShowCreateModal(true)
  // }

  const handleBack = () => {
    if (funnelId) {
      navigate(`/dashboard/funnels?funnelId=${funnelId}`)
    } else {
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
            <h1 className="page-title">Share Links</h1>
            <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
              Create shareable links to funnel analysis reports
            </p>
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
          <button className="btn-primary" onClick={() => { resetForm(); setEditingLink(null); setShowCreateModal(true) }}>
            <Plus className="icon-small" />
            <span>New Share Link</span>
          </button>
        </div>
      </div>

      {/* Share Links List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading share links...</p>
        </div>
      ) : shareLinks.length > 0 ? (
        <div className="share-links-list">
          {shareLinks.map((link) => (
            <div key={link.id} className={`share-link-card ${!link.is_active ? 'revoked' : ''}`}>
              <div className="share-link-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="share-link-icon">
                    <Link2 size={20} />
                  </div>
                  <div>
                    <h3 className="share-link-name">{link.funnel_name || 'Funnel'}</h3>
                    <div className="share-link-meta">
                      <span>Token: {link.token.substring(0, 8)}...</span>
                      {link.password_protected && (
                        <>
                          <span>•</span>
                          <span>
                            <Lock size={12} />
                            Password Protected
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    className="icon-button"
                    onClick={() => copyToClipboard(link.share_url)}
                    title="Copy link"
                  >
                    <Copy size={16} />
                  </button>
                  <a
                    href={link.share_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="icon-button"
                    title="Open link"
                  >
                    <ExternalLink size={16} />
                  </a>
                  {link.is_active ? (
                    <button
                      className="icon-button"
                      onClick={() => handleRevokeLink(link.funnel_id, link.id)}
                      title="Revoke link"
                    >
                      <Unlock size={16} />
                    </button>
                  ) : (
                    <span className="revoked-badge">Revoked</span>
                  )}
                  <button
                    className="icon-button"
                    onClick={() => handleDeleteLink(link.funnel_id, link.id)}
                    title="Delete link"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="share-link-url">
                <code>{link.share_url}</code>
              </div>
              <div className="share-link-details">
                <div className="share-link-detail-item">
                  <span className="detail-label">Views:</span>
                  <span className="detail-value">
                    {link.current_views} {link.max_views ? `/ ${link.max_views}` : ''}
                  </span>
                </div>
                {link.expires_at && (
                  <div className="share-link-detail-item">
                    <span className="detail-label">Expires:</span>
                    <span className="detail-value">{new Date(link.expires_at).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="share-link-detail-item">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">{new Date(link.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🔗</div>
          <h3>No share links created</h3>
          <p>Create shareable links to share funnel analysis with stakeholders.</p>
          <button className="btn-primary" onClick={() => { resetForm(); setEditingLink(null); setShowCreateModal(true) }}>
            <Plus className="icon-small" />
            <span>Create Share Link</span>
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setEditingLink(null); resetForm() }}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Share Link</h2>
              <button className="modal-close" onClick={() => { setShowCreateModal(false); setEditingLink(null); resetForm() }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Funnel *</label>
                <select
                  className="form-select"
                  value={linkForm.funnel_id}
                  onChange={(e) => setLinkForm({ ...linkForm, funnel_id: e.target.value })}
                >
                  <option value="">Select a funnel</option>
                  {funnels.map(funnel => (
                    <option key={funnel.id} value={funnel.id}>{funnel.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Expires In (Days)</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={linkForm.expires_in_days}
                  onChange={(e) => setLinkForm({ ...linkForm, expires_in_days: parseInt(e.target.value) || 30 })}
                />
                <small className="form-hint">Leave empty for no expiration</small>
              </div>
              <div className="form-group">
                <label className="form-label">Max Views</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={linkForm.max_views || ''}
                  onChange={(e) => setLinkForm({ ...linkForm, max_views: e.target.value ? parseInt(e.target.value) : undefined })}
                />
                <small className="form-hint">Leave empty for unlimited views</small>
              </div>
              <div className="form-group">
                <label className="form-label">Password (Optional)</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Set a password to protect the link"
                  value={linkForm.password}
                  onChange={(e) => setLinkForm({ ...linkForm, password: e.target.value })}
                />
                <small className="form-hint">Optional password protection</small>
              </div>
              <div className="form-group">
                <label className="form-label">Date Range (Optional)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <input
                    type="date"
                    className="form-input"
                    placeholder="Start date"
                    value={linkForm.start_date}
                    onChange={(e) => setLinkForm({ ...linkForm, start_date: e.target.value })}
                  />
                  <input
                    type="date"
                    className="form-input"
                    placeholder="End date"
                    value={linkForm.end_date}
                    onChange={(e) => setLinkForm({ ...linkForm, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Platform Filter</label>
                <select
                  className="form-select"
                  value={linkForm.platform_filter}
                  onChange={(e) => setLinkForm({ ...linkForm, platform_filter: e.target.value as any })}
                >
                  <option value="all">All Platforms</option>
                  <option value="web">Web Only</option>
                  <option value="mobile">Mobile Only</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Country Filter (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., United States"
                  value={linkForm.country_filter}
                  onChange={(e) => setLinkForm({ ...linkForm, country_filter: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setShowCreateModal(false); setEditingLink(null); resetForm() }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateLink} disabled={loading}>
                {loading ? 'Creating...' : 'Create Share Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

