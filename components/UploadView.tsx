
import React, { useState, useEffect } from 'react';
import { User, Photo } from '../types';
import { Camera, Image as ImageIcon, WifiOff, X, Pause, Play, Trash2, ArrowRight } from 'lucide-react';

interface Props {
  user: User;
  onUpload: (photo: Photo) => void;
  onViewPending: () => void;
}

export default function UploadView({ user, onUpload, onViewPending }: Props) {
  const [uploads, setUploads] = useState<{id: string, name: string, progress: number, status: 'uploading' | 'waiting' | 'done', url: string}[]>([]);

  // Simulate file handling
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newUploads = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      progress: 0,
      status: 'waiting' as const,
      url: URL.createObjectURL(file),
      file: file
    }));

    setUploads(prev => [...newUploads, ...prev]);

    // Start simulating upload for each
    newUploads.forEach(upload => {
      simulateUpload(upload.id, upload.file);
    });
  };

  const simulateUpload = (id: string, file: File) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Complete upload
        setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: 100, status: 'done' } : u));
        
        // Actually add to app data
        setTimeout(() => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = typeof reader.result === 'string' && reader.result.startsWith('data:image')
              ? reader.result 
              : 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop';
            
            const newPhoto: Photo = {
              id: 'lead_' + Math.random().toString(36).substr(2, 9),
              url: dataUrl,
              fileName: file.name,
              siteName: file.name.replace(/\.[^/.]+$/, "") || 'New Site Visit',
              uploadDate: new Date().toISOString(),
              captureDate: new Date().toISOString(),
              uploaderId: user.id,
              uploaderName: user.name,
              status: 'new',
              syncStatus: 'synced',
              site_lat: 30.901000,
              site_lng: 75.857300,
              gps: { lat: 30.901000, lng: 75.857300 }
            };
            onUpload(newPhoto);
          };
          reader.readAsDataURL(file);
        }, 300);

      } else {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, progress, status: 'uploading' } : u));
      }
    }, 400);
  };

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="bg-[#1A1515] min-h-screen pb-20 p-4">
      {/* Offline Banner */}
      <div className="bg-[#3A2E2E] border border-orange-500/30 rounded-lg p-3 flex items-center gap-3 mb-6 shadow-lg shadow-black/50">
        <WifiOff className="text-field-gold" size={20} />
        <span className="text-field-gold text-sm font-medium">Offline Mode: Photos will sync when online</span>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
          className="aspect-square bg-[#2D2424] border border-[#3A2E2E] rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-field-gold hover:bg-[#352b2b] transition-all group relative overflow-hidden"
          onClick={() => document.getElementById('camera-input')?.click()}
        >
          {/* Decorative Circles */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-20 h-20 rounded-full border-2 border-field-gold flex items-center justify-center text-field-gold shadow-[0_0_15px_rgba(217,144,38,0.2)] group-hover:scale-110 transition-transform">
             <Camera size={40} />
          </div>
          <div className="text-center">
             <h3 className="text-white font-bold text-lg leading-tight">Take<br/>Photo</h3>
          </div>
        </button>

        <button 
           className="aspect-square bg-[#2D2424] border border-[#3A2E2E] rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-field-gold hover:bg-[#352b2b] transition-all group relative overflow-hidden"
           onClick={() => document.getElementById('gallery-input')?.click()}
        >
          <div className="w-20 h-20 rounded-full border-2 border-field-gold flex items-center justify-center text-field-gold shadow-[0_0_15px_rgba(217,144,38,0.2)] group-hover:scale-110 transition-transform">
             <ImageIcon size={40} />
          </div>
          <div className="text-center">
             <h3 className="text-white font-bold text-lg leading-tight">Choose from<br/>Gallery</h3>
          </div>
        </button>

        {/* Hidden Inputs */}
        <input 
          type="file" 
          id="camera-input" 
          accept="image/*" 
          capture="environment"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input 
          type="file" 
          id="gallery-input" 
          accept="image/*" 
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Pending Summary Card */}
      <div 
         onClick={onViewPending}
         className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-4 flex items-center justify-between mb-8 group cursor-pointer hover:border-field-gold/50 transition-colors"
      >
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#1A1515] rounded-lg flex items-center justify-center text-field-gold border border-[#3A2E2E]">
               <ImageIcon size={24} />
               <span className="absolute top-[-2px] right-[-2px] flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-field-gold opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-field-gold"></span>
               </span>
            </div>
            <div>
               <h3 className="text-white font-bold">Photos Pending</h3>
               <p className="text-field-textMuted text-xs">Awaiting manager review</p>
            </div>
         </div>
         <div className="flex items-center text-field-gold text-sm font-medium">
            Review <ArrowRight size={16} className="ml-1" />
         </div>
      </div>

      {/* Upload List */}
      <div className="space-y-4">
         <h3 className="text-white font-bold text-lg flex items-center gap-2">
            Uploading {uploads.filter(u => u.status !== 'done').length} items...
            <span className="w-2 h-2 bg-field-gold rounded-full animate-pulse"></span>
         </h3>

         {uploads.map(upload => (
            <div key={upload.id} className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-3 flex gap-3 relative overflow-hidden">
               {/* Progress Bar Background */}
               <div 
                  className="absolute bottom-0 left-0 h-1 bg-field-gold transition-all duration-300" 
                  style={{ width: `${upload.progress}%` }}
               ></div>

               <div className="w-16 h-16 bg-black rounded-lg overflow-hidden flex-shrink-0">
                  <img src={upload.url} className="w-full h-full object-cover" />
               </div>
               
               <div className="flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-1">
                     <h4 className="text-white font-medium text-sm truncate max-w-[150px]">{upload.name}</h4>
                     {upload.status === 'done' ? (
                        <span className="text-xs text-green-500 font-bold">100%</span>
                     ) : (
                        <span className="text-xs text-field-gold font-bold">{Math.round(upload.progress)}%</span>
                     )}
                  </div>
                  
                  {upload.status === 'waiting' && <span className="text-xs text-field-textMuted">Waiting...</span>}
                  {upload.status === 'uploading' && <span className="text-xs text-field-gold animate-pulse">Uploading...</span>}
                  {upload.status === 'done' && <span className="text-xs text-green-500">Complete</span>}
               </div>

               <div className="flex items-center gap-2 pr-2">
                  {upload.status !== 'done' && (
                     <button className="text-field-textMuted hover:text-white" onClick={() => removeUpload(upload.id)}>
                        <X size={18} />
                     </button>
                  )}
                  {upload.status === 'waiting' && <button className="text-field-textMuted"><Pause size={18} /></button>}
               </div>
            </div>
         ))}
      </div>
    </div>
  );
}
