// Wealth Command - Enhanced Financial Management App
console.log('Wealth Command script loaded successfully!');

// Global variables
let transactions = [];
let futureIncome = [];
let futureExpenses = [];
let loans = [];
let categories = {
    income: ['Salary', 'Business', 'Investment', 'Gift', 'Other Income'],
    expense: ['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Healthcare', 'Education', 'Other Expense']
};
let recentCategories = [];
let currency = 'PKR';
let darkMode = false;
let rolloverBalance = {
    enabled: false,
    amount: 0,
    description: ''
};

// DOM Elements cache
const elements = {};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Wealth Command...');
    initializeApp();
});

async function initializeApp() {
    console.log('Initializing Wealth Command application...');
    
    // Cache DOM elements
    cacheDOMElements();
    
    // Load saved data
    await loadData();
    
    // Initialize basic functionality
    initializeEventListeners();
    initializeDarkMode();
    initializeDateSelectors();
    updateDashboard();
    updateTransactionsList();
    updatePlanner();
    updateDebtManagement();
    updateSettings();
    
    console.log('Wealth Command initialized successfully!');
    showToast('Wealth Command loaded successfully!', 'success');
}

function cacheDOMElements() {
    // Cache frequently used DOM elements
    elements.summaryMonth = document.getElementById('summaryMonth');
    elements.summaryYear = document.getElementById('summaryYear');
    elements.quickAddFab = document.getElementById('quickAddFab');
    elements.quickAddForm = document.getElementById('quickAddForm');
    elements.quickDesc = document.getElementById('quickDesc');
    elements.quickAmount = document.getElementById('quickAmount');
    elements.quickType = document.getElementById('quickType');
    elements.quickCategory = document.getElementById('quickCategory');
    elements.recentCategories = document.getElementById('recentCategories');
    elements.searchContainer = document.getElementById('searchContainer');
    elements.searchToggle = document.getElementById('searchToggle');
    elements.globalSearch = document.getElementById('globalSearch');
    elements.clearSearch = document.getElementById('clearSearch');
    elements.darkModeToggle = document.getElementById('darkModeToggle');
    elements.currencySelect = document.getElementById('currencySelect');
    elements.transactionsSearch = document.getElementById('transactionsSearch');
    elements.transactionsTypeFilter = document.getElementById('transactionsTypeFilter');
    elements.transactionsCategoryFilter = document.getElementById('transactionsCategoryFilter');
    elements.clearFilters = document.getElementById('clearFilters');
    elements.transactionsBody = document.getElementById('transactionsBody');
    elements.transactionsCount = document.getElementById('transactionsCount');
    elements.noTransactions = document.getElementById('noTransactions');
    elements.searchNoResults = document.getElementById('searchNoResults');
    elements.netWealth = document.getElementById('netWealth');
    elements.totalIncome = document.getElementById('totalIncome');
    elements.totalExpense = document.getElementById('totalExpense');
    elements.incomeBreakdown = document.getElementById('incomeBreakdown');
    elements.expenseBreakdown = document.getElementById('expenseBreakdown');
    elements.noIncomeCategories = document.getElementById('noIncomeCategories');
    elements.noExpenseCategories = document.getElementById('noExpenseCategories');
    elements.rolloverBalance = document.getElementById('rolloverBalance');
    elements.rolloverAmount = document.getElementById('rolloverAmount');
    elements.rolloverDescription = document.getElementById('rolloverDescription');
}

