// Wealth Command - Enhanced Financial Management App
// Additional libraries: date-fns, numeral.js, Flatpickr, Choices.js, Animate.css

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

// DOM Elements
const elements = {
    // Tab containers
    tabDashboard: document.getElementById('tab-dashboard'),
    tabTransactions: document.getElementById('tab-transactions'),
    tabPlanner: document.getElementById('tab-planner'),
    tabDebt: document.getElementById('tab-debt'),
    tabSettings: document.getElementById('tab-settings'),
    
    // Navigation
    navDashboard: document.getElementById('nav-dashboard'),
    navTransactions: document.getElementById('nav-transactions'),
    navPlanner: document.getElementById('nav-planner'),
    navDebt: document.getElementById('nav-debt'),
    navSettings: document.getElementById('nav-settings'),
    
    // Dashboard elements
    netWealth: document.getElementById('netWealth'),
    totalIncome: document.getElementById('totalIncome'),
    totalExpense: document.getElementById('totalExpense'),
    summaryMonth: document.getElementById('summaryMonth'),
    summaryYear: document.getElementById('summaryYear'),
    incomeBreakdown: document.getElementById('incomeBreakdown'),
    expenseBreakdown: document.getElementById('expenseBreakdown'),
    noIncomeCategories: document.getElementById('noIncomeCategories'),
    noExpenseCategories: document.getElementById('noExpenseCategories'),
    
    // Transactions elements
    transactionsBody: document.getElementById('transactionsBody'),
    transactionsSearch: document.getElementById('transactionsSearch'),
    transactionsTypeFilter: document.getElementById('transactionsTypeFilter'),
    transactionsCategoryFilter: document.getElementById('transactionsCategoryFilter'),
    clearFilters: document.getElementById('clearFilters'),
    transactionsCount: document.getElementById('transactionsCount'),
    noTransactions: document.getElementById('noTransactions'),
    searchNoResults: document.getElementById('searchNoResults'),
    
    // Quick Add FAB
    quickAddFab: document.getElementById('quickAddFab'),
    quickAddModal: document.getElementById('quickAddModal'),
    quickAddForm: document.getElementById('quickAddForm'),
    quickDesc: document.getElementById('quickDesc'),
    quickAmount: document.getElementById('quickAmount'),
    quickType: document.getElementById('quickType'),
    quickCategory: document.getElementById('quickCategory'),
    recentCategories: document.getElementById('recentCategories'),
    
    // Search
    searchContainer: document.getElementById('searchContainer'),
    searchToggle: document.getElementById('searchToggle'),
    globalSearch: document.getElementById('globalSearch'),
    clearSearch: document.getElementById('clearSearch'),
    
    // Rollover Balance
    rolloverBalance: document.getElementById('rolloverBalance'),
    rolloverAmount: document.getElementById('rolloverAmount'),
    rolloverDescription: document.getElementById('rolloverDescription'),
    
    // Settings
    currencySelect: document.getElementById('currencySelect'),
    darkModeToggle: document.getElementById('darkModeToggle')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    await loadData();
    initializeEventListeners();
    initializeDateSelectors();
    initializeChoices();
    updateDashboard();
    updateTransactionsList();
    updatePlanner();
    updateDebtManagement();
    updateSettings();
    
    // Initialize Google Sign-In
    initializeGoogleSignIn();
    
    showToast('Wealth Command loaded successfully!', 'success');
}

function initializeEventListeners() {
    // Navigation
    elements.navDashboard.addEventListener('click', () => switchTab('dashboard'));
    elements.navTransactions.addEventListener('click', () => switchTab('transactions'));
    elements.navPlanner.addEventListener('click', () => switchTab('planner'));
    elements.navDebt.addEventListener('click', () => switchTab('debt'));
    elements.navSettings.addEventListener('click', () => switchTab('settings'));
    
    // Dashboard filters
    elements.summaryMonth.addEventListener('change', updateDashboard);
    elements.summaryYear.addEventListener('change', updateDashboard);
    
    // Transactions search and filters
    elements.transactionsSearch.addEventListener('input', debounce(updateTransactionsList, 300));
    elements.transactionsTypeFilter.addEventListener('change', updateTransactionsList);
    elements.transactionsCategoryFilter.addEventListener('change', updateTransactionsList);
    elements.clearFilters.addEventListener('click', clearTransactionFilters);
    
    // Quick Add FAB
    elements.quickAddFab.addEventListener('click', openQuickAddModal);
    elements.quickAddForm.addEventListener('submit', handleQuickAddSubmit);
    elements.quickType.addEventListener('change', updateQuickCategories);
    
    // Search functionality
    elements.searchToggle.addEventListener('click', toggleSearch);
    elements.globalSearch.addEventListener('input', debounce(handleGlobalSearch, 300));
    elements.clearSearch.addEventListener('click', clearGlobalSearch);
    
    // Settings
    elements.currencySelect.addEventListener('change', handleCurrencyChange);
    elements.darkModeToggle.addEventListener('change', handleDarkModeToggle);
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function initializeDateSelectors() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Populate month selector
    elements.summaryMonth.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const monthName = dateFns.format(new Date(currentYear, i, 1), 'MMMM');
        const option = document.createElement('option');
        option.value = i;
        option.textContent = monthName;
        if (i === currentMonth) option.selected = true;
        elements.summaryMonth.appendChild(option);
    }
    
    // Populate year selector (current year and previous 2 years)
    elements.summaryYear.innerHTML = '';
    for (let i = currentYear - 2; i <= currentYear; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === currentYear) option.selected = true;
        elements.summaryYear.appendChild(option);
    }
}

