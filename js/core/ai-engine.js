// Wealth Command Pro - AI Engine
class AIEngine {
    constructor() {
        this.models = {
            categorization: new CategorizationModel(),
            prediction: new PredictionModel(),
            insights: new InsightsModel(),
            recommendations: new RecommendationsModel()
        };
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Load ML models (in a real app, these would be actual trained models)
            await this.loadModels();
            this.isInitialized = true;
            console.log('AI Engine initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AI Engine:', error);
        }
    }

    async loadModels() {
        // Simulate model loading
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    // Transaction categorization
    async categorizeTransaction(description, amount) {
        if (!this.isInitialized) await this.initialize();

        const features = this.extractFeatures(description, amount);
        return this.models.categorization.predict(features);
    }

    extractFeatures(description, amount) {
        const desc = description.toLowerCase();
        
        return {
            description: desc,
            amount: amount,
            length: desc.length,
            wordCount: desc.split(' ').length,
            hasNumbers: /\d/.test(desc),
            commonPatterns: this.detectCommonPatterns(desc),
            amountCategory: this.categorizeAmount(amount)
        };
    }

    detectCommonPatterns(description) {
        const patterns = {
            food: ['restaurant', 'cafe', 'food', 'grocery', 'supermarket', 'meal'],
            transportation: ['uber', 'lyft', 'taxi', 'bus', 'train', 'fuel', 'gas'],
            shopping: ['amazon', 'walmart', 'target', 'store', 'shop', 'mall'],
            entertainment: ['netflix', 'spotify', 'movie', 'cinema', 'game'],
            utilities: ['electric', 'water', 'gas', 'internet', 'phone'],
            healthcare: ['hospital', 'doctor', 'pharmacy', 'medical']
        };

        const detected = [];
        for (const [category, keywords] of Object.entries(patterns)) {
            if (keywords.some(keyword => description.includes(keyword))) {
                detected.push(category);
            }
        }

        return detected;
    }

    categorizeAmount(amount) {
        if (amount < 50) return 'small';
        if (amount < 200) return 'medium';
        if (amount < 1000) return 'large';
        return 'very_large';
    }

    // Financial predictions
    async predictSpending(timeframe = '30d') {
        if (!this.isInitialized) await this.initialize();

        const transactions = window.stateManager.state.transactions;
        const features = this.preparePredictionFeatures(transactions);
        
        return this.models.prediction.predict(features, timeframe);
    }

    preparePredictionFeatures(transactions) {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        
        const recentTransactions = transactions.filter(tx => 
            new Date(tx.date) >= sixMonthsAgo && tx.type === 'expense'
        );

        // Calculate monthly spending patterns
        const monthlySpending = {};
        recentTransactions.forEach(tx => {
            const month = tx.date.substring(0, 7);
            monthlySpending[month] = (monthlySpending[month] || 0) + tx.amount;
        });

        // Calculate category patterns
        const categorySpending = {};
        recentTransactions.forEach(tx => {
            categorySpending[tx.category] = (categorySpending[tx.category] || 0) + tx.amount;
        });

        return {
            monthlySpending: Object.values(monthlySpending),
            categoryDistribution: categorySpending,
            totalTransactions: recentTransactions.length,
            avgTransactionAmount: recentTransactions.reduce((sum, tx) => sum + tx.amount, 0) / recentTransactions.length,
            spendingTrend: this.calculateSpendingTrend(monthlySpending)
        };
    }

    calculateSpendingTrend(monthlySpending) {
        const amounts = Object.values(monthlySpending);
        if (amounts.length < 2) return 0;

        const recent = amounts.slice(-3);
        const previous = amounts.slice(-6, -3);
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
        
        return previousAvg > 0 ? (recentAvg - previousAvg) / previousAvg : 0;
    }

    // Generate insights
    async generateInsights() {
        if (!this.isInitialized) await this.initialize();

        const state = window.stateManager.state;
        const features = this.prepareInsightFeatures(state);
        
        return this.models.insights.generate(features);
    }

    prepareInsightFeatures(state) {
        const { transactions, monthlyBudgets, categories } = state;
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

        const recentTransactions = transactions.filter(tx => 
            new Date(tx.date) >= threeMonthsAgo
        );

        // Financial health metrics
        const totalIncome = recentTransactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const totalExpenses = recentTransactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;

        // Spending patterns
        const categoryTrends = this.analyzeCategoryTrends(transactions);
        const expenseStability = this.calculateExpenseStability(recentTransactions);
        const emergencyFundScore = this.calculateEmergencyFundScore(totalExpenses, monthlyBudgets);

        return {
            savingsRate,
            expenseStability,
            emergencyFundScore,
            categoryTrends,
            totalIncome,
            totalExpenses,
            transactionCount: recentTransactions.length,
            categoryDiversity: this.calculateCategoryDiversity(recentTransactions)
        };
    }

    analyzeCategoryTrends(transactions) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

        const currentSpending = {};
        const lastSpending = {};

        transactions.forEach(tx => {
            if (tx.type === 'expense') {
                const month = tx.date.substring(0, 7);
                if (month === currentMonth) {
                    currentSpending[tx.category] = (currentSpending[tx.category] || 0) + tx.amount;
                } else if (month === lastMonthKey) {
                    lastSpending[tx.category] = (lastSpending[tx.category] || 0) + tx.amount;
                }
            }
        });

        const trends = [];
        Object.keys(currentSpending).forEach(category => {
            const current = currentSpending[category];
            const last = lastSpending[category] || 0;
            const trend = last > 0 ? (current - last) / last : current > 0 ? 1 : 0;

            trends.push({
                category,
                current,
                last,
                trend,
                change: current - last,
                significance: Math.abs(trend) * current // Weight by amount
            });
        });

        return trends.sort((a, b) => b.significance - a.significance);
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
        if (amounts.length < 2) return 1;

        const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - avg, 2), 0) / amounts.length;
        const stability = 1 - (Math.sqrt(variance) / avg);

        return Math.max(0, Math.min(1, stability));
    }

    calculateEmergencyFundScore(totalExpenses, monthlyBudgets) {
        const avgMonthlyExpense = totalExpenses / 3;
        const currentMonth = window.stateManager.getCurrentMonthKey();
        const currentBalance = monthlyBudgets[currentMonth]?.endingBalance || 0;

        if (avgMonthlyExpense === 0) return 0.5;

        const monthsCovered = currentBalance / avgMonthlyExpense;
        if (monthsCovered >= 6) return 1;
        if (monthsCovered >= 3) return 0.75;
        if (monthsCovered >= 1) return 0.5;
        return 0.25;
    }

    calculateCategoryDiversity(transactions) {
        const expenses = transactions.filter(tx => tx.type === 'expense');
        if (expenses.length === 0) return 0;

        const categoryAmounts = {};
        expenses.forEach(tx => {
            categoryAmounts[tx.category] = (categoryAmounts[tx.category] || 0) + tx.amount;
        });

        const total = Object.values(categoryAmounts).reduce((a, b) => a + b, 0);
        const shares = Object.values(categoryAmounts).map(amount => amount / total);
        const diversity = 1 - shares.reduce((sum, share) => sum + Math.pow(share, 2), 0);

        return diversity;
    }

    // Generate recommendations
    async generateRecommendations() {
        if (!this.isInitialized) await this.initialize();

        const insights = await this.generateInsights();
        const features = this.prepareRecommendationFeatures(insights);
        
        return this.models.recommendations.generate(features);
    }

    prepareRecommendationFeatures(insights) {
        return {
            savingsRate: insights.savingsRate,
            expenseStability: insights.expenseStability,
            emergencyFundScore: insights.emergencyFundScore,
            categoryTrends: insights.categoryTrends,
            financialHealth: this.calculateFinancialHealth(insights)
        };
    }

    calculateFinancialHealth(insights) {
        const weights = {
            savingsRate: 0.4,
            expenseStability: 0.3,
            emergencyFundScore: 0.2,
            categoryDiversity: 0.1
        };

        return (
            insights.savingsRate * weights.savingsRate +
            insights.expenseStability * weights.expenseStability +
            insights.emergencyFundScore * weights.emergencyFundScore +
            insights.categoryDiversity * weights.categoryDiversity
        ) * 100;
    }

    // Voice command processing
    async processVoiceCommand(command) {
        if (!this.isInitialized) await this.initialize();

        const normalizedCommand = command.toLowerCase().trim();
        
        // Pattern matching for common voice commands
        const patterns = {
            addIncome: /(add|record|log).*(income|salary|payment).*(\d+)/i,
            addExpense: /(add|record|log).*(expense|spending|purchase).*(\d+)/i,
            showBalance: /(show|what.s).*(balance|net worth)/i,
            spendingReport: /(show|generate).*(spending|expense).*(report|summary)/i,
            budgetStatus: /(how).*(budget|spending).*(going)/i
        };

        for (const [action, pattern] of Object.entries(patterns)) {
            if (pattern.test(normalizedCommand)) {
                return this.executeVoiceAction(action, normalizedCommand);
            }
        }

        return {
            success: false,
            message: "I didn't understand that command. Try saying 'Add income of 5000 from salary' or 'Show my spending report'."
        };
    }

    executeVoiceAction(action, command) {
        switch (action) {
            case 'addIncome':
                return this.processAddTransaction(command, 'income');
            case 'addExpense':
                return this.processAddTransaction(command, 'expense');
            case 'showBalance':
                return this.processShowBalance();
            case 'spendingReport':
                return this.processSpendingReport();
            case 'budgetStatus':
                return this.processBudgetStatus();
            default:
                return { success: false, message: "Command not implemented" };
        }
    }

    processAddTransaction(command, type) {
    // match numbers with optional commas and decimals, e.g. "5,000.50" or "2000"
    const amountMatch = command.match(/([0-9]+(?:[,\s][0-9]{3})*(?:\.[0-9]+)?)/);
    if (!amountMatch) {
        return { success: false, message: "Please specify an amount." };
    }

    // normalize number string: remove commas/spaces then parseFloat
    const raw = amountMatch[1].replace(/[, ]/g, '');
    const amount = parseFloat(raw);
    if (Number.isNaN(amount)) {
        return { success: false, message: "Couldn't parse the amount you said." };
    }

    const description = this.extractDescription(command);
    const category = this.suggestCategory(description, amount, type);

    // Create transaction
    const transaction = {
        id: `tx_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        desc: description || `${type} transaction`,
        type: type,
        category: category,
        amount: Number(Math.round(amount * 100) / 100) // round to 2 decimals
    };

    // ensure state manager exists
    if (window.stateManager && typeof window.stateManager.addTransaction === 'function') {
        window.stateManager.addTransaction(transaction);
    } else {
        console.warn('stateManager not available; transaction added to fallback state');
        window.stateManager = window.stateManager || { state: { transactions: [] }, addTransaction(tx) { this.state.transactions.push(tx); } };
        window.stateManager.addTransaction(transaction);
    }

    return {
        success: true,
        message: `Added ${type} of ${this.formatCurrency(amount)} for ${description}`,
        transaction: transaction
    };
}

extractDescription(command) {
    // Remove numbers and known command words
    const cleaned = command
        .replace(/(add|record|log|income|salary|expense|spending|purchase|from|for|\d+|[0-9]+(?:[,\s][0-9]{3})*(?:\.[0-9]+)?)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    return cleaned || 'Voice transaction';
}

// helper to format currency using app's formatter if present
formatCurrency(amount) {
    if (window.wealthCommandApp && typeof window.wealthCommandApp.formatCurrency === 'function') {
        return window.wealthCommandApp.formatCurrency(amount);
    }
    return new Intl.NumberFormat('en', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount);
}

    suggestCategory(description, amount, type) {
        const categories = window.stateManager.state.categories
            .filter(cat => cat.type === type);

        if (categories.length === 0) {
            return type === 'income' ? 'Salary' : 'General';
        }

        // Simple keyword matching for category suggestion
        const desc = description.toLowerCase();
        for (const category of categories) {
            if (desc.includes(category.name.toLowerCase())) {
                return category.name;
            }
        }

        // Return most used category or default
        return categories[0]?.name || (type === 'income' ? 'Salary' : 'General');
    }

    processShowBalance() {
    if (!window.stateManager || typeof window.stateManager.getMonthlySummary !== 'function') {
        return { success: false, message: "Balance not available yet." };
    }

    const summary = window.stateManager.getMonthlySummary();
    const formattedEnding = window.wealthCommandApp?.formatCurrency(summary.endingBalance) ?? summary.endingBalance;
    const formattedIncome = window.wealthCommandApp?.formatCurrency(summary.income) ?? summary.income;
    const formattedExpenses = window.wealthCommandApp?.formatCurrency(summary.expenses) ?? summary.expenses;

    return {
        success: true,
        message: `Your current balance is ${formattedEnding}. This month you've earned ${formattedIncome} and spent ${formattedExpenses}.`,
        data: summary
    };
}

    processSpendingReport() {
        const transactions = window.stateManager.getFilteredTransactions();
        const expenses = transactions.filter(tx => tx.type === 'expense');
        const totalSpent = expenses.reduce((sum, tx) => sum + tx.amount, 0);
        
        const categoryBreakdown = {};
        expenses.forEach(tx => {
            categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + tx.amount;
        });

        const topCategory = Object.entries(categoryBreakdown)
            .sort(([,a], [,b]) => b - a)[0];

        return {
            success: true,
            message: `You've spent ${totalSpent} this period. Your top spending category is ${topCategory?.[0]} at ${topCategory?.[1]}.`,
            data: { totalSpent, categoryBreakdown }
        };
    }

    processBudgetStatus() {
        const summary = window.stateManager.getMonthlySummary();
        const budget = window.stateManager.state.monthlyBudgets[window.stateManager.getCurrentMonthKey()];
        
        if (!budget) {
            return {
                success: true,
                message: "You haven't set a budget for this month yet."
            };
        }

        const remaining = (budget.startingBalance || 0) + summary.income - summary.expenses;
        const status = remaining >= 0 ? 'on track' : 'over budget';

        return {
            success: true,
            message: `You're ${status} for this month. ${remaining >= 0 ? 'You have ' + remaining + ' remaining.' : 'You are ' + Math.abs(remaining) + ' over budget.'}`,
            data: { remaining, status }
        };
    }
}

