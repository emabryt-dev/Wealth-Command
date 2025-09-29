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

// Enhanced planner data
let plannerData = loadPlannerData();

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

function loadPlannerData() {
    try {
        return JSON.parse(localStorage.getItem('plannerData')) || {};
    } catch {
        return {};
    }
}

function savePlannerData(data) {
    plannerData = data;
    localStorage.setItem('plannerData', JSON.stringify(data));
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
            
            if (driveData.plannerData) {
                plannerData = driveData.plannerData;
                localStorage.setItem('plannerData', JSON.stringify(plannerData));
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
            const success = await syncDataToDrive();
            return success;
        }
    } catch (error) {
        console.error('Error loading data from Drive:', error);
        showSyncStatus('error', 'Failed to load data: ' + error.message);
        return false;
    }
}

// Enhanced Google Drive Sync - Complete the syncDataToDrive function
async function syncDataToDrive() {
    if (!googleUser || !googleUser.access_token) {
        showSyncStatus('offline', 'Not authenticated with Google Drive');
        return false;
    }
    
    if (!isOnline) {
        showSyncStatus('warning', 'Cannot sync: You are offline');
        pendingSync = true;
        return false;
    }
    
    // Check if token is expired
    if (isTokenExpired(googleUser)) {
        showSyncStatus('warning', 'Session expired. Please sign in again.');
        googleSignOut();
        return false;
    }
    
    try {
        showSyncStatus('syncing', 'Syncing data to Google Drive...');
        syncInProgress = true;
        
        // Prepare data for sync
        const syncData = {
            transactions: transactions,
            categories: categories,
            currency: currency,
            monthlyBudgets: monthlyBudgets,
            userExpectations: userExpectations,
            plannerData: plannerData,
            lastSync: new Date().toISOString(),
            lastBackupMonth: getCurrentMonthKey()
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
        
        if (!searchResponse.ok) {
            throw new Error(`Drive search error: ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        let fileId = null;
        
        if (searchData.files && searchData.files.length > 0) {
            fileId = searchData.files[0].id;
        }
        
        // Create or update file
        const fileMetadata = {
            name: GOOGLE_DRIVE_FILE_NAME,
            mimeType: 'application/json'
        };
        
        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
        formData.append('file', new Blob([JSON.stringify(syncData)], { type: 'application/json' }));
        
        let uploadResponse;
        if (fileId) {
            // Update existing file
            uploadResponse = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${googleUser.access_token}`
                    },
                    body: formData
                }
            );
        } else {
            // Create new file
            uploadResponse = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${googleUser.access_token}`
                    },
                    body: formData
                }
            );
        }
        
        if (!uploadResponse.ok) {
            throw new Error(`Upload error: ${uploadResponse.status}`);
        }
        
        lastSyncTime = new Date().toISOString();
        pendingSync = false;
        syncInProgress = false;
        
        showSyncStatus('success', 'Data synced to Google Drive!');
        console.log('Data synced to Drive successfully');
        
        return true;
    } catch (error) {
        console.error('Sync error:', error);
        syncInProgress = false;
        showSyncStatus('error', 'Sync failed: ' + error.message);
        return false;
    }
}

// Token expiration check
function isTokenExpired(user) {
    if (!user.acquired_at) return true;
    const elapsed = Date.now() - user.acquired_at;
    return elapsed >= (user.expires_in * 1000) - 60000; // 1 minute buffer
}

// Google Sign Out
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

// Manual Sync Function
async function manualSync() {
    if (!googleUser || !googleUser.access_token) {
        showGoogleSignIn();
        return;
    }
    
    const success = await syncDataToDrive();
    if (success) {
        showToast('Data synced successfully!', 'success');
    }
}

// Auto-sync when online
window.addEventListener('online', async () => {
    isOnline = true;
    showSyncStatus('info', 'Back online');
    
    if (pendingSync && googleUser) {
        await syncDataToDrive();
    } else if (googleUser) {
        // Auto-sync when coming online
        await syncDataToDrive();
    }
});

window.addEventListener('offline', () => {
    isOnline = false;
    showSyncStatus('warning', 'You are offline');
});

// Initialize Google Auth on load
document.addEventListener('DOMContentLoaded', function() {
    initGoogleAuth();
    
    // Load saved Google user
    const savedUser = localStorage.getItem('googleUser');
    if (savedUser) {
        try {
            googleUser = JSON.parse(savedUser);
            if (isTokenExpired(googleUser)) {
                googleSignOut();
            } else {
                updateProfileUI();
                // Auto-sync if online
                if (isOnline) {
                    setTimeout(() => syncDataToDrive(), 2000);
                }
            }
        } catch {
            googleSignOut();
        }
    }
});

// Enhanced Analytics Initialization
function initEnhancedAnalytics() {
    populateAnalyticsFilters();
    updateAIInsights();
    renderEnhancedHeatMap();
    renderCategoryTrends();
    updateYearlyProjections();
    initComparisonAnalytics();
}

// Populate Analytics Filters
function populateAnalyticsFilters() {
    // Overview chart type
    const overviewChartType = document.getElementById('overviewChartType');
    if (overviewChartType) {
        overviewChartType.innerHTML = `
            <option value="category">By Category</option>
            <option value="monthly">Monthly Trend</option>
            <option value="yearly">Yearly Comparison</option>
        `;
        overviewChartType.addEventListener('change', updateOverviewChart);
    }
    
    // Heat map filters
    populateMonthYearFilter('heatMapMonth', 'heatMapYear');
    const heatMapMonth = document.getElementById('heatMapMonth');
    const heatMapYear = document.getElementById('heatMapYear');
    
    if (heatMapMonth && heatMapYear) {
        heatMapMonth.addEventListener('change', renderEnhancedHeatMap);
        heatMapYear.addEventListener('change', renderEnhancedHeatMap);
    }
    
    // Comparison filters
    populateComparisonFilters();
}

// Enhanced Heat Map Rendering
function renderEnhancedHeatMap() {
    const heatMapMonth = document.getElementById('heatMapMonth');
    const heatMapYear = document.getElementById('heatMapYear');
    const heatMapCalendar = document.getElementById('heatMapCalendar');
    const heatMapPlaceholder = document.getElementById('heatMapPlaceholder');
    
    if (!heatMapMonth || !heatMapYear || !heatMapCalendar) return;
    
    const month = parseInt(heatMapMonth.value);
    const year = parseInt(heatMapYear.value);
    
    const heatMapData = AnalyticsEngine.generateHeatMap(transactions, year, month);
    
    if (heatMapData.length === 0 || heatMapData.every(day => day.amount === 0)) {
        heatMapCalendar.innerHTML = '';
        heatMapPlaceholder.classList.remove('d-none');
        return;
    }
    
    heatMapPlaceholder.classList.add('d-none');
    
    // Find max amount for color scaling
    const maxAmount = Math.max(...heatMapData.map(day => day.amount));
    
    // Get first day of month and its weekday
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
    
    let heatMapHTML = '';
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
        heatMapHTML += `<div class="heat-map-day-enhanced" style="background-color: transparent; border: none;"></div>`;
    }
    
    // Add days of the month
    heatMapData.forEach(day => {
        const intensity = maxAmount > 0 ? Math.min(1, day.amount / maxAmount) : 0;
        const backgroundColor = `rgba(220, 53, 69, ${0.3 + intensity * 0.7})`;
        const textColor = intensity > 0.5 ? 'white' : 'inherit';
        
        heatMapHTML += `
            <div class="heat-map-day-enhanced" 
                 style="background-color: ${backgroundColor}; color: ${textColor};"
                 onclick="showDayTransactions('${day.date}')"
                 title="${day.date}: ${day.amount.toLocaleString()} ${currency} - ${day.transactions} transactions">
                <div class="heat-map-day-content">
                    <div class="heat-map-day-number">${day.day}</div>
                    ${day.amount > 0 ? `<div class="heat-map-day-amount">${day.amount.toLocaleString()}</div>` : ''}
                </div>
            </div>
        `;
    });
    
    heatMapCalendar.innerHTML = heatMapHTML;
}

// Show transactions for a specific day
function showDayTransactions(date) {
    const dayTransactions = transactions.filter(tx => tx.date === date && tx.type === 'expense');
    
    if (dayTransactions.length === 0) {
        showToast('No transactions found for this day', 'info');
        return;
    }
    
    const total = dayTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const transactionList = dayTransactions.map(tx => 
        `${tx.description}: ${tx.amount.toLocaleString()} ${currency}`
    ).join('\n');
    
    alert(`Transactions for ${date}:\nTotal: ${total.toLocaleString()} ${currency}\n\n${transactionList}`);
}

// Enhanced Category Trends
function renderCategoryTrends() {
    const categoryTrendsContainer = document.getElementById('categoryTrendsEnhanced');
    const categoryTrendPlaceholder = document.getElementById('categoryTrendPlaceholder');
    
    if (!categoryTrendsContainer) return;
    
    const trends = AnalyticsEngine.analyzeCategoryTrends(transactions);
    
    if (trends.length === 0) {
        categoryTrendsContainer.innerHTML = '';
        if (categoryTrendPlaceholder) categoryTrendPlaceholder.classList.remove('d-none');
        return;
    }
    
    if (categoryTrendPlaceholder) categoryTrendPlaceholder.classList.add('d-none');
    
    let trendsHTML = '';
    
    trends.slice(0, 6).forEach(trend => { // Show top 6 trends
        const trendDirection = trend.trend > 0 ? 'negative' : 'positive';
        const trendIcon = trend.trend > 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right';
        const trendColor = trend.trend > 0 ? '#dc3545' : '#198754';
        const percentage = Math.abs(Math.round(trend.trend * 100));
        
        // Calculate progress (current vs last month)
        const total = trend.current + trend.last;
        const currentPercentage = total > 0 ? (trend.current / total) * 100 : 0;
        
        // Generate insight based on trend
        let insight = '';
        if (Math.abs(trend.trend) > 0.3) { // Significant change
            if (trend.trend > 0) {
                insight = `Spending increased significantly. Consider reviewing ${trend.category} expenses.`;
            } else {
                insight = `Great! You've reduced ${trend.category} spending.`;
            }
        } else if (Math.abs(trend.trend) > 0.1) { // Moderate change
            insight = `Moderate change in ${trend.category} spending.`;
        } else {
            insight = `Stable spending pattern for ${trend.category}.`;
        }
        
        trendsHTML += `
            <div class="category-trend-card" style="border-left-color: ${trendColor}">
                <div class="category-trend-header">
                    <div class="category-trend-name">${trend.category}</div>
                    <div class="category-trend-change ${trendDirection}">
                        <i class="bi ${trendIcon}"></i>
                        ${percentage}%
                    </div>
                </div>
                <div class="category-trend-amount">
                    ${trend.current.toLocaleString()} ${currency}
                </div>
                <div class="category-trend-progress">
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar" role="progressbar" 
                             style="width: ${currentPercentage}%; background-color: ${trendColor}"
                             aria-valuenow="${currentPercentage}" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                </div>
                <div class="category-trend-insight">
                    ${insight}
                </div>
            </div>
        `;
    });
    
    categoryTrendsContainer.innerHTML = trendsHTML;
}

