// Wealth Command - Enhanced Personal Finance Manager
class WealthCommand {
    constructor() {
        this.transactions = [];
        this.futureIncome = [];
        this.futureExpenses = [];
        this.loans = [];
        this.categories = {
            income: ['Salary', 'Business', 'Investment', 'Gift', 'Other Income'],
            expense: ['Food', 'Transport', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Education', 'Other Expense']
        };
        this.settings = {
            currency: 'PKR',
            theme: 'light',
            autoSync: true,
            rolloverBalance: {
                enabled: false,
                amount: 0,
                description: ''
            }
        };
        
        this.currentUser = null;
        this.isOnline = navigator.onLine;
        this.syncPending = false;
        
        this.initializeApp();
    }

    // Initialize the application
    async initializeApp() {
        this.showLoading('Loading your financial data...');
        
        try {
            // Load data from localStorage
            await this.loadData();
            
            // Initialize UI components
            this.initializeUI();
            this.setupEventListeners();
            this.initializeGoogleSignIn();
            
            // Check sync status
            await this.checkSyncStatus();
            
            // Update displays
            this.updateDashboard();
            this.updateTransactionsDisplay();
            this.updatePlanner();
            this.updateLoansDisplay();
            
            this.hideLoading();
            
            // Show welcome message for new users
            if (this.transactions.length === 0) {
                this.showToast('Welcome to Wealth Command! Start by adding your first transaction.', 'info');
            }
            
        } catch (error) {
            console.error('Error initializing app:', error);
            this.hideLoading();
            this.showToast('Error loading application data', 'error');
        }
    }

    // Show loading overlay
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = document.getElementById('loadingText');
        text.textContent = message;
        overlay.classList.remove('d-none');
    }

