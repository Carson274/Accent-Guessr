/**
 * Calculate the round score based on distance from the target.
 * Used by both server and client (solo play).
 *
 * @param lat - Guessed latitude
 * @param lng - Guessed longitude
 * @returns Score for this round
 */
export function calculateRoundScore(lat: number, lng: number): number {
  const distance = Math.sqrt(lat * lat + lng * lng);
  return Math.max(0, Math.round(5000 - distance * 10));
}