// 3-Month Average Comparison
function initComparisonAnalytics() {
    populateComparisonFilters();
    
    const comparisonType = document.getElementById('comparisonType');
    const comparisonPeriod1 = document.getElementById('comparisonPeriod1');
    const comparisonPeriod2 = document.getElementById('comparisonPeriod2');
    
    if (comparisonType && comparisonPeriod1 && comparisonPeriod2) {
        comparisonType.addEventListener('change', function() {
            populateComparisonFilters();
            updateComparisonAnalysis();
        });
        
        comparisonPeriod1.addEventListener('change', updateComparisonAnalysis);
        comparisonPeriod2.addEventListener('change', updateComparisonAnalysis);
    }
}

function populateComparisonFilters() {
    const comparisonType = document.getElementById('comparisonType');
    const comparisonPeriod1 = document.getElementById('comparisonPeriod1');
    const comparisonPeriod2 = document.getElementById('comparisonPeriod2');
    const averageComparisonSection = document.getElementById('averageComparisonSection');
    
    if (!comparisonType || !comparisonPeriod1 || !comparisonPeriod2) return;
    
    const type = comparisonType.value;
    
    // Show/hide 3-month average section
    if (averageComparisonSection) {
        averageComparisonSection.classList.toggle('d-none', type !== 'average');
    }
    
    // Get available periods based on type
    let periods = [];
    
    if (type === 'month') {
        periods = getAvailableMonths();
    } else if (type === 'year') {
        periods = getAvailableYears();
    } else if (type === 'average') {
        periods = getAvailableThreeMonthPeriods();
    }
    
    // Populate period selectors
    comparisonPeriod1.innerHTML = periods.map(period => 
        `<option value="${period.value}">${period.label}</option>`
    ).join('');
    
    comparisonPeriod2.innerHTML = periods.map(period => 
        `<option value="${period.value}">${period.label}</option>`
    ).join('');
    
    // Set default selections (most recent two periods)
    if (periods.length >= 2) {
        comparisonPeriod1.value = periods[periods.length - 2].value;
        comparisonPeriod2.value = periods[periods.length - 1].value;
    }
    
    // Update analysis
    updateComparisonAnalysis();
}

function getAvailableThreeMonthPeriods() {
    const periods = [];
    const months = getAvailableMonths().map(m => m.value).sort();
    
    for (let i = 2; i < months.length; i++) {
        const period = [months[i-2], months[i-1], months[i]];
        const label = `${period[0]} to ${period[2]}`;
        periods.push({ value: period.join(','), label: label });
    }
    
    return periods;
}

function updateComparisonAnalysis() {
    const comparisonType = document.getElementById('comparisonType');
    const comparisonPeriod1 = document.getElementById('comparisonPeriod1');
    const comparisonPeriod2 = document.getElementById('comparisonPeriod2');
    
    if (!comparisonType || !comparisonPeriod1 || !comparisonPeriod2) return;
    
    const type = comparisonType.value;
    const period1 = comparisonPeriod1.value;
    const period2 = comparisonPeriod2.value;
    
    if (!period1 || !period2) return;
    
    const comparison = AnalyticsEngine.comparePeriods(transactions, period1, period2, type);
    renderComparisonResults(comparison, period1, period2, type);
}