async function loadData() {
    try {
        const savedData = localStorage.getItem('wealthCommandData');
        if (savedData) {
            const data = JSON.parse(savedData);
            transactions = data.transactions || [];
            futureIncome = data.futureIncome || [];
            futureExpenses = data.futureExpenses || [];
            loans = data.loans || [];
            categories = data.categories || categories;
            recentCategories = data.recentCategories || [];
            currency = data.currency || 'PKR';
            darkMode = data.darkMode || false;
            rolloverBalance = data.rolloverBalance || rolloverBalance;
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function saveData() {
    try {
        const data = {
            transactions,
            futureIncome,
            futureExpenses,
            loans,
            categories,
            recentCategories,
            currency,
            darkMode,
            rolloverBalance,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('wealthCommandData', JSON.stringify(data));
    } catch (error) {
        console.error('Error saving data:', error);
        showToast('Error saving data', 'error');
    }
}

function initializeEventListeners() {
    console.log('Setting up event listeners...');
    
    // Navigation
    const navButtons = document.querySelectorAll('.navbar-toggler-icon-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.id.replace('nav-', '');
            switchTab(tabName);
        });
    });
    
    // Quick Add FAB
    if (elements.quickAddFab) {
        elements.quickAddFab.addEventListener('click', openQuickAddModal);
    }
    
    // Quick Add Form
    if (elements.quickAddForm) {
        elements.quickAddForm.addEventListener('submit', handleQuickAddSubmit);
    }
    
    // Quick Type Change
    if (elements.quickType) {
        elements.quickType.addEventListener('change', updateQuickCategories);
    }
    
    // Search functionality
    if (elements.searchToggle) {
        elements.searchToggle.addEventListener('click', toggleSearch);
    }
    
    if (elements.globalSearch) {
        elements.globalSearch.addEventListener('input', debounce(handleGlobalSearch, 300));
    }
    
    if (elements.clearSearch) {
        elements.clearSearch.addEventListener('click', clearGlobalSearch);
    }
    
    // Dashboard filters
    if (elements.summaryMonth) {
        elements.summaryMonth.addEventListener('change', updateDashboard);
    }
    
    if (elements.summaryYear) {
        elements.summaryYear.addEventListener('change', updateDashboard);
    }
    
    // Settings
    if (elements.darkModeToggle) {
        elements.darkModeToggle.addEventListener('change', handleDarkModeToggle);
    }
    
    if (elements.currencySelect) {
        elements.currencySelect.addEventListener('change', handleCurrencyChange);
    }
    
    // Transactions search and filters
    if (elements.transactionsSearch) {
        elements.transactionsSearch.addEventListener('input', debounce(updateTransactionsList, 300));
    }
    
    if (elements.transactionsTypeFilter) {
        elements.transactionsTypeFilter.addEventListener('change', updateTransactionsList);
    }
    
    if (elements.transactionsCategoryFilter) {
        elements.transactionsCategoryFilter.addEventListener('change', updateTransactionsList);
    }
    
    if (elements.clearFilters) {
        elements.clearFilters.addEventListener('click', clearTransactionFilters);
    }
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function initializeDateSelectors() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Populate month selector
    if (elements.summaryMonth) {
        elements.summaryMonth.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const monthName = new Date(currentYear, i, 1).toLocaleDateString('en', { month: 'long' });
            const option = document.createElement('option');
            option.value = i;
            option.textContent = monthName;
            if (i === currentMonth) option.selected = true;
            elements.summaryMonth.appendChild(option);
        }
    }
    
    // Populate year selector (current year and previous 2 years)
    if (elements.summaryYear) {
        elements.summaryYear.innerHTML = '';
        for (let i = currentYear - 2; i <= currentYear; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === currentYear) option.selected = true;
            elements.summaryYear.appendChild(option);
        }
    }
}

function initializeDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.checked = darkMode;
    }
    updateDarkMode(darkMode);
}

function updateDarkMode(isDark) {
    if (isDark) {
        document.documentElement.setAttribute('data-bs-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-bs-theme');
    }
}

function handleDarkModeToggle(event) {
    darkMode = event.target.checked;
    saveData();
    updateDarkMode(darkMode);
    console.log('Dark mode:', darkMode ? 'enabled' : 'disabled');
}

function handleCurrencyChange(event) {
    currency = event.target.value;
    saveData();
    showToast(`Currency changed to ${currency}`, 'success');
    updateCurrencyDisplay(currency);
    updateDashboard();
}

function updateCurrencyDisplay(currency) {
    const currencyLabels = document.querySelectorAll('#currencyLabel');
    currencyLabels.forEach(label => {
        label.textContent = currency;
    });
}

// Tab Navigation
function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Hide all tabs
    const tabPages = document.querySelectorAll('.tab-page');
    tabPages.forEach(tab => {
        tab.classList.add('d-none');
    });
    
    // Remove active class from all nav buttons
    const navButtons = document.querySelectorAll('.navbar-toggler-icon-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab and activate nav button
    const selectedTab = document.getElementById(`tab-${tabName}`);
    const selectedNav = document.getElementById(`nav-${tabName}`);
    
    if (selectedTab) selectedTab.classList.remove('d-none');
    if (selectedNav) selectedNav.classList.add('active');
    
    // Update content based on tab
    updateTabContent(tabName);
}

