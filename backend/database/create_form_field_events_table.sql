-- =====================================================
-- Create form_field_events table if it doesn't exist
-- Run this in your Supabase SQL Editor if the table is missing
-- =====================================================

-- Create form_field_events table
CREATE TABLE IF NOT EXISTS form_field_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    form_id TEXT NOT NULL, -- Identifier for the form
    field_name TEXT NOT NULL, -- Name/id of the form field
    field_type TEXT, -- 'input', 'select', 'textarea', 'checkbox', 'radio', etc.
    action TEXT NOT NULL, -- 'focus', 'blur', 'change', 'submit', 'skip', 'abandon'
    value TEXT, -- Field value (optional, for non-sensitive fields)
    is_completed BOOLEAN DEFAULT false, -- true if field was completed
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_form_field_events_session_id ON form_field_events(session_id);
CREATE INDEX IF NOT EXISTS idx_form_field_events_project_id ON form_field_events(project_id);
CREATE INDEX IF NOT EXISTS idx_form_field_events_form_id ON form_field_events(form_id);
CREATE INDEX IF NOT EXISTS idx_form_field_events_field_name ON form_field_events(field_name);
CREATE INDEX IF NOT EXISTS idx_form_field_events_action ON form_field_events(action);
CREATE INDEX IF NOT EXISTS idx_form_field_events_timestamp ON form_field_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_form_field_events_composite ON form_field_events(form_id, field_name, action);

-- Add comment for documentation
COMMENT ON TABLE form_field_events IS 'Detailed form field interaction tracking for form funnels';

-- =====================================================
-- Migration Complete!
-- =====================================================
-- After running this, form field events should work without 500 errors.
-- =====================================================
