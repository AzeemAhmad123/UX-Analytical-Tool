-- Create tables for advanced analytics features (Phase 4)

-- Rage clicks and dead taps tracking
CREATE TABLE IF NOT EXISTS rage_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  element_selector TEXT,
  element_text TEXT,
  click_count INTEGER DEFAULT 1,
  time_window_ms INTEGER, -- Time window in which clicks occurred
  coordinates JSONB, -- Array of {x, y, timestamp}
  page_url TEXT,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_rage_clicks_session_id ON rage_clicks(session_id);
CREATE INDEX IF NOT EXISTS idx_rage_clicks_project_id ON rage_clicks(project_id);
CREATE INDEX IF NOT EXISTS idx_rage_clicks_detected_at ON rage_clicks(detected_at);

-- Dead taps (mobile) - similar to rage clicks but for mobile
CREATE TABLE IF NOT EXISTS dead_taps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  element_selector TEXT,
  element_text TEXT,
  tap_count INTEGER DEFAULT 1,
  time_window_ms INTEGER,
  coordinates JSONB,
  page_url TEXT,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_dead_taps_session_id ON dead_taps(session_id);
CREATE INDEX IF NOT EXISTS idx_dead_taps_project_id ON dead_taps(project_id);
CREATE INDEX IF NOT EXISTS idx_dead_taps_detected_at ON dead_taps(detected_at);

-- Heatmaps data
CREATE TABLE IF NOT EXISTS heatmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  heatmap_type VARCHAR(50) NOT NULL CHECK (heatmap_type IN ('click', 'scroll', 'move', 'attention')),
  viewport_width INTEGER,
  viewport_height INTEGER,
  data_points JSONB NOT NULL, -- Array of {x, y, intensity}
  total_sessions INTEGER DEFAULT 0,
  date_range_start TIMESTAMP WITH TIME ZONE,
  date_range_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_heatmaps_project_id ON heatmaps(project_id);
CREATE INDEX IF NOT EXISTS idx_heatmaps_page_url ON heatmaps(page_url);
CREATE INDEX IF NOT EXISTS idx_heatmaps_type ON heatmaps(heatmap_type);

-- Web vitals and performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('LCP', 'FID', 'CLS', 'TTFB', 'FCP', 'INP')),
  value DECIMAL(10, 2) NOT NULL,
  rating VARCHAR(20) CHECK (rating IN ('good', 'needs-improvement', 'poor')),
  device_type VARCHAR(50),
  connection_type VARCHAR(50),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_session_id ON performance_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_project_id ON performance_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_page_url ON performance_metrics(page_url);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- User segments
CREATE TABLE IF NOT EXISTS user_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL, -- Array of condition objects
  user_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_segments_project_id ON user_segments(project_id);

-- Segment assignments (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_segment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES user_segments(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(segment_id, user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_user_segment_assignments_segment_id ON user_segment_assignments(segment_id);
CREATE INDEX IF NOT EXISTS idx_user_segment_assignments_user_id ON user_segment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_segment_assignments_project_id ON user_segment_assignments(project_id);

