/**
 * Unified Client-Side Offline-First Sync Engine
 * FieldPhoto-Pro Core Architecture
 * 
 * Inspired by Traccar Client Mobile App Architecture.
 * Buffers both Photos & Staff Location Telemetry locally when offline or under low connectivity.
 * Automatically flushes queues in batch when online network is detected.
 * 
 * ANDROID NATIVE ARCHITECTURE BLUEPRINT:
 * ------------------------------------------------
 * When converting into a Native Android App (Kotlin/Java):
 * 1. Room SQLite Database DAOs:
 *    `@Dao interface PendingPhotoDao` and `@Dao interface PendingBreadcrumbDao`
 * 
 * 2. Background WorkManager Execution:
 *    ```kotlin
 *    val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
 *    
 *    val photoWorker = OneTimeWorkRequestBuilder<PhotoSyncWorker>().setConstraints(constraints).build()
 *    val locationWorker = PeriodicWorkRequestBuilder<LocationTrackingSyncWorker>(15, TimeUnit.MINUTES).setConstraints(constraints).build()
 *    ```
 */

import { PendingPhotoItem, PendingBreadcrumbItem, OfflineSyncEngineStats } from './types';
import { breadcrumbRepository } from '../../repositories/breadcrumbRepository';
import { saveRouteBreadcrumbToFirestore, isFirestoreQuotaExceeded, subscribeAppSettings } from '../../services/firebase';

export class OfflineSyncEngine {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private pendingPhotos: PendingPhotoItem[] = [];
  private pendingBreadcrumbs: PendingBreadcrumbItem[] = [];
  private totalPhotosSynced: number = 0;
  private totalBreadcrumbsSynced: number = 0;
  private lastSyncTime?: string;
  private syncTimer: any = null;
  private dbName = 'FieldPhotoPro_OfflineDB';

  constructor() {
    this.initStorage();
    this.bindNetworkListeners();
    this.startAutoSyncWorker(300000); // Batch flush every 5 minutes
    try {
      subscribeAppSettings((settings) => {
        if (settings?.trainDispatchIntervalMs && settings.trainDispatchIntervalMs >= 30000) {
          this.startAutoSyncWorker(settings.trainDispatchIntervalMs);
        }
      });
    } catch (e) {
      // non-blocking
    }
  }

  private initStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const photosStr = localStorage.getItem('fpro_pending_photos_queue');
      if (photosStr) this.pendingPhotos = JSON.parse(photosStr);

