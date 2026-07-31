import { RouteBreadcrumb, TelemetryPresence, TelemetryTrainDoc } from '../../types';
import { saveTelemetryTrainToFirestore, isFirestoreQuotaExceeded } from '../../services/firebase';

export interface TelemetryTrainMetrics {
  pingsBuffered: number;
  trainWritesSent: number;
  totalPingsSent: number;
  avgPingsPerTrain: number;
  lastDispatchReason: string;
  lastDispatchTime: string | null;
  partCount: number;
  lastTrainSizeKB: number;
}

export class TelemetryTrainManager {
  private static instance: TelemetryTrainManager;
  private pingsQueue: RouteBreadcrumb[] = [];
  private geofencesQueue: any[] = [];
  private presence: TelemetryPresence | null = null;
  private sessionId: string;
  private sessionPart: number = 1;
  private isDispatching: boolean = false;
  private telemetryEnabled: boolean = true;

  public setTelemetryEnabled(enabled: boolean): void {
    this.telemetryEnabled = enabled;
  }

  public isTelemetryEnabled(): boolean {
    return this.telemetryEnabled;
  }

  private metrics: TelemetryTrainMetrics = {
    pingsBuffered: 0,
    trainWritesSent: 0,
    totalPingsSent: 0,
    avgPingsPerTrain: 0,
    lastDispatchReason: 'none',
    lastDispatchTime: null,
    partCount: 1,
    lastTrainSizeKB: 0,
  };

  private constructor() {
    this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.initStorage();
    this.setupUnloadListener();
  }

  public static getInstance(): TelemetryTrainManager {
    if (!TelemetryTrainManager.instance) {
      TelemetryTrainManager.instance = new TelemetryTrainManager();
    }
    return TelemetryTrainManager.instance;
  }

