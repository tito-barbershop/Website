import { useState, useEffect } from 'react';
import type { Worker } from '../types';
import * as appointmentService from '../services/appointmentService';

interface AllRatingsViewProps {
  workers: (Worker & { firebaseId: string })[];
  ownerId: string;
}

interface RatingWithAppointmentTime {
  workerName: string;
  workerId: string;
  score: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  appointmentId?: string;
  appointmentTime?: number;
}

export function AllRatingsView({ workers, ownerId }: AllRatingsViewProps) {
  const [allRatings, setAllRatings] = useState<RatingWithAppointmentTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRatings = async () => {
      try {
        const ratings: RatingWithAppointmentTime[] = [];
        const appointments = await appointmentService.getAppointments(ownerId);
        const appointmentsMap = new Map(appointments.map((apt) => [apt.firebaseId, apt]));

        workers.forEach((worker) => {
          if (worker.ratings) {
            const ratingsArray = Array.isArray(worker.ratings) ? worker.ratings : Object.values(worker.ratings || {});

            if (ratingsArray && ratingsArray.length > 0) {
              ratingsArray.forEach((rating: any) => {
                const appointment = rating.appointmentId ? appointmentsMap.get(rating.appointmentId) : undefined;
                ratings.push({
                  workerName: worker.name,
                  workerId: worker.firebaseId,
                  score: rating.score,
                  customerId: rating.customerId,
                  customerName: rating.customerName,
                  customerPhone: rating.customerPhone,
                  notes: rating.notes,
                  appointmentId: rating.appointmentId,
                  appointmentTime: appointment?.dateTime,
                });
              });
            }
          }
        });

        // Sort by appointment time (newest first)
        const sorted = ratings.sort((a, b) => {
          const timeA = a.appointmentTime || Number.MIN_VALUE;
          const timeB = b.appointmentTime || Number.MIN_VALUE;
          return timeB - timeA;
        });
        setAllRatings(sorted);
      } catch (error) {
        console.error('Error loading ratings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRatings();
  }, [workers, ownerId]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading ratings...</p>
      </div>
    );
  }

  const allRatings_display = allRatings;

  if (allRatings_display.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">No ratings yet</p>
        <p className="text-gray-500 mt-2">Ratings from customers will appear here</p>
      </div>
    );
  }

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <p className="text-gray-600">
          Total ratings: <span className="font-semibold text-gray-900">{allRatings_display.length}</span>
        </p>
      </div>

      <div className="space-y-3">
        {allRatings_display.map((rating, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex flex-wrap items-center gap-10">

              {/* Appointment Time */}
              {rating.appointmentTime && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">{formatDateTime(rating.appointmentTime)}</span>
                </div>
              )}
              
              {/* Worker */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">Worker:</span>
                <span className="text-gray-700">{rating.workerName}</span>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {/* Filled stars */}
                  {Array.from({ length: rating.score }).map((_, i) => (
                    <span key={`filled-${i}`} style={{ color: '#FBBF24' }}>
                      ⭐
                    </span>
                  ))}
                  {/* Empty stars */}
                  {Array.from({ length: 5 - rating.score }).map((_, i) => (
                    <span key={`empty-${i}`}>
                      ☆
                    </span>
                  ))}
                </div>
                <span className="text-gray-900">({rating.score})</span>
              </div>

              {/* Customer */}
              <div className="flex items-center gap-1">
                <span className="font-semibold text-gray-900">Customer:</span>
                <span className="text-gray-700">{rating.customerName}</span>
                <span className="text-gray-500">•</span>
                <a
                  href={`tel:${rating.customerPhone}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  {rating.customerPhone}
                </a>
              </div>

              {rating.notes && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">Notes:</span>
                  <span className="text-gray-700">{rating.notes}</span>
                </div>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
