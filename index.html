// Enhanced categories with your specific list
const defaultCategories = [
    'Paycheck', 'Savings', 'Loan Returned', 'Loan Given', 'Committee Taken',
    'Food', 'Gifts', 'Mobile Balance', 'Home', 'Fuel', 'Personal',
    'Committee Given', 'Utilities', 'Debt Payment', 'Other', 'Bike Installment',
    'Bike Maintenance', 'Charity', 'Netflix', 'Loan Taken', 'Others'
];

// App state
let transactions = JSON.parse(localStorage.getItem('financeTransactions')) || [];
let categories = JSON.parse(localStorage.getItem('categories')) || 
    defaultCategories.map(name => ({ name, budget: 10000 }));
let currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
let currentTransactionType = '';

// Utility functions
function formatCurrency(amount) {
    return 'Rs ' + parseInt(amount).toLocaleString('en-PK');
}

function parseCurrency(amountStr) {
    return parseInt(amountStr.replace(/[^0-9]/g, '')) || 0;
}

function formatAmount(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    if (value) {
        value = parseInt(value).toLocaleString('en-PK');
    }
    input.value = value;
}

function updateHeaderBalance() {
    const totalIncome = transactions.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseCurrency(t.amount), 0);
    
    const totalExpenses = transactions.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseCurrency(t.amount), 0);
    
    const balance = totalIncome - totalExpenses;
    document.getElementById('headerBalance').textContent = formatCurrency(balance);
}

// Navigation
function switchTab(tabName) {
    // Update bottom nav
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.classList.remove('active');
        btn.style.transform = 'translateY(0)';
    });
    
    const activeBtn = document.querySelector(`.nav-button:nth-child(${getTabIndex(tabName)})`);
    activeBtn.classList.add('active');
    activeBtn.style.transform = 'translateY(-2px)';

    // Update content
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');

    // Refresh tab content
    if (tabName === 'dashboard') refreshDashboard();
    else if (tabName === 'transactions') renderTransactionsList();
    else if (tabName === 'analytics') refreshAnalytics();
    else if (tabName === 'settings') renderSettings();
}

function getTabIndex(tabName) {
    const tabs = ['dashboard', 'transactions', 'analytics', 'settings'];
    return tabs.indexOf(tabName) + 1;
}

// Dashboard functions
function refreshDashboard() {
    populateMonthSelect();
    updateSummaryCards();
    renderRecentTransactions();
    renderCategoryProgress();
    updateHeaderBalance();
}

function populateMonthSelect() {
    const select = document.getElementById('monthSelect');
    select.innerHTML = '';
    
    const months = [...new Set(transactions.map(t => 
        new Date(t.date).toLocaleString('default', { month: 'long', year: 'numeric' })
    ))].sort((a, b) => new Date('1 ' + a) - new Date('1 ' + b));
    
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        select.appendChild(option);
    });
    
    if (months.length > 0) {
        select.value = currentMonth;
        document.getElementById('currentMonthDisplay').textContent = currentMonth;
    }
    
    select.onchange = (e) => {
        currentMonth = e.target.value;
        document.getElementById('currentMonthDisplay').textContent = currentMonth;
        refreshDashboard();
    };
}

function updateSummaryCards() {
    const monthTransactions = transactions.filter(t => 
        new Date(t.date).toLocaleString('default', { month: 'long', year: 'numeric' }) === currentMonth
    );

    const income = monthTransactions.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseCurrency(t.amount), 0);
    
    const expenses = monthTransactions.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseCurrency(t.amount), 0);
    
    const savings = income - expenses;

    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalExpenses').textContent = formatCurrency(expenses);
    document.getElementById('netAmount').textContent = formatCurrency(savings);
}

