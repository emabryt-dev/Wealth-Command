// External Libraries
const { format, parse, parseISO, isWithinInterval, startOfMonth, endOfMonth, eachMonthOfInterval, addMonths, subMonths, isAfter, isBefore, isEqual } = window.dateFns;
const numeral = window.numeral;

// Initialize Choices.js for better select elements
let categoryChoices, typeChoices;

// Global Variables
let transactions = [];
let futureIncome = [];
let futureExpenses = [];
let loans = [];
let settings = {
    currency: 'PKR',
    currencyFormat: 'symbol',
    theme: 'auto',
    accentColor: 'blue',
    enableRollover: true,
    recentCategories: []
};
let currentUser = null;
let isSyncing = false;

// Currency configuration
const CURRENCY_CONFIG = {
    PKR: { symbol: '₨', code: 'PKR', name: 'Pakistani Rupee' },
    USD: { symbol: '$', code: 'USD', name: 'US Dollar' },
    EUR: { symbol: '€', code: 'EUR', name: 'Euro' },
    GBP: { symbol: '£', code: 'GBP', name: 'British Pound' },
    INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee' }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        showLoadingOverlay();
        
        // Initialize external libraries
        initializeFlatpickr();
        initializeChoices();
        
        // Load data
        await loadAllData();
        
        // Initialize UI components
        initializeEventListeners();
        initializeDateSelectors();
        initializeTheme();
        
        // Show dashboard by default
        showTab('tab-dashboard');
        
        // Initialize Google Sign-In
        initializeGoogleSignIn();
        
        // Hide loading overlay with delay for better UX
        setTimeout(() => {
            hideLoadingOverlay();
            refreshDashboard();
        }, 1000);
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error initializing application', 'error');
        hideLoadingOverlay();
    }
}

// Loading Overlay Functions
function showLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'flex';
    overlay.classList.remove('fade-out');
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.add('fade-out');
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
}

// External Library Initialization
function initializeFlatpickr() {
    // Initialize date pickers if needed
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (input.id) {
            flatpickr(`#${input.id}`, {
                dateFormat: "Y-m-d",
                defaultDate: "today",
                theme: settings.theme === 'dark' ? 'dark' : 'light'
            });
        }
    });
}

function initializeChoices() {
    // Initialize category select with Choices.js
    const categorySelect = document.getElementById('transactionCategory');
    if (categorySelect) {
        categoryChoices = new Choices(categorySelect, {
            searchEnabled: true,
            itemSelectText: '',
            removeItemButton: true,
            shouldSort: false
        });
    }
    
    // Initialize type select
    const typeSelect = document.getElementById('transactionType');
    if (typeSelect) {
        typeChoices = new Choices(typeSelect, {
            searchEnabled: false,
            itemSelectText: '',
            shouldSort: false
        });
    }
}

// Data Management Functions
async function loadAllData() {
    try {
        // Load settings first
        const savedSettings = localStorage.getItem('wealthCommandSettings');
        if (savedSettings) {
            settings = { ...settings, ...JSON.parse(savedSettings) };
        }
        
        // Load transactions with skeleton loading
        showSkeletonLoading('transactionsBody', 5);
        const savedTransactions = localStorage.getItem('wealthCommandTransactions');
        if (savedTransactions) {
            transactions = JSON.parse(savedTransactions);
        }
        hideSkeletonLoading('transactionsBody');
        
        // Load future income
        const savedFutureIncome = localStorage.getItem('wealthCommandFutureIncome');
        if (savedFutureIncome) {
            futureIncome = JSON.parse(savedFutureIncome);
        }
        
        // Load future expenses
        const savedFutureExpenses = localStorage.getItem('wealthCommandFutureExpenses');
        if (savedFutureExpenses) {
            futureExpenses = JSON.parse(savedFutureExpenses);
        }
        
        // Load loans
        const savedLoans = localStorage.getItem('wealthCommandLoans');
        if (savedLoans) {
            loans = JSON.parse(savedLoans);
        }
        
        // Update UI based on loaded data
        updateSettingsUI();
        
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

function saveAllData() {
    try {
        localStorage.setItem('wealthCommandSettings', JSON.stringify(settings));
        localStorage.setItem('wealthCommandTransactions', JSON.stringify(transactions));
        localStorage.setItem('wealthCommandFutureIncome', JSON.stringify(futureIncome));
        localStorage.setItem('wealthCommandFutureExpenses', JSON.stringify(futureExpenses));
        localStorage.setItem('wealthCommandLoans', JSON.stringify(loans));
        
        updateSyncStatus('synced');
    } catch (error) {
        console.error('Error saving data:', error);
        updateSyncStatus('error');
        showToast('Error saving data', 'error');
    }
}

// Skeleton Loading Functions
function showSkeletonLoading(containerId, count = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton skeleton-text';
        skeleton.style.height = '20px';
        skeleton.style.marginBottom = '10px';
        container.appendChild(skeleton);
    }
}

function hideSkeletonLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        const skeletons = container.querySelectorAll('.skeleton');
        skeletons.forEach(skeleton => skeleton.remove());
    }
}

