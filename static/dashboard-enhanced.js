// ChurchEase Modern Dashboard Enhanced JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard with animations
    initializeDashboard();
    initializeCharts();
    initializeMiniCalendar();
    
    // Enhanced Sidebar Toggle with Smooth Animation
    const menuToggle = document.getElementById('menuToggle');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    // Desktop sidebar toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
            
            // Save preference to localStorage
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });
    }
    
    // Mobile sidebar toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
            document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
        });
    }
    
    // Close mobile sidebar on overlay click
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Restore sidebar state from localStorage
    if (localStorage.getItem('sidebarCollapsed') === 'true' && window.innerWidth > 768) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }

    // Enhanced Navigation with Smooth Transitions
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && !href.includes('login.html')) {
                e.preventDefault();
                
                // Remove active class from all links with animation
                navLinks.forEach(l => {
                    l.classList.remove('active');
                    l.style.transition = 'all 0.3s ease';
                });
                
                // Add active class to clicked link
                this.classList.add('active');
                
                // Update page content with fade effect
                const page = this.dataset.page;
                const dashboardContent = document.getElementById('dashboardContent');
                
                // Fade out
                dashboardContent.style.opacity = '0';
                dashboardContent.style.transform = 'translateY(10px)';
                
                setTimeout(() => {
                    // Update breadcrumb
                    updateBreadcrumb(page);
                    
                    // Update page title with animation
                    const pageTitle = document.querySelector('.page-title');
                    const pageSubtitle = document.querySelector('.page-subtitle');
                    
                    pageTitle.textContent = getPageTitle(page);
                    pageSubtitle.textContent = getPageSubtitle(page);
                    
                    // Fade in
                    dashboardContent.style.opacity = '1';
                    dashboardContent.style.transform = 'translateY(0)';
                }, 300);
                
                // Close mobile sidebar if open
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            }
        });
    });
    
    // Helper functions for page navigation
    function updateBreadcrumb(page) {
        const breadcrumb = document.querySelector('.breadcrumb');
        if (breadcrumb) {
            breadcrumb.innerHTML = `
                <a href="#">Home</a>
                <i class="fas fa-chevron-right"></i>
                <span>${getPageTitle(page)}</span>
            `;
        }
    }
    
    function getPageTitle(page) {
        const titles = {
            dashboard: 'Secretary Dashboard',
            reservations: 'Reservations',
            members: 'Church Members',
            services: 'Church Services',
            calendar: 'Calendar',
            reports: 'Reports',
            settings: 'Settings'
        };
        return titles[page] || page.charAt(0).toUpperCase() + page.slice(1);
    }
    
    function getPageSubtitle(page) {
        const subtitles = {
            dashboard: 'Welcome back, Administrator! Manage your church operations and oversee all activities.',
            reservations: 'Manage and track all church service reservations.',
            members: 'View and manage church member information.',
            services: 'Schedule and organize church services.',
            calendar: 'View all scheduled activities.',
            settings: 'Configure your dashboard preferences.'
        };
        return subtitles[page] || 'Manage your church activities efficiently.';
    }

    // Enhanced Notification Bell
    const notificationBell = document.getElementById('notificationBell');
    const notificationDropdown = document.getElementById('notificationDropdown');
    
    if (notificationBell && notificationDropdown) {
        notificationBell.addEventListener('click', function(e) {
            e.stopPropagation();
            const isShowing = notificationDropdown.classList.contains('show');
            
            // Close all dropdowns first
            closeAllDropdowns();
            
            if (!isShowing) {
                notificationDropdown.classList.add('show');
                // Animate badge removal
                setTimeout(() => {
                    const badge = this.querySelector('.notification-badge');
                    if (badge) {
                        badge.style.animation = 'scaleOut 0.3s ease';
                        setTimeout(() => badge.style.display = 'none', 300);
                    }
                }, 500);
            }
        });
    }
    
    // Enhanced User Profile Dropdown (Header)
    const userProfile = document.getElementById('userProfile');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userProfile && userDropdown) {
        userProfile.addEventListener('click', function(e) {
            e.stopPropagation();
            const isShowing = userDropdown.classList.contains('show');
            
            // Close all dropdowns first
            closeAllDropdowns();
            
            if (!isShowing) {
                userDropdown.classList.add('show');
            }
        });
    }
    
    // Sidebar User Profile Dropdown
    const sidebarUserProfile = document.getElementById('sidebarUserProfile');
    const sidebarUserDropdown = document.getElementById('sidebarUserDropdown');
    
    if (sidebarUserProfile && sidebarUserDropdown) {
        sidebarUserProfile.addEventListener('click', function(e) {
            e.stopPropagation();
            const isShowing = sidebarUserDropdown.classList.contains('show');
            
            // Close all dropdowns first
            closeAllDropdowns();
            
            if (!isShowing) {
                sidebarUserDropdown.classList.add('show');
            }
        });
    }

    // Profile Settings Modal Functionality
    const profileSettingsModal = document.getElementById('profileSettingsModal');
    const logoutModal = document.getElementById('logoutModal');
    
    // Handle dropdown item clicks
    document.addEventListener('click', function(e) {
        // My Profile / Account Settings click
        if (e.target.closest('.dropdown-item') && 
            (e.target.textContent.includes('My Profile') || 
             e.target.textContent.includes('Account Settings'))) {
            e.preventDefault();
            closeAllDropdowns();
            showModal(profileSettingsModal);
        }
        
        // Logout click
        if (e.target.closest('.dropdown-item') && e.target.textContent.includes('Logout')) {
            e.preventDefault();
            closeAllDropdowns();
            showModal(logoutModal);
        }
    });

    // Profile Settings Modal Controls
    const closeProfileModal = document.getElementById('closeProfileModal');
    const cancelProfileSettings = document.getElementById('cancelProfileSettings');
    const saveProfileSettings = document.getElementById('saveProfileSettings');

    if (closeProfileModal) {
        closeProfileModal.addEventListener('click', () => hideModal(profileSettingsModal));
    }
    if (cancelProfileSettings) {
        cancelProfileSettings.addEventListener('click', () => hideModal(profileSettingsModal));
    }
    if (saveProfileSettings) {
        saveProfileSettings.addEventListener('click', function() {
            // Add save functionality here
            alert('Profile settings saved successfully!');
            hideModal(profileSettingsModal);
        });
    }

    // Logout Modal Controls
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');

    if (cancelLogout) {
        cancelLogout.addEventListener('click', () => hideModal(logoutModal));
    }
    if (confirmLogout) {
        confirmLogout.addEventListener('click', function() {
            // Redirect to login page
            window.location.href = '/';
        });
    }

    // Modal utility functions
    function showModal(modal) {
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    function hideModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target);
        }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.notification-dropdown') && !e.target.closest('.user-dropdown')) {
            closeAllDropdowns();
        }
    });
    
    // Helper function to close all dropdowns
    function closeAllDropdowns() {
        if (notificationDropdown) notificationDropdown.classList.remove('show');
        if (userDropdown) userDropdown.classList.remove('show');
        if (sidebarUserDropdown) sidebarUserDropdown.classList.remove('show');
    }
    
    // Add keyboard navigation for dropdowns
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllDropdowns();
        }
    });

    // Enhanced Quick Action Cards with Hover Effects
    const quickActionCards = document.querySelectorAll('.quick-action-card');
    quickActionCards.forEach(card => {
        card.addEventListener('click', function() {
            const action = this.dataset.action;
            
            // Add click animation
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
                handleQuickAction(action);
            }, 200);
        });
        
        // Add ripple effect on click
        card.addEventListener('mousedown', function(e) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = e.offsetX + 'px';
            ripple.style.top = e.offsetY + 'px';
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Filter Functionality
    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            filterTable();
        });
    });

    function filterTable() {
        const serviceFilter = document.getElementById('serviceFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const dateFilter = document.getElementById('dateFilter').value;
        
        const rows = document.querySelectorAll('.data-table tbody tr');
        
        rows.forEach(row => {
            let show = true;
            
            if (serviceFilter !== 'all') {
                const service = row.querySelector('td:nth-child(3)').textContent;
                if (!service.toLowerCase().includes(serviceFilter)) {
                    show = false;
                }
            }
            
            if (statusFilter !== 'all') {
                const status = row.querySelector('.status-badge').textContent.toLowerCase();
                if (status !== statusFilter) {
                    show = false;
                }
            }
            
            row.style.display = show ? '' : 'none';
        });
    }

// Calendar Functionality
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.today = new Date();
        
        // Sample reservation data
        this.reservations = [
            { date: '2024-09-15', service: 'wedding', client: 'John & Mary', time: '2:00 PM' },
            { date: '2024-09-10', service: 'baptism', client: 'Baby Smith', time: '10:00 AM' },
            { date: '2024-09-08', service: 'funeral', client: 'Robert Johnson', time: '11:00 AM' },
            { date: '2024-09-20', service: 'confirmation', client: 'Sarah Williams', time: '3:00 PM' },
            { date: '2024-09-25', service: 'wedding', client: 'Michael & Lisa', time: '4:00 PM' },
            { date: '2024-09-12', service: 'baptism', client: 'Baby Garcia', time: '9:00 AM' },
            { date: '2024-09-18', service: 'confirmation', client: 'Mark Davis', time: '1:00 PM' }
        ];
        
        this.monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.renderCalendar();
    }
    
    bindEvents() {
            const prevBtn = document.getElementById('calendarPrevMonth');
            const nextBtn = document.getElementById('calendarNextMonth');
            
            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    this.currentMonth--;
                    if (this.currentMonth < 0) {
                        this.currentMonth = 11;
                        this.currentYear--;
                    }
                    this.renderCalendar();
                });
            }
            
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    this.currentMonth++;
                    if (this.currentMonth > 11) {
                        this.currentMonth = 0;
                        this.currentYear++;
                    }
                    this.renderCalendar();
                });
            }
            
            // Service filter
            const serviceFilter = document.getElementById('calendarServiceFilter');
            if (serviceFilter) {
                serviceFilter.addEventListener('change', () => {
                    this.renderCalendar();
                });
            }
        }
        
        renderCalendar() {
            const calendarBody = document.getElementById('calendarBody');
            const currentMonthElement = document.getElementById('calendarCurrentMonth');
            
            if (!calendarBody || !currentMonthElement) return;
            
            // Update month display
            currentMonthElement.textContent = `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
            
            // Clear calendar
            calendarBody.innerHTML = '';
            
            // Get first day of month and number of days
            const firstDay = new Date(this.currentYear, this.currentMonth, 1);
            const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startingDayOfWeek = firstDay.getDay();
            
            // Get previous month's last days
            const prevMonth = new Date(this.currentYear, this.currentMonth, 0);
            const daysInPrevMonth = prevMonth.getDate();
            
            // Create calendar grid
            let dayCount = 1;
            let nextMonthDay = 1;
            
            // Create 6 weeks (42 days)
            for (let week = 0; week < 6; week++) {
                for (let day = 0; day < 7; day++) {
                    const dayElement = document.createElement('div');
                    dayElement.className = 'calendar-day';
                    
                    const totalDays = week * 7 + day;
                    
                    if (totalDays < startingDayOfWeek) {
                        // Previous month days
                        const prevMonthDate = daysInPrevMonth - (startingDayOfWeek - totalDays - 1);
                        dayElement.classList.add('other-month');
                        dayElement.innerHTML = `<div class="day-number">${prevMonthDate}</div>`;
                    } else if (dayCount <= daysInMonth) {
                        // Current month days
                        dayElement.innerHTML = `<div class="day-number">${dayCount}</div>`;
                        
                        // Check if it's today
                        if (this.currentYear === this.today.getFullYear() && 
                            this.currentMonth === this.today.getMonth() && 
                            dayCount === this.today.getDate()) {
                            dayElement.classList.add('today');
                        }
                        
                        // Add events for this day
                        const dayEvents = this.getEventsForDate(this.currentYear, this.currentMonth, dayCount);
                        if (dayEvents.length > 0) {
                            dayElement.classList.add('has-events');
                            const eventsContainer = document.createElement('div');
                            eventsContainer.className = 'calendar-events';
                            
                            dayEvents.forEach(event => {
                                const eventElement = document.createElement('div');
                                eventElement.className = `calendar-event ${event.service}`;
                                // Format service name with capital first letter
                                const serviceName = event.service.charAt(0).toUpperCase() + event.service.slice(1);
                                // Display format: Client Name • Service • Time
                                eventElement.innerHTML = `
                                    <div style="font-weight: 600; margin-bottom: 2px;">${event.client}</div>
                                    <div style="font-size: 11px; opacity: 0.9;">${serviceName} • ${event.time}</div>
                                `;
                                eventElement.title = `${serviceName} - ${event.client} at ${event.time}`;
                                eventsContainer.appendChild(eventElement);
                            });
                            
                            dayElement.appendChild(eventsContainer);
                        }
                        
                        dayCount++;
                    } else {
                        // Next month days
                        dayElement.classList.add('other-month');
                        dayElement.innerHTML = `<div class="day-number">${nextMonthDay}</div>`;
                        nextMonthDay++;
                    }
                    
                    calendarBody.appendChild(dayElement);
                }
            }
        }
        
        getEventsForDate(year, month, day) {
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const serviceFilter = document.getElementById('calendarServiceFilter');
            const selectedService = serviceFilter ? serviceFilter.value : 'all';
            
            return this.reservations.filter(reservation => {
                const matchesDate = reservation.date === dateString;
                const matchesService = selectedService === 'all' || reservation.service === selectedService;
                return matchesDate && matchesService;
            });
        }
    }

    // Initialize calendar when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, initializing calendar...');
        
        // Handle tab switching to initialize calendar
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                console.log('Tab clicked:', tabName);
                
                // Remove active class from all tabs and buttons
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
                
                // Add active class to clicked button and corresponding tab
                this.classList.add('active');
                const targetTab = document.getElementById(tabName);
                if (targetTab) {
                    targetTab.classList.add('active');
                }
                
                if (tabName === 'calendar-view') {
                    setTimeout(() => {
                        console.log('Initializing calendar for calendar-view tab');
                        if (!window.calendarManager) {
                            window.calendarManager = new CalendarManager();
                        } else {
                            window.calendarManager.renderCalendar();
                        }
                    }, 200);
                }
            });
        });
        
        // Also initialize calendar immediately if calendar tab is visible
        setTimeout(() => {
            const calendarBody = document.getElementById('calendarBody');
            if (calendarBody && calendarBody.offsetParent !== null) {
                console.log('Calendar body is visible, initializing...');
                if (!window.calendarManager) {
                    window.calendarManager = new CalendarManager();
                }
            }
        }, 500);
    });
    
    // Calendar navigation is now handled by CalendarManager class

    // Export Functionality
    const exportButtons = document.querySelectorAll('.export-btn');
    exportButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const format = this.dataset.format;
            exportData(format);
        });
    });

    // Table Row Actions
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            const reservationId = this.closest('tr').dataset.id;
            handleTableAction(action, reservationId);
        });
    });

    function handleTableAction(action, id) {
        switch(action) {
            case 'view':
                console.log('Viewing reservation:', id);
                showNotification('Opening reservation details...', 'info');
                break;
            case 'edit':
                console.log('Editing reservation:', id);
                showNotification('Loading edit form...', 'info');
                break;
            case 'delete':
                if (confirm('Are you sure you want to delete this reservation?')) {
                    console.log('Deleting reservation:', id);
                    showNotification('Reservation deleted successfully', 'success');
                }
                break;
        }
    }

    // Auto-refresh Dashboard Data
    function refreshDashboardData() {
        // Simulate data refresh
        console.log('Refreshing dashboard data...');
        
        // Update stat cards with random values for demo
        document.querySelectorAll('.stat-value').forEach(stat => {
            const currentValue = parseInt(stat.textContent);
            const change = Math.floor(Math.random() * 5) - 2;
            stat.textContent = Math.max(0, currentValue + change);
        });
    }

    // Refresh every 30 seconds
    setInterval(refreshDashboardData, 30000);

    // Responsive adjustments
    function handleResponsive() {
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
        }
    }

    window.addEventListener('resize', handleResponsive);
    handleResponsive();
});

// Additional helper functions
function initializeDashboard() {
    // Add entrance animations to dashboard elements
    animateDashboardElements();
    
    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
}

// Animate dashboard elements on load
function animateDashboardElements() {
    const cards = document.querySelectorAll('.stat-card');
    const widgets = document.querySelectorAll('.activity-chart, .mini-calendar');
    const sections = document.querySelectorAll('.quick-actions, .reservations-section, .calendar-section');
    
    // Animate stat cards
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    // Animate widgets
    widgets.forEach((widget, index) => {
        widget.style.opacity = '0';
        widget.style.transform = 'scale(0.95)';
        setTimeout(() => {
            widget.style.transition = 'all 0.5s ease';
            widget.style.opacity = '1';
            widget.style.transform = 'scale(1)';
        }, 400 + index * 150);
    });
    
    // Animate sections
    sections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        setTimeout(() => {
            section.style.transition = 'all 0.6s ease';
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, 600 + index * 200);
    });
}

// Initialize Charts with Chart.js
function initializeCharts() {
    const ctx = document.getElementById('activityChart');
    if (ctx) {
        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.2)');
        gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Reservations',
                    data: [12, 19, 15, 25, 22, 30, 28],
                    borderColor: '#4F46E5',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4F46E5',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(31, 41, 55, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#4F46E5',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return 'Reservations: ' + context.parsed.y;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(229, 231, 235, 0.5)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#6B7280',
                            font: {
                                size: 12
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#6B7280',
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
}

// Initialize Mini Calendar
function initializeMiniCalendar() {
    const miniCalendarGrid = document.getElementById('miniCalendarGrid');
    if (!miniCalendarGrid) return;
    
    const currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    
    function generateMiniCalendar() {
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const today = currentDate.getDate();
        const isCurrentMonth = currentMonth === currentDate.getMonth() && currentYear === currentDate.getFullYear();
        
        let html = '';
        
        // Day headers
        const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        dayHeaders.forEach(day => {
            html += `<div class="mini-cal-day" style="font-weight: 600; color: var(--text-medium);">${day}</div>`;
        });
        
        // Empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            html += `<div class="mini-cal-day" style="opacity: 0.3;"></div>`;
        }
        
        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = isCurrentMonth && day === today;
            const hasEvent = false; // No events
            
            html += `<div class="mini-cal-day ${isToday ? 'today' : ''}">${day}</div>`;
        }
        
        miniCalendarGrid.innerHTML = html;
    }
    
    generateMiniCalendar();
    
    // Navigation buttons
    const miniPrevBtn = document.getElementById('miniPrevMonth');
    const miniNextBtn = document.getElementById('miniNextMonth');
    
    if (miniPrevBtn) {
        miniPrevBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            generateMiniCalendar();
        });
    }
    
    if (miniNextBtn) {
        miniNextBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            generateMiniCalendar();
        });
    }
}

// Handle quick actions
function handleQuickAction(action) {
    switch(action) {
        case 'new-reservation':
            console.log('Opening new reservation form');
            showNotification('Opening reservation form...', 'info');
            break;
        case 'approve-pending':
            console.log('Showing pending approvals');
            showNotification('Loading pending approvals...', 'info');
            break;
        case 'view-calendar':
            console.log('Switching to calendar view');
            // Trigger calendar navigation
            const calendarLink = document.querySelector('[data-page="calendar"]');
            if (calendarLink) calendarLink.click();
            break;
        case 'export-data':
            exportData('csv');
            showNotification('Exporting data...', 'success');
            break;
        default:
            console.log('Unknown action:', action);
    }
}

// Show notification helper
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10B981' : '#4F46E5'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Export data function
function exportData(format) {
    const table = document.querySelector('.data-table');
    if (!table) return;
    
    if (format === 'csv') {
        let csv = [];
        
        // Get headers
        const headers = [];
        table.querySelectorAll('thead th').forEach(th => {
            headers.push(th.textContent.trim());
        });
        csv.push(headers.join(','));
        
        // Get data rows
        table.querySelectorAll('tbody tr').forEach(row => {
            const rowData = [];
            row.querySelectorAll('td').forEach((td, index) => {
                if (index < headers.length - 1) { // Skip action column
                    rowData.push(td.textContent.trim());
                }
            });
            csv.push(rowData.join(','));
        });
        
        // Download CSV
        const csvContent = csv.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'church_reservations.csv';
        a.click();
    }
}

// Add CSS for animations
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes scaleOut {
        from {
            transform: scale(1);
        }
        to {
            transform: scale(0);
        }
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: scale(0);
        animation: rippleEffect 0.6s ease-out;
        pointer-events: none;
        width: 40px;
        height: 40px;
        margin-left: -20px;
        margin-top: -20px;
    }
    
    @keyframes rippleEffect {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(animationStyles);
