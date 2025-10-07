// =============================================================
// Wealth Command Pro — Modals UI Manager (Fixed Version)
// =============================================================

class ModalManager {
    constructor() {
        this.modals = new Map();
        this.currentModal = null;
        this.modalStack = [];
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.setupGlobalEventListeners();
        this.createBaseModals();
        this.initialized = true;
    }

    // =============================================================
    // Transaction Form Modals
    // =============================================================

    showAddTransactionModal(type = 'expense') {
        const title = type === 'income' ? 'Add Income' : 'Add Expense';
        this.showTransactionFormModal({ type }, title);
    }

    showEditTransactionModal(transaction, index) {
        this.showTransactionFormModal({ ...transaction, index }, 'Edit Transaction');
    }

    showTransactionFormModal(data = {}, title) {
        const isEditing = data.index !== undefined;
        const modalId = 'transactionFormModal';
        const formHTML = `
            <form id="transaction-form">
                <div class="mb-3">
                    <label for="transaction-desc" class="form-label">Description</label>
                    <input type="text" id="transaction-desc" class="form-control" 
                           value="${data.desc || ''}" required>
                </div>
                <div class="row">
                    <div class="col-6 mb-3">
                        <label for="transaction-amount" class="form-label">Amount</label>
                        <input type="number" id="transaction-amount" class="form-control" 
                               value="${data.amount || ''}" step="0.01" required>
                    </div>
                    <div class="col-6 mb-3">
                        <label for="transaction-date" class="form-label">Date</label>
                        <input type="date" id="transaction-date" class="form-control" 
                               value="${data.date || new Date().toISOString().split('T')[0]}" required>
                    </div>
                </div>
                <div class="row">
                    <div class="col-6 mb-3">
                        <label for="transaction-type" class="form-label">Type</label>
                        <select id="transaction-type" class="form-select">
                            <option value="income" ${data.type === 'income' ? 'selected' : ''}>Income</option>
                            <option value="expense" ${data.type !== 'income' ? 'selected' : ''}>Expense</option>
                        </select>
                    </div>
                    <div class="col-6 mb-3">
                        <label for="transaction-category" class="form-label">Category</label>
                        <select id="transaction-category" class="form-select" required></select>
                    </div>
                </div>
            </form>
        `;

        this.showCustomModal(modalId, formHTML, { title });
        const modalElement = this.getModal(modalId).element;

        const typeSelect = modalElement.querySelector('#transaction-type');
        const categorySelect = modalElement.querySelector('#transaction-category');

        const populateCategories = () => {
            const selectedType = typeSelect.value;
            const categories = window.stateManager.state.categories.filter(c => c.type === selectedType);
            categorySelect.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            if (data.category) categorySelect.value = data.category;
        };

        typeSelect.addEventListener('change', populateCategories);
        populateCategories();

        const footer = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="save-transaction-btn">
                ${isEditing ? 'Update' : 'Save'}
            </button>
        `;
        modalElement.querySelector('.modal-body')
            .insertAdjacentHTML('afterend', `<div class="modal-footer">${footer}</div>`);

        modalElement.querySelector('#save-transaction-btn').addEventListener('click', () => {
            const transactionData = {
                desc: modalElement.querySelector('#transaction-desc').value,
                amount: parseFloat(modalElement.querySelector('#transaction-amount').value),
                date: modalElement.querySelector('#transaction-date').value,
                type: modalElement.querySelector('#transaction-type').value,
                category: modalElement.querySelector('#transaction-category').value,
            };

            if (!transactionData.desc || !transactionData.amount || !transactionData.category) {
                window.showToast('Please fill all required fields.', 'error');
                return;
            }

            if (isEditing) {
                window.stateManager.updateTransaction(data.id, transactionData);
            } else {
                window.stateManager.addTransaction(transactionData);
            }

            this.hideCustomModal(modalId);
        });
    }

    // =============================================================
    // Base Modal Creation
    // =============================================================

    setupGlobalEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) this.hideCurrentModal();
        });

        document.addEventListener('click', (e) => {
            if (this.currentModal && e.target === this.currentModal.element) {
                this.hideCurrentModal();
            }
        });
    }

    createBaseModals() {
        this.createConfirmationModal();
        this.createLoadingModal();
        this.createErrorModal();
        this.createSuccessModal();
    }

    createModal(id, options = {}) {
        const existing = document.getElementById(id);
        if (existing) existing.remove();

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
                 data-bs-backdrop="${backdrop}" data-bs-keyboard="${keyboard}">
                <div class="modal-dialog ${size} ${centered ? 'modal-dialog-centered' : ''} 
                     ${scrollable ? 'modal-dialog-scrollable' : ''}">
                    <div class="modal-content">
                        ${title ? `
                            <div class="modal-header">
                                <h5 class="modal-title">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>` : ''}
                        <div class="modal-body">${content}</div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modalElement = document.getElementById(id);
        const modal = new bootstrap.Modal(modalElement, { backdrop, keyboard });

        this.modals.set(id, { element: modalElement, instance: modal, options });

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

    // =============================================================
    // Specialized Modals
    // =============================================================

    createConfirmationModal() {
        const modal = this.createModal('confirmationModal', {
            title: 'Confirm Action',
            size: 'modal-sm',
            centered: true
        });

        const modalElement = document.getElementById('confirmationModal');
        modalElement.querySelector('.modal-body').innerHTML = `
            <div class="text-center">
                <i class="bi bi-question-circle-fill text-warning fs-1 mb-3"></i>
                <h6 id="confirmationTitle">Are you sure?</h6>
                <p id="confirmationMessage" class="text-muted">This action cannot be undone.</p>
                <div class="d-flex gap-2 justify-content-center">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger" id="confirmActionBtn">Confirm</button>
                </div>
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
                <i class="bi bi-exclamation-triangle-fill text-danger fs-1 mb-3"></i>
                <h6 id="errorTitle">An Error Occurred</h6>
                <p id="errorMessage" class="text-muted"></p>
                <pre id="errorDetails" class="text-start small text-muted mt-3" style="display:none;"></pre>
                <button type="button" class="btn btn-outline-secondary mt-3" id="showErrorDetailsBtn">
                    Show Details
                </button>
            </div>
        `;

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
                <i class="bi bi-check-circle-fill text-success fs-1 mb-3"></i>
                <h6 id="successTitle">Success!</h6>
                <p id="successMessage" class="text-muted">Operation completed successfully.</p>
                <button type="button" class="btn btn-success" data-bs-dismiss="modal">Continue</button>
            </div>
        `;
        return modal;
    }

