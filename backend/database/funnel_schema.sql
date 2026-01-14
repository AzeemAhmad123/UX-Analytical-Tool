-- =====================================================
-- FUNNEL ANALYSIS - Database Schema
-- =====================================================

-- Add geographic fields to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS ip_address TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_country ON sessions(country);
CREATE INDEX IF NOT EXISTS idx_sessions_city ON sessions(city);
CREATE INDEX IF NOT EXISTS idx_sessions_region ON sessions(region);

-- =====================================================
-- FUNNELS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS funnels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    steps JSONB NOT NULL, -- Array of step definitions
    is_form_funnel BOOLEAN DEFAULT false, -- true for form field tracking
    form_url TEXT, -- URL where form is located (for form funnels)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnels_project_id ON funnels(project_id);
CREATE INDEX IF NOT EXISTS idx_funnels_is_form_funnel ON funnels(is_form_funnel);

-- =====================================================
-- FORM FIELD EVENTS TABLE
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_form_field_events_session_id ON form_field_events(session_id);
CREATE INDEX IF NOT EXISTS idx_form_field_events_project_id ON form_field_events(project_id);
CREATE INDEX IF NOT EXISTS idx_form_field_events_form_id ON form_field_events(form_id);
CREATE INDEX IF NOT EXISTS idx_form_field_events_field_name ON form_field_events(field_name);
CREATE INDEX IF NOT EXISTS idx_form_field_events_action ON form_field_events(action);
CREATE INDEX IF NOT EXISTS idx_form_field_events_timestamp ON form_field_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_form_field_events_composite ON form_field_events(form_id, field_name, action);

-- =====================================================
-- FUNNEL RESULTS TABLE (for caching)
-- =====================================================
CREATE TABLE IF NOT EXISTS funnel_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    date_range_start TIMESTAMPTZ NOT NULL,
    date_range_end TIMESTAMPTZ NOT NULL,
    results JSONB NOT NULL, -- Main funnel analysis results
    geographic_breakdown JSONB, -- Country/city level breakdown
    field_breakdown JSONB, -- Form field level breakdown (for form funnels)
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(funnel_id, date_range_start, date_range_end)
);

CREATE INDEX IF NOT EXISTS idx_funnel_results_funnel_id ON funnel_results(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_results_project_id ON funnel_results(project_id);
CREATE INDEX IF NOT EXISTS idx_funnel_results_date_range ON funnel_results(date_range_start, date_range_end);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp for funnels
CREATE TRIGGER update_funnels_updated_at 
    BEFORE UPDATE ON funnels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE funnels IS 'User-defined funnel definitions for conversion tracking';
COMMENT ON TABLE form_field_events IS 'Detailed form field interaction tracking for form funnels';
COMMENT ON TABLE funnel_results IS 'Cached funnel analysis results for performance';

