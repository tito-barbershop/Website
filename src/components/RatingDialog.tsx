import { useState, useEffect } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import type { Worker } from '../types';

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: (Worker & { firebaseId: string }) | null;
  customerName?: string;
  onSubmit: (rating: number, notes?: string, appointmentId?: string) => Promise<void>;
  isLoading?: boolean;
  appointmentId?: string;
}

export function RatingDialog({
  open,
  onOpenChange,
  worker,
  customerName: _customerName,
  onSubmit,
  isLoading = false,
  appointmentId,
}: RatingDialogProps) {
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setRating(5);
      setNotes('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!worker) return;
    await onSubmit(rating, notes, appointmentId);
  };

  if (!worker) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Rate {worker.name}</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-4xl transition-transform cursor-pointer ${
                    star <= rating
                      ? 'text-yellow-400 scale-125'
                      : 'text-gray-200 hover:scale-110'
                  }`}
                >
                  {star <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes (optional)
            </label>
            <Textarea
              placeholder="Share any feedback or notes about this barber..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
