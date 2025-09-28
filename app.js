// ===================================================
// app.js — Full file
// Updated: toast → navbar notifications,
// dark-mode moved to Settings, performance tweaks
// ===================================================

// ----------------------
// Data + State
// ----------------------
let transactions = loadTransactions();
let categories = loadCategories();
let currency = loadCurrency() || "PKR";
let monthlyBudgets = loadMonthlyBudgets();
let googleUser = JSON.parse(localStorage.getItem('googleUser') || 'null');
let googleAuth = null;
let isOnline = navigator.onLine;
let syncInProgress = false;
let pendingSync = false;
let lastBackupMonth = null;

// In-memory notifications (type -> array of {ts,msg})
const notifications = {
  info: [],
  success: [],
  warning: [],
  error: []
};

// ----------------------
// LocalStorage helpers
// ----------------------
function loadTransactions() {
  try {
    return JSON.parse(localStorage.getItem('transactions')) || [];
  } catch {
    return [];
  }
}
function saveTransactions(list) {
  transactions = list;
  localStorage.setItem('transactions', JSON.stringify(transactions));
  calculateMonthlyRollover();
  updateUI();
  autoSyncToDrive();
}
function loadCategories() {
  try {
    const saved = JSON.parse(localStorage.getItem('categories'));
    if (saved && Array.isArray(saved) && saved.length) return saved;
  } catch {}
  // default categories if none:
  const defaultCats = [
    { name: "Salary", type: "income" },
    { name: "Freelance", type: "income" },
    { name: "Groceries", type: "expense" },
    { name: "Transport", type: "expense" },
  ];
  localStorage.setItem('categories', JSON.stringify(defaultCats));
  return defaultCats;
}
function saveCategories(list) {
  categories = list;
  localStorage.setItem('categories', JSON.stringify(categories));
  renderCategoryList();
  updateCategorySelect();
  autoSyncToDrive();
}
function loadCurrency() {
  return localStorage.getItem('currency') || "PKR";
}
function saveCurrency(c) {
  currency = c;
  localStorage.setItem('currency', currency);
  updateUI();
  autoSyncToDrive();
}

// ----------------------
// Monthly budgets & rollover
// ----------------------
function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}
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
function saveMonthlyBudgets(budgets) {
  monthlyBudgets = budgets;
  localStorage.setItem('monthlyBudgets', JSON.stringify(budgets));
  autoSyncToDrive();
}

