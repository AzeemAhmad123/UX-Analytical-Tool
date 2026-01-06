-- Add project_id column to session_snapshots table if it doesn't exist
-- This is required for proper data organization

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'session_snapshots' 
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE session_snapshots 
        ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_snapshots_project_id 
        ON session_snapshots(project_id);
        
        -- Update existing records to have project_id from their session
        UPDATE session_snapshots ss
        SET project_id = s.project_id
        FROM sessions s
        WHERE ss.session_id = s.id
        AND ss.project_id IS NULL;
        
        -- Make it NOT NULL after updating existing records
        ALTER TABLE session_snapshots 
        ALTER COLUMN project_id SET NOT NULL;
        
        RAISE NOTICE '✅ Added project_id column to session_snapshots';
    ELSE
        RAISE NOTICE '✅ Column project_id already exists in session_snapshots';
    END IF;
END $$;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'session_snapshots'
ORDER BY ordinal_position;

