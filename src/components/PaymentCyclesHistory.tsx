import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { useToast } from '../contexts/ToastContext';
import * as paymentCycleService from '../services/paymentCycleService';
import type { PaymentCycle } from '../services/paymentCycleService';

interface PaymentCyclesHistoryProps {
  ownerId: string;
}

export function PaymentCyclesHistory({ ownerId }: PaymentCyclesHistoryProps) {
  const { showToast } = useToast();
  const [paymentCycles, setPaymentCycles] = useState<PaymentCycle[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<PaymentCycle | null>(null);

  useEffect(() => {
    loadPaymentCycles();
  }, [ownerId]);

  const loadPaymentCycles = async () => {
    try {
      setLoading(true);
      const cycles = await paymentCycleService.getPaymentCycles(ownerId);
      setPaymentCycles(cycles.sort((a, b) => b.processedAt - a.processedAt));
    } catch (error) {
      console.error('Error loading payment cycles:', error);
      showToast('Error loading payment cycles', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <p className="text-gray-600">Loading payment cycles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payment Cycles History</h1>
        <p className="text-gray-600 mt-2">View completed payment cycles for employees</p>
      </div>

      {paymentCycles.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600">No payment cycles processed yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {paymentCycles.map((cycle) => (
            <Card
              key={cycle.cycleId}
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedCycle(selectedCycle?.cycleId === cycle.cycleId ? null : cycle)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{cycle.employeeName}</h3>
                  <p className="text-sm text-gray-600">
                    {cycle.role === 'worker' ? '👷 Worker' : '💰 Cashier'} · {cycle.workDaysCount} work days
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {cycle.cycleStartDate} to {cycle.cycleEndDate}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{cycle.totalAmount.toFixed(2)} LE</p>
                  <p className="text-xs text-gray-500">
                    {new Date(cycle.processedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedCycle?.cycleId === cycle.cycleId && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Work Days</p>
                      <p className="font-semibold text-gray-900">{cycle.workDaysCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Bonuses</p>
                      <p className="font-semibold text-green-600">{cycle.totalBonuses.toFixed(2)} LE</p>
                    </div>
                    {cycle.role === 'worker' && (
                      <div>
                        <p className="text-sm text-gray-600">Appointments Revenue</p>
                        <p className="font-semibold text-blue-600">{cycle.appointmentsRevenue.toFixed(2)} LE</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Total Deductions</p>
                      <p className="font-semibold text-red-600">{cycle.totalDeductions.toFixed(2)} LE</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Withdrawals</p>
                      <p className="font-semibold text-orange-600">{cycle.totalWithdrawals.toFixed(2)} LE</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 mb-2">Calculation:</p>
                    <div className="space-y-1 text-sm">
                      {cycle.role === 'worker' && (
                        <p className="text-gray-700">
                          Appointments: <span className="font-semibold">{cycle.appointmentsRevenue.toFixed(2)}</span> LE
                        </p>
                      )}
                      <p className="text-gray-700">
                        + Bonuses: <span className="font-semibold">{cycle.totalBonuses.toFixed(2)}</span> LE
                      </p>
                      <p className="text-gray-700">
                        - Deductions: <span className="font-semibold">{cycle.totalDeductions.toFixed(2)}</span> LE
                      </p>
                      <p className="text-gray-700">
                        - Withdrawals: <span className="font-semibold">{cycle.totalWithdrawals.toFixed(2)}</span> LE
                      </p>
                      <div className="border-t pt-1 mt-2">
                        <p className="text-gray-900 font-bold">
                          = Total: <span className="text-green-600">{cycle.totalAmount.toFixed(2)}</span> LE
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
