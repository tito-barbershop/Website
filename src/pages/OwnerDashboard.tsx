import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { DashboardStats } from '../components/DashboardStats';
import { WorkerManagement } from '../components/WorkerManagement';
import { ServiceManagement } from '../components/ServiceManagement';
import { AppointmentManagement } from '../components/AppointmentManagement';
import { CustomerList } from '../components/CustomerList';
import { AnalyticsCharts } from '../components/AnalyticsCharts';
import { AllRatingsView } from '../components/AllRatingsView';
import { AdminAttendance } from '../components/AdminAttendance';
import { FinancialManagement } from '../components/FinancialManagement';
import { PersonalFinancials } from '../components/PersonalFinancials';
import { ExpenseManagement } from '../components/ExpenseManagement';
import { ChangePasswordDialog } from '../components/ChangePasswordDialog';
import { Card } from '../components/ui/Card';
import { formatDateTime } from '../lib/utils';
import {
  createWorker,
  getWorkers,
  updateWorker,
  deleteWorker,
} from '../services/workerService';
import {
  createService,
  getAllWorkerServices,
  updateService,
  deleteService,
} from '../services/serviceService';
import {
  getAppointments,
  updateAppointmentStatus,
} from '../services/appointmentService';
import {
  getDashboardStats,
} from '../services/analyticsService';
import { getCustomers } from '../services/customerService';
import type { Appointment, Service, Worker, AppointmentStatus } from '../types';