function initializeChoices() {
    // Initialize category selectors with Choices.js
    if (typeof Choices !== 'undefined') {
        new Choices(elements.quickCategory, {
            searchEnabled: true,
            itemSelectText: '',
            shouldSort: false
        });
        
        new Choices(elements.transactionsCategoryFilter, {
            searchEnabled: true,
            itemSelectText: '',
            shouldSort: false
        });
    }
}

// Data Management
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
        showToast('Error loading saved data', 'error');
    }
}

async function saveData() {
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

// Tab Navigation
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-page').forEach(tab => {
        tab.classList.add('d-none');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.navbar-toggler-icon-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab and activate nav button
    document.getElementById(`tab-${tabName}`).classList.remove('d-none');
    document.getElementById(`nav-${tabName}`).classList.add('active');
    
    // Update content based on tab
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
    const selectedMonth = parseInt(elements.summaryMonth.value);
    const selectedYear = parseInt(elements.summaryYear.value);
    
    const monthTransactions = getTransactionsForMonth(selectedYear, selectedMonth);
    const { income, expenses } = calculateIncomeExpenses(monthTransactions);
    const net = income - expenses;
    
    // Apply rollover balance if enabled
    let startingBalance = 0;
    if (rolloverBalance.enabled) {
        startingBalance = rolloverBalance.amount;
        elements.rolloverBalance.classList.remove('d-none');
        elements.rolloverAmount.textContent = formatCurrency(startingBalance);
        elements.rolloverDescription.textContent = rolloverBalance.description || 'Previous month balance';
    } else {
        elements.rolloverBalance.classList.add('d-none');
    }
    
    const totalNet = net + startingBalance;
    
    // Update display
    elements.netWealth.textContent = formatCurrency(totalNet);
    elements.totalIncome.textContent = formatCurrency(income);
    elements.totalExpense.textContent = formatCurrency(expenses);
    
    // Update breakdowns with animations
    updateBreakdowns(monthTransactions);
}

function updateBreakdowns(transactions) {
    const incomeBreakdown = calculateCategoryBreakdown(transactions, 'income');
    const expenseBreakdown = calculateCategoryBreakdown(transactions, 'expense');
    
    // Update income breakdown with animation
    updateBreakdownList(elements.incomeBreakdown, incomeBreakdown, 'income');
    elements.noIncomeCategories.classList.toggle('d-none', incomeBreakdown.length > 0);
    
    // Update expense breakdown with animation
    updateBreakdownList(elements.expenseBreakdown, expenseBreakdown, 'expense');
    elements.noExpenseCategories.classList.toggle('d-none', expenseBreakdown.length > 0);
}

function updateBreakdownList(container, breakdown, type) {
    container.innerHTML = '';
    
    breakdown.forEach((item, index) => {
        const breakdownItem = document.createElement('div');
        breakdownItem.className = `breakdown-item animate__animated animate__fadeIn`;
        breakdownItem.style.animationDelay = `${index * 0.1}s`;
        breakdownItem.onclick = () => showCategoryTransactions(type, item.category);
        
        breakdownItem.innerHTML = `
            <span class="breakdown-category">${item.category}</span>
            <span class="breakdown-amount">${formatCurrency(item.amount)}</span>
        `;
        
        container.appendChild(breakdownItem);
    });
}

