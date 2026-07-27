import React, { useState, useEffect, useCallback } from 'react';
import { User, Photo, FollowUp, Priority, PersonMet, Professional } from '../../../types';
import { updatePhoto } from '../../../factories/photoFactory';
import { generatePlusCodeWithCitySync, generatePlusCodeWithCityAsync } from '../../../utils/locationUtils';
import ContactSection from './form-sections/ContactSection';
import LocationSection from './form-sections/LocationSection';
import SourceSection from './form-sections/SourceSection';
import ActionSection from './form-sections/ActionSection';
import { 
  Save, X, ShieldAlert, CheckCircle2, Bookmark, Trash2, FileText, WifiOff 
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

  // Group 2: Site Details
  const getInitialSiteName = (): string => {
    if (savedDraft?.siteName !== undefined) return savedDraft.siteName;
    const raw = photo.siteName || '';
    const isCameraOrNumeric = /^(\d+|IMG_\d+.*|\d{8}_\d+.*|\d{10,}.*|P_\d+.*|Photo_\d+.*)$/i.test(raw.trim());
    if (isCameraOrNumeric) {
      return '';
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

  // Group 3: Source & Relationship
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

  // UI Toast States
  const [errors, setErrors] = useState<string[]>([]);
  const [duplicateFound, setDuplicateFound] = useState<string | null>(null);
  const [draftToast, setDraftToast] = useState<string | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(!!savedDraft);

  // Save Progress as Draft (Without Validation / Submission)
  const handleSaveDraft = (exitAfterSave = false) => {
    let site_lat, site_lng;
    if (gpsString) {
      const parts = gpsString.split(',');
      if (parts.length === 2) {
        site_lat = parseFloat(parts[0].trim());
        site_lng = parseFloat(parts[1].trim());
      }
    }

    const draftData = {
      siteName, leadSource, customLeadSource, constructionStage,
      estimatedQuantity, materialInterests: selectedMaterials, othersMaterialNote,
      priority, notes, plusCode, gpsString, followUpDate, assignTo,
      peopleMet, referredByProf, savedAt: new Date().toISOString()
    };

    localStorage.setItem(`draft_lead_${photo.id}`, JSON.stringify(draftData));
    localStorage.setItem(`draft_contacts_${photo.id}`, JSON.stringify(peopleMet));

    const updatedDraftPhoto = {
      ...photo,
      hasDraft: true,
      draftSavedAt: new Date().toISOString(),
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
          const syncCode = generatePlusCodeWithCitySync(lat, lng);
          setPlusCode(syncCode);
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

    const updatedPhoto = updatePhoto(photo, {
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
      
      plusCode: plusCode,
      site_lat, site_lng, 
      gps: site_lat && site_lng ? { lat: site_lat, lng: site_lng } : undefined,

      followUpId,
      peopleMet: peopleMet.filter(p => p.name.trim() !== ''),
      referredBy: referredByProf || undefined
    });

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
          
          {/* Toast */}
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

          {/* Form Sections */}
          <ContactSection 
            peopleMet={peopleMet}
            setPeopleMet={setPeopleMet}
            personTypes={personTypes}
            duplicateFound={duplicateFound}
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            sectionHeader={sectionHeader}
          />

          <LocationSection 
            siteName={siteName}
            setSiteName={setSiteName}
            gpsString={gpsString}
            setGpsString={setGpsString}
            plusCode={plusCode}
            fetchLiveGps={fetchLiveGps}
            isFetchingGps={isFetchingGps}
            constructionStage={constructionStage}
            setConstructionStage={setConstructionStage}
            constructionStages={constructionStages}
            estimatedQuantity={estimatedQuantity}
            setEstimatedQuantity={setEstimatedQuantity}
            selectedMaterials={selectedMaterials}
            toggleMaterial={toggleMaterial}
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            sectionHeader={sectionHeader}
          />

          <SourceSection 
            leadSource={leadSource}
            setLeadSource={setLeadSource}
            leadSources={leadSources}
            referredByProf={referredByProf}
            setReferredByProf={setReferredByProf}
            profSearchTerm={profSearchTerm}
            setProfSearchTerm={setProfSearchTerm}
            showProfResults={showProfResults}
            setShowProfResults={setShowProfResults}
            assignTo={assignTo}
            setAssignTo={setAssignTo}
            activeTeamMembers={activeTeamMembers}
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            sectionHeader={sectionHeader}
          />

          <ActionSection 
            priority={priority}
            setPriority={setPriority}
            followUpDate={followUpDate}
            setFollowUpDate={setFollowUpDate}
            notes={notes}
            setNotes={setNotes}
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            sectionHeader={sectionHeader}
          />

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
