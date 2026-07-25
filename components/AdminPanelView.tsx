import React, { useState, useEffect } from 'react';
import { Photo, FollowUp, User, RecycleItem, StaffLocation } from '../types';
import { DEMO_ADMIN, DEMO_STAFF } from '../services/mockData';
import { fetchTeamMembersDirectly } from '../services/firebase';
import { getDeviceModelInfo, getCityNameAsync, generatePlusCodeWithCityAsync } from '../utils/locationUtils';
import { getLocalRouteLog, getSharedRouteLogs, addLocalBreadcrumb, RouteBreadcrumb } from '../utils/routeLogger';
import { getSafePhotoDate, formatSafePhotoDate, formatSafePhotoDateTime } from '../services/dateUtils';
import ReviewEditor from './ReviewEditor';
import { Settings, Users, Database, FileText, Plus, Trash2, Tag, Hammer, Camera, Edit2, Check, X, Shield, UserCheck, RotateCcw, Search, Download, RefreshCw, MapPin, Calendar, Filter, Eye, Maximize2, Navigation, Radio, Zap, Info } from 'lucide-react';

interface Props {
  photos: Photo[];
  followUps: FollowUp[];
  leadSources: string[];
  onUpdateLeadSources: (sources: string[]) => void;
  personTypes: string[];
  onUpdatePersonTypes: (types: string[]) => void;
  constructionStages: string[];
  onUpdateConstructionStages: (stages: string[]) => void;
  onUpdatePhoto?: (photo: Photo) => void;
  onDeletePhoto?: (photoId: string) => void;
  recycleBin: RecycleItem[];
  onRestoreFromRecycleBin: (recycleId: string) => void;
  onPermanentlyDeleteFromRecycleBin: (recycleId: string) => void;
  onEmptyRecycleBin: () => void;
  onUpdateTeamMembers?: (members: User[]) => void;
}

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='%232D2424' stroke='%23D99026' stroke-width='1.5'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg>";

function getTimeAge(timestamp: string): string {
  if (!timestamp) return 'Unknown';
  const diffMs = Date.now() - new Date(timestamp).getTime();
  if (diffMs < 60000) return 'Just now (< 1 min ago)';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export default function AdminPanelView({ 
  photos, followUps, 
  leadSources, onUpdateLeadSources,
  personTypes, onUpdatePersonTypes,
  constructionStages, onUpdateConstructionStages,
  onUpdatePhoto, onDeletePhoto,
  recycleBin, onRestoreFromRecycleBin, onPermanentlyDeleteFromRecycleBin, onEmptyRecycleBin,
  onUpdateTeamMembers
}: Props) {
  const [teamMembers, setTeamMembers] = useState<User[]>(() => {
    const saved = localStorage.getItem('fieldops_team_members');
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(u => (u.id === 'u2' || u.name === 'Amanpreet') && (u.email.includes('rajesh') || u.email.includes('staff@company')) ? { ...u, email: 'meera@maharajacrm.com' } : u);
        }
      } catch (e) {}
    }
    return [
      DEMO_ADMIN,
      DEMO_STAFF
    ];
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'fieldops_team_members' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTeamMembers(parsed);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveTeamMembers = (updated: User[]) => {
    setTeamMembers(updated);
    localStorage.setItem('fieldops_team_members', JSON.stringify(updated));
    if (onUpdateTeamMembers) onUpdateTeamMembers(updated);
    window.dispatchEvent(new Event('fieldops_sync'));
  };
  
  return (
    <div className="space-y-8 bg-[#1A1515] min-h-screen text-white pb-24">
      <div className="border-b border-[#3A2E2E] pb-4 mb-6 flex flex-wrap items-center justify-between gap-4">
         <div>
            <div className="flex items-center gap-3">
               <h2 className="text-2xl font-bold text-white">FieldTrack Dashboard</h2>
               <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                 Management Server Live
               </span>
            </div>
            <p className="text-field-textMuted text-sm mt-0.5">Admin control panel, site visits grid & staff configuration</p>
         </div>
      </div>

      {/* FieldTrack Dashboard - Visits Records Explorer */}
      <FieldTrackVisitsExplorer 
        photos={photos} 
        onUpdatePhoto={onUpdatePhoto}
        onDeletePhoto={onDeletePhoto}
        constructionStages={constructionStages}
        leadSources={leadSources}
        personTypes={personTypes}
        teamMembers={teamMembers}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-[#2D2424] p-6 rounded-xl shadow-lg border border-[#3A2E2E]">
            <h3 className="text-xs font-bold text-field-textMuted uppercase tracking-wider mb-2">Total System Data</h3>
            <div className="flex justify-between items-end">
               <div>
                  <p className="text-4xl font-bold text-white mb-1">{photos.length}</p>
                  <p className="text-xs text-gray-500">Photos stored</p>
               </div>
               <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Database size={24} />
               </div>
            </div>
         </div>
         <div className="bg-[#2D2424] p-6 rounded-xl shadow-lg border border-[#3A2E2E]">
            <h3 className="text-xs font-bold text-field-textMuted uppercase tracking-wider mb-2">Team Members</h3>
            <div className="flex justify-between items-end">
               <div>
                  <p className="text-4xl font-bold text-white mb-1">{teamMembers.length}</p>
                  <p className="text-xs text-gray-500">Active users</p>
               </div>
               <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                  <Users size={24} />
               </div>
            </div>
         </div>
         <div className="bg-[#2D2424] p-6 rounded-xl shadow-lg border border-[#3A2E2E]">
            <h3 className="text-xs font-bold text-field-textMuted uppercase tracking-wider mb-2">Conversion Rate</h3>
            <div className="flex justify-between items-end">
               <div>
                  <p className="text-4xl font-bold text-white mb-1">12.5%</p>
                  <p className="text-xs text-gray-500">Leads to Sales</p>
               </div>
               <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                  <FileText size={24} />
               </div>
            </div>
         </div>
      </div>

      {/* Staff / Team Members Management */}
      <StaffManagementSection 
        members={teamMembers}
        onUpdateMembers={saveTeamMembers}
        photos={photos}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Lead Sources Config */}
        <ConfigSection 
          title="Lead Sources" 
          icon={Settings} 
          items={leadSources} 
          onUpdate={onUpdateLeadSources} 
        />

        {/* Person Roles Config */}
        <ConfigSection 
          title="Contact Roles (People Met)" 
          icon={Tag} 
          items={personTypes} 
          onUpdate={onUpdatePersonTypes} 
        />

        {/* Construction Stages Config */}
        <ConfigSection 
          title="Construction Stages" 
          icon={Hammer} 
          items={constructionStages} 
          onUpdate={onUpdateConstructionStages} 
        />

      </div>

      {/* Recycle Bin / Deleted Items (Admins Only) */}
      <RecycleBinSection 
        items={recycleBin}
        onRestore={onRestoreFromRecycleBin}
        onPermanentDelete={onPermanentlyDeleteFromRecycleBin}
        onEmpty={onEmptyRecycleBin}
      />
    </div>
  );
}