// Transactions Functions
function updateTransactionsList() {
    const searchTerm = elements.transactionsSearch.value.toLowerCase();
    const typeFilter = elements.transactionsTypeFilter.value;
    const categoryFilter = elements.transactionsCategoryFilter.value;
    
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
    elements.transactionsBody.innerHTML = '';
    
    if (transactionsToShow.length === 0) {
        const hasSearchFilter = elements.transactionsSearch.value || 
                               elements.transactionsTypeFilter.value !== 'all' ||
                               elements.transactionsCategoryFilter.value !== 'all';
        
        elements.noTransactions.classList.toggle('d-none', hasSearchFilter);
        elements.searchNoResults.classList.toggle('d-none', !hasSearchFilter);
        elements.transactionsCount.textContent = '0 transactions';
        return;
    }
    
    elements.noTransactions.classList.add('d-none');
    elements.searchNoResults.classList.add('d-none');
    elements.transactionsCount.textContent = `${transactionsToShow.length} transaction${transactionsToShow.length !== 1 ? 's' : ''}`;
    
    transactionsToShow.forEach((transaction, index) => {
        const row = document.createElement('tr');
        row.className = `transaction-item animate__animated animate__fadeIn`;
        row.style.animationDelay = `${index * 0.05}s`;
        
        row.innerHTML = `
            <td>${dateFns.format(new Date(transaction.date), 'MMM dd, yyyy')}</td>
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

function clearTransactionFilters() {
    elements.transactionsSearch.value = '';
    elements.transactionsTypeFilter.value = 'all';
    elements.transactionsCategoryFilter.value = 'all';
    updateTransactionsList();
}

function updateCategoryFilterOptions() {
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

// Quick Add Modal Functions
function openQuickAddModal() {
    updateQuickCategories();
    updateRecentCategories();
    
    // Reset form
    elements.quickAddForm.reset();
    
    // Show modal with animation
    const modal = new bootstrap.Modal(elements.quickAddModal);
    modal.show();
    
    // Focus on description field
    setTimeout(() => elements.quickDesc.focus(), 500);
}

function updateQuickCategories() {
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
            elements.quickCategory.value = category;
        });
        elements.recentCategories.appendChild(badge);
    });
}

async function handleQuickAddSubmit(e) {
    e.preventDefault();
    
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
    const modal = bootstrap.Modal.getInstance(elements.quickAddModal);
    modal.hide();
    
    showToast('Transaction added successfully!', 'success');
}

async function addTransactionWithAnimation(transaction) {
    transactions.unshift(transaction);
    await saveData();
    
    // Update UI
    updateDashboard();
    if (elements.tabTransactions.classList.contains('d-none') === false) {
        updateTransactionsList();
    }
    
    // Add animation effect
    const event = new CustomEvent('transactionAdded', { detail: transaction });
    document.dispatchEvent(event);
}

function addToRecentCategories(category) {
    recentCategories = recentCategories.filter(c => c !== category);
    recentCategories.unshift(category);
    recentCategories = recentCategories.slice(0, 10);
}

// Search Functions
function toggleSearch() {
    elements.searchContainer.classList.toggle('d-none');
    if (!elements.searchContainer.classList.contains('d-none')) {
        elements.globalSearch.focus();
    }
}

function handleGlobalSearch() {
    const searchTerm = elements.globalSearch.value.toLowerCase().trim();
    
    if (!searchTerm) {
        clearGlobalSearch();
        return;
    }
    
    // Highlight matching transactions across all tabs
    highlightSearchResults(searchTerm);
}

function clearGlobalSearch() {
    elements.globalSearch.value = '';
    elements.searchContainer.classList.add('d-none');
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
    const row = document.querySelector(`tr[onclick*="deleteTransaction(${id})"]`)?.closest('tr');
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
    elements.quickDesc.value = transaction.description;
    elements.quickAmount.value = transaction.amount;
    elements.quickType.value = transaction.type;
    updateQuickCategories();
    elements.quickCategory.value = transaction.category;
    
    const modal = new bootstrap.Modal(elements.quickAddModal);
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
        const row = document.querySelector(`tr[onclick*="deleteTransaction(${id})"]`)?.closest('tr');
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

// Category Transactions Modal
function showCategoryTransactions(type, category) {
    const selectedMonth = parseInt(elements.summaryMonth.value);
    const selectedYear = parseInt(elements.summaryYear.value);
    
    const monthTransactions = getTransactionsForMonth(selectedYear, selectedMonth);
    const categoryTransactions = monthTransactions.filter(t => 
        t.type === type && (category === 'all' || t.category === category)
    );
    
    const totalAmount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    // Update modal title and info
    document.getElementById('categoryTransactionsTitle').textContent = 
        `${type === 'income' ? 'Income' : 'Expense'} Transactions`;
    document.getElementById('categoryTransactionsInfo').textContent = 
        `Showing ${category === 'all' ? 'all' : category} ${type} transactions for ${dateFns.format(new Date(selectedYear, selectedMonth, 1), 'MMMM yyyy')}`;
    document.getElementById('categoryTotalAmount').textContent = formatCurrency(totalAmount);
    document.getElementById('categoryTotalAmount').className = 
        `fw-bold fs-5 ${type === 'income' ? 'text-success' : 'text-danger'}`;
    
    // Update transactions list
    const transactionsList = document.getElementById('categoryTransactionsList');
    transactionsList.innerHTML = '';
    
    if (categoryTransactions.length === 0) {
        document.getElementById('noCategoryTransactions').classList.remove('d-none');
    } else {
        document.getElementById('noCategoryTransactions').classList.add('d-none');
        
        categoryTransactions.forEach((transaction, index) => {
            const item = document.createElement('div');
            item.className = `category-transaction-item d-flex justify-content-between align-items-center p-2 border-bottom animate__animated animate__fadeIn`;
            item.style.animationDelay = `${index * 0.1}s`;
            
            item.innerHTML = `
                <div>
                    <div class="fw-bold">${escapeHtml(transaction.description)}</div>
                    <small class="text-muted">${dateFns.format(new Date(transaction.date), 'MMM dd, yyyy')}</small>
                </div>
                <div class="${transaction.type === 'income' ? 'text-success' : 'text-danger'} fw-bold">
                    ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
                </div>
            `;
            
            transactionsList.appendChild(item);
        });
    }
    
    // Store current category for "Add Transaction" button
    window.currentCategoryContext = { type, category: category === 'all' ? '' : category };
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('categoryTransactionsModal'));
    modal.show();
}

function addTransactionForCategory() {
    const context = window.currentCategoryContext;
    if (!context) return;
    
    // Pre-fill quick add form with category context
    elements.quickType.value = context.type;
    updateQuickCategories();
    if (context.category) {
        elements.quickCategory.value = context.category;
    }
    
    // Close category modal and open quick add modal
    const categoryModal = bootstrap.Modal.getInstance(document.getElementById('categoryTransactionsModal'));
    categoryModal.hide();
    
    setTimeout(() => {
        openQuickAddModal();
    }, 300);
}

// Planner Functions
function updatePlanner() {
    updatePlannerSummary();
    updatePlannerTimeline();
    updateFutureIncomeList();
    updateFutureExpensesList();
}

function updatePlannerSummary() {
    // Calculate projections for the next 12 months
    const projections = calculateProjections(12);
    const totalIncome = projections.reduce((sum, month) => sum + month.income, 0);
    const totalExpenses = projections.reduce((sum, month) => sum + month.expenses, 0);
    const netWealth = totalIncome - totalExpenses;
    const endingBalance = calculateEndingBalance(projections);
    
    elements.plannerNetWealth.textContent = formatCurrency(netWealth);
    elements.plannerTotalIncome.textContent = formatCurrency(totalIncome);
    elements.plannerTotalExpenses.textContent = formatCurrency(totalExpenses);
    elements.plannerEndingBalance.textContent = formatCurrency(endingBalance);
}

function updatePlannerTimeline() {
    const timeline = document.getElementById('plannerTimeline');
    timeline.innerHTML = '';
    
    const projections = calculateProjections(12);
    
    projections.forEach((month, index) => {
        const monthElement = document.createElement('div');
        monthElement.className = `planner-month animate__animated animate__fadeIn`;
        monthElement.style.animationDelay = `${index * 0.1}s`;
        
        monthElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${month.name}</strong>
                    <div class="text-muted small">${month.year}</div>
                </div>
                <div class="text-end">
                    <div class="text-success">+${formatCurrency(month.income)}</div>
                    <div class="text-danger">-${formatCurrency(month.expenses)}</div>
                    <div class="fw-bold ${month.net >= 0 ? 'text-success' : 'text-danger'}">
                        ${month.net >= 0 ? '+' : ''}${formatCurrency(month.net)}
                    </div>
                </div>
            </div>
        `;
        
        timeline.appendChild(monthElement);
    });
}

