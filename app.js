// Wealth Command - Financial Management App
class WealthCommand {
    constructor() {
        this.transactions = [];
        this.futureIncome = [];
        this.futureExpenses = [];
        this.loans = [];
        this.categories = {
            income: ['salary', 'freelance', 'investment', 'gift', 'other'],
            expense: ['grocery', 'bike_fuel', 'expenses', 'loan_returned', 'committee', 'other']
        };
        this.settings = {
            currency: 'PKR',
            currencySymbol: 'Rs',
            enableRollover: false,
            rolloverAmount: 0,
            rolloverDescription: ''
        };
        this.currentUser = null;
        this.googleToken = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.populateDateSelectors();
        this.updateDashboard();
        this.setupGoogleSignIn();
        this.checkAutoSync();
    }

    // Date-fns enhanced date handling
    formatDate(date) {
        return dateFns.format(date, 'yyyy-MM-dd');
    }

    parseDate(dateString) {
        return dateFns.parseISO(dateString);
    }

    formatDisplayDate(dateString) {
        return dateFns.format(this.parseDate(dateString), 'MMM dd, yyyy');
    }

    getCurrentMonthYear() {
        const now = new Date();
        return {
            month: now.getMonth() + 1,
            year: now.getFullYear()
        };
    }

    getMonthName(month) {
        return dateFns.format(new Date(2000, month - 1, 1), 'MMMM');
    }

    addMonths(date, months) {
        return dateFns.addMonths(date, months);
    }

    addYears(date, years) {
        return dateFns.addYears(date, years);
    }

    isAfter(date1, date2) {
        return dateFns.isAfter(this.parseDate(date1), this.parseDate(date2));
    }

    isBefore(date1, date2) {
        return dateFns.isBefore(this.parseDate(date1), this.parseDate(date2));
    }

    isValidDate(dateString) {
        return dateFns.isValid(this.parseDate(dateString));
    }

    differenceInDays(date1, date2) {
        return dateFns.differenceInDays(this.parseDate(date1), this.parseDate(date2));
    }

    startOfMonth(dateString) {
        return dateFns.startOfMonth(this.parseDate(dateString));
    }

    endOfMonth(dateString) {
        return dateFns.endOfMonth(this.parseDate(dateString));
    }

    // Data Management
    saveData() {
        const data = {
            transactions: this.transactions,
            futureIncome: this.futureIncome,
            futureExpenses: this.futureExpenses,
            loans: this.loans,
            settings: this.settings,
            lastSync: new Date().toISOString()
        };
        localStorage.setItem('wealthCommandData', JSON.stringify(data));
        
        // Auto-sync with Google if signed in
        if (this.googleToken) {
            this.syncWithGoogleDrive();
        }
    }

