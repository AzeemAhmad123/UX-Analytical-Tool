-- Fix session_snapshots table schema
-- Run this to ensure all required columns exist

-- Add is_initial_snapshot column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'session_snapshots' 
        AND column_name = 'is_initial_snapshot'
    ) THEN
        ALTER TABLE session_snapshots 
        ADD COLUMN is_initial_snapshot BOOLEAN DEFAULT false;
        
        RAISE NOTICE '✅ Added is_initial_snapshot column';
    ELSE
        RAISE NOTICE '✅ Column is_initial_snapshot already exists';
    END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_snapshots_initial 
ON session_snapshots(session_id, is_initial_snapshot) 
WHERE is_initial_snapshot = true;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'session_snapshots'
ORDER BY ordinal_position;

