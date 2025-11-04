# Funeral Multi-Day Display Debug

## Issue
After fixing the approval workflow, funerals are now correctly hidden until priest approval. However, when they DO appear on the calendar after approval, they only show as **1 day** instead of **3 days** (multi-day span).

## Timeline of Issues

### Issue 1 (FIXED ✅):
- **Problem**: Funerals showing on calendar before priest approval
- **Fix**: Only add approved reservations to calendar array
- **Result**: Funerals now hidden until approved ✅

### Issue 2 (CURRENT ❌):
- **Problem**: Approved funerals only showing 1 day instead of 3 days
- **Expected**: Nov 5-7 (3 days)
- **Actual**: Nov 5 only (1 day)

## Multi-Day Display Logic

### How It Should Work:
```javascript
if (isFuneral && reservation.funeral_start_date && reservation.funeral_end_date) {
    // Create multi-day event
    const start = new Date(funeral_start_date);  // Nov 5
    const end = new Date(funeral_end_date);      // Nov 7
    const calendarEnd = end + 1 day;             // Nov 8 (for FullCalendar)
    
    // Event spans: Nov 5, 6, 7 ✅
}
```

### Condition Check:
```javascript
if (isFuneral && reservation.funeral_start_date && reservation.funeral_end_date)
```

This means:
- ✅ `service_type` = 'funeral'
- ✅ `funeral_start_date` must have value (not NULL)
- ✅ `funeral_end_date` must have value (not NULL)

If ANY of these are missing → Single day event ❌

## Possible Causes

### Cause 1: Database Fields Are NULL
The funeral reservation might not have the funeral_start_date and funeral_end_date fields populated.

**Check Database:**
```sql
SELECT 
    reservation_id,
    service_type,
    reservation_date,
    status,
    funeral_start_date,
    funeral_end_date,
    funeral_start_time,
    funeral_end_time
FROM reservations
WHERE service_type = 'funeral'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**
```
reservation_id | funeral_start_date | funeral_end_date
RES-xxx        | 2025-11-05        | 2025-11-07
```

**If NULL:**
```
reservation_id | funeral_start_date | funeral_end_date
RES-xxx        | NULL              | NULL              ← PROBLEM!
```

### Cause 2: Form Not Submitting End Date
The funeral end date field might not be filled out or not being sent to backend.

**Check Console Logs:**
```
🕯️ FUNERAL FIELDS FROM FORM:
  funeral_end_date:          // ← If empty, this is the problem
  funeral_end_time: 14:00
```

### Cause 3: Backend Not Saving Fields
The backend might be receiving the data but not saving it to the database.

**Check Flask Console:**
```python
🕯️ FUNERAL DATA RECEIVED:
  funeral_end_date: 2025-11-07  # ← Should have value
  
✅ Added funeral fields to reservation_data:
   funeral_start_date: 2025-11-05
   funeral_end_date: 2025-11-07
```

## Debugging Steps

### 1. Check Console Logs
After page refresh, look for:

```
🕯️ Funeral reservation detected: {
    name: "Rotcher Cadorna Jr.",
    funeral_start_date: ???,  ← Check this!
    funeral_end_date: ???,    ← Check this!
    funeral_start_time: ???,
    funeral_end_time: ???
}
```

**If NULL:**
```
funeral_start_date: null  ← PROBLEM!
funeral_end_date: null    ← PROBLEM!
```

**If Has Values:**
```
funeral_start_date: "2025-11-05"  ← GOOD!
funeral_end_date: "2025-11-07"    ← GOOD!
```

### 2. Check Database
Run this query in Supabase SQL Editor:

```sql
SELECT 
    reservation_id,
    service_type,
    reservation_date,
    funeral_start_date,
    funeral_end_date,
    status,
    created_at
FROM reservations
WHERE service_type = 'funeral'
AND status IN ('approved', 'priest_approved', 'confirmed')
ORDER BY created_at DESC
LIMIT 5;
```

### 3. Create Test Funeral
1. Create new funeral reservation
2. Fill ALL fields including end date/time
3. Assign priest
4. Priest approves
5. Check if it shows 3 days on calendar

## Expected Console Output

### When Working Correctly:
```
🕯️ Funeral reservation detected: {
    name: "Juan Dela Cruz",
    funeral_start_date: "2025-11-05",
    funeral_end_date: "2025-11-07",
    funeral_start_time: "09:00:00",
    funeral_end_time: "17:00:00"
}

🕯️ Multi-day funeral event: {
    name: "Juan Dela Cruz",
    start: "2025-11-05",
    end: "2025-11-07",
    calendarEnd: "2025-11-08",
    duration: "3 days"
}

✅ Created calendar event: {
    title: "3-Day Funeral - Juan Dela Cruz",
    start: "2025-11-05T09:00:00",
    end: "2025-11-08T00:00:00"  ← Note: +1 day for FullCalendar
}
```

### When NOT Working:
```
🕯️ Funeral reservation detected: {
    name: "Juan Dela Cruz",
    funeral_start_date: null,  ← PROBLEM!
    funeral_end_date: null,    ← PROBLEM!
    funeral_start_time: null,
    funeral_end_time: null
}

❌ Multi-day funeral event NOT created (missing dates)

✅ Created calendar event: {
    title: "Juan Dela Cruz",  ← No duration prefix
    start: "2025-11-05T09:00:00",
    end: null  ← Single day event
}
```

## Fixes Based on Cause

### If Database Is NULL:
The funeral fields are not being saved. Check:

1. **Form validation** - Is end date required?
2. **Form submission** - Is end date being sent?
3. **Backend logic** - Is backend saving the fields?

### If Form Not Submitting:
Check the form validation we added:

```javascript
// Should be blocking submission if empty
if (!funeralEndDate || !funeralEndTime) {
    showError('Please fill in the funeral end date and time');
    return;
}
```

### If Backend Not Saving:
Check the backend logic:

```python
# Should be adding to reservation_data
if service_type == 'funeral' and service_details:
    if funeral_start:
        reservation_data['funeral_start_date'] = funeral_start
    if funeral_end:
        reservation_data['funeral_end_date'] = funeral_end
```

## Old Funerals vs New Funerals

### Old Funerals (Before Fix):
```
funeral_start_date: NULL
funeral_end_date: NULL
→ Shows as 1 day ❌
```

### New Funerals (After Fix):
```
funeral_start_date: "2025-11-05"
funeral_end_date: "2025-11-07"
→ Should show as 3 days ✅
```

## Migration for Old Funerals

If old funerals have NULL dates, you can update them:

```sql
-- Update old funerals to have proper dates
UPDATE reservations
SET 
    funeral_start_date = reservation_date,
    funeral_end_date = reservation_date + INTERVAL '2 days',
    funeral_start_time = reservation_time,
    funeral_end_time = '17:00:00'
WHERE service_type = 'funeral'
AND funeral_start_date IS NULL;
```

## Summary

**Issue**: Funerals showing as 1 day instead of 3 days  
**Likely Cause**: funeral_start_date and funeral_end_date are NULL in database  
**Debug**: Check console logs to see actual field values  
**Fix**: Ensure form submits end date and backend saves it  

---
**Status**: 🔍 DEBUGGING  
**Next Step**: Check console logs after page refresh  
**Date**: November 4, 2025