      const breadcrumbsStr = localStorage.getItem('fpro_pending_breadcrumbs_queue');
      if (breadcrumbsStr) this.pendingBreadcrumbs = JSON.parse(breadcrumbsStr);
    } catch (err) {
      console.warn('OfflineSyncEngine storage load error:', err);
    }
  }

  private saveStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('fpro_pending_photos_queue', JSON.stringify(this.pendingPhotos));
      localStorage.setItem('fpro_pending_breadcrumbs_queue', JSON.stringify(this.pendingBreadcrumbs));
      window.dispatchEvent(new Event('fieldops_sync'));
    } catch (err) {
      console.warn('OfflineSyncEngine storage save error:', err);
    }
  }

  private bindNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.triggerBatchSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Enqueues a captured photo into the local offline queue if offline or network fail
   */
  public enqueuePhoto(item: Omit<PendingPhotoItem, 'id' | 'syncStatus' | 'retryCount'>): PendingPhotoItem {
    const photoItem: PendingPhotoItem = {
      ...item,
      id: 'pending_photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      syncStatus: 'PENDING',
      retryCount: 0,
    };

    this.pendingPhotos.push(photoItem);
    this.saveStorage();

    if (this.isOnline) {
      this.triggerBatchSync();
    }

    return photoItem;
  }

  /**
   * Enqueues a staff GPS location breadcrumb into local telemetry queue
   */
  public enqueueBreadcrumb(item: Omit<PendingBreadcrumbItem, 'id' | 'syncStatus' | 'retryCount'>): PendingBreadcrumbItem {
    const breadcrumbItem: PendingBreadcrumbItem = {
      ...item,
      id: 'pending_bc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      syncStatus: 'PENDING',
      retryCount: 0,
    };

    this.pendingBreadcrumbs.push(breadcrumbItem);
    this.saveStorage();

    return breadcrumbItem;
  }

  /**
   * Triggers background sync worker to batch-upload pending photos and location telemetry
   */
  public async triggerBatchSync(): Promise<{ photosFlushed: number; breadcrumbsFlushed: number }> {
    if (!this.isOnline || isFirestoreQuotaExceeded()) {
      return { photosFlushed: 0, breadcrumbsFlushed: 0 };
    }

    let photosFlushed = 0;
    let breadcrumbsFlushed = 0;

    // 1. Flush Staff Telemetry Breadcrumbs via individual Firestore writes
    try {
      if (this.pendingBreadcrumbs.length > 0) {
        const itemsToSync = [...this.pendingBreadcrumbs];
        let successfulCount = 0;
        for (const bc of itemsToSync) {
          try {
            await saveRouteBreadcrumbToFirestore(bc);
            successfulCount++;
          } catch (e) {
            console.warn('Error syncing breadcrumb item:', e);
          }
        }
        if (successfulCount > 0) {
          breadcrumbsFlushed = successfulCount;
          this.totalBreadcrumbsSynced += breadcrumbsFlushed;
          this.pendingBreadcrumbs = this.pendingBreadcrumbs.slice(successfulCount);
          this.saveStorage();
        }
      }
    } catch (err) {
      console.warn('Breadcrumb sync batch error:', err);
    }

    // 2. Flush Pending Photo Items
    if (this.pendingPhotos.length > 0) {
      const itemsToSync = [...this.pendingPhotos];
      for (const p of itemsToSync) {
        p.syncStatus = 'SYNCING';
      }
      this.saveStorage();

      for (const photoItem of itemsToSync) {
        try {
          // Simulate network upload
          await new Promise((resolve) => setTimeout(resolve, 300));
          photosFlushed++;
          this.totalPhotosSynced++;
          this.pendingPhotos = this.pendingPhotos.filter((p) => p.id !== photoItem.id);
        } catch (err: any) {
          photoItem.syncStatus = 'FAILED';
          photoItem.retryCount++;
          photoItem.lastError = err.message || 'Upload failed';
        }
      }
    }

    this.lastSyncTime = new Date().toISOString();
    this.saveStorage();

    return { photosFlushed, breadcrumbsFlushed };
  }

  public startAutoSyncWorker(intervalMs: number = 300000): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      if (this.isOnline && (this.pendingPhotos.length > 0 || this.pendingBreadcrumbs.length > 0)) {
        this.triggerBatchSync();
      }
    }, intervalMs);
  }

  public setSimulatedNetwork(online: boolean): void {
    this.isOnline = online;
    if (online) {
      this.triggerBatchSync();
    }
  }

  public clearAllQueues(): void {
    this.pendingPhotos = [];
    this.pendingBreadcrumbs = [];
    this.saveStorage();
  }

  public getStats(): OfflineSyncEngineStats {
    return {
      isOnline: this.isOnline,
      pendingPhotosCount: this.pendingPhotos.filter((p) => p.syncStatus === 'PENDING').length,
      syncingPhotosCount: this.pendingPhotos.filter((p) => p.syncStatus === 'SYNCING').length,
      pendingBreadcrumbsCount: this.pendingBreadcrumbs.filter((b) => b.syncStatus === 'PENDING').length,
      syncingBreadcrumbsCount: this.pendingBreadcrumbs.filter((b) => b.syncStatus === 'SYNCING').length,
      totalPhotosSynced: this.totalPhotosSynced,
      totalBreadcrumbsSynced: this.totalBreadcrumbsSynced,
      lastSyncTime: this.lastSyncTime,
      autoSyncIntervalMs: 300000,
    };
  }

  public getPendingPhotos(): PendingPhotoItem[] {
    return [...this.pendingPhotos];
  }

  public getPendingBreadcrumbs(): PendingBreadcrumbItem[] {
    return [...this.pendingBreadcrumbs];
  }
}

// Global offline sync engine singleton instance
export const offlineSyncEngine = new OfflineSyncEngine();
