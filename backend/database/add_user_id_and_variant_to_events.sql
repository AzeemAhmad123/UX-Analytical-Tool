-- =====================================================
-- Add user_id, variant, and project_id columns to events table
-- =====================================================
-- This migration adds optional columns for user tracking, A/B testing, and project filtering
-- All columns are nullable to support existing events

-- Add user_id column (for user cohort analysis)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Add variant column (for A/B testing)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS variant TEXT;

-- Add project_id column (for better querying and filtering)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_variant ON events(variant) WHERE variant IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id) WHERE project_id IS NOT NULL;

-- Add composite index for common queries (project + user)
CREATE INDEX IF NOT EXISTS idx_events_project_user ON events(project_id, user_id) 
WHERE project_id IS NOT NULL AND user_id IS NOT NULL;

-- Add composite index for A/B testing queries (project + variant)
CREATE INDEX IF NOT EXISTS idx_events_project_variant ON events(project_id, variant) 
WHERE project_id IS NOT NULL AND variant IS NOT NULL;

-- Update existing events to set project_id from their session
-- This is a one-time migration for existing data
UPDATE events e
SET project_id = s.project_id
FROM sessions s
WHERE e.session_id = s.id 
  AND e.project_id IS NULL;

-- Add comment to columns for documentation
COMMENT ON COLUMN events.user_id IS 'User identifier for cohort analysis and user segmentation';
COMMENT ON COLUMN events.variant IS 'A/B test variant identifier';
COMMENT ON COLUMN events.project_id IS 'Project ID for better querying and filtering (denormalized from sessions)';
