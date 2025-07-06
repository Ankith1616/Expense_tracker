// Global application state
let currentUser = null;
let transactions = [];
let budgets = [];
let goals = [];
let bills = [];
let settings = {
    currency: 'USD',
    emailNotifications: true,
    budgetAlerts: true,
    billReminders: true,
    theme: 'light'
};

// Categories for transactions
const categories = {
    income: ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other Income'],
    expense: ['Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities', 
              'Healthcare', 'Education', 'Travel', 'Insurance', 'Other Expense']
};

// Voice recognition variables
let voiceRecognition = null;
let voiceData = null;

// Chart instances - Global variables to track chart instances
let expenseChart = null;
let incomeExpenseChart = null;
let trendChart = null;

// Current report data for export
let currentReportData = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadDataFromStorage();
    setupEventListeners();
    updateCategoryOptions();
    updateDashboard();
    checkAuthentication();
    initializeCarousel();
    setupVoiceRecognition();
    applyTheme();
}

// Authentication
function checkAuthentication() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        currentUser = JSON.parse(user);
        showMainApp();
    } else {
        showLoginPage();
    }
}

function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('mainApp').classList.remove('active');
}

function showMainApp() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    updateDashboard();
}

// Event Listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    
    // Transaction form
    document.getElementById('transactionForm').addEventListener('submit', handleAddTransaction);
    document.getElementById('transactionType').addEventListener('change', updateCategoryOptions);
    document.getElementById('isRecurring').addEventListener('change', toggleRecurringOptions);
    
    // Budget form
    document.getElementById('budgetForm').addEventListener('submit', handleAddBudget);
    
    // Goal form
    document.getElementById('goalForm').addEventListener('submit', handleAddGoal);
    
    // Bill form
    document.getElementById('billForm').addEventListener('submit', handleAddBill);
    
    // Profile form
    document.getElementById('profileForm').addEventListener('submit', handleUpdateProfile);
    
    // Report period change
    document.getElementById('reportPeriod').addEventListener('change', function() {
        const customRange = document.getElementById('customDateRange');
        if (this.value === 'custom') {
            customRange.classList.remove('hidden');
        } else {
            customRange.classList.add('hidden');
        }
        
        // Show placeholder message when period changes from current month
        if (this.value !== 'month') {
            showReportPlaceholders();
        }
    });

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    document.getElementById('budgetStartDate').value = today;
    document.getElementById('billDueDate').value = today;
    document.getElementById('goalDeadline').value = today;
}

// Login handling
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Simple validation (in real app, this would be server-side)
    if (email && password.length >= 6) {
        currentUser = {
            email: email,
            name: email.split('@')[0],
            loginTime: new Date().toISOString()
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showMainApp();
        showError('loginError', '');
    } else {
        showError('loginError', 'Please enter a valid email and password (minimum 6 characters)');
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        currentUser = null;
        showLoginPage();
    }
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleButton = document.querySelector('.password-toggle');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleButton.textContent = '';
    }
}

// Page navigation
function showPage(pageId) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show selected page
    document.querySelectorAll('.container.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    // Load page-specific data
    if (pageId === 'history') {
        displayTransactionHistory();
    } else if (pageId === 'reports') {
        // Initialize reports page but don't auto-generate
        initializeReportsPage();
    } else if (pageId === 'budgets') {
        displayBudgets();
    } else if (pageId === 'goals') {
        displayGoals();
    } else if (pageId === 'bills') {
        displayBills();
    } else if (pageId === 'settings') {
        loadSettings();
    }
}

// Initialize reports page with auto-generated current month data
function initializeReportsPage() {
    // Clear any existing charts
    if (expenseChart) {
        expenseChart.destroy();
        expenseChart = null;
    }
    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
        incomeExpenseChart = null;
    }
    if (trendChart) {
        trendChart.destroy();
        trendChart = null;
    }
    
    // Reset report data
    currentReportData = null;
    
    // Set period to current month
    document.getElementById('reportPeriod').value = 'month';
    
    // Auto-generate report for current month
    generateCurrentMonthReport();
}

// Auto-generate report for current month only
function generateCurrentMonthReport() {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const reportTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
    });
    
    // Store current report data for export
    currentReportData = {
        period: 'month',
        startDate: startDate,
        endDate: endDate,
        transactions: reportTransactions
    };
    
    // Create chart containers
    ensureChartContainers();
    
    if (reportTransactions.length === 0) {
        // Show message if no transactions for current month
        const reportsContainer = document.querySelector('.reports-container');
        if (reportsContainer) {
            reportsContainer.innerHTML = `
                <div class="chart-container">
                    <h3>📊 Categories</h3>
                    <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: var(--text-secondary);">
                        <p>No transactions for this month yet</p>
                    </div>
                </div>
                <div class="chart-container">
                    <h3>💰 Income vs Expenses</h3>
                    <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: var(--text-secondary);">
                        <p>No transactions for this month yet</p>
                    </div>
                </div>
                <div class="chart-container">
                    <h3>📈 Monthly Trend</h3>
                    <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: var(--text-secondary);">
                        <p>No transactions for this month yet</p>
                    </div>
                </div>
            `;
        }
        return;
    }
    
    // Generate charts for current month
    generateExpenseChart(reportTransactions);
    generateIncomeExpenseChart(reportTransactions);
    generateTrendChart(reportTransactions);
    
    console.log(`Auto-generated current month report with ${reportTransactions.length} transactions`);
}

