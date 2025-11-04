// Reservation Table Manager
class ReservationTableManager {
    constructor() {
        this.reservations = [];
        this.filteredReservations = [];
        this.currentFilter = 'all';
        this.sortDirection = 'none'; // 'asc', 'desc', 'none'
        this.init();
    }

    init() {
        this.loadReservations();
        this.setupEventListeners();
    }

    async loadReservations() {
        try {
            console.log('⚡ Fetching reservations from API...');
            const startTime = performance.now();
            
            // Show loading state with animation
            this.showLoadingState();
            
            // FORCE FRESH DATA: Add timestamp to prevent browser caching
            // This ensures we always get the latest data from database after edits
            const timestamp = new Date().getTime();
            const response = await fetch(`/api/reservations/all?_t=${timestamp}`);
            console.log('Response status:', response.status);
            
            const result = await response.json();
            const loadTime = (performance.now() - startTime).toFixed(0);
            console.log(`✅ API Response received in ${loadTime}ms`);
            console.log('Total reservations received:', result.data ? result.data.length : 0);
            
            if (result.success) {
                this.reservations = result.data;
                console.log(`✅ Loaded ${this.reservations.length} reservations`);
                
                // Process auto-completion for past reservations
                this.processAutoCompletion();
                
                // OPTIMIZATION: Progressive rendering for large datasets
                if (this.reservations.length > 50) {
                    this.renderTableProgressive();
                } else {
                    this.renderTable();
                }
                
                const totalTime = (performance.now() - startTime).toFixed(0);
                console.log(`🎉 Total load time: ${totalTime}ms`);
            } else {
                console.error('Failed to load reservations:', result.error);
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Error loading reservations:', error);
            this.showEmptyState();
        }
    }

    processAutoCompletion() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let autoCompletedCount = 0;
        
        this.reservations.forEach(reservation => {
            const reservationDate = reservation.reservation_date || reservation.date || reservation.event_date;
            
            if (reservationDate && (reservation.status === 'approved' || reservation.status === 'confirmed')) {
                const eventDate = new Date(reservationDate);
                eventDate.setHours(0, 0, 0, 0);
                
                if (!isNaN(eventDate.getTime()) && eventDate < today) {
                    console.log(`Auto-completing reservation ${reservation.id}: ${reservationDate} has passed`);
                    // Note: We don't actually modify the database status here, 
                    // just the display logic in getStatusBadge will handle it
                    autoCompletedCount++;
                }
            }
        });
        
        if (autoCompletedCount > 0) {
            console.log(`Found ${autoCompletedCount} reservations that should be auto-completed`);
        }
    }

    renderTable() {
        const tableBody = document.getElementById('reservationsTableBody');
        if (!tableBody) return;

        if (this.reservations.length === 0) {
            this.showEmptyState();
            return;
        }

        // Assign new sequential display IDs for all reservations
        this.reservations.forEach((reservation, index) => {
            reservation.display_id = index + 1;
        });

        // OPTIMIZATION: Use DocumentFragment for batch DOM insertion
        const fragment = document.createDocumentFragment();

        this.reservations.forEach(reservation => {
            const row = this.createTableRow(reservation);
            fragment.appendChild(row);
        });
        
        // Single DOM update instead of multiple appendChild calls
        tableBody.innerHTML = '';
        tableBody.appendChild(fragment);
    }
    
    // OPTIMIZATION: Progressive rendering for large datasets
    renderTableProgressive() {
        const tableBody = document.getElementById('reservationsTableBody');
        if (!tableBody) return;

        if (this.reservations.length === 0) {
            this.showEmptyState();
            return;
        }

        // Assign display IDs
        this.reservations.forEach((reservation, index) => {
            reservation.display_id = index + 1;
        });

        tableBody.innerHTML = '';
        
        // Render in chunks for smooth UI
        const chunkSize = 25;
        let currentIndex = 0;
        
        const renderChunk = () => {
            const fragment = document.createDocumentFragment();
            const endIndex = Math.min(currentIndex + chunkSize, this.reservations.length);
            
            for (let i = currentIndex; i < endIndex; i++) {
                const row = this.createTableRow(this.reservations[i]);
                fragment.appendChild(row);
            }
            
            tableBody.appendChild(fragment);
            currentIndex = endIndex;
            
            if (currentIndex < this.reservations.length) {
                // Continue rendering next chunk
                requestAnimationFrame(renderChunk);
            } else {
                console.log('✅ Progressive rendering complete');
            }
        };
        
        renderChunk();
    }

