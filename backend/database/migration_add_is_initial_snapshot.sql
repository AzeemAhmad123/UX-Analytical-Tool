-- Migration: Add is_initial_snapshot column to session_snapshots table
-- Run this if the column is missing

-- Check if column exists, if not add it
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
        
        -- Create index for initial snapshots
        CREATE INDEX IF NOT EXISTS idx_snapshots_initial 
        ON session_snapshots(session_id, is_initial_snapshot) 
        WHERE is_initial_snapshot = true;
        
        RAISE NOTICE 'Column is_initial_snapshot added successfully';
    ELSE
        RAISE NOTICE 'Column is_initial_snapshot already exists';
    END IF;
END $$;

