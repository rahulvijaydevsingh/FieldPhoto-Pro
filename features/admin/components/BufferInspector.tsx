import React, { useState, useEffect } from 'react';
import { 
  Database, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  Layers, 
  HardDrive, 
  Cpu, 
  Play, 
  AlertTriangle, 
  Code2, 
  Smartphone, 
  FileCode2, 
  Activity,
  Flame
} from 'lucide-react';
import { bufferingManager } from '../../../system/buffering/BufferingManager';
import { BufferingStats, BufferedTransaction } from '../../../system/buffering/types';

export default function BufferInspector() {
  const [activeTab, setActiveTab] = useState<'inspector' | 'blueprint'>('inspector');
  const [stats, setStats] = useState<BufferingStats>(bufferingManager.getStats());
  const [memoryQueue, setMemoryQueue] = useState<BufferedTransaction[]>(bufferingManager.getMemoryQueue());
  const [diskQueue, setDiskQueue] = useState<BufferedTransaction[]>(bufferingManager.getDiskQueue());
  const [isFlushing, setIsFlushing] = useState<boolean>(false);

  const refreshState = () => {
    setStats(bufferingManager.getStats());
    setMemoryQueue(bufferingManager.getMemoryQueue());
    setDiskQueue(bufferingManager.getDiskQueue());
  };

  useEffect(() => {
    refreshState();
    const timer = setInterval(refreshState, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleSimulatedFailure = (active: boolean) => {
    bufferingManager.setSimulatedFailure(active);
    refreshState();
  };

  const handleAddSampleItem = async () => {
    await bufferingManager.saveOrBuffer(
      'photo',
      {
        id: 'photo_test_' + Date.now(),
        fileName: 'test_field_visit.jpg',
        siteName: 'Sector 4 Construction Site',
        timestamp: new Date().toISOString(),
      },
      async () => false // Force buffer
    );
    refreshState();
  };

  const handleFlushBuffer = async () => {
    setIsFlushing(true);
    try {
      await bufferingManager.flushBuffer(async () => true); // Flush successfully
    } finally {
      setIsFlushing(false);
      refreshState();
    }
  };

  const handleClearBuffer = () => {
    bufferingManager.clearBuffer();
    refreshState();
  };

  return (
    <div className="bg-[#1A1515] border border-[#3A2E2E] rounded-2xl p-6 text-white space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3A2E2E] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#D99026]/10 border border-[#D99026]/30 rounded-xl text-[#D99026]">
              <Database size={20} />
            </span>
            <h3 className="text-lg font-bold text-white">Write-Behind Buffer & Circuit Breaker Manager</h3>
            <span
              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                stats.circuitState === 'CLOSED'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : stats.circuitState === 'OPEN'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              }`}
            >
              CIRCUIT {stats.circuitState} {stats.circuitState === 'OPEN' ? '(BUFFERING ACTIVE)' : '(HEALTHY)'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Protects app stability during database outages. Incoming photo writes are safely held in a 2-Tier Memory & IndexedDB Write-Behind Queue until server recovery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('inspector')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'inspector'
                ? 'bg-[#D99026] text-black border-[#D99026]'
                : 'bg-[#2D2424] text-gray-300 border-[#3A2E2E] hover:border-gray-500'
            }`}
          >
            <Layers size={14} className="inline mr-1.5" /> Buffer Live Dashboard
          </button>
          <button
            onClick={() => setActiveTab('blueprint')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'blueprint'
                ? 'bg-[#D99026] text-black border-[#D99026]'
                : 'bg-[#2D2424] text-gray-300 border-[#3A2E2E] hover:border-gray-500'
            }`}
          >
            <Smartphone size={14} className="inline mr-1.5" /> Android WorkManager Blueprint
          </button>
        </div>
      </div>

      {activeTab === 'inspector' && (
        <div className="space-y-6">
          {/* Metrics & Circuit Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#2D2424] border border-[#3A2E2E] p-4 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Cpu size={12} className="text-blue-400" /> Tier 1 Memory Buffer
              </span>
              <div className="text-xl font-bold text-white">
                {stats.memoryQueueCount} <span className="text-xs text-gray-500">/ {stats.maxMemorySize} items</span>
              </div>
            </div>

            <div className="bg-[#2D2424] border border-[#3A2E2E] p-4 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <HardDrive size={12} className="text-purple-400" /> Tier 2 IndexedDB Backup
              </span>
              <div className="text-xl font-bold text-white">
                {stats.diskQueueCount} <span className="text-xs text-gray-500">items</span>
              </div>
            </div>

            <div className="bg-[#2D2424] border border-[#3A2E2E] p-4 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-400" /> Total Flushed
              </span>
              <div className="text-xl font-bold text-emerald-400">
                {stats.totalFlushedCount} <span className="text-xs text-gray-500">drained</span>
              </div>
            </div>

            <div className="bg-[#2D2424] border border-[#3A2E2E] p-4 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Activity size={12} className="text-amber-400" /> Total Buffered
              </span>
              <div className="text-xl font-bold text-[#D99026]">
                {stats.totalBufferedCount} <span className="text-xs text-gray-500">transactions</span>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-[#2D2424] border border-[#3A2E2E] p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggleSimulatedFailure(!stats.isSimulatedFailure)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                  stats.isSimulatedFailure
                    ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                    : 'bg-[#1A1515] text-gray-300 border-[#3A2E2E] hover:border-rose-500/50'
                }`}
              >
                <Flame size={14} className={stats.isSimulatedFailure ? 'animate-bounce' : ''} />
                {stats.isSimulatedFailure ? 'Simulated Outage ACTIVE (Trip Circuit)' : 'Simulate Database Outage'}
              </button>

              <button
                onClick={handleAddSampleItem}
                className="px-3.5 py-2 bg-[#1A1515] text-gray-300 border border-[#3A2E2E] rounded-xl text-xs font-bold hover:border-gray-500 transition-all flex items-center gap-1.5"
              >
                <Play size={12} className="text-amber-400" /> Push Sample to Buffer
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFlushBuffer}
                disabled={isFlushing || (stats.memoryQueueCount === 0 && stats.diskQueueCount === 0)}
                className="px-4 py-2 bg-[#D99026] text-black rounded-xl text-xs font-bold hover:bg-[#b57b17] transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isFlushing ? 'animate-spin' : ''} />
                {isFlushing ? 'Draining Queue...' : 'Trigger Write-Behind Flush'}
              </button>

              <button
                onClick={handleClearBuffer}
                disabled={stats.memoryQueueCount === 0 && stats.diskQueueCount === 0}
                className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl hover:bg-rose-500/20 transition-all disabled:opacity-30"
                title="Clear All Queues"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Queued Data Items View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Memory Queue Items */}
            <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-[#D99026] uppercase tracking-wider flex items-center gap-2">
                <Cpu size={14} /> Tier 1 Memory Ring Buffer ({memoryQueue.length})
              </h4>

              {memoryQueue.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-xs pr-1">
                  {memoryQueue.map((item) => (
                    <div key={item.id} className="bg-[#1A1515] border border-[#3A2E2E] p-3 rounded-lg space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-white">{item.id}</span>
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                          {item.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400">
                        FileName: <strong className="text-gray-200">{item.payload.fileName || item.payload.id}</strong>
                      </div>
                      <div className="text-[9px] text-amber-400 italic">
                        {item.lastError || 'Queued in memory'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic p-4 text-center">Memory queue empty (Database direct writes healthy).</p>
              )}
            </div>

            {/* Persistent IndexedDB Backup Queue Items */}
            <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                <HardDrive size={14} /> Tier 2 IndexedDB Persistent Disk Backup ({diskQueue.length})
              </h4>

              {diskQueue.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-xs pr-1">
                  {diskQueue.map((item) => (
                    <div key={item.id} className="bg-[#1A1515] border border-[#3A2E2E] p-3 rounded-lg space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-white">{item.id}</span>
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                          DISK BACKUP
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Queued At: {new Date(item.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic p-4 text-center">No persistent disk overflow items.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'blueprint' && (
        <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-6 space-y-6">
          <div className="border-b border-[#3A2E2E] pb-3">
            <h4 className="text-sm font-bold text-[#D99026] flex items-center gap-2 uppercase tracking-wider">
              <Code2 size={16} /> Android Native Room DB & WorkManager Buffering Blueprint (Kotlin)
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              How to implement Traccar's Write-Behind Buffering Manager in Android Native using Room SQLite Write-Ahead Logging & WorkManager.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#1A1515] border border-[#3A2E2E] p-4 rounded-xl space-y-2">
              <span className="font-bold text-white flex items-center gap-2">
                <FileCode2 size={14} className="text-blue-400" /> 1. Room Database Write-Ahead Logging
              </span>
              <p className="text-gray-400 text-[11px]">
                Enable Write-Ahead Logging (WAL) in Room Database to buffer writes locally without UI stuttering:
              </p>
              <pre className="bg-[#2D2424] p-2.5 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto">
{`Room.databaseBuilder(context, AppDatabase::class.java, "fieldphoto.db")
    .setJournalMode(RoomDatabase.JournalMode.WRITE_AHEAD_LOGGING)
    .build()`}
              </pre>
            </div>

            <div className="bg-[#1A1515] border border-[#3A2E2E] p-4 rounded-xl space-y-2">
              <span className="font-bold text-white flex items-center gap-2">
                <FileCode2 size={14} className="text-purple-400" /> 2. WorkManager Write-Behind Flusher
              </span>
              <p className="text-gray-400 text-[11px]">
                Flush local Room queue to Firestore/Backend when network connection is restored:
              </p>
              <pre className="bg-[#2D2424] p-2.5 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto">
{`val constraints = Constraints.Builder()
    .setRequiredNetworkType(NetworkType.CONNECTED)
    .build()

val syncWorker = PeriodicWorkRequestBuilder<DatabaseBufferSyncWorker>(15, TimeUnit.MINUTES)
    .setConstraints(constraints)
    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
    .build()`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
