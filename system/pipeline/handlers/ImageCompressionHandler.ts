/**
 * Concrete Pipeline Handler 2: Image Canvas Downscaling & Compression
 * Downscales camera/gallery images to web-optimized canvas size (900px, 0.65 JPEG quality).
 * 
 * ANDROID NATIVE MIGRATION NOTE:
 * In Kotlin Android, replace HTML5 Canvas with `BitmapFactory` & `Bitmap.compress()`:
 * ```kotlin
 * val bitmap = BitmapFactory.decodeStream(fileInputStream)
 * val scaled = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true)
 * val outputStream = ByteArrayOutputStream()
 * scaled.compress(Bitmap.CompressFormat.JPEG, 70, outputStream)
 * ```
 */

import { PhotoHandler, PhotoPipelinePayload, NextFunction } from '../types';

export class ImageCompressionHandler implements PhotoHandler {
  public name = 'Image Canvas Downscaler';
  public description = 'Downscales image resolution and compresses payload size for field connectivity';
  public enabled = true;

  public async handle(payload: PhotoPipelinePayload, next: NextFunction): Promise<void> {
    const startTime = performance.now();

    if (payload.file) {
      try {
        const dataUrl = await this.compressImageFile(payload.file);
        payload.photo.url = dataUrl;
        
        // Calculate estimated compressed payload KB size
        const base64Len = dataUrl.length - (dataUrl.indexOf(',') + 1);
        const approxKb = Math.round((base64Len * 0.75) / 1024);
        payload.metadata.compressedSizeKb = approxKb;

        payload.logs.push({
          handlerName: this.name,
          durationMs: Math.round(performance.now() - startTime),
          status: 'success',
          message: `Compressed photo payload to ${approxKb} KB`,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        payload.logs.push({
          handlerName: this.name,
          durationMs: Math.round(performance.now() - startTime),
          status: 'warning',
          message: 'Image compression fallback to raw data URL',
          timestamp: new Date().toISOString(),
        });
      }
    }

    await next();
  }

  private compressImageFile(file: File): Promise<string> {
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const dataUrlStr = (e.target?.result as string) || '';
            const img = new Image();
            img.onload = () => {
              try {
                const maxWidth = 900;
                const maxHeight = 900;
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                  if (width > height) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                  } else {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                  }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
                  resolve(compressedDataUrl || dataUrlStr);
                } else {
                  resolve(dataUrlStr);
                }
              } catch (err) {
                resolve(dataUrlStr);
              }
            };
            img.onerror = () => resolve(dataUrlStr);
            img.src = dataUrlStr;
          } catch (err) {
            resolve('');
          }
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      } catch (err) {
        resolve('');
      }
    });
  }
}
