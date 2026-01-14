/**
 * Privacy Settings UI
 * 
 * Configure privacy settings including field masking, GDPR consent, sampling, and data retention
 */

import { useState, useEffect } from 'react'
import { Shield, EyeOff, Lock, Save, CheckCircle, Calendar, Users, X } from 'lucide-react'
import { projectsAPI, privacyAPI } from '../../services/api'
import '../../components/dashboard/Dashboard.css'
import './PrivacySettings.css'

interface PrivacySettings {
  field_masking: {
    enabled: boolean
    masked_fields: string[]
    mask_type: 'redact' | 'hash' | 'partial'
  }
  gdpr_compliance: {
    enabled: boolean
    require_consent: boolean
    consent_types: string[]
  }
  data_sampling: {
    enabled: boolean
    sampling_rate: number // 0-100 percentage
  }
  data_retention: {
    enabled: boolean
    retention_days: number
    auto_delete: boolean
  }
  ip_anonymization: {
    enabled: boolean
    anonymize_last_octet: boolean
  }
}

interface ConsentRecord {
  id: string
  session_id: string
  consent_type: string
  granted: boolean
  timestamp: string
  user_agent?: string
  ip_address?: string
}

export function PrivacySettings() {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [settings, setSettings] = useState<PrivacySettings | null>(null)
  const [consentHistory, setConsentHistory] = useState<ConsentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newMaskedField, setNewMaskedField] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadSettings()
      loadConsentHistory()
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

  const loadSettings = async () => {
    if (!selectedProject) return

    setLoading(true)
    try {
      const response = await privacyAPI.getSettings(selectedProject)
      setSettings(response.settings || {
        field_masking: {
          enabled: false,
          masked_fields: [],
          mask_type: 'redact'
        },
        gdpr_compliance: {
          enabled: false,
          require_consent: false,
          consent_types: []
        },
        data_sampling: {
          enabled: false,
          sampling_rate: 100
        },
        data_retention: {
          enabled: false,
          retention_days: 365,
          auto_delete: false
        },
        ip_anonymization: {
          enabled: false,
          anonymize_last_octet: true
        }
      })
    } catch (error) {
      console.error('Error loading privacy settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadConsentHistory = async () => {
    if (!selectedProject) return

    try {
      const response = await privacyAPI.getConsentHistory(selectedProject, 50)
      setConsentHistory(response.consent_history || [])
    } catch (error) {
      console.error('Error loading consent history:', error)
    }
  }

  const handleSaveSettings = async () => {
    if (!selectedProject || !settings) return

    setSaving(true)
    try {
      await privacyAPI.updateSettings(selectedProject, settings)
      alert('Privacy settings saved successfully!')
    } catch (error: any) {
      alert('Error saving settings: ' + (error.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const addMaskedField = () => {
    if (!settings || !newMaskedField) return

    if (!settings.field_masking.masked_fields.includes(newMaskedField)) {
      setSettings({
        ...settings,
        field_masking: {
          ...settings.field_masking,
          masked_fields: [...settings.field_masking.masked_fields, newMaskedField]
        }
      })
      setNewMaskedField('')
    }
  }

  const removeMaskedField = (field: string) => {
    if (!settings) return

    setSettings({
      ...settings,
      field_masking: {
        ...settings.field_masking,
        masked_fields: settings.field_masking.masked_fields.filter(f => f !== field)
      }
    })
  }

  const addConsentType = (type: string) => {
    if (!settings || settings.gdpr_compliance.consent_types.includes(type)) return

    setSettings({
      ...settings,
      gdpr_compliance: {
        ...settings.gdpr_compliance,
        consent_types: [...settings.gdpr_compliance.consent_types, type]
      }
    })
  }

  const removeConsentType = (type: string) => {
    if (!settings) return

    setSettings({
      ...settings,
      gdpr_compliance: {
        ...settings.gdpr_compliance,
        consent_types: settings.gdpr_compliance.consent_types.filter(t => t !== type)
      }
    })
  }

  if (!settings) {
    return (
      <div className="dashboard-page-content">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading privacy settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Privacy Settings</h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Configure data privacy, GDPR compliance, and data retention policies
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
          <button className="btn-primary" onClick={handleSaveSettings} disabled={saving}>
            <Save className="icon-small" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Field Masking */}
      <div className="privacy-section">
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <EyeOff size={24} style={{ color: '#8b5cf6' }} />
            <h2 className="section-title">Field Masking</h2>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.field_masking.enabled}
              onChange={(e) => setSettings({
                ...settings,
                field_masking: { ...settings.field_masking, enabled: e.target.checked }
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        {settings.field_masking.enabled && (
          <div className="section-content">
            <div className="form-group">
              <label className="form-label">Mask Type</label>
              <select
                className="form-select"
                value={settings.field_masking.mask_type}
                onChange={(e) => setSettings({
                  ...settings,
                  field_masking: { ...settings.field_masking, mask_type: e.target.value as any }
                })}
              >
                <option value="redact">Redact (Remove)</option>
                <option value="hash">Hash</option>
                <option value="partial">Partial Mask</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Masked Fields</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., email, password, credit_card"
                  value={newMaskedField}
                  onChange={(e) => setNewMaskedField(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addMaskedField()}
                />
                <button className="btn-secondary" onClick={addMaskedField}>
                  Add
                </button>
              </div>
              {settings.field_masking.masked_fields.length > 0 && (
                <div className="field-tags">
                  {settings.field_masking.masked_fields.map((field, idx) => (
                    <span key={idx} className="field-tag">
                      {field}
                      <button className="tag-remove" onClick={() => removeMaskedField(field)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* GDPR Compliance */}
      <div className="privacy-section">
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Shield size={24} style={{ color: '#10b981' }} />
            <h2 className="section-title">GDPR Compliance</h2>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.gdpr_compliance.enabled}
              onChange={(e) => setSettings({
                ...settings,
                gdpr_compliance: { ...settings.gdpr_compliance, enabled: e.target.checked }
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        {settings.gdpr_compliance.enabled && (
          <div className="section-content">
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.gdpr_compliance.require_consent}
                  onChange={(e) => setSettings({
                    ...settings,
                    gdpr_compliance: { ...settings.gdpr_compliance, require_consent: e.target.checked }
                  })}
                />
                <span>Require explicit consent before tracking</span>
              </label>
            </div>
            <div className="form-group">
              <label className="form-label">Consent Types</label>
              <div className="consent-types">
                {['analytics', 'marketing', 'functional', 'necessary'].map(type => (
                  <label key={type} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.gdpr_compliance.consent_types.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          addConsentType(type)
                        } else {
                          removeConsentType(type)
                        }
                      }}
                    />
                    <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Sampling */}
      <div className="privacy-section">
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={24} style={{ color: '#3b82f6' }} />
            <h2 className="section-title">Data Sampling</h2>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.data_sampling.enabled}
              onChange={(e) => setSettings({
                ...settings,
                data_sampling: { ...settings.data_sampling, enabled: e.target.checked }
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        {settings.data_sampling.enabled && (
          <div className="section-content">
            <div className="form-group">
              <label className="form-label">Sampling Rate: {settings.data_sampling.sampling_rate}%</label>
              <input
                type="range"
                min="1"
                max="100"
                value={settings.data_sampling.sampling_rate}
                onChange={(e) => setSettings({
                  ...settings,
                  data_sampling: { ...settings.data_sampling, sampling_rate: parseInt(e.target.value) }
                })}
                className="slider"
              />
              <small className="form-hint">Track only {settings.data_sampling.sampling_rate}% of sessions</small>
            </div>
          </div>
        )}
      </div>

      {/* Data Retention */}
      <div className="privacy-section">
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar size={24} style={{ color: '#f59e0b' }} />
            <h2 className="section-title">Data Retention</h2>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.data_retention.enabled}
              onChange={(e) => setSettings({
                ...settings,
                data_retention: { ...settings.data_retention, enabled: e.target.checked }
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        {settings.data_retention.enabled && (
          <div className="section-content">
            <div className="form-group">
              <label className="form-label">Retention Period (Days)</label>
              <input
                type="number"
                className="form-input"
                min="1"
                value={settings.data_retention.retention_days}
                onChange={(e) => setSettings({
                  ...settings,
                  data_retention: { ...settings.data_retention, retention_days: parseInt(e.target.value) || 365 }
                })}
              />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.data_retention.auto_delete}
                  onChange={(e) => setSettings({
                    ...settings,
                    data_retention: { ...settings.data_retention, auto_delete: e.target.checked }
                  })}
                />
                <span>Automatically delete data after retention period</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* IP Anonymization */}
      <div className="privacy-section">
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Lock size={24} style={{ color: '#ef4444' }} />
            <h2 className="section-title">IP Anonymization</h2>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.ip_anonymization.enabled}
              onChange={(e) => setSettings({
                ...settings,
                ip_anonymization: { ...settings.ip_anonymization, enabled: e.target.checked }
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        {settings.ip_anonymization.enabled && (
          <div className="section-content">
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.ip_anonymization.anonymize_last_octet}
                  onChange={(e) => setSettings({
                    ...settings,
                    ip_anonymization: { ...settings.ip_anonymization, anonymize_last_octet: e.target.checked }
                  })}
                />
                <span>Anonymize last octet of IP address (e.g., 192.168.1.xxx)</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Consent History */}
      <div className="privacy-section">
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle size={24} style={{ color: '#10b981' }} />
            <h2 className="section-title">Consent History</h2>
          </div>
        </div>
        <div className="section-content">
          {consentHistory.length > 0 ? (
            <div className="consent-history-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Session ID</th>
                    <th>Consent Type</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {consentHistory.map((record) => (
                    <tr key={record.id}>
                      <td>{record.session_id.substring(0, 12)}...</td>
                      <td>{record.consent_type}</td>
                      <td>
                        <span className={`consent-badge ${record.granted ? 'granted' : 'denied'}`}>
                          {record.granted ? 'Granted' : 'Denied'}
                        </span>
                      </td>
                      <td>{new Date(record.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state-small">
              <p>No consent history available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

