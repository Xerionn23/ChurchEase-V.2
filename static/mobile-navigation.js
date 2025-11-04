/* ============================================================================ */
/* CHURCHEASE V.2 - MOBILE NAVIGATION & RESPONSIVE HANDLERS */
/* ============================================================================ */

class MobileNavigationManager {
    constructor() {
        this.sidebar = null;
        this.sidebarOverlay = null;
        this.menuToggle = null;
        this.init();
    }

    init() {
        console.log('Initializing Mobile Navigation Manager...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Get sidebar elements
        this.sidebar = document.querySelector('.sidebar');
        
        // Create overlay if it doesn't exist
        if (!document.querySelector('.sidebar-overlay')) {
            this.createOverlay();
        }
        this.sidebarOverlay = document.querySelector('.sidebar-overlay');
        
        // Create or get menu toggle button
        this.setupMenuToggle();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Handle window resize
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
        
        console.log('Mobile Navigation Manager initialized successfully');
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    setupMenuToggle() {
        // Check if menu toggle already exists
        this.menuToggle = document.querySelector('.menu-toggle');
        
        if (!this.menuToggle) {
            // Create menu toggle button
            const toggle = document.createElement('button');
            toggle.className = 'menu-toggle';
            toggle.innerHTML = '<i class="fas fa-bars"></i>';
            toggle.setAttribute('aria-label', 'Toggle Menu');
            
            // Insert into header
            const header = document.querySelector('.top-header, .enhanced-header, header');
            if (header) {
                const headerContent = header.querySelector('.header-content');
                if (headerContent) {
                    headerContent.insertBefore(toggle, headerContent.firstChild);
                } else {
                    header.insertBefore(toggle, header.firstChild);
                }
            }
            
            this.menuToggle = toggle;
        }
    }

    setupEventListeners() {
        // Menu toggle click
        if (this.menuToggle) {
            this.menuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSidebar();
            });
        }

        // Overlay click to close sidebar
        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => {
                this.closeSidebar();
            });
        }

        // Close sidebar when clicking navigation links on mobile
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    this.closeSidebar();
                }
            });
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.sidebar && this.sidebar.classList.contains('active')) {
                this.closeSidebar();
            }
        });

        // Prevent body scroll when sidebar is open on mobile
        this.sidebar.addEventListener('touchmove', (e) => {
            if (window.innerWidth <= 768 && this.sidebar.classList.contains('active')) {
                e.stopPropagation();
            }
        }, { passive: false });
    }

    toggleSidebar() {
        if (this.sidebar && this.sidebarOverlay) {
            const isActive = this.sidebar.classList.contains('active');
            
            if (isActive) {
                this.closeSidebar();
            } else {
                this.openSidebar();
            }
        }
    }

    openSidebar() {
        if (this.sidebar && this.sidebarOverlay) {
            this.sidebar.classList.add('active');
            this.sidebarOverlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scroll
            
            // Update menu toggle icon
            if (this.menuToggle) {
                this.menuToggle.innerHTML = '<i class="fas fa-times"></i>';
            }
        }
    }

    closeSidebar() {
        if (this.sidebar && this.sidebarOverlay) {
            this.sidebar.classList.remove('active');
            this.sidebarOverlay.classList.remove('active');
            document.body.style.overflow = ''; // Restore scroll
            
            // Update menu toggle icon
            if (this.menuToggle) {
                this.menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        }
    }

    handleResize() {
        // Close sidebar when resizing to desktop
        if (window.innerWidth > 768) {
            this.closeSidebar();
            if (this.menuToggle) {
                this.menuToggle.style.display = 'none';
            }
        } else {
            if (this.menuToggle) {
                this.menuToggle.style.display = 'flex';
            }
        }
    }
}

/* ============================================================================ */
/* MOBILE TABLE UTILITIES */
/* ============================================================================ */

class MobileTableManager {
    constructor() {
        this.init();
    }

    init() {
        console.log('Initializing Mobile Table Manager...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Add touch-friendly scrolling to tables
        this.setupTableScrolling();
        
        // Optimize table rendering on mobile
        this.optimizeTableDisplay();
        
        console.log('Mobile Table Manager initialized successfully');
    }

    setupTableScrolling() {
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            // Wrap table in scrollable container if not already wrapped
            if (!table.parentElement.classList.contains('table-responsive')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-responsive';
                wrapper.style.overflowX = 'auto';
                wrapper.style.webkitOverflowScrolling = 'touch';
                
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        });
    }

    optimizeTableDisplay() {
        // Add mobile-optimized classes based on screen size
        const updateTableClasses = () => {
            const tables = document.querySelectorAll('table');
            tables.forEach(table => {
                if (window.innerWidth <= 768) {
                    table.classList.add('mobile-view');
                } else {
                    table.classList.remove('mobile-view');
                }
            });
        };

        updateTableClasses();
        window.addEventListener('resize', updateTableClasses);
    }
}

