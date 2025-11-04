// Events Calendar System for ChurchEase V.2
// Shows the SAME confirmed/approved reservations as Reservations Calendar
// Separate file for better organization and clarity

class EventsCalendarSystem {
    constructor() {
        this.calendar = null;
        this.selectedDate = null;
        this.selectedTimeSlot = null;
        this.reservations = [];
        this.events = []; // Add events array
        this.lastClickTime = 0; // Add debounce tracking
        // Updated time slots: 9-12AM and 2-5PM only
        this.timeSlots = [
            '09:00', '10:00', '11:00', '12:00',  // 9AM-12PM
            '14:00', '15:00', '16:00', '17:00'   // 2PM-5PM
        ];
        
        this.serviceColors = {
            'wedding': '#FFD700',     // Gold
            'baptism': '#3B82F6',     // Blue
            'funeral': '#6B7280',     // Gray
            'confirmation': '#8B5CF6' // Purple
        };

        // Event type colors to match service colors styling
        this.eventTypeColors = {
            'worship': '#8B5CF6',     // Purple (like confirmation)
            'prayer': '#F59E0B',      // Orange
            'youth': '#3B82F6',       // Blue (like baptism)
            'outreach': '#10B981',    // Green
            'special': '#EF4444',     // Red
            'bible-study': '#8B5CF6', // Purple
            'fellowship': '#10B981',  // Green
            'meeting': '#F59E0B',     // Orange
            'other': '#6B7280'        // Gray (like funeral)
        };

        // Initialize Philippine holidays
        this.philippineHolidays = new PhilippineHolidays();

        this.init();
    }

    // Helper function to convert hex color to rgba
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    async init() {
        console.log('Initializing Events Calendar System...');
        await this.loadReservations();
        this.initializeCalendar();
        this.setupEventListeners();
        console.log('Events Calendar System initialized successfully');
        console.log('EVENTS CALENDAR: Shows SAME confirmed/approved reservations as Reservations Calendar');
        console.log('Philippine holidays loaded:', Object.keys(this.philippineHolidays.holidays).length);
        
        // Make this instance globally available
        window.eventsCalendarSystem = this;
        
        // Add test function for debugging time slot selection
        window.testTimeSlotSelection = (time, date) => {
            console.log('🧪 Testing time slot selection:', { time, date });
            this.selectTimeSlot(time || '9:00 AM', date || '2025-10-30');
        };
    }

    async loadReservations() {
        try {
            console.log('Events Calendar: Loading reservations from API...');
            const response = await fetch('/api/reservations/all');
            const result = await response.json();
            
            if (result.success) {
                this.reservations = result.data || [];
                console.log('Events Calendar: Loaded reservations:', this.reservations.length);
            } else {
                console.error('Events Calendar: Failed to load reservations:', result.error);
                this.reservations = [];
            }
        } catch (error) {
            console.error('Events Calendar: Error loading reservations:', error);
            this.reservations = [];
        }
        
        // Also load events from events table
        await this.loadEvents();
        
        // Update calendar events after loading both reservations and events
        if (this.calendar) {
            this.refreshCalendarEvents();
        }
    }

    async loadEvents() {
        try {
            console.log('Events Calendar: Loading events from API...');
            const response = await fetch('/api/events');
            const result = await response.json();
            
            if (result.success) {
                this.events = result.data || [];
                console.log('Events Calendar: Loaded events:', this.events.length);
            } else {
                console.error('Events Calendar: Failed to load events:', result.error);
                this.events = [];
            }
        } catch (error) {
            console.error('Events Calendar: Error loading events:', error);
            this.events = [];
        }
    }

