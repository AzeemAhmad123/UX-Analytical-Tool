interface GeographicData {
  by_country: Record<string, {
    steps: Array<{
      order: number
      name: string
      users: number
      conversion_rate: number
      drop_off_rate: number
    }>
    total_users: number
    overall_conversion: number
  }>
  by_city: Record<string, {
    steps: Array<{
      order: number
      name: string
      users: number
      conversion_rate: number
      drop_off_rate: number
    }>
    total_users: number
    overall_conversion: number
  }>
}

interface GeographicBreakdownProps {
  data: GeographicData | null | undefined
}

export function GeographicBreakdown({ data }: GeographicBreakdownProps) {
  if (!data || (!data.by_country && !data.by_city)) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#6b7280',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <p>No geographic data available. Geographic breakdown requires location data from sessions.</p>
      </div>
    )
  }

  const countries = Object.entries(data.by_country || {})
  const cities = Object.entries(data.by_city || {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Country Breakdown */}
      {countries.length > 0 && (
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Breakdown by Country</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Country</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Users</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Conversion</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Drop-off</th>
                </tr>
              </thead>
              <tbody>
                {countries.map(([country, stats]) => (
                  <tr key={country} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>{country || 'Unknown'}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{stats.total_users.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: stats.overall_conversion >= 50 ? '#10b981' : '#ef4444' }}>
                      {stats.overall_conversion.toFixed(1)}%
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ef4444' }}>
                      {stats.steps.length > 1 ? (
                        <span>
                          {stats.steps[stats.steps.length - 1].drop_off_rate.toFixed(1)}%
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* City Breakdown */}
      {cities.length > 0 && (
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Breakdown by City</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>City</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Users</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Conversion</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Drop-off</th>
                </tr>
              </thead>
              <tbody>
                {cities.slice(0, 20).map(([city, stats]) => (
                  <tr key={city} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>{city || 'Unknown'}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{stats.total_users.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: stats.overall_conversion >= 50 ? '#10b981' : '#ef4444' }}>
                      {stats.overall_conversion.toFixed(1)}%
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ef4444' }}>
                      {stats.steps.length > 1 ? (
                        <span>
                          {stats.steps[stats.steps.length - 1].drop_off_rate.toFixed(1)}%
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cities.length > 20 && (
              <div style={{ padding: '0.75rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                Showing top 20 cities. Total: {cities.length} cities
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

