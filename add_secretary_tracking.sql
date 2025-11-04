-- Add Secretary Tracking Columns to Reservations Table
-- This will track which secretary created each reservation

-- Add columns to track secretary information
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS created_by_secretary VARCHAR(100),
ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(120);

-- Add index for better performance when filtering by secretary
CREATE INDEX IF NOT EXISTS idx_reservations_created_by_secretary ON reservations(created_by_secretary);

-- Add comment to explain the columns
COMMENT ON COLUMN reservations.created_by_secretary IS 'Full name of the secretary who created this reservation';
COMMENT ON COLUMN reservations.created_by_email IS 'Email of the secretary who created this reservation';

-- Update existing reservations to show which user created them (optional)
-- This will set the secretary name from the users table for existing records
UPDATE reservations r
SET 
    created_by_secretary = u.full_name,
    created_by_email = u.email
FROM users u
WHERE r.created_by = u.id 
AND r.created_by_secretary IS NULL;
