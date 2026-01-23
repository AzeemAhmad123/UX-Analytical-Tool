-- =====================================================
-- Complete Database Setup for New Supabase Project
-- Run this in your NEW Supabase project's SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Links to auth.users
    name TEXT NOT NULL,
    description TEXT,
    sdk_key TEXT UNIQUE NOT NULL,
    platform TEXT DEFAULT 'all', -- 'all', 'web', or 'mobile'
    is_active BOOLEAN DEFAULT true, -- Whether the project is active (can be toggled on/off)
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
CREATE INDEX IF NOT EXISTS idx_sessions_project_session ON sessions(project_id, session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project_start_time ON sessions(project_id, start_time DESC);

-- =====================================================
-- SESSION_SNAPSHOTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS session_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- Added for better querying
    snapshot_data BYTEA NOT NULL, -- Compressed rrweb events
    snapshot_count INTEGER NOT NULL, -- Number of events in this batch
    is_initial_snapshot BOOLEAN DEFAULT false, -- true for Type 2, false for incremental
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_session_id ON session_snapshots(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_snapshots_initial ON session_snapshots(session_id, is_initial_snapshot) WHERE is_initial_snapshot = true;
CREATE INDEX IF NOT EXISTS idx_snapshots_project_id ON session_snapshots(project_id);

-- =====================================================
-- EVENTS TABLE
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
-- SESSION_VIDEOS TABLE (for mobile sessions)
-- =====================================================
CREATE TABLE IF NOT EXISTS session_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    duration INTEGER, -- milliseconds
    file_size BIGINT, -- bytes
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_videos_session_id ON session_videos(session_id);

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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_videos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROJECTS TABLE POLICIES
-- =====================================================

-- Allow service role to do everything (backend operations)
CREATE POLICY "Service role can manage projects" ON projects
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to view their own projects
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT
    USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

-- Allow authenticated users to create their own projects
CREATE POLICY "Users can create own projects" ON projects
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

-- Allow authenticated users to update their own projects
CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE
    USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    )
    WITH CHECK (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

-- Allow authenticated users to delete their own projects
CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE
    USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

-- =====================================================
-- SESSIONS TABLE POLICIES
-- =====================================================

-- Allow service role to do everything
CREATE POLICY "Service role can manage sessions" ON sessions
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Allow users to view sessions from their projects
CREATE POLICY "Users can view sessions from own projects" ON sessions
    FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        ) OR
        auth.role() = 'service_role'
    );

-- Allow service role to insert sessions (from SDK)
CREATE POLICY "Service role can insert sessions" ON sessions
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Allow service role to update sessions
CREATE POLICY "Service role can update sessions" ON sessions
    FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Allow users to delete sessions from their projects
CREATE POLICY "Users can delete sessions from own projects" ON sessions
    FOR DELETE
    USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        ) OR
        auth.role() = 'service_role'
    );

-- =====================================================
-- SESSION_SNAPSHOTS TABLE POLICIES
-- =====================================================

-- Allow service role to do everything
CREATE POLICY "Service role can manage snapshots" ON session_snapshots
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Allow users to view snapshots from their project sessions
CREATE POLICY "Users can view snapshots from own projects" ON session_snapshots
    FOR SELECT
    USING (
        session_id IN (
            SELECT id FROM sessions
            WHERE project_id IN (
                SELECT id FROM projects WHERE user_id = auth.uid()
            )
        ) OR
        auth.role() = 'service_role'
    );

-- Allow service role to insert snapshots (from SDK)
CREATE POLICY "Service role can insert snapshots" ON session_snapshots
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- EVENTS TABLE POLICIES
-- =====================================================

-- Allow service role to do everything
CREATE POLICY "Service role can manage events" ON events
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Allow users to view events from their project sessions
CREATE POLICY "Users can view events from own projects" ON events
    FOR SELECT
    USING (
        session_id IN (
            SELECT id FROM sessions
            WHERE project_id IN (
                SELECT id FROM projects WHERE user_id = auth.uid()
            )
        ) OR
        auth.role() = 'service_role'
    );

-- Allow service role to insert events (from SDK)
CREATE POLICY "Service role can insert events" ON events
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- SESSION_VIDEOS TABLE POLICIES
-- =====================================================

-- Allow service role to do everything
CREATE POLICY "Service role can manage videos" ON session_videos
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Allow users to view videos from their project sessions
CREATE POLICY "Users can view videos from own projects" ON session_videos
    FOR SELECT
    USING (
        session_id IN (
            SELECT id FROM sessions
            WHERE project_id IN (
                SELECT id FROM projects WHERE user_id = auth.uid()
            )
        ) OR
        auth.role() = 'service_role'
    );

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE projects IS 'Projects with SDK keys for authentication';
COMMENT ON TABLE sessions IS 'User sessions with device info and metadata';
COMMENT ON TABLE session_snapshots IS 'Compressed rrweb events for session replay';
COMMENT ON TABLE events IS 'Analytics events (clicks, page views, etc.)';
COMMENT ON TABLE session_videos IS 'Video recordings for mobile sessions';

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Next steps:
-- 1. Add CORS origins in Settings → API
-- 2. Update environment variables in Vercel
-- 3. Redeploy frontend and backend
-- 4. Test login and data capture
-- =====================================================
