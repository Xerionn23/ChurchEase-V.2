# 🔄 Updated Account Creation Flow - ChurchEase V.2

## 📋 New Flow Summary

**OLD FLOW (Before):**
1. User enters Full Name + Gmail Address
2. System sends OTP to that Gmail
3. User verifies OTP
4. User creates username & password

**NEW FLOW (Current):**
1. User enters **FULL NAME ONLY**
2. System checks if name exists in database (secretary_accounts/users/priests tables)
3. System gets email from database
4. System sends OTP to registered email
5. User verifies OTP
6. User creates username & password

## 🎯 Key Changes

### ✅ **Removed Email Input Field**
- No more manual email entry
- System automatically finds email from database

### ✅ **Database Name Verification**
- Checks `secretary_accounts` table first
- Then checks `users` table
- Then checks `priests` table
- Priority: secretary_accounts > users > priests

### ✅ **Automatic Email Lookup**
- Once name is found, system retrieves registered email
- Sends OTP to that email automatically

## 🔍 How It Works

### **Step 1: User Enters Name**
```
┌─────────────────────────────────────┐
│  Create New Account                 │
├─────────────────────────────────────┤
│                                     │
│  👤 [Full Name Input]               │
│     ROTCHER A. CADORNA JR.          │
│                                     │
│  ℹ️  System will check if your name │
│     is registered in our database   │
│     and send verification code to   │
│     your registered email           │
│                                     │
│  [📤 Send Verification Code]        │
│                                     │
└─────────────────────────────────────┘
```

### **Step 2: System Checks Database**
```sql
-- Check secretary_accounts table
SELECT * FROM secretary_accounts 
WHERE full_name = 'ROTCHER A. CADORNA JR.';

-- If not found, check users table
SELECT * FROM users 
WHERE full_name = 'ROTCHER A. CADORNA JR.';

-- If not found, check priests table
SELECT * FROM priests 
WHERE name = 'ROTCHER A. CADORNA JR.';
```

### **Step 3: System Gets Email**
```javascript
// If found in database:
found_email = user.email  // e.g., rotcher@gmail.com
found_role = user.role    // e.g., secretary

// Send OTP to this email
send_otp_email(found_email, otp_code, full_name)
```

### **Step 4: OTP Sent to Registered Email**
```
╔═══════════════════════════════════════╗
║  From: ChurchEase                     ║
║  To: rotcher@gmail.com                ║
║  Subject: Verification Code: 123456   ║
╠═══════════════════════════════════════╣
║                                       ║
║  Hello ROTCHER A. CADORNA JR.,        ║
║                                       ║
║  Your verification code: 123456       ║
║                                       ║
╚═══════════════════════════════════════╝
```

### **Step 5: User Verifies OTP**
```
╔═══════════════════════════════════════╗
║  🛡️ Verify Your Email                 ║
╠═══════════════════════════════════════╣
║                                       ║
║  We've sent a 6-digit code to:        ║
║  rotcher@gmail.com                    ║
║                                       ║
║  🔑 [Enter 6-Digit Code]              ║
║     [  1  2  3  4  5  6  ]            ║
║                                       ║
║  [✅ Verify Code]                     ║
║                                       ║
╚═══════════════════════════════════════╝
```

### **Step 6: Complete Registration**
```
╔═══════════════════════════════════════╗
║  ✅ Complete Your Registration        ║
╠═══════════════════════════════════════╣
║                                       ║
║  👤 [Choose Username]                 ║
║     rotcher.cadorna                   ║
║                                       ║
║  🔒 [Create Password]                 ║
║     ••••••••••                        ║
║                                       ║
║  [✅ Create Account]                  ║
║                                       ║
╚═══════════════════════════════════════╝
```

## 🔐 Security Features

### **Name Verification:**
- ✅ Name must exist in database
- ✅ Prevents random account creation
- ✅ Only authorized personnel can create accounts

### **Email Security:**
- ✅ Email comes from database (not user input)
- ✅ Prevents email spoofing
- ✅ Ensures OTP goes to correct person

### **Account Validation:**
- ✅ Checks if username already exists
- ✅ Prevents duplicate accounts
- ✅ Validates password requirements

