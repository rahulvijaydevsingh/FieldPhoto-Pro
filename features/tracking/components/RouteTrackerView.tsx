import React, { useState, useEffect, useMemo } from 'react';
import { User, RouteBreadcrumb } from '../../../types';
import { subscribeUserBreadcrumbs, filterBreadcrumbsByDate } from '../../../repositories/breadcrumbRepository';
import BreadcrumbTimeline from './BreadcrumbTimeline';
import LiveRouteMap from './LiveRouteMap';
import { MapPin, Users, Calendar, Navigation, Shield, RefreshCw } from 'lucide-react';

interface RouteTrackerViewProps {
  currentUser: User;
  teamMembers: User[];
  initialStaffId?: string;
}

export default function RouteTrackerView({ currentUser, teamMembers, initialStaffId }: RouteTrackerViewProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    initialStaffId || (currentUser.role === 'admin' ? 'all' : currentUser.id)
  );
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [breadcrumbs, setBreadcrumbs] = useState<RouteBreadcrumb[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync selectedStaffId state to initialStaffId prop when it changes
  useEffect(() => {
    if (initialStaffId) {
      setSelectedStaffId(initialStaffId);
    }
  }, [initialStaffId]);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeUserBreadcrumbs(selectedStaffId, (data) => {
      setBreadcrumbs(data);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedStaffId]);

  const filteredCrumbs = useMemo(() => {
    return filterBreadcrumbsByDate(breadcrumbs, selectedDate);
  }, [breadcrumbs, selectedDate]);

  const selectedStaffObj = useMemo(() => {
    return teamMembers.find(m => m.id === selectedStaffId);
  }, [teamMembers, selectedStaffId]);

  return (
    <div className="space-y-6 text-white">
      {/* Top Banner & Filters */}
      <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3A2E2E] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#D99026]/10 border border-[#D99026]/30 rounded-xl text-[#D99026]">
              <Navigation size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Live Staff Route Breadcrumb Tracker</h3>
              <p className="text-xs text-gray-400 mt-0.5">Realtime GPS route playback and breadcrumb audit trail for field personnel</p>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#1A1515] border border-[#3A2E2E] rounded-lg px-3 py-1.5 text-xs">
              <Users size={14} className="text-gray-400" />
              {currentUser.role === 'admin' ? (
                <select
                  value={selectedStaffId}
                  onChange={e => setSelectedStaffId(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#1A1515]">All Field Staff</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id} className="bg-[#1A1515]">{m.name}</option>
                  ))}
                </select>
              ) : (
                <span className="font-bold text-white">{currentUser.name}</span>
              )}
            </div>

            <div className="flex items-center gap-2 bg-[#1A1515] border border-[#3A2E2E] rounded-lg px-3 py-1.5 text-xs">
              <Calendar size={14} className="text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none font-mono"
              />
            </div>

            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="text-xs text-[#D99026] font-bold hover:underline"
              >
                Clear Date
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E]">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Total Route Pings</span>
            <span className="text-2xl font-bold text-[#D99026]">{filteredCrumbs.length}</span>
          </div>

          <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E]">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Active Staff Tracked</span>
            <span className="text-2xl font-bold text-emerald-400">
              {new Set(filteredCrumbs.map(c => c.userId)).size}
            </span>
          </div>

          <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E]">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">GPS Accuracy Standard</span>
            <span className="text-2xl font-bold text-blue-400">±8m</span>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveRouteMap breadcrumbs={filteredCrumbs} selectedUser={selectedStaffObj} />
        <BreadcrumbTimeline breadcrumbs={filteredCrumbs} />
      </div>
    </div>
  );
}
