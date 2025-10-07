// Wealth Command Pro - Main Application
class WealthCommandApp {
    constructor() {
        this.isInitialized = false;
        this.modules = new Map();
        this.currentView = 'dashboard';
        this.init();
    }

    async init() {
        try {
            // Show loading screen
            this.showLoadingScreen();

            // Initialize core modules
            await this.initializeCoreModules();

            // Initialize feature modules
            await this.initializeFeatureModules();

            // Initialize UI modules
            await this.initializeUIModules();

            // Load application data
            await this.loadApplicationData();

            // Set up event listeners
            this.setupEventListeners();

            // Initialize UI
            this.initializeUI();

            // Hide loading screen
            this.hideLoadingScreen();

            // Mark as initialized
            this.isInitialized = true;

            // Start background processes
            this.startBackgroundProcesses();

            console.log('Wealth Command Pro initialized successfully');
            
            // Show welcome message
            window.showToast?.('Wealth Command Pro is ready!', 'success');

        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.handleInitializationError(error);
        }
    }

    async initializeCoreModules() {
        // Initialize error handler first
        this.modules.set('errorHandler', window.errorHandler);
        
        // Initialize data persistence
        this.modules.set('dataPersistence', window.dataPersistence);
        await window.dataPersistence.init();

        // Initialize state manager
        this.modules.set('stateManager', window.stateManager);
        
        // Initialize sync engine
        this.modules.set('syncEngine', window.syncEngine);
        
        // Initialize AI engine
        this.modules.set('aiEngine', window.aiEngine);
        await window.aiEngine.initialize();
        
        // Initialize analytics engine
        this.modules.set('analyticsEngine', window.analyticsEngine);

        console.log('Core modules initialized');
    }

    async initializeFeatureModules() {
        // Initialize voice commands
        this.modules.set('voiceCommandManager', window.voiceCommandManager);
        
        // Initialize transactions manager
        this.modules.set('transactionManager', window.transactionManager);
        
        // Initialize categories manager
        this.modules.set('categoryManager', window.categoryManager);
        
        // Initialize planner
        this.modules.set('planner', window.planner);
        
        // Initialize debt manager
        this.modules.set('debtManager', window.debtManager);
        
        // Initialize notifications
        this.modules.set('notificationManager', window.notificationManager);

        console.log('Feature modules initialized');
    }

    async initializeUIModules() {
        // Initialize chart manager
        this.modules.set('chartManager', window.chartManager);
        
        // Initialize animation manager
        this.modules.set('animationManager', window.animationManager);
        window.animationManager.init();
        
        // Initialize modal manager
        this.modules.set('modalManager', window.modalManager);

        console.log('UI modules initialized');
    }