// AI Model Classes
class CategorizationModel {
    predict(features) {
        // Simple rule-based categorization (in production, this would be a trained ML model)
        const { description, amount, commonPatterns } = features;

        // Pattern-based categorization
        if (commonPatterns.includes('food')) return 'Food';
        if (commonPatterns.includes('transportation')) return 'Transportation';
        if (commonPatterns.includes('shopping')) return 'Shopping';
        if (commonPatterns.includes('entertainment')) return 'Entertainment';
        if (commonPatterns.includes('utilities')) return 'Utilities';
        if (commonPatterns.includes('healthcare')) return 'Healthcare';

        // Amount-based categorization for fallback
        if (amount < 50) return 'Miscellaneous';
        if (amount < 200) return 'General';
        return 'Major Expense';
    }
}

class PredictionModel {
    predict(features, timeframe) {
        const { monthlySpending, spendingTrend } = features;
        
        if (monthlySpending.length === 0) {
            return {
                amount: 0,
                confidence: 0,
                trend: 0,
                message: 'Insufficient data for prediction'
            };
        }

        const avgSpending = monthlySpending.reduce((a, b) => a + b, 0) / monthlySpending.length;
        const prediction = avgSpending * (1 + spendingTrend * 0.7); // Conservative trend application
        
        const confidence = Math.min(0.85, monthlySpending.length / 8); // More data = more confidence

        return {
            amount: Math.round(prediction),
            confidence: confidence,
            trend: spendingTrend,
            timeframe: timeframe,
            message: `Predicted spending: ${Math.round(prediction)} (${(spendingTrend * 100).toFixed(1)}% trend)`
        };
    }
}

