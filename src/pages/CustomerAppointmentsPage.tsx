import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { RatingDialog } from '../components/RatingDialog';
import { formatDateTime } from '../lib/utils';
import { branding } from '../config/branding';
import * as appointmentService from '../services/appointmentService';
import * as workerService from '../services/workerService';
import type { Appointment, Worker } from '../types';

export function CustomerAppointmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<(Appointment & { firebaseId: string })[]>([]);
  const [workers, setWorkers] = useState<Map<string, Worker & { firebaseId: string }>>(new Map());
  const [tab, setTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [ratingOpen, setRatingOpen] = useState(false);
  const [selectedWorkerForRating, setSelectedWorkerForRating] = useState<(Worker & { firebaseId: string }) | null>(null);
  const [selectedAppointmentForRating, setSelectedAppointmentForRating] = useState<string | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);

  const refreshAppointments = async () => {
    try {
      let storedOwnerId: string | null = localStorage.getItem('currentShopOwnerId');

      if (!storedOwnerId) {
        try {
          const shopConfigSnapshot = await get(ref(db, 'shopConfig/currentOwnerId'));
          if (shopConfigSnapshot.exists()) {
            storedOwnerId = shopConfigSnapshot.val();
            if (storedOwnerId) {
              localStorage.setItem('currentShopOwnerId', storedOwnerId);
            }
          }
        } catch (error) {
          console.error('Error fetching owner ID from Firebase:', error);
        }
      }

      if (!storedOwnerId || !user) return;

      const allAppointments = await appointmentService.getAppointments(storedOwnerId);
      const customerAppointments = allAppointments.filter((apt) => apt.customerId === user.id);
      setAppointments(customerAppointments);

      const workersData = await workerService.getWorkers(storedOwnerId);
      console.log('Workers loaded:', workersData);
      const workersMap = new Map(
        workersData.map((w) => [
          w.firebaseId,
          {
            ...w,
            ratings: Array.isArray(w.ratings) ? w.ratings : [],
          },
        ])
      );

      // Also load worker data for appointments that reference workers not in the current list
      const missingWorkerIds = new Set<string>();
      customerAppointments.forEach((apt) => {
        if (!workersMap.has(apt.workerId)) {
          missingWorkerIds.add(apt.workerId);
        }
      });

      if (missingWorkerIds.size > 0) {
        console.log('Loading missing workers:', Array.from(missingWorkerIds));
        for (const workerId of missingWorkerIds) {
          try {
            const workerRef = ref(db, `workers/${storedOwnerId}/${workerId}`);
            const workerSnapshot = await get(workerRef);
            console.log(`Fetching worker ${workerId}, exists:`, workerSnapshot.exists());
            if (workerSnapshot.exists()) {
              const workerData = workerSnapshot.val();
              console.log(`Worker ${workerId} data:`, workerData);
              workersMap.set(workerId, {
                firebaseId: workerId,
                ...workerData,
                ratings: Array.isArray(workerData.ratings) ? workerData.ratings : [],
              });
            }
          } catch (error) {
            console.error(`Error loading worker ${workerId}:`, error);
          }
        }
      }

      console.log('Workers map created:', workersMap);
      setWorkers(workersMap);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await refreshAppointments();
      } catch (error) {
        console.error('Error loading appointments:', error);
        showToast('Failed to load appointments', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Refresh when page regains focus
    const handleFocus = () => {
      refreshAppointments();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [navigate, showToast, user]);

  const now = Date.now();
  const categorizedAppointments = {
    upcoming: appointments
      .filter((apt) => apt.status === 'pending' || apt.status === 'approved' || (apt.dateTime >= now && apt.status !== 'cancelled'))
      .sort((a, b) => a.dateTime - b.dateTime),
    past: appointments
      .filter((apt) => apt.status === 'completed' || (apt.dateTime < now && apt.status !== 'cancelled'))
      .sort((a, b) => b.dateTime - a.dateTime),
    cancelled: appointments
      .filter((apt) => apt.status === 'cancelled')
      .sort((a, b) => b.dateTime - a.dateTime),
  };

  const displayAppointments = categorizedAppointments[tab];


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      const storedOwnerId = localStorage.getItem('currentShopOwnerId');
      if (!storedOwnerId) {
        showToast('Shop not configured', 'error');
        return;
      }

      await appointmentService.updateAppointmentStatus(storedOwnerId, appointmentId, 'cancelled');
      showToast('Appointment cancelled successfully', 'success');

      // Reload appointments
      const allAppointments = await appointmentService.getAppointments(storedOwnerId);
      const currentUser = localStorage.getItem('userId') || 'anonymous';
      const customerAppointments = allAppointments.filter((apt) => apt.customerId === currentUser);
      setAppointments(customerAppointments);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      showToast('Failed to cancel appointment', 'error');
    }
  };

  const handleRescheduleAppointment = (appointmentId: string, workerId: string) => {
    navigate('/book', { state: { selectedWorkerId: workerId, rescheduleAppointmentId: appointmentId } });
  };

  const handleOpenRatingDialog = (worker: Worker & { firebaseId: string }, appointmentId: string) => {
    setSelectedWorkerForRating(worker);
    setSelectedAppointmentForRating(appointmentId);
    setRatingOpen(true);
  };

  const handleSubmitRating = async (rating: number, notes?: string) => {
    if (!selectedWorkerForRating || !user || !selectedAppointmentForRating) return;

    setRatingLoading(true);

    try {
      const ownerId = localStorage.getItem('currentShopOwnerId');
      if (!ownerId) {
        showToast('Shop not configured', 'error');
        setRatingLoading(false);
        return;
      }

      // Submit rating
      await workerService.addRating(
        ownerId,
        selectedWorkerForRating.firebaseId,
        rating,
        user.id,
        user.name,
        user.phone,
        selectedAppointmentForRating!,
        notes
      );

      showToast('Rating submitted successfully', 'success');

      // Close dialog and reset state immediately
      setRatingOpen(false);
      setSelectedWorkerForRating(null);
      setRatingLoading(false);

      // Reload workers to get updated ratings in background
      try {
        const workersData = await workerService.getWorkers(ownerId);
        if (workersData && Array.isArray(workersData)) {
          const workersMap = new Map(
            workersData.map((w) => [
              w.firebaseId,
              {
                ...w,
                ratings: Array.isArray(w.ratings) ? w.ratings : [],
              },
            ])
          );
          setWorkers(workersMap);
        }
      } catch (reloadError) {
        console.error('Error reloading workers after rating:', reloadError);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      showToast('Failed to submit rating', 'error');
      setRatingLoading(false);
    }
  };

  const hasRated = (workerId: string, appointmentId: string): boolean => {
    const worker = workers.get(workerId);
    if (!worker || !worker.ratings) return false;
    return worker.ratings.some((r) => r.appointmentId === appointmentId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/customer/home')}>
            <span className="text-2xl">{branding.logo}</span>
            <h1 className="text-xl font-bold text-gray-900">{branding.shopName}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/customer/home')}>
            Back to Home
          </Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Appointments</h1>
          <p className="text-gray-600">View and manage your bookings</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          {(['upcoming', 'past', 'cancelled'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t === 'upcoming' && 'Upcoming'}
              {t === 'past' && 'Past'}
              {t === 'cancelled' && 'Cancelled'}
              <span className="ml-2 text-sm">({categorizedAppointments[t].length})</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center text-gray-500 py-12">Loading appointments...</div>
        ) : displayAppointments.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600 mb-4">
              {tab === 'upcoming' && 'No upcoming appointments. Ready to book?'}
              {tab === 'past' && 'No past appointments yet.'}
              {tab === 'cancelled' && 'No cancelled appointments.'}
            </p>
            {tab === 'upcoming' && (
              <Button onClick={() => navigate('/customer/home')}>Book an Appointment</Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {displayAppointments.map((apt) => (
              <Card key={apt.firebaseId} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {workers.get(apt.workerId)?.name || 'Unknown Barber'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{formatDateTime(apt.dateTime)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(apt.status)}`}>
                    {apt.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4 pb-4 border-b">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Duration:</span> {apt.totalDuration} minutes
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Total Price:</span>{' '}
                    <span className="font-semibold text-blue-600">{apt.totalPrice.toFixed(2)} LE</span>
                  </p>
                </div>

                <div className="flex gap-2">
                  {tab === 'upcoming' && apt.status === 'pending' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleCancelAppointment(apt.firebaseId)}
                    >
                      Cancel
                    </Button>
                  )}
                  {tab === 'upcoming' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRescheduleAppointment(apt.firebaseId, apt.workerId)}
                    >
                      Reschedule
                    </Button>
                  )}
                  {tab === 'past' && apt.status === 'completed' && !hasRated(apt.workerId, apt.firebaseId) && workers.get(apt.workerId) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenRatingDialog(workers.get(apt.workerId)!, apt.firebaseId)}
                    >
                      Rate Barber
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <RatingDialog
        open={ratingOpen}
        onOpenChange={setRatingOpen}
        worker={selectedWorkerForRating}
        customerName={user?.name || 'Customer'}
        onSubmit={handleSubmitRating}
        isLoading={ratingLoading}
        appointmentId={selectedAppointmentForRating || undefined}
      />
    </div>
  );
}
