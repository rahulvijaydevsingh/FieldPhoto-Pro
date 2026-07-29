import React from 'react';
import { LeadEscalationItem, User } from '../../../types';
import { AlertTriangle, Clock, UserX, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface EscalationCardProps {
  item: LeadEscalationItem;
  teamMembers: User[];
  onReassign: (item: LeadEscalationItem, newStaffId: string) => void;
  onResolve: (item: LeadEscalationItem) => void;
}

export default function EscalationCard({ item, teamMembers, onReassign, onResolve }: EscalationCardProps) {
  const urgencyColor = 
    item.urgencyLevel === 'severe' ? 'border-red-500 bg-red-500/10 text-red-400' :
    item.urgencyLevel === 'critical' ? 'border-amber-500 bg-amber-500/10 text-amber-400' :
    'border-yellow-500/50 bg-yellow-500/10 text-yellow-300';

  return (
    <div className={`p-4 rounded-xl border ${urgencyColor} space-y-3 shadow-lg relative overflow-hidden transition-all hover:scale-[1.01]`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-red-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider">
            SLA Violation • {item.hoursOverdue}h Overdue
          </span>
        </div>
        <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10">
          {item.urgencyLevel}
        </span>
      </div>

      <div>
        <h4 className="font-bold text-sm text-white">{item.clientName}</h4>
        <p className="text-xs text-gray-300">{item.siteName}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs bg-black/30 p-2.5 rounded-lg border border-white/5 font-mono">
        <div>
          <span className="text-[10px] text-gray-400 uppercase block">Current Assigned</span>
          <span className="font-bold text-white">{item.assignedStaffName}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 uppercase block">Target Due Date</span>
          <span className="font-bold text-gray-300">
            {new Date(item.followUpDueDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
        <div className="flex items-center gap-1.5 flex-1">
          <UserX size={14} className="text-gray-400 flex-shrink-0" />
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onReassign(item, e.target.value);
              }
            }}
            className="bg-[#1A1515] border border-[#3A2E2E] rounded px-2 py-1 text-xs text-white focus:outline-none w-full"
          >
            <option value="" disabled>Reassign to agent...</option>
            {teamMembers
              .filter(m => m.id !== item.assignedStaffId)
              .map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
              ))}
          </select>
        </div>

        <button
          onClick={() => onResolve(item)}
          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded transition-all flex items-center gap-1 flex-shrink-0"
        >
          <CheckCircle2 size={13} />
          Resolve SLA
        </button>
      </div>
    </div>
  );
}
