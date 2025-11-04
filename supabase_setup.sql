-- ChurchEase Database Schema for Supabase
-- Run these SQL commands in your Supabase SQL Editor

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'secretary',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(120),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id VARCHAR(20) UNIQUE NOT NULL,
    service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('wedding', 'baptism', 'funeral', 'confirmation')),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    location VARCHAR(100) NOT NULL,
    attendees INTEGER,
    special_requests TEXT,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'waiting_priest_approval', 'approved', 'completed', 'cancelled', 'declined')),
    priest_id UUID REFERENCES priests(id) ON DELETE SET NULL,
    priest_response TEXT,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Priests table
CREATE TABLE IF NOT EXISTS priests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    specialization TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('worship', 'prayer', 'bible_study', 'youth', 'outreach', 'fellowship', 'special', 'meeting', 'other')),
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    location VARCHAR(255),
    organizer VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reservations_service_type ON reservations(service_type);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_client_id ON reservations(client_id);
CREATE INDEX IF NOT EXISTS idx_reservations_priest_id ON reservations(priest_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_priests_email ON priests(email);
CREATE INDEX IF NOT EXISTS idx_priests_status ON priests(status);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

-- Disable Row Level Security temporarily for initial setup
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Note: RLS is disabled to allow Flask app to create admin user
-- You can enable RLS later after initial setup if needed

-- RLS policies commented out for initial setup
-- Uncomment these after admin user is created if you want to enable RLS

-- CREATE POLICY "Authenticated users can view clients" ON clients
--     FOR SELECT USING (auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can insert clients" ON clients
--     FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can update clients" ON clients
--     FOR UPDATE USING (auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can view reservations" ON reservations
--     FOR SELECT USING (auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can insert reservations" ON reservations
--     FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can update reservations" ON reservations
--     FOR UPDATE USING (auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can delete reservations" ON reservations
--     FOR DELETE USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for reservations updated_at
CREATE TRIGGER update_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for events updated_at
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
-- You can uncomment these if you want some test data

-- Note: Password hashes removed - let Flask app create admin user and secretary users automatically
-- INSERT INTO users (username, email, password_hash, role) VALUES
-- ('admin', 'admin@churchease.com', 'password_hash_here', 'admin'),
-- ('cyril.arbatin', 'cyril.arbatin@churchease.com', 'password_hash_here', 'secretary'),
-- ('hana.umali', 'hana.umali@churchease.com', 'password_hash_here', 'secretary');

-- Sample priest
INSERT INTO priests (id, first_name, last_name, email, phone, specialization) VALUES
('11111111-1111-1111-1111-111111111111', 'Carlos D.', 'Cruz', 'fr.carlos@churchease.com', '0917-111-2222', 'Parish priest');

-- Sample clients
INSERT INTO clients (first_name, last_name, phone, email, address) VALUES
('Juan', 'Dela Cruz', '0917-123-4567', 'juan@email.com', '123 Main St, Manila'),
('Maria', 'Santos', '0918-234-5678', 'maria@email.com', '456 Oak Ave, Quezon City'),
('Pedro', 'Garcia', '0919-345-6789', 'pedro@email.com', '789 Pine Rd, Makati');

-- Sample reservations (commented out since admin user will be created by Flask app)
-- INSERT INTO reservations (reservation_id, service_type, reservation_date, reservation_time, location, attendees, status, client_id, created_by) VALUES
-- ('R001ABCD', 'wedding', '2025-03-15', '14:00', 'Main Church', 150, 'pending', 
--  (SELECT id FROM clients WHERE first_name = 'Juan' LIMIT 1),
--  (SELECT id FROM users WHERE username = 'admin' LIMIT 1)),
-- ('R002EFGH', 'baptism', '2025-03-20', '10:00', 'Chapel', 50, 'approved',
--  (SELECT id FROM clients WHERE first_name = 'Maria' LIMIT 1),
--  (SELECT id FROM users WHERE username = 'admin' LIMIT 1));

