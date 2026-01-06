import { useState } from 'react'
import { Plus, LayoutGrid, ChevronUp } from 'lucide-react'
import '../../components/dashboard/Dashboard.css'

export function Funnel() {
  const [expandedSection, setExpandedSection] = useState(true)

  return (
    <div className="dashboard-page-content">
      {/* Header */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Funnel</h1>
            <p style={{ color: '#4b5563' }}>Measure conversions and learn why users drop off</p>
          </div>
          <button className="icon-button">
            <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="filters-row" style={{ marginBottom: '2rem' }}>
        <button className="filter-button">
          <LayoutGrid className="icon-small" />
          <span>All</span>
        </button>
        
        <button className="filter-button">
          <svg className="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
            <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/>
            <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/>
            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
          </svg>
          <span>Dec 28, 2025 - Jan 3, 2026 (7 days)</span>
        </button>

        <button className="filter-button">
          <svg className="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>All users</span>
        </button>
      </div>

      {/* Funnel Steps Section */}
      <div className="collapsible-section" style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => setExpandedSection(!expandedSection)}
          className="collapsible-header"
        >
          <div>
            <h2 style={{ fontWeight: '600', color: '#111827', textAlign: 'left' }}>Funnel steps</h2>
            <p style={{ fontSize: '0.875rem', color: '#4b5563', textAlign: 'left' }}>Session where users...</p>
          </div>
          <ChevronUp
            className="icon"
            style={{ 
              color: '#9ca3af',
              transform: expandedSection ? 'none' : 'rotate(180deg)',
              transition: 'transform 0.2s'
            }}
          />
        </button>

        {expandedSection && (
          <div className="collapsible-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <svg className="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#9ca3af' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>1</span>
              </div>
              <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', color: '#9333ea', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#faf5ff'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <Plus className="icon-small" />
                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Add step</span>
              </button>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <svg className="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#9ca3af' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>2</span>
              </div>
              <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', color: '#9333ea', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#faf5ff'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <Plus className="icon-small" />
                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Add step</span>
              </button>
            </div>

            {/* Apply Button */}
            <div style={{ paddingTop: '0.5rem' }}>
              <button className="btn-secondary">
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chart Visualization */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '1rem', height: '256px', position: 'relative' }}>
          {/* Bar 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>*</div>
            <div style={{ width: '96px', backgroundColor: '#bfdbfe', borderRadius: '8px 8px 0 0', height: '75%' }}></div>
          </div>

          {/* Bar 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>*</div>
            <div style={{ width: '96px', backgroundColor: '#93c5fd', borderRadius: '8px 8px 0 0', height: '90%' }}></div>
          </div>

          {/* Bar 3 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>*</div>
            <div style={{ width: '96px', backgroundColor: '#bfdbfe', borderRadius: '8px 8px 0 0', height: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

