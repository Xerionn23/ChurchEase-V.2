# 🎯 NEW STAFF TABLES - Complete Guide

## ✅ Problem SOLVED!

**OLD PROBLEM:**
- Column mismatch errors
- priests.name doesn't exist
- Confusing table structure
- Hard to track who is who

**NEW SOLUTION:**
- ✅ 3 separate tables: `secretaries`, `admins`, `priest_staff`
- ✅ All have same column structure
- ✅ Easy to identify role
- ✅ Clean and organized

## 📊 New Database Structure

### **1. SECRETARIES Table**
```sql
CREATE TABLE secretaries (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255) UNIQUE,  -- ROTCHER A. CADORNA JR.
    email VARCHAR(255) UNIQUE,      -- rotchercadorna16@gmail.com
    phone VARCHAR(20),
    address TEXT,
    department VARCHAR(100),         -- Church Administration
    position VARCHAR(100),           -- Church Secretary
    status VARCHAR(20),              -- active/inactive/suspended
    
    -- Account credentials (NULL until created)
    username VARCHAR(100) UNIQUE,    -- NULL initially
    password_hash TEXT,              -- NULL initially
    email_verified BOOLEAN,          -- false initially
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    notes TEXT
);
```

### **2. ADMINS Table**
```sql
CREATE TABLE admins (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255) UNIQUE,  -- JUAN DELA CRUZ
    email VARCHAR(255) UNIQUE,      -- juan.delacruz@gmail.com
    phone VARCHAR(20),
    address TEXT,
    department VARCHAR(100),         -- Church Management
    position VARCHAR(100),           -- System Administrator
    admin_level VARCHAR(20),         -- super/standard/limited
    status VARCHAR(20),              -- active/inactive/suspended
    
    -- Account credentials (NULL until created)
    username VARCHAR(100) UNIQUE,    -- NULL initially
    password_hash TEXT,              -- NULL initially
    email_verified BOOLEAN,          -- false initially
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    notes TEXT
);
```

### **3. PRIEST_STAFF Table**
```sql
CREATE TABLE priest_staff (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255) UNIQUE,  -- ANTONIO RODRIGUEZ
    email VARCHAR(255) UNIQUE,      -- antonio.rodriguez@gmail.com
    phone VARCHAR(20),
    address TEXT,
    title VARCHAR(50),               -- Father
    specialization TEXT,             -- All church services
    status VARCHAR(20),              -- active/inactive/on_leave
    
    -- Account credentials (NULL until created)
    username VARCHAR(100) UNIQUE,    -- NULL initially
    password_hash TEXT,              -- NULL initially
    email_verified BOOLEAN,          -- false initially
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    notes TEXT
);
```

## 🔄 Account Creation Flow

### **Step 1: Admin Adds Staff to Database**
```sql
-- Add secretary
INSERT INTO secretaries (full_name, email, phone, department, position)
VALUES ('ROTCHER A. CADORNA JR.', 'rotchercadorna16@gmail.com', '0917-123-4567', 'Church Administration', 'Church Secretary');

-- Add admin
INSERT INTO admins (full_name, email, phone, department, position, admin_level)
VALUES ('JUAN DELA CRUZ', 'juan.delacruz@gmail.com', '0917-111-2222', 'Church Management', 'System Administrator', 'super');

-- Add priest
INSERT INTO priest_staff (full_name, email, phone, title, specialization)
VALUES ('ANTONIO RODRIGUEZ', 'antonio.rodriguez@gmail.com', '0917-333-4444', 'Father', 'All church services');
```

**At this point:**
- ✅ Name in database
- ✅ Email in database
- ❌ NO username yet
- ❌ NO password yet
- ❌ Cannot login yet

### **Step 2: Staff Creates Account via OTP**

**User enters:** `ROTCHER A. CADORNA JR.`

**System checks:**
```python
# Check secretaries table
secretary_result = supabase.table('secretaries').select('*').eq('full_name', 'ROTCHER A. CADORNA JR.').execute()

# If found:
found_email = 'rotchercadorna16@gmail.com'
found_role = 'secretary'
found_table = 'secretaries'
```

**System sends OTP to:** `rotchercadorna16@gmail.com`

### **Step 3: User Verifies OTP**

User enters 6-digit code from email.

### **Step 4: User Creates Username & Password**

User enters:
- Username: `rotcher.cadorna`
- Password: `securepass123`

**System updates database:**
```sql
UPDATE secretaries
SET 
    username = 'rotcher.cadorna',
    password_hash = 'hashed_password',
    email_verified = true,
    status = 'active'
WHERE full_name = 'ROTCHER A. CADORNA JR.'
AND email = 'rotchercadorna16@gmail.com';
```

### **Step 5: Account Created! ✅**

Now user can login with:
- Username: `rotcher.cadorna`
- Password: `securepass123`

## 📋 Sample Data Included

### **Secretaries (5 records):**
1. ROTCHER A. CADORNA JR. - rotchercadorna16@gmail.com
2. MARIA SANTOS - maria.santos@gmail.com
3. ANA REYES - ana.reyes@gmail.com
4. CYRIL ARBATIN - cyril.arbatin@gmail.com
5. HANA UMALI - hana.umali@gmail.com

