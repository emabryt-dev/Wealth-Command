// Wealth Command: Enhanced categories with types

let transactions = loadTransactions();
let categories = loadCategories();
let currency = loadCurrency() || "PKR";
let currentCategoryFilter = 'all';

// Google Drive Sync Configuration
const GOOGLE_DRIVE_FILE_NAME = 'wealth_command_data.json';
let googleUser = null;
let isOnline = navigator.onLine;

// Check online status
window.addEventListener('online', () => {
  isOnline = true;
  showSyncStatus('Back online. Syncing data...', 'info');
  if (googleUser) syncDataToDrive();
});

window.addEventListener('offline', () => {
  isOnline = false;
  showSyncStatus('You are offline. Changes will sync when back online.', 'warning');
});

// Show sync status
function showSyncStatus(message, type) {
  const syncStatus = document.getElementById('syncStatus');
  const syncMessage = document.getElementById('syncMessage');
  
  if (syncStatus && syncMessage) {
    syncMessage.textContent = message;
    syncStatus.className = `alert alert-${type} alert-dismissible fade show mb-0 d-none`;
    syncStatus.classList.remove('d-none');
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        syncStatus.classList.add('d-none');
      }, 3000);
    }
  }
}

// Google Sign-In Handler
function handleGoogleSignIn(response) {
  console.log('Google Sign-In Response:', response);
  
  // Extract the credential (JWT)
  const credential = response.credential;
  
  // Get user info from the credential
  const userObject = parseJwt(credential);
  
  googleUser = {
    id: userObject.sub,
    email: userObject.email,
    name: userObject.name,
    picture: userObject.picture,
    access_token: credential,
    expires_at: userObject.exp * 1000
  };
  
  // Save to localStorage
  localStorage.setItem('googleUser', JSON.stringify(googleUser));
  
  showSyncStatus(`Signed in as ${userObject.email}`, 'success');
  updateSyncUI();
  
  // Now initialize Drive API with the token
  initDriveAPI(credential);
}

// Helper function to parse JWT
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Initialize Drive API with the JWT token
async function initDriveAPI(accessToken) {
  try {
    // Test Drive API access
    const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (response.ok) {
      showSyncStatus('Google Drive access granted', 'success');
      loadDataFromDrive();
    } else {
      showSyncStatus('Drive access failed. Please check permissions.', 'warning');
    }
  } catch (error) {
    console.error('Drive API init error:', error);
    showSyncStatus('Error connecting to Google Drive', 'danger');
  }
}

// Load data from Google Drive
async function loadDataFromDrive() {
  if (!googleUser || !isOnline) return false;
  
  try {
    // Search for existing file
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${GOOGLE_DRIVE_FILE_NAME}'&fields=files(id,name)`,
      {
        headers: {
          'Authorization': `Bearer ${googleUser.access_token}`
        }
      }
    );
    
    const data = await response.json();
    
    if (data.files && data.files.length > 0) {
      const fileId = data.files[0].id;
      
      // Download file content
      const fileResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${googleUser.access_token}`
          }
        }
      );
      
      const driveData = await fileResponse.json();
      
      // Merge data
      if (driveData.transactions) {
        transactions = mergeArrays(transactions, driveData.transactions);
        saveTransactions(transactions);
      }
      if (driveData.categories) {
        categories = mergeArrays(categories, driveData.categories);
        saveCategories(categories);
      }
      if (driveData.currency) {
        currency = driveData.currency;
        saveCurrency(currency);
      }
      
      updateUI();
      renderCharts();
      showSyncStatus('Data loaded from Google Drive', 'success');
      return true;
    }
  } catch (error) {
    console.error('Error loading from Drive:', error);
    showSyncStatus('Error loading data from Drive', 'danger');
  }
  return false;
}

// Sync data to Google Drive
async function syncDataToDrive() {
  if (!googleUser || !isOnline) return;
  
  try {
    const fileData = {
      transactions,
      categories,
      currency,
      lastSync: new Date().toISOString(),
      version: '1.0'
    };
    
    // Check if file exists
    const listResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${GOOGLE_DRIVE_FILE_NAME}'`,
      {
        headers: {
          'Authorization': `Bearer ${googleUser.access_token}`
        }
      }
    );
    
    const files = await listResponse.json();
    const existingFile = files.files?.find(file => file.name === GOOGLE_DRIVE_FILE_NAME);
    
    const url = existingFile 
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=media';
    
    const method = existingFile ? 'PATCH' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${googleUser.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(existingFile ? fileData : {
        name: GOOGLE_DRIVE_FILE_NAME,
        ...fileData
      })
    });
    
    if (response.ok) {
      showSyncStatus('Data synced to Google Drive', 'success');
    } else {
      throw new Error('Drive API error');
    }
  } catch (error) {
    console.error('Error syncing to Drive:', error);
    showSyncStatus('Error syncing to Google Drive', 'danger');
  }
}