// Show placeholder messages when changing periods
function showReportPlaceholders() {
    // Clear any existing charts
    if (expenseChart) {
        expenseChart.destroy();
        expenseChart = null;
    }
    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
        incomeExpenseChart = null;
    }
    if (trendChart) {
        trendChart.destroy();
        trendChart = null;
    }
    
    // Reset report data
    currentReportData = null;
    
    // Show placeholder message
    const reportsContainer = document.querySelector('.reports-container');
    if (reportsContainer) {
        reportsContainer.innerHTML = `
            <div class="chart-container">
                <h3>📊 Categories</h3>
                <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: var(--text-secondary);">
                    <p>Click "Generate Report" to view charts</p>
                </div>
            </div>
            <div class="chart-container">
                <h3>💰 Income vs Expenses</h3>
                <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: var(--text-secondary);">
                    <p>Click "Generate Report" to view charts</p>
                </div>
            </div>
            <div class="chart-container">
                <h3>📈 Monthly Trend</h3>
                <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: var(--text-secondary);">
                    <p>Click "Generate Report" to view charts</p>
                </div>
            </div>
        `;
    }
}

// Transaction Management
function handleAddTransaction(e) {
    e.preventDefault();
    
    const transaction = {
        id: Date.now().toString(),
        type: document.getElementById('transactionType').value,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        date: document.getElementById('date').value,
        description: document.getElementById('description').value || '',
        paymentMethod: document.getElementById('paymentMethod').value,
        isRecurring: document.getElementById('isRecurring').checked,
        recurringFrequency: document.getElementById('recurringFrequency').value
    };
    
    if (validateTransaction(transaction)) {
        transactions.push(transaction);
        saveDataToStorage();
        updateDashboard();
        document.getElementById('transactionForm').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        showError('transactionError', '');
        
        // Process recurring transaction
        if (transaction.isRecurring) {
            processRecurringTransaction(transaction);
        }
        
        // Check budget alerts
        checkBudgetAlerts();
        
        alert('Transaction added successfully!');
    }
}

function validateTransaction(transaction) {
    if (!transaction.type) {
        showError('transactionError', 'Please select a transaction type');
        return false;
    }
    if (!transaction.amount || transaction.amount <= 0) {
        showError('transactionError', 'Please enter a valid amount');
        return false;
    }
    if (!transaction.category) {
        showError('transactionError', 'Please select a category');
        return false;
    }
    if (!transaction.date) {
        showError('transactionError', 'Please select a date');
        return false;
    }
    return true;
}

function processRecurringTransaction(transaction) {
    // This would normally set up recurring transactions
    // For demo purposes, we'll just store the recurring info
    console.log('Recurring transaction set up:', transaction);
}

function updateCategoryOptions() {
    const transactionType = document.getElementById('transactionType').value;
    const categorySelect = document.getElementById('category');
    const billCategorySelect = document.getElementById('billCategory');
    const budgetCategorySelect = document.getElementById('budgetCategory');
    const filterCategorySelect = document.getElementById('filterCategory');
    
    // Clear existing options
    [categorySelect, billCategorySelect, budgetCategorySelect, filterCategorySelect].forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">Select Category</option>';
        }
    });
    
    if (transactionType && categories[transactionType]) {
        categories[transactionType].forEach(category => {
            const option = new Option(category, category);
            categorySelect.appendChild(option);
        });
    }
    
    // Populate other category selects with all categories
    if (billCategorySelect || budgetCategorySelect || filterCategorySelect) {
        const allCategories = [...categories.income, ...categories.expense];
        allCategories.forEach(category => {
            if (billCategorySelect) {
                billCategorySelect.appendChild(new Option(category, category));
            }
            if (budgetCategorySelect) {
                budgetCategorySelect.appendChild(new Option(category, category));
            }
            if (filterCategorySelect) {
                filterCategorySelect.appendChild(new Option(category, category));
            }
        });
    }
}

function toggleRecurringOptions() {
    const isRecurring = document.getElementById('isRecurring').checked;
    const recurringOptions = document.getElementById('recurringOptions');
    
    if (isRecurring) {
        recurringOptions.classList.remove('hidden');
    } else {
        recurringOptions.classList.add('hidden');
    }
}

// Dashboard Updates
function updateDashboard() {
    calculateTotals();
    displayRecentTransactions();
    checkBudgetAlerts();
    checkBillReminders();
    updateSavingsProgress();
}

function calculateTotals() {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = totalIncome - totalExpense;
    
    document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('totalExpense').textContent = formatCurrency(totalExpense);
    document.getElementById('totalBalance').textContent = formatCurrency(balance);
}

