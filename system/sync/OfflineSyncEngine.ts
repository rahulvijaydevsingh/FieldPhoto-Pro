import { PendingPhotoItem, OfflineSyncEngineStats } from './types';
import { isFirestoreQuotaExceeded, subscribeAppSettings } from '../../services/firebase';
import { TelemetryTrainManager } from './TelemetryTrainManager';

export class OfflineSyncEngine {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private pendingPhotos: PendingPhotoItem[] = [];
  private totalPhotosSynced: number = 0;
  private lastSyncTime?: string;
  private syncTimer: any = null;
  private autoSyncIntervalMs: number = 300000;

  constructor() {
    this.initStorage();
    this.bindNetworkListeners();
    this.startAutoSyncWorker(300000);
    try {
      subscribeAppSettings((settings) => {
        if (settings?.trainDispatchIntervalMs && settings.trainDispatchIntervalMs >= 30000) {
          this.startAutoSyncWorker(settings.trainDispatchIntervalMs);
        }
      });
    } catch (e) {}
  }

  private initStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const photosStr = localStorage.getItem('fpro_pending_photos_queue');
      if (photosStr) this.pendingPhotos = JSON.parse(photosStr);
    } catch (err) {
      console.warn('OfflineSyncEngine storage load error:', err);
    }
  }

  private saveStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('fpro_pending_photos_queue', JSON.stringify(this.pendingPhotos));
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

  public async triggerBatchSync(): Promise<{ photosFlushed: number; breadcrumbsFlushed: number }> {
    if (!this.isOnline || isFirestoreQuotaExceeded()) {
      return { photosFlushed: 0, breadcrumbsFlushed: 0 };
    }

    let photosFlushed = 0;

    // 1. Trigger Telemetry Train Dispatch via TelemetryTrainManager
    await TelemetryTrainManager.getInstance().dispatchTrain('timer');

    // 2. Flush Pending Photo Items
    if (this.pendingPhotos.length > 0) {
      const itemsToSync = [...this.pendingPhotos];
      for (const p of itemsToSync) {
        p.syncStatus = 'SYNCING';
      }
      this.saveStorage();

      for (const photoItem of itemsToSync) {
        try {
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

    return { photosFlushed, breadcrumbsFlushed: 0 };
  }

  public startAutoSyncWorker(intervalMs: number = 300000): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.autoSyncIntervalMs = intervalMs;
    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
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
    this.saveStorage();
  }

  public getStats(): OfflineSyncEngineStats {
    return {
      isOnline: this.isOnline,
      pendingPhotosCount: this.pendingPhotos.filter((p) => p.syncStatus === 'PENDING').length,
      syncingPhotosCount: this.pendingPhotos.filter((p) => p.syncStatus === 'SYNCING').length,
      pendingBreadcrumbsCount: 0,
      syncingBreadcrumbsCount: 0,
      totalPhotosSynced: this.totalPhotosSynced,
      totalBreadcrumbsSynced: TelemetryTrainManager.getInstance().getMetrics().totalPingsSent,
      lastSyncTime: this.lastSyncTime,
      autoSyncIntervalMs: this.autoSyncIntervalMs, // Dynamic runtime value
    };
  }

  public getPendingPhotos(): PendingPhotoItem[] {
    return [...this.pendingPhotos];
  }
}

export const offlineSyncEngine = new OfflineSyncEngine();
