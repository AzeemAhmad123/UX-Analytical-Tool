/**
 * Alert Management UI
 * 
 * Create and manage funnel alerts for conversion drops and anomalies
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Bell, AlertTriangle, X, Edit2, Trash2, Mail, Webhook, TrendingDown, ArrowLeft } from 'lucide-react'
import { projectsAPI, alertsAPI, funnelsAPI } from '../../services/api'
import '../../components/dashboard/Dashboard.css'
import './Alerts.css'

interface Alert {
  id: string
  funnel_id: string
  funnel_name?: string
  name: string
  alert_type: 'conversion_drop' | 'step_break' | 'anomaly'
  threshold: number
  comparison_period: 'day' | 'week' | 'month'
  notification_channels: string[]
  enabled: boolean
  last_triggered?: string
  created_at: string
  updated_at: string
}

export function Alerts() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const funnelId = searchParams.get('funnelId')
  
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [funnels, setFunnels] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null)

  const [alertForm, setAlertForm] = useState({
    funnel_id: '',
    name: '',
    alert_type: 'conversion_drop' as 'conversion_drop' | 'step_break' | 'anomaly',
    threshold: 10,
    comparison_period: 'day' as 'day' | 'week' | 'month',
    notification_channels: [] as string[],
    enabled: true
  })

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadAlerts()
      loadFunnels()
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

  const loadAlerts = async () => {
    if (!selectedProject) return

    setLoading(true)
    try {
      // Load alerts for all funnels
      const funnelsResponse = await funnelsAPI.getAll(selectedProject)
      const allFunnels = funnelsResponse.funnels || []
      const allAlerts: Alert[] = []
      
      for (const funnel of allFunnels) {
        try {
          const response = await alertsAPI.getAll(selectedProject, funnel.id)
          const alerts = (response.alerts || []).map((alert: any) => ({
            ...alert,
            funnel_name: funnel.name
          }))
          allAlerts.push(...alerts)
        } catch (error) {
          // Skip funnels without alerts
          console.warn(`No alerts for funnel ${funnel.id}`)
        }
      }
      
      setAlerts(allAlerts)
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAlert = async () => {
    if (!selectedProject || !alertForm.funnel_id || !alertForm.name) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      if (editingAlert) {
        await alertsAPI.update(selectedProject, alertForm.funnel_id, editingAlert.id, alertForm)
      } else {
        await alertsAPI.create(selectedProject, alertForm.funnel_id, alertForm)
      }
      await loadAlerts()
      setShowCreateModal(false)
      setEditingAlert(null)
      resetForm()
    } catch (error: any) {
      alert('Error saving alert: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAlert = async (alertId: string, alertFunnelId: string) => {
    if (!selectedProject || !confirm('Are you sure you want to delete this alert?')) return

    setLoading(true)
    try {
      await alertsAPI.delete(selectedProject, alertFunnelId, alertId)
      await loadAlerts()
    } catch (error: any) {
      alert('Error deleting alert: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAlert = async (alertId: string, alertFunnelId: string, enabled: boolean) => {
    if (!selectedProject) return

    setLoading(true)
    try {
      await alertsAPI.update(selectedProject, alertFunnelId, alertId, { enabled })
      await loadAlerts()
    } catch (error: any) {
      alert('Error updating alert: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setAlertForm({
      funnel_id: '',
      name: '',
      alert_type: 'conversion_drop',
      threshold: 10,
      comparison_period: 'day',
      notification_channels: [],
      enabled: true
    })
  }

  const openEditModal = (alert: Alert) => {
    setEditingAlert(alert)
    setAlertForm({
      funnel_id: alert.funnel_id,
      name: alert.name,
      alert_type: alert.alert_type,
      threshold: alert.threshold,
      comparison_period: alert.comparison_period,
      notification_channels: alert.notification_channels,
      enabled: alert.enabled
    })
    setShowCreateModal(true)
  }

  const toggleNotificationChannel = (channel: string) => {
    const channels = [...alertForm.notification_channels]
    const index = channels.indexOf(channel)
    if (index > -1) {
      channels.splice(index, 1)
    } else {
      channels.push(channel)
    }
    setAlertForm({ ...alertForm, notification_channels: channels })
  }

  const getAlertTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      conversion_drop: 'Conversion Drop',
      step_break: 'Step Break',
      anomaly: 'Anomaly Detected'
    }
    return labels[type] || type
  }

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'conversion_drop':
        return <TrendingDown size={16} />
      case 'step_break':
        return <AlertTriangle size={16} />
      case 'anomaly':
        return <Bell size={16} />
      default:
        return <Bell size={16} />
    }
  }

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
            <h1 className="page-title">Funnel Alerts</h1>
            <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
              Get notified when conversion rates drop or anomalies are detected
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
          <button className="btn-primary" onClick={() => { resetForm(); setEditingAlert(null); setShowCreateModal(true) }}>
            <Plus className="icon-small" />
            <span>New Alert</span>
          </button>
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading alerts...</p>
        </div>
      ) : alerts.length > 0 ? (
        <div className="alerts-list">
          {alerts.map((alert) => (
            <div key={alert.id} className={`alert-card ${!alert.enabled ? 'disabled' : ''}`}>
              <div className="alert-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className={`alert-type-icon ${alert.alert_type}`}>
                    {getAlertTypeIcon(alert.alert_type)}
                  </div>
                  <div>
                    <h3 className="alert-name">{alert.name}</h3>
                    <div className="alert-meta">
                      <span>{alert.funnel_name || 'Funnel'}</span>
                      <span>•</span>
                      <span>{getAlertTypeLabel(alert.alert_type)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={alert.enabled}
                      onChange={(e) => handleToggleAlert(alert.id, alert.funnel_id, e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <button
                    className="icon-button"
                    onClick={() => openEditModal(alert)}
                    title="Edit alert"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => handleDeleteAlert(alert.id, alert.funnel_id)}
                    title="Delete alert"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="alert-details">
                <div className="alert-detail-item">
                  <span className="detail-label">Threshold:</span>
                  <span className="detail-value">{alert.threshold}% drop</span>
                </div>
                <div className="alert-detail-item">
                  <span className="detail-label">Comparison Period:</span>
                  <span className="detail-value">{alert.comparison_period}</span>
                </div>
                <div className="alert-detail-item">
                  <span className="detail-label">Notifications:</span>
                  <div className="notification-channels">
                    {alert.notification_channels.includes('email') && (
                      <span className="channel-badge">
                        <Mail size={12} />
                        Email
                      </span>
                    )}
                    {alert.notification_channels.includes('webhook') && (
                      <span className="channel-badge">
                        <Webhook size={12} />
                        Webhook
                      </span>
                    )}
                  </div>
                </div>
                {alert.last_triggered && (
                  <div className="alert-detail-item">
                    <span className="detail-label">Last Triggered:</span>
                    <span className="detail-value">{new Date(alert.last_triggered).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <h3>No alerts configured</h3>
          <p>Create alerts to get notified when conversion rates drop or issues are detected.</p>
          <button className="btn-primary" onClick={() => { resetForm(); setEditingAlert(null); setShowCreateModal(true) }}>
            <Plus className="icon-small" />
            <span>Create Alert</span>
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setEditingAlert(null); resetForm() }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAlert ? 'Edit Alert' : 'Create New Alert'}</h2>
              <button className="modal-close" onClick={() => { setShowCreateModal(false); setEditingAlert(null); resetForm() }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Funnel *</label>
                <select
                  className="form-select"
                  value={alertForm.funnel_id}
                  onChange={(e) => setAlertForm({ ...alertForm, funnel_id: e.target.value })}
                >
                  <option value="">Select a funnel</option>
                  {funnels.map(funnel => (
                    <option key={funnel.id} value={funnel.id}>{funnel.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Alert Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Checkout Drop Alert"
                  value={alertForm.name}
                  onChange={(e) => setAlertForm({ ...alertForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Alert Type *</label>
                <select
                  className="form-select"
                  value={alertForm.alert_type}
                  onChange={(e) => setAlertForm({ ...alertForm, alert_type: e.target.value as any })}
                >
                  <option value="conversion_drop">Conversion Drop</option>
                  <option value="step_break">Step Break</option>
                  <option value="anomaly">Anomaly Detected</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Threshold (%) *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="10"
                  min="1"
                  max="100"
                  value={alertForm.threshold}
                  onChange={(e) => setAlertForm({ ...alertForm, threshold: parseInt(e.target.value) || 0 })}
                />
                <small className="form-hint">Alert when conversion drops by this percentage</small>
              </div>
              <div className="form-group">
                <label className="form-label">Comparison Period *</label>
                <select
                  className="form-select"
                  value={alertForm.comparison_period}
                  onChange={(e) => setAlertForm({ ...alertForm, comparison_period: e.target.value as any })}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notification Channels</label>
                <div className="notification-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={alertForm.notification_channels.includes('email')}
                      onChange={() => toggleNotificationChannel('email')}
                    />
                    <Mail size={16} />
                    <span>Email</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={alertForm.notification_channels.includes('webhook')}
                      onChange={() => toggleNotificationChannel('webhook')}
                    />
                    <Webhook size={16} />
                    <span>Webhook</span>
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={alertForm.enabled}
                    onChange={(e) => setAlertForm({ ...alertForm, enabled: e.target.checked })}
                  />
                  <span>Enable alert</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setShowCreateModal(false); setEditingAlert(null); resetForm() }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateAlert} disabled={loading}>
                {loading ? 'Saving...' : editingAlert ? 'Update Alert' : 'Create Alert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
