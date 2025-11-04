# 3-Day Funeral Service Implementation

## Overview
Implemented comprehensive 3-day funeral service system (Burol) in ChurchEase V.2, allowing secretaries to schedule multi-day funeral services with date ranges, time schedules, and additional service options.

## Features Implemented

### 1. Enhanced Funeral Form Fields
**Location**: `templates/Sec-Dashboard.html` (lines 1337-1449)

**New Fields Added:**
- **Start Date & Time**: First day and time when funeral service begins
- **End Date & Time**: Last day and time when funeral service ends
- **Duration Calculator**: Automatically calculates and displays number of days
- **Auto-Suggestion**: Automatically suggests 3-day duration when start date is selected

**Additional Services Checkboxes:**
- ✅ Funeral Mass (Misa para sa Yumao)
- ✅ Rosary Prayer (Pag-rosaryo)
- ✅ Wake/Viewing (Lamay)
- ✅ Burial Service (Libing)

**Visual Features:**
- Beautiful gradient background (red to yellow)
- Real-time duration display with validation
- Warning if duration is not 3 days
- Professional Filipino/English labels

### 2. Calendar Multi-Day Display
**Location**: `static/calendar-reservation.js` (lines 511-574)

**Calendar Enhancements:**
- Funeral events now span multiple days on calendar
- Event title shows duration: "3-Day Funeral - Client Name"
- Events properly display across all days in the date range
- Color-coded with gray border for funeral services
- Hover tooltip shows complete funeral schedule

**Technical Implementation:**
```javascript
// Multi-day event with start and end dates
{
    title: "3-Day Funeral - Juan Dela Cruz",
    start: "2025-11-05T09:00:00",
    end: "2025-11-07T17:00:00",
    extendedProps: {
        isFuneral: true,
        funeralStartDate: "2025-11-05",
        funeralEndDate: "2025-11-07",
        funeralServices: { mass: "yes", rosary: "yes", ... }
    }
}
```

### 3. Reservation Table Date Range Display
**Location**: `static/reservation-table.js` (lines 190-219)

**Table Enhancements:**
- Funeral reservations show date range instead of single date
- Format: "🕯️ 3-Day Funeral"
- Displays: "Nov 5 - Nov 7, 2025"
- Shows time range: "9:00 AM to 5:00 PM"
- Special styling with gray color theme

**Example Display:**
```
🕯️ 3-Day Funeral
Nov 5 - Nov 7, 2025
9:00 AM to 5:00 PM
```

### 4. Backend API Support
**Location**: `app.py` (lines 1400-1418)

**New Database Fields Captured:**
```python
service_details = {
    'deceased_name': data.get('deceased_name', ''),
    'date_of_death': data.get('date_of_death', ''),
    'funeral_home_contact': data.get('funeral_home_contact', ''),
    # 3-day funeral schedule
    'funeral_start_date': data.get('funeral_start_date', ''),
    'funeral_end_date': data.get('funeral_end_date', ''),
    'funeral_start_time': data.get('funeral_start_time', ''),
    'funeral_end_time': data.get('funeral_end_time', ''),
    # Additional funeral services
    'funeral_mass': data.get('funeral_mass', ''),
    'funeral_rosary': data.get('funeral_rosary', ''),
    'funeral_viewing': data.get('funeral_viewing', ''),
    'funeral_burial': data.get('funeral_burial', '')
}
```

### 5. Database Schema Updates
**Location**: `add_funeral_multiday_fields.sql`

**New Columns Added to `reservations` table:**
```sql
-- Schedule fields
funeral_start_date DATE
funeral_end_date DATE
funeral_start_time TIME
funeral_end_time TIME

-- Service options
funeral_mass VARCHAR(10)
funeral_rosary VARCHAR(10)
funeral_viewing VARCHAR(10)
funeral_burial VARCHAR(10)
funeral_home_contact VARCHAR(100)
```

**Indexes Added:**
```sql
CREATE INDEX idx_reservations_funeral_dates 
ON reservations(funeral_start_date, funeral_end_date);
```

### 6. CSS Styling
**Location**: `static/reservation-styles.css` (lines 1361-1380)

**Funeral Multi-Day Styling:**
```css
.datetime-info.funeral-multiday {
    background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
    padding: 8px;
    border-radius: 8px;
    border-left: 3px solid #6B7280;
}
```