// Recalculate rollovers for months present in monthlyBudgets
function calculateMonthlyRollover() {
  const months = Object.keys(monthlyBudgets).sort();
  for (let i = 0; i < months.length; i++) {
    const monthKey = months[i];
    const monthData = monthlyBudgets[monthKey];
    const monthTransactions = transactions.filter(tx => getMonthKeyFromDate(tx.date) === monthKey);
    monthData.income = monthTransactions.filter(tx => tx.type === 'income').reduce((s,tx)=>s+tx.amount,0);
    monthData.expenses = monthTransactions.filter(tx => tx.type === 'expense').reduce((s,tx)=>s+tx.amount,0);
    monthData.endingBalance = (monthData.startingBalance || 0) + monthData.income - monthData.expenses;
    // auto-rollover to next month if allowed
    if (monthData.autoRollover && i < months.length - 1) {
      const nextKey = months[i+1];
      if (monthData.endingBalance >= 0 || monthData.allowNegative) {
        monthlyBudgets[nextKey].startingBalance = monthData.endingBalance;
      } else {
        monthlyBudgets[nextKey].startingBalance = 0;
      }
    }
  }
  saveMonthlyBudgets(monthlyBudgets);
}
function getMonthKeyFromDate(dateString) {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function getPreviousMonth(monthKey){
  const [y,m] = monthKey.split('-').map(Number);
  let py = y, pm = m - 1;
  if (pm === 0){ pm = 12; py = y - 1; }
  return `${py}-${String(pm).padStart(2,'0')}`;
}

// Update rollover display (shows the rollover box in dashboard)
function updateRolloverDisplay() {
  const rolloverElement = document.getElementById('rolloverBalance');
  if (!rolloverElement) return;
  const monthSel = document.getElementById('summaryMonth');
  const yearSel = document.getElementById('summaryYear');
  if (!monthSel || !yearSel) {
    rolloverElement.classList.add('d-none');
    return;
  }

  const selectedMonth = monthSel.value;
  const selectedYear = yearSel.value;

  if (selectedMonth === 'all' || selectedYear === 'all') {
    rolloverElement.classList.add('d-none');
    return;
  }

  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2,'0')}`;
  const monthData = monthlyBudgets[monthKey];

  if (!monthData || (!monthData.startingBalance && monthData.startingBalance !== 0 && monthData.startingBalance !== undefined)) {
    rolloverElement.classList.add('d-none');
    return;
  }

  // Show even if 0 (user may want to edit)
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

  const amountEl = document.getElementById('rolloverAmount');
  if (amountEl) {
    amountEl.textContent = `${monthData.startingBalance >= 0 ? '+' : ''}${Number(monthData.startingBalance).toLocaleString()} ${currency}`;
  }

  const prevMonth = getPreviousMonth(monthKey);
  const descEl = document.getElementById('rolloverDescription');
  if (descEl) descEl.textContent = `Carried over from ${prevMonth}`;
}

function toggleRolloverSettings() {
  const monthSel = document.getElementById('summaryMonth');
  const yearSel = document.getElementById('summaryYear');
  if (!monthSel || !yearSel) {
    showToast('Select month/year first', 'warning'); return;
  }

  if (monthSel.value === 'all' || yearSel.value === 'all') {
    showToast('Please select a specific month to adjust rollover settings', 'warning');
    return;
  }

  const monthKey = `${yearSel.value}-${String(monthSel.value).padStart(2,'0')}`;
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

// ----------------------
// Notification system (replaces toasts)
// ----------------------
function addNotification(type="info", message="") {
  if (!notifications[type]) notifications[type] = [];
  notifications[type].unshift({ ts: Date.now(), msg: message });
  updateNotificationBadge(type);
}
function clearNotifications(type=null) {
  if (type) {
    notifications[type] = [];
    updateNotificationBadge(type);
  } else {
    Object.keys(notifications).forEach(k => notifications[k] = []);
    updateAllNotificationBadges();
  }
}
function updateNotificationBadge(type){
  const arr = notifications[type] || [];
  const count = Math.min(arr.length, 99);
  const badge = document.getElementById(`notif${capitalize(type)}Badge`);
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('d-none');
    } else {
      badge.classList.add('d-none');
    }
  }
}
function updateAllNotificationBadges(){
  ['info','success','warning','error'].forEach(updateNotificationBadge);
}
function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

// Show notification list for a given type (populates the dropdown)
function showNotificationList(type){
  const dropdown = document.getElementById('notificationDropdown');
  const list = document.getElementById('notificationList');
  const noMsg = document.getElementById('noNotifications');
  if (!dropdown || !list || !noMsg) return;
  list.innerHTML = '';
  const items = notifications[type] || [];
  if (!items.length) {
    noMsg.style.display = 'block';
  } else {
    noMsg.style.display = 'none';
    items.slice(0,50).forEach(n => {
      const el = document.createElement('div');
      el.className = 'nd-item d-flex align-items-start gap-2 py-2';
      el.innerHTML = `
        <div class="nd-icon">${typeIcon(type)}</div>
        <div class="nd-body">
          <div>${escapeHtml(n.msg)}</div>
          <small class="text-muted">${new Date(n.ts).toLocaleString()}</small>
        </div>
      `;
      list.appendChild(el);
    });
  }
  dropdown.classList.add('visible');
  dropdown.setAttribute('aria-hidden','false');
}
function typeIcon(t){
  if (t === 'info') return '<i class="bi bi-info-circle"></i>';
  if (t === 'success') return '<i class="bi bi-check-circle-fill text-success"></i>';
  if (t === 'warning') return '<i class="bi bi-exclamation-triangle-fill text-warning"></i>';
  return '<i class="bi bi-x-circle-fill text-danger"></i>';
}
function escapeHtml(text){
  return (text+'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
}

// Replaces previous "toasts" — just add a notification and optionally log
function showToast(message, type='info', duration=4000){
  addNotification(type, message);
  // also update small sync text for sync-related messages
  if (type === 'success' || type === 'info' || type === 'warning') {
    const syncText = document.getElementById('syncStatusText');
    if (syncText && message.toLowerCase().includes('sync')) {
      syncText.textContent = message;
    }
  }
  console.log(`[${type}] ${message}`);
}
function showSyncStatus(message, type='info') {
  showToast(message, type);
}

// Hide dropdown when clicking outside
document.addEventListener('click', function(e){
  const dropdown = document.getElementById('notificationDropdown');
  const icons = document.getElementById('notificationIcons');
  if (!dropdown) return;
  if (icons && icons.contains(e.target)) {
    // clicked on icons area — handled separately
    return;
  }
  if (dropdown.classList.contains('visible')) {
    dropdown.classList.remove('visible');
    dropdown.setAttribute('aria-hidden','true');
  }
});

// Wire icon clicks to show respective type lists (on DOM ready)
document.addEventListener('DOMContentLoaded', () => {
  ['Info','Success','Warning','Error'].forEach(cap => {
    const id = `notif${cap}Icon`;
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const t = cap.toLowerCase();
      showNotificationList(t);
    });
  });

  // clear button in dropdown
  const clearBtn = document.getElementById('clearNotificationsBtn');
  if (clearBtn) clearBtn.addEventListener('click', (ev) => { ev.stopPropagation(); clearNotifications(); });
});

// ----------------------
// Google Drive sync (kept, minor adaptation)
// ----------------------
const GOOGLE_DRIVE_FILE_NAME = 'wealth_command_data.json';
const GOOGLE_CLIENT_ID = '86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com';

function initGoogleAuth(){
  if (!window.google) {
    showSyncStatus('Google API not available', 'warning');
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
          const ok = await loadDataFromDrive();
          if (!ok) await syncDataToDrive();
        }
      },
      error_callback: (err) => {
        console.error('Google Auth error', err);
        showSyncStatus('Google Sign-In failed', 'danger');
      }
    });
  } catch (err) {
    console.error('initGoogleAuth', err);
    showSyncStatus('Failed to initialize Google authentication', 'danger');
  }
}
function showGoogleSignIn(){ 
  if (googleAuth) googleAuth.requestAccessToken();
  else {
    initGoogleAuth();
    setTimeout(()=>{ if (googleAuth) googleAuth.requestAccessToken(); }, 500);
  }
}
async function loadDataFromDrive(){
  if (!googleUser || !googleUser.access_token) {
    showSyncStatus('Not authenticated with Google Drive', 'warning'); return false;
  }
  if (!isOnline) { showSyncStatus('Cannot load: You are offline', 'warning'); return false; }
  if (isTokenExpired(googleUser)){ showSyncStatus('Session expired. Please sign in again.', 'warning'); googleSignOut(); return false; }
  try {
    showSyncStatus('Loading data from Google Drive...', 'info');
    const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${GOOGLE_DRIVE_FILE_NAME}' and trashed=false&fields=files(id,name,modifiedTime)`, { headers: { 'Authorization': `Bearer ${googleUser.access_token}` }});
    if (searchResponse.status === 401){ showSyncStatus('Authentication expired. Please sign in again.', 'warning'); googleSignOut(); return false; }
    if (!searchResponse.ok) throw new Error(`Drive API error: ${searchResponse.status}`);
    const searchData = await searchResponse.json();
    if (searchData.files && searchData.files.length > 0) {
      const file = searchData.files[0];
      const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers: { 'Authorization': `Bearer ${googleUser.access_token}` }});
      if (!fileResponse.ok) throw new Error(`File download error: ${fileResponse.status}`);
      const driveData = await fileResponse.json();
      if (driveData.transactions && Array.isArray(driveData.transactions)) { transactions = driveData.transactions; localStorage.setItem('transactions', JSON.stringify(transactions)); }
      if (driveData.categories && Array.isArray(driveData.categories)) { categories = driveData.categories; localStorage.setItem('categories', JSON.stringify(categories)); }
      if (driveData.currency) { currency = driveData.currency; localStorage.setItem('currency', currency); }
      if (driveData.monthlyBudgets) { monthlyBudgets = driveData.monthlyBudgets; localStorage.setItem('monthlyBudgets', JSON.stringify(monthlyBudgets)); }
      if (driveData.lastBackupMonth) lastBackupMonth = driveData.lastBackupMonth;
      updateUI(); populateSummaryFilters(); renderCategoryList(); updateCategorySelect();
      showSyncStatus('Data loaded from Google Drive successfully!', 'success');
      return true;
    } else {
      showSyncStatus('No existing data found on Drive. Creating new backup...', 'info');
      await syncDataToDrive();
      return true;
    }
  } catch (err) {
    console.error('loadDataFromDrive', err);
    showSyncStatus('Error loading from Google Drive: ' + (err.message || err), 'danger');
    return false;
  }
}

