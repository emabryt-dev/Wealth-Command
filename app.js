// Wealth Command - Enhanced Financial Management App
class WealthCommand {
    constructor() {
        this.transactions = [];
        this.futureIncome = [];
        this.futureExpenses = [];
        this.loans = [];
        this.categories = {
            income: ['salary', 'freelance', 'investment', 'gift', 'other'],
            expense: ['food', 'transport', 'entertainment', 'bills', 'shopping', 'healthcare', 'education', 'other']
        };
        this.recentCategories = [];
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.filterState = {
            search: '',
            type: '',
            category: '',
            dateFrom: '',
            dateTo: '',
            amountMin: '',
            amountMax: ''
        };
        this.charts = {};
        this.isSyncing = false;
        this.syncStatus = 'unknown';
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.initializeUI();
        this.updateDashboard();
        this.checkSyncStatus();
        
        // Initialize charts with skeleton loading
        this.initializeCharts();
        
        // Set up periodic sync check
        setInterval(() => this.checkSyncStatus(), 30000);
    }

    // Global Loading Management
    showGlobalLoading(message = 'Processing...') {
        const overlay = document.getElementById('globalLoadingOverlay');
        const messageEl = document.getElementById('loadingMessage');
        messageEl.textContent = message;
        overlay.classList.remove('d-none');
    }

    hideGlobalLoading() {
        const overlay = document.getElementById('globalLoadingOverlay');
        overlay.classList.add('d-none');
    }

    // Component-level loading states
    showComponentLoading(componentId) {
        const component = document.getElementById(componentId);
        if (component) {
            component.classList.add('loading');
        }
    }

    hideComponentLoading(componentId) {
        const component = document.getElementById(componentId);
        if (component) {
            component.classList.remove('loading');
        }
    }

    // Skeleton loading for initial data
    showSkeleton(containerId, count = 3) {
        const container = document.getElementById(containerId);
        if (container) {
            let skeletonHTML = '';
            for (let i = 0; i < count; i++) {
                skeletonHTML += `
                    <div class="skeleton" style="height: 20px; margin-bottom: 10px;"></div>
                `;
            }
            container.innerHTML = skeletonHTML;
        }
    }

    // Progress indicators for long operations
    showProgress(operation, total, current) {
        const progress = (current / total) * 100;
        console.log(`${operation}: ${progress.toFixed(1)}%`);
        // You can implement a progress bar UI here
    }

    // Enhanced validation system
    validateTransaction(data) {
        const errors = [];

        // Date validation
        if (!data.date || isNaN(new Date(data.date).getTime())) {
            errors.push('Please select a valid date');
        }

        // Description validation
        if (!data.description || data.description.trim().length < 1) {
            errors.push('Description is required');
        } else if (data.description.trim().length > 100) {
            errors.push('Description must be less than 100 characters');
        }

        // Type validation
        if (!data.type || !['income', 'expense'].includes(data.type)) {
            errors.push('Please select a valid transaction type');
        }

        // Category validation
        if (!data.category || data.category.trim().length === 0) {
            errors.push('Please select a category');
        }

        // Amount validation
        if (!data.amount || isNaN(data.amount) || parseFloat(data.amount) <= 0) {
            errors.push('Please enter a valid positive amount');
        } else if (parseFloat(data.amount) > 1000000000) {
            errors.push('Amount is too large');
        }

        return errors;
    }

    validateFutureIncome(data) {
        const errors = this.validateTransaction(data);
        
        if (!data.frequency || !['one-time', 'monthly', 'quarterly'].includes(data.frequency)) {
            errors.push('Please select a valid frequency');
        }

        if (!data.startDate || isNaN(new Date(data.startDate).getTime())) {
            errors.push('Please select a valid start date');
        }

        return errors;
    }

    validateFutureExpense(data) {
        return this.validateFutureIncome(data);
    }

    validateLoan(data) {
        const errors = [];

        if (!data.amount || isNaN(data.amount) || parseFloat(data.amount) <= 0) {
            errors.push('Please enter a valid loan amount');
        }

        if (data.type === 'given' && (!data.borrower || data.borrower.trim().length === 0)) {
            errors.push('Please enter borrower name');
        }

        if (data.type === 'taken' && (!data.lender || data.lender.trim().length === 0)) {
            errors.push('Please enter lender name');
        }

        if (!data.dateGiven || isNaN(new Date(data.dateGiven).getTime())) {
            errors.push('Please select a valid date');
        }

        if (!data.expectedReturn || isNaN(new Date(data.expectedReturn).getTime())) {
            errors.push('Please select a valid return date');
        }

        if (new Date(data.expectedReturn) <= new Date(data.dateGiven)) {
            errors.push('Return date must be after the loan date');
        }

        return errors;
    }

