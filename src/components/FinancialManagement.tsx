import { useState, useEffect, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Dialog } from './ui/Dialog';
import { Textarea } from './ui/Textarea';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../lib/utils';
import * as transactionService from '../services/transactionService';
import type { Worker, Transaction, TransactionType } from '../types';

interface FinancialManagementProps {
  workers: (Worker & { firebaseId: string })[];
  ownerId: string;
  isCashier?: boolean;
}

export function FinancialManagement({
  workers,
  ownerId,
  isCashier = false,
}: FinancialManagementProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<(Worker & { firebaseId: string }) | null>(null);
  const [transactions, setTransactions] = useState<(Transaction & { firebaseId: string })[]>([]);
  const [totals, setTotals] = useState({ totalBonuses: 0, totalDeductions: 0, totalWithdrawals: 0 });
  const [loading, setLoading] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'bonus' as TransactionType,
    amount: '',
    reason: '',
    date: formatDate(new Date()),
  });
  const [transactionLoading, setTransactionLoading] = useState(false);

  const availableEmployees = useMemo(() =>
    isCashier
      ? workers.filter((w) => w.role === 'worker')
      : workers,
    [workers, isCashier]
  );

  useEffect(() => {
    if (selectedEmployeeId) {
      const employee = availableEmployees.find((w) => w.firebaseId === selectedEmployeeId);
      setSelectedEmployee(employee || null);
      if (employee?.id) {
        loadTransactions(employee.id);
      }
    }
  }, [selectedEmployeeId, availableEmployees]);

  const loadTransactions = async (employeeId: string) => {
    try {
      setLoading(true);
      const [transactionsData, totalsData] = await Promise.all([
        transactionService.getEmployeeTransactions(ownerId, employeeId),
        transactionService.getTransactionTotals(ownerId, employeeId),
      ]);
      setTransactions(transactionsData);
      setTotals(totalsData);
    } catch (error) {
      console.error('Error loading transactions:', error);
      showToast('Error loading financial records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!selectedEmployeeId || !selectedEmployee) {
      showToast('Please select an employee', 'error');
      return;
    }

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
      setTransactionLoading(true);
      const userId = user?.id || '';
      const employeeId = selectedEmployee?.id || selectedEmployeeId;

      await transactionService.createTransaction(
        ownerId,
        employeeId,
        formData.type,
        parseFloat(formData.amount),
        formData.reason,
        formData.date,
        userId
      );

      showToast('Transaction added successfully', 'success');
      setFormData({
        type: 'bonus',
        amount: '',
        reason: '',
        date: formatDate(new Date()),
      });
      setIsAddDialogOpen(false);

      if (selectedEmployee?.id) {
        await loadTransactions(selectedEmployee.id);
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      showToast('Error adding transaction', 'error');
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      await transactionService.deleteTransaction(ownerId, transactionId);
      showToast('Transaction deleted successfully', 'success');
      if (selectedEmployee?.id) {
        await loadTransactions(selectedEmployee.id);
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showToast('Error deleting transaction', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Financial Management</h1>
        <p className="text-gray-600 mt-2">Manage bonuses, deductions, and withdrawals</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select {isCashier ? 'Worker' : 'Employee'}
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Select an employee --</option>
              {availableEmployees.map((emp) => (
                <option key={emp.firebaseId} value={emp.firebaseId}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </div>

          {selectedEmployee && (
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="mt-6"
            >
              ➕ Add Transaction
            </Button>
          )}
        </div>

        {selectedEmployee && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="p-4 bg-green-50 border border-green-200">
                <p className="text-sm text-gray-600">Total Bonuses</p>
                <p className="text-2xl font-bold text-green-600">{totals.totalBonuses.toFixed(2)} LE</p>
              </Card>
              <Card className="p-4 bg-red-50 border border-red-200">
                <p className="text-sm text-gray-600">Total Deductions</p>
                <p className="text-2xl font-bold text-red-600">{totals.totalDeductions.toFixed(2)} LE</p>
              </Card>
              <Card className="p-4 bg-blue-50 border border-blue-200">
                <p className="text-sm text-gray-600">Total Withdrawals</p>
                <p className="text-2xl font-bold text-blue-600">{totals.totalWithdrawals.toFixed(2)} LE</p>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Transaction History</h3>
              {loading ? (
                <p className="text-gray-600">Loading transactions...</p>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No financial records yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Type</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Amount</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Reason</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.firebaseId} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                t.type === 'bonus'
                                  ? 'bg-green-100 text-green-800'
                                  : t.type === 'deduction'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {t.amount.toFixed(2)} LE
                          </td>
                          <td className="px-4 py-3 text-gray-700">{t.reason}</td>
                          <td className="px-4 py-3 text-gray-700">{t.date}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleDeleteTransaction(t.firebaseId)}
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
          </>
        )}

        {!selectedEmployee && (
          <div className="text-center py-12">
            <p className="text-gray-600">Select an employee to view financial records</p>
          </div>
        )}
      </Card>

      <Dialog
        title="Add Transaction"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Transaction Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="bonus">Bonus</option>
              <option value="deduction">Deduction</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
          </div>

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
              placeholder="Enter reason for this transaction"
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
              onClick={handleAddTransaction}
              disabled={transactionLoading}
              className="flex-1"
            >
              {transactionLoading ? 'Adding...' : 'Add Transaction'}
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