    initializeCalendar() {
        const calendarEl = document.getElementById('eventsFullCalendar');
        if (!calendarEl) {
            console.error('Events Calendar: Calendar container not found');
            return;
        }

        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            height: 'auto',
            aspectRatio: 1.35,
            selectable: true, // Enable date selection for adding events
            selectMirror: true,
            dayMaxEvents: true,
            weekends: true,
            
            // Styling
            themeSystem: 'standard',
            
            // Date click handler for adding events
            dateClick: this.handleDateClick.bind(this),
            
            // Event click handler
            eventClick: this.handleEventClick.bind(this),
            
            // Event mount handler
            eventDidMount: this.handleEventMount.bind(this),
            
            // Events will be added manually after calendar renders
            events: [],
            
            // Ensure events are displayed properly
            eventDisplay: 'block',
            displayEventTime: true,
            displayEventEnd: true,  // CRITICAL: Must be true for multi-day funeral events
            
            // Disable past dates
            selectConstraint: {
                start: new Date().toISOString().split('T')[0]
            },
            
            // Disable past dates and Mondays
            dayCellDidMount: (info) => {
                const today = new Date();
                const cellDate = new Date(info.date);
                
                // Disable past dates
                if (cellDate < today.setHours(0, 0, 0, 0)) {
                    info.el.classList.add('fc-day-disabled');
                    info.el.style.backgroundColor = '#f3f4f6';
                    info.el.style.color = '#9ca3af';
                    info.el.style.cursor = 'not-allowed';
                }
                
                // Disable Mondays (office day off)
                if (cellDate.getDay() === 1) {
                    info.el.classList.add('fc-day-disabled', 'monday-disabled');
                    info.el.style.backgroundColor = '#fef3c7';
                    info.el.style.color = '#92400e';
                    info.el.style.cursor = 'not-allowed';
                    info.el.title = 'Office Day Off - No reservations available';
                }
                
                // Add Philippine holiday indicators
                const dateStr = this.philippineHolidays.formatDateString(cellDate);
                const holiday = this.philippineHolidays.getHoliday(dateStr);
                if (holiday) {
                    info.el.classList.add('holiday-date');
                    info.el.style.position = 'relative';
                    
                    // Add holiday indicator icon
                    const holidayIndicator = document.createElement('div');
                    holidayIndicator.className = 'holiday-indicator';
                    holidayIndicator.innerHTML = `<i class="${this.philippineHolidays.getHolidayIcon(holiday)}"></i>`;
                    holidayIndicator.style.cssText = `
                        position: absolute;
                        top: 2px;
                        right: 2px;
                        width: 16px;
                        height: 16px;
                        background: ${this.philippineHolidays.getHolidayColor(holiday)};
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 8px;
                        z-index: 10;
                    `;
                    holidayIndicator.title = `${holiday.name} (${holiday.type} ${holiday.category})`;
                    info.el.appendChild(holidayIndicator);
                    
                    // Add holiday name below the date
                    const holidayName = document.createElement('div');
                    holidayName.className = 'holiday-name';
                    holidayName.textContent = holiday.name;
                    holidayName.style.cssText = `
                        position: absolute;
                        bottom: 2px;
                        left: 2px;
                        right: 2px;
                        font-size: 9px;
                        color: ${this.philippineHolidays.getHolidayColor(holiday)};
                        font-weight: 600;
                        text-align: center;
                        line-height: 1;
                        background: rgba(255, 255, 255, 0.9);
                        border-radius: 2px;
                        padding: 1px 2px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        z-index: 5;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                    `;
                    info.el.appendChild(holidayName);
                }
            }
        });

        this.calendar.render();
        
        // Load events after calendar is rendered
        setTimeout(() => {
            this.refreshCalendarEvents();
        }, 200);
    }

    refreshCalendarEvents() {
        const events = this.getCalendarEvents();
        console.log('Events Calendar: Refreshing calendar events:', events.length);
        console.log('Events Calendar: Events to display:', events.map(e => ({title: e.title, start: e.start})));
        
        if (this.calendar) {
            // Remove all existing events
            this.calendar.removeAllEvents();
            
            // Add events directly instead of using addEventSource
            if (events.length > 0) {
                events.forEach(event => {
                    try {
                        this.calendar.addEvent(event);
                        console.log('✅ Added event to calendar:', event.title);
                    } catch (error) {
                        console.error('❌ Failed to add event:', event.title, error);
                    }
                });
                console.log('📅 Total events added to calendar:', events.length);
                
                // Force calendar to re-render
                this.calendar.render();
            }
        }
    }

    async refreshCalendarData() {
        console.log('Refreshing calendar data - maintaining current view...');
        
        // Store current calendar state
        const currentDate = this.calendar ? this.calendar.getDate() : new Date();
        const currentView = this.calendar ? this.calendar.view.type : 'dayGridMonth';
        
        // Show loading indicator
        const refreshBtn = document.getElementById('refreshCalendar');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Refreshing...</span>';
        }
        
        try {
            // Reload reservations from database
            await this.loadReservations();
            
            // Refresh calendar events without changing view
            this.refreshCalendarEvents();
            
            // Restore calendar state
            if (this.calendar) {
                this.calendar.changeView(currentView);
                this.calendar.gotoDate(currentDate);
            }
            
            console.log('Calendar refreshed successfully - view maintained');
            
        } catch (error) {
            console.error('Error refreshing calendar:', error);
        } finally {
            // Reset refresh button
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i><span>Refresh</span>';
            }
        }
    }

    getCalendarEvents() {
        try {
            // Show ONLY confirmed/approved reservations on calendar
            const confirmedReservations = this.reservations.filter(reservation => 
                reservation.status && (reservation.status.toLowerCase() === 'confirmed' || reservation.status.toLowerCase() === 'approved')
            );
            
            // Show ONLY confirmed events from events table
            const confirmedEvents = this.events.filter(event => 
                event.status && event.status.toLowerCase() === 'confirmed'
            );
            
            console.log('=== EVENTS CALENDAR DEBUG INFO ===');
            console.log('Total reservations from API:', this.reservations.length);
            console.log('All reservation statuses:', this.reservations.map(r => ({id: r.id, status: r.status})));
            console.log('Confirmed/Approved reservations:', confirmedReservations.length);
            console.log('Total events from API:', this.events.length);
            console.log('Confirmed events:', confirmedEvents.length);
            console.log('EVENTS CALENDAR: SHOWING CONFIRMED RESERVATIONS + CONFIRMED EVENTS');
            console.log('=====================================');
            
            // Process confirmed reservations
            const reservationItems = confirmedReservations.map(reservation => {
                try {
                    // Validate required fields - check multiple possible field names
                    const reservationDate = reservation.date || reservation.reservation_date;
                    const reservationTime = reservation.time_slot || reservation.time || reservation.start_time;
                    
                    // Get client name - only use database values, no fallback text
                    const clientName = reservation.contact_name || reservation.full_name || reservation.bride_name || reservation.child_name || reservation.deceased_name || reservation.candidate_name;
                    
                    // Get service type - only use database values
                    const serviceType = reservation.service_type ? 
                        reservation.service_type.charAt(0).toUpperCase() + reservation.service_type.slice(1) : 
                        null;
                    
                    // Processing confirmed/approved reservation only
                    console.log('Events Calendar: Processing reservation:', reservation.id, 'Status:', reservation.status, 'Service:', reservation.service_type);
                    
                    // Skip reservations with missing required data
                    if (!reservationDate || !reservationTime) {
                        console.log('❌ Events Calendar: Skipping reservation - missing date/time:', {
                            id: reservation.id,
                            date: reservationDate,
                            time: reservationTime
                        });
                        return null;
                    }
                    
                    // Skip if missing essential data - no fallbacks for fake data
                    if (!clientName || !serviceType) {
                        console.log('❌ Events Calendar: Skipping reservation with missing client/service:', {
                            id: reservation.id,
                            clientName: clientName,
                            serviceType: serviceType
                        });
                        return null;
                    }
                    
                    const finalClientName = clientName;
                    const finalServiceType = serviceType;
                    
                    // Format time for FullCalendar - need HH:MM format
                    let formattedTime = '';
                    const timeStr = String(reservationTime);
                    
                    // Convert to 24-hour format for FullCalendar
                    if (timeStr.includes('AM') || timeStr.includes('PM')) {
                        // Parse 12-hour format
                        const timeParts = timeStr.replace(/\s*(AM|PM)\s*/i, '').split(':');
                        let hour = parseInt(timeParts[0]);
                        const minutes = timeParts[1] || '00';
                        const isPM = timeStr.toUpperCase().includes('PM');
                        
                        if (isPM && hour !== 12) hour += 12;
                        if (!isPM && hour === 12) hour = 0;
                        
                        formattedTime = `${hour.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
                    } else if (timeStr.includes(':')) {
                        // Already in 24-hour format
                        const parts = timeStr.split(':');
                        const hour = parseInt(parts[0]);
                        const minutes = parts[1] || '00';
                        formattedTime = `${hour.toString().padStart(2, '0')}:${minutes.substring(0, 2).padStart(2, '0')}`;
                    } else {
                        // Assume it's just hour
                        const hour = parseInt(timeStr);
                        if (!isNaN(hour)) {
                            formattedTime = `${hour.toString().padStart(2, '0')}:00`;
                        } else {
                            formattedTime = '09:00'; // Default fallback
                        }
                    }
                    
                    
                    // Determine payment status for styling
                    let paymentStatus = 'pending';
                    if (reservation.payment_status) {
                        paymentStatus = reservation.payment_status.toLowerCase();
                    } else if (reservation.amount_paid && reservation.total_amount) {
                        const amountPaid = parseFloat(reservation.amount_paid);
                        const totalAmount = parseFloat(reservation.total_amount);
                        
                        if (amountPaid >= totalAmount) {
                            paymentStatus = 'paid';
                        } else if (amountPaid > 0) {
                            paymentStatus = 'partial';
                        }
                    } else if (reservation.status === 'confirmed' || reservation.status === 'completed') {
                        paymentStatus = 'paid';
                    }

                    const isPending = reservation.status && reservation.status.toLowerCase() === 'pending';
                    const serviceColor = this.serviceColors[reservation.service_type?.toLowerCase()] || '#6B7280';
                    
                    // Format date properly for FullCalendar
                    const eventStart = `${reservationDate}T${formattedTime}:00`;
                    
                    // Check if time is already in 12-hour format to avoid double formatting
                    const displayTime = reservationTime.includes('AM') || reservationTime.includes('PM') ? 
                        reservationTime : this.formatTime12Hour(reservationTime);
                    
                    // Handle multi-day funeral events (3-day burol)
                    let eventEnd = null;
                    let isFuneral = reservation.service_type?.toLowerCase() === 'funeral';
                    let funeralDuration = '';
                    
                    if (isFuneral && reservation.funeral_start_date && reservation.funeral_end_date) {
                        // Multi-day funeral event
                        const funeralStartDate = reservation.funeral_start_date;
                        const funeralEndDate = reservation.funeral_end_date;
                        
                        // Calculate duration
                        const start = new Date(funeralStartDate);
                        const end = new Date(funeralEndDate);
                        const daysDiff = Math.ceil((end - start) / (1000 * 3600 * 24)) + 1;
                        funeralDuration = `${daysDiff}-day Funeral`;
                        
                        // FullCalendar needs end date to be NEXT day for proper multi-day display
                        const endDateForCalendar = new Date(funeralEndDate);
                        endDateForCalendar.setDate(endDateForCalendar.getDate() + 1);
                        const endDateStr = endDateForCalendar.toISOString().split('T')[0];
                        eventEnd = `${endDateStr}T00:00:00`;
                    }
                    
                    const calendarEvent = {
                        id: reservation.id,
                        title: isFuneral && funeralDuration ? `${displayTime}, ${funeralDuration} - ${finalClientName}, ${finalServiceType}` : `${displayTime}, ${finalClientName}, ${finalServiceType}`,
                        start: isFuneral && reservation.funeral_start_date ? reservation.funeral_start_date : eventStart,
                        end: eventEnd,
                        allDay: isFuneral && reservation.funeral_start_date && reservation.funeral_end_date ? true : false,
                        backgroundColor: '#FFFFFF', // White background
                        borderColor: serviceColor, // Use service color for border
                        textColor: '#000000', // Black text
                        className: 'confirmed-event',
                        extendedProps: {
                            clientName: finalClientName,
                            phone: reservation.contact_phone || reservation.phone || '',
                            serviceType: finalServiceType,
                            time: displayTime, // Display format
                            date: reservationDate,
                            status: reservation.status || 'confirmed',
                            paymentStatus: paymentStatus,
                            serviceColor: serviceColor // Store service color for styling
                        }
                    };
                    
                    console.log('✅ Events Calendar: Created calendar event:', {
                        id: calendarEvent.id,
                        title: calendarEvent.title,
                        start: calendarEvent.start,
                        status: reservation.status
                    });
                    
                    return calendarEvent;
                } catch (eventError) {
                    console.error('Events Calendar: Error processing reservation:', eventError);
                    return null;
                }
            }).filter(event => event !== null);
            
            // Process confirmed events from events table
            const eventItems = confirmedEvents.map(event => {
                try {
                    console.log('Events Calendar: Processing event:', event.id, 'Status:', event.status, 'Type:', event.event_type);
                    
                    // Skip events with missing required data
                    if (!event.event_date || !event.start_time) {
                        console.log('❌ Events Calendar: Skipping event - missing date/time:', {
                            id: event.id,
                            date: event.event_date,
                            time: event.start_time
                        });
                        return null;
                    }
                    
                    // Create calendar event for events table item
                    const eventDate = event.event_date;
                    const eventTime = this.formatTime12Hour(event.start_time);
                    
                    // Get event type color (similar to service colors)
                    const eventTypeColor = this.eventTypeColors[event.event_type?.toLowerCase()] || '#6B7280';
                    
                    // Provide fallback for missing event name
                    const eventName = event.event_name || event.description || 'Church Event';
                    const eventType = event.event_type || 'other';
                    
                    const calendarEvent = {
                        id: `event_${event.id}`,
                        title: `${eventTime}, ${eventName}`,
                        start: `${eventDate}T${event.start_time}`,
                        backgroundColor: '#FFFFFF', // White background (same as reservations)
                        borderColor: eventTypeColor, // Use event type color for border
                        textColor: '#000000', // Black text (same as reservations)
                        className: 'confirmed-event',
                        extendedProps: {
                            type: 'event',
                            eventId: event.id,
                            eventName: eventName,
                            eventType: eventType,
                            description: event.description || 'No description available',
                            time: eventTime,
                            date: eventDate,
                            status: event.status || 'confirmed',
                            assignedPriest: event.assigned_priest,
                            eventTypeColor: eventTypeColor // Store event type color for styling
                        }
                    };
                    
                    console.log('✅ Events Calendar: Created calendar event:', {
                        id: calendarEvent.id,
                        title: calendarEvent.title,
                        start: calendarEvent.start,
                        status: event.status
                    });
                    
                    return calendarEvent;
                } catch (eventError) {
                    console.error('Events Calendar: Error processing event:', eventError);
                    return null;
                }
            }).filter(event => event !== null);
            
            // Combine reservations and events
            const allCalendarItems = [...reservationItems, ...eventItems];
            console.log('Events Calendar: Total calendar items:', allCalendarItems.length, '(Reservations:', reservationItems.length, 'Events:', eventItems.length, ')');
            
            return allCalendarItems;
        } catch (error) {
            console.error('Events Calendar: Error in getCalendarEvents:', error);
            return [];
        }
    }

    // Helper function to format time to 12-hour format
    formatTime12Hour(timeString) {
        if (!timeString) return '';
        
        try {
            // If already in 12-hour format, return as is
            if (timeString.includes('AM') || timeString.includes('PM')) {
                return timeString;
            }
            
            // Parse 24-hour format (e.g., "17:00:00" or "17:00")
            const timeParts = timeString.split(':');
            let hours = parseInt(timeParts[0]);
            const minutes = timeParts[1] || '00';
            
            const ampm = hours >= 12 ? 'PM' : 'AM';
            let displayHours = hours % 12;
            displayHours = displayHours === 0 ? 12 : displayHours;
            
            return `${displayHours}:${minutes.padStart(2, '0')} ${ampm}`;
        } catch (error) {
            return timeString;
        }
    }

    handleDateClick(info) {
        // Debounce rapid clicks (prevent multiple clicks within 300ms)
        const now = Date.now();
        if (now - this.lastClickTime < 300) {
            console.log('Events Calendar: Debouncing rapid click');
            return;
        }
        this.lastClickTime = now;

        // Only handle clicks on actual calendar dates, not on modals or other elements
        if (info.jsEvent && info.jsEvent.target) {
            const clickedElement = info.jsEvent.target;
            // If click is inside a modal, ignore it completely
            if (clickedElement.closest('.modal-overlay')) {
                console.log('Events Calendar: Click inside modal, ignoring');
                return;
            }
        }

        // Prevent multiple modals from opening (but allow form interaction)
        const existingModal = document.getElementById('eventCreationModal');
        if (existingModal) {
            console.log('Events Calendar: Modal already open, ignoring calendar click');
            return;
        }

        // Prevent selection of past dates
        const today = new Date();
        const selectedDate = new Date(info.date);
        
        if (selectedDate < today.setHours(0, 0, 0, 0)) {
            this.showNotification('Cannot select past dates', 'error');
            return;
        }

        // Block Mondays (day 1) - office day off
        if (selectedDate.getDay() === 1) {
            this.showNotification('Events are not available on Mondays (Office Day Off)', 'error');
            return;
        }

        this.selectedDate = info.dateStr;
        console.log('Events Calendar: Date clicked for adding event:', info.dateStr);
        this.showEventCreationModal(info.dateStr);
    }

    handleEventClick(info) {
        console.log('Event clicked:', info.event);
        
        // Check if this is an actual event (from events table) or a reservation
        const isEvent = info.event.extendedProps.type === 'event';
        
        if (isEvent) {
            // This is an actual event - show event details
            const eventData = {
                id: info.event.extendedProps.eventId,
                eventName: info.event.extendedProps.eventName,
                eventType: info.event.extendedProps.eventType,
                description: info.event.extendedProps.description,
                time: info.event.extendedProps.time,
                date: info.event.extendedProps.date,
                status: info.event.extendedProps.status,
                assignedPriest: info.event.extendedProps.assignedPriest
            };
            
            this.showActualEventDetails(eventData);
        } else {
            // This is a reservation - show reservation details
            const eventData = {
                id: info.event.id,
                clientName: info.event.extendedProps.clientName,
                phone: info.event.extendedProps.phone,
                serviceType: info.event.extendedProps.serviceType,
                time: info.event.extendedProps.time,
                date: info.event.extendedProps.date,
                status: info.event.extendedProps.status
            };
            
            this.showEventDetails(eventData);
        }
    }

    handleEventMount(info) {
        // Set the service color CSS variable for the colored dot (for reservations)
        const serviceColor = info.event.extendedProps.serviceColor;
        // Set the event type color CSS variable for the colored dot (for events)
        const eventTypeColor = info.event.extendedProps.eventTypeColor;
        
        if (serviceColor) {
            info.el.style.setProperty('--service-color', serviceColor);
        } else if (eventTypeColor) {
            info.el.style.setProperty('--service-color', eventTypeColor);
        }

        // Add double-click functionality to calendar events
        info.el.addEventListener('dblclick', () => {
            const eventData = {
                id: info.event.id,
                clientName: info.event.extendedProps.clientName,
                phone: info.event.extendedProps.phone,
                serviceType: info.event.extendedProps.serviceType,
                time: info.event.extendedProps.time,
                date: info.event.extendedProps.date,
                status: info.event.extendedProps.status
            };
            
            // Open detailed view modal directly
            this.showEventDetails(eventData);
        });

        // Add right-click context menu
        info.el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, info.event);
        });
    }

    showContextMenu(event, calendarEvent) {
        // Remove existing context menu
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Create context menu
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="view">
                <i class="fas fa-eye"></i> View Details
            </div>
            <div class="context-menu-item" data-action="edit">
                <i class="fas fa-edit"></i> Edit Reservation
            </div>
            <div class="context-menu-item" data-action="confirm" ${calendarEvent.extendedProps.status === 'confirmed' ? 'style="display:none"' : ''}>
                <i class="fas fa-check"></i> Confirm
            </div>
            <div class="context-menu-item" data-action="cancel">
                <i class="fas fa-times"></i> Cancel
            </div>
        `;

        // Position context menu
        contextMenu.style.position = 'absolute';
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';
        contextMenu.style.zIndex = '1000';

        document.body.appendChild(contextMenu);

        // Add event listeners to menu items
        contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleContextAction(action, calendarEvent);
                contextMenu.remove();
            });
        });

        // Remove menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', () => {
                contextMenu.remove();
            }, { once: true });
        }, 100);
    }

    handleContextAction(action, calendarEvent) {
        const eventData = {
            id: calendarEvent.id,
            clientName: calendarEvent.extendedProps.clientName,
            phone: calendarEvent.extendedProps.phone,
            serviceType: calendarEvent.extendedProps.serviceType,
            time: calendarEvent.extendedProps.time,
            date: calendarEvent.extendedProps.date,
            status: calendarEvent.extendedProps.status
        };

        switch (action) {
            case 'view':
                this.showEventDetails(eventData);
                break;
            case 'edit':
                // Open edit modal or redirect to edit page
                this.editReservation(eventData.id);
                break;
            case 'confirm':
                this.confirmReservation(eventData.id);
                break;
            case 'cancel':
                this.cancelReservation(eventData.id);
                break;
        }
    }

    editReservation(reservationId) {
        // Trigger the existing edit functionality from reservation table
        if (window.reservationTableManager) {
            window.reservationTableManager.editReservation(reservationId);
        } else {
            // Fallback: redirect to edit page or show edit modal
            console.log('Edit reservation:', reservationId);
        }
    }

    confirmReservation(reservationId) {
        // Trigger the existing confirm functionality
        if (window.reservationTableManager) {
            window.reservationTableManager.approveReservation(reservationId);
        } else {
            console.log('Confirm reservation:', reservationId);
        }
    }

    cancelReservation(reservationId) {
        // Trigger the existing cancel functionality
        if (window.reservationTableManager) {
            window.reservationTableManager.deleteReservation(reservationId);
        } else {
            console.log('Cancel reservation:', reservationId);
        }
    }

    showDateDetailsModal(dateStr) {
        // Clear form fields
        document.getElementById('contactFirstName').value = '';
        document.getElementById('contactLastName').value = '';
        document.getElementById('contactPhone').value = '';
        document.getElementById('contactEmail').value = '';
        const modal = document.getElementById('dateDetailsModal');
        const title = document.getElementById('dateModalTitle');
        const timeSlotsGrid = document.getElementById('timeSlotsGrid');
        const reservationsList = document.getElementById('reservationsList');

        // Format date for display
        const date = new Date(dateStr);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        title.textContent = `Reservations for ${formattedDate}`;

        // Get reservations for this date (confirmed/approved only - matching calendar display)
        const dayReservations = this.reservations.filter(r => 
            r.date === dateStr && r.status && (r.status.toLowerCase() === 'confirmed' || r.status.toLowerCase() === 'approved')
        );
        
        // Remove duplicate reservations based on time and service
        const uniqueReservations = dayReservations.filter((reservation, index, self) => {
            const reservationTime = reservation.time_slot || reservation.time || reservation.start_time || reservation.reservation_time;
            return index === self.findIndex(r => {
                const rTime = r.time_slot || r.time || r.start_time || r.reservation_time;
                return rTime === reservationTime && r.service_type === reservation.service_type;
            });
        });
        
        // Check for conflicts (multiple reservations at same time)
        const timeSlotCounts = {};
        dayReservations.forEach(r => {
            const timeSlot = r.time_slot;
            timeSlotCounts[timeSlot] = (timeSlotCounts[timeSlot] || 0) + 1;
        });
        
        const hasConflicts = Object.values(timeSlotCounts).some(count => count > 1);
        if (hasConflicts) {
            const dayElement = document.querySelector(`[data-date="${dateStr}"]`);
            if (dayElement) {
                dayElement.classList.add('has-conflict');
            }
        }
        
        // Show capacity indicator
        const availableSlots = this.timeSlots.length - dayReservations.length;
        const dayElement = document.querySelector(`[data-date="${dateStr}"]`);
        if (dayElement && !dayElement.querySelector('.date-capacity')) {
            const capacityEl = document.createElement('div');
            capacityEl.className = 'date-capacity';
            
            if (availableSlots === 0) {
                capacityEl.className += ' full';
                capacityEl.textContent = 'Full';
            } else if (availableSlots <= 3) {
                capacityEl.className += ' limited';
                capacityEl.textContent = `${availableSlots} left`;
            } else {
                capacityEl.className += ' available';
                capacityEl.textContent = `${availableSlots} slots`;
            }
            
            dayElement.appendChild(capacityEl);
        }
        const reservedSlots = dayReservations.map(r => r.time_slot);

        // Generate time slots without service filtering - show ALL slots
        this.generateTimeSlots(dateStr, null, uniqueReservations);

        // Populate existing reservations
        reservationsList.innerHTML = '';
        if (dayReservations.length > 0) {
            dayReservations.forEach(reservation => {
                const reservationElement = this.createReservationElement(reservation);
                reservationsList.appendChild(reservationElement);
            });
        } else {
            reservationsList.innerHTML = '<p class="no-reservations">No reservations for this date</p>';
        }

        modal.style.display = 'flex';
    }

    // Helper method to convert time string to minutes for comparison
    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        
        // Handle "Whole Day" case
        if (timeStr === 'Whole Day') return 480; // 8:00 AM in minutes
        
        // Remove AM/PM and convert to 24-hour format
        let cleanTime = timeStr.replace(/\s*(AM|PM)\s*/i, '');
        const isPM = timeStr.toUpperCase().includes('PM');
        
        const [hours, minutes = 0] = cleanTime.split(':').map(Number);
        let hour24 = hours;
        
        if (isPM && hours !== 12) hour24 += 12;
        if (!isPM && hours === 12) hour24 = 0;
        
        return hour24 * 60 + minutes;
    }

    // Convert 24-hour format (17:00:00) to 12-hour format (5:00 PM)
    convertTo12HourFormat(time24) {
        if (!time24) return '';
        
        // Handle different time formats
        let timeStr = time24.toString();
        
        // If already in 12-hour format, return as is
        if (timeStr.includes('AM') || timeStr.includes('PM')) {
            return timeStr;
        }
        
        // Parse 24-hour format (e.g., "17:00:00" or "17:00")
        const timeParts = timeStr.split(':');
        let hours = parseInt(timeParts[0]);
        const minutes = timeParts[1] || '00';
        
        const ampm = hours >= 12 ? 'PM' : 'AM';
        let displayHours = hours % 12;
        displayHours = displayHours === 0 ? 12 : displayHours;
        
        // Format minutes to always show 2 digits
        const formattedMinutes = minutes.padStart(2, '0');
        
        return `${displayHours}:${formattedMinutes} ${ampm}`;
    }

    // Helper function to convert time string to minutes for calculations
    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        
        const [time, period] = timeStr.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        
        let totalHours = hours;
        if (period === 'PM' && hours !== 12) {
            totalHours += 12;
        } else if (period === 'AM' && hours === 12) {
            totalHours = 0;
        }
        
        return totalHours * 60 + (minutes || 0);
    }

    // Check if a time slot conflicts with 1-hour buffer requirement
    checkTimeBufferConflict(slotTime, selectedDate) {
        // Disable buffer time checking for now to fix the 2PM blocking issue
        return false;
        
        const slotMinutes = this.timeToMinutes(slotTime);
        
        // Get all confirmed and pending reservations for the same date
        const dayReservations = this.reservations.filter(reservation => {
            const reservationDate = new Date(reservation.date || reservation.reservation_date);
            const selectedDateObj = new Date(selectedDate);
            const isSameDate = reservationDate.toDateString() === selectedDateObj.toDateString();
            const status = reservation.status ? reservation.status.toLowerCase() : '';
            return isSameDate && (status === 'confirmed' || status === 'pending');
        });
        
        // Check if any reservation conflicts with 1-hour buffer
        return dayReservations.some(reservation => {
            const reservationTimeStr = reservation.time_slot || reservation.time || reservation.start_time || reservation.reservation_time;
            const reservationMinutes = this.timeToMinutes(reservationTimeStr);
            
            // Check if slot is within 1 hour before or after any reservation
            const timeDifference = Math.abs(slotMinutes - reservationMinutes);
            return timeDifference > 0 && timeDifference <= 60; // Within 1 hour but not the same time
        });
    }

    // Validate if a time slot is still available before submission
    async validateTimeSlotAvailability(selectedDate, selectedTime, serviceType) {
        // Refresh reservations data to get latest state
        await this.loadReservations();
        
        // Check for direct booking conflict
        const directConflict = this.reservations.find(reservation => {
            const reservationDate = new Date(reservation.date || reservation.reservation_date);
            const selectedDateObj = new Date(selectedDate);
            const isSameDate = reservationDate.toDateString() === selectedDateObj.toDateString();
            const isSameTime = (reservation.time_slot === selectedTime || reservation.time === selectedTime);
            const status = reservation.status ? reservation.status.toLowerCase() : '';
            return isSameDate && isSameTime && (status === 'confirmed' || status === 'pending');
        });
        
        if (directConflict) {
            const status = directConflict.status || 'reserved';
            const clientName = directConflict.contact_name || directConflict.full_name || 'Another client';
            return {
                available: false,
                reason: `This time slot is already ${status.toLowerCase()} by ${clientName}. Please select a different time.`
            };
        }
        
        // Check for buffer time conflict
        const hasBufferConflict = this.checkTimeBufferConflict(selectedTime, selectedDate);
        if (hasBufferConflict) {
            return {
                available: false,
                reason: 'This time slot conflicts with the required 1-hour buffer between reservations. Please select a different time.'
            };
        }
        
        // Check service type availability - UPDATED CHURCH SCHEDULE
        const allTimeSlots = [
            // Morning slots (9AM-12PM)
            { time: '9:00 AM', services: ['baptism', 'wedding', 'funeral', 'confirmation'] },
            { time: '10:00 AM', services: ['baptism', 'wedding', 'funeral', 'confirmation'] },
            { time: '11:00 AM', services: ['baptism', 'wedding', 'funeral', 'confirmation'] },
            { time: '12:00 PM', services: ['baptism', 'wedding', 'funeral', 'confirmation'] },
            // Afternoon slots (2PM-5PM)
            { time: '2:00 PM', services: ['baptism', 'wedding', 'funeral', 'confirmation'] },
            { time: '3:00 PM', services: ['baptism', 'wedding', 'funeral', 'confirmation'] },
            { time: '4:00 PM', services: ['baptism', 'wedding', 'funeral', 'confirmation'] },
            { time: '5:00 PM', services: ['baptism', 'wedding', 'funeral', 'confirmation'] }
        ];
        
        const timeSlot = allTimeSlots.find(slot => slot.time === selectedTime);
        if (timeSlot && serviceType && !timeSlot.services.includes(serviceType)) {
            return {
                available: false,
                reason: `${serviceType} service is not available at ${selectedTime}. Please select a different time.`
            };
        }
        
        return {
            available: true,
            reason: 'Time slot is available'
        };
    }

    generateTimeSlots(selectedDate, serviceType = null, reservationsForDate = null) {
        console.log('🏗️ generateTimeSlots called:', {
            selectedDate: selectedDate,
            serviceType: serviceType
        });
        
        // Clear existing time slots first to prevent stacking
        const timeSlotsGrid = document.getElementById('timeSlotsGrid');
        console.log('🔍 Time slots grid found:', timeSlotsGrid ? 'YES' : 'NO');
        
        if (timeSlotsGrid) {
            timeSlotsGrid.innerHTML = '';
            console.log('🧹 Cleared existing time slots');
        } else {
            console.error('❌ timeSlotsGrid not found in DOM!');
            return;
        }

        // Service durations in hours
        const serviceDurations = {
            'wedding': 3,      // 3 hours - ceremony + reception
            'baptism': 1,      // 1 hour - ceremony only
            'funeral': 2,      // 2 hours - service + burial prep
            'confirmation': 1.5 // 1.5 hours - ceremony + blessing
        };

        // Updated time slots: 9-12AM and 2-5PM only
        const allTimeSlots = [
            // Morning slots (9AM-12PM)
            { time: '9:00 AM', capacity: 200, services: ['baptism', 'wedding', 'funeral', 'confirmation'] },
            { time: '10:00 AM', capacity: 200, services: ['baptism', 'wedding', 'funeral', 'confirmation'] },
            { time: '11:00 AM', capacity: 200, services: ['baptism', 'wedding', 'funeral', 'confirmation'] },
            { time: '12:00 PM', capacity: 200, services: ['baptism', 'wedding', 'funeral', 'confirmation'] },
            // Afternoon slots (2PM-5PM)
            { time: '2:00 PM', capacity: 200, services: ['baptism', 'wedding', 'funeral', 'confirmation'] },
            { time: '3:00 PM', capacity: 200, services: ['baptism', 'wedding', 'funeral', 'confirmation'] },
            { time: '4:00 PM', capacity: 200, services: ['baptism', 'wedding', 'funeral', 'confirmation'] },
            { time: '5:00 PM', capacity: 200, services: ['baptism', 'wedding', 'funeral', 'confirmation'] }
        ];
        // Helper function to check if a time slot conflicts with service duration
        const isSlotBlockedByServiceDuration = (slotTime, reservationsToCheck) => {
            return reservationsToCheck.some(reservation => {
                const reservationTime = reservation.time_slot || reservation.time || reservation.start_time || reservation.reservation_time;
                const convertedReservationTime = this.convertTo12HourFormat(reservationTime);
                const serviceType = reservation.service_type || reservation.service || 'baptism';
                const duration = serviceDurations[serviceType] || 1;
                
                // Convert times to minutes for calculation
                const slotMinutes = this.timeToMinutes(slotTime);
                const reservationMinutes = this.timeToMinutes(convertedReservationTime);
                const durationMinutes = duration * 60;
                
                // Check if slot falls within the service duration
                return slotMinutes >= reservationMinutes && slotMinutes < (reservationMinutes + durationMinutes);
            });
        };

        // Process all slots to show available and unavailable ones
        const processedSlots = allTimeSlots.map(slot => {
            // Always show all time slots, don't filter by service type
            const serviceAllowed = true;
            
            // Check if slot is booked or conflicts with buffer time
            const bookingInfo = this.reservations.find(reservation => {
                const reservationDate = new Date(reservation.date || reservation.reservation_date);
                const selectedDateObj = new Date(selectedDate);
                const isSameDate = reservationDate.toDateString() === selectedDateObj.toDateString();
                const isSameTime = (reservation.time_slot === slot.time || reservation.time === slot.time);
                return isSameDate && isSameTime;
            });
            
            // Check for 1-hour buffer conflicts
            const hasBufferConflict = this.checkTimeBufferConflict(slot.time, selectedDate);
            
            return {
                ...slot,
                serviceAllowed,
                bookingInfo,
                hasBufferConflict,
                isAvailable: serviceAllowed && !bookingInfo && !hasBufferConflict
            };
        }).filter(slot => slot !== null);
        
        // Show ALL slots - both available and reserved
        if (processedSlots.length === 0) {
            const noSlots = document.createElement('div');
            noSlots.className = 'no-slots-message';
            noSlots.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <h4>No Time Slots Available</h4>
                <p>No time slots are configured for this service type.</p>
                <p>Please select a different service or date.</p>
            `;
            timeSlotsGrid.appendChild(noSlots);
            return;
        }
        
        // Show ALL slots with proper status indication
        processedSlots.forEach(slotData => {
            const slot = document.createElement('div');
            
            // Use passed reservations or fall back to all reservations
            const reservationsToCheck = reservationsForDate || this.reservations.filter(reservation => {
                const reservationDate = new Date(reservation.date || reservation.reservation_date);
                const selectedDateObj = new Date(selectedDate);
                return reservationDate.toDateString() === selectedDateObj.toDateString();
            });
            
            // Check if this time slot has any existing reservation OR is blocked by service duration
            const hasExistingReservation = reservationsToCheck.some(reservation => {
                const reservationTime = reservation.time_slot || reservation.time || reservation.start_time || reservation.reservation_time;
                const convertedReservationTime = this.convertTo12HourFormat(reservationTime);
                return convertedReservationTime === slotData.time;
            });
            
            // Check if slot is blocked by service duration
            const isBlockedByDuration = isSlotBlockedByServiceDuration(slotData.time, reservationsToCheck);
            
            // Set appropriate class based on availability - prioritize existing reservations and service duration
            if (hasExistingReservation || slotData.bookingInfo) {
                slot.className = 'time-slot reserved';
                slotData.isAvailable = false;
            } else if (isBlockedByDuration) {
                slot.className = 'time-slot reserved';
                slotData.isAvailable = false;
            } else if (slotData.hasBufferConflict) {
                slot.className = 'time-slot reserved';
                slotData.isAvailable = false;
            } else {
                slot.className = 'time-slot available';
                slotData.isAvailable = true;
            }
            
            // Create time display
            const timeElement = document.createElement('div');
            timeElement.className = 'time-slot-time';
            
            // Special handling for funeral (whole day)
            if (serviceType === 'funeral') {
                timeElement.textContent = 'Whole Day';
                slot.dataset.time = 'Whole Day';
            } else {
                timeElement.textContent = slotData.time;
                slot.dataset.time = slotData.time;
            }
            
            // Create status display
            const statusElement = document.createElement('div');
            statusElement.className = 'time-slot-status';
            
            if (slotData.isAvailable) {
                statusElement.innerHTML = '<i class="fas fa-check"></i> Available';
                slot.title = `Available - Capacity: ${slotData.capacity} | Services: ${slotData.services.join(', ')}`;
                
                // Add click handler for available slots only
                slot.addEventListener('click', (e) => {
                    // Prevent ALL event propagation
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    
                    console.log('🔥 TIME SLOT CLICKED!', {
                        time: slotData.time,
                        date: selectedDate,
                        available: slotData.isAvailable,
                        element: e.target,
                        className: e.target.className
                    });
                    
                    // Immediate execution instead of delay
                    console.log('⚡ Immediate execution - calling selectTimeSlot');
                    try {
                        this.selectTimeSlot(slotData.time, selectedDate);
                    } catch (error) {
                        console.error('❌ Error in selectTimeSlot:', error);
                    }
                }, true); // Use capture phase
                
                // Add a simple test handler to verify click detection
                slot.addEventListener('mousedown', (e) => {
                    console.log('👆 MOUSE DOWN on time slot:', slotData.time);
                });
                
                // Make sure the slot is clickable with high z-index
                slot.style.pointerEvents = 'auto';
                slot.style.cursor = 'pointer';
                slot.style.position = 'relative';
                slot.style.zIndex = '1000';
                slot.style.backgroundColor = '#10b981'; // Ensure visibility
                slot.style.border = '2px solid #059669';
                slot.style.borderRadius = '8px';
                slot.style.padding = '12px';
                slot.style.margin = '4px';
                slot.style.transition = 'all 0.2s ease';
                
                // Add hover effects for available slots
                slot.addEventListener('mouseenter', (e) => {
                    console.log('🖱️ MOUSE ENTER on time slot:', slotData.time);
                    slot.style.backgroundColor = '#059669';
                    slot.style.transform = 'scale(1.05)';
                    slot.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                    this.showSlotTooltip(e, slotData, serviceType);
                });
                
                slot.addEventListener('mouseleave', () => {
                    console.log('🖱️ MOUSE LEAVE on time slot:', slotData.time);
                    slot.style.backgroundColor = '#10b981';
                    slot.style.transform = 'scale(1)';
                    slot.style.boxShadow = 'none';
                    this.hideSlotTooltip();
                });
            } else {
                // Show why slot is not available - prioritize existing reservations
                if (hasExistingReservation || slotData.bookingInfo) {
                    statusElement.innerHTML = '<i class="fas fa-times"></i> Reserved';
                    const reservationInfo = reservationsToCheck.find(r => {
                        const reservationTime = r.time_slot || r.time || r.start_time || r.reservation_time;
                        const convertedReservationTime = this.convertTo12HourFormat(reservationTime);
                        return convertedReservationTime === slotData.time;
                    });
                    const reservedBy = reservationInfo ? 
                        (reservationInfo.contact_name || reservationInfo.full_name || reservationInfo.bride_name || reservationInfo.child_name || reservationInfo.deceased_name || reservationInfo.candidate_name || 'Someone') 
                        : 'Someone';
                    slot.title = `Reserved by ${reservedBy}`;
                } else if (isBlockedByDuration) {
                    statusElement.innerHTML = '<i class="fas fa-hourglass-half"></i> Service in Progress';
                    // Find which service is blocking this slot
                    const blockingReservation = reservationsToCheck.find(r => {
                        const reservationTime = r.time_slot || r.time || r.start_time || r.reservation_time;
                        const convertedReservationTime = this.convertTo12HourFormat(reservationTime);
                        const serviceType = r.service_type || r.service || 'baptism';
                        const duration = serviceDurations[serviceType] || 1;
                        const slotMinutes = this.timeToMinutes(slotData.time);
                        const reservationMinutes = this.timeToMinutes(convertedReservationTime);
                        const durationMinutes = duration * 60;
                        return slotMinutes >= reservationMinutes && slotMinutes < (reservationMinutes + durationMinutes);
                    });
                    const serviceType = blockingReservation ? (blockingReservation.service_type || blockingReservation.service || 'service') : 'service';
                    const startTime = blockingReservation ? this.convertTo12HourFormat(blockingReservation.time_slot || blockingReservation.time || blockingReservation.start_time || blockingReservation.reservation_time) : '';
                    slot.title = `Blocked by ${serviceType} service starting at ${startTime}`;
                } else if (slotData.hasBufferConflict) {
                    statusElement.innerHTML = '<i class="fas fa-clock"></i> Buffer Time';
                    slot.title = 'Unavailable due to 1-hour buffer requirement';
                }
                
                // Prevent clicking on reserved slots
                slot.style.cursor = 'not-allowed';
            }
            
            slot.appendChild(timeElement);
            slot.appendChild(statusElement);
            
            console.log('🎯 Adding time slot to grid:', {
                time: slotData.time,
                available: slotData.isAvailable,
                hasClickHandler: slotData.isAvailable ? 'YES' : 'NO'
            });
            
            timeSlotsGrid.appendChild(slot);
        });
        
        // Show summary message
        const totalSlots = processedSlots.length;
        const availableSlots = processedSlots.filter(s => s.isAvailable);
        const bookedCount = processedSlots.filter(s => s.bookingInfo).length;
        const bufferBlockedCount = processedSlots.filter(s => s.hasBufferConflict).length;
        
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'slots-summary';
        summaryDiv.innerHTML = `
            <i class="fas fa-info-circle"></i>
            ${availableSlots.length} available slot(s) | ${bookedCount} reserved | ${bufferBlockedCount} buffer blocked
        `;
        timeSlotsGrid.appendChild(summaryDiv);
    }

    createReservationElement(reservation) {
        const element = document.createElement('div');
        element.className = 'reservation-item';
        
        const serviceIcon = this.getServiceIcon(reservation.service_type);
        const time12 = this.formatTime12Hour(reservation.time_slot);
        
        element.innerHTML = `
            <div class="reservation-header">
                <div class="service-info">
                    <span class="service-icon"><i class="fas ${serviceIcon}"></i></span>
                    <span class="service-type">${reservation.service_type}</span>
                </div>
                <div class="reservation-time">${time12}</div>
            </div>
            <div class="reservation-details">
                <div class="client-name">${reservation.contact_name || reservation.full_name || ''}</div>
                <div class="client-contact">${reservation.contact_phone || reservation.phone || ''}</div>
                ${reservation.contact_email || reservation.email ? `<div class="client-email">${reservation.contact_email || reservation.email}</div>` : ''}
            </div>
        `;
        
        return element;
    }

    selectTimeSlot(timeSlot, date) {
        console.log('🎯 selectTimeSlot called!', {
            timeSlot: timeSlot,
            date: date
        });
        
        this.selectedTimeSlot = timeSlot;
        this.selectedDate = date;
        
        console.log('📅 Closing date details modal...');
        // Close date details modal
        const dateModal = document.getElementById('dateDetailsModal');
        if (dateModal) {
            dateModal.style.display = 'none';
            console.log('✅ Date modal closed');
        } else {
            console.error('❌ Date modal not found!');
        }
        
        console.log('📝 Opening reservation form...');
        // Show reservation form
        try {
            this.showReservationForm(date, timeSlot);
        } catch (error) {
            console.error('❌ Error in showReservationForm:', error);
        }
    }

    async showReservationForm(date, timeSlot) {
        console.log('🚀 showReservationForm called!', {
            date: date,
            timeSlot: timeSlot
        });
        
        // Double-check availability before showing form
        console.log('🔄 Loading reservations...');
        await this.loadReservations();
        
        // Check if slot is still available
        const isDirectlyBooked = this.reservations.some(reservation => {
            const reservationDate = new Date(reservation.date || reservation.reservation_date);
            const selectedDateObj = new Date(date);
            const isSameDate = reservationDate.toDateString() === selectedDateObj.toDateString();
            const isSameTime = (reservation.time_slot === timeSlot || reservation.time === timeSlot);
            const status = reservation.status ? reservation.status.toLowerCase() : '';
            return isSameDate && isSameTime && (status === 'confirmed' || status === 'pending');
        });
        
        if (isDirectlyBooked) {
            this.showNotification('This time slot has been reserved by someone else. Please select a different time.', 'error');
            this.showDateDetailsModal(date);
            return;
        }
        
        // Check buffer conflicts
        const hasBufferConflict = this.checkTimeBufferConflict(timeSlot, date);
        if (hasBufferConflict) {
            this.showNotification('This time slot conflicts with the 1-hour buffer requirement. Please select a different time.', 'error');
            this.showDateDetailsModal(date);
            return;
        }
        
        const modal = document.getElementById('reservationFormModal');
        const dateInput = document.getElementById('reservationDate');
        const timeInput = document.getElementById('reservationTime');
        
        console.log('🔍 Checking modal elements:', {
            modal: modal ? 'Found' : 'NOT FOUND',
            dateInput: dateInput ? 'Found' : 'NOT FOUND',
            timeInput: timeInput ? 'Found' : 'NOT FOUND'
        });
        
        if (!modal) {
            console.error('❌ reservationFormModal not found in DOM!');
            return;
        }
        
        if (dateInput) dateInput.value = date;
        if (timeInput) {
            // timeSlot is already in 12-hour format (e.g., "1:00 PM"), no need to format again
            timeInput.value = timeSlot;
        }
        
        // Reset form
        document.getElementById('reservationForm').reset();
        dateInput.value = date;
        timeInput.value = timeSlot;
        
        // Clear service selection
        document.querySelectorAll('.service-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.getElementById('selectedService').value = '';
        
        // Hide all service-specific fields
        document.getElementById('serviceSpecificFields').style.display = 'none';
        document.querySelectorAll('.service-fields').forEach(field => {
            field.style.display = 'none';
        });
        
        console.log('✅ Showing reservation form modal...');
        modal.style.display = 'flex';
        console.log('🎉 Modal should now be visible!');
    }

    closeReservationModal() {
        const modal = document.getElementById('reservationFormModal');
        if (modal) {
            modal.style.display = 'none';
            console.log('✅ Reservation form modal closed');
        }
    }

    showServiceSpecificFields(serviceType) {
        // First, remove required from ALL service fields to prevent validation issues
        document.querySelectorAll('.service-fields input, .service-fields select, .service-fields textarea').forEach(field => {
            field.removeAttribute('required');
        });
        
        const serviceFieldsContainer = document.getElementById('serviceSpecificFields');
        const allServiceFields = document.querySelectorAll('.service-fields');
        
        // Hide all service fields first
        allServiceFields.forEach(field => {
            field.style.display = 'none';
        });
        
        // Show the container and specific service fields
        serviceFieldsContainer.style.display = 'block';
        
        const targetFields = document.getElementById(`${serviceType}Fields`);
        if (targetFields) {
            targetFields.style.display = 'block';
            
            // Update required fields AFTER showing the fields
            setTimeout(() => {
                this.updateRequiredFields(serviceType);
            }, 100);
        }
    }

    setupTooltips() {
        // Create tooltip element
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'calendar-tooltip';
        this.tooltip.style.display = 'none';
        document.body.appendChild(this.tooltip);

        // Add event listeners for tooltip
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest('.fc-event')) {
                this.showTooltip(e, e.target.closest('.fc-event'));
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.closest('.fc-event')) {
                this.hideTooltip();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.tooltip.style.display === 'block') {
                this.updateTooltipPosition(e);
            }
        });
    }

    showTooltip(event, eventElement) {
        const eventData = eventElement.fcSeg?.eventRange?.def?.extendedProps;
        if (!eventData) return;

        const serviceType = eventData.serviceType?.toLowerCase() || 'wedding';
        this.tooltip.className = `calendar-tooltip ${serviceType}`;

        this.tooltip.innerHTML = `
            <div class="tooltip-header">${eventData.serviceType} - ${eventData.clientName}</div>
            <div class="tooltip-info">
                <div class="tooltip-row">
                    <span class="tooltip-label">Time:</span>
                    <span class="tooltip-value">${eventData.time}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Phone:</span>
                    <span class="tooltip-value">${eventData.phone || 'N/A'}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Status:</span>
                    <span class="status-badge ${eventData.status}">${eventData.status}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Payment:</span>
                    <span class="payment-badge ${eventData.paymentStatus}">${eventData.paymentStatus}</span>
                </div>
            </div>
        `;

        this.tooltip.style.display = 'block';
        this.updateTooltipPosition(event);
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
    }
    
    showSlotTooltip(event, slotData, serviceType) {
        if (!this.slotTooltip) {
            this.slotTooltip = document.createElement('div');
            this.slotTooltip.className = 'slot-tooltip';
            this.slotTooltip.style.cssText = `
                position: fixed;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                z-index: 10000;
                pointer-events: none;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(this.slotTooltip);
        }
        
        let content = '';
        if (serviceType === 'funeral') {
            content = 'Funeral Service - Whole Day Reservation';
        } else {
            content = `Capacity: ${slotData.capacity}<br>Available for: ${slotData.services.join(', ')}`;
        }
        
        this.slotTooltip.innerHTML = content;
        this.slotTooltip.style.display = 'block';
        
        // Position tooltip near cursor
        const rect = this.slotTooltip.getBoundingClientRect();
        let left = event.clientX + 10;
        let top = event.clientY - rect.height - 5;
        
        if (left + rect.width > window.innerWidth) {
            left = event.clientX - rect.width - 10;
        }
        if (top < 0) {
            top = event.clientY + 10;
        }
        
        this.slotTooltip.style.left = left + 'px';
        this.slotTooltip.style.top = top + 'px';
    }
    
    hideSlotTooltip() {
        if (this.slotTooltip) {
            this.slotTooltip.style.display = 'none';
        }
    }

    updateTooltipPosition(event) {
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Position tooltip directly next to mouse cursor with minimal offset
        let left = event.clientX + 2;  // Minimal 2px offset
        let top = event.clientY + 2;   // Minimal 2px offset below cursor

        // Adjust if tooltip goes off screen
        if (left + tooltipRect.width > viewportWidth) {
            left = event.clientX - tooltipRect.width - 2;  // Minimal offset to left
        }
        if (top + tooltipRect.height > viewportHeight) {
            top = event.clientY - tooltipRect.height - 2;  // Minimal offset above
        }
        
        // Ensure tooltip doesn't go off the left edge
        if (left < 2) {
            left = event.clientX + 2;  // Force to right side with minimal offset
        }
        
        // Ensure tooltip doesn't go off the top edge
        if (top < 2) {
            top = event.clientY + 2;  // Force below cursor with minimal offset
        }

        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';
    }

    setupCalendarFilters() {
        // Add filter controls to calendar header
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;

        // Check if filters already exist to avoid duplicates
        if (document.querySelector('.service-legend')) {
            return;
        }

        const filtersHTML = `
            <div class="service-legend">
                <div class="legend-item">
                    <div class="legend-color wedding"></div>
                    <span>Wedding</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color baptism"></div>
                    <span>Baptism</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color funeral"></div>
                    <span>Funeral</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color confirmation"></div>
                    <span>Confirmation</span>
                </div>
            </div>
            <div class="calendar-controls">
                <div class="filter-group">
                    <span class="filter-label">Quick Filters:</span>
                    <div class="filter-buttons">
                        <button class="filter-btn active" data-filter="all">All</button>
                        <button class="filter-btn" data-filter="today">Today</button>
                        <button class="filter-btn" data-filter="week">This Week</button>
                        <button class="filter-btn" data-filter="month">Next 30 Days</button>
                    </div>
                </div>
                <div class="calendar-search">
                    <span class="search-icon">🔍</span>
                    <input type="text" placeholder="Search by client name..." id="calendarSearch">
                </div>
                <div class="export-controls">
                    <button class="export-btn" onclick="calendarSystem.exportToPDF()">Export PDF</button>
                    <button class="export-btn" onclick="calendarSystem.exportToExcel()">Export Excel</button>
                </div>
            </div>
        `;

        calendarEl.insertAdjacentHTML('beforebegin', filtersHTML);

        // Add event listeners for filters
        setTimeout(() => {
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.applyDateFilter(e.target.dataset.filter);
                });
            });

            // Add search functionality
            const searchInput = document.getElementById('calendarSearch');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filterByClientName(e.target.value);
                });
            }
        }, 100);
    }

    applyDateFilter(filter) {
        const today = new Date();
        let startDate, endDate;

        switch (filter) {
            case 'today':
                startDate = new Date(today);
                endDate = new Date(today);
                break;
            case 'week':
                startDate = new Date(today);
                endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(today);
                endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = null;
                endDate = null;
        }

        if (startDate && endDate) {
            this.calendar.gotoDate(startDate);
        }
    }

    filterByClientName(searchTerm) {
        const events = this.calendar.getEvents();
        events.forEach(event => {
            const clientName = event.extendedProps.clientName?.toLowerCase() || '';
            const shouldShow = !searchTerm || clientName.includes(searchTerm.toLowerCase());
            event.setProp('display', shouldShow ? 'auto' : 'none');
        });
    }

    exportToPDF() {
        // Basic PDF export functionality
        window.print();
    }

    exportToExcel() {
        // Convert calendar data to CSV format
        const events = this.calendar.getEvents();
        const csvData = events.map(event => {
            const props = event.extendedProps;
            return [
                props.date,
                props.time,
                props.serviceType,
                props.clientName,
                props.phone,
                props.status,
                props.paymentStatus
            ].join(',');
        });

        const csvContent = 'Date,Time,Service,Client,Phone,Status,Payment\n' + csvData.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `church-reservations-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    setupModalEventListeners() {
        // Date Details Modal event listeners
        const dateModal = document.getElementById('dateDetailsModal');
        const dateModalClose = document.getElementById('dateModalClose');
        
        if (dateModalClose) {
            dateModalClose.addEventListener('click', () => {
                dateModal.style.display = 'none';
            });
        }
        
        if (dateModal) {
            // TEMPORARILY DISABLED - Close modal when clicking on overlay
            // This might be interfering with time slot clicks
            /*
            dateModal.addEventListener('click', (e) => {
                // Don't close if clicking on time slots or any interactive elements
                if (e.target.closest('.time-slot') || 
                    e.target.closest('.modal-content') ||
                    e.target.closest('.time-slots-grid')) {
                    return;
                }
                
                // Only close when clicking directly on the modal background or overlay
                if (e.target === dateModal || e.target.classList.contains('modal-overlay')) {
                    dateModal.style.display = 'none';
                }
            });
            */
            
            // Prevent modal from closing when clicking inside modal content
            const modalContent = dateModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.addEventListener('click', (e) => {
                    // Don't stop propagation for time slots - let them handle their own clicks
                    if (!e.target.closest('.time-slot')) {
                        e.stopPropagation();
                    }
                });
            }
        }

        // Reservation Form Modal event listeners
        const formModal = document.getElementById('reservationFormModal');
        const formModalClose = document.getElementById('formModalClose');
        
        if (formModalClose) {
            formModalClose.addEventListener('click', () => {
                console.log('🚪 Form modal close button clicked');
                formModal.style.display = 'none';
            });
        }
        
        if (formModal) {
            // Close modal when clicking on overlay (but not on modal content)
            formModal.addEventListener('click', (e) => {
                if (e.target === formModal || e.target.classList.contains('modal-overlay')) {
                    console.log('🚪 Form modal overlay clicked - closing');
                    formModal.style.display = 'none';
                }
            });
            
            // Prevent modal from closing when clicking inside modal content
            const formModalContent = formModal.querySelector('.modal-content');
            if (formModalContent) {
                formModalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        }
        
        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (formModal && formModal.style.display === 'flex') {
                    console.log('🚪 Escape key - closing form modal');
                    formModal.style.display = 'none';
                } else if (dateModal && dateModal.style.display === 'flex') {
                    console.log('🚪 Escape key - closing date modal');
                    dateModal.style.display = 'none';
                }
            }
        });
    }

    setupEventListeners() {
        // Calendar refresh button
        const refreshCalendarBtn = document.getElementById('refreshCalendar');
        if (refreshCalendarBtn) {
            refreshCalendarBtn.addEventListener('click', () => {
                this.refreshCalendarData();
            });
        }

        // Modal event listeners
        this.setupModalEventListeners();

        // Service selection in reservation form
        document.querySelectorAll('.service-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.service-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                document.getElementById('selectedService').value = option.dataset.service;
                
                // Show/hide service-specific fields
                this.showServiceSpecificFields(option.dataset.service);
                
                // Update time slots based on selected service
                const currentDate = document.getElementById('reservationDate').value;
                if (currentDate) {
                    this.generateTimeSlots(currentDate, option.dataset.service);
                }
                
                // Update pricing
                this.setPricing(option.dataset.service);
            });
        });
        
        // Client search functionality
        const clientSearch = document.getElementById('clientSearch');
        if (clientSearch) {
            clientSearch.addEventListener('input', (e) => {
                this.searchClients(e.target.value);
            });
            
            // Hide search results when clicking outside
            document.addEventListener('click', (e) => {
                const searchContainer = e.target.closest('.client-search-container');
                if (!searchContainer) {
                    const searchResults = document.getElementById('searchResults');
                    if (searchResults) {
                        searchResults.style.display = 'none';
                    }
                }
            });
            
            // Clear search when input is cleared
            clientSearch.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const searchResults = document.getElementById('searchResults');
                    if (searchResults) {
                        searchResults.style.display = 'none';
                    }
                    clientSearch.blur();
                }
            });
        }
        
        // Payment calculation
        const discountInput = document.getElementById('discount');
        const paymentAmountInput = document.getElementById('paymentAmount');
        
        if (discountInput) {
            discountInput.addEventListener('input', () => {
                this.calculatePayment();
            });
        }
        
        if (paymentAmountInput) {
            paymentAmountInput.addEventListener('input', () => {
                this.updatePaymentStatus();
            });
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.date-details-modal, .reservation-form-modal');
                if (modal) {
                    if (modal.classList.contains('reservation-form-modal')) {
                        // If closing reservation form, go back to date details modal
                        modal.style.display = 'none';
                        document.getElementById('dateDetailsModal').style.display = 'flex';
                    } else {
                        modal.style.display = 'none';
                    }
                }
            });
        });

        // Modal overlay clicks - TEMPORARILY DISABLED FOR DEBUGGING
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                console.log('🚨 OVERLAY CLICKED!', {
                    target: e.target,
                    overlay: overlay,
                    isDirectClick: e.target === overlay
                });
                
                // Only close if clicking directly on the overlay, not on its children
                if (e.target === overlay) {
                    console.log('🔒 Would close modal, but checking...');
                    const modal = overlay.parentElement;
                    if (modal.classList.contains('reservation-form-modal')) {
                        // If clicking overlay on reservation form, go back to date details modal
                        modal.style.display = 'none';
                        document.getElementById('dateDetailsModal').style.display = 'flex';
                    } else {
                        console.log('🔒 Closing date details modal');
                        modal.style.display = 'none';
                    }
                } else {
                    console.log('✋ Not closing - clicked on child element');
                }
            });
        });

        // Cancel reservation button
        document.getElementById('cancelReservation')?.addEventListener('click', () => {
            document.getElementById('reservationFormModal').style.display = 'none';
            document.getElementById('dateDetailsModal').style.display = 'flex';
        });

        // Form submission - REMOVED: Events calendar should not handle reservation submissions
        // Reservation submissions are handled by calendar-reservation.js only

        // Service filter
        document.getElementById('calendarServiceFilter')?.addEventListener('change', (e) => {
            this.filterCalendarByService(e.target.value);
        });

        // Calendar event modal listeners
        this.setupCalendarModalListeners();
    }

    // REMOVED: submitReservation method - Events calendar should not handle reservation submissions
    // All reservation submissions are handled by CalendarReservationSystem in calendar-reservation.js

    async refreshReservations() {
        try {
            const response = await fetch('/api/reservations/all');
            const result = await response.json();

            if (result.success) {
                this.reservations = result.data;
                console.log('Calendar refreshed reservations:', this.reservations.length);
                if (this.calendar) {
                    const events = this.getCalendarEvents();
                    console.log('Refreshing calendar with events:', events.length);
                    this.calendar.removeAllEvents();
                    this.calendar.addEventSource(events);
                }
            } else {
                this.showNotification(result.error || 'Failed to load reservations', 'error');
            }
        } catch (error) {
            console.error('Error loading reservations:', error);
            this.showNotification('Error loading reservations', 'error');
        }
    }

    filterCalendarByService(serviceType) {
        if (serviceType === 'all') {
            if (this.calendar) {
                this.calendar.removeAllEvents();
            }
        } else {
            if (this.calendar) {
                this.calendar.removeAllEvents();
            }
        }
    }

    async showEventDetails(eventData) {
        // Skip API call if no valid ID
        if (!eventData.id || eventData.id === 'undefined') {
            this.showBasicEventDetails(eventData);
            return;
        }

        try {
            // Fetch full reservation details from API
            const response = await fetch(`/api/reservations/${eventData.id}`);
            const result = await response.json();
            
            let fullReservation = eventData;
            if (result.success) {
                fullReservation = result.data;
            }

            // Populate basic information
            document.getElementById('calendar-detail-service').innerHTML = this.getServiceBadgeHTML(fullReservation.service_type || eventData.serviceType);
            document.getElementById('calendar-detail-date').textContent = this.formatDateDisplay(fullReservation.reservation_date || eventData.date);
            document.getElementById('calendar-detail-time').textContent = this.formatTime12Hour(fullReservation.start_time || eventData.time);
            document.getElementById('calendar-detail-status').innerHTML = this.getStatusBadgeHTML(fullReservation.status || 'confirmed');
            
            // Contact information
            const clientName = `${fullReservation.contact_first_name || ''} ${fullReservation.contact_last_name || ''}`.trim() || eventData.clientName || 'N/A';
            document.getElementById('calendar-detail-client').textContent = clientName;
            document.getElementById('calendar-detail-phone').textContent = fullReservation.contact_phone || eventData.phone || '';

            // Populate service-specific details
            this.populateServiceSpecificDetails(fullReservation);

            // Store event data for actions
            const modal = document.getElementById('calendarEventModal');
            modal.setAttribute('data-event-id', fullReservation.id || eventData.id);
            modal.setAttribute('data-service-type', fullReservation.service_type || eventData.serviceType);

            // Show modal
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
        } catch (error) {
            console.error('Error fetching reservation details:', error);
            // Fallback to basic event data
            this.showBasicEventDetails(eventData);
        }
    }

    showBasicEventDetails(eventData) {
        // Fallback method with basic event data
        document.getElementById('calendar-detail-service').innerHTML = this.getServiceBadgeHTML(eventData.serviceType);
        document.getElementById('calendar-detail-date').textContent = this.formatDateDisplay(eventData.date);
        document.getElementById('calendar-detail-time').textContent = this.formatTime12Hour(eventData.time);
        document.getElementById('calendar-detail-status').innerHTML = this.getStatusBadgeHTML(eventData.status || 'confirmed');
        document.getElementById('calendar-detail-client').textContent = eventData.clientName || '';
        document.getElementById('calendar-detail-phone').textContent = eventData.phone || '';
        
        // Clear service-specific details
        document.getElementById('calendar-service-specific-details').innerHTML = '';

        const modal = document.getElementById('calendarEventModal');
        modal.setAttribute('data-event-id', eventData.id);
        modal.setAttribute('data-service-type', eventData.serviceType);
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    async showActualEventDetails(eventData) {
        console.log('Showing actual event details:', eventData);
        
        // Get priest name if assigned
        let priestName = 'Not assigned';
        if (eventData.assignedPriest) {
            try {
                const priestsResponse = await fetch('/api/priests');
                const priestsResult = await priestsResponse.json();
                
                if (priestsResult.success) {
                    const priest = priestsResult.data.find(p => p.id === eventData.assignedPriest);
                    if (priest) {
                        priestName = `${priest.title || 'Father'} ${priest.first_name} ${priest.last_name}`.trim();
                    }
                }
            } catch (error) {
                console.error('Error fetching priest name:', error);
                priestName = 'Assigned Priest';
            }
        }
        
        // Populate the event details modal
        document.getElementById('event-detail-type').innerHTML = this.getEventTypeBadgeHTML(eventData.eventType);
        document.getElementById('event-detail-date').textContent = this.formatDateDisplay(eventData.date);
        document.getElementById('event-detail-time').textContent = eventData.time;
        document.getElementById('event-detail-name').textContent = eventData.eventName || 'N/A';
        document.getElementById('event-detail-priest').textContent = priestName;
        document.getElementById('event-detail-status').innerHTML = this.getEventStatusBadgeHTML(eventData.status || 'confirmed');
        document.getElementById('event-detail-description').textContent = eventData.description || 'No description provided';
        
        // Show the modal
        const modal = document.getElementById('eventDetailsModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Add event listeners for closing the modal
        this.setupEventModalEventListeners();
    }

    getEventTypeBadgeHTML(eventType) {
        const typeConfig = {
            worship: { icon: 'fas fa-praying-hands', label: 'Worship', color: '#8B5CF6' },
            prayer: { icon: 'fas fa-hands', label: 'Prayer', color: '#F59E0B' },
            youth: { icon: 'fas fa-child', label: 'Youth', color: '#3B82F6' },
            outreach: { icon: 'fas fa-hands-helping', label: 'Outreach', color: '#10B981' },
            special: { icon: 'fas fa-star', label: 'Special', color: '#EF4444' },
            'bible-study': { icon: 'fas fa-book', label: 'Bible Study', color: '#8B5CF6' },
            fellowship: { icon: 'fas fa-users', label: 'Fellowship', color: '#10B981' },
            meeting: { icon: 'fas fa-handshake', label: 'Meeting', color: '#F59E0B' },
            other: { icon: 'fas fa-calendar', label: 'Other', color: '#6B7280' }
        };

        const config = typeConfig[eventType] || typeConfig.other;
        return `
            <span class="event-type-badge ${eventType}" style="display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; gap: 6px; background: ${config.color}; color: white; border: 1px solid ${config.color};">
                <i class="${config.icon}"></i>
                ${config.label}
            </span>
        `;
    }

    getEventStatusBadgeHTML(status) {
        const statusConfig = {
            pending: { class: 'pending', label: 'PENDING', color: '#F59E0B' },
            confirmed: { class: 'confirmed', label: 'CONFIRMED', color: '#10B981' },
            cancelled: { class: 'cancelled', label: 'CANCELLED', color: '#EF4444' },
            completed: { class: 'completed', label: 'COMPLETED', color: '#8B5CF6' }
        };

        const config = statusConfig[status] || statusConfig.confirmed;
        return `
            <span class="status-badge ${config.class}" style="display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 15px; font-size: 12px; font-weight: 600; background: ${config.color}; color: white;">
                ${config.label}
            </span>
        `;
    }

    setupEventModalEventListeners() {
        // Close modal event listeners
        const modal = document.getElementById('eventDetailsModal');
        const closeBtn1 = document.getElementById('closeEventDetailsModal');
        const closeBtn2 = document.getElementById('closeEventModal');
        const overlay = modal.querySelector('.modal-overlay');

        const closeModal = () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };

        // Remove existing listeners to prevent duplicates
        closeBtn1.replaceWith(closeBtn1.cloneNode(true));
        closeBtn2.replaceWith(closeBtn2.cloneNode(true));
        overlay.replaceWith(overlay.cloneNode(true));

        // Add new listeners
        document.getElementById('closeEventDetailsModal').addEventListener('click', closeModal);
        document.getElementById('closeEventModal').addEventListener('click', closeModal);
        modal.querySelector('.modal-overlay').addEventListener('click', closeModal);

        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    populateServiceSpecificDetails(reservation) {
        const container = document.getElementById('calendar-service-specific-details');
        if (!container) return;

        const serviceType = reservation.service_type || reservation.serviceType;
        let content = '';

        switch (serviceType?.toLowerCase()) {
            case 'wedding':
                content = `
                    <h4 style="margin: 0 0 16px 0; color: #1e40af; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; position: relative; z-index: 1;">
                        <i class="fas fa-heart" style="color: #ec4899;"></i>
                        Wedding Details
                    </h4>
                    <div style="display: grid; gap: 12px; position: relative; z-index: 1;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #ec4899; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                                <i class="fas fa-female"></i>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Bride</div>
                                <div style="color: #1e293b; font-weight: 600; font-size: 15px;">${reservation.bride_name || 'N/A'}</div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #3b82f6; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                                <i class="fas fa-male"></i>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Groom</div>
                                <div style="color: #1e293b; font-weight: 600; font-size: 15px;">${reservation.groom_name || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'baptism':
                content = `
                    <h4 style="margin: 0 0 16px 0; color: #1e40af; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; position: relative; z-index: 1;">
                        <i class="fas fa-baby" style="color: #06b6d4;"></i>
                        Baptism Details
                    </h4>
                    <div style="display: grid; gap: 12px; position: relative; z-index: 1;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #06b6d4; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                                <i class="fas fa-child"></i>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Child</div>
                                <div style="color: #1e293b; font-weight: 600; font-size: 15px;">${reservation.child_full_name || 'N/A'}</div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #8b5cf6; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                                <i class="fas fa-users"></i>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Parents</div>
                                <div style="color: #1e293b; font-weight: 600; font-size: 15px;">${reservation.father_name || 'N/A'} & ${reservation.mother_maiden_name || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'funeral':
                content = `
                    <h4 style="margin: 0 0 16px 0; color: #1e40af; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; position: relative; z-index: 1;">
                        <i class="fas fa-cross" style="color: #6b7280;"></i>
                        Funeral Details
                    </h4>
                    <div style="display: grid; gap: 12px; position: relative; z-index: 1;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #6b7280; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                                <i class="fas fa-user"></i>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Deceased</div>
                                <div style="color: #1e293b; font-weight: 600; font-size: 15px;">${reservation.deceased_full_name || 'N/A'}</div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #f59e0b; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                                <i class="fas fa-map-marker-alt"></i>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Location</div>
                                <div style="color: #1e293b; font-weight: 600; font-size: 15px;">${reservation.burial_location || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'confirmation':
                content = `
                    <h4 style="margin: 0 0 16px 0; color: #1e40af; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; position: relative; z-index: 1;">
                        <i class="fas fa-praying-hands" style="color: #10b981;"></i>
                        Confirmation Details
                    </h4>
                    <div style="display: grid; gap: 12px; position: relative; z-index: 1;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #10b981; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                                <i class="fas fa-user-graduate"></i>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Confirmand</div>
                                <div style="color: #1e293b; font-weight: 600; font-size: 15px;">${reservation.confirmand_name || 'N/A'}</div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #8b5cf6; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                                <i class="fas fa-hands-helping"></i>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Sponsor</div>
                                <div style="color: #1e293b; font-weight: 600; font-size: 15px;">${reservation.sponsor_name || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                `;
                break;
            default:
                content = '';
        }

        container.innerHTML = content;
    }

    getServiceBadgeHTML(serviceType) {
        const badges = {
            'wedding': '<span class="service-badge service-wedding"><i class="fas fa-heart"></i> Wedding</span>',
            'baptism': '<span class="service-badge service-baptism"><i class="fas fa-baby"></i> Baptism</span>',
            'funeral': '<span class="service-badge service-funeral"><i class="fas fa-cross"></i> Funeral</span>',
            'confirmation': '<span class="service-badge service-confirmation"><i class="fas fa-praying-hands"></i> Confirmation</span>'
        };
        return badges[serviceType] || `<span class="service-badge">${serviceType}</span>`;
    }

    getStatusBadgeHTML(status) {
        const badges = {
            'pending': '<span class="status-badge status-pending">PENDING</span>',
            'confirmed': '<span class="status-badge status-confirmed">CONFIRMED</span>',
            'approved': '<span class="status-badge status-approved">APPROVED</span>',
            'completed': '<span class="status-badge status-completed">COMPLETED</span>',
            'cancelled': '<span class="status-badge status-cancelled">CANCELLED</span>'
        };
        return badges[status] || `<span class="status-badge">${status}</span>`;
    }

    formatDateDisplay(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showSuccessMessage(message) {
        // Use the existing showNotification function with success type
        this.showNotification(message, 'success');
    }

    // Utility functions
    formatTime12Hour(time24) {
        if (!time24 || typeof time24 !== 'string') {
            return 'Invalid Time';
        }
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    getServiceIcon(serviceType) {
        const icons = {
            'wedding': 'fa-ring',
            'baptism': 'fa-water',
            'funeral': 'fa-cross',
            'confirmation': 'fa-hands-praying'
        };
        return icons[serviceType] || 'fa-calendar';
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    setupCalendarModalListeners() {
        // Close modal buttons
        document.getElementById('closeCalendarEventModal')?.addEventListener('click', this.hideCalendarModal);
        document.getElementById('closeCalendarModal')?.addEventListener('click', this.hideCalendarModal);
        
        // Modal overlay click to close
        document.querySelector('#calendarEventModal .modal-overlay')?.addEventListener('click', this.hideCalendarModal);
        
        // Edit reservation button
        document.getElementById('editCalendarReservation')?.addEventListener('click', () => {
            const modal = document.getElementById('calendarEventModal');
            const eventId = modal.getAttribute('data-event-id');
            this.hideCalendarModal();
            // TODO: Implement edit functionality
            alert('Edit functionality coming soon!');
        });
        
        
        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('calendarEventModal');
                if (modal && modal.style.display === 'flex') {
                    this.hideCalendarModal();
                }
            }
        });
    }

    hideCalendarModal() {
        const modal = document.getElementById('calendarEventModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    setPricing(serviceType) {
        const basePrices = {
            wedding: 15000,
            baptism: 0,        // No stipendium for baptism
            funeral: 8000,
            confirmation: 0    // No stipendium for confirmation
        };
        
        const basePrice = basePrices[serviceType] || 0;
        const basePriceInput = document.getElementById('basePrice');
        if (basePriceInput) {
            basePriceInput.value = basePrice;
            this.calculatePayment();
        }
    }
    
    calculatePayment() {
        const basePrice = parseFloat(document.getElementById('basePrice')?.value) || 0;
        const discount = parseFloat(document.getElementById('discount')?.value) || 0;
        
        const discountAmount = (basePrice * discount) / 100;
        const totalAmount = basePrice - discountAmount;
        
        const totalAmountInput = document.getElementById('totalAmount');
        if (totalAmountInput) {
            totalAmountInput.value = totalAmount.toFixed(2);
        }
        
        // Set default payment amount to total if not set
        const paymentAmountInput = document.getElementById('paymentAmount');
        if (paymentAmountInput && !paymentAmountInput.value) {
            paymentAmountInput.value = totalAmount.toFixed(2);
        }
        
        this.updatePaymentStatus();
    }
    
    updatePaymentStatus() {
        const totalAmount = parseFloat(document.getElementById('totalAmount')?.value) || 0;
        const paymentAmount = parseFloat(document.getElementById('paymentAmount')?.value) || 0;
        const paymentStatus = document.getElementById('paymentStatus');
        
        if (!paymentStatus) return;
        
        if (paymentAmount === 0) {
            paymentStatus.value = 'unpaid';
        } else if (paymentAmount < totalAmount) {
            paymentStatus.value = 'partial';
        } else {
            paymentStatus.value = 'paid';
        }
    }
    
    searchClients(query) {
        const searchResults = document.getElementById('searchResults');
        
        if (!searchResults || !query || query.length < 2) {
            if (searchResults) searchResults.style.display = 'none';
            return;
        }
        
        // Show loading state
        searchResults.innerHTML = '<div class="search-loading">Searching clients...</div>';
        searchResults.style.display = 'block';
        
        // Create unique clients map to avoid duplicates
        const uniqueClients = new Map();
        
        this.reservations.forEach(reservation => {
            // Extract client information from different field combinations
            const clientData = this.extractClientData(reservation);
            
            if (clientData.name || clientData.phone || clientData.email) {
                const key = `${clientData.name}-${clientData.phone}-${clientData.email}`;
                if (!uniqueClients.has(key)) {
                    uniqueClients.set(key, {
                        ...clientData,
                        serviceType: reservation.service_type,
                        lastReservation: reservation.date || reservation.reservation_date
                    });
                }
            }
        });
        
        // Filter clients based on query
        const matchingClients = Array.from(uniqueClients.values()).filter(client => {
            const searchText = query.toLowerCase();
            return client.name.toLowerCase().includes(searchText) ||
                   client.phone.toLowerCase().includes(searchText) ||
                   client.email.toLowerCase().includes(searchText);
        });
        
        // Display results
        setTimeout(() => {
            if (matchingClients.length > 0) {
                searchResults.innerHTML = '';
                matchingClients.slice(0, 8).forEach(client => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'search-result-item';
                    resultItem.innerHTML = `
                        <div class="client-info">
                            <strong>${client.name}</strong>
                            <div>${client.phone} | ${client.email}</div>
                            <div style="font-size: 11px; color: #999; margin-top: 2px;">
                                Last: ${client.serviceType} (${new Date(client.lastReservation).toLocaleDateString()})
                            </div>
                        </div>
                    `;
                    
                    resultItem.addEventListener('click', () => {
                        this.fillClientInfo(client);
                        searchResults.style.display = 'none';
                        document.getElementById('clientSearch').value = client.name;
                    });
                    
                    searchResults.appendChild(resultItem);
                });
                searchResults.style.display = 'block';
            } else {
                searchResults.innerHTML = '<div class="no-results">No clients found matching "' + query + '"</div>';
                searchResults.style.display = 'block';
            }
        }, 300); // Small delay to show loading state
    }
    
    extractClientData(reservation) {
        // Extract client name from various fields
        let name = reservation.contact_name || 
                  reservation.bride_name || 
                  reservation.child_name || 
                  reservation.deceased_name || 
                  reservation.candidate_name || 
                  `${reservation.contact_first_name || ''} ${reservation.contact_last_name || ''}`.trim() || 
                  'Unknown Client';
        
        // Extract phone from various fields
        let phone = reservation.contact_phone || 
                   reservation.phone || 
                   reservation.parents_contact || 
                   '';
        
        // Extract email from various fields
        let email = reservation.contact_email || 
                   reservation.email || 
                   '';
        
        return { name, phone, email };
    }
    
    fillClientInfo(client) {
        const nameParts = client.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const firstNameInput = document.getElementById('contactFirstName');
        const lastNameInput = document.getElementById('contactLastName');
        const phoneInput = document.getElementById('contactPhone');
        const emailInput = document.getElementById('contactEmail');
        
        if (firstNameInput) {
            firstNameInput.value = firstName;
            firstNameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (lastNameInput) {
            lastNameInput.value = lastName;
            lastNameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (phoneInput) {
            phoneInput.value = client.phone;
            phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (emailInput) {
            emailInput.value = client.email;
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Show success feedback
        this.showClientFillSuccess(client.name);
    }
    
    showClientFillSuccess(clientName) {
        const searchInput = document.getElementById('clientSearch');
        if (searchInput) {
            const originalBorder = searchInput.style.borderColor;
            searchInput.style.borderColor = '#00b894';
            searchInput.style.boxShadow = '0 0 0 2px rgba(0, 184, 148, 0.2)';
            
            setTimeout(() => {
                searchInput.style.borderColor = originalBorder;
                searchInput.style.boxShadow = '';
            }, 2000);
        }
    }
    
    updateRequiredFields(serviceType) {
        // Remove ALL required attributes from service-specific fields
        document.querySelectorAll('.service-fields input, .service-fields select, .service-fields textarea').forEach(field => {
            field.removeAttribute('required');
            const label = field.closest('.form-group')?.querySelector('label');
            if (label) {
                label.textContent = label.textContent.replace(' *', '');
            }
        });
        
        // Handle payment section visibility - only show for wedding and funeral
        const paymentSection = document.getElementById('paymentSection');
        if (paymentSection) {
            if (serviceType === 'wedding' || serviceType === 'funeral') {
                paymentSection.style.display = 'block';
                // Make payment fields required
                const paymentFields = paymentSection.querySelectorAll('select[name="payment_method"], select[name="payment_type"], input[name="amount_paid"]');
                paymentFields.forEach(field => field.required = true);
            } else {
                paymentSection.style.display = 'none';
                // Remove required from payment fields
                const paymentFields = paymentSection.querySelectorAll('select, input');
                paymentFields.forEach(field => field.required = false);
            }
        }
        
        // Only add required to visible fields of the selected service
        const requiredFields = {
            wedding: ['brideName', 'groomName'],
            baptism: ['childFullName', 'childDateOfBirth', 'fatherName', 'motherName'],
            funeral: ['deceasedName', 'dateOfDeath'],
            confirmation: ['candidateName', 'sponsorName']
        };
        
        const fields = requiredFields[serviceType] || [];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const fieldContainer = field?.closest('.service-fields');
            
            // Only make required if the field exists and its container is visible
            if (field && fieldContainer && fieldContainer.style.display !== 'none') {
                field.setAttribute('required', 'required');
                const label = field.closest('.form-group')?.querySelector('label');
                if (label && !label.textContent.includes(' *')) {
                    label.textContent += ' *';
                }
            }
        });
    }
    
    resetReservationForm() {
        // Remove ALL required attributes first to prevent validation issues
        document.querySelectorAll('.service-fields input, .service-fields select, .service-fields textarea').forEach(field => {
            field.removeAttribute('required');
        });
        
        const form = document.getElementById('reservationForm');
        if (form) {
            form.reset();
        }
        
        // Clear service selection
        document.querySelectorAll('.service-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.getElementById('selectedService').value = '';
        
        // Reset priest selection
        const assignedPriest = document.getElementById('assignedPriest');
        if (assignedPriest) {
            assignedPriest.value = '';
        }
        
        // Hide service-specific fields
        const serviceSpecificFields = document.getElementById('serviceSpecificFields');
        if (serviceSpecificFields) {
            serviceSpecificFields.style.display = 'none';
        }
        
        document.querySelectorAll('.service-fields').forEach(field => {
            field.style.display = 'none';
        });
        
        // Clear search results
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
        
        // Reset pricing
        const basePriceInput = document.getElementById('basePrice');
        const totalAmountInput = document.getElementById('totalAmount');
        const paymentAmountInput = document.getElementById('paymentAmount');
        const paymentStatusInput = document.getElementById('paymentStatus');
        
        if (basePriceInput) basePriceInput.value = '';
        if (totalAmountInput) totalAmountInput.value = '';
        if (paymentAmountInput) paymentAmountInput.value = '';
        if (paymentStatusInput) paymentStatusInput.value = 'unpaid';
    }

    // Get all calendar events (reservations only - no holidays)
    getAllCalendarEvents() {
        const reservationEvents = this.getCalendarEvents();
        
        console.log('=== CALENDAR EVENTS DEBUG ===');
        console.log('Reservation events:', reservationEvents.length);
        console.log('Sample reservation events:', reservationEvents.slice(0, 3));
        console.log('Total events to display:', reservationEvents.length);
        console.log('==============================');
        
        return reservationEvents;
    }

    // Manual refresh method for debugging
    async forceRefresh() {
        console.log('=== FORCE REFRESH CALENDAR ===');
        await this.loadReservations();
        this.refreshCalendarEvents();
        console.log('Calendar force refreshed!');
    }

    // Setup holiday legend
    setupHolidayLegend() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;

        // Check if holiday legend already exists
        if (document.querySelector('.holiday-legend')) {
            return;
        }

        const holidayLegend = this.philippineHolidays.getHolidayLegend();
        const legendHTML = `
            <div class="holiday-legend">
                <h4 class="legend-title">
                    <i class="fas fa-flag-philippines"></i>
                    Philippine Holidays
                </h4>
                <div class="legend-items">
                    ${holidayLegend.map(item => `
                        <div class="legend-item">
                            <div class="legend-color" style="background-color: ${item.color}">
                                <i class="${item.icon}"></i>
                            </div>
                            <span class="legend-label">${item.label}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        calendarEl.insertAdjacentHTML('afterend', legendHTML);
    }

    // Check if date is a Philippine holiday
    isPhilippineHoliday(dateString) {
        return this.philippineHolidays.isHoliday(dateString);
    }

    // Get Philippine holiday info for a date
    getPhilippineHoliday(dateString) {
        return this.philippineHolidays.getHoliday(dateString);
    }

    // Method to sync with Reservations Calendar and Events
    async refresh() {
        console.log('Events Calendar: Syncing with Reservations Calendar and Events...');
        await this.loadReservations(); // This also loads events now
        this.refreshCalendarEvents();
    }

    // Show notification method
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Show event creation modal for adding new events
    showEventCreationModal(dateStr) {
        // Create modal HTML for event creation
        const modalHTML = `
            <div id="eventCreationModal" class="modal-overlay" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;">
                <div class="modal-content" style="background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
                        <h3 style="margin: 0; color: #1f2937; font-size: 18px;">
                            <i class="fas fa-calendar-plus" style="color: #3b82f6; margin-right: 8px;"></i>
                            Add New Event
                        </h3>
                        <button id="closeEventModal" style="background: none; border: none; font-size: 20px; color: #6b7280; cursor: pointer;">&times;</button>
                    </div>
                    
                    <form id="eventCreationForm">
                        <div class="form-group" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Event Date</label>
                            <input type="date" id="eventDate" value="${dateStr}" readonly style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb;">
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Event Name *</label>
                            <input type="text" id="eventName" required style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;" placeholder="Enter event name">
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Event Type *</label>
                            <select id="eventType" required style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                                <option value="">Select Event Type</option>
                                <option value="worship">Worship Service</option>
                                <option value="youth">Youth Activity</option>
                                <option value="community">Community Program</option>
                                <option value="outreach">Outreach Program</option>
                                <option value="special">Special Event</option>
                                <option value="meeting">Meeting</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                            <div class="form-group">
                                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Start Time *</label>
                                <select id="eventStartTime" required style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                                    <option value="">Select Time</option>
                                    <option value="09:00">9:00 AM</option>
                                    <option value="10:00">10:00 AM</option>
                                    <option value="11:00">11:00 AM</option>
                                    <option value="12:00">12:00 PM</option>
                                    <option value="14:00">2:00 PM</option>
                                    <option value="15:00">3:00 PM</option>
                                    <option value="16:00">4:00 PM</option>
                                    <option value="17:00">5:00 PM</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">End Time</label>
                                <select id="eventEndTime" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                                    <option value="">Select End Time</option>
                                    <option value="10:00">10:00 AM</option>
                                    <option value="11:00">11:00 AM</option>
                                    <option value="12:00">12:00 PM</option>
                                    <option value="13:00">1:00 PM</option>
                                    <option value="15:00">3:00 PM</option>
                                    <option value="16:00">4:00 PM</option>
                                    <option value="17:00">5:00 PM</option>
                                    <option value="18:00">6:00 PM</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Assigned Priest *</label>
                            <select id="eventAssignedPriest" required style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                                <option value="">Loading priests...</option>
                            </select>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Description</label>
                            <textarea id="eventDescription" rows="3" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; resize: vertical;" placeholder="Enter event description"></textarea>
                        </div>
                        
                        <div class="form-actions" style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button type="button" id="cancelEventCreation" style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; cursor: pointer;">Cancel</button>
                            <button type="submit" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">Create Event</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Setup event listeners
        this.setupEventCreationListeners();
        
        // Load priests from database
        this.loadPriests();
    }

    // Load priests from database
    async loadPriests() {
        try {
            console.log('Loading priests from database...');
            const response = await fetch('/api/priests');
            const result = await response.json();
            
            const priestSelect = document.getElementById('eventAssignedPriest');
            if (!priestSelect) return;
            
            if (result.success && result.data) {
                // Clear loading option
                priestSelect.innerHTML = '<option value="">Select Priest</option>';
                
                // Add priests from database
                result.data.forEach(priest => {
                    const option = document.createElement('option');
                    option.value = priest.id;
                    option.textContent = `${priest.title || 'Father'} ${priest.first_name} ${priest.last_name}`;
                    priestSelect.appendChild(option);
                });
                
                console.log(`Loaded ${result.data.length} priests`);
            } else {
                // Fallback if API fails
                priestSelect.innerHTML = `
                    <option value="">Select Priest</option>
                    <option value="1">Father Antonio Rodriguez</option>
                    <option value="2">Father Miguel Santos</option>
                    <option value="3">Father Jose Garcia</option>
                    <option value="4">Father Carlos Mendoza</option>
                `;
                console.log('Using fallback priest list');
            }
        } catch (error) {
            console.error('Error loading priests:', error);
            // Fallback if request fails
            const priestSelect = document.getElementById('eventAssignedPriest');
            if (priestSelect) {
                priestSelect.innerHTML = `
                    <option value="">Select Priest</option>
                    <option value="1">Father Antonio Rodriguez</option>
                    <option value="2">Father Miguel Santos</option>
                    <option value="3">Father Jose Garcia</option>
                    <option value="4">Father Carlos Mendoza</option>
                `;
            }
        }
    }

    // Setup event listeners for event creation modal
    setupEventCreationListeners() {
        const modal = document.getElementById('eventCreationModal');
        const closeBtn = document.getElementById('closeEventModal');
        const cancelBtn = document.getElementById('cancelEventCreation');
        const form = document.getElementById('eventCreationForm');
        
        // Close modal handlers
        const closeModal = () => {
            if (modal) {
                modal.remove();
            }
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // Close on overlay click (but not when clicking inside the modal content)
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Prevent modal from closing when clicking inside the modal content
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Ensure all form elements are properly interactive
            const formElements = modalContent.querySelectorAll('input, select, textarea, button');
            formElements.forEach(element => {
                element.style.pointerEvents = 'auto';
                element.style.zIndex = '10001';
            });
        }
        
        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createEvent();
        });
        
        // Close modal with Escape key
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    }

    // Show conflict modal
    showConflictModal(conflict) {
        // Remove any existing conflict modal
        const existingModal = document.getElementById('conflictModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create conflict modal
        const modal = document.createElement('div');
        modal.id = 'conflictModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: fadeIn 0.2s ease-out;
        `;

        modal.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border-radius: 20px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 25px 50px rgba(0,0,0,0.25);
                animation: slideUp 0.3s ease-out;
                overflow: hidden;
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
                    padding: 28px;
                    text-align: center;
                    position: relative;
                ">
                    <div style="
                        font-size: 48px;
                        margin-bottom: 12px;
                    ">⚠️</div>
                    <h3 style="
                        margin: 0;
                        color: white;
                        font-size: 24px;
                        font-weight: 700;
                        text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    ">SCHEDULE CONFLICT!</h3>
                    <button onclick="document.getElementById('conflictModal').remove()" style="
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 18px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        ✕
                    </button>
                </div>

                <!-- Body -->
                <div style="padding: 32px;">
                    <!-- Main Message -->
                    <div style="
                        background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
                        border-left: 4px solid #F59E0B;
                        padding: 20px;
                        border-radius: 12px;
                        margin-bottom: 24px;
                    ">
                        <p style="
                            margin: 0;
                            color: #92400E;
                            font-size: 16px;
                            font-weight: 600;
                            line-height: 1.6;
                        ">${conflict.message}</p>
                    </div>

                    <!-- Conflict Details -->
                    <div style="
                        background: #F1F5F9;
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 24px;
                    ">
                        <h4 style="
                            margin: 0 0 16px 0;
                            color: #334155;
                            font-size: 14px;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        ">Conflicting Reservation:</h4>
                        
                        <div style="display: grid; gap: 12px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="
                                    background: #002b5c;
                                    color: white;
                                    width: 32px;
                                    height: 32px;
                                    border-radius: 8px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 14px;
                                ">📋</div>
                                <div>
                                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Service</div>
                                    <div style="color: #1e293b; font-weight: 600; font-size: 15px;">${conflict.service_type}</div>
                                </div>
                            </div>

                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="
                                    background: #228b22;
                                    color: white;
                                    width: 32px;
                                    height: 32px;
                                    border-radius: 8px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 14px;
                                ">👤</div>
                                <div>
                                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Client</div>
                                    <div style="color: #1e293b; font-weight: 600; font-size: 15px;">${conflict.contact_name}</div>
                                </div>
                            </div>

                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="
                                    background: #d4af37;
                                    color: white;
                                    width: 32px;
                                    height: 32px;
                                    border-radius: 8px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 14px;
                                ">🕐</div>
                                <div>
                                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Time</div>
                                    <div style="color: #1e293b; font-weight: 600; font-size: 15px;">${conflict.time_range}</div>
                                </div>
                            </div>

                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="
                                    background: #6B7280;
                                    color: white;
                                    width: 32px;
                                    height: 32px;
                                    border-radius: 8px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 14px;
                                ">🔖</div>
                                <div>
                                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Reservation ID</div>
                                    <div style="color: #1e293b; font-weight: 600; font-size: 15px;">${conflict.reservation_id}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Suggestion -->
                    <div style="
                        background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%);
                        border-left: 4px solid #3B82F6;
                        padding: 16px;
                        border-radius: 12px;
                        margin-bottom: 24px;
                    ">
                        <p style="
                            margin: 0;
                            color: #1E40AF;
                            font-size: 14px;
                            font-weight: 500;
                        ">💡 ${conflict.suggestion}</p>
                    </div>

                    <!-- Action Button -->
                    <button onclick="document.getElementById('conflictModal').remove()" style="
                        width: 100%;
                        padding: 14px;
                        background: linear-gradient(135deg, #002b5c 0%, #0d1b2a 100%);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        box-shadow: 0 4px 12px rgba(0, 43, 92, 0.3);
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0, 43, 92, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0, 43, 92, 0.3)'">
                        OK, I'll Choose Another Time
                    </button>
                </div>
            </div>

            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            </style>
        `;

        document.body.appendChild(modal);

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Close on ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    // Create new event
    async createEvent() {
        const eventData = {
            event_name: document.getElementById('eventName').value,
            event_type: document.getElementById('eventType').value,
            event_date: document.getElementById('eventDate').value,
            start_time: document.getElementById('eventStartTime').value + ':00',
            end_time: document.getElementById('eventEndTime').value ? document.getElementById('eventEndTime').value + ':00' : null,
            assigned_priest: document.getElementById('eventAssignedPriest').value,
            description: document.getElementById('eventDescription').value
        };
        
        try {
            console.log('Creating event:', eventData);
            
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Event created successfully!', 'success');
                
                // Close modal
                const modal = document.getElementById('eventCreationModal');
                if (modal) {
                    modal.remove();
                }
                
                // Refresh calendar to show new event
                await this.loadReservations(); // This will load both reservations and events
                this.refreshCalendarEvents();
                
                // Also refresh events table if it exists
                if (window.eventsTable && window.eventsTable.loadEvents) {
                    window.eventsTable.loadEvents();
                }
                
            } else {
                // Check if this is a conflict error
                if (response.status === 409 && result.conflict) {
                    // Show conflict modal instead of simple notification
                    this.showConflictModal(result.conflict);
                } else {
                    this.showNotification('Error creating event: ' + (result.error || 'Unknown error'), 'error');
                }
            }
            
        } catch (error) {
            console.error('Error creating event:', error);
            this.showNotification('Error creating event. Please try again.', 'error');
        }
    }
}

// Make EventsCalendarSystem available globally
window.EventsCalendarSystem = EventsCalendarSystem;