// Theme Management
function initializeTheme() {
    const savedTheme = settings.theme || 'auto';
    applyTheme(savedTheme);
    document.getElementById('themeSelect').value = savedTheme;
}

function applyTheme(theme) {
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.body.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
    
    // Update Flatpickr theme if initialized
    if (window.flatpickr) {
        const flatpickrInstances = document.querySelectorAll('.flatpickr-input');
        flatpickrInstances.forEach(input => {
            const instance = input._flatpickr;
            if (instance) {
                instance.set('theme', isDark ? 'dark' : 'light');
            }
        });
    }
}

// Currency Formatting
function formatCurrency(amount, currency = settings.currency, formatType = settings.currencyFormat) {
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.PKR;
    const formattedAmount = numeral(amount).format('0,0.00');
    
    switch (formatType) {
        case 'symbol':
            return `${config.symbol}${formattedAmount}`;
        case 'code':
            return `${config.code} ${formattedAmount}`;
        case 'none':
            return formattedAmount;
        default:
            return `${config.symbol}${formattedAmount}`;
    }
}

// Sync Status Management
function updateSyncStatus(status) {
    const syncIcon = document.getElementById('syncStatusIcon');
    if (!syncIcon) return;
    
    syncIcon.className = 'sync-icon bi';
    
    switch (status) {
        case 'syncing':
            syncIcon.classList.add('bi-arrow-repeat', 'syncing');
            syncIcon.setAttribute('data-bs-title', 'Syncing...');
            break;
        case 'synced':
            syncIcon.classList.add('bi-cloud-check', 'synced');
            syncIcon.setAttribute('data-bs-title', 'All changes saved');
            break;
        case 'error':
            syncIcon.classList.add('bi-cloud-slash', 'error');
            syncIcon.setAttribute('data-bs-title', 'Sync error');
            break;
        default:
            syncIcon.classList.add('bi-cloud');
            syncIcon.setAttribute('data-bs-title', 'Not signed in');
    }
    
    // Update tooltip
    const tooltip = bootstrap.Tooltip.getInstance(syncIcon);
    if (tooltip) {
        tooltip.hide();
        tooltip.dispose();
    }
    new bootstrap.Tooltip(syncIcon);
}

// Toast Notification System
function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.id = toastId;
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, { delay: duration });
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Event Listeners Initialization
function initializeEventListeners() {
    // Transaction form
    const transactionForm = document.getElementById('transactionForm');
    if (transactionForm) {
        transactionForm.addEventListener('submit', handleTransactionSubmit);
    }
    
    // Future income form
    const futureIncomeForm = document.getElementById('futureIncomeForm');
    if (futureIncomeForm) {
        futureIncomeForm.addEventListener('submit', handleFutureIncomeSubmit);
    }
    
    // Future expense form
    const futureExpenseForm = document.getElementById('futureExpenseForm');
    if (futureExpenseForm) {
        futureExpenseForm.addEventListener('submit', handleFutureExpenseSubmit);
    }
    
    // Loan form
    const loanForm = document.getElementById('loanForm');
    if (loanForm) {
        loanForm.addEventListener('submit', handleLoanSubmit);
    }
    
    // Transaction type change
    const transactionType = document.getElementById('transactionType');
    if (transactionType) {
        transactionType.addEventListener('change', updateTransactionCategories);
    }
    
    // Search and filter events
    const transactionSearch = document.getElementById('transactionSearch');
    if (transactionSearch) {
        transactionSearch.addEventListener('input', debounce(refreshTransactions, 300));
    }
    
    const transactionTypeFilter = document.getElementById('transactionTypeFilter');
    if (transactionTypeFilter) {
        transactionTypeFilter.addEventListener('change', refreshTransactions);
    }
    
    const transactionCategoryFilter = document.getElementById('transactionCategoryFilter');
    if (transactionCategoryFilter) {
        transactionCategoryFilter.addEventListener('change', refreshTransactions);
    }
    
    // Settings changes
    const currencySelect = document.getElementById('currencySelect');
    if (currencySelect) {
        currencySelect.addEventListener('change', handleCurrencyChange);
    }
    
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', handleThemeChange);
    }
    
    const enableRollover = document.getElementById('enableRollover');
    if (enableRollover) {
        enableRollover.addEventListener('change', handleRolloverToggle);
    }
    
    // Analytics period change
    const analyticsPeriod = document.getElementById('analyticsPeriod');
    if (analyticsPeriod) {
        analyticsPeriod.addEventListener('change', refreshAnalytics);
    }
    
    // Planner timeframe buttons
    const timeframeButtons = document.querySelectorAll('.planner-timeframe-btn');
    timeframeButtons.forEach(button => {
        button.addEventListener('click', handlePlannerTimeframeChange);
    });
}

