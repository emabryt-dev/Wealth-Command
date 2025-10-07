// Wealth Command Pro - Data Persistence Manager
class DataPersistence {
    constructor() {
        this.dbName = 'WealthCommandProDB';
        this.dbVersion = 3;
        this.db = null;
        this.isIndexedDBSupported = 'indexedDB' in window;
        this.init();
    }

    async init() {
        if (this.isIndexedDBSupported) {
            await this.initIndexedDB();
        } else {
            console.warn('IndexedDB not supported, falling back to localStorage');
        }
    }

    // IndexedDB Management
    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createObjectStores(db);
            };
        });
    }

    createObjectStores(db) {
        // Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
            const transactionStore = db.createObjectStore('transactions', { 
                keyPath: 'id',
                autoIncrement: false 
            });
            transactionStore.createIndex('date', 'date', { unique: false });
            transactionStore.createIndex('type', 'type', { unique: false });
            transactionStore.createIndex('category', 'category', { unique: false });
        }

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
            const categoryStore = db.createObjectStore('categories', { 
                keyPath: 'id',
                autoIncrement: false 
            });
            categoryStore.createIndex('type', 'type', { unique: false });
        }

        // Monthly budgets store
        if (!db.objectStoreNames.contains('monthlyBudgets')) {
            db.createObjectStore('monthlyBudgets', { 
                keyPath: 'monthKey' 
            });
        }

        // Future transactions store
        if (!db.objectStoreNames.contains('futureTransactions')) {
            const futureStore = db.createObjectStore('futureTransactions', { 
                keyPath: 'id',
                autoIncrement: false 
            });
            futureStore.createIndex('type', 'type', { unique: false });
        }

        // Loans store
        if (!db.objectStoreNames.contains('loans')) {
            const loansStore = db.createObjectStore('loans', { 
                keyPath: 'id',
                autoIncrement: false 
            });
            loansStore.createIndex('loanType', 'loanType', { unique: false });
        }

        // Analytics cache store
        if (!db.objectStoreNames.contains('analyticsCache')) {
            db.createObjectStore('analyticsCache', { 
                keyPath: 'cacheKey' 
            });
        }

        // App settings store
        if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { 
                keyPath: 'key' 
            });
        }
    }

    // Generic CRUD operations
    async add(storeName, data) {
        if (this.isIndexedDBSupported && this.db) {
            return this.addToIndexedDB(storeName, data);
        } else {
            return this.addToLocalStorage(storeName, data);
        }
    }

    async get(storeName, key) {
        if (this.isIndexedDBSupported && this.db) {
            return this.getFromIndexedDB(storeName, key);
        } else {
            return this.getFromLocalStorage(storeName, key);
        }
    }

    async getAll(storeName, indexName = null, query = null) {
        if (this.isIndexedDBSupported && this.db) {
            return this.getAllFromIndexedDB(storeName, indexName, query);
        } else {
            return this.getAllFromLocalStorage(storeName);
        }
    }

    async update(storeName, key, updates) {
        if (this.isIndexedDBSupported && this.db) {
            return this.updateInIndexedDB(storeName, key, updates);
        } else {
            return this.updateInLocalStorage(storeName, key, updates);
        }
    }

    async delete(storeName, key) {
        if (this.isIndexedDBSupported && this.db) {
            return this.deleteFromIndexedDB(storeName, key);
        } else {
            return this.deleteFromLocalStorage(storeName, key);
        }
    }

    // IndexedDB Operations
    addToIndexedDB(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getFromIndexedDB(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getAllFromIndexedDB(storeName, indexName = null, query = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            let request;
            if (indexName && query) {
                const index = store.index(indexName);
                request = index.getAll(query);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    updateInIndexedDB(storeName, key, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // First get the existing data
            const getRequest = store.get(key);
            
            getRequest.onsuccess = () => {
                const existingData = getRequest.result;
                if (!existingData) {
                    reject(new Error('Record not found'));
                    return;
                }

                const updatedData = { ...existingData, ...updates, updatedAt: new Date().toISOString() };
                const putRequest = store.put(updatedData);

                putRequest.onsuccess = () => resolve(updatedData);
                putRequest.onerror = () => reject(putRequest.error);
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    deleteFromIndexedDB(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // LocalStorage Fallback Operations
    addToLocalStorage(storeName, data) {
        return new Promise((resolve) => {
            const key = `${storeName}_${data.id || Date.now()}`;
            const storeData = this.getLocalStorageStore(storeName);
            storeData.push({ ...data, key });
            localStorage.setItem(storeName, JSON.stringify(storeData));
            resolve(data);
        });
    }

    getFromLocalStorage(storeName, key) {
        return new Promise((resolve) => {
            const storeData = this.getLocalStorageStore(storeName);
            const item = storeData.find(item => item.id === key || item.key === key);
            resolve(item || null);
        });
    }

    getAllFromLocalStorage(storeName) {
        return new Promise((resolve) => {
            const storeData = this.getLocalStorageStore(storeName);
            resolve(storeData);
        });
    }

    updateInLocalStorage(storeName, key, updates) {
        return new Promise((resolve) => {
            const storeData = this.getLocalStorageStore(storeName);
            const index = storeData.findIndex(item => item.id === key || item.key === key);
            
            if (index !== -1) {
                storeData[index] = { ...storeData[index], ...updates, updatedAt: new Date().toISOString() };
                localStorage.setItem(storeName, JSON.stringify(storeData));
                resolve(storeData[index]);
            } else {
                resolve(null);
            }
        });
    }

    deleteFromLocalStorage(storeName, key) {
        return new Promise((resolve) => {
            const storeData = this.getLocalStorageStore(storeName);
            const filteredData = storeData.filter(item => item.id !== key && item.key !== key);
            localStorage.setItem(storeName, JSON.stringify(filteredData));
            resolve();
        });
    }

    getLocalStorageStore(storeName) {
        try {
            const data = localStorage.getItem(storeName);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    // Specialized Methods for Wealth Command Data
    async saveAppState(state) {
        const stateToSave = {
            transactions: state.transactions || [],
            categories: state.categories || [],
            monthlyBudgets: state.monthlyBudgets || {},
            futureTransactions: state.futureTransactions || { income: [], expenses: [] },
            loans: state.loans || { given: [], taken: [] },
            currency: state.currency || 'PKR',
            preferences: state.preferences || {},
            theme: state.theme || 'light',
            lastSaved: new Date().toISOString()
        };

        if (this.isIndexedDBSupported) {
            // Save to IndexedDB
            await this.saveToIndexedDB(stateToSave);
        } else {
            // Save to localStorage
            localStorage.setItem('wealthCommandState', JSON.stringify(stateToSave));
        }

        // Also save to localStorage as backup
        localStorage.setItem('wealthCommandState_backup', JSON.stringify(stateToSave));
    }

    async saveToIndexedDB(state) {
        const transaction = this.db.transaction([
            'transactions', 
            'categories', 
            'monthlyBudgets', 
            'futureTransactions', 
            'loans', 
            'settings'
        ], 'readwrite');

        // Save transactions
        const transactionStore = transaction.objectStore('transactions');
        await this.clearStore(transactionStore);
        state.transactions.forEach(tx => transactionStore.add(tx));

        // Save categories
        const categoryStore = transaction.objectStore('categories');
        await this.clearStore(categoryStore);
        state.categories.forEach(cat => categoryStore.add(cat));

        // Save monthly budgets
        const budgetStore = transaction.objectStore('monthlyBudgets');
        await this.clearStore(budgetStore);
        Object.entries(state.monthlyBudgets).forEach(([monthKey, budget]) => {
            budgetStore.add({ monthKey, ...budget });
        });

        // Save future transactions
        const futureStore = transaction.objectStore('futureTransactions');
        await this.clearStore(futureStore);
        [...state.futureTransactions.income, ...state.futureTransactions.expenses].forEach(ft => {
            futureStore.add(ft);
        });

        // Save loans
        const loansStore = transaction.objectStore('loans');
        await this.clearStore(loansStore);
        [...state.loans.given, ...state.loans.taken].forEach(loan => {
            loansStore.add(loan);
        });

        // Save settings
        const settingsStore = transaction.objectStore('settings');
        await this.clearStore(settingsStore);
        settingsStore.add({ key: 'currency', value: state.currency });
        settingsStore.add({ key: 'preferences', value: state.preferences });
        settingsStore.add({ key: 'theme', value: state.theme });

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    clearStore(store) {
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async loadAppState() {
        let state = null;

        if (this.isIndexedDBSupported && this.db) {
            state = await this.loadFromIndexedDB();
        }

        // Fallback to localStorage if IndexedDB fails or returns no data
        if (!state || (state.transactions.length === 0 && state.categories.length === 0)) {
            state = this.loadFromLocalStorage();
        }

        return state || this.getDefaultState();
    }

    async loadFromIndexedDB() {
        try {
            const [
                transactions, 
                categories, 
                monthlyBudgets, 
                futureTransactions, 
                loans, 
                settings
            ] = await Promise.all([
                this.getAll('transactions'),
                this.getAll('categories'),
                this.getAll('monthlyBudgets'),
                this.getAll('futureTransactions'),
                this.getAll('loans'),
                this.getAll('settings')
            ]);

            // Convert monthly budgets array to object
            const budgetsObj = {};
            monthlyBudgets.forEach(budget => {
                budgetsObj[budget.monthKey] = budget;
            });

            // Separate future transactions by type
            const futureIncome = futureTransactions.filter(ft => ft.type === 'income');
            const futureExpenses = futureTransactions.filter(ft => ft.type === 'expense');

            // Separate loans by type
            const loansGiven = loans.filter(loan => loan.loanType === 'given');
            const loansTaken = loans.filter(loan => loan.loanType === 'taken');

            // Extract settings
            const currency = settings.find(s => s.key === 'currency')?.value || 'PKR';
            const preferences = settings.find(s => s.key === 'preferences')?.value || {};
            const theme = settings.find(s => s.key === 'theme')?.value || 'light';

            return {
                transactions,
                categories,
                monthlyBudgets: budgetsObj,
                futureTransactions: {
                    income: futureIncome,
                    expenses: futureExpenses
                },
                loans: {
                    given: loansGiven,
                    taken: loansTaken
                },
                currency,
                preferences,
                theme
            };
        } catch (error) {
            console.error('Error loading from IndexedDB:', error);
            return null;
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('wealthCommandState') || 
                         localStorage.getItem('wealthCommandState_backup');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    }

    getDefaultState() {
        return {
            transactions: [],
            categories: [
                { id: '1', name: "Salary", type: "income", color: "#10B981", icon: "bi-cash-coin" },
                { id: '2', name: "Food", type: "expense", color: "#EF4444", icon: "bi-basket" },
                { id: '3', name: "Shopping", type: "expense", color: "#8B5CF6", icon: "bi-bag" },
                { id: '4', name: "Transportation", type: "expense", color: "#F59E0B", icon: "bi-car-front" }
            ],
            monthlyBudgets: {},
            futureTransactions: { income: [], expenses: [] },
            loans: { given: [], taken: [] },
            currency: 'PKR',
            preferences: {
                autoSync: true,
                notifications: true,
                voiceCommands: true,
                animations: true,
                compactMode: false
            },
            theme: 'light'
        };
    }

    // Backup and Restore
    async createBackup() {
        const state = await this.loadAppState();
        const backupData = {
            ...state,
            backupDate: new Date().toISOString(),
            version: '2.0',
            app: 'Wealth Command Pro'
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
            type: 'application/json' 
        });
        
        return {
            data: backupData,
            blob: blob,
            url: URL.createObjectURL(blob)
        };
    }

    async restoreBackup(backupData) {
        try {
            // Validate backup data
            if (!backupData.transactions || !backupData.categories) {
                throw new Error('Invalid backup file');
            }

            await this.saveAppState(backupData);
            return true;
        } catch (error) {
            console.error('Error restoring backup:', error);
            return false;
        }
    }

    // Data Export Methods
    async exportData(format = 'json') {
        const state = await this.loadAppState();
        
        switch (format) {
            case 'json':
                return JSON.stringify(state, null, 2);
            case 'csv':
                return this.convertToCSV(state);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    convertToCSV(state) {
        const transactions = state.transactions || [];
        if (transactions.length === 0) return '';

        const headers = ['Date', 'Description', 'Type', 'Category', 'Amount', 'Currency'];
        const rows = transactions.map(tx => [
            tx.date,
            `"${tx.desc.replace(/"/g, '""')}"`,
            tx.type,
            tx.category,
            tx.amount,
            state.currency
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    // Cache Management
    async cacheAnalyticsData(cacheKey, data, ttl = 15 * 60 * 1000) { // 15 minutes TTL
        const cacheData = {
            data,
            timestamp: Date.now(),
            ttl: ttl
        };

        if (this.isIndexedDBSupported) {
            await this.add('analyticsCache', { cacheKey, ...cacheData });
        } else {
            localStorage.setItem(`cache_${cacheKey}`, JSON.stringify(cacheData));
        }
    }

    async getCachedAnalyticsData(cacheKey) {
        let cacheData;

        if (this.isIndexedDBSupported) {
            cacheData = await this.get('analyticsCache', cacheKey);
        } else {
            const stored = localStorage.getItem(`cache_${cacheKey}`);
            cacheData = stored ? JSON.parse(stored) : null;
        }

        if (!cacheData) return null;

        // Check if cache is expired
        if (Date.now() - cacheData.timestamp > cacheData.ttl) {
            await this.delete('analyticsCache', cacheKey);
            return null;
        }

        return cacheData.data;
    }

    // Performance Optimization
    async bulkAddTransactions(transactions) {
        if (this.isIndexedDBSupported && this.db) {
            const transaction = this.db.transaction(['transactions'], 'readwrite');
            const store = transaction.objectStore('transactions');
            
            transactions.forEach(tx => {
                store.add(tx);
            });

            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } else {
            // Fallback to individual localStorage operations
            for (const tx of transactions) {
                await this.add('transactions', tx);
            }
        }
    }

    // Data Cleanup
    async cleanupOldData() {
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        
        if (this.isIndexedDBSupported) {
            // Delete transactions older than 3 months
            const oldTransactions = await this.getAll('transactions', 'date', IDBKeyRange.upperBound(threeMonthsAgo.toISOString()));
            for (const tx of oldTransactions) {
                await this.delete('transactions', tx.id);
            }
        }

        // Clear expired cache
        await this.clearExpiredCache();
    }

    async clearExpiredCache() {
        if (this.isIndexedDBSupported) {
            const allCache = await this.getAll('analyticsCache');
            const now = Date.now();
            
            for (const cache of allCache) {
                if (now - cache.timestamp > cache.ttl) {
                    await this.delete('analyticsCache', cache.cacheKey);
                }
            }
        } else {
            // Clear localStorage cache
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('cache_')) {
                    try {
                        const cacheData = JSON.parse(localStorage.getItem(key));
                        if (Date.now() - cacheData.timestamp > cacheData.ttl) {
                            localStorage.removeItem(key);
                        }
                    } catch {
                        localStorage.removeItem(key);
                    }
                }
            });
        }
    }

    // Utility Methods
    getStorageInfo() {
        if (this.isIndexedDBSupported) {
            return {
                type: 'IndexedDB',
                supported: true,
                dbName: this.dbName,
                version: this.dbVersion
            };
        } else {
            return {
                type: 'LocalStorage',
                supported: true,
                limit: '5MB'
            };
        }
    }

    async getDataSize() {
        if (this.isIndexedDBSupported) {
            // Estimate size by serializing data
            const state = await this.loadAppState();
            const serialized = JSON.stringify(state);
            return {
                size: new Blob([serialized]).size,
                transactions: state.transactions.length,
                categories: state.categories.length
            };
        } else {
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length * 2; // UTF-16
                }
            }
            return {
                size: totalSize,
                transactions: this.getLocalStorageStore('transactions').length,
                categories: this.getLocalStorageStore('categories').length
            };
        }
    }
}

// Create global data persistence instance
window.dataPersistence = new DataPersistence();
