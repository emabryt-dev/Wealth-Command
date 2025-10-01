// Wealth Command: Complete with Google Drive Sync, Monthly Rollover, and AI Analytics

// Import date-fns functions
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  addMonths, 
  addYears, 
  differenceInDays,
  isAfter,
  isBefore,
  isEqual,
  eachMonthOfInterval,
  subMonths,
  subYears,
  getYear,
  getMonth,
  getDate,
  isWithinInterval
} from 'https://cdn.jsdelivr.net/npm/date-fns/+esm';

// Initialize variables first
let transactions = loadTransactions();
let categories = loadCategories();
let currency = loadCurrency() || "PKR";
let currentCategoryFilter = 'all';
let mainChart = null;
let incomePieChart = null;
let expensePieChart = null;
let currentChartType = 'category';

// Analytics Charts
let overviewChart = null;
let healthTrendChart = null;
let categoryTrendChart = null;
let comparisonChart = null;

// Planner Data
let futureTransactions = loadFutureTransactions();
let plannerTimeframe = '1year';

// Debt Management Data
let loans = loadLoans();

// Enhanced Google Drive Sync with Two-Tier Backup System
const GOOGLE_DRIVE_FILE_NAME = 'wealth_command_data.json';
const GOOGLE_CLIENT_ID = '86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com';
let googleUser = null;
let googleAuth = null;
let isOnline = navigator.onLine;
let syncInProgress = false;
let pendingSync = false;
let lastBackupMonth = null;
let lastSyncTime = null;