// Form Handlers
function handleTransactionSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const form = e.target;
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    const transactionData = {
        description: document.getElementById('transactionDescription').value.trim(),
        amount: parseFloat(document.getElementById('transactionAmount').value),
        date: document.getElementById('transactionDate').value,
        type: document.getElementById('transactionType').value,
        category: document.getElementById('transactionCategory').value,
        id: Date.now().toString()
    };
    
    const index = parseInt(document.getElementById('transactionIndex').value);
    
    if (index >= 0) {
        // Update existing transaction
        transactions[index] = transactionData;
        showToast('Transaction updated successfully', 'success');
    } else {
        // Add new transaction
        transactions.unshift(transactionData);
        showToast('Transaction added successfully', 'success');
        
        // Add to recent categories
        addToRecentCategories(transactionData.category, transactionData.type);
    }
    
    // Save and refresh
    saveAllData();
    refreshDashboard();
    refreshTransactions();
    
    // Close modal and reset form
    const modal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
    modal.hide();
    form.classList.remove('was-validated');
    form.reset();
    document.getElementById('transactionIndex').value = '-1';
    
    // Update recent categories display
    updateRecentCategories();
}

function handleFutureIncomeSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const form = e.target;
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    const incomeData = {
        description: document.getElementById('futureIncomeDescription').value.trim(),
        amount: parseFloat(document.getElementById('futureIncomeAmount').value),
        type: document.getElementById('futureIncomeType').value,
        frequency: document.getElementById('futureIncomeFrequency').value,
        startDate: document.getElementById('futureIncomeStartDate').value,
        endDate: document.getElementById('futureIncomeEndDate').value || null,
        id: Date.now().toString()
    };
    
    const index = parseInt(document.getElementById('futureIncomeIndex').value);
    
    if (index >= 0) {
        futureIncome[index] = incomeData;
        showToast('Future income updated successfully', 'success');
    } else {
        futureIncome.push(incomeData);
        showToast('Future income added successfully', 'success');
    }
    
    saveAllData();
    refreshPlanner();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('futureIncomeModal'));
    modal.hide();
    form.classList.remove('was-validated');
    form.reset();
    document.getElementById('futureIncomeIndex').value = '-1';
}

function handleFutureExpenseSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const form = e.target;
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    const expenseData = {
        description: document.getElementById('futureExpenseDescription').value.trim(),
        amount: parseFloat(document.getElementById('futureExpenseAmount').value),
        type: document.getElementById('futureExpenseType').value,
        frequency: document.getElementById('futureExpenseFrequency').value,
        startDate: document.getElementById('futureExpenseStartDate').value,
        endDate: document.getElementById('futureExpenseEndDate').value || null,
        id: Date.now().toString()
    };
    
    const index = parseInt(document.getElementById('futureExpenseIndex').value);
    
    if (index >= 0) {
        futureExpenses[index] = expenseData;
        showToast('Future expense updated successfully', 'success');
    } else {
        futureExpenses.push(expenseData);
        showToast('Future expense added successfully', 'success');
    }
    
    saveAllData();
    refreshPlanner();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('futureExpenseModal'));
    modal.hide();
    form.classList.remove('was-validated');
    form.reset();
    document.getElementById('futureExpenseIndex').value = '-1';
}

function handleLoanSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const form = e.target;
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    const loanType = document.getElementById('loanType').value;
    const loanData = {
        description: document.getElementById('loanDescription').value.trim(),
        amount: parseFloat(document.getElementById('loanAmount').value),
        type: loanType,
        person: loanType === 'given' ? document.getElementById('loanBorrower').value : document.getElementById('loanLender').value,
        dateGiven: loanType === 'given' ? document.getElementById('loanDateGiven').value : document.getElementById('loanDateTaken').value,
        expectedReturn: loanType === 'given' ? document.getElementById('loanExpectedReturn').value : document.getElementById('loanDueDate').value,
        id: Date.now().toString()
    };
    
    const index = parseInt(document.getElementById('loanIndex').value);
    
    if (index >= 0) {
        loans[index] = loanData;
        showToast('Loan updated successfully', 'success');
    } else {
        loans.push(loanData);
        showToast('Loan added successfully', 'success');
    }
    
    saveAllData();
    refreshDebtManagement();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('loanModal'));
    modal.hide();
    form.classList.remove('was-validated');
    form.reset();
    document.getElementById('loanIndex').value = '-1';
}

// Recent Categories Management
function addToRecentCategories(category, type) {
    const existingIndex = settings.recentCategories.findIndex(rc => rc.category === category && rc.type === type);
    
    if (existingIndex >= 0) {
        // Remove existing to re-add at beginning
        settings.recentCategories.splice(existingIndex, 1);
    }
    
    // Add to beginning
    settings.recentCategories.unshift({ category, type });
    
    // Keep only last 5
    if (settings.recentCategories.length > 5) {
        settings.recentCategories = settings.recentCategories.slice(0, 5);
    }
    
    saveAllData();
}

