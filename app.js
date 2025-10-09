// Wealth Command: Complete with Google Drive Sync, Monthly Rollover, and AI Analytics
// Updated with new color palette and enhanced styling

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

// Custom Color Palette
const colorPalette = {
  primary: '#4361EE',
  deepPurple: '#7209B7',
  emeraldGreen: '#10B981',
  teal: '#06D6A0',
  coralRed: '#EF476F',
  sunsetOrange: '#FF9E6D',
  electricBlue: '#4361EE',
  violet: '#7209B7'
};

// AI Analytics Engine
const AnalyticsEngine = {
    // Calculate financial health score (0-100)
    calculateHealthScore: function(transactions, monthlyBudgets) {
        if (transactions.length === 0) return 50; // Neutral score for no data
        
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        
        // Get recent transactions (last 3 months)
        const recentTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= threeMonthsAgo;
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
                const month = tx.date.substring(0, 7); // YYYY-MM
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
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        
        const recentTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= sixMonthsAgo;
        });
        
        if (recentTransactions.length < 10) return null; // Insufficient data
        
        const monthlyExpenses = {};
        recentTransactions.forEach(tx => {
            if (tx.type === 'expense') {
                const month = tx.date.substring(0, 7);
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
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        
        const recentTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= threeMonthsAgo;
        });
        
        const totalIncome = recentTransactions.filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpenses = recentTransactions.filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        return totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;
    },
    
    analyzeCategoryTrends: function(transactions) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        
        const currentMonthExpenses = {};
        const lastMonthExpenses = {};
        
        transactions.forEach(tx => {
            if (tx.type === 'expense') {
                const month = tx.date.substring(0, 7);
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
        const daysInMonth = new Date(year, month, 0).getDate();
        const heatMap = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
                    const txMonth = tx.date.substring(0, 7);
                    include = txMonth === period;
                } else if (type === 'year') {
                    const txYear = tx.date.substring(0, 4);
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
            const currentDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            const monthName = currentDate.toLocaleDateString('en', { month: 'long', year: 'numeric' });
            
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
        
        projections.summary.endingBalance = runningBalance;
        projections.summary.netWealth = currentBalance + projections.summary.totalIncome - projections.summary.totalExpenses;
        
        return projections;
    },
    
    shouldIncludeInMonth: function(futureTransaction, monthDate) {
        const startDate = new Date(futureTransaction.startDate);
        const endDate = futureTransaction.endDate ? new Date(futureTransaction.endDate) : null;
        
        // Check if transaction starts before or in this month
        if (startDate > monthDate) return false;
        
        // Check if transaction has ended
        if (endDate && endDate < monthDate) return false;
        
        // Check frequency
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        
        switch (futureTransaction.frequency) {
            case 'one-time':
                return startDate >= monthStart && startDate <= monthEnd;
                
            case 'monthly':
                return true; // Include in every month after start date
                
            case 'quarterly':
                const monthsDiff = (monthDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                 (monthDate.getMonth() - startDate.getMonth());
                return monthsDiff >= 0 && monthsDiff % 3 === 0;
                
            default:
                return false;
        }
    }
};

// Debt Management Engine
const DebtEngine = {
    calculateDebtSummary: function(loans) {
        const summary = {
            totalGiven: 0,
            totalTaken: 0,
            netPosition: 0,
            upcomingCount: 0
        };
        
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        loans.forEach(loan => {
            if (loan.type === 'given') {
                summary.totalGiven += loan.amount;
                summary.netPosition += loan.amount;
                
                // Check for upcoming repayments
                if (loan.expectedReturn && new Date(loan.expectedReturn) <= thirtyDaysFromNow) {
                    summary.upcomingCount++;
                }
            } else if (loan.type === 'taken') {
                summary.totalTaken += loan.amount;
                summary.netPosition -= loan.amount;
                
                // Check for upcoming repayments
                if (loan.dueDate && new Date(loan.dueDate) <= thirtyDaysFromNow) {
                    summary.upcomingCount++;
                }
            }
        });
        
        return summary;
    },
    
    getUpcomingRepayments: function(loans) {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        return loans.filter(loan => {
            const dueDate = loan.type === 'given' ? loan.expectedReturn : loan.dueDate;
            return dueDate && new Date(dueDate) <= thirtyDaysFromNow && new Date(dueDate) >= now;
        }).sort((a, b) => {
            const dateA = new Date(a.type === 'given' ? a.expectedReturn : a.dueDate);
            const dateB = new Date(b.type === 'given' ? b.expectedReturn : b.dueDate);
            return dateA - dateB;
        });
    }
};

// Enhanced initialization with analytics
function initApp() {
    console.log('Initializing Wealth Command...');
    
    // Initialize Google Sign-In
    initGoogleSignIn();
    
    // Load data from localStorage
    loadAllData();
    
    // Initialize UI components
    initUI();
    
    // Initialize charts
    initCharts();
    
    // Update dashboard
    updateDashboard();
    
    // Check for monthly rollover
    checkMonthlyRollover();
    
    // Initialize analytics
    updateAnalytics();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check sync status
    updateSyncStatus();
    
    console.log('Wealth Command initialized successfully');
}

// Initialize Google Sign-In
function initGoogleSignIn() {
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleSignIn,
        auto_select: false
    });
    
    // Render the Google Sign-In button
    google.accounts.id.renderButton(
        document.getElementById('googleSignInButton'),
        { theme: 'outline', size: 'large', width: '240' }
    );
    
    // Check if user is already signed in
    const token = localStorage.getItem('google_token');
    if (token) {
        // Verify token and set user
        verifyGoogleToken(token);
    }
}

// Handle Google Sign-In
function handleGoogleSignIn(response) {
    const token = response.credential;
    localStorage.setItem('google_token', token);
    verifyGoogleToken(token);
    $('#googleSignInModal').modal('hide');
    showToast('Signed in successfully!', 'success');
    updateSyncStatus();
}

// Verify Google Token and get user info
function verifyGoogleToken(token) {
    // In a real app, you would verify the token with your backend
    // For demo purposes, we'll just decode the JWT
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        googleUser = {
            email: payload.email,
            name: payload.name,
            picture: payload.picture
        };
        
        updateUserInterface();
        syncWithGoogleDrive();
    } catch (error) {
        console.error('Error verifying token:', error);
        localStorage.removeItem('google_token');
    }
}

// Update user interface based on sign-in status
function updateUserInterface() {
    const signedInUser = document.getElementById('signedInUser');
    const userEmail = document.getElementById('userEmail');
    const signInOption = document.getElementById('signInOption');
    const signOutOption = document.getElementById('signOutOption');
    const profilePicture = document.getElementById('profilePicture');
    
    if (googleUser) {
        signedInUser.classList.remove('d-none');
        userEmail.textContent = googleUser.email;
        signInOption.classList.add('d-none');
        signOutOption.classList.remove('d-none');
        
        // Update profile picture if available
        if (googleUser.picture) {
            profilePicture.innerHTML = `<img src="${googleUser.picture}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%;">`;
        }
    } else {
        signedInUser.classList.add('d-none');
        signInOption.classList.remove('d-none');
        signOutOption.classList.add('d-none');
        profilePicture.innerHTML = '<i class="bi bi-person-circle profile-icon"></i>';
    }
}

// Show Google Sign-In modal
function showGoogleSignIn() {
    $('#googleSignInModal').modal('show');
}

// Google Sign-Out
function googleSignOut() {
    googleUser = null;
    localStorage.removeItem('google_token');
    updateUserInterface();
    showToast('Signed out successfully', 'info');
    updateSyncStatus();
}

// Enhanced Google Drive Sync
async function syncWithGoogleDrive() {
    if (!googleUser || syncInProgress) {
        if (!googleUser) {
            pendingSync = true;
        }
        return;
    }
    
    syncInProgress = true;
    updateSyncStatus('Syncing...');
    
    try {
        // Prepare data for sync
        const syncData = {
            transactions: transactions,
            categories: categories,
            futureTransactions: futureTransactions,
            loans: loans,
            currency: currency,
            lastSync: new Date().toISOString(),
            version: '1.0'
        };
        
        // In a real implementation, you would:
        // 1. Get access token from Google
        // 2. Check if file exists
        // 3. Upload or update the file
        // 4. Handle conflicts
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For demo purposes, we'll just store in localStorage
        localStorage.setItem('last_sync', new Date().toISOString());
        lastSyncTime = new Date();
        
        showToast('Data synced with cloud!', 'success');
        updateSyncStatus('Last synced: Just now');
        
    } catch (error) {
        console.error('Sync failed:', error);
        showToast('Sync failed. Using local data.', 'warning');
        updateSyncStatus('Sync failed');
    } finally {
        syncInProgress = false;
        
        // Process any pending sync
        if (pendingSync) {
            pendingSync = false;
            setTimeout(syncWithGoogleDrive, 1000);
        }
    }
}

// Manual sync trigger
function manualSync() {
    if (!googleUser) {
        showGoogleSignIn();
        return;
    }
    
    syncWithGoogleDrive();
}

