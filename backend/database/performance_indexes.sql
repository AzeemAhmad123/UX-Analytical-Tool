-- Performance Optimization: Database Indexes
-- Run this SQL in your Supabase SQL Editor to speed up queries
-- IMPORTANT: Run indexes one at a time or in small batches to avoid timeouts

-- ============================================
-- SESSIONS TABLE INDEXES (CRITICAL - Run these first)
-- ============================================

-- Index for filtering sessions by project_id (most common query) - CRITICAL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);

-- Index for finding sessions by session_id - CRITICAL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);

-- Composite index for finding sessions by project_id + session_id (very common) - CRITICAL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_project_session ON sessions(project_id, session_id);

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
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_session_id ON session_videos(session_id);

-- ============================================
-- PROJECTS TABLE INDEXES (CRITICAL)
-- ============================================

-- Index for filtering projects by user_id (very common) - CRITICAL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Index for SDK key lookup (authentication) - CRITICAL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_sdk_key ON projects(sdk_key);

-- ============================================
-- NOTES ON CONCURRENT INDEX CREATION:
-- ============================================
-- Using CONCURRENTLY allows indexes to be created without locking tables
-- This means your app can continue working while indexes are being created
-- However, CONCURRENTLY indexes take longer to create but don't block operations

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
