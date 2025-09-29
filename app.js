// Wealth Command: Complete with Google Drive Sync, Monthly Rollover, and AI Analytics

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
let cashFlowChart = null;
let healthTrendChart = null;
let categoryTrendChart = null;
let comparisonChart = null;

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

// User expectations for better predictions
let userExpectations = loadUserExpectations();

function loadUserExpectations() {
    try {
        return JSON.parse(localStorage.getItem('userExpectations')) || {
            expectedMonthlyIncome: 0,
            expectedMonthlyExpenses: 0,
            lastUpdated: new Date().toISOString()
        };
    } catch {
        return {
            expectedMonthlyIncome: 0,
            expectedMonthlyExpenses: 0,
            lastUpdated: new Date().toISOString()
        };
    }
}

function saveUserExpectations(expectations) {
    userExpectations = expectations;
    localStorage.setItem('userExpectations', JSON.stringify(expectations));
}

// AI Analytics Engine with Enhanced Features
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
    
    // Enhanced prediction with user expectations
    predictNextMonthSpending: function(transactions, userExpectations) {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        
        const recentTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= sixMonthsAgo;
        });
        
        // Use user expectations if provided
        if (userExpectations.expectedMonthlyExpenses > 0) {
            const expected = userExpectations.expectedMonthlyExpenses;
            const historicalAvg = this.calculateAverageMonthlySpending(transactions);
            const confidence = historicalAvg > 0 ? Math.min(0.9, Math.abs(expected - historicalAvg) / historicalAvg < 0.3 ? 0.8 : 0.6) : 0.7;
            
            return {
                amount: Math.round(expected),
                confidence: confidence,
                trend: 0,
                source: 'user_expectation'
            };
        }
        
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
            trend: trend,
            source: 'historical_data'
        };
    },
    
    calculateAverageMonthlySpending: function(transactions) {
        const monthlyExpenses = {};
        transactions.forEach(tx => {
            if (tx.type === 'expense') {
                const month = tx.date.substring(0, 7);
                monthlyExpenses[month] = (monthlyExpenses[month] || 0) + tx.amount;
            }
        });
        
        const amounts = Object.values(monthlyExpenses);
        return amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
    },
    
    // Generate enhanced AI insights with custom savings strategies
    generateInsights: function(transactions, monthlyBudgets) {
        const insights = [];
        const healthScore = this.calculateHealthScore(transactions, monthlyBudgets);
        const prediction = this.predictNextMonthSpending(transactions, userExpectations);
        
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
        
        // Savings rate insights with custom strategies
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
        
        // Custom savings strategies based on spending patterns
        const savingsStrategies = this.generateSavingsStrategies(transactions);
        insights.push(...savingsStrategies);
        
        // Spending pattern insights
        const spendingInsights = this.analyzeSpendingPatterns(transactions);
        insights.push(...spendingInsights);
        
        // Debt optimization insights
        const debtInsights = this.generateDebtInsights(transactions);
        insights.push(...debtInsights);
        
        // Prediction insights
        if (prediction && prediction.confidence > 0.6) {
            insights.push({
                type: 'info',
                message: `Next month's predicted spending: ${prediction.amount.toLocaleString()} ${currency}`,
                icon: 'bi-magic'
            });
        }
        
        return insights.slice(0, 6); // Return top 6 insights
    },
    
    generateSavingsStrategies: function(transactions) {
        const strategies = [];
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // Analyze category spending for potential savings
        const categorySpending = {};
        transactions.forEach(tx => {
            if (tx.type === 'expense' && tx.date.startsWith(currentMonth)) {
                categorySpending[tx.category] = (categorySpending[tx.category] || 0) + tx.amount;
            }
        });
        
        // Find categories with highest spending
        const topCategories = Object.entries(categorySpending)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);
        
        topCategories.forEach(([category, amount]) => {
            const potentialSavings = Math.round(amount * 0.2); // 20% reduction
            if (potentialSavings > 100) { // Only suggest if meaningful amount
                strategies.push({
                    type: 'info',
                    message: `If you reduce ${category} spending by 20%, you could save ${potentialSavings.toLocaleString()} ${currency} monthly`,
                    icon: 'bi-lightbulb'
                });
            }
        });
        
        return strategies;
    },
    
    analyzeSpendingPatterns: function(transactions) {
        const insights = [];
        const now = new Date();
        
        // Weekend vs weekday spending
        const weekendSpending = { total: 0, count: 0 };
        const weekdaySpending = { total: 0, count: 0 };
        
        transactions.forEach(tx => {
            if (tx.type === 'expense') {
                const date = new Date(tx.date);
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                
                if (isWeekend) {
                    weekendSpending.total += tx.amount;
                    weekendSpending.count++;
                } else {
                    weekdaySpending.total += tx.amount;
                    weekdaySpending.count++;
                }
            }
        });
        
        const weekendAvg = weekendSpending.count > 0 ? weekendSpending.total / weekendSpending.count : 0;
        const weekdayAvg = weekdaySpending.count > 0 ? weekdaySpending.total / weekdaySpending.count : 0;
        
        if (weekendAvg > 0 && weekdayAvg > 0 && weekendAvg > weekdayAvg * 1.3) {
            const percentage = Math.round((weekendAvg / weekdayAvg - 1) * 100);
            insights.push({
                type: 'warning',
                message: `You spend ${percentage}% more on weekends than weekdays`,
                icon: 'bi-calendar-week'
            });
        }
        
        return insights;
    },
    
    generateDebtInsights: function(transactions) {
        const insights = [];
        // Simple debt detection (negative transactions or specific categories)
        const debtPayments = transactions.filter(tx => 
            tx.type === 'expense' && 
            (tx.category.toLowerCase().includes('loan') || 
             tx.category.toLowerCase().includes('debt') ||
             tx.category.toLowerCase().includes('credit'))
        );
        
        if (debtPayments.length > 0) {
            const totalDebtPayments = debtPayments.reduce((sum, tx) => sum + tx.amount, 0);
            const monthlyIncome = this.calculateCurrentMonthIncome(transactions);
            
            if (monthlyIncome > 0) {
                const debtToIncomeRatio = totalDebtPayments / monthlyIncome;
                if (debtToIncomeRatio > 0.2) {
                    insights.push({
                        type: 'warning',
                        message: `Your debt payments are ${(debtToIncomeRatio * 100).toFixed(0)}% of your income. Consider debt consolidation.`,
                        icon: 'bi-credit-card'
                    });
                }
            }
        }
        
        return insights;
    },
    
    calculateCurrentMonthIncome: function(transactions) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        return transactions
            .filter(tx => tx.type === 'income' && tx.date.startsWith(currentMonth))
            .reduce((sum, tx) => sum + tx.amount, 0);
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
    
    // Enhanced forecasting with user expectations
    generateCashFlowForecast: function(transactions, userExpectations, months = 12) {
        const now = new Date();
        const forecast = [];
        
        const expectedIncome = userExpectations.expectedMonthlyIncome || this.calculateAverageMonthlyIncome(transactions);
        const expectedExpenses = userExpectations.expectedMonthlyExpenses || this.calculateAverageMonthlySpending(transactions);
        
        let currentBalance = this.getCurrentNetWealth(transactions);
        
        for (let i = 0; i < months; i++) {
            const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;
            
            // Apply seasonal adjustments
            const seasonalFactor = this.getSeasonalAdjustment(forecastDate.getMonth());
            const adjustedIncome = expectedIncome * seasonalFactor.income;
            const adjustedExpenses = expectedExpenses * seasonalFactor.expenses;
            
            const netCashFlow = adjustedIncome - adjustedExpenses;
            currentBalance += netCashFlow;
            
            forecast.push({
                month: monthKey,
                monthName: forecastDate.toLocaleDateString('en', { month: 'long', year: 'numeric' }),
                projectedIncome: Math.round(adjustedIncome),
                projectedExpenses: Math.round(adjustedExpenses),
                projectedNet: Math.round(netCashFlow),
                projectedBalance: Math.round(currentBalance),
                confidence: 0.7 // Base confidence
            });
        }
        
        return forecast;
    },
    
    calculateAverageMonthlyIncome: function(transactions) {
        const monthlyIncome = {};
        transactions.forEach(tx => {
            if (tx.type === 'income') {
                const month = tx.date.substring(0, 7);
                monthlyIncome[month] = (monthlyIncome[month] || 0) + tx.amount;
            }
        });
        
        const amounts = Object.values(monthlyIncome);
        return amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
    },
    
    getCurrentNetWealth: function(transactions) {
        const totalIncome = transactions.filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpenses = transactions.filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        return totalIncome - totalExpenses;
    },
    
    getSeasonalAdjustment: function(month) {
        // Simple seasonal adjustments
        const adjustments = {
            0: { income: 1.0, expenses: 1.1 }, // January - post-holiday spending
            1: { income: 1.0, expenses: 0.9 }, // February
            2: { income: 1.0, expenses: 1.0 }, // March
            3: { income: 1.0, expenses: 1.0 }, // April
            4: { income: 1.0, expenses: 1.0 }, // May
            5: { income: 1.0, expenses: 1.0 }, // June
            6: { income: 1.0, expenses: 1.0 }, // July
            7: { income: 1.0, expenses: 1.0 }, // August
            8: { income: 1.0, expenses: 1.0 }, // September
            9: { income: 1.0, expenses: 1.0 }, // October
            10: { income: 1.0, expenses: 1.2 }, // November - holiday shopping
            11: { income: 1.1, expenses: 1.3 } // December - holidays and bonuses
        };
        
        return adjustments[month] || { income: 1.0, expenses: 1.0 };
    },
    
    // Generate investment suggestions
    generateInvestmentSuggestions: function(transactions) {
        const suggestions = [];
        const savingsRate = this.calculateSavingsRate(transactions);
        
        if (savingsRate >= 0.2) {
            suggestions.push({
                type: 'positive',
                message: 'With your high savings rate, consider investing in index funds for long-term growth',
                icon: 'bi-graph-up-arrow'
            });
        } else if (savingsRate >= 0.1) {
            suggestions.push({
                type: 'info',
                message: 'Consider building an emergency fund (3-6 months expenses) before investing',
                icon: 'bi-shield-check'
            });
        } else if (savingsRate > 0) {
            suggestions.push({
                type: 'warning',
                message: 'Focus on increasing your savings rate before considering investments',
                icon: 'bi-piggy-bank'
            });
        }
        
        return suggestions;
    },
    
    // Enhanced heat map with better visualization
    generateHeatMap: function(transactions, year, month) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const heatMap = [];
        
        // Get all expenses for the month
        const monthExpenses = transactions.filter(tx => {
            if (tx.type !== 'expense') return false;
            const txDate = new Date(tx.date);
            return txDate.getFullYear() === year && txDate.getMonth() + 1 === month;
        });
        
        // Calculate daily totals
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTransactions = monthExpenses.filter(tx => tx.date === dateStr);
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

// Helper function to get monthly backup filename
function getMonthlyBackupFileName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `wealth_command_backup_${year}-${month}.json`;
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
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

let monthlyBudgets = loadMonthlyBudgets();

function saveMonthlyBudgets(budgets) {
    monthlyBudgets = ensureAllMonthsHaveBudgets(budgets);
    localStorage.setItem('monthlyBudgets', JSON.stringify(monthlyBudgets));
    autoSyncToDrive();
}

function getMonthKeyFromDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date)) return getCurrentMonthKey();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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
    const [year, month] = monthKey.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = year - 1;
    }
    
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
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

