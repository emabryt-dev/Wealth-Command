// Default categories (replace names and budgets as needed)
const defaultCategories = [
  "Food",
  "Transport",
  "Entertainment",
  "Bills",
  "Other"
];

// App state
let transactions = JSON.parse(localStorage.getItem('financeTransactions')) || [];
let categories = JSON.parse(localStorage.getItem('categories')) ||
  defaultCategories.map(name => ({ name, budget: 10000 }));
let currentMonth = new Date().toLocaleString('default', {
  month: 'long',
  year: 'numeric'
});
let currentTransactionType = '';

// Utility functions
function formatCurrency(amount) {
  return 'Rs ' + parseInt(amount).toLocaleString('en-PK');
}

function parseCurrency(amountStr) {
  return parseInt(amountStr.replace(/[^0-9]/g, '')) || 0;
}

function formatAmount(input) {
  let value = input.value.replace(/[^0-9]/g, '');
  if (value) value = parseInt(value).toLocaleString('en-PK');
  input.value = value;
}

// Navigation
function switchTab(tabName) {
  document.querySelectorAll('.nav-button')
    .forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.nav-button:nth-child(${getTabIndex(tabName)})`)
    .classList.add('active');

  document.querySelectorAll('.tab-content')
    .forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');

  if (tabName === 'dashboard') refreshDashboard();
  else if (tabName === 'transactions') renderTransactionsList();
  else if (tabName === 'analytics') refreshAnalytics();
  else if (tabName === 'settings') renderSettings();
}

function getTabIndex(tabName) {
  const tabs = ['dashboard', 'transactions', 'analytics', 'settings'];
  return tabs.indexOf(tabName) + 1;
}

// Dashboard functions
function refreshDashboard() {
  populateMonthSelect();
  updateSummaryCards();
  renderRecentTransactions();
  renderCategorySummary();
  updateHeaderBalance();
}

function populateMonthSelect() {
  const select = document.getElementById('monthSelect');
  select.innerHTML = '';

  const months = [...new Set(transactions.map(t =>
    new Date(t.date).toLocaleString('default', {
      month: 'long',
      year: 'numeric'
    })
  ))].sort((a, b) => new Date('1 ' + a) - new Date('1 ' + b));

  months.forEach(month => {
    const option = document.createElement('option');
    option.value = month;
    option.textContent = month;
    select.appendChild(option);
  });

  if (months.length > 0) {
    select.value = currentMonth;
    document.getElementById('currentMonthDisplay').textContent = currentMonth;
  }

  select.onchange = e => {
    currentMonth = e.target.value;
    document.getElementById('currentMonthDisplay').textContent = currentMonth;
    refreshDashboard();
  };
}

function updateSummaryCards() {
  const monthTransactions = transactions.filter(t =>
    new Date(t.date).toLocaleString('default', {
      month: 'long',
      year: 'numeric'
    }) === currentMonth
  );

  const income = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseCurrency(t.amount), 0);

  const expenses = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseCurrency(t.amount), 0);

  const savings = income - expenses;

  document.getElementById('totalIncome').textContent = formatCurrency(income);
  document.getElementById('totalExpenses').textContent = formatCurrency(expenses);
  document.getElementById('netAmount').textContent = formatCurrency(savings);
}

function updateHeaderBalance() {
  const incEl = document.getElementById('totalIncome');
  const expEl = document.getElementById('totalExpenses');
  const netEl = document.getElementById('netAmount');

  if (!incEl || !expEl || !netEl) {
    console.warn(
      'updateHeaderBalance: missing element(s)',
      'incEl:', incEl,
      'expEl:', expEl,
      'netEl:', netEl
    );
    return;
  }

  incEl.textContent = formatCurrency(totalIncome);
  expEl.textContent = formatCurrency(totalExpenses);
  netEl.textContent = formatCurrency(netAmount);
}


function renderRecentTransactions() {
  const container = document.getElementById('recentTransactionsList');
  container.innerHTML = '';

  const recent = transactions
    .filter(t =>
      new Date(t.date).toLocaleString('default', {
        month: 'long',
        year: 'numeric'
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
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <div class="font-medium">${transaction.description}</div>
          <div class="text-sm text-gray-500">${transaction.category}</div>
        </div>
        <div class="text-right">
          <div class="font-semibold ${
            transaction.type === 'income'
              ? 'text-green-600'
              : 'text-red-600'
          }">
            ${formatCurrency(parseCurrency(transaction.amount))}
          </div>
          <div class="text-xs text-gray-500">${new Date(
            transaction.date
          ).toLocaleDateString()}</div>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

function renderCategorySummary() {
  const container = document.getElementById('categorySummary');
  container.innerHTML = '';

  const monthTransactions = transactions.filter(
    t =>
      new Date(t.date).toLocaleString('default', {
        month: 'long',
        year: 'numeric'
      }) === currentMonth && t.type === 'expense'
  );

  const categoryTotals = {};
  monthTransactions.forEach(t => {
    categoryTotals[t.category] =
      (categoryTotals[t.category] || 0) + parseCurrency(t.amount);
  });

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (!topCategories.length) {
    container.innerHTML =
      '<div class="text-center text-gray-500 py-4">No expense data</div>';
    return;
  }

  topCategories.forEach(([category, amount]) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="font-medium">${category}</span>
        <span class="text-red-600">${formatCurrency(amount)}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

// Transactions list
function renderTransactionsList() {
  const container = document.getElementById('transactionsList');
  container.innerHTML = '';

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  const searchTerm = document
    .getElementById('searchTransactions')
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
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <div class="font-medium">${transaction.description}</div>
          <div class="text-sm text-gray-500">
            ${transaction.category} • ${new Date(
      transaction.date
    ).toLocaleDateString()}
          </div>
        </div>
        <div class="text-right">
          <div class="font-semibold ${
            transaction.type === 'income'
              ? 'text-green-600'
              : 'text-red-600'
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
  .getElementById('searchTransactions')
  .addEventListener('input', renderTransactionsList);

// Analytics
function refreshAnalytics() {
  updateAnalyticsSummary();
  renderMonthlyBreakdown();
}

function updateAnalyticsSummary() {
  const range = parseInt(document.getElementById('analyticsRange').value);
  const monthlyData = getMonthlyData(range);

  const avgIncome =
    monthlyData.income.length > 0
      ? monthlyData.income.reduce((a, b) => a + b, 0) /
        monthlyData.income.length
      : 0;
  const avgExpenses =
    monthlyData.expenses.length > 0
      ? monthlyData.expenses.reduce((a, b) => a + b, 0) /
        monthlyData.expenses.length
      : 0;
  const avgSavings =
    monthlyData.savings.length > 0
      ? monthlyData.savings.reduce((a, b) => a + b, 0) /
        monthlyData.savings.length
      : 0;

  document.getElementById('avgIncome').textContent = formatCurrency(avgIncome);
  document.getElementById('avgExpenses').textContent = formatCurrency(
    avgExpenses
  );
  document.getElementById('avgSavings').textContent = formatCurrency(
    avgSavings
  );
}

function renderMonthlyBreakdown() {
  const container = document.getElementById('monthlyBreakdown');
  container.innerHTML = '';

  const range = parseInt(document.getElementById('analyticsRange').value);
  const monthlyData = getMonthlyData(range);

  monthlyData.labels.forEach((month, index) => {
    const income = monthlyData.income[index];
    const expenses = monthlyData.expenses[index];
    const savings = monthlyData.savings[index];

    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="font-medium mb-2">${month}</div>
      <div class="grid grid-cols-3 gap-2 text-sm">
        <div class="text-green-600">${formatCurrency(income)}</div>
        <div class="text-red-600">${formatCurrency(expenses)}</div>
        <div class="text-blue-600">${formatCurrency(savings)}</div>
        <div class="text-gray-500">Income</div>
        <div class="text-gray-500">Expenses</div>
        <div class="text-gray-500">Savings</div>
      </div>
    `;
    container.appendChild(div);
  });
}

