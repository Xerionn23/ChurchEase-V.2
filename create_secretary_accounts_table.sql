-- ============================================
-- SECRETARY ACCOUNTS TABLE
-- For storing secretary users created via OTP registration
-- ============================================

-- Drop existing table if needed (be careful in production!)
-- DROP TABLE IF EXISTS secretary_accounts CASCADE;

-- Create secretary_accounts table
CREATE TABLE IF NOT EXISTS secretary_accounts (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Account Information
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    
    -- Account Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    email_verified BOOLEAN DEFAULT true,
    
    -- Role Information
    role VARCHAR(50) DEFAULT 'secretary' CHECK (role IN ('secretary', 'admin', 'staff')),
    department VARCHAR(100),
    position VARCHAR(100),
    
    -- Contact Information
    phone_number VARCHAR(20),
    address TEXT,
    
    -- Registration Details
    registration_method VARCHAR(50) DEFAULT 'otp_email' CHECK (registration_method IN ('otp_email', 'admin_created', 'manual')),
    registration_ip VARCHAR(50),
    verification_code VARCHAR(10),
    verification_code_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Login Tracking
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login TIMESTAMP WITH TIME ZONE,
    
    -- Account Security
    password_changed_at TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    
    -- Profile Information
    profile_picture_url TEXT,
    bio TEXT,
    date_of_birth DATE,
    gender VARCHAR(20),
    
    -- Permissions
    can_create_reservations BOOLEAN DEFAULT true,
    can_edit_reservations BOOLEAN DEFAULT true,
    can_delete_reservations BOOLEAN DEFAULT false,
    can_approve_reservations BOOLEAN DEFAULT true,
    can_manage_events BOOLEAN DEFAULT true,
    can_view_reports BOOLEAN DEFAULT true,
    can_manage_payments BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit Fields
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Notes
    notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_secretary_accounts_username ON secretary_accounts(username);
CREATE INDEX IF NOT EXISTS idx_secretary_accounts_email ON secretary_accounts(email);
CREATE INDEX IF NOT EXISTS idx_secretary_accounts_status ON secretary_accounts(status);
CREATE INDEX IF NOT EXISTS idx_secretary_accounts_role ON secretary_accounts(role);
CREATE INDEX IF NOT EXISTS idx_secretary_accounts_created_at ON secretary_accounts(created_at);
CREATE INDEX IF NOT EXISTS idx_secretary_accounts_last_login ON secretary_accounts(last_login);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_secretary_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_secretary_accounts_updated_at
    BEFORE UPDATE ON secretary_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_secretary_accounts_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE secretary_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to read their own data
CREATE POLICY secretary_accounts_select_own 
    ON secretary_accounts 
    FOR SELECT 
    USING (auth.uid() = id);

-- Allow authenticated users to update their own data
CREATE POLICY secretary_accounts_update_own 
    ON secretary_accounts 
    FOR UPDATE 
    USING (auth.uid() = id);

-- Allow admins to read all secretary accounts
CREATE POLICY secretary_accounts_select_admin 
    ON secretary_accounts 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Allow admins to update all secretary accounts
CREATE POLICY secretary_accounts_update_admin 
    ON secretary_accounts 
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Allow admins to delete secretary accounts
CREATE POLICY secretary_accounts_delete_admin 
    ON secretary_accounts 
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Insert sample secretary accounts (created via OTP registration)
INSERT INTO secretary_accounts (
    username, 
    full_name, 
    email, 
    password_hash, 
    status, 
    email_verified,
    role,
    department,
    position,
    registration_method,
    can_create_reservations,
    can_edit_reservations,
    can_delete_reservations,
    can_approve_reservations,
    can_manage_events,
    can_view_reports,
    can_manage_payments
) VALUES
(
    'cyril.arbatin',
    'CYRIL ARBATIN',
    'cyril.arbatin@gmail.com',
    'scrypt:32768:8:1$placeholder_hash',
    'active',
    true,
    'secretary',
    'Church Administration',
    'Church Secretary',
    'otp_email',
    true,
    true,
    false,
    true,
    true,
    true,
    true
),
(
    'hana.umali',
    'HANA UMALI',
    'hana.umali@gmail.com',
    'scrypt:32768:8:1$placeholder_hash',
    'active',
    true,
    'secretary',
    'Church Administration',
    'Assistant Secretary',
    'otp_email',
    true,
    true,
    false,
    true,
    true,
    true,
    true
)
ON CONFLICT (username) DO NOTHING;

-- Create view for active secretaries
CREATE OR REPLACE VIEW active_secretaries AS
SELECT 
    id,
    username,
    full_name,
    email,
    phone_number,
    department,
    position,
    last_login,
    login_count,
    created_at,
    can_create_reservations,
    can_edit_reservations,
    can_approve_reservations,
    can_manage_events,
    can_view_reports,
    can_manage_payments
FROM secretary_accounts
WHERE status = 'active' AND deleted_at IS NULL
ORDER BY full_name;

-- Create view for secretary login history
CREATE OR REPLACE VIEW secretary_login_history AS
SELECT 
    id,
    username,
    full_name,
    email,
    last_login,
    login_count,
    failed_login_attempts,
    last_failed_login,
    created_at
FROM secretary_accounts
WHERE deleted_at IS NULL
ORDER BY last_login DESC NULLS LAST;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON secretary_accounts TO authenticated;
GRANT SELECT ON active_secretaries TO authenticated;
GRANT SELECT ON secretary_login_history TO authenticated;

-- Comments for documentation
COMMENT ON TABLE secretary_accounts IS 'Stores secretary user accounts created via OTP email registration';
COMMENT ON COLUMN secretary_accounts.id IS 'Unique identifier for secretary account';
COMMENT ON COLUMN secretary_accounts.username IS 'Unique username for login';
COMMENT ON COLUMN secretary_accounts.full_name IS 'Full name in uppercase (e.g., ROTCHER A. CADORNA JR.)';
COMMENT ON COLUMN secretary_accounts.email IS 'Verified Gmail address';
COMMENT ON COLUMN secretary_accounts.password_hash IS 'Hashed password using Werkzeug';
COMMENT ON COLUMN secretary_accounts.status IS 'Account status: active, inactive, or suspended';
COMMENT ON COLUMN secretary_accounts.email_verified IS 'Whether email has been verified via OTP';
COMMENT ON COLUMN secretary_accounts.registration_method IS 'How the account was created: otp_email, admin_created, or manual';
COMMENT ON COLUMN secretary_accounts.login_count IS 'Total number of successful logins';
COMMENT ON COLUMN secretary_accounts.failed_login_attempts IS 'Number of consecutive failed login attempts';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Secretary accounts table created successfully!';
    RAISE NOTICE '📋 Table: secretary_accounts';
    RAISE NOTICE '🔍 Views: active_secretaries, secretary_login_history';
    RAISE NOTICE '🔐 RLS policies enabled';
    RAISE NOTICE '📊 Indexes created for performance';
    RAISE NOTICE '👥 Sample accounts inserted';
END $$;
