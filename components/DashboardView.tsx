
import React, { useState } from 'react';
import { User, Photo, FollowUp } from '../types';
import { Calendar, AlertTriangle, CheckCircle, Clock, Phone, Navigation, Bell, BarChart3, Cloud, Hourglass, X } from 'lucide-react';
import { getSafePhotoDate } from '../services/dateUtils';
import { isLeadPhoto } from '../utils/photoType';

interface Props {
  user: User;
  photos: Photo[];
  followUps: FollowUp[];
  onChangeView: (view: any, params?: any) => void;
  onToggleFollowUpStatus: (id: string) => void;
}

export default function DashboardView({ user, photos, followUps, onChangeView, onToggleFollowUpStatus }: Props) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  const myPhotos = user.role === 'admin' 
    ? photos 
    : photos.filter(p => {
        const uName = (user.name || '').toLowerCase();
        return p.uploaderId === user.id ||
               (p.uploaderName && p.uploaderName.toLowerCase() === uName) ||
               (p.staffMember && p.staffMember.toLowerCase() === uName);
      });

  const myLeadPhotos = myPhotos.filter(isLeadPhoto);

  const myFollowUps = user.role === 'admin' 
    ? followUps 
    : followUps.filter(f => {
        const uName = (user.name || '').toLowerCase();
        return f.assignedToId === user.id ||
               f.createdBy === user.name ||
               (f.assignedStaff && f.assignedStaff.toLowerCase() === uName);
      });

  // Updated status check
  const pendingReviews = myLeadPhotos.filter(p => p.status === 'new').length;
  
  const overdueFollowUps = myFollowUps.filter(f => f.status === 'overdue' || (f.status === 'pending' && new Date(f.date) < new Date(new Date().setHours(0,0,0,0)))).length;
  const today = new Date();
  const uploadedToday = myLeadPhotos.filter(p => {
    const d = getSafePhotoDate(p.captureDate, p.uploadDate);
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const uploadedYesterday = myLeadPhotos.filter(p => {
    const d = getSafePhotoDate(p.captureDate, p.uploadDate);
    return d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
  }).length;

  const diffYesterday = uploadedToday - uploadedYesterday;
  const yesterdaySubtext = diffYesterday > 0 
    ? `+${diffYesterday} from yesterday`
    : diffYesterday < 0 
      ? `${diffYesterday} from yesterday`
      : `Same as yesterday`;

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const uploadedThisWeek = myLeadPhotos.filter(p => {
    const d = getSafePhotoDate(p.captureDate, p.uploadDate);
    return d >= startOfWeek;
  }).length;

  // Only show top 3 valid follow-ups for existing photos on dashboard
  const visibleFollowUps = myFollowUps
    .filter(f => f.status !== 'completed' && photos.some(p => p.id === f.photoId))
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const handleCall = (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    // Find first phone number
    const number = photo?.peopleMet?.[0]?.phone;
    if (number) {
      window.open(`tel:${number}`);
    } else {
      alert("No phone number found for this client.");
    }
  };

  const handleDirections = (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (photo?.site_lat && photo.site_lng) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${photo.site_lat},${photo.site_lng}`);
    } else if (photo?.gps) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${photo.gps.lat},${photo.gps.lng}`);
    } else if (photo?.siteName) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(photo.siteName)}`);
    } else {
      alert("No location data available for this site.");
    }
  };

  return (
    <div className="pb-24"> 
      
      {/* Header */}
      <div className="bg-[#1A1515] px-6 py-6 sticky top-0 z-10 border-b border-[#2D2424] md:border-none">
        <div className="flex justify-between items-center mb-6">
           <div className="flex items-center gap-3">
             <div className="relative">
                <img src={user.avatar} alt="Profile" className="w-10 h-10 rounded-full border border-field-gold object-cover" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1A1515] rounded-full"></span>
             </div>
             <span className="text-field-gold text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-field-gold/10 border border-field-gold/20">
               {user.role === 'admin' ? 'Admin' : 'Field Staff'}
             </span>
           </div>
           <div className="flex gap-4 text-white relative">
              <button 
                className="relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                 <Bell size={24} />
                 {overdueFollowUps > 0 && (
                   <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1A1515]"></span>
                 )}
              </button>
              
              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#2D2424] border border-[#3A2E2E] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-3 border-b border-[#3A2E2E] flex justify-between items-center">
                     <h3 className="font-bold text-sm">Notifications</h3>
                     <button onClick={() => setShowNotifications(false)}><X size={16} className="text-gray-400"/></button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {overdueFollowUps > 0 ? (
                      <div className="p-3 hover:bg-white/5 border-b border-[#3A2E2E]/50 cursor-pointer" onClick={() => onChangeView('followups')}>
                         <div className="flex gap-3">
                           <div className="mt-1 text-red-500"><AlertTriangle size={16} /></div>
                           <div>
                             <p className="text-sm font-bold text-white">Overdue Tasks</p>
                             <p className="text-xs text-gray-400">You have {overdueFollowUps} overdue follow-ups.</p>
                           </div>
                         </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-gray-500 text-sm">
                        No new notifications
                      </div>
                    )}
                    {pendingReviews > 0 && (
                      <div className="p-3 hover:bg-white/5 border-b border-[#3A2E2E]/50 cursor-pointer" onClick={() => onChangeView('pending')}>
                         <div className="flex gap-3">
                           <div className="mt-1 text-field-gold"><Clock size={16} /></div>
                           <div>
                             <p className="text-sm font-bold text-white">Pending Reviews</p>
              <p className="text-xs text-gray-400">{pendingReviews} lead photos waiting for review.</p>
                           </div>
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
           </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Good Morning, {user.name.split(' ')[0]}</h1>
        
        <div className="flex items-center text-field-textMuted text-sm gap-4">
           <div className="flex items-center gap-1.5">
             <Calendar size={14} className="text-field-gold" />
             <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric'})}</span>
           </div>
        </div>
      </div>

      <div className="px-4 md:px-0 space-y-6 mt-4">
        
        {/* Action Required Card */}
        {pendingReviews > 0 && (
          <div className="bg-[#2D2424] rounded-2xl p-5 border border-[#3A2E2E] shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
            
            <div className="flex items-start gap-4 mb-4 relative z-10">
               <div className="w-12 h-12 bg-[#3D2929] rounded-full flex items-center justify-center text-red-500 flex-shrink-0">
                  <AlertTriangle size={24} fill="currentColor" fillOpacity={0.2} />
               </div>
               <div>
                  <h3 className="text-white font-bold text-lg">Action Required</h3>
                  <p className="text-field-textMuted text-sm">{pendingReviews} photos require review/sync</p>
               </div>
            </div>
            
            <button 
              onClick={() => onChangeView('pending')}
              className="w-full bg-gradient-to-r from-[#D99026] to-[#B57B17] text-black font-bold py-3 rounded-xl shadow-md hover:opacity-90 transition-opacity"
            >
              Review Now
            </button>
          </div>
        )}

        {/* Stats Grid 2x2 */}
        <div className="grid grid-cols-2 gap-3">
           <StatWidget 
              title="TODAY" 
              value={uploadedToday} 
              subtext={yesterdaySubtext}
              subtextColor="text-field-gold"
              icon={<Cloud size={20} className="text-field-gold" />}
              onClick={() => onChangeView('gallery', { dateFilter: 'today' })}
           />
           <StatWidget 
              title="THIS WEEK" 
              value={uploadedThisWeek} 
              subtext="On track"
              subtextColor="text-field-gold"
              icon={<BarChart3 size={20} className="text-field-gold" />}
              onClick={() => onChangeView('gallery', { dateFilter: 'week' })}
           />
           <StatWidget 
              title="PENDING" 
              value={pendingReviews} 
              subtext="Needs attention"
              subtextColor="text-red-400"
              icon={<Hourglass size={20} className="text-field-gold" />}
              highlight={pendingReviews > 0}
              onClick={() => onChangeView('pending')}
           />
           <StatWidget 
              title="OVERDUE" 
              value={overdueFollowUps} 
              subtext="Follow-up req."
              subtextColor="text-red-400"
              icon={<AlertTriangle size={20} className="text-red-500" />}
              highlight={overdueFollowUps > 0}
              variant="danger"
              onClick={() => onChangeView('followups', { tab: 'overdue' })}
           />
        </div>

        {/* Today's Follow-ups List */}
        <div>
           <div className="flex justify-between items-end mb-4 px-1">
              <h3 className="text-lg font-bold text-white">Today's Follow-ups</h3>
              <button 
                 onClick={() => onChangeView('followups', { tab: 'all' })}
                 className="text-field-gold text-sm font-semibold hover:text-white"
              >
                 View All
              </button>
           </div>
           
           <div className="space-y-3">
              {visibleFollowUps.length === 0 ? (
                <div className="bg-[#2D2424] p-6 rounded-2xl border border-[#3A2E2E] text-center text-gray-500">
                   No pending follow-ups for today.
                </div>
              ) : (
                visibleFollowUps.map((fu, idx) => {
                   const photo = photos.find(p => p.id === fu.photoId);
                   return (
                      <div key={fu.id} className="bg-[#2D2424] p-4 rounded-2xl flex items-center justify-between border border-[#3A2E2E]">
                         <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-[#3D3329] text-field-gold' : 'bg-[#3D2929] text-field-gold'}`}>
                               {fu.type === 'Phone Call' ? <Phone size={20} /> : <CheckCircle size={20} />}
                            </div>
                            <div>
                               <h4 className="text-white font-bold">{photo?.siteName || 'Unknown Lead'}</h4>
                               <div className="flex items-center text-xs text-field-textMuted mt-1">
                                  <Clock size={12} className="mr-1" />
                                  {new Date(fu.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                               </div>
                            </div>
                         </div>
                         <div className="flex gap-2">
                            <button 
                              onClick={() => handleCall(fu.photoId)}
                              className="w-10 h-10 rounded-full bg-[#1A1515] text-field-gold flex items-center justify-center hover:bg-field-gold hover:text-black transition-colors"
                              title="Call Client"
                            >
                               <Phone size={18} />
                            </button>
                            <button 
                              onClick={() => handleDirections(fu.photoId)}
                              className="w-10 h-10 rounded-full bg-[#1A1515] text-field-gold flex items-center justify-center hover:bg-field-gold hover:text-black transition-colors"
                              title="Get Directions"
                            >
                               <Navigation size={18} />
                            </button>
                         </div>
                      </div>
                   )
                })
              )}
           </div>
        </div>

        {/* Recent Uploads Horizontal Scroll */}
        <div>
           <h3 className="text-lg font-bold text-white mb-4 px-1">Recent Uploads</h3>
           <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {myLeadPhotos.slice(0, 8).map(photo => {
                const imgUrl = photo.url;
                return (
                  <div 
                    key={photo.id} 
                    onClick={() => setFullscreenImage(imgUrl)}
                    className="min-w-[160px] w-[160px] h-[200px] rounded-xl relative overflow-hidden group cursor-pointer border border-[#3A2E2E] hover:border-field-gold transition-all"
                    title="Click photo to enlarge"
                  >
                      {imgUrl ? (
                        <img 
                          src={imgUrl}
                          alt={photo.siteName || photo.fileName}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#1A1515] text-[10px] text-gray-400 font-mono px-2 text-center">
                          No image
                        </div>
                      )}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                     <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded border border-white/20">
                        {getSafePhotoDate(photo.captureDate, photo.uploadDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                     </div>
                     <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-white-forced !text-white text-sm font-bold truncate">{photo.siteName || photo.fileName || 'Untitled Site'}</p>
                        <p className="text-[10px] text-field-gold mt-0.5 flex items-center gap-1 font-semibold">
                          Click to enlarge
                        </p>
                     </div>
                  </div>
                );
              })}
           </div>
        </div>

      </div>

      {/* Fullscreen Lightbox Modal */}
      {fullscreenImage && (
        <div 
          onClick={() => setFullscreenImage(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-fade-in"
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
              Click anywhere to close photo
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatWidget({ title, value, subtext, subtextColor, icon, highlight, variant, onClick }: any) {
   const bgClass = variant === 'danger' ? 'bg-[#3D2929]' : 'bg-[#2D2424]';
   return (
      <button 
         onClick={onClick}
         className={`${bgClass} p-4 rounded-2xl border border-[#3A2E2E] flex flex-col justify-between h-[110px] text-left hover:border-field-gold transition-colors active:scale-95 group`}
      >
         <div className="flex justify-between items-start w-full">
            <span className="text-xs font-bold text-field-textMuted uppercase">{title}</span>
            <div className="group-hover:scale-110 transition-transform">{icon}</div>
         </div>
         <div>
            <div className="text-3xl font-bold text-white mb-1">{value}</div>
            <div className={`text-xs ${subtextColor}`}>{subtext}</div>
         </div>
      </button>
   )
}