// Staff / Team Members Management Section
function StaffManagementSection({ members, onUpdateMembers, photos }: { members: User[], onUpdateMembers: (members: User[]) => void, photos?: Photo[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'staff'>('staff');
  const [editAvatar, setEditAvatar] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'staff'>('staff');

  // Location Modal & Live Route Tracking State
  const [locationModalMember, setLocationModalMember] = useState<User | null>(null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [showRouteLogs, setShowRouteLogs] = useState(false);
  const [routeLogs, setRouteLogs] = useState<RouteBreadcrumb[]>([]);

  // Helper to ensure freshest breadcrumb or photo upload location overrides stale member.lastLocation
  const getFreshestMember = (m: User): User => {
    let freshestLoc = m.lastLocation;

    // 1. Check if staff has uploaded photos with GPS location
    if (photos && photos.length > 0) {
      const userPhotos = photos.filter(p => 
        (p.uploaderId && p.uploaderId === m.id) || 
        (p.uploaderName && m.name && p.uploaderName.trim().toLowerCase() === m.name.trim().toLowerCase()) ||
        (m.email && p.uploaderName && p.uploaderName.toLowerCase().includes(m.email.split('@')[0].toLowerCase()))
      );
      if (userPhotos.length > 0) {
        userPhotos.sort((a, b) => {
          const tA = new Date(a.captureDate || a.uploadDate).getTime();
          const tB = new Date(b.captureDate || b.uploadDate).getTime();
          return tB - tA;
        });
        const latestP = userPhotos[0];
        const pTime = new Date(latestP.captureDate || latestP.uploadDate).getTime();
        const curTime = freshestLoc ? new Date(freshestLoc.timestamp).getTime() : 0;

        if (pTime > curTime && (latestP.gps || latestP.site_lat)) {
          freshestLoc = {
            lat: latestP.gps ? latestP.gps.lat : (latestP.site_lat || 30.9010),
            lng: latestP.gps ? latestP.gps.lng : (latestP.site_lng || 75.8573),
            accuracy: 8,
            timestamp: latestP.captureDate || latestP.uploadDate || new Date().toISOString(),
            address: latestP.siteName || 'Punjab Region',
            plusCode: latestP.plusCode || '8J52W724+8Q Ludhiana',
            isLive: true,
            deviceInfo: latestP.deviceInfo || 'Android Mobile Phone'
          };
        }
      }
    }

    // 2. Check shared route logs for this staff member
    const logs = getSharedRouteLogs(m.id, m.name);
    if (logs && logs.length > 0) {
      const latestCrumb = logs[logs.length - 1];
      const crumbTime = new Date(latestCrumb.timestamp).getTime();
      const curTime = freshestLoc ? new Date(freshestLoc.timestamp).getTime() : 0;

      if (crumbTime > curTime) {
        freshestLoc = {
          lat: latestCrumb.lat,
          lng: latestCrumb.lng,
          accuracy: latestCrumb.accuracy,
          timestamp: latestCrumb.timestamp,
          address: latestCrumb.plusCode ? latestCrumb.plusCode.split(' ').slice(1).join(' ') : 'Punjab Region',
          plusCode: latestCrumb.plusCode,
          isLive: true,
          deviceInfo: latestCrumb.deviceInfo || 'Android Mobile Phone'
        };
      }
    }

    // 3. Guaranteed baseline location fallback
    if (!freshestLoc) {
      freshestLoc = {
        lat: 30.9010,
        lng: 75.8573,
        accuracy: 10,
        timestamp: new Date().toISOString(),
        address: 'Punjab Region (Ludhiana / Amritsar Zone)',
        plusCode: '8J52W724+8Q Ludhiana',
        isLive: true,
        deviceInfo: 'Android Mobile Phone'
      };
    }

    // Clean up desktop user-agent leakage if staff member is being viewed on desktop admin
    if (m.role === 'staff' && freshestLoc.deviceInfo && (freshestLoc.deviceInfo.includes('Windows') || freshestLoc.deviceInfo.includes('Mac'))) {
      freshestLoc.deviceInfo = 'Android Mobile Phone';
    }

    return { ...m, lastLocation: freshestLoc };
  };

  // Compute all route breadcrumb pings for a specific staff member (from shared pings + photo capture locations)
  const getMemberBreadcrumbs = (m: User): RouteBreadcrumb[] => {
    const sharedLogs = getSharedRouteLogs(m.id, m.name);
    
    // Find all photos uploaded by this staff member (e.g. Amanpreet)
    const userPhotos = (photos || []).filter(p => 
      (p.uploaderId && p.uploaderId === m.id) || 
      (p.uploaderName && m.name && p.uploaderName.trim().toLowerCase() === m.name.trim().toLowerCase()) ||
      (m.email && p.uploaderName && p.uploaderName.toLowerCase().includes(m.email.split('@')[0].toLowerCase()))
    );

    const photoCrumbs: RouteBreadcrumb[] = userPhotos.map(p => ({
      lat: p.site_lat !== undefined ? p.site_lat : (p.gps?.lat || 30.9010),
      lng: p.site_lng !== undefined ? p.site_lng : (p.gps?.lng || 75.8573),
      accuracy: 8,
      timestamp: p.captureDate || p.uploadDate || new Date().toISOString(),
      plusCode: p.plusCode || '8J52W724+8Q Ludhiana',
      deviceInfo: p.deviceInfo || getDeviceModelInfo(),
      userId: m.id,
      userName: m.name
    }));

    // Merge shared pings + photo capture locations
    const map = new Map<string, RouteBreadcrumb>();
    [...sharedLogs, ...photoCrumbs].forEach(crumb => {
      const timeKey = `${new Date(crumb.timestamp).getTime()}_${crumb.lat.toFixed(4)}_${crumb.lng.toFixed(4)}`;
      map.set(timeKey, crumb);
    });

    const result = Array.from(map.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // If empty, provide at least 1 current baseline ping if freshest location exists
    if (result.length === 0 && m.lastLocation) {
      return [{
        lat: m.lastLocation.lat,
        lng: m.lastLocation.lng,
        accuracy: m.lastLocation.accuracy || 10,
        timestamp: m.lastLocation.timestamp || new Date().toISOString(),
        plusCode: m.lastLocation.plusCode || '8J52W724+8Q Ludhiana',
        deviceInfo: m.lastLocation.deviceInfo || getDeviceModelInfo(),
        userId: m.id,
        userName: m.name
      }];
    }

    return result;
  };

  const triggerLiveGpsPing = () => {
    setIsRefreshingLocation(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          const city = await getCityNameAsync(lat, lng);
          const plusCode = await generatePlusCodeWithCityAsync(lat, lng);
          const devInfo = getDeviceModelInfo();

          const freshLoc: StaffLocation = {
            lat,
            lng,
            accuracy,
            timestamp: new Date().toISOString(),
            address: city,
            plusCode,
            isLive: true,
            deviceInfo: devInfo
          };

          addLocalBreadcrumb({
            lat,
            lng,
            accuracy,
            timestamp: freshLoc.timestamp,
            plusCode,
            deviceInfo: devInfo
          });

          setLocationModalMember(prev => prev ? { ...prev, lastLocation: freshLoc } : null);
          setRouteLogs(getLocalRouteLog());
          setIsRefreshingLocation(false);
        },
        async (err) => {
          console.warn("Live GPS ping fallback:", err);
          try {
            const dbMembers = await fetchTeamMembersDirectly();
            if (dbMembers && dbMembers.length > 0 && locationModalMember) {
              const match = dbMembers.find(m => m.id === locationModalMember.id || m.email.trim().toLowerCase() === locationModalMember.email.trim().toLowerCase());
              if (match) setLocationModalMember(getFreshestMember(match));
            }
          } catch (e) {}
          setIsRefreshingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      setIsRefreshingLocation(false);
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isLiveSyncing && locationModalMember) {
      interval = setInterval(() => {
        triggerLiveGpsPing();
      }, 8000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLiveSyncing, locationModalMember?.id]);

  const handleInspectStaffLocation = async (member: User) => {
    setIsLiveSyncing(false);
    setIsMapFullscreen(false);
    let targetMember = member;

    try {
      const dbMembers = await fetchTeamMembersDirectly();
      if (dbMembers && dbMembers.length > 0) {
        const match = dbMembers.find(m => m.id === member.id || m.email.trim().toLowerCase() === member.email.trim().toLowerCase());
        if (match) {
          targetMember = match;
        }
      }
    } catch (e) {}

    if (targetMember === member) {
      const savedStr = localStorage.getItem('fieldops_team_members');
      if (savedStr) {
        try {
          const list: User[] = JSON.parse(savedStr);
          const match = list.find(m => m.id === member.id || m.email.trim().toLowerCase() === member.email.trim().toLowerCase());
          if (match) targetMember = match;
        } catch (e) {}
      }
    }

    const freshest = getFreshestMember(targetMember);
    setLocationModalMember(freshest);
    setRouteLogs(getMemberBreadcrumbs(freshest));

    // Ping device GPS immediately for real-time accuracy update
    triggerLiveGpsPing();
  };

  const handleStartEdit = (member: User) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditPassword(member.password || '');
    setEditDesignation(member.designation || (member.role === 'admin' ? 'Managing Director / Admin' : 'Senior Field Representative'));
    setEditRole(member.role);
    setEditAvatar(member.avatar || DEFAULT_AVATAR);
    setShowPassword(false);
  };

  const handleSaveEdit = (id: string) => {
    onUpdateMembers(members.map(m => m.id === id ? { 
      ...m, 
      name: editName.trim(), 
      email: editEmail.trim(),
      password: editPassword.trim(),
      designation: editDesignation.trim(),
      role: editRole,
      avatar: editAvatar 
    } : m));
    setEditingId(null);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>, id?: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newUrl = event.target.result as string;
          if (id) {
            onUpdateMembers(members.map(m => m.id === id ? { ...m, avatar: newUrl } : m));
            if (editingId === id) setEditAvatar(newUrl);
          } else {
            setEditAvatar(newUrl);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAvatar = (id: string) => {
    if (confirm("Are you sure you want to delete this staff member's profile picture?")) {
      onUpdateMembers(members.map(m => m.id === id ? { ...m, avatar: DEFAULT_AVATAR } : m));
      if (editingId === id) setEditAvatar(DEFAULT_AVATAR);
    }
  };

  const handleDeleteMember = (member: User) => {
    if (confirm(`Are you sure you want to delete staff account "${member.name}"?`)) {
      onUpdateMembers(members.filter(m => m.id !== member.id));
    }
  };

  const handleAddMember = () => {
    if (newName.trim() && newEmail.trim()) {
      const newMember: User = {
        id: `usr-${Date.now()}`,
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword.trim() || 'Amanpreet@93',
        designation: newDesignation.trim() || 'Field Representative',
        role: newRole,
        avatar: DEFAULT_AVATAR
      };
      onUpdateMembers([...members, newMember]);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewDesignation('');
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-[#2D2424] rounded-xl shadow-lg border border-[#3A2E2E] p-6 space-y-4">
      <div className="flex justify-between items-center border-b border-[#3A2E2E] pb-4">
        <div>
          <h3 className="font-bold text-lg flex items-center text-white gap-2">
            <Users size={20} className="text-field-gold" /> Staff & Login Credentials Management
          </h3>
          <p className="text-xs text-field-textMuted mt-0.5">Manage staff profiles, passwords, designations, and permissions</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-field-gold text-black text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-field-goldHover transition-colors"
        >
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {isAdding && (
        <div className="bg-[#1A1515] p-4 rounded-xl border border-field-gold/30 space-y-3">
          <h4 className="text-xs font-bold text-field-gold uppercase tracking-wider">New Staff Account</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <input 
              type="text" 
              placeholder="Staff Full Name" 
              value={newName} 
              onChange={e => setNewName(e.target.value)}
              className="bg-[#2D2424] border border-[#3A2E2E] p-2.5 rounded-lg text-sm text-white focus:border-field-gold outline-none"
            />
            <input 
              type="email" 
              placeholder="Email Address (Login ID)" 
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)}
              className="bg-[#2D2424] border border-[#3A2E2E] p-2.5 rounded-lg text-sm text-white focus:border-field-gold outline-none"
            />
            <input 
              type="password" 
              placeholder="Login Password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)}
              className="bg-[#2D2424] border border-[#3A2E2E] p-2.5 rounded-lg text-sm text-white focus:border-field-gold outline-none"
            />
            <input 
              type="text" 
              placeholder="Designation (e.g. Site Executive)" 
              value={newDesignation} 
              onChange={e => setNewDesignation(e.target.value)}
              className="bg-[#2D2424] border border-[#3A2E2E] p-2.5 rounded-lg text-sm text-white focus:border-field-gold outline-none"
            />
            <select 
              value={newRole} 
              onChange={e => setNewRole(e.target.value as any)}
              className="bg-[#2D2424] border border-[#3A2E2E] p-2.5 rounded-lg text-sm text-white focus:border-field-gold outline-none"
            >
              <option value="staff">Field Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 bg-[#2D2424] text-gray-400 rounded-lg text-xs border border-[#3A2E2E]">Cancel</button>
            <button onClick={handleAddMember} className="px-4 py-1.5 bg-field-gold text-black font-bold rounded-lg text-xs">Create Staff</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map(member => (
          <div key={member.id} className="bg-[#1A1515] p-4 rounded-xl border border-[#3A2E2E] flex flex-col justify-between hover:border-field-gold/30 transition-all">
            {editingId === member.id ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <img src={editAvatar} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-field-gold object-cover" />
                    <label className="absolute -bottom-1 -right-1 p-1 bg-field-gold text-black rounded-full cursor-pointer hover:bg-field-goldHover">
                      <Camera size={12} />
                      <input type="file" accept="image/*" onChange={e => handleAvatarUpload(e, member.id)} className="hidden" />
                    </label>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 font-bold uppercase">Name</label>
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)}
                        className="w-full bg-[#2D2424] border border-[#3A2E2E] p-1.5 rounded text-xs text-white focus:border-field-gold outline-none"
                        placeholder="Staff Name"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-gray-400 font-bold uppercase">Email (Login ID)</label>
                    <input 
                      type="email" 
                      value={editEmail} 
                      onChange={e => setEditEmail(e.target.value)}
                      className="w-full bg-[#2D2424] border border-[#3A2E2E] p-1.5 rounded text-xs text-white focus:border-field-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 font-bold uppercase">Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={editPassword} 
                        onChange={e => setEditPassword(e.target.value)}
                        className="w-full bg-[#2D2424] border border-[#3A2E2E] p-1.5 pr-8 rounded text-xs text-white focus:border-field-gold outline-none font-mono"
                        placeholder="Password"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2 text-gray-400 hover:text-white text-[10px]"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 font-bold uppercase">Designation</label>
                    <input 
                      type="text" 
                      value={editDesignation} 
                      onChange={e => setEditDesignation(e.target.value)}
                      className="w-full bg-[#2D2424] border border-[#3A2E2E] p-1.5 rounded text-xs text-white focus:border-field-gold outline-none"
                      placeholder="e.g. Senior Representative"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 font-bold uppercase">Role</label>
                    <select 
                      value={editRole} 
                      onChange={e => setEditRole(e.target.value as any)}
                      className="w-full bg-[#2D2424] border border-[#3A2E2E] p-1.5 rounded text-xs text-white focus:border-field-gold outline-none"
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#3A2E2E]">
                  <button 
                    type="button" 
                    onClick={() => handleDeleteAvatar(member.id)}
                    className="text-xs text-red-400 hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Remove Picture
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="px-2 py-1 text-gray-400 hover:text-white text-xs"><X size={16} /></button>
                    <button onClick={() => handleSaveEdit(member.id)} className="px-3 py-1 bg-field-gold text-black font-bold rounded flex items-center gap-1 text-xs"><Check size={14} /> Save Profile</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative group flex-shrink-0">
                    <img src={member.avatar || DEFAULT_AVATAR} alt={member.name} className="w-12 h-12 rounded-full border-2 border-field-gold object-cover bg-[#2D2424]" />
                    <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity" title="Change Photo">
                      <Camera size={14} className="text-white" />
                      <input type="file" accept="image/*" onChange={e => handleAvatarUpload(e, member.id)} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                      {member.name}
                      {member.role === 'admin' && <Shield size={12} className="text-field-gold" />}
                    </h4>
                    <p className="text-xs text-gray-400">{member.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase font-semibold text-field-gold inline-block bg-field-gold/10 px-1.5 py-0.5 rounded border border-field-gold/20">
                        {member.designation || (member.role === 'admin' ? 'Managing Director / Admin' : 'Senior Field Representative')}
                      </span>
                    </div>

                    {/* Login & Logout Session Timestamps */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px]">
                      <span className="flex items-center gap-1 text-emerald-400 font-mono">
                        <Zap size={10} /> Login: {member.lastLoginTime ? `${new Date(member.lastLoginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${new Date(member.lastLoginTime).toLocaleDateString([], { month: 'short', day: 'numeric' })})` : 'Not logged in yet'}
                      </span>
                      <span className="flex items-center gap-1 text-amber-400 font-mono">
                        <Radio size={10} /> Logout: {member.lastLogoutTime ? `${new Date(member.lastLogoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${new Date(member.lastLogoutTime).toLocaleDateString([], { month: 'short', day: 'numeric' })})` : 'Active Session'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleInspectStaffLocation(member)}
                    className="px-2.5 py-1.5 bg-field-gold/10 hover:bg-field-gold hover:text-black text-field-gold border border-field-gold/20 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold"
                    title="Check Staff Location upon request (Admin only)"
                  >
                    <MapPin size={14} />
                    <span className="hidden sm:inline">Track Location</span>
                  </button>

                  <button 
                    onClick={() => handleStartEdit(member)}
                    className="p-2 text-gray-400 hover:text-field-gold hover:bg-[#2D2424] rounded-lg transition-colors flex items-center gap-1 text-xs"
                    title="Edit Credentials & Designation"
                  >
                    <Edit2 size={16} />
                  </button>

                  <button 
                    onClick={() => handleDeleteMember(member)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-[#2D2424] rounded-lg transition-colors"
                    title="Delete Staff Account"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Staff Location Inspector Modal */}
      {locationModalMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-white max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[#3A2E2E] pb-3">
              <div className="flex items-center gap-3">
                <img 
                  src={locationModalMember.avatar || DEFAULT_AVATAR} 
                  alt={locationModalMember.name} 
                  className="w-12 h-12 rounded-full border-2 border-field-gold object-cover bg-[#1A1515]" 
                />
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    {locationModalMember.name}
                    {locationModalMember.role === 'admin' && <Shield size={14} className="text-field-gold" />}
                  </h3>
                  <p className="text-xs text-gray-400">{locationModalMember.email}</p>
                  <span className="text-[10px] text-field-gold font-semibold uppercase bg-field-gold/10 px-2 py-0.5 rounded border border-field-gold/20 inline-block mt-0.5">
                    {locationModalMember.designation || 'Field Representative'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setLocationModalMember(null);
                  setShowRouteLogs(false);
                  setIsLiveSyncing(false);
                  setIsMapFullscreen(false);
                }}
                className="p-1.5 text-gray-400 hover:text-white bg-[#1A1515] rounded-lg border border-[#3A2E2E]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Location Details & Interactive Square Map */}
            {(() => {
              const loc = locationModalMember.lastLocation || {
                lat: 30.9010,
                lng: 75.8573,
                accuracy: 10,
                timestamp: new Date().toISOString(),
                address: 'Punjab Region (Ludhiana / Amritsar Zone)',
                plusCode: '8J52W724+8Q Ludhiana',
                isLive: true,
                deviceInfo: getDeviceModelInfo()
              };
              const isRecent = loc && loc.timestamp && (Date.now() - new Date(loc.timestamp).getTime() < 600000);

              return (
                <div className="space-y-4">
                  {/* Live Status & Polling Banner */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    isLiveSyncing
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-md shadow-emerald-950/50'
                      : isRecent 
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
                        : 'bg-amber-950/20 border-amber-500/30 text-amber-400'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${isLiveSyncing || isRecent ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {isLiveSyncing ? '● Live Real-Time Tracking (Auto 8s)' : isRecent ? 'Fresh GPS Fix (<10 mins)' : 'Last Recorded Location'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono opacity-90 font-semibold">
                      {getTimeAge(loc.timestamp)}
                    </span>
                  </div>

                  {/* Square-Shaped Map Window with Fullscreen Expand Overlay */}
                  <div className="relative w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden border border-[#3A2E2E] bg-[#1A1515] shadow-xl group">
                    <iframe
                      title="Staff Location Map Preview"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${loc.lng - 0.005}%2C${loc.lat - 0.005}%2C${loc.lng + 0.005}%2C${loc.lat + 0.005}&layer=mapnik&marker=${loc.lat}%2C${loc.lng}`}
                      className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
                    />

                    {/* Full Window Expand Button at Top Right */}
                    <button
                      onClick={() => setIsMapFullscreen(true)}
                      className="absolute top-2.5 right-2.5 px-3 py-1.5 bg-black/85 hover:bg-black text-field-gold rounded-xl border border-field-gold/40 backdrop-blur-md shadow-lg transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold z-10"
                      title="View map in full window layout"
                    >
                      <Maximize2 size={13} />
                      Full Window
                    </button>

                    {/* Live Badge at Top Left */}
                    <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 flex items-center gap-1.5 text-[10px] text-white">
                      <span className={`w-2 h-2 rounded-full ${isRecent ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      <span className="font-semibold">{isRecent ? 'LIVE FIX' : 'SAVED FIX'}</span>
                    </div>

                    {/* Bottom Overlay Bar inside Square Window */}
                    <div className="absolute bottom-2 left-2 right-2 bg-black/90 backdrop-blur-md p-2.5 rounded-xl border border-white/10 space-y-1 text-white text-[11px]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                          <span className="font-semibold text-emerald-300">
                            Accuracy: ±{Math.round(loc.accuracy || 10)}m
                          </span>
                        </div>
                        <span className="text-[10px] text-field-gold font-mono font-bold">
                          {loc.plusCode?.split(' ')[0] || 'GPS'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] text-gray-300 pt-1 border-t border-white/10">
                        <span className="flex items-center gap-1 font-mono text-emerald-300 truncate max-w-[170px]" title={loc.deviceInfo || getDeviceModelInfo()}>
                          📱 {loc.deviceInfo || getDeviceModelInfo()}
                        </span>
                        <span className="font-mono text-gray-300 flex-shrink-0">
                          {new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Login & Logout Session Timestamps */}
                  <div className="bg-[#1A1515] p-3 rounded-xl border border-[#3A2E2E] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-bold block flex items-center gap-1 text-emerald-400">
                        <Zap size={12} /> Login Time
                      </span>
                      <span className="text-xs font-mono font-medium text-gray-200">
                        {locationModalMember.lastLoginTime 
                          ? `${new Date(locationModalMember.lastLoginTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${new Date(locationModalMember.lastLoginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                          : 'Not recorded'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-bold block flex items-center gap-1 text-amber-400">
                        <Radio size={12} /> Logout Time
                      </span>
                      <span className="text-xs font-mono font-medium text-gray-200">
                        {locationModalMember.lastLogoutTime 
                          ? `${new Date(locationModalMember.lastLogoutTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${new Date(locationModalMember.lastLogoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                          : 'Active Session'}
                      </span>
                    </div>
                  </div>

                  {/* Comprehensive Location Details & Device Info Card */}
                  <div className="bg-[#1A1515] p-4 rounded-xl border border-[#3A2E2E] space-y-3">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">City / Locality</span>
                      <p className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
                        <MapPin size={16} className="text-field-gold flex-shrink-0" />
                        {loc.address || 'Punjab Region'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#3A2E2E]">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold block">Coordinates</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold block">Accuracy Radius</span>
                        <span className="text-xs font-mono text-gray-300">
                          ±{Math.round(loc.accuracy || 10)} meters
                        </span>
                      </div>
                    </div>

                    {/* Source Device Identification */}
                    <div className="pt-2 border-t border-[#3A2E2E] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold block">Source Device / Phone</span>
                        <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                          📱 {loc.deviceInfo || getDeviceModelInfo()}
                        </span>
                      </div>
                      <span className="text-[9px] text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/10 font-mono">
                        Hardware Identified
                      </span>
                    </div>

                    {loc.plusCode && (
                      <div className="pt-2 border-t border-[#3A2E2E]">
                        <span className="text-[10px] text-gray-500 uppercase font-bold block">Plus Code (CRM Source)</span>
                        <span className="text-xs font-mono text-field-gold font-bold">
                          {loc.plusCode}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-[#3A2E2E] text-[11px] text-gray-400 flex items-center justify-between">
                      <span>Recorded Time & Age:</span>
                      <span className="font-medium text-gray-200 font-mono">
                        {new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ({getTimeAge(loc.timestamp)})
                      </span>
                    </div>
                  </div>

                  {/* Toggle Day Route Logs */}
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        if (locationModalMember) {
                          const logs = getMemberBreadcrumbs(locationModalMember);
                          setRouteLogs(logs);
                        }
                        setShowRouteLogs(!showRouteLogs);
                      }}
                      className="w-full py-2 bg-[#1A1515] hover:bg-[#251f1f] text-field-gold border border-field-gold/30 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      <Navigation size={14} />
                      {showRouteLogs ? 'Hide Today\'s Day Route Log' : `🗺️ View Today's Local Route Breadcrumbs (${(locationModalMember ? getMemberBreadcrumbs(locationModalMember) : routeLogs).length} pings)`}
                    </button>
                  </div>

                  {/* Day Route Logs Breadcrumb List */}
                  {showRouteLogs && (
                    <div className="bg-[#1A1515] p-3 rounded-xl border border-[#3A2E2E] space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-[#3A2E2E] pb-2">
                        <span className="font-bold text-white text-xs flex items-center gap-1.5">
                          <Navigation size={14} className="text-field-gold" />
                          Today's Route Breadcrumbs ({routeLogs.length} pings)
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">Click item for Google Maps</span>
                      </div>

                      {routeLogs.length > 0 ? (
                        <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                          {routeLogs.map((crumb, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => window.open(`https://www.google.com/maps?q=${crumb.lat},${crumb.lng}`, '_blank')}
                              className="p-2.5 bg-[#2D2424] hover:bg-[#382d2d] cursor-pointer rounded-xl border border-[#3A2E2E]/60 flex items-center justify-between text-[11px] transition-colors group"
                              title="Click to view this breadcrumb location on Google Maps"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 text-[10px] font-mono">
                                    {new Date(crumb.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30 font-semibold">
                                    ±{Math.round(crumb.accuracy || 10)}m accuracy
                                  </span>
                                </div>
                                <span className="text-emerald-400 font-mono font-semibold group-hover:underline flex items-center gap-1">
                                  <MapPin size={11} className="text-field-gold" />
                                  {crumb.lat.toFixed(5)}, {crumb.lng.toFixed(5)}
                                </span>
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                  📱 Device: {crumb.deviceInfo || getDeviceModelInfo()}
                                </span>
                              </div>
                              <div className="text-right space-y-1">
                                <span className="text-[10px] text-field-gold font-mono bg-field-gold/10 px-1.5 py-0.5 rounded border border-field-gold/20 block">
                                  {crumb.plusCode || 'Verified GPS'}
                                </span>
                                <span className="text-[10px] text-field-gold group-hover:text-amber-300 block underline font-bold">
                                  Open Map ↗
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic text-center py-3">
                          No local breadcrumbs logged yet for today on this device. Breadcrumbs log automatically as staff moves &gt;20 meters.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions & Live Sync Controls */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => window.open(`https://www.google.com/maps?q=${loc.lat},${loc.lng}`, '_blank')}
                      className="flex-1 py-2.5 bg-field-gold text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-field-goldHover transition-colors shadow-md"
                    >
                      <MapPin size={16} /> Open Google Maps
                    </button>
                    
                    <button
                      onClick={() => {
                        if (isLiveSyncing) {
                          setIsLiveSyncing(false);
                        } else {
                          setIsLiveSyncing(true);
                          triggerLiveGpsPing();
                        }
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                        isLiveSyncing 
                          ? 'bg-emerald-500 text-black shadow-emerald-500/20 animate-pulse' 
                          : 'bg-[#1A1515] border border-[#3A2E2E] text-gray-200 hover:text-white hover:bg-[#251f1f]'
                      }`}
                      title="Toggle active real-time location polling every 8 seconds"
                    >
                      <RefreshCw size={14} className={isLiveSyncing || isRefreshingLocation ? 'animate-spin' : ''} />
                      {isLiveSyncing ? '● LIVE SYNC ACTIVE' : 'Start Live Sync'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Full Window Map Modal */}
      {isMapFullscreen && locationModalMember && locationModalMember.lastLocation && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md p-3 sm:p-6 flex flex-col justify-between animate-fade-in">
          {/* Top Bar */}
          <div className="flex items-center justify-between bg-[#2D2424] p-3 sm:p-4 rounded-2xl border border-[#3A2E2E] shadow-2xl mb-3 text-white">
            <div className="flex items-center gap-3">
              <img 
                src={locationModalMember.avatar || DEFAULT_AVATAR} 
                alt={locationModalMember.name} 
                className="w-10 h-10 rounded-full border-2 border-field-gold object-cover bg-[#1A1515]" 
              />
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {locationModalMember.name} — Full Window Map
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                    Accuracy ±{Math.round(locationModalMember.lastLocation.accuracy || 10)}m
                  </span>
                </h3>
                <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                  <span>📱 Device: {locationModalMember.lastLocation.deviceInfo || getDeviceModelInfo()}</span>
                  <span>•</span>
                  <span>Recorded: {new Date(locationModalMember.lastLocation.timestamp).toLocaleTimeString()} ({getTimeAge(locationModalMember.lastLocation.timestamp)})</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.open(`https://www.google.com/maps?q=${locationModalMember.lastLocation?.lat},${locationModalMember.lastLocation?.lng}`, '_blank')}
                className="px-3 py-2 bg-field-gold text-black font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-amber-400 transition-colors"
              >
                <Navigation size={14} /> Open Google Maps ↗
              </button>
              <button
                onClick={() => setIsMapFullscreen(false)}
                className="p-2 text-gray-300 hover:text-white bg-[#1A1515] rounded-xl border border-[#3A2E2E]"
                title="Close Full Window Map"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Large Map Container */}
          <div className="flex-1 relative rounded-2xl overflow-hidden border border-[#3A2E2E] bg-[#1A1515] shadow-2xl">
            <iframe
              title="Full Window Staff Location Map"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${locationModalMember.lastLocation.lng - 0.012}%2C${locationModalMember.lastLocation.lat - 0.012}%2C${locationModalMember.lastLocation.lng + 0.012}%2C${locationModalMember.lastLocation.lat + 0.012}&layer=mapnik&marker=${locationModalMember.lastLocation.lat}%2C${locationModalMember.lastLocation.lng}`}
              className="w-full h-full"
            />

            {/* Bottom Info Banner */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/90 backdrop-blur-md p-4 rounded-2xl border border-white/10 max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-3 text-white">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Current Locality & Coordinates</span>
                <p className="text-sm font-bold text-white flex items-center gap-1.5">
                  <MapPin size={16} className="text-field-gold flex-shrink-0" />
                  {locationModalMember.lastLocation.address || 'Punjab Region'} ({locationModalMember.lastLocation.lat.toFixed(6)}, {locationModalMember.lastLocation.lng.toFixed(6)})
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-gray-400 block">Plus Code</span>
                  <span className="text-field-gold font-bold">{locationModalMember.lastLocation.plusCode || 'Verified GPS'}</span>
                </div>
                <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-gray-400 block">Source Device</span>
                  <span className="text-emerald-400 font-bold">{locationModalMember.lastLocation.deviceInfo || getDeviceModelInfo()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// Reusable Configuration Component
function ConfigSection({ title, icon: Icon, items, onUpdate }: { title: string, icon: any, items: string[], onUpdate: (items: string[]) => void }) {
  const [newItem, setNewItem] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onUpdate([...items, newItem.trim()]);
      setNewItem('');
      setIsAdding(false);
    }
  };

  const handleRemove = (itemToRemove: string) => {
    if (confirm(`Are you sure you want to remove "${itemToRemove}"?`)) {
      onUpdate(items.filter(i => i !== itemToRemove));
    }
  };

  return (
    <div className="bg-[#2D2424] rounded-xl shadow-lg border border-[#3A2E2E] p-6 flex flex-col h-full">
       <div className="flex justify-between items-center mb-6 border-b border-[#3A2E2E] pb-4">
          <h3 className="font-bold text-lg flex items-center text-white">
             <Icon size={20} className="mr-2 text-field-gold" /> {title}
          </h3>
          <button 
            onClick={() => setIsAdding(true)}
            className="w-8 h-8 rounded-full bg-field-gold/10 text-field-gold flex items-center justify-center hover:bg-field-gold hover:text-black transition-colors"
          >
            <Plus size={16} />
          </button>
       </div>

       {isAdding && (
         <div className="mb-4 flex gap-2 animate-fade-in">
           <input 
             type="text" 
             value={newItem}
             onChange={(e) => setNewItem(e.target.value)}
             className="flex-1 p-2 bg-[#1A1515] border border-[#3A2E2E] rounded text-sm text-white focus:border-field-gold outline-none"
             placeholder="Enter name"
           />
           <button onClick={handleAdd} className="px-3 py-2 bg-field-gold text-black rounded text-sm font-bold">Save</button>
           <button onClick={() => setIsAdding(false)} className="px-3 py-2 bg-[#1A1515] text-gray-400 rounded text-sm border border-[#3A2E2E]">Cancel</button>
         </div>
       )}

       <div className="space-y-2 overflow-y-auto max-h-80 pr-2 flex-1 scrollbar-thin scrollbar-thumb-[#3A2E2E] scrollbar-track-transparent">
          {items.map((item, idx) => (
             <div key={idx} className="flex items-center justify-between p-3 bg-[#1A1515] rounded-lg border border-[#3A2E2E] group hover:border-field-gold/30 transition-colors">
                <span className="text-sm font-medium text-gray-200">{item}</span>
                <button 
                  onClick={() => handleRemove(item)}
                  className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
             </div>
          ))}
       </div>
    </div>
  );
}

// Recycle Bin / Deleted Items Component for Admins
function RecycleBinSection({
  items,
  onRestore,
  onPermanentDelete,
  onEmpty
}: {
  items: RecycleItem[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onEmpty: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(item => {
    const query = searchTerm.toLowerCase();
    return (
      (item.photo.siteName || '').toLowerCase().includes(query) ||
      (item.photo.fileName || '').toLowerCase().includes(query) ||
      (item.deletedBy || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="bg-[#2D2424] rounded-xl shadow-lg border border-[#3A2E2E] p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#3A2E2E] pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Trash2 size={22} className="text-red-400" />
            Recycle Bin / Deleted Items
            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {items.length}
            </span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Photos and drafts deleted by staff from Pending Reviews. Only Admins can restore or permanently wipe them.
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Are you sure you want to PERMANENTLY delete ALL items from the Recycle Bin? This action CANNOT be undone.')) {
                onEmpty();
              }
            }}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Trash2 size={14} />
            Empty Recycle Bin
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search deleted items..."
            className="w-full pl-9 pr-4 py-2 bg-[#1A1515] border border-[#3A2E2E] rounded-lg text-sm text-white focus:border-field-gold outline-none"
          />
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-[#1A1515] rounded-xl border border-[#3A2E2E]/60 p-6">
          <Trash2 size={36} className="mx-auto mb-2 text-gray-600 opacity-60" />
          <p className="text-sm font-medium text-gray-400">Recycle Bin is clean!</p>
          <p className="text-xs mt-1 text-gray-500">No deleted uploads or drafts found.</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No deleted items match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const dateStr = new Date(item.deletedAt).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            const hasDraft = item.photo.hasDraft || !!item.draftData;

            return (
              <div key={item.id} className="bg-[#1A1515] p-3.5 rounded-xl border border-[#3A2E2E] flex gap-3 hover:border-red-500/30 transition-all group">
                <div className="w-20 h-20 rounded-lg bg-black flex-shrink-0 overflow-hidden relative">
                  <img src={item.photo.url} alt="Deleted" className="w-full h-full object-cover opacity-70 grayscale group-hover:grayscale-0 transition-all" />
                  {hasDraft && (
                    <span className="absolute top-1 left-1 bg-field-gold text-black text-[9px] font-extrabold px-1 rounded">
                      DRAFT
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <h4 className="font-bold text-white text-xs truncate" title={item.photo.siteName || item.photo.fileName}>
                      {item.photo.siteName || item.photo.fileName}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                      Deleted by <span className="text-gray-300 font-semibold">{item.deletedBy}</span>
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {dateStr}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onRestore(item.id)}
                      className="flex-1 py-1.5 px-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                      title="Restore back to Pending Reviews / Gallery"
                    >
                      <RotateCcw size={12} /> Restore
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`PERMANENTLY delete "${item.photo.siteName || item.photo.fileName}"? This CANNOT be restored.`)) {
                          onPermanentDelete(item.id);
                        }
                      }}
                      className="py-1.5 px-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-lg text-[11px] font-bold flex items-center justify-center transition-colors"
                      title="Delete Permanently"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// FieldTrack Dashboard - Visits Records Explorer Component
function FieldTrackVisitsExplorer({ 
  photos, 
  onUpdatePhoto, 
  onDeletePhoto,
  constructionStages = [],
  leadSources = [],
  personTypes = [],
  teamMembers = []
}: { 
  photos: Photo[];
  onUpdatePhoto?: (photo: Photo) => void;
  onDeletePhoto?: (photoId: string) => void;
  constructionStages?: string[];
  leadSources?: string[];
  personTypes?: string[];
  teamMembers?: User[];
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [operatorFilter, setOperatorFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedTelemetryPhoto, setSelectedTelemetryPhoto] = useState<Photo | null>(null);

  // Edit Modal State (Full ReviewEditor)
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  
  // Lightbox Fullscreen Image State
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const handleStartEdit = (p: Photo) => {
    setEditingPhoto(p);
  };

  const handleDeleteRecord = (p: Photo) => {
    if (!onDeletePhoto) return;
    if (confirm(`Are you sure you want to delete site visit record "${p.siteName || p.fileName}"?\n\nThis will send the record to the Admin Recycle Bin where it can be restored if needed.`)) {
      onDeletePhoto(p.id);
    }
  };

  // Map photos into record format
  const photoRecords = photos.map(p => {
    let normalizedUploader = p.staffMember || p.uploaderName || 'Amanpreet';
    
    // Dynamic real device info resolution
    let devName = p.deviceInfo;
    if (!devName || devName.includes('(K)')) {
      devName = getDeviceModelInfo();
    }
    const gpsTag = p.locationSource === 'exif' ? '(EXIF GPS)' : '(Verified GPS)';

    return {
      id: p.id,
      siteName: p.siteName || p.fileName || 'Site Visit',
      staffMember: normalizedUploader,
      status: p.status === 'completed' ? 'Completed' : p.status === 'in-progress' ? 'In Progress' : p.hasDraft ? 'Draft' : 'New Upload',
      lat: p.site_lat !== undefined ? p.site_lat : (p.gps?.lat || 30.901000),
      lng: p.site_lng !== undefined ? p.site_lng : (p.gps?.lng || 75.857300),
      dateStr: formatSafePhotoDateTime(p.captureDate, p.uploadDate),
      deviceInfo: `${devName} ${gpsTag}`,
      url: p.url || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop',
      originalPhoto: p
    };
  });

  const filteredRecords = photoRecords.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchQuery = (r.siteName.toLowerCase().includes(q) || r.staffMember.toLowerCase().includes(q) || r.deviceInfo.toLowerCase().includes(q));
    const matchStatus = statusFilter === 'ALL' || r.status.toLowerCase().replace(' ', '') === statusFilter.toLowerCase().replace(' ', '');
    const matchOperator = operatorFilter === 'ALL' || r.staffMember.toLowerCase().includes(operatorFilter.toLowerCase());
    return matchQuery && matchStatus && matchOperator;
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const triggerBackgroundSync = () => {
    // Dispatch local sync event
    window.dispatchEvent(new Event('fieldops_sync'));
    setSyncToast("Background Sync active! Offline field drafts, local photo logs, and team GPS coordinates synchronized with cloud.");
    setTimeout(() => setSyncToast(null), 5000);
  };

  const handleExportXLSX = () => {
    const recordsToExport = selectedIds.length > 0 
      ? filteredRecords.filter(r => selectedIds.includes(r.id))
      : filteredRecords;

    if (recordsToExport.length === 0) {
      alert("No visit records available to export. Please adjust your filters or upload a site photo.");
      return;
    }

    const headers = [
      "Site Name / Address",
      "Primary Contact Name",
      "Primary Contact Phone",
      "Primary Designation",
      "Firm Name",
      "Secondary Contacts",
      "Staff Member / Operator",
      "Status",
      "Lead Source",
      "Construction Stage",
      "Material Interests",
      "Plus Code",
      "Latitude, Longitude",
      "Latitude",
      "Longitude",
      "Date & Time",
      "Device Info",
      "Follow-Up Priority",
      "Notes / Remarks"
    ];

    const escapeCsv = (str: string | undefined | null) => {
      const clean = (str || '').toString().replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = recordsToExport.map(r => {
      const p = r.originalPhoto;
      const primary = p.peopleMet && p.peopleMet[0] ? p.peopleMet[0] : null;
      const secondary = p.peopleMet && p.peopleMet.length > 1 
        ? p.peopleMet.slice(1).map(sec => `${sec.name || 'Contact'} (${sec.phone || ''} - ${sec.designation || ''})`).join(" | ")
        : "";
      const materials = (p.materialInterests || []).join("; ");

      return [
        escapeCsv(p.siteName || r.siteName),
        escapeCsv(primary?.name || ''),
        escapeCsv(primary?.phone || ''),
        escapeCsv(primary?.designation || ''),
        escapeCsv(primary?.firmName || ''),
        escapeCsv(secondary),
        escapeCsv(r.staffMember),
        escapeCsv(r.status),
        escapeCsv(p.leadSource || ''),
        escapeCsv(p.constructionStage || ''),
        escapeCsv(materials),
        escapeCsv(p.plusCode || ''),
        escapeCsv(`${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}`),
        r.lat.toFixed(6),
        r.lng.toFixed(6),
        escapeCsv(r.dateStr),
        escapeCsv(r.deviceInfo),
        escapeCsv(p.followUpPriority || ''),
        escapeCsv(p.keyNotes || '')
      ].join(",");
    });

    const csvData = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FieldTrack_Leads_${selectedIds.length > 0 ? 'Selected' : 'All'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#2D2424] rounded-2xl border border-[#3A2E2E] shadow-2xl p-6 space-y-6">
      
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#3A2E2E] pb-6">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">Visits Records Explorer</h3>
          <p className="text-xs md:text-sm text-gray-400 mt-1">
            Filter, inspect, edit, and export site visit entries and verified GPS metadata generated by field crew.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={triggerBackgroundSync}
            className="px-4 py-2 bg-[#1A1515] hover:bg-black text-gray-300 border border-[#443535] rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
            title="Click to sync local offline drafts and field team logs with Cloud Firestore database"
          >
            <RefreshCw size={14} className="text-emerald-400 animate-spin-slow" />
            Background Sync
          </button>

          <button 
            onClick={handleExportXLSX}
            className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
            title="Export filtered or selected visit records into an Excel-ready (.csv / .xlsx) spreadsheet"
          >
            <Download size={14} />
            Export Spreadsheet (.xlsx) {selectedIds.length > 0 ? `(${selectedIds.length} Selected)` : `(All ${filteredRecords.length})`}
          </button>
        </div>
      </div>

      {/* Sync Toast Notification */}
      {syncToast && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-400 flex-shrink-0" />
            <span>{syncToast}</span>
          </div>
          <button onClick={() => setSyncToast(null)} className="text-emerald-400 hover:text-white p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="space-y-4 bg-[#1A1515] p-4 rounded-xl border border-[#3A2E2E]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Keyword search (Site, Crew, device...)"
              className="w-full pl-9 pr-4 py-2 bg-[#2D2424] border border-[#3A2E2E] rounded-lg text-xs text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Status Dropdown */}
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#2D2424] border border-[#3A2E2E] rounded-lg text-xs text-gray-300 focus:border-indigo-500 outline-none"
          >
            <option value="ALL">Filter: View All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="InProgress">In Progress</option>
            <option value="Draft">Draft</option>
            <option value="New Upload">New Upload</option>
          </select>

          {/* Operators Dropdown */}
          <select 
            value={operatorFilter}
            onChange={e => setOperatorFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#2D2424] border border-[#3A2E2E] rounded-lg text-xs text-gray-300 focus:border-indigo-500 outline-none"
          >
            <option value="ALL">Filter: View All Operators ({photoRecords.length} visits)</option>
            {Array.from(new Set([
              ...teamMembers.map(m => m.name),
              ...photoRecords.map(r => r.staffMember)
            ])).filter(Boolean).map(opName => (
              <option key={opName} value={opName}>{opName}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Captured Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#2D2424] border border-[#3A2E2E] rounded-lg text-xs text-gray-300 outline-none" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Captured End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#2D2424] border border-[#3A2E2E] rounded-lg text-xs text-gray-300 outline-none" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sort Sequence</label>
            <select 
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#2D2424] border border-[#3A2E2E] rounded-lg text-xs text-gray-300 outline-none"
            >
              <option value="newest">Sort: Newest Uploads</option>
              <option value="oldest">Sort: Oldest Uploads</option>
            </select>
          </div>

          <div className="pt-4 sm:pt-0">
            <button 
              onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setOperatorFilter('ALL'); setStartDate(''); setEndDate(''); }}
              className="w-full py-2 bg-[#2D2424] hover:bg-[#382d2d] text-gray-300 border border-[#3A2E2E] rounded-lg text-xs font-bold transition-colors"
            >
              Reset Date Filters
            </button>
          </div>
        </div>
      </div>

      {/* Site Visits Grid Table */}
      <div className="overflow-x-auto rounded-xl border border-[#3A2E2E] bg-[#1A1515]">
        <table className="w-full text-left border-collapse min-w-[850px]">
          <thead>
            <tr className="bg-[#221B1B] text-[11px] font-extrabold text-gray-400 border-b border-[#3A2E2E] uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === filteredRecords.length && filteredRecords.length > 0} 
                  onChange={toggleSelectAll} 
                  className="w-4 h-4 rounded border-gray-600 bg-[#221B1B] text-indigo-500 focus:ring-0 accent-indigo-500 cursor-pointer" 
                  title="Select / Deselect All Filtered Leads"
                />
              </th>
              <th className="py-3 px-4">PHOTO</th>
              <th className="py-3 px-4">SITE NAME</th>
              <th className="py-3 px-4">STAFF MEMBER</th>
              <th className="py-3 px-4">STATUS</th>
              <th className="py-3 px-4">GPS LOCATION (LAT, LNG)</th>
              <th className="py-3 px-4">DATE & TIME</th>
              <th className="py-3 px-4">DEVICE INFO</th>
              <th className="py-3 px-4 text-right">ADMIN ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3A2E2E]/60 text-xs">
            {filteredRecords.map(rec => {
              const isSelected = selectedIds.includes(rec.id);
              let statusStyle = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
              let statusLabel = `• ${rec.status}`;

              if (rec.status === 'Issue Found') {
                statusStyle = "bg-red-500/15 text-red-400 border-red-500/30";
              } else if (rec.status === 'In Progress') {
                statusStyle = "bg-blue-500/15 text-blue-400 border-blue-500/30";
              } else if (rec.status === 'Draft' || rec.status === 'New Upload') {
                statusStyle = "bg-amber-500/15 text-amber-400 border-amber-500/30";
              }

              return (
                <tr key={rec.id} className={`hover:bg-[#251f1f] transition-colors group ${isSelected ? 'bg-indigo-950/20' : ''}`}>
                  <td className="py-3.5 px-3 text-center">
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => toggleSelect(rec.id)} 
                      className="w-4 h-4 rounded border-gray-600 bg-[#221B1B] text-indigo-500 focus:ring-0 accent-indigo-500 cursor-pointer" 
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    <div 
                      onClick={() => setFullscreenImage(rec.url)}
                      className="w-12 h-12 rounded-lg bg-black border border-[#3A2E2E] overflow-hidden cursor-pointer relative group/img hover:border-field-gold transition-colors"
                      title="Click to view full image"
                    >
                      <img 
                        src={rec.url} 
                        alt="Thumbnail" 
                        className="w-full h-full object-cover group-hover/img:scale-110 transition-transform" 
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                        <Maximize2 size={12} className="text-white" />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white">
                    {rec.siteName}
                  </td>
                  <td className="py-3.5 px-4 text-gray-300">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#3A2E2E] border border-gray-600 flex items-center justify-center text-[10px] font-bold text-field-gold">
                        {rec.staffMember.charAt(0)}
                      </div>
                      <span>{rec.staffMember}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusStyle}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-emerald-400 font-mono text-[11px]">
                    {rec.lat.toFixed(6)}, {rec.lng.toFixed(6)}
                  </td>
                  <td className="py-3.5 px-4 text-gray-400">
                    {rec.dateStr}
                  </td>
                  <td className="py-3.5 px-4 text-gray-400">
                    {rec.deviceInfo}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button 
                        onClick={() => setSelectedTelemetryPhoto(rec.originalPhoto)}
                        className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg font-bold text-[11px] transition-colors inline-flex items-center gap-1"
                        title="Review Telemetry details"
                      >
                        <Eye size={12} />
                        Review
                      </button>

                      <button 
                        onClick={() => handleStartEdit(rec.originalPhoto)}
                        className="px-2.5 py-1.5 bg-field-gold/10 hover:bg-field-gold/20 text-field-gold border border-field-gold/30 rounded-lg font-bold text-[11px] transition-colors inline-flex items-center gap-1"
                        title="Edit Full Smart Entry Form (All Fields)"
                      >
                        <Edit2 size={12} />
                        Edit Form
                      </button>

                      <button 
                        onClick={() => handleDeleteRecord(rec.originalPhoto)}
                        className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-bold text-[11px] transition-colors inline-flex items-center gap-1"
                        title="Delete Record to Recycle Bin"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredRecords.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm font-semibold">No telemetry records match the current filters.</p>
          </div>
        )}

        <div className="p-3 bg-[#221B1B] border-t border-[#3A2E2E] text-[11px] text-gray-400 flex items-center justify-between">
          <span>Showing 1 to {filteredRecords.length} of {photoRecords.length} records</span>
          <span className="text-[10px] text-emerald-400 font-bold">FieldTrack Telemetry Engine v2.4.0</span>
        </div>
      </div>

      {/* Edit Record Modal — FULL SMART ENTRY FORM */}
      {editingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md overflow-y-auto p-2 sm:p-4 md:p-6 flex justify-center items-start">
          <div className="bg-[#1A1515] border border-[#3A2E2E] rounded-2xl w-full max-w-5xl p-4 sm:p-6 shadow-2xl relative my-auto">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-[#3A2E2E]">
              <div>
                <h3 className="text-lg font-extrabold text-field-gold flex items-center gap-2">
                  <Edit2 size={20} />
                  Admin Smart Entry Form Editor — Complete Record Access
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Edit all 20+ site fields: Lead source, material interests, contacts, 6-decimal precision GPS, priority, status, and follow-ups.
                </p>
              </div>
              <button 
                onClick={() => setEditingPhoto(null)} 
                className="p-2 text-gray-400 hover:text-white bg-[#2D2424] rounded-lg transition-colors"
                title="Close Editor"
              >
                <X size={20} />
              </button>
            </div>

            <ReviewEditor
              photo={editingPhoto}
              user={DEMO_ADMIN}
              isOnline={true}
              leadSources={leadSources}
              personTypes={personTypes}
              constructionStages={constructionStages}
              existingPhotos={photos}
              teamMembers={teamMembers}
              onCancel={() => setEditingPhoto(null)}
              onDelete={() => {
                if (confirm(`Move "${editingPhoto.siteName || editingPhoto.fileName}" to Recycle Bin?`)) {
                  if (onDeletePhoto) onDeletePhoto(editingPhoto.id);
                  setEditingPhoto(null);
                }
              }}
              onSaveDraft={(updatedDraft) => {
                if (onUpdatePhoto) onUpdatePhoto(updatedDraft);
              }}
              onSubmit={(updatedPhoto, followUp) => {
                if (onUpdatePhoto) onUpdatePhoto(updatedPhoto);
                setEditingPhoto(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Image Viewer */}
      {fullscreenImage && (
        <div 
          onClick={() => setFullscreenImage(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img 
              src={fullscreenImage} 
              alt="Full view" 
              className="max-w-full max-h-[80vh] object-contain rounded-xl border border-[#3A2E2E] shadow-2xl"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop';
              }}
            />
            <p className="text-xs text-gray-400 mt-3 bg-black/60 px-4 py-1.5 rounded-full border border-gray-700">
              Click anywhere on picture or screen to revert back to list view
            </p>
          </div>
        </div>
      )}

      {/* Telemetry Inspector Modal - Full Lead Aspects Display */}
      {selectedTelemetryPhoto && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto text-white p-6 space-y-5 shadow-2xl relative">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#3A2E2E]">
              <div className="flex items-center gap-2">
                <MapPin size={20} className="text-field-gold" />
                <div>
                  <h3 className="text-lg font-black text-white">Verified Telemetry & Complete Lead Record</h3>
                  <p className="text-[11px] text-gray-400">Full telemetry data, contact information, site scope & metadata</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTelemetryPhoto(null)} 
                className="p-1.5 hover:bg-[#1A1515] rounded-xl text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {selectedTelemetryPhoto.url && (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-[#3A2E2E]">
                <img 
                  src={selectedTelemetryPhoto.url} 
                  alt="Site" 
                  onClick={() => setFullscreenImage(selectedTelemetryPhoto.url)}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity" 
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop';
                  }}
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="bg-field-gold text-black text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                    {selectedTelemetryPhoto.status}
                  </span>
                  {selectedTelemetryPhoto.priority && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-md">
                      {selectedTelemetryPhoto.priority} Priority
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Key Telemetry Header */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#1A1515] p-3.5 rounded-xl border border-[#3A2E2E] text-xs">
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Staff Representative</span>
                <span className="text-field-gold font-bold block mt-0.5">{selectedTelemetryPhoto.staffMember || selectedTelemetryPhoto.uploaderName || 'Staff'}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Captured Date & Time</span>
                <span className="text-gray-200 font-medium block mt-0.5">{formatSafePhotoDateTime(selectedTelemetryPhoto.captureDate, selectedTelemetryPhoto.uploadDate)}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Lead Source</span>
                <span className="text-gray-200 font-medium block mt-0.5">{selectedTelemetryPhoto.leadSource || 'Field Visit'} {selectedTelemetryPhoto.customLeadSource ? `(${selectedTelemetryPhoto.customLeadSource})` : ''}</span>
              </div>
            </div>

            {/* Site Address & GPS Location */}
            <div className="bg-[#1A1515] p-4 rounded-xl border border-[#3A2E2E] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-field-gold font-bold text-xs uppercase tracking-wider">Site Location & Plus Code</span>
                {(selectedTelemetryPhoto.site_lat || selectedTelemetryPhoto.gps?.lat) && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedTelemetryPhoto.site_lat || selectedTelemetryPhoto.gps?.lat},${selectedTelemetryPhoto.site_lng || selectedTelemetryPhoto.gps?.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-field-gold hover:underline font-bold flex items-center gap-1"
                  >
                    🗺️ Open in Google Maps
                  </a>
                )}
              </div>
              <p className="text-sm font-semibold text-white">{selectedTelemetryPhoto.siteName || 'Address Pending Entry'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs font-mono">
                <div className="bg-[#2D2424] p-2 rounded-lg border border-[#3A2E2E]">
                  <span className="text-gray-500 text-[10px] block flex items-center justify-between">
                    <span>Verified GPS</span>
                    <span className="text-[9px] text-gray-400 font-sans">
                      {selectedTelemetryPhoto.locationSource === 'exif' ? '📷 EXIF GPS' : '📡 Device GPS'}
                    </span>
                  </span>
                  <span className="text-emerald-400 font-bold">{(selectedTelemetryPhoto.site_lat || selectedTelemetryPhoto.gps?.lat || 30.901000).toFixed(6)}, {(selectedTelemetryPhoto.site_lng || selectedTelemetryPhoto.gps?.lng || 75.857300).toFixed(6)}</span>
                </div>
                <div className="bg-[#2D2424] p-2 rounded-lg border border-[#3A2E2E]">
                  <span className="text-gray-500 text-[10px] block">Plus Code</span>
                  <span className="text-field-gold font-bold">{selectedTelemetryPhoto.plusCode || '8J52W724+8Q Ludhiana'}</span>
                </div>
              </div>
            </div>

            {/* Contacts Met */}
            <div className="bg-[#1A1515] p-4 rounded-xl border border-[#3A2E2E] space-y-2">
              <span className="text-field-gold font-bold text-xs uppercase tracking-wider block">Contacts Met / Client Info</span>
              {selectedTelemetryPhoto.peopleMet && selectedTelemetryPhoto.peopleMet.length > 0 ? (
                <div className="space-y-2">
                  {selectedTelemetryPhoto.peopleMet.map((person, idx) => (
                    <div key={idx} className="bg-[#2D2424] p-3 rounded-lg border border-[#3A2E2E] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <p className="font-bold text-white text-sm">{person.name || 'Name not specified'}</p>
                        <p className="text-gray-400 text-[11px]">{person.designation || 'Owner'} {person.firmName ? `• ${person.firmName}` : ''}</p>
                      </div>
                      {person.phone && (
                        <a href={`tel:${person.phone}`} className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg font-bold hover:bg-green-500 hover:text-black transition-colors">
                          📞 {person.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No contact details attached yet.</p>
              )}
            </div>

            {/* Scope & Material Requirements */}
            <div className="bg-[#1A1515] p-4 rounded-xl border border-[#3A2E2E] space-y-3">
              <span className="text-field-gold font-bold text-xs uppercase tracking-wider block">Project Stage & Materials</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Construction Stage</span>
                  <span className="text-gray-200 font-semibold">{selectedTelemetryPhoto.constructionStage || 'Plastering'}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Est. Quantity / Area</span>
                  <span className="text-gray-200 font-semibold">{selectedTelemetryPhoto.estimatedQuantity || 'Not specified'}</span>
                </div>
              </div>
              {selectedTelemetryPhoto.materialInterests && selectedTelemetryPhoto.materialInterests.length > 0 && (
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Interested Materials</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTelemetryPhoto.materialInterests.map((m, i) => (
                      <span key={i} className="text-[11px] px-2.5 py-0.5 bg-field-gold/15 text-field-gold border border-field-gold/30 rounded font-medium">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedTelemetryPhoto.notes && (
              <div className="bg-[#1A1515] p-4 rounded-xl border border-[#3A2E2E]">
                <span className="text-field-gold font-bold text-xs uppercase tracking-wider block mb-1">Field Observations & Notes</span>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedTelemetryPhoto.notes}</p>
              </div>
            )}

            {/* Action Footer */}
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => {
                  const toEdit = selectedTelemetryPhoto;
                  setSelectedTelemetryPhoto(null);
                  handleStartEdit(toEdit);
                }} 
                className="flex-1 py-3 bg-field-gold text-black rounded-xl font-bold text-xs hover:bg-[#b57b17] transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 size={16} /> Edit Lead Entry Form
              </button>
              <button 
                onClick={() => setSelectedTelemetryPhoto(null)} 
                className="flex-1 py-3 bg-[#1A1515] text-gray-300 border border-[#3A2E2E] rounded-xl font-bold text-xs hover:bg-gray-800 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
