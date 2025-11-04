-- Add sample secretary data for testing account creation
-- These users can create accounts using the OTP system

-- Insert sample secretaries (without username/password yet)
INSERT INTO secretary_accounts (
    full_name,
    email,
    password_hash,
    status,
    email_verified,
    role,
    department,
    position,
    registration_method
) VALUES
(
    'ROTCHER A. CADORNA JR.',
    'rotchercadorna16@gmail.com',
    'placeholder_hash',  -- Will be updated when user creates account
    'active',
    false,  -- Not verified yet
    'secretary',
    'Church Administration',
    'Church Secretary',
    'admin_created'
),
(
    'MARIA SANTOS',
    'maria.santos@gmail.com',
    'placeholder_hash',
    'active',
    false,
    'secretary',
    'Church Administration',
    'Assistant Secretary',
    'admin_created'
),
(
    'ANA REYES',
    'ana.reyes@gmail.com',
    'placeholder_hash',
    'active',
    false,
    'secretary',
    'Church Administration',
    'Secretary Staff',
    'admin_created'
)
ON CONFLICT (email) DO NOTHING;

-- Verify data
SELECT full_name, email, role, status, email_verified 
FROM secretary_accounts 
WHERE email_verified = false;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Sample secretary data added!';
    RAISE NOTICE '📋 Users can now create accounts with these names:';
    RAISE NOTICE '   1. ROTCHER A. CADORNA JR. (rotchercadorna16@gmail.com)';
    RAISE NOTICE '   2. MARIA SANTOS (maria.santos@gmail.com)';
    RAISE NOTICE '   3. ANA REYES (ana.reyes@gmail.com)';
END $$;