function updateFutureIncomeList() {
    const list = document.getElementById('futureIncomeList');
    list.innerHTML = '';
    
    if (futureIncome.length === 0) {
        list.innerHTML = '<div class="text-center text-muted p-3">No future income planned</div>';
        return;
    }
    
    futureIncome.forEach((income, index) => {
        const item = document.createElement('div');
        item.className = `planner-item income animate__animated animate__fadeIn`;
        item.style.animationDelay = `${index * 0.1}s`;
        
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="fw-bold">${escapeHtml(income.description)}</div>
                    <small class="text-muted">${income.type} • ${income.frequency}</small>
                    <div class="small">Starts: ${dateFns.format(new Date(income.startDate), 'MMM dd, yyyy')}</div>
                    ${income.endDate ? `<div class="small">Ends: ${dateFns.format(new Date(income.endDate), 'MMM dd, yyyy')}</div>` : ''}
                </div>
                <div class="text-end">
                    <div class="text-success fw-bold">${formatCurrency(income.amount)}</div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="editFutureIncome(${index})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteFutureIncome(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        list.appendChild(item);
    });
}

function updateFutureExpensesList() {
    const list = document.getElementById('futureExpensesList');
    list.innerHTML = '';
    
    if (futureExpenses.length === 0) {
        list.innerHTML = '<div class="text-center text-muted p-3">No future expenses planned</div>';
        return;
    }
    
    futureExpenses.forEach((expense, index) => {
        const item = document.createElement('div');
        item.className = `planner-item expense animate__animated animate__fadeIn`;
        item.style.animationDelay = `${index * 0.1}s`;
        
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="fw-bold">${escapeHtml(expense.description)}</div>
                    <small class="text-muted">${expense.type} • ${expense.frequency}</small>
                    <div class="small">Starts: ${dateFns.format(new Date(expense.startDate), 'MMM dd, yyyy')}</div>
                    ${expense.endDate ? `<div class="small">Ends: ${dateFns.format(new Date(expense.endDate), 'MMM dd, yyyy')}</div>` : ''}
                </div>
                <div class="text-end">
                    <div class="text-danger fw-bold">${formatCurrency(expense.amount)}</div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="editFutureExpense(${index})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteFutureExpense(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        list.appendChild(item);
    });
}

// Debt Management Functions
function updateDebtManagement() {
    updateDebtSummary();
    updateLoansGivenList();
    updateLoansTakenList();
}

function updateDebtSummary() {
    const loansGiven = loans.filter(loan => loan.type === 'given');
    const loansTaken = loans.filter(loan => loan.type === 'taken');
    
    const totalGiven = loansGiven.reduce((sum, loan) => sum + loan.amount, 0);
    const totalTaken = loansTaken.reduce((sum, loan) => sum + loan.amount, 0);
    const netPosition = totalGiven - totalTaken;
    
    // Count upcoming loans (within next 30 days)
    const upcomingCount = loans.filter(loan => {
        const dueDate = new Date(loan.expectedReturn || loan.dueDate);
        const today = new Date();
        const daysDiff = (dueDate - today) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30 && daysDiff >= 0;
    }).length;
    
    elements.totalLoansGiven.textContent = formatCurrency(totalGiven);
    elements.totalLoansTaken.textContent = formatCurrency(totalTaken);
    elements.netDebtPosition.textContent = formatCurrency(netPosition);
    elements.upcomingCount.textContent = upcomingCount;
}

function updateLoansGivenList() {
    const list = document.getElementById('loansGivenList');
    list.innerHTML = '';
    
    const loansGiven = loans.filter(loan => loan.type === 'given');
    
    if (loansGiven.length === 0) {
        list.innerHTML = '<div class="text-center text-muted p-3">No loans given</div>';
        return;
    }
    
    loansGiven.forEach((loan, index) => {
        const item = document.createElement('div');
        item.className = `loan-item given animate__animated animate__fadeIn`;
        item.style.animationDelay = `${index * 0.1}s`;
        
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="fw-bold">${escapeHtml(loan.borrower)}</div>
                    ${loan.description ? `<div class="small">${escapeHtml(loan.description)}</div>` : ''}
                    <div class="small text-muted">
                        Given: ${dateFns.format(new Date(loan.dateGiven), 'MMM dd, yyyy')}
                    </div>
                    ${loan.expectedReturn ? `
                        <div class="small ${isLoanOverdue(loan) ? 'text-danger' : 'text-muted'}">
                            Expected: ${dateFns.format(new Date(loan.expectedReturn), 'MMM dd, yyyy')}
                        </div>
                    ` : ''}
                </div>
                <div class="text-end">
                    <div class="text-success fw-bold">${formatCurrency(loan.amount)}</div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="editLoan(${index})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteLoan(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        list.appendChild(item);
    });
}

