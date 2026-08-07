import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Checkbox } from './ui/Checkbox';
import type { Service } from '../types';

interface BookingStep2ServiceSelectionProps {
  services: (Service & { firebaseId: string })[];
  selectedServiceIds: string[];
  onSelectService: (serviceId: string, selected: boolean) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function BookingStep2ServiceSelection({
  services,
  selectedServiceIds,
  onSelectService,
  onNext,
  onBack,
  isLoading = false,
}: BookingStep2ServiceSelectionProps) {
  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.firebaseId));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Services</h2>
        <p className="text-gray-600">Choose one or more services</p>
      </div>

      <div className="space-y-3">
        {services.map((service) => (
          <Card
            key={service.firebaseId}
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelectService(service.firebaseId, !selectedServiceIds.includes(service.firebaseId))}
          >
            <div className="flex items-start gap-4">
              <Checkbox
                checked={selectedServiceIds.includes(service.firebaseId)}
                onChange={(checked) => onSelectService(service.firebaseId, checked)}
              />
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{service.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-500">
                    ⏱️ {service.duration} minutes
                  </span>
                  <span className="font-semibold text-blue-600">{service.price.toFixed(2)} LE</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedServices.length > 0 && (
        <Card className="bg-blue-50 border-blue-200 p-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Duration:</span>
              <span className="font-semibold">{totalDuration} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Price:</span>
              <span className="font-semibold text-blue-600">{totalPrice.toFixed(2)} LE</span>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button onClick={onNext} disabled={selectedServiceIds.length === 0 || isLoading}>
          Next: Choose Date & Time
        </Button>
      </div>
    </div>
  );
}