// AI Analytics Engine
const AnalyticsEngine = {
    // Calculate financial health score (0-100)
    calculateHealthScore: function(transactions, monthlyBudgets) {
        if (transactions.length === 0) return 50; // Neutral score for no data
        
        const now = new Date();
        const threeMonthsAgo = subMonths(now, 3);
        
        // Get recent transactions (last 3 months)
        const recentTransactions = transactions.filter(tx => {
            const txDate = parseISO(tx.date);
            return isAfter(txDate, threeMonthsAgo) || isEqual(txDate, threeMonthsAgo);
        });
        
        if (recentTransactions.length === 0) return 50;
        
        const totalIncome = recentTransactions.filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpenses = recentTransactions.filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        // Component scores
        const savingsRate = totalIncome > 0 ? Math.max(0, (totalIncome - totalExpenses) / totalIncome) : 0;
        const savingsScore = Math.min(100, savingsRate * 200); // 50% savings rate = 100 points
        
        const expenseStability = this.calculateExpenseStability(recentTransactions);
        const stabilityScore = Math.min(100, expenseStability * 100);
        
        const incomeDiversity = this.calculateIncomeDiversity(recentTransactions);
        const diversityScore = Math.min(100, incomeDiversity * 100);
        
        const emergencyFundScore = this.calculateEmergencyFundScore(totalExpenses, monthlyBudgets);
        
        // Weighted final score
        const finalScore = 
            (savingsScore * 0.4) + 
            (stabilityScore * 0.3) + 
            (diversityScore * 0.2) + 
            (emergencyFundScore * 0.1);
        
        return Math.round(finalScore);
    },
    
    calculateExpenseStability: function(transactions) {
        const monthlyExpenses = {};
        transactions.forEach(tx => {
            if (tx.type === 'expense') {
                const month = format(parseISO(tx.date), 'yyyy-MM');
                monthlyExpenses[month] = (monthlyExpenses[month] || 0) + tx.amount;
            }
        });
        
        const amounts = Object.values(monthlyExpenses);
        if (amounts.length < 2) return 0.7; // Default stability
        
        const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - avg, 2), 0) / amounts.length;
        const stability = 1 - (Math.sqrt(variance) / avg);
        
        return Math.max(0, Math.min(1, stability));
    },
    
    calculateIncomeDiversity: function(transactions) {
        const incomeByCategory = {};
        const incomeTransactions = transactions.filter(tx => tx.type === 'income');
        
        if (incomeTransactions.length === 0) return 0;
        
        incomeTransactions.forEach(tx => {
            incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
        });
        
        const totalIncome = Object.values(incomeByCategory).reduce((a, b) => a + b, 0);
        const shares = Object.values(incomeByCategory).map(amount => amount / totalIncome);
        const diversity = 1 - shares.reduce((sum, share) => sum + Math.pow(share, 2), 0);
        
        return diversity;
    },
    
    calculateEmergencyFundScore: function(monthlyExpenses, monthlyBudgets) {
        const avgMonthlyExpense = monthlyExpenses / 3; // Based on last 3 months
        const currentMonth = getCurrentMonthKey();
        const currentBalance = monthlyBudgets[currentMonth]?.endingBalance || 0;
        
        if (avgMonthlyExpense === 0) return 50;
        
        const monthsCovered = currentBalance / avgMonthlyExpense;
        if (monthsCovered >= 6) return 100;
        if (monthsCovered >= 3) return 75;
        if (monthsCovered >= 1) return 50;
        return 25;
    },
    
    // Predict next month's spending
    predictNextMonthSpending: function(transactions) {
        const now = new Date();
        const sixMonthsAgo = subMonths(now, 6);
        
        const recentTransactions = transactions.filter(tx => {
            const txDate = parseISO(tx.date);
            return isAfter(txDate, sixMonthsAgo) || isEqual(txDate, sixMonthsAgo);
        });
        
        if (recentTransactions.length < 10) return null; // Insufficient data
        
        const monthlyExpenses = {};
        recentTransactions.forEach(tx => {
            if (tx.type === 'expense') {
                const month = format(parseISO(tx.date), 'yyyy-MM');
                monthlyExpenses[month] = (monthlyExpenses[month] || 0) + tx.amount;
            }
        });
        
        const amounts = Object.values(monthlyExpenses);
        const avgExpense = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        
        // Simple trend calculation
        let trend = 0;
        if (amounts.length >= 2) {
            const lastTwo = amounts.slice(-2);
            trend = (lastTwo[1] - lastTwo[0]) / lastTwo[0];
        }
        
        const prediction = avgExpense * (1 + trend * 0.5); // Conservative trend application
        const confidence = Math.min(0.9, amounts.length / 10); // More data = more confidence
        
        return {
            amount: Math.round(prediction),
            confidence: confidence,
            trend: trend
        };
    },
    
    // Generate AI insights
    generateInsights: function(transactions, monthlyBudgets) {
        const insights = [];
        const healthScore = this.calculateHealthScore(transactions, monthlyBudgets);
        const prediction = this.predictNextMonthSpending(transactions);
        
        // Health score insights
        if (healthScore >= 80) {
            insights.push({
                type: 'positive',
                message: 'Excellent financial health! Your spending habits are very sustainable.',
                icon: 'bi-emoji-smile'
            });
        } else if (healthScore >= 60) {
            insights.push({
                type: 'info',
                message: 'Good financial health. Small improvements could make it excellent.',
                icon: 'bi-emoji-neutral'
            });
        } else {
            insights.push({
                type: 'warning',
                message: 'Your financial health needs attention. Consider reviewing your spending patterns.',
                icon: 'bi-emoji-frown'
            });
        }
        
        // Savings rate insights
        const savingsRate = this.calculateSavingsRate(transactions);
        if (savingsRate >= 0.2) {
            insights.push({
                type: 'positive',
                message: `Great savings rate of ${(savingsRate * 100).toFixed(0)}%! You're building wealth effectively.`,
                icon: 'bi-piggy-bank'
            });
        } else if (savingsRate >= 0.1) {
            insights.push({
                type: 'info',
                message: `Decent savings rate of ${(savingsRate * 100).toFixed(0)}%. Aim for 20% for optimal wealth building.`,
                icon: 'bi-piggy-bank'
            });
        } else if (savingsRate < 0) {
            insights.push({
                type: 'warning',
                message: 'You\'re spending more than you earn. Consider reducing expenses or increasing income.',
                icon: 'bi-exclamation-triangle'
            });
        }
        
        // Spending pattern insights
        const categoryTrends = this.analyzeCategoryTrends(transactions);
        categoryTrends.forEach(trend => {
            if (trend.trend > 0.1) { // More than 10% increase
                insights.push({
                    type: 'warning',
                    message: `${trend.category} spending is trending up significantly.`,
                    icon: 'bi-graph-up-arrow'
                });
            } else if (trend.trend < -0.1) { // More than 10% decrease
                insights.push({
                    type: 'positive',
                    message: `Great job reducing ${trend.category} spending!`,
                    icon: 'bi-graph-down-arrow'
                });
            }
        });
        
        // Prediction insights
        if (prediction && prediction.confidence > 0.6) {
            insights.push({
                type: 'info',
                message: `Next month's predicted spending: ${prediction.amount.toLocaleString()} ${currency}`,
                icon: 'bi-magic'
            });
        }
        
        return insights.slice(0, 5); // Return top 5 insights
    },
    
    calculateSavingsRate: function(transactions) {
        const now = new Date();
        const threeMonthsAgo = subMonths(now, 3);
        
        const recentTransactions = transactions.filter(tx => {
            const txDate = parseISO(tx.date);
            return isAfter(txDate, threeMonthsAgo) || isEqual(txDate, threeMonthsAgo);
        });
        
        const totalIncome = recentTransactions.filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpenses = recentTransactions.filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        return totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;
    },
    
    analyzeCategoryTrends: function(transactions) {
        const now = new Date();
        const currentMonth = format(now, 'yyyy-MM');
        const lastMonth = subMonths(now, 1);
        const lastMonthKey = format(lastMonth, 'yyyy-MM');
        
        const currentMonthExpenses = {};
        const lastMonthExpenses = {};
        
        transactions.forEach(tx => {
            if (tx.type === 'expense') {
                const month = format(parseISO(tx.date), 'yyyy-MM');
                if (month === currentMonth) {
                    currentMonthExpenses[tx.category] = (currentMonthExpenses[tx.category] || 0) + tx.amount;
                } else if (month === lastMonthKey) {
                    lastMonthExpenses[tx.category] = (lastMonthExpenses[tx.category] || 0) + tx.amount;
                }
            }
        });
        
        const trends = [];
        Object.keys(currentMonthExpenses).forEach(category => {
            const current = currentMonthExpenses[category];
            const last = lastMonthExpenses[category] || current * 0.5; // Default if no last month data
            const trend = last > 0 ? (current - last) / last : 0;
            
            trends.push({
                category: category,
                current: current,
                last: last,
                trend: trend,
                change: current - last
            });
        });
        
        return trends.sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend)); // Sort by magnitude of change
    },
    
    // Generate heat map data
    generateHeatMap: function(transactions, year, month) {
        const targetDate = new Date(year, month - 1, 1);
        const daysInMonth = getDate(endOfMonth(targetDate));
        const heatMap = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = format(new Date(year, month - 1, day), 'yyyy-MM-dd');
            const dayTransactions = transactions.filter(tx => tx.date === dateStr && tx.type === 'expense');
            const total = dayTransactions.reduce((sum, tx) => sum + tx.amount, 0);
            
            heatMap.push({
                day: day,
                date: dateStr,
                amount: total,
                transactions: dayTransactions.length
            });
        }
        
        return heatMap;
    },
    
    // Compare periods
    comparePeriods: function(transactions, period1, period2, type) {
        const data1 = this.getPeriodData(transactions, period1, type);
        const data2 = this.getPeriodData(transactions, period2, type);
        
        const comparison = {};
        const allCategories = [...new Set([...Object.keys(data1), ...Object.keys(data2)])];
        
        allCategories.forEach(category => {
            const amount1 = data1[category] || 0;
            const amount2 = data2[category] || 0;
            const change = amount2 - amount1;
            const percentChange = amount1 > 0 ? (change / amount1) * 100 : (amount2 > 0 ? 100 : 0);
            
            comparison[category] = {
                period1: amount1,
                period2: amount2,
                change: change,
                percentChange: percentChange
            };
        });
        
        return comparison;
    },
    
    getPeriodData: function(transactions, period, type) {
        const data = {};
        
        transactions.forEach(tx => {
            if (tx.type === 'expense') {
                let include = false;
                
                if (type === 'month') {
                    const txMonth = format(parseISO(tx.date), 'yyyy-MM');
                    include = txMonth === period;
                } else if (type === 'year') {
                    const txYear = format(parseISO(tx.date), 'yyyy');
                    include = txYear === period;
                }
                
                if (include) {
                    data[tx.category] = (data[tx.category] || 0) + tx.amount;
                }
            }
        });
        
        return data;
    }
};

