// Wealth Command: Improved tracker with categories, types, and currency

let transactions = loadTransactions();
let categories = loadCategories();
let currency = loadCurrency() || "PKR";

// Page navigation logic
const tabs = ["dashboard", "transactions", "settings"];
function showTab(tab) {
  tabs.forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle("d-none", t !== tab);
    document.querySelector(`[data-tab='${t}']`).classList.toggle("active", t === tab);
  });
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

// Settings: Category management
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
  this.reset();
});

// Clear All Transactions
document.getElementById('clearTransactions').addEventListener('click', function() {
  if (confirm("Are you sure you want to clear all transactions?")) {
    transactions = [];
    saveTransactions(transactions);
    updateUI();
  }
});

// Remove Transaction
function removeTransaction(idx) {
  transactions.splice(idx, 1);
  saveTransactions(transactions);
  updateUI();
}

// Update UI: Dashboard & Transactions
function updateUI() {
  document.getElementById("currencyLabel").textContent = currency;

  // Dashboard: Net Wealth, Income, Expense
  const totalIncome = transactions.filter(tx => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = transactions.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
  document.getElementById("totalIncome").textContent = totalIncome.toLocaleString() + " " + currency;
  document.getElementById("totalExpense").textContent = totalExpense.toLocaleString() + " " + currency;
  document.getElementById("netWealth").textContent = (totalIncome - totalExpense).toLocaleString() + " " + currency;

  // Category breakdown
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
    // Default categories
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
