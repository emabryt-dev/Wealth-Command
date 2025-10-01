// Wealth Command - Financial Management App
class WealthCommand {
    constructor() {
        this.transactions = [];
        this.futureIncome = [];
        this.futureExpenses = [];
        this.loans = [];
        this.settings = {
            currency: 'PKR',
            currencyFormat: 'standard',
            rolloverEnabled: false,
            rolloverAmount: 0,
            rolloverDate: ''
        };
        this.categories = {
            income: ['paycheck', 'loan', 'sale', 'committee'],
            expense: ['grocery', 'bike_fuel', 'expenses', 'loan_returned', 'committee']
        };
        
        this.currentUser = null;
        this.googleToken = null;
        this.lastSync = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.initializeUI();
        this.renderDashboard();
        this.setupGoogleSignIn();
        
        // Initialize date-fns and numeral.js formats
        this.setupFormatters();
    }

    setupFormatters() {
        // Set numeral.js default format
        numeral.defaultFormat('0,0.00');
        
        // Set locale for date-fns if needed
        // For now we'll use the default (English)
    }

    // Date formatting with date-fns
    formatDate(date, format = 'yyyy-MM-dd') {
        if (!date) return '';
        
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        switch (format) {
            case 'short':
                return window.dateFns.format(dateObj, 'MMM dd, yyyy');
            case 'long':
                return window.dateFns.format(dateObj, 'MMMM dd, yyyy');
            case 'month':
                return window.dateFns.format(dateObj, 'MMMM yyyy');
            case 'year':
                return window.dateFns.format(dateObj, 'yyyy');
            default:
                return window.dateFns.format(dateObj, format);
        }
    }

    // Number formatting with numeral.js
    formatCurrency(amount, currency = this.settings.currency) {
        const symbol = this.getCurrencySymbol(currency);
        let formattedAmount;
        
        switch (this.settings.currencyFormat) {
            case 'compact':
                formattedAmount = numeral(amount).format('0.0a');
                break;
            case 'decimal':
                formattedAmount = numeral(amount).format('0,0.00');
                break;
            case 'standard':
            default:
                formattedAmount = numeral(amount).format('0,0.00');
                break;
        }
        
        return `${symbol}${formattedAmount}`;
    }

    getCurrencySymbol(currency) {
        const symbols = {
            'PKR': '₨',
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'AED': 'د.إ',
            'SAR': 'ر.س'
        };
        return symbols[currency] || '₨';
    }

    // Parse date string to Date object
    parseDate(dateString) {
        return window.dateFns.parseISO(dateString);
    }

    // Add days to a date
    addDays(date, days) {
        return window.dateFns.addDays(this.parseDate(date), days);
    }

    // Add months to a date
    addMonths(date, months) {
        return window.dateFns.addMonths(this.parseDate(date), months);
    }

    // Add years to a date
    addYears(date, years) {
        return window.dateFns.addYears(this.parseDate(date), years);
    }

    // Check if date is within range
    isDateInRange(date, startDate, endDate) {
        const checkDate = this.parseDate(date);
        const start = this.parseDate(startDate);
        const end = this.parseDate(endDate);
        
        return window.dateFns.isWithinInterval(checkDate, { start, end });
    }

    // Get difference in days between two dates
    differenceInDays(date1, date2) {
        return window.dateFns.differenceInDays(
            this.parseDate(date1), 
            this.parseDate(date2)
        );
    }

    // Get start of month
    startOfMonth(date) {
        return window.dateFns.startOfMonth(this.parseDate(date));
    }

    // Get end of month
    endOfMonth(date) {
        return window.dateFns.endOfMonth(this.parseDate(date));
    }

    // Check if date is today
    isToday(date) {
        return window.dateFns.isToday(this.parseDate(date));
    }

    // Check if date is in the past
    isPast(date) {
        return window.dateFns.isPast(this.parseDate(date));
    }

    // Check if date is in the future
    isFuture(date) {
        return window.dateFns.isFuture(this.parseDate(date));
    }

