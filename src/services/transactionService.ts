import { ref, get, remove, set } from 'firebase/database';
import { db } from '../config/firebase';
import type { Transaction, TransactionType } from '../types';
import { generateId } from '../lib/utils';

const TRANSACTIONS_PATH = 'transactions';

export async function createTransaction(
  ownerId: string,
  employeeId: string,
  type: TransactionType,
  amount: number,
  reason: string,
  date: string,
  createdBy: string
): Promise<Transaction> {
  const transactionId = generateId();
  const transactionRef = ref(db, `${TRANSACTIONS_PATH}/${ownerId}/${transactionId}`);

  const transaction: Transaction = {
    id: transactionId,
    employeeId,
    type,
    amount,
    reason,
    date,
    createdBy,
    createdAt: Date.now(),
  };

  await set(transactionRef, transaction);

  return transaction;
}

export async function getEmployeeTransactions(
  ownerId: string,
  employeeId: string
): Promise<(Transaction & { firebaseId: string })[]> {
  const transactionsRef = ref(db, `${TRANSACTIONS_PATH}/${ownerId}`);
  const snapshot = await get(transactionsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  const transactions: (Transaction & { firebaseId: string })[] = [];

  for (const [firebaseId, transactionData] of Object.entries(data)) {
    if (transactionData && typeof transactionData === 'object') {
      const t = transactionData as any;
      if (t.employeeId === employeeId) {
        transactions.push({
          ...t,
          firebaseId,
        });
      }
    }
  }

  return transactions.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getAllTransactionsForOwner(
  ownerId: string
): Promise<(Transaction & { firebaseId: string })[]> {
  const transactionsRef = ref(db, `${TRANSACTIONS_PATH}/${ownerId}`);
  const snapshot = await get(transactionsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  const transactions: (Transaction & { firebaseId: string })[] = [];

  for (const [firebaseId, transactionData] of Object.entries(data)) {
    if (transactionData && typeof transactionData === 'object') {
      const t = transactionData as any;
      transactions.push({
        ...t,
        firebaseId,
      });
    }
  }

  return transactions.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteTransaction(
  ownerId: string,
  transactionId: string
): Promise<void> {
  const transactionRef = ref(db, `${TRANSACTIONS_PATH}/${ownerId}/${transactionId}`);
  await remove(transactionRef);
}

export async function getTransactionTotals(
  ownerId: string,
  employeeId: string
): Promise<{
  totalBonuses: number;
  totalDeductions: number;
  totalWithdrawals: number;
}> {
  const transactions = await getEmployeeTransactions(ownerId, employeeId);

  let totalBonuses = 0;
  let totalDeductions = 0;
  let totalWithdrawals = 0;

  for (const t of transactions) {
    if (t.type === 'bonus') {
      totalBonuses += t.amount;
    } else if (t.type === 'deduction') {
      totalDeductions += t.amount;
    } else if (t.type === 'withdrawal') {
      totalWithdrawals += t.amount;
    }
  }

  return {
    totalBonuses,
    totalDeductions,
    totalWithdrawals,
  };
}

export async function getAllTransactionTotals(
  ownerId: string
): Promise<{
  totalBonuses: number;
  totalDeductions: number;
  totalWithdrawals: number;
}> {
  const transactions = await getAllTransactionsForOwner(ownerId);

  let totalBonuses = 0;
  let totalDeductions = 0;
  let totalWithdrawals = 0;

  for (const t of transactions) {
    if (t.type === 'bonus') {
      totalBonuses += t.amount;
    } else if (t.type === 'deduction') {
      totalDeductions += t.amount;
    } else if (t.type === 'withdrawal') {
      totalWithdrawals += t.amount;
    }
  }

  return {
    totalBonuses,
    totalDeductions,
    totalWithdrawals,
  };
}