// Update sync status display
function updateSyncStatus(status) {
    const syncStatusText = document.getElementById('syncStatusText');
    const manualSyncSettings = document.getElementById('manualSyncSettings');
    
    if (!googleUser) {
        syncStatusText.textContent = 'Sign in to sync across devices';
        manualSyncSettings.textContent = 'Sign In to Sync';
        return;
    }
    
    if (status) {
        syncStatusText.textContent = status;
    } else if (lastSyncTime) {
        const timeDiff = Math.floor((new Date() - lastSyncTime) / 1000 / 60);
        if (timeDiff < 1) {
            syncStatusText.textContent = 'Last synced: Just now';
        } else if (timeDiff < 60) {
            syncStatusText.textContent = `Last synced: ${timeDiff} min ago`;
        } else {
            const hours = Math.floor(timeDiff / 60);
            syncStatusText.textContent = `Last synced: ${hours} hour${hours > 1 ? 's' : ''} ago`;
        }
    } else {
        syncStatusText.textContent = 'Not synced yet';
    }
    
    manualSyncSettings.textContent = 'Sync Now';
}

// Load all data from localStorage
function loadAllData() {
    transactions = loadTransactions();
    categories = loadCategories();
    futureTransactions = loadFutureTransactions();
    loans = loadLoans();
    currency = loadCurrency() || "PKR";
    
    // Initialize default categories if none exist
    if (categories.length === 0) {
        categories = [
            { name: 'Salary', type: 'income' },
            { name: 'Freelance', type: 'income' },
            { name: 'Investments', type: 'income' },
            { name: 'Grocery', type: 'expense' },
            { name: 'Bike/Fuel', type: 'expense' },
            { name: 'Expenses', type: 'expense' },
            { name: 'Loan Returned', type: 'income' },
            { name: 'Loan Given', type: 'expense' },
            { name: 'Committee', type: 'expense' }
        ];
        saveCategories();
    }
}

// Enhanced data loading with fallbacks
function loadTransactions() {
    try {
        const stored = localStorage.getItem('transactions');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading transactions:', error);
        return [];
    }
}

function loadCategories() {
    try {
        const stored = localStorage.getItem('categories');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading categories:', error);
        return [];
    }
}

function loadFutureTransactions() {
    try {
        const stored = localStorage.getItem('futureTransactions');
        const data = stored ? JSON.parse(stored) : { income: [], expenses: [] };
        return {
            income: data.income || [],
            expenses: data.expenses || []
        };
    } catch (error) {
        console.error('Error loading future transactions:', error);
        return { income: [], expenses: [] };
    }
}

function loadLoans() {
    try {
        const stored = localStorage.getItem('loans');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading loans:', error);
        return [];
    }
}

function loadCurrency() {
    return localStorage.getItem('currency') || "PKR";
}

// Data saving functions
function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    if (googleUser) {
        syncWithGoogleDrive(); // Auto-sync when data changes
    }
}

function saveCategories() {
    localStorage.setItem('categories', JSON.stringify(categories));
    if (googleUser) {
        syncWithGoogleDrive();
    }
}

function saveFutureTransactions() {
    localStorage.setItem('futureTransactions', JSON.stringify(futureTransactions));
    if (googleUser) {
        syncWithGoogleDrive();
    }
}

function saveLoans() {
    localStorage.setItem('loans', JSON.stringify(loans));
    if (googleUser) {
        syncWithGoogleDrive();
    }
}

function saveCurrency(newCurrency) {
    currency = newCurrency;
    localStorage.setItem('currency', newCurrency);
    if (googleUser) {
        syncWithGoogleDrive();
    }
}

// Initialize UI components
function initUI() {
    // Initialize date inputs with current date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').value = today;
    document.getElementById('futureIncomeStartDate').value = today;
    document.getElementById('futureExpenseStartDate').value = today;
    document.getElementById('loanDateGiven').value = today;
    document.getElementById('loanDateTaken').value = today;
    
    // Populate month and year dropdowns
    populateMonthYearDropdowns();
    
    // Populate category dropdown
    updateCategoryDropdown();
    
    // Initialize category list
    updateCategoryList();
    
    // Set up bottom navigation
    setupBottomNavigation();
    
    // Initialize dark mode
    initDarkMode();
    
    // Set up form submissions
    setupFormSubmissions();
    
    // Initialize analytics tabs
    initAnalyticsTabs();
}

// Initialize charts
function initCharts() {
    // Charts will be initialized when analytics tab is opened
    console.log('Charts initialized');
}

// Setup event listeners
function setupEventListeners() {
    // Month/year change listeners
    document.getElementById('summaryMonth').addEventListener('change', updateDashboard);
    document.getElementById('summaryYear').addEventListener('change', updateDashboard);
    
    // Currency change listener
    document.getElementById('currencySelect').addEventListener('change', function() {
        saveCurrency(this.value);
        updateDashboard();
        updateAnalytics();
    });
    
    // Dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('change', toggleDarkMode);
    
    // Category management
    document.getElementById('addCategoryBtn').addEventListener('click', addNewCategory);
    document.getElementById('toggleCategorySettings').addEventListener('click', function() {
        const panel = document.getElementById('categorySettingsPanel');
        const icon = document.getElementById('catCollapseIcon');
        if (panel.classList.contains('show')) {
            icon.innerHTML = '<i class="bi bi-chevron-right"></i>';
        } else {
            icon.innerHTML = '<i class="bi bi-chevron-down"></i>';
        }
    });
    
    // Import/Export
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', triggerImport);
    document.getElementById('importFile').addEventListener('change', importData);
    
    // Manual sync
    document.getElementById('manualSyncSettings').addEventListener('click', manualSync);
    
    // Planner timeframe buttons
    document.querySelectorAll('.planner-timeframe-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.planner-timeframe-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            plannerTimeframe = this.dataset.timeframe;
            updatePlanner();
        });
    });
    
    // Analytics chart type changes
    document.getElementById('overviewChartType').addEventListener('change', function() {
        currentChartType = this.value;
        updateOverviewChart();
    });
    
    // Comparison controls
    document.getElementById('comparisonType').addEventListener('change', updateComparison);
    document.getElementById('comparisonPeriod1').addEventListener('change', updateComparison);
    document.getElementById('comparisonPeriod2').addEventListener('change', updateComparison);
}

// Setup bottom navigation
function setupBottomNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            switchTab(targetTab);
            
            // Update active state
            navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Switch between tabs
function switchTab(tabName) {
    // Hide all tab pages
    document.querySelectorAll('.tab-page').forEach(tab => {
        tab.classList.add('d-none');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.remove('d-none');
        
        // Update analytics when switching to analytics tab
        if (tabName === 'analytics') {
            updateAnalytics();
        } else if (tabName === 'planner') {
            updatePlanner();
        } else if (tabName === 'debt') {
            updateDebtManagement();
        }
    }
}

// Populate month and year dropdowns
function populateMonthYearDropdowns() {
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
    
    // Add years (current year and previous 5 years)
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    
    // Set current month and year
    const currentDate = new Date();
    monthSelect.value = currentDate.getMonth() + 1;
    yearSelect.value = currentDate.getFullYear();
}

// Update category dropdown
function updateCategoryDropdown() {
    const categoryInput = document.getElementById('categoryInput');
    const newCategoryType = document.getElementById('newCategoryType');
    
    // Clear existing options
    categoryInput.innerHTML = '';
    newCategoryType.innerHTML = '';
    
    // Add categories by type
    const incomeCategories = categories.filter(cat => cat.type === 'income');
    const expenseCategories = categories.filter(cat => cat.type === 'expense');
    
    // Add income categories
    if (incomeCategories.length > 0) {
        const incomeGroup = document.createElement('optgroup');
        incomeGroup.label = 'Income';
        incomeCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            incomeGroup.appendChild(option);
        });
        categoryInput.appendChild(incomeGroup);
    }
    
    // Add expense categories
    if (expenseCategories.length > 0) {
        const expenseGroup = document.createElement('optgroup');
        expenseGroup.label = 'Expenses';
        expenseCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            expenseGroup.appendChild(option);
        });
        categoryInput.appendChild(expenseGroup);
    }
    
    // Update new category type dropdown
    ['income', 'expense'].forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        newCategoryType.appendChild(option);
    });
}

