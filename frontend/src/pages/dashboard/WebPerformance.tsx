import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import '../../components/dashboard/Dashboard.css'

export function WebPerformance() {
  const [activeTab, setActiveTab] = useState<'single' | 'compare' | 'cache'>('single')
  const [showRecommended, setShowRecommended] = useState(true)

  return (
    <div className="dashboard-page-content" style={{ maxWidth: '1152px' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Analyze and compare performance</h1>
        <p style={{ color: '#4b5563' }}>
          Analyze the web performance of your page to fix issues or compare the speed and quality between 2 pages.
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs-container" style={{ marginBottom: '2rem' }}>
        <div className="tabs">
          <button
            onClick={() => setActiveTab('single')}
            className={`tab ${activeTab === 'single' ? 'tab-active' : ''}`}
          >
            Single page
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`tab ${activeTab === 'compare' ? 'tab-active' : ''}`}
          >
            Compare
          </button>
          <button
            onClick={() => setActiveTab('cache')}
            className={`tab ${activeTab === 'cache' ? 'tab-active' : ''}`}
          >
            Cache testing (1st vs 2nd visit)
          </button>
        </div>
      </div>

      {/* Recommended Pages Section */}
      {showRecommended && (
        <div className="collapsible-section" style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => setShowRecommended(!showRecommended)}
            className="collapsible-header"
          >
            <div>
              <h2 style={{ fontWeight: '600', color: '#111827', textAlign: 'left' }}>Recommended pages</h2>
              <p style={{ fontSize: '0.875rem', color: '#4b5563', textAlign: 'left', marginTop: '0.25rem' }}>
                These are your most visited pages (from real user monitoring) over the last 7 days. You can select them to analyze on "Analyze single page".
              </p>
            </div>
            <ChevronDown className="icon" style={{ 
              color: '#9ca3af',
              transform: showRecommended ? 'none' : 'rotate(180deg)',
              transition: 'transform 0.2s'
            }} />
          </button>
        </div>
      )}

      {/* Analyze Single Page Form */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: '600', color: '#111827' }}>Analyze single page</h2>
          <button className="btn-secondary" style={{ fontSize: '0.875rem' }}>
            Select an existing configuration
          </button>
        </div>

        {/* URL Input */}
        <div className="form-group">
          <label className="form-label">URL of the page to analyze</label>
          <input
            type="text"
            className="form-input"
            placeholder="ex: http://www.example.org/"
          />
        </div>

        {/* Settings Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Device */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Device</label>
            <select className="form-select">
              <option>Desktop</option>
              <option>Mobile</option>
              <option>Tablet</option>
            </select>
          </div>

          {/* Localization */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Localization</label>
            <select className="form-select">
              <option>🇫🇷 France</option>
              <option>🇺🇸 United States</option>
              <option>🇬🇧 United Kingdom</option>
              <option>🇩🇪 Germany</option>
            </select>
          </div>

          {/* Bandwidth */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Bandwidth</label>
            <select className="form-select">
              <option>ADSL (8.0 Mbps downstream, 1.5 Mbps upstream, 50 ms)</option>
              <option>Cable (20 Mbps downstream, 5 Mbps upstream, 28 ms)</option>
              <option>Fiber (50 Mbps downstream, 10 Mbps upstream, 10 ms)</option>
            </select>
          </div>
        </div>

        {/* Advanced Settings */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.color = '#111827'} onMouseLeave={(e) => e.currentTarget.style.color = '#374151'}>
            <ChevronDown className="icon-small" />
            <span>Advanced settings</span>
            <HelpCircle className="icon-small" style={{ color: '#9ca3af' }} />
          </button>
        </div>

        {/* Analyze Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary">
            Analyze
          </button>
        </div>
      </div>

      {/* Sessions Progress */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#4b5563' }}>Sessions</span>
          <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#111827' }}>0 / 200K</span>
        </div>
        <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '8px', marginBottom: '0.5rem' }}>
          <div style={{ backgroundColor: '#9333ea', height: '8px', borderRadius: '9999px', width: '0%' }}></div>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#4b5563' }}>Resets Feb 2</p>
      </div>
    </div>
  )
}

