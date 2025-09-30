// Enhanced Sync functionality for Wealth Command
class WealthCommandSync {
    constructor(app) {
        this.app = app;
        this.isSignedIn = false;
        this.user = null;
        this.init();
    }

    init() {
        this.initializeGoogleSignIn();
        this.setupSyncListeners();
    }

    // Google Sign-In Integration
    initializeGoogleSignIn() {
        // Google Sign-In configuration
        window.google.accounts.id.initialize({
            client_id: '86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com',
            callback: this.handleCredentialResponse.bind(this),
            auto_select: false,
            cancel_on_tap_outside: true
        });

        // Render sign-in button
        window.google.accounts.id.renderButton(
            document.getElementById('googleSignInButton'),
            {
                theme: 'outline',
                size: 'large',
                width: '200',
                text: 'signin_with'
            }
        );
    }

    async handleCredentialResponse(response) {
        try {
            this.app.showGlobalLoading('Signing in...');
            
            // Decode the credential response
            const responsePayload = this.decodeJWT(response.credential);
            
            this.user = {
                id: responsePayload.sub,
                email: responsePayload.email,
                name: responsePayload.name,
                picture: responsePayload.picture
            };

            this.isSignedIn = true;
            this.updateUI();
            
            // Close the sign-in modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('googleSignInModal'));
            if (modal) modal.hide();

            // Perform initial sync
            await this.performSync();
            
            this.app.showToast(`Welcome back, ${this.user.name}!`, 'success');
            
        } catch (error) {
            console.error('Sign-in failed:', error);
            this.app.showToast('Sign-in failed. Please try again.', 'error');
        } finally {
            this.app.hideGlobalLoading();
        }
    }

    decodeJWT(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    }

    async googleSignOut() {
        try {
            this.app.showGlobalLoading('Signing out...');
            
            // Clear local session
            this.isSignedIn = false;
            this.user = null;
            
            // Google Sign-Out
            window.google.accounts.id.disableAutoSelect();
            window.google.accounts.id.revoke(localStorage.getItem('google_id_token'), done => {
                console.log('Google sign-out completed');
            });

            this.updateUI();
            this.app.showToast('Signed out successfully', 'info');
            
        } catch (error) {
            console.error('Sign-out error:', error);
            this.app.showToast('Error during sign-out', 'error');
        } finally {
            this.app.hideGlobalLoading();
        }
    }

    updateUI() {
        const profilePic = document.getElementById('profilePicture');
        const userEmail = document.getElementById('userEmail');
        const signedInUser = document.getElementById('signedInUser');
        const signInOption = document.getElementById('signInOption');
        const signOutOption = document.getElementById('signOutOption');

        if (this.isSignedIn && this.user) {
            // Update profile picture
            profilePic.innerHTML = this.user.picture ? 
                `<img src="${this.user.picture}" alt="Profile" class="rounded-circle" style="width: 32px; height: 32px;">` :
                `<i class="bi bi-person-circle profile-icon"></i>`;
            
            // Update user info
            userEmail.textContent = this.user.email;
            signedInUser.classList.remove('d-none');
            signInOption.classList.add('d-none');
            signOutOption.classList.remove('d-none');
        } else {
            // Reset to default
            profilePic.innerHTML = '<i class="bi bi-person-circle profile-icon"></i>';
            signedInUser.classList.add('d-none');
            signInOption.classList.remove('d-none');
            signOutOption.classList.add('d-none');
        }
    }

    async isUserSignedIn() {
        // Check if user is signed in with Google
        return new Promise((resolve) => {
            window.google.accounts.id.initialize({
                client_id: '86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com',
                callback: () => resolve(true),
                auto_select: false
            });
            
            // If no automatic sign-in, resolve false after a short delay
            setTimeout(() => resolve(false), 1000);
        });
    }

    // Enhanced Sync Operations
    async performSync() {
        if (!this.isSignedIn) {
            throw new Error('User must be signed in to sync');
        }

        this.app.showGlobalLoading('Syncing your data...');
        
        try {
            // Show progress for sync operation
            this.app.showProgress('Uploading data', 100, 0);
            
            // Get local data
            const syncData = this.prepareSyncData();
            
            // Upload to cloud storage (simulated)
            await this.uploadToCloud(syncData);
            
            this.app.showProgress('Uploading data', 100, 100);
            
            // Update sync status
            this.app.syncStatus = 'synced';
            this.app.checkSyncStatus();
            
            this.app.showToast('Data synced successfully!', 'success');
            
        } catch (error) {
            console.error('Sync failed:', error);
            this.app.syncStatus = 'error';
            this.app.checkSyncStatus();
            throw error;
        } finally {
            this.app.hideGlobalLoading();
        }
    }

    prepareSyncData() {
        return {
            transactions: this.app.transactions,
            futureIncome: this.app.futureIncome,
            futureExpenses: this.app.futureExpenses,
            loans: this.app.loans,
            recentCategories: this.app.recentCategories,
            settings: {
                currentMonth: this.app.currentMonth,
                currentYear: this.app.currentYear
            },
            syncTimestamp: new Date().toISOString(),
            version: '1.0'
        };
    }

