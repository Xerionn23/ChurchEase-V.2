-- Fix events table foreign key constraint
-- This script updates the existing events table to reference priests(id) instead of users(id)

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_assigned_priest_fkey;

-- Step 2: Add the new foreign key constraint referencing priests table
ALTER TABLE events ADD CONSTRAINT events_assigned_priest_fkey 
    FOREIGN KEY (assigned_priest) REFERENCES priests(id) ON DELETE SET NULL;

-- Verify the constraint was added
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='events'
    AND kcu.column_name='assigned_priest';
