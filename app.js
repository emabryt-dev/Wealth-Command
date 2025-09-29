// Enhanced Financial Planner Module
class FinancialPlanner {
    constructor() {
        this.salaryEntries = [];
        this.cashFlowData = [];
        this.forecastMonths = 12;
        this.startingBalance = 0;
        this.baseExpenses = 2000; // Default base expenses
        
        this.initializeEventListeners();
        this.calculateSalary();
        this.generateForecast();
    }

    initializeEventListeners() {
        // Salary calculator events
        document.getElementById('salaryType').addEventListener('change', () => this.calculateSalary());
        document.getElementById('baseSalary').addEventListener('input', () => this.calculateSalary());
        document.getElementById('hoursPerWeek').addEventListener('input', () => this.calculateSalary());
        document.getElementById('weeksPerYear').addEventListener('input', () => this.calculateSalary());
        document.getElementById('taxRate').addEventListener('input', () => this.calculateSalary());
        document.getElementById('addSalary').addEventListener('click', () => this.addSalaryToForecast());

        // Cash flow forecast events
        document.getElementById('forecastPeriod').addEventListener('change', (e) => {
            this.forecastMonths = parseInt(e.target.value);
            this.generateForecast();
        });
        document.getElementById('startingBalance').addEventListener('input', (e) => {
            this.startingBalance = parseFloat(e.target.value) || 0;
            this.generateForecast();
        });
        document.getElementById('updateForecast').addEventListener('click', () => this.generateForecast());
        document.getElementById('exportForecast').addEventListener('click', () => this.exportForecast());

        // Scenario controls
        document.getElementById('incomeAdjustment').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('incomeImpact').textContent = value + '%';
            document.getElementById('incomeImpact').className = 'scenario-impact ' + (value >= 0 ? 'positive' : 'negative');
            this.applyScenarioAdjustments();
        });
        document.getElementById('expenseAdjustment').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('expenseImpact').textContent = value + '%';
            document.getElementById('expenseImpact').className = 'scenario-impact ' + (value >= 0 ? 'positive' : 'negative');
            this.applyScenarioAdjustments();
        });
    }

    calculateSalary() {
        const salaryType = document.getElementById('salaryType').value;
        const baseSalary = parseFloat(document.getElementById('baseSalary').value) || 0;
        const hoursPerWeek = parseFloat(document.getElementById('hoursPerWeek').value) || 40;
        const weeksPerYear = parseFloat(document.getElementById('weeksPerYear').value) || 52;
        const taxRate = parseFloat(document.getElementById('taxRate').value) || 25;

        let annualGross, monthlyGross, hourlyRate;

        switch(salaryType) {
            case 'annual':
                annualGross = baseSalary;
                monthlyGross = baseSalary / 12;
                hourlyRate = baseSalary / (weeksPerYear * hoursPerWeek);
                break;
            case 'monthly':
                monthlyGross = baseSalary;
                annualGross = baseSalary * 12;
                hourlyRate = (baseSalary * 12) / (weeksPerYear * hoursPerWeek);
                break;
            case 'hourly':
                hourlyRate = baseSalary;
                annualGross = baseSalary * hoursPerWeek * weeksPerYear;
                monthlyGross = annualGross / 12;
                break;
        }

        const taxAmountAnnual = annualGross * (taxRate / 100);
        const annualNet = annualGross - taxAmountAnnual;
        const monthlyNet = annualNet / 12;
        const taxAmountMonthly = taxAmountAnnual / 12;

        // Update display
        document.getElementById('hourlyRate').textContent = '$' + hourlyRate.toFixed(2);
        document.getElementById('monthlyNet').textContent = '$' + monthlyNet.toFixed(2);
        document.getElementById('annualNet').textContent = '$' + annualNet.toFixed(2);
        document.getElementById('taxAmount').textContent = '$' + taxAmountMonthly.toFixed(2);

        return {
            hourlyRate,
            monthlyNet,
            annualNet,
            taxAmountMonthly
        };
    }

    addSalaryToForecast() {
        const salaryData = this.calculateSalary();
        const selectedMonth = document.getElementById('salaryMonth').value;
        const isRecurring = document.getElementById('recurringSalary').checked;

        if (selectedMonth === '') {
            alert('Please select a target month for this salary.');
            return;
        }

        const salaryEntry = {
            id: Date.now(),
            monthlyNet: salaryData.monthlyNet,
            targetMonth: parseInt(selectedMonth),
            isRecurring: isRecurring,
            addedDate: new Date().toISOString()
        };

        this.salaryEntries.push(salaryEntry);
        this.generateForecast();
        
        // Show success message
        this.showToast('Salary added to forecast successfully!', 'success');
        
        // Reset form
        document.getElementById('salaryMonth').value = '';
        document.getElementById('recurringSalary').checked = false;
    }

    generateForecast() {
        const tableBody = document.getElementById('cashFlowBody');
        tableBody.innerHTML = '';

        let runningBalance = this.startingBalance;
        const currentDate = new Date();
        const incomeAdjustment = parseInt(document.getElementById('incomeAdjustment').value) / 100;
        const expenseAdjustment = parseInt(document.getElementById('expenseAdjustment').value) / 100;

        this.cashFlowData = [];

        for (let i = 0; i < this.forecastMonths; i++) {
            const forecastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
            const monthName = forecastDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const monthIndex = forecastDate.getMonth();

            // Calculate salary income for this month
            let salaryIncome = 0;
            this.salaryEntries.forEach(entry => {
                if (entry.isRecurring || entry.targetMonth === monthIndex) {
                    salaryIncome += entry.monthlyNet;
                }
            });

            // Apply income adjustment
            salaryIncome *= (1 + incomeAdjustment);

            // Calculate other income (placeholder - could be enhanced)
            const otherIncome = 0;

            // Calculate expenses
            const expenses = this.baseExpenses * (1 + expenseAdjustment);

            const totalIncome = salaryIncome + otherIncome;
            const netFlow = totalIncome - expenses;
            runningBalance += netFlow;

            const monthData = {
                month: monthName,
                salaryIncome,
                otherIncome,
                totalIncome,
                expenses,
                netFlow,
                balance: runningBalance
            };

            this.cashFlowData.push(monthData);

            const row = document.createElement('tr');
            row.className = runningBalance >= 0 ? 'balance-positive' : 'balance-negative';
            
            row.innerHTML = `
                <td><strong>${monthName}</strong></td>
                <td class="editable-cell" data-field="salaryIncome" data-month="${i}">
                    $${salaryIncome.toFixed(2)}
                </td>
                <td class="editable-cell" data-field="otherIncome" data-month="${i}">
                    $${otherIncome.toFixed(2)}
                </td>
                <td>$${totalIncome.toFixed(2)}</td>
                <td class="editable-cell" data-field="expenses" data-month="${i}">
                    $${expenses.toFixed(2)}
                </td>
                <td class="${netFlow >= 0 ? 'cash-flow-positive' : 'cash-flow-negative'}">
                    $${netFlow.toFixed(2)}
                </td>
                <td class="${runningBalance >= 0 ? 'cash-flow-positive' : 'cash-flow-negative'}">
                    $${runningBalance.toFixed(2)}
                </td>
                <td>
                    <button class="btn-action-sm" onclick="financialPlanner.editMonth(${i})" title="Edit Month">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action-sm" onclick="financialPlanner.resetMonth(${i})" title="Reset to Default">
                        <i class="fas fa-undo"></i>
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        }

        this.addEditableCellListeners();
        this.updateForecastSummary();
    }

    addEditableCellListeners() {
        document.querySelectorAll('.editable-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                this.makeCellEditable(e.target);
            });
        });
    }

    makeCellEditable(cell) {
        const currentValue = parseFloat(cell.textContent.replace('$', '')) || 0;
        const field = cell.getAttribute('data-field');
        const monthIndex = parseInt(cell.getAttribute('data-month'));

        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.01';
        input.value = currentValue;
        input.className = 'form-control form-control-sm';

        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();

        const saveValue = () => {
            const newValue = parseFloat(input.value) || 0;
            cell.textContent = '$' + newValue.toFixed(2);
            
            // Update data model
            this.cashFlowData[monthIndex][field] = newValue;
            
            // Recalculate totals for this month
            this.recalculateMonth(monthIndex);
            
            // Regenerate forecast from this month forward
            this.regenerateForecastFrom(monthIndex);
        };

        input.addEventListener('blur', saveValue);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveValue();
            }
        });
    }

    recalculateMonth(monthIndex) {
        const data = this.cashFlowData[monthIndex];
        data.totalIncome = data.salaryIncome + data.otherIncome;
        data.netFlow = data.totalIncome - data.expenses;
    }

    regenerateForecastFrom(startMonth) {
        let runningBalance = startMonth === 0 ? this.startingBalance : this.cashFlowData[startMonth - 1].balance;

        for (let i = startMonth; i < this.forecastMonths; i++) {
            const data = this.cashFlowData[i];
            runningBalance += data.netFlow;
            data.balance = runningBalance;

            // Update table display
            const rows = document.getElementById('cashFlowBody').rows;
            if (rows[i]) {
                rows[i].cells[5].textContent = '$' + data.netFlow.toFixed(2);
                rows[i].cells[5].className = data.netFlow >= 0 ? 'cash-flow-positive' : 'cash-flow-negative';
                
                rows[i].cells[6].textContent = '$' + data.balance.toFixed(2);
                rows[i].cells[6].className = data.balance >= 0 ? 'cash-flow-positive' : 'cash-flow-negative';
                rows[i].className = data.balance >= 0 ? 'balance-positive' : 'balance-negative';
            }
        }

        this.updateForecastSummary();
    }

    editMonth(monthIndex) {
        // Implementation for bulk month editing
        const data = this.cashFlowData[monthIndex];
        const newSalary = prompt('Enter new salary income:', data.salaryIncome);
        const newOtherIncome = prompt('Enter new other income:', data.otherIncome);
        const newExpenses = prompt('Enter new expenses:', data.expenses);

        if (newSalary !== null) {
            data.salaryIncome = parseFloat(newSalary) || 0;
        }
        if (newOtherIncome !== null) {
            data.otherIncome = parseFloat(newOtherIncome) || 0;
        }
        if (newExpenses !== null) {
            data.expenses = parseFloat(newExpenses) || 0;
        }

        this.recalculateMonth(monthIndex);
        this.regenerateForecastFrom(monthIndex);
    }

    resetMonth(monthIndex) {
        // Reset month to calculated values
        const currentDate = new Date();
        const forecastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthIndex, 1);
        const monthIdx = forecastDate.getMonth();

        let salaryIncome = 0;
        this.salaryEntries.forEach(entry => {
            if (entry.isRecurring || entry.targetMonth === monthIdx) {
                salaryIncome += entry.monthlyNet;
            }
        });

        const incomeAdjustment = parseInt(document.getElementById('incomeAdjustment').value) / 100;
        const expenseAdjustment = parseInt(document.getElementById('expenseAdjustment').value) / 100;

        this.cashFlowData[monthIndex].salaryIncome = salaryIncome * (1 + incomeAdjustment);
        this.cashFlowData[monthIndex].otherIncome = 0;
        this.cashFlowData[monthIndex].expenses = this.baseExpenses * (1 + expenseAdjustment);

        this.recalculateMonth(monthIndex);
        this.regenerateForecastFrom(monthIndex);
    }

    applyScenarioAdjustments() {
        this.generateForecast();
    }

    updateForecastSummary() {
        if (this.cashFlowData.length === 0) return;

        const endBalance = this.cashFlowData[this.cashFlowData.length - 1].balance;
        const avgMonthly = this.cashFlowData.reduce((sum, month) => sum + month.netFlow, 0) / this.cashFlowData.length;

        document.getElementById('forecastEndBalance').textContent = '$' + endBalance.toFixed(2);
        document.getElementById('forecastAvgMonthly').textContent = '$' + avgMonthly.toFixed(2);

        // Update colors based on values
        document.getElementById('forecastEndBalance').className = 
            'fw-bold ' + (endBalance >= 0 ? 'text-success' : 'text-danger');
        document.getElementById('forecastAvgMonthly').className = 
            'fw-bold ' + (avgMonthly >= 0 ? 'text-info' : 'text-warning');
    }

    exportForecast() {
        let csvContent = "Month,Salary Income,Other Income,Total Income,Expenses,Net Flow,Balance\n";
        
        this.cashFlowData.forEach(month => {
            csvContent += `"${month.month}",${month.salaryIncome},${month.otherIncome},${month.totalIncome},${month.expenses},${month.netFlow},${month.balance}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `cash-flow-forecast-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    showToast(message, type = 'info') {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '9999';
        toast.style.minWidth = '300px';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }
}

// Initialize the application
let financialPlanner;

document.addEventListener('DOMContentLoaded', function() {
    financialPlanner = new FinancialPlanner();
    
    // Theme toggle functionality
    document.getElementById('themeToggle').addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        const icon = this.querySelector('i');
        if (document.body.classList.contains('dark-mode')) {
            icon.className = 'fas fa-sun';
            localStorage.setItem('theme', 'dark');
        } else {
            icon.className = 'fas fa-moon';
            localStorage.setItem('theme', 'light');
        }
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').querySelector('i').className = 'fas fa-sun';
    }

    // Tab navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Update active states
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show target tab
            document.querySelectorAll('.tab-page').forEach(tab => tab.classList.add('d-none'));
            document.getElementById(targetTab).classList.remove('d-none');
        });
    });

    // Set financial planner as active tab by default
    document.querySelector('[data-tab="tab-financial-planner"]').classList.add('active');
    document.getElementById('tab-financial-planner').classList.remove('d-none');
});
