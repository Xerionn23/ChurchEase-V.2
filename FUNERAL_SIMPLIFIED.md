# Simplified 3-Day Funeral System

## Overview
Simplified funeral reservation system where the START date/time comes from the calendar selection, and the secretary only needs to specify the END date/time.

## How It Works

### User Workflow:

1. **Click Date on Calendar** (e.g., Nov 5, 2025)
2. **Select Time Slot** (e.g., 9:00 AM)
3. **Choose Funeral Service**
4. **Fill Deceased Information**:
   - Deceased's full name
   - Date of death
   - Funeral home contact

5. **Specify END Date/Time**:
   - End Date: Nov 7, 2025 (auto-suggests 3 days)
   - End Time: 5:00 PM
   - Duration shows: "3 days: Nov 5 to Nov 7"

6. **Submit** - Done! ✅

## What Changed from Original Design

### ❌ REMOVED:
- Start Date field (uses calendar date)
- Start Time field (uses calendar time)
- Additional Services checkboxes (Mass, Rosary, Viewing, Burial)

### ✅ KEPT:
- End Date field
- End Time field
- Duration calculator
- Multi-day calendar display

## Form Fields

### Funeral Form Shows:
```
┌─────────────────────────────────────────┐
│ Deceased Information                     │
│ • Deceased's Full Name                   │
│ • Date of Death                          │
│ • Funeral Home Contact                   │
│                                          │
│ Funeral End Schedule (Burol)             │
│ Funeral starts: Nov 5, 9:00 AM          │
│ (from calendar selection)                │
│                                          │
│ • End Date: [Nov 7, 2025]               │
│ • End Time: [5:00 PM ▼]                 │
│                                          │
│ ✓ Duration: 3 days                      │
│   Nov 5 to Nov 7, 2025                  │
└─────────────────────────────────────────┘
```

## Database Fields

```sql
-- Funeral schedule fields
funeral_start_date  -- Copied from reservation_date
funeral_end_date    -- User input
funeral_start_time  -- Copied from reservation_time
funeral_end_time    -- User input
```

## Calendar Display

### Single Event Spanning 3 Days:
```
Calendar View:
┌──────┬──────┬──────┬──────┐
│ Nov 5│ Nov 6│ Nov 7│ Nov 8│
├──────┴──────┴──────┼──────┤
│ 3-Day Funeral      │      │
│ Juan Dela Cruz     │      │
│ (Gray bar spans    │      │
│  across 3 days)    │      │
└────────────────────┴──────┘
```

## Table Display

```
Date & Time Column:
┌────────────────────────────┐
│ 🕯️ 3-Day Funeral          │
│ Nov 5 - Nov 7, 2025        │
│ 9:00 AM to 5:00 PM         │
└────────────────────────────┘
```

## Technical Implementation

### Frontend (Sec-Dashboard.html):
- Removed start date/time fields
- Removed additional services checkboxes
- End date auto-suggests 3 days from calendar selection
- Duration calculator uses `reservationDate` as start

### Backend (app.py):
```python
# Use reservation date/time as funeral start
funeral_start_date = data.get('date')
funeral_start_time = start_time  # From time_slot

service_details = {
    'deceased_name': data.get('deceased_name'),
    'date_of_death': data.get('date_of_death'),
    'funeral_home_contact': data.get('funeral_home_contact'),
    'funeral_start_date': funeral_start_date,
    'funeral_start_time': funeral_start_time,
    'funeral_end_date': data.get('funeral_end_date'),
    'funeral_end_time': data.get('funeral_end_time')
}
```

### Calendar (calendar-reservation.js):
```javascript
// Multi-day event
{
    title: "3-Day Funeral - Client Name",
    start: "2025-11-05T09:00:00",  // From reservation
    end: "2025-11-07T17:00:00",    // From funeral_end
    borderColor: "#6B7280"          // Gray for funeral
}
```

## Benefits

✅ **Simpler Form** - Less fields to fill  
✅ **No Confusion** - Start is already selected on calendar  
✅ **Auto-Suggestion** - System suggests 3-day duration  
✅ **Clear Display** - Calendar shows full duration  
✅ **Easy to Use** - Secretary just picks end date/time  

## Files Modified

1. ✅ `templates/Sec-Dashboard.html` - Simplified funeral form
2. ✅ `app.py` - Backend uses reservation date/time as start
3. ✅ `add_funeral_multiday_fields.sql` - Updated comments
4. ✅ `static/calendar-reservation.js` - Already supports multi-day
5. ✅ `static/reservation-table.js` - Already shows date range

## Testing

- [ ] Select date/time on calendar
- [ ] Choose Funeral service
- [ ] Fill deceased information
- [ ] Set end date (should auto-suggest 3 days)
- [ ] Set end time
- [ ] Check duration display shows correctly
- [ ] Submit reservation
- [ ] Verify calendar shows 3-day event
- [ ] Verify table shows date range

---
**Simplified Version**: November 4, 2025  
**Key Change**: Start date/time from calendar, only END date/time in form