async function syncSingleFile(fileName, fileData, overwrite=true){
  // searches for file and updates or creates
  const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id)`, { headers:{ 'Authorization': `Bearer ${googleUser.access_token}` }});
  if (searchResponse.status === 401) throw new Error('Authentication expired');
  if (!searchResponse.ok) throw new Error(`Search failed: ${searchResponse.status}`);
  const searchData = await searchResponse.json();
  const existingFile = searchData.files?.[0];
  let response;
  if (existingFile && overwrite) {
    response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${googleUser.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(fileData)
    });
  } else if (!existingFile) {
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method:'POST',
      headers: { 'Authorization': `Bearer ${googleUser.access_token}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ name: fileName, mimeType:'application/json', description: 'Wealth Command backup' })
    });
    if (!createResponse.ok) throw new Error(`File creation failed: ${createResponse.status}`);
    const newFile = await createResponse.json();
    response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${newFile.id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${googleUser.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(fileData)
    });
  } else {
    return true;
  }
  if (response.ok) return true;
  const errText = await response.text();
  throw new Error(`Upload failed: ${response.status} - ${errText}`);
}

async function syncDataToDrive(){
  if (syncInProgress) { pendingSync = true; return false; }
  if (!googleUser || !googleUser.access_token) { console.log('Not authenticated'); return false; }
  if (!isOnline) { pendingSync = true; return false; }
  if (isTokenExpired(googleUser)) { showSyncStatus('Session expired. Please sign in again.', 'warning'); googleSignOut(); return false; }
  syncInProgress = true;
  try {
    showSyncStatus('Syncing to Google Drive...', 'info');
    const currentMonth = getCurrentMonthKey();
    const shouldCreateMonthlyBackup = lastBackupMonth !== currentMonth;
    const fileData = { transactions, categories, currency, monthlyBudgets, lastSync: new Date().toISOString(), lastBackupMonth: currentMonth, version:'1.2' };
    const mainFileSuccess = await syncSingleFile(GOOGLE_DRIVE_FILE_NAME, fileData);
    if (!mainFileSuccess) throw new Error('Failed to sync main file');
    if (shouldCreateMonthlyBackup) {
      const monthlyFileName = `wealth_command_backup_${currentMonth}.json`;
      const monthlyBackupData = { ...fileData, isMonthlyBackup:true, backupMonth: currentMonth, created: new Date().toISOString() };
      await syncSingleFile(monthlyFileName, monthlyBackupData, false);
      lastBackupMonth = currentMonth;
      fileData.lastBackupMonth = currentMonth;
      await syncSingleFile(GOOGLE_DRIVE_FILE_NAME, fileData);
      showSyncStatus('Data synced + monthly backup created!', 'success');
    } else {
      showSyncStatus('Data synced to Google Drive successfully!', 'success');
    }
    return true;
  } catch (err) {
    console.error('syncDataToDrive', err);
    if (err.message && (err.message.includes('Authentication')||err.message.includes('401'))) {
      showSyncStatus('Authentication expired. Please sign in again.', 'warning');
      googleSignOut();
    } else {
      showSyncStatus('Sync failed: ' + (err.message || err), 'error');
    }
    return false;
  } finally {
    syncInProgress = false;
    if (pendingSync) {
      pendingSync = false;
      setTimeout(syncDataToDrive, 1200);
    }
  }
}