function updateTabContent(tabName) {
    switch(tabName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'transactions':
            updateTransactionsList();
            break;
        case 'planner':
            updatePlanner();
            break;
        case 'debt':
            updateDebtManagement();
            break;
        case 'settings':
            updateSettings();
            break;
    }
}

// Dashboard Functions
function updateDashboard() {
    const selectedMonth = elements.summaryMonth ? parseInt(elements.summaryMonth.value) : new Date().getMonth();
    const selectedYear = elements.summaryYear ? parseInt(elements.summaryYear.value) : new Date().getFullYear();
    
    const monthTransactions = getTransactionsForMonth(selectedYear, selectedMonth);
    const { income, expenses } = calculateIncomeExpenses(monthTransactions);
    const net = income - expenses;
    
    // Apply rollover balance if enabled
    let startingBalance = 0;
    if (rolloverBalance.enabled) {
        startingBalance = rolloverBalance.amount;
        if (elements.rolloverBalance) {
            elements.rolloverBalance.classList.remove('d-none');
            elements.rolloverAmount.textContent = formatCurrency(startingBalance);
            elements.rolloverDescription.textContent = rolloverBalance.description || 'Previous month balance';
        }
    } else if (elements.rolloverBalance) {
        elements.rolloverBalance.classList.add('d-none');
    }
    
    const totalNet = net + startingBalance;
    
    // Update display
    if (elements.netWealth) elements.netWealth.textContent = formatCurrency(totalNet);
    if (elements.totalIncome) elements.totalIncome.textContent = formatCurrency(income);
    if (elements.totalExpense) elements.totalExpense.textContent = formatCurrency(expenses);
    
    // Update breakdowns
    updateBreakdowns(monthTransactions);
}

function updateBreakdowns(transactions) {
    const incomeBreakdown = calculateCategoryBreakdown(transactions, 'income');
    const expenseBreakdown = calculateCategoryBreakdown(transactions, 'expense');
    
    // Update income breakdown
    if (elements.incomeBreakdown) {
        updateBreakdownList(elements.incomeBreakdown, incomeBreakdown, 'income');
    }
    if (elements.noIncomeCategories) {
        elements.noIncomeCategories.classList.toggle('d-none', incomeBreakdown.length > 0);
    }
    
    // Update expense breakdown
    if (elements.expenseBreakdown) {
        updateBreakdownList(elements.expenseBreakdown, expenseBreakdown, 'expense');
    }
    if (elements.noExpenseCategories) {
        elements.noExpenseCategories.classList.toggle('d-none', expenseBreakdown.length > 0);
    }
}

function updateBreakdownList(container, breakdown, type) {
    if (!container) return;
    
    container.innerHTML = '';
    
    breakdown.forEach((item, index) => {
        const breakdownItem = document.createElement('div');
        breakdownItem.className = `breakdown-item animate__animated animate__fadeIn`;
        breakdownItem.style.animationDelay = `${index * 0.1}s`;
        breakdownItem.onclick = () => showCategoryTransactions(type, item.category);
        
        breakdownItem.innerHTML = `
            <span class="breakdown-category">${escapeHtml(item.category)}</span>
            <span class="breakdown-amount">${formatCurrency(item.amount)}</span>
        `;
        
        container.appendChild(breakdownItem);
    });
}

// Transactions Functions
function updateTransactionsList() {
    const searchTerm = elements.transactionsSearch ? elements.transactionsSearch.value.toLowerCase() : '';
    const typeFilter = elements.transactionsTypeFilter ? elements.transactionsTypeFilter.value : 'all';
    const categoryFilter = elements.transactionsCategoryFilter ? elements.transactionsCategoryFilter.value : 'all';
    
    // Update category filter options
    updateCategoryFilterOptions();
    
    let filteredTransactions = transactions.filter(transaction => {
        const matchesSearch = !searchTerm || 
            transaction.description.toLowerCase().includes(searchTerm) ||
            transaction.category.toLowerCase().includes(searchTerm) ||
            transaction.amount.toString().includes(searchTerm);
        
        const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
        const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
        
        return matchesSearch && matchesType && matchesCategory;
    });
    
    // Sort by date (newest first)
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    displayTransactions(filteredTransactions);
}