// Helper function to merge arrays with conflict resolution
function mergeArrays(localArray, driveArray) {
  const merged = [...localArray];
  const driveMap = new Map();
  
  driveArray.forEach(item => {
    if (item.id) {
      driveMap.set(item.id, item);
    } else if (item.date && item.desc && item.amount) {
      // For transactions without ID, create a unique key
      const key = `${item.date}-${item.desc}-${item.amount}-${item.type}`;
      driveMap.set(key, item);
    } else if (item.name) {
      // For categories
      driveMap.set(item.name, item);
    }
  });
  
  // Add items from Drive that don't exist locally
  driveMap.forEach((driveItem, key) => {
    const exists = merged.some(localItem => {
      if (localItem.id) return localItem.id === driveItem.id;
      if (localItem.date && localItem.desc && localItem.amount) {
        return `${localItem.date}-${localItem.desc}-${localItem.amount}-${localItem.type}` === key;
      }
      if (localItem.name) {
        return localItem.name === driveItem.name;
      }
      return false;
    });
    
    if (!exists) {
      merged.push(driveItem);
    }
  });
  
  return merged;
}

// Update sync UI in settings
function updateSyncUI() {
  const syncStatusText = document.getElementById('syncStatusText');
  const manualSync = document.getElementById('manualSync');
  const googleSignOut = document.getElementById('googleSignOut');
  
  if (syncStatusText) {
    syncStatusText.textContent = googleUser 
      ? `Signed in as ${googleUser.email}`
      : 'Sign in with Google to sync across devices';
  }
  
  if (manualSync) manualSync.disabled = !googleUser;
  if (googleSignOut) googleSignOut.disabled = !googleUser;
}

// Sign out function
function signOut() {
  googleUser = null;
  localStorage.removeItem('googleUser');
  showSyncStatus('Signed out successfully', 'info');
  updateSyncUI();
  
  // Hide Google Sign-In button and show it again
  if (window.google && google.accounts.id) {
    google.accounts.id.disableAutoSelect();
  }
}

// Manual sync function
function manualSync() {
  if (googleUser && isOnline) {
    syncDataToDrive();
  }
}

// Initialize Google Sign-In
function initGoogleSignIn() {
  try {
    // Check if user is already signed in
    const savedUser = localStorage.getItem('googleUser');
    if (savedUser) {
      googleUser = JSON.parse(savedUser);
      
      // Check if token is expired
      if (googleUser.expires_at && Date.now() > googleUser.expires_at) {
        localStorage.removeItem('googleUser');
        googleUser = null;
        showSyncStatus('Session expired. Please sign in again.', 'warning');
      } else {
        showSyncStatus(`Welcome back, ${googleUser.email}!`, 'info');
        updateSyncUI();
        loadDataFromDrive();
      }
    }
    
    // Add event listeners for sync buttons
    document.getElementById('manualSync')?.addEventListener('click', manualSync);
    document.getElementById('googleSignOut')?.addEventListener('click', signOut);
    
    updateSyncUI();
  } catch (error) {
    console.error('Google Sign-In init error:', error);
  }
}

