
import React, { useState } from 'react';
import { User, Photo, FollowUp } from '../types';
import ReviewEditor from './ReviewEditor';
import { MapPin, Clock, ArrowRight, ArrowLeft, Trash2, FileText, Bookmark } from 'lucide-react';

interface Props {
  user: User;
  photos: Photo[];
  isOnline: boolean; // Added Prop
  leadSources: string[];
  personTypes: string[];
  constructionStages: string[];
  onUpdatePhoto: (photo: Photo) => void;
  onDeletePhoto: (photoId: string) => void;
  onAddFollowUp: (followUp: FollowUp) => void;
  onBack: () => void;
}

export default function PendingReviewsView({ user, photos, isOnline, leadSources, personTypes, constructionStages, onUpdatePhoto, onDeletePhoto, onAddFollowUp, onBack }: Props) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const pendingPhotos = photos
    .filter(p => p.status === 'new')
    .filter(p => {
      if (user.role === 'admin') return true;
      const userNameLower = (user.name || '').toLowerCase();
      return (
        p.uploaderId === user.id ||
        (p.uploaderName && p.uploaderName.toLowerCase() === userNameLower) ||
        (p.staffMember && p.staffMember.toLowerCase() === userNameLower)
      );
    })
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

  if (selectedPhoto) {
    return (
      <ReviewEditor 
        photo={selectedPhoto}
        user={user}
        isOnline={isOnline}
        leadSources={leadSources}
        personTypes={personTypes}
        constructionStages={constructionStages}
        existingPhotos={photos} // Pass all photos for duplicate check
        onCancel={() => setSelectedPhoto(null)}
        onDelete={() => {
          if (confirm(`Are you sure you want to delete this photo upload?`)) {
            onDeletePhoto(selectedPhoto.id);
            setSelectedPhoto(null);
          }
        }}
        onSaveDraft={(updatedDraftPhoto) => {
          onUpdatePhoto(updatedDraftPhoto);
        }}
        onSubmit={(updatedPhoto, followUp) => {
          onUpdatePhoto(updatedPhoto);
          onAddFollowUp(followUp);
          setSelectedPhoto(null);
        }}
      />
    );
  }

  return (
    <div className="bg-[#1A1515] min-h-screen text-white pb-20">
      <div className="p-6 border-b border-[#3A2E2E] flex items-center justify-between sticky top-0 bg-[#1A1515] z-10">
        <div className="flex items-center gap-3">
           <button onClick={onBack} className="p-1 hover:bg-[#2D2424] rounded-lg transition-colors"><ArrowLeft size={24} /></button>
           <h2 className="text-xl font-bold">Pending Reviews</h2>
        </div>
        <span className="bg-field-gold/20 text-field-gold px-3 py-1 rounded-full text-xs font-bold border border-field-gold/30">
          {pendingPhotos.length} Items
        </span>
      </div>

      {pendingPhotos.length === 0 ? (
        <div className="p-12 text-center text-field-textMuted">
          <p className="text-lg">No pending reviews.</p>
          <p className="text-sm mt-2">Great job keeping up!</p>
        </div>
      ) : (
        <div className="p-3 sm:p-4 space-y-4">
          {pendingPhotos.map(photo => {
            const hasDraft = photo.hasDraft || !!localStorage.getItem(`draft_lead_${photo.id}`);
            return (
              <div key={photo.id} className="bg-[#2D2424] rounded-xl border border-[#3A2E2E] overflow-hidden flex gap-3 sm:gap-4 p-3 hover:border-field-gold/30 transition-all">
                <div 
                  onClick={() => setFullscreenImage(photo.url || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop')}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-black flex-shrink-0 overflow-hidden relative cursor-pointer group/thumb hover:border hover:border-field-gold transition-all"
                  title="Click to view full enlarged image"
                >
                  <img 
                    src={photo.url || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop'} 
                    alt="Site" 
                    className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform" 
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[10px] text-white font-bold bg-black/60 px-2 py-0.5 rounded border border-white/30">
                      Enlarge
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-white text-xs sm:text-sm truncate leading-tight" title={photo.siteName || photo.fileName}>
                        {photo.siteName || photo.fileName}
                      </h3>
                      {hasDraft && (
                        <span className="bg-field-gold/20 text-field-gold border border-field-gold/30 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 flex-shrink-0">
                          <FileText size={10} /> Draft
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs mt-1">
                      <span className="text-field-gold font-semibold">Staff: {photo.staffMember || photo.uploaderName || 'Field Staff'}</span>
                      <span className="text-gray-500">•</span>
                      <div className="flex items-center text-red-400">
                        <MapPin size={12} className="mr-1 flex-shrink-0" />
                        <span className="truncate">{hasDraft ? 'Draft In Progress' : 'Action Needed'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={() => setSelectedPhoto(photo)}
                      className="flex-1 min-w-0 bg-field-gold text-black text-xs sm:text-sm font-bold py-2 px-2.5 sm:px-3 rounded-lg flex items-center justify-center shadow-lg shadow-field-gold/10 hover:bg-field-goldHover transition-colors truncate"
                    >
                      <span className="truncate">{hasDraft ? 'Resume Review' : 'Start Review'}</span>
                      <ArrowRight size={14} className="ml-1 flex-shrink-0" />
                    </button>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Move "${photo.siteName || photo.fileName}" to Recycle Bin? (Admins can restore or permanently delete it)`)) {
                          onDeletePhoto(photo.id);
                        }
                      }}
                      className="flex-shrink-0 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 p-2 rounded-lg flex items-center justify-center transition-colors"
                      title="Move to Recycle Bin"
                    >
                      <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {fullscreenImage && (
        <div 
          onClick={() => setFullscreenImage(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img 
              src={fullscreenImage} 
              alt="Enlarged Lead View" 
              className="max-w-full max-h-[80vh] object-contain rounded-xl border border-[#3A2E2E] shadow-2xl"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop';
              }}
            />
            <p className="text-xs text-gray-400 mt-3 bg-black/60 px-4 py-1.5 rounded-full border border-gray-700">
              Click anywhere to close full photo view
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