    createTableRow(reservation) {
        const row = document.createElement('tr');
        row.setAttribute('data-id', reservation.id);

        // Format date
        const date = new Date(reservation.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Format time
        const time = this.formatTime(reservation.time);

        // Service badge
        const serviceBadge = this.getServiceBadge(reservation.service_type);

        // Status badge - ensure we pass the correct date field
        const reservationDate = reservation.reservation_date || reservation.date || reservation.event_date;
        const statusBadge = this.getStatusBadge(reservation.status, reservationDate);

        // Stipendium status badge
        const stipendiumBadge = this.getStipendiumStatusBadge(reservation);

        // Priest assignment badge
        const priestBadge = this.getPriestBadge(reservation);

        // Attendance badge
        const attendanceBadge = getAttendanceBadge(reservation.attendance_status || 'pending');
        
        // Handle funeral date range display
        let dateTimeDisplay = '';
        if (reservation.service_type === 'funeral' && reservation.funeral_start_date && reservation.funeral_end_date) {
            // Multi-day funeral event
            const startDate = new Date(reservation.funeral_start_date);
            const endDate = new Date(reservation.funeral_end_date);
            const daysDiff = Math.ceil((endDate - startDate) / (1000 * 3600 * 24)) + 1;
            
            const startFormatted = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const endFormatted = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            const startTime = this.formatTime(reservation.funeral_start_time);
            const endTime = this.formatTime(reservation.funeral_end_time);
            
            dateTimeDisplay = `
                <div class="datetime-info funeral-multiday">
                    <strong style="color: #6B7280;">🕯️ ${daysDiff}-Day Funeral</strong>
                    <small>${startFormatted} - ${endFormatted}</small>
                    <small style="color: #6B7280;">${startTime} to ${endTime}</small>
                </div>
            `;
        } else {
            // Regular single-day reservation
            dateTimeDisplay = `
                <div class="datetime-info">
                    <strong>${formattedDate}</strong>
                    <small>${time}</small>
                </div>
            `;
        }

        row.innerHTML = `
            <td class="reservation-id" data-label="ID">#${reservation.display_id || reservation.id}</td>
            <td data-label="Service">${serviceBadge}</td>
            <td class="client-name" data-label="Client Name">
                <strong>${reservation.contact_name}</strong>
            </td>
            <td class="datetime-cell" data-label="Date & Time" data-sort-value="${reservation.date}">
                ${dateTimeDisplay}
            </td>
            <td data-label="Status">${statusBadge}</td>
            <td class="priest-cell" data-label="Assigned Priest">${priestBadge}</td>
            <td class="stipendium-status-cell" data-label="Payment Status">${stipendiumBadge}</td>
            <td class="attendance-cell" data-label="Attendance">${attendanceBadge}</td>
            <td class="actions-cell" data-label="Actions">
                <div class="btn-group action-buttons" role="group">
                    <button class="btn btn-sm btn-outline-primary action-tooltip" onclick="viewReservation('${reservation.id}')" data-tooltip="View Reservation Details">
                        <i class="fas fa-eye"></i> <span class="hide-mobile">View</span>
                    </button>
                    ${this.getActionButtons(reservation)}
                </div>
            </td>
        `;

        return row;
    }

    getServiceBadge(serviceType) {
        const badges = {
            wedding: '<span class="service-badge service-wedding"><i class="fas fa-heart"></i> Wedding</span>',
            baptism: '<span class="service-badge service-baptism"><i class="fas fa-baby"></i> Baptism</span>',
            funeral: '<span class="service-badge service-funeral"><i class="fas fa-cross"></i> Funeral</span>',
            confirmation: '<span class="service-badge service-confirmation"><i class="fas fa-praying-hands"></i> Confirmation</span>'
        };
        return badges[serviceType] || `<span class="service-badge">${serviceType}</span>`;
    }

    getStatusBadge(status, reservationDate) {
        // Enhanced automatic completion logic
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
        
        // Handle different date field formats and ensure proper parsing
        let eventDate = null;
        if (reservationDate) {
            eventDate = new Date(reservationDate);
            eventDate.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
            
            // Validate the date
            if (isNaN(eventDate.getTime())) {
                console.warn('Invalid reservation date:', reservationDate);
                eventDate = null;
            }
        }
        
        // Auto-complete logic: If event date has passed and status is approved/confirmed, mark as completed
        if (eventDate && eventDate < today && (status === 'approved' || status === 'confirmed')) {
            console.log(`Auto-completing reservation: Date ${reservationDate} has passed, changing status from ${status} to completed`);
            status = 'completed';
        }
        
        // Map approved to confirmed for display (only if not auto-completed)
        if (status === 'approved') {
            status = 'confirmed';
        }
        
        const badges = {
            pending: '<span class="status-badge status-pending"><i class="fas fa-clock"></i> PENDING</span>',
            waiting_priest_approval: '<span class="status-badge status-waiting-priest"><i class="fas fa-user-clock"></i> WAITING PRIEST APPROVAL</span>',
            approved: '<span class="status-badge status-confirmed"><i class="fas fa-check-circle"></i> PRIEST APPROVED</span>',
            confirmed: '<span class="status-badge status-confirmed"><i class="fas fa-check-circle"></i> PRIEST APPROVED</span>',
            completed: '<span class="status-badge status-completed"><i class="fas fa-check-double"></i> COMPLETED</span>',
            cancelled: '<span class="status-badge status-cancelled"><i class="fas fa-times-circle"></i> CANCELED</span>',
            declined: '<span class="status-badge status-declined"><i class="fas fa-times"></i> PRIEST DECLINED</span>'
        };
        return badges[status] || `<span class="status-badge">${status.toUpperCase()}</span>`;
    }

    getStipendiumStatusBadge(reservation) {
        console.log('Getting stipendium badge for:', reservation.service_type, 'ID:', reservation.id);
        
        // FIRST: Check if this is a Confirmation service - ALWAYS show N/A regardless of any payment data
        if (reservation.service_type === 'confirmation') {
            console.log('Confirmation service detected - ALWAYS showing N/A (no payment required)');
            return `<span class="stipendium-badge stipendium-na"><i class="fas fa-minus"></i> N/A</span>`;
        }
        
        // For other services, check if there's actual payment/stipendium information
        let hasPaymentInfo = false;
        let stipendiumStatus = 'Pending';
        let stipendiumClass = 'stipendium-pending';
        let stipendiumIcon = 'fas fa-clock';
        
        // Check if stipendium information is available
        if (reservation.payment_status) {
            hasPaymentInfo = true;
            stipendiumStatus = reservation.payment_status;
        } else if (reservation.amount_paid && reservation.total_amount) {
            hasPaymentInfo = true;
            const amountPaid = parseFloat(reservation.amount_paid);
            const totalAmount = parseFloat(reservation.total_amount);
            
            if (amountPaid >= totalAmount) {
                stipendiumStatus = 'Paid';
            } else if (amountPaid > 0) {
                stipendiumStatus = 'Partial';
            }
        } else if (reservation.payment_method || reservation.payment_type || reservation.gcash_reference) {
            // If any payment fields are filled, consider it has payment info
            hasPaymentInfo = true;
            if (reservation.status === 'confirmed' || reservation.status === 'completed') {
                stipendiumStatus = 'Paid';
            }
        }
        
        console.log('Service type:', reservation.service_type, 'Has payment info:', hasPaymentInfo, 'Status:', stipendiumStatus);
        
        // Set appropriate class and icon based on status
        switch (stipendiumStatus.toLowerCase()) {
            case 'paid':
                stipendiumClass = 'stipendium-paid';
                stipendiumIcon = 'fas fa-check-circle';
                stipendiumStatus = 'FULL STIPENDIUM';
                break;
            case 'partial':
                stipendiumClass = 'stipendium-partial';
                stipendiumIcon = 'fas fa-exclamation-triangle';
                stipendiumStatus = 'PARTIAL STIPENDIUM';
                break;
            case 'pending':
            default:
                stipendiumClass = 'stipendium-pending';
                stipendiumIcon = 'fas fa-clock';
                stipendiumStatus = 'PENDING STIPENDIUM';
                break;
        }
        
        return `<span class="stipendium-badge ${stipendiumClass}"><i class="${stipendiumIcon}"></i> ${stipendiumStatus}</span>`;
    }

    getPriestBadge(reservation) {
        if (!reservation.priest_name && !reservation.priest_id) {
            return '<span class="priest-badge priest-unassigned"><i class="fas fa-user-slash"></i> Not Assigned</span>';
        }
        
        const priestName = reservation.priest_name || 'Assigned Priest';
        return `<span class="priest-badge priest-assigned"><i class="fas fa-user"></i> ${priestName}</span>`;
    }

    getActionButtons(reservation) {
        let buttons = '';
        
        // Edit button - available for ALL reservations
        buttons += '<button class="btn btn-sm btn-outline-primary action-tooltip" onclick="editReservation(\'' + reservation.id + '\')" data-tooltip="Edit Reservation"><i class="fas fa-edit"></i></button>';
        
        return buttons;
    }

    formatTime(timeString) {
        if (!timeString) return 'N/A';
        
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        
        return `${displayHour}:${minutes} ${ampm}`;
    }

    showEmptyState() {
        const tableBody = document.getElementById('reservationsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">No Reservations Found</h5>
                        <p class="text-muted">Start by adding a new reservation or check your database connection.</p>
                    </div>
                </td>
            </tr>
        `;
    }

    setupEventListeners() {
        // Service filter tabs
        const filterTabs = document.querySelectorAll('.service-filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const filterType = tab.dataset.filter;
                this.setActiveFilter(filterType);
                this.filterReservations(filterType);
            });
        });

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterByStatus(e.target.value);
            });
        }

        // Search functionality
        const searchInput = document.getElementById('nameSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value;
                this.searchReservations(query);
                
                // Show/hide clear button
                const clearBtn = document.getElementById('clearSearch');
                if (clearBtn) {
                    clearBtn.style.display = query.trim() ? 'block' : 'none';
                }
            });
        }
        
        // Clear search button
        const clearSearchBtn = document.getElementById('clearSearch');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                const searchInput = document.getElementById('nameSearchInput');
                if (searchInput) {
                    searchInput.value = '';
                    this.searchReservations('');
                    clearSearchBtn.style.display = 'none';
                }
            });
        }

        // Date sorting functionality
        const sortableHeader = document.querySelector('.sortable-header');
        if (sortableHeader) {
            sortableHeader.addEventListener('click', () => {
                this.toggleDateSort();
            });
        }

        // Tooltip functionality
        this.setupTooltips();
    }

    setActiveFilter(filterType) {
        // Remove active class from all tabs
        document.querySelectorAll('.service-filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to clicked tab
        const activeTab = document.querySelector(`[data-filter="${filterType}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        this.currentFilter = filterType;
    }

    filterReservations(filterType) {
        if (filterType === 'all') {
            this.filteredReservations = [...this.reservations];
            // Re-assign sequential IDs for all reservations
            this.filteredReservations.forEach((reservation, index) => {
                reservation.display_id = index + 1;
            });
        } else {
            this.filteredReservations = this.reservations.filter(reservation => 
                reservation.service_type.toLowerCase() === filterType.toLowerCase()
            );
            // Re-assign sequential IDs starting from 1 for filtered results
            this.filteredReservations.forEach((reservation, index) => {
                reservation.display_id = index + 1;
            });
        }
        
        // Apply current sorting if active
        if (this.sortDirection !== 'none') {
            this.applySorting();
        } else {
            this.renderFilteredTable(this.filteredReservations);
        }
    }

    renderFilteredTable(reservations) {
        const tbody = document.getElementById('reservationsTableBody');
        if (!tbody) return;

        if (reservations.length === 0) {
            tbody.innerHTML = this.getEmptyStateHTML();
            return;
        }

        tbody.innerHTML = '';
        reservations.forEach(reservation => {
            const row = this.createTableRow(reservation);
            tbody.appendChild(row);
        });
    }

    getEmptyStateHTML() {
        return `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-search fa-2x text-muted mb-3"></i>
                        <h6 class="text-muted">No matching reservations found</h6>
                    </div>
                </td>
            </tr>
        `;
    }

    filterByStatus(status) {
        if (status === 'all') {
            this.renderTable();
        } else {
            const filtered = this.reservations.filter(r => r.status === status);
            this.renderFilteredTable(filtered);
        }
    }

    searchReservations(query) {
        console.log('Searching for:', query);
        console.log('Total reservations:', this.reservations.length);
        
        if (!query.trim()) {
            console.log('Empty query, showing all reservations');
            this.renderTable();
            return;
        }

        const searchTerm = query.toLowerCase().trim();
        const filtered = this.reservations.filter(r => {
            const contactName = (r.contact_name || '').toString().toLowerCase();
            const contactPhone = (r.contact_phone || '').toString().toLowerCase();
            const serviceType = (r.service_type || '').toString().toLowerCase();
            const reservationId = (r.reservation_id || r.id || '').toString().toLowerCase();
            
            const matches = contactName.includes(searchTerm) ||
                           contactPhone.includes(searchTerm) ||
                           serviceType.includes(searchTerm) ||
                           reservationId.includes(searchTerm);
            
            if (matches) {
                console.log('Match found:', r.contact_name, r.service_type);
            }
            
            return matches;
        });
        
        console.log('Filtered results:', filtered.length);
        this.renderFilteredTable(filtered);
    }

    renderFilteredTable(filteredReservations) {
        const tableBody = document.getElementById('reservationsTableBody');
        if (!tableBody) return;

        if (filteredReservations.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <div class="empty-state">
                            <i class="fas fa-search fa-2x text-muted mb-3"></i>
                            <h6 class="text-muted">No matching reservations found</h6>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = '';
        filteredReservations.forEach(reservation => {
            const row = this.createTableRow(reservation);
            tableBody.appendChild(row);
        });
    }

    refresh() {
        this.loadReservations();
    }

    toggleDateSort() {
        const sortIcon = document.querySelector('.sort-icon');
        
        // Cycle through sort directions: none -> asc -> desc -> none
        if (this.sortDirection === 'none') {
            this.sortDirection = 'asc';
            sortIcon.className = 'fas fa-sort-up sort-icon';
            sortIcon.setAttribute('data-direction', 'asc');
        } else if (this.sortDirection === 'asc') {
            this.sortDirection = 'desc';
            sortIcon.className = 'fas fa-sort-down sort-icon';
            sortIcon.setAttribute('data-direction', 'desc');
        } else {
            this.sortDirection = 'none';
            sortIcon.className = 'fas fa-sort sort-icon';
            sortIcon.setAttribute('data-direction', 'none');
        }
        
        this.applySorting();
    }

    applySorting() {
        if (this.sortDirection === 'none') {
            // Reset to original order
            this.renderTable();
            return;
        }

        const currentData = this.currentFilter === 'all' ? this.reservations : this.filteredReservations;
        const sortedData = [...currentData].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            
            if (this.sortDirection === 'asc') {
                return dateA - dateB;
            } else {
                return dateB - dateA;
            }
        });

        // Re-assign display IDs for sorted data
        sortedData.forEach((reservation, index) => {
            reservation.display_id = index + 1;
        });

        this.renderFilteredTable(sortedData);
    }

    setupTooltips() {
        // Use event delegation for dynamic tooltips
        document.addEventListener('mouseenter', (e) => {
            const tooltipElement = this.findTooltipElement(e.target);
            if (tooltipElement) {
                this.showTooltip(tooltipElement);
            }
        }, true);

        document.addEventListener('mouseleave', (e) => {
            const tooltipElement = this.findTooltipElement(e.target);
            if (tooltipElement) {
                this.hideTooltip();
            }
        }, true);
    }

    findTooltipElement(element) {
        // Manual traversal up the DOM tree to find tooltip element
        let current = element;
        while (current && current !== document) {
            if (current.classList && current.classList.contains('action-tooltip')) {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    }

    showTooltip(element) {
        const tooltipText = element.getAttribute('data-tooltip');
        if (!tooltipText) return;

        // Remove existing tooltip
        this.hideTooltip();

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = tooltipText;
        document.body.appendChild(tooltip);

        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';

        // Show tooltip
        setTimeout(() => {
            tooltip.classList.add('show');
        }, 10);
    }

    hideTooltip() {
        const existingTooltip = document.querySelector('.custom-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
    }

    showLoadingState() {
        const tableBody = document.getElementById('reservationsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 80px 20px; background: white;">
                    <div class="loading-container" style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
                        <!-- ChurchEase Logo -->
                        <div class="loading-logo" style="animation: pulse 2s ease-in-out infinite;">
                            <img src="/static/ChurchLogo.jpg" alt="ChurchEase" style="
                                width: 120px;
                                height: 120px;
                                object-fit: contain;
                                filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
                            ">
                        </div>
                        
                        <!-- Loading Text -->
                        <div style="text-align: center;">
                            <h3 style="margin: 0; font-size: 24px; font-weight: 600; color: #374151;">
                                Loading...
                            </h3>
                        </div>
                    </div>
                    
                    <style>
                        @keyframes pulse {
                            0%, 100% { 
                                transform: scale(1);
                                opacity: 1;
                            }
                            50% { 
                                transform: scale(1.05);
                                opacity: 0.9;
                            }
                        }
                    </style>
                </td>
            </tr>
        `;
    }
}

// Global functions for button actions
async function viewReservation(id) {
    try {
        console.log('Viewing reservation ID:', id);
        
        // Find the reservation in the current data
        const reservation = window.reservationTableManager.reservations.find(r => r.id == id);
        if (!reservation) {
            console.error('Reservation not found for ID:', id);
            showCustomAlert('Reservation not found', 'Error', 'error');
            return;
        }

        // Fetch full reservation details from API
        const response = await fetch(`/api/reservations/${id}`);
        const result = await response.json();
        
        console.log('API response for reservation:', result);
        
        if (result.success) {
            const fullReservation = result.data;
            console.log('Full reservation data:', fullReservation);
            populateViewModal(fullReservation);
            showViewModal();
        } else {
            console.log('API failed, using local data:', reservation);
            // Fallback to local data if API fails
            populateViewModal(reservation);
            showViewModal();
        }
    } catch (error) {
        console.error('Error viewing reservation:', error);
        // Fallback to local data
        const reservation = window.reservationTableManager.reservations.find(r => r.id == id);
        if (reservation) {
            populateViewModal(reservation);
            showViewModal();
        } else {
            showCustomAlert('Failed to load reservation details', 'Error', 'error');
        }
    }
}

async function populateViewModal(reservation) {
    console.log('Populating modal with reservation:', reservation);
    
    // SAFETY: Helper function to safely set element content
    const safeSetContent = (id, value, isHTML = false) => {
        const element = document.getElementById(id);
        if (element) {
            if (isHTML) {
                element.innerHTML = value;
            } else {
                element.textContent = value;
            }
        } else {
            console.warn(`⚠️ Modal element not found: ${id}`);
        }
    };
    
    // Helper function to hide/show field based on value
    const setFieldVisibility = (id, value, defaultText = 'N/A') => {
        const element = document.getElementById(id);
        if (element && element.parentElement) {
            const isEmpty = !value || value === 'N/A' || value === 'None' || value.trim() === '';
            if (isEmpty) {
                element.parentElement.style.display = 'none';
            } else {
                element.parentElement.style.display = '';
                element.textContent = value;
            }
        }
    };
    
    // Basic reservation info
    safeSetContent('detail-id', `#${reservation.display_id || reservation.id}`);
    safeSetContent('detail-service-type', getServiceBadgeHTML(reservation.service_type), true);
    safeSetContent('detail-date', formatDate(reservation.date || reservation.reservation_date));
    
    // Fix time display - use proper field and format
    const timeValue = reservation.time_slot || reservation.time || reservation.start_time || reservation.reservation_time;
    safeSetContent('detail-time', timeValue ? formatTime(timeValue) : 'N/A');
    
    // Pass reservation date for auto-completion logic
    const reservationDate = reservation.date || reservation.reservation_date || reservation.event_date;
    safeSetContent('detail-status', getStatusBadgeHTML(reservation.status, reservationDate), true);
    safeSetContent('detail-created', reservation.created_at ? formatDate(reservation.created_at) : 'N/A');
    
    // Created By - show secretary name
    const createdBy = reservation.created_by_secretary || reservation.created_by || 'System';
    safeSetContent('detail-created-by', createdBy);

    // Contact information - check multiple field names
    const contactName = reservation.contact_name || reservation.bride_name || reservation.child_name || reservation.deceased_name || reservation.candidate_name || '';
    const contactPhone = reservation.contact_phone || reservation.phone || '';
    const contactEmail = reservation.contact_email || reservation.email || '';
    
    console.log('Contact info:', { contactName, contactPhone, contactEmail });
    
    safeSetContent('detail-contact-name', contactName || 'N/A');
    setFieldVisibility('detail-contact-phone', contactPhone);
    setFieldVisibility('detail-contact-email', contactEmail);
    
    // Address field needs to be mapped from service-specific data
    const address = getAddressFromServiceDetails(reservation) || '';
    setFieldVisibility('detail-contact-address', address);

    // Service-specific details
    populateServiceSpecificDetails(reservation);

    // Additional information
    safeSetContent('detail-priest-name', reservation.priest_name || 'Not Assigned');
    
    // Show priest response if exists with dynamic styling based on response type
    const priestResponseContainer = document.getElementById('priest-response-container');
    const priestResponseSpan = document.getElementById('detail-priest-response');
    const priestResponseLabel = priestResponseContainer.querySelector('label');
    
    if (reservation.priest_response && reservation.priest_response.trim() !== '') {
        const response = reservation.priest_response.toLowerCase();
        priestResponseSpan.textContent = reservation.priest_response;
        
        // Dynamic styling based on response type
        if (response.includes('approved') || response.includes('accepted')) {
            // Green for approved
            priestResponseLabel.style.color = '#059669';
            priestResponseLabel.innerHTML = '<i class="fas fa-check-circle"></i> Priest Response:';
            priestResponseSpan.style.color = '#065f46';
            priestResponseSpan.style.background = '#d1fae5';
            priestResponseSpan.style.borderLeft = '3px solid #10b981';
        } else if (response.includes('declined') || response.includes('rejected')) {
            // Red for declined
            priestResponseLabel.style.color = '#dc2626';
            priestResponseLabel.innerHTML = '<i class="fas fa-times-circle"></i> Priest Response:';
            priestResponseSpan.style.color = '#991b1b';
            priestResponseSpan.style.background = '#fee2e2';
            priestResponseSpan.style.borderLeft = '3px solid #ef4444';
        } else {
            // Blue for other responses (neutral)
            priestResponseLabel.style.color = '#0369a1';
            priestResponseLabel.innerHTML = '<i class="fas fa-comment-dots"></i> Priest Response:';
            priestResponseSpan.style.color = '#1e40af';
            priestResponseSpan.style.background = '#dbeafe';
            priestResponseSpan.style.borderLeft = '3px solid #3b82f6';
        }
        
        priestResponseContainer.style.display = 'block';
    } else {
        priestResponseContainer.style.display = 'none';
    }
    
    // Hide empty fields for cleaner UI
    setFieldVisibility('detail-special-requests', reservation.special_requests);
    setFieldVisibility('detail-notes', reservation.notes);

    // For Baptism and Confirmation services, HIDE stipendium section (FREE services)
    if (reservation.service_type === 'baptism' || reservation.service_type === 'confirmation') {
        console.log(`${reservation.service_type} service detected - FREE service, hiding stipendium section`);
        setDefaultPaymentInfo(reservation);
        // DON'T return here - we still need to setup attendance tracking below!
    } else {
        // Fetch stipendium information from database for other services
        try {
            const paymentLookupKey = reservation.reservation_id || reservation.id;
            console.log('Fetching stipendium using identifier:', paymentLookupKey, '(code:', reservation.reservation_id, 'db id:', reservation.id, ')');
            const paymentResponse = await fetch(`/api/payments/${paymentLookupKey}`);
            console.log('Stipendium response status:', paymentResponse.status);
            
            if (paymentResponse.ok) {
                const paymentResult = await paymentResponse.json();
                console.log('Stipendium API result:', paymentResult);
                
                if (paymentResult.success) {
                    const payment = paymentResult.data;
                    console.log('Stipendium data:', payment);
                    
                    // SAFETY: Check if elements exist before setting values
                    const safeSetText = (id, value) => {
                        const element = document.getElementById(id);
                        if (element) {
                            element.textContent = value;
                        } else {
                            console.warn(`Element not found: ${id}`);
                        }
                    };
                    
                    safeSetText('detail-payment-status', payment.payment_status || 'Pending');
                    safeSetText('detail-payment-type', payment.payment_type || 'N/A');
                    safeSetText('detail-base-price', payment.base_price ? `₱${payment.base_price.toLocaleString()}` : 'N/A');
                    safeSetText('detail-amount-due', payment.amount_due ? `₱${payment.amount_due.toLocaleString()}` : 'N/A');
                    safeSetText('detail-amount-paid', payment.amount_paid ? `₱${payment.amount_paid.toLocaleString()}` : '₱0.00');
                    safeSetText('detail-balance', payment.balance ? `₱${payment.balance.toLocaleString()}` : '₱0.00');
                    safeSetText('detail-payment-method', payment.payment_method || 'N/A');
                    safeSetText('detail-gcash-reference', payment.gcash_reference || 'N/A');
                } else {
                    console.log('Stipendium API failed, using fallback');
                    setDefaultPaymentInfo(reservation);
                }
            } else {
                console.log('Stipendium response not OK, using fallback');
                setDefaultPaymentInfo(reservation);
            }
        } catch (error) {
            console.error('Error fetching stipendium info:', error);
            setDefaultPaymentInfo(reservation);
        }
    }

    // Store reservation ID for actions
    document.getElementById('viewReservationModal').setAttribute('data-reservation-id', reservation.id);
    
    // Setup attendance tracking (IMPORTANT: This must run for ALL service types!)
    setupAttendanceTracking(reservation);
}

function setDefaultPaymentInfo(reservation) {
    // Find the stipendium section in View Modal
    const stipendiumSection = document.querySelector('#viewReservationModal .reservation-section:has(#detail-payment-status)');
    
    // HIDE stipendium section for Baptism and Confirmation (FREE services)
    if (reservation.service_type === 'baptism' || reservation.service_type === 'confirmation') {
        if (stipendiumSection) {
            stipendiumSection.style.display = 'none';
        }
        console.log(`✅ View modal: ${reservation.service_type} is FREE - Stipendium section HIDDEN`);
        return;
    }
    
    // SHOW stipendium section for Wedding and Funeral (PAID services)
    if (stipendiumSection) {
        stipendiumSection.style.display = 'block';
    }
    
    // SAFETY: Helper function to safely set text content
    const safeSetText = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`Element not found in setDefaultPaymentInfo: ${id}`);
        }
    };
    
    // For other services, show "Not Set" for all fields
    safeSetText('detail-payment-status', 'Not Set');
    safeSetText('detail-payment-type', 'Not Set');
    safeSetText('detail-base-price', 'Not Set');
    safeSetText('detail-amount-due', 'Not Set');
    safeSetText('detail-amount-paid', 'Not Set');
    safeSetText('detail-balance', 'Not Set');
    safeSetText('detail-payment-method', 'Not Set');
    safeSetText('detail-gcash-reference', 'Not Set');
}

function populateServiceSpecificDetails(reservation) {
    const container = document.getElementById('service-specific-details');
    const serviceType = reservation.service_type;
    const serviceDetails = reservation.service_details || {};
    
    // Check if service_details exists and has data
    if (serviceDetails && Object.keys(serviceDetails).length > 0) {
        console.log('✅ Service details found:', serviceDetails);
    } else {
        console.log('⚠️ No service details found - may be old reservation format');
    }
    
    let detailsHTML = '';
    
    switch (serviceType) {
        case 'wedding':
            // Check multiple possible field names for bride/groom
            const brideName = serviceDetails.bride_name || 
                            reservation.bride_name || 
                            reservation.bride_full_name ||
                            reservation.contact_name ||
                            'N/A';
            const groomName = serviceDetails.groom_name || 
                            reservation.groom_name || 
                            reservation.groom_full_name ||
                            reservation.partner_name ||
                            reservation.spouse_name ||
                            reservation.grooms_name ||
                            'Not Provided';
            
            detailsHTML = `
                <div class="details-grid">
                    <div class="detail-item">
                        <label>Bride's Name:</label>
                        <span>${brideName}</span>
                    </div>
                    <div class="detail-item">
                        <label>Groom's Name:</label>
                        <span>${groomName}</span>
                    </div>
                </div>
            `;
            break;
        case 'baptism':
            detailsHTML = `
                <div class="details-grid">
                    <div class="detail-item">
                        <label>Child's Name:</label>
                        <span>${serviceDetails.child_name || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Birth Date:</label>
                        <span>${serviceDetails.birth_date || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Father's Name:</label>
                        <span>${serviceDetails.father_name || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Mother's Name:</label>
                        <span>${serviceDetails.mother_name || 'N/A'}</span>
                    </div>
                </div>
            `;
            break;
        case 'funeral':
            detailsHTML = `
                <div class="details-grid">
                    <div class="detail-item">
                        <label>Deceased Name:</label>
                        <span>${serviceDetails.deceased_name || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Date of Death:</label>
                        <span>${serviceDetails.date_of_death || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Funeral Home Contact:</label>
                        <span>${serviceDetails.funeral_home_contact || 'N/A'}</span>
                    </div>
                </div>
            `;
            break;
        case 'confirmation':
            detailsHTML = `
                <div class="details-grid">
                    <div class="detail-item">
                        <label>Confirmand's Name:</label>
                        <span>${serviceDetails.confirmand_name || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Confirmation Name:</label>
                        <span>${serviceDetails.confirmation_name || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Sponsor's Name:</label>
                        <span>${serviceDetails.sponsor_name || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Number of Attendees:</label>
                        <span>${serviceDetails.attendees || 'N/A'}</span>
                    </div>
                </div>
            `;
            break;
        default:
            detailsHTML = `
                <div class="details-grid">
                    <div class="detail-item full-width">
                        <label>Service Details:</label>
                        <span>No specific details available for this service type.</span>
                    </div>
                </div>
            `;
    }
    
    container.innerHTML = detailsHTML;
}

function showViewModal() {
    const modal = document.getElementById('viewReservationModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function hideViewModal() {
    const modal = document.getElementById('viewReservationModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}


function getServiceBadgeHTML(serviceType) {
    const badges = {
        wedding: '<span class="service-badge service-wedding"><i class="fas fa-heart"></i> Wedding</span>',
        baptism: '<span class="service-badge service-baptism"><i class="fas fa-baby"></i> Baptism</span>',
        funeral: '<span class="service-badge service-funeral"><i class="fas fa-cross"></i> Funeral</span>',
        confirmation: '<span class="service-badge service-confirmation"><i class="fas fa-praying-hands"></i> Confirmation</span>'
    };
    return badges[serviceType] || `<span class="service-badge">${serviceType}</span>`;
}

function getStatusBadgeHTML(status, reservationDate = null) {
    // Enhanced automatic completion logic for modal display
    if (reservationDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const eventDate = new Date(reservationDate);
        eventDate.setHours(0, 0, 0, 0);
        
        // Auto-complete if date has passed and status is approved/confirmed
        if (!isNaN(eventDate.getTime()) && eventDate < today && (status === 'approved' || status === 'confirmed')) {
            status = 'completed';
        }
    }
    
    // Map approved to confirmed for display
    if (status === 'approved') {
        status = 'confirmed';
    }
    
    const badges = {
        pending: '<span class="status-badge status-pending">PENDING</span>',
        waiting_priest_approval: '<span class="status-badge status-waiting-priest">WAITING PRIEST APPROVAL</span>',
        approved: '<span class="status-badge status-confirmed">PRIEST APPROVED</span>',
        confirmed: '<span class="status-badge status-confirmed">PRIEST APPROVED</span>',
        completed: '<span class="status-badge status-completed">COMPLETED</span>',
        cancelled: '<span class="status-badge status-cancelled">CANCELED</span>',
        declined: '<span class="status-badge status-declined">PRIEST DECLINED</span>'
    };
    return badges[status] || status.toUpperCase();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    if (!timeString) return 'Not specified';
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

async function editReservation(reservationId) {
    try {
        console.log('Editing reservation ID:', reservationId);
        
        // Fetch reservation details
        const response = await fetch(`/api/reservations/${reservationId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const reservation = result.data;
            console.log('Reservation data for editing:', reservation);
            
            // Populate edit modal with current data
            await populateEditModal(reservation);
            showEditModal();
        } else {
            console.error('Failed to fetch reservation details:', result.error);
            showCustomAlert('Failed to load reservation details for editing.', 'Error', 'error');
        }
    } catch (error) {
        console.error('Error fetching reservation for edit:', error);
        showCustomAlert('Error loading reservation details.', 'Error', 'error');
    }
}

async function populateEditModal(reservation) {
    console.log('Populating edit modal with:', reservation);
    console.log('Available reservation fields:', Object.keys(reservation));
    
    // Set reservation ID
    document.getElementById('edit-reservation-id').value = reservation.id;
    
    // Basic Information
    document.getElementById('edit-service-type').value = reservation.service_type || '';
    const selectedDate = reservation.reservation_date || reservation.date || '';
    document.getElementById('edit-date').value = selectedDate;
    
    // Handle time format conversion (convert from 12-hour to 24-hour if needed)
    let timeValue = reservation.time_slot || reservation.time || '';
    if (timeValue && (timeValue.includes('AM') || timeValue.includes('PM'))) {
        // Convert 12-hour format to 24-hour format for the select input
        timeValue = convertTo24Hour(timeValue);
    }
    // Remove seconds if present (e.g., "14:00:00" -> "14:00")
    if (timeValue && timeValue.includes(':')) {
        const timeParts = timeValue.split(':');
        if (timeParts.length >= 2) {
            timeValue = `${timeParts[0]}:${timeParts[1]}`;
        }
    }
    
    // Load available time slots for the selected date
    await loadAvailableTimeSlotsForEdit(selectedDate, reservation.id, timeValue);
    
    // Contact Information - try multiple possible field names
    const firstName = reservation.contact_first_name || reservation.first_name || reservation.client_first_name || '';
    const lastName = reservation.contact_last_name || reservation.last_name || reservation.client_last_name || '';
    const phone = reservation.contact_phone || reservation.phone || reservation.client_phone || '';
    const email = reservation.contact_email || reservation.email || reservation.client_email || '';
    
    console.log('Contact info found:', { firstName, lastName, phone, email });
    console.log('Raw reservation data for contact:', {
        contact_first_name: reservation.contact_first_name,
        contact_last_name: reservation.contact_last_name,
        contact_name: reservation.contact_name,
        contact_phone: reservation.contact_phone
    });
    
    // If individual names are empty but contact_name exists, try to split it
    if ((!firstName || !lastName) && reservation.contact_name) {
        console.log('Trying to split contact_name:', reservation.contact_name);
        const nameParts = reservation.contact_name.split(' ');
        if (nameParts.length >= 2) {
            const splitFirstName = firstName || nameParts[0];
            const splitLastName = lastName || nameParts.slice(1).join(' ');
            console.log('Split names:', { splitFirstName, splitLastName });
            
            document.getElementById('edit-contact-first-name').value = splitFirstName;
            document.getElementById('edit-contact-last-name').value = splitLastName;
        } else {
            document.getElementById('edit-contact-first-name').value = firstName;
            document.getElementById('edit-contact-last-name').value = lastName;
        }
    } else {
        document.getElementById('edit-contact-first-name').value = firstName;
        document.getElementById('edit-contact-last-name').value = lastName;
    }
    
    document.getElementById('edit-contact-phone').value = phone;
    document.getElementById('edit-contact-email').value = email;
    
    // NEW: Populate Service-Specific Details (Read-Only)
    populateEditServiceDetails(reservation);
    
    // Load and populate priests dropdown
    await loadPriestsForEdit();
    
    // Priest Assignment
    document.getElementById('edit-assigned-priest').value = reservation.priest_id || '';
    
    // Special Requests
    document.getElementById('edit-special-requests').value = reservation.special_requests || '';
    
    // NEW: Populate Stipendium Information (Read-Only)
    await populateEditPaymentInfo(reservation);
}

async function loadAvailableTimeSlotsForEdit(selectedDate, currentReservationId, currentTimeValue) {
    const timeSelect = document.getElementById('edit-time');
    
    if (!selectedDate) {
        console.log('No date selected, showing all time slots');
        return;
    }
    
    try {
        console.log('🕐 Loading available time slots for:', selectedDate);
        
        // Get all reservations for the selected date
        const allReservations = window.reservationTableManager.reservations || [];
        const reservationsOnDate = allReservations.filter(r => {
            const resDate = r.reservation_date || r.date;
            return resDate === selectedDate && r.id !== currentReservationId; // Exclude current reservation
        });
        
        console.log(`Found ${reservationsOnDate.length} other reservations on ${selectedDate}`);
        
        // Get booked time slots
        const bookedTimes = reservationsOnDate.map(r => {
            let time = r.time_slot || r.time || r.reservation_time || '';
            // Convert to HH:MM format
            if (time.includes(':')) {
                const parts = time.split(':');
                time = `${parts[0].padStart(2, '0')}:${parts[1]}`;
            }
            return time;
        });
        
        console.log('Booked times:', bookedTimes);
        
        // Available time slots (9AM-12PM, 2PM-5PM)
        const allTimeSlots = [
            { value: '09:00', label: '9:00 AM' },
            { value: '10:00', label: '10:00 AM' },
            { value: '11:00', label: '11:00 AM' },
            { value: '12:00', label: '12:00 PM' },
            { value: '14:00', label: '2:00 PM' },
            { value: '15:00', label: '3:00 PM' },
            { value: '16:00', label: '4:00 PM' },
            { value: '17:00', label: '5:00 PM' }
        ];
        
        // Rebuild time select with availability indicators
        timeSelect.innerHTML = '';
        
        allTimeSlots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot.value;
            
            const isBooked = bookedTimes.includes(slot.value);
            const isCurrentTime = slot.value === currentTimeValue;
            
            if (isBooked && !isCurrentTime) {
                option.textContent = `${slot.label} (Already Booked)`;
                option.disabled = true;
                option.style.color = '#ef4444';
                option.style.fontStyle = 'italic';
            } else if (isCurrentTime) {
                option.textContent = `${slot.label} (Current)`;
                option.selected = true;
            } else {
                option.textContent = `${slot.label} (Available)`;
            }
            
            timeSelect.appendChild(option);
        });
        
        console.log('✅ Time slots loaded with availability indicators');
        
    } catch (error) {
        console.error('Error loading time slots:', error);
    }
}

async function loadPriestsForEdit() {
    try {
        const response = await fetch('/api/priests');
        const result = await response.json();
        
        if (result.success && result.data) {
            const priestSelect = document.getElementById('edit-assigned-priest');
            
            // Clear existing options except the first one
            priestSelect.innerHTML = '<option value="">Select a Priest</option>';
            
            // Add priest options
            result.data.forEach(priest => {
                const option = document.createElement('option');
                option.value = priest.id;
                option.textContent = `${priest.first_name} ${priest.last_name} - ${priest.specialization || 'All church services'}`;
                priestSelect.appendChild(option);
            });
            
            console.log('Priests loaded for edit modal:', result.data.length);
        } else {
            console.error('Failed to load priests:', result.error);
        }
    } catch (error) {
        console.error('Error loading priests for edit:', error);
    }
}

function convertTo24Hour(time12h) {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
        hours = '00';
    }
    
    if (modifier === 'PM') {
        hours = parseInt(hours, 10) + 12;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

function showEditModal() {
    const modal = document.getElementById('editReservationModal');
    if (modal) {
        modal.style.display = 'flex';
        console.log('Edit modal shown');
    } else {
        console.error('Edit modal not found');
    }
}

function hideEditModal() {
    const modal = document.getElementById('editReservationModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('Edit modal hidden');
    }
}

async function approveReservation(id) {
    try {
        console.log('Approving reservation ID:', id);
        
        // Find the reservation to get service type
        const reservation = window.reservationTableManager.reservations.find(r => r.id == id);
        if (!reservation) {
            console.error('Reservation not found for ID:', id);
            showCustomAlert('Reservation not found', 'Error', 'error');
            return;
        }

        console.log('Found reservation:', reservation);
        console.log('Service type:', reservation.service_type);

        const response = await fetch(`/api/reservations/${id}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                service_type: reservation.service_type
            })
        });

        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response data:', result);
        
        if (result.success) {
            // Update the reservation status in the local data
            reservation.status = 'confirmed';
            
            // Re-render the table to show updated status
            window.reservationTableManager.loadReservations();
            
            // Show success message
            showCustomAlert('Reservation approved successfully!', 'Success', 'success');
        } else {
            console.error('API Error:', result.error);
            showCustomAlert('Error: ' + result.error, 'Error', 'error');
        }
    } catch (error) {
        console.error('Error approving reservation:', error);
        showCustomAlert('Failed to approve reservation: ' + error.message, 'Error', 'error');
    }
}

async function deleteReservation(id) {
    try {
        // Find the reservation to get service type and client name
        const reservation = window.reservationTableManager.reservations.find(r => r.id == id);
        if (!reservation) {
            showCustomAlert('Reservation not found', 'Error', 'error');
            return;
        }

        const clientName = reservation.contact_name || 'Unknown Client';
        const serviceType = reservation.service_type || 'service';
        
        // Show confirmation dialog with client details
        const confirmMessage = `Are you sure you want to delete this reservation for ${clientName}? This action cannot be undone.`;
        
        showCustomConfirm(confirmMessage, 'Delete Reservation', async () => {
            // User confirmed deletion
            console.log('Deleting reservation ID:', id);
        console.log('Service type:', reservation.service_type);

        // Call the delete API
        const response = await fetch(`/api/reservations/${id}/delete`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                service_type: reservation.service_type
            })
        });

        const result = await response.json();
        console.log('Delete response:', result);
        
        if (result.success) {
            // Remove the reservation from local data
            const index = window.reservationTableManager.reservations.findIndex(r => r.id == id);
            if (index > -1) {
                window.reservationTableManager.reservations.splice(index, 1);
            }
            
            // Re-render the table
            window.reservationTableManager.renderTable();
            
            // Update calendar if it exists
            if (window.calendarReservationSystem && window.calendarReservationSystem.calendar) {
                // Reload calendar data
                window.calendarReservationSystem.loadReservations().then(() => {
                    // Refresh calendar
                    window.calendarReservationSystem.calendar.removeAllEvents();
                });
            }
            
            // Show success message
            showCustomAlert('Reservation deleted successfully!', 'Success', 'success');
        } else {
            console.error('Delete API Error:', result.error);
            showCustomAlert('Error deleting reservation: ' + result.error, 'Error', 'error');
        }
        }); // Close showCustomConfirm callback
        
    } catch (error) {
        console.error('Error deleting reservation:', error);
        showCustomAlert('Failed to delete reservation: ' + error.message, 'Error', 'error');
    }
}

// Setup view modal event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Close modal events
    document.getElementById('viewModalClose')?.addEventListener('click', hideViewModal);
    document.getElementById('closeViewModal')?.addEventListener('click', hideViewModal);
    
    // Modal overlay click to close
    document.querySelector('#viewReservationModal .modal-overlay')?.addEventListener('click', hideViewModal);
    
    // Approve from view modal
    document.getElementById('approveFromView')?.addEventListener('click', function() {
        const reservationId = document.getElementById('viewReservationModal').getAttribute('data-reservation-id');
        hideViewModal();
        approveReservation(reservationId);
    });
    
    // ESC key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('viewReservationModal');
            if (modal && modal.style.display === 'block') {
                hideViewModal();
            }
        }
    });
});

