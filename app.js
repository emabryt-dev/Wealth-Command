// Default categories (replace names and budgets as needed)
const defaultCategories = [
  "Food",
  "Transport",
  "Entertainment",
  "Bills",
  "Other"
];

// App state
let transactions =
  JSON.parse(localStorage.getItem("financeTransactions")) || [];
let categories =
  JSON.parse(localStorage.getItem("categories")) ||
  defaultCategories.map(name => ({ name, budget: 10000 }));
let currentMonth = new Date().toLocaleString("default", {
  month: "long",
  year: "numeric"
});
let currentTransactionType = "";

// Utility functions
function formatCurrency(amount) {
  return "Rs " + parseInt(amount).toLocaleString("en-PK");
}
function parseCurrency(amountStr) {
  return parseInt(amountStr.replace(/[^0-9]/g, "")) || 0;
}
function formatAmount(input) {
  let value = input.value.replace(/[^0-9]/g, "");
  if (value) value = parseInt(value).toLocaleString("en-PK");
  input.value = value;
}

// Navigation
function switchTab(tabName) {
  console.log("switchTab()", tabName);
  document.querySelectorAll(".nav-button")
    .forEach(btn => btn.classList.remove("active"));
  document
    .querySelector(`.nav-button:nth-child(${getTabIndex(tabName)})`)
    .classList.add("active");

  document.querySelectorAll(".tab-content")
    .forEach(tab => tab.classList.remove("active"));
  document.getElementById(tabName).classList.add("active");

  if (tabName === "dashboard") refreshDashboard();
  else if (tabName === "transactions") renderTransactionsList();
  else if (tabName === "analytics") refreshAnalytics();
  else if (tabName === "settings") renderSettings();
}
function getTabIndex(tabName) {
  const tabs = ["dashboard", "transactions", "analytics", "settings"];
  return tabs.indexOf(tabName) + 1;
}

// Dashboard
function refreshDashboard() {
  populateMonthSelect();
  updateSummaryCards();
  renderRecentTransactions();
  renderCategorySummary();
}
function populateMonthSelect() {
  const select = document.getElementById("monthSelect");
  select.innerHTML = "";

  const months = [...new Set(
    transactions.map(t =>
      new Date(t.date).toLocaleString("default", {
        month: "long",
        year: "numeric"
      })
    )
  )].sort((a, b) => new Date("1 " + a) - new Date("1 " + b));

  months.forEach(month => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    select.appendChild(option);
  });

  if (months.length) select.value = currentMonth;
  select.onchange = e => {
    currentMonth = e.target.value;
    refreshDashboard();
  };
}
function updateSummaryCards() {
  const monthTransactions = transactions.filter(t =>
    new Date(t.date).toLocaleString("default", {
      month: "long",
      year: "numeric"
    }) === currentMonth
  );

  const income = monthTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + parseCurrency(t.amount), 0);
  const expenses = monthTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + parseCurrency(t.amount), 0);
  const savings = income - expenses;

  document.getElementById("totalIncome").textContent =
    formatCurrency(income);
  document.getElementById("totalExpenses").textContent =
    formatCurrency(expenses);
  document.getElementById("netAmount").textContent =
    formatCurrency(savings);
}
function renderRecentTransactions() {
  const container = document.getElementById("recentTransactionsList");
  container.innerHTML = "";

  const recent = transactions
    .filter(t =>
      new Date(t.date).toLocaleString("default", {
        month: "long",
        year: "numeric"
      }) === currentMonth
    )
    .slice(-5)
    .reverse();

  if (!recent.length) {
    container.innerHTML =
      '<div class="text-center text-gray-500 py-4">No transactions this month</div>';
    return;
  }

  recent.forEach(transaction => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <div class="font-medium">${transaction.description}</div>
          <div class="text-sm text-gray-500">${transaction.category}</div>
        </div>
        <div class="text-right">
          <div class="font-semibold ${
            transaction.type === "income" ? "text-green-600" : "text-red-600"
          }">
            ${formatCurrency(parseCurrency(transaction.amount))}
          </div>
          <div class="text-xs text-gray-500">${
            new Date(transaction.date).toLocaleDateString()
          }</div>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}
