// Wealth Command: Complete with Google Drive Sync

let transactions = loadTransactions();
let categories = loadCategories();
let currency = loadCurrency() || "PKR";
let currentCategoryFilter = 'all';

// Google Drive Sync Configuration
const GOOGLE_DRIVE_FILE_NAME = 'wealth_command_data.json';
const GOOGLE_CLIENT_ID = '86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com';
let googleUser = null;
let googleAuth = null;
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
    
    if (type === 'success') {
      setTimeout(() => {
        syncStatus.classList.add('d-none');
      }, 3000);
    }
  }
}

// Initialize Google Auth properly
function initGoogleAuth() {
  if (!window.google) {
    showSyncStatus('Google auth not loaded. Please refresh the page.', 'warning');
    return;
  }
  
  googleAuth = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback: (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        googleUser = {
          access_token: tokenResponse.access_token,
          expires_in: tokenResponse.expires_in,
          acquired_at: Date.now()
        };
        
        localStorage.setItem('googleUser', JSON.stringify(googleUser));
        showSyncStatus('Google Drive connected!', 'success');
        updateProfileUI();
        loadDataFromDrive();
      }
    },
    error_callback: (error) => {
      console.error('Google Auth error:', error);
      showSyncStatus('Google Sign-In failed: ' + error.message, 'danger');
    }
  });
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

function googleSignOut() {
  if (googleUser && googleUser.access_token) {
    // Revoke the token
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

// Load data from Google Drive
async function loadDataFromDrive() {
  if (!googleUser || !googleUser.access_token) {
    showSyncStatus('Not authenticated with Google Drive', 'warning');
    return false;
  }
  
  if (!isOnline) {
    showSyncStatus('Cannot sync: You are offline', 'warning');
    return false;
  }
  
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
    
    if (response.status === 401) {
      showSyncStatus('Authentication expired. Please sign in again.', 'warning');
      localStorage.removeItem('googleUser');
      googleUser = null;
      updateProfileUI();
      return false;
    }
    
    if (!response.ok) {
      throw new Error(`Drive API error: ${response.status}`);
    }
    
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
      
      if (!fileResponse.ok) {
        throw new Error(`File download error: ${fileResponse.status}`);
      }
      
      const driveData = await fileResponse.json();
      
      // Merge data with local data (prefer remote data for conflicts)
      if (driveData.transactions && Array.isArray(driveData.transactions)) {
        transactions = driveData.transactions;
        saveTransactions(transactions);
      }
      if (driveData.categories && Array.isArray(driveData.categories)) {
        categories = driveData.categories;
        saveCategories(categories);
      }
      if (driveData.currency) {
        currency = driveData.currency;
        saveCurrency(currency);
      }
      
      updateUI();
      renderCharts();
      showSyncStatus('Data loaded from Google Drive!', 'success');
      return true;
    } else {
      // No existing file, upload current data
      showSyncStatus('No existing data found. Uploading current data to Drive.', 'info');
      await syncDataToDrive();
      return true;
    }
  } catch (error) {
    console.error('Error loading from Drive:', error);
    showSyncStatus('Error loading from Google Drive: ' + error.message, 'danger');
    return false;
  }
}

// Sync data to Google Drive
async function syncDataToDrive() {
  if (!googleUser || !googleUser.access_token) {
    showSyncStatus('Please sign in to sync data', 'warning');
    return false;
  }
  
  if (!isOnline) {
    showSyncStatus('Cannot sync: You are offline', 'warning');
    return false;
  }
  
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
      `https://www.googleapis.com/drive/v3/files?q=name='${GOOGLE_DRIVE_FILE_NAME}'&fields=files(id)`,
      {
        headers: {
          'Authorization': `Bearer ${googleUser.access_token}`
        }
      }
    );
    
    if (!listResponse.ok) {
      throw new Error(`Drive list error: ${listResponse.status}`);
    }
    
    const files = await listResponse.json();
    const existingFile = files.files?.[0];
    
    let response;
    if (existingFile) {
      // Update existing file
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
    } else {
      // Create new file
      response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=media',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${googleUser.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: GOOGLE_DRIVE_FILE_NAME,
            ...fileData
          })
        }
      );
    }
    
    if (response.ok) {
      showSyncStatus('Data synced to Google Drive successfully!', 'success');
      return true;
    } else {
      throw new Error(`Drive upload error: ${response.status}`);
    }
  } catch (error) {
    console.error('Error syncing to Drive:', error);
    showSyncStatus('Error syncing to Google Drive: ' + error.message, 'danger');
    return false;
  }
}

function manualSync() {
  if (googleUser) {
    syncDataToDrive();
  } else {
    showGoogleSignIn();
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
  
  const filterButtons = `
    <div class="category-filter-buttons">
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
  
  const totalIncome = filteredTx.filter(tx => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = filteredTx.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
  document.getElementById("totalIncome").textContent = totalIncome.toLocaleString() + " " + currency;
  document.getElementById("totalExpense").textContent = totalExpense.toLocaleString() + " " + currency;
  document.getElementById("netWealth").textContent = (totalIncome - totalExpense).toLocaleString() + " " + currency;

  // Income Breakdown
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

  // Expense Breakdown
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

// Final Initialization
document.addEventListener('DOMContentLoaded', function() {
  // Load saved user data
  const savedUser = localStorage.getItem('googleUser');
  if (savedUser) {
    googleUser = JSON.parse(savedUser);
    // Check if token is expired (1 hour expiry)
    const tokenAge = Date.now() - googleUser.acquired_at;
    if (tokenAge > (googleUser.expires_in - 60) * 1000) {
      localStorage.removeItem('googleUser');
      googleUser = null;
    } else {
      showSyncStatus('Google Drive connected', 'info');
    }
  }
  
  // Initialize Google Auth
  initGoogleAuth();
  
  // Update UI
  updateProfileUI();
  renderCategoryList();
  updateUI();
  
  // Add event listeners
  document.getElementById('manualSyncSettings')?.addEventListener('click', manualSync);
});
