-- ============================================
-- ATTENDANCE TRACKING MIGRATION
-- ChurchEase V.2 - Attendance Feature
-- Date: 2025-10-31
-- ============================================

-- STEP 1: Add attendance_status column to reservations table
-- SAFE: Uses IF NOT EXISTS pattern
DO $$ 
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'reservations' 
        AND column_name = 'attendance_status'
    ) THEN
        -- Add the column
        ALTER TABLE reservations 
        ADD COLUMN attendance_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (attendance_status IN ('pending', 'attended', 'no_show', 'cancelled'));
        
        RAISE NOTICE 'Column attendance_status added successfully';
    ELSE
        RAISE NOTICE 'Column attendance_status already exists, skipping';
    END IF;
END $$;

-- STEP 1B: Update constraint to include 'cancelled' if column already exists
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'reservations' 
        AND column_name = 'attendance_status'
    ) THEN
        -- Find and drop the constraint
        EXECUTE (
            SELECT 'ALTER TABLE reservations DROP CONSTRAINT ' || constraint_name || ';'
            FROM information_schema.constraint_column_usage
            WHERE table_name = 'reservations' 
            AND column_name = 'attendance_status'
            LIMIT 1
        );
        
        RAISE NOTICE 'Old attendance_status constraint dropped';
    END IF;
    
    -- Add new constraint with 'cancelled' included
    ALTER TABLE reservations 
    ADD CONSTRAINT reservations_attendance_status_check 
    CHECK (attendance_status IN ('pending', 'attended', 'no_show', 'cancelled'));
    
    RAISE NOTICE 'New attendance_status constraint added with cancelled status';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint already exists with correct values';
END $$;

-- STEP 2: Update existing records
-- Set attendance_status based on current status
UPDATE reservations 
SET attendance_status = CASE
    WHEN status = 'completed' THEN 'attended'
    WHEN status = 'cancelled' THEN 'no_show'
    ELSE 'pending'
END
WHERE attendance_status = 'pending';

-- STEP 3: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_reservations_attendance 
ON reservations(attendance_status);

-- STEP 4: Add attendance tracking timestamp
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'reservations' 
        AND column_name = 'attendance_marked_at'
    ) THEN
        ALTER TABLE reservations 
        ADD COLUMN attendance_marked_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Column attendance_marked_at added successfully';
    ELSE
        RAISE NOTICE 'Column attendance_marked_at already exists, skipping';
    END IF;
END $$;

-- STEP 5: Add who marked the attendance
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'reservations' 
        AND column_name = 'attendance_marked_by'
    ) THEN
        ALTER TABLE reservations 
        ADD COLUMN attendance_marked_by UUID REFERENCES users(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Column attendance_marked_by added successfully';
    ELSE
        RAISE NOTICE 'Column attendance_marked_by already exists, skipping';
    END IF;
END $$;

-- VERIFICATION: Check if all columns were added
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'reservations'
AND column_name IN ('attendance_status', 'attendance_marked_at', 'attendance_marked_by')
ORDER BY column_name;

-- SUCCESS MESSAGE
DO $$ 
BEGIN
    RAISE NOTICE '✅ Attendance tracking migration completed successfully!';
    RAISE NOTICE 'New columns added:';
    RAISE NOTICE '  - attendance_status (pending/attended/no_show)';
    RAISE NOTICE '  - attendance_marked_at (timestamp)';
    RAISE NOTICE '  - attendance_marked_by (user reference)';
END $$;
