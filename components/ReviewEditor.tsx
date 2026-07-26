
import React, { useState, useEffect, useCallback } from 'react';
import { User, Photo, FollowUp, Priority, MATERIAL_INTERESTS, PersonMet, Professional } from '../types';
import { MOCK_PROFESSIONALS } from '../services/mockData';
import { generatePlusCodeWithCitySync, generatePlusCodeWithCityAsync } from '../utils/locationUtils';
import { 
  Save, X, User as UserIcon, Users, MapPin, AlertCircle, Phone, Trash2, 
  CheckSquare, Square, Mail, Briefcase, Info, ShieldAlert, WifiOff, Search, Check, Globe,
  FileText, Bookmark, CheckCircle2, RefreshCw, AlertTriangle, Plus, Clock
} from 'lucide-react';

interface Props {
  photo: Photo;
  user: User;
  isOnline?: boolean;
  leadSources: string[];
  personTypes: string[];
  constructionStages: string[];
  existingPhotos: Photo[]; 
  teamMembers?: User[];
  onCancel: () => void;
  onDelete?: () => void;
  onSaveDraft?: (draftPhoto: Photo) => void;
  onSubmit: (photo: Photo, followUp: FollowUp) => void;
}



export default function ReviewEditor({ 
  photo, user, isOnline = true, leadSources, personTypes, constructionStages, existingPhotos, teamMembers = [], onCancel, onDelete, onSaveDraft, onSubmit 
}: Props) {
  // Load initial draft if present
  const savedDraft = (() => {
    try {
      const raw = localStorage.getItem(`draft_lead_${photo.id}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  })();

  // Resolve team members for Assign To dropdown
  const activeTeamMembers = (() => {
    if (teamMembers && teamMembers.length > 0) return teamMembers;
    try {
      const saved = localStorage.getItem('fieldops_team_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [user];
  })();

  // --- STATE MANAGEMENT ---
  
  // Group 1: Contacts (Support Multiple)
  const [peopleMet, setPeopleMet] = useState<PersonMet[]>(() => {
    if (savedDraft?.peopleMet) return savedDraft.peopleMet;
    const savedContacts = localStorage.getItem(`draft_contacts_${photo.id}`);
    if (savedContacts) return JSON.parse(savedContacts);
    return photo.peopleMet && photo.peopleMet.length > 0 
      ? photo.peopleMet
      : [{id: Math.random().toString(36).substr(2, 9), designation: 'Owner', name: '', phone: '', email: '', alternatePhone: '', firmName: ''}];
  });

  // Group 2: Site Details - Clean up raw numeric camera filenames from site address input
  const getInitialSiteName = (): string => {
    if (savedDraft?.siteName !== undefined) return savedDraft.siteName;
    const raw = photo.siteName || '';
    const isCameraOrNumeric = /^(\d+|IMG_\d+.*|\d{8}_\d+.*|\d{10,}.*|P_\d+.*|Photo_\d+.*)$/i.test(raw.trim());
    if (isCameraOrNumeric) {
      return ''; // Leave empty so staff doesn't see random numbers in Site Address
    }
    return raw;
  };

  const [siteName, setSiteName] = useState(getInitialSiteName);
  const [constructionStage, setConstructionStage] = useState(savedDraft?.constructionStage ?? photo.constructionStage ?? constructionStages[0]);
  const [estimatedQuantity, setEstimatedQuantity] = useState(savedDraft?.estimatedQuantity ?? photo.estimatedQuantity ?? '');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>(savedDraft?.materialInterests ?? photo.materialInterests ?? []);
  const [othersMaterialNote, setOthersMaterialNote] = useState(savedDraft?.othersMaterialNote ?? photo.othersMaterialNote ?? '');
  
  // GPS Handling & Live Location Fetch
  const formatGpsPrecision = (lat?: number, lng?: number) => {
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return '';
    return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
  };

  const [gpsString, setGpsString] = useState(
    savedDraft?.gpsString ?? (
      photo.site_lat !== undefined && photo.site_lng !== undefined 
        ? formatGpsPrecision(photo.site_lat, photo.site_lng) 
        : photo.gps 
          ? formatGpsPrecision(photo.gps.lat, photo.gps.lng) 
          : ''
    )
  );
  const [plusCode, setPlusCode] = useState(savedDraft?.plusCode ?? photo.plusCode ?? '');
  const [isFetchingGps, setIsFetchingGps] = useState(false);

  const fetchLiveGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const formatted = formatGpsPrecision(lat, lng);
        setGpsString(formatted);
        const syncCode = generatePlusCodeWithCitySync(lat, lng);
        setPlusCode(syncCode);
        generatePlusCodeWithCityAsync(lat, lng).then(asyncCode => {
          if (asyncCode) setPlusCode(asyncCode);
        });
        setIsFetchingGps(false);
      },
      (err) => {
        alert(`GPS fetch failed: ${err.message}. Please enter manually.`);
        setIsFetchingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Group 3: Source & Relationship - Default Lead Source to 'Field Visit'
  const defaultLeadSource = leadSources.includes('Field Visit') ? 'Field Visit' : (leadSources[0] || 'Field Visit');
  const [leadSource, setLeadSource] = useState(savedDraft?.leadSource ?? photo.leadSource ?? defaultLeadSource);
  const [customLeadSource, setCustomLeadSource] = useState(savedDraft?.customLeadSource ?? photo.customLeadSource ?? '');
  
  const [referredByProf, setReferredByProf] = useState<Professional | null>(
     savedDraft?.referredByProf ?? photo.referredBy ?? null
  );
  const [assignTo, setAssignTo] = useState(savedDraft?.assignTo ?? user.id);
  
  // Professional Search State
  const [profSearchTerm, setProfSearchTerm] = useState('');
  const [showProfResults, setShowProfResults] = useState(false);

  // Group 4: Action Trigger
  const [priority, setPriority] = useState<Priority>(savedDraft?.priority ?? photo.priority ?? 'Medium');
  const [followUpDate, setFollowUpDate] = useState(() => {
    if (savedDraft?.followUpDate) return savedDraft.followUpDate;
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState(savedDraft?.notes ?? photo.notes ?? '');

  // Background Logic & Toast States
  const [duplicateFound, setDuplicateFound] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [draftToast, setDraftToast] = useState<string | null>(null);
  const [hasRestoredDraft] = useState<boolean>(!!savedDraft || !!photo.hasDraft);

  // --- LOGIC ---

  const handleSaveDraft = (exitAfterSave = false) => {
    let site_lat, site_lng;
    if (gpsString) {
      const parts = gpsString.split(',');
      if (parts.length === 2) {
        site_lat = parseFloat(parts[0].trim());
        site_lng = parseFloat(parts[1].trim());
      }
    }

    const draftSavedAt = new Date().toISOString();

    const draftData = {
      peopleMet,
      siteName,
      constructionStage,
      estimatedQuantity,
      materialInterests: selectedMaterials,
      othersMaterialNote,
      gpsString,
      plusCode,
      leadSource,
      customLeadSource,
      referredByProf,
      assignTo,
      priority,
      followUpDate,
      notes,
      draftSavedAt
    };

    localStorage.setItem(`draft_lead_${photo.id}`, JSON.stringify(draftData));

    const updatedDraftPhoto: Photo = {
      ...photo,
      hasDraft: true,
      draftSavedAt,
      siteName: siteName || photo.siteName,
      leadSource,
      customLeadSource,
      constructionStage,
      estimatedQuantity,
      materialInterests: selectedMaterials,
      othersMaterialNote,
      priority,
      notes,
      plusCode,
      site_lat,
      site_lng,
      gps: site_lat && site_lng ? { lat: site_lat, lng: site_lng } : photo.gps,
      peopleMet: peopleMet,
      referredBy: referredByProf || undefined
    };

    if (onSaveDraft) {
      onSaveDraft(updatedDraftPhoto);
    }

    setDraftToast("Draft saved successfully! You can resume anytime.");
    setTimeout(() => setDraftToast(null), 3500);

    if (exitAfterSave) {
      onCancel();
    }
  };

  // Auto-generate Plus Code with accurate city when GPS changes
  useEffect(() => {
    if (gpsString) {
      const parts = gpsString.split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          // Fast sync Plus code calculation
          const syncCode = generatePlusCodeWithCitySync(lat, lng);
          setPlusCode(syncCode);
          // Async reverse geocode to verify exact city
          generatePlusCodeWithCityAsync(lat, lng).then(asyncCode => {
            if (asyncCode) setPlusCode(asyncCode);
          });
        }
      }
    }
  }, [gpsString]);

  // Debounced Duplicate Check
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDuplicateFound(null);
      const primaryPhone = peopleMet[0].phone.replace(/\D/g, '');
      if (primaryPhone.length >= 10) {
         const match = existingPhotos.find(ex => 
            ex.id !== photo.id && 
            ex.peopleMet?.some(exP => exP.phone.replace(/\D/g, '') === primaryPhone)
         );
         if (match) setDuplicateFound(primaryPhone);
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [peopleMet, existingPhotos, photo.id]);

  const validate = useCallback(() => {
    const newErrors: string[] = [];
    if (!peopleMet[0]?.name) newErrors.push("Primary Contact: Name is required");
    if (!peopleMet[0]?.phone || peopleMet[0].phone.length !== 10) newErrors.push("Primary Contact: 10-digit phone required");
    
    // Pro Checks
    peopleMet.forEach((p, idx) => {
      const isFilled = p.name || p.phone || p.firmName;
      if (idx > 0 && !isFilled) return; // Skip empty secondary contacts
    });

    if (!siteName) newErrors.push("Site Location: Address is required");
    if (leadSource === "Other" && !customLeadSource) newErrors.push("Source: Please specify custom source");
    if (leadSource === "Referral" && !referredByProf) newErrors.push("Source: Please select a Professional");

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [peopleMet, siteName, leadSource, customLeadSource, referredByProf]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicateFound && user.role !== 'admin') return alert("Duplicate restricted for staff.");
    if (!validate()) return;
    
    const followUpId = Math.random().toString(36).substr(2, 9);
    
    // Parse GPS for internal app map usage
    let site_lat, site_lng;
    if (gpsString) {
      const parts = gpsString.split(',');
      if (parts.length === 2) {
         site_lat = parseFloat(parts[0].trim());
         site_lng = parseFloat(parts[1].trim());
      }
    }

    const finalStatus = 'in-progress'; 
    const syncStatus = isOnline ? 'synced' : 'pending';

    const updatedPhoto: Photo = {
      ...photo,
      uploaderId: photo.uploaderId || user.id,
      uploaderName: photo.uploaderName || user.name,
      staffMember: photo.staffMember || photo.uploaderName || user.name,
      status: finalStatus, 
      syncStatus: syncStatus as any,
      hasDraft: false,
      draftSavedAt: undefined,
      siteName, leadSource, customLeadSource, constructionStage,
      estimatedQuantity, materialInterests: selectedMaterials, othersMaterialNote,
      priority, notes, 
      
      // CRM Requirement: Plus Code is primary
      plusCode: plusCode,
      
      // App Requirement: Lat/Lng for 'Map Directions' button
      site_lat, site_lng, 
      gps: site_lat && site_lng ? { lat: site_lat, lng: site_lng } : undefined,

      followUpId,
      peopleMet: peopleMet.filter(p => p.name.trim() !== ''),
      referredBy: referredByProf || undefined
    };

    const newFollowUp: FollowUp = {
      id: followUpId, photoId: photo.id, assignedToId: assignTo,
      type: 'Phone Call', date: followUpDate, notes: notes, status: 'pending'
    };

    localStorage.removeItem(`draft_lead_${photo.id}`);
    localStorage.removeItem(`draft_contacts_${photo.id}`);
    onSubmit(updatedPhoto, newFollowUp);
  };

  const toggleMaterial = (material: string) => {
    setSelectedMaterials(prev => 
      prev.includes(material) ? prev.filter(m => m !== material) : [...prev, material]
    );
  };

  const sectionHeader = (title: string, icon: any) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#3A2E2E]">
       <div className="text-field-gold">{icon}</div>
       <h3 className="font-bold text-white text-xs uppercase tracking-widest">{title}</h3>
    </div>
  );

  const inputStyle = (error?: boolean) => `w-full bg-[#1A1515] border ${error ? 'border-red-500' : 'border-[#3A2E2E]'} rounded-lg p-2.5 text-sm text-white focus:border-field-gold outline-none transition-all placeholder:text-gray-600`;
  const labelStyle = "block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1 tracking-wider";

  return (
    <div className="bg-[#1A1515] text-white flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-[#2D2424] border-b border-[#3A2E2E] flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">Smart Lead Entry</h2>
          <div className="flex items-center gap-2 mt-0.5">
             <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
             <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                {isOnline ? 'Online • Sync Ready' : 'Offline • Queueing'}
             </p>
          </div>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors"><X size={24} /></button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Floating Save Draft Toast (Near Save Draft Button) */}
          {draftToast && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-[#2D2424] border-2 border-field-gold text-field-gold px-4 py-3 rounded-2xl flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md animate-bounce-short">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-field-gold/20 flex items-center justify-center flex-shrink-0 border border-field-gold/40">
                  <CheckCircle2 size={18} className="text-field-gold" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Draft Saved Successfully!</p>
                  <p className="text-[10px] text-field-gold/80">{draftToast}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setDraftToast(null)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {hasRestoredDraft && !draftToast && (
            <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs">
              <Bookmark size={16} className="text-blue-400 flex-shrink-0" />
              <span>Restored draft saved for this lead. You can continue filling or update as needed.</span>
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-red-500/15 border-b border-red-500/30 px-4 py-2 flex items-center gap-3 rounded-lg">
               <ShieldAlert size={16} className="text-red-500" />
               <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">
                 Action Required: {errors[0]}
               </span>
            </div>
          )}

          {/* Group 1: Contact Details */}
          <div className="bg-[#2D2424] p-6 rounded-2xl border border-[#3A2E2E] shadow-xl">
            {sectionHeader("Step 1: Primary Contact", <UserIcon size={18} />)}
            <div className="space-y-6">
              {peopleMet.map((person, idx) => (
                  <div key={person.id || `contact_${idx}`} className={`space-y-4 pt-4 first:pt-0 border-t border-[#3A2E2E] first:border-0`}>
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

          {/* Group 2: Site Details */}
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

          {/* Group 3: Source */}
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
                         {member.name} {member.id === user.id ? '(Myself)' : `(${member.designation || member.role})`}
                       </option>
                     ))}
                  </select>
               </div>
            </div>
          </div>

          {/* Group 4: Action */}
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

          <div className="flex flex-wrap sm:flex-nowrap gap-3 pt-4 pb-12">
            {onDelete && (
              <button 
                type="button" 
                onClick={onDelete} 
                className="py-4 px-4 border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-widest transition-colors"
                title="Delete Upload"
              >
                <Trash2 size={18} />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
            <button type="button" onClick={onCancel} className="flex-1 py-4 border border-[#3A2E2E] rounded-xl font-bold text-gray-400 hover:bg-white/5 uppercase text-xs tracking-widest">Cancel</button>
            <button 
              type="button" 
              onClick={() => handleSaveDraft(false)} 
              className="flex-1 py-4 border border-field-gold/40 bg-field-gold/10 text-field-gold hover:bg-field-gold/20 rounded-xl font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-widest transition-all"
              title="Save progress as draft"
            >
              <FileText size={18} />
              <span>Save Draft</span>
            </button>
            <button type="submit" className="flex-[2] py-4 rounded-xl font-bold bg-field-gold text-black hover:bg-[#b57b17] flex items-center justify-center gap-3 uppercase text-xs tracking-widest shadow-lg shadow-field-gold/20">
              {isOnline ? <Save size={18} /> : <WifiOff size={18} />} {isOnline ? 'Create Lead' : 'Save Offline'}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
