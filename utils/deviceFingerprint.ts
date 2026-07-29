/**
 * Device Fingerprinting Utility for FieldPhoto-Pro
 * Provides persistent device identification across browser sessions and cache clears.
 * Collects hardware/network diagnostics for anti-bypass location tracking.
 */

export interface DeviceInfo {
  deviceId: string;
  deviceModel: string;
  osVersion: string;
  networkType: string;
  batteryLevel?: number;
}

const DEVICE_ID_KEY = 'fieldops_device_fingerprint_id';

/**
 * Gets or creates a persistent device ID.
 */
export function getDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return 'dev_unknown_session';
  }
}

/**
 * Parses user agent to determine approximate OS & device model
 */
export function getDeviceOsAndModel(): { osVersion: string; deviceModel: string } {
  if (typeof navigator === 'undefined') {
    return { osVersion: 'Unknown OS', deviceModel: 'Web Browser' };
  }

  const ua = navigator.userAgent;
  let osVersion = 'Web';
  let deviceModel = 'Desktop Browser';

  if (/Android/i.test(ua)) {
    osVersion = 'Android';
    const match = ua.match(/Android\s+([0-9\.]+)/i);
    if (match) osVersion = `Android ${match[1]}`;
    
    // Extract model name from UA string
    const modelMatch = ua.match(/;\s*([^;]+)\s+Build\//i);
    if (modelMatch) deviceModel = modelMatch[1];
    else deviceModel = 'Android Device';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    osVersion = 'iOS';
    const match = ua.match(/OS\s+([0-9_]+)/i);
    if (match) osVersion = `iOS ${match[1].replace(/_/g, '.')}`;
    deviceModel = /iPad/i.test(ua) ? 'iPad' : 'iPhone';
  } else if (/Windows/i.test(ua)) {
    osVersion = 'Windows PC';
    deviceModel = 'Desktop Workstation';
  } else if (/Macintosh/i.test(ua)) {
    osVersion = 'macOS';
    deviceModel = 'Mac Workstation';
  } else if (/Linux/i.test(ua)) {
    osVersion = 'Linux';
    deviceModel = 'Linux Workstation';
  }

  return { osVersion, deviceModel };
}

/**
 * Collects full snapshot of device capabilities, network type, and battery info
 */
export async function getFullDeviceInfo(): Promise<DeviceInfo> {
  const deviceId = getDeviceId();
  const { osVersion, deviceModel } = getDeviceOsAndModel();

  // Network connection type
  let networkType = typeof navigator !== 'undefined' && !navigator.onLine ? 'OFFLINE' : 'WIFI';
  const conn = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
  if (conn && conn.effectiveType) {
    networkType = conn.effectiveType.toUpperCase(); // '4G', '3G', '2G', 'SLOW-2G'
  }

  // Battery Level
  let batteryLevel: number | undefined = undefined;
  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const battery: any = await (navigator as any).getBattery();
      if (battery && typeof battery.level === 'number') {
        batteryLevel = Math.round(battery.level * 100);
      }
    } catch {}
  }

  return {
    deviceId,
    deviceModel,
    osVersion,
    networkType,
    batteryLevel,
  };
}
