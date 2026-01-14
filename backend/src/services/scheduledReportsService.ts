/**
 * Scheduled Reports Service
 * 
 * Handles creation, scheduling, and sending of automated funnel reports
 */

import { supabase } from '../config/supabase'
import { analyzeFunnel } from './funnelService'
import { sendEmailNotification } from './notificationService'

export interface ScheduledReport {
  id: string
  funnel_id: string
  project_id: string
  name: string
  schedule_type: 'daily' | 'weekly' | 'monthly'
  schedule_config: {
    day_of_week?: number // 0-6 for weekly (0 = Sunday)
    day_of_month?: number // 1-31 for monthly
    time?: string // HH:MM format
    timezone?: string
  }
  recipients: string[]
  report_format: 'html' | 'pdf' | 'csv'
  include_charts: boolean
  report_params: {
    start_date?: string
    end_date?: string
    platform_filter?: 'all' | 'mobile' | 'web'
    country_filter?: string
    device_filter?: string
    app_version_filter?: string
  }
  enabled: boolean
  last_sent_at?: string
  next_send_at?: string
  created_by?: string
  created_at: string
  updated_at: string
}

/**
 * Calculate next send time based on schedule
 */
function calculateNextSendTime(
  scheduleType: 'daily' | 'weekly' | 'monthly',
  scheduleConfig: ScheduledReport['schedule_config']
): Date {
  const now = new Date()
  const next = new Date(now)

  // Parse time (default to 9:00 AM)
  const timeStr = scheduleConfig.time || '09:00'
  const [hours, minutes] = timeStr.split(':').map(Number)

  if (scheduleType === 'daily') {
    next.setHours(hours, minutes, 0, 0)
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }
  } else if (scheduleType === 'weekly') {
    const dayOfWeek = scheduleConfig.day_of_week ?? 1 // Default to Monday
    const currentDay = now.getDay()
    const daysUntilNext = (dayOfWeek - currentDay + 7) % 7 || 7
    next.setDate(now.getDate() + daysUntilNext)
    next.setHours(hours, minutes, 0, 0)
    if (next <= now && daysUntilNext === 7) {
      next.setDate(next.getDate() + 7)
    }
  } else if (scheduleType === 'monthly') {
    const dayOfMonth = scheduleConfig.day_of_month ?? 1
    next.setDate(dayOfMonth)
    next.setHours(hours, minutes, 0, 0)
    if (next <= now) {
      next.setMonth(next.getMonth() + 1)
    }
  }

  return next
}

/**
 * Create a new scheduled report
 */
export async function createScheduledReport(
  funnelId: string,
  projectId: string,
  data: Omit<ScheduledReport, 'id' | 'created_at' | 'updated_at' | 'last_sent_at' | 'next_send_at'>
): Promise<ScheduledReport> {
  const nextSendAt = calculateNextSendTime(data.schedule_type, data.schedule_config)

  const { data: report, error } = await supabase
    .from('scheduled_reports')
    .insert({
      funnel_id: funnelId,
      project_id: projectId,
      name: data.name,
      schedule_type: data.schedule_type,
      schedule_config: data.schedule_config,
      recipients: data.recipients,
      report_format: data.report_format || 'html',
      include_charts: data.include_charts !== undefined ? data.include_charts : true,
      report_params: data.report_params || {},
      enabled: data.enabled !== undefined ? data.enabled : true,
      next_send_at: nextSendAt.toISOString(),
      created_by: data.created_by
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create scheduled report: ${error.message}`)
  }

  return report as ScheduledReport
}

/**
 * Get all scheduled reports for a funnel
 */
export async function getFunnelScheduledReports(funnelId: string): Promise<ScheduledReport[]> {
  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('funnel_id', funnelId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch scheduled reports: ${error.message}`)
  }

  return (data || []) as ScheduledReport[]
}

/**
 * Update a scheduled report
 */