// Priest reassignment function
async function reassignPriest(reservationId) {
    try {
        // First, get the list of available priests
        const priestsResponse = await fetch('/api/priests');
        const priestsResult = await priestsResponse.json();
        
        if (!priestsResult.success || !priestsResult.data.length) {
            showCustomAlert('No priests available for assignment', 'Error', 'error');
            return;
        }
        
        // Create a simple selection dialog
        let priestOptions = 'Please select a priest to assign:\n\n';
        priestsResult.data.forEach((priest, index) => {
            priestOptions += `${index + 1}. ${priest.first_name} ${priest.last_name} - ${priest.specialization}\n`;
        });
        
        const selection = prompt(priestOptions + '\nEnter the number of your choice:');
        
        if (!selection) return; // User cancelled
        
        const selectedIndex = parseInt(selection) - 1;
        if (selectedIndex < 0 || selectedIndex >= priestsResult.data.length) {
            showCustomAlert('Invalid selection', 'Error', 'error');
            return;
        }
        
        const selectedPriest = priestsResult.data[selectedIndex];
        
        // Confirm the reassignment
        const confirmMessage = `Reassign this reservation to ${selectedPriest.first_name} ${selectedPriest.last_name}? This will send a new email notification to the priest.`;
        
        showCustomConfirm(confirmMessage, 'Reassign Priest', async () => {
            // User confirmed reassignment
            // Make the reassignment API call
            const response = await fetch(`/api/reservations/${reservationId}/reassign-priest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                priest_id: selectedPriest.id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showCustomAlert('Priest reassigned successfully! Email notification sent.', 'Success', 'success');
            // Reload the reservations table
            if (window.reservationTableManager) {
                window.reservationTableManager.loadReservations();
            }
        } else {
            showCustomAlert('Error reassigning priest: ' + result.error, 'Error', 'error');
        }
        }); // Close showCustomConfirm callback
        
    } catch (error) {
        console.error('Error reassigning priest:', error);
        showCustomAlert('Failed to reassign priest: ' + error.message, 'Error', 'error');
    }
}

// Helper function to get address from service-specific details
function getAddressFromServiceDetails(reservation) {
    const serviceDetails = reservation.service_details || {};
    const serviceType = reservation.service_type;
    
    switch (serviceType) {
        case 'baptism':
            return serviceDetails.parents_address || 'N/A';
        case 'funeral':
            return serviceDetails.family_address || 'N/A';
        default:
            return 'N/A';
    }
}

// Save reservation changes function
async function saveReservationChanges() {
    try {
        const reservationId = document.getElementById('edit-reservation-id').value;
        
        // Collect form data (excluding contact_email since it doesn't exist in database)
        const formData = {
            service_type: document.getElementById('edit-service-type').value,
            reservation_date: document.getElementById('edit-date').value,
            time_slot: document.getElementById('edit-time').value + ':00', // Add seconds
            contact_first_name: document.getElementById('edit-contact-first-name').value,
            contact_last_name: document.getElementById('edit-contact-last-name').value,
            contact_phone: document.getElementById('edit-contact-phone').value,
            priest_id: document.getElementById('edit-assigned-priest').value,
            special_requests: document.getElementById('edit-special-requests').value
        };
        
        console.log('Saving reservation changes:', formData);
        
        // Validate required fields
        if (!formData.contact_first_name || !formData.contact_first_name.trim()) {
            showCustomAlert('Please enter the first name', 'Validation Error', 'warning');
            return;
        }
        if (!formData.contact_last_name || !formData.contact_last_name.trim()) {
            showCustomAlert('Please enter the last name', 'Validation Error', 'warning');
            return;
        }
        if (!formData.contact_phone || !formData.contact_phone.trim()) {
            showCustomAlert('Please enter the phone number', 'Validation Error', 'warning');
            return;
        }
        if (!formData.service_type) {
            showCustomAlert('Please select a service type', 'Validation Error', 'warning');
            return;
        }
        if (!formData.reservation_date) {
            showCustomAlert('Please select a date', 'Validation Error', 'warning');
            return;
        }
        if (!formData.time_slot || formData.time_slot === ':00') {
            showCustomAlert('Please select a time', 'Validation Error', 'warning');
            return;
        }
        
        console.log('✅ All validation passed, sending to API...');
        
        // Show loading state
        const saveButton = document.getElementById('saveReservationChanges');
        const originalButtonText = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveButton.style.opacity = '0.7';
        saveButton.style.cursor = 'not-allowed';
        
        try {
            // Send update request to API
            const response = await fetch(`/api/reservations/${reservationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            console.log('✅ Update API response:', result);
        
        if (result.success) {
            console.log('✅ Update successful, updated data:', result.data);
            console.log('📝 Updated reservation details:', {
                id: result.data.id,
                service_type: result.data.service_type,
                date: result.data.reservation_date,
                time: result.data.time_slot || result.data.reservation_time,
                contact: result.data.contact_name,
                priest: result.data.priest_name
            });
            
            // Hide modal
            hideEditModal();
            
            // FORCE REFRESH: Clear cache and reload from database
            console.log('🔄 FORCE REFRESHING all data from database...');
            
            // Refresh the table to show updated data
            if (window.reservationTableManager) {
                console.log('🔄 Refreshing reservations table...');
                // Force reload from API (not cache)
                await window.reservationTableManager.loadReservations();
                console.log('✅ Table refreshed with latest database data');
                
                // Verify the updated data is in the table
                const updatedReservation = window.reservationTableManager.reservations.find(r => r.id === reservationId);
                if (updatedReservation) {
                    console.log('✅ Verified: Updated reservation found in table:', updatedReservation.contact_name);
                } else {
                    console.warn('⚠️ Updated reservation not found in table after refresh');
                }
            } else {
                console.error('❌ reservationTableManager not found');
            }
            
            // Also refresh calendar if it exists
            if (window.calendarReservationSystem) {
                console.log('🔄 Refreshing calendar...');
                await window.calendarReservationSystem.loadReservations();
                console.log('✅ Calendar refreshed with latest database data');
            }
            
            // Show success message with confirmation
            showCustomAlert('✅ Reservation updated successfully!\n\n📊 Changes saved to database and visible in real-time.', 'Success', 'success');
        } else {
            console.error('❌ Failed to update reservation:', result.error);
            showCustomAlert('Failed to update reservation: ' + (result.error || 'Unknown error'), 'Error', 'error');
            
            // Restore button state on error
            saveButton.disabled = false;
            saveButton.innerHTML = originalButtonText;
            saveButton.style.opacity = '1';
            saveButton.style.cursor = 'pointer';
        }
        } catch (error) {
            console.error('Error saving reservation changes:', error);
            showCustomAlert('Error saving changes: ' + error.message, 'Error', 'error');
            
            // Restore button state on error
            const saveButton = document.getElementById('saveReservationChanges');
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = '<i class="fas fa-save"></i> Save Changes';
                saveButton.style.opacity = '1';
                saveButton.style.cursor = 'pointer';
            }
        }
    } catch (error) {
        console.error('Error in saveReservationChanges:', error);
        showCustomAlert('Error saving changes: ' + error.message, 'Error', 'error');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.reservationTableManager = new ReservationTableManager();
    
    // Add event listeners for edit modal
    const editModalClose = document.getElementById('editModalClose');
    const cancelEditModal = document.getElementById('cancelEditModal');
    const saveReservationChangesBtn = document.getElementById('saveReservationChanges');
    
    if (editModalClose) {
        editModalClose.addEventListener('click', hideEditModal);
    }
    
    if (cancelEditModal) {
        cancelEditModal.addEventListener('click', hideEditModal);
    }
    
    if (saveReservationChangesBtn) {
        saveReservationChangesBtn.addEventListener('click', saveReservationChanges);
    }
    
    // Close modal when clicking outside
    const editModal = document.getElementById('editReservationModal');
    if (editModal) {
        editModal.addEventListener('click', function(e) {
            if (e.target === editModal || e.target.classList.contains('modal-overlay')) {
                hideEditModal();
            }
        });
    }
    
    // Add event listener for date change in edit modal to update available time slots
    const editDateInput = document.getElementById('edit-date');
    if (editDateInput) {
        editDateInput.addEventListener('change', async function() {
            const selectedDate = this.value;
            const reservationId = document.getElementById('edit-reservation-id').value;
            const currentTime = document.getElementById('edit-time').value;
            
            console.log('📅 Date changed in edit modal:', selectedDate);
            await loadAvailableTimeSlotsForEdit(selectedDate, reservationId, currentTime);
        });
    }
});

// NEW FUNCTION: Populate Service-Specific Details in Edit Modal
// COPIED FROM VIEW MODAL - Same logic, same display
function populateEditServiceDetails(reservation) {
    const container = document.getElementById('edit-service-specific-details');
    
    if (!container) {
        console.warn('Edit service-specific details container not found');
        return;
    }
    
    const serviceType = reservation.service_type;
    const serviceDetails = reservation.service_details || {};
    
    console.log('📋 Edit Modal - Service Details:', serviceDetails);
    
    let detailsHTML = '';
    
    // EDITABLE VERSION - Convert all to INPUT fields
    switch (serviceType) {
        case 'wedding':
            detailsHTML = `
                <div class="form-grid">
                    <div class="form-group">
                        <label for="edit-bride-name">Bride's Name:</label>
                        <input type="text" id="edit-bride-name" class="form-control" value="${serviceDetails.bride_name || ''}" placeholder="Enter bride's name">
                    </div>
                    <div class="form-group">
                        <label for="edit-groom-name">Groom's Name:</label>
                        <input type="text" id="edit-groom-name" class="form-control" value="${serviceDetails.groom_name || ''}" placeholder="Enter groom's name">
                    </div>
                </div>
            `;
            break;
        case 'baptism':
            detailsHTML = `
                <div class="form-grid">
                    <div class="form-group">
                        <label for="edit-child-name">Child's Name:</label>
                        <input type="text" id="edit-child-name" class="form-control" value="${serviceDetails.child_name || ''}" placeholder="Enter child's name">
                    </div>
                    <div class="form-group">
                        <label for="edit-birth-date">Birth Date:</label>
                        <input type="date" id="edit-birth-date" class="form-control" value="${serviceDetails.birth_date || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-father-name">Father's Name:</label>
                        <input type="text" id="edit-father-name" class="form-control" value="${serviceDetails.father_name || ''}" placeholder="Enter father's name">
                    </div>
                    <div class="form-group">
                        <label for="edit-mother-name">Mother's Name:</label>
                        <input type="text" id="edit-mother-name" class="form-control" value="${serviceDetails.mother_name || ''}" placeholder="Enter mother's name">
                    </div>
                </div>
            `;
            break;
        case 'funeral':
            detailsHTML = `
                <div class="form-grid">
                    <div class="form-group">
                        <label for="edit-deceased-name">Deceased Name:</label>
                        <input type="text" id="edit-deceased-name" class="form-control" value="${serviceDetails.deceased_name || ''}" placeholder="Enter deceased name">
                    </div>
                    <div class="form-group">
                        <label for="edit-date-of-death">Date of Death:</label>
                        <input type="date" id="edit-date-of-death" class="form-control" value="${serviceDetails.date_of_death || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-funeral-home-contact">Funeral Home Contact:</label>
                        <input type="text" id="edit-funeral-home-contact" class="form-control" value="${serviceDetails.funeral_home_contact || ''}" placeholder="Enter funeral home contact">
                    </div>
                </div>
            `;
            break;
        case 'confirmation':
            detailsHTML = `
                <div class="form-grid">
                    <div class="form-group">
                        <label for="edit-confirmand-name">Confirmand's Name:</label>
                        <input type="text" id="edit-confirmand-name" class="form-control" value="${serviceDetails.confirmand_name || ''}" placeholder="Enter confirmand's name">
                    </div>
                    <div class="form-group">
                        <label for="edit-confirmation-name">Confirmation Name:</label>
                        <input type="text" id="edit-confirmation-name" class="form-control" value="${serviceDetails.confirmation_name || ''}" placeholder="Enter confirmation name">
                    </div>
                    <div class="form-group">
                        <label for="edit-sponsor-name">Sponsor's Name:</label>
                        <input type="text" id="edit-sponsor-name" class="form-control" value="${serviceDetails.sponsor_name || ''}" placeholder="Enter sponsor's name">
                    </div>
                </div>
            `;
            break;
        default:
            detailsHTML = '<p style="text-align: center; color: #6B7280;">No service-specific details available</p>';
    }
    
    container.innerHTML = detailsHTML;
    console.log('✅ Edit modal: Service-specific details populated for', serviceType);
}

// NEW FUNCTION: Populate Payment Information in Edit Modal (EDITABLE)
async function populateEditPaymentInfo(reservation) {
    // Find the stipendium section
    const stipendiumSection = document.querySelector('#editReservationModal .form-section:has(#edit-payment-status)');
    
    // HIDE stipendium section for Baptism and Confirmation (FREE services)
    if (reservation.service_type === 'baptism' || reservation.service_type === 'confirmation') {
        if (stipendiumSection) {
            stipendiumSection.style.display = 'none';
        }
        console.log(`✅ Edit modal: ${reservation.service_type} is FREE - Stipendium section HIDDEN`);
        return;
    }
    
    // SHOW stipendium section for Wedding and Funeral (PAID services)
    if (stipendiumSection) {
        stipendiumSection.style.display = 'block';
    }
    
    // Helper function for safe element updates - now for INPUT/SELECT fields
    const safeSetValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.value = value || '';
        } else {
            console.warn(`Edit modal: Element not found: ${id}`);
        }
    };
    
    // Fetch payment information from API
    try {
        const paymentLookupKey = reservation.reservation_id || reservation.id;
        const paymentResponse = await fetch(`/api/payments/${paymentLookupKey}`);
        
        if (paymentResponse.ok) {
            const paymentResult = await paymentResponse.json();
            
            if (paymentResult.success && paymentResult.data) {
                const payment = paymentResult.data;
                
                // Populate SELECT and INPUT fields with actual values
                safeSetValue('edit-payment-status', payment.payment_status || '');
                safeSetValue('edit-payment-type', payment.payment_type || '');
                safeSetValue('edit-base-price', payment.base_price || '');
                safeSetValue('edit-amount-due', payment.amount_due || '');
                safeSetValue('edit-amount-paid', payment.amount_paid || '');
                safeSetValue('edit-balance', payment.balance || '');
                safeSetValue('edit-payment-method', payment.payment_method || '');
                
                console.log('✅ Edit modal: Payment information populated (EDITABLE)');
            } else {
                // No payment data found - leave fields empty for user to fill
                console.log('⚠️ No payment data found - fields left empty');
            }
        } else {
            console.log('⚠️ Payment API response not OK - fields left empty');
        }
    } catch (error) {
        console.error('Edit modal: Error fetching payment info:', error);
    }
}

