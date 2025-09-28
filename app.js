// Wealth Command: Complete with Google Drive Sync and Monthly Rollover

// Initialize variables first
let transactions = loadTransactions();
let categories = loadCategories();
let currency = loadCurrency() || "PKR";
let currentCategoryFilter = 'all';
let mainChart = null;
let incomePieChart = null;
let expensePieChart = null;
let currentChartType = 'category';

// Enhanced Google Drive Sync with Two-Tier Backup System
const GOOGLE_DRIVE_FILE_NAME = 'wealth_command_data.json';
const GOOGLE_CLIENT_ID = '86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com';
let googleUser = null;
let googleAuth = null;
let isOnline = navigator.onLine;
let syncInProgress = false;
let pendingSync = false;
let lastBackupMonth = null;

// Helper function to get monthly backup filename
function getMonthlyBackupFileName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `wealth_command_backup_${year}-${month}.json`;
}

// Monthly Rollover System
function loadMonthlyBudgets() {
    try {
        const budgets = JSON.parse(localStorage.getItem('monthlyBudgets')) || {};
        const currentMonth = getCurrentMonthKey();
        if (!budgets[currentMonth]) {
            budgets[currentMonth] = {
                startingBalance: 0,
                income: 0,
                expenses: 0,
                endingBalance: 0,
                autoRollover: true,
                allowNegative: false
            };
            localStorage.setItem('monthlyBudgets', JSON.stringify(budgets));
        }
        return budgets;
    } catch {
        const currentMonth = getCurrentMonthKey();
        const budgets = {};
        budgets[currentMonth] = {
            startingBalance: 0,
            income: 0,
            expenses: 0,
            endingBalance: 0,
            autoRollover: true,
            allowNegative: false
        };
        localStorage.setItem('monthlyBudgets', JSON.stringify(budgets));
        return budgets;
    }
}

function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

let monthlyBudgets = loadMonthlyBudgets();

function saveMonthlyBudgets(budgets) {
    monthlyBudgets = budgets;
    localStorage.setItem('monthlyBudgets', JSON.stringify(budgets));
    autoSyncToDrive();
}

function getMonthKeyFromDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function calculateMonthlyRollover() {
    const months = Object.keys(monthlyBudgets).sort();
    
    for (let i = 0; i < months.length; i++) {
        const currentMonth = months[i];
        const monthData = monthlyBudgets[currentMonth];
        
        const monthTransactions = transactions.filter(tx => 
            getMonthKeyFromDate(tx.date) === currentMonth
        );
        
        monthData.income = monthTransactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
            
        monthData.expenses = monthTransactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
            
        monthData.endingBalance = monthData.startingBalance + monthData.income - monthData.expenses;
        
        if (monthData.autoRollover && i < months.length - 1) {
            const nextMonth = months[i + 1];
            if (monthData.endingBalance >= 0 || monthData.allowNegative) {
                monthlyBudgets[nextMonth].startingBalance = monthData.endingBalance;
            } else {
                monthlyBudgets[nextMonth].startingBalance = 0;
            }
        }
    }
    
    saveMonthlyBudgets(monthlyBudgets);
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
            updateUI();
            showToast('Starting balance updated', 'success');
        }
    }
}

// Enhanced Toast System
function showToast(message, type = 'info', duration = 4000) {
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

function showSyncStatus(message, type) {
    showToast(message, type, type === 'success' ? 3000 : 5000);
}

// Enhanced Google Auth with better error handling
function initGoogleAuth() {
    if (!window.google) {
        console.error('Google API not loaded');
        showSyncStatus('Google authentication not available. Please refresh the page.', 'warning');
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
                    showSyncStatus('Google Drive connected successfully!', 'success');
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
                }
                showSyncStatus('Google Sign-In failed: ' + error.message, 'danger');
            }
        });
    } catch (error) {
        console.error('Error initializing Google Auth:', error);
        showSyncStatus('Failed to initialize Google authentication', 'danger');
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
    } else {
        profilePicture.innerHTML = `<i class="bi bi-person-circle profile-icon"></i>`;
        signedInUser.classList.add('d-none');
        signInOption.classList.remove('d-none');
        signOutOption.classList.add('d-none');
        
        if (syncStatusText) {
            syncStatusText.textContent = 'Sign in to sync with Google Drive';
        }
    }
}

