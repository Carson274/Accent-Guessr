import type { Feature, Geometry, Position } from "geojson";
import countriesData from "../data/countries.json";

interface LatLng {
  lat: number;
  lng: number;
}

type CountryFeature = Feature<
  Geometry,
  {
    ADMIN?: string;
    ISO_A3?: string;
  }
>;

const EARTH_RADIUS_KM = 6371;

const nameToCentroid = new Map<string, LatLng>();
const codeToCentroid = new Map<string, LatLng>();
const codeToName = new Map<string, string>();

function flattenPositions(geometry: Geometry | null | undefined): Position[] {
  if (!geometry) return [];

  const positions: Position[] = [];

  const walk = (geom: Geometry) => {
    if (geom.type === "Point") {
      positions.push(geom.coordinates);
    } else if (geom.type === "MultiPoint") {
      positions.push(...geom.coordinates);
    } else if (geom.type === "LineString") {
      positions.push(...geom.coordinates);
    } else if (geom.type === "MultiLineString") {
      geom.coordinates.forEach((line) => positions.push(...line));
    } else if (geom.type === "Polygon") {
      geom.coordinates.forEach((ring) => positions.push(...ring));
    } else if (geom.type === "MultiPolygon") {
      geom.coordinates.forEach((poly) =>
        poly.forEach((ring) => positions.push(...ring))
      );
    }
  };

  walk(geometry);
  return positions;
}

function computeCentroid(geometry: Geometry | null | undefined): LatLng | null {
  const positions = flattenPositions(geometry);
  if (!positions.length) return null;

  let sumLat = 0;
  let sumLng = 0;

  for (const [lng, lat] of positions) {
    sumLat += lat;
    sumLng += lng;
  }

  return {
    lat: sumLat / positions.length,
    lng: sumLng / positions.length,
  };
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

// Precompute centroids and lookup maps once at module load.
if (
  typeof countriesData === "object" &&
  countriesData !== null &&
  Array.isArray((countriesData as any).features)
) {
  const features = (countriesData as any).features as CountryFeature[];

  for (const feature of features) {
    const name = feature.properties?.ADMIN;
    const code = feature.properties?.ISO_A3;
    const centroid = computeCentroid(feature.geometry);

    if (!centroid) continue;

    if (name) {
      nameToCentroid.set(name, centroid);
    }
    if (code) {
      codeToCentroid.set(code.toUpperCase(), centroid);
      if (name) {
        codeToName.set(code.toUpperCase(), name);
      }
    }
  }
}

function getCentroidForCountryName(name: string): LatLng | null {
  return nameToCentroid.get(name) ?? null;
}

function getCentroidForCountryCode(code: string | null | undefined): LatLng | null {
  if (!code) return null;
  return codeToCentroid.get(code.toUpperCase()) ?? null;
}

export function getCountryNameFromCode(code: string | null | undefined): string | null {
  if (!code) return null;
  return codeToName.get(code.toUpperCase()) ?? null;
}

export interface RoundScoreResult {
  score: number;
  distanceKm: number | null;
}

/**
 * Calculate the round score based on distance between the guessed country
 * and the actual target country.
 *
 * @param guessedCountryName - Human-readable country name from the map (ADMIN property)
 * @param targetCountryCode - Alpha-3 ISO code of the correct country (e.g. "USA")
 * @returns Object containing the score for this round and the distance in km
 */
export function calculateRoundScore(
  guessedCountryName: string,
  targetCountryCode: string | null
): RoundScoreResult {
  const guessedCentroid = getCentroidForCountryName(guessedCountryName);
  const targetCentroid = getCentroidForCountryCode(targetCountryCode);

  if (!guessedCentroid || !targetCentroid) {
    return { score: 0, distanceKm: null };
  }

  const distanceKm = haversineDistanceKm(guessedCentroid, targetCentroid);

  const maxScore = 5000;
  const maxDistanceKm = 10000;

  const raw =
    distanceKm >= maxDistanceKm
      ? 0
      : maxScore * (1 - distanceKm / maxDistanceKm);

  const score = Math.max(0, Math.round(raw));

  return { score, distanceKm };
}