// Planner Engine
const PlannerEngine = {
    calculateProjections: function(futureTransactions, timeframe, currentBalance) {
        const projections = {
            months: [],
            summary: {
                totalIncome: 0,
                totalExpenses: 0,
                netWealth: currentBalance,
                endingBalance: currentBalance
            }
        };
        
        const now = new Date();
        const months = timeframe === '1year' ? 12 : timeframe === '2years' ? 24 : 36;
        
        let runningBalance = currentBalance;
        
        for (let i = 0; i < months; i++) {
            const currentDate = addMonths(now, i);
            const monthKey = format(currentDate, 'yyyy-MM');
            const monthName = format(currentDate, 'MMMM yyyy');
            
            let monthIncome = 0;
            let monthExpenses = 0;
            
            // Calculate income for this month
            futureTransactions.income.forEach(income => {
                if (this.shouldIncludeInMonth(income, currentDate)) {
                    monthIncome += income.amount;
                }
            });
            
            // Calculate expenses for this month
            futureTransactions.expenses.forEach(expense => {
                if (this.shouldIncludeInMonth(expense, currentDate)) {
                    monthExpenses += expense.amount;
                }
            });
            
            runningBalance += monthIncome - monthExpenses;
            
            projections.months.push({
                month: monthKey,
                name: monthName,
                income: monthIncome,
                expenses: monthExpenses,
                net: monthIncome - monthExpenses,
                balance: runningBalance
            });
            
            projections.summary.totalIncome += monthIncome;
            projections.summary.totalExpenses += monthExpenses;
        }
        
        projections.summary.netWealth = projections.summary.totalIncome - projections.summary.totalExpenses;
        projections.summary.endingBalance = runningBalance;
        
        return projections;
    },
    
    shouldIncludeInMonth: function(transaction, targetDate) {
        const startDate = parseISO(transaction.startDate);
        const targetMonthStart = startOfMonth(targetDate);
        const targetMonthEnd = endOfMonth(targetDate);
        
        // If transaction starts after target month, exclude
        if (isAfter(startDate, targetMonthEnd)) {
            return false;
        }
        
        // Check end date if exists
        if (transaction.endDate) {
            const endDate = parseISO(transaction.endDate);
            if (isBefore(endDate, targetMonthStart)) {
                return false;
            }
        }
        
        // Check frequency
        if (transaction.frequency === 'one-time') {
            return isWithinInterval(startDate, { start: targetMonthStart, end: targetMonthEnd });
        } else if (transaction.frequency === 'monthly') {
            return true; // Include every month
        } else if (transaction.frequency === 'quarterly') {
            const monthsDiff = differenceInDays(targetDate, startDate) / 30;
            return Math.floor(monthsDiff) % 3 === 0;
        }
        
        return false;
    }
};