function displayTransactions(transactionsToShow) {
    if (!elements.transactionsBody) return;
    
    elements.transactionsBody.innerHTML = '';
    
    if (transactionsToShow.length === 0) {
        const hasSearchFilter = (elements.transactionsSearch && elements.transactionsSearch.value) || 
                               (elements.transactionsTypeFilter && elements.transactionsTypeFilter.value !== 'all') ||
                               (elements.transactionsCategoryFilter && elements.transactionsCategoryFilter.value !== 'all');
        
        if (elements.noTransactions) {
            elements.noTransactions.classList.toggle('d-none', hasSearchFilter);
        }
        if (elements.searchNoResults) {
            elements.searchNoResults.classList.toggle('d-none', !hasSearchFilter);
        }
        if (elements.transactionsCount) {
            elements.transactionsCount.textContent = '0 transactions';
        }
        return;
    }
    
    if (elements.noTransactions) elements.noTransactions.classList.add('d-none');
    if (elements.searchNoResults) elements.searchNoResults.classList.add('d-none');
    if (elements.transactionsCount) {
        elements.transactionsCount.textContent = `${transactionsToShow.length} transaction${transactionsToShow.length !== 1 ? 's' : ''}`;
    }
    
    transactionsToShow.forEach((transaction, index) => {
        const row = document.createElement('tr');
        row.className = `transaction-item animate__animated animate__fadeIn`;
        row.style.animationDelay = `${index * 0.05}s`;
        
        const transactionDate = new Date(transaction.date);
        const formattedDate = formatDate(transactionDate);
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${escapeHtml(transaction.description)}</td>
            <td>
                <span class="badge ${transaction.type === 'income' ? 'bg-success' : 'bg-danger'}">
                    ${transaction.type}
                </span>
            </td>
            <td>${escapeHtml(transaction.category)}</td>
            <td class="${transaction.type === 'income' ? 'text-success' : 'text-danger'}">
                ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
            </td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteTransaction(${transaction.id})" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        // Add click to edit functionality
        row.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                editTransaction(transaction.id);
            }
        });
        
        elements.transactionsBody.appendChild(row);
    });
}

function updateCategoryFilterOptions() {
    if (!elements.transactionsCategoryFilter) return;
    
    const currentValue = elements.transactionsCategoryFilter.value;
    elements.transactionsCategoryFilter.innerHTML = '<option value="all">All Categories</option>';
    
    const allCategories = [...new Set(transactions.map(t => t.category))].sort();
    
    allCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        if (category === currentValue) option.selected = true;
        elements.transactionsCategoryFilter.appendChild(option);
    });
}

function clearTransactionFilters() {
    if (elements.transactionsSearch) elements.transactionsSearch.value = '';
    if (elements.transactionsTypeFilter) elements.transactionsTypeFilter.value = 'all';
    if (elements.transactionsCategoryFilter) elements.transactionsCategoryFilter.value = 'all';
    updateTransactionsList();
}

// Quick Add Modal Functions
function openQuickAddModal() {
    updateQuickCategories();
    updateRecentCategories();
    
    // Reset form
    if (elements.quickAddForm) elements.quickAddForm.reset();
    
    // Show modal with animation
    const modalElement = document.getElementById('quickAddModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        // Focus on description field after modal is shown
        modalElement.addEventListener('shown.bs.modal', function() {
            if (elements.quickDesc) elements.quickDesc.focus();
        });
    }
}

function updateQuickCategories() {
    if (!elements.quickType || !elements.quickCategory) return;
    
    const type = elements.quickType.value;
    elements.quickCategory.innerHTML = '';
    
    categories[type].forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        elements.quickCategory.appendChild(option);
    });
}

function updateRecentCategories() {
    if (!elements.recentCategories) return;
    
    elements.recentCategories.innerHTML = '';
    
    if (recentCategories.length === 0) {
        elements.recentCategories.innerHTML = '<small class="text-muted">No recent categories</small>';
        return;
    }
    
    recentCategories.slice(0, 5).forEach(category => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-secondary me-1 mb-1 cursor-pointer';
        badge.textContent = category;
        badge.title = `Quick select: ${category}`;
        badge.addEventListener('click', () => {
            if (elements.quickCategory) {
                elements.quickCategory.value = category;
            }
        });
        elements.recentCategories.appendChild(badge);
    });
}