function getMonthlyData(monthCount) {
  const allMonths = [...new Set(transactions.map(t =>
    new Date(t.date).toLocaleString('default', {
      month: 'short',
      year: 'numeric'
    })
  ))].sort((a, b) => new Date('1 ' + a) - new Date('1 ' + b));

  const recentMonths =
    monthCount === 'all' ? allMonths : allMonths.slice(-monthCount);

  const income = recentMonths.map(month =>
    transactions
      .filter(
        t =>
          new Date(t.date).toLocaleString('default', {
            month: 'short',
            year: 'numeric'
          }) === month && t.type === 'income'
      )
      .reduce((sum, t) => sum + parseCurrency(t.amount), 0)
  );

  const expenses = recentMonths.map(month =>
    transactions
      .filter(
        t =>
          new Date(t.date).toLocaleString('default', {
            month: 'short',
            year: 'numeric'
          }) === month && t.type === 'expense'
      )
      .reduce((sum, t) => sum + parseCurrency(t.amount), 0)
  );

  const savings = income.map((inc, i) => inc - expenses[i]);

  return { labels: recentMonths, income, expenses, savings };
}

// Settings
function renderSettings() {
  renderCategoriesList();
}

function renderCategoriesList() {
  const container = document.getElementById('categoriesList');
  container.innerHTML = '';

  categories.forEach((category, index) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <div class="font-medium">${category.name}</div>
          <div class="text-sm text-gray-500">
            Budget: ${formatCurrency(category.budget)}
          </div>
        </div>
        <div class="flex space-x-2">
          <button onclick="editCategory(${index})" class="touch-button text-blue-500">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="deleteCategory(${index})" class="touch-button text-red-500">
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
  document.getElementById('transactionModal').classList.remove('hidden');
  document.getElementById('transDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('transAmount').value = '';
  currentTransactionType = '';
  updateTransactionTypeButtons();
}

function closeModal() {
  document.getElementById('transactionModal').classList.add('hidden');
}

function setTransactionType(type) {
  currentTransactionType = type;
  updateTransactionTypeButtons();
  updateCategoryDropdown();
}

function updateTransactionTypeButtons() {
  document.querySelectorAll('.income-type, .expense-type')
    .forEach(btn => {
      btn.classList.remove('bg-green-500', 'bg-red-500', 'text-white');
      btn.classList.add('border');
    });

  if (currentTransactionType === 'income') {
    document.querySelector('.income-type').classList.add('bg-green-500', 'text-white');
    document.querySelector('.income-type').classList.remove('border');
  } else if (currentTransactionType === 'expense') {
    document.querySelector('.expense-type').classList.add('bg-red-500', 'text-white');
    document.querySelector('.expense-type').classList.remove('border');
  }
}

function updateCategoryDropdown() {
  const select = document.getElementById('transCategory');
  select.innerHTML = '';
  select.disabled = !currentTransactionType;

  if (currentTransactionType) {
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.name;
      option.textContent = category.name;
      select.appendChild(option);
    });
  } else {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Select a type first';
    select.appendChild(option);
  }
}