function updateLoansTakenList() {
    const list = document.getElementById('loansTakenList');
    list.innerHTML = '';
    
    const loansTaken = loans.filter(loan => loan.type === 'taken');
    
    if (loansTaken.length === 0) {
        list.innerHTML = '<div class="text-center text-muted p-3">No loans taken</div>';
        return;
    }
    
    loansTaken.forEach((loan, index) => {
        const item = document.createElement('div');
        item.className = `loan-item taken animate__animated animate__fadeIn`;
        item.style.animationDelay = `${index * 0.1}s`;
        
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="fw-bold">${escapeHtml(loan.lender)}</div>
                    ${loan.description ? `<div class="small">${escapeHtml(loan.description)}</div>` : ''}
                    <div class="small text-muted">
                        Taken: ${dateFns.format(new Date(loan.dateTaken), 'MMM dd, yyyy')}
                    </div>
                    ${loan.dueDate ? `
                        <div class="small ${isLoanOverdue(loan) ? 'text-danger' : 'text-muted'}">
                            Due: ${dateFns.format(new Date(loan.dueDate), 'MMM dd, yyyy')}
                        </div>
                    ` : ''}
                </div>
                <div class="text-end">
                    <div class="text-danger fw-bold">${formatCurrency(loan.amount)}</div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="editLoan(${index})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteLoan(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        list.appendChild(item);
    });
}

// Settings Functions
function updateSettings() {
    elements.currencySelect.value = currency;
    elements.darkModeToggle.checked = darkMode;
    updateDarkMode();
}

function handleCurrencyChange() {
    currency = elements.currencySelect.value;
    saveData();
    updateDashboard();
    updateTransactionsList();
    updatePlanner();
    updateDebtManagement();
    showToast(`Currency changed to ${currency}`, 'success');
}

function handleDarkModeToggle() {
    darkMode = elements.darkModeToggle.checked;
    saveData();
    updateDarkMode();
}

function updateDarkMode() {
    if (darkMode) {
        document.documentElement.setAttribute('data-bs-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-bs-theme');
    }
}