// Debt Management Engine
const DebtEngine = {
    calculateDebtSummary: function(loans) {
        const totalGiven = loans.given.reduce((sum, loan) => sum + (loan.amount - this.getPaidAmount(loan)), 0);
        const totalTaken = loans.taken.reduce((sum, loan) => sum + (loan.amount - this.getPaidAmount(loan)), 0);
        
        const upcomingRepayments = [...loans.given, ...loans.taken]
            .filter(loan => loan.status !== 'completed')
            .sort((a, b) => {
                const dateA = parseISO(a.expectedReturn || a.dueDate);
                const dateB = parseISO(b.expectedReturn || b.dueDate);
                return dateA - dateB;
            })
            .slice(0, 5);
        
        return {
            totalGiven,
            totalTaken,
            netPosition: totalGiven - totalTaken,
            upcomingRepayments
        };
    },
    
    getPaidAmount: function(loan) {
        return loan.payments ? loan.payments.reduce((sum, payment) => sum + payment.amount, 0) : 0;
    },
    
    getLoanStatus: function(loan) {
        const paid = this.getPaidAmount(loan);
        const dueDate = parseISO(loan.expectedReturn || loan.dueDate);
        const today = new Date();
        
        if (paid >= loan.amount) return 'completed';
        if (isBefore(dueDate, today)) return 'overdue';
        if (paid > 0) return 'partially_paid';
        return 'pending';
    },
    
    addPayment: function(loan, amount, date) {
        if (!loan.payments) loan.payments = [];
        loan.payments.push({
            date: date || format(new Date(), 'yyyy-MM-dd'),
            amount: amount
        });
        
        // Update status
        loan.status = this.getLoanStatus(loan);
    }
};

// Helper function to get monthly backup filename
function getMonthlyBackupFileName() {
    const now = new Date();
    return `wealth_command_backup_${format(now, 'yyyy-MM')}.json`;
}

// Enhanced Monthly Rollover System
function loadMonthlyBudgets() {
    try {
        const budgets = JSON.parse(localStorage.getItem('monthlyBudgets')) || {};
        ensureAllMonthsHaveBudgets(budgets);
        return budgets;
    } catch {
        const budgets = {};
        ensureAllMonthsHaveBudgets(budgets);
        localStorage.setItem('monthlyBudgets', JSON.stringify(budgets));
        return budgets;
    }
}

function ensureAllMonthsHaveBudgets(budgets) {
    // Get all unique months from transactions
    const transactionMonths = [...new Set(transactions.map(tx => getMonthKeyFromDate(tx.date)))];
    
    // Add current month if no transactions exist
    const currentMonth = getCurrentMonthKey();
    if (!transactionMonths.includes(currentMonth)) {
        transactionMonths.push(currentMonth);
    }
    
    // Ensure each month has a budget entry
    transactionMonths.forEach(month => {
        if (!budgets[month]) {
            budgets[month] = {
                startingBalance: 0,
                income: 0,
                expenses: 0,
                endingBalance: 0,
                autoRollover: true,
                allowNegative: false
            };
        }
    });
    
    // Sort months chronologically
    const sortedMonths = Object.keys(budgets).sort();
    const sortedBudgets = {};
    sortedMonths.forEach(month => {
        sortedBudgets[month] = budgets[month];
    });
    
    return sortedBudgets;
}

function getCurrentMonthKey() {
    return format(new Date(), 'yyyy-MM');
}

let monthlyBudgets = loadMonthlyBudgets();

function saveMonthlyBudgets(budgets) {
    monthlyBudgets = ensureAllMonthsHaveBudgets(budgets);
    localStorage.setItem('monthlyBudgets', JSON.stringify(monthlyBudgets));
    autoSyncToDrive();
}

function getMonthKeyFromDate(dateString) {
    try {
        const date = parseISO(dateString);
        if (isNaN(date)) return getCurrentMonthKey();
        return format(date, 'yyyy-MM');
    } catch {
        return getCurrentMonthKey();
    }
}

function calculateMonthlyRollover() {
    console.log('Calculating monthly rollover...');
    
    // Ensure all months have budget entries
    monthlyBudgets = ensureAllMonthsHaveBudgets(monthlyBudgets);
    
    const months = Object.keys(monthlyBudgets).sort();
    console.log('Processing months:', months);
    
    // First pass: Calculate income and expenses for each month
    months.forEach(month => {
        const monthData = monthlyBudgets[month];
        const monthTransactions = transactions.filter(tx => 
            getMonthKeyFromDate(tx.date) === month
        );
        
        monthData.income = monthTransactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
            
        monthData.expenses = monthTransactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
            
        console.log(`Month ${month}: Income=${monthData.income}, Expenses=${monthData.expenses}`);
    });
    
    // Second pass: Calculate ending balances and rollovers
    for (let i = 0; i < months.length; i++) {
        const currentMonth = months[i];
        const monthData = monthlyBudgets[currentMonth];
        
        monthData.endingBalance = monthData.startingBalance + monthData.income - monthData.expenses;
        
        // Roll over to next month if auto-rollover is enabled
        if (monthData.autoRollover && i < months.length - 1) {
            const nextMonth = months[i + 1];
            if (monthData.endingBalance >= 0 || monthData.allowNegative) {
                monthlyBudgets[nextMonth].startingBalance = monthData.endingBalance;
            } else {
                monthlyBudgets[nextMonth].startingBalance = 0;
            }
            console.log(`Rollover from ${currentMonth} to ${nextMonth}: ${monthlyBudgets[nextMonth].startingBalance}`);
        }
    }
    
    saveMonthlyBudgets(monthlyBudgets);
    console.log('Rollover calculation completed');
}