function saveTransaction() {
  const transaction = {
    id: Date.now().toString(),
    date: document.getElementById('transDate').value,
    description: document.getElementById('transDesc').value,
    type: currentTransactionType,
    category: document.getElementById('transCategory').value,
    amount: document.getElementById('transAmount').value
  };

  if (
    !transaction.date ||
    !transaction.description ||
    !transaction.type ||
    !transaction.category ||
    !transaction.amount ||
    parseCurrency(transaction.amount) <= 0
  ) {
    alert('Please fill all fields correctly');
    return;
  }
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
  defaultCategories.map((name) => ({ name, budget: 10000 }));
let currentMonth = new Date().toLocaleString("default", {
  month: "long",
  year: "numeric",
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
  document.querySelectorAll(".nav-button").forEach((btn) =>
    btn.classList.remove("active")
  );
  document
    .querySelector(`.nav-button:nth-child(${getTabIndex(tabName)})`)
    .classList.add("active");

  document.querySelectorAll(".tab-content").forEach((tab) =>
    tab.classList.remove("active")
  );
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

// Dashboard functions
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
    transactions.map((t) =>
      new Date(t.date).toLocaleString("default", {
        month: "long",
        year: "numeric",
      })
    )
  )].sort(
    (a, b) => new Date("1 " + a) - new Date("1 " + b)
  );

  months.forEach((month) => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    select.appendChild(option);
  });

  if (months.length > 0) {
    select.value = currentMonth;
  }

  select.onchange = (e) => {
    currentMonth = e.target.value;
    refreshDashboard();
  };
}

