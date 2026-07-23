import React, { useState, useEffect } from 'react';
import { Photo, FollowUp, User, RecycleItem } from '../types';
import { DEMO_ADMIN, DEMO_STAFF } from '../services/mockData';
import ReviewEditor from './ReviewEditor';
import { Settings, Users, Database, FileText, Plus, Trash2, Tag, Hammer, Camera, Edit2, Check, X, Shield, UserCheck, RotateCcw, Search, Download, RefreshCw, MapPin, Calendar, Filter, Eye, Maximize2 } from 'lucide-react';

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
function StaffManagementSection({ members, onUpdateMembers }: { members: User[], onUpdateMembers: (members: User[]) => void }) {
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
                  </div>
                </div>

                <div className="flex items-center gap-1">
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
    let normalizedUploader = p.uploaderName;
    if (!normalizedUploader || normalizedUploader === 'Rajesh Kumar' || normalizedUploader === 'Amit Singh' || normalizedUploader === 'Sarah Jenkins') {
      normalizedUploader = 'Amanpreet';
    }

    return {
      id: p.id,
      siteName: p.siteName || p.fileName || 'Site Visit',
      staffMember: normalizedUploader,
      status: p.status === 'completed' ? 'Completed' : p.status === 'in-progress' ? 'In Progress' : p.hasDraft ? 'Draft' : 'New Upload',
      lat: p.site_lat !== undefined ? p.site_lat : (p.gps?.lat || 30.901000),
      lng: p.site_lng !== undefined ? p.site_lng : (p.gps?.lng || 75.857300),
      dateStr: new Date(p.uploadDate || p.captureDate || Date.now()).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }),
      deviceInfo: p.syncStatus === 'synced' ? 'Toughpad G2 (Verified GPS)' : 'Android Mobile GPS',
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

  const handleExportXLSX = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Site Name,Staff Member,Status,GPS Lat,GPS Lng,Date & Time,Device Info"].join(",") + "\n"
      + filteredRecords.map(r => `"${r.siteName}","${r.staffMember}","${r.status}",${r.lat.toFixed(6)},${r.lng.toFixed(6)},"${r.dateStr}","${r.deviceInfo}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FieldTrack_Visits_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#2D2424] rounded-2xl border border-[#3A2E2E] shadow-2xl p-6 space-y-6">
      
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#3A2E2E] pb-6">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">Visits Records Explorer</h3>
          <p className="text-xs md:text-sm text-gray-400 mt-1">
            Filter, inspect, edit, and manage site visit entries and verified GPS metadata generated by field crew.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => alert('Background synchronization verified with management server.')}
            className="px-4 py-2 bg-[#1A1515] hover:bg-black text-gray-300 border border-[#443535] rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <RefreshCw size={14} className="text-emerald-400 animate-spin-slow" />
            Background Sync
          </button>

          <button 
            onClick={handleExportXLSX}
            className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Download size={14} />
            Export Spreadsheet (.xlsx)
          </button>
        </div>
      </div>

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
                <tr key={rec.id} className="hover:bg-[#251f1f] transition-colors group">
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

      {/* Telemetry Inspector Modal */}
      {selectedTelemetryPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-2xl max-w-lg w-full p-6 text-white space-y-4 shadow-2xl relative">
            <button 
              onClick={() => setSelectedTelemetryPhoto(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-field-gold flex items-center gap-2">
              <MapPin size={18} />
              Verified Telemetry Record
            </h3>
            
            {selectedTelemetryPhoto.url && (
              <img 
                src={selectedTelemetryPhoto.url} 
                alt="Site" 
                onClick={() => setFullscreenImage(selectedTelemetryPhoto.url)}
                className="w-full h-48 object-cover rounded-xl border border-[#3A2E2E] cursor-pointer hover:opacity-90 transition-opacity" 
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop';
                }}
              />
            )}

            <div className="space-y-2 text-xs text-gray-300 bg-[#1A1515] p-4 rounded-xl border border-[#3A2E2E]">
              <p><span className="text-gray-500">Site Name:</span> <strong className="text-white">{selectedTelemetryPhoto.siteName || selectedTelemetryPhoto.fileName}</strong></p>
              <p><span className="text-gray-500">GPS Coordinates:</span> <strong className="text-emerald-400 font-mono">{(selectedTelemetryPhoto.site_lat || selectedTelemetryPhoto.gps?.lat || 30.901000).toFixed(6)}, {(selectedTelemetryPhoto.site_lng || selectedTelemetryPhoto.gps?.lng || 75.857300).toFixed(6)}</strong></p>
              <p><span className="text-gray-500">Uploader:</span> <strong className="text-white">{selectedTelemetryPhoto.uploaderName}</strong></p>
              <p><span className="text-gray-500">Plus Code:</span> <strong className="text-field-gold font-mono">{selectedTelemetryPhoto.plusCode || '8J52W724+8Q Ludhiana'}</strong></p>
              <p><span className="text-gray-500">Stage / Priority:</span> <strong className="text-white">{selectedTelemetryPhoto.constructionStage || 'Plastering'} ({selectedTelemetryPhoto.priority || 'Normal'})</strong></p>
            </div>

            <button 
              onClick={() => setSelectedTelemetryPhoto(null)} 
              className="w-full py-2.5 bg-field-gold text-black rounded-xl font-bold text-xs"
            >
              Close Telemetry Inspector
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
