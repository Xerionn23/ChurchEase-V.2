-- Insert Sample Events Data
-- Run this AFTER creating the events table

-- Insert sample events with assigned priests (assuming priest IDs 1-4 exist)
INSERT INTO events (event_name, event_type, description, event_date, start_time, end_time, assigned_priest, status) VALUES
('Sunday Morning Service', 'worship', 'Regular Sunday worship service for the congregation', '2024-10-06', '09:00:00', '11:00:00', '1', 'confirmed'),
('Youth Fellowship Meeting', 'youth', 'Monthly youth fellowship and bible study session', '2024-10-08', '18:00:00', '20:00:00', '2', 'pending'),
('Community Outreach Program', 'community', 'Community service and outreach to local families', '2024-10-12', '14:00:00', '17:00:00', '1', 'confirmed'),
('Christmas Celebration', 'special', 'Annual Christmas celebration and mass', '2024-12-25', '19:00:00', '22:00:00', '3', 'confirmed'),
('Food Distribution Drive', 'outreach', 'Monthly food distribution for needy families', '2024-10-15', '10:00:00', '15:00:00', '1', 'pending'),
('Bible Study Session', 'worship', 'Weekly bible study and prayer meeting', '2024-10-09', '19:00:00', '21:00:00', '2', 'confirmed'),
('Youth Sports Tournament', 'youth', 'Annual youth sports competition and fellowship', '2024-10-20', '08:00:00', '17:00:00', '4', 'confirmed'),
('Senior Citizens Gathering', 'community', 'Monthly gathering for senior church members', '2024-10-18', '15:00:00', '17:00:00', '3', 'pending'),
('Charity Fundraising Event', 'outreach', 'Fundraising event for church charity programs', '2024-11-05', '16:00:00', '20:00:00', '2', 'confirmed'),
('All Saints Day Service', 'special', 'Special service for All Saints Day celebration', '2024-11-01', '18:00:00', '20:00:00', '1', 'confirmed');