function isTokenExpired(user){
  if (!user || !user.acquired_at || !user.expires_in) return true;
  const elapsed = Date.now() - user.acquired_at;
  const expiresIn = user.expires_in * 1000;
  const buffer = 5 * 60 * 1000;
  return elapsed > (expiresIn - buffer);
}
function googleSignOut(){
  if (googleUser && googleUser.access_token) {
    if (window.google && google.accounts.oauth2) {
      google.accounts.oauth2.revoke(googleUser.access_token, ()=>console.log('revoked'));
    }
  }
  googleUser = null;
  localStorage.removeItem('googleUser');
  updateProfileUI();
  showSyncStatus('Signed out from Google Drive', 'info');
}

// ----------------------
// Online/offline handling & periodic sync
// ----------------------
window.addEventListener('online', () => {
  isOnline = true;
  showSyncStatus('Back online. Syncing data...', 'info');
  if (googleUser) setTimeout(syncDataToDrive, 2000);
});
window.addEventListener('offline', () => {
  isOnline = false;
  showSyncStatus('You are offline. Changes will sync when back online.', 'warning');
});
function autoSyncToDrive(){
  if (googleUser && isOnline) {
    clearTimeout(window.syncTimeout);
    window.syncTimeout = setTimeout(()=>{ syncDataToDrive(); }, 2000);
  }
}
function startPeriodicSync(){
  setInterval(()=>{ if (googleUser && isOnline && !syncInProgress) syncDataToDrive(); }, 5*60*1000);
}
startPeriodicSync();

// ----------------------
// UI helpers (update profile, categories, filters, transactions)
// ----------------------
function updateProfileUI(){
  const profilePicture = document.getElementById('profilePicture');
  const signedInUser = document.getElementById('signedInUser');
  const userEmail = document.getElementById('userEmail');
  const signInOption = document.getElementById('signInOption');
  const signOutOption = document.getElementById('signOutOption');
  const syncStatusText = document.getElementById('syncStatusText');

  if (googleUser && googleUser.access_token) {
    if (profilePicture) profilePicture.innerHTML = `<i class="bi bi-cloud-check-fill profile-icon" style="font-size:1.4rem;color:var(--primary)"></i>`;
    if (signedInUser) signedInUser.classList.remove('d-none');
    if (userEmail) userEmail.textContent = 'Connected to Google Drive';
    if (signInOption) signInOption.classList.add('d-none');
    if (signOutOption) signOutOption.classList.remove('d-none');
    if (syncStatusText) syncStatusText.textContent = 'Synced with Google Drive';
  } else {
    if (profilePicture) profilePicture.innerHTML = `<i class="bi bi-person-circle profile-icon" style="font-size:1.5rem;color:var(--muted)"></i>`;
    if (signedInUser) signedInUser.classList.add('d-none');
    if (signInOption) signInOption.classList.remove('d-none');
    if (signOutOption) signOutOption.classList.add('d-none');
    if (syncStatusText) syncStatusText.textContent = 'Sign in to sync with Google Drive';
  }
}