function renderCategorySummary() {
  const container = document.getElementById("categorySummary");
  container.innerHTML = "";

  const monthTransactions = transactions.filter(
    t =>
      new Date(t.date).toLocaleString("default", {
        month: "long",
        year: "numeric"
      }) === currentMonth && t.type === "expense"
  );

  const totals = {};
  monthTransactions.forEach(t => {
    totals[t.category] =
      (totals[t.category] || 0) + parseCurrency(t.amount);
  });

  const top = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (!top.length) {
    container.innerHTML =
      '<div class="text-center text-gray-500 py-4">No expense data</div>';
    return;
  }

  top.forEach(([cat, amt]) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="font-medium">${cat}</span>
        <span class="text-red-600">${formatCurrency(amt)}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

// Transactions list
function renderTransactionsList() {
  const container = document.getElementById("transactionsList");
  container.innerHTML = "";

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  const searchTerm = document
    .getElementById("searchTransactions")
    .value.toLowerCase();

  const filtered = sorted.filter(
    t =>
      t.description.toLowerCase().includes(searchTerm) ||
      t.category.toLowerCase().includes(searchTerm)
  );

  if (!filtered.length) {
    container.innerHTML =
      '<div class="text-center text-gray-500 py-8">No transactions found</div>';
    return;
  }

  filtered.forEach(transaction => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <div class="font-medium">${transaction.description}</div>
          <div class="text-sm text-gray-500">
            ${transaction.category} • ${
      new Date(transaction.date).toLocaleDateString()
    }
          </div>
        </div>
        <div class="text-right">
          <div class="font-semibold ${
            transaction.type === "income" ? "text-green-600" : "text-red-600"
          }">
            ${formatCurrency(parseCurrency(transaction.amount))}
          </div>
          <button onclick="deleteTransaction('${
            transaction.id
          }')" class="touch-button text-red-500 mt-1">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}
document
  .getElementById("searchTransactions")
  .addEventListener("input", renderTransactionsList);

// Analytics
function refreshAnalytics() {
  updateAnalyticsSummary();
  renderMonthlyBreakdown();
}
function updateAnalyticsSummary() {
  const range = parseInt(
    document.getElementById("analyticsRange").value
  );
  const data = getMonthlyData(range);

  const avg = arr =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  document.getElementById("avgIncome").textContent =
    formatCurrency(avg(data.income));
  document.getElementById("avgExpenses").textContent =
    formatCurrency(avg(data.expenses));
  document.getElementById("avgSavings").textContent =
    formatCurrency(avg(data.savings));
}
function renderMonthlyBreakdown() {
  const container = document.getElementById("monthlyBreakdown");
  container.innerHTML = "";

  const range = parseInt(
    document.getElementById("analyticsRange").value
  );
  const data = getMonthlyData(range);

  data.labels.forEach((month, i) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div class="font-medium mb-2">${month}</div>
      <div class="grid grid-cols-3 gap-2 text-sm">
        <div class="text-green-600">${formatCurrency(data.income[i])}</div>
        <div class="text-red-600">${formatCurrency(data.expenses[i])}</div>
        <div class="text-blue-600">${formatCurrency(data.savings[i])}</div>
        <div class="text-gray-500">Income</div>
        <div class="text-gray-500">Expenses</div>
        <div class="text-gray-500">Savings</div>
      </div>
    `;
    container.appendChild(div);
  });
}
function getMonthlyData(monthCount) {
  const all = [...new Set(
    transactions.map(t =>
      new Date(t.date).toLocaleString("default", {
        month: "short",
        year: "numeric"
      })
    )
  )].sort((a, b) => new Date("1 " + a) - new Date("1 " + b));

  const labels =
    monthCount === "all" ? all : all.slice(-monthCount);

  const build = type =>
    labels.map(m =>
      transactions
        .filter(
          t =>
            new Date(t.date).toLocaleString("default", {
              month: "short", year: "numeric"
            }) === m && t.type === type
        )
        .reduce((s, t) => s + parseCurrency(t.amount), 0)
    );

  return {
    labels,
    income: build("income"),
    expenses: build("expense"),
    savings: build("income").map((inc, i) => inc - build("expense")[i])
  };
}

// Settings
function renderSettings() {
  renderCategoriesList();
}
function renderCategoriesList() {
  const container = document.getElementById("categoriesList");
  container.innerHTML = "";
  categories.forEach((cat, idx) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <div class="font-medium">${cat.name}</div>
          <div class="text-sm text-gray-500">
            Budget: ${formatCurrency(cat.budget)}
          </div>
        </div>
        <div class="flex space-x-2">
          <button onclick="editCategory(${idx})" class="touch-button text-blue-500">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="deleteCategory(${idx})" class="touch-button text-red-500">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

// Modals & CRUD
function showTransactionModal() {
  document.getElementById("transactionModal").classList.remove("hidden");
  document.getElementById("transDate").value =
    new Date().toISOString().split("T")[0];
  document.getElementById("transAmount").value = "";
  currentTransactionType = "";
  updateTransactionTypeButtons();
}
function closeModal() {
  document.getElementById("transactionModal").classList.add("hidden");
}
function setTransactionType(type) {
  currentTransactionType = type;
  updateTransactionTypeButtons();
  updateCategoryDropdown();
}
function updateTransactionTypeButtons() {
  document.querySelectorAll(".income-type, .expense-type").forEach(btn => {
    btn.classList.remove("bg-green-500", "bg-red-500", "text-white");
    btn.classList.add("border");
  });
  if (currentTransactionType === "income") {
    document.querySelector(".income-type").classList.add("bg-green-500", "text-white");
    document.querySelector(".income-type").classList.remove("border");
  } else if (currentTransactionType === "expense") {
    document.querySelector(".expense-type").classList.add("bg-red-500", "text-white");
    document.querySelector(".expense-type").classList.remove("border");
  }
}
function updateCategoryDropdown() {
  const sel = document.getElementById("transCategory");
  sel.innerHTML = "";
  sel.disabled = !currentTransactionType;
  if (currentTransactionType) {
    categories.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
  } else {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Select a type first";
    sel.appendChild(opt);
  }
}
function saveTransaction() {
  const tx = {
    id: Date.now().toString(),
    date: document.getElementById("transDate").value,
    description: document.getElementById("transDesc").value,
    type: currentTransactionType,
    category: document.getElementById("transCategory").value,
    amount: document.getElementById("transAmount").value
  };
  if (
    !tx.date ||
    !tx.description ||
    !tx.type ||
    !tx.category ||
    !tx.amount ||
    parseCurrency(tx.amount) <= 0
  ) {
    alert("Please fill all fields correctly");
    return;
  }
  transactions.push(tx);
  localStorage.setItem("financeTransactions", JSON.stringify(transactions));
  closeModal();
  refreshDashboard();
  if (document.getElementById("transactions").classList.contains("active")) {
    renderTransactionsList();
  }
}
function deleteTransaction(id) {
  if (confirm("Delete this transaction?")) {
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem("financeTransactions", JSON.stringify(transactions));
    refreshDashboard();
    renderTransactionsList();
  }
}
function showAddCategoryModal() {
  document.getElementById("addCategoryModal").classList.remove("hidden");
  document.getElementById("newCategoryName").value = "";
  document.getElementById("newCategoryBudget").value = "";
}
function closeCategoryModal() {
  document.getElementById("addCategoryModal").classList.add("hidden");
}
function saveNewCategory() {
  const name = document.getElementById("newCategoryName").value.trim();
  const budget = parseCurrency(
    document.getElementById("newCategoryBudget").value
  );
  if (!name) {
    alert("Please enter a category name");
    return;
  }
  if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
    alert("Category already exists");
    return;
  }
  categories.push({ name, budget: budget || 0 });
  localStorage.setItem("categories", JSON.stringify(categories));
  closeCategoryModal();
  renderSettings();
}
function editCategory(index) {
  const nn = prompt("Edit category name:", categories[index].name);
  if (nn && nn.trim()) {
    const nb = prompt("Edit budget:", categories[index].budget);
    categories[index].name = nn.trim();
    categories[index].budget = parseCurrency(nb) || categories[index].budget;
    localStorage.setItem("categories", JSON.stringify(categories));
    renderSettings();
  }
}
function deleteCategory(index) {
  if (confirm("Delete this category?")) {
    categories.splice(index, 1);
    localStorage.setItem("categories", JSON.stringify(categories));
    renderSettings();
  }
}

// Export / Backup / Reset
function exportData() {
  const csv = ["Date,Description,Type,Category,Amount"]
    .concat(
      transactions.map(t =>
        `"${t.date}","${t.description}","${t.type}","${t.category}","${t.amount}"`
      )
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wealth-command-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
}
function backupData() {
  const backup = { transactions, categories, exportDate: new Date().toISOString() };
  const dataStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wealth-command-backup-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
}
function resetAllData() {
  if (confirm("This will delete ALL your data. Continue?")) {
    localStorage.removeItem("financeTransactions");
    localStorage.removeItem("categories");
    transactions = [];
    categories = defaultCategories.map(name => ({ name, budget: 10000 }));
    localStorage.setItem("categories", JSON.stringify(categories));
    refreshDashboard();
    renderSettings();
  }
}

// Initialize app
function initApp() {
  if (!localStorage.getItem("categories")) {
    localStorage.setItem("categories", JSON.stringify(categories));
  }
  refreshDashboard();
  switchTab("dashboard");
}

// Listen for DOM ready
document.addEventListener("DOMContentLoaded", initApp);

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./service-worker.js')
    .then(reg => console.log('✅ SW registered:', reg.scope))
    .catch(err => console.error('❌ SW registration failed:', err));
}
