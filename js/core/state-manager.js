// Wealth Command Pro - State Manager
class StateManager {
    constructor() {
        this.state = {
            // Core data
            transactions: [],
            categories: [],
            monthlyBudgets: {},
            futureTransactions: { income: [], expenses: [] },
            loans: { given: [], taken: [] },
            
            // UI state
            currentTab: 'dashboard',
            currentCategoryFilter: 'all',
            plannerTimeframe: '1year',
            currency: 'PKR',
            theme: 'light',
            
            // Analytics state
            chartConfigs: {},
            filters: {
                month: 'all',
                year: 'all',
                category: 'all',
                type: 'all'
            },
            
            // User preferences
            preferences: {
                autoSync: true,
                notifications: true,
                voiceCommands: true,
                animations: true,
                compactMode: false
            },
            
            // Sync state
            syncState: {
                isOnline: navigator.onLine,
                isSyncing: false,
                lastSync: null,
                pendingSync: false
            },
            
            // AI state
            aiInsights: [],
            predictions: {},
            healthScore: 0
        };
        
        this.subscribers = new Set();
        this.init();
    }

    init() {
        // Load from localStorage
        this.loadFromStorage();
        
        // Set up auto-save
        this.setupAutoSave();
        
        // Set up connectivity monitoring
        this.setupConnectivity();
    }

