import { Link } from 'react-router-dom'

interface StepResult {
  order: number
  name: string
  users: number
  sessions: number
  conversion_rate: number
  drop_off_rate: number
  avg_time_to_complete?: number
  first_time_users?: number
  returning_users?: number
  platform_breakdown?: {
    mobile: { users: number; sessions: number }
    web: { users: number; sessions: number }
  }
  dropped_sessions?: string[]
}

interface FunnelChartProps {
  steps: StepResult[]
  totalUsers: number
  overallConversion: number
  platformBreakdown?: {
    mobile: { steps: StepResult[]; total_users: number; overall_conversion: number }
    web: { steps: StepResult[]; total_users: number; overall_conversion: number }
  }
  platformFilter?: 'all' | 'mobile' | 'web'
  selectedProject?: string
}

export function FunnelChart({ steps, totalUsers, overallConversion, platformBreakdown: _platformBreakdown, platformFilter = 'all', selectedProject }: FunnelChartProps) {
  if (steps.length === 0) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        color: '#6b7280',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <p>No data to display. Analyze a funnel to see results.</p>
      </div>
    )
  }

  // Find max users for scaling
  const maxUsers = Math.max(...steps.map(s => s.users), 1)

  // Color gradient based on conversion rate
  const getColor = (conversion: number) => {
    if (conversion >= 80) return '#10b981' // green
    if (conversion >= 50) return '#3b82f6' // blue
    if (conversion >= 25) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '2rem' }}>
      {/* Summary Stats */}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Total Users</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>{totalUsers.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Overall Conversion</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
            {overallConversion.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Funnel Visualization - CSS-based */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Funnel Visualization</h3>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '2rem' }}>
          {steps.map((step, index) => {
            const widthPercent = (step.users / maxUsers) * 100
            const width = Math.max(widthPercent, 20) // Minimum 20% width
            
            return (
              <div key={step.order} style={{ width: '100%', maxWidth: '600px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div style={{ minWidth: '120px', fontSize: '0.875rem', fontWeight: '500' }}>
                    {step.order}. {step.name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {step.users.toLocaleString()} users ({step.conversion_rate.toFixed(1)}%)
                    {platformFilter === 'all' && step.platform_breakdown && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                        (M: {step.platform_breakdown.mobile.users}, W: {step.platform_breakdown.web.users})
                      </span>
                    )}
                  </div>
                  {index > 0 && (
                    <div style={{ fontSize: '0.875rem', color: '#ef4444', marginLeft: 'auto' }}>
                      -{step.drop_off_rate.toFixed(1)}% drop-off
                    </div>
                  )}
                </div>
                <div
                  style={{
                    width: `${width}%`,
                    height: '40px',
                    backgroundColor: getColor(step.conversion_rate),
                    borderRadius: '6px',
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '500',
                    fontSize: '0.875rem'
                  }}
                >
                  {step.users.toLocaleString()}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step-by-Step Breakdown */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Step Breakdown</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {steps.map((step, index) => (
            <div
              key={step.order}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            >
              <div style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                backgroundColor: getColor(step.conversion_rate),
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}>
                {step.order}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{step.name}</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {step.users.toLocaleString()} users ({step.conversion_rate.toFixed(1)}% of first step)
                  {step.avg_time_to_complete && (
                    <span style={{ marginLeft: '0.5rem', color: '#9333ea' }}>
                      • Avg time: {Math.round(step.avg_time_to_complete / 1000)}s
                    </span>
                  )}
                  {step.first_time_users !== undefined && step.returning_users !== undefined && (
                    <span style={{ marginLeft: '0.5rem', color: '#3b82f6' }}>
                      • First-time: {step.first_time_users}, Returning: {step.returning_users}
                    </span>
                  )}
                </div>
                {step.dropped_sessions && step.dropped_sessions.length > 0 && selectedProject && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <Link
                      to={`/dashboard/sessions?project=${selectedProject}&dropped=${step.dropped_sessions.slice(0, 10).join(',')}`}
                      style={{
                        fontSize: '0.75rem',
                        color: '#9333ea',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      View {step.dropped_sessions.length} dropped session{step.dropped_sessions.length > 1 ? 's' : ''} →
                    </Link>
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                {index > 0 && (
                  <div style={{ fontSize: '0.875rem', color: '#ef4444', fontWeight: '500' }}>
                    -{step.drop_off_rate.toFixed(1)}%
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {index > 0 ? 'Drop-off' : 'Starting Point'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

