/**
 * Browser standard GPS Geolocation Provider (Priority 1)
 * High accuracy when outdoors, but fails or times out indoors/dense forests.
 * 
 * ANDROID NATIVE MIGRATION NOTE:
 * On Android Native, replace with `com.google.android.gms.location.FusedLocationProviderClient`:
 * ```kotlin
 * fusedLocationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancellationToken)
 * ```
 */

import { GeolocationProvider, GeolocationResult, GeolocationException, NetworkScanData } from '../types';

export class BrowserGpsProvider implements GeolocationProvider {
  public name = 'Browser Hardware GPS';
  public priority = 1;

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  }

  public async getLocation(_network?: NetworkScanData): Promise<GeolocationResult> {
    if (!this.isAvailable()) {
      throw new GeolocationException('Browser GPS is not supported on this device');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            providerName: this.name,
            source: 'gps',
            timestamp: new Date().toISOString(),
          });
        },
        (err) => {
          reject(new GeolocationException(`GPS failure: ${err.message}`, err));
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  }
}
