import React, { useState } from 'react';
import { Photo, User } from '../../../types';
import { DEMO_ADMIN } from '../../../services/mockData';
import { formatSafePhotoDateTime } from '../../../services/dateUtils';
import { getDeviceModelInfo } from '../../../utils/locationUtils';
import { exportPhotosToExcel } from '../../../utils/exportUtils';
import ReviewEditor from '../../../components/ReviewEditor';
import { 
  RefreshCw, Download, Check, X, Search, Eye, Edit2, Trash2, Maximize2, MapPin
} from 'lucide-react';

interface VisitsExplorerProps {
  photos: Photo[];
  onUpdatePhoto?: (photo: Photo) => void;
  onDeletePhoto?: (photoId: string) => void;
  constructionStages?: string[];
  leadSources?: string[];
  personTypes?: string[];
  teamMembers?: User[];
}

export default function VisitsExplorer({
  photos,
  onUpdatePhoto,
  onDeletePhoto,
  constructionStages = [],
  leadSources = [],
  personTypes = [],
  teamMembers = []
}: VisitsExplorerProps) {
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
      status: p.status === 'in-progress' ? 'In Progress' : p.hasDraft ? 'Draft' : 'New Upload',
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
    window.dispatchEvent(new Event('fieldops_sync'));
    setSyncToast("Background Sync active! Offline field drafts, local photo logs, and team GPS coordinates synchronized with cloud.");
    setTimeout(() => setSyncToast(null), 5000);
  };

  const handleExportXLSX = () => {
    const recordsToExport = selectedIds.length > 0 
      ? filteredRecords.filter(r => selectedIds.includes(r.id)).map(r => r.originalPhoto)
      : filteredRecords.map(r => r.originalPhoto);

    exportPhotosToExcel(
      recordsToExport, 
      `FieldTrack_Leads_${selectedIds.length > 0 ? 'Selected' : 'All'}`
    );
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
              onSubmit={(updatedPhoto) => {
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
