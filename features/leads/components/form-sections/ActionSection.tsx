import React from 'react';
import { Priority } from '../../../../types';
import { AlertCircle } from 'lucide-react';

interface ActionSectionProps {
  priority: Priority;
  setPriority: (val: Priority) => void;
  followUpDate: string;
  setFollowUpDate: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  labelStyle: string;
  inputStyle: (error?: boolean) => string;
  sectionHeader: (title: string, icon: any) => React.ReactNode;
}

export default function ActionSection({
  priority,
  setPriority,
  followUpDate,
  setFollowUpDate,
  notes,
  setNotes,
  labelStyle,
  inputStyle,
  sectionHeader
}: ActionSectionProps) {
  return (
    <div className="bg-[#2D2424] p-6 rounded-2xl border border-field-gold/30">
      {sectionHeader("Step 4: Action Plan", <AlertCircle size={18} />)}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div>
            <label className={labelStyle}>Follow-up Priority</label>
            <select className={inputStyle()} value={priority} onChange={e => setPriority(e.target.value as Priority)}>
               <option value="High">High</option>
               <option value="Medium">Medium</option>
               <option value="Low">Low</option>
            </select>
         </div>
         <div>
            <label className={labelStyle}>Next Action Date</label>
            <input type="datetime-local" className={inputStyle()} value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
         </div>
      </div>
      <div className="mt-4">
         <label className={labelStyle}>Initial Note</label>
         <textarea className={`${inputStyle()} h-16`} placeholder="Instructions..." value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
    </div>
  );
}
