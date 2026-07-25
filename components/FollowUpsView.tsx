import React, { useState, useEffect } from 'react';
import { User, Photo, FollowUp } from '../types';
import { Phone, Navigation, CheckCircle, Clock, Calendar, Search, ArrowLeft, Filter, AlertTriangle, CalendarClock, X, Check } from 'lucide-react';

interface Props {
  user: User;
  photos: Photo[];
  followUps: FollowUp[];
  initialTab?: string;
  onToggleStatus: (id: string) => void;
  onReschedule: (id: string, date: string) => void;
  onBack: () => void;
}

type Tab = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';

export default function FollowUpsView({ user, photos, followUps, initialTab, onToggleStatus, onReschedule, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>((initialTab as Tab) || 'today');
  const [searchTerm, setSearchTerm] = useState('');
  const [reschedulingItem, setReschedulingItem] = useState<FollowUp | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as Tab);
    }
  }, [initialTab]);

  // Permission filter & exclude follow-ups for deleted photos
  const myFollowUps = (user.role === 'admin' 
    ? followUps 
    : followUps.filter(f => {
        const uName = (user.name || '').toLowerCase();
        return f.assignedToId === user.id ||
               f.createdBy === user.name ||
               (f.assignedStaff && f.assignedStaff.toLowerCase() === uName) ||
               photos.some(p => p.id === f.photoId && (
                 p.uploaderId === user.id || 
                 (p.uploaderName && p.uploaderName.toLowerCase() === uName) || 
                 (p.staffMember && p.staffMember.toLowerCase() === uName)
               ));
      })
  ).filter(f => photos.some(p => p.id === f.photoId));

  // Date Logic
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const filteredList = myFollowUps.filter(f => {
    const fDate = new Date(f.date);
    fDate.setHours(0, 0, 0, 0);
    
    // Search Filter
    const photo = photos.find(p => p.id === f.photoId);
    const searchString = `${photo?.siteName || ''} ${f.notes || ''} ${f.type}`.toLowerCase();
    if (searchTerm && !searchString.includes(searchTerm.toLowerCase())) return false;

    // Tab Filter Logic (Order matters!)
    if (activeTab === 'all') return true;
    if (activeTab === 'completed') return f.status === 'completed';
    if (f.status === 'completed') return false; // Don't show completed in pending tabs

    if (activeTab === 'overdue') {
       return f.status === 'overdue' || (f.status === 'pending' && fDate < today);
    }
    if (activeTab === 'today') {
       return fDate.getTime() === today.getTime();
    }
    if (activeTab === 'upcoming') {
       return fDate >= tomorrow;
    }
    return false;
  });

  const handleCall = (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    const number = photo?.peopleMet?.[0]?.phone;
    if (number) {
      window.open(`tel:${number}`);
    } else {
      alert("No phone number found for this client.");
    }
  };

  const handleDirections = (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (photo?.gps) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${photo.gps.lat},${photo.gps.lng}`);
    } else if (photo?.siteName) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(photo.siteName)}`);
    } else {
      alert("No location data available.");
    }
  };

  const getRescheduleOptions = () => {
    const now = new Date();
    
    // Later Today: +3 hours, rounded to next hour
    const laterToday = new Date(now);
    laterToday.setHours(laterToday.getHours() + 3, 0, 0, 0);

    // Tomorrow: +1 day, 10 AM
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    tomorrowDate.setHours(10, 0, 0, 0);

    // This Weekend: Next Saturday 10 AM
    const saturday = new Date(now);
    saturday.setDate(saturday.getDate() + (6 - saturday.getDay() + 7) % 7);
    if (saturday <= now) saturday.setDate(saturday.getDate() + 7);
    saturday.setHours(10, 0, 0, 0);

    // Next Week: Next Monday 10 AM
    const nextMon = new Date(now);
    nextMon.setDate(nextMon.getDate() + (1 + 7 - nextMon.getDay()) % 7);
    if (nextMon <= now) nextMon.setDate(nextMon.getDate() + 7);
    nextMon.setHours(10, 0, 0, 0);
    
    return [
        { label: 'Later Today (+3h)', date: laterToday },
        { label: 'Tomorrow Morning', date: tomorrowDate },
        { label: 'This Weekend (Sat)', date: saturday },
        { label: 'Next Week (Mon)', date: nextMon }
    ];
  };

  return (
    <div className="bg-[#1A1515] min-h-screen text-white pb-24 relative">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#1A1515]/95 backdrop-blur border-b border-[#2D2424] px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
           <button onClick={onBack}><ArrowLeft size={24} /></button>
           <h2 className="text-xl font-bold">Follow-ups</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
           {[
             { id: 'all', label: 'All' },
             { id: 'today', label: 'Today' },
             { id: 'upcoming', label: 'Upcoming' },
             { id: 'overdue', label: 'Overdue' },
             { id: 'completed', label: 'Completed' }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as Tab)}
               className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                 activeTab === tab.id 
                   ? 'bg-field-gold text-black' 
                   : 'bg-[#2D2424] text-gray-400 border border-[#3A2E2E]'
               }`}
             >
               {tab.label}
             </button>
           ))}
        </div>

        {/* Search */}
        <div className="relative">
           <Search className="absolute left-3 top-3 text-gray-500" size={18} />
           <input 
              type="text" 
              placeholder="Search tasks..." 
              className="w-full bg-[#110C0C] border border-[#3A2E2E] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-field-gold outline-none placeholder-gray-600 transition-colors"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-3">
         {filteredList.length === 0 ? (
           <div className="text-center py-12 text-field-textMuted">
              <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
              <p>No tasks found in {activeTab}</p>
           </div>
         ) : (
           filteredList.map(item => {
             const photo = photos.find(p => p.id === item.photoId);
             const isCompleted = item.status === 'completed';
             
             return (
               <div key={item.id} className={`p-4 rounded-xl border shadow-lg transition-all ${isCompleted ? 'bg-[#1e1a1a] border-[#2D2424] opacity-75' : 'bg-[#2D2424] border-[#3A2E2E]'}`}>
                  <div className="flex justify-between items-start mb-3">
                     <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                           isCompleted ? 'bg-green-500/10 text-green-500' :
                           activeTab === 'overdue' || (item.status === 'overdue' && !isCompleted) ? 'bg-red-500/20 text-red-500' : 
                           'bg-field-gold/20 text-field-gold'
                        }`}>
                           {item.type === 'Phone Call' ? <Phone size={20} /> : <Calendar size={20} />}
                        </div>
                        <div>
                           <h3 className={`font-bold text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-white'}`}>{photo?.siteName || 'Unknown Site'}</h3>
                           <p className="text-xs text-field-textMuted">{item.type} • {photo?.peopleMet?.[0]?.name || 'Client'}</p>
                        </div>
                     </div>
                     <div className={`text-xs px-2 py-1 rounded border ${
                        isCompleted ? 'border-green-500/30 text-green-500 bg-green-500/5' :
                        (item.status === 'overdue' || new Date(item.date) < new Date() && !isCompleted) ? 'border-red-500 text-red-500 bg-red-500/10' : 
                        'border-gray-600 text-gray-400'
                     }`}>
                        {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                     </div>
                  </div>

                  <div className={`bg-[#1A1515] p-3 rounded-lg text-sm mb-4 border border-[#3A2E2E] ${isCompleted ? 'text-gray-500 italic' : 'text-gray-300'}`}>
                     "{item.notes}"
                  </div>

                  {/* 2x2 Grid for Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                     <button 
                       onClick={() => handleCall(item.photoId)}
                       className="py-2.5 bg-[#3D2929] text-field-gold rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-field-gold/20 hover:bg-field-gold hover:text-black transition-colors"
                     >
                        <Phone size={14} /> Call
                     </button>
                     <button 
                       onClick={() => handleDirections(item.photoId)}
                       className="py-2.5 bg-[#3D2929] text-field-gold rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-field-gold/20 hover:bg-field-gold hover:text-black transition-colors"
                     >
                        <Navigation size={14} /> Map
                     </button>
                     <button 
                       onClick={() => onToggleStatus(item.id)}
                       className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-colors ${
                         item.status === 'completed' 
                           ? 'bg-green-500 text-black border-green-500 hover:bg-green-600' 
                           : 'bg-[#1A1515] text-gray-400 border-[#3A2E2E] hover:text-green-500 hover:border-green-500'
                       }`}
                     >
                        <CheckCircle size={14} /> {item.status === 'completed' ? 'Done' : 'Done'}
                     </button>
                     <button 
                       onClick={() => setReschedulingItem(item)}
                       disabled={item.status === 'completed'}
                       className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-colors ${
                          item.status === 'completed' 
                             ? 'opacity-50 cursor-not-allowed bg-[#1A1515] text-gray-600 border-[#3A2E2E]' 
                             : 'bg-[#1A1515] text-gray-400 border-[#3A2E2E] hover:text-field-gold hover:border-field-gold'
                       }`}
                     >
                        <CalendarClock size={14} /> Reschedule
                     </button>
                  </div>
               </div>
             );
           })
         )}
      </div>

      {/* Reschedule Modal */}
      {reschedulingItem && (
         <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={() => setReschedulingItem(null)}>
            <div 
               className="bg-[#1C1818] w-full max-w-md rounded-t-2xl p-6 border-t border-field-gold/20 animate-slide-up shadow-2xl"
               onClick={e => e.stopPropagation()} 
            >
               <div className="flex justify-between items-center mb-6">
                  <div>
                     <h3 className="text-lg font-bold text-white">Reschedule Task</h3>
                     <p className="text-xs text-gray-500 mt-1">Select a new time for this follow-up</p>
                  </div>
                  <button onClick={() => setReschedulingItem(null)}><X size={24} className="text-gray-400 hover:text-white"/></button>
               </div>

               <div className="space-y-3 mb-6">
                  {getRescheduleOptions().map((opt, idx) => (
                     <button 
                        key={idx}
                        onClick={() => {
                           onReschedule(reschedulingItem.id, opt.date.toISOString());
                           setReschedulingItem(null);
                        }}
                        className="w-full bg-[#2D2424] hover:bg-white/5 border border-[#3A2E2E] p-4 rounded-xl flex items-center justify-between group transition-all"
                     >
                        <span className="text-sm font-medium text-white group-hover:text-field-gold">{opt.label}</span>
                        <span className="text-xs text-gray-500">{opt.date.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}</span>
                     </button>
                  ))}
               </div>

               <div className="pt-4 border-t border-[#3A2E2E]">
                  <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Or pick custom date</label>
                  <div className="flex gap-3">
                     <input 
                        type="datetime-local" 
                        className="flex-1 bg-[#1A1515] border border-[#3A2E2E] rounded-lg p-3 text-white text-sm focus:border-field-gold outline-none"
                        onChange={(e) => {
                           if (e.target.value) {
                              onReschedule(reschedulingItem.id, new Date(e.target.value).toISOString());
                              setReschedulingItem(null);
                           }
                        }}
                     />
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}