function updateRecentCategories() {
    const container = document.getElementById('recentCategories');
    const section = document.getElementById('recentCategoriesSection');
    
    if (!container || !section) return;
    
    container.innerHTML = '';
    
    if (settings.recentCategories.length === 0) {
        section.classList.add('d-none');
        return;
    }
    
    section.classList.remove('d-none');
    
    settings.recentCategories.forEach(recent => {
        const tag = document.createElement('span');
        tag.className = 'recent-category-tag';
        tag.textContent = recent.category;
        tag.onclick = () => {
            document.getElementById('transactionCategory').value = recent.category;
            document.getElementById('transactionType').value = recent.type;
            updateTransactionCategories();
        };
        container.appendChild(tag);
    });
}

// UI Update Functions
function refreshDashboard() {
    updateSummary();
    updateBreakdowns();
    updateRolloverBalance();
    updateRecentCategories();
}

function updateSummary() {
    const selectedMonth = document.getElementById('summaryMonth').value;
    const selectedYear = document.getElementById('summaryYear').value;
    
    const monthTransactions = getTransactionsForMonth(selectedYear, selectedMonth);
    
    const totalIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const netWealth = totalIncome - totalExpense;
    
    // Update UI elements
    document.getElementById('netWealth').textContent = formatCurrency(netWealth);
    document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('totalExpense').textContent = formatCurrency(totalExpense);
    document.getElementById('currencyLabel').textContent = settings.currency;
}

function updateBreakdowns() {
    updateIncomeBreakdown();
    updateExpenseBreakdown();
}

function updateIncomeBreakdown() {
    const container = document.getElementById('incomeBreakdown');
    const emptyState = document.getElementById('noIncomeCategories');
    
    if (!container) return;
    
    const selectedMonth = document.getElementById('summaryMonth').value;
    const selectedYear = document.getElementById('summaryYear').value;
    
    const monthTransactions = getTransactionsForMonth(selectedYear, selectedMonth)
        .filter(t => t.type === 'income');
    
    const categories = {};
    monthTransactions.forEach(transaction => {
        if (!categories[transaction.category]) {
            categories[transaction.category] = 0;
        }
        categories[transaction.category] += transaction.amount;
    });
    
    container.innerHTML = '';
    
    if (Object.keys(categories).length === 0) {
        emptyState.classList.remove('d-none');
        return;
    }
    
    emptyState.classList.add('d-none');
    
    Object.entries(categories)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, amount]) => {
            const item = document.createElement('div');
            item.className = 'breakdown-item animate__animated animate__fadeInRight';
            item.onclick = () => showCategoryTransactions('income', category);
            
            item.innerHTML = `
                <span class="breakdown-category">${category}</span>
                <span class="breakdown-amount">${formatCurrency(amount)}</span>
            `;
            
            container.appendChild(item);
        });
}

function updateExpenseBreakdown() {
    const container = document.getElementById('expenseBreakdown');
    const emptyState = document.getElementById('noExpenseCategories');
    
    if (!container) return;
    
    const selectedMonth = document.getElementById('summaryMonth').value;
    const selectedYear = document.getElementById('summaryYear').value;
    
    const monthTransactions = getTransactionsForMonth(selectedYear, selectedMonth)
        .filter(t => t.type === 'expense');
    
    const categories = {};
    monthTransactions.forEach(transaction => {
        if (!categories[transaction.category]) {
            categories[transaction.category] = 0;
        }
        categories[transaction.category] += transaction.amount;
    });
    
    container.innerHTML = '';
    
    if (Object.keys(categories).length === 0) {
        emptyState.classList.remove('d-none');
        return;
    }
    
    emptyState.classList.add('d-none');
    
    Object.entries(categories)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, amount]) => {
            const item = document.createElement('div');
            item.className = 'breakdown-item animate__animated animate__fadeInRight';
            item.onclick = () => showCategoryTransactions('expense', category);
            
            item.innerHTML = `
                <span class="breakdown-category">${category}</span>
                <span class="breakdown-amount">${formatCurrency(amount)}</span>
            `;
            
            container.appendChild(item);
        });
}

function updateTransactionCategories() {
    const type = document.getElementById('transactionType').value;
    const categorySelect = document.getElementById('transactionCategory');
    
    if (!categorySelect || !categoryChoices) return;
    
    const categories = getCategoriesForType(type);
    
    // Clear existing choices
    categoryChoices.clearStore();
    
    // Add new choices
    categories.forEach(category => {
        categoryChoices.setChoiceByValue(category);
    });
    
    // If there's only one category, select it by default
    if (categories.length === 1) {
        categoryChoices.setChoiceByValue(categories[0]);
    }
}

function getCategoriesForType(type) {
    const baseCategories = {
        income: ['Salary', 'Business', 'Investment', 'Gift', 'Other Income'],
        expense: ['Food', 'Transport', 'Entertainment', 'Utilities', 'Healthcare', 'Education', 'Shopping', 'Other Expense']
    };
    
    // Add custom categories from transactions
    const customCategories = [...new Set(transactions
        .filter(t => t.type === type)
        .map(t => t.category)
    )];
    
    return [...new Set([...baseCategories[type] || [], ...customCategories])];
}

