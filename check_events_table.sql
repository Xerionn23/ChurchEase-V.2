-- Check existing events table structure
-- Run this to see what columns exist in the current events table

-- Check if events table exists and show its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;

-- Alternative: Show table structure using PostgreSQL specific command
-- \d events

-- Check existing data in events table (if it exists)
-- SELECT * FROM events LIMIT 5;
