-- Add new columns to funnels table for enhanced features

ALTER TABLE funnels 
ADD COLUMN IF NOT EXISTS time_window_hours INTEGER,
ADD COLUMN IF NOT EXISTS track_first_time_users BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN funnels.time_window_hours IS 'Time window in hours for funnel completion (e.g., 24 means users must complete all steps within 24 hours)';
COMMENT ON COLUMN funnels.track_first_time_users IS 'Whether to track first-time vs returning users for this funnel';

