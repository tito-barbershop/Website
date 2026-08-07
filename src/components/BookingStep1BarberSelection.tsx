import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { WorkerRatingBadge } from './WorkerRatingBadge';
import type { Worker } from '../types';

interface BookingStep1BarberSelectionProps {
  workers: (Worker & { firebaseId: string })[];
  selectedWorkerId: string | null;
  onSelectWorker: (workerId: string) => void;
  onNext: () => void;
  isLoading?: boolean;
}

export function BookingStep1BarberSelection({
  workers,
  selectedWorkerId,
  onSelectWorker,
  onNext,
  isLoading = false,
}: BookingStep1BarberSelectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a Barber</h2>
        <p className="text-gray-600">Choose your preferred barber</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workers.map((worker) => (
          <Card
            key={worker.firebaseId}
            className={`p-4 cursor-pointer transition-all ${
              selectedWorkerId === worker.firebaseId
                ? 'border-2 border-blue-500 bg-blue-50'
                : 'hover:shadow-md'
            }`}
            onClick={() => onSelectWorker(worker.firebaseId)}
          >
            <div>
              <h3 className="font-semibold text-gray-900">{worker.name}</h3>
              <div className="mt-2">
                <WorkerRatingBadge ratings={worker.ratings || []} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!selectedWorkerId || isLoading}>
          Next: Select Services
        </Button>
      </div>
    </div>
  );
}