// Update category list in settings
function updateCategoryList() {
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '';
    
    categories.forEach((category, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
            <span>
                <span class="badge ${category.type === 'income' ? 'bg-success' : 'bg-danger'} me-2">${category.type}</span>
                ${category.name}
            </span>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${index})">
                <i class="bi bi-trash"></i>
            </button>
        `;
        categoryList.appendChild(li);
    });
}

// Add new category
function addNewCategory() {
    const newCategoryInput = document.getElementById('newCategoryInput');
    const newCategoryType = document.getElementById('newCategoryType');
    
    const name = newCategoryInput.value.trim();
    const type = newCategoryType.value;
    
    if (!name) {
        showToast('Please enter a category name', 'warning');
        return;
    }
    
    // Check if category already exists
    if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
        showToast('Category already exists', 'warning');
        return;
    }
    
    categories.push({ name, type });
    saveCategories();
    updateCategoryDropdown();
    updateCategoryList();
    
    newCategoryInput.value = '';
    showToast('Category added successfully', 'success');
}

// Delete category
function deleteCategory(index) {
    if (confirm('Are you sure you want to delete this category? Transactions using this category will be moved to "Other".')) {
        const categoryName = categories[index].name;
        
        // Update transactions to use "Other" category
        transactions.forEach(tx => {
            if (tx.category === categoryName) {
                tx.category = 'Other';
            }
        });
        
        categories.splice(index, 1);
        saveCategories();
        saveTransactions();
        
        updateCategoryDropdown();
        updateCategoryList();
        updateDashboard();
        
        showToast('Category deleted successfully', 'success');
    }
}

// Setup form submissions
function setupFormSubmissions() {
    // Transaction form
    document.getElementById('transactionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveTransaction();
    });
    
    // Future income form
    document.getElementById('futureIncomeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveFutureIncome();
    });
    
    // Future expense form
    document.getElementById('futureExpenseForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveFutureExpense();
    });
    
    // Loan form
    document.getElementById('loanForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveLoan();
    });
}

// Save transaction
function saveTransaction() {
    const dateInput = document.getElementById('dateInput');
    const descInput = document.getElementById('descInput');
    const typeInput = document.getElementById('typeInput');
    const categoryInput = document.getElementById('categoryInput');
    const amountInput = document.getElementById('amountInput');
    const editIndex = document.getElementById('editTransactionIndex').value;
    
    const transaction = {
        date: dateInput.value,
        description: descInput.value,
        type: typeInput.value,
        category: categoryInput.value,
        amount: parseFloat(amountInput.value)
    };
    
    // Validation
    if (!transaction.date || !transaction.description || !transaction.category || !transaction.amount) {
        showFormAlert('Please fill in all fields');
        return;
    }
    
    if (transaction.amount <= 0) {
        showFormAlert('Amount must be greater than 0');
        return;
    }
    
    if (editIndex === '-1') {
        // Add new transaction
        transactions.push(transaction);
    } else {
        // Update existing transaction
        transactions[editIndex] = transaction;
    }
    
    saveTransactions();
    updateDashboard();
    
    // Close modal and reset form
    $('#addTransactionModal').modal('hide');
    resetTransactionForm();
    
    showToast(`Transaction ${editIndex === '-1' ? 'added' : 'updated'} successfully`, 'success');
}

// Reset transaction form
function resetTransactionForm() {
    document.getElementById('transactionForm').reset();
    document.getElementById('editTransactionIndex').value = '-1';
    document.getElementById('submitButtonText').textContent = 'Add';
    document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-plus-circle"></i> Add Transaction';
    document.getElementById('formAlert').classList.add('d-none');
    
    // Set current date
    document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
}

// Show form alert
function showFormAlert(message) {
    const formAlert = document.getElementById('formAlert');
    formAlert.textContent = message;
    formAlert.classList.remove('d-none');
}

// Edit transaction
function editTransaction(index) {
    const transaction = transactions[index];
    
    document.getElementById('dateInput').value = transaction.date;
    document.getElementById('descInput').value = transaction.description;
    document.getElementById('typeInput').value = transaction.type;
    document.getElementById('categoryInput').value = transaction.category;
    document.getElementById('amountInput').value = transaction.amount;
    document.getElementById('editTransactionIndex').value = index;
    document.getElementById('submitButtonText').textContent = 'Update';
    document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-pencil"></i> Edit Transaction';
    
    $('#addTransactionModal').modal('show');
}

// Delete transaction
function deleteTransaction(index) {
    showConfirmation(
        'Delete Transaction',
        'Are you sure you want to delete this transaction? This action cannot be undone.',
        'danger',
        () => {
            transactions.splice(index, 1);
            saveTransactions();
            updateDashboard();
            showToast('Transaction deleted successfully', 'success');
        }
    );
}

// Show confirmation dialog
function showConfirmation(title, message, type, confirmCallback) {
    const modal = document.getElementById('confirmationModal');
    const titleEl = document.getElementById('confirmationTitle');
    const messageEl = document.getElementById('confirmationMessage');
    const confirmBtn = document.getElementById('confirmActionBtn');
    const icon = modal.querySelector('.confirmation-icon');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Set button style based on type
    confirmBtn.className = `btn btn-${type}`;
    
    // Set icon based on type
    icon.className = `confirmation-icon confirmation-${type}`;
    icon.innerHTML = type === 'danger' ? 
        '<i class="bi bi-exclamation-triangle-fill"></i>' :
        '<i class="bi bi-question-circle-fill"></i>';
    
    // Set up confirm action
    confirmBtn.onclick = function() {
        $('#confirmationModal').modal('hide');
        if (confirmCallback) confirmCallback();
    };
    
    $('#confirmationModal').modal('show');
}

// Update dashboard
function updateDashboard() {
    updateNetWealth();
    updateBreakdowns();
    updateTransactionsTable();
}

// Update net wealth display
function updateNetWealth() {
    const month = parseInt(document.getElementById('summaryMonth').value);
    const year = parseInt(document.getElementById('summaryYear').value);
    
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const monthData = calculateMonthData(monthKey);
    
    document.getElementById('netWealth').textContent = formatCurrency(monthData.netWealth);
    document.getElementById('totalIncome').textContent = formatCurrency(monthData.totalIncome);
    document.getElementById('totalExpense').textContent = formatCurrency(monthData.totalExpenses);
    document.getElementById('currencyLabel').textContent = currency;
    
    // Update rollover balance display
    updateRolloverBalance(monthData.rolloverBalance, monthData.isRolloverPositive);
}

// Calculate month data
function calculateMonthData(monthKey) {
    const monthTransactions = transactions.filter(tx => {
        const txMonth = tx.date.substring(0, 7);
        return txMonth === monthKey;
    });
    
    const totalIncome = monthTransactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
    
    const totalExpenses = monthTransactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
    
    // Calculate rollover from previous month
    const rolloverData = calculateRolloverBalance(monthKey);
    const rolloverBalance = rolloverData.balance;
    const isRolloverPositive = rolloverBalance >= 0;
    
    const netWealth = totalIncome - totalExpenses + rolloverBalance;
    
    return {
        totalIncome,
        totalExpenses,
        netWealth,
        rolloverBalance,
        isRolloverPositive,
        transactions: monthTransactions
    };
}

// Calculate rollover balance
function calculateRolloverBalance(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    let previousMonth = month - 1;
    let previousYear = year;
    
    if (previousMonth === 0) {
        previousMonth = 12;
        previousYear = year - 1;
    }
    
    const previousMonthKey = `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
    const previousMonthData = calculateMonthData(previousMonthKey);
    
    // Get rollover settings
    const autoRollover = document.getElementById('autoRolloverToggle').checked;
    const allowNegative = document.getElementById('allowNegativeRollover').checked;
    
    let rolloverBalance = 0;
    
    if (autoRollover) {
        rolloverBalance = previousMonthData.netWealth;
        
        // If negative rollovers are not allowed and balance is negative, set to 0
        if (!allowNegative && rolloverBalance < 0) {
            rolloverBalance = 0;
        }
    }
    
    return {
        balance: rolloverBalance,
        fromMonth: previousMonthKey,
        autoRollover: autoRollover
    };
}

// Update rollover balance display
function updateRolloverBalance(balance, isPositive) {
    const rolloverElement = document.getElementById('rolloverBalance');
    const amountElement = document.getElementById('rolloverAmount');
    const descriptionElement = document.getElementById('rolloverDescription');
    
    if (balance !== 0) {
        rolloverElement.classList.remove('d-none');
        amountElement.textContent = formatCurrency(Math.abs(balance));
        descriptionElement.textContent = isPositive ? 'from previous month' : 'deficit from previous month';
        
        rolloverElement.className = `rollover-balance ${isPositive ? 'rollover-positive' : 'rollover-negative'}`;
    } else {
        rolloverElement.classList.add('d-none');
    }
}

// Toggle rollover settings
function toggleRolloverSettings() {
    const autoRollover = document.getElementById('autoRolloverToggle');
    const allowNegative = document.getElementById('allowNegativeRollover');
    
    showConfirmation(
        'Rollover Settings',
        'Auto-rollover: ' + (autoRollover.checked ? 'ON' : 'OFF') + 
        '\nAllow Negative: ' + (allowNegative.checked ? 'ON' : 'OFF') +
        '\n\nChange these in Settings > Monthly Rollover Settings',
        'info'
    );
}

// Update breakdowns
function updateBreakdowns() {
    updateIncomeBreakdown();
    updateExpenseBreakdown();
}

// Update income breakdown
function updateIncomeBreakdown() {
    const month = parseInt(document.getElementById('summaryMonth').value);
    const year = parseInt(document.getElementById('summaryYear').value);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    
    const monthTransactions = transactions.filter(tx => {
        const txMonth = tx.date.substring(0, 7);
        return txMonth === monthKey && tx.type === 'income';
    });
    
    const incomeByCategory = {};
    monthTransactions.forEach(tx => {
        incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
    });
    
    const incomeBreakdown = document.getElementById('incomeBreakdown');
    const noIncome = document.getElementById('noIncomeCategories');
    
    incomeBreakdown.innerHTML = '';
    
    if (Object.keys(incomeByCategory).length === 0) {
        noIncome.classList.remove('d-none');
        return;
    }
    
    noIncome.classList.add('d-none');
    
    Object.entries(incomeByCategory)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, amount]) => {
            const item = document.createElement('div');
            item.className = 'breakdown-item';
            item.onclick = () => showCategoryTransactions('income', category);
            item.innerHTML = `
                <span>${category}</span>
                <span class="text-success">${formatCurrency(amount)}</span>
            `;
            incomeBreakdown.appendChild(item);
        });
}

