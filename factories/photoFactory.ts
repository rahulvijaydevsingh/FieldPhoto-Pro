import { Photo, PhotoStatus, SyncStatus, Priority } from '../types';

const PHOTO_DEFAULTS = {
  siteName: '',
  site_lat: 30.9010,
  site_lng: 75.8573,
  plusCode: '8J52W724+8Q Ludhiana',
  locationSource: 'device' as const,
  deviceInfo: 'Android Mobile Phone',
  leadSource: 'Field Visit',
  customLeadSource: '',
  constructionStage: 'Just Started',
  priority: 'Medium' as Priority,
  notes: '',
  estimatedQuantity: '',
  othersMaterialNote: '',
  hasDraft: false,
  materialInterests: [] as string[],
  peopleMet: [] as Photo['peopleMet'],
  status: 'new' as PhotoStatus,
  syncStatus: 'pending' as SyncStatus,
  fileName: 'photo.jpg',
  uploadDate: new Date().toISOString(),
  captureDate: new Date().toISOString(),
  gps: { lat: 30.9010, lng: 75.8573 },
};

/**
 * Creates a NEW photo. Use this in UploadView when a user takes a picture.
 * Guarantees no core field is undefined.
 */
export function createPhoto(
  overrides: Partial<Photo> & Pick<Photo, 'id' | 'url' | 'uploaderId' | 'uploaderName'>
): Photo {
  const defaultGps = overrides.gps ?? {
    lat: overrides.site_lat ?? PHOTO_DEFAULTS.site_lat,
    lng: overrides.site_lng ?? PHOTO_DEFAULTS.site_lng,
  };

  return {
    ...PHOTO_DEFAULTS,
    ...overrides,
    peopleMet: overrides.peopleMet ?? PHOTO_DEFAULTS.peopleMet,
    materialInterests: overrides.materialInterests ?? PHOTO_DEFAULTS.materialInterests,
    gps: defaultGps,
    site_lat: overrides.site_lat ?? defaultGps.lat,
    site_lng: overrides.site_lng ?? defaultGps.lng,
  };
}

/**
 * Updates an EXISTING photo. Use this in ReviewEditor when submitting a form.
 * Preserves the original id, url, and uploadDate so they cannot be accidentally wiped.
 */
export function updatePhoto(existing: Photo, changes: Partial<Photo>): Photo {
  const updatedGps = changes.gps ?? existing.gps ?? {
    lat: changes.site_lat ?? existing.site_lat ?? PHOTO_DEFAULTS.site_lat,
    lng: changes.site_lng ?? existing.site_lng ?? PHOTO_DEFAULTS.site_lng,
  };

  return {
    ...existing,
    ...changes,
    id: existing.id, // Immutable
    url: existing.url, // Immutable
    uploadDate: existing.uploadDate, // Immutable
    peopleMet: changes.peopleMet ?? existing.peopleMet ?? PHOTO_DEFAULTS.peopleMet,
    materialInterests: changes.materialInterests ?? existing.materialInterests ?? PHOTO_DEFAULTS.materialInterests,
    gps: updatedGps,
    site_lat: changes.site_lat ?? updatedGps.lat,
    site_lng: changes.site_lng ?? updatedGps.lng,
  };
}
