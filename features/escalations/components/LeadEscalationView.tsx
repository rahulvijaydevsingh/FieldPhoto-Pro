import React, { useState, useMemo } from 'react';
import { Photo, FollowUp, User, LeadEscalationItem } from '../../../types';
import { calculateLeadEscalations } from '../../../repositories/escalationRepository';
import EscalationCard from './EscalationCard';
import { ShieldAlert, AlertTriangle, CheckCircle2, RefreshCw, Users, Clock, Filter } from 'lucide-react';

interface LeadEscalationViewProps {
  photos: Photo[];
  followUps: FollowUp[];
  teamMembers: User[];
  onReassignFollowUp: (followUpId: string, newUserId: string) => void;
  onCompleteFollowUp: (followUpId: string) => void;
}

export default function LeadEscalationView({
  photos,
  followUps,
  teamMembers,
  onReassignFollowUp,
  onCompleteFollowUp
}: LeadEscalationViewProps) {
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const rawEscalations = useMemo(() => {
    return calculateLeadEscalations(followUps, photos, teamMembers);
  }, [followUps, photos, teamMembers]);

  const activeEscalations = useMemo(() => {
    return rawEscalations.filter(e => !resolvedIds.has(e.id) && (filterUrgency === 'all' || e.urgencyLevel === filterUrgency));
  }, [rawEscalations, resolvedIds, filterUrgency]);

  const handleReassign = (item: LeadEscalationItem, newStaffId: string) => {
    const fuId = item.id.replace('esc_', '');
    onReassignFollowUp(fuId, newStaffId);
    setResolvedIds(prev => new Set(prev).add(item.id));
  };

  const handleResolve = (item: LeadEscalationItem) => {
    const fuId = item.id.replace('esc_', '');
    onCompleteFollowUp(fuId);
    setResolvedIds(prev => new Set(prev).add(item.id));
  };

  return (
    <div className="space-y-6 text-white">
      {/* Header Banner */}
      <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3A2E2E] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Automated Lead Escalation & SLA Engine</h3>
              <p className="text-xs text-gray-400 mt-0.5">Automated detection of overdue client follow-ups exceeding SLA response thresholds</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filterUrgency}
              onChange={e => setFilterUrgency(e.target.value)}
              className="bg-[#1A1515] border border-[#3A2E2E] text-xs font-bold text-white rounded-lg px-3 py-1.5 focus:outline-none"
            >
              <option value="all">All Urgency Levels</option>
              <option value="severe">Severe (48h+ Overdue)</option>
              <option value="critical">Critical (24h+ Overdue)</option>
              <option value="warning">Warning (1h+ Overdue)</option>
            </select>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E]">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Total Active Escalations</span>
            <span className="text-2xl font-bold text-red-400">{activeEscalations.length}</span>
          </div>
          <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E]">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Severe SLA Breaches</span>
            <span className="text-2xl font-bold text-amber-400">
              {activeEscalations.filter(e => e.urgencyLevel === 'severe').length}
            </span>
          </div>
          <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E]">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Resolved Today</span>
            <span className="text-2xl font-bold text-emerald-400">{resolvedIds.size}</span>
          </div>
        </div>
      </div>

      {/* List Grid */}
      {activeEscalations.length === 0 ? (
        <div className="text-center py-16 bg-[#2D2424] rounded-xl border border-[#3A2E2E]">
          <CheckCircle2 size={42} className="mx-auto text-emerald-400 mb-3" />
          <h4 className="text-base font-bold text-white">All Follow-Up SLAs Compliant!</h4>
          <p className="text-xs text-gray-400 mt-1">No overdue lead follow-ups require escalation at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeEscalations.map((item) => (
            <EscalationCard
              key={item.id}
              item={item}
              teamMembers={teamMembers}
              onReassign={handleReassign}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}
