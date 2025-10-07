// =============================================================
// Wealth Command Pro — Main Application Controller
// =============================================================

class WealthCommandApp {
    constructor(autoInit = true) {
        this.isInitialized = false;
        this._initializing = false;
        this.modules = new Map();
        this.currentView = "dashboard";

        // Auto-init on DOM load
        if (autoInit) {
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", () => this.init());
            } else {
                Promise.resolve().then(() => this.init());
            }
        }
    }

    // =============================================================
    // Initialization
    // =============================================================

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
            console.log("Wealth Command Pro initialized successfully");
            window.showToast?.("Wealth Command Pro is ready!", "success");
        } catch (error) {
            console.error("Failed to initialize app:", error);
            this.handleInitializationError(error);
        } finally {
            this._initializing = false;
        }
    }

    // =============================================================
    // Core Modules
    // =============================================================

    async initializeCoreModules() {
        if (window.errorHandler) {
            this.modules.set("errorHandler", window.errorHandler);
        } else {
            this.modules.set("errorHandler", {
                handleError: (err) => console.error("Unhandled error:", err),
                validateTransaction: () => ({ isValid: true, errors: [] }),
            });
        }

        // dataPersistence
        if (window.dataPersistence && typeof window.dataPersistence.init === "function") {
            this.modules.set("dataPersistence", window.dataPersistence);
            await window.dataPersistence.init();
        } else {
            const fallback = {
                async init() { return Promise.resolve(); },
                async loadAppState() { return JSON.parse(localStorage.getItem("wc_state") || "null"); },
                async saveAppState(state) { localStorage.setItem("wc_state", JSON.stringify(state)); },
                cleanupOldData() {},
            };
            this.modules.set("dataPersistence", fallback);
            window.dataPersistence = fallback;
        }

        // stateManager
        if (window.stateManager) {
            this.modules.set("stateManager", window.stateManager);
        } else {
            window.stateManager = {
                state: { transactions: [], categories: [], monthlyBudgets: {}, currency: "PKR" },
                setState(s) { this.state = Object.assign({}, this.state, s); },
                getMonthlySummary() {
                    const t = this.state.transactions || [];
                    const income = t.filter(tx => tx.type === "income").reduce((s, tx) => s + tx.amount, 0);
                    const expenses = t.filter(tx => tx.type === "expense").reduce((s, tx) => s + tx.amount, 0);
                    return { income, expenses, endingBalance: income - expenses };
                },
                addTransaction(tx) {
                    tx.id = tx.id || `tx_${Date.now()}`;
                    this.state.transactions.push(tx);
                },
                deleteTransaction(id) {
                    this.state.transactions = (this.state.transactions || []).filter(t => t.id !== id);
                },
                getCurrentMonthKey() {
                    const d = new Date();
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                },
                getFilteredTransactions() { return this.state.transactions || []; },
            };
            this.modules.set("stateManager", window.stateManager);
        }

        // Optional modules
        if (window.syncEngine) this.modules.set("syncEngine", window.syncEngine);

        if (window.aiEngine && typeof window.aiEngine.initialize === "function") {
            this.modules.set("aiEngine", window.aiEngine);
            try { await window.aiEngine.initialize(); } catch (e) { console.warn("AI engine init failed", e); }
        } else {
            const fallbackAI = {
                initialize: async () => {},
                generateInsights: async () => ({ insights: [], metrics: {} }),
                categorizeTransaction: async () => "General",
            };
            this.modules.set("aiEngine", fallbackAI);
            window.aiEngine = fallbackAI;
        }

        if (window.analyticsEngine) {
            this.modules.set("analyticsEngine", window.analyticsEngine);
        } else {
            window.analyticsEngine = {
                prepareChartData: () => ({ labels: [], datasets: [] }),
                clearCache: () => {},
                calculateHealthScore: () => 50,
            };
            this.modules.set("analyticsEngine", window.analyticsEngine);
        }

        console.log("Core modules initialized (safe mode)");
    }

    // =============================================================
    // Feature & UI Modules
    // =============================================================

    async initializeFeatureModules() {
        this.modules.set("voiceCommandManager", window.voiceCommandManager);
        this.modules.set("transactionManager", window.transactionManager);
        this.modules.set("categoryManager", window.categoryManager);
        this.modules.set("planner", window.planner);
        this.modules.set("debtManager", window.debtManager);
        this.modules.set("notificationManager", window.notificationManager);
        console.log("Feature modules initialized");
    }

    async initializeUIModules() {
        this.modules.set("chartManager", window.chartManager);
        this.modules.set("animationManager", window.animationManager);
        window.animationManager?.init();
        this.modules.set("modalManager", window.modalManager);
        console.log("UI modules initialized");
    }

    // =============================================================
    // Data Loading
    // =============================================================

    async loadApplicationData() {
        try {
            const savedState = await window.dataPersistence.loadAppState();
            if (savedState) window.stateManager.setState(savedState);
            window.calculateMonthlyRollover?.();
            console.log("Application data loaded successfully");
        } catch (error) {
            console.error("Error loading application data:", error);
            window.errorHandler.handleError({
                type: "DataLoadError",
                message: error.message,
                timestamp: new Date().toISOString(),
            });
        }
    }

    // =============================================================
    // UI Initialization
    // =============================================================

    setupEventListeners() {
        window.addEventListener("online", this.handleOnline.bind(this));
        window.addEventListener("offline", this.handleOffline.bind(this));
        window.addEventListener("beforeunload", this.handleBeforeUnload.bind(this));
        document.addEventListener("transactionAdded", this.handleTransactionAdded.bind(this));
        document.addEventListener("transactionUpdated", this.handleTransactionUpdated.bind(this));
        document.addEventListener("transactionDeleted", this.handleTransactionDeleted.bind(this));
        document.addEventListener("keydown", this.handleKeyboardShortcuts.bind(this));
        this.setupServiceWorker();
        console.log("Event listeners set up");
    }

    initializeUI() {
        this.initializeTabs();
        this.initializeCharts();
        this.initializeModals();
        this.applyTheme();
        this.initializeFAB();
        console.log("UI initialized");
    }

    // =============================================================
    // Tabs
    // =============================================================

    initializeTabs() {
        document.querySelectorAll("[data-tab]").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.showTab(tab);
            });
        });
        this.showTab("dashboard");
    }

    showTab(tabName) {
        document.querySelectorAll(".tab-page").forEach(p => p.classList.remove("active"));
        const page = document.getElementById(`tab-${tabName}`);
        if (page) page.classList.add("active");

        document.querySelectorAll("[data-tab]").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.tab === tabName);
        });

        window.location.hash = tabName;
        this.initializeTabContent(tabName);
        console.log(`Switched to tab: ${tabName}`);
    }

    initializeTabContent(tab) {
        switch (tab) {
            case "dashboard": this.initializeDashboard(); break;
            case "transactions": this.initializeTransactions(); break;
            case "planner": this.initializePlanner(); break;
            case "debt": this.initializeDebt(); break;
            case "analytics": this.initializeAnalytics(); break;
            case "settings": this.initializeSettings(); break;
        }
    }

    initializeDashboard() {
        this.updateSummaryCards();
        this.updateBreakdowns();
        this.updateDashboardCharts();
    }

    // =============================================================
    // Dashboard Breakdown Fix
    // =============================================================

    updateBreakdowns() {
        this.renderIncomeBreakdown();
        this.renderExpenseBreakdown();
    }

    renderIncomeBreakdown() {
        const txs = window.stateManager?.state.transactions || [];
        const el = document.getElementById("incomeBreakdown");
        if (!el) return;

        const byCat = {};
        txs.filter(t => t.type === "income").forEach(t => {
            byCat[t.category] = (byCat[t.category] || 0) + t.amount;
        });

        el.innerHTML = "";
        if (!Object.keys(byCat).length) {
            el.innerHTML = `<div class="text-muted small">No income data yet</div>`;
            return;
        }

        for (const [cat, amt] of Object.entries(byCat)) {
            el.insertAdjacentHTML("beforeend", `
                <div class="d-flex justify-content-between">
                    <span>${cat}</span>
                    <span class="text-success">${this.formatCurrency(amt)}</span>
                </div>
            `);
        }
    }

    renderExpenseBreakdown() {
        const txs = window.stateManager?.state.transactions || [];
        const el = document.getElementById("expenseBreakdown");
        if (!el) return;

        const byCat = {};
        txs.filter(t => t.type === "expense").forEach(t => {
            byCat[t.category] = (byCat[t.category] || 0) + t.amount;
        });

        el.innerHTML = "";
        if (!Object.keys(byCat).length) {
            el.innerHTML = `<div class="text-muted small">No expense data yet</div>`;
            return;
        }

        for (const [cat, amt] of Object.entries(byCat)) {
            el.insertAdjacentHTML("beforeend", `
                <div class="d-flex justify-content-between">
                    <span>${cat}</span>
                    <span class="text-danger">${this.formatCurrency(amt)}</span>
                </div>
            `);
        }
    }

    // =============================================================
    // Currency Formatter
    // =============================================================

    formatCurrency(amount) {
        const currency = window.stateManager?.state.currency || "PKR";
        return new Intl.NumberFormat("en", {
            style: "currency",
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    }

    // =============================================================
    // Loading, Error, and Reset
    // =============================================================

    showLoadingScreen() {
        const el = document.getElementById("loadingScreen");
        if (el) el.classList.add("active");
    }

    hideLoadingScreen() {
        const el = document.getElementById("loadingScreen");
        if (!el) return;
        el.classList.remove("active");
        setTimeout(() => { el.style.display = "none"; }, 500);
    }

    handleInitializationError(error) {
        window.errorHandler?.handleError({
            type: "AppInitializationError",
            message: error.message,
            timestamp: new Date().toISOString(),
        });
        this.showErrorScreen(error);
    }

    showErrorScreen(error) {
        document.body.innerHTML = `
            <div class="error-screen text-center p-5">
                <i class="bi bi-exclamation-triangle text-danger fs-1"></i>
                <h3 class="mt-3">Failed to Load App</h3>
                <p class="text-muted">${error.message}</p>
                <button class="btn btn-primary mt-3" onclick="location.reload()">
                    <i class="bi bi-arrow-clockwise"></i> Reload
                </button>
                <button class="btn btn-outline-secondary mt-2" onclick="wealthCommandApp.resetApp()">
                    <i class="bi bi-trash"></i> Reset App
                </button>
            </div>
        `;
    }

    async resetApp() {
        if (!confirm("This will delete all data and reset the app. Continue?")) return;
        localStorage.clear();
        sessionStorage.clear();
        if (window.dataPersistence?.db) {
            window.dataPersistence.db.close();
            indexedDB.deleteDatabase(window.dataPersistence.dbName);
        }
        location.reload();
    }
}

// =============================================================
// Global Instance & Helpers
// =============================================================

window.wealthCommandApp = new WealthCommandApp();

window.showTab = (tab) => window.wealthCommandApp.showTab(tab);
window.quickAddTransaction = (type) => window.wealthCommandApp.quickAddTransaction(type);
window.formatCurrency = (amt) => window.wealthCommandApp.formatCurrency(amt);
window.manualSync = () => window.syncEngine?.manualSync();
window.showFullAIAnalysis = () =>
    window.modalManager?.showCustomModal("aiAnalysisModal",
        "<h2>AI Analysis</h2><p>Detailed analysis will appear here.</p>", { title: "AI Financial Analysis" });
window.showGoogleSignIn = () => window.syncEngine?.requestAuth();
window.googleSignOut = () => {
    window.syncEngine?.signOut();
    document.getElementById("signInOption")?.classList.remove("d-none");
    document.getElementById("signOutOption")?.classList.add("d-none");
    document.getElementById("signedInUser")?.classList.add("d-none");
    document.getElementById("userEmail").textContent = "";
};
window.showAchievements = () => window.showToast("Achievements feature coming soon!", "info");
window.exportFinancialReport = () => window.showToast("PDF reports feature coming soon!", "info");
window.hideVoiceInterface = () => window.voiceCommandManager?.hideInterface();
window.toggleVoiceRecognition = () => window.voiceCommandManager?.toggleListening();

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.wealthCommandApp.init());
} else {
    window.wealthCommandApp.init();
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = WealthCommandApp;
}
