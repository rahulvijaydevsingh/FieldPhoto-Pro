import React from 'react';
import { RouteBreadcrumb, User } from '../../../types';
import { MapPin, Navigation, Compass, Layers, ShieldCheck } from 'lucide-react';

interface LiveRouteMapProps {
  breadcrumbs: RouteBreadcrumb[];
  selectedUser?: User;
}

export default function LiveRouteMap({ breadcrumbs, selectedUser }: LiveRouteMapProps) {
  const latestCrumb = breadcrumbs[0];

  return (
    <div className="bg-[#1A1515] border border-[#3A2E2E] rounded-xl p-4 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-[#3A2E2E] pb-3">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Compass size={16} className="text-[#D99026]" /> Territory Route Visualizer
          </h4>
          <p className="text-xs text-gray-400">
            {selectedUser ? `Tracking ${selectedUser.name}` : 'Multi-Staff Field Route Trail'}
          </p>
        </div>

        <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE GPS STREAM
        </span>
      </div>

      {/* Simulated High-Tech Tactical Map Canvas */}
      <div className="relative w-full h-72 bg-[#120E0E] rounded-xl border border-[#3A2E2E] overflow-hidden flex flex-col justify-between p-4 bg-[radial-gradient(#2D2424_1px,transparent_1px)] [background-size:16px_16px]">
        {/* Radar overlay grid */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#D99026]/5 via-transparent to-black/60 pointer-events-none" />

        {/* Top telemetry bar */}
        <div className="relative z-10 flex items-center justify-between text-xs font-mono bg-black/60 backdrop-blur-sm p-2 rounded-lg border border-white/10">
          <div className="flex items-center gap-2">
            <Navigation size={14} className="text-[#D99026]" />
            <span className="text-gray-300">Target Coordinates:</span>
            <span className="text-emerald-400 font-bold">
              {latestCrumb ? `${latestCrumb.lat.toFixed(4)}, ${latestCrumb.lng.toFixed(4)}` : '30.9010, 75.8573'}
            </span>
          </div>

          <span className="text-gray-400">
            Pings: <strong className="text-white">{breadcrumbs.length}</strong>
          </span>
        </div>

        {/* Map Center Pins Graphic */}
        <div className="relative z-10 flex flex-col items-center justify-center space-y-2 my-auto">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-[#D99026]/20 border border-[#D99026] flex items-center justify-center animate-ping absolute inset-0 opacity-75" />
            <div className="w-12 h-12 rounded-full bg-[#2D2424] border-2 border-[#D99026] flex items-center justify-center text-[#D99026] shadow-xl relative z-10">
              <MapPin size={22} />
            </div>
          </div>
          <div className="text-center font-mono">
            <span className="text-xs font-bold text-white bg-black/80 px-2 py-0.5 rounded border border-[#3A2E2E] block">
              {latestCrumb?.userName || selectedUser?.name || 'Punjab Field Territory Zone'}
            </span>
            <span className="text-[10px] text-gray-400">
              {latestCrumb?.plusCode || 'Verified GPS Breadcrumb Node'}
            </span>
          </div>
        </div>

        {/* Bottom Legend */}
        <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-gray-400 bg-black/60 p-2 rounded-lg border border-white/10">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-400" /> W3C High-Accuracy Geolocation Engine
          </span>
          <span className="text-[#D99026]">Accuracy ±8m</span>
        </div>
      </div>
    </div>
  );
}
