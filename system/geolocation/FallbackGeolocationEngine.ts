/**
 * Strategy Pattern Fallback Geolocation Engine
 * FieldPhoto-Pro Core Infrastructure
 * 
 * Automatically manages provider execution and seamlessly switches between
 * Hardware GPS, Google Cell/Wi-Fi API, and OpenCellID databases.
 * 
 * ANDROID NATIVE MIGRATION ARCHITECTURE BLUEPRINT:
 * ------------------------------------------------
 * When converting FieldPhoto-Pro into a Native Android App (Kotlin/Java):
 * 1. Architecture Parity:
 *    Maintain this strategy pattern structure in Kotlin:
 *    `interface GeolocationProvider { fun getLocation(network: NetworkScanData?): LocationResult }`
 * 
 * 2. Hardware GPS Provider (`AndroidGpsProvider.kt`):
 *    Use `com.google.android.gms.location.FusedLocationProviderClient`.
 *    Set `Priority.PRIORITY_HIGH_ACCURACY`.
 * 
 * 3. Cell & Wi-Fi Scanner (`AndroidNetworkScanner.kt`):
 *    Use `TelephonyManager.getAllCellInfo()` to obtain active & neighbor cell IDs (GSM/LTE/5G).
 *    Use `WifiManager.getScanResults()` to obtain ambient Wi-Fi BSSID MAC addresses & RSSI signal strengths.
 * 
 * 4. Offline Cell Cache Provider (`RoomOfflineCellProvider.kt`):
 *    Store local SQLite / Room database containing OpenCellID CSV database dumps for 100% offline
 *    warehouse/forest cell tower coordinate lookup without cellular internet connectivity.
 * 
 * 5. Foreground Service (`LocationTrackingService.kt`):
 *    Wrap this engine inside an Android `ForegroundService` with notification channel `fieldtrack_location_channel`
 *    and `WAKE_LOCK` to ensure background GPS/Cell tracking works continuously even when device screen is turned off.
 */

import { GeolocationProvider, GeolocationResult, NetworkScanData } from './types';
import { BrowserGpsProvider } from './providers/BrowserGpsProvider';
import { GoogleGeolocationProvider } from './providers/GoogleGeolocationProvider';
import { OpenCellIdProvider } from './providers/OpenCellIdProvider';
import { CellWifiScanner } from './CellWifiScanner';

export interface ProviderLogEntry {
  providerName: string;
  status: 'success' | 'failed' | 'skipped';
  accuracy?: number;
  message?: string;
  timestamp: string;
}

export class FallbackGeolocationEngine {
  private providers: GeolocationProvider[] = [];
  private lastLogs: ProviderLogEntry[] = [];
  private activeProviderName: string = 'Initializing...';

  constructor() {
    // Register pluggable strategy providers in priority order
    this.registerProvider(new BrowserGpsProvider());
    this.registerProvider(new GoogleGeolocationProvider());
    this.registerProvider(new OpenCellIdProvider());
  }

  public registerProvider(provider: GeolocationProvider): void {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  public getProviders(): GeolocationProvider[] {
    return [...this.providers];
  }

  public getLastLogs(): ProviderLogEntry[] {
    return [...this.lastLogs];
  }

  public getActiveProviderName(): string {
    return this.activeProviderName;
  }

  /**
   * Main entry point to resolve position using Strategy Fallback chain.
   */
  public async getPosition(): Promise<GeolocationResult> {
    const logs: ProviderLogEntry[] = [];
    let networkScan: NetworkScanData | undefined;

    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
        logs.push({
          providerName: provider.name,
          status: 'skipped',
          message: 'Provider not supported on this platform/device',
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      try {
        // If stepping down to Cell/Wi-Fi providers, perform network scan
        if (provider.priority > 1 && !networkScan) {
          networkScan = await CellWifiScanner.scanNetwork();
        }

        const result = await provider.getLocation(networkScan);

        // Accept result if accurate enough or if it's the last fallback
        if (result.accuracy < 150 || provider.priority === this.providers[this.providers.length - 1].priority) {
          logs.push({
            providerName: provider.name,
            status: 'success',
            accuracy: result.accuracy,
            message: `Position resolved (${result.source})`,
            timestamp: new Date().toISOString(),
          });

          this.lastLogs = logs;
          this.activeProviderName = provider.name;
          return result;
        } else {
          logs.push({
            providerName: provider.name,
            status: 'failed',
            accuracy: result.accuracy,
            message: `Accuracy ${result.accuracy}m exceeded acceptable threshold. Falling back...`,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logs.push({
          providerName: provider.name,
          status: 'failed',
          message: errorMsg,
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.lastLogs = logs;
    throw new Error('All geolocation strategy providers failed');
  }
}

// Global engine singleton instance
export const fallbackGeoEngine = new FallbackGeolocationEngine();
