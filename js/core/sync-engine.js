// Wealth Command Pro - Sync Engine
class SyncEngine {
    constructor() {
        this.googleUser = null;
        this.googleAuth = null;
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.pendingSync = false;
        this.lastSyncTime = null;
        this.lastBackupMonth = null;
        
        // Configuration
        this.config = {
            GOOGLE_DRIVE_FILE_NAME: 'wealth_command_pro_data.json',
            GOOGLE_CLIENT_ID: '86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com',
            SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutes
            BACKUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
            MAX_RETRIES: 3,
            RETRY_DELAY: 2000
        };

        this.init();
    }

    async init() {
        await this.loadGoogleAuth();
        this.setupEventListeners();
        this.startPeriodicSync();
        
        // Try to restore previous session
        await this.restoreSession();
    }

    async loadGoogleAuth() {
        if (!window.google) {
            console.warn('Google API not loaded');
            return false;
        }

        try {
            this.googleAuth = google.accounts.oauth2.initTokenClient({
                client_id: this.config.GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.file',
                callback: async (tokenResponse) => {
                    await this.handleTokenResponse(tokenResponse);
                },
                error_callback: (error) => {
                    this.handleAuthError(error);
                }
            });
            return true;
        } catch (error) {
            console.error('Failed to initialize Google Auth:', error);
            return false;
        }
    }

    async handleTokenResponse(tokenResponse) {
        if (tokenResponse && tokenResponse.access_token) {
            this.googleUser = {
                access_token: tokenResponse.access_token,
                expires_in: tokenResponse.expires_in,
                acquired_at: Date.now(),
                scope: tokenResponse.scope
            };

            await this.saveUserData();
            this.updateSyncStatus('success', 'Google Drive connected!');
            
            // Setup auto-refresh
            this.setupTokenAutoRefresh();
            
            // Initial sync
            await this.syncData();
        }
    }

    handleAuthError(error) {
        console.error('Google Auth error:', error);
        
        if (error.type === 'user_logged_out') {
            this.googleUser = null;
            this.clearUserData();
            this.updateSyncStatus('offline', 'Signed out from Google Drive');
        } else {
            this.updateSyncStatus('error', 'Google Sign-In failed');
        }
    }

    async restoreSession() {
        try {
            const savedUser = localStorage.getItem('googleUser');
            if (savedUser) {
                const userData = JSON.parse(savedUser);
                
                // Check if token is still valid
                if (this.isTokenValid(userData)) {
                    this.googleUser = userData;
                    this.setupTokenAutoRefresh();
                    this.updateSyncStatus('success', 'Google Drive connected');
                    
                    // Check for updates
                    await this.checkForRemoteUpdates();
                } else {
                    this.clearUserData();
                    this.updateSyncStatus('offline', 'Session expired, please sign in again');
                }
            }
        } catch (error) {
            console.error('Error restoring session:', error);
            this.clearUserData();
        }
    }

    isTokenValid(userData) {
        if (!userData || !userData.acquired_at || !userData.expires_in) {
            return false;
        }

        const elapsed = Date.now() - userData.acquired_at;
        const expiresIn = userData.expires_in * 1000;
        const buffer = 2 * 60 * 1000; // 2 minutes buffer

        return elapsed < (expiresIn - buffer);
    }

    setupTokenAutoRefresh() {
        if (!this.googleUser || !this.googleUser.expires_in) return;

        const refreshTime = (this.googleUser.expires_in - 300) * 1000; // 5 minutes before expiry
        if (refreshTime > 0) {
            setTimeout(() => {
                if (this.googleUser && this.isOnline) {
                    console.log('Auto-refreshing Google token');
                    this.requestAuth();
                }
            }, refreshTime);
        }
    }

    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateSyncStatus('info', 'Back online. Syncing data...');
            