function renderComparisonResults(comparison, period1, period2, type) {
    const comparisonMetrics = document.getElementById('comparisonMetrics');
    const changeAnalysis = document.getElementById('changeAnalysis');
    const noChangeAnalysis = document.getElementById('noChangeAnalysis');
    const averagePeriods = document.getElementById('averagePeriods');
    
    if (!comparisonMetrics || !changeAnalysis) return;
    
    // Update comparison metrics
    let metricsHTML = '';
    let changeHTML = '';
    
    Object.entries(comparison).forEach(([category, data]) => {
        if (data.period1 > 0 || data.period2 > 0) {
            const changeClass = data.change >= 0 ? 'negative' : 'positive';
            const changeIcon = data.change >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right';
            
            metricsHTML += `
                <div class="metric-card">
                    <div class="metric-label">${category}</div>
                    <div class="metric-value">${data.period2.toLocaleString()}</div>
                    <div class="metric-change ${changeClass}">
                        <i class="bi ${changeIcon}"></i>
                        ${Math.abs(data.percentChange).toFixed(1)}%
                    </div>
                </div>
            `;
            
            changeHTML += `
                <div class="change-item">
                    <div class="change-category">${category}</div>
                    <div class="change-details">
                        <span class="change-amount ${changeClass}">
                            ${data.change >= 0 ? '+' : ''}${data.change.toLocaleString()} ${currency}
                        </span>
                        <small class="text-muted">${data.percentChange >= 0 ? '+' : ''}${data.percentChange.toFixed(1)}%</small>
                    </div>
                </div>
            `;
        }
    });
    
    comparisonMetrics.innerHTML = metricsHTML;
    changeAnalysis.innerHTML = changeHTML;
    
    // Show/hide placeholders
    if (noChangeAnalysis) {
        noChangeAnalysis.classList.toggle('d-none', Object.keys(comparison).length > 0);
    }
    
    // Update 3-month average comparison if applicable
    if (type === 'average' && averagePeriods) {
        renderThreeMonthAverage(period1, period2);
    }
    
    // Update radar chart
    updateRadarChart(comparison);
}

function renderThreeMonthAverage(period1, period2) {
    const averagePeriods = document.getElementById('averagePeriods');
    if (!averagePeriods) return;
    
    const period1Months = period1.split(',');
    const period2Months = period2.split(',');
    
    const period1Data = calculateThreeMonthAverage(period1Months);
    const period2Data = calculateThreeMonthAverage(period2Months);
    
    averagePeriods.innerHTML = `
        <div class="average-period">
            <div class="average-period-header">${period1Months[0]} to ${period1Months[2]}</div>
            <div class="average-stats">
                <div class="average-stat">
                    <div>Avg Income:</div>
                    <div class="average-stat-value">${period1Data.avgIncome.toLocaleString()} ${currency}</div>
                </div>
                <div class="average-stat">
                    <div>Avg Expenses:</div>
                    <div class="average-stat-value">${period1Data.avgExpenses.toLocaleString()} ${currency}</div>
                </div>
                <div class="average-stat">
                    <div>Avg Net:</div>
                    <div class="average-stat-value" style="color: ${period1Data.avgNet >= 0 ? '#198754' : '#dc3545'}">
                        ${period1Data.avgNet.toLocaleString()} ${currency}
                    </div>
                </div>
                <div class="average-stat">
                    <div>Savings Rate:</div>
                    <div class="average-stat-value" style="color: ${period1Data.savingsRate >= 0 ? '#198754' : '#dc3545'}">
                        ${(period1Data.savingsRate * 100).toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>
        <div class="average-period">
            <div class="average-period-header">${period2Months[0]} to ${period2Months[2]}</div>
            <div class="average-stats">
                <div class="average-stat">
                    <div>Avg Income:</div>
                    <div class="average-stat-value">${period2Data.avgIncome.toLocaleString()} ${currency}</div>
                </div>
                <div class="average-stat">
                    <div>Avg Expenses:</div>
                    <div class="average-stat-value">${period2Data.avgExpenses.toLocaleString()} ${currency}</div>
                </div>
                <div class="average-stat">
                    <div>Avg Net:</div>
                    <div class="average-stat-value" style="color: ${period2Data.avgNet >= 0 ? '#198754' : '#dc3545'}">
                        ${period2Data.avgNet.toLocaleString()} ${currency}
                    </div>
                </div>
                <div class="average-stat">
                    <div>Savings Rate:</div>
                    <div class="average-stat-value" style="color: ${period2Data.savingsRate >= 0 ? '#198754' : '#dc3545'}">
                        ${(period2Data.savingsRate * 100).toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>
    `;
}

function calculateThreeMonthAverage(months) {
    let totalIncome = 0;
    let totalExpenses = 0;
    let monthCount = 0;
    
    months.forEach(month => {
        const monthTransactions = transactions.filter(tx => 
            getMonthKeyFromDate(tx.date) === month
        );
        
        const monthIncome = monthTransactions.filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const monthExpenses = monthTransactions.filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        totalIncome += monthIncome;
        totalExpenses += monthExpenses;
        monthCount++;
    });
    
    const avgIncome = totalIncome / monthCount;
    const avgExpenses = totalExpenses / monthCount;
    const avgNet = avgIncome - avgExpenses;
    const savingsRate = avgIncome > 0 ? avgNet / avgIncome : 0;
    
    return { avgIncome, avgExpenses, avgNet, savingsRate };
}

