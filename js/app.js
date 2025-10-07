// Wealth Command Pro - Main Application (cleaned, full version)

/* --- Helper utilities (outside class) --- */
function safeGet(obj, path, defaultValue = undefined) {
    try {
        return path.split('.').reduce((o, p) => (o && o[p] !== undefined) ? o[p] : undefined, obj) ?? defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

/* --- WealthCommandApp class --- */
class WealthCommandApp {
    constructor(autoInit = true) {
        this.isInitialized = false;
        this._initializing = false;
        this.modules = new Map();
        this.currentView = 'dashboard';
        this.autoSaveInterval = null;
        this.syncInterval = null;
        this.analyticsInterval = null;
        this.cleanupInterval = null;

        // Defer init to DOMContentLoaded to avoid race with module script ordering
        if (autoInit) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init());
            } else {
                // microtask so caller can finish constructing global references
                Promise.resolve().then(() => this.init());
            }
        }
    }

    async init() {
        if (this.isInitialized || this._initializing) return;
        this._initializing = true;

        try {
            this.showLoadingScreen();

            await this.initializeCoreModules();
            await this.initializeFeatureModules();
            await this.initializeUIModules();
            await this.loadApplicationData();

            this.setupEventListeners();
            this.initializeUI();

            this.hideLoadingScreen();

            this.isInitialized = true;

            this.startBackgroundProcesses();

            console.log('Wealth Command Pro initialized successfully');
            window.showToast?.('Wealth Command Pro is ready!', 'success');

        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.handleInitializationError(error);
        } finally {
            this._initializing = false;
        }
    }

    /* ------------------ Core modules ------------------ */
    async initializeCoreModules() {
        // errorHandler (guarded)
        if (window.errorHandler) {
            this.modules.set('errorHandler', window.errorHandler);
        } else {
            const fallback = {
                handleError: (err) => console.error('Unhandled error:', err),
                validateTransaction: () => ({ isValid: true, errors: [] })
            };
            this.modules.set('errorHandler', fallback);
            window.errorHandler = fallback;
        }

        // dataPersistence (guarded)
        if (window.dataPersistence && typeof window.dataPersistence.init === 'function') {
            this.modules.set('dataPersistence', window.dataPersistence);
            try {
                await window.dataPersistence.init();
            } catch (e) {
                console.warn('dataPersistence.init() failed, using fallback', e);
            }
        } else {
            const fallback = {
                async init() { return Promise.resolve(); },
                async loadAppState() { return JSON.parse(localStorage.getItem('wc_state') || 'null'); },
                async saveAppState(state) { localStorage.setItem('wc_state', JSON.stringify(state)); },
                cleanupOldData() {}
            };
            this.modules.set('dataPersistence', fallback);
            window.dataPersistence = fallback;
        }

        // stateManager (guarded)
        if (window.stateManager) {
            this.modules.set('stateManager', window.stateManager);
        } else {
            window.stateManager = {
                state: { transactions: [], categories: [], monthlyBudgets: {}, currency: 'PKR' },
                setState(s) { this.state = Object.assign({}, this.state, s); },
                getMonthlySummary() {
                    const transactions = this.state.transactions || [];
                    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
                    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
                    return { income, expenses, endingBalance: income - expenses };
                },
                addTransaction(tx) {
                    tx.id = tx.id || `tx_${Date.now()}`;
                    this.state.transactions = this.state.transactions || [];
                    this.state.transactions.push(tx);
                },
                deleteTransaction(id) {
                    this.state.transactions = (this.state.transactions || []).filter(t => t.id !== id);
                },
                getCurrentMonthKey() {
                    const d = new Date();
                    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                },
                getFilteredTransactions() { return this.state.transactions || []; }
            };
            this.modules.set('stateManager', window.stateManager);
        }

        // syncEngine (optional)
        if (window.syncEngine) {
            this.modules.set('syncEngine', window.syncEngine);
        }

        // aiEngine (guarded)
        if (window.aiEngine && typeof window.aiEngine.initialize === 'function') {
            this.modules.set('aiEngine', window.aiEngine);
            try { await window.aiEngine.initialize(); } catch (e) { console.warn('AI engine init failed', e); }
        } else {
            const fallbackAI = {
                initialize: async () => {},
                generateInsights: async () => ({ insights: [], metrics: {} }),
                categorizeTransaction: async () => 'General'
            };
            this.modules.set('aiEngine', fallbackAI);
            window.aiEngine = fallbackAI;
        }

        // analyticsEngine (guarded)
        if (window.analyticsEngine) {
            this.modules.set('analyticsEngine', window.analyticsEngine);
        } else {
            const fallbackAnalytics = {
                prepareChartData: () => ({ labels: [], datasets: [] }),
                clearCache: () => {},
                calculateHealthScore: () => 50
            };
            this.modules.set('analyticsEngine', fallbackAnalytics);
            window.analyticsEngine = fallbackAnalytics;
        }

        console.log('Core modules initialized (safe mode)');
    }

    /* ------------------ Feature modules ------------------ */
    async initializeFeatureModules() {
        // These are optional; set if present so getModule works
        if (window.voiceCommandManager) this.modules.set('voiceCommandManager', window.voiceCommandManager);
        if (window.transactionManager) this.modules.set('transactionManager', window.transactionManager);
        if (window.categoryManager) this.modules.set('categoryManager', window.categoryManager);
        if (window.planner) this.modules.set('planner', window.planner);
        if (window.debtManager) this.modules.set('debtManager', window.debtManager);
        if (window.notificationManager) this.modules.set('notificationManager', window.notificationManager);

        console.log('Feature modules initialized');
    }

    /* ------------------ UI modules ------------------ */
    async initializeUIModules() {
        if (window.chartManager) this.modules.set('chartManager', window.chartManager);

        if (window.animationManager) {
            this.modules.set('animationManager', window.animationManager);
            // safe init
            try { window.animationManager?.init?.(); } catch (e) { console.warn('animationManager.init failed', e); }
        }

        if (window.modalManager) this.modules.set('modalManager', window.modalManager);

        console.log('UI modules initialized');
    }

    /* ------------------ Data load ------------------ */
    async loadApplicationData() {
        try {
            const savedState = await window.dataPersistence?.loadAppState?.();
            if (savedState) {
                window.stateManager.setState(savedState);
            }

            window.calculateMonthlyRollover?.();

            console.log('Application data loaded successfully');
        } catch (error) {
            console.error('Error loading application data:', error);
            window.errorHandler?.handleError?.({
                type: 'DataLoadError',
                message: error?.message ?? String(error),
                timestamp: new Date().toISOString()
            });
        }
    }

    /* ------------------ Event listeners ------------------ */
    setupEventListeners() {
        // Only bind if handlers exist
        if (typeof this.handleOnline === 'function') {
            window.addEventListener('online', this.handleOnline.bind(this));
        }
        if (typeof this.handleOffline === 'function') {
            window.addEventListener('offline', this.handleOffline.bind(this));
        }
        if (typeof this.handleBeforeUnload === 'function') {
            window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        }

        // Custom events
        if (typeof this.handleTransactionAdded === 'function') {
            document.addEventListener('transactionAdded', this.handleTransactionAdded.bind(this));
        }
        if (typeof this.handleTransactionUpdated === 'function') {
            document.addEventListener('transactionUpdated', this.handleTransactionUpdated.bind(this));
        }
        if (typeof this.handleTransactionDeleted === 'function') {
            document.addEventListener('transactionDeleted', this.handleTransactionDeleted.bind(this));
        }

        // Keyboard shortcuts (always bind - handler exists)
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

        // Service worker
        this.setupServiceWorker();

        console.log('Event listeners set up');
    }

    handleOnline() {
        window.showToast?.('Back online. Syncing data...', 'info');

        setTimeout(() => {
            try {
                window.syncEngine?.syncData?.().catch?.(console.error);
            } catch (e) {
                console.error('Error triggering syncEngine.syncData', e);
            }
        }, 2000);
    }

    handleOffline() {
        window.showToast?.('Working offline. Changes saved locally.', 'warning');
    }

    handleBeforeUnload(event) {
        // Auto-save before closing
        this.autoSave();

        if (this.hasUnsavedChanges && this.hasUnsavedChanges()) {
            event.preventDefault();
            event.returnValue = '';
            return '';
        }
    }

    handleTransactionAdded(event) {
        const transaction = event?.detail;
        window.analyticsEngine?.clearCache?.();
        this.updateAIInsights();
        window.showToast?.(`${transaction?.type ?? 'Transaction'} added successfully`, 'success');
    }

    handleTransactionUpdated(event) {
        window.analyticsEngine?.clearCache?.();
        window.showToast?.('Transaction updated successfully', 'success');
    }

    handleTransactionDeleted(event) {
        window.analyticsEngine?.clearCache?.();
        window.showToast?.('Transaction deleted successfully', 'success');
    }

    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + N: New transaction
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            this.quickAddTransaction();
            return;
        }
        // Ctrl/Cmd + /: Voice commands
        if ((event.ctrlKey || event.metaKey) && event.key === '/') {
            event.preventDefault();
            window.voiceCommandManager?.showInterface?.();
            return;
        }
        // Ctrl/Cmd + K: Search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            this.focusSearch();
            return;
        }
        // Escape: Close modals
        if (event.key === 'Escape') {
            this.closeAllModals();
            return;
        }
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register?.('/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                    this.modules.set('serviceWorker', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        }
    }

    /* ------------------ UI initialization ------------------ */
    initializeUI() {
        this.initializeTabs();
        this.initializeCharts();
        this.initializeModals();
        this.applyTheme();
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

        // Show initial tab safely
        try { this.showTab(this.currentView || 'dashboard'); } catch (e) { console.warn('showTab failed', e); }
    }

    showTab(tabName) {
        if (!tabName) return;
        document.querySelectorAll('.tab-page').forEach(page => page.classList.remove('active'));

        const targetPage = document.getElementById(`tab-${tabName}`);
        if (targetPage) targetPage.classList.add('active');

        document.querySelectorAll('[data-tab]').forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });

        try { window.history?.replaceState?.({}, '', `#${tabName}`); } catch (e) { /* ignore */ }

        this.currentView = tabName;
        this.initializeTabContent(tabName);
        console.log(`Switched to tab: ${tabName}`);
    }

    initializeTabContent(tabName) {
        switch (tabName) {
            case 'dashboard': this.initializeDashboard(); break;
            case 'transactions': this.initializeTransactions(); break;
            case 'planner': this.initializePlanner(); break;
            case 'debt': this.initializeDebt(); break;
            case 'analytics': this.initializeAnalytics(); break;
            case 'settings': this.initializeSettings(); break;
            default: break;
        }
    }

    initializeDashboard() {
        this.updateSummaryCards();
        this.updateBreakdowns();
        this.updateDashboardCharts();
    }

    initializeTransactions() {
        this.renderTransactionsTable();
        this.initializeTransactionFilters?.();
    }

    initializePlanner() {
        this.renderPlannerProjections?.();
        this.renderFutureTransactions?.();
    }

    initializeDebt() {
        this.renderDebtSummary?.();
        this.renderLoans?.();
    }

    initializeAnalytics() {
        this.renderAnalyticsCharts();
        this.updateAIInsights();
    }

    initializeSettings() {
        this.loadSettings?.();
        this.initializeCategoryManagement?.();
    }

    initializeCharts() {
        try { window.chartManager?.initializeCharts?.(); } catch (e) { console.warn('chartManager init failed', e); }
    }

    initializeModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            try { new bootstrap.Modal(modal); } catch (e) { /* ignore if bootstrap not present */ }
        });
    }

    applyTheme() {
        const theme = safeGet(window, 'stateManager.state.theme', 'light');
        document.body.classList.toggle('dark-mode', theme === 'dark');
    }

    initializeFAB() {
        const fab = document.getElementById('mainFAB');
        const fabMenu = document.getElementById('fabMenu');

        if (!fab || !fabMenu) return;

        fab.addEventListener('click', () => this.toggleFABMenu(fab, fabMenu));

        document.addEventListener('click', (e) => {
            if (!fab.contains(e.target) && !fabMenu.contains(e.target)) {
                fabMenu.classList.remove('open');
                fab.classList.remove('open');
            }
        });
    }

    toggleFABMenu(fab, fabMenu) {
        const isOpen = fabMenu.classList.contains('open');
        if (isOpen) {
            fabMenu.classList.remove('open');
            fab.classList.remove('open');
            window.animationManager?.animateFABClose?.(fab, fabMenu);
        } else {
            fabMenu.classList.add('open');
            fab.classList.add('open');
            window.animationManager?.animateFABOpen?.(fab, fabMenu);
        }
    }

    /* ------------------ Background processes ------------------ */
    startBackgroundProcesses() {
        this.stopBackgroundProcesses(); // ensure no duplicates

        this.autoSaveInterval = setInterval(() => this.autoSave(), 30000);

        this.syncInterval = setInterval(() => {
            if (navigator.onLine && window.syncEngine?.googleUser) {
                window.syncEngine?.syncData?.().catch?.(console.error);
            }
        }, 300000);

        this.analyticsInterval = setInterval(() => window.analyticsEngine?.clearCache?.(), 3600000);

        this.cleanupInterval = setInterval(() => window.dataPersistence?.cleanupOldData?.(), 604800000);

        console.log('Background processes started');
    }

    stopBackgroundProcesses() {
        clearInterval(this.autoSaveInterval); this.autoSaveInterval = null;
        clearInterval(this.syncInterval); this.syncInterval = null;
        clearInterval(this.analyticsInterval); this.analyticsInterval = null;
        clearInterval(this.cleanupInterval); this.cleanupInterval = null;
    }

    /* ------------------ Data management ------------------ */
    async autoSave() {
        if (!window.stateManager || !window.dataPersistence) return;
        try {
            await window.dataPersistence.saveAppState(window.stateManager.state);
            window.stateManager.setState?.({ lastSaved: new Date().toISOString() });
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }

    hasUnsavedChanges() {
        // Implement your real logic; fallback false to avoid blocking unload
        return false;
    }

    /* ------------------ Transactions ------------------ */
    async quickAddTransaction(type = null) {
        if (!type) {
            this.showTransactionTypeModal();
        } else {
            this.showAddTransactionModal(type);
        }
    }

    showTransactionTypeModal() {
        if (document.getElementById('transactionTypeModal')) {
            try { new bootstrap.Modal(document.getElementById('transactionTypeModal')).show(); } catch (e) { /* ignore */ }
            return;
        }

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
                                    <button class="btn btn-success btn-lg w-100 h-100 py-4" onclick="window.wealthCommandApp.showAddTransactionModal('income')">
                                        <i class="bi bi-arrow-down-circle fs-1"></i>
                                        <div class="mt-2">Income</div>
                                    </button>
                                </div>
                                <div class="col-6">
                                    <button class="btn btn-danger btn-lg w-100 h-100 py-4" onclick="window.wealthCommandApp.showAddTransactionModal('expense')">
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
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        try { new bootstrap.Modal(document.getElementById('transactionTypeModal')).show(); } catch (e) { /* ignore */ }
    }

    showAddTransactionModal(type) {
        window.modalManager?.showAddTransactionModal?.(type);
    }

    focusSearch() {
        const searchInput = document.querySelector('#globalSearch input');
        if (searchInput) searchInput.focus();
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            try {
                const bsModal = bootstrap.Modal.getInstance(modal);
                bsModal?.hide?.();
            } catch (e) { /* ignore */ }
        });

        const fabMenu = document.getElementById('fabMenu');
        const fab = document.getElementById('mainFAB');
        if (fabMenu && fab) {
            fabMenu.classList.remove('open');
            fab.classList.remove('open');
        }
    }

    /* ------------------ Render / UI update methods ------------------ */
    updateSummaryCards() {
        const state = window.stateManager?.state;
        if (!state) return;

        const summary = window.stateManager.getMonthlySummary?.() ?? { income: 0, expenses: 0, endingBalance: 0 };

        const netWealthEl = document.getElementById('netWealth');
        const totalIncomeEl = document.getElementById('totalIncome');
        const totalExpenseEl = document.getElementById('totalExpense');

        if (netWealthEl) netWealthEl.textContent = this.formatCurrency(summary.endingBalance);
        if (totalIncomeEl) totalIncomeEl.textContent = this.formatCurrency(summary.income);
        if (totalExpenseEl) totalExpenseEl.textContent = this.formatCurrency(summary.expenses);
    }

    updateBreakdowns() {
        this.renderIncomeBreakdown?.();
        this.renderExpenseBreakdown?.();
    }

    updateDashboardCharts() {
        const transactions = window.stateManager?.state.transactions || [];

        const spendingChart = document.getElementById('spendingChart');
        if (spendingChart && window.chartManager?.createChart) {
            const data = window.analyticsEngine?.prepareChartData?.('categoryBreakdown', transactions) ?? { labels: [], datasets: [] };
            window.chartManager.createChart(spendingChart, 'doughnut', data);
        }

        const trendChart = document.getElementById('trendChart');
        if (trendChart && window.chartManager?.createChart) {
            const data = window.analyticsEngine?.prepareChartData?.('monthlyTrend', transactions) ?? { labels: [], datasets: [] };
            window.chartManager.createChart(trendChart, 'line', data);
        }
    }

    renderTransactionsTable() {
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
                        <button class="btn btn-primary mt-2" onclick="window.wealthCommandApp.quickAddTransaction()">
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
        const formattedDate = isNaN(date) ? '' : date.toLocaleDateString('en', { day: 'numeric', month: 'short' });

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${transaction.desc ?? ''}</td>
            <td>${transaction.category ?? ''}</td>
            <td><span class="badge bg-${transaction.type === 'income' ? 'success' : 'danger'}">${transaction.type ?? ''}</span></td>
            <td class="fw-bold ${transaction.type === 'income' ? 'text-success' : 'text-danger'}">
                ${this.formatCurrency(transaction.amount ?? 0)}
            </td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); window.wealthCommandApp.deleteTransaction(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        return row;
    }

    async addTransaction(transactionData) {
        try {
            const validation = window.errorHandler?.validateTransaction?.(transactionData) ?? { isValid: true, errors: [] };
            if (!validation.isValid) {
                window.showToast?.(validation.errors?.[0] ?? 'Validation failed', 'error');
                return;
            }

            window.stateManager?.addTransaction?.(transactionData);

            document.dispatchEvent(new CustomEvent('transactionAdded', { detail: transactionData }));
        } catch (error) {
            window.errorHandler?.handleError?.({
                type: 'AddTransactionError',
                message: error?.message ?? String(error),
                timestamp: new Date().toISOString()
            });
        }
    }

    async editTransaction(index) {
        const transaction = window.stateManager?.state?.transactions?.[index];
        if (!transaction) return;
        window.modalManager?.showEditTransactionModal?.(transaction, index);
    }

    async deleteTransaction(index) {
        const transaction = window.stateManager?.state?.transactions?.[index];
        if (!transaction) return;

        const confirmed = await window.showConfirmationModal?.(
            'Delete Transaction',
            `Are you sure you want to delete "${transaction.desc}"?`,
            'Yes, Delete',
            'Cancel'
        );

        if (confirmed) {
            window.stateManager?.deleteTransaction?.(transaction.id);
            document.dispatchEvent(new CustomEvent('transactionDeleted', { detail: transaction }));
        }
    }

    /* ------------------ Analytics & AI ------------------ */
    async updateAIInsights() {
        if (!window.aiEngine?.generateInsights) return;
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

        (insights?.insights ?? []).slice(0, 3).forEach(insight => {
            const insightEl = document.createElement('div');
            insightEl.className = `ai-insight ai-${insight.type ?? 'general'}`;
            insightEl.innerHTML = `
                <i class="bi ${insight.icon ?? ''}"></i>
                <div>
                    <strong>${insight.title ?? ''}</strong>
                    <div class="small">${insight.message ?? ''}</div>
                </div>
            `;
            container.appendChild(insightEl);
        });
    }

    renderAnalyticsCharts() {
        const transactions = window.stateManager?.state.transactions || [];

        const healthChart = document.getElementById('healthTrendChart');
        if (healthChart && window.chartManager?.createChart) {
            const data = window.analyticsEngine?.prepareChartData?.('financialHealth', transactions) ?? { labels: [], datasets: [] };
            window.chartManager.createChart(healthChart, 'line', data);
        }

        const categoryChart = document.getElementById('categoryBreakdownChart');
        if (categoryChart && window.chartManager?.createChart) {
            const data = window.analyticsEngine?.prepareChartData?.('categoryBreakdown', transactions) ?? { labels: [], datasets: [] };
            window.chartManager.createChart(categoryChart, 'bar', data);
        }
    }

    /* ------------------ Utilities & error UI ------------------ */
    formatCurrency(amount) {
        const currency = safeGet(window, 'stateManager.state.currency', 'PKR');
        try {
            return new Intl.NumberFormat('en', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(Number(amount) ?? 0);
        } catch (e) {
            return (amount ?? 0).toString();
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.classList.add('active');
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('active');
            setTimeout(() => { loadingScreen.style.display = 'none'; }, 500);
        }
    }

    handleInitializationError(error) {
        window.errorHandler?.handleError?.({
            type: 'AppInitializationError',
            message: error?.message ?? String(error),
            timestamp: new Date().toISOString(),
            severity: 'high'
        });
        this.showErrorScreen(error);
    }

    showErrorScreen(error) {
        const errorHTML = `
            <div class="error-screen">
                <div class="error-content text-center">
                    <i class="bi bi-exclamation-triangle text-danger fs-1"></i>
                    <h3 class="mt-3">Failed to Load App</h3>
                    <p class="text-muted">${String(error?.message ?? error)}</p>
                    <button class="btn btn-primary mt-3" onclick="location.reload()">
                        <i class="bi bi-arrow-clockwise"></i> Reload App
                    </button>
                    <button class="btn btn-outline-secondary mt-2" onclick="window.wealthCommandApp.resetApp()">
                        <i class="bi bi-trash"></i> Reset App
                    </button>
                </div>
            </div>
        `;
        document.body.innerHTML = errorHTML;
    }

    async resetApp() {
        const confirmed = confirm('This will delete all your data and reset the app. Are you sure?');
        if (!confirmed) return;

        localStorage.clear();
        sessionStorage.clear();

        if (window.dataPersistence?.db) {
            try { window.dataPersistence.db.close(); } catch (e) { /* ignore */ }
            try { indexedDB.deleteDatabase(window.dataPersistence.dbName); } catch (e) { /* ignore */ }
        }

        location.reload();
    }

    /* ------------------ Public API ------------------ */
    getModule(name) { return this.modules.get(name); }

    getStatus() {
        return {
            initialized: this.isInitialized,
            modules: Array.from(this.modules.keys()),
            currentView: this.currentView,
            state: window.stateManager?.state ? 'loaded' : 'empty',
            sync: window.syncEngine?.getSyncStats?.() ?? 'not_initialized'
        };
    }

    enableDebugMode() {
        window.debugMode = true;
        document.body.classList.add('debug-mode');
        console.log('Debug mode enabled');
    }

    disableDebugMode() {
        window.debugMode = false;
        document.body.classList.remove('debug-mode');
    }
}

