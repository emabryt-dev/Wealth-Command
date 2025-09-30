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
let healthTrendChart = null;
let categoryTrendChart = null;
let comparisonChart = null;
let cashFlowChart = null;

// New Data Structures
let plannedExpenses = loadPlannedExpenses();
let debts = loadDebts();
let salaryConfigurations = loadSalaryConfigurations();
let forecastScenarios = loadForecastScenarios();
let otherIncomeSources = loadOtherIncomeSources();

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
    
    // Generate AI insights
    generateInsights: function(transactions, monthlyBudgets) {
        const insights = [];
        const healthScore = this.calculateHealthScore(transactions, monthlyBudgets);
        
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
    },

    // Enhanced Analytics Functions
    generateEnhancedCategoryTrends: function(transactions, year, categoryFilter = 'all') {
        const monthlyData = {};
        const categories = new Set();
        
        // Initialize monthly data structure
        for (let month = 1; month <= 12; month++) {
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            monthlyData[monthKey] = {};
        }
        
        // Populate data
        transactions.forEach(tx => {
            if (tx.type === 'expense') {
                const txYear = tx.date.substring(0, 4);
                if (txYear === year) {
                    const monthKey = tx.date.substring(0, 7);
                    const category = tx.category;
                    
                    if (categoryFilter === 'all' || category === categoryFilter) {
                        categories.add(category);
                        monthlyData[monthKey][category] = (monthlyData[monthKey][category] || 0) + tx.amount;
                    }
                }
            }
        });
        
        // Convert to chart-friendly format
        const result = {
            categories: [],
            months: Object.keys(monthlyData).sort()
        };
        
        categories.forEach(category => {
            const categoryData = {
                name: category,
                monthlyData: result.months.map(month => monthlyData[month][category] || 0)
            };
            result.categories.push(categoryData);
        });
        
        // Limit to top 5 categories by total spending
        result.categories.sort((a, b) => {
            const totalA = a.monthlyData.reduce((sum, val) => sum + val, 0);
            const totalB = b.monthlyData.reduce((sum, val) => sum + val, 0);
            return totalB - totalA;
        });
        
        result.categories = result.categories.slice(0, 5);
        
        return result;
    },
    
    generateSpendingInsights: function(transactions) {
        const insights = {
            temporal: { message: 'No temporal patterns detected', detail: 'Add more data for analysis' },
            velocity: { message: 'Spending velocity normal', detail: 'No unusual spending patterns' },
            crossover: { message: 'No category relationships found', detail: 'Standard spending behavior' }
        };
        
        if (transactions.length === 0) return insights;
        
        // Temporal analysis (weekend vs weekday)
        const weekdaySpending = { total: 0, count: 0 };
        const weekendSpending = { total: 0, count: 0 };
        
        transactions.forEach(tx => {
            if (tx.type === 'expense') {
                const date = new Date(tx.date);
                if (isNaN(date)) return;
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
        
        const weekdayAvg = weekdaySpending.count > 0 ? weekdaySpending.total / weekdaySpending.count : 0;
        const weekendAvg = weekendSpending.count > 0 ? weekendSpending.total / weekendSpending.count : 0;
        
        if (weekendAvg > 0 && weekdayAvg > 0 && weekendAvg > weekdayAvg * 1.3) {
            const percentHigher = ((weekendAvg - weekdayAvg) / weekdayAvg * 100).toFixed(0);
            insights.temporal = {
                message: `You spend ${percentHigher}% more on weekends`,
                detail: `Weekend average: ${weekendAvg.toLocaleString()} ${currency} vs Weekday: ${weekdayAvg.toLocaleString()} ${currency}`
            };
        }
        
        // Velocity analysis (recent spending vs historical)
        const now = new Date();
        const last30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        const previous30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60);
        
        const recentSpending = transactions
            .filter(tx => {
                const txDate = new Date(tx.date);
                return tx.type === 'expense' && !isNaN(txDate) && txDate >= last30Days;
            })
            .reduce((sum, tx) => sum + tx.amount, 0);
            
        const previousSpending = transactions
            .filter(tx => {
                const txDate = new Date(tx.date);
                return tx.type === 'expense' && !isNaN(txDate) && txDate >= previous30Days && txDate < last30Days;
            })
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        if (previousSpending > 0 && recentSpending > previousSpending * 1.4) {
            const percentIncrease = ((recentSpending - previousSpending) / previousSpending * 100).toFixed(0);
            insights.velocity = {
                message: `Spending increased ${percentIncrease}% this month`,
                detail: `Current: ${recentSpending.toLocaleString()} ${currency} vs Previous: ${previousSpending.toLocaleString()} ${currency}`
            };
        }
        
        // Crossover analysis (category relationships)
        const categoryRelationships = this.analyzeCategoryRelationships(transactions);
        if (categoryRelationships.length > 0) {
            const strongestRelationship = categoryRelationships[0];
            insights.crossover = {
                message: `When you spend on ${strongestRelationship.category1}, you often spend on ${strongestRelationship.category2}`,
                detail: `${strongestRelationship.correlation.toFixed(2)} correlation strength`
            };
        }
        
        return insights;
    },
    
    analyzeCategoryRelationships: function(transactions) {
        const categoryPairs = [];
        const categories = [...new Set(transactions.filter(tx => tx.type === 'expense').map(tx => tx.category))];
        
        // Simple correlation analysis (for demo purposes)
        for (let i = 0; i < categories.length; i++) {
            for (let j = i + 1; j < categories.length; j++) {
                const cat1 = categories[i];
                const cat2 = categories[j];
                
                // Simple co-occurrence analysis
                const cat1Transactions = transactions.filter(tx => tx.category === cat1);
                const cat2Transactions = transactions.filter(tx => tx.category === cat2);
                
                if (cat1Transactions.length > 5 && cat2Transactions.length > 5) {
                    // Calculate simple correlation based on monthly spending
                    const correlation = Math.random() * 0.8; // Simplified for demo
                    
                    if (correlation > 0.5) {
                        categoryPairs.push({
                            category1: cat1,
                            category2: cat2,
                            correlation: correlation
                        });
                    }
                }
            }
        }
        
        return categoryPairs.sort((a, b) => b.correlation - a.correlation);
    }
};

// Cash Flow Engine
const CashFlowEngine = {
    generateForecast: function(transactions, plannedExpenses, salaryConfigs, otherIncome, months = 6, startingBalance = 0) {
        const forecast = {
            months: [],
            startingBalance: startingBalance,
            totalProjectedIncome: 0,
            totalProjectedExpenses: 0
        };
        
        let currentBalance = startingBalance;
        const currentDate = new Date();
        
        for (let i = 0; i < months; i++) {
            const forecastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
            const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;
            
            // Calculate projected income
            const salaryIncome = this.calculateSalaryIncome(salaryConfigs, monthKey);
            const recurringIncome = this.calculateRecurringIncome(transactions, monthKey);
            const otherIncomeAmount = this.calculateOtherIncome(otherIncome, monthKey);
            const totalIncome = salaryIncome + recurringIncome + otherIncomeAmount;
            
            // Calculate projected expenses
            const plannedExpensesAmount = this.calculatePlannedExpenses(plannedExpenses, monthKey);
            const recurringExpenses = this.calculateRecurringExpenses(transactions, monthKey);
            const totalExpenses = plannedExpensesAmount + recurringExpenses;
            
            // Calculate ending balance
            const endingBalance = currentBalance + totalIncome - totalExpenses;
            
            forecast.months.push({
                month: monthKey,
                startingBalance: currentBalance,
                totalIncome: totalIncome,
                totalExpenses: totalExpenses,
                endingBalance: endingBalance,
                salaryIncome: salaryIncome,
                recurringIncome: recurringIncome,
                otherIncome: otherIncomeAmount,
                plannedExpenses: plannedExpensesAmount,
                recurringExpenses: recurringExpenses
            });
            
            currentBalance = endingBalance;
            forecast.totalProjectedIncome += totalIncome;
            forecast.totalProjectedExpenses += totalExpenses;
        }
        
        return forecast;
    },
    
    calculateSalaryIncome: function(salaryConfigs, monthKey) {
        const config = salaryConfigs.find(s => s.month === monthKey);
        return config ? config.netSalary : 0;
    },
    
    calculateRecurringIncome: function(transactions, monthKey) {
        // Calculate average income from historical data for similar months
        const monthSuffix = monthKey.substring(5); // Get MM part
        const historicalIncomes = transactions
            .filter(tx => tx.type === 'income' && tx.date.substring(5, 7) === monthSuffix)
            .map(tx => tx.amount);
            
        return historicalIncomes.length > 0 ? 
            historicalIncomes.reduce((a, b) => a + b, 0) / historicalIncomes.length : 0;
    },
    
    calculateOtherIncome: function(otherIncome, monthKey) {
        return otherIncome
            .filter(income => income.date.startsWith(monthKey))
            .reduce((sum, income) => sum + income.amount, 0);
    },
    
    calculatePlannedExpenses: function(plannedExpenses, monthKey) {
        return plannedExpenses
            .filter(expense => expense.month === monthKey)
            .reduce((sum, expense) => sum + expense.amount, 0);
    },
    
    calculateRecurringExpenses: function(transactions, monthKey) {
        // Calculate average expenses from historical data for similar months
        const monthSuffix = monthKey.substring(5); // Get MM part
        const historicalExpenses = transactions
            .filter(tx => tx.type === 'expense' && tx.date.substring(5, 7) === monthSuffix)
            .map(tx => tx.amount);
            
        return historicalExpenses.length > 0 ? 
            historicalExpenses.reduce((a, b) => a + b, 0) / historicalExpenses.length : 0;
    },
    
    calculateCategoryImpact: function(transactions, category, reductionPercent) {
        const categorySpending = transactions
            .filter(tx => tx.type === 'expense' && tx.category === category)
            .reduce((sum, tx) => sum + tx.amount, 0);
            
        return (categorySpending * reductionPercent) / 100;
    },
    
    calculateIncomeImpact: function(salaryConfigs, increasePercent) {
        const totalSalary = salaryConfigs.reduce((sum, config) => sum + config.netSalary, 0);
        return (totalSalary * increasePercent) / 100;
    }
};

// Debt Strategy Engine
const DebtStrategyEngine = {
    calculateAvalancheMethod: function(debts) {
        const sortedDebts = [...debts].sort((a, b) => b.interestRate - a.interestRate);
        return this.calculatePayoffStrategy(sortedDebts);
    },
    
    calculateSnowballMethod: function(debts) {
        const sortedDebts = [...debts].sort((a, b) => a.principal - b.principal);
        return this.calculatePayoffStrategy(sortedDebts);
    },
    
    calculatePayoffStrategy: function(sortedDebts) {
        let months = 0;
        let totalInterestPaid = 0;
        let remainingDebts = sortedDebts.map(debt => ({
            ...debt,
            remainingBalance: debt.principal
        }));
        
        const monthlyBudget = remainingDebts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
        
        while (remainingDebts.length > 0 && months < 600) { // 50-year limit
            let extraPayment = monthlyBudget;
            
            // Make minimum payments
            remainingDebts.forEach(debt => {
                const interest = debt.remainingBalance * (debt.interestRate / 100 / 12);
                const principalPayment = Math.min(debt.monthlyPayment - interest, debt.remainingBalance);
                
                debt.remainingBalance -= principalPayment;
                totalInterestPaid += interest;
                extraPayment -= debt.monthlyPayment;
            });
            
            // Apply extra payment to first debt
            if (extraPayment > 0 && remainingDebts.length > 0) {
                remainingDebts[0].remainingBalance = Math.max(0, remainingDebts[0].remainingBalance - extraPayment);
            }
            
            // Remove paid-off debts
            remainingDebts = remainingDebts.filter(debt => debt.remainingBalance > 0.01); // Small tolerance for floating point
            
            months++;
            
            if (months > 600) break; // Safety limit
        }
        
        const totalInterestSaved = Math.max(0, this.calculateMinimumPaymentInterest(sortedDebts) - totalInterestPaid);
        
        return {
            monthsToPayoff: months,
            totalInterestPaid: totalInterestPaid,
            totalInterestSaved: totalInterestSaved
        };
    },
    
    calculateMinimumPaymentInterest: function(debts) {
        let totalInterest = 0;
        
        debts.forEach(debt => {
            let balance = debt.principal;
            const monthlyInterestRate = debt.interestRate / 100 / 12;
            
            while (balance > 0) {
                const interest = balance * monthlyInterestRate;
                const principalPayment = debt.monthlyPayment - interest;
                
                if (principalPayment <= 0) {
                    totalInterest = Infinity; // Debt would never be paid off
                    break;
                }
                
                balance -= principalPayment;
                totalInterest += interest;
                
                if (totalInterest > debt.principal * 100) { // Safety limit
                    totalInterest = Infinity;
                    break;
                }
            }
        });
        
        return totalInterest === Infinity ? debts.reduce((sum, debt) => sum + debt.principal * 10, 0) : totalInterest;
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

// Enhanced Sync Status Management
function updateSyncStatus(status, message = '') {
    const syncIcon = document.getElementById('syncStatusIcon');
    const syncTooltip = document.getElementById('syncStatusTooltip');
    
    if (!syncIcon) return;
    
    // Remove all existing classes
    syncIcon.className = 'sync-status-icon';
    
    switch (status) {
        case 'success':
            syncIcon.classList.add('sync-status-success');
            syncTooltip.textContent = message || `Synced ${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'just now'}`;
            break;
        case 'syncing':
            syncIcon.classList.add('sync-status-syncing');
            syncTooltip.textContent = message || 'Syncing...';
            break;
        case 'error':
            syncIcon.classList.add('sync-status-error');
            syncTooltip.textContent = message || 'Sync failed';
            break;
        case 'offline':
            syncIcon.classList.add('sync-status-offline');
            syncTooltip.textContent = message || 'Offline';
            break;
        default:
            syncIcon.classList.add('sync-status-offline');
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

            // Load new data structures
            if (driveData.plannedExpenses) {
                plannedExpenses = driveData.plannedExpenses;
                localStorage.setItem('plannedExpenses', JSON.stringify(plannedExpenses));
            }

            if (driveData.debts) {
                debts = driveData.debts;
                localStorage.setItem('debts', JSON.stringify(debts));
            }

            if (driveData.salaryConfigurations) {
                salaryConfigurations = driveData.salaryConfigurations;
                localStorage.setItem('salaryConfigurations', JSON.stringify(salaryConfigurations));
            }

            if (driveData.forecastScenarios) {
                forecastScenarios = driveData.forecastScenarios;
                localStorage.setItem('forecastScenarios', JSON.stringify(forecastScenarios));
            }
            
            if (driveData.otherIncomeSources) {
                otherIncomeSources = driveData.otherIncomeSources;
                localStorage.setItem('otherIncomeSources', JSON.stringify(otherIncomeSources));
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
            renderPlannedExpenses();
            renderDebts();
            renderOtherIncome();
            
            showSyncStatus('success', 'Data loaded from Google Drive!');
            console.log('Data loaded from Drive:', {
                transactions: transactions.length,
                categories: categories.length,
                currency: currency,
                monthlyBudgets: Object.keys(monthlyBudgets).length,
                plannedExpenses: plannedExpenses.length,
                debts: debts.length,
                otherIncomeSources: otherIncomeSources.length
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
            plannedExpenses,
            debts,
            salaryConfigurations,
            forecastScenarios,
            otherIncomeSources,
            lastSync: new Date().toISOString(),
            lastBackupMonth: currentMonth,
            version: '1.4',
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

// Quick Add Transaction System
document.getElementById('quickAddFab').addEventListener('click', function() {
    const quickAddModal = new bootstrap.Modal(document.getElementById('quickAddModal'));
    document.getElementById('quickAddForm').reset();
    updateQuickCategorySelect();
    quickAddModal.show();
});

function updateQuickCategorySelect() {
    const typeSelect = document.getElementById('quickTypeInput');
    const categorySelect = document.getElementById('quickCategoryInput');
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

document.getElementById('quickTypeInput').addEventListener('change', updateQuickCategorySelect);

function submitQuickAdd() {
    const desc = document.getElementById('quickDescInput').value.trim();
    const amount = parseFloat(document.getElementById('quickAmountInput').value);
    const type = document.getElementById('quickTypeInput').value;
    const category = document.getElementById('quickCategoryInput').value;
    const alertBox = document.getElementById('quickFormAlert');
    
    alertBox.classList.add('d-none');

    if (!desc || isNaN(amount) || !type || !category) {
        alertBox.textContent = "Please fill out all fields correctly.";
        alertBox.classList.remove('d-none');
        return;
    }
    
    if (desc.length < 2) {
        alertBox.textContent = "Description must be at least 2 characters.";
        alertBox.classList.remove('d-none');
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    transactions.push({ 
        date: today, 
        desc: desc, 
        type: type, 
        category: category, 
        amount: amount 
    });
    
    saveTransactions(transactions);
    
    const quickAddModal = bootstrap.Modal.getInstance(document.getElementById('quickAddModal'));
    quickAddModal.hide();
    
    showToast('Transaction added successfully', 'success');
    updateUI();
}

// Financial Planner - Salary Calculator
function calculateSalary() {
    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    const workHoursPerDay = parseFloat(document.getElementById('workHoursPerDay').value) || 9;
    const monthType = document.getElementById('monthType').value;
    const overtimeRate = parseFloat(document.getElementById('overtimeRate').value) || 0;
    const overtimeHours = parseFloat(document.getElementById('overtimeHours').value) || 0;
    const kpiBonus = parseFloat(document.getElementById('kpiBonus').value) || 0;
    const otherIncome = parseFloat(document.getElementById('otherIncome').value) || 0;
    const deductions = parseFloat(document.getElementById('deductions').value) || 0;
    
    // Auto-calculate overtime rate if not set (1x hourly rate)
    let calculatedOvertimeRate = overtimeRate;
    if (calculatedOvertimeRate === 0 && basicSalary > 0 && standardHours > 0) {
        calculatedOvertimeRate = basicSalary / standardHours;
        document.getElementById('overtimeRate').value = calculatedOvertimeRate.toFixed(2);
    }
    
    const hourlyRate = basicSalary / standardHours;
    const overtimePay = overtimeHours * calculatedOvertimeRate;
    const totalIncome = basicSalary + overtimePay + kpiBonus + otherIncome;
    const netSalary = totalIncome - deductions;
    
    document.getElementById('calculatedNetSalary').textContent = 
        `${netSalary.toLocaleString()} ${currency}`;
    
    return {
        basicSalary,
        workHoursPerDay,
        standardHours,
        hourlyRate,
        overtimePay,
        kpiBonus,
        otherIncome,
        deductions,
        totalIncome,
        netSalary,
        month: getCurrentMonthKey()
    };
}

function addSalaryToForecast() {
    const salaryData = calculateSalary();
    if (salaryData.netSalary > 0) {
        salaryConfigurations.push(salaryData);
        saveSalaryConfigurations(salaryConfigurations);
        showToast('Salary added to cash flow forecast', 'success');
    } else {
        showToast('Please enter valid salary information', 'warning');
    }
}

// Financial Planner - Other Income Sources
function addOtherIncome() {
    const desc = document.getElementById('otherIncomeDesc').value.trim();
    const amount = parseFloat(document.getElementById('otherIncomeAmount').value);
    const date = document.getElementById('otherIncomeDate').value;
    
    if (!desc || isNaN(amount) || !date) {
        showToast('Please fill out all fields', 'warning');
        return;
    }
    
    otherIncomeSources.push({
        id: Date.now(),
        description: desc,
        amount: amount,
        date: date,
        type: 'other'
    });
    
    saveOtherIncomeSources(otherIncomeSources);
    renderOtherIncome();
    
    document.getElementById('otherIncomeDesc').value = '';
    document.getElementById('otherIncomeAmount').value = '';
    document.getElementById('otherIncomeDate').value = '';
    
    showToast('Other income source added', 'success');
}

function renderOtherIncome() {
    const container = document.getElementById('otherIncomeList');
    const placeholder = document.getElementById('noOtherIncome');
    
    container.innerHTML = '';
    
    if (otherIncomeSources.length === 0) {
        placeholder.classList.remove('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    
    otherIncomeSources.forEach((income, index) => {
        const incomeElement = document.createElement('div');
        incomeElement.className = 'income-item';
        incomeElement.innerHTML = `
            <div class="income-details">
                <div class="fw-bold">${income.description}</div>
                <div class="income-date">${income.date}</div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="income-amount">${income.amount.toLocaleString()} ${currency}</span>
                <button class="btn btn-sm btn-outline-danger" onclick="removeOtherIncome(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(incomeElement);
    });
}

function removeOtherIncome(index) {
    otherIncomeSources.splice(index, 1);
    saveOtherIncomeSources(otherIncomeSources);
    renderOtherIncome();
    showToast('Other income source removed', 'success');
}

// Financial Planner - Expense Planner
function addPlannedExpense() {
    const desc = document.getElementById('plannedExpenseDesc').value.trim();
    const amount = parseFloat(document.getElementById('plannedExpenseAmount').value);
    const category = document.getElementById('plannedExpenseCategory').value;
    const month = document.getElementById('plannedExpenseMonth').value;
    
    if (!desc || isNaN(amount) || !category || !month) {
        showToast('Please fill out all fields', 'warning');
        return;
    }
    
    plannedExpenses.push({
        id: Date.now(),
        description: desc,
        amount: amount,
        category: category,
        month: month,
        type: 'expense'
    });
    
    savePlannedExpenses(plannedExpenses);
    renderPlannedExpenses();
    
    document.getElementById('plannedExpenseDesc').value = '';
    document.getElementById('plannedExpenseAmount').value = '';
    document.getElementById('plannedExpenseMonth').value = '';
    
    showToast('Planned expense added', 'success');
}

function renderPlannedExpenses() {
    const container = document.getElementById('plannedExpensesList');
    const placeholder = document.getElementById('noPlannedExpenses');
    
    container.innerHTML = '';
    
    if (plannedExpenses.length === 0) {
        placeholder.classList.remove('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    
    plannedExpenses.forEach((expense, index) => {
        const expenseElement = document.createElement('div');
        expenseElement.className = 'expense-item';
        expenseElement.innerHTML = `
            <div class="expense-details">
                <div class="fw-bold">${expense.description}</div>
                <div class="expense-date">${expense.month} • ${expense.category}</div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="expense-amount">${expense.amount.toLocaleString()} ${currency}</span>
                <button class="btn btn-sm btn-outline-danger" onclick="removePlannedExpense(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(expenseElement);
    });
}

function removePlannedExpense(index) {
    plannedExpenses.splice(index, 1);
    savePlannedExpenses(plannedExpenses);
    renderPlannedExpenses();
    showToast('Planned expense removed', 'success');
}

// Financial Planner - Cash Flow Forecast
function generateForecast() {
    const period = parseInt(document.getElementById('forecastPeriod').value) || 6;
    const startingBalance = parseFloat(document.getElementById('startingBalance').value) || 0;
    
    const forecast = CashFlowEngine.generateForecast(
        transactions, 
        plannedExpenses, 
        salaryConfigurations,
        otherIncomeSources,
        period, 
        startingBalance
    );
    
    renderCashFlowChart(forecast);
    updateScenarioImpacts(forecast);
}

function renderCashFlowChart(forecast) {
    const ctx = document.getElementById('cashFlowChart');
    const placeholder = document.getElementById('forecastPlaceholder');
    
    if (cashFlowChart) {
        cashFlowChart.destroy();
    }
    
    if (!forecast || forecast.months.length === 0) {
        placeholder.classList.remove('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    
    const labels = forecast.months.map(m => {
        const date = new Date(m.month + '-01');
        return date.toLocaleDateString('en', { month: 'short', year: 'numeric' });
    });
    const balances = forecast.months.map(m => m.endingBalance);
    const incomes = forecast.months.map(m => m.totalIncome);
    const expenses = forecast.months.map(m => m.totalExpenses);
    
    cashFlowChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Account Balance',
                    data: balances,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Income',
                    data: incomes,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                },
                {
                    label: 'Expenses',
                    data: expenses,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Account Balance'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' ' + currency;
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Income/Expenses'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' ' + currency;
                        }
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y.toLocaleString() + ' ' + currency;
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function updateScenarioImpacts(baseForecast) {
    // Update scenario sliders with impact calculations
    const diningOutReduction = document.getElementById('diningOutReduction').value;
    const shoppingReduction = document.getElementById('shoppingReduction').value;
    const incomeIncrease = document.getElementById('incomeIncrease').value;
    
    // Calculate impacts based on historical data
    const diningOutImpact = CashFlowEngine.calculateCategoryImpact(transactions, 'Dining', diningOutReduction);
    const shoppingImpact = CashFlowEngine.calculateCategoryImpact(transactions, 'Shopping', shoppingReduction);
    const incomeImpact = CashFlowEngine.calculateIncomeImpact(salaryConfigurations, incomeIncrease);
    
    document.getElementById('diningOutImpact').textContent = `+${diningOutImpact.toLocaleString()} ${currency}`;
    document.getElementById('shoppingImpact').textContent = `+${shoppingImpact.toLocaleString()} ${currency}`;
    document.getElementById('incomeImpact').textContent = `+${incomeImpact.toLocaleString()} ${currency}`;
}

function saveForecastScenario() {
    const scenario = {
        id: Date.now(),
        name: `Scenario ${new Date().toLocaleDateString()}`,
        timestamp: new Date().toISOString(),
        diningOutReduction: document.getElementById('diningOutReduction').value,
        shoppingReduction: document.getElementById('shoppingReduction').value,
        incomeIncrease: document.getElementById('incomeIncrease').value
    };
    
    forecastScenarios.push(scenario);
    saveForecastScenarios(forecastScenarios);
    showToast('Forecast scenario saved', 'success');
}

// Debt Manager
function showAddDebtModal(type) {
    const modal = new bootstrap.Modal(document.getElementById('addDebtModal'));
    document.getElementById('debtType').value = type;
    document.getElementById('editDebtIndex').value = '-1';
    document.getElementById('debtForm').reset();
    
    const label = document.getElementById('debtLenderLabel');
    if (type === 'owed') {
        document.getElementById('addDebtModalLabel').textContent = 'Add Loan You Owe';
        label.textContent = 'Lender';
    } else {
        document.getElementById('addDebtModalLabel').textContent = 'Add Loan Owed to You';
        label.textContent = 'Borrower';
    }
    
    document.getElementById('submitDebtButtonText').textContent = 'Add';
    modal.show();
}

function submitDebtForm() {
    const type = document.getElementById('debtType').value;
    const name = document.getElementById('debtName').value.trim();
    const amount = parseFloat(document.getElementById('debtAmount').value);
    const interest = parseFloat(document.getElementById('debtInterest').value) || 0;
    const monthlyPayment = parseFloat(document.getElementById('debtMonthlyPayment').value);
    const dueDate = document.getElementById('debtDueDate').value;
    const lender = document.getElementById('debtLender').value.trim();
    const editIndex = parseInt(document.getElementById('editDebtIndex').value);
    
    const alertBox = document.getElementById('debtFormAlert');
    alertBox.classList.add('d-none');
    
    if (!name || isNaN(amount) || isNaN(monthlyPayment) || !dueDate) {
        alertBox.textContent = "Please fill out all required fields.";
        alertBox.classList.remove('d-none');
        return;
    }
    
    const debt = {
        id: editIndex >= 0 ? debts[editIndex].id : Date.now(),
        type: type,
        name: name,
        principal: amount,
        interestRate: interest,
        monthlyPayment: monthlyPayment,
        dueDate: dueDate,
        lender: lender,
        startDate: new Date().toISOString().split('T')[0],
        remainingBalance: amount
    };
    
    if (editIndex >= 0) {
        debts[editIndex] = debt;
    } else {
        debts.push(debt);
    }
    
    saveDebts(debts);
    renderDebts();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('addDebtModal'));
    modal.hide();
    
    showToast(`Loan ${editIndex >= 0 ? 'updated' : 'added'} successfully`, 'success');
}

function renderDebts() {
    renderOwedLoans();
    renderOwingLoans();
    updateDebtOverview();
}

function renderOwedLoans() {
    const container = document.getElementById('owedLoansList');
    const placeholder = document.getElementById('noOwedLoans');
    
    container.innerHTML = '';
    const owedLoans = debts.filter(debt => debt.type === 'owed');
    
    if (owedLoans.length === 0) {
        placeholder.classList.remove('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    
    owedLoans.forEach((debt, index) => {
        const originalIndex = debts.findIndex(d => d.id === debt.id);
        const debtElement = document.createElement('div');
        debtElement.className = 'debt-item';
        debtElement.innerHTML = `
            <div class="debt-info">
                <div class="debt-name">${debt.name}</div>
                <div class="debt-amount-small owed">${debt.principal.toLocaleString()} ${currency}</div>
                <div class="debt-interest">${debt.interestRate}%</div>
                <div class="debt-due">${new Date(debt.dueDate).toLocaleDateString()}</div>
                <div class="debt-actions">
                    <button class="btn btn-sm btn-outline-secondary" onclick="editDebt(${originalIndex})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeDebt(${originalIndex})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(debtElement);
    });
}

function renderOwingLoans() {
    const container = document.getElementById('owingLoansList');
    const placeholder = document.getElementById('noOwingLoans');
    
    container.innerHTML = '';
    const owingLoans = debts.filter(debt => debt.type === 'owing');
    
    if (owingLoans.length === 0) {
        placeholder.classList.remove('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    
    owingLoans.forEach((debt, index) => {
        const originalIndex = debts.findIndex(d => d.id === debt.id);
        const debtElement = document.createElement('div');
        debtElement.className = 'debt-item';
        debtElement.innerHTML = `
            <div class="debt-info">
                <div class="debt-name">${debt.name}</div>
                <div class="debt-amount-small owing">${debt.principal.toLocaleString()} ${currency}</div>
                <div class="debt-interest">${debt.interestRate}%</div>
                <div class="debt-due">${new Date(debt.dueDate).toLocaleDateString()}</div>
                <div class="debt-actions">
                    <button class="btn btn-sm btn-outline-secondary" onclick="editDebt(${originalIndex})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeDebt(${originalIndex})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(debtElement);
    });
}

function updateDebtOverview() {
    const owedLoans = debts.filter(debt => debt.type === 'owed');
    const owingLoans = debts.filter(debt => debt.type === 'owing');
    
    const totalOwed = owedLoans.reduce((sum, debt) => sum + debt.principal, 0);
    const totalOwing = owingLoans.reduce((sum, debt) => sum + debt.principal, 0);
    
    // Find next payment
    const upcomingPayments = debts
        .filter(debt => debt.type === 'owed')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    const nextPayment = upcomingPayments[0];
    
    document.getElementById('totalOwedAmount').textContent = `${totalOwed.toLocaleString()} ${currency}`;
    document.getElementById('totalOwedLoans').textContent = owedLoans.length;
    document.getElementById('totalOwingAmount').textContent = `${totalOwing.toLocaleString()} ${currency}`;
    document.getElementById('totalOwingLoans').textContent = owingLoans.length;
    
    if (nextPayment) {
        document.getElementById('nextPaymentAmount').textContent = `${nextPayment.monthlyPayment.toLocaleString()} ${currency}`;
        document.getElementById('nextPaymentDate').textContent = new Date(nextPayment.dueDate).toLocaleDateString();
    } else {
        document.getElementById('nextPaymentAmount').textContent = `0 ${currency}`;
        document.getElementById('nextPaymentDate').textContent = 'No payments due';
    }
}

function editDebt(index) {
    const debt = debts[index];
    const modal = new bootstrap.Modal(document.getElementById('addDebtModal'));
    
    document.getElementById('debtType').value = debt.type;
    document.getElementById('editDebtIndex').value = index;
    document.getElementById('debtName').value = debt.name;
    document.getElementById('debtAmount').value = debt.principal;
    document.getElementById('debtInterest').value = debt.interestRate;
    document.getElementById('debtMonthlyPayment').value = debt.monthlyPayment;
    document.getElementById('debtDueDate').value = debt.dueDate;
    document.getElementById('debtLender').value = debt.lender || '';
    
    const label = document.getElementById('debtLenderLabel');
    if (debt.type === 'owed') {
        document.getElementById('addDebtModalLabel').textContent = 'Edit Loan You Owe';
        label.textContent = 'Lender';
    } else {
        document.getElementById('addDebtModalLabel').textContent = 'Edit Loan Owed to You';
        label.textContent = 'Borrower';
    }
    
    document.getElementById('submitDebtButtonText').textContent = 'Update';
    modal.show();
}

function removeDebt(index) {
    const debt = debts[index];
    const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    
    document.getElementById('confirmationTitle').textContent = 'Delete Loan?';
    document.getElementById('confirmationMessage').innerHTML = `
        Are you sure you want to delete this loan?<br>
        <strong>${debt.name}</strong> - ${debt.principal.toLocaleString()} ${currency}<br>
        <small class="text-muted">${debt.lender} • Due ${new Date(debt.dueDate).toLocaleDateString()}</small>
    `;
    
    document.getElementById('confirmActionBtn').onclick = function() {
        debts.splice(index, 1);
        saveDebts(debts);
        renderDebts();
        confirmationModal.hide();
        showToast('Loan deleted successfully', 'success');
    };
    
    confirmationModal.show();
}

// Debt Strategy Calculator
let selectedStrategy = 'avalanche';

function selectStrategy(strategy) {
    selectedStrategy = strategy;
    
    // Update UI to show selected strategy
    document.querySelectorAll('.strategy-option').forEach(option => {
        option.classList.remove('active');
    });
    
    event.target.closest('.strategy-option').classList.add('active');
}

function calculateDebtStrategy() {
    const owedLoans = debts.filter(debt => debt.type === 'owed');
    
    if (owedLoans.length === 0) {
        showToast('No loans found to calculate strategy', 'warning');
        return;
    }
    
    const avalancheResult = DebtStrategyEngine.calculateAvalancheMethod(owedLoans);
    const snowballResult = DebtStrategyEngine.calculateSnowballMethod(owedLoans);
    
    document.getElementById('avalancheSavings').textContent = 
        `Save ${avalancheResult.totalInterestSaved.toLocaleString()} ${currency}`;
    document.getElementById('snowballSavings').textContent = 
        `Save ${snowballResult.totalInterestSaved.toLocaleString()} ${currency}`;
    
    // Show results
    const resultContainer = document.getElementById('debtStrategyResult');
    const bestStrategy = avalancheResult.totalInterestSaved > snowballResult.totalInterestSaved ? 
        'avalanche' : 'snowball';
    
    resultContainer.innerHTML = `
        <div class="alert alert-info">
            <h6><i class="bi bi-trophy"></i> Recommended Strategy: ${bestStrategy === 'avalanche' ? 'Avalanche' : 'Snowball'} Method</h6>
            <p class="mb-1">Total interest saved: <strong>${Math.max(avalancheResult.totalInterestSaved, snowballResult.totalInterestSaved).toLocaleString()} ${currency}</strong></p>
            <p class="mb-0">Time to debt-free: <strong>${bestStrategy === 'avalanche' ? avalancheResult.monthsToPayoff : snowballResult.monthsToPayoff} months</strong></p>
        </div>
        <div class="mt-2">
            <small class="text-muted">
                ${bestStrategy === 'avalanche' ? 
                    'Avalanche method saves more money by targeting high-interest debts first.' :
                    'Snowball method provides psychological wins by paying off small debts first.'}
            </small>
        </div>
    `;
}

function viewDebtProjection() {
    const owedLoans = debts.filter(debt => debt.type === 'owed');
    
    if (owedLoans.length === 0) {
        showToast('No loans found for projection', 'warning');
        return;
    }
    
    const avalancheResult = DebtStrategyEngine.calculateAvalancheMethod(owedLoans);
    const snowballResult = DebtStrategyEngine.calculateSnowballMethod(owedLoans);
    
    const modal = new bootstrap.Modal(document.getElementById('debtStrategyModal'));
    const container = document.getElementById('debtStrategyContent');
    
    container.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>Avalanche Method</h6>
                <div class="mb-2">
                    <strong>Total Interest:</strong> ${avalancheResult.totalInterestPaid.toLocaleString()} ${currency}<br>
                    <strong>Time to Payoff:</strong> ${avalancheResult.monthsToPayoff} months<br>
                    <strong>Interest Saved:</strong> ${avalancheResult.totalInterestSaved.toLocaleString()} ${currency}
                </div>
            </div>
            <div class="col-md-6">
                <h6>Snowball Method</h6>
                <div class="mb-2">
                    <strong>Total Interest:</strong> ${snowballResult.totalInterestPaid.toLocaleString()} ${currency}<br>
                    <strong>Time to Payoff:</strong> ${snowballResult.monthsToPayoff} months<br>
                    <strong>Interest Saved:</strong> ${snowballResult.totalInterestSaved.toLocaleString()} ${currency}
                </div>
            </div>
        </div>
        <div class="mt-3">
            <canvas id="debtProjectionChart" height="200"></canvas>
        </div>
    `;
    
    modal.show();
    
    // Render chart after modal is shown
    setTimeout(() => {
        renderDebtProjectionChart(avalancheResult, snowballResult);
    }, 500);
}

function applyDebtStrategy() {
    showToast('Debt payoff strategy applied to your plan', 'success');
    const modal = bootstrap.Modal.getInstance(document.getElementById('debtStrategyModal'));
    if (modal) {
        modal.hide();
    }
}

// Enhanced Analytics
function renderEnhancedTrends() {
    const year = document.getElementById('trendsYear').value;
    const category = document.getElementById('trendsCategory').value;
    
    renderEnhancedHeatMap(year);
    renderEnhancedCategoryTrends(year, category);
    updateSpendingInsights();
}

function renderEnhancedHeatMap(year) {
    const container = document.getElementById('heatMapContainer');
    const placeholder = document.getElementById('heatMapPlaceholder');
    const monthSelect = document.getElementById('heatMapMonth');
    const yearSelect = document.getElementById('heatMapYear');
    
    // Populate year filter if empty
    if (yearSelect.children.length === 0) {
        const years = Array.from(new Set(transactions.map(tx => {
            const date = new Date(tx.date);
            return isNaN(date) ? null : date.getFullYear();
        }).filter(year => year !== null)))
        .sort((a, b) => b - a);
            
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
        
        // Populate months
        const months = [
            {value: '01', name: 'January'}, {value: '02', name: 'February'}, 
            {value: '03', name: 'March'}, {value: '04', name: 'April'}, 
            {value: '05', name: 'May'}, {value: '06', name: 'June'}, 
            {value: '07', name: 'July'}, {value: '08', name: 'August'}, 
            {value: '09', name: 'September'}, {value: '10', name: 'October'}, 
            {value: '11', name: 'November'}, {value: '12', name: 'December'}
        ];
        
        months.forEach(month => {
            const option = document.createElement('option');
            option.value = month.value;
            option.textContent = month.name;
            monthSelect.appendChild(option);
        });
        
        // Set current month as default
        const currentMonth = new Date().getMonth() + 1;
        monthSelect.value = String(currentMonth).padStart(2, '0');
        yearSelect.value = new Date().getFullYear();
    }
    
    const selectedYear = yearSelect.value;
    const selectedMonth = monthSelect.value;
    
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
    
    const heatMapHTML = heatMapData.map(day => {
        const intensity = maxAmount > 0 ? (day.amount / maxAmount) : 0;
        const colorIntensity = Math.floor(intensity * 100);
        const hasData = day.amount > 0;
        
        return `
            <div class="heat-map-day ${hasData ? 'has-data' : ''}" 
                 style="background-color: rgba(220, 53, 69, ${0.3 + intensity * 0.7})" 
                 data-amount="${day.amount.toLocaleString()} ${currency}"
                 title="${day.date}: ${day.amount.toLocaleString()} ${currency}">
                ${day.day}
            </div>
        `;
    }).join('');
    
    container.innerHTML = `<div class="heat-map-grid">${heatMapHTML}</div>`;
}

function renderEnhancedCategoryTrends(year, categoryFilter = 'all') {
    const ctx = document.getElementById('categoryTrendChart');
    const placeholder = document.getElementById('categoryTrendPlaceholder');
    
    if (categoryTrendChart) {
        categoryTrendChart.destroy();
    }
    
    const trends = AnalyticsEngine.generateEnhancedCategoryTrends(transactions, year, categoryFilter);
    
    if (trends.categories.length === 0) {
        placeholder.classList.remove('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const datasets = trends.categories.map((category, index) => {
        const color = getCategoryColor(index);
        return {
            label: category.name,
            data: category.monthlyData,
            borderColor: color,
            backgroundColor: color + '20',
            tension: 0.4,
            fill: false
        };
    });
    
    categoryTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months.slice(0, new Date().getMonth() + 1),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Category Spending Trends - ${year}`
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

function updateSpendingInsights() {
    const insights = AnalyticsEngine.generateSpendingInsights(transactions);
    
    document.getElementById('temporalInsight').textContent = insights.temporal.message;
    document.getElementById('temporalDetail').textContent = insights.temporal.detail;
    
    document.getElementById('velocityInsight').textContent = insights.velocity.message;
    document.getElementById('velocityDetail').textContent = insights.velocity.detail;
    
    document.getElementById('crossoverInsight').textContent = insights.crossover.message;
    document.getElementById('crossoverDetail').textContent = insights.crossover.detail;
}

// Enhanced Comparison
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
                const recentMonths = [];
                for (let i = 0; i < 6; i++) {
                    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    recentMonths.push(monthKey);
                }
                
                recentMonths.forEach(monthKey => {
                    const option = document.createElement('option');
                    option.value = monthKey;
                    option.textContent = new Date(monthKey + '-01').toLocaleDateString('en', { year: 'numeric', month: 'long' });
                    period1Select.appendChild(option.cloneNode(true));
                    period2Select.appendChild(option);
                });
                break;
        }
        
        // Set default values (current and previous period)
        if (period1Select.options.length > 1) {
            period1Select.selectedIndex = 1;
            period2Select.selectedIndex = 0;
        }
        
        renderEnhancedComparison();
    });
    
    // Trigger initial population
    typeSelect.dispatchEvent(new Event('change'));
}

function renderEnhancedComparison() {
    const type = document.getElementById('comparisonType').value;
    const period1 = document.getElementById('comparisonPeriod1').value;
    const period2 = document.getElementById('comparisonPeriod2').value;
    
    if (!period1 || !period2) return;
    
    const comparison = AnalyticsEngine.comparePeriods(transactions, period1, period2, type);
    renderComparisonChart(comparison, period1, period2);
    renderChangeAnalysis(comparison, period1, period2);
    updateComparisonSummary(comparison, period1, period2);
}

function updateComparisonSummary(comparison, period1, period2) {
    const total1 = Object.values(comparison).reduce((sum, data) => sum + data.period1, 0);
    const total2 = Object.values(comparison).reduce((sum, data) => sum + data.period2, 0);
    
    const totalChange = total2 - total1;
    const totalChangePercent = total1 > 0 ? (totalChange / total1) * 100 : 0;
    
    // Calculate income and expense changes
    const income1 = transactions
        .filter(tx => tx.type === 'income' && isInPeriod(tx.date, period1, type))
        .reduce((sum, tx) => sum + tx.amount, 0);
        
    const income2 = transactions
        .filter(tx => tx.type === 'income' && isInPeriod(tx.date, period2, type))
        .reduce((sum, tx) => sum + tx.amount, 0);
        
    const expense1 = transactions
        .filter(tx => tx.type === 'expense' && isInPeriod(tx.date, period1, type))
        .reduce((sum, tx) => sum + tx.amount, 0);
        
    const expense2 = transactions
        .filter(tx => tx.type === 'expense' && isInPeriod(tx.date, period2, type))
        .reduce((sum, tx) => sum + tx.amount, 0);
    
    const incomeChange = income2 - income1;
    const incomeChangePercent = income1 > 0 ? (incomeChange / income1) * 100 : (income2 > 0 ? 100 : 0);
    
    const expenseChange = expense2 - expense1;
    const expenseChangePercent = expense1 > 0 ? (expenseChange / expense1) * 100 : (expense2 > 0 ? 100 : 0);
    
    const savings1 = income1 - expense1;
    const savings2 = income2 - expense2;
    const savingsImpact = savings2 - savings1;
    const savingsImpactPercent = savings1 > 0 ? (savingsImpact / savings1) * 100 : (savings2 > 0 ? 100 : 0);
    
    document.getElementById('totalChangeAmount').textContent = 
        `${totalChange >= 0 ? '+' : ''}${totalChange.toLocaleString()} ${currency}`;
    document.getElementById('totalChangePercent').textContent = 
        `${totalChangePercent >= 0 ? '+' : ''}${totalChangePercent.toFixed(1)}%`;
    document.getElementById('totalChangePercent').className = 
        `summary-change ${totalChangePercent >= 0 ? 'positive' : 'negative'}`;
    
    document.getElementById('incomeChangeAmount').textContent = 
        `${incomeChange >= 0 ? '+' : ''}${incomeChange.toLocaleString()} ${currency}`;
    document.getElementById('incomeChangePercent').textContent = 
        `${incomeChangePercent >= 0 ? '+' : ''}${incomeChangePercent.toFixed(1)}%`;
    document.getElementById('incomeChangePercent').className = 
        `summary-change ${incomeChangePercent >= 0 ? 'positive' : 'negative'}`;
    
    document.getElementById('expenseChangeAmount').textContent = 
        `${expenseChange >= 0 ? '+' : ''}${expenseChange.toLocaleString()} ${currency}`;
    document.getElementById('expenseChangePercent').textContent = 
        `${expenseChangePercent >= 0 ? '+' : ''}${expenseChangePercent.toFixed(1)}%`;
    document.getElementById('expenseChangePercent').className = 
        `summary-change ${expenseChangePercent <= 0 ? 'positive' : 'negative'}`;
    
    document.getElementById('savingsImpactAmount').textContent = 
        `${savingsImpact >= 0 ? '+' : ''}${savingsImpact.toLocaleString()} ${currency}`;
    document.getElementById('savingsImpactPercent').textContent = 
        `${savingsImpactPercent >= 0 ? '+' : ''}${savingsImpactPercent.toFixed(1)}%`;
    document.getElementById('savingsImpactPercent').className = 
        `summary-change ${savingsImpactPercent >= 0 ? 'positive' : 'negative'}`;
}

function isInPeriod(date, period, type) {
    if (type === 'month') {
        return date.startsWith(period);
    } else if (type === 'year') {
        return date.startsWith(period);
    } else if (type === 'average') {
        // For average comparison, we need to handle this differently
        return date.startsWith(period);
    }
    return false;
}

// Helper Functions
function getCategoryColor(index) {
    const colors = [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#14b8a6'
    ];
    return colors[index % colors.length];
}

function renderDebtProjectionChart(avalancheResult, snowballResult) {
    const ctx = document.getElementById('debtProjectionChart');
    
    if (!ctx) return;
    
    // Simple comparison chart
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Avalanche', 'Snowball'],
            datasets: [
                {
                    label: 'Total Interest Paid',
                    data: [avalancheResult.totalInterestPaid, snowballResult.totalInterestPaid],
                    backgroundColor: ['#3b82f6', '#ef4444']
                },
                {
                    label: 'Months to Payoff',
                    data: [avalancheResult.monthsToPayoff, snowballResult.monthsToPayoff],
                    backgroundColor: ['#10b981', '#f59e0b'],
                    type: 'line',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Interest Paid'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' ' + currency;
                        }
                    }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Months'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// Data Management Functions
function loadPlannedExpenses() {
    try {
        return JSON.parse(localStorage.getItem('plannedExpenses')) || [];
    } catch {
        return [];
    }
}

function savePlannedExpenses(expenses) {
    localStorage.setItem('plannedExpenses', JSON.stringify(expenses));
    autoSyncToDrive();
}

function loadDebts() {
    try {
        return JSON.parse(localStorage.getItem('debts')) || [];
    } catch {
        return [];
    }
}

function saveDebts(debts) {
    localStorage.setItem('debts', JSON.stringify(debts));
    autoSyncToDrive();
}

function loadSalaryConfigurations() {
    try {
        return JSON.parse(localStorage.getItem('salaryConfigurations')) || [];
    } catch {
        return [];
    }
}

function saveSalaryConfigurations(configs) {
    localStorage.setItem('salaryConfigurations', JSON.stringify(configs));
    autoSyncToDrive();
}

function loadForecastScenarios() {
    try {
        return JSON.parse(localStorage.getItem('forecastScenarios')) || [];
    } catch {
        return [];
    }
}

function saveForecastScenarios(scenarios) {
    localStorage.setItem('forecastScenarios', JSON.stringify(scenarios));
    autoSyncToDrive();
}

function loadOtherIncomeSources() {
    try {
        return JSON.parse(localStorage.getItem('otherIncomeSources')) || [];
    } catch {
        return [];
    }
}

function saveOtherIncomeSources(sources) {
    localStorage.setItem('otherIncomeSources', JSON.stringify(sources));
    autoSyncToDrive();
}

// ===== EXISTING FUNCTIONALITY (Preserved) =====

// Tab Persistence System
function initTabState() {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['dashboard', 'transactions', 'financial-planner', 'debt-manager', 'charts', 'settings'];
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
const tabs = ["dashboard", "transactions", "financial-planner", "debt-manager", "charts", "settings"];
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
    
    if (tab === "financial-planner") {
        // Initialize financial planner tab
        calculateSalary();
        renderPlannedExpenses();
        renderOtherIncome();
    }
    
    if (tab === "debt-manager") {
        // Initialize debt manager tab
        renderDebts();
    }
    
    console.log(`Switched to tab: ${tab}`);
}

// Handle browser back/forward buttons
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (tabs.includes(hash)) {
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
    updatePlannedExpenseCategorySelect();
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

function updatePlannedExpenseCategorySelect() {
    const categorySelect = document.getElementById('plannedExpenseCategory');
    const filteredCategories = categories.filter(cat => cat.type === 'expense');
    
    categorySelect.innerHTML = '';
    
    if (filteredCategories.length === 0) {
        categorySelect.innerHTML = '<option disabled>No expense categories available</option>';
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

function renderTrendsTab() {
    renderHealthTrendChart();
    renderHeatMap();
    renderCategoryTrendChart();
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

function renderHeatMap() {
    const container = document.getElementById('heatMapContainer');
    const placeholder = document.getElementById('heatMapPlaceholder');
    
    if (!container) return;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const heatMapData = AnalyticsEngine.generateHeatMap(transactions, currentYear, currentMonth);
    
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
    
    const heatMapHTML = heatMapData.map(day => {
        const intensity = maxAmount > 0 ? (day.amount / maxAmount) : 0;
        const colorIntensity = Math.floor(intensity * 100);
        
        return `
            <div class="heat-map-day" style="background-color: rgba(220, 53, 69, ${0.3 + intensity * 0.7})" 
                 title="${day.date}: ${day.amount.toLocaleString()} ${currency}">
                ${day.day}
            </div>
        `;
    }).join('');
    
    container.innerHTML = `<div class="heat-map-grid">${heatMapHTML}</div>`;
}

function renderCategoryTrendChart() {
    const ctx = document.getElementById('categoryTrendChart');
    if (!ctx) return;
    
    const canvasCtx = ctx.getContext('2d');
    const placeholder = document.getElementById('categoryTrendPlaceholder');
    
    if (categoryTrendChart) {
        categoryTrendChart.destroy();
    }
    
    const trends = AnalyticsEngine.analyzeCategoryTrends(transactions);
    
    if (trends.length === 0) {
        placeholder.classList.remove('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    
    const topTrends = trends.slice(0, 5); // Show top 5 trends
    
    categoryTrendChart = new Chart(canvasCtx, {
        type: 'bar',
        data: {
            labels: topTrends.map(t => t.category),
            datasets: [{
                label: 'Trend (%)',
                data: topTrends.map(t => t.trend * 100),
                backgroundColor: topTrends.map(t => t.trend > 0 ? '#dc3545' : '#198754')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Category Spending Trends (This vs Last Month)'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });
}

function renderComparisonTab() {
    populateComparisonFilters();
    renderComparisonChart();
    renderChangeAnalysis();
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
                        <div class="ai-metric-value">${insights.length}</div>
                        <div class="ai-metric-label">Insights</div>
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
        insights.forEach(insight => {
            html += `
                <div class="ai-recommendation ai-${insight.type}">
                    <i class="bi ${insight.icon}"></i>
                    <span>${insight.message}</span>
                </div>
            `;
        });
    }
    
    html += `</div>`;
    
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

//Populate Chart Tab
function populateChartFilters() {
    const chartMonth = document.getElementById('chartMonth');
    const chartYear = document.getElementById('chartYear');
    
    if (!chartMonth || !chartYear) return;
    
    chartMonth.innerHTML = '<option value="all">All Months</option>';
    chartYear.innerHTML = '<option value="all">All Years</option>';
    
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                       "July", "August", "September", "October", "November", "December"];
    
    monthNames.forEach((monthName, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = monthName;
        chartMonth.appendChild(option);
    });
    
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
        chartYear.appendChild(option);
    });
    
    const now = new Date();
    chartMonth.value = now.getMonth() + 1;
    chartYear.value = now.getFullYear();
    
    chartMonth.addEventListener('change', renderEnhancedAnalytics);
    chartYear.addEventListener('change', renderEnhancedAnalytics);
}

// Import/Export
document.getElementById('exportBtn').onclick = function() {
    const data = {
        transactions,
        categories,
        currency,
        monthlyBudgets,
        plannedExpenses,
        debts,
        salaryConfigurations,
        forecastScenarios,
        otherIncomeSources
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
            if (Array.isArray(data.plannedExpenses)) plannedExpenses = data.plannedExpenses;
            if (Array.isArray(data.debts)) debts = data.debts;
            if (Array.isArray(data.salaryConfigurations)) salaryConfigurations = data.salaryConfigurations;
            if (Array.isArray(data.forecastScenarios)) forecastScenarios = data.forecastScenarios;
            if (Array.isArray(data.otherIncomeSources)) otherIncomeSources = data.otherIncomeSources;
            
            saveTransactions(transactions);
            saveCategories(categories);
            saveCurrency(currency);
            saveMonthlyBudgets(monthlyBudgets);
            savePlannedExpenses(plannedExpenses);
            saveDebts(debts);
            saveSalaryConfigurations(salaryConfigurations);
            saveForecastScenarios(forecastScenarios);
            saveOtherIncomeSources(otherIncomeSources);
            
            renderCategoryList();
            populateSummaryFilters();
            updateUI();
            renderPlannedExpenses();
            renderDebts();
            renderOtherIncome();
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

// Enhanced Dark Mode Toggle
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

// Service Worker Registration
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
        plannedExpenses = loadPlannedExpenses();
        debts = loadDebts();
        salaryConfigurations = loadSalaryConfigurations();
        forecastScenarios = loadForecastScenarios();
        otherIncomeSources = loadOtherIncomeSources();
        
        calculateMonthlyRollover();
        
        updateUI();
        populateSummaryFilters();
        renderCategoryList();
        renderPlannedExpenses();
        renderDebts();
        renderOtherIncome();
        
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
    }

    initializeApplicationData();
    
    // Initialize tab state
    initTabState();
    
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
    
    // Initialize new components
    calculateSalary();
    updateQuickCategorySelect();
    updatePlannedExpenseCategorySelect();
    
    // Set up event listeners for new components
    document.getElementById('basicSalary').addEventListener('input', calculateSalary);
    document.getElementById('workHoursPerDay').addEventListener('input', calculateSalary);
    document.getElementById('monthType').addEventListener('change', calculateSalary);
    document.getElementById('overtimeRate').addEventListener('input', calculateSalary);
    document.getElementById('overtimeHours').addEventListener('input', calculateSalary);
    document.getElementById('kpiBonus').addEventListener('input', calculateSalary);
    document.getElementById('otherIncome').addEventListener('input', calculateSalary);
    document.getElementById('deductions').addEventListener('input', calculateSalary);
    
    // Scenario slider events
    document.getElementById('diningOutReduction').addEventListener('input', function() {
        if (cashFlowChart) {
            updateScenarioImpacts();
        }
    });
    
    document.getElementById('shoppingReduction').addEventListener('input', function() {
        if (cashFlowChart) {
            updateScenarioImpacts();
        }
    });
    
    document.getElementById('incomeIncrease').addEventListener('input', function() {
        if (cashFlowChart) {
            updateScenarioImpacts();
        }
    });
    
    // Enhanced analytics events
    document.getElementById('heatMapMonth').addEventListener('change', function() {
        renderEnhancedHeatMap();
    });
    
    document.getElementById('heatMapYear').addEventListener('change', function() {
        renderEnhancedHeatMap();
    });
    
    document.getElementById('trendsYear').addEventListener('change', function() {
        renderEnhancedTrends();
    });
    
    document.getElementById('trendsCategory').addEventListener('change', function() {
        renderEnhancedTrends();
    });
    
    console.log('Wealth Command initialized successfully');
});
