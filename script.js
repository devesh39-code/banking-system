/**
 * Banking System Frontend
 * Handles all API interactions, UI updates, and user actions
 */

// API Base URL
const API_BASE = '';

// DOM Elements
const balanceDisplay = document.getElementById('balanceDisplay');
const accountTypeSpan = document.getElementById('accountType');
const accountNumberSpan = document.getElementById('accountNumber');
const transactionRows = document.getElementById('transactionRows');
const depositBtn = document.getElementById('depositBtn');
const withdrawBtn = document.getElementById('withdrawBtn');
const depositAmount = document.getElementById('depositAmount');
const withdrawAmount = document.getElementById('withdrawAmount');
const toast = document.getElementById('toast');
const validationBadge = document.getElementById('validation-badge');

// State
let currentBalance = 0;
let isLoading = false;

/**
 * Format currency for display
 */
function formatCurrency(amount) {
    return '$' + amount.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

/**
 * Show toast notification
 */
function showToast(message, isError = false) {
    toast.textContent = message;
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    
    setTimeout(() => {
        toast.className = 'toast hidden';
    }, 3000);
}

/**
 * Show loading state on buttons
 */
function setLoading(button, loading) {
    if (loading) {
        button.classList.add('loading');
        button.textContent = 'Processing...';
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.textContent = button.id === 'depositBtn' ? 'DEPOSIT FUNDS' : 'WITHDRAW FUNDS';
        button.disabled = false;
    }
}

/**
 * Validate account with backend
 */
async function validateAccount() {
    try {
        const response = await fetch(`${API_BASE}/api/validate-account`);
        const data = await response.json();
        
        if (data.account_valid) {
            validationBadge.textContent = '✓ Account Validated';
            validationBadge.classList.remove('invalid');
            return true;
        } else {
            validationBadge.textContent = '⚠ Account Invalid';
            validationBadge.classList.add('invalid');
            showToast('Account validation failed', true);
            return false;
        }
    } catch (error) {
        console.error('Account validation error:', error);
        validationBadge.textContent = '⚠ Connection Error';
        validationBadge.classList.add('invalid');
        return false;
    }
}

/**
 * Fetch current balance from backend
 */
async function fetchBalance() {
    try {
        const response = await fetch(`${API_BASE}/api/balance`);
        const data = await response.json();
        
        if (data.success) {
            currentBalance = data.balance;
            balanceDisplay.textContent = formatCurrency(currentBalance);
            accountTypeSpan.textContent = data.account_type || 'Savings Account';
            accountNumberSpan.textContent = data.account_number || '**** 0000';
            return data.balance;
        } else {
            throw new Error(data.error || 'Failed to fetch balance');
        }
    } catch (error) {
        console.error('Fetch balance error:', error);
        showToast('Failed to load balance', true);
        return null;
    }
}

/**
 * Fetch and render transaction history
 */
async function fetchTransactions() {
    try {
        const response = await fetch(`${API_BASE}/api/transactions`);
        const data = await response.json();
        
        if (data.success && data.transactions) {
            renderTransactions(data.transactions);
            return data.transactions;
        } else {
            throw new Error('Failed to load transactions');
        }
    } catch (error) {
        console.error('Fetch transactions error:', error);
        transactionRows.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">Failed to load transactions</td></tr>';
        return [];
    }
}

/**
 * Render transaction list in table
 */
function renderTransactions(transactions) {
    if (!transactions || transactions.length === 0) {
        transactionRows.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">No transactions found</td></tr>';
        return;
    }
    
    transactionRows.innerHTML = '';
    
    transactions.forEach(tx => {
        const row = document.createElement('tr');
        const isPositive = tx.type === 'Deposit';
        const amountClass = isPositive ? 'tx-positive' : 'tx-negative';
        const amountSign = isPositive ? '+' : '-';
        const isFailed = tx.status && tx.status.toLowerCase().includes('failed');
        
        row.innerHTML = `
            <td>${tx.date || 'N/A'}</td>
            <td>${tx.type || 'N/A'}</td>
            <td>${tx.description || 'N/A'}</td>
            <td class="${amountClass}">${amountSign}${formatCurrency(tx.amount || 0)}</td>
            <td class="status-badge ${isFailed ? 'failed' : ''}">${tx.status || 'Completed'}</td>
        `;
        transactionRows.appendChild(row);
    });
}

/**
 * Perform deposit operation
 */
async function performDeposit() {
    const amount = parseFloat(depositAmount.value);
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid amount greater than zero', true);
        return;
    }
    
    setLoading(depositBtn, true);
    
    try {
        const response = await fetch(`${API_BASE}/api/deposit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showToast(data.message || `Successfully deposited ${formatCurrency(amount)}`);
            depositAmount.value = '';
            await fetchBalance();
            await fetchTransactions();
        } else {
            showToast(data.error || 'Deposit failed', true);
        }
    } catch (error) {
        console.error('Deposit error:', error);
        showToast('Network error. Please try again.', true);
    } finally {
        setLoading(depositBtn, false);
    }
}

/**
 * Perform withdraw operation with balance validation
 */
async function performWithdraw() {
    const amount = parseFloat(withdrawAmount.value);
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid amount greater than zero', true);
        return;
    }
    
    setLoading(withdrawBtn, true);
    
    try {
        const response = await fetch(`${API_BASE}/api/withdraw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showToast(data.message || `Successfully withdrew ${formatCurrency(amount)}`);
            withdrawAmount.value = '';
            await fetchBalance();
            await fetchTransactions();
        } else {
            showToast(data.error || 'Withdrawal failed', true);
        }
    } catch (error) {
        console.error('Withdraw error:', error);
        showToast('Network error. Please try again.', true);
    } finally {
        setLoading(withdrawBtn, false);
    }
}

/**
 * Initialize dashboard - load all data
 */
async function initializeDashboard() {
    // Validate account first
    const isValid = await validateAccount();
    
    if (!isValid) {
        showToast('Account validation in progress...', false);
    }
    
    // Load balance and transactions
    await fetchBalance();
    await fetchTransactions();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    depositBtn.addEventListener('click', performDeposit);
    withdrawBtn.addEventListener('click', performWithdraw);
    
    // Enter key support
    depositAmount.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performDeposit();
    });
    
    withdrawAmount.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performWithdraw();
    });
}

/**
 * Tab switching functionality
 */
function setupTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const dashboardTab = document.querySelector('.dashboard-grid');
    let transactionsTab = null;
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.getAttribute('data-tab');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            if (tab === 'transactions') {
                if (!transactionsTab) {
                    transactionsTab = createTransactionsTab();
                }
                if (dashboardTab) dashboardTab.style.display = 'none';
                if (transactionsTab) transactionsTab.style.display = 'block';
                fetchTransactions();
            } else {
                if (dashboardTab) dashboardTab.style.display = 'grid';
                if (transactionsTab) transactionsTab.style.display = 'none';
            }
        });
    });
}

function createTransactionsTab() {
    const tab = document.createElement('div');
    tab.className = 'transactions-full-view';
    tab.style.display = 'none';
    tab.innerHTML = `
        <div class="section-title">TRANSACTION HISTORY</div>
        <div class="table-card-wrapper">
            <table class="transaction-table">
                <thead>
                    <tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody id="fullTransactionRows"></tbody>
            </table>
        </div>
    `;
    document.querySelector('.main-content').appendChild(tab);
    
    // Override render to update full view
    const originalRender = renderTransactions;
    window.renderFullTransactions = (transactions) => {
        const fullRows = document.getElementById('fullTransactionRows');
        if (!fullRows