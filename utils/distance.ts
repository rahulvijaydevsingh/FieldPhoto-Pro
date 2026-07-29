// High-precision geodesic distance calculations (WGS-84)
// Aligned with Traccar DistanceCalculator (Apache 2.0)

const EARTH_RADIUS_M = 6378137.0; // WGS-84 equatorial radius in meters
const DEG_TO_RAD = Math.PI / 180;

/**
 * Calculates Haversine distance in meters between two lat/lng coordinates.
 */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const sLat = Math.sin(dLat / 2);
  const sLon = Math.sin(dLon / 2);
  const a = sLat * sLat + Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * sLon * sLon;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculates perpendicular distance in meters from point (px, py) to line segment (lx1, ly1)-(lx2, ly2).
 */
export function distanceToLineMeters(
  px: number, py: number,
  lx1: number, ly1: number,
  lx2: number, ly2: number
): number {
  const d0 = haversineMeters(px, py, lx1, ly1);
  const d1 = haversineMeters(lx1, ly1, lx2, ly2);
  const d2 = haversineMeters(lx2, ly2, px, py);
  
  if (d1 === 0) return d0;

  const d0s = d0 * d0;
  const d1s = d1 * d1;
  const d2s = d2 * d2;

  if (d0s > d1s + d2s) return d2;
  if (d2s > d1s + d0s) return d0;

  const half = (d0 + d1 + d2) * 0.5;
  const area = Math.sqrt(Math.max(0, half * (half - d0) * (half - d1) * (half - d2)));
  return (2 * area) / d1;
}

/**
 * Converts meters to latitude degree delta.
 */
export function latitudeDeltaForMeters(meters: number): number {
  return meters / 111320;
}

/**
 * Converts meters to longitude degree delta at a given latitude.
 */
export function longitudeDeltaForMeters(meters: number, latitude: number): number {
  const cosLat = Math.cos(latitude * DEG_TO_RAD);
  return cosLat === 0 ? 0 : meters / (111320 * cosLat);
}
