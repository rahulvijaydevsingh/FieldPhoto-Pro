import React from 'react';
import { User, Professional } from '../../../../types';
import { MOCK_PROFESSIONALS } from '../../../../services/mockData';
import { Users, Search, X } from 'lucide-react';

interface SourceSectionProps {
  leadSource: string;
  setLeadSource: (val: string) => void;
  leadSources: string[];
  referredByProf: Professional | null;
  setReferredByProf: (prof: Professional | null) => void;
  profSearchTerm: string;
  setProfSearchTerm: (term: string) => void;
  showProfResults: boolean;
  setShowProfResults: (show: boolean) => void;
  assignTo: string;
  setAssignTo: (id: string) => void;
  activeTeamMembers: User[];
  labelStyle: string;
  inputStyle: (error?: boolean) => string;
  sectionHeader: (title: string, icon: any) => React.ReactNode;
}

export default function SourceSection({
  leadSource,
  setLeadSource,
  leadSources,
  referredByProf,
  setReferredByProf,
  profSearchTerm,
  setProfSearchTerm,
  showProfResults,
  setShowProfResults,
  assignTo,
  setAssignTo,
  activeTeamMembers,
  labelStyle,
  inputStyle,
  sectionHeader
}: SourceSectionProps) {
  return (
    <div className="bg-[#2D2424] p-6 rounded-2xl border border-[#3A2E2E] shadow-xl">
      {sectionHeader("Step 3: Source", <Users size={18} />)}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div>
            <label className={labelStyle}>Lead Source *</label>
            <select className={inputStyle()} value={leadSource} onChange={e => setLeadSource(e.target.value)}>
                {leadSources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {leadSource === "Referral" && (
               <div className="mt-2">
                  <label className={labelStyle}>Referred By</label>
                  {referredByProf ? (
                     <div className="flex justify-between items-center bg-field-gold/10 border border-field-gold rounded p-2">
                        <span className="text-xs text-white">{referredByProf.name}</span>
                        <button onClick={() => setReferredByProf(null)}><X size={14} /></button>
                     </div>
                  ) : (
                     <div className="relative">
                        <Search size={14} className="absolute left-3 top-3.5 text-gray-500" />
                        <input className={`${inputStyle()} pl-10`} placeholder="Search Pro..." value={profSearchTerm} onChange={e => {setProfSearchTerm(e.target.value); setShowProfResults(true);}} />
                        {showProfResults && profSearchTerm && (
                           <div className="absolute z-10 w-full bg-[#1A1515] border border-[#3A2E2E] mt-1 max-h-40 overflow-y-auto rounded shadow-lg">
                              {MOCK_PROFESSIONALS.filter(p => p.name.toLowerCase().includes(profSearchTerm.toLowerCase())).map(p => (
                                 <div key={p.id} onClick={() => {setReferredByProf(p); setShowProfResults(false); setProfSearchTerm('');}} className="p-2 hover:bg-white/10 cursor-pointer text-xs border-b border-[#3A2E2E]">{p.name}</div>
                              ))}
                           </div>
                        )}
                     </div>
                  )}
               </div>
            )}
         </div>
         <div>
            <label className={labelStyle}>Assign To</label>
            <select className={inputStyle()} value={assignTo} onChange={e => setAssignTo(e.target.value)}>
               {activeTeamMembers.map(member => (
                 <option key={member.id} value={member.id}>
                   {member.name} ({member.designation || member.role})
                 </option>
               ))}
            </select>
         </div>
      </div>
    </div>
  );
}
