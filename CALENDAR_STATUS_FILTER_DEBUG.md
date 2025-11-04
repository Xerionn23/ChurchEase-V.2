# Calendar Status Filter Debug

## Issue Reported
New funeral reservation (Nov 5-8) is showing on the calendar even though it's still `waiting_priest_approval` status and hasn't been approved by the priest yet.

## Expected Behavior

### Calendar Should Show:
- ✅ `status: 'confirmed'` - Fully confirmed reservations
- ✅ `status: 'approved'` - Secretary approved
- ✅ `status: 'priest_approved'` - Priest approved

### Calendar Should NOT Show:
- ❌ `status: 'pending'` - Waiting for secretary
- ❌ `status: 'waiting_priest_approval'` - Waiting for priest ← THIS ONE!
- ❌ `status: 'declined'` - Rejected
- ❌ `status: 'cancelled'` - Cancelled

## Current Filter Logic

```javascript
const confirmedReservations = this.reservations.filter(reservation => {
    const status = reservation.status ? reservation.status.toLowerCase() : '';
    const isConfirmedOrApproved = status === 'confirmed' || 
                                 status === 'approved' || 
                                 status === 'priest_approved';
    
    return isConfirmedOrApproved; // Only these show on calendar
});
```

## Debugging Steps

### 1. Check Console Logs
After refresh, check browser console for:

```
🔍 getCalendarEvents: Filtering reservations...
   Total reservations: X
   ✅ SHOWING reservation: { name: "...", status: "approved", ... }
   ❌ HIDING reservation: { name: "...", status: "waiting_priest_approval", ... }
   Confirmed reservations to show: X
```

### 2. Verify New Funeral Status
Look for the Nov 5-8 funeral in the logs:

**Expected (CORRECT):**
```
❌ HIDING reservation: {
    name: "Rotcher Cadorna Jr.",
    service: "funeral",
    status: "waiting_priest_approval",  ← Should be this!
    date: "2025-11-05"
}
```

**If showing (WRONG):**
```
✅ SHOWING reservation: {
    name: "Rotcher Cadorna Jr.",
    service: "funeral",
    status: "approved",  ← Should NOT be this!
    date: "2025-11-05"
}
```

### 3. Check Database
Query the database to see the actual status:

```sql
SELECT 
    reservation_id,
    service_type,
    reservation_date,
    status,
    funeral_start_date,
    funeral_end_date
FROM reservations
WHERE service_type = 'funeral'
ORDER BY created_at DESC
LIMIT 5;
```

## Possible Causes

### Cause 1: Status Set Incorrectly
The backend might be setting status to `approved` instead of `waiting_priest_approval` when a priest is assigned.

**Check in app.py:**
```python
# Line ~1474
'status': 'waiting_priest_approval' if assigned_priest else 'pending',
```

Should be `waiting_priest_approval` if priest is assigned.

### Cause 2: Calendar Caching
The calendar might be showing old cached data. Try:
1. Hard refresh (Ctrl+Shift+R)
2. Clear browser cache
3. Check Network tab for API response

### Cause 3: Multiple Funerals
There might be multiple funeral reservations:
- Old ones with `status: 'approved'` (showing correctly)
- New one with `status: 'waiting_priest_approval'` (should be hidden)

Check if Nov 5-8 is the NEW funeral or an OLD one.

## Status Flow

### Correct Flow:
```
1. Secretary creates reservation
   └─ status: 'pending' (no priest assigned)
   └─ Calendar: ❌ NOT SHOWN

2. Secretary assigns priest
   └─ status: 'waiting_priest_approval'
   └─ Calendar: ❌ NOT SHOWN
   └─ Email sent to priest

3. Priest approves
   └─ status: 'priest_approved' or 'approved'
   └─ Calendar: ✅ SHOWN
   └─ Email sent to client

4. Service completed
   └─ status: 'confirmed' or 'completed'
   └─ Calendar: ✅ SHOWN
```

### Current Issue:
```
1. Secretary creates funeral (Nov 5-8)
   └─ status: ??? (need to check)
   
2. Calendar shows it immediately
   └─ Calendar: ✅ SHOWN (WRONG!)
   └─ Should be: ❌ NOT SHOWN
```

## Testing Checklist

- [ ] Refresh page and check console logs
- [ ] Find Nov 5-8 funeral in the logs
- [ ] Check its status value
- [ ] Verify it's the NEW funeral (not old one)
- [ ] Check database status
- [ ] Verify backend is setting correct status

## Expected Console Output

**When filtering is working correctly:**
```
🔍 getCalendarEvents: Filtering reservations...
   Total reservations: 11

   ✅ SHOWING reservation: {
       name: "Old Funeral 1",
       service: "funeral",
       status: "approved",
       date: "2025-11-07"
   }
   
   ❌ HIDING reservation: {
       name: "Rotcher Cadorna Jr.",
       service: "funeral",
       status: "waiting_priest_approval",  ← NEW FUNERAL
       date: "2025-11-05"
   }
   
   Confirmed reservations to show: 6
```

## Fix If Status Is Wrong

If the new funeral has `status: 'approved'` instead of `waiting_priest_approval`:

**Backend Fix (app.py):**
```python
# Make sure this line is correct
'status': 'waiting_priest_approval' if assigned_priest else 'pending',
```

**Database Fix:**
```sql
-- Update the specific funeral
UPDATE reservations
SET status = 'waiting_priest_approval'
WHERE reservation_id = 'RES-20251104-XXX'
AND service_type = 'funeral';
```

## Summary

**Issue**: New funeral showing on calendar before priest approval  
**Expected**: Should only show after priest approves  
**Debug**: Check console logs to see actual status  
**Fix**: Ensure status is `waiting_priest_approval`, not `approved`  

---
**Status**: 🔍 DEBUGGING  
**Next Step**: Check console logs after page refresh  
**Date**: November 4, 2025
