-- ============================================
-- FIX ATTENDANCE CONSTRAINT - Add 'cancelled' Status
-- ChurchEase V.2
-- Date: 2025-10-31
-- ============================================

-- This script fixes the CHECK constraint to allow 'cancelled' status

-- STEP 1: Find and drop the old constraint
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- Get the constraint name
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'reservations' 
    AND column_name = 'attendance_status'
    LIMIT 1;
    
    -- Drop the constraint if found
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE reservations DROP CONSTRAINT ' || constraint_name_var || ';';
        RAISE NOTICE '✅ Dropped old constraint: %', constraint_name_var;
    ELSE
        RAISE NOTICE '⚠️ No existing constraint found';
    END IF;
END $$;

-- STEP 2: Add new constraint with 'cancelled' included
ALTER TABLE reservations 
ADD CONSTRAINT reservations_attendance_status_check 
CHECK (attendance_status IN ('pending', 'attended', 'no_show', 'cancelled'));

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ SUCCESS! Attendance constraint updated!';
    RAISE NOTICE 'Allowed values: pending, attended, no_show, cancelled';
END $$;