// Update expense breakdown
function updateExpenseBreakdown() {
    const month = parseInt(document.getElementById('summaryMonth').value);
    const year = parseInt(document.getElementById('summaryYear').value);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    
    const monthTransactions = transactions.filter(tx => {
        const txMonth = tx.date.substring(0, 7);
        return txMonth === monthKey && tx.type === 'expense';
    });
    
    const expensesByCategory = {};
    monthTransactions.forEach(tx => {
        expensesByCategory[tx.category] = (expensesByCategory[tx.category] || 0) + tx.amount;
    });
    
    const expenseBreakdown = document.getElementById('expenseBreakdown');
    const noExpenses = document.getElementById('noExpenseCategories');
    
    expenseBreakdown.innerHTML = '';
    
    if (Object.keys(expensesByCategory).length === 0) {
        noExpenses.classList.remove('d-none');
        return;
    }
    
    noExpenses.classList.add('d-none');
    
    Object.entries(expensesByCategory)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, amount]) => {
            const item = document.createElement('div');
            item.className = 'breakdown-item';
            item.onclick = () => showCategoryTransactions('expense', category);
            item.innerHTML = `
                <span>${category}</span>
                <span class="text-danger">${formatCurrency(amount)}</span>
            `;
            expenseBreakdown.appendChild(item);
        });
}

// Show category transactions
function showCategoryTransactions(type, category) {
    const month = parseInt(document.getElementById('summaryMonth').value);
    const year = parseInt(document.getElementById('summaryYear').value);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    
    let categoryTransactions = transactions.filter(tx => {
        const txMonth = tx.date.substring(0, 7);
        return txMonth === monthKey && tx.type === type;
    });
    
    if (category !== 'all') {
        categoryTransactions = categoryTransactions.filter(tx => tx.category === category);
    }
    
    const modalTitle = document.getElementById('categoryTransactionsTitle');
    const transactionsInfo = document.getElementById('categoryTransactionsInfo');
    const totalAmount = document.getElementById('categoryTotalAmount');
    const transactionsList = document.getElementById('categoryTransactionsList');
    const noTransactions = document.getElementById('noCategoryTransactions');
    
    // Update modal title and info
    if (category === 'all') {
        modalTitle.innerHTML = `<i class="bi bi-list-ul"></i> All ${type === 'income' ? 'Income' : 'Expense'} Transactions`;
        transactionsInfo.textContent = `All ${type === 'income' ? 'income' : 'expense'} categories for ${getMonthName(month)} ${year}`;
    } else {
        modalTitle.innerHTML = `<i class="bi bi-tag"></i> ${category} Transactions`;
        transactionsInfo.textContent = `${category} ${type === 'income' ? 'income' : 'expenses'} for ${getMonthName(month)} ${year}`;
    }
    
    // Calculate total amount
    const total = categoryTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    totalAmount.textContent = formatCurrency(total);
    totalAmount.className = `fw-bold fs-5 ${type === 'income' ? 'text-success' : 'text-danger'}`;
    
    // Populate transactions list
    transactionsList.innerHTML = '';
    
    if (categoryTransactions.length === 0) {
        noTransactions.classList.remove('d-none');
    } else {
        noTransactions.classList.add('d-none');
        
        categoryTransactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(tx => {
                const item = document.createElement('div');
                item.className = 'category-transaction-item';
                item.innerHTML = `
                    <div class="category-transaction-info">
                        <div class="fw-bold">${tx.description}</div>
                        <small class="text-muted">${formatDate(tx.date)}</small>
                    </div>
                    <div class="category-transaction-amount ${tx.type === 'income' ? 'text-success' : 'text-danger'}">
                        ${formatCurrency(tx.amount)}
                    </div>
                `;
                transactionsList.appendChild(item);
            });
    }
    
    $('#categoryTransactionsModal').modal('show');
}

// Add transaction for current category
function addTransactionForCategory() {
    const month = parseInt(document.getElementById('summaryMonth').value);
    const year = parseInt(document.getElementById('summaryYear').value);
    const category = currentCategoryFilter !== 'all' ? currentCategoryFilter : '';
    const type = document.getElementById('categoryTransactionsTitle').textContent.includes('Income') ? 'income' : 'expense';
    
    // Pre-fill the transaction form
    document.getElementById('typeInput').value = type;
    if (category) {
        document.getElementById('categoryInput').value = category;
    }
    
    // Set date to first day of selected month
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    document.getElementById('dateInput').value = firstDay;
    
    $('#categoryTransactionsModal').modal('hide');
    $('#addTransactionModal').modal('show');
}

// Update transactions table
function updateTransactionsTable() {
    const month = parseInt(document.getElementById('summaryMonth').value);
    const year = parseInt(document.getElementById('summaryYear').value);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    
    const monthTransactions = transactions.filter(tx => {
        const txMonth = tx.date.substring(0, 7);
        return txMonth === monthKey;
    });
    
    const transactionsBody = document.getElementById('transactionsBody');
    const noTransactions = document.getElementById('noTransactions');
    
    transactionsBody.innerHTML = '';
    
    if (monthTransactions.length === 0) {
        noTransactions.classList.remove('d-none');
    } else {
        noTransactions.classList.add('d-none');
        
        monthTransactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach((tx, index) => {
                const globalIndex = transactions.findIndex(t => 
                    t.date === tx.date && 
                    t.description === tx.description && 
                    t.amount === tx.amount
                );
                
                const row = document.createElement('tr');
                row.className = 'clickable-row';
                row.onclick = () => editTransaction(globalIndex);
                row.innerHTML = `
                    <td>${formatDate(tx.date)}</td>
                    <td class="description-cell" data-fulltext="${tx.description}">${tx.description}</td>
                    <td>
                        <span class="badge ${tx.type === 'income' ? 'bg-success' : 'bg-danger'}">
                            ${tx.type}
                        </span>
                    </td>
                    <td>${tx.category}</td>
                    <td class="${tx.type === 'income' ? 'text-success' : 'text-danger'}">
                        ${formatCurrency(tx.amount)}
                    </td>
                    <td>
                        <button class="btn btn-sm btn-action btn-delete" onclick="event.stopPropagation(); deleteTransaction(${globalIndex})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                transactionsBody.appendChild(row);
            });
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount).replace('PKR', 'PKR ');
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Get month name
function getMonthName(monthNumber) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1];
}

// Get current month key
function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Check for monthly rollover
function checkMonthlyRollover() {
    const currentMonth = getCurrentMonthKey();
    const lastBackupMonth = localStorage.getItem('last_backup_month');
    
    if (lastBackupMonth !== currentMonth) {
        // New month detected - perform rollover
        performMonthlyRollover(currentMonth);
        localStorage.setItem('last_backup_month', currentMonth);
    }
}

// Perform monthly rollover
function performMonthlyRollover(currentMonth) {
    const [year, month] = currentMonth.split('-').map(Number);
    let previousMonth = month - 1;
    let previousYear = year;
    
    if (previousMonth === 0) {
        previousMonth = 12;
        previousYear = year - 1;
    }
    
    const previousMonthKey = `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
    const previousMonthData = calculateMonthData(previousMonthKey);
    
    // Get rollover settings
    const autoRollover = document.getElementById('autoRolloverToggle').checked;
    const allowNegative = document.getElementById('allowNegativeRollover').checked;
    
    if (autoRollover && previousMonthData.netWealth !== 0) {
        const rolloverAmount = previousMonthData.netWealth;
        
        if (allowNegative || rolloverAmount > 0) {
            showToast(
                `Monthly rollover: ${formatCurrency(Math.abs(rolloverAmount))} ${rolloverAmount > 0 ? 'added' : 'deducted'} from ${getMonthName(previousMonth)}`,
                'info'
            );
        }
    }
}

// Initialize dark mode
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    darkModeToggle.checked = isDarkMode;
    toggleDarkMode();
}

// Toggle dark mode
function toggleDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const isDarkMode = darkModeToggle.checked;
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'true');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'false');
    }
}

// Export data
function exportData() {
    const data = {
        transactions: transactions,
        categories: categories,
        futureTransactions: futureTransactions,
        loans: loans,
        currency: currency,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wealth_command_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('Data exported successfully', 'success');
}

// Trigger import
function triggerImport() {
    document.getElementById('importFile').click();
}

// Import data
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            showConfirmation(
                'Import Data',
                'This will replace all your current data. Are you sure you want to continue?',
                'warning',
                () => {
                    // Validate data structure
                    if (data.transactions && Array.isArray(data.transactions)) {
                        transactions = data.transactions;
                    }
                    if (data.categories && Array.isArray(data.categories)) {
                        categories = data.categories;
                    }
                    if (data.futureTransactions) {
                        futureTransactions = data.futureTransactions;
                    }
                    if (data.loans && Array.isArray(data.loans)) {
                        loans = data.loans;
                    }
                    if (data.currency) {
                        currency = data.currency;
                        document.getElementById('currencySelect').value = currency;
                    }
                    
                    // Save all data
                    saveTransactions();
                    saveCategories();
                    saveFutureTransactions();
                    saveLoans();
                    saveCurrency(currency);
                    
                    // Update UI
                    updateDashboard();
                    updateCategoryDropdown();
                    updateCategoryList();
                    
                    showToast('Data imported successfully', 'success');
                    
                    // Clear file input
                    event.target.value = '';
                }
            );
        } catch (error) {
            showToast('Error importing data: Invalid file format', 'danger');
        }
    };
    reader.readAsText(file);
}

