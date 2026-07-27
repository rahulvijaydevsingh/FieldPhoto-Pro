import React, { useState, useEffect } from 'react';
import { Photo, FollowUp, User, RecycleItem, RouteBreadcrumb } from '../../../types';
import { DEMO_ADMIN, DEMO_STAFF } from '../../../services/mockData';
import { subscribeRouteBreadcrumbs } from '../../../services/firebase';
import ConfigCard from './ConfigCard';
import RecycleBin from './RecycleBin';
import VisitsExplorer from './VisitsExplorer';
import StaffManagement from './StaffManagement';
import DevPlaybook from './DevPlaybook';
import GeolocationInspector from './GeolocationInspector';
import { Database, Users, Tag, Hammer, FileText, BookOpen } from 'lucide-react';

interface AdminPanelViewProps {
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

export default function AdminPanelView({ 
  photos, 
  followUps, 
  leadSources, onUpdateLeadSources,
  personTypes, onUpdatePersonTypes,
  constructionStages, onUpdateConstructionStages,
  onUpdatePhoto, onDeletePhoto,
  recycleBin, onRestoreFromRecycleBin, onPermanentlyDeleteFromRecycleBin, onEmptyRecycleBin,
  onUpdateTeamMembers
}: AdminPanelViewProps) {
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

  const [cloudBreadcrumbs, setCloudBreadcrumbs] = useState<RouteBreadcrumb[]>([]);
  const [showPlaybook, setShowPlaybook] = useState(false);

  useEffect(() => {
    const unsub = subscribeRouteBreadcrumbs((crumbs) => {
      if (Array.isArray(crumbs)) {
        setCloudBreadcrumbs(crumbs);
      }
    });
    return () => unsub();
  }, []);

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

  if (showPlaybook) {
    return (
      <div className="relative space-y-4">
        <div className="flex justify-between items-center bg-[#2D2424] border border-[#3A2E2E] p-4 rounded-xl">
          <span className="text-xs font-bold text-gray-300">FieldTrack Architecture Documentation</span>
          <button 
            onClick={() => setShowPlaybook(false)}
            className="bg-[#D99026] text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#b57b17] transition-colors"
          >
            ← Back to Admin Panel
          </button>
        </div>
        <DevPlaybook />
      </div>
    );
  }

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

         <button
           onClick={() => setShowPlaybook(true)}
           className="px-4 py-2 bg-[#2D2424] border border-[#D99026]/40 text-[#D99026] rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#D99026]/10 transition-colors"
         >
           <BookOpen size={14} /> Architecture Playbook
         </button>
      </div>

      {/* FieldTrack Dashboard - Visits Records Explorer */}
      <VisitsExplorer 
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
            <h3 className="text-xs font-bold text-field-textMuted uppercase tracking-wider mb-2">Active Follow-ups</h3>
            <div className="flex justify-between items-end">
               <div>
                  <p className="text-4xl font-bold text-white mb-1">{followUps.filter(f => f.status === 'pending').length}</p>
                  <p className="text-xs text-gray-500">Tasks pending</p>
               </div>
               <div className="w-12 h-12 rounded-full bg-field-gold/10 flex items-center justify-center text-field-gold">
                  <FileText size={24} />
               </div>
            </div>
         </div>
      </div>

      {/* Staff Management Section */}
      <StaffManagement 
        members={teamMembers}
        onUpdateMembers={saveTeamMembers}
        photos={photos}
        cloudBreadcrumbs={cloudBreadcrumbs}
      />

      {/* Geolocation Strategy Engine Inspector */}
      <GeolocationInspector />

      {/* Master Configuration Lists */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white">Master Configuration Lists</h3>
        <p className="text-xs text-gray-400">Configure drop-down options available across the mobile site visit entry form.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ConfigCard 
            title="Lead Sources" 
            icon={Tag} 
            items={leadSources} 
            onUpdate={onUpdateLeadSources} 
          />
          <ConfigCard 
            title="Person Met Types" 
            icon={Users} 
            items={personTypes} 
            onUpdate={onUpdatePersonTypes} 
          />
          <ConfigCard 
            title="Construction Stages" 
            icon={Hammer} 
            items={constructionStages} 
            onUpdate={onUpdateConstructionStages} 
          />
        </div>
      </div>

      {/* Recycle Bin / Deleted Items */}
      <RecycleBin 
        items={recycleBin}
        onRestore={onRestoreFromRecycleBin}
        onPermanentDelete={onPermanentlyDeleteFromRecycleBin}
        onEmpty={onEmptyRecycleBin}
      />
    </div>
  );
}
