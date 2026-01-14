-- Create user_properties table for storing user attributes
CREATE TABLE IF NOT EXISTS user_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL, -- User identifier from SDK
  properties JSONB NOT NULL DEFAULT '{}', -- Flexible properties storage
  country VARCHAR(100),
  platform VARCHAR(50), -- 'web', 'android', 'ios'
  app_version VARCHAR(50),
  device_type VARCHAR(100), -- 'mobile', 'tablet', 'desktop'
  acquisition_source VARCHAR(100), -- 'organic', 'paid', 'referral', etc.
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_new_user BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_user_properties_project_id ON user_properties(project_id);
CREATE INDEX IF NOT EXISTS idx_user_properties_user_id ON user_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_user_properties_country ON user_properties(country);
CREATE INDEX IF NOT EXISTS idx_user_properties_platform ON user_properties(platform);
CREATE INDEX IF NOT EXISTS idx_user_properties_app_version ON user_properties(app_version);
CREATE INDEX IF NOT EXISTS idx_user_properties_device_type ON user_properties(device_type);
CREATE INDEX IF NOT EXISTS idx_user_properties_is_new_user ON user_properties(is_new_user);

-- Create experiments table for A/B testing
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  traffic_split JSONB NOT NULL DEFAULT '{}', -- e.g., {"A": 50, "B": 50}
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create experiment_variants table
CREATE TABLE IF NOT EXISTS experiment_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_name VARCHAR(50) NOT NULL, -- 'A', 'B', 'C', etc.
  description TEXT,
  traffic_percentage DECIMAL(5, 2) NOT NULL, -- 0-100
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(experiment_id, variant_name)
);

-- Create user_variant_assignments table
CREATE TABLE IF NOT EXISTS user_variant_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  variant_name VARCHAR(50) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, experiment_id, user_id)
);

-- Create indexes for experiments
CREATE INDEX IF NOT EXISTS idx_experiments_project_id ON experiments(project_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiment_variants_experiment_id ON experiment_variants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_user_variant_assignments_project_id ON user_variant_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_user_variant_assignments_experiment_id ON user_variant_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_user_variant_assignments_user_id ON user_variant_assignments(user_id);

-- Add variant column to events table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'variant'
  ) THEN
    ALTER TABLE events ADD COLUMN variant VARCHAR(50);
    CREATE INDEX IF NOT EXISTS idx_events_variant ON events(variant);
  END IF;
END $$;

-- Add user_id column to events table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE events ADD COLUMN user_id VARCHAR(255);
    CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
  END IF;
END $$;

-- Create funnel_anomalies table for Phase 4
CREATE TABLE IF NOT EXISTS funnel_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  baseline_conversion DECIMAL(10, 2),
  current_conversion DECIMAL(10, 2),
  deviation_percentage DECIMAL(10, 2),
  severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_anomalies_funnel_id ON funnel_anomalies(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_anomalies_detected_at ON funnel_anomalies(detected_at);
CREATE INDEX IF NOT EXISTS idx_funnel_anomalies_status ON funnel_anomalies(status);