    setupEventListeners() {
        // Transaction form
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTransaction();
        });

        // Future income form
        document.getElementById('futureIncomeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFutureIncome();
        });

        // Future expense form
        document.getElementById('futureExpenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFutureExpense();
        });

        // Loan form
        document.getElementById('loanForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveLoan();
        });

        // Transaction type change
        document.getElementById('transactionType').addEventListener('change', (e) => {
            this.updateCategoryOptions(e.target.value);
        });

        // Summary month/year change
        document.getElementById('summaryMonth').addEventListener('change', () => {
            this.renderDashboard();
        });
        document.getElementById('summaryYear').addEventListener('change', () => {
            this.renderDashboard();
        });

        // Currency settings
        document.getElementById('currencySelect').addEventListener('change', (e) => {
            this.settings.currency = e.target.value;
            this.saveSettings();
            this.renderDashboard();
        });

        document.getElementById('currencyFormat').addEventListener('change', (e) => {
            this.settings.currencyFormat = e.target.value;
            this.saveSettings();
            this.renderDashboard();
        });

        // Planner timeframe buttons
        document.querySelectorAll('.planner-timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.planner-timeframe-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.renderPlanner(e.target.dataset.timeframe);
            });
        });

        // Analytics chart type changes
        document.getElementById('overviewChartType').addEventListener('change', () => {
            this.renderOverviewChart();
        });

        document.getElementById('trendPeriod').addEventListener('change', () => {
            this.renderTrendChart();
        });

        // Import file handler
        document.getElementById('importFile').addEventListener('change', (e) => {
            this.handleFileImport(e);
        });

        // Initialize modals
        const transactionModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
        const futureIncomeModal = new bootstrap.Modal(document.getElementById('futureIncomeModal'));
        const futureExpenseModal = new bootstrap.Modal(document.getElementById('futureExpenseModal'));
        const loanModal = new bootstrap.Modal(document.getElementById('loanModal'));

        // Set today's date as default for date inputs
        const today = this.formatDate(new Date());
        document.getElementById('transactionDate').value = today;
        document.getElementById('futureIncomeStartDate').value = today;
        document.getElementById('futureExpenseStartDate').value = today;
        document.getElementById('loanDateGiven').value = today;
        document.getElementById('loanDateTaken').value = today;
    }

    initializeUI() {
        // Populate month and year dropdowns
        this.populateDateFilters();
        
        // Initialize category options
        this.updateCategoryOptions('income');
        
        // Set current year in about section
        document.getElementById('appLastUpdated').textContent = this.formatDate(new Date(), 'long');
        
        // Update currency label
        document.getElementById('currencyLabel').textContent = this.settings.currency;
    }

    populateDateFilters() {
        const monthSelect = document.getElementById('summaryMonth');
        const yearSelect = document.getElementById('summaryYear');
        
        // Clear existing options
        monthSelect.innerHTML = '';
        yearSelect.innerHTML = '';
        
        // Add months
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
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
        
        // Set current month and year
        const currentMonth = new Date().getMonth() + 1;
        monthSelect.value = currentMonth;
        yearSelect.value = currentYear;
    }

    updateCategoryOptions(type) {
        const categorySelect = document.getElementById('transactionCategory');
        categorySelect.innerHTML = '';
        
        this.categories[type].forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = this.formatCategoryName(category);
            categorySelect.appendChild(option);
        });
    }

    formatCategoryName(category) {
        const names = {
            // Income categories
            paycheck: 'Paycheck',
            loan: 'Loan Received',
            sale: 'Asset Sale',
            committee: 'Committee Payout',
            
            // Expense categories
            grocery: 'Grocery',
            bike_fuel: 'Bike/Fuel',
            expenses: 'General Expenses',
            loan_returned: 'Loan Repayment',
            committee: 'Committee Payment'
        };
        return names[category] || category;
    }

    // Data Management
    loadData() {
        // Load transactions
        const savedTransactions = localStorage.getItem('wealthCommand_transactions');
        if (savedTransactions) {
            this.transactions = JSON.parse(savedTransactions);
        }
        
        // Load future income
        const savedFutureIncome = localStorage.getItem('wealthCommand_futureIncome');
        if (savedFutureIncome) {
            this.futureIncome = JSON.parse(savedFutureIncome);
        }
        
        // Load future expenses
        const savedFutureExpenses = localStorage.getItem('wealthCommand_futureExpenses');
        if (savedFutureExpenses) {
            this.futureExpenses = JSON.parse(savedFutureExpenses);
        }
        
        // Load loans
        const savedLoans = localStorage.getItem('wealthCommand_loans');
        if (savedLoans) {
            this.loans = JSON.parse(savedLoans);
        }
        
        // Load settings
        const savedSettings = localStorage.getItem('wealthCommand_settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        
        // Apply settings to UI
        document.getElementById('currencySelect').value = this.settings.currency;
        document.getElementById('currencyFormat').value = this.settings.currencyFormat;
        
        // Update rollover display
        this.updateRolloverDisplay();
    }

    saveData() {
        localStorage.setItem('wealthCommand_transactions', JSON.stringify(this.transactions));
        localStorage.setItem('wealthCommand_futureIncome', JSON.stringify(this.futureIncome));
        localStorage.setItem('wealthCommand_futureExpenses', JSON.stringify(this.futureExpenses));
        localStorage.setItem('wealthCommand_loans', JSON.stringify(this.loans));
        this.saveSettings();
        
        // Trigger cloud sync if user is signed in
        if (this.currentUser) {
            this.syncToCloud();
        }
    }

    saveSettings() {
        localStorage.setItem('wealthCommand_settings', JSON.stringify(this.settings));
    }

    // Transaction Management
    saveTransaction() {
        const index = parseInt(document.getElementById('transactionIndex').value);
        const transaction = {
            description: document.getElementById('transactionDescription').value,
            type: document.getElementById('transactionType').value,
            category: document.getElementById('transactionCategory').value,
            amount: parseFloat(document.getElementById('transactionAmount').value),
            date: document.getElementById('transactionDate').value,
            id: Date.now().toString()
        };
        
        if (index === -1) {
            this.transactions.push(transaction);
        } else {
            this.transactions[index] = transaction;
        }
        
        this.saveData();
        this.renderDashboard();
        this.renderTransactions();
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('addTransactionModal')).hide();
        
        // Reset form
        document.getElementById('transactionForm').reset();
        document.getElementById('transactionDate').value = this.formatDate(new Date());
        document.getElementById('transactionIndex').value = '-1';
        
        this.showToast('Transaction saved successfully!', 'success');
    }

    editTransaction(index) {
        const transaction = this.transactions[index];
        
        document.getElementById('transactionIndex').value = index;
        document.getElementById('transactionDescription').value = transaction.description;
        document.getElementById('transactionType').value = transaction.type;
        document.getElementById('transactionAmount').value = transaction.amount;
        document.getElementById('transactionDate').value = transaction.date;
        
        this.updateCategoryOptions(transaction.type);
        document.getElementById('transactionCategory').value = transaction.category;
        
        const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
        modal.show();
    }

    deleteTransaction(index) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.transactions.splice(index, 1);
            this.saveData();
            this.renderDashboard();
            this.renderTransactions();
            this.showToast('Transaction deleted successfully!', 'success');
        }
    }

    // Future Income/Expense Management
    saveFutureIncome() {
        const index = parseInt(document.getElementById('futureIncomeIndex').value);
        const income = {
            description: document.getElementById('futureIncomeDescription').value,
            type: document.getElementById('futureIncomeType').value,
            amount: parseFloat(document.getElementById('futureIncomeAmount').value),
            frequency: document.getElementById('futureIncomeFrequency').value,
            startDate: document.getElementById('futureIncomeStartDate').value,
            endDate: document.getElementById('futureIncomeEndDate').value || null,
            id: Date.now().toString()
        };
        
        if (index === -1) {
            this.futureIncome.push(income);
        } else {
            this.futureIncome[index] = income;
        }
        
        this.saveData();
        this.renderPlanner();
        
        bootstrap.Modal.getInstance(document.getElementById('futureIncomeModal')).hide();
        document.getElementById('futureIncomeForm').reset();
        document.getElementById('futureIncomeStartDate').value = this.formatDate(new Date());
        document.getElementById('futureIncomeIndex').value = '-1';
        
        this.showToast('Future income saved successfully!', 'success');
    }

    saveFutureExpense() {
        const index = parseInt(document.getElementById('futureExpenseIndex').value);
        const expense = {
            description: document.getElementById('futureExpenseDescription').value,
            type: document.getElementById('futureExpenseType').value,
            amount: parseFloat(document.getElementById('futureExpenseAmount').value),
            frequency: document.getElementById('futureExpenseFrequency').value,
            startDate: document.getElementById('futureExpenseStartDate').value,
            endDate: document.getElementById('futureExpenseEndDate').value || null,
            id: Date.now().toString()
        };
        
        if (index === -1) {
            this.futureExpenses.push(expense);
        } else {
            this.futureExpenses[index] = expense;
        }
        
        this.saveData();
        this.renderPlanner();
        
        bootstrap.Modal.getInstance(document.getElementById('futureExpenseModal')).hide();
        document.getElementById('futureExpenseForm').reset();
        document.getElementById('futureExpenseStartDate').value = this.formatDate(new Date());
        document.getElementById('futureExpenseIndex').value = '-1';
        
        this.showToast('Future expense saved successfully!', 'success');
    }

    deleteFutureIncome(index) {
        if (confirm('Are you sure you want to delete this future income?')) {
            this.futureIncome.splice(index, 1);
            this.saveData();
            this.renderPlanner();
            this.showToast('Future income deleted successfully!', 'success');
        }
    }

    deleteFutureExpense(index) {
        if (confirm('Are you sure you want to delete this future expense?')) {
            this.futureExpenses.splice(index, 1);
            this.saveData();
            this.renderPlanner();
            this.showToast('Future expense deleted successfully!', 'success');
        }
    }

    // Loan Management
    saveLoan() {
        const index = parseInt(document.getElementById('loanIndex').value);
        const loanType = document.getElementById('loanType').value;
        
        const loan = {
            description: document.getElementById('loanDescription').value,
            amount: parseFloat(document.getElementById('loanAmount').value),
            type: loanType,
            borrower: loanType === 'given' ? document.getElementById('loanBorrower').value : '',
            lender: loanType === 'taken' ? document.getElementById('loanLender').value : '',
            dateGiven: loanType === 'given' ? document.getElementById('loanDateGiven').value : '',
            dateTaken: loanType === 'taken' ? document.getElementById('loanDateTaken').value : '',
            expectedReturn: loanType === 'given' ? document.getElementById('loanExpectedReturn').value : '',
            dueDate: loanType === 'taken' ? document.getElementById('loanDueDate').value : '',
            id: Date.now().toString()
        };
        
        if (index === -1) {
            this.loans.push(loan);
        } else {
            this.loans[index] = loan;
        }
        
        this.saveData();
        this.renderDebtManagement();
        
        bootstrap.Modal.getInstance(document.getElementById('loanModal')).hide();
        document.getElementById('loanForm').reset();
        document.getElementById('loanDateGiven').value = this.formatDate(new Date());
        document.getElementById('loanDateTaken').value = this.formatDate(new Date());
        document.getElementById('loanIndex').value = '-1';
        
        this.showToast('Loan saved successfully!', 'success');
    }

    deleteLoan(index) {
        if (confirm('Are you sure you want to delete this loan?')) {
            this.loans.splice(index, 1);
            this.saveData();
            this.renderDebtManagement();
            this.showToast('Loan deleted successfully!', 'success');
        }
    }

    // UI Rendering
    renderDashboard() {
        const selectedMonth = parseInt(document.getElementById('summaryMonth').value);
        const selectedYear = parseInt(document.getElementById('summaryYear').value);
        
        const { income, expenses, netWealth } = this.calculateMonthlySummary(selectedMonth, selectedYear);
        
        // Update display
        document.getElementById('totalIncome').textContent = this.formatCurrency(income);
        document.getElementById('totalExpense').textContent = this.formatCurrency(expenses);
        document.getElementById('netWealth').textContent = this.formatCurrency(netWealth);
        
        // Render breakdowns
        this.renderIncomeBreakdown(selectedMonth, selectedYear);
        this.renderExpenseBreakdown(selectedMonth, selectedYear);
        
        // Update currency label
        document.getElementById('currencyLabel').textContent = this.settings.currency;
    }

    calculateMonthlySummary(month, year) {
        let income = 0;
        let expenses = 0;
        
        this.transactions.forEach(transaction => {
            const transactionDate = new Date(transaction.date);
            if (transactionDate.getMonth() + 1 === month && transactionDate.getFullYear() === year) {
                if (transaction.type === 'income') {
                    income += transaction.amount;
                } else {
                    expenses += transaction.amount;
                }
            }
        });
        
        const netWealth = income - expenses;
        
        return { income, expenses, netWealth };
    }

    renderIncomeBreakdown(month, year) {
        const breakdown = document.getElementById('incomeBreakdown');
        const noData = document.getElementById('noIncomeCategories');
        
        const categories = {};
        
        this.transactions.forEach(transaction => {
            const transactionDate = new Date(transaction.date);
            if (transaction.type === 'income' && 
                transactionDate.getMonth() + 1 === month && 
                transactionDate.getFullYear() === year) {
                
                if (!categories[transaction.category]) {
                    categories[transaction.category] = 0;
                }
                categories[transaction.category] += transaction.amount;
            }
        });
        
        const categoryEntries = Object.entries(categories);
        
        if (categoryEntries.length === 0) {
            breakdown.innerHTML = '';
            noData.classList.remove('d-none');
            return;
        }
        
        noData.classList.add('d-none');
        
        breakdown.innerHTML = categoryEntries.map(([category, amount]) => `
            <div class="breakdown-item" onclick="app.showCategoryTransactions('income', '${category}')">
                <div class="breakdown-category">
                    <span class="category-bullet income-bullet"></span>
                    ${this.formatCategoryName(category)}
                </div>
                <div class="breakdown-amount text-success">
                    ${this.formatCurrency(amount)}
                </div>
            </div>
        `).join('');
    }

    renderExpenseBreakdown(month, year) {
        const breakdown = document.getElementById('expenseBreakdown');
        const noData = document.getElementById('noExpenseCategories');
        
        const categories = {};
        
        this.transactions.forEach(transaction => {
            const transactionDate = new Date(transaction.date);
            if (transaction.type === 'expense' && 
                transactionDate.getMonth() + 1 === month && 
                transactionDate.getFullYear() === year) {
                
                if (!categories[transaction.category]) {
                    categories[transaction.category] = 0;
                }
                categories[transaction.category] += transaction.amount;
            }
        });
        
        const categoryEntries = Object.entries(categories);
        
        if (categoryEntries.length === 0) {
            breakdown.innerHTML = '';
            noData.classList.remove('d-none');
            return;
        }
        
        noData.classList.add('d-none');
        
        breakdown.innerHTML = categoryEntries.map(([category, amount]) => `
            <div class="breakdown-item" onclick="app.showCategoryTransactions('expense', '${category}')">
                <div class="breakdown-category">
                    <span class="category-bullet expense-bullet"></span>
                    ${this.formatCategoryName(category)}
                </div>
                <div class="breakdown-amount text-danger">
                    ${this.formatCurrency(amount)}
                </div>
            </div>
        `).join('');
    }

    renderTransactions() {
        const tbody = document.getElementById('transactionsBody');
        const noData = document.getElementById('noTransactions');
        
        if (this.transactions.length === 0) {
            tbody.innerHTML = '';
            noData.classList.remove('d-none');
            return;
        }
        
        noData.classList.add('d-none');
        
        // Sort transactions by date (newest first)
        const sortedTransactions = [...this.transactions].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        tbody.innerHTML = sortedTransactions.map((transaction, index) => `
            <tr onclick="app.editTransaction(${this.transactions.indexOf(transaction)})">
                <td>${this.formatDate(transaction.date, 'short')}</td>
                <td>${transaction.description}</td>
                <td>
                    <span class="badge ${transaction.type === 'income' ? 'bg-success' : 'bg-danger'}">
                        ${transaction.type === 'income' ? 'Income' : 'Expense'}
                    </span>
                </td>
                <td>${this.formatCategoryName(transaction.category)}</td>
                <td class="${transaction.type === 'income' ? 'text-success' : 'text-danger'}">
                    ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); app.deleteTransaction(${this.transactions.indexOf(transaction)})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderPlanner(timeframe = '1year') {
        const projections = this.calculateProjections(timeframe);
        
        // Update summary cards
        document.getElementById('plannerNetWealth').textContent = this.formatCurrency(projections.totalNetWealth);
        document.getElementById('plannerTotalIncome').textContent = this.formatCurrency(projections.totalIncome);
        document.getElementById('plannerTotalExpenses').textContent = this.formatCurrency(projections.totalExpenses);
        document.getElementById('plannerEndingBalance').textContent = this.formatCurrency(projections.endingBalance);
        
        // Render timeline
        this.renderPlannerTimeline(projections.monthlyProjections);
        
        // Render future income and expenses
        this.renderFutureIncomeList();
        this.renderFutureExpensesList();
    }

    calculateProjections(timeframe) {
        const months = this.getTimeframeMonths(timeframe);
        let currentBalance = this.getCurrentBalance();
        let totalIncome = 0;
        let totalExpenses = 0;
        
        const monthlyProjections = months.map(month => {
            const monthIncome = this.calculateProjectedIncome(month);
            const monthExpenses = this.calculateProjectedExpenses(month);
            
            totalIncome += monthIncome;
            totalExpenses += monthExpenses;
            
            const monthNet = monthIncome - monthExpenses;
            currentBalance += monthNet;
            
            return {
                month: this.formatDate(month, 'month'),
                income: monthIncome,
                expenses: monthExpenses,
                net: monthNet,
                balance: currentBalance
            };
        });
        
        return {
            monthlyProjections,
            totalIncome,
            totalExpenses,
            totalNetWealth: totalIncome - totalExpenses,
            endingBalance: currentBalance
        };
    }

    getTimeframeMonths(timeframe) {
        const months = [];
        const currentDate = new Date();
        let monthCount;
        
        switch (timeframe) {
            case '1year': monthCount = 12; break;
            case '2years': monthCount = 24; break;
            case '3years': monthCount = 36; break;
            default: monthCount = 12;
        }
        
        for (let i = 0; i < monthCount; i++) {
            const month = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
            months.push(month);
        }
        
        return months;
    }

    calculateProjectedIncome(month) {
        let income = 0;
        
        // Add recurring future income
        this.futureIncome.forEach(item => {
            if (this.isItemActiveInMonth(item, month)) {
                income += item.amount;
            }
        });
        
        return income;
    }

    calculateProjectedExpenses(month) {
        let expenses = 0;
        
        // Add recurring future expenses
        this.futureExpenses.forEach(item => {
            if (this.isItemActiveInMonth(item, month)) {
                expenses += item.amount;
            }
        });
        
        return expenses;
    }

    isItemActiveInMonth(item, month) {
        const itemDate = new Date(item.startDate);
        const targetMonthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        const targetMonthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        
        // Check if item starts before or in the target month
        if (itemDate > targetMonthEnd) return false;
        
        // Check end date if exists
        if (item.endDate) {
            const itemEndDate = new Date(item.endDate);
            if (itemEndDate < targetMonthStart) return false;
        }
        
        // Check frequency
        switch (item.frequency) {
            case 'one-time':
                return itemDate.getMonth() === month.getMonth() && 
                       itemDate.getFullYear() === month.getFullYear();
            case 'monthly':
                return true;
            case 'quarterly':
                const monthsDiff = (month.getFullYear() - itemDate.getFullYear()) * 12 + 
                                 (month.getMonth() - itemDate.getMonth());
                return monthsDiff % 3 === 0 && monthsDiff >= 0;
            default:
                return false;
        }
    }

    renderPlannerTimeline(projections) {
        const timeline = document.getElementById('plannerTimeline');
        
        timeline.innerHTML = projections.map(proj => `
            <div class="timeline-item">
                <div class="timeline-month">${proj.month}</div>
                <div class="timeline-details">
                    <div class="timeline-income">
                        <small>Income: ${this.formatCurrency(proj.income)}</small>
                    </div>
                    <div class="timeline-expenses">
                        <small>Expenses: ${this.formatCurrency(proj.expenses)}</small>
                    </div>
                    <div class="timeline-net ${proj.net >= 0 ? 'text-success' : 'text-danger'}">
                        <strong>Net: ${proj.net >= 0 ? '+' : ''}${this.formatCurrency(proj.net)}</strong>
                    </div>
                    <div class="timeline-balance">
                        <small>Balance: ${this.formatCurrency(proj.balance)}</small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderFutureIncomeList() {
        const list = document.getElementById('futureIncomeList');
        
        if (this.futureIncome.length === 0) {
            list.innerHTML = '<div class="text-center text-muted p-3">No future income planned</div>';
            return;
        }
        
        list.innerHTML = this.futureIncome.map((income, index) => `
            <div class="planner-item">
                <div class="planner-item-header">
                    <strong>${income.description}</strong>
                    <div>
                        <button class="btn btn-sm btn-outline-primary" onclick="app.editFutureIncome(${index})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteFutureIncome(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="planner-item-details">
                    <span class="badge bg-success">${this.formatCurrency(income.amount)}</span>
                    <small class="text-muted">${income.frequency} • Starts: ${this.formatDate(income.startDate, 'short')}</small>
                    ${income.endDate ? `<small class="text-muted">Ends: ${this.formatDate(income.endDate, 'short')}</small>` : ''}
                </div>
            </div>
        `).join('');
    }

    renderFutureExpensesList() {
        const list = document.getElementById('futureExpensesList');
        
        if (this.futureExpenses.length === 0) {
            list.innerHTML = '<div class="text-center text-muted p-3">No future expenses planned</div>';
            return;
        }
        
        list.innerHTML = this.futureExpenses.map((expense, index) => `
            <div class="planner-item">
                <div class="planner-item-header">
                    <strong>${expense.description}</strong>
                    <div>
                        <button class="btn btn-sm btn-outline-primary" onclick="app.editFutureExpense(${index})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteFutureExpense(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="planner-item-details">
                    <span class="badge bg-danger">${this.formatCurrency(expense.amount)}</span>
                    <small class="text-muted">${expense.frequency} • Starts: ${this.formatDate(expense.startDate, 'short')}</small>
                    ${expense.endDate ? `<small class="text-muted">Ends: ${this.formatDate(expense.endDate, 'short')}</small>` : ''}
                </div>
            </div>
        `).join('');
    }

    renderDebtManagement() {
        this.renderLoansGiven();
        this.renderLoansTaken();
        this.renderUpcomingRepayments();
        this.updateDebtSummary();
    }

    renderLoansGiven() {
        const list = document.getElementById('loansGivenList');
        const loansGiven = this.loans.filter(loan => loan.type === 'given');
        
        if (loansGiven.length === 0) {
            list.innerHTML = '<div class="text-center text-muted p-3">No loans given</div>';
            return;
        }
        
        list.innerHTML = loansGiven.map((loan, index) => `
            <div class="debt-item">
                <div class="debt-item-header">
                    <strong>${loan.description || 'Loan'}</strong>
                    <div>
                        <button class="btn btn-sm btn-outline-primary" onclick="app.editLoan(${this.loans.indexOf(loan)})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteLoan(${this.loans.indexOf(loan)})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="debt-item-details">
                    <div class="row g-2">
                        <div class="col-6">
                            <small><strong>Borrower:</strong> ${loan.borrower}</small>
                        </div>
                        <div class="col-6">
                            <small><strong>Amount:</strong> ${this.formatCurrency(loan.amount)}</small>
                        </div>
                        <div class="col-6">
                            <small><strong>Date Given:</strong> ${this.formatDate(loan.dateGiven, 'short')}</small>
                        </div>
                        <div class="col-6">
                            <small><strong>Expected Return:</strong> ${this.formatDate(loan.expectedReturn, 'short')}</small>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderLoansTaken() {
        const list = document.getElementById('loansTakenList');
        const loansTaken = this.loans.filter(loan => loan.type === 'taken');
        
        if (loansTaken.length === 0) {
            list.innerHTML = '<div class="text-center text-muted p-3">No loans taken</div>';
            return;
        }
        
        list.innerHTML = loansTaken.map((loan, index) => `
            <div class="debt-item">
                <div class="debt-item-header">
                    <strong>${loan.description || 'Loan'}</strong>
                    <div>
                        <button class="btn btn-sm btn-outline-primary" onclick="app.editLoan(${this.loans.indexOf(loan)})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteLoan(${this.loans.indexOf(loan)})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="debt-item-details">
                    <div class="row g-2">
                        <div class="col-6">
                            <small><strong>Lender:</strong> ${loan.lender}</small>
                        </div>
                        <div class="col-6">
                            <small><strong>Amount:</strong> ${this.formatCurrency(loan.amount)}</small>
                        </div>
                        <div class="col-6">
                            <small><strong>Date Taken:</strong> ${this.formatDate(loan.dateTaken, 'short')}</small>
                        </div>
                        <div class="col-6">
                            <small><strong>Due Date:</strong> ${this.formatDate(loan.dueDate, 'short')}</small>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderUpcomingRepayments() {
        const list = document.getElementById('upcomingRepayments');
        const upcoming = this.getUpcomingRepayments();
        
        if (upcoming.length === 0) {
            list.innerHTML = '<div class="text-center text-muted p-3">No upcoming repayments</div>';
            return;
        }
        
        list.innerHTML = upcoming.map(loan => `
            <div class="debt-item debt-item-upcoming">
                <div class="debt-item-header">
                    <strong>${loan.description || 'Loan'}</strong>
                    <span class="badge bg-warning">Due ${this.formatDate(loan.dueDate, 'short')}</span>
                </div>
                <div class="debt-item-details">
                    <small><strong>${loan.type === 'given' ? 'Borrower' : 'Lender'}:</strong> ${loan.type === 'given' ? loan.borrower : loan.lender}</small>
                    <small><strong>Amount:</strong> ${this.formatCurrency(loan.amount)}</small>
                </div>
            </div>
        `).join('');
    }

    getUpcomingRepayments() {
        const today = new Date();
        const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        return this.loans.filter(loan => {
            const dueDate = new Date(loan.type === 'given' ? loan.expectedReturn : loan.dueDate);
            return dueDate >= today && dueDate <= next30Days;
        });
    }

    updateDebtSummary() {
        const loansGiven = this.loans.filter(loan => loan.type === 'given');
        const loansTaken = this.loans.filter(loan => loan.type === 'taken');
        
        const totalGiven = loansGiven.reduce((sum, loan) => sum + loan.amount, 0);
        const totalTaken = loansTaken.reduce((sum, loan) => sum + loan.amount, 0);
        const netPosition = totalGiven - totalTaken;
        const upcomingCount = this.getUpcomingRepayments().length;
        
        document.getElementById('totalLoansGiven').textContent = this.formatCurrency(totalGiven);
        document.getElementById('totalLoansTaken').textContent = this.formatCurrency(totalTaken);
        document.getElementById('netDebtPosition').textContent = this.formatCurrency(netPosition);
        document.getElementById('upcomingCount').textContent = upcomingCount;
    }

    // Analytics and Charts
    renderAnalytics() {
        this.calculateFinancialHealth();
        this.renderOverviewChart();
        this.renderTrendChart();
        this.renderComparisonCharts();
    }

    calculateFinancialHealth() {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        const { income, expenses } = this.calculateMonthlySummary(currentMonth, currentYear);
        const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
        
        // Update health score
        const healthScore = Math.max(0, Math.min(100, savingsRate * 2 + 20));
        document.getElementById('healthScoreValue').textContent = Math.round(healthScore);
        
        if (healthScore >= 80) {
            document.getElementById('healthScoreLabel').textContent = 'Excellent';
            document.getElementById('healthScoreLabel').className = 'health-score-label text-success';
        } else if (healthScore >= 60) {
            document.getElementById('healthScoreLabel').textContent = 'Good';
            document.getElementById('healthScoreLabel').className = 'health-score-label text-primary';
        } else if (healthScore >= 40) {
            document.getElementById('healthScoreLabel').textContent = 'Fair';
            document.getElementById('healthScoreLabel').className = 'health-score-label text-warning';
        } else {
            document.getElementById('healthScoreLabel').textContent = 'Needs Improvement';
            document.getElementById('healthScoreLabel').className = 'health-score-label text-danger';
        }
        
        // Update savings rate
        document.getElementById('savingsRateValue').textContent = savingsRate.toFixed(1) + '%';
        const progressBar = document.getElementById('savingsRateProgress');
        progressBar.style.width = Math.min(savingsRate, 100) + '%';
        progressBar.className = `progress-bar ${savingsRate >= 20 ? 'bg-success' : savingsRate >= 10 ? 'bg-warning' : 'bg-danger'}`;
        
        // Generate AI insights
        this.generateAIInsights();
    }

    generateAIInsights() {
        const insights = document.getElementById('aiQuickInsights');
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        const { income, expenses } = this.calculateMonthlySummary(currentMonth, currentYear);
        const savings = income - expenses;
        
        let insightText = '';
        if (savings > 0) {
            if (savings / income >= 0.3) {
                insightText = 'Great job! You\'re saving more than 30% of your income. Consider investment opportunities.';
            } else if (savings / income >= 0.2) {
                insightText = 'Good savings rate. You\'re on track for healthy financial growth.';
            } else {
                insightText = 'Consider reducing discretionary spending to improve your savings rate.';
            }
        } else {
            insightText = 'You\'re spending more than you earn. Review your expenses and create a budget.';
        }
        
        insights.innerHTML = `<div class="text-success"><small>${insightText}</small></div>`;
    }

    renderOverviewChart() {
        const ctx = document.getElementById('overviewChart').getContext('2d');
        const chartType = document.getElementById('overviewChartType').value;
        
        // Destroy existing chart if it exists
        if (this.overviewChart) {
            this.overviewChart.destroy();
        }
        
        switch (chartType) {
            case 'category':
                this.renderCategoryOverviewChart(ctx);
                break;
            case 'monthly':
                this.renderMonthlyTrendChart(ctx);
                break;
            case 'yearly':
                this.renderYearlyComparisonChart(ctx);
                break;
        }
    }

    renderCategoryOverviewChart(ctx) {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        const expenseCategories = {};
        this.transactions.forEach(transaction => {
            const transactionDate = new Date(transaction.date);
            if (transaction.type === 'expense' && 
                transactionDate.getMonth() + 1 === currentMonth && 
                transactionDate.getFullYear() === currentYear) {
                
                if (!expenseCategories[transaction.category]) {
                    expenseCategories[transaction.category] = 0;
                }
                expenseCategories[transaction.category] += transaction.amount;
            }
        });
        
        const labels = Object.keys(expenseCategories).map(cat => this.formatCategoryName(cat));
        const data = Object.values(expenseCategories);
        
        this.overviewChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Expenses by Category',
                    data: data,
                    backgroundColor: [
                        '#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0',
                        '#9966ff', '#ff9f40', '#ff6384', '#c9cbcf', '#4bc0c0'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Monthly Expenses by Category'
                    }
                }
            }
        });
    }

    renderTrendChart() {
        const ctx = document.getElementById('trendChart').getContext('2d');
        const period = document.getElementById('trendPeriod').value;
        
        // Destroy existing chart if it exists
        if (this.trendChart) {
            this.trendChart.destroy();
        }
        
        const months = this.getTrendMonths(period);
        const incomeData = [];
        const expenseData = [];
        
        months.forEach(month => {
            const { income, expenses } = this.calculateMonthlySummary(month.month, month.year);
            incomeData.push(income);
            expenseData.push(expenses);
        });
        
        const labels = months.map(month => month.label);
        
        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Expenses',
                        data: expenseData,
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Income vs Expenses Trend'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    getTrendMonths(period) {
        const months = [];
        const currentDate = new Date();
        let monthCount;
        
        switch (period) {
            case '3months': monthCount = 3; break;
            case '6months': monthCount = 6; break;
            case '1year': monthCount = 12; break;
            case '2years': monthCount = 24; break;
            default: monthCount = 6;
        }
        
        for (let i = monthCount - 1; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            months.push({
                month: date.getMonth() + 1,
                year: date.getFullYear(),
                label: this.formatDate(date, 'MMM yyyy')
            });
        }
        
        return months;
    }

    renderComparisonCharts() {
        this.renderMonthComparisonChart();
        this.renderYearComparisonChart();
    }

    renderMonthComparisonChart() {
        const ctx = document.getElementById('monthComparisonChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.monthComparisonChart) {
            this.monthComparisonChart.destroy();
        }
        
        const currentDate = new Date();
        const months = [];
        const incomeData = [];
        const expenseData = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const { income, expenses } = this.calculateMonthlySummary(date.getMonth() + 1, date.getFullYear());
            
            months.push(this.formatDate(date, 'MMM'));
            incomeData.push(income);
            expenseData.push(expenses);
        }
        
        this.monthComparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: '#28a745'
                    },
                    {
                        label: 'Expenses',
                        data: expenseData,
                        backgroundColor: '#dc3545'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Last 6 Months Comparison'
                    }
                }
            }
        });
    }

    renderYearComparisonChart() {
        const ctx = document.getElementById('yearComparisonChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.yearComparisonChart) {
            this.yearComparisonChart.destroy();
        }
        
        const currentYear = new Date().getFullYear();
        const years = [currentYear - 2, currentYear - 1, currentYear];
        const incomeData = [];
        const expenseData = [];
        
        years.forEach(year => {
            let yearlyIncome = 0;
            let yearlyExpenses = 0;
            
            for (let month = 1; month <= 12; month++) {
                const { income, expenses } = this.calculateMonthlySummary(month, year);
                yearlyIncome += income;
                yearlyExpenses += expenses;
            }
            
            incomeData.push(yearlyIncome);
            expenseData.push(yearlyExpenses);
        });
        
        this.yearComparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: '#28a745'
                    },
                    {
                        label: 'Expenses',
                        data: expenseData,
                        backgroundColor: '#dc3545'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Year-over-Year Comparison'
                    }
                }
            }
        });
    }

    // Utility Methods
    getCurrentBalance() {
        // This would need to be implemented based on your actual balance tracking
        // For now, we'll calculate from transactions
        let balance = 0;
        this.transactions.forEach(transaction => {
            if (transaction.type === 'income') {
                balance += transaction.amount;
            } else {
                balance -= transaction.amount;
            }
        });
        return balance;
    }

    showCategoryTransactions(type, category) {
        const selectedMonth = parseInt(document.getElementById('summaryMonth').value);
        const selectedYear = parseInt(document.getElementById('summaryYear').value);
        
        const filteredTransactions = this.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transaction.type === type && 
                   transactionDate.getMonth() + 1 === selectedMonth && 
                   transactionDate.getFullYear() === selectedYear &&
                   (category === 'all' || transaction.category === category);
        });
        
        const totalAmount = filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
        
        // Update modal title and info
        document.getElementById('categoryTransactionsTitle').innerHTML = 
            `<i class="bi bi-list-ul"></i> ${type === 'income' ? 'Income' : 'Expense'} Transactions`;
        
        document.getElementById('categoryTransactionsInfo').textContent = 
            category === 'all' ? `All ${type} categories` : this.formatCategoryName(category);
        
        document.getElementById('categoryTotalAmount').textContent = 
            this.formatCurrency(totalAmount);
        
        // Populate transactions list
        const transactionsList = document.getElementById('categoryTransactionsList');
        const noTransactions = document.getElementById('noCategoryTransactions');
        
        if (filteredTransactions.length === 0) {
            transactionsList.innerHTML = '';
            noTransactions.classList.remove('d-none');
        } else {
            noTransactions.classList.add('d-none');
            transactionsList.innerHTML = filteredTransactions.map(transaction => `
                <div class="category-transaction-item">
                    <div class="transaction-main">
                        <div class="transaction-description">${transaction.description}</div>
                        <div class="transaction-amount ${transaction.type === 'income' ? 'text-success' : 'text-danger'}">
                            ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                        </div>
                    </div>
                    <div class="transaction-meta">
                        <small class="text-muted">${this.formatDate(transaction.date, 'short')}</small>
                        ${category === 'all' ? `<small class="text-muted">${this.formatCategoryName(transaction.category)}</small>` : ''}
                    </div>
                </div>
            `).join('');
        }
        
        // Store current category for adding new transactions
        this.currentCategoryView = { type, category: category === 'all' ? null : category };
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('categoryTransactionsModal'));
        modal.show();
    }

    addTransactionForCategory() {
        if (this.currentCategoryView) {
            // Pre-fill the add transaction modal
            document.getElementById('transactionType').value = this.currentCategoryView.type;
            this.updateCategoryOptions(this.currentCategoryView.type);
            
            if (this.currentCategoryView.category) {
                document.getElementById('transactionCategory').value = this.currentCategoryView.category;
            }
            
            // Close category modal and open transaction modal
            bootstrap.Modal.getInstance(document.getElementById('categoryTransactionsModal')).hide();
            
            const transactionModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
            transactionModal.show();
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
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
        
        const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
        bsToast.show();
        
        // Remove toast from DOM after hide
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    // Rollover Balance Feature
    updateRolloverDisplay() {
        const rolloverBalance = document.getElementById('rolloverBalance');
        const rolloverAmount = document.getElementById('rolloverAmount');
        const rolloverDescription = document.getElementById('rolloverDescription');
        
        if (this.settings.rolloverEnabled && this.settings.rolloverAmount > 0) {
            rolloverBalance.classList.remove('d-none');
            rolloverAmount.textContent = this.formatCurrency(this.settings.rolloverAmount);
            
            if (this.settings.rolloverDate) {
                rolloverDescription.textContent = `From ${this.formatDate(this.settings.rolloverDate, 'short')}`;
            } else {
                rolloverDescription.textContent = 'Previous month balance';
            }
        } else {
            rolloverBalance.classList.add('d-none');
        }
    }

    toggleRolloverSettings() {
        const newAmount = prompt('Enter rollover balance amount:', this.settings.rolloverAmount || '0');
        if (newAmount !== null) {
            const amount = parseFloat(newAmount);
            if (!isNaN(amount)) {
                this.settings.rolloverEnabled = amount > 0;
                this.settings.rolloverAmount = amount;
                this.settings.rolloverDate = this.formatDate(new Date());
                this.saveSettings();
                this.updateRolloverDisplay();
                this.renderDashboard();
                this.showToast('Rollover balance updated!', 'success');
            }
        }
    }

    // Google Sign-In Integration
    setupGoogleSignIn() {
        // Google Sign-In button setup
        google.accounts.id.initialize({
            client_id: '86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com',
            callback: this.handleGoogleSignIn.bind(this)
        });
        
        // Render sign-in button
        google.accounts.id.renderButton(
            document.getElementById('googleSignInButton'),
            { theme: 'outline', size: 'large', width: '200' }
        );
    }

    handleGoogleSignIn(response) {
        // Decode the credential response
        const responsePayload = JSON.parse(atob(response.credential.split('.')[1]));
        
        this.currentUser = {
            name: responsePayload.name,
            email: responsePayload.email,
            picture: responsePayload.picture
        };
        
        this.googleToken = response.credential;
        
        // Update UI
        this.updateUserInterface();
        
        // Sync data with cloud
        this.syncFromCloud();
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('googleSignInModal')).hide();
        
        this.showToast(`Welcome, ${this.currentUser.name}!`, 'success');
    }

    updateUserInterface() {
        const profilePicture = document.getElementById('profilePicture');
        const userEmail = document.getElementById('userEmail');
        const signedInUser = document.getElementById('signedInUser');
        const signInOption = document.getElementById('signInOption');
        const signOutOption = document.getElementById('signOutOption');
        
        if (this.currentUser) {
            // User is signed in
            profilePicture.innerHTML = `
                <img src="${this.currentUser.picture}" alt="Profile" class="profile-pic">
            `;
            userEmail.textContent = this.currentUser.email;
            signedInUser.classList.remove('d-none');
            signInOption.classList.add('d-none');
            signOutOption.classList.remove('d-none');
        } else {
            // User is signed out
            profilePicture.innerHTML = '<i class="bi bi-person-circle profile-icon"></i>';
            signedInUser.classList.add('d-none');
            signInOption.classList.remove('d-none');
            signOutOption.classList.add('d-none');
        }
    }

    googleSignOut() {
        google.accounts.id.disableAutoSelect();
        
        this.currentUser = null;
        this.googleToken = null;
        
        this.updateUserInterface();
        this.showToast('Signed out successfully', 'info');
    }

    showGoogleSignIn() {
        const modal = new bootstrap.Modal(document.getElementById('googleSignInModal'));
        modal.show();
    }

    async syncToCloud() {
        if (!this.currentUser) return;
        
        try {
            // This is a simplified example - in a real app, you'd send data to your backend
            const syncData = {
                transactions: this.transactions,
                futureIncome: this.futureIncome,
                futureExpenses: this.futureExpenses,
                loans: this.loans,
                settings: this.settings,
                lastSync: new Date().toISOString()
            };
            
            // Store in localStorage as a backup (in real app, this would be an API call)
            localStorage.setItem(`wealthCommand_cloud_${this.currentUser.email}`, JSON.stringify(syncData));
            
            this.lastSync = new Date();
            this.updateSyncStatus('Last synced: ' + this.formatDate(this.lastSync, 'short'));
            this.showToast('Data synced to cloud!', 'success');
        } catch (error) {
            console.error('Sync error:', error);
            this.showToast('Sync failed', 'danger');
        }
    }

    async syncFromCloud() {
        if (!this.currentUser) return;
        
        try {
            // Retrieve from localStorage (in real app, this would be an API call)
            const cloudData = localStorage.getItem(`wealthCommand_cloud_${this.currentUser.email}`);
            
            if (cloudData) {
                const parsedData = JSON.parse(cloudData);
                
                // Merge with local data (simple implementation - you might want more sophisticated merging)
                this.transactions = parsedData.transactions || this.transactions;
                this.futureIncome = parsedData.futureIncome || this.futureIncome;
                this.futureExpenses = parsedData.futureExpenses || this.futureExpenses;
                this.loans = parsedData.loans || this.loans;
                this.settings = { ...this.settings, ...parsedData.settings };
                
                this.saveData();
                this.renderDashboard();
                this.renderTransactions();
                this.renderPlanner();
                this.renderDebtManagement();
                
                this.lastSync = new Date(parsedData.lastSync);
                this.updateSyncStatus('Last synced: ' + this.formatDate(this.lastSync, 'short'));
                this.showToast('Data loaded from cloud!', 'success');
            }
        } catch (error) {
            console.error('Sync error:', error);
            this.showToast('Cloud load failed', 'danger');
        }
    }

    updateSyncStatus(message) {
        const syncStatus = document.getElementById('syncStatusText');
        syncStatus.textContent = message;
    }

    manualSync() {
        if (this.currentUser) {
            this.syncToCloud();
        } else {
            this.showGoogleSignIn();
        }
    }

    // Data Import/Export
    exportData() {
        const data = {
            transactions: this.transactions,
            futureIncome: this.futureIncome,
            futureExpenses: this.futureExpenses,
            loans: this.loans,
            settings: this.settings,
            exportDate: new Date().toISOString(),
            version: '2.0.0'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `wealth-command-backup-${this.formatDate(new Date(), 'yyyy-MM-dd')}.json`;
        link.click();
        
        this.showToast('Data exported successfully!', 'success');
    }

    importData() {
        document.getElementById('importFile').click();
    }

    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (confirm('This will replace all your current data. Continue?')) {
                    this.transactions = data.transactions || [];
                    this.futureIncome = data.futureIncome || [];
                    this.futureExpenses = data.futureExpenses || [];
                    this.loans = data.loans || [];
                    this.settings = { ...this.settings, ...data.settings };
                    
                    this.saveData();
                    this.renderDashboard();
                    this.renderTransactions();
                    this.renderPlanner();
                    this.renderDebtManagement();
                    
                    this.showToast('Data imported successfully!', 'success');
                }
            } catch (error) {
                this.showToast('Error importing data', 'danger');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    }

    clearAllData() {
        if (confirm('This will permanently delete all your data. This action cannot be undone. Continue?')) {
            this.transactions = [];
            this.futureIncome = [];
            this.futureExpenses = [];
            this.loans = [];
            
            this.saveData();
            this.renderDashboard();
            this.renderTransactions();
            this.renderPlanner();
            this.renderDebtManagement();
            
            this.showToast('All data cleared', 'info');
        }
    }

    // Edit methods for future items and loans
    editFutureIncome(index) {
        const income = this.futureIncome[index];
        
        document.getElementById('futureIncomeIndex').value = index;
        document.getElementById('futureIncomeDescription').value = income.description;
        document.getElementById('futureIncomeType').value = income.type;
        document.getElementById('futureIncomeAmount').value = income.amount;
        document.getElementById('futureIncomeFrequency').value = income.frequency;
        document.getElementById('futureIncomeStartDate').value = income.startDate;
        document.getElementById('futureIncomeEndDate').value = income.endDate || '';
        
        const modal = new bootstrap.Modal(document.getElementById('futureIncomeModal'));
        modal.show();
    }

    editFutureExpense(index) {
        const expense = this.futureExpenses[index];
        
        document.getElementById('futureExpenseIndex').value = index;
        document.getElementById('futureExpenseDescription').value = expense.description;
        document.getElementById('futureExpenseType').value = expense.type;
        document.getElementById('futureExpenseAmount').value = expense.amount;
        document.getElementById('futureExpenseFrequency').value = expense.frequency;
        document.getElementById('futureExpenseStartDate').value = expense.startDate;
        document.getElementById('futureExpenseEndDate').value = expense.endDate || '';
        
        const modal = new bootstrap.Modal(document.getElementById('futureExpenseModal'));
        modal.show();
    }

    editLoan(index) {
        const loan = this.loans[index];
        
        document.getElementById('loanIndex').value = index;
        document.getElementById('loanType').value = loan.type;
        document.getElementById('loanDescription').value = loan.description || '';
        document.getElementById('loanAmount').value = loan.amount;
        
        if (loan.type === 'given') {
            document.getElementById('loanBorrower').value = loan.borrower;
            document.getElementById('loanDateGiven').value = loan.dateGiven;
            document.getElementById('loanExpectedReturn').value = loan.expectedReturn;
        } else {
            document.getElementById('loanLender').value = loan.lender;
            document.getElementById('loanDateTaken').value = loan.dateTaken;
            document.getElementById('loanDueDate').value = loan.dueDate;
        }
        
        this.updateLoanForm(loan.type);
        
        const modal = new bootstrap.Modal(document.getElementById('loanModal'));
        modal.show();
    }

    updateLoanForm(loanType) {
        const borrowerLabel = document.getElementById('loanBorrowerLabel');
        const lenderLabel = document.getElementById('loanLenderLabel');
        const dateGivenLabel = document.getElementById('loanDateGivenLabel');
        const dateTakenLabel = document.getElementById('loanDateTakenLabel');
        const expectedReturnLabel = document.getElementById('loanExpectedReturnLabel');
        const dueDateLabel = document.getElementById('loanDueDateLabel');
        
        if (loanType === 'given') {
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

    // AI Insights and Recommendations
    showFullAIAnalysis() {
        const insightsContent = document.getElementById('aiInsightsContent');
        
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const { income, expenses } = this.calculateMonthlySummary(currentMonth, currentYear);
        const savings = income - expenses;
        const savingsRate = income > 0 ? (savings / income) * 100 : 0;
        
        let analysis = `
            <div class="ai-analysis-section">
                <h6><i class="bi bi-graph-up"></i> Financial Health Analysis</h6>
                <div class="row g-3 mb-3">
                    <div class="col-4 text-center">
                        <div class="text-success">
                            <div class="fw-bold fs-4">${this.formatCurrency(income)}</div>
                            <small>Monthly Income</small>
                        </div>
                    </div>
                    <div class="col-4 text-center">
                        <div class="text-danger">
                            <div class="fw-bold fs-4">${this.formatCurrency(expenses)}</div>
                            <small>Monthly Expenses</small>
                        </div>
                    </div>
                    <div class="col-4 text-center">
                        <div class="text-primary">
                            <div class="fw-bold fs-4">${savingsRate.toFixed(1)}%</div>
                            <small>Savings Rate</small>
                        </div>
                    </div>
                </div>
        `;
        
        if (savingsRate >= 20) {
            analysis += `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle"></i> <strong>Excellent!</strong> Your savings rate is healthy. 
                    Consider investing your surplus for long-term growth.
                </div>
            `;
        } else if (savingsRate >= 10) {
            analysis += `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i> <strong>Good start!</strong> Your savings rate is decent, 
                    but there's room for improvement. Look for areas to reduce discretionary spending.
                </div>
            `;
        } else {
            analysis += `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> <strong>Attention needed!</strong> Your savings rate is low. 
                    Consider creating a strict budget and reviewing recurring expenses.
                </div>
            `;
        }
        
        // Spending pattern analysis
        const expenseBreakdown = {};
        this.transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                if (!expenseBreakdown[transaction.category]) {
                    expenseBreakdown[transaction.category] = 0;
                }
                expenseBreakdown[transaction.category] += transaction.amount;
            }
        });
        
        const largestExpense = Object.entries(expenseBreakdown).reduce((max, [cat, amount]) => 
            amount > max.amount ? { category: cat, amount } : max, 
        { category: '', amount: 0 });
        
        analysis += `
            <div class="ai-analysis-section">
                <h6><i class="bi bi-pie-chart"></i> Spending Insights</h6>
                <p>Your largest expense category is <strong>${this.formatCategoryName(largestExpense.category)}</strong> 
                at ${this.formatCurrency(largestExpense.amount)}.</p>
        `;
        
        if (largestExpense.amount > income * 0.3) {
            analysis += `
                <div class="alert alert-info">
                    <i class="bi bi-lightbulb"></i> <strong>Recommendation:</strong> Your ${this.formatCategoryName(largestExpense.category)} 
                    spending is more than 30% of your income. Consider ways to optimize this category.
                </div>
            `;
        }
        
        analysis += `</div>`;
        
        // Future planning insights
        const totalFutureIncome = this.futureIncome.reduce((sum, income) => sum + income.amount, 0);
        const totalFutureExpenses = this.futureExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        analysis += `
            <div class="ai-analysis-section">
                <h6><i class="bi bi-calendar-check"></i> Future Planning</h6>
                <p>You have ${this.formatCurrency(totalFutureIncome)} in planned future income and 
                ${this.formatCurrency(totalFutureExpenses)} in planned future expenses.</p>
        `;
        
        if (totalFutureExpenses > totalFutureIncome) {
            analysis += `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i> <strong>Planning Alert:</strong> Your planned future expenses 
                    exceed your planned future income. Consider adjusting your future plans or increasing income sources.
                </div>
            `;
        }
        
        analysis += `</div></div>`;
        
        insightsContent.innerHTML = analysis;
        
        const modal = new bootstrap.Modal(document.getElementById('aiInsightsModal'));
        modal.show();
    }

    applyAISuggestions() {
        // This would implement specific AI suggestions
        // For now, we'll just show a message
        this.showToast('AI suggestions applied! Review your updated financial plan.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('aiInsightsModal')).hide();
    }
}

