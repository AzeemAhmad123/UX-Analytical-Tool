/**
 * Scheduled Reports Management UI
 * 
 * Create and manage scheduled email reports for funnel analysis
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Mail, Calendar, Clock, X, Edit2, Trash2, Play, FileText, Users, ArrowLeft } from 'lucide-react'
import { projectsAPI, scheduledReportsAPI, funnelsAPI } from '../../services/api'
import '../../components/dashboard/Dashboard.css'
import './ScheduledReports.css'

interface ScheduledReport {
  id: string
  funnel_id: string
  funnel_name?: string
  name: string
  schedule_type: 'daily' | 'weekly' | 'monthly'
  schedule_config?: {
    day_of_week?: number
    day_of_month?: number
    time?: string
    timezone?: string
  }
  recipients: string[]
  report_format: 'html' | 'pdf' | 'csv'
  include_charts: boolean
  enabled: boolean
  last_sent?: string
  next_send?: string
  created_at: string
  updated_at: string
}

export function ScheduledReports() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const funnelId = searchParams.get('funnelId')
  
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [funnels, setFunnels] = useState<any[]>([])
  const [reports, setReports] = useState<ScheduledReport[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null)

  const [reportForm, setReportForm] = useState({
    funnel_id: '',
    name: '',
    schedule_type: 'weekly' as 'daily' | 'weekly' | 'monthly',
    schedule_config: {
      day_of_week: 1,
      day_of_month: 1,
      time: '09:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    recipients: [] as string[],
    report_format: 'html' as 'html' | 'pdf' | 'csv',
    include_charts: true,
    enabled: true
  })

  const [newRecipient, setNewRecipient] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadFunnels()
      loadReports()
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

  const loadReports = async () => {
    if (!selectedProject) return

    setLoading(true)
    try {
      // Load reports for all funnels
      const allReports: ScheduledReport[] = []
      for (const funnel of funnels) {
        try {
          const response = await scheduledReportsAPI.getAll(selectedProject, funnel.id)
          const reports = (response.reports || []).map((r: any) => ({
            ...r,
            funnel_name: funnel.name
          }))
          allReports.push(...reports)
        } catch (error) {
          // Skip if no reports for this funnel
        }
      }
      setReports(allReports)
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReport = async () => {
    if (!selectedProject || !reportForm.funnel_id || !reportForm.name || reportForm.recipients.length === 0) {
      alert('Please fill in all required fields and add at least one recipient')
      return
    }

    setLoading(true)
    try {
      if (editingReport) {
        await scheduledReportsAPI.update(selectedProject, editingReport.funnel_id, editingReport.id, reportForm)
      } else {
        await scheduledReportsAPI.create(selectedProject, reportForm.funnel_id, reportForm)
      }
      await loadReports()
      setShowCreateModal(false)
      setEditingReport(null)
      resetForm()
    } catch (error: any) {
      alert('Error saving report: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReport = async (funnelId: string, reportId: string) => {
    if (!selectedProject || !confirm('Are you sure you want to delete this scheduled report?')) return

    setLoading(true)
    try {
      await scheduledReportsAPI.delete(selectedProject, funnelId, reportId)
      await loadReports()
    } catch (error: any) {
      alert('Error deleting report: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleTriggerReport = async (funnelId: string, reportId: string) => {
    if (!selectedProject) return

    setLoading(true)
    try {
      await scheduledReportsAPI.trigger(selectedProject, funnelId, reportId)
      alert('Report triggered successfully!')
      await loadReports()
    } catch (error: any) {
      alert('Error triggering report: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setReportForm({
      funnel_id: '',
      name: '',
      schedule_type: 'weekly',
      schedule_config: {
        day_of_week: 1,
        day_of_month: 1,
        time: '09:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      recipients: [],
      report_format: 'html',
      include_charts: true,
      enabled: true
    })
    setNewRecipient('')
  }

  const openEditModal = (report: ScheduledReport) => {
    setEditingReport(report)
    setReportForm({
      funnel_id: report.funnel_id,
      name: report.name,
      schedule_type: report.schedule_type,
      schedule_config: report.schedule_config || {
        day_of_week: 1,
        day_of_month: 1,
        time: '09:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      recipients: report.recipients,
      report_format: report.report_format,
      include_charts: report.include_charts,
      enabled: report.enabled
    })
    setShowCreateModal(true)
  }

  const addRecipient = () => {
    if (newRecipient && !reportForm.recipients.includes(newRecipient)) {
      setReportForm({
        ...reportForm,
        recipients: [...reportForm.recipients, newRecipient]
      })
      setNewRecipient('')
    }
  }

  const removeRecipient = (email: string) => {
    setReportForm({
      ...reportForm,
      recipients: reportForm.recipients.filter(r => r !== email)
    })
  }

  const getScheduleLabel = (report: ScheduledReport) => {
    const { schedule_type, schedule_config } = report
    const time = schedule_config?.time || '09:00'
    
    switch (schedule_type) {
      case 'daily':
        return `Daily at ${time}`
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const day = days[schedule_config?.day_of_week || 1]
        return `Weekly on ${day} at ${time}`
      case 'monthly':
        const dayOfMonth = schedule_config?.day_of_month || 1
        return `Monthly on day ${dayOfMonth} at ${time}`
      default:
        return schedule_type
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'html':
        return <FileText size={16} />
      case 'pdf':
        return <FileText size={16} />
      case 'csv':
        return <FileText size={16} />
      default:
        return <FileText size={16} />
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
            <h1 className="page-title">Scheduled Reports</h1>
            <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
              Automate funnel analysis reports via email
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
          <button className="btn-primary" onClick={() => { resetForm(); setEditingReport(null); setShowCreateModal(true) }}>
            <Plus className="icon-small" />
            <span>New Report</span>
          </button>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading reports...</p>
        </div>
      ) : reports.length > 0 ? (
        <div className="reports-list">
          {reports.map((report) => (
            <div key={report.id} className={`report-card ${!report.enabled ? 'disabled' : ''}`}>
              <div className="report-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="report-icon">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h3 className="report-name">{report.name}</h3>
                    <div className="report-meta">
                      <span>{report.funnel_name || 'Funnel'}</span>
                      <span>•</span>
                      <span>{getScheduleLabel(report)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    className="icon-button"
                    onClick={() => handleTriggerReport(report.funnel_id, report.id)}
                    title="Trigger report now"
                  >
                    <Play size={16} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => openEditModal(report)}
                    title="Edit report"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => handleDeleteReport(report.funnel_id, report.id)}
                    title="Delete report"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="report-details">
                <div className="report-detail-item">
                  <span className="detail-label">Recipients:</span>
                  <div className="recipients-list">
                    {report.recipients.map((email, idx) => (
                      <span key={idx} className="recipient-badge">{email}</span>
                    ))}
                  </div>
                </div>
                <div className="report-detail-item">
                  <span className="detail-label">Format:</span>
                  <span className="format-badge">
                    {getFormatIcon(report.report_format)}
                    {report.report_format.toUpperCase()}
                  </span>
                </div>
                <div className="report-detail-item">
                  <span className="detail-label">Include Charts:</span>
                  <span className="detail-value">{report.include_charts ? 'Yes' : 'No'}</span>
                </div>
                {report.last_sent && (
                  <div className="report-detail-item">
                    <span className="detail-label">Last Sent:</span>
                    <span className="detail-value">{new Date(report.last_sent).toLocaleString()}</span>
                  </div>
                )}
                {report.next_send && (
                  <div className="report-detail-item">
                    <span className="detail-label">Next Send:</span>
                    <span className="detail-value">{new Date(report.next_send).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📧</div>
          <h3>No scheduled reports</h3>
          <p>Create scheduled reports to automatically send funnel analysis via email.</p>
          <button className="btn-primary" onClick={() => { resetForm(); setEditingReport(null); setShowCreateModal(true) }}>
            <Plus className="icon-small" />
            <span>Create Report</span>
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setEditingReport(null); resetForm() }}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingReport ? 'Edit Scheduled Report' : 'Create New Scheduled Report'}</h2>
              <button className="modal-close" onClick={() => { setShowCreateModal(false); setEditingReport(null); resetForm() }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Funnel *</label>
                <select
                  className="form-select"
                  value={reportForm.funnel_id}
                  onChange={(e) => setReportForm({ ...reportForm, funnel_id: e.target.value })}
                >
                  <option value="">Select a funnel</option>
                  {funnels.map(funnel => (
                    <option key={funnel.id} value={funnel.id}>{funnel.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Report Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Weekly Funnel Report"
                  value={reportForm.name}
                  onChange={(e) => setReportForm({ ...reportForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Schedule Type *</label>
                <select
                  className="form-select"
                  value={reportForm.schedule_type}
                  onChange={(e) => setReportForm({ ...reportForm, schedule_type: e.target.value as any })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {reportForm.schedule_type === 'weekly' && (
                <div className="form-group">
                  <label className="form-label">Day of Week *</label>
                  <select
                    className="form-select"
                    value={reportForm.schedule_config.day_of_week}
                    onChange={(e) => setReportForm({
                      ...reportForm,
                      schedule_config: { ...reportForm.schedule_config, day_of_week: parseInt(e.target.value) }
                    })}
                  >
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>
              )}
              {reportForm.schedule_type === 'monthly' && (
                <div className="form-group">
                  <label className="form-label">Day of Month *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    max="31"
                    value={reportForm.schedule_config.day_of_month}
                    onChange={(e) => setReportForm({
                      ...reportForm,
                      schedule_config: { ...reportForm.schedule_config, day_of_month: parseInt(e.target.value) }
                    })}
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Time *</label>
                <input
                  type="time"
                  className="form-input"
                  value={reportForm.schedule_config.time}
                  onChange={(e) => setReportForm({
                    ...reportForm,
                    schedule_config: { ...reportForm.schedule_config, time: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Recipients *</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="email@example.com"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                  />
                  <button className="btn-secondary" onClick={addRecipient}>
                    Add
                  </button>
                </div>
                {reportForm.recipients.length > 0 && (
                  <div className="recipients-list">
                    {reportForm.recipients.map((email, idx) => (
                      <span key={idx} className="recipient-badge">
                        {email}
                        <button
                          className="badge-remove"
                          onClick={() => removeRecipient(email)}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Report Format *</label>
                <select
                  className="form-select"
                  value={reportForm.report_format}
                  onChange={(e) => setReportForm({ ...reportForm, report_format: e.target.value as any })}
                >
                  <option value="html">HTML</option>
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={reportForm.include_charts}
                    onChange={(e) => setReportForm({ ...reportForm, include_charts: e.target.checked })}
                  />
                  <span>Include charts in report</span>
                </label>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={reportForm.enabled}
                    onChange={(e) => setReportForm({ ...reportForm, enabled: e.target.checked })}
                  />
                  <span>Enable scheduled report</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setShowCreateModal(false); setEditingReport(null); resetForm() }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateReport} disabled={loading}>
                {loading ? 'Saving...' : editingReport ? 'Update Report' : 'Create Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

