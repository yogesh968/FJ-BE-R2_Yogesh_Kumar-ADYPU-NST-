const API_URL = window.location.hostname === 'localhost'
    ? '/api/v1'
    : 'https://fj-provider.onrender.com/api/v1';
let token = localStorage.getItem('token');
let charts = { trend: null, category: null, budget: null };

// --- Initialization & Auth Check ---
function checkAuth() {
    const landingPage = document.getElementById('landing-page');
    const appPage = document.getElementById('app-page');
    const authModal = document.getElementById('auth-modal');

    if (token) {
        landingPage.classList.add('hidden');
        appPage.classList.remove('hidden');
        authModal.classList.add('hidden');

        updateTopLevelUserUI();
        populateTimeDropdowns(); // Ensure dropdowns are ready

        const initialRoute = window.location.hash.replace('#', '') || 'dashboard';
        showSection(initialRoute, null, false); // null for event, false for updateHash
        refreshData();
        gsap.from('main', { opacity: 0, y: 10, duration: 0.5 });
    } else {
        landingPage.classList.remove('hidden');
        appPage.classList.add('hidden');
    }
}

function updateTopLevelUserUI() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    // Sidebar update
    const sideName = document.getElementById('side-user-name');
    const sideAvatar = document.getElementById('side-user-avatar');
    if (sideName) sideName.innerText = user.name || 'User';
    if (sideAvatar) {
        if (user.avatar) {
            sideAvatar.innerHTML = `<img src="${user.avatar}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            sideAvatar.innerText = (user.name || 'U').charAt(0).toUpperCase();
        }
    }
}

function populateTimeDropdowns() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthOptions = months.map((m, i) => `<option value="${i + 1}" ${i + 1 === currentMonth ? 'selected' : ''}>${m}</option>`).join('');
    const yearOptions = [currentYear - 1, currentYear, currentYear + 1].map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('');

    ['bg-view-month', 'bg-month'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = monthOptions;
    });
    ['bg-view-year', 'bg-year'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = yearOptions;
    });
}

// --- Auth UI Logic ---
function openAuthModal(mode) {
    const modal = document.getElementById('auth-modal');
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const switchLink = document.getElementById('auth-switch-link');
    const switchText = document.getElementById('auth-switch-text');

    if (mode === 'login') {
        title.innerText = 'Welcome back';
        subtitle.innerText = 'Sync your finance workspace across all devices.';
        switchText.innerText = 'New to FINANCE FJ?';
        switchLink.innerText = 'Create an account';
    } else {
        title.innerText = 'Start for free';
        subtitle.innerText = 'Join 50,000+ others taking control of their wealth.';
        switchText.innerText = 'Already have an account?';
        switchLink.innerText = 'Sign in';
    }

    modal.classList.remove('hidden');
    gsap.from('.auth-card', { scale: 0.95, opacity: 0, duration: 0.3, ease: 'back.out(1.7)' });
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function toggleAuth() {
    const title = document.getElementById('auth-title');
    openAuthModal(title.innerText === 'Welcome back' ? 'register' : 'login');
}

// --- Auth Handling ---
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const title = document.getElementById('auth-title').innerText;

    if (!email || !password) return showToast('Email and password required', 'error');

    try {
        if (title !== 'Welcome back') {
            await apiRequest('/auth/register', 'POST', { email, password, name: email.split('@')[0] });
        }
        const res = await apiRequest('/auth/login', 'POST', { email, password });
        token = res.data.accessToken;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        showToast('Login successful');
        window.location.hash = 'dashboard';
        checkAuth();
    } catch (err) {
        showToast(err.message || 'Authentication failed', 'error');
    }
}

function logout() {
    token = null;
    localStorage.removeItem('token');
    window.location.hash = '';
    checkAuth();
}

// --- Core Utilities ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.style = `
        position: fixed; bottom: 2rem; right: 2rem; 
        background: ${type === 'success' ? '#111827' : '#ef4444'}; 
        color: white; padding: 1rem 1.5rem; border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); font-weight: 500;
        z-index: 9999;
    `;
    toast.innerText = message;
    container.appendChild(toast);
    gsap.from(toast, { x: 50, opacity: 0, duration: 0.3 });
    setTimeout(() => {
        gsap.to(toast, { x: 20, opacity: 0, duration: 0.3, onComplete: () => toast.remove() });
    }, 3000);
}

const formatCurrency = (val, currency = 'USD') => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
}).format(val);

async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    if (body && method !== 'GET') {
        if (body instanceof FormData) {
            options.body = body;
            // browser sets Content-Type with boundary automatically for FormData
        } else {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
    }
    try {
        const res = await fetch(`${API_URL}${endpoint}`, options);
        // Handle non-JSON or error responses gracefully
        const contentType = res.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await res.json();
        } else {
            data = { message: await res.text() };
        }

        if (!res.ok) throw data;
        return data;
    } catch (err) {
        if (err.statusCode === 401 || err.message === 'Unauthorized') logout();
        throw err;
    }
}

// --- Dashboard & Data ---
async function refreshData() {
    console.log('Starting data refresh...');
    try {
        await fetchCategories();

        const [dashRes, txRes] = await Promise.all([
            apiRequest('/dashboard').catch(e => { console.error('Dash error', e); return { data: null }; }),
            apiRequest('/transactions?limit=50').catch(e => { console.error('Tx error', e); return { data: { transactions: [] } }; })
        ]);

        if (!dashRes || !dashRes.data) {
            console.warn('Dashboard data missing');
            return;
        }

        const transactions = txRes.data?.transactions || [];
        const summary = dashRes.data.summary?.allTime || { total_income: 0, total_expenses: 0, total_savings: 0 };
        const history = dashRes.data.summary?.history || [];

        document.getElementById('total-balance').innerText = formatCurrency(summary.total_savings || 0);
        document.getElementById('total-income').innerText = formatCurrency(summary.total_income || 0);
        document.getElementById('total-expenses').innerText = formatCurrency(summary.total_expenses || 0);

        const monthly = dashRes.data.summary?.monthly || { month_income: 0, month_expenses: 0 };
        document.getElementById('month-income').innerText = formatCurrency(monthly.month_income);
        document.getElementById('month-expenses').innerText = formatCurrency(monthly.month_expenses);

        renderCharts(transactions, summary.total_savings, dashRes.data.breakdown, history, monthly.budgetComparison);
        renderRecentActivity(transactions);

        const currentHash = window.location.hash.replace('#', '') || 'dashboard';
        if (currentHash === 'transactions') fetchTransactions();
        if (currentHash === 'budgets') fetchBudgets();

        console.log('UI Refresh finished');
    } catch (err) {
        console.error('Data refresh fatal error', err);
        showToast('Connection error. Please refresh.', 'error');
    }
}


function renderRecentActivity(transactions) {
    const container = document.getElementById('dashboard-recent-list');
    if (!transactions.length) {
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">No transactions yet.</p>';
        return;
    }

    container.innerHTML = transactions.map(t => {
        const date = new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 0; border-bottom: 1px solid #f3f4f6;">
            <div style="display: flex; gap: 1rem; align-items: center;">
                <div style="background: var(--accent); width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 0.75rem; font-weight: 700;">
                    ${date}
                </div>
                <div>
                    <p style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">${t.description || 'System Entry'}</p>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">${t.category.name}</p>
                </div>
            </div>
            <div style="text-align: right;">
                <p style="font-weight: 700; color: ${t.category.type === 'INCOME' ? 'var(--success)' : 'var(--text-main)'}">
                    ${t.category.type === 'INCOME' ? '+' : '-'}${formatCurrency(t.amount, t.currency)}
                </p>
                <p style="font-size: 0.7rem; color: var(--text-muted);">ID: ${t.id.split('-')[0]}</p>
            </div>
        </div>
    `}).join('');
}