// Transaction Management
function refreshTransactions() {
    const searchTerm = document.getElementById('transactionSearch').value.toLowerCase();
    const typeFilter = document.getElementById('transactionTypeFilter').value;
    const categoryFilter = document.getElementById('transactionCategoryFilter').value;
    
    let filteredTransactions = transactions.filter(transaction => {
        const matchesSearch = !searchTerm || 
            transaction.description.toLowerCase().includes(searchTerm) ||
            transaction.amount.toString().includes(searchTerm) ||
            transaction.category.toLowerCase().includes(searchTerm);
        
        const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
        const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
        
        return matchesSearch && matchesType && matchesCategory;
    });
    
    updateTransactionsTable(filteredTransactions);
    updateTransactionFilters();
}

function updateTransactionsTable(transactionsToShow) {
    const tbody = document.getElementById('transactionsBody');
    const noTransactions = document.getElementById('noTransactions');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (transactionsToShow.length === 0) {
        noTransactions.classList.remove('d-none');
        return;
    }
    
    noTransactions.classList.add('d-none');
    
    transactionsToShow.forEach((transaction, index) => {
        const row = document.createElement('tr');
        row.className = 'animate__animated animate__fadeIn';
        row.style.animationDelay = `${index * 0.1}s`;
        
        row.innerHTML = `
            <td>${format(parseISO(transaction.date), 'MMM dd, yyyy')}</td>
            <td>${transaction.description}</td>
            <td>
                <span class="badge ${transaction.type === 'income' ? 'bg-success' : 'bg-danger'}">
                    ${transaction.type}
                </span>
            </td>
            <td>${transaction.category}</td>
            <td class="${transaction.type === 'income' ? 'text-success' : 'text-danger'}">
                ${formatCurrency(transaction.amount)}
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editTransaction(${index})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteTransaction(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function updateTransactionFilters() {
    const categoryFilter = document.getElementById('transactionCategoryFilter');
    if (!categoryFilter) return;
    
    const allCategories = [...new Set(transactions.map(t => t.category))];
    
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    allCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

// Planner Functions
function refreshPlanner() {
    updatePlannerSummary();
    updateFutureIncomeList();
    updateFutureExpensesList();
    updatePlannerTimeline();
}

function updatePlannerSummary() {
    const timeframe = document.querySelector('.planner-timeframe-btn.active')?.dataset.timeframe || '1year';
    const projection = calculateFinancialProjection(timeframe);
    
    document.getElementById('plannerNetWealth').textContent = formatCurrency(projection.netWealth);
    document.getElementById('plannerTotalIncome').textContent = formatCurrency(projection.totalIncome);
    document.getElementById('plannerTotalExpenses').textContent = formatCurrency(projection.totalExpenses);
    document.getElementById('plannerEndingBalance').textContent = formatCurrency(projection.endingBalance);
}

function calculateFinancialProjection(timeframe) {
    const months = timeframe === '1year' ? 12 : timeframe === '2years' ? 24 : 36;
    let totalIncome = 0;
    let totalExpenses = 0;
    
    // Calculate projected income and expenses
    for (let i = 0; i < months; i++) {
        const projectionDate = addMonths(new Date(), i);
        
        // Add future income
        futureIncome.forEach(income => {
            if (isIncomeActive(income, projectionDate)) {
                totalIncome += income.amount;
            }
        });
        
        // Add future expenses
        futureExpenses.forEach(expense => {
            if (isExpenseActive(expense, projectionDate)) {
                totalExpenses += expense.amount;
            }
        });
    }
    
    const netWealth = totalIncome - totalExpenses;
    const currentBalance = calculateCurrentBalance();
    const endingBalance = currentBalance + netWealth;
    
    return {
        totalIncome,
        totalExpenses,
        netWealth,
        endingBalance
    };
}

function isIncomeActive(income, date) {
    const startDate = parseISO(income.startDate);
    if (isAfter(date, startDate)) return false;
    
    if (income.endDate) {
        const endDate = parseISO(income.endDate);
        if (isAfter(date, endDate)) return false;
    }
    
    // Check frequency
    const monthDiff = differenceInMonths(date, startDate);
    switch (income.frequency) {
        case 'monthly':
            return monthDiff % 1 === 0;
        case 'quarterly':
            return monthDiff % 3 === 0;
        case 'one-time':
            return monthDiff === 0;
        default:
            return true;
    }
}

function isExpenseActive(expense, date) {
    // Similar implementation to isIncomeActive
    const startDate = parseISO(expense.startDate);
    if (isAfter(date, startDate)) return false;
    
    if (expense.endDate) {
        const endDate = parseISO(expense.endDate);
        if (isAfter(date, endDate)) return false;
    }
    
    const monthDiff = differenceInMonths(date, startDate);
    switch (expense.frequency) {
        case 'monthly':
            return monthDiff % 1 === 0;
        case 'quarterly':
            return monthDiff % 3 === 0;
        case 'one-time':
            return monthDiff === 0;
        default:
            return true;
    }
}

// Analytics Functions
function refreshAnalytics() {
    updateAIAnalytics();
    updateSpendingPatterns();
    updateCharts();
}

function updateAIAnalytics() {
    const healthScore = calculateFinancialHealthScore();
    const recommendations = generateAIRecommendations();
    
    document.getElementById('healthScore').textContent = healthScore.score;
    document.getElementById('healthDescription').textContent = healthScore.description;
    
    const recommendationsContainer = document.getElementById('aiRecommendations');
    recommendationsContainer.innerHTML = '';
    
    recommendations.slice(0, 3).forEach(rec => {
        const item = document.createElement('div');
        item.className = 'ai-recommendation-item';
        item.innerHTML = `
            <i class="bi bi-lightbulb"></i>
            <span>${rec}</span>
        `;
        recommendationsContainer.appendChild(item);
    });
}

function calculateFinancialHealthScore() {
    // Simple health score calculation based on various factors
    let score = 50; // Base score
    
    // Factor 1: Savings rate
    const monthlyIncome = getMonthlyAverage('income');
    const monthlyExpenses = getMonthlyAverage('expense');
    const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0;
    score += Math.min(savingsRate * 50, 25); // Up to 25 points for savings
    
    // Factor 2: Expense consistency
    const expenseVariance = getExpenseVariance();
    score += Math.max(25 - expenseVariance * 25, 0); // Up to 25 points for consistency
    
    // Factor 3: Emergency fund
    const emergencyFundMonths = monthlyExpenses > 0 ? calculateCurrentBalance() / monthlyExpenses : 0;
    score += Math.min(emergencyFundMonths * 5, 25); // Up to 25 points for emergency fund
    
    score = Math.max(0, Math.min(100, Math.round(score)));
    
    let description = '';
    if (score >= 80) description = 'Excellent financial health!';
    else if (score >= 60) description = 'Good financial health';
    else if (score >= 40) description = 'Fair financial health';
    else description = 'Needs improvement';
    
    return { score, description };
}

function generateAIRecommendations() {
    const recommendations = [];
    const monthlyIncome = getMonthlyAverage('income');
    const monthlyExpenses = getMonthlyAverage('expense');
    
    // Savings recommendation
    if (monthlyExpenses >= monthlyIncome * 0.8) {
        recommendations.push('Consider reducing discretionary spending to improve savings rate');
    }
    
    // Emergency fund recommendation
    const emergencyFund = calculateCurrentBalance();
    if (emergencyFund < monthlyExpenses * 3) {
        recommendations.push('Build an emergency fund covering 3-6 months of expenses');
    }
    
    // Category-specific recommendations
    const categorySpending = getCategorySpending();
    const highSpendingCategories = Object.entries(categorySpending)
        .filter(([, amount]) => amount > monthlyIncome * 0.3)
        .map(([category]) => category);
    
    highSpendingCategories.forEach(category => {
        recommendations.push(`Review ${category} spending - it's over 30% of your income`);
    });
    
    // Default recommendation if none apply
    if (recommendations.length === 0) {
        recommendations.push('Your finances look healthy! Consider investing surplus funds');
    }
    
    return recommendations;
}

