const STORAGE_PREFIX = 'budgetwise-profile-';
const CURRENT_EMAIL_KEY = 'budgetwise-current-user';
const THEME_KEY = 'budgetwise-theme';

const defaultBudgets = [
  { id: 'groceries', name: 'Groceries', limit: 500, color: '#4f46e5' },
  { id: 'transport', name: 'Transport', limit: 180, color: '#0ea5e9' },
  { id: 'bills', name: 'Bills', limit: 260, color: '#10b981' },
  { id: 'entertainment', name: 'Entertainment', limit: 150, color: '#f59e0b' },
  { id: 'shopping', name: 'Shopping', limit: 220, color: '#ec4899' }
];

const state = {
  email: '',
  budgets: [],
  expenses: []
};

const accessors = {
  emailModal: document.getElementById('email-modal'),
  emailForm: document.getElementById('email-form'),
  emailInput: document.getElementById('email-input'),
  changeEmailBtn: document.getElementById('change-email-btn'),
  budgetForm: document.getElementById('budget-form'),
  budgetId: document.getElementById('budget-id'),
  budgetName: document.getElementById('budget-name'),
  budgetAmount: document.getElementById('budget-amount'),
  resetBudgetFormBtn: document.getElementById('reset-budget-form'),
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  exportEmailSheetBtn: document.getElementById('export-email-sheet-btn'),
  installAppBtn: document.getElementById('install-app-btn'),
  expenseForm: document.getElementById('expense-form'),
  expenseCategory: document.getElementById('expense-category'),
  expenseAmount: document.getElementById('expense-amount'),
  expenseDate: document.getElementById('expense-date'),
  expenseNote: document.getElementById('expense-note'),
  resetExpenseFormBtn: document.getElementById('reset-expense-form'),
  budgetsList: document.getElementById('budgets-list'),
  monthlySavingsList: document.getElementById('monthly-savings-list'),
  transactionsList: document.getElementById('transactions-list'),
  totalBudget: document.getElementById('total-budget'),
  totalSpent: document.getElementById('total-spent'),
  totalRemaining: document.getElementById('total-remaining'),
  chartTotalLabel: document.getElementById('chart-total-label'),
  budgetPieChart: document.getElementById('budget-pie-chart'),
  chartLegend: document.getElementById('chart-legend'),
  userEmailLabel: document.getElementById('user-email-label')
};

function initialize() {
  accessors.expenseDate.value = new Date().toISOString().split('T')[0];
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');
  bindEvents();

  const savedEmail = localStorage.getItem(CURRENT_EMAIL_KEY);
  if (savedEmail) {
    state.email = savedEmail;
    loadProfile(savedEmail);
    hideEmailModal();
  } else {
    showEmailModal();
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((error) => {
        console.warn('Service worker registration failed:', error);
      });
    });
  }
}

