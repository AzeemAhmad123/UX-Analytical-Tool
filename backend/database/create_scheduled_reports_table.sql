-- Create scheduled_reports table for automated email reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  schedule_type VARCHAR(50) NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
  schedule_config JSONB, -- Day of week, time, etc.
  recipients TEXT[] NOT NULL, -- Array of email addresses
  report_format VARCHAR(50) DEFAULT 'html' CHECK (report_format IN ('html', 'pdf', 'csv')),
  include_charts BOOLEAN DEFAULT TRUE,
  report_params JSONB, -- Filter parameters (date range, platform, etc.)
  enabled BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  created_by UUID, -- User who created the scheduled report
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_funnel_id ON scheduled_reports(funnel_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_project_id ON scheduled_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_enabled ON scheduled_reports(enabled);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_send_at ON scheduled_reports(next_send_at);

-- Create report_history table to track sent reports
CREATE TABLE IF NOT EXISTS scheduled_report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id UUID NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recipients TEXT[] NOT NULL,
  report_format VARCHAR(50),
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_scheduled_report_history_scheduled_report_id ON scheduled_report_history(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_report_history_sent_at ON scheduled_report_history(sent_at);

