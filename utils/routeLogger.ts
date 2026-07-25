// Device-level local GPS route logger
// Stores breadcrumbs in local device storage without consuming cloud write quotas

import { getDeviceModelInfo } from './locationUtils';

export interface RouteBreadcrumb {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: string; // ISO string
  plusCode?: string;
  speed?: number | null;
  deviceInfo?: string;
}

const ROUTE_PREFIX = 'fieldops_route_log_';

// Calculate distance in meters between two lat/lng coordinates (Haversine formula)
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getTodayKey(): string {
  const today = new Date().toISOString().split('T')[0];
  return `${ROUTE_PREFIX}${today}`;
}

/**
 * Adds a breadcrumb to the device's local route log for today.
 * Filters out static pings (ignores movement < 20 meters unless > 5 minutes elapsed).
 */
export function addLocalBreadcrumb(point: RouteBreadcrumb): RouteBreadcrumb[] {
  try {
    const key = getTodayKey();
    const existingStr = localStorage.getItem(key);
    const route: RouteBreadcrumb[] = existingStr ? JSON.parse(existingStr) : [];

    if (route.length > 0) {
      const last = route[route.length - 1];
      const dist = getDistanceMeters(last.lat, last.lng, point.lat, point.lng);
      const timeDiffMs = new Date(point.timestamp).getTime() - new Date(last.timestamp).getTime();

      // Skip logging if device hasn't moved at least 20m and less than 5 minutes have passed
      if (dist < 20 && timeDiffMs < 300000) {
        return route;
      }
    }

    if (!point.deviceInfo) {
      point.deviceInfo = getDeviceModelInfo();
    }

    route.push(point);
    // Limit to max 500 points per day to keep localStorage lightweight
    const trimmed = route.slice(-500);
    localStorage.setItem(key, JSON.stringify(trimmed));
    return trimmed;
  } catch (err) {
    console.warn('Failed to save local route breadcrumb:', err);
    return [];
  }
}

/**
 * Gets the route log for a specific date (defaults to today)
 */
export function getLocalRouteLog(dateStr?: string): RouteBreadcrumb[] {
  try {
    const dateKey = dateStr ? `${ROUTE_PREFIX}${dateStr}` : getTodayKey();
    const existingStr = localStorage.getItem(dateKey);
    return existingStr ? JSON.parse(existingStr) : [];
  } catch (err) {
    return [];
  }
}

/**
 * Clears old route logs older than 7 days from local storage
 */
export function cleanupOldRouteLogs() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(ROUTE_PREFIX)) {
        const datePart = key.replace(ROUTE_PREFIX, '');
        const logDate = new Date(datePart);
        if (!isNaN(logDate.getTime()) && logDate < sevenDaysAgo) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (err) {}
}