function updateRolloverDisplay() {
    const rolloverElement = document.getElementById('rolloverBalance');
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
    
    const selectedMonth = monthSel.value;
    const selectedYear = yearSel.value;
    
    if (selectedMonth === 'all' || selectedYear === 'all') {
        rolloverElement.classList.add('d-none');
        return;
    }
    
    const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const monthData = monthlyBudgets[monthKey];
    
    if (!monthData || monthData.startingBalance === 0) {
        rolloverElement.classList.add('d-none');
        return;
    }
    
    rolloverElement.classList.remove('d-none');
    
    if (monthData.startingBalance > 0) {
        rolloverElement.classList.add('rollover-positive');
        rolloverElement.classList.remove('rollover-negative');
    } else if (monthData.startingBalance < 0) {
        rolloverElement.classList.add('rollover-negative');
        rolloverElement.classList.remove('rollover-positive');
    } else {
        rolloverElement.classList.remove('rollover-positive', 'rollover-negative');
    }
    
    document.getElementById('rolloverAmount').textContent = 
        `${monthData.startingBalance >= 0 ? '+' : ''}${monthData.startingBalance.toLocaleString()} ${currency}`;
    
    const prevMonth = getPreviousMonth(monthKey);
    document.getElementById('rolloverDescription').textContent = 
        `Carried over from ${prevMonth}`;
}

function getPreviousMonth(monthKey) {
    const date = parseISO(monthKey + '-01');
    const prevMonth = subMonths(date, 1);
    return format(prevMonth, 'yyyy-MM');
}

function toggleRolloverSettings() {
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
    
    if (monthSel.value === 'all' || yearSel.value === 'all') {
        showToast('Please select a specific month to adjust rollover settings', 'warning');
        return;
    }
    
    const monthKey = `${yearSel.value}-${String(monthSel.value).padStart(2, '0')}`;
    const monthData = monthlyBudgets[monthKey];
    
    if (monthData) {
        const newBalance = prompt('Adjust starting balance:', monthData.startingBalance);
        if (newBalance !== null && !isNaN(parseFloat(newBalance))) {
            monthData.startingBalance = parseFloat(newBalance);
            saveMonthlyBudgets(monthlyBudgets);
            calculateMonthlyRollover();
            updateUI();
            showToast('Starting balance updated', 'success');
        }
    }
}

