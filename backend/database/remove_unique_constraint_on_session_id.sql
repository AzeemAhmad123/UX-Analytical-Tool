-- Remove unique constraint on session_id in session_snapshots table
-- A session should be able to have multiple snapshots, so session_id should NOT be unique

DO $$ 
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'session_snapshots' 
        AND constraint_name = 'session_snapshots_session_id_key'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE session_snapshots 
        DROP CONSTRAINT session_snapshots_session_id_key;
        
        RAISE NOTICE '✅ Removed unique constraint on session_id';
    ELSE
        RAISE NOTICE '✅ No unique constraint found on session_id (already removed or never existed)';
    END IF;
END $$;

-- Verify the constraint is removed
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'session_snapshots'
AND constraint_type = 'UNIQUE';

