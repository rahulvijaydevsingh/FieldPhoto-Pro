/**
 * Write-Behind Queue & Circuit Breaker Buffering Manager
 * FieldPhoto-Pro Core Infrastructure
 * 
 * Inspired by Traccar's `BufferingManager.java`.
 * Prevents application crashes and data loss during database outages, network disruption,
 * or rate limits by buffering writes in a two-tier Write-Behind Queue (Memory + IndexedDB Persistent Storage).
 * 
 * ANDROID NATIVE ARCHITECTURE BLUEPRINT:
 * ------------------------------------------------
 * When converting FieldPhoto-Pro into a Native Android App (Kotlin/Java):
 * 1. Architecture Parity:
 *    Maintain this Circuit Breaker & Queue structure in Kotlin:
 *    `class AndroidBufferingManager(val db: AppRoomDatabase, val workManager: WorkManager)`
 * 
 * 2. Room SQLite Write-Ahead Logging (WAL):
 *    Use Room Database with Write-Ahead Logging (`.setJournalMode(RoomDatabase.JournalMode.WRITE_AHEAD_LOGGING)`)
 *    for non-blocking concurrent local disk writes.
 * 
 * 3. WorkManager Write-Behind Sync:
 *    ```kotlin
 *    val syncConstraints = Constraints.Builder()
 *        .setRequiredNetworkType(NetworkType.CONNECTED)
 *        .setRequiresBatteryNotLow(true)
 *        .build()
 * 
 *    val syncWork = PeriodicWorkRequestBuilder<DatabaseBufferSyncWorker>(15, TimeUnit.MINUTES)
 *        .setConstraints(syncConstraints)
 *        .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
 *        .build()
 *    ```
 */

import { CircuitBreakerState, BufferedTransaction, BufferingStats } from './types';

export class BufferingManager {
  private circuitState: CircuitBreakerState = 'CLOSED';
  private memoryQueue: BufferedTransaction[] = [];
  private diskQueue: BufferedTransaction[] = [];
  private maxMemorySize: number = 50;
  private isSimulatedFailure: boolean = false;
  private consecutiveFailures: number = 0;
  private totalBufferedCount: number = 0;
  private totalFlushedCount: number = 0;
  private lastFlushTime?: string;
  private flusherTimer: any = null;
  private dbName = 'FieldPhotoPro_BufferDB';
  private storeName = 'buffer_queue';

  constructor(maxMemorySize: number = 50) {
    this.maxMemorySize = maxMemorySize;
    this.initDiskBackup();
    this.startAutoFlusher(10000);
  }

  /**
   * Initializes IndexedDB persistent backup store to prevent data loss across page reloads.
   */
  private async initDiskBackup(): Promise<void> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;

