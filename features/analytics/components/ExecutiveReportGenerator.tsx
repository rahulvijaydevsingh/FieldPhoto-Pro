import React, { useState } from 'react';
import { Photo, FollowUp, User } from '../../../types';
import { exportPhotosToExcel } from '../../../utils/exportUtils';
import { FileText, Download, CheckCircle, Sparkles, FileSpreadsheet } from 'lucide-react';

interface ExecutiveReportGeneratorProps {
  photos: Photo[];
  followUps: FollowUp[];
  teamMembers: User[];
}

export default function ExecutiveReportGenerator({ photos, followUps, teamMembers }: ExecutiveReportGeneratorProps) {
  const [downloaded, setDownloaded] = useState(false);

  const handleExportFullReport = () => {
    exportPhotosToExcel(photos, `FieldTrack_Executive_Operations_Report_${new Date().toISOString().split('T')[0]}`);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-[#3A2E2E] pb-3">
        <div className="flex items-center gap-2">
          <FileText className="text-[#D99026]" size={18} />
          <h4 className="font-bold text-sm text-white">Executive Field Operations Report Export</h4>
        </div>
        <span className="text-[10px] font-mono text-gray-400">XLSX / CSV Ready</span>
      </div>

      <p className="text-xs text-gray-300 leading-relaxed">
        Generate complete field audit records, site visit photo logs, lead status timestamps, and GPS accuracy breadcrumb audits in executive spreadsheet format.
      </p>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#1A1515] p-3 rounded-xl border border-[#3A2E2E]">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={20} className="text-emerald-400" />
          <div>
            <span className="text-xs font-bold text-white block">Full Operations Dataset</span>
            <span className="text-[10px] text-gray-400 font-mono">
              {photos.length} Photos • {followUps.length} Follow-Ups • {teamMembers.length} Staff
            </span>
          </div>
        </div>

        <button
          onClick={handleExportFullReport}
          className="w-full sm:w-auto px-4 py-2.5 bg-[#D99026] hover:bg-[#b57b17] text-black font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          {downloaded ? <CheckCircle size={14} /> : <Download size={14} />}
          {downloaded ? 'Report Downloaded!' : 'Export Executive Excel Report'}
        </button>
      </div>
    </div>
  );
}