// Enhanced Toast System for important messages only (without dark mode toasts)
function showToast(message, type = 'info', duration = 4000) {
    // Skip dark mode toasts
    if (message.includes('Dark mode') || message.includes('Light mode')) {
        return;
    }
    
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

// Sync Status Icon System with modern icons
function updateSyncStatus(status, message = '') {
    const syncIcon = document.getElementById('syncStatusIcon');
    const syncTooltip = document.getElementById('syncStatusTooltip');
    
    if (!syncIcon) return;
    
    // Remove all existing classes
    syncIcon.className = 'bi';
    
    switch (status) {
        case 'success':
            syncIcon.classList.add('bi-cloud-check', 'text-success');
            syncTooltip.textContent = message || `Synced ${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'just now'}`;
            break;
        case 'info':
        case 'syncing':
            syncIcon.classList.add('bi-arrow-repeat', 'text-warning', 'pulse');
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
            syncIcon.classList.add('bi-cloud', 'text-muted');
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
            
            if (driveData.currency) {
                currency = driveData.currency;
                localStorage.setItem('currency', currency);
            }
            
            if (driveData.monthlyBudgets) {
                monthlyBudgets = driveData.monthlyBudgets;
                localStorage.setItem('monthlyBudgets', JSON.stringify(monthlyBudgets));
            }
            
            if (driveData.userExpectations) {
                userExpectations = driveData.userExpectations;
                localStorage.setItem('userExpectations', JSON.stringify(userExpectations));
            }
            
            // Update last backup month from loaded data
            if (driveData.lastBackupMonth) {
                lastBackupMonth = driveData.lastBackupMonth;
            }
            
            if (driveData.lastSync) {
                lastSyncTime = driveData.lastSync;
            }
            
            // Update UI with loaded data
            updateUI();
            populateSummaryFilters();
            renderCategoryList();
            
            showSyncStatus('success', 'Data loaded from Google Drive!');
            console.log('Data loaded from Drive:', {
                transactions: transactions.length,
                categories: categories.length,
                currency: currency,
                monthlyBudgets: Object.keys(monthlyBudgets).length
            });
            
            return true;
        } else {
            showSyncStatus('info', 'No existing data found. Creating new backup...');
            // No file found, create one with current data
            await syncDataToDrive();
            return true;
        }
    } catch (error) {
        console.error('Error loading from Drive:', error);
        showSyncStatus('error', 'Error loading from Google Drive');
        return false;
    }
}

// Helper function to sync a single file
async function syncSingleFile(fileName, fileData, overwrite = true) {
    // Search for existing file
    const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id)`,
        {
            headers: {
                'Authorization': `Bearer ${googleUser.access_token}`
            }
        }
    );
    
    if (searchResponse.status === 401) {
        throw new Error('Authentication expired');
    }
    
    if (!searchResponse.ok) {
        throw new Error(`Search failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    const existingFile = searchData.files?.[0];
    
    let response;
    
    if (existingFile && overwrite) {
        // Update existing file
        console.log(`Updating existing file: ${fileName}`);
        response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${googleUser.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(fileData)
            }
        );
    } else if (!existingFile) {
        // Create new file
        console.log(`Creating new file: ${fileName}`);
        
        // First create the file metadata
        const createResponse = await fetch(
            'https://www.googleapis.com/drive/v3/files',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${googleUser.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: fileName,
                    mimeType: 'application/json',
                    description: `Wealth Command ${fileName.includes('backup') ? 'Monthly Backup' : 'Main Sync File'}`
                })
            }
        );
        
        if (!createResponse.ok) {
            throw new Error(`File creation failed: ${createResponse.status}`);
        }
        
        const newFile = await createResponse.json();
        
        // Then upload the content
        response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${newFile.id}?uploadType=media`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${googleUser.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(fileData)
            }
        );
    } else {
        // File exists but we shouldn't overwrite (for monthly backups)
        console.log(`File ${fileName} already exists, skipping creation`);
        return true;
    }
    
    if (response.ok) {
        console.log(`File ${fileName} synced successfully`);
        return true;
    } else {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }
}

// Enhanced sync function with monthly backups
async function syncDataToDrive() {
    if (syncInProgress) {
        pendingSync = true;
        return false;
    }
    
    if (!googleUser || !googleUser.access_token) {
        console.log('Not authenticated, skipping sync');
        return false;
    }
    
    if (!isOnline) {
        console.log('Offline, skipping sync');
        pendingSync = true;
        showSyncStatus('warning', 'Offline - changes queued for sync');
        return false;
    }
    
    // Check if token is expired
    if (isTokenExpired(googleUser)) {
        showSyncStatus('warning', 'Session expired. Please sign in again.');
        googleSignOut();
        return false;
    }
    
    syncInProgress = true;
    showSyncStatus('syncing', 'Syncing to Google Drive...');
    
    try {
        const currentMonth = getCurrentMonthKey();
        const shouldCreateMonthlyBackup = lastBackupMonth !== currentMonth;
        
        const fileData = {
            transactions,
            categories,
            currency,
            monthlyBudgets,
            userExpectations,
            lastSync: new Date().toISOString(),
            lastBackupMonth: currentMonth,
            version: '1.3',
            app: 'Wealth Command'
        };
        
        // Step 1: Sync main file (always)
        console.log('Syncing main file...');
        const mainFileSuccess = await syncSingleFile(GOOGLE_DRIVE_FILE_NAME, fileData);
        
        if (!mainFileSuccess) {
            throw new Error('Failed to sync main file');
        }
        
        // Step 2: Create monthly backup if needed
        if (shouldCreateMonthlyBackup) {
            console.log('Creating monthly backup...');
            const monthlyFileName = getMonthlyBackupFileName();
            const monthlyBackupData = {
                ...fileData,
                isMonthlyBackup: true,
                backupMonth: currentMonth,
                created: new Date().toISOString()
            };
            
            await syncSingleFile(monthlyFileName, monthlyBackupData, false); // Don't overwrite existing monthly backups
            
            // Update last backup month
            lastBackupMonth = currentMonth;
            fileData.lastBackupMonth = currentMonth;
            
            // Update main file with new backup month info
            await syncSingleFile(GOOGLE_DRIVE_FILE_NAME, fileData);
            
            showSyncStatus('success', 'Data synced + monthly backup created!');
        } else {
            showSyncStatus('success', 'Data synced to Google Drive!');
        }
        
        lastSyncTime = new Date().toISOString();
        console.log('Sync completed successfully');
        return true;
    } catch (error) {
        console.error('Error syncing to Drive:', error);
        
        if (error.message.includes('Authentication expired') || error.message.includes('401')) {
            showSyncStatus('warning', 'Authentication expired. Please sign in again.');
            googleSignOut();
        } else {
            showSyncStatus('error', 'Sync failed: ' + error.message);
        }
        return false;
    } finally {
        syncInProgress = false;
        
        // Process pending sync if any
        if (pendingSync) {
            pendingSync = false;
            setTimeout(syncDataToDrive, 1000);
        }
    }
}

// Check if token is expired
function isTokenExpired(user) {
    if (!user || !user.acquired_at || !user.expires_in) return true;
    
    const elapsed = Date.now() - user.acquired_at;
    const expiresIn = user.expires_in * 1000; // Convert to milliseconds
    const buffer = 5 * 60 * 1000; // 5 minutes buffer
    
    return elapsed > (expiresIn - buffer);
}

// Enhanced manual sync with better feedback
async function manualSync() {
    if (!googleUser) {
        showGoogleSignIn();
        return;
    }
    
    if (!isOnline) {
        showSyncStatus('warning', 'Cannot sync: You are offline');
        return;
    }
    
    const success = await syncDataToDrive();
    if (success) {
        showSyncStatus('success', 'Manual sync completed!');
    }
}

// Enhanced sign-out function
function googleSignOut() {
    if (googleUser && googleUser.access_token) {
        if (window.google && google.accounts.oauth2) {
            google.accounts.oauth2.revoke(googleUser.access_token, () => {
                console.log('Token revoked');
            });
        }
    }
    
    googleUser = null;
    localStorage.removeItem('googleUser');
    updateProfileUI();
    showSyncStatus('offline', 'Signed out from Google Drive');
}

// Enhanced online/offline handling
window.addEventListener('online', () => {
    isOnline = true;
    showSyncStatus('info', 'Back online. Syncing data...');
    
    if (googleUser) {
        // Sync when coming back online
        setTimeout(() => {
            syncDataToDrive();
        }, 2000);
    }
});

window.addEventListener('offline', () => {
    isOnline = false;
    showSyncStatus('warning', 'You are offline. Changes will sync when back online.');
});

// Auto-sync function (debounced)
function autoSyncToDrive() {
    if (googleUser && isOnline) {
        // Debounce sync to avoid too many requests
        clearTimeout(window.syncTimeout);
        window.syncTimeout = setTimeout(() => {
            syncDataToDrive();
        }, 2000); // Sync after 2 seconds of inactivity
    }
}

// Periodic sync (every 5 minutes when online and authenticated)
function startPeriodicSync() {
    setInterval(() => {
        if (googleUser && isOnline && !syncInProgress) {
            console.log('Periodic sync check...');
            syncDataToDrive();
        }
    }, 5 * 60 * 1000); // 5 minutes
}

// Quick Add Button Functionality
document.getElementById('quickAddBtn').addEventListener('click', function() {
    document.getElementById('openAddTransactionModal').click();
});

// Salary Calculator Functions
function openSalaryCalculator() {
    const modal = new bootstrap.Modal(document.getElementById('salaryCalculatorModal'));
    
    // Set current date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').value = today;
    
    // Calculate initial salary
    calculateSalary();
    
    modal.show();
}

function calculateSalary() {
    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    const workingHours = parseFloat(document.getElementById('workingHours').value) || 9;
    const workingDaysSelect = document.getElementById('workingDays');
    const overtimeHours = parseFloat(document.getElementById('overtimeHours').value) || 0;
    const overtimeRateSelect = document.getElementById('overtimeRate');
    const kpiBonus = parseFloat(document.getElementById('kpiBonus').value) || 0;
    const otherAllowances = parseFloat(document.getElementById('otherAllowances').value) || 0;
    const deductions = parseFloat(document.getElementById('deductions').value) || 0;
    
    // Calculate hourly rate based on working days
    let workingDays;
    if (workingDaysSelect.value === 'custom') {
        workingDays = parseFloat(document.getElementById('customDays').value) || 22;
    } else {
        workingDays = parseInt(workingDaysSelect.value);
    }
    
    const monthlyHours = workingDays * workingHours;
    const hourlyRate = basicSalary / monthlyHours;
    
    // Calculate overtime
    let overtimeRate;
    if (overtimeRateSelect.value === 'custom') {
        overtimeRate = parseFloat(document.getElementById('customRate').value) || 1.5;
    } else {
        overtimeRate = parseFloat(overtimeRateSelect.value);
    }
    
    const overtimePay = overtimeHours * hourlyRate * overtimeRate;
    
    // Calculate total salary
    const totalSalary = basicSalary + overtimePay + kpiBonus + otherAllowances - deductions;
    
    // Update UI
    document.getElementById('basicSalaryResult').textContent = `${basicSalary.toLocaleString()} ${currency}`;
    document.getElementById('overtimeResult').textContent = `${overtimePay.toLocaleString()} ${currency}`;
    document.getElementById('kpiResult').textContent = `${kpiBonus.toLocaleString()} ${currency}`;
    document.getElementById('allowancesResult').textContent = `${otherAllowances.toLocaleString()} ${currency}`;
    document.getElementById('deductionsResult').textContent = `${deductions.toLocaleString()} ${currency}`;
    document.getElementById('netSalaryResult').textContent = `${totalSalary.toLocaleString()} ${currency}`;
    document.getElementById('totalSalary').textContent = `Total Salary: ${totalSalary.toLocaleString()} ${currency}`;
}

function addSalaryAsIncome() {
    const totalSalary = parseFloat(document.getElementById('netSalaryResult').textContent.replace(/[^0-9.-]+/g,"")) || 0;
    const today = new Date().toISOString().split('T')[0];
    
    if (totalSalary > 0) {
        // Add as income transaction
        transactions.push({
            date: today,
            desc: 'Monthly Salary',
            type: 'income',
            category: 'Salary',
            amount: totalSalary
        });
        
        saveTransactions(transactions);
        updateUI();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('salaryCalculatorModal'));
        if (modal) {
            modal.hide();
        }
        
        showToast('Salary added as income transaction', 'success');
    }
}

// Event listeners for salary calculator
document.getElementById('workingDays').addEventListener('change', function() {
    const customContainer = document.getElementById('customDaysContainer');
    if (this.value === 'custom') {
        customContainer.classList.remove('d-none');
    } else {
        customContainer.classList.add('d-none');
    }
    calculateSalary();
});

document.getElementById('overtimeRate').addEventListener('change', function() {
    const customContainer = document.getElementById('customRateContainer');
    if (this.value === 'custom') {
        customContainer.classList.remove('d-none');
    } else {
        customContainer.classList.add('d-none');
    }
    calculateSalary();
});

// Add event listeners for real-time salary calculation
['basicSalary', 'workingHours', 'overtimeHours', 'kpiBonus', 'otherAllowances', 'deductions', 'customDays', 'customRate'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener('input', calculateSalary);
    }
});

//Populate Chart Tab
function populateChartFilters() {
    const chartMonth = document.getElementById('chartMonth');
    const chartYear = document.getElementById('chartYear');
    const heatMapMonth = document.getElementById('heatMapMonth');
    const heatMapYear = document.getElementById('heatMapYear');
    
    if (!chartMonth || !chartYear || !heatMapMonth || !heatMapYear) return;
    
    // Clear existing options
    chartMonth.innerHTML = '<option value="all">All Months</option>';
    chartYear.innerHTML = '<option value="all">All Years</option>';
    heatMapMonth.innerHTML = '';
    heatMapYear.innerHTML = '';
    
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                       "July", "August", "September", "October", "November", "December"];
    
    // Populate month selects
    monthNames.forEach((monthName, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = monthName;
        chartMonth.appendChild(option.cloneNode(true));
        heatMapMonth.appendChild(option);
    });
    
    // Populate year selects
    const years = Array.from(new Set(transactions.map(tx => {
        const year = new Date(tx.date).getFullYear();
        return isNaN(year) ? null : year;
    }).filter(year => year !== null)))
    .sort((a, b) => b - a);
    
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) {
        years.unshift(currentYear);
    }
    
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        chartYear.appendChild(option.cloneNode(true));
        heatMapYear.appendChild(option);
    });
    
    const now = new Date();
    chartMonth.value = now.getMonth() + 1;
    chartYear.value = now.getFullYear();
    heatMapMonth.value = now.getMonth() + 1;
    heatMapYear.value = now.getFullYear();
    
    chartMonth.addEventListener('change', renderEnhancedAnalytics);
    chartYear.addEventListener('change', renderEnhancedAnalytics);
    heatMapMonth.addEventListener('change', renderEnhancedAnalytics);
    heatMapYear.addEventListener('change', renderEnhancedAnalytics);
}

// Tab Persistence System
function initTabState() {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['dashboard', 'transactions', 'charts', 'settings'];
    const savedTab = localStorage.getItem('lastActiveTab');
    
    let initialTab = 'dashboard';
    
    if (validTabs.includes(hash)) {
        initialTab = hash;
    } else if (validTabs.includes(savedTab)) {
        initialTab = savedTab;
    }
    
    showTab(initialTab);
}

function updateUrlHash(tab) {
    if (window.location.hash !== `#${tab}`) {
        window.location.hash = tab;
    }
}

