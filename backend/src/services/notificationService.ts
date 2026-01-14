/**
 * Notification Service
 * 
 * Handles sending notifications via email and webhooks
 */

export interface EmailNotification {
  to: string[]
  subject: string
  html: string
  text?: string
}

export interface WebhookNotification {
  url: string
  payload: any
  headers?: Record<string, string>
}

/**
 * Send email notification
 * Note: This is a placeholder implementation. In production, integrate with:
 * - SendGrid, Mailgun, AWS SES, or similar email service
 * - Or use Supabase's built-in email service if available
 */
export async function sendEmailNotification(notification: EmailNotification): Promise<boolean> {
  try {
    // TODO: Integrate with email service provider
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail')
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    // await sgMail.send({
    //   to: notification.to,
    //   from: process.env.FROM_EMAIL,
    //   subject: notification.subject,
    //   html: notification.html,
    //   text: notification.text
    // })

    // For now, log the email (in production, replace with actual email service)
    console.log('📧 Email Notification:', {
      to: notification.to,
      subject: notification.subject,
      preview: notification.text || notification.html.substring(0, 100)
    })

    // In development, you might want to use a service like Mailtrap or just log
    // In production, integrate with a real email service
    
    return true
  } catch (error: any) {
    console.error('Error sending email notification:', error)
    return false
  }
}

/**
 * Send webhook notification
 */
export async function sendWebhookNotification(notification: WebhookNotification): Promise<boolean> {
  try {
    const response = await fetch(notification.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'UXCam-Analytics/1.0',
        ...notification.headers
      },
      body: JSON.stringify(notification.payload),
      // Timeout after 10 seconds
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      console.error(`Webhook notification failed: ${response.status} ${response.statusText}`)
      return false
    }

    console.log('✅ Webhook notification sent successfully:', notification.url)
    return true
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Webhook notification timeout:', notification.url)
    } else {
      console.error('Error sending webhook notification:', error)
    }
    return false
  }
}

/**
 * Send alert notification via configured channels
 */
export async function sendAlertNotification(
  channels: string[],
  alertData: {
    alertName: string
    alertType: string
    funnelName: string
    message: string
    alertValue: number
    thresholdValue: number
    metadata?: any
  },
  emailRecipients?: string[],
  webhookUrl?: string
): Promise<{ email: boolean; webhook: boolean }> {
  const results = { email: false, webhook: false }

  // Send email if configured
  if (channels.includes('email') && emailRecipients && emailRecipients.length > 0) {
    const emailSubject = `🚨 Alert: ${alertData.alertName} - ${alertData.funnelName}`
    const emailHtml = generateAlertEmailHtml(alertData)
    const emailText = generateAlertEmailText(alertData)

    results.email = await sendEmailNotification({
      to: emailRecipients,
      subject: emailSubject,
      html: emailHtml,
      text: emailText
    })
  }

  // Send webhook if configured
  if (channels.includes('webhook') && webhookUrl) {
    results.webhook = await sendWebhookNotification({
      url: webhookUrl,
      payload: {
        event: 'funnel_alert',
        timestamp: new Date().toISOString(),
        alert: {
          name: alertData.alertName,
          type: alertData.alertType,
          funnel_name: alertData.funnelName,
          message: alertData.message,
          alert_value: alertData.alertValue,
          threshold_value: alertData.thresholdValue,
          metadata: alertData.metadata
        }
      }
    })
  }

  return results
}

/**
 * Generate HTML email template for alerts
 */
function generateAlertEmailHtml(alertData: {
  alertName: string
  alertType: string
  funnelName: string
  message: string
  alertValue: number
  thresholdValue: number
  metadata?: any
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .alert-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; }
        .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .metric-label { font-weight: 600; }
        .metric-value { color: #ef4444; font-weight: 700; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 Funnel Alert Triggered</h1>
        </div>
        <div class="content">
          <div class="alert-box">
            <h2>${alertData.alertName}</h2>
            <p><strong>Funnel:</strong> ${alertData.funnelName}</p>
            <p><strong>Alert Type:</strong> ${alertData.alertType}</p>
            <p><strong>Message:</strong> ${alertData.message}</p>
          </div>
          
          <div class="metric">
            <span class="metric-label">Current Value:</span>
            <span class="metric-value">${alertData.alertValue.toFixed(2)}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Threshold:</span>
            <span>${alertData.thresholdValue.toFixed(2)}</span>
          </div>
          
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="button">View Dashboard</a>
        </div>
        <div class="footer">
          <p>This is an automated alert from UXCam Analytics</p>
          <p>You can manage your alerts in the dashboard settings.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate plain text email for alerts
 */
function generateAlertEmailText(alertData: {
  alertName: string
  alertType: string
  funnelName: string
  message: string
  alertValue: number
  thresholdValue: number
  metadata?: any
}): string {
  return `
🚨 Funnel Alert Triggered

Alert Name: ${alertData.alertName}
Funnel: ${alertData.funnelName}
Alert Type: ${alertData.alertType}

Message: ${alertData.message}

Current Value: ${alertData.alertValue.toFixed(2)}
Threshold: ${alertData.thresholdValue.toFixed(2)}

View Dashboard: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard

---
This is an automated alert from UXCam Analytics
You can manage your alerts in the dashboard settings.
  `.trim()
}

