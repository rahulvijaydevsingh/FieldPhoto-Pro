import React from 'react';
import { RouteBreadcrumb } from '../../../types';
import { MapPin, Clock, Smartphone, ShieldCheck, Navigation } from 'lucide-react';

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
              <span className="font-bold text-white flex items-center gap-1.5">
                <MapPin size={12} className="text-[#D99026]" />
                {crumb.userName || 'Field Staff'}
              </span>
              <span className="text-gray-400 flex items-center gap-1">
                <Clock size={10} />
                {new Date(crumb.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-gray-300">
              <span className="text-emerald-400 font-bold">
                {crumb.lat.toFixed(4)}, {crumb.lng.toFixed(4)}
              </span>
              <span className="text-gray-400">
                ±{Math.round(crumb.accuracy || 8)}m accuracy
              </span>
            </div>

            {crumb.plusCode && (
              <div className="text-[10px] font-mono text-gray-400 truncate flex items-center gap-1">
                <ShieldCheck size={10} className="text-emerald-400 flex-shrink-0" />
                <span className="truncate">{crumb.plusCode}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
