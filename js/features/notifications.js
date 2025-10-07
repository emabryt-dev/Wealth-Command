// Wealth Command Pro - Notifications Feature
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.permission = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        await this.requestPermission();
        this.loadNotifications();
        this.setupPeriodicChecks();
        this.initialized = true;
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            return;
        }

        try {
            this.permission = await Notification.requestPermission();
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    }

    loadNotifications() {
        const saved = localStorage.getItem('wealthCommandNotifications');
        if (saved) {
            try {
                this.notifications = JSON.parse(saved);
            } catch (error) {
                console.error('Error loading notifications:', error);
                this.notifications = [];
            }
        }
    }

    saveNotifications() {
        try {
            localStorage.setItem('wealthCommandNotifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('Error saving notifications:', error);
        }
    }

    setupPeriodicChecks() {
        // Check for notifications every minute
        setInterval(() => {
            this.checkScheduledNotifications();
        }, 60000);

        // Check for budget alerts daily
        setInterval(() => {
            this.checkBudgetAlerts();
        }, 24 * 60 * 60 * 1000);
    }

    // Notification Creation Methods
    async createNotification(title, options = {}) {
        const notification = {
            id: this.generateId(),
            title,
            ...options,
            timestamp: new Date().toISOString(),
            read: false
        };

        this.notifications.unshift(notification);
        this.saveNotifications();

        // Show browser notification if permission granted
        if (this.permission === 'granted') {
            this.showBrowserNotification(title, options);
        }

        // Update UI if on notifications page
        this.updateNotificationsUI();

        return notification;
    }

    showBrowserNotification(title, options = {}) {
        if (this.permission !== 'granted') return;

        const notification = new Notification(title, {
            icon: '/wealth-command-icon.png',
            badge: '/wealth-command-badge.png',
            ...options
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        setTimeout(() => notification.close(), 5000);
    }

    // Financial Notification Types
    async createBudgetAlert(category, spent, budget, month) {
        const percentage = (spent / budget) * 100;
        let severity = 'info';

        if (percentage >= 100) {
            severity = 'error';
        } else if (percentage >= 80) {
            severity = 'warning';
        }

        return await this.createNotification(
            `Budget Alert: ${category}`,
            {
                body: `You've spent ${spent.toLocaleString()} of ${budget.toLocaleString()} (${percentage.toFixed(1)}%) in ${month}`,
                type: 'budget',
                severity,
                category,
                data: { spent, budget, percentage, month }
            }
        );
    }

    async createBillReminder(bill, daysUntilDue) {
        return await this.createNotification(
            `Bill Reminder: ${bill.description}`,
            {
                body: `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}. Amount: ${bill.amount.toLocaleString()}`,
                type: 'bill',
                severity: daysUntilDue <= 1 ? 'error' : daysUntilDue <= 3 ? 'warning' : 'info',
                data: { bill, daysUntilDue }
            }
        );
    }

    async createDebtReminder(debt, daysUntilDue) {
        const remaining = debt.manager?.getRemainingAmount?.(debt) || debt.remaining;
        return await this.createNotification(
            `Debt Reminder: ${debt.description || `${debt.type} debt`}`,
            {
                body: `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}. Remaining: ${remaining.toLocaleString()}`,
                type: 'debt',
                severity: daysUntilDue <= 1 ? 'error' : daysUntilDue <= 3 ? 'warning' : 'info',
                data: { debt, daysUntilDue, remaining }
            }
        );
    }

    async createSavingsGoalUpdate(goal, progress) {
        return await this.createNotification(
            `Savings Goal: ${goal.name}`,
            {
                body: `Progress: ${progress.toFixed(1)}% - ${goal.saved.toLocaleString()} of ${goal.target.toLocaleString()}`,
                type: 'savings',
                severity: 'info',
                data: { goal, progress }
            }
        );
    }

    async createSpendingInsight(insight) {
        return await this.createNotification(
            'Spending Insight',
            {
                body: insight.message,
                type: 'insight',
                severity: 'info',
                data: { insight }
            }
        );
    }

    // Scheduled Notifications
    async scheduleNotification(date, title, options = {}) {
        const notification = {
            id: this.generateId(),
            title,
            ...options,
            scheduled: date,
            sent: false,
            timestamp: new Date().toISOString()
        };

        this.notifications.push(notification);
        this.saveNotifications();

        return notification;
    }

    checkScheduledNotifications() {
        const now = new Date();
        const toSend = this.notifications.filter(notification => 
            notification.scheduled && 
            !notification.sent && 
            new Date(notification.scheduled) <= now
        );

        toSend.forEach(notification => {
            this.createNotification(notification.title, {
                ...notification,
                scheduled: undefined,
                sent: undefined
            });
            
            notification.sent = true;
        });

        if (toSend.length > 0) {
            this.saveNotifications();
        }
    }

    // Budget Alerts
    async checkBudgetAlerts() {
        if (!window.stateManager) return;

        const state = window.stateManager.state;
        const currentMonth = new Date().toISOString().substring(0, 7);
        
        // Check category budgets
        if (state.monthlyBudgets && state.monthlyBudgets[currentMonth]) {
            const monthBudget = state.monthlyBudgets[currentMonth];
            
            // This would need to be implemented based on your budget structure
            // For now, it's a placeholder
        }

        // Check bill reminders
        await this.checkBillReminders();
        
        // Check debt reminders
        await this.checkDebtReminders();
        
        // Check savings goals
        await this.checkSavingsGoals();
    }

    async checkBillReminders() {
        // Implementation for bill reminders
        // This would check for upcoming bills and create notifications
    }

    async checkDebtReminders() {
        if (!window.debtManager) return;

        const upcomingPayments = window.debtManager.getUpcomingPayments?.(7) || [];
        
        for (const payment of upcomingPayments) {
            const daysUntil = Math.ceil((new Date(payment.date) - new Date()) / (1000 * 60 * 60 * 24));
            
            if (daysUntil <= 7) {
                await this.createDebtReminder(payment, daysUntil);
            }
        }
    }

    async checkSavingsGoals() {
        // Implementation for savings goal notifications
        // This would check progress on savings goals
    }

    // Notification Management
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveNotifications();
            this.updateNotificationsUI();
        }
    }

    markAllAsRead() {
        this.notifications.forEach(notification => {
            notification.read = true;
        });
        this.saveNotifications();
        this.updateNotificationsUI();
    }

    deleteNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.saveNotifications();
        this.updateNotificationsUI();
    }

    clearAllNotifications() {
        this.notifications = [];
        this.saveNotifications();
        this.updateNotificationsUI();
    }

    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    // UI Methods
    updateNotificationsUI() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            const unreadCount = this.getUnreadCount();
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }

        // Update notifications panel if open
        const panel = document.getElementById('notificationsPanel');
        if (panel && panel.style.display !== 'none') {
            this.renderNotificationsPanel();
        }
    }

    renderNotificationsPanel() {
        const container = document.getElementById('notificationsContainer');
        if (!container) return;

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-bell fs-1"></i>
                    <p class="mt-2">No notifications</p>
                </div>
            `;
            return;
        }

        const notificationsHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" 
                 data-notification-id="${notification.id}">
                <div class="notification-icon">
                    <i class="bi ${this.getNotificationIcon(notification.type)} text-${this.getSeverityColor(notification.severity)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-body">${notification.body}</div>
                    <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
                </div>
                <div class="notification-actions">
                    ${!notification.read ? `
                        <button class="btn-action btn-mark-read" onclick="notificationManager.markAsRead('${notification.id}')"
                                title="Mark as read">
                            <i class="bi bi-check"></i>
                        </button>
                    ` : ''}
                    <button class="btn-action btn-delete" onclick="notificationManager.deleteNotification('${notification.id}')"
                            title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = notificationsHTML;
    }

    showNotificationsPanel() {
        let panel = document.getElementById('notificationsPanel');
        
        if (!panel) {
            panel = this.createNotificationsPanel();
        }

        panel.style.display = 'block';
        this.renderNotificationsPanel();
        
        // Add click outside to close
        setTimeout(() => {
            const closePanel = (e) => {
                if (!panel.contains(e.target) && !e.target.closest('.notification-trigger')) {
                    panel.style.display = 'none';
                    document.removeEventListener('click', closePanel);
                }
            };
            document.addEventListener('click', closePanel);
        }, 100);
    }

    createNotificationsPanel() {
        const panelHTML = `
            <div id="notificationsPanel" class="notifications-panel">
                <div class="notifications-header">
                    <h6>Notifications</h6>
                    <div class="notifications-actions">
                        <button class="btn btn-sm btn-outline-secondary" onclick="notificationManager.markAllAsRead()">
                            Mark all read
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="notificationManager.clearAllNotifications()">
                            Clear all
                        </button>
                    </div>
                </div>
                <div class="notifications-body">
                    <div id="notificationsContainer"></div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', panelHTML);
        return document.getElementById('notificationsPanel');
    }

    // Utility Methods
    getNotificationIcon(type) {
        const icons = {
            'budget': 'bi-pie-chart',
            'bill': 'bi-receipt',
            'debt': 'bi-cash-coin',
            'savings': 'bi-piggy-bank',
            'insight': 'bi-lightbulb',
            'system': 'bi-gear',
            'default': 'bi-bell'
        };
        return icons[type] || icons.default;
    }

    getSeverityColor(severity) {
        const colors = {
            'error': 'danger',
            'warning': 'warning',
            'info': 'info',
            'success': 'success'
        };
        return colors[severity] || 'info';
    }

    formatTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;

        if (diff < 60000) { // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // Less than 1 hour
            const minutes = Math.floor(diff / 60000);
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else if (diff < 86400000) { // Less than 1 day
            const hours = Math.floor(diff / 3600000);
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else if (diff < 604800000) { // Less than 1 week
            const days = Math.floor(diff / 86400000);
            return `${days} day${days !== 1 ? 's' : ''} ago`;
        } else {
            return time.toLocaleDateString();
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Export/Import
    exportNotifications() {
        const data = {
            notifications: this.notifications,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        return JSON.stringify(data, null, 2);
    }

    importNotifications(data) {
        try {
            const imported = JSON.parse(data);
            if (imported.notifications && Array.isArray(imported.notifications)) {
                this.notifications = imported.notifications;
                this.saveNotifications();
                this.updateNotificationsUI();
                return true;
            }
        } catch (error) {
            console.error('Error importing notifications:', error);
        }
        return false;
    }
}

// Create global notification manager instance
window.notificationManager = new NotificationManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.notificationManager.init();
});