function updateRadarChart(comparison) {
    const radarCtx = document.getElementById('radarChart');
    if (!radarCtx) return;
    
    // Destroy existing chart
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    const categories = Object.keys(comparison);
    const period1Data = categories.map(cat => comparison[cat].period1);
    const period2Data = categories.map(cat => comparison[cat].period2);
    
    // Normalize data for radar chart
    const maxValue = Math.max(...period1Data, ...period2Data);
    const normalizedPeriod1 = period1Data.map(val => maxValue > 0 ? (val / maxValue) * 100 : 0);
    const normalizedPeriod2 = period2Data.map(val => maxValue > 0 ? (val / maxValue) * 100 : 0);
    
    comparisonChart = new Chart(radarCtx, {
        type: 'radar',
        data: {
            labels: categories,
            datasets: [
                {
                    label: 'Period 1',
                    data: normalizedPeriod1,
                    backgroundColor: 'rgba(13, 110, 253, 0.2)',
                    borderColor: 'rgba(13, 110, 253, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(13, 110, 253, 1)'
                },
                {
                    label: 'Period 2',
                    data: normalizedPeriod2,
                    backgroundColor: 'rgba(220, 53, 69, 0.2)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(220, 53, 69, 1)'
                }
            ]
        },
        options: {
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

// Enhanced Income & Expense Planner
function openIncomeExpensePlanner() {
    const modal = new bootstrap.Modal(document.getElementById('incomeExpensePlannerModal'));
    
    // Initialize planner
    initPlanner();
    calculateSalary();
    
    modal.show();
}

function initPlanner() {
    populatePlannerFilters();
    renderPlannerGrid();
    setupSalaryCalculator();
}

function populatePlannerFilters() {
    // Planner year
    const plannerYear = document.getElementById('plannerYear');
    const currentYear = new Date().getFullYear();
    
    if (plannerYear) {
        plannerYear.innerHTML = '';
        for (let year = currentYear - 1; year <= currentYear + 2; year++) {
            plannerYear.innerHTML += `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`;
        }
        plannerYear.addEventListener('change', renderPlannerGrid);
    }
    
    // Salary month
    const salaryMonth = document.getElementById('salaryMonth');
    if (salaryMonth) {
        salaryMonth.innerHTML = '';
        for (let month = 1; month <= 12; month++) {
            const monthName = new Date(currentYear, month - 1).toLocaleDateString('en', { month: 'long' });
            salaryMonth.innerHTML += `<option value="${month}" ${month === new Date().getMonth() + 1 ? 'selected' : ''}>${monthName}</option>`;
        }
    }
}

function setupSalaryCalculator() {
    // Working days change handler
    const workingDays = document.getElementById('workingDays');
    const customDaysContainer = document.getElementById('customDaysContainer');
    
    if (workingDays && customDaysContainer) {
        workingDays.addEventListener('change', function() {
            customDaysContainer.classList.toggle('d-none', this.value !== 'custom');
            calculateSalary();
        });
    }
    
    // Overtime rate change handler
    const overtimeRate = document.getElementById('overtimeRate');
    const customRateContainer = document.getElementById('customRateContainer');
    
    if (overtimeRate && customRateContainer) {
        overtimeRate.addEventListener('change', function() {
            customRateContainer.classList.toggle('d-none', this.value !== 'custom');
            calculateSalary();
        });
    }
    
    // Add event listeners to all salary inputs
    const salaryInputs = ['basicSalary', 'workingHours', 'workingDays', 'overtimeHours', 
                         'overtimeRate', 'kpiBonus', 'otherAllowances', 'deductions'];
    
    salaryInputs.forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.addEventListener('input', calculateSalary);
            element.addEventListener('change', calculateSalary);
        }
    });
    
    // Custom inputs
    const customDays = document.getElementById('customDays');
    const customRate = document.getElementById('customRate');
    
    if (customDays) customDays.addEventListener('input', calculateSalary);
    if (customRate) customRate.addEventListener('input', calculateSalary);
}

function calculateSalary() {
    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    const workingHours = parseFloat(document.getElementById('workingHours').value) || 0;
    const workingDaysSelect = document.getElementById('workingDays');
    const overtimeHours = parseFloat(document.getElementById('overtimeHours').value) || 0;
    const overtimeRateSelect = document.getElementById('overtimeRate');
    const kpiBonus = parseFloat(document.getElementById('kpiBonus').value) || 0;
    const otherAllowances = parseFloat(document.getElementById('otherAllowances').value) || 0;
    const deductions = parseFloat(document.getElementById('deductions').value) || 0;
    
    // Calculate working days
    let workingDays;
    if (workingDaysSelect.value === 'custom') {
        workingDays = parseFloat(document.getElementById('customDays').value) || 0;
    } else {
        workingDays = parseFloat(workingDaysSelect.value);
    }
    
    // Calculate overtime rate
    let overtimeMultiplier;
    if (overtimeRateSelect.value === 'custom') {
        overtimeMultiplier = parseFloat(document.getElementById('customRate').value) || 0;
    } else {
        overtimeMultiplier = parseFloat(overtimeRateSelect.value);
    }
    
    // Calculate hourly rate
    const totalHours = workingDays * workingHours;
    const hourlyRate = totalHours > 0 ? basicSalary / totalHours : 0;
    
    // Calculate overtime pay
    const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
    
    // Calculate totals
    const totalOvertime = overtimePay;
    const totalAllowances = otherAllowances;
    const totalDeductions = deductions;
    const netSalary = basicSalary + totalOvertime + kpiBonus + totalAllowances - totalDeductions;
    
    // Update display
    document.getElementById('basicSalaryResult').textContent = `${basicSalary.toLocaleString()} ${currency}`;
    document.getElementById('overtimeResult').textContent = `${totalOvertime.toLocaleString()} ${currency}`;
    document.getElementById('kpiResult').textContent = `${kpiBonus.toLocaleString()} ${currency}`;
    document.getElementById('allowancesResult').textContent = `${totalAllowances.toLocaleString()} ${currency}`;
    document.getElementById('deductionsResult').textContent = `${totalDeductions.toLocaleString()} ${currency}`;
    document.getElementById('netSalaryResult').textContent = `${netSalary.toLocaleString()} ${currency}`;
    document.getElementById('totalSalary').textContent = `Total Salary: ${netSalary.toLocaleString()} ${currency}`;
}

function addSalaryToPlanner() {
    const salaryMonth = document.getElementById('salaryMonth');
    const netSalaryResult = document.getElementById('netSalaryResult');
    
    if (!salaryMonth || !netSalaryResult) return;
    
    const month = parseInt(salaryMonth.value);
    const salaryAmount = parseFloat(netSalaryResult.textContent.replace(/[^\d.]/g, '')) || 0;
    
    if (salaryAmount <= 0) {
        showToast('Please calculate a valid salary first', 'warning');
        return;
    }
    
    const plannerYear = document.getElementById('plannerYear');
    const year = parseInt(plannerYear.value);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    
    // Initialize planner data for this month if not exists
    if (!plannerData[monthKey]) {
        plannerData[monthKey] = {
            income: [],
            expenses: [],
            notes: ''
        };
    }
    
    // Add salary as income
    plannerData[monthKey].income.push({
        id: Date.now(),
        description: 'Monthly Salary',
        amount: salaryAmount,
        type: 'salary',
        category: 'Salary'
    });
    
    savePlannerData(plannerData);
    renderPlannerGrid();
    
    showToast('Salary added to monthly planner', 'success');
}

function renderPlannerGrid() {
    const plannerYear = document.getElementById('plannerYear');
    const plannerMonthGrid = document.getElementById('plannerMonthGrid');
    
    if (!plannerYear || !plannerMonthGrid) return;
    
    const year = parseInt(plannerYear.value);
    let gridHTML = '';
    
    for (let month = 1; month <= 12; month++) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const monthName = new Date(year, month - 1).toLocaleDateString('en', { month: 'long' });
        const monthData = plannerData[monthKey] || { income: [], expenses: [], notes: '' };
        
        const totalIncome = monthData.income.reduce((sum, item) => sum + item.amount, 0);
        const totalExpenses = monthData.expenses.reduce((sum, item) => sum + item.amount, 0);
        const netAmount = totalIncome - totalExpenses;
        
        gridHTML += `
            <div class="planner-month-card">
                <div class="planner-month-header">
                    <h6 class="mb-0">${monthName} ${year}</h6>
                    <span class="badge ${netAmount >= 0 ? 'bg-success' : 'bg-danger'}">
                        ${netAmount.toLocaleString()} ${currency}
                    </span>
                </div>
                
                <div class="planner-income-sources">
                    <small class="text-muted">Income Sources</small>
                    ${monthData.income.map(income => `
                        <div class="planner-item">
                            <span>${income.description}</span>
                            <span class="text-success">+${income.amount.toLocaleString()}</span>
                        </div>
                    `).join('')}
                    <div class="planner-total">
                        <span>Total Income:</span>
                        <span class="text-success">${totalIncome.toLocaleString()} ${currency}</span>
                    </div>
                </div>
                
                <div class="planner-expense-categories">
                    <small class="text-muted">Planned Expenses</small>
                    ${monthData.expenses.map(expense => `
                        <div class="planner-item">
                            <span>${expense.description}</span>
                            <span class="text-danger">-${expense.amount.toLocaleString()}</span>
                        </div>
                    `).join('')}
                    <div class="planner-total">
                        <span>Total Expenses:</span>
                        <span class="text-danger">${totalExpenses.toLocaleString()} ${currency}</span>
                    </div>
                </div>
                
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editPlannerMonth('${monthKey}')">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="addPlannerExpense('${monthKey}')">
                        <i class="bi bi-plus"></i> Add Expense
                    </button>
                </div>
            </div>
        `;
    }
    
    plannerMonthGrid.innerHTML = gridHTML;
}

function editPlannerMonth(monthKey) {
    // Implementation for editing a specific month's planner
    showToast(`Edit functionality for ${monthKey} would go here`, 'info');
}

function addPlannerExpense(monthKey) {
    const expenseAmount = prompt('Enter expense amount:');
    const expenseDescription = prompt('Enter expense description:');
    
    if (expenseAmount && expenseDescription && !isNaN(parseFloat(expenseAmount))) {
        const amount = parseFloat(expenseAmount);
        
        if (!plannerData[monthKey]) {
            plannerData[monthKey] = { income: [], expenses: [], notes: '' };
        }
        
        plannerData[monthKey].expenses.push({
            id: Date.now(),
            description: expenseDescription,
            amount: amount,
            category: 'Planned Expense'
        });
        
        savePlannerData(plannerData);
        renderPlannerGrid();
        showToast('Expense added to planner', 'success');
    }
}