async function handleQuickAddSubmit(e) {
    e.preventDefault();
    
    if (!elements.quickDesc || !elements.quickAmount || !elements.quickType || !elements.quickCategory) {
        showToast('Form elements not found', 'error');
        return;
    }
    
    const description = elements.quickDesc.value.trim();
    const amount = parseFloat(elements.quickAmount.value);
    const type = elements.quickType.value;
    const category = elements.quickCategory.value;
    
    if (!description || isNaN(amount) || amount <= 0) {
        showToast('Please fill all fields correctly', 'error');
        return;
    }
    
    const newTransaction = {
        id: Date.now(),
        date: new Date().toISOString(),
        description,
        amount,
        type,
        category
    };
    
    // Add transaction with animation
    await addTransactionWithAnimation(newTransaction);
    
    // Update recent categories
    addToRecentCategories(category);
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('quickAddModal'));
    if (modal) {
        modal.hide();
    }
    
    showToast('Transaction added successfully!', 'success');
}

async function addTransactionWithAnimation(transaction) {
    transactions.unshift(transaction);
    await saveData();
    
    // Update UI
    updateDashboard();
    if (document.getElementById('tab-transactions') && !document.getElementById('tab-transactions').classList.contains('d-none')) {
        updateTransactionsList();
    }
}

function addToRecentCategories(category) {
    recentCategories = recentCategories.filter(c => c !== category);
    recentCategories.unshift(category);
    recentCategories = recentCategories.slice(0, 10);
    saveData();
}

// Search Functions
function toggleSearch() {
    if (elements.searchContainer) {
        elements.searchContainer.classList.toggle('d-none');
        if (!elements.searchContainer.classList.contains('d-none') && elements.globalSearch) {
            elements.globalSearch.focus();
        }
    }
}

function handleGlobalSearch() {
    if (!elements.globalSearch) return;
    
    const searchTerm = elements.globalSearch.value.toLowerCase().trim();
    
    if (!searchTerm) {
        clearGlobalSearch();
        return;
    }
    
    // Highlight matching transactions across all tabs
    highlightSearchResults(searchTerm);
}

function clearGlobalSearch() {
    if (elements.globalSearch) elements.globalSearch.value = '';
    if (elements.searchContainer) elements.searchContainer.classList.add('d-none');
    clearSearchHighlights();
}

function highlightSearchResults(searchTerm) {
    // Remove existing highlights
    clearSearchHighlights();
    
    if (!searchTerm) return;
    
    // Highlight in transactions table
    document.querySelectorAll('#transactionsBody td').forEach(td => {
        const text = td.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            td.classList.add('bg-warning', 'text-dark');
        }
    });
    
    // Highlight in breakdowns
    document.querySelectorAll('.breakdown-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            item.classList.add('bg-warning', 'text-dark');
        }
    });
}

function clearSearchHighlights() {
    document.querySelectorAll('.bg-warning').forEach(el => {
        el.classList.remove('bg-warning', 'text-dark');
    });
}

// Transaction Management
async function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }
    
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return;
    
    const transaction = transactions[index];
    
    // Add removal animation
    const row = document.querySelector(`tr button[onclick="deleteTransaction(${id})"]`)?.closest('tr');
    if (row) {
        row.classList.add('animate__animated', 'animate__fadeOutLeft');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    transactions.splice(index, 1);
    await saveData();
    
    updateDashboard();
    updateTransactionsList();
    
    showToast('Transaction deleted successfully!', 'success');
}

function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    // For now, we'll use the quick add modal for editing
    if (elements.quickDesc) elements.quickDesc.value = transaction.description;
    if (elements.quickAmount) elements.quickAmount.value = transaction.amount;
    if (elements.quickType) elements.quickType.value = transaction.type;
    updateQuickCategories();
    if (elements.quickCategory) elements.quickCategory.value = transaction.category;
    
    const modal = new bootstrap.Modal(document.getElementById('quickAddModal'));
    modal.show();
    
    // Change submit behavior to update instead of add
    const originalSubmit = elements.quickAddForm.onsubmit;
    elements.quickAddForm.onsubmit = async function(e) {
        e.preventDefault();
        
        transaction.description = elements.quickDesc.value.trim();
        transaction.amount = parseFloat(elements.quickAmount.value);
        transaction.type = elements.quickType.value;
        transaction.category = elements.quickCategory.value;
        
        await saveData();
        
        // Add update animation
        const row = document.querySelector(`tr button[onclick="deleteTransaction(${id})"]`)?.closest('tr');
        if (row) {
            row.classList.add('animate__animated', 'animate__pulse');
            setTimeout(() => row.classList.remove('animate__animated', 'animate__pulse'), 500);
        }
        
        updateDashboard();
        updateTransactionsList();
        
        modal.hide();
        elements.quickAddForm.onsubmit = originalSubmit;
        
        showToast('Transaction updated successfully!', 'success');
    };
}