// categories rendering
function renderCategoryList(){
  const ul = document.getElementById('categoryList');
  if (!ul) return;
  ul.innerHTML = '';
  ul.insertAdjacentHTML('beforeend', `
    <div class="category-filter-buttons mb-2">
      <button class="btn btn-sm btn-outline-primary me-1" onclick="setCategoryFilter('all')">All</button>
      <button class="btn btn-sm btn-outline-success me-1" onclick="setCategoryFilter('income')">Income</button>
      <button class="btn btn-sm btn-outline-danger" onclick="setCategoryFilter('expense')">Expense</button>
    </div>
  `);

  const currentFilter = window.currentCategoryFilter || 'all';
  const filtered = categories.filter(c => currentFilter === 'all' || c.type === currentFilter);
  if (!filtered.length) {
    const li = document.createElement('li');
    li.className = 'list-group-item text-center text-muted';
    li.textContent = 'No categories found';
    ul.appendChild(li);
    return;
  }
  filtered.forEach((cat, idx) => {
    const originalIndex = categories.findIndex(c => c.name === cat.name);
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <div>
        <span>${escapeHtml(cat.name)}</span>
        <span class="category-type-badge ms-2 ${cat.type === 'income' ? 'category-income' : 'category-expense'}">${cat.type}</span>
      </div>
      <div>
        <button class="btn btn-sm btn-outline-secondary me-1" title="Edit" onclick="editCategory(${originalIndex})"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="removeCategory(${originalIndex})"><i class="bi bi-trash"></i></button>
      </div>`;
    ul.appendChild(li);
  });
  updateCategorySelect();
}
window.setCategoryFilter = function(v){ window.currentCategoryFilter = v; renderCategoryList(); };

// add/edit/remove categories (guard DOM existence)
const addCategoryBtn = document.getElementById('addCategoryBtn');
if (addCategoryBtn) {
  addCategoryBtn.addEventListener('click', function(e){
    e.preventDefault();
    const nameEl = document.getElementById('newCategoryInput');
    const typeEl = document.getElementById('newCategoryType');
    if (!nameEl || !typeEl) return;
    const name = nameEl.value.trim();
    const type = typeEl.value;
    if (!name) { showToast('Please enter a category name', 'error'); return; }
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) { showToast('Category already exists', 'warning'); return; }
    categories.push({ name, type });
    saveCategories(categories);
    nameEl.value = '';
    showToast('Category added successfully', 'success');
  });
}

window.editCategory = function(idx){
  if (!categories[idx]) return;
  const cat = categories[idx];
  const newName = prompt("Edit category name:", cat.name);
  if (newName && newName.trim() && !categories.some((c,i)=>i!==idx && c.name.toLowerCase()===newName.toLowerCase())){
    categories[idx].name = newName.trim();
    saveCategories(categories);
    updateUI();
  }
};
window.removeCategory = function(idx){
  if (!categories[idx]) return;
  const used = transactions.some(tx => tx.category === categories[idx].name);
  if (used) {
    if (!confirm(`This category is used in ${transactions.filter(tx=>tx.category===categories[idx].name).length} transaction(s). Delete anyway?`)) return;
  } else {
    if (!confirm('Are you sure you want to delete this category?')) return;
  }
  categories.splice(idx,1);
  saveCategories(categories);
  updateUI();
};

// category select updater
function updateCategorySelect(){
  const typeSelect = document.getElementById('typeInput');
  const categorySelect = document.getElementById('categoryInput');
  if (!typeSelect || !categorySelect) return;
  const currentType = typeSelect.value;
  const filtered = categories.filter(c => c.type === currentType);
  categorySelect.innerHTML = '';
  if (filtered.length === 0) {
    categorySelect.innerHTML = '<option disabled>No categories available</option>';
    return;
  }
  filtered.forEach(c => {
    const o = document.createElement('option'); o.value = c.name; o.textContent = c.name; categorySelect.appendChild(o);
  });
}

// summary filters
function populateSummaryFilters(){
  const monthSel = document.getElementById('summaryMonth');
  const yearSel = document.getElementById('summaryYear');
  if (!monthSel || !yearSel) return;
  monthSel.innerHTML = ''; yearSel.innerHTML = '';
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const now = new Date(); const curM = now.getMonth()+1; const curY = now.getFullYear();
  months.forEach((m,i) => {
    const opt = document.createElement('option'); opt.value = i+1; opt.textContent = m; if (i+1 === curM) opt.selected = true; monthSel.appendChild(opt);
  });
  // years from transactions
  const years = Array.from(new Set(transactions.map(tx => { const d = new Date(tx.date); return isNaN(d) ? null : d.getFullYear(); }).filter(Boolean)));
  if (!years.includes(curY)) years.push(curY);
  years.sort((a,b)=>b-a);
  years.forEach(y => { const o = document.createElement('option'); o.value = y; o.textContent = y; if (y===curY) o.selected = true; yearSel.appendChild(o); });
  const allM = document.createElement('option'); allM.value = 'all'; allM.textContent = 'All Months'; monthSel.insertBefore(allM, monthSel.firstChild);
  const allY = document.createElement('option'); allY.value = 'all'; allY.textContent = 'All Years'; yearSel.insertBefore(allY, yearSel.firstChild);

  // attach change handlers to update rollover display
  monthSel.addEventListener('change', updateRolloverDisplay);
  yearSel.addEventListener('change', updateRolloverDisplay);
  updateRolloverDisplay();
}

// ----------------------
// Transactions UI & logic
// ----------------------
function updateUI(){
  // totals
  const totalIncome = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const totalExpense = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const net = totalIncome - totalExpense;
  const ti = document.getElementById('totalIncome');
  const te = document.getElementById('totalExpense');
  const nw = document.getElementById('netWealth');
  if (ti) ti.textContent = `${totalIncome.toLocaleString()} ${currency}`;
  if (te) te.textContent = `${totalExpense.toLocaleString()} ${currency}`;
  if (nw) nw.textContent = `${net.toLocaleString()} ${currency}`;

  // transactions table
  const tbody = document.getElementById('transactionsBody');
  if (tbody) tbody.innerHTML = '';
  if (!transactions.length) {
    const noTx = document.getElementById('noTransactions');
    if (noTx) noTx.classList.remove('d-none');
  } else {
    const noTx = document.getElementById('noTransactions');
    if (noTx) noTx.classList.add('d-none');
    transactions.slice().reverse().forEach((tx, indexReverse) => {
      const idx = transactions.length - 1 - indexReverse;
      const tr = document.createElement('tr');
      tr.className = 'clickable-row';
      tr.innerHTML = `
        <td>${escapeHtml(tx.date)}</td>
        <td class="description-cell" data-fulltext="${escapeHtml(tx.desc)}">${escapeHtml(tx.desc)}</td>
        <td>${escapeHtml(tx.type)}</td>
        <td>${escapeHtml(tx.category || '')}</td>
        <td style="text-align:right">${Number(tx.amount).toLocaleString()} ${currency}</td>
        <td>
          <button class="btn-action" title="Edit" onclick="editTransaction(${idx})"><i class="bi bi-pencil"></i></button>
          <button class="btn-action btn-delete" title="Delete" onclick="confirmDeleteTransaction(${idx})"><i class="bi bi-trash"></i></button>
        </td>
      `;
      if (tbody) tbody.appendChild(tr);
    });
  }
  // categories on dashboard
  renderBreakdown();
  updateCategorySelect();
  updateProfileUI();
  populateSummaryFilters();
  updateAllNotificationBadges();
  updateRolloverDisplay();
}

function renderBreakdown(){
  const incHolder = document.getElementById('incomeBreakdown');
  const expHolder = document.getElementById('expenseBreakdown');
  if (incHolder) incHolder.innerHTML = '';
  if (expHolder) expHolder.innerHTML = '';
  const incomeCats = categories.filter(c=>c.type==='income');
  const expenseCats = categories.filter(c=>c.type==='expense');
  incomeCats.forEach(cat=>{
    const total = transactions.filter(t=>t.type==='income' && t.category===cat.name).reduce((s,t)=>s+t.amount,0);
    const el = document.createElement('div'); el.className = 'breakdown-item';
    el.innerHTML = `<div>${escapeHtml(cat.name)}</div><div class="fw-bold">${Number(total).toLocaleString()} ${currency}</div>`;
    if (incHolder) incHolder.appendChild(el);
  });
  expenseCats.forEach(cat=>{
    const total = transactions.filter(t=>t.type==='expense' && t.category===cat.name).reduce((s,t)=>s+t.amount,0);
    const el = document.createElement('div'); el.className = 'breakdown-item';
    el.innerHTML = `<div>${escapeHtml(cat.name)}</div><div class="fw-bold">${Number(total).toLocaleString()} ${currency}</div>`;
    if (expHolder) expHolder.appendChild(el);
  });
}

function confirmDeleteTransaction(idx){
  const transaction = transactions[idx];
  if (!transaction) return;
  const modalEl = document.getElementById('confirmationModal');
  if (!modalEl || typeof bootstrap === 'undefined') {
    // fallback confirm
    if (!confirm(`Delete "${transaction.desc}" - ${transaction.amount} ${currency}?`)) return;
    transactions.splice(idx,1);
    saveTransactions(transactions);
    showToast('Transaction deleted successfully', 'success');
    return;
  }
  const confirmationModal = new bootstrap.Modal(modalEl);
  const titleEl = document.getElementById('confirmationTitle');
  const msgEl = document.getElementById('confirmationMessage');
  if (titleEl) titleEl.textContent = 'Delete Transaction?';
  if (msgEl) msgEl.innerHTML = `
    Are you sure you want to delete this transaction?<br>
    <strong>${escapeHtml(transaction.desc)}</strong> - ${transaction.amount} ${currency}<br>
    <small class="text-muted">${escapeHtml(transaction.date)} • ${escapeHtml(transaction.category)}</small>
  `;
  const confirmBtn = document.getElementById('confirmActionBtn');
  if (confirmBtn) {
    confirmBtn.onclick = function(){
      transactions.splice(idx,1);
      saveTransactions(transactions);
      confirmationModal.hide();
      showToast('Transaction deleted successfully', 'success');
    };
  }
  confirmationModal.show();
}

function editTransaction(idx){
  const tx = transactions[idx];
  if (!tx) return;
  const addModalEl = document.getElementById('addTransactionModal');
  if (!addModalEl || typeof bootstrap === 'undefined') {
    showToast('Edit modal not available', 'warning'); return;
  }
  const addModal = new bootstrap.Modal(addModalEl);
  const titleEl = document.getElementById('addTransactionModalLabel');
  const submitBtn = document.getElementById('submitTransactionBtn');
  document.getElementById('editTransactionIndex').value = idx;
  if (titleEl) titleEl.innerHTML = '<i class="bi bi-pencil"></i> Edit Transaction';
  if (submitBtn) submitBtn.textContent = 'Save';
  document.getElementById('dateInput').value = tx.date;
  document.getElementById('descInput').value = tx.desc;
  document.getElementById('typeInput').value = tx.type;
  updateCategorySelect();
  if (document.getElementById('categoryInput')) document.getElementById('categoryInput').value = tx.category;
  document.getElementById('amountInput').value = tx.amount;
  addModal.show();
}

// Add transaction from category modal
function addTransactionForCategory() {
  const modal = document.getElementById('categoryTransactionsModal');
  if (!modal) return;
  const bsModal = bootstrap.Modal.getInstance(modal);
  if (bsModal) bsModal.hide();
  setTimeout(() => {
    const addModalEl = document.getElementById('addTransactionModal');
    if (!addModalEl) {
      showToast('Add transaction modal missing', 'error'); return;
    }
    // open add modal with prefilled info if currentCategoryView set
    const addModal = new bootstrap.Modal(addModalEl);
    document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-plus-circle"></i> Add Transaction';
    document.getElementById('submitTransactionBtn').textContent = 'Add';
    document.getElementById('editTransactionIndex').value = '-1';
    document.getElementById('transactionForm').reset();
    if (window.currentCategoryView && window.currentCategoryView.categoryName && window.currentCategoryView.type) {
      document.getElementById('typeInput').value = window.currentCategoryView.type;
      updateCategorySelect();
      document.getElementById('categoryInput').value = window.currentCategoryView.categoryName;
    }
    addModal.show();
  }, 250);
}

function editTransactionFromCategory(idx) {
  const modal = document.getElementById('categoryTransactionsModal');
  if (modal) {
    const bs = bootstrap.Modal.getInstance(modal);
    if (bs) bs.hide();
  }
  setTimeout(() => editTransaction(idx), 300);
}

function removeTransactionFromCategory(idx) {
  // reuse confirmDeleteTransaction for actual deletion
  confirmDeleteTransaction(idx);
}

// ----------------------
// Add / Edit transaction form submit
// ----------------------
const txFormEl = document.getElementById('transactionForm');
if (txFormEl) {
  txFormEl.addEventListener('submit', function(e){
    e.preventDefault();

    const date = document.getElementById('dateInput').value;
    const desc = document.getElementById('descInput').value.trim();
    const type = document.getElementById('typeInput').value;
    const category = document.getElementById('categoryInput').value;
    const amount = parseFloat(document.getElementById('amountInput').value);
    const idxVal = document.getElementById('editTransactionIndex').value;
    const idx = idxVal === '' ? -1 : parseInt(idxVal, 10);

    if (!date || !desc || !type || !category || isNaN(amount) || amount <= 0) {
      showToast('Please fill in all fields with valid data', 'error');
      return;
    }

    const tx = { date, desc, type, category, amount };

    if (!isNaN(idx) && idx >= 0 && idx < transactions.length) {
      // Editing
      transactions[idx] = tx;
      showToast('Transaction updated successfully', 'success');
    } else {
      // New
      transactions.push(tx);
      showToast('Transaction added successfully', 'success');
    }

    saveTransactions(transactions);

    // reset form
    e.target.reset();
    document.getElementById('editTransactionIndex').value = '';

    // close modal
    const addModalEl = document.getElementById('addTransactionModal');
    if (addModalEl && typeof bootstrap !== 'undefined') {
      const addModalInst = bootstrap.Modal.getInstance(addModalEl) || new bootstrap.Modal(addModalEl);
      addModalInst.hide();
    }
  });
}

// ----------------------
// Category Transactions Modal / showCategoryTransactions
// ----------------------
let currentCategoryView = null;
function showCategoryTransactions(type, categoryName) {
  currentCategoryView = { type, categoryName };
  const modalEl = document.getElementById('categoryTransactionsModal');
  if (!modalEl || typeof bootstrap === 'undefined') return;
  const modal = new bootstrap.Modal(modalEl);
  const title = document.getElementById('categoryTransactionsTitle');
  const info = document.getElementById('categoryTransactionsInfo');
  const totalAmount = document.getElementById('categoryTotalAmount');
  const transactionsList = document.getElementById('categoryTransactionsList');
  const noTransactions = document.getElementById('noCategoryTransactions');

  const monthSel = document.getElementById('summaryMonth');
  const yearSel = document.getElementById('summaryYear');

  let filteredTx = transactions.filter(tx => tx.type === type);

  if (categoryName !== 'all') filteredTx = filteredTx.filter(tx => tx.category === categoryName);

  if (monthSel && yearSel) {
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
  }

  if (categoryName === 'all') {
    if (title) title.innerHTML = `<i class="bi bi-list-ul"></i> All ${type.charAt(0).toUpperCase() + type.slice(1)} Transactions`;
    if (info) info.textContent = `Showing ${filteredTx.length} transactions`;
  } else {
    if (title) title.innerHTML = `<i class="bi bi-tag"></i> ${escapeHtml(categoryName)} Transactions`;
    if (info) info.textContent = `Showing ${filteredTx.length} ${type} transactions`;
  }

  const total = filteredTx.reduce((sum, tx) => sum + tx.amount, 0);
  if (totalAmount) {
    totalAmount.textContent = `${Number(total).toLocaleString()} ${currency}`;
    totalAmount.className = `fw-bold fs-5 ${type === 'income' ? 'text-success' : 'text-danger'}`;
  }

  if (transactionsList) transactionsList.innerHTML = '';

  if (filteredTx.length === 0) {
    if (noTransactions) noTransactions.classList.remove('d-none');
  } else {
    if (noTransactions) noTransactions.classList.add('d-none');
    filteredTx.slice().reverse().forEach((tx, idx) => {
      // find original index
      const originalIndex = transactions.findIndex(t => t.date === tx.date && t.desc === tx.desc && t.amount === tx.amount && t.category === tx.category && t.type === tx.type);
      const item = document.createElement('div');
      item.className = 'category-transaction-item d-flex justify-content-between align-items-center';
      item.innerHTML = `
        <div class="category-transaction-info">
          <div class="fw-bold">${escapeHtml(tx.desc)}</div>
          <small class="text-muted">${escapeHtml(tx.date)} • ${escapeHtml(tx.category)}</small>
        </div>
        <div class="category-transaction-actions d-flex align-items-center gap-2">
          <span class="fw-bold ${type === 'income' ? 'text-success' : 'text-danger'}">
            ${Number(tx.amount).toLocaleString()} ${currency}
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

// ----------------------
// Tabs & responsiveness
// ----------------------
function showTab(tab) {
  const tabs = ["dashboard","transactions","charts","settings"];
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.classList.toggle('d-none', t !== tab);
    const btn = document.querySelector(`[data-tab='${t}']`);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  setTimeout(() => {
    if (tab === "transactions") adjustTransactionsTable();
  }, 50);
  if (tab === "charts") {
    // placeholder: render charts
    // renderEnhancedCharts();
  }
}
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", function() {
    const tab = this.dataset.tab;
    if (tab) showTab(tab);
  });
});

