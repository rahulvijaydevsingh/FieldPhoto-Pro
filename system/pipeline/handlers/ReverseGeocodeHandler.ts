/**
 * Concrete Pipeline Handler 3: Reverse Geocoder & Plus Code Resolver
 * Resolves latitude/longitude to Open Location Plus Code, city name, and site address.
 * 
 * ANDROID NATIVE MIGRATION NOTE:
 * In Kotlin Android, use `android.location.Geocoder`:
 * ```kotlin
 * val geocoder = Geocoder(context, Locale.getDefault())
 * geocoder.getFromLocation(lat, lng, 1) { addresses ->
 *     val address = addresses.firstOrNull()
 *     payload.photo.siteName = address?.getAddressLine(0) ?: ""
 * }
 * ```
 */

import { PhotoHandler, PhotoPipelinePayload, NextFunction } from '../types';
import { generatePlusCodeWithCityAsync } from '../../../utils/locationUtils';

export class ReverseGeocodeHandler implements PhotoHandler {
  public name = 'Reverse Geocoder & Plus Code Resolver';
  public description = 'Translates GPS coordinates into Open Location Plus Codes and site address';
  public enabled = true;

  public async handle(payload: PhotoPipelinePayload, next: NextFunction): Promise<void> {
    const startTime = performance.now();

    const lat = payload.photo.site_lat || payload.fallbackGps.lat;
    const lng = payload.photo.site_lng || payload.fallbackGps.lng;

    try {
      const plusCode = await generatePlusCodeWithCityAsync(lat, lng);
      payload.photo.plusCode = plusCode;

      if (!payload.photo.siteName) {
        // If file name had clean site name, keep it; otherwise set from reverse geocoded city
        const cleanName = this.getCleanSiteName(payload.file?.name || '');
        payload.photo.siteName = cleanName;
      }

      payload.logs.push({
        handlerName: this.name,
        durationMs: Math.round(performance.now() - startTime),
        status: 'success',
        message: `Resolved Plus Code: ${plusCode}`,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      payload.logs.push({
        handlerName: this.name,
        durationMs: Math.round(performance.now() - startTime),
        status: 'warning',
        message: 'Reverse geocode failed, defaulted to raw coordinates',
        timestamp: new Date().toISOString(),
      });
    }

    await next();
  }

  private getCleanSiteName(filename: string): string {
    const base = filename.replace(/\.[^/.]+$/, '').trim();
    const isCameraOrNumeric = /^(\d+|IMG_\d+.*|\d{8}_\d+.*|\d{10,}.*|P_\d+.*|Photo_\d+.*)$/i.test(base);
    return isCameraOrNumeric ? '' : base;
  }
}
