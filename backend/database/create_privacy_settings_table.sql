-- Create privacy_settings table for project-level privacy configuration
CREATE TABLE IF NOT EXISTS privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  mask_sensitive_fields BOOLEAN DEFAULT TRUE,
  sensitive_field_selectors TEXT[], -- Array of CSS selectors or field names to mask
  gdpr_enabled BOOLEAN DEFAULT FALSE,
  gdpr_consent_required BOOLEAN DEFAULT FALSE,
  sampling_enabled BOOLEAN DEFAULT FALSE,
  sampling_rate DECIMAL(5, 4) DEFAULT 1.0, -- 0.0 to 1.0 (0% to 100%)
  ip_anonymization BOOLEAN DEFAULT FALSE,
  data_retention_days INTEGER DEFAULT 365,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_privacy_settings_project_id ON privacy_settings(project_id);

-- Create gdpr_consents table to track user consent
CREATE TABLE IF NOT EXISTS gdpr_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id VARCHAR(255), -- Session ID or user identifier
  user_id VARCHAR(255), -- Optional user ID
  consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('analytics', 'marketing', 'functional', 'all')),
  consented BOOLEAN NOT NULL,
  consent_method VARCHAR(50), -- 'explicit', 'implicit', 'opt_in', 'opt_out'
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for consent lookups
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_project_id ON gdpr_consents(project_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_session_id ON gdpr_consents(session_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_user_id ON gdpr_consents(user_id);

