-- Create funnel_alerts table for alerting system
CREATE TABLE IF NOT EXISTS funnel_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('conversion_drop', 'step_break', 'threshold_breach')),
  condition_type VARCHAR(50) NOT NULL CHECK (condition_type IN ('percentage', 'absolute', 'trend')),
  threshold_value DECIMAL(10, 2) NOT NULL,
  comparison_operator VARCHAR(10) NOT NULL CHECK (comparison_operator IN ('<', '>', '<=', '>=', '==')),
  step_order INTEGER, -- NULL means overall funnel, otherwise specific step
  time_window_hours INTEGER DEFAULT 24, -- Check alerts within this time window
  enabled BOOLEAN DEFAULT TRUE,
  notification_channels TEXT[], -- Array of notification channels: ['email', 'in_app', 'webhook']
  webhook_url TEXT, -- Optional webhook URL for external notifications
  email_recipients TEXT[], -- Array of email addresses
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_funnel_alerts_funnel_id ON funnel_alerts(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_alerts_project_id ON funnel_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_funnel_alerts_enabled ON funnel_alerts(enabled);

-- Create alert_history table to track when alerts were triggered
CREATE TABLE IF NOT EXISTS funnel_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES funnel_alerts(id) ON DELETE CASCADE,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  alert_value DECIMAL(10, 2) NOT NULL, -- The value that triggered the alert
  threshold_value DECIMAL(10, 2) NOT NULL,
  message TEXT NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB -- Additional context about the alert
);

-- Create index for alert history
CREATE INDEX IF NOT EXISTS idx_funnel_alert_history_alert_id ON funnel_alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_funnel_alert_history_triggered_at ON funnel_alert_history(triggered_at);