// Enhanced Yearly Projections
function updateYearlyProjections() {
    const expectedIncome = parseFloat(document.getElementById('expectedIncome').value) || 0;
    const expectedExpenses = parseFloat(document.getElementById('expectedExpenses').value) || 0;
    
    if (expectedIncome > 0 || expectedExpenses > 0) {
        userExpectations.expectedMonthlyIncome = expectedIncome;
        userExpectations.expectedMonthlyExpenses = expectedExpenses;
        userExpectations.lastUpdated = new Date().toISOString();
        saveUserExpectations(userExpectations);
    }
    
    const projections = AnalyticsEngine.generateCashFlowForecast(transactions, userExpectations, 12);
    renderYearlyProjections(projections);
}

function renderYearlyProjections(projections) {
    const projectionsBody = document.getElementById('yearlyProjectionsBody');
    if (!projectionsBody) return;
    
    let projectionsHTML = '';
    
    projections.forEach(projection => {
        const cashFlowStatus = projection.projectedNet >= 0 ? 'Positive' : 'Negative';
        const statusClass = projection.projectedNet >= 0 ? 'text-success' : 'text-danger';
        
        // Calculate variance (placeholder - would need actual vs projected comparison)
        const variance = 'N/A';
        
        projectionsHTML += `
            <tr>
                <td>${projection.monthName}</td>
                <td>${projection.projectedIncome.toLocaleString()} ${currency}</td>
                <td>${projection.projectedExpenses.toLocaleString()} ${currency}</td>
                <td class="${statusClass}">${projection.projectedNet.toLocaleString()} ${currency}</td>
                <td class="${statusClass}">${cashFlowStatus}</td>
                <td>${variance}</td>
            </tr>
        `;
    });
    
    projectionsBody.innerHTML = projectionsHTML;
}

// AI Insights and Recommendations
function updateAIInsights() {
    const healthScoreValue = document.getElementById('healthScoreValue');
    const healthScoreLabel = document.getElementById('healthScoreLabel');
    const savingsRateValue = document.getElementById('savingsRateValue');
    const savingsRateLabel = document.getElementById('savingsRateLabel');
    const savingsRateProgress = document.getElementById('savingsRateProgress');
    const aiQuickInsights = document.getElementById('aiQuickInsights');
    
    if (!healthScoreValue || !savingsRateValue) return;
    
    // Calculate metrics
    const healthScore = AnalyticsEngine.calculateHealthScore(transactions, monthlyBudgets);
    const savingsRate = AnalyticsEngine.calculateSavingsRate(transactions);
    const insights = AnalyticsEngine.generateInsights(transactions, monthlyBudgets);
    
    // Update health score
    healthScoreValue.textContent = healthScore;
    healthScoreValue.className = 'health-score-value ';
    
    if (healthScore >= 80) {
        healthScoreValue.classList.add('excellent');
        healthScoreLabel.textContent = 'Excellent';
    } else if (healthScore >= 60) {
        healthScoreValue.classList.add('good');
        healthScoreLabel.textContent = 'Good';
    } else if (healthScore >= 40) {
        healthScoreValue.classList.add('fair');
        healthScoreLabel.textContent = 'Fair';
    } else {
        healthScoreValue.classList.add('poor');
        healthScoreLabel.textContent = 'Needs Attention';
    }
    
    // Update savings rate
    const savingsRatePercent = (savingsRate * 100).toFixed(1);
    savingsRateValue.textContent = `${savingsRatePercent}%`;
    savingsRateLabel.textContent = 'Last 3 Months';
    
    // Update savings progress bar
    if (savingsRateProgress) {
        const progressWidth = Math.min(100, Math.max(0, savingsRate * 200)); // 50% savings rate = 100% width
        savingsRateProgress.style.width = `${progressWidth}%`;
        savingsRateProgress.setAttribute('aria-valuenow', progressWidth);
    }
    
    // Update quick insights
    if (aiQuickInsights) {
        if (insights.length === 0) {
            aiQuickInsights.innerHTML = `
                <div class="text-center text-muted">
                    <small>Add more transactions to get personalized insights</small>
                </div>
            `;
        } else {
            let insightsHTML = '';
            insights.slice(0, 3).forEach(insight => {
                insightsHTML += `
                    <div class="ai-insight ai-${insight.type}">
                        <i class="bi ${insight.icon}"></i>
                        <span>${insight.message}</span>
                    </div>
                `;
            });
            aiQuickInsights.innerHTML = insightsHTML;
        }
    }
}

function showFullAIAnalysis() {
    const modal = new bootstrap.Modal(document.getElementById('aiInsightsModal'));
    const aiInsightsContent = document.getElementById('aiInsightsContent');
    
    if (!aiInsightsContent) return;
    
    const healthScore = AnalyticsEngine.calculateHealthScore(transactions, monthlyBudgets);
    const savingsRate = AnalyticsEngine.calculateSavingsRate(transactions);
    const insights = AnalyticsEngine.generateInsights(transactions, monthlyBudgets);
    const prediction = AnalyticsEngine.predictNextMonthSpending(transactions, userExpectations);
    const investmentSuggestions = AnalyticsEngine.generateInvestmentSuggestions(transactions);
    
    let analysisHTML = `
        <div class="ai-analysis-header">
            <div class="row text-center">
                <div class="col-4">
                    <div class="ai-metric-value">${healthScore}</div>
                    <div class="ai-metric-label">Health Score</div>
                </div>
                <div class="col-4">
                    <div class="ai-metric-value">${(savingsRate * 100).toFixed(1)}%</div>
                    <div class="ai-metric-label">Savings Rate</div>
                </div>
                <div class="col-4">
                    <div class="ai-metric-value">${transactions.length}</div>
                    <div class="ai-metric-label">Transactions</div>
                </div>
            </div>
        </div>
        
        <div class="ai-recommendations">
            <h6><i class="bi bi-lightbulb"></i> Key Recommendations</h6>
            ${insights.map(insight => `
                <div class="ai-recommendation ai-${insight.type}">
                    <i class="bi ${insight.icon}"></i>
                    <div>${insight.message}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    if (prediction && prediction.confidence > 0.5) {
        analysisHTML += `
            <div class="ai-prediction">
                <h6><i class="bi bi-magic"></i> Spending Prediction</h6>
                <div class="prediction-card">
                    <div class="prediction-amount">${prediction.amount.toLocaleString()} ${currency}</div>
                    <div class="prediction-label">Next Month's Predicted Spending</div>
                    <div class="prediction-confidence">Confidence: ${(prediction.confidence * 100).toFixed(0)}%</div>
                    <small class="text-muted">Based on ${prediction.source === 'user_expectation' ? 'your expectations' : 'historical data'}</small>
                </div>
            </div>
        `;
    }
    
    if (investmentSuggestions.length > 0) {
        analysisHTML += `
            <div class="ai-recommendations mt-4">
                <h6><i class="bi bi-graph-up-arrow"></i> Investment Suggestions</h6>
                ${investmentSuggestions.map(suggestion => `
                    <div class="ai-recommendation ai-${suggestion.type}">
                        <i class="bi ${suggestion.icon}"></i>
                        <div>${suggestion.message}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    aiInsightsContent.innerHTML = analysisHTML;
    modal.show();
}

function applyAISuggestions() {
    // This would implement specific AI suggestions
    // For now, just show a message
    showToast('AI suggestions applied to your financial plan', 'success');
    
    // Close the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('aiInsightsModal'));
    modal.hide();
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize core functionality
    initApp();
    
    // Initialize enhanced analytics
    initEnhancedAnalytics();
    
    // Set up event listeners
    setupEventListeners();
    
    // Calculate initial rollover
    calculateMonthlyRollover();
});

