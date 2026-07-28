/**
 * Concrete Pipeline Handler 1: EXIF Metadata Extraction
 * Extracts embedded camera make, model, EXIF GPS coordinates, and capture date.
 * 
 * ANDROID NATIVE MIGRATION NOTE:
 * In Kotlin Android, replace ExifReader JS with `androidx.exifinterface.media.ExifInterface`:
 * ```kotlin
 * val exif = ExifInterface(fileInputStream)
 * val latLong = FloatArray(2)
 * if (exif.getLatLong(latLong)) {
 *     payload.photo.site_lat = latLong[0]
 *     payload.photo.site_lng = latLong[1]
 * }
 * ```
 */

import ExifReader from 'exifreader';
import { PhotoHandler, PhotoPipelinePayload, NextFunction } from '../types';
import { isValidPhotoDate } from '../../../services/dateUtils';
import { getDeviceModelInfo } from '../../../utils/locationUtils';

export class ExifExtractionHandler implements PhotoHandler {
  public name = 'EXIF Metadata Extractor';
  public description = 'Reads camera model, EXIF GPS tags, and hardware capture timestamp';
  public enabled = true;

  private parseExifCoordinate(val: any, ref: any): number | undefined {
    if (val === undefined || val === null) return undefined;
    let deg: number | undefined;

    const parseSinglePart = (part: any): number | undefined => {
      if (typeof part === 'number' && !isNaN(part)) return part;
      if (typeof part === 'string') {
        const p = parseFloat(part.trim());
        if (!isNaN(p)) return p;
      }
      if (Array.isArray(part) && part.length === 2 && typeof part[0] === 'number' && typeof part[1] === 'number' && part[1] !== 0) {
        return part[0] / part[1];
      }
      if (part && typeof part === 'object') {
        if (typeof part.numerator === 'number' && typeof part.denominator === 'number' && part.denominator !== 0) {
          return part.numerator / part.denominator;
        }
        if (typeof part.value === 'number' && !isNaN(part.value)) return part.value;
        if (typeof part.description === 'number' && !isNaN(part.description)) return part.description;
      }
      return undefined;
    };

    if (typeof val === 'number' && !isNaN(val)) {
      deg = val;
    } else if (typeof val === 'string') {
      const trimmed = val.trim();
      const directNum = parseFloat(trimmed);
      if (!isNaN(directNum) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
        deg = directNum;
      } else {
        const dmsMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*°?\s*(\d+(?:\.\d+)?)\s*['′]?\s*(\d+(?:\.\d+)?)\s*["″]?/);
        if (dmsMatch) {
          const d = parseFloat(dmsMatch[1]);
          const m = parseFloat(dmsMatch[2]);
          const s = parseFloat(dmsMatch[3]);
          if (!isNaN(d) && !isNaN(m) && !isNaN(s)) {
            deg = d + (m / 60) + (s / 3600);
          }
        }
      }
    } else if (Array.isArray(val)) {
      if (val.length === 3) {
        const d = parseSinglePart(val[0]);
        const m = parseSinglePart(val[1]);
        const s = parseSinglePart(val[2]);
        if (d !== undefined) {
          deg = Math.abs(d) + ((m || 0) / 60) + ((s || 0) / 3600);
          if (d < 0) deg = -deg;
        }
      } else if (val.length === 1) {
        deg = parseSinglePart(val[0]);
      }
    } else if (typeof val === 'object') {
      if (typeof val.description === 'number' && !isNaN(val.description)) {
        deg = val.description;
      } else if (typeof val.value === 'number' && !isNaN(val.value)) {
        deg = val.value;
      } else if (typeof val.description === 'string') {
        return this.parseExifCoordinate(val.description, ref);
      } else if (Array.isArray(val.value)) {
        return this.parseExifCoordinate(val.value, ref);
      } else if (val.numerator !== undefined && val.denominator !== undefined && val.denominator !== 0) {
        deg = val.numerator / val.denominator;
      }
    }

    if (deg === undefined || isNaN(deg)) return undefined;

    let refStr = '';
    if (typeof ref === 'string') refStr = ref.trim().toUpperCase();
    else if (ref && typeof ref.description === 'string') refStr = ref.description.trim().toUpperCase();
    else if (ref && typeof ref.value === 'string') refStr = ref.value.trim().toUpperCase();

    if (refStr === 'S' || refStr === 'W') {
      deg = -Math.abs(deg);
    } else if (refStr === 'N' || refStr === 'E') {
      deg = Math.abs(deg);
    }

    return deg;
  }

  public async handle(payload: PhotoPipelinePayload, next: NextFunction): Promise<void> {
    const startTime = performance.now();

    if (payload.file) {
      try {
        const tags = await ExifReader.load(payload.file, { expanded: true });
        let rawLat: number | undefined;
        let rawLng: number | undefined;

        if (tags.gps) {
          const latRef = tags.gps.LatitudeRef || tags.gps.GPSLatitudeRef;
          const lngRef = tags.gps.LongitudeRef || tags.gps.GPSLongitudeRef;
          rawLat = this.parseExifCoordinate(tags.gps.Latitude, latRef);
          rawLng = this.parseExifCoordinate(tags.gps.Longitude, lngRef);
        }

        if (rawLat !== undefined && rawLng !== undefined && !isNaN(rawLat) && !isNaN(rawLng)) {
          payload.photo.gps = { lat: rawLat, lng: rawLng };
          payload.photo.site_lat = rawLat;
          payload.photo.site_lng = rawLng;
          payload.photo.locationSource = 'exif';
        } else {
          payload.photo.gps = payload.fallbackGps;
          payload.photo.site_lat = payload.fallbackGps.lat;
          payload.photo.site_lng = payload.fallbackGps.lng;
          payload.photo.locationSource = 'device';
        }

        const makeTag = tags.Make || tags.image?.Make || tags.exif?.Make;
        const modelTag = tags.Model || tags.image?.Model || tags.exif?.Model;
        const makeStr = makeTag?.description ? String(makeTag.description).trim() : '';
        const modelStr = modelTag?.description ? String(modelTag.description).trim() : '';

        if (modelStr) {
          payload.photo.deviceInfo = makeStr && !modelStr.toLowerCase().includes(makeStr.toLowerCase()) 
            ? `${makeStr} ${modelStr}` 
            : modelStr;
        } else {
          payload.photo.deviceInfo = makeStr || getDeviceModelInfo();
        }

        let captureDate: string | undefined;
        if (tags.exif) {
          const dtTag = tags.exif.DateTimeOriginal || tags.exif.CreateDate || tags.exif.DateTime;
          if (dtTag && dtTag.description) {
            const parts = String(dtTag.description).trim().split(' ');
            if (parts.length === 2) {
              const datePart = parts[0].replace(/:/g, '-');
              const timeParts = parts[1].split(':');
              if (timeParts.length === 3) {
                const dateSplit = datePart.split('-');
                const y = parseInt(dateSplit[0], 10);
                const m = parseInt(dateSplit[1], 10);
                const d = parseInt(dateSplit[2], 10);
                const hh = parseInt(timeParts[0], 10);
                const mm = parseInt(timeParts[1], 10);
                const ss = parseInt(timeParts[2], 10);

                if (!isNaN(y) && !isNaN(m) && !isNaN(d) && !isNaN(hh) && !isNaN(mm) && !isNaN(ss)) {
                  const parsed = new Date(y, m - 1, d, hh, mm, ss);
                  if (isValidPhotoDate(parsed)) {
                    captureDate = parsed.toISOString();
                  }
                }
              }
            }
          }
        }

        payload.photo.captureDate = captureDate || new Date().toISOString();
        payload.metadata.exifExtracted = true;

        payload.logs.push({
          handlerName: this.name,
          durationMs: Math.round(performance.now() - startTime),
          status: 'success',
          message: `Extracted EXIF (${payload.photo.locationSource?.toUpperCase()} location, ${payload.photo.deviceInfo})`,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        payload.logs.push({
          handlerName: this.name,
          durationMs: Math.round(performance.now() - startTime),
          status: 'warning',
          message: 'EXIF extraction skipped or unavailable. Defaulted to device GPS.',
          timestamp: new Date().toISOString(),
        });
      }
    }

    await next();
  }
}
