import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { BookingStep2ServiceSelection } from '../components/BookingStep2ServiceSelection';
import { BookingStep3DateTimeSelection } from '../components/BookingStep3DateTimeSelection';
import { BookingReview } from '../components/BookingReview';
import { branding } from '../config/branding';
import { sendEmail, generateAppointmentConfirmationEmail, generateWorkerNotificationEmail } from '../services/brevoService';
import * as workerService from '../services/workerService';
import * as serviceService from '../services/serviceService';
import * as appointmentService from '../services/appointmentService';
import * as customerService from '../services/customerService';
import type { Worker, Service, Appointment } from '../types';

type BookingStep = 2 | 3 | 4;

export function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<BookingStep>(2);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Data state
  const [workers, setWorkers] = useState<(Worker & { firebaseId: string })[]>([]);
  const [services, setServices] = useState<Map<string, (Service & { firebaseId: string })[]>>(new Map());
  const [appointments, setAppointments] = useState<(Appointment & { firebaseId: string })[]>([]);
  const [ownerId, setOwnerId] = useState('');

  // Selection state - worker is pre-selected from customer home page
  const [selectedWorkerId] = useState<string | null>(
    (location.state?.selectedWorkerId as string) || null
  );

  // Owner ID passed from customer home page
  const [passedOwnerId] = useState<string | null>(
    (location.state?.ownerId as string) || null
  );

  // Reschedule state - appointment ID if rescheduling
  const [rescheduleAppointmentId] = useState<string | null>(
    (location.state?.rescheduleAppointmentId as string) || null
  );

  // Validate that worker was selected
  useEffect(() => {
    if (!selectedWorkerId && !isLoading) {
      showToast('Please select a barber first', 'error');
      navigate('/customer/home');
    }
  }, [selectedWorkerId, isLoading, navigate, showToast]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Get current selections
  const currentWorker = workers.find((w) => w.firebaseId === selectedWorkerId);
  const currentServices = services.get(selectedWorkerId || '')?.filter((s) => selectedServiceIds.includes(s.firebaseId)) || [];
  const totalPrice = currentServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = currentServices.reduce((sum, s) => sum + s.duration, 0);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Use passed owner ID if available, otherwise fall back to localStorage, then Firebase
        let ownerToUse: string | null = passedOwnerId || localStorage.getItem('currentShopOwnerId');

        // If still no owner ID, fetch from Firebase (for customers on new devices)
        if (!ownerToUse) {
          try {
            const shopConfigSnapshot = await get(ref(db, 'shopConfig/currentOwnerId'));
            if (shopConfigSnapshot.exists()) {
              ownerToUse = shopConfigSnapshot.val();
              // Cache it locally for future use
              if (ownerToUse) {
                localStorage.setItem('currentShopOwnerId', ownerToUse);
              }
            }
          } catch (error) {
            console.error('Error fetching owner ID from Firebase:', error);
          }
        }

        if (!ownerToUse) {
          showToast('Shop not configured', 'error');
          navigate('/customer/home');
          return;
        }

        const workersData = await workerService.getWorkers(ownerToUse);
        setWorkers(workersData);
        setOwnerId(ownerToUse);

        const servicesData = await serviceService.getAllWorkerServices(ownerToUse);
        setServices(servicesData);

        const appointmentsData = await appointmentService.getAppointments(ownerToUse);
        setAppointments(appointmentsData);
      } catch (error) {
        console.error('Error loading booking data:', error);
        showToast('Failed to load booking data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [navigate, showToast]);

  // Generate available time slots
  const getAvailableTimeSlots = () => {
    if (!currentWorker || !selectedDate) return [];

    const date = new Date(selectedDate);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()] as keyof typeof currentWorker.workingHours;
    const workingHours = currentWorker.workingHours[dayName];

    if (!workingHours?.isOpen) return [];

    // Get booked appointments for this worker on this date
    const dateStart = new Date(selectedDate);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(selectedDate);
    dateEnd.setHours(23, 59, 59, 999);

    const bookedSlots = new Set<string>();
    appointments.forEach((apt: Appointment & { firebaseId: string }) => {
      // Skip the appointment being rescheduled when checking for booked slots
      if (apt.firebaseId === rescheduleAppointmentId) {
        return;
      }

      if (apt.workerId === selectedWorkerId && apt.status !== 'cancelled') {
        const aptDate = new Date(apt.dateTime);
        aptDate.setHours(0, 0, 0, 0);

        // Check if appointment is on the same date
        if (aptDate.getTime() === dateStart.getTime()) {
          // Mark this time slot and the duration as booked
          const [aptHour, aptMin] = new Date(apt.dateTime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }).split(':').map(Number);

          // Mark all 30-min slots this appointment occupies
          let durationLeft = apt.totalDuration;
          let checkHour = aptHour;
          let checkMin = aptMin;

          while (durationLeft > 0) {
            const slotTime = `${String(checkHour).padStart(2, '0')}:${String(checkMin).padStart(2, '0')}`;
            bookedSlots.add(slotTime);
            durationLeft -= 30;

            checkMin += 30;
            if (checkMin >= 60) {
              checkMin = 0;
              checkHour += 1;
            }
          }
        }
      }
    });

    // Check if selected date is today to filter out past times
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = dateStart.getTime() === today.getTime();

    // Get current time if booking for today
    let currentHourNow = 0;
    let currentMinNow = 0;
    if (isToday) {
      const now = new Date();
      currentHourNow = now.getHours();
      currentMinNow = now.getMinutes();
    }

    const slots = [];
    const [startHour, startMin] = workingHours.start.split(':').map(Number);
    const [endHour, endMin] = workingHours.end.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

      // Check if slot is in the past (only for today)
      const isInPast = isToday && (currentHour < currentHourNow || (currentHour === currentHourNow && currentMin < currentMinNow));

      // Only add if not already booked and not in the past
      if (!bookedSlots.has(timeStr) && !isInPast) {
        slots.push(timeStr);
      }

      // Add 30-minute intervals
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour += 1;
      }
    }

    return slots;
  };

  const handleConfirmBooking = async () => {
    try {
      setIsSaving(true);

      if (!user) {
        showToast('Please log in to book an appointment', 'error');
        navigate('/login');
        return;
      }

      const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}`).getTime();

      if (rescheduleAppointmentId) {
        // Update existing appointment
        await appointmentService.updateAppointment(ownerId, rescheduleAppointmentId, {
          selectedServices: selectedServiceIds,
          dateTime: appointmentDateTime,
          totalPrice,
          totalDuration,
          status: 'pending',
          notes: '',
        });

        showToast('Appointment rescheduled successfully!', 'success');
      } else {
        // Create new appointment
        const appointmentData = {
          customerId: user.id,
          workerId: selectedWorkerId!,
          selectedServices: selectedServiceIds,
          dateTime: appointmentDateTime,
          totalPrice,
          totalDuration,
          status: 'pending' as const,
          notes: '',
          createdAt: Date.now(),
        };

        await appointmentService.createAppointment(ownerId, appointmentData);

        // Send confirmation emails
        try {
          const customer = await customerService.getCustomer(user.id);
          const appointmentDate = new Date(appointmentDateTime);
          const formattedDate = appointmentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });

          const serviceNames = currentServices.map(s => s.name).join(', ');

          // Send email to customer
          const customerHtmlContent = generateAppointmentConfirmationEmail(
            customer?.name || 'Customer',
            currentWorker?.name || 'Barber',
            formattedDate,
            formattedTime,
            serviceNames
          );

          await sendEmail({
            to: [{ email: user.email, name: customer?.name }],
            subject: 'Appointment Confirmation - BarberHub',
            htmlContent: customerHtmlContent
          });

          // Send email to worker
          const workerHtmlContent = generateWorkerNotificationEmail(
            currentWorker?.name || 'Barber',
            customer?.name || 'Customer',
            customer?.phone || 'N/A',
            formattedDate,
            formattedTime,
            serviceNames,
            totalPrice
          );

          await sendEmail({
            to: [{ email: currentWorker?.email || '', name: currentWorker?.name }],
            subject: 'New Appointment Request - BarberHub',
            htmlContent: workerHtmlContent
          });
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
          // Don't fail the booking if email fails
        }

        showToast('Booking confirmed! Your appointment is pending approval.', 'success');
      }

      navigate('/customer/appointments');
    } catch (error) {
      console.error('Error saving appointment:', error);
      showToast('Failed to save appointment', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/customer/home')}>
            <img src={branding.logo} alt="logo" className="w-15 h-8" />
            <h1 className="text-xl font-bold text-gray-900">{branding.shopName}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        <div className="mb-8 flex justify-between items-center">
          {[2, 3, 4].map((s) => (
            <div key={s} className="flex-1 flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  s <= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                {s - 1}
              </div>
              {s < 4 && <div className={`flex-1 h-1 mx-2 ${s < step ? 'bg-blue-600' : 'bg-gray-300'}`} />}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="mb-8 text-center">
          <p className="text-sm text-gray-600 font-medium">
            {rescheduleAppointmentId ? 'Reschedule Appointment' : 'New Appointment'} - Step {step - 1} of 3: {step === 2 && 'Select Services'}
            {step === 3 && 'Choose Date & Time'}
            {step === 4 && 'Review Booking'}
          </p>
        </div>

        <Card className="p-8">
          {step === 2 && currentWorker && (
            <BookingStep2ServiceSelection
              services={services.get(selectedWorkerId || '') || []}
              selectedServiceIds={selectedServiceIds}
              onSelectService={(serviceId, selected) => {
                setSelectedServiceIds((prev) =>
                  selected ? [...prev, serviceId] : prev.filter((id) => id !== serviceId)
                );
              }}
              onNext={() => setStep(3)}
              onBack={() => navigate(rescheduleAppointmentId ? '/customer/appointments' : '/customer/home')}
              isLoading={isSaving}
            />
          )}

          {step === 3 && currentWorker && (
            <BookingStep3DateTimeSelection
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              availableTimes={getAvailableTimeSlots()}
              onSelectDate={setSelectedDate}
              onSelectTime={setSelectedTime}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
              isLoading={isSaving}
              totalDuration={totalDuration}
            />
          )}

          {step === 4 && currentWorker && currentServices.length > 0 && (
            <BookingReview
              worker={currentWorker}
              services={currentServices}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              totalPrice={totalPrice}
              totalDuration={totalDuration}
              onConfirm={handleConfirmBooking}
              onBack={() => setStep(3)}
              isLoading={isSaving}
            />
          )}
        </Card>
      </main>
    </div>
  );
}
