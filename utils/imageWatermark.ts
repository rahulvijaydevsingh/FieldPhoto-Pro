import { generatePlusCodeWithCitySync } from './locationUtils';

export interface WatermarkOptions {
  lat: number;
  lng: number;
  userName?: string;
  siteName?: string;
  accuracy?: number;
}

/**
 * Compresses photo and draws high-contrast GPS lat/lng, Plus Code/City & Timestamp watermark onto the canvas.
 * Returns a compressed base64 JPEG data URL (~150-300 KB).
 */
export async function watermarkAndCompressImage(
  imageDataUrl: string,
  options: WatermarkOptions
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxWidth = 1200;
      let width = img.width;
      let height = img.height;

      // Scale down large photos to max 1200px width for fast upload
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(imageDataUrl); // Fallback
        return;
      }

      // Draw base image
      ctx.drawImage(img, 0, 0, width, height);

      // Watermark Banner Dimensions
      const bannerHeight = Math.max(70, Math.round(height * 0.12));
      const bannerY = height - bannerHeight;

      // Draw semi-transparent dark banner background
      ctx.fillStyle = 'rgba(26, 21, 21, 0.85)';
      ctx.fillRect(0, bannerY, width, bannerHeight);

      // Draw top accent line on banner
      ctx.fillStyle = '#D99026'; // Gold/Amber accent
      ctx.fillRect(0, bannerY, width, Math.max(3, Math.round(bannerHeight * 0.04)));

      // Prepare text data
      const nowStr = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        hour12: true
      });

      const plusCode = generatePlusCodeWithCitySync(options.lat, options.lng);
      const latLngStr = `${options.lat.toFixed(6)}° N, ${options.lng.toFixed(6)}° E ${options.accuracy ? `(±${Math.round(options.accuracy)}m)` : ''}`;
      const userStr = options.userName ? `Staff: ${options.userName}` : '';
      const siteStr = options.siteName ? `Site: ${options.siteName}` : '';

      // Typography sizing
      const fontSize = Math.max(12, Math.round(bannerHeight * 0.20));
      ctx.font = `bold ${fontSize}px sans-serif`;

      // Line 1: Timestamp & User
      ctx.fillStyle = '#FFFFFF';
      const line1Y = bannerY + Math.round(bannerHeight * 0.30);
      ctx.fillText(`🕒 ${nowStr} ${userStr ? ` | ${userStr}` : ''}`, 15, line1Y);

      // Line 2: GPS Lat/Lng
      ctx.fillStyle = '#34D399'; // Emerald green
      const line2Y = bannerY + Math.round(bannerHeight * 0.60);
      ctx.fillText(`📍 GPS: ${latLngStr}`, 15, line2Y);

      // Line 3: Plus Code / City & Site
      ctx.fillStyle = '#FBBF24'; // Amber
      const line3Y = bannerY + Math.round(bannerHeight * 0.88);
      ctx.fillText(`🏢 ${plusCode} ${siteStr ? ` | ${siteStr}` : ''}`, 15, line3Y);

      // Export compressed image as JPEG (0.78 quality for ideal speed & clarity)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
      resolve(compressedDataUrl);
    };

    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
}