// Page navigation logic
const tabs = ["dashboard", "transactions", "charts", "settings"];
function showTab(tab) {
  tabs.forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle("d-none", t !== tab);
    document.querySelector(`[data-tab='${t}']`).classList.toggle("active", t === tab);
  });
  if(tab === "charts") renderCharts();
}
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => showTab(btn.dataset.tab));
});
showTab("dashboard");

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
  
  // Add filter buttons
  const filterButtons = `
    <div class="category-filter-buttons">
      <button class="btn btn-sm category-filter-btn ${currentCategoryFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}" onclick="setCategoryFilter('all')">All</button>
      <button class="btn btn-sm category-filter-btn ${currentCategoryFilter === 'income' ? 'btn-success' : 'btn-outline-success'}" onclick="setCategoryFilter('income')">Income</button>
      <button class="btn btn-sm category-filter-btn ${currentCategoryFilter === 'expense' ? 'btn-danger' : 'btn-outline-danger'}" onclick="setCategoryFilter('expense')">Expense</button>
    </div>
  `;
  ul.innerHTML = filterButtons;
  
  // Filter categories based on current filter
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

// Update category dropdown when transaction type changes
document.getElementById('typeInput').addEventListener('change', updateCategorySelect);

// Sleek Dashboard summary filter
function populateSummaryFilters() {
  const monthSel = document.getElementById('summaryMonth');
  const yearSel = document.getElementById('summaryYear');
  monthSel.innerHTML = '';
  yearSel.innerHTML = '';
  
  const monthNames = ["All Months","January","February","March","April","May","June","July","August","September","October","November","December"];
  monthNames.forEach((m,i) => {
    const opt = document.createElement('option');
    opt.value = i===0 ? "all" : i;
    opt.textContent = m;
    monthSel.appendChild(opt);
  });
  
  const yearsArr = Array.from(new Set(transactions.map(tx => {
    const d = new Date(tx.date);
    return isNaN(d) ? null : d.getFullYear();
  }).filter(Boolean)));
  yearsArr.sort((a,b)=>b-a);
  yearSel.innerHTML = '<option value="all">All Years</option>';
  yearsArr.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSel.appendChild(opt);
  });
  
  monthSel.value = "all";
  yearSel.value = "all";
}
populateSummaryFilters();
document.getElementById('summaryMonth').onchange = updateUI;
document.getElementById('summaryYear').onchange = updateUI;

// Add Transaction Modal
const addTxModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
document.getElementById('openAddTransactionModal').onclick = () => addTxModal.show();

// Add Transaction
document.getElementById('transactionForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const date = document.getElementById('dateInput').value;
  const desc = document.getElementById('descInput').value.trim();
  const type = document.getElementById('typeInput').value;
  const cat = document.getElementById('categoryInput').value;
  const amount = parseFloat(document.getElementById('amountInput').value);
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
  transactions.push({ date, desc, type, category: cat, amount });
  saveTransactions(transactions);
  updateUI();
  addTxModal.hide();
  this.reset();
  populateSummaryFilters();
});

// Clear All Transactions
document.getElementById('clearTransactions').addEventListener('click', function() {
  if (confirm("Are you sure you want to clear all transactions?")) {
    transactions = [];
    saveTransactions(transactions);
    updateUI();
    renderCharts();
    populateSummaryFilters();
  }
});

