# 📋 Secretary Accounts Table Documentation

## 🎯 Overview
Complete database table for storing secretary accounts created through the OTP email registration system.

## 📊 Table Structure: `secretary_accounts`

### Primary Information
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `username` | VARCHAR(100) | Unique username for login |
| `full_name` | VARCHAR(255) | Full name in UPPERCASE |
| `email` | VARCHAR(255) | Verified Gmail address (unique) |
| `password_hash` | TEXT | Hashed password (Werkzeug) |

### Account Status
| Column | Type | Description |
|--------|------|-------------|
| `status` | VARCHAR(20) | active, inactive, suspended |
| `email_verified` | BOOLEAN | Email verification status |
| `role` | VARCHAR(50) | secretary, admin, staff |
| `department` | VARCHAR(100) | Department name |
| `position` | VARCHAR(100) | Job position |

### Registration Details
| Column | Type | Description |
|--------|------|-------------|
| `registration_method` | VARCHAR(50) | otp_email, admin_created, manual |
| `registration_ip` | VARCHAR(50) | IP address during registration |
| `verification_code` | VARCHAR(10) | OTP code for verification |
| `verification_code_expires_at` | TIMESTAMP | OTP expiration time |

### Login Tracking
| Column | Type | Description |
|--------|------|-------------|
| `last_login` | TIMESTAMP | Last successful login time |
| `login_count` | INTEGER | Total successful logins |
| `failed_login_attempts` | INTEGER | Consecutive failed attempts |
| `last_failed_login` | TIMESTAMP | Last failed login time |

### Account Security
| Column | Type | Description |
|--------|------|-------------|
| `password_changed_at` | TIMESTAMP | Last password change |
| `password_reset_token` | VARCHAR(255) | Reset token for forgot password |
| `password_reset_expires_at` | TIMESTAMP | Reset token expiration |
| `two_factor_enabled` | BOOLEAN | 2FA enabled status |
| `two_factor_secret` | VARCHAR(255) | 2FA secret key |

### Contact Information
| Column | Type | Description |
|--------|------|-------------|
| `phone_number` | VARCHAR(20) | Contact phone number |
| `address` | TEXT | Physical address |

### Profile Information
| Column | Type | Description |
|--------|------|-------------|
| `profile_picture_url` | TEXT | Profile picture URL |
| `bio` | TEXT | Biography/description |
| `date_of_birth` | DATE | Birth date |
| `gender` | VARCHAR(20) | Gender |

### Permissions
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `can_create_reservations` | BOOLEAN | true | Can create new reservations |
| `can_edit_reservations` | BOOLEAN | true | Can edit reservations |
| `can_delete_reservations` | BOOLEAN | false | Can delete reservations |
| `can_approve_reservations` | BOOLEAN | true | Can approve reservations |
| `can_manage_events` | BOOLEAN | true | Can manage events |
| `can_view_reports` | BOOLEAN | true | Can view reports |
| `can_manage_payments` | BOOLEAN | true | Can manage payments |

### Timestamps
| Column | Type | Description |
|--------|------|-------------|
| `created_at` | TIMESTAMP | Account creation time |
| `updated_at` | TIMESTAMP | Last update time |
| `deleted_at` | TIMESTAMP | Soft delete timestamp |

### Audit Fields
| Column | Type | Description |
|--------|------|-------------|
| `created_by` | UUID | User who created this account |
| `updated_by` | UUID | User who last updated |
| `notes` | TEXT | Admin notes |

## 🔍 Indexes Created

1. **idx_secretary_accounts_username** - Fast username lookup
2. **idx_secretary_accounts_email** - Fast email lookup
3. **idx_secretary_accounts_status** - Filter by status
4. **idx_secretary_accounts_role** - Filter by role
5. **idx_secretary_accounts_created_at** - Sort by creation date
6. **idx_secretary_accounts_last_login** - Sort by last login

## 🔐 Security Features

### Row Level Security (RLS)
- ✅ Enabled on table
- ✅ Users can read their own data
- ✅ Users can update their own data
- ✅ Admins can read all accounts
- ✅ Admins can update all accounts
- ✅ Admins can delete accounts

### RLS Policies:
1. `secretary_accounts_select_own` - Users read own data
2. `secretary_accounts_update_own` - Users update own data
3. `secretary_accounts_select_admin` - Admins read all
4. `secretary_accounts_update_admin` - Admins update all
5. `secretary_accounts_delete_admin` - Admins delete accounts

## 📊 Views Created

### 1. `active_secretaries`
Shows all active secretary accounts with key information:
```sql
SELECT * FROM active_secretaries;
```

**Columns:**
- id, username, full_name, email
- phone_number, department, position
- last_login, login_count, created_at
- All permission flags

### 2. `secretary_login_history`
Shows login history for all secretaries:
```sql
SELECT * FROM secretary_login_history;
```

**Columns:**
- id, username, full_name, email
- last_login, login_count
- failed_login_attempts, last_failed_login
- created_at

## 🔄 Triggers

### `trigger_update_secretary_accounts_updated_at`
Automatically updates `updated_at` timestamp on any UPDATE operation.

## 📝 Sample Data

Two sample secretary accounts are inserted:

### 1. Cyril Arbatin
```sql
username: cyril.arbatin
full_name: CYRIL ARBATIN
email: cyril.arbatin@gmail.com
role: secretary
department: Church Administration
position: Church Secretary
```

### 2. Hana Umali
```sql
username: hana.umali
full_name: HANA UMALI
email: hana.umali@gmail.com
role: secretary
department: Church Administration
position: Assistant Secretary
```

