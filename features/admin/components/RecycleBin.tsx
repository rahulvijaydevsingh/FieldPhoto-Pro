import React, { useState } from 'react';
import { Trash2, Search, RotateCcw, X } from 'lucide-react';
import { RecycleItem } from '../../../types';

interface RecycleBinProps {
  items: RecycleItem[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onEmpty: () => void;
}

export default function RecycleBin({
  items,
  onRestore,
  onPermanentDelete,
  onEmpty
}: RecycleBinProps) {
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