// adjust transactions table height
function adjustTransactionsTable() {
  const tableContainer = document.querySelector('#tab-transactions .table-container');
  const table = document.getElementById('transactionsTable');
  if (!tableContainer || !table) return;
  tableContainer.style.height = '';
  table.style.width = '';
  setTimeout(() => {
    const availableHeight = window.innerHeight - tableContainer.getBoundingClientRect().top - 100;
    tableContainer.style.height = Math.max(availableHeight, 300) + 'px';
  }, 100);
}
window.addEventListener('resize', function() {
  if (!document.getElementById('tab-transactions') || document.getElementById('tab-transactions').classList.contains('d-none')) return;
  adjustTransactionsTable();
});

// ----------------------
// Initialization
// ----------------------
document.addEventListener('DOMContentLoaded', () => {
  // wire up small UI elements safely
  const openAddBtn = document.getElementById('openAddTransactionModal');
  const addModalEl = document.getElementById('addTransactionModal');
  if (openAddBtn && addModalEl && typeof bootstrap !== 'undefined') {
    openAddBtn.addEventListener('click', () => {
      const addModal = new bootstrap.Modal(addModalEl);
      document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-plus-circle"></i> Add Transaction';
      document.getElementById('submitTransactionBtn').textContent = 'Add';
      document.getElementById('editTransactionIndex').value = '';
      document.getElementById('transactionForm').reset();
      // set default date to today
      const dateEl = document.getElementById('dateInput');
      if (dateEl) dateEl.value = new Date().toISOString().slice(0,10);
      addModal.show();
    });
  }

  // wire type -> category select
  const typeInput = document.getElementById('typeInput');
  if (typeInput) typeInput.addEventListener('change', updateCategorySelect);

  // wire dark mode toggle (in Settings)
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'enabled') {
      document.body.classList.add('dark-mode');
      darkModeToggle.checked = true;
    } else {
      document.body.classList.remove('dark-mode');
      darkModeToggle.checked = false;
    }
    darkModeToggle.addEventListener('change', e => {
      if (e.target.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode','enabled');
      } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode','disabled');
      }
    });
  }

  // wire notification icons (IDs are: notifInfoIcon, notifSuccessIcon, notifWarningIcon, notifErrorIcon)
  ['Info','Success','Warning','Error'].forEach(cap => {
    const id = `notif${cap}Icon`;
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        showNotificationList(cap.toLowerCase());
      });
    }
  });

  // wire notificationDropdown close when clicking outside handled at top click handler

  // initialize UI
  updateUI();
  calculateMonthlyRollover();
  updateAllNotificationBadges();
  populateSummaryFilters();
  // adjust table height if transactions tab visible
  adjustTransactionsTable();

  // populate category settings list
  renderCategoryList();

  // initialize profile UI state
  updateProfileUI();
});
