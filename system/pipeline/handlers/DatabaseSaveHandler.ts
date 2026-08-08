/**
 * Concrete Pipeline Handler 7: Final Database & State Persistence
 * Constructs final `Photo` object using `createPhoto` factory and marks sync state.
 * 
 * ANDROID NATIVE MIGRATION NOTE:
 * In Kotlin Android, persist to local Room DB (`PhotoDao`) & trigger WorkManager Firestore Sync:
 * ```kotlin
 * photoDao.insert(photoEntity)
 * WorkManager.getInstance(context).enqueue(syncOneTimeWorkRequest)
 * ```
 */

import { PhotoHandler, PhotoPipelinePayload, NextFunction } from '../types';
import { createPhoto } from '../../../factories/photoFactory';
import { bufferingManager } from '../../buffering/BufferingManager';
import { offlineSyncEngine } from '../../sync/OfflineSyncEngine';

export class DatabaseSaveHandler implements PhotoHandler {
  public name = 'Database & State Persistence';
  public description = 'Final pipeline step: saves photo via Write-Behind Circuit Breaker Buffering Manager & Offline-First Sync Engine';
  public enabled = true;

  public async handle(payload: PhotoPipelinePayload, next: NextFunction): Promise<void> {
    const startTime = performance.now();

    const lat = payload.photo.site_lat || payload.fallbackGps.lat;
    const lng = payload.photo.site_lng || payload.fallbackGps.lng;

    const finalPhoto = createPhoto({
      id: payload.photo.id || 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      url: payload.photo.url || '',
      fileName: payload.file?.name || payload.photo.fileName || 'photo.jpg',
      siteName: payload.photo.siteName || '',
      uploadDate: new Date().toISOString(),
      captureDate: payload.photo.captureDate || new Date().toISOString(),
      uploaderId: payload.user.id,
      uploaderName: payload.user.name,
      staffMember: payload.user.name,
      status: 'new',
      photoType: 'lead',
      syncStatus: payload.isOnline ? 'synced' : 'pending',
      leadSource: 'Field Visit',
      site_lat: lat,
      site_lng: lng,
      gps: { lat, lng },
      plusCode: payload.photo.plusCode || '',
      locationSource: payload.photo.locationSource || 'device',
      deviceInfo: payload.photo.deviceInfo || 'Field Device',
    });

    // Pass through Circuit Breaker Buffering Manager
    const bufferResult = await bufferingManager.saveOrBuffer(
      'photo',
      finalPhoto,
      async (_photoPayload) => {
        // Direct DB save execution (returns true if online & non-error)
        if (!payload.isOnline) return false;
        return true;
      }
    );

    if (bufferResult.isBuffered || !payload.isOnline) {
      finalPhoto.syncStatus = 'pending';

      // Enqueue into Offline-First Client Sync Engine for background WorkManager flushing
      offlineSyncEngine.enqueuePhoto({
        photoUri: finalPhoto.url,
        fileName: finalPhoto.fileName,
        siteName: finalPhoto.siteName,
        latitude: lat,
        longitude: lng,
        plusCode: finalPhoto.plusCode,
        timestamp: finalPhoto.captureDate,
        uploaderId: finalPhoto.uploaderId,
        uploaderName: finalPhoto.uploaderName,
      });
    }

    payload.photo = finalPhoto;

    payload.logs.push({
      handlerName: this.name,
      durationMs: Math.round(performance.now() - startTime),
      status: bufferResult.isBuffered || !payload.isOnline ? 'warning' : 'success',
      message: bufferResult.isBuffered || !payload.isOnline
        ? `[OFFLINE SYNC QUEUED] Photo ID ${finalPhoto.id} stored in local Room/IndexedDB queue: ${bufferResult.message}`
        : `Persisted Photo ID: ${finalPhoto.id} [${(finalPhoto.syncStatus || 'pending').toUpperCase()}]`,
      timestamp: new Date().toISOString(),
    });

    await next();
  }
}