    // =============================================================
    // Public API Methods
    // =============================================================

    showConfirmation(options) {
        return new Promise((resolve) => {
            const modal = this.modals.get('confirmationModal');
            if (!modal) return resolve(false);

            document.getElementById('confirmationTitle').textContent = options.title || 'Are you sure?';
            document.getElementById('confirmationMessage').textContent = options.message || 'This action cannot be undone.';

            const confirmBtn = document.getElementById('confirmActionBtn');
            confirmBtn.textContent = options.confirmText || 'Confirm';
            confirmBtn.className = `btn ${options.confirmType ? `btn-${options.confirmType}` : 'btn-danger'}`;

            const cleanup = () => {
                confirmBtn.removeEventListener('click', handleConfirm);
                modal.element.removeEventListener('hidden.bs.modal', handleCancel);
            };

            const handleConfirm = () => { cleanup(); resolve(true); };
            const handleCancel = () => { cleanup(); resolve(false); };

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
        if (modal) modal.instance.hide();
    }

    showError(options) {
        const modal = this.modals.get('errorModal');
        if (!modal) return;
        document.getElementById('errorTitle').textContent = options.title || 'An Error Occurred';
        document.getElementById('errorMessage').textContent = options.message || 'Something went wrong.';
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
        if (options.autoHide) setTimeout(() => this.hideSuccess(), options.autoHide);
    }

    hideSuccess() {
        const modal = this.modals.get('successModal');
        if (modal) modal.instance.hide();
    }

    showCustomModal(id, content, options = {}) {
        let modal = this.modals.get(id);
        if (!modal) modal = this.createModal(id, options);
        if (content) {
            const modalBody = modal.element.querySelector('.modal-body');
            if (modalBody) modalBody.innerHTML = content;
        }
        modal.instance.show();
        return modal;
    }

    hideCustomModal(id) {
        const modal = this.modals.get(id);
        if (modal) modal.instance.hide();
    }

    hideCurrentModal() {
        if (this.currentModal) this.currentModal.instance.hide();
    }
} // <— closes the class

// =============================================================
// Global Modal Manager Setup
// =============================================================

window.modalManager = new ModalManager();

document.addEventListener('DOMContentLoaded', () => {
    window.modalManager.init();
});

// =============================================================
// Global Helper Functions
// =============================================================

window.showConfirmationModal = (
    title,
    message,
    onConfirm,
    confirmText = 'Confirm',
    confirmType = 'danger'
) => {
    window.modalManager
        .showConfirmation({ title, message, confirmText, confirmType })
        .then(confirmed => {
            if (confirmed && onConfirm) onConfirm();
        });
};

window.showLoadingModal = (title, message) =>
    window.modalManager.showLoading({ title, message });

window.hideLoadingModal = () => window.modalManager.hideLoading();

window.showErrorModal = (title, message, details) =>
    window.modalManager.showError({ title, message, details });

window.showSuccessModal = (title, message, autoHide) =>
    window.modalManager.showSuccess({ title, message, autoHide });
