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
  userId?: string;
  userName?: string;
}

const ROUTE_PREFIX = 'fieldops_route_log_';
const SHARED_ROUTE_KEY = 'fieldops_shared_breadcrumbs';

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
 * Adds a breadcrumb to the device's route log and global shared breadcrumb store for today.
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

      // Skip duplicate pings if device hasn't moved at least 15m and less than 3 minutes have passed
      if (dist < 15 && timeDiffMs < 180000) {
        return route;
      }
    }

    if (!point.deviceInfo) {
      point.deviceInfo = getDeviceModelInfo();
    }

    route.push(point);
    const trimmed = route.slice(-500);
    localStorage.setItem(key, JSON.stringify(trimmed));

    // Also update global shared route store so Admin panel on any device receives staff breadcrumbs
    try {
      const sharedStr = localStorage.getItem(SHARED_ROUTE_KEY);
      const sharedRoute: RouteBreadcrumb[] = sharedStr ? JSON.parse(sharedStr) : [];
      sharedRoute.push(point);
      // Keep last 1000 pings total
      localStorage.setItem(SHARED_ROUTE_KEY, JSON.stringify(sharedRoute.slice(-1000)));
      window.dispatchEvent(new Event('fieldops_sync'));
    } catch (e) {}

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
 * Gets shared route logs for all users or filtered by a specific staff member
 */
export function getSharedRouteLogs(userId?: string, userName?: string): RouteBreadcrumb[] {
  try {
    const sharedStr = localStorage.getItem(SHARED_ROUTE_KEY);
    const allShared: RouteBreadcrumb[] = sharedStr ? JSON.parse(sharedStr) : [];
    const localToday = getLocalRouteLog();
    
    // Merge local and shared
    const combinedMap = new Map<string, RouteBreadcrumb>();
    [...allShared, ...localToday].forEach(item => {
      const key = `${item.timestamp}_${item.lat}_${item.lng}`;
      combinedMap.set(key, item);
    });

    let combined = Array.from(combinedMap.values());

    if (userId || userName) {
      const uidLower = (userId || '').trim().toLowerCase();
      const uNameLower = (userName || '').trim().toLowerCase();
      
      combined = combined.filter(b => {
        if (b.userId && uidLower && b.userId.toLowerCase() === uidLower) return true;
        if (b.userName && uNameLower && b.userName.toLowerCase().includes(uNameLower)) return true;
        // If breadcrumb has no user info attached, include it if it's from today as fallback
        return false;
      });
    }

    return combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (err) {
    return getLocalRouteLog();
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