class InsightsModel {
    generate(features) {
        const insights = [];
        const { savingsRate, expenseStability, emergencyFundScore, categoryTrends } = features;

        // Savings rate insights
        if (savingsRate >= 0.2) {
            insights.push({
                type: 'positive',
                priority: 'high',
                title: 'Excellent Savings Rate',
                message: `You're saving ${(savingsRate * 100).toFixed(1)}% of your income! Keep up the great work.`,
                icon: 'bi-piggy-bank',
                action: null
            });
        } else if (savingsRate >= 0.1) {
            insights.push({
                type: 'info',
                priority: 'medium',
                title: 'Good Savings Habit',
                message: `You're saving ${(savingsRate * 100).toFixed(1)}% of your income. Aim for 20% for optimal wealth building.`,
                icon: 'bi-piggy-bank',
                action: 'Set a savings goal'
            });
        } else if (savingsRate < 0) {
            insights.push({
                type: 'warning',
                priority: 'high',
                title: 'Spending Exceeds Income',
                message: 'You are spending more than you earn. Consider reviewing your expenses or finding additional income sources.',
                icon: 'bi-exclamation-triangle',
                action: 'Review budget'
            });
        }

        // Expense stability insights
        if (expenseStability < 0.7) {
            insights.push({
                type: 'warning',
                priority: 'medium',
                title: 'Irregular Spending Pattern',
                message: 'Your monthly spending varies significantly. Consider creating a more consistent budget.',
                icon: 'bi-graph-up-arrow',
                action: 'Create budget plan'
            });
        }

        // Emergency fund insights
        if (emergencyFundScore < 0.5) {
            insights.push({
                type: 'warning',
                priority: 'high',
                title: 'Build Emergency Fund',
                message: 'Your emergency fund covers less than 3 months of expenses. Consider building a 3-6 month safety net.',
                icon: 'bi-shield-exclamation',
                action: 'Set savings goal'
            });
        }

        // Category trend insights
        categoryTrends.slice(0, 3).forEach(trend => {
            if (trend.trend > 0.15) {
                insights.push({
                    type: 'warning',
                    priority: 'medium',
                    title: `Rising ${trend.category} Spending`,
                    message: `Your ${trend.category.toLowerCase()} spending increased by ${(trend.trend * 100).toFixed(1)}% compared to last month.`,
                    icon: 'bi-arrow-up-right',
                    action: 'Review category budget'
                });
            } else if (trend.trend < -0.15) {
                insights.push({
                    type: 'positive',
                    priority: 'low',
                    title: `Reduced ${trend.category} Spending`,
                    message: `Great job reducing your ${trend.category.toLowerCase()} spending by ${Math.abs(trend.trend * 100).toFixed(1)}%!`,
                    icon: 'bi-arrow-down-right',
                    action: null
                });
            }
        });

        return {
            insights: insights.sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }),
            metrics: features
        };
    }
}

