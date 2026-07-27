/**
 * Geolocation & Cell/Wi-Fi Triangulation Types
 * Strategy Pattern architecture for FieldPhoto-Pro core infrastructure.
 * 
 * ANDROID NATIVE MIGRATION NOTE:
 * When migrating to a native Android application (Kotlin/Java):
 * - CellTower maps directly to `android.telephony.CellInfoGsm`, `CellInfoLte`, `CellInfoWcdma`, or `CellInfo5g`.
 * - WifiAccessPoint maps directly to `android.net.wifi.ScanResult` BSSID & RSSI.
 * - NetworkScanData will be dynamically populated via `TelephonyManager.getAllCellInfo()` and `WifiManager.getScanResults()`.
 */

export interface CellTower {
  cellId: number;
  locationAreaCode: number;
  mobileCountryCode: number;
  mobileNetworkCode: number;
  signalStrength?: number; // dBm
  age?: number;
}

export interface WifiAccessPoint {
  macAddress: string; // BSSID, e.g. "00:14:22:01:23:45"
  signalStrength?: number; // dBm / RSSI
  channel?: number;
  ssid?: string;
}

export interface NetworkScanData {
  cellTowers: CellTower[];
  wifiAccessPoints: WifiAccessPoint[];
  carrierName?: string;
  radioType?: 'gsm' | 'lte' | 'wcdma' | 'nr';
  timestamp?: string;
}

export interface GeolocationResult {
  lat: number;
  lng: number;
  accuracy: number; // in meters
  providerName: string;
  source: 'gps' | 'google_cell' | 'opencellid' | 'wifi_triangulation' | 'fallback_simulated';
  timestamp: string;
  rawNetwork?: NetworkScanData;
}

export interface GeolocationProvider {
  /** Identifier name of the provider strategy */
  name: string;
  /** Lower number indicates higher priority (1 = GPS, 2 = Google Cell/WiFi, 3 = OpenCellID) */
  priority: number;
  /** Returns true if provider prerequisites (e.g. API key, browser support, hardware) are met */
  isAvailable(): boolean;
  /**
   * Resolves estimated coordinates given available network scan or fallback mechanism.
   * @throws GeolocationException if location resolution fails
   */
  getLocation(network?: NetworkScanData): Promise<GeolocationResult>;
}

export class GeolocationException extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'GeolocationException';
  }
}
