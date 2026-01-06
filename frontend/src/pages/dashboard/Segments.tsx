import { useState } from 'react'
import { Search, Star, Users, UserPlus, RefreshCw } from 'lucide-react'
import '../../components/dashboard/Dashboard.css'

export function Segments() {
  const [activeTab, setActiveTab] = useState<'segments' | 'data-connect'>('segments')
  const [filter, setFilter] = useState<'all' | 'my' | 'favorites'>('all')

  const segments = [
    {
      id: 'all-users',
      name: 'All users',
      lastUpdate: '4/20/2022',
      traffic: '0.00%',
      conversion: '0.00%',
      bounce: '0.00%',
      isDefault: true
    },
    {
      id: 'new-users',
      name: 'New users',
      lastUpdate: '10/27/2025',
      traffic: '0.00%',
      conversion: '0.00%',
      bounce: '0.00%'
    },
    {
      id: 'returning-users',
      name: 'Returning users',
      lastUpdate: '10/27/2025',
      traffic: '0.00%',
      conversion: '0.00%',
      bounce: '0.00%'
    }
  ]

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left Sidebar - Filters */}
      <div style={{ width: '320px', backgroundColor: 'white', borderRight: '1px solid #e5e7eb', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: '600', color: '#111827' }}>Filters</h2>
          <button style={{ fontSize: '0.875rem', color: '#4b5563' }} onMouseEnter={(e) => e.currentTarget.style.color = '#111827'} onMouseLeave={(e) => e.currentTarget.style.color = '#4b5563'}>Reset</button>
        </div>

        {/* Show results for */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', marginBottom: '0.75rem' }}>Show results for</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="filter"
                checked={filter === 'all'}
                onChange={() => setFilter('all')}
                style={{ width: '16px', height: '16px', accentColor: '#9333ea' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>All segments (3)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="filter"
                checked={filter === 'my'}
                onChange={() => setFilter('my')}
                style={{ width: '16px', height: '16px', accentColor: '#9333ea' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>My segments (0)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="filter"
                checked={filter === 'favorites'}
                onChange={() => setFilter('favorites')}
                style={{ width: '16px', height: '16px', accentColor: '#9333ea' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Favorites (0)</span>
            </label>
          </div>
        </div>

        {/* Search */}
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', marginBottom: '0.75rem' }}>Search by segment name</h3>
          <div className="search-input">
            <Search className="search-icon" />
            <input type="text" placeholder="Filter by segment name..." />
          </div>
        </div>

        {/* Sessions Progress */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
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

      {/* Main Content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {/* Tabs */}
        <div className="tabs-container" style={{ marginBottom: '1.5rem' }}>
          <div className="tabs">
            <button
              onClick={() => setActiveTab('segments')}
              className={`tab ${activeTab === 'segments' ? 'tab-active' : ''}`}
              style={{ color: activeTab === 'segments' ? '#9333ea' : undefined }}
            >
              <Users className="icon-small" />
              Segments
            </button>
            <button
              onClick={() => setActiveTab('data-connect')}
              className={`tab ${activeTab === 'data-connect' ? 'tab-active' : ''}`}
              style={{ color: activeTab === 'data-connect' ? '#9333ea' : undefined }}
            >
              <svg className="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              Data Connect
            </button>
          </div>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 className="page-title" style={{ fontSize: '1.875rem' }}>Segments</h1>
          <button className="btn-primary">
            <span>New segment</span>
          </button>
        </div>

        {/* Segments List */}
        <div className="data-table">
          <div style={{ borderBottom: '1px solid #e5e7eb', padding: '0.75rem 1rem' }}>
            <h3 style={{ fontWeight: '600', color: '#111827' }}>Segments List</h3>
          </div>

          <table style={{ width: '100%' }}>
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">
                  <input type="checkbox" style={{ borderRadius: '4px', borderColor: '#d1d5db' }} />
                </th>
                <th className="table-header-cell">Name</th>
                <th className="table-header-cell">Last Update</th>
                <th className="table-header-cell">Traffic</th>
                <th className="table-header-cell">Conversion</th>
                <th className="table-header-cell">Bounce</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((segment) => (
                <tr key={segment.id} className="table-row">
                  <td className="table-cell">
                    <input type="checkbox" style={{ borderRadius: '4px', borderColor: '#d1d5db' }} />
                  </td>
                  <td className="table-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Star className="icon-small" style={{ color: '#9ca3af' }} />
                      {segment.isDefault ? (
                        <Users className="icon-small" style={{ color: '#4b5563' }} />
                      ) : segment.id === 'new-users' ? (
                        <UserPlus className="icon-small" style={{ color: '#4b5563' }} />
                      ) : (
                        <RefreshCw className="icon-small" style={{ color: '#4b5563' }} />
                      )}
                      <span style={{ fontSize: '0.875rem', color: '#111827' }}>{segment.name}</span>
                    </div>
                  </td>
                  <td className="table-cell" style={{ fontSize: '0.875rem', color: '#4b5563' }}>{segment.lastUpdate}</td>
                  <td className="table-cell" style={{ fontSize: '0.875rem', color: '#4b5563' }}>{segment.traffic}</td>
                  <td className="table-cell" style={{ fontSize: '0.875rem', color: '#4b5563' }}>{segment.conversion}</td>
                  <td className="table-cell" style={{ fontSize: '0.875rem', color: '#4b5563' }}>{segment.bounce}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #e5e7eb', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>3 items</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>10, 20 results per page</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', color: '#4b5563', backgroundColor: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>← prev</button>
                <button style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: '#9333ea', color: 'white', border: 'none', borderRadius: '4px' }}>1</button>
                <button style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', color: '#4b5563', backgroundColor: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>Next →</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

