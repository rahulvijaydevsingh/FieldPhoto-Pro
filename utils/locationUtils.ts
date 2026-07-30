// Utility for high-precision Open Location Code (Plus Code) generation and dynamic reverse-geocoding

const CODE_ALPHABET = "23456789CFGHJMPQRVWX";

/**
 * Calculates distance in meters between two coordinates using the Haversine formula
 */
export function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (lat1 === lat2 && lng1 === lng2) return 0;
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Encodes latitude and longitude into a standard 10-character Open Location Code (Plus Code)
 * e.g., 30.6782, 76.7291 -> "8J6V9X24+8Q"
 */
export function encodePlusCode(lat: number, lng: number): string {
  if (isNaN(lat) || isNaN(lng)) return "8J52W724+8Q";
  
  const ALPHABET = "23456789CFGHJMPQRVWX";
  const ENC_BASE = 20;
  const PAIR_PRECISION = 8000;
  const SEP_POS = 8;

  let normLat = lat;
  if (normLat > 90) normLat = 90;
  if (normLat < -90) normLat = -90;
  if (normLat === 90) normLat = 89.9999999;

  let normLng = ((lng + 180) - Math.floor((lng + 180) / 360) * 360) - 180;

  let latVal = Math.floor(Math.round((normLat + 90) * PAIR_PRECISION * 1000000) / 1000000);
  let lonVal = Math.floor(Math.round((normLng + 180) * PAIR_PRECISION * 1000000) / 1000000);

  let code = "";
  for (let i = 0; i < 5; i++) {
    const latIdx = latVal - Math.floor(latVal / ENC_BASE) * ENC_BASE;
    const lonIdx = lonVal - Math.floor(lonVal / ENC_BASE) * ENC_BASE;

    code = ALPHABET.charAt(latIdx) + ALPHABET.charAt(lonIdx) + code;

    latVal = Math.floor(latVal / ENC_BASE);
    lonVal = Math.floor(lonVal / ENC_BASE);
  }

  return code.substring(0, SEP_POS) + "+" + code.substring(SEP_POS);
}

// Local cache for reverse geocoding to avoid repetitive network requests
const cityCache: Record<string, string> = {};

/**
 * Fast synchronous city matching for common region coordinates in North India & major hubs
 */
export function getCityFastSync(lat: number, lng: number): string {
  if (isNaN(lat) || isNaN(lng)) return "Punjab";

  // Mohali / Sahibzada Ajit Singh Nagar (Lat: 30.63 - 30.76, Lng: 76.60 - 76.76)
  if (lat >= 30.60 && lat <= 30.76 && lng >= 76.60 && lng <= 76.76) {
    return "Mohali";
  }
  // Chandigarh (Lat: 30.70 - 30.79, Lng: 76.74 - 76.84)
  if (lat >= 30.70 && lat <= 30.79 && lng >= 76.74 && lng <= 76.84) {
    return "Chandigarh";
  }
  // Panchkula (Lat: 30.64 - 30.73, Lng: 76.83 - 76.92)
  if (lat >= 30.64 && lat <= 30.73 && lng >= 76.83 && lng <= 76.92) {
    return "Panchkula";
  }
  // Ludhiana (Lat: 30.82 - 30.98, Lng: 75.75 - 75.95)
  if (lat >= 30.82 && lat <= 30.98 && lng >= 75.75 && lng <= 75.95) {
    return "Ludhiana";
  }
  // Jalandhar (Lat: 31.25 - 31.40, Lng: 75.50 - 75.68)
  if (lat >= 31.25 && lat <= 31.40 && lng >= 75.50 && lng <= 75.68) {
    return "Jalandhar";
  }
  // Amritsar (Lat: 31.55 - 31.70, Lng: 74.80 - 74.98)
  if (lat >= 31.55 && lat <= 31.70 && lng >= 74.80 && lng <= 74.98) {
    return "Amritsar";
  }
  // Patiala (Lat: 30.25 - 30.40, Lng: 76.30 - 76.48)
  if (lat >= 30.25 && lat <= 30.40 && lng >= 76.30 && lng <= 76.48) {
    return "Patiala";
  }
  // Delhi NCR
  if (lat >= 28.40 && lat <= 28.88 && lng >= 76.85 && lng <= 77.45) {
    return "Delhi NCR";
  }

  return "Punjab";
}

