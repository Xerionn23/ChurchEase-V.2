-- Update Event Titles and Descriptions
-- This script adds proper titles and descriptions to events that have empty values

-- Update events with empty titles based on their type
-- Note: Using event_name column (not title)
UPDATE events
SET event_name = CASE type
    WHEN 'worship' THEN 'Sunday Worship Service'
    WHEN 'prayer' THEN 'Prayer Meeting'
    WHEN 'bible_study' THEN 'Bible Study Session'
    WHEN 'youth' THEN 'Youth Fellowship'
    WHEN 'outreach' THEN 'Community Outreach'
    WHEN 'fellowship' THEN 'Church Fellowship'
    WHEN 'special' THEN 'Special Church Event'
    WHEN 'meeting' THEN 'Church Meeting'
    ELSE 'Church Event'
END
WHERE event_name IS NULL OR event_name = '' OR event_name = 'Untitled Event';

-- Update events with empty descriptions
UPDATE events
SET description = CASE type
    WHEN 'worship' THEN 'Regular Sunday worship service with prayer, praise, and preaching.'
    WHEN 'prayer' THEN 'Midweek prayer meeting for fellowship and intercession.'
    WHEN 'bible_study' THEN 'In-depth study of God''s Word with discussion and fellowship.'
    WHEN 'youth' THEN 'Youth group gathering for worship, games, and spiritual growth.'
    WHEN 'outreach' THEN 'Community outreach program to serve and share the Gospel.'
    WHEN 'fellowship' THEN 'Church fellowship gathering for food, fun, and community building.'
    WHEN 'special' THEN 'Special church event - details to be announced.'
    WHEN 'meeting' THEN 'Church leadership or ministry meeting.'
    ELSE 'Church event - please contact the office for more details.'
END
WHERE description IS NULL OR description = '';

-- Verify the updates
SELECT 
    id,
    event_name,
    type,
    description,
    event_date,
    start_time
FROM events
ORDER BY event_date DESC;