  private initStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const pingsStr = localStorage.getItem('fpro_telemetry_train_queue');
      if (pingsStr) {
        this.pingsQueue = JSON.parse(pingsStr);
      }
      const gfStr = localStorage.getItem('fpro_telemetry_train_geofences');
      if (gfStr) {
        this.geofencesQueue = JSON.parse(gfStr);
      }
      const metricsStr = localStorage.getItem('fpro_telemetry_train_metrics');
      if (metricsStr) {
        const stored = JSON.parse(metricsStr);
        this.metrics = { ...this.metrics, ...stored };
      }
      this.metrics.pingsBuffered = this.pingsQueue.length;
    } catch (err) {
      console.warn('TelemetryTrainManager storage load error:', err);
    }
  }

  private saveStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('fpro_telemetry_train_queue', JSON.stringify(this.pingsQueue));
      localStorage.setItem('fpro_telemetry_train_geofences', JSON.stringify(this.geofencesQueue));
      this.metrics.pingsBuffered = this.pingsQueue.length;
      localStorage.setItem('fpro_telemetry_train_metrics', JSON.stringify(this.metrics));
    } catch (err) {
      console.warn('TelemetryTrainManager saveStorage error:', err);
    }
  }

  private setupUnloadListener(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeunload', () => {
      // Fire-and-forget sync on unload if pings exist
      if (this.pingsQueue.length > 0 || this.geofencesQueue.length > 0 || this.presence) {
        this.dispatchTrain('unload').catch(() => {});
      }
    });
  }

  public enqueuePing(ping: RouteBreadcrumb): void {
    if (!this.telemetryEnabled) return;
    // Add sequence index / deduplication key
    const ts = ping.timestamp ? new Date(ping.timestamp).getTime() : Date.now();
    const seq = this.pingsQueue.length;
    const enriched: RouteBreadcrumb = {
      ...ping,
      id: ping.id || `p_${ts}_${seq}`,
      timestamp: new Date(ts).toISOString(),
    };

    // Prevent duplicate re-enqueuing of identical timestamp + coordinates
    const exists = this.pingsQueue.some(
      p => p.timestamp === enriched.timestamp && p.lat === enriched.lat && p.lng === enriched.lng
    );
    if (!exists) {
      this.pingsQueue.push(enriched);
      this.saveStorage();
      window.dispatchEvent(new Event('telemetry_train_updated'));

      // Phase 10: Automatic safety overflow dispatch if queue exceeds 300 items (~500 KB limit)
      if (this.pingsQueue.length >= 300) {
        this.dispatchTrain('size_overflow').catch(() => {});
      }
    }
  }

  public enqueueGeofenceEvent(ev: any): void {
    if (!this.telemetryEnabled) return;
    const exists = this.geofencesQueue.some(g => g.id === ev.id);
    if (!exists) {
      this.geofencesQueue.push(ev);
      this.saveStorage();
      window.dispatchEvent(new Event('telemetry_train_updated'));
    }
  }

  public updatePresence(presence: TelemetryPresence): void {
    if (!this.telemetryEnabled) return;
    this.presence = presence;
    window.dispatchEvent(new Event('telemetry_train_updated'));
  }

  public async dispatchTrain(
    reason: 'timer' | 'priority_event' | 'manual' | 'unload' | 'size_overflow'
  ): Promise<boolean> {
    if (this.isDispatching) return false;
    if (!this.telemetryEnabled && reason !== 'manual') return false;
    if (this.pingsQueue.length === 0 && this.geofencesQueue.length === 0 && !this.presence) {
      return true;
    }
    if (isFirestoreQuotaExceeded()) {
      return false;
    }

    this.isDispatching = true;
    try {
      const pingsToSend = [...this.pingsQueue];
      const geofencesToSend = [...this.geofencesQueue];
      const presenceToSend = this.presence ? { ...this.presence } : undefined;

      if (pingsToSend.length === 0 && !presenceToSend && geofencesToSend.length === 0) {
        this.isDispatching = false;
        return true;
      }

      const firstPing = pingsToSend[0];
      const userId = firstPing?.userId || presenceToSend?.userId || 'staff_u1';
      const userName = firstPing?.userName || presenceToSend?.userName || 'Field Staff';

      const timestamps = pingsToSend
        .map(p => new Date(p.timestamp).getTime())
        .filter(t => !isNaN(t));
      const fromTs = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
      const toTs = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();

      // Check 1MB safety valve (800KB threshold)
      const maxChunkSize = 350; // max pings per doc to stay safely under 1MB
      const chunks: RouteBreadcrumb[][] = [];
      if (pingsToSend.length <= maxChunkSize) {
        chunks.push(pingsToSend);
      } else {
        for (let i = 0; i < pingsToSend.length; i += maxChunkSize) {
          chunks.push(pingsToSend.slice(i, i + maxChunkSize));
        }
      }

      let allSucceeded = true;
      let totalSentInBatch = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const batchId = `train_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        const trainDoc: TelemetryTrainDoc = {
          type: 'telemetry_train',
          batchId,
          userId,
          userName,
          sessionId: this.sessionId,
          sessionPart: this.sessionPart++,
          fromTs,
          toTs,
          count: chunk.length,
          pings: chunk,
          geofenceEvents: i === 0 ? geofencesToSend : undefined,
          presence: i === 0 ? presenceToSend : undefined,
          dispatchReason: reason,
          createdAt: new Date().toISOString(),
        };

        const jsonStr = JSON.stringify(trainDoc);
        const sizeBytes = new Blob([jsonStr]).size;
        this.metrics.lastTrainSizeKB = Math.round(sizeBytes / 1024);

        const success = await saveTelemetryTrainToFirestore(trainDoc);
        if (success) {
          totalSentInBatch += chunk.length;
          this.metrics.trainWritesSent++;
          this.metrics.partCount = this.sessionPart;
        } else {
          allSucceeded = false;
          break;
        }
      }

      if (allSucceeded) {
        // Clear successfully sent queues
        this.pingsQueue = [];
        this.geofencesQueue = [];
        this.metrics.totalPingsSent += totalSentInBatch;
        this.metrics.pingsBuffered = 0;
        this.metrics.lastDispatchReason = reason;
        this.metrics.lastDispatchTime = new Date().toISOString();
        if (this.metrics.trainWritesSent > 0) {
          this.metrics.avgPingsPerTrain = Math.round(
            this.metrics.totalPingsSent / this.metrics.trainWritesSent
          );
        }
        this.saveStorage();
        window.dispatchEvent(new Event('telemetry_train_synced'));
        this.isDispatching = false;
        return true;
      } else {
        this.isDispatching = false;
        return false;
      }
    } catch (err) {
      console.warn('TelemetryTrainManager dispatch error:', err);
      this.isDispatching = false;
      return false;
    }
  }

  public getMetrics(): TelemetryTrainMetrics {
    return { ...this.metrics, pingsBuffered: this.pingsQueue.length };
  }

  public clearQueue(): void {
    this.pingsQueue = [];
    this.geofencesQueue = [];
    this.saveStorage();
  }
}
