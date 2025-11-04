# 🎯 FINAL ACCOUNT CREATION FLOW

## ✅ Complete Flow with Users Table Check

### 📊 Database Structure

**3 Staff Tables (Pre-registration):**
1. **`secretaries`** - Church secretaries (has `full_name`, `email`)
2. **`admins`** - System administrators (has `full_name`, `email`)
3. **`priests`** - Church priests (has `first_name`, `last_name`, `email`)

**1 Main Users Table (After registration):**
- **`users`** - All registered accounts (has `username`, `password_hash`, `full_name`, `email`, `role`)

## 🔄 Step-by-Step Flow

### **Step 1: User Enters Full Name**
```
User Input: ROTCHER A. CADORNA JR.
```

### **Step 2: System Checks Staff Tables**
```python
# Check if name exists in staff tables
secretary_result = supabase.table('secretaries').select('*').eq('full_name', full_name)
admin_result = supabase.table('admins').select('*').eq('full_name', full_name)
priest_result = supabase.table('priests').select('*')  # Match first_name + last_name

# Priority: secretaries > admins > priests
```

**Result:**
- ✅ Found in `secretaries` table
- ✅ Email: `rotchercadorna16@gmail.com`
- ✅ Role: `secretary`

### **Step 3: Check if Account Already Exists**
```python
# Check if user already has account in users table
existing_user = supabase.table('users').select('*').eq('full_name', full_name)

if existing_user.data:
    return "Account already exists. Please login."
```

**Two checks:**
1. ✅ Check `users` table by `full_name`
2. ✅ Check staff table for `username` field

**If account exists:**
- ❌ Stop registration
- ❌ Show error: "Account already exists. Please login or use Forgot Password."

**If no account:**
- ✅ Proceed to OTP

### **Step 4: Send OTP to Email**
```python
# Generate OTP
otp = generate_otp()  # e.g., 123456

# Send email to registered address
send_otp_email('rotchercadorna16@gmail.com', otp, 'ROTCHER A. CADORNA JR.')
```

### **Step 5: User Verifies OTP**
```
User enters: 1 2 3 4 5 6
System verifies OTP matches
```

### **Step 6: User Creates Username & Password**
```
Username: rotcher.cadorna
Password: securepass123
```

### **Step 7: System Creates Account**

**A. Check username availability:**
```python
# Check in users table
users_check = supabase.table('users').select('username').eq('username', username)

# Check in staff tables
secretary_check = supabase.table('secretaries').select('username').eq('username', username)
admin_check = supabase.table('admins').select('username').eq('username', username)
priest_check = supabase.table('priests').select('username').eq('username', username)

if any username exists:
    return "Username already taken"
```

**B. Create account in users table:**
```python
user_data = {
    'id': uuid.uuid4(),
    'username': 'rotcher.cadorna',
    'full_name': 'ROTCHER A. CADORNA JR.',
    'email': 'rotchercadorna16@gmail.com',
    'password_hash': hashed_password,
    'role': 'secretary',
    'status': 'active'
}

supabase.table('users').insert(user_data)
```

**C. Update staff table:**
```python
# Mark as registered in secretaries table
supabase.table('secretaries').update({
    'username': 'rotcher.cadorna',
    'password_hash': hashed_password,
    'email_verified': True,
    'status': 'active'
}).eq('full_name', full_name).eq('email', email)
```

### **Step 8: Account Created! ✅**

**User can now login with:**
- Username: `rotcher.cadorna`
- Password: `securepass123`

## 📋 Database State

### **Before Registration:**

**secretaries table:**
```
full_name: ROTCHER A. CADORNA JR.
email: rotchercadorna16@gmail.com
username: NULL
password_hash: NULL
email_verified: false
```

**users table:**
```
(empty - no record)
```

### **After Registration:**

**secretaries table:**
```
full_name: ROTCHER A. CADORNA JR.
email: rotchercadorna16@gmail.com
username: rotcher.cadorna
password_hash: $2b$12$...
email_verified: true
```

**users table:**
```
id: uuid
username: rotcher.cadorna
full_name: ROTCHER A. CADORNA JR.
email: rotchercadorna16@gmail.com
password_hash: $2b$12$...
role: secretary
status: active
```

## 🔒 Security Checks

### **1. Name Verification:**
- ✅ Name must exist in staff tables
- ✅ Prevents random registrations
- ✅ Only authorized staff can register

### **2. Duplicate Account Prevention:**
- ✅ Check `users` table by `full_name`
- ✅ Check staff tables by `username`
- ✅ Prevents multiple accounts for same person

### **3. Username Uniqueness:**
- ✅ Check across all tables
- ✅ Ensures unique usernames system-wide

### **4. Email Verification:**
- ✅ OTP sent to registered email
- ✅ Must verify before creating account

## 🎯 Key Features

### **Dual Storage:**
- ✅ Staff info in staff tables (secretaries/admins/priests)
- ✅ Login credentials in users table
- ✅ Linked by full_name and email

### **Role-Based:**
- ✅ Automatically assigns role based on source table
- ✅ Secretary from `secretaries` table
- ✅ Admin from `admins` table
- ✅ Priest from `priests` table

### **Prevents Duplicates:**
- ✅ Can't create account twice
- ✅ Clear error message if account exists
- ✅ Directs to login or forgot password

## 📝 Error Messages

### **Name Not Found:**
```
"Name not found in our database. 
Please contact the church administrator."
```

### **Account Already Exists:**
```
"Account already exists for this name. 
Please login or use 'Forgot Password' if you need to reset your password."
```

### **Username Taken:**
```
"Username already taken"
```

### **Email Not Verified:**
```
"Email not verified"
```

## 🚀 Testing Checklist

- [ ] Insert staff data in secretaries/admins/priests tables
- [ ] Try creating account with valid name
- [ ] Verify OTP sent to email
- [ ] Complete registration with username/password
- [ ] Check users table - account created
- [ ] Check staff table - username updated
- [ ] Try creating account again with same name
- [ ] Should show "Account already exists" error
- [ ] Try logging in with new credentials
- [ ] Login should work!

## ✅ Summary

**Flow:**
1. User enters name → Check staff tables
2. Name found → Check if account exists in users table
3. No account → Send OTP
4. Verify OTP → Create username/password
5. Create account in users table
6. Update staff table with username
7. Done! ✅

**Security:**
- ✅ Pre-registered names only
- ✅ Email verification required
- ✅ No duplicate accounts
- ✅ Unique usernames

**Result:**
- ✅ Account in users table (for login)
- ✅ Username in staff table (for tracking)
- ✅ Ready to use system!

---

**ChurchEase V.2** - Complete Account Creation System
© 2025 All Rights Reserved
