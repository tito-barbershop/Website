import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';
import { useToast } from '../contexts/ToastContext';
import { WorkerLayout } from '../components/WorkerLayout';
import { WorkerStats } from '../components/WorkerStats';
import { AppointmentsList } from '../components/AppointmentsList';
import { AppointmentDetail } from '../components/AppointmentDetail';
import { ChangePasswordDialog } from '../components/ChangePasswordDialog';
import { WorkerScheduleDialog } from '../components/WorkerScheduleDialog';
import { WorkerRatingsDisplay } from '../components/WorkerRatingsDisplay';
import { WorkerAttendanceCard } from '../components/WorkerAttendanceCard';
import { PersonalFinancials } from '../components/PersonalFinancials';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import * as appointmentService from '../services/appointmentService';
import * as serviceService from '../services/serviceService';
import * as workerService from '../services/workerService';
import * as attendanceService from '../services/attendanceService';
import type { Appointment, Service, Worker, WorkingHours, Attendance, SimpleRating } from '../types';

export function WorkerDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [currentTab, setCurrentTab] = useState('appointments');
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<(Appointment & { firebaseId: string })[]>([]);
  const [services, setServices] = useState<(Service & { firebaseId: string })[]>([]);
  const [worker, setWorker] = useState<(Worker & { firebaseId: string }) | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<(Appointment & { firebaseId: string }) | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [ownerId, setOwnerId] = useState<string>('');
  const [workerId, setWorkerId] = useState<string>('');
  const [todayAttendance, setTodayAttendance] = useState<(Attendance & { firebaseId: string }) | undefined>();
  const [ratings, setRatings] = useState<SimpleRating[]>([]);

  const currentUser = auth.currentUser;
  if (!currentUser) {
    navigate('/login');
    return null;
  }

  useEffect(() => {
    const loadWorkerData = async () => {
      try {
        setIsLoading(true);

        // Check if this is first login (temp password was used)
        const isFirstLogin = localStorage.getItem('workerFirstLogin') !== 'false';
        if (isFirstLogin) {
          setShowPasswordDialog(true);
          localStorage.setItem('workerFirstLogin', 'false');
        }

        // First, try to get worker data from localStorage (cached from owner dashboard or login)
        const cachedWorkerData = localStorage.getItem('workerData');
        const cachedOwnerId = localStorage.getItem('ownerId');

        if (!cachedOwnerId) {
          showToast('Owner ID not found. Please login again.', 'error');
          navigate('/login');
          return;
        }

        let resolvedWorkerId: string;
        const resolvedOwnerId: string = cachedOwnerId;
        setOwnerId(resolvedOwnerId);

        if (!cachedWorkerData) {
          console.error('Worker data not found in localStorage');
          showToast('Worker session invalid. Please login again.', 'error');
          navigate('/login');
          return;
        }

        try {
          const parsed = JSON.parse(cachedWorkerData);
          resolvedWorkerId = parsed.workerId;
          setWorkerId(resolvedWorkerId);
        } catch (e) {
          console.error('Failed to parse worker data from localStorage:', e);
          showToast('Invalid worker data. Please login again.', 'error');
          navigate('/login');
          return;
        }

        // Fetch worker details
        const workerData = await workerService.getWorker(resolvedOwnerId, resolvedWorkerId);
        if (workerData) {
          setWorker(workerData);
        } else {
          console.error('No worker data returned for:', { ownerId: resolvedOwnerId, workerId: resolvedWorkerId });
        }

        // Fetch worker's appointments
        const workerAppointments = await appointmentService.getWorkerAppointments(resolvedOwnerId, resolvedWorkerId);
        setAppointments(workerAppointments);

        // Fetch worker's services
        const workerServices = await serviceService.getWorkerServices(resolvedOwnerId, resolvedWorkerId);
        setServices(workerServices);

        // Fetch today's attendance
        const today = new Date().toISOString().split('T')[0];
        const attendanceData = await attendanceService.getAttendanceForDate(resolvedOwnerId, resolvedWorkerId, today);
        setTodayAttendance(attendanceData || undefined);

        // Fetch worker ratings
        if (workerData?.ratings) {
          setRatings(workerData.ratings);
        }
      } catch (error) {
        console.error('Error loading worker data:', error);
        showToast('Failed to load worker data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkerData();
  }, [navigate, showToast]);

  const handleApprove = async (appointmentId: string) => {
    try {
      setActionLoading(true);
      const cachedOwnerId = localStorage.getItem('ownerId');
      const cachedWorkerData = localStorage.getItem('workerData');

      if (!cachedOwnerId || !cachedWorkerData) {
        showToast('Session expired. Please login again.', 'error');
        navigate('/login');
        return;
      }

      await appointmentService.updateAppointmentStatus(cachedOwnerId, appointmentId, 'approved');

      // Update local state
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.firebaseId === appointmentId ? { ...apt, status: 'approved' } : apt
        )
      );

      if (selectedAppointment?.firebaseId === appointmentId) {
        setSelectedAppointment({
          ...selectedAppointment,
          status: 'approved',
        });
      }

      showToast('Appointment approved!', 'success');
    } catch (error) {
      console.error('Error approving appointment:', error);
      showToast('Failed to approve appointment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (appointmentId: string) => {
    try {
      setActionLoading(true);
      const cachedOwnerId = localStorage.getItem('ownerId');

      if (!cachedOwnerId) {
        showToast('Session expired. Please login again.', 'error');
        navigate('/login');
        return;
      }

      await appointmentService.updateAppointmentStatus(cachedOwnerId, appointmentId, 'completed');

      // Update local state
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.firebaseId === appointmentId ? { ...apt, status: 'completed' as any } : apt
        )
      );

      if (selectedAppointment?.firebaseId === appointmentId) {
        setSelectedAppointment({
          ...selectedAppointment,
          status: 'completed' as any,
        });
      }

      showToast('Appointment marked as completed!', 'success');
    } catch (error) {
      console.error('Error completing appointment:', error);
      showToast('Failed to complete appointment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSchedule = async (workingHours: WorkingHours) => {
    try {
      const cachedOwnerId = localStorage.getItem('ownerId');
      const cachedWorkerData = localStorage.getItem('workerData');

      if (!cachedOwnerId || !cachedWorkerData) {
        showToast('Session expired. Please login again.', 'error');
        navigate('/login');
        return;
      }

      const { workerId } = JSON.parse(cachedWorkerData);
      await workerService.updateWorkerWorkingHours(cachedOwnerId, workerId, workingHours);

      // Update local state
      setWorker((prev) =>
        prev
          ? {
              ...prev,
              workingHours,
            }
          : null
      );

      showToast('Schedule updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating schedule:', error);
      showToast('Failed to update schedule', 'error');
    }
  };

  if (isLoading) {
    return (
      <WorkerLayout currentTab={currentTab} onTabChange={setCurrentTab}>
        <div className="flex justify-center items-center h-screen">
          <p className="text-gray-500 text-lg">Loading dashboard...</p>
        </div>
      </WorkerLayout>
    );
  }

  return (
    <WorkerLayout
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      workerName={worker?.name || 'Worker'}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your appointments and schedule</p>
        </div>

        <WorkerStats appointments={appointments} todayAttendance={todayAttendance} ratings={ratings} />

        {currentTab === 'appointments' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">My Appointments</h2>
            <AppointmentsList
              appointments={appointments}
              onSelectAppointment={setSelectedAppointment}
              onApprove={handleApprove}
              onComplete={handleComplete}
              isLoading={false}
              ownerId={ownerId}
            />
          </div>
        )}

        {currentTab === 'schedule' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">My Schedule</h2>
              <Button onClick={() => setShowScheduleDialog(true)}>Edit Schedule</Button>
            </div>
            <Card className="p-6">
              {worker ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Working Hours</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(worker.workingHours || {}).map(([day, hours]: [string, any]) => (
                        <div key={day} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="font-medium capitalize text-gray-900">{day}</span>
                          {hours.isOpen ? (
                            <span className="text-gray-600">
                              {hours.start} - {hours.end}
                            </span>
                          ) : (
                            <span className="text-gray-400">Closed</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Services</h3>
                    {services.length === 0 ? (
                      <p className="text-gray-500">No services assigned yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {services.map((service) => (
                          <Card key={service.firebaseId} className="p-4 bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-gray-900">{service.name}</p>
                                <p className="text-sm text-gray-600">{service.description}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{service.price.toFixed(2)} LE</p>
                                <p className="text-sm text-gray-600">{service.duration} mins</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Unable to load schedule information</p>
              )}
            </Card>
          </div>
        )}

        {currentTab === 'attendance' && ownerId && workerId && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Attendance</h2>
            <WorkerAttendanceCard ownerId={ownerId} workerId={workerId} />
          </div>
        )}

        {currentTab === 'ratings' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">My Rating</h2>
            <Card className="p-6">
              {worker && worker.ratings && worker.ratings.length > 0 ? (
                <WorkerRatingsDisplay
                  ratings={worker.ratings}
                />
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">No rating yet</p>
                  <p className="text-gray-500 mt-2">Your rating will appear here once you receive feedback from customers.</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {currentTab === 'financials' && ownerId && currentUser?.uid && (
          <PersonalFinancials
            employeeId={currentUser.uid}
            ownerId={ownerId}
          />
        )}

        <AppointmentDetail
          appointment={selectedAppointment}
          services={services}
          onClose={() => setSelectedAppointment(null)}
          onApprove={
            selectedAppointment?.status === 'pending'
              ? () => handleApprove(selectedAppointment.firebaseId)
              : undefined
          }
          onComplete={
            selectedAppointment?.status === 'approved'
              ? () => handleComplete(selectedAppointment.firebaseId)
              : undefined
          }
          isLoading={actionLoading}
        />

        <ChangePasswordDialog
          isOpen={showPasswordDialog}
          onClose={() => setShowPasswordDialog(false)}
        />

        <WorkerScheduleDialog
          isOpen={showScheduleDialog}
          workingHours={worker?.workingHours}
          onSave={handleUpdateSchedule}
          onClose={() => setShowScheduleDialog(false)}
          isLoading={actionLoading}
        />
      </div>
    </WorkerLayout>
  );
}
