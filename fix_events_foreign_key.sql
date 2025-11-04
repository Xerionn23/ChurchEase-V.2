-- Fix Events Table Foreign Key Relationship
-- This adds the proper foreign key constraint between events.created_by and users.id

-- First, check if there are any orphaned records (events with created_by that don't exist in users)
-- and set them to NULL or a default user
UPDATE events 
SET created_by = NULL 
WHERE created_by IS NOT NULL 
AND created_by NOT IN (SELECT id FROM users);

-- Drop the foreign key constraint if it exists (with wrong name)
ALTER TABLE events 
DROP CONSTRAINT IF EXISTS events_created_by_fkey;

-- Add the foreign key constraint with explicit name
ALTER TABLE events
ADD CONSTRAINT events_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES users(id) 
ON DELETE SET NULL;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

-- Verify the constraint was created
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
AND tc.table_name='events';
