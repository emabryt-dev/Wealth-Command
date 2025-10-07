// Wealth Command Pro - Debt Management Feature
class DebtManager {
    constructor() {
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        this.setupEventListeners();
        this.initialized = true;
    }

    setupEventListeners() {
        // Debt form submissions
        const debtForm = document.getElementById('debtForm');
        if (debtForm) {
            debtForm.addEventListener('submit', (e) => this.handleDebtSubmit(e));
        }

        // Payment form submissions
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => this.handlePaymentSubmit(e));
        }
    }

    // Debt Management Methods
    async addDebt(debtData) {
        if (!window.stateManager) {
            throw new Error('State manager not available');
        }

        const debt = {
            id: this.generateId(),
            ...debtData,
            status: 'active',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            payments: []
        };

        window.stateManager.addLoan(debt.type, debt);
        await this.renderDebtOverview();
        
        return debt;
    }

    async updateDebt(debtId, updates) {
        if (!window.stateManager) {
            throw new Error('State manager not available');
        }

        const { loans } = window.stateManager.state;
        let updated = false;

        // Search in both given and taken loans
        for (const type of ['given', 'taken']) {
            const index = loans[type].findIndex(loan => loan.id === debtId);
            if (index !== -1) {
                window.stateManager.updateLoan(type, index, {
                    ...updates,
                    updated: new Date().toISOString()
                });
                updated = true;
                break;
            }
        }

        if (updated) {
            await this.renderDebtOverview();
        }

        return updated;
    }

    async deleteDebt(debtId) {
        if (!window.stateManager) {
            throw new Error('State manager not available');
        }

        const { loans } = window.stateManager.state;
        let deleted = false;

        for (const type of ['given', 'taken']) {
            const index = loans[type].findIndex(loan => loan.id === debtId);
            if (index !== -1) {
                window.stateManager.deleteLoan(type, index);
                deleted = true;
                break;
            }
        }

        if (deleted) {
            await this.renderDebtOverview();
        }

        return deleted;
    }

    async addPayment(debtId, paymentData) {
        if (!window.stateManager) {
            throw new Error('State manager not available');
        }

        const { loans } = window.stateManager.state;
        let paymentAdded = false;

        for (const type of ['given', 'taken']) {
            const index = loans[type].findIndex(loan => loan.id === debtId);
            if (index !== -1) {
                const loan = loans[type][index];
                const payment = {
                    id: this.generateId(),
                    date: paymentData.date || new Date().toISOString().split('T')[0],
                    amount: parseFloat(paymentData.amount),
                    note: paymentData.note || '',
                    created: new Date().toISOString()
                };

                if (!loan.payments) loan.payments = [];
                loan.payments.push(payment);

                // Update loan status
                loan.status = this.calculateLoanStatus(loan);
                loan.updated = new Date().toISOString();

                window.stateManager.updateLoan(type, index, loan);
                paymentAdded = true;
                break;
            }
        }

        if (paymentAdded) {
            await this.renderDebtOverview();
        }

        return paymentAdded;
    }

    // Status Calculations
    calculateLoanStatus(loan) {
        const totalPaid = this.getTotalPaid(loan);
        const totalAmount = parseFloat(loan.amount);

        if (totalPaid >= totalAmount) {
            return 'paid';
        }

        const dueDate = loan.dueDate || loan.expectedReturn;
        if (dueDate) {
            const today = new Date();
            const due = new Date(dueDate);
            
            if (today > due && totalPaid < totalAmount) {
                return 'overdue';
            }
        }

        if (totalPaid > 0) {
            return 'partial';
        }

        return 'pending';
    }

    getTotalPaid(loan) {
        if (!loan.payments || !Array.isArray(loan.payments)) {
            return 0;
        }
        return loan.payments.reduce((total, payment) => total + parseFloat(payment.amount), 0);
    }

    getRemainingAmount(loan) {
        const totalAmount = parseFloat(loan.amount);
        const totalPaid = this.getTotalPaid(loan);
        return Math.max(0, totalAmount - totalPaid);
    }

    // Debt Analytics
    calculateDebtSummary() {
        const { loans } = window.stateManager.state;
        
        const givenSummary = loans.given.reduce((summary, loan) => {
            const paid = this.getTotalPaid(loan);
            const remaining = this.getRemainingAmount(loan);
            
            summary.totalAmount += parseFloat(loan.amount);
            summary.totalPaid += paid;
            summary.totalRemaining += remaining;
            summary.activeLoans += loan.status !== 'paid' ? 1 : 0;
            summary.overdueLoans += loan.status === 'overdue' ? 1 : 0;
            
            return summary;
        }, { 
            totalAmount: 0, 
            totalPaid: 0, 
            totalRemaining: 0, 
            activeLoans: 0, 
            overdueLoans: 0 
        });

        const takenSummary = loans.taken.reduce((summary, loan) => {
            const paid = this.getTotalPaid(loan);
            const remaining = this.getRemainingAmount(loan);
            
            summary.totalAmount += parseFloat(loan.amount);
            summary.totalPaid += paid;
            summary.totalRemaining += remaining;
            summary.activeLoans += loan.status !== 'paid' ? 1 : 0;
            summary.overdueLoans += loan.status === 'overdue' ? 1 : 0;
            
            return summary;
        }, { 
            totalAmount: 0, 
            totalPaid: 0, 
            totalRemaining: 0, 
            activeLoans: 0, 
            overdueLoans: 0 
        });

        const netPosition = givenSummary.totalRemaining - takenSummary.totalRemaining;

        return {
            given: givenSummary,
            taken: takenSummary,
            netPosition,
            totalActiveLoans: givenSummary.activeLoans + takenSummary.activeLoans,
            totalOverdue: givenSummary.overdueLoans + takenSummary.overdueLoans
        };
    }

    getUpcomingPayments(days = 30) {
        const { loans } = window.stateManager.state;
        const upcoming = [];
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + days);

        // Check loans given (expected returns)
        loans.given.forEach(loan => {
            if (loan.status !== 'paid' && loan.expectedReturn) {
                const returnDate = new Date(loan.expectedReturn);
                if (returnDate >= today && returnDate <= futureDate) {
                    upcoming.push({
                        type: 'given',
                        loan,
                        date: loan.expectedReturn,
                        amount: this.getRemainingAmount(loan),
                        description: `Expected return from ${loan.borrower}`
                    });
                }
            }
        });

        // Check loans taken (due dates)
        loans.taken.forEach(loan => {
            if (loan.status !== 'paid' && loan.dueDate) {
                const dueDate = new Date(loan.dueDate);
                if (dueDate >= today && dueDate <= futureDate) {
                    upcoming.push({
                        type: 'taken',
                        loan,
                        date: loan.dueDate,
                        amount: this.getRemainingAmount(loan),
                        description: `Payment due to ${loan.lender}`
                    });
                }
            }
        });

        return upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // UI Rendering Methods
    async renderDebtOverview() {
        const container = document.getElementById('debtOverview');
        if (!container) return;

        const summary = this.calculateDebtSummary();
        const upcomingPayments = this.getUpcomingPayments();

        const html = `
            <div class="row g-3 mb-4">
                <div class="col-6 col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <div class="text-success">
                                <i class="bi bi-arrow-up-right fs-4"></i>
                                <div class="fw-bold fs-5">${summary.given.totalRemaining.toLocaleString()}</div>
                                <small>Loans Given</small>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <div class="text-danger">
                                <i class="bi bi-arrow-down-left fs-4"></i>
                                <div class="fw-bold fs-5">${summary.taken.totalRemaining.toLocaleString()}</div>
                                <small>Loans Taken</small>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <div class="${summary.netPosition >= 0 ? 'text-success' : 'text-danger'}">
                                <i class="bi bi-cash-coin fs-4"></i>
                                <div class="fw-bold fs-5">${summary.netPosition.toLocaleString()}</div>
                                <small>Net Position</small>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <div class="text-warning">
                                <i class="bi bi-clock fs-4"></i>
                                <div class="fw-bold fs-5">${upcomingPayments.length}</div>
                                <small>Upcoming</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            ${await this.renderUpcomingPayments(upcomingPayments)}
            ${await this.renderLoansGiven()}
            ${await this.renderLoansTaken()}
        `;

        container.innerHTML = html;
        this.attachDebtEventListeners();
    }

    async renderUpcomingPayments(upcomingPayments) {
        if (upcomingPayments.length === 0) {
            return `
                <div class="card mb-4">
                    <div class="card-header">
                        <i class="bi bi-clock text-warning"></i> Upcoming Payments
                    </div>
                    <div class="card-body text-center text-muted py-4">
                        <i class="bi bi-check-circle fs-1"></i>
                        <p class="mt-2">No upcoming payments in the next 30 days</p>
                    </div>
                </div>
            `;
        }

        const paymentsHTML = upcomingPayments.map(payment => {
            const daysUntil = Math.ceil((new Date(payment.date) - new Date()) / (1000 * 60 * 60 * 24));
            const urgency = daysUntil <= 7 ? 'high' : daysUntil <= 14 ? 'medium' : 'low';
            
            return `
                <div class="upcoming-payment-item" data-debt-id="${payment.loan.id}">
                    <div class="payment-info">
                        <div class="fw-bold">${payment.description}</div>
                        <small class="text-muted">Due in ${daysUntil} days • ${payment.date}</small>
                    </div>
                    <div class="payment-details">
                        <span class="payment-amount ${payment.type === 'given' ? 'text-success' : 'text-danger'}">
                            ${payment.amount.toLocaleString()} ${window.stateManager?.state.currency || 'PKR'}
                        </span>
                        <span class="badge bg-${urgency === 'high' ? 'danger' : urgency === 'medium' ? 'warning' : 'info'}">
                            ${urgency} priority
                        </span>
                        <button class="btn btn-sm btn-outline-primary" onclick="debtManager.showAddPaymentModal('${payment.loan.id}')">
                            <i class="bi bi-cash-coin"></i> Add Payment
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="card mb-4">
                <div class="card-header">
                    <i class="bi bi-clock text-warning"></i> Upcoming Payments (Next 30 Days)
                </div>
                <div class="card-body">
                    <div class="upcoming-payments-list">
                        ${paymentsHTML}
                    </div>
                </div>
            </div>
        `;
    }

    async renderLoansGiven() {
        const { loans } = window.stateManager.state;
        const givenLoans = loans.given;

        if (givenLoans.length === 0) {
            return `
                <div class="card mb-4">
                    <div class="card-header">
                        <i class="bi bi-arrow-up-right text-success"></i> Loans Given
                    </div>
                    <div class="card-body text-center text-muted py-4">
                        <i class="bi bi-cash-coin fs-1"></i>
                        <p class="mt-2">No loans given</p>
                        <button class="btn btn-primary mt-2" onclick="debtManager.showAddDebtModal('given')">
                            <i class="bi bi-plus-circle"></i> Add Loan Given
                        </button>
                    </div>
                </div>
            `;
        }

        const loansHTML = givenLoans.map(loan => {
            const totalPaid = this.getTotalPaid(loan);
            const remaining = this.getRemainingAmount(loan);
            const progress = (totalPaid / parseFloat(loan.amount)) * 100;

            return `
                <div class="debt-item debt-status-${loan.status}" data-debt-id="${loan.id}">
                    <div class="debt-item-info">
                        <div class="debt-header">
                            <div class="fw-bold">${loan.borrower || 'Unknown Borrower'}</div>
                            <span class="badge bg-${this.getStatusBadgeColor(loan.status)}">
                                ${loan.status}
                            </span>
                        </div>
                        <small class="text-muted">
                            ${parseFloat(loan.amount).toLocaleString()} ${window.stateManager?.state.currency || 'PKR'} • 
                            Given: ${loan.dateGiven} • 
                            Expected: ${loan.expectedReturn || 'Not specified'}
                        </small>
                        ${loan.description ? `<div class="debt-description">${loan.description}</div>` : ''}
                        
                        <div class="debt-progress mt-2">
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar" style="width: ${progress}%"></div>
                            </div>
                            <div class="progress-details">
                                <small class="text-muted">
                                    Paid: ${totalPaid.toLocaleString()} • 
                                    Remaining: ${remaining.toLocaleString()}
                                </small>
                            </div>
                        </div>

                        ${loan.payments && loan.payments.length > 0 ? `
                            <div class="payment-history mt-2">
                                <small class="text-muted">Last payment: ${loan.payments[loan.payments.length - 1].date}</small>
                            </div>
                        ` : ''}
                    </div>
                    <div class="debt-item-actions">
                        <button class="btn-action btn-payment" onclick="debtManager.showAddPaymentModal('${loan.id}')" 
                                title="Add Payment" ${loan.status === 'paid' ? 'disabled' : ''}>
                            <i class="bi bi-cash-coin"></i>
                        </button>
                        <button class="btn-action btn-edit" onclick="debtManager.showEditDebtModal('${loan.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="debtManager.showDeleteDebtModal('${loan.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <i class="bi bi-arrow-up-right text-success"></i> Loans Given
                        <span class="badge bg-success ms-2">${givenLoans.length}</span>
                    </div>
                    <button class="btn btn-success btn-sm" onclick="debtManager.showAddDebtModal('given')">
                        <i class="bi bi-plus-circle"></i> Add New
                    </button>
                </div>
                <div class="card-body">
                    <div class="debt-list">
                        ${loansHTML}
                    </div>
                </div>
            </div>
        `;
    }

    async renderLoansTaken() {
        const { loans } = window.stateManager.state;
        const takenLoans = loans.taken;

        if (takenLoans.length === 0) {
            return `
                <div class="card mb-4">
                    <div class="card-header">
                        <i class="bi bi-arrow-down-left text-danger"></i> Loans Taken
                    </div>
                    <div class="card-body text-center text-muted py-4">
                        <i class="bi bi-cash-coin fs-1"></i>
                        <p class="mt-2">No loans taken</p>
                        <button class="btn btn-danger mt-2" onclick="debtManager.showAddDebtModal('taken')">
                            <i class="bi bi-plus-circle"></i> Add Loan Taken
                        </button>
                    </div>
                </div>
            `;
        }

        const loansHTML = takenLoans.map(loan => {
            const totalPaid = this.getTotalPaid(loan);
            const remaining = this.getRemainingAmount(loan);
            const progress = (totalPaid / parseFloat(loan.amount)) * 100;

            return `
                <div class="debt-item debt-status-${loan.status}" data-debt-id="${loan.id}">
                    <div class="debt-item-info">
                        <div class="debt-header">
                            <div class="fw-bold">${loan.lender || 'Unknown Lender'}</div>
                            <span class="badge bg-${this.getStatusBadgeColor(loan.status)}">
                                ${loan.status}
                            </span>
                        </div>
                        <small class="text-muted">
                            ${parseFloat(loan.amount).toLocaleString()} ${window.stateManager?.state.currency || 'PKR'} • 
                            Taken: ${loan.dateTaken} • 
                            Due: ${loan.dueDate || 'Not specified'}
                        </small>
                        ${loan.description ? `<div class="debt-description">${loan.description}</div>` : ''}
                        
                        <div class="debt-progress mt-2">
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar" style="width: ${progress}%"></div>
                            </div>
                            <div class="progress-details">
                                <small class="text-muted">
                                    Paid: ${totalPaid.toLocaleString()} • 
                                    Remaining: ${remaining.toLocaleString()}
                                </small>
                            </div>
                        </div>

                        ${loan.payments && loan.payments.length > 0 ? `
                            <div class="payment-history mt-2">
                                <small class="text-muted">Last payment: ${loan.payments[loan.payments.length - 1].date}</small>
                            </div>
                        ` : ''}
                    </div>
                    <div class="debt-item-actions">
                        <button class="btn-action btn-payment" onclick="debtManager.showAddPaymentModal('${loan.id}')" 
                                title="Add Payment" ${loan.status === 'paid' ? 'disabled' : ''}>
                            <i class="bi bi-cash-coin"></i>
                        </button>
                        <button class="btn-action btn-edit" onclick="debtManager.showEditDebtModal('${loan.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="debtManager.showDeleteDebtModal('${loan.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <i class="bi bi-arrow-down-left text-danger"></i> Loans Taken
                        <span class="badge bg-danger ms-2">${takenLoans.length}</span>
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="debtManager.showAddDebtModal('taken')">
                        <i class="bi bi-plus-circle"></i> Add New
                    </button>
                </div>
                <div class="card-body">
                    <div class="debt-list">
                        ${loansHTML}
                    </div>
                </div>
            </div>
        `;
    }

    // Modal Methods
    async showAddDebtModal(type) {
        const modalHTML = `
            <div class="modal fade" id="addDebtModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-plus-circle"></i> Add ${type === 'given' ? 'Loan Given' : 'Loan Taken'}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="debtForm">
                                <input type="hidden" name="type" value="${type}">
                                <div class="mb-3">
                                    <label class="form-label">${type === 'given' ? 'Borrower Name' : 'Lender Name'}</label>
                                    <input type="text" class="form-control" name="${type === 'given' ? 'borrower' : 'lender'}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Amount</label>
                                    <input type="number" class="form-control" name="amount" step="0.01" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Description (Optional)</label>
                                    <textarea class="form-control" name="description" rows="2"></textarea>
                                </div>
                                <div class="row">
                                    <div class="col-6">
                                        <label class="form-label">${type === 'given' ? 'Date Given' : 'Date Taken'}</label>
                                        <input type="date" class="form-control" name="${type === 'given' ? 'dateGiven' : 'dateTaken'}" required>
                                    </div>
                                    <div class="col-6">
                                        <label class="form-label">${type === 'given' ? 'Expected Return' : 'Due Date'}</label>
                                        <input type="date" class="form-control" name="${type === 'given' ? 'expectedReturn' : 'dueDate'}">
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="debtManager.submitDebtForm()">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('addDebtModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Set current date as default
        const modal = new bootstrap.Modal(document.getElementById('addDebtModal'));
        const today = new Date().toISOString().split('T')[0];
        document.querySelector(`input[name="${type === 'given' ? 'dateGiven' : 'dateTaken'}"]`).value = today;
        
        modal.show();
    }

    async showAddPaymentModal(debtId) {
        const loan = this.findLoanById(debtId);
        if (!loan) return;

        const remaining = this.getRemainingAmount(loan);
        const currency = window.stateManager?.state.currency || 'PKR';

        const modalHTML = `
            <div class="modal fade" id="addPaymentModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-cash-coin"></i> Add Payment
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info">
                                <strong>Remaining Amount:</strong> ${remaining.toLocaleString()} ${currency}
                            </div>
                            <form id="paymentForm">
                                <input type="hidden" name="debtId" value="${debtId}">
                                <div class="mb-3">
                                    <label class="form-label">Payment Amount</label>
                                    <input type="number" class="form-control" name="amount" 
                                           step="0.01" max="${remaining}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Payment Date</label>
                                    <input type="date" class="form-control" name="date" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Note (Optional)</label>
                                    <textarea class="form-control" name="note" rows="2" 
                                              placeholder="Add any notes about this payment"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="debtManager.submitPaymentForm()">Add Payment</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('addPaymentModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = new bootstrap.Modal(document.getElementById('addPaymentModal'));
        const today = new Date().toISOString().split('T')[0];
        document.querySelector('input[name="date"]').value = today;
        
        modal.show();
    }

    // Form Handlers
    async submitDebtForm() {
        const form = document.getElementById('debtForm');
        const formData = new FormData(form);
        
        const debtData = {
            type: formData.get('type'),
            amount: parseFloat(formData.get('amount')),
            description: formData.get('description') || '',
            [formData.get('type') === 'given' ? 'borrower' : 'lender']: formData.get(formData.get('type') === 'given' ? 'borrower' : 'lender'),
            [formData.get('type') === 'given' ? 'dateGiven' : 'dateTaken']: formData.get(formData.get('type') === 'given' ? 'dateGiven' : 'dateTaken'),
            [formData.get('type') === 'given' ? 'expectedReturn' : 'dueDate']: formData.get(formData.get('type') === 'given' ? 'expectedReturn' : 'dueDate') || null
        };

        try {
            await this.addDebt(debtData);
            bootstrap.Modal.getInstance(document.getElementById('addDebtModal')).hide();
            window.showToast('Debt added successfully', 'success');
        } catch (error) {
            console.error('Error adding debt:', error);
            window.showToast('Error adding debt', 'error');
        }
    }

    async submitPaymentForm() {
        const form = document.getElementById('paymentForm');
        const formData = new FormData(form);
        
        const paymentData = {
            debtId: formData.get('debtId'),
            amount: parseFloat(formData.get('amount')),
            date: formData.get('date'),
            note: formData.get('note') || ''
        };

        try {
            await this.addPayment(paymentData.debtId, paymentData);
            bootstrap.Modal.getInstance(document.getElementById('addPaymentModal')).hide();
            window.showToast('Payment added successfully', 'success');
        } catch (error) {
            console.error('Error adding payment:', error);
            window.showToast('Error adding payment', 'error');
        }
    }

    // Utility Methods
    findLoanById(debtId) {
        const { loans } = window.stateManager.state;
        
        for (const type of ['given', 'taken']) {
            const loan = loans[type].find(loan => loan.id === debtId);
            if (loan) return { type, loan };
        }
        
        return null;
    }

    getStatusBadgeColor(status) {
        const colors = {
            'active': 'primary',
            'pending': 'warning',
            'partial': 'info',
            'overdue': 'danger',
            'paid': 'success'
        };
        return colors[status] || 'secondary';
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    attachDebtEventListeners() {
        // Attach event listeners to debt items
        document.querySelectorAll('.debt-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.debt-item-actions')) {
                    const debtId = item.dataset.debtId;
                    this.showDebtDetails(debtId);
                }
            });
        });
    }

    async showDebtDetails(debtId) {
        const loanInfo = this.findLoanById(debtId);
        if (!loanInfo) return;

        const { type, loan } = loanInfo;
        const totalPaid = this.getTotalPaid(loan);
        const remaining = this.getRemainingAmount(loan);
        const currency = window.stateManager?.state.currency || 'PKR';

        const detailsHTML = `
            <div class="modal fade" id="debtDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-cash-coin"></i> Debt Details
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-4">
                                <div class="col-6">
                                    <div class="card">
                                        <div class="card-body text-center">
                                            <div class="text-primary fs-4 fw-bold">${parseFloat(loan.amount).toLocaleString()}</div>
                                            <small class="text-muted">Original Amount</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="card">
                                        <div class="card-body text-center">
                                            <div class="text-success fs-4 fw-bold">${totalPaid.toLocaleString()}</div>
                                            <small class="text-muted">Total Paid</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            ${loan.payments && loan.payments.length > 0 ? `
                                <h6>Payment History</h6>
                                <div class="payment-history-list">
                                    ${loan.payments.map(payment => `
                                        <div class="payment-item">
                                            <div class="payment-date">${payment.date}</div>
                                            <div class="payment-amount">${parseFloat(payment.amount).toLocaleString()} ${currency}</div>
                                            ${payment.note ? `<div class="payment-note">${payment.note}</div>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div class="text-center text-muted py-3">
                                    <i class="bi bi-cash-coin fs-1"></i>
                                    <p>No payments recorded yet</p>
                                </div>
                            `}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" onclick="debtManager.showAddPaymentModal('${debtId}')">
                                <i class="bi bi-cash-coin"></i> Add Payment
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('debtDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', detailsHTML);
        new bootstrap.Modal(document.getElementById('debtDetailsModal')).show();
    }
}

// Create global debt manager instance
window.debtManager = new DebtManager();