// Utility Functions
function formatCurrency(amount) {
    return numeral(amount).format('0,0.00');
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

function calculateProjections(months) {
    const projections = [];
    const currentDate = new Date();
    
    for (let i = 0; i < months; i++) {
        const projectionDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
        const monthName = dateFns.format(projectionDate, 'MMMM');
        const year = projectionDate.getFullYear();
        
        // Calculate projected income and expenses
        const projectedIncome = calculateProjectedIncome(projectionDate);
        const projectedExpenses = calculateProjectedExpenses(projectionDate);
        const net = projectedIncome - projectedExpenses;
        
        projections.push({
            name: monthName,
            year: year,
            income: projectedIncome,
            expenses: projectedExpenses,
            net: net
        });
    }
    
    return projections;
}

function calculateProjectedIncome(date) {
    let total = 0;
    
    // Add recurring future income
    futureIncome.forEach(income => {
        if (isIncomeActive(income, date)) {
            total += income.amount;
        }
    });
    
    // Add average historical income
    const historicalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const monthsOfData = Math.max(1, new Set(transactions.map(t => 
        dateFns.format(new Date(t.date), 'yyyy-MM')
    )).size);
    
    const averageHistorical = historicalIncome / monthsOfData;
    total += averageHistorical * 0.3; // Weight historical data
    
    return total;
}

function calculateProjectedExpenses(date) {
    let total = 0;
    
    // Add recurring future expenses
    futureExpenses.forEach(expense => {
        if (isExpenseActive(expense, date)) {
            total += expense.amount;
        }
    });
    
    // Add average historical expenses
    const historicalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const monthsOfData = Math.max(1, new Set(transactions.map(t => 
        dateFns.format(new Date(t.date), 'yyyy-MM')
    )).size);
    
    const averageHistorical = historicalExpenses / monthsOfData;
    total += averageHistorical * 0.7; // Weight historical data more heavily
    
    return total;
}

function calculateEndingBalance(projections) {
    let balance = rolloverBalance.enabled ? rolloverBalance.amount : 0;
    
    projections.forEach(month => {
        balance += month.net;
    });
    
    return balance;
}

function isIncomeActive(income, date) {
    const startDate = new Date(income.startDate);
    if (date < startDate) return false;
    
    if (income.endDate) {
        const endDate = new Date(income.endDate);
        if (date > endDate) return false;
    }
    
    if (income.frequency === 'one-time') {
        return dateFns.isSameMonth(date, startDate);
    } else if (income.frequency === 'monthly') {
        return true;
    } else if (income.frequency === 'quarterly') {
        const monthsDiff = dateFns.differenceInMonths(date, startDate);
        return monthsDiff % 3 === 0;
    }
    
    return false;
}

function isExpenseActive(expense, date) {
    const startDate = new Date(expense.startDate);
    if (date < startDate) return false;
    
    if (expense.endDate) {
        const endDate = new Date(expense.endDate);
        if (date > endDate) return false;
    }
    
    if (expense.frequency === 'one-time') {
        return dateFns.isSameMonth(date, startDate);
    } else if (expense.frequency === 'monthly') {
        return true;
    } else if (expense.frequency === 'quarterly') {
        const monthsDiff = dateFns.differenceInMonths(date, startDate);
        return monthsDiff % 3 === 0;
    }
    
    return false;
}

function isLoanOverdue(loan) {
    const dueDate = new Date(loan.expectedReturn || loan.dueDate);
    return dueDate < new Date();
}

// Toast Notification System
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toastId = 'toast-' + Date.now();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.id = toastId;
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
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

// Future Income/Expense Management
function openAddFutureIncome() {
    document.getElementById('futureIncomeForm').reset();
    document.getElementById('futureIncomeIndex').value = '-1';
    
    const modal = new bootstrap.Modal(document.getElementById('futureIncomeModal'));
    modal.show();
}

function openAddFutureExpense() {
    document.getElementById('futureExpenseForm').reset();
    document.getElementById('futureExpenseIndex').value = '-1';
    
    const modal = new bootstrap.Modal(document.getElementById('futureExpenseModal'));
    modal.show();
}

// Loan Management
function openAddLoan(type) {
    document.getElementById('loanForm').reset();
    document.getElementById('loanIndex').value = '-1';
    document.getElementById('loanType').value = type;
    
    // Update form labels based on loan type
    if (type === 'given') {
        document.getElementById('loanBorrowerLabel').style.display = 'block';
        document.getElementById('loanLenderLabel').style.display = 'none';
        document.getElementById('loanDateGivenLabel').style.display = 'block';
        document.getElementById('loanDateTakenLabel').style.display = 'none';
        document.getElementById('loanExpectedReturnLabel').style.display = 'block';
        document.getElementById('loanDueDateLabel').style.display = 'none';
    } else {
        document.getElementById('loanBorrowerLabel').style.display = 'none';
        document.getElementById('loanLenderLabel').style.display = 'block';
        document.getElementById('loanDateGivenLabel').style.display = 'none';
        document.getElementById('loanDateTakenLabel').style.display = 'block';
        document.getElementById('loanExpectedReturnLabel').style.display = 'none';
        document.getElementById('loanDueDateLabel').style.display = 'block';
    }
    
    const modal = new bootstrap.Modal(document.getElementById('loanModal'));
    modal.show();
}

// AI Insights
function generateAIInsights() {
    const insightsContent = document.getElementById('aiInsightsContent');
    insightsContent.innerHTML = '<div class="text-center"><div class="spinner-border text-primary"></div><p class="mt-2">Generating insights...</p></div>';
    
    // Simulate AI processing
    setTimeout(() => {
        const insights = generateMockAIInsights();
        displayAIInsights(insights);
    }, 2000);
    
    const modal = new bootstrap.Modal(document.getElementById('aiInsightsModal'));
    modal.show();
}

function generateMockAIInsights() {
    const currentMonth = parseInt(elements.summaryMonth.value);
    const currentYear = parseInt(elements.summaryYear.value);
    const monthTransactions = getTransactionsForMonth(currentYear, currentMonth);
    
    const { income, expenses } = calculateIncomeExpenses(monthTransactions);
    const savingsRate = income > 0 ? ((income - expenses) / income * 100).toFixed(1) : 0;
    
    const expenseBreakdown = calculateCategoryBreakdown(monthTransactions, 'expense');
    const topExpense = expenseBreakdown[0];
    
    const incomeBreakdown = calculateCategoryBreakdown(monthTransactions, 'income');
    const topIncome = incomeBreakdown[0];
    
    return {
        savingsRate: parseFloat(savingsRate),
        topExpenseCategory: topExpense?.category || 'None',
        topExpenseAmount: topExpense?.amount || 0,
        topIncomeCategory: topIncome?.category || 'None',
        topIncomeAmount: topIncome?.amount || 0,
        totalIncome: income,
        totalExpenses: expenses,
        netWealth: income - expenses
    };
}

function displayAIInsights(insights) {
    const insightsContent = document.getElementById('aiInsightsContent');
    
    let html = `
        <div class="row g-3">
            <div class="col-12">
                <div class="card bg-light">
                    <div class="card-body">
                        <h6><i class="bi bi-graph-up text-primary"></i> Financial Health Score</h6>
                        <div class="progress mb-2" style="height: 20px;">
                            <div class="progress-bar bg-success" style="width: ${Math.max(0, Math.min(100, insights.savingsRate))}%">
                                ${insights.savingsRate}%
                            </div>
                        </div>
                        <small class="text-muted">Savings Rate: ${insights.savingsRate}% of income</small>
                    </div>
                </div>
            </div>
    `;
    
    if (insights.topExpenseCategory !== 'None') {
        html += `
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h6><i class="bi bi-exclamation-triangle text-warning"></i> Top Expense</h6>
                        <div class="fw-bold text-danger">${insights.topExpenseCategory}</div>
                        <div>${formatCurrency(insights.topExpenseAmount)}</div>
                        <small class="text-muted">${((insights.topExpenseAmount / insights.totalExpenses) * 100).toFixed(1)}% of total expenses</small>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (insights.topIncomeCategory !== 'None') {
        html += `
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h6><i class="bi bi-arrow-up-circle text-success"></i> Top Income</h6>
                        <div class="fw-bold text-success">${insights.topIncomeCategory}</div>
                        <div>${formatCurrency(insights.topIncomeAmount)}</div>
                        <small class="text-muted">${((insights.topIncomeAmount / insights.totalIncome) * 100).toFixed(1)}% of total income</small>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += `
        <div class="col-12">
            <div class="card">
                <div class="card-body">
                    <h6><i class="bi bi-lightbulb text-info"></i> Recommendations</h6>
                    <ul class="list-unstyled mb-0">
    `;
    
    if (insights.savingsRate < 20) {
        html += `<li><i class="bi bi-check-circle text-success"></i> Consider increasing your savings rate to at least 20%</li>`;
    }
    
    if (insights.topExpenseAmount > insights.totalIncome * 0.3) {
        html += `<li><i class="bi bi-check-circle text-success"></i> Your ${insights.topExpenseCategory} expenses are high - consider budgeting</li>`;
    }
    
    if (insights.netWealth < 0) {
        html += `<li><i class="bi bi-check-circle text-success"></i> You're spending more than you earn - review your expenses</li>`;
    } else {
        html += `<li><i class="bi bi-check-circle text-success"></i> Great job! You're living within your means</li>`;
    }
    
    html += `
                    </ul>
                </div>
            </div>
        </div>
    </div>
    `;
    
    insightsContent.innerHTML = html;
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

// Initialize Google Sign-In
function initializeGoogleSignIn() {
    // Google Sign-In initialization will be handled here
    console.log('Google Sign-In initialized');
}

// Placeholder functions for future implementation
function showGoogleSignIn() {
    const modal = new bootstrap.Modal(document.getElementById('googleSignInModal'));
    modal.show();
}

function googleSignOut() {
    showToast('Signed out successfully', 'success');
}

function manualSync() {
    showToast('Data synced successfully', 'success');
}

function exportData() {
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
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wealth-command-backup-${dateFns.format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('Data exported successfully!', 'success');
}

function importData() {
    document.getElementById('importFileInput').click();
}

document.getElementById('importFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (confirm('This will replace all your current data. Continue?')) {
                transactions = importedData.transactions || [];
                futureIncome = importedData.futureIncome || [];
                futureExpenses = importedData.futureExpenses || [];
                loans = importedData.loans || [];
                categories = importedData.categories || categories;
                recentCategories = importedData.recentCategories || [];
                currency = importedData.currency || 'PKR';
                darkMode = importedData.darkMode || false;
                rolloverBalance = importedData.rolloverBalance || rolloverBalance;
                
                saveData();
                initializeApp();
                showToast('Data imported successfully!', 'success');
            }
        } catch (error) {
            showToast('Error importing data: Invalid file format', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
});

function clearAllData() {
    if (confirm('This will permanently delete all your data. This action cannot be undone. Continue?')) {
        transactions = [];
        futureIncome = [];
        futureExpenses = [];
        loans = [];
        recentCategories = [];
        rolloverBalance = { enabled: false, amount: 0, description: '' };
        
        saveData();
        initializeApp();
        showToast('All data cleared successfully!', 'success');
    }
}

function generateSampleData() {
    if (confirm('This will generate sample data and replace your current data. Continue?')) {
        const sampleDate = new Date();
        
        // Generate sample transactions
        transactions = [
            {
                id: 1,
                date: dateFns.subDays(sampleDate, 2).toISOString(),
                description: 'Grocery Shopping',
                amount: 45.50,
                type: 'expense',
                category: 'Food'
            },
            {
                id: 2,
                date: dateFns.subDays(sampleDate, 1).toISOString(),
                description: 'Monthly Salary',
                amount: 3000.00,
                type: 'income',
                category: 'Salary'
            },
            {
                id: 3,
                date: sampleDate.toISOString(),
                description: 'Electricity Bill',
                amount: 120.00,
                type: 'expense',
                category: 'Bills'
            }
        ];
        
        // Generate sample future income
        futureIncome = [
            {
                description: 'Freelance Project',
                amount: 1500,
                type: 'Business',
                frequency: 'one-time',
                startDate: dateFns.addDays(sampleDate, 15).toISOString()
            }
        ];
        
        // Generate sample future expenses
        futureExpenses = [
            {
                description: 'Car Insurance',
                amount: 600,
                type: 'Bills',
                frequency: 'quarterly',
                startDate: dateFns.addMonths(sampleDate, 1).toISOString()
            }
        ];
        
        // Generate sample loans
        loans = [
            {
                type: 'given',
                description: 'Personal loan',
                amount: 1000,
                borrower: 'John Smith',
                dateGiven: dateFns.subMonths(sampleDate, 2).toISOString(),
                expectedReturn: dateFns.addMonths(sampleDate, 4).toISOString()
            }
        ];
        
        saveData();
        initializeApp();
        showToast('Sample data generated successfully!', 'success');
    }
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

// Add these missing function implementations
function editFutureIncome(index) {
    const income = futureIncome[index];
    document.getElementById('futureIncomeDescription').value = income.description;
    document.getElementById('futureIncomeAmount').value = income.amount;
    document.getElementById('futureIncomeType').value = income.type;
    document.getElementById('futureIncomeFrequency').value = income.frequency;
    document.getElementById('futureIncomeStartDate').value = dateFns.format(new Date(income.startDate), 'yyyy-MM-dd');
    document.getElementById('futureIncomeEndDate').value = income.endDate ? dateFns.format(new Date(income.endDate), 'yyyy-MM-dd') : '';
    document.getElementById('futureIncomeIndex').value = index;
    
    const modal = new bootstrap.Modal(document.getElementById('futureIncomeModal'));
    modal.show();
}

function deleteFutureIncome(index) {
    if (confirm('Are you sure you want to delete this future income?')) {
        futureIncome.splice(index, 1);
        saveData();
        updatePlanner();
        showToast('Future income deleted!', 'success');
    }
}

function editFutureExpense(index) {
    const expense = futureExpenses[index];
    document.getElementById('futureExpenseDescription').value = expense.description;
    document.getElementById('futureExpenseAmount').value = expense.amount;
    document.getElementById('futureExpenseType').value = expense.type;
    document.getElementById('futureExpenseFrequency').value = expense.frequency;
    document.getElementById('futureExpenseStartDate').value = dateFns.format(new Date(expense.startDate), 'yyyy-MM-dd');
    document.getElementById('futureExpenseEndDate').value = expense.endDate ? dateFns.format(new Date(expense.endDate), 'yyyy-MM-dd') : '';
    document.getElementById('futureExpenseIndex').value = index;
    
    const modal = new bootstrap.Modal(document.getElementById('futureExpenseModal'));
    modal.show();
}

function deleteFutureExpense(index) {
    if (confirm('Are you sure you want to delete this future expense?')) {
        futureExpenses.splice(index, 1);
        saveData();
        updatePlanner();
        showToast('Future expense deleted!', 'success');
    }
}

function editLoan(index) {
    const loan = loans[index];
    document.getElementById('loanDescription').value = loan.description || '';
    document.getElementById('loanAmount').value = loan.amount;
    document.getElementById('loanIndex').value = index;
    document.getElementById('loanType').value = loan.type;
    
    if (loan.type === 'given') {
        document.getElementById('loanBorrower').value = loan.borrower;
        document.getElementById('loanDateGiven').value = dateFns.format(new Date(loan.dateGiven), 'yyyy-MM-dd');
        document.getElementById('loanExpectedReturn').value = loan.expectedReturn ? dateFns.format(new Date(loan.expectedReturn), 'yyyy-MM-dd') : '';
    } else {
        document.getElementById('loanLender').value = loan.lender;
        document.getElementById('loanDateTaken').value = dateFns.format(new Date(loan.dateTaken), 'yyyy-MM-dd');
        document.getElementById('loanDueDate').value = loan.dueDate ? dateFns.format(new Date(loan.dueDate), 'yyyy-MM-dd') : '';
    }
    
    const modal = new bootstrap.Modal(document.getElementById('loanModal'));
    modal.show();
}

function deleteLoan(index) {
    if (confirm('Are you sure you want to delete this loan?')) {
        loans.splice(index, 1);
        saveData();
        updateDebtManagement();
        showToast('Loan deleted!', 'success');
    }
}

// Form submissions
document.getElementById('futureIncomeForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const index = parseInt(document.getElementById('futureIncomeIndex').value);
    const incomeData = {
        description: document.getElementById('futureIncomeDescription').value.trim(),
        amount: parseFloat(document.getElementById('futureIncomeAmount').value),
        type: document.getElementById('futureIncomeType').value,
        frequency: document.getElementById('futureIncomeFrequency').value,
        startDate: document.getElementById('futureIncomeStartDate').value,
        endDate: document.getElementById('futureIncomeEndDate').value || null
    };
    
    if (index === -1) {
        futureIncome.push(incomeData);
    } else {
        futureIncome[index] = incomeData;
    }
    
    saveData();
    updatePlanner();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('futureIncomeModal'));
    modal.hide();
    
    showToast(`Future income ${index === -1 ? 'added' : 'updated'} successfully!`, 'success');
});

document.getElementById('futureExpenseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const index = parseInt(document.getElementById('futureExpenseIndex').value);
    const expenseData = {
        description: document.getElementById('futureExpenseDescription').value.trim(),
        amount: parseFloat(document.getElementById('futureExpenseAmount').value),
        type: document.getElementById('futureExpenseType').value,
        frequency: document.getElementById('futureExpenseFrequency').value,
        startDate: document.getElementById('futureExpenseStartDate').value,
        endDate: document.getElementById('futureExpenseEndDate').value || null
    };
    
    if (index === -1) {
        futureExpenses.push(expenseData);
    } else {
        futureExpenses[index] = expenseData;
    }
    
    saveData();
    updatePlanner();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('futureExpenseModal'));
    modal.hide();
    
    showToast(`Future expense ${index === -1 ? 'added' : 'updated'} successfully!`, 'success');
});

document.getElementById('loanForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const index = parseInt(document.getElementById('loanIndex').value);
    const type = document.getElementById('loanType').value;
    const loanData = {
        type: type,
        description: document.getElementById('loanDescription').value.trim() || null,
        amount: parseFloat(document.getElementById('loanAmount').value)
    };
    
    if (type === 'given') {
        loanData.borrower = document.getElementById('loanBorrower').value.trim();
        loanData.dateGiven = document.getElementById('loanDateGiven').value;
        loanData.expectedReturn = document.getElementById('loanExpectedReturn').value || null;
    } else {
        loanData.lender = document.getElementById('loanLender').value.trim();
        loanData.dateTaken = document.getElementById('loanDateTaken').value;
        loanData.dueDate = document.getElementById('loanDueDate').value || null;
    }
    
    if (index === -1) {
        loans.push(loanData);
    } else {
        loans[index] = loanData;
    }
    
    saveData();
    updateDebtManagement();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('loanModal'));
    modal.hide();
    
    showToast(`Loan ${index === -1 ? 'added' : 'updated'} successfully!`, 'success');
});
