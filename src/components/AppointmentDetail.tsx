import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { formatDateTime } from '../lib/utils';
import type { Appointment, Service } from '../types';

interface AppointmentDetailProps {
  appointment: (Appointment & { firebaseId: string }) | null;
  services: (Service & { firebaseId: string })[];
  onClose: () => void;
  onApprove?: () => Promise<void>;
  onComplete?: () => Promise<void>;
  isLoading?: boolean;
}

export function AppointmentDetail({
  appointment,
  services,
  onClose,
  onApprove,
  onComplete,
  isLoading = false,
}: AppointmentDetailProps) {
  if (!appointment) {
    return null;
  }

  const appointmentServices = services.filter((s) => appointment.selectedServices.includes(s.firebaseId));

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-screen overflow-y-auto p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Appointment Details</h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Status:</span>
            <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
          </div>

          {/* Date and Time */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Date & Time</h3>
            <p className="text-lg font-medium text-gray-900">{formatDateTime(appointment.dateTime)}</p>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Services</h3>
            {appointmentServices.length === 0 ? (
              <p className="text-gray-500">No services found</p>
            ) : (
              <div className="space-y-2">
                {appointmentServices.map((service) => (
                  <div
                    key={service.firebaseId}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{service.name}</p>
                      <p className="text-sm text-gray-600">{service.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{service.price.toFixed(2)} LE</p>
                      <p className="text-sm text-gray-600">{service.duration} mins</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing Summary */}
          <div className="border-t pt-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{appointment.totalPrice.toFixed(2)} LE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{appointment.totalDuration} minutes</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span className="text-blue-600">{appointment.totalPrice.toFixed(2)} LE</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Notes</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded">{appointment.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Close
            </Button>
            {appointment.status === 'pending' && onApprove && (
              <Button
                variant="primary"
                onClick={onApprove}
                isLoading={isLoading}
                className="flex-1"
              >
                Approve Appointment
              </Button>
            )}
            {appointment.status === 'approved' && onComplete && (
              <Button
                variant="primary"
                onClick={onComplete}
                isLoading={isLoading}
                className="flex-1"
              >
                Mark as Completed
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
