import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { useToast } from '../contexts/ToastContext';
import * as transactionService from '../services/transactionService';
import type { Transaction } from '../types';

interface PersonalFinancialsProps {
  employeeId: string;
  ownerId: string;
}

export function PersonalFinancials({
  employeeId,
  ownerId,
}: PersonalFinancialsProps) {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<(Transaction & { firebaseId: string })[]>([]);
  const [totals, setTotals] = useState({ totalBonuses: 0, totalDeductions: 0, totalWithdrawals: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employeeId) {
      loadFinancialData();
    }
  }, [employeeId, ownerId]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const transactionsData = await transactionService.getEmployeeTransactions(ownerId, employeeId);

      // Filter transactions to show only today's
      const today = new Date().toLocaleDateString('en-CA');
      const todayTransactions = transactionsData.filter(t => t.date === today);

      // Calculate totals for today only
      let todayBonuses = 0;
      let todayDeductions = 0;
      let todayWithdrawals = 0;

      for (const t of todayTransactions) {
        if (t.type === 'bonus') todayBonuses += t.amount;
        else if (t.type === 'deduction') todayDeductions += t.amount;
        else if (t.type === 'withdrawal') todayWithdrawals += t.amount;
      }

      setTransactions(todayTransactions);
      setTotals({
        totalBonuses: todayBonuses,
        totalDeductions: todayDeductions,
        totalWithdrawals: todayWithdrawals,
      });
    } catch (error) {
      console.error('Error loading financial data:', error);
      showToast('Error loading financial records', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">Loading financial records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Today's Financial Summary</h1>
        <p className="text-gray-600 mt-2">Today's bonuses, deductions, and withdrawals</p>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-green-50 border border-green-200">
          <p className="text-sm text-gray-600 mb-1">Total Bonuses</p>
          <p className="text-3xl font-bold text-green-600">{totals.totalBonuses.toFixed(2)} LE</p>
        </Card>
        <Card className="p-6 bg-red-50 border border-red-200">
          <p className="text-sm text-gray-600 mb-1">Total Deductions</p>
          <p className="text-3xl font-bold text-red-600">{totals.totalDeductions.toFixed(2)} LE</p>
        </Card>
        <Card className="p-6 bg-blue-50 border border-blue-200">
          <p className="text-sm text-gray-600 mb-1">Total Withdrawals</p>
          <p className="text-3xl font-bold text-blue-600">{totals.totalWithdrawals.toFixed(2)} LE</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Today's Transactions</h2>

        {transactions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No transactions today.</p>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