// Page navigation logic with persistence
const tabs = ["dashboard", "transactions", "charts", "settings"];
function showTab(tab) {
    if (!tabs.includes(tab)) {
        tab = 'dashboard';
    }
    
    // Update URL and storage
    updateUrlHash(tab);
    localStorage.setItem('lastActiveTab', tab);
    
    // Update UI
    tabs.forEach(t => {
        document.getElementById(`tab-${t}`).classList.toggle("d-none", t !== tab);
        const btn = document.querySelector(`[data-tab='${t}']`);
        if (btn) {
            btn.classList.toggle("active", t === tab);
        }
    });
    
    setTimeout(() => {
        if (tab === "transactions") {
            adjustTransactionsTable();
        }
    }, 50);
    
    if (tab === "charts") {
        renderEnhancedAnalytics();
        populateChartFilters();
    }
    
    console.log(`Switched to tab: ${tab}`);
}

// Handle browser back/forward buttons
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (['dashboard', 'transactions', 'charts', 'settings'].includes(hash)) {
        showTab(hash);
    }
});

function adjustTransactionsTable() {
    const tableContainer = document.querySelector('#tab-transactions .table-container');
    const table = document.getElementById('transactionsTable');
    
    if (tableContainer && table) {
        tableContainer.style.height = '';
        table.style.width = '';
        
        setTimeout(() => {
            const availableHeight = window.innerHeight - tableContainer.getBoundingClientRect().top - 100;
            tableContainer.style.height = Math.max(availableHeight, 300) + 'px';
        }, 100);
    }
}

window.addEventListener('resize', function() {
    if (!document.getElementById('tab-transactions').classList.contains('d-none')) {
        adjustTransactionsTable();
    }
});

// Enhanced tab switching with animations
document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", function() {
        showTab(this.dataset.tab);
    });
});

// Fixed Category Transactions Modal
let currentCategoryView = null;
let currentCategoryTransactions = [];

function showCategoryTransactions(type, categoryName) {
    currentCategoryView = { type, categoryName };
    const modal = new bootstrap.Modal(document.getElementById('categoryTransactionsModal'));
    const title = document.getElementById('categoryTransactionsTitle');
    const info = document.getElementById('categoryTransactionsInfo');
    const totalAmount = document.getElementById('categoryTotalAmount');
    const transactionsList = document.getElementById('categoryTransactionsList');
    const noTransactions = document.getElementById('noCategoryTransactions');
    
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
    
    let filteredTx = transactions.filter(tx => tx.type === type);
    
    if (categoryName !== 'all') {
        filteredTx = filteredTx.filter(tx => tx.category === categoryName);
    }
    
    if (monthSel.value !== "all" || yearSel.value !== "all") {
        filteredTx = filteredTx.filter(tx => {
            const d = new Date(tx.date);
            if (isNaN(d)) return false;
            let valid = true;
            if (monthSel.value !== "all") valid = valid && (d.getMonth()+1) == monthSel.value;
            if (yearSel.value !== "all") valid = valid && d.getFullYear() == yearSel.value;
            return valid;
        });
    }
    
    // Store the filtered transactions with their original indices
    currentCategoryTransactions = filteredTx.map(tx => {
        const originalIndex = transactions.findIndex(t => 
            t.date === tx.date && t.desc === tx.desc && t.amount === tx.amount && t.type === tx.type && t.category === tx.category
        );
        return { ...tx, originalIndex };
    }).filter(item => item.originalIndex !== -1);
    
    if (categoryName === 'all') {
        title.innerHTML = `<i class="bi bi-list-ul"></i> All ${type.charAt(0).toUpperCase() + type.slice(1)} Transactions`;
        info.textContent = `Showing ${currentCategoryTransactions.length} transactions`;
    } else {
        title.innerHTML = `<i class="bi bi-tag"></i> ${categoryName} Transactions`;
        info.textContent = `Showing ${currentCategoryTransactions.length} ${type} transactions`;
    }
    
    const total = currentCategoryTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    totalAmount.textContent = `${total.toLocaleString()} ${currency}`;
    totalAmount.className = `fw-bold fs-5 ${type === 'income' ? 'text-success' : 'text-danger'}`;
    
    transactionsList.innerHTML = '';
    
    if (currentCategoryTransactions.length === 0) {
        noTransactions.classList.remove('d-none');
        transactionsList.classList.add('d-none');
    } else {
        noTransactions.classList.add('d-none');
        transactionsList.classList.remove('d-none');
        
        currentCategoryTransactions.slice().reverse().forEach((tx, idx) => {
            const item = document.createElement('div');
            item.className = 'category-transaction-item';
            item.innerHTML = `
                <div class="category-transaction-info">
                    <div class="fw-bold">${tx.desc}</div>
                    <small class="text-muted">${tx.date} • ${tx.category}</small>
                </div>
                <div class="category-transaction-actions">
                    <span class="fw-bold ${type === 'income' ? 'text-success' : 'text-danger'}">
                        ${tx.amount.toLocaleString()} ${currency}
                    </span>
                    <button class="btn-action btn-edit" title="Edit" onclick="editTransactionFromCategory(${tx.originalIndex})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-action btn-delete" title="Delete" onclick="removeTransactionFromCategory(${tx.originalIndex})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            transactionsList.appendChild(item);
        });
    }
    
    modal.show();
}

function editTransactionFromCategory(idx) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('categoryTransactionsModal'));
    if (modal) {
        modal.hide();
    }
    setTimeout(() => editTransaction(idx), 300);
}

function removeTransactionFromCategory(idx) {
    const transaction = transactions[idx];
    if (!transaction) {
        showToast('Transaction not found', 'danger');
        return;
    }

    const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    
    document.getElementById('confirmationTitle').textContent = 'Delete Transaction?';
    document.getElementById('confirmationMessage').innerHTML = `
        Are you sure you want to delete this transaction?<br>
        <strong>${transaction.desc}</strong> - ${transaction.amount} ${currency}<br>
        <small class="text-muted">${transaction.date} • ${transaction.category}</small>
    `;
    
    document.getElementById('confirmActionBtn').onclick = function() {
        transactions.splice(idx, 1);
        saveTransactions(transactions);
        updateUI();
        populateSummaryFilters();
        confirmationModal.hide();
        
        // Refresh the category modal
        setTimeout(() => {
            if (currentCategoryView) {
                showCategoryTransactions(currentCategoryView.type, currentCategoryView.categoryName);
            }
        }, 500);
        
        showToast('Transaction deleted successfully', 'success');
    };
    
    confirmationModal.show();
}

function addTransactionForCategory() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('categoryTransactionsModal'));
    if (modal) {
        modal.hide();
    }
    
    setTimeout(() => {
        if (currentCategoryView && currentCategoryView.categoryName !== 'all') {
            document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-plus-circle"></i> Add Transaction';
            document.getElementById('submitButtonText').textContent = 'Add';
            document.getElementById('editTransactionIndex').value = '-1';
            document.getElementById('transactionForm').reset();
            
            document.getElementById('typeInput').value = currentCategoryView.type;
            updateCategorySelect();
            document.getElementById('categoryInput').value = currentCategoryView.categoryName;
            
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('dateInput').value = today;
            
            const addTxModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
            addTxModal.show();
        } else {
            document.getElementById('openAddTransactionModal').click();
        }
    }, 300);
}

// Settings: Currency selection
document.getElementById("currencySelect").value = currency;
document.getElementById("currencySelect").addEventListener("change", function() {
    currency = this.value;
    saveCurrency(currency);
    document.getElementById("currencyLabel").textContent = currency;
    updateUI();
});

// Enhanced Category Management
const catPanel = document.getElementById('categorySettingsPanel');
document.getElementById('toggleCategorySettings').onclick = function() {
    catPanel.classList.toggle('collapse');
    document.getElementById('catCollapseIcon').innerHTML =
        catPanel.classList.contains('collapse')
            ? '<i class="bi bi-chevron-right"></i>'
            : '<i class="bi bi-chevron-down"></i>';
};

function renderCategoryList() {
    const ul = document.getElementById('categoryList');
    ul.innerHTML = '';
    
    const filterButtons = `
        <div class="category-filter-buttons mb-2">
            <button class="btn btn-sm category-filter-btn ${currentCategoryFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}" onclick="setCategoryFilter('all')">All</button>
            <button class="btn btn-sm category-filter-btn ${currentCategoryFilter === 'income' ? 'btn-success' : 'btn-outline-success'}" onclick="setCategoryFilter('income')">Income</button>
            <button class="btn btn-sm category-filter-btn ${currentCategoryFilter === 'expense' ? 'btn-danger' : 'btn-outline-danger'}" onclick="setCategoryFilter('expense')">Expense</button>
        </div>
    `;
    ul.innerHTML = filterButtons;
    
    const filteredCategories = categories.filter(cat => {
        if (currentCategoryFilter === 'all') return true;
        return cat.type === currentCategoryFilter;
    });
    
    if (filteredCategories.length === 0) {
        const li = document.createElement('li');
        li.className = "list-group-item text-center text-muted";
        li.textContent = "No categories found";
        ul.appendChild(li);
        return;
    }
    
    filteredCategories.forEach((cat, idx) => {
        const originalIndex = categories.findIndex(c => c.name === cat.name);
        const li = document.createElement('li');
        li.className = "list-group-item d-flex justify-content-between align-items-center";
        li.innerHTML = `
            <div>
                <span>${cat.name}</span>
                <span class="category-type-badge ${cat.type === 'income' ? 'category-income' : 'category-expense'}">
                    ${cat.type}
                </span>
            </div>
            <div>
                <button class="btn btn-sm btn-outline-secondary me-1" title="Edit" onclick="editCategory(${originalIndex})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="removeCategory(${originalIndex})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        ul.appendChild(li);
    });
    
    updateCategorySelect();
}

window.setCategoryFilter = function(filter) {
    currentCategoryFilter = filter;
    renderCategoryList();
};

document.getElementById('addCategoryBtn').onclick = function() {
    const name = document.getElementById('newCategoryInput').value.trim();
    const type = document.getElementById('newCategoryType').value;
    
    if (!name) {
        showCategoryAlert("Please enter a category name", "danger");
        return;
    }
    
    if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
        showCategoryAlert("Category already exists", "danger");
        return;
    }
    
    categories.push({ name, type });
    saveCategories(categories);
    renderCategoryList();
    document.getElementById('newCategoryInput').value = '';
    showCategoryAlert("Category added successfully", "success");
};

