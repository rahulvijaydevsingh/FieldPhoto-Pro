/**
 * FieldPhoto-Pro Post-Processing Handler Chain Architecture Types
 * Pipeline / Chain of Responsibility Pattern
 * 
 * ANDROID NATIVE MIGRATION NOTE:
 * When migrating to a native Android application (Kotlin/Java):
 * - `PhotoPipelinePayload` maps directly to a Kotlin data class or WorkManager `Data` / `WorkerParameters`.
 * - `PhotoHandler` maps to `interface PhotoHandler { suspend fun handle(ctx: PhotoPipelineContext, chain: HandlerChain) }`
 * - Handlers can run inside an Android `WorkManager` sequence or Coroutines `Flow` pipeline.
 */

import { Photo, User } from '../../types';

export interface PipelineLogEntry {
  handlerName: string;
  durationMs: number;
  status: 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

export interface PhotoPipelinePayload {
  file?: File;
  photo: Partial<Photo>;
  user: User;
  isOnline: boolean;
  isDirectCapture?: boolean;
  exifData?: {
    dateTimeOriginal?: string;
    make?: string;
    model?: string;
  };
  fallbackGps: { lat: number; lng: number };
  logs: PipelineLogEntry[];
  metadata: {
    exifExtracted?: boolean;
    geofenceChecked?: boolean;
    geofenceSiteId?: string;
    aiTags?: string[];
    compressedSizeKb?: number;
    [key: string]: any;
  };
}

export type NextFunction = () => Promise<void>;

export interface PhotoHandler {
  name: string;
  description: string;
  enabled: boolean;
  handle(payload: PhotoPipelinePayload, next: NextFunction): Promise<void>;
}

export interface PhotoPipelineResult {
  photo: Photo;
  logs: PipelineLogEntry[];
  payload: PhotoPipelinePayload;
  success: boolean;
  totalDurationMs: number;
}