    async loadApplicationData() {
        try {
            // Load state from persistence
            const savedState = await window.dataPersistence.loadAppState();
            if (savedState) {
                window.stateManager.setState(savedState);
            }

            // Calculate initial rollover
            window.calculateMonthlyRollover?.();

            console.log('Application data loaded successfully');
        } catch (error) {
            console.error('Error loading application data:', error);
            window.errorHandler.handleError({
                type: 'DataLoadError',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    setupEventListeners() {
        // Window events
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

        // Custom events
        document.addEventListener('transactionAdded', this.handleTransactionAdded.bind(this));
        document.addEventListener('transactionUpdated', this.handleTransactionUpdated.bind(this));
        document.addEventListener('transactionDeleted', this.handleTransactionDeleted.bind(this));

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

        // Service worker for PWA
        this.setupServiceWorker();

        console.log('Event listeners set up');
    }

    handleOnline() {
        window.showToast?.('Back online. Syncing data...', 'info');
        
        // Trigger sync when coming back online
        setTimeout(() => {
            window.syncEngine?.syncData().catch(console.error);
        }, 2000);
    }

    handleOffline() {
        window.showToast?.('Working offline. Changes saved locally.', 'warning');
    }

    handleBeforeUnload(event) {
        // Auto-save before closing
        this.autoSave();
        
        // Show confirmation if there are unsaved changes
        if (this.hasUnsavedChanges()) {
            event.preventDefault();
            event.returnValue = '';
            return '';
        }
    }

    handleTransactionAdded(event) {
        const transaction = event.detail;
        
        // Update analytics
        window.analyticsEngine?.clearCache();
        
        // Trigger AI insights update
        this.updateAIInsights();
        
        // Show confirmation
        window.showToast?.(`${transaction.type} added successfully`, 'success');
    }

    handleTransactionUpdated(event) {
        const transaction = event.detail;
        
        // Update analytics
        window.analyticsEngine?.clearCache();
        
        // Show confirmation
        window.showToast?.('Transaction updated successfully', 'success');
    }

    handleTransactionDeleted(event) {
        const transaction = event.detail;
        
        // Update analytics
        window.analyticsEngine?.clearCache();
        
        // Show confirmation
        window.showToast?.('Transaction deleted successfully', 'success');
    }

    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + N: New transaction
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            this.quickAddTransaction();
        }

        // Ctrl/Cmd + /: Voice commands
        if ((event.ctrlKey || event.metaKey) && event.key === '/') {
            event.preventDefault();
            window.voiceCommandManager?.showInterface();
        }

        // Ctrl/Cmd + K: Search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            this.focusSearch();
        }

        // Escape: Close modals
        if (event.key === 'Escape') {
            this.closeAllModals();
        }
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                    this.modules.set('serviceWorker', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        }
    }

    initializeUI() {
        // Initialize tabs
        this.initializeTabs();

        // Initialize charts
        this.initializeCharts();

        // Initialize modals
        this.initializeModals();

        // Apply theme
        this.applyTheme();

        // Initialize FAB
        this.initializeFAB();

        console.log('UI initialized');
    }

    initializeTabs() {
        const tabButtons = document.querySelectorAll('[data-tab]');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.showTab(tabName);
            });
        });

        // Show initial tab
        this.showTab('dashboard');
    }

    showTab(tabName) {
        // Hide all tab pages
        document.querySelectorAll('.tab-page').forEach(page => {
            page.classList.remove('active');
        });

        // Show selected tab page
        const targetPage = document.getElementById(`tab-${tabName}`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update active tab button
        document.querySelectorAll('[data-tab]').forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });

        // Update URL hash
        window.location.hash = tabName;

        // Tab-specific initialization
        this.initializeTabContent(tabName);

        console.log(`Switched to tab: ${tabName}`);
    }

    initializeTabContent(tabName) {
        switch (tabName) {
            case 'dashboard':
                this.initializeDashboard();
                break;
            case 'transactions':
                this.initializeTransactions();
                break;
            case 'planner':
                this.initializePlanner();
                break;
            case 'debt':
                this.initializeDebt();
                break;
            case 'analytics':
                this.initializeAnalytics();
                break;
            case 'settings':
                this.initializeSettings();
                break;
        }
    }

    initializeDashboard() {
        // Update summary cards
        this.updateSummaryCards();

        // Update breakdowns
        this.updateBreakdowns();

        // Update charts
        this.updateDashboardCharts();
    }

    initializeTransactions() {
        // Render transactions table
        this.renderTransactionsTable();

        // Initialize filters
        this.initializeTransactionFilters();
    }

    initializePlanner() {
        // Render projections
        this.renderPlannerProjections();

        // Render future transactions
        this.renderFutureTransactions();
    }

    initializeDebt() {
        // Render debt summary
        this.renderDebtSummary();

        // Render loans
        this.renderLoans();
    }

    initializeAnalytics() {
        // Render analytics charts
        this.renderAnalyticsCharts();

        // Update AI insights
        this.updateAIInsights();
    }

    initializeSettings() {
        // Load settings
        this.loadSettings();

        // Initialize category management
        this.initializeCategoryManagement();
    }

    initializeCharts() {
        // Initialize any charts that are already in the DOM
        window.chartManager?.initializeCharts();
    }

    initializeModals() {
        // Initialize Bootstrap modals
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            new bootstrap.Modal(modal);
        });
    }

    applyTheme() {
        const theme = window.stateManager?.state.theme || 'light';
        document.body.classList.toggle('dark-mode', theme === 'dark');
    }

    initializeFAB() {
        const fab = document.getElementById('mainFAB');
        const fabMenu = document.getElementById('fabMenu');

        if (fab && fabMenu) {
            fab.addEventListener('click', () => {
                this.toggleFABMenu(fab, fabMenu);
            });

            // Close FAB menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!fab.contains(e.target) && !fabMenu.contains(e.target)) {
                    fabMenu.classList.remove('open');
                    fab.classList.remove('open');
                }
            });
        }
    }

    toggleFABMenu(fab, fabMenu) {
        const isOpen = fabMenu.classList.contains('open');
        
        if (isOpen) {
            fabMenu.classList.remove('open');
            fab.classList.remove('open');
            window.animationManager?.animateFABClose(fab, fabMenu);
        } else {
            fabMenu.classList.add('open');
            fab.classList.add('open');
            window.animationManager?.animateFABOpen(fab, fabMenu);
        }
    }

    // Background Processes
    startBackgroundProcesses() {
        // Auto-save every 30 seconds
        this.autoSaveInterval = setInterval(() => {
            this.autoSave();
        }, 30000);

        // Sync every 5 minutes if online
        this.syncInterval = setInterval(() => {
            if (navigator.onLine && window.syncEngine?.googleUser) {
                window.syncEngine.syncData().catch(console.error);
            }
        }, 300000);

        // Update analytics cache every hour
        this.analyticsInterval = setInterval(() => {
            window.analyticsEngine?.clearCache();
        }, 3600000);

        // Clean up old data weekly
        this.cleanupInterval = setInterval(() => {
            window.dataPersistence?.cleanupOldData();
        }, 604800000); // 7 days

        console.log('Background processes started');
    }

    // Data Management
    async autoSave() {
        if (window.stateManager && window.dataPersistence) {
            try {
                await window.dataPersistence.saveAppState(window.stateManager.state);
                
                // Set last saved timestamp
                window.stateManager.setState({
                    lastSaved: new Date().toISOString()
                });
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }
    }

    hasUnsavedChanges() {
        // Implement logic to check for unsaved changes
        return false; // Placeholder
    }

    // Public Methods
    async quickAddTransaction(type = null) {
        if (!type) {
            // Show transaction type selection
            this.showTransactionTypeModal();
        } else {
            // Show add transaction modal for specific type
            this.showAddTransactionModal(type);
        }
    }

    showTransactionTypeModal() {
        // Implementation for transaction type selection modal
        const modalHTML = `
            <div class="modal fade" id="transactionTypeModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Add Transaction</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <div class="row g-3">
                                <div class="col-6">
                                    <button class="btn btn-success btn-lg w-100 h-100 py-4" onclick="wealthCommandApp.showAddTransactionModal('income')">
                                        <i class="bi bi-arrow-down-circle fs-1"></i>
                                        <div class="mt-2">Income</div>
                                    </button>
                                </div>
                                <div class="col-6">
                                    <button class="btn btn-danger btn-lg w-100 h-100 py-4" onclick="wealthCommandApp.showAddTransactionModal('expense')">
                                        <i class="bi bi-arrow-up-circle fs-1"></i>
                                        <div class="mt-2">Expense</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to DOM if not exists
        if (!document.getElementById('transactionTypeModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('transactionTypeModal'));
        modal.show();
    }

    showAddTransactionModal(type) {
        // Implementation for add transaction modal
        // This would use the modal manager to show the appropriate form
        window.modalManager?.showAddTransactionModal(type);
    }

    focusSearch() {
        const searchInput = document.querySelector('#globalSearch input');
        if (searchInput) {
            searchInput.focus();
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        });

        // Close FAB menu
        const fabMenu = document.getElementById('fabMenu');
        const fab = document.getElementById('mainFAB');
        if (fabMenu && fab) {
            fabMenu.classList.remove('open');
            fab.classList.remove('open');
        }
    }

    // UI Update Methods
    updateSummaryCards() {
        // Update net wealth, income, expense cards
        const state = window.stateManager?.state;
        if (!state) return;

        const summary = window.stateManager.getMonthlySummary();
        
        // Update DOM elements
        const netWealthEl = document.getElementById('netWealth');
        const totalIncomeEl = document.getElementById('totalIncome');
        const totalExpenseEl = document.getElementById('totalExpense');

        if (netWealthEl) netWealthEl.textContent = this.formatCurrency(summary.endingBalance);
        if (totalIncomeEl) totalIncomeEl.textContent = this.formatCurrency(summary.income);
        if (totalExpenseEl) totalExpenseEl.textContent = this.formatCurrency(summary.expenses);
    }

    updateBreakdowns() {
        // Update income and expense breakdowns
        this.renderIncomeBreakdown();
        this.renderExpenseBreakdown();
    }

    updateDashboardCharts() {
        // Update charts on dashboard
        const transactions = window.stateManager?.state.transactions || [];
        
        // Update spending chart
        const spendingChart = document.getElementById('spendingChart');
        if (spendingChart) {
            const data = window.analyticsEngine.prepareChartData('categoryBreakdown', transactions);
            window.chartManager.createChart(spendingChart, 'doughnut', data);
        }

        // Update trend chart
        const trendChart = document.getElementById('trendChart');
        if (trendChart) {
            const data = window.analyticsEngine.prepareChartData('monthlyTrend', transactions);
            window.chartManager.createChart(trendChart, 'line', data);
        }
    }

    renderTransactionsTable() {
        // Render transactions table
        const transactions = window.stateManager?.state.transactions || [];
        const tbody = document.getElementById('transactionsBody');
        
        if (!tbody) return;

        tbody.innerHTML = '';

        if (transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="bi bi-receipt fs-1"></i>
                        <div class="mt-2">No transactions yet</div>
                        <button class="btn btn-primary mt-2" onclick="wealthCommandApp.quickAddTransaction()">
                            Add Your First Transaction
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        transactions.slice().reverse().forEach((transaction, index) => {
            const originalIndex = transactions.length - 1 - index;
            const row = this.createTransactionRow(transaction, originalIndex);
            tbody.appendChild(row);
        });
    }

    createTransactionRow(transaction, index) {
        const row = document.createElement('tr');
        row.className = 'clickable-row';
        row.onclick = () => this.editTransaction(index);

        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString('en', { 
            day: 'numeric', 
            month: 'short' 
        });

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${transaction.desc}</td>
            <td><span class="badge bg-${transaction.type === 'income' ? 'success' : 'danger'}">${transaction.type}</span></td>
            <td>${transaction.category}</td>
            <td class="fw-bold ${transaction.type === 'income' ? 'text-success' : 'text-danger'}">
                ${this.formatCurrency(transaction.amount)}
            </td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); wealthCommandApp.deleteTransaction(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;

        return row;
    }

    // Transaction Management
    async addTransaction(transactionData) {
        try {
            // Validate transaction
            const validation = window.errorHandler.validateTransaction(transactionData);
            if (!validation.isValid) {
                window.showToast?.(validation.errors[0], 'error');
                return;
            }

            // Add to state
            window.stateManager.addTransaction(transactionData);

            // Trigger event
            document.dispatchEvent(new CustomEvent('transactionAdded', {
                detail: transactionData
            }));

        } catch (error) {
            window.errorHandler.handleError({
                type: 'AddTransactionError',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async editTransaction(index) {
        const transaction = window.stateManager?.state.transactions[index];
        if (!transaction) return;

        // Show edit modal
        window.modalManager?.showEditTransactionModal(transaction, index);
    }

    async deleteTransaction(index) {
        const transaction = window.stateManager?.state.transactions[index];
        if (!transaction) return;

        // Show confirmation
        const confirmed = await window.showConfirmationModal?.(
            'Delete Transaction',
            `Are you sure you want to delete "${transaction.desc}"?`,
            'Yes, Delete',
            'Cancel'
        );

        if (confirmed) {
            window.stateManager.deleteTransaction(transaction.id);
            
            // Trigger event
            document.dispatchEvent(new CustomEvent('transactionDeleted', {
                detail: transaction
            }));
        }
    }

    // Analytics and AI
    async updateAIInsights() {
        if (!window.aiEngine) return;

        try {
            const insights = await window.aiEngine.generateInsights();
            this.renderAIInsights(insights);
        } catch (error) {
            console.error('Failed to generate AI insights:', error);
        }
    }

    renderAIInsights(insights) {
        const container = document.getElementById('aiInsightsContainer');
        if (!container) return;

        container.innerHTML = '';

        insights.insights?.slice(0, 3).forEach(insight => {
            const insightEl = document.createElement('div');
            insightEl.className = `ai-insight ai-${insight.type}`;
            insightEl.innerHTML = `
                <i class="bi ${insight.icon}"></i>
                <div>
                    <strong>${insight.title}</strong>
                    <div class="small">${insight.message}</div>
                </div>
            `;
            container.appendChild(insightEl);
        });
    }

    renderAnalyticsCharts() {
        const transactions = window.stateManager?.state.transactions || [];
        
        // Health trend chart
        const healthChart = document.getElementById('healthTrendChart');
        if (healthChart) {
            const data = window.analyticsEngine.prepareChartData('financialHealth', transactions);
            window.chartManager.createChart(healthChart, 'line', data);
        }

        // Category breakdown
        const categoryChart = document.getElementById('categoryBreakdownChart');
        if (categoryChart) {
            const data = window.analyticsEngine.prepareChartData('categoryBreakdown', transactions);
            window.chartManager.createChart(categoryChart, 'bar', data);
        }
    }

    // Utility Methods
    formatCurrency(amount) {
        const currency = window.stateManager?.state.currency || 'PKR';
        return new Intl.NumberFormat('en', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('active');
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('active');
            
            // Remove from DOM after animation
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    handleInitializationError(error) {
        window.errorHandler.handleError({
            type: 'AppInitializationError',
            message: error.message,
            timestamp: new Date().toISOString(),
            severity: 'high'
        });

        // Show error screen
        this.showErrorScreen(error);
    }

    showErrorScreen(error) {
        const errorHTML = `
            <div class="error-screen">
                <div class="error-content text-center">
                    <i class="bi bi-exclamation-triangle text-danger fs-1"></i>
                    <h3 class="mt-3">Failed to Load App</h3>
                    <p class="text-muted">${error.message}</p>
                    <button class="btn btn-primary mt-3" onclick="location.reload()">
                        <i class="bi bi-arrow-clockwise"></i> Reload App
                    </button>
                    <button class="btn btn-outline-secondary mt-2" onclick="wealthCommandApp.resetApp()">
                        <i class="bi bi-trash"></i> Reset App
                    </button>
                </div>
            </div>
        `;

        document.body.innerHTML = errorHTML;
    }

    async resetApp() {
        const confirmed = confirm('This will delete all your data and reset the app. Are you sure?');
        if (confirmed) {
            // Clear all data
            localStorage.clear();
            sessionStorage.clear();
            
            if (window.dataPersistence?.db) {
                window.dataPersistence.db.close();
                indexedDB.deleteDatabase(window.dataPersistence.dbName);
            }

            // Reload app
            location.reload();
        }
    }

    // Public API
    getModule(name) {
        return this.modules.get(name);
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            modules: Array.from(this.modules.keys()),
            currentView: this.currentView,
            state: window.stateManager?.state ? 'loaded' : 'empty',
            sync: window.syncEngine?.getSyncStats() || 'not_initialized'
        };
    }

    // Debug and Development
    enableDebugMode() {
        window.debugMode = true;
        console.log('Debug mode enabled');
        
        // Add debug styles
        document.body.classList.add('debug-mode');
    }

    disableDebugMode() {
        window.debugMode = false;
        document.body.classList.remove('debug-mode');
    }
}

// Create global app instance
window.wealthCommandApp = new WealthCommandApp();

// Global utility functions
window.showTab = (tabName) => {
    window.wealthCommandApp.showTab(tabName);
};

window.quickAddTransaction = (type) => {
    window.wealthCommandApp.quickAddTransaction(type);
};

window.formatCurrency = (amount) => {
    return window.wealthCommandApp.formatCurrency(amount);
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.wealthCommandApp.init();
    });
} else {
    window.wealthCommandApp.init();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WealthCommandApp;
}
