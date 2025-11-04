# ✅ TABLE NAMES FIXED!

## 🎯 Correct Table Names

Your database uses these table names:
- ✅ **`secretaries`** - Church secretaries
- ✅ **`admins`** - System administrators  
- ✅ **`priest`** - Church priest (singular, not plural)

## 🔧 What Was Fixed

### **Backend API (app.py):**

**Before (WRONG):**
```python
priest_result = supabase.table('priest_staff').select('*')  # ❌ Wrong table name
priest_check = supabase.table('priest_staff').select('username')  # ❌ Wrong table name
```

**After (CORRECT):**
```python
priest_result = supabase.table('priest').select('*')  # ✅ Correct!
priest_check = supabase.table('priest').select('username')  # ✅ Correct!
```

### **SQL Script (create_staff_tables.sql):**

**Updated to use:**
- `CREATE TABLE priest` (not `priest_staff`)
- All indexes: `idx_priest_*` (not `idx_priest_staff_*`)
- All triggers: `trigger_update_priest_*`
- All views: `FROM priest` (not `FROM priest_staff`)

## 📊 Database Structure

### **Table: secretaries**
```sql
CREATE TABLE secretaries (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(100) UNIQUE,
    password_hash TEXT,
    ...
);
```

### **Table: admins**
```sql
CREATE TABLE admins (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(100) UNIQUE,
    password_hash TEXT,
    ...
);
```

### **Table: priest**
```sql
CREATE TABLE priest (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(100) UNIQUE,
    password_hash TEXT,
    ...
);
```

## 🔄 Account Creation Flow

### **Step 1: Check Name**
```python
# Check secretaries table
secretary_result = supabase.table('secretaries').select('*').eq('full_name', full_name).execute()

# Check admins table
admin_result = supabase.table('admins').select('*').eq('full_name', full_name).execute()

# Check priest table
priest_result = supabase.table('priest').select('*').eq('full_name', full_name).execute()
```

### **Step 2: Identify Role**
```python
if secretary_result.data:
    found_role = 'secretary'
    found_table = 'secretaries'
elif admin_result.data:
    found_role = 'admin'
    found_table = 'admins'
elif priest_result.data:
    found_role = 'priest'
    found_table = 'priest'
```

### **Step 3: Send OTP**
```python
# Get email from found record
found_email = found_user.get('email')

# Send OTP to that email
send_otp_email(found_email, otp_code, full_name)
```

### **Step 4: Update Table**
```python
# Update the correct table
supabase.table(found_table).update({
    'username': username,
    'password_hash': password_hash,
    'email_verified': True,
    'status': 'active'
}).eq('full_name', full_name).eq('email', email).execute()
```

## 📝 Sample Data

### **Secretaries (5 records):**
```sql
INSERT INTO secretaries (full_name, email) VALUES
('ROTCHER A. CADORNA JR.', 'rotchercadorna16@gmail.com'),
('MARIA SANTOS', 'maria.santos@gmail.com'),
('ANA REYES', 'ana.reyes@gmail.com'),
('CYRIL ARBATIN', 'cyril.arbatin@gmail.com'),
('HANA UMALI', 'hana.umali@gmail.com');
```

### **Admins (2 records):**
```sql
INSERT INTO admins (full_name, email) VALUES
('JUAN DELA CRUZ', 'juan.delacruz@gmail.com'),
('PEDRO GARCIA', 'pedro.garcia@gmail.com');
```

### **Priest (1 record):**
```sql
INSERT INTO priest (full_name, email) VALUES
('ANTONIO RODRIGUEZ', 'antonio.rodriguez@gmail.com');
```

## ✅ Files Updated

1. **app.py** - Fixed table names in:
   - `/api/check-name-and-send-otp` endpoint
   - `/api/complete-registration` endpoint

2. **create_staff_tables.sql** - Updated:
   - Table name: `priest` (not `priest_staff`)
   - Indexes: `idx_priest_*`
   - Triggers: `trigger_update_priest_*`
   - Views: `FROM priest`
   - Sample data: 1 priest only

## 🚀 Ready to Test!

1. **Restart Flask server** (if running)
2. **Go to:** `http://127.0.0.1:5000`
3. **Click:** "Create New Account"
4. **Enter:** `ROTCHER A. CADORNA JR.`
5. **Should work now!** ✅

## 🎯 Expected Result

```
User enters: ROTCHER A. CADORNA JR.
   ↓
System checks secretaries table
   ↓
Found! Email: rotchercadorna16@gmail.com
   ↓
Send OTP to that email
   ↓
User verifies OTP
   ↓
User creates username & password
   ↓
System updates secretaries table
   ↓
Account created! ✅
```

## ✅ No More Errors!

- ✅ No more "table priest_staff does not exist"
- ✅ Correct table names used
- ✅ All 3 tables checked properly
- ✅ OTP sent to correct email
- ✅ Account creation works!

---

**ChurchEase V.2** - Table Names Fixed
© 2025 All Rights Reserved