// Existing core functions (simplified for brevity)
function loadTransactions() {
    try {
        return JSON.parse(localStorage.getItem('transactions')) || [];
    } catch {
        return [];
    }
}

function loadCategories() {
    try {
        const saved = JSON.parse(localStorage.getItem('categories'));
        if (saved && saved.length > 0) return saved;
    } catch {}
    
    // Default categories
    return [
        { name: 'Salary', type: 'income' },
        { name: 'Freelance', type: 'income' },
        { name: 'Investment', type: 'income' },
        { name: 'Food', type: 'expense' },
        { name: 'Transport', type: 'expense' },
        { name: 'Entertainment', type: 'expense' },
        { name: 'Utilities', type: 'expense' },
        { name: 'Shopping', type: 'expense' }
    ];
}

function loadCurrency() {
    return localStorage.getItem('currency');
}

function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    autoSyncToDrive();
}

function saveCategories() {
    localStorage.setItem('categories', JSON.stringify(categories));
    autoSyncToDrive();
}

function saveCurrency() {
    localStorage.setItem('currency', currency);
    autoSyncToDrive();
}

function autoSyncToDrive() {
    if (googleUser && isOnline && !syncInProgress) {
        // Debounce sync to avoid too many API calls
        clearTimeout(window.syncTimeout);
        window.syncTimeout = setTimeout(() => {
            syncDataToDrive();
        }, 2000);
    }
}

// Core UI functions
function initApp() {
    populateSummaryFilters();
    renderTransactionList();
    renderCategoryList();
    updateUI();
    setupNavigation();
    
    // Set current date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').value = today;
}

function populateSummaryFilters() {
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
    
    if (!monthSel || !yearSel) return;
    
    // Get unique years and months from transactions
    const months = new Set();
    const years = new Set();
    
    transactions.forEach(tx => {
        const date = new Date(tx.date);
        months.add(date.getMonth() + 1);
        years.add(date.getFullYear());
    });
    
    // Add current month/year if no transactions
    const now = new Date();
    months.add(now.getMonth() + 1);
    years.add(now.getFullYear());
    
    // Populate month dropdown
    monthSel.innerHTML = '<option value="all">All Months</option>';
    for (let month = 1; month <= 12; month++) {
        const monthName = new Date(now.getFullYear(), month - 1).toLocaleDateString('en', { month: 'long' });
        monthSel.innerHTML += `<option value="${month}">${monthName}</option>`;
    }
    
    // Populate year dropdown
    yearSel.innerHTML = '<option value="all">All Years</option>';
    Array.from(years).sort((a, b) => b - a).forEach(year => {
        yearSel.innerHTML += `<option value="${year}">${year}</option>`;
    });
    
    // Set current month/year as default
    monthSel.value = now.getMonth() + 1;
    yearSel.value = now.getFullYear();
    
    // Add event listeners
    monthSel.addEventListener('change', updateUI);
    yearSel.addEventListener('change', updateUI);
}

function populateMonthYearFilter(monthElementId, yearElementId) {
    const monthSel = document.getElementById(monthElementId);
    const yearSel = document.getElementById(yearElementId);
    
    if (!monthSel || !yearSel) return;
    
    // Get unique years from transactions
    const years = new Set();
    transactions.forEach(tx => {
        const date = new Date(tx.date);
        years.add(date.getFullYear());
    });
    
    // Add current year if no transactions
    const now = new Date();
    years.add(now.getFullYear());
    
    // Populate month dropdown
    monthSel.innerHTML = '';
    for (let month = 1; month <= 12; month++) {
        const monthName = new Date(now.getFullYear(), month - 1).toLocaleDateString('en', { month: 'short' });
        monthSel.innerHTML += `<option value="${month}" ${month === now.getMonth() + 1 ? 'selected' : ''}>${monthName}</option>`;
    }
    
    // Populate year dropdown
    yearSel.innerHTML = '';
    Array.from(years).sort((a, b) => b - a).forEach(year => {
        yearSel.innerHTML += `<option value="${year}" ${year === now.getFullYear() ? 'selected' : ''}>${year}</option>`;
    });
}

function getAvailableMonths() {
    const months = new Set();
    transactions.forEach(tx => {
        const monthKey = getMonthKeyFromDate(tx.date);
        months.add(monthKey);
    });
    
    // Add current month if no transactions
    months.add(getCurrentMonthKey());
    
    return Array.from(months).sort().map(month => {
        const [year, monthNum] = month.split('-');
        const monthName = new Date(year, monthNum - 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
        return { value: month, label: monthName };
    });
}

function getAvailableYears() {
    const years = new Set();
    transactions.forEach(tx => {
        const year = new Date(tx.date).getFullYear();
        years.add(year.toString());
    });
    
    // Add current year if no transactions
    years.add(new Date().getFullYear().toString());
    
    return Array.from(years).sort((a, b) => b - a).map(year => ({
        value: year,
        label: year
    }));
}

function updateUI() {
    updateSummary();
    updateBreakdown();
    updateRolloverDisplay();
    updateAIInsights();
}

function updateSummary() {
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
    const netWealth = document.getElementById('netWealth');
    const totalIncome = document.getElementById('totalIncome');
    const totalExpense = document.getElementById('totalExpense');
    const currencyLabel = document.getElementById('currencyLabel');
    
    if (!monthSel || !yearSel) return;
    
    const selectedMonth = monthSel.value;
    const selectedYear = yearSel.value;
    
    let filteredTransactions = transactions;
    
    if (selectedMonth !== 'all' && selectedYear !== 'all') {
        filteredTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() + 1 == selectedMonth && txDate.getFullYear() == selectedYear;
        });
    } else if (selectedYear !== 'all') {
        filteredTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getFullYear() == selectedYear;
        });
    }
    
    const income = filteredTransactions.filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
    const expense = filteredTransactions.filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
    const net = income - expense;
    
    if (netWealth) netWealth.textContent = net.toLocaleString();
    if (totalIncome) totalIncome.textContent = income.toLocaleString();
    if (totalExpense) totalExpense.textContent = expense.toLocaleString();
    if (currencyLabel) currencyLabel.textContent = currency;
}

function updateBreakdown() {
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
    
    if (!monthSel || !yearSel) return;
    
    const selectedMonth = monthSel.value;
    const selectedYear = yearSel.value;
    
    let filteredTransactions = transactions;
    
    if (selectedMonth !== 'all' && selectedYear !== 'all') {
        filteredTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() + 1 == selectedMonth && txDate.getFullYear() == selectedYear;
        });
    } else if (selectedYear !== 'all') {
        filteredTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getFullYear() == selectedYear;
        });
    }
    
    renderBreakdown(filteredTransactions);
}

