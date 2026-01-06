import { useState } from 'react'
import { Plus, Search, ChevronDown, Star, X } from 'lucide-react'
import '../../components/dashboard/Dashboard.css'

export function Dashboards() {
  const [showNewDashboardModal, setShowNewDashboardModal] = useState(false)

  const templates = [
    {
      id: 'site-performance',
      title: 'Site performance',
      color: 'purple',
      metrics: [
        { label: 'Page views', value: '4,283,239' },
        { label: 'Bounce rate', value: '23%' }
      ]
    },
    {
      id: 'segment-performance',
      title: 'Segment performance',
      color: 'green',
      metrics: [
        { label: 'Compared to segment A', subLabel: 'Number of sessions', value: '2.9M' },
        { label: 'Bounce rate difference', value: '1.55%' }
      ]
    },
    {
      id: 'see-all',
      title: 'See all templates',
      isViewAll: true
    }
  ]

  const modalTemplates = [
    {
      id: 'page-issues',
      title: 'Page issues',
      description: 'Learn where users are getting frustrated or confused, experiencing errors, and more',
      color: 'green'
    },
    {
      id: 'page-overview',
      title: 'Page overview',
      description: 'Track key usage metrics for a single page',
      color: 'purple'
    },
    {
      id: 'web-vitals',
      title: 'Web vitals monitoring',
      description: 'Measure Core Web Vitals to optimize your site\'s performance',
      color: 'blue'
    },
    {
      id: 'segment-perf',
      title: 'Segment performance',
      description: 'Monitor the performance of specific segments to understand impacts and trends',
      color: 'green'
    },
    {
      id: 'site-perf',
      title: 'Site performance',
      description: 'Track key metrics to monitor and optimize your site',
      color: 'purple'
    }
  ]

  return (
    <div className="dashboard-page-content">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <h1 className="page-title">All dashboards</h1>
          <button className="btn-primary" onClick={() => setShowNewDashboardModal(true)}>
            <Plus className="icon-small" />
            <span>New dashboard</span>
          </button>
        </div>
        <p style={{ color: '#4b5563' }}>Dashboards created by you and members of your organization appear here</p>
      </div>

      {/* Templates Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>Get started with a template</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {templates.map((template) => (
            <div key={template.id} className="template-card">
              {template.isViewAll ? (
                <>
                  <div style={{ height: '128px', backgroundColor: '#f9fafb', padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    <div style={{ backgroundColor: '#dbeafe', borderRadius: '4px', border: '2px solid #93c5fd' }}></div>
                    <div style={{ backgroundColor: '#f3e8ff', borderRadius: '4px', border: '2px solid #c084fc' }}></div>
                    <div style={{ backgroundColor: '#e0e7ff', borderRadius: '4px', border: '2px solid #818cf8' }}></div>
                    <div style={{ backgroundColor: '#dcfce7', borderRadius: '4px', border: '2px solid #86efac' }}></div>
                    <div style={{ backgroundColor: '#f3e8ff', borderRadius: '4px', border: '2px solid #c084fc' }}></div>
                    <div style={{ backgroundColor: '#f3f4f6', borderRadius: '4px', border: '2px solid #d1d5db' }}></div>
                  </div>
                  <div className="template-content">
                    <h3 className="template-title">{template.title}</h3>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ 
                    height: '128px', 
                    padding: '1rem',
                    background: template.color === 'purple' 
                      ? 'linear-gradient(to bottom right, #a855f7, #9333ea)' 
                      : 'linear-gradient(to bottom right, #86efac, #22c55e)'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', height: '100%' }}>
                      {template.metrics?.map((metric, idx) => (
                        <div key={idx} style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', padding: '0.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.25rem' }}>{metric.label}</div>
                          {metric.subLabel && (
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{metric.subLabel}</div>
                          )}
                          <div style={{ fontWeight: 'bold', color: '#111827' }}>{metric.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="template-content">
                    <h3 className="template-title">{template.title}</h3>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div className="search-input">
          <Search className="search-icon" />
          <input type="text" placeholder="Search a dashboard" />
        </div>
        <button className="filter-button">
          <svg className="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Quick filters</span>
          <ChevronDown className="icon-small" />
        </button>
        <button className="filter-button">
          <span>All categories</span>
          <ChevronDown className="icon-small" />
        </button>
        <button className="filter-button">
          <span>All owners</span>
          <ChevronDown className="icon-small" />
        </button>
      </div>

      {/* Dashboards Table */}
      <div className="data-table">
        <table style={{ width: '100%' }}>
          <thead className="table-header">
            <tr>
              <th className="table-header-cell">
                <input type="checkbox" style={{ borderRadius: '4px', borderColor: '#d1d5db' }} />
              </th>
              <th className="table-header-cell">Dashboards (1)</th>
              <th className="table-header-cell">Category</th>
              <th className="table-header-cell">Last updated</th>
              <th className="table-header-cell">Owned by</th>
              <th className="table-header-cell">Your rights</th>
              <th className="table-header-cell">Shared with</th>
            </tr>
          </thead>
          <tbody>
            <tr className="table-row">
              <td className="table-cell">
                <input type="checkbox" style={{ borderRadius: '4px', borderColor: '#d1d5db' }} />
              </td>
              <td className="table-cell">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Star className="icon-small" style={{ color: '#9ca3af' }} />
                  <span style={{ fontSize: '0.875rem', color: '#111827' }}>Key Performance Metrics</span>
                </div>
              </td>
              <td className="table-cell" style={{ fontSize: '0.875rem', color: '#4b5563' }}>-</td>
              <td className="table-cell" style={{ fontSize: '0.875rem', color: '#4b5563' }}>Jan 4, 2026 by You</td>
              <td className="table-cell" style={{ fontSize: '0.875rem', color: '#4b5563' }}>You</td>
              <td className="table-cell">
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  padding: '0.125rem 0.625rem', 
                  borderRadius: '9999px', 
                  fontSize: '0.75rem', 
                  fontWeight: '500', 
                  backgroundColor: '#fef3c7', 
                  color: '#92400e' 
                }}>
                  Owner
                </span>
              </td>
              <td className="table-cell" style={{ fontSize: '0.875rem', color: '#4b5563' }}>-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* New Dashboard Modal */}
      {showNewDashboardModal && (
        <div className="modal-overlay" onClick={() => setShowNewDashboardModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>New dashboard</h2>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>What would you like to track</p>
              </div>
              <button className="icon-button" onClick={() => setShowNewDashboardModal(false)}>
                <X className="icon" />
              </button>
            </div>

            <div className="modal-body">
              {/* Search */}
              <div className="search-input" style={{ marginBottom: '1.5rem' }}>
                <Search className="search-icon" />
                <input type="text" placeholder="Search a dashboard template..." />
              </div>

              {/* Create Custom Dashboard */}
              <div style={{ 
                marginBottom: '1.5rem', 
                padding: '1rem', 
                border: '2px dashed #d1d5db', 
                borderRadius: '8px', 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }} onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#c084fc'
                e.currentTarget.style.backgroundColor = 'rgba(250, 245, 255, 0.5)'
              }} onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                  <div style={{ flexShrink: 0, width: '40px', height: '40px', backgroundColor: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus className="icon" style={{ color: '#4b5563' }} />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>Create custom dashboard</h3>
                    <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>Customize your dashboard with the metrics that matter most to you</p>
                  </div>
                </div>
              </div>

              {/* From a template */}
              <h3 style={{ fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>From a template</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {modalTemplates.map((template) => (
                  <div
                    key={template.id}
                    style={{
                      padding: '1rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#c084fc'
                      e.currentTarget.style.backgroundColor = 'rgba(250, 245, 255, 0.5)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                      <div style={{
                        flexShrink: 0,
                        width: '64px',
                        height: '48px',
                        borderRadius: '4px',
                        border: '2px solid',
                        ...(template.color === 'green' ? { backgroundColor: '#dcfce7', borderColor: '#86efac' } :
                            template.color === 'purple' ? { backgroundColor: '#f3e8ff', borderColor: '#c084fc' } :
                            { backgroundColor: '#dbeafe', borderColor: '#93c5fd' })
                      }}></div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>{template.title}</h4>
                        <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>{template.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

