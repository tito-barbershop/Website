import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { WorkerRatingBadge } from './WorkerRatingBadge';
import { formatDateTime } from '../lib/utils';
import type { Worker, Service } from '../types';

interface BookingReviewProps {
  worker: Worker & { firebaseId: string };
  services: (Service & { firebaseId: string })[];
  selectedDate: string;
  selectedTime: string;
  totalPrice: number;
  totalDuration: number;
  onConfirm: () => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
}

export function BookingReview({
  worker,
  services,
  selectedDate,
  selectedTime,
  totalPrice,
  totalDuration,
  onConfirm,
  onBack,
  isLoading = false,
}: BookingReviewProps) {

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Booking</h2>
        <p className="text-gray-600">Please confirm all details before booking</p>
      </div>

      {/* Barber Info */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{worker.name}</h3>
        <div className="mt-2">
          <WorkerRatingBadge ratings={worker.ratings || []} />
        </div>
      </div>

      {/* Services */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Services</h3>
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.firebaseId} className="flex justify-between items-start pb-3 border-b last:border-b-0">
              <div>
                <p className="font-medium text-gray-900">{service.name}</p>
                <p className="text-sm text-gray-600">{service.description}</p>
                <p className="text-xs text-gray-500 mt-1">⏱️ {service.duration} minutes</p>
              </div>
              <p className="font-semibold text-blue-600 ml-4">{service.price.toFixed(2)} LE</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Date & Time */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-4">Appointment Details</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Date & Time:</span>
            <span className="font-semibold">{formatDateTime(new Date(`${selectedDate}T${selectedTime}`).getTime())}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span className="font-semibold">{totalDuration} minutes</span>
          </div>
        </div>
      </Card>

      {/* Price Summary */}
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-semibold">{totalPrice.toFixed(2)} LE</span>
          </div>
          <div className="flex justify-between pt-3 border-t-2 border-green-300">
            <span className="text-lg font-bold text-gray-900">Total:</span>
            <span className="text-2xl font-bold text-green-600">{totalPrice.toFixed(2)} LE</span>
          </div>
        </div>
      </Card>

      {/* Cancellation Policy */}
      <Card className="p-4 bg-gray-50">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Cancellation Policy:</span> You can cancel or reschedule up to 24 hours before
          your appointment.
        </p>
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button onClick={onConfirm} isLoading={isLoading} className="px-8">
          Confirm Booking
        </Button>
      </div>
    </div>
  );
}
