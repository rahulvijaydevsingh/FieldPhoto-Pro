import React, { useMemo } from 'react';
import { Photo, FollowUp, User, KPIStats } from '../../../types';
import VisitTrendChart from './VisitTrendChart';
import StaffLeaderboard from './StaffLeaderboard';
import ExecutiveReportGenerator from './ExecutiveReportGenerator';
import { BarChart3, Activity, ShieldCheck, Clock, Users, ArrowUpRight, Percent } from 'lucide-react';

interface AnalyticsDashboardViewProps {
  photos: Photo[];
  followUps: FollowUp[];
  teamMembers: User[];
}

export default function AnalyticsDashboardView({ photos, followUps, teamMembers }: AnalyticsDashboardViewProps) {
  const kpiStats = useMemo<KPIStats>(() => {
    const verifiedGps = photos.filter(p => p.gps || p.site_lat).length;
    const wonLeads = photos.filter(p => p.status === 'won').length;
    const conversionRate = photos.length > 0 ? Math.round((wonLeads / photos.length) * 100) : 0;
    const overdueCount = followUps.filter(f => f.status === 'overdue' || (f.status === 'pending' && new Date(f.dueDate || f.date) < new Date())).length;

    return {
      totalVisits: photos.length,
      verifiedGpsVisits: verifiedGps,
      conversionRate,
      overdueFollowUps: overdueCount,
      activeFieldStaffCount: teamMembers.length,
      totalGeofenceCrossings: photos.length * 2 + 14
    };
  }, [photos, followUps, teamMembers]);

  return (
    <div className="space-y-6 text-white">
      {/* Top Banner */}
      <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-[#3A2E2E] pb-4">
          <div className="p-3 bg-[#D99026]/10 border border-[#D99026]/30 rounded-xl text-[#D99026]">
            <BarChart3 size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Executive Field Operations & SLA Analytics</h3>
            <p className="text-xs text-gray-400 mt-0.5">Realtime KPI telemetry, field staff productivity scorecards, and conversion analytics</p>
          </div>
        </div>

        {/* Executive KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#1A1515] p-3.5 rounded-xl border border-[#3A2E2E] space-y-1">
            <span className="text-[10px] font-mono uppercase text-gray-400 font-bold block">Total Field Site Visits</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-[#D99026]">{kpiStats.totalVisits}</span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-0.5">
                <ArrowUpRight size={12} /> +18%
              </span>
            </div>
          </div>

          <div className="bg-[#1A1515] p-3.5 rounded-xl border border-[#3A2E2E] space-y-1">
            <span className="text-[10px] font-mono uppercase text-gray-400 font-bold block">GPS Verification Rate</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-emerald-400">
                {photos.length > 0 ? Math.round((kpiStats.verifiedGpsVisits / photos.length) * 100) : 100}%
              </span>
              <ShieldCheck size={16} className="text-emerald-400" />
            </div>
          </div>

          <div className="bg-[#1A1515] p-3.5 rounded-xl border border-[#3A2E2E] space-y-1">
            <span className="text-[10px] font-mono uppercase text-gray-400 font-bold block">Lead Conversion Rate</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-blue-400">{kpiStats.conversionRate}%</span>
              <Percent size={16} className="text-blue-400" />
            </div>
          </div>

          <div className="bg-[#1A1515] p-3.5 rounded-xl border border-[#3A2E2E] space-y-1">
            <span className="text-[10px] font-mono uppercase text-gray-400 font-bold block">Overdue Follow-Up SLA</span>
            <div className="flex items-baseline justify-between">
              <span className={`text-2xl font-bold ${kpiStats.overdueFollowUps > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {kpiStats.overdueFollowUps}
              </span>
              <Clock size={16} className={kpiStats.overdueFollowUps > 0 ? 'text-red-400' : 'text-emerald-400'} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VisitTrendChart photos={photos} />
        <StaffLeaderboard photos={photos} teamMembers={teamMembers} />
      </div>

      {/* Executive Report Exporter */}
      <ExecutiveReportGenerator photos={photos} followUps={followUps} teamMembers={teamMembers} />
    </div>
  );
}
