-- Add is_active column to projects table
-- This allows users to turn projects on/off without deleting them

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);

-- Update existing projects to be active by default
UPDATE projects SET is_active = true WHERE is_active IS NULL;

-- Add comment
COMMENT ON COLUMN projects.is_active IS 'Whether the project is active. Inactive projects are hidden from data views but not deleted.';
