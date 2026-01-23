-- =====================================================
-- Migration: Add is_active column to projects table
-- Run this in your Supabase SQL Editor if the column is missing
-- =====================================================

-- Add is_active column if it doesn't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing projects to be active by default
UPDATE projects 
SET is_active = true 
WHERE is_active IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN projects.is_active IS 'Whether the project is active (can be toggled on/off without deleting)';

-- =====================================================
-- Migration Complete!
-- =====================================================
-- After running this, try creating a project again.
-- The error "Could not find the 'is_active' column" should be resolved.
-- =====================================================
