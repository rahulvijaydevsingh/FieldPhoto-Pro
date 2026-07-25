// Utility for robust date parsing, sanitization, and formatting across FieldPhoto Pro

/**
 * Checks if a date string, timestamp, or Date object is valid and falls within a realistic application range (2020 - 2035).
 * Filters out invalid dates, year 1601 (Windows filetime epoch), year 1970 (Unix 0 epoch), or unparsed EXIF strings.
 */
export function isValidPhotoDate(dateVal: any): boolean {
  if (!dateVal) return false;
  
  try {
    const d = new Date(dateVal);
    const time = d.getTime();
    if (isNaN(time)) return false;

    const year = d.getFullYear();
    // Must be a realistic capture/upload date
    return year >= 2020 && year <= 2035;
  } catch {
    return false;
  }
}

/**
 * Resolves a safe, valid Date object from primary date (captureDate) or fallback date (uploadDate).
 * If both are invalid, returns current date (now).
 */
export function getSafePhotoDate(primaryDate?: any, secondaryDate?: any): Date {
  if (isValidPhotoDate(primaryDate)) {
    return new Date(primaryDate);
  }
  if (isValidPhotoDate(secondaryDate)) {
    return new Date(secondaryDate);
  }
  return new Date();
}

/**
 * Formats a photo date safely as a localized date string (e.g. "25 Jul 2026" or "Jul 25, 2026").
 */
export function formatSafePhotoDate(primaryDate?: any, secondaryDate?: any, options?: Intl.DateTimeFormatOptions): string {
  const d = getSafePhotoDate(primaryDate, secondaryDate);
  return d.toLocaleDateString('en-GB', options || { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Formats a photo date safely as a localized date and time string (e.g. "Jul 25, 2026, 03:09 PM").
 */
export function formatSafePhotoDateTime(primaryDate?: any, secondaryDate?: any, options?: Intl.DateTimeFormatOptions): string {
  const d = getSafePhotoDate(primaryDate, secondaryDate);
  return d.toLocaleString('en-US', options || {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