class RecommendationsModel {
    generate(features) {
        const recommendations = [];
        const { savingsRate, emergencyFundScore, financialHealth } = features;

        // Savings recommendations
        if (savingsRate < 0.2) {
            recommendations.push({
                type: 'savings',
                priority: 'high',
                title: 'Increase Savings Rate',
                description: 'Aim to save at least 20% of your income for long-term financial security.',
                steps: [
                    'Review discretionary spending',
                    'Set up automatic transfers to savings',
                    'Consider high-yield savings accounts'
                ],
                impact: 'high'
            });
        }

        // Emergency fund recommendations
        if (emergencyFundScore < 0.75) {
            recommendations.push({
                type: 'safety',
                priority: 'high',
                title: 'Build Emergency Fund',
                description: 'Create a 3-6 month emergency fund to protect against unexpected expenses.',
                steps: [
                    'Set a monthly savings goal',
                    'Keep funds in easily accessible account',
                    'Automate contributions'
                ],
                impact: 'high'
            });
        }

        // Investment recommendations for healthy finances
        if (financialHealth > 75 && savingsRate > 0.15) {
            recommendations.push({
                type: 'investment',
                priority: 'medium',
                title: 'Consider Investments',
                description: 'With your strong financial position, consider exploring investment opportunities.',
                steps: [
                    'Research low-cost index funds',
                    'Consider retirement accounts',
                    'Diversify your portfolio'
                ],
                impact: 'medium'
            });
        }

        return recommendations;
    }
}

// Create global AI engine instance
window.aiEngine = new AIEngine();