function updateSummaryCards() {
  const monthTransactions = transactions.filter(
    (t) =>
      new Date(t.date).toLocaleString("default", {
        month: "long",
        year: "numeric",
      }) === currentMonth
  );

  const income = monthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + parseCurrency(t.amount), 0);

  const expenses = monthTransactions
    .filter((t) => t.type === "expense")
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
    .filter(
      (t) =>
        new Date(t.date).toLocaleString("default", {
          month: "long",
          year: "numeric",
        }) === currentMonth
    )
    .slice(-5)
    .reverse();

  if (!recent.length) {
    container.innerHTML =
      '<div class="text-center text-gray-500 py-4">No transactions this month</div>';
    return;
  }

  recent.forEach((transaction) => {
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
          <div class="text-xs text-gray-500">${new Date(
            transaction.date
          ).toLocaleDateString()}</div>
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
    (t) =>
      new Date(t.date).toLocaleString("default", {
        month: "long",
        year: "numeric",
      }) === currentMonth && t.type === "expense"
  );

  const categoryTotals = {};
  monthTransactions.forEach((t) => {
    categoryTotals[t.category] =
      (categoryTotals[t.category] || 0) + parseCurrency(t.amount);
  });

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (!topCategories.length) {
    container.innerHTML =
      '<div class="text-center text-gray-500 py-4">No expense data</div>';
    return;
  }

  topCategories.forEach(([category, amount]) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="font-medium">${category}</span>
        <span class="text-red-600">${formatCurrency(amount)}</span>
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
    (t) =>
      t.description.toLowerCase().includes(searchTerm) ||
      t.category.toLowerCase().includes(searchTerm)
  );

  if (!filtered.length) {
    container.innerHTML =
      '<div class="text-center text-gray-500 py-8">No transactions found</div>';
    return;
  }

  filtered.forEach((transaction) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <div class="font-medium">${transaction.description}</div>
          <div class="text-sm text-gray-500">
            ${transaction.category} • ${new Date(
      transaction.date
    ).toLocaleDateString()}
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
  const monthlyData = getMonthlyData(range);

  const avgIncome =
    monthlyData.income.length > 0
      ? monthlyData.income.reduce((a, b) => a + b, 0) /
        monthlyData.income.length
      : 0;
  const avgExpenses =
    monthlyData.expenses.length > 0
      ? monthlyData.expenses.reduce((a, b) => a + b, 0) /
        monthlyData.expenses.length
      : 0;
  const avgSavings =
    monthlyData.savings.length > 0
      ? monthlyData.savings.reduce((a, b) => a + b, 0) /
        monthlyData.savings.length
      : 0;

  document.getElementById("avgIncome").textContent =
    formatCurrency(avgIncome);
  document.getElementById("avgExpenses").textContent =
    formatCurrency(avgExpenses);
  document.getElementById("avgSavings").textContent =
    formatCurrency(avgSavings);
}

function renderMonthlyBreakdown() {
  const container = document.getElementById("monthlyBreakdown");
  container.innerHTML = "";

  const range = parseInt(
    document.getElementById("analyticsRange").value
  );
  const monthlyData = getMonthlyData(range);

  monthlyData.labels.forEach((month, index) => {
    const income = monthlyData.income[index];
    const expenses = monthlyData.expenses[index];
    const savings = monthlyData.savings[index];

    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div class="font-medium mb-2">${month}</div>
      <div class="grid grid-cols-3 gap-2 text-sm">
        <div class="text-green-600">${formatCurrency(income)}</div>
        <div class="text-red-600">${formatCurrency(expenses)}</div>
        <div class="text-blue-600">${formatCurrency(savings)}</div>
        <div class="text-gray-500">Income</div>
        <div class="text-gray-500">Expenses</div>
        <div class="text-gray-500">Savings</div>
      </div>
    `;
    container.appendChild(div);
  });
}

function getMonthlyData(monthCount) {
  const allMonths = [...new Set(
    transactions.map((t) =>
      new Date(t.date).toLocaleString("default", {
        month: "short",
        year: "numeric",
      })
    )
  )].sort(
    (a, b) => new Date("1 " + a) - new Date("1 " + b)
  );

  const recentMonths =
    monthCount === "all" ? allMonths : allMonths.slice(-monthCount);

  const income = recentMonths.map((month) =>
    transactions
      .filter(
        (t) =>
          new Date(t.date).toLocaleString("default", {
            month: "short",
            year: "numeric",
          }) === month && t.type === "income"
      )
      .reduce((sum, t) => sum + parseCurrency(t.amount), 0)
  );

  const expenses = recentMonths.map((month) =>
    transactions
      .filter(
        (t) =>
          new Date(t.date).toLocaleString("default", {
            month: "short",
            year: "numeric",
          }) === month && t.type === "expense"
      )
      .reduce((sum, t) => sum + parseCurrency(t.amount), 0)
  );

  const savings = income.map((inc, i) => inc - expenses[i]);

  return { labels: recentMonths, income, expenses, savings };
}

// Settings
function renderSettings() {
  renderCategoriesList();
}

function renderCategoriesList() {
  const container = document.getElementById("categoriesList");
  container.innerHTML = "";

  categories.forEach((category, index) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <div class="font-medium">${category.name}</div>
          <div class="text-sm text-gray-500">
            Budget: ${formatCurrency(category.budget)}
          </div>
        </div>
        <div class="flex space-x-2">
          <button onclick="editCategory(${index})" class="touch-button text-blue-500">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="deleteCategory(${index})" class="touch-button text-red-500">
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
  document.querySelectorAll(".income-type, .expense-type").forEach((btn) => {
    btn.classList.remove("bg-green-500", "bg-red-500", "text-white");
    btn.classList.add("border");
  });

  if (currentTransactionType === "income") {
    document
      .querySelector(".income-type")
      .classList.add("bg-green-500", "text-white");
    document.querySelector(".income-type").classList.remove("border");
  } else if (currentTransactionType === "expense") {
    document
      .querySelector(".expense-type")
      .classList.add("bg-red-500", "text-white");
    document.querySelector(".expense-type").classList.remove("border");
  }
}

function updateCategoryDropdown() {
  const select = document.getElementById("transCategory");
  select.innerHTML = "";
  select.disabled = !currentTransactionType;

  if (currentTransactionType) {
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.name;
      option.textContent = category.name;
      select.appendChild(option);
    });
  } else {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Select a type first";
    select.appendChild(option);
  }
}

function saveTransaction() {
  const transaction = {
    id: Date.now().toString(),
    date: document.getElementById("transDate").value,
    description: document.getElementById("transDesc").value,
    type: currentTransactionType,
    category: document.getElementById("transCategory").value,
    amount: document.getElementById("transAmount").value,
  };

  if (
    !transaction.date ||
    !transaction.description ||
    !transaction.type ||
    !transaction.category ||
    !transaction.amount ||
    parseCurrency(transaction.amount) <= 0
  ) {
    alert("Please fill all fields correctly");
    return;
  }

  transactions.push(transaction);
  localStorage.setItem(
    "financeTransactions",
    JSON.stringify(transactions)
  );

  closeModal();
  refreshDashboard();
  if (
    document.getElementById("transactions").classList.contains("active")
  ) {
    renderTransactionsList();
  }
}

function deleteTransaction(id) {
  if (confirm("Delete this transaction?")) {
    transactions = transactions.filter((t) => t.id !== id);
    localStorage.setItem(
      "financeTransactions",
      JSON.stringify(transactions)
    );
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

  if (
    categories.find((c) => c.name.toLowerCase() === name.toLowerCase())
  ) {
    alert("Category already exists");
    return;
  }

  categories.push({ name, budget: budget || 0 });
  localStorage.setItem("categories", JSON.stringify(categories));

  closeCategoryModal();
  renderSettings();
}

function editCategory(index) {
  const newName = prompt(
    "Edit category name:",
    categories[index].name
  );
  if (newName && newName.trim()) {
    const newBudget = prompt(
      "Edit budget:",
      categories[index].budget
    );
    categories[index].name = newName.trim();
    categories[index].budget =
      parseCurrency(newBudget) || categories[index].budget;
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
      transactions.map((t) =>
        `"${t.date}","${t.description}","${t.type}","${t.category}","${t.amount}"`
      )
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wealth-command-${new Date()
    .toISOString()
    .split("T")[0]}.csv`;
  a.click();
}

function backupData() {
  const backup = {
    transactions,
    categories,
    exportDate: new Date().toISOString(),
  };

  const dataStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wealth-command-backup-${new Date()
    .toISOString()
    .split("T")[0]}.json`;
  a.click();
}

function resetAllData() {
  if (confirm("This will delete ALL your data. Continue?")) {
    localStorage.removeItem("financeTransactions");
    localStorage.removeItem("categories");
    transactions = [];
    categories = defaultCategories.map((name) => ({
      name,
      budget: 10000,
    }));
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

document.addEventListener("DOMContentLoaded", initApp);