// Initialize analytics tabs
function initAnalyticsTabs() {
    const analyticsTabs = document.getElementById('analyticsTabs');
    if (analyticsTabs) {
        analyticsTabs.addEventListener('shown.bs.tab', function(event) {
            const target = event.target.getAttribute('data-bs-target');
            if (target === '#overview') {
                updateOverviewChart();
            } else if (target === '#trends') {
                updateTrendsCharts();
            } else if (target === '#comparison') {
                updateComparison();
            }
        });
    }
}

// Update analytics
function updateAnalytics() {
    updateHealthScore();
    updateSavingsRate();
    updateAIInsights();
    updateOverviewChart();
    updateRiskAlerts();
}

// Update health score
function updateHealthScore() {
    const healthScore = AnalyticsEngine.calculateHealthScore(transactions, {});
    const healthScoreValue = document.getElementById('healthScoreValue');
    const healthScoreLabel = document.getElementById('healthScoreLabel');
    const healthScoreTrend = document.getElementById('healthScoreTrend');
    
    healthScoreValue.textContent = healthScore;
    healthScoreValue.className = 'health-score-value';
    
    if (healthScore >= 80) {
        healthScoreValue.classList.add('excellent');
        healthScoreLabel.textContent = 'Excellent';
        healthScoreTrend.innerHTML = '<i class="bi bi-arrow-up-right text-success"></i> Strong financial health';
    } else if (healthScore >= 60) {
        healthScoreValue.classList.add('good');
        healthScoreLabel.textContent = 'Good';
        healthScoreTrend.innerHTML = '<i class="bi bi-dash text-warning"></i> Room for improvement';
    } else if (healthScore >= 40) {
        healthScoreValue.classList.add('fair');
        healthScoreLabel.textContent = 'Fair';
        healthScoreTrend.innerHTML = '<i class="bi bi-exclamation-triangle text-warning"></i> Needs attention';
    } else {
        healthScoreValue.classList.add('poor');
        healthScoreLabel.textContent = 'Poor';
        healthScoreTrend.innerHTML = '<i class="bi bi-arrow-down-left text-danger"></i> Immediate action needed';
    }
}

// Update savings rate
function updateSavingsRate() {
    const savingsRate = AnalyticsEngine.calculateSavingsRate(transactions);
    const savingsRateValue = document.getElementById('savingsRateValue');
    const savingsRateLabel = document.getElementById('savingsRateLabel');
    const savingsRateProgress = document.getElementById('savingsRateProgress');
    
    const percentage = Math.round(savingsRate * 100);
    savingsRateValue.textContent = `${percentage}%`;
    savingsRateProgress.style.width = `${Math.min(100, percentage)}%`;
    
    if (savingsRate >= 0.2) {
        savingsRateLabel.textContent = 'Excellent savings rate!';
        savingsRateProgress.className = 'progress-bar bg-success';
    } else if (savingsRate >= 0.1) {
        savingsRateLabel.textContent = 'Good savings rate';
        savingsRateProgress.className = 'progress-bar bg-warning';
    } else if (savingsRate >= 0) {
        savingsRateLabel.textContent = 'Low savings rate';
        savingsRateProgress.className = 'progress-bar bg-danger';
    } else {
        savingsRateLabel.textContent = 'Negative savings rate';
        savingsRateProgress.className = 'progress-bar bg-danger';
    }
}

// Update AI insights
function updateAIInsights() {
    const insights = AnalyticsEngine.generateInsights(transactions, {});
    const aiQuickInsights = document.getElementById('aiQuickInsights');
    
    aiQuickInsights.innerHTML = '';
    
    if (insights.length === 0) {
        aiQuickInsights.innerHTML = `
            <div class="text-center text-muted">
                <small>Add more transactions to get personalized insights</small>
            </div>
        `;
        return;
    }
    
    insights.slice(0, 3).forEach(insight => {
        const insightEl = document.createElement('div');
        insightEl.className = `ai-insight ai-${insight.type}`;
        insightEl.innerHTML = `
            <i class="bi ${insight.icon}"></i>
            <span>${insight.message}</span>
        `;
        aiQuickInsights.appendChild(insightEl);
    });
}

// Update overview chart
function updateOverviewChart() {
    const ctx = document.getElementById('overviewChart');
    const placeholder = document.getElementById('overviewChartPlaceholder');
    
    if (!ctx) return;
    
    // Destroy existing chart
    if (overviewChart) {
        overviewChart.destroy();
    }
    
    const chartType = document.getElementById('overviewChartType').value;
    
    if (transactions.length === 0) {
        ctx.style.display = 'none';
        placeholder.style.display = 'flex';
        return;
    }
    
    ctx.style.display = 'block';
    placeholder.style.display = 'none';
    
    let data, options;
    
    switch (chartType) {
        case 'category':
            // Spending by category
            const categoryData = getSpendingByCategory();
            data = {
                labels: categoryData.labels,
                datasets: [{
                    label: 'Spending by Category',
                    data: categoryData.values,
                    backgroundColor: [
                        '#4361EE', '#7209B7', '#10B981', '#06D6A0', '#EF476F', '#FF9E6D',
                        '#3A0CA3', '#4CC9F0', '#F72585', '#7209B7', '#3A86FF', '#FF006E'
                    ],
                    borderWidth: 1
                }]
            };
            options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    title: {
                        display: true,
                        text: 'Spending by Category'
                    }
                }
            };
            overviewChart = new Chart(ctx, {
                type: 'doughnut',
                data: data,
                options: options
            });
            break;
            
        case 'monthly':
            // Monthly trend
            const monthlyData = getMonthlyTrend();
            data = {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Income',
                    data: monthlyData.income,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Expenses',
                    data: monthlyData.expenses,
                    borderColor: '#EF476F',
                    backgroundColor: 'rgba(239, 71, 111, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            };
            options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Income vs Expenses'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            };
            overviewChart = new Chart(ctx, {
                type: 'line',
                data: data,
                options: options
            });
            break;
            
        case 'yearly':
            // Yearly comparison
            const yearlyData = getYearlyComparison();
            data = {
                labels: yearlyData.labels,
                datasets: [{
                    label: 'Total Spending',
                    data: yearlyData.values,
                    backgroundColor: '#4361EE',
                    borderColor: '#7209B7',
                    borderWidth: 1
                }]
            };
            options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Yearly Spending Comparison'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            };
            overviewChart = new Chart(ctx, {
                type: 'bar',
                data: data,
                options: options
            });
            break;
    }
}

// Get spending by category
function getSpendingByCategory() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentExpenses = transactions.filter(tx => 
        tx.type === 'expense' && new Date(tx.date) >= sixMonthsAgo
    );
    
    const categoryTotals = {};
    recentExpenses.forEach(tx => {
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
    });
    
    const sortedCategories = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8); // Top 8 categories
    
    return {
        labels: sortedCategories.map(([category]) => category),
        values: sortedCategories.map(([,amount]) => amount)
    };
}

// Get monthly trend
function getMonthlyTrend() {
    const now = new Date();
    const months = [];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
    
    const income = [];
    const expenses = [];
    
    months.forEach(month => {
        const monthData = calculateMonthData(month);
        income.push(monthData.totalIncome);
        expenses.push(monthData.totalExpenses);
    });
    
    const labels = months.map(month => {
        const [year, monthNum] = month.split('-');
        return `${getMonthName(parseInt(monthNum)).substring(0, 3)} ${year}`;
    });
    
    return { labels, income, expenses };
}

// Get yearly comparison
function getYearlyComparison() {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];
    
    const values = years.map(year => {
        const yearTransactions = transactions.filter(tx => {
            const txYear = new Date(tx.date).getFullYear();
            return txYear === year && tx.type === 'expense';
        });
        
        return yearTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    });
    
    return {
        labels: years.map(year => year.toString()),
        values: values
    };
}

