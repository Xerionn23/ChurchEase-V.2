-- ============================================
-- STAFF TABLES FOR ACCOUNT CREATION
-- Separate tables for PRIEST, ADMIN, SECRETARY
-- ============================================

-- ============================================
-- 1. SECRETARY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS secretaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    department VARCHAR(100) DEFAULT 'Church Administration',
    position VARCHAR(100) DEFAULT 'Secretary',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    
    -- Account credentials (NULL until account is created)
    username VARCHAR(100) UNIQUE,
    password_hash TEXT,
    email_verified BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Notes
    notes TEXT
);

-- ============================================
-- 2. ADMIN TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    department VARCHAR(100) DEFAULT 'Church Management',
    position VARCHAR(100) DEFAULT 'Administrator',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    
    -- Account credentials (NULL until account is created)
    username VARCHAR(100) UNIQUE,
    password_hash TEXT,
    email_verified BOOLEAN DEFAULT false,
    
    -- Admin level
    admin_level VARCHAR(20) DEFAULT 'standard' CHECK (admin_level IN ('super', 'standard', 'limited')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Notes
    notes TEXT
);

-- ============================================
-- 3. PRIEST TABLE (Updated)
-- ============================================
CREATE TABLE IF NOT EXISTS priest (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    title VARCHAR(50) DEFAULT 'Father',
    specialization TEXT DEFAULT 'All church services',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    
    -- Account credentials (NULL until account is created)
    username VARCHAR(100) UNIQUE,
    password_hash TEXT,
    email_verified BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Notes
    notes TEXT
);

-- ============================================
-- CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_secretaries_full_name ON secretaries(full_name);
CREATE INDEX IF NOT EXISTS idx_secretaries_email ON secretaries(email);
CREATE INDEX IF NOT EXISTS idx_secretaries_username ON secretaries(username);
CREATE INDEX IF NOT EXISTS idx_secretaries_status ON secretaries(status);

CREATE INDEX IF NOT EXISTS idx_admins_full_name ON admins(full_name);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);

CREATE INDEX IF NOT EXISTS idx_priest_full_name ON priest(full_name);
CREATE INDEX IF NOT EXISTS idx_priest_email ON priest(email);
CREATE INDEX IF NOT EXISTS idx_priest_username ON priest(username);
CREATE INDEX IF NOT EXISTS idx_priest_status ON priest(status);

-- ============================================
-- CREATE TRIGGERS FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_secretaries_updated_at
    BEFORE UPDATE ON secretaries
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_updated_at();

CREATE TRIGGER trigger_update_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_updated_at();

CREATE TRIGGER trigger_update_priest_updated_at
    BEFORE UPDATE ON priest
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_updated_at();

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Sample Secretaries (without username/password - will create via OTP)
INSERT INTO secretaries (full_name, email, phone, department, position, status) VALUES
('ROTCHER A. CADORNA JR.', 'rotchercadorna16@gmail.com', '0917-123-4567', 'Church Administration', 'Church Secretary', 'active'),
('MARIA SANTOS', 'maria.santos@gmail.com', '0918-234-5678', 'Church Administration', 'Assistant Secretary', 'active'),
('ANA REYES', 'ana.reyes@gmail.com', '0919-345-6789', 'Church Administration', 'Secretary Staff', 'active'),
('CYRIL ARBATIN', 'cyril.arbatin@gmail.com', '0920-456-7890', 'Church Administration', 'Senior Secretary', 'active'),
('HANA UMALI', 'hana.umali@gmail.com', '0921-567-8901', 'Church Administration', 'Secretary', 'active')
ON CONFLICT (email) DO NOTHING;

-- Sample Admins (without username/password - will create via OTP)
INSERT INTO admins (full_name, email, phone, department, position, admin_level, status) VALUES
('JUAN DELA CRUZ', 'juan.delacruz@gmail.com', '0917-111-2222', 'Church Management', 'System Administrator', 'super', 'active'),
('PEDRO GARCIA', 'pedro.garcia@gmail.com', '0918-222-3333', 'Church Management', 'Administrator', 'standard', 'active')
ON CONFLICT (email) DO NOTHING;

-- Sample Priests (without username/password - will create via OTP)
-- Note: Church has only ONE priest - Father Antonio Rodriguez
INSERT INTO priest (full_name, email, phone, title, specialization, status) VALUES
('ANTONIO RODRIGUEZ', 'antonio.rodriguez@gmail.com', '0917-333-4444', 'Father', 'All church services', 'active')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- CREATE VIEWS FOR EASY QUERYING
-- ============================================

-- View: All staff members
CREATE OR REPLACE VIEW all_staff AS
SELECT 
    'secretary' as role,
    id,
    full_name,
    email,
    phone,
    username,
    email_verified,
    status,
    created_at
FROM secretaries
UNION ALL
SELECT 
    'admin' as role,
    id,
    full_name,
    email,
    phone,
    username,
    email_verified,
    status,
    created_at
FROM admins
UNION ALL
SELECT 
    'priest' as role,
    id,
    full_name,
    email,
    phone,
    username,
    email_verified,
    status,
    created_at
FROM priest
ORDER BY full_name;

-- View: Staff without accounts (can create accounts)
CREATE OR REPLACE VIEW staff_without_accounts AS
SELECT 
    'secretary' as role,
    id,
    full_name,
    email,
    phone,
    status
FROM secretaries
WHERE username IS NULL AND status = 'active'
UNION ALL
SELECT 
    'admin' as role,
    id,
    full_name,
    email,
    phone,
    status
FROM admins
WHERE username IS NULL AND status = 'active'
UNION ALL
SELECT 
    'priest' as role,
    id,
    full_name,
    email,
    phone,
    status
FROM priest
WHERE username IS NULL AND status = 'active'
ORDER BY full_name;

-- View: Staff with accounts (already registered)
CREATE OR REPLACE VIEW staff_with_accounts AS
SELECT 
    'secretary' as role,
    id,
    full_name,
    email,
    username,
    email_verified,
    status,
    created_at
FROM secretaries
WHERE username IS NOT NULL
UNION ALL
SELECT 
    'admin' as role,
    id,
    full_name,
    email,
    username,
    email_verified,
    status,
    created_at
FROM admins
WHERE username IS NOT NULL
UNION ALL
SELECT 
    'priest' as role,
    id,
    full_name,
    email,
    username,
    email_verified,
    status,
    created_at
FROM priest
WHERE username IS NOT NULL
ORDER BY full_name;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE ON secretaries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON admins TO authenticated;
GRANT SELECT, INSERT, UPDATE ON priest TO authenticated;
GRANT SELECT ON all_staff TO authenticated;
GRANT SELECT ON staff_without_accounts TO authenticated;
GRANT SELECT ON staff_with_accounts TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Staff tables created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Tables Created:';
    RAISE NOTICE '   1. secretaries - Church secretaries';
    RAISE NOTICE '   2. admins - System administrators';
    RAISE NOTICE '   3. priest - Church priest';
    RAISE NOTICE '';
    RAISE NOTICE '👥 Sample Data Inserted:';
    RAISE NOTICE '   Secretaries: 5 records';
    RAISE NOTICE '   Admins: 2 records';
    RAISE NOTICE '   Priest: 1 record (Father Antonio Rodriguez)';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Views Created:';
    RAISE NOTICE '   - all_staff (all staff members)';
    RAISE NOTICE '   - staff_without_accounts (can create accounts)';
    RAISE NOTICE '   - staff_with_accounts (already registered)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Ready for account creation!';
END $$;
