import { useState } from 'react'
import { X, Play, GitCompare } from 'lucide-react'
import { funnelsAPI } from '../../services/api'
import { FunnelChart } from './FunnelChart'

interface Funnel {
  id: string
  name: string
  description?: string
}

interface FunnelComparisonProps {
  projectId: string
  selectedFunnel: Funnel
  funnels: Funnel[]
  dateRange: { start: string; end: string }
  onClose: () => void
}

type PlatformType = 'web' | 'android' | 'ios'

interface VariantFilter {
  platform: PlatformType
  label: string
}

export function FunnelComparison({ projectId, selectedFunnel, funnels, dateRange, onClose }: FunnelComparisonProps) {
  const [comparisonMode, setComparisonMode] = useState<'variants' | 'funnels'>('variants')
  const [variantFilters, setVariantFilters] = useState<VariantFilter[]>([
    { platform: 'android', label: 'Android' },
    { platform: 'ios', label: 'iOS' }
  ])
  const [selectedFunnels, setSelectedFunnels] = useState<string[]>([selectedFunnel.id])
  const [comparisonResults, setComparisonResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleCompareVariants = async () => {
    setLoading(true)
    try {
      // TODO: Implement compareVariants API endpoint
      // const result = await funnelsAPI.compareVariants(projectId, selectedFunnel.id, {
      //   start_date: dateRange.start,
      //   end_date: dateRange.end,
      //   variant_filters: variantFilters.map(v => ({
      //     platform: v.platform
      //   }))
      // })
      // setComparisonResults(result.comparisons || [])
      alert('Variant comparison feature is not yet implemented')
      setComparisonResults([])
    } catch (error) {
      console.error('Error comparing variants:', error)
      alert('Failed to compare variants. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCompareFunnels = async () => {
    if (selectedFunnels.length < 2) {
      alert('Please select at least 2 funnels to compare')
      return
    }
    setLoading(true)
    try {
      // TODO: Implement compare API endpoint
      // const result = await funnelsAPI.compare(projectId, {
      //   funnel_ids: selectedFunnels,
      //   start_date: dateRange.start,
      //   end_date: dateRange.end
      // })
      // setComparisonResults(result.comparisons || [])
      alert('Funnel comparison feature is not yet implemented')
      setComparisonResults([])
    } catch (error) {
      console.error('Error comparing funnels:', error)
      alert('Failed to compare funnels. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addVariantFilter = () => {
    setVariantFilters([...variantFilters, { platform: 'web', label: 'Web' }])
  }

  const removeVariantFilter = (index: number) => {
    setVariantFilters(variantFilters.filter((_, i) => i !== index))
  }

  const updateVariantFilter = (index: number, platform: PlatformType, label: string) => {
    const newFilters = [...variantFilters]
    newFilters[index] = { platform, label }
    setVariantFilters(newFilters)
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      padding: '1.5rem',
      marginBottom: '1.5rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem' }}>Funnel Comparison</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Compare funnels side-by-side or analyze different user segments</p>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '0.5rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: '#6b7280'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Comparison Mode Selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            onClick={() => setComparisonMode('variants')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: comparisonMode === 'variants' ? '#9333ea' : '#f3f4f6',
              color: comparisonMode === 'variants' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.875rem'
            }}
          >
            Compare Variants
          </button>
          <button
            onClick={() => setComparisonMode('funnels')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: comparisonMode === 'funnels' ? '#9333ea' : '#f3f4f6',
              color: comparisonMode === 'funnels' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.875rem'
            }}
          >
            Compare Funnels
          </button>
        </div>

        {/* Variant Comparison Setup */}
        {comparisonMode === 'variants' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Compare {selectedFunnel.name} by:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {variantFilters.map((filter, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={filter.label}
                    onChange={(e) => updateVariantFilter(index, filter.platform, e.target.value)}
                    placeholder="Label (e.g., Android, iOS, New Users)"
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                  <select
                    value={filter.platform}
                    onChange={(e) => updateVariantFilter(index, e.target.value as PlatformType, filter.label)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      minWidth: '120px'
                    }}
                  >
                    <option value="web">Web</option>
                    <option value="android">Android</option>
                    <option value="ios">iOS</option>
                  </select>
                  {variantFilters.length > 1 && (
                    <button
                      onClick={() => removeVariantFilter(index)}
                      style={{
                        padding: '0.5rem',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: '#ef4444'
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addVariantFilter}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  alignSelf: 'flex-start'
                }}
              >
                + Add Variant
              </button>
            </div>
            <button
              onClick={handleCompareVariants}
              disabled={loading || variantFilters.length < 2}
              style={{
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1.5rem',
                backgroundColor: loading || variantFilters.length < 2 ? '#d1d5db' : '#9333ea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading || variantFilters.length < 2 ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              <Play size={16} />
              {loading ? 'Comparing...' : 'Compare Variants'}
            </button>
          </div>
        )}

        {/* Funnel Comparison Setup */}
        {comparisonMode === 'funnels' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Select Funnels to Compare:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
              {funnels.map(funnel => (
                <label key={funnel.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedFunnels.includes(funnel.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFunnels([...selectedFunnels, funnel.id])
                      } else {
                        setSelectedFunnels(selectedFunnels.filter(id => id !== funnel.id))
                      }
                    }}
                  />
                  <span>{funnel.name}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleCompareFunnels}
              disabled={loading || selectedFunnels.length < 2}
              style={{
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1.5rem',
                backgroundColor: loading || selectedFunnels.length < 2 ? '#d1d5db' : '#9333ea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading || selectedFunnels.length < 2 ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              <GitCompare size={16} />
              {loading ? 'Comparing...' : 'Compare Funnels'}
            </button>
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {comparisonResults.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Comparison Results</h3>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${comparisonResults.length}, 1fr)`, gap: '1rem' }}>
            {comparisonResults.map((comparison, index) => (
              <div key={index} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1rem',
                backgroundColor: '#f9fafb'
              }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {comparison.funnel_name}
                </h4>
                {comparison.result && (
                  <FunnelChart
                    steps={comparison.result.steps || []}
                    overallConversion={comparison.result.overall_conversion || 0}
                    totalUsers={comparison.result.total_users || 0}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