function bindEvents() {
  accessors.emailForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = accessors.emailInput.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    setActiveEmail(email);
  });

  accessors.changeEmailBtn.addEventListener('click', () => {
    showEmailModal();
  });

  accessors.budgetForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const id = accessors.budgetId.value;
    const name = accessors.budgetName.value.trim();
    const limit = Number(accessors.budgetAmount.value);

    if (!name || !Number.isFinite(limit) || limit <= 0) {
      alert('Please enter a valid category name and a budget greater than zero.');
      return;
    }

    if (id) {
      const target = state.budgets.find((budget) => budget.id === id);
      if (target) {
        target.name = name;
        target.limit = limit;
      }
    } else {
      const newBudget = {
        id: crypto.randomUUID ? crypto.randomUUID() : `budget-${Date.now()}`,
        name,
        limit,
        color: pickBudgetColor(state.budgets.length)
      };
      state.budgets.push(newBudget);
    }

    persistProfile();
    resetBudgetForm();
    render();
  });

  accessors.resetBudgetFormBtn.addEventListener('click', resetBudgetForm);

  accessors.themeToggleBtn.addEventListener('click', () => {
    const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });

  accessors.exportEmailSheetBtn.addEventListener('click', () => {
    exportUserDataToExcel();
  });

  accessors.installAppBtn.addEventListener('click', async () => {
    if (!window.deferredInstallPrompt) {
      return;
    }

    window.deferredInstallPrompt.prompt();
    await window.deferredInstallPrompt.userChoice;
    window.deferredInstallPrompt = null;
    accessors.installAppBtn.hidden = true;
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window.deferredInstallPrompt = event;
    accessors.installAppBtn.hidden = false;
  });

  accessors.expenseForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const categoryId = accessors.expenseCategory.value;
    const amount = Number(accessors.expenseAmount.value);
    const date = accessors.expenseDate.value;
    const note = accessors.expenseNote.value.trim();

    if (!categoryId || !Number.isFinite(amount) || amount <= 0 || !date) {
      alert('Please complete all payment details.');
      return;
    }

    const budget = state.budgets.find((item) => item.id === categoryId);
    if (!budget) {
      alert('Please select a valid category.');
      return;
    }

    state.expenses.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : `payment-${Date.now()}`,
      categoryId,
      amount,
      date,
      note
    });

    persistProfile();
    accessors.expenseForm.reset();
    accessors.expenseDate.value = new Date().toISOString().split('T')[0];
    render();
  });

  accessors.resetExpenseFormBtn.addEventListener('click', () => {
    accessors.expenseForm.reset();
    accessors.expenseDate.value = new Date().toISOString().split('T')[0];
  });
}

function setActiveEmail(email) {
  const normalized = email.trim().toLowerCase();
  state.email = normalized;
  localStorage.setItem(CURRENT_EMAIL_KEY, normalized);
  loadProfile(normalized);
  hideEmailModal();
}

function loadProfile(email) {
  const profile = JSON.parse(localStorage.getItem(getStorageKey(email)) || '{}');

  state.budgets = Array.isArray(profile.budgets) && profile.budgets.length ? profile.budgets : makeDefaultBudgets();
  state.expenses = Array.isArray(profile.expenses) ? profile.expenses : [];

  populateExpenseCategorySelect();
  render();
}

function persistProfile() {
  if (!state.email) return;
  const payload = {
    budgets: state.budgets,
    expenses: state.expenses
  };
  localStorage.setItem(getStorageKey(state.email), JSON.stringify(payload));
}