## 🚀 Usage Examples

### Insert New Secretary (via OTP Registration)
```sql
INSERT INTO secretary_accounts (
    username, 
    full_name, 
    email, 
    password_hash,
    registration_method,
    email_verified
) VALUES (
    'rotcher.cadorna',
    'ROTCHER A. CADORNA JR.',
    'rotcher@gmail.com',
    'hashed_password_here',
    'otp_email',
    true
);
```

### Get All Active Secretaries
```sql
SELECT * FROM active_secretaries;
```

### Get Secretary by Username
```sql
SELECT * FROM secretary_accounts 
WHERE username = 'cyril.arbatin' 
AND status = 'active';
```

### Update Last Login
```sql
UPDATE secretary_accounts 
SET 
    last_login = CURRENT_TIMESTAMP,
    login_count = login_count + 1,
    failed_login_attempts = 0
WHERE username = 'cyril.arbatin';
```

### Track Failed Login
```sql
UPDATE secretary_accounts 
SET 
    failed_login_attempts = failed_login_attempts + 1,
    last_failed_login = CURRENT_TIMESTAMP
WHERE username = 'cyril.arbatin';
```

### Suspend Account
```sql
UPDATE secretary_accounts 
SET status = 'suspended'
WHERE username = 'cyril.arbatin';
```

### Soft Delete Account
```sql
UPDATE secretary_accounts 
SET deleted_at = CURRENT_TIMESTAMP
WHERE username = 'cyril.arbatin';
```

### Check Permissions
```sql
SELECT 
    username,
    full_name,
    can_create_reservations,
    can_edit_reservations,
    can_approve_reservations,
    can_manage_events
FROM secretary_accounts
WHERE username = 'cyril.arbatin';
```

## 🔗 Integration with OTP System

### When User Registers via OTP:
```python
# After OTP verification in app.py
user_data = {
    'username': username,
    'full_name': full_name,  # UPPERCASE
    'email': email,  # Verified via OTP
    'password_hash': generate_password_hash(password),
    'registration_method': 'otp_email',
    'email_verified': True,
    'status': 'active',
    'role': 'secretary'
}

# Insert into secretary_accounts table
result = supabase.table('secretary_accounts').insert(user_data).execute()
```

### When User Logs In:
```python
# Update login tracking
supabase.table('secretary_accounts').update({
    'last_login': datetime.utcnow().isoformat(),
    'login_count': user['login_count'] + 1,
    'failed_login_attempts': 0
}).eq('username', username).execute()
```

### When Login Fails:
```python
# Track failed attempt
supabase.table('secretary_accounts').update({
    'failed_login_attempts': user['failed_login_attempts'] + 1,
    'last_failed_login': datetime.utcnow().isoformat()
}).eq('username', username).execute()
```

## 📈 Reporting Queries

### Total Active Secretaries
```sql
SELECT COUNT(*) as total_active
FROM secretary_accounts
WHERE status = 'active' AND deleted_at IS NULL;
```

### Recently Registered Secretaries
```sql
SELECT username, full_name, email, created_at
FROM secretary_accounts
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

### Most Active Secretaries
```sql
SELECT username, full_name, login_count, last_login
FROM secretary_accounts
WHERE status = 'active'
ORDER BY login_count DESC
LIMIT 10;
```

### Secretaries with Failed Logins
```sql
SELECT username, full_name, failed_login_attempts, last_failed_login
FROM secretary_accounts
WHERE failed_login_attempts > 0
ORDER BY failed_login_attempts DESC;
```

### Secretaries by Registration Method
```sql
SELECT 
    registration_method,
    COUNT(*) as count
FROM secretary_accounts
GROUP BY registration_method;
```

## 🛠️ Maintenance

### Clean Up Expired OTP Codes
```sql
UPDATE secretary_accounts
SET 
    verification_code = NULL,
    verification_code_expires_at = NULL
WHERE verification_code_expires_at < CURRENT_TIMESTAMP;
```

### Reset Failed Login Attempts
```sql
UPDATE secretary_accounts
SET failed_login_attempts = 0
WHERE failed_login_attempts > 0 
AND last_failed_login < NOW() - INTERVAL '24 hours';
```

### Archive Inactive Accounts
```sql
UPDATE secretary_accounts
SET status = 'inactive'
WHERE last_login < NOW() - INTERVAL '90 days'
AND status = 'active';
```

## 📋 Installation

Run the SQL script in Supabase:

```bash
# In Supabase SQL Editor
# Copy and paste: create_secretary_accounts_table.sql
# Click "Run"
```

Or via command line:
```bash
psql -h your-supabase-host -U postgres -d postgres -f create_secretary_accounts_table.sql
```

## ✅ Verification

After running the script, verify:

```sql
-- Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'secretary_accounts';

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'secretary_accounts';

-- Check views
SELECT table_name 
FROM information_schema.views 
WHERE table_name IN ('active_secretaries', 'secretary_login_history');

-- Check sample data
SELECT username, full_name, email, status 
FROM secretary_accounts;
```

## 🎉 Benefits

✅ **Complete User Management** - All secretary data in one table
✅ **Security Tracking** - Login attempts, last login, etc.
✅ **Permission Control** - Granular permission settings
✅ **Audit Trail** - Created by, updated by tracking
✅ **Soft Deletes** - Never lose data
✅ **Performance** - Optimized with indexes
✅ **RLS Security** - Row-level security enabled
✅ **Easy Reporting** - Pre-built views for common queries

---

**ChurchEase V.2** - Secretary Accounts Management
© 2025 All Rights Reserved
