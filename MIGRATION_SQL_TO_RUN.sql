-- =====================================================
-- PRODUCTION DATABASE MIGRATION SQL
-- Run this in Render PostgreSQL before re-deploying
-- =====================================================
-- 
-- PROBLEM: 
-- - Old deployment created "athlete" table (commit 897299d)
-- - New schema expects "athletes" table
-- - Old training tables (training_goals, training_days, training_sessions) 
--   exist with foreign keys that conflict
--
-- SOLUTION:
-- 1. Drop old training tables (cascade removes all foreign keys)
-- 2. Rename athlete table to athletes
-- 3. Recreate foreign key constraint pointing to athletes
--
-- =====================================================

-- STEP 1: Drop old training tables (if they exist)
DROP TABLE IF EXISTS "training_sessions" CASCADE;
DROP TABLE IF EXISTS "training_days" CASCADE;
DROP TABLE IF EXISTS "training_goals" CASCADE;

-- STEP 2: Rename athlete table to athletes
ALTER TABLE IF EXISTS "athlete" RENAME TO "athletes";

-- STEP 3: Drop the old foreign key constraint
ALTER TABLE IF EXISTS "athlete_activities" 
DROP CONSTRAINT IF EXISTS "athlete_activities_athleteId_fkey";

-- STEP 4: Recreate foreign key constraint pointing to "athletes"
ALTER TABLE "athlete_activities" 
ADD CONSTRAINT "athlete_activities_athleteId_fkey" 
FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- =====================================================
-- VERIFICATION QUERIES (run these to confirm)
-- =====================================================

-- Check that athletes table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'athletes';

-- Check foreign key constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'athlete_activities'
    AND ccu.table_name = 'athletes';

-- =====================================================
-- After running this SQL, push the new deployment
-- =====================================================
