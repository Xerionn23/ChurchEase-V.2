// Philippine Holidays Data for ChurchEase Calendar System
// Based on official Philippine holidays and observances

class PhilippineHolidays {
    constructor() {
        this.holidays = this.getHolidays2024And2025();
    }

    // Get all Philippine holidays for 2024 and 2025
    getHolidays2024And2025() {
        return {
            // 2024 Holidays
            '2024-01-01': { name: 'New Year\'s Day', type: 'regular', category: 'national' },
            '2024-02-10': { name: 'Chinese New Year', type: 'special', category: 'cultural' },
            '2024-02-25': { name: 'EDSA Anniversary', type: 'special', category: 'national' },
            '2024-03-28': { name: 'Maundy Thursday', type: 'regular', category: 'religious' },
            '2024-03-29': { name: 'Good Friday', type: 'regular', category: 'religious' },
            '2024-03-30': { name: 'Black Saturday', type: 'special', category: 'religious' },
            '2024-03-31': { name: 'Easter Sunday', type: 'special', category: 'religious' },
            '2024-04-09': { name: 'Day of Valor', type: 'regular', category: 'national' },
            '2024-05-01': { name: 'Labor Day', type: 'regular', category: 'national' },
            '2024-06-12': { name: 'Independence Day', type: 'regular', category: 'national' },
            '2024-08-21': { name: 'Ninoy Aquino Day', type: 'special', category: 'national' },
            '2024-08-26': { name: 'Heroes Day', type: 'regular', category: 'national' },
            '2024-11-01': { name: 'All Saints\' Day', type: 'special', category: 'religious' },
            '2024-11-02': { name: 'All Souls\' Day', type: 'special', category: 'religious' },
            '2024-11-30': { name: 'Bonifacio Day', type: 'regular', category: 'national' },
            '2024-12-08': { name: 'Immaculate Conception', type: 'special', category: 'religious' },
            '2024-12-24': { name: 'Christmas Eve', type: 'special', category: 'religious' },
            '2024-12-25': { name: 'Christmas Day', type: 'regular', category: 'religious' },
            '2024-12-30': { name: 'Rizal Day', type: 'regular', category: 'national' },
            '2024-12-31': { name: 'New Year\'s Eve', type: 'special', category: 'national' },

            // 2025 Holidays
            '2025-01-01': { name: 'New Year\'s Day', type: 'regular', category: 'national' },
            '2025-01-29': { name: 'Chinese New Year', type: 'special', category: 'cultural' },
            '2025-02-25': { name: 'EDSA Anniversary', type: 'special', category: 'national' },
            '2025-04-17': { name: 'Maundy Thursday', type: 'regular', category: 'religious' },
            '2025-04-18': { name: 'Good Friday', type: 'regular', category: 'religious' },
            '2025-04-19': { name: 'Black Saturday', type: 'special', category: 'religious' },
            '2025-04-20': { name: 'Easter Sunday', type: 'special', category: 'religious' },
            '2025-04-09': { name: 'Day of Valor', type: 'regular', category: 'national' },
            '2025-05-01': { name: 'Labor Day', type: 'regular', category: 'national' },
            '2025-06-12': { name: 'Independence Day', type: 'regular', category: 'national' },
            '2025-08-21': { name: 'Ninoy Aquino Day', type: 'special', category: 'national' },
            '2025-08-25': { name: 'Heroes Day', type: 'regular', category: 'national' },
            '2025-11-01': { name: 'All Saints\' Day', type: 'special', category: 'religious' },
            '2025-11-02': { name: 'All Souls\' Day', type: 'special', category: 'religious' },
            '2025-11-30': { name: 'Bonifacio Day', type: 'regular', category: 'national' },
            '2025-12-08': { name: 'Immaculate Conception', type: 'special', category: 'religious' },
            '2025-12-24': { name: 'Christmas Eve', type: 'special', category: 'religious' },
            '2025-12-25': { name: 'Christmas Day', type: 'regular', category: 'religious' },
            '2025-12-30': { name: 'Rizal Day', type: 'regular', category: 'national' },
            '2025-12-31': { name: 'New Year\'s Eve', type: 'special', category: 'national' }
        };
    }

    // Check if a date is a holiday
    isHoliday(dateString) {
        return this.holidays.hasOwnProperty(dateString);
    }

    // Get holiday information for a specific date
    getHoliday(dateString) {
        return this.holidays[dateString] || null;
    }

    // Get all holidays for a specific month
    getHolidaysForMonth(year, month) {
        const monthStr = month.toString().padStart(2, '0');
        const monthHolidays = {};
        
        Object.keys(this.holidays).forEach(date => {
            if (date.startsWith(`${year}-${monthStr}`)) {
                monthHolidays[date] = this.holidays[date];
            }
        });
        
        return monthHolidays;
    }

    // Get holiday color based on type and category
    getHolidayColor(holiday) {
        if (holiday.type === 'regular') {
            if (holiday.category === 'religious') return '#DC2626'; // Red for religious holidays
            if (holiday.category === 'national') return '#059669'; // Green for national holidays
        } else if (holiday.type === 'special') {
            if (holiday.category === 'religious') return '#F59E0B'; // Orange for special religious
            if (holiday.category === 'national') return '#3B82F6'; // Blue for special national
            if (holiday.category === 'cultural') return '#8B5CF6'; // Purple for cultural
        }
        return '#6B7280'; // Default gray
    }

    // Get holiday icon based on category
    getHolidayIcon(holiday) {
        switch (holiday.category) {
            case 'religious': return 'fas fa-cross';
            case 'national': return 'fas fa-flag';
            case 'cultural': return 'fas fa-star';
            default: return 'fas fa-calendar-day';
        }
    }

    // Format date to YYYY-MM-DD
    formatDateString(date) {
        if (typeof date === 'string') return date;
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Get all holidays as calendar events for FullCalendar
    getHolidayEvents() {
        return Object.keys(this.holidays).map(date => {
            const holiday = this.holidays[date];
            return {
                id: `holiday-${date}`,
                title: holiday.name,
                start: date,
                allDay: true,
                display: 'background',
                backgroundColor: this.getHolidayColor(holiday),
                borderColor: this.getHolidayColor(holiday),
                classNames: ['holiday-event', `holiday-${holiday.type}`, `holiday-${holiday.category}`],
                extendedProps: {
                    isHoliday: true,
                    holidayType: holiday.type,
                    holidayCategory: holiday.category,
                    holidayName: holiday.name
                }
            };
        });
    }

    // Get holidays for display in calendar legend
    getHolidayLegend() {
        return [
            { type: 'regular', category: 'religious', color: '#DC2626', label: 'Religious Holiday', icon: 'fas fa-cross' },
            { type: 'regular', category: 'national', color: '#059669', label: 'National Holiday', icon: 'fas fa-flag' },
            { type: 'special', category: 'religious', color: '#F59E0B', label: 'Special Religious', icon: 'fas fa-cross' },
            { type: 'special', category: 'national', color: '#3B82F6', label: 'Special National', icon: 'fas fa-flag' },
            { type: 'special', category: 'cultural', color: '#8B5CF6', label: 'Cultural Holiday', icon: 'fas fa-star' }
        ];
    }
}

// Make it globally accessible
window.PhilippineHolidays = PhilippineHolidays;
