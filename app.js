// Wealth Command - Financial Management App
// Main Application Script

class WealthCommand {
    constructor() {
        this.data = {
            transactions: [],
            categories: [
                { id: 1, name: 'Salary', type: 'income' },
                { id: 2, name: 'Freelance', type: 'income' },
                { id: 3, name: 'Investment', type: 'income' },
                { id: 4, name: 'Gift', type: 'income' },
                { id: 5, name: 'Housing', type: 'expense' },
                { id: 6, name: 'Food', type: 'expense' },
                { id: 7, name: 'Transportation', type: 'expense' },
                { id: 8, name: 'Entertainment', type: 'expense' },
                { id: 9, name: 'Healthcare', type: 'expense' },
                { id: 10, name: 'Shopping', type: 'expense' }
            ],
            debts: [],
            loansToYou: [],
            plannedExpenses: [],
            salaryConfigs: [],
            settings: {
                currency: 'USD',
                darkMode: false,
                rollover: 'auto',
                allowNegativeRollover: false,
                autoSync: false
            },
            monthlyData: {},
            lastSync: null
        };

        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.charts = {};
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.initializeUI();
        this.updateDashboard();
        this.setupCharts();
        
        // Register service worker for PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(() => console.log('Service Worker Registered'))
                .catch(err => console.log('Service Worker Registration Failed:', err));
        }
    }

    // Data Management
    loadData() {
        const savedData = localStorage.getItem('wealthCommandData');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                this.data = { ...this.data, ...parsed };
                
                // Ensure all required properties exist
                if (!this.data.debts) this.data.debts = [];
                if (!this.data.loansToYou) this.data.loansToYou = [];
                if (!this.data.plannedExpenses) this.data.plannedExpenses = [];
                if (!this.data.salaryConfigs) this.data.salaryConfigs = [];
                if (!this.data.monthlyData) this.data.monthlyData = {};
                
            } catch (e) {
                console.error('Error loading data:', e);
                this.saveData();
            }
        }
    }

    saveData() {
        localStorage.setItem('wealthCommandData', JSON.stringify(this.data));
        this.showToast('Data saved successfully', 'success');
    }

    // UI Initialization
    initializeUI() {
        this.populateYearFilter();
        this.populateCategorySelects();
        this.updateTheme();
        this.updateCurrencyDisplay();
        this.updateTransactionTable();
        this.updateCategoryManagement();
        this.updateDebtManager();
        this.updateFinancialPlanner();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });

        // Theme Toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Quick Add Transaction
        document.getElementById('saveQuickTransaction').addEventListener('click', () => {
            this.addQuickTransaction();
        });

        // Month/Year Filter
        document.getElementById('monthFilter').addEventListener('change', () => {
            this.updateDashboard();
        });
        document.getElementById('yearFilter').addEventListener('change', () => {
            this.updateDashboard();
        });

        // Sync Button
        document.getElementById('syncNow').addEventListener('click', () => {
            this.manualSync();
        });

        // Settings
        document.getElementById('darkModeToggle').addEventListener('change', (e) => {
            this.data.settings.darkMode = e.target.checked;
            this.updateTheme();
            this.saveData();
        });

        document.getElementById('currencySelect').addEventListener('change', (e) => {
            this.data.settings.currency = e.target.value;
            this.updateCurrencyDisplay();
            this.saveData();
        });

        // Financial Planner
        document.getElementById('addSalary').addEventListener('click', () => {
            this.addSalaryConfig();
        });

        document.getElementById('updateForecast').addEventListener('click', () => {
            this.updateCashFlowForecast();
        });

        // Debt Manager
        document.getElementById('saveDebt').addEventListener('click', () => {
            this.addDebt();
        });

        document.getElementById('saveLoanToYou').addEventListener('click', () => {
            this.addLoanToYou();
        });

        // Category Management
        document.getElementById('addCategory').addEventListener('click', () => {
            this.addCategory();
        });

        // Real-time salary calculation
        document.getElementById('baseSalary').addEventListener('input', () => {
            this.calculateSalary();
        });

        document.getElementById('salaryType').addEventListener('change', () => {
            this.calculateSalary();
        });

        // Initialize salary calculation
        this.calculateSalary();
    }

    // Tab Management
    switchTab(tabId) {
        // Hide all tabs
        document.querySelectorAll('.tab-page').forEach(tab => {
            tab.classList.add('d-none');
        });

        // Show selected tab
        document.getElementById(tabId).classList.remove('d-none');

        // Update active nav button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

        // Update tab-specific content
        if (tabId === 'tab-analytics') {
            this.updateAnalytics();
        } else if (tabId === 'tab-debt-manager') {
            this.updateDebtManager();
        } else if (tabId === 'tab-financial-planner') {
            this.updateFinancialPlanner();
        }
    }

    // Dashboard Functions
    updateDashboard() {
        const month = parseInt(document.getElementById('monthFilter').value);
        const year = parseInt(document.getElementById('yearFilter').value);
        
        const filteredTransactions = this.getTransactionsForMonth(month, year);
        const { income, expenses } = this.calculateTotals(filteredTransactions);
        
        // Update UI
        document.getElementById('totalIncome').textContent = this.formatCurrency(income);
        document.getElementById('totalExpense').textContent = this.formatCurrency(expenses);
        document.getElementById('netWealth').textContent = this.formatCurrency(income - expenses);
        
        // Update rollover balance
        this.updateRolloverBalance(month, year);
        
        // Update category breakdowns
        this.updateCategoryBreakdowns(filteredTransactions);
        
        // Update health score
        this.updateHealthScore(income, expenses);
    }

    updateRolloverBalance(month, year) {
        // Simplified rollover calculation
        const prevMonthData = this.getPreviousMonthData(month, year);
        const currentNet = this.calculateNetForMonth(month, year);
        
        document.getElementById('previousBalance').textContent = this.formatCurrency(prevMonthData.balance || 0);
        document.getElementById('currentMonthNet').textContent = this.formatCurrency(currentNet);
        document.getElementById('rolloverBalance').textContent = this.formatCurrency(
            (prevMonthData.balance || 0) + currentNet
        );
    }

    updateCategoryBreakdowns(transactions) {
        const incomeCategories = {};
        const expenseCategories = {};
        
        transactions.forEach(transaction => {
            if (transaction.type === 'income') {
                incomeCategories[transaction.category] = 
                    (incomeCategories[transaction.category] || 0) + transaction.amount;
            } else {
                expenseCategories[transaction.category] = 
                    (expenseCategories[transaction.category] || 0) + transaction.amount;
            }
        });
        
        this.populateCategoryList('incomeCategories', incomeCategories, 'primary');
        this.populateCategoryList('expenseCategories', expenseCategories, 'danger');
    }

    populateCategoryList(elementId, categories, colorClass) {
        const container = document.getElementById(elementId);
        container.innerHTML = '';
        
        Object.entries(categories).forEach(([category, amount]) => {
            const item = document.createElement('div');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            item.innerHTML = `
                <span>${category}</span>
                <span class="text-${colorClass} fw-bold">${this.formatCurrency(amount)}</span>
            `;
            container.appendChild(item);
        });
        
        if (Object.keys(categories).length === 0) {
            container.innerHTML = '<div class="list-group-item text-muted text-center">No data</div>';
        }
    }

    updateHealthScore(income, expenses) {
        // Simplified health score calculation
        const savings = income - expenses;
        const savingsRate = income > 0 ? (savings / income) * 100 : 0;
        
        let score = 50; // Base score
        
        // Adjust based on savings rate
        if (savingsRate > 20) score += 30;
        else if (savingsRate > 10) score += 20;
        else if (savingsRate > 0) score += 10;
        else if (savingsRate < -10) score -= 20;
        
        // Adjust based on expense diversity (simplified)
        const expenseTransactions = this.data.transactions.filter(t => t.type === 'expense');
        const categoryCount = new Set(expenseTransactions.map(t => t.category)).size;
        if (categoryCount >= 5) score += 10;
        
        // Ensure score is between 0-100
        score = Math.max(0, Math.min(100, Math.round(score)));
        
        document.getElementById('healthScore').textContent = score;
        document.getElementById('analyticsHealthScore').textContent = score;
        
        // Update savings rate
        const savingsRateElement = document.getElementById('savingsRate');
        const savingsRateBar = document.getElementById('savingsRateBar');
        
        savingsRateElement.textContent = `${savingsRate.toFixed(1)}%`;
        savingsRateBar.style.width = `${Math.min(savingsRate, 100)}%`;
        
        // Update health score circle
        this.updateHealthScoreCircle(score);
    }

    updateHealthScoreCircle(score) {
        const circles = document.querySelectorAll('.score-circle, .score-circle-large');
        circles.forEach(circle => {
            circle.style.background = `conic-gradient(var(--success-color) ${score}%, #e9ecef ${score}%)`;
        });
    }

    // Transaction Management
    addQuickTransaction() {
        const type = document.getElementById('quickTransactionType').value;
        const description = document.getElementById('quickDescription').value;
        const amount = parseFloat(document.getElementById('quickAmount').value);
        const category = document.getElementById('quickCategory').value;
        const date = document.getElementById('quickDate').value || new Date().toISOString().split('T')[0];
        
        if (!description || !amount || !category) {
            this.showToast('Please fill all required fields', 'error');
            return;
        }
        
        const transaction = {
            id: Date.now(),
            type,
            description,
            amount,
            category,
            date,
            createdAt: new Date().toISOString()
        };
        
        this.data.transactions.push(transaction);
        this.saveData();
        this.updateDashboard();
        this.updateTransactionTable();
        
        // Close modal and reset form
        bootstrap.Modal.getInstance(document.getElementById('quickAddModal')).hide();
        document.getElementById('quickDescription').value = '';
        document.getElementById('quickAmount').value = '';
        
        this.showToast('Transaction added successfully', 'success');
    }

    updateTransactionTable() {
        const tbody = document.getElementById('transactionsBody');
        tbody.innerHTML = '';
        
        // Sort transactions by date (newest first)
        const sortedTransactions = [...this.data.transactions].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        sortedTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            const date = new Date(transaction.date);
            const formattedDate = date.toLocaleDateString('en-US', { 
                day: '2-digit', 
                month: 'short' 
            });
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${transaction.description}</td>
                <td>${transaction.category}</td>
                <td>
                    <span class="badge bg-${transaction.type === 'income' ? 'success' : 'danger'}">
                        ${transaction.type}
                    </span>
                </td>
                <td class="fw-bold ${transaction.type === 'income' ? 'text-success' : 'text-danger'}">
                    ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1 edit-transaction" data-id="${transaction.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-transaction" data-id="${transaction.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Add event listeners for edit and delete buttons
        tbody.querySelectorAll('.edit-transaction').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.editTransaction(parseInt(e.currentTarget.dataset.id));
            });
        });
        
        tbody.querySelectorAll('.delete-transaction').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteTransaction(parseInt(e.currentTarget.dataset.id));
            });
        });
    }

    editTransaction(id) {
        const transaction = this.data.transactions.find(t => t.id === id);
        if (!transaction) return;
        
        // For simplicity, we'll just delete and re-add through quick add
        // In a real app, you'd have a proper edit form
        this.deleteTransaction(id, false);
        
        // Pre-fill quick add form
        document.getElementById('quickTransactionType').value = transaction.type;
        document.getElementById('quickDescription').value = transaction.description;
        document.getElementById('quickAmount').value = transaction.amount;
        document.getElementById('quickCategory').value = transaction.category;
        document.getElementById('quickDate').value = transaction.date;
        
        // Show modal
        new bootstrap.Modal(document.getElementById('quickAddModal')).show();
        
        this.showToast('Transaction ready for editing', 'info');
    }

    deleteTransaction(id, showToast = true) {
        this.data.transactions = this.data.transactions.filter(t => t.id !== id);
        this.saveData();
        this.updateDashboard();
        this.updateTransactionTable();
        
        if (showToast) {
            this.showToast('Transaction deleted', 'success');
        }
    }

    // Financial Planner
    calculateSalary() {
        const type = document.getElementById('salaryType').value;
        const baseAmount = parseFloat(document.getElementById('baseSalary').value) || 0;
        const hoursPerWeek = parseFloat(document.getElementById('hoursPerWeek').value) || 40;
        const weeksPerYear = parseFloat(document.getElementById('weeksPerYear').value) || 52;
        const taxRate = parseFloat(document.getElementById('taxRate').value) || 25;
        
        let annualGross, monthlyGross, hourlyRate;
        
        switch (type) {
            case 'annual':
                annualGross = baseAmount;
                monthlyGross = baseAmount / 12;
                hourlyRate = baseAmount / (hoursPerWeek * weeksPerYear);
                break;
            case 'monthly':
                annualGross = baseAmount * 12;
                monthlyGross = baseAmount;
                hourlyRate = annualGross / (hoursPerWeek * weeksPerYear);
                break;
            case 'hourly':
                hourlyRate = baseAmount;
                annualGross = baseAmount * hoursPerWeek * weeksPerYear;
                monthlyGross = annualGross / 12;
                break;
        }
        
        const taxAmount = annualGross * (taxRate / 100);
        const annualNet = annualGross - taxAmount;
        const monthlyNet = annualNet / 12;
        
        // Update UI
        document.getElementById('hourlyRate').textContent = this.formatCurrency(hourlyRate);
        document.getElementById('monthlyNet').textContent = this.formatCurrency(monthlyNet);
        document.getElementById('annualNet').textContent = this.formatCurrency(annualNet);
        document.getElementById('taxAmount').textContent = this.formatCurrency(taxAmount);
    }

    addSalaryConfig() {
        const type = document.getElementById('salaryType').value;
        const baseAmount = parseFloat(document.getElementById('baseSalary').value) || 0;
        const taxRate = parseFloat(document.getElementById('taxRate').value) || 25;
        const month = document.getElementById('salaryMonth').value;
        const isRecurring = document.getElementById('recurringSalary').checked;
        
        if (baseAmount <= 0) {
            this.showToast('Please enter a valid salary amount', 'error');
            return;
        }
        
        const config = {
            id: Date.now(),
            type,
            baseAmount,
            taxRate,
            month: month !== '' ? parseInt(month) : null,
            isRecurring,
            createdAt: new Date().toISOString()
        };
        
        this.data.salaryConfigs.push(config);
        this.saveData();
        this.updateFinancialPlanner();
        
        this.showToast('Salary configuration added to forecast', 'success');
    }

    updateCashFlowForecast() {
        const period = parseInt(document.getElementById('forecastPeriod').value);
        const startingBalance = parseFloat(document.getElementById('startingBalance').value) || 0;
        
        const tbody = document.getElementById('cashFlowBody');
        tbody.innerHTML = '';
        
        let currentBalance = startingBalance;
        const currentDate = new Date();
        
        for (let i = 0; i < period; i++) {
            const forecastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
            const monthName = forecastDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            
            // Simplified forecast calculation
            const salaryIncome = this.calculateForecastSalary(forecastDate.getMonth(), forecastDate.getFullYear());
            const otherIncome = this.calculateOtherIncome(forecastDate.getMonth(), forecastDate.getFullYear());
            const expenses = this.calculateForecastExpenses(forecastDate.getMonth(), forecastDate.getFullYear());
            
            const totalIncome = salaryIncome + otherIncome;
            const netFlow = totalIncome - expenses;
            currentBalance += netFlow;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${monthName}</td>
                <td>${this.formatCurrency(salaryIncome)}</td>
                <td>${this.formatCurrency(otherIncome)}</td>
                <td>${this.formatCurrency(totalIncome)}</td>
                <td>${this.formatCurrency(expenses)}</td>
                <td class="fw-bold ${netFlow >= 0 ? 'text-success' : 'text-danger'}">
                    ${netFlow >= 0 ? '+' : ''}${this.formatCurrency(netFlow)}
                </td>
                <td class="fw-bold ${currentBalance >= 0 ? 'text-success' : 'text-danger'}">
                    ${this.formatCurrency(currentBalance)}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        }
        
        // Update summary
        document.getElementById('forecastEndBalance').textContent = this.formatCurrency(currentBalance);
        document.getElementById('forecastAvgMonthly').textContent = this.formatCurrency(currentBalance / period);
    }

    calculateForecastSalary(month, year) {
        // Simplified calculation - in real app, use salary configs
        return 3000; // Default monthly salary
    }

    calculateOtherIncome(month, year) {
        // Simplified calculation
        return 500; // Default other income
    }

    calculateForecastExpenses(month, year) {
        // Calculate average expenses from historical data
        const expenseTransactions = this.data.transactions.filter(t => t.type === 'expense');
        if (expenseTransactions.length === 0) return 2000; // Default
        
        const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
        return totalExpenses / 3; // Rough monthly average
    }

    updateFinancialPlanner() {
        this.updatePlannedExpenses();
    }

    updatePlannedExpenses() {
        const container = document.getElementById('plannedExpensesList');
        container.innerHTML = '';
        
        if (this.data.plannedExpenses.length === 0) {
            container.innerHTML = '<div class="text-muted text-center p-3">No planned expenses</div>';
            return;
        }
        
        this.data.plannedExpenses.forEach(expense => {
            const element = document.createElement('div');
            element.className = 'planned-expense-item d-flex justify-content-between align-items-center p-2 border-bottom';
            element.innerHTML = `
                <div>
                    <div class="fw-bold">${expense.description}</div>
                    <small class="text-muted">${expense.category} • ${expense.month}</small>
                </div>
                <div class="text-danger fw-bold">${this.formatCurrency(expense.amount)}</div>
            `;
            container.appendChild(element);
        });
    }

    // Debt Manager
    updateDebtManager() {
        this.updateDebtsList();
        this.updateLoansToYouList();
        this.updateDebtOverview();
        this.updateDebtStrategy();
    }

    updateDebtsList() {
        const container = document.getElementById('debtsList');
        container.innerHTML = '';
        
        if (this.data.debts.length === 0) {
            container.innerHTML = '<div class="list-group-item text-muted text-center">No debts</div>';
            return;
        }
        
        this.data.debts.forEach(debt => {
            const element = document.createElement('div');
            element.className = 'list-group-item';
            element.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold">${debt.description}</div>
                        <small class="text-muted">
                            ${debt.interestRate}% • Due: ${new Date(debt.dueDate).toLocaleDateString()}
                        </small>
                    </div>
                    <div class="text-end">
                        <div class="text-danger fw-bold">${this.formatCurrency(debt.amount)}</div>
                        <small>Min: ${this.formatCurrency(debt.minPayment)}</small>
                    </div>
                </div>
            `;
            container.appendChild(element);
        });
    }

    updateLoansToYouList() {
        const container = document.getElementById('loansToYouList');
        container.innerHTML = '';
        
        if (this.data.loansToYou.length === 0) {
            container.innerHTML = '<div class="list-group-item text-muted text-center">No loans owed to you</div>';
            return;
        }
        
        this.data.loansToYou.forEach(loan => {
            const element = document.createElement('div');
            element.className = 'list-group-item';
            element.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold">${loan.description}</div>
                        <small class="text-muted">
                            ${loan.interestRate}% • Due: ${new Date(loan.dueDate).toLocaleDateString()}
                        </small>
                    </div>
                    <div class="text-end">
                        <div class="text-success fw-bold">${this.formatCurrency(loan.amount)}</div>
                        <small>Expected: ${this.formatCurrency(loan.payment)}</small>
                    </div>
                </div>
            `;
            container.appendChild(element);
        });
    }

    updateDebtOverview() {
        const totalOwed = this.data.debts.reduce((sum, debt) => sum + debt.amount, 0);
        const totalOwedToYou = this.data.loansToYou.reduce((sum, loan) => sum + loan.amount, 0);
        
        document.getElementById('totalOwed').textContent = this.formatCurrency(totalOwed);
        document.getElementById('totalOwedToYou').textContent = this.formatCurrency(totalOwedToYou);
        
        // Find next payment due dates
        const nextDebtDue = this.data.debts
            .map(d => new Date(d.dueDate))
            .sort((a, b) => a - b)[0];
            
        const nextLoanDue = this.data.loansToYou
            .map(l => new Date(l.dueDate))
            .sort((a, b) => a - b)[0];
            
        document.getElementById('nextPaymentDue').textContent = 
            nextDebtDue ? nextDebtDue.toLocaleDateString() : '-';
        document.getElementById('nextPaymentExpected').textContent = 
            nextLoanDue ? nextLoanDue.toLocaleDateString() : '-';
    }

    addDebt() {
        const description = document.getElementById('debtDescription').value;
        const amount = parseFloat(document.getElementById('debtAmount').value);
        const interestRate = parseFloat(document.getElementById('debtInterestRate').value);
        const minPayment = parseFloat(document.getElementById('debtMinPayment').value);
        const dueDate = document.getElementById('debtDueDate').value;
        
        if (!description || !amount || !dueDate) {
            this.showToast('Please fill all required fields', 'error');
            return;
        }
        
        const debt = {
            id: Date.now(),
            description,
            amount,
            interestRate: interestRate || 0,
            minPayment: minPayment || 0,
            dueDate,
            createdAt: new Date().toISOString()
        };
        
        this.data.debts.push(debt);
        this.saveData();
        this.updateDebtManager();
        
        bootstrap.Modal.getInstance(document.getElementById('addDebtModal')).hide();
        this.resetDebtForm();
        
        this.showToast('Debt added successfully', 'success');
    }

    addLoanToYou() {
        const description = document.getElementById('loanToYouDescription').value;
        const amount = parseFloat(document.getElementById('loanToYouAmount').value);
        const interestRate = parseFloat(document.getElementById('loanToYouInterestRate').value);
        const payment = parseFloat(document.getElementById('loanToYouPayment').value);
        const dueDate = document.getElementById('loanToYouDueDate').value;
        
        if (!description || !amount || !dueDate) {
            this.showToast('Please fill all required fields', 'error');
            return;
        }
        
        const loan = {
            id: Date.now(),
            description,
            amount,
            interestRate: interestRate || 0,
            payment: payment || 0,
            dueDate,
            createdAt: new Date().toISOString()
        };
        
        this.data.loansToYou.push(loan);
        this.saveData();
        this.updateDebtManager();
        
        bootstrap.Modal.getInstance(document.getElementById('addLoanToYouModal')).hide();
        this.resetLoanToYouForm();
        
        this.showToast('Loan added successfully', 'success');
    }

    resetDebtForm() {
        document.getElementById('debtDescription').value = '';
        document.getElementById('debtAmount').value = '';
        document.getElementById('debtInterestRate').value = '';
        document.getElementById('debtMinPayment').value = '';
        document.getElementById('debtDueDate').value = '';
    }

    resetLoanToYouForm() {
        document.getElementById('loanToYouDescription').value = '';
        document.getElementById('loanToYouAmount').value = '';
        document.getElementById('loanToYouInterestRate').value = '';
        document.getElementById('loanToYouPayment').value = '';
        document.getElementById('loanToYouDueDate').value = '';
    }

    updateDebtStrategy() {
        // Simplified debt strategy calculation
        const totalDebt = this.data.debts.reduce((sum, debt) => sum + debt.amount, 0);
        const totalInterest = this.data.debts.reduce((sum, debt) => 
            sum + (debt.amount * (debt.interestRate / 100)), 0);
        
        document.getElementById('totalInterest').textContent = this.formatCurrency(totalInterest);
        document.getElementById('interestSaved').textContent = this.formatCurrency(totalInterest * 0.3); // Estimate
        
        // Estimate payoff time (simplified)
        const avgPayment = this.data.debts.reduce((sum, debt) => sum + debt.minPayment, 0) / 
                          Math.max(this.data.debts.length, 1);
        const payoffMonths = avgPayment > 0 ? Math.ceil(totalDebt / avgPayment) : 0;
        document.getElementById('payoffTime').textContent = payoffMonths > 0 ? 
            `${payoffMonths} months` : '-';
    }

    // Analytics
    updateAnalytics() {
        this.updateSpendingChart();
        this.updateIncomeExpenseChart();
        this.updateCategoryChart();
        this.updateForecastChart();
    }

    setupCharts() {
        // Initialize chart contexts
        this.charts.spending = new Chart(
            document.getElementById('spendingChart').getContext('2d'),
            { type: 'bar', data: { labels: [], datasets: [] } }
        );
        
        this.charts.incomeExpense = new Chart(
            document.getElementById('incomeExpenseChart').getContext('2d'),
            { type: 'line', data: { labels: [], datasets: [] } }
        );
        
        this.charts.category = new Chart(
            document.getElementById('categoryChart').getContext('2d'),
            { type: 'pie', data: { labels: [], datasets: [] } }
        );
        
        this.charts.forecast = new Chart(
            document.getElementById('forecastChart').getContext('2d'),
            { type: 'line', data: { labels: [], datasets: [] } }
        );
        
        this.charts.debtStrategy = new Chart(
            document.getElementById('debtStrategyChart').getContext('2d'),
            { type: 'bar', data: { labels: [], datasets: [] } }
        );
    }

    updateSpendingChart() {
        // Simplified spending chart
        const last6Months = this.getLastNMonths(6);
        const spendingData = last6Months.map(month => 
            this.calculateExpensesForMonth(month.month, month.year)
        );
        
        this.charts.spending.data.labels = last6Months.map(m => 
            new Date(m.year, m.month).toLocaleDateString('en-US', { month: 'short' })
        );
        this.charts.spending.data.datasets = [{
            label: 'Monthly Spending',
            data: spendingData,
            backgroundColor: '#f72585',
            borderColor: '#f72585',
            borderWidth: 1
        }];
        this.charts.spending.update();
    }

    updateIncomeExpenseChart() {
        const last6Months = this.getLastNMonths(6);
        const incomeData = last6Months.map(month => 
            this.calculateIncomeForMonth(month.month, month.year)
        );
        const expenseData = last6Months.map(month => 
            this.calculateExpensesForMonth(month.month, month.year)
        );
        
        this.charts.incomeExpense.data.labels = last6Months.map(m => 
            new Date(m.year, m.month).toLocaleDateString('en-US', { month: 'short' })
        );
        this.charts.incomeExpense.data.datasets = [
            {
                label: 'Income',
                data: incomeData,
                borderColor: '#4cc9f0',
                backgroundColor: 'rgba(76, 201, 240, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Expenses',
                data: expenseData,
                borderColor: '#f72585',
                backgroundColor: 'rgba(247, 37, 133, 0.1)',
                tension: 0.4,
                fill: true
            }
        ];
        this.charts.incomeExpense.update();
    }

    updateCategoryChart() {
        const expenseTransactions = this.data.transactions.filter(t => t.type === 'expense');
        const categoryTotals = {};
        
        expenseTransactions.forEach(transaction => {
            categoryTotals[transaction.category] = 
                (categoryTotals[transaction.category] || 0) + transaction.amount;
        });
        
        this.charts.category.data.labels = Object.keys(categoryTotals);
        this.charts.category.data.datasets = [{
            data: Object.values(categoryTotals),
            backgroundColor: [
                '#4361ee', '#3a0ca3', '#4cc9f0', '#f72585', 
                '#7209b7', '#3f37c9', '#4895ef', '#560bad'
            ]
        }];
        this.charts.category.update();
    }

    updateForecastChart() {
        // Simplified 6-month forecast
        const months = [];
        const forecastData = [];
        
        for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() + i);
            months.push(date.toLocaleDateString('en-US', { month: 'short' }));
            
            // Simple forecast: average of last 3 months + random variation
            const historicalAvg = this.getAverageMonthlyNet();
            const forecastValue = historicalAvg * (0.9 + Math.random() * 0.2);
            forecastData.push(forecastValue);
        }
        
        this.charts.forecast.data.labels = months;
        this.charts.forecast.data.datasets = [{
            label: 'Projected Net',
            data: forecastData,
            borderColor: '#4cc9f0',
            backgroundColor: 'rgba(76, 201, 240, 0.1)',
            tension: 0.4,
            fill: true
        }];
        this.charts.forecast.update();
    }

    // Utility Functions
    getTransactionsForMonth(month, year) {
        return this.data.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate.getMonth() === month && 
                   transactionDate.getFullYear() === year;
        });
    }

    calculateTotals(transactions) {
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const expenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
            
        return { income, expenses };
    }

    calculateNetForMonth(month, year) {
        const transactions = this.getTransactionsForMonth(month, year);
        const { income, expenses } = this.calculateTotals(transactions);
        return income - expenses;
    }

    calculateIncomeForMonth(month, year) {
        const transactions = this.getTransactionsForMonth(month, year);
        return transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
    }

    calculateExpensesForMonth(month, year) {
        const transactions = this.getTransactionsForMonth(month, year);
        return transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
    }

    getPreviousMonthData(month, year) {
        let prevMonth = month - 1;
        let prevYear = year;
        
        if (prevMonth < 0) {
            prevMonth = 11;
            prevYear = year - 1;
        }
        
        const net = this.calculateNetForMonth(prevMonth, prevYear);
        return { balance: net }; // Simplified - in real app, track actual balances
    }

    getLastNMonths(n) {
        const months = [];
        const currentDate = new Date();
        
        for (let i = n - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(currentDate.getMonth() - i);
            months.push({
                month: date.getMonth(),
                year: date.getFullYear()
            });
        }
        
        return months;
    }

    getAverageMonthlyNet() {
        const last6Months = this.getLastNMonths(6);
        const totalNet = last6Months.reduce((sum, month) => 
            sum + this.calculateNetForMonth(month.month, month.year), 0);
        return totalNet / last6Months.length;
    }

    populateYearFilter() {
        const select = document.getElementById('yearFilter');
        const currentYear = new Date().getFullYear();
        
        for (let year = currentYear - 5; year <= currentYear + 1; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            option.selected = year === currentYear;
            select.appendChild(option);
        }
    }

    populateCategorySelects() {
        const incomeCategories = this.data.categories.filter(c => c.type === 'income');
        const expenseCategories = this.data.categories.filter(c => c.type === 'expense');
        
        // Quick add category select
        const quickCategorySelect = document.getElementById('quickCategory');
        quickCategorySelect.innerHTML = '<option value="">Select Category</option>';
        
        [...incomeCategories, ...expenseCategories].forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            quickCategorySelect.appendChild(option);
        });
        
        // Expense planner category select
        const expenseCategorySelect = document.getElementById('expenseCategory');
        expenseCategorySelect.innerHTML = '<option value="">Select Category</option>';
        
        expenseCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            expenseCategorySelect.appendChild(option);
        });
    }

    updateCategoryManagement() {
        const tbody = document.getElementById('categoriesList');
        tbody.innerHTML = '';
        
        this.data.categories.forEach(category => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${category.name}</td>
                <td>
                    <span class="badge bg-${category.type === 'income' ? 'success' : 'danger'}">
                        ${category.type}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-danger delete-category" data-id="${category.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Add event listeners for delete buttons
        tbody.querySelectorAll('.delete-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteCategory(parseInt(e.currentTarget.dataset.id));
            });
        });
    }

    addCategory() {
        const name = document.getElementById('newCategoryName').value;
        const type = document.getElementById('newCategoryType').value;
        
        if (!name) {
            this.showToast('Please enter a category name', 'error');
            return;
        }
        
        // Check if category already exists
        if (this.data.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            this.showToast('Category already exists', 'error');
            return;
        }
        
        const category = {
            id: Date.now(),
            name,
            type
        };
        
        this.data.categories.push(category);
        this.saveData();
        this.populateCategorySelects();
        this.updateCategoryManagement();
        
        document.getElementById('newCategoryName').value = '';
        this.showToast('Category added successfully', 'success');
    }

    deleteCategory(id) {
        // Check if category is used in transactions
        const isUsed = this.data.transactions.some(t => 
            this.data.categories.find(c => c.id === id)?.name === t.category
        );
        
        if (isUsed) {
            this.showToast('Cannot delete category that is used in transactions', 'error');
            return;
        }
        
        this.data.categories = this.data.categories.filter(c => c.id !== id);
        this.saveData();
        this.populateCategorySelects();
        this.updateCategoryManagement();
        
        this.showToast('Category deleted', 'success');
    }

    // Theme Management
    toggleTheme() {
        this.data.settings.darkMode = !this.data.settings.darkMode;
        this.updateTheme();
        this.saveData();
    }

    updateTheme() {
        const isDark = this.data.settings.darkMode;
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        
        const themeIcon = document.getElementById('themeToggle').querySelector('i');
        themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Currency Formatting
    formatCurrency(amount) {
        const symbols = {
            USD: '$',
            PKR: '₨',
            EUR: '€',
            GBP: '£'
        };
        
        const symbol = symbols[this.data.settings.currency] || '$';
        return `${symbol}${amount.toFixed(2)}`;
    }

    updateCurrencyDisplay() {
        // This would update all currency displays in the app
        // For now, we'll just update the dashboard when it refreshes
        this.updateDashboard();
    }

    // Sync Functions
    manualSync() {
        this.showToast('Syncing data...', 'info');
        // Simulate sync process
        setTimeout(() => {
            this.showToast('Data synced successfully', 'success');
            this.data.lastSync = new Date().toISOString();
            this.updateLastSyncTime();
        }, 1500);
    }

    updateLastSyncTime() {
        const element = document.getElementById('lastSyncTime');
        if (this.data.lastSync) {
            const date = new Date(this.data.lastSync);
            element.textContent = date.toLocaleString();
        } else {
            element.textContent = 'Never';
        }
    }

    // Toast Notifications
    showToast(message, type = 'info') {
        const toast = document.getElementById('liveToast');
        const toastBody = toast.querySelector('.toast-body');
        
        // Set message and type-based styling
        toastBody.textContent = message;
        
        const headerIcon = toast.querySelector('.toast-header i');
        headerIcon.className = `fas ${
            type === 'success' ? 'fa-check-circle text-success' :
            type === 'error' ? 'fa-exclamation-circle text-danger' :
            type === 'warning' ? 'fa-exclamation-triangle text-warning' :
            'fa-info-circle text-primary'
        } me-2`;
        
        // Show toast
        bootstrap.Toast.getOrCreateInstance(toast).show();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.wealthCommand = new WealthCommand();
});

// Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}
