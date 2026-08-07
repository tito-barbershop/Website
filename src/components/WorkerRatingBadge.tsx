import type { SimpleRating } from '../types';
import { calculateAverageRating, getRatingStars, ensureRatingsArray, getFilledStars } from '../lib/ratingUtils';

interface WorkerRatingBadgeProps {
  ratings?: SimpleRating[] | null;
}

export function WorkerRatingBadge({ ratings }: WorkerRatingBadgeProps) {
  const validRatings = ensureRatingsArray(ratings);

  if (!validRatings || validRatings.length === 0) {
    return <p className="text-sm text-gray-500">No ratings yet</p>;
  }

  try {
    const averageRating = calculateAverageRating(validRatings);
    const displayRating = getRatingStars(averageRating);
    const filledStars = getFilledStars(validRatings);

    return (
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {/* Filled stars */}
          {Array.from({ length: filledStars }).map((_, i) => (
            <span key={`filled-${i}`} style={{ color: '#FBBF24' }}>
              ⭐
            </span>
          ))}
          {/* Empty stars */}
          {Array.from({ length: 5 - filledStars }).map((_, i) => (
            <span key={`empty-${i}`}>
              ☆
            </span>
          ))}
        </div>
        <span className="text-sm font-medium">{displayRating}</span>
        <span className="text-xs text-gray-500">({validRatings.length})</span>
      </div>
    );
  } catch (error) {
    return <p className="text-sm text-gray-500">Rating unavailable</p>;
  }
}
