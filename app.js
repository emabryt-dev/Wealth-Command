// Wealth Command - Enhanced Financial Tracking App
class WealthCommand {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.budgets = JSON.parse(localStorage.getItem('budgets')) || [];
        this.categories = [
            'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 
            'Bills & Utilities', 'Healthcare', 'Travel', 'Education', 
            'Salary', 'Freelance', 'Investments', 'Other Income', 'Gifts'
        ];
        this.user = null;
        this.charts = {};
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';
        this.recentCategoryLimit = 5;
        
        this.init();
    }

    init() {
        this.initializeTheme();
        this.setupEventListeners();
        this.showAuthScreen();
        this.initializeDatePicker();
        this.initializeCategorySelect();
    }

    initializeTheme() {
        if (this.isDarkMode) {
            document.body.setAttribute('data-theme', 'dark');
            document.getElementById('darkModeStatus').textContent = 'On';
        } else {
            document.body.removeAttribute('data-theme');
            document.getElementById('darkModeStatus').textContent = 'Off';
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(e.target.getAttribute('data-tab'));
            });
        });

        // Dark mode toggle
        document.getElementById('darkModeToggle').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleDarkMode();
        });

        // Sign out
        document.getElementById('signOutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.signOut();
        });

        // Transaction search
        document.getElementById('transactionSearch').addEventListener('input', (e) => {
            this.filterTransactions(e.target.value);
        });

        // Form submissions
        document.getElementById('addTransactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // Modal events
        const transactionModal = document.getElementById('addTransactionModal');
        transactionModal.addEventListener('show.bs.modal', () => {
            this.updateRecentCategories();
        });

        // Real-time validation
        this.setupRealTimeValidation();
    }

    initializeDatePicker() {
        flatpickr('#transactionDate', {
            dateFormat: 'Y-m-d',
            defaultDate: 'today',
            maxDate: 'today'
        });
    }

    initializeCategorySelect() {
        const categorySelect = document.getElementById('transactionCategory');
        categorySelect.innerHTML = '<option value="">Select Category</option>' +
            this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    setupRealTimeValidation() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', () => this.validateField(input));
            });
        });
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let message = '';

        // Remove existing validation classes
        field.classList.remove('is-valid', 'is-invalid');
        
        // Remove existing feedback
        const existingFeedback = field.parentNode.querySelector('.validation-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        // Skip validation if field is empty (except for required fields on blur)
        if (!value && !field.hasAttribute('required')) {
            return true;
        }

        switch (field.type) {
            case 'number':
                if (field.name === 'amount') {
                    const amount = parseFloat(value);
                    if (isNaN(amount) || amount <= 0) {
                        isValid = false;
                        message = 'Please enter a valid positive amount';
                    } else if (amount > 1000000) {
                        isValid = false;
                        message = 'Amount seems too large. Please verify.';
                    }
                }
                break;
            
            case 'text':
                if (field.name === 'description') {
                    if (value.length < 2) {
                        isValid = false;
                        message = 'Description must be at least 2 characters';
                    } else if (value.length > 100) {
                        isValid = false;
                        message = 'Description is too long (max 100 characters)';
                    }
                }
                break;
            
            case 'select-one':
                if (!value) {
                    isValid = false;
                    message = 'Please select a category';
                }
                break;
        }

        // Apply validation styling
        if (value) {
            field.classList.add(isValid ? 'is-valid' : 'is-invalid');
            
            if (!isValid) {
                const feedback = document.createElement('div');
                feedback.className = `validation-${isValid ? 'valid' : 'invalid'}`;
                feedback.textContent = message;
                field.parentNode.appendChild(feedback);
            }
        }

        return isValid;
    }

    validateForm(form) {
        const inputs = form.querySelectorAll('input[required], select[required]');
        let isValid = true;
        const errors = [];

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
                errors.push(input.name);
            }
        });

        return { isValid, errors };
    }

    showAuthScreen() {
        document.getElementById('globalLoading').classList.add('d-none');
        document.getElementById('authScreen').classList.remove('d-none');
        document.getElementById('app').classList.add('d-none');
    }

    showMainApp() {
        document.getElementById('authScreen').classList.add('d-none');
        document.getElementById('app').classList.remove('d-none');
        this.loadDashboard();
    }

    async handleGoogleSignIn(response) {
        try {
            document.getElementById('globalLoading').classList.remove('d-none');
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            this.user = {
                name: response.credential.name,
                email: response.credential.email,
                picture: response.credential.picture
            };
            
            document.getElementById('userName').textContent = this.user.name;
            this.showMainApp();
            this.showToast('Successfully signed in!', 'success');
            
        } catch (error) {
            console.error('Sign in error:', error);
            this.showToast('Sign in failed. Please try again.', 'error');
        } finally {
            document.getElementById('globalLoading').classList.add('d-none');
        }
    }

    signOut() {
        google.accounts.id.disableAutoSelect();
        this.user = null;
        this.showAuthScreen();
        this.showToast('Successfully signed out!', 'success');
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('darkMode', this.isDarkMode);
        this.initializeTheme();
        
        // Update charts for theme change
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};
        
        // Reload current tab
        const activeTab = document.querySelector('.nav-link.active').getAttribute('data-tab');
        this.switchTab(activeTab);
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('d-none');
        });

        // Show selected tab
        document.getElementById(`${tabName}Tab`).classList.remove('d-none');

        // Load tab content
        switch (tabName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'transactions':
                this.loadTransactions();
                break;
            case 'budgets':
                this.loadBudgets();
                break;
            case 'reports':
                this.loadReports();
                break;
        }

        // Show/hide FAB
        const fab = document.getElementById('quickAddFab');
        if (tabName === 'transactions' || tabName === 'dashboard') {
            fab.classList.remove('d-none');
            fab.classList.add('animate__bounceIn');
        } else {
            fab.classList.add('d-none');
        }
    }

    async loadDashboard() {
        this.showSkeleton('#dashboardTab');
        
        // Simulate data loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.updateQuickStats();
        this.renderSpendingChart();
        this.renderCategoryChart();
        this.renderRecentTransactions();
        this.renderBudgetProgress();
        
        this.hideSkeleton('#dashboardTab');
    }

    showSkeleton(container) {
        const skeletons = document.querySelectorAll(`${container} .skeleton`);
        skeletons.forEach(skeleton => skeleton.classList.remove('d-none'));
    }

    hideSkeleton(container) {
        const skeletons = document.querySelectorAll(`${container} .skeleton`);
        skeletons.forEach(skeleton => skeleton.classList.add('d-none'));
    }

    updateQuickStats() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyTransactions = this.transactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate.getMonth() === currentMonth && 
                   transDate.getFullYear() === currentYear;
        });

        const income = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = income - expenses;
        const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

        document.getElementById('totalBalance').textContent = this.formatCurrency(balance);
        document.getElementById('totalIncome').textContent = this.formatCurrency(income);
        document.getElementById('totalExpenses').textContent = this.formatCurrency(expenses);
        document.getElementById('savingsRate').textContent = `${savingsRate.toFixed(1)}%`;

        // Add animation to stat cards
        document.querySelectorAll('.stat-card').forEach((card, index) => {
            card.classList.add('animate__fadeInUp');
            card.style.animationDelay = `${index * 0.1}s`;
        });
    }

    renderSpendingChart() {
        const ctx = document.getElementById('spendingChart').getContext('2d');
        const chartLoading = document.getElementById('chartLoading');
        
        chartLoading.classList.remove('d-none');
        
        // Simulate chart loading
        setTimeout(() => {
            if (this.charts.spending) {
                this.charts.spending.destroy();
            }

            const last30Days = this.getLastNDays(30);
            const incomeData = this.getDailyAmounts(last30Days, 'income');
            const expenseData = this.getDailyAmounts(last30Days, 'expense');

            this.charts.spending = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: last30Days.map(date => dateFns.format(date, 'MMM dd')),
                    datasets: [
                        {
                            label: 'Income',
                            data: incomeData,
                            borderColor: '#27ae60',
                            backgroundColor: 'rgba(39, 174, 96, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Expenses',
                            data: expenseData,
                            borderColor: '#e74c3c',
                            backgroundColor: 'rgba(231, 76, 60, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: (context) => {
                                    return `${context.dataset.label}: ${this.formatCurrency(context.parsed.y)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => this.formatCurrency(value)
                            }
                        }
                    },
                    animation: {
                        duration: 1000,
                        easing: 'easeOutQuart'
                    }
                }
            });

            chartLoading.classList.add('d-none');
        }, 500);
    }

    renderCategoryChart() {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        const chartLoading = document.getElementById('categoryChartLoading');
        
        chartLoading.classList.remove('d-none');

        setTimeout(() => {
            if (this.charts.category) {
                this.charts.category.destroy();
            }

            const categoryTotals = this.categories.map(category => {
                const total = this.transactions
                    .filter(t => t.category === category && t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0);
                return { category, total };
            }).filter(item => item.total > 0);

            if (categoryTotals.length === 0) {
                chartLoading.classList.add('d-none');
                return;
            }

            this.charts.category = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: categoryTotals.map(item => item.category),
                    datasets: [{
                        data: categoryTotals.map(item => item.total),
                        backgroundColor: [
                            '#3498db', '#e74c3c', '#27ae60', '#f39c12',
                            '#9b59b6', '#1abc9c', '#d35400', '#34495e',
                            '#16a085', '#8e44ad', '#2c3e50', '#f1c40f'
                        ],
                        borderWidth: 2,
                        borderColor: document.body.getAttribute('data-theme') === 'dark' ? '#2d2d2d' : '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: ${this.formatCurrency(context.parsed)} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    animation: {
                        animateScale: true,
                        animateRotate: true,
                        duration: 1000
                    }
                }
            });

            chartLoading.classList.add('d-none');
        }, 500);
    }

    renderRecentTransactions() {
        const container = document.getElementById('recentTransactionsList');
        const emptyState = document.getElementById('recentTransactionsEmpty');
        
        const recent = this.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        if (recent.length === 0) {
            container.classList.add('d-none');
            emptyState.classList.remove('d-none');
            return;
        }

        container.classList.remove('d-none');
        emptyState.classList.add('d-none');

        container.innerHTML = recent.map((transaction, index) => `
            <div class="list-group-item animate__animated" style="animation-delay: ${index * 0.1}s">
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${transaction.description}</h6>
                        <small class="text-muted">${transaction.category}</small>
                    </div>
                    <div class="text-end">
                        <span class="d-block ${transaction.type === 'income' ? 'text-success' : 'text-danger'}">
                            ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                        </span>
                        <small class="text-muted">${dateFns.format(new Date(transaction.date), 'MMM dd')}</small>
                    </div>
                </div>
            </div>
        `).join('');

        // Add animation
        container.querySelectorAll('.list-group-item').forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('animate__fadeInRight');
            }, index * 100);
        });
    }

    renderBudgetProgress() {
        const container = document.getElementById('budgetProgressList');
        const emptyState = document.getElementById('budgetProgressEmpty');

        if (this.budgets.length === 0) {
            container.classList.add('d-none');
            emptyState.classList.remove('d-none');
            return;
        }

        container.classList.remove('d-none');
        emptyState.classList.add('d-none');

        container.innerHTML = this.budgets.map((budget, index) => {
            const spent = this.transactions
                .filter(t => t.category === budget.category && t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
            
            const percentage = (spent / budget.amount) * 100;
            let statusClass = 'bg-success';
            let statusText = 'On track';

            if (percentage > 75) {
                statusClass = 'bg-warning';
                statusText = 'Getting close';
            }
            if (percentage >= 100) {
                statusClass = 'bg-danger';
                statusText = 'Over budget';
            }

            return `
                <div class="budget-item mb-3 animate__animated" style="animation-delay: ${index * 0.1}s">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fw-medium">${budget.category}</span>
                        <small class="${percentage >= 100 ? 'text-danger' : percentage > 75 ? 'text-warning' : 'text-success'}">
                            ${this.formatCurrency(spent)} / ${this.formatCurrency(budget.amount)}
                        </small>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar ${statusClass}" 
                             role="progressbar" 
                             style="width: ${Math.min(percentage, 100)}%"
                             aria-valuenow="${percentage}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                    <small class="text-muted">${statusText} • ${percentage.toFixed(1)}%</small>
                </div>
            `;
        }).join('');

        // Add animations
        container.querySelectorAll('.budget-item').forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('animate__fadeInUp');
            }, index * 100);
        });
    }

    loadTransactions() {
        const container = document.getElementById('transactionsTableBody');
        const emptyState = document.getElementById('transactionsEmpty');
        
        if (this.transactions.length === 0) {
            container.classList.add('d-none');
            emptyState.classList.remove('d-none');
            return;
        }

        container.classList.remove('d-none');
        emptyState.classList.add('d-none');

        const sortedTransactions = this.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = sortedTransactions.map((transaction, index) => `
            <tr class="animate__animated" style="animation-delay: ${index * 0.05}s">
                <td>${dateFns.format(new Date(transaction.date), 'MMM dd, yyyy')}</td>
                <td>${transaction.description}</td>
                <td>
                    <span class="badge bg-light text-dark">${transaction.category}</span>
                </td>
                <td class="${transaction.type === 'income' ? 'text-success' : 'text-danger'}">
                    ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                </td>
                <td>
                    <span class="badge ${transaction.type === 'income' ? 'bg-success' : 'bg-danger'}">
                        ${transaction.type}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="app.deleteTransaction(${transaction.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Add animations
        container.querySelectorAll('tr').forEach((row, index) => {
            setTimeout(() => {
                row.classList.add('animate__fadeIn');
            }, index * 50);
        });
    }

    filterTransactions(searchTerm) {
        const rows = document.querySelectorAll('#transactionsTableBody tr');
        let visibleCount = 0;

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const isVisible = text.includes(searchTerm.toLowerCase());
            row.style.display = isVisible ? '' : 'none';
            if (isVisible) visibleCount++;
        });

        // Show empty state if no results
        const emptyState = document.getElementById('transactionsEmpty');
        const tableBody = document.getElementById('transactionsTableBody');
        
        if (visibleCount === 0 && searchTerm) {
            tableBody.classList.add('d-none');
            emptyState.classList.remove('d-none');
            emptyState.innerHTML = `
                <i class="bi bi-search display-4 text-muted mb-3"></i>
                <h5>No transactions found</h5>
                <p class="text-muted">No transactions match "${searchTerm}"</p>
                <button class="btn btn-primary" onclick="document.getElementById('transactionSearch').value=''; app.filterTransactions('');">
                    Clear Search
                </button>
            `;
        } else if (visibleCount === 0) {
            tableBody.classList.add('d-none');
            emptyState.classList.remove('d-none');
        } else {
            tableBody.classList.remove('d-none');
            emptyState.classList.add('d-none');
        }
    }

    loadBudgets() {
        const container = document.getElementById('budgetsGrid');
        const emptyState = document.getElementById('budgetsEmpty');

        if (this.budgets.length === 0) {
            container.classList.add('d-none');
            emptyState.classList.remove('d-none');
            return;
        }

        container.classList.remove('d-none');
        emptyState.classList.add('d-none');

        container.innerHTML = this.budgets.map((budget, index) => {
            const spent = this.transactions
                .filter(t => t.category === budget.category && t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
            
            const percentage = (spent / budget.amount) * 100;
            const remaining = budget.amount - spent;
            let statusClass = 'border-success';
            let statusIcon = 'bi-check-circle text-success';

            if (percentage > 75) {
                statusClass = 'border-warning';
                statusIcon = 'bi-exclamation-circle text-warning';
            }
            if (percentage >= 100) {
                statusClass = 'border-danger';
                statusIcon = 'bi-x-circle text-danger';
            }

            return `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card h-100 animate__animated ${statusClass}" style="animation-delay: ${index * 0.1}s">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <h6 class="card-title mb-0">${budget.category}</h6>
                                <i class="bi ${statusIcon}"></i>
                            </div>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <small class="text-muted">Spent</small>
                                    <small class="${percentage >= 100 ? 'text-danger' : 'text-muted'}">
                                        ${this.formatCurrency(spent)} / ${this.formatCurrency(budget.amount)}
                                    </small>
                                </div>
                                <div class="progress" style="height: 6px;">
                                    <div class="progress-bar ${percentage >= 100 ? 'bg-danger' : percentage > 75 ? 'bg-warning' : 'bg-success'}" 
                                         style="width: ${Math.min(percentage, 100)}%">
                                    </div>
                                </div>
                            </div>
                            <div class="d-flex justify-content-between text-muted small">
                                <span>${percentage.toFixed(1)}%</span>
                                <span>Remaining: ${this.formatCurrency(Math.max(remaining, 0))}</span>
                            </div>
                        </div>
                        <div class="card-footer bg-transparent">
                            <button class="btn btn-sm btn-outline-danger w-100" onclick="app.deleteBudget('${budget.id}')">
                                Delete Budget
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add animations
        container.querySelectorAll('.card').forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animate__fadeInUp');
            }, index * 100);
        });
    }

    loadReports() {
        // Reports are generated on-demand
        document.getElementById('reportOutput').innerHTML = document.getElementById('reportsEmpty').outerHTML;
    }

    addTransaction() {
        const form = document.getElementById('addTransactionForm');
        const validation = this.validateForm(form);
        
        if (!validation.isValid) {
            this.showToast('Please fix the errors in the form', 'error');
            return;
        }

        const formData = new FormData(form);
        const transaction = {
            id: Date.now(),
            description: formData.get('description'),
            amount: parseFloat(formData.get('amount')),
            type: formData.get('type'),
            category: formData.get('category'),
            date: formData.get('date')
        };

        this.transactions.push(transaction);
        this.saveData();
        
        // Close modal and reset form
        bootstrap.Modal.getInstance(document.getElementById('addTransactionModal')).hide();
        form.reset();
        
        // Show success animation
        this.showToast('Transaction added successfully!', 'success');
        
        // Reload current view
        const activeTab = document.querySelector('.nav-link.active').getAttribute('data-tab');
        this.switchTab(activeTab);
    }

    deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveData();
            this.showToast('Transaction deleted!', 'success');
            this.loadTransactions();
        }
    }

    addBudget() {
        const form = document.getElementById('addBudgetForm');
        const formData = new FormData(form);
        
        const budget = {
            id: Date.now().toString(),
            category: formData.get('category'),
            amount: parseFloat(formData.get('amount')),
            period: formData.get('period')
        };

        // Check if budget already exists for this category
        if (this.budgets.some(b => b.category === budget.category)) {
            this.showToast('Budget already exists for this category!', 'error');
            return;
        }

        this.budgets.push(budget);
        this.saveData();
        
        bootstrap.Modal.getInstance(document.getElementById('addBudgetModal')).hide();
        form.reset();
        
        this.showToast('Budget created successfully!', 'success');
        this.loadBudgets();
    }

    deleteBudget(id) {
        if (confirm('Are you sure you want to delete this budget?')) {
            this.budgets = this.budgets.filter(b => b.id !== id);
            this.saveData();
            this.showToast('Budget deleted!', 'success');
            this.loadBudgets();
        }
    }

    updateRecentCategories() {
        const container = document.getElementById('recentCategories');
        const recent = this.getRecentCategories();
        
        if (recent.length === 0) {
            container.innerHTML = '<small class="text-muted">No recent categories</small>';
            return;
        }

        container.innerHTML = recent.map(category => `
            <span class="recent-category" onclick="app.selectRecentCategory('${category}')">
                ${category}
            </span>
        `).join('');
    }

    getRecentCategories() {
        const categoryCounts = {};
        
        this.transactions.forEach(transaction => {
            categoryCounts[transaction.category] = (categoryCounts[transaction.category] || 0) + 1;
        });

        return Object.entries(categoryCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, this.recentCategoryLimit)
            .map(([category]) => category);
    }

    selectRecentCategory(category) {
        document.getElementById('transactionCategory').value = category;
        this.validateField(document.getElementById('transactionCategory'));
    }

    getLastNDays(n) {
        const days = [];
        for (let i = n - 1; i >= 0; i--) {
            days.push(dateFns.subDays(new Date(), i));
        }
        return days;
    }

    getDailyAmounts(dates, type) {
        return dates.map(date => {
            return this.transactions
                .filter(t => {
                    const transDate = new Date(t.date);
                    return dateFns.isSameDay(transDate, date) && t.type === type;
                })
                .reduce((sum, t) => sum + t.amount, 0);
        });
    }

    formatCurrency(amount) {
        return numeral(amount).format('$0,0.00');
    }

    saveData() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
        localStorage.setItem('budgets', JSON.stringify(this.budgets));
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toastId = 'toast-' + Date.now();
        
        const bgClass = {
            success: 'bg-success',
            error: 'bg-danger',
            warning: 'bg-warning',
            info: 'bg-info'
        }[type] || 'bg-info';

        const icon = {
            success: 'bi-check-circle',
            error: 'bi-exclamation-circle',
            warning: 'bi-exclamation-triangle',
            info: 'bi-info-circle'
        }[type] || 'bi-info-circle';

        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi ${icon} me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
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

    // Report Generation Methods
    async generateIncomeExpenseReport() {
        const reportLoading = document.getElementById('reportLoading');
        const reportOutput = document.getElementById('reportOutput');
        
        reportLoading.classList.remove('d-none');
        reportOutput.innerHTML = '';

        // Simulate report generation
        await new Promise(resolve => setTimeout(resolve, 1500));

        const monthlyData = this.getMonthlyData();
        const ctx = document.createElement('canvas');
        ctx.height = 400;
        
        reportOutput.innerHTML = `
            <div class="report-header mb-4">
                <h4>Income vs Expenses Report</h4>
                <p class="text-muted">Monthly comparison for the last 6 months</p>
            </div>
            <div class="chart-container">
                <canvas id="incomeExpenseReportChart"></canvas>
            </div>
            <div class="row mt-4">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h6>Key Insights</h6>
                            <ul class="list-unstyled">
                                <li class="mb-2"><i class="bi bi-arrow-up-right text-success me-2"></i>Average Monthly Income: ${this.formatCurrency(monthlyData.avgIncome)}</li>
                                <li class="mb-2"><i class="bi bi-arrow-down-left text-danger me-2"></i>Average Monthly Expenses: ${this.formatCurrency(monthlyData.avgExpenses)}</li>
                                <li class="mb-2"><i class="bi bi-piggy-bank text-primary me-2"></i>Average Savings Rate: ${monthlyData.avgSavingsRate}%</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h6>Recommendations</h6>
                            <ul class="list-unstyled">
                                ${this.generateSpendingRecommendations(monthlyData)}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderIncomeExpenseReportChart(monthlyData);
        reportLoading.classList.add('d-none');
    }

    getMonthlyData() {
        const months = [];
        const incomeData = [];
        const expenseData = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = dateFns.subMonths(new Date(), i);
            const monthStart = dateFns.startOfMonth(date);
            const monthEnd = dateFns.endOfMonth(date);
            
            const monthTransactions = this.transactions.filter(t => {
                const transDate = new Date(t.date);
                return transDate >= monthStart && transDate <= monthEnd;
            });
            
            const income = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
                
            const expenses = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
            
            months.push(dateFns.format(date, 'MMM yyyy'));
            incomeData.push(income);
            expenseData.push(expenses);
        }
        
        const totalIncome = incomeData.reduce((a, b) => a + b, 0);
        const totalExpenses = expenseData.reduce((a, b) => a + b, 0);
        const avgIncome = totalIncome / 6;
        const avgExpenses = totalExpenses / 6;
        const avgSavingsRate = avgIncome > 0 ? ((avgIncome - avgExpenses) / avgIncome * 100) : 0;
        
        return { months, incomeData, expenseData, avgIncome, avgExpenses, avgSavingsRate };
    }

    renderIncomeExpenseReportChart(monthlyData) {
        const ctx = document.getElementById('incomeExpenseReportChart').getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.months,
                datasets: [
                    {
                        label: 'Income',
                        data: monthlyData.incomeData,
                        backgroundColor: 'rgba(39, 174, 96, 0.8)',
                        borderColor: '#27ae60',
                        borderWidth: 1
                    },
                    {
                        label: 'Expenses',
                        data: monthlyData.expenseData,
                        backgroundColor: 'rgba(231, 76, 60, 0.8)',
                        borderColor: '#e74c3c',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${this.formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    generateSpendingRecommendations(monthlyData) {
        const recommendations = [];
        const savingsRate = monthlyData.avgSavingsRate;
        
        if (savingsRate < 10) {
            recommendations.push('<li class="mb-2"><i class="bi bi-lightbulb text-warning me-2"></i>Consider reducing discretionary spending to increase savings rate</li>');
        }
        if (savingsRate > 20) {
            recommendations.push('<li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Great savings rate! Consider investment opportunities</li>');
        }
        if (monthlyData.avgExpenses > monthlyData.avgIncome * 0.8) {
            recommendations.push('<li class="mb-2"><i class="bi bi-exclamation-triangle text-danger me-2"></i>High expense-to-income ratio. Review recurring expenses</li>');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('<li class="mb-2"><i class="bi bi-info-circle text-primary me-2"></i>Your financial health appears stable. Continue monitoring</li>');
        }
        
        return recommendations.join('');
    }

    generateCategoryReport() {
        // Similar implementation for category report
        this.showToast('Category report generation would be implemented here', 'info');
    }

    generateTrendReport() {
        // Similar implementation for trend report
        this.showToast('Trend report generation would be implemented here', 'info');
    }

    // Spending pattern recognition
    analyzeSpendingPatterns() {
        const patterns = {
            highSpendingCategories: [],
            frequentTransactions: [],
            monthlyTrends: []
        };

        // Analyze category spending
        const categorySpending = {};
        this.transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
            });

        patterns.highSpendingCategories = Object.entries(categorySpending)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([category, amount]) => ({ category, amount }));

        return patterns;
    }
}

// Initialize the app
const app = new WealthCommand();

// Global function for Google Sign-In callback
function handleGoogleSignIn(response) {
    app.handleGoogleSignIn(response);
}

// Add transaction global function
function addTransaction() {
    app.addTransaction();
}

// Add budget global function
function addBudget() {
    app.addBudget();
}

// Report generation functions
function generateIncomeExpenseReport() {
    app.generateIncomeExpenseReport();
}

function generateCategoryReport() {
    app.generateCategoryReport();
}

function generateTrendReport() {
    app.generateTrendReport();
}
