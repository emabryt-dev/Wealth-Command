// Wealth Command Pro - Analytics Engine
class AnalyticsEngine {
    constructor() {
        this.charts = new Map();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Financial Health Score Calculation
    calculateHealthScore(transactions, monthlyBudgets, timeframe = '3m') {
        if (transactions.length === 0) return 50;

        const timeRange = this.getTimeRange(timeframe);
        const recentTransactions = transactions.filter(tx => 
            new Date(tx.date) >= timeRange.start
        );

        if (recentTransactions.length === 0) return 50;

        // Component calculations
        const savingsRate = this.calculateSavingsRate(recentTransactions);
        const expenseStability = this.calculateExpenseStability(recentTransactions);
        const incomeDiversity = this.calculateIncomeDiversity(recentTransactions);
        const emergencyFundScore = this.calculateEmergencyFundScore(recentTransactions, monthlyBudgets);
        const debtToIncome = this.calculateDebtToIncomeRatio(recentTransactions);

        // Weighted scoring
        const scores = {
            savingsRate: Math.min(100, savingsRate * 200), // 50% savings = 100 points
            expenseStability: Math.min(100, expenseStability * 100),
            incomeDiversity: Math.min(100, incomeDiversity * 100),
            emergencyFundScore: Math.min(100, emergencyFundScore * 100),
            debtToIncome: Math.max(0, 100 - (debtToIncome * 100))
        };

        const weights = {
            savingsRate: 0.3,
            expenseStability: 0.25,
            incomeDiversity: 0.15,
            emergencyFundScore: 0.2,
            debtToIncome: 0.1
        };

        const finalScore = Object.keys(scores).reduce((total, key) => {
            return total + (scores[key] * weights[key]);
        }, 0);

        return Math.round(finalScore);
    }

    calculateSavingsRate(transactions) {
        const totalIncome = transactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const totalExpenses = transactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);

        return totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;
    }

    calculateExpenseStability(transactions) {
        const monthlyExpenses = {};
        
        transactions.forEach(tx => {
            if (tx.type === 'expense') {
                const month = tx.date.substring(0, 7);
                monthlyExpenses[month] = (monthlyExpenses[month] || 0) + tx.amount;
            }
        });

        const amounts = Object.values(monthlyExpenses);
        if (amounts.length < 2) return 0.7;

        const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const variance = amounts.reduce((sum, amount) => 
            sum + Math.pow(amount - avg, 2), 0) / amounts.length;
        
        const stability = 1 - (Math.sqrt(variance) / avg);
        return Math.max(0, Math.min(1, stability));
    }

    calculateIncomeDiversity(transactions) {
        const incomeByCategory = {};
        const incomeTransactions = transactions.filter(tx => tx.type === 'income');

        if (incomeTransactions.length === 0) return 0;

        incomeTransactions.forEach(tx => {
            incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
        });

        const totalIncome = Object.values(incomeByCategory).reduce((a, b) => a + b, 0);
        const shares = Object.values(incomeByCategory).map(amount => amount / totalIncome);
        
        // Simpson's Diversity Index
        const diversity = 1 - shares.reduce((sum, share) => sum + Math.pow(share, 2), 0);
        return diversity;
    }

    calculateEmergencyFundScore(transactions, monthlyBudgets) {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const recentExpenses = transactions
            .filter(tx => tx.type === 'expense' && new Date(tx.date) >= threeMonthsAgo)
            .reduce((sum, tx) => sum + tx.amount, 0);

        const avgMonthlyExpense = recentExpenses / 3;
        const currentMonth = this.getCurrentMonthKey();
        const currentBalance = monthlyBudgets[currentMonth]?.endingBalance || 0;

        if (avgMonthlyExpense === 0) return 0.5;

        const monthsCovered = currentBalance / avgMonthlyExpense;
        
        if (monthsCovered >= 6) return 1.0;
        if (monthsCovered >= 3) return 0.75;
        if (monthsCovered >= 1) return 0.5;
        return 0.25;
    }

    calculateDebtToIncomeRatio(transactions) {
    const totalIncome = transactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);