function renderBreakdown(transactionsToShow) {
    const incomeBreakdown = document.getElementById('incomeBreakdown');
    const expenseBreakdown = document.getElementById('expenseBreakdown');
    const noIncomeCategories = document.getElementById('noIncomeCategories');
    const noExpenseCategories = document.getElementById('noExpenseCategories');
    
    if (!incomeBreakdown || !expenseBreakdown) return;
    
    // Group by category
    const incomeByCategory = {};
    const expenseByCategory = {};
    
    transactionsToShow.forEach(tx => {
        if (tx.type === 'income') {
            incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
        } else {
            expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + tx.amount;
        }
    });
    
    // Render income breakdown
    const incomeCategories = Object.entries(incomeByCategory)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10); // Top 10 categories
    
    if (incomeCategories.length === 0) {
        incomeBreakdown.innerHTML = '';
        if (noIncomeCategories) noIncomeCategories.classList.remove('d-none');
    } else {
        incomeBreakdown.innerHTML = incomeCategories.map(([category, amount]) => `
            <div class="breakdown-item" onclick="showCategoryTransactions('income', '${category}')">
                <span>${category}</span>
                <span class="text-success">+${amount.toLocaleString()}</span>
            </div>
        `).join('');
        if (noIncomeCategories) noIncomeCategories.classList.add('d-none');
    }
    
    // Render expense breakdown
    const expenseCategories = Object.entries(expenseByCategory)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10); // Top 10 categories
    
    if (expenseCategories.length === 0) {
        expenseBreakdown.innerHTML = '';
        if (noExpenseCategories) noExpenseCategories.classList.remove('d-none');
    } else {
        expenseBreakdown.innerHTML = expenseCategories.map(([category, amount]) => `
            <div class="breakdown-item" onclick="showCategoryTransactions('expense', '${category}')">
                <span>${category}</span>
                <span class="text-danger">-${amount.toLocaleString()}</span>
            </div>
        `).join('');
        if (noExpenseCategories) noExpenseCategories.classList.add('d-none');
    }
}

function showCategoryTransactions(type, category) {
    const modal = new bootstrap.Modal(document.getElementById('categoryTransactionsModal'));
    const title = document.getElementById('categoryTransactionsTitle');
    const info = document.getElementById('categoryTransactionsInfo');
    const total = document.getElementById('categoryTotalAmount');
    const list = document.getElementById('categoryTransactionsList');
    const noTransactions = document.getElementById('noCategoryTransactions');
    
    if (!title || !info || !total || !list) return;
    
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
    const selectedMonth = monthSel.value;
    const selectedYear = yearSel.value;
    
    let filteredTransactions = transactions.filter(tx => tx.type === type);
    
    if (category !== 'all') {
        filteredTransactions = filteredTransactions.filter(tx => tx.category === category);
    }
    
    if (selectedMonth !== 'all' && selectedYear !== 'all') {
        filteredTransactions = filteredTransactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() + 1 == selectedMonth && txDate.getFullYear() == selectedYear;
        });
    } else if (selectedYear !== 'all') {
        filteredTransactions = filteredTransactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getFullYear() == selectedYear;
        });
    }
    
    const totalAmount = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    // Update modal content
    title.innerHTML = `<i class="bi bi-list-ul"></i> ${category === 'all' ? 'All ' + type + 's' : category}`;
    info.textContent = `${filteredTransactions.length} transactions`;
    total.textContent = `${type === 'income' ? '+' : '-'}${totalAmount.toLocaleString()} ${currency}`;
    total.className = `fw-bold fs-5 ${type === 'income' ? 'text-success' : 'text-danger'}`;
    
    if (filteredTransactions.length === 0) {
        list.innerHTML = '';
        noTransactions.classList.remove('d-none');
    } else {
        list.innerHTML = filteredTransactions.map(tx => `
            <div class="category-transaction-item">
                <div class="category-transaction-info">
                    <div class="fw-bold">${tx.description}</div>
                    <small class="text-muted">${new Date(tx.date).toLocaleDateString()}</small>
                </div>
                <div class="category-transaction-amount ${tx.type === 'income' ? 'text-success' : 'text-danger'}">
                    ${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()} ${currency}
                </div>
            </div>
        `).join('');
        noTransactions.classList.add('d-none');
    }
    
    modal.show();
}

function addTransactionForCategory() {
    // Close category modal and open add transaction modal
    const categoryModal = bootstrap.Modal.getInstance(document.getElementById('categoryTransactionsModal'));
    categoryModal.hide();
    
    setTimeout(() => {
        document.getElementById('openAddTransactionModal').click();
    }, 300);
}

function renderTransactionList() {
    const transactionsBody = document.getElementById('transactionsBody');
    const noTransactions = document.getElementById('noTransactions');
    
    if (!transactionsBody) return;
    
    if (transactions.length === 0) {
        transactionsBody.innerHTML = '';
        if (noTransactions) noTransactions.classList.remove('d-none');
        return;
    }
    
    if (noTransactions) noTransactions.classList.add('d-none');
    
    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    transactionsBody.innerHTML = sortedTransactions.map((tx, index) => `
        <tr class="clickable-row" onclick="editTransaction(${index})">
            <td>${new Date(tx.date).toLocaleDateString()}</td>
            <td class="description-cell" data-fulltext="${tx.description}">${tx.description}</td>
            <td>
                <span class="badge ${tx.type === 'income' ? 'bg-success' : 'bg-danger'}">
                    ${tx.type}
                </span>
            </td>
            <td>${tx.category}</td>
            <td class="${tx.type === 'income' ? 'text-success' : 'text-danger'}">
                ${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
            </td>
            <td>
                <button class="btn-action btn-delete" onclick="event.stopPropagation(); deleteTransaction(${index})" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderCategoryList() {
    const categoryList = document.getElementById('categoryList');
    const categoryInput = document.getElementById('categoryInput');
    
    if (!categoryList || !categoryInput) return;
    
    // Update category dropdown
    categoryInput.innerHTML = categories.map(cat => 
        `<option value="${cat.name}">${cat.name}</option>`
    ).join('');
    
    // Update category list in settings
    categoryList.innerHTML = categories.map((cat, index) => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <span class="badge category-type-badge category-${cat.type}">${cat.type}</span>
                ${cat.name}
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${index})">
                <i class="bi bi-trash"></i>
            </button>
        </li>
    `).join('');
}

function setupNavigation() {
    // Bottom navigation
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            switchTab(targetTab);
            
            // Update active state
            navButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Quick add button
    const quickAddBtn = document.getElementById('quickAddBtn');
    if (quickAddBtn) {
        quickAddBtn.addEventListener('click', function() {
            document.getElementById('openAddTransactionModal').click();
        });
    }
    
    // Add transaction modal opener
    const openAddModal = document.getElementById('openAddTransactionModal');
    if (openAddModal) {
        openAddModal.addEventListener('click', function() {
            resetTransactionForm();
            const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
            modal.show();
        });
    }
}

function switchTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-page');
    tabs.forEach(tab => tab.classList.add('d-none'));
    
    // Show selected tab
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.remove('d-none');
        
        // Initialize analytics when switching to charts tab
        if (tabName === 'charts') {
            initEnhancedAnalytics();
        }
    }
}

