import type { SimpleRating } from '../types';
import { calculateAverageRating, getRatingStars, ensureRatingsArray, getFilledStars } from '../lib/ratingUtils';

interface WorkerRatingsDisplayProps {
  ratings: SimpleRating[];
}

export function WorkerRatingsDisplay({
  ratings,
}: WorkerRatingsDisplayProps) {
  const validRatings = ensureRatingsArray(ratings);

  if (!validRatings || validRatings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No ratings yet</p>
      </div>
    );
  }

  const avgRating = calculateAverageRating(validRatings);
  const displayRating = getRatingStars(avgRating);
  const filledStars = getFilledStars(validRatings);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {displayRating}
            </div>
            <div className="flex gap-1 justify-center mt-2">
              {/* Filled stars */}
              {Array.from({ length: filledStars }).map((_, i) => (
                <span key={`filled-${i}`} className="text-3xl" style={{ color: '#FBBF24' }}>
                  ⭐
                </span>
              ))}
              {/* Empty stars */}
              {Array.from({ length: 5 - filledStars }).map((_, i) => (
                <span key={`empty-${i}`} className="text-3xl">
                  ☆
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 px-6">
              Based on {validRatings.length} rating{validRatings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
