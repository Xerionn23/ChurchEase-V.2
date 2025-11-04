// Modern Calendar-Based Reservation System for ChurchEase
// Implements FullCalendar.js with time slot management and conflict prevention

class CalendarReservationSystem {
    constructor() {
        this.calendar = null;
        this.selectedDate = null;
        this.selectedTimeSlot = null;
        this.reservations = [];
        this.events = []; // Add events array
        this.eventListenersSetup = false; // Flag to prevent duplicate event listeners
        this.isSubmitting = false; // Flag to prevent duplicate submissions
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

        // Event type colors to match events calendar
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
        console.log('Initializing Calendar Reservation System...');
        await this.loadReservations();
        await this.loadPriests(); // Load priests dynamically from database
        this.initializeCalendar();
        this.setupEventListeners();
        this.setupTooltips();
        this.setupCalendarFilters();
        this.setupHolidayLegend();
        console.log('Calendar Reservation System initialized successfully');
        console.log('IMPORTANT: Calendar will show ONLY CONFIRMED/APPROVED reservations');
        console.log('Philippine holidays loaded:', Object.keys(this.philippineHolidays.holidays).length);
        
        // Make this instance globally available for debugging
        window.calendarSystem = this;
        
        // Add test function for debugging time slot selection
        window.testTimeSlotSelection = (time, date) => {
            console.log('🧪 Testing time slot selection:', { time, date });
            this.selectTimeSlot(time || '9:00 AM', date || '2025-10-30');
        };
    }

    async loadReservations() {
        try {
            // Load reservations
            const reservationsResponse = await fetch('/api/reservations/all');
            const reservationsResult = await reservationsResponse.json();
            
            if (reservationsResult.success) {
                this.reservations = reservationsResult.data || [];
                console.log('Loaded reservations:', this.reservations.length);
            } else {
                console.error('Failed to load reservations:', reservationsResult.error);
                this.reservations = [];
            }
            
            // Also load events to display on the same calendar
            try {
                const eventsResponse = await fetch('/api/events');
                const eventsResult = await eventsResponse.json();
                
                if (eventsResult.success) {
                    this.events = eventsResult.data || [];
                    console.log('Loaded events:', this.events.length);
                } else {
                    console.error('Failed to load events:', eventsResult.error);
                    this.events = [];
                }
            } catch (eventsError) {
                console.error('Error loading events:', eventsError);
                this.events = [];
            }
            
        } catch (error) {
            console.error('Error loading reservations:', error);
            this.reservations = [];
            this.events = [];
        }
    }

    async loadPriests() {
        try {
            console.log('Loading priests from database...');
            const response = await fetch('/api/priests');
            const result = await response.json();
            
            if (result.success && result.data) {
                const priestSelect = document.getElementById('assignedPriest');
                if (priestSelect) {
                    // Clear existing options except the first one ("Choose a priest...")
                    priestSelect.innerHTML = '<option value="">Choose a priest...</option>';
                    
                    // Add priests from database
                    result.data.forEach(priest => {
                        const option = document.createElement('option');
                        option.value = priest.id;
                        
                        // Format: "First Last" (name only, no specialization)
                        const priestName = `${priest.first_name} ${priest.last_name}`.trim();
                        option.textContent = priestName;
                        
                        priestSelect.appendChild(option);
                    });
                    
                    console.log(`✅ Loaded ${result.data.length} priest(s) into dropdown`);
                } else {
                    console.warn('Priest select element not found');
                }
            } else {
                console.error('Failed to load priests:', result.error);
            }
        } catch (error) {
            console.error('Error loading priests:', error);
        }
    }