// Utility Functions
function getTransactionsForMonth(year, month) {
    return transactions.filter(transaction => {
        const transactionDate = parseISO(transaction.date);
        return transactionDate.getFullYear() === parseInt(year) && 
               transactionDate.getMonth() === parseInt(month);
    });
}

function calculateCurrentBalance() {
    const allIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const allExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return allIncome - allExpenses;
}

function getMonthlyAverage(type) {
    const typeTransactions = transactions.filter(t => t.type === type);
    if (typeTransactions.length === 0) return 0;
    
    const monthlyTotals = {};
    typeTransactions.forEach(transaction => {
        const date = parseISO(transaction.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlyTotals[monthKey]) {
            monthlyTotals[monthKey] = 0;
        }
        monthlyTotals[monthKey] += transaction.amount;
    });
    
    const monthlyAmounts = Object.values(monthlyTotals);
    return monthlyAmounts.reduce((sum, amount) => sum + amount, 0) / monthlyAmounts.length;
}

function getExpenseVariance() {
    const monthlyAverages = [];
    const monthlyTotals = {};
    
    transactions.filter(t => t.type === 'expense').forEach(transaction => {
        const date = parseISO(transaction.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlyTotals[monthKey]) {
            monthlyTotals[monthKey] = 0;
        }
        monthlyTotals[monthKey] += transaction.amount;
    });
    
    Object.values(monthlyTotals).forEach(amount => {
        monthlyAverages.push(amount);
    });
    
    if (monthlyAverages.length < 2) return 0;
    
    const mean = monthlyAverages.reduce((a, b) => a + b) / monthlyAverages.length;
    const variance = monthlyAverages.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / monthlyAverages.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
}

function getCategorySpending() {
    const categoryTotals = {};
    transactions.filter(t => t.type === 'expense').forEach(transaction => {
        if (!categoryTotals[transaction.category]) {
            categoryTotals[transaction.category] = 0;
        }
        categoryTotals[transaction.category] += transaction.amount;
    });
    return categoryTotals;
}