// Update risk alerts
function updateRiskAlerts() {
    const riskAlerts = document.getElementById('riskAlerts');
    const noRiskAlerts = document.getElementById('noRiskAlerts');
    
    riskAlerts.innerHTML = '';
    
    const alerts = [];
    
    // Check for overspending
    const currentMonth = getCurrentMonthKey();
    const currentMonthData = calculateMonthData(currentMonth);
    const savingsRate = AnalyticsEngine.calculateSavingsRate(transactions);
    
    if (savingsRate < 0) {
        alerts.push({
            type: 'warning',
            title: 'Negative Savings Rate',
            message: 'You\'re spending more than you earn this month.',
            icon: 'bi-exclamation-triangle'
        });
    }
    
    // Check for large expense categories
    const categorySpending = getSpendingByCategory();
    const totalSpending = categorySpending.values.reduce((a, b) => a + b, 0);
    
    categorySpending.values.forEach((amount, index) => {
        const percentage = totalSpending > 0 ? (amount / totalSpending) * 100 : 0;
        if (percentage > 40) {
            alerts.push({
                type: 'warning',
                title: 'High Category Spending',
                message: `${categorySpending.labels[index]} accounts for ${percentage.toFixed(0)}% of your spending.`,
                icon: 'bi-pie-chart'
            });
        }
    });
    
    if (alerts.length === 0) {
        noRiskAlerts.classList.remove('d-none');
        riskAlerts.classList.add('d-none');
    } else {
        noRiskAlerts.classList.add('d-none');
        riskAlerts.classList.remove('d-none');
        
        alerts.forEach(alert => {
            const alertEl = document.createElement('div');
            alertEl.className = `risk-alert risk-${alert.type}`;
            alertEl.innerHTML = `
                <div class="risk-alert-icon">
                    <i class="${alert.icon}"></i>
                </div>
                <div class="risk-alert-content">
                    <div class="fw-bold">${alert.title}</div>
                    <div class="risk-alert-message">${alert.message}</div>
                </div>
            `;
            riskAlerts.appendChild(alertEl);
        });
    }
}

// Update trends charts
function updateTrendsCharts() {
    updateHealthTrendChart();
    updateCategoryTrendChart();
    updateHeatMap();
}

// Update health trend chart
function updateHealthTrendChart() {
    const ctx = document.getElementById('healthTrendChart');
    const placeholder = document.getElementById('healthTrendPlaceholder');
    
    if (!ctx) return;
    
    if (healthTrendChart) {
        healthTrendChart.destroy();
    }
    
    if (transactions.length < 10) {
        ctx.style.display = 'none';
        placeholder.style.display = 'flex';
        return;
    }
    
    ctx.style.display = 'block';
    placeholder.style.display = 'none';
    
    const monthlyData = getMonthlyTrend();
    const healthScores = monthlyData.labels.map((label, index) => {
        const monthData = {
            income: monthlyData.income[index],
            expenses: monthlyData.expenses[index]
        };
        // Simplified health score calculation for demo
        const savings = monthData.income - monthData.expenses;
        return Math.max(0, Math.min(100, (savings / monthData.income) * 100 * 2));
    });
    
    const data = {
        labels: monthlyData.labels,
        datasets: [{
            label: 'Financial Health Score',
            data: healthScores,
            borderColor: '#4361EE',
            backgroundColor: 'rgba(67, 97, 238, 0.1)',
            fill: true,
            tension: 0.4
        }]
    };
    
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: 'Financial Health Trend'
            }
        },
        scales: {
            y: {
                min: 0,
                max: 100,
                ticks: {
                    callback: function(value) {
                        return value + '%';
                    }
                }
            }
        }
    };
    
    healthTrendChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: options
    });
}

// Update category trend chart
function updateCategoryTrendChart() {
    const ctx = document.getElementById('categoryTrendChart');
    const placeholder = document.getElementById('categoryTrendPlaceholder');
    
    if (!ctx) return;
    
    if (categoryTrendChart) {
        categoryTrendChart.destroy();
    }
    
    if (transactions.length < 10) {
        ctx.style.display = 'none';
        placeholder.style.display = 'flex';
        return;
    }
    
    ctx.style.display = 'block';
    placeholder.style.display = 'none';
    
    // Get top 5 categories and their monthly trends
    const categoryData = getCategoryTrends();
    
    const data = {
        labels: categoryData.months,
        datasets: categoryData.categories.map((category, index) => ({
            label: category.name,
            data: category.monthlyAmounts,
            borderColor: getCategoryColor(index),
            backgroundColor: getCategoryColor(index, 0.1),
            fill: false,
            tension: 0.4
        }))
    };
    
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: 'Category Spending Trends'
            }
        },
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };
    
    categoryTrendChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: options
    });
}

// Get category trends
function getCategoryTrends() {
    const now = new Date();
    const months = [];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
    
    // Get top 5 expense categories
    const categoryTotals = {};
    transactions.forEach(tx => {
        if (tx.type === 'expense') {
            categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
        }
    });
    
    const topCategories = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name]) => name);
    
    const categoryTrends = topCategories.map(category => {
        const monthlyAmounts = months.map(month => {
            const monthTransactions = transactions.filter(tx => 
                tx.date.startsWith(month) && tx.type === 'expense' && tx.category === category
            );
            return monthTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        });
        
        return {
            name: category,
            monthlyAmounts: monthlyAmounts
        };
    });
    
    const monthLabels = months.map(month => {
        const [year, monthNum] = month.split('-');
        return `${getMonthName(parseInt(monthNum)).substring(0, 3)} ${year}`;
    });
    
    return {
        months: monthLabels,
        categories: categoryTrends
    };
}

// Update heat map
function updateHeatMap() {
    const container = document.getElementById('heatMapContainer');
    const placeholder = document.getElementById('heatMapPlaceholder');
    
    if (!container) return;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const heatMapData = AnalyticsEngine.generateHeatMap(transactions, currentYear, currentMonth);
    
    if (heatMapData.length === 0 || heatMapData.every(day => day.amount === 0)) {
        container.style.display = 'none';
        placeholder.style.display = 'flex';
        return;
    }
    
    container.style.display = 'block';
    placeholder.style.display = 'none';
    
    // Find maximum amount for color scaling
    const maxAmount = Math.max(...heatMapData.map(day => day.amount));
    
    let gridHTML = '<div class="heat-map-grid">';
    
    heatMapData.forEach(day => {
        const intensity = maxAmount > 0 ? day.amount / maxAmount : 0;
        const color = getHeatMapColor(intensity);
        
        gridHTML += `
            <div class="heat-map-day" 
                 style="background-color: ${color};"
                 title="${formatDate(day.date)}: ${formatCurrency(day.amount)}">
                ${day.day}
            </div>
        `;
    });
    
    gridHTML += '</div>';
    container.innerHTML = gridHTML;
}

// Get heat map color based on intensity
function getHeatMapColor(intensity) {
    const colors = [
        '#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'
    ];
    
    const index = Math.floor(intensity * (colors.length - 1));
    return colors[Math.min(index, colors.length - 1)];
}

// Get category color
function getCategoryColor(index, opacity = 1) {
    const colors = [
        '#4361EE', '#7209B7', '#10B981', '#EF476F', '#FF9E6D',
        '#3A0CA3', '#4CC9F0', '#F72585', '#7209B7', '#3A86FF'
    ];
    
    const color = colors[index % colors.length];
    if (opacity === 1) return color;
    
    // Convert hex to rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Update comparison
function updateComparison() {
    updateComparisonChart();
    updateChangeAnalysis();
}

// Update comparison chart
function updateComparisonChart() {
    const ctx = document.getElementById('comparisonChart');
    const placeholder = document.getElementById('comparisonPlaceholder');
    
    if (!ctx) return;
    
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    const comparisonType = document.getElementById('comparisonType').value;
    const period1 = document.getElementById('comparisonPeriod1').value;
    const period2 = document.getElementById('comparisonPeriod2').value;
    
    if (!period1 || !period2) {
        ctx.style.display = 'none';
        placeholder.style.display = 'flex';
        return;
    }
    
    ctx.style.display = 'block';
    placeholder.style.display = 'none';
    
    const comparison = AnalyticsEngine.comparePeriods(transactions, period1, period2, comparisonType);
    
    const categories = Object.keys(comparison);
    const period1Data = categories.map(cat => comparison[cat].period1);
    const period2Data = categories.map(cat => comparison[cat].period2);
    
    const data = {
        labels: categories,
        datasets: [{
            label: period1,
            data: period1Data,
            backgroundColor: '#4361EE'
        }, {
            label: period2,
            data: period2Data,
            backgroundColor: '#7209B7'
        }]
    };
    
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: `Spending Comparison: ${period1} vs ${period2}`
            }
        },
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };
    
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: options
    });
}