            if (this.googleUser) {
                setTimeout(() => this.syncData(), 2000);
            }
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateSyncStatus('warning', 'Working offline. Changes saved locally.');
        });

        // Listen for state changes that require sync
        if (window.stateManager) {
            window.stateManager.subscribe((state) => {
                this.handleStateChange(state);
            });
        }
    }

    handleStateChange(state) {
        // Debounce sync to avoid too many requests
        if (this.googleUser && this.isOnline && !this.isSyncing) {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = setTimeout(() => {
                this.syncData().catch(console.error);
            }, 5000);
        }
    }

    async syncData() {
        if (this.isSyncing) {
            this.pendingSync = true;
            return false;
        }

        if (!this.googleUser || !this.isOnline) {
            this.pendingSync = true;
            return false;
        }

        if (!this.isTokenValid(this.googleUser)) {
            this.updateSyncStatus('warning', 'Session expired. Please sign in again.');
            this.clearUserData();
            return false;
        }

        this.isSyncing = true;
        this.updateSyncStatus('syncing', 'Syncing with Google Drive...');

        try {
            // Create sync data package
            const syncData = this.prepareSyncData();
            
            // Upload to Google Drive
            await this.uploadToDrive(this.config.GOOGLE_DRIVE_FILE_NAME, syncData);
            
            // Create monthly backup if needed
            await this.createMonthlyBackup(syncData);
            
            this.lastSyncTime = new Date().toISOString();
            this.updateSyncStatus('success', 'Data synced successfully!');
            
            return true;
        } catch (error) {
            console.error('Sync failed:', error);
            this.handleSyncError(error);
            return false;
        } finally {
            this.isSyncing = false;
            
            if (this.pendingSync) {
                this.pendingSync = false;
                setTimeout(() => this.syncData(), 1000);
            }
        }
    }

    prepareSyncData() {
        const state = window.stateManager?.state || {};
        
        return {
            transactions: state.transactions || [],
            categories: state.categories || [],
            monthlyBudgets: state.monthlyBudgets || {},
            futureTransactions: state.futureTransactions || { income: [], expenses: [] },
            loans: state.loans || { given: [], taken: [] },
            currency: state.currency || 'PKR',
            preferences: state.preferences || {},
            lastSync: new Date().toISOString(),
            lastBackupMonth: this.lastBackupMonth,
            version: '2.0',
            app: 'Wealth Command Pro'
        };
    }

    async uploadToDrive(filename, data) {
        if (!this.googleUser) {
            throw new Error('Not authenticated');
        }

        // Check if file exists
        const existingFile = await this.findFile(filename);
        
        let response;
        if (existingFile) {
            // Update existing file
            response = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.googleUser.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                }
            );
        } else {
            // Create new file
            const createResponse = await fetch(
                'https://www.googleapis.com/drive/v3/files',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.googleUser.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: filename,
                        mimeType: 'application/json',
                        description: 'Wealth Command Pro Data File'
                    })
                }
            );

            if (!createResponse.ok) {
                throw new Error(`Failed to create file: ${createResponse.status}`);
            }

            const file = await createResponse.json();
            
            response = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.googleUser.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                }
            );
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }

        return true;
    }

    async findFile(filename) {
        if (!this.googleUser) return null;

        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${filename}' and trashed=false&fields=files(id,name,modifiedTime)`,
            {
                headers: {
                    'Authorization': `Bearer ${this.googleUser.access_token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();
        return data.files?.[0] || null;
    }

    async createMonthlyBackup(syncData) {
        const currentMonth = this.getCurrentMonthKey();
        
        if (this.lastBackupMonth === currentMonth) {
            return; // Already backed up this month
        }

        const backupFilename = `wealth_command_backup_${currentMonth}.json`;
        const backupData = {
            ...syncData,
            isMonthlyBackup: true,
            backupMonth: currentMonth,
            created: new Date().toISOString()
        };

        try {
            // Check if backup already exists
            const existingBackup = await this.findFile(backupFilename);
            if (!existingBackup) {
                await this.uploadToDrive(backupFilename, backupData);
                this.lastBackupMonth = currentMonth;
                
                // Update main file with new backup info
                syncData.lastBackupMonth = currentMonth;
                await this.uploadToDrive(this.config.GOOGLE_DRIVE_FILE_NAME, syncData);
                
                console.log('Monthly backup created successfully');
            }
        } catch (error) {
            console.warn('Failed to create monthly backup:', error);
            // Don't throw error for backup failures
        }
    }

    async downloadFromDrive() {
        if (!this.googleUser || !this.isOnline) {
            throw new Error('Not authenticated or offline');
        }

        const file = await this.findFile(this.config.GOOGLE_DRIVE_FILE_NAME);
        if (!file) {
            throw new Error('No sync data found on Google Drive');
        }

        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
            {
                headers: {
                    'Authorization': `Bearer ${this.googleUser.access_token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }

        return await response.json();
    }

    async loadFromDrive() {
        if (!this.isOnline) {
            throw new Error('Cannot load: You are offline');
        }

        this.updateSyncStatus('syncing', 'Loading data from Google Drive...');

        try {
            const driveData = await this.downloadFromDrive();
            await this.applyDriveData(driveData);
            
            this.updateSyncStatus('success', 'Data loaded from Google Drive!');
            return true;
        } catch (error) {
            console.error('Failed to load from Drive:', error);
            this.updateSyncStatus('error', 'Failed to load from Google Drive');
            throw error;
        }
    }

    async applyDriveData(driveData) {
        if (!window.stateManager) {
            throw new Error('State manager not available');
        }

        // Validate and apply data
        const updates = {};
        
        if (Array.isArray(driveData.transactions)) {
            updates.transactions = driveData.transactions;
        }
        
        if (Array.isArray(driveData.categories)) {
            updates.categories = driveData.categories;
        }
        
        if (driveData.monthlyBudgets) {
            updates.monthlyBudgets = driveData.monthlyBudgets;
        }
        
        if (driveData.futureTransactions) {
            updates.futureTransactions = driveData.futureTransactions;
        }
        
        if (driveData.loans) {
            updates.loans = driveData.loans;
        }
        
        if (driveData.currency) {
            updates.currency = driveData.currency;
        }
        
        if (driveData.preferences) {
            updates.preferences = { ...window.stateManager.state.preferences, ...driveData.preferences };
        }

        // Update last backup month
        if (driveData.lastBackupMonth) {
            this.lastBackupMonth = driveData.lastBackupMonth;
        }

        window.stateManager.setState(updates);
    }

    async checkForRemoteUpdates() {
        if (!this.googleUser || !this.isOnline) return;

        try {
            const file = await this.findFile(this.config.GOOGLE_DRIVE_FILE_NAME);
            if (!file) return;

            const localSyncTime = this.lastSyncTime;
            const remoteModTime = new Date(file.modifiedTime);

            if (!localSyncTime || new Date(localSyncTime) < remoteModTime) {
                // Remote is newer, ask user what to do
                this.promptSyncConflict(remoteModTime);
            }
        } catch (error) {
            console.warn('Failed to check for remote updates:', error);
        }
    }

    promptSyncConflict(remoteModTime) {
        if (!window.showConfirmationModal) return;

        const modalContent = `
            <div class="text-center">
                <i class="bi bi-cloud-arrow-down fs-1 text-primary mb-3"></i>
                <h5>Newer Data Available</h5>
                <p class="text-muted">
                    Your Google Drive has newer data (from ${remoteModTime.toLocaleString()}).
                    Do you want to load it?
                </p>
                <div class="mt-3">
                    <small class="text-muted">
                        Loading will replace your current local data.
                    </small>
                </div>
            </div>
        `;

        window.showConfirmationModal(
            'Sync Conflict',
            modalContent,
            async () => {
                await this.loadFromDrive();
            },
            'Load from Drive',
            'secondary',
            'Keep Local'
        );
    }

    handleSyncError(error) {
        if (error.message.includes('401') || error.message.includes('Authentication')) {
            this.updateSyncStatus('warning', 'Authentication expired. Please sign in again.');
            this.clearUserData();
        } else if (error.message.includes('network') || !this.isOnline) {
            this.updateSyncStatus('warning', 'Network error. Working offline.');
        } else {
            this.updateSyncStatus('error', `Sync failed: ${error.message}`);
        }
    }

    // Public methods
    async requestAuth() {
        if (!this.googleAuth) {
            const success = await this.loadGoogleAuth();
            if (!success) {
                throw new Error('Google authentication not available');
            }
        }

        this.googleAuth.requestAccessToken();
    }

    signOut() {
        if (this.googleUser?.access_token) {
            if (window.google?.accounts?.oauth2) {
                google.accounts.oauth2.revoke(this.googleUser.access_token, () => {
                    console.log('Token revoked');
                });
            }
        }

        this.googleUser = null;
        this.clearUserData();
        this.updateSyncStatus('offline', 'Signed out from Google Drive');
    }

    async manualSync() {
        if (!this.googleUser) {
            await this.requestAuth();
            return;
        }

        if (!this.isOnline) {
            this.updateSyncStatus('warning', 'Cannot sync: You are offline');
            return;
        }

        try {
            await this.syncData();
        } catch (error) {
            console.error('Manual sync failed:', error);
        }
    }

    async manualLoad() {
        if (!this.googleUser) {
            await this.requestAuth();
            return;
        }

        try {
            await this.loadFromDrive();
        } catch (error) {
            console.error('Manual load failed:', error);
        }
    }

    // Utility methods
    getCurrentMonthKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    async saveUserData() {
        if (this.googleUser) {
            localStorage.setItem('googleUser', JSON.stringify(this.googleUser));
        }
    }

    clearUserData() {
        localStorage.removeItem('googleUser');
        this.googleUser = null;
    }

    updateSyncStatus(status, message) {
        // Update UI elements
        const syncIcon = document.getElementById('syncStatusIcon');
        const syncText = document.getElementById('syncStatusText');

        if (syncIcon) {
            syncIcon.className = 'bi';
            
            switch (status) {
                case 'success':
                    syncIcon.classList.add('bi-cloud-check', 'text-success');
                    break;
                case 'syncing':
                    syncIcon.classList.add('bi-cloud-arrow-up', 'text-info', 'pulse');
                    break;
                case 'warning':
                    syncIcon.classList.add('bi-cloud-slash', 'text-warning');
                    break;
                case 'error':
                    syncIcon.classList.add('bi-cloud-x', 'text-danger');
                    break;
                case 'offline':
                    syncIcon.classList.add('bi-cloud-slash', 'text-muted');
                    break;
                default:
                    syncIcon.classList.add('bi-cloud', 'text-muted');
            }
        }

        if (syncText) {
            syncText.textContent = message;
        }

        // Show toast for important status changes
        if (status === 'error' || status === 'warning') {
            window.showToast?.(message, status);
        }
    }

    startPeriodicSync() {
        setInterval(() => {
            if (this.googleUser && this.isOnline && !this.isSyncing) {
                this.syncData().catch(console.error);
            }
        }, this.config.SYNC_INTERVAL);
    }

    // Export data for backup
    exportData(format = 'json') {
        const data = this.prepareSyncData();
        
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.convertToCSV(data);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    convertToCSV(data) {
        // Convert transactions to CSV
        const transactions = data.transactions || [];
        if (transactions.length === 0) return '';
        
        const headers = ['Date', 'Description', 'Type', 'Category', 'Amount'];
        const rows = transactions.map(tx => [
            tx.date,
            `"${tx.desc.replace(/"/g, '""')}"`,
            tx.type,
            tx.category,
            tx.amount
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    // Get sync statistics
    getSyncStats() {
        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            lastSync: this.lastSyncTime,
            lastBackup: this.lastBackupMonth,
            isAuthenticated: !!this.googleUser,
            pendingSync: this.pendingSync
        };
    }
}

// Create global sync engine instance
window.syncEngine = new SyncEngine();
