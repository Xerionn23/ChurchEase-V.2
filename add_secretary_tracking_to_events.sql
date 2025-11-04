-- Add Secretary Tracking Columns to Events Table
-- This will track which secretary created each event

-- Add columns to track secretary information
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS created_by_secretary VARCHAR(100),
ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(120);

-- Add index for better performance when filtering by secretary
CREATE INDEX IF NOT EXISTS idx_events_created_by_secretary ON events(created_by_secretary);

-- Add comment to explain the columns
COMMENT ON COLUMN events.created_by_secretary IS 'Full name of the secretary who created this event';
COMMENT ON COLUMN events.created_by_email IS 'Email of the secretary who created this event';

-- Update existing events to show which user created them (optional)
-- This will set the secretary name from the users table for existing records
UPDATE events e
SET 
    created_by_secretary = u.full_name,
    created_by_email = u.email
FROM users u
WHERE e.created_by = u.id 
AND e.created_by_secretary IS NULL;