// Remove Transaction
function removeTransaction(idx) {
  transactions.splice(idx, 1);
  saveTransactions(transactions);
  updateUI();
  renderCharts();
  populateSummaryFilters();
}

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
  
  // Dashboard: Net Wealth, Income, Expense
  const totalIncome = filteredTx.filter(tx => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = filteredTx.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
  document.getElementById("totalIncome").textContent = totalIncome.toLocaleString() + " " + currency;
  document.getElementById("totalExpense").textContent = totalExpense.toLocaleString() + " " + currency;
  document.getElementById("netWealth").textContent = (totalIncome - totalExpense).toLocaleString() + " " + currency;

  // Income Breakdown - Show only category totals
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
        item.innerHTML = `
          <span class="breakdown-category">${cat.name}</span>
          <span class="breakdown-amount">${catAmount.toLocaleString()} ${currency}</span>
        `;
        incomeBreakdown.appendChild(item);
      }
    });
    
    if (!hasIncomeData) {
      noIncomeMsg.style.display = 'block';
    }
  }

  // Expense Breakdown - Show only category totals
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
        item.innerHTML = `
          <span class="breakdown-category">${cat.name}</span>
          <span class="breakdown-amount">${catAmount.toLocaleString()} ${currency}</span>
        `;
        expenseBreakdown.appendChild(item);
      }
    });
    
    if (!hasExpenseData) {
      noExpenseMsg.style.display = 'block';
    }
  }

  // Transactions Table
  const tbody = document.getElementById('transactionsBody');
  tbody.innerHTML = "";
  if (transactions.length === 0) {
    document.getElementById('noTransactions').style.display = 'block';
  } else {
    document.getElementById('noTransactions').style.display = 'none';
    transactions.slice().reverse().forEach((tx, idx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${tx.date}</td>
        <td>${tx.desc}</td>
        <td class="fw-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}">${tx.type}</td>
        <td>${tx.category}</td>
        <td class="fw-bold">${tx.amount.toLocaleString()} ${currency}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="removeTransaction(${transactions.length - 1 - idx})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }
}

// Chart.js charts
let incomeExpenseChart, categoryChart;
function renderCharts() {
  const totalIncome = transactions.filter(tx => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = transactions.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
  const ctxIE = document.getElementById('incomeExpenseChart').getContext('2d');
  if (incomeExpenseChart) incomeExpenseChart.destroy();
  incomeExpenseChart = new Chart(ctxIE, {
    type: 'pie',
    data: {
      labels: ['Income', 'Expense'],
      datasets: [{
        data: [totalIncome, totalExpense],
        backgroundColor: ['#198754', '#dc3545']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });

  const catLabels = categories.map(cat => cat.name);
  const catIncome = categories.map(cat => transactions.filter(tx => tx.category === cat.name && tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0));
  const catExpense = categories.map(cat => transactions.filter(tx => tx.category === cat.name && tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0));
  const ctxCat = document.getElementById('categoryChart').getContext('2d');
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctxCat, {
    type: 'bar',
    data: {
      labels: catLabels,
      datasets: [
        { label: 'Income', data: catIncome, backgroundColor: '#198754' },
        { label: 'Expense', data: catExpense, backgroundColor: '#dc3545' }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

// Import/Export
document.getElementById('exportBtn').onclick = function() {
  const data = {
    transactions,
    categories,
    currency
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:"application/json"}));
  const a = document.createElement("a");
  a.href = url;
  a.download = "wealth-command-backup.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
      saveTransactions(transactions);
      saveCategories(categories);
      saveCurrency(currency);
      renderCategoryList();
      populateSummaryFilters();
      updateUI();
      renderCharts();
      showImportExportAlert("Import successful!", "success");
    } catch {
      showImportExportAlert("Import failed: Invalid file.", "danger");
    }
  };
  reader.readAsText(file);
};
function showImportExportAlert(msg, type) {
  const alertBox = document.getElementById('importExportAlert');
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = msg;
  alertBox.classList.remove('d-none');
  setTimeout(()=>alertBox.classList.add('d-none'), 3000);
}

// LocalStorage handlers
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
  if (googleUser && isOnline) syncDataToDrive();
}

function loadCategories() {
  try {
    const cats = JSON.parse(localStorage.getItem('categories'));
    if (Array.isArray(cats) && cats.length > 0) {
      // Migrate old string categories to new object format
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
  if (googleUser && isOnline) syncDataToDrive();
}

function loadCurrency() {
  return localStorage.getItem("currency");
}
function saveCurrency(val) {
  currency = val;
  localStorage.setItem("currency", val);
  if (googleUser && isOnline) syncDataToDrive();
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

// Initial UI update
document.addEventListener('DOMContentLoaded', function() {
  initGoogleSignIn();
  renderCategoryList();
  updateUI();
});