window.editCategory = function(idx) {
    const cat = categories[idx];
    const newName = prompt("Edit category name:", cat.name);
    if (newName && newName.trim() && !categories.some((c, i) => i !== idx && c.name.toLowerCase() === newName.toLowerCase())) {
        categories[idx].name = newName.trim();
        saveCategories(categories);
        renderCategoryList();
        updateUI();
    }
};

window.removeCategory = function(idx) {
    const isUsed = transactions.some(tx => tx.category === categories[idx].name);
    
    if (isUsed) {
        if (!confirm(`This category is used in ${transactions.filter(tx => tx.category === categories[idx].name).length} transaction(s). Are you sure you want to delete it?`)) {
            return;
        }
    } else {
        if (!confirm("Are you sure you want to delete this category?")) {
            return;
        }
    }
    
    categories.splice(idx, 1);
    saveCategories(categories);
    renderCategoryList();
    updateUI();
};

function showCategoryAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-2`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.getElementById('categorySettingsPanel').appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

function updateCategorySelect() {
    const typeSelect = document.getElementById('typeInput');
    const categorySelect = document.getElementById('categoryInput');
    const currentType = typeSelect.value;
    
    const filteredCategories = categories.filter(cat => cat.type === currentType);
    
    categorySelect.innerHTML = '';
    
    if (filteredCategories.length === 0) {
        categorySelect.innerHTML = '<option disabled>No categories available</option>';
        return;
    }
    
    filteredCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.name;
        opt.textContent = cat.name;
        categorySelect.appendChild(opt);
    });
}

document.getElementById('typeInput').addEventListener('change', updateCategorySelect);

// Always open with current month filter
function populateSummaryFilters() {
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
    monthSel.innerHTML = '';
    yearSel.innerHTML = '';
    
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    monthNames.forEach((m,i) => {
        const opt = document.createElement('option');
        opt.value = i + 1;
        opt.textContent = m;
        opt.selected = (i + 1) === currentMonth;
        monthSel.appendChild(opt);
    });
    
    const yearsArr = Array.from(new Set(transactions.map(tx => {
        const d = new Date(tx.date);
        return isNaN(d) ? null : d.getFullYear();
    }).filter(Boolean)
    ));
    
    if (!yearsArr.includes(currentYear)) {
        yearsArr.push(currentYear);
    }
    
    yearsArr.sort((a,b)=>b-a);
    yearsArr.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        opt.selected = y === currentYear;
        yearSel.appendChild(opt);
    });
    
    const allMonthOpt = document.createElement('option');
    allMonthOpt.value = "all";
    allMonthOpt.textContent = "All Months";
    monthSel.insertBefore(allMonthOpt, monthSel.firstChild);
    
    const allYearOpt = document.createElement('option');
    allYearOpt.value = "all";
    allYearOpt.textContent = "All Years";
    yearSel.insertBefore(allYearOpt, yearSel.firstChild);
    
    // Add event listeners
    monthSel.addEventListener('change', updateUI);
    yearSel.addEventListener('change', updateUI);
}

// Add Transaction Modal
const addTxModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
document.getElementById('openAddTransactionModal').onclick = () => {
    document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-plus-circle"></i> Add Transaction';
    document.getElementById('submitButtonText').textContent = 'Add';
    document.getElementById('editTransactionIndex').value = '-1';
    document.getElementById('transactionForm').reset();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').value = today;
    
    addTxModal.show();
};

// Edit Transaction Function
window.editTransaction = function(idx) {
    const transaction = transactions[idx];
    document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-pencil"></i> Edit Transaction';
    document.getElementById('submitButtonText').textContent = 'Update';
    document.getElementById('editTransactionIndex').value = idx;
    
    document.getElementById('dateInput').value = transaction.date;
    document.getElementById('descInput').value = transaction.desc;
    document.getElementById('typeInput').value = transaction.type;
    document.getElementById('amountInput').value = transaction.amount;
    
    updateCategorySelect();
    document.getElementById('categoryInput').value = transaction.category;
    
    addTxModal.show();
};

// Enhanced Delete Confirmation
window.removeTransaction = function(idx) {
    const transaction = transactions[idx];
    const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    
    document.getElementById('confirmationTitle').textContent = 'Delete Transaction?';
    document.getElementById('confirmationMessage').innerHTML = `
        Are you sure you want to delete this transaction?<br>
        <strong>${transaction.desc}</strong> - ${transaction.amount} ${currency}<br>
        <small class="text-muted">${transaction.date} • ${transaction.category}</small>
    `;
    
    document.getElementById('confirmActionBtn').onclick = function() {
        transactions.splice(idx, 1);
        saveTransactions(transactions);
        updateUI();
        populateSummaryFilters();
        confirmationModal.hide();
        showToast('Transaction deleted successfully', 'success');
    };
    
    confirmationModal.show();
};

// Add/Edit Transaction Form
document.getElementById('transactionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const date = document.getElementById('dateInput').value;
    const desc = document.getElementById('descInput').value.trim();
    const type = document.getElementById('typeInput').value;
    const cat = document.getElementById('categoryInput').value;
    const amount = parseFloat(document.getElementById('amountInput').value);
    const editIndex = parseInt(document.getElementById('editTransactionIndex').value);
    const alertBox = document.getElementById('formAlert');
    alertBox.classList.add('d-none');

    if (!date || !desc || !type || !cat || isNaN(amount)) {
        alertBox.textContent = "Please fill out all fields correctly.";
        alertBox.classList.remove('d-none');
        return;
    }
    if (desc.length < 2) {
        alertBox.textContent = "Description must be at least 2 characters.";
        alertBox.classList.remove('d-none');
        return;
    }
    
    if (editIndex >= 0) {
        transactions[editIndex] = { date, desc, type, category: cat, amount };
        showToast('Transaction updated successfully', 'success');
    } else {
        transactions.push({ date, desc, type, category: cat, amount });
        showToast('Transaction added successfully', 'success');
    }
    
    saveTransactions(transactions);
    calculateMonthlyRollover();
    updateUI();
    addTxModal.hide();
    this.reset();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').value = today;
});

// Update UI: Dashboard, Breakdown, Transactions
function updateUI() {
    document.getElementById("currencyLabel").textContent = currency;
    
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
    let filteredTx = transactions;
    
    if (monthSel && yearSel && (monthSel.value !== "all" || yearSel.value !== "all")) {
        filteredTx = transactions.filter(tx => {
            const d = new Date(tx.date);
            if (isNaN(d)) return false;
            let valid = true;
            if (monthSel.value !== "all") valid = valid && (d.getMonth()+1) == monthSel.value;
            if (yearSel.value !== "all") valid = valid && d.getFullYear() == yearSel.value;
            return valid;
        });
    }
    
    let totalIncome = filteredTx.filter(tx => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
    let totalExpense = filteredTx.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
    let netWealth = totalIncome - totalExpense;
    
    if (monthSel.value !== "all" && yearSel.value !== "all") {
        const monthKey = `${yearSel.value}-${String(monthSel.value).padStart(2, '0')}`;
        const monthData = monthlyBudgets[monthKey];
        if (monthData) {
            netWealth += monthData.startingBalance;
        }
    }
    
    document.getElementById("totalIncome").textContent = totalIncome.toLocaleString() + " " + currency;
    document.getElementById("totalExpense").textContent = totalExpense.toLocaleString() + " " + currency;
    document.getElementById("netWealth").textContent = netWealth.toLocaleString() + " " + currency;

    updateRolloverDisplay();

    // Income Breakdown - Only show categories with amount > 0
    const incomeBreakdown = document.getElementById("incomeBreakdown");
    const noIncomeMsg = document.getElementById("noIncomeCategories");
    incomeBreakdown.innerHTML = "";
    
    const incomeCategories = categories.filter(cat => cat.type === "income");
    let hasIncomeData = false;
    
    if (incomeCategories.length === 0) {
        noIncomeMsg.style.display = 'block';
    } else {
        noIncomeMsg.style.display = 'none';
        
        incomeCategories.forEach(cat => {
            const catAmount = filteredTx.filter(tx => tx.category === cat.name && tx.type === "income")
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            if (catAmount > 0) {
                hasIncomeData = true;
                
                const item = document.createElement("div");
                item.className = "breakdown-item";
                item.onclick = (e) => {
                    e.stopPropagation();
                    showCategoryTransactions('income', cat.name);
                };
                item.innerHTML = `
                    <span class="breakdown-category">${cat.name}</span>
                    <span class="breakdown-amount">${catAmount.toLocaleString()} ${currency}</span>
                `;
                incomeBreakdown.appendChild(item);
            }
        });
        
        if (!hasIncomeData) {
            noIncomeMsg.style.display = 'block';
        } else {
            noIncomeMsg.style.display = 'none';
        }
    }

    // Expense Breakdown - Only show categories with amount > 0
    const expenseBreakdown = document.getElementById("expenseBreakdown");
    const noExpenseMsg = document.getElementById("noExpenseCategories");
    expenseBreakdown.innerHTML = "";
    
    const expenseCategories = categories.filter(cat => cat.type === "expense");
    let hasExpenseData = false;
    
    if (expenseCategories.length === 0) {
        noExpenseMsg.style.display = 'block';
    } else {
        noExpenseMsg.style.display = 'none';
        
        expenseCategories.forEach(cat => {
            const catAmount = filteredTx.filter(tx => tx.category === cat.name && tx.type === "expense")
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            if (catAmount > 0) {
                hasExpenseData = true;
                
                const item = document.createElement("div");
                item.className = "breakdown-item";
                item.onclick = (e) => {
                    e.stopPropagation();
                    showCategoryTransactions('expense', cat.name);
                };
                item.innerHTML = `
                    <span class="breakdown-category">${cat.name}</span>
                    <span class="breakdown-amount">${catAmount.toLocaleString()} ${currency}</span>
                `;
                expenseBreakdown.appendChild(item);
            }
        });
        
        if (!hasExpenseData) {
            noExpenseMsg.style.display = 'block';
        } else {
            noExpenseMsg.style.display = 'none';
        }
    }

    // Transactions Table with enhanced description column and horizontal scrolling
    const tbody = document.getElementById('transactionsBody');
    tbody.innerHTML = "";
    if (transactions.length === 0) {
        document.getElementById('noTransactions').style.display = 'block';
    } else {
        document.getElementById('noTransactions').style.display = 'none';
        transactions.slice().reverse().forEach((tx, idx) => {
            const originalIndex = transactions.length - 1 - idx;
            const row = document.createElement('tr');
            row.className = 'clickable-row';
            row.onclick = () => editTransaction(originalIndex);
            
            // Format date as "DD-MMM" (e.g., "26-Sep")
            const transactionDate = new Date(tx.date);
            const formattedDate = isNaN(transactionDate) ? tx.date : 
                `${transactionDate.getDate()}-${transactionDate.toLocaleString('default', { month: 'short' })}`;
            
            const descCell = tx.desc.length > 30 ? 
                `<td class="description-cell" data-fulltext="${tx.desc}">${tx.desc.substring(0, 30)}...</td>` :
                `<td>${tx.desc}</td>`;
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                ${descCell}
                <td class="fw-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}">${tx.type}</td>
                <td>${tx.category}</td>
                <td class="fw-bold">${tx.amount.toLocaleString()} ${currency}</td>
                <td>
                    <button class="btn-action btn-delete" title="Delete" onclick="event.stopPropagation(); removeTransaction(${originalIndex})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Enhanced Analytics Functions
function renderEnhancedAnalytics() {
    updateAnalyticsOverview();
    renderPredictionsTab();
    renderTrendsTab();
    renderComparisonTab();
    updateAIInsights();
}

function updateAnalyticsOverview() {
    // Update health score
    const healthScore = AnalyticsEngine.calculateHealthScore(transactions, monthlyBudgets);
    const healthScoreElement = document.getElementById('healthScoreValue');
    const healthLabelElement = document.getElementById('healthScoreLabel');
    
    if (healthScoreElement) {
        healthScoreElement.textContent = healthScore;
        healthScoreElement.className = 'health-score-value';
        
        if (healthScore >= 80) {
            healthScoreElement.classList.add('excellent');
            healthLabelElement.textContent = 'Excellent';
        } else if (healthScore >= 60) {
            healthScoreElement.classList.add('good');
            healthLabelElement.textContent = 'Good';
        } else if (healthScore >= 40) {
            healthScoreElement.classList.add('fair');
            healthLabelElement.textContent = 'Fair';
        } else {
            healthScoreElement.classList.add('poor');
            healthLabelElement.textContent = 'Needs Attention';
        }
    }
    
    // Update savings rate
    const savingsRate = AnalyticsEngine.calculateSavingsRate(transactions);
    const savingsRateElement = document.getElementById('savingsRateValue');
    const savingsProgressElement = document.getElementById('savingsRateProgress');
    
    if (savingsRateElement) {
        const percentage = (savingsRate * 100).toFixed(1);
        savingsRateElement.textContent = `${percentage}%`;
        
        if (savingsProgressElement) {
            const progressWidth = Math.min(100, Math.max(0, savingsRate * 200)); // 50% savings = 100% progress
            savingsProgressElement.style.width = `${progressWidth}%`;
            
            if (savingsRate >= 0.2) {
                savingsProgressElement.className = 'progress-bar bg-success';
            } else if (savingsRate >= 0.1) {
                savingsProgressElement.className = 'progress-bar bg-warning';
            } else {
                savingsProgressElement.className = 'progress-bar bg-danger';
            }
        }
    }
    
    // Render overview chart
    renderOverviewChart();
    
    // Render pie charts
    renderPieCharts();
}

function renderOverviewChart() {
    const ctx = document.getElementById('overviewChart');
    if (!ctx) return;
    
    const canvasCtx = ctx.getContext('2d');
    const placeholder = document.getElementById('overviewChartPlaceholder');
    
    if (overviewChart) {
        overviewChart.destroy();
    }
    
    if (transactions.length === 0) {
        placeholder.classList.remove('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    
    const chartType = document.getElementById('overviewChartType')?.value || 'category';
    
    switch (chartType) {
        case 'category':
            renderCategoryOverviewChart(canvasCtx);
            break;
        case 'monthly':
            renderMonthlyOverviewChart(canvasCtx);
            break;
        case 'yearly':
            renderYearlyOverviewChart(canvasCtx);
            break;
    }
}

function renderCategoryOverviewChart(ctx) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const categoryData = {};
    categories.forEach(cat => {
        if (cat.type === 'expense') {
            categoryData[cat.name] = 0;
        }
    });
    
    transactions.forEach(tx => {
        if (tx.type === 'expense' && tx.date.startsWith(currentMonth)) {
            categoryData[tx.category] = (categoryData[tx.category] || 0) + tx.amount;
        }
    });
    
    const labels = Object.keys(categoryData).filter(cat => categoryData[cat] > 0);
    const data = labels.map(cat => categoryData[cat]);
    
    overviewChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Spending',
                data: data,
                backgroundColor: '#dc3545',
                borderColor: '#dc3545',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Current Month Spending by Category'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' ' + currency;
                        }
                    }
                }
            },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const category = labels[index];
                    showCategoryTransactions('expense', category);
                }
            }
        }
    });
}

function renderMonthlyOverviewChart(ctx) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyData = Array(12).fill().map(() => ({ income: 0, expense: 0 }));
    
    transactions.forEach(tx => {
        const d = new Date(tx.date);
        if (d.getFullYear() === currentYear) {
            const month = d.getMonth();
            if (tx.type === 'income') {
                monthlyData[month].income += tx.amount;
            } else {
                monthlyData[month].expense += tx.amount;
            }
        }
    });
    
    const incomeData = monthlyData.map(m => m.income);
    const expenseData = monthlyData.map(m => m.expense);
    
    overviewChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Expense',
                    data: expenseData,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Monthly Trend - ${currentYear}`
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' ' + currency;
                        }
                    }
                }
            }
        }
    });
}