## 📊 Database Tables Checked

### **1. secretary_accounts Table**
```sql
Columns checked:
- full_name (UPPERCASE)
- email
- role
- username (to check if account exists)
```

### **2. users Table**
```sql
Columns checked:
- full_name (UPPERCASE)
- email
- role
- username (to check if account exists)
```

### **3. priests Table**
```sql
Columns checked:
- name (UPPERCASE)
- email
- username (to check if account exists)
```

## ⚠️ Error Messages

### **Name Not Found:**
```
❌ Name not found in our database. 
   Please contact the church administrator.
```

### **No Email Registered:**
```
❌ No email address registered for this name. 
   Please contact the church administrator.
```

### **Account Already Exists:**
```
❌ Account already exists for this name. 
   Please use "Forgot Password" if you need 
   to reset your password.
```

### **Username Taken:**
```
❌ Username already taken
```

## 🔄 Complete Flow Diagram

```
User Opens Login Page
        ↓
Click "Create New Account"
        ↓
Enter Full Name (UPPERCASE)
        ↓
Click "Send Verification Code"
        ↓
System checks secretary_accounts table
        ↓
Found? → YES → Get email from database
        ↓
System sends OTP to registered email
        ↓
User checks email inbox
        ↓
User enters 6-digit OTP
        ↓
Click "Verify Code"
        ↓
OTP verified ✅
        ↓
Enter username & password
        ↓
Click "Create Account"
        ↓
System updates database record
        ↓
Account created ✅
        ↓
Redirect to login page
        ↓
Login with new credentials
```

## 🎯 Benefits of New Flow

### **For Users:**
✅ Simpler - only enter name
✅ No need to remember email
✅ Faster registration process
✅ Less chance of typos

### **For System:**
✅ More secure - email from database
✅ Prevents unauthorized registrations
✅ Validates against existing records
✅ Maintains data integrity

### **For Administrators:**
✅ Better control over who can register
✅ Pre-registered names only
✅ Audit trail of registrations
✅ Prevents spam accounts

## 📝 Pre-Registration Required

**Before users can create accounts, administrators must:**

1. **Add user to database** with:
   - Full name (UPPERCASE)
   - Email address
   - Role (secretary/admin/priest)

2. **User can then register** by:
   - Entering their full name
   - Receiving OTP at registered email
   - Creating username & password

## 🚀 API Endpoints

### **POST /api/check-name-and-send-otp**
```json
Request:
{
  "fullName": "ROTCHER A. CADORNA JR.",
  "type": "registration"
}

Response (Success):
{
  "success": true,
  "message": "Verification code sent to your registered email",
  "email": "rotcher@gmail.com"
}

Response (Error):
{
  "success": false,
  "message": "Name not found in our database. Please contact the church administrator."
}
```

### **POST /api/verify-otp**
```json
Request:
{
  "email": "rotcher@gmail.com",
  "otp": "123456"
}

Response:
{
  "success": true,
  "message": "Email verified successfully"
}
```

### **POST /api/complete-registration**
```json
Request:
{
  "fullName": "ROTCHER A. CADORNA JR.",
  "email": "rotcher@gmail.com",
  "username": "rotcher.cadorna",
  "password": "securepass123"
}

Response:
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "username": "rotcher.cadorna",
    "full_name": "ROTCHER A. CADORNA JR.",
    "email": "rotcher@gmail.com",
    "role": "secretary"
  }
}
```

## ✅ Testing Checklist

- [ ] Enter valid name from database
- [ ] Receive OTP at registered email
- [ ] Verify OTP code
- [ ] Create username & password
- [ ] Login with new account
- [ ] Test with invalid name (should fail)
- [ ] Test with name without email (should fail)
- [ ] Test with existing account (should fail)
- [ ] Test with duplicate username (should fail)

## 🎉 Result

**Secure, streamlined account creation process that:**
- ✅ Validates users against database
- ✅ Uses registered emails only
- ✅ Prevents unauthorized registrations
- ✅ Provides clear error messages
- ✅ Maintains data integrity

---

**ChurchEase V.2** - Secure Account Creation System
© 2025 All Rights Reserved