    try {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event: any) => {
        const db = event.target.result;
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          this.diskQueue = getAllRequest.result || [];
          if (this.diskQueue.length > 0) {
            this.circuitState = 'OPEN';
          }
        };
      };
    } catch (err) {
      console.warn('IndexedDB buffer backup initialization fallback:', err);
    }
  }

  /**
   * Saves transaction to disk backup (IndexedDB)
   */
  private async saveToDisk(txItem: BufferedTransaction): Promise<void> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;

    try {
      const request = indexedDB.open(this.dbName, 1);
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(txItem);
      };
    } catch (err) {
      console.warn('Disk save error:', err);
    }
  }

  /**
   * Removes transaction from disk backup (IndexedDB)
   */
  private async removeFromDisk(id: string): Promise<void> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;

    try {
      const request = indexedDB.open(this.dbName, 1);
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.delete(id);
      };
    } catch (err) {
      console.warn('Disk delete error:', err);
    }
  }

  /**
   * Main entry point: executes direct database save or buffers data if DB fails / circuit trips.
   */
  public async saveOrBuffer<T>(
    type: 'photo' | 'breadcrumb' | 'visit' | 'custom',
    data: T,
    directSaveFn: (payload: T) => Promise<boolean>
  ): Promise<{ success: boolean; isBuffered: boolean; message: string }> {
    // If circuit is closed and no simulated failure, attempt direct DB write
    if (this.circuitState === 'CLOSED' && !this.isSimulatedFailure) {
      try {
        const success = await directSaveFn(data);
        if (success) {
          this.consecutiveFailures = 0;
          return { success: true, isBuffered: false, message: 'Direct database save successful.' };
        } else {
          throw new Error('Database save returned failure response.');
        }
      } catch (err: any) {
        this.consecutiveFailures++;
        this.circuitState = 'OPEN'; // Trip Circuit Breaker
        return this.bufferData(type, data, err.message || 'Database write error');
      }
    } else {
      // Circuit Breaker OPEN or simulated failure active -> Buffer transaction
      return this.bufferData(type, data, this.isSimulatedFailure ? 'Simulated DB failure mode active' : 'Circuit breaker OPEN');
    }
  }

  /**
   * Buffers transaction into Memory Queue or overflows to Disk Queue.
   */
  private bufferData<T>(
    type: 'photo' | 'breadcrumb' | 'visit' | 'custom',
    data: T,
    reason: string
  ): { success: boolean; isBuffered: boolean; message: string } {
    const txItem: BufferedTransaction = {
      id: 'buf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      type,
      payload: data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'queued_memory',
      lastError: reason,
    };

    this.totalBufferedCount++;

    if (this.memoryQueue.length < this.maxMemorySize) {
      this.memoryQueue.push(txItem);
      this.saveToDisk(txItem); // Sync to persistent disk
      return {
        success: true,
        isBuffered: true,
        message: `Buffered transaction in Memory Queue (${reason}).`,
      };
    } else {
      // Memory Queue full -> Overflow to Persistent Disk Backup Queue
      txItem.status = 'queued_disk';
      this.diskQueue.push(txItem);
      this.saveToDisk(txItem);
      return {
        success: true,
        isBuffered: true,
        message: `Memory Queue full. Overflowed to Persistent Disk Backup (${reason}).`,
      };
    }
  }

  /**
   * Flushes buffered items sequentially (FIFO) to database when online.
   */
  public async flushBuffer(directFlusherFn?: (item: BufferedTransaction) => Promise<boolean>): Promise<{
    flushedCount: number;
    remainingCount: number;
  }> {
    if (this.memoryQueue.length === 0 && this.diskQueue.length === 0) {
      this.circuitState = this.isSimulatedFailure ? 'OPEN' : 'CLOSED';
      return { flushedCount: 0, remainingCount: 0 };
    }

    if (this.isSimulatedFailure) {
      return {
        flushedCount: 0,
        remainingCount: this.memoryQueue.length + this.diskQueue.length,
      };
    }

    this.circuitState = 'HALF_OPEN'; // Testing database recovery
    let flushedCount = 0;

    // 1. Drain Memory Queue
    while (this.memoryQueue.length > 0) {
      const item = this.memoryQueue[0];
      item.status = 'flushing';

      try {
        let success = true;
        if (directFlusherFn) {
          success = await directFlusherFn(item);
        }

        if (success) {
          this.memoryQueue.shift(); // Remove from memory
          this.removeFromDisk(item.id); // Remove from persistent disk
          flushedCount++;
          this.totalFlushedCount++;
        } else {
          item.retryCount++;
          item.status = 'queued_memory';
          this.circuitState = 'OPEN'; // Database still failing
          break;
        }
      } catch (err: any) {
        item.retryCount++;
        item.status = 'queued_memory';
        item.lastError = err.message;
        this.circuitState = 'OPEN';
        break;
      }
    }

    // 2. Drain Disk Queue into Memory Queue if memory has space
    while (this.diskQueue.length > 0 && this.memoryQueue.length < this.maxMemorySize) {
      const diskItem = this.diskQueue.shift();
      if (diskItem) {
        diskItem.status = 'queued_memory';
        this.memoryQueue.push(diskItem);
      }
    }

    const remaining = this.memoryQueue.length + this.diskQueue.length;
    if (remaining === 0) {
      this.circuitState = 'CLOSED'; // Circuit Breaker fully recovered
      this.consecutiveFailures = 0;
    }

    this.lastFlushTime = new Date().toISOString();
    return { flushedCount, remainingCount: remaining };
  }

  /**
   * Starts background flusher timer.
   */
  public startAutoFlusher(intervalMs: number = 10000): void {
    if (this.flusherTimer) clearInterval(this.flusherTimer);
    this.flusherTimer = setInterval(() => {
      this.flushBuffer();
    }, intervalMs);
  }

  /**
   * Simulates database failure for testing circuit breaker behavior.
   */
  public setSimulatedFailure(active: boolean): void {
    this.isSimulatedFailure = active;
    if (active) {
      this.circuitState = 'OPEN';
    } else if (this.memoryQueue.length === 0 && this.diskQueue.length === 0) {
      this.circuitState = 'CLOSED';
    }
  }

  /**
   * Clears all buffered queues.
   */
  public clearBuffer(): void {
    this.memoryQueue.map((item) => this.removeFromDisk(item.id));
    this.diskQueue.map((item) => this.removeFromDisk(item.id));
    this.memoryQueue = [];
    this.diskQueue = [];
    this.circuitState = this.isSimulatedFailure ? 'OPEN' : 'CLOSED';
  }

  /**
   * Returns current buffering manager statistics.
   */
  public getStats(): BufferingStats {
    return {
      circuitState: this.circuitState,
      memoryQueueCount: this.memoryQueue.length,
      diskQueueCount: this.diskQueue.length,
      maxMemorySize: this.maxMemorySize,
      isSimulatedFailure: this.isSimulatedFailure,
      totalBufferedCount: this.totalBufferedCount,
      totalFlushedCount: this.totalFlushedCount,
      lastFlushTime: this.lastFlushTime,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  public getMemoryQueue(): BufferedTransaction[] {
    return [...this.memoryQueue];
  }

  public getDiskQueue(): BufferedTransaction[] {
    return [...this.diskQueue];
  }
}

// Global buffering manager singleton instance
export const bufferingManager = new BufferingManager(50);
