-- ============================================
-- INSERT SAMPLE STAFF DATA
-- For testing account creation
-- ============================================

-- ============================================
-- 1. INSERT SECRETARIES
-- ============================================
-- Note: full_name must be in UPPERCASE to match the search
INSERT INTO secretaries (full_name, email, phone, department, position, status) VALUES
('ROTCHER A. CADORNA JR.', 'rotchercadorna16@gmail.com', '0917-123-4567', 'Church Administration', 'Church Secretary', 'active'),
('MARIA SANTOS', 'maria.santos@gmail.com', '0918-234-5678', 'Church Administration', 'Assistant Secretary', 'active'),
('ANA REYES', 'ana.reyes@gmail.com', '0919-345-6789', 'Church Administration', 'Secretary Staff', 'active'),
('CYRIL ARBATIN', 'cyril.arbatin@gmail.com', '0920-456-7890', 'Church Administration', 'Senior Secretary', 'active'),
('HANA UMALI', 'hana.umali@gmail.com', '0921-567-8901', 'Church Administration', 'Secretary', 'active')
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    department = EXCLUDED.department,
    position = EXCLUDED.position,
    status = EXCLUDED.status;

-- ============================================
-- 2. INSERT ADMINS
-- ============================================
-- Note: full_name must be in UPPERCASE to match the search
INSERT INTO admins (full_name, email, phone, department, position, admin_level, status) VALUES
('JUAN DELA CRUZ', 'juan.delacruz@gmail.com', '0917-111-2222', 'Church Management', 'System Administrator', 'super', 'active'),
('PEDRO GARCIA', 'pedro.garcia@gmail.com', '0918-222-3333', 'Church Management', 'Administrator', 'standard', 'active')
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    department = EXCLUDED.department,
    position = EXCLUDED.position,
    admin_level = EXCLUDED.admin_level,
    status = EXCLUDED.status;

-- ============================================
-- 3. VERIFY DATA
-- ============================================
-- Check secretaries
SELECT 'SECRETARIES' as table_name, full_name, email, username, status 
FROM secretaries 
ORDER BY full_name;

-- Check admins
SELECT 'ADMINS' as table_name, full_name, email, username, status 
FROM admins 
ORDER BY full_name;

-- Check priests
SELECT 'PRIESTS' as table_name, 
       CONCAT(first_name, ' ', last_name) as full_name, 
       email, 
       username, 
       status 
FROM priests 
ORDER BY first_name;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Sample staff data inserted!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 SECRETARIES (5 records):';
    RAISE NOTICE '   1. ROTCHER A. CADORNA JR. - rotchercadorna16@gmail.com';
    RAISE NOTICE '   2. MARIA SANTOS - maria.santos@gmail.com';
    RAISE NOTICE '   3. ANA REYES - ana.reyes@gmail.com';
    RAISE NOTICE '   4. CYRIL ARBATIN - cyril.arbatin@gmail.com';
    RAISE NOTICE '   5. HANA UMALI - hana.umali@gmail.com';
    RAISE NOTICE '';
    RAISE NOTICE '📋 ADMINS (2 records):';
    RAISE NOTICE '   1. JUAN DELA CRUZ - juan.delacruz@gmail.com';
    RAISE NOTICE '   2. PEDRO GARCIA - pedro.garcia@gmail.com';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Ready to test account creation!';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 IMPORTANT: Make sure full_name is in UPPERCASE!';
    RAISE NOTICE '   Example: "ROTCHER A. CADORNA JR." not "Rotcher A. Cadorna Jr."';
END $$;
