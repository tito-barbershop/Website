import { useEffect, useState } from 'react';
import * as customerService from '../services/customerService';
import * as serviceService from '../services/serviceService';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { formatDateTime } from '../lib/utils';
import type { Appointment } from '../types';

interface AppointmentsListProps {
  appointments: (Appointment & { firebaseId: string })[];
  onSelectAppointment: (appointment: Appointment & { firebaseId: string }) => void;
  onApprove?: (appointmentId: string) => Promise<void>;
  onComplete?: (appointmentId: string) => Promise<void>;
  isLoading?: boolean;
  ownerId: string; // needed to fetch this shop's customers and services
}

interface UserInfo {
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
}

interface ServiceInfo {
  name?: string;
  price?: number;
  duration?: number;
}

export function AppointmentsList({
  appointments,
  onSelectAppointment,
  onApprove,
  onComplete,
  isLoading = false,
  ownerId,
}: AppointmentsListProps) {
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'cancelled'>('all');
  const [loadingAppointmentId, setLoadingAppointmentId] = useState<string | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, UserInfo>>({});
  const [servicesMap, setServicesMap] = useState<Record<string, ServiceInfo>>({});

  // Load all customers for this shop once, so we can look up name/phone by customerId
  useEffect(() => {
    if (!ownerId) return;

    const loadCustomers = async () => {
      try {
        const customersData = await customerService.getCustomers(ownerId);
        const map: Record<string, UserInfo> = {};
        customersData.forEach((customer: any) => {
          map[customer.id] = customer;
        });
        setUsersMap(map);
      } catch (error) {
        console.error('Error loading customers:', error);
      }
    };

    loadCustomers();
  }, [ownerId]);

  // Load all services for this shop once (across all workers), so we can look up
  // service names by the IDs stored in apt.selectedServices
  useEffect(() => {
    if (!ownerId) return;

    const loadServices = async () => {
      try {
        // getAllWorkerServices returns a Map<workerId, Service[]> — flatten it
        // into a single serviceId -> service lookup regardless of which worker offers it
        const allWorkerServices = await serviceService.getAllWorkerServices(ownerId);
        const map: Record<string, ServiceInfo> = {};
        allWorkerServices.forEach((servicesForWorker) => {
          servicesForWorker.forEach((service: any) => {
            map[service.firebaseId] = service;
          });
        });
        setServicesMap(map);
      } catch (error) {
        console.error('Error loading services:', error);
      }
    };

    loadServices();
  }, [ownerId]);

  const now = Date.now();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayEnd = today.getTime() + 24 * 60 * 60 * 1000;

  const filteredAppointments = appointments.filter((apt) => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;

    if (filter === 'today') {
      return apt.dateTime >= today.getTime() && apt.dateTime < todayEnd;
    } else if (filter === 'upcoming') {
      return apt.dateTime >= now;
    }
    return true;
  });

  const getStatusColor = (status: string) => {
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

  const handleApprove = async (e: React.MouseEvent, appointmentId: string) => {
    e.stopPropagation();
    if (!onApprove) return;

    try {
      setLoadingAppointmentId(appointmentId);
      await onApprove(appointmentId);
    } finally {
      setLoadingAppointmentId(null);
    }
  };

  const handleComplete = async (e: React.MouseEvent, appointmentId: string) => {
    e.stopPropagation();
    if (!onComplete) return;

    try {
      setLoadingAppointmentId(appointmentId);
      await onComplete(appointmentId);
    } finally {
      setLoadingAppointmentId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex gap-2">
          {(['all', 'today', 'upcoming'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'primary' : 'secondary'}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f === 'all' ? 'All' : f === 'today' ? "Today" : 'Upcoming'}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'cancelled'] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'primary' : 'secondary'}
              onClick={() => setStatusFilter(s)}
              className="capitalize text-xs"
            >
              {s === 'all' ? 'All' : s}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-gray-500">Loading appointments...</Card>
      ) : filteredAppointments.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          No appointments found for the selected filters.
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((apt) => {
            const customer = usersMap[apt.customerId];
            const customerName = customer?.name ?? (customer ? 'Unknown' : apt.customerId);
            const customerPhone = customer?.phone;

            return (
              <Card
                key={apt.firebaseId}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectAppointment(apt)}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatDateTime(apt.dateTime)}</span>
                      <Badge className={getStatusColor(apt.status)}>{apt.status}</Badge>
                    </div>
                    <p className="text-md font-medium text-gray-700 mt-1">
                      {customerName}
                      {customerPhone && (
                        <>
                          {' • '}
                          {apt.selectedServices
                            .map((serviceId) => servicesMap[serviceId]?.name ?? serviceId)
                            .join(', ')}
                          {' • '}
                          <a
                            href={`tel:${customerPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:underline"
                          >
                            {customerPhone}
                          </a>
                        </>
                      )}
                      {!customer && ' (customer info unavailable)'}
                    </p>
                    <p className="text-sm font-medium text-gray-700 mt-1">
                      Total: {apt.totalPrice.toFixed(2)} LE • {apt.totalDuration} mins
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {apt.status === 'pending' && onApprove && (
                      <Button
                        variant="primary"
                        onClick={(e) => handleApprove(e, apt.firebaseId)}
                        isLoading={loadingAppointmentId === apt.firebaseId}
                        className="text-sm"
                      >
                        Approve
                      </Button>
                    )}
                    {apt.status === 'approved' && onComplete && (
                      <Button
                        variant="primary"
                        onClick={(e) => handleComplete(e, apt.firebaseId)}
                        isLoading={loadingAppointmentId === apt.firebaseId}
                        className="text-sm"
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