function renderRecentTransactions() {
    const container = document.getElementById('recentTransactionsList');
    container.innerHTML = '';

    const recent = transactions
        .filter(t => new Date(t.date).toLocaleString('default', { month: 'long', year: 'numeric' }) === currentMonth)
        .slice(-5)
        .reverse();

    if (recent.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 py-4">No transactions this month</div>';
        return;
    }

    recent.forEach(transaction => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-3 bg-gray-50 rounded-lg';
        div.innerHTML = `
            <div class="flex-1">
                <div class="font-semibold">${transaction.description}</div>
                <div class="text-sm text-gray-600">${transaction.category}</div>
            </div>
            <div class="text-right">
                <div class="font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}">
                    ${formatCurrency(parseCurrency(transaction.amount))}
                </div>
                <div class="text-xs text-gray-500">${new Date(transaction.date).toLocaleDateString()}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderCategoryProgress() {
    const container = document.getElementById('categoryProgress');
    container.innerHTML = '';

    const monthTransactions = transactions.filter(t => 
        new Date(t.date).toLocaleString('default', { month: 'long', year: 'numeric' }) === currentMonth &&
        t.type === 'expense'
    );

    const categoryTotals = {};
    monthTransactions.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + parseCurrency(t.amount);
    });

    // Get top 3 categories
    const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    if (topCategories.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 py-4">No expense data this month</div>';
        return;
    }

    topCategories.forEach(([category, amount]) => {
        const categoryData = categories.find(c => c.name === category);
        const budget = categoryData ? categoryData.budget : 0;
        const percentage = budget > 0 ? Math.min((amount / budget) * 100, 100) : 0;
        
        const div = document.createElement('div');
        div.className = 'space-y-2';
        div.innerHTML = `
            <div class="flex justify-between text-sm">
                <span class="font-medium">${category}</span>
                <span>${formatCurrency(amount)} / ${formatCurrency(budget)}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300" 
                      style="width: ${percentage}%"></div>
            </div>
            <div class="flex justify-between text-xs text-gray-600">
                <span>${percentage.toFixed(1)}% used</span>
                <span>${formatCurrency(budget - amount)} remaining</span>
            </div>
        `;
        container.appendChild(div);
    });
}

// Transactions functions
function renderTransactionsList() {
    const container = document.getElementById('transactionsList');
    container.innerHTML = '';

    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const searchTerm = document.getElementById('searchTransactions').value.toLowerCase();

    const filtered = sorted.filter(t => 
        t.description.toLowerCase().includes(searchTerm) ||
        t.category.toLowerCase().includes(searchTerm) ||
        t.type.toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 py-8">No transactions found</div>';
        return;
    }

    filtered.forEach(transaction => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-4 bg-white rounded-lg shadow-sm border';
        div.innerHTML = `
            <div class="flex-1">
                <div class="font-semibold">${transaction.description}</div>
                <div class="text-sm text-gray-600">
                    ${transaction.category} • ${new Date(transaction.date).toLocaleDateString()}
                </div>
            </div>
            <div class="text-right">
                <div class="font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}">
                    ${formatCurrency(parseCurrency(transaction.amount))}
                </div>
                <button onclick="deleteTransaction('${transaction.id}')" 
                        class="text-red-500 hover:text-red-700 mt-1 touch-button">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Analytics functions
function refreshAnalytics() {
    updateAnalyticsSummary();
    renderMonthlyBreakdown();
}

function updateAnalyticsSummary() {
    const range = parseInt(document.getElementById('analyticsRange').value);
    const monthlyData = getMonthlyData(range);
    
    const avgIncome = monthlyData.income.length > 0 ? 
        monthlyData.income.reduce((a, b) => a + b, 0) / monthlyData.income.length : 0;
    const avgExpenses = monthlyData.expenses.length > 0 ? 
        monthlyData.expenses.reduce((a, b) => a + b, 0) / monthlyData.expenses.length : 0;
    const avgSavings = monthlyData.savings.length > 0 ? 
        monthlyData.savings.reduce((a, b) => a + b, 0) / monthlyData.savings.length : 0;

    document.getElementById('avgIncome').textContent = formatCurrency(avgIncome);
    document.getElementById('avgExpenses').textContent = formatCurrency(avgExpenses);
    document.getElementById('avgSavings').textContent = formatCurrency(avgSavings);
}

function renderMonthlyBreakdown() {
    const container = document.getElementById('monthlyBreakdown');
    container.innerHTML = '';

    const range = parseInt(document.getElementById('analyticsRange').value);
    const monthlyData = getMonthlyData(range);

    monthlyData.labels.forEach((month, index) => {
        const income = monthlyData.income[index];
        const expenses = monthlyData.expenses[index];
        const savings = monthlyData.savings[index];
        const savingsRate = income > 0 ? ((savings / income) * 100) : 0;

        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-3 bg-gray-50 rounded-lg';
        div.innerHTML = `
            <div class="flex-1">
                <div class="font-semibold">${month}</div>
                <div class="text-sm text-gray-600">
                    Savings Rate: ${savingsRate >= 0 ? '+' : ''}${savingsRate.toFixed(1)}%
                </div>
            </div>
            <div class="text-right space-y-1">
                <div class="text-green-600 font-semibold">+${formatCurrency(income)}</div>
                <div class="text-red-600 font-semibold">-${formatCurrency(expenses)}</div>
                <div class="text-blue-600 font-bold">${formatCurrency(savings)}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function getMonthlyData(monthCount) {
    const allMonths = [...new Set(transactions.map(t => 
        new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' })
    ))].sort((a, b) => new Date('1 ' + a) - new Date('1 ' + b));
    
    const recentMonths = monthCount === 'all' ? allMonths : allMonths.slice(-monthCount);
    
    const income = recentMonths.map(month => 
        transactions.filter(t => 
            new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' }) === month &&
            t.type === 'income'
        ).reduce((sum, t) => sum + parseCurrency(t.amount), 0)
    );
    
    const expenses = recentMonths.map(month => 
        transactions.filter(t => 
            new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' }) === month &&
            t.type === 'expense'
        ).reduce((sum, t) => sum + parseCurrency(t.amount), 0)
    );
    
    const savings = income.map((inc, i) => inc - expenses[i]);
    
    return { labels: recentMonths, income, expenses, savings };
}

// Settings functions
function renderSettings() {
    renderCategoriesList();
}

function renderCategoriesList() {
    const container = document.getElementById('categoriesList');
    container.innerHTML = '';

    // Separate income and expense categories based on usage
    const categoryUsage = {};
    transactions.forEach(t => {
        categoryUsage[t.category] = categoryUsage[t.category] || { income: 0, expense: 0 };
        categoryUsage[t.category][t.type]++;
    });

    categories.forEach((category, index) => {
        const usage = categoryUsage[category.name] || { income: 0, expense: 0 };
        const isIncomeCategory = usage.income > usage.expense;
        
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-3 bg-white rounded-lg border';
        div.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-3 h-3 rounded-full ${isIncomeCategory ? 'bg-green-500' : 'bg-red-500'}"></div>
                <div>
                    <div class="font-semibold">${category.name}</div>
                    <div class="text-sm text-gray-600">Budget: ${formatCurrency(category.budget)}</div>
                </div>
            </div>
            <div class="flex space-x-2">
                <button onclick="editCategory(${index})" class="text-blue-500 hover:text-blue-700 touch-button">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteCategory(${index})" class="text-red-500 hover:text-red-700 touch-button">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Modal functions
function showTransactionModal() {
    document.getElementById('transactionModal').classList.remove('hidden');
    document.getElementById('transDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('transAmount').value = '';
    document.getElementById('transDesc').value = '';
    currentTransactionType = '';
    updateTransactionTypeButtons();
    updateCategoryDropdown();
}

function closeModal() {
    document.getElementById('transactionModal').classList.add('hidden');
}

function setTransactionType(type) {
    currentTransactionType = type;
    updateTransactionTypeButtons();
    updateCategoryDropdown();
}

function updateTransactionTypeButtons() {
    document.querySelectorAll('.income-type, .expense-type').forEach(btn => {
        btn.classList.remove('bg-green-500', 'bg-red-500', 'text-white', 'border-green-500', 'border-red-500');
        btn.classList.add('border-gray-200', 'text-gray-700');
    });
    
    if (currentTransactionType === 'income') {
        document.querySelector('.income-type').classList.add('bg-green-500', 'text-white', 'border-green-500');
        document.querySelector('.income-type').classList.remove('border-gray-200', 'text-gray-700');
    } else if (currentTransactionType === 'expense') {
        document.querySelector('.expense-type').classList.add('bg-red-500', 'text-white', 'border-red-500');
        document.querySelector('.expense-type').classList.remove('border-gray-200', 'text-gray-700');
    }
}

function updateCategoryDropdown() {
    const select = document.getElementById('transCategory');
    select.innerHTML = '';
    select.disabled = !currentTransactionType;
    
    if (currentTransactionType) {
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            select.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Select a type first';
        select.appendChild(option);
    }
}

function saveTransaction() {
    const transaction = {
        id: Date.now().toString(),
        date: document.getElementById('transDate').value,
        description: document.getElementById('transDesc').value,
        type: currentTransactionType,
        category: document.getElementById('transCategory').value,
        amount: document.getElementById('transAmount').value
    };

    if (!transaction.date || !transaction.description || !transaction.type || 
        !transaction.category || !transaction.amount || parseCurrency(transaction.amount) <= 0) {
        alert('Please fill all fields correctly');
        return;
    }

    transactions.push(transaction);
    localStorage.setItem('financeTransactions', JSON.stringify(transactions));
    
    closeModal();
    refreshDashboard();
    if (document.getElementById('transactions').classList.contains('active')) {
        renderTransactionsList();
    }
}

function deleteTransaction(id) {
    if (confirm('Delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem('financeTransactions', JSON.stringify(transactions));
        refreshDashboard();
        renderTransactionsList();
    }
}

function showAddCategoryModal() {
    document.getElementById('addCategoryModal').classList.remove('hidden');
    document.getElementById('newCategoryName').value = '';
    document.getElementById('newCategoryBudget').value = '';
}

function closeCategoryModal() {
    document.getElementById('addCategoryModal').classList.add('hidden');
}

function saveNewCategory() {
    const name = document.getElementById('newCategoryName').value.trim();
    const budget = parseCurrency(document.getElementById('newCategoryBudget').value);

    if (!name) {
        alert('Please enter a category name');
        return;
    }

    if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
        alert('Category already exists');
        return;
    }

    categories.push({ name, budget: budget || 0 });
    localStorage.setItem('categories', JSON.stringify(categories));
    
    closeCategoryModal();
    renderSettings();
    updateCategoryDropdown();
}

function editCategory(index) {
    const newName = prompt('Edit category name:', categories[index].name);
    if (newName && newName.trim()) {
        const newBudget = prompt('Edit monthly budget:', categories[index].budget);
        categories[index].name = newName.trim();
        categories[index].budget = parseCurrency(newBudget) || categories[index].budget;
        localStorage.setItem('categories', JSON.stringify(categories));
        renderSettings();
        refreshDashboard();
    }
}

function deleteCategory(index) {
    if (confirm('Delete this category? Transactions using this category will be preserved.')) {
        categories.splice(index, 1);
        localStorage.setItem('categories', JSON.stringify(categories));
        renderSettings();
    }
}

// Search functionality
document.getElementById('searchTransactions').addEventListener('input', renderTransactionsList);

// Data management functions
function exportData() {
    const csv = ['Date,Description,Type,Category,Amount']
        .concat(transactions.map(t => 
            `"${t.date}","${t.description}","${t.type}","${t.category}","${t.amount}"`
        )).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealth-command-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

function backupData() {
    const backup = {
        transactions: transactions,
        categories: categories,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealth-command-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function resetAllData() {
    if (confirm('This will delete ALL your data. Continue?')) {
        localStorage.removeItem('financeTransactions');
        localStorage.removeItem('categories');
        transactions = [];
        categories = defaultCategories.map(name => ({ name, budget: 10000 }));
        localStorage.setItem('categories', JSON.stringify(categories));
        refreshDashboard();
        renderSettings();
    }
}

// Initialize app
function initApp() {
    if (!localStorage.getItem('categories')) {
        localStorage.setItem('categories', JSON.stringify(categories));
    }
    refreshDashboard();
    switchTab('dashboard');
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