function renderCharts(transactions, currentBalance, categoryBreakdown, history, budgetComparison) {
    // 1. Cash Flow Summary (Bar Chart: Income vs Expense)
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    if (charts.trend) charts.trend.destroy();

    const labels = (history || []).map(h => h.month);
    const incomeData = (history || []).map(h => h.income);
    const expenseData = (history || []).map(h => h.expense);

    charts.trend = new Chart(trendCtx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#10b981',
                    borderRadius: 6,
                    barThickness: 20
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: '#ef4444',
                    borderRadius: 6,
                    barThickness: 20
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { boxWidth: 12, usePointStyle: true, font: { family: 'Inter', size: 11 } }
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    padding: 10,
                    titleFont: { size: 12, weight: 'bold' },
                    bodyFont: { size: 12 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { borderDash: [5, 5], color: '#f3f4f6' },
                    ticks: { color: '#9ca3af', font: { size: 10 }, callback: (v) => '$' + v }
                },
                x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 } } }
            }
        }
    });

    // 2. Expense Allocation (Doughnut Chart)
    const catCtx = document.getElementById('categoryChart').getContext('2d');
    if (charts.category) charts.category.destroy();

    const expenses = (categoryBreakdown || []).filter(c => c.category_type === 'EXPENSE');
    const catLabels = expenses.map(c => c.category_name);
    const catData = expenses.map(c => parseFloat(c.total_amount));

    charts.category = new Chart(catCtx, {
        type: 'doughnut',
        data: {
            labels: catLabels,
            datasets: [{
                data: catData,
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'],
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 10,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        font: { size: 11, family: 'Inter' },
                        padding: 15
                    }
                }
            }
        }
    });

    // 3. Budget vs Actual (Grouped Bar Chart)
    const budgetCtx = document.getElementById('budgetChart')?.getContext('2d');
    if (budgetCtx) {
        if (charts.budget) charts.budget.destroy();

        const bLabels = (budgetComparison || []).map(b => b.category);
        const bBudgetData = (budgetComparison || []).map(b => b.budget);
        const bActualData = (budgetComparison || []).map(b => b.actual);

        charts.budget = new Chart(budgetCtx, {
            type: 'bar',
            data: {
                labels: bLabels.length ? bLabels : ['No Budgets Set'],
                datasets: [
                    {
                        label: 'Budget Limit',
                        data: bBudgetData.length ? bBudgetData : [0],
                        backgroundColor: '#e5e7eb',
                        borderRadius: 4,
                        barThickness: 30
                    },
                    {
                        label: 'Actual Spend',
                        data: bActualData.length ? bActualData : [0],
                        backgroundColor: (context) => {
                            const index = context.dataIndex;
                            const budget = bBudgetData[index];
                            const actual = bActualData[index];
                            return actual > budget ? '#f87171' : '#6366f1';
                        },
                        borderRadius: 4,
                        barThickness: 30
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Horizontal bars for easier reading of categories
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, usePointStyle: true, font: { size: 11 } }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { borderDash: [5, 5], color: '#f3f4f6' },
                        ticks: { callback: (v) => '$' + v }
                    },
                    y: { grid: { display: false } }
                }
            }
        });
    }
}


