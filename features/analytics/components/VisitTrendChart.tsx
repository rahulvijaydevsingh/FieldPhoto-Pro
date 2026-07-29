import React from 'react';
import { Photo } from '../../../types';
import { BarChart3, TrendingUp, CheckCircle } from 'lucide-react';

interface VisitTrendChartProps {
  photos: Photo[];
}

export default function VisitTrendChart({ photos }: VisitTrendChartProps) {
  // Group photos by stage
  const stageCounts = photos.reduce((acc, p) => {
    const stage = p.constructionStage || 'Plastering';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stages = Object.entries(stageCounts);
  const maxCount = Math.max(1, ...Object.values(stageCounts));

  return (
    <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-[#3A2E2E] pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-[#D99026]" size={18} />
          <h4 className="font-bold text-sm text-white">Construction Stage Visit Distribution</h4>
        </div>
        <span className="text-[10px] font-mono text-gray-400">Total Visits: {photos.length}</span>
      </div>

      <div className="space-y-3 pt-1">
        {stages.map(([stage, count]) => {
          const pct = Math.round((count / maxCount) * 100);
          return (
            <div key={stage} className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-300 font-bold">{stage}</span>
                <span className="text-[#D99026] font-bold">{count} visits ({Math.round((count / (photos.length || 1)) * 100)}%)</span>
              </div>
              <div className="w-full h-3 bg-[#1A1515] rounded-full overflow-hidden border border-[#3A2E2E]">
                <div 
                  className="h-full bg-gradient-to-r from-[#D99026] to-amber-300 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