    // Ensure correct precedence: treat both category checks under expense
    const debtPayments = transactions
        .filter(tx => tx.type === 'expense' &&
            (tx.category && (tx.category.toLowerCase().includes('loan') || tx.category.toLowerCase().includes('debt'))))
        .reduce((sum, tx) => sum + tx.amount, 0);

    return totalIncome > 0 ? debtPayments / totalIncome : 0;
}

    // Advanced Analytics Methods
    analyzeSpendingPatterns(transactions, timeframe = '1m') {
        const timeRange = this.getTimeRange(timeframe);
        const periodTransactions = transactions.filter(tx => 
            new Date(tx.date) >= timeRange.start
        );

        const analysis = {
            totalSpent: 0,
            averageTransaction: 0,
            largestExpense: { amount: 0, description: '' },
            categoryBreakdown: {},
            dailyPatterns: {},
            weeklyPatterns: {},
            recurringExpenses: []
        };

        const expenses = periodTransactions.filter(tx => tx.type === 'expense');
        
        if (expenses.length === 0) return analysis;

        // Basic calculations
        analysis.totalSpent = expenses.reduce((sum, tx) => sum + tx.amount, 0);
        analysis.averageTransaction = analysis.totalSpent / expenses.length;
        analysis.largestExpense = expenses.reduce((max, tx) => 
            tx.amount > max.amount ? { amount: tx.amount, description: tx.desc } : max, 
            { amount: 0, description: '' }
        );

        // Category breakdown
        expenses.forEach(tx => {
            analysis.categoryBreakdown[tx.category] = 
                (analysis.categoryBreakdown[tx.category] || 0) + tx.amount;
        });

        // Daily patterns
        expenses.forEach(tx => {
            const dayOfWeek = new Date(tx.date).getDay();
            analysis.dailyPatterns[dayOfWeek] = 
                (analysis.dailyPatterns[dayOfWeek] || 0) + tx.amount;
        });

        // Detect recurring expenses
        analysis.recurringExpenses = this.detectRecurringExpenses(expenses);

        return analysis;
    }

    detectRecurringExpenses(expenses) {
        const recurring = [];
        const similarTransactions = {};

        // Group by description and amount
        expenses.forEach(tx => {
            const key = `${tx.desc.toLowerCase()}_${tx.amount}`;
            if (!similarTransactions[key]) {
                similarTransactions[key] = [];
            }
            similarTransactions[key].push(tx);
        });

        // Check for recurring patterns
        Object.entries(similarTransactions).forEach(([key, txs]) => {
            if (txs.length >= 2) {
                const dates = txs.map(tx => new Date(tx.date)).sort((a, b) => a - b);
                const intervals = [];

                for (let i = 1; i < dates.length; i++) {
                    const diff = (dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24);
                    intervals.push(diff);
                }

                const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                const isRegular = intervals.every(interval => 
                    Math.abs(interval - avgInterval) <= 7 // Within 7 days
                );

                if (isRegular) {
                    recurring.push({
                        description: txs[0].desc,
                        amount: txs[0].amount,
                        frequency: this.categorizeFrequency(avgInterval),
                        nextExpected: this.calculateNextExpected(dates, avgInterval),
                        occurrences: txs.length
                    });
                }
            }
        });

        return recurring;
    }

    categorizeFrequency(avgInterval) {
        if (avgInterval <= 1) return 'daily';
        if (avgInterval <= 7) return 'weekly';
        if (avgInterval <= 14) return 'bi-weekly';
        if (avgInterval <= 35) return 'monthly';
        if (avgInterval <= 95) return 'quarterly';
        return 'yearly';
    }

    calculateNextExpected(dates, avgInterval) {
        const lastDate = new Date(Math.max(...dates));
        const nextDate = new Date(lastDate.getTime() + avgInterval * 24 * 60 * 60 * 1000);
        return nextDate.toISOString().split('T')[0];
    }

    // Predictive Analytics
    predictFutureSpending(transactions, months = 3) {
        const historicalData = this.getHistoricalSpending(transactions, 12); // 12 months history
        const predictions = [];

        for (let i = 1; i <= months; i++) {
            const prediction = this.calculateMonthlyPrediction(historicalData, i);
            predictions.push(prediction);
        }

        return predictions;
    }

    getHistoricalSpending(transactions, months) {
        const historical = {};
        const now = new Date();

        for (let i = 0; i < months; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            const monthlyExpenses = transactions
                .filter(tx => tx.type === 'expense' && tx.date.startsWith(monthKey))
                .reduce((sum, tx) => sum + tx.amount, 0);

            historical[monthKey] = monthlyExpenses;
        }

        return historical;
    }

    calculateMonthlyPrediction(historicalData, monthsAhead) {
        const values = Object.values(historicalData).filter(val => val > 0);
        
        if (values.length === 0) {
            return {
                month: this.getFutureMonthKey(monthsAhead),
                predictedAmount: 0,
                confidence: 0,
                trend: 0
            };
        }

        // Simple linear regression for trend
        const n = values.length;
        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let denominator = 0;

        values.forEach((y, x) => {
            numerator += (x - xMean) * (y - yMean);
            denominator += Math.pow(x - xMean, 2);
        });

        const slope = denominator !== 0 ? numerator / denominator : 0;
        const trend = slope / yMean;

        // Prediction with seasonality adjustment
        const lastValue = values[values.length - 1];
        const predictedAmount = lastValue * (1 + trend * monthsAhead * 0.3); // Conservative trend

        // Confidence based on data quality
        const confidence = Math.min(0.9, values.length / 10);
        const variance = values.reduce((sum, val) => 
            sum + Math.pow(val - yMean, 2), 0) / values.length;
        const stability = 1 - (Math.sqrt(variance) / yMean);

        const adjustedConfidence = confidence * stability;

        return {
            month: this.getFutureMonthKey(monthsAhead),
            predictedAmount: Math.round(predictedAmount),
            confidence: adjustedConfidence,
            trend: trend,
            seasonality: this.calculateSeasonality(historicalData)
        };
    }

    calculateSeasonality(historicalData) {
        // Simple seasonality detection
        const values = Object.values(historicalData);
        if (values.length < 12) return 'insufficient_data';

        const quarterlyAverages = [];
        for (let i = 0; i < 4; i++) {
            const quarterValues = values.slice(i * 3, (i + 1) * 3);
            quarterlyAverages.push(quarterValues.reduce((a, b) => a + b, 0) / quarterValues.length);
        }

        const maxDiff = Math.max(...quarterlyAverages) - Math.min(...quarterlyAverages);
        const avgSpending = values.reduce((a, b) => a + b, 0) / values.length;
        const seasonalityStrength = maxDiff / avgSpending;

        if (seasonalityStrength > 0.3) return 'high';
        if (seasonalityStrength > 0.15) return 'medium';
        return 'low';
    }

    // Wealth Projection
    projectWealth(transactions, futureTransactions, currentBalance, years = 5) {
        const projection = {
            startingBalance: currentBalance,
            projections: [],
            summary: {
                totalContributions: 0,
                totalGrowth: 0,
                endingBalance: currentBalance
            }
        };

        let runningBalance = currentBalance;
        const now = new Date();

        for (let year = 1; year <= years; year++) {
            const yearData = {
                year: now.getFullYear() + year,
                startingBalance: runningBalance,
                contributions: 0,
                growth: 0,
                endingBalance: 0
            };

            // Calculate contributions (income - expenses)
            const yearlyNet = this.calculateYearlyNet(transactions, futureTransactions, year);
            yearData.contributions = yearlyNet;

            // Calculate growth (simple compound interest simulation)
            const growthRate = this.estimateGrowthRate(yearData.contributions);
            yearData.growth = runningBalance * growthRate;

            yearData.endingBalance = runningBalance + yearData.contributions + yearData.growth;
            runningBalance = yearData.endingBalance;

            projection.projections.push(yearData);
        }

        projection.summary.totalContributions = projection.projections.reduce(
            (sum, year) => sum + year.contributions, 0
        );
        projection.summary.totalGrowth = projection.projections.reduce(
            (sum, year) => sum + year.growth, 0
        );
        projection.summary.endingBalance = runningBalance;

        return projection;
    }

    calculateYearlyNet(transactions, futureTransactions, yearsAhead) {
        // Use historical average adjusted for future transactions
        const historicalIncome = transactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const historicalExpenses = transactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const historicalNet = historicalIncome - historicalExpenses;
        const monthsOfData = new Set(transactions.map(tx => tx.date.substring(0, 7))).size;

        const avgMonthlyNet = monthsOfData > 0 ? historicalNet / monthsOfData : 0;

        // Adjust for future transactions
        const futureNet = this.calculateFutureNet(futureTransactions, yearsAhead);
        
        return (avgMonthlyNet * 12) + futureNet;
    }

    calculateFutureNet(futureTransactions, yearsAhead) {
        let futureIncome = 0;
        let futureExpenses = 0;

        // Simplified calculation - in production, this would consider exact timing
        futureTransactions.income.forEach(income => {
            if (this.shouldIncludeFutureTransaction(income, yearsAhead)) {
                futureIncome += income.amount * this.getFrequencyMultiplier(income.frequency);
            }
        });

        futureTransactions.expenses.forEach(expense => {
            if (this.shouldIncludeFutureTransaction(expense, yearsAhead)) {
                futureExpenses += expense.amount * this.getFrequencyMultiplier(expense.frequency);
            }
        });

        return futureIncome - futureExpenses;
    }

    shouldIncludeFutureTransaction(transaction, yearsAhead) {
        const startDate = new Date(transaction.startDate);
        const now = new Date();
        const targetDate = new Date(now.getFullYear() + yearsAhead, now.getMonth(), 1);

        if (startDate > targetDate) return false;

        if (transaction.endDate) {
            const endDate = new Date(transaction.endDate);
            if (endDate < targetDate) return false;
        }

        return true;
    }

    getFrequencyMultiplier(frequency) {
        switch (frequency) {
            case 'monthly': return 12;
            case 'quarterly': return 4;
            case 'yearly': return 1;
            default: return 1; // one-time
        }
    }

    estimateGrowthRate(annualContribution) {
        // Simple growth rate estimation based on contribution size
        if (annualContribution > 50000) return 0.08; // Aggressive investing
        if (annualContribution > 20000) return 0.06; // Balanced portfolio
        if (annualContribution > 5000) return 0.04;  // Conservative
        return 0.02; // Savings account
    }

    // Advanced Chart Data Preparation
    prepareChartData(type, transactions, options = {}) {
        const cacheKey = `${type}_${JSON.stringify(options)}_${transactions.length}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        let data;
        switch (type) {
            case 'categoryBreakdown':
                data = this.prepareCategoryBreakdownData(transactions, options);
                break;
            case 'monthlyTrend':
                data = this.prepareMonthlyTrendData(transactions, options);
                break;
            case 'spendingHeatmap':
                data = this.prepareHeatmapData(transactions, options);
                break;
            case 'incomeVsExpenses':
                data = this.prepareIncomeVsExpensesData(transactions, options);
                break;
            case 'financialHealth':
                data = this.prepareFinancialHealthData(transactions, options);
                break;
            default:
                data = { error: 'Unknown chart type' };
        }

        this.cache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });

        return data;
    }

    prepareCategoryBreakdownData(transactions, options) {
        const { type = 'expense', limit = 10 } = options;
        const filtered = transactions.filter(tx => tx.type === type);

        const categoryTotals = {};
        filtered.forEach(tx => {
            categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
        });

        const categories = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit);

        return {
            labels: categories.map(([category]) => category),
            datasets: [{
                data: categories.map(([, amount]) => amount),
                backgroundColor: this.generateColors(categories.length)
            }]
        };
    }

    prepareMonthlyTrendData(transactions, options) {
        const { months = 12 } = options;
        const now = new Date();
        const monthlyData = {};

        for (let i = 0; i < months; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[monthKey] = { income: 0, expense: 0 };
        }

        transactions.forEach(tx => {
            const monthKey = tx.date.substring(0, 7);
            if (monthlyData[monthKey]) {
                monthlyData[monthKey][tx.type] += tx.amount;
            }
        });

        const labels = Object.keys(monthlyData).reverse();
        const incomeData = labels.map(month => monthlyData[month].income);
        const expenseData = labels.map(month => monthlyData[month].expense);

        return {
            labels: labels.map(month => {
                const [year, monthNum] = month.split('-');
                return new Date(year, monthNum - 1).toLocaleDateString('en', { month: 'short', year: '2-digit' });
            }),
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true
                }
            ]
        };
    }

    prepareHeatmapData(transactions, options) {
        const { year = new Date().getFullYear() } = options;
        const heatmapData = [];
        const daysInYear = this.isLeapYear(year) ? 366 : 365;

        for (let day = 0; day < daysInYear; day++) {
            const date = new Date(year, 0, day + 1);
            const dateStr = date.toISOString().split('T')[0];

            const dayTransactions = transactions.filter(tx => 
                tx.date === dateStr && tx.type === 'expense'
            );

            const total = dayTransactions.reduce((sum, tx) => sum + tx.amount, 0);

            heatmapData.push({
                date: dateStr,
                dayOfYear: day,
                amount: total,
                transactions: dayTransactions.length,
                week: Math.floor(day / 7),
                dayOfWeek: date.getDay()
            });
        }

        return heatmapData;
    }

    prepareIncomeVsExpensesData(transactions, options) {
        const { months = 6 } = options;
        const now = new Date();
        const monthlyNet = {};

        for (let i = 0; i < months; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyNet[monthKey] = 0;
        }

        transactions.forEach(tx => {
            const monthKey = tx.date.substring(0, 7);
            if (monthlyNet[monthKey] !== undefined) {
                monthlyNet[monthKey] += tx.type === 'income' ? tx.amount : -tx.amount;
            }
        });

        const labels = Object.keys(monthlyNet).reverse();
        const netData = labels.map(month => monthlyNet[month]);

        return {
            labels: labels.map(month => {
                const [year, monthNum] = month.split('-');
                return new Date(year, monthNum - 1).toLocaleDateString('en', { month: 'short' });
            }),
            datasets: [{
                label: 'Net Cash Flow',
                data: netData,
                backgroundColor: netData.map(value => 
                    value >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'
                ),
                borderColor: netData.map(value => 
                    value >= 0 ? '#10B981' : '#EF4444'
                ),
                borderWidth: 1
            }]
        };
    }

    prepareFinancialHealthData(transactions, options) {
        const { months = 6 } = options;
        const now = new Date();
        const healthScores = [];

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            const monthTransactions = transactions.filter(tx => 
                tx.date.startsWith(monthKey)
            );

            const score = this.calculateHealthScore(monthTransactions, {}, '1m');
            healthScores.push(score);
        }

        return {
            labels: Array.from({ length: months }, (_, i) => {
                const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
                return date.toLocaleDateString('en', { month: 'short' });
            }),
            datasets: [{
                label: 'Financial Health Score',
                data: healthScores,
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };
    }

    // Utility Methods
    generateColors(count) {
        const palette = [
            '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
            '#6366F1', '#8B5CF6', '#EC4899', '#6B7280',
            '#84CC16', '#06B6D4', '#F97316', '#8B5CF6'
        ];

        return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
    }

    getTimeRange(timeframe) {
        const now = new Date();
        let start;

        switch (timeframe) {
            case '1w':
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '1m':
                start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                break;
            case '3m':
                start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                break;
            case '6m':
                start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
                break;
            case '1y':
                start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            default:
                start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        }

        return { start, end: now };
    }

    getCurrentMonthKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    getFutureMonthKey(monthsAhead) {
        const now = new Date();
        const future = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
        return `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}`;
    }

    isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }

    // Cache management
    clearCache() {
        this.cache.clear();
    }

    // Performance optimization
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Create global analytics engine instance
window.analyticsEngine = new AnalyticsEngine();
