-- =====================================================
-- UXCam Analytics Backend - Database Schema
-- Phase 1: Foundation Tables
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Will link to auth.users later
    name TEXT NOT NULL,
    description TEXT,
    sdk_key TEXT UNIQUE NOT NULL,
    platform TEXT DEFAULT 'web',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_sdk_key ON projects(sdk_key);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- =====================================================
-- SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL, -- From SDK (e.g., 'sess_1234567890_abc123')
    device_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    start_time TIMESTAMPTZ NOT NULL,
    last_activity_time TIMESTAMPTZ NOT NULL,
    duration INTEGER, -- milliseconds
    event_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_device_info ON sessions USING GIN (device_info);

-- =====================================================
-- SESSION_SNAPSHOTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS session_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    snapshot_data BYTEA NOT NULL, -- Compressed rrweb events
    snapshot_count INTEGER NOT NULL, -- Number of events in this batch
    is_initial_snapshot BOOLEAN DEFAULT false, -- true for Type 2, false for incremental
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_session_id ON session_snapshots(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_snapshots_initial ON session_snapshots(session_id, is_initial_snapshot) WHERE is_initial_snapshot = true;

-- =====================================================
-- EVENTS TABLE (Optional - for analytics events)
-- =====================================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'click', 'page_view', 'custom_event', etc.
    timestamp TIMESTAMPTZ NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_data ON events USING GIN (data);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE projects IS 'Projects with SDK keys for authentication';
COMMENT ON TABLE sessions IS 'User sessions with device info and metadata';
COMMENT ON TABLE session_snapshots IS 'Compressed rrweb events for session replay';
COMMENT ON TABLE events IS 'Analytics events (clicks, page views, etc.)';

