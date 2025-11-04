-- Events Table Setup for ChurchEase V.2
-- This creates the events table and inserts sample data

-- Drop existing events table if it exists (to recreate with correct structure)
DROP TABLE IF EXISTS events CASCADE;

-- Create events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('worship', 'youth', 'community', 'outreach', 'special', 'meeting', 'other')),
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    location VARCHAR(255),
    organizer VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Insert sample events data
INSERT INTO events (event_name, event_type, description, event_date, start_time, end_time, location, organizer, status) VALUES
('Sunday Morning Service', 'worship', 'Regular Sunday worship service for the congregation', '2024-10-06', '09:00:00', '11:00:00', 'Main Church', 'Father Antonio Rodriguez', 'confirmed'),
('Youth Fellowship Meeting', 'youth', 'Monthly youth fellowship and bible study session', '2024-10-08', '18:00:00', '20:00:00', 'Parish Hall', 'Maria Santos', 'pending'),
('Community Outreach Program', 'community', 'Community service and outreach to local families', '2024-10-12', '14:00:00', '17:00:00', 'Community Center', 'Ana Reyes', 'confirmed'),
('Christmas Celebration', 'special', 'Annual Christmas celebration and mass', '2024-12-25', '19:00:00', '22:00:00', 'Main Church', 'Carmen Garcia', 'confirmed'),
('Food Distribution Drive', 'outreach', 'Monthly food distribution for needy families', '2024-10-15', '10:00:00', '15:00:00', 'Church Grounds', 'Father Antonio Rodriguez', 'pending'),
('Bible Study Session', 'worship', 'Weekly bible study and prayer meeting', '2024-10-09', '19:00:00', '21:00:00', 'Parish Hall', 'Father Antonio Rodriguez', 'confirmed'),
('Youth Sports Tournament', 'youth', 'Annual youth sports competition and fellowship', '2024-10-20', '08:00:00', '17:00:00', 'Church Grounds', 'Maria Santos', 'confirmed'),
('Senior Citizens Gathering', 'community', 'Monthly gathering for senior church members', '2024-10-18', '15:00:00', '17:00:00', 'Parish Hall', 'Ana Reyes', 'pending'),
('Charity Fundraising Event', 'outreach', 'Fundraising event for church charity programs', '2024-11-05', '16:00:00', '20:00:00', 'Main Church', 'Carmen Garcia', 'confirmed'),
('All Saints Day Service', 'special', 'Special service for All Saints Day celebration', '2024-11-01', '18:00:00', '20:00:00', 'Main Church', 'Father Antonio Rodriguez', 'confirmed');

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