// ============================================
// ATTENDANCE TRACKING FUNCTIONS
// ============================================

/**
 * Get attendance badge HTML
 */
function getAttendanceBadge(status) {
    switch(status) {
        case 'attended':
            return '<span class="attendance-badge attended"><i class="fas fa-check"></i> ATTENDED</span>';
        case 'no_show':
            return '<span class="attendance-badge no-show"><i class="fas fa-times"></i> NO-SHOW</span>';
        case 'cancelled':
            return '<span class="attendance-badge cancelled"><i class="fas fa-ban"></i> CANCELLED</span>';
        case 'pending':
        default:
            return '<span class="attendance-badge pending"><i class="fas fa-clock"></i> PENDING</span>';
    }
}

/**
 * Check if attendance buttons should be shown
 */
function shouldShowAttendanceButtons(reservation) {
    // Show attendance buttons if:
    // 1. Status is approved or completed (confirmed reservations)
    // 2. Attendance is still pending (not yet marked)
    
    console.log('🔍 Checking attendance button eligibility:');
    console.log('   - Reservation status:', reservation.status);
    console.log('   - Attendance status:', reservation.attendance_status);
    
    const isApprovedOrCompleted = reservation.status === 'approved' || reservation.status === 'completed';
    const isPending = !reservation.attendance_status || reservation.attendance_status === 'pending';
    
    console.log('   - Is approved/completed?', isApprovedOrCompleted);
    console.log('   - Is attendance pending?', isPending);
    console.log('   - Should show buttons?', isApprovedOrCompleted && isPending);
    
    // Allow marking attendance for any approved/completed reservation
    // Secretary can mark attendance anytime (before, during, or after the event)
    return isApprovedOrCompleted && isPending;
}