// Enhanced Toast System for important messages only
function showToast(message, type = 'info', duration = 4000) {
    // Only show critical toasts, use status icons for sync messages
    if (type === 'info' && message.includes('sync') || message.includes('Sync')) {
        updateSyncStatus(type, message);
        return;
    }
    
    const toastContainer = document.getElementById('toastContainer');
    const toastId = 'toast-' + Date.now();
    
    const icons = {
        success: 'bi-check-circle-fill',
        info: 'bi-info-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        danger: 'bi-x-circle-fill'
    };
    
    const toastHTML = `
        <div id="${toastId}" class="toast toast-${type}" role="alert">
            <div class="toast-body">
                <div class="d-flex align-items-center">
                    <i class="bi ${icons[type]} me-2 text-${type}"></i>
                    <span class="flex-grow-1">${message}</span>
                    <button type="button" class="btn-close ms-2" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-progress"></div>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    const bsToast = new bootstrap.Toast(toastElement, { delay: duration });
    
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
    
    bsToast.show();
}

// Sync Status Icon System
function updateSyncStatus(status, message = '') {
    const syncIcon = document.getElementById('syncStatusIcon');
    const syncTooltip = document.getElementById('syncStatusTooltip');
    
    if (!syncIcon) return;
    
    // Remove all existing classes
    syncIcon.className = 'bi';
    
    switch (status) {
        case 'success':
            syncIcon.classList.add('bi-cloud-check', 'text-success');
            syncTooltip.textContent = message || `Synced ${lastSyncTime ? format(parseISO(lastSyncTime), 'pp') : 'just now'}`;
            break;
        case 'info':
        case 'syncing':
            syncIcon.classList.add('bi-cloud-arrow-up', 'text-info', 'pulse');
            syncTooltip.textContent = message || 'Syncing...';
            break;
        case 'warning':
            syncIcon.classList.add('bi-cloud-slash', 'text-warning');
            syncTooltip.textContent = message || 'Offline - changes will sync when online';
            break;
        case 'danger':
        case 'error':
            syncIcon.classList.add('bi-cloud-x', 'text-danger');
            syncTooltip.textContent = message || 'Sync failed';
            break;
        case 'offline':
            syncIcon.classList.add('bi-cloud-slash', 'text-muted');
            syncTooltip.textContent = message || 'Offline';
            break;
        default:
            syncIcon.classList.add('bi-cloud', 'text-muted');
            syncTooltip.textContent = message || 'Not signed in';
    }
}

function showSyncStatus(message, type) {
    updateSyncStatus(type, message);
    // Only show toast for errors
    if (type === 'danger' || type === 'warning') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer.querySelector('.toast')) {
            showToast(message, type, 5000);
        }
    }
}

// Enhanced Google Auth with better error handling
function initGoogleAuth() {
    if (!window.google) {
        console.error('Google API not loaded');
        showSyncStatus('error', 'Google authentication not available');
        return;
    }
    
    try {
        googleAuth = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: async (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    googleUser = {
                        access_token: tokenResponse.access_token,
                        expires_in: tokenResponse.expires_in,
                        acquired_at: Date.now()
                    };
                    
                    localStorage.setItem('googleUser', JSON.stringify(googleUser));
                    showSyncStatus('success', 'Google Drive connected!');
                    updateProfileUI();
                    
                    // Auto-load data from Drive after sign-in
                    const success = await loadDataFromDrive();
                    if (!success) {
                        // If load fails, sync local data to Drive
                        await syncDataToDrive();
                    }
                }
            },
            error_callback: (error) => {
                console.error('Google Auth error:', error);
                if (error.type === 'user_logged_out') {
                    googleUser = null;
                    localStorage.removeItem('googleUser');
                    updateProfileUI();
                    showSyncStatus('offline', 'Signed out from Google Drive');
                } else {
                    showSyncStatus('error', 'Google Sign-In failed');
                }
            }
        });
    } catch (error) {
        console.error('Error initializing Google Auth:', error);
        showSyncStatus('error', 'Failed to initialize Google authentication');
    }
}

// Profile Picture and Google Sign-In Functions
function showGoogleSignIn() {
    if (googleAuth) {
        googleAuth.requestAccessToken();
    } else {
        initGoogleAuth();
        setTimeout(() => {
            if (googleAuth) {
                googleAuth.requestAccessToken();
            }
        }, 500);
    }
}

function updateProfileUI() {
    const profilePicture = document.getElementById('profilePicture');
    const signedInUser = document.getElementById('signedInUser');
    const userEmail = document.getElementById('userEmail');
    const signInOption = document.getElementById('signInOption');
    const signOutOption = document.getElementById('signOutOption');
    const syncStatusText = document.getElementById('syncStatusText');
    
    if (googleUser && googleUser.access_token) {
        profilePicture.innerHTML = `<i class="bi bi-cloud-check-fill profile-icon"></i>`;
        signedInUser.classList.remove('d-none');
        userEmail.textContent = 'Connected to Google Drive';
        signInOption.classList.add('d-none');
        signOutOption.classList.remove('d-none');
        
        if (syncStatusText) {
            syncStatusText.textContent = 'Synced with Google Drive';
        }
        showSyncStatus('success', 'Connected to Google Drive');
    } else {
        profilePicture.innerHTML = `<i class="bi bi-person-circle profile-icon"></i>`;
        signedInUser.classList.add('d-none');
        signInOption.classList.remove('d-none');
        signOutOption.classList.add('d-none');
        
        if (syncStatusText) {
            syncStatusText.textContent = 'Sign in to sync with Google Drive';
        }
        showSyncStatus('offline', 'Sign in to sync with Google Drive');
    }
}

// Enhanced data loading from Google Drive
async function loadDataFromDrive() {
    if (!googleUser || !googleUser.access_token) {
        showSyncStatus('offline', 'Not authenticated with Google Drive');
        return false;
    }
    
    if (!isOnline) {
        showSyncStatus('warning', 'Cannot load: You are offline');
        return false;
    }
    
    // Check if token is expired
    if (isTokenExpired(googleUser)) {
        showSyncStatus('warning', 'Session expired. Please sign in again.');
        googleSignOut();
        return false;
    }
    
    try {
        showSyncStatus('syncing', 'Loading data from Google Drive...');
        
        // Search for the main sync file
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${GOOGLE_DRIVE_FILE_NAME}' and trashed=false&fields=files(id,name,modifiedTime)`,
            {
                headers: {
                    'Authorization': `Bearer ${googleUser.access_token}`
                }
            }
        );
        
        if (searchResponse.status === 401) {
            showSyncStatus('warning', 'Authentication expired. Please sign in again.');
            googleSignOut();
            return false;
        }
        
        if (!searchResponse.ok) {
            throw new Error(`Drive API error: ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        
        if (searchData.files && searchData.files.length > 0) {
            const file = searchData.files[0];
            const fileResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
                {
                    headers: {
                        'Authorization': `Bearer ${googleUser.access_token}`
                    }
                }
            );
            
            if (!fileResponse.ok) {
                throw new Error(`File download error: ${fileResponse.status}`);
            }
            
            const driveData = await fileResponse.json();
            
            // Validate and load data
            if (driveData.transactions && Array.isArray(driveData.transactions)) {
                transactions = driveData.transactions;
                localStorage.setItem('transactions', JSON.stringify(transactions));
            }
            
            if (driveData.categories && Array.isArray(driveData.categories)) {
                categories = driveData.categories;
                localStorage.setItem('categories', JSON.stringify(categories));
            }
            
            if (driveData.monthlyBudgets && typeof driveData.monthlyBudgets === 'object') {
                monthlyBudgets = driveData.monthlyBudgets;
                localStorage.setItem('monthlyBudgets', JSON.stringify(monthlyBudgets));
            }
            
            if (driveData.futureTransactions && typeof driveData.futureTransactions === 'object') {
                futureTransactions = driveData.futureTransactions;
                localStorage.setItem('futureTransactions', JSON.stringify(futureTransactions));
            }
            
            if (driveData.loans && typeof driveData.loans === 'object') {
                loans = driveData.loans;
                localStorage.setItem('loans', JSON.stringify(loans));
            }
            
            if (driveData.currency) {
                currency = driveData.currency;
                localStorage.setItem('currency', currency);
            }
            
            lastSyncTime = new Date().toISOString();
            localStorage.setItem('lastSyncTime', lastSyncTime);
            
            showSyncStatus('success', 'Data loaded from Google Drive!');
            updateUI();
            return true;
        } else {
            showSyncStatus('info', 'No existing data found on Google Drive');
            return false;
        }
    } catch (error) {
        console.error('Error loading from Google Drive:', error);
        showSyncStatus('error', `Failed to load: ${error.message}`);
        return false;
    }
}

// Enhanced data syncing to Google Drive
async function syncDataToDrive() {
    if (!googleUser || !googleUser.access_token) {
        showSyncStatus('offline', 'Not authenticated with Google Drive');
        return false;
    }
    
    if (!isOnline) {
        showSyncStatus('warning', 'Cannot sync: You are offline');
        return false;
    }
    
    // Check if token is expired
    if (isTokenExpired(googleUser)) {
        showSyncStatus('warning', 'Session expired. Please sign in again.');
        googleSignOut();
        return false;
    }
    
    if (syncInProgress) {
        pendingSync = true;
        showSyncStatus('syncing', 'Sync already in progress...');
        return false;
    }
    
    syncInProgress = true;
    showSyncStatus('syncing', 'Syncing to Google Drive...');
    
    try {
        // Prepare data for sync
        const syncData = {
            transactions,
            categories,
            monthlyBudgets,
            futureTransactions,
            loans,
            currency,
            lastSync: new Date().toISOString(),
            appVersion: '2.0.0'
        };
        
        // Search for existing file
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${GOOGLE_DRIVE_FILE_NAME}' and trashed=false&fields=files(id)`,
            {
                headers: {
                    'Authorization': `Bearer ${googleUser.access_token}`
                }
            }
        );
        
        if (searchResponse.status === 401) {
            showSyncStatus('warning', 'Authentication expired. Please sign in again.');
            googleSignOut();
            syncInProgress = false;
            return false;
        }
        
        if (!searchResponse.ok) {
            throw new Error(`Drive API error: ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        let fileId = searchData.files && searchData.files.length > 0 ? searchData.files[0].id : null;
        
        const uploadUrl = fileId 
            ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        
        const method = fileId ? 'PATCH' : 'POST';
        
        const metadata = {
            name: GOOGLE_DRIVE_FILE_NAME,
            mimeType: 'application/json'
        };
        
        if (!fileId) {
            metadata.parents = ['root'];
        }
        
        const boundary = '-------' + Date.now().toString(16);
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        
        const contentType = 'application/json';
        const metadataPart = 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata);
        const dataPart = 'Content-Type: ' + contentType + '\r\n\r\n' + JSON.stringify(syncData);
        
        const multipartRequestBody = delimiter + metadataPart + delimiter + dataPart + close_delim;
        
        const uploadResponse = await fetch(uploadUrl, {
            method: method,
            headers: {
                'Authorization': `Bearer ${googleUser.access_token}`,
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body: multipartRequestBody
        });
        
        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.status}`);
        }
        
        lastSyncTime = new Date().toISOString();
        localStorage.setItem('lastSyncTime', lastSyncTime);
        
        showSyncStatus('success', 'Data synced to Google Drive!');
        syncInProgress = false;
        
        // Create monthly backup
        await createMonthlyBackup();
        
        // Process pending sync if any
        if (pendingSync) {
            pendingSync = false;
            setTimeout(syncDataToDrive, 1000);
        }
        
        return true;
    } catch (error) {
        console.error('Error syncing to Google Drive:', error);
        showSyncStatus('error', `Sync failed: ${error.message}`);
        syncInProgress = false;
        return false;
    }
}

