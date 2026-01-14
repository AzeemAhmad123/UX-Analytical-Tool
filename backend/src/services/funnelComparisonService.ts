/**
 * Funnel Comparison Service
 * 
 * Handles comparing multiple funnels side-by-side
 */

import { analyzeFunnel } from './funnelService'
import { FunnelAnalysisResult } from './funnelService'

export interface ComparisonFilter {
  platform?: 'all' | 'web' | 'android' | 'ios'
  country?: string
  device?: string
  app_version?: string
  is_new_user?: boolean
  acquisition_source?: string
  custom_properties?: Record<string, any>
}

export interface FunnelComparison {
  funnel_id: string
  funnel_name: string
  result: FunnelAnalysisResult
}

/**
 * Compare multiple funnels with different filters
 */
export async function compareFunnels(
  funnelIds: string[],
  startDate: string,
  endDate: string,
  filters: ComparisonFilter[]
): Promise<FunnelComparison[]> {
  try {
    const comparisons: FunnelComparison[] = []

    for (let i = 0; i < funnelIds.length; i++) {
      const funnelId = funnelIds[i]
      const filter = filters[i] || {}

      const result = await analyzeFunnel(
        funnelId,
        startDate,
        endDate,
        false, // includeGeography
        filter.platform || 'all',
        filter.country,
        filter.device,
        filter.app_version,
        false, // includeTrendOverTime
        {
          is_new_user: filter.is_new_user,
          acquisition_source: filter.acquisition_source,
          custom_properties: filter.custom_properties
        }
      )

      if (result) {
        comparisons.push({
          funnel_id: funnelId,
          funnel_name: result.funnel_name,
          result
        })
      }
    }

    return comparisons
  } catch (error: any) {
    console.error('Error comparing funnels:', error)
    throw error
  }
}

/**
 * Compare same funnel with different filters (e.g., Android vs iOS)
 */
export async function compareFunnelVariants(
  funnelId: string,
  startDate: string,
  endDate: string,
  variantFilters: ComparisonFilter[]
): Promise<FunnelComparison[]> {
  try {
    const comparisons: FunnelComparison[] = []

    for (const filter of variantFilters) {
      const result = await analyzeFunnel(
        funnelId,
        startDate,
        endDate,
        false, // includeGeography
        filter.platform || 'all',
        filter.country,
        filter.device,
        filter.app_version,
        false, // includeTrendOverTime
        {
          is_new_user: filter.is_new_user,
          acquisition_source: filter.acquisition_source,
          custom_properties: filter.custom_properties
        }
      )

      if (result) {
        comparisons.push({
          funnel_id: funnelId,
          funnel_name: `${result.funnel_name} (${getFilterLabel(filter)})`,
          result
        })
      }
    }

    return comparisons
  } catch (error: any) {
    console.error('Error comparing funnel variants:', error)
    throw error
  }
}

/**
 * Compare funnel by experiment variants
 */
export async function compareFunnelByVariants(
  funnelId: string,
  experimentId: string,
  startDate: string,
  endDate: string
): Promise<FunnelComparison[]> {
  try {
    const { supabase } = await import('../config/supabase')
    
    // Get experiment variants
    const { data: variants } = await supabase
      .from('experiment_variants')
      .select('variant_name')
      .eq('experiment_id', experimentId)

    if (!variants || variants.length === 0) {
      throw new Error('No variants found for experiment')
    }

    const comparisons: FunnelComparison[] = []

    for (const variant of variants) {
      // Analyze funnel filtered by variant
      const result = await analyzeFunnel(
        funnelId,
        startDate,
        endDate,
        false,
        'all',
        undefined, // countryFilter
        undefined, // deviceFilter
        undefined, // appVersionFilter
        false,
        {
          // cohortFilter with variant info
          custom_properties: { variant: variant.variant_name }
        }
      )

      if (result) {
        comparisons.push({
          funnel_id: funnelId,
          funnel_name: `${result.funnel_name} - Variant ${variant.variant_name}`,
          result
        })
      }
    }

    return comparisons
  } catch (error: any) {
    console.error('Error comparing funnel by variants:', error)
    throw error
  }
}

function getFilterLabel(filter: ComparisonFilter): string {
  const parts: string[] = []
  if (filter.platform && filter.platform !== 'all') parts.push(filter.platform)
  if (filter.country) parts.push(filter.country)
  if (filter.is_new_user !== undefined) parts.push(filter.is_new_user ? 'New' : 'Returning')
  return parts.join(' • ') || 'All'
}