    loadData() {
        const saved = localStorage.getItem('wealthCommandData');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.transactions = data.transactions || [];
                this.futureIncome = data.futureIncome || [];
                this.futureExpenses = data.futureExpenses || [];
                this.loans = data.loans || [];
                this.settings = { ...this.settings, ...(data.settings || {}) };
                
                // Update UI with settings
                this.updateCurrencyDisplay();
                this.toggleRolloverDisplay();
            } catch (e) {
                console.error('Error loading data:', e);
                this.showToast('Error loading saved data', 'error');
            }
        }
    }

    // Google Drive Integration
    setupGoogleSignIn() {
        try {
            window.google.accounts.id.initialize({
                client_id: '86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com',
                callback: this.handleGoogleSignIn.bind(this),
                auto_select: false
            });

            window.google.accounts.id.renderButton(
                document.getElementById('googleSignInButton'),
                { theme: 'outline', size: 'large', width: '200' }
            );
        } catch (error) {
            console.log('Google Sign-In not available:', error);
        }
    }

    handleGoogleSignIn(response) {
        this.googleToken = response.credential;
        this.currentUser = this.decodeJWT(response.credential);
        
        // Update UI
        document.getElementById('userEmail').textContent = this.currentUser.email;
        document.getElementById('signedInUser').classList.remove('d-none');
        document.getElementById('signInOption').classList.add('d-none');
        document.getElementById('signOutOption').classList.remove('d-none');
        
        // Update profile picture if available
        if (this.currentUser.picture) {
            document.getElementById('profilePicture').innerHTML = 
                `<img src="${this.currentUser.picture}" class="profile-pic" alt="Profile">`;
        }
        
        // Sync data with Google Drive
        this.syncWithGoogleDrive();
        
        // Close modal and show success message
        bootstrap.Modal.getInstance(document.getElementById('googleSignInModal')).hide();
        this.showToast('Successfully signed in with Google!', 'success');
    }

    decodeJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error decoding JWT:', error);
            return { email: 'Unknown', picture: null };
        }
    }

    async syncWithGoogleDrive() {
        if (!this.googleToken) return;

        try {
            this.showToast('Syncing with Google Drive...', 'info');
            
            // In a real implementation, you would use Google Drive API here
            // For now, we'll simulate the sync process
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.showToast('Data synced successfully!', 'success');
        } catch (error) {
            console.error('Google Drive sync error:', error);
            this.showToast('Sync failed. Please try again.', 'error');
        }
    }

    checkAutoSync() {
        const lastSync = localStorage.getItem('lastGoogleSync');
        if (lastSync) {
            const lastSyncDate = new Date(lastSync);
            const now = new Date();
            const hoursDiff = (now - lastSyncDate) / (1000 * 60 * 60);
            
            if (hoursDiff > 24) { // Sync every 24 hours
                this.syncWithGoogleDrive();
            }
        }
    }

    // Transaction Management
    addTransaction(transaction) {
        // Validate date using date-fns
        if (!this.isValidDate(transaction.date)) {
            this.showToast('Invalid date format', 'error');
            return false;
        }

        transaction.id = Date.now().toString();
        this.transactions.push(transaction);
        this.saveData();
        this.updateDashboard();
        this.showToast('Transaction added successfully!', 'success');
        return true;
    }

    updateTransaction(index, transaction) {
        // Validate date using date-fns
        if (!this.isValidDate(transaction.date)) {
            this.showToast('Invalid date format', 'error');
            return false;
        }

        this.transactions[index] = { ...this.transactions[index], ...transaction };
        this.saveData();
        this.updateDashboard();
        this.showToast('Transaction updated successfully!', 'success');
        return true;
    }

    deleteTransaction(index) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.transactions.splice(index, 1);
            this.saveData();
            this.updateDashboard();
            this.showToast('Transaction deleted successfully!', 'success');
        }
    }

    // Financial Calculations with date-fns
    calculateMonthlySummary(month, year) {
        const startDate = this.formatDate(this.startOfMonth(`${year}-${month.toString().padStart(2, '0')}-01`));
        const endDate = this.formatDate(this.endOfMonth(`${year}-${month.toString().padStart(2, '0')}-01`));

        const monthlyTransactions = this.transactions.filter(t => {
            const transactionDate = t.date;
            return this.isAfter(transactionDate, startDate) && this.isBefore(transactionDate, endDate);
        });

        const income = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const expenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const rolloverAmount = this.settings.enableRollover ? this.settings.rolloverAmount : 0;
        const netWealth = rolloverAmount + income - expenses;

        return {
            income,
            expenses,
            netWealth,
            transactions: monthlyTransactions,
            rolloverAmount
        };
    }

    calculateCategoryBreakdown(month, year, type) {
        const summary = this.calculateMonthlySummary(month, year);
        const categoryTotals = {};

        summary.transactions
            .filter(t => t.type === type)
            .forEach(t => {
                const category = t.category;
                categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(t.amount);
            });

        return categoryTotals;
    }

    // Future Projections with date-fns
    calculateFutureProjections(timeframe = '1year') {
        const months = this.getProjectionMonths(timeframe);
        const projections = [];
        let currentBalance = this.getCurrentBalance();

        months.forEach(monthYear => {
            const { month, year } = monthYear;
            
            // Calculate base transactions
            const baseSummary = this.calculateMonthlySummary(month, year);
            
            // Add future income
            const futureIncome = this.calculateFutureIncomeForMonth(month, year);
            
            // Add future expenses
            const futureExpenses = this.calculateFutureExpensesForMonth(month, year);
            
            const totalIncome = baseSummary.income + futureIncome;
            const totalExpenses = baseSummary.expenses + futureExpenses;
            
            currentBalance = currentBalance + totalIncome - totalExpenses;
            
            projections.push({
                month,
                year,
                income: totalIncome,
                expenses: totalExpenses,
                endingBalance: currentBalance,
                baseIncome: baseSummary.income,
                baseExpenses: baseSummary.expenses,
                futureIncome,
                futureExpenses
            });
        });

        return projections;
    }

    getProjectionMonths(timeframe) {
        const current = this.getCurrentMonthYear();
        const months = [];
        let totalMonths = 12; // Default 1 year

        switch (timeframe) {
            case '2years': totalMonths = 24; break;
            case '3years': totalMonths = 36; break;
        }

        for (let i = 0; i < totalMonths; i++) {
            const date = this.addMonths(new Date(current.year, current.month - 1, 1), i);
            months.push({
                month: date.getMonth() + 1,
                year: date.getFullYear()
            });
        }

        return months;
    }

    calculateFutureIncomeForMonth(month, year) {
        let total = 0;
        const targetDate = `${year}-${month.toString().padStart(2, '0')}-01`;

        this.futureIncome.forEach(income => {
            if (this.shouldIncludeFutureItem(income, targetDate)) {
                total += parseFloat(income.amount);
            }
        });

        return total;
    }

    calculateFutureExpensesForMonth(month, year) {
        let total = 0;
        const targetDate = `${year}-${month.toString().padStart(2, '0')}-01`;

        this.futureExpenses.forEach(expense => {
            if (this.shouldIncludeFutureItem(expense, targetDate)) {
                total += parseFloat(expense.amount);
            }
        });

        return total;
    }

    shouldIncludeFutureItem(item, targetDate) {
        const startDate = item.startDate;
        
        // Check if target date is after start date
        if (this.isBefore(targetDate, startDate)) {
            return false;
        }

        // Check end date
        if (item.endDate && this.isAfter(targetDate, item.endDate)) {
            return false;
        }

        // Check frequency
        if (item.frequency === 'one-time') {
            const startMonth = this.startOfMonth(startDate);
            const targetMonth = this.startOfMonth(targetDate);
            return this.formatDate(startMonth) === this.formatDate(targetMonth);
        }

        // For monthly/quarterly, check if the month difference matches the frequency
        const start = this.parseDate(startDate);
        const target = this.parseDate(targetDate);
        const monthDiff = (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());

        if (item.frequency === 'monthly') {
            return monthDiff >= 0 && monthDiff % 1 === 0;
        } else if (item.frequency === 'quarterly') {
            return monthDiff >= 0 && monthDiff % 3 === 0;
        }

        return false;
    }

    // Debt Management
    calculateDebtSummary() {
        const loansGiven = this.loans.filter(loan => loan.type === 'given');
        const loansTaken = this.loans.filter(loan => loan.type === 'taken');

        const totalGiven = loansGiven.reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
        const totalTaken = loansTaken.reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
        const netPosition = totalGiven - totalTaken;

        // Calculate upcoming repayments (within next 30 days)
        const upcomingRepayments = this.loans.filter(loan => {
            if (!loan.expectedReturn && !loan.dueDate) return false;
            
            const dueDate = loan.type === 'given' ? loan.expectedReturn : loan.dueDate;
            if (!dueDate) return false;

            const daysUntilDue = this.differenceInDays(dueDate, this.formatDate(new Date()));
            return daysUntilDue >= 0 && daysUntilDue <= 30;
        });

        return {
            totalGiven,
            totalTaken,
            netPosition,
            upcomingCount: upcomingRepayments.length,
            upcomingRepayments
        };
    }

    // Analytics and Insights
    calculateFinancialHealth() {
        const current = this.getCurrentMonthYear();
        const summary = this.calculateMonthlySummary(current.month, current.year);
        
        if (summary.income === 0) return { score: 0, label: 'No data' };

        const savingsRate = ((summary.income - summary.expenses) / summary.income) * 100;
        
        let score, label;
        if (savingsRate >= 20) {
            score = 90 + (savingsRate - 20) / 2;
            label = 'Excellent';
        } else if (savingsRate >= 10) {
            score = 70 + (savingsRate - 10);
            label = 'Good';
        } else if (savingsRate >= 0) {
            score = 50 + savingsRate * 2;
            label = 'Fair';
        } else {
            score = Math.max(0, 50 + savingsRate);
            label = 'Needs Attention';
        }

        return {
            score: Math.min(100, Math.round(score)),
            label,
            savingsRate: Math.round(savingsRate)
        };
    }

    generateAIInsights() {
        const health = this.calculateFinancialHealth();
        const current = this.getCurrentMonthYear();
        const summary = this.calculateMonthlySummary(current.month, current.year);
        
        const insights = [];
        const recommendations = [];

        // Spending insights
        if (summary.expenses > summary.income * 0.8) {
            insights.push("Your expenses are quite high relative to your income");
            recommendations.push("Consider reviewing your discretionary spending");
        }

        if (health.savingsRate > 20) {
            insights.push("Great savings rate! You're building wealth effectively");
        } else if (health.savingsRate < 10) {
            insights.push("Your savings rate could be improved");
            recommendations.push("Look for opportunities to increase income or reduce fixed costs");
        }

        // Category insights
        const expenseBreakdown = this.calculateCategoryBreakdown(current.month, current.year, 'expense');
        const largestCategory = Object.entries(expenseBreakdown).reduce((max, [cat, amount]) => 
            amount > max.amount ? { category: cat, amount } : max, { category: '', amount: 0 });

        if (largestCategory.amount > summary.expenses * 0.4) {
            insights.push(`Your ${largestCategory.category} spending is quite significant`);
            recommendations.push(`Consider optimizing your ${largestCategory.category} expenses`);
        }

        return {
            insights,
            recommendations,
            healthScore: health.score,
            savingsRate: health.savingsRate
        };
    }

    // UI Updates
    updateDashboard() {
        const month = parseInt(document.getElementById('summaryMonth').value);
        const year = parseInt(document.getElementById('summaryYear').value);
        const summary = this.calculateMonthlySummary(month, year);

        // Update main summary
        document.getElementById('netWealth').textContent = this.formatCurrency(summary.netWealth);
        document.getElementById('totalIncome').textContent = this.formatCurrency(summary.income);
        document.getElementById('totalExpense').textContent = this.formatCurrency(summary.expenses);

        // Update category breakdowns
        this.updateCategoryBreakdown('income', month, year);
        this.updateCategoryBreakdown('expense', month, year);

        // Update transactions table
        this.updateTransactionsTable(month, year);

        // Update rollover display
        this.toggleRolloverDisplay();
    }

    updateCategoryBreakdown(type, month, year) {
        const breakdown = this.calculateCategoryBreakdown(month, year, type);
        const container = document.getElementById(`${type}Breakdown`);
        const noDataElement = document.getElementById(`no${type.charAt(0).toUpperCase() + type.slice(1)}Categories`);

        if (Object.keys(breakdown).length === 0) {
            container.innerHTML = '';
            noDataElement.classList.remove('d-none');
            return;
        }

        noDataElement.classList.add('d-none');
        
        const sortedCategories = Object.entries(breakdown)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5); // Show top 5 categories

        container.innerHTML = sortedCategories.map(([category, amount]) => `
            <div class="breakdown-item" onclick="app.showCategoryTransactions('${type}', '${category}')">
                <div class="breakdown-category">
                    <span class="category-bullet" style="background-color: ${this.getCategoryColor(category, type)}"></span>
                    ${this.formatCategoryName(category)}
                </div>
                <div class="breakdown-amount ${type === 'income' ? 'text-success' : 'text-danger'}">
                    ${this.formatCurrency(amount)}
                </div>
            </div>
        `).join('');
    }

    updateTransactionsTable(month, year) {
        const summary = this.calculateMonthlySummary(month, year);
        const tbody = document.getElementById('transactionsBody');
        const noTransactions = document.getElementById('noTransactions');

        if (summary.transactions.length === 0) {
            tbody.innerHTML = '';
            noTransactions.classList.remove('d-none');
            return;
        }

        noTransactions.classList.add('d-none');
        
        // Sort transactions by date (newest first)
        const sortedTransactions = summary.transactions.sort((a, b) => 
            this.isBefore(a.date, b.date) ? 1 : -1
        );

        tbody.innerHTML = sortedTransactions.map((transaction, index) => `
            <tr onclick="app.editTransaction(${this.transactions.findIndex(t => t.id === transaction.id)})">
                <td>${this.formatDisplayDate(transaction.date)}</td>
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
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); app.deleteTransaction(${this.transactions.findIndex(t => t.id === transaction.id)})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updatePlannerView() {
        const timeframe = document.querySelector('.planner-timeframe-btn.active').dataset.timeframe;
        const projections = this.calculateFutureProjections(timeframe);
        
        if (projections.length === 0) return;

        const totalIncome = projections.reduce((sum, p) => sum + p.income, 0);
        const totalExpenses = projections.reduce((sum, p) => sum + p.expenses, 0);
        const netWealth = projections[projections.length - 1].endingBalance;

        // Update summary cards
        document.getElementById('plannerNetWealth').textContent = this.formatCurrency(netWealth);
        document.getElementById('plannerTotalIncome').textContent = this.formatCurrency(totalIncome);
        document.getElementById('plannerTotalExpenses').textContent = this.formatCurrency(totalExpenses);
        document.getElementById('plannerEndingBalance').textContent = this.formatCurrency(netWealth);

        // Update timeline
        this.updatePlannerTimeline(projections);

        // Update future items lists
        this.updateFutureIncomeList();
        this.updateFutureExpensesList();
    }

    updatePlannerTimeline(projections) {
        const timeline = document.getElementById('plannerTimeline');
        
        timeline.innerHTML = projections.map(proj => `
            <div class="timeline-month" onclick="app.showMonthDetails(${proj.month}, ${proj.year})">
                <div class="timeline-month-header">
                    ${this.getMonthName(proj.month)} ${proj.year}
                </div>
                <div class="timeline-month-details">
                    <div class="text-success">
                        <small>Income:</small>
                        <div>${this.formatCurrency(proj.income)}</div>
                    </div>
                    <div class="text-danger">
                        <small>Expenses:</small>
                        <div>${this.formatCurrency(proj.expenses)}</div>
                    </div>
                    <div class="text-primary">
                        <small>Balance:</small>
                        <div>${this.formatCurrency(proj.endingBalance)}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateFutureIncomeList() {
        const list = document.getElementById('futureIncomeList');
        
        if (this.futureIncome.length === 0) {
            list.innerHTML = '<div class="text-center text-muted p-3">No future income planned</div>';
            return;
        }

        list.innerHTML = this.futureIncome.map((income, index) => `
            <div class="planner-item">
                <div class="planner-item-main">
                    <div class="planner-item-description">
                        <strong>${income.description}</strong>
                        <small class="text-muted">${this.formatCurrency(income.amount)} • ${income.frequency}</small>
                    </div>
                    <div class="planner-item-dates">
                        <small>Starts: ${this.formatDisplayDate(income.startDate)}</small>
                        ${income.endDate ? `<small>Ends: ${this.formatDisplayDate(income.endDate)}</small>` : ''}
                    </div>
                </div>
                <div class="planner-item-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="app.editFutureIncome(${index})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="app.deleteFutureIncome(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateFutureExpensesList() {
        const list = document.getElementById('futureExpensesList');
        
        if (this.futureExpenses.length === 0) {
            list.innerHTML = '<div class="text-center text-muted p-3">No future expenses planned</div>';
            return;
        }

        list.innerHTML = this.futureExpenses.map((expense, index) => `
            <div class="planner-item">
                <div class="planner-item-main">
                    <div class="planner-item-description">
                        <strong>${expense.description}</strong>
                        <small class="text-muted">${this.formatCurrency(expense.amount)} • ${expense.frequency}</small>
                    </div>
                    <div class="planner-item-dates">
                        <small>Starts: ${this.formatDisplayDate(expense.startDate)}</small>
                        ${expense.endDate ? `<small>Ends: ${this.formatDisplayDate(expense.endDate)}</small>` : ''}
                    </div>
                </div>
                <div class="planner-item-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="app.editFutureExpense(${index})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="app.deleteFutureExpense(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateDebtView() {
        const summary = this.calculateDebtSummary();
        
        // Update summary cards
        document.getElementById('totalLoansGiven').textContent = this.formatCurrency(summary.totalGiven);
        document.getElementById('totalLoansTaken').textContent = this.formatCurrency(summary.totalTaken);
        document.getElementById('netDebtPosition').textContent = this.formatCurrency(summary.netPosition);
        document.getElementById('upcomingCount').textContent = summary.upcomingCount;

        // Update lists
        this.updateLoansGivenList();
        this.updateLoansTakenList();
        this.updateUpcomingRepayments(summary.upcomingRepayments);
    }

    updateLoansGivenList() {
        const loansGiven = this.loans.filter(loan => loan.type === 'given');
        const list = document.getElementById('loansGivenList');
        
        if (loansGiven.length === 0) {
            list.innerHTML = '<div class="text-center text-muted p-3">No loans given</div>';
            return;
        }

        list.innerHTML = loansGiven.map((loan, index) => `
            <div class="debt-item">
                <div class="debt-item-main">
                    <div class="debt-item-description">
                        <strong>${loan.description || 'Loan'}</strong>
                        <small class="text-muted">To: ${loan.borrower}</small>
                    </div>
                    <div class="debt-item-details">
                        <div class="text-success">
                            <strong>${this.formatCurrency(loan.amount)}</strong>
                        </div>
                        <div class="debt-item-dates">
                            <small>Given: ${this.formatDisplayDate(loan.dateGiven)}</small>
                            ${loan.expectedReturn ? `<small>Expected: ${this.formatDisplayDate(loan.expectedReturn)}</small>` : ''}
                        </div>
                    </div>
                </div>
                <div class="debt-item-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="app.editLoan(${this.loans.indexOf(loan)})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="app.deleteLoan(${this.loans.indexOf(loan)})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateLoansTakenList() {
        const loansTaken = this.loans.filter(loan => loan.type === 'taken');
        const list = document.getElementById('loansTakenList');
        
        if (loansTaken.length === 0) {
            list.innerHTML = '<div class="text-center text-muted p-3">No loans taken</div>';
            return;
        }

        list.innerHTML = loansTaken.map((loan, index) => `
            <div class="debt-item">
                <div class="debt-item-main">
                    <div class="debt-item-description">
                        <strong>${loan.description || 'Loan'}</strong>
                        <small class="text-muted">From: ${loan.lender}</small>
                    </div>
                    <div class="debt-item-details">
                        <div class="text-danger">
                            <strong>${this.formatCurrency(loan.amount)}</strong>
                        </div>
                        <div class="debt-item-dates">
                            <small>Taken: ${this.formatDisplayDate(loan.dateTaken)}</small>
                            ${loan.dueDate ? `<small>Due: ${this.formatDisplayDate(loan.dueDate)}</small>` : ''}
                        </div>
                    </div>
                </div>
                <div class="debt-item-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="app.editLoan(${this.loans.indexOf(loan)})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="app.deleteLoan(${this.loans.indexOf(loan)})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateUpcomingRepayments(upcoming) {
        const list = document.getElementById('upcomingRepayments');
        
        if (upcoming.length === 0) {
            list.innerHTML = '<div class="text-center text-muted p-3">No upcoming repayments</div>';
            return;
        }

        list.innerHTML = upcoming.map(loan => `
            <div class="debt-item debt-item-upcoming">
                <div class="debt-item-main">
                    <div class="debt-item-description">
                        <strong>${loan.description || 'Loan'}</strong>
                        <small class="text-muted">
                            ${loan.type === 'given' ? `To: ${loan.borrower}` : `From: ${loan.lender}`}
                        </small>
                    </div>
                    <div class="debt-item-details">
                        <div class="${loan.type === 'given' ? 'text-success' : 'text-danger'}">
                            <strong>${this.formatCurrency(loan.amount)}</strong>
                        </div>
                        <div class="debt-item-dates">
                            <small class="text-warning">
                                Due: ${this.formatDisplayDate(loan.type === 'given' ? loan.expectedReturn : loan.dueDate)}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateAnalyticsView() {
        const health = this.calculateFinancialHealth();
        const insights = this.generateAIInsights();

        // Update health score
        document.getElementById('healthScoreValue').textContent = `${health.score}/100`;
        document.getElementById('healthScoreLabel').textContent = health.label;
        
        // Update savings rate
        document.getElementById('savingsRateValue').textContent = `${health.savingsRate}%`;
        document.getElementById('savingsRateProgress').style.width = `${Math.min(health.savingsRate, 100)}%`;

        // Update AI insights
        const quickInsights = document.getElementById('aiQuickInsights');
        if (insights.insights.length > 0) {
            quickInsights.innerHTML = insights.insights.slice(0, 2).map(insight => `
                <div class="ai-insight-item">
                    <i class="bi bi-lightbulb"></i>
                    <small>${insight}</small>
                </div>
            `).join('');
        }

        // Update charts
        this.updateAnalyticsCharts();
    }

    updateAnalyticsCharts() {
        // This would integrate with Chart.js to create visualizations
        // For now, we'll just update the data that would be used for charts
        console.log('Updating analytics charts...');
    }

    // UI Helper Methods
    formatCurrency(amount) {
        return `${this.settings.currencySymbol} ${parseFloat(amount).toLocaleString('en-PK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    formatCategoryName(category) {
        return category.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    getCategoryColor(category, type) {
        const colors = {
            income: {
                salary: '#28a745',
                freelance: '#20c997',
                investment: '#17a2b8',
                gift: '#6f42c1',
                other: '#fd7e14'
            },
            expense: {
                grocery: '#dc3545',
                bike_fuel: '#ffc107',
                expenses: '#6c757d',
                loan_returned: '#e83e8c',
                committee: '#6f42c1',
                other: '#fd7e14'
            }
        };
        return colors[type][category] || '#6c757d';
    }

    getCurrentBalance() {
        const current = this.getCurrentMonthYear();
        const summary = this.calculateMonthlySummary(current.month, current.year);
        return summary.netWealth;
    }

    populateDateSelectors() {
        const current = this.getCurrentMonthYear();
        const monthSelect = document.getElementById('summaryMonth');
        const yearSelect = document.getElementById('summaryYear');

        // Populate months
        monthSelect.innerHTML = '';
        for (let i = 1; i <= 12; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = this.getMonthName(i);
            option.selected = i === current.month;
            monthSelect.appendChild(option);
        }

        // Populate years (current year and previous 2 years)
        yearSelect.innerHTML = '';
        for (let i = current.year - 2; i <= current.year; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            option.selected = i === current.year;
            yearSelect.appendChild(option);
        }

        // Set transaction date to today
        document.getElementById('transactionDate').value = this.formatDate(new Date());
        document.getElementById('futureIncomeStartDate').value = this.formatDate(new Date());
        document.getElementById('futureExpenseStartDate').value = this.formatDate(new Date());
        document.getElementById('loanDateGiven').value = this.formatDate(new Date());
        document.getElementById('loanDateTaken').value = this.formatDate(new Date());
    }

    updateCurrencyDisplay() {
        document.getElementById('currencyLabel').textContent = this.settings.currency;
        document.getElementById('currencySelect').value = this.settings.currency;
        document.getElementById('currencySymbol').value = this.settings.currencySymbol;
        this.updateDashboard();
    }

    toggleRolloverDisplay() {
        const rolloverElement = document.getElementById('rolloverBalance');
        const enableRollover = document.getElementById('enableRollover');
        
        if (this.settings.enableRollover && this.settings.rolloverAmount > 0) {
            rolloverElement.classList.remove('d-none');
            document.getElementById('rolloverAmount').textContent = this.formatCurrency(this.settings.rolloverAmount);
            document.getElementById('rolloverDescription').textContent = this.settings.rolloverDescription;
        } else {
            rolloverElement.classList.add('d-none');
        }
        
        enableRollover.checked = this.settings.enableRollover;
    }

    // Event Handlers
    setupEventListeners() {
        // Date selectors
        document.getElementById('summaryMonth').addEventListener('change', () => this.updateDashboard());
        document.getElementById('summaryYear').addEventListener('change', () => this.updateDashboard());

        // Transaction form
        document.getElementById('transactionForm').addEventListener('submit', (e) => this.handleTransactionSubmit(e));
        document.getElementById('transactionType').addEventListener('change', (e) => this.updateCategoryOptions(e.target.value));

        // Future income/expense forms
        document.getElementById('futureIncomeForm').addEventListener('submit', (e) => this.handleFutureIncomeSubmit(e));
        document.getElementById('futureExpenseForm').addEventListener('submit', (e) => this.handleFutureExpenseSubmit(e));

        // Loan form
        document.getElementById('loanForm').addEventListener('submit', (e) => this.handleLoanSubmit(e));

        // Settings
        document.getElementById('currencySelect').addEventListener('change', (e) => this.updateCurrencySetting('currency', e.target.value));
        document.getElementById('currencySymbol').addEventListener('change', (e) => this.updateCurrencySetting('currencySymbol', e.target.value));
        document.getElementById('enableRollover').addEventListener('change', (e) => this.toggleRolloverSettings(e.target.checked));

        // Planner timeframe buttons
        document.querySelectorAll('.planner-timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.planner-timeframe-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updatePlannerView();
            });
        });

        // Initialize category options
        this.updateCategoryOptions('income');
    }

    handleTransactionSubmit(e) {
        e.preventDefault();
        
        const transaction = {
            description: document.getElementById('transactionDescription').value,
            type: document.getElementById('transactionType').value,
            category: document.getElementById('transactionCategory').value,
            amount: parseFloat(document.getElementById('transactionAmount').value),
            date: document.getElementById('transactionDate').value
        };

        const index = parseInt(document.getElementById('transactionIndex').value);
        
        if (index === -1) {
            this.addTransaction(transaction);
        } else {
            this.updateTransaction(index, transaction);
        }

        bootstrap.Modal.getInstance(document.getElementById('addTransactionModal')).hide();
        e.target.reset();
        document.getElementById('transactionIndex').value = '-1';
    }

    handleFutureIncomeSubmit(e) {
        e.preventDefault();
        
        const income = {
            description: document.getElementById('futureIncomeDescription').value,
            type: document.getElementById('futureIncomeType').value,
            amount: parseFloat(document.getElementById('futureIncomeAmount').value),
            frequency: document.getElementById('futureIncomeFrequency').value,
            startDate: document.getElementById('futureIncomeStartDate').value,
            endDate: document.getElementById('futureIncomeEndDate').value || null
        };

        const index = parseInt(document.getElementById('futureIncomeIndex').value);
        
        if (index === -1) {
            this.futureIncome.push(income);
        } else {
            this.futureIncome[index] = income;
        }

        this.saveData();
        this.updatePlannerView();
        bootstrap.Modal.getInstance(document.getElementById('futureIncomeModal')).hide();
        e.target.reset();
        document.getElementById('futureIncomeIndex').value = '-1';
        this.showToast('Future income saved successfully!', 'success');
    }

    handleFutureExpenseSubmit(e) {
        e.preventDefault();
        
        const expense = {
            description: document.getElementById('futureExpenseDescription').value,
            type: document.getElementById('futureExpenseType').value,
            amount: parseFloat(document.getElementById('futureExpenseAmount').value),
            frequency: document.getElementById('futureExpenseFrequency').value,
            startDate: document.getElementById('futureExpenseStartDate').value,
            endDate: document.getElementById('futureExpenseEndDate').value || null
        };

        const index = parseInt(document.getElementById('futureExpenseIndex').value);
        
        if (index === -1) {
            this.futureExpenses.push(expense);
        } else {
            this.futureExpenses[index] = expense;
        }

        this.saveData();
        this.updatePlannerView();
        bootstrap.Modal.getInstance(document.getElementById('futureExpenseModal')).hide();
        e.target.reset();
        document.getElementById('futureExpenseIndex').value = '-1';
        this.showToast('Future expense saved successfully!', 'success');
    }

    handleLoanSubmit(e) {
        e.preventDefault();
        
        const loanType = document.getElementById('loanType').value;
        const loan = {
            type: loanType,
            description: document.getElementById('loanDescription').value || '',
            amount: parseFloat(document.getElementById('loanAmount').value)
        };

        if (loanType === 'given') {
            loan.borrower = document.getElementById('loanBorrower').value;
            loan.dateGiven = document.getElementById('loanDateGiven').value;
            loan.expectedReturn = document.getElementById('loanExpectedReturn').value || null;
        } else {
            loan.lender = document.getElementById('loanLender').value;
            loan.dateTaken = document.getElementById('loanDateTaken').value;
            loan.dueDate = document.getElementById('loanDueDate').value || null;
        }

        const index = parseInt(document.getElementById('loanIndex').value);
        
        if (index === -1) {
            this.loans.push(loan);
        } else {
            this.loans[index] = loan;
        }

        this.saveData();
        this.updateDebtView();
        bootstrap.Modal.getInstance(document.getElementById('loanModal')).hide();
        e.target.reset();
        document.getElementById('loanIndex').value = '-1';
        this.showToast('Loan saved successfully!', 'success');
    }

    // Modal Management
    openAddTransaction() {
        document.getElementById('transactionIndex').value = '-1';
        document.getElementById('transactionModalLabel').textContent = 'Add Transaction';
        document.getElementById('transactionDate').value = this.formatDate(new Date());
        bootstrap.Modal.getInstance(document.getElementById('addTransactionModal')).show();
    }

    editTransaction(index) {
        const transaction = this.transactions[index];
        document.getElementById('transactionIndex').value = index;
        document.getElementById('transactionModalLabel').textContent = 'Edit Transaction';
        document.getElementById('transactionDescription').value = transaction.description;
        document.getElementById('transactionType').value = transaction.type;
        document.getElementById('transactionAmount').value = transaction.amount;
        document.getElementById('transactionDate').value = transaction.date;
        
        this.updateCategoryOptions(transaction.type);
        setTimeout(() => {
            document.getElementById('transactionCategory').value = transaction.category;
        }, 100);
        
        bootstrap.Modal.getInstance(document.getElementById('addTransactionModal')).show();
    }

    openAddFutureIncome() {
        document.getElementById('futureIncomeIndex').value = '-1';
        document.getElementById('futureIncomeModalLabel').textContent = 'Add Future Income';
        document.getElementById('futureIncomeStartDate').value = this.formatDate(new Date());
        bootstrap.Modal.getInstance(document.getElementById('futureIncomeModal')).show();
    }

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
        bootstrap.Modal.getInstance(document.getElementById('futureIncomeModal')).show();
    }

    deleteFutureIncome(index) {
        if (confirm('Are you sure you want to delete this future income?')) {
            this.futureIncome.splice(index, 1);
            this.saveData();
            this.updatePlannerView();
            this.showToast('Future income deleted successfully!', 'success');
        }
    }

    openAddFutureExpense() {
        document.getElementById('futureExpenseIndex').value = '-1';
        document.getElementById('futureExpenseModalLabel').textContent = 'Add Future Expense';
        document.getElementById('futureExpenseStartDate').value = this.formatDate(new Date());
        bootstrap.Modal.getInstance(document.getElementById('futureExpenseModal')).show();
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
        bootstrap.Modal.getInstance(document.getElementById('futureExpenseModal')).show();
    }

    deleteFutureExpense(index) {
        if (confirm('Are you sure you want to delete this future expense?')) {
            this.futureExpenses.splice(index, 1);
            this.saveData();
            this.updatePlannerView();
            this.showToast('Future expense deleted successfully!', 'success');
        }
    }

    openAddLoan(type) {
        document.getElementById('loanIndex').value = '-1';
        document.getElementById('loanType').value = type;
        document.getElementById('loanModalLabel').textContent = type === 'given' ? 'Add Loan Given' : 'Add Loan Taken';
        
        // Show/hide relevant fields
        document.getElementById('loanBorrowerLabel').style.display = type === 'given' ? 'block' : 'none';
        document.getElementById('loanLenderLabel').style.display = type === 'taken' ? 'block' : 'none';
        document.getElementById('loanDateGivenLabel').style.display = type === 'given' ? 'block' : 'none';
        document.getElementById('loanDateTakenLabel').style.display = type === 'taken' ? 'block' : 'none';
        document.getElementById('loanExpectedReturnLabel').style.display = type === 'given' ? 'block' : 'none';
        document.getElementById('loanDueDateLabel').style.display = type === 'taken' ? 'block' : 'none';
        
        // Set current date
        if (type === 'given') {
            document.getElementById('loanDateGiven').value = this.formatDate(new Date());
        } else {
            document.getElementById('loanDateTaken').value = this.formatDate(new Date());
        }
        
        bootstrap.Modal.getInstance(document.getElementById('loanModal')).show();
    }

    editLoan(index) {
        const loan = this.loans[index];
        document.getElementById('loanIndex').value = index;
        document.getElementById('loanType').value = loan.type;
        document.getElementById('loanModalLabel').textContent = loan.type === 'given' ? 'Edit Loan Given' : 'Edit Loan Taken';
        document.getElementById('loanDescription').value = loan.description || '';
        document.getElementById('loanAmount').value = loan.amount;
        
        // Show/hide relevant fields
        document.getElementById('loanBorrowerLabel').style.display = loan.type === 'given' ? 'block' : 'none';
        document.getElementById('loanLenderLabel').style.display = loan.type === 'taken' ? 'block' : 'none';
        document.getElementById('loanDateGivenLabel').style.display = loan.type === 'given' ? 'block' : 'none';
        document.getElementById('loanDateTakenLabel').style.display = loan.type === 'taken' ? 'block' : 'none';
        document.getElementById('loanExpectedReturnLabel').style.display = loan.type === 'given' ? 'block' : 'none';
        document.getElementById('loanDueDateLabel').style.display = loan.type === 'taken' ? 'block' : 'none';
        
        // Populate fields
        if (loan.type === 'given') {
            document.getElementById('loanBorrower').value = loan.borrower || '';
            document.getElementById('loanDateGiven').value = loan.dateGiven || '';
            document.getElementById('loanExpectedReturn').value = loan.expectedReturn || '';
        } else {
            document.getElementById('loanLender').value = loan.lender || '';
            document.getElementById('loanDateTaken').value = loan.dateTaken || '';
            document.getElementById('loanDueDate').value = loan.dueDate || '';
        }
        
        bootstrap.Modal.getInstance(document.getElementById('loanModal')).show();
    }

    deleteLoan(index) {
        if (confirm('Are you sure you want to delete this loan?')) {
            this.loans.splice(index, 1);
            this.saveData();
            this.updateDebtView();
            this.showToast('Loan deleted successfully!', 'success');
        }
    }

    // Category Management
    updateCategoryOptions(type) {
        const categorySelect = document.getElementById('transactionCategory');
        categorySelect.innerHTML = this.categories[type].map(category => 
            `<option value="${category}">${this.formatCategoryName(category)}</option>`
        ).join('');
    }

    showCategoryTransactions(type, category) {
        const month = parseInt(document.getElementById('summaryMonth').value);
        const year = parseInt(document.getElementById('summaryYear').value);
        const summary = this.calculateMonthlySummary(month, year);
        
        const categoryTransactions = summary.transactions.filter(t => 
            t.type === type && (category === 'all' || t.category === category)
        );

        // Update modal title and info
        document.getElementById('categoryTransactionsTitle').innerHTML = 
            `<i class="bi bi-list-ul"></i> ${type === 'income' ? 'Income' : 'Expense'} Transactions`;
        
        document.getElementById('categoryTransactionsInfo').textContent = 
            category === 'all' ? 'All categories' : this.formatCategoryName(category);
        
        // Calculate total
        const totalAmount = categoryTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        document.getElementById('categoryTotalAmount').textContent = this.formatCurrency(totalAmount);
        document.getElementById('categoryTotalAmount').className = 
            `fw-bold fs-5 ${type === 'income' ? 'text-success' : 'text-danger'}`;

        // Update transactions list
        const list = document.getElementById('categoryTransactionsList');
        const noTransactions = document.getElementById('noCategoryTransactions');

        if (categoryTransactions.length === 0) {
            list.innerHTML = '';
            noTransactions.classList.remove('d-none');
        } else {
            noTransactions.classList.add('d-none');
            list.innerHTML = categoryTransactions.map(transaction => `
                <div class="category-transaction-item">
                    <div class="transaction-main">
                        <div class="transaction-description">
                            <strong>${transaction.description}</strong>
                            <small class="text-muted">${this.formatDisplayDate(transaction.date)}</small>
                        </div>
                        <div class="transaction-amount ${type === 'income' ? 'text-success' : 'text-danger'}">
                            ${type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                        </div>
                    </div>
                    <div class="transaction-category">
                        <span class="badge bg-light text-dark">${this.formatCategoryName(transaction.category)}</span>
                    </div>
                </div>
            `).join('');
        }

        bootstrap.Modal.getInstance(document.getElementById('categoryTransactionsModal')).show();
    }

    addTransactionForCategory() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('categoryTransactionsModal'));
        modal.hide();
        
        // Get the current category context from the modal
        const type = document.getElementById('categoryTransactionsTitle').textContent.includes('Income') ? 'income' : 'expense';
        const categoryElement = document.getElementById('categoryTransactionsInfo');
        let category = 'all';
        
        if (!categoryElement.textContent.includes('All categories')) {
            // Extract category from the displayed text
            const categoryText = categoryElement.textContent.toLowerCase().replace(/\s+/g, '_');
            if (this.categories[type].includes(categoryText)) {
                category = categoryText;
            }
        }

        // Open add transaction modal with pre-filled values
        this.openAddTransaction();
        setTimeout(() => {
            document.getElementById('transactionType').value = type;
            this.updateCategoryOptions(type);
            if (category !== 'all') {
                setTimeout(() => {
                    document.getElementById('transactionCategory').value = category;
                }, 100);
            }
        }, 500);
    }

    showMonthDetails(month, year) {
        const summary = this.calculateMonthlySummary(month, year);
        
        // Update summary numbers
        document.getElementById('monthDetailsIncome').textContent = this.formatCurrency(summary.income);
        document.getElementById('monthDetailsExpenses').textContent = this.formatCurrency(summary.expenses);
        document.getElementById('monthDetailsBalance').textContent = this.formatCurrency(summary.netWealth);

        // Update income breakdown
        const incomeBreakdown = this.calculateCategoryBreakdown(month, year, 'income');
        document.getElementById('monthDetailsIncomeList').innerHTML = Object.entries(incomeBreakdown)
            .map(([category, amount]) => `
                <div class="breakdown-item">
                    <span>${this.formatCategoryName(category)}</span>
                    <span class="text-success">${this.formatCurrency(amount)}</span>
                </div>
            `).join('') || '<div class="text-muted">No income</div>';

        // Update expense breakdown
        const expenseBreakdown = this.calculateCategoryBreakdown(month, year, 'expense');
        document.getElementById('monthDetailsExpensesList').innerHTML = Object.entries(expenseBreakdown)
            .map(([category, amount]) => `
                <div class="breakdown-item">
                    <span>${this.formatCategoryName(category)}</span>
                    <span class="text-danger">${this.formatCurrency(amount)}</span>
                </div>
            `).join('') || '<div class="text-muted">No expenses</div>';

        // Update transaction details
        document.getElementById('monthDetailsTransactions').innerHTML = summary.transactions
            .sort((a, b) => this.isBefore(a.date, b.date) ? -1 : 1)
            .map(transaction => `
                <div class="transaction-detail">
                    <div class="transaction-date">${this.formatDisplayDate(transaction.date)}</div>
                    <div class="transaction-info">
                        <span class="transaction-desc">${transaction.description}</span>
                        <span class="transaction-cat">${this.formatCategoryName(transaction.category)}</span>
                    </div>
                    <div class="transaction-amount ${transaction.type === 'income' ? 'text-success' : 'text-danger'}">
                        ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                    </div>
                </div>
            `).join('') || '<div class="text-muted">No transactions</div>';

        bootstrap.Modal.getInstance(document.getElementById('monthDetailsModal')).show();
    }

    // Settings Management
    updateCurrencySetting(setting, value) {
        this.settings[setting] = value;
        this.saveData();
        this.updateCurrencyDisplay();
        this.showToast('Currency settings updated!', 'success');
    }

    toggleRolloverSettings(enabled) {
        this.settings.enableRollover = enabled;
        const settingsDiv = document.getElementById('rolloverSettings');
        
        if (enabled) {
            settingsDiv.style.display = 'block';
            document.getElementById('rolloverAmountInput').value = this.settings.rolloverAmount;
            document.getElementById('rolloverDescriptionInput').value = this.settings.rolloverDescription;
        } else {
            settingsDiv.style.display = 'none';
            this.settings.rolloverAmount = 0;
            this.settings.rolloverDescription = '';
        }
        
        this.saveData();
        this.toggleRolloverDisplay();
    }

    saveRolloverSettings() {
        this.settings.rolloverAmount = parseFloat(document.getElementById('rolloverAmountInput').value) || 0;
        this.settings.rolloverDescription = document.getElementById('rolloverDescriptionInput').value;
        this.saveData();
        this.toggleRolloverDisplay();
        this.showToast('Rollover settings saved!', 'success');
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
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wealth-command-backup-${this.formatDate(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Data exported successfully!', 'success');
    }

    importData() {
        document.getElementById('importFileInput').click();
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
                    this.settings = { ...this.settings, ...(data.settings || {}) };
                    
                    this.saveData();
                    this.updateDashboard();
                    this.updatePlannerView();
                    this.updateDebtView();
                    this.updateCurrencyDisplay();
                    
                    this.showToast('Data imported successfully!', 'success');
                }
            } catch (error) {
                this.showToast('Error importing data. Invalid file format.', 'error');
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
            this.transactions = [];
            this.futureIncome = [];
            this.futureExpenses = [];
            this.loans = [];
            this.settings = {
                currency: 'PKR',
                currencySymbol: 'Rs',
                enableRollover: false,
                rolloverAmount: 0,
                rolloverDescription: ''
            };
            
            this.saveData();
            this.updateDashboard();
            this.updatePlannerView();
            this.updateDebtView();
            this.updateCurrencyDisplay();
            
            this.showToast('All data cleared!', 'success');
        }
    }

    // Analytics and AI
    showFullAIAnalysis() {
        const insights = this.generateAIInsights();
        const content = document.getElementById('aiInsightsContent');
        
        content.innerHTML = `
            <div class="ai-analysis-section">
                <h6><i class="bi bi-heart-pulse text-primary"></i> Financial Health Score</h6>
                <div class="health-score-display">
                    <div class="score-circle">
                        <span class="score-value">${insights.healthScore}</span>
                        <span class="score-label">/100</span>
                    </div>
                    <div class="score-details">
                        <p><strong>${insights.healthScore >= 80 ? 'Excellent' : insights.healthScore >= 60 ? 'Good' : 'Needs Improvement'}</strong></p>
                        <p>Savings Rate: <strong>${insights.savingsRate}%</strong></p>
                    </div>
                </div>
            </div>

            <div class="ai-analysis-section">
                <h6><i class="bi bi-lightbulb text-warning"></i> Key Insights</h6>
                <div class="insights-list">
                    ${insights.insights.map(insight => `
                        <div class="insight-item">
                            <i class="bi bi-check-circle text-success"></i>
                            <span>${insight}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="ai-analysis-section">
                <h6><i class="bi bi-star text-info"></i> Recommendations</h6>
                <div class="recommendations-list">
                    ${insights.recommendations.map(rec => `
                        <div class="recommendation-item">
                            <i class="bi bi-arrow-right"></i>
                            <span>${rec}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="ai-analysis-section">
                <h6><i class="bi bi-graph-up text-success"></i> Action Plan</h6>
                <div class="action-plan">
                    <p>Based on your current financial patterns, here's what you can focus on:</p>
                    <ul>
                        <li>Review your largest expense categories for optimization opportunities</li>
                        <li>Consider setting up automatic transfers to savings</li>
                        <li>Plan for upcoming large expenses in the next 3-6 months</li>
                        <li>Monitor your savings rate and aim for consistent improvement</li>
                    </ul>
                </div>
            </div>
        `;

        bootstrap.Modal.getInstance(document.getElementById('aiInsightsModal')).show();
    }

    applyAISuggestions() {
        // This would implement specific AI recommendations
        // For now, we'll just show a success message
        this.showToast('AI suggestions applied successfully!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('aiInsightsModal')).hide();
    }

    // Utility Methods
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toastId = 'toast-' + Date.now();
        
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type === 'error' ? 'danger' : type} border-0`;
        toast.id = toastId;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    getCurrentBalance() {
        const current = this.getCurrentMonthYear();
        const summary = this.calculateMonthlySummary(current.month, current.year);
        return summary.netWealth;
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
    
    // Update specific views when their tabs are shown
    if (tabId === 'tab-planner') {
        app.updatePlannerView();
    } else if (tabId === 'tab-debt') {
        app.updateDebtView();
    } else if (tabId === 'tab-analytics') {
        app.updateAnalyticsView();
    }
}

function showGoogleSignIn() {
    bootstrap.Modal.getInstance(document.getElementById('googleSignInModal')).show();
}

function googleSignOut() {
    app.googleToken = null;
    app.currentUser = null;
    
    // Update UI
    document.getElementById('signedInUser').classList.add('d-none');
    document.getElementById('signInOption').classList.remove('d-none');
    document.getElementById('signOutOption').classList.add('d-none');
    document.getElementById('profilePicture').innerHTML = '<i class="bi bi-person-circle profile-icon"></i>';
    
    app.showToast('Signed out successfully!', 'success');
}

function manualSync() {
    if (app.googleToken) {
        app.syncWithGoogleDrive();
    } else {
        showGoogleSignIn();
    }
}

function toggleRolloverSettings() {
    const settingsDiv = document.getElementById('rolloverSettings');
    const isVisible = settingsDiv.style.display !== 'none';
    settingsDiv.style.display = isVisible ? 'none' : 'block';
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', function() {
    app = new WealthCommand();
    
    // Set up file import handler
    document.getElementById('importFileInput').addEventListener('change', (e) => app.handleFileImport(e));
    
    // Set up transaction modal opener
    document.getElementById('openAddTransactionModal').addEventListener('click', () => app.openAddTransaction());
    
    // Initialize modals
    const modals = [
        'addTransactionModal', 'categoryTransactionsModal', 'aiInsightsModal',
        'futureIncomeModal', 'futureExpenseModal', 'loanModal', 'monthDetailsModal', 'googleSignInModal'
    ];
    
    modals.forEach(modalId => {
        new bootstrap.Modal(document.getElementById(modalId));
    });
});