// Create monthly backup
async function createMonthlyBackup() {
    if (!googleUser || !googleUser.access_token) return;
    
    const currentMonth = getCurrentMonthKey();
    if (lastBackupMonth === currentMonth) return; // Already backed up this month
    
    try {
        const backupData = {
            transactions,
            categories,
            monthlyBudgets,
            futureTransactions,
            loans,
            currency,
            backupDate: new Date().toISOString(),
            appVersion: '2.0.0'
        };
        
        const backupFileName = getMonthlyBackupFileName();
        
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${backupFileName}' and trashed=false&fields=files(id)`,
            {
                headers: {
                    'Authorization': `Bearer ${googleUser.access_token}`
                }
            }
        );
        
        if (!searchResponse.ok) return;
        
        const searchData = await searchResponse.json();
        let fileId = searchData.files && searchData.files.length > 0 ? searchData.files[0].id : null;
        
        const uploadUrl = fileId 
            ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        
        const method = fileId ? 'PATCH' : 'POST';
        
        const metadata = {
            name: backupFileName,
            mimeType: 'application/json'
        };
        
        if (!fileId) {
            metadata.parents = ['root'];
        }
        
        const boundary = '-------' + Date.now().toString(16);
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        
        const contentType = 'application/json';
        const metadataPart = 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata);
        const dataPart = 'Content-Type: ' + contentType + '\r\n\r\n' + JSON.stringify(backupData);
        
        const multipartRequestBody = delimiter + metadataPart + delimiter + dataPart + close_delim;
        
        await fetch(uploadUrl, {
            method: method,
            headers: {
                'Authorization': `Bearer ${googleUser.access_token}`,
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body: multipartRequestBody
        });
        
        lastBackupMonth = currentMonth;
        localStorage.setItem('lastBackupMonth', lastBackupMonth);
        
        console.log('Monthly backup created:', backupFileName);
    } catch (error) {
        console.error('Error creating backup:', error);
    }
}

