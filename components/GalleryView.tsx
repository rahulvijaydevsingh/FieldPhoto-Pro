
import React, { useState, useMemo, useEffect } from 'react';
import { User, Photo } from '../types';
import { Search, Download, X, Filter, Grid, List, CheckCircle, Calendar, ChevronDown, Share2, Copy, MoreVertical, RefreshCw, CheckSquare, Square, Check } from 'lucide-react';

interface Props {
  user: User;
  photos: Photo[];
  initialDateFilter?: string;
  onExport: () => void;
  onBack: () => void;
}

type SortOption = 'newest' | 'oldest' | 'priority';
type DateFilter = 'all' | 'today' | 'week' | 'month';
type ViewMode = 'grid' | 'list';

export default function GalleryView({ user, photos, initialDateFilter, onExport, onBack }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // View & Sort State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Filter State
  const [dateFilter, setDateFilter] = useState<DateFilter>((initialDateFilter as DateFilter) || 'all');
  // Updated status filters
  const [statusFilter, setStatusFilter] = useState<string[]>(['in-progress', 'new']);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);

  useEffect(() => {
    if (initialDateFilter) {
      setDateFilter(initialDateFilter as DateFilter);
    }
  }, [initialDateFilter]);

  // --- LOGIC ---

  const filteredPhotos = useMemo(() => {
    let result = photos.filter(p => {
      // 1. Base Permission Filter
      if (user.role !== 'admin' && p.uploaderId !== user.id) return false;
      return true;
    });

    // 2. Search Filter (Deep Search)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(p => 
        (p.siteName?.toLowerCase().includes(lowerTerm)) ||
        (p.fileName?.toLowerCase().includes(lowerTerm)) ||
        (p.leadSource?.toLowerCase().includes(lowerTerm)) ||
        (p.notes?.toLowerCase().includes(lowerTerm)) ||
        (p.priority?.toLowerCase().includes(lowerTerm)) ||
        (p.status?.toLowerCase().includes(lowerTerm)) ||
        (p.plusCode?.toLowerCase().includes(lowerTerm)) ||
        // Search inside People Met array
        (p.peopleMet?.some(person => 
          person.name.toLowerCase().includes(lowerTerm) || 
          person.phone.includes(lowerTerm) || 
          person.designation.toLowerCase().includes(lowerTerm)
        ))
      );
    }

    // 3. Status Filter
    if (statusFilter.length > 0) {
      result = result.filter(p => statusFilter.includes(p.status));
    }

    // 4. Priority Filter
    if (priorityFilter.length > 0) {
      result = result.filter(p => p.priority && priorityFilter.includes(p.priority));
    }

    // 5. Date Filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      
      result = result.filter(p => {
        const photoDate = new Date(p.captureDate).getTime();
        if (dateFilter === 'today') {
           return photoDate >= today;
        } else if (dateFilter === 'week') {
           const weekAgo = today - (7 * 24 * 60 * 60 * 1000);
           return photoDate >= weekAgo;
        } else if (dateFilter === 'month') {
           const monthAgo = today - (30 * 24 * 60 * 60 * 1000);
           return photoDate >= monthAgo;
        }
        return true;
      });
    }

    // 6. Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.captureDate).getTime() - new Date(a.captureDate).getTime();
      if (sortBy === 'oldest') return new Date(a.captureDate).getTime() - new Date(b.captureDate).getTime();
      if (sortBy === 'priority') {
         const pMap: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
         return (pMap[b.priority || ''] || 0) - (pMap[a.priority || ''] || 0);
      }
      return 0;
    });

    return result;
  }, [photos, user, searchTerm, statusFilter, priorityFilter, dateFilter, sortBy]);


  // --- HANDLERS ---

  const toggleSelection = (id: string) => {
     if (selectedPhotos.includes(id)) {
        setSelectedPhotos(selectedPhotos.filter(pid => pid !== id));
     } else {
        setSelectedPhotos([...selectedPhotos, id]);
     }
  };

  const handleSelectAll = () => {
    setSelectedPhotos(filteredPhotos.map(p => p.id));
    setShowMenu(false);
  };

  const handleDeselectAll = () => {
    setSelectedPhotos([]);
    setShowMenu(false);
  };

  const handleShare = async () => {
    const textToShare = `I've selected ${selectedPhotos.length} photos for the project.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FieldPhoto Export',
          text: textToShare,
          url: window.location.href, // In a real app, this would be a deep link
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      // Fallback
      alert(`Copied to clipboard: ${textToShare}`);
    }
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const togglePriorityFilter = (priority: string) => {
    setPriorityFilter(prev => 
      prev.includes(priority) ? prev.filter(s => s !== priority) : [...prev, priority]
    );
  };

  return (
    <div className="bg-[#1A1515] min-h-screen text-white relative pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#1A1515]/95 backdrop-blur border-b border-[#2D2424] px-4 py-4 shadow-xl">
         <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Photo Gallery ({filteredPhotos.length})</h2>
            
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)} 
                className="text-field-gold p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <MoreVertical size={24} />
              </button>
              
              {/* Context Menu */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#2D2424] border border-[#3A2E2E] rounded-xl shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                   <button 
                      onClick={handleSelectAll} 
                      className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm flex items-center gap-2 text-white"
                    >
                      <CheckSquare size={16} className="text-field-gold" /> Select All
                   </button>
                   <button 
                      onClick={handleDeselectAll} 
                      className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm flex items-center gap-2 text-white"
                    >
                      <Square size={16} className="text-field-gold" /> Deselect All
                   </button>
                   <div className="h-px bg-[#3A2E2E] my-1"></div>
                   <button 
                      onClick={() => { setShowMenu(false); setSearchTerm(''); setDateFilter('all'); }} 
                      className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm flex items-center gap-2 text-white"
                   >
                      <RefreshCw size={16} className="text-field-gold" /> Reset Filters
                   </button>
                </div>
              )}
            </div>
         </div>
         
         {/* Search Bar */}
         <div className="relative mb-4">
            <Search className="absolute left-3 top-3 text-gray-500" size={18} />
            <input 
               type="text" 
               placeholder="Search by name, phone, notes, location..." 
               className="w-full bg-[#110C0C] border border-[#3A2E2E] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-field-gold outline-none placeholder-gray-600 transition-colors"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
            />
         </div>

         {/* Filter Chips & View Toggle */}
         <div className="flex items-center justify-between z-10 relative">
             
             {/* Sort Dropdown Group */}
             <div className="relative mr-2 flex-shrink-0">
                 <button 
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-1 bg-[#2D2424] border border-[#3A2E2E] rounded-full px-3 py-2 text-xs text-white whitespace-nowrap active:scale-95 transition-transform"
                 >
                    <span className="text-field-gold"><List size={14}/></span> 
                    Sort: <span className="capitalize text-field-gold ml-1">{sortBy}</span> 
                    <ChevronDown size={12}/>
                 </button>
                 
                 {/* Sort Menu - Positioned absolutely relative to this button */}
                 {showSortMenu && (
                    <div className="absolute top-full left-0 mt-2 w-40 bg-[#2D2424] border border-[#3A2E2E] rounded-lg shadow-2xl z-50 overflow-hidden">
                       {['newest', 'oldest', 'priority'].map(opt => (
                          <button 
                            key={opt}
                            onClick={() => { setSortBy(opt as SortOption); setShowSortMenu(false); }}
                            className={`w-full text-left px-4 py-3 text-xs capitalize hover:bg-white/5 border-b border-[#3A2E2E]/50 last:border-0 ${sortBy === opt ? 'text-field-gold font-bold bg-field-gold/10' : 'text-gray-300'}`}
                          >
                             {opt}
                          </button>
                       ))}
                    </div>
                 )}
             </div>

            {/* Scrollable Filters */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar items-center flex-1">
               <button 
                  onClick={() => setShowFilters(true)}
                  className={`flex items-center gap-1 bg-[#2D2424] border rounded-full px-3 py-1.5 text-xs text-white whitespace-nowrap transition-colors ${
                    (statusFilter.length < 2 || priorityFilter.length > 0 || dateFilter !== 'all') 
                      ? 'border-field-gold text-field-gold bg-field-gold/10' 
                      : 'border-[#3A2E2E] hover:border-field-gold'
                  }`}
               >
                  <Filter size={12}/> Filters 
                  {(statusFilter.length < 2 || priorityFilter.length > 0 || dateFilter !== 'all') && (
                     <span className="ml-1 w-2 h-2 rounded-full bg-field-gold inline-block"></span>
                  )}
               </button>
               
               {/* Quick Date Filters */}
               {['today', 'week'].map(d => (
                 <button 
                    key={d}
                    onClick={() => setDateFilter(dateFilter === d ? 'all' : d as DateFilter)}
                    className={`px-3 py-1.5 rounded-full text-xs capitalize whitespace-nowrap border transition-colors ${dateFilter === d ? 'bg-field-gold text-black border-field-gold font-bold' : 'bg-[#2D2424] border-[#3A2E2E] text-gray-400'}`}
                 >
                    {d}
                 </button>
               ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-[#2D2424] rounded-lg p-1 border border-[#3A2E2E] ml-2 flex-shrink-0">
               <button 
                 onClick={() => setViewMode('grid')}
                 className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-field-gold text-black' : 'text-gray-400 hover:text-white'}`}
               >
                 <Grid size={16}/>
               </button>
               <button 
                 onClick={() => setViewMode('list')}
                 className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-field-gold text-black' : 'text-gray-400 hover:text-white'}`}
               >
                 <List size={16}/>
               </button>
            </div>
         </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
         {filteredPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-gray-500">
               <Search size={48} className="mb-4 opacity-20" />
               <p>No photos match your criteria</p>
               <button onClick={() => { setSearchTerm(''); setDateFilter('all'); setStatusFilter(['in-progress', 'new']); setPriorityFilter([]); }} className="mt-4 text-field-gold text-sm underline">
                  Clear all filters
               </button>
            </div>
         ) : viewMode === 'grid' ? (
            // GRID VIEW
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
               {filteredPhotos.map(photo => {
                  const isSelected = selectedPhotos.includes(photo.id);
                  return (
                     <div 
                        key={photo.id} 
                        className={`relative rounded-xl overflow-hidden aspect-[4/5] group border transition-all ${isSelected ? 'border-field-gold ring-1 ring-field-gold' : 'border-transparent'}`}
                        onClick={() => toggleSelection(photo.id)}
                     >
                        <img src={photo.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                        
                        {/* Selection Circle */}
                        <div className="absolute top-2 left-2 z-10">
                           <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-field-gold border-field-gold' : 'border-white/50 bg-black/20'}`}>
                              {isSelected && <Check size={14} className="text-black" />}
                           </div>
                        </div>

                        {/* Status/Priority Indicators */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                           <div className={`w-3 h-3 rounded-full border-2 border-black ${photo.status === 'in-progress' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                           {photo.priority === 'High' && <div className="text-[8px] bg-red-500 text-white px-1.5 rounded border border-black">HIGH</div>}
                        </div>

                        {/* Info Overlay */}
                        <div className="absolute bottom-3 left-3 right-3">
                           <h3 className="text-sm font-bold text-white leading-tight mb-0.5 truncate">{photo.siteName || 'Untitled Site'}</h3>
                           <p className="text-[10px] text-gray-300 truncate">{photo.leadSource || 'Unknown Source'}</p>
                           <p className="text-[10px] text-gray-400 mt-1">{new Date(photo.captureDate).toLocaleDateString()}</p>
                        </div>
                     </div>
                  );
               })}
            </div>
         ) : (
            // LIST VIEW
            <div className="space-y-3">
               {filteredPhotos.map(photo => {
                   const isSelected = selectedPhotos.includes(photo.id);
                   return (
                     <div 
                        key={photo.id} 
                        onClick={() => toggleSelection(photo.id)}
                        className={`flex gap-4 p-3 bg-[#2D2424] rounded-xl border ${isSelected ? 'border-field-gold' : 'border-[#3A2E2E]'} transition-all`}
                     >
                        <div className="relative w-24 h-24 flex-shrink-0">
                           <img src={photo.url} className="w-full h-full object-cover rounded-lg" />
                           <div className="absolute top-1 left-1">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-field-gold border-field-gold' : 'border-white/50 bg-black/40'}`}>
                                 {isSelected && <Check size={12} className="text-black" />}
                              </div>
                           </div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                           <div className="flex justify-between items-start">
                              <h3 className="text-white font-bold truncate pr-2">{photo.siteName || 'Untitled'}</h3>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${photo.priority === 'High' ? 'border-red-500 text-red-400 bg-red-500/10' : 'border-gray-600 text-gray-400'}`}>
                                 {photo.priority || 'Normal'}
                              </span>
                           </div>
                           <p className="text-xs text-field-textMuted mt-1 truncate">Source: {photo.leadSource}</p>
                           <p className="text-xs text-gray-500 mt-0.5">{photo.notes ? `"${photo.notes.substring(0, 40)}..."` : 'No notes'}</p>
                           <div className="flex justify-between items-end mt-2">
                              <span className="text-[10px] text-gray-500">{new Date(photo.captureDate).toLocaleString()}</span>
                              <span className={`text-[10px] capitalize ${photo.status === 'in-progress' ? 'text-green-500' : 'text-orange-400'}`}>{photo.status.replace('_', ' ')}</span>
                           </div>
                        </div>
                     </div>
                   );
               })}
            </div>
         )}
      </div>

      {/* Bottom Selection Bar */}
      {selectedPhotos.length > 0 && (
         <div className="fixed bottom-0 left-0 right-0 bg-[#2D2424] border-t border-[#3A2E2E] p-4 pb-8 md:pb-4 flex items-center justify-between z-50 animate-slide-up shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div>
               <p className="text-white font-bold">{selectedPhotos.length} Selected</p>
               <button onClick={() => setSelectedPhotos([])} className="text-field-gold text-xs hover:underline">Deselect All</button>
            </div>
            <div className="flex gap-3">
               <button 
                  onClick={handleShare}
                  className="w-10 h-10 rounded-full bg-[#1A1515] text-white flex items-center justify-center border border-[#3A2E2E] hover:border-field-gold hover:text-field-gold transition-colors"
               >
                  <Share2 size={18} />
               </button>
               
               {/* ROLE BASED EXPORT: Only Admin can see this */}
               {user.role === 'admin' && (
                  <button 
                     onClick={onExport}
                     className="bg-field-gold text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#b57b17] transition-colors shadow-lg shadow-field-gold/20"
                  >
                     <Download size={16} /> Export CSV
                  </button>
               )}
            </div>
         </div>
      )}

      {/* Filter Drawer */}
      {showFilters && (
         <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowFilters(false)}>
            <div 
               className="bg-[#1C1818] w-full max-w-md rounded-t-2xl p-6 border-t border-field-gold/20 animate-slide-up shadow-2xl"
               onClick={e => e.stopPropagation()} // Prevent close on content click
            >
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white">Filters</h3>
                  <button onClick={() => setShowFilters(false)}><X size={24} className="text-gray-400 hover:text-white"/></button>
               </div>

               <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                  {/* Date Range */}
                  <div>
                     <label className="text-field-gold text-xs font-bold uppercase tracking-wider mb-3 block">Date Range</label>
                     <div className="flex gap-2 flex-wrap">
                        {['all', 'today', 'week', 'month'].map(d => (
                           <button 
                              key={d}
                              onClick={() => setDateFilter(d as DateFilter)}
                              className={`px-4 py-2 rounded-full text-sm capitalize transition-colors ${dateFilter === d ? 'bg-field-gold text-black font-bold' : 'bg-[#2D2424] text-gray-400 border border-[#3A2E2E]'}`}
                           >
                              {d}
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Photo Status */}
                  <div>
                     <label className="text-field-gold text-xs font-bold uppercase tracking-wider mb-3 block">Photo Status</label>
                     <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-white/5">
                           <div 
                              onClick={() => toggleStatusFilter('in-progress')}
                              className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${statusFilter.includes('in-progress') ? 'bg-field-gold border-field-gold' : 'border-gray-600'}`}
                           >
                              {statusFilter.includes('in-progress') && <Check size={14} className="text-black"/>}
                           </div>
                           <span className="text-white">Active (In Progress)</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-white/5">
                           <div 
                              onClick={() => toggleStatusFilter('new')}
                              className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${statusFilter.includes('new') ? 'bg-field-gold border-field-gold' : 'border-gray-600'}`}
                           >
                              {statusFilter.includes('new') && <Check size={14} className="text-black"/>}
                           </div>
                           <span className="text-white">New (Pending)</span>
                        </label>
                     </div>
                  </div>

                  {/* Priority Level */}
                  <div>
                     <label className="text-field-gold text-xs font-bold uppercase tracking-wider mb-3 block">Priority Level</label>
                     <div className="flex gap-3">
                        {['High', 'Medium', 'Low'].map(p => (
                           <button 
                              key={p}
                              onClick={() => togglePriorityFilter(p)}
                              className={`flex-1 py-3 rounded-lg border text-sm flex items-center justify-center gap-2 transition-colors ${priorityFilter.includes(p) ? 'border-field-gold bg-field-gold/10 text-field-gold' : 'border-[#3A2E2E] bg-[#2D2424] text-gray-400'}`}
                           >
                              <div className={`w-2 h-2 rounded-full ${p === 'High' ? 'bg-red-500' : p === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                              {p}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="flex gap-4 mt-8 pt-4 border-t border-[#3A2E2E]">
                  <button 
                     onClick={() => { setDateFilter('all'); setStatusFilter(['in-progress', 'new']); setPriorityFilter([]); setShowFilters(false); }}
                     className="flex-1 py-3 border border-field-gold text-field-gold rounded-lg font-bold hover:bg-field-gold/10 transition-colors"
                  >
                     Clear All
                  </button>
                  <button 
                     onClick={() => setShowFilters(false)}
                     className="flex-1 py-3 bg-field-gold text-black rounded-lg font-bold hover:bg-[#b57b17] transition-colors"
                  >
                     Apply Filters
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
