// Wealth Command Pro - Modals UI Manager
class ModalManager {
    constructor() {
        this.modals = new Map();
        this.currentModal = null;
        this.modalStack = [];
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        this.setupGlobalEventListeners();
        this.createBaseModals();
        this.initialized = true;
    }

    setupGlobalEventListeners() {
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.hideCurrentModal();
            }
        });

        // Click outside to close modal
        document.addEventListener('click', (e) => {
            if (this.currentModal && e.target === this.currentModal.element) {
                this.hideCurrentModal();
            }
        });
    }

    createBaseModals() {
        // Create confirmation modal
        this.createConfirmationModal();
        
        // Create loading modal
        this.createLoadingModal();
        
        // Create error modal
        this.createErrorModal();
        
        // Create success modal
        this.createSuccessModal();
    }

    // Base Modal Creation
    createModal(id, options = {}) {
        const existing = document.getElementById(id);
        if (existing) {
            existing.remove();
        }

        const {
            title = '',
            content = '',
            size = 'modal-md',
            centered = true,
            scrollable = false,
            backdrop = true,
            keyboard = true
        } = options;

        const modalHTML = `
            <div class="modal fade" id="${id}" tabindex="-1" 
                 data-bs-backdrop="${backdrop}" 
                 data-bs-keyboard="${keyboard}">
                <div class="modal-dialog ${size} ${centered ? 'modal-dialog-centered' : ''} ${scrollable ? 'modal-dialog-scrollable' : ''}">
                    <div class="modal-content">
                        ${title ? `
                            <div class="modal-header">
                                <h5 class="modal-title">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                        ` : ''}
                        <div class="modal-body">
                            ${content}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modalElement = document.getElementById(id);
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: backdrop,
            keyboard: keyboard
        });

        this.modals.set(id, {
            element: modalElement,
            instance: modal,
            options
        });

        // Add event listeners
        modalElement.addEventListener('show.bs.modal', () => {
            this.currentModal = { id, element: modalElement, instance: modal };
            this.modalStack.push(this.currentModal);
        });

        modalElement.addEventListener('hidden.bs.modal', () => {
            this.modalStack.pop();
            this.currentModal = this.modalStack[this.modalStack.length - 1] || null;
        });

        return modal;
    }

    // Specialized Modals
    createConfirmationModal() {
        const modal = this.createModal('confirmationModal', {
            title: 'Confirm Action',
            size: 'modal-sm',
            centered: true
        });

        // Set default content
        const modalElement = document.getElementById('confirmationModal');
        modalElement.querySelector('.modal-body').innerHTML = `
            <div class="text-center">
                <div class="confirmation-icon mb-3">
                    <i class="bi bi-question-circle-fill text-warning fs-1"></i>
                </div>
                <h6 id="confirmationTitle">Are you sure?</h6>
                <p id="confirmationMessage" class="text-muted">This action cannot be undone.</p>
            </div>
            <div class="d-flex gap-2 justify-content-center">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirmActionBtn">Confirm</button>
            </div>
        `;

        return modal;
    }

    createLoadingModal() {
        const modal = this.createModal('loadingModal', {
            size: 'modal-sm',
            centered: true,
            backdrop: 'static',
            keyboard: false
        });

        const modalElement = document.getElementById('loadingModal');
        modalElement.querySelector('.modal-body').innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <h6 id="loadingTitle">Loading</h6>
                <p id="loadingMessage" class="text-muted">Please wait...</p>
            </div>
        `;

        return modal;
    }

    createErrorModal() {
        const modal = this.createModal('errorModal', {
            title: 'Error',
            size: 'modal-md',
            centered: true
        });

        const modalElement = document.getElementById('errorModal');
        modalElement.querySelector('.modal-body').innerHTML = `
            <div class="text-center">
                <div class="error-icon mb-3">
                    <i class="bi bi-exclamation-triangle-fill text-danger fs-1"></i>
                </div>
                <h6 id="errorTitle">An Error Occurred</h6>
                <p id="errorMessage" class="text-muted"></p>
                <pre id="errorDetails" class="text-start small text-muted mt-3" style="display: none;"></pre>
            </div>
            <div class="d-flex gap-2 justify-content-center mt-3">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-outline-secondary" id="showErrorDetailsBtn">
                    Show Details
                </button>
            </div>
        `;

        // Add toggle for error details
        modalElement.querySelector('#showErrorDetailsBtn').addEventListener('click', () => {
            const details = modalElement.querySelector('#errorDetails');
            details.style.display = details.style.display === 'none' ? 'block' : 'none';
        });

        return modal;
    }

    createSuccessModal() {
        const modal = this.createModal('successModal', {
            size: 'modal-sm',
            centered: true
        });

        const modalElement = document.getElementById('successModal');
        modalElement.querySelector('.modal-body').innerHTML = `
            <div class="text-center">
                <div class="success-icon mb-3">
                    <i class="bi bi-check-circle-fill text-success fs-1"></i>
                </div>
                <h6 id="successTitle">Success!</h6>
                <p id="successMessage" class="text-muted">Operation completed successfully.</p>
            </div>
            <div class="d-flex gap-2 justify-content-center">
                <button type="button" class="btn btn-success" data-bs-dismiss="modal">Continue</button>
            </div>
        `;

        return modal;
    }

    // Public API Methods
    showConfirmation(options) {
        return new Promise((resolve) => {
            const modal = this.modals.get('confirmationModal');
            if (!modal) {
                resolve(false);
                return;
            }

            // Update content
            document.getElementById('confirmationTitle').textContent = options.title || 'Are you sure?';
            document.getElementById('confirmationMessage').textContent = options.message || 'This action cannot be undone.';
            
            const confirmBtn = document.getElementById('confirmActionBtn');
            confirmBtn.textContent = options.confirmText || 'Confirm';
            confirmBtn.className = `btn ${options.confirmType ? `btn-${options.confirmType}` : 'btn-danger'}`;

            // Set up event handlers
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                confirmBtn.removeEventListener('click', handleConfirm);
                modal.element.removeEventListener('hidden.bs.modal', handleCancel);
            };

            confirmBtn.addEventListener('click', handleConfirm);
            modal.element.addEventListener('hidden.bs.modal', handleCancel);

            modal.instance.show();
        });
    }

    showLoading(options = {}) {
        const modal = this.modals.get('loadingModal');
        if (!modal) return;

        document.getElementById('loadingTitle').textContent = options.title || 'Loading';
        document.getElementById('loadingMessage').textContent = options.message || 'Please wait...';

        modal.instance.show();
    }

    hideLoading() {
        const modal = this.modals.get('loadingModal');
        if (modal) {
            modal.instance.hide();
        }
    }

    showError(options) {
        const modal = this.modals.get('errorModal');
        if (!modal) return;

        document.getElementById('errorTitle').textContent = options.title || 'An Error Occurred';
        document.getElementById('errorMessage').textContent = options.message || 'Something went wrong. Please try again.';
        
        const detailsElement = document.getElementById('errorDetails');
        if (options.details) {
            detailsElement.textContent = options.details;
            detailsElement.style.display = 'none';
        } else {
            detailsElement.style.display = 'none';
        }

        modal.instance.show();
    }

    showSuccess(options = {}) {
        const modal = this.modals.get('successModal');
        if (!modal) return;

        document.getElementById('successTitle').textContent = options.title || 'Success!';
        document.getElementById('successMessage').textContent = options.message || 'Operation completed successfully.';

        modal.instance.show();

        // Auto-hide after delay if specified
        if (options.autoHide) {
            setTimeout(() => {
                this.hideSuccess();
            }, options.autoHide);
        }
    }

    hideSuccess() {
        const modal = this.modals.get('successModal');
        if (modal) {
            modal.instance.hide();
        }
    }

    // Custom Modal Management
    showCustomModal(id, content, options = {}) {
        let modal = this.modals.get(id);
        
        if (!modal) {
            modal = this.createModal(id, options);
        }

        // Update content if provided
        if (content) {
            const modalBody = modal.element.querySelector('.modal-body');
            if (modalBody) {
                modalBody.innerHTML = content;
            }
        }

        modal.instance.show();
        return modal;
    }

    hideCustomModal(id) {
        const modal = this.modals.get(id);
        if (modal) {
            modal.instance.hide();
        }
    }

    hideCurrentModal() {
        if (this.currentModal) {
            this.currentModal.instance.hide();
        }
    }

    // Form Modal Helpers
    showFormModal(formId, options = {}) {
        const form = document.getElementById(formId);
        if (!form) {
            console.error(`Form with id ${formId} not found`);
            return;
        }

        const modalId = `formModal_${formId}`;
        const title = options.title || 'Form';
        const size = options.size || 'modal-lg';

        const modalContent = `
            <form id="${formId}_modal">
                ${form.innerHTML}
            </form>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-primary" form="${formId}_modal">Save</button>
            </div>
        `;

        const modal = this.showCustomModal(modalId, modalContent, {
            title,
            size,
            centered: true
        });

        // Handle form submission
        const modalForm = document.getElementById(`${formId}_modal`);
        if (modalForm) {
            modalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (options.onSubmit) {
                    options.onSubmit(new FormData(modalForm));
                }
                this.hideCustomModal(modalId);
            });
        }

        return modal;
    }

    // Quick Action Modals
    showQuickAddTransaction(type) {
        const modalId = 'quickAddTransactionModal';
        const title = type === 'income' ? 'Quick Add Income' : 'Quick Add Expense';
        
        const formHTML = `
            <div class="row g-3">
                <div class="col-12">
                    <label class="form-label">Description</label>
                    <input type="text" class="form-control" name="description" required>
                </div>
                <div class="col-6">
                    <label class="form-label">Amount</label>
                    <input type="number" class="form-control" name="amount" step="0.01" required>
                </div>
                <div class="col-6">
                    <label class="form-label">Category</label>
                    <select class="form-select" name="category" required>
                        <option value="">Select category</option>
                        <!-- Categories will be populated dynamically -->
                    </select>
                </div>
                <div class="col-12">
                    <label class="form-label">Date</label>
                    <input type="date" class="form-control" name="date" required>
                </div>
            </div>
        `;

        const modal = this.showCustomModal(modalId, formHTML, {
            title,
            size: 'modal-sm'
        });

        // Set current date
        const today = new Date().toISOString().split('T')[0];
        modal.element.querySelector('input[name="date"]').value = today;

        // Populate categories
        this.populateCategorySelect(modal.element.querySelector('select[name="category"]'), type);

        // Add footer with actions
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        footer.innerHTML = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="saveQuickTransaction">Save</button>
        `;

        modal.element.querySelector('.modal-content').appendChild(footer);

        // Handle save
        modal.element.querySelector('#saveQuickTransaction').addEventListener('click', () => {
            this.handleQuickTransactionSave(modal.element, type);
        });

        return modal;
    }

    populateCategorySelect(selectElement, type) {
        if (!window.stateManager) return;

        const categories = window.stateManager.state.categories.filter(cat => cat.type === type);
        selectElement.innerHTML = '<option value="">Select category</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            selectElement.appendChild(option);
        });
    }

    async handleQuickTransactionSave(modalElement, type) {
        const form = modalElement.querySelector('form');
        const formData = new FormData(form);
        
        const transaction = {
            date: formData.get('date'),
            desc: formData.get('description'),
            type: type,
            category: formData.get('category'),
            amount: parseFloat(formData.get('amount'))
        };

        try {
            if (window.stateManager) {
                window.stateManager.addTransaction(transaction);
                this.hideCustomModal('quickAddTransactionModal');
                this.showSuccess({
                    title: 'Transaction Added',
                    message: `${type.charAt(0).toUpperCase() + type.slice(1)} added successfully`,
                    autoHide: 2000
                });
            }
        } catch (error) {
            this.showError({
                title: 'Error',
                message: 'Failed to add transaction',
                details: error.message
            });
        }
    }

    // Utility Methods
    getModal(id) {
        return this.modals.get(id);
    }

    destroyModal(id) {
        const modal = this.modals.get(id);
        if (modal) {
            modal.instance.dispose();
            modal.element.remove();
            this.modals.delete(id);
        }
    }

    destroyAllModals() {
        this.modals.forEach((modal, id) => {
            this.destroyModal(id);
        });
    }

    // Animation Helpers
    animateModalShow(modalElement) {
        if (window.animationManager) {
            window.animationManager.animate({
                element: modalElement.querySelector('.modal-content'),
                duration: 300,
                easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                properties: {
                    opacity: [0, 1],
                    transform: ['scale(0.8)', 'scale(1)']
                }
            });
        }
    }

    animateModalHide(modalElement) {
        if (window.animationManager) {
            return window.animationManager.animate({
                element: modalElement.querySelector('.modal-content'),
                duration: 200,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                properties: {
                    opacity: [1, 0],
                    transform: ['scale(1)', 'scale(0.8)']
                }
            });
        }
        return Promise.resolve();
    }
}

// Create global modal manager instance
window.modalManager = new ModalManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.modalManager.init();
});

// Global helper functions for common modal operations
window.showConfirmationModal = (title, message, onConfirm, confirmText = 'Confirm', confirmType = 'danger') => {
    return window.modalManager.showConfirmation({
        title,
        message,
        confirmText,
        confirmType,
        onConfirm
    });
};

window.showLoadingModal = (title, message) => {
    window.modalManager.showLoading({ title, message });
};

window.hideLoadingModal = () => {
    window.modalManager.hideLoading();
};

window.showErrorModal = (title, message, details) => {
    window.modalManager.showError({ title, message, details });
};

window.showSuccessModal = (title, message, autoHide) => {
    window.modalManager.showSuccess({ title, message, autoHide });
};