// Date and Time Utilities
function initializeDateSelectors() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Summary month/year selectors
    const summaryMonth = document.getElementById('summaryMonth');
    const summaryYear = document.getElementById('summaryYear');
    
    if (summaryMonth && summaryYear) {
        // Populate years (current year and previous 2 years)
        for (let year = currentYear - 2; year <= currentYear; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) option.selected = true;
            summaryYear.appendChild(option);
        }
        
        // Populate months
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = month;
            if (index === currentMonth) option.selected = true;
            summaryMonth.appendChild(option);
        });
        
        // Add change listeners
        summaryMonth.addEventListener('change', refreshDashboard);
        summaryYear.addEventListener('change', refreshDashboard);
    }
    
    // Set default dates in forms
    const today = format(new Date(), 'yyyy-MM-dd');
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (!input.value) {
            input.value = today;
        }
    });
}

// Settings Handlers
function handleCurrencyChange() {
    settings.currency = document.getElementById('currencySelect').value;
    saveAllData();
    refreshDashboard();
    refreshTransactions();
    refreshPlanner();
    refreshAnalytics();
}

function handleThemeChange() {
    settings.theme = document.getElementById('themeSelect').value;
    saveAllData();
    applyTheme(settings.theme);
}

function handleRolloverToggle() {
    settings.enableRollover = document.getElementById('enableRollover').checked;
    saveAllData();
    refreshDashboard();
}

function handlePlannerTimeframeChange(e) {
    const buttons = document.querySelectorAll('.planner-timeframe-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    refreshPlanner();
}

// Modal Management
function openAddFutureIncome() {
    document.getElementById('futureIncomeIndex').value = '-1';
    document.getElementById('futureIncomeForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('futureIncomeModal'));
    modal.show();
}

function openAddFutureExpense() {
    document.getElementById('futureExpenseIndex').value = '-1';
    document.getElementById('futureExpenseForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('futureExpenseModal'));
    modal.show();
}

function openAddLoan(type) {
    document.getElementById('loanIndex').value = '-1';
    document.getElementById('loanType').value = type;
    document.getElementById('loanForm').reset();
    
    // Update labels based on loan type
    document.getElementById('loanBorrowerLabel').style.display = type === 'given' ? 'block' : 'none';
    document.getElementById('loanLenderLabel').style.display = type === 'taken' ? 'block' : 'none';
    document.getElementById('loanDateGivenLabel').style.display = type === 'given' ? 'block' : 'none';
    document.getElementById('loanDateTakenLabel').style.display = type === 'taken' ? 'block' : 'none';
    document.getElementById('loanExpectedReturnLabel').style.display = type === 'given' ? 'block' : 'none';
    document.getElementById('loanDueDateLabel').style.display = type === 'taken' ? 'block' : 'none';
    
    const modal = new bootstrap.Modal(document.getElementById('loanModal'));
    modal.show();
}

function openAIAnalysis() {
    const modal = new bootstrap.Modal(document.getElementById('aiInsightsModal'));
    modal.show();
    updateAIDetailedAnalysis();
}

// Transaction Actions
function editTransaction(index) {
    const transaction = transactions[index];
    
    document.getElementById('transactionIndex').value = index;
    document.getElementById('transactionDescription').value = transaction.description;
    document.getElementById('transactionAmount').value = transaction.amount;
    document.getElementById('transactionDate').value = transaction.date;
    document.getElementById('transactionType').value = transaction.type;
    
    // Update categories based on type
    updateTransactionCategories();
    
    // Set category after a brief delay to ensure categories are loaded
    setTimeout(() => {
        document.getElementById('transactionCategory').value = transaction.category;
        if (categoryChoices) {
            categoryChoices.setChoiceByValue(transaction.category);
        }
    }, 100);
    
    const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
    modal.show();
}

function deleteTransaction(index) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        transactions.splice(index, 1);
        saveAllData();
        refreshDashboard();
        refreshTransactions();
        showToast('Transaction deleted successfully', 'success');
    }
}

// Rollover Balance Management
function updateRolloverBalance() {
    const rolloverBalance = document.getElementById('rolloverBalance');
    const rolloverAmount = document.getElementById('rolloverAmount');
    const rolloverDescription = document.getElementById('rolloverDescription');
    
    if (!settings.enableRollover) {
        rolloverBalance.classList.add('d-none');
        return;
    }
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Calculate previous month
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const prevMonthTransactions = getTransactionsForMonth(prevYear, prevMonth);
    const prevMonthIncome = prevMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const prevMonthExpenses = prevMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const prevMonthBalance = prevMonthIncome - prevMonthExpenses;
    
    if (prevMonthBalance > 0) {
        rolloverBalance.classList.remove('d-none');
        rolloverAmount.textContent = formatCurrency(prevMonthBalance);
        rolloverDescription.textContent = `From ${format(new Date(prevYear, prevMonth), 'MMMM yyyy')}`;
    } else {
        rolloverBalance.classList.add('d-none');
    }
}

function toggleRolloverSettings() {
    document.getElementById('enableRollover').checked = !document.getElementById('enableRollover').checked;
    handleRolloverToggle();
}

// Google Sign-In Integration
function initializeGoogleSignIn() {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: '86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com',
            callback: handleGoogleSignIn
        });
        
        // Render sign-in button
        const signInButton = document.getElementById('googleSignInButton');
        if (signInButton) {
            google.accounts.id.renderButton(signInButton, {
                theme: 'outline',
                size: 'large',
                width: signInButton.offsetWidth
            });
        }
    }
}

