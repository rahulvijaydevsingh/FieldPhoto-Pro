/**
 * Concrete Pipeline Handler 6: Route Breadcrumb Logger
 * Automatically records GPS location breadcrumbs into the staff's daily field movement log.
 * 
 * ANDROID NATIVE MIGRATION NOTE:
 * In Kotlin Android, write breadcrumb to local Room database DAO (`BreadcrumbDao`):
 * ```kotlin
 * @Insert(onConflict = OnConflictStrategy.REPLACE)
 * suspend fun insertBreadcrumb(crumb: RouteBreadcrumbEntity)
 * ```
 */

import { PhotoHandler, PhotoPipelinePayload, NextFunction } from '../types';
import { addLocalBreadcrumb } from '../../../utils/routeLogger';

export class BreadcrumbLoggerHandler implements PhotoHandler {
  public name = 'Route Breadcrumb Logger';
  public description = 'Logs automatic route breadcrumbs for staff member upon photo capture';
  public enabled = true;

  public async handle(payload: PhotoPipelinePayload, next: NextFunction): Promise<void> {
    const startTime = performance.now();

    const lat = payload.photo.site_lat || payload.fallbackGps.lat;
    const lng = payload.photo.site_lng || payload.fallbackGps.lng;

    try {
      addLocalBreadcrumb({
        lat,
        lng,
        timestamp: payload.photo.captureDate || new Date().toISOString(),
        plusCode: payload.photo.plusCode || '',
        deviceInfo: payload.photo.deviceInfo || 'Field Device',
        userId: payload.user.id,
        userName: payload.user.name,
      });

      payload.logs.push({
        handlerName: this.name,
        durationMs: Math.round(performance.now() - startTime),
        status: 'success',
        message: `Logged route breadcrumb (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      payload.logs.push({
        handlerName: this.name,
        durationMs: Math.round(performance.now() - startTime),
        status: 'warning',
        message: 'Breadcrumb logging skipped',
        timestamp: new Date().toISOString(),
      });
    }

    await next();
  }
}
