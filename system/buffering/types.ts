/**
 * Server-Side Write-Behind Queue & Circuit Breaker Buffering Types
 * FieldPhoto-Pro Core Infrastructure (Circuit Breaker & Write-Behind Pattern)
 * 
 * ANDROID NATIVE MIGRATION NOTE:
 * When migrating to a native Android application (Kotlin/Java):
 * - CircuitBreakerState maps directly to an enum `enum class CircuitState { CLOSED, OPEN, HALF_OPEN }`
 * - BufferedTransaction maps directly to a Room Database `@Entity(tableName = "pending_sync_queue")`
 * - BufferingManager flushes via Android WorkManager `PeriodicWorkRequest` or `OneTimeWorkRequest` with `Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED)`.
 */

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface BufferedTransaction {
  id: string;
  type: 'photo' | 'breadcrumb' | 'visit' | 'custom';
  payload: any;
  timestamp: string;
  retryCount: number;
  status: 'queued_memory' | 'queued_disk' | 'flushing' | 'flushed' | 'failed';
  lastError?: string;
}

export interface BufferingStats {
  circuitState: CircuitBreakerState;
  memoryQueueCount: number;
  diskQueueCount: number;
  maxMemorySize: number;
  isSimulatedFailure: boolean;
  totalBufferedCount: number;
  totalFlushedCount: number;
  lastFlushTime?: string;
  consecutiveFailures: number;
}
