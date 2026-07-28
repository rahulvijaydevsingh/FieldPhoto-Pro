/**
 * Post-Processing Handler Chain Pipeline Engine
 * FieldPhoto-Pro Core Infrastructure (Chain of Responsibility Pattern)
 * 
 * Data flows through a series of discrete handlers:
 * ExifExtractor -> ImageCompressor -> ReverseGeocode -> GeofenceCheck -> AiQuality -> BreadcrumbLogger -> DatabaseSave
 * 
 * If a non-critical handler fails (e.g., Geocoder network timeout), the error is isolated,
 * logged, and the payload safely moves down the pipeline to save the photo.
 * 
 * ANDROID NATIVE ARCHITECTURE BLUEPRINT:
 * ------------------------------------------------
 * When converting FieldPhoto-Pro into a Native Android App (Kotlin/Java):
 * 1. Architecture Parity:
 *    `interface PhotoHandler { suspend fun handle(ctx: PhotoContext, next: () -> Unit) }`
 * 
 * 2. OkHttp Interceptor / Pipeline Chain:
 *    Or Kotlin Coroutine `Flow` pipeline / Channel processing.
 * 
 * 3. Android WorkManager Chain:
 *    ```kotlin
 *    val exifWork = OneTimeWorkRequestBuilder<ExifWorker>().build()
 *    val geofenceWork = OneTimeWorkRequestBuilder<GeofenceWorker>().build()
 *    val dbWork = OneTimeWorkRequestBuilder<DbSaveWorker>().build()
 *    
 *    WorkManager.getInstance(context)
 *        .beginWith(exifWork)
 *        .then(geofenceWork)
 *        .then(dbWork)
 *        .enqueue()
 *    ```
 */

import { 
  PhotoHandler, 
  PhotoPipelinePayload, 
  PhotoPipelineResult, 
  PipelineLogEntry 
} from './types';
import { Photo, User } from '../../types';
import { ExifExtractionHandler } from './handlers/ExifExtractionHandler';
import { ImageCompressionHandler } from './handlers/ImageCompressionHandler';
import { ReverseGeocodeHandler } from './handlers/ReverseGeocodeHandler';
import { ProjectGeofenceHandler } from './handlers/ProjectGeofenceHandler';
import { AiQualityAnalysisHandler } from './handlers/AiQualityAnalysisHandler';
import { BreadcrumbLoggerHandler } from './handlers/BreadcrumbLoggerHandler';
import { DatabaseSaveHandler } from './handlers/DatabaseSaveHandler';

export class PhotoProcessingPipeline {
  private handlers: PhotoHandler[] = [];
  private lastResult: PhotoPipelineResult | null = null;

  constructor() {
    // Register default post-processing pipeline chain in strict order
    this.use(new ExifExtractionHandler());
    this.use(new ImageCompressionHandler());
    this.use(new ReverseGeocodeHandler());
    this.use(new ProjectGeofenceHandler());
    this.use(new AiQualityAnalysisHandler());
    this.use(new BreadcrumbLoggerHandler());
    this.use(new DatabaseSaveHandler());
  }

  public use(handler: PhotoHandler): this {
    this.handlers.push(handler);
    return this;
  }

  public getHandlers(): PhotoHandler[] {
    return [...this.handlers];
  }

  public toggleHandler(handlerName: string, enabled: boolean): void {
    const handler = this.handlers.find((h) => h.name === handlerName);
    if (handler) {
      handler.enabled = enabled;
    }
  }

  public getLastResult(): PhotoPipelineResult | null {
    return this.lastResult;
  }

  /**
   * Runs the processing payload through the chain of responsibility handlers.
   */
  public async processPhoto(
    file: File,
    user: User,
    isOnline: boolean,
    fallbackGps: { lat: number; lng: number }
  ): Promise<PhotoPipelineResult> {
    const totalStart = performance.now();
    const logs: PipelineLogEntry[] = [];

    const payload: PhotoPipelinePayload = {
      file,
      photo: {},
      user,
      isOnline,
      fallbackGps,
      logs,
      metadata: {},
    };

    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= this.handlers.length) {
        return;
      }

      const currentHandler = this.handlers[index++];

      if (!currentHandler.enabled) {
        logs.push({
          handlerName: currentHandler.name,
          durationMs: 0,
          status: 'warning',
          message: 'Handler disabled by pipeline configuration',
          timestamp: new Date().toISOString(),
        });
        await next();
        return;
      }

      try {
        await currentHandler.handle(payload, next);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logs.push({
          handlerName: currentHandler.name,
          durationMs: 0,
          status: 'error',
          message: `Pipeline Handler Error: ${errorMsg}. Bypassing to next handler...`,
          timestamp: new Date().toISOString(),
        });
        // Error isolation: continue chain even if single handler throws exception
        await next();
      }
    };

    await next();

    const totalDurationMs = Math.round(performance.now() - totalStart);

    const result: PhotoPipelineResult = {
      photo: payload.photo as Photo,
      logs,
      payload,
      success: !!payload.photo.id,
      totalDurationMs,
    };

    this.lastResult = result;
    return result;
  }
}

// Global pipeline engine singleton instance
export const photoPipelineEngine = new PhotoProcessingPipeline();