    // State management methods
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notifySubscribers();
        this.saveToStorage();
    }

    updateState(updater) {
        this.state = updater(this.state);
        this.notifySubscribers();
        this.saveToStorage();
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.state));
    }

    // Persistence methods
    saveToStorage() {
        try {
            const stateToSave = {
                transactions: this.state.transactions,
                categories: this.state.categories,
                monthlyBudgets: this.state.monthlyBudgets,
                futureTransactions: this.state.futureTransactions,
                loans: this.state.loans,
                currency: this.state.currency,
                preferences: this.state.preferences,
                theme: this.state.theme
            };
            localStorage.setItem('wealthCommandState', JSON.stringify(stateToSave));
        } catch (error) {
            console.error('Error saving state to storage:', error);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('wealthCommandState');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = { ...this.state, ...parsed };
                
                // Ensure all required properties exist
                this.state.futureTransactions = this.state.futureTransactions || { income: [], expenses: [] };
                this.state.loans = this.state.loans || { given: [], taken: [] };
                this.state.monthlyBudgets = this.state.monthlyBudgets || {};
                this.state.preferences = { ...this.getDefaultPreferences(), ...this.state.preferences };
                
                this.notifySubscribers();
            }
        } catch (error) {
            console.error('Error loading state from storage:', error);
        }
    }

    getDefaultPreferences() {
        return {
            autoSync: true,
            notifications: true,
            voiceCommands: true,
            animations: true,
            compactMode: false
        };
    }

    // Connectivity methods
    setupConnectivity() {
        window.addEventListener('online', () => {
            this.setState({ 
                syncState: { 
                    ...this.state.syncState, 
                    isOnline: true 
                } 
            });
        });

        window.addEventListener('offline', () => {
            this.setState({ 
                syncState: { 
                    ...this.state.syncState, 
                    isOnline: false 
                } 
            });
        });
    }

    // Auto-save setup
    setupAutoSave() {
        // Debounced auto-save
        let saveTimeout;
        const debouncedSave = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => this.saveToStorage(), 1000);
        };

        this.subscribe(debouncedSave);
    }

    // Transaction management
    addTransaction(transaction) {
        this.updateState(state => ({
            ...state,
            transactions: [...state.transactions, {
                id: this.generateId(),
                date: transaction.date,
                desc: transaction.desc,
                type: transaction.type,
                category: transaction.category,
                amount: parseFloat(transaction.amount),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }]
        }));
    }

    updateTransaction(id, updates) {
        this.updateState(state => ({
            ...state,
            transactions: state.transactions.map(tx =>
                tx.id === id ? { ...tx, ...updates, updatedAt: new Date().toISOString() } : tx
            )
        }));
    }

    deleteTransaction(id) {
        this.updateState(state => ({
            ...state,
            transactions: state.transactions.filter(tx => tx.id !== id)
        }));
    }

    // Category management
    addCategory(category) {
        this.updateState(state => ({
            ...state,
            categories: [...state.categories, {
                id: this.generateId(),
                name: category.name,
                type: category.type,
                color: category.color || this.generateColor(),
                icon: category.icon || 'bi-tag',
                createdAt: new Date().toISOString()
            }]
        }));
    }

    updateCategory(id, updates) {
        this.updateState(state => ({
            ...state,
            categories: state.categories.map(cat =>
                cat.id === id ? { ...cat, ...updates, updatedAt: new Date().toISOString() } : cat
            )
        }));
    }

    deleteCategory(id) {
        this.updateState(state => ({
            ...state,
            categories: state.categories.filter(cat => cat.id !== id)
        }));
    }

    // Budget management
    updateMonthlyBudget(monthKey, updates) {
        this.updateState(state => ({
            ...state,
            monthlyBudgets: {
                ...state.monthlyBudgets,
                [monthKey]: {
                    ...state.monthlyBudgets[monthKey],
                    ...updates,
                    updatedAt: new Date().toISOString()
                }
            }
        }));
    }

    // Future transactions
    addFutureTransaction(type, transaction) {
        this.updateState(state => ({
            ...state,
            futureTransactions: {
                ...state.futureTransactions,
                [type]: [...state.futureTransactions[type], {
                    id: this.generateId(),
                    ...transaction,
                    createdAt: new Date().toISOString()
                }]
            }
        }));
    }

    updateFutureTransaction(type, id, updates) {
        this.updateState(state => ({
            ...state,
            futureTransactions: {
                ...state.futureTransactions,
                [type]: state.futureTransactions[type].map(ft =>
                    ft.id === id ? { ...ft, ...updates, updatedAt: new Date().toISOString() } : ft
                )
            }
        }));
    }

    deleteFutureTransaction(type, id) {
        this.updateState(state => ({
            ...state,
            futureTransactions: {
                ...state.futureTransactions,
                [type]: state.futureTransactions[type].filter(ft => ft.id !== id)
            }
        }));
    }

    // Loan management
    addLoan(type, loan) {
        this.updateState(state => ({
            ...state,
            loans: {
                ...state.loans,
                [type]: [...state.loans[type], {
                    id: this.generateId(),
                    ...loan,
                    status: 'pending',
                    payments: [],
                    createdAt: new Date().toISOString()
                }]
            }
        }));
    }

    updateLoan(type, id, updates) {
        this.updateState(state => ({
            ...state,
            loans: {
                ...state.loans,
                [type]: state.loans[type].map(loan =>
                    loan.id === id ? { ...loan, ...updates, updatedAt: new Date().toISOString() } : loan
                )
            }
        }));
    }

    deleteLoan(type, id) {
        this.updateState(state => ({
            ...state,
            loans: {
                ...state.loans,
                [type]: state.loans[type].filter(loan => loan.id !== id)
            }
        }));
    }

    // Filter management
    setFilter(filter, value) {
        this.updateState(state => ({
            ...state,
            filters: {
                ...state.filters,
                [filter]: value
            }
        }));
    }

    // Theme management
    setTheme(theme) {
        this.setState({ theme });
        document.body.classList.toggle('dark-mode', theme === 'dark');
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generateColor() {
        const colors = [
            '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
            '#6366F1', '#8B5CF6', '#EC4899', '#6B7280'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Getters for computed state
    getFilteredTransactions() {
        const { transactions, filters } = this.state;
        
        return transactions.filter(tx => {
            let include = true;
            
            if (filters.month !== 'all') {
                const txMonth = new Date(tx.date).getMonth() + 1;
                include = include && txMonth === parseInt(filters.month);
            }
            
            if (filters.year !== 'all') {
                const txYear = new Date(tx.date).getFullYear();
                include = include && txYear === parseInt(filters.year);
            }
            
            if (filters.category !== 'all') {
                include = include && tx.category === filters.category;
            }
            
            if (filters.type !== 'all') {
                include = include && tx.type === filters.type;
            }
            
            return include;
        });
    }

    getCurrentMonthKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    getMonthlySummary(monthKey = null) {
        const targetMonth = monthKey || this.getCurrentMonthKey();
        const monthTransactions = this.state.transactions.filter(tx => {
            const txMonth = new Date(tx.date).toISOString().substring(0, 7);
            return txMonth === targetMonth;
        });

        const income = monthTransactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const expenses = monthTransactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const monthBudget = this.state.monthlyBudgets[targetMonth] || {};
        const startingBalance = monthBudget.startingBalance || 0;

        return {
            income,
            expenses,
            net: income - expenses,
            startingBalance,
            endingBalance: startingBalance + income - expenses
        };
    }

    // Export/Import
    exportData() {
        const exportData = {
            transactions: this.state.transactions,
            categories: this.state.categories,
            monthlyBudgets: this.state.monthlyBudgets,
            futureTransactions: this.state.futureTransactions,
            loans: this.state.loans,
            currency: this.state.currency,
            preferences: this.state.preferences,
            exportDate: new Date().toISOString(),
            version: '2.0'
        };

        return JSON.stringify(exportData, null, 2);
    }

    importData(data) {
        try {
            const imported = JSON.parse(data);
            
            // Validate imported data
            if (!imported.transactions || !imported.categories) {
                throw new Error('Invalid data format');
            }

            this.setState({
                transactions: imported.transactions || [],
                categories: imported.categories || [],
                monthlyBudgets: imported.monthlyBudgets || {},
                futureTransactions: imported.futureTransactions || { income: [], expenses: [] },
                loans: imported.loans || { given: [], taken: [] },
                currency: imported.currency || 'PKR',
                preferences: { ...this.getDefaultPreferences(), ...imported.preferences }
            });

            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    // Reset state
    resetState() {
        this.setState({
            transactions: [],
            categories: [],
            monthlyBudgets: {},
            futureTransactions: { income: [], expenses: [] },
            loans: { given: [], taken: [] },
            currency: 'PKR',
            preferences: this.getDefaultPreferences()
        });
    }
}

// Create global state manager instance
window.stateManager = new StateManager();
