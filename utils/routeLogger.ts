// Device-level local GPS route logger
// Stores breadcrumbs in local device storage without consuming cloud write quotas

import { getDeviceModelInfo } from './locationUtils';
import { breadcrumbRepository } from '../repositories/breadcrumbRepository';
import { offlineSyncEngine } from '../system/sync/OfflineSyncEngine';
import { haversineMeters } from './distance';
import { getDeviceId, getFullDeviceInfo } from './deviceFingerprint';
import { saveRouteBreadcrumbToFirestore } from '../services/firebase';
import { 
  getCachedGeofences, 
  geofenceContainsPoint, 
  detectGeofenceTransitions, 
  writeGeofenceEventToFirestore 
} from '../services/geofence';

export interface RouteBreadcrumb {
  id?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: string; // ISO string
  plusCode?: string;
  speed?: number | null;
  altitude?: number | null;
  heading?: number | null;
  deviceInfo?: string;
  deviceId?: string;
  osVersion?: string;
  deviceModel?: string;
  batteryLevel?: number;
  networkType?: string;
  userId?: string;
  userName?: string;
  geofenceIds?: string[];
  
  // Forensic tracking attributes
  sourceEvent?: 'APP_LOAD' | 'PHOTO_UPLOAD' | 'ATTENDANCE_CHECK' | 'HEARTBEAT' | 'MANUAL' | 'ROUTE_TRACKER';
  photoUploadSource?: 'DIRECT_CAPTURE' | 'GALLERY';
  locationProvider?: 'GPS_HARDWARE' | 'WIFI_GOOGLE' | 'CELL_TOWER' | 'EXIF_FALLBACK';
  isMocked?: boolean;
  exifDateTimeOriginal?: string;
  exifCameraMake?: string;
  exifCameraModel?: string;
  photoId?: string;
  attendanceId?: string;
  flags?: string[];
}

const ROUTE_PREFIX = 'fieldops_route_log_';
const SHARED_ROUTE_KEY = 'fieldops_shared_breadcrumbs';

// Calculate distance in meters between two lat/lng coordinates (Haversine formula via WGS-84)
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return haversineMeters(lat1, lon1, lat2, lon2);
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

    // Default metadata enrichment if missing
    if (!point.deviceInfo) {
      point.deviceInfo = getDeviceModelInfo();
    }
    if (!point.deviceId) {
      point.deviceId = getDeviceId();
    }
    if (!point.sourceEvent) {
      point.sourceEvent = 'MANUAL';
    }
    if (!point.locationProvider) {
      point.locationProvider = 'GPS_HARDWARE';
    }

    // Geofence Evaluation
    try {
      const activeFences = getCachedGeofences().filter(g => g.active);
      const currentMatching = activeFences.filter(g => geofenceContainsPoint(g, point.lat, point.lng));
      point.geofenceIds = currentMatching.map(g => g.id);

      const lastPoint = route.length > 0 ? route[route.length - 1] : null;
      const prevIds = lastPoint?.geofenceIds || [];
      const transitions = detectGeofenceTransitions(prevIds, point.geofenceIds);

      transitions.forEach(t => {
        const fenceObj = activeFences.find(g => g.id === t.geofenceId);
        writeGeofenceEventToFirestore({
          geofenceId: t.geofenceId,
          geofenceName: fenceObj?.name || 'Site Fence',
          userId: point.userId || 'staff_u1',
          userName: point.userName || 'Field Staff',
          type: t.type,
          lat: point.lat,
          lng: point.lng,
          plusCode: point.plusCode,
          timestamp: point.timestamp
        }).catch(e => console.warn('Failed to log geofence event:', e));
      });
    } catch (gfErr) {
      console.warn('Geofence check warning:', gfErr);
    }

    route.push(point);
    const trimmed = route.slice(-500);
    localStorage.setItem(key, JSON.stringify(trimmed));

    // Also update global shared route store and Firestore so Admin panel on any device receives staff breadcrumbs
    try {
      const sharedStr = localStorage.getItem(SHARED_ROUTE_KEY);
      const sharedRoute: RouteBreadcrumb[] = sharedStr ? JSON.parse(sharedStr) : [];
      sharedRoute.push(point);
      // Keep last 1000 pings total in local cache
      localStorage.setItem(SHARED_ROUTE_KEY, JSON.stringify(sharedRoute.slice(-1000)));
      window.dispatchEvent(new Event('fieldops_sync'));

      // Cloud-first direct write to Firestore (with offline queue backup)
      saveRouteBreadcrumbToFirestore(point).catch(e => console.warn('Direct Firestore breadcrumb warning:', e));

      // Enqueue in OfflineSyncEngine for offline durability
      offlineSyncEngine.enqueueBreadcrumb({
        lat: point.lat,
        lng: point.lng,
        accuracy: point.accuracy,
        speed: point.speed,
        plusCode: point.plusCode,
        timestamp: point.timestamp,
        deviceInfo: point.deviceInfo,
        userId: point.userId || 'staff_u1',
        userName: point.userName || 'Field Staff',
      });
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
 * Gets shared route logs for all users or filtered by a specific staff member.
 * Can optionally accept cloud-synced firestoreBreadcrumbs to support cross-device admin inspection.
 */
export function getSharedRouteLogs(userId?: string, userName?: string, cloudBreadcrumbs?: RouteBreadcrumb[]): RouteBreadcrumb[] {
  try {
    const sharedStr = localStorage.getItem(SHARED_ROUTE_KEY);
    const allShared: RouteBreadcrumb[] = sharedStr ? JSON.parse(sharedStr) : [];
    const localToday = getLocalRouteLog();
    const cloud = cloudBreadcrumbs || [];
    
    // Merge cloud, shared, and local breadcrumbs seamlessly using exact timestamp & coordinates
    const combinedMap = new Map<string, RouteBreadcrumb>();
    [...cloud, ...allShared, ...localToday].forEach(item => {
      if (!item || item.lat === undefined || item.lng === undefined) return;
      const ts = (item.timestamp && !isNaN(new Date(item.timestamp).getTime())) 
        ? new Date(item.timestamp).getTime() 
        : 0;
      // Key by exact timestamp (ms) + coords + user to prevent overwriting distinct pings
      const uid = item.userId || item.userName || '';
      const key = `${uid}_${ts}_${Number(item.lat).toFixed(5)}_${Number(item.lng).toFixed(5)}`;
      combinedMap.set(key, item);
    });

    let combined = Array.from(combinedMap.values());

    if (userId || userName) {
      const uidLower = (userId || '').trim().toLowerCase();
      const uNameLower = (userName || '').trim().toLowerCase();
      
      const userMatched = combined.filter(b => {
        if (b.userId && uidLower && b.userId.toLowerCase() === uidLower) return true;
        if (b.userName && uNameLower && b.userName.toLowerCase().includes(uNameLower)) return true;
        return false;
      });

      const hasMobilePings = userMatched.some(b => b.deviceInfo && !b.deviceInfo.includes('Windows') && !b.deviceInfo.includes('Mac'));

      combined = userMatched.filter(b => {
        // If staff member has mobile pings, ignore accidental Admin Windows PC pings
        if (hasMobilePings && b.deviceInfo && (b.deviceInfo.includes('Windows') || b.deviceInfo.includes('Mac'))) {
          return false;
        }
        return true;
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