export async function updateScheduledReport(
  reportId: string,
  updates: Partial<ScheduledReport>
): Promise<ScheduledReport> {
  const updateData: any = {
    ...updates,
    updated_at: new Date().toISOString()
  }

  // Recalculate next_send_at if schedule changed
  if (updates.schedule_type || updates.schedule_config) {
    const { data: current } = await supabase
      .from('scheduled_reports')
      .select('schedule_type, schedule_config')
      .eq('id', reportId)
      .single()

    if (current) {
      const scheduleType = updates.schedule_type || current.schedule_type
      const scheduleConfig = updates.schedule_config || current.schedule_config
      updateData.next_send_at = calculateNextSendTime(scheduleType, scheduleConfig).toISOString()
    }
  }

  const { data, error } = await supabase
    .from('scheduled_reports')
    .update(updateData)
    .eq('id', reportId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update scheduled report: ${error.message}`)
  }

  return data as ScheduledReport
}

/**
 * Delete a scheduled report
 */
export async function deleteScheduledReport(reportId: string): Promise<void> {
  const { error } = await supabase
    .from('scheduled_reports')
    .delete()
    .eq('id', reportId)

  if (error) {
    throw new Error(`Failed to delete scheduled report: ${error.message}`)
  }
}

/**
 * Get reports that are due to be sent
 */
export async function getDueReports(): Promise<ScheduledReport[]> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('enabled', true)
    .lte('next_send_at', now)
    .order('next_send_at', { ascending: true })

  if (error) {
    console.error('Error fetching due reports:', error)
    return []
  }

  return (data || []) as ScheduledReport[]
}

/**
 * Send a scheduled report
 */
export async function sendScheduledReport(report: ScheduledReport): Promise<boolean> {
  try {
    // Get funnel info
    const { data: funnel } = await supabase
      .from('funnels')
      .select('id, name')
      .eq('id', report.funnel_id)
      .single()

    if (!funnel) {
      throw new Error('Funnel not found')
    }

    // Calculate date range for report
    const endDate = report.report_params.end_date || new Date().toISOString()
    let startDate = report.report_params.start_date

    if (!startDate) {
      // Default to last 7 days for daily, last 30 for weekly/monthly
      const days = report.schedule_type === 'daily' ? 7 : 30
      startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    }

    // Perform funnel analysis
    const analysisResult = await analyzeFunnel(
      report.funnel_id,
      startDate,
      endDate,
      false,
      report.report_params.platform_filter || 'all',
      report.report_params.country_filter,
      report.report_params.device_filter,
      report.report_params.app_version_filter,
      false
    )

    if (!analysisResult) {
      throw new Error('Failed to analyze funnel')
    }

    // Generate report content
    const reportContent = generateReportContent(
      funnel.name,
      analysisResult,
      report.report_format,
      report.include_charts
    )

    // Send email
    const emailSent = await sendEmailNotification({
      to: report.recipients,
      subject: `📊 ${report.name} - ${funnel.name}`,
      html: reportContent.html,
      text: reportContent.text
    })

    if (emailSent) {
      // Update last_sent_at and calculate next_send_at
      const nextSendAt = calculateNextSendTime(report.schedule_type, report.schedule_config)

      await supabase
        .from('scheduled_reports')
        .update({
          last_sent_at: new Date().toISOString(),
          next_send_at: nextSendAt.toISOString()
        })
        .eq('id', report.id)

      // Record in history
      await supabase
        .from('scheduled_report_history')
        .insert({
          scheduled_report_id: report.id,
          recipients: report.recipients,
          report_format: report.report_format,
          status: 'sent'
        })

      return true
    }

    return false
  } catch (error: any) {
    console.error('Error sending scheduled report:', error)

    // Record failure in history
    await supabase
      .from('scheduled_report_history')
      .insert({
        scheduled_report_id: report.id,
        recipients: report.recipients,
        report_format: report.report_format,
        status: 'failed',
        error_message: error.message
      })

    return false
  }
}

/**
 * Generate report content (HTML and text)
 */
function generateReportContent(
  funnelName: string,
  analysisResult: any,
  format: 'html' | 'pdf' | 'csv',
  includeCharts: boolean
): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; padding: 20px; border-radius: 8px; }
        .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
        .metric-card { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
        .metric-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .metric-value { font-size: 24px; font-weight: 700; color: #111827; margin-top: 5px; }
        .steps { margin: 20px 0; }
        .step { padding: 15px; margin: 10px 0; background: #f9fafb; border-left: 4px solid #8b5cf6; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Funnel Report: ${funnelName}</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="metrics">
          <div class="metric-card">
            <div class="metric-label">Total Users</div>
            <div class="metric-value">${analysisResult.total_users || 0}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Overall Conversion</div>
            <div class="metric-value">${(analysisResult.overall_conversion || 0).toFixed(2)}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Steps</div>
            <div class="metric-value">${analysisResult.steps?.length || 0}</div>
          </div>
        </div>

        <div class="steps">
          <h2>Funnel Steps</h2>
          ${(analysisResult.steps || []).map((step: any, index: number) => `
            <div class="step">
              <strong>${step.order}. ${step.name}</strong>
              <div style="margin-top: 10px;">
                <div>Users: ${step.users}</div>
                <div>Conversion Rate: ${step.conversion_rate.toFixed(2)}%</div>
                <div>Drop-off Rate: ${step.drop_off_rate.toFixed(2)}%</div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="footer">
          <p>This is an automated report from UXCam Analytics</p>
          <p>You can manage your scheduled reports in the dashboard.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Funnel Report: ${funnelName}
Generated on ${new Date().toLocaleDateString()}

Total Users: ${analysisResult.total_users || 0}
Overall Conversion: ${(analysisResult.overall_conversion || 0).toFixed(2)}%

Funnel Steps:
${(analysisResult.steps || []).map((step: any) => `
${step.order}. ${step.name}
  Users: ${step.users}
  Conversion Rate: ${step.conversion_rate.toFixed(2)}%
  Drop-off Rate: ${step.drop_off_rate.toFixed(2)}%
`).join('')}

---
This is an automated report from UXCam Analytics
You can manage your scheduled reports in the dashboard.
  `.trim()

  return { html, text }
}

