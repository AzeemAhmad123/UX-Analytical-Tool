/**
 * Share Link Service
 * 
 * Handles creation and management of shareable funnel report links
 */

import { supabase } from '../config/supabase'
import crypto from 'crypto'

export interface ShareLinkParams {
  start_date?: string
  end_date?: string
  platform_filter?: 'all' | 'mobile' | 'web'
  country_filter?: string
  device_filter?: string
  app_version_filter?: string
}

export interface ShareLink {
  id: string
  funnel_id: string
  project_id: string
  share_token: string
  share_url: string
  expires_at?: string
  view_count: number
  max_views?: number
  is_active: boolean
  password_hash?: string
  share_params: ShareLinkParams
  created_by?: string
  created_at: string
  updated_at: string
}

/**
 * Generate a secure share token
 */
function generateShareToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Create a new share link
 */
export async function createShareLink(
  funnelId: string,
  projectId: string,
  options: {
    expires_in_days?: number
    max_views?: number
    password?: string
    share_params?: ShareLinkParams
    created_by?: string
  } = {}
): Promise<ShareLink> {
  const shareToken = generateShareToken()
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const shareUrl = `${frontendUrl}/funnel/share/${shareToken}`

  const expiresAt = options.expires_in_days
    ? new Date(Date.now() + options.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    : null

  let passwordHash: string | undefined = undefined
  if (options.password) {
    passwordHash = crypto.createHash('sha256').update(options.password).digest('hex')
  }

  const { data, error } = await supabase
    .from('funnel_share_links')
    .insert({
      funnel_id: funnelId,
      project_id: projectId,
      share_token: shareToken,
      share_url: shareUrl,
      expires_at: expiresAt,
      max_views: options.max_views,
      password_hash: passwordHash,
      share_params: options.share_params || {},
      created_by: options.created_by,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create share link: ${error.message}`)
  }

  return data as ShareLink
}

/**
 * Get share link by token
 */
export async function getShareLinkByToken(token: string): Promise<ShareLink | null> {
  const { data, error } = await supabase
    .from('funnel_share_links')
    .select('*')
    .eq('share_token', token)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    // Mark as inactive
    await supabase
      .from('funnel_share_links')
      .update({ is_active: false })
      .eq('id', data.id)
    return null
  }

  // Check if max views reached
  if (data.max_views && data.view_count >= data.max_views) {
    // Mark as inactive
    await supabase
      .from('funnel_share_links')
      .update({ is_active: false })
      .eq('id', data.id)
    return null
  }

  return data as ShareLink
}

/**
 * Verify share link password
 */
export async function verifyShareLinkPassword(token: string, password: string): Promise<boolean> {
  const shareLink = await getShareLinkByToken(token)
  if (!shareLink || !shareLink.password_hash) {
    return false
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex')
  return passwordHash === shareLink.password_hash
}

/**
 * Record a view of a share link
 */
export async function recordShareLinkView(
  shareLinkId: string,
  viewData: {
    ip_address?: string
    user_agent?: string
    referer?: string
  } = {}
): Promise<void> {
  // Increment view count
  try {
    await supabase.rpc('increment_share_link_views', { link_id: shareLinkId })
  } catch {
    // Fallback if RPC doesn't exist
    const { data } = await supabase
      .from('funnel_share_links')
      .select('view_count')
      .eq('id', shareLinkId)
      .single()
    
    if (data) {
      await supabase
        .from('funnel_share_links')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', shareLinkId)
    }
  }

  // Record view details
  await supabase
    .from('funnel_share_link_views')
    .insert({
      share_link_id: shareLinkId,
      ip_address: viewData.ip_address,
      user_agent: viewData.user_agent,
      referer: viewData.referer
    })
}

/**
 * Get all share links for a funnel
 */
export async function getFunnelShareLinks(funnelId: string): Promise<ShareLink[]> {
  const { data, error } = await supabase
    .from('funnel_share_links')
    .select('*')
    .eq('funnel_id', funnelId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch share links: ${error.message}`)
  }

  return (data || []) as ShareLink[]
}

/**
 * Revoke a share link
 */
export async function revokeShareLink(shareLinkId: string): Promise<void> {
  const { error } = await supabase
    .from('funnel_share_links')
    .update({ is_active: false })
    .eq('id', shareLinkId)

  if (error) {
    throw new Error(`Failed to revoke share link: ${error.message}`)
  }
}

/**
 * Delete a share link
 */
export async function deleteShareLink(shareLinkId: string): Promise<void> {
  const { error } = await supabase
    .from('funnel_share_links')
    .delete()
    .eq('id', shareLinkId)

  if (error) {
    throw new Error(`Failed to delete share link: ${error.message}`)
  }
}