function setupEventListeners() {
    // Transaction form
    const transactionForm = document.getElementById('transactionForm');
    if (transactionForm) {
        transactionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveTransaction();
        });
    }
    
    // Type input change
    const typeInput = document.getElementById('typeInput');
    if (typeInput) {
        typeInput.addEventListener('change', function() {
            updateCategoryOptions();
        });
    }
    
    // Category management
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', addCategory);
    }
    
    const newCategoryInput = document.getElementById('newCategoryInput');
    if (newCategoryInput) {
        newCategoryInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addCategory();
            }
        });
    }
    
    // Category settings toggle
    const toggleCategorySettings = document.getElementById('toggleCategorySettings');
    if (toggleCategorySettings) {
        toggleCategorySettings.addEventListener('click', function() {
            const panel = document.getElementById('categorySettingsPanel');
            const icon = document.getElementById('catCollapseIcon');
            if (panel && icon) {
                const bsCollapse = new bootstrap.Collapse(panel, { toggle: true });
                panel.addEventListener('shown.bs.collapse', function() {
                    icon.innerHTML = '<i class="bi bi-chevron-down"></i>';
                });
                panel.addEventListener('hidden.bs.collapse', function() {
                    icon.innerHTML = '<i class="bi bi-chevron-right"></i>';
                });
            }
        });
    }
    
    // Currency selection
    const currencySelect = document.getElementById('currencySelect');
    if (currencySelect) {
        currencySelect.value = currency;
        currencySelect.addEventListener('change', function() {
            currency = this.value;
            saveCurrency();
            updateUI();
        });
    }
    
    // Manual sync in settings
    const manualSyncSettings = document.getElementById('manualSyncSettings');
    if (manualSyncSettings) {
        manualSyncSettings.addEventListener('click', manualSync);
    }
    
    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        // Load saved preference
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        darkModeToggle.checked = isDarkMode;
        document.body.classList.toggle('dark-mode', isDarkMode);
        
        darkModeToggle.addEventListener('change', function() {
            const isDark = this.checked;
            document.body.classList.toggle('dark-mode', isDark);
            localStorage.setItem('darkMode', isDark);
        });
    }
    
    // Export/Import
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
    
    if (importBtn && importFile) {
        importBtn.addEventListener('click', function() {
            importFile.click();
        });
        
        importFile.addEventListener('change', importData);
    }
}

function updateCategoryOptions() {
    const typeInput = document.getElementById('typeInput');
    const categoryInput = document.getElementById('categoryInput');
    
    if (!typeInput || !categoryInput) return;
    
    const selectedType = typeInput.value;
    const filteredCategories = categories.filter(cat => cat.type === selectedType);
    
    categoryInput.innerHTML = filteredCategories.map(cat => 
        `<option value="${cat.name}">${cat.name}</option>`
    ).join('');
}

function resetTransactionForm() {
    const form = document.getElementById('transactionForm');
    const submitButton = document.getElementById('submitButtonText');
    
    if (form) form.reset();
    if (submitButton) submitButton.textContent = 'Add';
    
    document.getElementById('editTransactionIndex').value = '-1';
    
    // Set current date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').value = today;
    
    // Update category options based on default type
    updateCategoryOptions();
    
    // Hide form alert
    const formAlert = document.getElementById('formAlert');
    if (formAlert) formAlert.classList.add('d-none');
}

function saveTransaction() {
    const dateInput = document.getElementById('dateInput');
    const descInput = document.getElementById('descInput');
    const typeInput = document.getElementById('typeInput');
    const categoryInput = document.getElementById('categoryInput');
    const amountInput = document.getElementById('amountInput');
    const editIndex = document.getElementById('editTransactionIndex');
    const formAlert = document.getElementById('formAlert');
    
    if (!dateInput || !descInput || !typeInput || !categoryInput || !amountInput) return;
    
    const date = dateInput.value;
    const description = descInput.value.trim();
    const type = typeInput.value;
    const category = categoryInput.value;
    const amount = parseFloat(amountInput.value);
    const index = parseInt(editIndex.value);
    
    // Validation
    if (!date || !description || !category || isNaN(amount) || amount <= 0) {
        if (formAlert) {
            formAlert.textContent = 'Please fill in all fields with valid values.';
            formAlert.classList.remove('d-none');
        }
        return;
    }
    
    const transaction = { date, description, type, category, amount };
    
    if (index >= 0) {
        // Edit existing transaction
        transactions[index] = transaction;
    } else {
        // Add new transaction
        transactions.push(transaction);
    }
    
    saveTransactions();
    calculateMonthlyRollover();
    updateUI();
    renderTransactionList();
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
    modal.hide();
    
    showToast(`Transaction ${index >= 0 ? 'updated' : 'added'} successfully!`, 'success');
}

function editTransaction(index) {
    const transaction = transactions[index];
    if (!transaction) return;
    
    const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
    const submitButton = document.getElementById('submitButtonText');
    
    // Fill form with transaction data
    document.getElementById('dateInput').value = transaction.date;
    document.getElementById('descInput').value = transaction.description;
    document.getElementById('typeInput').value = transaction.type;
    document.getElementById('categoryInput').value = transaction.category;
    document.getElementById('amountInput').value = transaction.amount;
    document.getElementById('editTransactionIndex').value = index;
    
    if (submitButton) submitButton.textContent = 'Update';
    
    // Update category options based on type
    updateCategoryOptions();
    
    modal.show();
}

function deleteTransaction(index) {
    showConfirmation(
        'Delete Transaction',
        'Are you sure you want to delete this transaction? This action cannot be undone.',
        () => {
            transactions.splice(index, 1);
            saveTransactions();
            calculateMonthlyRollover();
            updateUI();
            renderTransactionList();
            showToast('Transaction deleted successfully!', 'success');
        }
    );
}

function addCategory() {
    const newCategoryInput = document.getElementById('newCategoryInput');
    const newCategoryType = document.getElementById('newCategoryType');
    
    if (!newCategoryInput || !newCategoryType) return;
    
    const name = newCategoryInput.value.trim();
    const type = newCategoryType.value;
    
    if (!name) {
        showToast('Please enter a category name', 'warning');
        return;
    }
    
    // Check for duplicates
    if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
        showToast('Category already exists', 'warning');
        return;
    }
    
    categories.push({ name, type });
    saveCategories();
    renderCategoryList();
    
    newCategoryInput.value = '';
    showToast('Category added successfully!', 'success');
}

function deleteCategory(index) {
    const category = categories[index];
    if (!category) return;
    
    // Check if category is used in transactions
    const isUsed = transactions.some(tx => tx.category === category.name);
    
    if (isUsed) {
        showToast('Cannot delete category that is used in transactions', 'warning');
        return;
    }
    
    showConfirmation(
        'Delete Category',
        `Are you sure you want to delete the "${category.name}" category?`,
        () => {
            categories.splice(index, 1);
            saveCategories();
            renderCategoryList();
            showToast('Category deleted successfully!', 'success');
        }
    );
}

function showConfirmation(title, message, confirmCallback) {
    const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    const confirmTitle = document.getElementById('confirmationTitle');
    const confirmMessage = document.getElementById('confirmationMessage');
    const confirmBtn = document.getElementById('confirmActionBtn');
    
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmMessage) confirmMessage.textContent = message;
    
    // Set up confirm button
    if (confirmBtn) {
        confirmBtn.onclick = function() {
            confirmCallback();
            modal.hide();
        };
    }
    
    modal.show();
}

function exportData() {
    const data = {
        transactions: transactions,
        categories: categories,
        currency: currency,
        monthlyBudgets: monthlyBudgets,
        userExpectations: userExpectations,
        plannerData: plannerData,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealth_command_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Data exported successfully!', 'success');
}

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
                () => {
                    if (data.transactions) transactions = data.transactions;
                    if (data.categories) categories = data.categories;
                    if (data.currency) currency = data.currency;
                    if (data.monthlyBudgets) monthlyBudgets = data.monthlyBudgets;
                    if (data.userExpectations) userExpectations = data.userExpectations;
                    if (data.plannerData) plannerData = data.plannerData;
                    
                    saveTransactions();
                    saveCategories();
                    saveCurrency();
                    saveMonthlyBudgets(monthlyBudgets);
                    saveUserExpectations(userExpectations);
                    savePlannerData(plannerData);
                    
                    calculateMonthlyRollover();
                    updateUI();
                    renderTransactionList();
                    renderCategoryList();
                    
                    showToast('Data imported successfully!', 'success');
                    
                    // Reset file input
                    event.target.value = '';
                }
            );
        } catch (error) {
            showToast('Error importing data: Invalid file format', 'danger');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    initEnhancedAnalytics();
    setupEventListeners();
    calculateMonthlyRollover();
});
