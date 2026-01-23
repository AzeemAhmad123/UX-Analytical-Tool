-- QUICK PERFORMANCE INDEXES (Run these first - most critical)
-- These are the most important indexes that will give the biggest performance boost
-- Run this in Supabase SQL Editor

-- ============================================
-- CRITICAL INDEXES (Run these first)
-- ============================================

-- Sessions: Find sessions by project (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);

-- Sessions: Find sessions by project + session_id (very common)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_project_session ON sessions(project_id, session_id);

-- Sessions: Order by start_time (for date filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_project_start_time ON sessions(project_id, start_time DESC);

-- Snapshots: Count snapshots by session (very common)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_snapshots_session_id ON session_snapshots(session_id);

-- Projects: Filter by user_id (login and dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Projects: SDK key lookup (authentication)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_sdk_key ON projects(sdk_key);

-- ============================================
-- After running, wait 2-3 minutes then test your app
-- ============================================