    async uploadToCloud(data) {
        // Simulate cloud upload with progress
        return new Promise((resolve, reject) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                this.app.showProgress('Uploading data', 100, progress);
                
                if (progress >= 100) {
                    clearInterval(interval);
                    
                    // Simulate network delay
                    setTimeout(() => {
                        // In a real implementation, this would be an actual API call
                        console.log('Data uploaded to cloud:', data);
                        localStorage.setItem(`wealthCommand_cloud_${this.user.id}`, JSON.stringify(data));
                        resolve();
                    }, 500);
                }
            }, 200);
        });
    }

    async downloadFromCloud() {
        if (!this.isSignedIn) {
            throw new Error('User must be signed in to download data');
        }

        this.app.showGlobalLoading('Downloading your data...');
        
        try {
            // Simulate cloud download
            const cloudData = localStorage.getItem(`wealthCommand_cloud_${this.user.id}`);
            
            if (!cloudData) {
                this.app.showToast('No cloud data found. Starting fresh.', 'info');
                return;
            }

            const parsedData = JSON.parse(cloudData);
            await this.mergeLocalAndCloudData(parsedData);
            
            this.app.showToast('Data downloaded successfully!', 'success');
            
        } catch (error) {
            console.error('Download failed:', error);
            this.app.showToast('Failed to download data from cloud', 'error');
            throw error;
        } finally {
            this.app.hideGlobalLoading();
        }
    }

    async mergeLocalAndCloudData(cloudData) {
        // Simple merge strategy: use the latest data
        const cloudTimestamp = new Date(cloudData.syncTimestamp);
        const localTimestamp = new Date(); // We don't store local sync timestamp, so use current time
        
        if (cloudTimestamp > localTimestamp) {
            // Cloud data is newer, use it
            this.app.transactions = cloudData.transactions || [];
            this.app.futureIncome = cloudData.futureIncome || [];
            this.app.futureExpenses = cloudData.futureExpenses || [];
            this.app.loans = cloudData.loans || [];
            this.app.recentCategories = cloudData.recentCategories || [];
            
            if (cloudData.settings) {
                this.app.currentMonth = cloudData.settings.currentMonth || this.app.currentMonth;
                this.app.currentYear = cloudData.settings.currentYear || this.app.currentYear;
            }
            
            this.app.saveData();
            this.app.updateDashboard();
        } else {
            // Local data is newer, upload it
            await this.performSync();
        }
    }

    setupSyncListeners() {
        // Listen for online/offline status changes
        window.addEventListener('online', () => {
            if (this.isSignedIn) {
                this.app.showToast('Back online. Syncing data...', 'info');
                this.performSync().catch(console.error);
            }
        });

        window.addEventListener('offline', () => {
            this.app.showToast('You are offline. Working locally.', 'warning');
            this.app.syncStatus = 'offline';
            this.app.checkSyncStatus();
        });

        // Periodic sync for signed-in users
        setInterval(() => {
            if (this.isSignedIn && navigator.onLine) {
                this.performSync().catch(console.error);
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    // Conflict resolution
    async resolveConflicts(localData, cloudData) {
        this.app.showGlobalLoading('Resolving data conflicts...');
        
        try {
            // Simple conflict resolution: prefer the most recent data
            const conflicts = this.detectConflicts(localData, cloudData);
            
            if (conflicts.length === 0) {
                return cloudData; // No conflicts, use cloud data
            }

            // For demo purposes, we'll use a simple strategy
            // In a real app, you might want more sophisticated conflict resolution
            const resolvedData = this.mergeWithConflictResolution(localData, cloudData);
            
            this.app.showToast(`Resolved ${conflicts.length} data conflicts`, 'info');
            return resolvedData;
            
        } finally {
            this.app.hideGlobalLoading();
        }
    }

    detectConflicts(localData, cloudData) {
        const conflicts = [];
        
        // Check transaction conflicts
        const localTransactions = new Map(localData.transactions.map(t => [t.id, t]));
        const cloudTransactions = new Map(cloudData.transactions.map(t => [t.id, t]));
        
        for (const [id, localTx] of localTransactions) {
            const cloudTx = cloudTransactions.get(id);
            if (cloudTx && this.hasTransactionChanged(localTx, cloudTx)) {
                conflicts.push({
                    type: 'transaction',
                    id,
                    local: localTx,
                    cloud: cloudTx
                });
            }
        }
        
        return conflicts;
    }

    hasTransactionChanged(localTx, cloudTx) {
        return localTx.updatedAt !== cloudTx.updatedAt;
    }

    mergeWithConflictResolution(localData, cloudData) {
        // Simple strategy: prefer local data for conflicts
        return {
            ...cloudData,
            transactions: localData.transactions,
            syncTimestamp: new Date().toISOString()
        };
    }
}

// Global functions for HTML onclick handlers
function showGoogleSignIn() {
    const modal = new bootstrap.Modal(document.getElementById('googleSignInModal'));
    modal.show();
}

function googleSignOut() {
    if (window.app && window.app.sync) {
        window.app.sync.googleSignOut();
    }
}

// Initialize sync when app is ready
if (window.app) {
    window.app.sync = new WealthCommandSync(window.app);
}