function isTokenExpired(user) {
    if (!user.acquired_at || !user.expires_in) return true;
    const elapsed = (Date.now() - user.acquired_at) / 1000;
    return elapsed >= user.expires_in - 60; // 60 seconds buffer
}

function googleSignOut() {
    if (googleUser && googleUser.access_token) {
        google.accounts.oauth2.revoke(googleUser.access_token, () => {
            console.log('Token revoked');
        });
    }
    
    googleUser = null;
    localStorage.removeItem('googleUser');
    updateProfileUI();
    showSyncStatus('offline', 'Signed out from Google Drive');
}

// Auto-sync function
function autoSyncToDrive() {
    if (googleUser && googleUser.access_token && isOnline && !syncInProgress) {
        setTimeout(syncDataToDrive, 1000); // Delay to avoid too frequent syncs
    }
}

// Network status detection
function updateOnlineStatus() {
    isOnline = navigator.onLine;
    if (isOnline) {
        showSyncStatus('success', 'Back online - syncing changes...');
        autoSyncToDrive();
    } else {
        showSyncStatus('warning', 'You are currently offline');
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Load initial data
function loadTransactions() {
    try {
        return JSON.parse(localStorage.getItem('transactions')) || [];
    } catch {
        return [];
    }
}

function loadCategories() {
    try {
        return JSON.parse(localStorage.getItem('categories')) || [
            { id: 'salary', name: 'Salary', type: 'income', color: '#28a745' },
            { id: 'freelance', name: 'Freelance', type: 'income', color: '#20c997' },
            { id: 'investment', name: 'Investment', type: 'income', color: '#17a2b8' },
            { id: 'food', name: 'Food & Dining', type: 'expense', color: '#dc3545' },
            { id: 'transport', name: 'Transport', type: 'expense', color: '#fd7e14' },
            { id: 'shopping', name: 'Shopping', type: 'expense', color: '#e83e8c' },
            { id: 'entertainment', name: 'Entertainment', type: 'expense', color: '#6f42c1' },
            { id: 'bills', name: 'Bills & Utilities', type: 'expense', color: '#007bff' },
            { id: 'healthcare', name: 'Healthcare', type: 'expense', color: '#6c757d' }
        ];
    } catch {
        return [
            { id: 'salary', name: 'Salary', type: 'income', color: '#28a745' },
            { id: 'freelance', name: 'Freelance', type: 'income', color: '#20c997' },
            { id: 'investment', name: 'Investment', type: 'income', color: '#17a2b8' },
            { id: 'food', name: 'Food & Dining', type: 'expense', color: '#dc3545' },
            { id: 'transport', name: 'Transport', type: 'expense', color: '#fd7e14' },
            { id: 'shopping', name: 'Shopping', type: 'expense', color: '#e83e8c' },
            { id: 'entertainment', name: 'Entertainment', type: 'expense', color: '#6f42c1' },
            { id: 'bills', name: 'Bills & Utilities', type: 'expense', color: '#007bff' },
            { id: 'healthcare', name: 'Healthcare', type: 'expense', color: '#6c757d' }
        ];
    }
}

function loadCurrency() {
    return localStorage.getItem('currency');
}

function loadFutureTransactions() {
    try {
        return JSON.parse(localStorage.getItem('futureTransactions')) || {
            income: [],
            expenses: []
        };
    } catch {
        return {
            income: [],
            expenses: []
        };
    }
}

function loadLoans() {
    try {
        return JSON.parse(localStorage.getItem('loans')) || {
            given: [],
            taken: []
        };
    } catch {
        return {
            given: [],
            taken: []
        };
    }
}

// Initialize Google Auth when the app loads
document.addEventListener('DOMContentLoaded', function() {
    // Load saved Google user
    const savedUser = localStorage.getItem('googleUser');
    if (savedUser) {
        try {
            googleUser = JSON.parse(savedUser);
            if (isTokenExpired(googleUser)) {
                googleUser = null;
                localStorage.removeItem('googleUser');
            }
        } catch {
            googleUser = null;
            localStorage.removeItem('googleUser');
        }
    }
    
    updateProfileUI();
    
    // Initialize Google Auth
    if (window.google) {
        initGoogleAuth();
    } else {
        // Load Google API if not already loaded
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initGoogleAuth;
        document.head.appendChild(script);
    }
    
    // Initial sync check
    if (googleUser && googleUser.access_token && isOnline) {
        setTimeout(() => {
            loadDataFromDrive().then(success => {
                if (!success) {
                    syncDataToDrive();
                }
            });
        }, 2000);
    }
    
    // Initial rollover calculation
    calculateMonthlyRollover();
});

// Export functions for global access
window.showGoogleSignIn = showGoogleSignIn;
window.googleSignOut = googleSignOut;
window.syncDataToDrive = syncDataToDrive;
window.loadDataFromDrive = loadDataFromDrive;
window.toggleRolloverSettings = toggleRolloverSettings;
