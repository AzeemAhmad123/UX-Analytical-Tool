-- =====================================================
-- Fix projects.user_id Foreign Key Constraint
-- =====================================================
-- This script checks and fixes the foreign key constraint
-- for projects.user_id to reference auth.users(id)

-- Step 1: Check if the foreign key constraint exists
-- Run this query first to see the current constraint:
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'projects'
  AND kcu.column_name = 'user_id';

-- Step 2: Drop the existing foreign key constraint if it exists
-- (Only run this if the constraint exists and is incorrect)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_user_id_fkey' 
        AND table_name = 'projects'
    ) THEN
        ALTER TABLE projects DROP CONSTRAINT projects_user_id_fkey;
        RAISE NOTICE 'Dropped existing projects_user_id_fkey constraint';
    ELSE
        RAISE NOTICE 'projects_user_id_fkey constraint does not exist';
    END IF;
END $$;

-- Step 3: Add the correct foreign key constraint referencing auth.users(id)
-- This ensures user_id in projects references auth.users(id)
ALTER TABLE projects 
ADD CONSTRAINT projects_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Step 4: Verify the constraint was created correctly
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'projects'
  AND kcu.column_name = 'user_id';

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. This script assumes user_id should reference auth.users(id)
-- 2. If you want user_id to be nullable (optional), change the constraint:
--    ALTER TABLE projects ALTER COLUMN user_id DROP NOT NULL;
-- 3. ON DELETE CASCADE means if a user is deleted, their projects are deleted too
--    Change to ON DELETE SET NULL if you want to keep projects when users are deleted
