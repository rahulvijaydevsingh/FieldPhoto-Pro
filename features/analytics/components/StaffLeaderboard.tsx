import React from 'react';
import { Photo, User } from '../../../types';
import { Award, ShieldCheck, MapPin, CheckCircle2 } from 'lucide-react';

interface StaffLeaderboardProps {
  photos: Photo[];
  teamMembers: User[];
}

export default function StaffLeaderboard({ photos, teamMembers }: StaffLeaderboardProps) {
  const staffStats = teamMembers.map((m) => {
    const userPhotos = photos.filter(p => p.uploadedBy === m.name || p.assignedTo === m.id);
    const verifiedGpsCount = userPhotos.filter(p => p.gps || p.site_lat).length;

    return {
      user: m,
      totalVisits: userPhotos.length,
      gpsVerified: verifiedGpsCount,
      complianceRate: userPhotos.length > 0 ? Math.round((verifiedGpsCount / userPhotos.length) * 100) : 100
    };
  }).sort((a, b) => b.totalVisits - a.totalVisits);

  return (
    <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-[#3A2E2E] pb-3">
        <div className="flex items-center gap-2">
          <Award className="text-[#D99026]" size={18} />
          <h4 className="font-bold text-sm text-white">Field Staff Productivity Leaderboard</h4>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 font-bold">Realtime Scorecard</span>
      </div>

      <div className="space-y-2.5">
        {staffStats.map((item, idx) => (
          <div
            key={item.user.id}
            className="p-3 bg-[#1A1515] border border-[#3A2E2E] rounded-xl flex items-center justify-between gap-3 hover:border-[#D99026]/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full font-bold font-mono text-xs flex items-center justify-center ${
                idx === 0 ? 'bg-[#D99026] text-black' :
                idx === 1 ? 'bg-gray-300 text-black' :
                'bg-[#2D2424] text-gray-400 border border-[#3A2E2E]'
              }`}>
                {idx + 1}
              </span>

              <div>
                <h5 className="font-bold text-xs text-white">{item.user.name}</h5>
                <span className="text-[10px] text-gray-400 capitalize">{item.user.role} Field Agent</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-right">
              <div>
                <span className="text-gray-400 block text-[10px]">Site Visits</span>
                <span className="font-bold text-white">{item.totalVisits}</span>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px]">GPS Quality</span>
                <span className="font-bold text-emerald-400">{item.complianceRate}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
