// Wealth Command: Sleek summary filter with dropdown

let transactions = loadTransactions();
let categories = loadCategories();
let currency = loadCurrency() || "PKR";

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

// Settings: Category management (collapsible)
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
  categories.forEach((cat, idx) => {
    const li = document.createElement('li');
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <span>${cat}</span>
      <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="removeCategory(${idx})"><i class="bi bi-trash"></i></button>
    `;
    ul.appendChild(li);
  });
  updateCategorySelect();
}
function updateCategorySelect() {
  const sel = document.getElementById('categoryInput');
  sel.innerHTML = '';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
  if (categories.length === 0) {
    sel.innerHTML = '<option disabled>No categories</option>';
  }
}
document.getElementById('addCategoryBtn').onclick = function() {
  const val = document.getElementById('newCategoryInput').value.trim();
  if (val && !categories.includes(val)) {
    categories.push(val);
    saveCategories(categories);
    renderCategoryList();
    document.getElementById('newCategoryInput').value = '';
  }
};
window.removeCategory = function(idx) {
  categories.splice(idx, 1);
  saveCategories(categories);
  renderCategoryList();
};
renderCategoryList();

// Sleek Dashboard summary filter
function populateSummaryFilters() {
  const monthSel = document.getElementById('summaryMonth');
  const yearSel = document.getElementById('summaryYear');
  monthSel.innerHTML = '';
  yearSel.innerHTML = '';
  // Month names
  const monthNames = ["All Months","January","February","March","April","May","June","July","August","September","October","November","December"];
  monthNames.forEach((m,i) => {
    const opt = document.createElement('option');
    opt.value = i===0 ? "all" : i;
    opt.textContent = m;
    monthSel.appendChild(opt);
  });
  // Years from transactions
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
  // Set default
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
  // Filter by month/year
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
    const catIncome = transactions.filter(tx => tx.category === cat && tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
    const catExpense = transactions.filter(tx => tx.category === cat && tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
    const net = catIncome - catExpense;
    const card = document.createElement("div");
    card.className = "col-12 col-md-6 category-card";
    card.innerHTML = `
      <strong>${cat}</strong>
      <div class="row">
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
  // Income vs Expense Pie
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

  // Category Breakdown Bar
  const catLabels = categories;
  const catIncome = categories.map(cat => transactions.filter(tx => tx.category === cat && tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0));
  const catExpense = categories.map(cat => transactions.filter(tx => tx.category === cat && tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0));
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
    if (Array.isArray(cats) && cats.length > 0) return cats;
    return ["Salary", "Food", "Shopping", "Utilities"];
  } catch {
    return ["Salary", "Food", "Shopping", "Utilities"];
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

// Initial UI update
updateUI();

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/Wealth-Command/service-worker.js')
      .then(registration => {
        console.log('SW registered successfully: ', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('New service worker found...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New content available; please refresh.');
              // You could show an "Update available" toast here
            }
          });
        });
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
