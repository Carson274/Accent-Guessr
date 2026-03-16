import { COUNTRY_CENTROIDS } from "../data/countryCentroids";

/**
 * Calculate the haversine distance between two lat/lng points in kilometers.
 */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate the distance in km between two countries by their ISO Alpha-3 codes.
 * Returns null if either country code is not found.
 */
export function countryDistance(
  guessedCode: string,
  correctCode: string
): number | null {
  const guessed = COUNTRY_CENTROIDS[guessedCode];
  const correct = COUNTRY_CENTROIDS[correctCode];
  if (!guessed || !correct) return null;
  return haversineDistance(guessed.lat, guessed.lng, correct.lat, correct.lng);
}

/**
 * Calculate the round score based on distance between guessed and correct country.
 * - Exact match: 5000 points
 * - Exponential decay with distance
 * - ~3000 pts at 1000 km, ~1800 pts at 2000 km, ~400 pts at 5000 km
 *
 * @param guessedCode - ISO Alpha-3 code of the guessed country
 * @param correctCode - ISO Alpha-3 code of the correct country
 * @returns {{ score: number, distanceKm: number }}
 */
export function calculateRoundScore(
  guessedCode: string,
  correctCode: string
): { score: number; distanceKm: number } {
  if (guessedCode === correctCode) {
    return { score: 5000, distanceKm: 0 };
  }

  const dist = countryDistance(guessedCode, correctCode);
  if (dist === null) {
    return { score: 0, distanceKm: -1 };
  }

  const score = Math.round(5000 * Math.exp(-dist / 2000));
  return { score, distanceKm: Math.round(dist) };
}