export function OwnerDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const isOwner = user?.role === 'owner';
  const isCashier = user?.role === 'cashier';

  const [currentTab, setCurrentTab] = useState('overview');
  const [workers, setWorkers] = useState<(Worker & { firebaseId: string })[]>([]);
  const [appointments, setAppointments] = useState<(Appointment & { firebaseId: string })[]>([]);
  const [services, setServices] = useState<Map<string, (Service & { firebaseId: string })[]>>(
    new Map()
  );
  const [customers, setCustomers] = useState<Map<string, any>>(new Map());
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // For owners, use their own ID; for cashiers, use the shop owner's ID
  const ownerId = isOwner ? (user?.id || '') : (user?.ownerId || '');

  // Set default tab based on user role
  useEffect(() => {
    if (isCashier) {
      setCurrentTab('attendance');
    } else {
      setCurrentTab('overview');
    }
  }, [isCashier]);

  // Show password dialog on first login for cashiers
  useEffect(() => {
    if (isCashier) {
      const isFirstLogin = localStorage.getItem('workerFirstLogin') !== 'false';
      if (isFirstLogin) {
        setShowPasswordDialog(true);
        localStorage.setItem('workerFirstLogin', 'false');
      }
    }
  }, [isCashier]);

  useEffect(() => {
    if (!ownerId) return;
    loadData();
  }, [ownerId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load data that both owners and cashiers can access
      const [workersData, appointmentsData, customersData] = await Promise.all([
        getWorkers(ownerId),
        getAppointments(ownerId),
        getCustomers(ownerId),
      ]);

      setWorkers(workersData);
      setAppointments(appointmentsData);

      // Create a map of customers by ID for easy lookup
      const customersMap = new Map(customersData.map((c) => [c.id, c]));
      setCustomers(customersMap);

      // Only load services for owners (cashiers don't have access)
      if (isOwner) {
        try {
          const servicesData = await getAllWorkerServices(ownerId);
          setServices(servicesData);
        } catch (serviceError) {
          // Silently fail for services - not critical
        }
      }

      // Only load dashboard stats for owners
      if (isOwner) {
        const dashboardStats = await getDashboardStats(ownerId, appointmentsData);
        setStats({
          ...dashboardStats,
          totalCustomers: customersData.length,
        });
      }
    } catch (error) {
      showToast('Error loading dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorker = async (workerData: Omit<Worker, 'id'>, tempPassword: string) => {
    if (!isOwner) {
      showToast('Only owners can add users', 'error');
      return;
    }

    try {
      // Save worker to database FIRST (while still authenticated as owner)
      console.log('Creating worker in database:', workerData.email);
      await createWorker(ownerId, workerData, tempPassword);
      console.log('Worker created in database with temp password');

      // Show success message
      showToast(`${workerData.role === 'cashier' ? 'Cashier' : 'Worker'} added successfully!`, 'success');

      // Reload data after a longer delay to allow credentials dialog to be seen
      setTimeout(() => loadData(), 3000);
    } catch (error) {
      console.error('Error adding worker:', error);
      showToast(error instanceof Error ? error.message : 'Error adding user', 'error');
    }
  };

  const handleUpdateWorker = async (
    workerId: string,
    workerData: Partial<Worker>
  ) => {
    try {
      await updateWorker(ownerId, workerId, workerData);
      showToast('Worker updated successfully', 'success');
      await loadData();
    } catch (error) {
      console.error('Error updating worker:', error);
      showToast('Error updating worker', 'error');
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (!isOwner) {
      showToast('Only owners can delete users', 'error');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteWorker(ownerId, workerId);
      showToast('User deleted successfully', 'success');
      await loadData();
    } catch (error) {
      console.error('Error deleting worker:', error);
      showToast('Error deleting user', 'error');
    }
  };

  const handleAddService = async (
    workerId: string,
    serviceData: Omit<Service, 'id'>
  ) => {
    try {
      await createService(ownerId, workerId, serviceData);
      showToast('Service added successfully', 'success');
      await loadData();
    } catch (error) {
      console.error('Error adding service:', error);
      showToast('Error adding service', 'error');
    }
  };

  const handleUpdateService = async (
    workerId: string,
    serviceId: string,
    serviceData: Partial<Service>
  ) => {
    try {
      await updateService(ownerId, workerId, serviceId, serviceData);
      showToast('Service updated successfully', 'success');
      await loadData();
    } catch (error) {
      console.error('Error updating service:', error);
      showToast('Error updating service', 'error');
    }
  };

  const handleDeleteService = async (workerId: string, serviceId: string) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;

    try {
      await deleteService(ownerId, workerId, serviceId);
      showToast('Service deleted successfully', 'success');
      await loadData();
    } catch (error) {
      console.error('Error deleting service:', error);
      showToast('Error deleting service', 'error');
    }
  };

  const handleUpdateAppointmentStatus = async (
    appointmentId: string,
    status: AppointmentStatus
  ) => {
    try {
      await updateAppointmentStatus(ownerId, appointmentId, status);
      showToast(`Appointment ${status}`, 'success');
      await loadData();
    } catch (error) {
      console.error('Error updating appointment:', error);
      showToast('Error updating appointment', 'error');
    }
  };

  if (loading) {
    return (
      <DashboardLayout currentTab={currentTab} onTabChange={setCurrentTab}>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  const workersMap = new Map(workers.map((w) => [w.firebaseId, w]));

  return (
    <DashboardLayout currentTab={currentTab} onTabChange={setCurrentTab}>
      {currentTab === 'overview' && isOwner && (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-600 mt-2">Welcome back to your barbershop</p>
          </div>

          {stats && <DashboardStats stats={stats} />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                ⏳ Pending Appointments ({appointments.filter((apt) => apt.status === 'pending').length})
              </h3>
              <div className="space-y-3">
                {appointments
                  .filter((apt) => apt.status === 'pending')
                  .sort((a, b) => a.dateTime - b.dateTime)
                  .slice(0, 5)
                  .map((apt) => {
                    return (
                      <div
                        key={apt.firebaseId}
                        className="flex justify-between items-center p-3 bg-yellow-50 rounded border border-yellow-200"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDateTime(apt.dateTime)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {apt.totalPrice.toFixed(2)} LE
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                          pending
                        </span>
                      </div>
                    );
                  })}
                {appointments.filter((apt) => apt.dateTime >= Date.now() && apt.status === 'pending').length === 0 && (
                  <p className="text-sm text-gray-600 text-center py-4">No pending appointments</p>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                ✅ Approved Appointments ({appointments.filter((apt) => apt.status === 'approved').length})
              </h3>
              <div className="space-y-3">
                {appointments
                  .filter((apt) => apt.status === 'approved')
                  .sort((a, b) => a.dateTime - b.dateTime)
                  .slice(0, 5)
                  .map((apt) => {
                    return (
                      <div
                        key={apt.firebaseId}
                        className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-200"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDateTime(apt.dateTime)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {apt.totalPrice.toFixed(2)} LE
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          approved
                        </span>
                      </div>
                    );
                  })}
                {appointments.filter((apt) => apt.dateTime >= Date.now() && apt.status === 'approved').length === 0 && (
                  <p className="text-sm text-gray-600 text-center py-4">No approved appointments</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {currentTab === 'workers' && (
        <WorkerManagement
          workers={workers}
          services={services}
          appointments={appointments}
          ownerId={ownerId}
          onAddWorker={handleAddWorker}
          onUpdateWorker={handleUpdateWorker}
          onDeleteWorker={handleDeleteWorker}
        />
      )}

      {currentTab === 'services' && isOwner && (
        <ServiceManagement
          ownerId={ownerId}
          workers={workers}
          services={services}
          onAddService={handleAddService}
          onUpdateService={handleUpdateService}
          onDeleteService={handleDeleteService}
        />
      )}

      {currentTab === 'appointments' && (
        <AppointmentManagement
          appointments={appointments}
          workers={workersMap}
          customers={customers}
          onUpdateStatus={handleUpdateAppointmentStatus}
        />
      )}

      {currentTab === 'customers' && (
        <CustomerList ownerId={ownerId} />
      )}

      {currentTab === 'analytics' && isOwner && (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="text-gray-600 mt-2">Monitor your business performance with detailed analytics</p>
          </div>
          <AnalyticsCharts appointments={appointments} ownerId={ownerId} />
        </div>
      )}

      {currentTab === 'attendance' && (
        <AdminAttendance workers={workers} ownerId={ownerId} />
      )}

      {currentTab === 'financials' && isCashier && (
        <div className="space-y-12">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">My Financials</h2>
            <PersonalFinancials
              employeeId={user?.id || ''}
              ownerId={ownerId}
            />
          </div>

          <div className="border-t pt-12">
            <FinancialManagement
              workers={workers}
              ownerId={ownerId}
              isCashier={isCashier}
            />
          </div>
        </div>
      )}

      {currentTab === 'financials' && !isCashier && (
        <FinancialManagement
          workers={workers}
          ownerId={ownerId}
          isCashier={isCashier}
        />
      )}

      {currentTab === 'expenses' && (
        <ExpenseManagement
          ownerId={ownerId}
          isAdmin={isOwner}
        />
      )}

      {currentTab === 'ratings' && (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Ratings</h1>
            <p className="text-gray-600 mt-2">View all customer ratings for your workers</p>
          </div>
          <Card className="p-6">
            <AllRatingsView workers={workers} ownerId={ownerId} />
          </Card>
        </div>
      )}

      <ChangePasswordDialog
        isOpen={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
      />
    </DashboardLayout>
  );
}