// Enhanced data loading from Google Drive
async function loadDataFromDrive() {
    if (!googleUser || !googleUser.access_token) {
        showSyncStatus('Not authenticated with Google Drive', 'warning');
        return false;
    }
    
    if (!isOnline) {
        showSyncStatus('Cannot load: You are offline', 'warning');
        return false;
    }
    
    // Check if token is expired
    if (isTokenExpired(googleUser)) {
        showSyncStatus('Session expired. Please sign in again.', 'warning');
        googleSignOut();
        return false;
    }
    
    try {
        showSyncStatus('Loading data from Google Drive...', 'info');
        
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
            showSyncStatus('Authentication expired. Please sign in again.', 'warning');
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
            
            // Update last backup month from loaded data
            if (driveData.lastBackupMonth) {
                lastBackupMonth = driveData.lastBackupMonth;
            }
            
            // Update UI with loaded data
            updateUI();
            populateSummaryFilters();
            renderCategoryList();
            
            showSyncStatus('Data loaded from Google Drive successfully!', 'success');
            console.log('Data loaded from Drive:', {
                transactions: transactions.length,
                categories: categories.length,
                currency: currency,
                monthlyBudgets: Object.keys(monthlyBudgets).length
            });
            
            return true;
        } else {
            showSyncStatus('No existing data found. Creating new backup...', 'info');
            // No file found, create one with current data
            await syncDataToDrive();
            return true;
        }
    } catch (error) {
        console.error('Error loading from Drive:', error);
        showSyncStatus('Error loading from Google Drive: ' + error.message, 'danger');
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
        return false;
    }
    
    // Check if token is expired
    if (isTokenExpired(googleUser)) {
        showSyncStatus('Session expired. Please sign in again.', 'warning');
        googleSignOut();
        return false;
    }
    
    syncInProgress = true;
    
    try {
        showSyncStatus('Syncing to Google Drive...', 'info');
        
        const currentMonth = getCurrentMonthKey();
        const shouldCreateMonthlyBackup = lastBackupMonth !== currentMonth;
        
        const fileData = {
            transactions,
            categories,
            currency,
            monthlyBudgets,
            lastSync: new Date().toISOString(),
            lastBackupMonth: currentMonth,
            version: '1.2',
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
            
            showSyncStatus(`Data synced + monthly backup created!`, 'success');
        } else {
            showSyncStatus('Data synced to Google Drive successfully!', 'success');
        }
        
        console.log('Sync completed successfully');
        return true;
    } catch (error) {
        console.error('Error syncing to Drive:', error);
        
        if (error.message.includes('Authentication expired') || error.message.includes('401')) {
            showSyncStatus('Authentication expired. Please sign in again.', 'warning');
            googleSignOut();
        } else {
            showSyncStatus('Sync failed: ' + error.message, 'danger');
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
        showSyncStatus('Cannot sync: You are offline', 'warning');
        return;
    }
    
    const success = await syncDataToDrive();
    if (success) {
        showSyncStatus('Manual sync completed successfully!', 'success');
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
    showSyncStatus('Signed out from Google Drive', 'info');
}

// Enhanced online/offline handling
window.addEventListener('online', () => {
    isOnline = true;
    showSyncStatus('Back online. Syncing data...', 'info');
    
    if (googleUser) {
        // Sync when coming back online
        setTimeout(() => {
            syncDataToDrive();
        }, 2000);
    }
});

window.addEventListener('offline', () => {
    isOnline = false;
    showSyncStatus('You are offline. Changes will sync when back online.', 'warning');
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

// Page navigation logic
const tabs = ["dashboard", "transactions", "charts", "settings"];
function showTab(tab) {
    tabs.forEach(t => {
        document.getElementById(`tab-${t}`).classList.toggle("d-none", t !== tab);
        const btn = document.querySelector(`[data-tab='${t}']`);
        btn.classList.toggle("active", t === tab);
    });
    
    setTimeout(() => {
        if (tab === "transactions") {
            adjustTransactionsTable();
        }
    }, 50);
    
    if (tab === "charts") {
        renderEnhancedCharts();
        populateChartFilters();
    }
}

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

// Category Transactions Modal
let currentCategoryView = null;
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
    
    if (categoryName === 'all') {
        title.innerHTML = `<i class="bi bi-list-ul"></i> All ${type.charAt(0).toUpperCase() + type.slice(1)} Transactions`;
        info.textContent = `Showing ${filteredTx.length} transactions`;
    } else {
        title.innerHTML = `<i class="bi bi-tag"></i> ${categoryName} Transactions`;
        info.textContent = `Showing ${filteredTx.length} ${type} transactions`;
    }
    
    const total = filteredTx.reduce((sum, tx) => sum + tx.amount, 0);
    totalAmount.textContent = `${total.toLocaleString()} ${currency}`;
    totalAmount.className = `fw-bold fs-5 ${type === 'income' ? 'text-success' : 'text-danger'}`;
    
    transactionsList.innerHTML = '';
    
    if (filteredTx.length === 0) {
        noTransactions.classList.remove('d-none');
    } else {
        noTransactions.classList.add('d-none');
        filteredTx.slice().reverse().forEach((tx, idx) => {
            const originalIndex = transactions.length - 1 - transactions.findIndex(t => 
                t.date === tx.date && t.desc === tx.desc && t.amount === tx.amount
            );
            
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
                    <button class="btn-action btn-edit" title="Edit" onclick="editTransactionFromCategory(${originalIndex})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-action btn-delete" title="Delete" onclick="removeTransactionFromCategory(${originalIndex})">
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
    bootstrap.Modal.getInstance(document.getElementById('categoryTransactionsModal')).hide();
    setTimeout(() => editTransaction(idx), 300);
}

function removeTransactionFromCategory(idx) {
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
    modal.hide();
    
    setTimeout(() => {
        if (currentCategoryView && currentCategoryView.categoryName !== 'all') {
            document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-plus-circle"></i> Add Transaction';
            document.getElementById('submitButtonText').textContent = 'Add';
            document.getElementById('editTransactionIndex').value = '-1';
            document.getElementById('transactionForm').reset();
            
            document.getElementById('typeInput').value = currentCategoryView.type;
            updateCategorySelect();
            document.getElementById('categoryInput').value = currentCategoryView.categoryName;
            
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

// Enhanced Charts Tab Functions
function updateChartSummaryStats() {
    const statsContainer = document.getElementById('chartSummaryStats');
    if (!statsContainer) return;
    
    const chartMonth = document.getElementById('chartMonth')?.value || 'all';
    const chartYear = document.getElementById('chartYear')?.value || 'all';
    
    let filteredTx = transactions;
    if (chartMonth !== 'all' || chartYear !== 'all') {
        filteredTx = transactions.filter(tx => {
            const d = new Date(tx.date);
            if (isNaN(d)) return false;
            let valid = true;
            if (chartMonth !== 'all') valid = valid && (d.getMonth() + 1) == chartMonth;
            if (chartYear !== 'all') valid = valid && d.getFullYear() == chartYear;
            return valid;
        });
    }
    
    const totalIncome = filteredTx.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpense = filteredTx.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    const netWealth = totalIncome - totalExpense;
    const transactionCount = filteredTx.length;
    
    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-value text-primary">${transactionCount}</div>
            <div class="stat-label">Transactions</div>
        </div>
        <div class="stat-card income">
            <div class="stat-value text-success">${totalIncome.toLocaleString()} ${currency}</div>
            <div class="stat-label">Total Income</div>
        </div>
        <div class="stat-card expense">
            <div class="stat-value text-danger">${totalExpense.toLocaleString()} ${currency}</div>
            <div class="stat-label">Total Expense</div>
        </div>
        <div class="stat-card">
            <div class="stat-value ${netWealth >= 0 ? 'text-success' : 'text-danger'}">
                ${netWealth.toLocaleString()} ${currency}
            </div>
            <div class="stat-label">Net Wealth</div>
        </div>
    `;
}

function renderEnhancedCharts() {
    if (!document.getElementById('chartSummaryStats')) return;
    
    updateChartSummaryStats();
    
    const chartTypeButtons = document.querySelectorAll('[data-chart-type]');
    if (chartTypeButtons.length === 0) return;
    
    // Simple event handling
    chartTypeButtons.forEach(btn => {
        btn.onclick = function() {
            chartTypeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentChartType = this.dataset.chartType;
            renderMainChart();
        };
    });
    
    renderMainChart();
    renderPieCharts();
}

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
    
    chartMonth.addEventListener('change', renderEnhancedCharts);
    chartYear.addEventListener('change', renderEnhancedCharts);
}

function renderMainChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const placeholder = document.getElementById('chartPlaceholder');
    
    if (mainChart) {
        mainChart.destroy();
    }
    
    if (transactions.length === 0) {
        placeholder.classList.remove('d-none');
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }
    
    placeholder.classList.add('d-none');
    
    const chartMonth = document.getElementById('chartMonth').value;
    const chartYear = document.getElementById('chartYear').value;
    
    switch (currentChartType) {
        case 'category':
            renderCategoryChart(ctx, chartMonth, chartYear);
            break;
        case 'monthly':
            renderMonthlyTrendChart(ctx, chartYear);
            break;
        case 'yearly':
            renderYearlyTrendChart(ctx, chartMonth);
            break;
    }
}

function renderCategoryChart(ctx, month, year) {
    let filteredTx = transactions;
    if (month !== 'all' || year !== 'all') {
        filteredTx = transactions.filter(tx => {
            const d = new Date(tx.date);
            if (isNaN(d)) return false;
            let valid = true;
            if (month !== 'all') valid = valid && (d.getMonth() + 1) == month;
            if (year !== 'all') valid = valid && d.getFullYear() == year;
            return valid;
        });
    }
    
    const categoryData = {};
    categories.forEach(cat => {
        categoryData[cat.name] = {
            income: 0,
            expense: 0,
            type: cat.type
        };
    });
    
    filteredTx.forEach(tx => {
        if (categoryData[tx.category]) {
            categoryData[tx.category][tx.type === 'income' ? 'income' : 'expense'] += tx.amount;
        }
    });
    
    const labels = Object.keys(categoryData).filter(cat => 
        categoryData[cat].income > 0 || categoryData[cat].expense > 0
    );
    
    const incomeData = labels.map(cat => categoryData[cat].income);
    const expenseData = labels.map(cat => categoryData[cat].expense);
    
    mainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#198754',
                    borderColor: '#198754',
                    borderWidth: 1
                },
                {
                    label: 'Expense',
                    data: expenseData,
                    backgroundColor: '#dc3545',
                    borderColor: '#dc3545',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Category-wise Income vs Expense'
                },
                legend: {
                    position: 'top',
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

function renderMonthlyTrendChart(ctx, year) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = Array(12).fill().map(() => ({ income: 0, expense: 0 }));
    
    transactions.forEach(tx => {
        const d = new Date(tx.date);
        if (isNaN(d)) return;
        
        if (year === 'all' || d.getFullYear() == year) {
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
    
    mainChart = new Chart(ctx, {
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
                    text: `Monthly Trend ${year === 'all' ? '(All Years)' : year}`
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

function renderYearlyTrendChart(ctx, month) {
    const years = Array.from(new Set(transactions.map(tx => new Date(tx.date).getFullYear())))
        .filter(year => !isNaN(year))
        .sort((a, b) => a - b);
    
    const yearlyData = {};
    years.forEach(year => {
        yearlyData[year] = { income: 0, expense: 0, net: 0 };
    });
    
    transactions.forEach(tx => {
        const txDate = new Date(tx.date);
        const txYear = txDate.getFullYear();
        const txMonth = txDate.getMonth() + 1;
        
        if (month === 'all' || txMonth == month) {
            if (yearlyData[txYear]) {
                if (tx.type === 'income') {
                    yearlyData[txYear].income += tx.amount;
                } else {
                    yearlyData[txYear].expense += tx.amount;
                }
                yearlyData[txYear].net = yearlyData[txYear].income - yearlyData[txYear].expense;
            }
        }
    });
    
    const incomeData = years.map(year => yearlyData[year]?.income || 0);
    const expenseData = years.map(year => yearlyData[year]?.expense || 0);
    const netData = years.map(year => yearlyData[year]?.net || 0);
    
    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    tension: 0.3,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Expense',
                    data: expenseData,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    tension: 0.3,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Net Wealth',
                    data: netData,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.3,
                    fill: true,
                    borderWidth: 2,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Yearly Trend ${month === 'all' ? '' : `- ${new Date(2023, month-1).toLocaleString('default', {month: 'long'})}`}`,
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' ' + currency;
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function renderPieCharts() {
    const chartMonth = document.getElementById('chartMonth').value;
    const chartYear = document.getElementById('chartYear').value;
    
    let filteredTx = transactions;
    if (chartMonth !== 'all' || chartYear !== 'all') {
        filteredTx = transactions.filter(tx => {
            const d = new Date(tx.date);
            if (isNaN(d)) return false;
            let valid = true;
            if (chartMonth !== 'all') valid = valid && (d.getMonth() + 1) == chartMonth;
            if (chartYear !== 'all') valid = valid && d.getFullYear() == chartYear;
            return valid;
        });
    }
    
    // Income Pie Chart
    const incomeData = {};
    filteredTx.filter(tx => tx.type === 'income').forEach(tx => {
        incomeData[tx.category] = (incomeData[tx.category] || 0) + tx.amount;
    });
    
    const incomeCtx = document.getElementById('incomePieChart').getContext('2d');
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
    filteredTx.filter(tx => tx.type === 'expense').forEach(tx => {
        expenseData[tx.category] = (expenseData[tx.category] || 0) + tx.amount;
    });
    
    const expenseCtx = document.getElementById('expensePieChart').getContext('2d');
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

// Import/Export
document.getElementById('exportBtn').onclick = function() {
    const data = {
        transactions,
        categories,
        currency,
        monthlyBudgets
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
            
            saveTransactions(transactions);
            saveCategories(categories);
            saveCurrency(currency);
            saveMonthlyBudgets(monthlyBudgets);
            
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

// Dark Mode Toggle
document.getElementById('darkModeToggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    this.classList.toggle('active');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});

(function () {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').classList.add('active');
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
        
        calculateMonthlyRollover();
        
        updateUI();
        populateSummaryFilters();
        renderCategoryList();
        
        const summaryMonth = document.getElementById('summaryMonth');
        const summaryYear = document.getElementById('summaryYear');
        if (summaryMonth) summaryMonth.addEventListener('change', updateUI);
        if (summaryYear) summaryYear.addEventListener('change', updateUI);
        
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
    
    const savedUser = localStorage.getItem('googleUser');
    if (savedUser) {
        try {
            googleUser = JSON.parse(savedUser);
            const tokenAge = Date.now() - googleUser.acquired_at;
            if (tokenAge > (googleUser.expires_in - 60) * 1000) {
                localStorage.removeItem('googleUser');
                googleUser = null;
            } else {
                showSyncStatus('Google Drive connected', 'info');
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
        }
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
    
    showTab("dashboard");
});
