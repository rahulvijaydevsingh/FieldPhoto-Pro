import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceDay, AttendanceSlot, User, AttendanceSettings, StaffAttendanceConfig, AttendanceMode, VerificationMethod } from '../types';
import { 
  getAttendanceHistory, 
  subscribeAttendanceToday, 
  getGlobalAttendanceSettings, 
  saveGlobalAttendanceSettings,
  getStaffAttendanceConfig,
  saveStaffAttendanceConfig,
  DEFAULT_ATTENDANCE_SETTINGS,
  playAttendanceAudioAlert
} from '../services/attendance';
import { Clock, MapPin, CheckCircle2, AlertTriangle, Calendar, Users, Filter, Smartphone, Settings, Shield, Volume2, Camera, Save, RefreshCw, UserCheck, Gauge } from 'lucide-react';
import OdometerTrackerView from './OdometerTrackerView';

interface AttendanceViewProps {
  currentUser: User;
  teamMembers?: User[];
}

export default function AttendanceView({ currentUser, teamMembers = [] }: AttendanceViewProps) {
  const [activeTab, setActiveTab] = useState<'logs' | 'odometer' | 'settings'>('logs');
  const [history, setHistory] = useState<AttendanceDay[]>([]);
  const [todayData, setTodayData] = useState<AttendanceDay | null>(null);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>(currentUser.role === 'admin' ? 'all' : currentUser.id);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Policy Settings State
  const [globalSettings, setGlobalSettings] = useState<AttendanceSettings>(DEFAULT_ATTENDANCE_SETTINGS);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [globalSaveSuccess, setGlobalSaveSuccess] = useState(false);

  // Per-Staff Settings State
  const [selectedStaffId, setSelectedStaffId] = useState<string>(teamMembers[0]?.id || currentUser.id);
  const [staffConfig, setStaffConfig] = useState<StaffAttendanceConfig>({
    userId: teamMembers[0]?.id || currentUser.id,
    useGlobalDefaults: true,
    customSettings: { ...DEFAULT_ATTENDANCE_SETTINGS }
  });
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffSaveSuccess, setStaffSaveSuccess] = useState(false);

  useEffect(() => {
    // Subscribe to today's data for active user
    const unsub = subscribeAttendanceToday(currentUser.id, setTodayData);
    
    // Fetch historical data
    loadHistory();

    // Fetch Global Settings
    getGlobalAttendanceSettings().then(setGlobalSettings);

    return () => {
      unsub();
    };
  }, [currentUser.id]);

  useEffect(() => {
    if (selectedStaffId) {
      getStaffAttendanceConfig(selectedStaffId).then((cfg) => {
        setStaffConfig({
          ...cfg,
          customSettings: cfg.customSettings || { ...globalSettings }
        });
      });
    }
  }, [selectedStaffId, globalSettings]);

  const loadHistory = async () => {
    setLoading(true);
    const data = await getAttendanceHistory(currentUser.role === 'admin' ? undefined : currentUser.id);
    setHistory(data);
    setLoading(false);
  };

  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGlobal(true);
    await saveGlobalAttendanceSettings(globalSettings);
    setSavingGlobal(false);
    setGlobalSaveSuccess(true);
    setTimeout(() => setGlobalSaveSuccess(false), 2500);
  };

  const handleSaveStaffConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStaff(true);
    await saveStaffAttendanceConfig(staffConfig);
    setSavingStaff(false);
    setStaffSaveSuccess(true);
    setTimeout(() => setStaffSaveSuccess(false), 2500);
  };

  // Merge today's realtime data into historical records if present
  const mergedRecords = useMemo(() => {
    const list = [...history];
    if (todayData) {
      const idx = list.findIndex(d => d.userId === todayData.userId && d.date === todayData.date);
      if (idx >= 0) {
        list[idx] = todayData;
      } else {
        list.unshift(todayData);
      }
    }

    return list.filter(d => {
      const userMatch = selectedUserFilter === 'all' || d.userId === selectedUserFilter;
      const dateMatch = !selectedDateFilter || d.date === selectedDateFilter;
      return userMatch && dateMatch;
    });
  }, [history, todayData, selectedUserFilter, selectedDateFilter]);

  // Compute total compliance metrics
  const totalSlotsCount = mergedRecords.reduce((acc, d) => acc + (d.slots?.length || 0), 0);
  const markedSlotsCount = mergedRecords.reduce((acc, d) => acc + (d.slots?.filter(s => s.status === 'marked').length || 0), 0);
  const missedSlotsCount = mergedRecords.reduce((acc, d) => acc + (d.slots?.filter(s => s.status === 'missed').length || 0), 0);
  const complianceRate = totalSlotsCount > 0 ? Math.round((markedSlotsCount / totalSlotsCount) * 100) : 100;

  return (
    <div className="space-y-6 text-white">
      {/* Top Section Nav Tabs */}
      <div className="flex items-center justify-between border-b border-[#3A2E2E] pb-3">
        <div className="flex items-center gap-2">
          <Clock className="text-[#D99026]" size={22} />
          <div>
            <h3 className="text-xl font-bold text-white">Staff Attendance & Shift Verification</h3>
            <p className="text-xs text-gray-400">Randomized & Scheduled GPS/Photo Checkpoints for Field Personnel</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#1A1515] p-1 rounded-xl border border-[#3A2E2E]">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'logs' ? 'bg-[#D99026] text-black shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock size={14} /> Audit Logs & Today Status
          </button>

          <button
            onClick={() => setActiveTab('odometer')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'odometer' ? 'bg-[#D99026] text-black shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Gauge size={14} /> Vehicle Odometer & Mileage
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'settings' ? 'bg-[#D99026] text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Settings size={14} /> Policy & Schedule Configurator
            </button>
          )}
        </div>
      </div>

      {activeTab === 'logs' ? (
        /* TAB 1: AUDIT LOGS */
        <div className="space-y-6">
          {/* Header & Metrics */}
          <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#3A2E2E] pb-4">
              <div className="text-xs text-gray-400 font-mono">
                Active Verification Method: <span className="text-[#D99026] font-bold uppercase">{globalSettings.verificationMethod}</span> | Mode: <span className="text-[#D99026] font-bold uppercase">{globalSettings.mode}</span> ({globalSettings.shiftStart} - {globalSettings.shiftEnd})
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {currentUser.role === 'admin' && (
                  <div className="flex items-center gap-2 bg-[#1A1515] border border-[#3A2E2E] rounded-lg px-3 py-1.5 text-xs">
                    <Users size={14} className="text-gray-400" />
                    <select
                      value={selectedUserFilter}
                      onChange={e => setSelectedUserFilter(e.target.value)}
                      className="bg-transparent text-white font-bold focus:outline-none"
                    >
                      <option value="all" className="bg-[#1A1515]">All Staff Members</option>
                      {teamMembers.map(m => (
                        <option key={m.id} value={m.id} className="bg-[#1A1515]">{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2 bg-[#1A1515] border border-[#3A2E2E] rounded-lg px-3 py-1.5 text-xs">
                  <Calendar size={14} className="text-gray-400" />
                  <input
                    type="date"
                    value={selectedDateFilter}
                    onChange={e => setSelectedDateFilter(e.target.value)}
                    className="bg-transparent text-white font-bold focus:outline-none font-mono"
                  />
                </div>

                {selectedDateFilter && (
                  <button
                    onClick={() => setSelectedDateFilter('')}
                    className="text-xs text-[#D99026] hover:underline font-bold"
                  >
                    Clear Date Filter
                  </button>
                )}
              </div>
            </div>

            {/* Quick Compliance Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E]">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Compliance Rate</span>
                <span className="text-2xl font-bold text-[#D99026]">{complianceRate}%</span>
              </div>

              <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E]">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Total Verified</span>
                <span className="text-2xl font-bold text-emerald-400">{markedSlotsCount}</span>
              </div>

              <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E]">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Missed Checkpoints</span>
                <span className="text-2xl font-bold text-red-400">{missedSlotsCount}</span>
              </div>

              <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E]">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Pending Checks</span>
                <span className="text-2xl font-bold text-amber-400">{totalSlotsCount - (markedSlotsCount + missedSlotsCount)}</span>
              </div>
            </div>
          </div>

          {/* Attendance Log Days Grid */}
          {mergedRecords.length === 0 ? (
            <div className="text-center py-12 bg-[#2D2424] rounded-xl border border-[#3A2E2E]">
              <Clock size={40} className="mx-auto text-gray-600 mb-3" />
              <p className="text-sm text-gray-300 font-bold">No attendance records found for this filter.</p>
              <p className="text-xs text-gray-500 mt-1">Random or scheduled checks occur automatically during active shift hours.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mergedRecords.map((day, dIdx) => (
                <div 
                  key={`${day.userId}_${day.date}_${dIdx}`}
                  className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-4 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-[#3A2E2E] pb-2">
                    <div>
                      <h4 className="font-bold text-sm text-white">{day.userName}</h4>
                      <span className="text-xs font-mono text-[#D99026]">{day.date}</span>
                    </div>

                    <div className="flex gap-1">
                      {day.slots?.map((s, sIdx) => (
                        <span 
                          key={sIdx}
                          className={`w-2.5 h-2.5 rounded-full ${
                            s.status === 'marked' ? 'bg-emerald-400' :
                            s.status === 'missed' ? 'bg-red-400' :
                            'bg-amber-400/50'
                          }`}
                          title={`Slot ${s.slot}: ${s.status}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Slots Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    {day.slots?.map((slot) => (
                      <div
                        key={slot.slot}
                        className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between space-y-2 ${
                          slot.status === 'marked' 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : slot.status === 'missed'
                            ? 'bg-red-500/10 border-red-500/30 text-red-300'
                            : 'bg-[#1A1515] border-[#3A2E2E] text-amber-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between font-mono text-[10px] uppercase font-bold text-gray-400 mb-1">
                            <span>SLOT #{slot.slot}</span>
                            {slot.status === 'marked' && <CheckCircle2 size={12} className="text-emerald-400" />}
                            {slot.status === 'missed' && <AlertTriangle size={12} className="text-red-400" />}
                            {slot.status === 'pending' && <Clock size={12} className="text-amber-400" />}
                          </div>

                          <div className="font-mono text-xs font-bold text-white mb-1">
                            {slot.markedAt 
                              ? new Date(slot.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : new Date(slot.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }
                          </div>

                          {slot.photoUrl && (
                            <img src={slot.photoUrl} alt="Selfie" className="w-full h-16 object-cover rounded my-1 border border-[#3A2E2E]" />
                          )}

                          {slot.plusCode && (
                            <div className="flex items-center gap-1 text-[10px] font-mono text-gray-300 truncate">
                              <MapPin size={10} className="text-[#D99026] flex-shrink-0" />
                              <span className="truncate">{slot.plusCode}</span>
                            </div>
                          )}

                          {slot.deviceInfo && (
                            <div className="flex items-center gap-1 text-[9px] text-gray-400 truncate mt-0.5">
                              <Smartphone size={9} className="flex-shrink-0" />
                              <span className="truncate">{slot.deviceInfo}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-[9px] uppercase font-bold text-right pt-1 border-t border-black/20">
                          {slot.status === 'marked' ? 'Verified' : slot.status === 'missed' ? 'Missed' : 'Pending'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'odometer' ? (
        /* TAB 2: ODOMETER & VEHICLE MILEAGE LOGS */
        <OdometerTrackerView currentUser={currentUser} teamMembers={teamMembers} />
      ) : (
        /* TAB 3: POLICY & SCHEDULE CONFIGURATOR */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Global Policy Card */}
          <form onSubmit={handleSaveGlobalSettings} className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#3A2E2E] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="text-[#D99026]" size={20} />
                <h4 className="font-bold text-base text-white">Global Attendance Policy</h4>
              </div>
              <button
                type="button"
                onClick={playAttendanceAudioAlert}
                className="text-xs text-[#D99026] hover:underline flex items-center gap-1"
              >
                <Volume2 size={13} /> Test Sound Alarm
              </button>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E]">
              <div>
                <span className="text-xs font-bold text-white block">Enable Attendance Verification</span>
                <span className="text-[11px] text-gray-400">Master switch for all field staff verification checks</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={globalSettings.enabled}
                  onChange={e => setGlobalSettings(s => ({ ...s, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D99026]"></div>
              </label>
            </div>

            {/* Mode Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 block">Attendance Schedule Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGlobalSettings(s => ({ ...s, mode: 'random' }))}
                  className={`p-3 rounded-lg border text-left text-xs font-bold transition-all ${
                    globalSettings.mode === 'random'
                      ? 'bg-[#D99026]/20 border-[#D99026] text-white'
                      : 'bg-[#1A1515] border-[#3A2E2E] text-gray-400'
                  }`}
                >
                  <span className="block text-white">Random 3×/day</span>
                  <span className="text-[10px] font-normal text-gray-400">Randomized checks within shift window</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGlobalSettings(s => ({ ...s, mode: 'fixed' }))}
                  className={`p-3 rounded-lg border text-left text-xs font-bold transition-all ${
                    globalSettings.mode === 'fixed'
                      ? 'bg-[#D99026]/20 border-[#D99026] text-white'
                      : 'bg-[#1A1515] border-[#3A2E2E] text-gray-400'
                  }`}
                >
                  <span className="block text-white">Fixed Scheduled Checkpoints</span>
                  <span className="text-[10px] font-normal text-gray-400">Specific set times every day</span>
                </button>
              </div>
            </div>

            {/* Shift Working Hours */}
            <div className="grid grid-cols-2 gap-3 bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E]">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Shift Start Time</label>
                <input
                  type="time"
                  value={globalSettings.shiftStart}
                  onChange={e => setGlobalSettings(s => ({ ...s, shiftStart: e.target.value }))}
                  className="w-full bg-[#2D2424] border border-[#3A2E2E] rounded px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Shift End Time</label>
                <input
                  type="time"
                  value={globalSettings.shiftEnd}
                  onChange={e => setGlobalSettings(s => ({ ...s, shiftEnd: e.target.value }))}
                  className="w-full bg-[#2D2424] border border-[#3A2E2E] rounded px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                />
              </div>
            </div>

            {/* Fixed Check Times if mode == fixed */}
            {globalSettings.mode === 'fixed' && (
              <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E] space-y-2">
                <label className="text-xs font-bold text-gray-300 block">Fixed Scheduled Check Times</label>
                <div className="grid grid-cols-3 gap-2">
                  {globalSettings.fixedCheckTimes.map((time, idx) => (
                    <input
                      key={idx}
                      type="time"
                      value={time}
                      onChange={e => {
                        const newTimes = [...globalSettings.fixedCheckTimes];
                        newTimes[idx] = e.target.value;
                        setGlobalSettings(s => ({ ...s, fixedCheckTimes: newTimes }));
                      }}
                      className="bg-[#2D2424] border border-[#3A2E2E] rounded px-2 py-1 text-xs text-white font-mono font-bold text-center"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Verification Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 block">Verification Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'gps', label: 'GPS Only', icon: MapPin },
                  { id: 'photo', label: 'Selfie Photo', icon: Camera },
                  { id: 'both', label: 'GPS + Photo', icon: Shield }
                ].map(item => {
                  const Icon = item.icon;
                  const active = globalSettings.verificationMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGlobalSettings(s => ({ ...s, verificationMethod: item.id as VerificationMethod }))}
                      className={`p-2.5 rounded-lg border text-center text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                        active ? 'bg-[#D99026] text-black border-[#D99026]' : 'bg-[#1A1515] text-gray-400 border-[#3A2E2E]'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio Alert Chime */}
            <div className="flex items-center justify-between bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E]">
              <div>
                <span className="text-xs font-bold text-white block">Audible Sound Alert</span>
                <span className="text-[11px] text-gray-400">Play web audio chime on staff member phone when check triggers</span>
              </div>
              <input
                type="checkbox"
                checked={globalSettings.soundAlertEnabled}
                onChange={e => setGlobalSettings(s => ({ ...s, soundAlertEnabled: e.target.checked }))}
                className="w-4 h-4 accent-[#D99026] rounded cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={savingGlobal}
              className="w-full py-2.5 bg-[#D99026] hover:bg-[#b8781e] text-black font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2"
            >
              {savingGlobal ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              {globalSaveSuccess ? 'Global Policy Updated Successfully!' : 'Save Global Attendance Policy'}
            </button>
          </form>

          {/* Per-Staff Override Card */}
          <form onSubmit={handleSaveStaffConfig} className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 shadow-xl space-y-5">
            <div className="border-b border-[#3A2E2E] pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="text-[#D99026]" size={20} />
                <h4 className="font-bold text-base text-white">Staff Member Custom Schedule Overrides</h4>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Customize individual shift times or mode for specific field workers</p>
            </div>

            {/* Staff Selector */}
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">Select Field Staff Member</label>
              <select
                value={selectedStaffId}
                onChange={e => setSelectedStaffId(e.target.value)}
                className="w-full bg-[#1A1515] border border-[#3A2E2E] rounded-lg p-2.5 text-xs text-white font-bold"
              >
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                ))}
              </select>
            </div>

            {/* Use Global Default Checkbox */}
            <div className="bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Use Global Policy</span>
                <span className="text-[11px] text-gray-400">Inherit shift times and verification settings from global defaults</span>
              </div>
              <input
                type="checkbox"
                checked={staffConfig.useGlobalDefaults}
                onChange={e => setStaffConfig(s => ({ ...s, useGlobalDefaults: e.target.checked }))}
                className="w-4 h-4 accent-[#D99026] rounded cursor-pointer"
              />
            </div>

            {/* Custom Settings if Use Global Default is False */}
            {!staffConfig.useGlobalDefaults && (
              <div className="space-y-4 pt-2 border-t border-[#3A2E2E]">
                <div className="grid grid-cols-2 gap-3 bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E]">
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Custom Shift Start</label>
                    <input
                      type="time"
                      value={staffConfig.customSettings?.shiftStart || '10:00'}
                      onChange={e => setStaffConfig(s => ({
                        ...s,
                        customSettings: { ...s.customSettings, shiftStart: e.target.value }
                      }))}
                      className="w-full bg-[#2D2424] border border-[#3A2E2E] rounded px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Custom Shift End</label>
                    <input
                      type="time"
                      value={staffConfig.customSettings?.shiftEnd || '19:00'}
                      onChange={e => setStaffConfig(s => ({
                        ...s,
                        customSettings: { ...s.customSettings, shiftEnd: e.target.value }
                      }))}
                      className="w-full bg-[#2D2424] border border-[#3A2E2E] rounded px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Custom Verification Type</label>
                  <select
                    value={staffConfig.customSettings?.verificationMethod || 'gps'}
                    onChange={e => setStaffConfig(s => ({
                      ...s,
                      customSettings: { ...s.customSettings, verificationMethod: e.target.value as VerificationMethod }
                    }))}
                    className="w-full bg-[#1A1515] border border-[#3A2E2E] rounded-lg p-2.5 text-xs text-white font-bold"
                  >
                    <option value="gps">GPS Location Only</option>
                    <option value="photo">Selfie / Site Photo Only</option>
                    <option value="both">Both GPS + Photo Verification</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={savingStaff}
              className="w-full py-2.5 bg-[#D99026] hover:bg-[#b8781e] text-black font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2"
            >
              {savingStaff ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              {staffSaveSuccess ? 'Staff Custom Schedule Saved!' : 'Save Staff Member Custom Schedule'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
