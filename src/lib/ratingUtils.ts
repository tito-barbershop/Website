import type { SimpleRating } from '../types';

export function ensureRatingsArray(ratings: any): SimpleRating[] {
  if (!ratings) return [];
  if (Array.isArray(ratings)) return ratings;
  if (typeof ratings === 'object') return Object.values(ratings);
  return [];
}

export function calculateAverageRating(ratings: any): number {
  const ratingsArray = ensureRatingsArray(ratings);
  if (!ratingsArray || ratingsArray.length === 0) return 0;
  const sum = ratingsArray.reduce((acc: number, rating: any) => acc + (rating.score || 0), 0);
  return sum / ratingsArray.length;
}

export function getRatingStars(average: number): number {
  return Math.round(average * 10) / 10;
}

export function getFilledStars(ratings: any): number {
  const average = calculateAverageRating(ratings);
  const filled = Math.round(average);
  return filled;
}
