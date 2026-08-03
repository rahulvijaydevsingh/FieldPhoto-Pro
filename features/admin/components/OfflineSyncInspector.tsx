import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Trash2, 
  Camera, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Smartphone, 
  Code2, 
  FileCode2, 
  Play, 
  Layers,
  ArrowUpRight,
  Database,
  Radio
} from 'lucide-react';
import { offlineSyncEngine } from '../../../system/sync/OfflineSyncEngine';
import { OfflineSyncEngineStats, PendingPhotoItem, PendingBreadcrumbItem } from '../../../system/sync/types';

export default function OfflineSyncInspector() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'blueprint'>('dashboard');
  const [stats, setStats] = useState<OfflineSyncEngineStats>(offlineSyncEngine.getStats());
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhotoItem[]>(offlineSyncEngine.getPendingPhotos());
  const [pendingBreadcrumbs, setPendingBreadcrumbs] = useState<PendingBreadcrumbItem[]>(offlineSyncEngine.getPendingBreadcrumbs());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshState = () => {
    setStats(offlineSyncEngine.getStats());
    setPendingPhotos(offlineSyncEngine.getPendingPhotos());
    setPendingBreadcrumbs(offlineSyncEngine.getPendingBreadcrumbs());
  };

  useEffect(() => {
    refreshState();
    const timer = setInterval(refreshState, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleNetwork = (online: boolean) => {
    offlineSyncEngine.setSimulatedNetwork(online);
    refreshState();
  };

  const handleAddSamplePhoto = () => {
    offlineSyncEngine.enqueuePhoto({
      photoUri: 'data:image/jpeg;base64,sample',
      fileName: 'site_photo_' + Date.now() + '.jpg',
      siteName: 'Sector 7 Construction Site',
      latitude: 30.6782,
      longitude: 76.7291,
      plusCode: '8J8V+78 Chandigarh',
      timestamp: new Date().toISOString(),
      uploaderId: 'u_field_worker',
      uploaderName: 'Field Inspector',
    });
    refreshState();
  };

  const handleAddSampleBreadcrumb = () => {
    const pt = {
      lat: 30.6782 + (Math.random() - 0.5) * 0.01,
      lng: 76.7291 + (Math.random() - 0.5) * 0.01,
      accuracy: 5,
      speed: 12.4,
      plusCode: '8J8V+78 Chandigarh',
      timestamp: new Date().toISOString(),
      deviceInfo: 'Samsung Galaxy Tab Active3',
      userId: 'u_field_worker',
      userName: 'Field Inspector',
    };
    offlineSyncEngine.enqueueBreadcrumb(pt);
    refreshState();
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await offlineSyncEngine.triggerBatchSync();
    } finally {
      setIsSyncing(false);
      refreshState();
    }
  };

  const handleClearQueues = () => {
    offlineSyncEngine.clearAllQueues();
    refreshState();
  };

  return (
    <div className="bg-[#1A1515] border border-[#3A2E2E] rounded-2xl p-6 text-white space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3A2E2E] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#D99026]/10 border border-[#D99026]/30 rounded-xl text-[#D99026]">
              <Radio size={20} />
            </span>
            <h3 className="text-lg font-bold text-white">Client Offline-First Sync Architecture</h3>
            <span
              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                stats.isOnline
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}
            >
              {stats.isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {stats.isOnline ? 'ONLINE NETWORK' : 'OFFLINE MODE'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Traccar Client pattern: Buffers both <strong>Photos</strong> and <strong>Staff Location Telemetry</strong> in local Room/IndexedDB queues. Batch-syncs automatically when network returns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'dashboard'
                ? 'bg-[#D99026] text-black border-[#D99026]'
                : 'bg-[#2D2424] text-gray-300 border-[#3A2E2E] hover:border-gray-500'
            }`}
          >
            <Layers size={14} className="inline mr-1.5" /> Client Sync Live Monitor
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

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#2D2424] border border-[#3A2E2E] p-4 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Camera size={12} className="text-blue-400" /> Pending Photos
              </span>
              <div className="text-xl font-bold text-white">
                {stats.pendingPhotosCount} <span className="text-xs text-gray-500">queued</span>
              </div>
            </div>

            <div className="bg-[#2D2424] border border-[#3A2E2E] p-4 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Navigation size={12} className="text-emerald-400" /> Pending Breadcrumbs
              </span>
              <div className="text-xl font-bold text-white">
                {stats.pendingBreadcrumbsCount} <span className="text-xs text-gray-500">telemetry pings</span>
              </div>
            </div>

            <div className="bg-[#2D2424] border border-[#3A2E2E] p-4 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-400" /> Total Photos Synced
              </span>
              <div className="text-xl font-bold text-emerald-400">
                {stats.totalPhotosSynced} <span className="text-xs text-gray-500">uploaded</span>
              </div>
            </div>

            <div className="bg-[#2D2424] border border-[#3A2E2E] p-4 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <ArrowUpRight size={12} className="text-purple-400" /> Total Breadcrumbs Synced
              </span>
              <div className="text-xl font-bold text-purple-400">
                {stats.totalBreadcrumbsSynced} <span className="text-xs text-gray-500">flushed</span>
              </div>
            </div>
          </div>

          {/* Network Controls & Action Bar */}
          <div className="bg-[#2D2424] border border-[#3A2E2E] p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleToggleNetwork(!stats.isOnline)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                  stats.isOnline
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-rose-500 text-white border-rose-600 animate-pulse'
                }`}
              >
                {stats.isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                {stats.isOnline ? 'Network Online' : 'Simulating Zero Signal (Offline)'}
              </button>

              <button
                onClick={handleAddSamplePhoto}
                className="px-3 py-2 bg-[#1A1515] text-gray-300 border border-[#3A2E2E] rounded-xl text-xs font-bold hover:border-gray-500 transition-all flex items-center gap-1"
              >
                <Camera size={12} className="text-blue-400" /> Queue Offline Photo
              </button>

              <button
                onClick={handleAddSampleBreadcrumb}
                className="px-3 py-2 bg-[#1A1515] text-gray-300 border border-[#3A2E2E] rounded-xl text-xs font-bold hover:border-gray-500 transition-all flex items-center gap-1"
              >
                <Navigation size={12} className="text-emerald-400" /> Queue Offline Ping
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTriggerSync}
                disabled={isSyncing || !stats.isOnline || (stats.pendingPhotosCount === 0 && stats.pendingBreadcrumbsCount === 0)}
                className="px-4 py-2 bg-[#D99026] text-black rounded-xl text-xs font-bold hover:bg-[#b57b17] transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Batch Uploading...' : 'Trigger Batch Sync'}
              </button>

              <button
                onClick={handleClearQueues}
                disabled={stats.pendingPhotosCount === 0 && stats.pendingBreadcrumbsCount === 0}
                className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl hover:bg-rose-500/20 transition-all disabled:opacity-30"
                title="Clear Queues"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Queues Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pillar 1: Pending Photos Queue */}
            <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <Camera size={14} /> Pending Photo Uploads ({pendingPhotos.length})
              </h4>

              {pendingPhotos.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-xs pr-1">
                  {pendingPhotos.map((item) => (
                    <div key={item.id} className="bg-[#1A1515] border border-[#3A2E2E] p-3 rounded-lg space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-white">{item.fileName}</span>
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                          {item.syncStatus}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Site: {item.siteName || 'Unassigned'} ({item.latitude.toFixed(4)}, {item.longitude.toFixed(4)})
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic p-4 text-center">No photos waiting in offline queue.</p>
              )}
            </div>

            {/* Pillar 2: Pending Staff Telemetry Queue */}
            <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Navigation size={14} /> Pending Staff Telemetry Pings ({pendingBreadcrumbs.length})
              </h4>

              {pendingBreadcrumbs.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-xs pr-1">
                  {pendingBreadcrumbs.map((item) => (
                    <div key={item.id} className="bg-[#1A1515] border border-[#3A2E2E] p-3 rounded-lg space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-white">{item.userName}</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                          {item.syncStatus}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Coords: ({item.lat.toFixed(5)}, {item.lng.toFixed(5)}) | Plus: {item.plusCode || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic p-4 text-center">No staff location pings in offline queue.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'blueprint' && (
        <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-6 space-y-6">
          <div className="border-b border-[#3A2E2E] pb-3">
            <h4 className="text-sm font-bold text-[#D99026] flex items-center gap-2 uppercase tracking-wider">
              <Code2 size={16} /> Android Native Traccar Client Architecture Blueprint (Kotlin)
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              Room Database DAOs and dual WorkManager execution for Photos and Background Staff Location Telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Pillar 1 Android Code */}
            <div className="bg-[#1A1515] border border-[#3A2E2E] p-4 rounded-xl space-y-2">
              <span className="font-bold text-white flex items-center gap-2">
                <FileCode2 size={14} className="text-blue-400" /> 1. PhotoSyncWorker (Kotlin)
              </span>
              <pre className="bg-[#2D2424] p-2.5 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto">
{`class PhotoSyncWorker(context: Context, params: WorkerParameters): CoroutineWorker(context, params) {
  override suspend fun doWork(): Result {
    val pendingPhotos = dao.getPendingPhotos()
    for (photo in pendingPhotos) {
      val response = api.uploadPhoto(photo)
      if (response.isSuccessful) dao.delete(photo)
    }
    return Result.success()
  }
}`}
              </pre>
            </div>

            {/* Pillar 2 Android Code */}
            <div className="bg-[#1A1515] border border-[#3A2E2E] p-4 rounded-xl space-y-2">
              <span className="font-bold text-white flex items-center gap-2">
                <FileCode2 size={14} className="text-emerald-400" /> 2. LocationTrackingSyncWorker (Kotlin)
              </span>
              <pre className="bg-[#2D2424] p-2.5 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto">
{`class LocationTrackingSyncWorker(context: Context, params: WorkerParameters): CoroutineWorker(context, params) {
  override suspend fun doWork(): Result {
    val pendingPings = dao.getPendingBreadcrumbs()
    if (pendingPings.isNotEmpty()) {
      val response = api.syncBatchTelemetry(pendingPings)
      if (response.isSuccessful) dao.deleteAll(pendingPings)
    }
    return Result.success()
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