/* ============================================================================ */
/* MOBILE MODAL UTILITIES */
/* ============================================================================ */

class MobileModalManager {
    constructor() {
        this.init();
    }

    init() {
        console.log('Initializing Mobile Modal Manager...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Optimize modals for mobile
        this.optimizeModals();
        
        // Handle modal scroll behavior
        this.setupModalScrolling();
        
        console.log('Mobile Modal Manager initialized successfully');
    }

    optimizeModals() {
        // Add mobile-friendly classes to modals
        const modals = document.querySelectorAll('.modal, .modal-content');
        modals.forEach(modal => {
            // Ensure modals are scrollable on mobile
            if (window.innerWidth <= 768) {
                modal.style.maxHeight = '90vh';
                modal.style.overflowY = 'auto';
            }
        });

        // Update on resize
        window.addEventListener('resize', () => {
            modals.forEach(modal => {
                if (window.innerWidth <= 768) {
                    modal.style.maxHeight = '90vh';
                    modal.style.overflowY = 'auto';
                } else {
                    modal.style.maxHeight = '';
                    modal.style.overflowY = '';
                }
            });
        });
    }

    setupModalScrolling() {
        // Prevent body scroll when modal is open on mobile
        const modalObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList.contains('show') || target.style.display === 'block') {
                        if (window.innerWidth <= 768) {
                            document.body.style.overflow = 'hidden';
                        }
                    } else {
                        document.body.style.overflow = '';
                    }
                }
            });
        });

        // Observe all modals
        const modals = document.querySelectorAll('.modal, .modal-overlay');
        modals.forEach(modal => {
            modalObserver.observe(modal, { attributes: true });
        });
    }
}

/* ============================================================================ */
/* MOBILE CHART UTILITIES */
/* ============================================================================ */

class MobileChartManager {
    constructor() {
        this.init();
    }

    init() {
        console.log('Initializing Mobile Chart Manager...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Make charts responsive
        this.makeChartsResponsive();
        
        console.log('Mobile Chart Manager initialized successfully');
    }

    makeChartsResponsive() {
        // Ensure Chart.js charts are responsive
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            const parent = canvas.parentElement;
            if (parent) {
                parent.style.position = 'relative';
                parent.style.height = window.innerWidth <= 768 ? '300px' : '400px';
            }
        });

        // Update on resize
        window.addEventListener('resize', () => {
            canvases.forEach(canvas => {
                const parent = canvas.parentElement;
                if (parent) {
                    parent.style.height = window.innerWidth <= 768 ? '300px' : '400px';
                }
            });
        });
    }
}

/* ============================================================================ */
/* MOBILE TOUCH GESTURES */
/* ============================================================================ */

class MobileTouchManager {
    constructor() {
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.init();
    }

    init() {
        console.log('Initializing Mobile Touch Manager...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Setup swipe gestures for sidebar
        this.setupSwipeGestures();
        
        console.log('Mobile Touch Manager initialized successfully');
    }

    setupSwipeGestures() {
        if (window.innerWidth <= 768) {
            document.addEventListener('touchstart', (e) => {
                this.touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            document.addEventListener('touchend', (e) => {
                this.touchEndX = e.changedTouches[0].screenX;
                this.handleSwipe();
            }, { passive: true });
        }
    }

    handleSwipe() {
        const swipeThreshold = 100;
        const swipeDistance = this.touchEndX - this.touchStartX;

        // Swipe right to open sidebar (from left edge)
        if (swipeDistance > swipeThreshold && this.touchStartX < 50) {
            if (window.mobileNav) {
                window.mobileNav.openSidebar();
            }
        }

        // Swipe left to close sidebar
        if (swipeDistance < -swipeThreshold) {
            if (window.mobileNav) {
                window.mobileNav.closeSidebar();
            }
        }
    }
}

/* ============================================================================ */
/* INITIALIZE ALL MOBILE MANAGERS */
/* ============================================================================ */

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileManagers);
} else {
    initializeMobileManagers();
}

function initializeMobileManagers() {
    console.log('🚀 Initializing ChurchEase Mobile Responsive System...');
    
    // Create global instances
    window.mobileNav = new MobileNavigationManager();
    window.mobileTable = new MobileTableManager();
    window.mobileModal = new MobileModalManager();
    window.mobileChart = new MobileChartManager();
    window.mobileTouch = new MobileTouchManager();
    
    console.log('✅ ChurchEase Mobile Responsive System initialized successfully!');
}

/* ============================================================================ */
/* UTILITY FUNCTIONS */
/* ============================================================================ */

// Check if device is mobile
function isMobileDevice() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if device is touch-enabled
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Get device orientation
function getOrientation() {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

// Export utilities
window.ChurchEaseMobile = {
    isMobileDevice,
    isTouchDevice,
    getOrientation
};

console.log('📱 ChurchEase Mobile Utilities loaded');
