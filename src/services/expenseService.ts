import { ref, get, remove, set } from 'firebase/database';
import { db } from '../config/firebase';
import type { Expense } from '../types';
import { generateId } from '../lib/utils';

const EXPENSES_PATH = 'expenses';

export async function createExpense(
  ownerId: string,
  amount: number,
  reason: string,
  date: string,
  createdBy: string
): Promise<Expense> {
  const expenseId = generateId();
  const expenseRef = ref(db, `${EXPENSES_PATH}/${ownerId}/${expenseId}`);

  const expense: Expense = {
    id: expenseId,
    amount,
    reason,
    date,
    createdBy,
    createdAt: Date.now(),
  };

  await set(expenseRef, expense);

  return expense;
}

export async function getAllExpenses(ownerId: string): Promise<(Expense & { firebaseId: string })[]> {
  const expensesRef = ref(db, `${EXPENSES_PATH}/${ownerId}`);
  const snapshot = await get(expensesRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  const expenses: (Expense & { firebaseId: string })[] = [];

  for (const [firebaseId, expenseData] of Object.entries(data)) {
    if (expenseData && typeof expenseData === 'object') {
      const e = expenseData as any;
      expenses.push({
        ...e,
        firebaseId,
      });
    }
  }

  return expenses.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getTodayExpenses(ownerId: string, today: string): Promise<(Expense & { firebaseId: string })[]> {
  const expenses = await getAllExpenses(ownerId);
  return expenses.filter((e) => e.date === today);
}

export async function getTodayExpensesTotal(ownerId: string, today: string): Promise<number> {
  const expenses = await getTodayExpenses(ownerId, today);
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export async function getTotalExpenses(ownerId: string): Promise<number> {
  const expenses = await getAllExpenses(ownerId);
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export async function deleteExpense(ownerId: string, expenseId: string): Promise<void> {
  const expenseRef = ref(db, `${EXPENSES_PATH}/${ownerId}/${expenseId}`);
  await remove(expenseRef);
}