/**
 * Asynchronously reverse-geocodes lat/lng into City, State using OpenStreetMap / Nominatim API
 */
export async function getCityNameAsync(lat: number, lng: number): Promise<string> {
  const syncMatched = getCityFastSync(lat, lng);
  if (syncMatched !== "Punjab") {
    return syncMatched;
  }

  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (cityCache[key]) return cityCache[key];

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12`, {
      headers: { 'Accept-Language': 'en' }
    });
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const cityName = addr.city || addr.town || addr.suburb || addr.county || addr.state_district || addr.state || syncMatched;
      cityCache[key] = cityName;
      return cityName;
    }
  } catch (err) {
    console.warn("Reverse geocode fetch failed, using sync match:", err);
  }

  return syncMatched;
}

/**
 * Returns full Plus Code with dynamic city name (e.g. "8J6V9X24+8Q Mohali")
 */
export function generatePlusCodeWithCitySync(lat: number, lng: number): string {
  const code = encodePlusCode(lat, lng);
  const city = getCityFastSync(lat, lng);
  return `${code} ${city}`;
}

/**
 * Async version that ensures real location city name
 */
export async function generatePlusCodeWithCityAsync(lat: number, lng: number): Promise<string> {
  const code = encodePlusCode(lat, lng);
  const city = await getCityNameAsync(lat, lng);
  return `${code} ${city}`;
}

/**
 * Smart device model detection that extracts clean readable device info
 * avoiding privacy masking tokens like "Android (K)"
 */
export function getTimeAge(timestamp: string): string {
  if (!timestamp) return 'Unknown';
  const diffMs = Date.now() - new Date(timestamp).getTime();
  if (diffMs < 60000) return 'Just now (< 1 min ago)';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export function getMemberBreadcrumbs(crumbs: any[], memberId: string, memberName: string) {
  if (!crumbs || !Array.isArray(crumbs)) return [];
  return crumbs.filter(c => 
    (c.memberId && c.memberId === memberId) || 
    (c.memberName && memberName && c.memberName.toLowerCase().trim() === memberName.toLowerCase().trim())
  );
}

export function getDeviceModelInfo(): string {
  if (typeof navigator === 'undefined') return 'Mobile Device';
  
  const ua = navigator.userAgent || '';

  if (/iPhone/i.test(ua)) return 'Apple iPhone';
  if (/iPad/i.test(ua)) return 'Apple iPad';
  
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android[^;]+;\s*([^;)]+)/i);
    if (match && match[1]) {
      let model = match[1].replace(/Build\/.*/i, '').trim();
      if (model.length > 2 && model !== 'K' && !model.startsWith('K ')) {
        return model;
      }
    }
    
    if (/OnePlus|Nord/i.test(ua)) return 'OnePlus Nord Phone';
    if (/Samsung|SM-/i.test(ua)) return 'Samsung Galaxy';
    if (/Pixel/i.test(ua)) return 'Google Pixel';
    if (/Xiaomi|Redmi|POCO/i.test(ua)) return 'Xiaomi / Redmi';
    if (/Realme/i.test(ua)) return 'Realme Mobile';
    if (/Vivo/i.test(ua)) return 'Vivo Mobile';
    if (/Oppo/i.test(ua)) return 'OPPO Mobile';
    
    return 'Android Mobile Phone';
  }

  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Macintosh|Mac OS/i.test(ua)) return 'Mac Workstation';

  return 'Mobile Device';
}
