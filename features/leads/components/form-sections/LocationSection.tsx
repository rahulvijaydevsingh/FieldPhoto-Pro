import React from 'react';
import { MATERIAL_INTERESTS } from '../../../../types';
import { MapPin, Globe, CheckSquare, Square } from 'lucide-react';

interface LocationSectionProps {
  siteName: string;
  setSiteName: (val: string) => void;
  gpsString: string;
  setGpsString: (val: string) => void;
  plusCode: string;
  fetchLiveGps: () => void;
  isFetchingGps: boolean;
  constructionStage: string;
  setConstructionStage: (val: string) => void;
  constructionStages: string[];
  estimatedQuantity: string;
  setEstimatedQuantity: (val: string) => void;
  selectedMaterials: string[];
  toggleMaterial: (m: string) => void;
  labelStyle: string;
  inputStyle: (error?: boolean) => string;
  sectionHeader: (title: string, icon: any) => React.ReactNode;
}

export default function LocationSection({
  siteName,
  setSiteName,
  gpsString,
  setGpsString,
  plusCode,
  fetchLiveGps,
  isFetchingGps,
  constructionStage,
  setConstructionStage,
  constructionStages,
  estimatedQuantity,
  setEstimatedQuantity,
  selectedMaterials,
  toggleMaterial,
  labelStyle,
  inputStyle,
  sectionHeader
}: LocationSectionProps) {
  return (
    <div className="bg-[#2D2424] p-6 rounded-2xl border border-[#3A2E2E] shadow-xl">
      {sectionHeader("Step 2: Location & Site", <MapPin size={18} />)}
      <div className="space-y-4">
         <div>
            <label className={labelStyle}>Site Address *</label>
            <textarea className={`${inputStyle(!siteName)} h-20 resize-none`} placeholder="Full address..." value={siteName} onChange={e => setSiteName(e.target.value)} />
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
               <div className="flex justify-between items-center mb-1.5">
                 <label className={labelStyle}>GPS Coordinates (Lat, Lng) *</label>
                 <button
                   type="button"
                   onClick={fetchLiveGps}
                   disabled={isFetchingGps}
                   className="text-[10px] bg-field-gold/20 hover:bg-field-gold/30 text-field-gold border border-field-gold/40 px-2 py-0.5 rounded flex items-center gap-1 font-bold transition-colors"
                   title="Capture high accuracy device GPS"
                 >
                   <MapPin size={10} />
                   {isFetchingGps ? 'Locating...' : '📍 Get Live GPS'}
                 </button>
               </div>
               <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-3.5 text-field-gold" />
                  <input className={`${inputStyle()} pl-10 font-mono text-xs`} placeholder="30.901000, 75.857300" value={gpsString} onChange={e => setGpsString(e.target.value)} />
               </div>
               <p className="text-[9px] text-gray-500 mt-1 flex items-center justify-between">
                 <span>Full high-precision coordinates</span>
                 {gpsString && (
                   <a 
                     href={`https://www.google.com/maps?q=${encodeURIComponent(gpsString)}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-field-gold hover:underline flex items-center gap-1"
                   >
                     🗺️ View Map
                   </a>
                 )}
               </p>
            </div>
            <div>
               <label className={labelStyle}>Plus Code (Auto-Generated)</label>
               <div className="relative">
                  <Globe size={14} className="absolute left-3 top-3.5 text-field-gold" />
                  <input className={`${inputStyle()} pl-10 text-field-gold font-mono`} placeholder="Waiting for GPS..." value={plusCode} readOnly />
               </div>
               <p className="text-[9px] text-gray-500 mt-1">This code identifies the site location accurately in CRM.</p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Construction Stage *</label>
              <select className={inputStyle()} value={constructionStage} onChange={e => setConstructionStage(e.target.value)}>
                 {constructionStages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelStyle}>Est. Quantity (sq. ft.)</label>
              <input className={inputStyle()} placeholder="e.g. 500" value={estimatedQuantity} onChange={e => setEstimatedQuantity(e.target.value)} />
            </div>
         </div>

         <div>
            <label className={labelStyle}>Material Interests</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
               {MATERIAL_INTERESTS.map(m => (
                 <button type="button" key={m} onClick={() => toggleMaterial(m)} className={`flex items-center gap-2 p-2.5 rounded-lg border text-[10px] font-medium text-left ${selectedMaterials.includes(m) ? 'border-field-gold bg-field-gold/10 text-white' : 'border-[#3A2E2E] text-gray-500'}`}>
                   {selectedMaterials.includes(m) ? <CheckSquare size={14} className="text-field-gold" /> : <Square size={14} />}
                   {m}
                 </button>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}