// --- App Action Logic ---
async function fetchCategories(typeFilter = null) {
    try {
        const res = await apiRequest('/categories');
        let cats = res.data;
        if (typeFilter) {
            cats = cats.filter(c => c.type === typeFilter);
        }
        const options = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        ['tr-category', 'bg-category'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = options;
        });
    } catch (err) {
        console.warn('Silent category fetch failure', err);
    }
}

async function addTransaction() {
    const amount = document.getElementById('tr-amount').value;
    const currency = document.getElementById('tr-currency').value;
    const date = document.getElementById('tr-date').value;
    const desc = document.getElementById('tr-desc').value;
    const catId = document.getElementById('tr-category').value;
    const receiptFile = document.getElementById('tr-receipt').files[0];

    if (!amount || !date) return showToast('Amount and date required', 'error');

    try {
        const formData = new FormData();
        formData.append('amount', amount);
        formData.append('currency', currency);
        formData.append('date', date);
        formData.append('description', desc);
        formData.append('categoryId', catId);
        if (receiptFile) formData.append('receipt', receiptFile);

        await apiRequest('/transactions', 'POST', formData);
        showToast('Transaction saved');
        closeModal('transaction-modal');
        refreshData();
        // Clear file input
        document.getElementById('tr-receipt').value = '';
        document.getElementById('receipt-label').innerHTML = '<p style="font-size: 0.85rem; color: var(--text-muted);">Click or drag receipt photo</p>';
    } catch (err) {
        showToast(err.message || 'Error saving transaction', 'error');
    }
}

