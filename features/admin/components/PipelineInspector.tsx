import React, { useState } from 'react';
import { 
  GitCommit, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Clock, 
  Code2, 
  Smartphone, 
  ToggleLeft, 
  ToggleRight, 
  Terminal, 
  Sparkles,
  FileCode2,
  FileCheck
} from 'lucide-react';
import { photoPipelineEngine } from '../../../system/pipeline/PhotoProcessingPipeline';
import { PhotoPipelineResult } from '../../../system/pipeline/types';
import { User } from '../../../types';

interface PipelineInspectorProps {
  currentUser?: User;
}

export default function PipelineInspector({ currentUser }: PipelineInspectorProps) {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'blueprint'>('pipeline');
  const [handlers, setHandlers] = useState(photoPipelineEngine.getHandlers());
  const [lastResult, setLastResult] = useState<PhotoPipelineResult | null>(photoPipelineEngine.getLastResult());
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleToggleHandler = (name: string, currentEnabled: boolean) => {
    photoPipelineEngine.toggleHandler(name, !currentEnabled);
    setHandlers(photoPipelineEngine.getHandlers());
  };

  const handleRunTestPipeline = async () => {
    setIsProcessing(true);
    try {
      // Create a test synthetic file payload
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1A1515';
        ctx.fillRect(0, 0, 400, 300);
        ctx.fillStyle = '#D99026';
        ctx.font = '16px sans-serif';
        ctx.fillText('FieldPhoto-Pro Pipeline Test', 40, 150);
      }
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg'));
      const testFile = new File([blob], 'test_site_inspection.jpg', { type: 'image/jpeg' });

      const testUser: User = currentUser || {
        id: 'u_admin',
        name: 'Admin User',
        email: 'admin@fieldphoto.pro',
        role: 'admin',
        designation: 'Field Inspector'
      };

      const result = await photoPipelineEngine.processPhoto(
        testFile,
        testUser,
        true,
        { lat: 30.6782, lng: 76.7291 }
      );

      setLastResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-[#1A1515] border border-[#3A2E2E] rounded-2xl p-6 text-white space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3A2E2E] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#D99026]/10 border border-[#D99026]/30 rounded-xl text-[#D99026]">
              <GitCommit size={20} />
            </span>
            <h3 className="text-lg font-bold text-white">Post-Processing Handler Chain Pipeline</h3>
            <span className="text-[10px] font-mono bg-[#D99026]/20 text-[#D99026] border border-[#D99026]/40 px-2.5 py-0.5 rounded-full font-bold">
              CHAIN OF RESPONSIBILITY
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Modular ingestion pipeline. Discrete handlers extract EXIF, compress canvas, reverse geocode, validate geofence, and persist photos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'pipeline'
                ? 'bg-[#D99026] text-black border-[#D99026]'
                : 'bg-[#2D2424] text-gray-300 border-[#3A2E2E] hover:border-gray-500'
            }`}
          >
            <Layers size={14} className="inline mr-1.5" /> Pipeline Config & Logs
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

      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#2D2424] border border-[#3A2E2E] p-4 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles size={14} className="text-[#D99026]" /> Active Pipeline Sequence ({handlers.filter(h => h.enabled).length}/{handlers.length} Handlers)
              </span>
              <p className="text-[11px] text-gray-400">
                Each handler executes sequentially. Errors in optional steps are safely isolated without stopping photo save.
              </p>
            </div>

            <button
              onClick={handleRunTestPipeline}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-[#D99026] text-black rounded-xl font-bold text-xs hover:bg-[#b57b17] transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              <Play size={14} className={isProcessing ? 'animate-spin' : ''} />
              {isProcessing ? 'Executing Chain...' : 'Simulate Pipeline Upload'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Handler Configuration Chain */}
            <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-[#D99026] uppercase tracking-wider flex items-center gap-2">
                <Layers size={14} /> Registered Handler Chain
              </h4>

              <div className="space-y-2">
                {handlers.map((h, idx) => (
                  <div key={h.name} className="bg-[#1A1515] border border-[#3A2E2E] p-3 rounded-lg flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#2D2424] border border-[#3A2E2E] text-[10px] font-mono text-gray-400 flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          {h.name}
                        </div>
                        <p className="text-[10px] text-gray-400">{h.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleHandler(h.name, h.enabled)}
                      className="text-gray-400 hover:text-white transition-colors"
                      title={h.enabled ? 'Disable Handler' : 'Enable Handler'}
                    >
                      {h.enabled ? (
                        <ToggleRight size={22} className="text-emerald-400" />
                      ) : (
                        <ToggleLeft size={22} className="text-gray-600" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Pipeline Execution Trace */}
            <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#D99026] uppercase tracking-wider flex items-center gap-2">
                  <Terminal size={14} /> Execution Trace Log
                </h4>
                {lastResult && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <Clock size={12} /> Total Execution Time: {lastResult.totalDurationMs} ms
                  </span>
                )}
              </div>

              {lastResult ? (
                <div className="space-y-2 font-mono text-xs">
                  {lastResult.logs.map((log, idx) => (
                    <div key={idx} className="bg-[#1A1515] border border-[#3A2E2E] p-2.5 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          {log.status === 'success' ? (
                            <CheckCircle2 size={14} className="text-emerald-400" />
                          ) : (
                            <AlertCircle size={14} className="text-amber-400" />
                          )}
                          <span className="font-bold text-white">{log.handlerName}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">{log.durationMs} ms</span>
                      </div>
                      <p className="text-[10px] text-gray-300 pl-5">{log.message}</p>
                    </div>
                  ))}

                  {lastResult.photo && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg text-[11px] text-emerald-300 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <FileCheck size={14} /> Photo Entity Successfully Created
                      </div>
                      <div>ID: {lastResult.photo.id}</div>
                      <div>Plus Code: {lastResult.photo.plusCode || 'None'}</div>
                      <div>Status: {lastResult.photo.syncStatus.toUpperCase()}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#1A1515] border border-[#3A2E2E] p-8 rounded-lg text-center space-y-2">
                  <GitCommit size={24} className="text-gray-600 mx-auto" />
                  <p className="text-xs text-gray-400 italic">No pipeline trace available yet.</p>
                  <p className="text-[10px] text-gray-500">Click "Simulate Pipeline Upload" to run the chain.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'blueprint' && (
        <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-6 space-y-6">
          <div className="border-b border-[#3A2E2E] pb-3">
            <h4 className="text-sm font-bold text-[#D99026] flex items-center gap-2 uppercase tracking-wider">
              <Code2 size={16} /> Android Native WorkManager Pipeline Blueprint (Kotlin)
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              How to convert FieldPhoto-Pro's handler chain into native Android background execution tasks using WorkManager.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#1A1515] border border-[#3A2E2E] p-4 rounded-xl space-y-2">
              <span className="font-bold text-white flex items-center gap-2">
                <FileCode2 size={14} className="text-blue-400" /> 1. Base Worker Interface
              </span>
              <p className="text-gray-400 text-[11px]">
                Create a common WorkManager task for each pipeline stage:
              </p>
              <pre className="bg-[#2D2424] p-2.5 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto">
{`class ExifWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val imageUri = inputData.getString("IMAGE_URI")
        // Read EXIF with androidx.exifinterface
        val output = workDataOf("LAT" to lat, "LNG" to lng)
        return Result.success(output)
    }
}`}
              </pre>
            </div>

            <div className="bg-[#1A1515] border border-[#3A2E2E] p-4 rounded-xl space-y-2">
              <span className="font-bold text-white flex items-center gap-2">
                <FileCode2 size={14} className="text-purple-400" /> 2. WorkManager Sequential Chain
              </span>
              <p className="text-gray-400 text-[11px]">
                Chain workers in sequence. Failure of optional steps will not stop the db worker:
              </p>
              <pre className="bg-[#2D2424] p-2.5 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto">
{`val exifWork = OneTimeWorkRequestBuilder<ExifWorker>().build()
val geofenceWork = OneTimeWorkRequestBuilder<GeofenceWorker>().build()
val dbWork = OneTimeWorkRequestBuilder<DbSaveWorker>().build()

WorkManager.getInstance(context)
    .beginWith(exifWork)
    .then(geofenceWork)
    .then(dbWork)
    .enqueue()`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
