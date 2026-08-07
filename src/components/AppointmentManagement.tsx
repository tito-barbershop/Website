import { useState } from 'react';
import type { Appointment, AppointmentStatus, Worker, Customer } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { formatDateTime } from '../lib/utils';

interface AppointmentManagementProps {
  appointments: (Appointment & { firebaseId: string })[];
  workers: Map<string, Worker & { firebaseId: string }>;
  customers?: Map<string, Customer>;
  onUpdateStatus: (appointmentId: string, status: AppointmentStatus) => Promise<void>;
}

export function AppointmentManagement({
  appointments,
  workers,
  customers,
  onUpdateStatus,
}: AppointmentManagementProps) {
  const [filter, setFilter] = useState<AppointmentStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status'>('status');
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = appointments.filter(
    (apt) => filter === 'all' || apt.status === filter
  );

  const statusOrder: Record<AppointmentStatus, number> = {
    pending: 0,
    approved: 1,
    completed: 2,
    cancelled: 3,
  };

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'date') {
      return b.dateTime - a.dateTime;
    }
    return statusOrder[a.status] - statusOrder[b.status];
  });

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusChange = async (
    appointmentId: string,
    newStatus: AppointmentStatus
  ) => {
    setLoading(appointmentId);
    try {
      await onUpdateStatus(appointmentId, newStatus);
    } catch (error) {
      console.error('Error updating appointment:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Appointments Management</h2>

        <div className="flex flex-col md:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as AppointmentStatus | 'all')
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'status')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="date">Date</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sorted.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-600">No appointments found.</p>
          </Card>
        ) : (
          sorted.map((appointment) => {
            const worker = workers.get(appointment.workerId);
            const customer = customers?.get(appointment.customerId);

            return (
              <Card key={appointment.firebaseId} className="p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-bold text-gray-900">
                          ✂️ {worker?.name || 'Unknown Worker'}
                        </h3>
                      </div>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </div>

                    {customer && (
                      <div className="bg-blue-50 rounded p-3 border border-blue-200">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold text-gray-900">👤 {customer.name}</span>
                          <span className="text-gray-400">•</span>
                          <a
                            href={`mailto:${customer.email}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            📧 {customer.email}
                          </a>
                          <span className="text-gray-400">•</span>
                          <a
                            href={`tel:${customer.phone}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            📞 {customer.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <span>
                        📅 {formatDateTime(appointment.dateTime)}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span>
                        💰 {appointment.totalPrice.toFixed(2)} LE
                      </span>
                      <span className="text-gray-400">•</span>
                      <span>
                        ⏱️ {appointment.totalDuration} min
                      </span>
                    </div>
                    {appointment.notes && (
                      <p className="text-sm text-gray-700 mt-2">
                        📝 <span className="font-semibold">Notes:</span> {appointment.notes}
                      </p>
                    )}
                  </div>

                  {appointment.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleStatusChange(
                            appointment.firebaseId,
                            'approved'
                          )
                        }
                        disabled={loading === appointment.firebaseId}
                      >
                        ✓ Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() =>
                          handleStatusChange(
                            appointment.firebaseId,
                            'cancelled'
                          )
                        }
                        disabled={loading === appointment.firebaseId}
                      >
                        ✕ Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