function handleGoogleSignIn(response) {
    const user = parseJwt(response.credential);
    currentUser = user;
    
    updateUserProfile(user);
    showToast(`Signed in as ${user.name}`, 'success');
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('googleSignInModal'));
    modal.hide();
}

function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    return JSON.parse(jsonPayload);
}

function updateUserProfile(user) {
    const profilePicture = document.getElementById('profilePicture');
    const userEmail = document.getElementById('userEmail');
    const signedInUser = document.getElementById('signedInUser');
    const signInOption = document.getElementById('signInOption');
    const signOutOption = document.getElementById('signOutOption');
    
    if (profilePicture && user.picture) {
        profilePicture.innerHTML = `<img src="${user.picture}" alt="Profile" class="profile-image">`;
    }
    
    if (userEmail) {
        userEmail.textContent = user.email;
    }
    
    if (signedInUser) signedInUser.classList.remove('d-none');
    if (signInOption) signInOption.classList.add('d-none');
    if (signOutOption) signOutOption.classList.remove('d-none');
}

function showGoogleSignIn() {
    const modal = new bootstrap.Modal(document.getElementById('googleSignInModal'));
    modal.show();
}

function googleSignOut() {
    if (currentUser) {
        google.accounts.id.revoke(currentUser.sub, done => {
            currentUser = null;
            resetUserProfile();
            showToast('Signed out successfully', 'info');
        });
    }
}

function resetUserProfile() {
    const profilePicture = document.getElementById('profilePicture');
    const signedInUser = document.getElementById('signedInUser');
    const signInOption = document.getElementById('signInOption');
    const signOutOption = document.getElementById('signOutOption');
    
    if (profilePicture) {
        profilePicture.innerHTML = '<i class="bi bi-person-circle profile-icon"></i>';
    }
    
    if (signedInUser) signedInUser.classList.add('d-none');
    if (signInOption) signInOption.classList.remove('d-none');
    if (signOutOption) signOutOption.classList.add('d-none');
}

// Export/Import Functions
function exportData() {
    const data = {
        transactions,
        futureIncome,
        futureExpenses,
        loans,
        settings,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `wealth-command-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    
    showToast('Data exported successfully', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = event => {
            try {
                const data = JSON.parse(event.target.result);
                
                if (confirm('This will replace all current data. Continue?')) {
                    transactions = data.transactions || [];
                    futureIncome = data.futureIncome || [];
                    futureExpenses = data.futureExpenses || [];
                    loans = data.loans || [];
                    settings = { ...settings, ...data.settings };
                    
                    saveAllData();
                    refreshDashboard();
                    refreshTransactions();
                    refreshPlanner();
                    refreshAnalytics();
                    
                    showToast('Data imported successfully', 'success');
                }
            } catch (error) {
                showToast('Error importing data', 'error');
                console.error('Import error:', error);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

function clearAllData() {
    if (confirm('This will permanently delete all your data. This action cannot be undone. Continue?')) {
        transactions = [];
        futureIncome = [];
        futureExpenses = [];
        loans = [];
        
        saveAllData();
        refreshDashboard();
        refreshTransactions();
        refreshPlanner();
        refreshAnalytics();
        
        showToast('All data cleared', 'warning');
    }
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showTab(tabId) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-page');
    tabs.forEach(tab => tab.classList.add('d-none'));
    
    // Show selected tab
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.remove('d-none');
        
        // Refresh tab content if needed
        switch (tabId) {
            case 'tab-dashboard':
                refreshDashboard();
                break;
            case 'tab-transactions':
                refreshTransactions();
                break;
            case 'tab-planner':
                refreshPlanner();
                break;
            case 'tab-debt':
                refreshDebtManagement();
                break;
            case 'tab-analytics':
                refreshAnalytics();
                break;
        }
    }
}

function updateSettingsUI() {
    document.getElementById('currencySelect').value = settings.currency;
    document.getElementById('currencyFormat').value = settings.currencyFormat;
    document.getElementById('themeSelect').value = settings.theme;
    document.getElementById('accentColor').value = settings.accentColor;
    document.getElementById('enableRollover').checked = settings.enableRollover;
}

// Manual sync function
function manualSync() {
    if (isSyncing) return;
    
    isSyncing = true;
    updateSyncStatus('syncing');
    
    // Simulate sync process
    setTimeout(() => {
        saveAllData();
        isSyncing = false;
        showToast('Data synced successfully', 'success');
    }, 1000);
}

// Initialize the app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
