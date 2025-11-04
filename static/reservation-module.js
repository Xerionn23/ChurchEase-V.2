// Reservation Calendar Manager Class - Simplified without date-based reservation creation
class ReservationCalendarManager {
    constructor() {
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.reservations = [];
        
        console.log('CalendarManager initialized');
    }

    async loadReservations() {
        try {
            const response = await fetch('/api/reservations/all');
            const result = await response.json();
            
            if (result.success) {
                this.reservations = result.data;
                console.log('Loaded reservations:', this.reservations.length);
                this.renderCalendar();
            } else {
                console.error('Failed to load reservations:', result.error);
                this.reservations = [];
            }
        } catch (error) {
            console.error('Error loading reservations:', error);
            this.reservations = [];
        }
    }

    renderCalendar() {
        // Try multiple possible calendar container IDs
        const calendarBody = document.getElementById('calendarBody') || 
                           document.getElementById('calendarDaysGrid') || 
                           document.getElementById('calendarGrid');
        
        if (!calendarBody) {
            console.error('Calendar container element not found!');
            return;
        }
        
        console.log('Starting calendar render...');

        // Update current month display
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        // Update current month display - try multiple possible IDs
        const currentMonthElement = document.getElementById('calendarCurrentMonth') || 
                                  document.getElementById('calendarMonthYear') || 
                                  document.getElementById('currentMonth');
        if (currentMonthElement) {
            currentMonthElement.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
        }

        // Clear previous calendar
        calendarBody.innerHTML = '';
        
        // Force visibility
        calendarBody.style.display = 'grid';
        calendarBody.style.gridTemplateColumns = '1fr';
        calendarBody.style.minHeight = '400px';
        
        console.log('Calendar body cleared and styled');

        // Get first day of month and number of days
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Create calendar weeks
        let date = 1;
        for (let week = 0; week < 6; week++) {
            const weekRow = document.createElement('div');
            weekRow.className = 'calendar-week';
            weekRow.style.display = 'grid';
            weekRow.style.gridTemplateColumns = 'repeat(7, 1fr)';
            weekRow.style.borderBottom = '1px solid #E5E7EB';

            for (let day = 0; day < 7; day++) {
                const dayCell = document.createElement('div');
                dayCell.className = 'calendar-day';

                if (week === 0 && day < startingDayOfWeek) {
                    // Empty cells for previous month
                    dayCell.classList.add('other-month');
                } else if (date > daysInMonth) {
                    // Empty cells for next month
                    dayCell.classList.add('other-month');
                } else {
                    // Regular day - NO CLICK HANDLER FOR RESERVATION CREATION
                    dayCell.textContent = date;
                    dayCell.dataset.date = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                    
                    // Check if this date has reservations
                    const dateStr = dayCell.dataset.date;
                    const dayReservations = this.reservations.filter(r => r.date === dateStr);
                    
                    if (dayReservations.length > 0) {
                        dayCell.classList.add('has-reservations');
                        
                        // Add reservation indicators
                        const indicator = document.createElement('div');
                        indicator.className = 'reservation-indicator';
                        indicator.textContent = dayReservations.length;
                        dayCell.appendChild(indicator);
                    }
                    
                    date++;
                }

                weekRow.appendChild(dayCell);
            }

            calendarBody.appendChild(weekRow);
            
            // Stop if we've rendered all days
            if (date > daysInMonth) {
                break;
            }
        }
        
        console.log('Calendar rendered successfully');
    }

    previousMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.renderCalendar();
    }

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.renderCalendar();
    }

    formatDateDisplay(dateStr) {
        const date = new Date(dateStr);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
}

// Initialize calendar manager
let calendarManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Reservation module loaded');
    
    // Initialize Calendar View
    console.log('Initializing Calendar View...');
    calendarManager = new ReservationCalendarManager();
    calendarManager.loadReservations();
    
    // Set up navigation buttons - try multiple possible IDs
    const prevButton = document.getElementById('calendarPrev') || 
                      document.getElementById('calendarPrevMonth') || 
                      document.getElementById('prevMonth');
    const nextButton = document.getElementById('calendarNext') || 
                      document.getElementById('calendarNextMonth') || 
                      document.getElementById('nextMonth');
    
    if (prevButton) {
        prevButton.addEventListener('click', () => calendarManager.previousMonth());
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', () => calendarManager.nextMonth());
    }
    
    // Set up tab switching functionality
    setupTabSwitching();
    
    // Set up search functionality
    setupSearchFunctionality();
    
    // Set up refresh functionality
    setupRefreshFunctionality();
    
    // Set up calendar refresh functionality
    setupCalendarRefreshFunctionality();
    
    // Restore tab state after refresh
    restoreTabState();
    
    console.log('Reservation module initialized successfully');
});

