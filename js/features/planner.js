// Wealth Command Pro - Financial Planner
class PlannerManager {
    constructor() {
        this.timeframe = '1year';
        this.currentEditId = null;
        this.editType = null; // 'income' or 'expenses'
    }

    init() {
        this.setupEventListeners();
        this.renderPlannerProjections();
        this.renderFutureTransactions();
    }

    // --- REFACTORED MODAL METHOD ---
    showFutureTransactionModal(transactionData, title) {
        const modalId = 'futureTransactionModal';
        const formId = 'futureTransactionForm';

        const formHTML = `
            <form id="${formId}" autocomplete="off">
                <div class="row g-3">
                    <div class="col-12">
                        <label for="future-desc" class="form-label">Description</label>
                        <input type="text" name="description" id="future-desc" class="form-control" value="${this.escapeHTML(transactionData.description || '')}" required>
                    </div>
                    <div class="col-md-6">
                        <label for="future-type" class="form-label">Type</label>
                        <select name="type" id="future-type" class="form-select" required>
                            ${this.getTypeOptions(this.editType, transactionData.type)}
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label for="future-amount" class="form-label">Amount</label>
                        <input type="number" name="amount" id="future-amount" class="form-control" step="0.01" min="0.01" value="${transactionData.amount || ''}" required>
                    </div>
                    <div class="col-md-6">
                        <label for="future-frequency" class="form-label">Frequency</label>
                        <select name="frequency" id="future-frequency" class="form-select" required>
                            <option value="one-time" ${transactionData.frequency === 'one-time' ? 'selected' : ''}>One-time</option>
                            <option value="monthly" ${transactionData.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                            <option value="quarterly" ${transactionData.frequency === 'quarterly' ? 'selected' : ''}>Quarterly</option>
                            <option value="yearly" ${transactionData.frequency === 'yearly' ? 'selected' : ''}>Yearly</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label for="future-start-date" class="form-label">Start Date</label>
                        <input type="date" name="startDate" id="future-start-date" class="form-control" value="${transactionData.startDate || new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="col-12">
                        <label for="future-end-date" class="form-label">End Date (Optional)</label>
                        <input type="date" name="endDate" id="future-end-date" class="form-control" value="${transactionData.endDate || ''}">
                        <div class="form-text">Leave empty for ongoing transactions</div>
                    </div>
                    <div class="col-12">
                        <div id="futureTransactionFormAlert" class="alert alert-danger d-none"></div>
                    </div>
                </div>
            </form>
        `;

        const modal = window.modalManager.showCustomModal(modalId, formHTML, { title });
        
        const footer = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="save-future-transaction-btn">
                ${this.currentEditId ? 'Update' : 'Add'}
            </button>
        `;
        modal.element.querySelector('.modal-body').insertAdjacentHTML('afterend', `<div class="modal-footer">${footer}</div>`);
        
        modal.element.querySelector('#save-future-transaction-btn').addEventListener('click', () => {
            this.saveFutureTransaction();
        });
    }

    setupEventListeners() {
        // Timeframe buttons
        document.querySelectorAll('.planner-timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.timeframe = e.target.dataset.timeframe;
                this.updateTimeframeUI();
                this.renderPlannerProjections();
            });
        });

        // Add future transaction buttons
        document.getElementById('addFutureIncomeBtn')?.addEventListener('click', () => {
            this.showAddFutureTransactionModal('income');
        });

        document.getElementById('addFutureExpenseBtn')?.addEventListener('click', () => {
            this.showAddFutureTransactionModal('expenses');
        });
    }

    updateTimeframeUI() {
        document.querySelectorAll('.planner-timeframe-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.timeframe === this.timeframe);
        });
    }

    // Render financial projections
    renderPlannerProjections() {
        const projections = this.calculateProjections();
        this.updateProjectionSummary(projections.summary);
        this.renderProjectionTimeline(projections.months);
    }

    calculateProjections() {
        const state = window.stateManager.state;
        const currentBalance = this.getCurrentBalance();
        
        return window.analyticsEngine.projectWealth(
            state.transactions,
            state.futureTransactions,
            currentBalance,
            this.getTimeframeYears()
        );
    }

    getCurrentBalance() {
        const state = window.stateManager.state;
        const currentMonth = window.stateManager.getCurrentMonthKey();
        const monthData = state.monthlyBudgets[currentMonth];
        
        if (monthData) {
            return monthData.endingBalance;
        }

        // Calculate from transactions if no budget data
        const totalIncome = state.transactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const totalExpenses = state.transactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);

        return totalIncome - totalExpenses;
    }

    getTimeframeYears() {
        switch (this.timeframe) {
            case '1year': return 1;
            case '2years': return 2;
            case '3years': return 3;
            case '5years': return 5;
            default: return 1;
        }
    }

    updateProjectionSummary(summary) {
        document.getElementById('plannerNetWealth')?.textContent = 
            this.formatCurrency(summary.netWealth);
        document.getElementById('plannerTotalIncome')?.textContent = 
            this.formatCurrency(summary.totalIncome);
        document.getElementById('plannerTotalExpenses')?.textContent = 
            this.formatCurrency(summary.totalExpenses);
        document.getElementById('plannerEndingBalance')?.textContent = 
            this.formatCurrency(summary.endingBalance);
    }

    renderProjectionTimeline(months) {
        const container = document.getElementById('plannerTimeline');
        if (!container) return;

        if (months.length === 0) {
            container.innerHTML = this.getEmptyTimelineHTML();
            return;
        }

        container.innerHTML = months.map(month => `
            <div class="planner-month-card" onclick="plannerManager.showMonthDetails('${month.month}')">
                <div class="planner-month-header">
                    <div class="planner-month-name">${month.name}</div>
                    <div class="planner-month-balance ${month.balance >= 0 ? 'positive' : 'negative'}">
                        ${this.formatCurrency(month.balance)}
                    </div>
                </div>
                <div class="planner-month-details">
                    <div class="planner-income">
                        <i class="bi bi-arrow-down-circle text-success"></i>
                        <span>${this.formatCurrency(month.income)}</span>
                    </div>
                    <div class="planner-expenses">
                        <i class="bi bi-arrow-up-circle text-danger"></i>
                        <span>${this.formatCurrency(month.expenses)}</span>
                    </div>
                    <div class="planner-net ${month.net >= 0 ? 'text-success' : 'text-danger'}">
                        <i class="bi ${month.net >= 0 ? 'bi-graph-up' : 'bi-graph-down'}"></i>
                        <span>${month.net >= 0 ? '+' : ''}${this.formatCurrency(month.net)}</span>
                    </div>
                </div>
                <div class="planner-month-progress">
                    <div class="progress">
                        <div class="progress-bar bg-success" style="width: ${this.getIncomePercentage(month)}%"></div>
                        <div class="progress-bar bg-danger" style="width: ${this.getExpensePercentage(month)}%"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getIncomePercentage(month) {
        if (month.income + month.expenses === 0) return 50;
        return (month.income / (month.income + month.expenses)) * 100;
    }

    getExpensePercentage(month) {
        if (month.income + month.expenses === 0) return 50;
        return (month.expenses / (month.income + month.expenses)) * 100;
    }

    getEmptyTimelineHTML() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="bi bi-calendar-x"></i>
                </div>
                <h4>No Projection Data</h4>
                <p>Add future income and expenses to see your financial projections</p>
                <div class="mt-3">
                    <button class="btn btn-primary me-2" onclick="plannerManager.showAddFutureTransactionModal('income')">
                        <i class="bi bi-plus-circle"></i> Add Future Income
                    </button>
                    <button class="btn btn-danger" onclick="plannerManager.showAddFutureTransactionModal('expenses')">
                        <i class="bi bi-plus-circle"></i> Add Future Expense
                    </button>
                </div>
            </div>
        `;
    }

    // Render future transactions lists
    renderFutureTransactions() {
        this.renderFutureIncomeList();
        this.renderFutureExpensesList();
    }

    renderFutureIncomeList() {
        const container = document.getElementById('futureIncomeList');
        if (!container) return;

        const futureIncome = window.stateManager.state.futureTransactions.income;

        if (futureIncome.length === 0) {
            container.innerHTML = this.getEmptyFutureTransactionsHTML('income');
            return;
        }

        container.innerHTML = futureIncome.map(income => `
            <div class="future-transaction-card income" data-id="${income.id}">
                <div class="future-transaction-icon">
                    <i class="bi bi-currency-dollar"></i>
                </div>
                <div class="future-transaction-details">
                    <div class="future-transaction-description">${this.escapeHTML(income.description)}</div>
                    <div class="future-transaction-meta">
                        <span class="future-transaction-type">${income.type}</span>
                        <span class="future-transaction-frequency">${income.frequency}</span>
                        <span class="future-transaction-amount">${this.formatCurrency(income.amount)}</span>
                    </div>
                    <div class="future-transaction-dates">
                        <small class="text-muted">
                            ${income.startDate} ${income.endDate ? ` to ${income.endDate}` : ' (ongoing)'}
                        </small>
                    </div>
                </div>
                <div class="future-transaction-actions">
                    <button class="btn-action btn-edit" onclick="plannerManager.editFutureTransaction('income', '${income.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="plannerManager.deleteFutureTransaction('income', '${income.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderFutureExpensesList() {
        const container = document.getElementById('futureExpensesList');
        if (!container) return;

        const futureExpenses = window.stateManager.state.futureTransactions.expenses;

        if (futureExpenses.length === 0) {
            container.innerHTML = this.getEmptyFutureTransactionsHTML('expenses');
            return;
        }

        container.innerHTML = futureExpenses.map(expense => `
            <div class="future-transaction-card expense" data-id="${expense.id}">
                <div class="future-transaction-icon">
                    <i class="bi bi-cart"></i>
                </div>
                <div class="future-transaction-details">
                    <div class="future-transaction-description">${this.escapeHTML(expense.description)}</div>
                    <div class="future-transaction-meta">
                        <span class="future-transaction-type">${expense.type}</span>
                        <span class="future-transaction-frequency">${expense.frequency}</span>
                        <span class="future-transaction-amount">${this.formatCurrency(expense.amount)}</span>
                    </div>
                    <div class="future-transaction-dates">
                        <small class="text-muted">
                            ${expense.startDate} ${expense.endDate ? ` to ${expense.endDate}` : ' (ongoing)'}
                        </small>
                    </div>
                </div>
                <div class="future-transaction-actions">
                    <button class="btn-action btn-edit" onclick="plannerManager.editFutureTransaction('expenses', '${expense.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="plannerManager.deleteFutureTransaction('expenses', '${expense.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    getEmptyFutureTransactionsHTML(type) {
        const typeName = type === 'income' ? 'Income' : 'Expenses';
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="bi bi-${type === 'income' ? 'currency-dollar' : 'cart'}"></i>
                </div>
                <h4>No Future ${typeName}</h4>
                <p>Add future ${type.toLowerCase()} to improve your financial projections</p>
                <button class="btn btn-${type === 'income' ? 'success' : 'danger'}" 
                        onclick="plannerManager.showAddFutureTransactionModal('${type}')">
                    <i class="bi bi-plus-circle"></i> Add Future ${typeName}
                </button>
            </div>
        `;
    }

    // Future transaction management
    showAddFutureTransactionModal(type) {
        this.currentEditId = null;
        this.editType = type;
        this.showFutureTransactionModal({}, `Add Future ${type === 'income' ? 'Income' : 'Expense'}`);
    }

    editFutureTransaction(type, id) {
        const transaction = window.stateManager.state.futureTransactions[type].find(tx => tx.id === id);
        if (!transaction) return;

        this.currentEditId = id;
        this.editType = type;
        this.showFutureTransactionModal(transaction, `Edit Future ${type === 'income' ? 'Income' : 'Expense'}`);
    }

    showFutureTransactionModal(transactionData, title) {
        const modalHTML = `
            <div class="modal fade" id="futureTransactionModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <form id="futureTransactionForm" autocomplete="off">
                            <div class="modal-header">
                                <h5 class="modal-title">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row g-3">
                                    <div class="col-12">
                                        <label for="futureTransactionDescription" class="form-label">Description</label>
                                        <input type="text" class="form-control" id="futureTransactionDescription" 
                                               value="${this.escapeHTML(transactionData.description || '')}" required>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label for="futureTransactionType" class="form-label">Type</label>
                                        <select class="form-select" id="futureTransactionType" required>
                                            ${this.getTypeOptions(this.editType, transactionData.type)}
                                        </select>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label for="futureTransactionAmount" class="form-label">Amount</label>
                                        <input type="number" class="form-control" id="futureTransactionAmount" 
                                               step="0.01" min="0.01" value="${transactionData.amount || ''}" required>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label for="futureTransactionFrequency" class="form-label">Frequency</label>
                                        <select class="form-select" id="futureTransactionFrequency" required>
                                            <option value="one-time" ${transactionData.frequency === 'one-time' ? 'selected' : ''}>One-time</option>
                                            <option value="monthly" ${transactionData.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                                            <option value="quarterly" ${transactionData.frequency === 'quarterly' ? 'selected' : ''}>Quarterly</option>
                                            <option value="yearly" ${transactionData.frequency === 'yearly' ? 'selected' : ''}>Yearly</option>
                                        </select>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label for="futureTransactionStartDate" class="form-label">Start Date</label>
                                        <input type="date" class="form-control" id="futureTransactionStartDate" 
                                               value="${transactionData.startDate || new Date().toISOString().split('T')[0]}" required>
                                    </div>

                                    <div class="col-12">
                                        <label for="futureTransactionEndDate" class="form-label">End Date (Optional)</label>
                                        <input type="date" class="form-control" id="futureTransactionEndDate" 
                                               value="${transactionData.endDate || ''}">
                                        <div class="form-text">Leave empty for ongoing transactions</div>
                                    </div>

                                    <div class="col-12">
                                        <div id="futureTransactionFormAlert" class="alert alert-danger d-none"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-primary">
                                    ${this.currentEditId ? 'Update' : 'Add'} ${this.editType === 'income' ? 'Income' : 'Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('futureTransactionModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupFutureTransactionModal();
        const modal = new bootstrap.Modal(document.getElementById('futureTransactionModal'));
        modal.show();

        // Clean up modal after hide
        document.getElementById('futureTransactionModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    }

    getTypeOptions(transactionType, selectedType) {
        const types = {
            income: [
                { value: 'salary', label: 'Salary' },
                { value: 'freelance', label: 'Freelance' },
                { value: 'investment', label: 'Investment' },
                { value: 'rental', label: 'Rental Income' },
                { value: 'dividends', label: 'Dividends' },
                { value: 'pension', label: 'Pension' }
            ],
            expenses: [
                { value: 'housing', label: 'Housing' },
                { value: 'utilities', label: 'Utilities' },
                { value: 'food', label: 'Food' },
                { value: 'transportation', label: 'Transportation' },
                { value: 'healthcare', label: 'Healthcare' },
                { value: 'entertainment', label: 'Entertainment' },
                { value: 'education', label: 'Education' }
            ]
        };

        const typeList = types[transactionType] || [];
        return typeList.map(type => `
            <option value="${type.value}" ${type.value === selectedType ? 'selected' : ''}>
                ${type.label}
            </option>
        `).join('');
    }

    setupFutureTransactionModal() {
        document.getElementById('futureTransactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFutureTransaction();
        });
    }

    saveFutureTransaction() {
        const formData = {
            description: document.getElementById('futureTransactionDescription').value.trim(),
            type: document.getElementById('futureTransactionType').value,
            amount: parseFloat(document.getElementById('futureTransactionAmount').value),
            frequency: document.getElementById('futureTransactionFrequency').value,
            startDate: document.getElementById('futureTransactionStartDate').value,
            endDate: document.getElementById('futureTransactionEndDate').value || null
        };

        // Validation
        const validation = this.validateFutureTransaction(formData);
        if (!validation.isValid) {
            this.showFormAlert(validation.message);
            return;
        }

        if (this.currentEditId) {
            // Update existing future transaction
            window.stateManager.updateFutureTransaction(this.editType, this.currentEditId, formData);
            window.showToast('Future transaction updated successfully', 'success');
        } else {
            // Add new future transaction
            window.stateManager.addFutureTransaction(this.editType, formData);
            window.showToast('Future transaction added successfully', 'success');
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('futureTransactionModal'));
        modal.hide();

        // Refresh planner
        this.renderPlannerProjections();
        this.renderFutureTransactions();
    }

    validateFutureTransaction(data) {
        if (!data.description || data.description.length < 2) {
            return { isValid: false, message: 'Description must be at least 2 characters long' };
        }

        if (!data.amount || data.amount <= 0) {
            return { isValid: false, message: 'Amount must be greater than 0' };
        }

        if (!data.startDate) {
            return { isValid: false, message: 'Please select a start date' };
        }

        if (data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
            return { isValid: false, message: 'End date cannot be before start date' };
        }

        return { isValid: true };
    }

    showFormAlert(message) {
        const alert = document.getElementById('futureTransactionFormAlert');
        alert.textContent = message;
        alert.classList.remove('d-none');
        
        setTimeout(() => {
            alert.classList.add('d-none');
        }, 5000);
    }

    deleteFutureTransaction(type, id) {
        const transaction = window.stateManager.state.futureTransactions[type].find(tx => tx.id === id);
        if (!transaction) return;

        window.showConfirmationModal(
            'Delete Future Transaction',
            `Are you sure you want to delete "${transaction.description}"?`,
            () => {
                window.stateManager.deleteFutureTransaction(type, id);
                window.showToast('Future transaction deleted successfully', 'success');
                this.renderPlannerProjections();
                this.renderFutureTransactions();
            },
            'Delete',
            'danger'
        );
    }

    // Month details view
    showMonthDetails(monthKey) {
        const projections = this.calculateProjections();
        const monthData = projections.months.find(m => m.month === monthKey);
        
        if (!monthData) return;

        const modalHTML = `
            <div class="modal fade" id="monthDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-calendar-month"></i> ${monthData.name} Details
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="month-summary-cards">
                                <div class="summary-card income">
                                    <div class="summary-icon">
                                        <i class="bi bi-arrow-down-circle"></i>
                                    </div>
                                    <div class="summary-content">
                                        <div class="summary-value">${this.formatCurrency(monthData.income)}</div>
                                        <div class="summary-label">Total Income</div>
                                    </div>
                                </div>
                                <div class="summary-card expenses">
                                    <div class="summary-icon">
                                        <i class="bi bi-arrow-up-circle"></i>
                                    </div>
                                    <div class="summary-content">
                                        <div class="summary-value">${this.formatCurrency(monthData.expenses)}</div>
                                        <div class="summary-label">Total Expenses</div>
                                    </div>
                                </div>
                                <div class="summary-card balance">
                                    <div class="summary-icon">
                                        <i class="bi bi-wallet2"></i>
                                    </div>
                                    <div class="summary-content">
                                        <div class="summary-value ${monthData.balance >= 0 ? 'positive' : 'negative'}">
                                            ${this.formatCurrency(monthData.balance)}
                                        </div>
                                        <div class="summary-label">Ending Balance</div>
                                    </div>
                                </div>
                            </div>

                            <div class="month-breakdown">
                                <div class="breakdown-section">
                                    <h6>Income Sources</h6>
                                    ${this.getIncomeBreakdownHTML(monthData.month)}
                                </div>
                                <div class="breakdown-section">
                                    <h6>Expense Categories</h6>
                                    ${this.getExpenseBreakdownHTML(monthData.month)}
                                </div>
                            </div>

                            <div class="month-insights">
                                <h6>Financial Insights</h6>
                                <div class="insights-grid">
                                    <div class="insight-item">
                                        <div class="insight-label">Savings Rate</div>
                                        <div class="insight-value ${this.getSavingsRate(monthData) >= 0.2 ? 'positive' : 'warning'}">
                                            ${(this.getSavingsRate(monthData) * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                    <div class="insight-item">
                                        <div class="insight-label">Net Cash Flow</div>
                                        <div class="insight-value ${monthData.net >= 0 ? 'positive' : 'negative'}">
                                            ${monthData.net >= 0 ? '+' : ''}${this.formatCurrency(monthData.net)}
                                        </div>
                                    </div>
                                    <div class="insight-item">
                                        <div class="insight-label">Balance Change</div>
                                        <div class="insight-value ${monthData.net >= 0 ? 'positive' : 'negative'}">
                                            ${monthData.net >= 0 ? '+' : ''}${this.formatCurrency(monthData.net)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('monthDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('monthDetailsModal'));
        modal.show();

        // Clean up modal after hide
        document.getElementById('monthDetailsModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    }

    getIncomeBreakdownHTML(monthKey) {
        const futureIncome = window.stateManager.state.futureTransactions.income;
        const monthIncome = futureIncome.filter(income => 
            this.shouldIncludeInMonth(income, monthKey)
        );

        if (monthIncome.length === 0) {
            return '<div class="empty-breakdown">No income sources for this month</div>';
        }

        return monthIncome.map(income => `
            <div class="breakdown-item">
                <div class="breakdown-description">${this.escapeHTML(income.description)}</div>
                <div class="breakdown-amount">${this.formatCurrency(income.amount)}</div>
            </div>
        `).join('');
    }

    getExpenseBreakdownHTML(monthKey) {
        const futureExpenses = window.stateManager.state.futureTransactions.expenses;
        const monthExpenses = futureExpenses.filter(expense => 
            this.shouldIncludeInMonth(expense, monthKey)
        );

        if (monthExpenses.length === 0) {
            return '<div class="empty-breakdown">No expenses for this month</div>';
        }

        return monthExpenses.map(expense => `
            <div class="breakdown-item">
                <div class="breakdown-description">${this.escapeHTML(expense.description)}</div>
                <div class="breakdown-amount">${this.formatCurrency(expense.amount)}</div>
            </div>
        `).join('');
    }

    shouldIncludeInMonth(transaction, monthKey) {
        const [targetYear, targetMonth] = monthKey.split('-').map(Number);
        const startDate = new Date(transaction.startDate);
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1;

        // Check if transaction starts after target month
        if (startYear > targetYear || (startYear === targetYear && startMonth > targetMonth)) {
            return false;
        }

        // Check end date if exists
        if (transaction.endDate) {
            const endDate = new Date(transaction.endDate);
            const endYear = endDate.getFullYear();
            const endMonth = endDate.getMonth() + 1;

            if (endYear < targetYear || (endYear === targetYear && endMonth < targetMonth)) {
                return false;
            }
        }

        // Check frequency
        switch (transaction.frequency) {
            case 'one-time':
                return startYear === targetYear && startMonth === targetMonth;
            case 'monthly':
                return true;
            case 'quarterly':
                const monthsDiff = (targetYear - startYear) * 12 + (targetMonth - startMonth);
                return monthsDiff % 3 === 0;
            case 'yearly':
                return targetMonth === startMonth;
            default:
                return false;
        }
    }

    getSavingsRate(monthData) {
        if (monthData.income === 0) return 0;
        return (monthData.net) / monthData.income;
    }

    // Utility methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: window.stateManager.state.currency || 'PKR'
        }).format(amount);
    }

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Export planner data
    exportPlannerData() {
        const data = {
            futureTransactions: window.stateManager.state.futureTransactions,
            projections: this.calculateProjections(),
            exportDate: new Date().toISOString(),
            timeframe: this.timeframe
        };

        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'financial-planner-data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        window.showToast('Planner data exported successfully', 'success');
    }

    // Get planner statistics
    getPlannerStats() {
        const futureIncome = window.stateManager.state.futureTransactions.income;
        const futureExpenses = window.stateManager.state.futureTransactions.expenses;
        const projections = this.calculateProjections();

        const totalFutureIncome = futureIncome.reduce((sum, income) => {
            const occurrences = this.getOccurrenceCount(income);
            return sum + (income.amount * occurrences);
        }, 0);

        const totalFutureExpenses = futureExpenses.reduce((sum, expense) => {
            const occurrences = this.getOccurrenceCount(expense);
            return sum + (expense.amount * occurrences);
        }, 0);

        return {
            totalFutureIncome,
            totalFutureExpenses,
            netFuturePosition: totalFutureIncome - totalFutureExpenses,
            incomeSources: futureIncome.length,
            expenseCategories: futureExpenses.length,
            projectionMonths: projections.months.length,
            projectedNetWorth: projections.summary.endingBalance
        };
    }

    getOccurrenceCount(transaction) {
        const startDate = new Date(transaction.startDate);
        const endDate = transaction.endDate ? new Date(transaction.endDate) : new Date(startDate.getFullYear() + 5, startDate.getMonth(), startDate.getDate());
        const now = new Date();

        let count = 0;
        let currentDate = new Date(startDate);

        while (currentDate <= endDate && currentDate <= new Date(now.getFullYear() + this.getTimeframeYears(), now.getMonth(), now.getDate())) {
            count++;
            
            switch (transaction.frequency) {
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
                case 'quarterly':
                    currentDate.setMonth(currentDate.getMonth() + 3);
                    break;
                case 'yearly':
                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                    break;
                default: // one-time
                    currentDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000); // Exit loop
            }
        }

        return count;
    }
}

// Create global planner manager instance
window.plannerManager = new PlannerManager();