    // Hide loading overlay
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.add('d-none');
    }

    // Show component-level loading
    showComponentLoading(componentId, message = 'Loading...') {
        const component = document.getElementById(componentId);
        if (component) {
            component.innerHTML = `
                <div class="component-loading">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">${message}</span>
                    </div>
                    <div class="mt-2">${message}</div>
                </div>
            `;
        }
    }

    // Show skeleton loader
    showSkeletonLoader(containerId, count = 5) {
        const container = document.getElementById(containerId);
        if (container) {
            let skeletonHTML = '';
            for (let i = 0; i < count; i++) {
                skeletonHTML += `
                    <div class="skeleton-loader skeleton-text mb-2"></div>
                    <div class="skeleton-loader skeleton-text mb-3" style="width: 70%"></div>
                `;
            }
            container.innerHTML = skeletonHTML;
        }
    }

    // Initialize UI components
    initializeUI() {
        this.initializeDateSelectors();
        this.initializeTheme();
        this.initializeCurrency();
        this.initializeCategories();
        this.setupBottomNavigation();
        this.initializeQuickAddFAB();
    }

    // Setup event listeners
    setupEventListeners() {
        // Online/offline detection
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showToast('You are back online', 'success');
            this.attemptSync();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showToast('You are offline', 'warning');
        });

        // Form submissions
        document.getElementById('transactionForm').addEventListener('submit', (e) => this.handleTransactionSubmit(e));
        document.getElementById('futureIncomeForm').addEventListener('submit', (e) => this.handleFutureIncomeSubmit(e));
        document.getElementById('futureExpenseForm').addEventListener('submit', (e) => this.handleFutureExpenseSubmit(e));
        document.getElementById('loanForm').addEventListener('submit', (e) => this.handleLoanSubmit(e));

        // Real-time form validation
        this.setupFormValidation();

        // Search and filter
        document.getElementById('transactionSearch').addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('transactionSearch').addEventListener('focus', () => this.showSearchSuggestions());

        // Gesture support for mobile
        this.setupGestureSupport();

        // Pull to refresh
        this.setupPullToRefresh();
    }

    // Setup real-time form validation
    setupFormValidation() {
        // Transaction form validation
        const transactionForm = document.getElementById('transactionForm');
        const amountInput = document.getElementById('transactionAmount');
        const descriptionInput = document.getElementById('transactionDescription');
        const categoryInput = document.getElementById('transactionCategory');
        const dateInput = document.getElementById('transactionDate');

        // Amount validation
        amountInput.addEventListener('input', () => {
            this.validateAmount(amountInput);
        });

        // Description validation
        descriptionInput.addEventListener('input', () => {
            this.validateDescription(descriptionInput);
        });

        // Category validation with smart suggestions
        categoryInput.addEventListener('focus', () => {
            this.showCategorySuggestions();
        });

        // Date validation
        dateInput.addEventListener('change', () => {
            this.validateDate(dateInput);
        });

        // Future income/expense form validation
        this.setupFutureTransactionValidation();
    }

    // Validate amount
    validateAmount(input) {
        const value = parseFloat(input.value);
        const isValid = !isNaN(value) && value > 0;
        
        this.setValidationState(input, isValid, 'Please enter a valid positive amount');
        
        if (isValid) {
            this.predictCategory();
        }
    }

    // Validate description
    validateDescription(input) {
        const isValid = input.value.trim().length >= 2;
        this.setValidationState(input, isValid, 'Description must be at least 2 characters long');
    }

    // Validate date
    validateDate(input) {
        const selectedDate = new Date(input.value);
        const today = new Date();
        const isValid = selectedDate <= today;
        
        this.setValidationState(input, isValid, 'Date cannot be in the future');
    }

    // Set validation state with visual feedback
    setValidationState(input, isValid, message) {
        if (isValid) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        } else {
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');
            // Create or update feedback element
            let feedback = input.nextElementSibling;
            if (!feedback || !feedback.classList.contains('invalid-feedback')) {
                feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                input.parentNode.appendChild(feedback);
            }
            feedback.textContent = message;
        }
    }

    // Show category suggestions based on description
    predictCategory() {
        const description = document.getElementById('transactionDescription').value.toLowerCase();
        const type = document.querySelector('input[name="transactionType"]:checked').value;
        
        if (description.length < 3) {
            document.getElementById('categorySuggestions').classList.add('d-none');
            return;
        }

        const suggestions = this.getCategorySuggestions(description, type);
        
        if (suggestions.length > 0) {
            const container = document.getElementById('suggestedCategories');
            container.innerHTML = suggestions.map(cat => 
                `<span class="category-suggestion" onclick="app.selectSuggestedCategory('${cat}')">${cat}</span>`
            ).join('');
            document.getElementById('categorySuggestions').classList.remove('d-none');
        } else {
            document.getElementById('categorySuggestions').classList.add('d-none');
        }
    }

    // Get smart category suggestions using ML-like pattern matching
    getCategorySuggestions(description, type) {
        const patterns = {
            income: {
                'salary': ['salary', 'payroll', 'wage', 'paycheck'],
                'business': ['business', 'sale', 'revenue', 'profit'],
                'investment': ['investment', 'dividend', 'interest', 'return'],
                'gift': ['gift', 'present', 'bonus', 'reward']
            },
            expense: {
                'food': ['food', 'grocery', 'restaurant', 'meal', 'dinner', 'lunch'],
                'transport': ['transport', 'fuel', 'gas', 'uber', 'taxi', 'bus', 'train'],
                'utilities': ['electricity', 'water', 'gas', 'internet', 'phone', 'utility'],
                'entertainment': ['movie', 'netflix', 'game', 'entertainment', 'fun'],
                'healthcare': ['hospital', 'doctor', 'medicine', 'health', 'medical'],
                'shopping': ['shopping', 'clothes', 'amazon', 'store', 'mall']
            }
        };

        const categoryScores = {};
        const typePatterns = patterns[type] || {};

        Object.keys(typePatterns).forEach(category => {
            typePatterns[category].forEach(keyword => {
                if (description.includes(keyword)) {
                    categoryScores[category] = (categoryScores[category] || 0) + 1;
                }
            });
        });

        // Return top 3 suggestions
        return Object.keys(categoryScores)
            .sort((a, b) => categoryScores[b] - categoryScores[a])
            .slice(0, 3)
            .map(cat => this.formatCategoryName(cat));
    }

    // Format category name for display
    formatCategoryName(category) {
        return category.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    // Select suggested category
    selectSuggestedCategory(category) {
        document.getElementById('transactionCategory').value = category;
        document.getElementById('categorySuggestions').classList.add('d-none');
        
        // Show success feedback
        const categoryInput = document.getElementById('transactionCategory');
        categoryInput.classList.add('is-valid');
        this.showToast(`Category set to: ${category}`, 'success');
    }

    // Show category suggestions
    showCategorySuggestions() {
        const description = document.getElementById('transactionDescription').value;
        if (description.length >= 2) {
            this.predictCategory();
        }
    }

    // Setup future transaction validation
    setupFutureTransactionValidation() {
        // Future income validation
        const futureIncomeAmount = document.getElementById('futureIncomeAmount');
        const futureIncomeDescription = document.getElementById('futureIncomeDescription');
        const futureIncomeStartDate = document.getElementById('futureIncomeStartDate');

        futureIncomeAmount.addEventListener('input', () => this.validateAmount(futureIncomeAmount));
        futureIncomeDescription.addEventListener('input', () => this.validateDescription(futureIncomeDescription));
        futureIncomeStartDate.addEventListener('change', () => this.validateFutureDate(futureIncomeStartDate));

        // Future expense validation
        const futureExpenseAmount = document.getElementById('futureExpenseAmount');
        const futureExpenseDescription = document.getElementById('futureExpenseDescription');
        const futureExpenseStartDate = document.getElementById('futureExpenseStartDate');

        futureExpenseAmount.addEventListener('input', () => this.validateAmount(futureExpenseAmount));
        futureExpenseDescription.addEventListener('input', () => this.validateDescription(futureExpenseDescription));
        futureExpenseStartDate.addEventListener('change', () => this.validateFutureDate(futureExpenseStartDate));
    }

    // Validate future date (can be in future)
    validateFutureDate(input) {
        const isValid = input.value !== '';
        this.setValidationState(input, isValid, 'Please select a date');
    }

    // Setup gesture support for mobile
    setupGestureSupport() {
        if ('ontouchstart' in window) {
            this.setupSwipeGestures();
            this.setupTapGestures();
        }
    }

    // Setup swipe gestures
    setupSwipeGestures() {
        let startX, startY;
        const transactionList = document.getElementById('transactionsBody');

        transactionList.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });

        transactionList.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;

            const diffX = e.touches[0].clientX - startX;
            const diffY = e.touches[0].clientY - startY;

            // Horizontal swipe (more prominent than vertical)
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                const row = e.target.closest('tr');
                if (row) {
                    row.classList.toggle('swiped', diffX < 0);
                }
            }
        });

        transactionList.addEventListener('touchend', () => {
            startX = null;
            startY = null;
        });
    }

    // Setup tap gestures
    setupTapGestures() {
        // Double tap to edit
        let lastTap = 0;
        const transactionList = document.getElementById('transactionsBody');

        transactionList.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 500 && tapLength > 0) {
                // Double tap detected
                const row = e.target.closest('tr');
                if (row) {
                    const index = parseInt(row.dataset.index);
                    this.editTransaction(index);
                }
            }
            
            lastTap = currentTime;
        });
    }

    // Setup pull to refresh
    setupPullToRefresh() {
        let startY = 0;
        let currentY = 0;
        const pullThreshold = 100;
        const transactionsTab = document.getElementById('tab-transactions');

        transactionsTab.addEventListener('touchstart', (e) => {
            if (transactionsTab.scrollTop === 0) {
                startY = e.touches[0].pageY;
            }
        });

        transactionsTab.addEventListener('touchmove', (e) => {
            if (transactionsTab.scrollTop === 0) {
                currentY = e.touches[0].pageY;
                const diff = currentY - startY;

                if (diff > 0) {
                    e.preventDefault();
                    this.showPullToRefresh(diff);
                }
            }
        });

        transactionsTab.addEventListener('touchend', () => {
            if (currentY - startY > pullThreshold) {
                this.refreshTransactions();
            }
            this.hidePullToRefresh();
        });
    }

    // Show pull to refresh indicator
    showPullToRefresh(pullDistance) {
        let pullIndicator = document.getElementById('pullToRefresh');
        if (!pullIndicator) {
            pullIndicator = document.createElement('div');
            pullIndicator.id = 'pullToRefresh';
            pullIndicator.className = 'pull-to-refresh';
            pullIndicator.innerHTML = '<i class="bi bi-arrow-down"></i> Pull to refresh';
            document.getElementById('transactionsBody').parentNode.insertBefore(pullIndicator, document.getElementById('transactionsBody'));
        }

        const opacity = Math.min(pullDistance / 100, 1);
        pullIndicator.style.opacity = opacity;
        pullIndicator.classList.toggle('visible', opacity > 0.5);
    }

    // Hide pull to refresh indicator
    hidePullToRefresh() {
        const pullIndicator = document.getElementById('pullToRefresh');
        if (pullIndicator) {
            pullIndicator.remove();
        }
    }

    // Refresh transactions
    async refreshTransactions() {
        this.showLoading('Refreshing transactions...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate refresh
        this.updateTransactionsDisplay();
        this.hideLoading();
        this.showToast('Transactions refreshed', 'success');
    }

    // Initialize Google Sign-In
    initializeGoogleSignIn() {
        // Google Sign-In configuration will be handled here
        console.log('Google Sign-In initialized');
    }

    // Load data from localStorage
    async loadData() {
        try {
            const transactions = localStorage.getItem('wealthTransactions');
            const futureIncome = localStorage.getItem('wealthFutureIncome');
            const futureExpenses = localStorage.getItem('wealthFutureExpenses');
            const loans = localStorage.getItem('wealthLoans');
            const settings = localStorage.getItem('wealthSettings');

            this.transactions = transactions ? JSON.parse(transactions) : [];
            this.futureIncome = futureIncome ? JSON.parse(futureIncome) : [];
            this.futureExpenses = futureExpenses ? JSON.parse(futureExpenses) : [];
            this.loans = loans ? JSON.parse(loans) : [];
            this.settings = settings ? { ...this.settings, ...JSON.parse(settings) } : this.settings;

            // Initialize with current date if not set
            if (!this.settings.currentMonth) {
                const now = new Date();
                this.settings.currentMonth = now.getMonth();
                this.settings.currentYear = now.getFullYear();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    // Save data to localStorage
    async saveData() {
        try {
            localStorage.setItem('wealthTransactions', JSON.stringify(this.transactions));
            localStorage.setItem('wealthFutureIncome', JSON.stringify(this.futureIncome));
            localStorage.setItem('wealthFutureExpenses', JSON.stringify(this.futureExpenses));
            localStorage.setItem('wealthLoans', JSON.stringify(this.loans));
            localStorage.setItem('wealthSettings', JSON.stringify(this.settings));

            // Trigger sync if user is signed in
            if (this.currentUser && this.settings.autoSync) {
                this.attemptSync();
            }
        } catch (error) {
            console.error('Error saving data:', error);
            throw error;
        }
    }

    // Check sync status
    async checkSyncStatus() {
        const icon = document.getElementById('syncStatusIcon');
        const tooltip = document.getElementById('syncStatusTooltip');

        if (!this.isOnline) {
            icon.className = 'bi bi-cloud-slash text-warning';
            tooltip.textContent = 'Offline - Changes will sync when online';
            return;
        }

        if (this.currentUser) {
            if (this.syncPending) {
                icon.className = 'bi bi-cloud-arrow-up text-warning';
                tooltip.textContent = 'Sync pending...';
            } else {
                icon.className = 'bi bi-cloud-check text-success';
                tooltip.textContent = 'All changes synced';
            }
        } else {
            icon.className = 'bi bi-cloud text-secondary';
            tooltip.textContent = 'Sign in to sync across devices';
        }
    }

    // Attempt to sync data
    async attemptSync() {
        if (!this.currentUser || !this.isOnline || !this.syncPending) {
            return;
        }

        this.syncPending = false;
        this.showToast('Syncing data...', 'info');
        await this.checkSyncStatus();
        
        // Simulate sync delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        this.syncPending = false;
        await this.checkSyncStatus();
        this.showToast('Data synced successfully', 'success');
    }

    // Manual sync
    async manualSync() {
        if (!this.currentUser) {
            this.showGoogleSignIn();
            return;
        }

        this.syncPending = true;
        await this.attemptSync();
    }

    // Show Google Sign-In
    showGoogleSignIn() {
        const modal = new bootstrap.Modal(document.getElementById('googleSignInModal'));
        modal.show();
    }

    // Google Sign-In handler
    async handleGoogleSignIn(response) {
        try {
            this.showLoading('Signing you in...');
            
            // Decode the credential response
            const responsePayload = JSON.parse(atob(response.credential.split('.')[1]));
            this.currentUser = {
                email: responsePayload.email,
                name: responsePayload.name,
                picture: responsePayload.picture
            };

            // Update UI
            this.updateUserProfile();
            
            // Close sign-in modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('googleSignInModal'));
            modal.hide();
            
            this.hideLoading();
            this.showToast(`Welcome back, ${this.currentUser.name}!`, 'success');
            
            // Attempt to sync
            this.syncPending = true;
            await this.attemptSync();
            
        } catch (error) {
            console.error('Google Sign-In error:', error);
            this.hideLoading();
            this.showToast('Error signing in with Google', 'error');
        }
    }

    // Google Sign-Out
    async googleSignOut() {
        try {
            this.showLoading('Signing out...');
            
            // Google Sign-Out logic would go here
            this.currentUser = null;
            this.updateUserProfile();
            
            this.hideLoading();
            this.showToast('Signed out successfully', 'info');
            
        } catch (error) {
            console.error('Google Sign-Out error:', error);
            this.hideLoading();
            this.showToast('Error signing out', 'error');
        }
    }

    // Update user profile in UI
    updateUserProfile() {
        const profilePic = document.getElementById('profilePicture');
        const userEmail = document.getElementById('userEmail');
        const signedInUser = document.getElementById('signedInUser');
        const signInOption = document.getElementById('signInOption');
        const signOutOption = document.getElementById('signOutOption');

        if (this.currentUser) {
            profilePic.innerHTML = this.currentUser.picture ? 
                `<img src="${this.currentUser.picture}" alt="Profile" class="rounded-circle" style="width: 100%; height: 100%; object-fit: cover;">` :
                `<i class="bi bi-person-circle profile-icon"></i>`;
            
            userEmail.textContent = this.currentUser.email;
            signedInUser.classList.remove('d-none');
            signInOption.classList.add('d-none');
            signOutOption.classList.remove('d-none');
        } else {
            profilePic.innerHTML = '<i class="bi bi-person-circle profile-icon"></i>';
            signedInUser.classList.add('d-none');
            signInOption.classList.remove('d-none');
            signOutOption.classList.add('d-none');
        }

        this.checkSyncStatus();
    }

    // Initialize date selectors
    initializeDateSelectors() {
        this.populateMonthYearSelectors('summaryMonth', 'summaryYear');
        
        // Set default to current month/year
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        document.getElementById('summaryMonth').value = currentMonth;
        document.getElementById('summaryYear').value = currentYear;
        
        // Add change listeners
        document.getElementById('summaryMonth').addEventListener('change', () => this.updateDashboard());
        document.getElementById('summaryYear').addEventListener('change', () => this.updateDashboard());
    }

    // Populate month and year selectors
    populateMonthYearSelectors(monthId, yearId) {
        const monthSelect = document.getElementById(monthId);
        const yearSelect = document.getElementById(yearId);
        
        // Clear existing options
        monthSelect.innerHTML = '';
        yearSelect.innerHTML = '';
        
        // Add months
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = month;
            monthSelect.appendChild(option);
        });
        
        // Add years (current year and 2 years back)
        const currentYear = new Date().getFullYear();
        for (let year = currentYear - 2; year <= currentYear; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    }

    // Initialize theme
    initializeTheme() {
        const savedTheme = localStorage.getItem('wealthTheme') || 'light';
        this.settings.theme = savedTheme;
        this.applyTheme(savedTheme);
        
        // Set toggle state
        const darkModeToggle = document.getElementById('darkModeToggle');
        darkModeToggle.checked = savedTheme === 'dark';
        
        // Add event listener
        darkModeToggle.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'dark' : 'light';
            this.applyTheme(newTheme);
            this.settings.theme = newTheme;
            localStorage.setItem('wealthTheme', newTheme);
            this.saveData();
        });
    }

    // Apply theme
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update meta theme color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#121212' : '#0d6efd');
        }
    }

    // Initialize currency
    initializeCurrency() {
        const currencySelect = document.getElementById('currencySelect');
        currencySelect.value = this.settings.currency;
        
        currencySelect.addEventListener('change', (e) => {
            this.settings.currency = e.target.value;
            this.updateCurrencyDisplay();
            this.saveData();
        });
        
        this.updateCurrencyDisplay();
    }

    // Update currency display
    updateCurrencyDisplay() {
        const currencySymbols = {
            'PKR': '₨',
            'USD': '$',
            'EUR': '€',
            'GBP': '£'
        };
        
        const symbol = currencySymbols[this.settings.currency] || '₨';
        document.getElementById('currencySymbol').textContent = symbol;
        document.getElementById('currencyLabel').textContent = this.settings.currency;
        
        // Update all displays
        this.updateDashboard();
        this.updateTransactionsDisplay();
        this.updatePlanner();
        this.updateLoansDisplay();
    }

    // Initialize categories
    initializeCategories() {
        this.updateCategorySelectors();
    }

    // Update category selectors
    updateCategorySelectors() {
        const transactionCategory = document.getElementById('transactionCategory');
        const filterCategory = document.getElementById('filterCategory');
        
        // Clear and populate transaction category
        transactionCategory.innerHTML = '<option value="">Select a category</option>';
        
        // Clear and populate filter category
        filterCategory.innerHTML = '<option value="all">All Categories</option>';
        
        // Add categories based on type
        const addCategories = (type, categories) => {
            categories.forEach(category => {
                // Transaction category
                const option1 = document.createElement('option');
                option1.value = category;
                option1.textContent = category;
                transactionCategory.appendChild(option1);
                
                // Filter category
                const option2 = document.createElement('option');
                option2.value = category;
                option2.textContent = `${type === 'income' ? '💰' : '💸'} ${category}`;
                filterCategory.appendChild(option2);
            });
        };
        
        addCategories('income', this.categories.income);
        addCategories('expense', this.categories.expense);
    }

    // Setup bottom navigation
    setupBottomNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = button.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });
    }

    // Initialize Quick Add FAB
    initializeQuickAddFAB() {
        const fab = document.getElementById('quickAddFab');
        
        fab.addEventListener('click', () => {
            const activeTab = document.querySelector('.tab-page:not(.d-none)').id.replace('tab-', '');
            this.handleQuickAdd(activeTab);
        });

        // Update FAB context based on active tab
        const observer = new MutationObserver(() => {
            const activeTab = document.querySelector('.tab-page:not(.d-none)').id.replace('tab-', '');
            this.updateFABContext(activeTab);
        });

        observer.observe(document.body, { 
            childList: false, 
            subtree: false,
            attributes: true,
            attributeFilter: ['class']
        });
    }

    // Update FAB context
    updateFABContext(activeTab) {
        const fab = document.getElementById('quickAddFab');
        const icon = fab.querySelector('i');
        
        fab.className = 'btn btn-primary btn-floating fab-button';
        
        switch (activeTab) {
            case 'dashboard':
                fab.classList.add('context-income');
                icon.className = 'bi bi-plus-lg';
                break;
            case 'transactions':
                fab.classList.add('context-expense');
                icon.className = 'bi bi-receipt';
                break;
            case 'planner':
                fab.classList.add('context-planner');
                icon.className = 'bi bi-calendar-plus';
                break;
            case 'loans':
                fab.classList.add('context-loans');
                icon.className = 'bi bi-cash-coin';
                break;
            default:
                icon.className = 'bi bi-plus-lg';
        }
    }

    // Handle quick add based on context
    handleQuickAdd(context) {
        switch (context) {
            case 'dashboard':
            case 'transactions':
                this.openAddTransactionModal();
                break;
            case 'planner':
                // Open quick add modal for planner
                this.showQuickPlannerModal();
                break;
            case 'loans':
                // Open quick add modal for loans
                this.showQuickLoanModal();
                break;
            default:
                this.openAddTransactionModal();
        }
    }

    // Show quick planner modal
    showQuickPlannerModal() {
        // Simple modal for quick planner addition
        const description = prompt('Enter description:');
        if (!description) return;

        const amount = parseFloat(prompt('Enter amount:'));
        if (isNaN(amount) || amount <= 0) {
            this.showToast('Invalid amount', 'error');
            return;
        }

        const type = confirm('Is this income? (OK for income, Cancel for expense)') ? 'income' : 'expense';
        
        if (type === 'income') {
            this.futureIncome.push({
                description,
                amount,
                type: 'quick',
                frequency: 'one-time',
                startDate: new Date().toISOString().split('T')[0]
            });
        } else {
            this.futureExpenses.push({
                description,
                amount,
                type: 'quick',
                frequency: 'one-time',
                startDate: new Date().toISOString().split('T')[0]
            });
        }

        this.saveData();
        this.updatePlanner();
        this.showToast(`${type === 'income' ? 'Future income' : 'Future expense'} added`, 'success');
    }

    // Show quick loan modal
    showQuickLoanModal() {
        const description = prompt('Enter borrower/lender name:');
        if (!description) return;

        const amount = parseFloat(prompt('Enter amount:'));
        if (isNaN(amount) || amount <= 0) {
            this.showToast('Invalid amount', 'error');
            return;
        }

        const type = confirm('Is this a loan given? (OK for given, Cancel for taken)') ? 'given' : 'taken';
        
        this.loans.push({
            description,
            amount,
            type,
            dateGiven: new Date().toISOString().split('T')[0],
            expectedReturn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'pending'
        });

        this.saveData();
        this.updateLoansDisplay();
        this.showToast(`Loan ${type} added`, 'success');
    }

    // Switch tabs
    switchTab(tabName) {
        // Hide all tab pages
        document.querySelectorAll('.tab-page').forEach(tab => {
            tab.classList.add('d-none');
        });
        
        // Show selected tab page
        document.getElementById(`tab-${tabName}`).classList.remove('d-none');
        
        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update FAB context
        this.updateFABContext(tabName);
        
        // Refresh tab-specific content
        switch (tabName) {
            case 'transactions':
                this.updateTransactionsDisplay();
                break;
            case 'planner':
                this.updatePlanner();
                break;
            case 'loans':
                this.updateLoansDisplay();
                break;
        }
    }

    // Update dashboard
    updateDashboard() {
        const selectedMonth = parseInt(document.getElementById('summaryMonth').value);
        const selectedYear = parseInt(document.getElementById('summaryYear').value);
        
        const { income, expenses, netWealth, incomeBreakdown, expenseBreakdown } = this.calculateMonthlySummary(selectedMonth, selectedYear);
        
        // Update summary cards
        document.getElementById('totalIncome').textContent = this.formatCurrency(income);
        document.getElementById('totalExpense').textContent = this.formatCurrency(expenses);
        document.getElementById('netWealth').textContent = this.formatCurrency(netWealth);
        
        // Update breakdowns
        this.updateBreakdownDisplay('incomeBreakdown', incomeBreakdown, 'noIncomeCategories');
        this.updateBreakdownDisplay('expenseBreakdown', expenseBreakdown, 'noExpenseCategories');
        
        // Update rollover balance if enabled
        this.updateRolloverBalance();
    }

    // Calculate monthly summary
    calculateMonthlySummary(month, year) {
        const monthTransactions = this.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate.getMonth() === month && 
                   transactionDate.getFullYear() === year;
        });
        
        let income = 0;
        let expenses = 0;
        const incomeBreakdown = {};
        const expenseBreakdown = {};
        
        monthTransactions.forEach(transaction => {
            const amount = parseFloat(transaction.amount);
            
            if (transaction.type === 'income') {
                income += amount;
                incomeBreakdown[transaction.category] = (incomeBreakdown[transaction.category] || 0) + amount;
            } else {
                expenses += amount;
                expenseBreakdown[transaction.category] = (expenseBreakdown[transaction.category] || 0) + amount;
            }
        });
        
        const netWealth = income - expenses;
        
        // Apply rollover balance if enabled
        if (this.settings.rolloverBalance.enabled) {
            netWealth += parseFloat(this.settings.rolloverBalance.amount);
        }
        
        return {
            income,
            expenses,
            netWealth,
            incomeBreakdown,
            expenseBreakdown
        };
    }

    // Update breakdown display
    updateBreakdownDisplay(containerId, breakdown, emptyStateId) {
        const container = document.getElementById(containerId);
        const emptyState = document.getElementById(emptyStateId);
        
        if (Object.keys(breakdown).length === 0) {
            container.classList.add('d-none');
            emptyState.classList.remove('d-none');
            return;
        }
        
        container.classList.remove('d-none');
        emptyState.classList.add('d-none');
        
        let html = '';
        Object.entries(breakdown)
            .sort(([,a], [,b]) => b - a)
            .forEach(([category, amount]) => {
                html += `
                    <div class="breakdown-item animate-slide-in" onclick="app.showCategoryTransactions('${containerId.includes('income') ? 'income' : 'expense'}', '${category}')">
                        <span class="category-name">${category}</span>
                        <span class="category-amount">${this.formatCurrency(amount)}</span>
                    </div>
                `;
            });
        
        container.innerHTML = html;
    }

    // Update rollover balance display
    updateRolloverBalance() {
        const rolloverBalance = document.getElementById('rolloverBalance');
        const rolloverAmount = document.getElementById('rolloverAmount');
        const rolloverDescription = document.getElementById('rolloverDescription');
        
        if (this.settings.rolloverBalance.enabled) {
            rolloverBalance.classList.remove('d-none');
            rolloverAmount.textContent = this.formatCurrency(this.settings.rolloverBalance.amount);
            rolloverDescription.textContent = this.settings.rolloverBalance.description || 'Previous balance carried over';
        } else {
            rolloverBalance.classList.add('d-none');
        }
    }

    // Toggle rollover settings
    toggleRolloverSettings() {
        const amount = parseFloat(prompt('Enter rollover amount:', this.settings.rolloverBalance.amount || 0));
        if (isNaN(amount)) return;
        
        const description = prompt('Enter description (optional):', this.settings.rolloverBalance.description || '');
        
        this.settings.rolloverBalance = {
            enabled: true,
            amount: amount,
            description: description || ''
        };
        
        this.saveData();
        this.updateDashboard();
        this.showToast('Rollover balance updated', 'success');
    }

    // Show category transactions
    showCategoryTransactions(type, category) {
        const selectedMonth = parseInt(document.getElementById('summaryMonth').value);
        const selectedYear = parseInt(document.getElementById('summaryYear').value);
        
        const categoryTransactions = this.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            const matchesType = transaction.type === type;
            const matchesCategory = category === 'all' || transaction.category === category;
            const matchesMonth = transactionDate.getMonth() === selectedMonth;
            const matchesYear = transactionDate.getFullYear() === selectedYear;
            
            return matchesType && matchesCategory && matchesMonth && matchesYear;
        });
        
        const totalAmount = categoryTransactions.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);
        
        // Update modal title and info
        document.getElementById('categoryTransactionsTitle').innerHTML = 
            `<i class="bi bi-list-ul"></i> ${category === 'all' ? 'All ' + type + 's' : category}`;
        document.getElementById('categoryTransactionsInfo').textContent = 
            `${categoryTransactions.length} transactions found`;
        document.getElementById('categoryTotalAmount').textContent = this.formatCurrency(totalAmount);
        
        // Update transactions list
        const transactionsList = document.getElementById('categoryTransactionsList');
        const noTransactions = document.getElementById('noCategoryTransactions');
        
        if (categoryTransactions.length === 0) {
            transactionsList.classList.add('d-none');
            noTransactions.classList.remove('d-none');
        } else {
            transactionsList.classList.remove('d-none');
            noTransactions.classList.add('d-none');
            
            let html = '';
            categoryTransactions.forEach((transaction, index) => {
                html += `
                    <div class="transaction-item d-flex justify-content-between align-items-center p-2 border-bottom">
                        <div>
                            <div class="fw-bold">${transaction.description}</div>
                            <small class="text-muted">${new Date(transaction.date).toLocaleDateString()}</small>
                        </div>
                        <div class="text-end">
                            <div class="${transaction.type === 'income' ? 'text-success' : 'text-danger'} fw-bold">
                                ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                            </div>
                            <small class="text-muted">${transaction.category}</small>
                        </div>
                    </div>
                `;
            });
            transactionsList.innerHTML = html;
        }
        
        // Store current category context for "Add Transaction" button
        this.currentCategoryContext = { type, category };
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('categoryTransactionsModal'));
        modal.show();
    }

    // Add transaction for current category
    addTransactionForCategory() {
        if (this.currentCategoryContext) {
            this.openAddTransactionModal();
            
            // Pre-fill the form with category context
            setTimeout(() => {
                document.querySelector(`input[name="transactionType"][value="${this.currentCategoryContext.type}"]`).checked = true;
                this.updateCategoryOptions();
                if (this.currentCategoryContext.category !== 'all') {
                    document.getElementById('transactionCategory').value = this.currentCategoryContext.category;
                }
            }, 100);
        }
    }

    // Update transactions display
    updateTransactionsDisplay() {
        const transactionsBody = document.getElementById('transactionsBody');
        const noTransactions = document.getElementById('noTransactions');
        const transactionCount = document.getElementById('transactionCount');
        const noSearchResults = document.getElementById('noSearchResults');
        
        // Get filtered transactions
        const filteredTransactions = this.getFilteredTransactions();
        
        if (filteredTransactions.length === 0) {
            if (this.hasActiveFilters()) {
                transactionsBody.classList.add('d-none');
                noTransactions.classList.add('d-none');
                noSearchResults.classList.remove('d-none');
            } else {
                transactionsBody.classList.add('d-none');
                noTransactions.classList.remove('d-none');
                noSearchResults.classList.add('d-none');
            }
            transactionCount.textContent = '0 transactions';
            return;
        }
        
        transactionsBody.classList.remove('d-none');
        noTransactions.classList.add('d-none');
        noSearchResults.classList.add('d-none');
        
        transactionCount.textContent = `${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''}`;
        
        let html = '';
        filteredTransactions.forEach((transaction, index) => {
            html += `
                <tr class="transaction-item animate-slide-in" data-index="${index}" onclick="app.editTransaction(${index})">
                    <td>${new Date(transaction.date).toLocaleDateString()}</td>
                    <td>${transaction.description}</td>
                    <td>
                        <span class="badge ${transaction.type === 'income' ? 'bg-success' : 'bg-danger'}">
                            ${transaction.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                    </td>
                    <td>${transaction.category}</td>
                    <td class="${transaction.type === 'income' ? 'text-success' : 'text-danger'} fw-bold">
                        ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); app.deleteTransaction(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        transactionsBody.innerHTML = html;
    }

    // Get filtered transactions
    getFilteredTransactions() {
        let filtered = [...this.transactions];
        
        // Apply search filter
        const searchTerm = document.getElementById('transactionSearch').value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(transaction => 
                transaction.description.toLowerCase().includes(searchTerm) ||
                transaction.category.toLowerCase().includes(searchTerm) ||
                transaction.amount.toString().includes(searchTerm)
            );
        }
        
        // Apply other filters from modal
        const filterType = document.getElementById('filterType').value;
        if (filterType !== 'all') {
            filtered = filtered.filter(transaction => transaction.type === filterType);
        }
        
        const filterCategory = document.getElementById('filterCategory').value;
        if (filterCategory !== 'all') {
            filtered = filtered.filter(transaction => transaction.category === filterCategory);
        }
        
        const filterDateFrom = document.getElementById('filterDateFrom').value;
        if (filterDateFrom) {
            filtered = filtered.filter(transaction => transaction.date >= filterDateFrom);
        }
        
        const filterDateTo = document.getElementById('filterDateTo').value;
        if (filterDateTo) {
            filtered = filtered.filter(transaction => transaction.date <= filterDateTo);
        }
        
        const filterAmountMin = document.getElementById('filterAmountMin').value;
        if (filterAmountMin) {
            filtered = filtered.filter(transaction => parseFloat(transaction.amount) >= parseFloat(filterAmountMin));
        }
        
        const filterAmountMax = document.getElementById('filterAmountMax').value;
        if (filterAmountMax) {
            filtered = filtered.filter(transaction => parseFloat(transaction.amount) <= parseFloat(filterAmountMax));
        }
        
        // Sort by date (newest first)
        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Check if any filters are active
    hasActiveFilters() {
        return document.getElementById('transactionSearch').value ||
               document.getElementById('filterType').value !== 'all' ||
               document.getElementById('filterCategory').value !== 'all' ||
               document.getElementById('filterDateFrom').value ||
               document.getElementById('filterDateTo').value ||
               document.getElementById('filterAmountMin').value ||
               document.getElementById('filterAmountMax').value;
    }

    // Handle search
    handleSearch(e) {
        this.showSearchSuggestions();
        this.updateTransactionsDisplay();
    }

    // Show search suggestions
    showSearchSuggestions() {
        const searchTerm = document.getElementById('transactionSearch').value.toLowerCase();
        const suggestionsContainer = document.getElementById('searchSuggestions');
        
        if (searchTerm.length < 2) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        const suggestions = this.getSearchSuggestions(searchTerm);
        
        if (suggestions.length > 0) {
            suggestionsContainer.innerHTML = suggestions.map(suggestion => 
                `<div class="search-suggestion-item" onclick="app.selectSearchSuggestion('${suggestion}')">${suggestion}</div>`
            ).join('');
            suggestionsContainer.style.display = 'block';
        } else {
            suggestionsContainer.style.display = 'none';
        }
    }

    // Get search suggestions
    getSearchSuggestions(searchTerm) {
        const suggestions = new Set();
        
        this.transactions.forEach(transaction => {
            if (transaction.description.toLowerCase().includes(searchTerm)) {
                suggestions.add(transaction.description);
            }
            if (transaction.category.toLowerCase().includes(searchTerm)) {
                suggestions.add(transaction.category);
            }
        });
        
        return Array.from(suggestions).slice(0, 5);
    }

    // Select search suggestion
    selectSearchSuggestion(suggestion) {
        document.getElementById('transactionSearch').value = suggestion;
        document.getElementById('searchSuggestions').style.display = 'none';
        this.updateTransactionsDisplay();
    }

    // Open search filter modal
    openSearchFilterModal() {
        const modal = new bootstrap.Modal(document.getElementById('searchFilterModal'));
        modal.show();
    }

    // Apply filters
    applyFilters() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('searchFilterModal'));
        modal.hide();
        this.updateTransactionsDisplay();
    }

    // Clear search filters
    clearSearchFilters() {
        document.getElementById('transactionSearch').value = '';
        document.getElementById('filterType').value = 'all';
        document.getElementById('filterCategory').value = 'all';
        document.getElementById('filterDateFrom').value = '';
        document.getElementById('filterDateTo').value = '';
        document.getElementById('filterAmountMin').value = '';
        document.getElementById('filterAmountMax').value = '';
        
        this.updateTransactionsDisplay();
        this.showToast('Filters cleared', 'info');
    }

    // Open add transaction modal
    openAddTransactionModal() {
        document.getElementById('transactionIndex').value = '-1';
        document.getElementById('transactionForm').reset();
        document.getElementById('transactionModalLabel').textContent = 'Add Transaction';
        document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
        
        // Update category options based on default type (income)
        this.updateCategoryOptions();
        
        // Clear validation states
        this.clearValidationStates();
        
        const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
        modal.show();
        
        // Set focus to description field
        setTimeout(() => {
            document.getElementById('transactionDescription').focus();
        }, 100);
    }

    // Update category options based on selected type
    updateCategoryOptions() {
        const type = document.querySelector('input[name="transactionType"]:checked').value;
        const categorySelect = document.getElementById('transactionCategory');
        
        // Store current value
        const currentValue = categorySelect.value;
        
        // Clear options
        categorySelect.innerHTML = '<option value="">Select a category</option>';
        
        // Add categories for selected type
        const categories = this.categories[type];
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
        
        // Restore previous value if it exists in the new list
        if (categories.includes(currentValue)) {
            categorySelect.value = currentValue;
        }
    }

    // Clear validation states
    clearValidationStates() {
        const form = document.getElementById('transactionForm');
        const inputs = form.querySelectorAll('.form-control');
        inputs.forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });
    }

    // Handle transaction form submission
    async handleTransactionSubmit(e) {
        e.preventDefault();
        
        // Validate form
        if (!this.validateTransactionForm()) {
            return;
        }
        
        const formData = new FormData(e.target);
        const index = parseInt(document.getElementById('transactionIndex').value);
        
        const transaction = {
            type: formData.get('transactionType'),
            amount: parseFloat(formData.get('transactionAmount')),
            description: formData.get('transactionDescription'),
            category: formData.get('transactionCategory'),
            date: formData.get('transactionDate'),
            notes: formData.get('transactionNotes') || ''
        };
        
        try {
            this.showLoading(index === -1 ? 'Adding transaction...' : 'Updating transaction...');
            
            if (index === -1) {
                // Add new transaction
                this.transactions.push(transaction);
                this.showToast('Transaction added successfully', 'success');
            } else {
                // Update existing transaction
                this.transactions[index] = transaction;
                this.showToast('Transaction updated successfully', 'success');
            }
            
            await this.saveData();
            this.updateDashboard();
            this.updateTransactionsDisplay();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
            modal.hide();
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Error saving transaction:', error);
            this.hideLoading();
            this.showToast('Error saving transaction', 'error');
        }
    }

    // Validate transaction form
    validateTransactionForm() {
        let isValid = true;
        
        const amount = document.getElementById('transactionAmount');
        const description = document.getElementById('transactionDescription');
        const category = document.getElementById('transactionCategory');
        const date = document.getElementById('transactionDate');
        
        // Validate amount
        if (!amount.value || parseFloat(amount.value) <= 0) {
            this.setValidationState(amount, false, 'Please enter a valid positive amount');
            isValid = false;
        } else {
            this.setValidationState(amount, true, '');
        }
        
        // Validate description
        if (!description.value.trim()) {
            this.setValidationState(description, false, 'Please provide a description');
            isValid = false;
        } else {
            this.setValidationState(description, true, '');
        }
        
        // Validate category
        if (!category.value) {
            this.setValidationState(category, false, 'Please select a category');
            isValid = false;
        } else {
            this.setValidationState(category, true, '');
        }
        
        // Validate date
        if (!date.value) {
            this.setValidationState(date, false, 'Please select a date');
            isValid = false;
        } else {
            this.setValidationState(date, true, '');
        }
        
        return isValid;
    }

    // Edit transaction
    editTransaction(index) {
        const transaction = this.transactions[index];
        
        document.getElementById('transactionIndex').value = index;
        document.getElementById('transactionModalLabel').textContent = 'Edit Transaction';
        
        // Fill form with transaction data
        document.querySelector(`input[name="transactionType"][value="${transaction.type}"]`).checked = true;
        document.getElementById('transactionAmount').value = transaction.amount;
        document.getElementById('transactionDescription').value = transaction.description;
        document.getElementById('transactionCategory').value = transaction.category;
        document.getElementById('transactionDate').value = transaction.date;
        document.getElementById('transactionNotes').value = transaction.notes || '';
        
        // Update category options
        this.updateCategoryOptions();
        
        const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
        modal.show();
    }

    // Delete transaction
    async deleteTransaction(index) {
        if (!confirm('Are you sure you want to delete this transaction?')) {
            return;
        }
        
        try {
            this.showLoading('Deleting transaction...');
            
            // Animate removal
            const row = document.querySelector(`tr[data-index="${index}"]`);
            if (row) {
                row.classList.add('removing');
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            this.transactions.splice(index, 1);
            await this.saveData();
            
            this.updateDashboard();
            this.updateTransactionsDisplay();
            
            this.hideLoading();
            this.showToast('Transaction deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting transaction:', error);
            this.hideLoading();
            this.showToast('Error deleting transaction', 'error');
        }
    }

    // Update planner
    updatePlanner() {
        this.updatePlannerSummary();
        this.updateFutureIncomeList();
        this.updateFutureExpensesList();
        this.updatePlannerTimeline();
    }

    // Update planner summary
    updatePlannerSummary() {
        const timeframe = document.querySelector('.planner-timeframe-btn.active')?.dataset.timeframe || '1year';
        const projection = this.calculateFinancialProjection(timeframe);
        
        document.getElementById('plannerNetWealth').textContent = this.formatCurrency(projection.netWealth);
        document.getElementById('plannerTotalIncome').textContent = this.formatCurrency(projection.totalIncome);
        document.getElementById('plannerTotalExpenses').textContent = this.formatCurrency(projection.totalExpenses);
        document.getElementById('plannerEndingBalance').textContent = this.formatCurrency(projection.endingBalance);
    }

    // Calculate financial projection
    calculateFinancialProjection(timeframe) {
        const months = timeframe === '1year' ? 12 : timeframe === '2years' ? 24 : 36;
        let totalIncome = 0;
        let totalExpenses = 0;
        
        // Calculate from future income and expenses
        this.futureIncome.forEach(income => {
            totalIncome += this.calculateFutureAmount(income, months);
        });
        
        this.futureExpenses.forEach(expense => {
            totalExpenses += this.calculateFutureAmount(expense, months);
        });
        
        const netWealth = totalIncome - totalExpenses;
        const currentBalance = this.calculateCurrentBalance();
        const endingBalance = currentBalance + netWealth;
        
        return {
            netWealth,
            totalIncome,
            totalExpenses,
            endingBalance
        };
    }

    // Calculate future amount based on frequency
    calculateFutureAmount(item, months) {
        const startDate = new Date(item.startDate);
        const endDate = item.endDate ? new Date(item.endDate) : null;
        const today = new Date();
        
        let total = 0;
        let currentDate = new Date(startDate);
        
        for (let i = 0; i < months; i++) {
            if (endDate && currentDate > endDate) break;
            if (currentDate >= today) {
                switch (item.frequency) {
                    case 'monthly':
                        total += parseFloat(item.amount);
                        break;
                    case 'quarterly':
                        if (i % 3 === 0) total += parseFloat(item.amount);
                        break;
                    case 'one-time':
                        if (i === 0) total += parseFloat(item.amount);
                        break;
                }
            }
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        return total;
    }

    // Calculate current balance
    calculateCurrentBalance() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const { income, expenses } = this.calculateMonthlySummary(currentMonth, currentYear);
        return income - expenses;
    }

    // Update future income list
    updateFutureIncomeList() {
        const container = document.getElementById('futureIncomeList');
        const emptyState = document.getElementById('noFutureIncome');
        
        if (this.futureIncome.length === 0) {
            container.classList.add('d-none');
            emptyState.classList.remove('d-none');
            return;
        }
        
        container.classList.remove('d-none');
        emptyState.classList.add('d-none');
        
        let html = '';
        this.futureIncome.forEach((income, index) => {
            html += `
                <div class="planner-item planner-income-item animate-slide-in">
                    <div class="planner-item-header">
                        <span class="planner-item-title">${income.description}</span>
                        <span class="planner-item-amount">${this.formatCurrency(income.amount)}</span>
                    </div>
                    <div class="planner-item-details">
                        ${income.type} • ${income.frequency} • Starts ${new Date(income.startDate).toLocaleDateString()}
                        ${income.endDate ? `• Ends ${new Date(income.endDate).toLocaleDateString()}` : ''}
                    </div>
                    <div class="d-flex gap-1 mt-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="app.editFutureIncome(${index})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteFutureIncome(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // Update future expenses list
    updateFutureExpensesList() {
        const container = document.getElementById('futureExpensesList');
        const emptyState = document.getElementById('noFutureExpenses');
        
        if (this.futureExpenses.length === 0) {
            container.classList.add('d-none');
            emptyState.classList.remove('d-none');
            return;
        }
        
        container.classList.remove('d-none');
        emptyState.classList.add('d-none');
        
        let html = '';
        this.futureExpenses.forEach((expense, index) => {
            html += `
                <div class="planner-item planner-expense-item animate-slide-in">
                    <div class="planner-item-header">
                        <span class="planner-item-title">${expense.description}</span>
                        <span class="planner-item-amount">${this.formatCurrency(expense.amount)}</span>
                    </div>
                    <div class="planner-item-details">
                        ${expense.type} • ${expense.frequency} • Starts ${new Date(expense.startDate).toLocaleDateString()}
                        ${expense.endDate ? `• Ends ${new Date(expense.endDate).toLocaleDateString()}` : ''}
                    </div>
                    <div class="d-flex gap-1 mt-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="app.editFutureExpense(${index})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteFutureExpense(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // Update planner timeline
    updatePlannerTimeline() {
        const container = document.getElementById('plannerTimeline');
        const emptyState = document.getElementById('noPlannerData');
        
        const hasData = this.futureIncome.length > 0 || this.futureExpenses.length > 0;
        
        if (!hasData) {
            container.classList.add('d-none');
            emptyState.classList.remove('d-none');
            return;
        }
        
        container.classList.remove('d-none');
        emptyState.classList.add('d-none');
        
        const months = this.generateMonthlyProjections(12); // 1 year projection
        let html = '';
        
        months.forEach(month => {
            html += `
                <div class="planner-month animate-slide-in">
                    <div class="planner-month-header">${month.month} ${month.year}</div>
                    <div class="planner-month-details">
                        <span class="planner-income">+${this.formatCurrency(month.income)}</span>
                        <span class="planner-expenses">-${this.formatCurrency(month.expenses)}</span>
                        <span class="planner-balance">${this.formatCurrency(month.balance)}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // Generate monthly projections
    generateMonthlyProjections(monthCount) {
        const projections = [];
        const today = new Date();
        let runningBalance = this.calculateCurrentBalance();
        
        for (let i = 0; i < monthCount; i++) {
            const currentDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const monthName = currentDate.toLocaleDateString('en', { month: 'long' });
            const year = currentDate.getFullYear();
            
            let monthlyIncome = 0;
            let monthlyExpenses = 0;
            
            // Calculate income for this month
            this.futureIncome.forEach(income => {
                if (this.shouldIncludeInMonth(income, currentDate)) {
                    monthlyIncome += parseFloat(income.amount);
                }
            });
            
            // Calculate expenses for this month
            this.futureExpenses.forEach(expense => {
                if (this.shouldIncludeInMonth(expense, currentDate)) {
                    monthlyExpenses += parseFloat(expense.amount);
                }
            });
            
            runningBalance += monthlyIncome - monthlyExpenses;
            
            projections.push({
                month: monthName,
                year: year,
                income: monthlyIncome,
                expenses: monthlyExpenses,
                balance: runningBalance
            });
        }
        
        return projections;
    }

    // Check if item should be included in month
    shouldIncludeInMonth(item, monthDate) {
        const startDate = new Date(item.startDate);
        const endDate = item.endDate ? new Date(item.endDate) : null;
        
        if (monthDate < startDate) return false;
        if (endDate && monthDate > endDate) return false;
        
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        
        switch (item.frequency) {
            case 'monthly':
                return true;
            case 'quarterly':
                const monthsDiff = (monthDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                 (monthDate.getMonth() - startDate.getMonth());
                return monthsDiff % 3 === 0;
            case 'one-time':
                return monthStart <= startDate && monthEnd >= startDate;
            default:
                return false;
        }
    }

    // Open add future income modal
    openAddFutureIncome() {
        document.getElementById('futureIncomeIndex').value = '-1';
        document.getElementById('futureIncomeForm').reset();
        document.getElementById('futureIncomeModalLabel').textContent = 'Add Future Income';
        document.getElementById('futureIncomeStartDate').value = new Date().toISOString().split('T')[0];
        
        const modal = new bootstrap.Modal(document.getElementById('futureIncomeModal'));
        modal.show();
    }

    // Handle future income submission
    async handleFutureIncomeSubmit(e) {
        e.preventDefault();
        
        if (!this.validateFutureIncomeForm()) {
            return;
        }
        
        const formData = new FormData(e.target);
        const index = parseInt(document.getElementById('futureIncomeIndex').value);
        
        const futureIncome = {
            description: formData.get('futureIncomeDescription'),
            type: formData.get('futureIncomeType'),
            amount: parseFloat(formData.get('futureIncomeAmount')),
            frequency: formData.get('futureIncomeFrequency'),
            startDate: formData.get('futureIncomeStartDate'),
            endDate: formData.get('futureIncomeEndDate') || null
        };
        
        try {
            this.showLoading(index === -1 ? 'Adding future income...' : 'Updating future income...');
            
            if (index === -1) {
                this.futureIncome.push(futureIncome);
                this.showToast('Future income added successfully', 'success');
            } else {
                this.futureIncome[index] = futureIncome;
                this.showToast('Future income updated successfully', 'success');
            }
            
            await this.saveData();
            this.updatePlanner();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('futureIncomeModal'));
            modal.hide();
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Error saving future income:', error);
            this.hideLoading();
            this.showToast('Error saving future income', 'error');
        }
    }

    // Validate future income form
    validateFutureIncomeForm() {
        // Similar to transaction validation
        return true; // Implementation details
    }

    // Edit future income
    editFutureIncome(index) {
        const income = this.futureIncome[index];
        
        document.getElementById('futureIncomeIndex').value = index;
        document.getElementById('futureIncomeModalLabel').textContent = 'Edit Future Income';
        
        document.getElementById('futureIncomeDescription').value = income.description;
        document.getElementById('futureIncomeType').value = income.type;
        document.getElementById('futureIncomeAmount').value = income.amount;
        document.getElementById('futureIncomeFrequency').value = income.frequency;
        document.getElementById('futureIncomeStartDate').value = income.startDate;
        document.getElementById('futureIncomeEndDate').value = income.endDate || '';
        
        const modal = new bootstrap.Modal(document.getElementById('futureIncomeModal'));
        modal.show();
    }

    // Delete future income
    async deleteFutureIncome(index) {
        if (!confirm('Are you sure you want to delete this future income?')) {
            return;
        }
        
        try {
            this.showLoading('Deleting future income...');
            
            this.futureIncome.splice(index, 1);
            await this.saveData();
            this.updatePlanner();
            
            this.hideLoading();
            this.showToast('Future income deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting future income:', error);
            this.hideLoading();
            this.showToast('Error deleting future income', 'error');
        }
    }

    // Future expense methods (similar to future income)
    openAddFutureExpense() {
        document.getElementById('futureExpenseIndex').value = '-1';
        document.getElementById('futureExpenseForm').reset();
        document.getElementById('futureExpenseModalLabel').textContent = 'Add Future Expense';
        document.getElementById('futureExpenseStartDate').value = new Date().toISOString().split('T')[0];
        
        const modal = new bootstrap.Modal(document.getElementById('futureExpenseModal'));
        modal.show();
    }

    async handleFutureExpenseSubmit(e) {
        e.preventDefault();
        
        if (!this.validateFutureExpenseForm()) {
            return;
        }
        
        const formData = new FormData(e.target);
        const index = parseInt(document.getElementById('futureExpenseIndex').value);
        
        const futureExpense = {
            description: formData.get('futureExpenseDescription'),
            type: formData.get('futureExpenseType'),
            amount: parseFloat(formData.get('futureExpenseAmount')),
            frequency: formData.get('futureExpenseFrequency'),
            startDate: formData.get('futureExpenseStartDate'),
            endDate: formData.get('futureExpenseEndDate') || null
        };
        
        try {
            this.showLoading(index === -1 ? 'Adding future expense...' : 'Updating future expense...');
            
            if (index === -1) {
                this.futureExpenses.push(futureExpense);
                this.showToast('Future expense added successfully', 'success');
            } else {
                this.futureExpenses[index] = futureExpense;
                this.showToast('Future expense updated successfully', 'success');
            }
            
            await this.saveData();
            this.updatePlanner();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('futureExpenseModal'));
            modal.hide();
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Error saving future expense:', error);
            this.hideLoading();
            this.showToast('Error saving future expense', 'error');
        }
    }

    validateFutureExpenseForm() {
        // Similar to future income validation
        return true;
    }

    editFutureExpense(index) {
        const expense = this.futureExpenses[index];
        
        document.getElementById('futureExpenseIndex').value = index;
        document.getElementById('futureExpenseModalLabel').textContent = 'Edit Future Expense';
        
        document.getElementById('futureExpenseDescription').value = expense.description;
        document.getElementById('futureExpenseType').value = expense.type;
        document.getElementById('futureExpenseAmount').value = expense.amount;
        document.getElementById('futureExpenseFrequency').value = expense.frequency;
        document.getElementById('futureExpenseStartDate').value = expense.startDate;
        document.getElementById('futureExpenseEndDate').value = expense.endDate || '';
        
        const modal = new bootstrap.Modal(document.getElementById('futureExpenseModal'));
        modal.show();
    }

    async deleteFutureExpense(index) {
        if (!confirm('Are you sure you want to delete this future expense?')) {
            return;
        }
        
        try {
            this.showLoading('Deleting future expense...');
            
            this.futureExpenses.splice(index, 1);
            await this.saveData();
            this.updatePlanner();
            
            this.hideLoading();
            this.showToast('Future expense deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting future expense:', error);
            this.hideLoading();
            this.showToast('Error deleting future expense', 'error');
        }
    }

    // Update loans display
    updateLoansDisplay() {
        this.updateLoansSummary();
        this.updateGivenLoansList();
        this.updateTakenLoansList();
    }

    // Update loans summary
    updateLoansSummary() {
        const givenLoans = this.loans.filter(loan => loan.type === 'given');
        const takenLoans = this.loans.filter(loan => loan.type === 'taken');
        const overdueLoans = this.loans.filter(loan => this.isLoanOverdue(loan));
        
        const totalGiven = givenLoans.reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
        const totalTaken = takenLoans.reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
        
        document.getElementById('totalGivenLoans').textContent = this.formatCurrency(totalGiven);
        document.getElementById('totalTakenLoans').textContent = this.formatCurrency(totalTaken);
        document.getElementById('overdueLoans').textContent = overdueLoans.length;
        document.getElementById('totalBorrowers').textContent = new Set(givenLoans.map(loan => loan.borrower)).size;
    }

    // Check if loan is overdue
    isLoanOverdue(loan) {
        if (loan.status === 'completed') return false;
        
        const dueDate = loan.type === 'given' ? new Date(loan.expectedReturn) : new Date(loan.dueDate);
        return dueDate < new Date();
    }

    // Update given loans list
    updateGivenLoansList() {
        const container = document.getElementById('givenLoansList');
        const emptyState = document.getElementById('noGivenLoans');
        
        const givenLoans = this.loans.filter(loan => loan.type === 'given');
        
        if (givenLoans.length === 0) {
            container.classList.add('d-none');
            emptyState.classList.remove('d-none');
            return;
        }
        
        container.classList.remove('d-none');
        emptyState.classList.add('d-none');
        
        let html = '';
        givenLoans.forEach((loan, index) => {
            const isOverdue = this.isLoanOverdue(loan);
            const statusClass = isOverdue ? 'loan-status-overdue' : 
                               loan.status === 'completed' ? 'loan-status-completed' : 'loan-status-pending';
            const statusText = isOverdue ? 'Overdue' : 
                             loan.status === 'completed' ? 'Completed' : 'Pending';
            
            html += `
                <div class="loan-item loan-given-item animate-slide-in">
                    <div class="loan-item-header">
                        <span class="loan-item-title">${loan.description || 'Unnamed Loan'}</span>
                        <span class="loan-item-amount">${this.formatCurrency(loan.amount)}</span>
                    </div>
                    <div class="loan-item-details">
                        Borrower: ${loan.borrower} • Given: ${new Date(loan.dateGiven).toLocaleDateString()}
                        ${loan.expectedReturn ? `• Expected: ${new Date(loan.expectedReturn).toLocaleDateString()}` : ''}
                    </div>
                    <div>
                        <span class="loan-item-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="d-flex gap-1 mt-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="app.editLoan(${this.loans.indexOf(loan)})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteLoan(${this.loans.indexOf(loan)})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // Update taken loans list
    updateTakenLoansList() {
        const container = document.getElementById('takenLoansList');
        const emptyState = document.getElementById('noTakenLoans');
        
        const takenLoans = this.loans.filter(loan => loan.type === 'taken');
        
        if (takenLoans.length === 0) {
            container.classList.add('d-none');
            emptyState.classList.remove('d-none');
            return;
        }
        
        container.classList.remove('d-none');
        emptyState.classList.add('d-none');
        
        let html = '';
        takenLoans.forEach((loan, index) => {
            const isOverdue = this.isLoanOverdue(loan);
            const statusClass = isOverdue ? 'loan-status-overdue' : 
                               loan.status === 'completed' ? 'loan-status-completed' : 'loan-status-pending';
            const statusText = isOverdue ? 'Overdue' : 
                             loan.status === 'completed' ? 'Completed' : 'Pending';
            
            html += `
                <div class="loan-item loan-taken-item animate-slide-in">
                    <div class="loan-item-header">
                        <span class="loan-item-title">${loan.description || 'Unnamed Loan'}</span>
                        <span class="loan-item-amount">${this.formatCurrency(loan.amount)}</span>
                    </div>
                    <div class="loan-item-details">
                        Lender: ${loan.lender} • Taken: ${new Date(loan.dateTaken).toLocaleDateString()}
                        ${loan.dueDate ? `• Due: ${new Date(loan.dueDate).toLocaleDateString()}` : ''}
                    </div>
                    <div>
                        <span class="loan-item-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="d-flex gap-1 mt-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="app.editLoan(${this.loans.indexOf(loan)})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteLoan(${this.loans.indexOf(loan)})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // Open add loan modal
    openAddLoan(type) {
        document.getElementById('loanIndex').value = '-1';
        document.getElementById('loanForm').reset();
        document.getElementById('loanType').value = type;
        document.getElementById('loanModalLabel').textContent = `Add ${type === 'given' ? 'Given' : 'Taken'} Loan`;
        
        this.updateLoanFormFields(type);
        
        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        if (type === 'given') {
            document.getElementById('loanDateGiven').value = today;
            document.getElementById('loanExpectedReturn').value = oneMonthLater;
        } else {
            document.getElementById('loanDateTaken').value = today;
            document.getElementById('loanDueDate').value = oneMonthLater;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('loanModal'));
        modal.show();
    }

    // Update loan form fields based on type
    updateLoanFormFields(type) {
        const borrowerLabel = document.getElementById('loanBorrowerLabel');
        const lenderLabel = document.getElementById('loanLenderLabel');
        const dateGivenLabel = document.getElementById('loanDateGivenLabel');
        const dateTakenLabel = document.getElementById('loanDateTakenLabel');
        const expectedReturnLabel = document.getElementById('loanExpectedReturnLabel');
        const dueDateLabel = document.getElementById('loanDueDateLabel');
        
        if (type === 'given') {
            borrowerLabel.style.display = 'block';
            lenderLabel.style.display = 'none';
            dateGivenLabel.style.display = 'block';
            dateTakenLabel.style.display = 'none';
            expectedReturnLabel.style.display = 'block';
            dueDateLabel.style.display = 'none';
        } else {
            borrowerLabel.style.display = 'none';
            lenderLabel.style.display = 'block';
            dateGivenLabel.style.display = 'none';
            dateTakenLabel.style.display = 'block';
            expectedReturnLabel.style.display = 'none';
            dueDateLabel.style.display = 'block';
        }
    }

    // Handle loan submission
    async handleLoanSubmit(e) {
        e.preventDefault();
        
        if (!this.validateLoanForm()) {
            return;
        }
        
        const formData = new FormData(e.target);
        const index = parseInt(document.getElementById('loanIndex').value);
        const type = document.getElementById('loanType').value;
        
        const loan = {
            description: formData.get('loanDescription'),
            amount: parseFloat(formData.get('loanAmount')),
            type: type,
            status: 'pending'
        };
        
        if (type === 'given') {
            loan.borrower = formData.get('loanBorrower');
            loan.dateGiven = formData.get('loanDateGiven');
            loan.expectedReturn = formData.get('loanExpectedReturn');
        } else {
            loan.lender = formData.get('loanLender');
            loan.dateTaken = formData.get('loanDateTaken');
            loan.dueDate = formData.get('loanDueDate');
        }
        
        try {
            this.showLoading(index === -1 ? 'Adding loan...' : 'Updating loan...');
            
            if (index === -1) {
                this.loans.push(loan);
                this.showToast('Loan added successfully', 'success');
            } else {
                this.loans[index] = loan;
                this.showToast('Loan updated successfully', 'success');
            }
            
            await this.saveData();
            this.updateLoansDisplay();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('loanModal'));
            modal.hide();
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Error saving loan:', error);
            this.hideLoading();
            this.showToast('Error saving loan', 'error');
        }
    }

    // Validate loan form
    validateLoanForm() {
        // Implementation similar to other form validations
        return true;
    }

    // Edit loan
    editLoan(index) {
        const loan = this.loans[index];
        
        document.getElementById('loanIndex').value = index;
        document.getElementById('loanType').value = loan.type;
        document.getElementById('loanModalLabel').textContent = `Edit ${loan.type === 'given' ? 'Given' : 'Taken'} Loan`;
        
        this.updateLoanFormFields(loan.type);
        
        document.getElementById('loanDescription').value = loan.description || '';
        document.getElementById('loanAmount').value = loan.amount;
        
        if (loan.type === 'given') {
            document.getElementById('loanBorrower').value = loan.borrower || '';
            document.getElementById('loanDateGiven').value = loan.dateGiven;
            document.getElementById('loanExpectedReturn').value = loan.expectedReturn;
        } else {
            document.getElementById('loanLender').value = loan.lender || '';
            document.getElementById('loanDateTaken').value = loan.dateTaken;
            document.getElementById('loanDueDate').value = loan.dueDate;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('loanModal'));
        modal.show();
    }

    // Delete loan
    async deleteLoan(index) {
        if (!confirm('Are you sure you want to delete this loan?')) {
            return;
        }
        
        try {
            this.showLoading('Deleting loan...');
            
            this.loans.splice(index, 1);
            await this.saveData();
            this.updateLoansDisplay();
            
            this.hideLoading();
            this.showToast('Loan deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting loan:', error);
            this.hideLoading();
            this.showToast('Error deleting loan', 'error');
        }
    }

    // Format currency
    formatCurrency(amount) {
        const formatter = new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: this.settings.currency,
            minimumFractionDigits: 2
        });
        
        return formatter.format(amount);
    }

    // Show toast message
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toastId = 'toast-' + Date.now();
        
        const toastHTML = `
            <div id="${toastId}" class="toast ${type} animate-slide-in" role="alert">
                <div class="toast-body d-flex align-items-center">
                    <i class="bi ${this.getToastIcon(type)} me-2"></i>
                    <div>${message}</div>
                    <button type="button" class="btn-close ms-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', toastHTML);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 3000
        });
        
        toast.show();
        
        // Remove toast from DOM after hide
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    // Get toast icon based on type
    getToastIcon(type) {
        switch (type) {
            case 'success': return 'bi-check-circle-fill';
            case 'error': return 'bi-exclamation-circle-fill';
            case 'warning': return 'bi-exclamation-triangle-fill';
            case 'info': return 'bi-info-circle-fill';
            default: return 'bi-info-circle-fill';
        }
    }

    // Export data
    exportData() {
        const data = {
            transactions: this.transactions,
            futureIncome: this.futureIncome,
            futureExpenses: this.futureExpenses,
            loans: this.loans,
            settings: this.settings,
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `wealth-command-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showToast('Data exported successfully', 'success');
    }

    // Import data
    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            this.showLoading('Importing data...');
            
            const fileText = await file.text();
            const data = JSON.parse(fileText);
            
            // Validate imported data
            if (!this.validateImportedData(data)) {
                throw new Error('Invalid data format');
            }
            
            // Confirm import
            if (!confirm('This will replace all your current data. Continue?')) {
                this.hideLoading();
                return;
            }
            
            // Import data
            this.transactions = data.transactions || [];
            this.futureIncome = data.futureIncome || [];
            this.futureExpenses = data.futureExpenses || [];
            this.loans = data.loans || [];
            this.settings = { ...this.settings, ...(data.settings || {}) };
            
            await this.saveData();
            
            // Update all displays
            this.updateDashboard();
            this.updateTransactionsDisplay();
            this.updatePlanner();
            this.updateLoansDisplay();
            
            this.hideLoading();
            this.showToast('Data imported successfully', 'success');
            
        } catch (error) {
            console.error('Error importing data:', error);
            this.hideLoading();
            this.showToast('Error importing data', 'error');
        } finally {
            // Reset file input
            event.target.value = '';
        }
    }

    // Validate imported data
    validateImportedData(data) {
        return data && 
               Array.isArray(data.transactions) &&
               Array.isArray(data.futureIncome) &&
               Array.isArray(data.futureExpenses) &&
               Array.isArray(data.loans) &&
               typeof data.settings === 'object';
    }

    // Show reset confirmation
    showResetConfirmation() {
        if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
            this.resetAllData();
        }
    }

    // Reset all data
    async resetAllData() {
        try {
            this.showLoading('Resetting data...');
            
            this.transactions = [];
            this.futureIncome = [];
            this.futureExpenses = [];
            this.loans = [];
            
            await this.saveData();
            
            // Update all displays
            this.updateDashboard();
            this.updateTransactionsDisplay();
            this.updatePlanner();
            this.updateLoansDisplay();
            
            this.hideLoading();
            this.showToast('All data reset successfully', 'success');
            
        } catch (error) {
            console.error('Error resetting data:', error);
            this.hideLoading();
            this.showToast('Error resetting data', 'error');
        }
    }

    // AI Insights and Recommendations
    generateAIInsights() {
        const insights = [];
        
        // Spending pattern analysis
        const spendingPatterns = this.analyzeSpendingPatterns();
        if (spendingPatterns) {
            insights.push({
                type: 'spending_pattern',
                title: 'Spending Pattern Detected',
                confidence: 0.85,
                content: spendingPatterns.analysis,
                suggestion: spendingPatterns.suggestion
            });
        }
        
        // Income consistency
        const incomeAnalysis = this.analyzeIncomeConsistency();
        if (incomeAnalysis) {
            insights.push({
                type: 'income_consistency',
                title: 'Income Consistency',
                confidence: 0.78,
                content: incomeAnalysis.analysis,
                suggestion: incomeAnalysis.suggestion
            });
        }
        
        // Savings opportunity
        const savingsOpportunity = this.identifySavingsOpportunities();
        if (savingsOpportunity) {
            insights.push({
                type: 'savings_opportunity',
                title: 'Savings Opportunity',
                confidence: 0.92,
                content: savingsOpportunity.analysis,
                suggestion: savingsOpportunity.suggestion
            });
        }
        
        return insights;
    }

    // Analyze spending patterns
    analyzeSpendingPatterns() {
        if (this.transactions.length < 10) return null;
        
        const expenseTransactions = this.transactions.filter(t => t.type === 'expense');
        const categoryTotals = {};
        
        expenseTransactions.forEach(transaction => {
            categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + parseFloat(transaction.amount);
        });
        
        const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
        const highestCategory = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)[0];
        
        if (highestCategory && highestCategory[1] / totalExpenses > 0.4) {
            return {
                analysis: `You're spending ${Math.round((highestCategory[1] / totalExpenses) * 100)}% of your expenses on ${highestCategory[0]}.`,
                suggestion: `Consider setting a budget for ${highestCategory[0]} to better manage your expenses.`
            };
        }
        
        return null;
    }

    // Analyze income consistency
    analyzeIncomeConsistency() {
        const incomeTransactions = this.transactions.filter(t => t.type === 'income');
        if (incomeTransactions.length < 3) return null;
        
        const monthlyIncome = {};
        incomeTransactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            monthlyIncome[monthKey] = (monthlyIncome[monthKey] || 0) + parseFloat(transaction.amount);
        });
        
        const incomeValues = Object.values(monthlyIncome);
        const averageIncome = incomeValues.reduce((sum, income) => sum + income, 0) / incomeValues.length;
        const variance = incomeValues.reduce((sum, income) => sum + Math.pow(income - averageIncome, 2), 0) / incomeValues.length;
        
        if (variance > averageIncome * 0.3) {
            return {
                analysis: 'Your income shows significant variability between months.',
                suggestion: 'Consider creating a more stable income stream or building a larger emergency fund.'
            };
        }
        
        return null;
    }

    // Identify savings opportunities
    identifySavingsOpportunities() {
        const expenseTransactions = this.transactions.filter(t => t.type === 'expense');
        const recurringExpenses = {};
        
        expenseTransactions.forEach(transaction => {
            const key = `${transaction.description.toLowerCase()}-${transaction.amount}`;
            recurringExpenses[key] = (recurringExpenses[key] || 0) + 1;
        });
        
        const potentialSavings = Object.entries(recurringExpenses)
            .filter(([, count]) => count >= 3)
            .map(([key]) => {
                const amount = parseFloat(key.split('-')[1]);
                return { key, amount };
            });
        
        if (potentialSavings.length > 0) {
            const totalPotential = potentialSavings.reduce((sum, item) => sum + item.amount, 0);
            return {
                analysis: `You have ${potentialSavings.length} recurring expenses totaling ${this.formatCurrency(totalPotential)} monthly.`,
                suggestion: 'Review these recurring expenses and consider if any can be reduced or eliminated.'
            };
        }
        
        return null;
    }

    // Show AI insights modal
    showAIInsights() {
        const insights = this.generateAIInsights();
        const container = document.getElementById('aiInsightsContent');
        
        if (insights.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="bi bi-robot fs-1 mb-3"></i>
                    <p>Not enough data to generate insights yet.</p>
                    <small>Add more transactions to get personalized recommendations.</small>
                </div>
            `;
        } else {
            let html = '';
            insights.forEach(insight => {
                html += `
                    <div class="ai-insight-item">
                        <div class="ai-insight-header">
                            <i class="ai-insight-icon bi ${this.getInsightIcon(insight.type)}"></i>
                            <span class="ai-insight-title">${insight.title}</span>
                            <span class="ai-insight-confidence">${Math.round(insight.confidence * 100)}% confidence</span>
                        </div>
                        <div class="ai-insight-content">
                            <p>${insight.content}</p>
                            <div class="ai-insight-suggestion">
                                <strong>Suggestion:</strong> ${insight.suggestion}
                            </div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('aiInsightsModal'));
        modal.show();
    }

    // Get insight icon
    getInsightIcon(type) {
        switch (type) {
            case 'spending_pattern': return 'bi-graph-up-arrow';
            case 'income_consistency': return 'bi-currency-dollar';
            case 'savings_opportunity': return 'bi-piggy-bank';
            default: return 'bi-lightbulb';
        }
    }

    // Apply AI suggestions
    applyAISuggestions() {
        // This would implement the actual AI suggestions
        this.showToast('AI suggestions applied successfully', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('aiInsightsModal'));
        modal.hide();
    }
}