async function updateProfile() {
    const name = document.getElementById('update-name').value;
    const password = document.getElementById('update-password').value;

    try {
        const res = await apiRequest('/auth/profile', 'PATCH', { name, ...(password && { password }) });
        localStorage.setItem('user', JSON.stringify(res.data));
        showToast('Profile updated');
        updateTopLevelUserUI();
    } catch (err) {
        showToast('Update failed', 'error');
    }
}

async function addBudget() {
    const amount = document.getElementById('bg-amount').value;
    const catId = document.getElementById('bg-category').value;
    const month = document.getElementById('bg-month').value;
    const year = document.getElementById('bg-year').value;

    try {
        await apiRequest('/budgets', 'POST', { amount: parseFloat(amount), categoryId: catId, month: parseInt(month), year: parseInt(year) });
        showToast('Budget saved');
        closeModal('budget-modal');
        refreshData(); // Triggers global update for all sections
    } catch (err) { showToast('Error saving budget', 'error'); }
}

function renderBudgetList(budgets) {
    const list = document.getElementById('budget-list');

    // Calculate totals for summary bar
    const totalBudgeted = (budgets || []).reduce((acc, b) => acc + parseFloat(b.amount || 0), 0);
    const totalSpent = (budgets || []).reduce((acc, b) => acc + parseFloat(b.spent || 0), 0);
    const totalRemaining = totalBudgeted - totalSpent;

    const elBudgeted = document.getElementById('total-budgeted');
    const elSpent = document.getElementById('total-budget-spent');
    const elRem = document.getElementById('total-budget-remaining');

    if (elBudgeted) elBudgeted.innerText = formatCurrency(totalBudgeted);
    if (elSpent) elSpent.innerText = formatCurrency(totalSpent);
    if (elRem) elRem.innerText = formatCurrency(totalRemaining);

    if (!budgets.length) {
        list.innerHTML = `
            <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem;">
                <div style="background: var(--accent); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: var(--primary);">
                    <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h3>No budgets established</h3>
                <p style="color: var(--text-muted); margin-bottom: 2rem;">Start controlling your wealth by setting category-wise spending limits.</p>
                <button class="btn btn-primary" onclick="openBudgetModal()">Create your first budget</button>
            </div>
        `;
        return;
    }

    list.innerHTML = budgets.map(b => {
        const progress = Math.min((b.spent / b.amount) * 100, 100);
        const remaining = b.amount - b.spent;
        const statusColor = b.isOverrun ? 'var(--danger)' : progress > 80 ? '#f59e0b' : 'var(--success)';

        return `
            <div class="card budget-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
                    <div>
                        <span class="category-badge">${b.category.name}</span>
                        <h4 style="margin-top: 0.5rem; font-size: 1.1rem; font-weight: 700;">${formatCurrency(b.amount)}</h4>
                        <p style="font-size: 0.8rem; color: var(--text-muted);">Limit for ${new Date(0, b.month - 1).toLocaleString('default', { month: 'long' })}</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-weight: 700; color: ${statusColor};">${Math.round(progress)}%</span>
                        <p style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Used</p>
                    </div>
                </div>
                
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${progress}%; background: ${statusColor};"></div>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-top: 1.25rem;">
                    <div>
                        <p style="font-size: 0.75rem; color: var(--text-muted);">Spent</p>
                        <p style="font-weight: 600; font-size: 0.9rem;">${formatCurrency(b.spent)}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="font-size: 0.75rem; color: var(--text-muted);">${remaining >= 0 ? 'Remaining' : 'Overrun'}</p>
                        <p style="font-weight: 600; font-size: 0.9rem; color: ${remaining < 0 ? 'var(--danger)' : 'var(--text-main)'}">${formatCurrency(Math.abs(remaining))}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function fetchBudgets() {
    const monthEl = document.getElementById('bg-view-month');
    const yearEl = document.getElementById('bg-view-year');

    // Fallback to current if views aren't ready
    const month = monthEl?.value || (new Date().getMonth() + 1);
    const year = yearEl?.value || new Date().getFullYear();

    try {
        const res = await apiRequest(`/budgets/status?month=${month}&year=${year}`);
        console.log(`Fetched ${res.data?.length || 0} budgets for ${month}/${year}`);
        renderBudgetList(res.data);
    } catch (err) {
        showToast('Failed to load budgets', 'error');
        console.error(err);
    }
}

async function fetchTransactions() {
    try {
        const res = await apiRequest('/transactions?limit=50');
        const list = document.getElementById('transaction-list');
        list.innerHTML = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="text-align: left; color: var(--text-muted); font-size: 0.85rem;">
                    <tr>
                        <th style="padding: 1rem 0;">Date</th>
                        <th style="padding: 1rem 0;">Description</th>
                        <th style="padding: 1rem 0;">Category</th>
                        <th style="text-align: right; padding: 1rem 0;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${res.data.transactions.map(t => `
                        <tr style="border-top: 1px solid #f3f4f6;">
                            <td style="padding: 1rem 0; font-size: 0.9rem;">${new Date(t.date).toLocaleDateString()}</td>
                            <td style="padding: 1rem 0; font-weight: 500;">${t.description || '-'}</td>
                            <td style="padding: 1rem 0; font-size: 0.9rem; color: var(--text-muted);">${t.category.name}</td>
                            <td style="text-align: right; padding: 1rem 0; font-weight: 600;">${formatCurrency(t.amount, t.currency)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        showToast('Failed to load transactions', 'error');
        console.error(err);
    }
}

async function generateDemoData() {
    try {
        showToast('Initializing finance architecture...', 'info');

        // 1. Create a broad set of realistic categories
        const categories = [
            { name: 'Investment Returns', type: 'INCOME' },
            { name: 'Advisory Income', type: 'INCOME' },
            { name: 'Operational Rent', type: 'EXPENSE' },
            { name: 'Tech Infrastructure', type: 'EXPENSE' },
            { name: 'Corporate Travel', type: 'EXPENSE' },
            { name: 'Luxury Lifestyle', type: 'EXPENSE' },
            { name: 'Asset Maintenance', type: 'EXPENSE' }
        ];

        const createdCategories = [];
        for (const cat of categories) {
            const res = await apiRequest('/categories', 'POST', cat).catch(() => null);
            if (res) createdCategories.push(res.data);
        }

        // Fetch all categories to ensure we have IDs for everything
        const allCats = await apiRequest('/categories');
        const incomeCats = allCats.data.filter(c => c.type === 'INCOME');
        const expenseCats = allCats.data.filter(c => c.type === 'EXPENSE');

        if (incomeCats.length === 0 || expenseCats.length === 0) {
            throw new Error('Could not establish category taxonomy');
        }

        // 2. Insert realistic transactions for the last 45 days
        const now = new Date();
        const descriptions = {
            INCOME: ['Quarterly Dividend', 'Equity Liquidation', 'Consulting Retainer', 'Yield Reward'],
            EXPENSE: ['AWS Multi-region Cloud', 'Office Lease - Q1', 'Executive Dining', 'Client Acquisition', 'Software Licensing', 'Security Audit']
        };

        for (let i = 0; i < 25; i++) {
            const isIncome = Math.random() > 0.7;
            const incomeDescs = ['Monthly Salary', 'Dividend Payout', 'Consulting Fee', 'Freelance Project', 'Asset Liquidation'];
            const expenseDescs = ['Starbucks Coffee', 'Amazon Purchase', 'Utility Bill', 'Gas Station', 'Grocery Store', 'Netflix Subscription', 'Gym Membership'];

            const description = isIncome
                ? incomeDescs[Math.floor(Math.random() * incomeDescs.length)]
                : expenseDescs[Math.floor(Math.random() * expenseDescs.length)];

            const date = new Date();
            date.setDate(now.getDate() - Math.floor(Math.random() * 45));

            await apiRequest('/transactions', 'POST', {
                amount: isIncome ? (4000 + Math.random() * 8000) : (50 + Math.random() * 1200),
                date: date.toISOString().split('T')[0],
                description,
                categoryId: (isIncome ? incomeCats : expenseCats)[Math.floor(Math.random() * (isIncome ? incomeCats : expenseCats).length)].id
            });
        }

        // 3. Set a sample budget for the biggest expense category
        if (expenseCats.length > 0) {
            await apiRequest('/budgets', 'POST', {
                categoryId: expenseCats[0].id,
                amount: 5000,
                month: now.getMonth() + 1,
                year: now.getFullYear()
            }).catch(() => null);
        }

        showToast('Finance profile generated successfully');
        refreshData();
    } catch (err) {
        showToast('Calibration interrupted: ' + (err.message || 'System error'), 'error');
    }
}


// --- Navigation ---
function showSection(id, event = null, updateHash = true) {
    if (event) event.preventDefault();

    const validSections = ['dashboard', 'transactions', 'budgets', 'profile'];
    if (!validSections.includes(id)) id = 'dashboard';

    // Prevent recursive calls and redundant animations if already on the section
    const currentActive = document.querySelector('section:not(.hidden)');
    if (currentActive && currentActive.id === id) return;

    validSections.forEach(s => {
        const el = document.getElementById(s);
        const nav = document.getElementById(`nav-${s}`);
        if (el) el.classList.add('hidden');
        if (nav) nav.classList.remove('active');
    });

    const target = document.getElementById(id);
    const targetNav = document.getElementById(`nav-${id}`);

    if (target) {
        target.classList.remove('hidden');
        if (id === 'profile') {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                document.getElementById('prof-name-display').innerText = user.name || 'User';
                document.getElementById('prof-email-display').innerText = user.email;
                document.getElementById('prof-email-readonly').value = user.email;

                const initialsEl = document.getElementById('prof-initial-large');
                if (user.avatar) {
                    initialsEl.innerHTML = `<img src="${user.avatar}" style="width: 100%; height: 100%; object-fit: cover;">`;
                } else {
                    initialsEl.innerText = (user.name || 'U').charAt(0).toUpperCase();
                }

                document.getElementById('update-name').value = user.name || '';

                // Fetch dynamic stats for profile
                apiRequest('/transactions?limit=1').then(res => {
                    const count = res.data?.total || 0;
                    document.getElementById('prof-tx-count').innerText = `${count} Ledger Entries`;
                }).catch(() => {
                    document.getElementById('prof-tx-count').innerText = 'Data Sync Error';
                });
            }
        }
        target.classList.remove('hidden');
        // Kill existing animations to prevent "white screen" (opacity stuck at near-zero)
        gsap.killTweensOf(target);
        gsap.fromTo(target,
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', clearProps: 'all' }
        );
    }

    if (targetNav) targetNav.classList.add('active');

    if (updateHash && window.location.hash !== `#${id}`) {
        window.location.hash = id;
    }

    if (id === 'transactions') fetchTransactions();
    if (id === 'budgets') fetchBudgets();
}

async function uploadAvatar(input) {
    if (!input.files || !input.files[0]) return;

    const formData = new FormData();
    formData.append('avatar', input.files[0]);

    try {
        const res = await apiRequest('/auth/avatar', 'POST', formData);
        localStorage.setItem('user', JSON.stringify(res.data));
        showToast('Profile picture updated!');
        updateTopLevelUserUI();
        showSection('profile', null, false);
    } catch (err) {
        showToast(err.message || 'Failed to upload photo', 'error');
    }
}

function openTransactionModal(type = null) {
    fetchCategories(type); // Filter options if type is provided
    document.getElementById('transaction-modal').classList.remove('hidden');
}
function openBudgetModal() {
    fetchCategories('EXPENSE'); // Budgets are normally for expenses
    document.getElementById('budget-modal').classList.remove('hidden');
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// --- Init ---
checkAuth();

window.addEventListener('hashchange', () => {
    if (token) {
        const route = window.location.hash.replace('#', '');
        showSection(route, null, false);
    }
});
// Handle receipt selection feedback
document.getElementById('tr-receipt')?.addEventListener('change', function (e) {
    const label = document.getElementById('receipt-label');
    if (this.files[0]) {
        label.innerHTML = `<svg width="24" height="24" fill="none" stroke="var(--success)" stroke-width="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg><p style="color: var(--success); font-weight: 600;">${this.files[0].name}</p>`;
    }
});
