import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Wifi, 
  MapPin, 
  ShieldCheck, 
  Smartphone, 
  RefreshCw, 
  Layers, 
  Terminal, 
  Code2, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  FileCode2,
  Cpu
} from 'lucide-react';
import { fallbackGeoEngine, ProviderLogEntry } from '../../../system/geolocation/FallbackGeolocationEngine';
import { CellWifiScanner } from '../../../system/geolocation/CellWifiScanner';
import { NetworkScanData, GeolocationResult } from '../../../system/geolocation/types';

export default function GeolocationInspector() {
  const [activeTab, setActiveTab] = useState<'inspector' | 'blueprint'>('inspector');
  const [networkScan, setNetworkScan] = useState<NetworkScanData | null>(null);
  const [geoResult, setGeoResult] = useState<GeolocationResult | null>(null);
  const [providerLogs, setProviderLogs] = useState<ProviderLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleRunScanAndLocate = async () => {
    setLoading(true);
    try {
      const scan = await CellWifiScanner.scanNetwork();
      setNetworkScan(scan);

      const res = await fallbackGeoEngine.getPosition();
      setGeoResult(res);
      setProviderLogs(fallbackGeoEngine.getLastLogs());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRunScanAndLocate();
  }, []);

  return (
    <div className="bg-[#1A1515] border border-[#3A2E2E] rounded-2xl p-6 text-white space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3A2E2E] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#D99026]/10 border border-[#D99026]/30 rounded-xl text-[#D99026]">
              <Radio size={20} />
            </span>
            <h3 className="text-lg font-bold text-white">Cell / Wi-Fi Geolocation Strategy Engine</h3>
            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
              PLUGGABLE ACTIVE
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Pluggable Strategy pattern engine providing seamless position resolution when indoor/forest GPS fails.
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
            <Layers size={14} className="inline mr-1.5" /> Engine Inspector
          </button>
          <button
            onClick={() => setActiveTab('blueprint')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'blueprint'
                ? 'bg-[#D99026] text-black border-[#D99026]'
                : 'bg-[#2D2424] text-gray-300 border-[#3A2E2E] hover:border-gray-500'
            }`}
          >
            <Smartphone size={14} className="inline mr-1.5" /> Android Native Blueprint
          </button>
        </div>
      </div>

      {activeTab === 'inspector' && (
        <div className="space-y-6">
          {/* Active Result Card */}
          <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[#D99026]" />
                <span className="text-xs uppercase font-mono tracking-wider text-gray-400">Current Position Source:</span>
                <span className="text-sm font-bold text-white bg-[#1A1515] px-2.5 py-1 rounded border border-[#3A2E2E]">
                  {geoResult ? geoResult.providerName : 'Scanning...'}
                </span>
              </div>
              {geoResult && (
                <div className="text-xs font-mono text-gray-300 flex items-center gap-3">
                  <span>Lat: <strong className="text-emerald-400">{geoResult.lat.toFixed(6)}</strong></span>
                  <span>Lng: <strong className="text-emerald-400">{geoResult.lng.toFixed(6)}</strong></span>
                  <span>Accuracy: <strong className="text-[#D99026]">±{geoResult.accuracy.toFixed(1)}m</strong></span>
                </div>
              )}
            </div>

            <button
              onClick={handleRunScanAndLocate}
              disabled={loading}
              className="px-4 py-2.5 bg-[#D99026] text-black rounded-xl font-bold text-xs hover:bg-[#b57b17] transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Executing Providers...' : 'Trigger Fallback Test'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ambient Network Scanned Data */}
            <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-[#D99026] uppercase tracking-wider flex items-center gap-2">
                <Radio size={14} /> Ambient Network Telemetry Scan
              </h4>

              {networkScan ? (
                <div className="space-y-3 text-xs">
                  {/* Cell Towers */}
                  <div className="bg-[#1A1515] border border-[#3A2E2E] rounded-lg p-3 space-y-2">
                    <span className="text-gray-400 font-bold block flex items-center gap-1.5">
                      <Cpu size={12} className="text-blue-400" /> Active Cell Tower
                    </span>
                    {networkScan.cellTowers.map((cell, idx) => (
                      <div key={idx} className="font-mono text-[11px] grid grid-cols-2 gap-2 text-gray-300 bg-[#2D2424] p-2 rounded">
                        <div>Cell ID: <strong className="text-white">{cell.cellId}</strong></div>
                        <div>LAC: <strong className="text-white">{cell.locationAreaCode}</strong></div>
                        <div>MCC/MNC: <strong className="text-white">{cell.mobileCountryCode}/{cell.mobileNetworkCode}</strong></div>
                        <div>Signal: <strong className="text-emerald-400">{cell.signalStrength} dBm</strong></div>
                      </div>
                    ))}
                  </div>

                  {/* Wi-Fi Access Points */}
                  <div className="bg-[#1A1515] border border-[#3A2E2E] rounded-lg p-3 space-y-2">
                    <span className="text-gray-400 font-bold block flex items-center gap-1.5">
                      <Wifi size={12} className="text-purple-400" /> Ambient Wi-Fi BSSID Access Points ({networkScan.wifiAccessPoints.length})
                    </span>
                    <div className="space-y-1.5">
                      {networkScan.wifiAccessPoints.map((wifi, idx) => (
                        <div key={idx} className="font-mono text-[11px] flex justify-between items-center bg-[#2D2424] p-2 rounded text-gray-300">
                          <div>
                            <div className="text-white font-bold">{wifi.ssid}</div>
                            <div className="text-gray-500 text-[10px]">{wifi.macAddress}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-400 font-bold">{wifi.signalStrength} dBm</span>
                            <div className="text-gray-500 text-[10px]">Ch {wifi.channel}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No network scan performed yet.</p>
              )}
            </div>

            {/* Strategy Provider Execution Log */}
            <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-[#D99026] uppercase tracking-wider flex items-center gap-2">
                <Terminal size={14} /> Strategy Chain Execution Trail
              </h4>

              <div className="space-y-2 font-mono text-xs">
                {fallbackGeoEngine.getProviders().map((p) => {
                  const log = providerLogs.find((l) => l.providerName === p.name);
                  return (
                    <div key={p.name} className="bg-[#1A1515] border border-[#3A2E2E] p-3 rounded-lg flex items-start gap-2.5">
                      <div className="mt-0.5">
                        {log?.status === 'success' ? (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : log?.status === 'failed' ? (
                          <AlertCircle size={16} className="text-amber-400" />
                        ) : (
                          <HelpCircle size={16} className="text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white">{p.name}</span>
                          <span className="text-[10px] text-gray-500">P{p.priority}</span>
                        </div>
                        <p className="text-[11px] text-gray-400">{log?.message || 'Awaiting execution'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'blueprint' && (
        <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-6 space-y-6">
          <div className="border-b border-[#3A2E2E] pb-3">
            <h4 className="text-sm font-bold text-[#D99026] flex items-center gap-2 uppercase tracking-wider">
              <Code2 size={16} /> Android Native Conversion Blueprint (Kotlin / Java)
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              Exact mapping instructions for converting FieldPhoto-Pro's web strategy engine to native Android capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#1A1515] border border-[#3A2E2E] p-4 rounded-xl space-y-2">
              <span className="font-bold text-white flex items-center gap-2">
                <FileCode2 size={14} className="text-blue-400" /> 1. Android Telephony & Wi-Fi Scan
              </span>
              <p className="text-gray-400 text-[11px]">
                In Kotlin, replace <code className="text-[#D99026]">CellWifiScanner.ts</code> with Android Manager calls:
              </p>
              <pre className="bg-[#2D2424] p-2.5 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto">
{`val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
val cellInfoList: List<CellInfo> = telephonyManager.allCellInfo

val wifiManager = context.getSystemService(Context.WIFI_SERVICE) as WifiManager
val wifiScanResults: List<ScanResult> = wifiManager.scanResults`}
              </pre>
            </div>

            <div className="bg-[#1A1515] border border-[#3A2E2E] p-4 rounded-xl space-y-2">
              <span className="font-bold text-white flex items-center gap-2">
                <FileCode2 size={14} className="text-purple-400" /> 2. Fused Location & Foreground Service
              </span>
              <p className="text-gray-400 text-[11px]">
                Wrap <code className="text-[#D99026]">FallbackGeolocationEngine</code> inside an Android <code className="text-white">ForegroundService</code> to track staff indoors:
              </p>
              <pre className="bg-[#2D2424] p-2.5 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto">
{`class LocationTrackingService : Service() {
    private lateinit var fusedClient: FusedLocationProviderClient
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification())
        return START_STICKY
    }
}`}
              </pre>
            </div>

            <div className="bg-[#1A1515] border border-[#3A2E2E] p-4 rounded-xl space-y-2">
              <span className="font-bold text-white flex items-center gap-2">
                <ShieldCheck size={14} className="text-amber-400" /> 3. AndroidManifest.xml Permissions
              </span>
              <p className="text-gray-400 text-[11px]">
                Add required Android system permissions when converting to native APK:
              </p>
              <pre className="bg-[#2D2424] p-2.5 rounded text-[10px] font-mono text-amber-300 overflow-x-auto">
{`<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />`}
              </pre>
            </div>

            <div className="bg-[#1A1515] border border-[#3A2E2E] p-4 rounded-xl space-y-2">
              <span className="font-bold text-white flex items-center gap-2">
                <Layers size={14} className="text-emerald-400" /> 4. Offline Room SQLite Cell Cache
              </span>
              <p className="text-gray-400 text-[11px]">
                For 100% offline cell tower coordinate resolution in deep forests without internet:
              </p>
              <pre className="bg-[#2D2424] p-2.5 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto">
{`@Entity(tableName = "cell_towers")
data class CellTowerEntity(
    @PrimaryKey val cellId: Long,
    val lac: Int, val mcc: Int, val mnc: Int,
    val latitude: Double, val longitude: Double
)`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
