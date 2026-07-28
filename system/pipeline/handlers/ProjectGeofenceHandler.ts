/**
 * Concrete Pipeline Handler 4: Project Boundary & Geofence Validator
 * Verifies if the captured field photo is taken within authorized project boundary / site radius.
 * 
 * ANDROID NATIVE MIGRATION NOTE:
 * In Kotlin Android, use Android Geofencing API `com.google.android.gms.location.GeofencingClient`:
 * ```kotlin
 * val geofence = Geofence.Builder()
 *     .setRequestId(siteId)
 *     .setCircularRegion(lat, lng, radiusMeters)
 *     .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER)
 *     .build()
 * ```
 */

import { PhotoHandler, PhotoPipelinePayload, NextFunction } from '../types';

export class ProjectGeofenceHandler implements PhotoHandler {
  public name = 'Project Boundary & Geofence Validator';
  public description = 'Validates photo GPS coordinates against registered project site boundaries';
  public enabled = true;

  public async handle(payload: PhotoPipelinePayload, next: NextFunction): Promise<void> {
    const startTime = performance.now();

    const lat = payload.photo.site_lat || payload.fallbackGps.lat;
    const lng = payload.photo.site_lng || payload.fallbackGps.lng;

    // Radius check against active project sites
    // (Default site radius = 500 meters)
    const siteMatched = this.checkSiteGeofence(lat, lng);

    payload.metadata.geofenceChecked = true;
    payload.metadata.geofenceSiteId = siteMatched ? siteMatched.id : 'unassigned';

    payload.logs.push({
      handlerName: this.name,
      durationMs: Math.round(performance.now() - startTime),
      status: siteMatched ? 'success' : 'warning',
      message: siteMatched 
        ? `Location validated inside Geofence Zone: ${siteMatched.name}` 
        : 'Photo captured outside designated registered project geofence boundaries.',
      timestamp: new Date().toISOString(),
    });

    await next();
  }

  private checkSiteGeofence(lat: number, lng: number): { id: string; name: string } | null {
    // Example site boundaries
    const activeSites = [
      { id: 'site_101', name: 'Phase 2 Warehouse Site', lat: 30.6782, lng: 76.7291, radiusMeters: 1000 },
      { id: 'site_102', name: 'Downtown Commercial Sector', lat: 28.6139, lng: 77.2090, radiusMeters: 1500 },
    ];

    for (const site of activeSites) {
      const distance = this.getHaversineDistance(lat, lng, site.lat, site.lng);
      if (distance <= site.radiusMeters) {
        return site;
      }
    }

    return null;
  }

  private getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
