// Wealth Command Pro - Error Handling System
class ErrorHandler {
    constructor() {
        this.errors = new Map();
        this.maxErrors = 100;
        this.reportingEnabled = false;
        this.init();
    }

    init() {
        this.setupGlobalErrorHandling();
        this.setupPromiseRejectionHandling();
        this.setupConsoleErrorCapture();
    }

    // Global Error Handling
    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'GlobalError',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            });
        });
    }

    setupPromiseRejectionHandling() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'UnhandledPromiseRejection',
                message: event.reason?.message || 'Unknown promise rejection',
                reason: event.reason,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            });
        });
    }

    setupConsoleErrorCapture() {
        const originalConsoleError = console.error;
        console.error = (...args) => {
            this.handleError({
                type: 'ConsoleError',
                message: args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' '),
                timestamp: new Date().toISOString(),
                stack: new Error().stack
            });
            originalConsoleError.apply(console, args);
        };
    }

    // Error Handling Methods
    handleError(errorInfo) {
        const errorId = this.generateErrorId();
        const enhancedError = {
            id: errorId,
            ...errorInfo,
            severity: this.determineSeverity(errorInfo),
            handled: false,
            sessionId: this.getSessionId()
        };

        // Store error
        this.storeError(enhancedError);

        // Show user-friendly error message
        this.showUserError(enhancedError);

        // Report to analytics if enabled
        if (this.reportingEnabled) {
            this.reportError(enhancedError);
        }

        // Log to console for development
        if (process.env.NODE_ENV === 'development') {
            console.error('Application Error:', enhancedError);
        }

        return errorId;
    }

    storeError(error) {
        // Keep only recent errors
        if (this.errors.size >= this.maxErrors) {
            const firstKey = this.errors.keys().next().value;
            this.errors.delete(firstKey);
        }

        this.errors.set(error.id, error);

        // Also save to localStorage for persistence
        this.saveErrorsToStorage();
    }

    saveErrorsToStorage() {
        const errorsArray = Array.from(this.errors.values());
        try {
            localStorage.setItem('wealthCommand_errors', JSON.stringify(errorsArray));
        } catch (error) {
            console.warn('Could not save errors to localStorage:', error);
        }
    }

    loadErrorsFromStorage() {
        try {
            const stored = localStorage.getItem('wealthCommand_errors');
            if (stored) {
                const errorsArray = JSON.parse(stored);
                errorsArray.forEach(error => {
                    this.errors.set(error.id, error);
                });
            }
        } catch (error) {
            console.warn('Could not load errors from localStorage:', error);
        }
    }

    // User Error Display
    showUserError(error) {
        // Don't show errors for minor issues
        if (error.severity === 'low') {
            return;
        }

        const message = this.getUserFriendlyMessage(error);
        
        // Use toast notification system
        if (window.showToast) {
            window.showToast(message, 'error', 5000);
        } else {
            // Fallback alert
            alert(`Application Error: ${message}`);
        }

        // Show detailed error modal for high severity errors
        if (error.severity === 'high' && window.showErrorModal) {
            window.showErrorModal(error);
        }
    }

    getUserFriendlyMessage(error) {
        const messages = {
            'NetworkError': 'Unable to connect to the server. Please check your internet connection.',
            'QuotaExceededError': 'Storage limit reached. Please free up some space.',
            'SyntaxError': 'There was an error processing your data.',
            'TypeError': 'An unexpected error occurred.',
            'Default': 'Something went wrong. Please try again.'
        };

        return messages[error.name] || messages[error.type] || messages.Default;
    }

    // Error Reporting
    async reportError(error) {
        if (!this.reportingEnabled) return;

        try {
            const report = {
                app: 'Wealth Command Pro',
                version: '2.0',
                error: {
                    id: error.id,
                    type: error.type,
                    message: error.message,
                    severity: error.severity,
                    stack: error.stack
                },
                context: {
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    timestamp: error.timestamp,
                    sessionId: error.sessionId,
                    viewport: `${window.innerWidth}x${window.innerHeight}`,
                    online: navigator.onLine
                },
                user: {
                    // Anonymous user data
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    language: navigator.language,
                    platform: navigator.platform
                }
            };

            // Send to error reporting service
            await this.sendErrorReport(report);
        } catch (reportingError) {
            console.warn('Error reporting failed:', reportingError);
        }
    }

    async sendErrorReport(report) {
        // In a real app, this would send to your error reporting service
        // For now, we'll just log it
        console.log('Error Report:', report);
        
        // Example: Send to a hypothetical endpoint
        /*
        try {
            await fetch('/api/error-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(report)
            });
        } catch (error) {
            console.warn('Failed to send error report:', error);
        }
        */
    }

    // Error Recovery Strategies
    async handleStorageError(error, operation, retryCount = 0) {
        const maxRetries = 3;
        
        if (retryCount >= maxRetries) {
            this.handleError({
                type: 'StorageError',
                message: `Failed ${operation} after ${maxRetries} retries`,
                originalError: error,
                operation: operation
            });
            throw error;
        }

        try {
            // Wait with exponential backoff
            const delay = Math.pow(2, retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Clear cache and retry
            if (window.dataPersistence) {
                await window.dataPersistence.clearExpiredCache();
            }
            
            return await this.retryOperation(operation);
        } catch (retryError) {
            return this.handleStorageError(retryError, operation, retryCount + 1);
        }
    }

    async retryOperation(operation) {
        // This would be implemented based on the specific operation
        // For now, it's a placeholder
        throw new Error('Retry operation not implemented');
    }

    handleSyncError(error) {
        this.handleError({
            type: 'SyncError',
            message: error.message,
            originalError: error,
            timestamp: new Date().toISOString()
        });

        // Show sync-specific error message
        const message = this.getSyncErrorMessage(error);
        window.showToast?.(message, 'warning');
    }

    getSyncErrorMessage(error) {
        if (error.message.includes('network') || !navigator.onLine) {
            return 'Sync failed: No internet connection. Changes saved locally.';
        } else if (error.message.includes('auth') || error.message.includes('401')) {
            return 'Sync failed: Authentication required. Please sign in again.';
        } else {
            return 'Sync failed. Your data is safe locally.';
        }
    }

    // Error Boundary for UI Components
    createErrorBoundary(componentName) {
        return {
            catch: (error, errorInfo) => {
                this.handleError({
                    type: 'ReactErrorBoundary',
                    message: error.message,
                    component: componentName,
                    stack: error.stack,
                    componentStack: errorInfo.componentStack,
                    timestamp: new Date().toISOString()
                });
            }
        };
    }

    // Utility Methods
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('wealthCommand_sessionId');
        if (!sessionId) {
            sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('wealthCommand_sessionId', sessionId);
        }
        return sessionId;
    }

    determineSeverity(error) {
        // High severity errors
        if (error.type === 'UnhandledPromiseRejection' || 
            error.message?.includes('QuotaExceeded') ||
            error.message?.includes('SyntaxError')) {
            return 'high';
        }

        // Medium severity errors
        if (error.type === 'NetworkError' || 
            error.type === 'SyncError' ||
            error.message?.includes('storage')) {
            return 'medium';
        }

        // Low severity errors
        return 'low';
    }

    // Error Analysis and Insights
    analyzeErrorPatterns() {
        const errors = Array.from(this.errors.values());
        const patterns = {
            byType: {},
            bySeverity: {},
            byHour: {},
            recent: errors.slice(-10)
        };

        errors.forEach(error => {
            // Count by type
            patterns.byType[error.type] = (patterns.byType[error.type] || 0) + 1;
            
            // Count by severity
            patterns.bySeverity[error.severity] = (patterns.bySeverity[error.severity] || 0) + 1;
            
            // Count by hour
            const hour = new Date(error.timestamp).getHours();
            patterns.byHour[hour] = (patterns.byHour[hour] || 0) + 1;
        });

        return patterns;
    }

    getErrorStats() {
        const errors = Array.from(this.errors.values());
        const now = new Date();
        const last24Hours = errors.filter(error => 
            new Date(error.timestamp) > new Date(now.getTime() - 24 * 60 * 60 * 1000)
        );

        return {
            total: errors.length,
            last24Hours: last24Hours.length,
            bySeverity: this.analyzeErrorPatterns().bySeverity,
            mostCommon: this.getMostCommonError()
        };
    }

    getMostCommonError() {
        const patterns = this.analyzeErrorPatterns();
        let mostCommon = { type: '', count: 0 };
        
        Object.entries(patterns.byType).forEach(([type, count]) => {
            if (count > mostCommon.count) {
                mostCommon = { type, count };
            }
        });

        return mostCommon;
    }

    // Error Cleanup
    clearOldErrors() {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const oldErrorIds = [];

        this.errors.forEach((error, id) => {
            if (new Date(error.timestamp) < oneWeekAgo) {
                oldErrorIds.push(id);
            }
        });

        oldErrorIds.forEach(id => this.errors.delete(id));
        this.saveErrorsToStorage();
    }

    clearAllErrors() {
        this.errors.clear();
        localStorage.removeItem('wealthCommand_errors');
    }

    // Public API
    enableReporting() {
        this.reportingEnabled = true;
    }

    disableReporting() {
        this.reportingEnabled = false;
    }

    getErrors() {
        return Array.from(this.errors.values());
    }

    getError(id) {
        return this.errors.get(id);
    }

    // Development Tools
    simulateError(type = 'test') {
        const testError = new Error(`Simulated ${type} error for testing`);
        this.handleError({
            type: 'SimulatedError',
            message: testError.message,
            stack: testError.stack,
            timestamp: new Date().toISOString(),
            severity: 'low'
        });
    }

    // Error Prevention
    validateTransaction(transaction) {
        const errors = [];

        if (!transaction.date) {
            errors.push('Date is required');
        }

        if (!transaction.desc || transaction.desc.trim().length < 2) {
            errors.push('Description must be at least 2 characters');
        }

        if (!transaction.type || !['income', 'expense'].includes(transaction.type)) {
            errors.push('Type must be income or expense');
        }

        if (!transaction.category) {
            errors.push('Category is required');
        }

        if (!transaction.amount || isNaN(transaction.amount) || transaction.amount <= 0) {
            errors.push('Amount must be a positive number');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    validateCategory(category) {
        const errors = [];

        if (!category.name || category.name.trim().length < 2) {
            errors.push('Category name must be at least 2 characters');
        }

        if (!category.type || !['income', 'expense'].includes(category.type)) {
            errors.push('Category type must be income or expense');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// Create global error handler instance
window.errorHandler = new ErrorHandler();

// Initialize error boundary for the entire app
window.appErrorBoundary = window.errorHandler.createErrorBoundary('App');

// Utility function for safe execution
window.safeExecute = async (operation, fallback = null, context = 'unknown') => {
    try {
        return await operation();
    } catch (error) {
        window.errorHandler.handleError({
            type: 'SafeExecuteError',
            message: `Error in ${context}: ${error.message}`,
            originalError: error,
            context: context,
            timestamp: new Date().toISOString()
        });
        return fallback;
    }
};