## User Workflow

### Creating a 3-Day Funeral Reservation

1. **Select Funeral Service** from service options
2. **Fill Deceased Information**:
   - Deceased's full name
   - Date of death
   - Funeral home contact

3. **Set 3-Day Schedule**:
   - Select start date (e.g., Nov 5, 2025)
   - Select start time (e.g., 9:00 AM)
   - System auto-suggests end date (Nov 7, 2025 - 3 days later)
   - Select end time (e.g., 5:00 PM)
   - Duration display shows: "3 days: Nov 5 to Nov 7"

4. **Choose Additional Services**:
   - ✅ Funeral Mass
   - ✅ Rosary Prayer
   - ✅ Wake/Viewing
   - ✅ Burial Service

5. **Submit Reservation**:
   - Funeral appears on calendar spanning all 3 days
   - Table shows date range with duration
   - All services tracked in database

## Calendar Display

### Before (Single Day):
```
Nov 5: Funeral - Juan Dela Cruz
```

### After (Multi-Day):
```
Nov 5-7: 3-Day Funeral - Juan Dela Cruz
[Event spans across 3 days on calendar]
```

## Database Migration

To apply the database changes, run:
```sql
-- Run this SQL file in Supabase SQL Editor
\i add_funeral_multiday_fields.sql
```

Or execute directly:
```bash
psql -h your-supabase-host -U postgres -d postgres -f add_funeral_multiday_fields.sql
```

## Technical Details

### Date Calculation Logic
```javascript
// Auto-suggest 3-day duration
if (startDate && !endDate) {
    const suggestedEnd = new Date(startDate);
    suggestedEnd.setDate(suggestedEnd.getDate() + 2); // +2 days = 3 days total
    endDate = suggestedEnd;
}

// Calculate duration
const daysDiff = Math.ceil((endDate - startDate) / (1000 * 3600 * 24)) + 1;
```

### Calendar Event Structure
```javascript
{
    id: "reservation-uuid",
    title: "3-Day Funeral - Client Name",
    start: "2025-11-05T09:00:00",
    end: "2025-11-07T17:00:00",  // Multi-day event
    backgroundColor: "#FFFFFF",
    borderColor: "#6B7280",      // Gray for funeral
    extendedProps: {
        isFuneral: true,
        funeralDuration: "3-day Funeral",
        funeralServices: {
            mass: "yes",
            rosary: "yes",
            viewing: "yes",
            burial: "yes"
        }
    }
}
```

## Benefits

1. **Accurate Scheduling**: Properly represents 3-day funeral services
2. **Visual Clarity**: Calendar clearly shows multi-day events
3. **Conflict Prevention**: System can detect conflicts across all 3 days
4. **Service Tracking**: Additional services (mass, rosary, etc.) properly recorded
5. **Professional Display**: Table and calendar show funeral duration prominently

## Testing Checklist

- [ ] Create funeral reservation with 3-day schedule
- [ ] Verify calendar shows event spanning 3 days
- [ ] Check table displays date range correctly
- [ ] Test duration calculator with different date ranges
- [ ] Verify additional services are saved
- [ ] Test with 2-day, 3-day, and 4-day durations
- [ ] Ensure warning appears for non-3-day durations
- [ ] Verify database stores all funeral fields
- [ ] Test calendar conflict detection across multiple days

## Future Enhancements

1. **Conflict Detection**: Prevent overlapping funeral reservations
2. **Service Scheduling**: Schedule specific times for mass, rosary, etc.
3. **Location Management**: Track which chapel/area for each day
4. **Notification System**: Send reminders for each day of the funeral
5. **Print Schedule**: Generate printable 3-day funeral schedule

## Files Modified

1. `templates/Sec-Dashboard.html` - Enhanced funeral form fields
2. `static/calendar-reservation.js` - Multi-day calendar display
3. `static/reservation-table.js` - Date range table display
4. `static/reservation-styles.css` - Funeral styling
5. `app.py` - Backend API support
6. `add_funeral_multiday_fields.sql` - Database schema updates

## Support

For questions or issues with the 3-day funeral system, contact the development team or refer to the ChurchEase documentation.

---
**Implementation Date**: November 4, 2025
**Version**: ChurchEase V.2
**Feature**: 3-Day Funeral Service System (Burol)
