import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Dialog } from './ui/Dialog';
import { Textarea } from './ui/Textarea';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../lib/utils';
import * as expenseService from '../services/expenseService';
import type { Expense } from '../types';

interface ExpenseManagementProps {
  ownerId: string;
  isAdmin?: boolean;
}

export function ExpenseManagement({ ownerId, isAdmin = false }: ExpenseManagementProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<(Expense & { firebaseId: string })[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    date: formatDate(new Date()),
  });
  const [expenseLoading, setExpenseLoading] = useState(false);

  const today = formatDate(new Date());

  useEffect(() => {
    loadExpenses();
  }, [ownerId]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const [allExpenses, todayTotal, total] = await Promise.all([
        isAdmin ? expenseService.getAllExpenses(ownerId) : expenseService.getTodayExpenses(ownerId, today),
        expenseService.getTodayExpensesTotal(ownerId, today),
        isAdmin ? expenseService.getTotalExpenses(ownerId) : Promise.resolve(0),
      ]);
      setExpenses(allExpenses);
      setTodayTotal(todayTotal);
      if (isAdmin) {
        setTotalExpenses(total);
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
      showToast('Error loading expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showToast('Amount must be greater than 0', 'error');
      return;
    }

    if (!formData.reason.trim()) {
      showToast('Reason is required', 'error');
      return;
    }

    if (!formData.date) {
      showToast('Date is required', 'error');
      return;
    }

    try {
      setExpenseLoading(true);
      const userId = user?.id || '';

      await expenseService.createExpense(
        ownerId,
        parseFloat(formData.amount),
        formData.reason,
        formData.date,
        userId
      );

      showToast('Expense added successfully', 'success');
      setFormData({
        amount: '',
        reason: '',
        date: formatDate(new Date()),
      });
      setIsAddDialogOpen(false);
      await loadExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      showToast('Error adding expense', 'error');
    } finally {
      setExpenseLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      await expenseService.deleteExpense(ownerId, expenseId);
      showToast('Expense deleted successfully', 'success');
      await loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      showToast('Error deleting expense', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
        <p className="text-gray-600 mt-2">Track and manage daily expenses</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="space-y-4 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 bg-orange-50 border border-orange-200">
                <p className="text-sm text-gray-600">Today's Expenses</p>
                <p className="text-2xl font-bold text-orange-600">{todayTotal.toFixed(2)} LE</p>
              </Card>
              {isAdmin && (
                <Card className="p-4 bg-purple-50 border border-purple-200">
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-purple-600">{totalExpenses.toFixed(2)} LE</p>
                </Card>
              )}
            </div>
          </div>

          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="mt-4"
          >
            ➕ Add Expense
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Expense History</h3>
          {loading ? (
            <p className="text-gray-600">Loading expenses...</p>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No expenses recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Reason</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.firebaseId} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {expense.amount.toFixed(2)} LE
                      </td>
                      <td className="px-4 py-3 text-gray-700">{expense.reason}</td>
                      <td className="px-4 py-3 text-gray-700">{expense.date}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeleteExpense(expense.firebaseId)}
                          className="text-red-600 hover:text-red-800 font-semibold text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Dialog
        title="Add Expense"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Amount (LE)
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason
            </label>
            <Textarea
              placeholder="Enter reason for this expense"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date
            </label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleAddExpense}
              disabled={expenseLoading}
              className="flex-1"
            >
              {expenseLoading ? 'Adding...' : 'Add Expense'}
            </Button>
            <Button
              onClick={() => setIsAddDialogOpen(false)}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