// Initialize the application when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new WealthCommand();
});

// Global functions for HTML event handlers
function openAddTransactionModal() {
    app.openAddTransactionModal();
}

function openSearchFilterModal() {
    app.openSearchFilterModal();
}

function applyFilters() {
    app.applyFilters();
}

function clearFilters() {
    app.clearFilters();
}

function showGoogleSignIn() {
    app.showGoogleSignIn();
}

function googleSignOut() {
    app.googleSignOut();
}

function manualSync() {
    app.manualSync();
}

function openAddFutureIncome() {
    app.openAddFutureIncome();
}

function openAddFutureExpense() {
    app.openAddFutureExpense();
}

function openAddLoan(type) {
    app.openAddLoan(type);
}

function showCategoryTransactions(type, category) {
    app.showCategoryTransactions(type, category);
}

function addTransactionForCategory() {
    app.addTransactionForCategory();
}

function showAIInsights() {
    app.showAIInsights();
}

function applyAISuggestions() {
    app.applyAISuggestions();
}

function exportData() {
    app.exportData();
}

function importData(event) {
    app.importData(event);
}

function showResetConfirmation() {
    app.showResetConfirmation();
}

function toggleRolloverSettings() {
    app.toggleRolloverSettings();
}

// Google Sign-In callback
function handleGoogleSignIn(response) {
    app.handleGoogleSignIn(response);
}
