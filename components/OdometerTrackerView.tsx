import React, { useState, useEffect, useMemo } from 'react';
import { User, OdometerReading } from '../types';
import { getLocalOdometerReadings, calculateDailyTripKm, updateOdometerStatus, deleteOdometerReading } from '../repositories/odometerRepository';
import OdometerEntryModal from './OdometerEntryModal';
import { Gauge, Car, Calendar, Plus, MapPin, Camera, Clock, Navigation, CheckCircle2, User as UserIcon, ShieldCheck, AlertTriangle, Trash2, Check, X } from 'lucide-react';

interface OdometerTrackerViewProps {
  currentUser: User;
  teamMembers?: User[];
}

export default function OdometerTrackerView({ currentUser, teamMembers = [] }: OdometerTrackerViewProps) {
  const [readings, setReadings] = useState<OdometerReading[]>([]);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>(currentUser.role === 'admin' ? 'all' : currentUser.id);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verificationMode, setVerificationMode] = useState<'manual' | 'auto'>('manual');

  useEffect(() => {
    loadReadings();
  }, []);

  const loadReadings = () => {
    const list = getLocalOdometerReadings();
    setReadings(list);
  };

  const filteredReadings = useMemo(() => {
    return readings.filter(r => {
      const matchUser = selectedUserFilter === 'all' || r.userId === selectedUserFilter;
      const rDate = new Date(r.timestamp).toISOString().split('T')[0];
      const matchDate = !selectedDateFilter || rDate === selectedDateFilter;
      return matchUser && matchDate;
    });
  }, [readings, selectedUserFilter, selectedDateFilter]);

  const dailyKmMetrics = useMemo(() => {
    return calculateDailyTripKm(readings, selectedUserFilter, selectedDateFilter || new Date().toISOString().split('T')[0]);
  }, [readings, selectedUserFilter, selectedDateFilter]);

  return (
    <div className="space-y-6 text-white">
      {/* Top Banner & Quick Log Button */}
      <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3A2E2E] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#D99026]/10 border border-[#D99026]/30 rounded-xl text-[#D99026]">
              <Gauge size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">Staff Odometer & Vehicle Mileage Logs</h3>
                {currentUser.role === 'admin' && (
                  <span className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded-full border ${
                    verificationMode === 'auto'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {verificationMode === 'auto' ? '⚡ AI Auto-Verification' : '🛡️ Manual Admin Review'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Track start & end day vehicle odometer readings with compressed GPS watermarked photo proof</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Manual / Auto Toggle (Admin Only) */}
            {currentUser.role === 'admin' && (
              <div className="bg-[#1A1515] p-1 rounded-xl border border-[#3A2E2E] flex items-center gap-1">
                <button
                  onClick={() => setVerificationMode('manual')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    verificationMode === 'manual'
                      ? 'bg-[#D99026] text-black shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Manual Mode: Admin reviews photo proof & passes reading"
                >
                  Manual Review
                </button>
                <button
                  onClick={() => setVerificationMode('auto')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    verificationMode === 'auto'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Auto AI Mode: Gemini OCR automatically extracts KM digits & auto-approves"
                >
                  Auto AI OCR
                </button>
              </div>
            )}

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-[#D99026] hover:bg-[#b8781e] text-black font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5"
            >
              <Plus size={16} />
              Log Reading
            </button>
          </div>
        </div>

        {/* Filters & Daily Mileage Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* User Filter (Admin only dropdown / Staff locked) */}
          <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E] space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
              <UserIcon size={12} /> {currentUser.role === 'admin' ? 'Filter Staff' : 'Logged-In Staff'}
            </span>
            {currentUser.role === 'admin' ? (
              <select
                value={selectedUserFilter}
                onChange={e => setSelectedUserFilter(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#1A1515]">All Field Staff</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id} className="bg-[#1A1515]">{m.name}</option>
                ))}
              </select>
            ) : (
              <div className="text-xs font-bold text-white flex items-center justify-between pt-0.5">
                <span>{currentUser.name}</span>
                <span className="text-[10px] font-mono text-[#D99026] bg-[#D99026]/10 px-1.5 py-0.5 rounded border border-[#D99026]/30 uppercase font-semibold">
                  Field Staff
                </span>
              </div>
            )}
          </div>

          {/* Date Filter */}
          <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E] space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
              <Calendar size={12} /> Log Date
            </span>
            <input
              type="date"
              value={selectedDateFilter}
              onChange={e => setSelectedDateFilter(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-white font-mono focus:outline-none"
            />
          </div>

          {/* Daily Total Distance Traveled */}
          <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E] space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Calculated Day Mileage</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-emerald-400 font-mono">
                {dailyKmMetrics.totalKm.toFixed(1)} KM
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {dailyKmMetrics.startKm !== undefined ? `Start: ${dailyKmMetrics.startKm}` : ''}
              </span>
            </div>
          </div>

          {/* Verified Readings Count */}
          <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E] space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Readings Captured</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-[#D99026] font-mono">
                {filteredReadings.length}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 size={11} /> GPS Verified
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Odometer Log Stream Grid */}
      {filteredReadings.length === 0 ? (
        <div className="text-center py-16 bg-[#2D2424] rounded-xl border border-[#3A2E2E] space-y-3">
          <Car size={42} className="mx-auto text-gray-600 mb-2" />
          <h4 className="text-base font-bold text-white">No Odometer Logs for Selected Filter</h4>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Field staff log odometer readings when starting their morning shift, traveling between sites, or concluding the day.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#D99026] text-black font-bold text-xs rounded-lg hover:bg-[#b8781e] transition-all inline-flex items-center gap-1.5 mt-2"
          >
            <Plus size={14} /> Log First Odometer Entry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReadings.map((item) => (
            <div
              key={item.id}
              className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-4 space-y-3 shadow-lg hover:border-[#D99026]/50 transition-all relative overflow-hidden"
            >
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                  item.readingType === 'start_day' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                  item.readingType === 'end_day' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
                  'bg-amber-500/20 text-amber-400 border-amber-500/40'
                }`}>
                  {item.readingType === 'start_day' ? 'Start Day (Punch In)' :
                   item.readingType === 'end_day' ? 'End Day (Punch Out)' : 'Inter-Site Trip'}
                </span>

                <span className="text-[11px] font-mono font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1">
                  <Car size={11} className="text-[#D99026]" /> {item.vehicleNumber}
                </span>
              </div>

              {/* KM Reading Display */}
              <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E] flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase block">Odometer Reading</span>
                  <span className="text-xl font-bold text-emerald-400">{item.readingKm.toLocaleString()} KM</span>
                </div>
                <Gauge size={24} className="text-[#D99026]" />
              </div>

              {/* Photo Proof */}
              {item.photoUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-[#3A2E2E]">
                  <img src={item.photoUrl} alt="Odometer Proof" className="w-full h-32 object-cover" />
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Camera size={10} className="text-[#D99026]" /> Dashboard Photo
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-[#1A1515] rounded-lg border border-dashed border-[#3A2E2E] text-[11px] text-gray-500 font-mono text-center">
                  No Dashboard Photo Captured
                </div>
              )}

              {/* Metadata footer & Admin Review Controls */}
              <div className="text-[11px] font-mono text-gray-400 space-y-2 pt-1 border-t border-[#3A2E2E]">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">{item.userName}</span>
                  <span className="flex items-center gap-1 text-gray-400">
                    <Clock size={10} />
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {item.notes && (
                  <p className="text-gray-300 italic text-[10px]">"{item.notes}"</p>
                )}

                {/* Verification Status Badge & Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-[#3A2E2E]/60">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border ${
                    item.verificationStatus === 'flagged' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                    item.verificationStatus === 'verified' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                    'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {item.verificationStatus === 'flagged' ? (
                      <><AlertTriangle size={11} /> Flagged Discrepancy</>
                    ) : item.verificationStatus === 'verified' ? (
                      <><ShieldCheck size={11} /> Verified OK</>
                    ) : (
                      <><Clock size={11} /> Pending Review</>
                    )}
                  </span>

                  {currentUser.role === 'admin' && (
                    <div className="flex items-center gap-1">
                      {item.verificationStatus !== 'verified' && (
                        <button
                          onClick={() => {
                            updateOdometerStatus(item.id, 'verified', currentUser.name);
                            loadReadings();
                          }}
                          className="p-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded border border-emerald-500/40 transition-colors"
                          title="Approve Reading"
                        >
                          <Check size={13} />
                        </button>
                      )}

                      {item.verificationStatus !== 'flagged' && (
                        <button
                          onClick={() => {
                            updateOdometerStatus(item.id, 'flagged', currentUser.name);
                            loadReadings();
                          }}
                          className="p-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded border border-red-500/40 transition-colors"
                          title="Flag Discrepancy"
                        >
                          <AlertTriangle size={13} />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          deleteOdometerReading(item.id);
                          loadReadings();
                        }}
                        className="p-1 bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete Log Entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Odometer Entry Modal */}
      <OdometerEntryModal
        currentUser={currentUser}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadReadings();
        }}
      />
    </div>
  );
}
