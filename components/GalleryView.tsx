import React, { useState, useMemo, useEffect } from 'react';
import { User, Photo } from '../types';
import { 
  Search, Download, X, Filter, Grid, List, CheckCircle, Calendar, ChevronDown, Share2, 
  Copy, MoreVertical, RefreshCw, CheckSquare, Square, Check, Eye, MapPin, Phone, Mail, 
  User as UserIcon, Building, ExternalLink, FileText, Tag, Shield, Clock, HardHat, ArrowLeft
} from 'lucide-react';
import { getSafePhotoDate, formatSafePhotoDate, formatSafePhotoDateTime } from '../services/dateUtils';
import { exportPhotosToExcel } from '../utils/exportUtils';

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
  
  // Inspect photo details modal
  const [inspectPhoto, setInspectPhoto] = useState<Photo | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  // View & Sort State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Filter State - Default to include all active statuses so leads are always visible
  const [dateFilter, setDateFilter] = useState<DateFilter>((initialDateFilter as DateFilter) || 'all');
  const [statusFilter, setStatusFilter] = useState<string[]>(['in-progress', 'new', 'quoted', 'won', 'lost', 'on-hold']);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);

  useEffect(() => {
    if (initialDateFilter) {
      setDateFilter(initialDateFilter as DateFilter);
    }
  }, [initialDateFilter]);

  // --- LOGIC ---

  const filteredPhotos = useMemo(() => {
    let result = photos.filter(p => {
      if (p.photoType === 'odometer' || p.photoType === 'attendance') {
        return false;
      }

      // 1. Base Permission Filter (Admins see everything, Staff sees their own submissions)
      if (user.role !== 'admin') {
        const isMyLead = p.uploaderId === user.id || 
                         (p.uploaderName && p.uploaderName.toLowerCase() === user.name.toLowerCase()) ||
                         (p.staffMember && p.staffMember.toLowerCase() === user.name.toLowerCase());
        if (!isMyLead) return false;
      }
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
        (p.staffMember?.toLowerCase().includes(lowerTerm)) ||
        (p.uploaderName?.toLowerCase().includes(lowerTerm)) ||
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
        const photoDate = getSafePhotoDate(p.captureDate, p.uploadDate).getTime();
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
      if (sortBy === 'newest') return getSafePhotoDate(b.captureDate, b.uploadDate).getTime() - getSafePhotoDate(a.captureDate, a.uploadDate).getTime();
      if (sortBy === 'oldest') return getSafePhotoDate(a.captureDate, a.uploadDate).getTime() - getSafePhotoDate(b.captureDate, b.uploadDate).getTime();
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
    if (user.role !== 'admin' && user.permissions?.canShare === false) {
      alert('You do not have permission to share lead details.');
      return;
    }

    const selectedItems = filteredPhotos.filter((photo) => selectedPhotos.includes(photo.id));
    const textToShare = selectedItems.length === 0
      ? `No lead photos selected.`
      : selectedItems.map((photo, index) => {
          const status = photo.status.replace('-', ' ');
          const staff = photo.staffMember || photo.uploaderName || 'Staff';
          return `${index + 1}. ${photo.siteName || 'Untitled Site'}\nPlus Code: ${photo.plusCode || 'Not available'}\nStatus: ${status}\nStaff: ${staff}`;
        }).join('\n\n');
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FieldPhoto Export',
          text: textToShare,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      navigator.clipboard.writeText(textToShare)
        .then(() => alert('Lead details copied to clipboard.'))
        .catch(() => alert(textToShare));
    }
  };

  const handleExport = () => {
    const canExport = user.role === 'admin' || user.permissions?.canBulkExport;
    if (!canExport) {
      alert('You do not have permission to export bulk lead data.');
      return;
    }

    const selected = filteredPhotos.filter((photo) => selectedPhotos.includes(photo.id));
    const exportRows = selected.length > 0 ? selected : filteredPhotos;
    exportPhotosToExcel(exportRows, 'FieldTrack_Gallery_Leads', {
      actorUserId: user.id,
      actorName: user.name,
      actorRole: user.role,
      selectedCount: selected.length,
    });
    onExport();
  };

  const toggleStatusFilter = (st: string) => {
     if (statusFilter.includes(st)) {
        setStatusFilter(statusFilter.filter(s => s !== st));
     } else {
        setStatusFilter([...statusFilter, st]);
     }
  };

  const togglePriorityFilter = (pr: string) => {
     if (priorityFilter.includes(pr)) {
        setPriorityFilter(priorityFilter.filter(p => p !== pr));
     } else {
        setPriorityFilter([...priorityFilter, pr]);
     }
  };

  return (
    <div className="min-h-screen bg-[#1A1515] text-white pb-24">
      {/* Header */}
      <div className="p-4 bg-[#2D2424] border-b border-[#3A2E2E] sticky top-0 z-30 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-[#1A1515] rounded-xl text-gray-300 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold">Photo Gallery</h1>
            <p className="text-xs text-gray-400">{filteredPhotos.length} {filteredPhotos.length === 1 ? 'Lead Photo' : 'Lead Photos'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${statusFilter.length < 6 || priorityFilter.length > 0 || dateFilter !== 'all' ? 'bg-field-gold text-black border-field-gold' : 'bg-[#1A1515] text-gray-300 border-[#3A2E2E] hover:border-gray-500'}`}
          >
            <Filter size={16} />
            <span>Filter</span>
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)} 
              className="p-2 bg-[#1A1515] hover:bg-black text-gray-300 hover:text-white rounded-xl border border-[#3A2E2E] transition-colors"
            >
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-12 w-48 bg-[#2D2424] border border-[#3A2E2E] rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
                <button onClick={handleSelectAll} className="w-full text-left px-4 py-2 text-xs hover:bg-[#1A1515] flex items-center gap-2 text-gray-200">
                  <CheckSquare size={14} /> Select All
                </button>
                <button onClick={handleDeselectAll} className="w-full text-left px-4 py-2 text-xs hover:bg-[#1A1515] flex items-center gap-2 text-gray-200">
                  <Square size={14} /> Deselect All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search & Sort Toolbar */}
      <div className="p-4 bg-[#231d1d] border-b border-[#3A2E2E] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search leads, sources, notes, staff..."
            className="w-full pl-9 pr-8 py-2 bg-[#1A1515] border border-[#3A2E2E] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-field-gold transition-colors"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-[#1A1515] p-1 rounded-xl border border-[#3A2E2E] flex items-center gap-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-field-gold text-black' : 'text-gray-400 hover:text-white'}`}
            >
              <Grid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-field-gold text-black' : 'text-gray-400 hover:text-white'}`}
            >
              <List size={16} />
            </button>
          </div>

          {/* Sort Menu */}
          <div className="relative">
            <button 
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="px-3 py-2 bg-[#1A1515] border border-[#3A2E2E] rounded-xl text-xs font-medium text-gray-300 hover:text-white flex items-center gap-1.5"
            >
              <span>Sort: {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'Priority'}</span>
              <ChevronDown size={14} />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-11 w-36 bg-[#2D2424] border border-[#3A2E2E] rounded-xl shadow-2xl py-1 z-40">
                {(['newest', 'oldest', 'priority'] as SortOption[]).map(s => (
                  <button 
                    key={s}
                    onClick={() => { setSortBy(s); setShowSortMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs capitalize ${sortBy === s ? 'text-field-gold font-bold bg-[#1A1515]' : 'text-gray-300 hover:bg-[#1A1515]'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {filteredPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-gray-500">
            <Search size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">No lead photos match your filter criteria</p>
            <button 
              onClick={() => { setSearchTerm(''); setDateFilter('all'); setStatusFilter(['in-progress', 'new', 'quoted', 'won', 'lost', 'on-hold']); setPriorityFilter([]); }} 
              className="mt-4 text-field-gold text-xs font-bold underline"
            >
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
                  className={`relative rounded-xl overflow-hidden aspect-[4/5] group border transition-all cursor-pointer ${isSelected ? 'border-field-gold ring-1 ring-field-gold' : 'border-[#3A2E2E] hover:border-gray-500'}`}
                >
                  <img 
                    src={photo.url} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                    loading="lazy" 
                    onClick={() => setInspectPhoto(photo)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent pointer-events-none"></div>
                  
                  {/* Selection Circle */}
                  <div className="absolute top-2 left-2 z-10">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleSelection(photo.id); }}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-field-gold border-field-gold text-black' : 'border-white/60 bg-black/40 text-white hover:bg-black/60'}`}
                    >
                      {isSelected ? <Check size={14} className="stroke-[3]" /> : <Square size={12} className="opacity-0 group-hover:opacity-100" />}
                    </button>
                  </div>

                  {/* View Details Action Button */}
                  <div className="absolute top-2 right-2 z-10 flex gap-1 items-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setInspectPhoto(photo); }}
                      className="p-1.5 bg-black/60 backdrop-blur-md hover:bg-field-gold hover:text-black text-white rounded-lg border border-white/20 transition-all shadow-md"
                      title="View Lead Details"
                    >
                      <Eye size={14} />
                    </button>
                  </div>

                  {/* Info Overlay */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 cursor-pointer" onClick={() => setInspectPhoto(photo)}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${photo.status === 'in-progress' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                        {photo.status.replace('_', ' ')}
                      </span>
                      {photo.priority === 'High' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded">
                          HIGH
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white-forced !text-white leading-tight truncate">{photo.siteName || 'Untitled Site'}</h3>
                    <p className="text-[10px] text-gray-300-forced !text-gray-300 truncate mt-0.5">{photo.leadSource ? `Source: ${photo.leadSource}` : 'Field Lead'}</p>
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
                      <span className="!text-gray-300">{formatSafePhotoDate(photo.captureDate, photo.uploadDate)}</span>
                      <span className="text-field-gold font-medium">{photo.staffMember || photo.uploaderName || 'Staff'}</span>
                    </p>
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
                  className={`flex gap-3 p-3 bg-[#2D2424] rounded-xl border ${isSelected ? 'border-field-gold' : 'border-[#3A2E2E]'} hover:border-gray-500 transition-all cursor-pointer`}
                  onClick={() => setInspectPhoto(photo)}
                >
                  <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                    <img src={photo.url} className="w-full h-full object-cover" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleSelection(photo.id); }}
                      className="absolute top-1 left-1 z-10"
                    >
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${isSelected ? 'bg-field-gold border-field-gold text-black' : 'border-white/60 bg-black/50 text-white'}`}>
                        {isSelected && <Check size={12} className="stroke-[3]" />}
                      </div>
                    </button>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-white font-bold truncate">{photo.siteName || 'Untitled Site'}</h3>
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${photo.priority === 'High' ? 'border-red-500 text-red-400 bg-red-500/10' : 'border-gray-600 text-gray-400'}`}>
                            {photo.priority || 'Normal'}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setInspectPhoto(photo); }}
                            className="p-1 bg-[#1A1515] text-field-gold hover:bg-field-gold hover:text-black rounded transition-colors ml-1"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-field-textMuted mt-1 truncate">Source: {photo.leadSource || 'Field Visit'}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{photo.notes ? `"${photo.notes}"` : 'No notes attached'}</p>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1 border-t border-[#3A2E2E]/50 mt-1">
                      <span>{formatSafePhotoDateTime(photo.captureDate, photo.uploadDate)}</span>
                      <span className="text-field-gold font-medium">By: {photo.staffMember || photo.uploaderName || 'Staff'}</span>
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
            {(user.role === 'admin' || user.permissions?.canShare !== false) && (
              <button 
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-[#1A1515] text-white flex items-center justify-center border border-[#3A2E2E] hover:border-field-gold hover:text-field-gold transition-colors"
              >
                <Share2 size={18} />
              </button>
            )}
            
            {(user.role === 'admin' || user.permissions?.canBulkExport) && (
              <button 
                onClick={handleExport}
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
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Filter Leads</h3>
              <button onClick={() => setShowFilters(false)}><X size={24} className="text-gray-400 hover:text-white"/></button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
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

              {/* Status */}
              <div>
                <label className="text-field-gold text-xs font-bold uppercase tracking-wider mb-3 block">Lead Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'in-progress', label: 'Active (In Progress)' },
                    { id: 'new', label: 'New Lead' },
                    { id: 'quoted', label: 'Quoted' },
                    { id: 'won', label: 'Won' },
                    { id: 'lost', label: 'Lost' },
                    { id: 'on-hold', label: 'On Hold' }
                  ].map(st => (
                    <button
                      key={st.id}
                      onClick={() => toggleStatusFilter(st.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${statusFilter.includes(st.id) ? 'bg-field-gold/20 border-field-gold text-field-gold' : 'bg-[#2D2424] border-[#3A2E2E] text-gray-400'}`}
                    >
                      <span>{st.label}</span>
                      {statusFilter.includes(st.id) && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-field-gold text-xs font-bold uppercase tracking-wider mb-3 block">Priority Level</label>
                <div className="flex gap-3">
                  {['High', 'Medium', 'Low'].map(p => (
                    <button 
                      key={p}
                      onClick={() => togglePriorityFilter(p)}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${priorityFilter.includes(p) ? 'border-field-gold bg-field-gold/20 text-field-gold' : 'border-[#3A2E2E] bg-[#2D2424] text-gray-400'}`}
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
                onClick={() => { setDateFilter('all'); setStatusFilter(['in-progress', 'new', 'quoted', 'won', 'lost', 'on-hold']); setPriorityFilter([]); setShowFilters(false); }}
                className="flex-1 py-3 border border-field-gold text-field-gold rounded-xl font-bold hover:bg-field-gold/10 transition-colors"
              >
                Clear All
              </button>
              <button 
                onClick={() => setShowFilters(false)}
                className="flex-1 py-3 bg-field-gold text-black rounded-xl font-bold hover:bg-[#b57b17] transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Inspector Modal */}
      {inspectPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl text-white">
            
            {/* Header */}
            <div className="p-4 border-b border-[#3A2E2E] flex items-center justify-between sticky top-0 bg-[#2D2424] z-10">
              <div className="flex items-center gap-2">
                <Tag className="text-field-gold" size={20} />
                <h2 className="text-lg font-bold truncate max-w-md">{inspectPhoto.siteName || 'Lead Details'}</h2>
              </div>
              <button 
                onClick={() => setInspectPhoto(null)} 
                className="p-1.5 hover:bg-[#1A1515] rounded-xl text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Image Banner */}
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-[#3A2E2E] group">
                <img src={inspectPhoto.url} className="w-full h-full object-cover" />
                <button 
                  onClick={() => setFullscreenImage(inspectPhoto.url)}
                  className="absolute bottom-3 right-3 bg-black/70 hover:bg-field-gold hover:text-black text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition-all"
                >
                  <Eye size={14} /> Enlarge Image
                </button>
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${inspectPhoto.status === 'in-progress' ? 'bg-green-500 text-black' : 'bg-amber-500 text-black'}`}>
                    {inspectPhoto.status.replace('_', ' ')}
                  </span>
                  {inspectPhoto.priority && (
                    <span className="text-xs font-bold px-2.5 py-1 bg-red-500 text-white rounded-md">
                      {inspectPhoto.priority} Priority
                    </span>
                  )}
                </div>
              </div>

              {/* Key Lead Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-[#1A1515] p-4 rounded-xl border border-[#3A2E2E]">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Posted By</span>
                  <span className="text-sm font-bold text-field-gold flex items-center gap-1 mt-0.5">
                    <UserIcon size={14} /> {inspectPhoto.staffMember || inspectPhoto.uploaderName || 'Staff Member'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Capture Date</span>
                  <span className="text-sm font-medium text-gray-200 flex items-center gap-1 mt-0.5">
                    <Clock size={14} /> {formatSafePhotoDate(inspectPhoto.captureDate, inspectPhoto.uploadDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Lead Source</span>
                  <span className="text-sm font-medium text-gray-200 block mt-0.5">
                    {inspectPhoto.leadSource || 'Field Search'}
                  </span>
                </div>
              </div>

              {/* Location & GPS */}
              {(inspectPhoto.site_lat || inspectPhoto.gps || inspectPhoto.plusCode) && (
                <div className="bg-[#1A1515] p-4 rounded-xl border border-[#3A2E2E] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-field-gold uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin size={16} /> Site Coordinates & Plus Code
                    </h4>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${inspectPhoto.site_lat || inspectPhoto.gps?.lat || 30.901},${inspectPhoto.site_lng || inspectPhoto.gps?.lng || 75.857}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-field-gold hover:underline flex items-center gap-1 font-bold"
                    >
                      Get Directions <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {inspectPhoto.plusCode && (
                      <div className="bg-[#2D2424] p-2.5 rounded-lg border border-[#3A2E2E]">
                        <span className="text-gray-400 block text-[10px]">CRM Plus Code</span>
                        <span className="font-mono text-field-gold font-bold">{inspectPhoto.plusCode}</span>
                      </div>
                    )}
                    <div className="bg-[#2D2424] p-2.5 rounded-lg border border-[#3A2E2E]">
                      <span className="text-gray-400 block text-[10px]">Verified GPS Coordinates</span>
                      <span className="font-mono text-gray-300">
                        {inspectPhoto.site_lat || inspectPhoto.gps?.lat || '30.901000'}, {inspectPhoto.site_lng || inspectPhoto.gps?.lng || '75.857300'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Contacts Met */}
              {inspectPhoto.peopleMet && inspectPhoto.peopleMet.length > 0 && (
                <div className="bg-[#1A1515] p-4 rounded-xl border border-[#3A2E2E] space-y-3">
                  <h4 className="text-xs font-bold text-field-gold uppercase tracking-wider flex items-center gap-1.5">
                    <UserIcon size={16} /> Contacts Met ({inspectPhoto.peopleMet.length})
                  </h4>
                  <div className="space-y-2">
                    {inspectPhoto.peopleMet.map((person, idx) => (
                      <div key={idx} className="bg-[#2D2424] p-3 rounded-lg border border-[#3A2E2E] flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm text-white">{person.name}</p>
                          <p className="text-xs text-field-textMuted">{person.designation || 'Contact Person'} {person.firmName ? `• ${person.firmName}` : ''}</p>
                        </div>
                        {person.phone && (
                          <a 
                            href={`tel:${person.phone}`}
                            className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-green-500 hover:text-black transition-colors"
                          >
                            <Phone size={12} /> {person.phone}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scope & Materials */}
              {(inspectPhoto.constructionStage || inspectPhoto.materialInterests) && (
                <div className="bg-[#1A1515] p-4 rounded-xl border border-[#3A2E2E] space-y-3">
                  <h4 className="text-xs font-bold text-field-gold uppercase tracking-wider flex items-center gap-1.5">
                    <HardHat size={16} /> Project Scope & Material Requirements
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {inspectPhoto.constructionStage && (
                      <div>
                        <span className="text-gray-400 block text-[10px]">Construction Stage</span>
                        <span className="font-medium text-white">{inspectPhoto.constructionStage}</span>
                      </div>
                    )}
                    {inspectPhoto.estimatedQuantity && (
                      <div>
                        <span className="text-gray-400 block text-[10px]">Est. Quantity / Scope</span>
                        <span className="font-medium text-white">{inspectPhoto.estimatedQuantity}</span>
                      </div>
                    )}
                  </div>
                  {inspectPhoto.materialInterests && inspectPhoto.materialInterests.length > 0 && (
                    <div>
                      <span className="text-gray-400 block text-[10px] mb-1.5">Interested Materials</span>
                      <div className="flex flex-wrap gap-1.5">
                        {inspectPhoto.materialInterests.map((mat, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 bg-field-gold/10 text-field-gold border border-field-gold/30 rounded-md font-medium">
                            {mat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {inspectPhoto.notes && (
                <div className="bg-[#1A1515] p-4 rounded-xl border border-[#3A2E2E]">
                  <h4 className="text-xs font-bold text-field-gold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <FileText size={16} /> Lead Notes & Observations
                  </h4>
                  <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{inspectPhoto.notes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#3A2E2E] bg-[#2D2424] flex justify-end gap-3 rounded-b-2xl">
              <button 
                onClick={() => setInspectPhoto(null)}
                className="px-5 py-2.5 bg-[#1A1515] hover:bg-gray-800 text-gray-300 font-bold rounded-xl text-sm border border-[#3A2E2E] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Zoom */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-fade-in" onClick={() => setFullscreenImage(null)}>
          <button 
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/30 transition-colors"
          >
            <X size={24} />
          </button>
          <img src={fullscreenImage} className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}