    initializeCalendar() {
        const calendarEl = document.getElementById('fullCalendar');
        if (!calendarEl) {
            console.error('Calendar container not found');
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
            selectable: true,
            selectMirror: true,
            dayMaxEvents: true,
            weekends: true,
            
            // Styling
            themeSystem: 'standard',
            
            // Date click handler
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
        const events = this.getAllCalendarEvents();
        console.log('Refreshing calendar events:', events.length);
        console.log('Events to display:', events.map(e => ({title: e.title, start: e.start})));
        
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
            console.log('🔍 getCalendarEvents: Filtering reservations...');
            console.log('   Total reservations:', this.reservations.length);
            
            // Show ONLY confirmed/approved reservations on calendar
            const confirmedReservations = this.reservations.filter(reservation => {
                const status = reservation.status ? reservation.status.toLowerCase().replace(/\s+/g, '_') : '';
                const isConfirmedOrApproved = status === 'confirmed' || 
                                             status === 'approved' || 
                                             status === 'priest_approved' ||
                                             status === 'priestapproved';
                
                // Log ALL reservations for debugging
                console.log(`   ${isConfirmedOrApproved ? '✅ SHOWING' : '❌ HIDING'} reservation:`, {
                    id: reservation.reservation_id || reservation.id,
                    name: reservation.contact_name || reservation.deceased_name,
                    service: reservation.service_type,
                    status: reservation.status,
                    status_lowercase: status,
                    date: reservation.date || reservation.reservation_date,
                    isConfirmedOrApproved: isConfirmedOrApproved
                });
                
                return isConfirmedOrApproved;
            });
            
            console.log('   Confirmed reservations to show:', confirmedReservations.length);
            
            // Show ONLY confirmed events from events table
            const confirmedEvents = (this.events || []).filter(event => {
                const status = event.status ? event.status.toLowerCase() : '';
                const isConfirmed = status === 'confirmed';
                
                if (!isConfirmed && event.id) {
                    console.log('❌ HIDING event from calendar:', {
                        id: event.id,
                        name: event.event_name,
                        status: event.status,
                        reason: 'Not confirmed'
                    });
                }
                
                return isConfirmed;
            });
            
            console.log('=== CALENDAR DEBUG INFO ===');
            console.log('Total reservations from API:', this.reservations.length);
            console.log('All reservation statuses:', this.reservations.map(r => ({id: r.id, status: r.status})));
            console.log('Confirmed/Approved reservations:', confirmedReservations.length);
            console.log('Total events from API:', (this.events || []).length);
            console.log('Confirmed events:', confirmedEvents.length);
            console.log('SHOWING CONFIRMED RESERVATIONS + CONFIRMED EVENTS');
            console.log('Pending items are NOT shown on calendar');
            console.log('============================');
            
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
                    console.log('Processing reservation:', reservation.id, 'Status:', reservation.status, 'Service:', reservation.service_type);
                    
                    // Skip reservations with missing required data
                    if (!reservationDate || !reservationTime) {
                        console.log('❌ Skipping reservation - missing date/time:', {
                            id: reservation.id,
                            date: reservationDate,
                            time: reservationTime,
                            rawData: {
                                date: reservation.date,
                                reservation_date: reservation.reservation_date,
                                time_slot: reservation.time_slot,
                                time: reservation.time,
                                start_time: reservation.start_time
                            }
                        });
                        return null;
                    }
                    
                    // Skip if missing essential data - no fallbacks for fake data
                    if (!clientName || !serviceType) {
                        console.log('❌ Skipping reservation with missing client/service:', {
                            id: reservation.id,
                            clientName: clientName,
                            serviceType: serviceType,
                            rawData: {
                                contact_name: reservation.contact_name,
                                full_name: reservation.full_name,
                                service_type: reservation.service_type
                            }
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
                    
                    if (isFuneral) {
                        console.log('🕯️ Funeral reservation detected:', {
                            name: finalClientName,
                            funeral_start_date: reservation.funeral_start_date,
                            funeral_end_date: reservation.funeral_end_date,
                            funeral_start_time: reservation.funeral_start_time,
                            funeral_end_time: reservation.funeral_end_time
                        });
                    }
                    
                    if (isFuneral && reservation.funeral_start_date && reservation.funeral_end_date) {
                        // Multi-day funeral event
                        const funeralStartDate = reservation.funeral_start_date;
                        const funeralEndDate = reservation.funeral_end_date;
                        const funeralStartTime = reservation.funeral_start_time || formattedTime;
                        const funeralEndTime = reservation.funeral_end_time || '17:00';
                        
                        // Calculate duration
                        const start = new Date(funeralStartDate);
                        const end = new Date(funeralEndDate);
                        const daysDiff = Math.ceil((end - start) / (1000 * 3600 * 24)) + 1;
                        funeralDuration = `${daysDiff}-day Funeral`;
                        
                        // IMPORTANT: FullCalendar needs end date to be NEXT day for proper multi-day display
                        // If funeral ends on Nov 7, set end to Nov 8 00:00 so it shows on Nov 5, 6, 7
                        const endDateForCalendar = new Date(funeralEndDate);
                        endDateForCalendar.setDate(endDateForCalendar.getDate() + 1);
                        const endDateStr = endDateForCalendar.toISOString().split('T')[0];
                        eventEnd = `${endDateStr}T00:00:00`;
                        
                        console.log('🕯️ Multi-day funeral event:', {
                            name: finalClientName,
                            start: funeralStartDate,
                            end: funeralEndDate,
                            calendarEnd: endDateStr,
                            duration: daysDiff + ' days'
                        });
                    }
                    
                    const calendarEvent = {
                        id: reservation.id,
                        title: isFuneral && funeralDuration ? `${funeralDuration} - ${finalClientName}` : finalClientName,
                        start: isFuneral && reservation.funeral_start_date ? 
                               reservation.funeral_start_date :  // All-day event for multi-day funerals
                               eventStart,
                        end: eventEnd, // Multi-day events will have end date
                        allDay: isFuneral && reservation.funeral_start_date && reservation.funeral_end_date ? true : false,  // Make multi-day funerals all-day events
                        backgroundColor: isPending ? '#F3F4F6' : '#FFFFFF',
                        borderColor: serviceColor,
                        textColor: isPending ? '#666666' : '#000000',
                        className: isPending ? 'pending-event' : 'confirmed-event',
                        extendedProps: {
                            clientName: finalClientName,
                            phone: reservation.contact_phone || reservation.phone || '',
                            serviceType: finalServiceType,
                            time: displayTime,
                            date: reservationDate,
                            status: reservation.status || 'confirmed',
                            paymentStatus: paymentStatus,
                            serviceColor: serviceColor,
                            // Funeral-specific data
                            isFuneral: isFuneral,
                            funeralStartDate: reservation.funeral_start_date,
                            funeralEndDate: reservation.funeral_end_date,
                            funeralStartTime: reservation.funeral_start_time,
                            funeralEndTime: reservation.funeral_end_time,
                            funeralDuration: funeralDuration,
                            funeralServices: {
                                mass: reservation.funeral_mass,
                                rosary: reservation.funeral_rosary,
                                viewing: reservation.funeral_viewing,
                                burial: reservation.funeral_burial
                            }
                        }
                    };
                    
                    console.log('✅ Created calendar event:', {
                        id: calendarEvent.id,
                        title: calendarEvent.title,
                        start: calendarEvent.start,
                        status: reservation.status
                    });
                    
                    return calendarEvent;
                } catch (eventError) {
                    console.error('Error processing reservation:', eventError);
                    return null;
                }
            }).filter(event => event !== null);
            
            // Process confirmed events from events table
            const eventItems = confirmedEvents.map(event => {
                try {
                    console.log('Processing event:', event.id, 'Status:', event.status, 'Type:', event.event_type);
                    
                    // Skip events with missing required data
                    if (!event.event_date || !event.start_time) {
                        console.log('❌ Skipping event - missing date/time:', {
                            id: event.id,
                            date: event.event_date,
                            time: event.start_time
                        });
                        return null;
                    }
                    
                    // Create calendar event for events table item
                    const eventDate = event.event_date;
                    const eventTime = this.formatTime12Hour(event.start_time);
                    
                    // Get event type color
                    const eventTypeColor = this.eventTypeColors[event.event_type?.toLowerCase()] || '#6B7280';
                    
                    const calendarEvent = {
                        id: `event_${event.id}`,
                        title: `${eventTime}, ${event.event_name}`,
                        start: `${eventDate}T${event.start_time}`,
                        backgroundColor: '#FFFFFF', // White background (same as reservations)
                        borderColor: eventTypeColor, // Use event type color for border
                        textColor: '#000000', // Black text (same as reservations)
                        className: 'confirmed-event',
                        extendedProps: {
                            type: 'event',
                            eventId: event.id,
                            eventName: event.event_name,
                            eventType: event.event_type,
                            description: event.description,
                            time: eventTime,
                            date: eventDate,
                            status: event.status,
                            assignedPriest: event.assigned_priest,
                            eventTypeColor: eventTypeColor // Store event type color for styling
                        }
                    };
                    
                    console.log('✅ Created calendar event:', {
                        id: calendarEvent.id,
                        title: calendarEvent.title,
                        start: calendarEvent.start,
                        status: event.status
                    });
                    
                    return calendarEvent;
                } catch (eventError) {
                    console.error('Error processing event:', eventError);
                    return null;
                }
            }).filter(event => event !== null);
            
            // Combine reservations and events
            const allCalendarItems = [...reservationItems, ...eventItems];
            console.log('Total calendar items:', allCalendarItems.length, '(Reservations:', reservationItems.length, 'Events:', eventItems.length, ')');
            
            return allCalendarItems;
        } catch (error) {
            console.error('Error in getCalendarEvents:', error);
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
        // Prevent selection of past dates
        const today = new Date();
        const selectedDate = new Date(info.date);
        
        if (selectedDate < today.setHours(0, 0, 0, 0)) {
            this.showNotification('Cannot select past dates', 'error');
            return;
        }

        // Block Mondays (day 1) - office day off
        if (selectedDate.getDay() === 1) {
            this.showNotification('Reservations are not available on Mondays (Office Day Off)', 'error');
            return;
        }

        this.selectedDate = info.dateStr;
        this.showDateDetailsModal(info.dateStr);
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

        // Get ALL reservations AND events for this date
        console.log('📅 Date clicked:', dateStr);
        console.log('📋 Total reservations loaded:', this.reservations.length);
        console.log('📋 Total events loaded:', this.events.length);
        console.log('All reservation dates:', this.reservations.map(r => r.date));
        console.log('All event dates:', this.events.map(e => e.event_date));
        
        // Filter APPROVED/CONFIRMED reservations for this date only
        const dayReservations = this.reservations.filter(r => {
            // Handle both date formats: "2025-10-30" and "2025-10-30T00:00:00"
            const reservationDate = r.date ? r.date.split('T')[0] : '';
            const dateMatches = reservationDate === dateStr;
            
            // ONLY include approved/confirmed reservations for blocking time slots
            const isApprovedOrConfirmed = r.status === 'approved' || 
                                         r.status === 'confirmed' ||
                                         r.status === 'priest_approved';
            
            if (dateMatches && isApprovedOrConfirmed) {
                console.log('✅ APPROVED Reservation match:', r.contact_name, 'Date:', r.date, 'Status:', r.status);
            } else if (dateMatches && !isApprovedOrConfirmed) {
                console.log('⏳ PENDING Reservation (not blocking):', r.contact_name, 'Status:', r.status);
            }
            
            return dateMatches && isApprovedOrConfirmed;
        });
        
        // Filter events for this date
        const dayEvents = this.events.filter(e => {
            const eventDate = e.event_date ? e.event_date.split('T')[0] : '';
            const matches = eventDate === dateStr;
            if (matches) {
                console.log('✅ Event match found:', e.event_name, 'Date:', e.event_date, 'Status:', e.status);
            }
            return matches;
        });
        
        console.log('📋 Reservations found for this date:', dayReservations.length);
        console.log('📋 Events found for this date:', dayEvents.length);
        
        if (dayReservations.length > 0) {
            console.log('Reservation details:', dayReservations.map(r => ({
                name: r.contact_name,
                time: r.time_slot || r.time,
                status: r.status,
                service: r.service_type,
                date: r.date
            })));
        }
        
        if (dayEvents.length > 0) {
            console.log('Event details:', dayEvents.map(e => ({
                name: e.event_name,
                time: e.start_time,
                status: e.status,
                type: e.event_type,
                date: e.event_date
            })));
        }
        
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

        // Combine reservations and events for time slot blocking
        const allBookingsForDate = [...uniqueReservations, ...dayEvents];
        console.log('📅 Total bookings for time slot check:', allBookingsForDate.length);

        // Generate time slots without service filtering - show ALL slots
        this.generateTimeSlots(dateStr, null, allBookingsForDate);

        // Populate existing reservations AND events
        reservationsList.innerHTML = '';
        console.log('📝 Populating existing reservations section...');
        console.log('Day reservations to display:', dayReservations.length);
        console.log('Day events to display:', dayEvents.length);
        
        const totalItems = dayReservations.length + dayEvents.length;
        
        if (totalItems > 0) {
            console.log('✅ Displaying', dayReservations.length, 'reservations and', dayEvents.length, 'events');
            
            // Display reservations
            dayReservations.forEach((reservation, index) => {
                console.log(`  R${index + 1}. ${reservation.contact_name} - ${reservation.time_slot || reservation.time} - ${reservation.service_type}`);
                const reservationElement = this.createReservationElement(reservation);
                if (reservationElement) {
                    reservationsList.appendChild(reservationElement);
                } else {
                    console.error('❌ Failed to create element for reservation:', reservation);
                }
            });
            
            // Display events
            dayEvents.forEach((event, index) => {
                console.log(`  E${index + 1}. ${event.event_name} - ${event.start_time} - ${event.event_type}`);
                const eventElement = this.createEventElement(event);
                if (eventElement) {
                    reservationsList.appendChild(eventElement);
                } else {
                    console.error('❌ Failed to create element for event:', event);
                }
            });
        } else {
            console.log('❌ No reservations or events to display');
            reservationsList.innerHTML = '<p class="no-reservations">No reservations or events for this date</p>';
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
        
        // Get ONLY approved/confirmed reservations for the same date
        const dayReservations = this.reservations.filter(reservation => {
            const reservationDate = new Date(reservation.date || reservation.reservation_date);
            const selectedDateObj = new Date(selectedDate);
            const isSameDate = reservationDate.toDateString() === selectedDateObj.toDateString();
            const status = reservation.status ? reservation.status.toLowerCase() : '';
            
            // ONLY check approved/confirmed reservations for buffer conflicts
            const isApprovedOrConfirmed = status === 'confirmed' || 
                                         status === 'approved' || 
                                         status === 'priest_approved';
            
            return isSameDate && isApprovedOrConfirmed;
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

    // Check if new funeral dates overlap with existing funerals
    checkFuneralOverlap(newStartDate, newEndDate) {
        console.log('🕯️ Checking funeral overlap:', { newStartDate, newEndDate });
        
        const newStart = new Date(newStartDate);
        const newEnd = new Date(newEndDate);
        
        // Check all existing approved/confirmed funerals
        const existingFunerals = this.reservations.filter(r => {
            const status = r.status ? r.status.toLowerCase().replace(/\s+/g, '_') : '';
            const isApproved = status === 'confirmed' || status === 'approved' || status === 'priest_approved';
            const isFuneral = r.service_type?.toLowerCase() === 'funeral';
            const hasDateRange = r.funeral_start_date && r.funeral_end_date;
            
            return isApproved && isFuneral && hasDateRange;
        });
        
        console.log(`   Found ${existingFunerals.length} existing funerals to check`);
        
        // Check each existing funeral for overlap
        for (const funeral of existingFunerals) {
            const existingStart = new Date(funeral.funeral_start_date);
            const existingEnd = new Date(funeral.funeral_end_date);
            
            // Check if date ranges overlap
            // Overlap occurs if: (newStart <= existingEnd) AND (newEnd >= existingStart)
            const overlaps = (newStart <= existingEnd) && (newEnd >= existingStart);
            
            if (overlaps) {
                console.log('❌ FUNERAL OVERLAP DETECTED:', {
                    existing: `${funeral.funeral_start_date} to ${funeral.funeral_end_date}`,
                    new: `${newStartDate} to ${newEndDate}`,
                    contact: funeral.contact_name
                });
                
                return {
                    start: funeral.funeral_start_date,
                    end: funeral.funeral_end_date,
                    contact: funeral.contact_name
                };
            }
        }
        
        console.log('✅ No funeral overlap detected');
        return null;
    }

    // Validate if a time slot is still available before submission
    async validateTimeSlotAvailability(selectedDate, selectedTime, serviceType) {
        // Use existing reservations data - no need to reload (already loaded on calendar init)
        // await this.loadReservations(); // REMOVED: Unnecessary API call that slows down submission
        
        // Service durations in hours
        const serviceDurations = {
            'wedding': 3,      // 3 hours
            'baptism': 1,      // 1 hour
            'funeral': 2,      // 2 hours
            'confirmation': 1.5 // 1.5 hours
        };
        
        const selectedDuration = serviceDurations[serviceType] || 1;
        const selectedMinutes = this.timeToMinutes(selectedTime);
        
        // Get ONLY approved/confirmed reservations for the selected date
        // SKIP FUNERALS - they don't block time slots
        const reservationsOnDate = this.reservations.filter(reservation => {
            const reservationDate = new Date(reservation.date || reservation.reservation_date);
            const selectedDateObj = new Date(selectedDate);
            const isSameDate = reservationDate.toDateString() === selectedDateObj.toDateString();
            const status = reservation.status ? reservation.status.toLowerCase() : '';
            
            // ONLY check approved/confirmed reservations for conflicts
            const isApprovedOrConfirmed = status === 'confirmed' || 
                                         status === 'approved' || 
                                         status === 'priest_approved';
            
            // SKIP FUNERAL RESERVATIONS - they don't block time slots
            const isFuneral = reservation.service_type?.toLowerCase() === 'funeral';
            if (isFuneral) {
                console.log('🕯️ SKIPPING funeral for conflict check:', reservation.contact_name);
                return false;
            }
            
            if (isSameDate && !isApprovedOrConfirmed) {
                console.log('⏳ IGNORING pending/waiting reservation for conflict check:', {
                    name: reservation.contact_name,
                    status: reservation.status,
                    time: reservation.time_slot || reservation.time
                });
            }
            
            return isSameDate && isApprovedOrConfirmed;
        });
        
        // Check for direct booking conflict
        const directConflict = reservationsOnDate.find(reservation => {
            const isSameTime = (reservation.time_slot === selectedTime || reservation.time === selectedTime);
            return isSameTime;
        });
        
        if (directConflict) {
            const status = directConflict.status || 'reserved';
            const clientName = directConflict.contact_name || directConflict.full_name || 'Another client';
            return {
                available: false,
                reason: `This time slot is already ${status.toLowerCase()} by ${clientName}. Please select a different time.`,
                conflictType: 'direct'
            };
        }
        
        // Check for service duration conflicts
        for (const reservation of reservationsOnDate) {
            const reservationTime = reservation.time_slot || reservation.time || reservation.start_time || reservation.reservation_time;
            const reservationMinutes = this.timeToMinutes(this.convertTo12HourFormat(reservationTime));
            const reservationServiceType = reservation.service_type || reservation.service || 'baptism';
            const reservationDuration = serviceDurations[reservationServiceType] || 1;
            const reservationDurationMinutes = reservationDuration * 60;
            
            // Check if selected time slot falls within existing reservation's duration
            const selectedEndMinutes = selectedMinutes + (selectedDuration * 60);
            const reservationEndMinutes = reservationMinutes + reservationDurationMinutes;
            
            // Conflict if:
            // 1. Selected start time is during existing reservation
            // 2. Selected end time is during existing reservation
            // 3. Selected reservation completely overlaps existing reservation
            const startsWithinExisting = selectedMinutes >= reservationMinutes && selectedMinutes < reservationEndMinutes;
            const endsWithinExisting = selectedEndMinutes > reservationMinutes && selectedEndMinutes <= reservationEndMinutes;
            const overlapsExisting = selectedMinutes <= reservationMinutes && selectedEndMinutes >= reservationEndMinutes;
            
            if (startsWithinExisting || endsWithinExisting || overlapsExisting) {
                const clientName = reservation.contact_name || reservation.full_name || 'Another client';
                const reservationTimeFormatted = this.convertTo12HourFormat(reservationTime);
                return {
                    available: false,
                    reason: `Schedule conflict! ${clientName} has a ${reservationServiceType} reservation at ${reservationTimeFormatted} (${reservationDuration} hours). Your ${serviceType} service (${selectedDuration} hours) would overlap with this reservation.`,
                    conflictType: 'duration',
                    conflictingReservation: {
                        clientName,
                        serviceType: reservationServiceType,
                        time: reservationTimeFormatted,
                        duration: reservationDuration
                    }
                };
            }
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
                reason: `${serviceType} service is not available at ${selectedTime}. Please select a different time.`,
                conflictType: 'service_unavailable'
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
                // SKIP FUNERAL RESERVATIONS - they don't block time slots
                const isFuneral = reservation.service_type?.toLowerCase() === 'funeral';
                if (isFuneral) {
                    return false; // Funerals don't block
                }
                
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
            
            // Check if slot is booked by APPROVED/CONFIRMED reservations only
            // IMPORTANT: Funerals DON'T block other services (multi-day, other services can still reserve)
            const bookingInfo = this.reservations.find(reservation => {
                // Normalize dates to YYYY-MM-DD format for comparison
                const reservationDate = reservation.date ? reservation.date.split('T')[0] : '';
                const selectedDateNormalized = selectedDate.split('T')[0];
                const isSameDate = reservationDate === selectedDateNormalized;
                
                // ONLY check approved/confirmed reservations
                const isApprovedOrConfirmed = reservation.status === 'approved' || 
                                             reservation.status === 'confirmed' ||
                                             reservation.status === 'priest_approved';
                
                // Normalize time for comparison
                const reservationTime = this.convertTo12HourFormat(reservation.time_slot || reservation.time);
                const isSameTime = reservationTime === slot.time;
                
                // SKIP FUNERAL RESERVATIONS - they don't block time slots
                const isFuneral = reservation.service_type?.toLowerCase() === 'funeral';
                if (isFuneral) {
                    console.log('🕯️ Funeral reservation DOES NOT BLOCK time slots:', reservation.contact_name);
                    return false; // Funerals don't block
                }
                
                if (isSameDate && isSameTime) {
                    if (isApprovedOrConfirmed) {
                        console.log('🚫 Slot BLOCKED:', slot.time, 'by APPROVED reservation:', reservation.contact_name, 'Status:', reservation.status);
                    } else {
                        console.log('⏳ Slot NOT BLOCKED:', slot.time, 'pending reservation:', reservation.contact_name, 'Status:', reservation.status);
                    }
                }
                
                return isSameDate && isSameTime && isApprovedOrConfirmed;
            });
            
            // Check for 1-hour buffer conflicts
            const hasBufferConflict = this.checkTimeBufferConflict(slot.time, selectedDate);
            
            // DEBUG: Log bookingInfo
            if (bookingInfo) {
                console.log(`📋 Slot ${slot.time} has bookingInfo:`, {
                    service: bookingInfo.service_type,
                    name: bookingInfo.contact_name,
                    status: bookingInfo.status
                });
            }
            
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
            
            // Use passed reservations or fall back to APPROVED/CONFIRMED reservations only
            const reservationsToCheck = reservationsForDate || this.reservations.filter(reservation => {
                // Normalize dates to YYYY-MM-DD format for comparison
                const reservationDate = reservation.date ? reservation.date.split('T')[0] : '';
                const selectedDateNormalized = selectedDate.split('T')[0];
                const dateMatches = reservationDate === selectedDateNormalized;
                
                // ONLY block time slots for APPROVED or CONFIRMED reservations
                const isApprovedOrConfirmed = reservation.status === 'approved' || 
                                             reservation.status === 'confirmed' ||
                                             reservation.status === 'priest_approved';
                
                return dateMatches && isApprovedOrConfirmed;
            });
            
            // DEBUG: Log what reservations are being checked for this date
            console.log(`📊 Checking ${reservationsToCheck.length} reservations for ${selectedDate}:`, 
                reservationsToCheck.map(r => ({
                    time: r.time_slot || r.time,
                    status: r.status,
                    name: r.contact_name
                }))
            );
            
            // Check if this time slot has any existing APPROVED/CONFIRMED reservation OR event
            // SKIP FUNERALS - they don't block time slots
            const hasExistingReservation = reservationsToCheck.some(item => {
                // SKIP FUNERAL RESERVATIONS - they don't block time slots
                const isFuneral = item.service_type?.toLowerCase() === 'funeral';
                if (isFuneral) {
                    return false; // Funerals don't block
                }
                
                // Handle both reservations (time_slot) and events (start_time)
                const itemTime = item.time_slot || item.time || item.start_time || item.reservation_time;
                const convertedItemTime = this.convertTo12HourFormat(itemTime);
                const matches = convertedItemTime === slotData.time;
                
                if (matches) {
                    const itemType = item.event_name ? 'EVENT' : 'RESERVATION';
                    const itemName = item.event_name || item.contact_name || 'Unknown';
                    const status = item.status || 'N/A';
                    console.log(`🚫 Time slot ${slotData.time} BLOCKED by ${itemType}: ${itemName} (Status: ${status})`);
                }
                
                return matches;
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

    createEventElement(event) {
        const element = document.createElement('div');
        element.className = 'reservation-item event-item';
        
        const eventIcon = this.getEventIcon(event.event_type);
        const time12 = this.formatTime12Hour(event.start_time);
        
        element.innerHTML = `
            <div class="reservation-header">
                <div class="service-info">
                    <span class="service-icon" style="background: linear-gradient(135deg, #1e40af 0%, #0369a1 100%);"><i class="fas ${eventIcon}"></i></span>
                    <span class="service-type" style="color: #1e40af;">Event: ${event.event_type}</span>
                </div>
                <div class="reservation-time">${time12}</div>
            </div>
            <div class="reservation-details">
                <div class="client-name">${event.event_name}</div>
                <div class="client-contact">${event.description || 'No description'}</div>
            </div>
        `;
        
        return element;
    }

    getEventIcon(eventType) {
        const icons = {
            'worship': 'fa-church',
            'prayer': 'fa-praying-hands',
            'youth': 'fa-users',
            'outreach': 'fa-hands-helping',
            'special': 'fa-star',
            'bible-study': 'fa-book-bible',
            'fellowship': 'fa-handshake',
            'meeting': 'fa-users-cog',
            'other': 'fa-calendar-alt'
        };
        return icons[eventType] || 'fa-calendar-alt';
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
        
        // Skip reload - data is already fresh from modal opening
        // await this.loadReservations(); // REMOVED - causes delay
        
        // Check if slot is still available - ONLY check approved/confirmed reservations
        const isDirectlyBooked = this.reservations.some(reservation => {
            const reservationDate = new Date(reservation.date || reservation.reservation_date);
            const selectedDateObj = new Date(date);
            const isSameDate = reservationDate.toDateString() === selectedDateObj.toDateString();
            const isSameTime = (reservation.time_slot === timeSlot || reservation.time === timeSlot);
            const status = reservation.status ? reservation.status.toLowerCase() : '';
            
            // ONLY check approved/confirmed reservations for booking conflicts
            const isApprovedOrConfirmed = status === 'confirmed' || 
                                         status === 'approved' || 
                                         status === 'priest_approved';
            
            return isSameDate && isSameTime && isApprovedOrConfirmed;
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

        // Check if this is an event (not a reservation)
        const isEvent = eventData.type === 'event';
        
        // Provide fallbacks for missing data
        const serviceType = eventData.serviceType || eventData.eventType || 'event';
        const clientName = eventData.clientName || eventData.eventName || 'Church Event';
        const phone = eventData.phone || 'N/A';
        const status = eventData.status || 'confirmed';
        const paymentStatus = eventData.paymentStatus || (isEvent ? 'N/A' : 'Pending');
        const time = eventData.time || '';
        
        this.tooltip.className = `calendar-tooltip ${serviceType.toLowerCase()}`;

        this.tooltip.innerHTML = `
            <div class="tooltip-header">${serviceType} - ${clientName}</div>
            <div class="tooltip-info">
                <div class="tooltip-row">
                    <span class="tooltip-label">Time:</span>
                    <span class="tooltip-value">${time}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Status:</span>
                    <span class="status-badge ${status}">${status.toUpperCase()}</span>
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

        // Position tooltip directly at mouse cursor - no offset
        let left = event.pageX + 10;  // 10px to the right of cursor
        let top = event.pageY - tooltipRect.height - 10;  // 10px above cursor

        // Adjust if tooltip goes off screen to the right
        if (left + tooltipRect.width > viewportWidth) {
            left = event.pageX - tooltipRect.width - 10;  // Show to the left
        }
        
        // Adjust if tooltip goes off screen at the top
        if (top < window.scrollY) {
            top = event.pageY + 10;  // Show below cursor
        }
        
        // Ensure tooltip doesn't go off the left edge
        if (left < window.scrollX) {
            left = event.pageX + 10;  // Force to right side
        }

        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';
        this.tooltip.style.position = 'absolute';  // Use absolute positioning
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
        // Prevent duplicate event listener setup
        if (this.eventListenersSetup) {
            console.log('Event listeners already setup, skipping...');
            return;
        }
        
        console.log('Setting up event listeners...');
        
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

        // Form submission
        document.getElementById('reservationForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('📝 Form submit event triggered');
            
            // Check service selection BEFORE calling submitReservation
            const selectedService = document.getElementById('selectedService').value;
            console.log('🔍 Service selected:', selectedService);
            
            if (!selectedService) {
                console.log('❌ No service selected - showing warning modal');
                this.showWarningModal(
                    'Service Type Required',
                    'Please select a service type (Wedding, Baptism, Funeral, or Confirmation) before submitting the reservation.',
                    'warning'
                );
                return; // Stop form submission
            }
            
            this.submitReservation();
        });

        // Service filter
        document.getElementById('calendarServiceFilter')?.addEventListener('change', (e) => {
            this.filterCalendarByService(e.target.value);
        });

        // Calendar event modal listeners
        this.setupCalendarModalListeners();
        
        // Mark event listeners as setup to prevent duplicates
        this.eventListenersSetup = true;
        console.log('Event listeners setup completed');
    }

    async submitReservation(event) {
        if (event) event.preventDefault();
        
        // Prevent duplicate submissions
        if (this.isSubmitting) {
            console.log('⚠️ Submission already in progress, ignoring duplicate request');
            return;
        }
        
        this.isSubmitting = true;
        console.log('🚀 Starting reservation submission...');
        
        // Show loading state on submit button (optimized - minimal DOM updates)
        const submitBtn = document.getElementById('submitReservation');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        
        const form = document.getElementById('reservationForm');
        
        // Check if required fields are filled
        const selectedService = document.getElementById('selectedService').value;
        const reservationDate = document.getElementById('reservationDate').value;
        const reservationTime = document.getElementById('reservationTime').value;
        const contactFirstName = document.getElementById('contactFirstName').value;
        const contactLastName = document.getElementById('contactLastName').value;
        const contactPhone = document.getElementById('contactPhone').value;
        const assignedPriest = document.getElementById('assignedPriest').value;
        
        console.log('Form validation check:');
        console.log('selectedService:', selectedService);
        console.log('reservationDate:', reservationDate);
        console.log('reservationTime:', reservationTime);
        console.log('contactFirstName:', contactFirstName);
        console.log('contactLastName:', contactLastName);
        console.log('contactPhone:', contactPhone);
        console.log('assignedPriest:', assignedPriest);
        
        if (!selectedService) {
            // Show warning modal instead of just notification
            this.showWarningModal(
                'Service Type Required',
                'Please select a service type (Wedding, Baptism, Funeral, or Confirmation) before submitting the reservation.',
                'warning'
            );
            this.isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }
        
        if (!reservationDate) {
            this.showNotification('Please select a date', 'error');
            this.isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }
        
        if (!reservationTime) {
            this.showNotification('Please select a time slot', 'error');
            this.isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }
        
        if (!contactFirstName || !contactLastName || !contactPhone) {
            this.showNotification('Please fill in all required contact information', 'error');
            this.isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }
        
        if (!assignedPriest) {
            this.showNotification('Please select a priest for this reservation', 'error');
            this.isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }
        
        // CRITICAL: Check if time slot is still available before submitting
        // SKIP validation for funerals - they don't block time slots
        if (selectedService !== 'funeral') {
            const isSlotAvailable = await this.validateTimeSlotAvailability(reservationDate, reservationTime, selectedService);
            if (!isSlotAvailable.available) {
                // Show conflict modal instead of just notification
                this.showConflictModal(isSlotAvailable);
                this.isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                return;
            }
        } else {
            console.log('🕯️ FUNERAL: Skipping time slot validation - funerals do not block time slots');
            
            // BUT validate funeral-specific fields
            const funeralEndDate = document.getElementById('funeralEndDate').value;
            const funeralEndTime = document.getElementById('funeralEndTime').value;
            
            if (!funeralEndDate || !funeralEndTime) {
                this.showNotification('Please fill in the funeral end date and time', 'error');
                this.isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                return;
            }
            
            console.log('✅ FUNERAL: End date/time validated:', funeralEndDate, funeralEndTime);
            
            // Check for overlapping funerals
            const funeralConflict = this.checkFuneralOverlap(reservationDate, funeralEndDate);
            if (funeralConflict) {
                this.showNotification(`Funeral date conflict! There is already a funeral scheduled from ${funeralConflict.start} to ${funeralConflict.end}`, 'error');
                this.isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                return;
            }
        }
        
        const formData = new FormData(form);

        // Convert FormData to JSON
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        // Add payment data if available
        if (window.paymentCalculator) {
            const paymentData = window.paymentCalculator.getPaymentData();
            console.log('Payment data from calculator:', paymentData);
            data.payment = paymentData;
        } else {
            console.log('Payment calculator not available');
        }
        
        // Debug: Log the data being sent
        console.log('Submitting reservation data:', data);
        console.log('Form data keys:', Object.keys(data));
        console.log('Service type:', data.selectedService || data.service_type);
        console.log('Date:', data.reservationDate || data.date);
        console.log('Time:', data.reservationTime || data.time_slot);
        console.log('Assigned Priest ID:', data.assigned_priest);
        console.log('Assigned Priest (alt):', data.assignedPriest);
        console.log('🕯️ FUNERAL FIELDS FROM FORM:');
        console.log('  funeral_end_date:', data.funeral_end_date);
        console.log('  funeral_end_time:', data.funeral_end_time);

        try {
            console.log('Sending request to /api/reservations with data:', data);
            
            const response = await fetch('/api/reservations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log('Reservation submission result:', result);

            if (result.success) {
                // Success handling
                this.showSuccessMessage('Reservation submitted successfully!');
                this.closeReservationModal();
                this.resetReservationForm();
                
                // OPTIMIZED: Single coordinated refresh instead of multiple API calls
                // Add new reservation to local array immediately for instant UI update
                // BUT only if it's approved/confirmed (will show on calendar)
                if (result.data) {
                    const status = result.data.status ? result.data.status.toLowerCase() : '';
                    const isApproved = status === 'confirmed' || status === 'approved' || status === 'priest_approved';
                    
                    if (isApproved) {
                        this.reservations.push(result.data);
                        console.log('✅ Added approved reservation to local array');
                    } else {
                        console.log('⏳ New reservation is pending approval, will not show on calendar yet');
                    }
                }
                
                // Refresh calendar with updated local data (no API call needed)
                this.refreshCalendarEvents();
                
                // Single async refresh for all components (non-blocking)
                setTimeout(async () => {
                    // Reload data once and update all components
                    await this.loadReservations(); // Single API call
                    
                    // Update table if available
                    if (window.reservationTable && window.reservationTable.loadReservations) {
                        await window.reservationTable.loadReservations();
                    }
                    
                    // Sync events calendar if available
                    if (window.eventsCalendarSystem) {
                        await window.eventsCalendarSystem.refresh();
                    }
                }, 500); // Reduced delay from 1000ms to 500ms
            } else {
                this.showNotification('Error: ' + (result.message || result.error), 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('An error occurred while creating the reservation.', 'error');
        } finally {
            // Always reset the submission flag and restore button state
            this.isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            console.log('🏁 Reservation submission completed, flag reset');
        }
    }

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

    formatDateDisplay(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
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
        if (closeBtn1) {
            closeBtn1.replaceWith(closeBtn1.cloneNode(true));
            document.getElementById('closeEventDetailsModal').addEventListener('click', closeModal);
        }
        if (closeBtn2) {
            closeBtn2.replaceWith(closeBtn2.cloneNode(true));
            document.getElementById('closeEventModal').addEventListener('click', closeModal);
        }
        if (overlay) {
            overlay.replaceWith(overlay.cloneNode(true));
            modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
        }

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
            'waiting_priest_approval': '<span class="status-badge status-waiting">WAITING PRIEST APPROVAL</span>',
            'priest_approved': '<span class="status-badge status-approved">PRIEST APPROVED</span>',
            'confirmed': '<span class="status-badge status-confirmed">CONFIRMED</span>',
            'approved': '<span class="status-badge status-approved">APPROVED</span>',
            'completed': '<span class="status-badge status-completed">COMPLETED</span>',
            'cancelled': '<span class="status-badge status-cancelled">CANCELLED</span>',
            'declined': '<span class="status-badge status-cancelled">DECLINED</span>'
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

    showWarningModal(title, message, type = 'warning') {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'warning-modal-overlay';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'warning-modal-content';
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            animation: slideDown 0.3s ease;
            text-align: center;
        `;

        // Icon based on type
        const iconClass = type === 'warning' ? 'fa-exclamation-triangle' : 
                         type === 'error' ? 'fa-times-circle' : 'fa-info-circle';
        const iconColor = type === 'warning' ? '#f59e0b' : 
                         type === 'error' ? '#ef4444' : '#3b82f6';

        modalContent.innerHTML = `
            <div style="margin-bottom: 20px;">
                <i class="fas ${iconClass}" style="font-size: 64px; color: ${iconColor};"></i>
            </div>
            <h3 style="margin: 0 0 15px 0; font-size: 24px; color: #1f2937; font-weight: 600;">
                ${title}
            </h3>
            <p style="margin: 0 0 25px 0; font-size: 16px; color: #6b7280; line-height: 1.6;">
                ${message}
            </p>
            <button class="warning-modal-btn" style="
                background: linear-gradient(135deg, #1e40af 0%, #0369a1 100%);
                color: white;
                border: none;
                padding: 12px 40px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(30, 64, 175, 0.4);
            ">
                OK, I Understand
            </button>
        `;

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideDown {
                from { 
                    opacity: 0;
                    transform: translateY(-30px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .warning-modal-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5) !important;
            }
            .warning-modal-btn:active {
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // Close modal on button click
        const closeBtn = modalContent.querySelector('.warning-modal-btn');
        closeBtn.addEventListener('click', () => {
            modalOverlay.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                modalOverlay.remove();
                style.remove();
            }, 300);
        });

        // Close modal on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    modalOverlay.remove();
                    style.remove();
                }, 300);
            }
        });

        // Add fadeOut animation
        const fadeOutStyle = document.createElement('style');
        fadeOutStyle.textContent = `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(fadeOutStyle);
    }

    showConflictModal(conflictInfo) {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'conflict-modal-overlay';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            animation: fadeIn 0.3s ease;
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'conflict-modal-content';
        modalContent.style.cssText = `
            background: white;
            border-radius: 16px;
            padding: 35px;
            max-width: 550px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
            animation: slideDown 0.3s ease;
            text-align: center;
        `;

        // Build conflict details
        let conflictDetails = '';
        if (conflictInfo.conflictingReservation) {
            const { clientName, serviceType, time, duration } = conflictInfo.conflictingReservation;
            conflictDetails = `
                <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; text-align: left; border-radius: 8px;">
                    <h4 style="margin: 0 0 12px 0; color: #991b1b; font-size: 16px; font-weight: 600;">
                        <i class="fas fa-exclamation-triangle"></i> Conflicting Reservation Details:
                    </h4>
                    <div style="color: #7f1d1d; font-size: 14px; line-height: 1.8;">
                        <p style="margin: 5px 0;"><strong>Client:</strong> ${clientName}</p>
                        <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}</p>
                        <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
                        <p style="margin: 5px 0;"><strong>Duration:</strong> ${duration} hour${duration > 1 ? 's' : ''}</p>
                    </div>
                </div>
            `;
        }

        modalContent.innerHTML = `
            <div style="margin-bottom: 20px;">
                <i class="fas fa-calendar-times" style="font-size: 72px; color: #ef4444;"></i>
            </div>
            <h3 style="margin: 0 0 15px 0; font-size: 26px; color: #991b1b; font-weight: 700;">
                Schedule Conflict Detected!
            </h3>
            <p style="margin: 0 0 10px 0; font-size: 17px; color: #374151; line-height: 1.6; font-weight: 500;">
                ${conflictInfo.reason}
            </p>
            ${conflictDetails}
            <p style="margin: 20px 0 25px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                Please select a different time slot or date for your reservation.
            </p>
            <button class="conflict-modal-btn" style="
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                border: none;
                padding: 14px 45px;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
            ">
                <i class="fas fa-check"></i> OK, I'll Choose Another Time
            </button>
        `;

        // Add hover effect
        const style = document.createElement('style');
        style.textContent = `
            .conflict-modal-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5) !important;
            }
            .conflict-modal-btn:active {
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // Close modal on button click
        const closeBtn = modalContent.querySelector('.conflict-modal-btn');
        closeBtn.addEventListener('click', () => {
            modalOverlay.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                modalOverlay.remove();
                style.remove();
            }, 300);
        });

        // Close modal on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    modalOverlay.remove();
                    style.remove();
                }, 300);
            }
        });
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
            funeral: ['deceasedName', 'dateOfDeath', 'funeralEndDate', 'funeralEndTime'],
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
}

// Calendar system will be initialized from the main dashboard script
