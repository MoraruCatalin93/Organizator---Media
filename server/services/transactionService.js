const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const TRANSACTIONS_FILE = path.join(__dirname, '../data/transactions.json');

fs.ensureDirSync(path.dirname(TRANSACTIONS_FILE));

if (!fs.existsSync(TRANSACTIONS_FILE)) {
    fs.writeJsonSync(TRANSACTIONS_FILE, []);
}

function getTransactions() {
    try {
        return fs.readJsonSync(TRANSACTIONS_FILE);
    } catch (e) {
        return [];
    }
}

function saveTransactions(data) {
    fs.writeJsonSync(TRANSACTIONS_FILE, data, { spaces: 2 });
}

function recordTransaction(filesMoved) {
    const transactions = getTransactions();
    const newTx = {
        processId: crypto.randomUUID(),
        timestamp: Date.now(),
        filesMoved
    };
    transactions.push(newTx);
    saveTransactions(transactions);
    return newTx;
}

function popLastTransaction() {
    const transactions = getTransactions();
    if (transactions.length === 0) return null;
    const last = transactions.pop();
    saveTransactions(transactions);
    return last;
}

function hasTransactions() {
    const transactions = getTransactions();
    return transactions.length > 0;
}

module.exports = {
    getTransactions,
    recordTransaction,
    popLastTransaction,
    hasTransactions
};