/**
 * Mark attendance (attended or no_show)
 */
async function markAttendance(status) {
    const reservationId = document.getElementById('viewReservationModal')
        .getAttribute('data-reservation-id');
    
    if (!reservationId) {
        showCustomAlert('Reservation ID not found', 'Error', 'error');
        return;
    }
    
    // Get the reservation data to check service type and date
    const reservation = window.reservationTableManager.reservations.find(r => r.id == reservationId);
    if (!reservation) {
        showCustomAlert('Reservation data not found', 'Error', 'error');
        return;
    }
    
    // WEDDING CANCELLATION POLICY: Must be at least 30 days before the reservation date
    if (status === 'cancelled' && reservation.service_type === 'wedding') {
        const reservationDate = new Date(reservation.reservation_date || reservation.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        reservationDate.setHours(0, 0, 0, 0);
        
        // Calculate days until reservation
        const daysUntilReservation = Math.ceil((reservationDate - today) / (1000 * 60 * 60 * 24));
        
        console.log('Wedding cancellation check:', {
            reservationDate: reservationDate.toDateString(),
            today: today.toDateString(),
            daysUntilReservation: daysUntilReservation
        });
        
        // Must be at least 30 days before the wedding date
        if (daysUntilReservation < 30) {
            showCustomAlert(
                `Cannot cancel wedding reservation. Cancellations must be made at least 30 days before the wedding date.\n\nDays remaining: ${daysUntilReservation} days\nRequired: 30 days minimum`,
                'Cancellation Not Allowed',
                'warning'
            );
            return;
        }
    }
    
    // Confirm action
    let confirmMsg, confirmTitle;
    if (status === 'attended') {
        confirmMsg = 'Mark this reservation as ATTENDED? This means the client showed up for their appointment.';
        confirmTitle = 'Mark as Attended';
    } else if (status === 'no_show') {
        confirmMsg = 'Mark this reservation as NO-SHOW? This means the client did NOT show up for their appointment.';
        confirmTitle = 'Mark as No-Show';
    } else if (status === 'cancelled') {
        // Check if this is a paid service (Wedding, Baptism, Funeral)
        const isPaidService = ['wedding', 'baptism', 'funeral'].includes(reservation.service_type);
        
        if (isPaidService) {
            confirmMsg = 'Mark this reservation as CANCELLED?\n\n💰 REFUND POLICY: Any payments made will be automatically refunded (amount paid will be reset to ₱0). The client can collect their full refund from the church office.\n\nThis action will cancel the reservation and process the refund.';
            confirmTitle = 'Cancel & Refund';
        } else {
            confirmMsg = 'Mark this reservation as CANCELLED? This means the reservation was cancelled and did not proceed.';
            confirmTitle = 'Mark as Cancelled';
        }
    }
    
    showCustomConfirm(confirmMsg, confirmTitle, async () => {
        // User confirmed the action
        try {
            console.log(`Marking attendance as ${status} for reservation ${reservationId}`);
        
        const response = await fetch(`/api/reservations/${reservationId}/attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                attendance_status: status
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const statusText = status === 'attended' ? 'ATTENDED' : (status === 'no_show' ? 'NO-SHOW' : 'CANCELLED');
            
            console.log('✅ Attendance marked successfully:', result);
            
            // Update the attendance badge in the modal IMMEDIATELY
            const attendanceStatusEl = document.getElementById('detail-attendance-status');
            if (attendanceStatusEl) {
                attendanceStatusEl.innerHTML = getAttendanceBadge(status);
            }
            
            // Hide the attendance action buttons
            const attendanceActionsDiv = document.getElementById('attendanceActions');
            if (attendanceActionsDiv) {
                attendanceActionsDiv.style.display = 'none';
            }
            
            // Show marked at time
            const attendanceMarkedAtContainer = document.getElementById('attendanceMarkedAtContainer');
            const attendanceMarkedAtEl = document.getElementById('detail-attendance-marked-at');
            if (attendanceMarkedAtContainer && attendanceMarkedAtEl) {
                const now = new Date();
                attendanceMarkedAtEl.textContent = now.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                attendanceMarkedAtContainer.style.display = 'block';
            }
            
            // Show success alert with refund info if cancelled
            let successMessage = `Attendance marked as ${statusText}`;
            if (status === 'cancelled' && ['wedding', 'baptism', 'funeral'].includes(reservation.service_type)) {
                successMessage = `Reservation cancelled successfully!\n\n💰 REFUND PROCESSED: Payment has been reset to ₱0. The client can collect their full refund from the church office.`;
            }
            showCustomAlert(successMessage, 'Success', 'success');
            
            // Refresh the reservations table
            if (window.reservationTableManager) {
                await window.reservationTableManager.loadReservations();
            }
            
            // Close the modal
            hideViewModal();
        } else {
            showCustomAlert(`Error: ${result.error}`, 'Error', 'error');
            console.error('Error marking attendance:', result.error);
        }
        } catch (error) {
            console.error('Error marking attendance:', error);
            showCustomAlert('Failed to mark attendance. Please try again.', 'Error', 'error');
        }
    }); // Close showCustomConfirm callback
}

/**
 * Setup attendance tracking in View Modal
 */
function setupAttendanceTracking(reservation) {
    // Get elements
    const attendanceStatusEl = document.getElementById('detail-attendance-status');
    const attendanceMarkedAtEl = document.getElementById('detail-attendance-marked-at');
    const attendanceMarkedAtContainer = document.getElementById('attendanceMarkedAtContainer');
    const attendanceActionsDiv = document.getElementById('attendanceActions');
    
    if (!attendanceStatusEl || !attendanceActionsDiv) {
        console.warn('Attendance elements not found');
        return;
    }
    
    // Display current attendance status
    const attendanceStatus = reservation.attendance_status || 'pending';
    attendanceStatusEl.innerHTML = getAttendanceBadge(attendanceStatus);
    
    // Show marked at time if available
    if (reservation.attendance_marked_at && attendanceStatus !== 'pending') {
        const markedAt = new Date(reservation.attendance_marked_at);
        attendanceMarkedAtEl.textContent = markedAt.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        attendanceMarkedAtContainer.style.display = 'block';
    } else {
        attendanceMarkedAtContainer.style.display = 'none';
    }
    
    // Show/hide attendance action buttons
    if (shouldShowAttendanceButtons(reservation)) {
        attendanceActionsDiv.style.display = 'flex';
        console.log('✅ Attendance buttons shown - reservation is eligible for attendance marking');
    } else {
        attendanceActionsDiv.style.display = 'none';
        console.log('⚠️ Attendance buttons hidden - reservation not eligible');
    }
}

// Add event listeners for attendance buttons
document.addEventListener('DOMContentLoaded', function() {
    const markAttendedBtn = document.getElementById('markAttendedBtn');
    const markNoShowBtn = document.getElementById('markNoShowBtn');
    const markCancelledBtn = document.getElementById('markCancelledBtn');
    
    if (markAttendedBtn) {
        markAttendedBtn.addEventListener('click', () => markAttendance('attended'));
    }
    
    if (markNoShowBtn) {
        markNoShowBtn.addEventListener('click', () => markAttendance('no_show'));
    }
    
    if (markCancelledBtn) {
        markCancelledBtn.addEventListener('click', () => markAttendance('cancelled'));
    }
    
    console.log('✅ Attendance tracking event listeners initialized');
});