/* ------------------ Create global app instance (safe) ------------------ */
window.wealthCommandApp = window.wealthCommandApp || new WealthCommandApp(true);

/* ------------------ Global utility functions (kept for compatibility) ------------------ */
window.showTab = (tabName) => { window.wealthCommandApp.showTab(tabName); };
window.quickAddTransaction = (type) => { window.wealthCommandApp.quickAddTransaction(type); };
window.formatCurrency = (amount) => { return window.wealthCommandApp.formatCurrency(amount); };
window.manualSync = () => { console.log("Manual sync triggered"); window.syncEngine?.manualSync?.(); };
window.showFullAIAnalysis = () => {
    console.log("Show full AI analysis triggered");
    window.modalManager?.showCustomModal?.('aiAnalysisModal', '<h2>AI Analysis</h2><p>Detailed analysis would be rendered here.</p>', {title: "AI Financial Analysis"});
};
window.showGoogleSignIn = () => { console.log("Show Google Sign In triggered"); window.syncEngine?.requestAuth?.(); };
window.googleSignOut = () => {
    console.log("Google Sign Out triggered");
    window.syncEngine?.signOut?.();
    try {
        document.getElementById('signInOption')?.classList.remove('d-none');
        document.getElementById('signOutOption')?.classList.add('d-none');
        document.getElementById('signedInUser')?.classList.add('d-none');
        document.getElementById('userEmail').textContent = '';
    } catch (e) { /* ignore DOM issues */ }
};
window.showAchievements = () => { console.log("Show achievements triggered"); window.showToast?.("Achievements feature coming soon!", "info"); };
window.exportFinancialReport = () => { console.log("Export financial report triggered"); window.showToast?.("PDF reports feature coming soon!", "info"); };
window.hideVoiceInterface = () => { window.voiceCommandManager?.hideInterface?.(); };
window.toggleVoiceRecognition = () => { window.voiceCommandManager?.toggleListening?.(); };

/* ------------------ CommonJS export for tests / node (if needed) ------------------ */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WealthCommandApp;
}
