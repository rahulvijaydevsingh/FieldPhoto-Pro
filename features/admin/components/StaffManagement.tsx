import React, { useState } from 'react';
import { User, Photo, RouteBreadcrumb, DEFAULT_AVATAR } from '../../../types';
import { getDeviceModelInfo, getTimeAge, getMemberBreadcrumbs } from '../../../utils/locationUtils';
import { getSharedRouteLogs } from '../../../utils/routeLogger';
import { teamRepository } from '../../../repositories/teamRepository';
import { 
  Users, Plus, Search, Trash2, Edit2, Shield, Eye, EyeOff, Camera, Check, X, 
  MapPin, RefreshCw, Radio, Zap, Navigation, Maximize2 
} from 'lucide-react';

interface StaffManagementProps {
  members: User[];
  onUpdateMembers: (members: User[]) => void;
  photos?: Photo[];
  cloudBreadcrumbs?: RouteBreadcrumb[];
}

export default function StaffManagement({
  members,
  onUpdateMembers,
  photos,
  cloudBreadcrumbs = []
}: StaffManagementProps) {
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

    if (photos && photos.length > 0) {
      const userPhotos = photos.filter(p => 
        (p.uploaderId && p.uploaderId === m.id) || 
        (p.uploaderName && m.name && p.uploaderName.trim().toLowerCase() === m.name.trim().toLowerCase()) ||
        (m.email && p.uploaderName && p.uploaderName.toLowerCase().includes(m.email.split('@')[0].toLowerCase()))
      );
      if (userPhotos.length > 0) {
        const sorted = [...userPhotos].sort((a, b) => new Date(b.uploadDate || b.captureDate || 0).getTime() - new Date(a.uploadDate || a.captureDate || 0).getTime());
        const latestPhoto = sorted[0];
        const pLat = latestPhoto.site_lat !== undefined ? latestPhoto.site_lat : latestPhoto.gps?.lat;
        const pLng = latestPhoto.site_lng !== undefined ? latestPhoto.site_lng : latestPhoto.gps?.lng;
        const pTime = latestPhoto.uploadDate || latestPhoto.captureDate;

        if (pLat !== undefined && pLng !== undefined && pTime) {
          if (!freshestLoc || new Date(pTime).getTime() > new Date(freshestLoc.timestamp).getTime()) {
            freshestLoc = {
              lat: pLat,
              lng: pLng,
              accuracy: 8,
              timestamp: pTime,
              address: latestPhoto.siteName || 'Recent Photo Upload Site',
              plusCode: latestPhoto.plusCode || 'Verified GPS',
              isLive: true,
              deviceInfo: latestPhoto.deviceInfo || getDeviceModelInfo()
            };
          }
        }
      }
    }

    return freshestLoc ? { ...m, lastLocation: freshestLoc } : m;
  };

  const handleStartEdit = (m: User) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditEmail(m.email);
    setEditPassword(m.password || '123456');
    setEditDesignation(m.designation || (m.role === 'admin' ? 'Managing Director / Admin' : 'Senior Field Representative'));
    setEditRole(m.role);
    setEditAvatar(m.avatar || '');
  };

  const handleSaveEdit = (id: string) => {
    const updated = members.map(m => {
      if (m.id === id) {
        const updatedUser: User = {
          ...m,
          name: editName,
          email: editEmail,
          password: editPassword,
          designation: editDesignation,
          role: editRole,
          avatar: editAvatar
        };
        teamRepository.save(updatedUser);
        return updatedUser;
      }
      return m;
    });
    onUpdateMembers(updated);
    setEditingId(null);
  };

  const handleAddMember = () => {
    if (!newName.trim() || !newEmail.trim()) {
      alert("Name and Email are required");
      return;
    }
    const newMember: User = {
      id: `user-${Date.now()}`,
      name: newName,
      email: newEmail,
      password: newPassword || '123456',
      designation: newDesignation || (newRole === 'admin' ? 'Managing Director / Admin' : 'Field Representative'),
      role: newRole,
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`
    };
    teamRepository.save(newMember);
    onUpdateMembers([...members, newMember]);
    setIsAdding(false);
    setNewName(''); setNewEmail(''); setNewPassword(''); setNewDesignation(''); setNewRole('staff');
  };

  const handleDeleteMember = (member: User) => {
    if (confirm(`Are you sure you want to delete staff member "${member.name}"?`)) {
      const updated = members.filter(m => m.id !== member.id);
      teamRepository.delete(member.id);
      onUpdateMembers(updated);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const updated = members.map(m => m.id === id ? { ...m, avatar: base64 } : m);
        onUpdateMembers(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAvatar = (id: string) => {
    const updated = members.map(m => m.id === id ? { ...m, avatar: '' } : m);
    onUpdateMembers(updated);
  };

  const refreshStaffLocation = () => {
    setIsRefreshingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (locationModalMember) {
            const updatedLoc = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy || 10,
              timestamp: new Date().toISOString(),
              address: 'Current Verified Staff Location',
              isLive: true,
              deviceInfo: getDeviceModelInfo()
            };
            const updatedMember = { ...locationModalMember, lastLocation: updatedLoc };
            setLocationModalMember(updatedMember);
            
            const updatedList = members.map(m => m.id === updatedMember.id ? updatedMember : m);
            onUpdateMembers(updatedList);
          }
          setIsRefreshingLocation(false);
        },
        () => {
          setIsRefreshingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setIsRefreshingLocation(false);
    }
  };

  const isMemberOnline = (m: User): boolean => {
    if (!m) return false;
    if (m.isOnline && m.lastSeenTime) {
      const diffMs = Date.now() - new Date(m.lastSeenTime).getTime();
      if (diffMs < 60000) return true;
    }
    if (m.lastSeenTime) {
      const diffMs = Date.now() - new Date(m.lastSeenTime).getTime();
      if (diffMs < 60000) return true;
    }
    return false;
  };

  const onlineCount = members.filter(isMemberOnline).length;

  const handleInspectStaffLocation = (m: User) => {
    const freshest = getFreshestMember(m);
    setLocationModalMember(freshest);
    setShowRouteLogs(false);
    const logs = getSharedRouteLogs(m.id, m.name, cloudBreadcrumbs);
    setRouteLogs(logs);
    refreshStaffLocation();
  };

  return (
    <div className="bg-[#2D2424] rounded-2xl border border-[#3A2E2E] p-6 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#3A2E2E] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Users size={22} className="text-field-gold" /> Staff & Team Management ({members.length})
            </h3>
            <div className="flex items-center gap-2 bg-[#1A1515] px-3 py-1 rounded-full border border-[#3A2E2E] text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {onlineCount} Online Now
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400">{members.length - onlineCount} Offline</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">Manage field crew credentials, designations, logins, and check real-time GPS locations & online presence.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)} 
          className="px-4 py-2 bg-field-gold hover:bg-field-goldHover text-black font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md"
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          {isAdding ? 'Cancel' : 'Add Staff Member'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-[#1A1515] p-5 rounded-xl border border-[#3A2E2E] space-y-4 animate-fade-in">
          <h4 className="text-sm font-bold text-field-gold uppercase tracking-wider">New Staff Member Registration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Full Name *</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Amanpreet Singh" className="w-full p-2.5 bg-[#2D2424] border border-[#3A2E2E] rounded-lg text-xs text-white focus:border-field-gold outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Email Address *</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="e.g. aman@company.com" className="w-full p-2.5 bg-[#2D2424] border border-[#3A2E2E] rounded-lg text-xs text-white focus:border-field-gold outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Login Password</label>
              <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Default: 123456" className="w-full p-2.5 bg-[#2D2424] border border-[#3A2E2E] rounded-lg text-xs text-white focus:border-field-gold outline-none font-mono" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Designation / Role Title</label>
              <input type="text" value={newDesignation} onChange={e => setNewDesignation(e.target.value)} placeholder="e.g. Senior Field Representative" className="w-full p-2.5 bg-[#2D2424] border border-[#3A2E2E] rounded-lg text-xs text-white focus:border-field-gold outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Access Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value as 'admin' | 'staff')} className="w-full p-2.5 bg-[#2D2424] border border-[#3A2E2E] rounded-lg text-xs text-white focus:border-field-gold outline-none">
                <option value="staff">Staff Representative</option>
                <option value="admin">Managing Director / Admin</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#3A2E2E]">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-[#2D2424] text-gray-300 rounded-lg text-xs font-bold">Cancel</button>
            <button onClick={handleAddMember} className="px-5 py-2 bg-field-gold text-black rounded-lg text-xs font-bold flex items-center gap-1"><Check size={16} /> Save Member</button>
          </div>
        </div>
      )}

      {/* Staff Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map(member => {
          const isEditing = editingId === member.id;
          return (
            <div key={member.id} className="bg-[#1A1515] p-4 rounded-xl border border-[#3A2E2E] space-y-3">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 pb-2 border-b border-[#3A2E2E]">
                    <div className="relative">
                      <img src={editAvatar || DEFAULT_AVATAR} alt="Avatar Preview" className="w-12 h-12 rounded-full border-2 border-field-gold object-cover bg-[#2D2424]" />
                      <label className="absolute bottom-0 right-0 bg-field-gold text-black p-1 rounded-full cursor-pointer hover:scale-110 transition-transform" title="Change Picture">
                        <Camera size={12} />
                        <input type="file" accept="image/*" onChange={e => handleAvatarUpload(e, member.id)} className="hidden" />
                      </label>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-field-gold uppercase">Edit Profile & Credentials</span>
                      <p className="text-[10px] text-gray-400">ID: {member.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Name</label>
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 bg-[#2D2424] border border-[#3A2E2E] rounded text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Email</label>
                      <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full p-2 bg-[#2D2424] border border-[#3A2E2E] rounded text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Password</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full p-2 pr-8 bg-[#2D2424] border border-[#3A2E2E] rounded text-white font-mono" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2.5 text-gray-400">
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Designation</label>
                      <input type="text" value={editDesignation} onChange={e => setEditDesignation(e.target.value)} className="w-full p-2 bg-[#2D2424] border border-[#3A2E2E] rounded text-white" />
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
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                          {member.name}
                          {member.role === 'admin' && <Shield size={12} className="text-field-gold" />}
                        </h4>
                        {isMemberOnline(member) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ONLINE NOW
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                            OFFLINE
                          </span>
                        )}
                      </div>
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
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-[#2D2424] rounded-lg transition-colors flex items-center gap-1 text-xs"
                      title="Delete Staff Member"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Staff Location Inspection Modal */}
      {locationModalMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto relative">
            <div className="flex items-center justify-between border-b border-[#3A2E2E] pb-3">
              <div className="flex items-center gap-3">
                <img src={locationModalMember.avatar || DEFAULT_AVATAR} alt={locationModalMember.name} className="w-10 h-10 rounded-full border-2 border-field-gold object-cover bg-[#1A1515]" />
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    {locationModalMember.name}
                    <span className="text-[10px] text-field-gold bg-field-gold/10 border border-field-gold/30 px-2 py-0.5 rounded-full font-mono">
                      GPS Inspector
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">{locationModalMember.email}</p>
                </div>
              </div>
              <button onClick={() => setLocationModalMember(null)} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5"><X size={20} /></button>
            </div>

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

                  {/* Square Map Window */}
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

                    {/* Full Window Expand Button */}
                    <button
                      onClick={() => setIsMapFullscreen(true)}
                      className="absolute top-2.5 right-2.5 px-3 py-1.5 bg-black/85 hover:bg-black text-field-gold rounded-xl border border-field-gold/40 backdrop-blur-md shadow-lg transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold z-10"
                      title="View map in full window layout"
                    >
                      <Maximize2 size={13} />
                      Full Window
                    </button>

                    {/* Live Badge */}
                    <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 flex items-center gap-1.5 text-[10px] text-white">
                      <span className={`w-2 h-2 rounded-full ${isRecent ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      <span className="font-semibold">{isRecent ? 'LIVE FIX' : 'SAVED FIX'}</span>
                    </div>

                    {/* Bottom Overlay Bar */}
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

                  {/* Timestamps */}
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

                  {/* Actions & Route Logs Toggle */}
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.open(`https://www.google.com/maps?q=${loc.lat},${loc.lng}`, '_blank')}
                        className="flex-1 py-2.5 bg-field-gold text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-field-goldHover transition-colors shadow-md"
                      >
                        <MapPin size={16} /> Open Google Maps
                      </button>
                      
                      <button
                        onClick={() => setShowRouteLogs(!showRouteLogs)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                          showRouteLogs 
                            ? 'bg-field-gold/20 text-field-gold border-field-gold/40' 
                            : 'bg-[#1A1515] border-[#3A2E2E] text-gray-300 hover:text-white'
                        }`}
                      >
                        <Navigation size={14} />
                        {showRouteLogs ? 'Hide History' : `Route History (${routeLogs.length})`}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        if (isLiveSyncing) {
                          setIsLiveSyncing(false);
                        } else {
                          setIsLiveSyncing(true);
                          refreshStaffLocation();
                        }
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
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

                  {/* Route History Breadcrumb Log List */}
                  {showRouteLogs && (
                    <div className="bg-[#1A1515] p-3 rounded-xl border border-[#3A2E2E] space-y-2 max-h-48 overflow-y-auto">
                      <div className="flex items-center justify-between text-xs font-bold text-field-gold border-b border-[#3A2E2E] pb-1.5">
                        <span className="flex items-center gap-1"><Navigation size={12} /> Logged App Location Breadcrumbs</span>
                        <span className="text-[10px] text-gray-400 font-normal">{routeLogs.length} Records</span>
                      </div>
                      {routeLogs.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-2 text-center">No location breadcrumbs logged yet for this session.</p>
                      ) : (
                        <div className="space-y-1.5 text-[11px] font-mono">
                          {routeLogs.slice().reverse().map((crumb, idx) => (
                            <div key={idx} className="flex items-center justify-between p-1.5 bg-[#2D2424] rounded border border-[#3A2E2E]">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-field-gold" />
                                <span className="text-gray-200">{crumb.lat.toFixed(5)}, {crumb.lng.toFixed(5)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                <span>{crumb.plusCode ? crumb.plusCode.split(' ')[0] : ''}</span>
                                <span>{new Date(crumb.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
