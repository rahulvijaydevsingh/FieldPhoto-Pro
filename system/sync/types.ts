/**
 * Unified Client-Side Offline-First Sync Architecture Types
 * Covers both Core Pillars:
 * 1. Photo Collection (Pending Photo Upload Queue)
 * 2. Staff Location Tracking (Background GPS Breadcrumb Telemetry Queue)
 * 
 * ANDROID NATIVE MIGRATION NOTE:
 * When migrating to a native Android application (Kotlin/Java):
 * - `PendingPhotoItem` maps to Room `@Entity(tableName = "pending_photos")`
 * - `PendingBreadcrumbItem` maps to Room `@Entity(tableName = "pending_breadcrumbs")`
 * - Both are flushed via WorkManager `PhotoSyncWorker` & `LocationTrackingWorker`.
 */

export interface PendingPhotoItem {
  id: string;
  photoUri: string; // Data URL or File Blob URL
  fileName: string;
  siteName?: string;
  latitude: number;
  longitude: number;
  plusCode?: string;
  timestamp: string;
  uploaderId: string;
  uploaderName: string;
  syncStatus: 'PENDING' | 'SYNCING' | 'FAILED';
  retryCount: number;
  lastError?: string;
}

export interface PendingBreadcrumbItem {
  id: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number | null;
  plusCode?: string;
  timestamp: string;
  deviceInfo?: string;
  userId: string;
  userName: string;
  syncStatus: 'PENDING' | 'SYNCING' | 'FAILED';
  retryCount: number;
}

export interface OfflineSyncEngineStats {
  isOnline: boolean;
  pendingPhotosCount: number;
  syncingPhotosCount: number;
  pendingBreadcrumbsCount: number;
  syncingBreadcrumbsCount: number;
  totalPhotosSynced: number;
  totalBreadcrumbsSynced: number;
  lastSyncTime?: string;
  autoSyncIntervalMs: number;
}