function getStorageKey(email) {
  return `${STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

function applyTheme(theme) {
  const safeTheme = theme === 'dark' ? 'dark' : 'light';
  document.body.dataset.theme = safeTheme;
  localStorage.setItem(THEME_KEY, safeTheme);
  accessors.themeToggleBtn.textContent = safeTheme === 'dark' ? 'Light mode' : 'Dark mode';
}

function exportUserDataToExcel() {
  if (!state.email) {
    alert('Please enter your email before exporting.');
    return;
  }

  if (!window.XLSX) {
    alert('Excel export library is not ready yet. Please try again in a moment.');
    return;
  }

  const safeEmail = state.email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
  const workbook = XLSX.utils.book_new();

  const budgetsSheet = state.budgets.map((budget) => ({
    Category: budget.name,
    Limit: Number(budget.limit || 0),
    Color: budget.color || '#4f46e5'
  }));

  const expensesSheet = state.expenses.map((expense) => {
    const category = state.budgets.find((budget) => budget.id === expense.categoryId);
    return {
      Email: state.email,
      Date: expense.date,
      Category: category ? category.name : 'Unknown',
      Amount: Number(expense.amount || 0),
      Note: expense.note || ''
    };
  });

  const summarySheet = [{
    Email: state.email,
    TotalBudget: state.budgets.reduce((sum, budget) => sum + Number(budget.limit || 0), 0),
    TotalSpent: state.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    Remaining: state.budgets.reduce((sum, budget) => sum + Number(budget.limit || 0), 0) - state.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  }];

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(budgetsSheet), 'Budgets');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(expensesSheet), 'Expenses');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summarySheet), 'Summary');

  XLSX.writeFile(workbook, `${safeEmail}-budgetwise.xlsx`);
}

function showEmailModal() {
  accessors.emailModal.classList.add('visible');
  accessors.emailInput.focus();
}

function hideEmailModal() {
  accessors.emailModal.classList.remove('visible');
}

function makeDefaultBudgets() {
  return defaultBudgets.map((item) => ({ ...item }));
}

function pickBudgetColor(index) {
  const palette = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
  return palette[index % palette.length];
}

function resetBudgetForm() {
  accessors.budgetForm.reset();
  accessors.budgetId.value = '';
  accessors.budgetName.focus();
}

function populateExpenseCategorySelect() {
  accessors.expenseCategory.innerHTML = '';

  if (!state.budgets.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Create a budget first';
    accessors.expenseCategory.appendChild(option);
    return;
  }

  state.budgets.forEach((budget) => {
    const option = document.createElement('option');
    option.value = budget.id;
    option.textContent = budget.name;
    accessors.expenseCategory.appendChild(option);
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value || 0);
}

function render() {
  const totalBudget = state.budgets.reduce((sum, budget) => sum + Number(budget.limit || 0), 0);
  const totalSpent = state.expenses.reduce((sum, expense) => {
    const matchingBudget = state.budgets.find((budget) => budget.id === expense.categoryId);
    return matchingBudget ? sum + Number(expense.amount || 0) : sum;
  }, 0);
  const totalRemaining = totalBudget - totalSpent;

  accessors.totalBudget.textContent = formatCurrency(totalBudget);
  accessors.totalSpent.textContent = formatCurrency(totalSpent);
  accessors.totalRemaining.textContent = formatCurrency(totalRemaining);
  accessors.totalRemaining.style.color = totalRemaining < 0 ? 'var(--danger)' : 'var(--success)';
  accessors.chartTotalLabel.textContent = formatCurrency(totalBudget);
  renderBudgetPieChart(totalBudget);

  renderBudgets();
  renderMonthlySavings();
  renderTransactions();
}

function renderMonthlySavings() {
  const monthMap = new Map();

  state.expenses.forEach((expense) => {
    const monthKey = new Date(expense.date).toISOString().slice(0, 7);
    const monthLabel = new Date(expense.date).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const current = monthMap.get(monthKey) || { label: monthLabel, spent: 0 };
    current.spent += Number(expense.amount || 0);
    monthMap.set(monthKey, current);
  });

  const months = Array.from(monthMap.entries()).map(([key, value]) => ({
    key,
    label: value.label,
    spent: value.spent
  }));

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonth = months.find((month) => month.key === currentMonthKey);

  if (!currentMonth) {
    months.unshift({
      key: currentMonthKey,
      label: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      spent: 0
    });
  }

  const monthlyData = months
    .map((month) => {
      const spent = month.spent;
      const budgeted = state.budgets.reduce((sum, budget) => sum + Number(budget.limit || 0), 0);
      const savedBalance = budgeted - spent;
      return {
        ...month,
        balance: savedBalance
      };
    })
    .sort((a, b) => b.key.localeCompare(a.key));

  if (!monthlyData.length) {
    accessors.monthlySavingsList.innerHTML = '<div class="empty-state">No monthly saving data yet. Add a payment to begin tracking.</div>';
    return;
  }

  accessors.monthlySavingsList.innerHTML = monthlyData
    .slice(0, 6)
    .map((month) => `
      <div class="monthly-saving-item">
        <div class="month-label">
          <strong>${escapeHtml(month.label)}</strong>
          <span>${formatCurrency(month.balance >= 0 ? month.balance : Math.abs(month.balance))} ${month.balance >= 0 ? 'saved' : 'over budget'}</span>
        </div>
        <div class="month-balance" style="color: ${month.balance >= 0 ? 'var(--success)' : 'var(--danger)'};">
          ${formatCurrency(month.balance)}
        </div>
      </div>
    `)
    .join('');
}

function renderBudgetPieChart(totalBudget) {
  if (!state.budgets.length || totalBudget <= 0) {
    accessors.budgetPieChart.style.background = 'conic-gradient(#e5e7eb 0 100%)';
    accessors.chartLegend.innerHTML = '<div class="chart-legend-item"><span class="legend-left"><span class="legend-dot" style="background:#e5e7eb"></span>No budgets</span><strong>$0.00</strong></div>';
    return;
  }

  let currentAngle = 0;
  const segments = state.budgets.map((budget) => {
    const size = (Number(budget.limit || 0) / totalBudget) * 100;
    const start = currentAngle;
    currentAngle += size;
    return { ...budget, start, size };
  });

  const gradient = segments
    .map((budget) => `${budget.color} ${budget.start}% ${budget.start + budget.size}%`)
    .join(', ');

  accessors.budgetPieChart.style.background = `conic-gradient(${gradient})`;
  accessors.chartLegend.innerHTML = segments
    .map((budget) => `
      <div class="chart-legend-item">
        <span class="legend-left"><span class="legend-dot" style="background:${budget.color}"></span>${escapeHtml(budget.name)}</span>
        <strong>${formatCurrency(budget.limit)}</strong>
      </div>
    `)
    .join('');
}

function renderBudgets() {
  if (!state.budgets.length) {
    accessors.budgetsList.innerHTML = '<div class="empty-state">No budgets yet. Add your first category to get started.</div>';
    return;
  }

  accessors.budgetsList.innerHTML = state.budgets
    .map((budget) => {
      const spent = state.expenses
        .filter((expense) => expense.categoryId === budget.id)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      const remaining = Number(budget.limit || 0) - spent;
      const percentage = Math.min((spent / (Number(budget.limit) || 1)) * 100, 100);
      const progressWidth = Math.min(percentage, 100);

      return `
        <article class="budget-item">
          <div class="budget-topline">
            <div class="budget-name-wrap">
              <span class="category-dot" style="background: ${budget.color};"></span>
              <span class="budget-name">${escapeHtml(budget.name)}</span>
            </div>
            <div class="budget-actions">
              <button type="button" class="icon-btn" data-edit-budget="${budget.id}">Edit</button>
            </div>
          </div>

          <div class="budget-meta">
            <span>Spent ${formatCurrency(spent)}</span>
            <span>${remaining >= 0 ? 'Left' : 'Over'} ${formatCurrency(Math.abs(remaining))}</span>
          </div>

          <div class="progress">
            <div class="progress-bar" style="width: ${progressWidth}%; background: ${budget.color};"></div>
          </div>

          <div class="budget-meta">
            <span>Limit ${formatCurrency(budget.limit)}</span>
            <strong style="color: ${remaining < 0 ? 'var(--danger)' : 'var(--success)'};">${formatCurrency(remaining)}</strong>
          </div>
        </article>
      `;
    })
    .join('');

  document.querySelectorAll('[data-edit-budget]').forEach((button) => {
    button.addEventListener('click', () => {
      const budget = state.budgets.find((item) => item.id === button.dataset.editBudget);
      if (!budget) return;

      accessors.budgetId.value = budget.id;
      accessors.budgetName.value = budget.name;
      accessors.budgetAmount.value = budget.limit;
      accessors.budgetName.focus();
    });
  });
}

function renderTransactions() {
  if (!state.expenses.length) {
    accessors.transactionsList.innerHTML = '<div class="empty-state">No payments yet. Add your first expense to track spending.</div>';
    return;
  }

  accessors.transactionsList.innerHTML = state.expenses
    .slice(0, 8)
    .map((expense) => {
      const budget = state.budgets.find((item) => item.id === expense.categoryId);
      const label = budget ? budget.name : 'Unknown';
      const noteText = expense.note ? ` • ${escapeHtml(expense.note)}` : '';

      return `
        <div class="transaction-item">
          <div class="transaction-main">
            <strong>${label}</strong>
            <span class="transaction-meta">${new Date(expense.date).toLocaleDateString()}${noteText}</span>
          </div>
          <span class="amount-tag negative">-${formatCurrency(expense.amount)}</span>
        </div>
      `;
    })
    .join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

initialize();