function renderYearlyOverviewChart(ctx) {
    const years = Array.from(new Set(transactions.map(tx => new Date(tx.date).getFullYear())))
        .filter(year => !isNaN(year))
        .sort((a, b) => a - b);
    
    const yearlyData = {};
    years.forEach(year => {
        yearlyData[year] = { income: 0, expense: 0 };
    });
    
    transactions.forEach(tx => {
        const year = new Date(tx.date).getFullYear();
        if (yearlyData[year]) {
            if (tx.type === 'income') {
                yearlyData[year].income += tx.amount;
            } else {
                yearlyData[year].expense += tx.amount;
            }
        }
    });
    
    const incomeData = years.map(year => yearlyData[year].income);
    const expenseData = years.map(year => yearlyData[year].expense);
    
    overviewChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#198754'
                },
                {
                    label: 'Expense',
                    data: expenseData,
                    backgroundColor: '#dc3545'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Yearly Comparison'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' ' + currency;
                        }
                    }
                }
            }
        }
    });
}

function renderPieCharts() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Income Pie Chart
    const incomeData = {};
    transactions.forEach(tx => {
        if (tx.type === 'income' && tx.date.startsWith(currentMonth)) {
            incomeData[tx.category] = (incomeData[tx.category] || 0) + tx.amount;
        }
    });
    
    const incomeCtx = document.getElementById('incomePieChart');
    const incomePlaceholder = document.getElementById('incomePiePlaceholder');
    
    if (incomePieChart) incomePieChart.destroy();
    
    if (Object.keys(incomeData).length === 0) {
        incomePlaceholder.style.display = 'flex';
    } else {
        incomePlaceholder.style.display = 'none';
        incomePieChart = new Chart(incomeCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(incomeData),
                datasets: [{
                    data: Object.values(incomeData),
                    backgroundColor: ['#198754', '#20c997', '#0dcaf0', '#6f42c1', '#fd7e14']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Expense Pie Chart
    const expenseData = {};
    transactions.forEach(tx => {
        if (tx.type === 'expense' && tx.date.startsWith(currentMonth)) {
            expenseData[tx.category] = (expenseData[tx.category] || 0) + tx.amount;
        }
    });
    
    const expenseCtx = document.getElementById('expensePieChart');
    const expensePlaceholder = document.getElementById('expensePiePlaceholder');
    
    if (expensePieChart) expensePieChart.destroy();
    
    if (Object.keys(expenseData).length === 0) {
        expensePlaceholder.style.display = 'flex';
    } else {
        expensePlaceholder.style.display = 'none';
        expensePieChart = new Chart(expenseCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(expenseData),
                datasets: [{
                    data: Object.values(expenseData),
                    backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#6f42c1', '#20c997']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

function renderPredictionsTab() {
    renderCashFlowChart();
    renderYearlyProjections();
    renderRiskAlerts();
    renderMonthlyProjections();
}

function renderCashFlowChart() {
    const ctx = document.getElementById('cashFlowChart');
    if (!ctx) return;
    
    const canvasCtx = ctx.getContext('2d');
    const placeholder = document.getElementById('cashFlowPlaceholder');
    
    if (cashFlowChart) {
        cashFlowChart.destroy();
    }
    
    const forecast = AnalyticsEngine.generateCashFlowForecast(transactions, userExpectations, 6);
    
    if (forecast.length === 0) {
        placeholder.classList.remove('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    
    const labels = forecast.map(f => {
        const date = new Date(f.month + '-01');
        return date.toLocaleDateString('en', { month: 'short' });
    });
    
    const incomeData = forecast.map(f => f.projectedIncome);
    const expenseData = forecast.map(f => f.projectedExpenses);
    const netData = forecast.map(f => f.projectedNet);
    
    cashFlowChart = new Chart(canvasCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Projected Income',
                    data: incomeData,
                    backgroundColor: '#198754',
                    order: 3
                },
                {
                    label: 'Projected Expenses',
                    data: expenseData,
                    backgroundColor: '#dc3545',
                    order: 2
                },
                {
                    label: 'Net Cash Flow',
                    data: netData,
                    type: 'line',
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    fill: true,
                    tension: 0.4,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '6-Month Cash Flow Forecast'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' ' + currency;
                        }
                    }
                }
            }
        }
    });
}

function renderYearlyProjections() {
    const container = document.getElementById('yearlyProjectionsBody');
    if (!container) return;
    
    const forecast = AnalyticsEngine.generateCashFlowForecast(transactions, userExpectations, 12);
    
    container.innerHTML = '';
    
    if (forecast.length === 0) {
        return;
    }
    
    forecast.forEach(projection => {
        const row = document.createElement('tr');
        
        // Determine cash flow status
        let cashFlowStatus = '';
        let statusClass = '';
        if (projection.projectedNet > 0) {
            cashFlowStatus = 'Positive';
            statusClass = 'text-success';
        } else if (projection.projectedNet < 0) {
            cashFlowStatus = 'Negative';
            statusClass = 'text-danger';
        } else {
            cashFlowStatus = 'Neutral';
            statusClass = 'text-warning';
        }
        
        row.innerHTML = `
            <td>${projection.monthName}</td>
            <td>${projection.projectedIncome.toLocaleString()} ${currency}</td>
            <td>${projection.projectedExpenses.toLocaleString()} ${currency}</td>
            <td class="fw-bold ${projection.projectedNet >= 0 ? 'text-success' : 'text-danger'}">
                ${projection.projectedNet.toLocaleString()} ${currency}
            </td>
            <td class="${statusClass}">${cashFlowStatus}</td>
        `;
        container.appendChild(row);
    });
}

function updateYearlyProjections() {
    const expectedIncome = parseFloat(document.getElementById('expectedIncome').value) || 0;
    const expectedExpenses = parseFloat(document.getElementById('expectedExpenses').value) || 0;
    
    if (expectedIncome > 0 || expectedExpenses > 0) {
        userExpectations.expectedMonthlyIncome = expectedIncome;
        userExpectations.expectedMonthlyExpenses = expectedExpenses;
        userExpectations.lastUpdated = new Date().toISOString();
        
        saveUserExpectations(userExpectations);
        renderPredictionsTab();
        showToast('Projections updated successfully', 'success');
    } else {
        showToast('Please enter expected income and/or expenses', 'warning');
    }
}

function renderRiskAlerts() {
    const container = document.getElementById('riskAlerts');
    const placeholder = document.getElementById('noRiskAlerts');
    
    if (!container) return;
    
    const insights = AnalyticsEngine.generateInsights(transactions, monthlyBudgets);
    const riskAlerts = insights.filter(insight => insight.type === 'warning');
    
    container.innerHTML = '';
    
    if (riskAlerts.length === 0) {
        placeholder.classList.remove('d-none');
        container.classList.add('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    container.classList.remove('d-none');
    
    riskAlerts.forEach(alert => {
        const alertElement = document.createElement('div');
        alertElement.className = `risk-alert risk-${alert.type}`;
        alertElement.innerHTML = `
            <div class="risk-alert-icon">
                <i class="bi ${alert.icon}"></i>
            </div>
            <div class="risk-alert-content">
                <div class="risk-alert-message">${alert.message}</div>
            </div>
        `;
        container.appendChild(alertElement);
    });
}

function renderMonthlyProjections() {
    const container = document.getElementById('monthlyProjections');
    const placeholder = document.getElementById('noProjections');
    
    if (!container) return;
    
    const prediction = AnalyticsEngine.predictNextMonthSpending(transactions, userExpectations);
    
    container.innerHTML = '';
    
    if (!prediction) {
        placeholder.classList.remove('d-none');
        container.classList.add('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    container.classList.remove('d-none');
    
    const projectionElement = document.createElement('div');
    projectionElement.className = 'projection-item';
    
    let sourceText = '';
    if (prediction.source === 'user_expectation') {
        sourceText = 'Based on your expectations';
    } else {
        sourceText = 'Based on historical data';
    }
    
    projectionElement.innerHTML = `
        <div class="projection-header">
            <i class="bi bi-arrow-up-right"></i>
            <span>Next Month Spending Projection</span>
        </div>
        <div class="projection-amount">${prediction.amount.toLocaleString()} ${currency}</div>
        <div class="projection-confidence">
            <small class="text-muted">${sourceText} • Confidence: ${Math.round(prediction.confidence * 100)}%</small>
        </div>
        <div class="projection-trend">
            <small class="${prediction.trend > 0 ? 'text-danger' : 'text-success'}">
                <i class="bi ${prediction.trend > 0 ? 'bi-arrow-up' : 'bi-arrow-down'}"></i>
                ${prediction.trend !== 0 ? Math.abs(prediction.trend * 100).toFixed(1) + '% ' + (prediction.trend > 0 ? 'increase' : 'decrease') : 'Stable'}
            </small>
        </div>
    `;
    
    container.appendChild(projectionElement);
}

function renderTrendsTab() {
    renderHealthTrendChart();
    renderEnhancedHeatMap();
    renderEnhancedCategoryTrends();
}

function renderHealthTrendChart() {
    const ctx = document.getElementById('healthTrendChart');
    if (!ctx) return;
    
    const canvasCtx = ctx.getContext('2d');
    const placeholder = document.getElementById('healthTrendPlaceholder');
    
    if (healthTrendChart) {
        healthTrendChart.destroy();
    }
    
    // Calculate health scores for last 6 months
    const now = new Date();
    const healthScores = [];
    const labels = [];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        // Filter transactions for this month
        const monthTransactions = transactions.filter(tx => 
            getMonthKeyFromDate(tx.date) === monthKey
        );
        
        const score = AnalyticsEngine.calculateHealthScore(monthTransactions, monthlyBudgets);
        healthScores.push(score);
        labels.push(date.toLocaleDateString('en', { month: 'short' }));
    }
    
    if (healthScores.filter(score => score > 0).length < 2) {
        placeholder.classList.remove('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    
    healthTrendChart = new Chart(canvasCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Financial Health Score',
                data: healthScores,
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
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
                            return value + '/100';
                        }
                    }
                }
            }
        }
    });
}

// Enhanced Heat Map Function
function renderEnhancedHeatMap() {
    const container = document.getElementById('heatMapCalendar');
    const placeholder = document.getElementById('heatMapPlaceholder');
    const heatMapMonth = document.getElementById('heatMapMonth');
    const heatMapYear = document.getElementById('heatMapYear');
    
    if (!container || !heatMapMonth || !heatMapYear) return;
    
    const selectedYear = parseInt(heatMapYear.value);
    const selectedMonth = parseInt(heatMapMonth.value);
    
    const heatMapData = AnalyticsEngine.generateHeatMap(transactions, selectedYear, selectedMonth);
    
    container.innerHTML = '';
    
    if (heatMapData.filter(day => day.amount > 0).length === 0) {
        placeholder.classList.remove('d-none');
        container.classList.add('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    container.classList.remove('d-none');
    
    // Find max amount for color scaling
    const maxAmount = Math.max(...heatMapData.map(day => day.amount));
    
    // Get first day of month to determine starting position
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'heat-map-day-enhanced';
        emptyCell.style.visibility = 'hidden';
        container.appendChild(emptyCell);
    }
    
    // Create day cells
    heatMapData.forEach(day => {
        const intensity = maxAmount > 0 ? (day.amount / maxAmount) : 0;
        const dayElement = document.createElement('div');
        dayElement.className = 'heat-map-day-enhanced';
        dayElement.style.backgroundColor = `rgba(220, 53, 69, ${0.3 + intensity * 0.7})`;
        dayElement.style.color = intensity > 0.7 ? 'white' : 'inherit';
        
        dayElement.innerHTML = `
            <div class="heat-map-day-content">
                <div class="heat-map-day-number">${day.day}</div>
                ${day.amount > 0 ? `<div class="heat-map-day-amount">${day.amount.toLocaleString()}</div>` : ''}
            </div>
        `;
        
        if (day.amount > 0) {
            dayElement.title = `${day.date}: ${day.amount.toLocaleString()} ${currency} (${day.transactions} transaction${day.transactions !== 1 ? 's' : ''})`;
            dayElement.onclick = () => showDayTransactions(day.date);
        }
        
        container.appendChild(dayElement);
    });
}

function showDayTransactions(date) {
    const dayTransactions = transactions.filter(tx => tx.date === date && tx.type === 'expense');
    
    if (dayTransactions.length > 0) {
        let message = `Transactions on ${date}:\n\n`;
        dayTransactions.forEach(tx => {
            message += `• ${tx.desc}: ${tx.amount.toLocaleString()} ${currency} (${tx.category})\n`;
        });
        alert(message);
    }
}

// Enhanced Category Trends
function renderEnhancedCategoryTrends() {
    const container = document.getElementById('categoryTrendsEnhanced');
    if (!container) return;
    
    const trends = AnalyticsEngine.analyzeCategoryTrends(transactions);
    const currentMonth = getCurrentMonthKey();
    
    container.innerHTML = '';
    
    if (trends.length === 0) {
        return;
    }
    
    // Get current month spending for each category
    const currentMonthSpending = {};
    transactions.forEach(tx => {
        if (tx.type === 'expense' && tx.date.startsWith(currentMonth)) {
            currentMonthSpending[tx.category] = (currentMonthSpending[tx.category] || 0) + tx.amount;
        }
    });
    
    trends.slice(0, 6).forEach(trend => {
        const currentAmount = currentMonthSpending[trend.category] || 0;
        const changePercent = trend.trend * 100;
        const changeAmount = trend.change;
        
        const trendCard = document.createElement('div');
        trendCard.className = 'category-trend-card';
        
        // Determine border color based on trend
        let borderColor = '#6c757d'; // Default
        let trendIcon = 'bi-dash';
        let trendClass = '';
        
        if (changePercent > 10) {
            borderColor = '#dc3545';
            trendIcon = 'bi-arrow-up';
            trendClass = 'negative';
        } else if (changePercent < -10) {
            borderColor = '#198754';
            trendIcon = 'bi-arrow-down';
            trendClass = 'positive';
        }
        
        trendCard.style.borderLeftColor = borderColor;
        
        // Generate insight based on trend
        let insight = '';
        if (changePercent > 20) {
            insight = `Spending increased significantly. Consider reviewing ${trend.category} expenses.`;
        } else if (changePercent > 10) {
            insight = `Moderate increase. Monitor ${trend.category} spending.`;
        } else if (changePercent < -20) {
            insight = `Great job! You've significantly reduced ${trend.category} spending.`;
        } else if (changePercent < -10) {
            insight = `Good progress in reducing ${trend.category} expenses.`;
        } else {
            insight = `Spending is stable in ${trend.category}.`;
        }
        
        trendCard.innerHTML = `
            <div class="category-trend-header">
                <div class="category-trend-name">${trend.category}</div>
                <div class="category-trend-amount">${currentAmount.toLocaleString()} ${currency}</div>
            </div>
            <div class="category-trend-change ${trendClass}">
                <i class="bi ${trendIcon}"></i>
                ${Math.abs(changePercent).toFixed(1)}% (${changeAmount >= 0 ? '+' : ''}${changeAmount.toLocaleString()} ${currency})
            </div>
            <div class="category-trend-progress">
                <div class="progress" style="height: 4px;">
                    <div class="progress-bar" style="width: ${Math.min(100, (currentAmount / (currentAmount + Math.abs(changeAmount))) * 100)}%; background-color: ${borderColor};"></div>
                </div>
            </div>
            <div class="category-trend-insight">
                ${insight}
            </div>
        `;
        
        container.appendChild(trendCard);
    });
}

function renderComparisonTab() {
    populateComparisonFilters();
    renderComparisonChart();
    renderChangeAnalysis();
    renderAverageComparison();
}

function populateComparisonFilters() {
    const typeSelect = document.getElementById('comparisonType');
    const period1Select = document.getElementById('comparisonPeriod1');
    const period2Select = document.getElementById('comparisonPeriod2');
    
    if (!typeSelect || !period1Select || !period2Select) return;
    
    // Get available months and years from transactions
    const months = Array.from(new Set(transactions.map(tx => tx.date.substring(0, 7)))).sort();
    const years = Array.from(new Set(transactions.map(tx => tx.date.substring(0, 4)))).sort();
    
    // Populate period selects based on comparison type
    typeSelect.addEventListener('change', function() {
        period1Select.innerHTML = '';
        period2Select.innerHTML = '';
        
        const now = new Date();
        
        switch (this.value) {
            case 'month':
                // Populate with available months
                months.forEach(month => {
                    const option = document.createElement('option');
                    option.value = month;
                    option.textContent = new Date(month + '-01').toLocaleDateString('en', { year: 'numeric', month: 'long' });
                    period1Select.appendChild(option.cloneNode(true));
                    period2Select.appendChild(option);
                });
                break;
                
            case 'year':
                // Populate with available years
                years.forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    period1Select.appendChild(option.cloneNode(true));
                    period2Select.appendChild(option);
                });
                break;
                
            case 'average':
                // For 3-month average comparison
                for (let i = 0; i < 6; i++) {
                    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    const option = document.createElement('option');
                    option.value = monthKey;
                    option.textContent = date.toLocaleDateString('en', { year: 'numeric', month: 'long' });
                    period1Select.appendChild(option.cloneNode(true));
                    period2Select.appendChild(option);
                }
                break;
        }
        
        // Set default values (current and previous period)
        if (period1Select.options.length > 1) {
            period1Select.selectedIndex = 1;
            period2Select.selectedIndex = 0;
        }
        
        renderComparisonChart();
        renderChangeAnalysis();
        renderAverageComparison();
    });
    
    // Trigger initial population
    typeSelect.dispatchEvent(new Event('change'));
}

function renderComparisonChart() {
    const ctx = document.getElementById('comparisonChart');
    if (!ctx) return;
    
    const canvasCtx = ctx.getContext('2d');
    const placeholder = document.getElementById('comparisonPlaceholder');
    
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    const type = document.getElementById('comparisonType').value;
    const period1 = document.getElementById('comparisonPeriod1').value;
    const period2 = document.getElementById('comparisonPeriod2').value;
    
    if (!period1 || !period2) {
        placeholder.classList.remove('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    
    const comparison = AnalyticsEngine.comparePeriods(transactions, period1, period2, type);
    
    const categories = Object.keys(comparison).filter(cat => 
        comparison[cat].period1 > 0 || comparison[cat].period2 > 0
    );
    
    const period1Data = categories.map(cat => comparison[cat].period1);
    const period2Data = categories.map(cat => comparison[cat].period2);
    
    comparisonChart = new Chart(canvasCtx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [
                {
                    label: period1,
                    data: period1Data,
                    backgroundColor: '#6c757d'
                },
                {
                    label: period2,
                    data: period2Data,
                    backgroundColor: '#0d6efd'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Spending Comparison'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' ' + currency;
                        }
                    }
                }
            }
        }
    });
}

