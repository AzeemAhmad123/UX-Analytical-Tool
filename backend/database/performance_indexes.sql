-- Performance Optimization: Database Indexes
-- Run this SQL in your Supabase SQL Editor to speed up queries
-- This will significantly improve query performance

-- ============================================
-- SESSIONS TABLE INDEXES
-- ============================================

-- Index for filtering sessions by project_id (most common query)
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);

-- Index for finding sessions by session_id
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);

-- Composite index for finding sessions by project_id + session_id (very common)
CREATE INDEX IF NOT EXISTS idx_sessions_project_session ON sessions(project_id, session_id);

-- Index for ordering and filtering by start_time (date range queries)
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time DESC);

-- Composite index for project_id + start_time (for filtered date queries)
CREATE INDEX IF NOT EXISTS idx_sessions_project_start_time ON sessions(project_id, start_time DESC);

-- Index for filtering by duration (for session filtering)
CREATE INDEX IF NOT EXISTS idx_sessions_duration ON sessions(duration) WHERE duration IS NOT NULL;

-- Index for last_activity_time (for session updates)
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity_time);

-- ============================================
-- SESSION_SNAPSHOTS TABLE INDEXES
-- ============================================

-- Index for counting snapshots by session_id (very common)
CREATE INDEX IF NOT EXISTS idx_snapshots_session_id ON session_snapshots(session_id);

-- Index for project_id if it exists in the table
CREATE INDEX IF NOT EXISTS idx_snapshots_project_id ON session_snapshots(project_id) WHERE project_id IS NOT NULL;

-- Index for ordering snapshots by creation time
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON session_snapshots(created_at);

-- Composite index for session_id + created_at (for ordered snapshot retrieval)
CREATE INDEX IF NOT EXISTS idx_snapshots_session_created ON session_snapshots(session_id, created_at);

-- ============================================
-- SESSION_VIDEOS TABLE INDEXES
-- ============================================

-- Index for finding videos by session_id
CREATE INDEX IF NOT EXISTS idx_videos_session_id ON session_videos(session_id);

-- Index for ordering videos by creation time
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON session_videos(created_at DESC);

-- Composite index for session_id + created_at
CREATE INDEX IF NOT EXISTS idx_videos_session_created ON session_videos(session_id, created_at DESC);

-- ============================================
-- PROJECTS TABLE INDEXES
-- ============================================

-- Index for filtering projects by user_id (very common)
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Index for SDK key lookup (authentication)
CREATE INDEX IF NOT EXISTS idx_projects_sdk_key ON projects(sdk_key);

-- Index for filtering active projects
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active) WHERE is_active = true;

-- Composite index for user_id + is_active (common query pattern)
CREATE INDEX IF NOT EXISTS idx_projects_user_active ON projects(user_id, is_active);

-- ============================================
-- EVENTS TABLE INDEXES (if exists)
-- ============================================

-- Index for events by project_id
CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id) WHERE project_id IS NOT NULL;

-- Index for events by session_id
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id) WHERE session_id IS NOT NULL;

-- Index for events by timestamp (for date filtering)
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp) WHERE timestamp IS NOT NULL;

-- Composite index for project_id + timestamp
CREATE INDEX IF NOT EXISTS idx_events_project_timestamp ON events(project_id, timestamp) WHERE project_id IS NOT NULL AND timestamp IS NOT NULL;

-- ============================================
-- ANALYZE TABLES (Update statistics for query planner)
-- ============================================

-- Update table statistics to help PostgreSQL choose the best query plans
ANALYZE sessions;
ANALYZE session_snapshots;
ANALYZE session_videos;
ANALYZE projects;

-- If events table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'events') THEN
        ANALYZE events;
    END IF;
END $$;

-- ============================================
-- NOTES:
-- ============================================
-- 1. These indexes will speed up:
--    - Session lookups by project_id
--    - Session lookups by session_id
--    - Date range filtering
--    - Snapshot counting
--    - Project filtering by user_id
--    - SDK key authentication
--
-- 2. Indexes use some storage space but dramatically improve query speed
--
-- 3. After creating indexes, queries should be 10-100x faster
--
-- 4. Monitor slow queries in Supabase dashboard to see improvements
