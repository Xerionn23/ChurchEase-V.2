// Payment Calculator Module for ChurchEase Reservation System
class PaymentCalculator {
    constructor() {
        this.servicePrices = {
            'wedding': 15000.00,
            'baptism': 2000.00,   // Stipendium for baptism
            'funeral': 8000.00,
            'confirmation': 0.00  // No stipendium for confirmation
        };
        
        this.initializeEventListeners();
        this.loadServicePrices();
    }

    async loadServicePrices() {
        try {
            const response = await fetch('/api/service-pricing');
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    result.data.forEach(service => {
                        this.servicePrices[service.service_type] = parseFloat(service.base_price);
                    });
                }
            }
        } catch (error) {
            console.log('Using default service prices:', error);
        }
    }

    // Check if service requires stipendium - Wedding, Funeral, and Baptism
    requiresStipendium(serviceType) {
        return serviceType === 'wedding' || serviceType === 'funeral' || serviceType === 'baptism';
    }

    initializeEventListeners() {
        // Service selection change
        document.addEventListener('change', (e) => {
            if (e.target.closest('.service-option')) {
                this.updateBasePrice();
                this.togglePaymentSection();
            }
        });

        // Service option clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.service-option')) {
                // Handle service selection
                const serviceOption = e.target.closest('.service-option');
                const serviceType = serviceOption.dataset.service;
                
                // Remove active class from all service options
                document.querySelectorAll('.service-option').forEach(option => {
                    option.classList.remove('selected');
                });
                
                // Add active class to clicked option
                serviceOption.classList.add('selected');
                
                // Update hidden input
                const selectedServiceInput = document.getElementById('selectedService');
                if (selectedServiceInput) {
                    selectedServiceInput.value = serviceType;
                }
                
                // Update base price and toggle payment section
                setTimeout(() => {
                    this.updateBasePrice();
                    this.togglePaymentSection();
                }, 100);
            }
        });

        // Payment method change
        const paymentMethod = document.getElementById('paymentMethod');
        if (paymentMethod) {
            paymentMethod.addEventListener('change', () => this.handlePaymentMethodChange());
        }

        // Payment type change
        const paymentType = document.getElementById('paymentType');
        if (paymentType) {
            paymentType.addEventListener('change', () => {
                this.calculatePayment();
                this.updateMinimumHint();
            });
        }

        // Discount type change
        const discountType = document.getElementById('discountType');
        if (discountType) {
            discountType.addEventListener('change', () => this.handleDiscountTypeChange());
        }

        // Discount value change
        const discountValue = document.getElementById('discountValue');
        if (discountValue) {
            discountValue.addEventListener('input', () => this.calculatePayment());
        }

        // Amount paid change
        const amountPaid = document.getElementById('amountPaid');
        if (amountPaid) {
            amountPaid.addEventListener('input', () => this.calculateBalance());
        }
    }

    togglePaymentSection() {
        const selectedService = document.getElementById('selectedService')?.value || 
                              document.querySelector('.service-option.selected')?.dataset.service;
        
        console.log('🔄 togglePaymentSection called - Selected service:', selectedService);
        
        const paymentSection = document.getElementById('paymentSection');
        
        if (paymentSection) {
            console.log('✓ Payment section found');
            if (this.requiresStipendium(selectedService)) {
                console.log('✓ Service requires stipendium - showing payment section');
                paymentSection.style.display = 'block';
                // Make payment fields required
                const requiredFields = paymentSection.querySelectorAll('select[required], input[required]');
                requiredFields.forEach(field => field.required = true);
                console.log('✓ Payment section is now visible');
            } else {
                console.log('ℹ Service does not require stipendium - hiding payment section');
                paymentSection.style.display = 'none';
                // Remove required attribute from payment fields
                const requiredFields = paymentSection.querySelectorAll('select[required], input[required]');
                requiredFields.forEach(field => field.required = false);
            }
        } else {
            console.log('✗ Payment section NOT found in DOM');
        }
    }

    updateBasePrice() {
        const selectedService = document.getElementById('selectedService')?.value || 
                              document.querySelector('.service-option.selected')?.dataset.service;
        
        if (selectedService && this.servicePrices[selectedService]) {
            const basePrice = this.servicePrices[selectedService];
            const basePriceField = document.getElementById('basePrice');
            
            if (basePriceField) {
                basePriceField.value = `₱${basePrice.toLocaleString('en-PH', {minimumFractionDigits: 2})}`;
                // Only calculate payment if form elements exist
                setTimeout(() => {
                    this.calculatePayment();
                }, 100);
            }
        }
    }

    handlePaymentMethodChange() {
        const paymentMethod = document.getElementById('paymentMethod').value;
        const gcashReferenceGroup = document.getElementById('gcashReferenceGroup');
        const gcashReference = document.getElementById('gcashReference');

        if (paymentMethod === 'GCash') {
            gcashReferenceGroup.style.display = 'block';
            gcashReference.required = true;
        } else {
            gcashReferenceGroup.style.display = 'none';
            gcashReference.required = false;
            gcashReference.value = '';
        }
    }

    handleDiscountTypeChange() {
        const discountType = document.getElementById('discountType').value;
        const discountValueGroup = document.getElementById('discountValueGroup');
        const discountValueLabel = document.getElementById('discountValueLabel');
        const discountValue = document.getElementById('discountValue');

        if (discountType === 'none') {
            discountValueGroup.style.display = 'none';
            discountValue.value = '';
        } else {
            discountValueGroup.style.display = 'flex';
            
            if (discountType === 'percentage') {
                discountValueLabel.textContent = 'Discount Percentage (%)';
                discountValue.placeholder = 'Enter percentage (e.g., 10)';
                discountValue.max = '100';
            } else if (discountType === 'fixed') {
                discountValueLabel.textContent = 'Discount Amount (₱)';
                discountValue.placeholder = 'Enter amount (e.g., 500)';
                discountValue.removeAttribute('max');
            }
        }
        
        this.calculatePayment();
    }

    calculatePayment() {
        const selectedService = document.getElementById('selectedService')?.value || 
                              document.querySelector('.service-option.selected')?.dataset.service;
        
        if (!selectedService || !this.servicePrices[selectedService]) return;

        const basePrice = this.servicePrices[selectedService];
        
        // Update base price field if it's empty
        const basePriceField = document.getElementById('basePrice');
        if (basePriceField && !basePriceField.value) {
            basePriceField.value = `₱${basePrice.toLocaleString('en-PH', {minimumFractionDigits: 2})}`;
        }
        const discountType = document.getElementById('discountType')?.value || 'none';
        const discountValue = parseFloat(document.getElementById('discountValue')?.value || 0);
        
        let discountAmount = 0;
        
        if (discountType === 'percentage' && discountValue > 0) {
            discountAmount = (basePrice * discountValue) / 100;
        } else if (discountType === 'fixed' && discountValue > 0) {
            discountAmount = Math.min(discountValue, basePrice); // Can't discount more than base price
        }

        const amountDue = basePrice - discountAmount;

        // Update UI fields
        const discountAmountField = document.getElementById('discountAmount');
        const amountDueField = document.getElementById('amountDue');

        if (discountAmountField) {
            discountAmountField.value = `₱${discountAmount.toLocaleString('en-PH', {minimumFractionDigits: 2})}`;
        }

        if (amountDueField) {
            amountDueField.value = `₱${amountDue.toLocaleString('en-PH', {minimumFractionDigits: 2})}`;
        }

        // Only calculate balance if payment form elements exist
        if (document.getElementById('balanceGroup') && document.getElementById('paymentStatusIndicator')) {
            this.calculateBalance();
        }
    }

    calculateBalance() {
        const amountDueText = document.getElementById('amountDue')?.value || '₱0';
        const amountDue = parseFloat(amountDueText.replace(/[₱,]/g, ''));
        const amountPaid = parseFloat(document.getElementById('amountPaid')?.value || 0);
        const paymentType = document.getElementById('paymentType')?.value;

        const balanceGroup = document.getElementById('balanceGroup');
        const remainingBalanceField = document.getElementById('remainingBalance');
        const paymentStatusIndicator = document.getElementById('paymentStatusIndicator');
        const amountPaidInput = document.getElementById('amountPaid');

        // Early return if required elements don't exist
        if (!balanceGroup || !paymentStatusIndicator) {
            console.log('Payment balance elements not found - form may not be loaded yet');
            return;
        }

        // Minimum partial payment requirement (50% of total amount)
        const minimumPartialPayment = amountDue * 0.5;

        let balance = 0;
        let paymentStatus = 'Pending';
        let statusClass = 'status-pending';
        let validationError = '';

        if (amountPaid > 0) {
            if (paymentType === 'Full') {
                if (amountPaid >= amountDue) {
                    paymentStatus = 'Paid';
                    statusClass = 'status-paid';
                    balance = 0;
                } else {
                    paymentStatus = 'Partial';
                    statusClass = 'status-partial';
                    balance = amountDue - amountPaid;
                }
            } else if (paymentType === 'Downpayment') {
                // Validate minimum partial payment (50%)
                if (amountPaid < minimumPartialPayment) {
                    validationError = `Minimum partial payment is ₱${minimumPartialPayment.toLocaleString('en-PH', {minimumFractionDigits: 2})} (50% of total amount)`;
                    statusClass = 'status-error';
                    paymentStatus = 'Invalid Amount';
                    
                    // Set custom validity on input
                    if (amountPaidInput) {
                        amountPaidInput.setCustomValidity(validationError);
                    }
                } else {
                    paymentStatus = 'Partial';
                    statusClass = 'status-partial';
                    balance = amountDue - amountPaid;
                    
                    // Clear custom validity
                    if (amountPaidInput) {
                        amountPaidInput.setCustomValidity('');
                    }
                }
            }
        } else {
            // Clear custom validity when no amount
            if (amountPaidInput) {
                amountPaidInput.setCustomValidity('');
            }
        }

        // Show/hide balance field
        if (paymentType === 'Downpayment' || (paymentType === 'Full' && amountPaid < amountDue)) {
            balanceGroup.style.display = 'block';
            if (remainingBalanceField) {
                remainingBalanceField.value = `₱${balance.toLocaleString('en-PH', {minimumFractionDigits: 2})}`;
            }
        } else {
            balanceGroup.style.display = 'none';
        }

        // Update stipendium status indicator
        const statusText = paymentStatus === 'Pending' ? 'Stipendium Pending' : 
                          paymentStatus === 'Paid' ? 'Stipendium Paid' : 
                          paymentStatus === 'Partial' ? 'Stipendium Partial' : paymentStatus;
        
        if (validationError) {
            paymentStatusIndicator.innerHTML = `
                <span class="status-badge ${statusClass}">${statusText}</span>
                <div style="color: #dc2626; font-size: 13px; margin-top: 8px; font-weight: 500;">
                    <i class="fas fa-exclamation-circle"></i> ${validationError}
                </div>
            `;
        } else {
            paymentStatusIndicator.innerHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;
        }
    }

    updateMinimumHint() {
        const paymentType = document.getElementById('paymentType')?.value;
        const amountDueText = document.getElementById('amountDue')?.value || '₱0';
        const amountDue = parseFloat(amountDueText.replace(/[₱,]/g, ''));
        const amountPaidInput = document.getElementById('amountPaid');
        
        if (!amountPaidInput) return;
        
        // Remove existing hint if any
        const existingHint = amountPaidInput.parentElement.querySelector('.minimum-hint');
        if (existingHint) {
            existingHint.remove();
        }
        
        // Show hint only for Partial/Downpayment
        if (paymentType === 'Downpayment' && amountDue > 0) {
            const minimumPartialPayment = amountDue * 0.5;
            const hint = document.createElement('small');
            hint.className = 'minimum-hint';
            hint.style.cssText = 'color: #6b7280; font-size: 12px; margin-top: 4px; display: block;';
            hint.innerHTML = `<i class="fas fa-info-circle"></i> Minimum: ₱${minimumPartialPayment.toLocaleString('en-PH', {minimumFractionDigits: 2})} (50% of total)`;
            amountPaidInput.parentElement.appendChild(hint);
        }
    }

    validateGCashReference(reference) {
        // Basic GCash reference validation
        if (!reference || reference.length < 8) {
            return { valid: false, message: 'GCash reference must be at least 8 characters long' };
        }

        // Check for alphanumeric characters
        const alphanumericRegex = /^[A-Za-z0-9]+$/;
        if (!alphanumericRegex.test(reference)) {
            return { valid: false, message: 'GCash reference should contain only letters and numbers' };
        }

        return { valid: true, message: 'Valid GCash reference' };
    }

    getPaymentData() {
        const selectedService = document.getElementById('selectedService')?.value || 
                              document.querySelector('.service-option.selected')?.dataset.service;
        
        const paymentMethod = document.getElementById('paymentMethod')?.value;
        const paymentType = document.getElementById('paymentType')?.value;
        const gcashReference = document.getElementById('gcashReference')?.value;
        
        const basePrice = this.servicePrices[selectedService] || 0;
        const discountType = document.getElementById('discountType')?.value || 'none';
        const discountValue = parseFloat(document.getElementById('discountValue')?.value || 0);
        const amountPaid = parseFloat(document.getElementById('amountPaid')?.value || 0);

        let discountAmount = 0;
        if (discountType === 'percentage' && discountValue > 0) {
            discountAmount = (basePrice * discountValue) / 100;
        } else if (discountType === 'fixed' && discountValue > 0) {
            discountAmount = Math.min(discountValue, basePrice);
        }

        const amountDue = basePrice - discountAmount;
        const balance = Math.max(0, amountDue - amountPaid);

        let paymentStatus = 'Pending';
        if (amountPaid > 0) {
            if (amountPaid >= amountDue) {
                paymentStatus = 'Paid';
            } else {
                paymentStatus = 'Partial';
            }
        }

        return {
            service_type: selectedService,
            payment_method: paymentMethod,
            payment_type: paymentType,
            base_price: basePrice,
            discount_type: discountType,
            discount_value: discountValue,
            discount_amount: discountAmount,
            amount_due: amountDue,
            amount_paid: amountPaid,
            balance: balance,
            payment_status: paymentStatus,
            gcash_reference: gcashReference || null
        };
    }

    validatePaymentForm() {
        const errors = [];
        
        const paymentMethod = document.getElementById('paymentMethod')?.value;
        const paymentType = document.getElementById('paymentType')?.value;
        const amountPaid = parseFloat(document.getElementById('amountPaid')?.value || 0);
        const gcashReference = document.getElementById('gcashReference')?.value;

        if (!paymentMethod) {
            errors.push('Payment method is required');
        }

        if (!paymentType) {
            errors.push('Payment type is required');
        }

        if (amountPaid <= 0) {
            errors.push('Amount paid must be greater than 0');
        }

        if (paymentMethod === 'GCash') {
            const gcashValidation = this.validateGCashReference(gcashReference);
            if (!gcashValidation.valid) {
                errors.push(gcashValidation.message);
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}

// Initialize payment calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    try {
        window.paymentCalculator = new PaymentCalculator();
        console.log('✓ Payment Calculator initialized successfully');
        
        // Test if payment section exists
        const paymentSection = document.getElementById('paymentSection');
        if (paymentSection) {
            console.log('✓ Payment section found in DOM');
        } else {
            console.log('✗ Payment section NOT found in DOM');
        }
        
        // Test service selection
        const selectedService = document.getElementById('selectedService');
        if (selectedService) {
            console.log('✓ Selected service input found');
        } else {
            console.log('✗ Selected service input NOT found');
        }
        
        // Test button removed - stipendium system is working!
        
    } catch (error) {
        console.error('✗ Payment Calculator initialization failed:', error);
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentCalculator;
}
