// Wealth Command Pro - Transactions Management
class TransactionManager {
    constructor() {
        this.currentEditId = null;
        this.filters = {
            type: 'all',
            category: 'all',
            dateRange: 'all',
            search: ''
        };
        this.sortBy = 'date';
        this.sortOrder = 'desc';
    }

    // Initialize transactions module
    init() {
        this.setupEventListeners();
        this.renderTransactionList();
        this.setupQuickAdd();
    }

    setupEventListeners() {
        // Filter events
        document.getElementById('transactionTypeFilter')?.addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.renderTransactionList();
        });

        document.getElementById('transactionCategoryFilter')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.renderTransactionList();
        });

        document.getElementById('transactionSearch')?.addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.renderTransactionList();
        });

        // Sort events
        document.querySelectorAll('[data-sort]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sortField = e.target.dataset.sort;
                if (this.sortBy === sortField) {
                    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortBy = sortField;
                    this.sortOrder = 'desc';
                }
                this.updateSortUI();
                this.renderTransactionList();
            });
        });
    }

    setupQuickAdd() {
        // Quick add transaction buttons
        document.querySelectorAll('.quick-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.showQuickAddModal(type);
            });
        });
    }

    // Render transaction list with filters and sorting
    renderTransactionList() {
        const container = document.getElementById('transactionsList');
        if (!container) return;

        const transactions = this.getFilteredTransactions();
        
        if (transactions.length === 0) {
            this.showEmptyState(container);
            return;
        }

        const sortedTransactions = this.sortTransactions(transactions);
        container.innerHTML = this.generateTransactionHTML(sortedTransactions);
        this.attachTransactionEventListeners();
    }

    getFilteredTransactions() {
        const state = window.stateManager.state;
        let transactions = state.transactions || [];

        // Apply filters
        if (this.filters.type !== 'all') {
            transactions = transactions.filter(tx => tx.type === this.filters.type);
        }

        if (this.filters.category !== 'all') {
            transactions = transactions.filter(tx => tx.category === this.filters.category);
        }

        if (this.filters.search) {
            transactions = transactions.filter(tx => 
                tx.desc.toLowerCase().includes(this.filters.search) ||
                tx.category.toLowerCase().includes(this.filters.search)
            );
        }

        // Date range filter
        if (this.filters.dateRange !== 'all') {
            transactions = this.filterByDateRange(transactions, this.filters.dateRange);
        }

        return transactions;
    }

    filterByDateRange(transactions, range) {
        const now = new Date();
        let startDate;

        switch (range) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                return transactions;
        }

        return transactions.filter(tx => new Date(tx.date) >= startDate);
    }

    sortTransactions(transactions) {
        return transactions.sort((a, b) => {
            let aValue, bValue;

            switch (this.sortBy) {
                case 'date':
                    aValue = new Date(a.date);
                    bValue = new Date(b.date);
                    break;
                case 'amount':
                    aValue = a.amount;
                    bValue = b.amount;
                    break;
                case 'description':
                    aValue = a.desc.toLowerCase();
                    bValue = b.desc.toLowerCase();
                    break;
                case 'category':
                    aValue = a.category.toLowerCase();
                    bValue = b.category.toLowerCase();
                    break;
                default:
                    aValue = new Date(a.date);
                    bValue = new Date(b.date);
            }

            if (this.sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
    }

    generateTransactionHTML(transactions) {
        return transactions.map(transaction => `
            <div class="transaction-item" data-transaction-id="${transaction.id}">
                <div class="transaction-icon">
                    <i class="bi ${this.getTransactionIcon(transaction)}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-description">${this.escapeHTML(transaction.desc)}</div>
                    <div class="transaction-meta">
                        <span class="transaction-category">${this.escapeHTML(transaction.category)}</span>
                        <span class="transaction-date">${this.formatDate(transaction.date)}</span>
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    <span>${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}</span>
                </div>
                <div class="transaction-actions">
                    <button class="btn-action btn-edit" onclick="transactionManager.editTransaction('${transaction.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="transactionManager.deleteTransaction('${transaction.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    getTransactionIcon(transaction) {
        const icons = {
            income: {
                Salary: 'bi-briefcase',
                Freelance: 'bi-laptop',
                Investment: 'bi-graph-up',
                Gift: 'bi-gift',
                default: 'bi-currency-dollar'
            },
            expense: {
                Food: 'bi-cup-straw',
                Transportation: 'bi-car-front',
                Shopping: 'bi-bag',
                Entertainment: 'bi-controller',
                Utilities: 'bi-lightning',
                Healthcare: 'bi-heart-pulse',
                default: 'bi-cart'
            }
        };

        const categoryIcons = icons[transaction.type];
        return categoryIcons[transaction.category] || categoryIcons.default;
    }

    showEmptyState(container) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="bi bi-receipt"></i>
                </div>
                <h4>No Transactions Found</h4>
                <p>${this.filters.search || this.filters.type !== 'all' || this.filters.category !== 'all' 
                    ? 'Try adjusting your filters or search terms' 
                    : 'Get started by adding your first transaction'}</p>
                ${!this.filters.search && this.filters.type === 'all' && this.filters.category === 'all' ? `
                    <button class="btn btn-primary" onclick="transactionManager.showAddModal()">
                        <i class="bi bi-plus-lg"></i> Add Transaction
                    </button>
                ` : ''}
            </div>
        `;
    }

    attachTransactionEventListeners() {
        // Attach click events to transaction items
        document.querySelectorAll('.transaction-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.transaction-actions')) {
                    const transactionId = item.dataset.transactionId;
                    this.showTransactionDetails(transactionId);
                }
            });
        });
    }

    // Show transaction details modal
    showTransactionDetails(transactionId) {
        const transaction = window.stateManager.state.transactions.find(tx => tx.id === transactionId);
        if (!transaction) return;

        const modalHTML = `
            <div class="modal fade" id="transactionDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Transaction Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="transaction-detail-header">
                                <div class="transaction-detail-icon ${transaction.type}">
                                    <i class="bi ${this.getTransactionIcon(transaction)}"></i>
                                </div>
                                <div class="transaction-detail-main">
                                    <h4>${this.escapeHTML(transaction.desc)}</h4>
                                    <div class="transaction-detail-amount ${transaction.type}">
                                        ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="transaction-detail-info">
                                <div class="detail-row">
                                    <span class="detail-label">Category</span>
                                    <span class="detail-value">${this.escapeHTML(transaction.category)}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Date</span>
                                    <span class="detail-value">${this.formatDate(transaction.date)}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Type</span>
                                    <span class="detail-value badge ${transaction.type === 'income' ? 'bg-success' : 'bg-danger'}">
                                        ${transaction.type}
                                    </span>
                                </div>
                                ${transaction.createdAt ? `
                                <div class="detail-row">
                                    <span class="detail-label">Added</span>
                                    <span class="detail-value">${this.formatDateTime(transaction.createdAt)}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="transactionManager.editTransaction('${transaction.id}')">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('transactionDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('transactionDetailsModal'));
        modal.show();

        // Clean up modal after hide
        document.getElementById('transactionDetailsModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    }

    // Show add transaction modal
    showAddModal(initialData = {}) {
        this.currentEditId = null;
        this.showTransactionModal(initialData, 'Add Transaction');
    }

    // Show edit transaction modal
    editTransaction(transactionId) {
        const transaction = window.stateManager.state.transactions.find(tx => tx.id === transactionId);
        if (!transaction) return;

        this.currentEditId = transactionId;
        this.showTransactionModal(transaction, 'Edit Transaction');
    }

    showTransactionModal(transactionData, title) {
        const modalHTML = `
            <div class="modal fade" id="transactionModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <form id="transactionForm" autocomplete="off">
                            <div class="modal-header">
                                <h5 class="modal-title">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row g-3">
                                    <div class="col-12">
                                        <label for="transactionDescription" class="form-label">Description</label>
                                        <input type="text" class="form-control" id="transactionDescription" 
                                               value="${this.escapeHTML(transactionData.desc || '')}" required>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label for="transactionType" class="form-label">Type</label>
                                        <select class="form-select" id="transactionType" required>
                                            <option value="income" ${transactionData.type === 'income' ? 'selected' : ''}>Income</option>
                                            <option value="expense" ${transactionData.type === 'expense' ? 'selected' : ''}>Expense</option>
                                        </select>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label for="transactionAmount" class="form-label">Amount</label>
                                        <input type="number" class="form-control" id="transactionAmount" 
                                               step="0.01" min="0.01" value="${transactionData.amount || ''}" required>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label for="transactionCategory" class="form-label">Category</label>
                                        <select class="form-select" id="transactionCategory" required>
                                            <!-- Categories will be populated dynamically -->
                                        </select>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label for="transactionDate" class="form-label">Date</label>
                                        <input type="date" class="form-control" id="transactionDate" 
                                               value="${transactionData.date || new Date().toISOString().split('T')[0]}" required>
                                    </div>

                                    <div class="col-12">
                                        <div id="transactionFormAlert" class="alert alert-danger d-none"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-primary">
                                    ${this.currentEditId ? 'Update Transaction' : 'Add Transaction'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('transactionModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupTransactionModal();
        const modal = new bootstrap.Modal(document.getElementById('transactionModal'));
        modal.show();

        // Clean up modal after hide
        document.getElementById('transactionModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    }

    setupTransactionModal() {
        // Populate categories based on type
        const typeSelect = document.getElementById('transactionType');
        const categorySelect = document.getElementById('transactionCategory');
        
        const populateCategories = () => {
            const type = typeSelect.value;
            const categories = window.stateManager.state.categories.filter(cat => cat.type === type);
            
            categorySelect.innerHTML = '';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                if (this.currentEditId && category.name === window.stateManager.state.transactions.find(tx => tx.id === this.currentEditId)?.category) {
                    option.selected = true;
                }
                categorySelect.appendChild(option);
            });

            // Add option to create new category if none exist
            if (categories.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No categories - Create one first';
                option.disabled = true;
                categorySelect.appendChild(option);
            }
        };

        typeSelect.addEventListener('change', populateCategories);
        populateCategories();

        // Setup form submission
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTransaction();
        });
    }

    // Save transaction (add or update)
    saveTransaction() {
        const formData = {
            desc: document.getElementById('transactionDescription').value.trim(),
            type: document.getElementById('transactionType').value,
            amount: parseFloat(document.getElementById('transactionAmount').value),
            category: document.getElementById('transactionCategory').value,
            date: document.getElementById('transactionDate').value
        };

        // Validation
        const validation = this.validateTransaction(formData);
        if (!validation.isValid) {
            this.showFormAlert(validation.message);
            return;
        }

        if (this.currentEditId) {
            // Update existing transaction
            window.stateManager.updateTransaction(this.currentEditId, formData);
            window.showToast('Transaction updated successfully', 'success');
        } else {
            // Add new transaction
            window.stateManager.addTransaction(formData);
            window.showToast('Transaction added successfully', 'success');
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('transactionModal'));
        modal.hide();

        // Refresh transaction list
        this.renderTransactionList();
    }

    validateTransaction(data) {
        if (!data.desc || data.desc.length < 2) {
            return { isValid: false, message: 'Description must be at least 2 characters long' };
        }

        if (!data.amount || data.amount <= 0) {
            return { isValid: false, message: 'Amount must be greater than 0' };
        }

        if (!data.category) {
            return { isValid: false, message: 'Please select a category' };
        }

        if (!data.date) {
            return { isValid: false, message: 'Please select a date' };
        }

        return { isValid: true };
    }

    showFormAlert(message) {
        const alert = document.getElementById('transactionFormAlert');
        alert.textContent = message;
        alert.classList.remove('d-none');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            alert.classList.add('d-none');
        }, 5000);
    }

    // Delete transaction with confirmation
    deleteTransaction(transactionId) {
        const transaction = window.stateManager.state.transactions.find(tx => tx.id === transactionId);
        if (!transaction) return;

        window.showConfirmationModal(
            'Delete Transaction',
            `Are you sure you want to delete transaction "${transaction.desc}"?`,
            () => {
                window.stateManager.deleteTransaction(transactionId);
                window.showToast('Transaction deleted successfully', 'success');
                this.renderTransactionList();
            },
            'Delete',
            'danger'
        );
    }

    // Quick add modal for fast transaction entry
    showQuickAddModal(type) {
        const modalHTML = `
            <div class="modal fade" id="quickAddModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered modal-sm">
                    <div class="modal-content">
                        <form id="quickAddForm" autocomplete="off">
                            <div class="modal-header">
                                <h5 class="modal-title">Quick Add ${type === 'income' ? 'Income' : 'Expense'}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label for="quickAmount" class="form-label">Amount</label>
                                    <input type="number" class="form-control" id="quickAmount" step="0.01" min="0.01" required autofocus>
                                </div>
                                <div class="mb-3">
                                    <label for="quickCategory" class="form-label">Category</label>
                                    <select class="form-select" id="quickCategory" required>
                                        <!-- Categories will be populated -->
                                    </select>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-primary">Add</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('quickAddModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupQuickAddModal(type);
        const modal = new bootstrap.Modal(document.getElementById('quickAddModal'));
        modal.show();

        // Focus on amount input
        setTimeout(() => {
            document.getElementById('quickAmount')?.focus();
        }, 500);

        // Clean up modal after hide
        document.getElementById('quickAddModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    }

    setupQuickAddModal(type) {
        const categorySelect = document.getElementById('quickCategory');
        const categories = window.stateManager.state.categories.filter(cat => cat.type === type);
        
        categorySelect.innerHTML = '';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });

        // Use most used category as default
        if (categories.length > 0) {
            const mostUsed = this.getMostUsedCategory(type);
            if (mostUsed) {
                categorySelect.value = mostUsed;
            }
        }

        document.getElementById('quickAddForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveQuickTransaction(type);
        });
    }

    getMostUsedCategory(type) {
        const transactions = window.stateManager.state.transactions.filter(tx => tx.type === type);
        const categoryCount = {};
        
        transactions.forEach(tx => {
            categoryCount[tx.category] = (categoryCount[tx.category] || 0) + 1;
        });

        const mostUsed = Object.entries(categoryCount).sort(([,a], [,b]) => b - a)[0];
        return mostUsed ? mostUsed[0] : null;
    }

    saveQuickTransaction(type) {
        const amount = parseFloat(document.getElementById('quickAmount').value);
        const category = document.getElementById('quickCategory').value;

        if (!amount || amount <= 0) {
            window.showToast('Please enter a valid amount', 'error');
            return;
        }

        const transaction = {
            desc: `Quick ${type}`,
            type: type,
            amount: amount,
            category: category,
            date: new Date().toISOString().split('T')[0]
        };

        window.stateManager.addTransaction(transaction);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('quickAddModal'));
        modal.hide();
        
        window.showToast(`${type === 'income' ? 'Income' : 'Expense'} added successfully`, 'success');
        this.renderTransactionList();
    }

    // Bulk operations
    deleteMultipleTransactions(transactionIds) {
        window.showConfirmationModal(
            'Delete Multiple Transactions',
            `Are you sure you want to delete ${transactionIds.length} transactions?`,
            () => {
                transactionIds.forEach(id => {
                    window.stateManager.deleteTransaction(id);
                });
                window.showToast(`${transactionIds.length} transactions deleted successfully`, 'success');
                this.renderTransactionList();
            },
            'Delete All',
            'danger'
        );
    }

    // Import/Export
    exportTransactions(format = 'json') {
        const transactions = window.stateManager.state.transactions;
        let data, mimeType, filename;

        switch (format) {
            case 'csv':
                data = this.convertToCSV(transactions);
                mimeType = 'text/csv';
                filename = 'transactions.csv';
                break;
            case 'json':
            default:
                data = JSON.stringify(transactions, null, 2);
                mimeType = 'application/json';
                filename = 'transactions.json';
        }

        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        window.showToast(`Transactions exported as ${format.toUpperCase()}`, 'success');
    }

    convertToCSV(transactions) {
        const headers = ['Date', 'Description', 'Type', 'Category', 'Amount'];
        const rows = transactions.map(tx => [
            tx.date,
            `"${tx.desc.replace(/"/g, '""')}"`,
            tx.type,
            tx.category,
            tx.amount
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    // Utility methods
    updateSortUI() {
        document.querySelectorAll('[data-sort]').forEach(btn => {
            const field = btn.dataset.sort;
            btn.classList.remove('sort-asc', 'sort-desc');
            
            if (field === this.sortBy) {
                btn.classList.add(this.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

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

    // Get transaction statistics
    getTransactionStats(timeframe = 'month') {
        const transactions = this.getFilteredTransactions();
        const now = new Date();
        let startDate;

        switch (timeframe) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(0); // All time
        }

        const periodTransactions = transactions.filter(tx => 
            new Date(tx.date) >= startDate
        );

        const income = periodTransactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const expenses = periodTransactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);

        return {
            total: periodTransactions.length,
            income,
            expenses,
            net: income - expenses,
            averageTransaction: periodTransactions.length > 0 ? 
                (income + expenses) / periodTransactions.length : 0
        };
    }
}

// Create global transaction manager instance
window.transactionManager = new TransactionManager();