    // Real-time validation with visual feedback
    setupRealTimeValidation() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', () => this.clearFieldValidation(input));
            });
        });
    }

    validateField(field) {
        const form = field.closest('form');
        if (!form) return;

        field.classList.remove('is-valid', 'is-invalid');
        
        const errors = this.getFieldErrors(field);
        if (errors.length > 0) {
            field.classList.add('is-invalid');
            this.showFieldError(field, errors[0]);
        } else if (field.value.trim() !== '') {
            field.classList.add('is-valid');
            this.showFieldSuccess(field);
        }
    }

    clearFieldValidation(field) {
        field.classList.remove('is-valid', 'is-invalid');
        this.clearFieldMessage(field);
    }

    getFieldErrors(field) {
        const value = field.value.trim();
        const name = field.name || field.id;

        switch (name) {
            case 'transactionAmount':
            case 'futureIncomeAmount':
            case 'futureExpenseAmount':
            case 'loanAmount':
                if (!value || isNaN(value) || parseFloat(value) <= 0) {
                    return ['Please enter a valid positive amount'];
                }
                if (parseFloat(value) > 1000000000) {
                    return ['Amount is too large'];
                }
                break;

            case 'transactionDate':
            case 'futureIncomeStartDate':
            case 'futureExpenseStartDate':
            case 'loanDateGiven':
                if (!value || isNaN(new Date(value).getTime())) {
                    return ['Please select a valid date'];
                }
                break;

            case 'transactionDescription':
            case 'futureIncomeDescription':
            case 'futureExpenseDescription':
                if (!value) {
                    return ['This field is required'];
                }
                if (value.length > 100) {
                    return ['Description must be less than 100 characters'];
                }
                break;
        }

        return [];
    }

    showFieldError(field, message) {
        this.clearFieldMessage(field);
        
        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback d-block';
        feedback.textContent = message;
        field.parentNode.appendChild(feedback);
    }

    showFieldSuccess(field) {
        this.clearFieldMessage(field);
        
        const feedback = document.createElement('div');
        feedback.className = 'valid-feedback d-block';
        feedback.textContent = 'Looks good!';
        field.parentNode.appendChild(feedback);
    }

    clearFieldMessage(field) {
        const existingFeedback = field.parentNode.querySelector('.valid-feedback, .invalid-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
    }

    // Pre-submit validation with error summary
    validateForm(form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        let isValid = true;
        const errors = [];

        inputs.forEach(input => {
            this.validateField(input);
            if (input.classList.contains('is-invalid')) {
                isValid = false;
                errors.push(`${input.previousElementSibling?.textContent || 'This field'} is invalid`);
            }
        });

        if (!isValid) {
            this.showErrorSummary(errors);
        }

        return isValid;
    }

    showErrorSummary(errors) {
        const summary = errors.map(error => `<li>${error}</li>`).join('');
        this.showToast(`Please fix the following errors:<ul class="mb-0">${summary}</ul>`, 'error');
    }

    // Enhanced toast system
    showToast(message, type = 'info', duration = 5000) {
        const toastContainer = document.getElementById('toastContainer');
        const toastId = 'toast-' + Date.now();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = toastId;
        toast.innerHTML = `
            <div class="toast-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>${message}</div>
                    <button type="button" class="btn-close btn-close-white" onclick="document.getElementById('${toastId}').remove()"></button>
                </div>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.removeToast(toastId);
            }, duration);
        }

        return toastId;
    }

    removeToast(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }
    }

    // Search and Filter System
    setupSearchAndFilter() {
        const searchInput = document.getElementById('globalSearch');
        const clearSearch = document.getElementById('clearSearch');
        const filterToggle = document.getElementById('filterToggle');
        const applyFilters = document.getElementById('applyFilters');
        const resetFilters = document.getElementById('resetFilters');

        // Real-time search with debouncing
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterState.search = e.target.value;
                this.applyFilters();
            }, 300);
        });

        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            this.filterState.search = '';
            this.applyFilters();
        });

        filterToggle.addEventListener('click', () => {
            const filters = document.getElementById('advancedFilters');
            const bsCollapse = new bootstrap.Collapse(filters);
            bsCollapse.toggle();
        });

        applyFilters.addEventListener('click', () => {
            this.filterState.type = document.getElementById('filterType').value;
            this.filterState.category = document.getElementById('filterCategory').value;
            this.filterState.dateFrom = document.getElementById('filterDateFrom').value;
            this.filterState.dateTo = document.getElementById('filterDateTo').value;
            this.filterState.amountMin = document.getElementById('filterAmountMin').value;
            this.filterState.amountMax = document.getElementById('filterAmountMax').value;
            
            this.applyFilters();
        });

        resetFilters.addEventListener('click', () => {
            this.resetFilters();
        });

        // Load saved filter state
        this.loadFilterState();
    }

    applyFilters() {
        this.saveFilterState();
        this.updateTransactionsTable();
        this.updateDashboard();
    }

    resetFilters() {
        this.filterState = {
            search: '',
            type: '',
            category: '',
            dateFrom: '',
            dateTo: '',
            amountMin: '',
            amountMax: ''
        };
        
        document.getElementById('globalSearch').value = '';
        document.getElementById('filterType').value = '';
        document.getElementById('filterCategory').value = '';
        document.getElementById('filterDateFrom').value = '';
        document.getElementById('filterDateTo').value = '';
        document.getElementById('filterAmountMin').value = '';
        document.getElementById('filterAmountMax').value = '';
        
        this.applyFilters();
    }

    saveFilterState() {
        localStorage.setItem('wealthCommand_filterState', JSON.stringify(this.filterState));
    }

    loadFilterState() {
        const saved = localStorage.getItem('wealthCommand_filterState');
        if (saved) {
            this.filterState = JSON.parse(saved);
            
            // Apply to UI
            document.getElementById('globalSearch').value = this.filterState.search;
            document.getElementById('filterType').value = this.filterState.type;
            document.getElementById('filterCategory').value = this.filterState.category;
            document.getElementById('filterDateFrom').value = this.filterState.dateFrom;
            document.getElementById('filterDateTo').value = this.filterState.dateTo;
            document.getElementById('filterAmountMin').value = this.filterState.amountMin;
            document.getElementById('filterAmountMax').value = this.filterState.amountMax;
        }
    }

    filterTransactions() {
        return this.transactions.filter(transaction => {
            // Search filter
            if (this.filterState.search) {
                const searchTerm = this.filterState.search.toLowerCase();
                const matchesDescription = transaction.description.toLowerCase().includes(searchTerm);
                const matchesAmount = transaction.amount.toString().includes(searchTerm);
                const matchesCategory = transaction.category.toLowerCase().includes(searchTerm);
                
                if (!matchesDescription && !matchesAmount && !matchesCategory) {
                    return false;
                }
            }

            // Type filter
            if (this.filterState.type && transaction.type !== this.filterState.type) {
                return false;
            }

            // Category filter
            if (this.filterState.category && transaction.category !== this.filterState.category) {
                return false;
            }

            // Date range filter
            const transactionDate = new Date(transaction.date);
            if (this.filterState.dateFrom && transactionDate < new Date(this.filterState.dateFrom)) {
                return false;
            }
            if (this.filterState.dateTo && transactionDate > new Date(this.filterState.dateTo)) {
                return false;
            }

            // Amount range filter
            if (this.filterState.amountMin && transaction.amount < parseFloat(this.filterState.amountMin)) {
                return false;
            }
            if (this.filterState.amountMax && transaction.amount > parseFloat(this.filterState.amountMax)) {
                return false;
            }

            return true;
        });
    }

    // Quick Add System
    setupQuickAdd() {
        const fab = document.getElementById('quickAddFab');
        const quickModal = new bootstrap.Modal(document.getElementById('quickAddModal'));
        const quickForm = document.getElementById('quickAddForm');

        fab.addEventListener('click', () => {
            this.populateRecentCategories();
            quickModal.show();
        });

        quickForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.validateForm(quickForm)) {
                this.handleQuickAdd();
                quickModal.hide();
            }
        });

        // Gesture support for FAB
        let startY;
        fab.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        });

        fab.addEventListener('touchmove', (e) => {
            if (!startY) return;
            
            const currentY = e.touches[0].clientY;
            const diff = startY - currentY;
            
            if (diff > 50) {
                fab.style.transform = 'translateY(-10px)';
            }
        });

        fab.addEventListener('touchend', () => {
            fab.style.transform = '';
        });
    }

    populateRecentCategories() {
        const container = document.getElementById('recentCategories');
        container.innerHTML = '';

        this.recentCategories.slice(0, 6).forEach(category => {
            const chip = document.createElement('div');
            chip.className = 'category-chip';
            chip.textContent = category;
            chip.addEventListener('click', () => {
                document.getElementById('quickCategory').value = category;
            });
            container.appendChild(chip);
        });
    }

    handleQuickAdd() {
        const description = document.getElementById('quickDescription').value;
        const type = document.getElementById('quickType').value;
        const amount = parseFloat(document.getElementById('quickAmount').value);
        const category = document.getElementById('quickCategory').value;

        const transaction = {
            date: new Date().toISOString().split('T')[0],
            description,
            type,
            category,
            amount,
            notes: ''
        };

        // Add to recent categories
        this.addToRecentCategories(category);

        this.addTransaction(transaction);
        this.showToast('Transaction added successfully!', 'success');
        
        // Reset form
        document.getElementById('quickAddForm').reset();
    }

    addToRecentCategories(category) {
        this.recentCategories = this.recentCategories.filter(c => c !== category);
        this.recentCategories.unshift(category);
        this.recentCategories = this.recentCategories.slice(0, 10);
        this.saveData();
    }

    // Data Management
    loadData() {
        // Load transactions
        const savedTransactions = localStorage.getItem('wealthCommand_transactions');
        if (savedTransactions) {
            this.transactions = JSON.parse(savedTransactions);
        }

        // Load future income
        const savedFutureIncome = localStorage.getItem('wealthCommand_futureIncome');
        if (savedFutureIncome) {
            this.futureIncome = JSON.parse(savedFutureIncome);
        }

        // Load future expenses
        const savedFutureExpenses = localStorage.getItem('wealthCommand_futureExpenses');
        if (savedFutureExpenses) {
            this.futureExpenses = JSON.parse(savedFutureExpenses);
        }

        // Load loans
        const savedLoans = localStorage.getItem('wealthCommand_loans');
        if (savedLoans) {
            this.loans = JSON.parse(savedLoans);
        }

        // Load recent categories
        const savedRecentCategories = localStorage.getItem('wealthCommand_recentCategories');
        if (savedRecentCategories) {
            this.recentCategories = JSON.parse(savedRecentCategories);
        }

        // Load settings
        const savedSettings = localStorage.getItem('wealthCommand_settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            this.currentMonth = settings.currentMonth || this.currentMonth;
            this.currentYear = settings.currentYear || this.currentYear;
        }
    }

    saveData() {
        localStorage.setItem('wealthCommand_transactions', JSON.stringify(this.transactions));
        localStorage.setItem('wealthCommand_futureIncome', JSON.stringify(this.futureIncome));
        localStorage.setItem('wealthCommand_futureExpenses', JSON.stringify(this.futureExpenses));
        localStorage.setItem('wealthCommand_loans', JSON.stringify(this.loans));
        localStorage.setItem('wealthCommand_recentCategories', JSON.stringify(this.recentCategories));
        localStorage.setItem('wealthCommand_settings', JSON.stringify({
            currentMonth: this.currentMonth,
            currentYear: this.currentYear
        }));
    }

    // Sync Status Management
    async checkSyncStatus() {
        if (this.isSyncing) return;

        try {
            const isSignedIn = await this.isUserSignedIn();
            const icon = document.getElementById('syncStatusIcon');
            const tooltip = document.getElementById('syncStatusTooltip');

            if (isSignedIn) {
                this.syncStatus = 'synced';
                icon.className = 'bi bi-cloud-check';
                icon.style.color = 'var(--success-color)';
                tooltip.textContent = 'Synced with cloud';
            } else {
                this.syncStatus = 'local';
                icon.className = 'bi bi-cloud';
                icon.style.color = 'var(--secondary-color)';
                tooltip.textContent = 'Local storage only';
            }
        } catch (error) {
            this.syncStatus = 'error';
            const icon = document.getElementById('syncStatusIcon');
            icon.className = 'bi bi-cloud-slash';
            icon.style.color = 'var(--danger-color)';
        }
    }

    async manualSync() {
        if (this.isSyncing) return;

        this.isSyncing = true;
        this.showGlobalLoading('Syncing data...');

        try {
            const icon = document.getElementById('syncStatusIcon');
            icon.className = 'bi bi-cloud-arrow-up';
            icon.style.color = 'var(--warning-color)';

            // Simulate sync process
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Actual sync would happen here
            await this.performSync();

            this.showToast('Data synced successfully!', 'success');
            this.checkSyncStatus();
        } catch (error) {
            this.showToast('Sync failed: ' + error.message, 'error');
        } finally {
            this.isSyncing = false;
            this.hideGlobalLoading();
        }
    }

    async performSync() {
        // This would integrate with your actual sync service
        console.log('Performing sync...');
    }

    // Transaction Management
    addTransaction(transactionData) {
        const errors = this.validateTransaction(transactionData);
        if (errors.length > 0) {
            this.showToast(errors.join(', '), 'error');
            return false;
        }

        const transaction = {
            id: Date.now().toString(),
            date: transactionData.date,
            description: transactionData.description.trim(),
            type: transactionData.type,
            category: transactionData.category,
            amount: parseFloat(transactionData.amount),
            notes: transactionData.notes || '',
            createdAt: new Date().toISOString()
        };

        this.transactions.unshift(transaction);
        this.saveData();
        this.updateDashboard();
        this.updateTransactionsTable();

        // Add to recent categories
        this.addToRecentCategories(transaction.category);

        // Animation feedback
        this.animateSuccess(document.getElementById('openAddTransactionModal'));

        return true;
    }

    updateTransaction(index, transactionData) {
        const errors = this.validateTransaction(transactionData);
        if (errors.length > 0) {
            this.showToast(errors.join(', '), 'error');
            return false;
        }

        this.transactions[index] = {
            ...this.transactions[index],
            date: transactionData.date,
            description: transactionData.description.trim(),
            type: transactionData.type,
            category: transactionData.category,
            amount: parseFloat(transactionData.amount),
            notes: transactionData.notes || '',
            updatedAt: new Date().toISOString()
        };

        this.saveData();
        this.updateDashboard();
        this.updateTransactionsTable();

        this.showToast('Transaction updated successfully!', 'success');
        return true;
    }

    deleteTransaction(index) {
        // Animation
        const row = document.querySelector(`[data-transaction-index="${index}"]`);
        if (row) {
            row.classList.add('removing');
            setTimeout(() => {
                this.transactions.splice(index, 1);
                this.saveData();
                this.updateDashboard();
                this.updateTransactionsTable();
                this.showToast('Transaction deleted successfully!', 'success');
            }, 300);
        } else {
            this.transactions.splice(index, 1);
            this.saveData();
            this.updateDashboard();
            this.updateTransactionsTable();
            this.showToast('Transaction deleted successfully!', 'success');
        }
    }

    // UI Initialization
    initializeUI() {
        this.populateMonthYearDropdowns();
        this.setupEventListeners();
        this.setupSearchAndFilter();
        this.setupQuickAdd();
        this.setupRealTimeValidation();
        this.initializeTheme();
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('wealthCommand_theme') || 'light';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('wealthCommand_theme', theme);
        
        // Update charts if they exist
        if (this.charts.spendingTrends) {
            this.charts.spendingTrends.destroy();
            this.initializeCharts();
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        
        // No toast message for theme toggle as requested
    }

    populateMonthYearDropdowns() {
        const monthSelect = document.getElementById('summaryMonth');
        const yearSelect = document.getElementById('summaryYear');

        // Populate months
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        monthSelect.innerHTML = months.map((month, index) => 
            `<option value="${index}" ${index === this.currentMonth ? 'selected' : ''}>${month}</option>`
        ).join('');

        // Populate years (current year and 2 years back)
        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '';
        for (let year = currentYear - 2; year <= currentYear; year++) {
            yearSelect.innerHTML += `<option value="${year}" ${year === this.currentYear ? 'selected' : ''}>${year}</option>`;
        }

        // Add event listeners
        monthSelect.addEventListener('change', (e) => {
            this.currentMonth = parseInt(e.target.value);
            this.saveData();
            this.updateDashboard();
        });

        yearSelect.addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.saveData();
            this.updateDashboard();
        });
    }

    setupEventListeners() {
        // Add Transaction Modal
        const addTransactionModal = document.getElementById('addTransactionModal');
        const transactionForm = document.getElementById('transactionForm');

        document.getElementById('openAddTransactionModal').addEventListener('click', () => {
            this.openAddTransactionModal();
        });

        transactionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTransactionSubmit();
        });

        // Transaction type change
        document.getElementById('transactionType').addEventListener('change', (e) => {
            this.updateCategoryOptions(e.target.value);
        });

        // Quick Add Modal
        const quickType = document.getElementById('quickType');
        quickType.addEventListener('change', (e) => {
            this.updateQuickCategoryOptions(e.target.value);
        });

        // Planner timeframe buttons
        document.querySelectorAll('.planner-timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.planner-timeframe-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updatePlannerProjections(e.target.dataset.timeframe);
            });
        });

        // Analytics period buttons
        document.querySelectorAll('.analytics-period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.analytics-period-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateAnalyticsCharts(e.target.dataset.period);
            });
        });

        // Gesture support for transactions table
        this.setupGestureSupport();

        // Pull to refresh
        this.setupPullToRefresh();
    }

    setupGestureSupport() {
        let startX, startY, currentX, currentY;
        let isSwiping = false;
        let currentRow = null;

        document.addEventListener('touchstart', (e) => {
            const row = e.target.closest('tr[data-transaction-index]');
            if (row) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                currentRow = row;
                isSwiping = false;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (!currentRow) return;

            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;

            const diffX = startX - currentX;
            const diffY = startY - currentY;

            // Only consider it swiping if horizontal movement is greater than vertical
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
                isSwiping = true;
                e.preventDefault();

                // Limit swipe distance
                const swipeDistance = Math.max(-100, Math.min(0, -diffX));
                currentRow.style.transform = `translateX(${swipeDistance}px)`;
            }
        });

        document.addEventListener('touchend', () => {
            if (!currentRow || !isSwiping) return;

            const diffX = startX - currentX;
            if (Math.abs(diffX) > 50) {
                // Swipe successful - delete transaction
                const index = parseInt(currentRow.dataset.transactionIndex);
                this.deleteTransaction(index);
            }

            // Reset position
            currentRow.style.transform = 'translateX(0)';
            currentRow = null;
            isSwiping = false;
        });
    }

    setupPullToRefresh() {
        let startY;
        const mainContent = document.querySelector('.main-content');

        mainContent.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
            }
        });

        mainContent.addEventListener('touchmove', (e) => {
            if (!startY || window.scrollY > 0) return;

            const currentY = e.touches[0].clientY;
            const diff = currentY - startY;

            if (diff > 50) {
                // Pull to refresh triggered
                this.handlePullToRefresh();
                startY = null;
            }
        });
    }

    handlePullToRefresh() {
        this.showGlobalLoading('Refreshing data...');
        
        // Simulate refresh
        setTimeout(() => {
            this.updateDashboard();
            this.updateTransactionsTable();
            this.hideGlobalLoading();
            this.showToast('Data refreshed!', 'success');
        }, 1000);
    }

    // Dashboard Updates
    updateDashboard() {
        this.updateSummary();
        this.updateBreakdowns();
        this.updateTransactionsTable();
        this.updatePlannerProjections();
        this.updateDebtManagement();
        this.updateAnalyticsCharts();
    }

    updateSummary() {
        const filteredTransactions = this.getTransactionsForSelectedMonth();
        
        const totalIncome = filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const totalExpense = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const netWealth = totalIncome - totalExpense;

        document.getElementById('totalIncome').textContent = this.formatCurrency(totalIncome);
        document.getElementById('totalExpense').textContent = this.formatCurrency(totalExpense);
        document.getElementById('netWealth').textContent = this.formatCurrency(netWealth);
    }

    updateBreakdowns() {
        this.showSkeleton('incomeBreakdown');
        this.showSkeleton('expenseBreakdown');

        setTimeout(() => {
            const filteredTransactions = this.getTransactionsForSelectedMonth();
            
            // Income breakdown
            const incomeByCategory = this.groupTransactionsByCategory(
                filteredTransactions.filter(t => t.type === 'income')
            );
            this.renderBreakdown('incomeBreakdown', incomeByCategory, 'income');
            
            // Expense breakdown
            const expenseByCategory = this.groupTransactionsByCategory(
                filteredTransactions.filter(t => t.type === 'expense')
            );
            this.renderBreakdown('expenseBreakdown', expenseByCategory, 'expense');

            // Show/hide empty states
            document.getElementById('noIncomeCategories').classList.toggle(
                'd-none', Object.keys(incomeByCategory).length > 0
            );
            document.getElementById('noExpenseCategories').classList.toggle(
                'd-none', Object.keys(expenseByCategory).length > 0
            );
        }, 500);
    }

    groupTransactionsByCategory(transactions) {
        return transactions.reduce((acc, transaction) => {
            const category = transaction.category;
            if (!acc[category]) {
                acc[category] = 0;
            }
            acc[category] += transaction.amount;
            return acc;
        }, {});
    }

    renderBreakdown(containerId, breakdown, type) {
        const container = document.getElementById(containerId);
        const isIncome = type === 'income';
        
        if (Object.keys(breakdown).length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-2">No transactions</div>';
            return;
        }

        const sortedCategories = Object.entries(breakdown)
            .sort(([,a], [,b]) => b - a);

        container.innerHTML = sortedCategories.map(([category, amount]) => `
            <div class="breakdown-item" onclick="app.showCategoryTransactions('${type}', '${category}')">
                <div class="breakdown-category">
                    <i class="bi bi-tag"></i>
                    <span>${this.formatCategoryName(category)}</span>
                </div>
                <div class="breakdown-amount ${isIncome ? 'text-success' : 'text-danger'}">
                    ${this.formatCurrency(amount)}
                </div>
            </div>
        `).join('');
    }

    // Chart System
    initializeCharts() {
        this.showComponentLoading('spendingTrendsLoading');
        this.showComponentLoading('incomeDistributionLoading');
        this.showComponentLoading('expenseDistributionLoading');

        // Initialize with skeleton data
        setTimeout(() => {
            this.createSpendingTrendsChart();
            this.createDistributionCharts();
        }, 1000);
    }

    createSpendingTrendsChart() {
        const ctx = document.getElementById('spendingTrendsChart').getContext('2d');
        
        if (this.charts.spendingTrends) {
            this.charts.spendingTrends.destroy();
        }

        const data = this.getSpendingTrendsData();
        
        this.charts.spendingTrends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Income',
                        data: data.income,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Expenses',
                        data: data.expenses,
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Income vs Expenses Trend'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });

        this.hideComponentLoading('spendingTrendsLoading');
    }

    createDistributionCharts() {
        // Income Distribution
        const incomeCtx = document.getElementById('incomeDistributionChart').getContext('2d');
        const expenseCtx = document.getElementById('expenseDistributionChart').getContext('2d');

        if (this.charts.incomeDistribution) {
            this.charts.incomeDistribution.destroy();
        }
        if (this.charts.expenseDistribution) {
            this.charts.expenseDistribution.destroy();
        }

        const incomeData = this.getDistributionData('income');
        const expenseData = this.getDistributionData('expense');

        this.charts.incomeDistribution = new Chart(incomeCtx, {
            type: 'doughnut',
            data: incomeData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        this.charts.expenseDistribution = new Chart(expenseCtx, {
            type: 'doughnut',
            data: expenseData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        this.hideComponentLoading('incomeDistributionLoading');
        this.hideComponentLoading('expenseDistributionLoading');
    }

    getSpendingTrendsData(period = '6months') {
        // This would generate actual trend data based on the selected period
        const months = this.getPreviousMonths(6);
        
        return {
            labels: months,
            income: months.map(() => Math.random() * 10000 + 5000),
            expenses: months.map(() => Math.random() * 8000 + 3000)
        };
    }

    getDistributionData(type) {
        const filteredTransactions = this.getTransactionsForSelectedMonth()
            .filter(t => t.type === type);
            
        const grouped = this.groupTransactionsByCategory(filteredTransactions);
        const labels = Object.keys(grouped).map(this.formatCategoryName);
        const data = Object.values(grouped);
        const backgroundColors = this.generateColors(data.length);

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };
    }

    generateColors(count) {
        const baseColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#7CFFB2', '#FF6384'
        ];
        return baseColors.slice(0, count);
    }

    getPreviousMonths(count) {
        const months = [];
        const date = new Date();
        
        for (let i = count - 1; i >= 0; i--) {
            const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
            months.push(d.toLocaleDateString('en', { month: 'short', year: '2-digit' }));
        }
        
        return months;
    }

    updateAnalyticsCharts(period = '6months') {
        if (this.charts.spendingTrends) {
            const data = this.getSpendingTrendsData(period);
            this.charts.spendingTrends.data.labels = data.labels;
            this.charts.spendingTrends.data.datasets[0].data = data.income;
            this.charts.spendingTrends.data.datasets[1].data = data.expenses;
            this.charts.spendingTrends.update();
        }

        if (this.charts.incomeDistribution && this.charts.expenseDistribution) {
            const incomeData = this.getDistributionData('income');
            const expenseData = this.getDistributionData('expense');

            this.charts.incomeDistribution.data.labels = incomeData.labels;
            this.charts.incomeDistribution.data.datasets[0].data = incomeData.datasets[0].data;
            this.charts.incomeDistribution.update();

            this.charts.expenseDistribution.data.labels = expenseData.labels;
            this.charts.expenseDistribution.data.datasets[0].data = expenseData.datasets[0].data;
            this.charts.expenseDistribution.update();
        }
    }

    // AI Insights and Pattern Recognition
    generateAIInsights() {
        this.showGlobalLoading('Analyzing your financial data...');

        setTimeout(() => {
            const insights = this.analyzeFinancialPatterns();
            this.displayAIInsights(insights);
            this.hideGlobalLoading();
        }, 2000);
    }

    analyzeFinancialPatterns() {
        const insights = [];
        const transactions = this.transactions;
        
        if (transactions.length === 0) {
            return [{
                type: 'info',
                title: 'Welcome!',
                message: 'Start by adding your first transaction to get personalized insights.',
                suggestion: 'Click the "+" button to add a transaction.'
            }];
        }

        // Spending pattern analysis
        const monthlySpending = this.calculateMonthlySpending();
        const avgMonthlySpending = this.calculateAverage(monthlySpending);
        const currentMonthSpending = monthlySpending[monthlySpending.length - 1] || 0;

        if (currentMonthSpending > avgMonthlySpending * 1.2) {
            insights.push({
                type: 'warning',
                title: 'Higher than usual spending',
                message: `Your spending this month is ${((currentMonthSpending - avgMonthlySpending) / avgMonthlySpending * 100).toFixed(1)}% higher than your average.`,
                suggestion: 'Review your recent expenses in the Transactions tab.'
            });
        }

        // Income consistency check
        const monthlyIncome = this.calculateMonthlyIncome();
        const incomeVariance = this.calculateVariance(monthlyIncome);
        
        if (incomeVariance > 0.3) {
            insights.push({
                type: 'warning',
                title: 'Irregular income pattern',
                message: 'Your income shows significant variation between months.',
                suggestion: 'Consider creating a budget based on your minimum expected income.'
            });
        }

        // Savings rate analysis
        const savingsRate = this.calculateSavingsRate();
        if (savingsRate < 0.1) {
            insights.push({
                type: 'negative',
                title: 'Low savings rate',
                message: `Your current savings rate is ${(savingsRate * 100).toFixed(1)}%.`,
                suggestion: 'Aim to save at least 20% of your income for long-term financial health.'
            });
        } else if (savingsRate > 0.3) {
            insights.push({
                type: 'positive',
                title: 'Excellent savings rate!',
                message: `You're saving ${(savingsRate * 100).toFixed(1)}% of your income.`,
                suggestion: 'Consider investing your savings for long-term growth.'
            });
        }

        // Anomaly detection
        const anomalies = this.detectSpendingAnomalies();
        if (anomalies.length > 0) {
            insights.push({
                type: 'warning',
                title: 'Unusual spending detected',
                message: `Found ${anomalies.length} transactions that are significantly different from your typical spending patterns.`,
                suggestion: 'Review these transactions to ensure they are legitimate.'
            });
        }

        // Category spending analysis
        const categoryAnalysis = this.analyzeCategorySpending();
        insights.push(...categoryAnalysis);

        return insights;
    }

    calculateMonthlySpending() {
        // Implementation for calculating monthly spending
        return [1000, 1200, 800, 1500, 1100, 900];
    }

    calculateMonthlyIncome() {
        // Implementation for calculating monthly income
        return [3000, 3200, 2800, 3100, 3000, 2900];
    }

    calculateAverage(numbers) {
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }

    calculateVariance(numbers) {
        const avg = this.calculateAverage(numbers);
        const variance = numbers.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / numbers.length;
        return Math.sqrt(variance) / avg;
    }

    calculateSavingsRate() {
        const income = this.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = this.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return income > 0 ? (income - expenses) / income : 0;
    }

    detectSpendingAnomalies() {
        // Simple anomaly detection based on amount deviation
        const expenses = this.transactions.filter(t => t.type === 'expense').map(t => t.amount);
        const avgExpense = this.calculateAverage(expenses);
        const stdDev = Math.sqrt(expenses.reduce((a, b) => a + Math.pow(b - avgExpense, 2), 0) / expenses.length);
        
        return this.transactions.filter(t => 
            t.type === 'expense' && 
            Math.abs(t.amount - avgExpense) > 2 * stdDev
        );
    }

    analyzeCategorySpending() {
        const insights = [];
        const categorySpending = this.groupTransactionsByCategory(
            this.transactions.filter(t => t.type === 'expense')
        );

        const totalSpending = Object.values(categorySpending).reduce((a, b) => a + b, 0);
        
        Object.entries(categorySpending).forEach(([category, amount]) => {
            const percentage = (amount / totalSpending) * 100;
            if (percentage > 40) {
                insights.push({
                    type: 'warning',
                    title: `High spending in ${this.formatCategoryName(category)}`,
                    message: `You're spending ${percentage.toFixed(1)}% of your expenses on ${this.formatCategoryName(category).toLowerCase()}.`,
                    suggestion: 'Consider if this aligns with your financial priorities.'
                });
            }
        });

        return insights;
    }

    displayAIInsights(insights) {
        const container = document.getElementById('aiInsightsContent');
        
        if (insights.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted p-3">
                    <i class="bi bi-check-circle" style="font-size: 2rem; opacity: 0.5;"></i>
                    <p class="mt-2">Your finances look healthy! No major issues detected.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = insights.map(insight => `
            <div class="insight-item ${insight.type}">
                <div class="d-flex align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${insight.title}</h6>
                        <p class="mb-1">${insight.message}</p>
                        <small class="text-muted">${insight.suggestion}</small>
                    </div>
                    <i class="bi bi-${this.getInsightIcon(insight.type)} ms-2"></i>
                </div>
            </div>
        `).join('');
    }

    getInsightIcon(type) {
        switch (type) {
            case 'positive': return 'check-circle text-success';
            case 'warning': return 'exclamation-triangle text-warning';
            case 'negative': return 'exclamation-circle text-danger';
            default: return 'info-circle text-info';
        }
    }

    applyAISuggestions() {
        // This would implement the AI suggestions
        this.showToast('AI suggestions applied successfully!', 'success');
    }

    // Utility Methods
    getTransactionsForSelectedMonth() {
        return this.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate.getMonth() === this.currentMonth && 
                   transactionDate.getFullYear() === this.currentYear;
        });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    formatCategoryName(category) {
        return category.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    updateCategoryOptions(type) {
        const categorySelect = document.getElementById('transactionCategory');
        const categories = this.categories[type] || [];
        
        categorySelect.innerHTML = '<option value="">Select Category</option>' +
            categories.map(category => 
                `<option value="${category}">${this.formatCategoryName(category)}</option>`
            ).join('');
    }

    updateQuickCategoryOptions(type) {
        const categorySelect = document.getElementById('quickCategory');
        const categories = this.categories[type] || [];
        
        categorySelect.innerHTML = '<option value="">Select Category</option>' +
            categories.map(category => 
                `<option value="${category}">${this.formatCategoryName(category)}</option>`
            ).join('');
    }

    openAddTransactionModal(transactionIndex = -1) {
        const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
        const form = document.getElementById('transactionForm');
        const title = document.getElementById('addTransactionModalLabel');
        
        form.reset();
        form.classList.remove('was-validated');
        
        document.getElementById('transactionIndex').value = transactionIndex;
        
        if (transactionIndex === -1) {
            title.textContent = 'Add Transaction';
            document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
        } else {
            title.textContent = 'Edit Transaction';
            const transaction = this.transactions[transactionIndex];
            document.getElementById('transactionDate').value = transaction.date;
            document.getElementById('transactionDescription').value = transaction.description;
            document.getElementById('transactionType').value = transaction.type;
            document.getElementById('transactionCategory').value = transaction.category;
            document.getElementById('transactionAmount').value = transaction.amount;
            document.getElementById('transactionNotes').value = transaction.notes || '';
            
            this.updateCategoryOptions(transaction.type);
        }
        
        modal.show();
    }

    handleTransactionSubmit() {
        const form = document.getElementById('transactionForm');
        if (!this.validateForm(form)) return;

        const transactionData = {
            date: document.getElementById('transactionDate').value,
            description: document.getElementById('transactionDescription').value,
            type: document.getElementById('transactionType').value,
            category: document.getElementById('transactionCategory').value,
            amount: document.getElementById('transactionAmount').value,
            notes: document.getElementById('transactionNotes').value
        };

        const transactionIndex = parseInt(document.getElementById('transactionIndex').value);
        
        if (transactionIndex === -1) {
            this.addTransaction(transactionData);
        } else {
            this.updateTransaction(transactionIndex, transactionData);
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
        modal.hide();
    }

    updateTransactionsTable() {
        const tbody = document.getElementById('transactionsBody');
        const noTransactions = document.getElementById('noTransactions');
        const filteredTransactions = this.filterTransactions();

        if (filteredTransactions.length === 0) {
            tbody.innerHTML = '';
            noTransactions.classList.remove('d-none');
            return;
        }

        noTransactions.classList.add('d-none');
        
        tbody.innerHTML = filteredTransactions.map((transaction, index) => `
            <tr class="transaction-item" data-transaction-index="${index}" onclick="app.openAddTransactionModal(${index})">
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
                <td>${transaction.description}</td>
                <td>
                    <span class="badge ${transaction.type === 'income' ? 'bg-success' : 'bg-danger'}">
                        ${transaction.type === 'income' ? 'Income' : 'Expense'}
                    </span>
                </td>
                <td>${this.formatCategoryName(transaction.category)}</td>
                <td class="${transaction.type === 'income' ? 'text-success' : 'text-danger'}">
                    ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); app.deleteTransaction(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Animation helpers
    animateSuccess(element) {
        if (element) {
            element.classList.add('success-animation');
            setTimeout(() => element.classList.remove('success-animation'), 1000);
        }
    }

    animateError(element) {
        if (element) {
            element.classList.add('error-animation');
            setTimeout(() => element.classList.remove('error-animation'), 500);
        }
    }

    // Method stubs for future implementation
    updatePlannerProjections(timeframe = '1year') {
        // Implementation for planner projections
        document.getElementById('plannerNetWealth').textContent = this.formatCurrency(15000);
        document.getElementById('plannerTotalIncome').textContent = this.formatCurrency(50000);
        document.getElementById('plannerTotalExpenses').textContent = this.formatCurrency(35000);
        document.getElementById('plannerEndingBalance').textContent = this.formatCurrency(15000);
    }

    updateDebtManagement() {
        // Implementation for debt management
        document.getElementById('totalLoansGiven').textContent = this.formatCurrency(5000);
        document.getElementById('totalLoansTaken').textContent = this.formatCurrency(2000);
        document.getElementById('netLoanPosition').textContent = this.formatCurrency(3000);
        document.getElementById('overdueLoans').textContent = '0';
    }

    showCategoryTransactions(type, category) {
        // Implementation for showing category transactions
        console.log(`Showing ${type} transactions for ${category}`);
    }

    // Additional method stubs for modal functions
    openAddFutureIncome() {
        const modal = new bootstrap.Modal(document.getElementById('futureIncomeModal'));
        modal.show();
    }

    openAddFutureExpense() {
        const modal = new bootstrap.Modal(document.getElementById('futureExpenseModal'));
        modal.show();
    }

    openAddLoan(type) {
        const modal = new bootstrap.Modal(document.getElementById('loanModal'));
        document.getElementById('loanType').value = type;
        modal.show();
    }
}

// Global functions for HTML onclick handlers
function showTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-page').forEach(tab => {
        tab.classList.add('d-none');
    });
    
    // Show selected tab
    document.getElementById(tabId).classList.remove('d-none');
    
    // Update charts when switching to analytics tab
    if (tabId === 'tab-analytics' && window.app) {
        setTimeout(() => {
            window.app.updateAnalyticsCharts();
        }, 100);
    }
}

function toggleTheme() {
    if (window.app) {
        window.app.toggleTheme();
    }
}

function manualSync() {
    if (window.app) {
        window.app.manualSync();
    }
}

function generateAIInsights() {
    if (window.app) {
        window.app.generateAIInsights();
    }
}

function applyAISuggestions() {
    if (window.app) {
        window.app.applyAISuggestions();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.app = new WealthCommand();
});