function displayRecentTransactions() {
    const recentTransactions = transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    const container = document.getElementById('recentTransactions');
    
    if (recentTransactions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No transactions yet. Add your first transaction!</p>';
        return;
    }
    
    container.innerHTML = recentTransactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-details">
                <h4>${transaction.description || transaction.category}</h4>
                <div class="transaction-meta">
                    ${transaction.category} • ${formatDate(transaction.date)} • ${transaction.paymentMethod}
                </div>
            </div>
            <div class="transaction-amount ${transaction.type}">
                ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
            </div>
        </div>
    `).join('');
}

// Budget Management
function handleAddBudget(e) {
    e.preventDefault();
    
    const budget = {
        id: Date.now().toString(),
        category: document.getElementById('budgetCategory').value,
        amount: parseFloat(document.getElementById('budgetAmount').value),
        period: document.getElementById('budgetPeriod').value,
        startDate: document.getElementById('budgetStartDate').value,
        spent: 0
    };
    
    if (validateBudget(budget)) {
        budgets.push(budget);
        saveDataToStorage();
        displayBudgets();
        document.getElementById('budgetForm').reset();
        document.getElementById('budgetStartDate').value = new Date().toISOString().split('T')[0];
        showError('budgetError', '');
        alert('Budget created successfully!');
    }
}

function validateBudget(budget) {
    if (!budget.category) {
        showError('budgetError', 'Please select a category');
        return false;
    }
    if (!budget.amount || budget.amount <= 0) {
        showError('budgetError', 'Please enter a valid amount');
        return false;
    }
    
    // Check if budget already exists for this category and period
    const existingBudget = budgets.find(b => 
        b.category === budget.category && 
        b.period === budget.period
    );
    
    if (existingBudget) {
        showError('budgetError', 'Budget already exists for this category and period');
        return false;
    }
    
    return true;
}

function displayBudgets() {
    const container = document.getElementById('budgetsContainer');
    
    if (budgets.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No budgets set. Create your first budget!</p>';
        return;
    }
    
    // Update spent amounts
    budgets.forEach(budget => {
        budget.spent = calculateBudgetSpent(budget);
    });
    
    container.innerHTML = budgets.map(budget => {
        const percentage = (budget.spent / budget.amount) * 100;
        const progressClass = percentage > 100 ? 'danger' : percentage > 80 ? 'warning' : '';
        
        return `
            <div class="budget-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4>${budget.category}</h4>
                    <span>${formatCurrency(budget.spent)} / ${formatCurrency(budget.amount)}</span>
                </div>
                <div class="budget-progress">
                    <div class="progress-bar ${progressClass}" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                <div style="font-size: 0.9rem; color: var(--text-secondary);">
                    ${budget.period} • ${Math.round(percentage)}% used
                </div>
                <button class="btn btn-danger" onclick="deleteBudget('${budget.id}')" style="margin-top: 10px; font-size: 0.8rem; padding: 5px 10px;">Delete</button>
            </div>
        `;
    }).join('');
}

function calculateBudgetSpent(budget) {
    const now = new Date();
    const startDate = new Date(budget.startDate);
    let endDate = new Date(startDate);
    
    // Calculate period end date
    switch (budget.period) {
        case 'weekly':
            endDate.setDate(endDate.getDate() + 7);
            break;
        case 'monthly':
            endDate.setMonth(endDate.getMonth() + 1);
            break;
        case 'yearly':
            endDate.setFullYear(endDate.getFullYear() + 1);
            break;
    }
    
    return transactions
        .filter(t => 
            t.type === 'expense' &&
            t.category === budget.category &&
            new Date(t.date) >= startDate &&
            new Date(t.date) <= endDate
        )
        .reduce((sum, t) => sum + t.amount, 0);
}

function deleteBudget(budgetId) {
    if (confirm('Are you sure you want to delete this budget?')) {
        budgets = budgets.filter(b => b.id !== budgetId);
        saveDataToStorage();
        displayBudgets();
    }
}

function checkBudgetAlerts() {
    if (!settings.budgetAlerts) {
        document.getElementById('budgetAlerts').innerHTML = '';
        return;
    }
    
    const alerts = [];
    
    budgets.forEach(budget => {
        const spent = calculateBudgetSpent(budget);
        const percentage = (spent / budget.amount) * 100;
        
        if (percentage > 100) {
            alerts.push(`🚨 Budget exceeded for ${budget.category}: ${formatCurrency(spent)} / ${formatCurrency(budget.amount)}`);
        } else if (percentage > 80) {
            alerts.push(`⚠️ Budget warning for ${budget.category}: ${Math.round(percentage)}% used`);
        }
    });
    
    const alertsContainer = document.getElementById('alertsContainer');
    const budgetAlertsDiv = document.getElementById('budgetAlerts');
    
    if (alerts.length > 0) {
        alertsContainer.classList.remove('hidden');
        budgetAlertsDiv.innerHTML = alerts.map(alert => `<div class="alert">${alert}</div>`).join('');
    } else {
        budgetAlertsDiv.innerHTML = '';
        // Check if we should hide the container
        const billReminderDiv = document.getElementById('billReminders');
        if (billReminderDiv && billReminderDiv.innerHTML === '') {
            alertsContainer.classList.add('hidden');
        }
    }
}

// Goal Management functions remain the same...
function handleAddGoal(e) {
    e.preventDefault();
    
    const goal = {
        id: Date.now().toString(),
        name: document.getElementById('goalName').value,
        target: parseFloat(document.getElementById('goalTarget').value),
        current: parseFloat(document.getElementById('goalCurrent').value) || 0,
        deadline: document.getElementById('goalDeadline').value,
        description: document.getElementById('goalDescription').value || '',
        createdAt: new Date().toISOString().split('T')[0]
    };
    
    if (validateGoal(goal)) {
        goals.push(goal);
        saveDataToStorage();
        displayGoals();
        document.getElementById('goalForm').reset();
        document.getElementById('goalDeadline').value = new Date().toISOString().split('T')[0];
        showError('goalError', '');
        alert('Goal created successfully!');
    }
}

function validateGoal(goal) {
    if (!goal.name.trim()) {
        showError('goalError', 'Please enter a goal name');
        return false;
    }
    if (!goal.target || goal.target <= 0) {
        showError('goalError', 'Please enter a valid target amount');
        return false;
    }
    if (!goal.deadline) {
        showError('goalError', 'Please select a target date');
        return false;
    }
    return true;
}

function displayGoals() {
    const container = document.getElementById('goalsContainer');
    
    if (goals.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No goals set. Create your first goal!</p>';
        return;
    }
    
    container.innerHTML = goals.map(goal => {
        const percentage = (goal.current / goal.target) * 100;
        const progressClass = percentage >= 100 ? 'success' : percentage >= 75 ? 'warning' : '';
        const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        
        return `
            <div class="goal-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4>${goal.name}</h4>
                    <span>${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}</span>
                </div>
                <div class="goal-progress">
                    <div class="progress-bar ${progressClass}" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 10px;">
                    ${Math.round(percentage)}% complete • ${daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-primary" onclick="updateGoalProgress('${goal.id}')" style="font-size: 0.8rem; padding: 5px 10px;">Update Progress</button>
                    <button class="btn btn-danger" onclick="deleteGoal('${goal.id}')" style="font-size: 0.8rem; padding: 5px 10px;">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateGoalProgress(goalId) {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
        const newAmount = prompt(`Update progress for "${goal.name}":\nCurrent: ${formatCurrency(goal.current)}\nTarget: ${formatCurrency(goal.target)}\n\nEnter new current amount:`, goal.current);
        
        if (newAmount !== null && !isNaN(newAmount) && parseFloat(newAmount) >= 0) {
            goal.current = parseFloat(newAmount);
            saveDataToStorage();
            displayGoals();
            updateSavingsProgress();
        }
    }
}

function deleteGoal(goalId) {
    if (confirm('Are you sure you want to delete this goal?')) {
        goals = goals.filter(g => g.id !== goalId);
        saveDataToStorage();
        displayGoals();
        updateSavingsProgress();
    }
}

function updateSavingsProgress() {
    const totalSavings = goals.reduce((sum, goal) => sum + goal.current, 0);
    document.getElementById('savingsProgress').textContent = formatCurrency(totalSavings);
}

// Bill Management functions remain the same...
function handleAddBill(e) {
    e.preventDefault();
    
    const bill = {
        id: Date.now().toString(),
        name: document.getElementById('billName').value,
        amount: parseFloat(document.getElementById('billAmount').value),
        category: document.getElementById('billCategory').value,
        dueDate: document.getElementById('billDueDate').value,
        recurring: document.getElementById('billRecurring').value,
        isPaid: false,
        createdAt: new Date().toISOString().split('T')[0]
    };
    
    if (validateBill(bill)) {
        bills.push(bill);
        saveDataToStorage();
        displayBills();
        document.getElementById('billForm').reset();
        document.getElementById('billDueDate').value = new Date().toISOString().split('T')[0];
        showError('billError', '');
        alert('Bill added successfully!');
    }
}

function validateBill(bill) {
    if (!bill.name.trim()) {
        showError('billError', 'Please enter a bill name');
        return false;
    }
    if (!bill.amount || bill.amount <= 0) {
        showError('billError', 'Please enter a valid amount');
        return false;
    }
    if (!bill.category) {
        showError('billError', 'Please select a category');
        return false;
    }
    if (!bill.dueDate) {
        showError('billError', 'Please select a due date');
        return false;
    }
    return true;
}

function displayBills() {
    const container = document.getElementById('billsContainer');
    
    if (bills.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No bills added. Add your first bill!</p>';
        return;
    }
    
    container.innerHTML = bills.map(bill => {
        const daysUntilDue = Math.ceil((new Date(bill.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        const statusClass = bill.isPaid ? 'success' : daysUntilDue < 0 ? 'danger' : daysUntilDue <= 3 ? 'warning' : '';
        const statusText = bill.isPaid ? 'Paid' : daysUntilDue < 0 ? `Overdue by ${Math.abs(daysUntilDue)} days` : daysUntilDue === 0 ? 'Due today' : `Due in ${daysUntilDue} days`;
        
        return `
            <div class="bill-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4>${bill.name}</h4>
                    <span style="color: var(--${statusClass === 'success' ? 'success' : statusClass === 'danger' ? 'danger' : statusClass === 'warning' ? 'warning' : 'text-secondary'}-color);">
                        ${formatCurrency(bill.amount)}
                    </span>
                </div>
                <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 10px;">
                    ${bill.category} • ${formatDate(bill.dueDate)} • ${statusText}
                </div>
                <div style="display: flex; gap: 10px;">
                    ${!bill.isPaid ? `<button class="btn btn-success" onclick="markBillPaid('${bill.id}')" style="font-size: 0.8rem; padding: 5px 10px;">Mark as Paid</button>` : ''}
                    <button class="btn btn-danger" onclick="deleteBill('${bill.id}')" style="font-size: 0.8rem; padding: 5px 10px;">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function markBillPaid(billId) {
    const bill = bills.find(b => b.id === billId);
    if (bill) {
        bill.isPaid = true;
        
        // Add as expense transaction
        const transaction = {
            id: Date.now().toString(),
            type: 'expense',
            amount: bill.amount,
            category: bill.category,
            date: new Date().toISOString().split('T')[0],
            description: `Payment for ${bill.name}`,
            paymentMethod: 'bank',
            isRecurring: false
        };
        
        transactions.push(transaction);
        saveDataToStorage();
        displayBills();
        updateDashboard();
        alert('Bill marked as paid and added to transactions!');
        deleteBill(billId);
    }
}

function deleteBill(billId) {
    if (confirm('Are you sure you want to delete this bill?')) {
        bills = bills.filter(b => b.id !== billId);
        saveDataToStorage();
        displayBills();
    }
}

function checkBillReminders() {
    if (!settings.billReminders) {
        document.getElementById('billReminders').innerHTML = '';
        return;
    }
    
    const upcomingBills = bills.filter(bill => {
        const daysUntilDue = Math.ceil((new Date(bill.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 3 && daysUntilDue >= 0;
    });
    
    const overdueBills = bills.filter(bill => {
        const daysUntilDue = Math.ceil((new Date(bill.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntilDue < 0;
    });
    
    const reminders = [];
    
    overdueBills.forEach(bill => {
        const daysOverdue = Math.abs(Math.ceil((new Date(bill.dueDate) - new Date()) / (1000 * 60 * 60 * 24)));
        reminders.push(`🚨 ${bill.name} is overdue by ${daysOverdue} days (${formatCurrency(bill.amount)})`);
    });
    
    upcomingBills.forEach(bill => {
        const daysUntilDue = Math.ceil((new Date(bill.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        const message = daysUntilDue === 0 ? 'due today' : `due in ${daysUntilDue} days`;
        reminders.push(`📅 ${bill.name} is ${message} (${formatCurrency(bill.amount)})`);
    });
    
    const alertsContainer = document.getElementById('alertsContainer');
    const billRemindersDiv = document.getElementById('billReminders');
    
    if (reminders.length > 0) {
        alertsContainer.classList.remove('hidden');
        billRemindersDiv.innerHTML = reminders.map(reminder => `<div class="alert">${reminder}</div>`).join('');
    } else {
        billRemindersDiv.innerHTML = '';
        // Check if we should hide the container
        const budgetAlertsDiv = document.getElementById('budgetAlerts');
        if (budgetAlertsDiv && budgetAlertsDiv.innerHTML === '') {
            alertsContainer.classList.add('hidden');
        }
    }
}

// Transaction History
function displayTransactionHistory() {
    filterTransactions();
}

function filterTransactions() {
    const typeFilter = document.getElementById('filterType').value;
    const categoryFilter = document.getElementById('filterCategory').value;
    const dateFromFilter = document.getElementById('filterDateFrom').value;
    const dateToFilter = document.getElementById('filterDateTo').value;
    
    let filteredTransactions = transactions.filter(transaction => {
        const matchesType = !typeFilter || transaction.type === typeFilter;
        const matchesCategory = !categoryFilter || transaction.category === categoryFilter;
        const matchesDateFrom = !dateFromFilter || transaction.date >= dateFromFilter;
        const matchesDateTo = !dateToFilter || transaction.date <= dateToFilter;
        
        return matchesType && matchesCategory && matchesDateFrom && matchesDateTo;
    });
    
    displayFilteredTransactions(filteredTransactions);
}

function displayFilteredTransactions(filteredTransactions) {
    const container = document.getElementById('transactionsList');
    
    if (filteredTransactions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No transactions found matching your filters.</p>';
        return;
    }
    
    container.innerHTML = filteredTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(transaction => `
            <div class="transaction-item">
                <div class="transaction-details">
                    <h4>${transaction.description || transaction.category}</h4>
                    <div class="transaction-meta">
                        ${transaction.category} • ${formatDate(transaction.date)} • ${transaction.paymentMethod}
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
                </div>
            </div>
        `).join('');
}

function clearFilters() {
    document.getElementById('filterType').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    filterTransactions();
}

function exportTransactions() {
    const csv = generateTransactionCSV(transactions);
    downloadCSV(csv, 'transactions.csv');
}

// FIXED REPORTS GENERATION - Only generates when button is clicked
function generateReports() {
    const period = document.getElementById('reportPeriod').value;
    let startDate, endDate;
    
    const now = new Date();
    
    switch (period) {
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        case 'custom':
            const startDateInput = document.getElementById('reportStartDate').value;
            const endDateInput = document.getElementById('reportEndDate').value;
            
            if (!startDateInput || !endDateInput) {
                alert('Please select both start and end dates for custom range');
                return;
            }
            
            startDate = new Date(startDateInput);
            endDate = new Date(endDateInput);
            
            if (startDate > endDate) {
                alert('Start date must be before end date');
                return;
            }
            break;
    }
    
    const reportTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
    });
    
    if (reportTransactions.length === 0) {
        alert('No transactions found for the selected period');
        return;
    }
    
    // Store current report data for export
    currentReportData = {
        period: period,
        startDate: startDate,
        endDate: endDate,
        transactions: reportTransactions
    };
    
    // First create the chart containers if they don't exist
    ensureChartContainers();
    
    // Generate all charts
    generateExpenseChart(reportTransactions);
    generateIncomeExpenseChart(reportTransactions);
    generateTrendChart(reportTransactions);
    
    console.log(`Generated report for ${reportTransactions.length} transactions`);
}

function ensureChartContainers() {
    const reportsContainer = document.querySelector('.reports-container');
    if (reportsContainer) {
        reportsContainer.innerHTML = `
            <div class="chart-container">
                <h3>📊 Categories</h3>
                <canvas id="expenseChart"></canvas>
            </div>
            <div class="chart-container">
                <h3>💰 Income vs Expenses</h3>
                <canvas id="incomeExpenseChart"></canvas>
            </div>
            <div class="chart-container">
                <h3>📈 Monthly Trend</h3>
                <canvas id="trendChart"></canvas>
            </div>
        `;
    }
}

function generateExpenseChart(reportTransactions) {
    const expenseTransactions = reportTransactions.filter(t => t.type === 'expense');
    const categoryData = {};
    
    expenseTransactions.forEach(t => {
        categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
    });
    
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    if (expenseChart) {
        expenseChart.destroy();
    }
    
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryData),
            datasets: [{
                data: Object.values(categoryData),
                backgroundColor: [
                    '#A855F7', '#C084FC', '#6366F1', '#8B5CF6', '#DDD6FE',
                    '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6b7280'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 10 },
                        padding: 10
                    }
                }
            }
        }
    });
}

function generateIncomeExpenseChart(reportTransactions) {
    const incomeTotal = reportTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expenseTotal = reportTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const ctx = document.getElementById('incomeExpenseChart').getContext('2d');
    
    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }
    
    incomeExpenseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expenses'],
            datasets: [{
                data: [incomeTotal, expenseTotal],
                backgroundColor: ['#10b981', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { size: 10 }
                    }
                },
                x: {
                    ticks: {
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

function generateTrendChart(reportTransactions) {
    const monthlyData = {};
    
    reportTransactions.forEach(t => {
        const month = new Date(t.date).toISOString().slice(0, 7);
        if (!monthlyData[month]) {
            monthlyData[month] = { income: 0, expense: 0 };
        }
        monthlyData[month][t.type] += t.amount;
    });
    
    const months = Object.keys(monthlyData).sort();
    const incomeData = months.map(month => monthlyData[month].income);
    const expenseData = months.map(month => monthlyData[month].expense);
    
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    if (trendChart) {
        trendChart.destroy();
    }
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months.map(month => {
                const date = new Date(month + '-01');
                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }),
            datasets: [{
                label: 'Income',
                data: incomeData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4
            }, {
                label: 'Expenses',
                data: expenseData,
                borderColor: '#A855F7',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 10 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { size: 10 }
                    }
                },
                x: {
                    ticks: {
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

// ENHANCED PDF EXPORT FUNCTIONALITY
function exportReport() {
    if (!currentReportData) {
        alert('Please generate a report first before exporting');
        return;
    }
    
    // Create PDF content
    const reportContent = createReportContent();
    
    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Financial Report</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    background: white;
                    color: black;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #A855F7;
                    padding-bottom: 20px;
                }
                .header h1 {
                    color: #A855F7;
                    margin: 0;
                }
                .period-info {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                .summary-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .summary-card {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                    border-left: 4px solid #A855F7;
                }
                .summary-card h3 {
                    margin: 0 0 10px 0;
                    color: #333;
                }
                .summary-card .amount {
                    font-size: 1.5em;
                    font-weight: bold;
                }
                .income { color: #10b981; }
                .expense { color: #ef4444; }
                .balance { color: #A855F7; }
                .transactions-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                .transactions-table th,
                .transactions-table td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                .transactions-table th {
                    background-color: #A855F7;
                    color: white;
                }
                .transactions-table tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                .category-breakdown {
                    margin-top: 30px;
                }
                .category-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #eee;
                }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            ${reportContent}
            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <button onclick="window.print()" style="background: #A855F7; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">Print/Save as PDF</button>
                <button onclick="window.close()" style="background: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-left: 10px;">Close</button>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    // Auto-print after a short delay
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

function createReportContent() {
    const { period, startDate, endDate, transactions: reportTransactions } = currentReportData;
    
    // Calculate summary data
    const incomeTotal = reportTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expenseTotal = reportTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = incomeTotal - expenseTotal;
    
    // Calculate category breakdown
    const expensesByCategory = {};
    reportTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        });
    
    const periodText = period === 'custom' 
        ? `${formatDate(startDate.toISOString().split('T')[0])} to ${formatDate(endDate.toISOString().split('T')[0])}`
        : period.charAt(0).toUpperCase() + period.slice(1);
    
    return `
        <div class="header">
            <h1>💰 Financial Report</h1>
            <p>Generated on ${formatDate(new Date().toISOString().split('T')[0])}</p>
        </div>
        
        <div class="period-info">
            <h3>Report Period: ${periodText}</h3>
            <p>Total Transactions: ${reportTransactions.length}</p>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <h3>Total Income</h3>
                <div class="amount income">${formatCurrency(incomeTotal)}</div>
            </div>
            <div class="summary-card">
                <h3>Total Expenses</h3>
                <div class="amount expense">${formatCurrency(expenseTotal)}</div>
            </div>
            <div class="summary-card">
                <h3>Net Balance</h3>
                <div class="amount balance">${formatCurrency(balance)}</div>
            </div>
        </div>
        
        ${Object.keys(expensesByCategory).length > 0 ? `
        <div class="category-breakdown">
            <h3>Expenses by Category</h3>
            ${Object.entries(expensesByCategory)
                .sort(([,a], [,b]) => b - a)
                .map(([category, amount]) => `
                    <div class="category-item">
                        <span>${category}</span>
                        <span>${formatCurrency(amount)}</span>
                    </div>
                `).join('')}
        </div>
        ` : ''}
        
        <h3>Transaction Details</h3>
        <table class="transactions-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${reportTransactions
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(t => `
                        <tr>
                            <td>${formatDate(t.date)}</td>
                            <td style="color: ${t.type === 'income' ? '#10b981' : '#ef4444'}">${t.type.charAt(0).toUpperCase() + t.type.slice(1)}</td>
                            <td>${t.category}</td>
                            <td>${t.description || '-'}</td>
                            <td style="color: ${t.type === 'income' ? '#10b981' : '#ef4444'}">
                                ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                            </td>
                        </tr>
                    `).join('')}
            </tbody>
        </table>
    `;
}

// Settings remain the same...
function loadSettings() {
    document.getElementById('profileName').value = currentUser?.name || '';
    document.getElementById('profileEmail').value = currentUser?.email || '';
    document.getElementById('currency').value = settings.currency;
    document.getElementById('budgetAlerts').checked = settings.budgetAlerts;
    document.getElementById('billReminders').checked = settings.billReminders;
    document.getElementById('themeToggle').checked = settings.theme === 'dark';
}

function handleUpdateProfile(e) {
    e.preventDefault();
    
    if (currentUser) {
        currentUser.name = document.getElementById('profileName').value;
        currentUser.email = document.getElementById('profileEmail').value;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        alert('Profile updated successfully!');
    }
}

function updateCurrency() {
    settings.currency = document.getElementById('currency').value;
    saveDataToStorage();
    updateDashboard();
    alert('Currency updated successfully!');
}

function updateNotifications() {
    settings.budgetAlerts = document.getElementById('budgetAlerts').checked;
    settings.billReminders = document.getElementById('billReminders').checked;
    saveDataToStorage();
    
    // Update dashboard to show/hide notifications
    updateDashboard();
}

function exportData() {
    const data = {
        transactions,
        budgets,
        goals,
        bills,
        settings,
        currentUser,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expense-tracker-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData() {
    document.getElementById('importFile').click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm('This will replace all your current data. Are you sure?')) {
                transactions = data.transactions || [];
                budgets = data.budgets || [];
                goals = data.goals || [];
                bills = data.bills || [];
                settings = { ...settings, ...data.settings };
                
                saveDataToStorage();
                updateDashboard();
                applyTheme();
                alert('Data imported successfully!');
            }
        } catch (error) {
            alert('Error importing data. Please check the file format.');
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('This will delete all your data permanently. Are you sure?')) {
        if (confirm('This action cannot be undone. Are you absolutely sure?')) {
            transactions = [];
            budgets = [];
            goals = [];
            bills = [];
            settings = {
                currency: 'USD',
                emailNotifications: true,
                budgetAlerts: true,
                billReminders: true,
                theme: 'light'
            };
            
            saveDataToStorage();
            updateDashboard();
            alert('All data cleared successfully!');
        }
    }
}

// Theme Management
function loadSettings() {
    const savedSettings = localStorage.getItem('expenseTrackerSettings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    }
    applyTheme();
}

function saveSettings() {
    localStorage.setItem('expenseTrackerSettings', JSON.stringify(settings));
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.setAttribute('data-theme', newTheme);
    settings.theme = newTheme;
    
    const navThemeToggle = document.querySelector('.theme-toggle');
    if (navThemeToggle) {
        navThemeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
    
    const settingsThemeToggle = document.getElementById('themeToggle');
    if (settingsThemeToggle) {
        settingsThemeToggle.checked = newTheme === 'dark';
    }
    
    saveSettings();
}

function applyTheme() {
    const theme = settings.theme || 'light';
    document.body.setAttribute('data-theme', theme);
    
    const navThemeToggle = document.querySelector('.theme-toggle');
    if (navThemeToggle) {
        navThemeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    
    const settingsThemeToggle = document.getElementById('themeToggle');
    if (settingsThemeToggle) {
        settingsThemeToggle.checked = theme === 'dark';
    }
}

function toggleThemeFromSettings() {
    const settingsThemeToggle = document.getElementById('themeToggle');
    const newTheme = settingsThemeToggle.checked ? 'dark' : 'light';
    
    document.body.setAttribute('data-theme', newTheme);
    settings.theme = newTheme;
    
    const navThemeToggle = document.querySelector('.theme-toggle');
    if (navThemeToggle) {
        navThemeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
    
    saveSettings();
}

// Carousel Management
function initializeCarousel() {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        dots[currentSlide].classList.remove('active');
        
        currentSlide = (currentSlide + 1) % slides.length;
        
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }, 5000);
}

function showSlide(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    slides[index].classList.add('active');
    dots[index].classList.add('active');
}

// Voice Recognition and other functions remain the same...
function setupVoiceRecognition() {
    if ('webkitSpeechRecognition' in window) {
        voiceRecognition = new webkitSpeechRecognition();
        voiceRecognition.continuous = false;
        voiceRecognition.interimResults = false;
        voiceRecognition.lang = 'en-US';
        
        voiceRecognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            processVoiceInput(transcript);
        };
        
        voiceRecognition.onerror = function(event) {
            document.getElementById('voiceInputStatus').textContent = 'Error occurred: ' + event.error;
        };
    }
}

function openVoiceInput() {
    showPage('addTransaction');
    document.getElementById('voiceInputModal').classList.remove('hidden');
    document.getElementById('voiceInputStatus').textContent = 'Click the microphone to start';
    document.getElementById('voiceInputPreview').classList.add('hidden');
    document.getElementById('confirmVoiceInput').classList.add('hidden');
}

function closeVoiceInput() {
    document.getElementById('voiceInputModal').classList.add('hidden');
    voiceData = null;
}

function startVoiceRecognition() {
    if (voiceRecognition) {
        document.getElementById('voiceInputStatus').textContent = 'Listening... Speak now!';
        voiceRecognition.start();
    } else {
        alert('Voice recognition not supported in this browser');
    }
}

function processVoiceInput(transcript) {
    document.getElementById('voiceInputStatus').textContent = 'Processing...';
    
    const words = transcript.toLowerCase().split(' ');
    voiceData = {
        transcript: transcript,
        type: words.includes('spent') || words.includes('paid') ? 'expense' : 'income',
        amount: null,
        description: transcript
    };
    
    const amountMatch = transcript.match(/\$?(\d+(?:\.\d{2})?)/);
    if (amountMatch) {
        voiceData.amount = parseFloat(amountMatch[1]);
    }
    
    displayVoicePreview();
}

function displayVoicePreview() {
    const preview = document.getElementById('voiceInputPreview');
    preview.innerHTML = `
        <h4>Voice Input Preview:</h4>
        <p><strong>Transcript:</strong> "${voiceData.transcript}"</p>
        <p><strong>Type:</strong> ${voiceData.type}</p>
        <p><strong>Amount:</strong> ${voiceData.amount ? formatCurrency(voiceData.amount) : 'Not detected'}</p>
        <p>Please review and confirm if this looks correct.</p>
    `;
    preview.classList.remove('hidden');
    document.getElementById('confirmVoiceInput').classList.remove('hidden');
}

function confirmVoiceInput() {
    if (voiceData && voiceData.amount) {
        document.getElementById('transactionType').value = voiceData.type;
        document.getElementById('amount').value = voiceData.amount;
        document.getElementById('description').value = voiceData.transcript;
        
        updateCategoryOptions();
        closeVoiceInput();
        showPage('addTransaction');
    } else {
        alert('Please provide a valid amount to continue');
    }
}

// Receipt Scanner
function openReceiptScanner() {
    showPage('addTransaction');
    document.getElementById('receiptScannerModal').classList.remove('hidden');
}

function closeReceiptScanner() {
    document.getElementById('receiptScannerModal').classList.add('hidden');
}

function simulateReceiptScan(event) {
    const file = event.target.files[0];
    if (file) {
        const mockData = {
            amount: (Math.random() * 100 + 10).toFixed(2),
            merchant: 'Sample Store',
            date: new Date().toISOString().split('T')[0],
            category: 'Shopping'
        };
        
        displayScannedResult(mockData);
    }
}

function displayScannedResult(data) {
    document.getElementById('scannedData').innerHTML = `
        <p><strong>Merchant:</strong> ${data.merchant}</p>
        <p><strong>Amount:</strong> ${formatCurrency(parseFloat(data.amount))}</p>
        <p><strong>Date:</strong> ${formatDate(data.date)}</p>
        <p><strong>Category:</strong> ${data.category}</p>
    `;
    document.getElementById('scannedResult').classList.remove('hidden');
}

function confirmScannedTransaction() {
    alert('Scanned transaction would be added to the form');
    closeReceiptScanner();
}

// Utility Functions
function formatCurrency(amount) {
    const currencySymbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'CAD': '$',
        'AUD': '$',
        'INR': '₹'
    };
    
    const symbol = currencySymbols[settings.currency] || '$';
    return symbol + amount.toFixed(2);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (message) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    } else {
        errorElement.classList.remove('show');
    }
}

function generateTransactionCSV(transactions) {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment Method'];
    const rows = transactions.map(t => [
        t.date,
        t.type,
        t.category,
        t.description,
        t.amount,
        t.paymentMethod
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Data Storage
function saveDataToStorage() {
    localStorage.setItem('expenseTrackerData', JSON.stringify({
        transactions,
        budgets,
        goals,
        bills,
        settings
    }));
}

function loadDataFromStorage() {
    const data = localStorage.getItem('expenseTrackerData');
    if (data) {
        const parsed = JSON.parse(data);
        transactions = parsed.transactions || [];
        budgets = parsed.budgets || [];
        goals = parsed.goals || [];
        bills = parsed.bills || [];
        settings = { ...settings, ...parsed.settings };
    }
}