function renderChangeAnalysis() {
    const container = document.getElementById('changeAnalysis');
    const placeholder = document.getElementById('noChangeAnalysis');
    
    if (!container) return;
    
    const type = document.getElementById('comparisonType').value;
    const period1 = document.getElementById('comparisonPeriod1').value;
    const period2 = document.getElementById('comparisonPeriod2').value;
    
    if (!period1 || !period2) {
        placeholder.classList.remove('d-none');
        container.classList.add('d-none');
        return;
    }
    
    const comparison = AnalyticsEngine.comparePeriods(transactions, period1, period2, type);
    
    container.innerHTML = '';
    
    const significantChanges = Object.entries(comparison)
        .filter(([cat, data]) => Math.abs(data.percentChange) > 5 && (data.period1 > 0 || data.period2 > 0))
        .sort((a, b) => Math.abs(b[1].percentChange) - Math.abs(a[1].percentChange))
        .slice(0, 5);
    
    if (significantChanges.length === 0) {
        placeholder.classList.remove('d-none');
        container.classList.add('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    container.classList.remove('d-none');
    
    significantChanges.forEach(([category, data]) => {
        const changeElement = document.createElement('div');
        changeElement.className = 'change-item';
        changeElement.innerHTML = `
            <div class="change-category">${category}</div>
            <div class="change-details">
                <span class="change-amount ${data.percentChange >= 0 ? 'text-danger' : 'text-success'}">
                    <i class="bi ${data.percentChange >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'}"></i>
                    ${Math.abs(data.percentChange).toFixed(1)}%
                </span>
                <small class="text-muted">
                    ${data.period1.toLocaleString()} → ${data.period2.toLocaleString()} ${currency}
                </small>
            </div>
        `;
        container.appendChild(changeElement);
    });
}

// Enhanced 3-Month Average Comparison
function renderAverageComparison() {
    const section = document.getElementById('averageComparisonSection');
    const container = document.getElementById('averagePeriods');
    
    if (!section || !container) return;
    
    const comparisonType = document.getElementById('comparisonType');
    if (comparisonType.value !== 'average') {
        section.classList.add('d-none');
        return;
    }
    
    section.classList.remove('d-none');
    container.innerHTML = '';
    
    const period1 = document.getElementById('comparisonPeriod1').value;
    const period2 = document.getElementById('comparisonPeriod2').value;
    
    if (!period1 || !period2) return;
    
    // Calculate 3-month averages
    const avg1 = calculateThreeMonthAverage(period1);
    const avg2 = calculateThreeMonthAverage(period2);
    
    // Create comparison cards
    const periodsHTML = `
        <div class="average-period">
            <div class="average-period-header">${getAveragePeriodName(period1)}</div>
            <div class="average-stat">
                <span>Avg. Income:</span>
                <span class="average-stat-value">${avg1.income.toLocaleString()} ${currency}</span>
            </div>
            <div class="average-stat">
                <span>Avg. Expenses:</span>
                <span class="average-stat-value">${avg1.expenses.toLocaleString()} ${currency}</span>
            </div>
            <div class="average-stat">
                <span>Avg. Net:</span>
                <span class="average-stat-value ${avg1.net >= 0 ? 'text-success' : 'text-danger'}">${avg1.net.toLocaleString()} ${currency}</span>
            </div>
            <div class="average-stat">
                <span>Savings Rate:</span>
                <span class="average-stat-value ${avg1.savingsRate >= 0.2 ? 'text-success' : avg1.savingsRate >= 0.1 ? 'text-warning' : 'text-danger'}">${(avg1.savingsRate * 100).toFixed(1)}%</span>
            </div>
        </div>
        <div class="average-period">
            <div class="average-period-header">${getAveragePeriodName(period2)}</div>
            <div class="average-stat">
                <span>Avg. Income:</span>
                <span class="average-stat-value">${avg2.income.toLocaleString()} ${currency}</span>
            </div>
            <div class="average-stat">
                <span>Avg. Expenses:</span>
                <span class="average-stat-value">${avg2.expenses.toLocaleString()} ${currency}</span>
            </div>
            <div class="average-stat">
                <span>Avg. Net:</span>
                <span class="average-stat-value ${avg2.net >= 0 ? 'text-success' : 'text-danger'}">${avg2.net.toLocaleString()} ${currency}</span>
            </div>
            <div class="average-stat">
                <span>Savings Rate:</span>
                <span class="average-stat-value ${avg2.savingsRate >= 0.2 ? 'text-success' : avg2.savingsRate >= 0.1 ? 'text-warning' : 'text-danger'}">${(avg2.savingsRate * 100).toFixed(1)}%</span>
            </div>
        </div>
    `;
    
    container.innerHTML = periodsHTML;
}

function calculateThreeMonthAverage(startMonth) {
    const [startYear, startMonthNum] = startMonth.split('-').map(Number);
    let totalIncome = 0;
    let totalExpenses = 0;
    let monthCount = 0;
    
    for (let i = 0; i < 3; i++) {
        const currentMonth = startMonthNum + i;
        let year = startYear;
        let month = currentMonth;
        
        if (currentMonth > 12) {
            month = currentMonth - 12;
            year = startYear + 1;
        }
        
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const monthTransactions = transactions.filter(tx => getMonthKeyFromDate(tx.date) === monthKey);
        
        const monthIncome = monthTransactions.filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const monthExpenses = monthTransactions.filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        totalIncome += monthIncome;
        totalExpenses += monthExpenses;
        monthCount++;
    }
    
    const avgIncome = totalIncome / monthCount;
    const avgExpenses = totalExpenses / monthCount;
    const avgNet = avgIncome - avgExpenses;
    const savingsRate = avgIncome > 0 ? avgNet / avgIncome : 0;
    
    return {
        income: Math.round(avgIncome),
        expenses: Math.round(avgExpenses),
        net: Math.round(avgNet),
        savingsRate: savingsRate
    };
}

function getAveragePeriodName(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month + 1, 0); // End of month+1 (3 months total)
    
    return `${startDate.toLocaleDateString('en', { month: 'short' })} - ${endDate.toLocaleDateString('en', { month: 'short', year: 'numeric' })}`;
}

function updateComparisonMetrics(avg1, avg2) {
    const container = document.getElementById('comparisonMetrics');
    if (!container) return;
    
    const incomeChange = ((avg2.income - avg1.income) / avg1.income) * 100;
    const expenseChange = ((avg2.expenses - avg1.expenses) / avg1.expenses) * 100;
    const netChange = ((avg2.net - avg1.net) / Math.abs(avg1.net)) * 100;
    
    container.innerHTML = `
        <div class="metric-card">
            <div class="metric-value ${incomeChange >= 0 ? 'text-success' : 'text-danger'}">
                ${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(1)}%
            </div>
            <div class="metric-label">Income Change</div>
        </div>
        <div class="metric-card">
            <div class="metric-value ${expenseChange <= 0 ? 'text-success' : 'text-danger'}">
                ${expenseChange >= 0 ? '+' : ''}${expenseChange.toFixed(1)}%
            </div>
            <div class="metric-label">Expense Change</div>
        </div>
        <div class="metric-card">
            <div class="metric-value ${netChange >= 0 ? 'text-success' : 'text-danger'}">
                ${netChange >= 0 ? '+' : ''}${netChange.toFixed(1)}%
            </div>
            <div class="metric-label">Net Change</div>
        </div>
    `;
}

function updateAIInsights() {
    const container = document.getElementById('aiQuickInsights');
    if (!container) return;
    
    const insights = AnalyticsEngine.generateInsights(transactions, monthlyBudgets);
    
    container.innerHTML = '';
    
    if (insights.length === 0) {
        container.innerHTML = '<div class="text-center text-muted"><small>Add more transactions for personalized insights</small></div>';
        return;
    }
    
    // Show top 2 insights in quick view
    const topInsights = insights.slice(0, 2);
    
    topInsights.forEach(insight => {
        const insightElement = document.createElement('div');
        insightElement.className = `ai-insight ai-${insight.type}`;
        insightElement.innerHTML = `
            <i class="bi ${insight.icon} me-2"></i>
            <small>${insight.message}</small>
        `;
        container.appendChild(insightElement);
    });
}

function showFullAIAnalysis() {
    const modal = new bootstrap.Modal(document.getElementById('aiInsightsModal'));
    const container = document.getElementById('aiInsightsContent');
    
    const insights = AnalyticsEngine.generateInsights(transactions, monthlyBudgets);
    const healthScore = AnalyticsEngine.calculateHealthScore(transactions, monthlyBudgets);
    const savingsRate = AnalyticsEngine.calculateSavingsRate(transactions);
    const prediction = AnalyticsEngine.predictNextMonthSpending(transactions, userExpectations);
    const investmentSuggestions = AnalyticsEngine.generateInvestmentSuggestions(transactions);
    
    let html = `
        <div class="ai-analysis-header">
            <div class="row text-center">
                <div class="col-4">
                    <div class="ai-metric">
                        <div class="ai-metric-value">${healthScore}/100</div>
                        <div class="ai-metric-label">Health Score</div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="ai-metric">
                        <div class="ai-metric-value">${(savingsRate * 100).toFixed(1)}%</div>
                        <div class="ai-metric-label">Savings Rate</div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="ai-metric">
                        <div class="ai-metric-value">${prediction ? Math.round(prediction.confidence * 100) : '--'}%</div>
                        <div class="ai-metric-label">Prediction Confidence</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="ai-recommendations">
            <h6><i class="bi bi-lightbulb"></i> AI Recommendations</h6>
    `;
    
    if (insights.length === 0) {
        html += `<div class="text-center text-muted p-3">Add more transaction data for personalized recommendations</div>`;
    } else {
        // Combine insights and investment suggestions
        const allRecommendations = [...insights, ...investmentSuggestions].slice(0, 8);
        
        allRecommendations.forEach(insight => {
            html += `
                <div class="ai-recommendation ai-${insight.type}">
                    <i class="bi ${insight.icon}"></i>
                    <span>${insight.message}</span>
                </div>
            `;
        });
    }
    
    html += `</div>`;
    
    // Add prediction if available
    if (prediction && prediction.confidence > 0.6) {
        html += `
            <div class="ai-prediction mt-3">
                <h6><i class="bi bi-magic"></i> Spending Forecast</h6>
                <div class="prediction-card">
                    <div class="prediction-amount">${prediction.amount.toLocaleString()} ${currency}</div>
                    <div class="prediction-label">Expected next month spending</div>
                    <div class="prediction-note">
                        <small class="text-muted">Based on ${Math.round(prediction.confidence * 100)}% confidence from ${prediction.source === 'user_expectation' ? 'your expectations' : 'your spending patterns'}</small>
                    </div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
    modal.show();
}

function applyAISuggestions() {
    // This would implement the AI suggestions
    // For now, just show a toast
    showToast('AI suggestions applied to your financial plan', 'success');
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('aiInsightsModal'));
    if (modal) {
        modal.hide();
    }
}

// Add event listeners for analytics
document.addEventListener('DOMContentLoaded', function() {
    // Overview chart type change
    const overviewChartType = document.getElementById('overviewChartType');
    if (overviewChartType) {
        overviewChartType.addEventListener('change', renderOverviewChart);
    }
    
    // Comparison filters change
    const comparisonType = document.getElementById('comparisonType');
    const comparisonPeriod1 = document.getElementById('comparisonPeriod1');
    const comparisonPeriod2 = document.getElementById('comparisonPeriod2');
    
    if (comparisonType) {
        comparisonType.addEventListener('change', function() {
            setTimeout(() => {
                renderComparisonChart();
                renderChangeAnalysis();
                renderAverageComparison();
            }, 100);
        });
    }
    
    if (comparisonPeriod1 && comparisonPeriod2) {
        comparisonPeriod1.addEventListener('change', function() {
            renderComparisonChart();
            renderChangeAnalysis();
            renderAverageComparison();
        });
        
        comparisonPeriod2.addEventListener('change', function() {
            renderComparisonChart();
            renderChangeAnalysis();
            renderAverageComparison();
        });
    }
    
    // Analytics tab navigation
    const analyticsTabs = document.querySelectorAll('#analyticsTabs button');
    analyticsTabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function() {
            const target = this.getAttribute('data-bs-target');
            if (target === '#predictions') {
                renderPredictionsTab();
            } else if (target === '#trends') {
                renderTrendsTab();
            } else if (target === '#comparison') {
                renderComparisonTab();
            }
        });
    });
});

// Import/Export
document.getElementById('exportBtn').onclick = function() {
    const data = {
        transactions,
        categories,
        currency,
        monthlyBudgets,
        userExpectations
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:"application/json"}));
    const a = document.createElement("a");
    a.href = url;
    a.download = "wealth-command-backup.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Data exported successfully', 'success');
};

document.getElementById('importBtn').onclick = function() {
    document.getElementById('importFile').click();
};

document.getElementById('importFile').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const data = JSON.parse(ev.target.result);
            if (Array.isArray(data.transactions)) transactions = data.transactions;
            if (Array.isArray(data.categories)) categories = data.categories;
            if (typeof data.currency === "string") currency = data.currency;
            if (data.monthlyBudgets) monthlyBudgets = data.monthlyBudgets;
            if (data.userExpectations) userExpectations = data.userExpectations;
            
            saveTransactions(transactions);
            saveCategories(categories);
            saveCurrency(currency);
            saveMonthlyBudgets(monthlyBudgets);
            saveUserExpectations(userExpectations);
            
            renderCategoryList();
            populateSummaryFilters();
            updateUI();
            showToast("Import successful!", "success");
        } catch {
            showToast("Import failed: Invalid file.", "danger");
        }
    };
    reader.readAsText(file);
};

// LocalStorage handlers with auto-sync
function loadTransactions() {
    try {
        return JSON.parse(localStorage.getItem('transactions')) || [];
    } catch {
        return [];
    }
}

function saveTransactions(arr) {
    transactions = arr;
    localStorage.setItem('transactions', JSON.stringify(arr));
    calculateMonthlyRollover();
    autoSyncToDrive();
}

function loadCategories() {
    try {
        const cats = JSON.parse(localStorage.getItem('categories'));
        if (Array.isArray(cats) && cats.length > 0) {
            if (typeof cats[0] === 'string') {
                const migratedCats = cats.map(name => ({
                    name: name,
                    type: 'expense'
                }));
                saveCategories(migratedCats);
                return migratedCats;
            }
            return cats;
        }
        return [
            { name: "Salary", type: "income" },
            { name: "Food", type: "expense" },
            { name: "Shopping", type: "expense" },
            { name: "Utilities", type: "expense" }
        ];
    } catch {
        return [
            { name: "Salary", type: "income" },
            { name: "Food", type: "expense" },
            { name: "Shopping", type: "expense" },
            { name: "Utilities", type: "expense" }
        ];
    }
}

function saveCategories(arr) {
    categories = arr;
    localStorage.setItem('categories', JSON.stringify(arr));
    autoSyncToDrive();
}

function loadCurrency() {
    return localStorage.getItem("currency");
}

function saveCurrency(val) {
    currency = val;
    localStorage.setItem("currency", val);
    autoSyncToDrive();
}

// Overview chart type change
const overviewChartType = document.getElementById('overviewChartType');
if (overviewChartType) {
    overviewChartType.addEventListener('change', renderOverviewChart);
}

// Enhanced Dark Mode Toggle (without toast)
document.getElementById('darkModeToggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    this.checked = document.body.classList.contains('dark-mode');
    
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});

// Initialize dark mode from system preference or saved setting
(function () {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            document.body.classList.add('dark-mode');
            darkModeToggle.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            darkModeToggle.checked = false;
        }
    }
})();

// Service Worker Registration for Offline PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/Wealth-Command/service-worker.js')
            .then(registration => {
                console.log('SW registered successfully: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Initialize all enhanced analytics
function initializeEnhancedAnalytics() {
    // Enhanced heat map
    const heatMapMonth = document.getElementById('heatMapMonth');
    const heatMapYear = document.getElementById('heatMapYear');
    
    if (heatMapMonth && heatMapYear) {
        heatMapMonth.addEventListener('change', renderEnhancedHeatMap);
        heatMapYear.addEventListener('change', renderEnhancedHeatMap);
    }
    
    // Enhanced comparison
    const comparisonType = document.getElementById('comparisonType');
    if (comparisonType) {
        comparisonType.addEventListener('change', function() {
            if (this.value === 'average') {
                renderAverageComparison();
            } else {
                const section = document.getElementById('averageComparisonSection');
                if (section) section.classList.add('d-none');
            }
        });
    }
    
    // Initialize enhanced views
    setTimeout(() => {
        renderEnhancedHeatMap();
        renderEnhancedCategoryTrends();
    }, 1000);
}

// Final Initialization
document.addEventListener('DOMContentLoaded', function() {
    function initializeApplicationData() {
        if (categories.length === 0) {
            categories = loadCategories();
            saveCategories(categories);
        }
        
        if (transactions.length === 0) {
            transactions = loadTransactions();
        }
        
        currency = loadCurrency() || "PKR";
        monthlyBudgets = loadMonthlyBudgets();
        userExpectations = loadUserExpectations();
        
        calculateMonthlyRollover();
        
        updateUI();
        populateSummaryFilters();
        renderCategoryList();
        
        const autoRolloverToggle = document.getElementById('autoRolloverToggle');
        const allowNegativeToggle = document.getElementById('allowNegativeRollover');
        
        if (autoRolloverToggle) {
            const currentMonth = getCurrentMonthKey();
            autoRolloverToggle.checked = monthlyBudgets[currentMonth]?.autoRollover !== false;
            autoRolloverToggle.addEventListener('change', function() {
                Object.keys(monthlyBudgets).forEach(month => {
                    monthlyBudgets[month].autoRollover = this.checked;
                });
                saveMonthlyBudgets(monthlyBudgets);
                calculateMonthlyRollover();
                updateUI();
            });
        }
        
        if (allowNegativeToggle) {
            const currentMonth = getCurrentMonthKey();
            allowNegativeToggle.checked = monthlyBudgets[currentMonth]?.allowNegative === true;
            allowNegativeToggle.addEventListener('change', function() {
                Object.keys(monthlyBudgets).forEach(month => {
                    monthlyBudgets[month].allowNegative = this.checked;
                });
                saveMonthlyBudgets(monthlyBudgets);
                calculateMonthlyRollover();
                updateUI();
            });
        }
        
        // Initialize user expectations in predictions tab
        const expectedIncomeInput = document.getElementById('expectedIncome');
        const expectedExpensesInput = document.getElementById('expectedExpenses');
        
        if (expectedIncomeInput && userExpectations.expectedMonthlyIncome > 0) {
            expectedIncomeInput.value = userExpectations.expectedMonthlyIncome;
        }
        
        if (expectedExpensesInput && userExpectations.expectedMonthlyExpenses > 0) {
            expectedExpensesInput.value = userExpectations.expectedMonthlyExpenses;
        }
    }

    initializeApplicationData();
    
    // Initialize tab state
    initTabState();
    
    // Initialize enhanced analytics
    initializeEnhancedAnalytics();
    
    // Initialize Google Auth and sync
    const savedUser = localStorage.getItem('googleUser');
    if (savedUser) {
        try {
            googleUser = JSON.parse(savedUser);
            const tokenAge = Date.now() - googleUser.acquired_at;
            if (tokenAge > (googleUser.expires_in - 60) * 1000) {
                localStorage.removeItem('googleUser');
                googleUser = null;
                showSyncStatus('offline', 'Session expired. Please sign in again.');
            } else {
                showSyncStatus('success', 'Google Drive connected');
                loadDataFromDrive().then(success => {
                    if (!success) {
                        initializeApplicationData();
                    }
                });
            }
        } catch (error) {
            console.error('Error parsing saved user:', error);
            localStorage.removeItem('googleUser');
            googleUser = null;
            showSyncStatus('offline', 'Error loading saved session');
        }
    } else {
        showSyncStatus('offline', 'Sign in to sync with Google Drive');
    }
    
    setTimeout(() => {
        initGoogleAuth();
        updateProfileUI();
    }, 100);
    
    setTimeout(() => {
        const manualSyncBtn = document.getElementById('manualSyncSettings');
        if (manualSyncBtn) {
            manualSyncBtn.addEventListener('click', manualSync);
        }
    }, 200);
    
    // Start periodic sync
    startPeriodicSync();
    
    console.log('Wealth Command initialized successfully');
});
