// Wealth Command: Simple transactions tracker

let transactions = loadTransactions();
updateUI();

// Add Transaction
document.getElementById('transactionForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const date = document.getElementById('dateInput').value;
  const desc = document.getElementById('descInput').value.trim();
  const amount = parseFloat(document.getElementById('amountInput').value);
  const alertBox = document.getElementById('formAlert');
  alertBox.classList.add('d-none');

  if (!date || !desc || isNaN(amount)) {
    alertBox.textContent = "Please fill out all fields correctly.";
    alertBox.classList.remove('d-none');
    return;
  }
  if (desc.length < 2) {
    alertBox.textContent = "Description must be at least 2 characters.";
    alertBox.classList.remove('d-none');
    return;
  }

  transactions.push({ date, desc, amount });
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

// Update UI
function updateUI() {
  // Update transactions table
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
        <td class="fw-bold ${tx.amount >= 0 ? 'text-success' : 'text-danger'}">${tx.amount >= 0 ? '+' : ''}${tx.amount.toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="removeTransaction(${transactions.length - 1 - idx})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  // Update total wealth
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  document.getElementById('totalWealth').textContent = '$' + total.toFixed(2);

  // Recent transaction
  if (transactions.length > 0) {
    const recent = transactions[transactions.length - 1];
    document.getElementById('recentTransaction').textContent =
      `${recent.date}: ${recent.desc} (${recent.amount >= 0 ? '+' : ''}${recent.amount.toFixed(2)})`;
  } else {
    document.getElementById('recentTransaction').textContent = 'None yet.';
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

// Dark Mode Toggle
document.getElementById('darkModeToggle').addEventListener('click', function() {
  document.body.classList.toggle('dark-mode');
  this.classList.toggle('active');
  // Optionally save mode in localStorage for persistence
  if (document.body.classList.contains('dark-mode')) {
    localStorage.setItem('theme', 'dark');
  } else {
    localStorage.setItem('theme', 'light');
  }
});
// Load theme preference
(function () {
  const theme = localStorage.getItem('theme');
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('darkModeToggle').classList.add('active');
  }
})();
