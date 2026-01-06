import { useState } from 'react'
import { Plus, ExternalLink } from 'lucide-react'
import '../../components/dashboard/Dashboard.css'

export function VoiceOfCustomer() {
  const [activeTab, setActiveTab] = useState<'surveys' | 'interviews' | 'tests'>('surveys')

  const templates = [
    {
      id: 'browse',
      title: 'Browse all templates',
      icon: '📋',
      color: '#f9fafb'
    },
    {
      id: 'survey',
      title: 'Collect ongoing feedback via a survey',
      icon: '📝',
      badge: 'SURVEY',
      color: '#fff7ed',
      stars: 5
    },
    {
      id: 'prototype',
      title: 'Assess prototype or website usability in user interviews',
      icon: '💬',
      badge: 'INTERVIEW',
      color: '#fdf2f8'
    },
    {
      id: 'validate',
      title: 'Validate design concepts or ideas in user interviews',
      icon: '📄',
      badge: 'INTERVIEW',
      color: '#faf5ff'
    },
    {
      id: 'nps',
      title: 'Measure long-term loyalty with an NPS® survey',
      icon: '📊',
      badge: 'SURVEY',
      color: '#fff7ed'
    },
    {
      id: 'unmoderated',
      title: 'Run an unmoderated test on a live website',
      icon: '🖥️',
      badge: 'TEST',
      color: '#eff6ff'
    }
  ]

  return (
    <div className="dashboard-page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.875rem', marginBottom: '0.25rem' }}>Voice of Customer</h1>
          <p style={{ color: '#4b5563' }}>Get insights fast by connecting with users through surveys, tests, and interviews</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn-secondary">
            <span>Share</span>
          </button>
          <button className="btn-primary">
            <Plus className="icon-small" />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem', marginTop: '2rem' }}>
        {templates.map((template) => (
          <div
            key={template.id}
            style={{
              backgroundColor: template.color,
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.5rem',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%' }}>
              <div style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>{template.icon}</div>
              {template.badge && (
                <span style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  borderRadius: '4px',
                  marginBottom: '0.75rem',
                  ...(template.badge === 'SURVEY' ? { backgroundColor: '#fed7aa', color: '#9a3412' } :
                      template.badge === 'INTERVIEW' ? { backgroundColor: '#fbcfe8', color: '#9f1239' } :
                      { backgroundColor: '#bfdbfe', color: '#1e40af' })
                }}>
                  {template.badge}
                </span>
              )}
              <h3 style={{ fontWeight: '500', color: '#111827', marginBottom: '0.5rem' }}>{template.title}</h3>
              {template.stars && (
                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                  {[...Array(template.stars)].map((_, i) => (
                    <span key={i} style={{ color: '#fbbf24' }}>⭐</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            onClick={() => setActiveTab('surveys')}
            className={`tab ${activeTab === 'surveys' ? 'tab-active' : ''}`}
          >
            Surveys
          </button>
          <button
            onClick={() => setActiveTab('interviews')}
            className={`tab ${activeTab === 'interviews' ? 'tab-active' : ''}`}
          >
            Interviews
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`tab ${activeTab === 'tests' ? 'tab-active' : ''}`}
          >
            Tests
          </button>
        </div>
      </div>

      {/* Empty State */}
      <div className="empty-state">
        <div style={{ marginBottom: '1rem' }}>
          <svg className="icon" style={{ width: '64px', height: '64px', margin: '0 auto', color: '#d1d5db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3>No surveys yet</h3>
        <p style={{ marginBottom: '1rem' }}>When you create a new survey, it will show up here.</p>
        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}>
          <span>Create survey</span>
          <ExternalLink className="icon-small" />
        </button>
      </div>

      {/* Sidebar Info */}
      <div style={{ marginTop: '2rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>Responses</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>0 / 100</span>
        </div>
        <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '8px', marginBottom: '0.5rem' }}>
          <div style={{ backgroundColor: '#9333ea', height: '8px', borderRadius: '9999px', width: '0%' }}></div>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#4b5563' }}>Resets Feb 1</p>
      </div>
    </div>
  )
}