// Tab switching functionality
function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button and corresponding pane
            this.classList.add('active');
            const targetPane = document.getElementById(targetTab);
            if (targetPane) {
                targetPane.classList.add('active');
            }
            
            console.log('Switched to tab:', targetTab);
        });
    });
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatTime(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function getServiceIcon(service) {
    const icons = {
        'wedding': 'rings',
        'baptism': 'cross',
        'funeral': 'heart',
        'confirmation': 'hands-praying'
    };
    return icons[service] || 'calendar';
}

// Search functionality for reservations table
function setupSearchFunctionality() {
    const searchInput = document.getElementById('nameSearchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    const reservationsTable = document.getElementById('reservationsTableBody');
    
    if (!searchInput) {
        console.log('Search input not found');
        return;
    }
    
    // Search input event listener
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        // Show/hide clear button
        if (searchTerm.length > 0) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        
        // Filter table rows
        filterTableRows(searchTerm);
    });
    
    // Clear search button event listener
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            searchInput.value = '';
            this.style.display = 'none';
            filterTableRows('');
            searchInput.focus();
        });
    }
    
    // Enter key to focus search
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
        }
    });
}

// Filter table rows based on search term
function filterTableRows(searchTerm) {
    const tableBody = document.getElementById('reservationsTableBody');
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const clientNameCell = row.querySelector('td:nth-child(3)'); // Client Name column
        
        if (clientNameCell) {
            const clientName = clientNameCell.textContent.toLowerCase();
            
            if (searchTerm === '' || clientName.includes(searchTerm)) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        }
    });
    
    // Show "No results" message if no matches found
    showNoResultsMessage(visibleCount === 0 && searchTerm !== '');
}

// Show/hide no results message
function showNoResultsMessage(show) {
    const tableBody = document.getElementById('reservationsTableBody');
    if (!tableBody) return;
    
    // Remove existing no results message
    const existingMessage = tableBody.querySelector('.no-results-row');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    if (show) {
        const noResultsRow = document.createElement('tr');
        noResultsRow.className = 'no-results-row';
        noResultsRow.innerHTML = `
            <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-medium); font-style: italic;">
                <i class="fas fa-search" style="font-size: 24px; margin-bottom: 12px; display: block; opacity: 0.5;"></i>
                No reservations found matching your search.
            </td>
        `;
        tableBody.appendChild(noResultsRow);
    }
}

// Refresh functionality for reservations
function setupRefreshFunctionality() {
    const refreshBtn = document.getElementById('refreshReservations');
    
    if (!refreshBtn) {
        console.log('Refresh button not found');
        return;
    }
    
    // Manual refresh button only
    refreshBtn.addEventListener('click', function() {
        refreshReservations(true);
    });
}

// Refresh reservations data (manual only)
async function refreshReservations(isManual = false) {
    const refreshBtn = document.getElementById('refreshReservations');
    
    // Show loading state
    if (refreshBtn) {
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
    }
    
    try {
        // Manual refresh only - reload page to preserve server-rendered format
        showNotification('Refreshing reservations...', 'info');
        setTimeout(() => {
            // Store current tab state before reload
            sessionStorage.setItem('activeTab', 'reservations');
            window.location.reload();
        }, 500);
        
    } catch (error) {
        console.error('Error refreshing reservations:', error);
        showNotification('Error refreshing reservations', 'error');
    } finally {
        // Remove loading state
        if (refreshBtn) {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }
}

// Update reservations table with new data
function updateReservationsTable(reservations) {
    const tableBody = document.getElementById('reservationsTableBody');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (reservations.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-medium); font-style: italic;">
                    <i class="fas fa-calendar-times" style="font-size: 24px; margin-bottom: 12px; display: block; opacity: 0.5;"></i>
                    No reservations found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Add reservation rows matching the original server format
    reservations.forEach((reservation, index) => {
        const row = document.createElement('tr');
        row.dataset.id = reservation.id;
        
        // Format date and time to match original format
        const formattedDate = formatDateForDisplay(reservation.date);
        const formattedTime = formatTimeForDisplay(reservation.time || reservation.time_slot);
        
        row.innerHTML = `
            <td>#${reservation.display_id || (index + 1)}</td>
            <td>
                <span class="service-type ${reservation.service_type}">
                    ${formatServiceType(reservation.service_type)}
                </span>
            </td>
            <td>${reservation.contact_name || reservation.full_name || 'N/A'}</td>
            <td>${reservation.contact_phone || reservation.phone || 'N/A'}</td>
            <td>
                ${formattedDate}<br>
                <small style="color: #6B7280;">${formattedTime}</small>
            </td>
            <td>
                <span class="status-badge status-${reservation.status}">
                    ${reservation.status ? reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1) : 'Pending'}
                </span>
            </td>
            <td class="table-actions">
                <button class="action-btn" data-action="view" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn" data-action="edit" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn" data-action="delete" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Re-apply current search filter if any
    const searchInput = document.getElementById('nameSearchInput');
    if (searchInput && searchInput.value.trim()) {
        filterTableRows(searchInput.value.toLowerCase().trim());
    }
}

// Format date for display (matching original format)
function formatDateForDisplay(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const date = new Date(dateStr);
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('en-US', options);
    } catch (e) {
        return dateStr;
    }
}

// Format time for display (matching original format)
function formatTimeForDisplay(timeStr) {
    if (!timeStr) return 'N/A';
    try {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes || '00'} ${ampm}`;
    } catch (e) {
        return timeStr;
    }
}

// Format service type for display
function formatServiceType(serviceType) {
    const types = {
        'wedding': 'Wedding (Kasal)',
        'baptism': 'Baptism (Binyag)',
        'funeral': 'Funeral (Burol)',
        'confirmation': 'Confirmation (Kumpil)'
    };
    return types[serviceType] || serviceType;
}

// Calendar refresh functionality
function setupCalendarRefreshFunctionality() {
    const calendarRefreshBtn = document.getElementById('refreshCalendar');
    
    if (!calendarRefreshBtn) {
        console.log('Calendar refresh button not found');
        return;
    }
    
    // Calendar refresh button
    calendarRefreshBtn.addEventListener('click', function() {
        refreshCalendar();
    });
}

// Refresh calendar data
async function refreshCalendar() {
    const refreshBtn = document.getElementById('refreshCalendar');
    
    // Show loading state
    if (refreshBtn) {
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
    }
    
    try {
        // For calendar refresh, reload page and go to calendar tab
        showNotification('Refreshing calendar...', 'info');
        setTimeout(() => {
            // Store calendar tab state before reload
            sessionStorage.setItem('activeTab', 'calendar');
            window.location.reload();
        }, 500);
        
    } catch (error) {
        console.error('Error refreshing calendar:', error);
        showNotification('Error refreshing calendar', 'error');
    } finally {
        // Remove loading state
        if (refreshBtn) {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }
}

// Update last refresh time display
function updateLastRefreshTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: 'numeric', 
        minute: '2-digit' 
    });
    
    // You can add a last refresh indicator if needed
    console.log(`Last refreshed at: ${timeString}`);
}


// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Restore tab state after page reload
function restoreTabState() {
    const activeTab = sessionStorage.getItem('activeTab');
    
    if (activeTab === 'reservations') {
        // Clear the session storage
        sessionStorage.removeItem('activeTab');
        
        // Switch to reservations tab
        const reservationsLink = document.getElementById('reservationsLink');
        const dashboardContent = document.getElementById('dashboardContent');
        const reservationModule = document.getElementById('reservationModule');
        
        if (reservationsLink && dashboardContent && reservationModule) {
            // Hide dashboard content
            dashboardContent.style.display = 'none';
            
            // Show reservation module
            reservationModule.style.display = 'block';
            
            // Update navigation active state
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            reservationsLink.classList.add('active');
            
            // Update breadcrumb
            const breadcrumbSpan = document.querySelector('.breadcrumb span');
            if (breadcrumbSpan) {
                breadcrumbSpan.textContent = 'Reservations';
            }
            
            // Update page title
            const pageTitle = document.querySelector('.page-title');
            if (pageTitle) {
                pageTitle.textContent = 'Reservations';
            }
            
            // Update page subtitle
            const pageSubtitle = document.querySelector('.page-subtitle');
            if (pageSubtitle) {
                pageSubtitle.textContent = 'Manage and track all church service reservations.';
            }
            
            console.log('Restored reservations tab after refresh');
        }
    } else if (activeTab === 'calendar') {
        // Clear the session storage
        sessionStorage.removeItem('activeTab');
        
        // Switch to calendar tab (Add Reservation)
        const reservationsLink = document.getElementById('reservationsLink');
        const dashboardContent = document.getElementById('dashboardContent');
        const reservationModule = document.getElementById('reservationModule');
        const addReservationTab = document.querySelector('[data-tab="add-reservation"]');
        
        if (reservationsLink && dashboardContent && reservationModule && addReservationTab) {
            // First, switch to reservations module
            dashboardContent.style.display = 'none';
            reservationModule.style.display = 'block';
            
            // Update navigation active state
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            reservationsLink.classList.add('active');
            
            // Update breadcrumb
            const breadcrumbSpan = document.querySelector('.breadcrumb span');
            if (breadcrumbSpan) {
                breadcrumbSpan.textContent = 'Reservations';
            }
            
            // Update page title
            const pageTitle = document.querySelector('.page-title');
            if (pageTitle) {
                pageTitle.textContent = 'Reservations';
            }
            
            // Update page subtitle
            const pageSubtitle = document.querySelector('.page-subtitle');
            if (pageSubtitle) {
                pageSubtitle.textContent = 'Manage and track all church service reservations.';
            }
            
            // Then switch to the calendar tab
            setTimeout(() => {
                addReservationTab.click();
                console.log('Restored calendar tab after refresh');
            }, 100);
        }
    }
}

console.log('Reservation module script loaded');
