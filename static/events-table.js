// Events Table Manager for ChurchEase V.2
class EventsTableManager {
    constructor() {
        this.events = [];
        this.filteredEvents = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.init();
    }

    init() {
        console.log('Initializing Events Table Manager...');
        this.setupEventListeners();
        this.loadEvents();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('eventSearchInput');
        const clearSearchBtn = document.getElementById('clearEventSearch');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterAndDisplayEvents();
                
                // Show/hide clear button
                if (clearSearchBtn) {
                    clearSearchBtn.style.display = this.searchTerm ? 'block' : 'none';
                }
            });
        }

        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    this.searchTerm = '';
                    this.filterAndDisplayEvents();
                    clearSearchBtn.style.display = 'none';
                }
            });
        }

        // Filter buttons
        const filterButtons = document.querySelectorAll('.event-filter-tab');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                
                // Update current filter
                this.currentFilter = e.target.getAttribute('data-filter');
                this.filterAndDisplayEvents();
            });
        });

        // Refresh button
        const refreshBtn = document.getElementById('refreshEvents');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshEvents();
            });
        }
    }

    async loadEvents() {
        try {
            console.log('Loading events from API...');
            const response = await fetch('/api/events');
            const result = await response.json();

            if (result.success) {
                this.events = result.data;
                console.log(`Loaded ${this.events.length} events`);
                
                // Load priest names for events that have assigned priests
                await this.loadPriestNames();
                
                this.filterAndDisplayEvents();
            } else {
                console.error('Failed to load events:', result.error);
                this.displayError('Failed to load events: ' + result.error);
            }
        } catch (error) {
            console.error('Error loading events:', error);
            this.displayError('Error loading events. Please try again.');
        }
    }

    async loadPriestNames() {
        try {
            // Get all priests data
            const priestsResponse = await fetch('/api/priests');
            const priestsResult = await priestsResponse.json();
            
            if (priestsResult.success) {
                const priestsMap = {};
                priestsResult.data.forEach(priest => {
                    const priestName = `${priest.title || 'Father'} ${priest.first_name} ${priest.last_name}`.trim();
                    priestsMap[priest.id] = priestName;
                });
                
                // Add priest names to events
                this.events.forEach(event => {
                    if (event.assigned_priest) {
                        event.assigned_priest_name = priestsMap[event.assigned_priest] || 'Unknown Priest';
                    } else {
                        event.assigned_priest_name = 'Not assigned';
                    }
                });
            }
        } catch (error) {
            console.error('Error loading priest names:', error);
            // Set default values if priest loading fails
            this.events.forEach(event => {
                event.assigned_priest_name = event.assigned_priest ? 'Assigned Priest' : 'Not assigned';
            });
        }
    }

    filterAndDisplayEvents() {
        // Apply filters
        this.filteredEvents = this.events.filter(event => {
            // Filter by type
            const typeMatch = this.currentFilter === 'all' || event.event_type === this.currentFilter;
            
            // Filter by search term
            const searchMatch = !this.searchTerm || 
                event.event_name.toLowerCase().includes(this.searchTerm) ||
                (event.description && event.description.toLowerCase().includes(this.searchTerm));
            
            return typeMatch && searchMatch;
        });

        this.displayEvents();
    }

    displayEvents() {
        const tableBody = document.getElementById('eventsTableBody');
        if (!tableBody) {
            console.error('Events table body not found');
            return;
        }

        if (this.filteredEvents.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px; color: #666;">
                        <i class="fas fa-calendar-times" style="font-size: 24px; margin-bottom: 8px;"></i>
                        <div>No events found</div>
                        <small>Try adjusting your search or filter criteria</small>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.filteredEvents.map(event => this.createEventRow(event)).join('');
        
        // Add event listeners to action buttons
        this.setupActionButtons();
    }

    createEventRow(event) {
        const eventDate = new Date(event.event_date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const startTime = this.formatTime(event.start_time);
        const typeBadge = this.getTypeBadge(event.event_type);

        return `
            <tr data-event-id="${event.id}">
                <td data-label="Event Type">${typeBadge}</td>
                <td class="client-name" data-label="Event Name">${event.event_name}</td>
                <td data-label="Assigned Priest">${event.assigned_priest_name || 'Not assigned'}</td>
                <td class="date-time" data-label="Date & Time">
                    <div class="date-display">${formattedDate}</div>
                    <div class="time-display">${startTime}</div>
                </td>
                <td class="actions" data-label="Actions">
                    <div class="action-buttons">
                        <button class="action-btn view-btn" title="View Details" data-action="view" data-event-id="${event.id}">
                            <i class="fas fa-eye"></i> <span class="hide-mobile">View</span>
                        </button>
                        <button class="action-btn edit-btn" title="Edit Event" data-action="edit" data-event-id="${event.id}">
                            <i class="fas fa-edit"></i> <span class="hide-mobile">Edit</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    getTypeBadge(eventType) {
        const typeConfig = {
            worship: { icon: 'fas fa-praying-hands', label: 'Worship' },
            youth: { icon: 'fas fa-child', label: 'Youth' },
            community: { icon: 'fas fa-users', label: 'Community' },
            outreach: { icon: 'fas fa-hands-helping', label: 'Outreach' },
            special: { icon: 'fas fa-star', label: 'Special' },
            meeting: { icon: 'fas fa-handshake', label: 'Meeting' },
            other: { icon: 'fas fa-calendar', label: 'Other' }
        };

        const config = typeConfig[eventType] || typeConfig.other;
        return `
            <span class="service-badge ${eventType}">
                <i class="${config.icon}"></i>
                ${config.label}
            </span>
        `;
    }

    getStatusBadge(status) {
        const statusConfig = {
            pending: { class: 'pending', label: 'PENDING' },
            confirmed: { class: 'confirmed', label: 'CONFIRMED' },
            cancelled: { class: 'cancelled', label: 'CANCELLED' },
            completed: { class: 'completed', label: 'COMPLETED' }
        };

        const config = statusConfig[status] || statusConfig.pending;
        return `<span class="status-badge ${config.class}">${config.label}</span>`;
    }

    formatTime(timeString) {
        if (!timeString) return 'Not specified';
        
        try {
            const [hours, minutes] = timeString.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
        } catch (error) {
            return timeString;
        }
    }

    setupActionButtons() {
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const action = button.getAttribute('data-action');
                const eventId = button.getAttribute('data-event-id');
                this.handleAction(action, eventId);
            });
        });
    }

    handleAction(action, eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) {
            console.error('Event not found:', eventId);
            return;
        }

        switch (action) {
            case 'view':
                this.viewEvent(event);
                break;
            case 'edit':
                this.editEvent(event);
                break;
            case 'approve':
                this.approveEvent(event);
                break;
            case 'cancel':
                this.cancelEvent(event);
                break;
            default:
                console.log(`Action ${action} not implemented yet`);
        }
    }

    async viewEvent(event) {
        console.log('Viewing event:', event);
        
        // Get priest name if assigned
        let priestName = 'Not assigned';
        if (event.assigned_priest) {
            try {
                const priestsResponse = await fetch('/api/priests');
                const priestsResult = await priestsResponse.json();
                
                if (priestsResult.success) {
                    const priest = priestsResult.data.find(p => p.id === event.assigned_priest);
                    if (priest) {
                        priestName = `${priest.title || 'Father'} ${priest.first_name} ${priest.last_name}`.trim();
                    }
                }
            } catch (error) {
                console.error('Error fetching priest name:', error);
                priestName = 'Assigned Priest';
            }
        }
        
        // Format time for display
        const displayTime = this.formatTime(event.start_time);
        
        // Populate the event details modal
        document.getElementById('event-detail-type').innerHTML = this.getEventTypeBadgeHTML(event.event_type);
        document.getElementById('event-detail-date').textContent = this.formatDateDisplay(event.event_date);
        document.getElementById('event-detail-time').textContent = displayTime;
        document.getElementById('event-detail-name').textContent = event.event_name || 'N/A';
        document.getElementById('event-detail-priest').textContent = priestName;
        document.getElementById('event-detail-status').innerHTML = this.getEventStatusBadgeHTML(event.status || 'pending');
        document.getElementById('event-detail-description').textContent = event.description || 'No description provided';
        document.getElementById('event-detail-created-by').textContent = event.created_by_secretary || 'System';
        
        // Show the modal
        const modal = document.getElementById('eventDetailsModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Add event listeners for closing the modal
        this.setupEventModalEventListeners();
    }

    editEvent(event) {
        console.log('Editing event:', event);
        
        // Populate edit form with current event data
        document.getElementById('editEventName').value = event.event_name || '';
        document.getElementById('editEventType').value = event.event_type || '';
        document.getElementById('editEventDate').value = event.event_date || '';
        document.getElementById('editEventStartTime').value = event.start_time ? event.start_time.substring(0, 5) : '';
        document.getElementById('editEventEndTime').value = event.end_time ? event.end_time.substring(0, 5) : '';
        document.getElementById('editEventDescription').value = event.description || '';
        
        // Store event ID for updating
        const modal = document.getElementById('editEventModal');
        modal.setAttribute('data-event-id', event.id);
        
        // Show the edit modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Add event listeners for the edit modal
        this.setupEditEventModalEventListeners();
    }

    async approveEvent(event) {
        if (confirm(`Approve event "${event.event_name}"?`)) {
            try {
                // This would call an API to approve the event
                console.log('Approving event:', event.id);
                alert('Event approved successfully');
                // Reload events after approval
                this.loadEvents();
            } catch (error) {
                console.error('Error approving event:', error);
                alert('Failed to approve event');
            }
        }
    }

    async cancelEvent(event) {
        if (confirm(`Cancel event "${event.event_name}"? This action cannot be undone.`)) {
            try {
                // This would call an API to cancel the event
                console.log('Cancelling event:', event.id);
                alert('Event cancelled successfully');
                // Reload events after cancellation
                this.loadEvents();
            } catch (error) {
                console.error('Error cancelling event:', error);
                alert('Failed to cancel event');
            }
        }
    }

    async refreshEvents() {
        const refreshBtn = document.getElementById('refreshEvents');
        if (refreshBtn) {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;
        }

        try {
            await this.loadEvents();
            
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-check"></i> Updated!';
                refreshBtn.style.background = '#10b981';
                
                setTimeout(() => {
                    refreshBtn.innerHTML = originalText;
                    refreshBtn.style.background = '';
                    refreshBtn.disabled = false;
                }, 2000);
            }
        } catch (error) {
            console.error('Error refreshing events:', error);
            
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                refreshBtn.style.background = '#ef4444';
                
                setTimeout(() => {
                    refreshBtn.innerHTML = originalText;
                    refreshBtn.style.background = '';
                    refreshBtn.disabled = false;
                }, 2000);
            }
        }
    }

    displayError(message) {
        const tableBody = document.getElementById('eventsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px; color: #ef4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px;"></i>
                        <div>${message}</div>
                    </td>
                </tr>
            `;
        }
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

        const config = statusConfig[status] || statusConfig.pending;
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

    setupEditEventModalEventListeners() {
        const modal = document.getElementById('editEventModal');
        const closeBtn1 = document.getElementById('closeEditEventModal');
        const cancelBtn = document.getElementById('cancelEditEvent');
        const form = document.getElementById('editEventForm');
        const overlay = modal.querySelector('.modal-overlay');

        const closeModal = () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            form.reset();
        };

        // Remove existing listeners to prevent duplicates
        if (closeBtn1) {
            closeBtn1.replaceWith(closeBtn1.cloneNode(true));
            document.getElementById('closeEditEventModal').addEventListener('click', closeModal);
        }
        if (cancelBtn) {
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
            document.getElementById('cancelEditEvent').addEventListener('click', closeModal);
        }
        if (overlay) {
            overlay.replaceWith(overlay.cloneNode(true));
            modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
        }

        // Form submission
        if (form) {
            form.replaceWith(form.cloneNode(true));
            document.getElementById('editEventForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleEditEventSubmit();
            });
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

    async handleEditEventSubmit() {
        const modal = document.getElementById('editEventModal');
        const eventId = modal.getAttribute('data-event-id');
        
        if (!eventId) {
            alert('Error: Event ID not found');
            return;
        }

        // Get form data
        const formData = {
            event_name: document.getElementById('editEventName').value,
            event_type: document.getElementById('editEventType').value,
            event_date: document.getElementById('editEventDate').value,
            start_time: document.getElementById('editEventStartTime').value + ':00',
            end_time: document.getElementById('editEventEndTime').value ? document.getElementById('editEventEndTime').value + ':00' : null,
            description: document.getElementById('editEventDescription').value
        };

        try {
            // Show loading state
            const saveBtn = document.getElementById('saveEditEvent');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 12px;"></i> Saving...';
            saveBtn.disabled = true;

            console.log('Updating event with data:', formData);
            
            // Send update request to the actual API
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            // Check if response is OK
            if (!response.ok) {
                const responseText = await response.text();
                console.error('Server returned non-OK response:', response.status, responseText);
                throw new Error(`Server error: ${response.status} - ${response.statusText}`);
            }

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const responseText = await response.text();
                console.error('Server returned non-JSON response:', responseText);
                throw new Error('Server returned HTML instead of JSON. The API endpoint may not exist.');
            }

            const result = await response.json();
            console.log('Update response:', result);

            if (result.success) {
                // Success feedback
                saveBtn.innerHTML = '<i class="fas fa-check" style="font-size: 12px;"></i> Saved!';
                saveBtn.style.background = '#10b981';
                
                setTimeout(() => {
                    // Close modal and refresh table
                    modal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                    this.loadEvents(); // Refresh the events table
                    
                    // Reset button
                    saveBtn.innerHTML = originalText;
                    saveBtn.style.background = '#002b5c';
                    saveBtn.disabled = false;
                }, 1000);
            } else {
                throw new Error(result.error || 'Failed to update event');
            }
        } catch (error) {
            console.error('Error updating event:', error);
            alert('Error updating event: ' + error.message);
            
            // Reset button
            const saveBtn = document.getElementById('saveEditEvent');
            saveBtn.innerHTML = '<i class="fas fa-save" style="font-size: 12px;"></i> Save Changes';
            saveBtn.disabled = false;
        }
    }
}

// Make EventsTableManager available globally
window.EventsTableManager = EventsTableManager;
