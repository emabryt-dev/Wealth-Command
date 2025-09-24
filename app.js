// Default categories and initial state
const defaultCategories = [/* …your category names… */];
let transactions = JSON.parse(localStorage.getItem('financeTransactions')) || [];
let categories = JSON.parse(localStorage.getItem('categories')) ||
    defaultCategories.map(name => ({ name, budget: 10000 }));
let currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
let currentTransactionType = '';

// Utility functions
function formatCurrency(amount) { /* … */ }
function parseCurrency(amountStr) { /* … */ }
function formatAmount(input) { /* … */ }

// Navigation
function switchTab(tabName) { /* … */ }
function getTabIndex(tabName) { /* … */ }

// Dashboard
function refreshDashboard() { /* … */ }
function populateMonthSelect() { /* … */ }
function updateSummaryCards() { /* … */ }
function updateHeaderBalance() { /* … */ }
function renderRecentTransactions() { /* … */ }
function renderCategorySummary() { /* … */ }

// Transactions
function renderTransactionsList() { /* … */ }
document.getElementById('searchTransactions').addEventListener('input', renderTransactionsList);

// Analytics
function refreshAnalytics() { /* … */ }
function updateAnalyticsSummary() { /* … */ }
function renderMonthlyBreakdown() { /* … */ }
function getMonthlyData(monthCount) { /* … */ }

// Settings
function renderSettings() { /* … */ }
function renderCategoriesList() { /* … */ }

// Modals & CRUD
function showTransactionModal() { /* … */ }
function closeModal() { /* … */ }
function setTransactionType(type) { /* … */ }
function updateTransactionTypeButtons() { /* … */ }
function updateCategoryDropdown() { /* … */ }
function saveTransaction() { /* … */ }
function deleteTransaction(id) { /* … */ }

function showAddCategoryModal() { /* … */ }
function closeCategoryModal() { /* … */ }
function saveNewCategory() { /* … */ }
function editCategory(index) { /* … */ }
function deleteCategory(index) { /* … */ }

// Export/Backup/Reset
function exportData() { /* … */ }
function backupData() { /* … */ }
function resetAllData() { /* … */ }

// App initialization
function initApp() {
  if (!localStorage.getItem('categories')) {
    localStorage.setItem('categories', JSON.stringify(categories));
  }
  refreshDashboard();
}
document.addEventListener('DOMContentLoaded', initApp);