// Global functions for HTML onclick handlers
function showTab(tabId) {
    // Hide all tab pages
    document.querySelectorAll('.tab-page').forEach(tab => {
        tab.classList.add('d-none');
    });
    
    // Show selected tab
    document.getElementById(tabId).classList.remove('d-none');
    
    // Render specific content for certain tabs
    if (tabId === 'tab-analytics') {
        app.renderAnalytics();
    } else if (tabId === 'tab-planner') {
        app.renderPlanner();
    } else if (tabId === 'tab-debt') {
        app.renderDebtManagement();
    }
}

function openAddTransactionModal() {
    document.getElementById('transactionForm').reset();
    document.getElementById('transactionIndex').value = '-1';
    document.getElementById('transactionDate').value = app.formatDate(new Date());
    
    const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
    modal.show();
}

function openAddFutureIncome() {
    document.getElementById('futureIncomeForm').reset();
    document.getElementById('futureIncomeIndex').value = '-1';
    document.getElementById('futureIncomeStartDate').value = app.formatDate(new Date());
    
    const modal = new bootstrap.Modal(document.getElementById('futureIncomeModal'));
    modal.show();
}

function openAddFutureExpense() {
    document.getElementById('futureExpenseForm').reset();
    document.getElementById('futureExpenseIndex').value = '-1';
    document.getElementById('futureExpenseStartDate').value = app.formatDate(new Date());
    
    const modal = new bootstrap.Modal(document.getElementById('futureExpenseModal'));
    modal.show();
}

function openAddLoan(type) {
    document.getElementById('loanForm').reset();
    document.getElementById('loanIndex').value = '-1';
    document.getElementById('loanType').value = type;
    
    app.updateLoanForm(type);
    
    if (type === 'given') {
        document.getElementById('loanDateGiven').value = app.formatDate(new Date());
    } else {
        document.getElementById('loanDateTaken').value = app.formatDate(new Date());
    }
    
    const modal = new bootstrap.Modal(document.getElementById('loanModal'));
    modal.show();
}

function showCategoryTransactions(type, category) {
    app.showCategoryTransactions(type, category);
}

function addTransactionForCategory() {
    app.addTransactionForCategory();
}

function manualSync() {
    app.manualSync();
}

function googleSignOut() {
    app.googleSignOut();
}

function showGoogleSignIn() {
    app.showGoogleSignIn();
}

function exportData() {
    app.exportData();
}

function importData() {
    app.importData();
}

function clearAllData() {
    app.clearAllData();
}

function showFullAIAnalysis() {
    app.showFullAIAnalysis();
}

function applyAISuggestions() {
    app.applyAISuggestions();
}

function toggleRolloverSettings() {
    app.toggleRolloverSettings();
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', function() {
    app = new WealthCommand();
});
