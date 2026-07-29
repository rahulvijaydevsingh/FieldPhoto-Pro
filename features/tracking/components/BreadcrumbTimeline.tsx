import React from 'react';
import { RouteBreadcrumb } from '../../../types';
import { MapPin, Clock, Smartphone, ShieldCheck, Navigation, AlertTriangle, Wifi, Radio, Cpu, Battery } from 'lucide-react';

interface BreadcrumbTimelineProps {
  breadcrumbs: RouteBreadcrumb[];
}

export default function BreadcrumbTimeline({ breadcrumbs }: BreadcrumbTimelineProps) {
  if (breadcrumbs.length === 0) {
    return (
      <div className="text-center py-12 bg-[#1A1515] rounded-xl border border-[#3A2E2E]">
        <Navigation size={32} className="mx-auto text-gray-600 mb-2 animate-bounce" />
        <p className="text-xs text-gray-400 font-bold">No GPS breadcrumb pings recorded for this filter.</p>
        <p className="text-[11px] text-gray-500 mt-1">Route breadcrumbs log automatically when staff capture site photos or complete attendance checks.</p>
      </div>
    );
  }

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'PHOTO_UPLOAD':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">📷 Photo Upload</span>;
      case 'ATTENDANCE_CHECK':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">📋 Attendance</span>;
      case 'APP_LOAD':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">🚀 App Load</span>;
      case 'HEARTBEAT':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">💓 Heartbeat</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-500/20 text-gray-300 border border-gray-500/30">📍 Route Ping</span>;
    }
  };

  const getProviderBadge = (provider?: string) => {
    switch (provider) {
      case 'WIFI_GOOGLE':
        return <span className="text-[9px] text-cyan-400 flex items-center gap-0.5"><Wifi size={9} /> Wi-Fi/Cell</span>;
      case 'CELL_TOWER':
        return <span className="text-[9px] text-indigo-400 flex items-center gap-0.5"><Radio size={9} /> Cell Tower</span>;
      case 'EXIF_FALLBACK':
        return <span className="text-[9px] text-orange-400 flex items-center gap-0.5"><Cpu size={9} /> Photo EXIF</span>;
      default:
        return <span className="text-[9px] text-emerald-400 flex items-center gap-0.5">🛰️ Hardware GPS</span>;
    }
  };

  return (
    <div className="bg-[#1A1515] border border-[#3A2E2E] rounded-xl p-4 space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar">
      <h4 className="text-xs font-bold text-[#D99026] uppercase tracking-wider flex items-center justify-between">
        <span>Recorded Route Pings ({breadcrumbs.length})</span>
        <span className="text-[10px] text-gray-400 font-mono">Realtime Stream</span>
      </h4>

      <div className="space-y-2">
        {breadcrumbs.map((crumb, idx) => (
          <div
            key={crumb.id || idx}
            className="p-2.5 rounded-lg bg-[#2D2424] border border-[#3A2E2E] space-y-1 text-xs hover:border-[#D99026]/50 transition-all"
          >
            <div className="flex items-center justify-between font-mono text-[11px]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-white flex items-center gap-1">
                  <MapPin size={12} className="text-[#D99026]" />
                  {crumb.userName || 'Field Staff'}
                </span>
                {getSourceBadge(crumb.sourceEvent)}
                {crumb.isMocked && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1 animate-pulse">
                    <AlertTriangle size={9} /> MOCK DETECTED
                  </span>
                )}
              </div>
              <span className="text-gray-400 flex items-center gap-1 text-[10px]">
                <Clock size={10} />
                {new Date(crumb.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(crumb.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-gray-300">
              <span className="text-emerald-400 font-bold">
                {crumb.lat.toFixed(4)}, {crumb.lng.toFixed(4)}
              </span>
              <div className="flex items-center gap-2 text-gray-400">
                {getProviderBadge(crumb.locationProvider)}
                <span>±{Math.round(crumb.accuracy || 8)}m</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 pt-0.5 border-t border-gray-800">
              <div className="truncate flex items-center gap-1 max-w-[70%]">
                <ShieldCheck size={10} className="text-emerald-400 flex-shrink-0" />
                <span className="truncate">{crumb.plusCode || 'Verified GPS'}</span>
              </div>
              {crumb.batteryLevel !== undefined && (
                <span className="flex items-center gap-0.5 text-gray-400">
                  <Battery size={9} /> {crumb.batteryLevel}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
