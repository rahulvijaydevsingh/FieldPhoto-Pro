import React from 'react';
import { PersonMet } from '../../../../types';
import { User as UserIcon, Trash2, Phone, Briefcase } from 'lucide-react';

interface ContactSectionProps {
  peopleMet: PersonMet[];
  setPeopleMet: React.Dispatch<React.SetStateAction<PersonMet[]>>;
  personTypes: string[];
  duplicateFound: string | null;
  labelStyle: string;
  inputStyle: (error?: boolean) => string;
  sectionHeader: (title: string, icon: any) => React.ReactNode;
}

export default function ContactSection({
  peopleMet,
  setPeopleMet,
  personTypes,
  duplicateFound,
  labelStyle,
  inputStyle,
  sectionHeader
}: ContactSectionProps) {
  return (
    <div className="bg-[#2D2424] p-6 rounded-2xl border border-[#3A2E2E] shadow-xl">
      {sectionHeader("Step 1: Primary Contact", <UserIcon size={18} />)}
      <div className="space-y-6">
        {peopleMet.map((person, idx) => (
          <div key={person.id || `contact_${idx}`} className="space-y-4 pt-4 first:pt-0 border-t border-[#3A2E2E] first:border-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-field-gold uppercase tracking-wider">
                {idx === 0 ? "Primary Contact" : `Contact #${idx + 1}`}
              </span>
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => setPeopleMet(peopleMet.filter((_, pIdx) => pIdx !== idx))}
                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Trash2 size={13} /> Remove Contact
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>Designation *</label>
                <select className={inputStyle()} value={person.designation} onChange={e => {
                  const n = [...peopleMet]; n[idx].designation = e.target.value; setPeopleMet(n);
                }}>
                  {personTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelStyle}>Full Name *</label>
                <input className={inputStyle(!person.name && idx===0)} placeholder="Enter full name" value={person.name} onChange={e => {
                  const n = [...peopleMet]; n[idx].name = e.target.value; setPeopleMet(n);
                }} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>Phone (10 digits) *</label>
                <div className="relative">
                  <Phone size={14} className={`absolute left-3 top-3.5 ${duplicateFound ? 'text-red-500' : 'text-gray-600'}`} />
                  <input className={`${inputStyle(duplicateFound === person.phone)} pl-10`} placeholder="9876543210" value={person.phone} maxLength={10} onChange={e => {
                      const n = [...peopleMet]; n[idx].phone = e.target.value.replace(/\D/g,''); setPeopleMet(n);
                    }} 
                  />
                </div>
              </div>
              <div>
                 <label className={labelStyle}>Firm Name</label>
                 <div className="relative">
                    <Briefcase size={14} className="absolute left-3 top-3.5 text-gray-600" />
                    <input className={`${inputStyle()} pl-10`} placeholder="Company Name" value={person.firmName} onChange={e => {
                      const n = [...peopleMet]; n[idx].firmName = e.target.value; setPeopleMet(n);
                    }} />
                 </div>
              </div>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setPeopleMet([...peopleMet, {id: Math.random().toString(36).substr(2, 9), designation:'Owner', name:'', phone:'', email:'', alternatePhone:'', firmName:''}])} className="w-full py-3 border border-dashed border-[#3A2E2E] rounded-xl text-[10px] font-bold uppercase tracking-widest text-field-gold">
          + Add Another Contact
        </button>
      </div>
    </div>
  );
}
