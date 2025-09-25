// Wealth Command: Enhanced categories with types

let transactions = loadTransactions();
let categories = loadCategories();
let currency = loadCurrency() || "PKR";
let currentCategoryFilter = 'all';

// Page navigation logic
const tabs = ["dashboard", "breakdown", "transactions", "charts", "settings"];
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

  // Breakdown: category cards (all time)
  const breakdownDiv = document.getElementById("categoryBreakdown");
  breakdownDiv.innerHTML = "";
  categories.forEach(cat => {
    const catIncome = transactions.filter(tx => tx.category === cat.name && tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
    const catExpense = transactions.filter(tx => tx.category === cat.name && tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
    const net = catIncome - catExpense;
    const card = document.createElement("div");
    card.className = "col-12 col-md-6 category-card";
    card.innerHTML = `
      <strong>${cat.name} <span class="category-type-badge ${cat.type === 'income' ? 'category-income' : 'category-expense'}">${cat.type}</span></strong>
      <div class="row mt-2">
        <div class="col-6 text-success">Income: ${catIncome.toLocaleString()} ${currency}</div>
        <div class="col-6 text-danger">Expense: ${catExpense.toLocaleString()} ${currency}</div>
      </div>
      <div class="mt-2">Net: <span class="${net >= 0 ? 'text-success' : 'text-danger'}">${net.toLocaleString()} ${currency}</span></div>
    `;
    breakdownDiv.appendChild(card);
  });

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
  localStorage.setItem('transactions', JSON.stringify(arr));
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
  localStorage.setItem('categories', JSON.stringify(arr));
}
function loadCurrency() {
  return localStorage.getItem("currency");
}
function saveCurrency(val) {
  localStorage.setItem("currency", val);
}

// Dark Mode Toggle
document.getElementById('darkModeToggle').addEventListener('click
