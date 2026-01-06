-- =====================================================
-- Row Level Security (RLS) Policies
-- UXCam Analytics Backend
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

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
-- NOTES
-- =====================================================

-- These policies ensure:
-- 1. Service role (backend) can do everything (needed for SDK ingestion)
-- 2. Authenticated users can only access their own projects and related data
-- 3. Users cannot directly insert sessions/snapshots/events (only via backend)
-- 4. Users can view and delete their own data

-- To apply these policies:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Policies will be active immediately
-- 3. Test with authenticated user to verify access control