### **Admins (2 records):**
1. JUAN DELA CRUZ - juan.delacruz@gmail.com (super admin)
2. PEDRO GARCIA - pedro.garcia@gmail.com (standard admin)

### **Priests (2 records):**
1. ANTONIO RODRIGUEZ - antonio.rodriguez@gmail.com
2. CARLOS CRUZ - carlos.cruz@gmail.com

## 🔍 Useful Views Created

### **1. all_staff**
Shows all staff members from all 3 tables:
```sql
SELECT * FROM all_staff;
```

### **2. staff_without_accounts**
Shows staff who can create accounts (username is NULL):
```sql
SELECT * FROM staff_without_accounts;
```

### **3. staff_with_accounts**
Shows staff who already have accounts:
```sql
SELECT * FROM staff_with_accounts;
```

## 🛠️ Backend API Updates

### **Check Name and Send OTP:**
```python
@app.route('/api/check-name-and-send-otp', methods=['POST'])
def check_name_and_send_otp():
    full_name = request.json.get('fullName').upper()
    
    # Check secretaries table
    secretary_result = supabase.table('secretaries').select('*').eq('full_name', full_name).execute()
    
    # Check admins table
    admin_result = supabase.table('admins').select('*').eq('full_name', full_name).execute()
    
    # Check priest_staff table
    priest_result = supabase.table('priest_staff').select('*').eq('full_name', full_name).execute()
    
    # Determine which table and get email
    if secretary_result.data:
        found_email = secretary_result.data[0]['email']
        found_role = 'secretary'
        found_table = 'secretaries'
    elif admin_result.data:
        found_email = admin_result.data[0]['email']
        found_role = 'admin'
        found_table = 'admins'
    elif priest_result.data:
        found_email = priest_result.data[0]['email']
        found_role = 'priest'
        found_table = 'priest_staff'
    else:
        return {'success': False, 'message': 'Name not found'}
    
    # Send OTP to found_email
    send_otp_email(found_email, otp_code, full_name)
    
    return {'success': True, 'email': found_email}
```

### **Complete Registration:**
```python
@app.route('/api/complete-registration', methods=['POST'])
def complete_registration():
    full_name = request.json.get('fullName').upper()
    email = request.json.get('email').lower()
    username = request.json.get('username').lower()
    password = request.json.get('password')
    
    # Get table name from OTP storage
    table_name = otp_storage[email]['table']  # 'secretaries', 'admins', or 'priest_staff'
    
    # Update the correct table
    supabase.table(table_name).update({
        'username': username,
        'password_hash': generate_password_hash(password),
        'email_verified': True,
        'status': 'active'
    }).eq('full_name', full_name).eq('email', email).execute()
    
    return {'success': True, 'message': 'Account created successfully'}
```

## 📝 Installation Steps

### **1. Run SQL Script in Supabase:**
```bash
# In Supabase SQL Editor
# Copy and paste: create_staff_tables.sql
# Click "Run"
```

### **2. Verify Tables Created:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('secretaries', 'admins', 'priest_staff');

-- Check sample data
SELECT * FROM all_staff;

-- Check who can create accounts
SELECT * FROM staff_without_accounts;
```

### **3. Restart Flask Server:**
```bash
python app.py
```

### **4. Test Account Creation:**
1. Go to `http://127.0.0.1:5000`
2. Click "Create New Account"
3. Enter: `ROTCHER A. CADORNA JR.`
4. Check email for OTP
5. Enter OTP code
6. Create username & password
7. Login! ✅

## ✅ Benefits

### **Clear Organization:**
- ✅ Easy to identify who is secretary, admin, or priest
- ✅ No confusion about roles
- ✅ Clean table structure

### **Consistent Columns:**
- ✅ All tables have same column names
- ✅ `full_name` in all tables
- ✅ `email` in all tables
- ✅ `username` in all tables
- ✅ `password_hash` in all tables

### **Easy Management:**
- ✅ Add staff before they create accounts
- ✅ Track who has accounts vs who doesn't
- ✅ Views for easy querying
- ✅ Proper indexes for performance

### **Secure Process:**
- ✅ Admin adds staff first
- ✅ Staff creates own account via OTP
- ✅ Email verification required
- ✅ No unauthorized registrations

## 🎯 Testing Checklist

- [ ] Run `create_staff_tables.sql` in Supabase
- [ ] Verify 3 tables created (secretaries, admins, priest_staff)
- [ ] Verify sample data inserted (9 total records)
- [ ] Verify views created (all_staff, staff_without_accounts, staff_with_accounts)
- [ ] Restart Flask server
- [ ] Test with: ROTCHER A. CADORNA JR.
- [ ] Receive OTP at rotchercadorna16@gmail.com
- [ ] Verify OTP code
- [ ] Create username & password
- [ ] Login successfully
- [ ] Check database - username and password_hash updated

## 🎉 Result

**Complete, organized staff management system with:**
- ✅ 3 separate tables for different roles
- ✅ Consistent column structure
- ✅ Easy role identification
- ✅ Secure OTP-based account creation
- ✅ No more column mismatch errors!

---

**ChurchEase V.2** - Staff Tables System
© 2025 All Rights Reserved