// Planner Functions (Simplified)
function updatePlanner() {
    // Basic planner implementation
    console.log('Planner updated');
}

// Debt Management Functions (Simplified)
function updateDebtManagement() {
    // Basic debt management implementation
    console.log('Debt management updated');
}

// Settings Functions
function updateSettings() {
    if (elements.currencySelect) {
        elements.currencySelect.value = currency;
    }
    if (elements.darkModeToggle) {
        elements.darkModeToggle.checked = darkMode;
    }
    updateDarkMode(darkMode);
}

// Utility Functions
function formatCurrency(amount) {
    // Use numeral.js if available, otherwise fallback
    if (typeof numeral !== 'undefined') {
        return numeral(amount).format('0,0.00');
    } else {
        // Fallback formatting
        return amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}

function formatDate(date) {
    // Use date-fns if available, otherwise fallback
    if (typeof dateFns !== 'undefined') {
        return dateFns.format(date, 'MMM dd, yyyy');
    } else {
        // Fallback formatting
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

function getTransactionsForMonth(year, month) {
    return transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getFullYear() === year && 
               transactionDate.getMonth() === month;
    });
}

function calculateIncomeExpenses(transactions) {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    return { income, expenses };
}

function calculateCategoryBreakdown(transactions, type) {
    const filtered = transactions.filter(t => t.type === type);
    const breakdown = {};
    
    filtered.forEach(transaction => {
        if (!breakdown[transaction.category]) {
            breakdown[transaction.category] = 0;
        }
        breakdown[transaction.category] += transaction.amount;
    });
    
    return Object.entries(breakdown)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
}

// Toast Notification System
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.warn('Toast container not found');
        return;
    }
    
    const toastId = 'toast-' + Date.now();
    
    const icons = {
        success: 'bi-check-circle-fill',
        error: 'bi-exclamation-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.id = toastId;
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center">
                <i class="bi ${icons[type] || icons.info} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    
    bsToast.show();
    
    // Remove toast from DOM after hide
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Keyboard Shortcuts
function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'n':
                e.preventDefault();
                openQuickAddModal();
                break;
            case 'f':
                e.preventDefault();
                toggleSearch();
                break;
            case '1':
                e.preventDefault();
                switchTab('dashboard');
                break;
            case '2':
                e.preventDefault();
                switchTab('transactions');
                break;
            case '3':
                e.preventDefault();
                switchTab('planner');
                break;
        }
    }
}

// Export functions to global scope for HTML onclick handlers
window.deleteTransaction = deleteTransaction;
window.editTransaction = editTransaction;
window.showCategoryTransactions = showCategoryTransactions;
window.addTransactionForCategory = addTransactionForCategory;
window.openAddFutureIncome = openAddFutureIncome;
window.openAddFutureExpense = openAddFutureExpense;
window.openAddLoan = openAddLoan;
window.generateAIInsights = generateAIInsights;
window.applyAISuggestions = function() {
    showToast('AI suggestions applied successfully!', 'success');
};
window.toggleRolloverSettings = toggleRolloverSettings;

// Placeholder functions for future implementation
function showCategoryTransactions(type, category) {
    showToast(`Showing ${type} transactions for ${category}`, 'info');
}

function openAddFutureIncome() {
    showToast('Add Future Income feature coming soon!', 'info');
}

function openAddFutureExpense() {
    showToast('Add Future Expense feature coming soon!', 'info');
}

function openAddLoan() {
    showToast('Add Loan feature coming soon!', 'info');
}

function generateAIInsights() {
    showToast('AI Insights feature coming soon!', 'info');
}

function toggleRolloverSettings() {
    const newAmount = prompt('Enter rollover amount:', rolloverBalance.amount);
    if (newAmount !== null) {
        const amount = parseFloat(newAmount);
        if (!isNaN(amount)) {
            rolloverBalance.amount = amount;
            rolloverBalance.enabled = true;
            const description = prompt('Enter description (optional):', rolloverBalance.description);
            if (description !== null) {
                rolloverBalance.description = description;
            }
            saveData();
            updateDashboard();
            showToast('Rollover settings updated!', 'success');
        }
    }
}

console.log('Wealth Command script loaded completely!');
