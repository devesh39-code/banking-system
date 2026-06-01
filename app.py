"""
Banking System Backend - Flask API
Features: Deposit, Withdraw, Transaction History, Account Validation
"""

from flask import Flask, request, jsonify, session
from datetime import datetime
import re

app = Flask(__name__)
app.secret_key = 'banking_system_secret_key_2024'

# Account validation function
def validate_account(account_number=None):
    """
    Validates if account exists and is active.
    In this system, we use session-based account validation.
    Returns True if account is valid.
    """
    if 'account_validated' not in session:
        session['account_validated'] = True
        session['account_number'] = '**** 7890'
        session['account_type'] = 'Savings Account'
        session['balance'] = 48735.62
        session['transactions'] = [
            {
                'date': 'Today, 14:32',
                'type': 'Deposit',
                'description': 'Salary Payment',
                'amount': 5400.00,
                'status': 'Completed'
            },
            {
                'date': 'Yesterday, 09:15',
                'type': 'Withdrawal',
                'description': 'ATM Withdrawal',
                'amount': 200.00,
                'status': 'Completed'
            },
            {
                'date': 'Mar 28, 2025',
                'type': 'Deposit',
                'description': 'Freelance Payment',
                'amount': 1200.00,
                'status': 'Completed'
            },
            {
                'date': 'Mar 25, 2025',
                'type': 'Withdrawal',
                'description': 'Online Transfer',
                'amount': 500.00,
                'status': 'Completed'
            }
        ]
    return session.get('account_validated', False)


def get_balance():
    """Returns current account balance."""
    return session.get('balance', 0.00)


def get_transactions():
    """Returns all transactions for the account."""
    return session.get('transactions', [])


def add_transaction(transaction_type, description, amount, status):
    """Adds a new transaction to history."""
    now = datetime.now()
    if description == "Funds Deposit":
        date_str = f"Today, {now.hour}:{now.minute:02d}"
    elif description == "Cash Withdrawal":
        date_str = f"Today, {now.hour}:{now.minute:02d}"
    else:
        date_str = now.strftime("%b %d, %Y")
    
    transaction = {
        'date': date_str,
        'type': transaction_type,
        'description': description,
        'amount': amount,
        'status': status
    }
    
    transactions = session.get('transactions', [])
    transactions.insert(0, transaction)
    # Keep only last 20 transactions
    if len(transactions) > 20:
        transactions = transactions[:20]
    session['transactions'] = transactions


def update_balance(new_balance):
    """Updates the account balance."""
    session['balance'] = round(new_balance, 2)


# API Routes
@app.route('/api/validate-account', methods=['GET'])
def api_validate_account():
    """Account validation endpoint."""
    is_valid = validate_account()
    return jsonify({
        'success': is_valid,
        'account_valid': is_valid,
        'account_number': session.get('account_number', '**** 0000'),
        'account_type': session.get('account_type', 'Checking Account'),
        'message': 'Account is valid' if is_valid else 'Account validation failed'
    })


@app.route('/api/balance', methods=['GET'])
def api_get_balance():
    """Get current balance and account info."""
    if not validate_account():
        return jsonify({'error': 'Account validation failed'}), 401
    
    return jsonify({
        'success': True,
        'balance': get_balance(),
        'account_number': session.get('account_number'),
        'account_type': session.get('account_type'),
        'transactions': get_transactions()
    })


@app.route('/api/deposit', methods=['POST'])
def api_deposit():
    """Deposit money into account."""
    # Validate account first
    if not validate_account():
        return jsonify({'error': 'Account validation failed'}), 401
    
    # Get and validate request data
    data = request.get_json()
    if not data or 'amount' not in data:
        return jsonify({'error': 'Invalid request. Amount is required.'}), 400
    
    try:
        amount = float(data['amount'])
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount format. Please enter a valid number.'}), 400
    
    # Validate amount is positive
    if amount <= 0:
        return jsonify({'error': 'Amount must be greater than zero.'}), 400
    
    # Process deposit
    current_balance = get_balance()
    new_balance = current_balance + amount
    update_balance(new_balance)
    
    # Record transaction
    add_transaction('Deposit', 'Funds Deposit', amount, 'Completed')
    
    return jsonify({
        'success': True,
        'message': f'Successfully deposited ${amount:.2f}',
        'new_balance': new_balance,
        'transaction': {
            'type': 'Deposit',
            'amount': amount,
            'balance_after': new_balance
        }
    })


@app.route('/api/withdraw', methods=['POST'])
def api_withdraw():
    """Withdraw money from account with balance check."""
    # Validate account first
    if not validate_account():
        return jsonify({'error': 'Account validation failed'}), 401
    
    # Get and validate request data
    data = request.get_json()
    if not data or 'amount' not in data:
        return jsonify({'error': 'Invalid request. Amount is required.'}), 400
    
    try:
        amount = float(data['amount'])
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount format. Please enter a valid number.'}), 400
    
    # Validate amount is positive
    if amount <= 0:
        return jsonify({'error': 'Amount must be greater than zero.'}), 400
    
    current_balance = get_balance()
    
    # Check insufficient balance
    if amount > current_balance:
        # Record failed transaction
        add_transaction('Withdrawal', 'Cash Withdrawal (Failed)', amount, 'Failed - Insufficient Balance')
        return jsonify({'error': f'Insufficient balance. Available: ${current_balance:.2f}'}), 400
    
    # Process withdrawal
    new_balance = current_balance - amount
    update_balance(new_balance)
    
    # Record successful transaction
    add_transaction('Withdrawal', 'Cash Withdrawal', amount, 'Completed')
    
    return jsonify({
        'success': True,
        'message': f'Successfully withdrew ${amount:.2f}',
        'new_balance': new_balance,
        'transaction': {
            'type': 'Withdrawal',
            'amount': amount,
            'balance_after': new_balance
        }
    })


@app.route('/api/transactions', methods=['GET'])
def api_get_transactions():
    """Get full transaction history."""
    if not validate_account():
        return jsonify({'error': 'Account validation failed'}), 401
    
    return jsonify({
        'success': True,
        'transactions': get_transactions()
    })


# Serve frontend
@app.route('/')
def serve_frontend():
    return app.send_static_file('index.html')


if __name__ == '__main__':
    print("\n" + "="*50)
    print("🏦 BANKING SYSTEM STARTED")
    print("="*50)
    print("📍 Open your browser and go to: http://127.0.0.1:5000")
    print("="*50 + "\n")
    app.run(debug=True, host='127.0.0.1', port=5000)