// Update change analysis
function updateChangeAnalysis() {
    const container = document.getElementById('changeAnalysis');
    const placeholder = document.getElementById('noChangeAnalysis');
    
    if (!container) return;
    
    const comparisonType = document.getElementById('comparisonType').value;
    const period1 = document.getElementById('comparisonPeriod1').value;
    const period2 = document.getElementById('comparisonPeriod2').value;
    
    if (!period1 || !period2) {
        container.style.display = 'none';
        placeholder.style.display = 'flex';
        return;
    }
    
    container.style.display = 'block';
    placeholder.style.display = 'none';
    
    const comparison = AnalyticsEngine.comparePeriods(transactions, period1, period2, comparisonType);
    
    let html = '';
    
    Object.entries(comparison)
        .sort(([,a], [,b]) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
        .forEach(([category, data]) => {
            if (data.period1 > 0 || data.period2 > 0) {
                const changeClass = data.percentChange >= 0 ? 'text-danger' : 'text-success';
                const changeIcon = data.percentChange >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-left';
                
                html += `
                    <div class="change-item">
                        <div class="change-category">${category}</div>
                        <div class="change-details">
                            <span class="change-amount ${changeClass}">
                                <i class="bi ${changeIcon}"></i>
                                ${Math.abs(data.percentChange).toFixed(1)}%
                            </span>
                            <small class="text-muted">${formatCurrency(data.change)}</small>
                        </div>
                    </div>
                `;
            }
        });
    
    container.innerHTML = html || '<div class="text-center text-muted">No significant changes detected</div>';
}

// Show full AI analysis
function showFullAIAnalysis() {
    const insights = AnalyticsEngine.generateInsights(transactions, {});
    const prediction = AnalyticsEngine.predictNextMonthSpending(transactions);
    
    let html = `
        <div class="ai-analysis-header text-center text-white p-4 rounded mb-4">
            <h4><i class="bi bi-robot"></i> Complete Financial Analysis</h4>
            <p class="mb-0">AI-powered insights based on your spending patterns</p>
        </div>
        
        <div class="row mb-4">
            <div class="col-md-4">
                <div class="ai-metric-card text-center">
                    <div class="ai-metric-value">${AnalyticsEngine.calculateHealthScore(transactions, {})}</div>
                    <div class="ai-metric-label">Health Score</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="ai-metric-card text-center">
                    <div class="ai-metric-value">${Math.round(AnalyticsEngine.calculateSavingsRate(transactions) * 100)}%</div>
                    <div class="ai-metric-label">Savings Rate</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="ai-metric-card text-center">
                    <div class="ai-metric-value">${transactions.length}</div>
                    <div class="ai-metric-label">Total Transactions</div>
                </div>
            </div>
        </div>
    `;
    
    if (prediction) {
        html += `
            <div class="ai-prediction mb-4">
                <h6><i class="bi bi-magic"></i> Next Month Prediction</h6>
                <div class="row">
                    <div class="col-md-6">
                        <div class="prediction-card">
                            <div class="prediction-amount">${formatCurrency(prediction.amount)}</div>
                            <div class="prediction-label">Expected Spending</div>
                            <small class="text-muted">Confidence: ${Math.round(prediction.confidence * 100)}%</small>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="prediction-card">
                            <div class="prediction-amount ${prediction.trend >= 0 ? 'text-danger' : 'text-success'}">
                                ${prediction.trend >= 0 ? '+' : ''}${Math.round(prediction.trend * 100)}%
                            </div>
                            <div class="prediction-label">Spending Trend</div>
                            <small class="text-muted">Compared to average</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += `
        <div class="ai-recommendations">
            <h6><i class="bi bi-lightbulb"></i> Recommendations</h6>
    `;
    
    if (insights.length === 0) {
        html += `
            <div class="text-center text-muted p-3">
                <i class="bi bi-info-circle" style="font-size: 2rem;"></i>
                <p class="mt-2">Add more transactions to get personalized recommendations</p>
            </div>
        `;
    } else {
        insights.forEach(insight => {
            html += `
                <div class="ai-recommendation ai-${insight.type}">
                    <i class="bi ${insight.icon}"></i>
                    <div>${insight.message}</div>
                </div>
            `;
        });
    }
    
    html += `</div>`;
    
    document.getElementById('aiInsightsContent').innerHTML = html;
    $('#aiInsightsModal').modal('show');
}

// Apply AI suggestions
function applyAISuggestions() {
    // This would implement the AI suggestions
    // For now, just show a message
    showToast('AI suggestions applied successfully!', 'success');
    $('#aiInsightsModal').modal('hide');
}

// Update planner
function updatePlanner() {
    const currentMonthData = calculateMonthData(getCurrentMonthKey());
    const projections = PlannerEngine.calculateProjections(
        futureTransactions, 
        plannerTimeframe, 
        currentMonthData.netWealth
    );
    
    updatePlannerSummary(projections.summary);
    updatePlannerTimeline(projections.months);
    updateFutureIncomeList();
    updateFutureExpensesList();
}

// Update planner summary
function updatePlannerSummary(summary) {
    document.getElementById('plannerNetWealth').textContent = formatCurrency(summary.netWealth);
    document.getElementById('plannerTotalIncome').textContent = formatCurrency(summary.totalIncome);
    document.getElementById('plannerTotalExpenses').textContent = formatCurrency(summary.totalExpenses);
    document.getElementById('plannerEndingBalance').textContent = formatCurrency(summary.endingBalance);
}

// Update planner timeline
function updatePlannerTimeline(months) {
    const timeline = document.getElementById('plannerTimeline');
    timeline.innerHTML = '';
    
    months.forEach(month => {
        const item = document.createElement('div');
        item.className = 'planner-month-item clickable';
        item.onclick = () => showMonthDetails(month);
        item.innerHTML = `
            <div class="planner-month-header">
                <span class="fw-bold">${month.name}</span>
                <span class="planner-month-balance ${month.balance >= 0 ? 'text-success' : 'text-danger'}">
                    ${formatCurrency(month.balance)}
                </span>
            </div>
            <div class="planner-month-details">
                <span class="text-success">+${formatCurrency(month.income)}</span>
                <span class="text-danger">-${formatCurrency(month.expenses)}</span>
                <span class="${month.net >= 0 ? 'text-success' : 'text-danger'}">
                    ${month.net >= 0 ? '+' : ''}${formatCurrency(month.net)}
                </span>
            </div>
        `;
        timeline.appendChild(item);
    });
}

// Show month details
function showMonthDetails(month) {
    document.getElementById('monthDetailsModalLabel').textContent = `Month Details: ${month.name}`;
    document.getElementById('monthDetailsIncome').textContent = formatCurrency(month.income);
    document.getElementById('monthDetailsExpenses').textContent = formatCurrency(month.expenses);
    document.getElementById('monthDetailsBalance').textContent = formatCurrency(month.balance);
    
    // For now, just show basic info
    document.getElementById('monthDetailsIncomeList').innerHTML = '<div class="text-muted">Income breakdown would show here</div>';
    document.getElementById('monthDetailsExpensesList').innerHTML = '<div class="text-muted">Expense breakdown would show here</div>';
    document.getElementById('monthDetailsTransactions').innerHTML = '<div class="text-muted">Transaction details would show here</div>';
    
    $('#monthDetailsModal').modal('show');
}

// Update future income list
function updateFutureIncomeList() {
    const list = document.getElementById('futureIncomeList');
    list.innerHTML = '';
    
    if (futureTransactions.income.length === 0) {
        list.innerHTML = '<div class="text-center text-muted p-3">No future income planned</div>';
        return;
    }
    
    futureTransactions.income.forEach((income, index) => {
        const item = document.createElement('div');
        item.className = 'planner-item';
        item.innerHTML = `
            <div class="planner-item-info">
                <div class="fw-bold">${income.description}</div>
                <small class="text-muted">
                    ${formatCurrency(income.amount)} • ${income.frequency} • Starts ${formatDate(income.startDate)}
                    ${income.endDate ? `• Ends ${formatDate(income.endDate)}` : ''}
                </small>
            </div>
            <div class="planner-item-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="editFutureIncome(${index})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteFutureIncome(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

// Update future expenses list
function updateFutureExpensesList() {
    const list = document.getElementById('futureExpensesList');
    list.innerHTML = '';
    
    if (futureTransactions.expenses.length === 0) {
        list.innerHTML = '<div class="text-center text-muted p-3">No future expenses planned</div>';
        return;
    }
    
    futureTransactions.expenses.forEach((expense, index) => {
        const item = document.createElement('div');
        item.className = 'planner-item';
        item.innerHTML = `
            <div class="planner-item-info">
                <div class="fw-bold">${expense.description}</div>
                <small class="text-muted">
                    ${formatCurrency(expense.amount)} • ${expense.frequency} • Starts ${formatDate(expense.startDate)}
                    ${expense.endDate ? `• Ends ${formatDate(expense.endDate)}` : ''}
                </small>
            </div>
            <div class="planner-item-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="editFutureExpense(${index})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteFutureExpense(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

// Open add future income modal
function openAddFutureIncome() {
    document.getElementById('futureIncomeIndex').value = '-1';
    document.getElementById('futureIncomeForm').reset();
    document.getElementById('futureIncomeStartDate').value = new Date().toISOString().split('T')[0];
    $('#futureIncomeModal').modal('show');
}

// Save future income
function saveFutureIncome() {
    const index = document.getElementById('futureIncomeIndex').value;
    const income = {
        description: document.getElementById('futureIncomeDescription').value,
        type: document.getElementById('futureIncomeType').value,
        amount: parseFloat(document.getElementById('futureIncomeAmount').value),
        frequency: document.getElementById('futureIncomeFrequency').value,
        startDate: document.getElementById('futureIncomeStartDate').value,
        endDate: document.getElementById('futureIncomeEndDate').value || null
    };
    
    if (index === '-1') {
        futureTransactions.income.push(income);
    } else {
        futureTransactions.income[index] = income;
    }
    
    saveFutureTransactions();
    updatePlanner();
    $('#futureIncomeModal').modal('hide');
    showToast('Future income saved successfully', 'success');
}

// Edit future income
function editFutureIncome(index) {
    const income = futureTransactions.income[index];
    
    document.getElementById('futureIncomeIndex').value = index;
    document.getElementById('futureIncomeDescription').value = income.description;
    document.getElementById('futureIncomeType').value = income.type;
    document.getElementById('futureIncomeAmount').value = income.amount;
    document.getElementById('futureIncomeFrequency').value = income.frequency;
    document.getElementById('futureIncomeStartDate').value = income.startDate;
    document.getElementById('futureIncomeEndDate').value = income.endDate || '';
    
    $('#futureIncomeModal').modal('show');
}

// Delete future income
function deleteFutureIncome(index) {
    showConfirmation(
        'Delete Future Income',
        'Are you sure you want to delete this future income?',
        'danger',
        () => {
            futureTransactions.income.splice(index, 1);
            saveFutureTransactions();
            updatePlanner();
            showToast('Future income deleted successfully', 'success');
        }
    );
}

// Open add future expense modal
function openAddFutureExpense() {
    document.getElementById('futureExpenseIndex').value = '-1';
    document.getElementById('futureExpenseForm').reset();
    document.getElementById('futureExpenseStartDate').value = new Date().toISOString().split('T')[0];
    $('#futureExpenseModal').modal('show');
}

// Save future expense
function saveFutureExpense() {
    const index = document.getElementById('futureExpenseIndex').value;
    const expense = {
        description: document.getElementById('futureExpenseDescription').value,
        type: document.getElementById('futureExpenseType').value,
        amount: parseFloat(document.getElementById('futureExpenseAmount').value),
        frequency: document.getElementById('futureExpenseFrequency').value,
        startDate: document.getElementById('futureExpenseStartDate').value,
        endDate: document.getElementById('futureExpenseEndDate').value || null
    };
    
    if (index === '-1') {
        futureTransactions.expenses.push(expense);
    } else {
        futureTransactions.expenses[index] = expense;
    }
    
    saveFutureTransactions();
    updatePlanner();
    $('#futureExpenseModal').modal('hide');
    showToast('Future expense saved successfully', 'success');
}

// Edit future expense
function editFutureExpense(index) {
    const expense = futureTransactions.expenses[index];
    
    document.getElementById('futureExpenseIndex').value = index;
    document.getElementById('futureExpenseDescription').value = expense.description;
    document.getElementById('futureExpenseType').value = expense.type;
    document.getElementById('futureExpenseAmount').value = expense.amount;
    document.getElementById('futureExpenseFrequency').value = expense.frequency;
    document.getElementById('futureExpenseStartDate').value = expense.startDate;
    document.getElementById('futureExpenseEndDate').value = expense.endDate || '';
    
    $('#futureExpenseModal').modal('show');
}

// Delete future expense
function deleteFutureExpense(index) {
    showConfirmation(
        'Delete Future Expense',
        'Are you sure you want to delete this future expense?',
        'danger',
        () => {
            futureTransactions.expenses.splice(index, 1);
            saveFutureTransactions();
            updatePlanner();
            showToast('Future expense deleted successfully', 'success');
        }
    );
}

// Update debt management
function updateDebtManagement() {
    const summary = DebtEngine.calculateDebtSummary(loans);
    
    document.getElementById('totalLoansGiven').textContent = formatCurrency(summary.totalGiven);
    document.getElementById('totalLoansTaken').textContent = formatCurrency(summary.totalTaken);
    document.getElementById('netDebtPosition').textContent = formatCurrency(summary.netPosition);
    document.getElementById('upcomingCount').textContent = summary.upcomingCount;
    
    updateUpcomingRepayments();
    updateLoansGivenList();
    updateLoansTakenList();
}

// Update upcoming repayments
function updateUpcomingRepayments() {
    const list = document.getElementById('upcomingRepayments');
    const upcoming = DebtEngine.getUpcomingRepayments(loans);
    
    list.innerHTML = '';
    
    if (upcoming.length === 0) {
        list.innerHTML = '<div class="text-center text-muted p-3">No upcoming repayments</div>';
        return;
    }
    
    upcoming.forEach((loan, index) => {
        const dueDate = loan.type === 'given' ? loan.expectedReturn : loan.dueDate;
        const item = document.createElement('div');
        item.className = 'repayment-item';
        item.innerHTML = `
            <div class="repayment-info">
                <div class="fw-bold">${loan.description || `${loan.type === 'given' ? 'Loan to' : 'Loan from'} ${loan.borrower || loan.lender}`}</div>
                <small class="text-muted">
                    Due: ${formatDate(dueDate)} • Amount: ${formatCurrency(loan.amount)}
                </small>
            </div>
            <div class="repayment-amount ${loan.type === 'given' ? 'text-success' : 'text-danger'}">
                ${formatCurrency(loan.amount)}
            </div>
        `;
        list.appendChild(item);
    });
}

// Update loans given list
function updateLoansGivenList() {
    const list = document.getElementById('loansGivenList');
    const loansGiven = loans.filter(loan => loan.type === 'given');
    
    list.innerHTML = '';
    
    if (loansGiven.length === 0) {
        list.innerHTML = '<div class="text-center text-muted p-3">No loans given</div>';
        return;
    }
    
    loansGiven.forEach((loan, index) => {
        const item = document.createElement('div');
        item.className = 'debt-item';
        item.innerHTML = `
            <div class="debt-item-info">
                <div class="fw-bold">${loan.description || `Loan to ${loan.borrower}`}</div>
                <small class="text-muted">
                    Given: ${formatDate(loan.dateGiven)} • 
                    ${loan.expectedReturn ? `Expected: ${formatDate(loan.expectedReturn)}` : 'No return date'}
                </small>
            </div>
            <div class="debt-item-actions">
                <span class="text-success fw-bold me-2">${formatCurrency(loan.amount)}</span>
                <button class="btn btn-sm btn-outline-primary" onclick="editLoan(${index})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteLoan(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

// Update loans taken list
function updateLoansTakenList() {
    const list = document.getElementById('loansTakenList');
    const loansTaken = loans.filter(loan => loan.type === 'taken');
    
    list.innerHTML = '';
    
    if (loansTaken.length === 0) {
        list.innerHTML = '<div class="text-center text-muted p-3">No loans taken</div>';
        return;
    }
    
    loansTaken.forEach((loan, index) => {
        const item = document.createElement('div');
        item.className = 'debt-item';
        item.innerHTML = `
            <div class="debt-item-info">
                <div class="fw-bold">${loan.description || `Loan from ${loan.lender}`}</div>
                <small class="text-muted">
                    Taken: ${formatDate(loan.dateTaken)} • 
                    ${loan.dueDate ? `Due: ${formatDate(loan.dueDate)}` : 'No due date'}
                </small>
            </div>
            <div class="debt-item-actions">
                <span class="text-danger fw-bold me-2">${formatCurrency(loan.amount)}</span>
                <button class="btn btn-sm btn-outline-primary" onclick="editLoan(${index})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteLoan(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

// Open add loan modal
function openAddLoan(type) {
    document.getElementById('loanIndex').value = '-1';
    document.getElementById('loanType').value = type;
    document.getElementById('loanForm').reset();
    
    // Show/hide relevant fields based on loan type
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
    
    $('#loanModal').modal('show');
}

// Save loan
function saveLoan() {
    const index = document.getElementById('loanIndex').value;
    const type = document.getElementById('loanType').value;
    
    const loan = {
        type: type,
        description: document.getElementById('loanDescription').value,
        amount: parseFloat(document.getElementById('loanAmount').value),
        borrower: type === 'given' ? document.getElementById('loanBorrower').value : undefined,
        lender: type === 'taken' ? document.getElementById('loanLender').value : undefined,
        dateGiven: type === 'given' ? document.getElementById('loanDateGiven').value : undefined,
        dateTaken: type === 'taken' ? document.getElementById('loanDateTaken').value : undefined,
        expectedReturn: type === 'given' ? document.getElementById('loanExpectedReturn').value : undefined,
        dueDate: type === 'taken' ? document.getElementById('loanDueDate').value : undefined
    };
    
    if (index === '-1') {
        loans.push(loan);
    } else {
        loans[index] = loan;
    }
    
    saveLoans();
    updateDebtManagement();
    $('#loanModal').modal('hide');
    showToast('Loan saved successfully', 'success');
}

// Edit loan
function editLoan(index) {
    const loan = loans[index];
    
    document.getElementById('loanIndex').value = index;
    document.getElementById('loanType').value = loan.type;
    document.getElementById('loanDescription').value = loan.description || '';
    document.getElementById('loanAmount').value = loan.amount;
    
    if (loan.type === 'given') {
        document.getElementById('loanBorrower').value = loan.borrower || '';
        document.getElementById('loanDateGiven').value = loan.dateGiven || '';
        document.getElementById('loanExpectedReturn').value = loan.expectedReturn || '';
    } else {
        document.getElementById('loanLender').value = loan.lender || '';
        document.getElementById('loanDateTaken').value = loan.dateTaken || '';
        document.getElementById('loanDueDate').value = loan.dueDate || '';
    }
    
    // Show/hide relevant fields
    openAddLoan(loan.type);
}

// Delete loan
function deleteLoan(index) {
    showConfirmation(
        'Delete Loan',
        'Are you sure you want to delete this loan?',
        'danger',
        () => {
            loans.splice(index, 1);
            saveLoans();
            updateDebtManagement();
            showToast('Loan deleted successfully', 'success');
        }
    );
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    
    // Set up the "Add Transaction" button
    document.getElementById('openAddTransactionModal').addEventListener('click', function() {
        resetTransactionForm();
        $('#addTransactionModal').modal('show');
    });
});

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}
